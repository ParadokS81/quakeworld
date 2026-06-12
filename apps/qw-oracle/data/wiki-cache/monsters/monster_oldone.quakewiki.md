<!-- source: https://quakewiki.org/wiki/monster_oldone | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Shub-Niggurath - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_oldone

Published Time: Tue, 13 Jan 2026 16:12:27 GMT

Markdown Content:
[](https://quakewiki.org/wiki/monster_oldone)

## From Quake Wiki

(Redirected from [monster oldone](https://quakewiki.org/w/index.php?title=monster_oldone&redirect=no "monster oldone"))

| **Shub-Niggurath** |
| --- |
| [![Image 1: Shub-Niggurath](https://quakewiki.org/w/images/thumb/f/f6/monster_quake_shub_niggurath.png/300px-monster_quake_shub_niggurath.png)](https://quakewiki.org/wiki/File:monster_quake_shub_niggurath.png) **Health**40000 (regenerates to full if damaged) **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**N/A (must be [telefragged](https://quakewiki.org/w/index.php?title=telefrag&action=edit&redlink=1 "telefrag (page does not exist)")) **Attacks**None **Drop**Nothing **1st appearance**[end](https://quakewiki.org/wiki/end "end") **Game version**†Registered **Death message**_Player became one with Shub-Niggurath._(unused) † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Shub-Niggurath** is the end boss of [Quake](https://quakewiki.org/wiki/Quake "Quake").

The mighty Shub-Niggurath turns out to be an enormous wad of lard with tentacles. She can't even attack, but watch out -- she has a lot of [Vores](https://quakewiki.org/wiki/Vore "Vore") and [Shamblers](https://quakewiki.org/wiki/Shambler "Shambler") guarding her, and more will spawn in occasionally. To kill her, you need to [telefrag](https://quakewiki.org/w/index.php?title=telefrag&action=edit&redlink=1 "telefrag (page does not exist)") her. See the spikey ball that floats around the level? See the teleporter at the end of the monster- and trap-infested hallway? When you step in the teleporter, you will warp to the location of the spikey ball. Do it when the spikey ball enters Shub-Niggurath, and you'll blow her to pieces. If you do it some other time, you'll most likely fall into the lava.

## Tactics

| **monster_oldone** ([Shub-Niggurath](https://quakewiki.org/wiki/monster_oldone)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**320 x 256 x 280 **Quake-C**[oldone.qc](https://quakewiki.org/wiki/oldone.qc "oldone.qc") **Precaches**progs/oldone.mdl boss2/death.wav boss2/idle.wav boss2/sight.wav boss2/pop2.wav |

## Entity information

**monster_oldone** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Shub-Niggurath** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of Shub-Niggurath. When triggered, Shub-Niggurath will wake up if inactive.
_target_ The targetname of the entity to be triggered when Shub-Niggurath dies.
_killtarget_ The targetname of the entity to be removed when Shub-Niggurath dies.

#### Spawnflags

The monster_oldone entity supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | Shub-Niggurath will not spawn on Easy difficulty. |
| 512 | Not on Normal | Shub-Niggurath will not spawn on Normal difficulty. |
| 1024 | Not on Hard | Shub-Niggurath will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | Shub-Niggurath will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-160 -128 -24, 160 128 256) model(":progs/oldone.mdl")
    = monster_oldone : "Shub-Niggurath" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_oldone (1 0 0) (-160 -128 -24) (160 128 256)
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Shub-Niggurath&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Unmaker)
[Unmaker](https://quakewiki.org/wiki/User:Unmaker "User:Unmaker") made an edit on 4 May 2013

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Shub-Niggurath&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Shub-Niggurath)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Shub-Niggurath&oldid=2945)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Shub-Niggurath)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
