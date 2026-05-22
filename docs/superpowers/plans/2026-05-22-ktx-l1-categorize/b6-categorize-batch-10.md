# B6 categorize -- batch 10 ledger

Generated: 2026-05-21 | Sub-agent: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:command:noweapon | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:noweapon

- canonical_id: ktx:command:noweapon
- name: noweapon
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly states "Only works in deathmatch mode 4" and manages k_disallow_weapons, a per-weapon toggle scoped entirely to dmm4; the reasoning confirms the handler returns "command allowed in dmm4 only" for any other mode. This is a command that configures a mode-specific weapon-allow list, fitting the mode-scoped knobs pattern (effect scoped to one specific mode: dmm4 / k_dmm4_*).

---

B6-RESULT | ktx:command:options | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:options

- canonical_id: ktx:command:options
- name: options
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command prints a quick-reference list of available match-control commands (time +/-, frag limit, dm/tp mode, lock, spawntype, etc.) with no state change. Its entire purpose is to document match-flow controls (timedown/timeup, fragsdown/fragsup, lock, spawn, etc.); it is an informational companion to the match-control command set. Match flow is the best fit at MED confidence because the command spans multiple categories (powerups, dm mode) but is fundamentally a match-admin orientation tool.

---

B6-RESULT | ktx:command:overtime | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:overtime

- canonical_id: ktx:command:overtime
- name: overtime
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description states the command cycles the overtime mode (off -> time-based -> sudden death -> tie-break -> golden frag -> off) and has no effect while a match is in progress; reasoning confirms it is a pre-match match-state transition command registered as an admin command (CF_PLAYER | CF_SPC_ADMIN). Overtime mode is a match-state/end-of-match flow configuration, directly in the match flow category.

---

B6-RESULT | ktx:command:overtimeup | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:overtimeup

- canonical_id: ktx:command:overtimeup
- name: overtimeup
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command increases overtime duration (k_exttime) by one minute and has no effect while a match is in progress; reasoning confirms handler ChangeOvertimeUp at src/commands.c:1770 reads k_exttime, guards on match_in_progress, and bprints the new duration. Adjusting overtime duration is a match-state/timing configuration, squarely in match flow.

---

B6-RESULT | ktx:command:pathinfo:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:pathinfo:frogbot:editor

- canonical_id: ktx:command:pathinfo:frogbot:editor
- name: pathinfo:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly identifies this as a "Frogbot route-editor command (requires editor mode)" and the reasoning confirms it is registered in editor_commands[] at src/bot_commands.c:2347, dispatched only when FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE). The :frogbot:editor canonical_id suffix and bot_commands.c source file both confirm Frogbot category.

---

B6-RESULT | ktx:command:pathlist:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:pathlist:frogbot:editor

- canonical_id: ktx:command:pathlist:frogbot:editor
- name: pathlist:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly identifies this as a "Frogbot editor subcommand (requires bot editor mode)" listing routing paths by flag filter; reasoning confirms registration in editor_commands[] at src/bot_commands.c:2358 and handler FrogbotListPaths at src/bot_commands.c:169. Bot_commands.c source and :frogbot:editor suffix confirm Frogbot category unambiguously.

---

B6-RESULT | ktx:command:pause | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:pause

- canonical_id: ktx:command:pause
- name: pause
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command toggles pause/unpause with a 3-second countdown, is refused when 3 or fewer seconds remain or pausing is not permitted, and only applies during a running match; reasoning confirms handler TogglePause at src/commands.c:8726 guards on match state (match_in_progress==2) and manages when_to_pause/when_to_unpause timers. Pause is a canonical match-state transition control, directly in match flow.

---

B6-RESULT | ktx:command:pickspawn | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:pickspawn

- canonical_id: ktx:command:pickspawn
- name: pickspawn
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command "nominates the spawn point nearest the player's current position" during prewar (refused if a match is in progress), with per-player/per-team caps; reasoning confirms handler HM_pick_spawn at hoonymode.c:900-1065 enforces a match guard at :931-935 and is explicitly a prewar spawn-selection mechanic. Prewar spawn nomination is a match-state-transition setup step, fitting match flow (prewar/ready/restart/timer/match-state transitions).

---

B6-RESULT | ktx:command:pickup | CATEGORIZED | category=Voting | confidence=MED

### ktx:command:pickup

- canonical_id: ktx:command:pickup
- name: pickup
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command "toggles the calling player's vote for a pickup game" and broadcasts the remaining votes required; reasoning confirms handler VotePickup at src/commands.c:2537 toggles self->v.pickup and calls vote_check_pickup(). While not in the k_vp_* cvar family, this is fundamentally a per-player vote-toggle command that tracks vote counts toward a threshold -- a voting mechanic. MED confidence because it lacks the k_vp_ prefix but its core behavior (vote-toggle + vote-count broadcast) aligns with Voting.

---

B6-RESULT | ktx:command:pos_angles | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:pos_angles

- canonical_id: ktx:command:pos_angles
- name: pos_angles
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command sets the player's view angles from three given values (pitch/yaw/roll) with '*' wildcard to leave components unchanged, rate-limited to one per second, refused when position commands are restricted; reasoning confirms it shares handler Pos_Set with pos_origin (sibling-cohort noted), used for trick/practice positioning. The pos_* family (save/show/move/origin/angles) forms a prewar/practice position-manipulation toolkit; the CF_BOTH flag and practice/trick-chiters use place it in the match-flow pre-match setup context. MED confidence: no strong match-flow keyword in description but the usage context (prewar, practice, refused during race) is match-state-adjacent.

---

B6-RESULT | ktx:command:pos_move | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:pos_move

