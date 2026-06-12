<!-- source: https://quakewiki.org/wiki/monster_boss | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Chthon - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_boss

Published Time: Tue, 13 Jan 2026 16:12:27 GMT

Markdown Content:
[](https://quakewiki.org/wiki/monster_boss)

## From Quake Wiki

(Redirected from [monster boss](https://quakewiki.org/w/index.php?title=monster_boss&redirect=no "monster boss"))

| **Chthon** |
| --- |
| [![Image 1: Chthon](https://quakewiki.org/w/images/thumb/b/b3/monster_quake_chthon.png/300px-monster_quake_chthon.png)](https://quakewiki.org/wiki/File:monster_quake_chthon.png) **Health**N/A **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**N/A **Attacks**Lava bomb **Drop**nothing **1st appearance**[e1m7](https://quakewiki.org/wiki/e1m7 "e1m7") **Game version**†Shareware **Death message**_Player was incinerated by the Chthon. (unused)_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Chthon** is the end boss of the first episode, Dimension of the Doomed. You can find him in [The House of Chthon](https://quakewiki.org/wiki/e1m7 "e1m7"), which is preceded by [The Door to Chthon](https://quakewiki.org/wiki/e1m6 "e1m6"). He resides in a pool of lava, emerging once you pick up the episode's [rune](https://quakewiki.org/w/index.php?title=rune&action=edit&redlink=1 "rune (page does not exist)"). He attacks by hurling explosive lava bombs (which, on [Hard](https://quakewiki.org/w/index.php?title=Hard&action=edit&redlink=1 "Hard (page does not exist)") difficulty, are aimed ahead of moving targets). The lava bombs do the same amount of damage as a player's [rocket](https://quakewiki.org/wiki/Rocket_Launcher "Rocket Launcher") (which is at least 100 upon a direct hit).

He is immune to player based weapons (via self.takedamage = DAMAGE_NO;), and can be damaged only by electrical prongs residing in the ceiling of his house, the code for which can be found in boss.qc. Switches are located near both of the prongs, and at the center-end of the level is a switch to activate them, electrocuting Chthon. On Easy skill you only need to do this once, but otherwise it will take three jolts. Upon death he sinks back into the lava, and a bridge forms over the sulfurous mass allowing you access to an exit from the arena.

_"As the corpse of the monstrous entity Chthon sinks back into the lava whence it rose, you grip the Rune of Earth Magic tightly. Now that you have conquered the Dimension of the Doomed, realm of Earth Magic, you are ready to complete your task."_

## Tactics

Chthon cannot be killed by regular weapons and must be killed by the lightning trap in e1m7 - the level in which he appears. To use the trap, the player must first press the buttons on the top level of the arena to lower the lightning rods, then press the button in the centre to fire lightning at Chthon. On Easy skill, a single hit is enough to kill Chthon, but on all other skill levels, three hits are required, which requires repeating the entire sequence of button presses for each subsequent attack.

Chthon's attacks are very easy to avoid on Easy and Normal skill, as he throws lava bombs directly at the player, so as long as the player keeps moving, he is unlikely to be hit. On Hard and Nightmare skill, however, the bombs are thrown in front of the player, so running without being careful is likely to end in the player's death. To successfully avoid the lava bombs on higher skill levels requires much more care.

| **monster_boss** ([Chthon](https://quakewiki.org/wiki/monster_boss)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**256 x 256 x 280 **Quake-C**[boss.qc](https://quakewiki.org/wiki/boss.qc "boss.qc") **Precaches**progs/boss.mdl progs/lavaball.mdl weapons/rocket1i.wav boss1/out1.wav boss1/sight1.wav misc/power.wav boss1/throw.wav boss1/pain.wav boss1/death.wav |

## Entity information

**monster_boss** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Chthon** in a level.

### Usage

In order to script Chthon, the map has a few restrictions that must be followed:

*   Chthon itself must have a targetname so it can be activated. It has no other way of waking up or spotting players.
*   The arena needs two func_doors with a target value of "lightning". These are hardcoded and must be present for event_lightning to work.
*   There needs to be an event_lightning entity that has a targetname so it can be activated. This is what damages Chthon. When both doors are either at rest or opened, they'll be paused and lightning will spawn between them. This will only deal damage if both doors are considered opened.

### Attributes

#### Keys

_targetname_ The targetname of Chthon. When triggered, Chthon will wake up if inactive.
_target_ The targetname of the entity to be triggered when Chthon dies.
_killtarget_ The targetname of the entity to be removed when Chthon dies.

#### Spawnflags

monster_boss does not support the ambush spawnflag that is supported by regular monsters. Instead, it must be triggered for Chthon to appear at all.

It does, however, support the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | Chthon will not spawn on Easy difficulty. |
| 512 | Not on Normal | Chthon will not spawn on Normal difficulty. |
| 1024 | Not on Hard | Chthon will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | Chthon will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/boss.mdl")
    = monster_boss : "Chthon" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_boss (1 0 0) (-128 -128 -24) (128 128 256)
*/
