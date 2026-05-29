---
title: "Instagib"
summary: "A novelty gimmick imported from Quake 2/3: everyone carries one hitscan weapon -- the Coilgun -- that kills in a single hit from any range, with unlimited ammo. Built on dmm4 and set up as an FFA, it is played casually for a few rounds rather than as a competitive QuakeWorld format. Mutually exclusive with the other dmm4 mutators (midair, lgc)."
slug: instagib
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: novelty
kind: mutator
score_system: frags

canonical_id: ktx:game_mode:instagib
gameplay_source_id: ktx
source_ref: world.c:975
activation_summary: "Requires dmm4. Set deathmatch 4, then enable Instagib with k_instagib in server.cfg or the /instagib warmup toggle (refused if dmm4 is not active, and once a match is live). /instagib cycles through off and three reload speeds (slow / fast / extreme). Enabling it turns off midair, lgc, ToT and grenade mode, which it is mutually exclusive with."
wiki_status: hybrid
wiki_page_slug: Instagib
introduced_by: "Deurk (KTX implementation, 2007); concept from KTPro, originally a Quake 2 gametype"
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
  - ktx:cvar:k_dmgfrags
---

## Summary

Instagib is a novelty gimmick borrowed from Quake 2/3: every player spawns with a single hitscan weapon -- the **Coilgun** -- that is guaranteed to kill in one hit from any range, with unlimited ammo. There is nothing to pick up and nowhere to hide, so a round is pure aim and movement. Quake 1 never had a railgun, so this is an imported concept rather than a native QuakeWorld format; in KTX it is built on dmm4, set up as an FFA, and played for fun for a few rounds rather than as a competitive mode. It is one of the dmm4 mutators and cannot run at the same time as midair or LGC.

## How it plays

Every shot kills. The Coilgun is a hitscan weapon that does effectively unlimited damage on any hit, so range, armour and health do not matter -- if you are on target, the other player dies. Ammo is unlimited, so the whole game collapses to two things: putting the crosshair on someone first, and not being where their crosshair is. With no items to collect and no weapon to hunt for, Instagib plays on any map and is as much about dodging as aiming.

You actually carry two ways to kill. The Coilgun is the main weapon -- a high-velocity hitscan shot that punches through a player and keeps going until it hits a wall, so it can gib more than one person in a line. You also keep the **Axe**, and an axe kill is worth more than a coil kill because landing it is so much harder. Killing someone by **stomping** them (landing on their head) is worth the most of all. The end-of-match stats break your game down by coil gibs, axe gibs, stomps, multi-gibs and airborne gibs.

The Coilgun has rocket-launcher-style kickback, which means you can **coiljump** -- the same idea as a rocket jump, but with a hitscan shot and no explosion. KTX also measures the height of airborne kills, so fragging someone while you are both off the ground ("airgibs") is tracked and shown in the stats, giving skilled players something to chase beyond the raw frag count.

Because every shot is lethal, staying alive is hard, and KTX rewards a survival streak. **Each backpack you pick up adds 10 health**; if you string together enough packs to climb past 300 health without dying in between, you are granted **30 seconds of invisibility** (the Ring) -- a hunter's reward that makes you briefly much harder to see while you press the advantage. Dying resets the climb.

`/instagib` is not a simple on/off. It cycles through four states -- off, then three reload speeds: **slow**, **fast** and **extreme** -- each step making the weapon fire faster and the round more frantic. (Older KTPro instagib offered only two shotgun-based speeds; current KTX has the three-speed cycle.)

## Starting a game

Instagib runs on a dmm4 server. On one, any player can turn it on during warmup by typing `/instagib` in the console -- each use steps to the next speed (off, slow, fast, extreme) and it is refused once a match is in progress. It cannot run alongside `midair` or `LGC`; enabling Instagib automatically turns those off (along with ToT and grenade mode). An admin can also preset it server-side -- see Hosting & settings.

Because Quake 1 has no native railgun, the Coilgun uses a borrowed weapon model -- the shotgun and super-shotgun models by default, or a dedicated Coilgun model and sound if the server enables custom models. There is nothing else for a player to set up; pick your fights and shoot first.

## History

The instagib gametype began in Quake 2 with the railgun and spread widely -- it became especially popular in Unreal Tournament, often combined with CTF and deathmatch. In QuakeWorld it first appeared in **KTPro**, where (on dmm8) it repurposed the Lightning Gun as a rail-like instant-kill weapon. After a few dormant years, **Deurk** of the KTX team revived and rebuilt it for KTX in October 2007, replacing the LG approach with the purpose-built Coilgun -- a hitscan weapon with its own model (by Orion), sound, and the through-target penetration that lets a single shot gib a line of players. It remains a for-fun curiosity in QuakeWorld rather than a competitive discipline.

## Hosting & settings

Instagib is a dmm4 mutator, not one of the server's free modes, so there is no `k_allowed_free_modes` bit for it. An admin enables it on top of a dmm4 server -- and because it is FFA-flavoured, usually a matchless/FFA box:

```
# server.cfg -- Instagib rides on dmm4
deathmatch 4
set k_instagib 1            // 1 slow, 2 fast, 3 extreme (0 = off)
set k_instagib_custom_models 1   // use the Coilgun model instead of the SG/SSG models
```

- **`k_instagib`** (default `0`) -- the activation level. `1`/`2`/`3` are the slow/fast/extreme reload speeds; the `/instagib` command cycles `0 -> 1 -> 2 -> 3 -> 0`. Setting it requires dmm4 (`deathmatch 4`).
- **`k_instagib_custom_models`** -- swap the borrowed shotgun models for the dedicated Coilgun model and sound.
- **`k_cg_kb`** (Coilgun kickback) -- enables the rocket-jump-style kickback that makes coiljumps possible; KTX turns it on automatically whenever Instagib is enabled. The `/instagib_coilgun_kickback` command toggles it.

Enabling Instagib clears the cvars it conflicts with: `k_midair`, `k_lgcmode`, the ToT toggle and `k_dmm4_gren_mode` are all set to `0`. It is mutually exclusive with midair and LGC in both directions -- enabling either of those turns Instagib off in turn.

## See also

- `midair` -- the other main dmm4 aim mutator (score only for mid-air kills). Mutually exclusive with Instagib: enabling either one turns the other off.
- `lgc` -- the Lightning Gun-only dmm4 mutator, also mutually exclusive with Instagib.
- `ffa` -- the free-for-all setup Instagib is usually played on; like Instagib it leans on `dq`/`dr` powerup play in its normal form, though Instagib strips the game down to the Coilgun.
- `deathmatch-modes` (pending) -- reference on the `deathmatch` flag values, including dmm4, the full-arsenal aim-map ruleset Instagib is built on.
