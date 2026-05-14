# hud_element -- Investigation Report

**Date:** 2026-05-14
**Status flag:** DIVERGENT
**Auditor:** asset-type-curate skill (Sonnet 4.6)

---

## Pre-flight

**Seed entry:** `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` line 140.
Confirmed present. JSON output is current (json mtime 2026-05-13 17:25 > seed mtime 16:24).

**Slug/L1-category-name mismatch (CALIBRATION FINDING #1):**

Initial jq query `.reads_category_id == "ezquake:asset_category:hud_element"` returned ZERO
results. This is the expected failure mode documented in the handoff. Resolution: checked the
seed's `l1_hint_bare_categories: ["hud_overlay"]` and re-queried with
`reads_category_id == "ezquake:asset_category:hud_overlay"`. Found 129 ezquake sites and 23
FTE sites. The seed slug is `hud_element`; the L1 category ID is `hud_overlay`. This mismatch
is a vocabulary divergence baked into the extractor at category-naming time. The skill's Step 1
does not codify a re-query fallback for this case; any runner hitting this cold would halt with
L1-GAP unless they also check `l1_hint_bare_categories`. This is a skill template gap.

**L1 summary:**

| Engine | reads_category_id | Site count |
|---|---|---|
| ezquake | `ezquake:asset_category:hud_overlay` | 129 |
| fte | `fte:asset_category:hud_overlay` | 23 |
| qwcl | (not yet extracted) | N/A |
| mvdsv | (server-side; no HUD asset loading) | N/A |

L1 evidence is present and rich; not L1-GAP.

---

## l1_canonical_ids selection rule (CALIBRATION FINDING #2)

The template and OPERATIONS.md both state that `l1_canonical_ids` should be exhaustive (to
support multi-hop LLM retrieval). With 129 ezquake sites, exhaustive is infeasible in the
frontmatter. The template provides no selection rule for this case.

**Invented rule applied (not in template):** Select one canonical_id per distinct
enclosing function that represents a unique loading mechanism. Priority order: startup-trigger
primary entry points > on-demand subsystem inits > dynamic on-demand loaders. Cap at 8-12
entries covering the full mechanistic surface without repeating per-lump granularity.

The 129 ezquake sites span 35 distinct enclosing functions; the bulk (62/129) are in
`Sbar_Init` -- one `Draw_CacheWadPic` call per individual WAD lump name. `Sbar_Init_1` alone
anchors the entire primary mechanism; all 62 sites are the same function/path-pattern family
and do not benefit from per-lump enumeration in `l1_canonical_ids`.

Selected 8 representative ezquake IDs covering distinct mechanisms:
1. `Sbar_Init` -- primary WAD lump loader (sbar numerals, faces, weapons, ammo, items)
2. `Draw_Init` -- framework 2D init (disc, backtile engine-internal elements)
3. `SCR_Init` -- screen system init (loading/pause screen overlays)
4. `ScrollBars_Init` -- UI widget texture loader (non-WAD image-path pattern)
5. `HUD_Editor_Init` -- HUD editor cursor images
6. `Hud_Add_f` -- dynamic HUD element image addition (hud262 system)
7. `SCR_HUD_LoadGroupPic` -- HUD group picture loader
8. `R_InitChatIcons` -- chat/tracker icon loader (country flags, status icons)

For FTE, 3 sites excluded from 23 as genuinely categorized hud_overlay (see FTE section below
for categorization quality notes). Remaining FTE IDs: R2D_LoadAtlasedPic, R2D_SafeCachePic,
MD_Download_UpdateStatus.

**Recommendation for template patch:** Add a note under Step 1 / `l1_canonical_ids` stating:
"When site count exceeds ~20, apply the enclosing-function-based selection rule: one
representative ID per distinct enclosing function that covers a unique loading mechanism.
Cap at 8-12 entries. Do not enumerate per-file granularity."

---

## Source verification

### ezQuake -- WAD-based HUD element loading

Primary mechanism: `Draw_CacheWadPic` at `src/r_draw.c:340`. Called by `Sbar_Init` at
`src/sbar.c:225` for each individual WAD lump name.

Loading priority chain (source-verified at `r_draw.c:350-358`):
1. `W_GetLumpName(name)` -- loads from the WAD archive (`gfx.wad`) as the stock version.
2. `R_LoadPicImage("textures/wad/<name>", ...)` -- override check (primary user-install path).
3. `R_LoadPicImage("gfx/<name>", ...)` -- fallback image path.
4. If neither file override exists, renders the stock WAD lump data.

**Seed path accuracy issue -- PROPOSED DELTA:** The seed's `engine_canonical_paths` lists
three paths: `textures/wad/<name>`, `textures/wad3/<name>`, `textures/halflife/<name>`. The
`wad3` and `halflife` paths are from `WAD3_LoadWadFile` at `src/wad.c:278-279` -- they are
search paths for loading WAD3 archive FILES (the `wad_file` asset_type), NOT for individual
HUD element texture overrides. Individual element overrides only use `textures/wad/<name>` and
`gfx/<name>`. The seed paths `textures/wad3` and `textures/halflife` are incorrect for
`hud_element` and should be removed. `gfx/<name>` is missing and should be added as a fallback.

**Complete lump name set loaded by `Sbar_Init`** (verified `sbar.c:229-320`):

Numbers/alt-numbers: `num_0-9`, `num_minus`, `num_colon`, `num_slash`, `anum_0-9`, `anum_minus`
Weapons: `inv_shotgun`, `inv_sshotgun`, `inv_nailgun`, `inv_snailgun`, `inv_rlaunch`,
`inv_srlaunch`, `inv_lightng`, and `inv2_` and `inva1_` through `inva5_` variants for each.
Ammo: `sb_shells`, `sb_nails`, `sb_rocket`, `sb_cells`
Armor: `sb_armor1`, `sb_armor2`, `sb_armor3`
Items: `sb_key1`, `sb_key2`, `sb_invis`, `sb_invuln`, `sb_suit`, `sb_quad`
Sigils: `sb_sigil1` through `sb_sigil4`
Faces: `face1` through `face5`, `face_p1` through `face_p5`, `face_quad`, `face_invis`,
`face_invul2`, `face_inv2`
Scoreboard: `sbar`, `ibar`
Plus `backtile`, `disc` from `Draw_Init` (`r_draw.c:596-597`).

### ezQuake -- HUD 2.0 element system

`Hud_Add_f` at `src/hud_262.c:119` calls `Draw_CachePicSafe` on a caller-supplied path,
allowing dynamic custom images outside the WAD lump vocabulary. Path is free-form; not bound
to `textures/wad/`. This is the hud262 system extension.

`R_InitChatIcons` at `src/r_chaticons.c` loads chat and tracker overlay icons (country flags,
status indicators) using `R_LoadImagePixels`. Paths appear to be free-form but the corpus
shows these landing at `textures/wad/<name>` per community convention (e.g., `axe.png`,
country codes `fi`, `se`, `us`).

`SCR_HUD_LoadGroupPic` at `src/hud_groups.c` loads group indicator images for the group HUD
element via `Draw_CachePicSafe`. Paths are user-configured.

`ScrollBars_Init` at `src/Ctrl_ScrollBar.c:43` loads UI scrollbar background textures using
`Draw_CachePicSafe` with a hardcoded path `textures/scrollbars/slidebg`.

### FTE -- Different architecture

FTE does not use the WAD-based sbar loading mechanism. FTE's primary HUD for QuakeWorld is
delivered via CSQC (gamecode QuakeC programs), which gives the server-side game logic control
over what gets drawn on the client HUD. For QW gamemodes in FTE, the HUD is governed by the
CSQC bundle from the game server.

FTE's 2D image loading for engine-native overlay elements uses `R_RegisterPic` (via
`R2D_SafeCachePic` at `r_2d.c:483` and `R2D_LoadAtlasedPic` at `r_2d.c:629`). The
`R2D_LoadAtlasedPic` path template is `gfx/%s` (FTE source `r_2d.c:629`).

