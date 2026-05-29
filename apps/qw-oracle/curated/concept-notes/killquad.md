---
title: "KillQuad"
summary: "A 'kill the carrier' match modifier: the Quad has no map spawn, only a dropped one. While a player holds it no one else can get one, and whenever no Quad is in play a new one drops on the next killed body. Layers on top of any base mode."
slug: killquad
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:killquad
gameplay_source_id: ktx
source_ref: world.c:969
activation_summary: "Set k_killquad 1 in server.cfg, or any player toggles it with the killquad command during warmup (blocked once a match is live). Then start any base mode -- KillQuad layers on top."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:cvar:k_killquad
  - ktx:command:killquad
  - ktx:cvar:k_pow_q
  - ktx:cvar:dq
  - ktx:cvar:k_bzk
related_modes:
  - {slug: berzerk, relation: similar-shape}
---

## Summary

KillQuad is a "kill the carrier" match modifier: the Quad has no map spawn, only a dropped one. While a player holds the Quad no one else can get one, and whenever no Quad is in play a new one drops on the next killed body. It layers on top of any base mode (1on1, 4on4, CTF, FFA, anything), changing this one rule while the base game stays the experience.

## How it plays

In a normal game the Quad spawns at a fixed point and respawns on a timer, so teams time it and fight for the spawn. KillQuad removes that spawn entirely -- at match start the map's Quad is taken off the level and never returns on its own.

From then on the Quad rides on deaths. Whenever a player dies and no Quad is in play -- nobody alive holds one and none is lying on the ground -- a Quad drops on that player's body and sits there for 10 seconds before vanishing. That single rule seeds the mode: the first death of the match (a frag, a suicide, a fall -- any death) drops the first Quad, even though no one had it yet. After that only one Quad ever exists. While a player holds it no new Quad can appear; kill them and a fresh Quad drops on their body; if a dropped Quad expires uncollected, the next death re-seeds it.

Each time the Quad is picked up the new owner gets a fresh, full 30 seconds -- the timer resets on every pickup, it does not tick down across the chain of carriers. (This is the one place KillQuad differs from the engine's ordinary dropped Quad, where a killed carrier passes on only the time left on theirs.)

So the Quad stops being a spot on the map and becomes the player holding it: picking it up makes you the target, and the only way to move the Quad is to frag the carrier and grab the drop inside the 10-second window.

## Starting a game

KillQuad is a toggle, not a mode you start. On a live server, any player can type `/killquad` in the console during warmup to switch it on or off; the command is refused once a match is in progress. (An admin can also preset it server-side -- see Hosting & settings.) With the toggle on, start a normal game (`/4on4`, `/1on1`, `/ctf`, ...) and KillQuad's quad rules apply on top of it.

## Hosting & settings

The quad-removal and drop logic live in KTX's shared item code, not in any per-mode preset, so KillQuad behaves identically no matter which base mode it is layered onto. An admin enables it with one cvar in `server.cfg`, then starts any base mode:

```
# server.cfg
k_killquad 1
```

- **`k_killquad 1`** -- the activation toggle (default `0`).

The 10-second drop window and the single-quad guard are hardcoded and not server-tunable; `k_killquad` is the only knob.

**Interaction with Berzerk.** KillQuad and Berzerk can both be enabled at the same time, and for nearly the whole match KillQuad works normally. Berzerk only fires in the final stretch of a match (the last `k_btime` seconds), when it hands every living player a quad. From that moment KillQuad's death-drop stops -- which is the intended behaviour, since everyone already holds quad and there is nothing left to contest. So the two are *not* mutually exclusive: KillQuad simply yields for the brief Berzerk window at the end. (Mechanically, the death-drop is gated on the `k_berzerk` flag, which is off for the whole match until the Berzerk window flips it on.)

## See also

- `berzerk` -- the other quad-centric match modifier (quad to everyone in the closing seconds). Can run alongside KillQuad; KillQuad yields during the Berzerk window rather than conflicting with it.
- `dq` / `k_pow_q` -- the engine's ordinary dropped-Quad system, where a killed carrier drops the time *remaining* on their Quad (so it keeps ticking down). KillQuad replaces this with its own kill-transfer drop: a fresh full 30 seconds on every pickup, and only one Quad on the level at a time.
