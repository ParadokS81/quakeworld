# Layer 2 corpus reconstruction -- arc-planner handoff

**For:** a fresh terminal running the `arc-planner` skill to scaffold the Layer 2 corpus reconstruction arc.
**Created:** 2026-06-06 at Pass 5 close (brainstorm COMPLETE -- all 5 passes).
**Source of truth:** `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` (read its "Pass 5 outputs" section first).

## Where things are

The multi-pass brainstorm is DONE. The v1 architecture is fully settled (Pass 3 index + Pass 4 query-time seam) and decomposed into phases (Pass 5). Remaining unknowns are implementation-shaped -- exactly what arc-planner scaffolds and slices.

**The v1 pipeline (locked):** prune (drop bot/reaction/system, keep chat+link) -> fence (Sonnet, lull-chunks -> topic-coherent threads, proven arm-D recipe) -> embed raw member messages (voyage-4-large) -> store `chat_threads` + `thread_messages` -> hybrid retrieve (vector primary + FTS via RRF). Proven by the calibration probe: arm D won D-vs-C 72%, D-vs-B 69%, 0% index-hallucination + 4.38/5 coherence at cap 750, both channels.

**The phase decomposition (the thing to scaffold):**

Spine -- plan in full:
- **A -- Increment 1 (the go/no-go gate):** migration (create tables, task 1) -> thin loader promotes the already-fenced Feb-Mar 2021 slice from the probe's `scratch/` (embeddings cached) -> wire `search_solved_issues` to threads. Gate: thread-retrieval beats session-FTS on live queries? No -> stop; Yes -> greenlight C.
- **B -- Chunk-size sweep:** 1 fence agent each at 750 / 1500 / 3000 on a worst-case `#quakeworld` chunk; gate = 0% hallucination AND coherence ~4+; take the largest passing size. Parallel to A; output sizes C.
- **C -- Batched backfill:** channel x ~1yr batches, idempotent (HARD requirement), Sonnet / conc-5 / paced / recovery-retry / honest fail-count, 1-2 batches/session, quota-paced. `resolution_status` rides this pass as a passenger, kept only if batch-1 fencing stays clean (else falls back to a separate pass).
- **buckets-E -- FAQ-substrate enrichment:** LLM labels each thread with `buckets_question` / `buckets_answer` (9-bucket taxonomy). Planned in full -- FAQ-discovery (mining the tagged corpus for which concept-notes to author) is a primary payoff. Post-backfill; cheap; re-runnable.

Deferred tier -- scaffold as named gated stubs; do NOT detail-plan until triggers open:
- **D -- threshold recalibration** (`L2_TS_RANK_*` vs fenced threads; post-backfill).
- **Author-trust note** (tiny curated author-authority reference; small task; when convenient).
- **Clustering-for-analysis contingency** (formerly merge; only if N-hits ever annoys a consumer or FAQ-counting wants automation).

## Reads required (in order)

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- THE SPEC. Read **"Pass 5 outputs"** first (decomposition + migration + cost + vision framing), then "Pass 3 outputs" (locked v1 index) + "Pass 4 outputs" (query-time seam).
2. `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md` -- the proven backfill recipe (agent counts, concurrency, pacing) the phases must honor.
3. `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- the 287-line spine; the `chat_threads` + `thread_messages` schema the migration starts from.
4. `apps/qw-oracle/scripts/calibration/` -- the probe code IS the production recipe (fence + qgen + judge workflow scripts).
5. Exemplar scaffold: `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -- prior arc shape (decisions / review-findings / phase-template / phase MDs).
6. `apps/qw-oracle/API_CONTRACTS.md` -- `search_solved_issues` current contract (`L2_TS_RANK_*` placeholders, `ToolResponse<T>`).

## Critical rules

- **Do NOT reopen the architecture.** Pass 3 index + Pass 4 seam + Pass 5 decomposition are LOCKED. arc-planner scaffolds + slices; it does not redesign. If a question reshapes the pipeline (reopens merge / summary / embed-representation), it is already settled -- treat it as closed.
- **Increment 1 is the gate.** Everything past A is gated on A delivering. Do not plan C as if it always runs.
- **Idempotency is a HARD requirement** on every backfill batch -- re-running replaces its threads, never duplicates. The keying decision goes in decisions.md.
- **`resolution_status` passenger has a kill-switch.** Plan C's fence prompt to optionally emit `resolution_status`, validated on batch 1 (0% hallucination + coherence held); fall back to a separate per-thread pass if it regresses. Real slicing/decisions item.
- **buckets-E is planned, not stubbed** -- but its taxonomy is still discovered empirically; keep it decoupled from the fence pass and re-runnable over fixed threads.
- **Operator preferences:** plain English first; ASCII discipline in checked-in docs; one question at a time; trust operator pace; be decisive (recommend, don't poll). The operator sits at intent-level, not the technical review gate -- arcs need an overseer terminal for the technical gate (memory `feedback_operator_not_technical_review_gate.md`).
- **Cost is quota-paced, not dollar-budgeted.** Max subscription, no API key; backfill agents route through Workflow subagents (Sonnet), paced; honest fail-counts (memory `reference_workflow_rate_limit_and_args.md`, `reference_max_subscription_no_api_key.md`).

## First three actions

1. Read the spec's "Pass 5 outputs" + the calibration results. Confirm the spine + the proven recipe.
2. Invoke `arc-planner`; build the six-artifact scaffold (decisions / review-findings / prerequisites / phase-template / handoff-prompt / README) for spine A/B/C + buckets-E, with D / author-trust / clustering-contingency as named gated stubs.
3. Run slicing analysis (verification-regime + context-budget per phase) and annotate per-task execution mode (inline vs subagent at model + effort). A and buckets-E are LLM-pass phases (fan-out); B is a 3-agent probe; C is a paced multi-session campaign.

## When in doubt

The hard architecture is done; this is scaffolding. Implementation-shaped questions (migration SQL, idempotency keying, loader wiring, the fence-prompt `resolution_status` extension + batch-1 validation) belong to the planner/executor -- answer them in decisions.md. Architectural questions are already locked in the spec -- treat them as settled. The community profile tools (Phase 6) + the author->profile crosswalk (#3) are NOT this arc -- they belong to the community-reference arc (Pass 4 disposition).
