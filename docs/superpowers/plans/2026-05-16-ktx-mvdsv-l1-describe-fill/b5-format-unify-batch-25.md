# B5 format-unify ledger -- batch 25

**Batch:** 25 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:disable:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with side-effect list | to-shape: D20-template

### ktx:command:disable:frogbot:std

- canonical_id: ktx:command:disable:frogbot:std
- prior length: 285
- new length: 265

- OLD description:
  > Turns frogbots off (standard bot command set; invoked as 'botcmd disable'). It clears the bot-enabled cvar (k_fb_enabled = 0), advances to the next map, and restores the player/spectator game mode that was active before bots were enabled. It has no effect while a match is in progress.

- NEW description:
  > Disables frogbots (invoked as 'botcmd disable'). Clears the bot-enabled flag, advances to the next map, and restores the player/spectator mode that was active before bots were enabled. Has no effect while a match is in progress.
  >
  > Set by: any player or spectator via 'botcmd disable'.

---

B5-RESULT | ktx:command:freeze | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with entity list | to-shape: D20-template

### ktx:command:freeze

- canonical_id: ktx:command:freeze
- prior length: 276
- new length: 291

- OLD description:
  > Toggles the map-freeze state (the k_freeze setting) and broadcasts whether it was enabled or disabled. While enabled and no match is running, moving map entities -- doors, platforms/lifts, and trains -- stay inert and do not activate. The command has no effect during a match.

- NEW description:
  > Toggles the map-freeze state and broadcasts the new setting. While frozen and no match is running, moving map entities (doors, platforms/lifts, trains) stay inert and do not activate. Has no effect during a live match.
  >
  > Default: off (k_freeze = 0).
  > Set by: any player (or admin spectator) via 'freeze'.

---

B5-RESULT | ktx:command:goalsummary:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose | to-shape: D20-template

### ktx:command:goalsummary:frogbot:editor

- canonical_id: ktx:command:goalsummary:frogbot:editor
- prior length: 283
- new length: 261

- OLD description:
  > Frogbot editor subcommand (botcmd goalsummary, available when bot editor mode is on). Prints a summary of the map's bot routing goals: for each goal number it lists the routing markers assigned to that goal (each marker's index and classname). Output goes to the issuing player only.

- NEW description:
  > Prints a per-goal summary of the map's bot routing goals (botcmd goalsummary, editor mode only). For each goal number, lists the routing markers assigned to that goal -- each marker's index and classname. Output goes to the issuing player only.
  >
  > Set by: any player or spectator via 'botcmd goalsummary' (requires bot editor mode).

---

B5-RESULT | ktx:command:infolock | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with jargon (admins-only bit, k_spec_info) | to-shape: D20-template

### ktx:command:infolock

- canonical_id: ktx:command:infolock
- prior length: 279
- new length: 260

- OLD description:
  > Admin command that toggles who may receive spectator info (specinfo). It flips the admins-only bit of k_spec_info: when on, the server announces that only admins can receive specinfos; when off, that all spectators can. Admin-only, and has no effect while a match is in progress.

- NEW description:
  > Admin command that toggles who may receive spectator info. When locked, the server announces "Only admins can receive specinfos"; when unlocked, "All spectators can receive specinfos". Has no effect during a live match.
  >
  > Default: unlocked (all spectators).
  > Set by: admin command 'infolock'.

---

B5-RESULT | ktx:command:motd | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with internal state detail | to-shape: D20-template

### ktx:command:motd

- canonical_id: ktx:command:motd
- prior length: 285
- new length: 268

- OLD description:
  > Re-displays the server's message-of-the-day to the calling client (player or spectator) for about 10 seconds. Outside matchless mode it does nothing while a match is in progress; if a MOTD is already showing for this client it prints 'Already showing motd' instead of starting another.

- NEW description:
  > Re-displays the server's message-of-the-day to the calling client for about 10 seconds. Prints 'Already showing motd' if one is already active for this client. Has no effect during a live match (unless the server is in matchless mode).
  >
  > Set by: any player or spectator via 'motd'.

