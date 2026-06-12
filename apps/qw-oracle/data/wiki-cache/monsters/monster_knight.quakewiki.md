<!-- source: https://quakewiki.org/wiki/monster_knight | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Knight - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_knight

Markdown Content:
[](https://quakewiki.org/wiki/monster_knight)

## From Quake Wiki

(Redirected from [monster knight](https://quakewiki.org/w/index.php?title=monster_knight&redirect=no "monster knight"))

| **Knight** |
| --- |
| [![Image 1: Knight](https://quakewiki.org/w/images/thumb/2/25/monster_quake_knight.png/300px-monster_quake_knight.png)](https://quakewiki.org/wiki/File:monster_quake_knight.png) _"Canned meat. Open 'er up and see if it's still fresh."_ **Health**75 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-40 **Attacks**Sword **Drop**nothing **1st appearance**[e1m2](https://quakewiki.org/wiki/e1m2 "e1m2") **Game version**†Shareware **Death message**_Player was slashed by a Knight_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Knights** have a sharp sword and strong arms, but their drawback is their lack of a ranged attack. Two good spanks from the [Double-Barrelled Shotgun](https://quakewiki.org/wiki/Double-Barrelled_Shotgun "Double-Barrelled Shotgun") will work (or, more efficiently, a [Shotgun](https://quakewiki.org/wiki/Shotgun "Shotgun") blast immediately followed by a double-barrelled shot).

## Tactics

| **monster_knight** ([Knight](https://quakewiki.org/wiki/monster_knight)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**32 x 32 x 64 **Quake-C**[knight.qc](https://quakewiki.org/wiki/knight.qc "knight.qc") **Precaches**progs/knight.mdl progs/h_knight.mdl knight/kdeath.wav knight/khurt.wav knight/ksight.wav knight/sword1.wav knight/sword2.wav knight/idle.wav |

## Entity information

**monster_knight** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Knights** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Knight. When triggered, the Knight will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Knight dies.
_killtarget_ The targetname of the entity to be removed when the Knight dies.

#### Spawnflags

The monster_knight entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Knight will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Knight will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Knight will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Knight will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Knight will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/knight.mdl")
    = monster_knight: "Knight" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_knight (1 0 0) (-16 -16 -24) (16 16 40) Ambush
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Knight&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Unmaker)
[Unmaker](https://quakewiki.org/wiki/User:Unmaker "User:Unmaker") made an edit on 4 May 2013

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Knight&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Knight)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Knight&oldid=2943)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Knight)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
