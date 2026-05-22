# B6 categorize -- batch 20 ledger

Generated: 2026-05-21 (Wave 3)
Batch file: /tmp/ktx-categorize-batches/batch-20.txt
Rows: 20

---

B6-RESULT | ktx:cvar:k_defmap | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_defmap

- canonical_id: ktx:cvar:k_defmap
- name: k_defmap
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls which map the server returns to when the last player leaves -- a persistent server-configuration knob. Source registration at src/world.c:852; the description explicitly states "Set by: server config only", placing it squarely in the server-side infrastructure category alongside hostname, MOTD, and default-state settings.

---

B6-RESULT | ktx:cvar:k_defmode | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_defmode

- canonical_id: ktx:cvar:k_defmode
- name: k_defmode
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the server's default game mode applied at first worldspawn and on full server reset -- a persistent server-level configuration value rather than a per-mode tuning knob. The description states "Set by: server config" and the source registration is src/world.c:793; this is analogous to hostname or k_defmap in character.

---

B6-RESULT | ktx:cvar:k_demo_mintime | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:k_demo_mintime

- canonical_id: ktx:cvar:k_demo_mintime
- name: k_demo_mintime
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Directly controls demo recording policy -- sets the minimum match duration below which the server discards the recorded demo file. Source at src/world.c:1005; the description explicitly frames this as preventing accumulation of "useless demo files on the server", a demo-management knob not a match-flow or scoring concern.

---

B6-RESULT | ktx:cvar:k_dis | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_dis

- canonical_id: ktx:cvar:k_dis
- name: k_dis
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls lightning-gun discharge -- the area damage dealt when firing the LG in water -- a weapon-behavior rule that applies across all modes. Registered at src/world.c:865; the three-value enum (off / normal radius damage / liquid-victims-only) is a cross-mode gameplay balance knob that fits Gameplay rules rather than any specific mode scope.

---

B6-RESULT | ktx:cvar:k_disallow_kfjump | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_disallow_kfjump

- canonical_id: ktx:cvar:k_disallow_kfjump
- name: k_disallow_kfjump
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Server-side toggle that disables the kfjump scripted forward rocket-jump trick -- a movement/weapon-use rule that applies server-wide across all modes. Registered at src/world.c:799; "Set by: server config or admin command 'tkfjump'" confirms it is a cross-mode gameplay rule rather than a mode-scoped knob.

---

B6-RESULT | ktx:cvar:k_disallow_krjump | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_disallow_krjump

- canonical_id: ktx:cvar:k_disallow_krjump
- name: k_disallow_krjump
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Server-side toggle that disables the krjump scripted vertical rocket-jump -- a cross-mode movement rule. Registered at src/world.c:800; same pattern as k_disallow_kfjump, applies server-wide to all modes, confirmed by "Set by: server config only".

---

B6-RESULT | ktx:cvar:k_disallow_weapons | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_disallow_weapons

- canonical_id: ktx:cvar:k_disallow_weapons
- name: k_disallow_weapons
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Bitmask that removes weapons from players specifically in deathmatch 4 (dmm4) during a live match -- explicitly scoped to one mode. The description states "Set by: server config or 'no_gl' / 'no_lg' admin commands in-game (dmm4 only, not during a live match)"; this matches the Mode-scoped knobs disambiguation (effect scoped to one specific mode, here dmm4).

---

B6-RESULT | ktx:cvar:k_dmgfrags | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_dmgfrags

- canonical_id: ktx:cvar:k_dmgfrags
- name: k_dmgfrags
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls the scoring system: switches frag counting from kill-based to damage-based (1 frag per 100 damage dealt). Registered at src/world.c:980; the description leads with "frags are earned by cumulative damage... instead of by kills", directly describing a frag-rule / stat-tracking change that fits Scoring & stats.

---

B6-RESULT | ktx:cvar:k_end_tele_spawn | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_end_tele_spawn

- canonical_id: ktx:cvar:k_end_tele_spawn
- name: k_end_tele_spawn
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether a specific spawn point on the map "end" is kept active -- a map-specific spawn-point rule that shapes where players can appear. Registered at src/world.c:839; the description notes "Has no effect on any other map" making it map-scoped gameplay rather than mode-scoped or server-infrastructure, best fitting Gameplay rules (spawn point policy is a gameplay rule).

---

B6-RESULT | ktx:cvar:k_entityfile | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:cvar:k_entityfile

- canonical_id: ktx:cvar:k_entityfile
- name: k_entityfile
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Stores the alternate filename stem used when locating per-map auxiliary files (bot markers, race routes, location files) -- a server-side infrastructure/path-resolution cvar set automatically on map change. Registered at src/world.c:886; while it touches bot and race subsystems, its primary role is path resolution for server-side file loading, which falls under Server config & network rather than Frogbot or Race specifically. MED confidence because it feeds both Frogbot (marker_load.c) and Race (race.c), but the cvar itself is a generic server-side path stem.

---

B6-RESULT | ktx:cvar:k_exclusive | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_exclusive

