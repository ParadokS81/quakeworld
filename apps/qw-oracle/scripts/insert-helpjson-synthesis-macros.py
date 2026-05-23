#!/usr/bin/env python3
"""Insert operator-reviewed synthesized descriptions for 36 ezquake macros.

Sets entities.description + entities.description_origin='synthesized' for
each. Atomic (single transaction). Guarded by F-D4a in deriveMacro so
subsequent re-walks won't clobber. Reconciliation when upstream PR #1127
merges: see derive-entity-description.ts:deriveMacro header comment.

Idempotent: if any of the 36 rows already has description_origin='synthesized'
the script reports and exits without writing.
"""
import subprocess
import sys

# Same source-of-truth dict as the upstream PR payload
# (apps/qw-oracle/docs/upstream-prs/ezquake-help-macros-PR-payload.json).
FILLS = {
    # cl_main.c
    "conheight": "console (virtual) resolution height in pixels.",
    "conwidth": "console (virtual) resolution width in pixels.",
    "demotime": "current demo playback time in seconds (float). Intended for scripted and timed camera movement.",
    "matchstatus": 'current match state: one of "disconnected", "standby", or "normal".',
    "rand": "random float in the range [0, 1).",
    "serverip": "current server IP address and port, in ip:port form.",
    # match_tools.c
    "matchname": 'current match name, derived from the active match-format template (e.g. "duel/playerA_vs_playerB - [dm6]"). Returns "No match in progress" when not connected.',
    "matchtype": 'current match type keyword: one of duel, ffa, 2on2, 3on3, 4on4, tdm, arena, tfduel, tfclanwar, solo, coop, race, empty, unknown. Returns "No match in progress" when not connected.',
    # teamplay.c -- date/time
    "dateiso": "current local date and time in ISO-adjacent format YYYY-MM-DD_HH-MM.",
    "timestamp": "current local date and time as a compact filesystem-safe string: YYYYMMDD-HHMM.",
    # teamplay.c -- powerup
    "colored_powerups": "current powerups held as color-coded full names (quad, pent, ring), concatenated without separator.",
    "colored_short_powerups": "current powerups held as compact color-coded initials (q=quad blue, r=ring yellow, p=pent red); output order is q-r-p. Returns empty string when no powerups held.",
    "lastpowerup": 'powerups last seen on the enemy within the past 5 seconds (e.g. "quad pent"); falls back to the value of tp_name_quad when no recent sighting.',
    "powerups": "separator-delimited list of powerups currently held (quad, pent, ring, flag for CTF/TF); returns tp_name_none when none held.",
    # teamplay.c -- location and death
    "deathloc": "map location name where the player last died, or tp_name_someplace if no death has been recorded this session.",
    "lastloc": "location name at time of last death if death occurred within the past 5 seconds; otherwise current location name.",
    "location": "name of the player's current map location, as defined by the active .loc file.",
    "lastip": "IP address or hostname:port of the last server seen in console output, captured by an internal trigger pattern.",
    # teamplay.c -- pointing
    "point": "name of the nearest item or entity the player is pointing at, as used in location-pointing messages; returns tp_name_nothing when the player is flashed.",
    "pointloc": "map location of the entity pointed at, or current location if no specific point location is available; returns tp_name_nothing when the player is flashed.",
    "pointatloc": 'pointed-at item name combined with its location, in "name at location" format; bounded by the tp_pointtimeout cvar and returns tp_name_nothing when the player is flashed or the timeout expires.',
    # teamplay.c -- took
    "took": "name of the last item picked up; returns tp_name_nothing if nothing has been picked up yet.",
    "tookloc": "map location name where the last item was picked up; returns tp_name_someplace when no item has been picked up.",
    "tookatloc": 'last item picked up with its pickup location, in "name at location" format; returns tp_name_nothing when no item has been picked up.',
    # teamplay.c -- weapon
    "weapon": 'name of the currently active weapon, using tp_name_* cvar values (e.g. "rl", "lg").',
    "weaponnum": "currently active weapon as a slot number (1-8), or pre-selected best weapon number when cl_weaponpreselect is enabled.",
    "weapons": "separator-delimited list of all weapons currently held, ordered from strongest to weakest (lg, rl, gl, sng, ng, ssg, sg, axe).",
    # teamplay.c -- team-name (family-collapse Option B)
    "team1": 'name of the Nth team currently playing, alphabetically sorted; $team1 returns the first team, $team2 the second. In FFA (no teamplay), returns player names instead. Falls back to literal "team1"/"team2" when fewer teams exist.',
    "team2": 'name of the Nth team currently playing, alphabetically sorted; $team1 returns the first team, $team2 the second. In FFA (no teamplay), returns player names instead. Falls back to literal "team1"/"team2" when fewer teams exist.',
    # teamplay.c -- misc
    "latency": "current network latency in milliseconds, rounded to nearest integer.",
    "ping": "current network latency in milliseconds, rounded to nearest integer. Alias for $latency.",
    "need": 'separator-delimited list of items the player currently needs based on tp_need_* thresholds (e.g. "armor health rl").',
    "ledpoint": "LED color code indicating the type of entity pointed at: red for enemy, green for teammate, yellow for powerup, blue for item.",
    "ledstatus": "LED color code reflecting how many items the player currently needs: green for none, yellow for one, red for two or more.",
    "tf_skin": "current player's skin name, with TeamFortress skin prefixes expanded to full class names (e.g. tf_demo -> demoman, tf_eng -> engineer).",
    "triggermatch": "full text of the console message that last fired a regexp trigger.",
}


