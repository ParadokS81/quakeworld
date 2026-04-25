---
title: "Player skins: identification, visibility, and tracking in QuakeWorld"
slug: player-skins
topic: domain-guide
status: draft
authored_by: qw-oracle
source_url: https://ezquake.com/docs/player-skins
imported_from: 6776cba23c64ae059468eac8c6f5e8fb16ca1e5c
last_imported_at: 2026-04-25
upstream_status: gap-candidate
upstream_target: player-skins
primary_contributors:
  - "@vikpe"
  - "@ParadokS"
related_entities:
  - ezquake:cvar:skin
  - ezquake:cvar:baseskin
  - ezquake:cvar:noskins
  - ezquake:cvar:allskins
  - ezquake:cvar:gl_nocolors
  - ezquake:cvar:enemyskin
  - ezquake:cvar:teamskin
  - ezquake:cvar:enemyquadskin
  - ezquake:cvar:enemypentskin
  - ezquake:cvar:enemybothskin
  - ezquake:cvar:teamquadskin
  - ezquake:cvar:teampentskin
  - ezquake:cvar:teambothskin
  - ezquake:cvar:r_enemyskincolor
  - ezquake:cvar:r_teamskincolor
  - ezquake:cvar:r_skincolormode
  - ezquake:cvar:r_skincolormodedead
  - ezquake:cvar:r_fullbrightskins
  - ezquake:cvar:enemyforceskins
  - ezquake:cvar:teamforceskins
  - ezquake:cvar:cl_name_as_skin
  - ezquake:cvar:cl_deadbodyfilter
  - ezquake:cvar:cl_gibfilter
  - ezquake:cvar:r_powerupglow
  - ezquake:cvar:r_dynamic
  - ezquake:cvar:gl_flashblend
  - ezquake:cvar:v_quadcshift
  - ezquake:cvar:v_pentcshift
  - ezquake:cvar:v_ringcshift
  - ezquake:command:showskins
  - ezquake:command:skins
  - ezquake:command:teamcolor
  - ezquake:command:enemycolor
  - ezquake:flag_bit:fpd_no_force_skin
scope: engine-specific
engines_covered: [ezquake]
last_updated: 2026-04-25
---

## Summary

In one of the fastest-paced first-person shooters, identifying your enemy quickly is paramount. Telling the enemy apart from friends in a team game even more so. This section gives you the tools to do just that. The answer lives in a stack of skin and color cvars that re-paint the player model on your screen — plus a separate dynamic-lighting layer that colors the *room around* a powerup carrier, signaling their approach through doorways and around corners before you ever see the carrier model directly.

Five buckets, two paths. The buckets are identification (which texture renders), visibility (color and brightness adjustments to make enemies pop), powerup-carrier visibility (dynamic lights and glow that mark quad/pent carriers via the environment, not just on their model), per-player tracking (callout-grade naming so `e1` is consistently the same person within a round), and corpse readability (cleaning the floor of bodies and gibs that obscure live targets). The paths are file-based (`.pcx`/`.png` textures in `qw/skins/`, engine picks one per player) and programmatic (skip files, tint the engine model via RGB color + brightness cvars). Most modern competitive configs use the programmatic path. This note covers both, with the recipes most players actually run, and the gates that silently neutralize the entire system when a server says no.

## Mental model — five buckets, two paths

| Bucket | Cvars / commands | What it answers |
|---|---|---|
| Identification | `skin`, `baseskin`, `noskins`, `allskins`, `enemyskin`, `teamskin`, powerup overlays | *Which texture file gets painted on this model?* |
| Visibility | `r_enemyskincolor`, `r_teamskincolor`, `r_skincolormode`, `r_fullbrightskins`, `gl_nocolors` | *How bright and what color is it?* |
| Powerup-carrier visibility | `r_powerupglow`, `r_dynamic`, `gl_flashblend` | *Can I see the room light up red before the quad carrier rounds the corner?* |
| Per-player tracking | `enemyforceskins`, `teamforceskins` | *Within this round, can I refer to "the red guy" by a stable name?* |
| Corpse readability | `r_skincolormodedead`, `cl_deadbodyfilter`, `cl_gibfilter` | *Are dead bodies and gibs hiding live targets?* |

Two paths span those buckets:

