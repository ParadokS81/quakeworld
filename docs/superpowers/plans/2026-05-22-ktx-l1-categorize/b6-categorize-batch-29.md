# B6 categorize -- batch 29 ledger

Generated: 2026-05-21
Batch file: /tmp/ktx-categorize-batches/batch-29.txt
Row count: 8

---

B6-RESULT | ktx:cvar:k_vp_teamoverlay | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:cvar:k_vp_teamoverlay

- canonical_id: ktx:cvar:k_vp_teamoverlay
- name: k_vp_teamoverlay
- type: cvar

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: k_vp_teamoverlay is explicitly a member of the k_vp_* family -- it sets the percentage of eligible voters required to pass a team-overlay vote (vote.c:308, OV_TEAMOVERLAY branch). The disambiguation guide lists k_vp_* family directly under Voting.

---

B6-RESULT | ktx:cvar:k_vwep | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_vwep

- canonical_id: ktx:cvar:k_vwep
- name: k_vwep
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: k_vwep toggles the visible-weapons extension globally -- whether other players can see the model of the weapon you hold (world.c:378, weapons.c:1814). This is a server-wide weapon display rule not scoped to any single mode, making Gameplay rules the correct fit over Mode-scoped knobs.

---

B6-RESULT | ktx:cvar:k_yawnmode | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:cvar:k_yawnmode

- canonical_id: ktx:cvar:k_yawnmode
- name: k_yawnmode
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: k_yawnmode is a cvar (not a command) that enables the yawn-mode ruleset, driving all yawn-specific gameplay constants across weapons.c, items.c, and commands.c (commands.c:8638, weapons.c:128, weapons.c:858). Mode selection covers commands; this cvar is the per-mode toggle knob, placing it in Mode-scoped knobs. Confidence MED because yawnmode is not listed explicitly in the k_dmm4_*/k_ca*/k_wp_* prefix examples, but the category definition covers any cvar whose effect is scoped to one specific mode.

---

B6-RESULT | ktx:cvar:lock_practice | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:lock_practice

- canonical_id: ktx:cvar:lock_practice
- name: lock_practice
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: lock_practice controls whether practice mode persists across level changes and whether the toggle command is permitted (g_main.c:521, commands.c:4913-4927). Practice mode is a server match-state -- locking it is a match-state transition control, squarely in Match flow.

---

B6-RESULT | ktx:cvar:maxfps | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:maxfps

- canonical_id: ktx:cvar:maxfps
- name: maxfps
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: maxfps sets the maximum client frame rate the server permits, with enforcement via warnings and disconnection (world.c:1580-1585, client.c:3859-3877). It is a server-side rate/slot control that applies globally, fitting Server config & network.

---

B6-RESULT | ktx:cvar:srv_practice_mode | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:srv_practice_mode

- canonical_id: ktx:cvar:srv_practice_mode
- name: srv_practice_mode
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: srv_practice_mode toggles the server between normal play and practice mode, triggering a map reload and announcement each time (world.c:549-551, commands.c:4886-4902). This is a match-state transition control -- practice vs normal mode is the server's active match-flow state.

---

B6-RESULT | ktx:cvar:timing_players_action | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:timing_players_action

- canonical_id: ktx:cvar:timing_players_action
- name: timing_players_action
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: timing_players_action is a bitmask controlling how the server reacts to lagging players -- broadcast warnings, glow effects, and invincibility (client.c:132, TA_INFO/TA_GLOW/TA_INVINCIBLE bits). This is a server-side network/connection management policy, fitting Server config & network.

---

B6-RESULT | ktx:cvar:timing_players_time | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:timing_players_time

- canonical_id: ktx:cvar:timing_players_time
- name: timing_players_time
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: timing_players_time sets the lag threshold (in seconds) before the server applies timing_players_action effects (client.c:131, client.c:144). It is a server-side network timeout parameter, squarely in Server config & network.

---
