#!/usr/bin/env python3
"""
parse-gfx-sql.py
One-off script: parse gfx.sql MySQL dump → bundles.json
Extracts gfx_category (hierarchy) and gfx_item rows.
"""

import json
import re
import sys
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

# The corpus lives outside git (sandbox); outputs stay there too so the repo holds only code.
SANDBOX = Path.home() / "projects/sandboxes/qw3-abab-gfx"
SQL_PATH = SANDBOX / "gfx.sql"
OUT_PATH = SANDBOX / "scripts/output/bundles.json"


# ---------------------------------------------------------------------------
# SQL tokenizer: split a single VALUES row like (v1, v2, 'v3', NULL, ...) into
# a list of Python values, respecting quoted strings with MySQL escapes.
# ---------------------------------------------------------------------------

def tokenize_row(row_text: str) -> list:
    """Parse one parenthesised SQL row into a Python list of raw string tokens.

    Handles:
    - Bare integers
    - NULL (kept as the string 'NULL' for the caller to interpret)
    - Single-quoted strings with MySQL escape sequences (\\', \\\\, \\n, \\r)
    """
    # Strip surrounding parens
    inner = row_text.strip()
    if inner.startswith("("):
        inner = inner[1:]
    if inner.endswith(")"):
        inner = inner[:-1]

    tokens = []
    i = 0
    n = len(inner)

    while i < n:
        # Skip whitespace/commas between tokens
        while i < n and inner[i] in (" ", "\t", "\n", "\r", ","):
            i += 1
        if i >= n:
            break

        if inner[i] == "'":
            # Quoted string — scan for closing unescaped quote
            i += 1  # skip opening quote
            buf = []
            while i < n:
                c = inner[i]
                if c == "\\" and i + 1 < n:
                    nc = inner[i + 1]
                    if nc == "'":
                        buf.append("'")
                    elif nc == "\\":
                        buf.append("\\")
                    elif nc == "n":
                        buf.append("\n")
                    elif nc == "r":
                        buf.append("\r")
                    elif nc == "t":
                        buf.append("\t")
                    else:
                        buf.append(nc)
                    i += 2
                elif c == "'":
                    i += 1  # skip closing quote
                    break
                else:
                    buf.append(c)
                    i += 1
            tokens.append("".join(buf))
        else:
            # Bare token (integer, NULL, etc.)
            end = i
            while end < n and inner[end] not in (",", " ", "\t", "\n", "\r"):
                end += 1
            tokens.append(inner[i:end])
            i = end

    return tokens


def unescape_html(s: str) -> str:
    """Unescape MySQL-dumped HTML entities."""
    return unescape(s)


# ---------------------------------------------------------------------------
# Extract the VALUES block for a given table name from the full SQL text.
# Returns the raw text between "INSERT INTO `table` VALUES\n" and the next
# ";/*!40000" or ";\n/*!40000" line.
# ---------------------------------------------------------------------------

def extract_values_block(sql: str, table_name: str) -> str:
    """Return everything between the INSERT line and the terminating semicolon."""
    marker = f"INSERT INTO `{table_name}` VALUES\n"
    start = sql.find(marker)
    if start == -1:
        raise ValueError(f"Table {table_name!r} INSERT not found in dump")
    start += len(marker)
    # The block ends at the ; that immediately precedes the ENABLE KEYS comment
    # It looks like: );\n/*!40000  or  );\n/*!40000
    end = sql.find(";\n", start)
    if end == -1:
        raise ValueError(f"Could not find end of VALUES block for {table_name!r}")
    return sql[start:end + 1]  # include the closing )


# ---------------------------------------------------------------------------
# Row splitter: the VALUES block is one row per line (IID first, each row ends
# with ), or ),). We need to handle multi-line strings inside rows.
# Strategy: scan character-by-character tracking quote state; split on top-level
# commas that follow a closing paren.
# ---------------------------------------------------------------------------

def split_rows(block: str) -> list[str]:
    """Split a VALUES block into individual row strings like '(1,2,...)'.

    Handles embedded newlines inside quoted strings.
    """
    rows = []
    depth = 0
    in_string = False
    buf = []
    i = 0
    n = len(block)

    while i < n:
        c = block[i]

        if in_string:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                # Consume escape sequence as a unit
                buf.append(block[i + 1])
                i += 2
                continue
            elif c == "'":
                in_string = False
        else:
            if c == "'":
                in_string = True
                buf.append(c)
            elif c == "(":
                depth += 1
                buf.append(c)
            elif c == ")":
                depth -= 1
                buf.append(c)
                if depth == 0:
                    # Finished a row — peek at next non-whitespace
                    row_text = "".join(buf).strip()
                    if row_text:
                        rows.append(row_text)
                    buf = []
                    # Skip trailing comma / whitespace
                    i += 1
                    while i < n and block[i] in (",", "\n", "\r", " ", "\t"):
                        i += 1
                    continue
            else:
                if depth > 0:
                    buf.append(c)
                # Outside parens: skip commas, newlines between rows

        i += 1

    return rows


# ---------------------------------------------------------------------------
# Build category lookup
# Fields: CID, parent, cat_title, cat_descr, forum_id
# ---------------------------------------------------------------------------

