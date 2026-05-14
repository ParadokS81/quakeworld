---
slug: skybox
asset_type: skybox
status: DIVERGENT
audit_date: 2026-05-14
calibration_run: post-audit (L1 watchlist expansion 47ea3615 + LLM-feeder reframe db4dfd90)
predecessor: 2026-05-13 first calibration (skybox.md + skybox-investigation.md, wiped at ff4913ee)
---

# Skybox asset-type investigation

Post-audit re-run on the skybox slug after two pipeline improvements landed:
the ezQuake asset-loader watchlist expanded 14 -> 65 loader functions (commit
`47ea3615`), and the asset-note template was reframed for LLM-feeder
consumption (commit `db4dfd90`). The previous draft existed but was wiped
at `ff4913ee` for a clean re-walk.

Flag: **DIVERGENT**. Source and ezQuake docs disagree on install paths; ezQuake
and FTE diverge on cvar/command surface AND load mechanism. The orchestrator
diff against `HEAD~` shows the post-audit delta.

---

## Step 1 -- Pre-flight

- Seed entry loaded from `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`.
- JSON output mtime newer than seed mtime; no derive-pipeline regen needed.
- L1 anchors pulled from `ezquake-asset-loader-sites-ast.json` and
  `fte-asset-loader-sites-ast.json`.

### L1 evidence -- ezQuake (4 categorized sites)

| canonical_id (short) | function | enclosing | file:line | trigger |
|---|---|---|---|---|
| `Mod_LoadExternalSkyTexture_..._1` | `Mod_LoadExternalSkyTexture` | `R_LoadBrushModelTextures` | `r_brushmodel_load.c:1675` | on_demand |
| `Sky_LoadSkyboxTextures_..._1` | `Sky_LoadSkyboxTextures` | `R_SetSky` | `r_brushmodel_sky.c:111` | on_map_load |
| `R_LoadImagePixels_..._1` | `R_LoadImagePixels` | `R_LoadSkyTexturePixels` | `r_brushmodel_sky.c:202` | on_demand |
| `R_LoadSkyTexturePixels_..._1` | `R_LoadSkyTexturePixels` | `Sky_LoadSkyboxTextures` | `r_brushmodel_sky.c:226` | on_map_load |

Plus one **uncategorized** skywind-companion site (post-audit visible at L1
but with `reads_category_id: null`):

| canonical_id (short) | function | enclosing | file:line | path_template |
|---|---|---|---|---|
| `FS_LoadTempFile_..._Skywind_Load_f_1` | `FS_LoadTempFile` | `Skywind_Load_f` | `r_brushmodel_sky.c:309` | `"gfx/env/%s" SKYWIND_CFG` |

This is the post-audit win: the `_wind.cfg` loader site is now visible at L1,
but the categorization tiers do not route it to skybox. See `## Suggested seed deltas`
and `## L1 extractor follow-up` below.

### L1 evidence -- FTE (6 categorized sites)

| canonical_id (short) | function | enclosing | file:line | trigger |
|---|---|---|---|---|
| `R_LoadHiResTexture_..._Shader_ParseSkySides_1` | `R_LoadHiResTexture` | `Shader_ParseSkySides` | `gl_shader.c:699` | on_demand |
| `R_LoadHiResTexture_..._R_SetSky_1` | `R_LoadHiResTexture` | `R_SetSky` | `gl_warp.c:98` | on_map_load |
| `R_RegisterShader_..._R_SetSky_1` | `R_RegisterShader` | `R_SetSky` | `gl_warp.c:103` | on_map_load |
| `R_LoadHiResTexture_..._R_SetSky_2` | `R_LoadHiResTexture` | `R_SetSky` | `gl_warp.c:125` | on_map_load |
| `R_RegisterShader_..._R_SetSky_2` | `R_RegisterShader` | `R_SetSky` | `gl_warp.c:130` | on_map_load |
| `R_RegisterShader_..._R_SetSky_3` | `R_RegisterShader` | `R_SetSky` | `gl_warp.c:151` | on_map_load |

