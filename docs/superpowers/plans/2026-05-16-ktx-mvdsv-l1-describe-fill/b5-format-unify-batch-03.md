# B5 format-unify ledger -- batch 03

**Batch:** 03 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:10on10 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:10on10

- canonical_id: `ktx:command:10on10`
- prior length: 1090
- new length: 399

- OLD description:
  > Switches the server to the built-in 10-on-10 ruleset preset. Applies a fixed configuration for two teams of up to ten players: maxclients/k_maxclients 20 (20-player slot cap), timelimit 20 (20-minute rounds), teamplay 2 (self and teammate damage enabled), deathmatch 1 (weapons do not stay on pickup), powerups enabled (k_pow 1), minimum 5 players per team (k_membercount 5), 1-2 teams allowed (k_lockmin 1 / k_lockmax 2), and time-based overtime of 5 minutes (k_overtime 1 / k_exttime 5). Accepts an optional match-tag argument. Usable by a player, an admin spectator, or the server; the server also selects this preset automatically as the high-player-count fallback for auto-XonX.

- NEW description:
  > Applies the built-in 10-on-10 match preset. Sets maxclients 20, timelimit 20 minutes, teamplay 2 (self and teammate damage), deathmatch 1 (weapons do not stay), powerups on, 5 players minimum per team, 1-2 teams, and 5-minute overtime. Accepts an optional match-tag argument.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player, admin spectator, or server (also auto-selected as the high-player-count fallback when k_auto_xonx is active).

---

B5-RESULT | ktx:command:18fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:18fav_go

- canonical_id: `ktx:command:18fav_go`
- prior length: 1071
- new length: 392

- OLD description:
  > Spectator command (CF_SPECTATOR): switches your spectated point of view to the player stored in slot 18 of the slot-based favourites array (self->favx[], distinct from the non-slot favourites list used by fav_add / fav_next). Slot 18 is populated by fav18_add (which captures whoever you are currently observing into favx[17]); this is the slot-18 form of the Nfav_go family (1fav_go..20fav_go). On success it issues an internal 'track <userid>' to follow that player. If slot 18 is empty, the saved player is no longer a connected player, or you are already observing them, it does nothing except print a 'fav go: ...' status message. Takes no arguments (the slot number is fixed by the command name).

- NEW description:
  > Spectator command. Switches your spectated view to the player saved in slot 18 of your numbered favourites (populated by fav18_add). Part of the 1fav_go..20fav_go family -- each slot-number command tracks the player stored in that slot.
  >
  > If slot 18 is empty, the saved player has disconnected, or you are already watching them, it prints a status message and does nothing.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:2on2 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:2on2

- canonical_id: `ktx:command:2on2`
- prior length: 1177
- new length: 418

- OLD description:
  > Switches the server to the built-in 2on2 match preset and applies its settings: 4 max players (maxclients/k_maxclients 4), a 10-minute round timelimit with time-based 3-minute overtime (k_overtime 1, k_exttime 3), teamplay 2 (teammates and self take damage), deathmatch 3 (weapons stay on pickup), powerups enabled (k_pow 1), and exactly 2 teams (k_lockmin 1, k_lockmax 2, k_membercount 1). After applying the preset it also execs any configs/usermodes/2on2/ override configs and the per-map usermode configs. Restricted to players and spectator-admins (CF_PLAYER | CF_SPC_ADMIN) and is subject to k_free_mode access control and k_allowed_free_modes gating; accepts an optional matchtag argument.

- NEW description:
  > Applies the built-in 2on2 match preset. Sets maxclients 4, timelimit 10 minutes, teamplay 2 (self and teammate damage), deathmatch 3 (weapons stay on pickup), powerups on, 1 player minimum per team, 1-2 teams, and 3-minute overtime. Accepts an optional match-tag argument.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or admin spectator (subject to k_free_mode access control and k_allowed_free_modes gating).

---

B5-RESULT | ktx:command:3on3 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:3on3

- canonical_id: `ktx:command:3on3`
- prior length: 1406
- new length: 440

