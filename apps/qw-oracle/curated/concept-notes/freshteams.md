---
title: "FreshTeams"
summary: "A dmm1 match-modifier that reshapes the weapon and ammo economy: weapons respawn faster (20 seconds instead of 30) while the ammo you gain from re-grabbing a weapon you already own, and from dropped backpacks, is capped. The effect is a higher-tempo team game with far less ammo stockpiling. Works only in deathmatch 1."
slug: freshteams
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:freshteams
gameplay_source_id: ktx
source_ref: world.c:894
activation_summary: "Set k_freshteams 1 in server.cfg (or toggle it with the fresh command during warmup; requires dmm1). Then start a dmm1 base mode -- FreshTeams layers on top."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:fresh
  - ktx:cvar:k_freshteams
  - ktx:cvar:k_freshteams_weapon_time
  - ktx:cvar:k_freshteams_limit_sweep_ammo
related_modes:
  - {slug: nosweep, relation: similar-shape}
  - {slug: killquad, relation: similar-shape}
---

## Summary

FreshTeams is a match-modifier for the `deathmatch 1` team modes that retunes how weapons and ammo flow. In a normal dmm1 game, weapons respawn on a 30-second timer, walking back over a weapon you already own tops up its ammo (a "sweep"), and dropped backpacks carry full ammo -- so a controlling team can stockpile. FreshTeams speeds the weapons up (a 20-second respawn) while capping the ammo you get from sweeping and from packs, keeping the game moving and the stacks lean. It only operates in dmm1; the server forces it off in any other deathmatch mode.

## How it plays

The base game is unchanged -- it is still 4on4 (or any dmm1 team mode) -- but the resource economy tilts toward tempo over hoarding. Two linked changes do the work. First, weapons come back faster: the FreshTeams weapon timer is 20 seconds rather than the standard 30, so a contested weapon spawn is never out of play for long. Second, the "sweep" is capped: re-grabbing a weapon you already hold, which normally refills its ammo, now grants only a small fixed amount (a swept nailgun gives 6 nails, not 30), and dropped backpacks are limited too. The combination means a team cannot bank a huge ammo lead from holding the map -- weapons stay available, but the ammo to abuse them does not pile up. The name captures the intent: the game stays "fresh" rather than settling into one team sitting on a stockpiled advantage.

FreshTeams carries a family of tuning cvars (and warmup sub-commands `freshpacks`, `freshguns`, `freshtime`) for the pack limits, the per-weapon sweep amounts, and the weapon timer, so an admin can dial the economy precisely.

## Starting a game

FreshTeams is enabled by an admin, not started as its own match. Set it on the server (see Hosting & settings), or toggle it in warmup with the `fresh` command -- which requires a dmm1 mode -- then start a dmm1 base mode such as 4on4 or 3on3. It layers on top; there is nothing extra for a player to do in-match.

## Hosting & settings

FreshTeams is a cvar toggle (not gated by `k_allowed_free_modes`), valid only in `deathmatch 1`:

```
# server.cfg (FreshTeams -- a dmm1 modifier toggle)
set k_freshteams 1
```

- **`k_freshteams`** (default `0`) -- the master toggle. The `fresh` warmup command flips it, and refuses outside dmm1; the server also auto-disables it if the mode is not dmm1.
- **`k_freshteams_weapon_time`** (default `20`) -- weapon respawn time under FreshTeams, down from the standard 30.
- **`k_freshteams_limit_sweep_ammo`** (default `1`) with the per-weapon `k_freshteams_sweep_*_ammo` set -- caps the ammo gained from sweeping an already-owned weapon (e.g. 6 nails for a nailgun).
- The `k_freshteams_limit_packs` / `k_freshteams_pack_*` family caps ammo carried in dropped backpacks. The warmup sub-commands `freshpacks`, `freshguns`, and `freshtime` adjust these groups.

## See also

- `nosweep` -- the simpler sibling for the same dmm1 concern: where FreshTeams *caps* the ammo from sweeping a weapon you own, NoSweep blocks the re-pickup outright. They target the same "sweeping" behavior from two directions and can both be set.
- `killquad`, `berzerk` -- other match-modifiers that layer on a base game.
