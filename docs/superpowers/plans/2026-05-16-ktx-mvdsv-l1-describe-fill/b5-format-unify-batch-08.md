# B5 format-unify ledger -- batch 08

**Batch:** 08 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:4on4 | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line and code-trace jargon | to-shape: D20-template

### ktx:command:4on4

- canonical_id: `ktx:command:4on4`
- prior length: 1085
- new length: 395

- OLD description:
  > Applies the 4on4 game-mode preset: a standard 4-versus-4 team match. Caps the server at 8 players (maxclients/k_maxclients 8), sets teamplay 2 (teammates and self can be damaged), deathmatch 1 (base mode -- weapons do not stay on pickup), enables powerups, requires 3 players minimum per team and 1-2 teams, runs a 20-minute timelimit with time-based overtime (5 min), and sets the internal game mode to k_mode 2. Before this preset runs, the shared common reset (common_um_init) restores the standard ruleset cvars to defaults.

- NEW description:
  > Applies the 4on4 game-mode preset for a standard 4-versus-4 team deathmatch. Resets ruleset cvars to defaults first, then configures the server: 8-player cap, teamplay 2 (friendly fire on), deathmatch 1 (weapons do not stay), powerups enabled, 3 players minimum per team, 1-2 teams, 20-minute timelimit with 5-minute overtime.
  >
  > Set by: any player with usermode permissions (subject to k_allowed_free_modes).

---

B5-RESULT | ktx:command:autotrack | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:command:autotrack

- canonical_id: `ktx:command:autotrack`
- prior length: 1092
- new length: 338

- OLD description:
  > Spectator command that toggles KTeams-Pro-compatible automatic player tracking: with it on, the spectator's view automatically follows a 'next best' player (using a hint target when one is set, otherwise the current best player), and re-evaluates the target as play progresses. Issuing it again, or while it is already this mode, turns autotrack off. Affects only the issuing spectator; the selected mode is stored in the '*at' userinfo so it is restored after a level change. Spectator-only and allowed only outside a live match.

- NEW description:
  > Spectator command that toggles automatic player tracking. When on, the view follows a hint player if one is set, otherwise the current best player, and re-evaluates as play progresses. Issuing it again turns autotrack off. The mode persists through level changes. Spectator-only; not available during a live match.
  >
  > Set by: spectator command (in-game).

---

B5-RESULT | ktx:command:blitz2v2 | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:blitz2v2

- canonical_id: `ktx:command:blitz2v2`
- prior length: 1135
- new length: 367

- OLD description:
  > Applies the Blitz 2v2 game-mode preset: a 2-versus-2 team match run as short hoonymode-style rounds. Sets it to 4 players (maxclients/k_maxclients 4), enables hoonymode (k_hoonymode 1) with 4 rounds (k_hoonyrounds 4, two sets of spawns), uses a 3-minute round timelimit with fraglimit 0 (time-based rounds), teamplay 2 (teammates and self can be damaged), deathmatch 3 (base mode -- weapons stay), enables powerups, requires 1 player minimum per team and 1-2 teams, and sets the internal game mode to k_mode 2. The shared common reset runs first.

- NEW description:
  > Applies the Blitz 2v2 game-mode preset: a 2-versus-2 team match played as short hoonymode rounds. Resets ruleset cvars first, then configures: 4-player cap, hoonymode enabled with 4 rounds, 3-minute round timelimit, fraglimit 0 (time-based rounds), teamplay 2 (friendly fire on), deathmatch 3 (weapons stay), powerups enabled, 1 player minimum per team.
  >
  > Set by: any player with usermode permissions (subject to k_allowed_free_modes).

---

B5-RESULT | ktx:command:break | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:command:break

- canonical_id: `ktx:command:break`
- prior length: 1154
- new length: 398

- OLD description:
  > Player command to vote for stopping play. During a pre-match countdown it stops the countdown; during a running match it casts a vote to stop the match (in matchless mode it instead votes for the next map), and issuing it again withdraws that vote. A broadcast announces the vote and, where applicable, how many votes are still required. A not-yet-ready spectator in auto-xonx mode uses it to retract their ready state. In race (non-match) mode it instead signals a race status change. Has no effect during intermission or after the match is over.

