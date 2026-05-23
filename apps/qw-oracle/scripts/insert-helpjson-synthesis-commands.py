#!/usr/bin/env python3
"""Insert operator-reviewed synthesized descriptions for 156 ezquake commands.

Sets entities.description + entities.description_origin='synthesized' for
each. Atomic (single transaction). Guarded by F-D4a in deriveCommand so
subsequent re-walks won't clobber. Reconciliation when upstream PR #1128
merges: see derive-entity-description.ts:deriveCommand header comment.

Idempotent: if any of the 156 rows already has description_origin='synthesized'
the script reports and exits without writing.

Note on split between PR payload and L1 content (operator decision 2026-05-23):
- 10 dev_* commands ship SHORT MARKERS upstream (PR #1128), but L1 carries the
  FULL PROSE drafts for richer MCP/oracle responses. That divergence is
  intentional. Reconciliation when upstream merges: leave L1's richer prose in
  place via the F-D4a guard; do NOT downgrade L1 to match upstream's marker.
- All 146 other entries match the PR-payload JSON exactly.
"""
import json
import subprocess
import sys
from pathlib import Path

PAYLOAD_PATH = Path(__file__).parent.parent / "docs" / "upstream-prs" / "ezquake-help-commands-PR-payload.json"

# ============================================================
# Rich L1 prose for the 10 dev_* commands -- diverges from PR payload
# (PR ships short markers; L1 keeps richer descriptions). Corrections
# from the operator-reviewed findings batch (#6, #7, #8, #11, #17) are
# already applied.
# ============================================================

