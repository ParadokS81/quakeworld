# Layer 2 corpus reconstruction -- arc capture

**Captured:** 2026-05-04 by arc-classifier mode D.
**Status:** Pass 1 complete (2026-05-04). Pass 2 (stage-by-stage refinement) pending in fresh terminal -- handoff prompt at `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction-pass2-handoff.md`.
**Design spec:** `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` (source of truth from Pass 1 onward).
**Trigger to start:** operator-initiated; arc-brainstormer in fresh terminal.

---

## Pass 1 status -- COMPLETE (2026-05-04)

Pass scope: adjacent topics drain. Sub-questions sourced from the "Open questions for the brainstorm" section below plus operator-surfaced gaps during the pass body (Claude-spotted gaps + operator's "anything else?" prompt).

### Locks

| Topic | Lock |
|---|---|
| Cross-fork disambiguation | Light L1 inclusion of Dusty's antilag-focused ezQuake/MVDSV/KTX fork plus 1-2 concept notes on when-to-care-about-the-fork. NOT a Stage 4 metadata field. |
| Time / era awareness | Out of scope for L2 prep. Lives at MCP query-time discretion -- the consumer LLM decides relevance across L1/L2/L3 hits. |
| Reply edges as Stage 2 signal | Within-chunk explicit-reply pairs go in the same sub-thread. Stage 3 still uses reply-edges as cross-session similarity signal. |
| Author role hints in primer | Iterative skill-baked role-list. Operator-verified seed list per channel before any production run; analyzer suggests additions per-chunk when someone stands out. Couples to author-trust weighting (Pass 3). |
| Bucket rubric depth | Empirical discovery via 3-6 month sample run. 9 buckets + multi-tag stand; new buckets or rubric rules added only when patterns make obvious gaps. |
| Analyzer output format | JSON (Anthropic native structured-output mode). Parser-robust machine-interchange format, not a UX surface. |
| Abstain path | Per-chunk and per-thread abstain flag with reason. Comprehension uncertainty triggers ABSTAIN; recurring abstentions on same vocabulary drive Stage 0 primer-loop iteration. |
| Task-confidence score | Deferred for v1. Re-evaluate at sample-test time if Stage 3 merging shows precision problems on close-call threads. |
| Hygiene #2 / #6 superseded | Confirmed. Stage 2 quiet-hour chunking + Stage 3 cross-session merging supersede #2; reply-graph signal in Stage 3 supersedes #6. HANDOVER cleanup deferred to arc-planner / arc-orchestrator scaffolding. |

### Meta-patterns surfaced

1. **Empirical discovery over top-down rubric.** Author-role-list seeding and bucket-rubric depth are answered by "run on a sample, see what emerges, then commit." This shapes the arc's Phase 0/1 -- the first runs are partly diagnostic, not just productive.
2. **Prep-work calibration ("bigger brain insurance").** Glossary + L1-lookup + role-list + per-channel character notes are cheap insurance worth investing in; do NOT gold-plate. Operator framing: marginal benefit per primer item is uncertain, but the floor cost is low and the artifacts are durable.

### Carry-forwards (with tracks)

| Item | Track |
|---|---|
| Stage 0 primer artifact location (`packages/qw-knowledge/terminology` extension vs new file under qw-oracle) | Pass 2 (Stage 0) |
| Stage 0 active L1 auto-lookup loop placement | Pass 2 (Stage 0) |
| Stage 1 heuristic-pruning bootstrap scope (10% sample stratification, banter-signal feature list) | Pass 2 (Stage 1) |
| Stage 2 chunk-size sweep parameters (500/1500/3000/6000) | Pass 2 (Stage 2) |
| Stage 2 quiet-hour gap definitions (multi-hour / overnight / weekend) | Pass 2 (Stage 2) |
| Stage 2 within-chunk reply-edge integration mechanics | Pass 2 (Stage 2) |
| Stage 3 cosine-similarity threshold + participant-overlap weight + reply-graph edge weight | Pass 2 (Stage 3) |
| Stage 3 clustering algorithm choice (HDBSCAN / Louvain / etc.) | Pass 2 (Stage 3) |
| Stage 4 schema confirmation (`chat_threads` + `thread_messages` shape) | Pass 2 (Stage 4) |
| Stage 4 bucket-tagging integration (single prompt vs separate post-Stage-4 pass) | Pass 2 (Stage 4) |
| Stage 4 role-list iteration wiring | Pass 2 (Stage 4) |
| Author trust weighting placement (Stage 4 metadata vs retrieval-time vs both) | Pass 3 |
| Trigger discipline (Phase-8-gate vs architectural-conviction unblock) | Pass 3 |
| Pipeline ordering (serialize vs Stage 0 + Stage 1 parallel) | Pass 3 |
| Cost model refresh (Voyage / Sonnet pricing, corpus growth) | Pass 3 |
| Sample-test scope (four-pipeline comparison with L3 first-class) | Pass 3 |
| Phase decomposition (number, boundaries, sample-test as Phase 0 prerequisite) | Pass 4 |
| Multi-language / config-dumps / re-run idempotency | Pass 2 conditional -- surface only if a specific stage needs them |
| HANDOVER cleanup of three superseded items | arc-planner / arc-orchestrator scaffolding (post-brainstorm) |

### Drain destinations

- This parking doc (Pass 1 status section).
- New design spec at `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- seeded with Pass 1 outputs and Pass 2-4 scope placeholders. Source of truth from Pass 1 onward.
- Fresh-terminal handoff for Pass 2: `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction-pass2-handoff.md`.

### Pass plan revisions

None. The four-pass plan stands: Pass 1 (adjacent topics drain, COMPLETE), Pass 2 (stage-by-stage refinement, next), Pass 3 (cross-cutting decisions), Pass 4 (phase decomposition + arc-planner handoff).

---

## Why this is arc-shaped

All eight classifier criteria fire. The strongest signals:

1. **Multi-phase deliverable.** The architecture (already drafted in `2026-05-03-layer2-thread-reconstruction.md`) is a 5-stage pipeline. Each stage produces a durable artifact the next consumes; each is independently inspectable. Natural phase boundaries.
2. **Spec required.** Three parking docs already exist (thread reconstruction, L3 multi-domain bucket framework, showcase-site contributor pipeline) plus the L2 hygiene design spec. The brainstorm pass needs to consolidate these into one arc-scope spec before arc-planner can scaffold.
3. **Cross-cutting decisions.** Primer artifact location, junk-pruning heuristic versioning, schema additions (`chat_threads` + `thread_messages`), Voyage embedding model, similarity thresholds, bucket taxonomy, status enum, retrieval-side filtering policy, trigger discipline. Each commitment touches every phase.
4. **Verification regime per phase.** Stage 0 primer convergence; Stage 1 heuristic recall on held-out batch; Stage 2 disentanglement coherence + message-ID hallucination rate; Stage 3 cluster quality; Stage 4 retrieval-delta vs FTS baseline. Each gate is its own protocol.
5. **Multi-session expected.** The thread-reconstruction parking doc alone is 287 lines with full research backing, cost model, and sample-test design. Adjacent topics push total context over any single-session budget.
6. **Multi-terminal execution.** Each stage's artifact verification benefits from fresh executor context.
7. **Mid-arc amendments expected.** Cost numbers ($130-140) and quality numbers (50-80% F1 extrapolated) are calibration claims. Real numbers will surface mid-arc and amend the spec.
8. **Post-arc review wanted.** Major architectural shift -- the primary retrieval unit changes from timestamp-bucket sessions to topic-coherent threads. Deserves a DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING walkthrough.

## Scope sketch

Reconstruct Layer 2 from the bottom up. Replace timestamp-bucket sessions (15-minute gap heuristic) with topic-coherent threads as the primary retrieval unit for `search_solved_issues`. Sessions remain as raw timestamp grouping for adjacent-context display; threads layer on top via a many-to-many junction.

Pipeline shape (drafted in `2026-05-03-layer2-thread-reconstruction.md`, ~80% specified):

- **Stage 0:** Glossary primer bootstrap. Iterative LLM-uncertainty-sampling (matching the `apps/quad/` voice-transcript analyzer pattern). Primer artifact persists; benefits future Layer 1 / Layer 3 enrichment.
- **Stage 1:** Heuristic junk pruning. Bootstrap pass tags 10% sample with LLM; derive deterministic Python/TS script; production pass on 90%. Reusable artifact for any future chat-corpus work.
- **Stage 2:** Within-session disentanglement. Quiet-hour-bounded chunks (NOT arbitrary fixed-size windows); primer-grounded LLM call splits chunks into topic-coherent sub-threads. Chunk size is a tunable swept inside the sample test.
- **Stage 3:** Cross-session topic merging. Embedding-similarity clustering of Stage 2 thread summaries (cosine + participant-overlap signal). GraphRAG-style community detection.
- **Stage 4:** Final summary + embed at thread granularity. Adds `resolution_status` (`solved/unresolved/informational`) + `buckets` (multi-tag from the 9-bucket player-as-system taxonomy) as structural metadata.

The arc folds in three handover items previously parked separately:

- **"Author trust weighting in retrieval ranking"** (future-arc, line 37). Author-frequency signal lives in `qw_oracle.messages` today but only gains meaning once threads are the retrieval unit -- frequency-weighted-by-thread-resolution-status is what actually carries signal.
- **L2 hygiene leftover #2** (micro-session over-segmentation, 51% of Discord sessions). Superseded by Stage 2's quiet-hour chunking + Stage 3's cross-session merging.
- **L2 hygiene leftover #6** (reply-chain merging, 32,863 referenced messages). Superseded by Stage 3's `session_references` reply-graph as similarity signal in cluster merging.

Adjacent topics that surfaced during the past week and need brainstorm-time integration: active L1 investigation during primer bootstrap (LLM auto-links unknown tokens to L1 entities via lookup_entity before falling back to operator triage); tighter integration with the L3 multi-domain bucket framework (Stage 4 consumes the 9-bucket taxonomy that the L3 doc defines); and a few others the operator has mentally accumulated but not yet enumerated -- the brainstorm pass should drain them.

Runnable state at arc-end: `chat_threads` + `thread_messages` tables populated from the Discord corpus; `search_solved_issues` retrieves against threads with hybrid lexical+semantic ranking; `resolution_status` + `buckets` metadata exposed in tool output; primer + junk-heuristic artifacts persist as durable infrastructure for future Layer 1 / Layer 3 / voice-transcript passes.

## Open questions for the brainstorm

The first parking doc (thread reconstruction, 2026-05-03) was most of the brainstorm already. These are the deltas + adjacent topics that need to land before arc-planner can scaffold:

- What adjacent topics from the past week need inclusion that aren't yet captured? (Operator to enumerate in Pass 1.)
- Should Stage 0's primer bootstrap auto-link unknown tokens to Layer 1 entities (lookup_entity / search_entities calls) before operator triage, and if so, where in the loop does that fit?
- Where does author trust weighting live -- Stage 4 metadata (per-thread author-trust scores), retrieval-time enrichment (re-rank by author trust at query time), or both?
- Does Stage 4's primer prompt fully consume the L3 9-bucket taxonomy, or is bucket-tagging a separate post-Stage-4 pass to keep prompt complexity bounded?
- Trigger discipline: skip the "post-Phase-8 deploy + `query_log` evidence" gate given architectural conviction has hardened, or hold to evidence-based unblocking?
- Confirm hygiene leftovers #2 and #6 are superseded -- remove from HANDOVER and the L2 hygiene design spec?
- Primer artifact location: extend `packages/qw-knowledge/terminology` (existing 353-line voice-transcript-derived glossary), or a new file under `apps/qw-oracle/` that the existing terminology depends on?
- Schema: confirm `chat_threads` + `thread_messages` shape from the parking doc is still right (vector(1024), CHECK enum on resolution_status, GIN on tsvector, junction PK on thread_id+message_id)?
- Pipeline ordering: serialize all five stages, or can Stage 0 + Stage 1 run in parallel (different artifacts, different LLM calls, both seed Stage 2)?
- Cost model: $130-140 estimate from the parking doc -- has anything changed (Voyage pricing, Sonnet pricing, corpus growth)?
- Sample-test scope: confirm the four-pipeline comparison (FTS baseline / per-session embed / within-session threads / full hybrid) is still the right shape, or has L3 first-class status (Phase 4 shipped) changed what we want to compare?
- Phase shape: how many phases does the arc want? Stage 0 alone is 1 phase; Stage 1 is 1 phase; Stage 2+3 might bundle; Stage 4 is its own phase; sample test might be Phase 0 prerequisite. Brainstormer to draft.

## What is NOT in scope

- **IRC corpus re-import.** Separate gate (parked under `decisions.md` D9-revised + Arc 3 reconsideration). Mentioned only as future input if mIRC codepage re-import + operator demand both materialize.
- **Layer 1 entity embeddings** (Phase 5 of Arc 1, separate concern).
- **Layer 3 chunk embeddings** (Phase 5 of Arc 1, separate concern).
- **`session_references` reply graph** as primary unit (Phase 3 shipped; coexists with thread reconstruction; Stage 3 consumes it as similarity signal).
- **Bot-live ingest topology.** The "no live freshness" hygiene issue (#9) is operational/architecture territory, not L2 reconstruction.
- **Per-message language detection.** Arc 3 enrichment territory per the L2 hygiene design spec.
- **Quality / signal-density scoring.** Arc 3 enrichment territory per the L2 hygiene design spec.
- **Layer 3 concept-note authoring** itself. Arc 3's authoring queue is downstream of this arc's Stage 4 bucket-tagged thread output. Authoring is a separate arc.
- **Showcase-site implementation.** Lockstep flagging architecture is referenced (Stage 4 buckets feed L3 frontmatter feeds wiki); building the site is a separate arc.

## Operator notes

- "the first parking arc was most of the brainstorm, but there were a few adjacent topics that came up during this week that would benefit from being included" -- Pass 1 should explicitly drain adjacent topics before settling pipeline shape.
- "its first really now we have the freedom to dig in, after the migration of the database from sqlite to postgres has happened" -- Postgres migration (Arc 1 Phase 3) shipped; this arc consumes the new shape (window functions, recursive CTEs over `referenced_message_id`, GIN-indexed `participants` arrays, pgvector for embeddings).
- HANDOVER.md cleanup is deferred -- leave the three superseded items in place until the brainstorm produces a unified spec; arc-planner / arc-orchestrator handle handover edits as part of scaffolding.
- Operator's preference (memory): plain English first; ASCII discipline in checked-in docs; one question at a time during Q/A; trust operator pace estimates over Claude's conservative ones.

## Related

### Primary inputs (read in full)
- `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- 287-line spine; ~80% of the architecture is here.
- `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` -- defines the 9-bucket taxonomy Stage 4 consumes.
- `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` -- research on hygiene leftovers; #2+#6 superseded by this arc.

### Cross-references (skim)
- `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` -- lockstep flagging architecture; bucket framework is one of three surfaces.
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` -- D5 (Arc 3 deferrals), D7 (tsvector simple), D9-revised (IRC exclusion), D18 (Phase 3 hygiene amendments).
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md` -- current Layer 2 schema; thread reconstruction proposes additions.

### Precedents and seed data
- `packages/qw-knowledge/terminology` -- existing voice-transcript-derived glossary; Stage 0 primer seed.
- `apps/quad/` voice-transcript analyzer -- precedent pattern for Stage 0 iterative LLM-uncertainty-sampling.

### Memory entries
- `project_qw_oracle_vision.md` -- three-layer architecture.
- `project_qw_oracle_product_vision.md` -- "real product is construction not retrieval; Layer 3 encodes patterns; version-aware retrieval is free."
- `project_qw_oracle_corpus_cross_engine.md` -- hybrid retrieval rationale.
- `feedback_scaffold_then_fanout_for_multi_phase_plans.md` -- 6+ phase implementation arcs use scaffold + fan-out drafting pattern.
- `feedback_one_question_at_a_time.md` -- interactive scoping defaults to one question per turn.

### HANDOVER items consolidated by this arc
- "Author trust weighting in retrieval ranking" (HANDOVER future-arcs section).
- L2 hygiene leftover #2 (micro-session over-segmentation, HANDOVER recently-opened).
- L2 hygiene leftover #6 (reply-chain merging, HANDOVER recently-opened).
- Implicit: Layer 2 thread reconstruction parking doc itself becomes secondary input rather than active future-arc.
