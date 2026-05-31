---
title: "NoSweep"
summary: "A dmm1 match-modifier that stops you re-picking-up a weapon you already own. Normally, crossing a weapon spawn you already hold tops up its ammo (a 'sweep'); NoSweep makes you leave it on the ground instead, tightening the ammo economy. Works only in deathmatch 1; layers on any dmm1 base mode."
slug: nosweep
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-31
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:nosweep
gameplay_source_id: ktx
source_ref: world.c:909
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:nosweep
  - ktx:cvar:k_nosweep
related_modes:
  - {slug: freshteams, relation: similar-shape}
---

## Summary

NoSweep is a small, focused match-modifier for the `deathmatch 1` modes. Normally, walking over a weapon spawn for a weapon you already own gives you a fresh load of its ammo -- a "sweep," used to top up between fights. NoSweep removes that: if you already hold the weapon, you leave it on the ground untouched, so the spawn is useful only to players who don't yet have the gun. It works only in dmm1 and layers on any dmm1 base mode. You arm it with `/nosweep`.

## Activate

NoSweep is a toggle, and it requires a `deathmatch 1` base mode -- 4on4, 3on3, or the larger team rosters. Get into one first, then type `/nosweep` in the console during warmup to arm it (run it again to disarm). It is refused outside dmm1 (and auto-disables if you switch to a non-dmm1 mode), and like any rules change it only takes during warmup. Any player can do it.

## Basic ruleset

NoSweep inherits the dmm1 base mode unchanged and adds a single rule:

- **No re-pickup of owned weapons.** Crossing a weapon spawn for a gun you already hold does nothing -- you leave it on the ground instead of topping up its ammo. The spawn still arms a player who lacks that weapon.

## How it plays

The base dmm1 game is otherwise unchanged; the one difference is what happens when you cross a weapon you already carry. Instead of a quiet ammo top-up, nothing happens -- the gun stays on the floor for someone who needs it. That closes the habit of "sweeping" weapon spawns for ammo and tightens the overall economy, so ammo control matters more and you can't refill simply by running your usual route over the spawns. It is a single rule, easy to reason about, and pairs naturally with the dmm1 map-control game.

## Hosting & settings

NoSweep is a toggle mode, so it isn't part of the `k_allowed_free_modes` allow-list and there's no bit to manage. It is valid only in dmm1 and auto-disables in any other mode. `k_nosweep` is the only cvar -- a plain on/off with nothing to tune -- and it does **not** stick in `server.cfg`: KTX resets it to `0` on every mode activation (the `common_um_init` block), so the warmup `/nosweep` command is the only way to arm it per match. A dedicated always-NoSweep server pins it on through the per-usermode config that execs after that reset (see *server-setup*).

## See also

- `freshteams` -- the broader sibling for the same dmm1 concern: where NoSweep simply blocks re-picking-up an owned weapon, FreshTeams instead *caps* the sweep ammo and also retunes weapon timers and pack ammo. Both target sweeping and can be set together.
- `server-setup` -- how toggle modes like NoSweep are armed, and the dedicated-server path for pinning one on.
