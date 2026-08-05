#!/usr/bin/env bash
# Phase C per-batch driver -- the backfill-ledger.md verification ritual as one
# command, with every gate a hard halt.
#
#   scripts/load-chat/run-backfill-batch.sh "#quakeworld" 2017 [CONC]
#
# Steps (halts on any failure, never proceeds past a bad gate):
#   1. prep            -- chunk the (channel, year) range, verify vs the ledger
#   2. probe           -- fence the 3 LARGEST chunks first. A batch whose worst
#                         chunk fails is a 4-hour failure discovered in 10 min.
#   3. fence --resume  -- only chunks not already present carry cost
#   4. completeness    -- failures.fence MUST be 0. fence-stats measures only
#                         chunks PRESENT, so a missing chunk costs no coverage
#                         and would sail through step 5 (#quakeworld-2017,
#                         2026-08-05: 38/72 chunks, gate-clean).
#   5. stats gate      -- index-hallucination 0%, coverage >= 98%
#   6. load            -- + idempotent re-run, thread_key md5 must be identical
#
# Retrieval probe (step 7 of the ledger ritual) stays manual: its queries are
# per-batch and want a human read of the hits.
set -uo pipefail

CHANNEL="${1:?usage: run-backfill-batch.sh <channel> <year> [conc]}"
YEAR="${2:?usage: run-backfill-batch.sh <channel> <year> [conc]}"
CONC="${3:-10}"
cd "$(dirname "$0")/../.." || exit 1

SLUG="${CHANNEL#\#}"
DIR="scripts/calibration/scratch/backfill/${SLUG}-${YEAR}"
OUT="${DIR}/fence-external-deepseek-v4-flash.json"


die() { echo ""; echo "!! HALT [$CHANNEL $YEAR]: $*" >&2; exit 1; }
step() { echo ""; echo "=== [$CHANNEL $YEAR] $* ==="; }

step "1/6 prep"
bun scripts/load-chat/backfill-batch.ts prep "$CHANNEL" "$YEAR" || die "prep failed"

step "2/6 worst-case pre-flight"
bun scripts/load-chat/fence-external.ts probe "$CHANNEL" "$YEAR" --top 3 \
  || die "largest chunks failed the pre-flight -- fix ceilings before spending a batch"

step "3/6 fence (conc=$CONC, resuming any prior partial)"
bun scripts/load-chat/fence-external.ts fence "$CHANNEL" "$YEAR" --conc "$CONC" --resume
# NB: non-zero exit here means incomplete; step 4 reports precisely which.

step "4/6 completeness gate"
EXPECTED=$(jq -r '.chunkIds|length' "${DIR}/manifest.json")
GOT=$(jq -r '.fenced|length' "$OUT")
MISSING=$(jq -r '.failures.fence' "$OUT")
echo "chunks fenced: $GOT / $EXPECTED  (failures=$MISSING)"
[ "$GOT" = "$EXPECTED" ] || die "$((EXPECTED - GOT)) chunk(s) missing -- re-run to resume the gaps, do NOT load"
[ "$MISSING" = "0" ] || die "failures.fence=$MISSING"

step "5/6 stats gate"
bun scripts/load-chat/fence-stats.ts "$CHANNEL" "$YEAR" "$OUT" | tee /tmp/fence-stats-$$.json
HALLUC=$(jq -r '.indexHallucinationPct' /tmp/fence-stats-$$.json)
COVER=$(jq -r '.coveragePct' /tmp/fence-stats-$$.json)
rm -f /tmp/fence-stats-$$.json
awk -v h="$HALLUC" 'BEGIN{exit !(h==0)}' || die "index-hallucination ${HALLUC}% (must be 0)"
awk -v c="$COVER" 'BEGIN{exit !(c>=98)}' || die "coverage ${COVER}% below the 98% band"
echo "gate PASS: hallucination=${HALLUC}% coverage=${COVER}%"

step "6/6 load + idempotency"
bun scripts/load-chat/backfill-batch.ts load "$CHANNEL" "$YEAR" "$OUT" || die "load failed"
bun scripts/load-chat/verify-batch.ts "$CHANNEL" "$YEAR" > /tmp/v1-$$.json || die "verify failed"
MD5_1=$(jq -r '.threadKeyMd5' /tmp/v1-$$.json)
TOT_1=$(jq -r '.GLOBAL.total' /tmp/v1-$$.json)
echo "first load:  threads=$(jq -r '.threads' /tmp/v1-$$.json) md5=$MD5_1 global=$TOT_1"

echo "-- re-running load (R5 idempotency) --"
bun scripts/load-chat/backfill-batch.ts load "$CHANNEL" "$YEAR" "$OUT" || die "idempotent re-load failed"
bun scripts/load-chat/verify-batch.ts "$CHANNEL" "$YEAR" > /tmp/v2-$$.json || die "verify failed"
MD5_2=$(jq -r '.threadKeyMd5' /tmp/v2-$$.json)
TOT_2=$(jq -r '.GLOBAL.total' /tmp/v2-$$.json)
echo "second load: threads=$(jq -r '.threads' /tmp/v2-$$.json) md5=$MD5_2 global=$TOT_2"

[ "$MD5_1" = "$MD5_2" ] || die "R5 VIOLATION: thread_key set changed across identical loads"
[ "$TOT_1" = "$TOT_2" ] || die "R5 VIOLATION: global thread count moved ($TOT_1 -> $TOT_2) -- duplication"

NULLEMB=$(jq -r '.GLOBAL.nullEmb' /tmp/v2-$$.json)
BADKEY=$(jq -r '.GLOBAL.nonYearScopedV2Keys' /tmp/v2-$$.json)
[ "$NULLEMB" = "0" ] || die "$NULLEMB null embeddings"
[ "$BADKEY" = "0" ] || die "$BADKEY non-year-scoped v2 thread_keys (R14)"

echo ""
echo "=== [$CHANNEL $YEAR] ALL GATES PASS ==="
jq -c '{batch,threads,junctionRows,distinctMsgs,r8MultiThreadMsgs,resolution,GLOBAL:{total:.GLOBAL.total,byVersion:.GLOBAL.byVersion}}' /tmp/v2-$$.json
echo "NEXT: retrieval probe + ledger entry (both manual)"
rm -f /tmp/v1-$$.json /tmp/v2-$$.json
