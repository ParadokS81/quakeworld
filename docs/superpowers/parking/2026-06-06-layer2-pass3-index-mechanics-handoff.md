# Layer 2 corpus reconstruction -- Pass 3 (Index mechanics) brainstorm handoff

**For:** a fresh terminal resuming the multi-pass brainstorm at **Pass 3**, via the `arc-brainstormer` skill.
**Created:** 2026-06-06. The Pass 2 calibration gate (an implementation probe, not brainstorm) is DONE; its verdict scopes this pass.
**Mode:** BRAINSTORM (arc-brainstormer), NOT implementation. Drain into the spec's Pass 3 section + the spine.

## Where things are

The brainstorm is at **Pass 3 of 5**. Passes 1, 1.5 (lazy-retrieval reshape), and 2 (calibration-gate *design*) are complete. Pass 2's implementation probe ran 2026-06-05/06 and returned a verdict that scopes Pass 3.

**Probe verdict -- now SETTLED, do not re-litigate:**
- **LLM fencing (arm D) wins.** D-vs-C **72%** (helpdesk 83% / quakeworld 70%), D-vs-B **69%** (B even had a self-recall advantage and still lost), coherence D **4.4** vs C **3.5** /5, arm-D index-hallucination **0.0%** at the 750-message cap. Wins on BOTH channels -> no per-channel asymmetry, fence everywhere.
- **Embeddings are load-bearing** -- lexical FTS alone (arm A) whiffed `[NO HIT]` on 32/36 queries. voyage-4-large (doc) / voyage-4-lite (query) confirmed.
- **Sonnet, not Opus**, is the fencing model: it matched/beat Opus on disentanglement (it split the 362-msg monster chunk into 11 clean threads where Opus lumped it), and Opus tripped the shared account-wide rate limit. Default reasoning effort (fencing is a reading task, not a deliberation task).
- Net: the decision-rule branch that would have KILLED Stage 2 (B or C within margin of D) did NOT fire. **Stage 2 LLM fencing is justified -- build it.**

**Artifacts:**
- Results + full tables + honest caveats: `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md`.
- Probe code = the production recipe: `apps/qw-oracle/scripts/calibration/` (5 deterministic Bun stages + `wf-a-fence-queries.js` / `wf-b-judge.js`). Point these at the full corpus when building for real. The embed cache persists (re-embedding overlapping text never re-bills).

## Reads required (in order)

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- THE SPEC. Pass 3 scope is the `### Pass 3: Index mechanics` section (~line 221). Also read the Reshape (Pass 1.5) section and Pass 2 outputs.
2. `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md` -- the verdict + numbers that scope this pass; read the Caveats section (esp the chunk-size "sweep UP" note).
3. `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- the 287-line architectural spine; ~80% of the pipeline incl the `chat_threads` + `thread_messages` schema draft, `resolution_status`, buckets.
4. `docs/research/2026-06-05-chat-corpus-retrieval-methods.md` -- the **Uncharted** section: #3 (chunk-size sweep) and #5 (cross-session merging) are STILL OPEN after the probe.
5. `apps/qw-oracle/scripts/calibration/` (README + the scripts) -- the recipe Pass 3 productionizes; reusable for a cheap follow-on sweep probe.

## What Pass 3 must decide (index mechanics, scoped by the verdict)

- **Production chunk size.** Probe used cap 750 with 0% hallucination (Uncharted #3). Sweep UP (1500 / 3000) -- bigger chunks = fewer LLM calls = cheaper at full-corpus scale, IF fencing stays clean. Decide the production cap; likely warrants a cheap follow-on sweep using the calibration harness rather than a guess.
- **Rate-limit-at-scale (NEW constraint the probe surfaced).** The full corpus is ~675k messages = thousands of fence agents. The probe's `conc-5 Sonnet + paced waves + recovery-retry + honest fail-count` recipe held at 251 agents / 32 min and did NOT starve other terminals. Productionizing needs an incremental/batched strategy. OPEN OPTION: promote the Feb-Mar 2021 slice (already fenced, hallucination-free) to "production increment 1" instead of throwaway.
- **Storage schema.** Finalize `chat_threads` + `thread_messages` from the spine (vector embedding column, `resolution_status` CHECK enum, GIN tsvector, junction-table PK). New `db/migrations/NNN_*.sql` + `SCHEMA.md` update.
- **Cross-session merging (Stage 3) -- STILL UNCHARTED (Uncharted #5).** The probe tested *within-chunk* fencing, NOT merge. Multi-year recurring-topic linkage + many-to-many thread membership have no literature precedent. Cosine ~0.85 + participant-overlap + reply-graph; clustering (HDBSCAN / Louvain). Strong candidate for its own follow-on probe before speccing.
- **Retrieval shape.** Probe showed embeddings load-bearing AND FTS-alone insufficient -- but a HYBRID (embedding + FTS) could still help exact-name queries (the anchor subset where FTS *can* hit a named cvar). Decide pure-vector vs hybrid + optional rerank.
- **Channel + time scope.** helpdesk + quakeworld confirmed valuable; dev-corner / antilag? How far back in time?
- **Analyzer JSON reshape.** `role_suggestions` out (re-homed to query-time, Pass 4/5); abstain reason reworded from "primer doesn't cover" to topic-boundary uncertainty.

## Critical rules

- **Brainstorm, not build.** Use arc-brainstormer. Exit Pass 3 when remaining unknowns are implementation-shaped (sized for arc-planner at Pass 5), not shape-shaped.
- **Do NOT re-litigate the verdict.** "D wins, Sonnet, embeddings essential, fence both channels" is settled. Build on it.
- **Honor the reshape.** Embedding is knowledge-free; community knowledge resolves at query-time (Pass 4), not as an index-time primer.
- **The rate-limit lesson is load-bearing for production.** A large Opus burst starves other terminals; Sonnet + low concurrency + pacing + honest fail-counts is the discipline at scale.

## First three actions

1. Read the spec's Pass 3 section + the results doc + the spine. Confirm the Pass 2 -> 3 carry-forwards.
2. Invoke `arc-brainstormer` for "Pass 3 of Layer 2 corpus reconstruction (index mechanics)"; name the Pass 3 sub-questions upfront (chunk-size sweep / storage schema / cross-session merge / retrieval shape / scale + rate-limit / channel + time scope / analyzer reshape).
3. Triage each sub-question as settled-by-probe vs still-open. Flag **cross-session merge** and **chunk-size sweep** as the two highest-value open items -- both are cheap follow-on probes on the existing harness, not guesses.

## When in doubt

Pass 3 builds the index, scoped by a probe that said: fence with an LLM (Sonnet), it beats the cheap arms, embeddings are essential, and at cap 750 the fencer is hallucination-free so push chunk size up. The two things the probe did NOT settle -- the chunk-size sweep (#3) and cross-session merging (#5) -- are the highest-value unknowns; if either needs numbers, reuse `scripts/calibration/` for a cheap follow-on probe rather than speccing blind.

---

**Handoff prompt (paste in a fresh terminal):**

> Pass 3 of the Layer 2 corpus reconstruction brainstorm (index mechanics). Read `docs/superpowers/parking/2026-06-06-layer2-pass3-index-mechanics-handoff.md` and resume via the arc-brainstormer skill.
