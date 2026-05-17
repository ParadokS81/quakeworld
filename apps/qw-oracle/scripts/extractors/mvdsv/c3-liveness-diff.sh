#!/usr/bin/env bash
# c3-liveness-diff.sh -- C3 runtime-dead SUSPECT-POOL detector (qw-oracle arc
# 2026-05-16-ktx-mvdsv-l1-describe-fill, Phase 0 Task 2).
#
# Sibling to diff-runtime.sh. Lifts diff-runtime.sh's proven dump-parser
# (header/footer gating, SERVERINFO 1-char-flag-column decode, CRLF strip,
# lowercase, LC_ALL=C sort) and changes exactly three things vs that tool,
# each marked "# WHY:" below:
#   (a) DB side: Postgres at the SAME fresh re-extracted commit, source-backing
#       via *_versions.source_file IS NOT NULL (NOT sqlite3 / source_state).
#   (b) Scope: union(ktx,mvdsv) x (cvar,command) -- four per-(engine,type)
#       sections (NOT mvdsv-only).
#   (c) Discount: ^__k_ls only (NOT ktx-progs-prefixes.txt / -allowlist.txt,
#       which would wrongly strip legitimate KTX k_* cvars).
#
# Suspects = L1-present (source-backed) AND dump-absent. A SUSPECT POOL, never
# a verdict: it does NOT classify genuine-dead vs build-excluded -- that needs
# the libclang call-graph and is the parked arc (F-C3b). Detect + route only.
#
# NON-DIAGNOSTIC leg (Executor correction 2026-05-17, review-findings F-C3c):
# the ktx/command leg is EXCLUDED from the suspect pool. mvdsv `cmdlist`
# enumerates only engine-side Cmd_AddCommand; KTX commands dispatch via
# mod-side `cmd_t cmds[]` tables, so the oracle is structurally blind to that
# surface (the raw 357 difference is LIVE core commands -- 1on1/ready/yes).
# It is printed for transparency, NOT routed to D6. Genuine pool = ktx/cvar +
# mvdsv/cvar + mvdsv/command only.
#
# Output: per-(engine,type) suspect name-lists + counts, then the inverse
# (dump-present / L1-absent) labelled informational membership-drift only.
# Exit code is always 0; this is a diagnostic, not a CI gate.
#
# Determinism: every name list is CRLF-normalized, case-folded, LC_ALL=C
# sorted on BOTH sides; re-running yields byte-identical output.

set -euo pipefail
export LC_ALL=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES="$HERE/validation-fixtures"

# Primary oracle = the self-built same-commit dump (source extract + runtime
# oracle + describe-fill substrate are ONE forward build; contemporaneity is
# structural, no caveat). The retained ciscon production dump stays a
# SECONDARY cross-check only (see c3-suspect-pool.md appendix), not used here.
LOG="${C3_LOG:-$FIXTURES/selfbuilt-devhead-2026-05-17.log}"

PSQL=(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc)

if [ ! -f "$LOG" ]; then
  echo "FATAL: runtime dump not found at $LOG" >&2
  exit 1
fi

# --- Lifted dump-parser (diff-runtime.sh step 1, decode logic preserved) ----
# diff-runtime.sh assumed the ciscon dump's 2-token "[YYYY-MM-DD HH:MM:SS]"
# prefix and read the name at $3 (or $4 behind the 1-char SERVERINFO flag).
# The self-built mvdsv emits a DIFFERENT console-log timestamp shape:
#   "[Sun May 17, 16:58:23 2026].[0] <name>"   (5-token prefix + ".[loglvl]")
# vs the ciscon dump's:
#   "[2026-04-27 19:02:40]   <name>"           (2-token prefix, CRLF)
# Reading a hard-coded $3 would extract a timestamp fragment on the self-built
# dump and produce a garbage suspect pool -- a shipped C3 lie. So the proven
# decode (header/footer gating, the %c %s %s SERVERINFO 1-char-flag-column
# rule, CRLF strip, the "------------" separator skip) is preserved VERBATIM
# in substance, but the fixed-position timestamp assumption is replaced by a
# format-agnostic leading-"[...]"-bracket strip that handles BOTH dump shapes.
# This is a faithful realization of the lift's intent (reuse the proven
# decode), not a new parser; only the timestamp-prefix removal generalized.
parse_dump() {
  # $1 = log path, $2 = header regex, $3 = footer regex
  awk -v hdr="$2" -v ftr="$3" '
    $0 ~ hdr { flag=1; next }
    flag && $0 ~ ftr { flag=0 }
    flag {
      line = $0
      sub(/\r$/, "", line)                       # CRLF (ciscon dump)
      # Strip the leading bracketed log prefix, format-agnostic:
      #   "[2026-04-27 19:02:40] "         -> ""   (ciscon)
      #   "[Sun May 17, 16:58:23 2026].[0] " -> "" (self-built)
      sub(/^\[[^]]*\](\.\[[0-9]+\])?[[:space:]]*/, "", line)
      n = split(line, f, /[[:space:]]+/)
      if (n < 1) next
      name = f[1]
      # %c %s %s SERVERINFO body: a 1-char flag column ("s" etc.) precedes
      # the real name -- same rule as diff-runtime.sh, applied post-strip.
      if (length(name) == 1 && n >= 2) name = f[2]
      if (name == "" || name ~ /^-+$/) next      # skip "------------" sep
      print name
    }
  ' "$1" | tr "[:upper:]" "[:lower:]" | LC_ALL=C sort -u
}

