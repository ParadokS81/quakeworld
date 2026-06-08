# Layer 2 corpus reconstruction -- orchestrator resume (mid-RUN)

**Updated:** 2026-06-08 (orchestrator session that drove RUN session 1: 2 real batches + the R14 fix).
**For:** a fresh ORCHESTRATOR terminal continuing the Phase C backfill. You coordinate + verify; you do NOT run batch code -- that's the executor terminal via `phase-C-run-continue-kickoff.md`.
**Arc:** `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/`

## Where things are

RUN in progress, paced 1-2 batches/session. **DB: 2163 threads** = 1008 v1 probe (Feb-Mar 2021: #helpdesk 374 + #quakeworld 634, UNTOUCHED) + 1155 v2 (#helpdesk 2026=373, #helpdesk 2020=715, #antilag 2026=67). 0 null embeds; all keys unique + year-scoped.

- **D7 RESOLVED -> KEEP, binding** -- resolution_status rides every batch (decisions.md D7 amendment 2026-06-08). Single-pass from here; the kill-switch is done.
- **R14 found + fixed in-session** -- year-less chunk ids collided across same-channel batches (the load DELETE is year-scoped, the key was not = R5 violation). Fixed by year-scoped chunk id; both loaded v2 batches re-keyed by reload (no re-fence). review-findings.md R14.
- **Cadence tuned:** CONC proven clean at 8 (0 failures, ~20% faster/chunk). **CONC=10 approved next** (confirm `nproc`>=12 or it caps at 8 via the harness `min(16,cores-2)` limit). WAVE_PAUSE=500.
- **Remaining: 32 batches** -- #helpdesk 2021-2025, then #quakeworld / #dev-corner / #antilag tails. `backfill-ledger.md` is the live tracker (`[x]` = done).

## Reads required (in order)

1. `apps/qw-oracle/scripts/load-chat/backfill-ledger.md` -- live batch tracker + per-batch validation evidence.
2. `<arc>/decisions.md` -- esp. D7 (RESOLVED->KEEP amendment), D9 (cost/recipe amendment), D5 (version-agnostic supersede amendment).
3. `<arc>/review-findings.md` -- R5, R13, **R14** (the keying bug + the "two-batches-same-channel" validation probe to add to the runbook).
4. `<arc>/phase-C-run-continue-kickoff.md` -- the executor prompt for the next batch.
5. pipeline: `backfill-batch.ts` + `thread-loader-core.ts` + `wf-backfill-fence.js` + `fence-stats.ts`.

## Critical rules (mid-RUN)

- **You verify, you don't run.** Dispatch a fresh executor terminal (the continue-kickoff). Cold-verify each batch at its boundary against the **dev DB** (NOT the `mcp__qw-oracle__*` tools -- those hit pre-rewire prod).
- **Cold-verify the at-scale FIRSTS the first time each fires** (the R14 lesson: prep/single-batch validation cannot prove cross-batch behavior):
  - **#helpdesk 2021 = the supersede** -- after it loads, confirm 0 v1 #helpdesk rows survive in [2021,2022) and #quakeworld v1 stays 634.
  - **First New-Year straddle** -- a Dec->Jan conversation splits into 2 threads, one per year, each covered by exactly one batch.
  - **First cap-forced 1500-msg #quakeworld chunk** (dense years 2017/2018/2020) -- coverage holds + chunk <256KB (R13).
- Per-batch cold-verify: total threads, v1 untouched, 0 null, distinct keys = count (no collision), 0 orphans, year-scoped keys, coverage logged.
- **Architecture locked (D1).** Single-pass + resolution_status passenger. No retrieval-merge / summary-embed / lazy-resolve / author-ranking -- a phase wandering there is reopening settled work; STOP.
- `load-threads.ts` is code-guarded (refuses post-supersede). RUN uses `backfill-batch.ts` ONLY.

## First three actions

1. Re-confirm DB baseline unchanged: 2163 / 1008 v1 / 1155 v2 / 0 null (one SQL).
2. Dispatch next batch: operator opens a fresh executor terminal, `@<arc>/phase-C-run-continue-kickoff.md`. Next undone batch per ledger (high-value first). If it's #helpdesk 2021, that's the supersede -- you cold-verify after.
3. When the executor halts, cold-verify its claims against the dev DB before accepting (do not trust "PASS"). Capture cross-phase memory yourself (decisions amendments, new R-findings); the executor owns the ledger.

## Downstream (NOT grind blockers)

- **Phase D** (RRF threshold recalibration) -- post-backfill; gates PUBLIC deploy; the "weak" match_quality labels are this. Does not block batches.
- **Prod deploy** -- out of arc scope; rewired tool + dev->prod data sync on a post-arc deploy, gated on Phase D.
- **buckets-E** + the FAQ-discovery clustering -- post-backfill offline analysis (vector-cluster threads -> rank by frequency x unresolved -> L3 authoring priority; resolution_status is the signal/noise filter, ~27% of #helpdesk is informational banter).
- **Validation runbook:** add the "two batches, same channel" idempotency probe (R14).

## When in doubt

Architecture is locked in spec + decisions.md -- settled. The operator is the intent-gate (backfill is quota-paced at their pace); you run the technical phase-boundary verification. One question at a time, plain-English consequences (`feedback_operator_not_technical_review_gate`, `feedback_one_question_at_a_time`).
