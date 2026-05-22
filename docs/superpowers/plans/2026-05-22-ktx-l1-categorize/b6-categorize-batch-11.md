# B6 categorize -- batch 11 ledger

Generated: 2026-05-21 | Model: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:command:qlag | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:qlag

- canonical_id: ktx:command:qlag
- name: qlag
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly calls it an admin command that controls a server-wide QiZmo proxy setting (lag-restriction toggle via the fpd bitmask). Source at src/commands.c:784 and handler ToggleQLag confirm admin-only invocation and a server policy flag -- squarely admin & permissions.

---

B6-RESULT | ktx:command:qpoint | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:qpoint

- canonical_id: ktx:command:qpoint
- name: qpoint
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description calls it an admin command that toggles the QiZmo proxy pointing restriction server-wide. Source at src/commands.c:786 and handler ToggleQPoint confirm it flips fpd bit 128 (server permission flag), usable only by admins -- Admin & permissions.

---

B6-RESULT | ktx:command:quadmultiplier:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:quadmultiplier:frogbot:std

- canonical_id: ktx:command:quadmultiplier:frogbot:std
- name: quadmultiplier:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description is a Frogbots subcommand ('/botcmd quadmultiplier') that sets the quad-damage multiplier applied to bots. Source at src/bot_commands.c:2328 registers it in the standard frogbot command table, and FrogbotQuadMultiplier() is the accessor -- unambiguously Frogbot.

---

B6-RESULT | ktx:command:ra_break | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:ra_break

- canonical_id: ktx:command:ra_break
- name: ra_break
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description describes toggling a player's position in the Rocket Arena waiting queue with an associated idle-timeout extension -- a queue/break mechanic that governs player readiness and match-state transitions within RA rounds. Source at src/commands.c:969 -> src/arena.c:811 confirms the queue in/out logic. Match flow is the best fit; Mode-scoped knobs applies only to cvars per the disambiguation guide.

---

B6-RESULT | ktx:command:race | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:race

- canonical_id: ktx:command:race
- name: race
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says it "Toggles race game mode on or off" -- an admin command that switches the active game mode, exactly what the Mode selection category is for. Source at src/commands.c:695 -> ToggleRace() applies/removes the full race ruleset (deathmatch 4, practice, no items).

---

B6-RESULT | ktx:command:race_break | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_break

- canonical_id: ktx:command:race_break
- name: race_break
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description is explicitly a race mode command that clears a player's race-ready state and aborts an active run. Source at src/commands.c:1005 -> r_changestatus case 2 in src/race.c confirms race-mode-only scope -- core Race ecosystem command.

---

B6-RESULT | ktx:command:race_break_all | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_break_all

- canonical_id: ktx:command:race_break_all
- name: race_break_all
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description is a race-mode admin command that forces all racers to stop and broadcasts a server message. Source at src/commands.c:1006 -> r_all_break() in src/race.c, admin-flagged (CF_BOTH_ADMIN) -- Race ecosystem command.

---

B6-RESULT | ktx:command:race_cancel | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_cancel

- canonical_id: ktx:command:race_cancel
- name: race_cancel
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description is a race-mode command that aborts the calling player's own current run. Source at src/commands.c:1008 -> r_changestatus case 4 in src/race.c is race-only with racer/run-active guards -- Race ecosystem.

---

B6-RESULT | ktx:command:race_chasecam | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_chasecam

- canonical_id: ktx:command:race_chasecam
- name: race_chasecam
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description toggles spectator chasecam follow in race mode; spectator-only, race-mode precondition enforced. Source at src/commands.c:1022 -> r_changefollowstatus case 3 in src/race.c -- Race ecosystem spectator control.

---

B6-RESULT | ktx:command:race_chasecam_freelook | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_chasecam_freelook

- canonical_id: ktx:command:race_chasecam_freelook
- name: race_chasecam_freelook
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description toggles race chasecam freelook (free camera while spectating a racer). Source at src/commands.c:1024 -> race_chasecam_freelook_change() in src/race.c, race-mode-only -- Race ecosystem spectator control.

