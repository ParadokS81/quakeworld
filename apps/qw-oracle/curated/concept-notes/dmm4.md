---
title: "dmm4 (aim practice)"
summary: "dmm4 is QuakeWorld's aim-practice mode: a 1on1 where you spawn with the full arsenal and unlimited ammo on a small arena map, so there is no item game and the whole match is aim, movement and rocket placement. Set it with the `dmm4` command. It is the base that midair, LGC and instagib are built on."
slug: dmm4
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-01
scope: engine-scoped
engines_covered: [ktx]

experience_group: aim-practice
deathmatch_flag: 4
roster: "1on1 (by convention)"
loadout: full-spawn

source_ref: commands.c:728
wiki_status: hybrid
wiki_page_slug: Deathmatch
introduced_in_version: "Kombat Teams (mod lineage)"
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:dmm4
  - ktx:command:no_gl
  - ktx:command:no_lg
  - ktx:command:noweapon
  - ktx:command:gren_mode
  - ktx:cvar:dmm4_invinc_time
  - ktx:cvar:k_dmm4_gren_mode
  - ktx:cvar:k_disallow_weapons
  - ktx:cvar:k_midair
  - ktx:cvar:k_instagib
related_modes:
  - {slug: midair, relation: similar-shape}
  - {slug: lgc, relation: similar-shape}
---

## Summary

dmm4 is QuakeWorld's aim-practice mode: a 1on1 where you spawn with the full arsenal and unlimited ammo on a small arena map, so there's no item game to play and the whole match is aim, movement and rocket placement. "Playing dmm4" almost always means playing povdmm4, the map it's practised on. It's also the base that midair, LGC and instagib are built on. Set it with the `dmm4` command.

## Activate

Type `dmm4` in the console. It switches the server to the `deathmatch 4` ruleset -- a base-ruleset command, not a match you "start" like `/4on4`, so you just play your 1on1 from there. To leave, set another deathmatch value (`dmm3`) or activate any normal mode.

## Basic ruleset

Typing `dmm4` sets `deathmatch 4` and the aim-practice preset:

- **Full arsenal on spawn, unlimited ammo** -- every weapon, and the per-shot ammo decrement is skipped while `deathmatch` is 4. Nothing to pick up.
- **250 health / 200 red armor** on every spawn.
- **2 seconds of spawn invincibility**, so you aren't fragged the instant you appear in a tight arena (tunable -- see *Hosting & settings*).
- **Grenade launcher off by default** (`k_disallow_weapons` defaults to GL-banned).
- **`timelimit 3`**, auto-set on entry.

## Settings to tune

Player commands dmm4 unlocks (typed in console):

- **`no_gl`** -- toggle the grenade launcher (alias for `noweapon gl`).
- **`no_lg`** -- toggle the lightning gun (alias for `noweapon lg`).
- **`noweapon <weapon>`** -- toggle any weapon: `axe sg ssg ng sng gl rl lg`. (`no_gl` / `no_lg` are just the two shortcuts people actually use.)
- **`gren_mode`** -- grenade-practice mode: grenades detonate only on a direct hit. dmm4-only.

They bite because dmm4 spawns the full arsenal, so disabling a weapon actually removes it.

## How it plays

You spawn on a full stack and fight; there's no item game. With nothing worth picking up and ammo that never drains, the entire duel is aim, movement and rocket placement -- the item-timing that anchors a normal 1on1 isn't part of it.

The one scrap of economy left is the backpack: a dropped pack gives +10 health that stacks past 250, and reaching 300 grants 30 seconds of bonus power -- in normal dmm4 that's both Pentagram and Quad, which dmm4 renames "OctaPower" (the lightning gun is disabled while it's active). The variants tune this: midair grants only the Quad, instagib a Ring instead, LGC and ToT switch it off. Under midair, holding that Quad also doubles your rocket speed -- the missiles turn blue.

dmm4 is also the base layer for the aim-practice family -- midair, LGC and instagib are each "dmm4 plus one rule" and won't enable unless dmm4 is set.

## Maps

dmm4 is map-coupled -- small enclosed arenas with clean sightlines and room to rocket-jump:

- **povdmm4** -- the canonical aim map, so dominant that "dmm4" and "povdmm4" are used interchangeably.
- **amphi** -- the other classic aim arena.
- **endif** / **nacmidair** -- airborne-friendly maps used under the midair rule.

## History

dmm4 dates to the **Kombat Teams** mod (the lineage that became KTPro then KTX), built for practice on constructed arena maps. povdmm4 became the de-facto surface, to the point the map name now stands in for the mode.

## Hosting & settings

dmm4 needs no special setup -- any KTX server lets a player type `dmm4`, and an admin can pin it as the base ruleset directly:

```
# server.cfg
set deathmatch 4
```

Server-side cvars that shape dmm4:

- **`dmm4_invinc_time`** -- spawn-invincibility seconds. Empty or `0` = the 2s default; positive sets it (max 30); negative disables it.
- **`k_dmm4_gren_mode`** -- `0` / `1`, default `0`. `1` enables grenade-practice mode (the `gren_mode` command toggles it in-game; midair and instagib force it off).
- **`k_disallow_weapons`** -- bitmask of weapons removed from the spawn: `1` SG · `2` SSG · `4` NG · `8` SNG · `16` GL · `32` RL · `64` LG · `4096` axe (add to combine). Default `16` (GL off). The `no_gl` / `no_lg` / `noweapon` commands flip individual bits.

## See also

- `midair`, `lgc` -- the aim-practice siblings, each dmm4 with one scoring rule added; both require dmm4.
- `instagib` -- also built on dmm4 (a novelty FFA rather than an aim drill).
- `deathmatch-modes` -- the `deathmatch` flag reference; dmm4 is value 4.

<!-- triage notes: option-a authoring. No game_mode row exists for dmm4 (the L1 extractor harvested UserModes + k_-mutators, not the ChangeDM command family) -- this note is anchored on the ktx:command:dmm4 entity (in related_entities), and experience_group / deathmatch_flag / loadout are set by hand from source rather than read from a row. Mechanism is a ChangeDM deathmatch-flag command, which is neither a UserMode `standalone` nor a k_-cvar `mutator`, so `kind` and `mode_default_init_array` are intentionally omitted (dmm4 has no _um_init array). Re-point to a ktx:game_mode:dmm4 row if extraction is later extended to the ChangeDM family. wiki_status hybrid: QWiki Deathmatch page supplied the Kombat-Teams origin + amphi/povdmm4 map names; mechanics verified against KTX 1.47-2-g67253dc source. v2 recast 2026-06-01 (player/admin section split): settings values re-verified from source -- k_disallow_weapons bitmask (g_consts.h:85-92, default 16 at commands.c:4173), dmm4_invinc_time 2s/30s (g_consts.h:317-318), midair double-rocket bonus (weapons.c:1059-1063). Spawn loadout (250/200), OctaPower, and timelimit 3 carried from the v1 note's source citations, not re-verified this pass. -->
