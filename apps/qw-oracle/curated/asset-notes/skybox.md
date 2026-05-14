---
slug: skybox
asset_type: skybox
engine_canonical_paths:
  ezquake:
    - env/<skyname><suffix>.<ext>
    - env/<skyname>_<suffix>.<ext>
    - gfx/env/<skyname><suffix>.<ext>
    - gfx/env/<skyname>_<suffix>.<ext>
    - textures/<mapname>/<bsp_skytex>_solid.<ext>
    - textures/<mapname>/<bsp_skytex>_alpha.<ext>
  fte:
    - <skyname><suffix>.<ext>
    - <skyname>_<suffix>.<ext>
    - env/<skyname><suffix>.<ext>
    - env/<skyname>_<suffix>.<ext>
    - gfx/env/<skyname><suffix>.<ext>
    - gfx/env/<skyname>_<suffix>.<ext>
    - env/<skyname>.<ext>
    - gfx/env/<skyname>.<ext>
user_install_paths:
  - qw/env/<skyname><suffix>.<ext>
corpus_categories:
  - Other / Skyboxes
related_entities:
  - ezquake:cvar:r_skyname
  - ezquake:cvar:r_skywind
  - ezquake:cvar:r_fastsky
  - ezquake:cvar:gl_scaleskytextures
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
  - fte:cvar:r_fastsky
  - fte:cvar:r_fastskycolour
  - fte:cvar:gl_skyboxdist
  - fte:cvar:r_skycloudalpha
  - fte:command:sky
  - fte:command:loadsky
  - fte:command:listskyboxes
companion_asset_types: []
l1_canonical_ids:
  ezquake:
    - ezquake:loader_site:Mod_LoadExternalSkyTexture_r_brushmodel_load_R_LoadBrushModelTextures_1
    - ezquake:loader_site:Sky_LoadSkyboxTextures_r_brushmodel_sky_R_SetSky_1
    - ezquake:loader_site:R_LoadImagePixels_r_brushmodel_sky_R_LoadSkyTexturePixels_1
    - ezquake:loader_site:R_LoadSkyTexturePixels_r_brushmodel_sky_Sky_LoadSkyboxTextures_1
  fte:
    - fte:loader_site:R_LoadHiResTexture_gl_shader_Shader_ParseSkySides_1
    - fte:loader_site:R_LoadHiResTexture_gl_warp_R_SetSky_1
    - fte:loader_site:R_RegisterShader_gl_warp_R_SetSky_1
    - fte:loader_site:R_LoadHiResTexture_gl_warp_R_SetSky_2
    - fte:loader_site:R_RegisterShader_gl_warp_R_SetSky_2
    - fte:loader_site:R_RegisterShader_gl_warp_R_SetSky_3
status: DIVERGENT
last_verified: 2026-05-14
authority_grounds: engine_mechanics
---

## Description

A skybox is a six-image cubemap that paints the world's sky dome. Each
image is one face of a cube surrounding the camera (rt / bk / lf / ft /
up / dn); the engine samples whichever face a sky-flagged surface points
at. Replaces the classic Quake scrolling-cloud sky when a skybox is
loaded. ezQuake and FTE both render skyboxes but expose distinct
cvar / command surfaces and probe paths.

## How it loads

The skybox name comes from one of three sources, in priority order:
the per-map override registered via the `skygroup` command (ezQuake
only), the BSP worldspawn's `sky` / `skyname` key (pushed into
`r_skyname` at map load), or whatever the user typed at the console
(`r_skyname` on ezQuake, `r_skybox` on FTE).

**ezQuake** (`src/r_brushmodel_sky.c`):

- `R_SetSky` runs whenever `r_skyname` changes or a new map loads. It
  resolves the skyname (skygroup -> worldspawn -> cvar), then calls
  `Sky_LoadSkyboxTextures` (`r_brushmodel_sky.c:111`).
- `R_LoadSkyTexturePixels` (`r_brushmodel_sky.c:184`) probes four
  prefix/separator combinations per face: `env/<name><suffix>`,
  `gfx/env/<name><suffix>`, `env/<name>_<suffix>`,
  `gfx/env/<name>_<suffix>`. First hit wins. `R_LoadImagePixels` handles
  the actual file load and accepts `.tga`, `.png`, `.jpg`.
- When all six faces load and `r_skywind` is nonzero, `R_SetSky` calls
  `Skywind_Load_f` to read `gfx/env/<skyname>_wind.cfg`. See
  "Files involved."

**FTE** (`engine/gl/gl_warp.c`, `engine/gl/gl_shader.c`):

`R_SetSky` dispatches to whichever of three paths finds textures first:

1. **Equirectangular** -- single texture sampled as a panoramic
   projection. Tried via
   `R_LoadHiResTexture(sky, "env:gfx/env", IF_LOADNOW|IF_NOMIPMAP)` at
   `gl_warp.c:98`. One image, full sky.
2. **Cubemap** -- single texture loaded with `IF_TEXTYPE_CUBE`. Tried at
   `gl_warp.c:125` when `sh_config.havecubemaps`. Modern GPU path.