- NEW description:
  > Vote to stop the current match or countdown. During a pre-match countdown, stops the timer immediately. During a live match, casts a vote to end the match; issuing it again withdraws the vote. In matchless mode, votes for the next map instead. A not-yet-ready spectator in auto-xonx mode uses it to retract their ready state. No effect during intermission or after match end.
  >
  > Set by: any player or eligible spectator.

---

B5-RESULT | ktx:command:easyskillmode:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:command:easyskillmode:frogbot:std

- canonical_id: `ktx:command:easyskillmode:frogbot:std`
- prior length: 1439
- new length: 331

- OLD description:
  > Frogbot subcommand ("frogbot easyskillmode") that toggles the bot easy-skill-mode flag (cvar k_fb_easy_skill_mode, default on) between on and off and prints the new state. The flag selects which skill-attribute curve the frogbots use when their skill is (re)applied: when on, bots are configured via the easy skill-attribute mapping and the server announces "Using easy bot skill mode"; when off, the default (harder) skill-attribute mapping is used and it announces "Using default bot skill mode". Refused if bots are disabled by the server.

- NEW description:
  > Frogbot subcommand (`frogbot easyskillmode`) that toggles easy skill mode for bots. When on, bots use the easy skill-attribute curve and the server announces "Using easy bot skill mode"; when off, bots use the default (harder) curve. Refused if bots are disabled by the server.
  >
  > Default: on (k_fb_easy_skill_mode = 1).
  > Set by: admin command.

---

B5-RESULT | ktx:command:klist | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:command:klist

- canonical_id: `ktx:command:klist`
- prior length: 1258
- new length: 369

- OLD description:
  > Prints a detailed client list to the requesting client, grouped into sections: players (user id, admin marker, VIP level, handicap, team, name), spectators (user id, admin marker, VIP level, coach marker, name, and who they are tracking), ghosts (frags, team, name), and unconnected/connecting clients (user id, VIP level, connection state, name); each section ends with a count of how many were found. While a match is in progress an ordinary player cannot use it unless k_allowklist is set, in which case it reports "klist is disabled".

- NEW description:
  > Prints a detailed client list to the caller, grouped into four sections: players (id, admin marker, VIP, handicap, team, name), spectators (id, admin marker, VIP, coach marker, name, tracking target), ghosts (frags, team, name), and connecting clients (id, VIP, state, name). Each section ends with a "-- N found --" count.
  >
  > During a live match, ordinary players are blocked unless k_allowklist is set.
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:mctf | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace detail | to-shape: D20-template

### ktx:command:mctf

- canonical_id: `ktx:command:mctf`
- prior length: 888
- new length: 371

