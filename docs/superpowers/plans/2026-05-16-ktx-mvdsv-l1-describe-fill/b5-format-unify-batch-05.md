# B5 format-unify ledger -- batch 05

**Batch:** 05 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:captain | FORMAT-UNIFIED | rev=1 | from-shape: dense prose with refusal-conditions list | to-shape: D20-template

### ktx:command:captain

- canonical_id: `ktx:command:captain`
- prior length: 622 chars
- new length: 486 chars

- OLD description:
  > Toggles the caller's captain status. With no captain election active and the caller not yet a captain, it requests captain status and starts a captain election that other players approve by typing 'yes' (60-second timeout); invoking it again while the caller's own election is pending aborts that election, and invoking it while already a captain steps down. Refused during a match or intermission, in non-team / non-CTF modes, with fewer than 3 players present, when 2 captains already exist, while any other election is in progress, before the caller has set a team name, and (in CTF) unless the caller is on team red or blue.

- NEW description:
  > Player command to request, abort, or relinquish captain status. A first use starts a captain election; other players cast approval with the 'yes' command (60-second timeout). A second use while the election is pending aborts it; using it while already a captain steps down.
  >
  > Refused during a live match or intermission, in non-team or non-CTF modes, with fewer than 3 players, when 2 captains already exist, while another election is in progress, before setting a team name, or (in CTF) unless on team red or blue.
  >
  > Set by: any player in-game.

---

B5-RESULT | ktx:command:coach | FORMAT-UNIFIED | rev=1 | from-shape: dense prose with refusal-conditions list | to-shape: D20-template

### ktx:command:coach

- canonical_id: `ktx:command:coach`
- prior length: 588 chars
- new length: 479 chars

- OLD description:
  > Toggles the caller's coach status (spectators only). With no coach election active and the caller not yet a coach, it requests coach status and starts a coach election that players approve by typing 'yes' (60-second timeout); invoking it again while the caller's own election is pending aborts that election, and invoking it while already a coach steps down. Refused during a match or intermission, in non-team / non-CTF modes, with fewer than 3 players present, when 2 coaches already exist, while any other election is in progress, before the caller has set a team name, or when a coach with the same team name already exists.

- NEW description:
  > Spectator command to request, abort, or relinquish coach status. A first use starts a coach election; players cast approval with the 'yes' command (60-second timeout). A second use while the election is pending aborts it; using it while already a coach steps down.
  >
  > Refused during a live match or intermission, in non-team or non-CTF modes, with fewer than 3 players, when 2 coaches already exist, while another election is in progress, before setting a team name, or when a coach with the same team name already exists.
  >
  > Set by: spectators only (in-game command).

---

B5-RESULT | ktx:command:wreg | FORMAT-UNIFIED | rev=1 | from-shape: prose with argument grammar inline | to-shape: D20-template

### ktx:command:wreg

- canonical_id: `ktx:command:wreg`
- prior length: 648 chars
- new length: 427 chars

- OLD description:
  > Manages the caller's per-character weapon-registration slots (the server-side weapon-priority script feature). With no argument it lists all registered slots. With a single character argument it shows that slot's current registration. With a character plus a weapon order -- a string of weapon-impulse digits, optionally prefixed with + or - to force or release the attack button -- it registers that priority sequence under the given one-byte character; an empty order unregisters the slot. Up to 20 slots, weapon order max 10 characters; rejects multi-byte or out-of-range characters and non-digit orders with a usage message.

- NEW description:
  > Manages server-side weapon-priority script slots. Each slot is keyed to a single character and holds a weapon-impulse sequence (digits, optionally prefixed with + or - to force or release the attack button).
  >
  > No argument: lists all registered slots.
  > One argument (character): shows that slot's current registration.
  > Two arguments (character + order): registers the sequence; empty order clears the slot.
  >
  > Up to 20 slots; weapon order max 10 characters.
  > Set by: any player or spectator-admin, usable outside a match.

---

B5-RESULT | ktx:cvar:k_ctf_hook | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace references inline | to-shape: D20-template boolean variant

### ktx:cvar:k_ctf_hook

- canonical_id: `ktx:cvar:k_ctf_hook`
- prior length: 809 chars
- new length: 312 chars

