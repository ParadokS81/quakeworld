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

Midair, as the name implies, is an aim mode where only mid-air hits count. You start with only a rocket launcher. It is the splash-prediction counterpart to LGC's lightning-gun benchmark, and like LGC it is mutually exclusive with the other dmm4 mutators. You start it with `/midair` on a dmm4 server.

## Activate

Midair runs on dmm4. Get into dmm4 first (`/dmm4`, or join a dmm4 server), then type `/midair` in warmup -- it is refused unless dmm4 is set. It is an aim drill rather than a match, so from there you just play on a dmm4 aim map against a bot or another player. Enabling it switches off the other dmm4 mutators (instagib, LGC).

## Basic ruleset

Midair is a toggle on dmm4 that swaps the loadout and the scoring:

- **Stripped loadout** -- 250 health, 200 red armour, the Rocket Launcher and axe, unlimited rockets. The full dmm4 arsenal is gone, and there is nothing to pick up.
- **Rockets only, airborne only** -- only a rocket scores, only against an airborne target, and a clean hit is an instant kill regardless of the victim's stack. How high the target is sets the frag value (see *How it plays*).

## How it plays

The base is dmm4 -- a 1on1 aim drill on a small arena map -- but midair narrows it to one discipline: catching people in the air. Since a target only counts while airborne, the play is to lift your opponent off the ground -- rockets at their feet -- then catch them at the top of the arc. The higher above you they are when you connect, the bigger the frag.

A rocket only scores if the target is at least **128 units off the ground** -- the airgib minimum. Past that, the frag is set by the **height gap between you and the target**:

| Tier | Frags | Gap (target above you) |
|---|---|---|
| bronze | +1 | up to 256 |
| silver | +2 | over 256 |
| gold | +4 | over 512 |
| platinum | +8 | over 1024 |

Dead players drop backpacks worth +10 health; string about five frags together to break 300 health without dying and you're granted 30 seconds of Quad. In midair the Quad isn't about damage -- every hit already one-shots -- its effect is that your rockets fly twice as fast, which makes leading an airborne target far easier: a 30-second window where you can barely miss. When it runs out your health drops back to 100, so the big stack is spent rather than kept.

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