- canonical_id: ktx:cvar:k_exclusive
- name: k_exclusive
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether new player joins are rejected once the expected match player count is reached -- a match-state gate that governs who can enter before/during a match. Registered at src/world.c:940; the description's "Set by: server config or 'exclusive' admin command in-game" and the k_attendees dependency confirm this is a match-flow knob controlling player admission state transitions.

---

B6-RESULT | ktx:cvar:k_extralog | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_extralog

- canonical_id: ktx:cvar:k_extralog
- name: k_extralog
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Enables the per-match XML event log written to a server-side file at match start -- a server-side logging / output infrastructure knob. Registered at src/world.c:1004; the description frames it as "KTX opens a log file... at match start and writes a structured document", which is server infrastructure rather than gameplay rules, match flow, or scoring display.

---

B6-RESULT | ktx:cvar:k_extralog_xsd_uri | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_extralog_xsd_uri

- canonical_id: ktx:cvar:k_extralog_xsd_uri
- name: k_extralog_xsd_uri
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: URI written into the extra match log's root element to identify the XSD schema -- a purely server-side logging configuration string with no gameplay effect. Registered at src/world.c:1003; the description explicitly states "Has no effect unless k_extralog is enabled" and the only observable effect is a metadata string in the generated log file, squarely Server config & network.

---

B6-RESULT | ktx:cvar:k_exttime | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_exttime

- canonical_id: ktx:cvar:k_exttime
- name: k_exttime
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the duration of the overtime period in minutes when k_overtime is 1 (timed overtime) -- directly controls a match-state transition timer. Registered at src/world.c:855; the description's "Length of the overtime period... Has no effect under other k_overtime modes" confirms this is a match flow timing knob alongside k_overtime, prewar timers, and break lengths.

---

B6-RESULT | ktx:cvar:k_fallbunny | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_fallbunny

- canonical_id: ktx:cvar:k_fallbunny
- name: k_fallbunny
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether a hard landing triggers a "broken ankle" state that suppresses jumping -- a cross-mode movement/physics rule. Registered at src/world.c:846; the description notes "Race mode and yawnmode always behave as 1 regardless" as exceptions, confirming this is a general gameplay rule (bunnyhopping balance) not scoped to any single mode.

---

B6-RESULT | ktx:cvar:k_fbskill_aim_accuracy | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_aim_accuracy

- canonical_id: ktx:cvar:k_fbskill_aim_accuracy
- name: k_fbskill_aim_accuracy
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Frogbot AI aim tuning cvar controlling the bot's permitted aim-error tolerance in degrees before firing. Registered at src/bot_botimp.c:119; the description explicitly labels it "Frogbot AI aim tuning" and the source file is bot_botimp.c -- a direct match to the Frogbot category (k_fbskill_* family).

---

B6-RESULT | ktx:cvar:k_fbskill_aim_attack_respawns | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_aim_attack_respawns

- canonical_id: ktx:cvar:k_fbskill_aim_attack_respawns
- name: k_fbskill_aim_attack_respawns
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Frogbot AI skill tuning cvar enabling spawn-fragging behaviour for bots with a rocket launcher in duels. Registered at src/bot_botimp.c:128; the description explicitly labels it "Frogbot AI skill tuning" and the source is bot_botimp.c -- clear Frogbot category (k_fbskill_* family).

---

B6-RESULT | ktx:cvar:k_fbskill_aim_lookanywhere | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_aim_lookanywhere

- canonical_id: ktx:cvar:k_fbskill_aim_lookanywhere
- name: k_fbskill_aim_lookanywhere
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Frogbot AI tuning cvar setting the probability that the bot aims at a predicted future position rather than the enemy's current position. Registered at src/bot_botimp.c:114; the description labels it "Frogbot AI tuning cvar" and source is bot_botimp.c -- k_fbskill_* family, unambiguous Frogbot.

---

B6-RESULT | ktx:cvar:k_fbskill_aim_pitch_max | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_aim_pitch_max

- canonical_id: ktx:cvar:k_fbskill_aim_pitch_max
- name: k_fbskill_aim_pitch_max
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Frogbot AI tuning cvar capping the maximum vertical aim-error the bot can accumulate during per-frame aim randomization. Registered at src/bot_botimp.c:125; the description labels it "Frogbot AI tuning cvar" and source is bot_botimp.c -- k_fbskill_* family, unambiguous Frogbot.

---

B6-RESULT | ktx:cvar:k_fbskill_aim_pitch_min | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_aim_pitch_min

- canonical_id: ktx:cvar:k_fbskill_aim_pitch_min
- name: k_fbskill_aim_pitch_min
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Frogbot AI tuning cvar setting the minimum vertical aim-error magnitude (floor for vertical wobble) in degrees. Registered at src/bot_botimp.c:124; the description labels it "Frogbot AI tuning: minimum vertical (pitch) aim-error magnitude" and source is bot_botimp.c -- k_fbskill_* family, unambiguous Frogbot.

---