- canonical_id: ktx:command:pos_move
- name: pos_move
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command restores the player's saved position (origin, angles, velocity), rate-limited to one per second, blocked when position commands are restricted; reasoning confirms handler Pos_Move at src/commands.c:6509 guards on Pos_Disallowed() (which covers match_in_progress, intermission, paused, race.status). Part of the pos_* position-manipulation family (sibling of pos_save/pos_show/pos_origin/pos_angles) used in prewar/practice contexts; match-flow adjacent for the same reasons as pos_angles.

---

B6-RESULT | ktx:command:pos_origin | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:pos_origin

- canonical_id: ktx:command:pos_origin
- name: pos_origin
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command teleports the player to a map position given as three coordinates (x y z) with '*' wildcards, rate-limited, may be restricted by the server; reasoning confirms it shares handler Pos_Set (DEF selector arg 1) with pos_angles, guards on Pos_Disallowed() (match_in_progress / intermission / paused / race). Part of the pos_* family for prewar/practice trick positioning; same match-flow placement as pos_save/pos_move/pos_angles.

---

B6-RESULT | ktx:command:pos_save | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:pos_save

- canonical_id: ktx:command:pos_save
- name: pos_save
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command saves the player's current position into one of 5 slots and is refused during a match, intermission, while paused, or during an active race round; reasoning confirms handler Pos_Save at src/commands.c:6444-6461 guards on Pos_Disallowed() (match_in_progress || intermission_running || sv_paused || isRACE()). Explicitly blocked during a running match -- it is a prewar/practice setup tool in the match-flow pre-match phase. Part of the pos_* family.

---

B6-RESULT | ktx:command:pos_show | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:pos_show

- canonical_id: ktx:command:pos_show
- name: pos_show
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command prints a saved position slot alongside the caller's current values for comparison, available at any time with no match guard; reasoning confirms handler Pos_Show at src/commands.c:6422-6438 does NOT call Pos_Disallowed() (unlike its siblings). Part of the pos_* family (save/move/origin/angles) which is a prewar/practice position-toolkit; match-flow adjacent placement consistent with the other pos_* commands.

---

B6-RESULT | ktx:command:powerups | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:powerups

- canonical_id: ktx:command:powerups
- name: powerups
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command toggles powerup spawning (Quad, Pentagram, Ring of Shadows, Biosuit) on the map, with no-arg toggling all four together or letter-args toggling individually; reasoning confirms handler TogglePowerups at src/commands.c:2776-2843 manages k_pow/k_pow_q/k_pow_p/k_pow_r/k_pow_s. Powerup spawn presence is a cross-mode item-balance rule (the command reports disabled under Instagib or Midair but the setting itself is not mode-scoped -- it governs powerup spawning in general), fitting Gameplay rules (item respawn / balance tuning across modes).

---

B6-RESULT | ktx:command:powerups_pickup | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:powerups_pickup

- canonical_id: ktx:command:powerups_pickup
- name: powerups_pickup
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command toggles the no-multi-pickup powerup policy (k_pow_pickup) on or off -- when enabled, a player cannot pick up multiple powerups simultaneously; reasoning confirms handler TogglePuPickup at src/commands.c:2846-2854 does a straight on/off cvar_toggle of k_pow_pickup. This is a cross-mode pickup interaction rule (not scoped to one specific mode), fitting Gameplay rules (item pickup behavior / balance tuning that applies broadly).

---

B6-RESULT | ktx:command:practice | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:practice

- canonical_id: ktx:command:practice
- name: practice
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command "toggles the server between practice mode and normal mode" and leaving practice mode reloads the current map; reasoning confirms handler TogglePractice at src/commands.c:4911-4975 guards on match_in_progress and calls SetPractice() which bprints "Server in practice mode" / "Server in normal mode" and changelevel on exit. Toggling the server between practice and normal is a match-state transition (source_file: src/commands.c:827), directly in match flow.

---

B6-RESULT | ktx:command:prewar | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:prewar

- canonical_id: ktx:command:prewar
- name: prewar
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command cycles k_prewar (0=no fire/jump, 1=fire+jump allowed, 2=fire+jump require 'ready' first) and broadcasts the change; reasoning confirms handler TogglePreWar at admin.c:793 is explicitly a prewar match-state configuration command. Prewar is named in the disambiguation guide as a canonical match flow example ("prewar, ready, restart, breaks, timers, match-state transitions").

---

B6-RESULT | ktx:command:qenemy | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:qenemy

- canonical_id: ktx:command:qenemy
- name: qenemy
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command toggles QiZmo enemy-nearby reporting by setting/clearing a bit in the server's fpd serverinfo value; reasoning confirms the toggle at commands.c:3712 (fpd ^= 32) propagated via localcmd("serverinfo fpd %d\n", fpd) at :3714. The fpd serverinfo flag is a server-side network configuration value consumed by the QiZmo proxy -- this is server config & network (sv_* / serverinfo / broadcast intervals), not a match-flow or gameplay-rule concern.

---

B6-RESULT | ktx:command:qizmo | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:qizmo

- canonical_id: ktx:command:qizmo
- name: qizmo
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the command prints a help listing of the three QiZmo proxy sub-commands (qlag, qenemy, qpoint) with no state change; reasoning confirms ShowQizmo at src/commands.c:1585-1591 is a pure G_sprint of a fixed help table for QiZmo proxy features. QiZmo is a network proxy tool (lag settings, fpd flags, point function) and this command is its orientation entry point -- server config & network is the right bucket. MED confidence because it's an informational help command, but its subject matter (QiZmo proxy / serverinfo/fpd) is unambiguously network/server-config territory.

---