All 6 are categorized as `fte:asset_category:skybox` via the
`ENCLOSING_FN_CATEGORY_OVERRIDES` role-override tier
(`^R_SetSky$|^Shader_ParseSkySides$` -> skybox). The override tier is the
load-bearing piece here -- without it, `R_LoadHiResTexture` and
`R_RegisterShader` would route by function-name tier to a generic category.

L1-GAP test: passes for both engines. Not blocked.

---

## Step 2 -- Source verification

### ezQuake skybox surface (verified at HEAD)

**Cvars (user-facing names):**

- `r_skyname` -- `r_rmain.c:171`, default `""`, OnChange handler at
  `r_brushmodel_sky.c:127`. Setting it calls `R_SetSky`.
- `r_skywind` -- `r_rmain.c:172`, default `"1"`. Enabled by default; when
  nonzero, `R_SetSky` calls `Skywind_Load_f` after the cubemap loads.
- `gl_scaleskytextures` -- `r_texture_cvars.c:52`, default `"0"`,
  `CVAR_RELOAD_GFX`. Off by default -> `TEX_NOSCALE` flag passed to
  `R_LoadImagePixels` (no GPU-side downscale).

**Commands:**

- `loadsky` -- `r_brushmodel_sky.c:537`, registered in
  `R_SkyRegisterCvars`. Handler `R_LoadSky_f`: with 0 args reports current
  skyname; with arg `none` clears; with any other arg sets `r_skyname`.
- `skygroup` -- `host.c:546`, handler `MT_SkyGroup_f` in `cl_skygroups.c`.
  Maps a skyname to a list of map basenames; `TP_GetSkyGroupName` looks up
  the group for the current map and overrides `r_skyname` accordingly.
- `skywind` -- `r_brushmodel_sky.c:538`. Sets `distance / yaw / period /
  pitch` for the animated cloud overlay.
- `skywind_save` -- `r_brushmodel_sky.c:539`. Writes current skywind state
  to `gfx/env/<active_skyname>_wind.cfg`.
- `skywind_load` -- `r_brushmodel_sky.c:540`. Reloads from
  `gfx/env/<active_skyname>_wind.cfg`. Also called automatically from
  `R_SetSky` after skybox load when `r_skywind` is nonzero.
- `skywind_lookdir` -- `r_brushmodel_sky.c:541`. Sets yaw/pitch from
  current view angles (interactive tuning aid).
- `skywind_rotate` -- `r_brushmodel_sky.c:542`. Rotates yaw/pitch by
  argument-supplied delta.

**Probe loop (`R_LoadSkyTexturePixels`, `r_brushmodel_sky.c:184-209`):**

```c
static const char *skybox_ext[r_cubemap_direction_count] =
    { "rt", "bk", "lf", "ft", "up", "dn" };
static const char* search_paths[][2] = {
    { "env/",     ""  },   // <name><suffix>.<ext>
    { "gfx/env/", ""  },   // gfx/env/<name><suffix>.<ext>
    { "env/",     "_" },   // env/<name>_<suffix>.<ext>
    { "gfx/env/", "_" },   // gfx/env/<name>_<suffix>.<ext>
};
```

The 4 prefix/separator combinations are probed in order; first hit wins
per face. `R_LoadImagePixels` accepts `.tga`, `.png`, `.jpg` (driven by
ezQuake's image-loader extension-fallback logic, not visible in this
function directly).

**`Sky_LoadSkyboxTextures` direction shuffle (`r_brushmodel_sky.c:213`):**

```c
static int skydirection[] = { 4, 1, 5, 0, 2, 3 };
```

The probe-loop order `rt, bk, lf, ft, up, dn` is remapped to cubemap-face
indices `4, 1, 5, 0, 2, 3` when the renderer uses a cubemap. This is
purely an internal axis convention; the user-facing 6-face suffix set
does not change.

