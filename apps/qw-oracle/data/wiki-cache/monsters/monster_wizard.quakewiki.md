<!-- source: https://quakewiki.org/wiki/monster_wizard | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Scrag - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_wizard

Markdown Content:
[](https://quakewiki.org/wiki/monster_wizard)

## From Quake Wiki

(Redirected from [monster wizard](https://quakewiki.org/w/index.php?title=monster_wizard&redirect=no "monster wizard"))

| **Scrag** |
| --- |
| [![Image 1: Scrag](https://quakewiki.org/w/images/thumb/4/40/monster_quake_scrag.png/300px-monster_quake_scrag.png)](https://quakewiki.org/wiki/File:monster_quake_scrag.png) _"Floats like a butterfly, stings like a bee. Ugly as hell. They're not real tough, but like to bushwhack you."_ **Health**80 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-40 **Attacks**Slime spit **Drop**nothing **1st appearance**[e1m2](https://quakewiki.org/wiki/e1m2 "e1m2") **Game version**†Shareware **Death message**_Player was scragged by a Scrag_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Scrags** (_monster\_wizard_ in the [QC](https://quakewiki.org/w/index.php?title=QC&action=edit&redlink=1 "QC (page does not exist)") code) are the only flying monster in standard [Quake](https://quakewiki.org/wiki/Quake "Quake"). Their slime projectiles are easy to dodge, but you'll need lots of room to move and a sharp eye for other Scrags. At long range, use the [Shotgun](https://quakewiki.org/wiki/Shotgun "Shotgun"), the [Nailgun](https://quakewiki.org/wiki/Nailgun "Nailgun") the [Super Nailgun](https://quakewiki.org/wiki/Super_Nailgun "Super Nailgun"), or the [Rocket Launcher](https://quakewiki.org/wiki/Rocket_Launcher "Rocket Launcher"). At close range, use a [Double-Barrelled Shotgun](https://quakewiki.org/wiki/Double-Barrelled_Shotgun "Double-Barrelled Shotgun"). At medium range, if you have good aim and are far enough away not to be hurt by the explosion, you can lob a [Grenade](https://quakewiki.org/wiki/Grenade_Launcher "Grenade Launcher") at a Scrag for a one-shot kill.

Scrags possess some cunning beyond the lofty standard set by the other monsters in Quake. They are constantly moving side to side (except when attacking), and so manage to dodge many incoming slow-moving projectiles. Also, if you duck behind cover while they are attacking, they may throw an extra shot or two at your last seen location, so you might want to be careful before you pop back out again.

## Tactics

| **monster_wizard** ([Scrag](https://quakewiki.org/wiki/monster_wizard)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**32 x 32 x 64 **Quake-C**[wizard.qc](https://quakewiki.org/wiki/wizard.qc "wizard.qc") **Precaches**progs/wizard.mdl progs/h_wizard.mdl progs/w_spike.mdl wizard/hit.wav wizard/wattack.wav wizard/wdeath.wav wizard/widle1.wav wizard/widle2.wav wizard/wpain.wav wizard/wsight.wav |

## Entity information

**monster_wizard** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Scrags** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Scrag. When triggered, the Scrag will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Scrag dies.
_killtarget_ The targetname of the entity to be removed when the Scrag dies.

#### Spawnflags

The monster_wizard entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Scrag will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Scrag will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Scrag will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Scrag will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Scrag will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/wizard.mdl")
    = monster_wizard : "Scrag" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_wizard (1 0 0) (-16 -16 -24) (16 16 40) Ambush
*/

## Trivia

The original name of the Scrag was Duke of Sheol[[1]](https://quakewiki.org/wiki/monster_wizard#cite_note-1)

## Notes

1.   [↑](https://quakewiki.org/wiki/monster_wizard#cite_ref-1)John Romero on Twitter [https://twitter.com/romero/status/595871727483158528](https://twitter.com/romero/status/595871727483158528)

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Scrag&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Spirit)
[Spirit](https://quakewiki.org/wiki/User:Spirit "User:Spirit") made an edit on 6 May 2015

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Scrag&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Scrag)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Scrag&oldid=3327)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Scrag)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
