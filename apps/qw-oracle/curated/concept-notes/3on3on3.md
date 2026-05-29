---
title: "3on3on3"
summary: "Three-team deathmatch at three players a side -- red, blue and green, each against the other two. Same three-cornered standoff as 2on2on2, but on deathmatch 1, so it carries 3on3's weapon-control economy: map and item control matter, now split three ways. Most frags at the 15-minute mark wins."
slug: 3on3on3
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /3on3on3 on a KTX server whose k_allowed_free_modes includes the UM_3ON3ON3 bit (value 512, its own bit). Pre-match only; three teams (red, blue, green) ready up."
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

3on3on3 is three-team deathmatch at three players a side: three teams -- red, blue and green -- fighting all at once, each against the other two. It is the same three-cornered standoff as 2on2on2 but a roster up and on `deathmatch 1`, so it carries 3on3's weapon-control economy rather than the small-format one. The team with the most frags after 15 minutes wins.

## How it plays

Three teams, not two (`k_lockmax 3` locks it to three), so the three-cornered logic of 2on2on2 applies here too: you balance against two opponents at once, the leader draws fire from both other teams, and a smart team lets the other two wear each other down. With three players a side there is more room for a team to split duties -- press one enemy while watching the other -- than in the 2v2v2 version.

The economy is 3on3's: `deathmatch 1`, so picked-up weapons vanish and map control is the game, now contested three ways instead of two, which makes holding a region and its item timers harder than in a normal 3on3. Friendly fire is on within a team (`teamplay 2`), powerups are live (`k_pow 1`), and matches run 15 minutes with a 5-minute overtime.

## Starting a game

On a KTX server, type `/3on3on3` in the console -- a pre-match action. Players split across three teams (red, blue, green) and ready up; each team needs two ready players to start (`k_membercount 2`). A match tag can be appended for demo and QTV naming. The server has to allow the mode (see Hosting & settings).

## Hosting & settings

3on3on3 rides on the `UM_3ON3ON3` bit, value `512` -- its own bit. On a stock KTX or nquake server `k_allowed_free_modes` defaults to `4095`, so it is available out of the box; set the mask explicitly only to *restrict* the server.

```
# server.cfg -- 4095 is the stock default and already allows 3on3on3 (the 512 bit)
set k_allowed_free_modes 4095
```

The defining settings, applied by `/3on3on3`:

- **`k_lockmax 3`** -- three teams (red, blue, green); the three-cornered game.
- **`deathmatch 1`** -- weapons vanish on pickup, 3on3's map-control economy.
- **`k_mode 2` / `teamplay 2`** -- team mode, friendly fire on within a team.
- **`maxclients 9`** -- three teams of three.
- **`timelimit 15`** with **`k_overtime 1` / `k_exttime 5`**; **`k_pow 1`** -- powerups live.

## See also

- `2on2on2`, `4on4on4` -- the other three-team modes; the same dynamic at two and four players a side.
- `3on3` -- the two-team version of this roster: the same `deathmatch 1` map-control game, fought straight up between two teams instead of three.
- `deathmatch-modes` (pending) -- reference note on the `deathmatch` flag values.