3. **Legacy 6-face** -- six separate face images. Always available; the
   final fallback. `Shader_ParseSkySides` (`gl_shader.c:652`) iterates a
   4-pattern x 2-suffix probe table (8 effective combinations per face);
   patterns are `<name>_<suffix>`, `<name><suffix>`, `env/<name><suffix>`,
   `gfx/env/<name><suffix>`. Includes a bare-root probe that ezQuake does
   not.

## Install layout

Drop the six face files into `qw/env/`. Name them
`<skyname>_rt.tga`, `<skyname>_bk.tga`, `<skyname>_lf.tga`,
`<skyname>_ft.tga`, `<skyname>_up.tga`, `<skyname>_dn.tga`. Then run
`/loadsky <skyname>` (ezQuake) or `r_skybox <skyname>` (FTE) at the
console. The `_<suffix>` (underscore-separator) form is the community
convention -- 100% of the corpus uses it -- and is the form most users
expect, though both engines also accept the no-separator form
(`<skyname><suffix>.<ext>`).

`.png` and `.jpg` work too; `.tga` is by far the most common in the
corpus. ezQuake additionally consumes `_wind.cfg` (see "Files involved").

## Files involved

A complete skybox bundle is up to seven files (six faces plus the
optional skywind config):

- `qw/env/<skyname>_rt.<ext>` -- right face (+X)
- `qw/env/<skyname>_bk.<ext>` -- back face (-Y)
- `qw/env/<skyname>_lf.<ext>` -- left face (-X)
- `qw/env/<skyname>_ft.<ext>` -- front face (+Y)
- `qw/env/<skyname>_up.<ext>` -- up face (+Z)
- `qw/env/<skyname>_dn.<ext>` -- down face (-Z)
- `qw/env/<skyname>_wind.cfg` -- optional, ezQuake only. Plain text:
  `skywind <distance> <yaw> <period> <pitch>`. Animates the
  classic cloud-overlay sky drift; only takes effect when `r_skywind`
  is nonzero and a skybox is loaded.

The 6-face suffix set is hard-coded in both engines and never varies.
Distance, yaw, period, pitch values map to the `skywind` console command
(`skywind_save` writes the current state out; `skywind_load` reads it
back; `R_SetSky` loads it automatically when a skybox loads).

The `_wind.cfg` file is treated by the seed as part of the skybox
asset_type (same slug, within-type multi-file convention). FTE has no
skywind feature -- the file is silently ignored if a user copies it into
a mixed-engine install.

## Cross-engine differences

