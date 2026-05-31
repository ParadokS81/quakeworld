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

KillQuad is a toggle, not a mode you start on its own. Get into the base mode you want to play first -- `/4on4`, `/1on1`, `/ctf`, whatever -- then type `/killquad` in the console to switch it on (run it again to switch it off). Any player can do it, not just an admin. Like any rules change it only takes during warmup and is refused once the match is live, so set it before you ready up.

## Basic ruleset

KillQuad changes one thing and leaves the rest to the base mode -- the deathmatch flag, teamplay, timelimit, roster, and item economy are all whatever the base game sets. What KillQuad itself locks in:

- **No map Quad.** The level's Quad spawn is removed at match start and never returns on its own.
- **One Quad at a time.** Only a single Quad ever exists -- carried by a player or lying on the ground, never two at once.
- **Drop on death.** Whenever no Quad is in play, the next player to die drops one on their body. It sits for ten seconds, then vanishes.
- **A fresh thirty seconds on every pickup.** Each grab gives the new owner a full Quad timer rather than the time the last carrier had left -- it never ticks down across the chain of carriers. (This is the one place it differs from the engine's ordinary dropped Quad, which passes on only the remaining time.)
- **Powerups forced on.** KillQuad overrides the base mode's powerup setting (`k_pow`), so the Quad is live even on a base that would normally run without powerups.

## How it plays

In a normal game the Quad sits at a fixed point on the map and respawns on a timer, so teams memorise its spot and count it down -- holding the Quad spawn is a pillar of map control. KillQuad throws that out. At match start the map's Quad is taken off the level for good, and from then on the Quad exists only as something that falls out of a body.

The seeding rule is simple. Whenever no Quad is in play -- nobody alive holds one and none is lying around -- the next death drops a Quad where the body falls. The first death of the match starts the whole thing; any death does it (a frag, a suicide, even a fall), because at that point no one has the Quad yet. After that, exactly one Quad is ever in the game. A dropped Quad lasts ten seconds: collect it inside that window or it disappears and the next death re-seeds it.

So the Quad stops being a place and becomes a person. Picking it up paints a target on you -- the whole enemy team now wants you dead, because fragging the carrier is the only way the Quad ever moves. Kill them and a fresh Quad drops on their body for whoever reaches it first; let them live and no new Quad can appear. And because every pickup resets the timer to a full thirty seconds, a carrier who keeps surviving keeps a full Quad, while the hunters have to both make the kill and beat everyone else to the drop inside the ten-second window.

That one change reshapes the match. The fight stops orbiting a spawn point and starts orbiting whoever holds the Quad: escorting your own carrier and hunting theirs becomes the game within the game. A smart carrier spends the thirty seconds aggressively before the frag-and-grab catches up; the other team tries to trade them down and arrive first at the body. Because it layers cleanly onto any base mode, KillQuad turns a 4on4 into a running Quad escort, a duel into a fight over one shared power item, and an FFA into a scramble where the lead belongs to whoever just took the drop.

## Hosting & settings

KillQuad is a toggle mode, so it isn't part of the `k_allowed_free_modes` allow-list and there's no bit to manage -- it's reachable on any stock KTX or nquake server by default. Players turn it on per game with the `/killquad` command (see *Activate*).

There is no `server.cfg` switch. Setting `k_killquad 1` in `server.cfg` does **not** stick: KTX resets the cvar to `0` every time a mode activates (the `common_um_init` block), so the warmup command is the only way to turn it on. To run a dedicated, always-on KillQuad server, the toggle goes in the per-usermode config that execs *after* that reset -- those mechanics live once in *server-setup*, not here.

Nothing else is adjustable. The ten-second drop window and the one-Quad-at-a-time rule are hardcoded; `k_killquad` is the only cvar, and it is a plain on/off with no knobs to tune.

**One real constraint: KillQuad does not work with bots.** With frogbots in the game the death-drop never fires -- the Quad simply never appears, with no error to explain why -- so KillQuad needs real players. (The bot system leaves the stripped map Quad lingering invisibly in place, which makes the engine think a Quad is already in play.)

## See also

- `berzerk` -- the other quad-centric match modifier and KillQuad's same-shape sibling; it hands *every* living player a Quad in the closing seconds of a match. The two can run at the same time: during Berzerk's end window KillQuad's death-drop simply stops -- everyone already holds a Quad, so there's nothing to contest -- which means they cooperate rather than conflict.
- `dq` / `k_pow_q` -- the engine's ordinary dropped-Quad system, where a killed carrier drops only the time *remaining* on their Quad (so it keeps ticking down) and the map's own Quad still spawns normally. KillQuad replaces that with its kill-transfer drop: one Quad on the level at a time, and a fresh full thirty seconds on every pickup.
- `server-setup` -- how toggle modes like KillQuad get activated, the warmup-only rule, and the dedicated-server path for pinning one on.