- OLD description:
  > Switches the server to the 3on3 (3v3) game mode: applies a preset that sets maxclients and k_maxclients to 6, timelimit to 15 minutes, teamplay 2 (teammates and self take damage), deathmatch 1 (weapons do not stay on pickup), powerups enabled (k_pow 1), minimum 2 players per team (k_membercount 2), 1-2 teams allowed (k_lockmin 1, k_lockmax 2), and time-based overtime of 5 minutes (k_overtime 1, k_exttime 5). Usable by a player, by spectating admins, and by the server; players can append a match tag as a parameter. The mode switch is rejected on hoonymode-only maps, while k_auto_xonx is set, when not permitted by k_free_mode access control, or when the mode is not enabled by k_allowed_free_modes.

- NEW description:
  > Applies the built-in 3on3 (3v3) match preset. Sets maxclients 6, timelimit 15 minutes, teamplay 2 (self and teammate damage), deathmatch 1 (weapons do not stay), powerups on, 2 players minimum per team, 1-2 teams, and 5-minute overtime. Accepts an optional match-tag argument.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or admin spectator (rejected on hoonymode-only maps, while k_auto_xonx is set, or when blocked by k_free_mode / k_allowed_free_modes).

---

B5-RESULT | ktx:command:admin | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:admin

- canonical_id: `ktx:command:admin`
- prior length: 1170
- new length: 468

- OLD description:
  > Manages the issuing client's admin status. With no argument: if already admin, relinquishes admin; if an admin-code entry is in progress, cancels it; otherwise begins admin-code entry (enter the code via the number / impulse commands), or grants admin immediately for a VIP flagged as admin. With one argument: treats it as the admin password (k_admincode) and grants admin if it matches, with a brief anti-brute-force delay (5 seconds) between attempts. Refuses if no admins are configured on the server (k_admins is unset), or while the issuing client is themselves currently the subject of a pending admin election (a third party's pending admin election does not block the caller's /admin -- the guard is SELF-scoped).

- NEW description:
  > Claims or relinquishes admin status on the server using the admin password (k_admincode) or a VIP auto-grant.
  >
  > With no argument: if already admin, relinquishes admin; if a code-entry is in progress, cancels it; otherwise starts admin-code entry (use number/impulse commands to enter the code). VIPs flagged as admin are granted immediately.
  > With one argument: treated as the admin password; grants admin on match, with a 5-second anti-brute-force delay between failed attempts.
  >
  > Refused if k_admins is 0, or while the caller is currently the subject of a pending admin election.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:auto_pow | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:auto_pow

- canonical_id: `ktx:command:auto_pow`
- prior length: 797
- new length: 387

- OLD description:
  > Spectator command that toggles automatic powerup tracking: with it on, the spectator's view automatically follows whichever live player currently scores highest by powerup weighting (pentagram > quad > ring, plus the player's frags). Issuing it again, or while it is already this mode, turns autotrack off. Affects only the issuing spectator; the chosen tracking mode is stored in the *at userinfo so it is restored after a level change. Spectator-only (CF_SPECTATOR | CF_MATCHLESS at the registration row); no match-state gate on the handler -- it is dispatchable both during a live match and in matchless mode (CF_MATCHLESS is the additive "also valid in matchless mode" permission, not a match-block).

- NEW description:
  > Spectator command. Toggles automatic powerup tracking: when on, your view follows whichever player currently holds the highest-weighted powerup (pentagram > quad > ring, tiebroken by frags). Issuing again turns autotrack off.
  >
  > Tracking mode is saved in userinfo and restored after a level change. Usable both during a live match and in matchless mode.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:cmdslist_dl | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:cmdslist_dl

- canonical_id: `ktx:command:cmdslist_dl`
- prior length: 962
- new length: 385

- OLD description:
  > Internal client-bootstrap command (server-to-client; callable only via /cmd cmdslist_dl, not aliasable, and hidden from the commands listing). On request it stuffs the client a batch of 'alias <name> cmd NNN' definitions -- one alias per registered KTX command -- so the engine's commands become usable as plain client aliases, then re-invokes itself to fetch the next batch until the whole list is sent, finally printing 'Commands loaded'. Skips commands not valid for the caller's class, commands with no handler, and CF_NOALIAS commands. Reports 'cmdslist alredy stuffed' if the list was already delivered and 'cmdslist without arguments' if called with no batch-offset argument.

