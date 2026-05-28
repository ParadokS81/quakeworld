---
title: "Capture the Flag"
summary: "Goal-oriented team mode where two teams (red and blue) fight to grab the enemy flag and return it to their own base for a capture. KTX implements David Zoid Kirsch's Threewave CTF lineage with optional grappling hook, four runes, and 15-point captures with 10-point team bonuses."
slug: ctf
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: standalone
canonical_id: ktx:game_mode:ctf
gameplay_source_id: ktx
source_ref: commands.c:4543
activation_summary: "Type `/ctf` on a KTX server where `k_allowed_free_modes` includes the `UM_CTF` bit (value 64). UM_CTF is its own bit -- no other mode shares it, so servers that allow CTF allow only CTF from that bit."
wiki_status: wiki-upstream
wiki_page_slug: Capture_the_Flag
introduced_by: "David \"Zoid\" Kirsch (original Threewave CTF, 1996)"
introduced_in_version: "predates KTX 1.0 (source in tree since the SVN era, pre-2007)"
note_anchor_version: 1.47-2-g67253dc

um_internal_id: UM_CTF
mode_default_init_array: ctf_um_init
common_baseline_init_array: common_um_init
team_count: team
roster: "variable (2v2 / 4on4 / 5v5)"
loadout: item-pickup
items_on_map: all
respawn_behavior: instant
objective: capture-most-flags
score_system: capture-points-plus-frags
shape_facets: [capture_objective, team_based, special_powerups, mobility_modifier]

related_entities:
  - ktx:command:ctf
  - ktx:cvar:k_mode
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_ctf_based_spawn
  - ktx:cvar:k_ctf_ga
  - ktx:cvar:k_ctf_hook
  - ktx:cvar:k_ctf_hookstyle
  - ktx:cvar:k_ctf_runes
  - ktx:cvar:k_ctf_rune_bounce
  - ktx:cvar:k_ctf_custom_models
  - ktx:cvar:k_ctf_hurt_items
  - ktx:command:tossrune
  - ktx:command:tossflag
  - ktx:command:flagstatus
  - ktx:command:dropquad
  - ktx:command:noga
  - ktx:command:nohook
  - ktx:command:norunes
  - ktx:command:practice
related_modes:
  - {slug: 4on4, relation: similar-loadout}

note_origin: hybrid
---

## Lead

Capture the Flag is a goal-oriented team mode where two teams (red and blue) fight to grab the enemy flag and return it to their own base for a capture. Each team's flag spawns at a flag stand inside their base; carrying the enemy flag to your own stand scores 15 points for the capture and 10 for each teammate, plus assist bonuses for returns and carrier-kills. KTX implements David "Zoid" Kirsch's 1996 Threewave CTF lineage, with the grappling hook and four runes (Haste, Regeneration, Strength, Resistance) as the distinctive mechanical layer.

## How to play

Type `/ctf` in the console on a KTX server where `k_allowed_free_modes` includes the `UM_CTF` bit (value 64). UM_CTF is its own bit -- no other modes share it, so enabling CTF in a server's mode allowlist enables only CTF from that bit (unlike `UM_4ON4`, which simultaneously enables 4on4 + ca + wipeout). Players pick a side with `/team red` or `/team blue` and ready up. Matches default to 10-minute rounds (`timelimit 10`) with optional 5-minute overtime (`k_overtime 1`, `k_exttime 5`).

A matchtag for demo naming can be passed as an optional argument: `ctf <matchtag>`.

## Rules

- **Two teams**, blue and red. Each team has a base on the map; the flag spawns at a flag stand inside the base. Player count caps at 16 (`maxclients 16`, `k_maxclients 16`).
- **Scoring** (constants at `ctf.c:25-31`):
  - **Capture** = 15 to the capturer + 10 to each teammate. In 4-player teams, each capture is worth 45 frag-equivalents.
  - **Return** = 1 for returning your own flag to its stand.
  - **Carrier-kill assist** = 2 for killing the enemy carrier within 6 seconds of a capture by your team.
  - **Return assist** = 1 for returning your own flag within 4 seconds of a capture.
  - Regular frags count 1 each.
- **Capture conditions**: the enemy flag must be touched to your team's flag stand WHILE your own flag is at your stand. If your flag has been taken, you cannot score -- carry the enemy flag until your own returns.
- **Flag mechanics**: when a flag carrier is killed, the flag drops at the death position. The attacking team can re-grab it; the defending team's touch instantly returns the flag to its home stand.
- **Loadout**: standard item-pickup. No full-spawn -- players spawn with the starting weapon and pick up weapons / ammo / armor / powerups on the map.
- **Spawn placements**: `k_ctf_based_spawn 1` puts each team on their own base side. On maps that don't support per-team spawns (e.g. qwq3wcp9 which has only one `info_player_deathmatch`), KTX falls back automatically to default DM spawns.
- **Discharge rule**: `k_dis 2` -- no out-of-water LG discharges, suppressing the classic frag-for-suicide exploit in CTF.
- **Spawn protection**: 50 green armor on respawn (`k_ctf_ga 1`) reduces spawn-kill volatility. Disabled per-server with `/noga`.
- **Teamplay model**: `teamplay 4` -- KTX CTF teamplay mode with friendly-fire / team-kill rules distinct from standard DM teamplay.