def parse_categories(sql: str) -> dict[int, dict]:
    block = extract_values_block(sql, "gfx_category")
    rows = split_rows(block)
    cats = {}
    for row in rows:
        try:
            tokens = tokenize_row(row)
            if len(tokens) < 5:
                print(f"  WARN: short category row ({len(tokens)} tokens): {row[:80]}", file=sys.stderr)
                continue
            cid = int(tokens[0])
            parent = int(tokens[1])  # 0 = top-level
            cat_title = unescape_html(tokens[2])
            cat_descr = unescape_html(tokens[3]) if tokens[3] != "NULL" else ""
            forum_id = int(tokens[4]) if tokens[4] != "NULL" else 0
            cats[cid] = {
                "cid": cid,
                "parent": parent,
                "cat_title": cat_title,
                "cat_descr": cat_descr,
                "forum_id": forum_id,
            }
        except Exception as e:
            print(f"  WARN: failed to parse category row: {row[:120]} — {e}", file=sys.stderr)
    return cats


def build_category_path(cats: dict[int, dict], cid: int) -> str:
    """Walk parent chain and build 'Root / Child / Leaf' path."""
    path_parts = []
    visited = set()
    current = cid
    while current and current != 0:
        if current in visited:
            print(f"  WARN: cycle detected in category {cid}", file=sys.stderr)
            break
        visited.add(current)
        cat = cats.get(current)
        if cat is None:
            print(f"  WARN: missing category CID={current} referenced from CID={cid}", file=sys.stderr)
            break
        path_parts.append(cat["cat_title"])
        current = cat["parent"]
    path_parts.reverse()
    return " / ".join(path_parts)


def get_top_level(cats: dict[int, dict], cid: int) -> tuple[str, int]:
    """Return (top_level_title, top_level_cid) by walking to root."""
    visited = set()
    current = cid
    prev = cid
    while current and current != 0:
        if current in visited:
            break
        visited.add(current)
        cat = cats.get(current)
        if cat is None:
            break
        prev = current
        current = cat["parent"]
    root_cat = cats.get(prev)
    if root_cat:
        return root_cat["cat_title"], root_cat["cid"]
    return "", prev


# ---------------------------------------------------------------------------
# Parse gfx_item
# Fields: IID, category, date_added, date_updated, author, author_org, title,
#         description, screenshot, filesize, downloads
# ---------------------------------------------------------------------------

def ts_to_iso(val: str) -> str | None:
    """Convert unix-seconds string to ISO 8601 UTC string, or None if NULL/0."""
    if val == "NULL" or val == "0":
        return None
    ts = int(val)
    if ts == 0:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_items(sql: str, cats: dict[int, dict]) -> list[dict]:
    block = extract_values_block(sql, "gfx_item")
    rows = split_rows(block)
    items = []
    for row in rows:
        try:
            tokens = tokenize_row(row)
            if len(tokens) < 11:
                print(f"  WARN: short item row ({len(tokens)} tokens): {row[:80]}", file=sys.stderr)
                continue

            iid = int(tokens[0])
            category_cid = int(tokens[1])
            date_added_iso = ts_to_iso(tokens[2])
            date_updated_iso = ts_to_iso(tokens[3])
            author_id = None if tokens[4] == "NULL" else int(tokens[4])
            author_org = unescape_html(tokens[5])
            title = unescape_html(tokens[6])
            description = unescape_html(tokens[7])
            has_screenshot = tokens[8] == "1"
            filesize = int(tokens[9]) if tokens[9] != "NULL" else 0
            downloads = int(tokens[10]) if tokens[10] != "NULL" else 0

            # Category resolution
            cat = cats.get(category_cid)
            if cat is None:
                print(f"  WARN: IID={iid} references unknown category CID={category_cid}", file=sys.stderr)
                category_title = ""
                category_path = f"(unknown CID {category_cid})"
                category_top_level = ""
                parent_cid = 0
            else:
                category_title = cat["cat_title"]
                category_path = build_category_path(cats, category_cid)
                category_top_level, _ = get_top_level(cats, category_cid)
                parent_cid = cat["parent"]

            items.append({
                "iid": iid,
                "category_cid": category_cid,
                "category_title": category_title,
                "category_path": category_path,
                "category_top_level": category_top_level,
                "parent_cid": parent_cid,
                "date_added_iso": date_added_iso,
                "date_updated_iso": date_updated_iso,
                "author_id": author_id,
                "author_org": author_org,
                "title": title,
                "description": description,
                "has_screenshot": has_screenshot,
                "filesize": filesize,
                "downloads": downloads,
            })

        except Exception as e:
            print(f"  WARN: failed to parse item row: {row[:120]} — {e}", file=sys.stderr)

    return items


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Reading {SQL_PATH} ...")
    sql = SQL_PATH.read_text(encoding="latin-1")

    print("Parsing categories ...")
    cats = parse_categories(sql)
    print(f"  {len(cats)} categories loaded")

    print("Parsing items ...")
    items = parse_items(sql, cats)
    print(f"  {len(items)} items parsed")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Written: {OUT_PATH}")

    # Quick summary
    from collections import Counter
    top_levels = Counter(r["category_top_level"] for r in items)
    subcats = len({r["category_path"] for r in items})
    top5 = Counter(r["category_path"] for r in items).most_common(5)

    dates = [r["date_added_iso"] for r in items if r["date_added_iso"]]
    print(f"\n--- Summary ---")
    print(f"Total bundles: {len(items)}")
    print(f"Distinct top-level categories ({len(top_levels)}): {sorted(top_levels.keys())}")
    print(f"Distinct category paths: {subcats}")
    print(f"Top 5 by count:")
    for path, cnt in top5:
        print(f"  {cnt:4d}  {path}")
    if dates:
        print(f"Date range: {min(dates)} — {max(dates)}")
    print(f"\nSample record [0]:")
    print(json.dumps(items[0], indent=2, ensure_ascii=False))
    print(f"\nSample record [5]:")
    print(json.dumps(items[5], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
