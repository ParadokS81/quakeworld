# B6 categorize -- batch 01 ledger

Generated: 2026-05-22
Batch file: /tmp/ktx-categorize-batches/batch-01.txt
Rows: 20

---

B6-RESULT | ktx:command:4on4 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:4on4

- canonical_id: ktx:command:4on4
- name: 4on4
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Applies the 4on4 game-mode preset" -- it is a command an admin runs to switch the active game mode (standard 4v4 team deathmatch), matching the disambiguation guide exactly ("commands an admin runs to switch the active mode"). Source: src/commands.c:812.

---

B6-RESULT | ktx:command:4on4on4 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:4on4on4

- canonical_id: ktx:command:4on4on4
- name: 4on4on4
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Applies the 4on4on4 game-mode preset: a three-team match" -- it is a command that switches the server to a specific game-mode configuration, directly mirroring the "commands an admin runs to switch the active mode" disambiguation pattern. Source: src/commands.c:821.

---

B6-RESULT | ktx:command:5fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:5fav_go

- canonical_id: ktx:command:5fav_go
- name: 5fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Spectator command: switch to tracking the player saved in favourite slot 5" -- it is a spectator view-control command (tracking a saved favourite player), falling squarely under "recording, replay, spec controls" per the disambiguation guide. Source: src/commands.c:870.

---

B6-RESULT | ktx:command:6fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:6fav_go

- canonical_id: ktx:command:6fav_go
- name: 6fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Identical role to 5fav_go -- "Spectator command: switch to tracking the player saved in favourite slot 6." Spectator view-control tracking a saved favourite, under "spec controls" in the disambiguation guide. Source: src/commands.c:871.

---

B6-RESULT | ktx:command:7fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:7fav_go

- canonical_id: ktx:command:7fav_go
- name: 7fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Same pattern -- "Spectator command: switch to tracking the player saved in favourite slot 7." Spectator view-control command under "spec controls." Source: src/commands.c:872.

---

B6-RESULT | ktx:command:8fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:8fav_go

- canonical_id: ktx:command:8fav_go
- name: 8fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Same pattern -- "Spectator command: switch to tracking the player saved in favourite slot 8." Spectator view-control command under "spec controls." Source: src/commands.c:873.

---

B6-RESULT | ktx:command:9fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:9fav_go

- canonical_id: ktx:command:9fav_go
- name: 9fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Same pattern -- "Spectator command: switch to tracking the player saved in favourite slot 9." Spectator view-control command under "spec controls." Source: src/commands.c:874.

---

B6-RESULT | ktx:command:about | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:about

- canonical_id: ktx:command:about
- name: about
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Prints the server identity panel: server name, version, build, date, and homepage (from the qws_* cvars), followed by the mod name, version, and build (from the qwm_* cvars)." This is a server identity/info query command -- server name, version, homepage -- which maps to "Server config & network" (hostname, MOTD, server-side configuration information). Source: src/commands.c:761.

---

B6-RESULT | ktx:command:addbot:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:addbot:frogbot:std

- canonical_id: ktx:command:addbot:frogbot:std
- name: addbot:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Adds a Frogbot to the server" -- the name contains "frogbot" and the disambiguation guide explicitly lists "k_fb*, k_fbskill_*, fb commands" and bot-skill/behavior/waypoints. This is a core bot-management command. Source: src/bot_commands.c:2318.

---

B6-RESULT | ktx:command:addmarker:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:addmarker:frogbot:editor

- canonical_id: ktx:command:addmarker:frogbot:editor
- name: addmarker:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Frogbot editor command. Places a new routing marker at the editing player's current position." This is a Frogbot waypoint/routing tool (editor mode), directly matching the "waypoints" example in the disambiguation guide. Source: src/bot_commands.c:2334.

---

B6-RESULT | ktx:command:addpath:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:addpath:frogbot:editor

