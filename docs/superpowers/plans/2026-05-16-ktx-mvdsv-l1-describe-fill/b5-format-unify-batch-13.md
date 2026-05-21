# B5 format-unify ledger -- batch 13

**Batch:** 13 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:callalias | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence with usage/gate prose | to-shape: D20-template

### ktx:command:callalias

- canonical_id: ktx:command:callalias
- prior length: 403
- new length: 337

- OLD description:
  > Schedules one of the issuer's own client aliases to be run automatically after a delay. Usage: cmd callalias <aliasname> <time>. It is only usable within the first 15 seconds after connecting, the delay must be greater than 0 and at most 30 seconds, and only one pending alias may be queued at a time (a second call before the first fires is rejected). When the timer elapses the named alias is sent back to and executed on the issuer's client.

- NEW description:
  > Schedules one of the caller's own client aliases to execute automatically after a delay. Usage: callalias <aliasname> <time>.
  >
  > Constraints: only usable within the first 15 seconds after connecting; delay must be 1-30 seconds; only one pending alias may be queued at a time (a second call before the first fires is rejected).
  >
  > Set by: any player.

---

B5-RESULT | ktx:cvar:k_freshteams_pack_shells | FORMAT-UNIFIED | rev=1 | from-shape: verbose gate-condition prose with file:line refs | to-shape: D20-template

### ktx:cvar:k_freshteams_pack_shells

- canonical_id: ktx:cvar:k_freshteams_pack_shells
- prior length: 433
- new length: 302

- OLD description:
  > Fresh Teams (dmm1) only: the maximum number of shells a dropped backpack may carry when backpack ammo limiting is active (k_freshteams set and k_freshteams_limit_packs enabled). The dropped pack's shell count is clamped to the range 0..this value; any shells the dead player carried beyond this ceiling are not transferred to the pack. Units are shells (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_packs are both set.

- NEW description:
  > Fresh Teams (dmm1) only: maximum shells a dropped backpack may contain when ammo limiting is active. Any shells the dead player carried beyond this ceiling are not transferred to the pack. Has no effect unless k_freshteams and k_freshteams_limit_packs are both enabled.
  >
  > Units: shells (ammo count).
  >
  > Default: 20.
  > Set by: server config.

---

B5-RESULT | ktx:command:options | FORMAT-UNIFIED | rev=1 | from-shape: verbose enumeration with file:line refs | to-shape: D20-template

### ktx:command:options

- canonical_id: ktx:command:options
- prior length: 503
- new length: 320

- OLD description:
  > Prints a reference list of the available match-control commands to the caller's console, each with a one-line description (match-time +/-1 and +/-5 minutes, fraglimit +/-10, change deathmatch/teamplay mode, drop quad/ring/pack on death, locking mode, spawntype, toggle sv_maxspeed, powerups, fair packs, underwater discharge, spectator talk, midair, grenade, instagib, berzerk). It only displays the list and does not change any server state.

- NEW description:
  > Prints a quick-reference list of available match-control commands to the caller's console, each with a one-line description. Covers: match time (+/-1, +/-5 min), frag limit (+/-10), deathmatch/teamplay mode, drop settings (quad/ring/packs on death), lock mode, spawntype, speed limit, powerups, fair packs, discharge, spectator talk, midair, grenade mode, instagib, berzerk. Does not change any server state.
  >
  > Set by: any player.

---

B5-RESULT | ktx:command:fairpacks | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence with yawnmode detail | to-shape: D20-template

### ktx:command:fairpacks

- canonical_id: ktx:command:fairpacks
- prior length: 472
- new length: 349

- OLD description:
  > Cycles the fairpacks setting (server cvar k_frp) through three states and broadcasts the new state to everyone: 0 = disabled (normal backpack), 1 = the player's best weapon is placed in the backpack dropped on death, 2 = the last weapon the player fired is placed in that backpack. Each invocation advances 0 -> 1 -> 2 -> 0. The command is ignored while a match is in progress; under yawnmode the setting is forced to 2 and cannot be cycled.

- NEW description:
  > Admin command. Cycles the fair-packs setting (k_frp) through three states, broadcasting the change to all players. Has no effect while a match is in progress; yawnmode forces the setting to 2.
  >
  > 0 = disabled (standard backpack drop).
  > 1 = the player's best weapon goes into the death backpack.
  > 2 = the last weapon the player fired goes into the death backpack.
  >
  > Default: 0.
  > Set by: admin command 'fairpacks' (cycles 0 -> 1 -> 2 -> 0).

