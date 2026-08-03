# cross-engine-loader-grep.md

Step 2 (Source verification) reference. Multi-use-loader pattern, per-engine
grep + jq recipes, and the candidate-detection heuristic.

---

## Section 1 -- The multi-use loader pattern

One generic image-load function is dispatched to 8+ distinct asset categories.
The enclosing function at each call site determines the category, not the function
name itself.

**Canonical ezQuake example.** `R_LoadImagePixels` is called from 9 distinct
enclosing-function families:

- `R_LoadSkyTexturePixels` -> skybox
- `Mod_LoadExternalTexture` -> map_texture (the #1 community-shared category, 111 items on qw.nu/gfx)
- `Mod_LoadExternalSkin` -> player_skin
- `R_InitChatIcons` -> hud_overlay
- `QMB_InitParticles` -> hud_overlay (particle font)
- `Skin_PixelsLoad` -> player_skin (legacy path)
- `R_LoadTextureImage`, `R_LoadPicImage`, `R_LoadCharsetImage` -> texture / charset wrappers

Before 2026-05-13 this function was absent from `LOADER_FUNCTIONS`. All 9 call
families were invisible at L1.

Each JSON entry carries `enclosing_function`. The handler routes via
`ENCLOSING_FN_CATEGORY_RULES` to assign `reads_category_id`. When function-name
tier would win incorrectly (e.g., `R_LoadHiResTexture` inside `R_SetSky`),
`ENCLOSING_FN_CATEGORY_OVERRIDES` intercepts first (see Section 4).

**Cross-engine expectation.** The same pattern exists in QWCL, MVDSV, and KTX.
Multi-use-loader audit is a prerequisite before declaring a new engine handler's
watchlist complete.

---

## Section 2 -- Signature grep patterns per engine

### ezQuake

**Extractor output:**
`apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json`

Top-level: `{ "loader_sites": [ ... ] }`. Key fields per entry:
`canonical_id`, `function_name`, `enclosing_function`, `reads_category_id`,
`source_file`, `source_line`, `load_trigger`, `path_literal`, `path_template`.

**Sites for a given category:**

```bash
jq '[.loader_sites[] | select(.reads_category_id == "ezquake:asset_category:skybox")]' \
  apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json
```

`reads_category_id` format: `ezquake:asset_category:<slug>`.

**Sites for a given function name:**

```bash
jq '[.loader_sites[] | select(.function_name == "R_LoadImagePixels")]' \
  apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json
```

**Distinct function names for a category:**

```bash
jq '[.loader_sites[] | select(.reads_category_id == "ezquake:asset_category:map_texture") | .function_name] | unique' \
  apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json
```

**Known ezQuake image-load primitives (from live JSON as of 2026-05-13):**

```
R_LoadImagePixels   -- 9 enclosing families; the canonical multi-use loader
Draw_CachePicSafe   -- 15 enclosing families (hud_overlay paths)
R_LoadPicImage      -- 6 enclosing families; wraps R_LoadImagePixels
FS_LoadHunkFile     -- 5 enclosing families; broader file primitive
Mod_ForName         -- 4 enclosing families; model precache
Tex_Load*           -- texture-load variants; prefix match
Image_Load*         -- prefix; broad source search
Image_Get*          -- cache-fetch variants
```

Source-level prefix search to confirm watchlist coverage:

```bash
grep -rn "Image_Load\|R_Load\|Tex_Load\|Pic_Load\|Image_Get" \
  /path/to/ezquake-source/src/ --include="*.c" -l
```

---

### FTE

**Extractor output:**
`apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json`

Same top-level structure. `reads_category_id` format: `fte:asset_category:<slug>`.
15 distinct category IDs as of 2026-05-13 (config, hud_overlay, locfile, log,
map, model, other, quakec_progs, screenshot, shader, skin, skybox, sound, texture, wad).

Confirmed primitive families:
```
R_LoadHiResTexture  -- multi-use; skybox via R_SetSky + Shader_ParseSkySides (OVERRIDES-tagged)
R_RegisterShader    -- shader registration; skybox via OVERRIDES
R_LoadShader, R_RegisterPic, R_RegisterCustom -- shader/pic variants
COM_LoadFile, COM_LoadTempFile, COM_LoadStackFile -- generic file load
FS_LoadFile, FS_OpenVFS -- VFS primitives (FS_OpenVFS: 35+ families; intentionally generic)
TP_LoadLocFile      -- locfile loader
```

**FTE skybox sites:**

```bash
jq '[.loader_sites[] | select(.reads_category_id == "fte:asset_category:skybox")]' \
  apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json
```

Use the same category-filter and function-filter recipes from the ezQuake section,
substituting the FTE path and `fte:asset_category:<slug>` prefix.

---

### QWCL

**Status:** No `_handler_asset_loader_sites.py` exists for QWCL (as of 2026-05-13).
QWCL CLAUDE.md: "No asset taxonomy -- 1996-era loader patterns don't match the
post-2002 ezQuake/FTE shape." Only cvars, commands, and cmdline params are extracted.

For QWCL source-level verification, grep directly:

```bash
grep -rn "R_LoadPic\|Draw_PicFromWad\|Mod_LoadSkin\|GL_LoadTexture\|GL_FindTexture" \
  /path/to/qwcl-source/ --include="*.c" -l
```

If the QWCL handler doesn't exist, that is an extractor-capability gap, not an
L1-GAP. Log it in `## Extractor gap` of the investigation.md.

---

### MVDSV

**Status:** No `_handler_asset_loader_sites.py` exists for MVDSV. MVDSV is a
server; asset-load primitives are QC-side (model/sound precache) or VFS reads,
not image-file loads. Source root: `/home/paradoks/projects/mvdsv/src/`.

```bash
grep -rn "Mod_LoadModel\|SV_PrecacheModel\|SV_PrecacheSound\|SV_Precache" \
  /home/paradoks/projects/mvdsv/src/ --include="*.c" -l
```

MVDSV is expected to show SPARSE or N/A for most image-asset types. Log genuine
gaps in `## Extractor gap`.

---

## Section 3 -- Verification heuristic: multi-use loader candidate detection

A function called from >= 4 distinct enclosing-function families is a multi-use-
loader candidate. Run this jq recipe against either engine's JSON:

```bash
ENGINE_JSON=apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json
# or: fte/output/fte-asset-loader-sites-ast.json

jq '
  .loader_sites
  | group_by(.function_name)
  | map({
      fn: .[0].function_name,
      n: ([.[].enclosing_function] | unique | length),
      sample: ([.[].enclosing_function] | unique | .[0:4])
    })
  | map(select(.n >= 4))
  | sort_by(-.n)[]
  | "\(.fn): \(.n) families -- \(.sample | join(", "))"
' "$ENGINE_JSON" -r
```

**Expected ezQuake output (2026-05-13):**
```
FS_OpenVFS:        35 -- intentionally generic; skip
Draw_CachePicSafe: 15 -- hud_overlay (correctly multi-use)
R_LoadImagePixels:  9 -- the canonical multi-use loader
S_PrecacheSound:    8 -- sound
R_LoadPicImage:     6 -- wraps R_LoadImagePixels
FS_LoadHunkFile:    5 -- broad file primitive
Mod_ForName:        4 -- model precache
```

When a candidate has >= 4 enclosing families, is absent from `LOADER_FUNCTIONS`,
and loads file content: add to the watchlist and re-run the extractor.

---

## Section 4 -- Adjacent gotchas

### Screenshot regex read/write conflation (reference_screenshot_regex_pattern_bug)

Both ezQuake and FTE handlers had a screenshot `ENCLOSING_FN_CATEGORY_RULES`
regex that conflated write paths with read paths. Result: 7 ezQuake and 1 FTE
texture-decoder sites were mistagged as `screenshot` (pre-2026-05-13).

**Fingerprint:** any `ENCLOSING_FN_CATEGORY_RULES` entry matching both `*Write*`
and `*Load*` under the same category. Fix: split into two rules.

```python
# Bug:   (re.compile(r"Image_Write|Image_Load|_WriteTGA"), "screenshot"),
# Fixed: (re.compile(r"Image_Write|_WriteTGA|_WritePNG|_WriteJPEG|_OpenAPNG|SCR_ScreenShot"), "screenshot"),
#        (re.compile(r"^Image_Load|^R_LoadImagePixels$|^R_LoadTextureImage$"), "texture"),
```

Apply this probe in any new QWCL / MVDSV / KTX handler before the watchlist
audit. Paths to add when handlers exist:
- `apps/qw-oracle/scripts/extractors/qwcl/_handler_asset_loader_sites.py`
- `apps/qw-oracle/scripts/extractors/mvdsv/_handler_asset_loader_sites.py`

### ENCLOSING_FN_CATEGORY_OVERRIDES tier (reference_role_override_tier_design)

Four-tier merge order: `cat_override or cat_from_fn or cat_from_ext or cat_from_enclosing or cat_fallback`

1. `ENCLOSING_FN_CATEGORY_OVERRIDES` -- role beats primitive (checked first)
2. `FUNCTION_TO_CATEGORY` -- exact function-name
3. `EXT_TO_CATEGORY` -- file extension in path literal
4. `ENCLOSING_FN_CATEGORY_RULES` -- fallback enclosing-function regex

**Use OVERRIDES when** a generic loader (`R_LoadHiResTexture` -> `texture`) is
called inside a function that unambiguously serves a different role (`R_SetSky`
-> skybox). Without the override, function-name tier wins and the role is
invisible at L1.

FTE example (live 2026-05-13):

```python
ENCLOSING_FN_CATEGORY_OVERRIDES = [
    (re.compile(r"^R_SetSky$|^Shader_ParseSkySides$"), "fte:asset_category:skybox"),
]
```

ezQuake carries an empty OVERRIDES (scaffold for symmetry). QWCL / MVDSV / KTX
inherit the scaffold when their first unambiguous case surfaces. If a function
has ambiguous multi-role context, use tier 4 (RULES) instead.

When `reads_category_id` looks wrong, check OVERRIDES before concluding the
handler is broken -- it may be a missing override entry.
