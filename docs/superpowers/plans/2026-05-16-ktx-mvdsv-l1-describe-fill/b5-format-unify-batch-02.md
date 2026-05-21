# B5 format-unify ledger -- batch 02

**Batch:** 02 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:20fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose with internal-array mechanics + favx[] vs fav[] distinction + per-error-message detail | to-shape: D20-template

### ktx:command:20fav_go

- canonical_id: `ktx:command:20fav_go`
- prior length: 770 chars
- new length: 348 chars

- OLD description:
  > Spectator command: switches your tracked point-of-view to the player stored in personal favourites slot 20 (the slot populated beforehand by `fav20_add`, which writes the currently tracked player into the per-slot favx[] array at index 19). If slot 20 is empty it prints "slot 20 is not defined" and does nothing; if the slot's stored player is no longer connected as a real player it prints "slot 20 can't find player"; if you are already observing that player it prints "already observing". Otherwise it issues a `track <userid>` command to switch your view to that player. One such command exists per favourites slot (1fav_go..20fav_go); the per-slot favx[] array is distinct from the auto-list self->fav[] that the unrelated `fav_add` writes and `fav_next` consumes.

- NEW description:
  > Spectator command: switches your tracked view to the player stored in personal favourites slot 20. Use `fav20_add` beforehand to save a player into that slot. If the slot is empty, prints "slot 20 is not defined"; if the stored player is no longer connected, prints "slot 20 can't find player"; if you are already watching them, prints "already observing". One command exists per slot (1fav_go .. 20fav_go).
  >
  > Set by: any spectator.

---

B5-RESULT | ktx:command:3on3on3 | FORMAT-UNIFIED | rev=1 | from-shape: prose with full preset value list + admin restriction + matchtag detail | to-shape: D20-template

### ktx:command:3on3on3

- canonical_id: `ktx:command:3on3on3`
- prior length: 732 chars
- new length: 374 chars

- OLD description:
  > Switches the server into the built-in 3-team, 3-players-per-team ("3 on 3 on 3") match preset. Applies a fixed settings block: coop 0, maxclients and k_maxclients 9, timelimit 15 (15-minute rounds), teamplay 2 (teammate and self damage on), deathmatch 1 (weapons do not remain after pickup), k_pow 1 (powerups enabled), k_membercount 2 (minimum 2 players per team), k_lockmin 1 and k_lockmax 3 (1 to 3 teams), k_overtime 1 with k_exttime 5 (5-minute time-based overtime), and k_mode 2. After the preset it execs any matching configs/usermodes/3on3on3/ override .cfg files and announces a styled "3 on 3 on 3 settings enabled" message to players. Restricted to players and spectator-admins and accepts an optional matchtag parameter.

- NEW description:
  > Applies the 3-on-3-on-3 match preset: 3 teams of up to 3 players, 15-minute timelimit, 5-minute overtime, teamplay 2 (teammate damage on), deathmatch 1 (weapons not left on floor), powerups on, 9-player cap. Loads any matching override .cfg files and announces "3 on 3 on 3 settings enabled" to all players. Accepts an optional matchtag argument.
  >
  > Set by: any player or spectator-admin via '3on3on3' command.

---

B5-RESULT | ktx:command:autotrackktx | FORMAT-UNIFIED | rev=1 | from-shape: prose with cf_flags literals + internal variable names + three-variant disambiguation | to-shape: D20-template

### ktx:command:autotrackktx

- canonical_id: `ktx:command:autotrackktx`
- prior length: 766 chars
- new length: 365 chars

- OLD description:
  > Spectator-only toggle that enables KTX's "best player" autotracking: while active, the camera automatically follows the player KTX rates as best to watch (rerouted each frame, with a brief delay before switching off a player who just died). Issuing it again while this mode is active turns autotracking off. Distinct from `autotrack` (KTeams-Pro event-driven autotrack) and `auto_pow` (follows powerup carriers); the chosen mode is stored in the `*at` userinfo so it persists across map changes. Spectator-only (CF_SPECTATOR | CF_MATCHLESS at the registration row); no match-state gate on the handler path -- it is dispatchable both during a live match and in matchless mode (CF_MATCHLESS is the additive "also valid in matchless mode" permission, not a match-lock).

