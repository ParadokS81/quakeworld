# Layer 2 corpus reconstruction -- arc capture

**Captured:** 2026-05-04 by arc-classifier mode D.
**Status:** Passes 1-4 COMPLETE (Pass 1 2026-05-04; Pass 1.5 reshape 2026-06-05; Pass 2 calibration gate 2026-06-05; Pass 3 index mechanics 2026-06-06; **Pass 4 query-time seam 2026-06-06**). The calibration test was built + run between Pass 2 and Pass 3 (arm D -- LLM-fenced threads -- won). Pass 5 (cross-cutting + phase decomposition + arc-planner handoff) is the last pass. Per-pass detail lives in the design spec's "Pass N outputs" sections; this doc carries the status summaries. Next action: Pass 5 in a fresh terminal -- handoff at `docs/superpowers/parking/2026-06-06-layer2-pass5-handoff.md`.
**Design spec:** `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` (source of truth from Pass 1 onward).
**Trigger to start:** operator-initiated; arc-brainstormer in fresh terminal.

---

## Pass 4 status -- COMPLETE (2026-06-06)

Pass scope: query-time seam -- where the embedding arc and the community-knowledge arc meet. Full locked detail in the design spec's "Pass 4 outputs" section; this is the summary. (Pass 3 detail also lives in the spec -- this parking doc never got a Pass 3 status section; the spec is SoT for per-pass detail.)

**The pass in one paragraph.** The seam came in far thinner than the Pass-1.5 reshape sketched. For the dominant L2 query (troubleshooting), a chat answer's value is invariant under anonymizing the nicks it mentions -- so v1 builds NO lazy-resolve-mentions loop over L2. Community/historical questions are served by the profile tools as their own separate retrieval surface, not by enriching L2 hits. That drop completes the arc severance (L2 no longer depends on the community tools), so the community profile tools (Phase 6) split off as their own arc. The only community signal that survives at the L2 seam is author-trust, as a soft synthesis-time nudge.

**Sub-questions resolved:**
- 4.1 lazy-resolve loop + locus -- **DISSOLVED.** No v1 mention-resolution over L2; answers stand alone; rare-case lookups are ordinary consumer tool use.
- 4.2 which community tools to finish -- **Phase 6 splits off as its own small arc.** Disposition: Phase 6 resurrect (keystone; `lookup_by_nick` with Discord-ID-alias forward-compat) / Phase 4 (tournaments) + Phase 5 (cross-links) incremental / Phase 7 (L2 primer) drop.
- 4.3 lookup budget / cap -- **DISSOLVED** with the loop.
- 4.4 match_quality guard -- **rides the standard `ToolResponse<T>` contract** (defined at Phase 6 build). L2-specific tail: `search_solved_issues` `L2_TS_RANK_*` recalibration -> Pass 5.
- 4.5 author-trust -- **soft synthesis-time nudge, consumer-side**, a tiny curated author-authority note (build deferred), riding #3's crosswalk long-term. Retrieval-ranking placement + corpus-derived version both rejected. Pass 4 owns the placement.

