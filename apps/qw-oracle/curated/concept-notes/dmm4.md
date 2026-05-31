---
title: "dmm4 (aim practice)"
summary: "Bare dmm4 is QuakeWorld's aim-practice mode: you spawn with the full arsenal and unlimited ammo on a small arena map and fight a straight 1on1, with no item management to distract from pure aim and movement. Set it with the `dmm4` command. It is the base that midair, LGC and instagib are built on."
slug: dmm4
topic: game-mode-reference
status: draft
authored_by: qw-oracle
scope: engine-scoped
engines_covered: [ktx]

experience_group: aim-practice
deathmatch_flag: 4
roster: "1on1 (by convention)"
loadout: full-spawn

source_ref: commands.c:728
activation_summary: "Type `dmm4` in the console on a KTX server (pre-match only); then play 1on1 on an aim map such as povdmm4. It is a deathmatch-flag command, not a UserMode -- there is no /dmm4 'match' to start in the way /4on4 starts one."
wiki_status: hybrid
wiki_page_slug: Deathmatch
introduced_in_version: "Kombat Teams (mod lineage)"
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:dmm4
  - ktx:cvar:dmm4_invinc_time
  - ktx:cvar:k_dmm4_gren_mode
  - ktx:cvar:k_disallow_weapons
  - ktx:cvar:k_midair
  - ktx:cvar:k_instagib
related_modes:
  - {slug: midair, relation: similar-shape}
  - {slug: lgc, relation: similar-shape}
---

# dmm4 (aim practice)

## Summary

Bare dmm4 is the aim-practice mode: you spawn with every weapon, full armor and health, and ammo that never runs out, then fight a 1on1 on a small purpose-built arena map. With no weapons to find and no ammo to manage, the entire game is aim, movement and rocket placement. Players invoke it directly with the `dmm4` command (it sets `deathmatch 4`), and "playing dmm4" is synonymous with "playing povdmm4," the map almost everyone practices on. It is also the foundation three other modes build on: midair, LGC and instagib all require dmm4 before they will enable.

## How it plays

You spawn on a full stack and fight; there is no item game to play. Every spawn is:

- **250 health, 200 red armor**
- **all weapons, with unlimited ammo** (the per-weapon decrement is skipped whenever `deathmatch` is 4 -- `weapons.c:830`, `:879`)
- **2 seconds of invincibility**, so you aren't fragged the instant you appear in a tight arena (the default; tunable -- see Hosting & settings)

From there the whole game is aim, movement and rocket placement. With nothing worth picking up and ammo that never drains, the item control that anchors a normal duel just isn't part of the mode.

The one piece of item economy that remains is the backpack. A dropped pack gives **+10 health**, stacking past 250, and reaching **300 health grants 30 seconds of bonus powers** -- in normal dmm4 that is both the Pentagram (invincibility) and the Quad, which dmm4 renames **"OctaPower"** (`items.c:2430`). Lightning gun is disabled while bonus power is active. The variants tune it: midair grants only the Quad, instagib a Ring of Shadows instead, and LGC and ToT switch the bonus off entirely (health just caps at 300).

dmm4 is the base layer for the aim-practice family: toggling midair or instagib is refused unless dmm4 is already set (`world.c:1760-1769`), and leaving dmm4 force-disables them (`commands.c:2889-2894`). So midair, LGC and instagib are each "dmm4 plus one rule."

## Starting a game

`dmm4` is a player command (`commands.c:728`, dispatched to `ChangeDM`), usable pre-match on a KTX server. Type it in the console and the server switches to `deathmatch 4`; then play your 1on1 on an aim map. Unlike `/4on4` or `/carena`, it is not a UserMode that "starts a match" -- it sets the base ruleset, and you fight from there. To go back, set another deathmatch value (`dmm3`, or activate any normal mode), which also clears any midair/instagib toggle.

## Maps

dmm4 is map-coupled: it is meant for small, enclosed arena maps with clean sightlines and room to rocket-jump.

- **povdmm4** -- the canonical aim map and, by a wide margin, the one dmm4 is actually played on. "Playing dmm4" and "playing povdmm4" are used interchangeably in practice.
- **amphi** -- the other classic aim arena named on the QWiki.
- **endif** / **nacmidair** -- airborne-friendly maps used when dmm4 is carrying the midair rule (see `midair`).

## History

Per the QWiki, dmm4 dates to the **Kombat Teams** modification (the lineage that became KTPro and then KTX), built specifically for practice on constructed arena maps. Over time povdmm4 became the de-facto standard surface, to the point that the map name now stands in for the mode itself.

## Hosting & settings

dmm4 needs no special server setup -- any KTX server lets a player type `dmm4` pre-match. An admin can also fix it as the base ruleset directly:

```
# server.cfg -- run the server on the dmm4 aim ruleset
set deathmatch 4
```

The tunables that shape dmm4 specifically:

- **`dmm4_invinc_time`** -- spawn-invincibility seconds: unset/0 uses the 2-second default (`DMM4_INVINCIBLE_DEFAULT`, `g_consts.h:317`), a positive value sets it (max 30), negative disables it. The respawn shield that keeps small-arena practice from devolving into spawn-fragging.
- **`k_dmm4_gren_mode`** -- a grenade-practice variant: grenades only detonate on a direct hit (the 2.5s timed explosion is replaced with removal, `weapons.c:1433`). Requires dmm4; midair and instagib switch it off.
- **`k_disallow_weapons`** -- a bitmask of weapons banned in dmm4 (default `16`, which bans the grenade launcher; `commands.c:4173`). The disallow command that edits it is itself dmm4-only (`commands.c:5257`).
- Match length is auto-set to `timelimit 3` when dmm4 is entered.

## See also

- `deathmatch-modes` -- the reference for the `deathmatch` flag values; dmm4 is value 4 (full arsenal, unlimited ammo).
- `midair`, `lgc` -- the aim-practice siblings, each dmm4 with one scoring rule added; both require dmm4 and are mutually exclusive with each other.
- `instagib` -- also built on dmm4 (a novelty FFA rather than aim drill).
- `tot`, `bloodfest`, `race` -- other KTX modes that run on the dmm4 ruleset for different reasons (bots, monsters, movement).

<!-- triage notes: option-a authoring. No game_mode row exists for dmm4 (the L1 extractor harvested UserModes + k_-mutators, not the ChangeDM command family) -- this note is anchored on the ktx:command:dmm4 entity (in related_entities), and experience_group / deathmatch_flag / loadout are set by hand from source rather than read from a row. Mechanism is a ChangeDM deathmatch-flag command, which is neither a UserMode `standalone` nor a k_-cvar `mutator`, so `kind` and `mode_default_init_array` are intentionally omitted (dmm4 has no _um_init array). Re-point to a ktx:game_mode:dmm4 row if extraction is later extended to the ChangeDM family. wiki_status hybrid: QWiki Deathmatch page supplied the Kombat-Teams origin + amphi/povdmm4 map names; mechanics verified against KTX 1.47-2-g67253dc source. -->
