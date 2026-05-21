# B5 format-unify ledger -- batch 06

**Batch:** 06 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:blitz4v4 | FORMAT-UNIFIED | rev=1 | from-shape: preset-detail prose listing all cvar values | to-shape: D20-template

### ktx:command:blitz4v4

- canonical_id: `ktx:command:blitz4v4`
- prior length: 598 chars
- new length: 364 chars

- OLD description:
  > Applies the Blitz 4v4 game-mode preset: a 4-versus-4 team match run as short hoonymode-style rounds. Sets it to 8 players (maxclients/k_maxclients 8), enables hoonymode (k_hoonymode 1) with 4 rounds (k_hoonyrounds 4, two sets of spawns), uses a 5-minute round timelimit with fraglimit 0 (time-based rounds), teamplay 2 (teammates and self can be damaged), deathmatch 1 (base mode -- weapons do not stay on pickup), enables powerups, requires 3 players minimum per team and 1-2 teams, runs time-based overtime (5 min), and sets the internal game mode to k_mode 2. The shared common reset runs first.

- NEW description:
  > Applies the Blitz 4v4 game-mode preset: a 4-versus-4 team match played as short hoonymode-style rounds. Configures the server for 8 players, enables hoonymode with 4 rounds per match (two sets of spawns), sets a 5-minute round timelimit with no fraglimit, uses deathmatch 1 with friendly-fire on, enables powerups, requires 3+ players per team, and enables timed overtime (5 min). Runs the shared common reset first.
  >
  > Set by: admin command 'blitz4v4' in-game, or server config preset.

---

B5-RESULT | ktx:command:check | FORMAT-UNIFIED | rev=1 | from-shape: prose with f_* query taxonomy and refusal conditions | to-shape: D20-template

### ktx:command:check

- canonical_id: `ktx:command:check`
- prior length: 582 chars
- new length: 479 chars

- OLD description:
  > Issues an anti-cheat f_* query to every connected client and broadcasts the responses. Usage: 'cmd check <f_query>' (e.g. f_version). Non-admins may only run f_version, f_modified, f_server and f_movement; real admins may issue any f_* query. f_movement immediately reports each non-bot player's perfect-strafe percentage and SOCD detection counts; other queries broadcast a randomized challenge, collect client replies for ~3 seconds, then report them. Refused while a match is in progress, if exactly one argument is not given, or while a previous check is still awaiting replies.

- NEW description:
  > Sends an anti-cheat query to every connected client and broadcasts the responses. Usage: 'cmd check <f_query>' (e.g. f_version).
  >
  > Allowed queries for non-admins: f_version, f_modified, f_server, f_movement. Real admins may issue any f_* query.
  > f_movement reports each non-bot player's perfect-strafe percentage and SOCD detection counts immediately.
  > All other queries broadcast a randomized challenge and collect replies for ~3 seconds before reporting.
  >
  > Refused: during a live match, if not given exactly one argument, or while a previous check is still pending.
  >
  > Set by: admin command 'check' in-game.

---

B5-RESULT | ktx:command:demomark | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-parenthetical match_in_progress gate | to-shape: D20-template

### ktx:command:demomark

- canonical_id: `ktx:command:demomark`
- prior length: 580 chars
- new length: 370 chars

- OLD description:
  > Places a named, timestamped marker into the server-side MVD demo recording at the moment it is run, so the spot can be jumped to during demo playback. The marker is only recorded while a match is actually in progress (match_in_progress > 1); the marker is timestamped relative to match start, labelled with the caller's name, debounced so a second marker within 5 seconds of the previous one is ignored, and capped at a fixed maximum number of markers (the caller is told 'Demo markers full!' once the cap is reached). The caller is shown the marker's MM:SS match time on success.

- NEW description:
  > Places a named, timestamped marker into the server-side MVD demo recording so the moment can be jumped to during playback. The marker is labelled with the caller's name and timestamped relative to match start (displayed as MM:SS on success).
  >
  > Only recorded during a live match. A second marker within 5 seconds of the previous one is ignored. Prints 'Demo markers full!' once the per-match cap is reached.
  >
  > Set by: any player (in-game command, match must be in progress).

---

B5-RESULT | ktx:command:lastscores | FORMAT-UNIFIED | rev=1 | from-shape: prose with extended-view and grouping detail | to-shape: D20-template

### ktx:command:lastscores

- canonical_id: `ktx:command:lastscores`
- prior length: 578 chars
- new length: 384 chars