**Cvar / command surface.** ezQuake centers on `r_skyname` + `loadsky`
+ the skywind family. FTE centers on `r_skybox` + `r_glsl_skybox_*` +
`r_skyfog`. FTE registers `sky` and `loadsky` as deprecated compatibility
aliases for `r_skybox` (the in-engine help string says "please use
r_skybox"); on ezQuake, `loadsky` is the canonical user surface.
`skygroup` (per-map skyname rules) is ezQuake-only. Skywind animation
is ezQuake-only.

**Load mechanism.** ezQuake has a single mechanism: 6-face cubemap. The
modernized renderer dispatches the six face textures into a real GPU
cubemap; the classic renderer keeps them as six individual textures with
a direction-permutation shuffle (`skydirection[] = { 4, 1, 5, 0, 2, 3 }`,
`r_brushmodel_sky.c:213`). The user-facing 6-face suffix set is the same
either way. FTE has three mechanisms layered by preference:
equirectangular -> cubemap -> legacy 6-face. The first mechanism whose
textures resolve wins. Users target FTE most easily by shipping the
legacy 6-face set; that path is the lowest common denominator and works
everywhere.

**Probe path coverage.** ezQuake probes 4 prefix/separator combinations
under `env/` and `gfx/env/`. FTE adds bare-root probes (no directory
prefix) and accepts a single-file name (no `_<suffix>`) for the
equirectangular and cubemap modes. Both engines accept either separator
form (underscore or none). On case-sensitive filesystems (Linux), the
file lookup is case-exact -- mixed-case suffix forms like `_Up` are
distinct from `_up`.

**Skybox rotation and fog.** FTE supports skybox rotation via
`r_glsl_skybox_orientation` (axis + speed in deg/sec) and
`r_glsl_skybox_autorotate`, and fog blending via `r_skyfog`. ezQuake
does not.

**FTE deprecated 6-face path.** The legacy 6-face shader path remains
active in FTE source at HEAD but the recommended modern targets are
equirectangular or cubemap. Operator-flagged as soft-deprecated for new
content targeting FTE; for cross-engine content the 6-face path remains
the safest target because ezQuake only loads 6-face.

**BSP-internal sky overlay (ezQuake only).** Distinct from skybox cubemap
loading: `Mod_LoadExternalSkyTexture` (`r_brushmodel_load.c:371`) loads
replacement textures for the classic 256x128 Quake cloudy-sky overlay
embedded in BSP files. Paths are `textures/<mapname>/<bsp_skytex>_solid.<ext>`
and `textures/<mapname>/<bsp_skytex>_alpha.<ext>`. This loads only when no
skybox is bound. The install layout matches the `map_texture` convention,
not the skybox convention, so users shipping these alongside a skybox
should keep them in `textures/<mapname>/`, not `env/`.

## Doc-divergence notes

The ezquake.com `docs/textures.md` skybox section (last edited
`2022-11-21`, operator-treats-as-stale) covers only the `qw/env/` install
location with the no-separator naming convention `<name><suffix>`. Source
probes four prefix/separator combinations and the community corpus
consistently uses the underscore form (`<name>_<suffix>`). Source wins:
the `qw/env/<name>_<suffix>.<ext>` template the corpus uses is one of the
supported probe paths, and it is the recommended install for new content.

The doc page also omits `.jpg` (source accepts it), the skywind family
(`skywind`, `skywind_save`, `skywind_load`, `skywind_lookdir`,
`skywind_rotate` commands + `r_skywind` cvar + `_wind.cfg` companion
file), and FTE behavior entirely. The doc is ezQuake-only by scope; FTE
documentation is source-only.

## Community conventions

The qw.nu/gfx corpus catalogs 12 distinct "Other / Skyboxes" bundles.
All 230 install_path entries resolve under `qw/env/`, all with
`install_confidence: high` and `install_source: "gfx_faq QID 16"` as
authority -- the gfx_faq community FAQ is the consensus reference for
install location. Bundles ship as flat sets of six face images (mostly
`.tga`; a handful use `.png` or `.jpg`); one bundle ("Skyboxes PAK",
id 24) is distributed as a `.pak` archive containing the env/ tree --
both engines read inside `.pak` files transparently, so the PAK form
works without unpacking.

The underscore-separator naming form (`<name>_<suffix>.<ext>`) dominates
the corpus. The no-separator form (`<name><suffix>.<ext>`) is accepted
by source but rarely seen in distributed bundles.

## Edge cases

- **Missing face.** If even one of the six faces fails all probe variants,
  ezQuake's `Sky_LoadSkyboxTextures` reports `Couldn't load skybox "<name>"`
  and falls back to the BSP-internal cloudy sky (or to `Mod_LoadExternalSkyTexture`'s
  output if it loaded). FTE's legacy path accepts the skybox if at least
  one face resolved and substitutes `r_blackimage` for missing faces.
- **`r_fastsky 1`.** Both engines: when set, the sky renders as a flat
  color (`r_skycolor` on ezQuake, `r_fastskycolour` on FTE) regardless of
  whether a skybox is bound. Users debugging "why doesn't my skybox show?"
  should check this cvar first.
- **Case-sensitive filesystems.** Linux installs need the case to match
  exactly. Mixed-case suffix forms (`_Up` vs `_up`) observed in the corpus
  fail on Linux if the cvar/command argument case does not match the
  filename case. Windows installs are case-insensitive at the OS layer.
- **`skygroup` (ezQuake only).** `/skygroup <groupname> <map1> <map2> ...`
  binds a skyname to a list of maps; on map load, `TP_GetSkyGroupName`
  overrides the BSP's worldspawn.sky and the user's `r_skyname` cvar.
  Dumped to config via `DumpSkyGroups`.
- **`.pak` distribution.** Both engines read `.pak` archives transparently
  via the VFS. A skybox shipped inside `qw/env/pak1.pak` works without
  manual extraction.
- **Worldspawn.sky push.** ezQuake's BSP loader (`r_brushmodel_load.c:947`)
  pushes the worldspawn `sky` / `skyname` key into `r_skyname` via
  `Cvar_Set`. Per-map skyname overrides via `skygroup` apply on top of
  this in `R_SetSky` (`r_brushmodel_sky.c:102`).
- **Skywind on FTE.** FTE has no skywind family. A user copying an
  ezQuake skybox install with `_wind.cfg` to FTE: the cfg file is
  ignored silently.
- **Mod_LoadExternalSkyTexture vs skybox.** ezQuake L1 currently
  categorizes `Mod_LoadExternalSkyTexture` under skybox even though it
  loads BSP-internal sky-overlay replacements at `textures/<mapname>/`
  (a map_texture-shaped path). The two mechanisms are distinct -- one
  replaces the classic Quake cloudy sky inside the BSP texture, the other
  paints a cubemap around the world. Both can co-exist; the skybox takes
  visual priority when bound.

## Related

- `apps/qw-oracle/curated/asset-notes/map.md` -- BSP and worldspawn keys
  (the source of the initial skyname push).
- `apps/qw-oracle/curated/asset-notes/map_texture.md` -- the
  `textures/<mapname>/` install convention used by
  `Mod_LoadExternalSkyTexture` for BSP sky-overlay replacements.
- `apps/qw-oracle/docs/asset-curation/skybox-investigation.md` --
  investigation report for this note (full source-verification log,
  doc-currency check, corpus inventory, seed-delta proposal, L1
  extractor follow-up).
