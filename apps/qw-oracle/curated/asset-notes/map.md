---
slug: map
asset_type: map
engine_canonical_paths:
  ezquake:
    - maps/<mapname>.bsp
  fte:
    - maps/<mapname>.bsp
user_install_paths:
  - qw/maps/<mapname>.bsp
corpus_categories:
  - Maps
  - Maps / DMM4
related_entities:
  - ezquake:command:map
  - ezquake:command:devmap
  - ezquake:command:dev_pointfile
  - ezquake:cvar:sv_loadentfiles
  - ezquake:cvar:sv_loadentfiles_dir
  - ezquake:cvar:sv_bspversion
  - ezquake:cvar:halflifebsp
  - ezquake:cvar:sv_extlimits
  - fte:command:map
  - fte:command:changelevel
  - fte:command:gamemap
  - fte:cvar:sv_loadentfiles
  - fte:cvar:sv_loadentfiles_dir
companion_asset_types:
  - map_texture
  - map_lighting
  - map_entities
  - skybox
l1_canonical_ids:
  ezquake:
    - ezquake:loader_site:CM_LoadMap_cl_nqdemo_NQD_ParseServerData_1
    - ezquake:loader_site:CM_LoadMap_cl_parse_Model_NextDownload_1
    - ezquake:loader_site:FS_LoadHunkFile_cmodel_CM_LoadPhysicsNormals_1
    - ezquake:loader_site:FS_OpenVFS_cmodel_CM_OpenMap_1
    - ezquake:loader_site:CM_OpenMap_cmodel_CM_LoadMap_1
    - ezquake:loader_site:CM_LoadPhysicsNormals_cmodel_CM_LoadMap_1
    - ezquake:loader_site:Mod_LoadBrushModel_r_model_Mod_LoadModel_1
    - ezquake:loader_site:FS_OpenVFS_r_part_R_ReadPointFile_f_1
    - ezquake:loader_site:CM_LoadMap_sv_init_SV_SpawnServer_1
    - ezquake:loader_site:CM_LoadMap_sv_init_SV_SpawnServer_2
    - ezquake:loader_site:FS_LoadHunkFile_sv_init_SV_SpawnServer_1
    - ezquake:loader_site:FS_LoadHunkFile_sv_init_SV_SpawnServer_2
  fte:
    - fte:loader_site:FS_FLocateFile_sv_ccmds_SV_Map_f_2
status: DOC-GAP
last_verified: 2026-05-14
authority_grounds: engine_mechanics
---

## Description

A QuakeWorld map is a BSP geometry file (.bsp) encoding level brushwork, collision
data, entity placements, and embedded textures. It is the central asset in every game
session -- the engine loads exactly one map per server spawn, and the BSP is the
spatial container that triggers all per-map companion loading: hi-res texture overrides,
colored lighting, entity overrides, and the skybox. The canonical format is Quake V29
BSP (header int32 = 29); BSP2 and BSP29a extended variants are also accepted.

## How it loads

**ezQuake.** On server startup, `SV_SpawnServer` (`sv_init.c:470`) constructs the path
`maps/<mapname>.bsp` and calls `CM_LoadMap`. `CM_LoadMap` (`cmodel.c:1405`) calls
`CM_OpenMap` (`cmodel.c:1262`), which opens the file via `FS_OpenVFS` (`cmodel.c:1270`)
and validates the BSP header version. Collision lumps are parsed in order (planes,
leafs, nodes, clipnodes, entity lump, models, vis). `CM_LoadPhysicsNormals`
(`cmodel.c:1464`) runs unconditionally, loading the optional physics-normals overlay from
the BSPX `MVDSV_PHYSICSNORMALS` lump or from `maps/<mapname>.qpn` if present. The
renderer side dispatches to `Mod_LoadBrushModel` (`r_model.c:300`) via `Mod_LoadModel`
to build GL surfaces and texture references.

The client loads the map on receipt of the server's spawn message: `Model_NextDownload`
(`cl_parse.c:725`) calls `CM_LoadMap` after the map download completes. NQ demo playback
has its own trigger at `NQD_ParseServerData` (`cl_nqdemo.c:551`).

