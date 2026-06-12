<!-- source: https://quakewiki.org/wiki/monster_shalrath | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Vore - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_shalrath

Markdown Content:
[](https://quakewiki.org/wiki/monster_shalrath)

## From Quake Wiki

(Redirected from [monster shalrath](https://quakewiki.org/w/index.php?title=monster_shalrath&redirect=no "monster shalrath"))

| **Vore** |
| --- |
| [![Image 1: Vore](https://quakewiki.org/w/images/thumb/7/7f/monster_quake_vore.png/300px-monster_quake_vore.png)](https://quakewiki.org/wiki/File:monster_quake_vore.png) _"A spideresque hybrid horror. Keep your eye on the firepod he hurls."_ **Health**400 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-90 **Attacks**Homing firepod (~30 dmg) **Drop**nothing **1st appearance**[e2m6](https://quakewiki.org/wiki/e2m6 "e2m6") **Game version**†Registered **Death message**_Player was exploded by a Vore_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

The **Vore** (also known as a _Shalrath_) is one of the toughest regular enemies the player will encounter in Quake. It is a three-legged monster that moves very slowly, but throws spiked bombs that home in on the player's position, making them often one of the trickiest enemies to deal with, especially in combination with other enemies.

The homing firepods (more commonly known as Voreballs or Vorespikes) that are thrown by the vore can follow the player around quite sharp corners when close enough, and do not explode until they collide with something. This can make them very tricky for a player to shake, especially on [Nightmare difficulty](https://quakewiki.org/w/index.php?title=Nightmare_difficulty&action=edit&redlink=1 "Nightmare difficulty (page does not exist)"), where they are fired more frequently and move faster than on lower skill levels.

## Tactics

Because of the danger posed by Voreballs, fighting Vores in large open spaces, or where the player is exposed but cannot easily move around (such as on a ledge) is not usually done. Many players deal with Vores from a position that provides cover and enables them to shoot at the Vore, then duck into cover until the Voreball explodes before re-emerging to continue their attack and wear the Vore down.

When fighting Vores in an open space, Voreballs will tend to accumulate in a trail behind a constantly moving player. Voreballs that are following the player can be used against other enemies quite easily, and by simply moving behind another enemy so that it is blocking the path of the Voreball, the player can start [monster infighting](https://quakewiki.org/w/index.php?title=monster_infighting&action=edit&redlink=1 "monster infighting (page does not exist)") to save both ammunition and time.

Since Voreballs will home toward the player gradually, they will often fly around obstacles that are otherwise blocking their path to the player when following very close behind. The best way to safely dispose of closely trailing Voreballs is usually to move quickly around a series of sharp corners, or run in a circle around a pillar or other obstacle. However, if the Voreball gets too close, it can become impossible to avoid in a conventional manner.

Additionally, it's important to know that the vore takes the full [splash damage](https://quakewiki.org/w/index.php?title=splash_damage&action=edit&redlink=1 "splash damage (page does not exist)") from its own spike. Skilled players can exploit the level geometry to make the vore balls explode almost immediately upon launch, thus gradually wearing the vore down with next to none detriment to own health and ammo supply.

## Relationship with other monsters

Because Vores fire projectiles, and especially because these projectiles can be directed somewhat by crafty players, Vores often get into fights with other monsters. If the vore attracts the attention of multiple monsters, its slow speed often leads to it being killed by even weaker enemies such as [Scrags](https://quakewiki.org/wiki/Scrag "Scrag").

One particular thing to note about the Vore is that it is one of the few monsters capable of gibbing a [Zombie](https://quakewiki.org/wiki/Zombie "Zombie"). This is enabled by a special case in the Voreball code that causes them to inflict extra damage to Zombies - 110 points of damage versus the standard 40 points.

## Tricks

Because Voreballs follow the player, they can be quite easy to use as a propellant for doing tricks. Since it is possible to run in circles and accumulate trailing Voreballs, it is possible to do Voreball jumps using more than one Voreball at a time, allowing a skilled player to jump extremely high.

| **monster_shalrath** ([Vore](https://quakewiki.org/wiki/monster_shalrath)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**64 x 64 x 72 **Quake-C**[shalrath.qc](https://quakewiki.org/wiki/shalrath.qc "shalrath.qc") **Precaches**progs/shalrath.mdl progs/h_shal.mdl progs/v_spike.mdl shalrath/attack.wav shalrath/attack2.wav shalrath/death.wav shalrath/idle.wav shalrath/pain.wav shalrath/sight.wav |

## Entity information

**monster_shalrath** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Vores** in a level.

### Usage

Vores are best placed where there is not too much easy cover, so that the player has to move around, or even run away to avoid getting hit by the homing bombs the Vore fires. Giving the player too much cover can make Vores boring to fight, as the player can safely take potshots without ever really having to worry about Voreballs hitting them.

Vores actually work quite well in open areas with little cover, as it forces the player to run from the Voreballs, and can lead them to drawing the Voreballs into other enemies to create [monster infighting](https://quakewiki.org/w/index.php?title=Monster_infighting&action=edit&redlink=1 "Monster infighting (page does not exist)") situations.

Using Vores in areas with cover can work if there are multiple Vores, making it difficult for the player to hide completely out of sight from _all_ the Vores at any one time. Adding other monsters at ground level to keep the player from standing in cover also works well.

### Attributes

#### Keys

_targetname_ The targetname of the Vore. When triggered, the Vore will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Vore dies.
_killtarget_ The targetname of the entity to be removed when the Vore dies.

#### Spawnflags

The monster_vore entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Vore will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Vore will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Vore will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Vore will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Vore will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-32 -32 -24, 32 32 48) model(":progs/shalrath.mdl")
    = monster_shalrath : "Vore" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_shalrath (1 0 0) (-32 -32 -24) (32 32 48) AMBUSH
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Vore&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Unmaker)
[Unmaker](https://quakewiki.org/wiki/User:Unmaker "User:Unmaker") made an edit on 4 May 2013

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Vore&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Vore)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Vore&oldid=2952)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Vore)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
