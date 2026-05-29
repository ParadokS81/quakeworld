---
title: "4on4on4"
summary: "Three-team deathmatch at four players a side -- red, blue and green, each against the other two. The largest of the three-cornered formats, on deathmatch 1, so it runs 4on4's full map-control economy split three ways. Most frags at the 20-minute mark wins."
slug: 4on4on4
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /4on4on4 on a KTX server whose k_allowed_free_modes includes the UM_4ON4ON4 bit (value 1024, its own bit). Pre-match only; three teams (red, blue, green) ready up."
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

4on4on4 is three-team deathmatch at four players a side: three teams -- red, blue and green -- fighting all at once, each against the other two. It is the largest of the three-cornered formats, on `deathmatch 1`, so it runs 4on4's full map-control economy with a third team added to the mix. The team holding the most frags after 20 minutes wins.

## How it plays

Three teams, not two (`k_lockmax 3` locks it to three), so the three-cornered dynamic that defines 2on2on2 and 3on3on3 applies at its largest here: you fight two enemies at once, the leading team draws fire from both others, and there is real value in letting the other two exhaust each other before committing. With four players a side each team has enough bodies to hold a position and pressure a second front at the same time, so the three-way map contest is at its most complex in this format.

The economy is 4on4's: `deathmatch 1`, weapons vanish on pickup and item control is the game -- only now three teams are competing for the same red armor, megahealth and quad, so no one team controls the map as cleanly as in a straight 4on4. Friendly fire is on within a team (`teamplay 2`), powerups are live (`k_pow 1`), and matches run 20 minutes with a 5-minute overtime.

## Starting a game

On a KTX server, type `/4on4on4` in the console -- a pre-match action. Players split across three teams (red, blue, green) and ready up; each team needs three ready players to start (`k_membercount 3`). A match tag can be appended for demo and QTV naming. The server has to allow the mode (see Hosting & settings).

## Hosting & settings

4on4on4 rides on the `UM_4ON4ON4` bit, value `1024` -- its own bit. On a stock KTX or nquake server `k_allowed_free_modes` defaults to `4095`, so it is available out of the box; set the mask explicitly only to *restrict* the server.

```
# server.cfg -- 4095 is the stock default and already allows 4on4on4 (the 1024 bit)
set k_allowed_free_modes 4095
```

The defining settings, applied by `/4on4on4`:

- **`k_lockmax 3`** -- three teams (red, blue, green); the three-cornered game.
- **`deathmatch 1`** -- weapons vanish on pickup, 4on4's map-control economy.
- **`k_mode 2` / `teamplay 2`** -- team mode, friendly fire on within a team.
- **`maxclients 12`** -- three teams of four.
- **`timelimit 20`** with **`k_overtime 1` / `k_exttime 5`**; **`k_pow 1`** -- powerups live.

## See also

- `2on2on2`, `3on3on3` -- the smaller three-team modes; the same dynamic at two and three players a side (2on2on2 is on `deathmatch 3`).
- `4on4` -- the two-team version of this roster: 4on4's map-control game fought straight up between two teams instead of three.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values.