# --- DB side (CHANGE (a): Postgres, *_versions.source_file IS NOT NULL) -----
# WHY (a): diff-runtime.sh read sqlite3 data/knowledge.db with
#   source_state='source_backed'. The SQLite era ended at Arc 1; the store is
#   Postgres. AND per reference_qw_oracle_transition_log_artifact the
#   source_state / source_state_transitions signal is hardcoded branch
#   literals, NOT a reliable source-backing signal. The correct signal is the
#   per-type *_versions.source_file IS NOT NULL join (cvar -> cvar_versions,
#   command -> command_versions), scoped to the freshly re-extracted commit.
db_names() {
  # $1 = project (ktx|mvdsv), $2 = type (cvar|command)
  local proj="$1" typ="$2" vtable
  case "$typ" in
    cvar)    vtable="cvar_versions" ;;
    command) vtable="command_versions" ;;
    *) echo "FATAL: unknown type $typ" >&2; exit 1 ;;
  esac
  "${PSQL[@]}" \
    "SELECT e.name FROM entities e JOIN ${vtable} cv ON cv.entity_id = e.id \
     WHERE e.project = '${proj}' AND e.type = '${typ}' AND cv.source_file IS NOT NULL" \
    | tr "[:upper:]" "[:lower:]" | discount_klsfamily | LC_ALL=C sort -u
}

# CHANGE (c): discount the KTX __k_ls* level-shot index cvar family.
# WHY (c): __k_ls (src/world.c:1036) plus the 180 runtime-generated
#   __k_ls_e1_* level-shot index cvars are KTX internal level-shot
#   bookkeeping, not admin-facing knobs. The discount pattern is ^__k_ls
#   ONLY -- NOT ktx-progs-prefixes.txt / ktx-progs-allowlist.txt, which match
#   broad k_* / qwm_* prefixes and would wrongly strip legitimate KTX k_*
#   cvars that ARE in the describe-fill scope (the phase MD is explicit).
#
#   Intent-over-literal note (flagged in the executor report, NOT a silent
#   override): the contract's literal text says "grep -Ev '^__k_ls' on the
#   runtime side", but the SAME contract's acceptance probe + Recovery
#   rationale fix the binding intent as "__k_ls* never appears as a suspect".
#   A runtime-only discount cannot satisfy that: the base __k_ls IS a
#   source-backed L1 cvar (world.c:1036), so a runtime-only strip leaves it
#   L1-present / dump-absent -> it becomes a spurious suspect, contradicting
#   the stated intent. Verified live: __k_ls is the SOLE ^__k_ls L1 row
#   across ktx+mvdsv cvar+command (count=1), so a symmetric discount removes
#   exactly the index family and hides ZERO other genuine suspects (no C1
#   importance-cut: nothing real is dropped). The discount is therefore
#   applied symmetrically to BOTH the runtime and the L1/DB side, faithfully
#   realizing the contract's intent rather than its literal one-sided wording.
discount_klsfamily() {
  grep -Ev '^__k_ls' || true
}

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

