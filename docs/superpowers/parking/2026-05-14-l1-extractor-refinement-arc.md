# Side-quest: L1 extractor refinement (asset-loader-sites categorization)

**Type:** small arc (1-2 sessions)
**Surfaced:** 2026-05-14, during asset-type-curate Round 3 calibration
**Pressure:** MEDIUM. Not blocking but accumulates -- every future asset-note slice surfaces new L1-CAT-AMBIGUOUS findings until the underlying categorization tiers tighten.
**Predecessor:** Round 3 calibration commits 3d2a1867 (skybox), 03449c65 (charset/hud_element/map), 45617006 (seed + OPERATIONS corrections)

---

## Why this arc exists

The asset-type-curate skill's Round 3 calibration surfaced a consistent pattern: L1 loader-sites are visible to the extractor but routed to the wrong asset_category. Four calibrated slugs surfaced **8+ named miscategorizations** with a small number of distinct fix shapes. The pattern is documented in the skill's `references/status-flag-rubric.md` under the new **L1-CAT-AMBIGUOUS** named enrichment-grade pattern (commit 45617006 patches the rubric).

Each miscategorization is independently a single-line override fix, but the cluster suggests **tier-level routing precision issues** on FTE's `hud_overlay` category in particular (5 distinct misroutes in one slug). The arc decides per case: per-site override vs tier-level routing revision.

---

## Punch list (8 named miscategorizations)

### ezQuake (3 cases)

1. **skybox -- `Mod_LoadExternalSkyTexture`** (`r_brushmodel_load.c:371`)
   - Current category: `ezquake:asset_category:skybox`
   - Question: should it route to `map_texture` instead? Loads BSP-internal sky-overlay replacements at `textures/<mapname>/<bsp_skytex>_{solid,alpha}.<ext>` -- install layout matches `map_texture`, not `skybox`.
   - Source: skybox-investigation.md `## L1 extractor follow-up` section
   - Resolution shape: operator decision (both args reasonable). Either re-route to `map_texture` OR keep at `skybox` + document the dual-mechanism (current asset-note does this).

2. **skybox -- `Skywind_Load_f` / `FS_LoadTempFile`** (`r_brushmodel_sky.c:309`)
   - Current category: `null` (uncategorized)
   - Intended: `ezquake:asset_category:skybox`
   - Fix shape: add `Skywind_Load_f` to `ENCLOSING_FN_CATEGORY_OVERRIDES` in `apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py`:
     ```python
     (re.compile(r"^Skywind_Load_f$"), "ezquake:asset_category:skybox"),
     ```
   - Symmetric to the FTE `R_SetSky|Shader_ParseSkySides` override that already landed.

3. **charset -- `FS_LoadTempFile` inside `Load_LMP_Charset`** (`r_draw_charset.c:71`)
   - Current category: `ezquake:asset_category:hud_overlay`
   - Intended: `ezquake:asset_category:charset`
   - Fix shape: add `Load_LMP_Charset` to `ENCLOSING_FN_CATEGORY_OVERRIDES`:
     ```python
     (re.compile(r"^Load_LMP_Charset$"), "ezquake:asset_category:charset"),
     ```
   - Or tighten the function-tier rule that catches FS_LoadTempFile so it doesn't default to hud_overlay.

### FTE (5 cases, all under `hud_overlay`)

The FTE `hud_overlay` category currently catches multiple unrelated loaders. These were surfaced during the hud_element calibration when the runner had to filter 23 FTE sites for the `l1_canonical_ids` field:

| Enclosing function | Source file | Currently | Should be |
|---|---|---|---|
| `R2D_Conback_Callback` (sites 2-4) | `r_2d.c` | hud_overlay | conback |
| `Font_LoadHexen2Conchars` | `gl_font.c` | hud_overlay | charset |
| `M_Menu_LoadSave_Preview_Draw` (site 2) | `m_single.c` | hud_overlay | levelshot |
| `Mod_ParseMD5MeshModel` (sites 1-2) | `com_mesh.c` | hud_overlay | model_texture |
| `MSetup_TransDraw` (site 2) | `m_multi.c` | hud_overlay | player_skin |

**Question for the arc:** is this a tier-level routing precision issue (FTE's `hud_overlay` tier catches too broadly), or 5 individual override entries? Look at how the categorization decision is made for these specific functions -- if they share a common discriminator that the tier currently ignores, tier-fix is right; if each needs its own override, per-site is right.

Source: hud_element-investigation.md `## FTE L1 categorization quality issues` section.

### Map (1 case)

7. **map -- `Mod_LoadBrushModel`** (FTE, `gl_model.c:5507`)
    - Current category: `fte:asset_category:model`
    - Intended: `fte:asset_category:map`
    - Fix shape: add `Mod_LoadBrushModel` to FTE `ENCLOSING_FN_CATEGORY_OVERRIDES`:
      ```python
      (re.compile(r"^Mod_LoadBrushModel$"), "fte:asset_category:map"),
      ```
    - Expected result: ~5-10 additional `map`-categorized sites in FTE L1 covering BSP load, inline-model registration, and the .ent loader at `gl_model.c:2274-2330`.
    - Source: map-investigation.md `## Extractor gap` section.

---

## Approach

Fresh terminal opens the extractor handler file:
`apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py`
and its FTE sibling.

Per case:
1. Read the current categorization tier rules (`FUNCTION_TO_CATEGORY`, `ENCLOSING_FN_CATEGORY_RULES`, `ENCLOSING_FN_CATEGORY_OVERRIDES`).
2. For tier-level question (FTE hud_overlay 5-case cluster): inspect the routing logic, decide tier-fix vs per-site override.
3. Apply the chosen fix.
4. Re-run the extractor: `python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py` (similar for FTE).
5. Verify no regressions: compare site counts per category against pre-fix snapshot.
6. Spot-check the affected slugs by re-running `derive_asset_types.py` and reading the new `qw-asset-types.json` evidence counts.

After all fixes land, re-walk affected slugs through `/asset-type-curate <slug>` if needed (most slugs were documented around the L1 gap and don't strictly need re-running, but skybox + map specifically benefit from cleaner L1 anchors).

---

## Success criteria

- All 8 named miscategorizations resolved (or operator-decided to defer).
- ezQuake extractor re-run produces a clean diff: only the targeted sites move categories; nothing else shifts.
- FTE extractor re-run: same.
- Spot-check: hud_element L1 site count on `hud_overlay` drops by 5 (or those 5 sites move to the correct categories). Map gains 5-10 FTE `map` sites.
- HANDOVER.md punch-list pointer is removed once arc closes.

---

## Pointers

- Skill rubric (new L1-CAT-AMBIGUOUS section): `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md`
- Extractor handler files: `apps/qw-oracle/scripts/extractors/{ezquake,fte}/_handler_asset_loader_sites.py`
- Investigation reports (source for each case): `apps/qw-oracle/docs/asset-curation/{skybox,charset,hud_element,map}-investigation.md`
- Seed: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`
- Derive: `apps/qw-oracle/scripts/extractors/qw/derive_asset_types.py`