**FTE L1 categorization quality issues:** Several of the 23 FTE `hud_overlay` sites appear
mis-categorized:

| Enclosing function | Source file | path_literal | Probable correct type |
|---|---|---|---|
| `R2D_Conback_Callback` (sites 2-4) | `r_2d.c` | `gfx/menu/conback.lmp`, `pics/conback.pcx`, `gfx/conback.lmp` | `conback` |
| `Font_LoadHexen2Conchars` | `gl_font.c` | `gfx/menu/conchars.lmp` | `charset` |
| `M_Menu_LoadSave_Preview_Draw` (site 2) | `m_single.c` | `levelshots/%s` | `levelshot` |
| `Mod_ParseMD5MeshModel` (sites 1-2) | `com_mesh.c` | `%s_%02d_%02d.lmp` | `model_texture` or similar |
| `MSetup_TransDraw` (site 2) | `m_multi.c` | `gfx/player/%s.lmp` | `player_skin` context |

Genuinely hud_overlay-categorized FTE sites: `R2D_LoadAtlasedPic`, `R2D_SafeCachePic`,
`MD_Download_UpdateStatus`, `Con_DrawConsoleLines` (2 sites), `Con_DrawConsole` (2 sites),
`PR_R_PolygonShader` (CSQC polygon shader -- debatable), `COM_CheckRegistered`
(`gfx/pop.lmp` -- registration check popup), `Image_FixupImageSize` (`%s.lmp`),
`Draw_Hexen2BigFontString` (`gfx/menu/bigfont.lmp` -- Hexen2-specific).

