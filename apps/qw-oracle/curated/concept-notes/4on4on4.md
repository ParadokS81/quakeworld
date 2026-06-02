---
title: "4on4on4"
summary: "Three-team deathmatch at four a side -- the largest three-cornered format. Red, blue and green, each against the other two, on the weapon-control economy. Most frags at the 20-minute mark wins."
slug: 4on4on4
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-02
scope: engine-scoped
engines_covered: [ktx]

experience_group: standard-game
kind: standalone
deathmatch_flag: 1
roster: "4v4v4 (three teams of four)"
loadout: item-pickup
objective: frag-leader-at-timelimit

canonical_id: ktx:game_mode:4on4on4
gameplay_source_id: ktx
source_ref: commands.c:4549
mode_default_init_array: _4on4on4_um_init
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:4on4on4
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
  - ktx:cvar:k_lockmax
  - ktx:cvar:k_membercount
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: 2on2on2, relation: similar-shape}
  - {slug: 3on3on3, relation: similar-shape}
  - {slug: 4on4, relation: similar-shape}
---

## Summary

4on4on4 is three-team deathmatch at four a side -- the largest three-cornered format: red, blue and green, each against the other two. It runs the same weapon-control economy as the big team game with a third team added, so no one team holds the map cleanly. Most frags at 20 minutes wins. You start a game with `/4on4on4`.

## Activate

On a KTX server, type `/4on4on4` in the console. Players split across three teams (red, blue, green) and ready up (`ready`) to begin. A match tag can be appended for demo and QTV naming.

## Basic ruleset

Activating 4on4on4 applies a fixed preset:

- **`k_lockmax 3`** -- three teams (red, blue, green); the three-cornered game.
- **`deathmatch 1`** -- weapons vanish on pickup and respawn on a timer; map control is the game.
- **`teamplay 2` / `k_mode 2`** -- team mode; friendly fire on within your team.
- **`maxclients 12`** -- three teams of four.
- **`k_pow 1`** -- powerups live.
- **`timelimit 20`**, with **`k_overtime 1` / `k_exttime 5`** -- 20-minute matches; a draw goes to a 5-minute overtime.
- **`k_membercount 3`** -- three ready players per team to start.

## How it plays

Three teams of four -- the three-cornered dynamic at its largest: fight two enemies at once, the leader draws fire from both, and there is real value in letting the others exhaust each other first. Four a side gives each team the bodies to hold a position and pressure a second front. Weapons vanish on pickup, so map control is the game -- now three teams competing for the same red armour and Quad.

## Maps

No dedicated map pool -- a rarely-played format; when it runs it needs large maps that fit three teams of four.

## Hosting & settings

On a stock KTX or nquake server 4on4on4 is available by default -- the allow-list (`k_allowed_free_modes`) defaults to `4095`, every mode. For a 4on4on4-only server:

```
set k_defmode 4on4on4          // boot into 4on4on4
set k_allowed_free_modes 1024  // allow nothing else  (default 4095 = all modes)
```

See *server-setup* for the bitmask details.

## See also

- `2on2on2`, `3on3on3` -- the same three-cornered game at smaller rosters.
- `4on4` -- the two-team version of this roster, fought straight up.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values.