- OLD description:
  > When enabled (non-zero), every player in CTF mode is given the grappling hook (added to their inventory on spawn in `PutClientInServer`) and may quick-switch to it by re-selecting the axe. When disabled, the hook is removed from all players (the `AddHook(false)` sweep clears `IT_HOOK` from every player and resets any in-flight hook entity). Toggleable in-game by the `nohook` command (registered as `nohook`, not `hook`), which calls `cvar_toggle_msg` to flip the cvar and broadcast the announce label "hook"; in matchless mode `nohook` additionally calls `AddHook(true|false)` immediately so the toggle takes effect mid-game.

- NEW description:
  > Enables the grappling hook for all players in CTF mode. When on, players spawn with the hook in their inventory and can quick-switch to it by re-selecting the axe. When turned off, the hook is removed from all players and any in-flight hook is reset.
  >
  > 0 = hook disabled.
  > 1 = hook enabled (given at spawn).
  >
  > Default: 0.
  > Set by: server config or 'nohook' admin command in-game.

---

B5-RESULT | ktx:command:16fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace detail + backtick refs | to-shape: D20-template

### ktx:command:16fav_go

- canonical_id: `ktx:command:16fav_go`
- prior length: 636 chars
- new length: 335 chars

- OLD description:
  > Spectator-only command that switches your point of view to the player stored in favorites slot 16. Slot 16 is filled by first tracking a player and then running `fav16_add` (each per-slot populator `favN_add` writes its own slot N; the unrelated `fav_add` populates a separate list used by `fav_next`, not by this command). `16fav_go` then issues a `track` to that saved player. Prints "slot 16 is not defined" if the slot is empty, "slot 16 can't find player" if the saved player is no longer connected, and "already observing..." if you are already tracking that player. Takes no arguments (the slot number is fixed at 16).

- NEW description:
  > Spectator command that jumps your view to the player saved in favorites slot 16. Save a player to the slot first by tracking them and running 'fav16_add'. Takes no arguments.
  >
  > Prints "slot 16 is not defined" if the slot is empty, "slot 16 can't find player" if the saved player is no longer connected, or "already observing..." if you are already tracking them.
  >
  > Set by: spectators only (in-game command).

---

B5-RESULT | ktx:command:yes | FORMAT-UNIFIED | rev=1 | from-shape: prose with guard details | to-shape: D20-template

### ktx:command:yes

- canonical_id: `ktx:command:yes`
- prior length: 656 chars
- new length: 341 chars

- OLD description:
  > Casts a vote in favour of the currently active election (the `elect` system, e.g. an admin or late-join election started with `elect`). No effect when no election is in progress. Cannot be used to vote for yourself ("You cannot vote for yourself"); a vote already cast stays counted ("your vote is still good"). For late-join elections only members of the requested team may vote. On a successful vote the server broadcasts "<name> gives his vote" and reports how many more votes are still needed; the companion `no` command withdraws a previously cast vote. Player command, usable outside a match (CF_PLAYER | CF_MATCHLESS).

- NEW description:
  > Casts a vote in favour of the current election (captain, coach, admin, or late-join). No effect when no election is active. Cannot vote for yourself; a vote already cast remains counted. For late-join elections only members of the requested team may vote.
  >
  > Broadcasts "<name> gives his vote" and reports remaining votes needed. Use 'no' to withdraw a previously cast vote.
  >
  > Set by: any player, usable outside a match.

---

B5-RESULT | ktx:command:fragsdown | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace detail | to-shape: D20-template

### ktx:command:fragsdown

- canonical_id: `ktx:command:fragsdown`
- prior length: 699 chars
- new length: 310 chars

- OLD description:
  > Lowers the server fraglimit by 10, clamped to the allowed range (1..100 outside hoonymode). It has no effect during a match (returns silently while one is in progress) and no effect in any hoonymode -- it prints "No fraglimit in hoonymode" and returns before any change is applied. As special cases a fraglimit of 1 drops directly to 0 (skipping the -10 step), and 0 stays at 0; if lowering would leave both fraglimit and timelimit at zero the change is rejected and the prior value restored, so at least one limit remains. When the change applies, the new fraglimit is announced to everyone with "Fraglimit set to <value>".

- NEW description:
  > Lowers the server fraglimit by 10 (clamped to 1-100), announcing the new value to all players. Has no effect during a match or in any hoonymode ("No fraglimit in hoonymode"). Will not reduce if doing so would leave both fraglimit and timelimit at zero.
  >
  > Special cases: fraglimit 1 drops directly to 0; fraglimit 0 stays at 0.
  >
  > Set by: admin command 'fragsdown' in-game.

