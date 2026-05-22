# B6 categorize -- batch 14 ledger

Generated: 2026-05-22
Batch file: /tmp/ktx-categorize-batches/batch-14.txt
Rows: 20

---

B6-RESULT | ktx:command:s-l | CATEGORIZED | category=Server config & network | confidence=LOW

### ktx:command:s-l

- canonical_id: ktx:command:s-l
- name: s-l
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: s-l is an in-game player private-messaging command (send to last s-p recipient). It does not fit Admin & permissions, Match flow, Gameplay rules, Mode selection, Mode-scoped knobs, Frogbot, Race, Demo & spectator, Spectator chat & visibility, Scoring & stats, or Internal state. The closest fit among the 13 locked categories is Server config & network as a residual "other player communication" bucket, but this is a weak fit -- the command is a directed in-game private chat relay, not a server-config or network knob. Confidence LOW because no locked category cleanly covers player-to-player directed messaging.

---

B6-RESULT | ktx:command:slowready | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:slowready

- canonical_id: ktx:command:slowready
- name: slowready
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: slowready is a variant of the ready command that marks a player as ready for match start but skips the idle-player check. It directly participates in match-state transitions (prewar -> ready phase) and is defined by its effect on match flow mechanics. Source: src/commands.c:708, behavior at src/match.c:2960 (PlayerSlowReady -> PlayerReady(false)).

---

B6-RESULT | ktx:command:s-m | CATEGORIZED | category=Server config & network | confidence=LOW

### ktx:command:s-m

- canonical_id: ktx:command:s-m
- name: s-m
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: s-m sends a private message to a player's configured multi-recipient set. Like s-l, it is an in-game player communication command with no match-flow, gameplay-rules, mode-scoped, admin, voting, frogbot, race, demo/spectator, scoring, or internal-state role. Placed in Server config & network as the residual bucket. Confidence LOW -- the same note as s-l applies: no locked category cleanly covers player-to-player directed group messaging.

---

B6-RESULT | ktx:command:socd | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:socd

- canonical_id: ktx:command:socd
- name: socd
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: socd cycles the SOCD (simultaneous opposing cardinal direction) enforcement level (0-3: allow / stats-only / warn / kick). It is an admin command that controls a player-behaviour-policing policy -- the description confirms it cannot be run during a live match and is an admin-gated enforcement knob. Source: src/commands.c:1040, handler at commands.c:9398. Fits Admin & permissions clearly.

---

B6-RESULT | ktx:command:s-p | CATEGORIZED | category=Server config & network | confidence=LOW

### ktx:command:s-p

- canonical_id: ktx:command:s-p
- name: s-p
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: s-p sends a private message to one named player. Same classification rationale as s-l and s-m: in-game player directed-messaging command with no fit in any specific locked category. Server config & network is used as the residual bucket. Confidence LOW.

---

B6-RESULT | ktx:command:spawn | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:spawn

- canonical_id: ktx:command:spawn
- name: spawn
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: spawn cycles the respawn model (k_spw) through -1..4 (pre-qtest nonrandom / Normal QW / KT SpawnSafety / Kombat Teams / KTX / KTX2 respawns). Respawn behavior is a fundamental gameplay rule that applies across all modes -- it is not scoped to a single mode. Source: src/commands.c:717, ToggleRespawns at src/commands.c:2676. Fits Gameplay rules.

---

B6-RESULT | ktx:command:spawn666time | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:spawn666time

- canonical_id: ktx:command:spawn666time
- name: spawn666time
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: spawn666time reads or sets the spawn invincibility (pentagram) duration for DMM4 only -- the handler explicitly returns "command allowed in dmm4 only" when deathmatch != 4. This is a tuning knob scoped entirely to one specific mode (k_dmm4_* family territory). Source: src/commands.c:1035, handler at src/commands.c:8890. Fits Mode-scoped knobs.

---

B6-RESULT | ktx:command:spawnicide | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:spawnicide

- canonical_id: ktx:command:spawnicide
- name: spawnicide
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: spawnicide cycles the mode that kills players camping a spawn point (0=off / 1=prewar / 2=match). This is a cross-mode gameplay rule (not scoped to one specific mode) that governs respawn-point behaviour and fairness. Source: src/commands.c:719, ToggleSpawnicide at src/commands.c:2734. Fits Gameplay rules.

---

B6-RESULT | ktx:command:spawn_show | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:spawn_show

- canonical_id: ktx:command:spawn_show
- name: spawn_show
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: spawn_show cycles the spawn-point visibility mode (k_spm_show: off / prewar / match). Controlling which phase spawn points are visible is a cross-mode gameplay rule affecting all players, not scoped to any one specific mode. Source: src/commands.c:718, ToggleSpawnPoints at src/commands.c:2700. Fits Gameplay rules.

---

B6-RESULT | ktx:command:speed | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:speed

