---
slug: hud_element
asset_type: hud_element
engine_canonical_paths:
  ezquake:
    - "textures/wad/<name>.<ext>"
    - "gfx/<name>.<ext>"
  fte:
    - "gfx/<name>"
  qwcl: []
  mvdsv: []
user_install_paths:
  - "qw/textures/wad/<lump_name>.<ext>"
corpus_categories:
  - "HUD"
  - "HUD / Face and Armor"
  - "HUD / Icons"
  - "HUD / Numbers"
  - "HUD / Sets"
  - "HUD / Weapon"
  - "HUD / WADs"
related_entities:
  - ezquake:cvar:scr_newhud
  - ezquake:cvar:hud_planmode
  - ezquake:command:hud_editor
  - ezquake:command:hud_recalculate
  - ezquake:command:show
  - ezquake:command:hide
  - ezquake:command:place
  - ezquake:command:align
  - ezquake:command:move
  - ezquake:command:hud262_add
  - ezquake:command:hud262_remove
  - ezquake:command:hud262_position
  - fte:cvar:cl_sbaralpha
  - fte:cvar:scr_scoreboard_newstyle
  - fte:cvar:sbar_teamstatus
companion_asset_types:
  - wad_file
l1_canonical_ids:
  ezquake:
    - ezquake:loader_site:Draw_CacheWadPic_sbar_Sbar_Init_1
    - ezquake:loader_site:Draw_CacheWadPic_r_draw_Draw_Init_1
    - ezquake:loader_site:Draw_CacheWadPic_cl_screen_SCR_Init_1
    - ezquake:loader_site:Draw_CachePicSafe_Ctrl_ScrollBar_ScrollBars_Init_1
    - ezquake:loader_site:SCR_LoadCursorImage_hud_editor_HUD_Editor_Init_1
    - ezquake:loader_site:Draw_CachePicSafe_hud_262_Hud_Add_f_1
    - ezquake:loader_site:Draw_CachePicSafe_hud_groups_SCR_HUD_LoadGroupPic_1
    - ezquake:loader_site:R_LoadImagePixels_r_chaticons_R_InitChatIcons_1
  fte:
    - fte:loader_site:R_RegisterPic_r_2d_R2D_LoadAtlasedPic_1
    - fte:loader_site:R_RegisterPic_r_2d_R2D_SafeCachePic_1
    - fte:loader_site:R_RegisterPic_m_download_MD_Download_UpdateStatus_1
  qwcl: []
  mvdsv: []
status: DIVERGENT
last_verified: 2026-05-14
authority_grounds: engine_mechanics
---

## Description

HUD element textures replace the individual 2D image lumps that ship inside `id1/gfx.wad`
-- the digit sprites (`num_0` through `num_9`, `anum_0` through `anum_9`), weapon-inventory
icons (`inv_*`, `inva*`), health-face sprites (`face1` through `face5` plus damage variants),
ammo icons (`sb_shells`, `sb_nails`, `sb_rocket`, `sb_cells`), armor icons (`sb_armor1-3`),
powerup/item icons, and sigils. ezQuake finds external override files at
`qw/textures/wad/<lump_name>.<ext>` and substitutes them for the corresponding WAD lump at
load time. Stock lumps in `gfx.wad` serve as the fallback when no override exists.

FTE's QW HUD is architecturally distinct: the HUD is primarily delivered via CSQC (gamecode
QuakeC), not WAD lumps. The `textures/wad/` override path that works in ezQuake has no
direct FTE equivalent for the QW game HUD.

## How it loads

**ezQuake** (source-verified at `src/r_draw.c:340-380`, `src/sbar.c:225-320`):

`Sbar_Init` at `sbar.c:225` runs at startup and calls `Draw_CacheWadPic` once per WAD lump
name in the status bar vocabulary. `Draw_CacheWadPic` applies a two-step probe for each lump:

1. Loads the stock lump via `W_GetLumpName(name)` from `gfx.wad`.
2. Probes `R_LoadPicImage("textures/wad/<name>", ...)` -- user override, highest priority.
3. Falls back to `R_LoadPicImage("gfx/<name>", ...)` -- secondary override path.
4. Uses the stock WAD lump when no override file is found.

