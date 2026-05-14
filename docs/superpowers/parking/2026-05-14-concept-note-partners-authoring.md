# Side-quest: Concept-note partner authoring (player_skin / hud_element / map)

**Type:** authoring arc (3 sessions, one per partner)
**Surfaced:** 2026-05-14, after Round 3 calibration surfaced 2 partner-candidates
**Pressure:** LOW. Asset-notes ship without partners; partners enhance retrieval for cross-domain queries but aren't gating.
**Predecessor:** Round 3 calibration commits 3d2a1867, 03449c65, 45617006

---

## Why this arc exists

Three asset_types have earned a concept-note partner per the asset-type-curate skill's `## Suggested concept-note partner` heuristic. The asset-note covers "what is this file and how does it load"; the concept-note covers "how do players use it in competitive play" -- cross-domain workflows that exceed the asset-note's scope.

Authoring concept-note partners is NOT the asset-type-curate skill's job (the skill flags candidates only). It uses the standard Path 2 (newly-earned authoring) workflow per `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` Section 2.

---

## Three partners to author

### 1. `player-skins.md` -- SHIPPED (verify cross-reference)

Already exists at `apps/qw-oracle/curated/concept-notes/player-skins.md`. The 2026-05-13 player_skin asset-note shipped with the partner pair. Verify:
- player_skin.md "Related" section points to player-skins.md (concept-note partner)
- player-skins.md "Related" section points to player_skin.md (asset-note partner)
- Both notes are mutually discoverable via search_concepts

No authoring work needed for this partner unless verification surfaces drift.

### 2. `hud-configuration.md` (or similar) -- TO AUTHOR

**Trigger asset-note:** `hud_element.md` (commit 03449c65)

**Content scaffold from hud_element-investigation.md:**

- `scr_newhud` mode selection (0 = FuhQuake-compat sbar, 1 = HUD 2.0, 2 = both)
- HUD 2.0 element placement: `show` / `hide` / `place` / `align` / `move` / `hud_recalculate`
- HUD editor (`hud_editor`) interactive configuration workflow
- Built-in layout configs (`cfg/hud_berzerk`, `cfg/hud_corner`, etc.)
- `hud_planmode` for preview-mode configuration
- Community HUD sets and how to install them (individual files vs. WAD archive method)
- FTE's CSQC-based HUD: why the WAD override path doesn't apply, what does work for FTE users

**Authority grounds:** primarily `engine_mechanics` (source-verifiable) + `community_consensus` (HUD set conventions).

**Cross-references:** hud_element.md (asset-note), wad_file.md (companion archive method), scoreboard-related concept-notes (if any exist).

**Estimated length:** 200-400 body lines (medium concept-note, multi-system).

### 3. `map-selection-workflow.md` -- TO AUTHOR

**Trigger asset-note:** `map.md` (commit 03449c65)

**Content scaffold from map-investigation.md:**

- The `map` vs `changelevel` vs `sv_maprot` command semantics (server admin perspective)
- KTX match-start map voting (the `/vote map <mapname>` flow, map approval lists)
- `timelimit` / `fraglimit` automatic level changes (ruleset gates on map duration)
- QWFWD / QTV pass-through behavior on map change
- The `/maplist` and `/check_maps` commands (server-side map enumeration)
- Competitive map pool conventions (dm2, dm4, dm6, aerowalk, ztndm3, etc. -- the institutional map set that defines match eligibility)

**Authority grounds:** mixed `engine_mechanics` (command semantics) + `community_consensus` (map pool) + `operator_sme` (competitive-play workflow).

**Cross-references:** map.md (asset-note), map_texture.md / map_lighting.md / map_entities.md / skybox.md (companion asset-notes), KTX gameplay concept-notes (if any exist), tournament/competitive concept-notes.

**Estimated length:** 250-500 body lines (rich concept-note, multi-domain).

---

## Approach (per-partner session shape)

Each partner gets its own fresh-terminal session:

1. **Pre-flight.** Read the trigger asset-note. Read the investigation's `## Suggested concept-note partner` section. Read `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` Section 2 for the Path 2 authoring workflow.
2. **Source verify.** For each cvar/command mentioned in the scaffold, verify source (file:line). For KTX-side content (vote, maprot), check the KTX source repo if available.
3. **Corpus / SME pass.** Where relevant, check community sources (Discord excerpts via Layer 2 retrieval, gfx_comment table for hud sets, etc.).
4. **Draft.** Author the concept-note in `apps/qw-oracle/curated/concept-notes/<slug>.md` per the four-grounds authority convention and the chunk-first answer rule for notes > 80 lines.
5. **Cross-reference.** Update the trigger asset-note's "Related" section to point at the new partner.
6. **Commit.** Per concept-note OPERATIONS.md.

Order recommendation: hud-configuration first (smaller scope, simpler verification), then map-selection-workflow (deeper cross-domain).

---

## Success criteria

- 2 new concept-notes shipped (player-skins already exists).
- Cross-references closed: each partner pair (asset-note <-> concept-note) is mutually discoverable.
- MCP retrieval test: vague-NL queries about HUD configuration or map selection workflow surface the partner concept-notes alongside the asset-notes.

---

## Pointers

- Concept-notes bucket: `apps/qw-oracle/curated/concept-notes/`
- Concept-notes OPERATIONS: `apps/qw-oracle/curated/concept-notes/OPERATIONS.md`
- Existing partner pair: `player_skin.md` + `player-skins.md` (canonical pattern)
- Trigger asset-notes: `hud_element.md` + `map.md` (commit 03449c65)
- Investigation reports (scaffolds): `apps/qw-oracle/docs/asset-curation/{hud_element,map}-investigation.md`
- Sibling arcs:
  - Phase 3 fan-out: `2026-05-14-asset-type-phase-3-fanout.md` (may surface more partner candidates -- `sound`, `config`, `model_q1`)
- Memory anchors: `project_asset_concept_partner_pattern`, `project_layer3_two_path_curation`, `feedback_l3_concept_notes_wiki_shape`
