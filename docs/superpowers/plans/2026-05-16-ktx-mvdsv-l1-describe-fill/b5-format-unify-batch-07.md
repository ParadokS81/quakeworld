# B5 format-unify ledger -- batch 07

**Batch:** 07 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:13fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose-verbose with code-array ref + full error messages | to-shape: D20-template

### ktx:command:13fav_go

- canonical_id: `ktx:command:13fav_go`
- prior length: 575 chars
- new length: 293 chars

- OLD description:
  > Spectator-only command. Switches the spectator's point of view to the player stored in personal favourite slot 13 (the slot populated by fav13_add, which writes the spectator's slot-indexed favx[] array). The POV switch is issued as a track on that player's user id. If slot 13 is empty it prints "fav go: slot 13 is not defined"; if the stored player is no longer connected it prints "fav go: slot 13 can't find player"; if already spectating that player it prints "fav go: already observing...". One of the 1fav_go..20fav_go family, identical behaviour per slot index 1-20.

- NEW description:
  > Spectator-only command. Jumps the spectator's view to track the player stored in personal favourite slot 13 (populated beforehand via fav13_add). Prints an error if the slot is empty, if the stored player has disconnected, or if already tracking that player. One of the 1fav_go..20fav_go family -- identical behaviour per slot index.
  >
  > Set by: any spectator (in-game command).

---

B5-RESULT | ktx:command:19fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose-verbose with fav_add/fav_next independence clause | to-shape: D20-template

### ktx:command:19fav_go

- canonical_id: `ktx:command:19fav_go`
- prior length: 575 chars
- new length: 329 chars

- OLD description:
  > Spectator-only command. Switches the spectator's point of view to track the player saved in favourite slot 19. Slots are filled beforehand with the slot-based 'fav add' command while observing a player (one player per numbered slot, slots 1-20); '19fav_go' then jumps the view to whoever occupies slot 19. If slot 19 is empty it prints "slot 19 is not defined", if that player has left it prints "can't find player", and it does nothing if the spectator is already tracking that player. This slot-based favourites set is independent of the 'fav_add'/'fav_next' rotation list.

- NEW description:
  > Spectator-only command. Jumps the spectator's view to track the player stored in personal favourite slot 19 (populated beforehand via the slot-based 'fav add' command while observing a player). Prints an error if the slot is empty or the player has disconnected; does nothing if already tracking that player. This slot list is independent of the fav_add/fav_next rotation list. One of the 1fav_go..20fav_go family.
  >
  > Set by: any spectator (in-game command).

---

B5-RESULT | ktx:command:2fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose-verbose with internal array ref + fav2_add mention | to-shape: D20-template

### ktx:command:2fav_go

- canonical_id: `ktx:command:2fav_go`
- prior length: 563 chars
- new length: 311 chars

- OLD description:
  > Spectator point-of-view command: switches the spectator's view to track the player stored in favorite slot 2 of their personal favorites list (the per-client slot array populated by fav2_add). Usable only while spectating. If slot 2 is empty or the stored player is no longer in the game, it prints a "slot 2 is not defined" or "can't find player" message and does nothing; if already tracking that player, it reports "already observing" and does nothing. The leading number is the slot index (2 here); sibling commands 1fav_go through 20fav_go target slots 1-20.

- NEW description:
  > Spectator-only command. Jumps the spectator's view to track the player stored in personal favourite slot 2 (populated beforehand via fav2_add while observing a player). Prints an error if the slot is empty or the stored player has disconnected; does nothing if already tracking that player. The leading number is the slot index; sibling commands 1fav_go through 20fav_go target slots 1-20.
  >
  > Set by: any spectator (in-game command).

---

B5-RESULT | ktx:command:deathheight:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: prose with sentinel/clamping detail | to-shape: D20-template (command, scalar variant)

### ktx:command:deathheight:frogbot:editor

- canonical_id: `ktx:command:deathheight:frogbot:editor`
- prior length: 564 chars
- new length: 375 chars

