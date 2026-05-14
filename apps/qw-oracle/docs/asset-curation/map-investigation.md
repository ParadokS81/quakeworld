# Investigation: map (Round 3 calibration -- hub slug, cross-type companion, concept-note partner)

**Slug:** map
**Date:** 2026-05-14
**Status flag:** DOC-GAP
**Calibration context:** Round 3 of post-audit calibration. player_skin (CONFIDENT) and
skybox (DIVERGENT) shipped. map is the first hub slug -- the first non-empty
`companion_asset_types`.

---

## 1. Pre-flight

Seed entry at `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` line 342:

```yaml
asset_type: map
description: BSP map geometry file (.bsp).
engine_canonical_paths: ["maps/<mapname>.bsp"]
engine_extensions: [".bsp"]
l1_hint_function_names: ["CM_OpenMap", "Mod_LoadBrushModel"]
l1_hint_bare_categories: ["map"]
user_install_paths: ["qw/maps/<mapname>.bsp"]
corpus_categories: ["Maps", "Maps / DMM4"]
```

Output JSON is current (mtime 1778685920 vs seed mtime 1778682291 -- JSON is newer).

**L1 anchor pull:**

| Engine | Sites tagged `map` |
|---|---|
| ezQuake | 12 |
| FTE | 1 |
| QWCL | extractor output not found |
| MVDSV | extractor output not found |

ezQuake has 12 correctly-categorized sites -- rich evidence. FTE has 1 site; this is
suspicious given BSP loading is core to FTE. The gap is diagnosed below.

---

## 2. Source verification

### 2.1 ezQuake load chain

**`CM_OpenMap` (`cmodel.c:1262-1308`)**

Opens the BSP via `FS_OpenVFS(name, "rb", FS_ANY)` at `cmodel.c:1270`. Reads the
`dheader_t` and validates the version field:

- `Q1_BSPVERSION` (29 / `0x1D`) -- classic Quake 1 BSP; `sv_bspversion` set to `"1"`
- `Q1_BSPVERSION2` / `Q1_BSPVERSION29a` -- extended BSP2; `sv_bspversion` set to `"2"`
- `HL_BSPVERSION` -- Half-Life BSP; `halflifebsp` cvar set to `"1"`
- Any other version: `Host_Error` terminates.

After header validation, `map_halflife` flag is set and the VFS handle is returned to
the caller.

**`CM_LoadMap` (`cmodel.c:1384-1478`)**

The main map loader. Called from:
1. `SV_SpawnServer` (`sv_init.c:470,480`) -- server spawn (primary path)
2. `Model_NextDownload` (`cl_parse.c:725`) -- client receives server spawn message
3. `NQD_ParseServerData` (`cl_nqdemo.c:551`) -- NQ demo playback

`CM_LoadMap` calls `CM_OpenMap` for the VFS handle and header, then reads collision
lumps in order (planes, leafs, nodes, clipnodes, entity lump, models, vis). After parsing,
it calls `CM_LoadPhysicsNormals` (`cmodel.c:1464`).

**`CM_LoadPhysicsNormals` (`cmodel.c:938-998`)**

Checks for the BSPX `MVDSV_PHYSICSNORMALS` lump embedded in the BSP first (`cmodel.c:1432`).
Falls back to loading `maps/<mapname>.qpn` via `FS_LoadHunkFile` (`cmodel.c:988`). Both
sources are tagged `ezquake:asset_category:map` in L1.

**`SV_SpawnServer` entity override (`sv_init.c:573-599`)**

When `sv_loadentfiles` is `1` (default: `sv_main.c:145`), `SV_SpawnServer` checks
two .ent paths in order:
1. `maps/<sv_loadentfiles_dir>/<mapname>.ent` (if `sv_loadentfiles_dir` is set)
2. `maps/<mapname>.ent`

Loaded via `FS_LoadHunkFile` (`sv_init.c:587,594`). Both sites are tagged
`ezquake:asset_category:map` in L1 (IDs: `FS_LoadHunkFile_sv_init_SV_SpawnServer_1`
and `FS_LoadHunkFile_sv_init_SV_SpawnServer_2`).

**`Mod_LoadBrushModel` (`r_model.c:300`)**

Renderer side. `Mod_LoadModel` dispatches to `Mod_LoadBrushModel` when the file is
a BSP (default branch -- not MD3, not MDL, not sprite). Tagged
`ezquake:asset_category:map`. Builds GL surfaces, texture references, and the inline
model table.

**`R_ReadPointFile_f` (`r_part.c:197-...`)**

Dev diagnostic: loads `maps/<mapname>.pts` via `FS_OpenVFS` (`r_part.c:212`) to render
a path through leaked geometry. Registered as `dev_pointfile` command
(`r_rmain.c:609`). Tagged `ezquake:asset_category:map`.

**Worldspawn sky push (`r_brushmodel_load.c:946-947`, `r_rmisc.c:224-225`)**

