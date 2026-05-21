#!/usr/bin/env python3
"""
L1 apply: parse describe-fill ledgers + emit UPDATE statements for entities table.

Usage:
  python3 /tmp/l1-apply.py                                  # dry-run (SQL to stdout)
  python3 /tmp/l1-apply.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle    # apply (psql -1 = single transaction)

Reads all `b4-ledger-*.md` files from the arc directory; extracts per-row
NEW description / reasoning / source_ref / anchor / verdict / origin;
emits one UPDATE per row. Skips HALT rows. Idempotent (running twice
produces the same final state).

Does NOT touch description_provenance -- the original per-clause provenance
was synthesised under the OLD description and is stale; the ledger MD is the
new authoritative evidence trail. Future tooling can rebuild provenance from
the ledger if needed.
"""

import re
import sys
from pathlib import Path

LEDGER_DIR = Path(
    "/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill"
)
LEDGERS = sorted(LEDGER_DIR.glob("b4-ledger-*.md"))


def parse_blockquote(lines, idx):
    """Consume consecutive '> ' lines starting at idx; return (content, next_idx)."""
    out = []
    while idx < len(lines):
        line = lines[idx]
        stripped = line.lstrip()
        if stripped.startswith("> "):
            out.append(stripped[2:])
            idx += 1
        elif stripped == ">":
            out.append("")
            idx += 1
        else:
            break
    return "\n".join(out).strip(), idx


def parse_ledger(path):
    """Parse a ledger MD; return list of per-row dicts."""
    text = path.read_text()
    lines = text.splitlines()
    n = len(lines)
    i = 0
    rows = []
    current = None

    while i < n:
        line = lines[i]

        # Section header
        m = re.match(r"^### (ktx:[^\s]+?)(\s*\(HALT\))?\s*$", line)
        if m:
            if current is not None:
                rows.append(current)
            current = {
                "canonical_id": m.group(1).strip(),
                "ledger": path.name,
                "halt": bool(m.group(2)),
            }
            i += 1
            continue

        # Section separator '---' ends current section
        if line.strip() == "---":
            if current is not None:
                rows.append(current)
                current = None
            i += 1
            continue

        if current is None:
            i += 1
            continue

        # Single-line fields
        if m := re.match(r"^- NEW source_ref:\s*(.+?)\s*$", line):
            current["source_ref"] = m.group(1).strip(" `")
            i += 1
            continue
        if m := re.match(r"^- NEW anchor:\s*(.+?)\s*$", line):
            current["anchor"] = m.group(1).strip(" `")
            i += 1
            continue
        # NEW verdict -- handles both "synthesized" and "synthesized (confidence: high)"
        # variants (the fav_go calibration ledger uses the parenthetical form;
        # later ledgers under the lean v2 template emit just the bare verdict).
        if m := re.match(r"^- NEW verdict:\s*([^\s(]+)\s*(?:\(([^)]*)\))?\s*$", line):
            current["verdict"] = m.group(1).strip(" `")
            paren = m.group(2)
            if paren:
                # Parse "confidence: high" out of the parenthetical
                cm = re.match(r"\s*confidence\s*:\s*(\S+)\s*$", paren)
                if cm:
                    current["confidence"] = cm.group(1).strip()
            i += 1
            continue
        if m := re.match(r"^- NEW description_origin:\s*(.+?)\s*$", line):
            current["origin"] = m.group(1).strip(" `")
            i += 1
            continue

        # Multi-line blockquote fields
        # NEW description / NEW description (attempt-N) / NEW description (compact)
        if re.match(r"^- NEW description(\s*\([^)]*\))?:\s*$", line):
            i += 1
            content, i = parse_blockquote(lines, i)
            current["description"] = content
            continue
        if re.match(r"^- NEW description_reasoning[^:]*:\s*$", line):
            i += 1
            content, i = parse_blockquote(lines, i)
            current["reasoning"] = content
            continue

        i += 1

    if current is not None:
        rows.append(current)

    return rows


def sql_quote(s):
    """Postgres dollar-quoted string ($q$...$q$) -- handles single quotes and newlines safely."""
    # Use a distinctive tag so we never collide with content
    tag = "l1apply"
    while f"${tag}$" in s:
        tag += "x"
    return f"${tag}${s}${tag}$"


def emit_update(row):
    if row.get("halt"):
        return f"-- HALT row, skipping: {row['canonical_id']}"

    if "description" not in row:
        return f"-- ERROR: no NEW description parsed for {row['canonical_id']} (in {row['ledger']})"

    fields = [f"description = {sql_quote(row['description'])}"]

    if "reasoning" in row:
        fields.append(f"description_reasoning = {sql_quote(row['reasoning'])}")
    else:
        fields.append("description_reasoning = NULL")

    if "anchor" in row:
        fields.append(f"description_anchor_version = {sql_quote(row['anchor'])}")
    if "verdict" in row:
        fields.append(f"description_verdict = {sql_quote(row['verdict'])}")
    if "origin" in row:
        fields.append(f"description_origin = {sql_quote(row['origin'])}")
    if "confidence" in row:
        fields.append(f"description_confidence = {sql_quote(row['confidence'])}")

    fields.append("description_proposed = NULL")
    fields.append("description_embedding_stale = true")
    fields.append("updated_at = now()")

    set_clause = ",\n  ".join(fields)
    return (
        f"UPDATE entities SET\n  {set_clause}\n"
        f"WHERE canonical_id = {sql_quote(row['canonical_id'])};"
    )


def main():
    all_rows = []
    counts = {}
    for ledger in LEDGERS:
        rows = parse_ledger(ledger)
        counts[ledger.name] = len(rows)
        all_rows.extend(rows)

    # Summary to stderr
    print("-- L1 apply summary:", file=sys.stderr)
    for name, n in counts.items():
        print(f"--   {name}: {n}", file=sys.stderr)
    print(f"-- TOTAL: {len(all_rows)} rows", file=sys.stderr)

    # Sanity checks
    missing = [r for r in all_rows if "description" not in r and not r.get("halt")]
    if missing:
        print(f"-- WARNING: {len(missing)} rows missing NEW description:", file=sys.stderr)
        for r in missing:
            print(f"--   {r['canonical_id']} (in {r['ledger']})", file=sys.stderr)

    halts = [r for r in all_rows if r.get("halt")]
    if halts:
        print(f"-- {len(halts)} HALT rows (skipped):", file=sys.stderr)
        for r in halts:
            print(f"--   {r['canonical_id']} (in {r['ledger']})", file=sys.stderr)

    # SQL to stdout
    print(f"-- L1 apply: {len(all_rows)} ledger rows -> entities UPDATEs")
    print("-- Run with: python3 /tmp/l1-apply.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle")
    print()
    for row in all_rows:
        print(emit_update(row))
        print()
    print("-- Post-apply verification queries (manual):")
    print("--   SELECT count(*) FROM entities WHERE description_anchor_version = '1.47-2-g67253dc';  -- expect 96")
    print("--   SELECT count(*) FROM entities WHERE description_anchor_version = '1.47-2-g67253dc' AND description_proposed IS NOT NULL;  -- expect 0")
    print("--   SELECT count(*) FROM entities WHERE description_anchor_version = '1.47-2-g67253dc' AND description_embedding_stale = true;  -- expect 96")


if __name__ == "__main__":
    main()