---

B5-RESULT | ktx:command:speed | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with clamping details and file:line refs | to-shape: D20-template

### ktx:command:speed

- canonical_id: ktx:command:speed
- prior length: 451
- new length: 306

- OLD description:
  > Toggles the server's player speed limit. With no match running, it switches sv_maxspeed between the standard 320 and the value of the k_highspeed cvar (clamped to 0-9999): if the limit is not currently 320 it is set back to 320, otherwise it is raised to k_highspeed. The new limit is applied to sv_maxspeed and to every connected player immediately, and the new value is announced to all players. Has no effect while a match is in progress.

- NEW description:
  > Admin command. Toggles sv_maxspeed between the standard 320 and the server's high-speed value (k_highspeed, clamped 0-9999). If sv_maxspeed is not currently 320, it is reset to 320; otherwise it is raised to k_highspeed. The change applies to all connected players immediately and is announced. Has no effect while a match is in progress.
  >
  > Set by: admin command 'speed'.

---

B5-RESULT | ktx:command:forcestart | FORMAT-UNIFIED | rev=1 | from-shape: verbose refusal-condition list with file:line refs | to-shape: D20-template

### ktx:command:forcestart

- canonical_id: ktx:command:forcestart
- prior length: 478
- new length: 313

- OLD description:
  > Admin command. Forces a match to begin without waiting for all players to ready up. It is refused if a match is already running or over, while the server is in practice mode, if the issuing admin is an unreadied player, if a forced start is already pending, if the start preconditions are not met, or if no players are present. On success it announces the forced start, sets the server status to "Forcestart", and begins the start sequence.

- NEW description:
  > Admin command. Forces a match to start without waiting for all players to ready up. Broadcasts "forces matchstart!" and sets the server status to "Forcestart".
  >
  > Refused if: a match is already running or over; server is in practice mode; a forced start is already pending; start preconditions are not met; no players are present.
  >
  > Set by: admin command 'forcestart'.

---

B5-RESULT | ktx:command:lockmode | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with broadcast/match-block details | to-shape: D20-template

### ktx:command:lockmode

- canonical_id: ktx:command:lockmode
- prior length: 422
- new length: 304

- OLD description:
  > Cycles the server connection-lock state one step each invocation (0 -> 1 -> 2 -> 0) by setting the k_lockmode cvar: 0 = unlocked, anyone may connect; 1 = teamlock, only players already on an existing team may connect while a game is in progress; 2 = fully locked, no players may connect while a game is in progress. The new state is broadcast to everyone. Has no effect while a match is in progress (must be changed before the game starts).

- NEW description:
  > Admin command. Cycles the server connection-lock state and announces the change to all players. Has no effect while a match is in progress.
  >
  > 0 = unlocked (anyone may connect).
  > 1 = team lock (only players already on an existing team may connect during a game).
  > 2 = fully locked (no players may connect during a game).
  >
  > Set by: admin command 'lockmode' (cycles 0 -> 1 -> 2 -> 0).

---

B5-RESULT | ktx:command:race_pacemaker | FORMAT-UNIFIED | rev=1 | from-shape: verbose sub-command enumeration with file:line refs | to-shape: D20-template

### ktx:command:race_pacemaker

- canonical_id: ktx:command:race_pacemaker
- prior length: 566
- new length: 363

- OLD description:
  > Configures the race pacemaker (a ghost replay racers can chase). With no argument it loads a recorded run as the pacemaker, or disables the pacemaker if one is already loaded. Sub-commands: 'headstart' adjusts the pacemaker's head-start time, 'trail' adjusts (or turns off) the trail resolution, 'jumps' toggles the pacemaker jump indicators, and 'off' disables the pacemaker. Only works in race mode and is refused while a race is active.

- NEW description:
  > Race mode only. Configures the pacemaker -- a ghost replay that racers can chase. Only available in race mode; refused while a race is active.
  >
  > No argument: loads a recorded run as the pacemaker, or disables it if one is already loaded.
  > headstart: adjusts the pacemaker's head-start time.
  > trail: adjusts (or disables) the trail resolution.
  > jumps: toggles the pacemaker jump indicators.
  > off: disables the pacemaker.
  >
  > Set by: any player.

---

B5-RESULT | ktx:cvar:k_freshteams | FORMAT-UNIFIED | rev=1 | from-shape: verbose file:line prose with sub-option list | to-shape: D20-template

