# B5 format-unify ledger -- batch 04

**Batch:** 04 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:s-t | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace refs + code variable names | to-shape: D20-template

### ktx:command:s-t

- canonical_id: `ktx:command:s-t`
- prior length: 1509 chars
- new length: 470 chars

- OLD description:
  > Sends a private chat message to a group of clients. Usage: s-t <group> <text> (requires the group and at least one text argument, else prints "usage: s-t team txt"). The group selector is: "player" = all players, "spectator" = all spectators, "admin" = all admins, otherwise the name of a team = every member of that team. The message goes to each matching client except yourself, shown as "[<yourname> <t:<group>>]: text", and is echoed back to you as "[<t:<group>>]: text". During a match a player and a spectator cannot exchange these messages (cross-side recipients are skipped). If no client matches the group it prints "s-t: no clients found for team <group>".

- NEW description:
  > Sends a private chat message to a named group of clients. Usage: s-t <group> <text>.
  >
  > Group selectors: "player" = all players, "spectator" = all spectators, "admin" = all admins, or a team name = every member of that team. The message is shown to matched clients as "[<yourname> <t:<group>>]: text" and echoed to you. During a live match, players and spectators cannot exchange these messages (cross-side recipients are skipped). If no clients match the group it prints "s-t: no clients found for team <group>".
  >
  > Set by: any in-game player or spectator.

---

B5-RESULT | ktx:command:cm | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace refs + code variable names | to-shape: D20-template

### ktx:command:cm

- canonical_id: `ktx:command:cm`
- prior length: 1172 chars
- new length: 393 chars

- OLD description:
  > Casts (or changes) a map vote by map list index. Takes one numeric argument: the position of a map in the server's map list; the command resolves that index to a map name and registers the caller's vote for it, broadcasting that the caller suggests / agrees on / would rather play that map and then re-tallying votes. Re-voting the same index reports the existing vote is still good. Refused if invoked too soon after map load (7s, or 15s in matchless mode), while a match is running (or, in matchless non-bloodfest mode, outside countdown), by non-admin spectators, when map voting is disabled (k_no_vote_map), or when the map is locked (k_lockmap) for non-admins.

- NEW description:
  > Casts (or changes) a map vote by map-list index. Takes one numeric argument: the position of a map in the server's map list. Broadcasts the suggestion and re-tallies votes; re-voting the same index confirms the existing vote is still good.
  >
  > Refused if: invoked within 7s of map load (15s in matchless mode), while a match is running outside of a countdown, by non-admin spectators, when map voting is disabled (k_no_vote_map), or when the map is locked (k_lockmap) for non-admins.
  >
  > Set by: any player or admin spectator.

---

B5-RESULT | ktx:command:1fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd jargon + source-line cites | to-shape: D20-template

### ktx:command:1fav_go

- canonical_id: `ktx:command:1fav_go`
- prior length: 793 chars
- new length: 372 chars

- OLD description:
  > Spectator-only command that switches your POV to the player saved in favourites slot 1. Slot 1 is filled by the matching `fav1_add` command, which must be run while you are tracking a player; running `fav1_add` while not tracking a player prints `fav add: you are not tracking player!` and stores nothing. If slot 1 is empty `1fav_go` prints `fav go: slot 1 is not defined`; if the stored player has since left it prints `fav go: slot 1 can't find player`; if you are already tracking that player it prints `fav go: already observing...`. On success it issues a `track <userid>` stuffcmd against your own spectator client so your POV follows the stored player.

- NEW description:
  > Spectator-only command. Switches your point of view to the player saved in favourites slot 1. Slot 1 is populated with the `fav1_add` command (run while tracking a player). If the slot is empty, prints "fav go: slot 1 is not defined". If the saved player has since disconnected, prints "fav go: slot 1 can't find player". If already tracking that player, prints "fav go: already observing...". On success, your POV follows the stored player.
  >
  > Set by: spectator command '1fav_go' (spectator-only).

---

B5-RESULT | ktx:command:setpathflag:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace details + enum embedded in prose | to-shape: D20-template

### ktx:command:setpathflag:frogbot:editor

- canonical_id: `ktx:command:setpathflag:frogbot:editor`
- prior length: 990 chars
- new length: 450 chars

