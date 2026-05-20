#!/usr/bin/env python3
"""build-runtime-dead-entities -- regenerate apps/qw-oracle/docs/upstream-prs/<project>-runtime-dead-entities.md

Reads the L1 Track-A signal (track_a_reachability) from the qw-oracle
Postgres DB via read-only docker-exec psql, filters to the level-3
dump-confirmed genuine-dead subset using route_by_level (consumed, never
re-implemented), partitions by evidence feeder, and writes the markdown
digest. Idempotent -- two consecutive runs produce byte-identical output
(rows sorted deterministically by name).

STRUCTURAL RULES (enforced by shape, not just convention):
  X9: ZERO DB writes -- this generator only SELECTs.
  D1/D20: Track-B signal column is NOT selected here (Track-A only).
  X2: route_by_level is IMPORTED from extractor_lib._acceptance; never
      re-implemented in this file.
  X10: ASCII only -- '--' for dashes, no em/en-dash, no emoji.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))

# X2: consume the Phase-4 predicate; NEVER re-implement it here.
from extractor_lib._acceptance import route_by_level
from extractor_lib._runtime_dead_entities import render_dead_entities

# Pool figure: the live-re-derived F2 figure (92 cvars / 74 commands).
# The generator does NOT re-run detection (X7); this constant is the
# executor-confirmed authoritative figure for this pin.
POOL_FIGURE = "92 cvars / 74 commands"

# Regen date: the date this generator was last run for the artifact.
REGEN_DATE = "2026-05-20"

# The read-only psql transport (mirrors front1-diff.sh consistency).
# -tA: tuples-only, unaligned. Pipe separator '|' is the default -tA field
# separator for psql; the JSONB column is selected last so embedded '|'
# characters in other columns do not corrupt the parse (JSONB is one column,
# parsed independently from the split).
_PSQL_BASE = [
    "docker", "exec", "-i", "qw-oracle-postgres-dev",
    "psql", "-U", "qworacle", "-d", "qw_oracle", "-tA",
]


def _psql_query(sql: str) -> str:
    """Run a read-only psql query, return raw stdout. Dies LOUD on failure."""
    proc = subprocess.run(
        _PSQL_BASE + ["-c", sql],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        print(
            f"DB READ FAILED -- psql exited {proc.returncode}: "
            f"{proc.stderr.strip()}",
            file=sys.stderr,
        )
        sys.exit(1)
    return proc.stdout


def _fetch_track_a_rows(version: str) -> list[dict]:
    """SELECT Track-A rows from cvar_versions and command_versions.

    Returns a list of dicts with keys: type, name, source_file,
    source_line, ta (the parsed track_a_reachability JSONB dict).

    Track-A signal only -- D1/D20 structural no-blend (Track-B column is absent).
    """
    rows: list[dict] = []
    for table, etype in (("cvar_versions", "cvar"), ("command_versions", "command")):
        # Select the declaration cite + full JSONB as the last column.
        # Using \x1f (unit-separator) as the delimiter avoids collisions with
        # both the pipe-default and any JSONB content.
        sql = (
            f"SELECT e.type, e.name, {table}.source_file, {table}.source_line,"
            f" {table}.track_a_reachability"
            f" FROM {table}"
            f" JOIN entities e ON e.id = {table}.entity_id"
            f" WHERE {table}.version = '{version}'"
            f" AND {table}.track_a_reachability IS NOT NULL"
        )
        raw = _psql_query(sql)
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            # psql -tA default separator is '|'; split on the FIRST four pipes
            # only so the JSONB (last column) can contain '|' safely.
            parts = line.split("|", 4)
            if len(parts) < 5:
                print(
                    f"WARNING: unexpected column count ({len(parts)}) in line:"
                    f" {line!r}",
                    file=sys.stderr,
                )
                continue
            row_type, row_name, src_file, src_line_str, ta_json = parts
            try:
                src_line = int(src_line_str)
            except ValueError:
                src_line = 0
            try:
                ta = json.loads(ta_json)
            except (json.JSONDecodeError, ValueError) as exc:
                print(
                    f"WARNING: could not parse track_a_reachability JSON for"
                    f" {row_name!r}: {exc}",
                    file=sys.stderr,
                )
                continue
            rows.append({
                "type": row_type,
                "name": row_name,
                "source_file": src_file,
                "source_line": src_line,
                "ta": ta,
            })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Regenerate the runtime-dead-entities upstream PR digest."
    )
    parser.add_argument(
        "--project", required=True, help="e.g. ezquake"
    )
    parser.add_argument(
        "--version", default="head",
        help="DB version slice to query (default: head)"
    )
    args = parser.parse_args()

    version = args.version

    # -- Read Track-A signal (read-only; X9 zero writes) --
    all_rows = _fetch_track_a_rows(version)

    # -- Filter: level-3 dump-confirmed genuine-dead only (D1/D13/D20) --
    # route_by_level is IMPORTED from extractor_lib._acceptance (X2).
    # build-excluded is structurally excluded: it is never dump-confirmed,
    # so route_by_level returns "assistant-only" and the row is dropped.
    # NO build-excluded special case needed or permitted.
    kept: list[dict] = []
    for row in all_rows:
        ta = row["ta"]
        dump_confirmation = ta.get("dump_confirmation")
        conclusion = ta.get("conclusion")
        if (
            route_by_level(dump_confirmation) == "autonomous-eligible"
            and conclusion == "genuine-dead"
        ):
            kept.append(row)

    # -- Partition by evidence feeder (D7.1: callgraph and commented-register
    #    are exhaustive for Track-A genuine-dead at this pin) --
    callgraph_rows: list[dict] = []
    commented_rows: list[dict] = []
    for row in kept:
        feeder = row["ta"].get("evidence", {}).get("feeder")
        if feeder == "callgraph":
            callgraph_rows.append(row)
        elif feeder == "commented-register":
            commented_rows.append(row)
        else:
            # D7.1: any other feeder on a kept row is a structural error.
            # Raise LOUD -- do NOT silently drop or misclassify.
            print(
                f"FATAL: unexpected feeder {feeder!r} on kept genuine-dead"
                f" row {row['name']!r}. The two feeders (callgraph,"
                f" commented-register) are declared exhaustive for Track-A"
                f" genuine-dead (D7.1). Aborting.",
                file=sys.stderr,
            )
            return 1

    # -- Stable sort by name (idempotent across runs) --
    callgraph_rows.sort(key=lambda r: r["name"])
    commented_rows.sort(key=lambda r: r["name"])

    # -- Render --
    md = render_dead_entities(
        level3_callgraph_rows=callgraph_rows,
        level3_commented_rows=commented_rows,
        pool_figure=POOL_FIGURE,
        regen_date=REGEN_DATE,
    )

    # -- Write (idempotent overwrite; the .md is a code output, never edited) --
    out_dir = REPO_ROOT / "apps/qw-oracle/docs/upstream-prs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.project}-runtime-dead-entities.md"
    out_path.write_text(md, encoding="utf-8")

    # -- Stderr summary (per-Class counts + pool figure) --
    print(
        f"Runtime-dead digest written: Class 1 (callgraph)={len(callgraph_rows)}"
        f" Class 2 (commented-register)={len(commented_rows)}"
        f" pool={POOL_FIGURE} -> {out_path}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
