---
title: "LGC"
summary: "A Lightning Gun-only ruleset for measuring tracking aim, layered on dmm4: every player spawns with just the Lightning Gun, red armour and unlimited ammo, nothing can be picked up, and the score is the damage you land -- every 100 points is a frag. The toggle sets only the ruleset and leaves the format open: a solo benchmark against a fixed-skill bot (as it was originally played) or a head-to-head LG duel."
slug: lgc
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: aim-practice
kind: mutator
score_system: damage-frags

canonical_id: ktx:game_mode:lgc
gameplay_source_id: ktx
source_ref: world.c:1083
wiki_status: l3-upstream
wiki_page_slug: LGC
introduced_by: "meag (KTX implementation); concept from the Lightning Gun Competition tournament (phil)"
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:lgcmode
  - ktx:cvar:k_lgcmode
  - ktx:cvar:k_midair
  - ktx:cvar:k_instagib
  - ktx:cvar:k_dmgfrags
related_modes:
  - {slug: dmm4, relation: similar-shape}
  - {slug: midair, relation: incompatible-with}
  - {slug: instagib, relation: incompatible-with}
---

## Summary

LGC is a Lightning Gun-only ruleset for measuring tracking aim. Built on dmm4, it strips every player down to a Lightning Gun, red armour and unlimited ammo; nothing on the map can be picked up, and your score is the damage you land -- every 100 points is a frag. The `/lgcmode` toggle sets only that ruleset and leaves the format open: a solo benchmark against a fixed-skill bot (as it was originally played) or a head-to-head LG duel. It is mutually exclusive with the other dmm4 mutators. You start it with `/lgcmode` on a dmm4 server.

## Activate

Get into dmm4 (`/dmm4`), then type `/lgcmode` in warmup. You can play it as originally intended -- against a bot -- or head-to-head with a friend. To set up a bot, type `/botcmd skill 10` (skill ranges 0-20), then `/botcmd addbot`. Enabling LGC switches off the other dmm4 mutators (midair, instagib).

## Basic ruleset

LGC is a toggle on dmm4 that locks every player to one weapon:

- **LG-only loadout** -- 250 health, 200 red armour, the Lightning Gun and unlimited cells. No axe, no other weapon, and nothing on the map to pick up.
- **Damage is the score** -- normal kill-frags are off; every 100 points of Lightning Gun damage you deal counts as one frag.

## How it plays

What makes LGC a benchmark rather than just a duel is the readout: your frag count is a clean measure of one thing -- how much shaft you land. The end-of-match stats go further, breaking your Lightning Gun into over- and under-shaft counts and a hit percentage by range -- the "LG%" the mode is judged on.

## History

LGC takes its name and rules from the Lightning Gun Competition, an exhibition tournament run by phil at lgc.quakeworld.nu. It was played offline against a fixed-skill frogbot tuned to favour the Lightning Gun, on dmm4 aim maps like povdmm4, with each entrant submitting a demo. The bot was the point: it removed online lag and gave everyone the identical opponent, so LG scores (ranked as LG% times damage) could be compared player to player, with tongue-in-cheek tiers for the top shafters. meag brought the format into KTX as a live server mode in 2017. The original site is gone and the competition is dormant, but the ruleset lives on in KTX -- so the benchmark, or a head-to-head, can still be set up on any server.

## Hosting & settings

LGC is a toggle layered on dmm4, not one of the server's free modes, so there is no `k_allowed_free_modes` bit for it -- an admin pins it on top of a dmm4 server:

```
# server.cfg -- LGC rides on dmm4
deathmatch 4
k_lgcmode 1
```

- **`k_lgcmode`** (default `0`) -- the activation toggle. The LG-only loadout, the item lockout and the damage-frag scoring are all hardcoded to it; there are no tuning cvars.

Enabling LGC clears the cvars it conflicts with (`k_midair`, `k_instagib` and `k_dmgfrags` are set to `0`) and resets handicap, so every player is on identical footing.

## See also

- `midair` -- the other dmm4 aim mutator (score only for mid-air kills). Mutually exclusive with LGC.
- `instagib` -- also a dmm4 mutator, and likewise mutually exclusive.
- `dmgfrags` -- the standalone damage-frag scoring toggle; LGC uses the same 100-damage path, so `dmgfrags` is switched off while LGC is on.
- `dmm4` -- the full-arsenal aim base LGC strips down and builds on.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including dmm4.
