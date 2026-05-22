# B6 categorize -- batch 02 ledger

Generated: 2026-05-21 | Model: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:command:banip | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:banip

- canonical_id: ktx:command:banip
- name: banip
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Described as "Admin command for timed IP bans" with "Set by: admin command in-game"; it is a ban-management command requiring admin access, redirected through KTX to the underlying MVDSV server. Fits the Admin & permissions disambiguation (ban management, admin role).

---

B6-RESULT | ktx:command:banrem | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:banrem

- canonical_id: ktx:command:banrem
- name: banrem
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Described as "Removes a ban or lists current bans" with "Set by: admin command 'banrem'"; the reasoning cites a shared CF_REDIRECT registration sibling with banip (commands.c:977). Ban-management + admin-only access = Admin & permissions.

---

B6-RESULT | ktx:command:berzerk | CATEGORIZED | category=Mode selection | confidence=MED

### ktx:command:berzerk

- canonical_id: ktx:command:berzerk
- name: berzerk
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Toggles Berzerk mode on or off" -- it is a command (CF_PLAYER | CF_SPC_ADMIN) that switches a named game mode; the description and handler (commands.c:3242) confirm the observable effect is switching k_bzk between on and off states. Mode selection covers commands that switch the active mode, and berzerk is a named mode toggled by this command. Confidence MED because berzerk is not in the disambiguation's explicit example list (clan_arena, wipeout, midair, etc.).

---

B6-RESULT | ktx:command:blitz2v2 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:blitz2v2

- canonical_id: ktx:command:blitz2v2
- name: blitz2v2
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Applies the Blitz 2v2 game-mode preset" -- a UserMode command (commands.c:817) that configures the server for a specific named mode. Mode selection = commands that switch the active mode; preset-apply commands are the canonical case.

---

B6-RESULT | ktx:command:blitz4v4 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:blitz4v4

- canonical_id: ktx:command:blitz4v4
- name: blitz4v4
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Applies the Blitz 4v4 game-mode preset" -- same UserMode dispatch mechanism as blitz2v2 (commands.c:818), configures the server for a named 4v4 hoonymode preset. Mode selection = commands that switch the active mode.

---

B6-RESULT | ktx:command:botcmd | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:botcmd

- canonical_id: ktx:command:botcmd
- name: botcmd
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Frogbot management command dispatcher" -- the description and reasoning both name FrogbotsCommand (bot_commands.c:2383) as the handler and enumerate the std/editor subcommand sets. Frogbot = skill, behavior, waypoints; botcmd is the top-level dispatch point for all of that.

---

B6-RESULT | ktx:command:break | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:break

- canonical_id: ktx:command:break
- name: break
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Vote to stop the current match or countdown" -- the description covers stopping a countdown timer, voting to end a live match, withdrawing that vote, and spectator unready; all branches are match-state transitions. Match flow = prewar, ready, restart, breaks, timers, match-state transitions; the CD macro is literally 'unready / vote matchend' (commands.c:345).

---

B6-RESULT | ktx:command:breakondeath:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:breakondeath:frogbot:std

- canonical_id: ktx:command:breakondeath:frogbot:std
- name: breakondeath:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Frogbot standard command. Toggles whether a break is automatically issued on your death during a bot practice session." -- described as a frogbot std_commands[] subcommand (bot_commands.c:2326) scoped entirely to bot practice sessions. Frogbot = bot skill, behavior; breakondeath is frogbot session behavior.

---

B6-RESULT | ktx:command:callalias | NEW-CATEGORY-NEEDED | proposed=Client scripting & automation | rev=1

### ktx:command:callalias (NEW CATEGORY NEEDED)

- canonical_id: ktx:command:callalias
- proposed category: Client scripting & automation
- justification: "Schedules one of the caller's own client aliases to execute automatically after a delay" -- this is a player-facing scripting utility that manages alias scheduling during the early-connection window (first 15 seconds, delay 1-30s, single-pending-alias queue). It does not administer the server, control a match, switch a mode, affect scoring, configure frogbot, manage bots, relate to race, demo playback, spectator visibility, or expose engine internals. The closest locked categories are Server config & network (which covers server-side infrastructure: rates, slots, hostname, MOTD) and Internal state (_k_* internals not user-tunable), but callalias is player-invokable client-side scripting -- neither server config nor engine internal. A "Client scripting & automation" category would cover callalias and potentially cmdslist_dl and other bootstrap/alias-scheduling commands.

---

B6-RESULT | ktx:command:cam | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:cam

- canonical_id: ktx:command:cam
- name: cam
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Prints camera-control help to the invoking spectator" -- CF_SPECTATOR gated, describes impulse/attack/jump controls for spectator camera modes (ShowCamHelp at spectate.c:68). Demo & spectator = recording, replay, spec controls; camera navigation help is a spec control.

---

B6-RESULT | ktx:command:captain | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:captain

- canonical_id: ktx:command:captain
- name: captain
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Player command to request, abort, or relinquish captain status" -- captain election is a pre-match team-formation step (guarded: refused during a live match/intermission, requires team mode, minimum player count). Match flow = prewar, ready, restart, breaks, timers, match-state transitions; captain election is part of the prewar/team-formation flow. Confidence MED because the election mechanism overlaps with Voting (the 'yes' command cast, 60s timeout), but the Voting category targets vote-policy cvars (k_vp_* family), not the team-formation command itself.

