---
title: "Wipeout"
summary: "Clan Arena with respawns: players spawn with a full loadout, no items on the map, and a round is won when the whole enemy team is dead at the same time -- but each death makes your next respawn slower, up to 30 seconds, so a round gets harder to survive the longer it runs. First to a majority of rounds wins the series."
slug: wipeout
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

canonical_id: ktx:game_mode:wipeout
gameplay_source_id: ktx
source_ref: commands.c:4551
mode_default_init_array: wipeout_um_init
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

Wipeout is Clan Arena with respawns: players spawn with a full loadout, no items on the map, and a round is won when the whole enemy team is dead at the same time -- but each death makes your next respawn slower, up to 30 seconds, so a round gets harder to survive the longer it runs. Dusty added it to KTX in 1.41 as the QuakeWorld take on Diabotical's Wipeout. You start a game with `/wipeout`.

## Activate

On a KTX server, type `/wipeout` in the console -- here the command matches the mode name (unlike Clan Arena, whose command is `/carena`). Both teams ready up, and the first round begins once each side is ready. You can append a match tag for demo and QTV naming: `wipeout EQL`.

## Basic ruleset

Wipeout runs Clan Arena's arena preset with two changes:

- **`k_clan_arena 2`** -- selects Wipeout (Clan Arena is `1`); the one discriminator between the two arena modes.
- **`k_clan_arena_max_respawns 4`** -- four respawns per player per round, where Clan Arena allows `0` (out on first death).

The shared base is unchanged: `deathmatch 5`, no map items (`k_noitems 1`), damage-based scoring (`k_dmgfrags 1`), `teamplay 4` with no friendly fire or self-damage, up to four players a side, no powerups or clock, best of nine rounds (`k_clan_arena_rounds 9`). See *ca* for that preset in full.

## How it plays

Wipeout shares Clan Arena's foundation -- full-spawn loadout, no items on the map, no self-damage, damage-based scoring (see *ca* for those). What makes it its own mode is the respawn budget.

Instead of one life per round, each player can respawn up to four times -- but the delay grows with every death. On a full 4v4 the ladder is 5, 10, 20, then 30 seconds; smaller teams come back faster (3v3: 4 / 8 / 16 / 24; 2v2: 3 / 6 / 12 / 18), and a player alone on their team gets one free instant respawn on their first death. A suicide skips the budget -- `/kill` forfeits your remaining respawns.

A round is won when an entire team is dead at the same time -- and a teammate waiting on a respawn timer counts as dead, not coming. Early deaths are cheap: you respawn fast, and it is unlikely your whole team is down at once. But the more a team dies, the longer those respawns take, until its last player alive is outnumbered and hunted down for the round-ending wipe. There is no time limit.

## Maps

Wipeout plays on compact arena maps sized to the roster -- a map that suits 2v2 is usually too sparse for 4v4 and vice versa. The map pool is gathered on the community's `maphub_v2` hub; the QuakeWorld wiki grades the same maps by team size:

- **2v2:** `naked6` (a trimmed CMT3), `qtdm3`, `shifter`, `rwild`, `Halo`
- **3v3:** `rwild`, `bloodwalk` / `aerorun`, `katla`, `Schloss`, `vaporize_beta103`, `a2`, `ht_almostlost`
- **4v4:** `bloodwalk` / `aerorun`, `katla`, `Schloss`, `dm3`, `Stroggopolis`, `CMT3`, `CMT4`, `Dust2`
- **Any size:** `q3dm6qw`

## History

Wipeout was created by Dusty and added to KTX in version 1.41 -- the QuakeWorld adaptation of the Wipeout mode from Diabotical, reworking Clan Arena's single-life round into a respawn-budget format. It is the newer of KTX's two arena modes.

## Hosting & settings

On a stock KTX or nquake server Wipeout is available by default -- `k_allowed_free_modes` defaults to `4095`, every mode. For a Wipeout-only server:

```
set k_defmode wipeout
set k_allowed_free_modes 8    // allow nothing else  (default 4095 = all modes)
```

Bit `8` is the `UM_4ON4` bit, shared with `4on4` and `ca`, so restricting to it allows those two as well. See *server-setup* for the bitmask details.

The two knobs an admin tunes are the respawn budget -- **`k_clan_arena_max_respawns`** (default `4`; how forgiving a round is) -- and the series length -- **`k_clan_arena_rounds`** (default `9`, clamped odd, range 3-101). Set them in the per-usermode config (`configs/usermodes/wipeout/*.cfg`), which execs after the preset.

## See also

- `ca` -- standard Clan Arena: the same arena with a single life per round (`k_clan_arena 1`) instead of Wipeout's respawn budget. The shared loadout, no-items, and no-self-damage rules are documented there.
- `4on4` -- shares wipeout's `UM_4ON4` bit on the server (enabled and restricted together), but plays as a normal item-pickup team game.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including why the arena modes run `deathmatch 5`.
