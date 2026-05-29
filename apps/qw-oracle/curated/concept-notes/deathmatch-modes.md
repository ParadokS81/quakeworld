---
title: "Deathmatch modes: the dmm flag values"
summary: "The `deathmatch` server flag is the ruleset dial under every KTX mode. KTX uses values 0-5; most modes bundle a default value on activation, and a few modes (the arena and aim formats) are defined by the value they set. This note is the reference for what each value does and which modes use it."
slug: deathmatch-modes
topic: classifier-metadata
status: draft
authored_by: qw-oracle
scope: engine-scoped
engines_covered: [ktx]
note_anchor_version: 1.47-2-g67253dc
related_entities:
  - ktx:command:dmm1
  - ktx:command:dmm2
  - ktx:command:dmm3
  - ktx:command:dmm4
  - ktx:command:dmm5
  - ktx:cvar:k_midair
  - ktx:cvar:k_instagib
  - ktx:cvar:k_freshteams
  - ktx:cvar:k_nosweep
  - ktx:cvar:k_clan_arena
related_messages: []
last_updated: 2026-05-30
---

# Deathmatch modes: the dmm flag values

## Summary

`deathmatch` is a server variable that selects the base ruleset for a game -- how items behave when picked up, whether weapons stay on the ground, whether ammo depletes. KTX recognises values 0 through 5 (`world.c:1631`). It is the surface a match is played on: most KTX modes bundle a deathmatch value when you activate them (`/4on4` sets `deathmatch 1`, `/1on1` sets `deathmatch 3`), so a player rarely sets it directly -- they ask for "1on1" or "povdmm4 aim," not "a dmm3 game." A handful of modes, though, are defined by the value they set: the arena modes are "deathmatch 5," and bare aim practice is "deathmatch 4."

## The deathmatch flag

Think of the flag as the playing surface and the mode as the format played on it: the same 1on1 duel feels completely different on the standard surface (`deathmatch 3`) versus the full-arsenal aim surface (`deathmatch 4`). The format (roster) and the surface (deathmatch value) are separate ideas, but KTX ships them pre-bundled -- each mode's UserMode init array writes its deathmatch value as one line among many.

Two things set the flag:

- **The mode commands** (`/4on4`, `/1on1`, `/carena`, ...). The everyday path -- the mode sets the value for you as part of activation.
- **The `dmm1`-`dmm5` console commands** (`commands.c:725-729`, dispatched to `ChangeDM`). The direct lever, clamped to 1-5 (`commands.c:2882`). These are admin / practice tools; `dmm4` is the one a player invokes by hand, to drop into bare aim practice.

The flag is also a **required baseline** for the cvar-toggle mutators: midair and instagib refuse to enable unless `deathmatch 4` is set, and freshteams / nosweep require `deathmatch 1` (`world.c:1760-1775`). You set the surface first, then layer the mutator on top.

## The values

### dmm0 -- cooperative

Not really a deathmatch mode: `deathmatch 0` enables cooperative play. It is not reachable through the `dmm` commands (`ChangeDM` clamps to 1-5) and no KTX competitive mode uses it.

### dmm1 -- team deathmatch, weapons vanish

All items disappear when picked up and respawn after a delay (ammo at 30s). Crucially, **weapons do not stay on the ground** -- a picked-up weapon is removed (`_4on4_um_init`, `commands.c:4355`, comment "weapons wont stay on pickup"). KTX uses it for team sizes of three per side and up (4on4, 3on3, 10on10, XonX, 3on3on3, 4on4on4). The competitive logic: in larger teams, weapon denial and map control matter, so a dropped weapon should not sit waiting to be re-grabbed.

### dmm2 -- the Doom 2 holdover (unused)

Weapons stay, but health, ammo, and powerups vanish on pickup and do not reappear until the match ends. A holdover from Doom 2 duel conventions, used by no modern KTX gametype -- the source calls it out directly: `items.c:407`, comment "deathmatch 2 is silly old rules."

### dmm3 -- the standard, weapons stay

The compromise between dmm1 and dmm2, and the most common ruleset in QuakeWorld: weapons stay on the ground, while consumables (health, ammo, powerups) vanish on pickup but respawn -- and ammo respawns twice as fast as in dmm1 (15s vs 30s, `items.c:1347`). KTX uses it for the small formats (1on1, 2on2, 2on2on2), Free For All, and CTF (`_1on1_um_init` `commands.c:4216`, `ffa_um_init` `:4419`, `ctf_um_init` `:4438`, all "deathmatch 3 // weapons stay"). In small teams, weapons should always be available, so they persist.

### dmm4 -- the full-arsenal aim ruleset

