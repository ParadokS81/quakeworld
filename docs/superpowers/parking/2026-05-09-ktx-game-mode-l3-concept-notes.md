# KTX game-mode Layer 3 concept notes -- arc capture

**Captured:** 2026-05-09 by arc-classifier mode D.
**Status:** captured (awaiting arc-brainstormer pass).
**Replaces:** the retired HANDOVER entry "Gameplay-table description schema arc" (mis-scoped 2026-05-07; the gap was always Layer 3, not Layer 1).
**L1 foundation evidence:** read `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md` BEFORE authoring mode notes -- it is the verified evidence map for what KTX/MVDSV server-config documentation exists, its quality, and the verdict (foundation solid-enough-with-caveats). The modes structural data (27 game_mode + 317 mode_default already in L1) plus usermodes/wiki prose is the substrate for these notes.

## Why this is arc-shaped

Four classification criteria fire:

- **(2) Multi-phase deliverable** -- pilot note + wiki-fetch pipeline + batch authoring + cross-reference enrichment + orientation update + retrieval validation. Each phase ships independently runnable state.
- **(4) Spec required** -- need to lock the concept-note shape for "game-mode" (vs existing feature / mutator / how-to shapes), the wiki-fetch mechanism, the L1 cross-reference frontmatter convention, and the citation discipline before any authoring starts.
- **(5) Cross-cutting decisions** -- ~6+ commitments every note must respect: template shape, voice tier, wiki-fidelity vs synthesis policy, frontmatter L1-anchor field, depth budget per mode, naming convention.
- **(8) Post-arc review wanted** -- spec-vs-shipped walkthrough at end (which modes shipped wiki-faithful vs synthesized vs deferred; retrieval re-test against the bloodfest query that triggered the arc).

Criterion (1) multi-session and (3) multi-terminal are borderline -- 25 notes can plausibly fit one focused weekend session, but the brainstorm + planning likely warrants its own terminal separate from authoring. (7) mid-arc amendments unlikely once the template locks.

## Scope sketch

KTX has 27 game-mode rows in `gameplay_mechanics` (kind = `game_mode`): the playable-mode catalog. 1on1, ca, wipeout, race, bloodfest, hoonymode, blitz2v2, blitz4v4, ctf, ffa, tot, midair, instagib, and the per-team-size variants (3on3, 4on4, 10on10, etc.). The L1 rows carry structured props (`game_type`, `mode_class`, `activation_cvar`, `source_xrefs`, sometimes `wiki_ref`) but no prose -- a deliberate architectural choice. Layer 3 concept notes are the prose-shaped retrieval surface in the system, and `search_concepts` already supports hybrid retrieval (RRF lexical + semantic) with calibrated thresholds.

This arc delivers Layer 3 concept notes for the playable game modes. Each note frontmatter cross-references the L1 row by canonical_id (e.g. `ktx:game_mode:bloodfest`); body is sourced from the QuakeWorld wiki where `wiki_ref` is populated (~10 modes); hand-authored from operator domain knowledge + L1 props + L2 chat sessions otherwise (~15 modes). After the arc ships, the bloodfest-shape question that triggered the arc ("what is bloodfest mode") will hit `search_concepts` cleanly with strong match_quality and a citable concept slug.

The arc also closes the open Discovery-contract loop: the orientation blob currently teaches consumers to use `search_mechanics` for KTX gameplay content, but a vague-NL "what is X" question is structurally a concepts question, not a mechanics-filter question. Final phase amends the orientation to route mode-shape questions to `search_concepts` first, with `search_mechanics` reserved for stat/filter queries.

Optional Phase N+1 territory: if retrieval evidence after this arc ships shows similar gaps for non-game-mode taxonomies (death_rules, election_types, score_systems, loc_macros, teamplay_messages -- ~71 rows total), a follow-up arc extends concept-note coverage to those kinds. Out of scope here; trigger-defined.

