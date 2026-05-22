# B6 categorize -- batch 16 ledger

Generated: 2026-05-21 (sub-agent: claude-sonnet-4-6, prompt: b6-categorize-v1)
Batch file: /tmp/ktx-categorize-batches/batch-16.txt
Row count: 20

---

B6-RESULT | ktx:command:tot | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:tot

- canonical_id: ktx:command:tot
- name: tot
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Applies the Tribe of Tjernobyl game-mode preset in full (DMM4 fireball FFA variant); the description and reasoning trace through `tot_um_init` which configures the complete mode state. This is a server-side preset command that switches the active mode, matching the disambiguation definition for Mode selection ("commands an admin runs to switch the active mode").

---

B6-RESULT | ktx:command:totmode | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:totmode

- canonical_id: ktx:command:totmode
- name: totmode
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles Tribe of Tjernobyl mode on or off; requires dmm4 and broadcasts the new state. This is an admin in-game command that switches a named mode, matching the Mode selection category ("commands an admin runs to switch the active mode").

---

B6-RESULT | ktx:command:tp | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:tp

- canonical_id: ktx:command:tp
- name: tp
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Cycles the teamplay setting (1-4) -- teamplay governs team-damage and team-interaction rules and applies across all modes. The description confirms it has no effect while a match is in progress, placing it in the pre-match rules configuration area; teamplay is a general gameplay rule, not scoped to one specific mode.

---

B6-RESULT | ktx:command:tpmsg | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:tpmsg

- canonical_id: ktx:command:tpmsg
- name: tpmsg
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sends a predefined teamplay status message by name -- a gameplay communication tool any player can invoke during a match. None of the 13 locked categories has an explicit "player communication" bucket; the closest fit is Gameplay rules since the command is a gameplay mechanic (team message dispatch) that applies across all modes and is not mode-scoped, vote-related, spectator-specific, admin-specific, or match-flow administrative.

---

B6-RESULT | ktx:command:tracklist | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:tracklist

- canonical_id: ktx:command:tracklist
- name: tracklist
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints the list of spectators and which player each is currently tracking. Source grounds this in the spectator control path (`k_allowtracklist` gate, spectator iteration via `find_spc`). Squarely fits "Demo & spectator -- spec controls."

---

B6-RESULT | ktx:command:trx_play | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:trx_play

- canonical_id: ktx:command:trx_play
- name: trx_play
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Plays back a previously recorded trick-movement capture by spawning a player-model entity for replay; this is a recording/replay feature. Source confirms it is the playback arm of the trx in-memory trick-demo system (companion to trx_rec / trx_stop). Fits "Demo & spectator -- recording, replay."

---

B6-RESULT | ktx:command:trx_rec | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:trx_rec

- canonical_id: ktx:command:trx_rec
- name: trx_rec
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Records the calling player's movement into an in-memory trick-demo buffer for later replay. Source confirms this is the recording arm of the trx system (handler `mv_cmd_record`, gated by match/intermission state). Fits "Demo & spectator -- recording, replay."

---

B6-RESULT | ktx:command:trx_stop | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:trx_stop

- canonical_id: ktx:command:trx_stop
- name: trx_stop
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Stops both the trick-demo recording and any active trick-demo playback. Source confirms it calls `mv_stop_record()` and `mv_stop_playback()` -- the stop-control arm of the trx system. Fits "Demo & spectator -- recording, replay."

---

B6-RESULT | ktx:command:uinfo | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:uinfo

- canonical_id: ktx:command:uinfo
- name: uinfo
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Queries a connected client's userinfo keys (the curated cinfos[] set or a specific key by name); userinfo is the client-side configuration/network identity blob exchanged between client and server. Source grounds this in `g_userinfo.c` with CF_BOTH|CF_MATCHLESS|CF_PARAMS flags. Best fit is "Server config & network" as userinfo key inspection is a server-side diagnostic of client network/config state.

---

B6-RESULT | ktx:command:upplayers | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:upplayers

- canonical_id: ktx:command:upplayers
- name: upplayers
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Raises the server's player-slot count (maxclients) by one, up to k_maxclients. Source confirms the handler path through `ChangeClientsCount(1,1)` adjusting the `maxclients` server cvar. Slot count is a core server configuration parameter; fits "Server config & network -- slots."

---

B6-RESULT | ktx:command:upspecs | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:upspecs

