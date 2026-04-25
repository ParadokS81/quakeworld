---
title: "Customizing the Lightning Gun in QuakeWorld"
slug: lightning-gun-customization
topic: domain-guide
status: draft
authored_by: qw-oracle
source_url: https://ezquake.com/docs/fakeshaft
imported_from: 71288542119f2110f2dc9881a9b89058bcacd03f
last_imported_at: 2026-04-25
upstream_status: gap-candidate
upstream_target: fakeshaft
primary_contributors:
  - "@ParadokS"
  - "@vikpe"
related_entities:
  - ezquake:cvar:cl_fakeshaft
  - ezquake:cvar:cl_fakeshaft_extra_updates
  - ezquake:cvar:r_shiftbeam
  - ezquake:cvar:gl_lightning
  - ezquake:cvar:gl_lightning_color
  - ezquake:cvar:gl_lightning_size
  - ezquake:cvar:gl_lightning_sparks
  - ezquake:cvar:gl_lightning_sparks_size
  - ezquake:cvar:gl_shaftlight
  - ezquake:cvar:r_shaftalpha
  - ezquake:cvar:gl_custom_lg_color
  - ezquake:cvar:gl_custom_lg_fullbright
  - ezquake:cvar:gl_custom_lgpack_color
  - ezquake:cvar:gl_coronas
  - ezquake:cvar:r_lgbloodcolor
  - ezquake:cvar:s_khz
  - ezquake:command:cl_truelightning
  - ezquake:ruleset:smackdown
  - ezquake:ruleset:qcon
  - ezquake:ruleset:smackdrive
  - ezquake:ruleset:thunderdome
scope: engine-specific
engines_covered: [ezquake]
last_updated: 2026-04-25
---

# Customizing the Lightning Gun in QuakeWorld

## Summary

The Lightning Gun (LG, also called "shaft") is QuakeWorld's short-range hitscan weapon: 10 shots per second at 30 damage each, 300 DPS sustained. Player-facing customization spans four dimensions: *mechanical behavior* (beam interpolation, antilag interaction), *visual rendering* (beam brightness, color, hit effects), *audio* (the fire sound is replaceable), and *ruleset interaction* (what competitive rulesets lock or nullify).

**Typical competitive setup:**

```
cl_fakeshaft 1          // beam always points at crosshair
gl_shaftlight 0.5       // medium brightness on the model beam
```

`cl_fakeshaft 1` is the majority default. `gl_shaftlight 0.5` dims the beam a bit while keeping it clearly visible — visually close to what `r_shaftalpha 0.5` would produce, with the advantage that it isn't nullified by smackdown (see Ruleset interaction below). Optional extras: `gl_custom_lg_color "<r> <g> <b>"` to recolor the beam, a replacement `sound/weapons/lstart.wav` to quiet the fire transient.

This note uses "LG," "lightning gun," and "shaft" interchangeably — the community does.

## Mechanical behavior

Original QuakeWorld updates the rendered beam position only 10 times per second, locked to the last server-confirmed hit location. If you move your crosshair between hits, the beam visually lags for up to 100ms, creating a disconnect between where the server says your beam hit and where you're aiming. `cl_fakeshaft` is the client-side interpolation that closes that gap.

### The four fakeshaft modes

From the cvar's own help text: *"Smoothes out shaft movement. 0 = no smoothing at all / 1 = 100% smoothing / A value of about 0.5 is recommended for modem players. Note that this only affects the visual display of the shaft beam; the 'true' beam remains in the original location."*

| Value | Behavior | When to use |
|---|---|---|
| `0` | Disabled. Beam frozen at last server-confirmed hit. | Historical accuracy; most players find the lag distracting. |
| `0.5` | 50% interpolation. Linear stepping toward crosshair. | Compromise that keeps some visual signal from the server position. |
| `1` | 100% interpolation. Beam always points at current crosshair. | Majority competitive default. |
| `2` | Anti-lag mode. Beam points at crosshair from 2 frames ago. | Servers running `sv_antilag 2` (see below). |

`cl_fakeshaft_extra_updates` (default 1) makes fractional-mode interpolation refresh every client frame rather than only on server frames. Smoother at high framerates; leave at default.

Source: `cl_main.c:174-175`, `cl_tent.c:791, 875+`.

### Antilag interaction

Server-side antilag (`sv_antilag 2` in MVDSV) rewinds hit tests to where each client saw the target at shot time, compensating for ping. KTX enables `sv_antilag 2` in default match setup and exposes it as a votable command — virtually all competitive matches run with antilag on.

`cl_fakeshaft 2` exists specifically for this scenario, rendering the beam at your crosshair from 2 frames ago to approximately match the frame the server uses for hit resolution. On antilag servers, `cl_fakeshaft 0` becomes misleading — the server records hits at your compensated position but the beam visually renders at the older server-confirmed position.

