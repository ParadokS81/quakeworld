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
interaction_summary: "At match start the normal Quad Damage item is removed from the level. When the quad-carrier dies, a 10-second quad pickup spawns at their corpse -- provided no living player holds quad and no quad item exists on the level. Cannot stack with berzerk: the drop path is hard-gated by !k_berzerk at items.c:1974."
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

At match start, KTX removes every `item_artifact_super_damage` entity from the level (`match.c:951-955`). No quad will appear from map placement.

When the quad-carrier dies, `DropPowerups` fires (`items.c:1974`). Before spawning a dropped quad it calls `NeedDropQuad` (`items.c:1952-1969`), which passes only if two conditions hold: no living player has `super_damage_finished > 0` (nobody currently carries quad), and no `item_artifact_super_damage` entity exists anywhere on the level. When the guard passes, a quad pickup spawns at the corpse. Its `nextthink` is set to `g_globalvars.time + 10` with `KillQuadThink` as the callback (`items.c:1894-1895`). If nobody picks it up within 10 seconds, `KillQuadThink` removes the entity (`items.c:1864-1867`).

The quad is therefore always a contested single item. If the dropped quad expires uncollected, no quad exists on the level until the next carrier is killed.

## How to enable

Set `k_killquad 1` in `server.cfg`. Any player can also type `killquad` in the console during warmup to toggle the setting (`commands.c:3123-3131`); the command is blocked once a match is in progress (`commands.c:3125-3128`).

## Interaction with base modes

KillQuad layers on any base mode. The quad-removal and drop logic live in shared item code paths, not in any per-mode init array, so the mutation works identically across 1on1, 4on4, CA, CTF, FFA, and everything else.

**Conflict with berzerk**: the drop path is guarded by `!k_berzerk` at `items.c:1974`. When berzerk is also active, the entire killquad drop block is skipped -- no quad spawns on death. There is no activation-time interlock; admins must treat the two as mutually exclusive and not set both to 1.

**Other mutations**: no other confirmed interlocks in the drop code path. KillQuad stacks cleanly with mutations that operate outside the quad-item path.

## Configuration

| Cvar | Default | Purpose |
|---|---|---|
| `k_killquad` | 0 | Activation toggle (1 = enabled) |

No auxiliary cvars. The 10-second pickup window and the single-quad guard are hardcoded at `items.c:1894` and `items.c:1952-1969` respectively.

## See also

- `berzerk` -- incompatible mutation; both cannot be active simultaneously (`k_bzk`)
- `dq` / `k_pow_q` -- the separate standard quad-drop system; distinct from killquad's kill-transfer mechanic

<!-- triage notes: l3-upstream. No killquad.json or close alias in the 2026-05-04 wiki snapshot. All mechanical claims verified against KTX source: quad removal at match.c:951-955, drop-spawn path at items.c:1974-1982, NeedDropQuad guard at items.c:1952-1969, 10-second window literal at items.c:1894 (g_globalvars.time + 10), KillQuadThink at items.c:1864-1867, toggle command at commands.c:3123-3131, match-in-progress guard at commands.c:3125-3128, cvar registration at world.c:969. The !k_berzerk guard at items.c:1974 is the only confirmed cross-mutation interlock in the drop path. KTX git log: introduction commit 69cf598 and follow-up fix 60cb10c ("remove normal quad in killquad mode"). No wiki narrative exists to harvest. -->