- canonical_id: ktx:command:upspecs
- name: upspecs
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Raises the server's spectator-slot count (maxspectators) by one, up to k_maxspectators. Source confirms the handler path through `ChangeClientsCount(2,1)` adjusting the `maxspectators` server cvar. Spectator-slot count is a core server configuration parameter; fits "Server config & network -- slots."

---

B6-RESULT | ktx:command:victim | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:victim

- canonical_id: ktx:command:victim
- name: victim
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sends a say message to the player the caller most recently fragged, with optional premsg/postmsg userinfo wrapping; `self->victim` is set in the frag-handling path. This is an in-game player interaction/communication tool that applies across all modes (CF_PLAYER|CF_MATCHLESS). No locked category targets player-to-player message helpers specifically; Gameplay rules is the closest fit as it is a general gameplay mechanic.

---

B6-RESULT | ktx:command:votecoop | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:votecoop

- canonical_id: ktx:command:votecoop
- name: votecoop
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Casts or withdraws the calling player's vote to toggle cooperative mode; triggers a vote-check with majority/veto threshold. Source grounds this in `src/vote.c:1165` (`votecoop` handler) with a `vote_check_coop()` threshold path. Squarely fits the Voting category (vote-allowed flags, vote thresholds).

---

B6-RESULT | ktx:command:votemap | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:votemap

- canonical_id: ktx:command:votemap
- name: votemap
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Switches to a named map immediately via `DoSelectMap` if the map exists in the server's list; no vote tally in the traced handler path. Map switching is a match-state transition (the server changes level). Source confirms CF_BOTH|CF_MATCHLESS, so it is a match-flow transition command rather than a persistent server config or a vote-tallied mechanism. Best fit is "Match flow -- match-state transitions."

---

B6-RESULT | ktx:command:voteprivate | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:voteprivate

- canonical_id: ktx:command:voteprivate
- name: voteprivate
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Casts or withdraws a vote to toggle private-game mode, with majority/admin-veto threshold; source traces through `private_game_vote` in `src/vote.c:1497` and `vote_check_privategame`. This is a vote-tallied mechanism with preconditions (voteable server, login required, 2-player minimum). Squarely fits the Voting category.

---

B6-RESULT | ktx:command:vwep | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:vwep

- canonical_id: ktx:command:vwep
- name: vwep
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles visible weapons (k_vwep) -- whether each player's held weapon appears as a 3D model on their character. Source confirms the handler at `src/commands.c:8583` gates on match state, `vw_available`, and `k_allow_vwep`, then refreshes all players' weapon models. This is a general gameplay-visual rule (not mode-scoped) that applies server-wide; fits "Gameplay rules -- weapon balance [visual presentation]."

---

B6-RESULT | ktx:command:weapon:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:weapon:frogbot:std

- canonical_id: ktx:command:weapon:frogbot:std
- name: weapon:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets which weapon all bots should use (1-8 or random); source confirms handler `FrogbotsSetWeapon` in `src/bot_commands.c:2185` dispatched via `FrogbotsCommand()` from the std_commands[] frogbot table. Squarely fits the Frogbot category (bot behavior command).

---

B6-RESULT | ktx:command:who | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:who

- canonical_id: ktx:command:who
- name: who
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints the connected player list with ready/admin/team/name columns; blocked during a live match with "Game in progress." Source confirms handler `PlayerStatus` at `src/commands.c:2370` checks `match_in_progress` and prints readiness glyphs per player. The ready-state roster is a pre-match / match-flow status check; fits "Match flow -- match-state transitions / ready."

---

B6-RESULT | ktx:command:whonot | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:whonot

- canonical_id: ktx:command:whonot
- name: whonot
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints the list of players not yet ready, with "All players ready" and "Game in progress" guard states; source confirms handler `PlayerStatusN` at `src/commands.c:2423` checks both match state and not-ready player count. This is squarely a pre-match readiness tracking command; fits "Match flow -- ready."

---

B6-RESULT | ktx:command:whoskin | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:whoskin

- canonical_id: ktx:command:whoskin
- name: whoskin
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints the skin userinfo key value for each connected player; source confirms handler `PlayerStatusS` reads `ezinfokey(p,"skin")` for each client (CF_BOTH|CF_MATCHLESS). The skin field is a client userinfo/network identity parameter; querying it is a server-side inspection of client configuration state. Best fit is "Server config & network" (client userinfo is part of the client-server config exchange).

---