**FTE.** FTE's `map` command (`sv_ccmds.c:3587`) calls `SV_Map_f` and then
`SV_SpawnServer`. BSP parsing runs through `Mod_LoadModelWorker` dispatching to
`Mod_LoadBrushModel` (`gl_model.c:5507`). The L1 extractor currently tags these sites
as `fte:asset_category:model` rather than `map` -- see "Cross-engine differences" for
the extractor gap detail and the 1 confirmed `map`-categorized site.

## Install layout

Drop the BSP at `qw/maps/<mapname>.bsp`. The engine searches via `FS_ANY` (loose
files, .pak archives, .pk3 archives). Custom maps must match the server's filename
exactly -- QuakeWorld's download protocol uses the path string as the key and the server
sends a CRC checksum that the client verifies. Stock id1 maps ship inside `pak0.pak` /
`pak1.pak` and load transparently through VFS without extraction.

## Files involved

A full map install may include up to five file types sharing the `<mapname>` stem:

- `qw/maps/<mapname>.bsp` -- the BSP itself (required). Validated against server CRC.
- `qw/maps/<mapname>.ent` -- entity override (optional). See `map_entities` slug.
  Loaded when `sv_loadentfiles` is `1` (default).
- `qw/maps/<mapname>.lit` -- colored lighting (optional). See `map_lighting` slug.
- `qw/maps/<mapname>.qpn` -- physics-normals override (optional, ezQuake-specific).
  External file for MVDSV_PHYSICSNORMALS collision data. Loaded by
  `CM_LoadPhysicsNormals` (`cmodel.c:988`) as fallback when the BSP lacks the BSPX
  lump. No separate seed slug; categorized under `map` in L1.
- `maps/<mapname>.pts` -- leak pointfile (dev diagnostic only). A list of points
  tracing leaked geometry; loaded via `/dev_pointfile` (`r_rmain.c:609`). No seed
  slug; categorized under `map` in L1.

## Companion files

**`map_texture`** -- Hi-res replacements for BSP-embedded textures. Install at
`qw/textures/<mapname>/<texname>.<ext>` (global fallback: `qw/textures/<texname>.<ext>`).
Loaded during BSP surface rendering. The map is the scope owner: the same texture name
in a different map directory is a different asset. See
`apps/qw-oracle/curated/asset-notes/map_texture.md`.

**`map_lighting`** -- Colored RGB lighting. Install at `qw/maps/<mapname>.lit` (ezQuake
also checks `maps/lits/<mapname>.lit` and `lits/<mapname>.lit`). Loaded by
`LoadColoredLighting` during BSP rendering if present. Optional -- the BSP's standard
single-channel lightmap renders without it. See
`apps/qw-oracle/curated/asset-notes/map_lighting.md`.

**`map_entities`** -- Entity override. Install at `qw/maps/<mapname>.ent`. Loaded by
`SV_SpawnServer` when `sv_loadentfiles` is `1`. Replaces the BSP's embedded entity
lump to change item placements, spawnpoints, or trigger logic without recompiling the
BSP. Both ezQuake and FTE support this via the same cvar names (`sv_loadentfiles`,
`sv_loadentfiles_dir`). See `apps/qw-oracle/curated/asset-notes/map_entities.md`.

**`skybox`** -- The BSP worldspawn's `sky` / `skyname` entity key is pushed into
`r_skyname` during BSP load at `r_brushmodel_load.c:947` (`Cvar_Set(&r_skyname, value)`).
When `r_skyname` is empty and the worldspawn has a `skybox_name`, `R_SetSky` triggers
skybox loading at `r_rmisc.c:224-225`. The map is the trigger; the skybox is the
loadable. See `apps/qw-oracle/curated/asset-notes/skybox.md`.

## Cross-engine differences

**Commands.** ezQuake: `map` and `devmap` (`sv_ccmds.c:1865,1867`), both invoking
`SV_Map_f`. FTE: `map`, `changelevel`, and `gamemap` (`sv_ccmds.c:3587,3594,3595`),
all invoking `SV_Map_f`. `changelevel` semantically preserves player state between
levels (relevant for cooperative or campaign play). `gamemap` is a Q2-compatibility
alias. ezQuake has `devmap` (enables cheats); FTE uses `sv_cheats` instead.

