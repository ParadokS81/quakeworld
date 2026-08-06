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

**RESOLVED 2026-06-08 -- binding gate KEEP (RUN batch-1 = #helpdesk 2026).** The
with-vs-without comparison ran on the first high-value batch and OVERRIDES the
#antilag provisional KEEP:

| metric | without (baseline) | with (passenger) |
|---|---|---|
| index-hallucination | 0% | 0% |
| coverage | 100% | 99.96% (99.15% pre-splice -- see below) |
| threads | 357 | 373 (finer partition) |
| resolution_status | n/a | 185 solved / 85 unresolved / 102 informational / 1 none |

The hard gate (index-hallucination) held at 0% in BOTH passes. The only coverage
gap in the WITH pass was a single chunk (helpdesk-041, 86% -- one contiguous
44-msg sub-conversation dropped). A repeat WITH-resolution fence of that same
chunk hit 100% coverage, proving the drop was run-to-run fencer NONDETERMINISM,
not a passenger effect (the #antilag prep saw the reverse-direction delta for the
same reason). The better helpdesk-041 re-fence was spliced into the loaded batch
output, lifting batch coverage to 99.96% (2 msgs of 5,400 short -- normal fencer
variance). **DECISION: KEEP resolution_status riding every remaining batch** --
single-pass with `withResolution: true` from here on (no more dual-pass needed).

### 3. Year-boundary straddle (documented so RUN does not "fix" it)

Year batches pull strictly `created_at` in [year, year+1). A conversation
spanning Dec 31 -> Jan 1 is fenced as TWO threads (one per year). This is
intentional and idempotency-safe: each thread's `date_range_start` lands in
exactly one year, so exactly one batch's range-DELETE covers it. Do NOT add
cross-year overlap windows -- overlap would double-fence the boundary region
under different chunkIds, producing duplicate coverage. Cost is tiny, same class
as cap-forced cuts. (Comment lives in `backfill-batch.ts pullMsgs`.)

## Per-session pacing

**Sessions 1-4 (2026-06, Claude Workflow fencer):** 1-2 batches per session,
paced to Max-subscription quota (D9). Trial a small wave (1 agent) before a full
batch to confirm the config clears the shared throttle. Biggest single batch =
#helpdesk 2024 (193 agents); all batches sit under the 251-agent run proven
clean in calibration.

**Session 5+ (2026-08-05, external contract-worker fencer):** no Max quota is
consumed, so the 1-2-batches-per-session rule dissolves. The pacing constraint
is now wall-clock and per-chunk latency. The pre-batch trial did NOT dissolve --
it got sharper and MANDATORY, as `fence-external.ts probe`:

> **Probe the LARGEST chunks before every batch.** Failure tracks chunk size, so
> the extreme finds a bad config by construction where a random or calendar
> sample finds it only by luck. Session 5 skipped this on the strength of a
> same-day PASS verdict and paid 232 minutes to learn what one 2-cent probe of
> the biggest chunk would have shown in 8. A prior PASS is evidence about the
> dataset it was measured on, not a property of the tool.

Use `scripts/load-chat/run-backfill-batch.sh <channel> <year> [conc]` -- the
whole ritual with every gate a hard halt.

## Batches

High-value channels first (#helpdesk, #quakeworld), cheap tail last
(#dev-corner, #antilag = cross-fork antilag-netcode discussion, NOT competitive
gameplay). `[x]` = loaded; the only prep-loaded batch is the #antilag-2026
validation slice.

### #helpdesk (1,005 agents, 7 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [x] | 2020 | 14,244 | 97 | 0 | -- BATCH-2; loaded 2026-06-08, 715 threads (CONC=8)
| [x] | 2021 | 27,806 | 151 | 1 | -- SUPERSEDE batch; loaded 2026-06-09, 1346 threads (v1 #helpdesk 374->0)
| [x] | 2022 | 13,893 | 178 | 0 | -- loaded 2026-06-09 (CONC=10 shakedown), 1015 threads
| [x] | 2023 | 18,533 | 146 | 0 | -- loaded 2026-06-09 (session 3), 1220 threads (CONC=10 clean)
| [x] | 2024 | 12,410 | 193 | 0 | -- loaded 2026-06-09 (session 3), 1025 threads (CONC=10 clean)
| [x] | 2025 | 11,433 | 179 | 0 | -- loaded 2026-06-09 (session 4), 929 threads (CONC=10 clean); #helpdesk now 7/7
| [x] | 2026 | 5,400 | 61 | 1 | -- BATCH-1 (D7 binding gate); loaded 2026-06-08, 373 threads

### #quakeworld (849 agents, 11 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [x] | 2016 | 14,474 | 112 | 2 | -- loaded 2026-06-09 (session 4), 1297 threads (CONC=10 clean; 2 forced 1500-msg chunks held 96.1%/99.0%); first #quakeworld v2, coexists w/ v1 2021 probe
| [x] | 2017 | 56,198 | 72 | 26 | -- FIRST DENSE YEAR; loaded 2026-08-05 (session 5, EXTERNAL fencer), 3259 threads, 99.30% coverage after refence splice
| [x] | 2018 | 62,125 | 53 | 29 | -- loaded 2026-08-05 (session 5), 3358 threads, 99.54% coverage (refence 7/7), CONC=30 clean
| [x] | 2019 | 46,130 | 58 | 17 | -- loaded 2026-08-05 (session 5), 2660 threads, 99.17% coverage (refence 5/6)
| [x] | 2020 | 53,179 | 54 | 26 | -- loaded 2026-08-05 (session 5), 2372 threads, 99.26% coverage (refence 1/3; 2 retries WORSE, discarded)
| [x] | 2021 | 39,821 | 64 | 14 | -- SUPERSEDE batch; loaded 2026-08-05 (session 5), 2046 threads, 99.70% coverage; **v1 generation fully retired (634 -> 0)**
| [x] | 2022 | 18,440 | 119 | 0 | -- loaded 2026-08-05 (session 5), 1428 threads, 99.90% coverage (refence found nothing below 97%)
| [x] | 2023 | 20,006 | 108 | 1 | -- loaded 2026-08-05 (session 5), 1486 threads, 99.92% coverage (refence 1/1)
| [x] | 2024 | 27,722 | 81 | 4 | -- loaded 2026-08-05 (session 5), 1570 threads, 99.13% coverage (refence 5/5)
| [x] | 2025 | 27,199 | 100 | 4 | -- loaded 2026-08-05 (session 5), 1678 threads, 99.32% coverage (refence 1/1)
| [ ] | 2026 | 8,829 | 28 | 0 |

### #dev-corner (1,560 agents, 11 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [x] | 2016 | 10,492 | 114 | 0 | -- loaded 2026-08-05 (session 5), 660 threads, 99.97% coverage (best of any batch)
| [x] | 2017 | 41,605 | 141 | 5 | -- loaded 2026-08-05 (session 5), 1558 threads, 99.68% coverage (refence 2/2)
| [x] | 2018 | 30,266 | 129 | 5 | -- loaded 2026-08-06 (session 5), 1389 threads, 99.68% coverage (refence 2/2)
| [x] | 2019 | 18,359 | 177 | 0 | -- loaded 2026-08-06 (session 5), 1050 threads, 99.98% coverage (refence no-op)
| [x] | 2020 | 20,689 | 146 | 1 | -- loaded 2026-08-06 (session 5), 1127 threads, 99.95% coverage (refence 1/1)
| [x] | 2021 | 11,244 | 182 | 0 | -- loaded 2026-08-06 (session 5), 744 threads, 99.88% coverage (refence no-op)
| [x] | 2022 | 12,130 | 163 | 0 | -- loaded 2026-08-06 (session 5), 786 threads, **100.00% coverage** (refence no-op)
| [x] | 2023 | 11,603 | 173 | 0 | -- loaded 2026-08-06 (session 5), 784 threads, **100.00% coverage** (refence no-op)
| [x] | 2024 | 16,201 | 151 | 0 | -- loaded 2026-08-06 (session 5), 848 threads, 99.99% coverage (refence no-op)
| [x] | 2025 | 19,287 | 130 | 1 | -- loaded 2026-08-06 (session 5), 909 threads, 99.96% coverage (refence no-op)
| [ ] | 2026 | 4,601 | 54 | 0 |

### #antilag (382 agents, 6 batches)

| done | year | msgs | agents | forced |
|---|---|---|---|---|
| [ ] | 2021 | 8,932 | 73 | 2 |
| [ ] | 2022 | 3,191 | 96 | 0 |
| [x] | 2023 | 1,613 | 56 | 0 | -- loaded 2026-08-06 (session 5), 111 threads, **100.00% coverage** (refence no-op)
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

## RUN session log

### Session 1 -- 2026-06-08 (reset day)

Baseline re-confirmed before first write: chat_threads = 1075 (1008 v1 + 67 v2),
0 null/stale embeddings. Trial 1-agent fence cleared the post-reset shared
throttle (fence 1/1, 0 fail, 20.7s) -- Sonnet/conc-5 config good.

**Batch #helpdesk 2026 -- LOADED, verified.** 61 chunks, max 215.8KB (< 256KB
R13 cap). Fenced BOTH ways (D7 kill-switch, 61 agents each, 0 failures each).
Decision: KEEP passenger (see section 2 above). Loaded the WITH-resolution output
(helpdesk-041 re-fence spliced in):
- threads inserted: 373; junction rows: 5398 (DISTINCT == rows, R8 clean)
- 0 OOB drops, 0 missing-msg warnings, 0 stale embeds, 1 R4 truncation (>30000
  chars -- one large thread; embedding tail cut, full content stored; logged)
- resolution: 185 solved / 85 unresolved / 102 informational / 1 null
- **idempotency (R5/D5): PASS** -- re-ran load, identical state (373 threads,
  total 1448 not 1821, thread_key set md5 `1326de4b587542ea416ed355d042a443`
  unchanged). DELETE-scope-then-INSERT replaced, did not duplicate.
- **retrieval: PASS** -- ran the SHIPPED rewired `searchSolvedIssues` handler
  against the dev DB; 2026-specific queries return #helpdesk-2026 threads as
  thread-shaped top hits with `resolution_status` (e.g. "ping higher than
  terminal ping" -> the cl_physfps_spectator thread, strong, solved). Cross-year
  hybrid retrieval working (2021 + #antilag threads surface where relevant).

**Concern (deployment, NOT a Phase C defect):** the live `mcp__qw-oracle__*`
tools route to the PRODUCTION MCP server (server_version 0.6.0), which still runs
PRE-Phase-A session-FTS code (stale "2.66M IRC" description; old `session_id`
hit shape) and queries the production DB, NOT this dev DB. The Phase A hybrid
rewire is shipped in source (commit 58b30656) but not deployed to prod, and the
full-corpus backfill lands in the DEV DB. Production will not serve threads until
the rewire is deployed AND the prod DB is backfilled/promoted -- a post-arc
deploy step (deploy skill), outside Phase C scope. Retrieval was therefore
verified via the shipped handler against dev (the correct Phase-C check), not via
the stale prod MCP tool.

DB state after batch-1: chat_threads = 1448 (1008 v1 #helpdesk/#quakeworld 2021
probe + 67 v2 #antilag-2026 + 373 v2 #helpdesk-2026), 0 null embeddings.

**Batch-2 #helpdesk 2020 -- LOADED, verified.** 97 chunks, max 196.1KB, fenced
single-pass with-resolution at **CONC=8 / WAVE_PAUSE 500ms** (raised from 5/2000
this session, solo-run). **CONC=8 throttle outcome: CLEAN -- failures.fence = 0
(97/97), retry pass did NOT fire.** Wall-clock: fence 20.4 min for 97 chunks
(12.6s/chunk) vs batch-1's 15.8s/chunk at CONC=5 -- ~20% faster per chunk despite
2020 chunks being ~66% larger (147 vs 88 msgs/chunk avg). **0 failures => clear to
step CONC to 10 next session.** Load: 715 threads, 14,203 junction rows
(14,202 DISTINCT msgs -- one message legitimately in two threads, the R8 m2m
case; DISTINCT guard handles it), 0 OOB / 0 missing / 0 stale / 0 truncations,
0% hallucination / 99.71% coverage, resolution 389 solved / 152 unresolved /
174 informational. Idempotency (R5): PASS -- re-run identical (715 threads,
thread_key md5 `d1f3a77764adfa7987937d75fb9ce6e4`). Retrieval: PASS -- 2020
topics return as thread hits (gl_outline/thunderdome strong+solved, ServeMe bot
solved, k_random_maplist solved).

**BUG FOUND + FIXED this session -- R14 (concrete R5 violation).** The first load
of #helpdesk 2020 CRASHED on a `thread_key` UNIQUE collision: chunk ids were
year-less (`helpdesk-001`), so every year of a channel produced the SAME key, and
the year-scoped DELETE spared the already-loaded sibling year. Fix: year-scope the
chunk id in `backfill-batch.ts` prep (`{slug}-{year}-{NNN}`). The two already-loaded
v2 batches (#helpdesk 2026, #antilag 2026) were RE-KEYED by reloading from cached
fence output (no re-fence). Post-fix: 0 old-format v2 keys remain; whole v2 corpus
on one id format. New per-batch thread_key md5s: #helpdesk-2026 `7b931c60...`,
#antilag-2026 `d9ff5ba4...`. See review-findings.md R14 (incl. the "two batches,
same channel" idempotency probe the next validation pass should add).

DB state after session 1 (final): chat_threads = **2163** -- 1008 v1 (2021 probe,
untouched) + 1155 v2 (#helpdesk 2020 [715] + #helpdesk 2026 [373] + #antilag 2026
[67]), 0 null embeddings, all v2 keys year-scoped.

### Session 2 -- 2026-06-09 (CONC=10 shakedown)

Baseline re-confirmed before first write: chat_threads = 2163 (1008 v1 + 1155 v2),
0 null/stale. CONC stepped 8->10 (authorized by batch-2's clean 0-failure run; the
in-file guardrail was re-anchored at 10, not removed -- drop-back-on-dirty-signal
rule preserved). nproc=24 -> harness cap min(16,22)=16, so 10 is live (not clipped).

**Batch #helpdesk 2022 -- LOADED, verified.** 178 chunks, max 89.8KB (< 256KB R13
cap), 0 forced cuts. Fenced single-pass with-resolution at **CONC=10 / WAVE_PAUSE
500ms**. **CONC=10 throttle outcome: CLEAN -- failures.fence = 0 (178/178), retry
pass did NOT fire.** Wall-clock: fence 17.5 min for 178 chunks (5.9s/chunk -- vs
batch-2's 12.6s/chunk at CONC=8; faster per-chunk, 2022 chunks avg 78 msgs vs
2020's 147). **0 failures => CONC=10 proven; clear to hold 10 next session.**
Load: 1015 threads, 13,886 junction rows (13,885 DISTINCT msgs -- one message
legitimately in two threads, the R8 m2m case; DISTINCT guard handles it), 0 OOB /
0 missing / 0 stale / 0 truncations, **0% index-hallucination / 99.94% coverage**,
resolution 575 solved / 206 unresolved / 233 informational / 1 none.
Idempotency (R5): PASS -- re-ran load, identical state (1015 threads, GLOBAL total
held at 3178 not 4193, thread_key md5 `894eeca66e8702804ab017da5b09b631` unchanged).
Retrieval: PASS -- ran the SHIPPED rewired `searchSolvedIssues` against the dev DB;
all three 2022-specific queries return #helpdesk-2022 threads in the top-3 with
`resolution_status` surfaced (Ryzen-stutter/USB3 solved, cl_proxyaddr-chaining
solved, r_lgbloodcolor solved). Cross-year hybrid working (2020/2021/2026 threads
co-surface where relevant; match_quality reads weak on provisional R10 thresholds
-- Phase D recalibrates). Same prod-vs-dev deployment caveat as session 1 applies
(live mcp__qw-oracle__* still routes to pre-Phase-A prod; verified via shipped
handler against dev, the correct Phase-C check).

DB state after the 2022 batch: chat_threads = 3178 -- 1008 v1 (2021 probe,
untouched) + 2170 v2 (#helpdesk 2020 [715] + 2022 [1015] + 2026 [373] + #antilag
2026 [67]), 0 null embeddings, all v2 keys year-scoped.

**Batch #helpdesk 2021 -- LOADED, verified. THE SUPERSEDE BATCH (fold #1).** 151
chunks (1 forced -- the marathon-slice helpdesk-2021-145, 1500 msgs, fenced at
**100% coverage**: the R9-amendment forced-cut failure mode did NOT materialize).
Fenced single-pass with-resolution at CONC=10. **failures.fence = 0 (151/151),
retry pass did NOT fire** -- CONC=10 holds on the densest #helpdesk year. Wall-clock
37 min (the forced marathon chunk + denser 2021 conversations). 0% index-
hallucination / 99.92% coverage (lowest chunk 93% is a NATURAL dense chunk, 0 OOB
-- the forced chunk was 100%). Load: 1346 threads, 27,786 junction rows (27,784
DISTINCT -- 2 R8 m2m messages), 0 OOB / 0 missing / 0 stale, **3 R4 truncations**
(>30000-char marathon-derived threads; embedding tail cut, full content stored,
logged). resolution 768 solved / 258 unresolved / 320 informational / 0 none.

**Supersede cold-verify (the reason 2021 is gated) -- ALL PASS** (before-state
orchestrator-locked: v1 #helpdesk=374 all-2021, v1 #quakeworld=634 all-2021, no v2
#helpdesk-2021):
- v1 #helpdesk 374 -> **0** (version-agnostic range-delete cleanly dropped the
  Feb-Mar 2021 probe slice); the 2021 #helpdesk scope now contains ONLY v2.
- v1 #quakeworld **634 unchanged** (different channel, untouched).
- v2 #helpdesk siblings **untouched**: 2020=715, 2022=1015, 2026=373.
- new v2 #helpdesk-2021 = **1346** inserted.
- GLOBAL 3178 -> **4150** (-374 v1 + 1346 v2). 0 null/stale embeddings.

**Idempotency (R5): PASS** -- re-ran the supersede load, identical state (GLOBAL
held at 4150 not 5496, v1 #helpdesk still 0, thread_key md5
`52fb11499f6be0ce20bc72de3b881849` unchanged). The supersede does not resurrect v1
or duplicate v2 on re-run. **Retrieval: PASS** -- 2021-specific queries (FOV-130
fix, KTX offline bots, register_qwurl_protocol) return #helpdesk-2021 threads
carrying `resolution_status` (= v2; no NULL(v1) labels appeared), confirming the
v1->v2 transition is reflected in retrieval. Cross-year hybrid working.

**Remaining v1 supersede:** only #quakeworld-2021 (634 v1 threads) is left to
supersede -- it falls out automatically when the #quakeworld 2021 batch runs.

DB state after session 2 (final): chat_threads = **4150** -- 634 v1 (#quakeworld
2021 probe ONLY; #helpdesk 2021 v1 now superseded) + 3516 v2 (#helpdesk 2020 [715]
+ 2021 [1346] + 2022 [1015] + 2026 [373] + #antilag 2026 [67]), 0 null embeddings,
all v2 keys year-scoped.

### Session 3 -- 2026-06-09 (CONC=10 hold, standard ungated batch)

Baseline re-confirmed before first write: chat_threads = 4150 (634 v1 + 3516 v2),
0 null/stale, 0 non-year-scoped v2 keys -- exact match to session-2-final. nproc=24
-> harness cap min(16,22)=16, so CONC=10 is live (not clipped). wf-backfill-fence.js
already at CONC=10 / WAVE_PAUSE 500ms from session 2 (no edit needed).

**Batch #helpdesk 2023 -- LOADED, verified.** 146 chunks, max 177.1KB (< 256KB R13
cap), 0 forced cuts. Fenced single-pass with-resolution at **CONC=10 / WAVE_PAUSE
500ms**. **CONC=10 throttle outcome: CLEAN -- failures.fence = 0 (146/146), retry
pass did NOT fire.** Wall-clock: fence 19.3 min for 146 chunks (7.9s/chunk; 4.65M
subagent tokens, 334 tool-uses). **0 failures => CONC=10 holds a third batch.**
Load: 1220 threads, 18,480 junction rows (18,474 DISTINCT msgs -- 6 messages each
legitimately in two threads, the R8 m2m case; DISTINCT guard handles it), 0 OOB /
0 missing / 0 stale / 0 truncations, **0% index-hallucination / 99.68% coverage**
(lowest chunk 96.4% with 0 OOB = natural dense-chunk variance, not a forced cut),
resolution 649 solved / 241 unresolved / 330 informational / 0 none.
Idempotency (R5): PASS -- re-ran load, identical state (1220 threads, GLOBAL held
at 5370 not 6590, thread_key md5 `7cd7dfb9340a3d31ee105a22121293ea` unchanged).
Retrieval: PASS -- ran the SHIPPED rewired `searchSolvedIssues` against the dev DB;
all three 2023-specific queries return #helpdesk-2023 threads in the top-3 with
`resolution_status` surfaced (cel-shading-outlines solved, Win11-KB5021090-BSOD
solved [top hit], nquake-Debian-11 solved). Cross-year hybrid working (2021/2022
threads co-surface; match_quality reads weak/strong on provisional R10 thresholds
-- Phase D recalibrates). Same prod-vs-dev deployment caveat as sessions 1/2
(live mcp__qw-oracle__* still routes to pre-Phase-A prod; verified via shipped
handler against dev, the correct Phase-C check).

DB state after the 2023 batch: chat_threads = 5370 -- 634 v1 (#quakeworld 2021
probe ONLY) + 4736 v2 (#helpdesk 2020 [715] + 2021 [1346] + 2022 [1015] + 2023
[1220] + 2026 [373] + #antilag 2026 [67]), 0 null embeddings, all v2 keys
year-scoped.

**Batch #helpdesk 2024 -- LOADED, verified (2nd batch this session).** 193 chunks
(the corpus's biggest single batch by agent count), max 74.5KB, 0 forced cuts.
Fenced single-pass with-resolution at **CONC=10 / WAVE_PAUSE 500ms**. **CONC=10
throttle outcome: CLEAN -- failures.fence = 0 (193/193), retry pass did NOT fire.**
Wall-clock: fence 14.8 min for 193 chunks (4.6s/chunk -- faster than 2023's
7.9s/chunk; 2024 chunks avg smaller, max 74.5KB vs 177.1KB; 5.63M subagent tokens,
408 tool-uses). **0 failures => CONC=10 held the biggest batch.** Load: 1025
threads, 12,397 junction rows (12,396 DISTINCT msgs -- 1 message legitimately in
two threads, the R8 m2m case), 0 OOB / 0 missing / 0 stale / 0 truncations,
**0% index-hallucination / 99.89% coverage** (lowest chunk 95.8% with 0 OOB =
natural dense-chunk variance), resolution 557 solved / 250 unresolved / 218
informational / 0 none. Idempotency (R5): PASS -- re-ran load, identical state
(1025 threads, GLOBAL held at 6395 not 7420, thread_key md5
`d5bf160d15fefebeb9b7bc53737c5435` unchanged). Retrieval: PASS -- shipped
`searchSolvedIssues` on dev DB; all three 2024-specific queries return
#helpdesk-2024 threads in the top-3 with `resolution_status` (AMD-RX6700x-mesa-bug
solved [top hit], TeamFortress-Hamachi-gamedir solved [top hit], anisotropic-
filtering informational -- sweeps top-3). Cross-year hybrid working; same prod-vs-dev
caveat as sessions 1/2 (verified via shipped handler against dev).

DB state after session 3 (final): chat_threads = **6395** -- 634 v1 (#quakeworld
2021 probe ONLY) + 5761 v2 (#helpdesk 2020 [715] + 2021 [1346] + 2022 [1015] +
2023 [1220] + 2024 [1025] + 2026 [373] + #antilag 2026 [67]), 0 null embeddings,
all v2 keys year-scoped. #helpdesk now has only 2025 remaining ([ ], 179 agents).

### Session 4 -- 2026-06-09 (CONC=10 hold; finish #helpdesk, open #quakeworld)

Fresh terminal. Baseline re-confirmed before first write: chat_threads = 6395 (634 v1
+ 5761 v2), 0 null/stale, 0 non-year-scoped v2 keys -- exact match to session-3-final.
nproc=24 -> harness cap min(16,22)=16, so CONC=10 is live (not clipped). wf-backfill-fence.js
already at CONC=10 / WAVE_PAUSE 500ms (no edit). Trial 1-agent fence (helpdesk-2025-001)
cleared the throttle (1/1, 0 fail, 52s) and confirmed the Workflow result-capture path
(harness writes `.result` to the task output-file -> extract to fence-withres.json).

**Batch #helpdesk 2025 -- LOADED, verified. #helpdesk COMPLETE (7/7).** 179 chunks, max
80.8KB (< 256KB R13 cap), 0 forced cuts. Fenced single-pass with-resolution at **CONC=10
/ WAVE_PAUSE 500ms**. **CONC=10 throttle outcome: CLEAN -- failures.fence = 0 (179/179),
retry pass did NOT fire.** Wall-clock: fence 13.6 min for 179 chunks (4.6s/chunk; 5.24M
subagent tokens, 367 tool-uses). 1 chunk abstained (loader skips it). **0% index-
hallucination / 99.62% coverage** (lowest chunk 93.8% with 0 OOB = natural dense-chunk
variance, not a forced cut). Load: 929 threads, 11,389 junction rows (11,388 DISTINCT msgs
-- 1 message legitimately in two threads, the R8 m2m case; DISTINCT guard handles it), 0 OOB
/ 0 missing / 0 stale / 0 truncations, resolution 487 solved / 226 unresolved / 216
informational / 0 none. Idempotency (R5): PASS -- re-ran load, identical state (929 threads,
GLOBAL held at 7324 not 8253, thread_key md5 `f575cbc1aac242bdc91cbae71b92130f` unchanged).
Retrieval: PASS -- ran the SHIPPED rewired `searchSolvedIssues` against the dev DB; all three
2025-specific queries return #helpdesk-2025 threads in the top-3 with `resolution_status`
surfaced (UppsaLAN-QTV-CGNAT solved [top hit], totbots-KTX/MVDSV solved [top hit], ezQuake-
3.6.5-gpl_maps.pk3 freeze surfaces 2025 at #2/#3 beside the canonical 2024 thread). Cross-year
hybrid working (2020/2021/2024/2026 co-surface; match_quality weak on provisional R10
thresholds -- Phase D recalibrates). Same prod-vs-dev deployment caveat as sessions 1-3
(live mcp__qw-oracle__* still routes to pre-Phase-A prod; verified via shipped handler against dev).

DB state after the 2025 batch: chat_threads = 7324 -- 634 v1 (#quakeworld 2021 probe ONLY)
+ 6690 v2 (#helpdesk 2020 [715] + 2021 [1346] + 2022 [1015] + 2023 [1220] + 2024 [1025] +
2025 [929] + 2026 [373] + #antilag 2026 [67]), 0 null embeddings, all v2 keys year-scoped.
**#helpdesk is COMPLETE (all 7 years).** Next: first #quakeworld batch (2016).

**Batch #quakeworld 2016 -- LOADED, verified. FIRST #quakeworld v2 batch.** 112 chunks, max
172.5KB (< 256KB R13 cap), **2 forced** (the marathon-slice 1500-msg cap-forced chunks
quakeworld-2016-056 + -062). Fenced single-pass with-resolution at **CONC=10 / WAVE_PAUSE
500ms**. **CONC=10 throttle outcome: CLEAN -- failures.fence = 0 (112/112), retry pass did NOT
fire.** Wall-clock: fence 16.5 min for 112 chunks (8.8s/chunk -- slower per-chunk than
#helpdesk; #quakeworld chunks are bigger/denser; 3.46M subagent tokens, 276 tool-uses). **0%
index-hallucination / 99.05% coverage** (lowest natural chunk -073 at 94.9%, 0 OOB = dense-chunk
variance). **Forced-cut failure mode (R9-amendment / R13-first-at-scale) did NOT materialize:**
both forced 1500-msg chunks held -- -056 at 96.1% (92 threads), -062 at 99.0% (112 threads),
both 0 OOB / no abstain. -056's ~1% residual is the expected worst-case forced-chunk variance,
not loss. Load: 1297 threads, 14,337 junction rows (14,337 DISTINCT -- clean partition, 0 R8
m2m this batch), 0 OOB / 0 missing / 0 stale / 0 truncations, resolution 273 solved / 134
unresolved / 890 informational / 0 none (banter-heavy -- general channel, not help channel).
Idempotency (R5): PASS -- re-ran load, identical state (1297 threads, GLOBAL held at 8621 not
9918, thread_key md5 `401ac6276e99fe6af1890a8f76b937c0` unchanged). **v1 #quakeworld
coexistence: PASS** -- the [2016,2017) range-delete left the v1 [2021,2022) probe untouched
(v1 #quakeworld still 634); the first v2 #quakeworld now coexists with the v1 2021 probe (NOT a
supersede batch -- that is #quakeworld 2021, still gated). Retrieval: PASS -- ran the SHIPPED
rewired `searchSolvedIssues` against the dev DB; 2016-specific queries return #quakeworld-2016
threads (college-WiFi-ports solved [top hit], custom-resolution/vid_mode solved [top hit],
Reflex-onboarding informational [#3]). Cross-year hybrid working; match_quality weak on
provisional R10 thresholds -- Phase D recalibrates. Same prod-vs-dev deployment caveat as
sessions 1-3 (live mcp__qw-oracle__* still routes to pre-Phase-A prod; verified via shipped
handler against dev).

DB state after session 4 (final): chat_threads = **8621** -- 634 v1 (#quakeworld 2021 probe
ONLY) + 7987 v2 (#helpdesk 2020 [715] + 2021 [1346] + 2022 [1015] + 2023 [1220] + 2024 [1025]
+ 2025 [929] + 2026 [373] + #quakeworld 2016 [1297] + #antilag 2026 [67]), 0 null embeddings,
all v2 keys year-scoped. **#helpdesk COMPLETE (7/7); #quakeworld 1/11 (2016 done).** HALTED
before #quakeworld 2017 (first DENSE year -- gated for orchestrator cold-verify).

### Session 5 -- 2026-08-05 (external contract-worker fencer; 8-week gap)

**Fencer changed.** Batches from here run `fence-external.ts` (DeepSeek) instead of the
`wf-backfill-fence.js` Workflow -- no Max quota, ~$25-30 for the remaining corpus. Spike
verdict + evidence: `docs/superpowers/parking/2026-08-05-contract-worker-spike-report.md`.

Baseline re-confirmed before first write: chat_threads = 8621 (634 v1 + 7987 v2), 0 null/stale
-- exact match to session-4-final after 8 idle weeks. `count-all` reproduced the whole ledger
grid byte-exact (3,796 chunks / 139 forced), so zero corpus drift.

**The 2017 failure and what it cost (read this before trusting a PASS verdict).** The first
attempt ran 232 minutes and produced **38 of 72 chunks**. Post-mortem: failure tracked chunk
SIZE, not the `forced` flag. Every natural chunk >=730 msgs failed; every one <=490 passed.
Two ceilings, both sized where #helpdesk (88 msgs/chunk avg) could never reach them, both
blown by #quakeworld (up to 1,465 msgs/chunk):

| ceiling | was | real need (measured on failing chunks) |
|---|---|---|
| `CALL_TIMEOUT_MS` | 300s | 498s / 698s on 1500- and 1465-msg chunks |
| `MAX_OUTPUT_TOKENS` | 32,768 | 33,788 / 48,824 completion tokens (~91% reasoning) |

The spike's own fix (route `forced` chunks to pro) keyed on a variable merely CORRELATED with
the cause -- a one-channel sample couldn't separate `forced` from `big`. Fixed in `47d92d35`:
timeout 30min, max_tokens 131072, routing by size (`BIG_CHUNK_MSGS=500`), escalation pass in
paced waves (it was serial, ~170 of the 232 min), `--resume`, and `probe`.

**THE LOAD-BEARING FINDING -- a silent-data-loss path that was reachable through the documented
happy path.** `fence-stats.ts` computes coverage by iterating only the chunks PRESENT in the
fence output. A chunk that fails every attempt is simply absent, so it costs NO coverage
percentage. The 38/72 output scored **0% hallucination / ~99% coverage** -- gate-clean. Loading
it would have written 2017 as a complete year, ledgered it `[x]`, and left ~34 chunks of the
corpus permanently unreachable, with the gap indistinguishable from "that year was quiet".
`backfill-batch.ts load` now REFUSES a fence output short of its manifest (`--allow-partial`
overrides). **Any future fencer swap must re-check this: the gate measures what it is given.**

**Batch #quakeworld 2017 -- LOADED, verified.** 72 chunks, max 199.6KB, 26 forced. Re-fenced
the 34 gaps with `--resume` at **CONC=17** (kept the 38 already paid for; 99.9% prompt-cache
hit on the retry). **failures.fence = 0 (72/72), wall 24.1 min** -- vs 232 min for the failed
half-run. CONC=17 showed no throughput degradation.

First stats gate: 0% hallucination but coverage **98.37%**, below every prior batch. The
shortfall sat in big chunks (-046 84.2%, -069 84.4%). Coverage on big chunks is run-to-run
variance, not a hard limit -- two probes of the SAME 1500-msg chunk gave 132 vs 40 threads. New
`refence` pass (`d5b19ce8`) re-fences chunks under a coverage floor and keeps whichever
realization covers MORE; it generalizes session 1's manual helpdesk-041 splice. Result: 4/5
improved, **+521 msgs covered, 98.37% -> 99.30%**. One chunk's retry came back WORSE
(94.9% -> 75.7%) and was correctly discarded -- the keep-better comparison is load-bearing.

Load: 3259 threads, 56,083 junction rows (55,803 DISTINCT -- **280 R8 m2m messages**, vs 0-6 on
every prior batch; the fence prompt asks for exactly-one-thread placement and big chunks bend
it. DISTINCT guard handles it; watch whether it tracks chunk size on 2018-2021). 0 OOB / 0
missing / 0 stale, **6 R4 truncations** (>30000-char marathon threads; embedding tail cut, full
content stored). resolution 724 solved / 463 unresolved / 1932 informational / 140 none
(banter-heavy, like 2016). **Idempotency (R5): PASS** -- re-ran load, identical state (3259
threads, GLOBAL held at 11880 not 15139, thread_key md5 `509b7eef5c8970c75eccee55580c61ed`
unchanged). **Retrieval: PASS** -- shipped `searchSolvedIssues` against dev; "how do I export
ezquake console chat logs" returns the 2017 #quakeworld thread as top hit with
`resolution_status`; cross-year hybrid healthy (powerup-glow and macOS queries surface better
2016/2021/2022 answers). Same prod-vs-dev deployment caveat as sessions 1-4.

DB state after the 2017 batch: chat_threads = **11880** -- 634 v1 (#quakeworld 2021 probe ONLY)
+ 11246 v2, 0 null embeddings, all v2 keys year-scoped. **#quakeworld 2/11.**

**Batch #quakeworld 2018 -- LOADED, verified. FIRST FULLY-AUTOMATED BATCH** (whole ritual via
`run-backfill-batch.sh #quakeworld 2018 30`, zero manual steps before the retrieval probe).
53 chunks, max 198.2KB, 29 forced -- the corpus's densest year (1,172 msgs/chunk avg).
Pre-flight 3/3 PASS (worst 662s / 47,549 tokens = 37%/36% headroom). Fence **53/53, failures=0,
wall 31.0 min at CONC=30** -- better per-chunk throughput than CONC=17 on a cold prompt cache,
so the concurrency step-up is clean. Refence: **7/7 chunks improved, +663 msgs**. Gate: **0%
hallucination / 99.54% coverage**. Load: 3358 threads, 61,893 junction rows (61,842 DISTINCT --
**51 R8 m2m**, vs 2017's 280: that spike was run variance, NOT a dense-year/chunk-size property),
0 OOB / 0 missing / 0 stale, 6 R4 truncations. resolution 749 solved / 511 unresolved / 1942
informational / 156 none. **Idempotency (R5): PASS** (md5 `4e539770d060bb7ed17c2f6f8a35c75b`,
GLOBAL held at 15238). **Retrieval: PASS** -- "crosshair antialiasing broken after ezquake
upgrade" and "HUD item respawn timers" both return their 2018 #quakeworld threads as top hits;
cross-year hybrid healthy (a 2017 crosshair thread co-surfaces).

DB state after the 2018 batch: chat_threads = **15238** -- 634 v1 + 14604 v2. **#quakeworld 3/11.**

**Batch #quakeworld 2019 -- LOADED, verified.** 58 chunks, 17 forced. Fence **58/58, failures=0,
wall 27.4 min at CONC=30**; one chunk (-050) hit a transient schema violation and the runGently
retry pass recovered it -- the ~1-in-30 rate the spike documented, self-healing as designed.
Refence 5/6 improved (+415 msgs); one chunk's retry was worse and was discarded. Gate: **0%
hallucination / 99.17% coverage**. Load: 2660 threads, 45,822 junction rows (45,747 DISTINCT,
75 R8 m2m), 0 OOB / 0 missing / 0 stale, 7 R4 truncations. resolution 629 solved / 338
unresolved / 1673 informational / 20 none. **Idempotency (R5): PASS** (md5
`fad26a9c2cafe9bad58cc8377e988245`, GLOBAL held at 17898). **Retrieval: PASS** -- "forceskin
enemyforceskin ruleset debate" returns its 2019 thread as top hit (340 msgs, solved).

DB state after the 2019 batch: chat_threads = **17898** -- 634 v1 + 17264 v2. **#quakeworld 4/11.**

**Batch #quakeworld 2020 -- LOADED, verified.** 54 chunks, 26 forced. Pre-flight initially HALTED
the batch (see the probe-tolerance note below); after the fix, 3/3 PASS. Fence **54/54,
failures=0 at CONC=30**. Gate: **0% hallucination / 99.26% coverage**. Load: 2372 threads,
52,860 junction rows (52,784 DISTINCT, 76 R8 m2m), 0 OOB / 0 missing / 0 stale, **12 R4
truncations** (most of any batch -- 2020 is banter-dense with long threads). resolution 667
solved / 318 unresolved / 1325 informational / 62 none. **Idempotency (R5): PASS** (md5
`2f346be8563587d538dafecf1f84c3cd`, GLOBAL held at 20270). **Retrieval: PASS** -- "bots on FFA
servers and new player retention" returns its 2020 thread as top hit (531 msgs, solved).

**Refence earned its keep here:** of 3 low-coverage chunks, only 1 improved -- the other two
retries came back WORSE (93.5% vs 93.3%, and **94.5% vs 36.5%**) and were discarded. Without
the keep-better comparison the 36.5% realization would have replaced a fine one and dropped
~870 messages out of retrieval. A blind re-fence-and-replace would be actively harmful.

DB state after the 2020 batch: chat_threads = **20270** -- 634 v1 + 19636 v2. **#quakeworld 5/11.**

**Batch #quakeworld 2022 -- LOADED, verified. FIRST LIGHT YEAR.** 119 chunks, 0 forced, only 8
big-routed. Fence **119/119, failures=0 at CONC=30**. **Refence found NOTHING below 97%** and
the gate came in at **0% hallucination / 99.90% coverage** -- the best of any #quakeworld batch.
Load: 1428 threads, 18,421 junction rows (18,421 DISTINCT -- **0 R8 m2m**, a perfectly clean
partition), 0 OOB / 0 missing / 0 stale / 0 truncations. resolution 404 solved / 192 unresolved
/ 778 informational / 54 none. **Idempotency (R5): PASS** (md5
`3a3032c6addef8ee0a5fcee8d2d2da99`, GLOBAL held at 21698). **Retrieval: PASS** -- "outlines in
smackdown ruleset" returns its 2022 thread as top hit (129 msgs, solved).

**This confirms the coverage story:** every quality wobble this session (sub-99% coverage, R8
m2m spikes, truncations, refence work) is a BIG-CHUNK phenomenon, not a corpus-wide one. Light
years with small chunks fence essentially perfectly and need no refence pass at all. Expect
#dev-corner (chunk-dense, message-light) and #antilag to behave like 2022, not like 2017-2020.

DB state after the 2022 batch: chat_threads = **21698** -- 634 v1 + 21064 v2. **#quakeworld 6/11.**

**Batch #quakeworld 2021 -- LOADED, verified. THE FINAL SUPERSEDE -- `fence-sonnet-v1` IS NOW
GONE FROM THE CORPUS.** 64 chunks, 14 forced. Fence **64/64, failures=0, wall 34.1 min at
CONC=30** (two transient failures, -022 invalid JSON and -024 socket close, both recovered by
the retry pass). Final gate: **0% hallucination / 99.70% coverage**, 2046 threads. Load: 39,798
junction rows, **0 OOB drops**, 0 missing / 0 stale, 6 R4 truncations. resolution 474 solved /
176 unresolved / 1307 informational / 89 none.

**Supersede cold-verify -- ALL PASS** (before-state locked pre-load, ledger session-2 pattern):

| check | before | after | expected |
|---|---|---|---|
| v1 #quakeworld | 634 (2021-02-01..2021-03-31) | **0** | 0 |
| v1 TOTAL (all channels) | 634 | **0** | 0 |
| v2 #quakeworld-2021 | 0 | **2046** | new |
| v2 siblings 2016/17/18/19/20/22 | 1297/3259/3358/2660/2372/1428 | **all unchanged** | untouched |
| GLOBAL | 21698 | **23110** | 21698 - 634 + 2046 |

`chat_threads` is now **100% `fence-sonnet-v2`** -- the Phase A probe scaffolding that sessions
1-4 carried is fully replaced. Also resolves the Arc A parking-doc item "634-thread 2021 slice
-- verify provenance": it was exactly the documented Phase A v1 probe, Feb-Mar 2021, nothing
unaccounted for. **Idempotency (R5): PASS** (md5 `6374993cc26e6d29e209b43b9d3f095d`, GLOBAL held
at 23110; the supersede neither resurrects v1 nor duplicates v2). **Retrieval: PASS** -- a
#quakeworld-2021 thread surfaces carrying `resolution_status`, i.e. a v2 row; no NULL-resolution
v1 labels appear, so the v1->v2 transition shows in retrieval, not just in the counts.

DB state after the 2021 batch: chat_threads = **23110**, ALL v2. **#quakeworld 7/11.**

**Batch #quakeworld 2023 -- LOADED, verified.** 108 chunks, 1 forced, 10 big-routed. Fence
**108/108, failures=0, wall 30.8 min at CONC=30**. Refence 1/1 (-009: 91.1% -> 100.0%, +133
msgs). Gate: **0% hallucination / 99.92% coverage**. Load: 1486 threads, 19,995 junction rows
(19,990 DISTINCT, 5 R8 m2m), 0 OOB / 0 missing / 0 stale. resolution 388 solved / 156
unresolved / 896 informational / 46 none. **Idempotency (R5): PASS**. **Retrieval: PASS** --
"phantoma map YA splash behavior and design" returns its 2023 thread as top hit (279 msgs,
solved).

DB state after the 2023 batch: chat_threads = **24596**, all v2. **#quakeworld 8/11.**

**Batch #quakeworld 2024 -- LOADED, verified.** 81 chunks, 4 forced, 19 big-routed. Fence
**81/81, failures=0, wall 31.0 min at CONC=30**. Refence 5/5 improved (+303 msgs; one chunk hit
a transient invalid-JSON and recovered on the retry). Gate: **0% hallucination / 99.13%
coverage**. Load: 1570 threads, 27,495 junction rows (27,480 DISTINCT, 15 R8 m2m), 0 OOB / 0
missing / 0 stale. resolution 359 solved / 155 unresolved / 968 informational / 88 none.
**Idempotency (R5): PASS**. **Retrieval: PASS** -- "snap tap keyboard hardware debate" returns
its 2024 thread as top hit (180 msgs, solved).

*Known lever, not taken:* two chunks remained below 97% after the single refence pass (-066 at
94.2%, -075 at 96.3%). The driver runs refence ONCE and 99.13% clears the gate, so this was
left alone. A second pass would likely recover ~130 more msgs. If a future session wants the
tail, re-run `fence-external.ts refence <ch> <yr>` and re-load -- both are idempotent-safe.

DB state after the 2024 batch: chat_threads = **26166**, all v2. **#quakeworld 9/11.**

**Batch #quakeworld 2025 -- LOADED, verified. #quakeworld HISTORICAL COMPLETE (10/11; only the
parked 2026 batch remains).** 100 chunks, 4 forced, 18 big-routed. Fence **100/100, failures=0,
wall 41.2 min at CONC=30**. Refence 1/1 (-051: 84.4% -> 89.9%). Gate: **0% hallucination /
99.32% coverage**. Load: 1678 threads, 27,017 junction rows (27,015 DISTINCT, 2 R8 m2m), 0 OOB
/ 0 missing / 0 stale. resolution 399 solved / 182 unresolved / 1030 informational / 67 none.
**Idempotency (R5): PASS**. **Retrieval: PASS** -- "RTX 5080 vs 5090 purchase advice" returns
its 2025 thread as top hit (119 msgs, solved).

DB state after the 2025 batch: chat_threads = **28504**, all v2. **#quakeworld 10/11.**

> **TAIL-RECOVERY SWEEP (offered, NOT taken -- a deliberate consistency call).** Several batches
> have one or two chunks still below ~97% after their single refence pass (2024's -066 at 94.2%
> and -075 at 96.3%; 2025's -051 at 89.9%). Each would likely improve on another pass -- the
> pass is idempotent-safe and only ever keeps better. It was NOT run per-batch, because chasing
> tails on some batches and not others makes the per-batch coverage numbers non-comparable and
> the ledger harder to reason about. Every batch in session 5 was held to the SAME standard:
> one refence pass, 99% gate. If the tail is wanted, run it as ONE sweep across all batches
> (`refence` then re-`load`, both idempotent), and record it as its own ledger line so the
> before/after stays legible.

**Batch #dev-corner 2016 -- LOADED, verified. FIRST #dev-corner BATCH.** 114 chunks, 0 forced.
Fence **114/114, failures=0, wall 22.7 min at CONC=30** (fastest batch of the session). Refence
1/1 (-043: 95.8% -> 99.9%). Gate: **0% hallucination / 99.97% coverage -- the best of ANY batch
in the whole backfill**. Load: 660 threads, 10,489 junction rows (10,489 DISTINCT -- **0 R8
m2m**), 0 OOB / 0 missing / 0 stale / 0 truncations. resolution 232 solved / 135 unresolved /
281 informational / 12 none (far more solved-leaning than #quakeworld -- it is a dev channel,
not banter). **Idempotency (R5): PASS**. **Retrieval: PASS** -- both probes return their exact
#dev-corner-2016 threads as top hits ("high ping, prediction, and netcode" 136 msgs solved;
"teamskin/nail trail/cfg_save" 125 msgs solved), confirming a NEW channel is retrievable.

**Light-year prediction CONFIRMED.** #dev-corner is chunk-dense but message-light, and behaves
exactly like #quakeworld 2022/2023: near-perfect coverage, one trivial refence, zero m2m, zero
truncations, fastest wall-clock. Every hard problem of this session (timeouts, token ceilings,
sub-99% coverage, OOB off-by-ones) belongs to 1500-msg chunks specifically. Expect the rest of
#dev-corner and all of #antilag to run like this.

DB state after #dev-corner 2016: chat_threads = **26826**, all v2. **#dev-corner 1/11.**

**Batch #dev-corner 2017 -- LOADED, verified.** 141 chunks (the biggest #dev-corner batch),
5 forced. Fence **141/141, failures=0, wall 59.2 min at CONC=30**. Refence 2/2 (-005: 78.2% ->
99.8%, +257 msgs; -031: 96.5% -> 99.8%). Gate: **0% hallucination / 99.68% coverage**. Load:
1558 threads, 41,487 junction rows (41,472 DISTINCT, 15 R8 m2m), 0 OOB / 0 missing / 0 stale.
resolution 464 solved / 279 unresolved / 774 informational / 41 none. **Idempotency (R5):
PASS**. **Retrieval: PASS** -- both probes return their exact #dev-corner-2017 threads as top
hits ("forwarding QW traffic via ARM router/iptables" 332 msgs solved; "vid_vsync 0.0 vs 0 cvar
behavior debate" 279 msgs solved).

DB state after #dev-corner 2017: chat_threads = **30062**, all v2. **#dev-corner 2/11.**

**Batch #dev-corner 2019 -- LOADED, verified.** 177 chunks, 0 forced. Fence **177/177,
failures=0, wall 25.9 min at CONC=30**. **Refence NO-OP** (nothing below 97%, no OOB). Gate:
**0% hallucination / 99.98% coverage -- new session best**. Load: 1050 threads, 18,355 junction
rows (18,355 DISTINCT -- 0 R8 m2m), 0 OOB / 0 missing / 0 stale / 0 truncations. resolution
**420 solved / 223 unresolved / 382 informational** / 25 none -- note solved > informational,
the inverse of #quakeworld's banter-heavy split, as expected for a dev channel. **Idempotency
(R5): PASS**. **Retrieval: PASS** -- both probes exact top hits ("OpenGL shader version
compatibility for Gullfoss GUI" 228 msgs; "EZQuake fullscreen issue and DWM build/config" 170
msgs, both solved).

DB state after #dev-corner 2019: chat_threads = **31112**, all v2. **#dev-corner 3/11.**

**Batch #dev-corner 2021 -- LOADED, verified.** 182 chunks (most of any batch in the corpus),
0 forced, only 3 big-routed. Fence **182/182, failures=0, wall 29.0 min at CONC=30**. **Refence
NO-OP.** Gate: **0% hallucination / 99.88% coverage**. Load: 744 threads, 11,228 junction rows
(11,228 DISTINCT -- 0 R8 m2m), 0 OOB / 0 missing / 0 stale / 0 truncations. resolution 279
solved / 172 unresolved / 268 informational / 25 none. **Idempotency (R5): PASS**.
**Retrieval: PASS** -- both probes exact top hits ("Git mangling extended ASCII / line ending
false diffs" 150 msgs; "ezQuake input latency spikes and Reflex analyzer" 146 msgs, both solved).

DB state after #dev-corner 2021: chat_threads = **31856**, all v2. **#dev-corner 4/11.**

**Batch #dev-corner 2018 -- LOADED, verified.** 129 chunks, 5 forced. Fence **129/129,
failures=0, wall 63.2 min at CONC=30** (one transient invalid-JSON on -033, recovered by the
retry pass). Refence 2/2 (-043: 77.8% -> 100.0%; -107: 94.8% -> 96.9%). Gate: **0%
hallucination / 99.68% coverage**. Load: 1389 threads, 30,173 junction rows (30,170 DISTINCT,
3 R8 m2m), 0 OOB / 0 missing / 0 stale. resolution 494 solved / 297 unresolved / 572
informational / 26 none. **Idempotency (R5): PASS**. **Retrieval: PASS** -- "ezquake on Ubuntu
18.04: libpcre, 4k freeze, compositor, RJ timing" returns its 2018 thread as top hit (299 msgs,
solved).

DB state after #dev-corner 2018: chat_threads = **33245**, all v2. **#dev-corner 5/11.**

**Batch #dev-corner 2020 -- LOADED, verified.** 146 chunks, 1 forced. Fence **146/146,
failures=0, wall 41.4 min at CONC=30**. Refence 1/1 (-111: 90.3% -> 100.0%, +96 msgs). Gate:
**0% hallucination / 99.95% coverage**. Load: 1127 threads, 20,686 junction rows (20,678
DISTINCT, 8 R8 m2m), 0 OOB / 0 missing / 0 stale. resolution 388 solved / 240 unresolved / 477
informational / 22 none. **Idempotency (R5): PASS**. **Retrieval: PASS** -- "mvdparser
compilation and build system" returns its 2020 thread as top hit (172 msgs, solved); the second
probe surfaced a 648-msg 2025 #quakeworld anti-cheat thread instead, a fair cross-year win on a
broader topic.

DB state after #dev-corner 2020: chat_threads = **34372**, all v2. **#dev-corner 6/11.**

**Batch #dev-corner 2022 -- LOADED, verified. FIRST 100% BATCH.** 163 chunks, 0 forced. Fence
**163/163, failures=0, wall 19.6 min at CONC=30**. **Refence NO-OP.** Gate: **0% hallucination
/ 100.00% coverage** -- every message in the year placed into a thread. Load: 786 threads,
12,130 junction rows (12,130 DISTINCT -- 0 R8 m2m), 0 OOB / 0 missing / 0 stale / 0
truncations. resolution 364 solved / 142 unresolved / 257 informational / 23 none.
**Idempotency (R5): PASS**. **Retrieval: PASS** -- "deploying a QW server on a VPS with KTX"
returns its 2022 thread as top hit (86 msgs, solved).

DB state after #dev-corner 2022: chat_threads = **35158**, all v2. **#dev-corner 7/11.**

**Batch #dev-corner 2023 -- LOADED, verified. SECOND 100% BATCH.** 173 chunks, 0 forced. Fence
**173/173, failures=0, wall 25.4 min at CONC=30**. **Refence NO-OP.** Gate: **0% hallucination
/ 100.00% coverage**. Load: 784 threads, 11,602 junction rows (11,602 DISTINCT -- 0 R8 m2m),
0 OOB / 0 missing / 0 stale / 0 truncations. resolution 311 solved / 129 unresolved / 308
informational / 36 none. **Idempotency (R5): PASS**. **Retrieval: PASS** -- both probes exact
top hits ("Alpha/fence rendering & sorting" 145 msgs; "ezQuake vs IronWail performance and
vis/rendering optimization" 112 msgs, both solved).

DB state after #dev-corner 2023: chat_threads = **35942**, all v2. **#dev-corner 8/11.**

**Batch #dev-corner 2025 -- LOADED, verified.** 130 chunks, 1 forced. Fence **130/130,
failures=0, wall 36.6 min at CONC=30**. **Refence NO-OP.** Gate: **0% hallucination / 99.96%
coverage**. Load: 909 threads, 19,280 junction rows (19,280 DISTINCT -- 0 R8 m2m), 0 OOB / 0
missing / 0 stale / 0 truncations. resolution 317 solved / 154 unresolved / 410 informational /
28 none. **Idempotency (R5): PASS**. **Retrieval: PASS** -- "f_report spam and pause/matchtag"
returns its 2025 thread as top hit (211 msgs, solved).

DB state after #dev-corner 2025: chat_threads = **36851**, all v2. **#dev-corner 9/11.**

**Batch #dev-corner 2024 -- LOADED, verified. #dev-corner HISTORICAL COMPLETE (10/11; only the
parked 2026 batch remains).** 151 chunks, 0 forced. Fence **151/151, failures=0, wall 46.7 min
at CONC=30**. **Refence NO-OP.** Gate: **0% hallucination / 99.99% coverage**. Load: 848
threads, 16,210 junction rows (16,200 DISTINCT, 10 R8 m2m), 0 OOB / 0 missing / 0 stale.
resolution 283 solved / 151 unresolved / 375 informational / 39 none. **Idempotency (R5):
PASS**. **Retrieval: PASS** -- "FXAA implementation in ezquake" returns its 2024 thread as top
hit (122 msgs, solved); data verified healthy (848 threads, 0 null/stale) after two probes
missed (see the ranking note below).

DB state after #dev-corner 2024: chat_threads = **37699**, all v2. **#dev-corner 10/11.**

> **HARD GATE BEATS SOFT GATE (learned on 2021 -- the refence pass caused its own gate failure).**
> 2021 initially FAILED at **0.008% index-hallucination** (3 OOB in 39,625) -- the first non-zero
> of the entire backfill. Cause: the refence pass understood only coverage.
> 1. **Selection** was coverage-only, so -013 (99.0% coverage, 1 OOB) sat above the floor and was
>    never even considered.
> 2. **Keep-better** was coverage-only, so on -002 it kept a 92.9% realization carrying 2 OOB
>    over an 84.7% clean one -- trading the HARD gate (must be 0) for 8 points of the SOFT one
>    (~99% band). That is never the right trade.
>
> Fixed: select on `coverage < floor OR oob > 0`; rank candidates by **fewer OOB first**,
> coverage as tie-break. 2021 went 3 OOB -> 0 over two passes while coverage ROSE 99.24% ->
> 99.70% (-002 landed at 99.9%/OOB0). **Not** fixed by stripping OOB indices from the output,
> even though `thread-loader-core` already drops them defensively: the gate exists to detect a
> fencer inventing indices, and sanitizing its input would delete the signal while leaving the
> behavior invisible. A gate you can satisfy by editing its input is not a gate.
>
> Both OOB chunks were 1500-msg forced ones and the bad indices were 1501/1502 -- an off-by-one
> past the cap. Expect this specifically on cap-forced chunks; it is intermittent, so a re-fence
> clears it.

> **A FENCE THAT PASSES BOTH GATES AND IS STILL WRONG (found on #antilag-2021, 2026-08-06).**
> `antilag-2021-002` scored **99.8% coverage / 0% index-hallucination** -- both gates green --
> while emitting **3,127 index placements for 1,497 messages** across 19 mutually-overlapping
> threads. It duplicated the chunk roughly twice over. The fence is supposed to be a PARTITION;
> this was not one.
>
> **Why no gate saw it:** `fence-stats` coverage counts DISTINCT indices placed, so putting the
> same message in ten threads scores exactly like placing it once. Hallucination only checks
> that indices are in range -- they all were. Duplication was simply not measured anywhere.
> Downstream it showed up only as `r8MultiThreadMsgs` **1,633 of 8,926 (18%)** at load time, vs
> 0-15 on a typical batch -- and that counter is descriptive, not a gate.
>
> **Scope, measured across all 20 session-5 batches** (`dup-scan`): this chunk is an outlier by
> an order of magnitude (109% duplication). Next worst is `quakeworld-2017-058` at 10.8% (160
> dups); every other chunk is under ~5%, consistent with the documented-legitimate R8 case of a
> message genuinely bridging two threads. **The low-level duplication in the loaded corpus is
> acceptable and was left alone; only the outlier was re-fenced.**
>
> **Fix:** `chunkCoverage` now returns `dup`/`dupRatio`; refence SELECTS on
> `dupRatio > DUP_RATIO_MAX (1.05)` as well as coverage/OOB, and `betterRealization` ranks
> **OOB -> clean-partition -> coverage**, so a clean 97% realization now beats a duplicated 100%
> one. Previously the ranking would have actively preferred the broken output.
>
> **The general lesson, and it is the sharpest one of session 5:** a metric that aggregates
> (coverage = distinct/total) cannot detect a failure that preserves the aggregate. Two of this
> session's three worst defects were invisible to the gates for exactly this reason -- a missing
> chunk costs no coverage because it is not counted, and a duplicated chunk costs no coverage
> because coverage is de-duplicated. **When adding a quality gate, ask what shape of wrongness
> leaves its number unchanged.**

> **CORPUS DRIFT MID-BACKFILL (2026-08-05, cross-lane -- READ BEFORE RESUMING).** A parallel
> session ran the Arc A catch-up import while this backfill was in flight. Raw `messages` went
> 693,706 -> **741,128** (newest 2026-08-05). **No loaded batch was affected and no chunk count
> moved**, because the import lands RAW rows only: `build-sessions.ts` had not been re-run, so
> the 12,265 new messages (from 2026-05-02 on: #quakeworld 5,910 / #helpdesk 2,656 / #dev-corner
> 2,152 / #antilag 1,547) have no `message_labels`, and `backfill-batch.ts pullMsgs` joins
> `message_labels` and filters `category IN ('chat','link')`. They are invisible to fencing.
>
> **Consequence:** the four 2026 batches are PARKED. Running them now would still produce
> partial years (through 2026-05-02) needing a second fence later. Once `build-sessions.ts`
> re-runs and labels the new messages, 2026 batches fence COMPLETE through 2026-08-05 in one
> pass. This supersedes the earlier operator call to run 2026 partial -- that call was made
> before the import landed.
>
> **Do NOT run `build-sessions.ts` concurrently with a batch:** it TRUNCATEs and rebuilds
> `message_labels`, and a `prep` running inside that window would chunk from half-populated
> labels and silently produce wrong chunk boundaries. Re-run it between batches, then re-run
> `count-all` and reconcile the ledger's counts before fencing anything.

> **Probe tolerance (learned on 2020).** The pre-flight halted the batch on a single "response
> is not valid JSON" -- the ~1-in-30 transient schema miss the spike documented. But the
> production fence path tolerates exactly that (2 attempts + escalation; 2019's -050 self-healed
> the same way), so a one-shot probe was STRICTER THAN THE PIPELINE IT GATES and would have
> spuriously halted ~1 batch in 10. The probe now retries once; failing twice is the real
> signal. **A gate that fails on known-transient noise trains you to ignore it.** Same pass also
> raised MAX_OUTPUT_TOKENS 131072 -> 262144 after a 2020 chunk spent 79,294 completion tokens
> (61% of the old cap, 1.6x the prior worst) -- the third ceiling-raise of the session, each
> triggered by a new dense-year extreme. Ceilings here should be generous, not fitted.

> **Retrieval-probe methodology (learned on 2019, applies to every batch and to Phase D).**
> The first 2019 probe returned only 2017 threads and looked like a failure. It was not: the
> batch's data was healthy (2660 threads, 0 null/stale/missing-tsv) and the target thread
> existed with a near-exact label match. The queries were bad. Threads are embedded over their
> RAW MESSAGES, not their topic_label (D3), so a 4-msg / 345-char thread embeds thinly and
> legitimately loses to a richer thread on the same subject. **Probe with queries drawn from
> SUBSTANTIVE threads (high message_count), not from random `solved` topic_labels** -- a
> short-thread miss measures the probe, not the batch. Phase D threshold calibration should
> expect thread length to dominate ranking this way, or correct for it deliberately.
>
> **Counter-signal seen on 2024 -- length does NOT reliably dominate, and that is the problem.**
> A **1-message** throwaway thread came back as the TOP hit for "hand pain ergonomics and
> keybinding advice", outranking substantive discussion. The fencer is behaving correctly (the
> prompt explicitly allows "pure noise may be its own throwaway thread"), so the issue is
> ranking: RRF applies no length prior, so a 1-msg thread whose few tokens happen to align
> beats a 200-msg thread on the same subject. **Phase D should consider a length floor or a
> length-aware score** -- either would fix both this and the thin-thread misses above.
>
> **Third instance, #dev-corner 2024 -- the sharpest yet.** A **6-msg** 2017 thread ("Further
> discussion on map checksums and cheat prevention") outranked a **170-msg** 2024 thread ("Map
> distribution, autodownload and checksum handling") on the query "map autodownload and checksum
> handling", which describes the larger thread almost verbatim. The batch WAS reachable -- a
> distinctive query ("FXAA implementation in ezquake") returned its exact 122-msg thread, and
> the data verified healthy (848 threads, 0 null/stale). Three independent observations now
> across three batches, in both directions (thin threads winning AND losing). This is a
> systematic ranking property, not noise, and it is the single most actionable Phase D input
> from session 5.

**Operator decision (2026-08-05): run the 2026 batches NOW on partial-year data.** The raw
corpus ends 2026-05-02 (catch-up import is Arc A step 3). #quakeworld-2026 and #dev-corner-2026
are fenced/loaded from Jan-May data so it is searchable immediately; the post-import re-run
replaces them idempotently via the (channel, year) range-DELETE. **#antilag-2026 (loaded
2026-06-06) is in the same partial state and wants the same re-run.** Do NOT read a 2026 `[x]`
as a complete year until after the catch-up import.