- OLD description:
  > Frogbot route-editor command (available when bot editor mode is on; invoked as 'botcmd deathheight'). Sets a per-map Z-coordinate floor: any bot or bot-dropped item whose origin falls to or below this height is treated as a fall/lava death by the bot hazard logic. With no argument it prints the current value, or 'Death height: not set' when at the default sentinel. 'deathheight clear' resets it to the unset sentinel; a numeric argument sets the floor to that Z value. The value is clamped to at least the sentinel and persists into the saved .bot routing file.

- NEW description:
  > Frogbot route-editor command (invoked as 'botcmd deathheight'; requires bot editor mode). Sets a per-map height floor below which bots or bot-dropped items are treated as killed by a fall or hazard. With no argument, prints the current floor value or 'Death height: not set' if unset. 'deathheight clear' resets the floor to unset. A numeric argument sets the floor to that height value. The setting persists into the saved .bot routing file for the map.
  >
  > Set by: 'botcmd deathheight <value>' in bot editor mode.

---

B5-RESULT | ktx:command:elect | FORMAT-UNIFIED | rev=1 | from-shape: prose with gating list, no Set-by | to-shape: D20-template

### ktx:command:elect

- canonical_id: `ktx:command:elect`
- prior length: 570 chars
- new length: 371 chars

- OLD description:
  > Starts an admin-election vote in which the calling player requests server-admin rights: every other connected player is told to type "yes" in console to approve, and the requester becomes an admin if enough approve. Running it again while your own election is pending aborts that election. Refused if you are already an admin, if another election is already in progress, if the server has no admin slots (k_admins), if voting for admin is disabled (k_allowvoteadmin = 0), while an election cooldown timer is still active, or for a spectator while a match is in progress.

- NEW description:
  > Starts an admin-election vote: all other connected players are prompted to type "yes" to approve, and the requester gains admin rights if enough approve. Running it again while your own election is pending aborts that election instead. Refused if you are already an admin, if another election is already in progress, if admin elections are disabled (k_allowvoteadmin = 0), while a cooldown timer is active, or for a spectator during a live match.
  >
  > Set by: any player (k_admins and k_allowvoteadmin = 1 required).

---

B5-RESULT | ktx:command:force_spec | FORMAT-UNIFIED | rev=1 | from-shape: prose with "fs" infokey and toggle detail | to-shape: D20-template

### ktx:command:force_spec

- canonical_id: `ktx:command:force_spec`
- prior length: 566 chars
- new length: 393 chars

- OLD description:
  > Admin command. Forces players out of the game and onto the spectator side by issuing them a reconnect-as-spectator. The target is taken from the command argument, or from the admin's own "fs" setinfo userinfo key if no argument is given. If the value is "*", every player who is not readied (the admin excluded) is moved to spectator; otherwise a single player is resolved by name, or by spectator slot id when the value is a negative number, and is toggled to spectator (or back to player if already a spectator). Requires admin rights; usable in or out of a match.

- NEW description:
  > Admin command. Forces one or all players to reconnect as spectators. The target is taken from the command argument, or from the admin's "fs" userinfo key if no argument is given. Using "*" moves every unreadied player (except the admin) to spectator. Otherwise a single player is targeted by name or by a negative spectator slot number, and is toggled to spectator -- or back to player if already spectating. Usable in and out of a match.
  >
  > Set by: admin command 'force_spec' in-game.

---

B5-RESULT | ktx:command:race | FORMAT-UNIFIED | rev=1 | from-shape: prose with k_race cvar reference + prerequisites | to-shape: D20-template

### ktx:command:race

- canonical_id: `ktx:command:race`
- prior length: 569 chars
- new length: 371 chars

- OLD description:
  > Toggles race game mode on or off for the server by flipping the k_race cvar and then applying (or reverting) the hard-coded race ruleset. Turning race mode on switches the server into race configuration (deathmatch 4, practice/silent-record settings, single-spawn, no items, etc.); turning it off restores the non-race settings. Switching into race mode requires that bots are disabled first and that a rules change is currently allowed, and (when not already FFA) drops the server into FFA mode. The command is ignored while a race is in progress with players present.

