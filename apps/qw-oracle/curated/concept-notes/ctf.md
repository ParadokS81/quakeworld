---
title: "Capture the Flag"
summary: "Two teams, red and blue, fight to carry the enemy flag back to their own stand for a capture -- but only while their own flag is home. A capture is worth 15 points to the carrier and 10 to each teammate, so one capture outweighs a fistful of frags. KTX runs David Zoid Kirsch's Threewave CTF lineage, with an optional grappling hook and four runes as its distinctive layer."
slug: ctf
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-30
scope: engine-scoped
engines_covered: [ktx]

experience_group: objective
kind: standalone
deathmatch_flag: 3
roster: "5on5 native; also 4on4 / 2on2 / 1on1 (16-player cap)"
loadout: item-pickup
objective: capture-most-flags
score_system: capture-points

canonical_id: ktx:game_mode:ctf
gameplay_source_id: ktx
source_ref: commands.c:4543
mode_default_init_array: ctf_um_init
wiki_status: wiki-upstream
wiki_page_slug: Capture_the_Flag
introduced_by: "David \"Zoid\" Kirsch (Threewave CTF)"
introduced_in_version: "Threewave CTF (1996)"
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:ctf
  - ktx:command:mctf
  - ktx:cvar:k_mode
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_ctf_based_spawn
  - ktx:cvar:k_ctf_ga
  - ktx:cvar:k_ctf_hook
  - ktx:cvar:k_ctf_hookstyle
  - ktx:cvar:k_ctf_runes
  - ktx:cvar:k_ctf_rune_power_hst
  - ktx:cvar:k_ctf_rune_bounce
  - ktx:cvar:k_ctf_custom_models
  - ktx:cvar:k_ctf_hurt_items
  - ktx:cvar:k_dis
  - ktx:command:tossrune
  - ktx:command:tossflag
  - ktx:command:flagstatus
  - ktx:command:dropquad
  - ktx:command:nohook
  - ktx:command:norunes
  - ktx:command:noga
related_modes:
  - {slug: 4on4, relation: similar-loadout}
---

## Summary

Capture the Flag is QuakeWorld's objective team mode: two teams, red and blue, each defend a flag at a stand in their base and try to carry the *enemy* flag back to their own stand. The catch that makes it a game and not a footrace is that you score **only while your own flag is home** -- if the enemy has taken yours, you have to survive holding theirs until a teammate returns it. A capture is worth 15 points to the carrier plus 10 to every teammate, so a single capture outweighs a run of frags and the whole match bends around the flag rather than the kill count. KTX runs David "Zoid" Kirsch's Threewave CTF, carrying forward its two signature toys -- an optional grappling hook and four collectible runes. You start a game with `/ctf`.

## Activate

On a KTX server, type `/ctf` in the console, then pick a side with `/team red` or `/team blue` and ready up. You can append a match tag for demo and QTV naming: `ctf EQL`.

CTF is reachable on a stock server; whether the grappling hook and runes are switched on is a server setting (see *Settings to tune* and *Hosting & settings*).

## Basic ruleset

Activating CTF locks in the server state that defines the mode:

- **`deathmatch 3`** -- weapons stay on the floor after pickup (a duel-style economy, not 4on4's weapon-denial game).
- **`teamplay 4`** -- KTX's CTF teamplay: teammates take no damage from each other's weapons, but knockback still applies (a rocket can boost a teammate).
- **`k_dis 2`** -- no out-of-water lightning-gun discharge, which closes the suicide-frag exploit.
- **`timelimit 10`**, with a 5-minute overtime on a draw.
- **`maxclients 16`** -- 5on5 native, also 4on4 / 2on2 / 1on1.

Two house rules round it out: every player spawns with 50 green armor to blunt spawn-fragging (tunable -- see *Settings to tune*), and you cannot suicide in the first 10 seconds of a match.

## Settings to tune

CTF's distinctive knobs -- the dials a server (or a pickup host) changes to shape the game. The two big ones default **off**:

- **`k_ctf_hook`** (default `0`) -- the grappling hook. Most competitive servers turn it on; players toggle it off in-game with `nohook`. See *How it plays* for what it does.
- **`k_ctf_hookstyle`** (`1` classic / `2` fast / `3` smooth / `4` crhook) -- the hook's reel-in physics and whether it can be cancelled mid-throw. Players can also **vote** the style mid-session (`hook_classic` / `hook_fast` / `hook_smooth` / `hook_crhook`; `k_vp_hookstyle` sets the threshold).
- **`k_ctf_runes`** (default `0`) -- the four collectible runes; off in-game with `norunes`.
- **`k_ctf_rune_power_res` / `_str` / `_hst` / `_rgn`** (default `2.0` each) -- per-rune strength; set one to `0` to drop that rune from the rotation. The famous Threewave "double-speed" Haste is `k_ctf_rune_power_hst 8`, which KTX does not ship. `k_ctf_rune_bounce` (default `3`) controls how dropped runes bounce.
- **`k_ctf_ga`** (default `1`) -- the 50 green spawn armor; disable per-server or in-game with `noga`.
- **`k_ctf_based_spawn`** (default `1`) -- spawn each team on its own base side; KTX forces it off on maps without per-team spawn points.
- **`k_ctf_custom_models`** / **`k_ctf_hurt_items`** -- cosmetic flag/hook models; whether flags and runes are destroyed by lava and damage triggers.

## How it plays

Two teams fight over two flags. Each team's flag sits on a stand in its base; grabbing the enemy flag is just a matter of touching it, and from that moment you are the carrier -- a marked player the whole enemy team wants dead. You score by carrying it to your own stand, but **only if your own flag is sitting at home**. If your flag has been taken, the touch does nothing; you have to stay alive with the enemy flag until a teammate kills their carrier or returns yours, and then complete the capture. This single rule is what turns CTF into a back-and-forth of pressure and counter-pressure instead of a one-way race.

When a flag carrier dies, the flag drops where they fell. Either team can reach it: the attacking team re-grabs it and the run continues, while a single touch from the defending team instantly teleports it home. A flag left lying on the ground returns to its base on its own after 30 seconds, so a dropped flag is a brief window, not a permanent loss.

Weapons stay on the floor after pickup -- the same economy as a duel -- so CTF is not the weapon-denial game team deathmatch is; the map's job is to feed an ongoing fight, not to be controlled and starved. Powerups are live, and the Quad in particular is decisive: a Quad on your flag carrier, or hunting the enemy carrier, swings a round. Friendly fire deals no damage but knockback still applies, so a well-placed rocket can boost a teammate (and the carrier) across a gap.

Scoring rewards the whole flag economy, not just the capture:

- **Capture** -- 15 to the carrier, 10 to each teammate (so 45 total in a 4-player team).
- **Killing the enemy flag carrier** -- 2 bonus points on top of the frag.
- **Assists** -- 2 more if you fragged the enemy carrier within 6 seconds of your team's capture, 1 if you returned your own flag within 4 seconds of it.
- **Defending** -- 2 points for fragging an enemy near your flag, 2 for fragging someone attacking your flag carrier, 1 for a frag near your own carrier. Defending genuinely scores; the source comment puts it plainly -- "Defending the flag is now two bonus points rather than one."
- **Frags** -- 1 each, as usual.

The team with the most points when the clock runs out wins.

CTF play organizes around roles. A team usually fields a designated **flag runner** -- typically the fastest player and the best with the hook -- whose job is to get in, grab, and get out, evading fights rather than seeking them. The carrier is the team's whole score engine, so keeping them alive is the single most important and most overlooked skill in competitive CTF. Around the runner sit **defenders** holding the base (a rune-bearer on defense is especially hard to shift) and **map-control** players cycling between the Quad and pressure on the enemy flag. The modern consensus is that the best defense is offense: control the center, keep constant pressure on the enemy flag, and the other team is too busy defending to attack. The three things a team always balances are flag control, rune control, and the Quad -- a teammate carrying both the Quad and the enemy flag is the highest-value player on the map.

### The grappling hook

The grapple is CTF's signature mobility tool and the skill that most separates strong CTF players from the rest -- a fast carrier who can hook out of a base before the defense reacts is the engine of a team. When a server enables it, every player gets the hook in their inventory and fires it with `impulse 22` (or the autofire `+fire 22` on a bind). Most players set it up through the `on_enter_ctf` alias, which runs automatically when the server switches to CTF -- the tidy place for CTF binds:

```
alias on_enter_ctf "bind q impulse 22; bind r tossrune"
```

To see the CTF-aware status bar (score, time, your rune, which flags are taken), bind the `+scores` command to a key you hold -- e.g. `bind tab +scores`. Don't put `+scores` in `on_enter_ctf`: it's a hold (`+`/`-`) command, so firing it once on entry leaves the bar stuck on until you run `-scores`. The four hook styles differ in how the hook reels you in and whether it can be cancelled mid-throw (set or voted via `k_ctf_hookstyle` -- see *Settings to tune*).

The hook was contentious from the start. Zoid himself thought it too strong:

> "...As for the grapple, after seeing how it was being used so effectively in CTF, I felt it was too fast. A player could be gone before you had a chance to even blink and that made it too powerful. But, it became part of the game and players worked to accommodate it."

CTF without the hook and runes is the older "pure" or "classic" style -- the `mctf` command turns both off in one shot. In QuakeWorld, hook-on is the norm in active play.

### Runes

CTF is one of the only QuakeWorld modes with its own special powerups. Four runes can spawn on the map, each a persistent buff you keep until you die or drop it, and a player can carry only one at a time -- the `tossrune` command drops your rune for a teammate or to swap for a better one (`bind r tossrune` is a common setup). Each rune's strength, and whether it spawns at all, is set by its own power cvar (see *Settings to tune*). At the default strength:

- **Resistance** (Earth Magic) -- halves the damage you take. Quietly the strongest rune in a firefight.
- **Strength** (Black Magic) -- doubles the damage you deal. Stacked with a Quad, that is 8x damage.
- **Regeneration** (Elder Magic) -- regrows both health and armor by 5 every half-second up to 150. The health it gives you above 100 slowly rots back down once you lose the rune, unless you are holding a megahealth.
- **Haste** (Hell Magic) -- speeds up your movement and weapon refire, roughly a 25% movement boost at the default; the famous Threewave "double speed" Haste is a higher setting KTX does not ship.

Zoid framed the runes as a control mechanic rather than raw power: *"The runes are all about control, control the runes and you can take control of the level. Good CTF teams take great care in protecting their rune bearers and placing them in strategic positions."*

## Maps

CTF runs on two kinds of map. **Dedicated CTF maps** ship with built-in flag-spawn entities; **standard maps** are made playable by KTX's entity-file overlay (`sv_loadentfiles_dir ctf`), which loads CTF flag and spawn definitions over a vanilla map without touching its BSP. Mirrored maps are symmetric and fair to both sides; adapted episode maps usually favor one base (closer items, easier to hold), so teams sometimes pick a side. Individual maps can carry per-map config overrides -- a map cfg can force the hook and runes off, for instance.

- **Dedicated (Threewave set):** `ctf1`, `ctf5`, `ctf8`, `ctf2m1`, `ctf2m3`, `ctf2m8`, `ctf3m2`, plus the `rctf` series.
- **Adapted episode maps:** `e2m2` (the most-played non-dedicated CTF map), `e2m5`, `e1m5`, `e3m6`, `e4m3`.
- **Modern competitive:** `mammoth`, `qwrctf1`, `pound`, `capit`, `boom`, `gym`, `head` (gathered on the community's `maphub_v2` server hub).

## History

Capture the Flag was created by **David "Zoid" Kirsch** as Threewave CTF, and the first Threewave server went up in late 1996. It was the first goal-oriented teamplay mod for Quake and was adopted almost immediately; CTF grew its own community, many of whom played CTF more or less exclusively and never touched plain deathmatch.

The server side went through a lineage of mods -- the original Threewave, then PureCTF, then PureCTF Pro -- before KTX absorbed CTF as a built-in mode; the CTF source has been in the KTX tree since its pre-git SVN era. Competitive practice has also shifted: matches today run 10-minute rounds, where the older Threewave-era games used 20-minute rounds that left more room to recover from an early deficit.

After a long quiet period, QuakeWorld CTF saw a competitive revival from 2022. **CTF Showdown** (16 May 2022, 4on4) was organized by Shining with Elguapo and Velocity, followed by **CTF Showdown 2** (December 2022, 4on4) on a rotation that included `mammoth` and `qwrctf1`, and a 2on2 Showdown in September 2023. Weekly community games have run alongside the tournaments.

## Hosting & settings

On a stock KTX or nquake server CTF is **available by default** -- it occupies the `UM_CTF` bit (value `64`) all to itself, with no bit-sharing, and the default `k_allowed_free_modes` (`4095`) already includes it. You only touch the mask to *restrict* a server; remove the bit to take CTF off the menu. The bitmask mechanics live once in *server-setup*, not here.

The optional toys are off by default, and most competitive servers turn them on in `server.cfg`:

```
set k_ctf_hook 1
set k_ctf_runes 1
```

The full dial list -- styles, rune strengths, spawn armor, base spawns -- is under *Settings to tune*.

One real constraint: **CTF cannot run with bots.** Disable them (`botcmd disable`) before switching a server to CTF.

## See also

- `4on4` -- the flagship team mode and the natural comparison: same item-pickup teamplay, but 4on4 is `deathmatch 1` (weapons disappear on pickup, so map control is the game) where CTF is `deathmatch 3` (weapons stay) and the objective, not the frag count, decides it.
- CTF is the sole member of the **objective** experience group -- it has no same-shape sibling, and it occupies the `UM_CTF` bit alone, so there are no bit-sharing siblings to be aware of (unlike 4on4 / ca / wipeout, which share one bit).
- `tossrune` / `tossflag` -- drop your carried rune or flag for a teammate. `flagstatus` -- print exactly who holds which flag and where. `dropquad` -- toggle whether a Quad holder drops the Quad when killed.
- `nohook` / `norunes` / `noga` -- in-game toggles for the hook, runes, and spawn armor; `mctf` turns the hook and runes off together for a "pure CTF" game.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values, including why CTF uses `deathmatch 3`.