- canonical_id: ktx:command:speed
- name: speed
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: speed is an admin command that toggles sv_maxspeed between 320 and the server's k_highspeed value. It is explicitly gated to admin use (not a player command), applies server-wide, and is blocked during a live match. Source: src/commands.c:757, ToggleSpeed at src/commands.c:3215. Fits Admin & permissions.

---

B6-RESULT | ktx:command:s-r | CATEGORIZED | category=Server config & network | confidence=LOW

### ktx:command:s-r

- canonical_id: ktx:command:s-r
- name: s-r
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: s-r sends a private reply to the last player who messaged the caller via s-p. Same classification rationale as s-l, s-m, s-p: in-game player directed-messaging command with no specific locked-category fit. Server config & network is the residual bucket. Confidence LOW.

---

B6-RESULT | ktx:command:s-t | CATEGORIZED | category=Server config & network | confidence=LOW

### ktx:command:s-t

- canonical_id: ktx:command:s-t
- name: s-t
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: s-t sends a private message to a named group (player / spectator / admin / team). Same classification rationale as the s-* siblings: in-game group-directed messaging command with no specific locked-category fit. The "admin" selector does not make this an Admin & permissions entity (it targets admins as recipients, not grants admin control). Server config & network is the residual bucket. Confidence LOW.

---

B6-RESULT | ktx:command:stats | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:stats

- canonical_id: ktx:command:stats
- name: stats
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: stats prints end-of-match player statistics (frags, rank, friendly kills, efficiency) grouped by team, with CTF and Race Arena branches. The description explicitly identifies it as a post-match stats output command. Source: src/commands.c:704, PlayerStats at src/commands.c:3558. Fits Scoring & stats exactly.

---

B6-RESULT | ktx:command:status1 | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:status1

- canonical_id: ktx:command:status1
- name: status1
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: status1 prints the first page of server settings: maxspeed, deathmatch mode, teamplay, time limit, frag limit, powerups, discharge, drop-quad, drop-ring, fair backpacks, drop-backpacks, spectator-info permission, teleteam, berzerk, and live match state. It is a read-only server-state inspection command covering server configuration. Source: src/commands.c:710, ModStatus1 at src/commands.c:1860. Fits Server config & network.

---

B6-RESULT | ktx:command:status2 | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:status2

- canonical_id: ktx:command:status2
- name: status2
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: status2 prints a second page of server settings: respawn model, game mode, spectalk, overtime setting, CTF/team server-locking mode, hook/runes/grapple, and team-count info. Like status1, it is a read-only server-state inspection command. Source: src/commands.c:711, ModStatus2 at src/commands.c:1932. Fits Server config & network.

---

B6-RESULT | ktx:command:suggestcolor | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:suggestcolor

- canonical_id: ktx:command:suggestcolor
- name: suggestcolor
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: suggestcolor starts an election proposing that one or more players change their shirt/pants color. The description explicitly identifies it as a vote/election mechanism: requires 3+ players, no concurrent election, cooldown gate, calling again withdraws the vote. Source: src/commands.c:805, SuggestColorVote at src/vote.c:1679. Fits Voting.

---

B6-RESULT | ktx:command:summary:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:summary:frogbot:editor

- canonical_id: ktx:command:summary:frogbot:editor
- name: summary:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: summary:frogbot:editor is a frogbot editor-mode command that prints a diagnostic summary of the current map's bot-routing markers (problem markers, path/zone gaps, total count). It is registered in editor_commands[] (src/bot_commands.c:2348) and gated behind FB_OPTION_EDITOR_MODE. Fits Frogbot exactly.

---

B6-RESULT | ktx:command:swapall | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:swapall

- canonical_id: ktx:command:swapall
- name: swapall
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: swapall casts or withdraws a per-player vote to swap all players to opposing teams in CTF; once enough votes are collected, the swap executes. The description confirms the vote-toggle mechanic (vote tally broadcast, vote_check_swapall()). Source: src/commands.c:925, SwapAll at src/commands.c:6633. Fits Voting.

---

B6-RESULT | ktx:command:teamoverlay | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:teamoverlay

- canonical_id: ktx:command:teamoverlay
- name: teamoverlay
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: teamoverlay casts or withdraws a per-player vote to toggle the server's team-overlay HUD permission (k_teamoverlay); admins may toggle directly. The description confirms the vote-toggle mechanic with tally broadcast and vote_check_teamoverlay(). Source: src/commands.c:1034, teamoverlay at src/vote.c:1073. Fits Voting.

---

B6-RESULT | ktx:command:teleportcap | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:teleportcap

- canonical_id: ktx:command:teleportcap
- name: teleportcap
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: teleportcap sets k_teleport_cap -- the teleport momentum cap for yawn mode. The handler explicitly requires yawn mode to be on ("Yawn mode required to be on") and applies yawn-mode settings immediately via FixYawnMode(). This is a knob scoped entirely to yawn mode. Source: src/commands.c:998, setTeleportCap at src/commands.c:8655. Fits Mode-scoped knobs.

---
