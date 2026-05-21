# B5 format-unify ledger -- batch 09

**Batch:** 09 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:banrem | FORMAT-UNIFIED | rev=1 | from-shape: prose with CF_REDIRECT jargon + mvdsv-boundary hedge | to-shape: D20-template

### ktx:command:banrem

- canonical_id: `ktx:command:banrem`
- prior length: 502
- new length: 245

- OLD description:
  > Admin command for removing an existing ban and/or listing current bans. In KTX-mod code this is a redirect stub: the mod re-sends it as 'cmd banrem <params>' back to the issuer and deliberately reports it as not-found within the mod (CF_REDIRECT handling), so the actual ban-removal / ban-list behaviour is performed by the underlying server (mvdsv) ban handler, not by KTX. The exact ban-removal and ban-list semantics are implemented in the server engine and are NOT legible from the KTX source tree.

- NEW description:
  > Removes a ban or lists current bans. KTX passes this command through to the underlying server (MVDSV); the actual ban-removal and ban-list behaviour is handled by the server, not by KTX itself.
  >
  > Set by: admin command 'banrem'.

---

B5-RESULT | ktx:command:berzerk | FORMAT-UNIFIED | rev=1 | from-shape: prose with CF_PLAYER/CF_SPC_ADMIN/CF_SPECTATOR jargon + code-trace | to-shape: D20-template

### ktx:command:berzerk

- canonical_id: `ktx:command:berzerk`
- prior length: 517
- new length: 323

- OLD description:
  > Toggles Berzerk mode on the server by flipping the k_bzk cvar, and broadcasts "<netname> enables Berzerk mode" or "<netname> disables Berzerk mode" to all players on each toggle. The command is ignored while a match is in progress (it only takes effect in the pre-match / matchless state). It is a player command (CF_PLAYER) that also accepts admin spectators via CF_SPC_ADMIN (after Init_cmds promotion to CF_SPECTATOR), so non-admin spectators are refused with "You are not an admin"; admin spectators may issue it.

- NEW description:
  > Toggles Berzerk mode on or off. Broadcasts "<netname> enables Berzerk mode" or "<netname> disables Berzerk mode" to all players. Has no effect while a match is in progress.
  >
  > Available to: any in-game player and admin spectators. Non-admin spectators are refused with "You are not an admin".
  >
  > Set by: 'berzerk' command (players and admin spectators).

---

B5-RESULT | ktx:command:dumpent | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace (cheat serverinfo path, dropitem flag) | to-shape: D20-template

### ktx:command:dumpent

- canonical_id: `ktx:command:dumpent`
- prior length: 497
- new length: 363

- OLD description:
  > Cheat-only command that exports a map .ent file. Requires the *cheats serverinfo to be set and is refused while a match is in progress. It writes a file named dump.ent containing one entity block (classname, origin, and angle/angles and spawnflags when set) for every entity that was placed during this session with the dropitem command, then reports "Dumped N entities". It is the export half of the dropitem/dumpent map-editing pair; entities that were not spawned via dropitem are not included.

- NEW description:
  > Exports entities placed with 'dropitem' to a file named dump.ent on the server. Each entity block records classname, origin, and (when set) angle/angles and spawnflags. Reports "Dumped N entities" on completion. Only entities spawned via 'dropitem' in the current session are included -- pre-existing map entities are not.
  >
  > Requires cheats to be enabled on the server. Refused while a match is in progress.
  >
  > Set by: admin command 'dumpent' (cheats required).

---

B5-RESULT | ktx:command:kick | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace (argc, YesKick/DontKick refs) + admin jargon | to-shape: D20-template

### ktx:command:kick

- canonical_id: `ktx:command:kick`
- prior length: 515
- new length: 358

- OLD description:
  > Admin-only client kick. With an id/name argument, kicks that connected or named client immediately and, if a trailing reason is given, broadcasts it. With no argument, starts an interactive kick session that walks through clients (then 'y' kicks the highlighted client, 'n' advances to the next, 'kick' again leaves the session). Calling it again while a kick session is already running for the caller exits that session. Non-admins are told "You are not an admin". Available to players and spectators (admin only).

