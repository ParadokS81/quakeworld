---
title: "Midair"
summary: "A dmm4 aim mutator where only kills of airborne opponents count: you score by blasting jumping or rocket-jumping players out of the air, so it rewards splash-weapon prediction rather than tracking. Built on the same full-arsenal dmm4 base as LGC, and mutually exclusive with the other dmm4 mutators."
slug: midair
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: aim-practice
kind: mutator
score_system: midair-kills

canonical_id: ktx:game_mode:midair
gameplay_source_id: ktx
source_ref: world.c:966
activation_summary: "Requires dmm4. Set deathmatch 4, then enable it with k_midair 1 in server.cfg or the /midair warmup toggle (refused if dmm4 is not active). Enabling midair turns off instagib, LGC, ToT and gren-mode, which it is mutually exclusive with."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:midair
  - ktx:cvar:k_midair
  - ktx:cvar:k_midair_minheight
  - ktx:cvar:k_instagib
related_modes:
  - {slug: lgc, relation: incompatible-with}
  - {slug: instagib, relation: incompatible-with}
---

## Summary

Midair is an aim mutator built on dmm4: every player spawns with the full arsenal on a small aim map, no items, but the scoring rule is changed so that **only a kill against an airborne opponent counts**. You score by reading where a jumping or rocket-jumping player will be and hitting them in the air with a rocket or grenade -- a ground kill is worth nothing. It is the splash-prediction counterpart to LGC's lightning-gun benchmark, and like LGC it is mutually exclusive with the other dmm4 mutators.

## How it plays

The base is dmm4 -- full weapons on spawn, no item pickups, played on the small aim maps (`povdmm4` and the airborne-friendly arenas; there is even a dedicated `nacmidair`). What midair changes is what scores: a frag only registers if the victim is off the ground and above a minimum height when they die. So the entire game becomes about catching people in the air. You bait jumps, watch rocket-jumpers, and lead your rocket or grenade to where the target will be at the top of their arc; kills are announced with a height-based rank, so a clean high one is its own reward. It rewards prediction and splash placement rather than the continuous tracking that the lightning gun demands, which is why it sits alongside LGC as the other half of the dmm4 aim-practice pair.

The minimum height that makes a kill count is tunable: `k_midair_minheight` runs from 1 (128 units, the default) up to 4 (1024 units), so a server can demand higher and higher airborne kills.

## Starting a game

Midair runs on a dmm4 server. On one, any player can turn it on in warmup by typing `/midair` -- it is refused unless dmm4 is set. Because it is an aim mutator rather than a match format, you then just play on a dmm4 aim map, against a bot or another player. It cannot run alongside `instagib` or `LGC`; enabling it switches those off.

## Hosting & settings

Midair is a toggle layered on dmm4, not one of the server's free modes, so there is no `k_allowed_free_modes` bit for it:

```
# server.cfg -- midair rides on dmm4
deathmatch 4
k_midair 1
```

- **`k_midair`** (default `0`) -- the activation toggle; the `/midair` warmup command flips it, and refuses outside dmm4.
- **`k_midair_minheight`** (default `1`) -- the minimum airborne height for a kill to count: `1`=128, `2`=256, `3`=512, `4`=1024 units.

Enabling midair clears the cvars it conflicts with -- `k_instagib`, `k_lgcmode`, the ToT toggle, and dmm4 gren-mode are all set to `0` -- so only one dmm4 mutator is ever active at a time.

## See also

- `lgc` -- the other dmm4 aim mutator (score by lightning-gun damage). Mutually exclusive with midair: enabling either turns the other off.
- `instagib` -- also a dmm4 mutator and likewise mutually exclusive with midair.
- `deathmatch-modes` (pending) -- reference on the `deathmatch` flag values, including dmm4, the full-arsenal aim-map base midair is built on.