def psql(sql, capture_stderr=True):
    """Run SQL via docker exec. Returns stdout. Raises on non-zero exit."""
    cmd = [
        "docker", "exec", "-i", "qw-oracle-postgres-dev",
        "psql", "-U", "qworacle", "-d", "qw_oracle",
        "-v", "ON_ERROR_STOP=1", "-tAc", sql,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(f"SQL failed:\n  {sql}\n  stderr: {r.stderr}\n")
        sys.exit(1)
    return r.stdout


def main():
    names = list(FILLS.keys())
    names_sql = ", ".join(f"'{n}'" for n in names)

    # Pre-flight: verify current state -- all 36 should have NULL description.
    pre = psql(f"""
        SELECT name, description_origin, description IS NULL AS desc_null
        FROM entities
        WHERE project='ezquake' AND type='macro' AND name IN ({names_sql})
        ORDER BY name
    """)
    rows = [ln for ln in pre.strip().split("\n") if ln]
    if len(rows) != len(names):
        sys.exit(f"ABORT: expected {len(names)} rows, found {len(rows)}. Missing or extra entries.")

    already_synth = [ln for ln in rows if "|synthesized|" in ln]
    if already_synth:
        print(f"ABORT: {len(already_synth)} rows already have description_origin='synthesized':")
        for ln in already_synth:
            print(f"  {ln}")
        print("Run reconciliation first, or this is a re-run.")
        sys.exit(1)

    non_null_descs = [ln for ln in rows if not ln.endswith("|t")]
    if non_null_descs:
        print(f"ABORT: {len(non_null_descs)} rows have non-NULL description (unexpected):")
        for ln in non_null_descs:
            print(f"  {ln}")
        sys.exit(1)

    print(f"Pre-flight: {len(rows)} rows have NULL description, ready to fill.")

    # Build the bulk UPDATE as a single VALUES-driven CTE for atomicity.
    # Escape single quotes in descriptions by doubling them (SQL convention).
    values_clauses = []
    for name, desc in FILLS.items():
        esc_desc = desc.replace("'", "''")
        values_clauses.append(f"('{name}', '{esc_desc}')")
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
          AND e.type = 'macro'
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
        WHERE project='ezquake' AND type='macro' AND name IN ({names_sql})
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
    print("If PR #1127 merges upstream, run the F-D4a reconciliation snippet from")
    print("derive-entity-description.ts:deriveMacro's header comment.")


if __name__ == "__main__":
    main()