Triggered by 2026-05-09 prod smoke: the first real-world consumer-LLM query against `oracle.slipgate.me/mcp` ("what is bloodfest?") surfaced both Discovery break (since fixed by MCP v0.5.0 image deploy) and the underlying description gap (this arc).

## Open questions for the brainstorm

- **Concept-note shape for game modes.** Six existing recognized note shapes per `apps/qw-oracle/curated/concept-notes/README.md`. Does game-mode fit one of those (likely "feature" or "mutator"), or does it warrant a new mode-shape with its own template? Memory `feedback_l3_concept_notes_wiki_shape.md` says: most should be brief (what / how-to-start / rules), only a few warrant depth -- bloodfest probably gets depth, ffa probably gets a paragraph.
- **Wiki-fetch mechanism.** Jina Reader (`r.jina.ai`) per operator memory `feedback_jina_reader.md`, raw quakeworld.nu wiki API, or copy-paste? Decide once and apply to all wiki-sourced notes.
- **L1 cross-reference frontmatter field.** Field name (`related_entities` / `l1_anchors` / `gameplay_anchors`); citation format (`canonical_id` strings vs structured); whether the field is array-of-objects (with notes per anchor) or array-of-strings. Anchor at API_CONTRACTS.md citation discipline.
- **Pilot vs batch.** One note end-to-end (Clan Arena recommended -- well-documented, well-known, both wiki-rich and community-rich) to lock the template, then batch the rest? Or design the template up-front and batch from the start?
- **Coverage policy for modes without wiki_ref.** Hand-author all 15? Or skip the most obscure (TOT / Tribe of Tjernobyl, certain XonX variants) until community demand surfaces? What's the "minimum viable description" for a niche mode -- 2 sentences plus the activation_cvar?
- **Wiki-fidelity vs synthesis.** Wiki content can be outdated, opinionated, or structured differently than retrieval wants. Policy: faithful adaptation (preserve wiki shape, just trim and link) vs synthesized re-write (use wiki as one input, build a fresh canonical answer)? Tag via `description_origin` (`wiki_adapted` / `wiki_synthesized` / `hand_authored`).
- **Cross-engine question.** Should similar L3 notes exist for ezquake-specific or FTE-specific game-mode-shape entities? KTX is the surfaced gap, but if the brainstorm reveals adjacent gaps in other engines, capture them as a follow-up arc rather than scope-creep this one.
- **Orientation update mechanics.** When this arc ships, the Discovery contract amendment is a small addendum to `serve/mcp/src/orientation.ts`. Does it ride a separate commit, the final-phase commit, or a follow-up MCP redeploy? Implies a v0.6.0 image cut.
- **Retrieval validation.** How do we verify success? Replay the 2026-05-09 bloodfest query against prod after ship; check it surfaces a strong-match concept note with citation; sample 3-5 other modes to confirm. Add to phase-boundary verification.
- **Authoring division of labor.** Operator + Claude collaborative writing per concept-note tier conventions. Brainstorm should settle: who drafts (Claude proposes, operator approves), how reviews work, what counts as "ready to commit".

## What is NOT in scope

- **Description columns on `gameplay_mechanics` / `gameplay_entity_defs`.** The architectural read on 2026-05-09 confirmed prose belongs in Layer 3, not Layer 1. The retired parking entry (Gameplay-table description schema arc) was the wrong framing.
- **L3 concept notes for non-game-mode taxonomies** (death_rules, election_types, score_systems, loc_macros, teamplay_messages, drop_items, monsters). Defer to a follow-up arc once retrieval evidence after this ship justifies it. `mode_default` rows (~317) explicitly skipped -- each row's prose duplicates a cvar description already on `entities`.
- **ezquake / FTE / MVDSV / QWCL gameplay-mode notes.** KTX is the surfaced gap. Cross-engine coverage is a separate question; capture as follow-up if the brainstorm uncovers parallel gaps.
- **Wiki-content fact-checking against L2 chat corpus.** If an obvious contradiction surfaces during authoring, flag it; otherwise out of scope. Wiki is treated as authoritative-enough for V1.
- **L3 multi-domain bucket framework expansion.** Has its own parking doc (`docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md`); this arc is a focused subset under the existing concept-notes shape.
- **Modifying the 7 shipped KTX match_event narratives** (commit `7cd951c4`). Those are entity-shape facts on `entities.description` with `description_origin='synthesized'`; structurally different from game-mode prose. They stay where they are.
- **MCP code redeploy mechanics.** Routine-redeploy is documented in DEPLOYMENT.md and was exercised 2026-05-09; the orientation update at arc close is a one-line redeploy cycle, not arc-scope work.