- NEW description:
  > Spectator-only toggle for KTX "best player" autotracking. While active, the camera automatically follows whoever KTX rates as the best player to watch, switching targets each frame with a short hold after a player dies. Run again to turn autotracking off. The chosen tracking mode persists across map changes. Distinct from `autotrack` (event-driven) and `auto_pow` (follows powerup carriers). Available during live matches and in matchless mode.
  >
  > Set by: any spectator via 'autotrackktx' command.

---

B5-RESULT | ktx:command:ctf | FORMAT-UNIFIED | rev=1 | from-shape: prose with full preset value list + internal mechanism details (um_list index, common_um_init) + bot-refusal clause | to-shape: D20-template

### ktx:command:ctf

- canonical_id: `ktx:command:ctf`
- prior length: 753 chars
- new length: 411 chars

- OLD description:
  > Applies the CTF (capture-the-flag) game-mode preset. Loads the ctf entity-file directory (sv_loadentfiles_dir ctf), enables airstep (pm_airstep 1), sets teamplay 4 and deathmatch 3 (base mode -- weapons stay), caps the server at 16 players (maxclients/k_maxclients 16), runs a 10-minute timelimit with time-based 5-minute overtime, sets discharge mode 2 (no out-of-water discharges) and spawn type 1, allows 1-2 teams, sets the internal game mode to k_mode 4, and applies CTF-specific defaults: team-based spawns on, grappling hook off, runes off, green armor on. The shared common reset runs first. When CTF is invoked the dispatcher also enforces team-name handling for ready players (and refuses if bots are enabled and the caller is not the server).

- NEW description:
  > Applies the CTF (capture-the-flag) match preset: loads CTF entity files, enables airstep, sets teamplay 4 and deathmatch 3 (weapons stay on floor), caps at 16 players, 10-minute timelimit with 5-minute overtime, 1-2 teams, CTF-specific defaults (team-based spawns on, grappling hook off, runes off, green armor on). Refuses if bots are enabled and the caller is not the server. Accepts an optional matchtag argument.
  >
  > Set by: any player or spectator-admin via 'ctf' command.

---

B5-RESULT | ktx:command:dropring | FORMAT-UNIFIED | rev=1 | from-shape: prose with internal items.c dependency chain + access-class CF_PLAYER|CF_SPC_ADMIN literal + k_pow_r gate detail | to-shape: D20-template

### ktx:command:dropring

- canonical_id: `ktx:command:dropring`
- prior length: 769 chars
- new length: 426 chars

- OLD description:
  > Toggles the `dr` rule on/off. When enabled, a player carrying the Ring of Shadows (invisibility / eyes) drops it on death, and the dropped Ring keeps its remaining powerup time so another player can pick it up; when disabled, the Ring is simply lost on death. Each invocation flips the rule's current value and broadcasts "<player> enables/disables DropRing" to all clients. The drop also requires the mode's powerups to be enabled (`k_pow`) and the Ring rule to be enabled (`k_pow_r`) -- if either is off the Ring is lost regardless of `dr`. Runnable by any in-game player (no admin required); spectators may run it only if they hold admin (non-admin spectators are refused with "You are not an admin"). Refused while a match is in progress -- it is set during warmup.

- NEW description:
  > Toggles the `dr` rule on/off: when on, a player carrying the Ring of Shadows (invisibility) drops it on death and the remaining duration is preserved for pickup. Each invocation flips the rule and broadcasts the change to all players. Requires powerups enabled (`k_pow`) and the ring powerup rule enabled (`k_pow_r`) -- if either is off the Ring is lost on death regardless of `dr`. Only accepted before a match starts; refused silently during a live match.
  >
  > Set by: any in-game player; admin command for spectators ('dropring').