- NEW description:
  > Admin command to kick a connected player. Two modes:
  >
  > 'kick <id/name> [reason]' -- kicks the named player immediately; if a reason is given it is broadcast to all players.
  > 'kick' (no argument) -- starts an interactive kick session; type 'y' to kick the highlighted player, 'n' to advance to the next, or 'kick' again to exit the session.
  >
  > Non-admins are told "You are not an admin".
  >
  > Set by: admin command 'kick'.

---

B5-RESULT | ktx:command:qlag | FORMAT-UNIFIED | rev=1 | from-shape: prose with fpd/bitmask jargon + code-trace | to-shape: D20-template

### ktx:command:qlag

- canonical_id: `ktx:command:qlag`
- prior length: 501
- new length: 329

- OLD description:
  > Toggles bit 8 (value 8) of the server's `fpd` serverinfo key and rebroadcasts the new value via `serverinfo fpd`. The `fpd` key is a server-wide bitmask read by the QiZmo proxy; setting bit 8 signals QiZmo to disable its lag-related settings (the restriction is enforced by QiZmo on the client side, not by KTX -- KTX only writes the bit and announces the change). The result is announced to all players as `QiZmo lag settings in effect` or `not in effect`. Has no effect while a match is in progress.

- NEW description:
  > Toggles the QiZmo lag-settings flag on or off. When enabled, KTX signals the QiZmo proxy to disable its lag-related adjustments; the restriction is applied by QiZmo on the client side. Announces "QiZmo lag settings in effect" or "not in effect" to all players on each toggle. Has no effect while a match is in progress.
  >
  > Set by: admin command 'qlag'.

---

B5-RESULT | ktx:command:race_set_finish | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace (nodeEnd enum, MAX_ROUTE_NODES, race_route_now_custom) | to-shape: D20-template

### ktx:command:race_set_finish

- canonical_id: `ktx:command:race_set_finish`
- prior length: 515
- new length: 367

- OLD description:
  > Race-mode route editing command. Active only when race mode is on; usable by any in-game player or admin spectator (admin = rcon-set or elected via /elect). Places the race finish checkpoint at the caller's current position on the custom race route. Has no effect if the race is already running, or if the route already holds the maximum 20 nodes (start, intermediate checkpoints, and finish counted together). On success it broadcasts the finish-node coordinates and flags the route as a custom (non-preset) route.

- NEW description:
  > Places the race finish checkpoint at the caller's current position on the custom race route. Broadcasts the finish coordinates and marks the route as custom (overriding any preset route). No effect if the race is already running or if the route is already at the maximum of 20 nodes (start, checkpoints, and finish combined).
  >
  > Requires race mode to be active (k_race). Available to any in-game player and admin spectators (rcon-set or elected admin).
  >
  > Set by: 'race_set_finish' command (players and admin spectators, race mode only).

---

B5-RESULT | ktx:command:scores | FORMAT-UNIFIED | rev=1 | from-shape: prose with match-state enumeration but no structural template | to-shape: D20-template

### ktx:command:scores

- canonical_id: `ktx:command:scores`
- prior length: 525
- new length: 378

- OLD description:
  > Prints the current match status as console text to the player who issued it. Output depends on match state: "Intermission", "no game - no scores", or "Countdown" when not in active play; during play it prints sudden-death/overtime status if active, otherwise frags remaining until the fraglimit, then the time remaining (mm:ss), and the team or player scores (team names and totals, supporting 2- and 3-team usermodes; clan-arena mode prints the CA-specific scoreboard). Takes no arguments; affects only the caller's console.

- NEW description:
  > Prints the current match status to your console. Output varies by match state:
  >
  > Outside a live match: "Intermission", "no game - no scores", or "Countdown".
  > During play: sudden-death/overtime status (if active), frags remaining until fraglimit, time remaining (mm:ss), and per-team or per-player scores. Clan Arena shows the CA-specific scoreboard.
  >
  > Affects only your console. No arguments.
  >
  > Set by: 'scores' command (any player).

