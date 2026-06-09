You are drafting the **Phase 2** MD for arc **`2026-06-09-demand-driven-l3-concept-authoring`** -- the L3 player-help concept-notes arc. You are DRAFTING the phase plan, not executing it.

**Sibling-arc guard:** the neighbor is `2026-06-09-docs-quake-world` (the L1 reference site). VitePress / build-snapshot reads = wrong arc, stop. This arc authors concept notes.

**Working directory:** `/home/paradoks/projects/quakeworld/`

## What Phase 2 delivers

**Tier-2: ~10 player-help notes -- completing the player-help core (~16-17 total with Tier-1).** Same authoring + gating model as Phase 1. The domains (per `decisions.md` D1):

1. Display config (resolution, conscale/conwidth, fov, refresh/maxfps) -- 185.
2. Mouse & input (sensitivity, m_pitch, in_raw, accel) -- 135.
3. Audio config (sound, ambient, SDL_AUDIODRIVER, s_khz) -- 119.
4. Ruleset & legality (f_modified, "is X allowed/a cheat") -- 105.
5. Maps & loc files (loc packs, custom maps) -- 103.
6. Config files & management (cfg_save, exec, file locations) -- 102.
7. Finding & joining games (server browser, sources.txt, connect) -- 83.
8. Binds & aliases (general scripting, console) -- 69. **Owns the scripting *primitive*** -- weapon-scripts etc. link here rather than restating it (contract: own-your-layer-and-link).
9. Teamplay comms (tp_msg, teamsay, colored text) -- 64.
10. Spectating & QTV (autotrack, following) -- 58.

**Fonts & charset** (61) folds into the HUD or console note -- do NOT author it standalone unless the source material genuinely overflows; record the fold either way.

## Inputs from Phase 1 (must exist + be approved)

The Phase-0 machinery (skill + runner + guardrail), now proven on Tier-1's 7 notes. Phase 2 is the same shape at a different tier -- if Phase 1 surfaced a skill or runner gap, it should already be amended before Phase 2 starts.

## Required reads

Identical to Phase 1's reads (decisions D1-D6/D10/D14, findings F5, phase-template, the contract, the `domain-concept-curate` skill, the demand map + `faq-clusters.json` for each domain's threadIds, the 3 template notes). Plus: skim the **Phase-1 notes** that already shipped -- Tier-2 notes link to them (own-your-layer-and-link), so know what exists before re-explaining a primitive.

## How to draft

Same task shape as Phase 1: **one task per domain**, `subagent (Sonnet MAX)`, parallel within the tier; each task invokes `domain-concept-curate`, maps the domain to its threadIds, authors, `bun run load-concepts`, gates (runner NAILED + zero-confab), then operator prose review.

**One Tier-2-specific rule to encode in the MD:** the **own-your-layer-and-link** discipline matters more here than in Tier-1, because Tier-2 has overlapping topics (Binds & aliases owns the scripting primitive; HUD/console owns fonts; weapon/LG/teamplay notes USE scripting). Each note links to the owning note instead of restating -- the verifier checks for restated primitives.

## Verification at the phase boundary

- All Tier-2 notes load clean; each = NAILED + zero-confab on its threads; each operator-reviewed.
- The fold decision for fonts/charset is recorded.
- The player-help core (~16-17 notes) is complete -- the docs portal's guide menu is filled.

## After drafting

Sub-agent verify (brief in `phase-template.md`), apply findings (decisions win on conflict), then halt with the standard status report. Do NOT author the notes.
