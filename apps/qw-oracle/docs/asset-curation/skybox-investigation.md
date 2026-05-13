---
slug: skybox
asset_type: skybox
status: DIVERGENT
audit_date: 2026-05-13
engines_in_scope: [ezquake, fte, qwcl, mvdsv]
---

# Skybox -- asset-type-curate investigation

## Status

**DIVERGENT.** Source supports more than ezquake-docs claims on every axis (extensions, prefix variants, suffix variants, skywind companion file). FTE has three distinct load paths (equirectangular / native cubemap / legacy 6-face) that the ezQuake-side docs do not cover at all. QWCL has a hardcoded dev-stub skybox loader for a fixed test name (`bkgtst*`) that is not user-facing.

Source wins per D4. Draft is authored from source + corpus; doc claims are reproduced only to anchor the divergence callouts.

## Evidence summary

| Stream | Engine | Findings |
|---|---|---|
| L1 (extractor) | ezQuake | 1 categorized site at `r_brushmodel_sky.c:202` (`R_LoadImagePixels` inside `R_LoadSkyTexturePixels`). The 6-face × 4-prefix path templates live in static arrays inside the function and are not enumerated as 24 distinct sites. |
| L1 (extractor) | FTE | 6 categorized sites across `gl_warp.c` (`R_SetSky` -- 5 sites) and `gl_shader.c` (`Shader_ParseSkySides` -- 1 site). Categorization correct via `ENCLOSING_FN_CATEGORY_OVERRIDES` role-override tier (recently landed 2026-05-13). |
| L1 (extractor) | QWCL | No skybox-categorized sites. The hardcoded `R_LoadSkys` at `gl_warp.c:637` loads only `gfx/env/bkgtst<suffix>.tga` (dev test stub); not a user-facing asset path. |
| L1 (extractor) | MVDSV | None expected. Skyboxes are client-side rendering only. |
| Docs | ezquake-docs | Skyboxes section in `research/repos/ezquake-docs/docs/docs/textures.md:261-276`; last edited 2022-11-21 (stale per the >=2022-11-21 threshold). Live ezquake.com/docs/textures.html mirrors the same content exactly. |
| Corpus | gfx sandbox | 12 high-confidence bundles under `Other / Skyboxes` category; 100% install_source = `gfx_faq QID 16` (canonical `qw/env/<name><suffix>.<ext>`). 229 face files: 217 .tga + 6 .png + 6 .jpg. |
| Corpus | gfx_comment | 11 comments on skybox bundles; representative user-flow exchange ("the files goes to qw/env/" / "/loadsky endset") confirms the install + load workflow. |

## Source verification

### ezQuake (`research/repos/ezquake-source/src/r_brushmodel_sky.c`)

Entry chain:
- `R_SetSky(char *skyname)` at line 93 -- entry from `OnChange_r_skyname` (cvar change), `R_LoadSky_f` (`/loadsky` command), or `TP_GetSkyGroupName` override (when current map belongs to a skygroup that maps to a custom sky).
  - Filters: empty name or name containing `.` is rejected (line 104).
  - Skygroup override priority: `TP_GetSkyGroupName(TP_MapName(), NULL)` takes precedence over the explicit `skyname` argument (line 102).
- `Sky_LoadSkyboxTextures(skyname)` at line 211 -- orchestrator. Iterates 6 cubemap directions; per-face delegates to `R_LoadSkyTexturePixels`. Face-to-cube-index mapping: `{ 4, 1, 5, 0, 2, 3 }` (line 213).
- `R_LoadSkyTexturePixels(dir, skyname, ...)` at line 184 -- per-face loader. **Static arrays at lines 186-187:**
  - Suffixes: `{ "rt", "bk", "lf", "ft", "up", "dn" }`
  - Prefix/separator pairs: `{ "env/", "" }, { "gfx/env/", "" }, { "env/", "_" }, { "gfx/env/", "_" }`
  - Path construction: `<prefix><skyname><separator><suffix>` -> e.g., `env/morningrt`, `gfx/env/morning_rt`.
  - Calls `R_LoadImagePixels(path, ...)` (line 202) which probes available extensions (.tga, .png, .jpg) per the engine's image-pipeline.

