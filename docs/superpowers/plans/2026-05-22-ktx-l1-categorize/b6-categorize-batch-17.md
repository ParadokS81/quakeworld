# B6 categorize -- batch 17 ledger

Generated: 2026-05-21
Batch file: /tmp/ktx-categorize-batches/batch-17.txt
Rows: 20

---

B6-RESULT | ktx:command:whovote | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:whovote

- canonical_id: ktx:command:whovote
- name: whovote
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints the status of all currently active votes and elections -- counts, requirements, and who voted. The description and source (src/commands.c:716) show it is squarely a voting-status query tool in the voting subsystem (OV_ELECT, OV_PICKUP, OV_BREAK, OV_ANTILAG, OV_NOSPECS, etc.), not a match-flow or admin command.

---

B6-RESULT | ktx:command:wipeout | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:wipeout

- canonical_id: ktx:command:wipeout
- name: wipeout
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description explicitly states it "applies the Wipeout game-mode preset" -- setting k_clan_arena 2, rounds, respawns, teamplay, deathmatch, and so on from src/commands.c:823. This is the command an admin runs to switch the active mode to Wipeout, fitting the Mode selection definition precisely.

---

B6-RESULT | ktx:command:wp_reset | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:wp_reset

- canonical_id: ktx:command:wp_reset
- name: wp_reset
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Clears the calling player's per-weapon stats (hits and attacks counters) used by the weapon-stats display (src/commands.c:828). The weapon-stats data (hits/accuracy per weapon) is stat-tracking data; resetting it is a stats-management action, placing it under Scoring & stats.

---

B6-RESULT | ktx:command:+wp_stats | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:+wp_stats

- canonical_id: ktx:command:+wp_stats
- name: +wp_stats
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Enables the on-screen weapon-stats overlay showing per-weapon hit/accuracy figures (axe hits, SG/SSG/NG/SNG/LG accuracy percentages, GL/RL direct-hit counts) from src/commands.c:829. This is a stat-tracking display command -- the overlay surface for the per-weapon accuracy data that lives in the stats subsystem.

---

B6-RESULT | ktx:command:-wp_stats | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:-wp_stats

- canonical_id: ktx:command:-wp_stats
- name: -wp_stats
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The off-half of the +wp_stats / -wp_stats pair (src/commands.c:830), turning off the weapon-stats overlay. Paired directly with +wp_stats which is Scoring & stats; both commands operate on the same stat-display subsystem.

---

B6-RESULT | ktx:command:wreg | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:wreg

- canonical_id: ktx:command:wreg
- name: wreg
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Manages server-side weapon-priority script slots (src/commands.c:946) -- registering per-character weapon-impulse sequences that govern weapon switching behaviour. This is a cross-mode gameplay mechanism affecting how weapon priority is resolved, which sits closest to Gameplay rules (weapon balance / behavior tuning) rather than Server config & network (rates/slots/hostname) or any mode-specific bucket.

---

B6-RESULT | ktx:command:xonx | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:xonx

- canonical_id: ktx:command:xonx
- name: xonx
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Applies the XonX game-mode preset (src/commands.c:822) -- setting teamplay, deathmatch, powerups, team sizes, timelimit, and overtime. The description calls it a "game-mode preset" applied by an admin command, which is precisely the Mode selection category definition.

---

B6-RESULT | ktx:command:y | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:y

- canonical_id: ktx:command:y
- name: y
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Confirms a kick during the interactive /kick walk-through -- it is the per-target confirm keystroke inside the admin kick-mode lifecycle (src/admin.c:264, guard on self->k_kicking). Kicking players is an admin action; this is the step-through confirm in the admin kick procedure.

---

B6-RESULT | ktx:command:yawnmode | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:yawnmode

- canonical_id: ktx:command:yawnmode
- name: yawnmode
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles the yawn-mode ruleset (src/commands.c:997/8643) which alters axe damage, shotgun pellet count, armour protection values, backpack drop rules, and fall-bunny -- a cross-mode combat and physics rule change. This is weapon/damage/physics tuning that applies across all modes when active, fitting Gameplay rules squarely.

---

B6-RESULT | ktx:command:yes | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:yes

- canonical_id: ktx:command:yes
- name: yes
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Casts a vote in favour of the current election (captain, coach, admin, or late-join) via VoteYes (src/vote.c:84). The description is entirely about the voting/election subsystem -- active election check, self-vote guard, idempotency, team restriction for late-join. This is a core voting command.