The probe happens once at engine startup (load_trigger: startup) for all standard sbar lumps.
The external-file result is composited on top of the WAD data at texture-cache level. No cvar
controls the override lookup; if a `textures/wad/<name>.<ext>` file exists, it is always
preferred.

Additional HUD element loaders (on-demand):
- `Hud_Add_f` (`hud_262.c:176`) -- the hud262 command `hud262_add` accepts a custom image
  path and loads it via `Draw_CachePicSafe`. Path is free-form, not bound to `textures/wad/`.
- `SCR_HUD_LoadGroupPic` (`hud_groups.c`) -- loads user-configured group indicator images.
- `R_InitChatIcons` (`r_chaticons.c`) -- loads r_tracker and chat-status icons (country flags,
  carrier indicators). Paths are fixed at compile time or config-determined.
- `ScrollBars_Init` (`Ctrl_ScrollBar.c:43`) -- loads UI widget background at
  `textures/scrollbars/slidebg` via `Draw_CachePicSafe`.

## Install layout

Drop each lump replacement at:

```
qw/textures/wad/<lump_name>.<ext>
```

The `<lump_name>` must match the WAD lump name exactly (case-insensitive on Windows, case-
sensitive on Linux). Accepted extensions: `.png`, `.tga`, `.jpg`. The engine prefers
higher-fidelity formats when multiple extensions exist for the same name.

Examples:
- `qw/textures/wad/face1.png` -- high-health face sprite
- `qw/textures/wad/num_0.png` -- digit "0" (used for health, ammo, armor)
- `qw/textures/wad/inv_shotgun.png` -- shotgun inventory icon
- `qw/textures/wad/sb_armor1.png` -- green armor icon

A complete lump-name reference is in `research/repos/ezquake-docs/docs/docs/textures.md`
(stale date 2022-11-21 but content accurate). Weapon icon lumps (`inv_*`, `inva1-5_*`)
are NOT listed in the textures.md doc; they are verified at `sbar.c:240-264`.

Alternative install method: distribute the full set as a WAD archive replacement (see
Companion files below).

## Cross-engine differences

### ezQuake

The WAD-override path (`textures/wad/`) is the primary user-facing customization mechanism
for HUD elements. Coverage is exhaustive -- every visible sbar element has a named lump slot.

**Two HUD systems coexist:**
- `scr_newhud 0` (default): FuhQuake-compatible sbar layout. Uses the WAD lump positions
  directly. This is the "classic" layout that HUD element replacements are authored for.
- `scr_newhud 1`: ezQuake HUD 2.0. Elements become movable widgets positioned via
  `place`/`align`/`move` commands or the `hud_editor` tool. WAD texture replacements still
  apply -- the element data draws from the same loaded lump overrides.
- `scr_newhud 2`: Both HUD systems active simultaneously (overlay).

The HUD 2.0 system allows `hud262_add <image_path>` to add arbitrary custom images as HUD
elements. These are not WAD-lump-based; they load from the supplied path directly.

### FTE

FTE's QW HUD is gamecode-driven via CSQC. The server-side game (KTX, FortressOne, etc.)
ships a CSQC bundle that determines what the client draws and where. HUD elements in this
model are QuakeC-drawn, not WAD-lump-based.

For engine-native 2D elements (menus, download progress, console decorations) FTE uses
`R2D_LoadAtlasedPic` with path template `gfx/<name>` and `R2D_SafeCachePic` for general
pic loads. These are not user-replaceable via the `textures/wad/` path.

FTE does load `gfx.wad` and supports WAD2 archives, but the QuakeWorld HUD path is
CSQC-controlled. Users wanting to customize FTE HUD appearance typically modify the
CSQC source or use CSQC-exposed texture paths, not the `textures/wad/` override layer.

`cl_sbaralpha` controls the sbar transparency (FTE `sbar.c:52`) when `cl_sbar 2` is active.
`sbar_teamstatus` toggles the team status display above the sbar (FTE `sbar.c:50`).

### QWCL / MVDSV

QWCL 2.33 has its own sbar.c (verified in `research/repos/qwcl-original/WinQuake/sbar.c`)
but the WAD-override texture replacement system was added in later engines; QWCL's source
does not use `Draw_CacheWadPic` or probe `textures/wad/`. QWCL is not a customization target
for hud_element replacements in practice.

MVDSV is server-side; it does not render HUD elements.

