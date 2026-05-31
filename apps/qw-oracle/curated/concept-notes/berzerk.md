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

Berzerk is a match-modifier you layer on any base mode; it changes only the ending -- for the match's closing stretch (around 20 seconds by default), every living player is given a Quad. You arm it with `/berzerk`.

## Activate

Get into the base mode you want to play, then type `/berzerk` during warmup to arm it (run it again to disarm). Any player can, and like any rules change it is refused once the match is live.

## Basic ruleset

Berzerk leaves the base mode untouched and changes only the finish:

- **Quad for everyone at the end.** When the match clock reaches the berzerk window, every living player gets a Quad that lasts to the end; anyone who respawns inside the window comes back quadded too.

## How it plays

Until the window opens, berzerk does nothing -- you play the base mode straight. Then it triggers, with a loud "BERZERK!!!!" and a flash of the map lighting, and the finish turns deliberately chaotic: with everyone quadded at once a single rocket kills, the careful armour-and-position game dissolves, and the last seconds become a spectator-friendly free-for-all rather than a competitive decider.

## Hosting & settings

Berzerk isn't in the `k_allowed_free_modes` allow-list (toggle modes never are), so it's available on any server. Its one setting is **`k_btime`** -- the window length in seconds, set in `server.cfg` (default `20`; e.g. `60` for a one-minute frenzy, `0` to disable). The mode itself is armed in-game with `/berzerk`, not from `server.cfg` -- the `k_bzk` toggle resets on every mode change (a dedicated always-berzerk server pins it on via the per-usermode config; see *server-setup*).

## See also

- `killquad` -- the other Quad-themed modifier (a single kill-the-carrier prize all match, vs berzerk's Quad-for-everyone at the end). The two coexist: berzerk's window simply suppresses KillQuad's drop.
- `server-setup` -- arming toggle modes and the dedicated-server path.