- NEW description:
  > Internal client-bootstrap command. Not aliasable and hidden from the commands listing. Sends the client a batch of command aliases (one per registered KTX command) so they become usable as plain client aliases; re-invokes itself in batches until the full list is transferred, then prints 'Commands loaded'.
  >
  > Skips commands not valid for the caller's class, commands with no handler, and non-aliasable commands. Reports 'cmdslist alredy stuffed' if already delivered.
  >
  > Default: n/a (command, not a cvar).
  > Set by: server (part of the client connection/handshake flow; triggered automatically on connect).

---

B5-RESULT | ktx:command:dinfo | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:dinfo

- canonical_id: `ktx:command:dinfo`
- prior length: 879
- new length: 277

- OLD description:
  > Requests demo information from the server for the current or specified demo by forwarding a `cmd demoinfo` request (with any arguments passed through) to the underlying MVDSV server, which produces the response server-side. The stuffed command is flagged STUFFCMD_IGNOREINDEMO, which means MVDSV omits this relayed `cmd demoinfo` from any MVD recording in progress for the issuer's session (it is housekeeping that would clutter the demo stream without informational value). The flag is recording-stream exclusion, not playback-time suppression -- the handler has no `is_playback` / `mv_is_playback()` guard, so issuing `dinfo` is not blocked when the user is viewing a demo.

- NEW description:
  > Requests demo information from the server for the current or a specified demo, passing any arguments through to the server-side `demoinfo` handler. The request is excluded from any ongoing MVD recording (housekeeping that would clutter the demo stream).
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:fav_next | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:fav_next

- canonical_id: `ktx:command:fav_next`
- prior length: 929
- new length: 413

- OLD description:
  > Spectator command (rejected when invoked by a player). Advances the spectator's tracked target through the personal generic favourites list (the list managed by fav_add / fav_del / fav_all_del, distinct from the per-slot fav1_add..fav20_add / 1fav_go..20fav_go array): if the spectator is currently tracking a player who is on that list, switches to the next favourite after them; otherwise jumps to the first favourite on the list. Issues an "empty" error and does nothing when the favourites list holds no entries, and reports "already observing..." without re-issuing the track when the chosen favourite is already the current target; otherwise stuffs a "track <userid>" to the spectator.

- NEW description:
  > Spectator command. Cycles your spectated view through your personal favourites list (managed by fav_add / fav_del / fav_all_del -- distinct from the numbered per-slot fav1_add..fav20_add / 1fav_go..20fav_go array).
  >
  > If currently tracking a player on the list, advances to the next favourite; otherwise jumps to the first. Reports "empty" if the list has no entries, or "already observing..." if the next favourite is already your current target.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:ffa | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:ffa

- canonical_id: `ktx:command:ffa`
- prior length: 961
- new length: 441

- OLD description:
  > Applies the FFA (free-for-all) game-mode preset: a non-team deathmatch with no fixed roster size. Sets teamplay 0 (no teammates, self-damage applies), deathmatch 3 (base mode -- weapons stay on pickup), caps the server at 26 players (maxclients/k_maxclients 26), runs a 20-minute timelimit with time-based 5-minute overtime, enables powerups with quad and ring dropping on death (dq 1, dr 1), disables the team-size/lock constraints (k_membercount/k_lockmin/k_lockmax 0), disables berserk mode, and sets the internal game mode to k_mode 3. The shared common reset runs first. (Note: in matchless mode with k_use_matchless_dir set, the dispatcher loads the matchless config directory instead of the ffa one.)

- NEW description:
  > Applies the FFA (free-for-all) game-mode preset: non-team deathmatch with no fixed roster size. Sets maxclients 26, timelimit 20 minutes, teamplay 0 (self-damage, no teammates), deathmatch 3 (weapons stay on pickup), powerups on, quad and ring drop on death (dq 1, dr 1), no team-size or lock constraints, berserk off, and 5-minute overtime.
  >
  > When invoked in matchless mode with k_use_matchless_dir set, the matchless config directory is loaded instead of the ffa one.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or admin spectator.

---

B5-RESULT | ktx:command:info | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:info

- canonical_id: `ktx:command:info`
- prior length: 933
- new length: 380

