#!/usr/bin/env python3
"""
L1 categorize apply: parse b6-categorize ledgers + emit UPDATE statements
for cvar_versions / command_versions tables.

KTX-categorize mini-arc (2026-05-22). Sister to apply-l1-format-unify.py.
Differences from that script:

  * Glob targets `b6-categorize-*.md` instead of `b5-format-unify-*.md`.
  * b6 ledgers carry ONLY `NEW category_inferred:` and
    `NEW category_inferred_origin:` (taxonomic-only pass; descriptions are
    already locked from b5). All other NEW-* parsers from the parent are
    kept alongside as dead code (per plan Step 4.3 "add alongside, not
    replacing") -- they parse but emit_update ignores them. Future
    categorize-shape passes could reuse this script and pick up those
    fields without re-editing.
  * emit_update routes to `cvar_versions` (canonical_id starts with
    `ktx:cvar:`) or `command_versions` (otherwise) -- the categorize
    columns live on the per-version tables, not on `entities`.
  * No `updated_at` bump -- the *_versions tables only carry
    `extracted_at` (the original extraction timestamp); there is no
    metadata-mutation timestamp column on per-version rows. The F1
    provenance-integrity probe + the coverage-guard at Step 15.4 are the
    audit trail for "category populated".

Usage:
  python3 apply-l1-category.py                                           # dry-run (SQL to stdout)
  python3 apply-l1-category.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle    # apply (psql -1 = single transaction)
"""

import re
import sys
from pathlib import Path

LEDGER_DIR = Path(
    "/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-22-ktx-l1-categorize"
)
# Filter excludes the prompt file (which has no ledger rows) but keeps the
# calibration ledger, all fan-out batch ledgers, and any future overrides ledger.
LEDGERS = sorted(
    p for p in LEDGER_DIR.glob("b6-categorize-*.md")
    if not p.name.endswith("prompt.md")
)


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

        if line.strip() == "---":
            if current is not None:
                rows.append(current)
                current = None
            i += 1
            continue

        if current is None:
            i += 1
            continue

        # Categorize-specific single-line fields (b6).
        if m := re.match(r"^- NEW category_inferred:\s*(.+?)\s*$", line):
            current["category_inferred"] = m.group(1).strip(" `")
            i += 1
            continue
        if m := re.match(r"^- NEW category_inferred_origin:\s*(.+?)\s*$", line):
            current["category_inferred_origin"] = m.group(1).strip(" `")
            i += 1
            continue

        # Format-unify / parent single-line fields. Parsed alongside (per plan
        # Step 4.3) so this script can be reused for future categorize-shape
        # passes that also write description metadata; emit_update ignores
        # them today.
        if m := re.match(r"^- NEW source_ref:\s*(.+?)\s*$", line):
            current["source_ref"] = m.group(1).strip(" `")
            i += 1
            continue
        if m := re.match(r"^- NEW anchor:\s*(.+?)\s*$", line):
            current["anchor"] = m.group(1).strip(" `")
            i += 1
            continue
        if m := re.match(r"^- NEW verdict:\s*([^\s(]+)\s*(?:\(([^)]*)\))?\s*$", line):
            current["verdict"] = m.group(1).strip(" `")
            paren = m.group(2)
            if paren:
                cm = re.match(r"\s*confidence\s*:\s*(\S+)\s*$", paren)
                if cm:
                    current["confidence"] = cm.group(1).strip()
            i += 1
            continue
        if m := re.match(r"^- NEW description_origin:\s*(.+?)\s*$", line):
            current["origin"] = m.group(1).strip(" `")
            i += 1
            continue

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
    tag = "l1apply"
    while f"${tag}$" in s:
        tag += "x"
    return f"${tag}${s}${tag}$"


def emit_update(row):
    if row.get("halt"):
        return f"-- HALT row, skipping: {row['canonical_id']}"

    if "category_inferred" not in row:
        return f"-- ERROR: no NEW category_inferred parsed for {row['canonical_id']} (in {row['ledger']})"

    if "category_inferred_origin" not in row:
        return f"-- ERROR: no NEW category_inferred_origin parsed for {row['canonical_id']} (in {row['ledger']})"

    fields = [
        f"category_inferred = {sql_quote(row['category_inferred'])}",
        f"category_inferred_origin = {sql_quote(row['category_inferred_origin'])}",
    ]
    set_clause = ",\n  ".join(fields)

    # Categorize columns live on cvar_versions / command_versions, not entities.
    # Look up the type via canonical_id prefix to pick the right table.
    table = "cvar_versions" if row["canonical_id"].startswith("ktx:cvar:") else "command_versions"

    return (
        f"UPDATE {table} SET\n  {set_clause}\n"
        f"WHERE entity_id = (SELECT id FROM entities WHERE canonical_id = {sql_quote(row['canonical_id'])});"
    )


def main():
    all_rows = []
    counts = {}
    for ledger in LEDGERS:
        rows = parse_ledger(ledger)
        counts[ledger.name] = len(rows)
        all_rows.extend(rows)

    print("-- L1 categorize apply summary:", file=sys.stderr)
    for name, n in counts.items():
        print(f"--   {name}: {n}", file=sys.stderr)
    print(f"-- TOTAL: {len(all_rows)} rows", file=sys.stderr)

    missing = [
        r for r in all_rows
        if ("category_inferred" not in r or "category_inferred_origin" not in r)
        and not r.get("halt")
    ]
    if missing:
        print(f"-- WARNING: {len(missing)} rows missing NEW category fields:", file=sys.stderr)
        for r in missing:
            print(f"--   {r['canonical_id']} (in {r['ledger']})", file=sys.stderr)

    halts = [r for r in all_rows if r.get("halt")]
    if halts:
        print(f"-- {len(halts)} HALT rows (skipped):", file=sys.stderr)
        for r in halts:
            print(f"--   {r['canonical_id']} (in {r['ledger']})", file=sys.stderr)

    print(f"-- L1 categorize apply: {len(all_rows)} ledger rows -> cvar_versions / command_versions UPDATEs")
    print("-- Run with: python3 apply-l1-category.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle")
    print()
    for row in all_rows:
        print(emit_update(row))
        print()

    print("-- Post-apply verification queries (manual):")
    print("--   SELECT count(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx' AND cv.category_inferred IS NULL;  -- expect 0")
    print("--   SELECT count(*) FROM command_versions cm JOIN entities e ON cm.entity_id=e.id WHERE e.project='ktx' AND cm.category_inferred IS NULL;  -- expect 0")
    print("--   SELECT category_inferred, count(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx' GROUP BY category_inferred ORDER BY 2 DESC;")


if __name__ == "__main__":
    main()
