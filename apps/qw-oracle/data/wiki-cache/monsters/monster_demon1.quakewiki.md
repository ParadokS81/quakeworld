<!-- source: https://quakewiki.org/wiki/monster_demon1 | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Fiend - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_demon1

Published Time: Tue, 13 Jan 2026 16:12:27 GMT

Markdown Content:
[](https://quakewiki.org/wiki/monster_demon1)

## From Quake Wiki

(Redirected from [monster demon1](https://quakewiki.org/w/index.php?title=monster_demon1&redirect=no "monster demon1"))

| **Fiend** |
| --- |
| [![Image 1: Fiend](https://quakewiki.org/w/images/thumb/4/4f/monster_quake_fiend.png/300px-monster_quake_fiend.png)](https://quakewiki.org/wiki/File:monster_quake_fiend.png) _"In essence, organic buzzsaws, rife with pummeling power!"_ **Health**300 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-80 **Attacks**Claws ([10-15]x2), Leap ([40-50]) **Drop**Nothing **1st appearance**[e1m2](https://quakewiki.org/wiki/e1m2 "e1m2") **Game version**†Shareware **Death message**_Player was eviscerated by a Fiend_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |

**Fiends** (also called _demons_ in the QuakeC code) appear almost small the way they position their bodies at rest, and not much larger when walking, but when you see them run, let alone leap, you will appreciate their size - and ferocity.

Fiends make their first appearance in [Castle of the Damned](https://quakewiki.org/wiki/e1m2 "e1m2") as a literal monster closet, leaping out at you while you observe the floating stone blocks. They are quite potent in their slashing and can take a handful of rockets to kill. However, those hooved legs should be your concern. The leap is fast, powerful, and quick to recover. Be swift on your feet, particularly with sidestepping and take advantage of its exposed back during the jump. If you can keep close enough in range, they will generally not leap, but they do take small steps forward as they slash, so be careful.

## Tactics

*   While its leap attack is quite lethal, the Fiend's claw attack has a much longer animation that slows it down significantly. Moving in and out quickly gives a momentary window of vulnerability allowing for easy grenade hits.

*   Once off the ground, the Fiend cannot change its movement direction. Keeping mid distance and moving laterally to it once it starts its jump is the best tactic for dodging it.

*   Fiends struggle with outward pointing corners and steep stairs as they tend to get stuck on them, so use these to your advantage.

*   The Fiend makes a distinct attack yell when it's about to leap. This sound can be used to dodge it even when out of view.

*   The Fiend's large hitbox and lack of range make it great for blocking projectiles in certain scenarios. Try to use infighting to your advantage as its high health also makes it serve as a good distraction.

## Bugs

*   An oversight in the Fiend's leap attack can cause it to continuously deal damage on contact instead of only once. In particular, if the Fiend is more than 18 units off the ground when hitting something, it won't reset its hurtbox. This means a Fiend landing on top of you will result in almost instant death.

*   The Fiend doesn't actually do a check to see if it's on the ground when leaping, so it can leap mid air if something stops the attack early. This is common on stairs where it'll bump into them while it still has upward momentum but be close enough to the ground to stop the leap.

| **monster_demon1** ([Fiend](https://quakewiki.org/wiki/monster_demon1)) |
| --- |
| **Entity type**point **Entity class**monster **Dimensions**64 x 64 x 88 **Quake-C**[demon.qc](https://quakewiki.org/wiki/demon.qc "demon.qc") **Precaches**progs/demon.mdl progs/h_demon.mdl demon/ddeath.wav demon/dhit2.wav demon/djump.wav demon/dpain1.wav demon/idle1.wav demon/sight2.wav |

## Entity information

**monster_demon1** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Fiends** in a level.

### Usage

Fiends are best used in places with few outward facing corners and elevation differences the player can take advantage of. If its target is too high above it or too far below it, the Fiend will not actually attack making it easy to kill. This is particularly problematic with steep ramps as they'll almost never leap on these. It also needs quite a bit of headroom to avoid bonking its head on the ceiling instantly after it leaps. Its fast movement speed allows them to quickly run ahead of other monsters and, combined with its leap, often puts them between the player and other monsters. This makes it good for infighting but can also make it tricky to balance if this isn't desired. Floating monsters like Scrags in particular can give the Fiend a lot of trouble if they don't hover low enough to the ground.

A unique advantage the Fiend gets from its leap attack is the ability to clear gaps without the need for a jump trigger. This can allow it to do things like clip corners of walkways that other monsters like the Death Knight would be forced to walk around. This also means it can leap off of high up locations if it misses its target, so be wary of this.

The Fiend works best at about the 200 unit range. When within 100 units of its target it won't perform a leap attack, but beyond 200 units its chance to leap drops drastically down to 10%. Still, its leap has no range cap meaning even at incredibly long distances it will sometimes jump anyway. Since its claw attack makes it so vulnerable, it's best to avoid putting the Fiend in incredibly claustrophobic situations. Being one of the fastest monsters in the game, its speed allows it to dodge grenades making other weapons preferred.

### Attributes

#### Keys

_targetname_ The targetname of the Fiend. When triggered, the Fiend will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Fiend dies.
_killtarget_ The targetname of the entity to be removed when the Fiend dies.

#### Spawnflags

The monster_demon1 entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Fiend will not wake up from seeing other monsters wake up. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Fiend will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Fiend will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Fiend will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Fiend will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-32 -32 -24, 32 32 64) model(":progs/demon.mdl")
    = monster_demon1 : "Fiend" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_demon1 (1 0 0) (-32 -32 -24) (32 32 64) Ambush
*/
