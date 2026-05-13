---
slug: player_skin
asset_type: player_skin
engine_canonical_paths:
  ezquake: ["skins/<skinname>.<ext>"]
  fte: ["skins/<skinname>.<ext>"]
  qwcl: ["skins/<skinname>.<ext>"]
  mvdsv: ["skins/<skinname>.<ext>"]
user_install_paths: ["qw/skins/<skinname>.<ext>"]
corpus_categories:
  - "Skins"
  - "Skins / Player Model"
  - "Skins / Gib"
related_entities:
  - ezquake:cvar:skin
  - ezquake:cvar:baseskin
  - ezquake:cvar:noskins
  - ezquake:cvar:allskins
  - ezquake:cvar:enemyskin
  - ezquake:cvar:teamskin
  - ezquake:cvar:enemyquadskin
  - ezquake:cvar:enemypentskin
  - ezquake:cvar:enemybothskin
  - ezquake:cvar:teamquadskin
  - ezquake:cvar:teampentskin
  - ezquake:cvar:teambothskin
  - ezquake:command:showskins
  - ezquake:command:skins
companion_asset_types: []
l1_canonical_ids:
  ezquake:
    - ezquake:loader_site:R_LoadImagePixels_skin_Skin_PixelsLoad_1
  fte: []
status: CONFIDENT
last_verified: 2026-04-25
authority_grounds: engine_mechanics
---

## Description

Player-model skin replacement -- the texture painted on `player.mdl` when another player's skin selection or your local override names a file in `qw/skins/`. Stock player skin lives embedded in `id1/progs/player.mdl`; this asset_type only covers replacement skins.

## How it loads

Each connected player's skin name flows via userinfo. The client constructs a per-player target filename in `qw/skins/<name>.<ext>` and looks it up through the engine's image loader. ezQuake walks `Skin_FindName` at `src/skin.c:155-180` with a priority chain:

1. Both quad + pent powerups active -> the slot-specific override (`enemybothskin` for enemies, `teambothskin` for teammates).
2. Single powerup active -> the quad-specific or pent-specific override (`enemyquadskin` / `enemypentskin` / `teamquadskin` / `teampentskin`).
3. Otherwise -> the `enemyskin` / `teamskin` bulk override (when set).
4. Otherwise -> the per-player `skin` name from userinfo.
5. Fallback to `baseskin` if the per-player name resolves no file.
6. Fallback to the stock `player.mdl` texture if `baseskin` also resolves nothing.

`noskins` short-circuits the chain entirely: `noskins 0` (default) honors the above; `noskins 1` skips all skin loading (every player renders with the stock texture); `noskins 2` honors the chain but blocks server-side downloads of missing files.

`allskins <name>` overrides per-player selection -- every player renders with `<name>.<ext>` regardless of their own choice. Empty argument clears the override.

Cache management: `/skins` flushes the skin cache and reloads (re-downloads from the server when allowed); `/showskins` prints per-player assignments to console.

Path safety: `baseskin` runs through a sanitizer that rejects `..` path traversal -- you cannot escape `qw/skins/` via baseskin.

## Install layout

User-installed skins live at `qw/skins/<name>.<ext>` where:

- `<name>` is whatever cvar references it (per-player skin names from userinfo, bulk override names like `e` or `t`, or position-coded names like `e1`-`e4` when the concept-note's per-player tracking layer is active).
- `<ext>` is `.pcx` (legacy software-renderer palette format), `.tga`, or `.png`. The engine prefers higher-fidelity formats when multiple files share a name.

Stock player skin lives inside `id1/progs/player.mdl` (embedded model skin slot 0); replacement is purely a per-file `qw/skins/<name>.<ext>` lookup -- no edits to the .mdl needed.

## Cross-engine differences

The foundational cvars (`skin`, `baseskin`, `noskins`, `allskins`, `enemyskin` / `teamskin`, the four powerup-overlay pairs) and the `/skins` / `/showskins` commands exist in FTE with matching semantics. FTE skin code at `engine/client/skin.c:73`.

QWCL (1996 vintage) predates most of this; its skin loading is the minimal `skin` userinfo + per-player file lookup without the powerup-overlay or bulk-override layers.

MVDSV and KTX are server-side -- they don't load skin assets themselves but participate via the `serverinfo fpd` bitfield (which can silently disable bulk skin-forcing client-side; see `../concept-notes/player-skins.md` "Gates and restrictions" for the gameplay implications).

**L1 categorization note (2026-05-13):** the FTE extractor JSON currently shows two loader sites under `asset_category:skin` (`FS_LoadFile_gl_q2bsp_CM_GetQ2Palette_1` and `COM_LoadTempFile_renderer_R_ApplyRenderer_Load_1`) that are visibly mis-categorized (Q2 BSP palette + renderer-loader, not skin sites). The corresponding ezQuake side has 1 correctly-categorized site (`R_LoadImagePixels_skin_Skin_PixelsLoad_1`) but ~4 additional skin-related sites (`Mod_LoadExternalSkin_*`, `Setting_DrawSkinPreview_1`) are tagged under other categories. Both gaps tracked for the next extractor-capability arc; this note's `l1_canonical_ids` carries only the correctly-categorized ezQuake site as honest evidence.

## Related concept notes

- `../concept-notes/player-skins.md` -- the gameplay walkthrough that uses this asset_type plus adjacent rendering systems (programmatic tinting via `r_*skincolor` / `r_skincolormode` / `r_fullbrightskins`, powerup-carrier visibility via `r_powerupglow` / `r_dynamic` / `gl_flashblend`, per-player tracking via `enemyforceskins` / `teamforceskins`, corpse readability via `cl_deadbodyfilter` / `cl_gibfilter`, ruleset / FPD gates, recommended recipes). When a player asks "how do I make enemies pop?", the concept-note is the answer; this asset-note covers the file-loading mechanism the concept-note builds on.