- NEW description:
  > Toggles race game mode on or off. Turning race on applies the race ruleset (deathmatch 4, practice settings, single-spawn, no items) and drops the server into FFA mode if not already there. Turning race off restores the previous settings. Requires bots to be disabled and a rules change to be currently allowed before enabling. Has no effect while a race is in progress with players present.
  >
  > Set by: admin command 'race' in-game.

---

B5-RESULT | ktx:command:ready | FORMAT-UNIFIED | rev=1 | from-shape: prose with auto-xonx detail + reject-case list | to-shape: D20-template

### ktx:command:ready

- canonical_id: `ktx:command:ready`
- prior length: 551 chars
- new length: 364 chars

- OLD description:
  > Marks the calling player as ready to start the match; once enough players are ready the match countdown begins. In race mode (non-match) it instead readies you for the race. For an auto-xonx spectator it broadcasts your "desire to play" and triggers team balancing rather than setting ready. The command is rejected or no-ops in several cases: when already ready ("Type break to unready yourself"), in practice mode, during intermission/after the match, in a private game when not logged in, and in CTF/HoonyTDM unless you are on the red or blue team.

- NEW description:
  > Marks the calling player as ready to start the match; once enough players have readied, the match countdown begins. In race mode it readies you for the next race instead. For an auto-pickup spectator, broadcasts your intent to play and triggers team balancing. Rejected or no-ops when already ready, in practice mode, after the match has ended, in a private game without being logged in, or in CTF/HoonyTDM without being on the red or blue team.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:command:status1 | FORMAT-UNIFIED | rev=1 | from-shape: prose enumeration of fields + live match state, no Set-by | to-shape: D20-template

### ktx:command:status1

- canonical_id: `ktx:command:status1`
- prior length: 552 chars
- new length: 381 chars

- OLD description:
  > Prints the first page of current server settings to the requesting player: maxspeed, deathmatch mode, teamplay value, time limit, frag limit, powerups string, discharge, drop-quad, drop-ring, fair backpacks, drop-backpacks, spectator-info permission (admin-only vs all), more-spec-info, teleteam, and berzerk. It also appends live match state: a pending-start countdown, any election in progress with vote tally, whether team picking / a captain / a coach is present, and -- once a match is running -- sudden-death/overtime status or full minutes left.

- NEW description:
  > Prints the first page of server settings: maxspeed, deathmatch mode, teamplay, time limit, frag limit, powerups, discharge, drop-quad, drop-ring, fair backpacks, drop-backpacks, spectator-info permission, more-spec-info, teleteam, and berzerk. Also appends live match state: pending-start countdown, any election with vote tally, whether team picking / a captain / a coach is present, and once a match is running -- sudden-death/overtime status or minutes remaining.
  >
  > Set by: any player or spectator (in-game command).

---

B5-RESULT | ktx:command:yawnmode | FORMAT-UNIFIED | rev=1 | from-shape: prose with CF_PLAYER|CF_SPC_ADMIN jargon + k_yawnmode cvar ref | to-shape: D20-template

### ktx:command:yawnmode

- canonical_id: `ktx:command:yawnmode`
- prior length: 573 chars
- new length: 335 chars

- OLD description:
  > Toggles "yawn mode" on or off and applies it immediately, announcing the new state. Yawn mode is an alternate KTX ruleset that changes several combat and physics rules: e.g. axe damage becomes 50 instead of 20 in dmm3, shotgun/super-shotgun fire non-randomised pellets with a higher pellet count, armour protection values are altered, backpacks drop independently of the death type, and fall-bunny is enabled. Gated by the server's rules-change permission (no effect if a rules change is not currently allowed). Player or spectator-admin command (CF_PLAYER | CF_SPC_ADMIN).

- NEW description:
  > Toggles yawn mode on or off and announces the new state. Yawn mode is an alternate KTX ruleset that changes several combat and physics rules: axe damage becomes 50 in dmm3 (instead of 20), shotguns fire more non-randomised pellets, armour protection values are altered, backpacks always drop on death regardless of cause, and fall-bunny is enabled. Only accepted during a rules-change window.
  >
  > Set by: player or spectator-admin command 'yawnmode' in-game.

---

