---
title: "Bloodfest"
summary: "A co-op survival mode against the computer: waves of Quake monsters pour in on a compatible map, growing 20% larger every 20 seconds, and you and your teammates fight to stay alive and rack up kills. Each monster killed feeds you health and armour; the Quad drops to keep the strongest player swinging. Played solo or as a team, it is a PvE break from the usual deathmatch."
slug: bloodfest
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: solo-pve
kind: standalone
loadout: full-spawn
objective: survive-the-waves
score_system: monster-kills

canonical_id: ktx:game_mode:bloodfest
gameplay_source_id: ktx
source_ref: world.c:971
activation_summary: "Bloodfest is started by vote, not a console preset: on a compatible server type /votecoop and vote in a supported map (arena3, bloodfest, e1m7, ...). When the first player readies, the rest get 10 seconds to ready up or be put to spectate. The k_bloodfest cvar carries the mode; there is no /bloodfest command (it is disabled in the command table)."
wiki_status: hybrid
wiki_page_slug: Bloodfest
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:cvar:k_bloodfest
  - ktx:cvar:k_monster_spawn_time
---

## Summary

Bloodfest is KTX's co-op survival mode: instead of fighting other players, you and your teammates hold out against waves of Quake's monsters. A new wave spawns every 20 seconds, each one about 20% bigger than the last, so the pressure climbs until the map is swarming and you are overrun. Every monster you kill feeds you a little health and armour, and the Quad drops into play to keep someone hitting hard. It can be played solo, but it shines as a team game -- though friendly fire is on, so a teammate's stray quad rocket is as deadly as any monster. It is a complete change of pace from deathmatch: PvE, frantic, and built for a few people to pile in and see how long they last.

## How it plays

You spawn into a normal-feeling Quake map, but the enemies are the game's monsters rather than other players, and they keep coming. Monsters arrive in **waves on a 20-second timer**: the first wave is about 20 strong, and each following wave is roughly 20% larger, so what starts as a manageable trickle becomes a flood. The server caps how many monsters and projectiles can exist at once (to keep it from melting the framerate), but within that ceiling the difficulty only ever ramps up -- Bloodfest is survival, not a level you finish.

The roster is the full Quake bestiary, and what each monster is worth scales with how dangerous it is. Killing one rewards you with health and armour on the spot, so staying aggressive is how you stay alive:

- **Shambler** -- the heavy hitter, worth the most (`+10` health, `+8` armour on a kill), and the one monster that can spawn as a **boss** with vastly inflated health.
- **Ogre**, **fiend** (`demon1`), **spawn** (`tarbaby`), **hell knight** -- mid-tier, worth `+3` to `+4` health each.
- **Vore** (`shalrath`) -- `+6` health / `+6` armour for its homing attack.
- **Scrag** (`wizard`), **enforcer** -- `+2` each.
- **Grunt** (`army`), **knight**, **rottweiler** (`dog`), **zombie**, **fish** -- the fodder, `+1` each.

Two things shape the fight beyond raw aim. First, **monsters take heavy environmental damage** -- on the many supported maps with a lava pit (and the occasional slime), the hazard is a weapon you can herd a wave into rather than something to avoid. (Fish are the exception, unaffected by liquids, but they only matter on the rare water map.) Second, the **Quad drops into the fight** off killed monsters; its timer bleeds away while it lies on the ground so it has to be grabbed fast, and time stacks only up to 30 seconds. The smart play is to feed the Quad to whoever is lowest on health, since the faster kills it brings translate straight back into health and armour. Team and self damage are both on, so a careless quad rocket is as likely to wipe a teammate as a monster.

## Starting a game

Bloodfest is started by a vote, not by a mode command. On a compatible server, type `/votecoop` and then vote in one of the supported maps. Once the first player readies up, everyone else has **10 seconds** to ready as well; anyone who does not is put to spectate for the round. From there you just survive -- there is nothing to enable per-player, and there is no `/bloodfest` console command (it exists in the code but is disabled, so the votecoop path is the way in).

Because Bloodfest renders far more monsters and projectiles than a normal game, it is demanding on the client: a fast CPU and a high `rate` help avoid frame drops, and it expects a reasonably modern ezQuake. Routing proxies need to be Bloodfest-aware (Qizmo is not supported).

## Maps

Bloodfest only runs on **purpose-supported maps** -- ones set up with monster spawn points and the right layout for a survival fight -- which is why activation goes through voting a compatible map rather than loading any arena. The supported set includes the dedicated `bloodfest` map alongside `barrel`, `dm4ish`, `e1m7`, `genocide`, `hohoho`, `kenya`, `q1dm17`, `arena3`, `arena5`, `death6`, `fragyard`, `pillar`, `slaug` and `rz1pondb`. Maps outside this set simply are not offered for Bloodfest.

These maps are almost all dry or lava-based -- lava pits show up on roughly half the set (`e1m7`, `dm4ish`, `death6`, `genocide`, `fragyard`, `arena5`) and are the environmental hazard you actually fight around, herding waves into them. Standing water is essentially absent (only `kenya` has any), which is why the mode's fish-and-water rules rarely come into play -- monster AI and a flood of enemies suit dry, open arenas far better than swimming ones.

## Hosting & settings

Bloodfest is a coop/single-only mode carried by the `k_bloodfest` cvar, and unlike the other modes it is entered **by vote**, not by a usermode preset or a direct command. There is no `k_allowed_free_modes` bit for it and no working `/bloodfest` command (the command exists in the table but is commented out); the supported entry point is a coop vote on a compatible map:

```
# in-game -- players start Bloodfest by vote
/votecoop          // then vote one of the supported maps (see Maps)
```

- **`k_bloodfest`** (default `0`) -- the cvar that marks the mode active; it is set by the votecoop flow rather than edited by hand.
- **`k_monster_spawn_time`** -- the wave cadence (the engine default issues a wave roughly every 20 seconds, each ~20% larger than the last).

The wave sizing, the 100-monster / projectile ceilings, the per-monster kill rewards and the boss mechanic are all built into the mode and not individually server-tunable. The server side is mostly about being ready for it: permit the coop vote, carry the supported maps, and expect the load -- Bloodfest renders far more monsters and projectiles than a normal game, so clients need high rates and good hardware, and an unsupported map has no monster setup and will not play.

## See also

- `tot` (Tribe of Tjernobyl) -- the other solo/PvE mode, where the opponents are frogbots rather than monsters; both are a break from player-vs-player KTX.
- `ffa` -- the closest player-vs-player cousin in spirit: drop-in, chaotic, score-by-kills, but against people instead of monsters.
- `k_monster_spawn_time` -- the wave-interval cvar.
- `deathmatch-modes` -- reference on the `deathmatch` flag values; Bloodfest, like the other dmm4-family modes, runs with ammo that never depletes.
