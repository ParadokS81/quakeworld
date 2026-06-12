<!-- source: https://quakewiki.org/wiki/monster_ogre | fetched: 2026-06-12 | via: r.jina.ai -->
Title: Ogre - Quake Wiki

URL Source: https://quakewiki.org/wiki/monster_ogre

Markdown Content:
[](https://quakewiki.org/wiki/monster_ogre)

## From Quake Wiki

(Redirected from [monster ogre](https://quakewiki.org/w/index.php?title=monster_ogre&redirect=no "monster ogre"))

| **Ogre** |
| --- |
| [![Image 1: Ogre](https://quakewiki.org/w/images/thumb/c/c7/monster_quake_ogre.png/300px-monster_quake_ogre.png)](https://quakewiki.org/wiki/File:monster_quake_ogre.png) _"What's worse than a cannibal monster eight feet tall? One with a chainsaw. And a sack of grenades."_ **Health**200 **[Gib](https://quakewiki.org/wiki/Gib "Gib") threshold**-80 **Attacks**Chainsaw ([0-12]x[6-7]), Grenades ([40-20] splash, 80u radius) **Drop**2 rockets **1st appearance**[e1m2](https://quakewiki.org/wiki/e1m2 "e1m2") **Game version**†Shareware **Death message**_Player was destroyed by an Ogre_ † The data files for monsters that appear only in the registered version of Quake reside in pak1.pak rather than pak0.pak. |
[![Image 2](https://quakewiki.org/w/images/thumb/c/c5/Ogre.png/300px-Ogre.png)](https://quakewiki.org/wiki/File:Ogre.png)

Two Ogres in [e3m3](https://quakewiki.org/wiki/e3m3 "e3m3") (The Tomb of Terror).

**Ogres** are the most common foe in the realms of Quake. With a deadly chainsaw for melee fights and a grenade launcher otherwise (though their grenade launcher is weaker than the player's), they can truly pack a punch. If you can, get somewhere higher up than they are, because they are unable to aim vertically and their own grenades might bounce back and hit them. Use a [Double-Barrelled Shotgun](https://quakewiki.org/wiki/Double-Barrelled_Shotgun "Double-Barrelled Shotgun") at close range, 4 shots should put them down. Otherwise, use a [Grenade Launcher](https://quakewiki.org/wiki/Grenade_Launcher "Grenade Launcher") or a [Rocket Launcher](https://quakewiki.org/wiki/Rocket_Launcher "Rocket Launcher") for an even return of ammo, as they drop two rockets upon their demise.

## Tactics

*   Try and abuse the fact that Ogres can't aim up or down. Their grenade has a small amount of arch letting it go up small ledges, but high points allow them to be easily picked off. Watch out for Ogres above as their grenades will bounce off walls and possibly into you.

*   The Ogre's grenade will stay active for 2.5 seconds if it didn't hit anything. Make sure not to accidentally walk near it while it's lying on the ground.

*   The Ogre's splash damage from its grenades combined with its higher health makes it great for causing chaos in fights. Try and use infighting where possible.

*   Ogres have limited range, but don't be fooled as the grenade bounce can make it go quite far. Keeping a distance and using the nailguns or Rocket Launcher is the safest bet. The Double-barreled Shotgun can also take them down relatively quickly in close range as their large hitbox makes them an easy target.

*   Their chainsaw can be quite deadly and they'll lunge at you while attacking with it. Try not to get too close.

## Bugs

*   Since the player's grenade launcher doesn't do impact damage like the rocket launcher, hitting the Ogre hitbox's corners can cause it to take 3 grenades to kill instead of 2. Aiming for the center of the Ogre from a cardinal direction is the best way to guarantee they always go down in 2.

*   It's possible the inability for Ogres to aim vertically was an oversight as their projectiles set the z velocity directly to 200u/s instead of adding 200u/s like how the player's grenade launcher does.

| **monster_ogre** ([Ogre](https://quakewiki.org/wiki/monster_ogre)) |
| --- |
| **Entity type**point **Entity class**monster **Dimensions**64 x 64 x 88 **Quake-C**[ogre.qc](https://quakewiki.org/wiki/ogre.qc "ogre.qc") **Precaches**progs/ogre.mdl progs/h_ogre.mdl progs/grenade.mdl ogre/ogdrag.wav ogre/ogdth.wav ogre/ogidle.wav ogre/ogidle2.wav ogre/ogpain1.wav ogre/ogsawatk.wav ogre/ogwake.wav |

## Entity information

**monster_ogre** is the [entity](https://quakewiki.org/wiki/Entity "Entity") for placing **Ogres** in a level.

### Usage

Ogres are best used as a catch-all mid tier monster. The fact they're both deadly in close and mid ranges alongside their relatively smaller health pool makes them good for a lot of encounters. Be mindful of the fact that they drop 2 rockets on death making them a healthy source of ammo. Since Ogres take 2 rockets to kill, they're fully efficient.

Normally vertical heights aren't good for Ogres, but when placed far above they can be quite hard to predict. The bouncy nature of their grenades can be used to throw off players by making it hard to dodge their attacks directly. Giving them something to bounce off of can add quite a bit of challenge, especially as it forces the player to look up and take their eyes off any monsters on the ground. Avoid putting them below the player as they have no way of attacking them from this position.

Since Ogres have splash damage they can easily trigger infighting. It's best to give them an elevation advantage during crowded fights so they won't accidentally get caught in battles against melee enemies like Fiends and Knights. On ground-level fights the timed explosive delay of their grenades can be used to create small area denials that force the player to move around the arena. Dodging isn't enough as players also need to avoid the still-active grenades. Be sure to give the Ogre itself enough room to maneuver as they take half damage from their own explosions.

On Nightmare Ogres take on turret-like behavior as they won't try and move between attacks.

### Attributes

#### Keys

_targetname_ The targetname of the Ogre. When triggered, the Ogre will wake up if inactive.
_target_ The targetname of the entity to be triggered when the Ogre dies.
_killtarget_ The targetname of the entity to be removed when the Ogre dies.

#### Spawnflags

The monster_ogre entity supports the following [spawnflags](https://quakewiki.org/wiki/Entity#Spawnflags "Entity"):

| Flag | Common Name | Description |
| --- | --- | --- |
| 1 | Ambush | The Ogre will not wake up from seeing other monsters wake ups. |

It also supports the standard spawnflags for difficulty and deathmatch presence.

| Flag | Common Name | Description |
| --- | --- | --- |
| 256 | Not on Easy | The Ogre will not spawn on Easy difficulty. |
| 512 | Not on Normal | The Ogre will not spawn on Normal difficulty. |
| 1024 | Not on Hard | The Ogre will not spawn on Hard difficulty. |
| 2048 | Not in Deathmatch | The Ogre will not spawn in Deathmatch mode. |

### Definitions

#### FGD Definition

This is the format used by [TrenchBroom](https://quakewiki.org/wiki/TrenchBroom "TrenchBroom") and [Worldcraft](https://quakewiki.org/wiki/Worldcraft "Worldcraft"). Note that the model(...) parameter is not supported by Worldcraft. This does not include the Monster base class definition, which is also required.

@PointClass base(Monster) size(-16 -16 -24, 16 16 40) model(":progs/ogre.mdl")
    = monster_ogre : "Ogre" []

#### DEF Definition

This is the definition format used for most old Quake editors, including the original [QuakeEd](https://quakewiki.org/wiki/QuakeEd "QuakeEd").

/*QUAKED monster_ogre (1 0 0) (-16 -16 -24) (16 16 40) Ambush
*/
