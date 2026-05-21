#!/usr/bin/env python3
"""
L1 format-unify apply: parse b5-format-unify ledgers + emit UPDATE statements
for entities table.

Format-unify follow-up arc (2026-05-21, D21). Sister to apply-l1-from-ledgers.py.
Difference from that script:

  * Glob targets `b5-format-unify-*.md` instead of `b4-ledger-*.md`.
  * b5 ledgers ONLY carry NEW description blocks -- NEW description_reasoning,
    NEW source_ref, NEW anchor, NEW verdict, and NEW description_origin are
    deliberately omitted because the format-unify rewrites only the user-facing
    description column. The audit-trail columns from Session #9 are
    authoritative and must be preserved.
  * This script defensively writes ONLY the columns whose NEW blocks appear in
    the ledger. If `NEW description_reasoning` is not present, the existing
    reasoning is left intact (the parent script would have set it to NULL).
  * description_proposed, description_embedding_stale, and updated_at are
    always touched (the description text changed, so the embedding is stale
    and updated_at moves forward).

Usage:
  python3 apply-l1-format-unify.py                                           # dry-run (SQL to stdout)
  python3 apply-l1-format-unify.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle    # apply (psql -1 = single transaction)
"""

import re
import sys
from pathlib import Path

LEDGER_DIR = Path(
    "/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill"
)
# Filter excludes the prompt file (which has no ledger rows) but keeps the
# calibration ledger, all fan-out batch ledgers, and any future overrides ledger.
LEDGERS = sorted(
    p for p in LEDGER_DIR.glob("b5-format-unify-*.md")
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

    if "description" not in row:
        return f"-- ERROR: no NEW description parsed for {row['canonical_id']} (in {row['ledger']})"

    fields = [f"description = {sql_quote(row['description'])}"]

    # FORMAT-UNIFY DIFF: only write description_reasoning when explicitly provided
    # in the ledger. b5 ledgers omit it deliberately to preserve the Session #9
    # audit trail. The parent apply-l1-from-ledgers.py NULLs reasoning when absent;
    # we do not.
    if "reasoning" in row:
        fields.append(f"description_reasoning = {sql_quote(row['reasoning'])}")

    # FORMAT-UNIFY DIFF: skip anchor/verdict/origin overwrites unless explicitly
    # in the ledger. b5 ledgers omit these too (format-unify does not re-stamp
    # provenance metadata; the rewrite is a presentation-layer change).
    if "anchor" in row:
        fields.append(f"description_anchor_version = {sql_quote(row['anchor'])}")
    if "verdict" in row:
        fields.append(f"description_verdict = {sql_quote(row['verdict'])}")
    if "origin" in row:
        fields.append(f"description_origin = {sql_quote(row['origin'])}")
    if "confidence" in row:
        fields.append(f"description_confidence = {sql_quote(row['confidence'])}")

    # Always: description_proposed cleared, embedding stale, updated_at bumped.
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

    print("-- L1 format-unify apply summary:", file=sys.stderr)
    for name, n in counts.items():
        print(f"--   {name}: {n}", file=sys.stderr)
    print(f"-- TOTAL: {len(all_rows)} rows", file=sys.stderr)

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

    print(f"-- L1 format-unify apply: {len(all_rows)} ledger rows -> entities UPDATEs")
    print("-- Run with: python3 apply-l1-format-unify.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle")
    print()
    for row in all_rows:
        print(emit_update(row))
        print()

    print("-- Post-apply verification queries (manual):")
    print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND length(description) >= 501;  -- expect <30 (long bucket collapses)")
    print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND length(description) BETWEEN 251 AND 500;  -- expect majority")
    print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND length(description) <= 250;")
    print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND description_embedding_stale = true;  -- expect ~602 (in-scope rewrites)")
    print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND description_reasoning IS NULL;  -- expect 16 (11 anchors + 5 lean-v2 calibration rows, unchanged from pre-apply)")


if __name__ == "__main__":
    main()
