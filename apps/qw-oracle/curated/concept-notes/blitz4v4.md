---
title: "Blitz (4v4)"
summary: "The 4v4 version of the hoony/blitz spawn-rotation format: the same pick-your-spawn, swap-sides-each-round structure as blitz2v2, but played four-a-side over four timed five-minute rounds and on deathmatch 1, so it carries 4on4's weapon-control economy. The team with the most total frags across the rounds wins."
slug: blitz4v4
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: spawn-rotation
kind: standalone
deathmatch_flag: 1
roster: "4v4"
loadout: item-pickup
objective: most-frags-over-rounds
score_system: frags

canonical_id: ktx:game_mode:blitz4v4
gameplay_source_id: ktx
source_ref: commands.c:4546
mode_default_init_array: _4on4hm_um_init
wiki_status: l3-upstream
introduced_by: "meag"
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:blitz4v4
  - ktx:command:pickspawn
  - ktx:cvar:k_hoonymode
  - ktx:cvar:k_hoonyrounds
  - ktx:cvar:k_pow
  - ktx:cvar:k_mode
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: blitz2v2, relation: similar-shape}
  - {slug: hoonymode, relation: similar-shape}
---

## Summary

Blitz (4v4) is the four-a-side version of the hoony/blitz spawn-rotation format. It runs the same structure as blitz2v2 -- players pick their spawns and the two sides swap spawns each round-pair so neither keeps a spawn advantage, with the match decided on total frags over four timed rounds -- but at a 4v4 roster and, crucially, on `deathmatch 1`. That weapons-vanish economy makes it play like 4on4 wearing the blitz round structure, rather than like the smaller, weapons-stay blitz2v2. You start a game with `/blitz4v4`.

## Activate

Type `/blitz4v4` in the console on a KTX server. In warmup, players nominate spawns for their team with `/pickspawn` -- stand by the spawn you want and run the command, repeating to cycle nearby spawns. Each team needs three ready players before the match begins (`k_membercount 3`).

## Basic ruleset

Blitz (4v4) is blitz2v2 at a larger roster, with one economy change. Where it differs from the 2v2 form:

- **`deathmatch 1`** -- weapons vanish on pickup (the 4on4 economy); blitz2v2 runs `deathmatch 3` (weapons stay). The defining difference.
- **`timelimit 5`** -- five-minute rounds (vs three), so the four-round series runs about twenty minutes.
- **`maxclients 8`**, with `k_membercount 3` -- two teams of up to four, three ready players a side to start.
- **`k_overtime 1` / `k_exttime 5`** -- a tied series goes to timed overtime.

Everything else is the shared blitz preset: `k_hoonymode 1` + `teamplay 2` / `k_mode 2` (spawn rotation, two teams, friendly fire on), `fraglimit 0`, `k_hoonyrounds 4` (four rounds, two spawn-pairs, frags aggregated), and `k_pow 1` (powerups live). See *blitz2v2* for that preset.

## How it plays

The spawn machinery is identical to the rest of the family: players nominate spawns in warmup, and the sides swap spawns after each round-pair so both teams play each spawn the same number of times (see *hoonymode*). Friendly fire is on, powerups are live, and the four-round series is decided on aggregate frags, with a tie going to overtime.

What sets Blitz (4v4) apart from blitz2v2 is scale and economy. The rounds are longer -- five minutes each rather than three -- so a series runs about twenty minutes. And because four-a-side crosses the weapons line, it runs `deathmatch 1`: picked-up weapons vanish, so map and item control matter the way they do in 4on4, where blitz2v2's `deathmatch 3` keeps weapons on the floor. Blitz (4v4) is, in effect, the closest thing the family has to a 4on4 played on rotating spawns.

## History

Blitz (4v4) is one of meag's 2017 team extensions of hoonymode, added alongside blitz2v2 on the same spawn-rotation machinery. The team modes were originally labelled "hoonymode TDM" and renamed under the "Blitz" banner in 2020.

## Hosting & settings

On a stock KTX or nquake server Blitz (4v4) is available by default -- `k_allowed_free_modes` defaults to `4095`, every mode. For a Blitz-only server:

```
set k_defmode blitz4v4
set k_allowed_free_modes 128    // allow nothing else  (default 4095 = all modes)
```

Bit `128` is the `UM_1ON1HM` bit, shared with `hoonymode` and `blitz2v2`, so restricting to it allows those two as well. See *server-setup* for the bitmask details.

The series length is the one knob an admin tunes -- **`k_hoonyrounds`** (default `4`). Maps authored as hoonymode-only (a `hoony_timelimit` or `hoony_defaultwinner` `.ent` field) apply their preset automatically at load.

## See also

- `blitz2v2` -- the 2v2 version: the same spawn-rotation round structure, but smaller and on `deathmatch 3` (weapons stay). They share the `UM_1ON1HM` bit.
- `hoonymode` -- the 1v1 duel the format grew from; the spawn-rotation mechanic and `/pickspawn` are documented there.
- `4on4` -- the standard team format whose `deathmatch 1` weapon economy Blitz (4v4) borrows.