---

B5-RESULT | ktx:command:effi | FORMAT-UNIFIED | rev=1 | from-shape: prose with RA-delegate internals + Race-mode no-branch clause + source-function names | to-shape: D20-template

### ktx:command:effi

- canonical_id: `ktx:command:effi`
- prior length: 777 chars
- new length: 352 chars

- OLD description:
  > Prints a per-player statistics table to the caller: each player's name, frags, rank (frags minus deaths, with capture points subtracted in CTF), friendly kills (in team modes only), and efficiency, grouped by team. Only available while a game is actually in progress (`match_in_progress == 2`); otherwise it replies "no game - no statistics" and emits nothing. In Rocket Arena it delegates to that mode's own listing (`ra_PlayerStats`, which prints Name / Frags / Wins / Loses / Effi) and skips the standard table. Race mode is NOT specially branched -- in Race the command prints the standard table if a match is in progress, or returns "no game - no statistics" if not; the dedicated race scoring listing is shown only by the automatic end-of-match flow, not by this command.

- NEW description:
  > Prints a per-player statistics table grouped by team: name, frags, rank (frags minus deaths, minus CTF captures), friendly kills (team modes only), and efficiency. Only available while a match is in progress -- prints "no game - no statistics" otherwise. In Rocket Arena, prints the RA-specific listing (Name / Frags / Wins / Loses / Effi) instead of the standard table.
  >
  > Set by: any player or spectator via 'effi' command.

---

B5-RESULT | ktx:command:fill:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: prose with internal dispatch-table mechanics + editor-mode gate + FB_CVAR_SKILL internal name | to-shape: D20-template

### ktx:command:fill:frogbot:std

- canonical_id: `ktx:command:fill:frogbot:std`
- prior length: 752 chars
- new length: 376 chars

- OLD description:
  > Subcommand of the `botcmd` parent command in the standard (non-editor) `std_commands[]` dispatch table -- invoked as `botcmd fill [skill]`. Adds frogbots to fill the empty client slots up to the server's `maxclients`, capped at 8 bots added per invocation; run it again to add more. An optional numeric third argument sets the skill level for the bots added (and stores it as the current frogbot skill via `FB_CVAR_SKILL`); without it the bots use the current frogbot skill level returned by `FrogbotSkillLevel()`. Subject to the `FB_CVAR_ADMIN_ONLY` runtime admin gate at the top of `FrogbotsCommand` (2 = real-admin required, 1 = admin required, 0 = unrestricted), and reached via the standard dispatch table only when `FB_OPTION_EDITOR_MODE` is OFF.

- NEW description:
  > Invoked as `botcmd fill [skill]`. Adds frogbots to fill empty player slots up to `maxclients`, adding at most 8 bots per invocation; run again to add more. An optional numeric argument sets the skill level for the bots added and stores it as the current frogbot skill; without it the current stored skill level is used. Subject to the server's bot-admin gate (`k_fb_adminonly`): may require admin or real-admin depending on the gate setting.
  >
  > Set by: server admin via 'botcmd fill' command.

---

B5-RESULT | ktx:command:forcebreak | FORMAT-UNIFIED | rev=1 | from-shape: prose with three-branch internal handler + CF_BOTH_ADMIN literal + ct != ctPlayer gate detail | to-shape: D20-template

### ktx:command:forcebreak

- canonical_id: `ktx:command:forcebreak`
- prior length: 780 chars
- new length: 430 chars