---

B5-RESULT | ktx:cvar:k_fbskill_aim_pitch_min | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace + bound formulas | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_pitch_min

- canonical_id: `ktx:cvar:k_fbskill_aim_pitch_min`
- prior length: 680 chars
- new length: 335 chars

- OLD description:
  > Frogbot AI tuning cvar setting the lower clamp on the bot's vertical (pitch) aim-error magnitude. In the per-frame aim-randomization step the pitch error is computed as bound(pitch.minimum, fabs(raw_pitch_diff) * pitch.scale, pitch.maximum), so this value is the floor below which the randomized vertical aim deviation cannot fall -- the bot still wobbles vertically by at least this many degrees even when already on target. Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].minimum. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning: minimum vertical (pitch) aim-error magnitude in degrees. Sets the floor for how much the bot's aim wobbles vertically -- the bot always deviates by at least this many degrees even when on-target. Overrides the server's skill-derived value for all bots.
  >
  > Range: 0 to 10 (clamped; degrees).
  >
  > Default: derived from bot skill level.
  > Set by: server config (overrides skill-formula default).

---

B5-RESULT | ktx:command:infospec | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace inline + bit value mention | to-shape: D20-template

### ktx:command:infospec

- canonical_id: `ktx:command:infospec`
- prior length: 729 chars
- new length: 335 chars

- OLD description:
  > Toggles whether item-pickup notifications ("took" info such as "X got Megahealth") and the `moreinfo` command are made available to spectators during a game. Flips the `MI_ON` bit (`1<<0`) of the `k_spec_info` cvar by XOR: when set, spectator item-pickup info is broadcast (`mi_print` gated by `mi_on()`) and `moreinfo` works; when cleared, both are suppressed (`moreinfo` prints "Spec info is turned off by server"). Broadcasts "Extra info for spectators on" or "Extra info for spectators off" (the on/off token in red) on each toggle. Player/spectator-admin command; refused (silent return) while a match is in progress.

- NEW description:
  > Toggles spectator item-pickup info ("X got Megahealth" notifications) and the 'moreinfo' command on or off for spectators. Broadcasts "Extra info for spectators on/off" to all on each toggle. Has no effect during a live match.
  >
  > When off: 'moreinfo' prints "Spec info is turned off by server".
  >
  > Set by: player or spectator-admin command 'infospec' in-game (refused during a match).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_ownvel | FORMAT-UNIFIED | rev=1 | from-shape: prose with squared-threshold formula + code-trace | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_vol_ownvel

- canonical_id: `ktx:cvar:k_fbskill_vol_ownvel`
- prior length: 653 chars
- new length: 338 chars

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is a horizontal SPEED threshold (units: Quake velocity units per second; HorizontalVelocityCheck compares vx*vx+vy*vy against threshold*threshold) for the bot's OWN velocity: when the bot moves faster than this, aim volatility is increased by the separate k_fbskill_vol_ownvel_incr amount. This cvar itself only sets the trigger speed, not the volatility increment. The bot reads it clamped to bound(0, value, 1000) into self->fb.skill.ownspeed_volatility_threshold. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI tuning: horizontal speed threshold (Quake units/sec) above which the bot's own movement triggers increased aim volatility. When the bot moves faster than this value, aim volatility increases by the separate k_fbskill_vol_ownvel_incr amount. This cvar sets the trigger speed only, not the increment.
  >
  > Range: 0 to 1000 (clamped; Quake units/sec).
  >
  > Default: derived from bot skill level.
  > Set by: server config (overrides skill-formula default).

---

B5-RESULT | ktx:command:1on1 | FORMAT-UNIFIED | rev=1 | from-shape: prose with preset values inline + config-chain detail | to-shape: D20-template

### ktx:command:1on1

- canonical_id: `ktx:command:1on1`
- prior length: 723 chars
- new length: 388 chars

- OLD description:
  > Switches the server to the 1on1 (duel) match mode. Broadcasts "1 on 1 settings enabled" and applies the built-in duel preset (maxclients/k_maxclients 2, timelimit 10, teamplay 0, deathmatch 3 (weapons stay), k_overtime 1 with k_exttime 3, k_pow 0, k_mode 1), then execs the duel config chain: configs/usermodes/default.cfg, configs/usermodes/1on1/default.cfg, and any map-specific configs/usermodes/<map>.cfg overrides. Invokable by a player or spectator-admin (subject to k_free_mode access control and k_allowed_free_modes); accepts an optional matchtag argument that is written to serverinfo when invoked by a player.

