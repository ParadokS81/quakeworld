---
title: "Hoonymode"
summary: "A duel format built to take spawn luck out of the result: every round ends on a single frag, and the two players swap spawns each round-pair so each plays both spawns equally. The series is tennis-style -- first to seven round-wins, but you must lead by two."
slug: hoonymode
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /hoonymode on a KTX server (1.37+) -- the command matches the slug. Hoonymode rides on the UM_1ON1HM bit (value 128), shared with blitz2v2 and blitz4v4, which standard servers enable by default. Pre-match only; maps authored as hoonymode-only (a hoony_timelimit or hoony_defaultwinner .ent field) auto-apply the preset at load."
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

Hoonymode is a duel format designed to take spawn luck out of the result. Every round ends on a single frag, and after each pair of rounds the two players swap spawns, so over a series each player fights from both spawns equally rather than winning or losing on a lucky first spawn. The series is scored tennis-style: first to seven round-wins takes the match, but you must lead by two, and a 6-6 score over the default twelve rounds goes to deuce until someone pulls two clear. The concept came from CPMA; phil ported it to QuakeWorld in 2012 and it has been a KTX preset ever since.

## How it plays

Hoonymode runs on the standard duel ruleset -- `maxclients 2`, `teamplay 0`, `deathmatch 3`, the same skeleton as `/1on1`, with the ordinary QuakeWorld duel spawn (100 health, no armour, shotgun and axe). What changes is the round structure. The fraglimit is `1`, so a round ends the instant either player scores: there is a short countdown, both players respawn, and the next round begins. Powerups are off (`k_pow 0`). Because a round is decided by the very first frag, hoonymode is a contest of spawns and the opening engagement rather than the item-timing game of a normal duel.

The spawn handling is the whole point of the mode. In warmup each player can nominate a starting spawn with `/pickspawn`; from there the two spawns rotate in fixed pairs. The first round of a pair puts each player on their assigned spawn; the second round swaps them, so each player gets a round on the spawn the opponent just had. The next pair re-assigns and swaps again, and so on for the length of the series. The inter-round banner announces "New spawns" or "Switch spawns" so both players know which half of the pair they are in. The effect is that no spawn advantage is ever one-sided -- both players face the same two spawns the same number of times, which is exactly the spawn-frag luck the mode is built to remove. For the same reason hoonymode doubles as a teaching tool: it is a clean way to drill the routes and timings off a specific spawn.

The series is resolved like a tennis set. Each round is worth one point, and the result is checked only at the end of a two-round spawn pair, so the match can never be decided while one player is sitting on the better spawn. A player wins by reaching seven round-wins with a two-point lead -- on the default twelve rounds seven is the majority, and you can clinch earlier than twelve rounds if you open a clear enough gap (7-3, say, ends at the next pair boundary). If the players are level at 6-6 after the twelve regulation rounds the series goes to deuce and continues two rounds at a time until one leads by two. When a player is one round from clinching, the banner reads "Set point". A suicide ends the round and hands it to the opponent.

## Starting a game

Type `/hoonymode` in the console on a KTX server (1.37 or later).

In warmup, use `/pickspawn` to nominate your starting spawn: stand on or beside the spawn point you want and run the command; repeat it to cycle through nearby spawns. If neither player nominates one, the round-one spawns are chosen at random from the map's spawn points.

Some maps are authored as hoonymode-only through their `.ent` file (a `hoony_timelimit` or `hoony_defaultwinner` field on the world). On those maps the hoonymode preset is applied automatically at map load, and other mode-change commands are refused for ordinary players.

## History

The idea is credited in the source to Richard "Hoony" Sandlant, a developer on the Quake 3 mod CPMA, and the implementation header thanks the QuakeWorld developers who helped port and test it. phil wrote the QuakeWorld port over March 2012 -- the change-log inside the source reads like an implementation diary -- and it was merged into KTX on 2012-04-22. A public beta-test tournament followed on 2012-05-13, organised by phil and won by Milton over LocKtar. KTX enabled the mode by default in 2014.

meag extended it in two later waves. In 2016 he made the round length and winning score configurable and reworked the spawn-selection system. In 2017 he added the team-based variants (2v2 and 4v4) on top of the same hoonymode machinery, and tightened the endgame so a bare one-frag lead no longer ends the series -- the source of today's win-by-two rule. The team variants were later renamed under the "Blitz" label in 2020.

## Hosting & settings

On a standard KTX or nquake server, hoonymode is available out of the box: `k_allowed_free_modes` defaults to `4095` (every standard mode), and hoonymode rides on the `UM_1ON1HM` bit (value `128`, shared with blitz2v2 and blitz4v4). You set the bitmask explicitly only to *restrict* a server to a subset of modes; any mask that includes 128 keeps hoonymode available:

```
# server.cfg -- the standard default; the 128 bit covers hoonymode / blitz2v2 / blitz4v4
set k_allowed_free_modes 4095
```

The ruleset is applied by the `/hoonymode` command. The settings that define it:

- **`k_hoonymode 1`** -- selects the hoonymode round logic (the discriminator the whole mode keys on; `blitz2v2` / `blitz4v4` set it too and add team handling on top).
- **`k_hoonyrounds 12`** -- the series length, and with it the winning score (seven on twelve). Adjustable per server; map authors can also override it.
- **`fraglimit 1`** -- every frag ends the round. The single most defining setting.
- **`timelimit 0`** -- the duel form is frag-based, not timed.
- **`deathmatch 3`** -- the standard duel ruleset (weapons stay), the same as `/1on1`.
- **`k_pow 0`** -- no powerups.

Map authors who want a map to default to hoonymode set a `hoony_timelimit` or `hoony_defaultwinner` field on `worldspawn` in the map's `.ent` file; the preset then auto-applies at load and other mode changes are blocked for non-server callers. KTX 1.37 or later is required.

## See also

- `blitz2v2`, `blitz4v4` -- the team variants of the same spawn-rotation family, built on the same hoonymode machinery and sharing its activation bit (`UM_1ON1HM`). They swap the single-frag duel rounds for timed team rounds.
- `1on1` -- the standard duel. Hoonymode is essentially `/1on1` with single-frag rounds and spawn rotation: it reuses the duel skeleton (`maxclients 2`, `teamplay 0`, `deathmatch 3`) but replaces the timelimit-and-fraglimit endgame with the tennis-style round series.
- `/pickspawn` -- the warmup command for nominating a starting spawn.
