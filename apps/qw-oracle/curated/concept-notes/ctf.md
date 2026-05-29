---
title: "Capture the Flag"
summary: "Two teams, red and blue, fight to carry the enemy flag back to their own stand for a capture -- but only while their own flag is home. A capture is worth 15 points to the carrier and 10 to each teammate, so one capture outweighs a fistful of frags. KTX runs David Zoid Kirsch's Threewave CTF lineage, with an optional grappling hook and four runes as its distinctive layer."
slug: ctf
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /ctf on a KTX server whose k_allowed_free_modes includes the UM_CTF bit (value 64) -- its own bit, shared with no other mode. Pre-match only; pick a side with /team red or /team blue, then ready up."
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

Capture the Flag is QuakeWorld's objective team mode: two teams, red and blue, each defend a flag at a stand inside their base and try to carry the *enemy* flag back to their own stand. The catch that makes it a game and not a footrace is that you can only score while your own flag is home -- if the enemy has taken your flag, you have to survive holding theirs until a teammate returns yours. A capture is worth 15 points to the carrier plus 10 to every teammate (45 in a four-player team), so a single capture is worth far more than a run of frags, and the whole match bends around the flag rather than the kill count. KTX implements David "Zoid" Kirsch's Threewave CTF, the 1996 mod that started the genre, carrying forward its two signature toys: an optional grappling hook for mobility and four collectible runes.

## How it plays

Two teams fight over two flags. Each team's flag sits on a stand in its base; grabbing the enemy flag is just a matter of touching it, and from that moment you are the carrier -- a marked player the whole enemy team wants dead. You score by carrying it to your own stand, but **only if your own flag is sitting at home**. If your flag has been taken, the touch does nothing; you have to stay alive with the enemy flag until a teammate kills their carrier or returns your flag, and then complete the capture. This single rule is what turns CTF into a back-and-forth of pressure and counter-pressure instead of a one-way race.

When a flag carrier dies, the flag drops where they fell. Either team can reach it: the attacking team re-grabs it and the run continues, while a single touch from the defending team instantly teleports it home. A flag left lying on the ground returns to its base on its own after 30 seconds, so a dropped flag is a brief window, not a permanent loss.

Unlike 4on4, CTF runs `deathmatch 3` -- weapons stay on the floor after they are picked up, the same economy as a duel. So CTF is not the weapon-denial game that team deathmatch is; the map's job is to feed an ongoing fight, not to be controlled and starved. Powerups are live, and the Quad in particular is decisive: a Quad on your flag carrier, or hunting the enemy carrier, swings a round. Friendly fire follows KTX's CTF teamplay model (`teamplay 4`): teammates take **no damage** from each other's weapons, but the *knockback* still applies, so a well-placed rocket can boost a teammate (and the carrier) across a gap.

Scoring rewards the whole flag economy, not just the capture:

- **Capture** -- 15 to the carrier, 10 to each teammate (so 45 total in a 4-player team).
- **Killing the enemy flag carrier** -- 2 bonus points on top of the frag.
- **Assists** -- 2 more if you fragged the enemy carrier within 6 seconds of your team's capture, 1 if you returned your own flag within 4 seconds of the capture.
- **Defending** -- 2 points for fragging an enemy near your flag, 2 for fragging someone who was attacking your flag carrier, 1 for a frag near your own carrier. Defending genuinely scores; the source comment puts it plainly -- "Defending the flag is now two bonus points rather than one."
- **Frags** -- 1 each, as usual.

The team with the most points when the clock runs out wins; matches default to 10-minute rounds with a 5-minute overtime on a draw. Two small house rules round it out: every player spawns with 50 green armor to take the edge off spawn-fragging, and you cannot suicide in the first 10 seconds of a match.

### The grappling hook

The grapple is CTF's signature mobility tool and the skill that most separates good CTF players from the rest -- a fast carrier who can hook out of a base before the defense reacts is the engine of a team. It is **off by default** in KTX (`k_ctf_hook 0`); when an admin enables it, every player gets the hook in their inventory and fires it with `impulse 22` (or the autofire form `+fire 22` on a bind). Most players set it up through CTF-specific binds -- see Starting a game.

KTX ships four hook styles, selected by `k_ctf_hookstyle` (1 = classic, 2 = fast, 3 = smooth, 4 = crhook). The style can be set in the server config, but players can also **vote** it mid-session with the `hook_classic` / `hook_fast` / `hook_smooth` / `hook_crhook` commands, with `k_vp_hookstyle` setting the percentage needed to pass. The styles differ in how the hook reels you in and whether it can be cancelled in mid-throw.

