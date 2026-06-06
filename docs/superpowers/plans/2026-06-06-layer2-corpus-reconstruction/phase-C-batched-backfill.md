# Phase C -- Batched backfill

> **CORRECTED SCALE + PREP/RUN SPLIT (2026-06-06) -- see `decisions.md` Amendment under D9.** Gap LOCKED at 12h; cap = **1500** (cap-sweep ratified -- cleaner partition than 2500, halves forced cuts vs 750); backfill **~3,796 agents**, NOT D9's ~650-750. R13: keep every chunk under the 256KB fence-agent Read cap (~2,700 msgs); cap 1500 is safe -- mirror sweep-prep.ts's write-time guard in backfill-batch.ts. Task 1's density for the two unprobed channels is DONE -- batch map: #quakeworld 374k / #dev-corner 196k / #helpdesk 104k / #antilag 19k chat+link msgs, ~38 (channel,year) batches over 2016-2026. Re-fence the 2021 slice under the production gap+version. Watch the year-boundary straddle in `batchScopeClause`. **PREP vs RUN:** the operator's quota resets ~2026-06-08; PRE-reset, run `phase-C-prep-executor-prompt.md` to BUILD the pipeline + VALIDATE on the smallest slice (#antilag 2026, ~1k msgs) then HALT; the full backfill (this MD / `phase-C-executor-prompt.md`) runs on reset.

> **Executor checklist:** read `decisions.md` (D5 idempotency, D7 resolution_status passenger, D9 Workflow recipe), `review-findings.md` (this phase owns R5, R6, R7, R8). Reuse Phase A's `load-threads.ts` + `thread-key.ts` -- do NOT write a second loader.
>
> **PRECONDITION: Phase A gate is GREEN (decisions.md D2).** If the gate is not green, STOP -- this phase does not run.

## Goal

Fence + embed + load the WHOLE Discord corpus as threads, in idempotent (channel x ~1-year) batches, paced to the operator's Max-subscription quota (1-2 batches per session). Each batch reuses the proven recipe and Phase A's loader; `resolution_status` rides the fence pass as a passenger, validated on batch 1 (D7). At the end, `search_solved_issues` covers the full corpus, not just the 2021 slice. **Runnable state after each batch:** the tool retrieves over every thread loaded so far; the corpus grows monotonically and each batch is independently re-runnable.

## Inputs from previous phase

- **PRECONDITION:** Phase A gate green (D2); schema + `load-threads.ts` + `thread-key.ts` exist.
- Phase B's chosen fence cap (sizes the agent count per batch).

## Files touched

### Created
```
apps/qw-oracle/scripts/load-chat/backfill-batch.ts   # one batch: window -> lull-chunks -> (Workflow fence) -> load-threads (idempotent)
apps/qw-oracle/scripts/load-chat/backfill-ledger.md   # which (channel,year) batches are done; running fail-counts
```

### Modified
```
apps/qw-oracle/scripts/load-chat/load-threads.ts      # generalise Phase A's loader to accept a (channel,year) batch scope (if not already)
apps/qw-oracle/scripts/calibration/wf-a-fence-queries.js  # OR a production fence variant: add OPTIONAL resolution_status to FENCE_SCHEMA (D7)
```

### Deleted
```
n/a
```

## Tasks

### Task 1 -- Batch plan

- **Goal:** Enumerate the (channel x year) batches and their agent-count estimates at Phase B's cap.
- **Files:** `backfill-ledger.md`.
- **Steps:**
  - [ ] List (channel, year) batches. The spec Pass 2 "Verified probes" density table covers ONLY `#helpdesk` + `#quakeworld` (the calibration channels). `#dev-corner` + `#antilag` were NOT probed -- run a quick live density query for them first: `SELECT channel_name, date_trunc('year', created_at) yr, count(*) FROM messages JOIN message_labels USING(... ) WHERE category IN ('chat','link') AND channel_name IN ('#dev-corner','#antilag') GROUP BY 1,2`. Then list all four channels' batches.
  - [ ] Order: `#helpdesk` + `#quakeworld` first (high value), `#dev-corner` + `#antilag` as the cheap tail (#antilag is tiny -- cross-fork antilag-netcode discussion, NOT competitive gameplay; spec Pass 3.3 correction).
  - [ ] Estimate agents per batch at B's cap (biggest ~ qw-2018 ~80 @ cap 750, ~20 @ cap 3000). Whole backfill ~650-750 @ 750, ~150-200 @ 3000 (D9). Skip the already-loaded 2021 slice (Phase A) OR re-key it under the production `reconstruction_version` if the fence prompt changed.
  - [ ] Record the plan + a checkbox per batch in the ledger.
- **Verification:** ledger lists every (channel,year) batch for all four channels with an agent estimate. PASS: plan complete. FAIL: a channel/year missing (esp. the two unprobed channels).
- **Execution mode:** `subagent (Sonnet medium)` -- mostly a markdown ledger, but the two unprobed channels need a live density query first (not purely inline).

### Task 2 -- resolution_status passenger + batch-1 kill-switch (R6 / D7)

- **Goal:** Add OPTIONAL `resolution_status` to the fence schema and validate it on batch 1 before letting it ride the whole backfill.
- **Files:** the fence Workflow script.
- **Steps:**
  - [ ] Extend `FENCE_SCHEMA` so each thread MAY carry `resolution_status` in {`solved`,`unresolved`,`informational`}; extend the prompt to ask for it (per-conversation LOCAL truth only -- never cross-conversation synthesis, D7).
  - [ ] Run batch 1 (the first high-value batch). Measure index-hallucination + a coherence spot-check WITH `resolution_status` emitted; compare to the probe baseline (0% hallucination, 4.38/5 coherence). This comparison MUST actually run (R6) -- it is the kill-switch gate.
  - [ ] DECISION: if clean, `resolution_status` rides every subsequent batch. If it perturbs fencing at all, DROP it from the fence prompt for the rest of the backfill and schedule a separate per-thread resolution pass later. Record the decision in the ledger.
- **Verification:** the batch-1 with-vs-without comparison is recorded; the keep/drop decision is explicit. PASS: decision made on measured evidence. FAIL: passenger shipped without the comparison (R6).
- **Execution mode:** schema/prompt edit `subagent (Sonnet medium)`; the fence run `workflow (Sonnet, conc-5, paced)`; the kill-switch judgment is the operator's at batch-1 boundary.

### Task 3 -- Per-batch pipeline (the repeating unit)

- **Goal:** One batch = window -> lull-chunks -> fence (Workflow) -> load-threads (idempotent). Re-runnable.
- **Files:** `backfill-batch.ts`, `load-threads.ts`.
- **Steps:**
  - [ ] `backfill-batch.ts` takes (channel, year): pull that window from Postgres, lull-chunk at B's cap (the `02-prep-chunks.ts` logic), write chunk files.
  - [ ] Run the fence Workflow over the batch's chunks (Sonnet, conc-5, paced, recovery+retry, HONEST counts -- never silent `.catch`; D9 / R7). Normalize `args` as a JSON string, and emit the `log(...)` startup banner (model/conc/setTimeout/keys) the proven recipe opens with (`wf-a-fence-queries.js:48`) -- it is the signal that caught rate-limit problems in calibration.
  - [ ] Run `load-threads.ts` scoped to this batch: build `chat_threads` + `thread_messages` (now with `resolution_status` if the passenger survived), embed raw member messages (live Voyage at backfill scale -- the probe cache only covers the 2021 slice; use the `embed-entities.ts` hash-skip / `BATCH_SIZE=64` / `embedding_api_log` / `[${v.join(',')}]::vector` literal / `tx.begin` pattern). Idempotent by `thread_key` (R5): the DELETE predicate MUST match the INSERT scope and be derivable from the key (D5) -- `DELETE FROM chat_threads WHERE channel_name = $1 AND reconstruction_version = $2 AND date_range_start >= $3 AND date_range_start < $4` (CASCADE drops `thread_messages`), then INSERT. Use `DISTINCT` in any junction count (R8).
  - [ ] Append the batch result (threads, junction rows, fence fail-count, embed fail-count) to the ledger.
- **Verification:**
  ```sql
  -- after a batch: threads grew by the batch's thread count; no NULL embeddings in the batch scope
  SELECT count(*) FROM chat_threads WHERE channel_name=$1 AND date_range_start >= $2 AND date_range_start < $3;
  SELECT count(*) FROM chat_threads WHERE topic_embedding IS NULL;   -- 0 (or only embed-failed rows, flagged stale)
  -- junction sanity (DISTINCT -- a message may map to >1 thread under a future m2m fencer, R8)
  SELECT count(DISTINCT message_id) FROM thread_messages tm JOIN chat_threads ct ON ct.id=tm.thread_id WHERE ct.channel_name=$1;
  ```
  PASS: batch threads present + embedded; ledger updated with honest counts.
  FAIL: NULL embeddings without a stale flag, or fence wipeout masked as success.
- **Execution mode:** chunk-prep + load `subagent (Sonnet medium)`; fence `workflow (Sonnet, conc-5, paced)`. The executor runs 1-2 batches per session, paced to quota (D9).

### Task 4 -- Idempotency probe

- **Goal:** Prove a re-run is a no-op on state (the HARD requirement, D5 / R5).
- **Files:** `backfill-batch.ts`.
- **Steps:**
  - [ ] Pick one completed batch. Record its `chat_threads` count + the set of `thread_key`s. Re-run the batch (same window, same `reconstruction_version`). Assert the count and `thread_key` set are identical -- the DELETE-then-INSERT replaced, did not duplicate.
- **Verification:** counts + `thread_key` set identical before/after re-run. PASS: idempotent. FAIL: counts grew -> the DELETE scope does not match the INSERT scope (R5); fix the predicate in `thread-key.ts` before more batches.
- **Execution mode:** `subagent (Sonnet medium)`.

## Verification (phase boundary)

1. Every (channel,year) batch in the ledger is loaded (or explicitly deferred), with honest per-batch fail-counts.
2. `resolution_status` keep/drop decision recorded with batch-1 evidence (R6).
3. Idempotency probe passed on at least one batch (R5).
4. `search_solved_issues` retrieves over the full backfilled corpus (spot-check a query whose answer is outside 2021 -- it now hits).
PASS: full corpus fenced + embedded + retrievable, idempotent, honest counts. FAIL: any batch silently partial, or non-idempotent.

## Outputs to next phase

- Full-corpus `chat_threads` (with `resolution_status` if the passenger survived) -> buckets-E labels them; Phase D recalibrates thresholds against the now-full retrieval set.

## Open questions / deferred items

- **Question:** Re-fence the 2021 slice under the production prompt, or keep Phase A's threads? **Default:** keep Phase A's 2021 threads (already loaded, gate-validated); if the production fence prompt diverges materially (e.g. resolution_status added), re-fence 2021 under the new `reconstruction_version` for consistency. **Who:** executor at Task 1.
- **Question:** Pacing cadence (1 vs 2 batches per session)? **Default:** trial a small wave first (D9); 1-2 batches/session, watch for the shared throttle. **Who:** operator, per quota headroom.

## Recovery (if verification fails)

- **Batch partially failed (some fence agents nulled):** the Workflow's recovery+retry pass handles transient nulls; if some persist, re-run the batch (idempotent -- D5 replaces cleanly).
- **Rate-limit wipeout / other terminals starved:** lower conc, lengthen pacing, smaller batch; never raise to Opus or auto-concurrency (R7).
- **resolution_status perturbs fencing (batch 1):** drop it from the fence prompt for the rest of the backfill; schedule a separate per-thread resolution pass (D7 fallback).
- **Non-idempotent re-run:** stop the backfill; fix the DELETE-scope/`thread_key` mismatch (R5) before loading more batches.