- OLD description:
  > KTPRO-compatibility alias of `kinfo`; both command names dispatch the same `cmdinfo` handler. Userinfo helper for the issuing client. With no arguments (or more than three) it stuffs `cmd setinfo` back to the client, which the client interprets by listing its settable userinfo keys. With one key argument it prints that userinfo key's current value as `key <k> = "<v>"`. With a key and a value it forwards the (key, value) pair to the engine via `trap_SetUserInfo` to update the client's own userinfo; empty-value handling (whether an empty value clears the key) is what the engine's userinfo trap implements -- KTX makes the call unconditionally and does not branch on the value contents.

- NEW description:
  > KTPRO-compatibility alias of kinfo. Inspects or sets the calling client's own userinfo keys.
  >
  > With no arguments (or more than two): lists the client's settable userinfo keys.
  > With one argument: prints the value of that key as `key <k> = "<v>"`.
  > With two arguments: sets the key to the given value.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:instagib_coilgun_kickback | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:instagib_coilgun_kickback

- canonical_id: `ktx:command:instagib_coilgun_kickback`
- prior length: 1037
- new length: 456

- OLD description:
  > Toggles the self-knockback (recoil) on the Instagib coilgun by flipping the k_cg_kb cvar. When on, each coilgun shot also spawns an invisible "kickback" projectile that pushes the shooter, enabling coilgun-jumping; when off, the coilgun imparts no recoil. Requires Instagib to be active (k_instagib non-zero) or it is refused with "cg_kb requires Instagib". Player command (CF_PLAYER) that also accepts admin spectators via CF_SPC_ADMIN (after Init_cmds promotion to CF_SPECTATOR); non-admin spectators are refused with "You are not an admin". Ignored while a match is in progress. Each toggle broadcasts "<netname> enables Coilgun kickback" or "<netname> disables Coilgun kickback" to all players.

- NEW description:
  > Toggles self-knockback (recoil) on the Instagib coilgun (flips k_cg_kb). When on, each shot pushes the shooter backward, enabling coilgun-jumping. When off, the coilgun imparts no recoil. Broadcasts the change to all players.
  >
  > Requires Instagib to be active (k_instagib non-zero); refused with "cg_kb requires Instagib" otherwise. Ignored while a match is in progress.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or admin spectator (non-admin spectators are refused with "You are not an admin").

---

B5-RESULT | ktx:command:kinfo | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:kinfo

- canonical_id: `ktx:command:kinfo`
- prior length: 906
- new length: 360

- OLD description:
  > Inspects or sets the calling client's own mod-side userinfo keys. With no arguments (or more than two) it stuffs `cmd setinfo` back to the client, which the client interprets by listing its setinfo keys. With one argument it prints the value of that single userinfo key as `key <k> = "<v>"`. With two arguments it forwards the (key, value) pair to the engine via `trap_SetUserInfo` to update the client's own userinfo; empty-value handling (whether an empty value clears the key) is what the engine's userinfo trap implements -- KTX makes the call unconditionally and does not branch on the value contents. Available to players and spectators, usable outside a match.

- NEW description:
  > Inspects or sets the calling client's own userinfo keys.
  >
  > With no arguments (or more than two): lists the client's settable userinfo keys.
  > With one argument: prints the value of that key as `key <k> = "<v>"`.
  > With two arguments: sets the key to the given value.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or spectator (usable outside a match).

---

B5-RESULT | ktx:command:lgcmode | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:lgcmode

- canonical_id: `ktx:command:lgcmode`
- prior length: 1106
- new length: 481

- OLD description:
  > Toggles LGC game mode on or off and broadcasts the change as "<player> enables/disables LGC mode" via `cvar_toggle_msg`. Only allowed when a rules change is permitted (`is_rules_change_allowed()`); enabling additionally requires deathmatch mode 4 to be set first (`!k_lgc && deathmatch != 4` -> refuses to the caller with "LGC mode requires dmm4"). Every successful invocation -- regardless of on-or-off direction -- clears `k_midair`, `k_instagib`, and `k_dmgfrags` if any are currently set, and resets the caller's handicap to off (`SetHandicap(self, 100)`); these side-effects are NOT conditional on the on-transition and run on the off-transition too. Mode state is held in the `k_lgcmode` server cvar.

