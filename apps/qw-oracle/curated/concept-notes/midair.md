---
title: "Midair"
summary: "A dmm4 aim mutator where only kills of airborne opponents count: instead of the full dmm4 arsenal you spawn with just the Rocket Launcher and axe, and you score by blasting jumping or rocket-jumping players out of the air. A clean airborne rocket is an instant kill; a target at floor level can't be hit at all. Mutually exclusive with the other dmm4 mutators."
slug: midair
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: aim-practice
kind: mutator
score_system: midair-kills

canonical_id: ktx:game_mode:midair
gameplay_source_id: ktx
source_ref: world.c:966
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:midair
  - ktx:command:midair_minheight
  - ktx:cvar:k_midair
  - ktx:cvar:k_midair_minheight
  - ktx:cvar:k_instagib
related_modes:
  - {slug: dmm4, relation: similar-shape}
  - {slug: lgc, relation: incompatible-with}
  - {slug: instagib, relation: incompatible-with}
---

## Summary

Midair is an aim mutator built on dmm4. Instead of the full dmm4 arsenal, every player spawns with just the Rocket Launcher and axe, and the scoring rule is changed so that **only a kill against an airborne opponent counts**. You score by reading where a jumping or rocket-jumping player will be and catching them in the air with a rocket -- a target at floor level can't be hit at all, and a clean airborne hit is an instant kill. It is the splash-prediction counterpart to LGC's lightning-gun benchmark, and like LGC it is mutually exclusive with the other dmm4 mutators. You start it with `/midair` on a dmm4 server.

## Activate

Midair runs on dmm4. Get into dmm4 first (`/dmm4`, or join a dmm4 server), then type `/midair` in warmup -- it is refused unless dmm4 is set. It is an aim drill rather than a match, so from there you just play on a dmm4 aim map against a bot or another player. Enabling it switches off the other dmm4 mutators (instagib, LGC).

## Basic ruleset

Midair is a toggle on dmm4 that replaces both the loadout and the scoring:

- **Stripped loadout** -- 250 health, 200 red armour, and only the Rocket Launcher and axe (255 rockets, no other ammo). The full dmm4 arsenal is gone, and there is nothing to pick up.
- **Airborne targets only** -- a rocket counts only if the target is at least 128 units off the ground (the airgib minimum, `k_midair_minheight`; raisable to 256, 512 or 1024). You cannot score on a target at floor level, and every non-rocket weapon does nothing.
- **A clean hit is an instant kill** -- a qualifying rocket kills regardless of the victim's stack.
- **Frags scale with height** -- the higher the target is above you when you connect, the bigger the frag: **+1** bronze, **+2** silver (over 256), **+4** gold (over 512), **+8** platinum (over 1024), each announced with its height and rank.

## How it plays

The base is dmm4 -- a 1on1 aim drill on a small arena map -- but midair narrows it to a single discipline: catching people in the air. The whole game is prediction. You bait jumps, watch the rocket-jumpers, and lead your shot to where the target will be at the top of its arc; there is no tracking and no chipping a stack down, and the higher the air, the bigger the frag, so a towering platinum is its own trophy.

Then there is the comeback rhythm. Dead players drop backpacks, and each one adds 10 health; string enough together to climb past 300 without dying and you are granted 30 seconds of Quad. In midair the Quad is not about damage -- every hit already one-shots -- its effect is that your rockets fly twice as fast (the missiles turn blue), which makes leading an airborne target far easier: a 30-second window where you can barely miss. When it runs out your health drops back to 100, so the big stack is spent rather than kept.

## Maps

Midair plays on small arena aim maps with the headroom to get airborne. **`endif`** is the staple, with `povdmm4` and the purpose-built `nacmidair` also well suited; any compact map with enough vertical space works.

## Hosting & settings

Midair is a toggle layered on dmm4, not one of the server's free modes, so there is no `k_allowed_free_modes` bit for it -- an admin pins a midair server on top of dmm4:

```
# server.cfg -- midair rides on dmm4
deathmatch 4
k_midair 1
```

- **`k_midair`** (default `0`) -- the activation toggle; the `/midair` warmup command flips it, and refuses outside dmm4.
- **`k_midair_minheight`** (default `1`) -- the minimum height off the ground for a kill to count: `1`=128, `2`=256, `3`=512, `4`=1024 units; the `/midair_minheight` command sets it in warmup.

Enabling midair clears the cvars it conflicts with -- `k_instagib`, `k_lgcmode`, the ToT toggle and dmm4 gren-mode are all set to `0` -- so only one dmm4 mutator is ever active at once.

## See also

- `lgc` -- the other dmm4 aim mutator (score by lightning-gun damage). Mutually exclusive with midair.
- `instagib` -- also a dmm4 mutator, and likewise mutually exclusive.
- `dmm4` -- the full-arsenal aim base midair strips down and builds on.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including dmm4.
