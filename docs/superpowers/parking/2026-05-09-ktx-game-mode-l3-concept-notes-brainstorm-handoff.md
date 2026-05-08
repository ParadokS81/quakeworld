# Fresh-terminal handoff -- KTX game-mode Layer 3 concept notes (arc-brainstormer)

**Use as the literal first message in a fresh `claude` terminal.** This terminal runs the multi-pass brainstorm for the new arc captured 2026-05-09. The capturing terminal already wrote the parking doc and retired the prior mis-framed entry; this terminal designs the arc shape so arc-planner can scaffold phases.

---

## Topic

**KTX game-mode Layer 3 concept notes.** Author Layer 3 concept notes for the 27 KTX game modes registered in `gameplay_mechanics` (kind = `game_mode`). Each note's body comes from the QuakeWorld wiki where `wiki_ref` is populated (~10 modes), or hand-authored from operator domain knowledge + L1 props + L2 chat sessions where it is not (~15 modes). Each note's frontmatter cross-references the L1 row by canonical_id. Closes the bloodfest-shape vague-NL retrieval gap surfaced 2026-05-09 in the prod smoke after KTX onboarding shipped.

The infrastructure is already in place: concept-note template + OPERATIONS.md + `search_concepts` hybrid retrieval + embed pipeline + Voyage v4 build/query split. **This arc is mostly authoring, not engineering.** The brainstorm designs game-mode-shape notes within the existing L3 surface; it does NOT redesign that surface.

