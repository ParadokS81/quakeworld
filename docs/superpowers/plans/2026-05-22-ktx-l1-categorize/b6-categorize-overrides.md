# B6 categorize -- OVERRIDES ledger (v2 amendment + hand-fixes)

**Authored 2026-05-22 by orchestrator (claude-opus-4-7), after operator review of Phase 3 fan-out aggregation.**

## Why this ledger exists

Phase 3 fan-out surfaced 4 explicit `NEW-CATEGORY-NEEDED` rows plus a recurring MED/LOW-confidence pattern across ~16 borderline rows. Operator review concluded that a 14th category -- **Player communication** -- captures the missing semantic and is a defensible addition.

This ledger:

1. Amends the locked category list from v1 (13 entries) to v2 (14 entries) by adding `Player communication`.
2. Hand-overrides the 3 `NEW-CATEGORY-NEEDED` messaging rows (mmode / multi / newcomer) into the new category. These rows have no `category_inferred` from fan-out (their `### canonical_id (NEW CATEGORY NEEDED)` header was deliberately not parsed by the apply script), so the override here is their only assignment.
3. Hand-overrides 15 borderline MED/LOW-confidence rows that fell back to `Gameplay rules` / `Server config & network` during fan-out but are structurally about player-to-player communication. The apply script's natural-order processing (overrides ledger lands last alphabetically) means these overrides win.
4. Folds the one non-messaging `NEW-CATEGORY-NEEDED` row (callalias -- a player-facing alias-scheduling utility, NOT messaging) into `Server config & network` as a one-off.

Total overrides: **19 rows** (18 → Player communication, 1 → Server config & network).

## Amended category list v2 (LOCKED 2026-05-22)

```
 1. Admin & permissions
 2. Voting
 3. Match flow
 4. Gameplay rules
 5. Mode selection
 6. Mode-scoped knobs
 7. Frogbot
 8. Race
 9. Demo & spectator
10. Spectator chat & visibility
11. Scoring & stats
12. Server config & network
13. Internal state
14. Player communication            -- NEW (v2 amendment)
```

**Definition of Player communication:** Commands and cvars that configure or invoke player-to-player or player-to-team messaging mechanics in-game -- private message targeting (mmode, multi, s-* family), team audio cues (ksound1-6), team status broadcasts (report, tpmsg), and player-facing chat helpers (killer, victim, newcomer). Distinct from `Spectator chat & visibility` (which governs spec-chat policy) and from `Gameplay rules` (which governs weapon/item/damage tuning). Spans pre-match and active-match phases -- communication mechanics are mode-agnostic.

## Provenance for overrides

All override rows below carry:

```
NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override
```

This distinguishes them from the Sonnet-fanout assignments (`claude-sonnet-4-6|b6-categorize-v1`) and signals the v2 amendment for any future audit.

---

### ktx:command:mmode

- canonical_id: ktx:command:mmode
- name: mmode
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Sets the caller's implicit message-mode (off / player / team / multi / name / rcon), used by subsequent say-family macros and the s-m private-message command. Pure player-to-player messaging configuration; not server infrastructure or admin. Sub-agent (batch-09) flagged this as NEW-CATEGORY-NEEDED with proposed "Player messaging"; v2 adopts the equivalent name "Player communication".

---

### ktx:command:multi

- canonical_id: ktx:command:multi
- name: multi
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Edits and prints the caller's "multi recipient set" -- the custom group of players targeted by the s-m private-message command. Pure messaging-target configuration. Sub-agent (batch-09) flagged NEW-CATEGORY-NEEDED with proposed "Player messaging".

---

### ktx:command:newcomer

- canonical_id: ktx:command:newcomer
- name: newcomer
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Sends a chat greeting to the most recently joined player via SendMessage. Player-initiated messaging helper. Sub-agent (batch-09) flagged NEW-CATEGORY-NEEDED with proposed "Player messaging".

---

### ktx:command:ksound1

- canonical_id: ktx:command:ksound1
- name: ksound1
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Plays team audio cue 1 (ktsound1.wav) to teammates with KT sounds enabled, in team or CTF games. Sub-agent assigned Gameplay rules MED, noting "no team communication category exists". v2 adopts Player communication as the natural home for in-game team audio cues.