## The grappling hook

The grapple is CTF's defining mobility tool. Off by default in KTX (`k_ctf_hook 0`); when enabled it fires with `+fire 22` or `impulse 22`. KTX supports four hook styles via `k_ctf_hookstyle`:

- `hook_classic` -- the original Threewave hook
- `hook_fast` -- accelerated reel-in
- `hook_smooth` -- smoothed motion
- `hook_crhook` -- the "CR hook" variant (refined in PR #277 by inf1niti)

> "...As for the grapple, after seeing how it was being used so effectively in CTF, I felt it was too fast. A player could be gone before you had a chance to even blink and that made it too powerful. But, it became part of the game and players worked to accommodate it." -- David "Zoid" Kirsch (Threewave-era quote, harvested from the wiki)

CTF without hook is sometimes called "classic CTF" or "pure CTF" in other games; in QuakeWorld hook-on is the norm in active competitive play.

## Runes

CTF is one of the few QW modes with its own special powerups. Four runes can spawn on the map (master toggle `k_ctf_runes 1`; off by default):

| Rune | Theme | Effect |
|---|---|---|
| **Haste** | Hell Magic | Doubles movement speed and rocket fire rate |
| **Regeneration** | Elder Magic | Slowly restores armor + health up to 150; megahealth doesn't drain |
| **Strength** | Black Magic | Doubles damage dealt (8x with quad) |
| **Resistance** | Earth Magic | Halves damage received |

Each player can carry only one rune at a time. The `/tossrune` command drops the held rune for a teammate (`bind r tossrune` is a common convention). Per-rune disable is supported via `k_ctf_rune_power_*` cvars (PR #252 -- setting a rune's power to 0 disables that rune individually). Rune bouncing behavior is controlled by `k_ctf_rune_bounce` (PR #290); PR #288 added randomized rune spawn locations.

## Strategy

Classic CTF strategy revolves around three concurrent priorities:

- **Flag carrier survival**. The carrier is the team's score engine. Skilled CTF play involves carrying the flag toward your base via hook mobility, evading engagements rather than seeking them. Carriers stay alive by reading the map and using teammate cover.
- **Map control and quad timing**. Standard QW quad-control instincts still apply; in CTF a teammate carrying quad-and-flag is the highest-value player on the map. Coordinating rotations to time quad with a flag run is canonical CTF play.
- **Pressure vs defense balance**. Modern strategy emphasizes controlling the map center and threatening the enemy flag rather than purely camping your own base. If their flag is constantly being challenged, your defense has less to do.

Typical team setups have a designated flag runner (the fastest player, often a hook specialist), one or two defenders, and one or two map-control players cycling between quad runs and offense.

<!-- verify: Strategy section is harvested from the Capture_the_Flag wiki page; the "modern strategy" framing reflects 2022-2024 competitive practice (CTF Showdown era). Curator pass should ground or trim against community testimony. -->

## Maps

CTF plays on dedicated CTF maps (those with built-in flag spawn metadata) and on standard QW maps via the entfile overlay system (`sv_loadentfiles_dir ctf` loads CTF-specific entity definitions for vanilla maps).

Common CTF maps in competitive play:

| Map | Notes |
|---|---|
| `ctf2m1` | Classic Threewave; Showdown 4on4 staple |
| `ctf2m3` | 2on2 tournament map |
| `ctf2m8` | 2on2 / 4on4 |
| `ctf5` | Classic Threewave |
| `ctf8` | Classic Threewave; tournament staple |
| `e1m5` | Vanilla SP map adapted via entfile |
| `e2m2` | Vanilla SP adapted; the most-played non-dedicated CTF map |
| `e2m5` | Vanilla SP adapted |
| `e3m6` | Vanilla SP adapted |
| `mammoth` | Modern competitive map by Alice (2023+) |

Some custom maps require per-map cfg overrides for hook/rune toggles -- see `qwq3wcp9.cfg` for a working example that disables both hook and runes for that single map.

## History

CTF was created by **David "Zoid" Kirsch** as Threewave CTF, released in late 1996 -- the first goal-oriented teamplay mod for Quake. The community embraced it quickly; many CTF players never played plain deathmatch and built a parallel scene around the mode.

The CTF serverside evolved in several stages:

1. **Threewave CTF** (1996+) -- the original.
2. **PureCTF / PureCTF Pro** (early 2000s) -- community-maintained server-side forks.
3. **KTX integration** -- src/ctf.c has been in KTX since the pre-git SVN era (earliest commit visible in tree dated 2007-07-18; the mode predates the git migration).
4. **Modern KTX CTF era** (2018-2025) -- substantial maintenance and feature work via the qw-ctf GitHub org. Notable PRs: per-team based spawns (#240), destructable runes + flags (#242), randomized rune spawns (#288), per-rune disable (#252), bouncing-rune control (#290), CTF monsters (#289), hook-style refinements (#277, inf1niti), CSQC additions (#392), map limits + HUD-key flag display (#445).
5. **Competitive revival** (May 2022+) -- after a long quiet period in QW CTF, Shining + Elguapo organized **CTF Showdown** (May 2022, 4on4, won by Creature Condors), followed by **CTF Showdown 2** (Sept 2023, 2on2). Weekly community games run on Mondays and Thursdays.

Wiki commentary notes that competitive practice has converged on 10-minute rounds; older Threewave-era play used 20-minute rounds and allowed more comeback potential.

## Server setup

Set `k_allowed_free_modes` to include the `UM_CTF` bit (value 64). UM_CTF is its own bit -- no co-flag is needed; enabling CTF does not enable any other mode.

Common server-side toggles applied on top of the `/ctf` preset for competitive setups:

- `k_ctf_hook 1` -- enable grapple (off by default)
- `k_ctf_runes 1` -- enable runes (off by default)
- `k_ctf_ga 0` -- disable spawn green armor (default on)
- `k_ctf_hookstyle <classic|fast|smooth|crhook>` -- pick a hook style server-wide

Per-map cfgs in `maps/<mapname>.cfg` can override these per map. The `/ctf` preset refuses to apply while bots are active (must run `/botcmd disable` first) and while `k_auto_xonx` is on; hoonymode-only maps block all preset switches.

## Configuration

<!-- configuration table auto-projected from gameplay_mechanics WHERE props_json->>'initstring_array' = 'ctf_um_init'. The 21 CTF-specific overrides applied on top of common_um_init. Key CTF-only values: k_mode=4 (CTF game type), teamplay=4 (CTF teamplay model), deathmatch=3 (weapons stay on floor after pickup), timelimit=10, maxclients=16, k_ctf_based_spawn=1, k_ctf_hook=0 (hook OFF by default), k_ctf_runes=0 (runes OFF by default), k_ctf_ga=1 (50 green armor spawn ON), k_dis=2 (no out-of-water discharges). Also sets pm_airstep=1, k_pow=1, k_spw=1, k_lockmin=1, k_lockmax=2, k_overtime=1, k_exttime=5, k_membercount=0, sv_loadentfiles_dir=ctf (entfile overlay loader). -->

## See also

- `/ctf` -- activation command (`commands.c:4543`).
- `k_mode` -- game-type discriminator; `4` = CTF.
- `k_allowed_free_modes` -- bitmask of allowed presets; bit 64 (UM_CTF) gates CTF.
- `k_ctf_hook` / `k_ctf_hookstyle` -- grapple master toggle + style selector.
- `k_ctf_runes` -- master rune toggle; per-rune disable via `k_ctf_rune_power_hst|res|rgn|str`.
- `k_ctf_ga` -- spawn green armor toggle (default on).
- `k_ctf_based_spawn` -- per-team spawn placement.
- `/tossrune`, `/tossflag` -- drop carried rune or flag.
- `/flagstatus` -- detailed flag state (who holds what, where).
- `/dropquad` -- toggle the rule that quad-holders drop quad on death.
- `/norunes`, `/nohook`, `/noga` -- in-game disable shortcuts.
- `/practice` -- enter practice mode (useful for warming up hook + rune routes).
- `+scores` -- CTF-aware status bar overlay.
- `4on4` -- shares item-pickup teamplay loadout (similar economic shape but no capture objective).

<!-- triage notes: wiki-upstream. Capture_the_Flag.json (~12.4K chars) provided Lead / History / Concept / Objectives / Hook / Runes / Strategy / Maps / Special Commands; all mechanical claims (scoring constants, defaults, k_ctf_* cvars, hook + rune toggles) verified against ctf_um_init at commands.c:4438 and src/ctf.c constants (CAPTURE_BONUS=15, TEAM_BONUS=10, RETURN_BONUS=1, CARRIER_ASSIST_BONUS=2, RETURN_ASSIST_BONUS=1, CARRIER_ASSIST_TIME=6, RETURN_ASSIST_TIME=4). Wiki claim of "defending bonuses" not source-confirmed (CARRIER_ASSIST and RETURN_ASSIST exist; no separate FLAG_DEFENSE_BONUS in ctf.c constants) -- omitted from prose. Showdown + Showdown_2 satellite pages contributed competitive-revival history. Map list synthesized from wiki overview + tournament map rotations. Hook styles enumerated from entities-table grep, not from wiki. -->
