---
title: "Clan Arena"
summary: "Round-based team elimination -- every player spawns each round with the full arsenal and red armor, there are no items on the map, and a round ends when one team is wiped out. First team to a majority of rounds takes the series."
slug: ca
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-02
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

Clan Arena is QuakeWorld's round-based team-elimination mode. Every player spawns each round with the full weapon arsenal and red armor, and there are no items on the map -- so the game is pure aim and teamwork, stripped of the item timing and map control that decide a normal team game. A round ends the instant one team is completely eliminated; there are no respawns. The first team to win a majority of the rounds -- five of nine by default -- takes the series. You start a game with `/carena`.

## Activate

On a KTX server, type `/carena` in the console -- the command is `carena`, not `ca`, and `/ca` does nothing. (Don't confuse it with `/arena`, which starts the unrelated Rocket Arena duel.) Both teams ready up, and the first round begins once each side is ready. You can append a match tag for demo and QTV naming: `carena EQL`.

## Basic ruleset

Activating Clan Arena applies a fixed arena preset:

- **`deathmatch 5`** -- the arena deathmatch value KTX uses for both ca and wipeout (see *deathmatch-modes*).
- **`k_clan_arena 1`** -- selects Clan Arena. This is the discriminator from its sibling: `2` selects wipeout instead.
- **`k_clan_arena_max_respawns 0`** -- no respawns; a player is out for the round on first death.
- **`k_clan_arena_rounds 9`** -- best of nine, first team to five; tunable (see *Hosting & settings*).
- **`k_noitems 1`** -- no weapon, ammo, armor, health, or powerup pickups anywhere on the map.
- **`k_dmgfrags 1`** -- damage-based scoring: one frag per 100 points of damage dealt, not one per kill.
- **`teamplay 4` / `k_mode 2`** -- team mode with no friendly fire; in Clan Arena this extends to your own splash (see *How it plays*).
- **`maxclients 8`** -- up to four players a side.
- **`k_pow 0` / `timelimit 0`** -- no powerups, and no clock: a round ends only by elimination.

## How it plays

Two teams of up to four. Every round, every player spawns identical and fully loaded: 100 health, 200 red armor (80% absorption), all eight weapons, near-full ammo -- 200 nails, 100 shells, 50 rockets, 150 cells, 6 grenades -- with the rocket launcher up. Then `k_noitems` strips the map bare: there is nothing to pick up, anywhere. What you spawn with is all you get.

When you die you are out for the round -- `k_clan_arena_max_respawns 0` means no second chance. You drop into a spectating ghost, free to follow a living teammate's view, and wait for the round to resolve. The round ends the moment every player on one team has been eliminated, and the surviving team scores it. The default series runs to nine rounds, so the first team to five wins; there is no clock, a round simply runs until one side is wiped.

Because nobody picks anything up and nobody respawns, Clan Arena is decided by aim, positioning, and team coordination -- not by controlling the red armor and the Quad, the opposite emphasis from 4on4. Scoring is damage-based (`k_dmgfrags 1`): a player earns a frag for every 100 points of damage dealt, so the scoreboard reflects who did the work inside a round even though the round itself is won by elimination, not by frag count.

Clan Arena has no self-damage, which allows for a ton of rocket-jumping and very fast-paced gameplay; fall and drowning damage are off too.

## Maps

Clan Arena has no fixed competitive map pool; it runs on the standard deathmatch maps, with **`dm3`** the staple and best-known Clan Arena map.

## History

Clan Arena predates its inclusion in KTX. The community long played it on dedicated servers running a standalone Clan Arena modification -- the best known being Clan Arena Champion Edition Plus (CACE) by R2 -- and for years joining such a server was the recommended way to play. KTX folded Clan Arena in as one of its built-in usermodes (the `carena` command) so any KTX server can host it without a separate mod, alongside its respawn-based variant, wipeout.

## Hosting & settings

On a stock KTX or nquake server Clan Arena is available by default -- the allow-list (`k_allowed_free_modes`) defaults to `4095`, every mode. For a Clan-Arena-only server:

```
set k_defmode ca
set k_allowed_free_modes 8    // allow nothing else  (default 4095 = all modes)
```

Bit `8` is the `UM_4ON4` bit, shared with `4on4` and `wipeout`, so restricting to it allows those two as well. See *server-setup* for the bitmask details.

The one setting an admin commonly changes is the series length -- **`k_clan_arena_rounds`** (default `9`, clamped to an odd number in the range 3-101). Set it in the per-usermode config (`configs/usermodes/ca/*.cfg`), which execs after the preset, so a plain `server.cfg` value would be overwritten.

## See also

- `wipeout` -- the respawn-based arena variant (`k_clan_arena 2`): the same full-spawn, no-items arena, but each player gets a few respawns per round on a growing delay instead of being out on the first death.
- `4on4` -- shares ca's `UM_4ON4` bit on the server (enabled and restricted together), but plays as its opposite: item pickups and map control instead of equal full-spawns.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including why the arena modes run `deathmatch 5`.