- OLD description:
  > Prints the recorded results of recently completed games to the requesting client. For each stored game it shows the matchup (the two team names, or the two duelers) and the game-mode label, followed by the per-map score line; consecutive entries with the same matchup and mode are grouped under one header. Passing any argument switches to an extended view that additionally lists each team's members (in team, CTF and CA modes) so the squad that played each map is visible. Ends with a count of entries found, or reports "Lastscores data empty" when there is no stored history.

- NEW description:
  > Prints the results of recently completed games to the requesting player. Each entry shows the matchup (team names or duelers), game-mode label, and per-map score; consecutive entries with the same matchup and mode are grouped. Ends with a count of entries, or "Lastscores data empty" when there is no history.
  >
  > Passing any argument switches to an extended view that also lists each team's roster (in team, CTF, and CA modes).
  >
  > Set by: any player (in-game command 'lastscores').

---

B5-RESULT | ktx:command:lastscoresktx | FORMAT-UNIFIED | rev=1 | from-shape: prose alias description with full detail | to-shape: D20-template

### ktx:command:lastscoresktx

- canonical_id: `ktx:command:lastscoresktx`
- prior length: 593 chars
- new length: 390 chars

- OLD description:
  > Prints the recorded results of recently completed games to the requesting client (a behaviourally identical alias of the lastscores command). For each stored game it shows the matchup (the two team names, or the two duelers) and the game-mode label, followed by the per-map score line; consecutive entries with the same matchup and mode are grouped under one header. Passing any argument switches to an extended view that additionally lists each team's members (in team, CTF and CA modes). Ends with a count of entries found, or reports "Lastscores data empty" when there is no stored history.

- NEW description:
  > Prints the results of recently completed games to the requesting player (behaviourally identical alias of 'lastscores'). Each entry shows the matchup (team names or duelers), game-mode label, and per-map score; consecutive entries with the same matchup and mode are grouped. Ends with a count of entries, or "Lastscores data empty" when there is no history.
  >
  > Passing any argument switches to an extended view that also lists each team's roster (in team, CTF, and CA modes).
  >
  > Set by: any player (in-game command 'lastscoresktx').

---

B5-RESULT | ktx:command:pause | FORMAT-UNIFIED | rev=1 | from-shape: prose with countdown/refusal detail and matchless caveat | to-shape: D20-template

### ktx:command:pause

- canonical_id: `ktx:command:pause`
- prior length: 577 chars
- new length: 455 chars

- OLD description:
  > Toggles the game's pause state. If the game is currently paused it requests an unpause that takes effect after a 3-second countdown; if it is not paused it requests a pause, also applied after a 3-second countdown. A pause is refused when 3 or fewer seconds remain in the match, or unless pausing is permitted (the pausable cvar set, the caller is an admin, or the player still has pause requests remaining). Repeated calls while a pause/unpause is already pending report the pending state instead of stacking. Outside matchless mode it acts only during an actual running game.

- NEW description:
  > Toggles the game's pause state, applying the change after a 3-second countdown in either direction. If a pause or unpause is already pending, repeated calls report the pending state instead of stacking.
  >
  > Pause is refused when:
  > - 3 or fewer seconds remain in the match.
  > - pausing is not permitted (the pausable cvar is off) AND the caller is not an admin AND the player has no pause requests remaining.
  >
  > Only active during a running match (outside matchless mode).
  >
  > Set by: admin command, or any player if pausable is enabled and pause requests remain.

---

B5-RESULT | ktx:command:powerups | FORMAT-UNIFIED | rev=1 | from-shape: prose with letter-arg taxonomy and mode-gate conditions | to-shape: D20-template

### ktx:command:powerups

- canonical_id: `ktx:command:powerups`
- prior length: 596 chars
- new length: 421 chars

- OLD description:
  > Controls which powerups spawn on the map. Called with no argument it toggles all powerups on or off together (Quad, Pentagram, Ring of Shadows, and Biosuit). Called with one or more of the letter arguments q, p, r, s (up to 4) it toggles each powerup individually: q = Quad Damage, p = Pentagram of Protection, r = Ring of Shadows, s = Biosuit; the global powerups-on state is then set on if at least one type is enabled and off if all are disabled. The command has no effect while a match is in progress, and powerups are reported disabled (no change) when the Instagib or Midair mode is active.