### cl_truelightning

Legacy alias redirecting to `cl_fakeshaft` via `Cmd_AddLegacyCommand` at `host.c:580`. Older scripts and forum posts reference this name; still works.

## Visual customization

ezQuake renders the LG beam via two code paths: a **particle beam** (textured particles along the beam axis) and a **model beam** (the classic `bolt.mdl` entity). Which path runs depends on `gl_lightning` and the active ruleset.

**Under smackdown / qcon / smackdrive the particle beam is suppressed and the model beam is the only beam that renders.** This shapes which cvars matter where: model-beam cvars are the ones that take effect under competitive play; particle-beam cvars are inert. Under default / thunderdome / mtfl the particle beam is live, and the relationship inverts — the particle-only cvars take effect, and `gl_custom_lg_color` (which only colors the model beam) becomes inert.

### Model beam cvars (active when particle beam is OFF — including all competitive rulesets)

| cvar | Layer 1 desc | notes |
|---|---|---|
| `gl_shaftlight` | "Toggles between darker/fullbright shaft beams." | Valid range 0 to 1; 0 is maximally dimmed, 1 is fullbright. `0.5` is the typical competitive pick — dim but clearly visible. |
| `gl_custom_lg_color` | "Allows color of lightning shaft to be set without requiring a texture change." | `CVAR_COLOR`; `"r g b"` triplet. Layer 1 remarks: *"Has no effect if particle shaft is enabled."* So this cvar IS effective under smackdown/qcon/smackdrive (particle beam suppressed) but inert under default/thunderdome/mtfl with particle beam active. |
| `gl_custom_lg_fullbright` | "Determines if gl_custom_lg_color refers to a fullbright color or standard." | Default `1` (fullbright). Layer 1 remarks: *"Has no effect if gl_custom_lg_color is blank."* — gated by the color cvar above. |
| `r_lgbloodcolor` | "Determines the color of the blood particles emitted when hitting entities with the lightning gun." | Hit-effect tint, not the beam itself. No ruleset restriction. |

Source: `cl_main.c:229`, `r_aliasmodel.c:75, 93-94`, `cl_tent.c:68`.

### Particle beam cvars (nullified under smackdown / qcon / smackdrive)

| cvar | Layer 1 desc |
|---|---|
| `gl_lightning` | "Toggles particle lightning beams. Glow is controlled by gl_coronas." |
| `gl_lightning_color` | "The RGB color of particle lightning beam and sparks." |
| `gl_lightning_size` | "Adjusts size of lightning particle beam." |
| `gl_lightning_sparks` | "Sparks fly from walls when hit by lightning gun." |
| `gl_lightning_sparks_size` | "Size of lightning sparks." — permanently clamped to 300 under ALL rulesets including default (`CVAR_RULESET_MIN | CVAR_RULESET_MAX` at `vx_stuff.c:54`). |

`gl_lightning 1` enables a single particle-copy beam; values up to 10 stack copies for visual density. The particle beam is visually busy and most competitive players don't use it. Relevant if you're making QuakeWorld video content or playing on a non-restricting ruleset.

Source: `vx_stuff.c:34-55`, `cl_tent.c:875+, 914, 925`.

### Peripheral visuals

- `gl_coronas` adds glow to the beam path (among other effects). Active only when `gl_lightning > 0`, so has no visible effect on the model-beam path used under smackdown.
- `gl_custom_lgpack_color` (default `64 64 255`) colors the backpack model when it contains an LG. **Layer 1 remarks make the scope explicit: *"QTV/MVD only, KTX 1.38+ only."* This cvar applies to the demo-playback / multi-view / QuakeTV-spectator rendering path, NOT to live in-game rendering.** Effectively restricted across the board for live play — not via any ruleset mechanism, but because the consuming code path is only active during demo viewing. Useful for demo reviewers, content creators, and spectators; has no effect during your own match.

## Audio customization

Two LG sound files exist, both precached server-side by the KTX QC progs:

| file | when it plays | source |
|---|---|---|
| `sound/weapons/lstart.wav` | On each `+attack` fire trigger (LG fire/ambient start) | `ktx/src/world.c:243`, `ktx/src/weapons.c:2230` |
| `sound/weapons/lhit.wav` | When the beam hits a player, max once per 0.6s | `ktx/src/world.c:242`, `ktx/src/weapons.c:1238` |

Neither file is in ezQuake's fmod watch list (`src/fmod.c:540-621`), so replacing them produces no `f_modified` report under any ruleset. Common practice: replace `lstart.wav` with a quieter variant — the stock file has a loud thunder-strike transient at the start followed by a low-volume static loop; copying the static portion over the full file eliminates the fire-frame transient during sustained LG engagements. `lhit.wav` replacement is uncommon; most players keep it for the informational hit feedback.

