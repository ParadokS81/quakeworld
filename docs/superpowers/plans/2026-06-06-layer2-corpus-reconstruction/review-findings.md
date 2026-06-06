# Review findings -- pre-registered risks

**No prior monolithic plan exists for this arc.** Unlike qw-oracle Arc 1 (which recovered a 3596-line buggy plan), this arc planned straight from a complete brainstorm. So there is no legacy-plan evidence trail to mine.

What this file holds instead: **risks pre-registered from the design spec + live-source reconnaissance during planning** (2026-06-06). Each is a thing a phase drafter/executor must actively verify -- not a bug already in a plan, but a place where this arc is known to be able to go wrong. New findings discovered during phase drafting append here with sequential R-numbers.

The fixes are encoded as decisions in `decisions.md`. This file is the WHY-watch-for-it; decisions are the WHAT-to-do.

---

## How to use this doc

While drafting / executing each phase:
1. Identify which risks touch the phase (see the "Phase ownership" table at the bottom).
2. Confirm the relevant decision resolves it.
3. If the phase cannot satisfy a risk it owns, surface it in the phase's "Open questions" section.

---

## Pre-registered risks

### R1 -- the probe's fenced threads carry NO `resolution_status` / `buckets`

**Resolved by:** D7 (passenger rides C), D8 (buckets are buckets-E), D4 (both columns nullable).

**Evidence:** `scratch/wf-a.json` threads are `{topic_label, member_indices}` only -- the probe's `FENCE_SCHEMA` (`wf-a-fence-queries.js:26-38`) never emitted resolution or buckets. Phase A promotes these threads verbatim; it MUST write `resolution_status`, `buckets_question`, `buckets_answer` as NULL, not invent them.

### R2 -- cache hit requires byte-identical text reconstruction

**Resolved by:** D10 (reuse cache), D3 (the exact `author: content` representation).

**Evidence:** `scratch/embed-cache.sqlite` is keyed `"{model}:{Bun.hash(text)}"` (`vectors.ts:14`). The probe embedded `msgs.map(m => "${m.author}: ${m.content}").join("\n")` sliced to 30000 chars (`03-embed-and-retrieve.ts:56`, `vectors.ts:35`). Phase A's loader must reproduce that string EXACTLY (same join, same slice cap, same model `voyage-4-large`) or every lookup misses and silently re-bills Voyage -- or worse, embeds slightly different text than what was calibrated. Verify a sample thread's reconstructed text hashes to a cache hit before trusting the cache path.

### R3 -- `search_solved_issues` return-shape change is a Discovery-contract change

**Resolved by:** D6 (orientation + types + API_CONTRACTS update in the same commit).

**Evidence:** The current tool returns `SessionHit` (`search-solved-issues.ts:114`, `types.ts`). Threads replace sessions as the retrieval unit, so the hit shape changes (thread identity, `topic_label`, hydrated member messages from `thread_messages` instead of `message_labels`). Per the orientation contract (`API_CONTRACTS.md`), adding/altering a tool's output without updating `serve/mcp/src/orientation.ts` is invisible to consumers and silently breaks Discovery. The orientation blob, `types.ts`, the tool description, and `API_CONTRACTS.md` open-drift #1 all update with the rewire.

### R4 -- the 30000-char Voyage slice can silently truncate a large thread

**Resolved by:** documented cap (D10); verify in A's loader.

**Evidence:** `vectors.ts:35` slices each document to 30000 chars before embedding. Most fenced threads are a handful of messages, but a worst-case forced-at-cap chunk could fence a large thread. If a thread's concatenated `content` exceeds 30000 chars, the tail is not embedded. v1 accepts this (threads are small in practice), but the loader should log when it truncates so a systematic problem surfaces rather than hiding.

### R5 -- backfill DELETE scope must exactly cover the INSERT scope

**Resolved by:** D5 (deterministic `thread_key` + scope predicate).

**Evidence:** Idempotency is a HARD requirement. If Phase C's per-batch DELETE predicate is narrower than what its INSERT writes, a re-run leaves orphan threads from the prior run; if broader, it deletes a sibling batch's threads. The DELETE `WHERE` clause MUST be derivable from, and consistent with, the `thread_key` construction (`{channel}:{reconstruction_version}:{chunk_id}:{thread_index}`). Write an idempotency probe: run a batch twice, assert identical row counts and identical `thread_key` set.

### R6 -- the `resolution_status` kill-switch must actually run the comparison

**Resolved by:** D7.

**Evidence:** The passenger is "kept only if batch-1 stays clean." That gate is only real if batch 1 is actually fenced BOTH ways (or the with-resolution run's hallucination + coherence are measured against the probe's without-resolution baseline: 0% hallucination, 4.38/5 coherence). If the executor ships the passenger without running that comparison, an unvalidated field rides the whole backfill. The batch-1 task names the explicit metric check and the fallback (separate per-thread pass).

### R7 -- new workflow scripts must normalize `args` and use the rate-limit recipe

**Resolved by:** D9.

**Evidence:** `args` arrives as a JSON string, not an object (`reference_workflow_rate_limit_and_args`; `wf-a-fence-queries.js:46`). Any new workflow script (C's backfill fence, buckets-E's labeler, B's sweep) that reads `args.foo` without `JSON.parse` throws at setup. And any fan-out that uses Opus or the framework's auto-concurrency trips the shared account-wide throttle and starves other terminals. Copy the `wf-a-fence-queries.js` recipe: Sonnet, conc-5, paced waves, recovery+retry, honest counts.

### R8 -- `thread_messages` is many-to-many; v1 fencer partitions, queries must not assume 1-to-1

**Resolved by:** D4 (junction PK allows m2m).

**Evidence:** The probe's fence prompt said "Every idx should appear in exactly one thread" (`wf-a-fence-queries.js:80`), so v1 output is effectively a partition (each message in <=1 thread). But the schema is many-to-many by design (a bridging meta-comment can belong to two threads in future fencing). Hydration / count queries that join `thread_messages` should use `DISTINCT` where a message could appear under multiple threads, so a future m2m fencer does not silently double-count.

### R9 -- migration number may collide with the in-flight qtv-qwfwd arc

**Resolved by:** D4 (take the next free number at execution time).

**Evidence:** Latest applied migration at planning time is `020_qtv_qwfwd_projects.sql`; that sibling arc is actively shipping and could land `021` before Phase A runs. The executor lists `db/migrations/`, takes the next free number, and does not hard-code `021`.

### R10 -- provisional RRF thresholds are not calibrated; do not present them as such

**Resolved by:** D6 (provisional defaults), D11 (gate is a human comparison), Phase D (recalibration).

**Evidence:** The borrowed `search_entities` thresholds (STRONG=0.02 / WEAK=0.005) were calibrated for the L1 entity RRF-score regime, not for fenced-thread retrieval. Phase A's gate is an operator-run side-by-side comparison (threads vs sessions), which tolerates provisional `match_quality`. But the tool must not report `match_quality: 'strong'` as a calibrated signal until Phase D recalibrates -- note the provisional status in the tool comment and `API_CONTRACTS.md`.

---

## Phase ownership of risks

| Phase | Risks to verify before sign-off |
|---|---|
| A -- Increment 1 (gate) | R1, R2, R3, R4, R8, R9, R10 |
| B -- Chunk-size sweep | R7 |
| C -- Batched backfill | R5, R6, R7, R8 |
| buckets-E -- enrichment | R7, R8 |
| D / author-trust / clustering (deferred stubs) | (none until their trigger opens) |

---

*End of pre-registered risks. New findings discovered during phase drafting append here with sequential R-numbers and a phase tag.*
