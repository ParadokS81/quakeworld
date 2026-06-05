#!/usr/bin/env bash
# version-pin-proxy.sh -- Phase-4 version-pin sanity proxy (enforce-L1-runtime-truth arc).
#
# PRIMARY leg (ordered first): assert the dump's embedded `version`-command OUTPUT
# banner (`ezQuake <ver> <build>~<hex>`) is a prefix of the AUTHORITATIVE per-version
# head commit `versions.commit_sha WHERE project='ezquake' AND version='head'`. This is
# the EXACT version-pin sub-gate (review-findings F7): the dump self-certifies its
# commit; a wrong-commit dump trips this leg immediately.
#
# WHY versions.commit_sha and NOT oracle_meta:source_repo_commit (the original source):
# oracle_meta:source_repo_commit is GLOBAL and records whatever extraction ran LAST.
# A stable-tag backfill (e.g. 3.6.7) run after a head walk CLOBBERS it to the tag's
# commit, even though the head entities are still at the head commit. versions.commit_sha
# is the per-version provenance and is therefore head-stable across backfills.
# (Verified 2026-06-05: a 3.6.7 backfill had clobbered oracle_meta to 7b2f0552 while
# versions head = e4a2c20a; the old proxy would have failed the pin on a correct dump.)
#
# SECONDARY legs (corroborators -- the PRIMARY leg is strictly stronger, D19):
#   SANITY1 (structural, churn-proof): the cvar candidate pool (source-minus-runtime)
#           is NON-EMPTY. Replaces the original fixed `sb_qtvlist_url` canary, which
#           a dead-cvar cleanup PR REMOVED from source entirely (2026-06-05) -- proving
#           a hardcoded single-cvar canary is fragile. A structural check survives churn.
#   SANITY2 (the real extraction-regression guard, kept verbatim from front1-diff.sh:36):
#           known-LIVE cvars must NOT leak into the candidate pool. A broken extraction
#           (empty/garbage runtime set) leaks live cvars here and trips this leg.
#
# --emit-runtime-sets <dir>: write cmdlist + cvarlist to <dir>/rt-cmds.txt and
# <dir>/rt-cvars.txt for stage-2 consumption (S1).
#
# Usage:
#   version-pin-proxy.sh [dump-file] [--emit-runtime-sets <dir>]
#   dump-file defaults to entities-runtime-dump-e4a2c20a.txt beside this script.
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
F="${F:-$SCRIPT_DIR/entities-runtime-dump-e4a2c20a.txt}"

DB="docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tA"

# norm: strip CRLF (\r), ezQuake color codes (&cXXX), reset codes (&r).
# unchanged from front1-diff.sh -- same pattern, same rationale (CRLF Windows capture).
norm() { sed -E 's/\r//g; s/&c[0-9a-fA-F]{3}//g; s/&r//g'; }

# Scratch dir cleaned on exit -- avoids /tmp collisions across concurrent runs.
TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT

# ============================================================
# PRIMARY LEG: embedded commit banner -> versions.commit_sha (head) prefix check
# ============================================================
# Pattern: `ezQuake <ver> <build>~<hex>` (e.g. `ezQuake 3.7.0-dev 8108~e4a2c20ad`).
# The banner appears in the boot line and in the `version`-command output -- both
# carry the same sha; `head -1` takes the first.  No hardcoded line number -- grep the
# whole dump so this survives recapture or future format drift.
BANNER_SHA=$(norm < "$F" | grep -oE 'ezQuake [0-9]+\.[0-9]+\.[0-9]+(-dev)? [0-9]+~[0-9a-fA-F]+' | head -1 | grep -oE '[0-9a-fA-F]+$')

PRIMARY_PASS=0
if [[ -z "$BANNER_SHA" ]]; then
  echo "[FAIL] PRIMARY: no embedded ezQuake version banner found in dump"
else
  HEAD_SHA=$($DB -c "SELECT commit_sha FROM versions WHERE project='ezquake' AND version='head'" 2>/dev/null | norm | tr -d '[:space:]')
  if [[ -z "$HEAD_SHA" ]]; then
    echo "[FAIL] PRIMARY: versions.commit_sha for ezquake head not found"
  elif [[ "$HEAD_SHA" == "$BANNER_SHA"* ]]; then
    # BANNER_SHA is a prefix of HEAD_SHA -- exact self-certifying match (F7).
    echo "[PASS] PRIMARY: dump banner ~${BANNER_SHA} is prefix of versions head ${HEAD_SHA}"
    PRIMARY_PASS=1
  else
    echo "[FAIL] PRIMARY: dump banner ~${BANNER_SHA} does NOT match versions head ${HEAD_SHA}"
  fi
fi

# ============================================================
# Build runtime sets needed for the SECONDARY legs (and optional stage-2 export).
# MARKER-BASED extraction (was hardcoded line ranges 7-564 / 571-3272, brittle to the
# exact 3f9e724f capture). Keyed on the cvarlist/cmdlist section headers + their `----`
# footers, so it survives section reorder, preamble drift, and recapture. The norm() +
# field transforms are unchanged: cvars via `awk $NF` (handles the `u`/`s` userinfo/
# serverinfo flag-prefixed lines, e.g. `u  name`); commands are bare `[+-]?name`.
# ============================================================
norm < "$F" | awk '/^List of commands:/{c=1;next} /^----/{c=0} c' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | grep -E '^[+-]?[A-Za-z_][A-Za-z0-9_]*$' | sort -u > "$TMPD/rt-cmds.txt"
norm < "$F" | awk '/^List of cvars:/{c=1;next}    /^----/{c=0} c' | awk 'NF{print $NF}'                            | grep -E '^[A-Za-z_][A-Za-z0-9_]*$'    | sort -u > "$TMPD/rt-cvars.txt"

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
# SECONDARY legs -- corroborators (PRIMARY is strictly stronger, D19).
# ============================================================
SANITY1_PASS=0
SANITY2_PASS=0

# SANITY1 (structural): a correct extraction always leaves SOME source cvars unconfirmed
# by a single Linux runtime (renderer-inactive gl_*/r_*, Win-only in_di_*/sys_*, server-
# only sv_*, etc.). An EMPTY pool means the runtime set is a superset of source -- only
# possible if the extraction produced garbage that swamped source. Churn-proof vs the old
# fixed-cvar canary (sb_qtvlist_url, since removed from source).
if [[ -s "$TMPD/cand-cvar.txt" ]]; then
  echo "  [PASS] cvar candidate pool non-empty ($(wc -l < "$TMPD/cand-cvar.txt") cvars)"
  SANITY1_PASS=1
else
  echo "  [FAIL] cvar candidate pool EMPTY -- runtime superset of source (extraction regression?)"
fi

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
