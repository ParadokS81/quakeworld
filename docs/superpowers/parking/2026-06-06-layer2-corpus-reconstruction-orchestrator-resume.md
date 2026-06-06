# Layer 2 corpus reconstruction -- orchestrator resume handoff (mid-arc, pre-RUN)

**For:** a fresh terminal -- either (a) a cold review of what's shipped + the loose ends, or (b) driving the reset-day Phase C RUN. Written at a 2-day quota-pause boundary.
**Created:** 2026-06-06 (orchestrator session that shipped A + B + C-PREP).
**Arc:** `docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/`

## Where things are

A + B + C-PREP shipped and orchestrator-verified (not trusted -- each re-checked against live DB/source at its boundary). C RUN is gated on quota reset (~2026-06-08). buckets-E + D are downstream.

- **Phase A (shipped):** migration `021_layer2_threads.sql` (chat_threads + thread_messages); `search_solved_issues` rewired to hybrid RRF over threads (mirrors search_entities); 1,008 `fence-sonnet-v1` threads (Feb-Mar 2021, #helpdesk + #quakeworld). Gate GREEN (orchestrator-assessed gate-A-compare 24/24-vs-9/24 + a live tire-kick of 11 real queries). Golden state: 1008 / 0-null-emb / 1008 distinct thread_key.
- **Phase B (shipped):** lull gap **12h** (locked) + cap **1500** (ratified -- cleaner partition than 2500) -> **~3,796 fence agents**. D9 cost model corrected ~25x (was ~650-750; the gap, not the cap, was the lever). R13: the fence agent's 256KB Read cap (~2,700 msgs) is the real chunk ceiling, below Sonnet's context.
- **Phase C PREP (shipped):** pipeline built -- `thread-loader-core.ts` (shared staging + idempotent version-agnostic-range-delete), `load-threads.ts` (thin Phase A wrapper over the core), `backfill-batch.ts` (count/prep/load, 12h/1500, 256KB guard, live batch-64 embed), `wf-backfill-fence.js` (v2 fence, optional resolution_status), `fence-stats.ts`, `backfill-ledger.md`. Validated end-to-end on #antilag-2026: idempotency PASS, supersede PASS (synthetic v1 row cleared), straddle PASS (structural), kill-switch KEEP (provisional). DB now: 1008 v1 + 67 v2 (#antilag-2026), 0 null emb.
- **Phase C RUN (pending reset):** 34 remaining batches / ~3,796 agents. `backfill-ledger.md` is the playbook.

## Reads required (in order)

1. `<arc>/README.md` -- execution-status note at the top.
2. `<arc>/decisions.md` -- esp. the **D9 amendment** (gap/cap/cost + cap-sweep result) and the **D5 amendment** (version-agnostic supersede). Architecture is locked (D1).
3. `apps/qw-oracle/scripts/load-chat/backfill-ledger.md` -- the reset-day RUN playbook (35 batches, exact counts, the 3 guards, validation evidence).
4. `<arc>/phase-C-executor-prompt.md` -- RUN-mode prompt (carries the load-threads footgun guard).
5. `apps/qw-oracle/scripts/load-chat/thread-loader-core.ts` + `backfill-batch.ts` -- the pipeline.
6. `docs/superpowers/parking/2026-06-06-layer2-cap-sweep-results.md` -- Phase B's evidence.

## Critical rules (reset-day RUN)

- **Quota-paced:** 1-2 batches/session, trial 1 agent first (D9). Biggest single batch = #helpdesk 2024 (193 agents) < the 251-agent wave proven clean in calibration.
- **Re-confirm the resolution_status kill-switch** (with-vs-without) on batch-1 (#helpdesk or #quakeworld) BEFORE it rides the whole backfill (D7). The #antilag KEEP is provisional (atypical channel).
- **Do NOT run `load-threads.ts` after a 2021 v2 batch supersedes A's v1** -- its range-delete would regress 2021 to v1 probe threads. RUN uses `backfill-batch.ts` only.
- **Check `fence-stats` coverage per batch** -- coarse/debate content drops ~1-4% of messages (logged, not silent).
- **Architecture locked (D1):** no retrieval-time merge, no embedded summary, no query-time lazy-resolve, no author-authority ranking. A phase wandering there is reopening settled work -- STOP.

## First three actions (reset-day RUN)

1. Verify quota reset; confirm DB state unchanged (1008 v1 + 67 v2, 0 null emb).
2. **Batch-1 = the kill-switch shakedown:** pick a small typical high-value batch (e.g. #helpdesk-2026, 61 agents). Fence it with + without resolution_status; compare via `fence-stats` (index-hallucination + coverage); decide keep/drop and record in the ledger. This is also the first at-scale run of the C pipeline -- watch coverage + the recovery/retry pass.
3. Fan out the rest 1-2/session per the ledger (high-value channels first). The 2021 batches (#helpdesk-2021, #quakeworld-2021, #dev-corner-2021, #antilag-2021) are full-year v2 fences that supersede A's v1 -- the real supersede happens here; verify no v1 rows survive in those ranges afterward.

## Loose ends (the "look at these" list)

1. **resolution_status keep is PROVISIONAL** -- binding D7 gate is reset batch-1 on a high-value channel. (Open decision.)
2. **At-scale firsts** (first live on reset, all low-risk): real 1008-row 2021 supersede; real New-Year straddle; cap-forced 1500-chunks through the C pipeline; stale-embed retry path; fence at ~150 agents. Batch-1 is the shakedown.
3. **Per-batch coverage** -- `fence-stats` per batch; coarse content (#antilag-style debates) drops ~1-4%. Accept or investigate per batch.
4. **Provisional RRF thresholds (R10)** -- `match_quality` reads mostly "weak"; Phase D recalibrates. **PUBLIC deploy is gated on Phase D** (until then a consuming LLM under-trusts good hits via the orientation honest-failure rule).
5. **Typecheck scope** -- `load-chat/` now in tsconfig (fixed a latent bigint->string annotation). `load-knowledge/` + `load-concepts/` likely have the same blind spot -- repo hygiene, not an arc risk.
6. **load-threads.ts footgun** -- guarded in ledger + RUN prompt; don't run it post-2021-supersede.

## After C RUN

- **buckets-E** (FAQ-substrate enrichment) -- 9-bucket labeling, re-runnable Workflow pass over the fixed threads; the FAQ-discovery query is the L3 authoring-priority payoff. Gated on C complete.
- **Phase D** (RRF threshold recalibration) -- REQUIRED before public deploy. Trigger: enough corpus backfilled.
- **Public deploy** -- out of arc scope; oracle.slipgate.me picks up the rewired tool on the next normal deploy; gate it on Phase D.
- **arc-reviewer** -- fresh terminal, post-arc, spec-vs-shipped walkthrough. Run after C RUN + buckets-E + D.

## When in doubt

Architecture is locked in the spec + decisions.md -- treat it as settled; implementation questions become dated decisions.md amendments, never silent overrides. The operator is the intent-gate (the go/no-go was green; the backfill spend is quota-paced at their pace); the overseer/orchestrator runs the technical phase-boundary verification. One question at a time, plain-English consequences (`feedback_operator_not_technical_review_gate`, `feedback_one_question_at_a_time`).