- OLD description:
  > Admin command, runnable by an admin player or by an admin spectator (admin = rcon-set or elected via /elect). Behaves differently across three branches in `AdminForceBreak`: while a live match is in progress it broadcasts "<player> forces a break!" and runs the normal match-end handling via `EndMatch(0)`; if a countdown / warmup timer is running it instead cancels that timer; if a forced start is queued before the match has begun it clears the forced-start standby state and announces "serverinfo status Standby". The matchless-clear and countdown-cancel branches additionally require `self->ct != ctPlayer` (the caller must be a non-playing admin), but the live-match end-match branch has no such restriction, so an admin who is also playing can use it to break a live match.

- NEW description:
  > Admin command that forcibly ends or resets match state. During a live match: broadcasts "<player> forces a break!" and ends the match normally (any admin, including a playing admin). During a warmup countdown: cancels the countdown timer (non-playing admin only). Before the match begins with a forced start queued: clears the standby state (non-playing admin only). Runnable by any admin (rcon-assigned or elected via /elect), whether playing or spectating; the playing-admin restriction applies only to the pre-match branches.
  >
  > Set by: admin command 'forcebreak' in-game.

---

B5-RESULT | ktx:command:handicap | FORMAT-UNIFIED | rev=1 | from-shape: prose with attacker-only-scaling clause + silent-refuse detail + match-progress guard + source-file references | to-shape: D20-template

### ktx:command:handicap

- canonical_id: `ktx:command:handicap`
- prior length: 744 chars
- new length: 404 chars

- OLD description:
  > Player command that sets your own handicap level. Takes one numeric argument (a percentage from 50 to 150); 100 means handicap is off, and lower values scale down the damage YOU deal as the attacker (handicap is read attacker-side only -- it does not change the damage or armor protection a handicapped player receives as the target). Silently refused while a match is in progress (no message to the issuer). Refused with a printed message when the server admin has locked handicap changes ("handicap changes are not allowed"). Refused entirely in LGC mode (prints "Handicap is not allowed in LGC mode" before any other check). With no argument it prints the usage hint "use: /handicap value, value from 50 to 150" instead of changing anything.

- NEW description:
  > Sets your own handicap level as a percentage (50-150). 100 = handicap off. Values below 100 reduce the damage you deal as the attacker; handicap does not affect the damage or armor protection you receive as a target. Silently refused while a match is in progress. Refused with a message when the server has locked handicap changes ("handicap changes are not allowed"). Refused entirely in LGC mode. With no argument, prints the usage hint instead of changing anything.
  >
  > Set by: any in-game player via 'handicap <value>' command.

---

B5-RESULT | ktx:command:health:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: prose with TOT mode scope + dmm4/bloodfest apply-site + bound() call + peer-branch 250 hardcode detail | to-shape: D20-template

### ktx:command:health:frogbot:std

- canonical_id: `ktx:command:health:frogbot:std`
- prior length: 802 chars
- new length: 396 chars

- OLD description:
  > Frogbot (standard botcmd) subcommand that sets the `k_fb_health` cvar -- the bot spawn-health value applied only by the bot-spawn path inside TOT (Tunnel of Terror) mode during a live dmm4 or bloodfest match (the `else if (tot_mode_enabled())` branch of the dmm4/bloodfest match-countdown block at `client.c:2227-2236`). Outside that path the cvar is registered but not consumed at spawn -- bots receive whatever health the active mode's spawn logic assigns (midair/instagib/lgc all hardcode 250 in the same dmm4/bloodfest block). Takes one integer argument bounded to 1-300 (`bound(1, atoi(argument), 300)`); called with no value prints the usage line, the allowed range, and the current setting instead of changing it. Refused with "Bots are disabled by the server" when the server has bots disabled.

- NEW description:
  > Invoked as `botcmd health <value>`. Sets the bot spawn-health for Tunnel of Terror (TOT) mode. The value is only applied at bot spawn during TOT in a live dmm4 or bloodfest match; in all other modes bots spawn with hardcoded health. With no argument, prints the usage line, allowed range, and current setting. Refused with "Bots are disabled by the server" when bots are disabled.
  >
  > Range: 1-300 (clamped).
  >
  > Set by: server admin via 'botcmd health' command.