**Mod_LoadExternalSkyTexture (`r_brushmodel_load.c:371`):**

Distinct from the skybox cubemap path. Loads BSP-internal sky-overlay
replacements: `textures/<mapname>/<texname>_solid.<ext>` and
`textures/<mapname>/<texname>_alpha.<ext>` (with `textures/<texname>_solid`
fallback). Used when the BSP carries a sky texture (the 256x128
dual-overlay used by the classic Quake cloudy-sky renderer) and no
skybox is loaded. L1 currently routes this site to
`ezquake:asset_category:skybox`; arguably a `map_texture` categorization
would be more accurate, since the replacement file lives under
`textures/<mapname>/` and shares the `map_texture` install convention.
See `## L1 extractor follow-up`.

**Skywind companion file (`r_brushmodel_sky.c:296-349`):**

`Skywind_Load_f` reads `gfx/env/<active_skyname>_wind.cfg` via
`FS_LoadTempFile` (line 309). File format is a 5-token text line:

```
skywind <distance> <yaw> <period> <pitch>
```

Distance is bounded to `[-2.0, 2.0]`; yaw is `mod 360`; pitch is normalized
to `[-90, 90]` via `fmodf(... + 90.0f, 180.0f) - 90.0f`. Animated when
`Skywind_Active` returns true (`r_skyboxloaded && skywind_dist > 0`).

### FTE skybox surface (verified at HEAD)

**Cvars (user-facing names, after CVARFC/CVARFD macro resolution):**

- `r_skybox` -- `gl_warp.c:41`, declared as `r_skyboxname = CVARFC("r_skybox", "", ...)`. Primary skybox-name input. OnChange handler `R_SkyBox_Changed` re-runs `R_SetSky`.
- `r_glsl_skybox_orientation` -- `gl_warp.c:42`, declared as `r_skybox_orientation = CVARFD("r_glsl_skybox_orientation", "0 0 0 0", ...)`. Four floats: axis x/y/z + rotation speed in deg/sec.
- `r_glsl_skybox_autorotate` -- `gl_warp.c:43`, declared as `r_skybox_autorotate = CVARFD("r_glsl_skybox_autorotate", "1", ...)`. Toggles autorotation.
- `r_skyfog` -- `gl_warp.c:44`, default `"0.5"`. Alpha-blend for fog on the skybox.
- `r_fastsky` -- `gl_warp.c:35`, default `"0"`, `CVAR_ARCHIVE`. When nonzero, the skybox is replaced with the flat `r_fastskycolour` fill.
- `r_fastskycolour` -- `gl_warp.c:36`, default `"0"`. Color used when `r_fastsky` is on.
- `gl_skyboxdist` -- `gl_warp.c:37`, default `"0"`. Skybox cube far-plane distance; 0 = auto from far-clip.
- `r_skycloudalpha` -- `gl_warp.c:39`, default `"1"`. Opacity of the legacy scrolling-cloud front layer (only relevant when no skybox is set).

**Commands:**

- `r_skybox <name>` -- the canonical user surface. Setting the cvar triggers `R_SkyBox_Changed`.
- `sky <name>` -- `gl_warp.c:1351`, registered as Quakespasm-compat alias for `r_skybox`. Help string says "please use r_skybox."
- `loadsky <name>` -- `gl_warp.c:1352`, registered as DarkPlaces-compat alias for `r_skybox`. Help string says "please use r_skybox."
- `listskyboxes` -- `gl_warp.c:1353`. Enumerates available custom skyboxes for the current set of skyboxes-on-disk.

**Three-mode dispatch (`R_SetSky`, `gl_warp.c:73-160`):**

1. **Equirectangular** (line 98): probes a single texture via
   `R_LoadHiResTexture(sky, "env:gfx/env", IF_LOADNOW|IF_NOMIPMAP)`. If
   found, registers shader `skybox_<name>` with `program defaultsky#EQUI`
   (single-image projection). Highest priority.