B5-RESULT | ktx:cvar:k_fbskill_aim_lookanywhere | FORMAT-UNIFIED | rev=1 | from-shape: prose with g_random()/bound()/field-name code jargon | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_lookanywhere

- canonical_id: `ktx:cvar:k_fbskill_aim_lookanywhere`
- prior length: 550 chars
- new length: 317 chars

- OLD description:
  > Frogbot AI tuning cvar controlling the bot's look-anywhere probability. While a match is in progress, each prediction-shot decision rolls g_random() against this value; when the roll succeeds the bot looks toward a sight marker derived from the enemy's predicted path instead of only its current target. Read back per bot clamped to bound(0, value, 1) into self->fb.skill.look_anywhere; higher values make the bot more often anticipate enemy movement. The server normally derives the value from the bot's skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning cvar. Sets the probability (0.0-1.0) that the bot anticipates enemy movement by aiming at a predicted future position instead of the enemy's current position. Higher values make the bot aim more predictively. The server normally sets this from the bot's skill level; setting the cvar overrides that.
  >
  > Range: 0.0-1.0 (clamped).
  >
  > Default: set by skill level formula.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_aim_pitch_max | FORMAT-UNIFIED | rev=1 | from-shape: prose with bound()/field-name code formula | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_pitch_max

- canonical_id: `ktx:cvar:k_fbskill_aim_pitch_max`
- prior length: 569 chars
- new length: 306 chars

- OLD description:
  > Frogbot AI tuning cvar setting the upper clamp on the bot's vertical (pitch) aim-error magnitude. In the per-frame aim-randomization step the pitch error is computed as bound(pitch.minimum, fabs(raw_pitch_diff) * pitch.scale, pitch.maximum), so this value caps how large the randomized vertical aim deviation can become no matter how far off-target the bot currently is. Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].maximum. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning cvar. Caps the maximum vertical (pitch) aim-error the bot can accumulate during per-frame aim randomization -- a higher value allows larger vertical misses. Paired with k_fbskill_aim_pitch_min (minimum) and k_fbskill_aim_pitch_scale (error scaling factor). The server normally sets this from the bot's aim-skill level; setting the cvar overrides that.
  >
  > Range: 0-10 (clamped).
  >
  > Default: set by aim-skill formula.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_aim_yaw_max | FORMAT-UNIFIED | rev=1 | from-shape: prose with bound()/field-name code formula | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_yaw_max

- canonical_id: `ktx:cvar:k_fbskill_aim_yaw_max`
- prior length: 559 chars
- new length: 304 chars

- OLD description:
  > Frogbot AI tuning cvar setting the upper clamp on the bot's horizontal (yaw) aim-error magnitude. In the per-frame aim-randomization step the yaw error is computed as bound(yaw.minimum, fabs(raw_yaw_diff) * yaw.scale, yaw.maximum), so this value caps how large the randomized horizontal aim deviation can become no matter how far off-target the bot currently is. Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[YAW].maximum. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning cvar. Caps the maximum horizontal (yaw) aim-error the bot can accumulate during per-frame aim randomization -- a higher value allows larger horizontal misses. Paired with k_fbskill_aim_yaw_min (minimum) and k_fbskill_aim_yaw_scale (error scaling factor). The server normally sets this from the bot's aim-skill level; setting the cvar overrides that.
  >
  > Range: 0-10 (clamped).
  >
  > Default: set by aim-skill formula.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_dmm4wiggletoggle | FORMAT-UNIFIED | rev=1 | from-shape: prose with BotDamageInflictedEvent()/bound()/internal field refs | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_dmm4wiggletoggle

- canonical_id: `ktx:cvar:k_fbskill_dmm4wiggletoggle`
- prior length: 573 chars
- new length: 342 chars

- OLD description:
  > Frogbot AI tuning cvar. Sets the per-hit probability that taking damage in deathmatch 4 flips the bot's current strafe-wiggle direction: when a bot is hurt and deathmatch >= 4, if random(0..1) is below this value (and the bot has wiggled past half its wiggle-run limit) its wiggle-run direction is reversed. Read into self->fb.skill.wiggle_toggle clamped with bound(0, value, 1.0). Consumed by BotDamageInflictedEvent() in bot_botenemy.c. This is the damage-triggered direction-flip chance; the separate k_fbskill_dmm4wiggle is the on/off enable for wiggle movement itself.

