---
title: "Skywind: animated skyboxes ported from IronWail"
slug: skywind-animated-skyboxes
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: textures.md
related_entities:
  - ezquake:cvar:r_skywind
  - ezquake:command:skywind
  - ezquake:command:skywind_load
  - ezquake:command:skywind_save
  - ezquake:command:skywind_lookdir
  - ezquake:command:skywind_rotate
  - ezquake:commit:d7e91ef3
  - ezquake:pr:978
related_messages: []
last_updated: 2026-04-23
---

# Skywind: animated skyboxes ported from IronWail

## Summary

Skywind animates a skybox by blending its own partially-transparent cubemap against itself, producing the illusion of drifting clouds. The feature landed in ezQuake 3.6.6 (commit `d7e91ef3`, PR #978) ported "mostly verbatim" from the IronWail single-player Quake engine. It requires a skybox authored with alpha-channel transparency, and it auto-loads per-skybox animation parameters from a sidecar file at `gfx/env/<skyname>_wind.cfg`. Six new entities ship together: one cvar that gates and scales the effect, and five commands that let the user tune and persist the animation parameters.

## What the feature does

A standard skybox is an opaque cubemap rendered at infinity: the sky is static. Skywind leaves the geometry alone and instead samples the cubemap twice per fragment at two offset positions that move over time, blending the two samples through the skybox's own alpha channel. Opaque regions of the cubemap remain still; translucent regions (authored as clouds) appear to drift. Without alpha in the source texture there is nothing to blend against itself and the feature has no visible effect. The command `skywind` captures this requirement in its own help text: "Requires a skybox with some level of transparency."

The animation has four tunable parameters:

- **distance** - wind speed, bound to the range `-2.0` to `2.0`. Negative reverses direction.
- **yaw** - horizontal wind direction, degrees, wrapped to `[0, 360)`.
- **period** - seconds per animation cycle; lower is faster.
- **pitch** - vertical wind direction, degrees, clamped to `[-90, 90]`.

The feature is implemented for both the modern (GLSL) and classic (fixed-function) renderers, so it works regardless of which renderer the client selects.

## The six entities

All six are introduced by the same commit (`d7e91ef3`, 2024-12-27, Daniel Svensson / `@dsvensson`, merged via PR #978 from branch `qw-ctf/skywind`).

- **`r_skywind`** (cvar, default `"1"`) - scale factor on the configured animation. Values above `1.0` accelerate the motion; `0` disables the feature via `Skywind_Active()`. The integer form of this cvar also gates the auto-load on skybox change: when non-zero and a skybox loads, `Skywind_Load_f()` runs automatically (`src/r_brushmodel_sky.c:120-122`). The help group-id and "type float" both come from `help_variables.json`.
- **`skywind [distance] [yaw] [period] [pitch]`** - set animation parameters directly. Run with no args to print the current values.
- **`skywind_save`** - writes the current parameters to `gfx/env/<skyname>_wind.cfg` under `com_gamedir`. The on-disk content is a single line: `skywind <dist> <yaw> <period> <pitch>`.
- **`skywind_load`** - reads the same path and applies the parameters. Validates that the first token in the file is literally `skywind` before accepting any of the numbers; rejects the file otherwise.
- **`skywind_lookdir [period] [distance]`** - set yaw/pitch from the player's current view angles. Convenience for tuning: aim the camera in the desired wind direction, run the command, `skywind_save`.
- **`skywind_rotate <yawdelta> [pitchdelta]`** - additive rotation of the existing direction. Useful for fine adjustments without resetting other parameters.

## The sidecar cfg convention

Skywind stores its per-skybox tuning in a separate file rather than in the player's `config.cfg`. The path is fixed: `gfx/env/<skyname>_wind.cfg`, alongside the skybox cubemap textures themselves. This matters for distribution: when a mapmaker ships a custom skybox, they can ship a tuned `<name>_wind.cfg` in the same directory, and a player who installs the skybox gets the intended animation for free. The auto-load on skybox change (gated by `r_skywind`) makes the experience "drop the files in, sky moves" with no per-map user configuration.

Parse rule, from `Skywind_Load_f` at `src/r_brushmodel_sky.c:296-347`: the first whitespace-separated token must be `skywind`, then up to four numbers in order (distance, yaw, period, pitch), each individually optional. Unspecified parameters retain their prior values after a preceding `Skywind_Clear()` call that reset them to defaults (`dist=0`, `yaw=45`, `pitch=0`, `period=30`).

## Cross-engine provenance

The commit message states explicitly: "Ported mostly verbatim from the IronWail engine." IronWail is a single-player Quake engine fork, not a QuakeWorld-derived codebase, and the commit notes the feature is "available in the SP community." Two facts follow:

- Skywind's provenance is outside QW's ancestry. QW engines historically share code with each other (FTE, ezQuake, MVDSV descend from overlapping branches); porting in from an SP fork is a cross-lineage move.
- The feature has no prior QW tradition. Unlike cvars that users already know under different names in FTE or from older ezQuake releases, `r_skywind` and the five commands are new vocabulary for QW players as of 3.6.6.

## Consumer implications

- **Slipgate "My Quake / Browse" mode** - when the file scanner sees `gfx/env/*_wind.cfg` files, they are not stale or orphan content. Each such file is a per-skybox animation config that the engine auto-loads when `r_skywind` is set. Surfacing them as "skywind animation config for `<skyname>`" is more useful than letting them render as generic `.cfg` files.
- **Oracle MCP "what is skywind" queries** - the three-layer answer shape is: the feature itself (Layer 1: six entities added in 3.6.6), the mechanical requirement (alpha-channel skybox, this note), the distribution pattern (sidecar cfg per skybox, this note). A plain entity-listing answer misses that the feature is a no-op on a default opaque skybox.
- **Oracle MCP "why doesn't skywind do anything" queries** - two failure modes worth distinguishing. First, `r_skywind` is `0` (gate closed). Second, the active skybox has no alpha channel (nothing to blend). A third diagnostic is `skywind_dist` at `0`, the default; without running `skywind` or loading a sidecar cfg, `Skywind_Active()` returns false even with a correctly-authored skybox and a non-zero `r_skywind`.
- **Config-viewer rendering** - `r_skywind` belongs in the renderer/skybox group alongside `r_skyname`. The five commands are runtime-only (tuning and persistence) and do not belong in config saves.

## References

- Commit: `d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971`, "RENDERER: Add support for skywind.", Daniel Svensson, 2024-12-27. 382 lines added across 14 files including `src/r_brushmodel_sky.c` (+289), shader variants (`common.glsl`, `draw_world.fragment.glsl`, `glc/glc_sky.fragment.glsl`), and help JSON.
- Merge: commit `9a79c988`, "Merge pull request #978 from qw-ctf/skywind".
- Cvar declaration: `src/r_rmain.c:172` - `cvar_t r_skywind = {"r_skywind", "1"}`. Registration at `src/r_rmain.c:658`.
- Command registrations: `src/r_brushmodel_sky.c:538-542`.
- Skybox auto-load hook: `src/r_brushmodel_sky.c:120-122` inside `R_SetSky()`.
- Sidecar path macro: `#define SKYWIND_CFG "_wind.cfg"` at `src/r_brushmodel_sky.c:49`; path assembly at `:308` (load) and `:363` (save).
- Activity gate: `Skywind_Active()` at `src/r_brushmodel_sky.c:502-504`.
- Help text (authoritative source-of-truth for the help browser and ezquake.com reference pages):
  - `help_commands.json` - per-command `description` and `syntax` fields for all five commands, added in the same commit.
  - `help_variables.json` - `r_skywind` entry with `default: "1"`, `type: "float"`, group-id `51`, and the scale-factor remarks.
- Upstream guide coverage: absent. `research/repos/ezquake-docs/docs/docs/textures.md` is the natural home (existing Skyboxes section) but has not been updated since 2022-11-21. Captured as `upstream_status: gap-candidate` on this note.

## Related concept notes

- Future note candidate: **Cross-engine feature porting into ezQuake** - skywind is one instance of a broader pattern where ezQuake absorbs features from sibling Quake engines (SP and MP alike). Warrants its own note once a second instance surfaces to generalize the pattern.
- Future note candidate: **Skybox distribution and sidecar configs** - the `gfx/env/<name>_wind.cfg` convention sits alongside the six-file cubemap naming convention (`<name>_ft.tga` + friends) as a per-skybox distribution unit. A note on "how a custom skybox ships" would pull these threads together.
