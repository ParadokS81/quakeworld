---
title: "Blitz (4v4)"
summary: "The 4v4 version of the hoony/blitz spawn-rotation format: the same pick-your-spawn, swap-sides-each-round structure as blitz2v2, but played four-a-side over four timed five-minute rounds and on deathmatch 1, so it carries 4on4's weapon-control economy. The team with the most total frags across the rounds wins."
slug: blitz4v4
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /blitz4v4 on a KTX server -- the command matches the slug. Blitz (4v4) rides on the UM_1ON1HM bit (value 128), shared with hoonymode and blitz2v2, which standard servers enable by default. Pre-match only."
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

Blitz (4v4) is the four-a-side version of the hoony/blitz spawn-rotation format. It runs the same structure as blitz2v2 -- players pick their spawns and the two sides swap spawns each round-pair so neither keeps a spawn advantage, with the match decided on total frags over four timed rounds -- but at a 4v4 roster and, crucially, on `deathmatch 1`. That weapons-vanish economy makes it play like 4on4 wearing the blitz round structure, rather than like the smaller, weapons-stay blitz2v2.

## How it plays

The spawn machinery is identical to the rest of the family: players nominate spawns in warmup, and the sides swap spawns after each round-pair so both teams play each spawn the same number of times. (See `hoonymode` for how the rotation works.) Friendly fire is on (`teamplay 2`), powerups are live (`k_pow 1`), and the series is four rounds long (`k_hoonyrounds 4`); frags carry across all four rounds, so the team with the higher aggregate frag count at the end takes the match, with a tie going to overtime.

What sets Blitz (4v4) apart from blitz2v2 is the scale and the economy. The rounds are longer -- five minutes each (`timelimit 5`) rather than three -- so a series runs about twenty minutes. And because four-a-side crosses the weapons line, it runs `deathmatch 1`: picked-up weapons vanish, so map and item control matter the way they do in 4on4, where blitz2v2's `deathmatch 3` keeps weapons on the floor. Blitz (4v4) is, in effect, the closest thing the family has to a 4on4 played on rotating spawns.

## Starting a game

Type `/blitz4v4` in the console on a KTX server. In warmup, players nominate spawns for their team with `/pickspawn` -- stand by the spawn you want and run the command; repeat it to cycle through nearby spawns. Each team needs three ready players before the match begins (`k_membercount 3`).

## History

Blitz (4v4) is one of meag's 2017 team extensions of hoonymode, added alongside blitz2v2 on the same spawn-rotation machinery. The team modes were originally labelled "hoonymode TDM" and renamed under the "Blitz" banner in 2020.

## Hosting & settings

On a standard KTX or nquake server, Blitz (4v4) is available out of the box: `k_allowed_free_modes` defaults to `4095`, and it rides on the `UM_1ON1HM` bit (value `128`, shared with hoonymode and blitz2v2). Set the bitmask explicitly only to *restrict* a server to a subset of modes:

```
# server.cfg -- the standard default; the 128 bit covers hoonymode / blitz2v2 / blitz4v4
set k_allowed_free_modes 4095
```

The ruleset is applied by the `/blitz4v4` command. The settings that define it:

- **`k_hoonymode 1`** -- selects the spawn-rotation logic; with a team roster the engine runs its team-round handling.
- **`k_hoonyrounds 4`** -- the series length: four rounds, two full spawn-pairs.
- **`timelimit 5` / `fraglimit 0`** -- five-minute timed rounds, no frag-based round end. **`k_overtime 1` / `k_exttime 5`** break a tie.
- **`deathmatch 1`** -- weapons vanish on pickup; the 4on4 economy, and the main difference from blitz2v2's `deathmatch 3`.
- **`teamplay 2`** -- two teams with friendly fire on. **`k_pow 1`** -- powerups spawn.
- **`maxclients 8`**, with `k_membercount 3` / `k_lockmin 1` / `k_lockmax 2` -- exactly two teams of up to four.

Maps authored as hoonymode-only apply their preset automatically at load, the same as for the rest of the family.

## See also

- `blitz2v2` -- the 2v2 version: the same spawn-rotation round structure, but smaller and on `deathmatch 3` (weapons stay). They share the `UM_1ON1HM` bit.
- `hoonymode` -- the 1v1 duel the format grew from; the spawn-rotation mechanic and `/pickspawn` are documented there.
