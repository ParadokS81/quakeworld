---
title: "Yawnmode"
summary: "An informal modifier, created by Molgrum, that changes the feel of a duel rather than its rules: fall damage is removed, nailgun hits knock harder, green armor protects more, and spawns and respawn behavior are retuned. A rarely-used 1on1 oddity layered on a normal game, not a competitive format."
slug: yawnmode
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:yawnmode
gameplay_source_id: ktx
source_ref: world.c:1011
activation_summary: "Set k_yawnmode 1 in server.cfg (or toggle it with the yawnmode command during warmup). Then start a base mode -- it was built as a 1on1 modification -- and Yawnmode's tweaks layer on top."
wiki_status: hybrid
wiki_page_slug: Yawnmode
introduced_by: Molgrum
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:yawnmode
  - ktx:cvar:k_yawnmode
related_modes:
  - {slug: 1on1, relation: derived-from}
  - {slug: berzerk, relation: similar-shape}
---

## Summary

Yawnmode is an informal match-modifier built by Molgrum as a variation on the duel. It does not change the objective -- you still frag to win -- but it retunes the feel of the game: fall damage is gone, nailgun hits push harder, green armor is worth more, and spawns and respawns behave differently from a normal match. It is a quirky, rarely-used oddity rather than a competitive format, layered on a base mode with a single toggle.

## How it plays

The underlying game (typically a 1on1) is unchanged in its goal; what Yawnmode alters is the movement and combat feel, through a bundle of tweaks. The clearest ones: fall damage is removed -- you keep your velocity on landing instead of taking the usual hit (the source calls it "no broken ankle") -- and nailgun spikes land with extra kickback, so the nailgun shoves harder than usual. Green armor gives more protection than standard (0.4 absorption rather than 0.3), and spawn placement is reweighted to different spots than a normal game uses. The community wiki documents further small changes (respawn timing, always respawning with your last weapon, corpse and fireball handling). The net result is a looser, bouncier duel -- a mode kept around for variety, not for serious play. While it is active it also blocks some admin commands.

## Starting a game

Yawnmode is enabled by an admin, not started as its own match. Set it on the server (see Hosting & settings), or toggle it in warmup with the `yawnmode` command, then start a base mode -- it was written as a 1on1 modification, so a duel is its natural home. Its tweaks apply automatically; there is nothing extra for a player to do.

## Hosting & settings

Yawnmode is a single cvar toggle, not gated by `k_allowed_free_modes`:

```
# server.cfg (Yawnmode -- a modifier toggle)
set k_yawnmode 1
```

- **`k_yawnmode`** (default `0`) -- the only cvar; the `yawnmode` warmup command flips it. Its effects (fall-damage removal, nail kickback, armor and spawn changes) are built in rather than individually tunable.

Note that Yawnmode blocks certain admin commands while it is active, reporting "command blocked because yawnmode is active."

## See also

- `1on1` -- the duel Yawnmode was built to modify.
- `berzerk`, `killquad` -- other match-modifiers that layer a single change onto a base game.
