<!-- source: https://quakewiki.org/wiki/monster_enforcer | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Enforcer - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_enforcer

Markdown Content:
[](https://quakewiki.org/wiki/monster_enforcer)

## From Quake Wiki

(Redirected from [monster enforcer](https://quakewiki.org/w/index.php?title=monster_enforcer&redirect=no "monster enforcer"))

| **Enforcer** |
| --- |
| [![Image 1: Enforcer](https://quakewiki.org/w/images/thumb/c/c6/monster_quake_enforcer.png/300px-monster_quake_enforcer.png)](https://quakewiki.org/wiki/File:monster_quake_enforcer.png) _"Grunt, Mark Two. Grunts who are surlier and beefier than the rest get outfitted in combat armour and built-in blasters."_ **Health**80 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-35 **Attacks**Laser gun **Drop**5 cells **1st appearance**[e2m1](https://quakewiki.org/wiki/e2m1 "e2m1") **Game version**†Registered **Death message**_Player was blasted by an Enforcer_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

The **Enforcer** is the brute of the military base maps. You can tell them apart by their beefier build, helmets and backpack. Wielding a laser cannon with perfect aim, they fire in two shot bursts, ensuring that you have to step quickly to avoid harm. On death they will drop a backpack containing five cells.

Enforcers are the only Quake monster showing Earth human intelligence, as some of their sounds bear a strong resemblance to English words, typically used by guards of any sort. This suggests that in their strength, they were less assimilated as a whole by Quake's forces, and thus retained a bit more of their minds.

Interestingly, their uniform bears a strong resemblance to the [Biosuit](https://quakewiki.org/wiki/Biosuit "Biosuit"), which can be used as rationale for their underwater excursions in [The Sewage System](https://quakewiki.org/wiki/e4m1 "e4m1"), though the [Grunts](https://quakewiki.org/wiki/Grunt "Grunt") doing the same are a mystery. Easy to be knocked into a pain frame, and lacking a melee attack, Enforcers are generally best dealt with by the [Double-Barrelled Shotgun](https://quakewiki.org/wiki/Double-Barrelled_Shotgun "Double-Barrelled Shotgun") as the normal one would be wasteful of shells, but the [Nailgun](https://quakewiki.org/wiki/Nailgun "Nailgun") can work well on a group.

Their projectile can also be found as an option for the [trap_shooter](https://quakewiki.org/wiki/trap_shooter "trap shooter") entity, which can be seen used to an extreme extent in the first level of [Beyond Belief](https://quakewiki.org/w/index.php?title=Beyond_Belief&action=edit&redlink=1 "Beyond Belief (page does not exist)") where a tight cluster of them act as a security system to prevent the player from passing. Beyond Belief also modified the Enforcer to drop only two cells on death, making them less of a boon to the player at a later point upon finding the [Thunderbolt](https://quakewiki.org/wiki/Thunderbolt "Thunderbolt").

## Tactics

| **monster_enforcer** ([Enforcer](https://quakewiki.org/wiki/monster_enforcer)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**32 x 32 x 64 **Quake-C**[enforcer.qc](https://quakewiki.org/wiki/enforcer.qc "enforcer.qc") **Precaches**progs/enforcer.mdl progs/h_mega.mdl progs/laser.mdl enforcer/death1.wav enforcer/enfire.wav enforcer/enfstop.wav enforcer/idle1.wav enforcer/pain1.wav enforcer/pain2.wav enforcer/sight1.wav enforcer/sight2.wav enforcer/sight3.wav enforcer/sight4.wav |

## Entity information

**monster_enforcer** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Enforcers** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Enforcer. When triggered, the Enforcer will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Enforcer dies.
_killtarget_ The targetname of the entity to be removed when the Enforcer dies.

#### Spawnflags

The monster_enforcer entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Grunt will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Enforcer will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Enforcer will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Enforcer will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Enforcer will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/enforcer.mdl")
    = monster_enforcer : "Enforcer" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_enforcer (1 0 0) (-16 -16 -24) (16 16 40) Ambush
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Enforcer&action=edit)
*   ![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)
[Ratman](https://quakewiki.org/w/index.php?title=User:Ratman&action=edit&redlink=1 "User:Ratman (page does not exist)") made an edit on 18 October 2017

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Enforcer&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Enforcer)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Enforcer&oldid=3487)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Enforcer)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
