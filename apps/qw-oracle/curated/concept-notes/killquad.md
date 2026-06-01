---
title: "KillQuad"
summary: "A 'kill the carrier' match modifier: the Quad has no map spawn, only a dropped one. While a player holds it no one else can get one, and whenever no Quad is in play a new one drops on the next killed body. Layers on top of any base mode."
slug: killquad
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-31
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:killquad
gameplay_source_id: ktx
source_ref: world.c:969
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:cvar:k_killquad
  - ktx:command:killquad
  - ktx:cvar:k_pow
  - ktx:cvar:k_pow_q
  - ktx:cvar:dq
  - ktx:cvar:k_bzk
related_modes:
  - {slug: berzerk, relation: similar-shape}
---

## Summary

KillQuad is a "kill the carrier" match modifier you layer on top of any base mode -- 1on1, 4on4, CTF, FFA, anything. It takes the Quad off the map entirely: there is no fixed spawn and no respawn timer, so the only Quad in the game is one that has dropped from a body. Whenever no Quad is in play, the next player to die drops one -- pick it up and you become the carrier the whole server hunts, because while you hold it no other Quad can appear. You toggle it on with `/killquad`.

## Activate

KillQuad layers on a base mode, so get into the base you want first -- `/4on4`, `/1on1`, `/ctf`, whatever -- then `/killquad` to toggle it on/off.

## Basic ruleset

KillQuad changes one thing and leaves the rest to the base mode -- the deathmatch flag, teamplay, timelimit, roster, and item economy are all whatever the base game sets. What KillQuad itself locks in:

- **No map Quad.** The level's Quad spawn is removed at match start and never returns on its own.
- **One Quad at a time.** Only a single Quad ever exists -- carried by a player or lying on the ground, never two at once.
- **Drop on death.** Whenever no Quad is in play, the next player to die drops one on their body. It sits for ten seconds, then vanishes.
- **A fresh thirty seconds on every pickup.** Each grab gives the new owner a full Quad timer rather than the time the last carrier had left -- it never ticks down across the chain of carriers. (This is the one place it differs from the engine's ordinary dropped Quad, which passes on only the remaining time.)
- **Powerups forced on.** KillQuad overrides the base mode's powerup setting (`k_pow`), so the Quad is live even on a base that would normally run without powerups.

## How it plays

In a normal game the Quad sits at a fixed point on the map and respawns on a timer, so teams memorise its spot and count it down -- holding the Quad spawn is a pillar of map control. KillQuad throws that out. At match start the map's Quad is taken off the level for good, and from then on the Quad exists only as something that falls out of a body.

Whenever no Quad is in play, the next death drops one where the body falls -- the first death of the match seeds it, and from then on exactly one Quad exists, lasting ten seconds on the ground before it vanishes and the next death re-seeds it. Picking it up paints a target on you: fragging the carrier is the only way the Quad moves, and because every pickup resets the timer to a full thirty seconds, a carrier who survives keeps a full Quad while the hunters must both make the kill and beat everyone to the body.

So the fight stops orbiting a spawn point and starts orbiting whoever holds the Quad -- escorting your carrier and hunting theirs becomes the game within the game. It layers onto anything: a 4on4 becomes a running Quad escort, a duel a fight over one shared power item, an FFA a scramble for whoever just took the drop.

## Hosting & settings

KillQuad isn't in the `k_allowed_free_modes` allow-list (toggle modes never are), so it's reachable on any server; players turn it on per game with `/killquad`. `k_killquad` is a plain on/off with nothing to tune -- for an always-on server, see *server-setup*.

**One real constraint: KillQuad does not work with bots.** With frogbots in the game the death-drop never fires -- the Quad simply never appears, with no error to explain why -- so KillQuad needs real players. (The bot system leaves the stripped map Quad lingering invisibly in place, which makes the engine think a Quad is already in play.)

## See also

- `berzerk` -- the other Quad-themed match-modifier; the two coexist (berzerk's end-window suppresses killquad's drop).
- `dq` / `k_pow_q` -- the engine's ordinary dropped-Quad system that killquad replaces.
- `server-setup` -- arming toggle modes and the always-on path.
