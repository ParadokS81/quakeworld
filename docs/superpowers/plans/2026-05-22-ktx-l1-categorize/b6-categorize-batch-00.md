# B6 Categorize -- Batch 00 ledger

Dispatched: 2026-05-22
Model: claude-sonnet-4-6 | b6-categorize-v1
Batch file: /tmp/ktx-categorize-batches/batch-00.txt
Row count: 20

---

B6-RESULT | ktx:command:10fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:10fav_go

- canonical_id: ktx:command:10fav_go
- name: 10fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only command (CF_SPECTATOR) that switches the observer's POV to a saved favourite slot; description and source (src/commands.c:875) confirm it has no effect outside spectator mode. Belongs with Demo & spectator as a spectator control command.

---

B6-RESULT | ktx:command:10on10 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:10on10

- canonical_id: ktx:command:10on10
- name: 10on10
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Applies a built-in 10-on-10 match preset (maxclients, timelimit, teamplay, overtime, etc.) and transitions the server into a team-match configuration; the description and source (src/commands.c:813) show this is a match-state transition command. Belongs with Match flow alongside 1on1 / 2on2 / 3on3 siblings.

---

B6-RESULT | ktx:command:11fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:11fav_go

- canonical_id: ktx:command:11fav_go
- name: 11fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only POV-switch command (CF_SPECTATOR, src/commands.c:876) in the 1fav_go..20fav_go family; description confirms spectator-scope and POV-tracking behavior. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:12fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:12fav_go

- canonical_id: ktx:command:12fav_go
- name: 12fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only command (src/commands.c:877, CF_SPECTATOR) that switches view to a saved favourite slot; identical spectator-control role as all sibling Nfav_go commands. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:13fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:13fav_go

- canonical_id: ktx:command:13fav_go
- name: 13fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only POV-switch command (src/commands.c:878, CF_SPECTATOR gate at 1091); description confirms spectator-scope with the standard empty-slot / disconnected / already-tracking failure branches. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:14fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:14fav_go

- canonical_id: ktx:command:14fav_go
- name: 14fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command switching POV to named favourite slot 14 (src/commands.c:879); description confirms spectator-only scope and the xfav_go handler's track behavior. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:15fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:15fav_go

- canonical_id: ktx:command:15fav_go
- name: 15fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only POV-switch in the 1fav_go..20fav_go family (src/commands.c:880, CF_SPECTATOR at 1091); description explicitly notes "spectator only" and the POV tracking behavior. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:16fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:16fav_go

- canonical_id: ktx:command:16fav_go
- name: 16fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only command (src/commands.c:881, CF_SPECTATOR + dispatcher check at 1091) that jumps the spectator's view to favourite slot 16; identical role and scope as all Nfav_go siblings. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:17fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:17fav_go

- canonical_id: ktx:command:17fav_go
- name: 17fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command (src/commands.c:882, CF_SPECTATOR gate at 1091) switching the observer's view to favourite slot 17; description confirms spectator-only scope and POV-tracking behavior. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:18fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:18fav_go

- canonical_id: ktx:command:18fav_go
- name: 18fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only POV-switch to favourite slot 18 (src/commands.c:883, CF_SPECTATOR); description and source both confirm the spectator-scope and the favx[]-based slot read behavior. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:19fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:19fav_go

- canonical_id: ktx:command:19fav_go
- name: 19fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only command (src/commands.c:884, CF_SPECTATOR) tracking the player in favourite slot 19; description confirms it is independent of the fav_add/fav_next rotation list and scoped to spectators. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:1fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:1fav_go

- canonical_id: ktx:command:1fav_go
- name: 1fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only POV-switch to favourite slot 1 (src/commands.c:866, CF_SPECTATOR); the family anchor for 1fav_go..20fav_go. Description confirms spectator-scope with the three standard failure-mode branches. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:1on1 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:1on1

- canonical_id: ktx:command:1on1
- name: 1on1
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Switches the server to 1on1 (duel) mode by applying a built-in preset and executing the duel config chain; the description and source (src/commands.c:809) confirm this is a match-state transition. Belongs with Match flow as a mode-launch command that sets match parameters.

---

B6-RESULT | ktx:command:20fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:20fav_go

- canonical_id: ktx:command:20fav_go
- name: 20fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command switching the observer's tracked view to favourite slot 20 (src/commands.c:885); description confirms spectator-scope and the favx[]-based slot tracking behavior. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:2fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:2fav_go

- canonical_id: ktx:command:2fav_go
- name: 2fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator-only POV-switch to favourite slot 2 (src/commands.c:867, CF_SPECTATOR); description confirms it reads the favx[] array (not the generic fav[] list) and is spectator-scoped. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:2on2 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:2on2

- canonical_id: ktx:command:2on2
- name: 2on2
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Applies the built-in 2on2 match preset (maxclients, timelimit, teamplay, overtime) and transitions the server into a team-match configuration (src/commands.c:810); a direct match-state transition command. Belongs with Match flow.

---

B6-RESULT | ktx:command:3fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:3fav_go

- canonical_id: ktx:command:3fav_go
- name: 3fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command switching POV to favourite slot 3 (src/commands.c:868, CF_SPECTATOR); description confirms spectator-only scope and the fav3_add/favx[] slot model. Belongs with Demo & spectator.

---

B6-RESULT | ktx:command:3on3 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:3on3

- canonical_id: ktx:command:3on3
- name: 3on3
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Applies the built-in 3on3 match preset (maxclients 6, timelimit 15, overtime 5 min) and executes the usermode config chain (src/commands.c:811); a match-state transition command triggering via UserMode dispatcher. Belongs with Match flow.

---

B6-RESULT | ktx:command:3on3on3 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:3on3on3

- canonical_id: ktx:command:3on3on3
- name: 3on3on3
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Applies the 3-on-3-on-3 match preset (3 teams, 15-minute timelimit, 5-minute overtime) via the UserMode dispatcher (src/commands.c:820); a match-state transition command. Belongs with Match flow.

---

B6-RESULT | ktx:command:4fav_go | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:4fav_go

- canonical_id: ktx:command:4fav_go
- name: 4fav_go
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command switching POV to favourite slot 4 (src/commands.c:869, CF_SPECTATOR); description confirms spectator-scope and favx[]-based slot tracking via xfav_go handler. Belongs with Demo & spectator.

---