`s_khz` (default 11) is relevant: its own help text notes *"all original sounds are 11k, except shaft which is 22k and will sound different when setting s_khz over 11."* The LG sounds are the exception that motivates the comment.

## Ruleset interaction

QuakeWorld's ruleset system is client-declared. A player types `ruleset smackdown` at the console before joining; the client activates restrictions locally; other players query declared rulesets and modified-file status via `f_ruleset` and `f_modified` in chat. The server receives declarations but does not enforce integrity at the protocol level. Weak anti-cheat; effectively community convention backed by client-side behavior changes and honor-system disclosure.

**Rulesets that apply to competitive play** (from `src/rulesets.c`): `default`, `smackdown`, `qcon`, `thunderdome`, `mtfl`, `smackdrive`. Smackdown is the defacto competitive standard.

### What smackdown blocks for LG

| cvar / concern | mechanism | effect |
|---|---|---|
| `r_shiftbeam` | CVAR_ROM lock to "0" (`rulesets.c:293`) | Write-protected; cannot be changed. |
| `r_shaftalpha` | behavior gate (`cl_tent.c:881`) | Cvar value is silently ignored at match start — `ent.alpha` assignment from this cvar is skipped when smackdown is active. Beam always renders opaque. **Operator-surfaced gotcha: there is no notification that your setting has been overridden. Players running `r_shaftalpha 0.5` for transparency will not see it take effect in smackdown matches.** |
| `gl_lightning` + entire particle-beam cvar family | behavior gate — `Rulesets_RestrictParticles()` true | Particle beam path is suppressed; `gl_lightning`, `gl_lightning_color`, `gl_lightning_size`, `gl_lightning_sparks`, and the corona at the LG bolt are inert. Model beam is used regardless of cvar value. |
| `gl_lightning_sparks_size` | `CVAR_RULESET_MIN | CVAR_RULESET_MAX` clamp at declaration (`vx_stuff.c:54`) | Hard-clamped to 300 under ALL rulesets, not just smackdown. Any attempted change silently does nothing. |
| `/play` + `/playvol` console commands | `Rulesets_RestrictPlay()` (`rulesets.c:189-208`) | Blocked during active matches. Exception: sounds whose path contains `ktsound`. Unrelated to precached game-world sounds or replaced asset files. |

**`r_shiftbeam` rationale.** Source at `cl_tent.c:72` offsets the beam start-point along the view's right vector. The feature was originally meant for video capture and demo playback — letting movie-makers align the beam visually with screen-center despite the first-person weapon model being positioned off to the side. In a live-match context it's a visual manipulation no competitor should have available, which is why all four competitive rulesets lock it.

**The same gates apply under qcon and smackdrive.** Thunderdome locks `r_shiftbeam` but does NOT restrict particles — the particle-beam family is live under thunderdome.

### Demo-playback-only cvars (effectively restricted from live play)

Some cvars apply only during demo playback / multi-view / QuakeTV-spectator rendering, not during live in-game rendering. These aren't ruleset-restricted in the technical sense — no CVAR_ROM lock, no behavior gate, no watch list. The consuming code path is simply only active during demo viewing. Effectively restricted from in-match play across the board.

| cvar | Layer 1 remarks |
|---|---|
| `gl_custom_lgpack_color` | *"QTV/MVD only, KTX 1.38+ only."* Colors LG backpacks during demo or multi-view rendering only. Has no effect during your own live match. |

### Asset modification under rulesets

ezQuake's `fmod.c` watches SHA1 hashes of 29 specific asset files (item-pickup sounds, common models, some UI sounds) and reports modifications via `f_modified`. Neither LG sound (`lstart.wav`, `lhit.wav`) is in the watch list — replacement is silent under every ruleset. The watch list exists to surface abuse patterns on other assets: the canonical example is replacing `sound/items/damage.wav` (quad pickup) with a 1-minute static file that doubles as a timer cheat. The modified file still loads and plays — enforcement is social, via `f_ruleset` revealing an `m` flag and a match admin acting on it.

## Cross-engine

### FTE client

FTE's equivalent cvar is `cl_truelightning` (float 0.0-1.0) at `engine/client/cl_tent.c:313`. Semantics overlap at modes 0/0.5/1; FTE has a separate `cl_truelightning > 1` branch using a different frame-history algorithm with no ezQuake analogue. FTE's optional `ezscript` plugin provides a `cl_fakeshaft` shim that redirects to `cl_truelightning` (`plugins/ezscript/ezscript.c:75, 123`).