---

B5-RESULT | ktx:command:n | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with handler detail | to-shape: D20-template

### ktx:command:n

- canonical_id: ktx:command:n
- prior length: 294
- new length: 225

- OLD description:
  > Admin response in the interactive kick walkthrough: declines kicking the client currently being prompted ('Kick player/spectator <name>?') and advances the prompt to the next client without kicking. Does nothing if the admin is not currently in kick mode. Counterpart to 'y' (confirm the kick).

- NEW description:
  > In the interactive admin kick walkthrough: declines kicking the currently prompted client and advances to the next one. Does nothing if not currently in kick mode. Counterpart to 'y' (confirm the kick).
  >
  > Set by: admin command 'n'.

---

B5-RESULT | ktx:command:pickup | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with vote-count detail | to-shape: D20-template

### ktx:command:pickup

- canonical_id: ktx:command:pickup
- prior length: 294
- new length: 274

- OLD description:
  > Toggles the calling player's vote for a pickup game and broadcasts the player's stance ("pickup!" or "no pickup") to everyone, including the current number of votes still required when applicable. Has no effect while a match is in progress, and is rejected while captain team-picking is active.

- NEW description:
  > Toggles the calling player's vote for a pickup game. Broadcasts "pickup!" or "no pickup" to all players, plus the remaining votes required when applicable. Has no effect during a live match, and is rejected while captain team-picking is active.
  >
  > Set by: any player via 'pickup'.

---

B5-RESULT | ktx:command:race_chasecam_freelook | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose | to-shape: D20-template

### ktx:command:race_chasecam_freelook

- canonical_id: ktx:command:race_chasecam_freelook
- prior length: 275
- new length: 236

- OLD description:
  > Toggles the calling spectator's race chasecam freelook on or off and prints the new state ("Chasecam freelook enabled/disabled"). With freelook enabled the spectator can look around freely while in chasecam. Has no effect when the race-mode command preconditions are not met.

- NEW description:
  > Toggles race chasecam freelook on or off and prints the new state ("Chasecam freelook enabled/disabled"). With freelook enabled, the viewer can look around freely while following a racer in chasecam. Only available in race mode.
  >
  > Set by: any player via 'race_chasecam_freelook'.

---

B5-RESULT | ktx:command:race_route_clear | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with effect list | to-shape: D20-template

### ktx:command:race_route_clear

- canonical_id: ktx:command:race_route_clear
- prior length: 286
- new length: 290

- OLD description:
  > Clears the current race route: removes all route entities (start, checkpoints, finish), restores every player's full weapon set, unmutes all players, clears the pacemaker, and broadcasts that the route was cleared. Only works in race mode and is refused while a race run is in progress.

- NEW description:
  > Clears the current race route: removes all route entities (start, checkpoints, finish), restores every player's full weapon set, unmutes all players, clears the pacemaker, and broadcasts the clear. Only available in race mode; refused while a race run is in progress.
  >
  > Set by: any player (or admin spectator) via 'race_route_clear'.

---

B5-RESULT | ktx:command:toggletracklist | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with k_allowtracklist internals | to-shape: D20-template

### ktx:command:toggletracklist

- canonical_id: ktx:command:toggletracklist
- prior length: 281
- new length: 267

- OLD description:
  > Toggles the k_allowtracklist permission on or off (and broadcasts the new state). When on, players are allowed to use the spectator-tracking list ('tracklist') during a match; when off, that list is restricted for players during a match. Has no effect while a match is in progress.

- NEW description:
  > Toggles the tracklist permission on or off and broadcasts the new state ("tracklist: on/off -- remember to also toggle klist"). When on, players may use the spectator-tracking list during a match. Has no effect during a live match.
  >
  > Set by: any player or spectator via 'toggletracklist'.

---

B5-RESULT | ktx:command:tpmsg | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose | to-shape: D20-template