---

B6-RESULT | ktx:command:race_chasecam_view | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_chasecam_view

- canonical_id: ktx:command:race_chasecam_view
- name: race_chasecam_view
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description cycles the spectator's chasecam through four view modes (1st person / 3rd person / hawk eye / backpack ride) in race mode. Source at src/commands.c:1023 -> race_chasecam_change() in src/race.c -- Race ecosystem spectator control.

---

B6-RESULT | ktx:command:race_countdown_down | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_countdown_down

- canonical_id: ktx:command:race_countdown_down
- name: race_countdown_down
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description decreases the race start countdown (k_race_countdown) by 1 second; race-mode only, pre-race preconditions enforced. Source at src/commands.c:697 -> RaceCountdownChange(t=-1) in src/race.c -- Race ecosystem admin control.

---

B6-RESULT | ktx:command:race_countdown_up | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_countdown_up

- canonical_id: ktx:command:race_countdown_up
- name: race_countdown_up
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description increases the race start countdown (k_race_countdown) by 1 second; race-mode only, pre-match preconditions enforced. Source at src/commands.c:696 -> RaceCountdownChange(t=+1) in src/race.c -- Race ecosystem admin control, symmetric with race_countdown_down.

---

B6-RESULT | ktx:command:race_dl_record_demo | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_dl_record_demo

- canonical_id: ktx:command:race_dl_record_demo
- name: race_dl_record_demo
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description downloads a saved MVD demo for a stored race record to the requesting client; race-mode only, takes a record number argument. Source at src/commands.c:1025 -> race_download_record_demo() in src/race.c -- Race ecosystem demo/record retrieval command.

---

B6-RESULT | ktx:command:race_hide_players | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_hide_players

- canonical_id: ktx:command:race_hide_players
- name: race_hide_players
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description toggles the calling player's personal preference for whether other racers are visible during a race; race-mode only, per-player self->hideplayers_default field. Source at src/commands.c:1030 -> race_hide_players_toggle() in src/race.c -- Race ecosystem player preference command.

---

B6-RESULT | ktx:command:race_match | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_match

- canonical_id: ktx:command:race_match
- name: race_match
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description toggles race match mode (k_race_match) with a side effect on demo recording (sv_silentrecord); race-mode only, refused while a run is active. Source at src/commands.c:1028 -> race_match_toggle() in src/race.c -- Race ecosystem match-configuration command.

---

B6-RESULT | ktx:command:race_pacemaker | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_pacemaker

- canonical_id: ktx:command:race_pacemaker
- name: race_pacemaker
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description configures the pacemaker ghost replay (load/disable/headstart/trail/jumps subcommands); race-mode only, refused while a race is active. Source at src/commands.c:1026 -> race_pacemaker() in src/race.c -- Race ecosystem ghost/replay configuration command.

---

B6-RESULT | ktx:command:race_ready | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_ready

- canonical_id: ktx:command:race_ready
- name: race_ready
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description marks the calling player as ready to race, adding them to the race line-up; no-op for spectators or outside race mode, refused mid-match in match mode. Source at src/commands.c:1004 -> r_changestatus case 1 in src/race.c -- Race ecosystem ready/join command.

---

B6-RESULT | ktx:command:race_route_switch | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_route_switch

- canonical_id: ktx:command:race_route_switch
- name: race_route_switch
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description cycles to the next predefined route for the current map (with wrap, error handling, and a server-configured override branch); race-mode only, refused while a race is active. Source at src/commands.c:1020 -> r_route() in src/race.c -- Race ecosystem route/map administration command.

---

B6-RESULT | ktx:command:race_scoring | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_scoring

- canonical_id: ktx:command:race_scoring
- name: race_scoring
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description cycles the scoring system (k_race_scoring_system) among Win Only / Scaled / Formula1 with wrap; race-mode only, refused while a race or match is in progress. Source at src/commands.c:1029 -> race_scoring_system_toggle() in src/race.c -- Race ecosystem scoring configuration command.

---
