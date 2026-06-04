---
title: "Bloodfest"
summary: "KTX's co-op survival mode: waves of Quake monsters pour onto a compatible map, growing larger every 20 seconds, and you and your teammates fight to stay alive. Each kill feeds you health and armour scaled to the monster's danger, and powerups drop off the dead. Played solo or as a team, it is a PvE break from deathmatch."
slug: bloodfest
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-04
scope: engine-scoped
engines_covered: [ktx]

experience_group: solo-pve
kind: standalone
deathmatch_flag: 0
loadout: full-spawn
objective: survive-the-waves
score_system: monster-kills

canonical_id: ktx:game_mode:bloodfest
gameplay_source_id: ktx
source_ref: world.c:971
wiki_status: hybrid
wiki_page_slug: Bloodfest
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:votecoop
  - ktx:cvar:k_bloodfest
  - ktx:cvar:k_monster_spawn_time
  - ktx:cvar:k_nightmare_pu
  - ktx:cvar:k_nightmare_pu_droprate
related_modes:
  - {slug: tot, relation: similar-shape}
---

## Summary

Bloodfest is KTX's co-op survival mode: instead of fighting other players, you and your teammates hold out against waves of Quake's monsters. A new wave spawns every 20 seconds, each larger than the last, until the map is swarming and you're overrun. Every monster you kill feeds you health and armour scaled to how dangerous it was, so staying aggressive is how you stay alive. It shines as a team game -- but team and self damage are on, so a teammate's stray quad rocket is as deadly as any monster.

## Activate

Type `/votecoop` and vote one of the supported maps (solo, your own vote starts it). When the first player readies, everyone else has 10 seconds to ready up too, or they sit out the round as spectators.

## Basic ruleset

The survival mechanics, all hardcoded:

- **Co-op survival, no respawns** -- once you die you're out for the round; it ends when the whole team is down.
- **Waves every 20 seconds** -- about 20 monsters in the first wave, each ~20% larger, capped at 100 alive at once.
- **Kills feed you** -- each monster grants health and armour scaled to its danger (capped at 250 / 200 red), and frags to match (see *How it plays*).
- **Team and self damage on** -- a careless quad rocket wipes a teammate as easily as a wave.

## How it plays

You spawn into a normal-looking Quake map, but the enemies are the game's monsters and they keep coming. The roster is the full bestiary, and since kills are your only source of health and armour (both capped at 250 / 200), what each is worth scales with how dangerous it is:

- **Shambler** -- the heavy hitter, worth the most: **+10 health, +8 armour**.
- **Vore** (`shalrath`) -- **+6 / +6** for its homing attack.
- **Fiend** (`demon1`) and **spawn** (`tarbaby`) -- **+4 / +4**; **hell knight** -- **+4 / +3**.
- **Ogre** -- **+3 / +2**.
- **Scrag** (`wizard`) -- **+2 / +2**; **enforcer** -- **+2 / +1**.
- **Grunt** (`army`), **knight**, **rottweiler** (`dog`), **zombie**, **fish** -- the fodder, **+1 / +1**.

Frags track the same scale, so a Shambler is worth about ten kills' worth and a grunt one.

Two things shape the fight beyond raw aim. First, **monsters take heavy damage from lava, slime and water** -- on the many maps with a lava pit, the hazard is a weapon you herd a wave into rather than something to avoid (fish are the exception, unharmed by liquid). Second, **monsters occasionally drop the Quad** (usually the only powerup a map enables -- see Hosting), its 30-second timer already bleeding on the ground; feed it to whoever is lowest on health, since the faster kills it brings convert straight back into health and armour. With no respawns and team damage on, a careless rocket can end a teammate's round as fast as a monster can.

## Maps

Bloodfest only runs on **purpose-supported maps** -- set up with monster spawn points and a layout suited to a survival fight. The supported set is: `arena3`, `arena5`, `barrel`, `bloodfest`, `dm4ish`, `death6`, `e1m7`, `fragyard`, `genocide`, `hohoho`, `kenya`, `pillar`, `q1dm17`, `rz1pondb`, `slaug`. Maps outside it aren't offered.

Most are dry or lava-based -- lava pits show up on roughly half the set and are the hazard you herd waves into -- which is why the water-and-fish rules rarely come into play.

## Hosting & settings

Bloodfest has no `k_allowed_free_modes` bit and no console preset -- it's reached by coop vote, and a stock KTX or nquake server already ships the supported maps and their configs, so there's nothing to enable: players just `/votecoop` a supported map. Voting a map execs `configs/usermodes/matchless/<mapname>.cfg`, which carries that map's settings. The shipped `bloodfest.cfg`:

```
# configs/usermodes/matchless/bloodfest.cfg (ships with KTX/nquake)
set k_bloodfest 1
set deathmatch 0           // coop
set coop 1
set skill 3                // nightmare; required for drops
set k_nightmare_pu 1
set k_nightmare_pu_droprate 0.04
set k_pow_q 1              // Quad on; Pent + Ring off below
set k_pow_p 0
set k_pow_r 0
```

- **`k_nightmare_pu`** (default `0`) -- turns monster powerup drops on. Off by default, so without it nothing drops at all.
- **`k_nightmare_pu_droprate`** (default `0.15`) -- per-kill drop chance; `bloodfest.cfg` lowers it to `0.04`.
- **`k_pow_q` / `k_pow_p` / `k_pow_r`** (default `1` each) -- which powerups can drop (Quad / Pentagram / Ring); bloodfest leaves only the Quad.

The wave timing, 100-monster cap and per-monster rewards are hardcoded, not config-set. Note the load, too: Bloodfest renders far more monsters and projectiles than a normal game, so it wants a fast CPU, a high `rate`, a modern ezQuake, and a Bloodfest-aware proxy if you route (Qizmo is not supported).

## See also

- `tot` (Tribe of Tjernobyl) -- the other solo/PvE mode, where the opponents are frogbots rather than monsters; both are a break from player-vs-player KTX.
- `ffa` -- the closest player-vs-player cousin in spirit: drop-in, chaotic, score-by-kills, but against people.
- `deathmatch-modes` -- reference on the `deathmatch` flag values.
