# Layer 2 backfill ledger (Phase C)

Tracks the (channel, year) batches for the full Discord corpus fence + embed +
load. Operating point: **12h lull gap / cap 1500** (decisions.md D9 amendment,
cap-sweep ratified). Counts below are EXACT, produced by
`bun scripts/load-chat/backfill-batch.ts count-all` (deterministic chunking, no
quota) -- re-run that to regenerate after any corpus catch-up import.

agents-per-batch = chunk count (one Sonnet fence agent per chunk, one pass).
Embedding is per-thread live Voyage (batched 64), a separate small dollar cost,
not an agent.

## Strategy decisions (folded in at prep, 2026-06-06)

### 1. Version + the 2021 supersede (the substantive call)

Phase A's 1,008 threads are `fence-sonnet-v1` = probe fencing (cap 750 / 3h gap),
increment-1 scaffolding meant to be REPLACED, not kept. Production backfill is
`fence-sonnet-v2` (12h / 1500 + resolution_status passenger). To prevent 2021
being double-covered in the index, **`backfill-batch.ts` load deletes by
(channel, year) range across ALL `reconstruction_version`s** (version-agnostic
range delete in `thread-loader-core.ts`), then inserts v2. So the reset-day
full-year-2021 v2 batch automatically supersedes A's v1 probe threads -- no
manual one-time delete, idempotent, no coexistence. The version-scoped
`batchScopeClause` (thread-key.ts) stays exported for any future safe-migration;
the production path deliberately does not use it. Proven in prep by injecting a
synthetic prior-version row in the #antilag-2026 range and confirming the batch
load clears it (see Validation below).