---

B5-RESULT | ktx:command:status2 | FORMAT-UNIFIED | rev=1 | from-shape: prose listing all output fields clearly but no structural template | to-shape: D20-template

### ktx:command:status2

- canonical_id: `ktx:command:status2`
- prior length: 500
- new length: 430

- OLD description:
  > Prints the second page of current server settings to the requesting player: the respawn model name, the server game mode (duel / FFA / CTF / team / unknown), and -- in CTF or team modes -- the server-locking mode (off / team / all). In CTF it additionally shows hook, runes and grappling-allowed states. Outside a match it shows team-count info (current / min / max teams). It always shows spectalk on/off and the configured overtime setting (off / N-minute / sudden death / tie-break / golden frag).

- NEW description:
  > Prints a second page of server settings to your console. Always shows: respawn model, game mode (duel / FFA / CTF / team), spectalk on/off, and the overtime setting (off / N-minute / sudden death / tie-break / golden frag).
  >
  > In CTF or team modes: also shows the server-locking mode (off / team / all). In CTF: additionally shows hook, runes, and grappling-hook allowed states.
  >
  > Outside a match: also shows current team-count info (current / min / max teams).
  >
  > Set by: 'status2' command (any player or spectator).

---

B5-RESULT | ktx:command:trx_rec | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace (mv_can_record, MAX_PLRFRMS, colormap) | to-shape: D20-template

### ktx:command:trx_rec

- canonical_id: `ktx:command:trx_rec`
- prior length: 498
- new length: 349

- OLD description:
  > Starts recording the calling player's own movement (position, view angles, animation frame, effects, colormap) into an in-memory trick-demo buffer, sampled each frame up to a fixed frame cap. Any active recording or playback for that player is stopped first. Refused (prints "can't record now") while a match is in progress, during intermission, while that player is replaying a buffer, or once the per-player frame buffer is full; otherwise prints "recording". Player-issued command, no arguments.

- NEW description:
  > Starts recording your movement into an in-memory trick-demo buffer for later replay. Stops any active recording or playback first, then prints "recording". Prints "can't record now" if the buffer is full or if recording is blocked (live match, intermission, or currently replaying a buffer). The buffer holds a fixed number of frames.
  >
  > No arguments.
  >
  > Set by: 'trx_rec' command (any player).

---

B5-RESULT | ktx:cvar:k_ann | FORMAT-UNIFIED | rev=1 | from-shape: prose with match_in_progress==2 code-ref + find_spc/find_client jargon | to-shape: D20-template

### ktx:cvar:k_ann

- canonical_id: `ktx:cvar:k_ann`
- prior length: 500
- new length: 328

- OLD description:
  > Controls whether spectator join/leave messages reach players during a live match. 0 = no, 1 = yes (default 0). When a spectator enters or leaves the game while a match is in progress, the "Spectator <name> entered/left the game" message is always sent to other spectators; when k_ann is 1 it is additionally sent to the active players, and when k_ann is 0 it is withheld from players (so they are not disturbed mid-match). Outside a live match the message goes to everyone regardless of this setting.

- NEW description:
  > Controls whether "Spectator <name> entered/left the game" messages are shown to players during a live match. Spectators always receive these messages regardless of this setting; it only governs whether players also see them.
  >
  > 0 = spectator join/leave messages are hidden from players during a live match.
  > 1 = spectator join/leave messages are shown to players during a live match.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_dmm4wiggle | FORMAT-UNIFIED | rev=1 | from-shape: prose with bound()/self->fb.skill.*/ApplyPhysics() code-trace | to-shape: D20-template

### ktx:cvar:k_fbskill_dmm4wiggle

- canonical_id: `ktx:cvar:k_fbskill_dmm4wiggle`
- prior length: 512
- new length: 324

