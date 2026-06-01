---
title: "Berzerk"
summary: "A match-modifier you layer on any base mode: for the match's closing stretch (around 20 seconds by default), every living player is given a Quad. Only the ending changes -- the rest plays normally."
slug: berzerk
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-31
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:berzerk
gameplay_source_id: ktx
source_ref: world.c:930
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

Berzerk is a match-modifier you layer on any base mode; it changes only the ending. For the match's closing stretch (~20s by default), every living player gets a Quad. Arm it with `/berzerk`.

## Activate

Get into the base mode you want, then `/berzerk` to toggle it on/off.

## How it plays

Until the window opens, berzerk does nothing -- you play the base mode straight. Then it triggers, with a loud "BERZERK!!!!" and a flash of the map lighting: every living player is quadded at once (and so is anyone who respawns inside the window), a single rocket kills, and the careful armour-and-position game dissolves into a spectator-friendly blood-frenzy.

## Hosting & settings

Available on any server (toggle modes are never in the `k_allowed_free_modes` allow-list). Server-side setting:

- **`k_btime`** -- berzerk window length, in seconds. Default `20`; `0` disables it.

## See also

- `killquad` -- the other Quad-themed match-modifier (coexists with berzerk).
- `server-setup` -- how KTX modes are enabled and hosted.
