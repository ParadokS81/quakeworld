---
title: "Configuring the QuakeWorld HUD: status bar, frags, team score, and on-screen info"
summary: "How to set up the ezQuake HUD. Leads with the one decision that governs everything -- the new customizable element HUD (scr_newhud 1) vs the old fixed status bar -- then covers showing/placing/styling elements, frag and team-score display, on-screen messages, and what competitive rulesets restrict. Most HUD choices are personal preference; this gives the mechanism, not a one-size config."
slug: hud-configuration
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: hud
primary_contributors:
  - "@ParadokS"
related_entities:
  - ezquake:cvar:scr_newhud
  - ezquake:cvar:cl_sbar
  - ezquake:cvar:cl_hud
  - ezquake:cvar:scr_sbar_drawitems
  - ezquake:cvar:scr_tracking
  - ezquake:cvar:hud_tracking_show
  - ezquake:cvar:hud_planmode
  - ezquake:command:hud_editor
  - ezquake:command:show
  - ezquake:command:hide
  - ezquake:command:place
  - ezquake:command:align
  - ezquake:command:move
  - ezquake:command:hud_recalculate
  - ezquake:command:hud_export
  - ezquake:command:ownfrags
  - ezquake:command:teamcolor
  - ezquake:command:enemycolor
  - ezquake:cvar:hud_frags_show
  - ezquake:cvar:hud_frags_style
  - ezquake:cvar:hud_teamfrags_style
  - ezquake:cvar:hud_teamfrags_shownames
  - ezquake:cvar:hud_score_team_digits
  - ezquake:cvar:hud_score_position_digits
  - ezquake:cvar:hud_fps_show
  - ezquake:cvar:hud_gameclock_show
  - ezquake:cvar:hud_radar_show
  - ezquake:cvar:hud_weaponstats_show
  - ezquake:cvar:show_fps
  - ezquake:cvar:show_speed
  - ezquake:cvar:r_netstats
  - ezquake:cvar:con_notify
  - ezquake:cvar:con_notifylines
  - ezquake:cvar:con_notifytime
  - ezquake:cvar:con_fragmessages
scope: engine-specific
engines_covered: [ezquake]
best_practices_reviewed: 2026-06-10
last_updated: 2026-06-10
---

# Configuring the QuakeWorld HUD

## Summary

QuakeWorld's heads-up display is configured through ezQuake's customizable **element** system: you turn it on with `scr_newhud 1`, then show, place, and style individual elements -- frags, ammo, the clock, fps, the netgraph, and dozens more -- either with console commands or the in-game `hud_editor`. The one decision that governs everything else is **which HUD you are configuring**: the modern element HUD or the old fixed status bar. A cvar that belongs to one does nothing under the other, and that "I changed it and nothing happened" confusion is the single most common HUD question. Almost everything past that decision -- which elements to show, their styles, their colors, where messages land -- is personal preference. This guide gives you the mechanism and the few choices that matter, not a one-size config.

## Which HUD are you configuring?

Set `scr_newhud` first; it decides which family of settings is live.

| `scr_newhud` | What you get | Choose it when |
|---|---|---|
| **`1` -- new customizable HUD (recommended)** | Composable elements you show, place, align, scale, and style anywhere on screen, plus the `hud_editor` drag-and-drop editor. | Every modern setup. This is what the demand below is about and what the rest of this guide covers. |
| `0` -- old status bar (default) | The classic fixed Quake bar across the bottom. Tuned with the `scr_sbar_*` cvars. | You want the stock look, or you are matching an old config. |
| `2` -- both | The old bar drawn first, new elements layered on top. | Transitional -- a FuhQuake-style bar plus a few new elements. |

The recommended path is the **new HUD (`scr_newhud 1`)**: it is the only one that lets you put information where you want it, and it is what every current config and example layout assumes. The old status bar also responds to `cl_sbar`. A separate, niche third system -- the "strings HUD" (`cl_hud 1`, placed with the `hud262_*` commands) -- lets you paint arbitrary text on screen but is **locked off in competitive rulesets** (see Ruleset interaction); ignore it unless you specifically need it.

The reason the gate matters: many old-HUD cvars are inert under the new HUD and vice-versa. The engine even says so in its own help -- `scr_sbar_drawitems` reads *"This variable applies for old HUD <= 'scr_newhud 0'."* If you set something and see no change, the first thing to check is whether it belongs to the HUD you are actually running.

## The element model: show, place, style

Under the new HUD, everything on screen is a named element ("fps", "netgraph", "frags", "armor", ...). Each element remembers its settings as cvars named `hud_<element>_<property>`, but you rarely set those directly -- you drive elements with commands:

- **`show <element>` / `hide <element>`** -- turn an element on or off. This is a shortcut for the element's own visibility property: `show fps` is identical to `hud_fps_show 1` (or `fps show 1`), and **most elements support the `show`/`hide` form**. `show` with no argument lists every element and its status; `show all` reveals everything.
- **`place <element> <area>`** -- choose the screen region: `screen`, `view`, `top`, `sbar`, `ibar`, `hbar`, and the post-bar free areas (`sfree`/`ifree`/`hfree`). You can also place one element relative to another (`place fps @net` puts fps inside net; `place health face` puts it outside, beside the face).
- **`align <element> <x> <y>`** and **`move <element> <dx> <dy>`** -- snap an element to an edge, then nudge it by pixels.
- Per-element properties (`frame`, `scale`, `style`, `digits`, `align`) are set by typing the element name as a command: `netgraph frame 0`, `fps scale 1.5`.

The friendliest way to do all of this is the visual editor: type **`hud_editor`** to drag, resize, and align elements with the keyboard, then it writes a config you can keep. `hud_export` dumps your current HUD to a config file, and `hud_planmode 1` draws every item as if you currently have it (so you can position the quad icon, flags, etc. without owning them). If you change a `hud_*` position variable by hand and nothing moves, run `hud_recalculate`. ezQuake also ships ready-made layouts you can study -- `exec cfg/hud_corner`, `exec cfg/ezhud`, and several others.

## Diagnostic info on demand (toggle binds)

A common and recommended workflow is to bind a key that flips diagnostic elements on and off, so the information is there when you want it (checking your connection in prewar, tuning before a match) without cluttering the screen during play:

```
// One key toggles the diagnostic elements between rounds
alias info_on  "show fps; show ping; show netgraph; show speed; bind i info_off"
alias info_off "hide fps; hide ping; hide netgraph; hide speed; bind i info_on"
bind i info_on
```

Whether you keep things like fps permanently on or only on-demand is preference -- some players leave fps and a clock up all match; others, like ParadokS, keep the screen clean and toggle the whole diagnostic set with one key (operator SME, 2026-06-10).

**One naming trap worth knowing:** `show fps` and `show_fps` are *different things*. `show fps` (no underscore) is the element shortcut above -- identical to `hud_fps_show 1`, it reveals the new HUD's positionable `fps` element. `show_fps` (with underscore), like `show_speed` and `r_netstats`, is an older standalone cvar that draws a plain fixed counter from the pre-element "Screen Settings" family. Under the new HUD you want the shortcut form (`show fps` / `hud_fps_show 1`); reaching for the underscore cvar -- or wondering why `show_fps 1` won't move with the editor -- is a frequent "why won't my fps counter behave" cause.

## Frag and team-score display

Showing your own and your team's score is the most-asked HUD topic, and it is almost entirely preference. The mechanism:

- **Your frag count:** the `frags` element (`hud_frags_show`, styled with `hud_frags_style`). The `ownfrags` element shows a "you fragged X" style line; players often separate it from the main frag table.
- **Team / enemy score:** the `teamfrags` element. `hud_teamfrags_style` picks a numbered look (brackets, arrows, colored backgrounds), `hud_teamfrags_shownames` adds team tags, and `hud_score_team_digits` / `hud_score_position_digits` control the compact score readouts.
- **Colors:** team and enemy colors come from your `teamcolor` and `enemycolor` -- the same colors that drive the scoreboard and the player models (see player-skins).

There is **no single correct setup here** -- it is one of the most personal parts of a config, and the community genuinely has not converged. Some players override everyone's colors so teams are always legible no matter what others run; others show players' own colors and expect opponents to pick contrasting ones. As one concrete data point, ParadokS runs `enemycolor 3 3`, `teamcolor 11 11`, and `hud_teamfrags_style 2` -- offered as illustration, not a standard (operator SME, 2026-06-10; community consensus here is unsettled and would only become visible once a config-upload database exists). Treat the style numbers as "try them and pick what reads fastest for you."

## On-screen messages and the notify area

Incoming chat, team messages, and frag messages land in the **console notify area** -- the lines that briefly appear at the top-left during play. `con_notifylines` sets how many lines show, `con_notifytime` how long they linger, and `con_notify` toggles the area. Frag messages specifically are gated by `con_fragmessages`.

Where these end up is preference again. ParadokS prints frag messages only to the console and reads frags off the separate **frag-tracker** instead, in its own corner of the screen (operator SME, 2026-06-10); others mix frags and team messages together in the notify area, and some center team messages on screen. The frag-tracker is its own feature with its own guide (see Related), and the team-message *text* grammar (the `tp_msg*` say/teamsay macros) belongs to the teamplay-comms guide -- this note owns only where the notify area sits, not what gets written into it.

## Hiding the spectator "tracking: ..." overlay

To remove the `tracking: <name>` text that shows whose point of view you are on -- when spectating or watching an MVD demo -- hide its HUD element: `hide tracking`, equivalently `hud_tracking_show 0`. This is the usual fix when recording a clean demo video.

It is also a textbook case of the mode gate. `scr_tracking` only sets the *format* of that text under the old HUD (`scr_newhud 0`), so `scr_tracking 0` does **not** make it disappear -- the most common point of confusion here. Under the new HUD, visibility is the element's own property, reached with `hide tracking` / `hud_tracking_show 0` (to change the *text* under the new HUD, the engine points you at `/tracking format`).

