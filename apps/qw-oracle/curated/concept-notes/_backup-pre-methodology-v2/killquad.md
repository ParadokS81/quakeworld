---
title: "KillQuad (mutation)"
summary: "Mutation that replaces the normal Quad Damage pickup with a one-shot dropped quad: when the player carrying quad dies, a 10-second quad pickup spawns at their death position -- but only if no other player currently holds quad and no quad item is already on the level."
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
activation_summary: "Server admin sets `k_killquad 1` in server.cfg, or any player runs `killquad` in warmup to toggle it pre-match."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

activation_cvar: k_killquad
applies_to: any
interaction_summary: "At match start the normal Quad Damage item is removed from the map. When the player carrying quad dies, a 10-second quad pickup spawns at their corpse -- but only if no one else holds quad and no quad item is already on the level. Cannot stack with berzerk (the quad-drop path is gated by `!k_berzerk`)."
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

KillQuad is a KTX mutation that changes how Quad Damage enters play. Instead of a fixed quad pickup that respawns on the map, the quad becomes a "kill the carrier" objective: the normal quad is removed at match start, and the only quad that appears during the match is the one dropped when a quad-carrier dies. The mode is orthogonal to which game mode is being played -- it modifies the item economy, not the rules of the match.

## What it does

When `k_killquad` is enabled, two changes apply across the match:

1. **At match start**, every `item_artifact_super_damage` entity on the map is removed (`match.c:951`). No quad will spawn from map placement during the match.
2. **When the quad-carrier dies**, a quad pickup is dropped at the death position with a 10-second pickup window -- but only if no other player is currently carrying quad and no quad item already exists on the level. This makes the carrier-kill the only way to introduce a fresh quad into play.

The mechanism keeps quad as a contested objective rather than a respawn-based pickup. Once the carrier dies and another player picks up the dropped quad, the cycle continues. If the dropped quad expires without being picked up, the next quad only enters play when the current (or next) carrier dies again.

## How to enable

Set `k_killquad 1` in `server.cfg`, or have any player run `killquad` in warmup to toggle the state (`commands.c:3130`). The toggle command is allowed pre-match only; once a match is live the cvar is locked.

```
# server.cfg
k_killquad 1

# in-game (warmup)
killquad
```

## Interaction with base modes

KillQuad applies to any base mode. The quad-removal and quad-drop logic run from the shared item code paths (`items.c:1892`, `items.c:1974`), not from any per-mode init, so it layers on 1on1, 4on4, ctf, ffa, or any other standalone mode equally.

**Conflict with `berzerk`**: the quad-drop spawn path is guarded by `&& !k_berzerk` (`items.c:1974`). When both mutations are active, the dropped quad will not spawn -- effectively neutering killquad while berzerk handles its own end-of-match quad-damage application. The two mutations should be treated as mutually exclusive even though there is no master interlock at activation time.

**Other mutations**: killquad is orthogonal to bloodfest, midair, nosweep, yawnmode, lgc, instagib, and freshteams. These all change rules outside the quad-item path, so they stack cleanly with killquad.

## Configuration

| cvar | default | what it does |
|---|---|---|
| `k_killquad` | `0` | Master toggle. `0` = standard quad spawn rules. `1` = killquad mode active. |

KillQuad has no auxiliary tuning cvars; the mechanic is a single on/off switch. Related cvars (`dq`, `k_pow_q`) govern the standard quad-drop behavior that killquad bypasses when active.

## See also

- `killquad` -- in-game toggle command (paired with the cvar; pre-match only)
- `berzerk` -- incompatible mutation; activation flag `k_bzk`
- `dq` -- standard quad-drop cvar that killquad overrides
- `k_pow_q` -- enable/disable quad powerup family

<!-- triage notes: l3-upstream. No wiki page exists for killquad. Mechanical content drafted from the L1 description on `k_killquad` plus the use-sites grep across KTX source (world.c:969 + items.c:1974 + match.c:951 + commands.c:3130 + g_utils.c:1785). Berzerk-incompatibility derived from the `&& !k_berzerk` guard in items.c:1974. -->
