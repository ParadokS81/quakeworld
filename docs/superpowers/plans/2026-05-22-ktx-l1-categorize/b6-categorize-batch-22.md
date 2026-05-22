# B6 Categorize -- Batch 22

Generated: 2026-05-21
Batch file: /tmp/ktx-categorize-batches/batch-22.txt
Entities: 20

---

B6-RESULT | ktx:cvar:k_fbskill_vol_max | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_max

- canonical_id: ktx:cvar:k_fbskill_vol_max
- name: k_fbskill_vol_max
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This cvar tunes the ceiling of the Frogbot AI's per-target aim-volatility scalar, registered in src/bot_botimp.c and consumed exclusively by the bot aim model (bot_aim.c:299-301). It is a k_fbskill_* family member controlling bot skill behavior, squarely within the Frogbot category.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_min | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_min

- canonical_id: ktx:cvar:k_fbskill_vol_min
- name: k_fbskill_vol_min
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the minimum floor for the Frogbot's per-target aim-volatility scalar; registered in src/bot_botimp.c and read by the bot aim model (bot_aim.c:299-301). A k_fbskill_* tuning cvar -- pure Frogbot category.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_oppdir_incr | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_oppdir_incr

- canonical_id: ktx:cvar:k_fbskill_vol_oppdir_incr
- name: k_fbskill_vol_oppdir_incr
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Tunes how much the Frogbot's aim volatility increases based on divergence between bot and enemy movement directions; registered in src/bot_botimp.c:140 and applied at bot_aim.c:279. A k_fbskill_* volatility sub-model cvar -- Frogbot category.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_opp_midair_incr | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_opp_midair_incr

- canonical_id: ktx:cvar:k_fbskill_vol_opp_midair_incr
- name: k_fbskill_vol_opp_midair_incr
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Adds aim-volatility increment when the bot's opponent is airborne; registered in src/bot_botimp.c:153, applied at bot_aim.c:296 gated on target's FL_ONGROUND check. A k_fbskill_* Frogbot AI tuning cvar.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_oppvel | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_oppvel

- canonical_id: ktx:cvar:k_fbskill_vol_oppvel
- name: k_fbskill_vol_oppvel
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the enemy horizontal speed threshold above which the Frogbot's aim volatility increases; registered in src/bot_botimp.c:138, read at bot_aim.c:267-268 against opponent velocity. A k_fbskill_* Frogbot tuning cvar.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_oppvel_incr | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_oppvel_incr

- canonical_id: ktx:cvar:k_fbskill_vol_oppvel_incr
- name: k_fbskill_vol_oppvel_incr
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the aim-volatility increment when the enemy moves above the k_fbskill_vol_oppvel speed threshold; registered in src/bot_botimp.c:139, applied at bot_aim.c:270. A k_fbskill_* Frogbot aim-model tuning cvar.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_ownvel_incr | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_ownvel_incr

- canonical_id: ktx:cvar:k_fbskill_vol_ownvel_incr
- name: k_fbskill_vol_ownvel_incr
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The aim-volatility increment applied when the bot's own speed exceeds k_fbskill_vol_ownvel; registered in src/bot_botimp.c:137, applied at bot_aim.c:262. A k_fbskill_* Frogbot AI tuning cvar controlling own-movement aim penalty magnitude.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_pain_incr | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_pain_incr

- canonical_id: ktx:cvar:k_fbskill_vol_pain_incr
- name: k_fbskill_vol_pain_incr
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Adds aim-volatility when the Frogbot has taken damage in the last second (guarded by !lgc_enabled); registered in src/bot_botimp.c:151, applied at bot_aim.c:285. A k_fbskill_* Frogbot AI damage-response tuning cvar.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_reduce | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_reduce

- canonical_id: ktx:cvar:k_fbskill_vol_reduce
- name: k_fbskill_vol_reduce
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Per-frame multiplicative decay factor for the Frogbot's aim-volatility scalar; registered in src/bot_botimp.c:135, applied at bot_aim.c:256 and :300. A k_fbskill_* Frogbot tuning cvar controlling how quickly aim steadies on a held target.

---

B6-RESULT | ktx:cvar:k_fbskill_wiggleframes | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_wiggleframes

- canonical_id: ktx:cvar:k_fbskill_wiggleframes
- name: k_fbskill_wiggleframes
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the amplitude of the Frogbot's side-to-side wiggle-run in dmm4; registered in src/bot_botimp.c:145, consumed by bot_movement.c:242-266. A k_fbskill_* Frogbot movement-behavior tuning cvar.