emit_section() {
  # $1 = project, $2 = type
  local proj="$1" typ="$2"
  local hdr ftr rt db
  case "$typ" in
    cvar)    hdr="List of cvars:";    ftr='[0-9]+/[0-9]+ variables' ;;
    command) hdr="List of commands:"; ftr='[0-9]+/[0-9]+ commands'  ;;
  esac
  rt="$TMP_DIR/${proj}-${typ}-rt.txt"
  db="$TMP_DIR/${proj}-${typ}-db.txt"

  # Runtime side: one mvdsv+ktx process enumerates BOTH engines' registrations
  # (KTX k_* register into MVDSV's cvar system), so the same dump body feeds
  # every per-(engine,type) section; the engine split is on the DB side.
  parse_dump "$LOG" "$hdr" "$ftr" | discount_klsfamily | LC_ALL=C sort -u > "$rt"
  db_names "$proj" "$typ" > "$db"

  local rt_n db_n suspect_n drift_n inter_n
  rt_n=$(wc -l < "$rt")
  db_n=$(wc -l < "$db")
  suspect_n=$(comm -23 "$db" "$rt" | wc -l)   # L1-present, dump-absent
  drift_n=$(comm -13 "$db" "$rt" | wc -l)     # dump-present, L1-absent
  inter_n=$(comm -12 "$db" "$rt" | wc -l)

  # NON-DIAGNOSTIC leg: mvdsv `cmdlist` enumerates only engine-side
  # Cmd_AddCommand; KTX commands are struct-literal `cmd_t cmds[]` tables
  # iterated via KTX mod-side dispatch (extractor docstring PATTERN 4;
  # Cmd_AddCommand commented out in KTX). The oracle is structurally blind
  # to this surface -- "absent" is the trivial default for ~100% of KTX
  # commands, ZERO liveness signal (the raw diff is LIVE core commands:
  # 1on1/2on2/ready/yes/+scores). Excluded from the C3 suspect pool;
  # printed for transparency only, NOT routed to D6. (Executor correction
  # 2026-05-17; review-findings F-C3c. Distinct from F-C3b: no valid
  # suspects to classify, not classification-deferred.)
  if [ "$proj" = "ktx" ] && [ "$typ" = "command" ]; then
    echo "=================================================================="
    echo "NON-DIAGNOSTIC SECTION: ktx / command (EXCLUDED from suspect pool)"
    echo "=================================================================="
    echo "Runtime (self-built dump, post ^__k_ls discount): ${rt_n}"
    echo "L1 source-backed (${proj} ${typ}, *_versions.source_file NOT NULL): ${db_n}"
    echo "cmdlist-intersection (coincidental name collisions): ${inter_n}"
    echo "RAW difference (NOT suspects -- oracle structurally blind here): ${suspect_n}"
    echo ""
    echo "--- ${proj} ${typ} RAW difference -- NON-DIAGNOSTIC, NOT a suspect list, do NOT dead-stamp ---"
    comm -23 "$db" "$rt"
    echo ""
    echo "--- ${proj} ${typ} INVERSE (dump-present / L1-absent) -- informational membership-drift ONLY ---"
    comm -13 "$db" "$rt"
    echo ""
    return
  fi

  echo "=================================================================="
  echo "SUSPECT SECTION: ${proj} / ${typ}"
  echo "=================================================================="
  echo "Runtime (self-built dump, post ^__k_ls discount): ${rt_n}"
  echo "L1 source-backed (${proj} ${typ}, *_versions.source_file NOT NULL): ${db_n}"
  echo "Intersection (alive + source-backed): ${inter_n}"
  echo "SUSPECTS (L1-present AND dump-absent): ${suspect_n}"
  echo ""
  echo "--- ${proj} ${typ} SUSPECTS (registered in L1 source, absent from running build) ---"
  comm -23 "$db" "$rt"
  echo ""
  echo "--- ${proj} ${typ} INVERSE (dump-present / L1-absent) -- informational membership-drift ONLY, NOT suspects, NOT classified ---"
  comm -13 "$db" "$rt"
  echo ""
}

echo "C3 LIVENESS SUSPECT-POOL DIFF"
echo "Primary oracle: $LOG"
echo "DB: qw-oracle-postgres-dev (Postgres), source-backing = *_versions.source_file IS NOT NULL"
echo "Scope: union(ktx,mvdsv) x (cvar,command). Discount: ^__k_ls only."
echo "A SUSPECT POOL, never a verdict (F-C3b: genuine-dead vs build-excluded classification is the parked libclang arc)."
echo "ktx/command leg is NON-DIAGNOSTIC and EXCLUDED (oracle structurally blind; Executor correction 2026-05-17, F-C3c). Genuine pool = ktx/cvar + mvdsv/cvar + mvdsv/command."
echo ""

for proj in ktx mvdsv; do
  for typ in cvar command; do
    emit_section "$proj" "$typ"
  done
done
