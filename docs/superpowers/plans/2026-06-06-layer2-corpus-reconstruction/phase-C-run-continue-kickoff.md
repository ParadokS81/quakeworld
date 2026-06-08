# Phase C RUN -- continue kickoff (any subsequent batch)

`@` this into a FRESH executor terminal to run the next backfill batch(es). Reusable every RUN session after session 1 (the one-time kill-switch shakedown is done).

---

You are continuing the **Phase C backfill** (RUN, in progress) of the Layer 2 corpus reconstruction arc (`2026-06-06-layer2-corpus-reconstruction`). Use the **`arc-executor`** skill.

ARC ID: this arc fences Discord chat into THREADS and rewires `search_solved_issues`. Phase C fences + embeds + loads the corpus in idempotent (channel x ~1yr) batches, quota-paced. WRONG arc if you find yourself touching engine-entity extraction / KTX/MVDSV/QTV/QWFWD / community profiles / retrieval-time merge -- STOP.

Working dir: `/home/paradoks/projects/quakeworld` (qw-oracle at `apps/qw-oracle/`; run `bun` from there).

## State (orchestrator-confirmed, RUN session 1 shipped 2026-06-08)

- DB: 2163 threads = 1008 v1 probe (UNTOUCHED) + 1155 v2 (#helpdesk 2026+2020, #antilag 2026). 0 null. Re-confirm before your first write.
- **D7 = KEEP, binding** -- every batch fences WITH `resolution_status`, **single-pass** (no kill-switch; settled).
- **R14 fixed** -- chunk ids are year-scoped (`helpdesk-2020-001`). Do NOT reintroduce year-less ids.
- Cadence: **CONC=10** (run `nproc` first -- needs >=12 cores, else the harness `min(16,cores-2)` cap clips it to 8), **WAVE_PAUSE_MS=500**, single-pass.

## Required reading

1. `apps/qw-oracle/scripts/load-chat/backfill-ledger.md` -- pick the next undone (`[ ]`) batch, high-value first.
2. `<arc>/decisions.md` (D5 idempotency, D7 KEEP, D9 recipe) + `<arc>/review-findings.md` (R5, R8, R13, R14).
3. pipeline: `backfill-batch.ts` + `thread-loader-core.ts` + `wf-backfill-fence.js` + `fence-stats.ts`.

## Per-batch loop (1-2 batches, then halt)

1. (first run only) edit `wf-backfill-fence.js`: `CONC=10`, `WAVE_PAUSE_MS=500`. Confirm `nproc`>=12.
2. Pick next undone batch from the ledger. `bun scripts/load-chat/backfill-batch.ts prep '<#channel>' <year>`.
3. Fence via the `wf-backfill-fence.js` Workflow **WITH resolution_status** (single pass). `fence-stats.ts` for coverage. **WATCH `failures.fence` -- MUST be 0.** If the retry pass fires or it's >0, you brushed the throttle: report it and drop CONC back to 8.
4. `bun scripts/load-chat/backfill-batch.ts load '<#channel>' <year> <fence.json>`. Verify: re-run -> identical state (R5); 0 null; year-scoped keys; a retrieval probe returns the batch.
5. Update `backfill-ledger.md` (`[x]` + HONEST counts), commit per batch, halt with the structured report.

## GATED / special batches -- coordinate with the orchestrator

- **#helpdesk 2021 = the SUPERSEDE batch** (full-year v2 over the v1 probe slice). Do NOT run it silently -- it gets an orchestrator cold-verify of the v1->v2 transition. Flag before + after.
- First **#quakeworld dense year** (2017/2018/2020) = cap-forced 1500-msg chunks (R13 first-at-scale). First **New-Year straddle**. Flag these for cold-verify too.

## Guards (do not drift)

Sonnet / CONC=10 / 500ms waves / 8s recovery+retry / **HONEST success+fail counts** (the `.catch(()=>null)` is the counted signal, never silent) / args-as-JSON-string (D9/R7). Chunks <256KB (R13). DISTINCT on junction counts (R8). Idempotent DELETE-scope-then-INSERT (D5/R5). `load-threads.ts` is OFF-LIMITS -- `backfill-batch.ts` only. Architecture locked (D1).

## Halt + report (structured)

Batches done / remaining; coverage per batch; failures + retry results; DB state (v1 remaining vs v2 added); CONC outcome (`failures.fence`, wall-clock). 1-2 batches/session, then halt -- do NOT run the whole corpus at once.