- **File-based.** You ship `.pcx` (or `.png`) textures in `qw/skins/` and the engine selects one per player based on team/enemy/powerup state. Older configs and TeamFortress-era setups live here.
- **Programmatic.** You ignore `.pcx` files entirely (or set `gl_nocolors 1`) and let `r_enemyskincolor` / `r_teamskincolor` / `r_skincolormode` / `r_fullbrightskins` paint the engine's default model. This is what the modern competitive scene runs because it sidesteps the missing-file fallback dance and gives you arbitrary RGB.

You can mix paths — e.g., file-based teammates for identity + programmatic enemies for visibility — but most players pick one and stay in it.

## Identification — file-based path

**Your own skin.** `skin <name>` writes your skin name into your userinfo; the server forwards it to other clients, who load `qw/skins/<name>.pcx`. If they don't have that file, they fall back to `baseskin <name>`, and if that also resolves nothing, the engine ships the default `player.mdl` texture.

**Disabling skins.** `noskins 0` (default) loads everyone's chosen skin. `noskins 1` ignores skin choices entirely — every player renders with the default model texture. `noskins 2` loads existing skins but blocks downloading from the server.

**One skin for everyone.** `allskins <name>` overrides per-player selection — every player on screen gets `<name>.pcx` regardless of their own choice. Issuing `allskins` with no argument clears the override.

**Team and enemy bulk forcing.** `enemyskin <name>` and `teamskin <name>` paint a single texture across enemies or teammates respectively. Setting these to empty strings restores per-player selection.

**Powerup overlays.** When a player picks up quad, pent, or both, the engine consults a separate set of overlays in priority order: both > quad-or-pent alone > base team/enemy skin. The cvar pairs:

| Both powerups | Quad alone | Pent alone |
|---|---|---|
| `enemybothskin` | `enemyquadskin` | `enemypentskin` |
| `teambothskin` | `teamquadskin` | `teampentskin` |

Selection happens in `Skin_FindName` at `src/skin.c:155-180`. The check is `(EF_BLUE | EF_RED)` first (both powerups), then either single powerup, then fall through to team/enemy/base skins.

**Cache management.** `/skins` flushes the skin cache and reloads/redownloads. `/showskins` prints the current per-player skin assignment to console — useful when debugging why a player looks wrong.

**Path safety.** `baseskin` runs through a sanitizer that rejects `..` path traversal. You cannot escape `qw/skins/` via baseskin.

## Identification — programmatic path

Skip files. Set `gl_nocolors 0` (the default; `1` disables per-player team color translation entirely) and let RGB color + brightness do the work.

**Color forcing (RGB).** `r_enemyskincolor "<R> <G> <B>"` and `r_teamskincolor "<R> <G> <B>"` accept 0-255 per channel. Setting these to `""` (empty) disables the override and lets userinfo-supplied colors through. The classic 8-bit palette wrappers (`teamcolor` and `enemycolor` commands) write to the underlying `teamtopcolor`/`teambottomcolor`/`enemytopcolor`/`enemybottomcolor` cvars at index 0-13; modern configs prefer the RGB form.

**Blend modes.** `r_skincolormode <n>` controls how the color is composited onto the engine model:

| Mode | Behavior | Notes |
|---|---|---|
| 0 | Solid color | Replace all pixels with the chosen RGB. |
| 1 | GL_REPLACE | No-op. Leaves the texture untouched. |
| 2 | GL_BLEND | Pixel = color × (255 - source). Inverts source detail. |
| 3 | GL_DECAL | No-op. Same as mode 1 (RGB textures have no alpha to blend against). |
| 4 | GL_ADD | Pixel = clamp(source + color). Brightens. |
| ≥5 | GL_MODULATE | Pixel = color × source. Standard "tint" mode. Most common. |

Verified at `Skin_ApplyRGBColor` in `src/skin.c:525-575`.

**Color picker conventions.** Community knowledge, not source-defensible — based on operator practice and field reports rather than measured palette overlap:

- White (`255 255 255`) and magenta (`255 0 255`) are universally safe — neither collides with effects, ammo, armor, or environment.
- Cyan (`0 255 255`) is generally safe.
- Red (`255 0 0`) collides with damage flash, explosions, and the lightning-gun crackle effect — use sparingly or avoid.
- Green collides with armor glow.

