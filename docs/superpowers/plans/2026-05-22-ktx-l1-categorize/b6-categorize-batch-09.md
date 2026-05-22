# B6 Categorize -- Batch 09

Generated: 2026-05-21 | Model: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:command:mkick | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:mkick

- canonical_id: ktx:command:mkick
- name: mkick
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: mkick is an admin-only command (is_adm gate) that kicks one or more clients by numeric user ID. The description and source (src/admin.c:174) confirm it is exclusively an admin action, placing it squarely in Admin & permissions alongside ban management and other admin-tier commands.

---

B6-RESULT | ktx:command:mmode | NEW-CATEGORY-NEEDED | proposed=Player messaging | rev=1

### ktx:command:mmode (NEW CATEGORY NEEDED)

- canonical_id: ktx:command:mmode
- proposed category: Player messaging
- justification: mmode sets a per-player "message mode" -- the implicit recipient for subsequent say-family macros and the 's-m' private message command. It manages messaging targets (off / player / team / multi / name / rcon), not server infrastructure, admin permissions, match flow, gameplay rules, or any mode-specific knob. The rcon sub-mode is a messaging target, not an admin gate (any VIP with rcon password can use it). None of the 13 locked categories covers player-to-player or player-to-target messaging configuration. A "Player messaging" category would also cover `multi`, `newcomer`, and similar per-player communication commands.

---

B6-RESULT | ktx:command:moreinfo | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:moreinfo

- canonical_id: ktx:command:moreinfo
- name: moreinfo
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: moreinfo is a spectator-only command (src/commands.c:7151) that cycles the caller's extra-info detail level, controlling how much live item and powerup pickup information the spectator receives. Its scope is entirely within the spectator subsystem, aligning with Demo & spectator which covers spec controls.

---

B6-RESULT | ktx:command:motd | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:motd

- canonical_id: ktx:command:motd
- name: motd
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: motd re-displays the server's message-of-the-day, a server-identity artifact explicitly listed in the disambiguation guide under Server config & network. The source handler (src/commands.c:6675) confirms this is MOTD display delivery, gated on match state and matchless mode.

---

B6-RESULT | ktx:command:move:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:move:frogbot:editor

- canonical_id: ktx:command:move:frogbot:editor
- name: move:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This is a frogbot waypoint editor sub-command (editor_commands[] at src/bot_commands.c:2332) that relocates the nearest routing marker to the editor player's position. It is unambiguously part of the Frogbot subsystem, matching the disambiguation guide's "waypoints (k_fb*, k_fbskill_*, fb commands)" scope.

---

B6-RESULT | ktx:command:multi | NEW-CATEGORY-NEEDED | proposed=Player messaging | rev=1

### ktx:command:multi (NEW CATEGORY NEEDED)

- canonical_id: ktx:command:multi
- proposed category: Player messaging
- justification: multi edits and prints the caller's "multi recipient set" -- the custom group of players targeted by the 's-m' private message command (src/g_cmd.c:828). It is purely a player-side messaging configuration command: it sets who gets private messages sent with 's-m'. None of the 13 locked categories covers player-to-player messaging targeting. This belongs in a "Player messaging" category alongside mmode and newcomer.

---

B6-RESULT | ktx:command:n | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:n

- canonical_id: ktx:command:n
- name: n
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: 'n' is the "decline kick" response in the interactive admin kick walkthrough (handler DontKick at src/admin.c:286). It is meaningful only during an admin-initiated kick session, pairing with 'y' (confirm kick). It is an admin-tier action, fitting Admin & permissions alongside mkick and other admin kick/ban management commands.

---

B6-RESULT | ktx:command:newcomer | NEW-CATEGORY-NEEDED | proposed=Player messaging | rev=1

### ktx:command:newcomer (NEW CATEGORY NEEDED)

- canonical_id: ktx:command:newcomer
- proposed category: Player messaging
- justification: newcomer sends a chat greeting message addressed to the most recently joined player (src/commands.c:1802, via SendMessage which issues a 'say <name>' call). It is a player-initiated messaging convenience command, not an admin action, not a gameplay rule, not a server config item, and not any form of vote or match flow control. None of the 13 locked categories covers player-originated chat/greeting messaging commands. "Player messaging" is the natural home alongside mmode and multi.

---

B6-RESULT | ktx:command:next_best | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:next_best

- canonical_id: ktx:command:next_best
- name: next_best
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: next_best switches a spectator's point-of-view to the next top-ranked player (handler next_best at src/commands.c:6311, registered CF_SPECTATOR). It is a spectator POV control command, fitting Demo & spectator which covers spec controls.

---

B6-RESULT | ktx:command:next_map | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:next_map

- canonical_id: ktx:command:next_map
- name: next_map
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: next_map casts or withdraws a player's vote to end the current map and cycle to the next one (handler PlayerBreak at src/match.c:2970, vote threshold via OV_BREAK). The description explicitly describes a vote mechanic gated by k_no_vote_map, placing it in Voting alongside other vote-type commands.