### ktx:command:tpmsg

- canonical_id: ktx:command:tpmsg
- prior length: 279
- new length: 258

- OLD description:
  > Sends a predefined teamplay status message. Called with one argument naming a message (e.g. the message's command name), it sends that teamplay message; called with no argument or an unrecognized name, it prints the usage list of every available message name and its description.

- NEW description:
  > Sends a predefined teamplay status message by name. Called with no argument (or an unrecognized name), prints the full list of available message names and their descriptions.
  >
  > Set by: any player via 'tpmsg <message-name>'.

---

B5-RESULT | ktx:cvar:k_ctf_ga | FORMAT-UNIFIED | rev=1 | from-shape: two-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:k_ctf_ga

- canonical_id: ktx:cvar:k_ctf_ga
- prior length: 280
- new length: 268

- OLD description:
  > When enabled (non-zero), every player spawns with 50 points of green armor in CTF mode (only while a match is in progress and not in instagib/dmm4). When disabled, players spawn without this starting armor. Toggleable in-game via the CTF "ga" command (announced as "green armor").

- NEW description:
  > Gives every player a 50-point green armor bonus on spawn in CTF mode. Active only during a live match; no effect in instagib or dmm4.
  >
  > 0 = no spawn armor.
  > 1 = 50 green armor on spawn.
  >
  > Default: 0.
  > Set by: server config or admin command 'noga' in-game.

---

B5-RESULT | ktx:cvar:k_ctf_hurt_items | FORMAT-UNIFIED | rev=1 | from-shape: two-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:k_ctf_hurt_items

- canonical_id: ktx:cvar:k_ctf_hurt_items
- prior length: 282
- new length: 247

- OLD description:
  > When enabled (non-zero), CTF flags and runes that fall into a damage trigger (e.g. lava, slime, the void) are returned instead of lost: a flag is sent back to its spawn position and a rune is forced to respawn. When disabled, the flag/rune is not specially handled by hurt triggers.

- NEW description:
  > Controls whether CTF flags and runes that fall into a damage trigger (lava, slime, void) are automatically recovered. When enabled, a flag returns to its spawn point and a rune respawns instead of being lost.
  >
  > 0 = flags/runes lost to hazards.
  > 1 = flags/runes automatically recovered.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_demoname_date | FORMAT-UNIFIED | rev=1 | from-shape: three-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:k_demoname_date

- canonical_id: ktx:cvar:k_demoname_date
- prior length: 286
- new length: 256

- OLD description:
  > Appends a timestamp to the end of the automatically generated demo filename. The value is a strftime() format string (for example %Y%m%d-%H%M produces 20260518-1430); whatever fields the format contains determine how the timestamp looks. If the value is empty, no timestamp is appended.

- NEW description:
  > Appends a timestamp to auto-generated demo filenames. The value is a strftime format string (e.g. %Y%m%d-%H%M produces 20260518-1430). Empty value = no timestamp appended.
  >
  > Default: "" (no timestamp).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_keepspectalkindemos | FORMAT-UNIFIED | rev=1 | from-shape: two-sentence prose with QTV-only flag detail | to-shape: D20-template

### ktx:cvar:k_keepspectalkindemos

- canonical_id: ktx:cvar:k_keepspectalkindemos
- prior length: 279
- new length: 218

- OLD description:
  > Controls whether spectator chat is written into recorded MVD demos. When 0, spectator talk is flagged QTV-only (BPRINT_QTVONLY) so it goes to the live QTV stream but is excluded from the saved MVD demo. When 1, spectator talk is also recorded into the demo. 0 = off, 1 = enabled.

- NEW description:
  > Controls whether spectator chat is recorded into MVD demos. When off, spectator talk reaches the live QTV stream but is excluded from the saved demo file.
  >
  > 0 = spectator chat excluded from demos.
  > 1 = spectator chat included in demos.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_matchless_countdown | FORMAT-UNIFIED | rev=1 | from-shape: two-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:k_matchless_countdown

- canonical_id: ktx:cvar:k_matchless_countdown
- prior length: 288
- new length: 258

- OLD description:
  > Only effective in matchless mode. When 0, no pre-game countdown runs in matchless mode (play begins without a counted intro) and the "The match has begun!" announcement is suppressed. When non-zero, the normal countdown timer and that announcement run even though the server is matchless.

- NEW description:
  > Only effective in matchless mode. When 0, the pre-game countdown and "The match has begun!" announcement are suppressed and play begins immediately. When non-zero, the normal countdown runs even in matchless mode.
  >
  > 0 = no countdown in matchless mode.
  > 1 = countdown runs in matchless mode.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_membercount | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:k_membercount

- canonical_id: ktx:cvar:k_membercount
- prior length: 293
- new length: 262

- OLD description:
  > Minimum number of players each team must have before a match can start. In team/CTF games, if any team has fewer players than this value the match is blocked from starting and players see "Server wants at least N players in each team". Counted in players per team. 0 means no per-team minimum.

- NEW description:
  > Minimum number of players each team must have before a match can start. In team/CTF modes, if any team is below this count the match is blocked and players see "Server wants at least N players in each team". 0 means no per-team minimum.
  >
  > Range: 0 or more (players per team).
  >
  > Default: 0 (no minimum).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_no_scoreboard_ghosts | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose with string-emptiness toggle detail | to-shape: D20-template

### ktx:cvar:k_no_scoreboard_ghosts

- canonical_id: ktx:cvar:k_no_scoreboard_ghosts
- prior length: 294
- new length: 268

- OLD description:
  > When set to any non-empty string, disconnected players are not kept as scoreboard "ghosts": their slot is not preserved and they are not restored onto the scoreboard if they reconnect. Empty (the default) keeps the ghost-scoreboard behavior. Intended for QuakeWorld-Engine client compatibility.

- NEW description:
  > When set to any non-empty value, disables the ghost-scoreboard feature: disconnected players' slots are not preserved and they are not restored to the scoreboard on reconnect. Empty (the default) keeps the ghost-scoreboard behavior. Intended for QuakeWorld-Engine client compatibility.
  >
  > "" (empty) = ghost-scoreboard enabled.
  > any non-empty value = ghost-scoreboard disabled.
  >
  > Default: "" (ghost-scoreboard on).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_pace_headstart | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:k_race_pace_headstart

- canonical_id: ktx:cvar:k_race_pace_headstart
- prior length: 289
- new length: 230

- OLD description:
  > Head-start given to the pacemaker ghost, in seconds. The value is added to the ghost's effective race time and clamped to the range 0.00-1.00 seconds (values outside are pulled to the nearest bound), so the ghost appears that many seconds ahead on its recorded path. 0 means no head-start.

- NEW description:
  > Head-start given to the pacemaker ghost in seconds. Added to the ghost's effective race time so it appears that many seconds ahead on its recorded path.
  >
  > Range: 0.00 to 1.00 (seconds, clamped).
  >
  > Default: 0.5.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:timing_players_time | FORMAT-UNIFIED | rev=1 | from-shape: multi-sentence prose without Default/Set-by | to-shape: D20-template

### ktx:cvar:timing_players_time

- canonical_id: ktx:cvar:timing_players_time
- prior length: 288
- new length: 252

- OLD description:
  > Time in seconds a player must go without a post-think (i.e. be lagging) before the server treats them as timing out and applies the timing_players_action effects. Clamped to the range 0-30; a value of 0 falls back to the built-in default of 6 seconds. Requires allow_timing to be enabled.

- NEW description:
  > Time in seconds a player must be lagging (no network activity) before the server applies the timing_players_action effects. Clamped to 0-30; a value of 0 falls back to 6 seconds. Requires allow_timing to be enabled.
  >
  > Range: 0 to 30 (seconds). 0 = use built-in default of 6.
  >
  > Default: 0 (effective 6 seconds).
  > Set by: server config.

---
