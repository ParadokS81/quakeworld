<!-- source: https://quakewiki.org/wiki/monster_army | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Grunt - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_army

Published Time: Tue, 13 Jan 2026 16:12:27 GMT

Markdown Content:
[](https://quakewiki.org/wiki/monster_army)

## From Quake Wiki

(Redirected from [monster army](https://quakewiki.org/w/index.php?title=monster_army&redirect=no "monster army"))

| **Grunt** |
| --- |
| [![Image 1: Grunt](https://quakewiki.org/w/images/thumb/9/91/monster_quake_grunt.png/300px-monster_quake_grunt.png)](https://quakewiki.org/wiki/File:monster_quake_grunt.png) _"Goons with probes inserted into their pleasure centers; wired up so when they kill someone, they get a paroxysms of ecstasy. In essence, customized serial killers. Easy to kill, and they tote shotgun shells. It's like a little Christmas each time you kill one!"_ **Health**30 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-35 **Attacks**Shotgun **Drop**5 shells **1st appearance**[e1m1](https://quakewiki.org/wiki/e1m1 "e1m1") **Game version**†Shareware **Death message**_Player was shot by a Grunt_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

The **Grunt** is the first enemy you will encounter in Quake, alongside the [Rottweiler](https://quakewiki.org/wiki/Rottweiler "Rottweiler"). He moves fairly slowly, has particularly low health and packs a mere shotgun. Not only is his attack just a shotgun, it calls a FireBullets value of 4 rather than the players 6, and he also aims slightly behind the player. Despite these shortcomings, on death he will drop a backpack containing 5 shells, turning an ammunition profit for the accurate (or melee) player.

Grunts though easy, can pose quite a threat in large groups, which you see very little of in Quake itself, but is common in user made Base maps. Though inaccurate and weak, in groups the hitscan attack can catch a player off guard who is usually more concerned with the laser projectiles of the [Enforcer](https://quakewiki.org/wiki/Enforcer "Enforcer").

The Grunt is one of a few Quake monsters who possesses more animation frames than the code makes use of. In this case, he has frames reloading his shotgun, which has been utilized by numerous mods where they keep track of how many rounds the grunt has fired, or to display a switching of weapons in that particular mod.

## Tactics

As one of the weakest enemies in Quake, Grunts do not pose any real threat to a player alone, but due to their hitscan attack, they can be a nuisance to players have not noticed the Grunt's presence. In groups, especially when scattered around an area and attacking from many angles at once, Grunts can slowly wear down the health of players who do not keep moving.

A good example of a stage where Grunts do actually cause quite a lot of trouble is [e4m1](https://quakewiki.org/wiki/e4m1 "e4m1"), where the Grunts can easily snipe at the player from afar before the player has really had chance to notice them. This situation occurs quite frequently in custom maps, but less so in the stock Quake maps.

Grunts are extremely easy to deal with once the player is aware of them, with just about any weapon providing more than enough fire power to despatch them quickly. Grenades and rockets are great for taking down groups of Grunts, and also pack enough of a punch to take down any [Enforcer](https://quakewiki.org/wiki/Enforcer "Enforcer") unlucky enough to get caught in the blast.

| **monster_army** ([Grunt](https://quakewiki.org/wiki/monster_army)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**32 x 32 x 64 **Quake-C**[soldier.qc](https://quakewiki.org/wiki/soldier.qc "soldier.qc") **Precaches**progs/soldier.mdl progs/h_guard.mdl soldier/death1.wav soldier/idle.wav soldier/pain1.wav soldier/pain2.wav soldier/sattck1.wav soldier/sight1.wav |

## Entity information

**monster_army** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Grunts** in a level.

### Usage

The Grunt is a monster entity normally associated with the Base themed setting although it has also been used in Quake to populate the early part of levels that the player has entered from a base themed level (see the start of e1m2 for an example of this).

Being a low health monster entity it's best usage is probably while the player still has minimal armor and weaponry which can allow for some overwhelming by sheer numbers in the harder skill settings.

### Attributes

#### Keys

_targetname_ The targetname of the Grunt. When triggered, the Grunt will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Grunt dies.
_killtarget_ The targetname of the entity to be removed when the Grunt dies.

#### Spawnflags

The monster_army entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Grunt will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Grunt will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Grunt will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Grunt will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Grunt will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/solider.mdl")
    = monster_army : "Grunt" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_army (1 0 0) (-16 -16 -24) (16 16 40) Ambush
*/

*   [![Image 2](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Grunt&action=edit)
*   [![Image 3](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/User:Unmaker)
[Unmaker](https://quakewiki.org/wiki/User:Unmaker "User:Unmaker") made an edit on 4 May 2013

*   ![Image 4](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)*   [![Image 5](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Grunt&action=history)
*   [![Image 6](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:RecentChangesLinked/Grunt)

*   [![Image 7](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/w/index.php?title=Grunt&oldid=2953)
*   [![Image 8](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:WhatLinksHere/Grunt)

*   [![Image 9](https://quakewiki.org/w/skins/Monaco/style/images/blank.gif)](https://quakewiki.org/wiki/Special:Random)
