---
title: "3on3on3"
summary: "Three-team deathmatch at three a side -- red, blue and green, each against the other two. Picked-up weapons vanish and respawn, so it is a map-control game split three ways. Most frags at the 15-minute mark wins."
slug: 3on3on3
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-02
scope: engine-scoped
engines_covered: [ktx]

experience_group: standard-game
kind: standalone
deathmatch_flag: 1
roster: "3v3v3 (three teams of three)"
loadout: item-pickup
objective: frag-leader-at-timelimit

canonical_id: ktx:game_mode:3on3on3
gameplay_source_id: ktx
source_ref: commands.c:4548
mode_default_init_array: _3on3on3_um_init
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:3on3on3
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
  - ktx:cvar:k_lockmax
  - ktx:cvar:k_membercount
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: 2on2on2, relation: similar-shape}
  - {slug: 4on4on4, relation: similar-shape}
  - {slug: 3on3, relation: similar-shape}
---

## Summary

3on3on3 is three-team deathmatch at three a side -- red, blue and green, each against the other two. Picked-up weapons vanish and respawn, so it is a map-control game split three ways: holding a region and its item timers is harder with two rivals contesting it. Most frags at 15 minutes wins. You start a game with `/3on3on3`.

## Activate

On a KTX server, type `/3on3on3` in the console. Players split across three teams (red, blue, green) and ready up (`ready`) to begin. A match tag can be appended for demo and QTV naming.

## Basic ruleset

Activating 3on3on3 applies a fixed preset:

- **`k_lockmax 3`** -- three teams (red, blue, green); the three-cornered game.
- **`deathmatch 1`** -- weapons vanish on pickup and respawn on a timer; map control is the game.
- **`teamplay 2` / `k_mode 2`** -- team mode; friendly fire on within your team.
- **`maxclients 9`** -- three teams of three.
- **`k_pow 1`** -- powerups live.
- **`timelimit 15`**, with **`k_overtime 1` / `k_exttime 5`** -- 15-minute matches; a draw goes to a 5-minute overtime.
- **`k_membercount 2`** -- two ready players per team to start.

## How it plays

Three teams, not two, so the three-cornered logic applies -- balance two opponents at once, the leader draws both teams' fire, and a smart team lets the other two wear each other down. With three a side there is room to press one enemy while watching the other. Weapons vanish on pickup, so map and item control decide it, now contested three ways.

## Maps

No dedicated map pool -- a rarely-played format; when it runs it needs maps with room for three teams of three.

## Hosting & settings

On a stock KTX or nquake server 3on3on3 is available by default -- the allow-list (`k_allowed_free_modes`) defaults to `4095`, every mode. For a 3on3on3-only server:

```
set k_defmode 3on3on3          // boot into 3on3on3
set k_allowed_free_modes 512   // allow nothing else  (default 4095 = all modes)
```

See *server-setup* for the bitmask details.

## See also

- `2on2on2`, `4on4on4` -- the same three-cornered game at other rosters.
- `3on3` -- the two-team version of this roster, fought straight up.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values.
