---
title: "Berzerk"
summary: "A match-modifier that changes only the ending: for the closing stretch of a match -- a length the server sets -- every living player is handed a permanent Quad, turning the finish into an everyone-has-quad brawl. The rest of the match plays normally; it layers on top of any base mode."
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

Berzerk is a match-modifier that changes only the *ending* of a game. The match plays out normally until its closing window -- a length the server sets -- and then every living player is handed a Quad Damage that lasts to the end, with a brief invulnerability flash as it triggers. The finish becomes a frantic everyone-has-quad brawl where a single rocket ends anyone, and the careful resource game gives way to a chaotic, spectator-friendly send-off. It layers on any base mode and does nothing until that window opens. You arm it with `/berzerk`.

## Activate

Berzerk is a toggle, not a mode you start on its own. Get into the base mode you want to play, then type `/berzerk` in the console during warmup to arm it (run it again to disarm). Any player can do it. Like any rules change it only takes during warmup and is refused once the match is live, so set it before you ready up.

One catch: berzerk only fires if the server has given it a window length (see *Settings to tune*). On a server that hasn't set one, arming it does nothing -- the window never opens.

## Basic ruleset

Berzerk changes one thing and leaves the rest to the base mode -- the deathmatch flag, teamplay, timelimit, roster, and item economy are all whatever the base game sets. What berzerk itself locks in, all at the very end:

- **A timed finish.** Berzerk stays dormant until the match's closing window -- a length the server sets (see *Settings to tune*) -- then flips on for the rest of the match.
- **Quad for everyone.** When the window opens, every living player is given Quad Damage for the remainder -- permanent, not a timed pickup that ticks down.
- **A two-second invulnerability flash.** Each player also gets a brief moment of invulnerability as it triggers -- a grace so the finish opens with a melee, not instant mutual annihilation.
- **Respawns stay quadded.** Anyone who dies and respawns during the window comes back quadded, so the whole field stays quadded to the end.

## Settings to tune

Berzerk's one knob is the length of the finish:

- **`k_btime`** -- the berzerk window, in seconds: how many of the match's closing seconds are played with everyone quadded. It defaults to `0`, which means *no window ever opens*, so berzerk does nothing until a server sets it (e.g. `60` for a one-minute finish).

## How it plays

For most of the match nothing is different -- you play the underlying mode exactly as normal, and berzerk sits dormant. The change is all at the end. When the match clock counts down to the window length the server set, the game announces **BERZERK!!!!**, the map lighting shifts, and every living player is suddenly holding a Quad. From that moment the finish is a deliberately chaotic, everyone-has-quad scramble: damage is quadrupled across the board, a single direct rocket kills, and the careful resource game the base mode was built on dissolves into a frantic, spectator-friendly send-off.

A two-second invulnerability flash cushions the trigger so the window opens with a melee rather than an instant wipe, and anyone who dies and respawns inside the window comes back quadded -- there is no fighting your way back to a powerup, because everyone simply has one until the clock runs out.

Because the berzerk window only opens at the very end, it sits cleanly alongside other modifiers rather than fighting them. KillQuad is the clear example: it runs its kill-the-carrier game normally for the whole match and then simply yields once berzerk fires -- there is no point transferring a single dropped Quad when every player already holds one.

## Hosting & settings

Berzerk is a toggle mode, so it isn't part of the `k_allowed_free_modes` allow-list and there's no bit to manage -- it's reachable on any stock KTX or nquake server. It takes two separate cvars, and they behave differently:

- **`k_btime`** -- the window length (see *Settings to tune*). An ordinary server setting: put it in `server.cfg` and it persists.
- **`k_bzk`** -- the on/off toggle. This one does **not** stick in `server.cfg`: KTX resets it to `0` every time a mode activates (the `common_um_init` block), so the warmup `/berzerk` command is the only way to arm it per match. To run a dedicated, always-berzerk server, put `k_bzk 1` in the per-usermode config that execs *after* that reset -- those mechanics live once in *server-setup*.

So the usual setup is: set `k_btime` once in `server.cfg` for the finish length you want, and let players arm each match with `/berzerk`.

## See also

- `killquad` -- the other Quad-themed match-modifier and berzerk's same-shape sibling; it makes the Quad a single kill-the-carrier prize for the whole match, where berzerk hands one to everybody at the end. The two run together cleanly: berzerk's closing window simply suppresses KillQuad's death-drop, since every player already holds a Quad.
- `server-setup` -- how toggle modes like Berzerk are armed, the warmup-only rule, and the dedicated-server path for pinning one on.