The categorization quality for FTE's 23 sites is mixed. The `l1_canonical_ids` for FTE in the
note carries only the 3 most clearly legitimate hud_overlay sites.

---

## Documentation cross-reference

### `research/repos/ezquake-docs/docs/docs/textures.md`

Last git edit: 2022-11-21 (stale per the <= 2022-11-21 threshold, exactly on the boundary).
Content: Comprehensive table of HUD element install paths covering ammo, armor, faces, numbers,
anums, powerups, sigils, and keys -- all confirming `qw/textures/wad/<lump_name>.png` format.

**Doc gap:** Weapon icon lump names (`inv_shotgun`, `inv_sshotgun`, etc. and the `inva*`
animated variants) are NOT documented in `textures.md`. The tables cover the most commonly
customized element families but omit the full weapon icon vocabulary. Source verification
fills this gap; the doc is incomplete on this point.

**Content accuracy:** Despite the stale date, the documented paths match source behavior
(`r_draw.c:357`). The doc itself is the source tree for ezquake.com, not a snapshot; content
accuracy confirmed.

### `research/repos/ezquake-docs/docs/docs/hud.md`

Last git edit: 2025-05-23 (current). Covers the HUD 2.0 configuration system -- `scr_newhud`,
`hud_editor`, element placement/alignment commands, properties. Does NOT document the
WAD-override install mechanism; focuses on the display system, not the texture replacement.

**No FTE docs found** for hud_element. The FTE documentation for its HUD system is scattered
across CSQC documentation and engine-internal comments; no dedicated `hud.md` equivalent.

---

## Corpus mining

**HUD categories from seed:** HUD, HUD / Face and Armor, HUD / Icons, HUD / Numbers, HUD / Sets, HUD / Weapon
**Additional category observed in corpus (not in seed):** `HUD / WADs` -- should be added to
`corpus_categories` in the seed.

**Bundle count:** 94 bundles across HUD categories.
**File roles:**
- `user-asset:hud-element`: 2,977 files -- individual texture replacements (overwhelming majority)
- `user-asset:wad`: 113 files -- complete WAD archive replacements

**Install path conventions (from 2,977 high-confidence hud-element files):**
All confirm `qw/textures/wad/<lump_name>.<ext>` -- consistent with source.

**Case sensitivity observation:** Community frequently uploads with uppercase filenames
(`ANUM_0.png`, `INV2_LIGHTNG.png`, `sb_cells.PNG`). On Windows (the dominant QW platform)
this is harmless (NTFS case-insensitive). On Linux game servers or Linux ezQuake builds,
case mismatches cause lookup failures. The docs do not warn about this.

**WAD distribution method (113 files, ~113 WAD bundles):** Some HUD sets (bundle IDs 182-185:
cyan, def, gamer, milton) distribute as complete `gfx.wad` replacements at `qw/gfx<name>.wad`
rather than individual files. These are `user-asset:wad` role, covered by the `wad_file`
asset_type. The `companion_asset_types: [wad_file]` relationship is real.

**Notable lump names from corpus beyond the documented set:**
- `axe` -- axe weapon icon for r_tracker overlay
- `backtile`, `disc`, `ibar`, `sbar` -- additional engine-internal elements
- Country codes (`fi`, `se`, `us`, `de`, etc.) -- r_tracker/chat icon flag sprites
- `chaticons`, `anum_colon`, `anum_slash`, `anum_z`, `anum_zz` -- extended elements
- Non-standard custom names (`dark_nj_256`, `foogs_wad`, `def_degeneration8`) -- full set packs

---

## Gap triage

**Status: DIVERGENT**

The underlying concept (`hud_element` = the replaceable 2D overlay images showing game state)
is well-evidenced in both engines, but the implementation architectures diverge fundamentally:

- **ezQuake**: WAD-based sbar system. `Sbar_Init` loads named lumps from `gfx.wad`;
  `Draw_CacheWadPic` probes `textures/wad/<name>` for user overrides at each lump load.
  The texture-replacement path is statically determined at startup.
- **FTE**: CSQC-based HUD. The QW HUD is delegated to gamecode (QuakeC), which issues
  `R2D_SafeCachePic`/`R2D_LoadAtlasedPic` calls at draw time. Users cannot override
  individual WAD lumps the same way; FTE's `textures/wad/` support is minimal.

The WAD override path (`textures/wad/<name>.<ext>`) works for ezQuake but NOT as a general
FTE mechanism. An LLM retrieving this note for a user asking "how do I install HUD textures
on FTE" gets a materially different answer than for ezQuake.