- NEW description:
  > Switches the server to 1on1 (duel) mode. Applies the built-in duel preset (2 players, timelimit 10, weapons-stay deathmatch, overtime on) and execs the duel config chain (configs/usermodes/1on1/default.cfg plus any map-specific overrides). Announces "1 on 1 settings enabled".
  >
  > Accepts an optional matchtag argument (written to serverinfo). Subject to k_free_mode / k_allowed_free_modes access control.
  >
  > Set by: player or spectator-admin command '1on1' in-game.

---

B5-RESULT | ktx:command:instagib | FORMAT-UNIFIED | rev=1 | from-shape: prose with 4-state cycle + side-effects list | to-shape: D20-template

### ktx:command:instagib

- canonical_id: `ktx:command:instagib`
- prior length: 799 chars
- new length: 425 chars

- OLD description:
  > Cycles the server's Instagib mode through four states by stepping the k_instagib cvar 0 -> 1 -> 2 -> 3 -> 0: 0 disabled, 1 slow, 2 fast, 3 extreme (each labelled "... coilgun mode" instead when k_instagib_custom_models is set). Requires dmm4 (or k_midair) or it is refused with "Instagib requires dmm4". On each enable it execs configs/usermodes/instagib/default.cfg then a map-specific instagib cfg if present, disables midair, LGC and ToT modes and dmm4 grenade mode, and forces coilgun kickback (k_cg_kb) on. Player/spectator-admin command; only applies when a rules change is allowed. Broadcasts the resulting mode.

- NEW description:
  > Cycles the server's Instagib mode: 0 (off) -> 1 (slow) -> 2 (fast) -> 3 (extreme) -> 0. Requires dmm4 or k_midair ("Instagib requires dmm4" otherwise). On each enable, execs the instagib config chain and disables midair, LGC, ToT, and dmm4 grenade mode.
  >
  > 0 = disabled.
  > 1 = slow instagib.
  > 2 = fast instagib.
  > 3 = extreme instagib.
  >
  > Set by: player or spectator-admin command 'instagib' in-game (rules-change-allowed required).

---

B5-RESULT | ktx:cvar:k_fbskill_aim_yaw_scale | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula + normal/easy divergence note | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_yaw_scale

- canonical_id: `ktx:cvar:k_fbskill_aim_yaw_scale`
- prior length: 694 chars
- new length: 330 chars

- OLD description:
  > Frogbot AI tuning cvar setting the horizontal (yaw) aim-error growth factor. In the per-frame aim-randomization step the yaw error is computed as bound(yaw.minimum, fabs(raw_yaw_diff) * yaw.scale, yaw.maximum), so this value multiplies the raw angular difference between the bot's current and desired yaw before clamping -- it controls how steeply the bot's horizontal aim error grows the further off-target it currently is. Read back per bot clamped to bound(0, value, 5) into self->fb.skill.aim_params[YAW].scale. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning: horizontal (yaw) aim-error growth factor. Controls how steeply the bot's horizontal aim error grows the further off-target it is -- a higher value means larger yaw deviations when the bot is way off-target. Overrides the server's skill-derived value for all bots.
  >
  > Range: 0 to 5 (clamped).
  >
  > Default: derived from bot skill level.
  > Set by: server config (overrides skill-formula default).

---

B5-RESULT | ktx:cvar:k_fbskill_aim_yaw_multiplier | FORMAT-UNIFIED | rev=1 | from-shape: prose with distribution formula + normal/easy divergence note | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_yaw_multiplier

- canonical_id: `ktx:cvar:k_fbskill_aim_yaw_multiplier`
- prior length: 727 chars
- new length: 360 chars

- OLD description:
  > Frogbot AI tuning cvar shaping the horizontal (yaw) aim-error random distribution. After the yaw error magnitude is clamped, the randomized offset is drawn by dist_random(-yaw_diff, yaw_diff, yaw.multiplier * current_volatility), so this value (scaled by the bot's current volatility) is the distribution-shaping exponent that biases the yaw randomization toward the extremes or the center of the allowed error band. Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[YAW].multiplier. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning: distribution-shaping factor for horizontal (yaw) aim-error randomization. After the yaw error magnitude is clamped, this value (multiplied by the bot's current volatility) biases the random draw -- higher values push the result toward the extremes of the allowed error band rather than the center. Overrides the server's skill-derived value.
  >
  > Range: 0 to 10 (clamped).
  >
  > Default: derived from bot skill level.
  > Set by: server config (overrides skill-formula default).