**Reset-day note:** the 2021 batches below (#helpdesk, #quakeworld, #antilag
2021; #dev-corner 2021) are FULL-YEAR v2 fences. Running #helpdesk-2021 and
#quakeworld-2021 supersedes the Feb-Mar 2021 v1 probe slice in those channels.
Do NOT re-run `load-threads.ts` after that (it would regress those ranges to v1).

### 2. resolution_status keep/drop is PROVISIONAL at prep (D7)

The prep kill-switch runs on #antilag-2026, which is atypical (low-traffic,
netcode-only). Treat the prep keep/drop as a cheap EARLY read. D7's binding gate
is "validated on batch 1" = the first HIGH-VALUE batch (#helpdesk or #quakeworld)
at reset -- RE-CONFIRM the with-vs-without delta there before letting the
passenger ride the whole backfill.

### 3. Year-boundary straddle (documented so RUN does not "fix" it)

Year batches pull strictly `created_at` in [year, year+1). A conversation
spanning Dec 31 -> Jan 1 is fenced as TWO threads (one per year). This is
intentional and idempotency-safe: each thread's `date_range_start` lands in
exactly one year, so exactly one batch's range-DELETE covers it. Do NOT add
cross-year overlap windows -- overlap would double-fence the boundary region
under different chunkIds, producing duplicate coverage. Cost is tiny, same class
as cap-forced cuts. (Comment lives in `backfill-batch.ts pullMsgs`.)

## Per-session pacing (reset-day RUN)

1-2 batches per session, paced to Max-subscription quota (D9). Trial a small
wave (1 agent) before a full batch to confirm the config clears the shared
throttle. Biggest single batch = #helpdesk 2024 (193 agents); all batches sit
under the 251-agent run proven clean in calibration.

## Batches

High-value channels first (#helpdesk, #quakeworld), cheap tail last
(#dev-corner, #antilag = cross-fork antilag-netcode discussion, NOT competitive
gameplay). `[x]` = loaded; the only prep-loaded batch is the #antilag-2026
validation slice.

### #helpdesk (1,005 agents, 7 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [ ] | 2020 | 14,244 | 97 | 0 |
| [ ] | 2021 | 27,806 | 151 | 1 |
| [ ] | 2022 | 13,893 | 178 | 0 |
| [ ] | 2023 | 18,533 | 146 | 0 |
| [ ] | 2024 | 12,410 | 193 | 0 |
| [ ] | 2025 | 11,433 | 179 | 0 |
| [ ] | 2026 | 5,400 | 61 | 1 |

### #quakeworld (849 agents, 11 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [ ] | 2016 | 14,474 | 112 | 2 |
| [ ] | 2017 | 56,198 | 72 | 26 |
| [ ] | 2018 | 62,125 | 53 | 29 |
| [ ] | 2019 | 46,130 | 58 | 17 |
| [ ] | 2020 | 53,179 | 54 | 26 |
| [ ] | 2021 | 39,821 | 64 | 14 |
| [ ] | 2022 | 18,440 | 119 | 0 |
| [ ] | 2023 | 20,006 | 108 | 1 |
| [ ] | 2024 | 27,722 | 81 | 4 |
| [ ] | 2025 | 27,199 | 100 | 4 |
| [ ] | 2026 | 8,829 | 28 | 0 |

### #dev-corner (1,560 agents, 11 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [ ] | 2016 | 10,492 | 114 | 0 |
| [ ] | 2017 | 41,605 | 141 | 5 |
| [ ] | 2018 | 30,266 | 129 | 5 |
| [ ] | 2019 | 18,359 | 177 | 0 |
| [ ] | 2020 | 20,689 | 146 | 1 |
| [ ] | 2021 | 11,244 | 182 | 0 |
| [ ] | 2022 | 12,130 | 163 | 0 |
| [ ] | 2023 | 11,603 | 173 | 0 |
| [ ] | 2024 | 16,201 | 151 | 0 |
| [ ] | 2025 | 19,287 | 130 | 1 |
| [ ] | 2026 | 4,601 | 54 | 0 |

### #antilag (382 agents, 6 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [ ] | 2021 | 8,932 | 73 | 2 |
| [ ] | 2022 | 3,191 | 96 | 0 |
| [ ] | 2023 | 1,613 | 56 | 0 |
| [ ] | 2024 | 2,745 | 73 | 0 |
| [ ] | 2025 | 1,877 | 63 | 0 |
| [x] | 2026 | 1,029 | 21 | 0 | -- PREP validation slice (loaded 2026-06-06)

## Totals

| channel | batches | agents |
|---|---|---|
| #helpdesk | 7 | 1,005 |
| #quakeworld | 11 | 849 |
| #dev-corner | 11 | 1,560 |
| #antilag | 6 | 382 |
| **TOTAL** | **35** | **3,796** |

(Note: sparse/bursty channels are agent-dense -- #dev-corner has the most agents
despite far fewer messages than #quakeworld, because frequent 12h lulls cut it
into many small chunks. #quakeworld's dense years are cap-forced into fewer,
larger chunks. Confirms the D9-amendment cost model.)

## Validation (prep, 2026-06-06) -- #antilag-2026 slice

Pipeline proven end-to-end on the smallest batch (#antilag 2026, 1,029 msgs, 21
chunks). Trial: 1 agent cleared the throttle (quota available pre-reset). Then
both kill-switch passes (21 agents each) ran 0-failure.

**Kill-switch (R6 / D7) -- KEEP, provisional.** Same 21 chunks fenced with vs
without `resolution_status` (`bun scripts/load-chat/fence-stats.ts` measures
both):

| metric | without (baseline) | with (passenger) |
|---|---|---|
| index-hallucination | 0% | 0% |
| coverage | 97.76% | 100% |
| threads | 51 | 67 |
| resolution_status | n/a | 14 solved / 13 unresolved / 40 informational / 0 none |

The passenger did NOT perturb fencing: index-hallucination held at 0% (probe
baseline), coverage held (100% >= 97.76%; the gap is within run-to-run fencer
variance, not a passenger effect). Spot-read of the with-pass threads: coherent,
finer partition than the without run, accurate resolution labels (e.g. a Q&A on
the sv_antilag value -> solved; the safestrafe deep-dive -> informational).
**DECISION: keep resolution_status riding.** This is PROVISIONAL -- #antilag is
atypical (low-traffic, netcode-only). D7's binding gate is batch-1 at reset
(#helpdesk or #quakeworld); RE-CONFIRM the with-vs-without delta there before
committing it to the whole backfill.

**Idempotency (R5): PASS.** Loaded the with-pass output, then re-ran the same
batch -- identical state both times: 67 threads, 0 NULL embeddings, identical
thread_key set (md5 `77cfea5f615c26b24df88a06b313d1e8`), identical resolution
distribution. DELETE-scope-then-INSERT replaced, did not duplicate.

**Supersede (fold #1): PASS.** Injected a synthetic prior-version row
(`fence-sonnet-v1-PROBE`) into the #antilag-2026 range; the next load's
version-agnostic range-DELETE cleared it (off-version-in-range 1 -> 0) while the
67 v2 threads stayed intact. Confirms reset-day's full-year-2021 v2 batch will
supersede Phase A's v1 probe threads.

**Straddle (fold #4): PASS (structural).** All 67 loaded v2 threads have
`date_range_start` inside [2026,2027) (min 2026-01-26, max 2026-05-02; 0 below,
0 above), so exactly one batch's range-DELETE covers each. (#antilag-2026 starts
Jan 26, so no real New-Year split is present in this slice to observe; the
documented split behavior for a true straddle stands.)

**Retrieval (4a): PASS.** `search_solved_issues` returns #antilag-2026 threads
for all three antilag-specific probe queries (top-3 all #antilag), with exact
topic hits and `resolution_status` surfaced. Semantic + lexical hybrid working
on the new slice. (match_quality reads weak/strong on provisional R10 thresholds
-- Phase D recalibrates.)

**State left for reset:** chat_threads = 1008 v1 (Phase A 2021 probe, untouched)
+ 67 v2 (#antilag-2026). The #antilag-2026 batch stays loaded; reset-day RUN
re-runs it idempotently (it is `[x]` above). Fence outputs cached at
`scratch/backfill/antilag-2026/fence-{nores,withres}.json` (gitignored).