- OLD description:
  > In CTF mode, permanently disables both the grappling hook and runes for the current game by clearing the k_ctf_hook and k_ctf_runes cvars, and broadcasts '<name> turn off: hook & runes'. It is one-way (disable only, not a toggle) and reports 'Already done' if both are already off. Refuses outside CTF mode ('Can't do this in non CTF mode') and refuses while a match is in progress unless the server is in matchless mode; in matchless mode it also immediately strips runes from any carrier (resetting their speed) and removes active hooks.

- NEW description:
  > CTF-only command that permanently disables the grappling hook and runes for the current game. One-way -- cannot be toggled back. Reports "Already done" if both are already off. Refused outside CTF mode or during a live non-matchless match. In matchless mode, immediately strips runes from all carriers and removes active hooks.
  >
  > Set by: admin command (in CTF mode).

---

B5-RESULT | ktx:command:suggestcolor | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:command:suggestcolor

- canonical_id: `ktx:command:suggestcolor`
- prior length: 1216
- new length: 359

- OLD description:
  > Starts an election proposing that one or more named players adopt a specified shirt/pants color. Usage: suggestcolor <top color> <bottom color> <name or user id>... ; the top and bottom color numbers are clamped to 0-16. Requires at least 3 players and no other election already running, and is subject to the caller's election cooldown. Spectators cannot use it while a match is in progress, and a player cannot target themselves. If the initiator runs the command again while their own color election is active, the election is aborted.

- NEW description:
  > Starts an election proposing that one or more players change their shirt/pants color. Usage: `suggestcolor <top> <bottom> <name or id>...`. Color values are clamped to 0-16. Requires 3 or more players, no other election running, and the caller must be off cooldown. Players cannot target themselves; spectators cannot initiate during a live match. Running it again while your own election is active aborts it.
  >
  > Set by: any in-game player (or admin spectator outside live match).

---

B5-RESULT | ktx:command:upplayers | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:command:upplayers

- canonical_id: `ktx:command:upplayers`
- prior length: 766
- new length: 302

- OLD description:
  > Raises the server's maxclients (player-slot count) by one, up to the configured cap k_maxclients. Refused while a match is in progress, when the caller lacks the k_allowcountchange permission, or when maxclients has already reached k_maxclients (prints "maxclients reached"); when applied it broadcasts that the caller set maxclients to the new value. No effect if the new value would equal the current one. Runnable by any in-game player or by spectators who hold admin status (granted by rcon or via election); takes no arguments.

- NEW description:
  > Raises the server's player-slot count (maxclients) by one, up to k_maxclients. Broadcasts the new value when applied. Refused during a live match, when k_allowcountchange is not set, or when maxclients already equals k_maxclients ("maxclients reached").
  >
  > Set by: any in-game player, or an admin spectator (rcon or elected).

---

B5-RESULT | ktx:command:upspecs | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:command:upspecs

- canonical_id: `ktx:command:upspecs`
- prior length: 767
- new length: 305

- OLD description:
  > Raises the server's maxspectators (spectator-slot count) by one, up to the server's configured cap k_maxspectators. Refused while a match is in progress, when the caller lacks the k_allowcountchange permission, or when maxspectators has already reached k_maxspectators (prints "maxspectators reached"); when applied it broadcasts that the caller set maxspectators to the new value. No effect if the new value would equal the current one. Issued by any in-game player or by an admin spectator (admin via rcon or /elect); no arguments.

- NEW description:
  > Raises the server's spectator-slot count (maxspectators) by one, up to k_maxspectators. Broadcasts the new value when applied. Refused during a live match, when k_allowcountchange is not set, or when maxspectators already equals k_maxspectators ("maxspectators reached").
  >
  > Set by: any in-game player, or an admin spectator (rcon or elected).

---

B5-RESULT | ktx:command:whovote | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:command:whovote

- canonical_id: `ktx:command:whovote`
- prior length: 1286
- new length: 356

- OLD description:
  > Prints the status of all currently active votes and elections to the caller. For each open vote category -- map vote, captain/admin/other election, pickup, rpickup, break, antilag, no-spectators, teamoverlay, private/public game, swapall, and hook-style (smooth/fast/classic) -- it shows the current count, the votes required, and the names of the players who voted for it. Prints "No election going on" when nothing is being voted on. Which categories are shown depends on match state (e.g. captain election is hidden during a running match).

- NEW description:
  > Prints the status of all currently active votes and elections to the caller. Shows each open category (map vote, captain/admin election, pickup, break, antilag, no-specs, teamoverlay, private game, swapall, hook-style) with the current count, votes required, and who voted. Prints "No election going on" when nothing is active. Some categories are hidden depending on match state.
  >
  > Set by: any player or spectator.

---

B5-RESULT | ktx:cvar:allow_timing | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:allow_timing

- canonical_id: `ktx:cvar:allow_timing`
- prior length: 1049
- new length: 367

- OLD description:
  > Master on/off switch for KTX's lagged-player ("timing out") handling. When 0, no timing-out detection or mitigation occurs. When 1, players whose last activity is older than timing_players_time seconds are flagged as timing out and the responses selected by the timing_players_action bitmask are applied: a broadcast "WARNING: <player> is timing out!" message, a glow (dimlight) effect on the lagged player, and/or making the lagged player temporarily invincible and frozen (no damage, no collision, zero velocity). 0 = off, 1 = on.

- NEW description:
  > Master toggle for KTX's lagged-player detection. When enabled, players who have not been active for timing_players_time seconds are flagged as timing out and the server applies the responses configured by timing_players_action: a "WARNING: <player> is timing out!" broadcast, a glow effect on the lagged player, and/or making them temporarily invincible and frozen.
  >
  > 0 = timing-out detection disabled.
  > 1 = timing-out detection enabled.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_allowed_free_modes | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs and code-trace detail | to-shape: D20-template

### ktx:cvar:k_allowed_free_modes

- canonical_id: `ktx:cvar:k_allowed_free_modes`
- prior length: 1414
- new length: 493

- OLD description:
  > Bitmask, evaluated once at map load, of which server game modes players are permitted to switch the server into via the usermode command; a usermode request whose bit is not set is discarded. Bits: 1 = 1on1, 2 = 2on2, 4 = 3on3, 8 = 4on4, 16 = 10on10, 32 = ffa, 64 = ctf, 128 = 1on1 hoonymode, 256 = 2on2on2, 512 = 3on3on3, 1024 = 4on4on4, 2048 = XonX. Add the bits for the modes to allow (for example 4095 enables all of the above); FFA is additionally force-enabled when the server is matchless (no deathmatch / coop / singleplayer).

- NEW description:
  > Bitmask controlling which game modes players may switch the server into via the usermode command. Evaluated once at map load; requests for modes whose bit is not set are silently discarded.
  >
  > 1 = 1on1, 2 = 2on2, 4 = 3on3, 8 = 4on4, 16 = 10on10, 32 = ffa, 64 = ctf, 128 = 1on1 hoonymode, 256 = 2on2on2, 512 = 3on3on3, 1024 = 4on4on4, 2048 = XonX.
  >
  > Add bits together for multiple modes (e.g. 4095 = all above). FFA is force-enabled on matchless servers regardless of this setting.
  >
  > Default: 0.
  > Set by: server config (takes effect at next map load).

---

B5-RESULT | ktx:cvar:k_fbskill_aim_attack_respawns | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:k_fbskill_aim_attack_respawns

- canonical_id: `ktx:cvar:k_fbskill_aim_attack_respawns`
- prior length: 1080
- new length: 330

- OLD description:
  > Frogbot AI tuning cvar enabling spawn-fragging behaviour. Read back per bot as a boolean (cvar(...) > 0) into self->fb.skill.attack_respawns; when nonzero, during a duel (not race/RA/hoony) where the enemy has just died within the attack-respawn window and the bot holds a rocket launcher with sufficient ammo, the bot fires at the enemy's spawn point to catch it on respawn. When zero the bot never spawn-frags. The server normally derives the value from the bot's skill level (enabled at high skill); setting the cvar overrides that.

- NEW description:
  > Frogbot AI skill tuning: enables spawn-fragging behaviour. When nonzero, a bot with a rocket launcher will fire at the enemy's spawn point immediately after killing them in a duel (not active in race, clan arena, or hoonymode). At zero, bots never spawn-frag.
  >
  > 0 = spawn-fragging disabled.
  > 1 = spawn-fragging enabled.
  >
  > Default: derived from bot skill level (enabled at high skill).
  > Set by: server config (overrides the skill-level default).

---

B5-RESULT | ktx:cvar:k_fbskill_missiledodge | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:k_fbskill_missiledodge

- canonical_id: `ktx:cvar:k_fbskill_missiledodge`
- prior length: 845
- new length: 323

- OLD description:
  > Frogbot AI tuning cvar. Sets, in seconds, the reaction window the bot waits before dodging an incoming missile: while on the ground with a tracked incoming missile, the bot only begins its dodge once the elapsed time since that missile was spawned is at least this value, so a larger value means the bot reacts later (slower) to incoming rockets and a smaller value means it dodges sooner. Read into self->fb.skill.missile_dodge_time clamped with bound(0, value, 1.5) (seconds). Consumed by the on-ground dodge logic in bot_botthink.c.

- NEW description:
  > Frogbot AI skill tuning: sets the reaction delay (in seconds) before a bot begins dodging an incoming missile while on the ground. Higher values make the bot react later to rockets; lower values make it dodge sooner.
  >
  > Range: 0.0 to 1.5 (seconds, clamped).
  >
  > Default: derived from bot skill level (via RangeOverSkill).
  > Set by: server config (overrides the skill-level default).

---

B5-RESULT | ktx:cvar:k_fbskill_reactionmovetime | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:k_fbskill_reactionmovetime

- canonical_id: `ktx:cvar:k_fbskill_reactionmovetime`
- prior length: 906
- new length: 340

- OLD description:
  > Frogbot AI tuning cvar. Sets, in seconds, the post-spawn delay before the bot starts moving: on a spawn/enter event the bot's earliest-allowed move time is set to current time plus this value, so the bot stands still for this long after spawning before it begins navigating. Read into self->fb.skill.spawn_move_delay clamped with bound(0, value, 1.0). Consumed in BotClientEntersEvent() in bot_client.c (self->fb.min_move_time). This is the movement-onset delay; the separate k_fbskill_reactiontime governs the fire-onset/awareness delay.

- NEW description:
  > Frogbot AI skill tuning: sets the delay (in seconds) after spawning before the bot starts moving. The bot stands still for this long after entering the game before it begins navigating. See also k_fbskill_reactiontime, which governs the fire-onset delay separately.
  >
  > Range: 0.0 to 1.0 (seconds, clamped).
  >
  > Default: derived from bot skill level (via RangeOverSkill).
  > Set by: server config (overrides the skill-level default).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_max | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_max

- canonical_id: `ktx:cvar:k_fbskill_vol_max`
- prior length: 796
- new length: 317

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. The bot's aim error is scaled by a running per-target 'volatility' scalar; this cvar sets the upper clamp applied to that scalar each frame in the continuing-target path (volatility = bound(min_volatility, ..., max_volatility)), capping how large accumulated volatility (and hence aim error) can grow. The bot reads it clamped to bound(0, value, 5.0) into self->fb.skill.max_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI skill tuning: sets the ceiling for the bot's running aim-volatility scalar. Higher values allow greater accumulated aim error; lower values keep the bot's aim tighter even under pressure.
  >
  > Range: 0.0 to 5.0 (clamped).
  >
  > Default: derived from bot skill level (via RangeOverSkill, range 2.5-4.0).
  > Set by: server config (overrides the skill-level default).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_opp_midair_incr | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_opp_midair_incr

- canonical_id: `ktx:cvar:k_fbskill_vol_opp_midair_incr`
- prior length: 880
- new length: 325

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is the volatility INCREMENT added to the running aim-volatility scalar while the bot's OPPONENT is airborne (volatility += opponent_midair_volatility), applied when the opponent entity's flags do not include FL_ONGROUND_PARTIALGROUND. It models the bot aiming worse at a target that is in the air. The bot reads it clamped to bound(0, value, 2.0) into self->fb.skill.opponent_midair_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI skill tuning: the aim-volatility increment added while the bot's opponent is airborne. Higher values make the bot aim worse at a target that is in the air; lower values reduce this penalty.
  >
  > Range: 0.0 to 2.0 (clamped).
  >
  > Default: derived from bot skill level (via RangeOverSkill, range 0.0-1.0).
  > Set by: server config (overrides the skill-level default).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_pain_incr | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace jargon and file:line refs | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_pain_incr

- canonical_id: `ktx:cvar:k_fbskill_vol_pain_incr`
- prior length: 870
- new length: 329

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is the volatility INCREMENT added to the running aim-volatility scalar when the bot has recently taken damage (volatility += pain_volatility), applied while the bot was hurt within the last 1.0 second and only when LGC mode is not enabled. It models the bot becoming less accurate after being hit. The bot reads it clamped to bound(0, value, 2.0) into self->fb.skill.pain_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI skill tuning: the aim-volatility increment added when the bot has taken damage in the last second (not active in LGC mode). Higher values make the bot aim worse after being hit; lower values reduce this penalty.
  >
  > Range: 0.0 to 2.0 (clamped).
  >
  > Default: derived from bot skill level (via RangeOverSkill, range 0.1-0.5).
  > Set by: server config (overrides the skill-level default).

---

B5-RESULT | ktx:cvar:k_hoonymode_prevspawns | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace detail and internal-state disclaimer | to-shape: D20-template

### ktx:cvar:k_hoonymode_prevspawns

- canonical_id: `ktx:cvar:k_hoonymode_prevspawns`
- prior length: 1176
- new length: 379

- OLD description:
  > Internal HoonyMode state, not meant to be set by hand: stores the saved per-spawn team nominations for the last team HoonyMode map as a digit string, one character per info_player_deathmatch spawn in map order (0 = unnominated, 1 = red, 2 = blue). When a new team HoonyMode game starts on the same map (matched via k_hoonymode_prevmap) and the string length still equals the spawn count, these nominations are reapplied to the spawns; on map change or a spawn-count mismatch it is reset to empty. Written automatically by the engine; default empty.

- NEW description:
  > Internal state cvar -- do not set by hand. Stores the saved spawn-team nominations from the last team HoonyMode game as a digit string (one character per spawn, in map order: 0 = unnominated, 1 = red, 2 = blue). When the same map starts again in team HoonyMode, these nominations are reapplied; on map change or spawn-count mismatch the string is cleared.
  >
  > Default: empty string.
  > Set by: written automatically by the server (HoonyMode engine).

---
