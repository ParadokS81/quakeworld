<!-- source: https://quakewiki.org/wiki/monster_hell_knight | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Death Knight - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_hell_knight

Markdown Content:
[](https://quakewiki.org/wiki/monster_hell_knight)

## From Quake Wiki

| **Death Knight** |
| --- |
| [![Image 1: Death Knight](https://quakewiki.org/w/images/thumb/5/50/monster_quake_death_knight.png/300px-monster_quake_death_knight.png)](https://quakewiki.org/wiki/File:monster_quake_death_knight.png) _"This particular canned meat tends to open you up instead."_ **Health**250 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-40 **Attacks**Sword, magic missiles **Drop**nothing **1st appearance**[e2m3](https://quakewiki.org/wiki/e2m3 "e2m3") **Game version**†Registered **Death message**_Player was slain by a Death Knight_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

The **Death Knight** (also known as the Hell Knight) makes his first appearance in [The Crypt of Decay](https://quakewiki.org/wiki/e2m3 "e2m3"). Often seen patrolling, he makes low hoarse grunts, rather than growls, which can be identified from a distance. Distinguishable by his horned helmet, armor, and sheer size, a new player may hesitate on initiating combat with the Death Knight.

Wielding a rather large sword, and possessing a strong tenacity for charging while swinging, it is a good idea to keep your distance, though you risk him utilizing his magic missile attack, which fans out horizontally making dodging a bit difficult. Thankfully due to this, you can lure the Death Knight into inciting chaos by harming other monsters.

## Tactics

| **monster_hell_knight** ([Death Knight](https://quakewiki.org/wiki/monster_hell_knight)) |
| --- |
| **Entity type**point **Entity class**[monster](https://quakewiki.org/w/index.php?title=Monster_(entity_class)&action=edit&redlink=1 "Monster (entity class) (page does not exist)") **Dimensions**32 x 32 x 64 **Quake-C**[hknight.qc](https://quakewiki.org/wiki/hknight.qc "hknight.qc") **Precaches**progs/hknight.mdl progs/k_spike.mdl progs/h_hellkn.mdl hknight/attack1.wav hknight/death1.wav hknight/pain1.wav hknight/sight1.wav hknight/hit.wav hknight/slash1.wav hknight/idle.wav hknight/grunt.wav knight/sword1.wav knight/sword2.wav |

## Entity information

**monster_hell_knight** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Death Knights** in a level.

### Usage

### Attributes

#### Keys

_targetname_ The targetname of the Death Knight. When triggered, the Death Knight will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Death Knight dies.
_killtarget_ The targetname of the entity to be removed when the Death Knight dies.

#### Spawnflags

The monster_hell_knight entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Death Knight will not wake up from seeing other monsters wake up or hearing sounds. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Death Knight will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Death Knight will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Death Knight will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Death Knight will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/hknight.mdl")
    = monster_hell_knight : "Death Knight" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_hell_knight (1 0 0) (-16 -16 -24) (16 16 40) Ambush
*/