- OLD description:
  > Frogbot AI tuning cvar. Boolean enable for the bot's dmm4 strafe-wiggle movement: read into self->fb.skill.wiggle_run_dmm4 via bound(0, (int)cvar, 1.0). In deathmatch 4 duel, the bot's wiggle physics step early-returns when this is false (no wiggle run), so a non-zero value enables the dmm4 strafe-wiggle behaviour and 0 disables it. Consumed by ApplyPhysics() in bot_movement.c. This is the on/off enable; the separate k_fbskill_dmm4wiggletoggle controls the probability of flipping wiggle direction on damage.

- NEW description:
  > Frogbot AI: enables or disables the bot's strafe-wiggle movement in deathmatch 4 duel. The on/off toggle for dmm4 wiggle; the probability of reversing wiggle direction on damage is controlled separately by k_fbskill_dmm4wiggletoggle.
  >
  > 0 = dmm4 strafe-wiggle disabled (bot moves straight).
  > 1 = dmm4 strafe-wiggle enabled.
  >
  > Default: set automatically by bot skill level (skill > 10 enables it).
  > Set by: server config or bot skill system.

---

B5-RESULT | ktx:cvar:k_fbskill_movement_dodgefactor | FORMAT-UNIFIED | rev=1 | from-shape: prose with right-vector/lateral-offset code-trace | to-shape: D20-template

### ktx:cvar:k_fbskill_movement_dodgefactor

- canonical_id: `ktx:cvar:k_fbskill_movement_dodgefactor`
- prior length: 516
- new length: 285

- OLD description:
  > Frogbot AI movement tuning: the strength of the bot's random sideways strafe-dodge while moving. In the bot's dodge step the lateral offset added to its movement direction along its right-vector is (uniform random) * value * dodge_factor, so this value scales the magnitude of the side-to-side jink. Higher (toward 1) = larger, more pronounced strafe-dodging; 0 = no added sideways displacement (the bot moves straight). Clamped to 0..1 per bot. Normally set automatically from the configured bot skill, not by hand.

- NEW description:
  > Frogbot AI: scales the magnitude of the bot's random sideways strafe-dodge while moving.
  >
  > Range: 0.0 to 1.0. 0 = no sideways dodge (bot moves straight); 1.0 = maximum strafe-dodge displacement.
  >
  > Default: set automatically by bot skill level.
  > Set by: server config or bot skill system.

---

B5-RESULT | ktx:cvar:k_fbskill_vol_bot_midair_incr | FORMAT-UNIFIED | rev=1 | from-shape: prose with FL_ONGROUND_PARTIALGROUND/self->fb.skill.self_midair_volatility code-trace | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_bot_midair_incr

- canonical_id: `ktx:cvar:k_fbskill_vol_bot_midair_incr`
- prior length: 519
- new length: 320

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is the volatility INCREMENT added to the running aim-volatility scalar while the BOT ITSELF is airborne (volatility += self_midair_volatility), applied when the bot's entity flags do not include FL_ONGROUND_PARTIALGROUND. It models the bot aiming worse while in the air. The bot reads it clamped to bound(0, value, 2.0) into self->fb.skill.self_midair_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI: the aim-volatility increment added while the bot itself is airborne. Higher values make the bot aim less accurately when jumping. Distinct from k_fbskill_vol_opp_midair_incr, which applies when the bot's target is airborne.
  >
  > Range: 0.0 to 2.0 (clamped).
  >
  > Default: set automatically by bot skill level (decreases from 1.0 at low skill to 0.0 at high skill).
  > Set by: server config or bot skill system.

---

B5-RESULT | ktx:cvar:k_fbskill_vol_min | FORMAT-UNIFIED | rev=1 | from-shape: prose with bound()/CalculateVolatility/self->fb.skill.min_volatility code-trace | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_min

- canonical_id: `ktx:cvar:k_fbskill_vol_min`
- prior length: 501
- new length: 301

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. The bot's aim error is scaled by a running per-target 'volatility' scalar; this cvar sets the lower clamp applied to that scalar each frame in the continuing-target path (volatility = bound(min_volatility, ..., max_volatility)), so volatility can never decay below this floor. The bot reads it clamped to bound(0, value, 5.0) into self->fb.skill.min_volatility. Server-managed: setSkillAttributes() and setSkillAttributesEasySkillMode() both hard-set it to 1.0f.

