# B6 categorize ledger -- batch 07

Generated: 2026-05-22
Batch file: /tmp/ktx-categorize-batches/batch-07.txt
Model: claude-sonnet-4-6 | b6-categorize-v1

---

B6-RESULT | ktx:command:hook_fast | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:hook_fast

- canonical_id: ktx:command:hook_fast
- name: hook_fast
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly calls this a "CTF vote command" that casts or withdraws the player's vote to change hook style. The reasoning confirms the handler is in vote.c and the mechanism is vote-count based (majority or admin veto). This is squarely a voting mechanism, not a mode-selection command (no mode switch occurs directly).

---

B6-RESULT | ktx:command:hook_smooth | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:hook_smooth

- canonical_id: ktx:command:hook_smooth
- name: hook_smooth
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly calls this a "CTF vote command" that casts or withdraws a player's vote to switch hook style to smooth. The reasoning confirms the handler lives in vote.c and it operates via vote-count mechanism (majority or admin veto), identical structure to hook_fast.

---

B6-RESULT | ktx:command:hoonymode | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:hoonymode

- canonical_id: ktx:command:hoonymode
- name: hoonymode
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this "applies the HoonyMode game-mode preset" -- a server-side command that switches the active mode with a full preset init (deathmatch, fraglimit, timelimit, k_hoonymode, etc.). It fits the Mode selection disambiguation (commands an admin runs to switch the active mode), analogous to clan_arena/wipeout/instagib.

---

B6-RESULT | ktx:command:info | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:info

- canonical_id: ktx:command:info
- name: info
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description describes a KTPRO-compatibility alias of kinfo that inspects or sets a client's own userinfo keys. Userinfo management (key inspection and setting) is a server/client configuration interface; no other category covers player userinfo/keyvalue management. MED confidence because userinfo is borderline -- it is player-side config plumbing rather than server infrastructure, but "Server config & network" is the closest fit in the locked list.

---

B6-RESULT | ktx:command:info:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:info:frogbot:editor

- canonical_id: ktx:command:info:frogbot:editor
- name: info:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description and canonical_id namespace (:frogbot:editor) both confirm this is a frogbot editor command that prints marker information for bot-routing editor use. Source is bot_commands.c, dispatched only when FB_OPTION_EDITOR_MODE is enabled. Clearly Frogbot.

---

B6-RESULT | ktx:command:infolock | CATEGORIZED | category=Spectator chat & visibility | confidence=HIGH

### ktx:command:infolock

- canonical_id: ktx:command:infolock
- name: infolock
- type: command

- NEW category_inferred: Spectator chat & visibility
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this is an admin command that toggles who may receive spectator info ("Only admins can receive specinfos" vs "All spectators can receive specinfos"). The reasoning confirms it flips the MI_ADM_ONLY bit on k_spec_info via the infolock handler. This is a spectator-information visibility toggle -- exactly the Spectator chat & visibility category.

---

B6-RESULT | ktx:command:infospec | CATEGORIZED | category=Spectator chat & visibility | confidence=HIGH

### ktx:command:infospec

- canonical_id: ktx:command:infospec
- name: infospec
- type: command

- NEW category_inferred: Spectator chat & visibility
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says it toggles spectator item-pickup info ("X got Megahealth" notifications) and the 'moreinfo' command on/off for spectators, broadcasting "Extra info for spectators on/off". The reasoning confirms the MI_ON bit flip on k_spec_info. This governs what information spectators receive -- Spectator chat & visibility.

---

B6-RESULT | ktx:command:instagib | CATEGORIZED | category=Mode-scoped knobs | confidence=MED

### ktx:command:instagib