During BSP loading, `R_LoadBrushModelTextures` parses the worldspawn entity. When the
entity has a `sky` or `skyname` key, `Cvar_Set(&r_skyname, value)` is called at
`r_brushmodel_load.c:947`, pushing the BSP's intended sky name into the skyname cvar.
In `r_rmisc.c:224-225`, if `r_skyname` is empty and the worldspawn `skybox_name` is
set, `R_SetSky(worldspawn.skybox_name)` triggers skybox loading. This is the mechanism
by which the map directly causes a skybox asset to load.

**Seed notes consistency check:**

The seed notes say: "ezQuake L1 also surfaces .ent override sites (SV_SpawnServer),
.qpn physics-normals (CM_LoadPhysicsNormals), and .pts leak-pointfile (R_ReadPointFile_f)
under the same `map` category." Confirmed -- all three appear in the 12 L1 sites.

All 12 ezQuake L1 sites verified correct.

### 2.2 FTE load chain and gap

FTE's L1 has 1 confirmed `fte:asset_category:map` site:

```
fte:loader_site:FS_FLocateFile_sv_ccmds_SV_Map_f_2
sv_ccmds.c:849: FS_FLocateFile in SV_Map_f
```

This is a "check if map exists" call -- `snprintf(expanded, sizeof(expanded), "maps/%s.bsp", level)` followed by `COM_FCheckExists`, not the actual BSP load.

FTE's actual BSP loading goes through `Mod_LoadBrushModel` (`gl_model.c:5507`), dispatched
by `Mod_LoadModelWorker`. The gl_model.c extractor output shows 16 sites, but the
`Mod_LoadBrushModel` enclosing-function site (`gl_model.c:5831`) is tagged
`fte:asset_category:model`, not `map`. `Mod_LoadModelWorker` sites (1194, 1220) are
also tagged `model`.

**Root cause:** The FTE extractor does not have `Mod_LoadBrushModel` in
`ENCLOSING_FN_CATEGORY_OVERRIDES`. The generic model loader (`Mod_LoadModelWorker`) is
broader than BSP-only loading and correctly routes to `model`; but `Mod_LoadBrushModel`
is BSP-specific and should override to `map`.

**Confirmed cross-engine features:**
- `sv_loadentfiles` / `sv_loadentfiles_dir` cvars: both in FTE (`gl_model.c:35-36`)
  with identical defaults and semantics. FTE loads .ent in `gl_model.c:2274-2330`.
- `map` command: both engines (`sv_ccmds.c:1865` ezQuake, `sv_ccmds.c:3587` FTE)
- FTE additionally has `changelevel` (`sv_ccmds.c:3595`) and `gamemap` (`sv_ccmds.c:3594`)

**FTE-only features not in ezQuake:**
- `changelevel` command (cooperative level transitions)
- `gamemap` command (Q2 compatibility alias)

**ezQuake-only features not in FTE:**
- `.qpn` physics normals external file (MVDSV_PHYSICSNORMALS)
- `devmap` command
- `dev_pointfile` command

---

## 3. Documentation cross-reference

No dedicated map page exists in `research/repos/ezquake-docs/docs/docs/`.

The closest match is `structure.md`, which mentions:

> `/qw/maps` -- (directory listing only, no content explanation)

This is a DOC-GAP: the official docs describe the maps/ directory in passing as part of
the file system tree but provide no explanation of the asset type, load mechanism, or
companion files. The draft is authored from source and corpus only.

---

## 4. Corpus mining

**NDJSON manifest query (corpus_categories: ["Maps", "Maps / DMM4"]):**

- 11 bundles in the Maps / Maps / DMM4 categories
- All have `role: library:map`, `install_confidence: medium`, `install_source: quake-convention`
- Install paths confirm `qw/maps/<mapname>.bsp`
- Companion files observed in bundles:
  - `.loc` (locfile) present in 4 bundles: 617 (stronghold), 620 (dust2qw), 630 (stroggopolis), 632 (cot2v2)
  - `.lit` (colored lighting) present in bundle 302 ("Lits") -- entire bundle is .lit files only
  - `.bsp` present in bundles 386, 459, 618, 619, 621, 629

**Comments (gfx_comment table):**

1 comment found on map bundles (c_id=1364, c_item=302, about .lit files). Mentions the
Phoenix Labs colored-lighting pack. No install-path guidance in the comment text.

**Observations:**
- Community treat `qw/maps/` as the canonical install prefix without exception.
- Multi-file drops (BSP + locfile + .lit) are common but not standard -- the BSP itself
  is the only required file.
- "Maps / DMM4" is a sub-category for Deathmatch 4-specific maps (a QW-competitive
  ruleset map list). Maps in this category are standard BSPs with the same install path.

---

## 5. Gap triage

**Status flag: DOC-GAP**

- ezQuake: 12 correctly-categorized L1 sites -- strong source evidence. Load chain
  verified at `cmodel.c`, `sv_init.c`, `r_model.c`, `r_part.c`.
- FTE: 1 `map`-categorized site (file-locate only); actual BSP loader mis-tagged as
  `model`. Not a blocking L1-GAP for the draft -- ezQuake evidence is sufficient --
  but a follow-up extractor fix is needed. Documented in "Extractor gap" below.
- Docs: No dedicated page. Draft authored from source + corpus.
- Corpus: 11 bundles; confirms install path convention.