- OLD description:
  > Frogbot waypoint-editor subcommand. Adds (bitwise-ORs) one or more traversal flags onto the path running from the previously saved marker to the routing marker nearest the editing player. The single argument is a letter string decoded as: w = waterjump, 6 = dm6 door, r = rocket jump, j = jump ledge, v = vertical platform, a = curl-jump angle hint (any other letter is ignored). Existing path flags are preserved; on success it prints the path's new combined flag set. Errors if no marker is nearby, if no path links the saved marker to it, if no flag argument is given, or if the argument decodes to no valid flags. Used while editing a map's bot navigation.

- NEW description:
  > Frogbot waypoint-editor subcommand. Adds one or more traversal flags onto the path from the previously saved marker to the nearest routing marker. The argument is a string of flag letters:
  >
  > w = waterjump, 6 = dm6 door, r = rocket jump, j = jump ledge, v = vertical platform, a = curl-jump angle hint.
  >
  > Existing flags are preserved; on success prints the path's updated flag set. Fails if no marker is nearby, no path links the two markers, no argument is given, or the argument decodes to no valid flags.
  >
  > Set by: frogbot editor (bot navigation editing only).

---

B5-RESULT | ktx:command:latejoin | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace cites + inline code references | to-shape: D20-template

### ktx:command:latejoin

- canonical_id: `ktx:command:latejoin`
- prior length: 1198 chars
- new length: 458 chars