**Vocabulary correction (drove the pass):** author (always present) vs entities-mentioned-in-text (the lazy-loop target, now dropped) vs author-identity->profile crosswalk (#3, a separate later data-join).

**Drain destinations updated:** design spec ("Pass 4 outputs" section + status line + Pass 4 scope blurb marked COMPLETE); this parking doc (this section + status line); qwiki community-reference parking doc (the Phase 6/4/5/7 disposition + decoupling note); memory `project_l2_lazy_retrieval_reshape.md` (Pass 4 refinement) + the MEMORY.md index hook.

**Carry-forwards (with tracks):**
- #3 author-identity -> player-profile crosswalk -- separate later capability; the matchscheduler Discord-OAuth login table is the partial crosswalk asset today; the community site will carry the real identity DB; `lookup_by_nick` Discord-ID-alias design locked now. Track: own future capability, cross-refs the Phase 6 arc; NOT L2 scope.
- Author-trust tiny curated note -- Track: Pass 5 / implementation (build deferred).
- `search_solved_issues` `L2_TS_RANK_*` recalibration -- Track: Pass 5 phase decomposition (post-backfill calibration phase).
- Phase 6/4/5/7 community-arc disposition -- Track: community-reference arc's own resumption, independent of L2.

**Pass plan revision:** none. Pass 5 (cross-cutting + phase decomposition + arc-planner handoff) stands as the last pass, and now also folds the author-trust note build + the L2 threshold recalibration into its decomposition. Pass 5 handoff written at `docs/superpowers/parking/2026-06-06-layer2-pass5-handoff.md`.

---

## Pass 2 status -- COMPLETE (2026-06-05)

Pass scope: calibration gate -- design the cheap sample-test that decides how much LLM disentanglement the chunker needs, before Pass 3 specs the chunker. Full locked detail in the design spec's "Pass 2 outputs" section; this is the summary.

**Sub-questions resolved:**
- Corpus slice -- `#helpdesk` (easy / reply-threaded) + `#quakeworld` (hard / interleaved), bracketing the difficulty axis; one contiguous 2021 window (the only era both are dense), ~2-3 months / ~12-18k messages; exact months via a per-month density drill before the run.
- Prune prerequisite -- light-prune via existing classifier labels (drop reaction/bot/system ~3-5%, keep chat+link); do NOT build the spine's banter-pruner as a prereq (reshape makes it likely unnecessary; the test measures whether banter volume hurts). Verified live: classifier only removes ~2.5% (`#helpdesk`) / ~4.8% (`#quakeworld`).
- Test arms -- A FTS / B sessions-as-is / C cheap-signal (+CODI) / D LLM-fenced. NO arm E (methods research: every modern method needs a clean thread to already exist, or collapses into C/D).
- Eval substrate -- disentanglement quality (message-ID hallucination + coherence spot-check) + retrieval quality (pairwise LLM-as-judge, position-swap + length-penalty; reverse-generated queries as the query SOURCE + the 2026 Phase 8 set as anchor) + cost.
- Scoring technique -- pairwise LLM-as-judge, NOT synthetic-query self-recall (cannot discriminate arms over a shared corpus). Resolved by the methods research.
- Decision rule -- pattern-based + cost-default tiebreaker (the LLM must visibly earn its recurring cost); no precise numeric threshold given the ~20-30 gold-pair sample.

**Methods research (background agent-team, 13 agents, ~625k tokens):** committed at `docs/research/2026-06-05-chat-corpus-retrieval-methods.md`. Validated the four-arm design (zero new arms), lifted CODI into C, corrected arm-D cost (~200-500 calls, not ~28k / $168), set the eval harness (pairwise judge over self-recall), and named revisit-later paths (Contextual Retrieval, voyage-context-3/4).

**Drain destinations updated:** design spec ("Pass 2 outputs" section -- arms, eval, decision rule, verified probes + top status line); new research doc; this parking doc (this section + status line).

**Carry-forwards (with tracks):**
- BUILD + RUN the calibration test -- IMPLEMENTATION, not brainstorm. Next action; it GATES Pass 3 (Pass 3 is scoped by the test result). Execute via arc-planner (scaffold the test as a prerequisite probe) or as a standalone scripted probe -- operator's call. -> NEXT ACTION
- Chunk-size sweep (500/1500/3000), the actual chunker mechanics, quiet-hour cut definitions -> Pass 3 (calibrated inside the test run).
- Stage 3 cross-session merging (cosine ~0.85 + participant overlap + reply-graph) -- research flags merge quality may need its OWN follow-on probe -> Pass 3 / possible separate probe.
- `chat_threads` + `thread_messages` schema -> Pass 3.
- Revisit-later optimizations (Contextual Retrieval enrichment on the winning arm; voyage-context-3/4; proposition within-thread sub-chunker) -> post-calibration / Pass 5 optimization track.

**Pass plan revision:** none to the pass list (3 / 4 / 5 stand). Structural note: an IMPLEMENTATION step (build + run the test) sits BETWEEN Pass 2 and Pass 3 -- Pass 3 brainstorm resumes once the calibration result is in hand.

---

## Pass 1.5 status -- RESHAPE RATIFICATION COMPLETE (2026-06-05)

Captured-and-formalized the architecture reshape that emerged in conversation 2026-06-05 (the arc had been shelved since Pass 1 on a prerequisite that turned out not to be required). Full reasoning + amended locks live in the design spec's "Reshape (Pass 1.5)" section; this is the status summary.

**The reshape in one paragraph.** The Stage 0 glossary / historical-data primer is NOT a prerequisite. Embedding is knowledge-free (Voyage embeds raw text; Claude's index-time knowledge does not move the vector); segmentation needs text-comprehension, not background knowledge; retrieval recovers the "what" symmetrically. What drives retrieval quality is boundary coherence, not knowledge. The community knowledge (players / clans / tournaments / glossary) moves to query time as **lazy / agentic retrieval**: embedding returns conversations, then Claude resolves unknown tokens on demand via MCP `lookup_*` tools. The embedding arc and the community-knowledge arc are decoupled and meet only at that query-time seam.

**Amended Pass-1 locks:** Stage 0 primer DELETED; "author role hints in primer" RE-HOMED to query-time; "bigger brain insurance" meta-pattern INVERTED (query-time, not index-time); abstain reason REWORDED (boundary-uncertainty, not missing glossary).

**Revised pass plan (replaces original Pass 2/3/4):**
- Pass 2 -- Calibration gate (sample-test elevated to first; decides chunker depth).
- Pass 3 -- Index mechanics (prune / chunk / merge / embed; schema).
- Pass 4 -- Query-time seam (new; lazy-retrieval loop + which community MCP tools to finish).
- Pass 5 -- Cross-cutting + phase decomposition + arc-planner handoff.

**Carry-forwards (with tracks):**
- The whole community-knowledge track is now a SEPARATE parallel arc (the half-built qwiki community-reference arc: players 5,900 + clans 822 loaded; tournaments / MCP-tools / primer not shipped). Track: its keystone is finishing the MCP lookup tools (its Phase 6); tournaments / cross-links (Phase 4/5) incremental; L2 primer (Phase 7) dropped. The concrete resurrect-vs-drop call lands in Pass 4. Not a blocker for the embedding arc.
- Sample-test design -> Pass 2.
- Analyzer JSON shape + abstain reshape-adjustments -> Pass 3.
- Author-trust weighting (re-homed to query-time) -> Pass 5.

**Drain destinations updated:** design spec (Reshape section + amended locks + new Pass 2-5 scope); this parking doc (this section + status line); new Pass 2 handoff; memory `project_l2_lazy_retrieval_reshape.md`.

**Pass plan revision:** the original 3 forward passes (2 stage-refinement / 3 cross-cutting / 4 decomposition) became 4 (calibration / index / query-seam / cross-cutting+decomposition); net +1 because the query-time seam earned its own pass while the deleted Stage 0 shrank the stage-refinement surface.

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