Cvars (in `r_rmain.c`):
- `r_skyname` at line 171 -- triggers `OnChange_r_skyname` -> `R_SetSky` on change.
- `r_skywind` at line 172 -- enable parsed wind config.
- `r_skycolor` at line 160 -- RGB color used when skybox not loaded (fallback flat sky).
- `r_fastsky` at line 158 -- disable skybox, render flat color (used by competitive players for clarity / FPS).

Commands:
- `loadsky` (`R_LoadSky_f` at line 138; registered line 537) -- sets `r_skyname`.
- `skygroup` (in `cl_skygroups.c`) -- assigns one sky to multiple maps via the message-trigger system.
- `skywind_load` (line 540) -- reloads the wind cfg companion.

Skywind companion file: `gfx/env/<skyname>_wind.cfg` (per `SKYWIND_CFG = "_wind.cfg"` at line 49; usage at lines 308, 363). Plain-text config consumed by `Skywind_Load_f` for sky-cloud wind direction/speed.

### FTE (`research/repos/fteqw/engine/gl/gl_warp.c` + `gl_shader.c`)

Entry: `R_SetSky(const char *sky)` at `gl_warp.c:73`. The function stores the name in `cl.skyname` (line 79) but `r_skyboxname` (registered as cvar `r_skybox` at line 41) overrides when set (line 84-85).

Three loading paths in priority order:

1. **Equirectangular** (line 98). Loads a single 2D image at `env/<sky>.<ext>` or `gfx/env/<sky>.<ext>` via `R_LoadHiResTexture(sky, "env:gfx/env", IF_LOADNOW|IF_NOMIPMAP)`. The `"env:gfx/env"` is a colon-separated subdir-list; the engine probes both. Used as 360° panoramic projection.
2. **Native cubemap** (line 125). When `sh_config.havecubemaps`, loads a single cubemap-format texture (.dds / .ktx) via `R_LoadHiResTexture(sky, "env:gfx/env", IF_LOADNOW|IF_TEXTYPE_CUBE|IF_NOMIPMAP|IF_CLAMP)`. Cube faces packed in one file.
3. **Legacy 6-face** (line 151). Falls back to `R_RegisterShader(shadername, 0, va("{\nsort sky\nskyparms \"%s\" 512 -\n...}", sky))`. The `skyparms` shader directive invokes `Shader_ParseSkySides` (`gl_shader.c:651`) which probes individual face textures.

`Shader_ParseSkySides` (`gl_shader.c:651-715`) probes 4 path patterns × 2 suffix sets per face:
- Patterns (line 668-673): `"%s_%s"`, `"%s%s"`, `"env/%s%s"`, `"gfx/env/%s%s"`
- Suffix sets (line 659-666): `{rt, bk, lf, ft, up, dn}` and `{_rt, _bk, _lf, _ft, _up, _dn}` (with leading underscore)
- Calls `R_LoadHiResTexture(path, NULL, IF_NOALPHA|IF_CLAMP|IF_LOADNOW)` (line 699). Accepts any face being valid (`if (i == 6)` for ALL missing).

Inline comment from FTE dev (Spike) at line 149: *"crappy old path that I still need to fix up a bit"* -- the 6-face path is the legacy fallback but remains active at HEAD. Not formally deprecated; equirectangular and cubemap modes take priority when their files exist.

