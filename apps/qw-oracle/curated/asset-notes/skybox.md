---
slug: skybox
asset_type: skybox
engine_canonical_paths:
  ezquake:
    - "env/<skyname><suffix>.<ext>"
    - "env/<skyname>_<suffix>.<ext>"
    - "gfx/env/<skyname><suffix>.<ext>"
    - "gfx/env/<skyname>_<suffix>.<ext>"
  fte:
    - "env/<skyname><suffix>.<ext>"
    - "env/<skyname>_<suffix>.<ext>"
    - "gfx/env/<skyname><suffix>.<ext>"
    - "gfx/env/<skyname>_<suffix>.<ext>"
    - "<skyname><suffix>.<ext>"
    - "<skyname>_<suffix>.<ext>"
    - "env/<skyname>.<ext>"
    - "gfx/env/<skyname>.<ext>"
  qwcl: []
  mvdsv: []
user_install_paths:
  - "qw/env/<skyname><suffix>.<ext>"
corpus_categories:
  - "Other / Skyboxes"
related_entities:
  - ezquake:cvar:r_skyname
  - ezquake:cvar:r_skywind
  - ezquake:cvar:r_skycolor
  - ezquake:cvar:r_fastsky
  - ezquake:command:loadsky
  - ezquake:command:skygroup
  - ezquake:command:skywind
  - ezquake:command:skywind_save
  - ezquake:command:skywind_load
  - ezquake:command:skywind_lookdir
  - ezquake:command:skywind_rotate
  - fte:cvar:r_skybox
  - fte:cvar:r_glsl_skybox_orientation
  - fte:cvar:r_glsl_skybox_autorotate
  - fte:cvar:r_skyfog
  - fte:command:sky
  - fte:command:loadsky
  - fte:command:listskyboxes
companion_asset_types: []
l1_canonical_ids:
  ezquake:
    - ezquake:loader_site:R_LoadImagePixels_r_brushmodel_sky_R_LoadSkyTexturePixels_1
  fte:
    - fte:loader_site:R_LoadHiResTexture_gl_warp_R_SetSky_1
    - fte:loader_site:R_LoadHiResTexture_gl_warp_R_SetSky_2
    - fte:loader_site:R_RegisterShader_gl_warp_R_SetSky_1
    - fte:loader_site:R_RegisterShader_gl_warp_R_SetSky_2
    - fte:loader_site:R_RegisterShader_gl_warp_R_SetSky_3
    - fte:loader_site:R_LoadHiResTexture_gl_shader_Shader_ParseSkySides_1
  qwcl: []
  mvdsv: []
status: DIVERGENT
last_verified: 2026-05-13
authority_grounds: engine_mechanics
---

## Description

A skybox is the painted dome of distant scenery rendered behind every visible sky surface in a map. It is a six-image cubemap -- one square texture per cardinal direction (right, left, front, back, up, down) -- that the engine wraps around the player to give the illusion of a horizon. Replacing the default scrolling cloud sky with a skybox is a per-client choice; the server does not push skybox content. Stock QuakeWorld maps reference no skybox by default.

## How it loads

**ezQuake.** A skybox name set via `r_skyname` (or `/loadsky <name>`, or an active skygroup) triggers `R_SetSky` -> `Sky_LoadSkyboxTextures`, which probes six faces at four prefix variants (`env/`, `gfx/env/` each with optional `_` separator between name and suffix) across three image extensions. The first matching path per face wins; faces bind as one cubemap texture. Source: `r_brushmodel_sky.c:184-209`.

**FTE.** A skybox name set via `r_skybox` (overriding the BSP `worldspawn.sky` key) triggers `R_SetSky` and dispatches three load paths in order: single-image equirectangular (`env/<name>.<ext>` as 360-degree projection), native cubemap (single `.dds`/`.ktx` file with 6 faces packed), and legacy 6-face fallback (six individual face files via `Shader_ParseSkySides`, probing 4 patterns crossed with 2 suffix sets). First mode that resolves wins. Source: `gl_warp.c:73`.