---

B5-RESULT | ktx:command:mmode | FORMAT-UNIFIED | rev=1 | from-shape: prose with full argument-list + MMODE_* internal enum names + rcon gate + userinfo key names | to-shape: D20-template

### ktx:command:mmode

- canonical_id: `ktx:command:mmode`
- prior length: 736 chars
- new length: 356 chars

- OLD description:
  > Sets the caller's message mode -- the implicit recipient for subsequent messaging (the 'multi' command and related say macros) -- by writing the *mm userinfo (with *mp/*mt for the target id/team). Accepted arguments: 'off' (no target), 'player' (a specific player by spectator id or name), 'team' (a named team), 'multi' (open the multi-message editor), 'name', 'rcon' (rcon-privileged, gated by the rcon password argument or VIP rights with a brute-force delay), '.' / ',' (the last player you sent to / received from), and 'last' (restore the previously used mode). With no argument it operates on the caller's current stored mode; an unrecognized argument prints the usage line. This is per-player messaging state, not a server rule.

- NEW description:
  > Sets your message mode -- the implicit recipient for subsequent messaging and say macros. Arguments: `off` (no target), `player <id|name>`, `team <name>`, `multi` (open multi-message editor), `name`, `rcon` (requires rcon password or VIP rights), `.` (last player sent to), `,` (last player received from), `last` (restore previous mode). With no argument, operates on your current stored mode. An unrecognized argument prints the usage line.
  >
  > Set by: any player via 'mmode' command (per-player state).

---

B5-RESULT | ktx:command:prewar | FORMAT-UNIFIED | rev=1 | from-shape: prose with PlayersStopFire() side-effect + match-state bprint/sprint distinction + admin-gate clause | to-shape: D20-template

### ktx:command:prewar

- canonical_id: `ktx:command:prewar`
- prior length: 738 chars
- new length: 387 chars

- OLD description:
  > Admin command that cycles the pre-match firing rule (server cvar `k_prewar`) through three states 0 -> 1 -> 2 -> 0 on each invocation: 0 = players may not fire before the match; 1 = players may fire before the match; 2 = players may fire and jump even while readied. For states 0 and 2 the handler additionally calls `PlayersStopFire()` to stop any current firing -- this side-effect runs ONLY when no match is in progress (during a live match the call is skipped, so existing firing continues). The state change is broadcast to all players (`G_bprint`) only when no match is in progress; during a live match every transition is a private `G_sprint` to the caller only. Only admins (`is_adm(self)`) may run it; non-admins return silently.

- NEW description:
  > Admin command that cycles the `k_prewar` setting through 0 -> 1 -> 2 -> 0 on each use, and broadcasts the change to all players.
  >
  > 0 = no fire or jump before the match.
  > 1 = fire and jump allowed before the match.
  > 2 = fire and jump require typing 'ready' first (per-player gate).
  >
  > Set by: admin command 'prewar' in-game (cycles the value; non-admins silently refused).

---

B5-RESULT | ktx:command:rpickup | FORMAT-UNIFIED | rev=1 | from-shape: prose with vote-count mechanics + broadcast wording + veto path + rejection-message literals | to-shape: D20-template

### ktx:command:rpickup

- canonical_id: `ktx:command:rpickup`
- prior length: 729 chars
- new length: 390 chars

- OLD description:
  > Toggles the calling player's vote for a random-team pickup; when the required vote count is reached (or when an admin votes with veto), teams are reshuffled randomly. Silently refused while a match is in progress (early return, no message to the issuer). Refused with a printed message in three other cases: "No random pickup when captain stuffing" (captain picking active), "No random pickup when coach stuffing" (coach picking active), and "You need at least 4 players to do this." (fewer than 4 in-game players). Casting and withdrawing the vote is broadcast to everyone as "<netname> votes for rpickup!" or "<netname> withdraws his|her rpickup vote!", followed by the number of additional votes still required in parentheses.