---

B6-RESULT | ktx:command:zonesummary:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:zonesummary:frogbot:editor

- canonical_id: ktx:command:zonesummary:frogbot:editor
- name: zonesummary:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Explicitly a frogbot waypoint-editor command (src/bot_commands.c:2350, registered in editor_commands[]). The description states it prints a zone-summary report for frogbot route markers; the :frogbot:editor namespace suffix and the FrogbotZoneSummary handler confirm it is squarely in the Frogbot category.

---

B6-RESULT | ktx:cvar:add_q_aerowalk | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:add_q_aerowalk

- canonical_id: ktx:cvar:add_q_aerowalk
- name: add_q_aerowalk
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether an extra Quad Damage spawns on the aerowalk map (src/world.c:576). This is item spawn tuning for a specific map -- a gameplay rule affecting item availability, applicable across all modes. It is not mode-scoped (no k_* prefix, no mode-specific guard) so Mode-scoped knobs does not apply.

---

B6-RESULT | ktx:cvar:allow_spec_wizard | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:allow_spec_wizard

- canonical_id: ktx:cvar:allow_spec_wizard
- name: allow_spec_wizard
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether spectators may use the free-roaming "wizard" camera (src/spectate.c:46 GetSpecWizard). The description is entirely about spectator camera access policy -- three-value enum governing when wizard mode is available. This is a spectator control, fitting Demo & spectator.

---

B6-RESULT | ktx:cvar:allow_timing | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:cvar:allow_timing

- canonical_id: ktx:cvar:allow_timing
- name: allow_timing
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Master toggle for KTX's lagged-player detection (src/client.c:135 CheckTiming), configured via server config. The feature detects players timing out (network lag/disconnection) and applies server-side responses (broadcast, glow, invincibility). This is a server-side network-health management feature, closest to Server config & network.

---

B6-RESULT | ktx:cvar:allow_toggle_practice | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:cvar:allow_toggle_practice

- canonical_id: ktx:cvar:allow_toggle_practice
- name: allow_toggle_practice
- type: cvar

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Access-control cvar for the /practice command (src/commands.c:4940) -- a five-value permission tier (no one / admins / admins [unimplemented tiers] / all players). The description is entirely about who has permission to toggle practice mode, placing it squarely in Admin & permissions.

---

B6-RESULT | ktx:cvar:demo_skip_ktffa_record | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:demo_skip_ktffa_record

- canonical_id: ktx:cvar:demo_skip_ktffa_record
- name: demo_skip_ktffa_record
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether FFA games are included in server-side MVD auto-recording (src/match.c:2367), a dependency of demo_tmp_record. This is demo recording policy -- part of the demo/recording subsystem governed by the Demo & spectator category.

---

B6-RESULT | ktx:cvar:demo_tmp_record | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:demo_tmp_record

- canonical_id: ktx:cvar:demo_tmp_record
- name: demo_tmp_record
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Master switch for KTX automatic server-side MVD demo recording (src/match.c:2355). The description covers the full auto-recording lifecycle -- game-type decisions (race, FFA, HoonyMode), cancel-existing-demo behaviour. This is the top-level demo recording toggle, core to Demo & spectator.

---

B6-RESULT | ktx:cvar:dmm4_invinc_time | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:dmm4_invinc_time

- canonical_id: ktx:cvar:dmm4_invinc_time
- name: dmm4_invinc_time
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Duration of spawn invincibility in DMM4 or bloodfest (src/client.c:2185/2288), gated explicitly on `deathmatch == 4 || k_bloodfest`. The name prefix (dmm4_) and the source gate confirm this is a cvar whose effect is scoped to the DMM4/bloodfest modes, matching the Mode-scoped knobs definition.

---

B6-RESULT | ktx:cvar:dq | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:dq

- canonical_id: ktx:cvar:dq
- name: dq
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggle for whether dying players drop their active Quad Damage with remaining duration (src/world.c:866). This is a cross-mode item-drop rule affecting powerup persistence on death -- a gameplay rule not scoped to any particular mode, fitting Gameplay rules.

---

B6-RESULT | ktx:cvar:dr | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:dr

- canonical_id: ktx:cvar:dr
- name: dr
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggle for whether dying players drop their active Ring of Shadows with remaining duration (src/world.c:867). Same pattern as dq -- cross-mode powerup-drop rule affecting all game types, not scoped to a specific mode. Gameplay rules.

---
