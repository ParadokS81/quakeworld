#!/usr/bin/env python3
"""Insert operator-reviewed synthesized descriptions for 49 ezquake cmdline_params.

Sets entities.description + entities.description_origin='synthesized' for
each. Atomic (single transaction). Guarded by F-D4a in deriveCmdlineParam so
subsequent re-walks won't clobber. Reconciliation when upstream PR #1131
merges: see derive-entity-description.ts:deriveCmdlineParam header comment.

Idempotent: if any of the 49 rows already has description_origin='synthesized'
the script reports and exits without writing.

Note: cmdline pass does NOT have any L1-vs-PR-payload divergence (no dev_*
split like commands; no case-folding issues like ignoreAll/ignoreAll_team).
All 49 entries match the PR-payload JSON exactly. The 2 promoted-from-no_doc
entries (-noatlas, -r-novao) were authored during the 2026-05-26 walk and
are part of the payload.
"""
import json
import subprocess
import sys
from pathlib import Path

PAYLOAD_PATH = Path(__file__).parent.parent / "docs" / "upstream-prs" / "ezquake-help-cmdline-PR-payload.json"


def psql(sql):
    """Run SQL via docker exec. Returns stdout. Raises on non-zero exit."""
    cmd = [
        "docker", "exec", "-i", "qw-oracle-postgres-dev",
        "psql", "-U", "qworacle", "-d", "qw_oracle",
        "-v", "ON_ERROR_STOP=1", "-tAc", sql,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(f"SQL failed:\n  {sql[:500]}\n  stderr: {r.stderr}\n")
        sys.exit(1)
    return r.stdout


def main():
    with open(PAYLOAD_PATH) as f:
        payload = json.load(f)
    fills = {name: entry["description"] for name, entry in payload.items()}

    names = list(fills.keys())
    names_sql = ", ".join(f"'{n}'" for n in names)
    print(f"Total entries to insert: {len(names)}")
    print()

    # Pre-flight: verify all names exist as ezquake cmdline_params.
    pre = psql(f"""
        SELECT count(*)
        FROM entities
        WHERE project='ezquake' AND type='cmdline_param' AND name IN ({names_sql})
    """).strip()
    if pre != str(len(names)):
        sys.exit(f"ABORT: expected {len(names)} rows in entities, found {pre}.")

    # Check for already-synthesized rows (re-run protection).
    already = psql(f"""
        SELECT name FROM entities
        WHERE project='ezquake' AND type='cmdline_param'
          AND name IN ({names_sql})
          AND description_origin = 'synthesized'
        ORDER BY name
    """)
    already_rows = [ln for ln in already.strip().split("\n") if ln]
    if already_rows:
        print(f"ABORT: {len(already_rows)} rows already have description_origin='synthesized':")
        for ln in already_rows[:10]:
            print(f"  {ln}")
        if len(already_rows) > 10:
            print(f"  ... and {len(already_rows) - 10} more")
        print("This is a re-run; nothing to do. To repeat, first reset description_origin.")
        sys.exit(1)

    print(f"Pre-flight: {pre} cmdline_param rows exist, 0 already synthesized.")

    # Build the bulk UPDATE as a single VALUES-driven CTE for atomicity.
    values_clauses = []
    for name, desc in fills.items():
        esc_name = name.replace("'", "''")
        esc_desc = desc.replace("'", "''")
        values_clauses.append(f"('{esc_name}', '{esc_desc}')")
    values_sql = ",\n      ".join(values_clauses)

    bulk_sql = f"""
        BEGIN;
        WITH fills(name, description) AS (
            VALUES
                {values_sql}
        )
        UPDATE entities e SET
            description = f.description,
            description_origin = 'synthesized',
            description_embedding_stale = TRUE,
            updated_at = now()
        FROM fills f
        WHERE e.project = 'ezquake'
          AND e.type = 'cmdline_param'
          AND e.name = f.name;
        COMMIT;
    """
    psql(bulk_sql)

    # Post-flight: verify.
    post = psql(f"""
        SELECT
            count(*) FILTER (WHERE description_origin = 'synthesized'),
            count(*) FILTER (WHERE description IS NOT NULL AND length(description) > 0),
            count(*) FILTER (WHERE description_embedding_stale = TRUE)
        FROM entities
        WHERE project='ezquake' AND type='cmdline_param' AND name IN ({names_sql})
    """).strip()
    synth_count, desc_count, stale_count = post.split("|")
    print(f"Applied: {synth_count} rows with description_origin='synthesized'")
    print(f"         {desc_count} rows with non-empty description")
    print(f"         {stale_count} rows flagged description_embedding_stale=TRUE")

    if synth_count != str(len(names)) or desc_count != str(len(names)):
        sys.exit("ABORT: post-flight counts don't match expectation.")

    print()
    print(f"All {len(names)} synthesized descriptions inserted atomically.")
    print("Downstream consumers (Oracle MCP, slipgate snapshot) now have descriptions.")
    print("If PR #1131 merges upstream, run the F-D4a reconciliation snippet from")
    print("derive-entity-description.ts:deriveCmdlineParam's header comment.")


if __name__ == "__main__":
    main()