## Companion files

Some HUD sets distribute as complete WAD archive replacements rather than individual files.
A full `gfx.wad` replacement places a custom `.wad` file at `qw/<name>.wad` (the `wad_file`
asset_type). This is the older distribution method; individual-file replacements via
`textures/wad/` are now dominant (2,977 individual files vs. 113 WAD files in the corpus).

The engine processes both paths: WAD archive replacements swap out the entire gfx.wad lump
table; `textures/wad/` overrides apply per-lump on top of whichever WAD is loaded.

See `wad_file` note for the WAD archive loading mechanism.

## Community conventions

HUD elements are one of the most heavily customized asset categories in the QW community.
The corpus at gfx.quakeworld.nu carries 94 HUD bundles with 2,977 individual element files.

Community packaging patterns (corpus evidence):
- **Face and armor sets** (`HUD / Face and Armor`): typically 5 face sprites (face1-5) plus
  their damage variants (face_p1-5), plus powerup overlays (face_quad, face_invis, face_invul2,
  face_inv2), and armor icons (sb_armor1-3). Common to package as a named set.
- **Number sets** (`HUD / Numbers`): all 10 num_* plus num_minus/colon/slash, and matching
  anum_* for the low-health/low-ammo orange variant. Many community tools exist for generating
  custom number sets (vikpe's [HUD Numbers Generator](https://vikpe.org/qwnum/) generates from
  Google Fonts).
- **Weapon icon sets** (`HUD / Weapon`): the `inv_*` (normal) / `inv2_*` (selected) /
  `inva1-5_*` (5-frame animated) families for shotgun, sshotgun, nailgun, snailgun, rlaunch,
  srlaunch, lightng.
- **HUD Sets** (`HUD / Sets`): complete packages containing numbers + faces + weapon icons as
  a named theme (e.g., "Quake3HUD", "deurk's HUD", "Tremorz HUD").
- **WADs** (`HUD / WADs`): legacy full-replacement WAD archives (`gfxcyan.wad`, etc.).

**File naming:** Community uploads frequently use uppercase filenames (`ANUM_0.png`,
`INV2_LIGHTNG.png`). On Windows this works; on Linux it causes lookup failure since
`Draw_CacheWadPic` constructs paths in lowercase. Lowercase filenames are the safe convention.

## Edge cases

**Case sensitivity on Linux:** `Draw_CacheWadPic` passes the lump name in lowercase to
`R_LoadPicImage`. On Windows NTFS this matches uppercase files; on Linux ext4 (case-sensitive)
it does not. Community content frequently ships uppercase. Users on Linux ezQuake builds
should rename to lowercase or use a case-insensitive VFS layer.

**hud262 system free-path images:** The `hud262_add` command (`hud_262.c:176`) loads images
from a free-form path -- not required to be in `textures/wad/`. These custom image elements
coexist with the WAD-lump elements but follow their own path convention.

**Scoreboard login flag icons:** `OnChange_scr_scoreboard_login_flagfile` loads country flag
images for the scoreboard login integration. Paths are configured via `scr_scoreboard_login_flagfile`.

**Animated weapon icons:** The `inva1_` through `inva5_` lump families define a 5-frame
animation sequence for each weapon icon slot. All five frames should be replaced together
for a consistent look; partial replacement shows mixed old/new frames.

**scr_newhud interaction:** Setting `scr_newhud 1` switches to the HUD 2.0 system where
element positions are config-driven. HUD element texture replacements still apply (the
underlying lump data comes from the same override system), but element layout differs from
the classic sbar format. HUD set configs distributed as `.cfg` files may require `scr_newhud`
to be set appropriately to match the expected layout.

## Related

- `wad_file` -- WAD archive containing the full gfx.wad lump table; alternative distribution
  method for complete HUD replacements. Engine loads `gfx.wad` (or replacement) at startup.
- `concept-notes/` -- no partner note exists yet; one is warranted (see investigation report's
  "Suggested concept-note partner" section) covering HUD configuration, `scr_newhud` modes,
  and the HUD 2.0 element system.
- `charset` -- separate asset_type loaded via `textures/charsets/`; distinct from the
  `textures/wad/` path.
- `conback` -- separate asset_type for the console background; distinct from HUD elements
  despite some corpus bundles mislabeling conback as a HUD file.
