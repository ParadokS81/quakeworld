---
title: "NoSweep"
summary: "A dmm1 match-modifier that stops you from re-picking-up a weapon you already own. In normal play, walking over a weapon spawn you already hold tops up its ammo (a 'sweep'); NoSweep makes you leave it on the ground instead, tightening the ammo economy. Works only in deathmatch 1."
slug: nosweep
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:nosweep
gameplay_source_id: ktx
source_ref: world.c:909
activation_summary: "Set k_nosweep 1 in server.cfg (or toggle it with the nosweep command during warmup; requires dmm1). Then start a dmm1 base mode -- NoSweep layers on top."
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

NoSweep is a small, focused match-modifier for the `deathmatch 1` modes. Normally, walking over a weapon spawn for a weapon you already own gives you a fresh load of its ammo -- a "sweep," used to top up between fights. NoSweep removes that: if you already hold the weapon, you leave it on the ground untouched. The weapon spawn is then useful only to players who do not yet have the gun. It works only in dmm1; the server forces it off in any other mode.

## How it plays

The base dmm1 game is otherwise unchanged. The one difference is what happens when you cross a weapon you already carry: instead of a quiet ammo top-up, nothing happens -- the weapon stays on the floor for someone who needs it. That closes the habit of "sweeping" weapon spawns for ammo and tightens the overall ammo economy, so ammo control matters more and a player cannot refill simply by running their usual route over the weapon spawns. It is a single rule, easy to reason about, and pairs naturally with the dmm1 map-control game.

## Starting a game

NoSweep is enabled by an admin, not started as its own match. Set it on the server (see Hosting & settings), or toggle it in warmup with the `nosweep` command, then start a dmm1 base mode such as 4on4 or 3on3. It layers on top; there is nothing extra for a player to do in-match.

## Hosting & settings

NoSweep is a single cvar toggle (not gated by `k_allowed_free_modes`), valid only in `deathmatch 1`:

```
# server.cfg (NoSweep -- a dmm1 modifier toggle)
set k_nosweep 1
```

- **`k_nosweep`** (default `0`) -- the only cvar. The `nosweep` warmup command flips it; the server auto-disables it outside dmm1.

## See also

- `freshteams` -- the broader sibling for the same concern: where NoSweep simply blocks re-picking-up an owned weapon, FreshTeams instead *caps* the sweep ammo (and retunes weapon timers and pack ammo). Both target "sweeping" and can be set together.
- The dmm1 team modes (`4on4`, `3on3`, ...) -- NoSweep layers on any of them.