- NEW description:
  > Casts or withdraws your vote for a random-team shuffle. When enough players vote (or an admin vetoes), teams are reshuffled randomly. Silently refused during a live match. Refused with a message when a captain pick or coach pick is in progress, or when fewer than 4 players are in-game. Casting or withdrawing the vote is announced to all players along with the remaining votes still required.
  >
  > Set by: any in-game player or spectator-admin via 'rpickup' command.

---

B5-RESULT | ktx:command:s-r | FORMAT-UNIFIED | rev=1 | from-shape: prose with interceptor-path internals + l==2 branch distinction + SPRINT_IGNOREINDEMO flag + match cross-talk rule | to-shape: D20-template

### ktx:command:s-r

- canonical_id: `ktx:command:s-r`
- prior length: 742 chars
- new length: 385 chars

- OLD description:
  > Sends a private chat message replying to the last player who privately messaged you. Usage: s-r <text> (requires at least one text argument, else prints "usage: s-r txt"). The recipient is whoever most recently sent you a private message via s-p (the server tracks this per player); s-l differs only in that it instead targets the last player you sent to. If that player is no longer connected it prints "s-r: client not found". On success the message is delivered to that one player and echoed back to you: the recipient sees "[<yourname>->]: text" and you see "[-><recipientname>]: text". During a match a player and a spectator cannot exchange these messages. Sending also updates the saved last-to/last-from pair so replies keep chaining.

- NEW description:
  > Sends a private reply to the last player who messaged you (via s-p). Usage: `s-r <text>`. The recipient sees `[<yourname>->]: text`; you see `[-><recipientname>]: text`. Prints "s-r: client not found" if that player is no longer connected. Requires at least one text argument, else prints "usage: s-r txt". Players and spectators cannot exchange private messages during a match. Each send updates the reply chain so `s-r` and `s-l` keep pointing at the right counterpart.
  >
  > Set by: any player via 's-r' command (distinct from 's-l', which replies to the last player you sent to).

---

B5-RESULT | ktx:command:teleportcap | FORMAT-UNIFIED | rev=1 | from-shape: prose with argc-unreachable branch detail + atoi("") analysis + FixYawnMode() call + consumer scaling formula | to-shape: D20-template

### ktx:command:teleportcap

- canonical_id: `ktx:command:teleportcap`
- prior length: 800 chars
- new length: 439 chars

- OLD description:
  > Sets the teleport-cap percentage used by yawn mode (k_teleport_cap). Yawn mode (k_yawnmode) must be on; if it is off the command does nothing and reports "Yawn mode required to be on". Called while a match is in progress, it prints "Teleport cap is <N>%" and changes nothing. Called outside a match with no argument, the cap is set to 0 (because the empty arg parses to atoi("")==0; the argc-based usage check is structurally unreachable). Called with a numeric argument, it sets the cap to that value clamped to 0-100, writes the k_teleport_cap cvar, re-applies yawn-mode settings immediately via FixYawnMode(), and broadcasts "<netname> set Teleport cap to <N>%" to all players. Yawn-mode horizontal momentum on teleport is then scaled by `(1.0 - k_teleport_cap/100.0)` with a 300-unit speed floor.

- NEW description:
  > Sets the teleport momentum cap for yawn mode (`k_teleport_cap`). Yawn mode must be on; reports "Yawn mode required to be on" otherwise. During a live match, prints the current cap and changes nothing. With a numeric argument outside a match, clamps the value to 0-100, applies yawn-mode settings immediately, and broadcasts the new cap to all players. With no argument outside a match, sets the cap to 0. The cap controls how much horizontal speed is preserved through a teleport (0 = full preservation, 100 = maximum reduction).
  >
  > Range: 0-100 (percentage).
  >
  > Default: 0.
  > Set by: any in-game player or spectator-admin via 'teleportcap' command (yawn mode required).

