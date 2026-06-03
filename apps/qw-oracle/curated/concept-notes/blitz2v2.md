---
title: "Blitz (2v2)"
summary: "The two-team version of hoonymode: the same spawn-rotation format, but played 2v2 over four timed rounds instead of as a single-frag duel. Friendly fire is on, powerups are live, and the team with the most total frags across the four rounds wins."
slug: blitz2v2
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: spawn-rotation
kind: standalone
deathmatch_flag: 3
roster: "2v2"
loadout: item-pickup
objective: most-frags-over-rounds
score_system: frags

canonical_id: ktx:game_mode:blitz2v2
gameplay_source_id: ktx
source_ref: commands.c:4545
mode_default_init_array: _2on2hm_um_init
wiki_status: l3-upstream
introduced_by: "meag"
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:blitz2v2
  - ktx:command:pickspawn
  - ktx:cvar:k_hoonymode
  - ktx:cvar:k_hoonyrounds
  - ktx:cvar:k_pow
  - ktx:cvar:k_mode
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: hoonymode, relation: similar-shape}
  - {slug: blitz4v4, relation: similar-shape}
---

## Summary

Blitz (2v2) is the two-team version of hoonymode. It keeps hoonymode's spawn-rotation format -- players pick their spawns, and the two sides swap spawns each round-pair so neither keeps a spawn advantage -- but plays it as a 2v2 team game over four timed rounds rather than as a single-frag duel. Friendly fire is on and powerups are live on the map, and the team with the most total frags across the four rounds takes the match. You start a game with `/blitz2v2`.

## Activate

Type `/blitz2v2` in the console on a KTX server. In warmup, players nominate spawns for their team with `/pickspawn` -- stand by the spawn you want and run the command, repeating it to cycle nearby spawns.

## Basic ruleset

Blitz (2v2) runs hoonymode's spawn-rotation logic as a team game. The preset that makes it one:

- **`k_hoonymode 1` + `teamplay 2` / `k_mode 2`** -- the spawn rotation, now with two teams and friendly fire on (the duel runs `teamplay 0`).
- **`timelimit 3` / `fraglimit 0`** -- three-minute timed rounds, instead of the duel's single-frag rounds.
- **`k_hoonyrounds 4`** -- four rounds (two spawn-pairs); frags accumulate across all four.
- **`deathmatch 3`** -- weapons stay on the floor.
- **`k_pow 1`** -- powerups (Quad, Pentagram, Ring) spawn on the map.
- **`maxclients 4`**, with `k_membercount 1` / `k_lockmin 1` / `k_lockmax 2` -- two teams of up to two.

## How it plays

Blitz takes hoonymode's spawn-rotation idea and turns it into a team game. The spawn machinery is the same: players nominate spawns in warmup, and the two sides swap spawns after each round-pair so both teams play each spawn the same number of times (see *hoonymode* for how the rotation works). What changes is everything around it.

Instead of a 1v1 duel, Blitz is 2v2 with friendly fire on and powerups live -- Quad, Pentagram, and Ring all spawn, so contesting them is part of the round. And instead of ending each round on the first frag, Blitz rounds are timed: each runs three minutes, and a series is four rounds (two spawn-pairs). Frags carry across all four rounds rather than resetting, so the match is decided on aggregate -- when the fourth round ends, the team with the higher total frag count wins; a level score goes to extra rounds until one team is ahead.

The result plays quite differently from the duel it grew out of: hoonymode is a tense one-frag race where a single spawn can decide a round, while Blitz is a rolling team deathmatch where the spawn rotation keeps the sides even and a team builds its lead over twelve minutes of play.

## History

Blitz began as meag's 2017 extension of hoonymode into team play, adding the 2v2 and 4v4 formats on the same spawn-rotation machinery. The team modes were originally labelled "hoonymode TDM" and renamed under the "Blitz" banner in 2020 (the same change retimed the Pentagram and Ring respawns).

## Hosting & settings

On a stock KTX or nquake server Blitz (2v2) is available by default -- `k_allowed_free_modes` defaults to `4095`, every mode. For a Blitz-only server:

```
set k_defmode blitz2v2
set k_allowed_free_modes 128    // allow nothing else  (default 4095 = all modes)
```

Bit `128` is the `UM_1ON1HM` bit, shared with `hoonymode` and `blitz4v4`, so restricting to it allows those two as well. See *server-setup* for the bitmask details.

The series length is the one knob an admin tunes -- **`k_hoonyrounds`** (default `4`). Maps authored as hoonymode-only (a `hoony_timelimit` or `hoony_defaultwinner` `.ent` field) apply their preset automatically at load, the same as for the duel.

## See also

- `hoonymode` -- the 1v1 duel Blitz extends; the spawn-rotation mechanic and `/pickspawn` are documented there. It shares Blitz's activation bit (`UM_1ON1HM`).
- `blitz4v4` -- the 4v4 version at a larger roster, on `deathmatch 1` (weapons vanish) instead of 2v2's `deathmatch 3`.