**Brightness.** `r_fullbrightskins <0..1>` makes player models render at fixed brightness regardless of the world lighting. `1` = full brightness; intermediate values fade toward normal lighting. The cvar reads from `f_skins` chat-trigger responses as a percentage. **This is the only cvar in the player-skins domain with a hard ruleset lock**: MTFL forces it to `0` via `disabled_cvars[]` at `src/rulesets.c:492`. Other rulesets leave it free to set, but the server can silently cap the effect via the `fbskins` serverinfo key (TF servers commonly do this; competitive QW servers typically do not).

## Powerup-carrier visibility — dynamic lights and glow

The skin layer paints the player model itself. A separate set of cvars controls the *light effects* attached to powerup carriers — the colored halo around the model and dynamic lighting that bounces off nearby surfaces. These give you carrier identification before the carrier is in line-of-sight: a red wash on the corridor wall ahead means a quad player is approaching from around the corner.

`r_powerupglow <0|1|2>` controls the colored glow drawn around players carrying quad (red) or pent (blue):

- `0` — disable the glow entirely.
- `1` (default) — glow on every powerup carrier, including the player you're spectating.
- `2` — glow on every powerup carrier *except* the viewplayer. Useful in spec/demo to keep the camera from being engulfed in the player you're following. Verified at `src/cl_ents.c:1821`: `r_powerupglow.value && !(r_powerupglow.value == 2 && j == cl.viewplayernum)`.

`r_dynamic <0|1|2>` controls dynamic lighting on world surfaces — how muzzle flashes, rocket trails, explosions, and powerup auras paint colored light onto walls, floors, and ceilings. The three modes are computation-path choices:

- `0` — no dynamic lighting. Surfaces stay flat-lit regardless of nearby effects. The model halo from `r_powerupglow` still draws, but you lose the *room lights up red* effect that announces a quad carrier rounding the corner.
- `1` — software (CPU-computed) lighting. The classic path. Works on every renderer.
- `2` — hardware (GPU-computed) lighting via GLSL. Only valid when the modern-OpenGL renderer is active. The OnChange handler at `src/r_rmain.c:108` rejects this value with `"Hardware lighting not supported when not using GLSL"` when the immediate-mode renderer is loaded.

Default depends on the renderer build: `"2"` on builds that include modern-OpenGL (`EZ_MULTIPLE_RENDERERS` or `RENDERER_OPTION_MODERN_OPENGL`); `"1"` on immediate-mode-only builds (`src/r_rmain.c:151-153`). Modern ezQuake distributions ship the multi-renderer build, so most players get `r_dynamic 2` by default. Help text: *"Controls dynamic lighting (muzzle-flash, quad & rocket glow, etc) on world surfaces."* Mode predicates verified at `src/r_lighting.h:47-49` (`R_NoLighting`, `R_HardwareLighting`, `R_SoftwareLighting` macros).

The historical context (the immediate-mode and modern-OpenGL renderers used to ship as separate clients before being consolidated into one binary with a runtime renderer toggle) is why the cvar has both software and hardware paths under one name. On a modern build, `r_dynamic 1` and `r_dynamic 2` produce visually equivalent output via different compute paths; mode `2` offloads the cost to the GPU.

`gl_flashblend <0|1|2>` is a global toggle for "glow bubble" rendering — the soft sphere that surrounds rocket projectiles, explosions, and (depending on configuration) powerup auras. Default `0`. Setting it nonzero substitutes glow bubbles for true dynamic lighting on the affected surfaces — faster on legacy hardware but loses the per-surface lighting detail that gives you advance warning of a carrier through a doorway. Help text reference: *"This variable affects when glow bubbles are displayed in the client. You can change the color of the rocket glow by `r_rocketLightColor`, the color of explosions by `r_explosionLightColor`, and the color of flag carriers by `r_flagColor`."*

The competitive carrier-visibility recipe is `r_powerupglow 2`, `r_dynamic 2` (or `1` on immediate-mode builds), `gl_flashblend 0`: maximum identification through both the model halo and the world-surface lighting, with the player's own halo suppressed (mode 2) so the camera isn't engulfed in their own glow. None of these are ruleset-restricted under any of the six rulesets — they are pure visual cvars with no script-related concerns.

