---
title: "2on2on2"
summary: "Three-team deathmatch at the smallest roster -- three teams of two (red, blue, green) in one map, each fighting the other two. Weapons stay on the floor, so it is a fast aim-and-item game, but the three-cornered standoff is its own thing: balancing two enemies instead of one. Most frags at the 10-minute mark wins."
slug: 2on2on2
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-02
scope: engine-scoped
engines_covered: [ktx]

experience_group: standard-game
kind: standalone
deathmatch_flag: 3
roster: "2v2v2 (three teams of two)"
loadout: item-pickup
objective: frag-leader-at-timelimit

canonical_id: ktx:game_mode:2on2on2
gameplay_source_id: ktx
source_ref: commands.c:4547
mode_default_init_array: _2on2on2_um_init
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:2on2on2
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
  - ktx:cvar:k_lockmax
  - ktx:cvar:k_membercount
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: 3on3on3, relation: similar-shape}
  - {slug: 4on4on4, relation: similar-shape}
  - {slug: 2on2, relation: similar-shape}
---

## Summary

2on2on2 is three-team deathmatch at the smallest roster: three teams of two -- red, blue and green -- in one map at once, each fighting the other two. Weapons stay on the floor, so it is a fast aim-and-item game, but the three-cornered standoff is what makes it its own mode: with two enemies instead of one, the trick is not drawing both teams' fire at once. Most frags at the 10-minute mark wins. You start a game with `/2on2on2`.

## Activate

On a KTX server, type `/2on2on2` in the console. Players split across three teams (red, blue, green) and ready up (`ready`) to begin. A match tag can be appended for demo and QTV naming.

## Basic ruleset

Activating 2on2on2 applies a fixed preset:

- **`k_lockmax 3`** -- three teams (red, blue, green); the three-cornered game.
- **`deathmatch 3`** -- weapons stay on the floor (the fast aim-and-item economy).
- **`teamplay 2` / `k_mode 2`** -- team mode; friendly fire on within your pair.
- **`maxclients 6`** -- three teams of two.
- **`k_pow 1`** -- powerups live.
- **`timelimit 10`**, with **`k_overtime 1` / `k_exttime 3`** -- 10-minute matches; a draw goes to a 3-minute overtime.
- **`k_membercount 1`** -- one ready player per team to start.

## How it plays

Three teams, not two. With two opponents at once the game becomes who you fight and when -- informal, shifting alliances form against whoever is ahead, the leader draws fire from both other teams, and the smart play is often to let the other two grind each other down and clean up. Weapons stay on the floor, so inside that three-way contest it is an aim-and-item game. It is an occasional for-fun format rather than a competitive staple.

## Maps

No dedicated map pool -- 2on2on2 is played for fun now and then, on standard team maps with room for three teams to spread out.

## Hosting & settings

On a stock KTX or nquake server 2on2on2 is available by default -- the allow-list (`k_allowed_free_modes`) defaults to `4095`, every mode. For a 2on2on2-only server:

```
set k_defmode 2on2on2          // boot into 2on2on2
set k_allowed_free_modes 256   // allow nothing else  (default 4095 = all modes)
```

See *server-setup* for the bitmask details.

## See also

- `3on3on3`, `4on4on4` -- the same three-cornered game at larger rosters.
- `2on2` -- the two-team version of this roster, fought straight up.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values.