You spawn with everything -- the full weapon set, 255 of each ammo, 250 health, red armor (`client.c:~2270`) -- and items already on the map do not respawn once taken. It is built for aim and infight practice on purpose-made maps (povdmm4, amphi). Two properties give it its character: **ammo never depletes** (every per-weapon decrement is guarded `(deathmatch != 4) && !k_bloodfest` -- `weapons.c:830`, `:879`, and throughout), and the Quad is even renamed "OctaPower" (`items.c:2341`). dmm4 is the base several other experiences build on: midair, lgc, and instagib all *require* it (`world.c:1760-1769`; entering or leaving dmm4 toggles them on/off, `commands.c:2889-2894`), and tot, bloodfest, and race run on dmm4 as well. Bare dmm4 -- played 1on1 on an aim map -- is itself a distinct mode; see its own note.

### dmm5 -- the arena ruleset

KTX's Clan Arena and Wipeout ruleset: both arena init arrays set `deathmatch 5` (`carena_um_init` `commands.c:4487`, `wipeout_um_init` `:4462`). For item respawn it behaves like dmm3 -- the two values are grouped together throughout the item code (`items.c:1347`, `:2604`, `bot_items.c:666`) -- but the arena modes layer their own rules on top (no items on the map, full spawn, round-based elimination).

> **Correction to the QWiki "Deathmatch" page.** That page states dmm5 is "absent from KTX." This is stale. KTX validates `deathmatch` 0-5 (`world.c:1631`) and uses value 5 as its arena ruleset. What is genuinely absent is KTPro's higher *gametypes* 6-8 -- KTX has no `deathmatch 6/7/8`. The wiki conflates KTPro's old gametype numbering with the live deathmatch value 5.

## How modes set the flag

A player almost never types a dmm command; the mode bundles the value:

| deathmatch | What it does | Modes that bundle it |
|---|---|---|
| 1 | weapons vanish on pickup; items respawn | 4on4, 3on3, 10on10, XonX, 3on3on3, 4on4on4 |
| 3 | weapons stay; consumables respawn (fast) | 1on1, 2on2, 2on2on2, ffa, ctf |
| 4 | full arsenal on spawn; no item respawn; ammo never depletes | bare dmm4 (aim), midair, lgc, instagib, tot, bloodfest, race |
| 5 | arena ruleset (dmm3-like item economy + no-items + full spawn) | ca, wipeout |

(0 = coop, 2 = unused. Both are valid values but no live mode uses them.)

## Consumer implications

- A tool answering "what is dmm4," "why does my ammo not deplete," or "why do weapons disappear in 4on4 but not 1on1" can resolve all of it here -- the flag explains a family of behaviours (item respawn, weapon persistence, ammo decrement) that otherwise look like unrelated quirks.
- The deathmatch value is the join between a mode and its item economy: knowing a mode's value predicts how its pickups behave.
- Bare dmm4 is the one value that is also a played mode in its own right; the aim-practice note carries that experience.

## References

- KTX `1.47-2-g67253dc`.
- Valid value range: `world.c:1631-1632`.
- Direct setters: `dmm1`-`dmm5` commands `commands.c:725-729`; `ChangeDM` `commands.c:2871` (clamp `:2882`; dmm4 enter/leave mutator toggles `:2889-2894`).
- Per-mode values: `_1on1_um_init` `commands.c:4216` (dmm3), `_4on4_um_init` `:4355` (dmm1), `ffa_um_init` `:4419` (dmm3), `ctf_um_init` `:4438` (dmm3), `wipeout_um_init` `:4462` (dmm5), `carena_um_init` `:4487` (dmm5).
- Behaviour: dmm2 "silly old rules" `items.c:407`; ammo respawn 15s in dmm3/5 vs 30s `items.c:1340-1347`; dmm3/5 grouped `items.c:2604`, `bot_items.c:666`; dmm4 ammo-decrement guard `weapons.c:830`/`:879`; dmm4 OctaPower `items.c:2341`; dmm4 spawn loadout `client.c:~2270`.
- Mutator baselines: `world.c:1760-1775`.
- QWiki "Deathmatch" page (snapshot 2026-05-04) -- harvested for the dmm0-3 prose and respawn timings; corrected on dmm5.

## Related concept notes

- `dmm4` (aim practice) -- bare dmm4 as a played mode; the full-arsenal aim format this flag value defines.
- Standard game: `1on1`, `2on2`, `4on4`, `3on3`, `10on10` and the other roster modes -- each bundles dmm1 or dmm3.
- Arena: `ca`, `wipeout` -- the dmm5 modes.
- dmm4-built modes: `midair`, `lgc`, `instagib`, `tot`, `bloodfest`, `race`.

<!-- triage notes: reference note (not a game_mode row; no experience_group). Wiki "Deathmatch.json" (~5000 chars) supplied accurate prose for dmm0-3 and the respawn-timer table (harvested); its dmm5-8 "absent from KTX" claim was corrected against world.c:1631 + the arena init arrays. No game-mode-curate (L1-GAP by design: deathmatch is not an L1 entity). -->