- NEW description:
  > Toggles powerup spawning on the current map. With no argument, toggles all four powerups together (Quad, Pentagram, Ring of Shadows, Biosuit). With one or more letter arguments, toggles each individually:
  >
  > q = Quad Damage, p = Pentagram of Protection, r = Ring of Shadows, s = Biosuit.
  >
  > The overall powerups-on state tracks whether at least one type is enabled. Has no effect during a live match. Powerups are reported disabled (no change) when Instagib or Midair mode is active.
  >
  > Set by: admin command 'powerups [q] [p] [r] [s]' in-game.

---

B5-RESULT | ktx:command:qenemy | FORMAT-UNIFIED | rev=1 | from-shape: prose with XOR-mechanism detail and code-backtick refs | to-shape: D20-template

### ktx:command:qenemy

- canonical_id: `ktx:command:qenemy`
- prior length: 589 chars
- new length: 361 chars

- OLD description:
  > Toggles bit 32 of the server's `fpd` serverinfo bitmask by XOR (`fpd ^= 32`), then propagates the change via `localcmd("serverinfo fpd <n>")` and broadcasts the new state to all players as "QiZmo enemy reporting allowed" (when the bit is set after the toggle) or "... disallowed" (when cleared). The fpd serverinfo bit is the contract surface; the actual enemy-nearby reporting behaviour is enforced externally by the QiZmo proxy reading this bit -- no KTX read-site interprets bit 32 as a runtime restriction on its own gameplay code. Refused (silent return) while a match is in progress.

- NEW description:
  > Toggles QiZmo enemy-nearby reporting on or off. Sets or clears the relevant bit in the server's fpd serverinfo value and broadcasts "QiZmo enemy reporting allowed" or "... disallowed" to all players. The actual enforcement of enemy reporting is handled by the QiZmo proxy, which reads the fpd serverinfo -- KTX itself only sets the flag.
  >
  > Refused while a match is in progress.
  >
  > Set by: admin command 'qenemy' in-game.

---

B5-RESULT | ktx:command:quadmultiplier:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: prose with ToT-only condition and default value | to-shape: D20-template

### ktx:command:quadmultiplier:frogbot:std

- canonical_id: `ktx:command:quadmultiplier:frogbot:std`
- prior length: 593 chars
- new length: 418 chars

- OLD description:
  > Frogbots subcommand (used as /botcmd quadmultiplier <multiplier>): sets the quad-damage multiplier applied to bots, clamped to the integer range 1-10, by writing the k_fb_quad_multiplier cvar (default 4). The value only takes effect while ToT (Take-of-the-Throne) mode is enabled and the map is deathmatch 4; in that case quad damage is multiplied by this value instead of the hard-coded x8. Outside ToT mode the quad multiplier is fixed (x4 normally, x8 in dmm4) and this setting has no effect. With no argument it prints usage and the current value. No-op if bots are disabled on the server.

- NEW description:
  > Frogbots subcommand: sets the quad-damage multiplier applied to bots. Usage: '/botcmd quadmultiplier <1-10>'. With no argument, prints usage and the current value.
  >
  > Range: 1-10 (integer; clamped).
  >
  > The multiplier only takes effect in ToT (Take-of-the-Throne) mode on a deathmatch 4 map -- in that case quad damage is multiplied by this value instead of the normal x8. Outside ToT mode the quad multiplier is fixed and this setting has no effect. No-op if bots are disabled.
  >
  > Default: 4.
  > Set by: admin command '/botcmd quadmultiplier <n>' in-game.

---

B5-RESULT | ktx:command:race_countdown_up | FORMAT-UNIFIED | rev=1 | from-shape: prose with open-interval gate and accept/reject distinction | to-shape: D20-template

### ktx:command:race_countdown_up

- canonical_id: `ktx:command:race_countdown_up`
- prior length: 579 chars
- new length: 365 chars

- OLD description:
  > Increases the race start-countdown length (the `k_race_countdown` cvar) by 1 second; only active in race mode (`isRACE()`) when no match is in progress and the race has not yet started, otherwise silently returns. The new value is ACCEPTED only when within the open interval (0, 6) -- i.e. integer seconds 1 through 5; out-of-range inputs are REJECTED (the cvar is left unchanged) and the caller is privately notified with "race countdown still <old-value>". On accept, the new value is written to the cvar and "Race countdown length set to <n> seconds" is broadcast to everyone.

- NEW description:
  > Increases the race start-countdown length by 1 second (steps the k_race_countdown cvar up). Only active in race mode, when no match is in progress and the race has not yet started.
  >
  > The new value is accepted only in the range 1-5 seconds; out-of-range results are rejected (cvar unchanged), and the caller is notified "race countdown still <old-value>". On accept, the new value is broadcast to all players.
  >
  > Set by: admin command 'race_countdown_up' in-game (race mode only, pre-match).