- NEW description:
  > Frogbot AI tuning cvar (deathmatch 4 only). Sets the probability (0.0-1.0) that taking a hit causes the bot to reverse its current strafe-wiggle direction, making its movement less predictable under fire. Distinct from k_fbskill_dmm4wiggle, which is the on/off enable for wiggle movement. The server normally sets this from the bot's skill level; setting the cvar overrides that.
  >
  > Range: 0.0-1.0 (clamped).
  >
  > Default: set by skill level formula.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_goalpredictionerror | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula/field-name code jargon | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_goalpredictionerror

- canonical_id: `ktx:cvar:k_fbskill_goalpredictionerror`
- prior length: 550 chars
- new length: 323 chars

- OLD description:
  > Frogbot AI tuning cvar. Scales how much random error the bot injects into its estimate of a goal's respawn timing: when evaluating a goal, the bot adds goal_time * this_value * random(0..1) onto that goal's saved respawn time, so a higher value makes the bot's notion of when an item respawns more wrong (effectively assuming items take longer to come back) and a value of 0 gives a perfect respawn-timing estimate. Read into self->fb.skill.prediction_error clamped with bound(0, value, 1). Consumed in goal respawn-time evaluation in bot_botgoals.c.

- NEW description:
  > Frogbot AI tuning cvar. Scales the random error injected into the bot's estimate of when items respawn: higher values make the bot assume items take longer to reappear (less accurate routing decisions); 0 gives a perfect respawn-timing estimate. The server normally sets this from the bot's skill level; setting the cvar overrides that.
  >
  > Range: 0.0-1.0 (clamped; 0 = perfect timing, 1 = maximum error).
  >
  > Default: set by skill level formula.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_vol_ownvel_incr | FORMAT-UNIFIED | rev=1 | from-shape: prose with field-name/function-name code jargon | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_vol_ownvel_incr

- canonical_id: `ktx:cvar:k_fbskill_vol_ownvel_incr`
- prior length: 552 chars
- new length: 340 chars

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is the volatility INCREMENT added to the running aim-volatility scalar when the bot's OWN horizontal speed exceeds the separate k_fbskill_vol_ownvel speed threshold (volatility += ownspeed_volatility). It sets how much aim degrades while the bot is moving fast, not the speed at which the penalty triggers. The bot reads it clamped to bound(0, value, 5.0) into self->fb.skill.ownspeed_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI tuning cvar. Sets how much aim accuracy degrades when the bot is moving fast: this value is the aim-volatility increment applied when the bot's own horizontal speed exceeds the k_fbskill_vol_ownvel threshold. Controls the magnitude of the penalty, not the speed threshold. The server normally sets this from the bot's skill level; setting the cvar overrides that.
  >
  > Range: 0.0-5.0 (clamped).
  >
  > Default: set by skill level formula.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_pow | FORMAT-UNIFIED | rev=1 | from-shape: prose with Get_Powerups() internals + per-type interaction | to-shape: D20-template boolean variant

### ktx:cvar:k_pow

- canonical_id: `ktx:cvar:k_pow`
- prior length: 555 chars
- new length: 368 chars

- OLD description:
  > Master switch for all powerups (quad, pent, ring, suit) on the server. 0 = all powerups disabled (powerup entities are hidden and cannot be picked up); 1 = powerups enabled. It works together with the per-type switches k_pow_q / k_pow_p / k_pow_r / k_pow_s: powerups are reported 'off' if k_pow is 0 or all four per-type switches are 0, 'on' if all four are 1, otherwise the enabled subset is listed. In matchless deathmatch mode the server can additionally auto-toggle the effective value based on player count (see k_pow_min_players / k_pow_check_time).