- NEW description:
  > Frogbot AI: the minimum floor for the bot's per-target aim-volatility scalar. The bot's aim error cannot decay below this value, regardless of how long it has been tracking the same target.
  >
  > Range: 0.0 to 5.0 (clamped).
  >
  > Default: 1.0 (hard-set by the skill system at all skill levels).
  > Set by: server config or bot skill system.

---

B5-RESULT | ktx:cvar:k_freshteams_pack_rockets | FORMAT-UNIFIED | rev=1 | from-shape: prose with bound()/DropBackpack code-trace + gate conditions | to-shape: D20-template

### ktx:cvar:k_freshteams_pack_rockets

- canonical_id: `ktx:cvar:k_freshteams_pack_rockets`
- prior length: 499
- new length: 320

- OLD description:
  > Fresh Teams (dmm1) only: the maximum number of rockets a dropped backpack may carry when backpack ammo limiting is active (k_freshteams set and k_freshteams_limit_packs enabled). The dropped pack's rocket count is clamped to the range 0..this value; any rockets the dead player carried beyond this ceiling are not transferred to the pack. Units are rockets (ammo count, shared by the rocket launcher and grenade launcher). Has no effect unless k_freshteams and k_freshteams_limit_packs are both set.

- NEW description:
  > Fresh Teams (dmm1): maximum number of rockets a dropped backpack may contain when backpack ammo limiting is active. Excess rockets (above this ceiling) are not transferred to the pack on death. Rocket ammo is shared between the rocket launcher and grenade launcher.
  >
  > Range: 0 or more (integer, uncapped).
  >
  > Default: 5.
  > Set by: server config. Has no effect unless both k_freshteams and k_freshteams_limit_packs are set.

---

B5-RESULT | ktx:cvar:k_freshteams_sweep_lg_ammo | FORMAT-UNIFIED | rev=1 | from-shape: prose with items.c code-trace + "else +15" detail | to-shape: D20-template

### ktx:cvar:k_freshteams_sweep_lg_ammo

- canonical_id: `ktx:cvar:k_freshteams_sweep_lg_ammo`
- prior length: 522
- new length: 338

- OLD description:
  > Fresh Teams (dmm1) only: the number of cells awarded when a player picks up a lightning gun they already own ('sweeping' it), applied only when k_freshteams and k_freshteams_limit_sweep_ammo are both enabled. The lightning gun draws from the cell ammo pool, so this value is added to the player's cells. When sweep limiting is off, picking up an already-owned lightning gun instead grants the default 15 cells. Units are cells (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set.

- NEW description:
  > Fresh Teams (dmm1): number of cells awarded when a player picks up a lightning gun they already own ('sweeping'). The lightning gun uses cell ammo. When sweep limiting is off, the standard game awards 15 cells for sweeping an LG.
  >
  > Range: 0 or more (integer, uncapped).
  >
  > Default: 3.
  > Set by: server config. Has no effect unless both k_freshteams and k_freshteams_limit_sweep_ammo are set.

---

B5-RESULT | ktx:cvar:k_overtime | FORMAT-UNIFIED | rev=1 | from-shape: prose with suppression conditions but no enum block or Default/Set-by | to-shape: D20-template

### ktx:cvar:k_overtime

- canonical_id: `ktx:cvar:k_overtime`
- prior length: 498
- new length: 419

- OLD description:
  > Selects what happens when a drawn match reaches its time limit. 0 = no overtime, the match simply ends as a draw; 1 = time-based overtime, play is extended by k_exttime minutes; 2 = sudden death, the next frag decides the match; 3 = tie-break, extra time is played and is only granted when the score difference is more than one frag; 4 = golden frag, a single decisive frag ends the match. Overtime is suppressed in hoonymode, in lgc mode, and for team/CTF games that do not have exactly two teams.