A note on line-of-sight: `r_powerupglow` paints a halo on the player model, so it shows only when the model itself is visible. `r_dynamic` paints light onto world surfaces near the carrier, so it shows whenever the *surface* is visible — which is what gives you the through-doorway and around-corner advance warning. The two effects compose: the model halo identifies the carrier once you can see them; the world-surface lighting tells you they're nearby before you can.

**Self-awareness trade — `r_powerupglow 2` removes your own halo.** Mode 2 suppresses the halo on the viewplayer's model, which keeps the spectator camera comfortable but means *you* lose the visual cue that you're carrying a powerup. The first-person color-shift family fills that gap: `v_quadcshift` adds a blue hue to your screen while you carry quad, `v_pentcshift` adds red while you carry pent, and `v_ringcshift` adds yellow while you carry ring. All three accept a 0-1 fraction (default `0.5`); all three require `gl_polyblend 1`. Operator practice: `r_powerupglow 2` paired with `v_quadcshift 0.6` (and equivalents for pent/ring) trades the self-glow halo for a self-tinted screen — your carrier-state stays visible to you without your own halo blocking your view. The cshift family belongs more naturally in a "first-person POV self-state indicators" note (alongside `v_contentblend`, `v_bonusflash`, damage flash) but is cited here because the recipe doesn't make sense without it.

## Per-player tracking

`enemyforceskins <0..3>` and `teamforceskins <0..3>` rewrite the skin name based on a per-player attribute, giving you a stable callout grammar within a round.

| Mode | Behavior |
|---|---|
| 0 | Off. |
| 1 | Skin name = sanitized player name. ". ParadokS" → "_ ParadokS" → loads `_ ParadokS.pcx`. |
| 2 | Skin name = userid (numeric). Loads `<userid>.pcx`. |
| 3 | Skin name = position-based: `e1` / `e2` / `e3` / `e4` for enemies, `t1` / `t2` / ... for teammates. The position is consistent within a round but reshuffles between matches. Requires `e1.pcx`-`eN.pcx` (or `.png`) files in `qw/skins/`. |

Verified at `Skin_AsNameOrId` in `src/skin.c:101-128` and `Skin_ForcingType` at `src/skin.c:71-98`.

**Mid-round lock — asymmetric.** `enemyforceskins` cannot be changed during an active match; the change is rejected with `"<cvar> cannot be changed during match"` (skin.c:954). Set it during warmup (`cl.standby` or `cl.countdown`). `teamforceskins` has no such lock — it can be changed mid-round freely. This asymmetry exists because `enemyforceskins` reveals position information to the wider team; `teamforceskins` is purely cosmetic.

**Auto-announce — also asymmetric.** Toggling `enemyforceskins` while connected (and not a spectator) emits `say Individual enemy skins: enabled` or `say Individual enemy skins: disabled`. `teamforceskins` does not announce. The `f_skins` chat trigger (handled in `src/fchecks.c:81-89`) reports current `r_fullbrightskins` percentage and whether `enemyforceskins` is active; teamforceskins is invisible to f_skins.

## Corpse readability

`r_skincolormodedead <-1..N>` lets you set a separate `r_skincolormode` value that applies to dead-body models. `-1` (the default) inherits from `r_skincolormode`. Useful when you want live enemies to render in solid mode (mode 0) for visibility but want corpses in modulate mode (≥5) so they fade into the environment instead of forming bright clutter.

`cl_deadbodyfilter <0..3>` removes corpses from the screen entirely:

| Mode | Behavior |
|---|---|
| 0 | Keep all corpses. Default. |
| 1 | Hide corpses after their final-frame death animation completes (specific frame indices: 49, 60, 69, 84, 93, 102 in `player.mdl`). |
| 2 | Hide corpses immediately when the player dies. |
| 3 | Same as mode 2, but exempts TeamFortress (where corpses can be feigned spies — important game state). |

Verified at `cl_ents.c:976-995` (immediate-mode rendering) and `cl_ents.c:1903-1920` (interpolated rendering).

`cl_gibfilter 0|1` hides gib models (`h_player`, `gib1`, `gib2`, `gib3`). Boolean — any nonzero value enables. Same files; single check. Both filters together substantially clean up the floor in 4on4 and 2on2 fights where bodies pile up.

## Recommended configurations