- NEW description:
  > Toggles LGC (Lightning Gun Challenge) game mode on or off. Broadcasts the change as "<player> enables/disables LGC mode". Mode state is stored in k_lgcmode.
  >
  > Enabling requires deathmatch 4 to already be active; refused with "LGC mode requires dmm4" otherwise. Only allowed when a rules change is permitted.
  >
  > On every successful toggle (both on and off): clears k_midair, k_instagib, and k_dmgfrags if set, and resets the caller's handicap to off.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or admin spectator (subject to rules-change permission).

---

B5-RESULT | ktx:command:mapslist_dl | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:mapslist_dl

- canonical_id: `ktx:command:mapslist_dl`
- prior length: 1072
- new length: 381

- OLD description:
  > Client-to-server protocol helper that transfers the server's map list to the requesting client as 'votemap' shortcut aliases (sent in batches via the ktx_am8 / ktx_am4 / single 'alias' stuff commands, or as 'cmd cm <n>' aliases for non-param clients). It takes a numeric start offset and re-requests itself ('cmd mapslist_dl <i>') until the whole list is sent ('Maps loaded'), then triggers the command-list transfer. It is idempotent per client (refuses with 'mapslist already stuffed' once the STUFF_MAPS flag is set) and is skipped entirely when the client's 'nomaps' userinfo is greater than 0. Not an operator-facing setting; it is part of the client connection/handshake flow.

- NEW description:
  > Internal client-bootstrap command. Transfers the server's map list to the connecting client as 'votemap' shortcut aliases, sent in batches until the full list is delivered ('Maps loaded'), then triggers the command-list transfer.
  >
  > Skipped if the client's 'nomaps' userinfo is set. Refuses with 'mapslist already stuffed' if already delivered. Not an operator-facing setting; part of the client connection flow.
  >
  > Default: n/a (command, not a cvar).
  > Set by: server (triggered automatically on connect).

---

B5-RESULT | ktx:command:report | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:report

- canonical_id: `ktx:command:report`
- prior length: 1190
- new length: 406

- OLD description:
  > Sends a teamplay status report about the calling player to every player on the caller's own team (including the caller themselves, and including dead teammates who are still in the player slot waiting to respawn -- the recipient loop selects every ctPlayer with no alive/health filter): armor type and value (or "a:0" if none), current health, the active weapon and its ammo count, and red-text markers for held Ring of Shadows ("eyes"), Pentagram ("666"), and Quad ("quad"). Enemies (players on a different team) are filtered out and do not receive it. If the caller has set a teamplay nickname (`k_nick` or `k` userinfo key), the report is prefixed with that nickname instead of their name.

- NEW description:
  > Broadcasts a status report to every player on the caller's own team (including the caller and dead teammates awaiting respawn). Report includes armor type and value (or "a:0" if none), current health, active weapon and ammo count, and markers for held Ring of Shadows ("eyes"), Pentagram ("666"), and Quad ("quad").
  >
  > If a teamplay nickname is set (k_nick or k userinfo key), it prefixes the report instead of the player name.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player.

---

B5-RESULT | ktx:command:setzone:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:setzone:frogbot:editor

- canonical_id: `ktx:command:setzone:frogbot:editor`
- prior length: 962
- new length: 410

- OLD description:
  > Frogbot waypoint-editor subcommand. Assigns a zone number to a routing marker. With marker number and zone arguments (argc >= 4) it sets the given marker to the given zone, both clamped to valid ranges (zone 1..NUMBER_ZONES). With no marker argument it operates on the marker nearest the editing player: with no zone argument it advances that marker to the next zone (wrapping back to 1 past the maximum), or with one numeric argument it sets that explicit zone (clamped). Prints the marker's resulting zone, or an error if the targeted/nearest marker is not found. Used while editing a map's bot navigation; markers in the same zone are treated as a navigation region by the bots.