- canonical_id: ktx:command:addpath:frogbot:editor
- name: addpath:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Frogbot editor command. Links the saved marker to the nearest marker." Bot waypoint/path-linking tool in Frogbot editor mode -- clearly in the Frogbot category covering "skill, behavior, waypoints." Source: src/bot_commands.c:2337.

---

B6-RESULT | ktx:command:agree | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:agree

- canonical_id: ktx:command:agree
- name: agree
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Selects and switches to the most recently voted map without a further vote ... The map change still goes through the normal match-in-progress and related guards." This is a match-state transition command (map selection / match flow), fitting "match-state transitions" in the disambiguation guide. Source: src/commands.c:902.

---

B6-RESULT | ktx:command:airstep | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:airstep

- canonical_id: ktx:command:airstep
- name: airstep
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Toggles the server's airstep movement physics on or off." Airstep is a movement-physics rule (pm_airstep) that applies globally across all modes -- not mode-scoped, not admin permissions management -- matching "Gameplay rules" (weapon balance, item respawn, damage tuning that applies across all modes). Source: src/commands.c:999.

---

B6-RESULT | ktx:command:anglehint:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:anglehint:frogbot:editor

- canonical_id: ktx:command:anglehint:frogbot:editor
- name: anglehint:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Frogbot editor command. Gets or sets the angle hint on the path between the saved marker and the nearest marker ... Used to guide bot movement direction along a path." Bot path/waypoint editing tool in Frogbot editor mode -- fits "waypoints" under the Frogbot category. Source: src/bot_commands.c:2355.

---

B6-RESULT | ktx:command:antilag | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:antilag

- canonical_id: ktx:command:antilag
- name: antilag
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Cast or withdraw your vote to toggle the server's lag-compensation (antilag) mode. When enough players vote, or an admin votes alone, antilag is toggled." The primary mechanism is a player-vote system -- the description explicitly calls it a "vote" command throughout -- matching the Voting category (vote thresholds, vote-allowed flags). Source: src/commands.c:722.

---

B6-RESULT | ktx:command:arena | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:arena

- canonical_id: ktx:command:arena
- name: arena
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Toggles Rocket Arena mode on or off ... the server must already be in duel mode for this command to work." Rocket Arena is explicitly described as "a duel modifier" -- its effect is scoped to duel mode (k_rocketarena), fitting Mode-scoped knobs better than Mode selection (which covers commands that switch to a top-level mode). Confidence MED because it is a command (not a cvar) affecting a mode-modifier toggle, which is borderline between Mode selection and Mode-scoped knobs; however the duel-modifier framing and k_rocketarena cvar binding tip it toward scoped. Source: src/commands.c:971.

---

B6-RESULT | ktx:command:auto_pow | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:auto_pow

- canonical_id: ktx:command:auto_pow
- name: auto_pow
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Spectator command. Toggles automatic powerup tracking: when on, your view follows whichever player currently holds the highest-weighted powerup." This is a spectator view-control command (auto-tracking spec controls), matching "spec controls" under Demo & spectator. Source: src/commands.c:895.

---

B6-RESULT | ktx:command:autotrack | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:autotrack

- canonical_id: ktx:command:autotrack
- name: autotrack
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Spectator command that toggles automatic player tracking ... The mode persists through level changes. Spectator-only." This is a spectator view-control command under "spec controls" in the disambiguation guide. Source: src/commands.c:893.

---

B6-RESULT | ktx:command:autotrackktx | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:autotrackktx

- canonical_id: ktx:command:autotrackktx
- name: autotrackktx
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Spectator-only toggle for KTX 'best player' autotracking. While active, the camera automatically follows whoever KTX rates as the best player to watch." Spectator view-control command under "spec controls." Source: src/commands.c:894.

---

B6-RESULT | ktx:command:ban | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:ban

- canonical_id: ktx:command:ban
- name: ban
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Bans a connected player by user id or nick for a timed period ... Set by: admin command." Ban management is explicitly listed as an Admin & permissions example in the disambiguation guide ("admin role, designation, rcon, ban management"). Source: src/commands.c:975.

---