- NEW description:
  > Master switch for all powerups (quad, pent, ring, suit) on the server. Works with the per-type switches k_pow_q / k_pow_p / k_pow_r / k_pow_s: powerups are reported 'off' if this is 0 or all four per-type switches are 0, 'on' if all four per-type switches are 1, otherwise the enabled subset is listed. In matchless mode the server can auto-toggle powerups based on player count (see k_pow_min_players / k_pow_check_time).
  >
  > 0 = all powerups disabled (hidden and unclaimable).
  > 1 = powerups enabled (subject to per-type switches).
  >
  > Default: 1.
  > Set by: server config or 'pow' admin command in-game.

---

B5-RESULT | ktx:cvar:k_privategame_allow_specs | FORMAT-UNIFIED | rev=1 | from-shape: prose with sv_login values as implementation detail | to-shape: D20-template boolean variant

### ktx:cvar:k_privategame_allow_specs

- canonical_id: `ktx:cvar:k_privategame_allow_specs`
- prior length: 565 chars
- new length: 344 chars

- OLD description:
  > Controls whether unauthenticated spectators are tolerated when private-game mode is enabled. When set (1) the server uses sv_login 1 while private (logged-in players required, spectators not forced to authenticate) and non-logged-in players are merely force-spectated rather than disconnected. When unset (0) the server uses sv_login 2 while private, existing unauthenticated spectators are sent a disconnect, and non-logged-in players are disconnected with a 'Please reconnect & login' message. 0 = unauthed spectators not allowed, 1 = unauthed spectators allowed.

- NEW description:
  > Controls whether unauthenticated spectators are tolerated when private-game mode is active. When enabled, spectators are not forced to authenticate and non-logged-in players are moved to spectator rather than disconnected. When disabled, unauthenticated spectators are disconnected and non-logged-in players receive a 'Please reconnect & login' message.
  >
  > 0 = unauthenticated spectators not allowed (disconnected when private mode activates).
  > 1 = unauthenticated spectators tolerated.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_use_matchless_dir | FORMAT-UNIFIED | rev=1 | from-shape: prose with config-file path details + C2 conflict note | to-shape: D20-template 3-value enum

### ktx:cvar:k_use_matchless_dir

- canonical_id: `ktx:cvar:k_use_matchless_dir`
- prior length: 568 chars
- new length: 303 chars

- OLD description:
  > In matchless mode, selects which usermode config directory the server loads. When 0, the normal config path is used (configs/usermodes/ffa for the ffa usermode). When non-zero, the ffa usermode is redirected to configs/usermodes/matchless instead of configs/usermodes/ffa. The specific value 2 additionally makes the matchless usermode load matchless/ctf.cfg instead of matchless/default.cfg (used to force the CTF variant config, since CTF cannot be detected reliably at that point). 0 = use ffa dir, 1 = use matchless dir, 2 = use matchless dir and load its ctf.cfg.

- NEW description:
  > In matchless mode, selects which usermode config directory the server loads. Value 2 additionally forces the CTF variant config within the matchless directory.
  >
  > 0 = use the standard FFA usermode config.
  > 1 = use the matchless usermode config (matchless/default.cfg).
  > 2 = use the matchless usermode config and load matchless/ctf.cfg instead.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_vp_antilag | FORMAT-UNIFIED | rev=1 | from-shape: prose with backtick code syntax + vote-count formula | to-shape: D20-template scalar variant

### ktx:cvar:k_vp_antilag

- canonical_id: `ktx:cvar:k_vp_antilag`
- prior length: 556 chars
- new length: 266 chars

- OLD description:
  > The percentage of eligible voters required to pass an antilag vote -- the `/antilag` command casts a vote that, on pass, toggles `sv_antilag` between `0` and `2` (lag-compensation off / on) via `vote_check_antilag`. Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is `max(2, ceil(percent/100 * (players minus bots)))` -- the percent term is the primary scaling factor, but the antilag vote applies a minimum-vote floor of 2 regardless of player count.

- NEW description:
  > Percentage of eligible voters (players minus bots) required to pass an antilag vote. On pass, toggles lag compensation off or on server-wide. The antilag vote requires a minimum of 2 approvals regardless of player count. Values below 51 are treated as 51; maximum is 100.
  >
  > Range: 51-100 (effective; values below 51 floor to 51).
  >
  > Default: 51.
  > Set by: server config.

---