---

B5-RESULT | ktx:command:practice | FORMAT-UNIFIED | rev=1 | from-shape: prose with access-control switch + reload detail | to-shape: D20-template

### ktx:command:practice

- canonical_id: `ktx:command:practice`
- prior length: 756 chars
- new length: 479 chars

- OLD description:
  > Toggles the server between practice mode and normal mode. Switching modes broadcasts "Server in practice mode" or "Server in normal mode"; leaving practice mode reloads the current map. The command is refused while a match is in progress, while a forcestart or idlebot is active, and when the server is locked in its current mode (cvar lock_practice = 2, or any value other than 0/1). Who may run it is gated by cvar allow_toggle_practice: 0 = no one; 1 or 2 = admins only; 3 or 4 = admins only (judges path not implemented, falls back to admin); 5 = all players; any other value = command skipped as misconfigured.

- NEW description:
  > Toggles the server between practice mode and normal mode. Leaving practice mode reloads the current map. Refused during a match, while a forcestart or idlebot is active, or when the mode is locked.
  >
  > Access controlled by cvar allow_toggle_practice:
  > 0 = nobody can use this command.
  > 1-2 = admins only.
  > 3-4 = admins only (judges path not implemented).
  > 5 = all players.
  >
  > Default access: server config (allow_toggle_practice).
  > Set by: player or admin (per allow_toggle_practice setting).

---

B5-RESULT | ktx:command:botcmd | FORMAT-UNIFIED | rev=1 | from-shape: prose with subcommand list + admin-gate detail | to-shape: D20-template

### ktx:command:botcmd

- canonical_id: `ktx:command:botcmd`
- prior length: 681 chars
- new length: 389 chars

- OLD description:
  > Frogbot control command: takes a subcommand and its arguments and dispatches into the frogbot command set. In normal mode it exposes bot-management subcommands (skill, addbot, fill, removebot, removeall, disable, health, weapon, breakondeath, togglequad, quadmultiplier, itempickupbonus, easyskillmode, debug); when frogbot editor mode is enabled it instead exposes the waypoint/routing editor subcommands. With no recognised subcommand it prints the list of available subcommands. Access can be restricted by the frogbot admin-only setting: value 1 limits use to admins, value 2 limits use to real server admins.

- NEW description:
  > Frogbot management command dispatcher. Passes subcommands to the frogbot system. In normal mode: skill, addbot, fill, removebot, removeall, disable, health, weapon, breakondeath, togglequad, quadmultiplier, itempickupbonus, easyskillmode, debug. In frogbot editor mode: waypoint and routing editor subcommands instead. No argument prints the available subcommand list.
  >
  > Access gated by frogbot admin-only setting: 1 = admins only; 2 = real server admins only.
  >
  > Set by: player, admin, or server admin (per admin-only setting).

---

B5-RESULT | ktx:command:dropitem | FORMAT-UNIFIED | rev=1 | from-shape: prose with full name table + code-trace detail | to-shape: D20-template

### ktx:command:dropitem

- canonical_id: `ktx:command:dropitem`
- prior length: 993 chars
- new length: 413 chars

- OLD description:
  > Cheat-only debug/map-testing command that spawns a named entity at the calling player's position. Requires the *cheats serverinfo to be set and is refused while a match is in progress; with no argument it prints the list of valid names. The accepted names cover health (h15/h25/h100), armor (ga/ya/ra), every weapon (ssg/ng/sng/gl/rl/lg), ammo packs (sh20/sh40/sp25/sp50/ro5/ro10/ce6/ce12), powerups (p=pentagram, s=enviro suit, r=ring, q=quad), CTF flags (fl_r/fl_b) and spawnpoints (sp_r/sp_b/sp_dm/sp_cp/sp_sp). Each successfully placed entity is flagged so it can later be exported with the dumpent command.

