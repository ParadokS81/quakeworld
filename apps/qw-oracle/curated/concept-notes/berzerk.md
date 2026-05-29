---
title: "Berzerk"
summary: "A match-modifier that turns the closing stretch of a game into an all-out quad brawl: for the final stretch of the match -- an admin-set window -- every player is handed a permanent Quad Damage. The rest of the match plays normally; only the ending goes berzerk. Layers on top of any base mode."
slug: berzerk
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:berzerk
gameplay_source_id: ktx
source_ref: world.c:930
activation_summary: "Set k_bzk 1 in server.cfg (or toggle it with the berzerk command during warmup) and set k_btime to the window length in seconds. Then start any base mode -- Berzerk layers on top."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:berzerk
  - ktx:cvar:k_bzk
  - ktx:cvar:k_btime
related_modes:
  - {slug: killquad, relation: similar-shape}
---

## Summary

Berzerk is a match-modifier that changes only the *ending* of a game. In a normal match the Quad is a single contested pickup on a timer; Berzerk leaves the match alone until its closing window -- the final `k_btime` seconds -- and then hands **every player a Quad Damage that lasts to the end**. The finale turns into a frantic everyone-has-quad brawl. It layers on any base mode and does nothing until that window opens.

## How it plays

For most of the match nothing is different -- you play the underlying mode normally. What Berzerk adds is a timed window at the end: when the clock reaches the last `k_btime` seconds, the server flips into berzerk and grants every player Quad Damage for the remainder of the match (the quad is permanent, not a timed pickup, and players who connect mid-window do not get it). With everyone quadded at once, the closing stretch becomes a high-damage scramble where a single rocket ends anyone -- a deliberately chaotic, spectator-friendly finish rather than a competitive rule.

Because the window only opens at the very end, Berzerk coexists cleanly with other modifiers. KillQuad in particular runs normally for the whole match and simply yields during the berzerk window -- there is no point transferring a dropped Quad when every player already holds one.

## Starting a game

Berzerk is enabled by an admin, not started as a match of its own. Set it on the server (see Hosting & settings), or toggle it in warmup with the `berzerk` command, then start whatever base mode you want -- Berzerk rides on top. There is nothing for a player to do mid-match; the window opens on its own near the end.

## Hosting & settings

Berzerk is a cvar toggle, so it is not gated by `k_allowed_free_modes`. Two cvars define it:

```
# server.cfg (berzerk -- a modifier toggle)
set k_bzk 1
set k_btime 60
```

- **`k_bzk`** (default `0`) -- the master toggle. The `berzerk` warmup command flips it.
- **`k_btime`** -- the window length in seconds. It defaults to `0`, which means *no window ever opens* -- so enabling `k_bzk` without setting `k_btime` does nothing. Set it to the number of closing seconds you want quadded (e.g. `60` for the last minute).

Interaction note: Berzerk and KillQuad can both be on. KillQuad's dropped-Quad mechanic operates for the bulk of the match and is suppressed only inside the berzerk window, when every player already has a Quad.

## See also

- `killquad` -- the other Quad-themed match-modifier; the two coexist, with Berzerk's end-window suppressing KillQuad's drop.
- The base modes (`4on4`, `ffa`, etc.) -- Berzerk layers on any of them; the base game is the experience until the window opens.
