---
title: "Wipeout"
summary: "Clan Arena with a respawn budget -- the same full-spawn, no-items team arena, but each player gets a few respawns per round on a delay that grows with every death (up to 30 seconds). Last team standing wins the round; first to a majority of rounds wins the series."
slug: wipeout
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: arena
kind: standalone
deathmatch_flag: 5
roster: "up to 4v4 (8-player cap)"
loadout: full-spawn
objective: eliminate-all-enemies
score_system: rounds-won

canonical_id: ktx:game_mode:wipeout
gameplay_source_id: ktx
source_ref: commands.c:4551
mode_default_init_array: wipeout_um_init
activation_summary: "Type /wipeout on a KTX server whose k_allowed_free_modes includes the UM_4ON4 bit (value 8, shared with 4on4 and ca), which standard servers enable by default. Pre-match only; any player or admin spectator."
wiki_status: wiki-upstream
wiki_page_slug: Wipeout
introduced_by: Dusty
introduced_in_version: "KTX 1.41"
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:wipeout
  - ktx:cvar:k_clan_arena
  - ktx:cvar:k_clan_arena_max_respawns
  - ktx:cvar:k_clan_arena_rounds
  - ktx:cvar:k_noitems
  - ktx:cvar:k_dmgfrags
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: ca, relation: similar-shape}
---

## Summary

Wipeout is Clan Arena with a respawn budget. It is the same round-based team arena -- full weapon loadout on spawn, no items on the map, last team standing wins the round -- but instead of being out on your first death, each player gets a few respawns per round (four by default). The catch is that every death makes your next respawn slower, up to 30 seconds, so repeated deaths snowball against your team. Dusty added it to KTX in 1.41 as the QuakeWorld take on Diabotical's Wipeout. First team to a majority of the rounds wins the series.

## How it plays

Wipeout shares Clan Arena's foundation: every player spawns each round with the full arsenal, 100 health and red armor, no items on the map, no self-damage (rocket-jump freely), and damage-based scoring. See `ca` for those shared mechanics. What makes Wipeout its own mode is the respawn budget.

Instead of one life per round, each player can respawn up to `k_clan_arena_max_respawns` times (4 by default), but the respawn delay grows with every death in the round. On a full 4v4 the ladder is 5, 10, 20, then 30 seconds; smaller teams come back faster (3v3: 4 / 8 / 16 / 24; 2v2: 3 / 6 / 12 / 18), and a player alone on their team gets one free instant respawn on their first death. Once the budget is spent you are out for the round, exactly as in Clan Arena -- and suiciding skips straight to that: a player who `/kill`s forfeits their remaining respawns for the round.

That growing delay is what gives Wipeout its texture. An early trade is cheap and recoverable; a player who keeps dying is off the map for longer and longer, so a team that wins fights even slightly tends to snowball the round as the enemy's respawn timers stack up. A round still ends only when an entire team is wiped out -- all players dead with no respawns left -- and there is no time limit. The default series is nine rounds (`k_clan_arena_rounds 9`), so the first team to five wins.

## Starting a game

On a KTX server, type `/wipeout` in the console, before a match has started. (Here the command matches the mode name -- unlike Clan Arena, whose command is `/carena`.) The server applies the Wipeout preset and teams ready up; the first round begins once both sides are ready.

`wipeout` shares its activation bit with `4on4` and `ca` (`UM_4ON4`), so any server that allows one of the three allows all three.

## Maps

Wipeout plays on compact arena maps, sized to the roster -- a map that is good at 2v2 is usually too sparse for 4v4, and vice versa, so the community keeps a tested-maps list graded by team size. Smaller, tighter maps suit 2v2 (`naked6` -- a trimmed CMT3 -- plus `qtdm3`, `shifter`, and `Halo`); 3v3 and 4v4 move to larger arenas (`rwild`, `katla`, `Schloss`, `bloodwalk` / `aerorun`, and Quake 3 ports such as `q3dm6qw`, with `dm3`, `CMT3`, `CMT4`, and `Dust2` common at 4v4).

## History

Wipeout was created by Dusty and added to KTX in version 1.41. It is the QuakeWorld adaptation of the Wipeout mode from Diabotical, reworking Clan Arena's single-life round into a respawn-budget format. It is the newer of KTX's two arena modes; Clan Arena is the older, single-life original.

## Hosting & settings

On a standard KTX or nquake server, Wipeout is available out of the box: `k_allowed_free_modes` defaults to `4095` (every standard mode), and Wipeout rides on the `UM_4ON4` bit (value `8`, shared with 4on4 and ca). You only set the bitmask explicitly to restrict a server to a subset of modes; any mask that includes 8 keeps Wipeout available:

```
# server.cfg -- the standard default; the 8 bit covers 4on4 / ca / wipeout
set k_allowed_free_modes 4095
```

The Wipeout ruleset is applied by the `/wipeout` command. The settings that set it apart from Clan Arena:

- **`k_clan_arena 2`** -- selects Wipeout (value `1` is standard Clan Arena). This is the one discriminator between the two arena modes.
- **`k_clan_arena_max_respawns 4`** -- respawns allowed per player per round (Clan Arena sets this to `0`). Raising or lowering it changes how forgiving a round is.
- **`k_clan_arena_rounds 9`** -- rounds per series; the first team to a majority wins. KTX clamps the value to 3-101 and forces it odd.

Everything else matches Clan Arena: `deathmatch 5`, `k_noitems 1`, `k_dmgfrags 1`, `teamplay 4`, no powerups, no time limit. See `ca` for the full shared rule set.

## See also

- `ca` -- standard Clan Arena: the same arena, but a single life per round (`k_clan_arena 1`, no respawns) instead of Wipeout's respawn budget. The shared loadout, no-items, and no-self-damage rules are documented there.
- `4on4` -- shares wipeout's activation bit (`UM_4ON4`) on the server, but plays as a normal item-pickup team game.
- `deathmatch-modes` (pending) -- reference on the `deathmatch` flag values, including why the arena modes run `deathmatch 5`.
