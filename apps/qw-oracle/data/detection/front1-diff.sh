#!/usr/bin/env bash
# Front 1: L1 source-extracted (ezquake HEAD 3f9e724f) MINUS runtime dump.
# Runtime dump is CRLF (Windows ezQuake) -> \r MUST be stripped everywhere.
# All sets normalized + LC_ALL=C sorted before comm (mixed collation = garbage).
# Output = CANDIDATE pool (upper bound): genuine-dead + platform/#ifdef-excluded.
set -o pipefail
export LC_ALL=C
F="/mnt/c/Games/QuakeWorld/QuakeWorld/qw/matches/entities.log"
DB="docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tA"
norm() { sed -E 's/\r//g; s/&c[0-9a-fA-F]{3}//g; s/&r//g'; }   # kill CR + ezq color codes

# ---- runtime sets, re-derived clean from the dump (do NOT trust earlier banks) ----
sed -n '7,564p'    "$F" | norm | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | grep -E '^[+-]?[A-Za-z_][A-Za-z0-9_]*$' | sort -u > /tmp/rt-cmds.txt
sed -n '571,3272p' "$F" | norm | awk 'NF{print $NF}'                            | grep -E '^[A-Za-z_][A-Za-z0-9_]*$'    | sort -u > /tmp/rt-cvars.txt
sed -n '3276,3344p' "$F"| norm | sed -E 's/^\$//; s/^[[:space:]]+//'            | grep -E '^[A-Za-z_][A-Za-z0-9_]*$'    | sort -u > /tmp/rt-macros.txt

# ---- L1 source-extracted @ HEAD ----
for t in cvar command macro; do
  $DB -c "SELECT DISTINCT e.name FROM entities e JOIN ${t}_versions cv ON cv.entity_id=e.id JOIN versions v ON v.version=cv.version AND v.project=e.project WHERE e.project='ezquake' AND e.type='${t}' AND v.version='head'" \
   | norm | sed -E 's/^\$//' | grep -E '^[+-]?[A-Za-z_][A-Za-z0-9_]*$' | sort -u > /tmp/src-${t}.txt
done

declare -A RT=( [cvar]=/tmp/rt-cvars.txt [command]=/tmp/rt-cmds.txt [macro]=/tmp/rt-macros.txt )
echo "type     L1src  runtime  overlap  CANDIDATES  reverse"
for t in cvar command macro; do
  s=/tmp/src-${t}.txt; r=${RT[$t]}
  ov=$(comm -12 "$s" "$r" | wc -l)
  comm -23 "$s" "$r" > /tmp/cand-${t}.txt
  rv=$(comm -13 "$s" "$r" | wc -l)
  printf "%-8s %5d  %6d  %6d  %9d  %6d\n" "$t" "$(wc -l <"$s")" "$(wc -l <"$r")" "$ov" "$(wc -l </tmp/cand-${t}.txt)" "$rv"
done

echo "== SANITY GATE =="
grep -qxF sb_qtvlist_url /tmp/cand-cvar.txt && echo "  [PASS] sb_qtvlist_url IN cvar candidate pool" || echo "  [FAIL] sb_qtvlist_url missing"
bad=$(grep -xE 'bottomcolor|bgmvolume|cl_bobhead|zombietime|cl_cmdline|name' /tmp/cand-cvar.txt | tr '\n' ' ')
[ -z "$bad" ] && echo "  [PASS] no known-live cvar in candidate pool" || echo "  [FAIL] known-live leaked into pool: $bad"
echo "== cvar candidate sample (25, post-fix) ==" && head -25 /tmp/cand-cvar.txt