2. **Cubemap** (line 125): only when `sh_config.havecubemaps`. Probes
   `R_LoadHiResTexture(sky, "env:gfx/env", IF_LOADNOW|IF_TEXTYPE_CUBE|IF_NOMIPMAP|IF_CLAMP)`.
   If found, registers shader with `program defaultskybox` and
   `map "$cube:$reflectcube"`.

3. **Legacy 6-face** (line 151): fallback, always available. Registers a
   shader with `skyparms "<name>" 512 -`; shader-compile path invokes
   `Shader_ParseSkySides` which iterates the 4-pattern x 2-suffix probe
   table:

   ```c
   static char *skyname_suffix[][6] = {
       {"rt", "bk", "lf", "ft", "up", "dn"},
       {"_rt", "_bk", "_lf", "_ft", "_up", "_dn"}
   };
   static char *skyname_pattern[] = {
       "%s_%s",       // <name>_<suffix>     (effectively name+sep+suffix)
       "%s%s",        // <name><suffix>      (or name+_suffix when sep is in suffix)
       "env/%s%s",
       "gfx/env/%s%s"
   };
   ```

   Eight probes per face: four directory patterns x two suffix variants.
   First match wins. The expansion does produce one degenerate combination
   (`"%s_%s"` + `"_rt"` -> `<name>__rt`, double underscore) which is
   essentially unreachable in practice.

**Cubemap path search-list semantics:** `"env:gfx/env"` is FTE's
`R_LoadHiResTexture` fallback-prefix list. The function tries each prefix
(`env/`, then `gfx/env/`) plus the bare-root form. So the cubemap path
covers the same install layouts as the legacy 6-face path, plus the
single-file equirectangular texture name.

**Skywind support:** None. FTE has no skywind family or `_wind.cfg`
loader. Confirmed via grep across `research/repos/fteqw/engine/`.

---

## Step 3 -- Documentation cross-reference

### Local rip (`research/repos/ezquake-docs/`)

This rip IS the source tree that builds ezquake.com (per the skill's
"local rip is authoritative" rule), so no jina fallback fetch was needed.

**Page:** `docs/docs/textures.md`, section `## Skyboxes` (lines 263-276).
**Last edit:** `2022-11-21` (`git log -1 -- docs/docs/textures.md`).
**Stale threshold:** the skill marks pages last-edited <= 2022-11-21 as
presumed stale. This page is exactly on the threshold; treat as stale.

**Page content (compressed):**

- Naming convention `[basename][part][extension]` where `part` is
  `bk|dn|lf|ft|rt|up`, extension is `.png` or `.tga`.
- Install location: `/qw/env/`.
- Load command: `/loadsky <name>`.
- Mentions `/skygroup` for per-map skyname rules.
- Mentions `/r_skyname` cvar.
- Mentions `/r_fastsky` as a sky-rendering toggle elsewhere on the page.

**Doc vs source comparison:**

| Doc claim | Source reality | Verdict |
|---|---|---|
| `qw/env/` is the install path | source probes 4 prefix variants: `env/`, `gfx/env/`, with and without underscore separator | Doc covers the recommended subset; source is broader. |
| `[basename][part]` (no separator) | source probes both `<name><suffix>` AND `<name>_<suffix>` separator forms; community convention is the underscore form | Doc reflects an older convention; corpus + source both lean underscore. |
| `.png` or `.tga` | source / `R_LoadImagePixels` also accepts `.jpg` | Doc omits .jpg; seed has it. |
| `/loadsky <name>` | confirmed; registered in `R_SkyRegisterCvars` | OK. |
| `/skygroup` for map rules | confirmed; registered in `host.c:546` | OK. |
| `/r_skyname` cvar | confirmed | OK. |
| skywind family | **not mentioned** | Doc gap. |
| `_wind.cfg` companion file | **not mentioned** | Doc gap. |
| FTE behavior | **not in scope** for this rip | Expected (ezQuake-only doc). |