---

B5-RESULT | ktx:command:votecoop | FORMAT-UNIFIED | rev=1 | from-shape: prose with vote-mechanism and map-reload detail | to-shape: D20-template

### ktx:command:votecoop

- canonical_id: `ktx:command:votecoop`
- prior length: 602 chars
- new length: 455 chars

- OLD description:
  > Casts (or, if already cast, withdraws) the calling player's vote to toggle cooperative mode, broadcasting the vote and the remaining count needed. When the required majority is reached or an admin vetoes, the server flips the "coop" cvar and the inverse "deathmatch" cvar and reloads the level (a matchless usermode config for the current map if present, the bloodfest/default map under bloodfest, otherwise the "start" map when enabling coop or the current map when disabling). Refused while deathmatch is non-zero and a match is in progress. Player-only command, usable outside a match, no arguments.

- NEW description:
  > Casts (or withdraws, if already cast) the calling player's vote to toggle cooperative mode on or off. Broadcasts the vote and the remaining count needed. Refused while a deathmatch match is in progress.
  >
  > When the required majority is reached (or an admin vetoes), the server flips the coop and deathmatch cvars and reloads the level. The map loaded depends on state: a matchless usermode config for the current map if available, bloodfest's default map under bloodfest, otherwise "start" when enabling coop or the current map when disabling.
  >
  > Set by: any player (in-game command 'votecoop', outside a live match).

---

B5-RESULT | ktx:cvar:k_fbskill_aim_accuracy | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula inline and higher/lower contrast | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_accuracy

- canonical_id: `ktx:cvar:k_fbskill_aim_accuracy`
- prior length: 604 chars
- new length: 335 chars

- OLD description:
  > Frogbot AI aim tuning: the bot's permitted aim-error tolerance when deciding whether to open fire. The value is folded into the firing threshold min_angle_error = (1 + risk) * risk_factor * (value + 1440 / distance_to_target); the bot only shoots when both its yaw and pitch angular error to the target (in degrees) are within that threshold. Higher = a wider permitted aim error, so the bot fires from sloppier aim and shoots sooner; lower (toward 0) = the bot must be aimed more precisely before it fires. Clamped to 0..45 per bot. Normally set automatically from the configured bot skill, not by hand.

- NEW description:
  > Frogbot AI aim tuning: the bot's permitted aim-error tolerance (in degrees) when deciding whether to open fire. Higher values allow the bot to fire from sloppier aim; lower values require the bot to be aimed more precisely before shooting.
  >
  > Range: 0-45 (degrees; clamped per bot).
  >
  > Default: set from bot skill level.
  > Set by: server config (normally managed by the bot skill system; override by hand only for testing).

---

B5-RESULT | ktx:cvar:k_fbskill_aim_yaw_min | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula and field-name reference | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_yaw_min

- canonical_id: `ktx:cvar:k_fbskill_aim_yaw_min`
- prior length: 604 chars
- new length: 356 chars

- OLD description:
  > Frogbot AI tuning cvar setting the lower clamp on the bot's horizontal (yaw) aim-error magnitude. In the per-frame aim-randomization step the yaw error is computed as bound(yaw.minimum, fabs(raw_yaw_diff) * yaw.scale, yaw.maximum), so this value is the floor below which the randomized yaw deviation cannot fall -- the bot still wobbles horizontally by at least this many degrees even when already on target. Read back per bot clamped to bound(0, value, 1) into self->fb.skill.aim_params[YAW].minimum. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning: sets the minimum horizontal (yaw) aim wobble for bots. This is the floor of the per-frame randomized yaw deviation -- the bot still wobbles horizontally by at least this many degrees even when already on target. Higher values mean the bot is never perfectly horizontally centred on an enemy.
  >
  > Range: 0-1 (degrees; clamped per bot).
  >
  > Default: set from bot skill level.
  > Set by: server config (normally managed by the bot skill system; override by hand only for testing).

---

B5-RESULT | ktx:cvar:k_fbskill_distanceerror | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula bracketing and field-name reference | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_distanceerror

- canonical_id: `ktx:cvar:k_fbskill_distanceerror`
- prior length: 593 chars
- new length: 387 chars