---

B6-RESULT | ktx:command:carena | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:carena

- canonical_id: ktx:command:carena
- name: carena
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Applies the Clan Arena game-mode preset" -- UserMode command (commands.c:824) that runs carena_um_init to configure the full CA ruleset. Mode selection = commands that switch the active mode; clan_arena is explicitly named in the disambiguation.

---

B6-RESULT | ktx:command:check | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:check

- canonical_id: ktx:command:check
- name: check
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Sends an anti-cheat query to every connected client" -- real admins may issue any f_* query; non-admins are restricted to f_version/f_modified/f_server/f_movement; handler is fcheck (commands.c:8418) with is_real_adm gate. Admin-gated server-management tool = Admin & permissions.

---

B6-RESULT | ktx:command:clearmarkerflag:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:clearmarkerflag:frogbot:editor

- canonical_id: ktx:command:clearmarkerflag:frogbot:editor
- name: clearmarkerflag:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Frogbot waypoint-editor command (available only when editor mode is active). Clears the specified routing flag(s) from the waypoint marker nearest the player." -- editor_commands[] entry (bot_commands.c:2342), dispatched only in FB_OPTION_EDITOR_MODE; handler FrogbotClearMarkerFlag operates on waypoint marker data. Frogbot = bot skill, behavior, waypoints.

---

B6-RESULT | ktx:command:clearpathflag:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:clearpathflag:frogbot:editor

- canonical_id: ktx:command:clearpathflag:frogbot:editor
- name: clearpathflag:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Frogbot waypoint-editor command (editor mode only). Clears the given routing flag(s) from the path connecting the saved marker to the marker nearest the player." -- editor_commands[] entry (bot_commands.c:2344), FB_OPTION_EDITOR_MODE gated; handler FrogbotClearPathFlag operates on waypoint path flags. Frogbot = bot skill, behavior, waypoints.

---

B6-RESULT | ktx:command:cmdslist_dl | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:command:cmdslist_dl

- canonical_id: ktx:command:cmdslist_dl
- name: cmdslist_dl
- type: command

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Internal client-bootstrap command. Not aliasable and hidden from the commands listing... triggered automatically on connect" -- CF_NOALIAS | CF_CONNECTION_FLOOD flags, CD_NODESC macro (commands.c:670), skipped by Do_ShowCmds; the server drives it as part of the handshake, not as a user-configurable command. Internal state = engine internals set only by KTX itself, never by config; cmdslist_dl fits as a machine-internal bootstrap mechanism invisible and inaccessible to users.

---

B6-RESULT | ktx:command:coach | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:coach

- canonical_id: ktx:command:coach
- name: coach
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Spectator command to request, abort, or relinquish coach status" -- coach election is a pre-match team-formation step (refused during live match/intermission, requires team/CTF mode, minimum 3 players). Match flow = prewar, ready, restart, breaks, timers, match-state transitions; coach election parallels captain election as a prewar team-formation mechanism. Confidence MED for the same reason as captain: overlaps with Voting in mechanism (yes-command, 60s timeout) but the Voting category targets k_vp_* vote-policy cvars, not team-formation commands.

---

B6-RESULT | ktx:command:commands | CATEGORIZED | category=Admin & permissions | confidence=LOW

### ktx:command:commands

- canonical_id: ktx:command:commands
- name: commands
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Lists all KTX server commands in two sections: common commands and admin commands" -- Do_ShowCmds (commands.c:1460) partitions output by CF_* admin flags and provides optional substring filtering; accessible to any player or spectator. No perfect fit in the 13 categories (it is a discovery/help utility); Admin & permissions is the nearest functional neighbor since the command surfaces the admin command space and is part of server command management awareness. Confidence LOW: the command is useful to all users, not exclusively admin-tier.

---

B6-RESULT | ktx:command:coop_nm_pu | CATEGORIZED | category=Mode selection | confidence=MED

### ktx:command:coop_nm_pu

- canonical_id: ktx:command:coop_nm_pu
- name: coop_nm_pu
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Player command that toggles New Nightmare mode (k_nightmare_pu) on or off" -- ToggleNewCoopNm (commands.c:8623) flips the k_nightmare_pu cvar and broadcasts the change; described as toggling a named mode. Mode selection = commands that switch the active mode; coop_nm_pu is a command (not a cvar) that switches a named mode variant. Confidence MED because it toggles a single cvar rather than applying a full mode preset, and the affected mode (New Nightmare coop) is outside the explicit disambiguation examples.

---

B6-RESULT | ktx:command:ctf | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:ctf

- canonical_id: ktx:command:ctf
- name: ctf
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: "Applies the CTF (capture-the-flag) match preset" -- UserMode command (commands.c:815) that runs ctf_um_init to configure the full CTF ruleset (teamplay, deathmatch, entity files, player cap, timelimit, overtime). Mode selection = commands that switch the active mode; CTF is a named mode and ctf_um_init is a canonical mode-preset initializer.

---
