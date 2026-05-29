---
title: "LGC"
summary: "A Lightning Gun-only ruleset for measuring aim, layered on dmm4: every player spawns with just the Lightning Gun, red armour and a full load of cells, nothing can be picked up, and the score is the damage you land. The toggle sets only the ruleset and leaves the format open -- the original Lightning Gun Competition was a solo benchmark against a fixed-skill bot, but the same mode works as a head-to-head LG duel."
slug: lgc
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: aim-practice
kind: mutator
score_system: damage-frags

canonical_id: ktx:game_mode:lgc
gameplay_source_id: ktx
source_ref: world.c:1083
activation_summary: "Requires dmm4. Set deathmatch 4, then enable LGC with k_lgcmode 1 in server.cfg or the /lgcmode warmup toggle (refused if dmm4 is not active, and once a match is live). Enabling LGC turns off midair, instagib and dmgfrags, which it is mutually exclusive with. The opponent and skill are set up separately -- /lgcmode only applies the ruleset, so it serves both a solo bot benchmark and a player-vs-player duel."
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
  - {slug: midair, relation: incompatible-with}
  - {slug: instagib, relation: incompatible-with}
---

## Summary

LGC is a Lightning Gun-only ruleset for measuring aim. Built on dmm4, it strips every player down to a single weapon: you spawn with only the Lightning Gun, red armour and a full load of cells, nothing on the map can be picked up, and your score is the damage you land -- every 100 points is a frag. The `/lgcmode` toggle sets only that ruleset and leaves the format open: the original Lightning Gun Competition was a solo benchmark against a fixed-skill bot, but the same mode works just as well as a head-to-head LG duel. It is mutually exclusive with the other dmm4 mutators (midair, instagib).

## How it plays

Every player spawns identically and equipped for one thing: 250 health, 200 red armour, the Lightning Gun, and 255 cells. There is no axe and no other weapon, and item pickups are switched off entirely, so the map's armour, health and weapons never come into it. The only thing that scores is Lightning Gun damage -- normal kill-frags are off, and every 100 points of damage you deal counts as one frag, so the scoreboard is a direct readout of how much shaft you are landing. The end-of-match stats go further, breaking your Lightning Gun down into over- and under-shaft counts and a hit percentage by range -- the "LG%" the mode is judged on.

The toggle does just that one thing -- set the Lightning Gun ruleset -- and deliberately stops there. It does not choose your opponent or set a skill level, and that separation is the point: the same mode can host the classic solo benchmark against a fixed-skill bot, a bot challenge pitched harder or easier, or a straight player-versus-player LG duel, without the mod itself having to change when the challenge rules do. The original Lightning Gun Competition was the solo-vs-bot form -- a bot removed online lag and gave every entrant the identical opponent, so LG scores could be ranked against each other, and KTX keeps the bot a stable yardstick whose aim does not drift as your own climbs. It is played on the small dmm4 aim maps, povdmm4 the classic.

## Starting a game

LGC runs on a dmm4 server. On one, any player can turn it on during warmup by typing `/lgcmode` in the console -- it is refused once a match is in progress, and it cannot run alongside `midair` or `instagib`. (An admin can also preset it server-side; see Hosting & settings.)

You then need an opponent. LGC sets the ruleset, not the format, so it is played either against a bot -- the classic solo benchmark -- or head-to-head against another player. Adding a bot and setting its skill is server-side; see Hosting & settings.

## History

LGC takes its name and its rules from the Lightning Gun Competition, an exhibition tournament run by phil at lgc.quakeworld.nu. It was played offline against a fixed-skill frogbot configured to favour the Lightning Gun, on dmm4 aim maps such as povdmm4, with each entrant submitting a demo. Playing a bot rather than a person was deliberate -- it removed online lag and gave everyone the identical opponent, so scores (ranked as LG% times damage) could be compared player to player, with tongue-in-cheek tiers for the top shafters. meag brought the format into KTX as a live server mode in 2017 (the `/lgcmode` toggle). The original site is no longer running and the competition itself is dormant, but the ruleset remains in KTX -- so the format, whether a bot benchmark or a head-to-head, can still be set up on any server.

## Hosting & settings

LGC is a toggle layered on dmm4, not one of the server's free modes, so there is no `k_allowed_free_modes` bit for it. An admin enables it on top of a dmm4 server:

```
# server.cfg -- LGC rides on dmm4
deathmatch 4
k_lgcmode 1
```

There is one knob:

- **`k_lgcmode 1`** -- the activation toggle (default `0`). The LG-only loadout, the item lockout, the damage-frag scoring and the no-overtime behaviour are all hardcoded to it; there are no auxiliary tuning cvars.

The rest is left to you on purpose. The opponent and skill are configured separately -- `/lgcmode` sets the ruleset, not the format -- so you add a bot (at whatever skill the challenge calls for) or bring a second player. Enabling LGC also clears the cvars it conflicts with (`k_midair`, `k_instagib` and `k_dmgfrags` are all set to `0`), and the `/handicap` command is blocked while it is active, so every player is on identical footing.

## See also

- `midair` -- the other main dmm4 aim mutator (score only for mid-air kills). Mutually exclusive with LGC: enabling either one turns the other off.
- `instagib` -- also mutually exclusive with LGC, and likewise built on dmm4.
- `dmgfrags` -- the standalone damage-frag scoring toggle. LGC uses the same scoring path, so `dmgfrags` is switched off and refused while LGC is on.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including dmm4, the full-arsenal aim-map ruleset LGC is built on.