- OLD description:
  > Frogbot AI tuning cvar. Sets the fractional random error the bot applies when estimating an enemy's movement time for aim prediction: when predicting where an enemy will be, the bot replaces the real time-to-target with a random value in the range [original_time * (1 - this_value), original_time * (1 + this_value)], so a higher value makes the bot mis-time its lead on a moving enemy and 0 gives an exact estimate. Read into self->fb.skill.movement_estimate_error clamped with bound(0, value, 0.25). Consumed by EstimateTimeBasedOnSkill() in bot_aim.c, which feeds enemy-location prediction.

- NEW description:
  > Frogbot AI tuning: fractional random error applied when the bot estimates how long it takes to reach an enemy (for aim prediction). A higher value makes the bot mis-time its lead on a moving target; 0 gives an exact time estimate, producing perfectly-timed prediction.
  >
  > Range: 0-0.25 (fractional; clamped per bot).
  >
  > Default: set from bot skill level.
  > Set by: server config (normally managed by the bot skill system; override by hand only for testing).

---

B5-RESULT | ktx:cvar:k_fbskill_reactiontime | FORMAT-UNIFIED | rev=1 | from-shape: prose with look-target-change trigger and higher/lower contrast | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_reactiontime

- canonical_id: `ktx:cvar:k_fbskill_reactiontime`
- prior length: 576 chars
- new length: 353 chars

- OLD description:
  > Frogbot AI reaction tuning: the delay in seconds before the bot may open fire on a newly-acquired enemy (and after spawning). Whenever the bot's look-target changes to a new opponent, or when the bot enters the world, its earliest-fire time is set to current time plus this value, and it cannot shoot until that time elapses. Higher = a longer delay before the bot reacts to and fires at a freshly-seen target (slower reaction); lower (toward 0) = near-instant reaction. Clamped to 0..1.5 seconds per bot. Normally set automatically from the configured bot skill, not by hand.

- NEW description:
  > Frogbot AI reaction tuning: delay in seconds before the bot may open fire after acquiring a new enemy (or after spawning). Higher values slow the bot's reaction to freshly-seen targets; 0 gives near-instant reaction.
  >
  > Range: 0-1.5 (seconds; clamped per bot).
  >
  > Default: set from bot skill level.
  > Set by: server config (normally managed by the bot skill system; override by hand only for testing).

---

B5-RESULT | ktx:cvar:k_fbskill_use_rocketjumps | FORMAT-UNIFIED | rev=1 | from-shape: prose with canRocketJump field and easy-mode asymmetry note | to-shape: D20-template boolean variant

### ktx:cvar:k_fbskill_use_rocketjumps

- canonical_id: `ktx:cvar:k_fbskill_use_rocketjumps`
- prior length: 598 chars
- new length: 370 chars

- OLD description:
  > Frogbot AI tuning cvar. Boolean gate for whether the bot is allowed to rocket-jump: read into self->fb.skill.use_rocketjumps as (cvar > 0), and when this is false the bot's rocket-jump capability is forced off (self->fb.canRocketJump = false) for that decision, suppressing rocket-jump path moves; when true the bot may rocket-jump where its path/jump logic calls for it. Consumed by the rocket-jump decision in bot_botjump.c. Note: only the easy-skill-mode derivation sets this from skill (skill > 5 ? 1 : 0); the default skill mode does not assign it, leaving it at its registered/last-set value.

- NEW description:
  > Frogbot AI toggle: whether bots are allowed to rocket-jump. When disabled, bots never use rocket jumps for pathing even where the route calls for it.
  >
  > 0 = bots do not rocket-jump.
  > 1 = bots may rocket-jump where their path logic calls for it.
  >
  > Default: set from bot skill level (easy-skill mode only; in standard skill mode the cvar retains its registered value unless set explicitly).
  > Set by: server config (normally managed by the bot skill system; override by hand only for testing).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_oppvel_incr | FORMAT-UNIFIED | rev=1 | from-shape: prose with volatility formula and field-name reference | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_vol_oppvel_incr

- canonical_id: `ktx:cvar:k_fbskill_vol_oppvel_incr`
- prior length: 587 chars
- new length: 392 chars

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is the volatility INCREMENT added to the running aim-volatility scalar when the bot's current OPPONENT's horizontal speed exceeds the separate k_fbskill_vol_oppvel speed threshold (volatility += enemyspeed_volatility). It sets how much the bot's aim degrades against a fast-moving target, not the enemy speed at which the penalty triggers. The bot reads it clamped to bound(0, value, 5.0) into self->fb.skill.enemyspeed_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI aim-volatility tuning: the amount of extra aim wobble added when the bot's enemy is moving fast (above the k_fbskill_vol_oppvel speed threshold). This sets how much the bot's aim degrades against a fast-moving target -- not the speed at which the penalty kicks in (that is k_fbskill_vol_oppvel).
  >
  > Range: 0-5.0 (aim-volatility units; clamped per bot).
  >
  > Default: set from bot skill level.
  > Set by: server config (normally managed by the bot skill system; override by hand only for testing).