---

B6-RESULT | ktx:command:next_pow | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:next_pow

- canonical_id: ktx:command:next_pow
- name: next_pow
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: next_pow cycles a spectator's POV to the next player holding a powerup (handler next_pow at src/commands.c:6342, registered CF_SPECTATOR | CF_MATCHLESS). It is a spectator camera control command, fitting Demo & spectator.

---

B6-RESULT | ktx:command:no | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:no

- canonical_id: ktx:command:no
- name: no
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: 'no' withdraws the caller's previously-cast vote in generic votes or admin elections (handler VoteNo at src/vote.c:143). It is the vote-withdrawal counterpart to 'yes', operating within the voting subsystem alongside other vote-management commands.

---

B6-RESULT | ktx:command:noga | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:noga

- canonical_id: ktx:command:noga
- name: noga
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: noga is a CTF-only admin command that toggles k_ctf_ga (green armor spawn), a cvar scoped exclusively to CTF mode (src/ctf.c:788, isCTF() gate). The command administers a mode-scoped setting; Mode-scoped knobs is the correct bucket despite the guide text emphasizing cvars, since this command's sole purpose is toggling a CTF-specific mode knob. Confidence MED because the guide says "cvars" but this is a command acting on a mode-scoped cvar.

---

B6-RESULT | ktx:command:no_gl | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:no_gl

- canonical_id: ktx:command:no_gl
- name: no_gl
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: no_gl is an alias for '/noweapon gl', toggling the grenade launcher's allowed/disallowed state in the k_disallow_weapons bitmask, gated to dmm4 only (src/commands.c:5245). Its effect is scoped exclusively to deathmatch mode 4, which matches the Mode-scoped knobs k_dmm4_* family. Confidence MED because this is a command administering a dmm4-scoped rule, not a cvar itself.

---

B6-RESULT | ktx:command:nohook | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:nohook

- canonical_id: ktx:command:nohook
- name: nohook
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: nohook is a CTF-only admin command that toggles k_ctf_hook (grappling hook), scoped exclusively to CTF mode (src/ctf.c:758, isCTF() gate). It administers a CTF-mode-specific knob, fitting Mode-scoped knobs. Confidence MED for the same reason as noga (command administering a mode-scoped cvar, not a cvar itself).

---

B6-RESULT | ktx:command:noitems | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:noitems

- canonical_id: ktx:command:noitems
- name: noitems
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: noitems toggles the noitems mode (k_noitems) which controls whether items are present in the game, an item-availability rule that applies across all modes (src/commands.c:8926, gated only on match_in_progress -- no mode-specific gate). The description says "noitems mode on or off" affecting all item spawning server-wide, aligning with Gameplay rules (item respawn tuning).

---

B6-RESULT | ktx:command:no_lg | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:no_lg

- canonical_id: ktx:command:no_lg
- name: no_lg
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: no_lg is an alias for '/noweapon lg', toggling the lightning gun's allowed/disallowed state in the k_disallow_weapons bitmask, gated to dmm4 only (src/commands.c:5305). Same reasoning as no_gl: effect is scoped exclusively to dmm4, fitting the Mode-scoped knobs k_dmm4_* family. Confidence MED (command administering a dmm4-scoped rule).

---

B6-RESULT | ktx:command:norunes | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:norunes

- canonical_id: ktx:command:norunes
- name: norunes
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: norunes is a CTF-only admin command that toggles k_ctf_runes, scoped exclusively to CTF mode (src/ctf.c:724, isCTF() gate). It administers a CTF-specific rune setting, fitting Mode-scoped knobs. Confidence MED (command administering a mode-scoped cvar).

---

B6-RESULT | ktx:command:nospecs | CATEGORIZED | category=Spectator chat & visibility | confidence=HIGH

### ktx:command:nospecs

- canonical_id: ktx:command:nospecs
- name: nospecs
- type: command

- NEW category_inferred: Spectator chat & visibility
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: nospecs casts a vote or admin command to enable No-spectators mode, which disconnects all spectators except VIPs, real admins, and coaches (src/vote.c:993). Its core function is controlling who may be a spectator -- spectator access and visibility policy -- placing it in Spectator chat & visibility (which covers spec-chat policy and spectator visibility). The voting mechanism is secondary to the spec-policy effect.

---

B6-RESULT | ktx:command:nosweep | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:nosweep

- canonical_id: ktx:command:nosweep
- name: nosweep
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: nosweep toggles NoSweep mode (k_nosweep), which restricts players from sweeping weapons -- a gameplay rule about weapon mechanics that applies in dmm1 (src/commands.c:7705, deathmatch==1 gate + rules-change-allowed gate). Weapon balance and gameplay restriction rules fall under Gameplay rules. The dmm1 gate is a precondition for setting the rule, not a mode-scoped effect limited to dmm1 gameplay (nosweep is a match-configuration rule, not a mode-specific cvar).

---