## HUD scaling

Make a single element bigger or smaller with its `scale` property (`fps scale 1.5`, or `hud_<element>_scale`). Scaling the *whole* HUD and console -- the `vid_conwidth` / `vid_conheight` / `vid_conscale` family that keeps the HUD a usable size on a high-resolution or 4K monitor -- is shared with the rest of the 2D interface and is owned by the display-config guide. Set overall scale there, then size individual elements with `scale`.

## Ruleset interaction

The new-HUD element system and the `scr_newhud` / `cl_sbar` toggles are **free under every competitive ruleset** -- positioning, styling, and showing elements is player configuration, not automation. Two HUD-adjacent restrictions do exist:

- The **strings HUD** (`cl_hud`) is forced to `0` under `smackdown`, `qcon`, `thunderdome`, and `smackdrive` (`rulesets.c`). Because it can paint arbitrary text and filter incoming messages, it is treated as off-limits in those rulesets.
- Swapping HUD **pictures** is blocked by a ruleset check (`Ruleset_BlockHudPicChange`).

For the broader pattern of how rulesets clamp client features, see the ruleset anti-script restriction note.

## The old status bar

If you run `scr_newhud 0` (the default) or set `cl_sbar 1`, you get the classic fixed Quake status bar instead of the element system. It is tuned with the `scr_sbar_*` family (for example `scr_sbar_drawitems`, which draws powerups and keys in the bar) -- all of which apply only while the old HUD is active. Reach for it if you want the stock look or are reproducing a vintage config; otherwise the new HUD is strictly more flexible.

## Consumer implications

- **Slipgate config-viewer.** Surface `scr_newhud` *first* as the mode selector, then present HUD-element cvars (`hud_*`) and old-status-bar cvars (`scr_sbar_*`) as two separate, mode-gated groups -- showing both flat invites the "I changed it and nothing happened" confusion. The `show_fps`-cvar vs `show fps`-element distinction is worth a disambiguation hint.
- **Oracle MCP / chatbot.** "How do I show my fps / frags / score / netgraph" all resolve to the element model: `scr_newhud 1` then `show <element>` (plus the `hud_editor` for placement). When asked for a "best" team-score or color setup, lead with the mechanism and say plainly it is preference -- do not invent a community standard. The mode-gate question ("are you on the new HUD or the old status bar?") is the right first clarifier when a HUD cvar "isn't working."

## References

- **Mode gate:** `scr_newhud` at `cl_screen.c:107` (`0` old / `1` new / `2` both); `cl_sbar` at `cl_main.c:149`; engine-annotated gating in `scr_sbar_drawitems`'s help (*"applies for old HUD <= 'scr_newhud 0'"*), `sbar.c:75`.
- **Element commands:** `show` / `hide` (`hud.c:813-814`), `move` / `place` / `align` (`hud.c:815-820`), `hud_recalculate` (`hud.c:821`), `hud_editor` (`hud_editor.c:2795`), `hud_export` (`config_manager.c:1224`), `hud_planmode` (`hud_common.c:104`), `ownfrags` (`hud_scores.c:852`). `teamcolor` / `enemycolor` (`teamplay.c:3370-3371`).
- **Ruleset locks:** `cl_hud` forced to `0` for smackdown / qcon / thunderdome / smackdrive (`rulesets.c`); `Ruleset_BlockHudPicChange` (`rulesets.c:890`).
- **Notify / frag messages:** `con_notify`, `con_notifylines`, `con_notifytime`, `con_fragmessages` (source-backed in current head).
- **Upstream guide (input, not mirror):** ezquake.com/docs `hud.md` -- authoritative on the element mechanism (editor, `show`/`place`/`align`/`move`, properties, relative positioning) but with no decision-first framing, no ruleset notes, and no old-vs-new disambiguation; this note is a gap-candidate to supersede it.
- **Community / operator testimony:** toggle-bind workflow and color/message-routing examples per ParadokS, 2026-06-10 -- flagged inline as preference, not source-defensible consensus.
- All `related_entities` verified `source_backed` in Layer 1 (`project='ezquake'`), queried 2026-06-10.

## Related concept notes

- `ruleset-anti-script-restriction-pattern` -- how competitive rulesets clamp client features; the `cl_hud` lock and HUD-pic block are instances.
- `player-skins` -- `teamcolor` / `enemycolor` also drive player models and the scoreboard; the color half of team-score display overlaps it.
- `weapon-scripts` -- sibling player-config guide; same decision-first, progressive-disclosure shape.
- **Forward references (not yet authored):** a **frag-tracker** guide (the separate on-screen frag display ParadokS uses), the **display-config** guide (resolution / `vid_conscale` / HUD scaling, Tier-2), and the **teamplay-comms** guide (the `tp_msg*` message grammar whose output lands in the notify area, Tier-2).
