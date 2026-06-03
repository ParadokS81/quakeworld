---
title: "Instagib"
summary: "A novelty mode built on dmm4: every player spawns with KTX's Coilgun -- a railgun-style hitscan weapon that kills in one hit from any range, with unlimited ammo. The gametype is imported from Quake 2's railgun (Quake 1 has no rail) and is usually played free-for-all; it is a for-fun mode, not a competitive format, and cannot run alongside the other dmm4 mutators (midair, LGC)."
slug: instagib
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: novelty
kind: mutator
score_system: frags

canonical_id: ktx:game_mode:instagib
gameplay_source_id: ktx
source_ref: world.c:975
wiki_status: hybrid
wiki_page_slug: Instagib
introduced_by: "Deurk (KTX rebuild, October 2007); concept from Quake 2 via KTPro"
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:instagib
  - ktx:command:instagib_coilgun_kickback
  - ktx:cvar:k_instagib
  - ktx:cvar:k_instagib_custom_models
  - ktx:cvar:k_cg_kb
  - ktx:cvar:k_midair
  - ktx:cvar:k_lgcmode
related_modes:
  - {slug: midair, relation: incompatible-with}
  - {slug: lgc, relation: incompatible-with}
---

## Summary

Instagib is a novelty mode: every player spawns with KTX's **Coilgun** -- a railgun-style hitscan weapon that kills in one hit from any range, with unlimited ammo. The gametype came from Quake 2's railgun (Quake 1 has no rail), so it is an import rather than a native format; in KTX it rides on dmm4, is usually played free-for-all, and is run for fun, not competition. Start it with `/instagib` on a dmm4 server -- it is a dmm4 mutator and cannot run with midair or LGC.

## Activate

On a KTX server (dmm4 required):

```
/dmm4
/instagib    // toggle; type again to cycle  slow -> fast -> extreme -> off
```

Enabling it switches off the other dmm4 mutators (midair, LGC).

## Basic ruleset

A toggle on dmm4 that replaces the arsenal with one lethal weapon:

- **Coilgun + axe only** -- 250 health, **no armour** (lethal hits make it moot), the Coilgun, the axe, unlimited ammo. Nothing on the map you need to pick up to fight.
- **Every hit kills** -- a Coilgun shot is a guaranteed kill at any range, whatever the target's armour or health.
- **Three firing speeds** -- slow / fast / extreme, cycled with `/instagib`.
- **Fast spawns** -- brief spawn invulnerability, 2-second respawn.

## How it plays

With one-shot kills and nothing to collect, the game is two things: hit them first, and don't be where their crosshair is. Armour is moot and there's no weapon to hunt, so instagib is as much dodging and movement as aim -- and it plays on any map.

The Coilgun is a hitscan shot that **punches through a player and keeps going** to the wall, so one shot can gib a line of opponents (KTX tracks your multi-gibs). You also keep the **axe**, and scoring rewards the harder kill: a coil frag is worth **1**, an axe frag **2**, and a **stomp** -- landing on someone's head -- **4**. End-of-match stats split your kills into coil, axe, stomp and multi-gibs.

The Coilgun has rocket-launcher kickback, so you can **coiljump** -- a rocket jump without the explosion or the self-damage. KTX also measures how high an airborne victim was: a kill on someone in the air is an **airgib**, announced with its height (plain / Great / Amazing) and tracked for players chasing more than raw frags.

Surviving is hard when every shot kills, so KTX rewards a streak: **each backpack adds 10 health**, and climbing past 300 without dying (about five packs) grants **30 seconds of invisibility** (the Ring) -- brief cover to close in for an axe kill and its double frags.

## History

The instagib gametype began with Quake 2's railgun and spread widely, big in Unreal Tournament (often with CTF/DM). In QuakeWorld it first appeared in **KTPro**, repurposing the Lightning Gun (on dmm8) as a rail-like instant-kill. After some dormant years **Deurk** rebuilt it for KTX in October 2007, swapping the LG for the purpose-built **Coilgun** -- a hitscan weapon with its own model (by **Orion**), sound and through-target penetration. It stays a for-fun curiosity, not a competitive discipline.

## Hosting & settings

Instagib is a dmm4 mutator, not a free mode, so it has no `k_allowed_free_modes` bit -- an admin enables it on a dmm4 server (usually a matchless/FFA box):

```
# server.cfg -- Instagib rides on dmm4
deathmatch 4
set k_instagib 1                 // 1 slow, 2 fast, 3 extreme (0 = off)
set k_instagib_custom_models 1   // use the Coilgun model instead of the SG/SSG models
```

- **`k_instagib`** (default `0`) -- activation level / firing speed: `1` slow (1.2s reload), `2` fast (0.7s), `3` extreme (0.5s). Requires `deathmatch 4`; `/instagib` cycles `0 -> 1 -> 2 -> 3 -> 0`.
- **`k_instagib_custom_models`** (default `0`) -- swap the borrowed SG/SSG models for the dedicated Coilgun model and sound.
- **`k_cg_kb`** (default `1`) -- Coilgun kickback, what makes coiljumps possible. KTX forces it on with instagib; `/instagib_coilgun_kickback` toggles it.

Enabling instagib zeroes the cvars it conflicts with -- `k_midair`, `k_lgcmode`, the ToT toggle and dmm4 gren-mode -- so only one dmm4 mutator runs at once. A per-server or per-map preset can go in `configs/usermodes/instagib/default.cfg` (or `<mapname>.cfg`), exec'd automatically on toggle.

## See also

- `midair` -- the other dmm4 aim mutator (score only for mid-air kills). Mutually exclusive: enabling either turns the other off.
- `lgc` -- the Lightning Gun-only dmm4 mutator, also mutually exclusive.
- `dmm4` -- the full-arsenal aim base instagib strips down and builds on.
- `ffa` -- the free-for-all setup instagib is usually played on.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including dmm4.
