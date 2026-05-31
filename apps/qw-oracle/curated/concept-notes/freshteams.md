---
title: "FreshTeams"
summary: "A dmm1 match-modifier that retunes the weapon and ammo economy: weapons respawn faster (20 seconds instead of 30) while the ammo from re-grabbing a weapon you already own, and from dropped backpacks, is capped -- a higher-tempo team game with far less stockpiling. Works only in deathmatch 1; layers on any dmm1 base mode."
slug: freshteams
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-31
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:freshteams
gameplay_source_id: ktx
source_ref: world.c:894
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:fresh
  - ktx:command:freshpacks
  - ktx:command:freshguns
  - ktx:command:freshtime
  - ktx:cvar:k_freshteams
  - ktx:cvar:k_freshteams_weapon_time
  - ktx:cvar:k_freshteams_limit_sweep_ammo
  - ktx:cvar:k_freshteams_limit_packs
related_modes:
  - {slug: nosweep, relation: similar-shape}
---

## Summary

FreshTeams is a match-modifier for the `deathmatch 1` team modes that retunes how weapons and ammo flow. In a normal dmm1 game weapons respawn on a 30-second timer, walking back over a weapon you already own tops up its ammo (a "sweep"), and dropped backpacks carry full ammo -- so a team that controls the map can stockpile. FreshTeams speeds the weapons up to a 20-second respawn while capping the ammo you get from sweeping and from packs, keeping the game moving and the stacks lean. It works only in dmm1 and layers on any dmm1 base mode. You arm it with `/fresh`.

## Activate

FreshTeams is a toggle, and it requires a `deathmatch 1` base mode -- 4on4, 3on3, or the larger team rosters. Get into one of those first, then type `/fresh` in the console during warmup to arm it (run it again to disarm). It is refused outside dmm1 (and the server auto-disables it if you switch to a non-dmm1 mode), and like any rules change it only takes during warmup. Any player can do it.

## Basic ruleset

FreshTeams inherits the dmm1 base mode unchanged and retunes only the weapon and ammo economy:

- **Faster weapons.** Weapon spawns return every 20 seconds instead of the standard 30, so a contested weapon is never out of play for long.
- **Capped sweep ammo.** Re-grabbing a weapon you already hold gives only a small fixed top-up instead of a full load -- a swept nailgun yields 6 nails, not 30.
- **Capped backpacks.** Dropped packs carry limited ammo rather than a full reserve.

## Settings to tune

FreshTeams exposes the whole economy as dials, each with a warmup sub-command that toggles its group:

- **`k_freshteams_weapon_time`** (default `20`) -- weapon respawn time under FreshTeams. `freshtime` toggles it.
- **`k_freshteams_limit_sweep_ammo`** (default `1`) with the per-weapon `k_freshteams_sweep_*_ammo` set (nailgun `6`, LG `3`, most others `1`) -- how much ammo a sweep grants. `freshguns` toggles it.
- **`k_freshteams_limit_packs`** (default `1`) with `k_freshteams_pack_shells` / `_nails` / `_rockets` / `_cells` (`20` / `30` / `5` / `10`) -- the ammo ceiling on dropped backpacks. `freshpacks` toggles it.
- **`k_freshteams_fast_ammo`** (default `0`) -- when on, ammo boxes respawn on the same fast timer as weapons.

## How it plays

The base game is unchanged -- it is still 4on4 (or any dmm1 team mode) -- but the resource economy tilts toward tempo over hoarding. Two linked changes do the work. Weapons come back faster, so a contested weapon spawn is never dead for long; and the sweep is capped, so re-running your route over the weapon spawns no longer refills your ammo. Together they mean a team cannot bank a big ammo lead from holding the map -- the guns stay available, but the ammo to abuse them does not pile up. The name captures the intent: the game stays "fresh" instead of settling into one team sitting on a stockpiled advantage.

## Hosting & settings

FreshTeams is a toggle mode, so it isn't part of the `k_allowed_free_modes` allow-list and there's no bit to manage. It is valid only in dmm1 and auto-disables in any other mode. The `k_freshteams` toggle does **not** stick in `server.cfg`: KTX resets it to `0` on every mode activation (the `common_um_init` block), so the warmup `/fresh` command is the only way to arm it per match -- a dedicated always-FreshTeams server pins it on through the per-usermode config that execs after that reset (see *server-setup*). The tuning cvars above are ordinary settings that persist in `server.cfg`.

## See also

- `nosweep` -- the simpler sibling for the same dmm1 concern: where FreshTeams *caps* the ammo from sweeping a weapon you own, NoSweep blocks the re-pickup outright. Both target sweeping, and they can run together -- NoSweep is the stronger of the two, since you leave the weapon entirely.
- `server-setup` -- how toggle modes like FreshTeams are armed, and the dedicated-server path for pinning one on.