- NEW description:
  > Selects what happens when a drawn match reaches its time limit.
  >
  > 0 = no overtime (match ends as a draw).
  > 1 = time-based overtime (play extended by k_exttime minutes).
  > 2 = sudden death (next frag wins).
  > 3 = tie-break (extra time, only granted when the score difference is more than one frag).
  > 4 = golden frag (one decisive frag ends the match).
  >
  > Default: 0.
  > Set by: server config or 'overtime' admin command in-game. Overtime is suppressed in hoonymode, lgc mode, and team/CTF games without exactly two teams.

---

B5-RESULT | ktx:cvar:k_spm_color_rgba | FORMAT-UNIFIED | rev=1 | from-shape: prose with colormod/ExtFieldSetColorMod code-trace | to-shape: D20-template

### ktx:cvar:k_spm_color_rgba

- canonical_id: `ktx:cvar:k_spm_color_rgba`
- prior length: 526
- new length: 368

- OLD description:
  > Color and opacity tint applied to spawn-point marker entities. The value is a space-separated string of floats: the first three are the red, green and blue color-mod components, each clamped to a minimum of 0.0 and forwarded opaquely to the engine's `colormod` extended-field (per engine convention, 1.0 leaves the channel unmodified). An optional fourth value is the alpha (transparency) of the marker. At least three components must be supplied for the tint to take effect; with fewer than three the markers render untinted.

- NEW description:
  > Color and opacity tint for spawn-point marker entities. A space-separated string of floats: R G B [A], where each component is clamped to a minimum of 0.0 and a value of 1.0 leaves the channel unmodified. The alpha (fourth value) is optional; if omitted the markers render at full opacity. Requires at least three components; fewer than three leaves markers untinted.
  >
  > Default: "1.0 1.0 1.0 1.0" (no tint, full opacity).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_vp_break | FORMAT-UNIFIED | rev=1 | from-shape: prose with ceil()/CA exception but no enum block or structured template | to-shape: D20-template

### ktx:cvar:k_vp_break

- canonical_id: `ktx:cvar:k_vp_break`
- prior length: 509
- new length: 372

- OLD description:
  > The percentage of eligible voters required to pass a break vote (the /break command, which stops the current match). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)); in Clan Arena, only players in the current series count toward the base. This cvar applies only in match mode -- in matchless mode there is no /break and the next-map vote uses k_vp_map instead.

- NEW description:
  > Percentage of eligible voters required to pass a break vote (stopping the current match). Values below 51 are treated as 51; maximum is 100. In Clan Arena, only players in the current series count toward the voter base. Applies only in match mode -- matchless servers use k_vp_map for the equivalent vote instead.
  >
  > Range: 51 to 100 (effective; values below 51 floor to 51).
  >
  > Default: 51.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:srv_practice_mode | FORMAT-UNIFIED | rev=1 | from-shape: prose with ~30-site k_practice consumer list + code-trace | to-shape: D20-template

### ktx:cvar:srv_practice_mode

- canonical_id: `ktx:cvar:srv_practice_mode`
- prior length: 494
- new length: 360

- OLD description:
  > Server-wide practice-mode toggle. 0 = off (normal play): the server announces "Server in normal mode" and reloads the map when practice is turned off. 1 = on: the server announces "Server in practice mode" and enters practice state, which disables match-only mechanics across the gameplay code (item/pack respawn behaviour, door/plat/button/trigger gating, teledeath handling, and related match logic) so play can continue freely outside a match. Cannot be changed while a match is in progress.

- NEW description:
  > Server-wide toggle for practice mode, which allows freeplay outside a match by disabling match-only mechanics (item and pack respawns, door/platform/trigger gating, teledeath, and related match logic). Changing this setting reloads the map and announces the new mode to all players.
  >
  > 0 = normal play (announces "Server in normal mode", reloads map).
  > 1 = practice mode (announces "Server in practice mode", match mechanics disabled).
  >
  > Default: 0.
  > Set by: server config. Cannot be changed while a match is in progress.

---