- NEW description:
  > Debug/map-testing command that spawns a named item at your position. Requires cheats enabled (*cheats serverinfo set) and is refused during a match. No argument prints the list of valid names.
  >
  > Accepted names: health (h15/h25/h100), armor (ga/ya/ra), weapons (ssg/ng/sng/gl/rl/lg), ammo (sh20/sh40/sp25/sp50/ro5/ro10/ce6/ce12), powerups (p/s/r/q), CTF flags (fl_r/fl_b), spawnpoints (sp_r/sp_b/sp_dm/sp_cp/sp_sp). Spawned items can later be exported with 'dumpent'.
  >
  > Set by: any player (cheats required).

---

B5-RESULT | ktx:command:sh_speed | FORMAT-UNIFIED | rev=1 | from-shape: prose with bit-value + HUD-overwrite mechanism detail | to-shape: D20-template

### ktx:command:sh_speed

- canonical_id: `ktx:command:sh_speed`
- prior length: 758 chars
- new length: 311 chars

- OLD description:
  > Toggles the per-player prewar speed display for the issuing client. It flips the KF_SPEED bit (value 64) in the client's "kf" user-info flags via a stuffed "cmd info kf" update (and reports "showing speed in prewar: on/off"). While the bit is set and the server is in prewar (not during a match, match-over, captain-pick, matchless or hoony modes), the player's HUD stat fields (armor, frags, ammo counts) are overwritten each frame with an encoding of current movement velocity, so the standard HUD numbers read out running speed during warmup. Has no effect once a match is in progress. Takes no arguments.

- NEW description:
  > Toggles the prewar speed display for your client. While on, during prewar the HUD stat numbers (armor, frags, ammo) are replaced with your current movement speed. Has no effect once a match is in progress. Reports "showing speed in prewar: on/off" on each toggle.
  >
  > Set by: any player (per-client toggle, in-game command).

---

B5-RESULT | ktx:command:debug:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: prose with per-subarg detail + code-trace | to-shape: D20-template

### ktx:command:debug:frogbot:std

- canonical_id: `ktx:command:debug:frogbot:std`
- prior length: 827 chars
- new length: 420 chars

- OLD description:
  > Frogbot debugging dispatcher (standard bot command set; invoked as 'botcmd debug'). With no sub-argument it dumps the bots' current 'thinking' state to the invoker. With a sub-argument (rejected while a match is in progress): 'goals' prints the bots' current goal list; 'door' on povdmm4 reports the low/high spawn door open/closed state and whether the low/high YA is blocked or available; 'markers' lists every routing marker with its index and classname; 'entity <n>' prints that entity number's classname and origin. Output is informational text sent to the caller only; it does not change game state.

- NEW description:
  > Frogbot debug subcommand, invoked as 'botcmd debug'. Prints diagnostic information to the caller only; does not change game state.
  >
  > No argument: dumps all bots' current thinking state.
  > goals: prints the bots' current goal list (refused during a match).
  > door: on povdmm4, reports spawn door state and YA availability (refused during a match).
  > markers: lists all routing markers with index and classname (refused during a match).
  > entity <n>: prints entity N's classname and origin (refused during a match).
  >
  > Set by: any player (frogbot debug utility).

---

B5-RESULT | ktx:cvar:k_fbskill_goallookaheadtime | FORMAT-UNIFIED | rev=1 | from-shape: prose with scoring formula + code-trace | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_goallookaheadtime

- canonical_id: `ktx:cvar:k_fbskill_goallookaheadtime`
- prior length: 627 chars
- new length: 338 chars

- OLD description:
  > Frogbot AI tuning cvar. Sets the bot's goal/path planning time horizon in seconds: when scoring a candidate goal, the bot only considers it if the estimated travel/respawn time to reach it is less than this horizon, and its goal score is weighted by (horizon - goal_time) / (goal_time + 5) so goals reachable far inside the horizon score higher. Read into self->fb.skill.lookahead_time clamped with bound(0, value, 45) (seconds). Consumed throughout goal evaluation in bot_botgoals.c and passed into path scoring in bot_botpath.c; a longer horizon makes the bot pursue goals that are further away in time.

- NEW description:
  > Frogbot AI tuning: goal planning time horizon in seconds. The bot only considers goals it can reach within this time window, and scores them higher the further inside the window they are -- a longer horizon makes bots pursue goals that are further away. Overrides the server's skill-derived value.
  >
  > Range: 0 to 45 (clamped; seconds).
  >
  > Default: derived from bot skill level.
  > Set by: server config (overrides skill-formula default).

---
