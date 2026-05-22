# B6 Categorize -- Batch 24 ledger

Generated: 2026-05-21
Batch file: /tmp/ktx-categorize-batches/batch-24.txt
Row count: 20

---

B6-RESULT | ktx:cvar:k_ip_list | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:cvar:k_ip_list

- canonical_id: ktx:cvar:k_ip_list
- name: k_ip_list
- type: cvar

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls the permission level required to view all players' IP addresses via the `iplist` command, gated by `check_perm()` with the standard KTX permission tier enum (0/1/2/5). This is squarely an admin-permission access-control knob at src/world.c:992, matching the "admin role, designation, permission tiers" definition.

---

B6-RESULT | ktx:cvar:k_keepspectalkindemos | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:k_keepspectalkindemos

- canonical_id: ktx:cvar:k_keepspectalkindemos
- name: k_keepspectalkindemos
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether spectator chat is recorded into MVD demo files versus kept to the live QTV stream only (BPRINT_QTVONLY toggle at g_cmd.c:489). This is a demo-recording policy knob that directly governs what ends up in the saved demo, fitting "Demo & spectator -- recording, replay, spec controls, broadcast policy."

---

B6-RESULT | ktx:cvar:k_killquad | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_killquad

- canonical_id: ktx:cvar:k_killquad
- name: k_killquad
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Enables KillQuad mode, replacing the standard Quad Damage item spawn with a dropped quad mechanic that applies across all game modes (match.c:951, items.c:1974). This is a weapon/item rule that changes how a core pickup behaves globally, fitting "Gameplay rules -- weapon balance, item respawn, damage tuning that applies across all modes."

---

B6-RESULT | ktx:cvar:_k_last_cycle_map | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:cvar:_k_last_cycle_map

- canonical_id: ktx:cvar:_k_last_cycle_map
- name: _k_last_cycle_map
- type: cvar

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prefixed `_k_` and explicitly described as internal runtime state -- stores the 1-based map-cycle index, written by KTX automatically at each map transition (maps.c:690), not for manual configuration. Fits the "Internal state -- `_k_*` engine internals, set only by KTX itself, never by config" definition exactly.

---

B6-RESULT | ktx:cvar:_k_lastmap | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:cvar:_k_lastmap

- canonical_id: ktx:cvar:_k_lastmap
- name: _k_lastmap
- type: cvar

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prefixed `_k_` and explicitly described as internal -- stores the last map name played, written by KTX at map change/reset (g_main.c:531), read by FirstFrame to gate XonX reapplication (world.c:1143). Never set from config; matches "Internal state -- `_k_*` engine internals, set only by KTX itself."

---

B6-RESULT | ktx:cvar:k_lgcmode | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_lgcmode

- canonical_id: ktx:cvar:k_lgcmode
- name: k_lgcmode
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Toggle cvar for LGC (Lightning Gun Challenge) mode -- scoped entirely to that mode, blocking handicap and dmgfrags when active, requiring deathmatch 4, tracking LGC-specific stats (src/world.c:1083, referenced via LGCMODE_VARIABLE macro). The k_lgc* family is explicitly listed in the "Mode-scoped knobs" disambiguation guide.

---

B6-RESULT | ktx:cvar:k_lock_hdp | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_lock_hdp

- canonical_id: ktx:cvar:k_lock_hdp
- name: k_lock_hdp
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Locks player handicap server-wide, forcing every player's effective handicap to 100 (neutral) and refusing changes across all modes (g_utils.c:1662, 1674). This is a damage-balance tuning knob that applies globally regardless of mode, fitting "Gameplay rules -- weapon balance, item respawn, damage tuning that applies across all modes."

---

B6-RESULT | ktx:cvar:k_lockmap | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_lockmap

- canonical_id: ktx:cvar:k_lockmap
- name: k_lockmap
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prevents non-admin players from changing the map via vote and suppresses the automatic reload-to-default-map on empty/bots-only server (maps.c:434, world.c:112). This controls map-transition and server-reset behavior -- match-state transitions that bridge one match to the next -- fitting "Match flow -- prewar, ready, restart, breaks, timers, match-state transitions."

---

B6-RESULT | ktx:cvar:k_lockmax | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_lockmax

- canonical_id: ktx:cvar:k_lockmax
- name: k_lockmax
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Maximum number of teams required for a match to start; exceeding this count blocks match start with "Get rid of N teams!" (match.c:1901-1904). This directly gates match-start transitions and is part of the ready/prewar flow, fitting "Match flow -- prewar, ready, restart, breaks, timers, match-state transitions."

---

B6-RESULT | ktx:cvar:k_lockmin | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_lockmin

- canonical_id: ktx:cvar:k_lockmin
- name: k_lockmin
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Minimum number of teams required for a match to start; falling below this count blocks match start with "N more teams required!" (match.c:1884-1887). Symmetric to k_lockmax, it is a match-start gate that belongs in "Match flow -- prewar, ready, restart, breaks, timers, match-state transitions."

