<!-- source: https://quakewiki.org/wiki/monster_zombie | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Zombie - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_zombie

Markdown Content:
[](https://quakewiki.org/wiki/monster_zombie)

## From Quake Wiki

(Redirected from [monster zombie](https://quakewiki.org/w/index.php?title=monster_zombie&redirect=no "monster zombie"))

| **Zombie** |
| --- |
| [![Image 1: Zombie](https://quakewiki.org/w/images/thumb/9/9b/monster_quake_zombie.png/300px-monster_quake_zombie.png)](https://quakewiki.org/wiki/File:monster_quake_zombie.png) _"Thou canst not kill which dost not live. But you can blast it into chunky kibbles."_ **Health**60 (regenerates to full health on any damage) **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**0 (must be gibbed to be killed) **Attacks**Thrown gibs **Drop**nothing **1st appearance**[e1m3](https://quakewiki.org/wiki/e1m3 "e1m3") **Game version**†Shareware **Death message**_Player joins the Zombies_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Zombies** are truly unique. They rip pieces of flesh off themselves and throw them at you for their attack. To kill them, you must gib them. If you do not, they will simply fall over and get up later. You will need to bring their health to zero in a single take, meaning you need to do 60 damage at least, this is most easily done with explosives as demonstrated in the stock _demo1.dem_, but can also be achieved via [Quad Damage](https://quakewiki.org/wiki/Quad_Damage "Quad Damage") attacks with other weapons.

## Tactics

The Zombie can only be killed by a lot of damage in a very short time, resulting in [gibbing](https://quakewiki.org/wiki/Gib "Gib"). By default only the explosive weapons [Grenade Launcher](https://quakewiki.org/wiki/Grenade_Launcher "Grenade Launcher") and [Rocket Launcher](https://quakewiki.org/wiki/Rocket_Launcher "Rocket Launcher") can deal that much damage. But when wielding a [Quad Damage](https://quakewiki.org/wiki/Quad_Damage "Quad Damage") any other weapons except for the [Nailgun](https://quakewiki.org/wiki/Nailgun "Nailgun") will gib a Zombie. So usually the weapons of choice will be the explosive ones. Giving an explosive weapon to the player shortly before a Zombie encounter is a common trope in custom maps.

When hurt for a medium amount of damage Zombies will fall to the floor and "rest" for a while. During that state they are invincible.

Zombies move very slowly and throw parts of their body at the player. Harmless in low numbers but dangerous in groups or tight situations.

| **monster_zombie** ([Zombie](https://quakewiki.org/wiki/monster_zombie)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**32 x 32 x 64 **Quake-C**[zombie.qc](https://quakewiki.org/wiki/zombie.qc "zombie.qc") **Precaches**progs/zombie.mdl progs/h_zombie.mdl progs/zom_gib.mdl zombie/z_idle.wav zombie/z_idle1.wav zombie/z_shot1.wav zombie/z_gib.wav zombie/z_pain.wav zombie/z_pain1.wav zombie/z_fall.wav zombie/z_miss.wav zombie/z_hit.wav zombie/idle_w2.wav |

## Entity information

**monster_zombie** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Zombies** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Zombie. When triggered, the Zombie will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Zombie dies.
_killtarget_ The targetname of the entity to be removed when the Zombie dies.

#### Spawnflags

The monster_zombie entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Zombie will not wake up from seeing other monsters wake up or hearing sounds. |
| 2 | Crucified | The Zombie will become a writhing cruified Zombie prop that can be used as level decoration and is not treated as a monster in game. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Zombie will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Zombie will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Zombie will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Zombie will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/zombie.mdl")
    = monster_zombie : "Zombie" []
[
	spawnflags(Flags) = 
	[
		1 : "Crucified" : 0
		2 : "Ambush" : 0
	]
]

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_zombie (1 0 0) (-16 -16 -24) (16 16 40) Crucified Ambush
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Zombie&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Spirit)
[Spirit](https://quakewiki.org/wiki/User:Spirit "User:Spirit") made an edit on 11 September 2021

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Zombie&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Zombie)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Zombie&oldid=4206)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Zombie)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