The page is ezQuake-only by design (the local rip serves ezquake.com). FTE
behavior is not covered anywhere in the rip; the FTE side is documented
only by source.

---

## Step 4 -- Corpus mining

**Filter:** `bundle_category_path == "Other / Skyboxes"` in
`/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/pass2-manifest.ndjson`.

**Bundle inventory (12 bundles):**

| id | title |
|---|---|
| 24 | Skyboxes PAK |
| 36 | Purple chaos |
| 131 | Wolf Pack Skybox |
| 132 | SuperHigh Resolution Overcast Skybox |
| 133 | PadCity Hilton |
| 135 | Endset Skybox |
| 141 | The Solar System |
| 266 | Space |
| 501 | FuhQuake Skyboxes |
| 513 | Dragonfire modified de-saturated yellow |
| 588 | Black sky with pixel stars |
| 626 | sr3 skybox |

**Install-path uniformity:** 230 install_path entries, **all** under
`qw/env/`. `install_confidence: high` and `install_source: "gfx_faq QID 16"`
for every row. The community convention is unambiguous: drop files in
`qw/env/`.

**Suffix and extension distribution (representative slice):**

- Underscore separator dominant: `<name>_rt.tga`, `<name>_bk.tga`, etc.
- Extensions: `.tga` (majority, 181+), `.png` (6), `.jpg` (6).
- Case variants observed: `_Up.tga` / `_Rt.tga` etc. -- mixed-case suffix
  forms. The engines do not normalize case at the file-lookup layer; on
  case-sensitive filesystems (Linux), users may hit missing-face fallbacks
  if their archive ships mixed-case suffixes.

**Edge case -- bundle 24 ("Skyboxes PAK"):** distributed as a `.pak`
archive. The pass2 manifest resolved the `qw/env/pak1.pak` install path.
The engines read inside `.pak` files transparently, so a skybox pack
delivered as a PAK works without unpacking. Documented in the
community thread (see comment c_id=243).

**Comment evidence (light, 11 comments across the 12 bundles):**

- Mostly aesthetic praise. Two operational comments:
  - bundle 135 c_id=348/453: user asks where files go; answer "qw/env/, /loadsky endset". Confirms typical install workflow.
- No comments mention skywind, skygroup, or FTE.

**Corpus + source alignment:** strong. `qw/env/<name>_<suffix>.<ext>` is
the canonical community install template, and source accepts it via the
`env/` + `_` probe combination. The docs' `[basename][part]` (no
separator) convention is at odds with the corpus -- nearly every bundle
uses the underscore-separator form.

---

## Step 5 -- Gap triage

Flag: **DIVERGENT**.

Three divergence axes:

1. **ezQuake docs vs source** -- docs name one install path (`qw/env/`) but
   source probes 4 prefix variants. Docs use a no-separator naming
   convention; corpus and source both lean to the underscore form. Docs
   omit the skywind family entirely. Docs omit `.jpg` extension.

2. **ezQuake vs FTE cvar/command surface** -- ezQuake's `r_skyname` +
   `loadsky` + `skygroup` + skywind family does not map to FTE. FTE's
   `r_skybox` + `r_glsl_skybox_orientation` + `r_glsl_skybox_autorotate` +
   `r_skyfog` + `listskyboxes` does not map to ezQuake. The `loadsky`
   command exists in both but ezQuake treats it as the primary load
   command while FTE marks it as a deprecated DarkPlaces compat alias.

3. **ezQuake vs FTE load mechanism** -- ezQuake has one path: 6-face
   cubemap (modernized renderer dispatches to a real cubemap face load,
   classic renderer to individual textures). FTE has three: equirectangular
   single-texture, modern cubemap, legacy 6-face shader. FTE additionally
   accepts a bare-root probe (no `env/` or `gfx/env/` prefix); ezQuake does
   not.