FTE's beam rendering uses particle-scripting rather than discrete cvars. `r_particledesc` plus the named `tsshaft` preset is FTE's equivalent of the particle beam (`r_partset.h:29-31`). The one cvar shared by name is `gl_shaftlight`. `f_fakeshaft` is natively supported (`valid.c:655-666`), gated by `allow_f_fakeshaft`; response text differs ("fakeshaft 50.0%" vs ezQuake's numeric value).

Cross-engine coverage is manual grep today. Full Layer 1 entity coverage TBD pending Phase 2d (FTE) Layer 1 extraction. See HANDOVER.md § Phase 2d-2h.

### Server side

MVDSV implements `sv_antilag` (`sv_phys.c:53-55`) with modes 0/1/2 as `CVAR_SERVERINFO`. Mode 2 is the projectile-antilag path that `cl_fakeshaft 2` is designed to pair with. KTX exposes `antilag` as a votable match command and toggles `sv_antilag` between 0 and 2 (`vote.c:1394`).

## Consumer implications

- **Slipgate config-viewer.** Present the four dimensions with progressive disclosure: mechanical (one cvar most players tune), then visual (two cvars for model beam, rest note as "only matters off-ruleset"), then audio (file-replacement recipe), then ruleset callouts. Don't list particle-beam cvars at competitive equivalence with model-beam cvars — under smackdown they're inert.
- **Oracle chatbot.** "How do I customize my LG / shaft / lightning gun" all map here. The Summary recipe is the short-answer. "Is my lstart swap allowed in smackdown" is yes, mechanism is not-in-watch-list. "Why doesn't my `r_shaftalpha` do anything in matches" is the silent-override gotcha in Ruleset interaction.
- **Config-editor wizard.** Let the user pick ruleset first; the recipe surface then prunes to the cvars that actually take effect under that ruleset.
- **Cross-engine tooling.** `cl_fakeshaft` → `cl_truelightning` with ezscript shim. `gl_lightning*` family does not exist in FTE; different paradigm.

## References

- **Source guide:** https://ezquake.com/docs/fakeshaft (imported 2026-04-25, upstream commit `71288542119f2110f2dc9881a9b89058bcacd03f`, last upstream content edit 2022-10-25). Upstream covers the four `cl_fakeshaft` modes + `f_fakeshaft` chat trigger only. This note expands to the visual, audio, and ruleset dimensions and corrects the ruleset framing (upstream says nothing about which tunings are nullified under competitive play).
- **ezQuake source (head):**
  - `cl_main.c:174-175, 229` — `cl_fakeshaft`, `cl_fakeshaft_extra_updates`, `r_shaftalpha`
  - `cl_tent.c:68, 72, 791, 875-925` — `r_lgbloodcolor`, `r_shiftbeam`, fakeshaft interpolation, particle-beam render path, behavior gates
  - `host.c:580` — `cl_truelightning` legacy alias
  - `vx_stuff.c:34-55` — particle beam cvar family; `gl_lightning_sparks_size` permanent clamp
  - `r_aliasmodel.c:75, 93-94, 138` — `gl_shaftlight`, custom-lg-color family, lgpack color
  - `snd_main.c:97` — `s_khz` help text with the shaft-is-22kHz note
  - `rulesets.c:189-208, 293, 360, 423, 555, 787` — `Rulesets_RestrictPlay`, `r_shiftbeam` locks per ruleset, `cl_fakeshaft` OnChange broadcast
  - `fmod.c:540-621` — SHA1 watch list (LG sounds NOT watched)
- **LG sound precache (server-side QC):** `ktx/src/world.c:242-243`; playback at `ktx/src/weapons.c:1238, 2230`.
- **FTE equivalents:** `engine/client/cl_tent.c:313, 315, 317, 3003-3008`; `plugins/ezscript/ezscript.c:75, 123`; `valid.c:68, 249, 655-666, 1475-1478`; `r_part.c:607-610`; `r_partset.h:29-31`.
- **MVDSV antilag:** `src/sv_phys.c:53-55, 751`. **KTX:** `src/commands.c:722, 4155`, `src/world.c:835`, `src/vote.c:1394`.
- **Operator SME:** @ParadokS (competitive recipe, silent-override gotcha on `r_shaftalpha`, LG sound modification practice). The recipe in Summary reflects his current in-match configuration.
- **This note is structured for progressive disclosure.** Summary + Mechanical behavior together stand alone as a ~60-line default-serve answer. Visual / Audio / Ruleset / Cross-engine are drill-down depth on request.

## Related concept notes

- `ruleset-anti-script-restriction-pattern` — adjacent ruleset enforcement pattern. The four-tier enforcement model (CVAR_ROM / behavior gate / declaration clamp / unwatched) generalizes across competitive-play restrictions; candidate for extraction to a dedicated pattern note when a second note independently surfaces the same tiers.
- `client-side-server-exec-allowlist` — another client-side defensive pattern.
- **Future-note candidates:** `per-weapon-audio-tuning` (if the catalog of legitimate sound swaps across weapons grows), `asset-modification-honor-system-pattern` (R5 extraction of the four-tier taxonomy).