These are tested operator recipes. None of the cvar values listed are ruleset-prohibited under default / smackdown / qcon / thunderdome / smackdrive (see Gates section). MTFL locks `r_fullbrightskins` to 0 — substitute file-based or RGB-only visibility there.

**Old-school file-based (still used by some long-time players).** Ship `e.pcx` (enemy skin) and `t.pcx` (team skin) in `qw/skins/`. Set `enemyskin "e"` and `teamskin "t"`. Optional power-up overlays via `enemyquadskin`, `enemypentskin`, etc. Comfortable, predictable, no shaderwork — but you depend on having the files locally and on the server allowing skin downloads if you don't.

**Programmatic visibility (modern baseline).** `gl_nocolors 1`, `r_skincolormode 0` (solid), `r_enemyskincolor "255 255 255"` (white enemies), `r_teamskincolor "<your-team-color>"`, `r_fullbrightskins 1`. Enemies render as bright white silhouettes against the environment — maximum visibility, no file dependency, works on every server that doesn't set FPD bit 256.

**Callout-grade per-player tracking.** Above + `enemyforceskins 3` (set during warmup, locked mid-round). Combined with file-based `e1.pcx`-`e4.pcx` if you want per-position visual differentiation, or with the programmatic path alone if you only need the announce-grammar (the skin names get assigned even when the .pcx files don't exist, you just don't get distinct textures). Position-based callouts ("e2 has RL") work consistently within a round across your whole team if everyone runs `enemyforceskins 3`.

**ParadokS personal — asymmetric visibility.** White fullbright enemies for visibility (`r_enemyskincolor "255 255 255"`, `r_skincolormode 0`, `r_fullbrightskins 1`) + RGB-tinted teammates with lower brightness (`r_teamskincolor "<team-color>"`, blend mode set so teammates retain texture detail and you can distinguish them from each other). Asymmetry is the design: enemies are optimized for *spotting*, teammates for *distinguishing between each other* during coordinated play.

All four recipes assume the powerup-carrier visibility layer is configured for maximum identification: `r_powerupglow 2` (suppress own-model halo, glow on every other carrier), `r_dynamic 2` (hardware lighting on modern builds; `1` on immediate-mode), `gl_flashblend 0`, plus `v_quadcshift 0.6` / `v_pentcshift 0.6` / `v_ringcshift 0.6` to retain self-awareness once your own halo is suppressed. If you'd rather keep your own halo visible, run `r_powerupglow 1` and skip the cshift family. Either choice is fine; what's load-bearing is that you don't run `r_dynamic 0` — the through-corner advance warning is one of the highest-value identification cues in the game.

## Gates and restrictions

The entire force-skin family (12 cvars: `enemyforceskins`, `teamforceskins`, the four powerup pairs, `r_enemyskincolor`, `r_teamskincolor`, `r_skincolormode`, `cl_name_as_skin`) goes through a single change handler `OnChangeSkinForcing` at `src/skin.c:940`. The handler does not consult ruleset state. Its gates are:

- **FPD bit 256 (`FPD_NO_FORCE_SKIN`)** — when the server's `serverinfo fpd` value has this bit set, the entire force-skin system silently does nothing at the read site. Cvars remain writable, the announce still fires on change, but skin selection logic short-circuits at `skin.c:78-84`, `:159`, `:583`, `:868`. KTX servers expose admin command `skinforce` to flip this bit; many TF servers have it on by default. Bit defined at `src/teamplay.h:109`.
- **FPD bit 512 (`FPD_NO_FORCE_COLOR`)** — same mechanism for the color-forcing path (`r_enemyskincolor` / `r_teamskincolor`). Defined at `teamplay.h:110`.
- **`fbskins` serverinfo key** — silently caps the *effective* `r_fullbrightskins` value at render time via `bound(0, value, max_fbskins)` in `src/r_aliasmodel.c:590`. The cvar shows whatever you set; the screen shows the capped value.
- **MTFL ruleset** — locks `r_fullbrightskins` to 0 via `disabled_cvars[]` (`src/rulesets.c:492`). MTFL is the only ruleset with skin-domain entries in its lock table. smackdown, qcon, thunderdome, smackdrive, and default leave the entire skin system free.
- **Smackdown's MDL/shadow restrictions** — block player model replacement and disable shadows on player models. Don't touch skin cvars; they affect the parallel "custom model" subsystem.
- **TeamFortress mode (`cl.teamfortress`)** — short-circuits all skin forcing. TF needs feigned-spy and class-based identification, so the engine bypasses the force-skin layer entirely.
- **Mid-round lock on `enemyforceskins`** — `OnChangeSkinForcing` rejects changes outside `cl.standby || cl.countdown` (skin.c:953-957). Set it during warmup. `teamforceskins` does not have this lock.