- canonical_id: ktx:command:instagib
- name: instagib
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description shows this command cycles k_instagib through a 4-state enum (off/slow/fast/extreme) and also zeroes k_midair, LGCMODE, TOT_MODE, and k_dmm4_gren_mode. It is a toggle/cycle command for the instagib mode knob rather than a clean mode-switch command (it doesn't exec a full preset like hoonymode/wipeout do). MED confidence: the disambiguation guide lists Mode selection as "commands an admin runs to switch the active mode: ... instagib" explicitly, but the handler behavior (cycling through 4 states, writing k_instagib, and cross-disabling other mode variables) reads more like a mode-scoped knob setter than a one-shot mode activator. Applying Mode-scoped knobs as the category because the command's primary effect is setting/cycling the k_instagib cvar value within the instagib mode.

---

B6-RESULT | ktx:command:instagib_coilgun_kickback | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:instagib_coilgun_kickback

- canonical_id: ktx:command:instagib_coilgun_kickback
- name: instagib_coilgun_kickback
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this toggles self-knockback (k_cg_kb) on the Instagib coilgun -- a setting that only applies within Instagib mode (requires k_instagib non-zero). This is a mode-scoped knob (effect scoped to Instagib mode), as per the disambiguation guide pattern for k_instagib*.

---

B6-RESULT | ktx:command:iplist | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:iplist

- canonical_id: ktx:command:iplist
- name: iplist
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says the full IP listing (all players/spectators with IP, admin marker, name) is gated by k_ip_list permission level; non-privileged callers see only their own IP. The reasoning confirms a check_perm() gate against k_ip_list. This is a permission-gated admin information tool -- Admin & permissions.

---

B6-RESULT | ktx:command:itempickupbonus:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:itempickupbonus:frogbot:std

- canonical_id: ktx:command:itempickupbonus:frogbot:std
- name: itempickupbonus:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description and canonical_id namespace (:frogbot:std) confirm this is a frogbot subcommand ('fb itempickupbonus') that controls bot item-pickup bonuses in ToT mode. Source is bot_commands.c. Clearly Frogbot.

---

B6-RESULT | ktx:command:kick | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:kick

- canonical_id: ktx:command:kick
- name: kick
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this is an admin command to kick a connected player, with a gate of "You are not an admin" for non-admins. The reasoning confirms is_adm() check in admin.c. Kicking players is a classic admin/permission action -- Admin & permissions.

---

B6-RESULT | ktx:command:kill | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:kill

- canonical_id: ktx:command:kill
- name: kill
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this is a player self-kill (suicide) command with mode-specific gating rules (blocked in RA, CA/wipeout, CTF first 10 seconds, during pause/standby, rate-limited). The extensive per-mode suicide rules encoded in the description put this in Gameplay rules (damage tuning / rules that apply across modes with per-mode carve-outs). MED confidence: it could be argued as Match flow, but the primary content is game-rule gating of a gameplay action, not match-state transitions.

---

B6-RESULT | ktx:command:killer | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:killer

- canonical_id: ktx:command:killer
- name: killer
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this opens a chat line pre-filled with the name of the player who last killed you, applying optional premsg/postmsg userinfo keys. It is a player-facing gameplay quality-of-life command tied to the kill-tracking system. No dedicated category exists for player communication commands; Gameplay rules is the best fit among the locked 13 for a command grounded in in-game kill tracking. MED confidence: it is borderline but not a match for Admin, Voting, Match flow, Mode selection, or any mode-specific category.

---

B6-RESULT | ktx:command:killquad | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:killquad

- canonical_id: ktx:command:killquad
- name: killquad
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this toggles KillQuad mode (k_killquad) on/off and broadcasts the state. KillQuad is a gameplay modifier (quad-related behavior), not scoped to a single mode (no mode prefix like k_ca*/k_midair*/k_instagib*), and not an admin/permission command per se. Gameplay rules is the best fit for a general gameplay toggle not tied to a specific mode. MED confidence because the exact gameplay semantic of KillQuad is not spelled out in the description (per the reasoning's D5 discipline), making confident assignment harder.

---

B6-RESULT | ktx:command:kinfo | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:kinfo

- canonical_id: ktx:command:kinfo
- name: kinfo
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this inspects or sets a client's own userinfo keys (same handler as 'info'). Userinfo key management is client/server configuration plumbing. Assigned same category as its alias 'info'. MED confidence for same reason: userinfo is borderline player-config vs server-config, but Server config & network is the closest locked category.

---

B6-RESULT | ktx:command:klist | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:klist

- canonical_id: ktx:command:klist
- name: klist
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this prints a detailed client list (players, spectators, ghosts, connecting clients) with admin markers, and is gated by k_allowklist during live matches for ordinary players. The reasoning confirms admin-marker fields in the output. This is primarily a server-oversight and admin-information tool -- Admin & permissions.

---

B6-RESULT | ktx:command:ksound1 | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:ksound1

- canonical_id: ktx:command:ksound1
- name: ksound1
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this plays team audio cue 1 (ktsound1.wav) for teammates who have KT sounds enabled, only in team or CTF games. It is a player-facing in-game team communication tool (audio cue). No dedicated "team communication" category exists; Gameplay rules is the closest fit among locked 13 for a general-purpose in-game player action. MED confidence: it is communication-adjacent but not a mode-scoped knob, not admin, and not match flow.

---

B6-RESULT | ktx:command:ksound2 | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:ksound2

- canonical_id: ktx:command:ksound2
- name: ksound2
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this plays team audio cue 2 (ktsound2.wav) for teammates with KT sounds enabled, only in team or CTF games. Same mechanism and role as ksound1. Gameplay rules is the closest locked category for this in-game team audio action.

---

B6-RESULT | ktx:command:ksound3 | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:ksound3

- canonical_id: ktx:command:ksound3
- name: ksound3
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says this plays team audio cue 3 (ktsound3.wav) for teammates with KT sounds enabled, only in team or CTF games. Same mechanism and role as ksound1/ksound2. Gameplay rules is the closest locked category for this in-game team audio action.

---