---

B6-RESULT | ktx:cvar:k_lockmode | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_lockmode

- canonical_id: ktx:cvar:k_lockmode
- name: k_lockmode
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether new player joins are allowed during a live match (unlocked / team-locked / fully locked), gating player entry at client.c:1343-1352. This is a mid-match state-transition control that governs who can participate once the match has begun, fitting "Match flow -- match-state transitions."

---

B6-RESULT | ktx:cvar:__k_ls | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:cvar:__k_ls

- canonical_id: ktx:cvar:__k_ls
- name: __k_ls
- type: cvar

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prefixed `__k_` (double underscore) and described as the internal write cursor for the match-results ring buffer; set automatically after each match by the lastscores machinery (commands.c:6961), never by config. The registration comment at src/world.c:1036 explicitly calls it "current lastscore, really internal mod usage," firmly placing it in "Internal state."

---

B6-RESULT | ktx:cvar:k_matchless_countdown | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_matchless_countdown

- canonical_id: ktx:cvar:k_matchless_countdown
- name: k_matchless_countdown
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether the pre-game countdown and "The match has begun!" announcement fire in matchless mode (match.c:2460-2465, 1294). This is a match-start-transition knob specifically governing the countdown timer behavior, fitting "Match flow -- prewar, ready, restart, breaks, timers, match-state transitions."

---

B6-RESULT | ktx:cvar:k_maxclients | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_maxclients

- canonical_id: ktx:cvar:k_maxclients
- name: k_maxclients
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the ceiling for the engine's maxclients value when adjusted in-game (commands.c:8039, 8046), controlling how many player slots the server can have. This is a server capacity / slot-management knob registered at src/world.c:989, fitting "Server config & network -- rates, slots, hostname, MOTD, sv_* server-side."

---

B6-RESULT | ktx:cvar:k_maxspectators | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_maxspectators

- canonical_id: ktx:cvar:k_maxspectators
- name: k_maxspectators
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the ceiling for spectator slots (maxspectators) when adjusted in-game via up/down controls (commands.c:8033-8046). This is a server-capacity / slot-management knob symmetric to k_maxclients, fitting "Server config & network -- rates, slots, hostname, MOTD."

---

B6-RESULT | ktx:cvar:k_membercount | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_membercount

- canonical_id: ktx:cvar:k_membercount
- name: k_membercount
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Minimum players required per team before a match can start; blocks match start if any team is below the count (match.c:1927, CheckMembers). This is a match-start gate in the prewar/ready phase, fitting "Match flow -- prewar, ready, restart, breaks, timers, match-state transitions."

---

B6-RESULT | ktx:cvar:k_minrate | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_minrate

- canonical_id: ktx:cvar:k_minrate
- name: k_minrate
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Server-enforced minimum network rate (bytes/sec) for connecting players and spectators; force-corrects clients below the threshold (client.c:96-115). This is a network rate / connectivity policy knob registered at src/world.c:880, fitting "Server config & network -- rates, slots, hostname, MOTD, broadcast intervals."

---

B6-RESULT | ktx:cvar:k_mode | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:cvar:k_mode

- canonical_id: ktx:cvar:k_mode
- name: k_mode
- type: cvar

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the server's game type (1=duel, 2=team, 3=ffa, 4=ctf), as confirmed by the gameType_t enum at include/g_local.h:162-169 and consumed by isDuel/isTeam/isFFA/isCTF checks throughout. This cvar directly selects the active game mode, fitting "Mode selection -- commands/cvars that switch the active mode." Note: the disambiguation guide lists mode selection as "commands an admin runs," but k_mode is the underlying server-config cvar that sets the mode persistently; it is the closest match for a cvar that directly determines which mode is active.

---

B6-RESULT | ktx:cvar:k_monster_spawn_time | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_monster_spawn_time

- canonical_id: ktx:cvar:k_monster_spawn_time
- name: k_monster_spawn_time
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls the base respawn delay for monsters in SP/coop skill-3+ modes, including the random jitter and the 0=disabled behavior (combat.c:285-288, sp_monsters.c:785). This is a gameplay rule governing item/entity respawn behavior (monster respawn timing) at src/world.c:1020, fitting "Gameplay rules -- weapon balance, item respawn, damage tuning that applies across all modes."

---

B6-RESULT | ktx:cvar:k_motd_time | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_motd_time

- canonical_id: ktx:cvar:k_motd_time
- name: k_motd_time
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls how long the MOTD (message of the day) is displayed to connecting players in seconds, clamped to 0-30 with a fallback default (motd.c:139, 147). MOTD display is a server presentation / connectivity configuration concern registered at src/world.c:841, fitting "Server config & network -- rates, slots, hostname, MOTD, broadcast intervals."

---
