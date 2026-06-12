<!-- source: https://quakewiki.org/wiki/monster_dog | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Rottweiler - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_dog

Markdown Content:
[](https://quakewiki.org/wiki/monster_dog)

## From Quake Wiki

(Redirected from [monster dog](https://quakewiki.org/w/index.php?title=monster_dog&redirect=no "monster dog"))

| **Rottweiler** |
| --- |
| [![Image 1: Rottweiler](https://quakewiki.org/w/images/thumb/8/89/monster_quake_rottweiler.png/300px-monster_quake_rottweiler.png)](https://quakewiki.org/wiki/File:monster_quake_rottweiler.png) _"Bad, bad doggie! Play dead! - blam! blam! - yipe! Good dog!"_ **Health**25 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-35 **Attacks**Bite, leap **Drop**nothing **1st appearance**[e1m1](https://quakewiki.org/wiki/e1m1 "e1m1") **Game version**†Shareware **Death message**_Player was mauled by a Rottweiler_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Rottweilers** are vicious dogs that use their sharp teeth to try to rip you apart. Beware - they can leap short distances to do extra damage. For killing them, just use your [Shotgun](https://quakewiki.org/wiki/Shotgun "Shotgun") or [Double-Barrelled Shotgun](https://quakewiki.org/wiki/Double-Barrelled_Shotgun "Double-Barrelled Shotgun").

## Tactics

| **monster_dog** ([Rotweiller](https://quakewiki.org/w/index.php?title=Rotweiller&action=edit&redlink=1 "Rotweiller (page does not exist)")) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**64 x 64 x 64 **Quake-C**[dog.qc](https://quakewiki.org/wiki/dog.qc "dog.qc") **Precaches**progs/h_dog.mdl progs/dog.mdl dog/dattack1.wav dog/ddeath.wav dog/dpain1.wav dog/dsight.wav dog/idle.wav |

## Entity information

**monster_dog** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Rotweillers** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Rotweiller. When triggered, the Rotweiller will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Rotweiller dies.
_killtarget_ The targetname of the entity to be removed when the Rotweiller dies.

#### Spawnflags

The monster_dog entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Rotweiller will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Rotweiller will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Rotweiller will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Rotweiller will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Rotweiller will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-32 -32 -24, 32 32 40) model(":progs/enforcer.mdl")
    = monster_dog : "Rotweiller" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_dog (1 0 0) (-32 -32 -24) (32 32 40) Ambush
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Rottweiler&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Unmaker)
[Unmaker](https://quakewiki.org/wiki/User:Unmaker "User:Unmaker") made an edit on 4 May 2013

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Rottweiler&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Rottweiler)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Rottweiler&oldid=2951)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Rottweiler)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