Source wins per spec D4. Draft body carries the divergences in the
"Cross-engine differences" and "Doc-divergence notes" sections, source as
authoritative.

---

## Suggested seed deltas

```yaml
# Proposed delta to qw-asset-types.yaml asset_type: skybox
l1_hint_function_names:
  old: ["R_SetSky", "Sky_LoadSkyboxTextures", "R_LoadSkyTexturePixels", "Shader_ParseSkySides"]
  new: ["R_SetSky", "Sky_LoadSkyboxTextures", "R_LoadSkyTexturePixels", "Shader_ParseSkySides", "Skywind_Load_f", "Mod_LoadExternalSkyTexture"]
  rationale: Skywind_Load_f loads the _wind.cfg companion file; Mod_LoadExternalSkyTexture loads BSP-internal sky-overlay replacements. Both are now visible at L1 post-audit but the seed hint list does not name them.
```

No schema-shape change; inline delta is sufficient (single field, two
entries added).

---

## L1 extractor follow-up (enrichment-grade)

These are categorization / routing gaps, NOT L1-GAP blockers. The seed
hand-carries enough information for an honest draft.

1. **`Skywind_Load_f` site has `reads_category_id: null`.** The extractor
   sees the `FS_LoadTempFile` call site at `r_brushmodel_sky.c:309` (post-
   audit win, watchlist expansion `47ea3615`), but the four-tier category
   merge (override / function / extension / enclosing-regex) does not match
   any of them. Closest fix: extend
   `ENCLOSING_FN_CATEGORY_OVERRIDES` in
   `apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py`:

   ```python
   ENCLOSING_FN_CATEGORY_OVERRIDES = [
       (re.compile(r"^Skywind_Load_f$"), "ezquake:asset_category:skybox"),
   ]
   ```

   This is the symmetric counterpart to the FTE
   `R_SetSky|Shader_ParseSkySides` override that landed earlier.

2. **`Mod_LoadExternalSkyTexture` is currently `ezquake:asset_category:skybox`** but the loaded paths
   are under `textures/<mapname>/<texname>_solid.<ext>` and
   `textures/<mapname>/<texname>_alpha.<ext>`. These match the
   `map_texture` install convention (textures/<mapname>/...), not the
   `skybox` install convention (env/...). The site loads BSP-internal sky
   overlay replacements, not skybox cubemap faces. Two reasonable
   resolutions:

   - Re-categorize the site to `map_texture` (more accurate to the install
     layout convention).
   - Keep at `skybox` and document the dual mechanism in the asset-note
     (current path; what this draft does).

   Operator review. Recommend the asset-note describe both mechanisms
   plainly so the LLM-feeder consumer can answer either question without
   guessing.

3. **Static-array path-template extraction** -- the
   `R_LoadSkyTexturePixels` `search_paths[]` table and the FTE
   `skyname_pattern[]` / `skyname_suffix[]` tables are still hand-carried
   in the seed's `engine_canonical_paths`. The libclang AST visitor does
   not walk static array initializers, so the per-site path_template fields
   in L1 JSON are `null` for these loops. This is a known enrichment-grade
   gap (per `status-flag-rubric.md` Section L1-GAP case study); not a
   blocker for the draft, but a future extractor enhancement would let
   L1 JSON regression-check the seed.

---

## Calibration findings (skill review notes)

These are notes for the asset-type-curate skill itself, not for the
asset-note draft.

1. **Skill text -- "exhaustive related_entities" tension with judgment.**
   The template says related_entities is "every cvar/command the engine
   recognizes for this asset_type." For skybox, where does the boundary
   sit between "for this asset" and "adjacent"? `r_fastsky` prevents the
   skybox from displaying (replaces it with a flat color) -- is it
   recognized for the skybox or adjacent to it? I included it because
   a user asking "why doesn't my skybox show" would need to find it.
   Similar for `gl_skyboxdist` (far-plane geometry parameter) and
   `r_skycloudalpha` (legacy-cloud opacity, only matters when no skybox).
   Friction point: "exhaustive" without an explicit "where adjacency
   stops" rule pushes the author toward over-inclusion or arbitrary
   trimming. A one-line scope test in the template would help.