---

## Suggested seed deltas

**delta 1 -- Remove incorrect engine_canonical_paths entries:**

```yaml
# hud_element
engine_canonical_paths:
  # REMOVE: "textures/wad3/<name>" -- WAD3 archive search path (wad.c), not element override
  # REMOVE: "textures/halflife/<name>" -- same
  # KEEP: "textures/wad/<name>" -- primary override path (r_draw.c:357)
  # ADD: "gfx/<name>" -- fallback override path (r_draw.c:358)
```

Corrected `engine_canonical_paths`:
```yaml
engine_canonical_paths:
  - "textures/wad/<name>"
  - "gfx/<name>"
```

**delta 2 -- Add missing corpus_category:**

```yaml
corpus_categories:
  - "HUD"
  - "HUD / Face and Armor"
  - "HUD / Icons"
  - "HUD / Numbers"
  - "HUD / Sets"
  - "HUD / Weapon"
  + "HUD / WADs"    # present in corpus, missing from seed
```

---

## Suggested concept-note partner

`hud_element` strongly warrants a concept-note partner covering the HUD configuration system.
The asset-note covers the file-replacement mechanism; a concept-note would cover:

- `scr_newhud` mode selection (0=FuhQuake-compat, 1=new HUD only, 2=both)
- HUD 2.0 element placement: `show`/`hide`/`place`/`align`/`move`/`hud_recalculate`
- HUD editor (`hud_editor`) interactive configuration workflow
- Built-in layout configs (`cfg/hud_berzerk`, `cfg/hud_corner`, etc.)
- `hud_planmode` for preview-mode configuration
- Community HUD sets and how to install them (individual files vs. WAD archive method)
- FTE's CSQC-based HUD -- why the WAD override path doesn't apply, what does work

The asset-note cannot carry this without violating bucket scope (competitive recipes and
multi-system configuration walkthroughs belong in concept-notes). The HUD system is one of
the most commonly asked-about topics in community channels; the concept-note is high-priority.

---

## Calibration findings summary

For the orchestrator reviewing Round 3 calibration:

**Finding 1 -- Slug/L1-category-name mismatch resolution:**

Hit zero results on initial query. Resolved by reading `l1_hint_bare_categories` from seed.
This was not directed by the skill template's Step 1 text -- the resolution was inferred from
context. Template gap: Step 1 should specify "if zero L1 results on the slug-name query, check
`l1_hint_bare_categories` from the seed and retry before concluding L1-GAP."

**Finding 2 -- l1_canonical_ids selection rule at scale (129 -> 8):**

Template says exhaustive but 129 IDs would overwhelm the frontmatter. Applied an invented rule:
one ID per distinct enclosing function, prioritizing startup init > subsystem init > dynamic,
capped at 8-12. Template should codify this rule explicitly, including the cap.

**Finding 3 -- related_entities scope at scale:**

The HUD cvar surface is large: dozens of `hud_*_*` dynamic properties, all HUD 2.0 commands.
Applied system-level scope filter: list system-level HUD cvars (`scr_newhud`, `hud_planmode`)
and the named system commands (`hud_editor`, `hud_recalculate`, `show`, `hide`, `place`,
`align`, `move`, `hud262_add`, etc.) but NOT per-element dynamic properties
(`hud_netgraph_show`, `hud_fps_scale`, etc. -- these are engine-generated at registration time
and cannot be enumerated statically). Template should call this out: when `related_entities`
would require enumerating dynamically-generated per-element cvar families, list the
system-level registration commands instead.

**Finding 4 -- FTE L1 categorization quality:**

Multiple FTE `hud_overlay` sites are likely mis-categorized (conback, charset, model frames,
levelshots). This is a real extractor gap but not a full L1-GAP for the slug (genuine hud
sites exist). Noted in the note's cross-engine section and l1_canonical_ids selection.
Extractor patch opportunity: tighten FTE `hud_overlay` category routing to exclude the
identified mis-categorized functions.

---

## Extractor notes (not a full L1-GAP)

FTE categorization refinement opportunity (not blocking the draft):
- Remove `R2D_Conback_Callback` from `hud_overlay` -- conback category
- Remove `Font_LoadHexen2Conchars` from `hud_overlay` -- charset
- Remove `Mod_ParseMD5MeshModel` from `hud_overlay` -- model-texture class
- Remove `M_Menu_LoadSave_Preview_Draw` (levelshots path) from `hud_overlay` -- levelshot
- Verify `Con_DrawConsoleLines` / `Con_DrawConsole` -- could be kept if console icons count as HUD overlay

Seed path accuracy fix (see Suggested seed deltas above).