## Operator notes

- Operator's verbatim framing 2026-05-09 (this conversation): *"wiki has most of the content we need, it just needs to get synthesized in the md formats we need with the right fields."* That sentence is the arc's thesis.
- Operator expectation: this is **mostly authoring work, not engineering**. The infrastructure is in place (concept-note template + OPERATIONS.md + search_concepts hybrid retrieval + embed pipeline + Voyage v4 build/query split). Brainstorm should not redesign the L3 surface; it should design the game-mode-shape note within the existing surface.
- Trigger fired 2026-05-09 in prod smoke. The bloodfest query proved (a) the data is there, (b) Discovery is now correct (post v0.5.0 deploy), (c) the description gap is the load-bearing remaining cause of weak retrieval. Replay-the-bloodfest is the natural verification gate at arc close.
- Style: most notes brief (what / how-to-start / rules), only a few warrant depth. Per memory `feedback_l3_concept_notes_wiki_shape.md`. Bloodfest probably depth (unique mode, niche meta, well-discussed). FFA probably one paragraph.
- The `guide-rewrite` skill at `~/.claude/skills/guide-rewrite/` exists for ezquake.com docs imports and provides a discipline reference for the wiki-source-to-concept-note pipeline. Not directly applicable (different upstream), but the operating shape (entity verification + coverage-gap detection + commit-ready output) generalizes.
- Output discipline: ASCII only, no em-dashes, no filler per `feedback_output_discipline_sentiment.md`. Plain English first at decision points per `feedback_plain_english_at_decision_points.md`.
- KTX onboarding arc shipped 2026-05-07; post-review investigation closed 2026-05-09 with prod deploy. This arc starts from a fully-shipped base state -- no waiting on prerequisites.

## Related

- `apps/qw-oracle/curated/concept-notes/README.md` -- concept-note template + 6 recognized note shapes.
- `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` -- stewardship playbook.
- `apps/qw-oracle/API_CONTRACTS.md` -- Discovery / Query / Storage contracts; new-dataset checklist; citation discipline.
- `apps/qw-oracle/docs/arc-history.md` -- KTX onboarding retrospective at top; describes the gameplay tables this arc ports out to L3.
- `apps/qw-oracle/serve/mcp/src/orientation.ts` -- target of the Discovery-contract amendment at arc close.
- `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` -- KTX gameplay arc design spec; established the gameplay_mechanics structural model.
- `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` -- broader L3 expansion arc; this game-mode arc is a focused subset.
- Memory entries (operator preferences carried forward):
  - `feedback_l3_concept_notes_wiki_shape.md` -- concise what/how-to-start/rules; most brief, few deep.
  - `feedback_jina_reader.md` -- prefer `r.jina.ai` for web fetching.
  - `feedback_plain_english_at_decision_points.md` -- decision sign-offs lead with plain English.
  - `feedback_output_discipline_sentiment.md` -- ASCII only in code and shared docs.
  - `feedback_one_question_at_a_time.md` -- interactive scoping defaults to one question per turn.
  - `feedback_planning_first.md` -- read code, present plan, get approval before building.
  - `project_layer3_two_path_curation.md` -- community-curated imports + newly-earned authoring.
  - `project_concept_notes_vertical_slice.md` -- L1 anchors + L3 substance + optional L2 garnish.
- HANDOVER section "Future arcs (waiting on trigger)": this arc replaces the retired "Gameplay-table description schema arc" entry.
