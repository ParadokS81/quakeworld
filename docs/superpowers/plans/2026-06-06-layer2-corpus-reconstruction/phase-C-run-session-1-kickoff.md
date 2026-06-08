# Phase C RUN -- Session 1 kickoff (reset day, #helpdesk start)

Paste-as-prompt (or `@` this file) into a FRESH terminal. Drives the first real backfill session.

---

You are driving the **reset-day RUN** of Phase C (batched backfill) of the Layer 2 corpus reconstruction arc (`2026-06-06-layer2-corpus-reconstruction`). Use the **`arc-executor`** skill.

ARC IDENTIFICATION -- confirm before touching anything. This arc fences Discord chat into THREADS and rewires `search_solved_issues`. Phase C fences + embeds + loads the corpus in idempotent (channel x ~1yr) batches, paced to quota. You are in the WRONG arc if you find yourself touching engine-entity extraction, KTX/MVDSV/QTV/QWFWD, community profiles, or being asked to merge threads at retrieval time. If so, STOP.

Working directory: `/home/paradoks/projects/quakeworld` (qw-oracle at `apps/qw-oracle/`; run `bun` scripts from there).

## Reset-day state (orchestrator-confirmed 2026-06-08)

- **Phase A gate GREEN, operator-formalized 2026-06-08** -- precondition MET (README + arc-history). Proceed.
- **Phase B cap = 1500 / 12h gap** (D9 amendment). ~3,796 agents / 35 batches total (`backfill-ledger.md`).
- **DB baseline (re-confirmed today):** `chat_threads` = 1008 v1 (#helpdesk 374 + #quakeworld 634, Feb-Mar 2021 probe) + 67 v2 (#antilag-2026), 0 null embeddings. Re-confirm before your first write.
- **`load-threads.ts` is now code-guarded** (refuses if non-v1 rows sit in the 2021 #helpdesk/#quakeworld scope; `--force` override). The RUN uses **`backfill-batch.ts` ONLY** -- do NOT run `load-threads.ts`.

## Required reading (all, before executing)

1. `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-C-executor-prompt.md` -- canonical RUN prompt (rules, footgun guard, kill-switch).
2. `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md` -- D5 idempotency, **D7 resolution_status kill-switch**, D9 Workflow recipe + cost amendment.
3. `apps/qw-oracle/scripts/load-chat/backfill-ledger.md` -- the playbook (35 batches, exact counts, the 3 guards, prep validation evidence).
4. `apps/qw-oracle/scripts/load-chat/phase-C-batched-backfill.md` (spec) + `backfill-batch.ts` + `thread-loader-core.ts` + `wf-backfill-fence.js` + `fence-stats.ts` -- the pipeline.

## This session -- start with #helpdesk (highest yield); batch-1 = the binding D7 kill-switch shakedown

1. **Trial first (D9):** run a **1-agent** fence via the `wf-backfill-fence.js` Workflow to confirm the Sonnet/conc-5 config clears the shared throttle post-reset. Re-confirm the DB baseline above.
2. **Batch-1 = `#helpdesk` 2026** (~5,400 chat/link msgs -> ~61 chunks: smallest #helpdesk batch, recent typical support Q&A). This is BOTH the D7 binding gate AND the first at-scale pipeline run:
   - `bun scripts/load-chat/backfill-batch.ts prep '#helpdesk' 2026`
   - Fence the chunks **both ways** via the `wf-backfill-fence.js` Workflow (chunkDir + chunkIds from the manifest): once WITHOUT `resolution_status`, once WITH (`withResolution: true`).
   - Run `fence-stats.ts` on both -> compare index-hallucination + coverage. **KEEP** the passenger only if WITH does not perturb fencing (hallucination stays 0%, coverage holds vs WITHOUT). Record the keep/drop decision + metric evidence in `backfill-ledger.md` -- this is the binding gate that OVERRIDES the #antilag provisional KEEP (D7).
   - `bun scripts/load-chat/backfill-batch.ts load '#helpdesk' 2026 <chosen-fence-output.json>`
   - Verify: re-run the load -> identical state (idempotency R5: same thread count, same `thread_key` set, 0 null emb); coverage logged; `search_solved_issues` returns #helpdesk-2026 threads on a probe query.
3. **If quota allows, one more #helpdesk batch** single-pass with the chosen `resolution_status` setting (e.g. 2025 ~179 chunks, or 2020 ~97). Trial-then-batch; pace per D9.
4. **2021 note:** `#helpdesk` 2021 is a full-year v2 fence that SUPERSEDES the v1 #helpdesk probe slice -- fine to run, but it is the real supersede: afterward verify NO v1 #helpdesk rows survive in `[2021,2022)`, and the no-`load-threads.ts` footgun rule applies. Optional this session.

## Guards (do not drift)

- Workflow fence = **Sonnet / conc-5 / paced waves / 8s recovery+retry / HONEST success+fail counts** (the `.catch(()=>null)` is the counted failure signal, never a silent swallow) / args-as-JSON-string. (D9/R7)
- Chunks **<256KB (~2,700 msgs)**; cap 1500 is safe (R13). `backfill-batch` enforces the write-time guard -- if it throws on size, lower the cap, do not bypass.
- Idempotency: DELETE-scope-then-INSERT, predicate matches `thread_key` (D5/R5). DISTINCT on junction counts (R8).
- Per-batch coverage via `fence-stats`; coarse content drops ~1-4% -- **log it, do not hide it**.
- Update `backfill-ledger.md` (`[x]` + honest counts) and **commit per batch**.

## Halt + report (structured)

Batches done / remaining; the **`resolution_status` keep/drop decision + evidence**; coverage per batch; failures + retry results; DB state (v1 remaining vs v2 added). This phase spans many sessions -- run **1-2 batches, then halt**. Do NOT run the whole corpus at once.