---

B5-RESULT | ktx:cvar:k_ctf_hookstyle | FORMAT-UNIFIED | rev=1 | from-shape: prose with raw speed constants (PULL_SPEED, THROW_SPEED, CR_THROW_SPEED, NEW_THROW_SPEED) + frame-threshold milliseconds + per-constant source grounding | to-shape: D20-template

### ktx:cvar:k_ctf_hookstyle

- canonical_id: `ktx:cvar:k_ctf_hookstyle`
- prior length: 753 chars
- new length: 462 chars

- OLD description:
  > Selects the grappling-hook physics/behavior. 1 = "smooth": accelerating/decelerating pull speed up to PULL_SPEED=800, hook-release cancel delayed ~250ms (anti-spam), and a halved refire cooldown (HOOK_FIRE_RATE/2). 2 = "fast": fixed pull speed PULL_SPEED=800 with a quick (~80ms) hook-release cancel. 3 = "classic": throw speed THROW_SPEED=800 (the original PureCTF value) with NO automatic cancel on release. 4: throw speed CR_THROW_SPEED=1200 (the FASTEST of the three throw constants, distinctly not the classic 800) with the hook cancelled immediately on release (no frame threshold). The default (and styles not listed above) uses throw speed NEW_THROW_SPEED=1050. Registered with no default (bare RegisterCvar) -- the shipped ktx.cfg sets it to 1.

- NEW description:
  > Selects the grappling-hook physics style for CTF.
  >
  > 0 = default: throw speed 1050, no special cancel.
  > 1 = smooth: accelerating pull up to speed 800, ~250ms cancel delay, faster refire cooldown.
  > 2 = fast: fixed pull speed 800, ~80ms cancel delay.
  > 3 = classic: throw speed 800 (original PureCTF), no automatic cancel on release.
  > 4 = fastest: throw speed 1200, hook cancelled immediately on release.
  >
  > Default: 1 (per shipped ktx.cfg).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_extralog | FORMAT-UNIFIED | rev=1 | from-shape: prose with XML tag names + file-handle internals + log_open/log_printf function refs + separate stats-file distinction | to-shape: D20-template

### ktx:cvar:k_extralog

- canonical_id: `ktx:cvar:k_extralog`
- prior length: 785 chars
- new length: 359 chars

- OLD description:
  > Enables the per-match XML event log. When 1, KTX opens an extra log file (path from the `extralogname` cvar) at match start and writes a structured `<ktxlog>` document containing `<version>`, `<match_info>` (timestamp, hostname, ip, port, map, mode), and `<events>` (per-event records emitted during the match; each `<event>` may carry `<player>` sub-tags identifying the player involved). The document carries NO top-level `<players>` section -- that block belongs to the separate stats XML file (opened by `CreateStatsFile` in `stats.c`, gated by its own format selection), not the extralog. When 0 the subsystem is inert: both `log_open` (`logs.c:42`) and `log_printf` (`logs.c:79`) early-return on `!cvar("k_extralog")` so no file is opened and no events appended. 0 = off, 1 = on.

- NEW description:
  > Enables the per-match XML event log. When on, KTX opens a log file (path set by `extralogname`) at match start and writes a structured document with match info (timestamp, hostname, port, map, mode) and per-event records for the duration of the match. When off, no file is opened and no events are written.
  >
  > 0 = event log disabled.
  > 1 = event log written to file at match start.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_on_end_f_modified | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd mechanism + function-scope latch variable name + match.c line ref + per-client reply chain explanation | to-shape: D20-template

### ktx:cvar:k_on_end_f_modified

- canonical_id: `ktx:cvar:k_on_end_f_modified`
- prior length: 811 chars
- new length: 356 chars