The thesis (operator's verbatim framing): *"wiki has most of the content we need, it just needs to get synthesized in the md formats we need with the right fields."*

---

## Required reads (in order, COLD)

1. **The parking doc just written:** `docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`. Contains scope sketch, 10 open questions for the brainstorm to resolve, explicit not-in-scope list, operator notes.
2. **Concept-note template:** `apps/qw-oracle/curated/concept-notes/README.md`. Six recognized note shapes; tiered voice; provenance frontmatter schema.
3. **Concept-note operations:** `apps/qw-oracle/curated/concept-notes/OPERATIONS.md`. Stewardship playbook; two-path curation framing (community-curated imports vs newly-earned authoring).
4. **Existing concept notes:** sample 2-3 from `apps/qw-oracle/curated/concept-notes/`. The `client-side-server-exec-allowlist`, `skywind-animated-skyboxes`, and `ruleset-anti-script-restriction-pattern` notes ship today and demonstrate the shipped voice / depth / cross-reference style.
5. **API contracts (Discovery / Query / Storage):** `apps/qw-oracle/API_CONTRACTS.md`. Citation discipline at the top; the new-dataset checklist applies even though we are NOT adding a new dataset (game-mode shape might warrant a `type` discriminator on existing concept-note retrieval).
6. **KTX gameplay schema reference:** `apps/qw-oracle/SCHEMA.md` (specifically `gameplay_mechanics` table; the 27 game_mode rows are the L1 anchors).
7. **Live L1 row sample:** run `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT name, value_text, source_ref, props_json FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='game_mode' ORDER BY name;"` -- inspect 2-3 rows with wiki_ref populated and 2-3 without; you cannot design the cross-reference frontmatter without seeing the actual props_json shape.
8. **Operator memory entries** (read on-demand if a question hinges on operator preference):
   - `feedback_l3_concept_notes_wiki_shape.md` -- most brief (what / how-to-start / rules), few deep.
   - `feedback_jina_reader.md` -- prefer `r.jina.ai` for web fetching.
   - `feedback_plain_english_at_decision_points.md` -- decision sign-offs lead with plain English; SQL DDL / JSON / column lists go to draft files, not chat.
   - `feedback_output_discipline_sentiment.md` -- ASCII only in code and shared docs; natural voice fine in conversation.
   - `feedback_one_question_at_a_time.md` -- interactive scoping defaults to one question per turn.
   - `feedback_planning_first.md` -- read code, present plan, get approval before building.
   - `feedback_no_subagents_for_mechanical_edits.md` -- when a plan ships full file content / per-file diffs inline, execute directly with Edit/Write/Bash.
   - `feedback_scaffold_then_fanout_for_multi_phase_plans.md` -- for 6+ phase implementation arcs, build scaffold (decisions / review-findings / phase-template / handoff-prompt) before drafting; fan out per-phase drafters.
   - `feedback_model_effort_range.md` -- two-axis (size x effort) per dispatched subagent; Sonnet medium floor for reasoning / Haiku for pure text / Opus MAX ceiling.
   - `project_layer3_two_path_curation.md` + `project_concept_notes_vertical_slice.md` -- L3 architecture context.

---

## Skill to invoke

**`superpowers:arc-brainstormer`.** Multi-pass brainstorming. Names the passes upfront, runs each as a named scope, drains each pass into target docs, captures carry-forwards between passes.

For this arc, expect ~3-4 passes:
- **Pass 1:** Note shape (which of the 6 existing shapes fits, or do we need a new one; depth budget per mode; voice tier).
- **Pass 2:** Authoring pipeline (wiki-fetch mechanism; wiki-fidelity vs synthesis; pilot-vs-batch; division of labor between operator and Claude).
- **Pass 3:** Cross-reference + retrieval contract (frontmatter L1-anchor field; orientation update; retrieval validation gate at arc close).
- **Pass 4 (if needed):** Coverage policy for modes without wiki_ref + cross-engine carry-forwards + boundary with the parked L3 multi-domain expansion.

Each pass drains into the parking doc (or the in-progress design spec spawned during Pass 1). Carry-forwards between passes captured explicitly.

---

## Operator preferences (carry forward)

- **One question at a time** during interactive scoping. Batch dumps collapse discussion.
- **Plain English first** at decision points. Lead with the recommendation and the tradeoff; structured detail follows in the draft / spec, not the chat.
- **ASCII only** in code and shared docs. No em-dashes, no smart quotes. Natural voice fine in conversation.
- **Be decisive** -- give architectural recommendations, do not poll for agreement at every micro-step.
- **Verify before claiming complete.** Run live queries against the dev DB to confirm row shapes; do not assume the schema matches what an older doc claims.
- **Trust operator pace estimates.** If operator says "we can do this in a weekend", surface only concrete blockers, not conservative cushioning.
- **Best tool wins, no overkill filter.** Don't pre-reject based on install size or compute cost.
- **Output discipline is sentiment.** Even minor polish slips (em-dashes, filler) are read as discipline drift.

---

## First action

1. **Read the required reads in order.** Cold pickup; do NOT skim. The parking doc is the index; everything downstream of it is context for the open questions.
2. **Sanity-check the L1 state.** Run the SQL query in required-read #7 against the live dev DB. Eyeball 2-3 game_mode rows with wiki_ref and 2-3 without. Confirm the props_json shape matches what the parking doc describes.
3. **Confirm the brainstorm scope with operator in plain English** before invoking arc-brainstormer's Pass 1. Sample question: *"Parking doc lists 10 open questions across 4 likely passes. Want to walk them in order, or open with a specific one (e.g. note shape, since it gates everything else)?"* One question, not a menu.
4. **On operator confirmation, invoke `superpowers:arc-brainstormer`** for Pass 1. Name the pass, set its sub-questions, run the pass, drain to target doc, capture carry-forwards.

---

## When in doubt

- If a finding contradicts the parking doc, surface it. The parking doc is durable but the brainstorm is allowed to amend it; that is exactly what this terminal is here for.
- If a question turns out to be implementation-shaped (sized for arc-planner) rather than shape-shaped, mark it as a planner question and exit that brainstorm pass early.
- If the operator answers a question with a one-line answer, treat it as a hint to keep going, not a complete instruction.
- If the brainstorm reveals the work is actually session-shaped (one focused authoring loop, no real architectural decisions), surface that to operator -- demote to `superpowers:brainstorming` + `superpowers:writing-plans`.

---

End of arc-brainstormer handoff. Fresh terminal: start with the four-step "First action" above, then proceed in pass order.