- NEW description:
  > Frogbot waypoint-editor command. Assigns a zone number to a routing marker (markers in the same zone form a navigation region for the bots).
  >
  > With a marker number and zone argument: sets that specific marker to the given zone (zone clamped to valid range).
  > With no marker argument: operates on the nearest marker -- cycles it to the next zone (wrapping), or sets it to an explicit zone if a numeric argument is given.
  >
  > Prints the resulting zone, or an error if no marker is found.
  >
  > Default: n/a (command, not a cvar).
  > Set by: frogbot waypoint editor.

---

B5-RESULT | ktx:command:wipeout | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:command:wipeout

- canonical_id: `ktx:command:wipeout`
- prior length: 1045
- new length: 446

- OLD description:
  > Applies the Wipeout game-mode preset: a Clan-Arena variant with a fixed number of respawns per round. Enables wipeout (k_clan_arena 2) with 9 rounds per series (k_clan_arena_rounds 9) and 4 respawns per round (k_clan_arena_max_respawns 4), sets teamplay 4 and deathmatch 5 (base mode), no timelimit (timelimit 0, k_overtime 0), caps the server at 8 players (maxclients/k_maxclients 8), disables powerups (k_pow 0) and pack drops (dp 0), strips items off the map (k_noitems 1), uses safety spawns (k_spw 1), scores 1 frag per 100 damage dealt (k_dmgfrags 1), enables the team overlay, allows 1-2 teams, and sets the internal game mode to k_mode 2. The shared common reset runs first.

- NEW description:
  > Applies the Wipeout game-mode preset: a Clan-Arena variant with a fixed number of respawns per round. Sets k_clan_arena 2 (wipeout), 9 rounds per series, 4 respawns per round, teamplay 4, deathmatch 5, no timelimit, maxclients 8, powerups off, no item drops, safety spawns on, 1 frag per 100 damage (k_dmgfrags 1), team overlay on, and 1-2 teams.
  >
  > Default: n/a (command, not a cvar).
  > Set by: any player or admin spectator.

---

B5-RESULT | ktx:cvar:k_fbskill_vol_oppdir_incr | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_oppdir_incr

- canonical_id: `ktx:cvar:k_fbskill_vol_oppdir_incr`
- prior length: 877
- new length: 363

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. This is the volatility INCREMENT contributed each frame in proportion to how much the bot's and the opponent's movement directions differ. Volatility is increased by (1 - same_direction) * (enemydirection_volatility / 2), where same_direction is the dot product of the normalized bot and enemy velocity vectors -- so the contribution is zero when both move the same way and grows as directions diverge (note the configured value is halved before use). The bot reads it clamped to bound(0, value, 5.0) into self->fb.skill.enemydirection_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot AI tuning cvar. Sets the aim-volatility increment applied per frame based on how much the bot's and the enemy's movement directions differ: contribution is zero when both move the same way and grows as directions diverge (the configured value is halved at the use-site).
  >
  > Range: 0 to 5.0 (clamped at use-site).
  >
  > Default: derived automatically from bot skill level (set by server via setSkillAttributes).
  > Set by: server config or bot skill system.

---

B5-RESULT | ktx:cvar:k_vp_admin | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace jargon | to-shape: D20-template

### ktx:cvar:k_vp_admin

- canonical_id: `ktx:cvar:k_vp_admin`
- prior length: 1247
- new length: 414

- OLD description:
  > The percentage of eligible voters required to pass an admin election -- the `/elect` vote that promotes the caller to admin via `VoteAdmin` (NOT the `/admin` command, which is the password / VIP-grant self-promotion path and is unrelated to the election). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is `max(2, ceil(percent/100 * (players minus bots)))` -- the percent term is the primary scaling factor, but every `/elect` election (admin, captain, coach, etc.) applies a minimum-vote floor of 2 regardless of player count. When enough players vote for admin, the election passes.

- NEW description:
  > Percentage of eligible voters required to pass an admin election (the /elect vote). Values below 51 are treated as 51; maximum is 100. The required vote count is max(2, ceil(percent/100 * eligible players)), so a minimum of 2 votes is always required regardless of player count.
  >
  > This cvar governs only the /elect admin election path. The /admin command (password / VIP-grant self-promotion) is unrelated.
  >
  > Range: 51-100 (effective; values below 51 are floored to 51).
  >
  > Default: not specified (server admin sets this per policy).
  > Set by: server config.

---