---

### ktx:command:ksound2

- canonical_id: ktx:command:ksound2
- name: ksound2
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Plays team audio cue 2 (ktsound2.wav) to teammates with KT sounds enabled. Same shape as ksound1. Fan-out: Gameplay rules MED.

---

### ktx:command:ksound3

- canonical_id: ktx:command:ksound3
- name: ksound3
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Plays team audio cue 3 (ktsound3.wav). Same shape as ksound1/2. Fan-out: Gameplay rules MED.

---

### ktx:command:ksound4

- canonical_id: ktx:command:ksound4
- name: ksound4
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Plays team audio cue 4 (ktsound4.wav) to teammates in team/CTF games. Fan-out: Gameplay rules MED.

---

### ktx:command:ksound5

- canonical_id: ktx:command:ksound5
- name: ksound5
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Plays team audio cue 5 (ktsound5.wav). Same shape as ksound4. Fan-out: Gameplay rules MED.

---

### ktx:command:ksound6

- canonical_id: ktx:command:ksound6
- name: ksound6
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Plays team audio cue 6 (ktsound6.wav). Same shape as ksound4/5. Fan-out: Gameplay rules MED.

---

### ktx:command:killer

- canonical_id: ktx:command:killer
- name: killer
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Opens a chat line pre-filled with the name of the player who last killed you; supports premsg/postmsg userinfo wrapping. Player-to-player chat helper, not a gameplay rule. Fan-out: Gameplay rules MED with explicit "no player communication category" note.

---

### ktx:command:report

- canonical_id: ktx:command:report
- name: report
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Broadcasts a team-wide status report (armor/health/weapon/ammo/powerups) to all teammates including dead players. Cross-mode team-communication command. Fan-out: Gameplay rules MED with explicit "no Teamplay sub-category" note.

---

### ktx:command:s-l

- canonical_id: ktx:command:s-l
- name: s-l
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Private message to last s-p recipient. Sub-agent placed it in Server config & network as residual bucket with LOW confidence, explicitly flagging that no player-communication category covered it.

---

### ktx:command:s-m

- canonical_id: ktx:command:s-m
- name: s-m
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Private message to the multi-recipient set. Same residual placement as s-l in fan-out (Server config & network LOW).

---

### ktx:command:s-p

- canonical_id: ktx:command:s-p
- name: s-p
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Private message to one named player. Same residual placement as s-l/s-m in fan-out (Server config & network LOW).

---

### ktx:command:s-r

- canonical_id: ktx:command:s-r
- name: s-r
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Private reply to last s-p sender. Same residual placement as s-l/s-m/s-p in fan-out (Server config & network LOW).

---

### ktx:command:s-t

- canonical_id: ktx:command:s-t
- name: s-t
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Group-directed message (player / spectator / admin / team selector). The "admin" selector targets admins as recipients, not as a permission gate. Same residual placement as s-l/s-m/s-p/s-r in fan-out (Server config & network LOW).

---

### ktx:command:tpmsg

- canonical_id: ktx:command:tpmsg
- name: tpmsg
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Sends a predefined teamplay status message by name. Player-invokable team-communication command. Fan-out: Gameplay rules MED with explicit "no player communication" note.

---

### ktx:command:victim

- canonical_id: ktx:command:victim
- name: victim
- type: command

- NEW category_inferred: Player communication
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Sends a chat message to the player you most recently fragged, with premsg/postmsg wrapping. Player-to-player chat helper. Fan-out: Gameplay rules MED.

---

### ktx:command:callalias

- canonical_id: ktx:command:callalias
- name: callalias
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-opus-4-7|b6-categorize-v2-override

- reasoning: Schedules a player's own client alias to execute automatically after a delay (during the early-connection window). NOT messaging -- this is a client-scripting / handshake-window utility. Sub-agent (batch-02) flagged NEW-CATEGORY-NEEDED with proposed "Client scripting & automation"; v2 does not add that as a separate category because callalias is a single instance. Folded into Server config & network as the residual server-side player-utility bucket.

---