---

B5-RESULT | ktx:cvar:k_privategame | FORMAT-UNIFIED | rev=1 | from-shape: prose with private_game_toggle() function name and sv_login enum | to-shape: D20-template boolean variant

### ktx:cvar:k_privategame

- canonical_id: `ktx:cvar:k_privategame`
- prior length: 578 chars
- new length: 413 chars

- OLD description:
  > Current private-game state for the server. When non-zero the server is in private-game mode: only logged-in players may ready up (unauthenticated players attempting to ready are told to log in first). The value is not set directly by operators in normal use -- it is toggled by private_game_toggle(), which also sets sv_login (1 = players must be logged in, 2 = everyone including spectators must be logged in, 0 = open) and, when enabling mid-setup, unreadies and optionally kicks or force-spectates unauthenticated players. 0 = public game (off), non-zero = private game (on).

- NEW description:
  > Tracks whether the server is currently in private-game mode. When enabled, only logged-in players may ready up; unauthenticated players attempting to ready are told to log in first.
  >
  > 0 = public game (login not required to ready).
  > 1 = private game (only logged-in players may ready).
  >
  > Not set directly in server config -- toggled via a private-game vote, which also configures login requirements and optionally kicks or force-spectates unauthenticated players when enabled mid-setup.
  >
  > Default: 0.
  > Set by: private-game vote.

---

B5-RESULT | ktx:cvar:k_privategame_force_reconnect | FORMAT-UNIFIED | rev=1 | from-shape: prose with allow_spectators branch detail and map-change note | to-shape: D20-template boolean variant

### ktx:cvar:k_privategame_force_reconnect

- canonical_id: `ktx:cvar:k_privategame_force_reconnect`
- prior length: 581 chars
- new length: 436 chars

- OLD description:
  > When private-game mode is enabled mid-setup, controls whether already-connected unauthenticated players are ejected immediately rather than left in place. When set (1), each non-logged-in player is acted on: if unauthed spectators are allowed they are force-spectated with 'You must login to play.', otherwise they are sent a disconnect with 'Please reconnect & login'. When unset (0) such players are only unreadied and left connected (they get cleared at the next map change anyway). 0 = do not force-reconnect unauthed players on enabling private game, 1 = force-reconnect them.

- NEW description:
  > Controls whether unauthenticated players are ejected immediately when private-game mode is enabled mid-setup.
  >
  > 0 = unauthed players are only unreadied and left connected (they are cleared at the next map change).
  > 1 = unauthed players are acted on immediately: force-spectated with 'You must login to play.' if unauthenticated spectators are permitted, or disconnected with 'Please reconnect & login' otherwise.
  >
  > Only relevant when private-game mode is toggled on during setup (has no effect once a match is running).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:timing_players_action | FORMAT-UNIFIED | rev=1 | from-shape: prose with bitmask bit-list and allow_timing gate | to-shape: D20-template (bitmask variant)

### ktx:cvar:timing_players_action

- canonical_id: `ktx:cvar:timing_players_action`
- prior length: 583 chars
- new length: 418 chars

- OLD description:
  > Bitmask selecting how the server reacts to a player who is timing out (lagging beyond timing_players_time). Bit 1 (value 1) = info: broadcast "WARNING: <player> is timing out!" and, on return, "<player> is back from lag". Bit 2 (value 2) = glow: give the lagged player a dim-light glow effect while flagged. Bit 4 (value 4) = invincible: while lagged, zero the player's takedamage, solid and movetype and freeze velocity (made non-interactive), restoring them when the player returns. Bits combine additively; e.g. 3 = info + glow, 7 = all three. Requires allow_timing to be enabled.

- NEW description:
  > Bitmask controlling how the server reacts to a player who is timing out (lagging beyond timing_players_time). Bits combine additively.
  >
  > 1 = info: broadcast "WARNING: <player> is timing out!" and "<player> is back from lag" on return.
  > 2 = glow: give the lagged player a visible glow effect while flagged.
  > 4 = invincible: make the lagged player non-interactive (no damage taken, frozen) and restore them when lag clears.
  >
  > Default: 0. Requires allow_timing to be enabled.
  > Set by: server config.

---
