---
title: "Hoonymode"
summary: "A duel format built to take spawn luck out of the result: every round ends on a single frag, and the two players swap spawns each round-pair so each plays both spawns equally. The series is tennis-style -- first to seven round-wins, but you must lead by two."
slug: hoonymode
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-02
scope: engine-scoped
engines_covered: [ktx]

experience_group: spawn-rotation
kind: standalone
deathmatch_flag: 3
roster: "1v1"
loadout: item-pickup
objective: win-round-majority
score_system: rounds-won

canonical_id: ktx:game_mode:hoonymode
gameplay_source_id: ktx
source_ref: commands.c:4544
mode_default_init_array: _1on1hm_um_init
wiki_status: hybrid
wiki_page_slug: Hoonymode
introduced_by: "Richard 'Hoony' Sandlant (concept, from CPMA); phil (QuakeWorld port)"
introduced_in_version: "KTX 1.37"
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:hoonymode
  - ktx:command:pickspawn
  - ktx:cvar:k_hoonymode
  - ktx:cvar:k_hoonyrounds
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_pow
related_modes:
  - {slug: blitz2v2, relation: similar-shape}
  - {slug: blitz4v4, relation: similar-shape}
---

## Summary

Hoonymode is a duel format designed to take spawn luck out of the result. Every round ends on a single frag, and after each pair of rounds the two players swap spawns, so over a series each player fights from both spawns equally rather than winning or losing on a lucky first spawn. The series is scored tennis-style: first to seven round-wins takes the match, but you must lead by two, and a 6-6 score over the default twelve rounds goes to deuce until someone pulls two clear. The concept came from CPMA; phil ported it to QuakeWorld in 2012. You start a game with `/hoonymode`.

## Activate

Type `/hoonymode` in the console on a KTX server (1.37 or later); both players ready up to start. In warmup, use `/pickspawn` to nominate your starting spawn -- stand on or beside the spawn you want and run the command, repeating it to cycle nearby spawns. If neither player picks one, the first-round spawns are random.

## Basic ruleset

Activating hoonymode applies the standard duel preset with a round-based twist:

- **`fraglimit 1`** -- every frag ends the round; the single most defining setting.
- **`k_hoonymode 1`** -- the round-and-spawn-rotation logic (the discriminator `blitz2v2` / `blitz4v4` also set, adding team handling).
- **`k_hoonyrounds 12`** -- the regulation series length, and with it the winning score of seven (see *How it plays*).
- **`deathmatch 3` / `teamplay 0` / `maxclients 2`** -- the standard duel skeleton, same as `/1on1`: weapons stay, no teams, two players.
- **`timelimit 0`** -- the duel form is frag-based, not timed.
- **`k_pow 0`** -- powerups off.

## How it plays

Hoonymode runs on the standard duel ruleset -- the same skeleton as `/1on1`, with the ordinary QuakeWorld duel spawn (100 health, shotgun and axe, no armour). What changes is the round structure: `fraglimit 1` means a round ends the instant either player scores. A short countdown, both players respawn, and the next round begins. Because a round is decided by the very first frag, hoonymode is a contest of spawns and the opening engagement rather than the item-timing game of a normal duel.

The spawn handling is the whole point. In warmup each player nominates a starting spawn with `/pickspawn`; from there the two spawns rotate in fixed pairs. The first round of a pair puts each player on their assigned spawn; the second swaps them, so each player gets a round on the spawn the opponent just had. The next pair re-assigns and swaps again, for the length of the series. The inter-round banner reads "New spawns" or "Switch spawns" so both players know which half of the pair they are in. No spawn advantage is ever one-sided -- both players face the same two spawns equally, which is exactly the spawn-frag luck the mode removes. For the same reason it doubles as a teaching tool: a clean way to drill the routes and timings off a specific spawn.

The series is scored like a tennis set, and the result is only ever checked at the end of a two-round spawn pair -- so the match is never decided mid-pair while one player holds the better spawn. Reaching six round-wins is "Set point" (the banner says so); the match is won at seven with a two-win lead. Because the score is read only at a spawn-pair boundary, the gap there is always even, which is what enforces the win-by-two. A dead-even 6-6 after the twelve regulation rounds goes to deuce, continuing a pair at a time until someone leads by two. A suicide ends the round and hands it to the opponent.

## History

The idea is credited in the source to Richard "Hoony" Sandlant, a developer on the Quake 3 mod CPMA; phil wrote the QuakeWorld port in March 2012 (the change-log inside the source reads like an implementation diary) and it merged into KTX on 2012-04-22. A public beta-test tournament followed on 2012-05-13, won by Milton over LocKtar, and KTX enabled the mode by default in 2014.

meag extended it later: in 2016 he made the round length and winning score configurable and reworked spawn selection; in 2017 he added the team variants (2v2 and 4v4) on the same machinery and tightened the endgame to today's win-by-two rule. The team variants were renamed under the "Blitz" label in 2020.

## Hosting & settings

On a stock KTX or nquake server hoonymode is available by default -- `k_allowed_free_modes` defaults to `4095`, every mode. For a hoonymode-only server:

```
set k_defmode hoonymode
set k_allowed_free_modes 128    // allow nothing else  (default 4095 = all modes)
```

Bit `128` is the `UM_1ON1HM` bit, shared with `blitz2v2` and `blitz4v4`, so restricting to it allows those two as well. See *server-setup* for the bitmask details. (KTX 1.37 or later is required.)

The one setting an admin tunes is the series length -- **`k_hoonyrounds`** (default `12`, which sets the winning score to seven). A map author can instead make a map default to hoonymode by setting a `hoony_timelimit` or `hoony_defaultwinner` field on `worldspawn` in the map's `.ent` file; the preset then auto-applies at load and mode changes are blocked for non-server callers.

## See also

- `blitz2v2`, `blitz4v4` -- the team variants of the same spawn-rotation family, on the same machinery and sharing its activation bit (`UM_1ON1HM`); they swap the single-frag duel rounds for timed team rounds.
- `1on1` -- the standard duel hoonymode is built on; it reuses the duel skeleton (`maxclients 2`, `teamplay 0`, `deathmatch 3`) but replaces the timed endgame with the tennis-style round series.
- `/pickspawn` -- the warmup command for nominating a starting spawn.
