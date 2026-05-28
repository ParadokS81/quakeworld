---
title: "Clan Arena"
summary: "Round-based team elimination -- every player spawns each round with the full arsenal and red armor, there are no items on the map, and a round ends when one team is wiped out. First team to a majority of rounds takes the series."
slug: ca
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

canonical_id: ktx:game_mode:ca
gameplay_source_id: ktx
source_ref: commands.c:4552
mode_default_init_array: carena_um_init
activation_summary: "Type /carena on a KTX server -- the console command is carena, not ca (there is no /ca command). Clan Arena rides on the UM_4ON4 bit (value 8, shared with 4on4 and wipeout), which standard servers enable by default. Pre-match only."
wiki_status: hybrid
wiki_page_slug: Clan_Arena
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:carena
  - ktx:cvar:k_clan_arena
  - ktx:cvar:k_clan_arena_rounds
  - ktx:cvar:k_clan_arena_max_respawns
  - ktx:cvar:k_noitems
  - ktx:cvar:k_dmgfrags
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: wipeout, relation: similar-shape}
---

## Summary

Clan Arena (`ca`) is QuakeWorld's round-based team-elimination mode. Every player spawns each round with the full weapon arsenal, full health, and red armor, and there are no items on the map -- so the game is pure aim and teamwork, with none of the item timing or map control that defines a normal team game. A round ends the moment one team is completely eliminated; there are no respawns within a round. The first team to win a majority of the rounds -- 5 of 9 by default -- takes the series.

## How it plays

Two teams of up to four players each (`maxclients 8`). Every round, every player spawns identical and fully loaded: 100 health, 200 red armor (80% absorption), all eight weapons, near-full ammo (200 nails, 100 shells, 50 rockets, 150 cells, 6 grenades), with the rocket launcher up. Then `k_noitems` strips the map -- no weapons, ammo, armor, health, or powerups to pick up anywhere. What you spawn with is all you get.

When you die you are out for the round: `k_clan_arena_max_respawns 0` means no respawns. You drop into a spectating ghost (you can follow a living teammate's view) and wait for the round to end. The round ends when every player on one team has been eliminated, and the surviving team scores it. The default series is nine rounds (`k_clan_arena_rounds 9`), so the first team to five wins; there is no time limit, a round simply runs until one side is wiped.

Because nobody picks anything up and nobody respawns, Clan Arena is decided by aim, positioning, and team coordination rather than by controlling the red armor and the quad -- the opposite emphasis from 4on4. Scoring is damage-based (`k_dmgfrags 1`): a player earns a frag for every 100 points of damage dealt, so the scoreboard reflects who did the work within a round even though the round itself is won by elimination, not frag count.

Clan Arena also switches off self-damage. Your own rocket and grenade splash still launches you -- the knockback is applied in full -- but it deals no health or armor damage at all, and the same holds for splash that catches a teammate. Fall damage and drowning are off too. The result is fast, aggressive movement: players rocket-jump around the map and drop from heights freely, with no health cost for an aggressive push or a quick reposition. (Mechanically this is the `teamplay 4` no-friendly-fire rule, which Clan Arena extends to a player's own splash.)

## Starting a game

On a KTX server, type `/carena` in the console, before a match has started. The command is `carena`, not `ca` -- there is no `/ca` command. Don't confuse it with `/arena` either: that toggles the separate Rocket Arena (a 1on1 winner-stays duel), not Clan Arena. The server applies the Clan Arena preset; teams then ready up and the first round begins once both sides are ready.

`carena` shares its activation bit with `4on4` and `wipeout` (`UM_4ON4`), so any server that allows one of the three allows all three.

## History

Clan Arena predates its inclusion in KTX. The community long played it on dedicated servers running a standalone Clan Arena modification -- the best known being Clan Arena Champion Edition (Plus) -- and for years joining such a server was the recommended way to play. KTX folded Clan Arena in as one of its built-in usermodes (the `carena` command) so any KTX server can host it without a separate mod, alongside its respawn-based variant, wipeout.

## Hosting & settings

On a standard KTX or nquake server, Clan Arena is available out of the box: `k_allowed_free_modes` defaults to `4095` (every standard mode), and Clan Arena rides on the `UM_4ON4` bit (value `8`, shared with 4on4 and wipeout). You only set the bitmask explicitly to *restrict* a server to a subset of modes -- any mask that includes 8 keeps Clan Arena available:

```
# server.cfg -- the standard default; the 8 bit covers 4on4 / ca / wipeout
set k_allowed_free_modes 4095
```

The Clan Arena ruleset itself is applied by the `/carena` command. The settings that define it:

- **`k_clan_arena 1`** -- selects Clan Arena. This is the discriminator from its sibling: value `2` selects wipeout instead.
- **`k_clan_arena_max_respawns 0`** -- no respawns; a player is eliminated on first death. (Wipeout sets this above zero for limited respawns.)
- **`k_clan_arena_rounds 9`** -- rounds per series; the first team to a majority wins. KTX clamps the value to 3-101 and forces it odd.
- **`k_noitems 1`** -- removes all weapon, ammo, health, armor, and powerup pickups from the map.
- **`k_dmgfrags 1`** -- damage-based scoring: one frag per 100 damage dealt, rather than one per kill.
- **`deathmatch 5`** -- the server deathmatch value KTX uses for both arena modes (see `deathmatch-modes`).

There is no time limit, no overtime, and no powerups -- a round ends only by elimination.

## See also

- `wipeout` -- the respawn-based arena variant (`k_clan_arena 2`): the same full-spawn, no-items arena, but each player gets a limited number of respawns per round on a growing delay, rather than being out on the first death.
- `4on4` -- shares ca's activation bit (`UM_4ON4`) on the server, but plays as its opposite: item pickups and map control instead of equal full-spawns.
- `deathmatch-modes` (pending) -- reference on the `deathmatch` flag values, including why the arena modes run `deathmatch 5`.