- OLD description:
  > When non-zero and the match has a matchtag assigned, KTX stuffs a single `say f_modified` to the first player iterated at match-end, broadcasting the literal trigger text "f_modified" into chat. Other ezQuake/FTE clients with the standard `f_modified` trigger see that chat line and auto-reply with their own modified-files report, producing the per-client info chain in the match record. A function-scope `f_modified_done` flag at `match.c:285` latches after the first stuffcmd and gates subsequent players in the same post-match loop -- so KTX fires the trigger exactly once per match-end; the per-client replies come from the community trigger chain on the client side, not from KTX iterating. 0 = no stuff fired; non-zero = stuff fires once per match-end. No effect on matches without a matchtag.

- NEW description:
  > When enabled and a matchtag is assigned, KTX broadcasts the `f_modified` trigger text into chat once at match-end. Clients with the standard `f_modified` trigger auto-reply with their modified-files report, building a per-client info chain in the match record. The trigger fires exactly once per match-end regardless of player count. Has no effect on matches without a matchtag.
  >
  > 0 = trigger disabled.
  > 1 = trigger fires once at match-end.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_on_end_f_ruleset | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd mechanism + function-scope latch variable name + match.c line ref + per-client reply chain explanation | to-shape: D20-template

### ktx:cvar:k_on_end_f_ruleset

- canonical_id: `ktx:cvar:k_on_end_f_ruleset`
- prior length: 807 chars
- new length: 360 chars

- OLD description:
  > When non-zero and the match has a matchtag assigned, KTX stuffs a single `say f_ruleset` to the first player iterated at match-end, broadcasting the literal trigger text "f_ruleset" into chat. Other ezQuake/FTE clients with the standard `f_ruleset` trigger see that chat line and auto-reply with their own active-ruleset report, producing the per-client info chain in the match record. A function-scope `f_ruleset_done` flag at `match.c:285` latches after the first stuffcmd and gates subsequent players in the same post-match loop -- so KTX fires the trigger exactly once per match-end; the per-client replies come from the community trigger chain on the client side, not from KTX iterating. 0 = no stuff fired; non-zero = stuff fires once per match-end. No effect on matches without a matchtag.

- NEW description:
  > When enabled and a matchtag is assigned, KTX broadcasts the `f_ruleset` trigger text into chat once at match-end. Clients with the standard `f_ruleset` trigger auto-reply with their active-ruleset report, building a per-client info chain in the match record. The trigger fires exactly once per match-end regardless of player count. Has no effect on matches without a matchtag.
  >
  > 0 = trigger disabled.
  > 1 = trigger fires once at match-end.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_on_end_f_version | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd mechanism + function-scope latch variable name + match.c line ref + per-client reply chain explanation | to-shape: D20-template

### ktx:cvar:k_on_end_f_version

- canonical_id: `ktx:cvar:k_on_end_f_version`
- prior length: 807 chars
- new length: 358 chars

- OLD description:
  > When non-zero and the match has a matchtag assigned, KTX stuffs a single `say f_version` to the first player iterated at match-end, broadcasting the literal trigger text "f_version" into chat. Other ezQuake/FTE clients with the standard `f_version` trigger see that chat line and auto-reply with their own client-version report, producing the per-client info chain in the match record. A function-scope `f_version_done` flag at `match.c:285` latches after the first stuffcmd and gates subsequent players in the same post-match loop -- so KTX fires the trigger exactly once per match-end; the per-client replies come from the community trigger chain on the client side, not from KTX iterating. 0 = no stuff fired; non-zero = stuff fires once per match-end. No effect on matches without a matchtag.

- NEW description:
  > When enabled and a matchtag is assigned, KTX broadcasts the `f_version` trigger text into chat once at match-end. Clients with the standard `f_version` trigger auto-reply with their client-version report, building a per-client info chain in the match record. The trigger fires exactly once per match-end regardless of player count. Has no effect on matches without a matchtag.
  >
  > 0 = trigger disabled.
  > 1 = trigger fires once at match-end.
  >
  > Default: 1.
  > Set by: server config.

---