---

B6-RESULT | ktx:cvar:k_force_mapcycle | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_force_mapcycle

- canonical_id: ktx:cvar:k_force_mapcycle
- name: k_force_mapcycle
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Forces the server to use the map cycle even when deathmatch is 0; read in src/client.c:580 at the post-intermission level-select path. This is a server configuration knob controlling level-change behavior, not scoped to any game mode -- Server config & network.

---

B6-RESULT | ktx:cvar:k_fp | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_fp

- canonical_id: ktx:cvar:k_fp
- name: k_fp
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Selects the flood-protection profile for player chat (say/say_team); registered in src/world.c:1007, read in g_cmd.c:165 to index the say_fp_levels[] table. A server-side anti-spam/network policy setting -- Server config & network.

---

B6-RESULT | ktx:cvar:k_fp_spec | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_fp_spec

- canonical_id: ktx:cvar:k_fp_spec
- name: k_fp_spec
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Spectator counterpart of k_fp: selects the flood-protection profile for spectator chat; registered in src/world.c:1008, read in g_cmd.c:166 via the same say_fp_levels[] table. A server-side network/chat policy setting -- Server config & network.

---

B6-RESULT | ktx:cvar:k_free_mode | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:cvar:k_free_mode

- canonical_id: ktx:cvar:k_free_mode
- name: k_free_mode
- type: cvar

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the permission tier required to issue mode-switch commands (XonX, ffa, ctf, etc.); enforced by check_perm() in commands.c:4723 via the standard KTX permission ladder (0=none/1=real-admin/2=admin/5=all). This is an access-control / permission-tier cvar -- Admin & permissions.

---

B6-RESULT | ktx:cvar:k_freeze | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_freeze

- canonical_id: ktx:cvar:k_freeze
- name: k_freeze
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether map entities (platforms, doors, trains) are frozen during warm-up and pre-match; read in doors.c:231, plats.c:126, doors.c:290/944, and triggers.c:1122 as part of the match-state transition logic. This is a match-flow knob governing pre-match entity behavior until the match starts.

---

B6-RESULT | ktx:cvar:k_freshteams | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_freshteams

- canonical_id: ktx:cvar:k_freshteams
- name: k_freshteams
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Master toggle for Fresh Teams mode; automatically disabled outside dmm1 (world.c:1770-1772), and its sub-options (k_freshteams_*) are all gated behind it. Its effect is scoped entirely to dmm1 -- the k_bf_* / k_freshteams_* family pattern -- Mode-scoped knobs.

---

B6-RESULT | ktx:cvar:k_freshteams_fast_ammo | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_freshteams_fast_ammo

- canonical_id: ktx:cvar:k_freshteams_fast_ammo
- name: k_freshteams_fast_ammo
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: A Fresh Teams sub-option (dmm1 only) that makes ammo boxes respawn on the weapon timer; gated on k_freshteams in items.c:1189 and only active in dmm1. Scoped entirely to the Fresh Teams variant of dmm1 -- Mode-scoped knobs.

---

B6-RESULT | ktx:cvar:k_freshteams_limit_packs | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_freshteams_limit_packs

- canonical_id: ktx:cvar:k_freshteams_limit_packs
- name: k_freshteams_limit_packs
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Fresh Teams (dmm1) sub-option capping backpack ammo to per-type limits; gated on k_freshteams in items.c:2672 and only meaningful in dmm1. Scoped entirely to Fresh Teams dmm1 -- Mode-scoped knobs.

---

B6-RESULT | ktx:cvar:k_freshteams_limit_sweep_ammo | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_freshteams_limit_sweep_ammo

- canonical_id: ktx:cvar:k_freshteams_limit_sweep_ammo
- name: k_freshteams_limit_sweep_ammo
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Fresh Teams (dmm1) sub-option reducing ammo gained when re-picking an already-owned weapon; gated on k_freshteams in items.c:810, only active in dmm1. Scoped entirely to the Fresh Teams mode variant -- Mode-scoped knobs.

---

B6-RESULT | ktx:cvar:k_freshteams_pack_cells | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_freshteams_pack_cells

- canonical_id: ktx:cvar:k_freshteams_pack_cells
- name: k_freshteams_pack_cells
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Fresh Teams (dmm1) only: caps cells in dropped backpacks when k_freshteams_limit_packs is active; applied via bound() at items.c:2839 inside the fresh_packs gate. Scoped to Fresh Teams dmm1 -- Mode-scoped knobs.

---