- OLD description:
  > Lets a teamless player request to join a team mid-match. Only works while a game is in progress and only in Clan Arena or Wipeout (otherwise reports the requests are only allowed in CA or Wipeout); the player must not already be on a team. Usage: latejoin <team>, where <team> must be one of the two active team names. The request is rejected if an election is already running, if the player is still within the election cooldown, or if the chosen team already has more players than the other; otherwise it starts a 30-second election that members of the chosen team approve by typing yes (issuing latejoin again while one's own request is pending aborts it).

- NEW description:
  > Lets a teamless player request to join a team mid-match. Only works during a live Clan Arena or Wipeout game; the player must not already be on a team.
  >
  > Usage: latejoin <team> (team must be one of the two active team names).
  >
  > The request starts a 30-second election that the chosen team approves by typing /yes. Rejected if an election is already running, the player is in the election cooldown, or the chosen team already has more players. Issuing latejoin again while your own request is pending aborts it.
  >
  > Set by: any player (in-game command, CA/Wipeout only).

---

B5-RESULT | ktx:command:qizmo | FORMAT-UNIFIED | rev=1 | from-shape: prose with CF_PLAYER jargon + source-trace access-class details | to-shape: D20-template

### ktx:command:qizmo

- canonical_id: `ktx:command:qizmo`
- prior length: 980 chars
- new length: 270 chars

- OLD description:
  > Prints, to the calling player's console, a short help listing of the three QiZmo-proxy sub-commands and what each does: `qlag` (lag settings), `qenemy` (enemy vicinity reporting), and `qpoint` (point function). It only displays this list; it changes no settings itself. Runnable only by an in-game player (registered with `CF_PLAYER` alone -- a spectator hits `DO_WRONG_CLASS` at the dispatch class-gate). The three listed sub-commands are themselves dual-path commands runnable by any in-game player or by admin spectators (admin = rcon-set or elected via /elect); none of the three sub-command handlers carries an additional admin check on the player path.

- NEW description:
  > Prints a short help listing of the three QiZmo proxy sub-commands: qlag (lag settings), qenemy (enemy vicinity reporting), and qpoint (point function). Displays only; changes no settings. The three listed sub-commands themselves are usable by any in-game player or admin spectators.
  >
  > Set by: in-game player command (players only; spectators cannot invoke this command).

---

B5-RESULT | ktx:command:tot | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace references + per-cvar config dump | to-shape: D20-template

### ktx:command:tot

- canonical_id: `ktx:command:tot`
- prior length: 1289 chars
- new length: 425 chars

- OLD description:
  > Applies the Tribe of Tjernobyl (ToT) game-mode preset: a fireball-mode free-for-all variant. Sets deathmatch 4 (base mode -- DMM4) with permanent invincibility-on-respawn disabled (dmm4_invinc_time -1), enables ToT mode (k_tot_mode 1) and the fireball system (k_fb_enabled 1) with an 8x quad fireball multiplier (k_fb_quad_multiplier 8), disallows certain weapons (k_disallow_weapons 80), disables quad/ring drops (dq 0, dr 0) and berserk, caps the server at 9 players (maxclients/k_maxclients 9), no team-size or lock limits, no overtime, enables powerups, uses spawn type 1, and sets the internal game mode to k_mode 3. The shared common reset runs first.

- NEW description:
  > Applies the Tribe of Tjernobyl (ToT) game-mode preset: a fireball-mode free-for-all variant based on DMM4. Enables the fireball system with an 8x quad-fireball multiplier, disables invincibility-on-respawn, disallows certain weapons, caps the server at 9 players, no teams, no overtime, and enables powerups. The shared common reset runs first.
  >
  > Default: not active (preset command, applies on invocation).
  > Set by: server-side preset command 'tot' (resets all mode settings).

---

B5-RESULT | ktx:command:carena | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace references + per-cvar config dump | to-shape: D20-template

### ktx:command:carena

- canonical_id: `ktx:command:carena`
- prior length: 1339 chars
- new length: 430 chars

- OLD description:
  > Applies the Clan Arena game-mode preset (internal name 'ca'). Enables clan arena (k_clan_arena 1) with 9 rounds per series (k_clan_arena_rounds 9) and no respawns within a round (k_clan_arena_max_respawns 0), sets teamplay 4 and deathmatch 5 (base mode), no timelimit (timelimit 0, k_overtime 0), caps the server at 8 players (maxclients/k_maxclients 8), disables powerups (k_pow 0) and pack drops (dp 0), strips items off the map (k_noitems 1), uses safety spawns (k_spw 1), scores 1 frag per 100 damage dealt (k_dmgfrags 1), enables the team overlay, allows up to 2 teams, and sets the internal game mode to k_mode 2. The shared common reset runs first.

- NEW description:
  > Applies the Clan Arena game-mode preset. Sets up a 9-round CA series with no in-round respawns, teamplay 4, DMM5 base mode, no timelimit, 8-player cap, no powerups, no backpack drops, items stripped from the map, safety spawns, and damage-based frags (1 frag per 100 damage). Allows up to 2 teams. The shared common reset runs first.
  >
  > Default: not active (preset command, applies on invocation).
  > Set by: server-side preset command 'carena' (resets all mode settings).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_reduce | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-path jargon + source-line cites + bound() formula | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_vol_reduce

- canonical_id: `ktx:cvar:k_fbskill_vol_reduce`
- prior length: 867 chars
- new length: 314 chars

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. The bot's aim error is scaled by a running per-target 'volatility' scalar; this cvar is the multiplicative per-frame decay factor applied to that scalar (volatility *= reduce_volatility) in the continuing-target path -- it is applied twice per frame there: once before the per-factor increments and again inside the final min/max clamp. Values below 1.0 shrink volatility back toward the floor each frame. The bot reads it clamped to bound(0, value, 1.0) into self->fb.skill.reduce_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI tuning cvar. Sets the per-frame decay factor for the bot's aim-volatility scalar. Each frame, aim volatility is multiplied by this value; values below 1.0 shrink it toward the floor, reducing aim randomness over time on a held target.
  >
  > Range: 0.0 to 1.0 (clamped).
  >
  > Default: derived from bot skill level (server-managed).
  > Set by: server config (overrides the skill-derived value).

---

B5-RESULT | ktx:cvar:k_fbskill_visibility | FORMAT-UNIFIED | rev=1 | from-shape: prose with DotProduct formula + code-path jargon + source-line cites | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_visibility

- canonical_id: `ktx:cvar:k_fbskill_visibility`
- prior length: 887 chars
- new length: 341 chars

- OLD description:
  > Frogbot AI tuning cvar. Sets the minimum forward dot-product (cosine of half the bot's effective field of view) used by the bot's in-front visibility test: after a clear traceline to a damageable target, the bot only registers that target as visible when DotProduct(view-forward, direction-to-target) is at least this value, so larger values narrow the bot's awareness cone and smaller values widen it. Read into self->fb.skill.visibility clamped with bound(0.5, value, 0.7071067) (0.7071067 ~= cos(45) = a 90-degree fov cone, 0.5 ~= a 120-degree fov cone). Consumed only by Visible_infront(); the unconditional Visible_360() path bypasses it.

- NEW description:
  > Frogbot AI tuning cvar. Controls the width of the bot's forward awareness cone for detecting targets: larger values narrow the cone (bot requires a target to be more directly in front to register it as visible); smaller values widen it. Values range from ~120-degree cone (0.5) to ~90-degree cone (0.707).
  >
  > Range: 0.5 to 0.7071 (clamped; ~120° to ~90° awareness cone).
  >
  > Default: derived from bot skill level (server-managed).
  > Set by: server config (overrides the skill-derived value).

---

B5-RESULT | ktx:cvar:k_fbskill_vol_oppvel | FORMAT-UNIFIED | rev=1 | from-shape: prose with velocity-formula jargon + source-line cites + axis/variable names | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_vol_oppvel

- canonical_id: `ktx:cvar:k_fbskill_vol_oppvel`
- prior length: 883 chars
- new length: 342 chars

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is a horizontal SPEED threshold (units: Quake velocity units per second; HorizontalVelocityCheck compares vx*vx+vy*vy against threshold*threshold) for the OPPONENT's velocity: when the bot's current target moves faster than this, aim volatility is increased by the separate k_fbskill_vol_oppvel_incr amount. This cvar only sets the enemy-speed trigger, not the volatility increment. The bot reads it clamped to bound(0, value, 1000) into self->fb.skill.enemyspeed_volatility_threshold. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI tuning cvar. Sets the enemy horizontal speed threshold (in Quake velocity units per second) above which the bot's aim volatility increases. When the bot's current target moves faster than this value, volatility is raised by the amount in k_fbskill_vol_oppvel_incr. This cvar is the trigger threshold only, not the increment amount.
  >
  > Range: 0 to 1000 (clamped; Quake velocity units/sec).
  >
  > Default: derived from bot skill level (server-managed).
  > Set by: server config (overrides the skill-derived value).

---

B5-RESULT | ktx:command:10fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd jargon + source-line cites | to-shape: D20-template

### ktx:command:10fav_go

- canonical_id: `ktx:command:10fav_go`
- prior length: 699 chars
- new length: 348 chars

- OLD description:
  > Spectator-only command that switches your point of view to the player saved in favourite slot 10. Slots are populated beforehand with the corresponding Nfav_add command (which stores the player you are currently tracking). If slot 10 has not been set, it prints "fav go: slot 10 is not defined" and does nothing; if the saved player is no longer connected, it prints "fav go: slot 10 can't find player" and does nothing; if you are already observing that player it reports "already observing...". Otherwise it tracks that player. One command exists per favourite slot (1fav_go through 20fav_go), differing only in which slot is recalled.

- NEW description:
  > Spectator-only command. Switches your point of view to the player saved in favourites slot 10. Slot 10 is populated with the `fav10_add` command (run while tracking a player). If the slot is empty, prints "fav go: slot 10 is not defined". If the saved player has since disconnected, prints "fav go: slot 10 can't find player". If already tracking that player, prints "fav go: already observing...". One command exists per slot (1fav_go through 20fav_go).
  >
  > Set by: spectator command '10fav_go' (spectator-only).

---

B5-RESULT | ktx:cvar:k_freshteams_limit_sweep_ammo | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-trace cites + source-line refs + per-weapon details | to-shape: D20-template boolean variant

### ktx:cvar:k_freshteams_limit_sweep_ammo

- canonical_id: `ktx:cvar:k_freshteams_limit_sweep_ammo`
- prior length: 952 chars
- new length: 416 chars

- OLD description:
  > Fresh Teams (dmm1) only: when enabled (1) and k_freshteams is active, picking up a weapon you already carry grants only the small configured 'sweep' ammo amount for that weapon (k_freshteams_sweep_ng_ammo / _ssg_ammo / _sng_ammo / _gl_ammo / _rl_ammo / _lg_ammo) instead of the standard full ammo bundle that a fresh weapon pickup gives. 0 = re-picking a weapon you already own awards the normal full ammo amount (e.g. 30 nails, 5 rockets, 15 cells); 1 = re-picking awards only the reduced per-weapon sweep amount. Picking up a weapon you do not yet own always gives the full amount regardless. Has no effect unless k_freshteams is set.

- NEW description:
  > Fresh Teams (dmm1) only: controls whether picking up a weapon you already carry gives reduced 'sweep' ammo instead of the full amount. Has no effect unless k_freshteams is active. Picking up a weapon you do not yet own always gives the full ammo regardless.
  >
  > 0 = re-picking an owned weapon gives the standard full ammo (e.g. 30 nails, 5 rockets, 15 cells).
  > 1 = re-picking an owned weapon gives only the configured sweep amount (set per-weapon via the k_freshteams_sweep_*_ammo cvars).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:setmarkerflag:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace details + enum embedded in prose | to-shape: D20-template

### ktx:command:setmarkerflag:frogbot:editor

- canonical_id: `ktx:command:setmarkerflag:frogbot:editor`
- prior length: 1007 chars
- new length: 451 chars

- OLD description:
  > Frogbot waypoint-editor subcommand. Adds (bitwise-ORs) one or more behavior flags onto the routing marker nearest the editing player. The single argument is a letter string decoded as: u = unreachable, 6 = dm6 door, f = fire on match start, b = blocked when door is at top, t = door touchable, e = escape route, n = no-touch (any other letter is ignored). Existing flags are preserved; on success it prints the marker's new combined flag set. Errors if no marker is nearby, if no flag argument is given, or if the argument decodes to no valid flags. Used while editing a map's bot navigation; does not change live gameplay by itself.

- NEW description:
  > Frogbot waypoint-editor subcommand. Adds one or more behavior flags onto the routing marker nearest the editing player. The argument is a string of flag letters:
  >
  > u = unreachable, 6 = dm6 door, f = fire on match start, b = blocked when door is at top, t = door touchable, e = escape route, n = no-touch.
  >
  > Existing flags are preserved; on success prints the marker's updated flag set. Fails if no marker is nearby, no flag argument is given, or the argument decodes to no valid flags.
  >
  > Set by: frogbot editor (bot navigation editing only; does not affect live gameplay).

---

B5-RESULT | ktx:command:voteprivate | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace cites + code variable names | to-shape: D20-template

### ktx:command:voteprivate

- canonical_id: `ktx:command:voteprivate`
- prior length: 1180 chars
- new length: 436 chars

- OLD description:
  > Casts (or withdraws) the calling player's vote to toggle private-game mode, broadcasting the vote and the remaining count needed. Available only when the server marks private game as voteable; refused while a match is in progress (it just reports the current private-game state instead), and a non-admin must be logged in to vote it on and needs at least two non-bot players present. When the threshold is met the server enables/disables private game (gating connections via sv_login: players-only or everyone depending on k_privategame_allow_specs). An admin's single vote can switch it directly. Player-only command, no arguments.

- NEW description:
  > Casts (or withdraws) your vote to toggle private-game mode. Broadcasts your vote and the remaining count needed. When the threshold is reached the server enables or disables private game, restricting connections based on the k_privategame_allow_specs setting. An admin's single vote can switch it directly.
  >
  > Refused if: private game is not voteable on this server, a match is in progress, you are not logged in (required to vote it on), or fewer than two non-bot players are present.
  >
  > Set by: any player (in-game command; voteable server required).

---

B5-RESULT | ktx:command:hoonymode | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace references + per-cvar config dump | to-shape: D20-template

### ktx:command:hoonymode

- canonical_id: `ktx:command:hoonymode`
- prior length: 1138 chars
- new length: 410 chars

- OLD description:
  > Applies the HoonyMode game-mode preset: a 1-versus-1 duel variant played as a series of spawn-toggled rounds rather than a single timed game. Sets it to 2 players (maxclients/k_maxclients 2), enables hoonymode (k_hoonymode 1) with 12 rounds (k_hoonyrounds 12), uses fraglimit 1 so spawns toggle after every frag, sets timelimit 0 (round-based, not timed), teamplay 0 and deathmatch 3 (base mode -- weapons stay), disables powerups (k_pow 0), and sets the internal game mode to k_mode 1. The shared common reset runs first. (This preset is also auto-selected and other UserMode commands are blocked when the map is hoonymode-only.)

- NEW description:
  > Applies the HoonyMode game-mode preset: a 1-versus-1 duel variant played as spawn-toggled rounds instead of a single timed match. Sets 2-player cap, 12 rounds, fraglimit 1 (spawns toggle after every frag), no timelimit, DMM3 base mode (weapons stay on death), no powerups. The shared common reset runs first. On hoonymode-only maps this preset is auto-applied and other mode-change commands are blocked.
  >
  > Default: not active (preset command, applies on invocation).
  > Set by: server-side preset command 'hoonymode' (resets all mode settings).

---

B5-RESULT | ktx:cvar:k_fbskill_aim_pitch_scale | FORMAT-UNIFIED | rev=1 | from-shape: prose with bound() formula + axis-variable names + source-line cites | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_pitch_scale

- canonical_id: `ktx:cvar:k_fbskill_aim_pitch_scale`
- prior length: 883 chars
- new length: 366 chars

- OLD description:
  > Frogbot AI tuning cvar setting the vertical (pitch) aim-error growth factor. In the per-frame aim-randomization step the pitch error is computed as bound(pitch.minimum, fabs(raw_pitch_diff) * pitch.scale, pitch.maximum), so this value multiplies the raw angular difference between the bot's current and desired pitch before clamping -- it controls how steeply the bot's vertical aim error grows the further off-target it currently is. Read back per bot clamped to bound(0, value, 5) into self->fb.skill.aim_params[PITCH].scale. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning cvar. Sets the vertical (pitch) aim-error growth factor: each frame, the bot's pitch aim error scales with the angular distance from the target multiplied by this value before clamping. Larger values make the bot's vertical aim less accurate the further off-target it is. Counterpart to the horizontal yaw scale.
  >
  > Range: 0.0 to 5.0 (clamped).
  >
  > Default: derived from bot skill level (server-managed).
  > Set by: server config (overrides the skill-derived value).

---

B5-RESULT | ktx:command:11fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose with corrected-populator note + source-line cites | to-shape: D20-template

### ktx:command:11fav_go

- canonical_id: `ktx:command:11fav_go`
- prior length: 896 chars
- new length: 395 chars

- OLD description:
  > Spectator-only command. Switches the spectator's tracked view to the player stored in personal favourites slot 11 (the slot is fixed for this command, not an argument). The matching slot-11 populator is fav11_add; the generic fav_add command does NOT fill this slot -- it writes a separate favourites array consumed by fav_next. If slot 11 is empty it prints "fav go: slot 11 is not defined"; if the saved player is no longer present it prints "fav go: slot 11 can't find player"; if already spectating that player it prints "fav go: already observing...". One of a fixed family 1fav_go..20fav_go, one command per favourite slot.

- NEW description:
  > Spectator-only command. Switches your point of view to the player saved in favourites slot 11. Slot 11 is populated with `fav11_add` (run while tracking a player). Note: the generic `fav_add` command does NOT fill this slot -- it writes a separate array used by `fav_next`. If the slot is empty, prints "fav go: slot 11 is not defined". If the saved player has since disconnected, prints "fav go: slot 11 can't find player". If already tracking that player, prints "fav go: already observing...". One of a fixed family 1fav_go..20fav_go.
  >
  > Set by: spectator command '11fav_go' (spectator-only).

---

B5-RESULT | ktx:command:dlist | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd jargon + STUFFCMD_IGNOREINDEMO explanation | to-shape: D20-template

### ktx:command:dlist

- canonical_id: `ktx:command:dlist`
- prior length: 685 chars
- new length: 195 chars

- OLD description:
  > Lists the demos available on the server by forwarding a `cmd demolist` request (with any arguments passed through) to the underlying MVDSV server, which returns the demo listing server-side. The stuffed command is flagged STUFFCMD_IGNOREINDEMO, which means MVDSV omits this relayed `cmd demolist` from any MVD recording in progress for the issuer's session (housekeeping that would clutter the demo without informational value). The flag is recording-stream exclusion, not playback-time suppression -- the handler has no `is_playback` / `mv_is_playback()` guard, so issuing `dlist` is not blocked when the user is viewing a demo.

- NEW description:
  > Lists the demos available on the server. Forwards the request to the MVDSV server with any arguments passed through, returning the demo listing to the caller's console.
  >
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:dropquad | FORMAT-UNIFIED | rev=1 | from-shape: prose with source-trace cites + code variable names | to-shape: D20-template

### ktx:command:dropquad

- canonical_id: `ktx:command:dropquad`
- prior length: 1148 chars
- new length: 376 chars

- OLD description:
  > Toggle for the `dq` rule, which controls whether a player carrying Quad Damage drops it as a pickup-able item when killed during a live match; the dropped Quad keeps its remaining duration. Each invocation flips `dq` between 0 and 1 and broadcasts "<player> enables/disables DropQuad" to all clients. Runnable by any in-game player and by spectators who hold admin status (rcon-set or elected); refused while a match is in progress, so it is set during warmup. The drop additionally requires the mode's Quad powerup to be enabled (`k_pow_q`) and the match to be live; when `dq` is 0 the Quad is lost on death rather than dropped.

- NEW description:
  > Toggles the 'dq' setting, which controls whether players drop their Quad Damage on death during a live match. Each invocation flips dq between 0 and 1 and broadcasts the new state to all clients. The Quad drop also requires the mode's Quad powerup to be enabled (k_pow_q).
  >
  > 0 = Quad is lost on death (not dropped).
  > 1 = Quad drops on death with remaining duration preserved.
  >
  > Default: depends on active mode preset.
  > Set by: admin command 'dropquad' in-game (refused while a match is in progress).

---
