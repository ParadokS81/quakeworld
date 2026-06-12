<!-- source: https://quakewiki.org/wiki/monster_shambler | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Shambler - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_shambler

Published Time: Tue, 13 Jan 2026 16:12:27 GMT

Markdown Content:
[](https://quakewiki.org/wiki/monster_shambler)

## From Quake Wiki

(Redirected from [monster shambler](https://quakewiki.org/w/index.php?title=monster_shambler&redirect=no "monster shambler"))

| **Shambler** |
| --- |
| [![Image 1: Shambler](https://quakewiki.org/w/images/thumb/0/05/monster_quake_shambler.png/300px-monster_quake_shambler.png)](https://quakewiki.org/wiki/File:monster_quake_shambler.png) _"Even other monsters fear him, so expect a clobbering. He shrugs off explosions. Good luck."_ **Health**600 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-60 **Attacks**Claws, lightning bolt **Drop**nothing **1st appearance**[e1m5](https://quakewiki.org/wiki/e1m5 "e1m5"), [e1m3](https://quakewiki.org/wiki/e1m3 "e1m3") (Hard) **Game version**†Shareware **Death message**_Player was smashed by a Shambler_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |
[![Image 2](https://quakewiki.org/w/images/thumb/6/69/Shambler.png/300px-Shambler.png)](https://quakewiki.org/wiki/File:Shambler.png)

A Shambler in [e4m4](https://quakewiki.org/wiki/e4m4 "e4m4") (The Palace of Hate).

**Shamblers** are truly a force to be feared. They have an immense amount of health, and take only half damage from explosions. His pride and joy is his lightning attack, and for good reason: it never misses! Unless you can duck behind cover or retreat beyond the range of the attack, you'll be hit for considerable damage. However, the Shambler's weakness could be his proclivity to use his bare hands when he can. As long as you're within melee range, he will eschew his ranged attack for a good claw swipe or two. So if cover is not available or you're feeling particularly daring, you can run up and initiate his melee attack, then quickly step back to fire shots at him while he is swinging his arms through the air in which you stood a moment before. Then, run back forward before he begins another attack, or he will choose the lightning bolt. Repeat until one of you is dead.

## Tactics

The Shambler only takes half the damage of explosive weapons ([Grenade Launcher](https://quakewiki.org/wiki/Grenade_Launcher "Grenade Launcher"), [Rocket Launcher](https://quakewiki.org/wiki/Rocket_Launcher "Rocket Launcher")).

| **monster_shambler** ([Shambler](https://quakewiki.org/wiki/monster_shambler)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**64 x 64 x 88 **Quake-C**[shambler.qc](https://quakewiki.org/wiki/shambler.qc "shambler.qc") **Precaches**progs/shambler.mdl progs/s_light.mdl progs/h_shams.mdl progs/bolt.mdl shambler/sattck1.wav shambler/sboom.wav shambler/sdeath.wav shambler/shurt2.wav shambler/sidle.wav shambler/ssight.wav shambler/melee1.wav shambler/melee2.wav shambler/smack.wav |

## Entity information

**monster_shambler** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Shamblers** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Shambler. When triggered, the Shambler will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Shambler dies.
_killtarget_ The targetname of the entity to be removed when the Shambler dies.

#### Spawnflags

The monster_shambler entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Shambler will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Shambler will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Shambler will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Shambler will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Shambler will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-32 -32 -24, 32 32 64) model(":progs/shambler.mdl")
    = monster_shambler : "Shambler" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_shambler (1 0 0) (-32 -32 -24) (32 32 64) Ambush
*/

## Trivia

*   Adrian Carmack, the texture artist that worked at iD, posted never before seen early sketches of the shambler, showcasing an almost entirely different design. [[1]](https://quakewiki.org/wiki/monster_shambler#cite_note-1)

## Notes

1.   [↑](https://quakewiki.org/wiki/monster_shambler#cite_ref-1)Adrian Carmack's Linkedin [https://www.linkedin.com/posts/adrian-carmack-43822492_shambler-sketches-from-quake-1-activity-7010198031597785088-A26G?utm_source=share](https://www.linkedin.com/posts/adrian-carmack-43822492_shambler-sketches-from-quake-1-activity-7010198031597785088-A26G?utm_source=share)

*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Shambler&action=edit)
*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)
[Serecky](https://quakewiki.org/w/index.php?title=User:Serecky&action=edit&redlink=1 "User:Serecky (page does not exist)") made an edit on 3 June 2023

*   ![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Shambler&action=history)
*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Shambler)

*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Shambler&oldid=4584)
*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Shambler)

*   [![Image 10](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
