# Asset Type Catalog: Corpus Coverage Report

Generated: 2026-05-12T21:39:00+00:00
Corpus source: `/home/paradoks/sandboxes/qw3-abab-gfx/scripts/output/bundles.json`
Catalog source: `/home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/qw/output/qw-asset-types.json`

## Summary

- Catalog asset types: **21**
- Corpus bundles with category: **587**
- Bundles matched to a catalog type: **576** (98.1%)
- Bundles unmatched: **11** (1.9%)
- Unique corpus categories seen: **42**
- Unmatched unique categories: **1**

## Coverage by Asset Type

Sorted by bundle count descending. Types with zero bundles are kept as no-corpus-evidence rows (still valid asset types in the engine, just absent from this particular corpus).

| asset_type | bundle count | corpus categories covered |
|---|---|---|
| `map_texture` | 134 | Maps / Map textures<br>Textures<br>Textures / Lava and Teleport<br>Textures / Sets |
| `hud_element` | 93 | HUD<br>HUD / Face and Armor<br>HUD / Icons<br>HUD / Numbers<br>HUD / Sets<br>HUD / Weapon |
| `conback` | 76 | Conbacks |
| `charset` | 65 | Charsets<br>Charsets / 1024x1024 or larger<br>Charsets / 256x256<br>Charsets / 512x512 |
| `model_q1` | 39 | Models<br>Models / Armor<br>Models / Item<br>Models / Sets<br>Models / Team Fortress<br>Models / Weapon |
| `config` | 36 | Configs<br>Configs / Eyecandy<br>Configs / HUD<br>Configs / Performance<br>Configs / Teamplay |
| `model_texture` | 32 | Textures / Armor<br>Textures / Backpack<br>Textures / Team Fortress<br>Textures / Weapon |
| `crosshair` | 31 | Crosshairs<br>Crosshairs / Transparent |
| `player_skin` | 29 | Skins<br>Skins / Gib<br>Skins / Player Model |
| `map` | 14 | Maps<br>Maps / DMM4 |
| `skybox` | 12 | Other / Skyboxes |
| `sound` | 7 | Other / Sounds |
| `wad_file` | 7 | HUD / WADs |
| `levelshot` | 1 | Other / Levelshots |
| `colormap` | 0 | _(none in catalog)_ |
| `demo` | 0 | _(none in catalog)_ |
| `demo_archive` | 0 | _(none in catalog)_ |
| `locfile` | 0 | _(none in catalog)_ |
| `map_entities` | 0 | _(none in catalog)_ |
| `map_lighting` | 0 | _(none in catalog)_ |
| `palette` | 0 | _(none in catalog)_ |

## Unmatched Corpus Categories

Categories present in the corpus but not claimed by any catalog asset_type. Each row is a candidate for (a) folding into an existing type via its `corpus_categories` field, or (b) adding a new asset_type.

| corpus category | bundle count |
|---|---|
| Other | 11 |