DOC-GAP applies because no documentation exists for this asset_type. The draft is
sourced from engine mechanics and community corpus.

---

## Extractor gap

**FTE `Mod_LoadBrushModel` routing (non-blocking; follow-up arc):**

`Mod_LoadBrushModel` in `fteqw/engine/gl/gl_model.c:5507` is the actual BSP parser for
FTE, but the extractor tags its enclosing-function sites (including the `Mod_FindName`
call at `gl_model.c:5831` for BSP inline models) as `fte:asset_category:model` rather
than `fte:asset_category:map`. Fix: add `Mod_LoadBrushModel` to
`ENCLOSING_FN_CATEGORY_OVERRIDES` with category `fte:asset_category:map`. Expected
result: ~5-10 additional `map`-categorized sites in FTE L1 covering BSP load,
inline-model registration, and the .ent loader in `gl_model.c:2274-2330`.

This gap pattern matches the skybox investigation's `Mod_LoadExternalSkyTexture` routing
question -- both are cases where a BSP-specific function inside a broader model-loading
chain needs a ENCLOSING_FN_CATEGORY_OVERRIDES entry.

---

## Suggested seed deltas

No seed deltas required. The seed entry is accurate:
- `engine_canonical_paths: ["maps/<mapname>.bsp"]` -- confirmed
- `l1_hint_function_names: ["CM_OpenMap", "Mod_LoadBrushModel"]` -- confirmed
- `corpus_categories: ["Maps", "Maps / DMM4"]` -- confirmed

The seed notes already mention the .ent, .qpn, and .pts companion files under the same
`map` L1 category. No changes needed.

---

## Suggested concept-note partner

The `map` asset_type's full gameplay story extends well beyond BSP file loading into
the workflow domain: how players and server operators select, change, and manage maps in
competitive QuakeWorld. A `map-selection-workflow` concept-note would cover:

- The `map` vs `changelevel` vs `sv_maprot` command semantics (server admin perspective)
- KTX match-start map voting (the `/vote map <mapname>` flow, map approval lists)
- `timelimit` / `fraglimit` automatic level changes (ruleset gates on map duration)
- QWFWD / QTV pass-through behavior on map change
- The `/maplist` and `/check_maps` commands (server-side map enumeration)
- Competitive map pool conventions (dm2, dm4, dm6, aerowalk, ztndm3, etc. -- the
  institutional map set that defines match eligibility)

The asset-note covers "what is a BSP file and how does it load." The concept-note would
cover "how do players and admins use maps in competitive play." The two are complementary:
the asset-note is the substrate; the concept-note is the workflow synthesis.

Heuristic verdict: **earns a partner**. The map-selection domain requires cvars, game
modes, ruleset gates, and institutional knowledge that the asset-loading note cannot
contain without crossing the asset-note scope boundary.

---

## Calibration findings

1. **companion_asset_types determination.** The OPERATIONS.md "cross-type companion"
   rule is clear for `map_texture`, `map_lighting`, and `map_entities` (separate seed
   slugs, all tied to the same `<mapname>` stem). `skybox` required checking the
   worldspawn.sky push in source (`r_brushmodel_load.c:946-947`); the guidance in
   OPERATIONS.md doesn't give an example of a "trigger" companion vs a "co-installed"
   companion, but the intent is clear (distinct loadable triggered by this asset type).
   Judgment: include skybox in companion_asset_types.

   `locfile` is commonly co-installed (corpus shows 4/11 bundles include .loc), but
   locfiles are NOT loaded during BSP loading -- they're loaded by a separate
   `Loc_LoadLocations` mechanism. Judgment: locfile goes in prose only, not in
   companion_asset_types.

2. **Partner-candidate heuristic.** The README states "map may earn one for
   map-selection workflow." The skill's own `## Suggested concept-note partner` finding
   heuristic says: "cross-domain context (other cvars, render systems, ruleset gates)
   beyond pure asset-loading." The map-selection domain clearly meets this bar (KTX
   voting, timelimit/fraglimit, server map rotation). Verdict: earns a partner.
   The heuristic landed without outside-skill reasoning -- the README's own hint plus
   the finding rule in SKILL.md were sufficient.

3. **FTE L1 asymmetry (12 vs 1).** Investigated by inspecting the FTE extractor output.
   The 1-site count reflects a real categorization gap: `Mod_LoadBrushModel` sites in
   FTE are mis-routed to `model`. The fix is an `ENCLOSING_FN_CATEGORY_OVERRIDES` entry
   -- same fix shape as skybox's `Mod_LoadExternalSkyTexture`. The gap does NOT block
   the draft because ezQuake evidence is solid and the FTE gap is understood.

4. **Cross-reference to skybox.** skybox.md (committed at 3d2a1867) already references
   map.md in its "Related" section. The map.md "Related" section closes the loop with a
   pointer to skybox.md. Bidirectional cross-reference confirmed.

5. **Length tier.** Rich tier (~140 body lines). Justified: hub slug with 4 companion
   types, cross-engine differences, within-type sidecars (.qpn, .pts), and worldspawn
   sky push semantics.