The hook was contentious from the start. Zoid himself thought it was too strong:

> "...As for the grapple, after seeing how it was being used so effectively in CTF, I felt it was too fast. A player could be gone before you had a chance to even blink and that made it too powerful. But, it became part of the game and players worked to accommodate it."

CTF without the hook (and runes) is the older "pure" or "classic" style -- KTX exposes it directly through the `mctf` command, which turns both hook and runes off in one shot. In QuakeWorld, though, hook-on is the norm in active play.

### Runes

CTF is one of the only QuakeWorld modes with its own special powerups. Four runes can spawn on the map, each a persistent buff you keep until you die or drop it. They are **off by default** (`k_ctf_runes 0`), and a player can carry only one at a time -- the `tossrune` command drops your rune for a teammate or to swap for a better one (`bind r tossrune` is a common setup).

Each rune's strength -- and whether it spawns at all -- is set by its own power cvar (`k_ctf_rune_power_res` / `_str` / `_hst` / `_rgn`), each defaulting to `2.0`; setting one to `0` removes that rune from the rotation. At the default power:

- **Resistance** (Earth Magic) -- halves the damage you take. Quietly the strongest rune in a firefight.
- **Strength** (Black Magic) -- doubles the damage you deal. Stacked with a Quad that becomes 8x damage.
- **Regeneration** (Elder Magic) -- regrows both health and armor by 5 every half-second up to 150. The health it gives you above 100 slowly rots back down once you lose the rune, unless you are holding a megahealth.
- **Haste** (Hell Magic) -- speeds up your movement and weapon refire. At the default power this is roughly a 25% movement boost; the famous Threewave "double speed" Haste corresponds to a higher setting (`k_ctf_rune_power_hst 8`), which KTX does not ship by default.

Zoid framed the runes as a control mechanic rather than raw power: *"The runes are all about control, control the runes and you can take control of the level. Good CTF teams take great care in protecting their rune bearers and placing them in strategic positions."*

## Starting a game

On a KTX server, type `/ctf` in the console. As with the other modes this only sets a match up -- it does not interrupt one in progress -- so it is a pre-match action. Then pick a side with `/team red` or `/team blue` and ready up. You can append a match tag for demo and QTV naming: `ctf EQL`.

If the server has the hook enabled, bind it before the match. The grapple fires on `impulse 22`, and the mode supports an `on_enter_ctf` alias that runs automatically when the server switches to CTF, which is the tidy place to set your CTF binds:

```
alias on_enter_ctf "+scores; bind q impulse 22; bind r tossrune"
```

`+scores` brings up the CTF-aware status bar (score, time, your rune, which flags are taken). The server has to allow CTF and decides whether the hook and runes are on -- see Hosting & settings. One thing to know going in: CTF and bots are mutually exclusive, so a server can't run CTF with frogbots enabled.

## Strategy

CTF play organizes around roles. A team usually fields a designated **flag runner** -- typically the fastest player and the best with the hook -- whose job is to get in, grab, and get out, evading fights rather than seeking them. The carrier is the team's whole score engine, so keeping them alive is the single most important and most overlooked skill in competitive CTF; good carriers read the map and lean on teammate cover and hook mobility to disengage.

Around the runner sit **defenders** holding the base (a rune-bearer on defense is especially hard to shift) and **map-control** players who cycle between contesting the Quad and pressuring the enemy flag. The modern consensus is that the best defense is offense: controlling the center of the map and keeping constant pressure on the enemy flag means their team is busy defending and has little left to attack you with. Over-investing in your own base while ignoring the enemy flag tends to lose to a team that just captures faster.

The three things a team is always balancing are flag control, rune control, and the Quad. A teammate carrying both the Quad and the enemy flag is the highest-value player on the map, and coordinating a Quad timing with a flag run is canonical CTF play.

## Maps

CTF runs on two kinds of maps. **Dedicated CTF maps** ship with built-in flag-spawn entities; **standard QuakeWorld maps** are made playable through KTX's entity-file overlay (`sv_loadentfiles_dir ctf`), which loads CTF-specific flag and spawn definitions over a vanilla map without touching its BSP.

The long-loved set includes `e2m2` (the most-played non-dedicated CTF map), `e2m5`, `e3m6`, and the classic Threewave maps `ctf5`, `ctf8`, `ctf2m1`, and `ctf2m3`. Modern competitive rotations have added maps like `mammoth` and `qwrctf1`. Mirrored CTF maps are symmetric and fair to both sides; episode maps usually favor one base over the other (closer items, easier to hold), so teams sometimes pick a side. Individual maps can carry per-map config overrides -- a map cfg can force the hook and runes off for that map, for instance.