### ktx:cvar:k_freshteams

- canonical_id: ktx:cvar:k_freshteams
- prior length: 490
- new length: 319

- OLD description:
  > Master toggle for FreshTeams mode (only valid in dmm1; it is force-disabled if deathmatch is not 1). When enabled, picked-up weapons respawn on a short timer (k_freshteams_weapon_time seconds instead of the normal 30) and the FreshTeams sub-options become available -- limited backpack ammo (FreshPacks), limited weapon ammo on sweep (FreshGuns), fast ammo, and timed weapon respawns. The scoreboard shows 'FreshTeams on'. 0 = off, 1 = on.

- NEW description:
  > Master toggle for Fresh Teams mode. Only valid in dmm1 -- automatically disabled if deathmatch is not 1. When enabled, weapons respawn on a short timer (k_freshteams_weapon_time seconds) and the Fresh Teams sub-options become available: limited backpack ammo, limited weapon ammo on sweep, fast ammo, and timed weapon respawns.
  >
  > 0 = Fresh Teams off.
  > 1 = Fresh Teams on (scoreboard shows "FreshTeams on").
  >
  > Default: 0.
  > Set by: server config or admin command 'freshteams'.

---

B5-RESULT | ktx:cvar:k_freshteams_pack_cells | FORMAT-UNIFIED | rev=1 | from-shape: verbose gate-condition prose with file:line refs | to-shape: D20-template

### ktx:cvar:k_freshteams_pack_cells

- canonical_id: ktx:cvar:k_freshteams_pack_cells
- prior length: 440
- new length: 302

- OLD description:
  > Fresh Teams (dmm1) only: the maximum number of cells a dropped backpack may carry when backpack ammo limiting is active (k_freshteams set and k_freshteams_limit_packs enabled). The dropped pack's cell count is clamped to the range 0..this value; any cells the dead player carried beyond this ceiling are not transferred to the pack. Units are cells (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_packs are both set.

- NEW description:
  > Fresh Teams (dmm1) only: maximum cells a dropped backpack may contain when ammo limiting is active. Any cells the dead player carried beyond this ceiling are not transferred to the pack. Has no effect unless k_freshteams and k_freshteams_limit_packs are both enabled.
  >
  > Units: cells (ammo count).
  >
  > Default: 10.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_freshteams_pack_nails | FORMAT-UNIFIED | rev=1 | from-shape: verbose gate-condition prose with file:line refs | to-shape: D20-template

### ktx:cvar:k_freshteams_pack_nails

- canonical_id: ktx:cvar:k_freshteams_pack_nails
- prior length: 438
- new length: 302

- OLD description:
  > Fresh Teams (dmm1) only: the maximum number of nails a dropped backpack may carry when backpack ammo limiting is active (k_freshteams set and k_freshteams_limit_packs enabled). The dropped pack's nail count is clamped to the range 0..this value; any nails the dead player carried beyond this ceiling are not transferred to the pack. Units are nails (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_packs are both set.

- NEW description:
  > Fresh Teams (dmm1) only: maximum nails a dropped backpack may contain when ammo limiting is active. Any nails the dead player carried beyond this ceiling are not transferred to the pack. Has no effect unless k_freshteams and k_freshteams_limit_packs are both enabled.
  >
  > Units: nails (ammo count).
  >
  > Default: 30.
  > Set by: server config.

---

B5-RESULT | ktx:command:lockmap | FORMAT-UNIFIED | rev=1 | from-shape: verbose effect-site prose with file:line refs | to-shape: D20-template

### ktx:command:lockmap

- canonical_id: ktx:command:lockmap
- prior length: 560
- new length: 309

- OLD description:
  > Locks or unlocks the current map (toggle). While the map is locked, non-admin players cannot change it through map voting (they are told the map is locked), and the server will not automatically revert to the default map when it empties. Issuing the command when no match is in progress broadcasts "<name> locks map" / "<name> unlocks map"; during a match it privately confirms "Map is locked" / "Map unlocked" to the admin. Admin only.

- NEW description:
  > Admin command. Toggles map lock on/off. While locked: non-admin map votes are refused ("MAP IS LOCKED! You are NOT allowed to change!"); the server does not auto-revert to the default map when it empties.
  >
  > Broadcasts the new state when no match is running; confirms privately to the admin during a match.
  >
  > 0 = map unlocked.
  > 1 = map locked.
  >
  > Set by: admin command 'lockmap' (toggle).