FTE-only cvars (`gl_warp.c:40-44`):
- `r_skybox` -- user-facing name (registered as C symbol `r_skyboxname` with `CVARFC`).
- `r_glsl_skybox_orientation` -- 4 values: rotation axis (x,y,z) + speed (deg/sec). Default `"0 0 0 0"`.
- `r_glsl_skybox_autorotate` -- toggle for auto-rotation. Default `"1"`.
- `r_skyfog` -- fog alpha on skyboxes (default `"0.5"`).
- `r_skycloudalpha` -- legacy scrolling-cloud-sky front-layer opacity (this is the classic id-Quake animated sky, not the 6-face skybox; included here for completeness but does not belong in the asset-note's related_entities).

FTE-only commands (`gl_warp.c:1351-1353`):
- `sky` -- QuakeSpasm-compat alias for `r_skybox`.
- `loadsky` -- DarkPlaces-compat alias.
- `listskyboxes` -- prints available skyboxes (enumerates `env/`, `gfx/env/`, `textures/env/`, `textures/gfx/env/` via `R_ForceSky_c` at `gl_warp.c:221-227`).

Path-enumeration set in `R_ForceSky_c` is wider than the load-time set in `Shader_ParseSkySides` -- enumeration also walks `textures/env/` and `textures/gfx/env/` for tab-completion / `listskyboxes`. Whether load-time probing reaches `textures/env/` depends on `R_LoadHiResTexture`'s search behavior; the `R_SetSky` invocations pass only `"env:gfx/env"` as subdirs, so load-time probing does not include `textures/env/`. This means a user can SEE a skybox via `listskyboxes` from `textures/env/` but `r_skybox <name>` may not load it. Worth flagging in the note's edge cases.

Also from `R_ForceSky_Enumerated` (`gl_warp.c:181-186`): FTE recognizes Q3-style suffixes `{px, nx, py, ny, pz, nz}` and `{posx, negx, posy, negy, posz, negz}` for ENUMERATION, but the load-time `Shader_ParseSkySides` only probes the QW/Quake-standard `{rt, bk, lf, ft, up, dn}` set. Tab-completion will surface Q3-named cubemaps but `r_skybox` cannot load them via the 6-face path; only via the native-cubemap path (if the file is a single cubemap file).

### QWCL (`research/repos/qwcl-original/QW/client/gl_warp.c`)

`R_LoadSkys` at line 637. Hardcoded:
```c
char *suf[6] = {"rt", "bk", "lf", "ft", "up", "dn"};
...
sprintf(name, "gfx/env/bkgtst%s.tga", suf[i]);
```

Loads only `gfx/env/bkgtstrt.tga`, `gfx/env/bkgtstbk.tga`, etc. No cvar, no command, no user-facing skybox selection. Dev test-only code from 1996 vintage. The L1 extractor correctly does not tag this as a user-loadable skybox site.

### MVDSV

No skybox loading. Skyboxes are client-side rendering only; MVDSV is the server. No relevant code paths.

## Documentation cross-reference

### Local rip: `research/repos/ezquake-docs/docs/docs/textures.md` (last edited 2022-11-21)

`## Skyboxes` section at lines 261-276 covers:
- Naming convention: `[basename][part][extension]` (concatenated, no underscore)
- Parts: `bk, dn, lf, ft, rt, up`
- Extensions: ".png or .tga"
- Install path: `/qw/env/`
- Example: `loadsky day` -> `daybk.tga` etc.
- Mentions `/skygroup` (no detail)
- `/r_skyname` mentioned in the "Turning off textures" section (line 295)

### Live: `https://ezquake.com/docs/textures.html#skyboxes`

Fetched via `r.jina.ai` (301 lines retrieved). Content identical to the local rip -- the live page mirrors `textures.md` from the repo.

### Doc currency

Last edit 2022-11-21 = stale by 3+ years (meets the skill's `<= 2022-11-21` staleness threshold). Source has evolved (skywind subsystem mentions in `upgrading.md:92,98` post-date this page but were not back-propagated to the Skyboxes section).

## Corpus mining

### Bundle inventory

12 bundles classified `Other / Skyboxes`, all install_confidence `high` with install_source `gfx_faq QID 16`:

```
24   Skyboxes PAK
36   Purple chaos
131  Wolf Pack Skybox
132  SuperHigh Resolution Overcast Skybox
133  PadCity Hilton
135  Endset Skybox
141  The Solar System
266  Space
501  FuhQuake Skyboxes
513  Dragonfire modified de-saturated yellow
588  Black sky with pixel stars
626  sr3 skybox
```

### Install-path consensus

All 229 skybox face files in the corpus resolve to `qw/env/<name><suffix>.<ext>`. Mixed-case observed (`Overcast_Bk.tga`, `daybk.tga`) -- engine is case-insensitive on file lookup so both work. Two naming conventions both attested:
- Concatenated: `daybk.tga`, `dayrt.tga` (dominant)
- Underscore-separated: `Overcast_Bk.tga`, `dfire_sgy_bk.tga` (rare but real)

Both forms are loadable by ezQuake (the 4 search_paths include both `""` and `"_"` separators) and by FTE (`Shader_ParseSkySides` probes both).

### Extension distribution

- 217 .tga (95%)
- 6 .png (3%)
- 6 .jpg (3%)

TGA dominant -- aligns with WinQuake/era conventions. JPG IS present in the corpus, contradicting the ezquake-docs claim of ".png or .tga" only.

### Representative comments (gfx_comment, 11 rows)

User-flow exchange (bundle 135, Endset Skybox):
> Q: "the files goes to qw/env/ load which file in the console ??"
> A: "/loadsky endset"

Confirms the canonical install + load workflow community uses.

Bundle 132 (Wolf Pack Skybox) discusses RLE-compressed TGA distribution: original 6×12MB=72MB collection compresses to 25.6MB with RLE, then 8MB at 1024×1024. Skyboxes are heavy-weight assets relative to other custom content; bundle authors care about distribution size.

## Divergence list

### Source vs docs (ezQuake)

| Claim | Docs say | Source says | Source location |
|---|---|---|---|
| Extensions | `.png` or `.tga` only | `.tga`, `.png`, `.jpg` all accepted | `R_LoadImagePixels` probes all three via image-pipeline; corpus has 6 .jpg files in use |
| Install path | `/qw/env/` only | `qw/env/` AND `qw/gfx/env/` both probed | `r_brushmodel_sky.c:187` -- 4 prefix variants |
| Suffix format | `[basename][part]` (concatenated) | `<name><suffix>` AND `<name>_<suffix>` both probed | `r_brushmodel_sky.c:187` -- both `""` and `"_"` separator pairs |
| Skywind cfg | Not mentioned at all | `gfx/env/<name>_wind.cfg` companion file consumed | `r_brushmodel_sky.c:49,308,363,540` |
| Skygroup | Mentioned without detail ("use the /skygroup command to define rules") | Full grammar at `cl_skygroups.c`; assigns skybox name to map sets via the message-trigger config | `cl_skygroups.c` |
| FTE behavior | Not mentioned | 3 distinct load paths (equirectangular / native cubemap / legacy 6-face); 5 FTE-specific cvars; 3 FTE-specific commands | `gl_warp.c:73-164` |

### ezQuake vs FTE

| Dimension | ezQuake | FTE |
|---|---|---|
| Load mode | 6-face only | 3 modes (equirectangular -> cubemap -> 6-face fallback) |
| Override cvar | `r_skyname` | `r_skybox` (also `r_skyname` works as alias for the original Quake sky-replacement code path; verify in extended L1 follow-up) |
| Load command | `loadsky` | `sky` (QS-compat), `loadsky` (DP-compat), `listskyboxes` |
| Rotation support | No (skywind animates the texture, not rotates the box) | Yes (`r_glsl_skybox_orientation` + `r_glsl_skybox_autorotate`) |
| Fog | No skybox-specific fog | Yes (`r_skyfog`) |
| Map override | Skygroup system (config-driven) | `worldspawn.sky` (BSP key); `r_skybox` cvar overrides BSP |
| Tab-completion paths | None | `env/`, `gfx/env/`, `textures/env/`, `textures/gfx/env/` |
| Q3 face naming | No | Recognized in enumeration; not loadable via 6-face path |

### QWCL vs ezQuake/FTE

QWCL has no user-facing skybox infrastructure. The `R_LoadSkys` function hardcodes a single test name (`bkgtst`) and is documented in source comments as preliminary 1996 dev code. Not a divergence to flag in the note's body beyond a one-liner.

## Suggested seed deltas

The seed at `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml:189-223` accurately captures the ezQuake 4-prefix probing and the FTE 6-face path templates. Three proposed deltas:

1. **Add FTE single-image mode paths to `engine_canonical_paths`.** The seed currently lists only 6-face path templates for FTE. Source has equivalent single-image probing at `R_SetSky` (`gl_warp.c:98,125`) for the equirectangular and native-cubemap modes. Proposed addition (under the `engine_canonical_paths` block):
   ```yaml
   # FTE single-image modes (equirectangular + native cubemap):
   - "env/<skyname>.<ext>"        # FTE: equirectangular or cubemap-format single file
   - "gfx/env/<skyname>.<ext>"    # FTE: equirectangular or cubemap-format single file
   ```
   These coexist with the 6-face paths in the seed.

2. **Add FTE-specific extensions to `engine_extensions`.** Native cubemap mode (`IF_TEXTYPE_CUBE`) typically uses `.dds` or `.ktx` (single-file cubemap formats); equirectangular mode also accepts `.hdr` / `.exr` on FTE builds with HDR support. Hedge: this is conditional on FTE build flags; not all FTE binaries include HDR. Proposed addition (as a separate field or extension to engine-specific notes):
   ```yaml
   engine_extensions_fte_singleimage: [".dds", ".ktx", ".hdr", ".exr"]  # extended set for single-image modes; subset depending on build
   ```
   Alternative: extend the existing `engine_extensions: [".tga", ".png", ".jpg"]` with a comment that FTE single-image modes accept additional formats. Operator decides shape.

3. **Document the skywind cfg companion.** The seed's `notes` field could mention the `gfx/env/<skyname>_wind.cfg` ezQuake-only companion file -- it's a sub-file of the skybox asset_type, not a separate slug. Proposed addition to the `notes:` field:
   > ezQuake additionally consumes `gfx/env/<skyname>_wind.cfg` -- a plain-text wind-direction/speed config that animates the sky-cloud overlay when `r_skywind 1`.

These are not promote-to-file deltas (per D6); all three fit inline.

## L1 extractor follow-up

Not a halting L1-GAP -- source is directly verifiable, the seed accurately carries the path templates, and 1 (ezQuake) + 6 (FTE) categorized sites are present in the extractor output. But two extraction enhancements would strengthen Layer 1 evidence for skybox and other static-array asset_types:

1. **Static-array path-template enumeration.** `R_LoadSkyTexturePixels` constructs paths from a static `search_paths[][]` array combined with a static `skybox_ext[]` array. The current extractor sees the `R_LoadImagePixels` call but does not walk the enclosing function's static array initializers, so the 4 prefix variants × 6 face suffixes (= 24 path templates per ezQuake skybox load) are not enumerated as 24 distinct loader sites. Pattern likely recurs for `Shader_ParseSkySides` (FTE: 4 patterns × 2 suffix sets × 6 faces = 48 path templates). Capability gap, not a categorization gap.

2. **FTE multi-mode loader dispatch.** `R_SetSky` dispatches to three distinct loading paths (equirectangular / cubemap / 6-face) based on file format + `sh_config.havecubemaps`. The extractor captures the 5 sites inside `R_SetSky` (correctly categorized via the override tier) but does not distinguish which mode each site serves. A future pass could split the sites by mode for richer L1 evidence.

Both are nice-to-haves; not blocking the asset-note draft.

## Suggested concept-note partner

**No partner needed.** Skybox is a purely cosmetic asset_type with no cross-domain gameplay implications. Cross-engine differences exist (FTE has rotation / fog / cubemap modes; ezQuake has skywind) but those are still asset-mechanism context that belongs in this asset-note's body, not a separate concept-note's vertical-slice walkthrough.

A thin angle exists: competitive players sometimes set `r_fastsky 1` to disable skybox rendering for FPS / clarity, which is a competitive-context recipe. But this is a one-cvar recipe, not a multi-layer gameplay walkthrough -- it fits as an edge-case bullet in this note, not as scaffolding for a partner note.

Compare: `player_skin` earned a partner because the asset's full story requires programmatic tinting + powerup-glow + per-player tracking + corpse-readability + ruleset gates + FPD bits -- multiple L1 anchors across multiple subsystems. Skybox lacks that surface.

## Artifacts

- Investigation: `apps/qw-oracle/docs/asset-curation/skybox-investigation.md` (this file)
- Draft note: `apps/qw-oracle/curated/asset-notes/skybox.md`