`cl_name_as_skin` is documented separately because the engine ignores it outside `cls.demoplayback || cl.spectator` — it is a spec/demo tool only and has no effect during active gameplay. Phase 7.5 with operator confirmed: skip from active-player guidance.

## Cross-engine notes

The foundational cvars (`baseskin`, `skin`, `noskins`, `allskins`, `gl_nocolors`, `cl_teamskin` / `cl_enemyskin`, `teamcolor`, `enemycolor`) exist in FTE with matching semantics. The FPD bit `FPD_NO_FORCE_SKIN = 256` is identical in both engines (FTE: `engine/client/client.h:1062` as `(1 << 8)`). MVDSV is transparent to FPD — it forwards the `serverinfo fpd` key without interpreting bits. KTX is the server-side author of the FPD bitfield (originally inherited from the Qizmo proxy era).

The R7 layer covered above — `enemyforceskins`, `teamforceskins`, `r_enemyskincolor`, `r_teamskincolor`, `r_skincolormode`, the powerup overlays, `cl_name_as_skin` — is **ezQuake-only**. FTE has the concept in commented-out code at `engine/client/skin.c:80-93` and `engine/client/zqtp.c:74-78` but the cvars are not registered at runtime. A player switching from ezQuake to FTE for the same competitive practice loses the per-player tracking layer entirely.

## Consumer implications

- **Slipgate config viewer** — the player-skins section is a programmatic-path dominant cluster. The "default vs configured" diff for any modern config will surface `r_enemyskincolor` / `r_skincolormode` / `r_fullbrightskins` / `enemyforceskins` as the load-bearing settings. The four classic palette cvars (`enemytopcolor` / `teamtopcolor` / etc.) are largely vestigial and can render dimmer if not also set.
- **Oracle MCP "what does enemyforceskins do?"** — the answer should default to mode 3 / position-based, mention the mid-round lock, mention that it auto-announces, and mention that it requires `!FPD_NO_FORCE_SKIN`. Without those four facts the answer is misleading.
- **FTE config converter ("pandoc for configs")** — when porting an ezQuake config to FTE, the entire R7 layer gets dropped. Surface this as a warning, not a silent conversion. Map the foundational layer (baseskin/skin/noskins/etc.) cleanly; flag the R7 cvars as ezQuake-only.
- **Ruleset-aware help** — only `r_fullbrightskins` requires per-ruleset gating in answers (locked under MTFL). Every other skin cvar (including the powerup-carrier visibility layer: `r_powerupglow`, `r_dynamic`, `gl_flashblend`) is settable across all rulesets.
- **Server-state-aware help** — the FPD-bit-256 gate is invisible from the cvar value alone. Active-assistance answers should mention "this is silently disabled when the server sets FPD bit 256 (`FPD_NO_FORCE_SKIN`)" for any force-skin or color-force cvar.

## References