**QWCL.** No user-facing skybox. `R_LoadSkys` is hardcoded to load `gfx/env/bkgtst*.tga` (1996 dev test stub).

**MVDSV.** Server-side. Skyboxes are client-rendered only.

## Install layout

Drop the six face files at `qw/env/<skyname><suffix>.<ext>`. For a skybox named `morning`:

```
qw/env/morningrt.tga    (right)
qw/env/morningbk.tga    (back)
qw/env/morninglf.tga    (left)
qw/env/morningft.tga    (front)
qw/env/morningup.tga    (up)
qw/env/morningdn.tga    (down)
```

`qw/env/` is the canonical install location (`gfx_faq` QID 16, 100% of corpus bundles). `qw/gfx/env/` is also probed by both ezQuake and FTE and works identically; it's a fallback typical of nQuake distributions.

To activate: `/r_skyname morning` (ezQuake) or `/r_skybox morning` (FTE). To unload: empty-string the cvar, or `/loadsky none` (ezQuake convenience).

## Files involved

A complete skybox is six face textures plus, on ezQuake, an optional wind-config companion.

| File | Cubemap direction | Required |
|---|---|---|
| `<name>rt.<ext>` (or `<name>_rt.<ext>`) | right (+X) | yes |
| `<name>lf.<ext>` (or `<name>_lf.<ext>`) | left (-X) | yes |
| `<name>ft.<ext>` (or `<name>_ft.<ext>`) | front (+Y) | yes |
| `<name>bk.<ext>` (or `<name>_bk.<ext>`) | back (-Y) | yes |
| `<name>up.<ext>` (or `<name>_up.<ext>`) | up (+Z) | yes |
| `<name>dn.<ext>` (or `<name>_dn.<ext>`) | down (-Z) | yes |
| `<name>_wind.cfg` (ezQuake only) | sky-cloud wind animation config | no |

The skywind companion at `gfx/env/<name>_wind.cfg` is plain text. When `r_skywind 1` (default), ezQuake parses it for wind direction, speed, and period; reloadable via `/skywind_load`. Both concatenated (`morningrt.tga`) and underscore-separated (`morning_rt.tga`) naming conventions load on either engine -- the engine probes both forms per face.

FTE's single-image modes (equirectangular `env/<name>.<ext>` or cubemap `env/<name>.dds`/`.ktx`) replace the six files with one; the engine picks whichever file exists.

## Cross-engine differences

ezQuake renders 6-face cubemaps only; FTE supports three load modes and adds rotation + fog cvars; QWCL has a hardcoded dev stub; MVDSV doesn't load skyboxes.

| Dimension | ezQuake | FTE |
|---|---|---|
| Active name source | `r_skyname` cvar | `worldspawn.sky` BSP key, overridden by `r_skybox` cvar |
| Load modes | 6-face only | equirectangular -> cubemap -> 6-face |
| Load-time prefixes | `env/`, `gfx/env/` | `env/`, `gfx/env/` (load); + `textures/env/`, `textures/gfx/env/` (enumeration only) |
| Extensions | `.tga`, `.png`, `.jpg` | `.tga`, `.png`, `.jpg` (6-face); + `.dds`, `.ktx`, possibly `.hdr`/`.exr` (single-image modes) |
| Animation | `r_skywind` cloud overlay via `_wind.cfg` | `r_glsl_skybox_orientation` axis rotation; `r_skyfog` fog blend |
| Disable / fallback | `r_fastsky 1` (flat `r_skycolor`) | classic sky render path; no single-cvar disable |

Cvar behavior summaries:

- `r_skyname` (ezQuake): sets active skybox name; OnChange triggers `R_SetSky` reload.
- `r_skywind` (ezQuake): when 1, enables sky-cloud wind animation from `_wind.cfg`.
- `r_fastsky` (ezQuake): when 1, disables skybox; renders flat `r_skycolor`.
- `r_skybox` (FTE): sets active skybox; overrides BSP `worldspawn.sky`.
- `r_glsl_skybox_orientation` (FTE): four values (x, y, z axis + degrees/sec speed). Default `"0 0 0 0"`.
- `r_glsl_skybox_autorotate` (FTE): toggle for the rotation defined by `_orientation`. Default `1`.
- `r_skyfog` (FTE): fog alpha applied to skybox; cumulative with regular fog.

## Community conventions

Skyboxes distribute as six face files inside a zip or pk3 with names matching the engine's expected pattern. The qw.nu gfx archive carries 12 high-confidence skybox bundles (`Other / Skyboxes`), all sourced with `gfx_faq` QID 16 install authority targeting `qw/env/`. Representative bundles: Skyboxes PAK (24), Purple chaos (36), Wolf Pack Skybox (131), Endset Skybox (135).

Of 229 face files in the corpus: 217 `.tga` (95%), 6 `.png` (3%), 6 `.jpg` (3%). TGA dominant; file lookup is case-insensitive so mixed-case (`Overcast_Bk.tga` + `daybk.tga`) both load. Concatenated and underscore-separated naming both attested; both load.

Skyboxes are heavyweight relative to other custom content -- six 1024x1024 TGAs is ~70MB uncompressed. RLE-compressed TGA is the standard distribution format.

## Edge cases

- **Empty-name short-circuit (ezQuake).** `R_SetSky` rejects empty `r_skyname` and any name containing a dot. Setting `r_skyname ""` disables the skybox cleanly; `r_skyname my.skybox` silently does nothing.

- **Skygroup overrides cvar (ezQuake).** If the current map matches a skygroup, the group's sky name wins over `r_skyname`. Maps not in any group fall through to the cvar value.

- **Worldspawn override (FTE).** BSP `worldspawn.sky` key provides the default skyname on map load; the `r_skybox` cvar overrides when set. ezQuake doesn't honor `worldspawn.sky` -- it relies on `r_skyname` or skygroup.

- **Partial face loads (FTE).** The legacy 6-face path accepts a skybox where any one face is valid; missing faces render black. Permissive by design. ezQuake rejects the whole skybox if any face fails and falls back to the classic cloud sky.

- **Case-sensitive filesystems.** Filename case-folding is OS-level. Mixed-case bundles (`Overcast_Bk.tga`) load on Windows / macOS but fail on Linux without rename. Prefer lowercase for cross-platform distribution.

- **Tab-completion vs load-time path mismatch (FTE).** `listskyboxes` enumerates `env/`, `gfx/env/`, `textures/env/`, `textures/gfx/env/`. Load-time probing in `R_SetSky` covers only `env/` and `gfx/env/` -- a skybox under `textures/env/` appears in tab-completion but fails to load. Q3-style face suffixes (`px`, `nx`, etc.) are recognized by the enumerator but not by the 6-face loader.

## Doc-divergence notes

The ezQuake textures documentation page (`research/repos/ezquake-docs/docs/docs/textures.md:261-276`, last edited 2022-11-21) is stale by 3+ years. Source supports more than the docs claim: `.jpg` extension, `gfx/env/` fallback prefix, underscore-separator naming, the skywind companion file, and FTE entirely. Full divergence table in `apps/qw-oracle/docs/asset-curation/skybox-investigation.md`.

## Related

- Skygroup mechanism (ezQuake): `cl_skygroups.c` and the `/skygroup` command grammar.
- Skywind animation (ezQuake): `r_skywind` cvar + `gfx/env/<name>_wind.cfg` companion + `/skywind_load` reloader.
- FTE single-image sky paths are not strictly the same asset_type as the 6-face skybox; one user-facing cvar (`r_skybox`) selects whichever mode resolves first.
