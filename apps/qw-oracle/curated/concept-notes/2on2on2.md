---
title: "2on2on2"
summary: "Three-team deathmatch -- three teams of two (red, blue and green) fighting all at once, each against the other two. It keeps the small-format economy (deathmatch 3, weapons stay) but the three-cornered standoff is a different game from a normal 2on2: you balance against two enemies instead of one. The team with the most frags at the 10-minute mark wins."
slug: 2on2on2
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /2on2on2 on a KTX server whose k_allowed_free_modes includes the UM_2ON2ON2 bit (value 256, its own bit). Pre-match only; three teams (red, blue, green) ready up."
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

2on2on2 is three-team deathmatch at the smallest roster: three teams of two -- red, blue and green -- all in the same map at once, each fighting the other two. Mechanically it borrows the small-format economy (`deathmatch 3`, so weapons stay on the floor), but the three-cornered standoff makes it play unlike a normal 2on2: with two enemies instead of one, the game becomes about not drawing both teams' fire at once. The team holding the most frags at the 10-minute mark wins.

## How it plays

The defining feature is that there are **three** teams, not two (KTX locks the mode to three with `k_lockmax 3`). That turns a straight fight into a free-for-all between teams: at any moment you are weighing two opponents, informal and shifting alliances form against whoever is ahead, and the smart play is often to let the other two grind each other down and clean up the survivors. The team in the lead tends to get attention from both others, which keeps games swingy. Within your own pair, friendly fire is on (`teamplay 2`).

The economy is the small-format one: `deathmatch 3`, so weapons stay on the ground and the game is aim and item timing rather than weapon denial -- the same base as 2on2, just three-way. Powerups are live (`k_pow 1`), matches run 10 minutes, and a draw goes to a 3-minute overtime.

## Starting a game

On a KTX server, type `/2on2on2` in the console -- a pre-match action. Players split across three teams (red, blue, green) and ready up; each team needs one ready player to start (`k_membercount 1`). A match tag can be appended for demo and QTV naming. The server has to allow the mode (see Hosting & settings).

## Hosting & settings

2on2on2 rides on the `UM_2ON2ON2` bit, value `256` -- its own bit. On a stock KTX or nquake server `k_allowed_free_modes` defaults to `4095`, so it is available out of the box; set the mask explicitly only to *restrict* the server.

```
# server.cfg -- 4095 is the stock default and already allows 2on2on2 (the 256 bit)
set k_allowed_free_modes 4095
```

The defining settings, applied by `/2on2on2`:

- **`k_lockmax 3`** -- three teams (red, blue, green). This, with the usermode itself, is what makes it a three-cornered game rather than a 2on2.
- **`deathmatch 3`** -- weapons stay on pickup, the small-format economy.
- **`k_mode 2` / `teamplay 2`** -- team mode, friendly fire on within a team.
- **`maxclients 6`** -- three teams of two.
- **`timelimit 10`** with **`k_overtime 1` / `k_exttime 3`**; **`k_pow 1`** -- powerups live.

## See also

- `3on3on3`, `4on4on4` -- the larger three-team modes; same three-cornered dynamic at three and four players a side (and on `deathmatch 1`).
- `2on2` -- the two-team version of this roster: the same `deathmatch 3` economy, but a straight fight rather than a three-way standoff.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values.