- Source guide: https://ezquake.com/docs/player-skins (imported 2026-04-25, commit `6776cba2`). Note: the upstream guide has a typo (`enemyforceskin` vs canonical `enemyforceskins`), labels several cvars as commands, and misattributes the `enemyforceskins 3` example as "4on4 = e1..e4" when 3 is the *mode* (position-based) and the count comes from team size.
- Skin forcing logic: `src/skin.c:71-98` (`Skin_ForcingType`).
- Skin name resolution: `src/skin.c:101-128` (`Skin_AsNameOrId`).
- Powerup priority: `src/skin.c:155-180` (within `Skin_FindName`).
- Color blend modes: `src/skin.c:525-575` (`Skin_ApplyRGBColor`).
- `enemyforceskins` change handler + mid-round lock + auto-announce: `src/skin.c:940-973` (`OnChangeSkinForcing`).
- `f_skins` chat-trigger response: `src/fchecks.c:81-89` (`FChecks_SkinsResponse`).
- FPD bit definitions: `src/teamplay.h:107-113`.
- `cl_deadbodyfilter` modes: `src/cl_ents.c:976-995` and `src/cl_ents.c:1903-1920`.
- `r_fullbrightskins` ruleset clamp + serverinfo cap: `src/rulesets.c:651-666` (`Rulesets_OnChange_r_fullbrightSkins`); render-time clamp at `src/r_aliasmodel.c:590` reading `r_refdef2.max_fbskins` set from `serverinfo fbskins` at `src/cl_view.c:1088`.
- MTFL ruleset lock on `r_fullbrightskins`: `src/rulesets.c:492` (entry in `disabled_cvars` table).
- Powerup-carrier visibility layer: `r_powerupglow` declared `src/cl_main.c:220` (default `"1"`), consumed at `src/cl_ents.c:898` and `src/cl_ents.c:1821` (mode-2 viewplayer-exempt logic). `r_dynamic` declared `src/r_rmain.c:151-153` (default `"2"` on multi-renderer builds, `"1"` on immediate-mode-only builds); OnChange handler at `src/r_rmain.c:108-115` rejects `>1` when GLSL is unavailable. Mode predicates at `src/r_lighting.h:47-49` (`R_NoLighting`, `R_HardwareLighting`, `R_SoftwareLighting`). `gl_flashblend` declared `src/r_rmain.c:182` (default `"0"`). All three are unrestricted under all six rulesets — verified via Phase 5b six-mechanism scan.
- First-person carrier color-shift (`v_*cshift` family): `v_quadcshift` / `v_pentcshift` / `v_ringcshift` declared `src/cl_view.c:91-94` (defaults `"0.5"`); applied at `src/cl_view.c:504, 516, 522` via `bound(0, val, 1)`; gated by `gl_polyblend 1` per help_remarks. Cited here because the `r_powerupglow 2` recipe depends on the cshift family for self-awareness; full coverage belongs in a future "first-person POV self-state indicators" Layer 3 note.
- FTE FPD bit (cross-engine confirmation): `engine/client/client.h:1062` (`#define FPD_NO_FORCE_SKIN (1 << 8)`); FTE skin code at `engine/client/skin.c:73`.
- KTX server-side skinforce admin: `src/commands.c:3729-3739` (`ToggleSkinForcing`); admin command at `src/commands.c:788`.
- Operator SME (recipes + colorspace conventions): @ParadokS, 2026-04-25 consult.
- Layer 1 entities: 6 coverage gaps surfaced in this rewrite (`r_fullbrightskins`, `r_skincolormodedead`, `enemytopcolor`, `enemybottomcolor`, `teamtopcolor`, `teambottomcolor`); 13 phantom `skin_browser_*` rows present in help-JSON but absent from current source — flagged for `Layer 1 doc_only audit` follow-up. Both `cl_deadbodyfilter` and `cl_gibfilter` carry null `help_desc` in current Layer 1 — help-JSON gap candidates for upstream.
- Cross-engine coverage (FTE shared FPD + foundational cvars): documented inline. MVDSV / KTX deeper coverage: TBD pending Phase 2d/2e Layer 1 extraction. See HANDOVER.md § Phase 2d-2h.
- Color picker conventions: community knowledge from operator practice; not source-measured. Treat as field-verified guidance, not authority-grounded fact.
- Qizmo historical framing: Qizmo was a third-party QW proxy that originated the FPD bitfield. Long discontinued. KTX inherited administration of the FPD bits (e.g., bits 32 / 128 / 8 for enemy reporting, pointing, fake lag are still labeled "qizmo" settings in KTX comments at `src/match.c:2102`).

## Related concept notes

- `ruleset-anti-script-restriction-pattern.md` — broader pattern for how QW competitive rulesets restrict client-side scripting; `r_fullbrightskins`'s MTFL lock is a small instance of the larger pattern.
- `lightning-gun-customization.md` — sister R2+R7 walkthrough for the lightning-gun visual layer (similar ruleset-and-FPD interaction shape, similar progressive-disclosure structure).
- Future: a player-tracking/callout-grammar concept note could absorb `enemyforceskins` mode-3 alongside HUD callout cvars (`f_pent`, `f_quad`, `f_armor` reports). Today the per-player tracking section here covers it adequately.
