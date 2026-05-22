# B6 categorize ledger -- batch 04

Generated: 2026-05-21
Batch file: /tmp/ktx-categorize-batches/batch-04.txt
Model: claude-sonnet-4-6 | b6-categorize-v1
Row count: 20

---

B6-RESULT | ktx:command:dropring | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:dropring

- canonical_id: ktx:command:dropring
- name: dropring
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggles the `dr` rule controlling whether the Ring of Shadows is dropped on death with its remaining duration preserved. This is a cross-mode powerup rule affecting item behaviour globally (gated by k_pow/k_pow_r), which fits Gameplay rules (weapon balance, item respawn, damage tuning that applies across all modes) rather than Mode-scoped knobs (which are single-mode cvars like k_dmm4_*/k_ca*). The source_file (src/commands.c) and description confirm it modifies a server-wide item-drop rule, not a per-mode setting.

---

B6-RESULT | ktx:command:dumpent | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:dumpent

- canonical_id: ktx:command:dumpent
- name: dumpent
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: A cheat-gated admin dev tool that exports dropitem-placed entities to a server file; requires cheats enabled and is refused during live match. The description explicitly states "Requires cheats to be enabled on the server. Refused while a match is in progress. Set by: admin command 'dumpent' (cheats required)." It is an admin-only server utility, placing it squarely in Admin & permissions.

---

B6-RESULT | ktx:command:easyskillmode:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:easyskillmode:frogbot:std

- canonical_id: ktx:command:easyskillmode:frogbot:std
- name: easyskillmode:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This is a frogbot subcommand (`frogbot easyskillmode`) that toggles the easy-skill-mode flag for bots, selecting which skill-attribute curve bots use. The source file (src/bot_commands.c) and the description naming pattern (:frogbot:std suffix) confirm this is part of the frogbot command suite. The disambiguation guide explicitly lists "fb commands" and "k_fb*" as Frogbot.

---

B6-RESULT | ktx:command:effi | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:effi

- canonical_id: ktx:command:effi
- name: effi
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prints a per-player in-match statistics table showing frags, rank, efficiency, friendly kills, and (in Rocket Arena) wins/losses. The description confirms it is a stat-display command gated to a live match ("prints 'no game - no statistics' otherwise"). This is a pure Scoring & stats function -- end-of-match/in-match data surfacing.

---

B6-RESULT | ktx:command:elect | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:elect

- canonical_id: ktx:command:elect
- name: elect
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Starts an admin-election vote where other connected players type "yes" to approve; the requester gains admin rights if enough votes approve. The source reasoning references `get_votes(OV_ELECT)`, and the description explicitly describes a player-driven vote for admin status. While the outcome is about admin rights, the mechanism is a vote process (VoteAdmin handler, OV_ELECT election type), aligning with the Voting category (vote thresholds, vote-allowed flags). The disambiguation guide lists Admin & permissions for "admin role, designation, rcon, ban management" -- but elect is specifically the vote mechanism to acquire admin status, making Voting the better fit.

---

B6-RESULT | ktx:command:exclusive | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:exclusive

- canonical_id: ktx:command:exclusive
- name: exclusive
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Admin command that toggles exclusive mode (k_exclusive), controlling whether new player joins are refused once the player count reaches k_attendees (latecomers may only connect as spectators). The description confirms: "new player joins are refused once the player count reaches k_attendees" and "Set by: admin command 'exclusive' (toggle)." This is a server slot/join-policy knob, fitting Server config & network (rates, slots, hostname -- player-count/join-policy governance).

---

B6-RESULT | ktx:command:fairpacks | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:fairpacks

- canonical_id: ktx:command:fairpacks
- name: fairpacks
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Admin command that cycles the fair-packs setting (k_frp) controlling what weapon goes into a player's death backpack (disabled / best weapon / last-fired weapon). The description states "Default: 0. Set by: admin command 'fairpacks' (cycles 0->1->2->0)." This is a cross-mode item/weapon drop rule affecting all modes (the description notes only yawnmode forces it to 2), which fits Gameplay rules (weapon balance, item respawn, damage tuning across all modes) rather than Mode-scoped knobs.

---

B6-RESULT | ktx:command:fallbunny | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:fallbunny

