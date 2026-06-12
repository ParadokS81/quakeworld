<!-- source: https://quakewiki.org/wiki/monster_fish | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Rotfish - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_fish

Markdown Content:
[](https://quakewiki.org/wiki/monster_fish)

## From Quake Wiki

(Redirected from [monster fish](https://quakewiki.org/w/index.php?title=monster_fish&redirect=no "monster fish"))

| **Rotfish** |
| --- |
| [![Image 1: Rotfish](https://quakewiki.org/w/images/thumb/6/61/monster_quake_rotfish.png/300px-monster_quake_rotfish.png)](https://quakewiki.org/wiki/File:monster_quake_rotfish.png) _"Disgusting little critters who dish it out, but can't take it."_ **Health**25 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-20 ([SoA](https://quakewiki.org/wiki/Scourge_of_Armagon "Scourge of Armagon") only; cannot be gibbed in vanilla Quake) **Attacks**Bite ([0-6]x3) **Drop**Nothing **1st appearance**[e2m3](https://quakewiki.org/wiki/e2m3 "e2m3") **Game version**†Registered **Death message**_Player was fed to the Rotfish_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Rotfish** are slow to medium speed monsters that act as a nuisance in bodies of water, most notably in [e2m3](https://quakewiki.org/wiki/e2m3 "e2m3") and [e4m4](https://quakewiki.org/wiki/e4m4 "e4m4"). They are not renowned as a meaningful threat and only consume a negligible amount of shells to dispose of. Unlike other monsters they cannot leave the water but can move freely when in it.

## Tactics

*   If **Rotfish** are even a concern, let them get moderately close and kill them with a shot from the [Double-Barrelled Shotgun](https://quakewiki.org/wiki/Double-Barrelled_Shotgun "Double-Barrelled Shotgun"). They can also be trivially axed as it only takes two swings.

## Bugs

*   Due to an oversight, Rotfish are counted twice towards the monster total but only give one kill credit on death. This means any map with Rotfish on it will be impossible to truly 100%.

*   A Rotfish's corpse will not turn non-solid immediately like most other monsters will. As a result they'll block the player for much longer than normal.

*   In rare circumstances the Rotfish's head can appear to be rendered wrong.

*   If a Rotfish gets out of water it can appear to be stuck floating in the air. This is because it's treated similar to a flying enemy like the Scrag but only able to move to places that have some kind of liquid content.

| **monster_fish** ([Rotfish](https://quakewiki.org/wiki/monster_fish)) |
| --- |
| **Entity type**point **Entity class**monster **Dimensions**32 x 32 x 48 **Quake-C**[fish.qc](https://quakewiki.org/wiki/fish.qc "fish.qc") **Precaches**progs/fish.mdl fish/death.wav fish/bite.wav fish/idle.wav |

## Entity information

**monster_fish** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Rotfish** in a level.

### Usage

Rotfish are fairly non-threatening and can be trivially picked off when outside of water. They mostly serve as a nuisance for the player to deal with, however, their larger-than-expected hitbox can make them good for body blocking. Releasing an ambush of Rotfish after the player has been underwater for a bit can help instill panic as their air timer begins to run out. Other than that, they should be seen as a minor obstacle.

### Attributes

#### Keys

_targetname_ The targetname of the Rotfish. When triggered, the Rotfish will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Rotfish dies.
_killtarget_ The targetname of the entity to be removed when the Rotfish dies.

#### Spawnflags

The monster_fish entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Rotfish will not wake up from seeing other monsters wake up. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Rotfish will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Rotfish will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Rotfish will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Rotfish will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 24) model(":progs/fish.mdl")
    = monster_fish : "Rotfish" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_fish (1 0 0) (-16 -16 -24) (16 16 24) Ambush
*/
