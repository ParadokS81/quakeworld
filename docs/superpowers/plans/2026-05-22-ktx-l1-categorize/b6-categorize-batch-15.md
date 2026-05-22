# B6 Categorize -- Batch 15 ledger

Generated: 2026-05-21 | Agent: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:command:teleteam | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:teleteam

- canonical_id: ktx:command:teleteam
- name: teleteam
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Admin command that toggles whether team telefrags count toward the frag score -- a damage/scoring rule that applies across all modes, matching the "weapon balance, item respawn, damage tuning that applies across all modes" definition. Source: src/commands.c:979.

---

B6-RESULT | ktx:command:time | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:time

- canonical_id: ktx:command:time
- name: time
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints the current server date/time to the querying player; a server-informational utility that changes no game state and is available to any player or spectator, fitting server config & network's "hostname, MOTD, broadcast intervals" utility tier. Source: src/commands.c:960.

---

B6-RESULT | ktx:command:time10 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:time10

- canonical_id: ktx:command:time10
- name: time10
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the match timelimit to 10 minutes; blocked during a live match and broadcasts the new match length -- directly governs match-state timers and transitions, the core Match flow concern. Source: src/commands.c:764.

---

B6-RESULT | ktx:command:time15 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:time15

- canonical_id: ktx:command:time15
- name: time15
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the match timelimit to 15 minutes; same shared TimeSet mechanism as time10 -- blocked mid-match, broadcasts new length. Directly governs match duration timers, placing it squarely in Match flow. Source: src/commands.c:765.

---

B6-RESULT | ktx:command:time20 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:time20

- canonical_id: ktx:command:time20
- name: time20
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the match timelimit to 20 minutes via shared TimeSet handler; blocked mid-match, broadcasts new length. Governs match duration, fitting Match flow. Source: src/commands.c:766.

---

B6-RESULT | ktx:command:time25 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:time25

- canonical_id: ktx:command:time25
- name: time25
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the match timelimit to 25 minutes via shared TimeSet handler; blocked mid-match, broadcasts new length. Governs match duration, fitting Match flow. Source: src/commands.c:767.

---

B6-RESULT | ktx:command:time30 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:time30

- canonical_id: ktx:command:time30
- name: time30
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the match timelimit to 30 minutes via shared TimeSet handler; blocked mid-match, broadcasts new length. Governs match duration, fitting Match flow. Source: src/commands.c:768.

---

B6-RESULT | ktx:command:time5 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:time5

- canonical_id: ktx:command:time5
- name: time5
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the match timelimit to 5 minutes via shared TimeSet handler; blocked mid-match, broadcasts new length. Governs match duration, fitting Match flow. Source: src/commands.c:763.

---

B6-RESULT | ktx:command:timedown | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:timedown

- canonical_id: ktx:command:timedown
- name: timedown
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Decreases the match time limit (normally -5 minutes) with ramped steps and HoonyMode handling; blocked mid-match; broadcasts new value. An admin tool for adjusting match duration mid-setup, core Match flow territory. Source: src/commands.c:733.

---

B6-RESULT | ktx:command:timedown1 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:timedown1

- canonical_id: ktx:command:timedown1
- name: timedown1
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Decreases the match time limit by exactly 1 minute; blocked mid-match; broadcasts new value. Same TimeDown handler as timedown (DEF arg 1.0f). Adjusts match duration at setup, fitting Match flow. Source: src/commands.c:731.

---

B6-RESULT | ktx:command:timeup | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:timeup

- canonical_id: ktx:command:timeup
- name: timeup
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Increases the match time limit (normally +5 minutes) with low-value ramp steps; blocked mid-match; broadcasts new value. Admin tool for extending match duration at setup -- core Match flow. Source: src/commands.c:734.

---

B6-RESULT | ktx:command:timeup1 | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:timeup1

- canonical_id: ktx:command:timeup1
- name: timeup1
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Increases the match time limit by exactly 1 minute; blocked mid-match; broadcasts new value. Same TimeUp handler (DEF arg 1.0f) as timeup. Adjusts match duration at setup, fitting Match flow. Source: src/commands.c:732.

---

B6-RESULT | ktx:command:tkfjump | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:tkfjump

- canonical_id: ktx:command:tkfjump
- name: tkfjump
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Admin toggle that enables or disables the kfjump movement trick server-wide (flips k_disallow_kfjump); this is a movement/technique permission rule that applies across modes, fitting "weapon balance, item respawn, damage tuning that applies across all modes" in the broader Gameplay rules sense. Source: src/commands.c:831.

---

B6-RESULT | ktx:command:tkrjump | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:tkrjump

- canonical_id: ktx:command:tkrjump
- name: tkrjump
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Admin toggle that enables or disables the krjump trick server-wide (flips k_disallow_krjump); parallel to tkfjump -- a movement-technique permission rule applying across modes, fitting Gameplay rules. Source: src/commands.c:832.

---

B6-RESULT | ktx:command:toggleklist | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:toggleklist

- canonical_id: ktx:command:toggleklist
- name: toggleklist
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles whether the klist (full client list) command is available to players during a live match; blocked mid-match; the k_allowklist cvar it controls gates a match-time information command. This is a match-time access/policy control adjacent to match flow rather than spectator or scoring; MED confidence because it touches observer access, but the match-progress gate and match-context framing tilt it to Match flow. Source: src/commands.c:834.

---

B6-RESULT | ktx:command:togglequad:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:togglequad:frogbot:std

- canonical_id: ktx:command:togglequad:frogbot:std
- name: togglequad:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: A frogbot standard command (invoked as `botcmd togglequad`) that grants or removes quad damage on the caller; registered in bot_commands.c std_commands[] and gated by frogbot admin permission -- unambiguously a Frogbot administrative/behavior command. Source: src/bot_commands.c:2327.

---

B6-RESULT | ktx:command:toggleready | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:toggleready

- canonical_id: ktx:command:toggleready
- name: toggleready
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles a player's ready/break state for match start (or race ready/break in race mode); ready-state management is the canonical Match flow mechanism controlling when a match begins. Source: src/commands.c:962.

---

B6-RESULT | ktx:command:toggletracklist | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:toggletracklist

- canonical_id: ktx:command:toggletracklist
- name: toggletracklist
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles whether players may use the spectator-tracking list during a match (k_allowtracklist); blocked mid-match; the description notes the companion reminder to also toggle klist. Match-time access control for a tracking tool -- closer to Match flow (match-gated policy) than to Demo & spectator or Spectator chat & visibility. MED because the tracklist feature itself is spectator-adjacent, but the toggle's operational scope is match-time policy. Source: src/commands.c:843.

---

B6-RESULT | ktx:command:tossflag | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:tossflag

- canonical_id: ktx:command:tossflag
- name: tossflag
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: CTF command allowing a flag carrier to throw the flag forward/upward rather than simply dropping it; a CTF gameplay mechanic (how flags are relinquished) that applies within the CTF mode rules. Source: src/commands.c:915, handler in src/ctf.c:488.

---

B6-RESULT | ktx:command:tossrune | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:tossrune

- canonical_id: ktx:command:tossrune
- name: tossrune
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: CTF command that throws all runes the caller is holding (resistance, strength, haste, regeneration) forward and upward; governs how rune items are transferred between players in CTF -- a gameplay item-interaction rule. Source: src/commands.c:914, handler in src/runes.c:179.

---