---

B5-RESULT | ktx:command:exclusive | FORMAT-UNIFIED | rev=1 | from-shape: verbose gate/effect prose with file:line refs | to-shape: D20-template

### ktx:command:exclusive

- canonical_id: ktx:command:exclusive
- prior length: 466
- new length: 308

- OLD description:
  > Admin toggle for exclusive mode. Flips the k_exclusive server cvar between 0 (off) and 1 (on) and broadcasts the new state to all players. When exclusive mode is on, once the number of active players reaches k_attendees any further client trying to join the game is refused ("Sorry, server is full") and may only connect as a spectator; when off, players can keep joining normally. The command is ignored while a match is in progress.

- NEW description:
  > Admin command. Toggles exclusive mode (k_exclusive) and announces the new state to all players. Has no effect while a match is in progress.
  >
  > 0 = anyone may join (subject to maxclients).
  > 1 = new player joins are refused once the player count reaches k_attendees; latecomers may only connect as spectators.
  >
  > Set by: admin command 'exclusive' (toggle).

---

B5-RESULT | ktx:command:tossrune | FORMAT-UNIFIED | rev=1 | from-shape: verbose per-rune detail with file:line refs | to-shape: D20-template

### ktx:command:tossrune

- canonical_id: ktx:command:tossrune
- prior length: 548
- new length: 311

- OLD description:
  > Throws every CTF rune the caller is currently holding (resistance, strength, haste and/or regeneration). Each held rune is spawned as a pickable entity at the player's position with a forward-and-upward toss velocity and a brief delay before the thrower can re-pick it. Tossing the haste rune restores the player's normal max speed; tossing the regeneration rune starts a regen-loss timer. Does nothing if the caller holds no runes.

- NEW description:
  > CTF only. Throws all runes the caller is currently holding (resistance, strength, haste, regeneration). Each rune is tossed forward and upward and becomes pickable by others; there is a brief delay before the thrower can re-pick it. Does nothing if the caller holds no runes.
  >
  > Side effects: tossing haste restores normal max speed; tossing regeneration starts a regen-loss timer.
  >
  > Set by: any player ('tossrune').

---

B5-RESULT | ktx:command:rules | FORMAT-UNIFIED | rev=1 | from-shape: verbose per-mode enumeration with file:line refs | to-shape: D20-template

### ktx:command:rules

- canonical_id: ktx:command:rules
- prior length: 530
- new length: 310

- OLD description:
  > Prints the current server game mode to the calling player only (duel, CTF, FFA, team, or 'unknown mode'). In CTF mode it additionally lists the mode-specific commands and impulses (impulse 22 grappling hook, tossrune, tossflag, flagstatus); in team mode it notes the in-game scores/stats/efficiency info commands. If berserk mode (k_bzk) is set it appends a notice that all players gain Quad/Octa power when k_btime seconds remain.

- NEW description:
  > Prints the current server game mode to the caller only (duel, CTF, FFA, team, or "unknown mode"). In CTF mode also lists mode-specific commands/impulses (grappling hook, tossrune, tossflag, flagstatus). In team mode notes the scores/stats/efficiency info commands. If berserk mode is active, appends a notice about the Quad/Octa grant at the k_btime countdown threshold.
  >
  > Set by: any player ('rules').

---

B5-RESULT | ktx:command:spawn666time | FORMAT-UNIFIED | rev=1 | from-shape: verbose report/set distinction prose with file:line refs | to-shape: D20-template

### ktx:command:spawn666time

- canonical_id: ktx:command:spawn666time
- prior length: 510
- new length: 340

- OLD description:
  > Only available in deathmatch mode 4 (DMM4). With no argument it reports the current spawn-pentagram (post-respawn invincibility) duration in seconds; with a numeric argument it sets that duration in seconds (clamped to a non-negative maximum), broadcasting the change. Setting it to 0 effectively disables spawn invincibility. Outside DMM4 it refuses with a message; while a match is in progress it only reports the current value.

- NEW description:
  > DMM4 only. Reads or sets the spawn invincibility (pentagram) duration for post-respawn protection. Refused outside DMM4.
  >
  > No argument: reports the current spawn invincibility time in seconds.
  > With a numeric argument: sets the duration (seconds, non-negative), broadcasts the change to all players. Setting 0 disables spawn invincibility.
  >
  > During a match, only the report mode is available (cannot change the value).
  >
  > Set by: admin or player command 'spawn666time'.

---

