#!/usr/bin/env bash
# version-pin-proxy.sh -- Phase-4 version-pin sanity proxy (enforce-L1-runtime-truth arc).
#
# PRIMARY leg (ordered first): assert the dump's embedded `version`-command OUTPUT
# banner (`ezQuake <ver> <build>~<hex>`) is a prefix of oracle_meta
# ezquake:source_repo_commit. This is the EXACT version-pin sub-gate (review-findings F7):
# the dump self-certifies its commit; a wrong-commit dump trips this leg immediately.
#
# SECONDARY legs (kept verbatim-in-substance from front1-diff.sh:33-36): two cvar-only
# SANITY GATE heuristics that corroborate the pin. Reused NOT reinvented (R6).
#
# --emit-runtime-sets <dir>: write cmdlist + cvarlist to <dir>/rt-cmds.txt and
# <dir>/rt-cvars.txt for stage-2 consumption (S1) -- no third SANITY leg added.
#
# Usage:
#   version-pin-proxy.sh [dump-file] [--emit-runtime-sets <dir>]
#   dump-file defaults to entities-runtime-dump-3f9e724f.txt beside this script.
#
# Exit 0 only when PRIMARY SHA leg AND both SECONDARY SANITY legs PASS.

set -o pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# -- argument parsing --
F=""
EMIT_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --emit-runtime-sets)
      EMIT_DIR="$2"
      shift 2
      ;;
    *)
      F="$1"
      shift
      ;;
  esac
done
F="${F:-$SCRIPT_DIR/entities-runtime-dump-3f9e724f.txt}"

DB="docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tA"

# norm: strip CRLF (\r), ezQuake color codes (&cXXX), reset codes (&r).
# unchanged from front1-diff.sh -- same pattern, same rationale (CRLF Windows capture).
norm() { sed -E 's/\r//g; s/&c[0-9a-fA-F]{3}//g; s/&r//g'; }

# Scratch dir cleaned on exit -- avoids /tmp collisions across concurrent runs.
TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT

# ============================================================
# PRIMARY LEG: embedded commit banner -> oracle_meta prefix check
# ============================================================
# Pattern: `ezQuake <ver> <build>~<hex>` (e.g. `ezQuake 3.7.0-dev 8084~3f9e724fa`).
# The banner sits in the post-macrolist tail (~line 3347), outside all three
# extraction ranges (7-564 / 571-3272 / 3276-3344), so it never polluted
# the front1-diff candidate pools.  No hardcoded line number -- grep the whole
# dump so this survives recapture or future format drift.
BANNER_SHA=$(norm < "$F" | grep -oE 'ezQuake [0-9]+\.[0-9]+\.[0-9]+(-dev)? [0-9]+~[0-9a-fA-F]+' | head -1 | grep -oE '[0-9a-fA-F]+$')

PRIMARY_PASS=0
if [[ -z "$BANNER_SHA" ]]; then
  echo "[FAIL] PRIMARY: no embedded ezQuake version banner found in dump"
else
  META_SHA=$($DB -c "SELECT value FROM oracle_meta WHERE key='ezquake:source_repo_commit'" 2>/dev/null | norm | tr -d '[:space:]')
  if [[ -z "$META_SHA" ]]; then
    echo "[FAIL] PRIMARY: oracle_meta ezquake:source_repo_commit not found"
  elif [[ "$META_SHA" == "$BANNER_SHA"* ]]; then
    # BANNER_SHA is a prefix of META_SHA -- exact self-certifying match (F7).
    echo "[PASS] PRIMARY: dump banner ~${BANNER_SHA} is prefix of oracle_meta ${META_SHA}"
    PRIMARY_PASS=1
  else
    echo "[FAIL] PRIMARY: dump banner ~${BANNER_SHA} does NOT match oracle_meta ${META_SHA}"
  fi
fi

# ============================================================
# Build runtime sets needed for the SECONDARY legs (and optional stage-2 export).
# Verbatim-in-substance from front1-diff.sh lines 13-14: same sed ranges,
# same norm(), same grep patterns, same awk field extract -- paths repointed only.
# ============================================================
sed -n '7,564p'    "$F" | norm | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | grep -E '^[+-]?[A-Za-z_][A-Za-z0-9_]*$' | sort -u > "$TMPD/rt-cmds.txt"
sed -n '571,3272p' "$F" | norm | awk 'NF{print $NF}'                            | grep -E '^[A-Za-z_][A-Za-z0-9_]*$'    | sort -u > "$TMPD/rt-cvars.txt"

# -- optional stage-2 export (S1) --
if [[ -n "$EMIT_DIR" ]]; then
  mkdir -p "$EMIT_DIR"
  cp "$TMPD/rt-cmds.txt"  "$EMIT_DIR/rt-cmds.txt"
  cp "$TMPD/rt-cvars.txt" "$EMIT_DIR/rt-cvars.txt"
fi

# ============================================================
# L1-source cvar set (needed by the SECONDARY legs).
# Verbatim from front1-diff.sh single-type branch of lines 18-21 for cvar.
# ============================================================
$DB -c "SELECT DISTINCT e.name FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id JOIN versions v ON v.version=cv.version AND v.project=e.project WHERE e.project='ezquake' AND e.type='cvar' AND v.version='head'" \
  | norm | sed -E 's/^\$//' | grep -E '^[+-]?[A-Za-z_][A-Za-z0-9_]*$' | sort -u > "$TMPD/src-cvar.txt"

comm -23 "$TMPD/src-cvar.txt" "$TMPD/rt-cvars.txt" > "$TMPD/cand-cvar.txt"

# ============================================================
# SECONDARY legs -- verbatim-in-substance from front1-diff.sh:33-36.
# Cvar-only; no command SANITY leg added (spec: kept as-is from banked script).
# ============================================================
SANITY1_PASS=0
SANITY2_PASS=0

grep -qxF sb_qtvlist_url "$TMPD/cand-cvar.txt" \
  && { echo "  [PASS] sb_qtvlist_url IN cvar candidate pool"; SANITY1_PASS=1; } \
  || echo "  [FAIL] sb_qtvlist_url missing"

bad=$(grep -xE 'bottomcolor|bgmvolume|cl_bobhead|zombietime|cl_cmdline|name' "$TMPD/cand-cvar.txt" | tr '\n' ' ')
[ -z "$bad" ] \
  && { echo "  [PASS] no known-live cvar in candidate pool"; SANITY2_PASS=1; } \
  || echo "  [FAIL] known-live leaked into pool: $bad"

# ============================================================
# Exit contract: 0 only when all three legs pass (D19 hard sub-gate).
# ============================================================
if [[ $PRIMARY_PASS -eq 1 && $SANITY1_PASS -eq 1 && $SANITY2_PASS -eq 1 ]]; then
  exit 0
else
  exit 1
fi