DEV_FULL_PROSE = {
    "dev_gfxtexturedump": "Dumps all currently loaded OpenGL textures to PNG files in a timestamped folder under qw/. Creates a directory named qw/textures_YYYY-MM-DD_HH-MM-SS under the base directory, then writes one PNG per loaded 2D texture and one PNG per face for cubemap textures, named by texture index and identifier. Requires a build compiled with WITH_RENDERING_TRACE and the rendering debug context active (-r-debug or -r-trace launch parameter). Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_gfxbenchmarklightmaps": "Benchmarks all supported OpenGL lightmap format and type combinations and prints results sorted by upload time. For each valid format/type pair, uploads a full lightmap tile 1000 times, measures total elapsed time, then prints a ranked table to the console with the fastest format highlighted. Helps developers identify the optimal lightmap format for the current GPU and driver. Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_gfxtexturelist": "Lists all currently loaded OpenGL textures to the console, showing index, identifier, width, height, and texture mode for each valid slot. Accepts an optional regex pattern as the first argument to filter output to matching identifiers only. Example: `dev_gfxtexturelist skin` lists only textures whose identifier contains \"skin\". Requires a build compiled with WITH_RENDERING_TRACE and the rendering debug context active. Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_gfxtrace": "Queues a single-frame rendering trace for the next rendered frame. Sets an internal flag (dev_frame_debug_queued) that causes the renderer to emit a detailed GL state log for that frame. Requires a build compiled with WITH_RENDERING_TRACE and the debug profile context active (-r-debug or -r-trace launch parameter). The trace is also triggered automatically at the start of each frame when the debug context is active. Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_physicsnormalset": "Sets a custom physics normal for the ground surface directly beneath the player. Usage: `dev_physicsnormalset <x> <y> <z> <flags>`. The x/y/z arguments specify the desired normal vector (normalized automatically). The flags argument is a string of zero or more characters: x, y, z to flip the corresponding axis, or n to set no flip flags. Requires devmap (allow_cheats) and that the player is standing on a surface with an existing physics normal entry; prints the updated normal via dev_physicsnormalshow on success. Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_physicsnormalshow": "Prints the plane and physics normal for the ground surface directly beneath the player. Displays the geometry plane normal and, if a custom physics normal is defined for the surface, shows each axis value with a color highlight for any flipped axes. Reports \"Not on ground\" if no ground trace is found, and \"No custom physics plane found\" if the surface has no override. Requires devmap (allow_cheats) to run. Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_physicsnormalsave": "Saves all custom physics-normal overrides for the current map to a .qpn file. Writes to qw/<mapname>.qpn in the base directory and prints the filename on success. Requires the client to be active on a devmap (r_refdef2.allow_cheats must be set); prints \"Not available outwith /devmap\" otherwise. Part of the dev_physicsnormal* workflow: use dev_physicsnormalshow to inspect the current surface normal, dev_physicsnormalset to assign a new one, then dev_physicsnormalsave to persist it. Only registered when ezQuake is launched in developer mode (-developer cmdline param) and not built with CLIENTONLY.",
    "dev_dump_defaults": "Writes the default values of all registered cvars to `ezquake/configs/cvar_defaults.cfg` in the base game directory. Cvars are written grouped by their cvar group, with ungrouped cvars appended at the end. Prints the output file path on success or an error message if the file cannot be opened or closed. Intended as a developer diagnostic tool. Only available when ezQuake is launched in developer mode.",
    "dev_help_verify_config": "Developer tool that cross-checks live cvar values against their type declarations in help_variables.json. For each cvar marked \"boolean\" it flags any value that is not 0 or 1; for each cvar marked \"enum\" it flags any value not present in the documented examples list. Output is printed to the console with the offending cvar name highlighted, followed by a final count of boolean-type mismatches (enum-type mismatches are listed but NOT included in the count). Cvars that exist in the JSON but are no longer registered at runtime are silently skipped (treated as intentionally obsolete documentation). Only available when ezQuake is launched in developer mode.",
    "dev_help_issues": "Developer tool that audits all registered cvars, commands, macros, and command-line parameters against the four help JSON files and reports anything missing or malformed. Running without arguments prints a console report of each undocumented or invalid entry. Running with the \"generate\" subcommand (`dev_help_issues generate`) instead inserts a stub placeholder -- marked \"system-generated\": true -- for every missing entry and then writes all four JSON files back to disk under qw/; this is the mechanism that seeded the system-generated placeholder entries visible throughout the help JSON corpus. Only available when ezQuake is launched in developer mode.",
}


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
    # Build FILLS dict: PR payload for 146 entries, FULL prose for 10 dev_*
    with open(PAYLOAD_PATH) as f:
        payload = json.load(f)
    fills = {name: entry["description"] for name, entry in payload.items()}
    # Override dev_* entries with the rich prose
    for name, rich in DEV_FULL_PROSE.items():
        if name not in fills:
            sys.exit(f"ABORT: dev_* entry {name!r} not in payload (unexpected)")
        fills[name] = rich

    # Historical note: when this script first ran on 2026-05-23, the PR-payload
    # JSON had lowercase 'unignoreall' / 'unignoreall_team' keys (matching the
    # case-folded placeholders in help_commands.json), but L1 entities have the
    # canonical camelCase 'unignoreAll' / 'unignoreAll_team' (matching source
    # registration at ignore.c:526-527). The map below converted lowercase
    # payload keys to camelCase L1 names so the UPDATE matched. The PR-payload
    # was later corrected to use camelCase natively (case-mismatch fix commit
    # on PR #1128), so the map is no longer triggered on re-runs -- kept here
    # as a defensive fallback for any reverted-payload re-runs.
    L1_NAME_MAP = {
        "unignoreall": "unignoreAll",
        "unignoreall_team": "unignoreAll_team",
    }
    for lowercase, camelcase in L1_NAME_MAP.items():
        if lowercase in fills:
            fills[camelcase] = fills.pop(lowercase)
            print(f"L1 name remap: {lowercase!r} -> {camelcase!r} (camelCase in source)")

    names = list(fills.keys())
    names_sql = ", ".join(f"'{n}'" for n in names)
    print(f"Total entries to insert: {len(names)}")
    print(f"  - From PR payload: {len(names) - len(DEV_FULL_PROSE)}")
    print(f"  - Rich-prose overrides (dev_*): {len(DEV_FULL_PROSE)}")
    print()

    # Pre-flight: verify all 156 names exist as ezquake commands.
    pre = psql(f"""
        SELECT count(*)
        FROM entities
        WHERE project='ezquake' AND type='command' AND name IN ({names_sql})
    """).strip()
    if pre != str(len(names)):
        sys.exit(f"ABORT: expected {len(names)} rows in entities, found {pre}.")

    # Check for already-synthesized rows (re-run protection).
    already = psql(f"""
        SELECT name FROM entities
        WHERE project='ezquake' AND type='command'
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

    print(f"Pre-flight: {pre} command rows exist, 0 already synthesized.")

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
          AND e.type = 'command'
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
        WHERE project='ezquake' AND type='command' AND name IN ({names_sql})
    """).strip()
    synth_count, desc_count, stale_count = post.split("|")
    print(f"Applied: {synth_count} rows with description_origin='synthesized'")
    print(f"         {desc_count} rows with non-empty description")
    print(f"         {stale_count} rows flagged description_embedding_stale=TRUE")

    if synth_count != str(len(names)) or desc_count != str(len(names)):
        sys.exit("ABORT: post-flight counts don't match expectation.")

    print()
    print(f"All {len(names)} synthesized descriptions inserted atomically.")
    print("Downstream consumers (Oracle bot, slipgate, etc.) now have descriptions.")
    print("If PR #1128 merges upstream, run the F-D4a reconciliation snippet from")
    print("derive-entity-description.ts:deriveCommand's header comment.")
    print("Note: the 10 dev_* commands' L1 prose intentionally diverges from upstream")
    print("(short markers in help_commands.json vs full prose in L1) -- do NOT")
    print("downgrade L1 during reconciliation.")


if __name__ == "__main__":
    main()