B5-RESULT | ktx:command:+wp_stats | FORMAT-UNIFIED | rev=1 | from-shape: verbose per-weapon enumeration with file:line refs | to-shape: D20-template

### ktx:command:+wp_stats

- canonical_id: ktx:command:+wp_stats
- prior length: 538
- new length: 313

- OLD description:
  > Turns on the on-screen weapon-stats overlay for the caller -- a centerprint showing per-weapon hit/accuracy figures (axe direct hits; shotgun/super-shotgun/nailgun/super-nailgun/lightning accuracy percentages; grenade and rocket direct-hit counts, etc.). When spectating it shows the tracked player's stats and displays "Tracking no one (+wp_stats)" if no one is being tracked. Paired with -wp_stats, which turns the overlay off.

- NEW description:
  > Enables the on-screen weapon-stats overlay -- a centerprint showing per-weapon hit/accuracy figures (axe hits; SG/SSG/NG/SNG/LG accuracy percentages; GL/RL direct-hit counts). When spectating, shows the tracked player's stats; displays "Tracking no one (+wp_stats)" if no target is tracked. Paired with '-wp_stats' to turn the overlay off.
  >
  > Set by: any player ('+wp_stats' / '-wp_stats').

---

B5-RESULT | ktx:cvar:k_pow_min_players | FORMAT-UNIFIED | rev=1 | from-shape: verbose auto-toggle prose with file:line refs | to-shape: D20-template

### ktx:cvar:k_pow_min_players

- canonical_id: ktx:cvar:k_pow_min_players
- prior length: 467
- new length: 321

- OLD description:
  > In matchless deathmatch mode, the minimum number of connected players required for powerups to stay enabled. When fewer than this many players are present the server automatically turns powerups off, and turns them back on once the count is met again (re-evaluated every k_pow_check_time seconds). Bounded to 0-999; 0 disables this auto-toggle so the server keeps the configured k_pow value. Has no effect outside matchless mode.

- NEW description:
  > Matchless deathmatch only. Minimum number of connected players required for powerups to stay enabled. Below this threshold the server automatically disables powerups; once the count is met again powerups re-enable (re-checked every k_pow_check_time seconds). Has no effect outside matchless deathmatch mode.
  >
  > Range: 0-999. Value 0 disables the auto-toggle (powerups follow k_pow regardless of player count).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fallbunny | FORMAT-UNIFIED | rev=1 | from-shape: verbose effect-site prose with race/yawnmode note | to-shape: D20-template

### ktx:cvar:k_fallbunny

- canonical_id: ktx:cvar:k_fallbunny
- prior length: 468
- new length: 318

- OLD description:
  > Controls whether a hard landing from a long fall breaks the player's ankle. When 0, landing after a sufficiently long fall sets a 'broken ankle' state that suppresses voluntary jumping until the player next lands, disrupting bunnyhopping after big drops. When 1, no broken-ankle state is applied and standard QuakeWorld landing/jump behaviour is preserved. (Race mode and yawnmode always behave as 1 regardless of this setting.)

- NEW description:
  > Controls whether a hard landing from a long fall triggers a "broken ankle" state that prevents the player from jumping until they land again, disrupting bunnyhopping after big drops.
  >
  > 0 = broken ankle on hard fall (voluntary jump suppressed until next landing).
  > 1 = standard QuakeWorld landing behaviour (no broken-ankle penalty).
  >
  > Default: 0. Race mode and yawnmode always behave as 1 regardless of this setting.
  > Set by: server config.

---

B5-RESULT | ktx:command:fp_spec | FORMAT-UNIFIED | rev=1 | from-shape: verbose handler-shared-code note with file:line refs | to-shape: D20-template

### ktx:command:fp_spec

- canonical_id: ktx:command:fp_spec
- prior length: 476
- new length: 305

- OLD description:
  > Admin command. Advances the chat flood-protection level applied to spectators to the next preset in the configured list (cycling back to the first level after the last), updating the k_fp_spec setting and re-applying flood protection. Each preset defines how many messages are allowed, over what time window, and for how long a flooder is muted; the new level's name and limits are broadcast to everyone. Requires admin rights.

- NEW description:
  > Admin command. Cycles the chat flood-protection level for spectators to the next preset, updating k_fp_spec and broadcasting the new level's name and limits to all players. Each preset defines how many messages are allowed, over what time window, and how long a flooder is muted.
  >
  > Set by: admin command 'fp_spec' (cycles through the configured presets).
