# Handover: asset-type-curate Phase 3 fan-out prep

**Dispatched:** 2026-05-13
**Type:** session-boundary handover (fresh terminal continuation)
**Source:** end-of-session handover after Phase 2 (skybox slice) + post-calibration polish
**Predecessor commits:** `4a4eade0` (initial slice) + `b877f618` (post-calibration polish)

This handover takes a fresh `claude` terminal from cold to "ready to plan Phase 3 fan-out" for the asset-type-curate skill arc. The work shipped to date is calibrated and stable; the next move is fan-out planning (NOT execution -- planning lands first, fan-out is a separate dispatch).

## Where things are

**Skill arc status.**
- Phase 1: skill scaffold, references/, OPERATIONS.md, scope discipline. Shipped.
- Phase 2: skybox first slice (DIVERGENT). Shipped at commit `4a4eade0` and polished at `b877f618` after fresh-terminal calibration.
- Phase 3: 19-slug fan-out. Pending planning.

**Bucket state.** `apps/qw-oracle/curated/asset-notes/` has two notes:
- `player_skin.md` (84 lines, CONFIDENT) -- shipped earlier; has concept-note partner at `../concept-notes/player-skins.md`.
- `skybox.md` (164 lines, body ~104, DIVERGENT) -- shipped this session.

Both populated in `README.md` "Current notes" table. Skill discipline + length tiers + threshold rule + related_entities convention all codified user-global at `~/.claude/skills/asset-type-curate/`.

**L1 extractor state.**
- 4 previously-zero-site slugs (crosshair, levelshot, model_texture, map_texture) now have ezQuake L1 coverage (commit `1694e3c5` from Terminal A). FTE coverage: crosshair + levelshot have L1; model_texture + map_texture remain L1-blocked on FTE side (downstream-discrimination pattern -- captured as Enhancement 3 in parking).
- 3 L1 capability enhancements parked at `docs/superpowers/parking/2026-05-13-l1-extractor-asset-loader-enhancements.md` (static-array path enumeration, multi-mode loader dispatch, path-argument analysis for downstream-discriminated loaders). All skybox-near-unique or 1-2 slugs; not blocking the fan-out.

**Slug classification for fan-out** (from 2026-05-13 scope-probe across 19 remaining slugs):

| Category | Slugs | Expected shape |
|---|---|---|
| Engine-internal (likely SPARSE) | palette, colormap, map_entities, config, demo, demo_archive | Short SPARSE drafts; engine-managed stock-only; ~40-60 body lines each |
| Standard user-asset (Simple/Moderate tier) | conback, charset, crosshair, hud_element, wad_file, levelshot, sound, locfile, model_q1 | 60-100 body lines each; single-mode single-engine-ish |
| Standard with static-array enum | map_lighting | 70-90 body lines; seed compensates for L1 gap |
| Asymmetric L1 (ezQuake yes, FTE no) | model_texture, map_texture | DIVERGENT drafts; FTE-side downstream-discrimination noted |
| Special: own design question | map | BSP-format dispatch; own slice, consider in dedicated session |

Total remaining: 19 slugs (6 SPARSE + 12 standard + 1 special).

## Reads required

In this order, before doing any planning work:

1. `apps/qw-oracle/CLAUDE.md` -- qw-oracle project layout, status, conventions.
2. `apps/qw-oracle/curated/asset-notes/README.md` -- bucket purpose, frontmatter schema, current notes table.
3. `apps/qw-oracle/curated/asset-notes/OPERATIONS.md` -- stewardship playbook, status-flag triage, **scope discipline** rule (three-layer wiki-feeder model), workflow.
4. `~/.claude/skills/asset-type-curate/SKILL.md` -- the skill's 6-step pipeline.
5. `~/.claude/skills/asset-type-curate/references/asset-note-template.md` -- frontmatter schema, **length targets (body lines only)**, scope discipline expanded, related_entities convention.
6. `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md` -- threshold rule + 5 flags + skybox case study.
7. `docs/superpowers/parking/2026-05-13-l1-extractor-asset-loader-enhancements.md` -- 3 L1 capabilities parked; revisit triggers.
8. `apps/qw-oracle/curated/asset-notes/skybox.md` + `apps/qw-oracle/docs/asset-curation/skybox-investigation.md` -- the Phase 2 shipped artifacts. Read both as calibration anchors for what "good" looks like.
9. `apps/qw-oracle/curated/asset-notes/player_skin.md` -- the other shipped reference; shows the concept-note-partner case.

## Critical rules / context

These are load-bearing rules that emerged from the Phase 2 + calibration work. The skill encodes them but the handover surface them for the fresh terminal:

1. **Asset-notes are downstream wiki-page feeder substrate, not standalone encyclopedias.** L1 + asset-note + concept-note compose into LLM-generated wiki pages later. Compress sprawl, keep depth. (See memory `feedback_l3_three_layer_wiki_feeder`.)

2. **Length targets count body lines only.** Frontmatter is hard-codified facts and doesn't count. Body tiers: Simple 40-70 / Moderate 70-100 / Rich 100-140 / Hard ceiling 160.

3. **L1-GAP threshold:** halt the draft only when the gap blocks an honest write. Static-array enumeration gaps and downstream-discrimination gaps are enrichment-grade (the seed compensates); flag DIVERGENT or CONFIDENT and note the extractor follow-up in investigation. Skybox + model_texture/map_texture (FTE side) are precedents.