## History

Capture the Flag was created by **David "Zoid" Kirsch** as Threewave CTF, and the first Threewave server went up in late 1996. It was the first goal-oriented teamplay mod for Quake and was adopted almost immediately; CTF grew its own community, many of whom played CTF more or less exclusively and never touched plain deathmatch.

The server side went through a lineage of mods -- the original Threewave, then PureCTF, then PureCTF Pro -- before KTX absorbed CTF as a built-in mode; the CTF source has been in the KTX tree since its pre-git SVN era. Competitive practice has also shifted: matches today run 10-minute rounds, where the older Threewave-era games used 20-minute rounds that left more room to recover from an early deficit.

After a long quiet period, QuakeWorld CTF saw a competitive revival from 2022. **CTF Showdown** (16 May 2022, 4on4) was organized by Shining with Elguapo and Velocity, followed by **CTF Showdown 2** (December 2022, 4on4) on a rotation that included `mammoth` and `qwrctf1`, and a 2on2 Showdown in September 2023. Weekly community games have run alongside the tournaments.

## Hosting & settings

CTF rides on the `UM_CTF` bit, value `64` -- and unlike the arena modes it has its own bit all to itself, so enabling CTF enables nothing else and no other mode enables CTF. On a stock KTX or nquake server `k_allowed_free_modes` defaults to `4095`, which already includes CTF; you only set the mask explicitly to *restrict* a server to a subset of modes.

```
# server.cfg -- 4095 is the stock default and already allows CTF (the 64 bit)
set k_allowed_free_modes 4095

# the two big toggles, both OFF by default -- most competitive servers turn them on
set k_ctf_hook 1
set k_ctf_runes 1
```

The cvars that define a CTF server, all applied on top of the `/ctf` preset:

- **`k_ctf_hook`** (default `0`) and **`k_ctf_hookstyle`** (`1`=classic, `2`=fast, `3`=smooth, `4`=crhook) -- the grapple and its physics. Players can also vote the style in-game (`hook_classic` etc.); `k_vp_hookstyle` sets the vote threshold.
- **`k_ctf_runes`** (default `0`) and the per-rune **`k_ctf_rune_power_res` / `_str` / `_hst` / `_rgn`** (default `2.0` each) -- the rune master switch and individual strengths. Set a rune's power to `0` to drop just that rune from the rotation; `k_ctf_rune_bounce` (default `3`) controls how dropped runes bounce.
- **`k_ctf_ga`** (default `1`) -- the 50 green armor every player spawns with, to cut down spawn-fragging. Disable per-server, or in-game with `noga`.
- **`k_ctf_based_spawn`** (default `1`) -- spawns each team on its own base side; KTX forces it off automatically on maps that lack per-team spawn points.
- **`k_ctf_custom_models`** and **`k_ctf_hurt_items`** -- cosmetic flag/hook models, and whether flags and runes are destroyed by lava and damage triggers.

The preset itself sets the surprising values an admin should recognize: `deathmatch 3` (weapons stay on the floor), `teamplay 4` (KTX's CTF teamplay -- no friendly damage but knockback applies), `k_dis 2` (no out-of-water lightning-gun discharge, killing the suicide-frag exploit), `timelimit 10`, and `maxclients 16`. The full enforced settings are in the `ctf_um_init` array reachable from this note's `mode_default_init_array` pointer.

Two operational notes: CTF cannot run with bots, so disable them (`botcmd disable`) before switching; and the `mctf` command is the one-shot way to turn the hook and runes both off for a "pure CTF" game without editing the config.

## See also

- `4on4` -- the flagship team mode and the natural comparison: same item-pickup teamplay, but 4on4 is `deathmatch 1` (weapons disappear on pickup, so map control is the game) where CTF is `deathmatch 3` (weapons stay) and the objective, not the frag count, decides it.
- CTF is the sole member of the **objective** experience group -- it has no same-shape sibling. It also occupies the `UM_CTF` bit alone, so there are no bit-sharing siblings to be aware of (unlike 4on4 / ca / wipeout, which share one bit).
- `tossrune` / `tossflag` -- drop your carried rune or flag for a teammate. `flagstatus` -- print exactly who holds which flag and where. `dropquad` -- toggle whether a Quad holder drops the Quad when killed.
- `nohook` / `norunes` / `noga` -- in-game toggles for the hook, runes, and spawn armor; `mctf` turns hook and runes off together.
- `deathmatch-modes` (pending) -- reference note on the `deathmatch` flag values, including why CTF uses `deathmatch 3`.