2. **Skill text -- chunk-first answer rule + length guideline interplay.**
   The template now says length is a guideline, not a ceiling, and that
   the first ~30 lines (Description + How it loads + Install layout)
   should be self-contained. For a Rich-tier slug with multi-engine
   multi-mechanism content, the "How it loads" section ends up long if it
   covers both engines fully; truncating it to fit ~30 lines compresses
   the cross-engine narrative out of the chunk-first answer. I prioritized
   chunk-first by leading with the dominant ezQuake mechanism and
   deferring FTE detail to "Cross-engine differences," but a reader who
   only loads the first chunk gets ezQuake-centric framing. This may be
   the right trade-off; flagging it for skill review.

3. **L1 evidence shape -- categorization gap visible at L1, but not via the standard query.**
   The `Skywind_Load_f` site lives in `.loader_sites` with
   `reads_category_id: null`. A naive query `select(reads_category_id == "ezquake:asset_category:skybox")` misses it. The skill could
   benefit from a Step 1 sub-step that surfaces uncategorized sites whose
   enclosing function name semantically belongs to the slug ("Skywind"
   substring fingerprint is the obvious cue here). Otherwise the
   investigator must already know to look.

4. **Mod_LoadExternalSkyTexture mis-categorization -- skill ambiguity on what to do.**
   The site is L1-categorized to skybox but the path template would route
   to map_texture. The draft describes both. The skill's Step 5 triage
   does not have an explicit "L1 categorization is questionable but
   not blocking" sub-flag; I put the finding under `## L1 extractor
   follow-up`. Worth codifying the sub-flag name in the rubric so future
   slices route findings consistently.

5. **Doc-currency threshold edge case.** textures.md was last edited
   exactly `2022-11-21`, on the stale threshold. The rubric says `<=`
   so it counts as stale. Consider phrasing it `< 2022-11-22` or adding
   "boundary-inclusive" to avoid future confusion.

6. **Companion-file convention -- _wind.cfg.** The seed notes call it
   "Companion sub-file, same asset_type" and `companion_asset_types: []`
   matches. The OPERATIONS.md cross-reference convention ("Within-type
   multi-file -- no companion field needed") is clear, but a reader new to
   the convention might expect `_wind.cfg` (different file format, plain
   text vs binary image) to warrant its own slug. The current convention
   is correct; the note body's "Files involved" section carries the
   clarification.

7. **Reframe lands cleanly.** The LLM-feeder framing (related_entities as
   join key; body owns narrative; length as guideline; some L1/body
   overlap correct) felt actionable. The compress-vs-keep rule
   ("does this affect what files the user installs, where they go, how a
   tool identifies them, OR does it answer 'how does this cvar behave in
   this asset's context' in one line") is the most useful new line.

---

## Cross-references

- `apps/qw-oracle/curated/asset-notes/skybox.md` -- draft produced by this run.
- Previous (pre-wipe) versions retrievable via `git show HEAD~:apps/qw-oracle/curated/asset-notes/skybox.md` and `git show HEAD~:apps/qw-oracle/docs/asset-curation/skybox-investigation.md`.
- `references/status-flag-rubric.md` Section "DIVERGENT" / "Skybox case study" -- this run's flag rationale.
- `references/divergent-resolution-rubric.md` Section 4 "Worked example -- skybox legacy 6-face shader path" -- guidance applied to FTE three-mode framing.
- `references/cross-engine-loader-grep.md` Section 4 -- override-tier rationale used in FTE site categorization.
- Memory anchors: `project_l1_seed_l3_layering`, `feedback_l3_three_layer_wiki_feeder`, `reference_role_override_tier_design`.