- canonical_id: ktx:command:fallbunny
- name: fallbunny
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Admin command that toggles the fallbunny setting (k_fallbunny), controlling whether hard landings after a high fall apply the broken-ankle movement penalty. The description says "Controls whether hard landings after a high fall apply the broken-ankle movement penalty to the player" with 0/1 enum and notes it is "Blocked during a live match and when race mode or yawnmode is active." This is a cross-mode movement/damage rule (applies in all non-race/non-yawnmode contexts), consistent with Gameplay rules.

---

B6-RESULT | ktx:command:fav10_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav10_add

- canonical_id: ktx:command:fav10_add
- name: fav10_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command that saves the currently tracked player into favourite slot 10 for later POV-snap via 10fav_go. The description explicitly labels it "Spectator command" and "Set by: any spectator in-game." The reasoning cites src/commands.c:5713 favx_add shared handler and the companion xfav_go consumer -- purely spectator tracking controls, fitting Demo & spectator (spec controls).

---

B6-RESULT | ktx:command:fav11_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav11_add

- canonical_id: ktx:command:fav11_add
- name: fav11_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 11 for POV-snap via 11fav_go. Same shared favx_add handler pattern as fav10_add; description and reasoning both confirm spectator-only scope. Fits Demo & spectator (spec controls).

---

B6-RESULT | ktx:command:fav12_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav12_add

- canonical_id: ktx:command:fav12_add
- name: fav12_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 12 for POV-snap via 12fav_go. Same shared favx_add handler pattern; description labels it "Spectator command" and "Set by: any spectator in-game." Fits Demo & spectator (spec controls).

---

B6-RESULT | ktx:command:fav13_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav13_add

- canonical_id: ktx:command:fav13_add
- name: fav13_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 13 for POV-snap via 13fav_go. Same shared favx_add handler; description says "Spectator command" and "Set by: spectator (in-game command)." Fits Demo & spectator (spec controls).

---

B6-RESULT | ktx:command:fav14_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav14_add

- canonical_id: ktx:command:fav14_add
- name: fav14_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 14 for POV-snap via 14fav_go. Same shared favx_add handler; spectator-only scope confirmed by description and reasoning citing src/commands.c:5713. Fits Demo & spectator.

---

B6-RESULT | ktx:command:fav15_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav15_add

- canonical_id: ktx:command:fav15_add
- name: fav15_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 15 for POV-snap via 15fav_go. Same shared favx_add handler; spectator-only scope confirmed. Fits Demo & spectator.

---

B6-RESULT | ktx:command:fav16_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav16_add

- canonical_id: ktx:command:fav16_add
- name: fav16_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 16 for POV-snap via 16fav_go. Same shared favx_add handler; spectator-only scope confirmed. Fits Demo & spectator.

---

B6-RESULT | ktx:command:fav17_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav17_add

- canonical_id: ktx:command:fav17_add
- name: fav17_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 17 for POV-snap via 17fav_go. Same shared favx_add handler; spectator-only scope confirmed. Fits Demo & spectator.

---

B6-RESULT | ktx:command:fav18_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav18_add

- canonical_id: ktx:command:fav18_add
- name: fav18_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 18 for POV-snap via 18fav_go. Same shared favx_add handler; spectator-only scope confirmed. Fits Demo & spectator.

---

B6-RESULT | ktx:command:fav19_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav19_add

- canonical_id: ktx:command:fav19_add
- name: fav19_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 19 for POV-snap via 19fav_go. Same shared favx_add handler; spectator-only scope confirmed by description and reasoning citing src/commands.c:5713/5821. Fits Demo & spectator.

---

B6-RESULT | ktx:command:fav1_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav1_add

- canonical_id: ktx:command:fav1_add
- name: fav1_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 1 for POV-snap via 1fav_go. Description confirms "Set by: spectator (in-game command)" and reasoning cites shared favx_add handler at src/commands.c:5713 with companion xfav_go at :5821. Fits Demo & spectator (spec controls).

---

B6-RESULT | ktx:command:fav20_add | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:fav20_add

- canonical_id: ktx:command:fav20_add
- name: fav20_add
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator command saving the tracked player into favourite slot 20 for POV-snap via 20fav_go. Same shared favx_add handler; spectator-only scope confirmed. Fits Demo & spectator.

---