**Entity override loading.** Both engines expose `sv_loadentfiles` (default `1`) and
`sv_loadentfiles_dir` with identical names and defaults. ezQuake loads in `sv_init.c:576-595`;
FTE loads in `gl_model.c:2274-2330`. Behavior is equivalent.

**Physics normals.** ezQuake's `CM_LoadPhysicsNormals` reads the BSPX
`MVDSV_PHYSICSNORMALS` lump first, then falls back to `maps/<mapname>.qpn`
(`cmodel.c:988`). FTE has BSPX support but does not handle `MVDSV_PHYSICSNORMALS`.
The `.qpn` sidecar is an ezQuake/MVDSV extension; FTE ignores it.

**FTE L1 under-representation.** The FTE L1 extractor has 1 confirmed `map`-categorized
site (`FS_FLocateFile` in `SV_Map_f`, `sv_ccmds.c:849`) against ezQuake's 12. The
actual FTE BSP load chain -- `Mod_LoadModelWorker` dispatching to `Mod_LoadBrushModel`
(`gl_model.c:5507`) -- is tagged `fte:asset_category:model`. Extractor fix needed: add
`Mod_LoadBrushModel` to `ENCLOSING_FN_CATEGORY_OVERRIDES` with `fte:asset_category:map`.

**QWCL / MVDSV.** Extractor outputs not yet available. MVDSV is server-only; its map
loading is expected to follow the ezQuake server-side path (CM_LoadMap / SV_SpawnServer
shared inheritance).

## Community conventions

The qw.nu/gfx corpus lists 11 map bundles across "Maps" and "Maps / DMM4" categories.
All confirm `qw/maps/<mapname>.bsp` as the install path (`install_confidence: medium`,
`quake-convention` authority; role: `library:map`). Multi-file drops are common:
4 of the 11 bundles include locfiles (teamplay location markers for the map), and one
bundle ("Lits", id 302) is entirely `.lit` files for a named map. Maps themselves are
rarely distributed without at least one companion file in competitive contexts.

## Edge cases

- **CRC checksum.** The server sends a BSP CRC at map spawn; client must have an
  identical BSP or the connection fails. Entity overrides (`.ent`) and colored lighting
  (`.lit`) bypass this check -- they augment or replace data after the checksum passes.
- **`sv_extlimits`.** Controls the edict table ceiling: `0` always caps at
  `MAX_EDICTS_SAFE` (512); `2` (default) allows larger tables on BSP2 maps
  (`sv_init.c:490-493`). Read-only in effect after map load.
- **BSP version detection.** `sv_bspversion` (ROM) is set by `CM_OpenMap` to `"1"` for
  V29/HL BSP and `"2"` for BSP2/29a. `halflifebsp` (ROM) is set to `"1"` for HL format
  maps. Both are readable signals for game rules or display.
- **Missing BSP fallback.** `CM_LoadMap` returns NULL on file-not-found; `SV_SpawnServer`
  falls back to the previous map (`sv_init.c:472-484`). If both fail, `SV_Error`
  terminates the server.
- **NQ demo compatibility.** NQ demos trigger map loading via `NQD_ParseServerData`
  (`cl_nqdemo.c:551`). Client-side only -- no server re-spawn.
- **`.pak` / `.pk3` archives.** VFS reads BSPs from inside archives transparently.
  Maps shipped inside `qw/pak1.pak` load without extraction.
- **Worldspawn sky priority.** The worldspawn.sky push sets `r_skyname` only when the
  user's `r_skyname` is empty and no `skygroup` override is active. `skygroup` (ezQuake
  only) takes highest priority; user `r_skyname` overrides worldspawn; worldspawn value
  is the map-authored default.

## Related

- `apps/qw-oracle/curated/asset-notes/skybox.md` -- the skybox asset type; the
  worldspawn.sky push is also documented there (Edge cases: "Worldspawn.sky push").
- `apps/qw-oracle/curated/asset-notes/map_texture.md` -- BSP-scoped hi-res texture
  overrides.
- `apps/qw-oracle/curated/asset-notes/map_lighting.md` -- colored lighting sidecar.
- `apps/qw-oracle/curated/asset-notes/map_entities.md` -- entity override sidecar.
- `apps/qw-oracle/docs/asset-curation/map-investigation.md` -- investigation report
  for this note (source log, FTE extractor gap detail, calibration findings).