4. **related_entities uses user-facing cvar/command names.** FTE's `CVARFC`/`CVARFD` macros put the user-facing name in the first arg, often differing from the C var. Verify each entry against source via grep; don't speculate cross-engine.

5. **README "Current notes" table update is orchestrator-side at batch commit time.** Sub-agents in fan-out should NOT touch the README -- avoids merge conflicts. Orchestrator updates the table once per batch when committing the slice outputs.

6. **No fresh worktree per skill invocation.** Per project workflow, work in the main tree. Commit directly to main (no PR ceremony) -- see CLAUDE.md "Git workflow" section.

7. **The "user does not touch git" rule applies.** The orchestrator (you, the next terminal) runs git silently. The operator gets summaries, not git command prompts.

## First three actions

When the fresh terminal opens, do these in order:

1. **Read the required docs (above)** -- in particular, the skill template + OPERATIONS' scope discipline section + skybox.md as the calibration anchor. Don't skip reading skybox.md; the discipline is most legible by example.

2. **Decide the Phase 3 shape with the operator.** Three viable shapes -- present and ask, don't pick unilaterally:

   - **Option A: batched parallel fan-out** (fastest). Spawn ~5-6 fresh terminals, each takes a batch of 3-4 slugs. Orchestrator (this session) collects results, refines, commits as one batch. Estimated 1-2 hours wall time for 19 slugs.
   - **Option B: sequential single-terminal walks** (slowest, safest). Run `/asset-type-curate <slug>` for each slug in sequence in fresh terminals, one at a time. ~12-15 hours wall time. Best for catching skill drift early.
   - **Option C: tiered fan-out** (compromise). Start with SPARSE batch (6 slugs, expected fast). If that lands clean, proceed to standard batch. Map gets its own slice. Estimated 4-6 hours wall time.

   Default recommendation: **Option C**. Catches drift after the cheapest batch; gives operator a checkpoint before committing the standard batch.

3. **If operator agrees on a shape, write the fan-out plan as a parking doc** at `docs/superpowers/parking/2026-05-14-asset-type-curate-phase3-fanout-plan.md` (or whatever date is current). Include per-batch handoff prompts, expected flag distribution, batch-commit message template, and the README table update plan.

## When in doubt

- **On scope (asset-note vs concept-note):** ask the test "does this affect WHAT files the user installs or WHERE they go? Does it answer 'how does this cvar behave' in one line?" If yes, in. If no, concept-note material (defer or skip).
- **On length:** if a slug feels like it wants 180+ body lines, compress mechanism prose and defer to investigation; the body should be at most Rich tier.
- **On L1 gaps:** check the threshold rule -- can the investigator source-read and can the seed compensate? If yes, enrichment-grade; draft DIVERGENT or CONFIDENT.
- **On commits:** one commit per batch in fan-out; commit message names the slugs + flag distribution. Use the `b877f618` and `4a4eade0` commits as style anchors.
- **On the operator pace:** they prefer recommendations + execution over poll-for-approval menus. Be decisive; flag concrete blockers only.

## Open considerations (for the operator to weigh, not for the orchestrator to decide)

These surfaced in Phase 2 but were intentionally deferred:

1. **`map` slug shape.** Multi-engine + BSP-version dispatch (Q1 V29 / HL / BSP2 / V29a) is a different shape from skybox's cvar-driven multi-mode. Worth thinking about whether `map` is one note or needs splits per BSP variant. The probe flagged it; no decision yet.

2. **Empty l1_hint_function_names for the 4 newly-unblocked slugs.** Terminal A's commit `1694e3c5` should have populated the seed's l1_hint_function_names for crosshair/levelshot/model_texture/map_texture (derived from the now-correct extractor output). Verify before dispatching their slices.

3. **MCP routing for asset-notes.** Currently deferred per `API_CONTRACTS.md` L3 expansion pattern. Trigger to revisit: ~16-20 drafts landed. After Phase 3 fan-out completes, this trigger fires.

4. **Concept-note partner candidates.** Phase 3 will surface 1-3 more slugs that earn concept-note partners (per the skill's Step 5 "Suggested concept-note partner" finding). Capture in fan-out output but author the concept-notes in a later session.

## Predecessor session summary (for context only)

This session shipped:
- Phase 2 skybox slice with full investigation + draft (commit `4a4eade0`)
- 3 seed deltas for skybox (FTE single-image paths, extensions note, skywind cfg)
- 5 skill discipline patches after fresh-terminal calibration found drift (commit `b877f618`)
- L1 capability parking doc (3 enhancements)
- Terminal A handoff + return (4 zero-site slugs unblocked, commit `1694e3c5`)
- Calibration handoff + return (skill discipline self-contained confirmed)
- Memory: `feedback_l3_three_layer_wiki_feeder.md` (three-layer model + body-only length targets)

The conversation drove iterative refinement of the scope discipline: started with "asset-notes are file classification only" -> operator pushback "the notes feed wiki + MCP + concept-note authoring" -> landed on "compress sprawl, keep depth" three-layer feeder model. Skybox was a deliberate hard-case stress test; the discipline that came out of it scales to the simpler 19 remaining slugs.

## Predecessor context window note

The session that produced this handover hit ~400k tokens. Fresh terminal starts with no orchestrator context; that's the point. Trust the reads + skill + memory to carry the load-bearing knowledge. If something feels under-specified, the orchestrator session may have over-specified it conversationally and under-specified it in the artifacts -- in that case, ask the operator before guessing.
