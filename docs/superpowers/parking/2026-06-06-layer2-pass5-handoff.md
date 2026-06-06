# Layer 2 corpus reconstruction -- Pass 5 (Cross-cutting + phase decomposition + planner handoff) brainstorm handoff

**For:** a fresh terminal resuming the multi-pass brainstorm at **Pass 5** (the LAST pass), via the `arc-brainstormer` skill.
**Created:** 2026-06-06 at Pass 4 close.
**Mode:** BRAINSTORM (arc-brainstormer). Pass 5 EXITS the brainstorm -- its output is the arc-planner handoff.

## Where things are

The brainstorm is at **Pass 5 of 5** -- the final pass. Passes 1, 1.5 (reshape), 2 (calibration gate), 3 (index mechanics), and 4 (query-time seam) are complete. The calibration test ran between Pass 2 and Pass 3 (arm D -- LLM-fenced threads -- won).

**The v1 architecture is fully settled:**

- **Index (Pass 3):** prune -> fence (Sonnet, per lull-chunk, topic-coherent threads) -> embed raw member messages (voyage-4-large) -> store `chat_threads` + `thread_messages` -> hybrid retrieve (vector primary + FTS via RRF). Cross-session merge decoupled; per-thread summary dropped; `resolution_status` + `buckets` labels deferred.
- **Query-time seam (Pass 4):** NO lazy-resolve loop -- L2 troubleshooting answers stand on their own. Community profile tools split off as their OWN arc (L2 does not depend on them). Author-trust = soft synthesis-time nudge (tiny curated note, build deferred). `match_quality` rides the standard `ToolResponse<T>` contract.

**Pass 4 in one line:** the query-time seam came in thin -- L2 ships as a standalone retrieval surface; the only community signal that touches it is a deferred author-trust note.

## Reads required (in order)

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- THE SPEC. Read **"Pass 3 outputs"** (locked v1 index) + **"Pass 4 outputs"** (query-time seam, incl. the carry-forwards Pass 5 must decompose) + the **Pass 1 carry-forwards** tracked to Pass 5 (pipeline ordering; cost model refresh; trigger discipline -- note author-trust placement was RESOLVED in Pass 4, not Pass 5).
2. `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md` -- Pass 4 status section + the carry-forward tracks Pass 5 owns.
3. `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md` -- the arm-D verdict + the proven backfill recipe (agent counts, concurrency, pacing) the phase decomposition must honor.
4. The Pass 3 outputs' **3.2 (chunk-size sweep)** and **3.4 (rollout: increment-gated backfill)** -- these ARE most of the phase plan already; Pass 5 formalizes them into phases.

## What Pass 5 must decide (cross-cutting + decomposition)

- **Phase decomposition.** Turn the locked v1 into arc phases. The spine is already shaped by Pass 3.4: (A) increment-1 thin loader over the already-fenced Feb-Mar 2021 slice + wire `search_solved_issues` to threads = the go/no-go gate; (B) chunk-size sweep (3.2); (C) batched incremental backfill (channel x ~1yr batches, idempotent, budget-paced). Plus deferred/gated phases: cross-session merge increment (+ its follow-on probe), Stage 4 enrichment (`resolution_status` + `buckets`), the `search_solved_issues` `L2_TS_RANK_*` recalibration (post-backfill), and the author-trust curated note (small task).
- **Migration confirm.** `chat_threads` + `thread_messages` (many-to-many junction, `vector(1024)`, GIN tsvector, `ON DELETE CASCADE`) + `buckets_question` / `buckets_answer` (JSONB) + nullable `resolution_status` / summary. Arc-planner writes the SQL; Pass 5 just confirms the shape is locked.
- **Cost model refresh.** Lower than the original $130-140 -- no Stage 0 primer, fence-only Stage 2. Pass 3 ballpark: whole backfill ~650-750 fence agents at cap 750, ~150-200 at 3000 (less than one probe run). Confirm + note the Max-subscription pacing constraint.
- **Trigger discipline + pipeline ordering** -- the last Pass-1 carry-forwards. Mostly resolved by Pass 3.4's increment-gating (the increment-1 go/no-go IS the trigger discipline). Confirm + close.
- **HANDOVER cleanup** of the three superseded items (author-trust-weighting future-arc; hygiene #2; hygiene #6) -- plan the edits.

## Critical rules

- **Brainstorm exits here.** Pass 5's output is the arc-planner handoff at `docs/superpowers/parking/2026-06-06-layer2-corpus-reconstruction-planner-handoff.md`. When the phases are named and the remaining unknowns are implementation-shaped (migration SQL details, idempotency keying, loader wiring), STOP and write the planner handoff.
- **The index AND the query-time seam are LOCKED.** Pass 5 decomposes; it does NOT reopen Pass 3 (merge / summary / embed-representation / chunk size) or Pass 4 (no lazy loop; community tools split off; author-trust placement).
- **Honor the decoupling.** The community profile tools (qwiki Phase 6) are NOT L2-arc phases -- they resumed as their own arc (Pass 4). Do not pull them into the L2 phase plan.

## First three actions

1. Read the spec's Pass 3 + Pass 4 outputs + the calibration results doc. Confirm the v1 pipeline + the proven backfill recipe.
2. Invoke `arc-brainstormer` for "Pass 5 of Layer 2 corpus reconstruction"; name the sub-questions upfront (phase decomposition / migration confirm / cost refresh / trigger+ordering close / HANDOVER cleanup).
3. Triage each as already-settled-by-Pass-3.4 (most of the phase spine) vs genuinely open (the deferred/gated phases' boundaries + ordering).

## When in doubt

Pass 5 is mostly bookkeeping + decomposition -- the hard architecture is done. Pass 3.4 already wrote the rollout (increment-gate -> sweep -> batched backfill); Pass 5 formalizes it into phases, folds in the deferred work (merge increment, Stage 4 enrichment, threshold recalibration, author-trust note) as gated/later phases, refreshes the cost model, and hands to arc-planner. If a question feels architectural (reshapes the pipeline), it belongs to an earlier pass and is already locked -- treat it as settled and move on.

---

**Handoff prompt (paste in a fresh terminal):**

> Pass 5 (final) of the Layer 2 corpus reconstruction brainstorm (cross-cutting + phase decomposition + arc-planner handoff). Read `docs/superpowers/parking/2026-06-06-layer2-pass5-handoff.md` and resume via the arc-brainstormer skill.
