# Arc-planner handoff: demand-driven L3 player-help concept authoring

**For:** a FRESH terminal to PLAN (scaffold) this arc. The brainstorm/shaping is DONE (2026-06-09 session) -- this routes straight to **`arc-planner`**, not arc-brainstormer.
**Date:** 2026-06-09.

## What this arc is (one paragraph)

Author a finite, demand-ranked set of ~16-17 **player-help Layer 3 concept notes** that turn the #helpdesk demand into precomputed, fact-checked "gold on a platter" -- so a single `search_concepts` retrieval answers the majority of a domain's questions instead of the LLM digging through raw L2 chat. Claude drafts each note from the complete L1 descriptions + live codebase (source truth) + the L2 demand threads; the operator reviews the prose; **each note is gated by the hypothesis-test harness** -- it must move its domain's representative threads from dig/PARTIAL to platter/NAILED, catch the QW-specific gotcha, and introduce no confabulated cvars. The 3 existing notes are the template, and one of them (weapon-scripts) already passed the harness in this session's test.

## Required reads (in order)

1. **`docs/superpowers/parking/2026-06-09-demand-driven-l3-concept-authoring.md`** -- START HERE. The full capture: validated product context, the hypothesis-test result, the resolved domain taxonomy + ranking (24 domains with real thread demand + tiers), the scope decision, and the open questions left for planning (with recommendations baked in).
2. `docs/superpowers/parking/2026-06-09-helpdesk-faq-landscape.md` -- the 48-cluster demand map (detail behind the taxonomy).
3. The 3 template notes: `apps/qw-oracle/curated/concept-notes/{weapon-scripts,player-skins,lightning-gun-customization}.md` -- the shape / voice / depth to match.
4. The acceptance-gate harness: `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` (`faq-retrieve.ts` = real retrieval against dev + grounding bundle; `faq-verify.ts`/`faq-verify2.ts` = confab check; `faq-domains.ts` = taxonomy; `outputs/` = the 11-thread run). NOTE: currently hardcoded to `/tmp` paths + the 11-thread list -- generalizing it into a per-domain acceptance runner is a planned prerequisite.
5. The concept loader: `apps/qw-oracle/scripts/load-concepts/` (`index.ts`/`parse.ts`/`upsert.ts` + CLAUDE.md) -- how a new note gets parsed + embedded into `concepts`/`concept_chunks` so `search_concepts` can retrieve it (required before a note can be harness-tested).
6. The authoring pattern: the `guide-rewrite` skill (Path-2 synthesis -- how the existing notes were authored).
7. Memories: `project_qw_oracle_product_vision` (this arc's empirical validation), `project_concept_notes_vertical_slice` (L1 anchors + L3 substance + L2 garnish), `project_layer3_two_path_curation` (Path-2 default + earn-the-note tests), `reference_layer3_concept_note_template`, `feedback_model_effort_range`, `feedback_prose_brainstorm_for_architecture`.

## What the planner must produce

The standard six-artifact arc scaffold under `docs/superpowers/plans/2026-06-XX-<slug>/` (decisions / review-findings / prerequisites / phase-template / handoff-prompt / README), with slicing analysis + per-task execution mode (subagent + model + effort) annotated.

Suggested phase shape (planner finalizes):
- **Phase 0 -- guardrail + harness:** (a) the anti-confab orientation-prompt rule ("never name a cvar/command absent from the grounding"); (b) generalize the harness into a per-domain acceptance runner (domain -> its cluster threadIds -> retrieval -> fresh-Claude answer -> score vs community + confab check).
- **Phase 1 -- Tier-1 (7 new notes, ~41% of all demand):** HUD config, onboarding/install, world-rendering & brightness, textures/models, network/connection, projectile/powerup cosmetics, demo recording.
- **Phase 2 -- Tier-2 (~10 notes):** display config, mouse/input, audio, ruleset/legality, maps/locs, config-file mgmt, server browser, binds/aliases, teamplay comms, spectating/QTV (fonts folds into HUD/console).
- **Phase 3 (decide in/defer) -- caveated checklist notes:** performance/stutter, crash, Linux -- honest diagnostic + correct cvars, NOT guaranteed fixes.

Open decisions for the planner (recommendations are in the parking doc): extend `guide-rewrite` vs fork a `domain-concept-curate` skill; the exact acceptance-gate regime; fan-out shape (notes are independent within a tier -> parallel drafts at Sonnet-high-class effort per the existing notes).

## Scope guards (do NOT relitigate)
- **Player-help core only.** Server admin/hosting (408 threads) is its OWN future arc -- different audience, cross-engine (mvdsv/ktx/qtv/qwfwd), likely several notes (install vs maintain). Deferred.
- The ~11% noise tail (hardware-buying recs, server-down status, OOD like GIMP-editing, discord-invite) is NOT note-able.
- Notes synthesize from **source truth** (L1 descriptions + live codebase + L2 threads); cite, never confabulate.

## Operator preferences carried forward
- One question at a time; plain English first; prose (systems/architecture = no visual companion).
- Momentum over ceremony; decisive recommendations over polls.
- **Claude drafts the notes; the operator reviews the PROSE** (his gate).
- ASCII discipline (hyphens, not em-dashes). Operator pace estimates beat conservative ones.

## First action
Read the parking doc (#1) cold, then a template note (#3) to calibrate on shape. Then begin the `arc-planner` scaffold -- start with `decisions.md` (lock the cross-cutting commitments: methodology/skill, acceptance gate, scope, model+effort) before slicing phases.

## When in doubt
The arc delivers a bounded, demand-ranked set of player-help notes, each MEASURED (not just written) against real #helpdesk threads. The engine already works via L2-fallback; these notes upgrade it good->great (no digging, no confabulation). Bounded at ~16-17, front-loaded (7 notes = 41%). Not endless.
