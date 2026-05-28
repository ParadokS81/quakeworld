---
title: "KillQuad (mutation)"
summary: "Mutation that replaces the normal Quad Damage pickup with a kill-transferred dropped quad: when the quad-carrier dies, a 10-second quad pickup spawns at their death location -- but only if no living player currently holds quad and no quad item is already on the level."
slug: killquad
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: mutation
canonical_id: ktx:game_mode:killquad
gameplay_source_id: ktx
source_ref: world.c:969
activation_summary: "Server admin sets k_killquad 1 in server.cfg, or any player runs the killquad command in warmup to toggle it."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

activation_cvar: k_killquad
applies_to: any
interaction_summary: "At match start the normal Quad Damage item is removed from the level. When the quad-carrier dies, a 10-second quad pickup spawns at their corpse -- provided no living player holds quad and no quad item exists on the level. Cannot stack with berzerk: the drop path is hard-gated by !k_berzerk."
stacks_with_mutations: partial
changes_section_set: [powerups, drop_item]

related_entities:
  - ktx:cvar:k_killquad
  - ktx:command:killquad
  - ktx:cvar:k_pow_q
  - ktx:cvar:dq
  - ktx:cvar:k_bzk
related_modes:
  - {slug: berzerk, relation: incompatible-with}

note_origin: synthesized
---

## Lead

KillQuad is a KTX mutation that transforms Quad Damage from a map pickup into a kill-the-carrier objective. The normal quad is stripped from the level at match start; the only quad that can appear during the match is the one dropped when the carrier is killed. Any base mode -- 1on1, 4on4, CTF, or anything else -- can run with KillQuad active.

## What it does

At match start, the normal Quad Damage item is stripped from the level. No quad will appear from map placement during the match.

When the quad-carrier dies, a quad pickup spawns at their corpse -- but only if two conditions hold: no other player currently holds quad, and no quad item already exists on the level. The dropped quad lasts 10 seconds; if nobody picks it up in that window, it disappears.

The quad is therefore always a contested single item. If the dropped quad expires uncollected, no quad exists on the level until the next carrier is killed. This keeps the quad-carrier as an objective rather than letting quad cycle through respawn-based pickups.

## How to enable

```
# server.cfg
k_killquad 1
```

Any player can also type `killquad` in the console during warmup to toggle the setting; the command is blocked once a match is in progress.

## Interaction with base modes

KillQuad layers on any base mode. The quad-removal and drop logic live in shared item code paths, not in any per-mode init array, so the mutation works identically across 1on1, 4on4, CA, CTF, FFA, and everything else.

**Conflict with berzerk**: the drop path is hard-gated against berzerk. When `k_bzk 1` and `k_killquad 1` are both set, the drop block is skipped -- no quad spawns on death, and KillQuad's mechanic is silently neutered while berzerk's end-of-match quad-damage application runs normally. There is no activation-time interlock; admins must treat the two as mutually exclusive and not set both.

**Other mutations**: no other known interlocks in the drop code path. KillQuad stacks cleanly with mutations that operate outside the quad-item path.

## Configuration

| Cvar | Default | Purpose |
|---|---|---|
| `k_killquad` | 0 | Activation toggle (1 = enabled) |

No auxiliary cvars. The 10-second pickup window and the single-quad guard are hardcoded -- not server-tunable.

## See also

- `berzerk` -- incompatible mutation; both cannot be active simultaneously (`k_bzk`)
- `dq` / `k_pow_q` -- the separate standard quad-drop system; distinct from killquad's kill-transfer mechanic
