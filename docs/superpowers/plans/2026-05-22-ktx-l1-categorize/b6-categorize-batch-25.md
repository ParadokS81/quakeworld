# B6 categorize -- batch 25 ledger

Generated: 2026-05-21 | Model: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:cvar:k_nightmare_pu | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:cvar:k_nightmare_pu

- canonical_id: ktx:cvar:k_nightmare_pu
- name: k_nightmare_pu
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Enables a server-wide gameplay variant where monsters killed at skill 3+ drop powerups on death; this is a damage/item-drop tuning rule that applies globally when active (src/sp_monsters.c). MED confidence because it is a singleplayer-monsters feature that sits at the border between gameplay rules and mode-scoped behavior, but no specific competitive mode gates it.

---

B6-RESULT | ktx:cvar:k_nightmare_pu_droprate | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:cvar:k_nightmare_pu_droprate

- canonical_id: ktx:cvar:k_nightmare_pu_droprate
- name: k_nightmare_pu_droprate
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the drop probability for powerups in Nightmare powerup mode -- a numeric tuning knob for item-drop behavior (src/sp_monsters.c:655); directly paired with k_nightmare_pu and governs item-respawn/drop probability, matching the "damage tuning" bucket. Same MED confidence as its sibling for the same SP-monsters boundary reason.

---

B6-RESULT | ktx:cvar:k_no_fps_physics | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_no_fps_physics

- canonical_id: ktx:cvar:k_no_fps_physics
- name: k_no_fps_physics
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Forces framerate-independent jump height by clamping the jump-velocity multiplier to 1 (src/client.c:3582); this is a physics/fairness balance rule that applies across all modes and affects every player's movement, placing it squarely in gameplay rules.

---

B6-RESULT | ktx:cvar:k_noframechecks | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:cvar:k_noframechecks

- canonical_id: ktx:cvar:k_noframechecks
- name: k_noframechecks
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls server-side FPS enforcement: when enabled the server warns and disconnects players whose framerate exceeds the cap or triggers a QW timing bug (src/client.c:3824); this is a server-side policing mechanism (rates/enforcement), not a gameplay balance rule, fitting Server config & network.

---

B6-RESULT | ktx:cvar:k_noitems | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_noitems

- canonical_id: ktx:cvar:k_noitems
- name: k_noitems
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Removes all weapon, ammo, health, armor, and powerup pickups from the map at match start (src/match.c:842-862); this is a server-wide item-respawn / pickup-availability rule that applies across modes and is not scoped to one specific named mode.

---

B6-RESULT | ktx:cvar:k_no_scoreboard_ghosts | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:cvar:k_no_scoreboard_ghosts

- canonical_id: ktx:cvar:k_no_scoreboard_ghosts
- name: k_no_scoreboard_ghosts
- type: cvar

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Disables the ghost-scoreboard feature that preserves disconnected players' slots; intended for QW-Engine client compatibility (src/g_utils.c:2245 comment). This is a server-side compatibility/configuration switch rather than a scoring rule or gameplay rule, fitting Server config & network. MED confidence because it touches the scoreboard surface but is driven by client-compatibility, not by scoring logic.

---

B6-RESULT | ktx:cvar:_k_nospecs | CATEGORIZED | category=Demo & spectator | confidence=MED

### ktx:cvar:_k_nospecs

- canonical_id: ktx:cvar:_k_nospecs
- name: _k_nospecs
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether incoming spectator connections are accepted or refused (src/spectate.c:123-130), with exceptions for VIP spectators and coaches; the functional role is spec-connection policy, placing it in Demo & spectator. MED confidence because the `_k_` prefix signals internal state by convention, but the description explicitly states it is set by admin command or vote (not KTX-internal-only), so the functional category wins over the naming convention.

---

B6-RESULT | ktx:cvar:k_nosweep | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_nosweep

- canonical_id: ktx:cvar:k_nosweep
- name: k_nosweep
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Prevents duplicate-weapon pickup in dmm1 only; the server auto-resets this cvar to 0 in any other deathmatch mode (src/world.c:1775-1777), making it explicitly scoped to one mode. Matches the Mode-scoped knobs definition directly.

---

B6-RESULT | ktx:cvar:k_no_vote_map | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:cvar:k_no_vote_map

- canonical_id: ktx:cvar:k_no_vote_map
- name: k_no_vote_map
- type: cvar

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Disables map voting and the /next_map command in matchless mode (src/maps.c:408, src/match.c:3021); it directly controls what voting actions are permitted, placing it in the Voting category.

---

B6-RESULT | ktx:cvar:k_no_wizard_animation | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:k_no_wizard_animation

- canonical_id: ktx:cvar:k_no_wizard_animation
- name: k_no_wizard_animation
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether the floating wizard model used for spectator camera points animates (src/spectate.c:78 inside wizard_think()); this is a spectator-view presentation control, fitting the Demo & spectator category.

---

B6-RESULT | ktx:cvar:k_on_end_f_modified | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_on_end_f_modified

- canonical_id: ktx:cvar:k_on_end_f_modified
- name: k_on_end_f_modified
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Broadcasts the f_modified trigger at match-end to collect per-client modified-files reports into the match record (description: "building a per-client info chain in the match record"); this is stat/data collection at match-end, placing it in Scoring & stats.

---

B6-RESULT | ktx:cvar:k_on_end_f_ruleset | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_on_end_f_ruleset

- canonical_id: ktx:cvar:k_on_end_f_ruleset
- name: k_on_end_f_ruleset
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Broadcasts the f_ruleset trigger at match-end to collect per-client active-ruleset reports into the match record; same pattern as k_on_end_f_modified -- end-of-match data collection for the match record, fitting Scoring & stats.

---

B6-RESULT | ktx:cvar:k_on_end_f_version | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_on_end_f_version

- canonical_id: ktx:cvar:k_on_end_f_version
- name: k_on_end_f_version
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Broadcasts the f_version trigger at match-end to collect per-client client-version reports into the match record; same end-of-match data-collection pattern as the f_modified and f_ruleset siblings, fitting Scoring & stats.

---

B6-RESULT | ktx:cvar:k_on_start_f_modified | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_on_start_f_modified

- canonical_id: ktx:cvar:k_on_start_f_modified
- name: k_on_start_f_modified
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Automatically broadcasts the starting player's f_modified report at match start when a matchtag is set (src/match.c:2939); this is match-record data collection (client integrity info), same family as the on_end siblings, fitting Scoring & stats.

---

B6-RESULT | ktx:cvar:k_on_start_f_ruleset | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_on_start_f_ruleset

- canonical_id: ktx:cvar:k_on_start_f_ruleset
- name: k_on_start_f_ruleset
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Automatically broadcasts the f_ruleset report at match start when a matchtag is set (src/match.c:2944); same match-record data-collection pattern as the other on_start/on_end f_* siblings, fitting Scoring & stats.

---

B6-RESULT | ktx:cvar:k_on_start_f_version | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:cvar:k_on_start_f_version

- canonical_id: ktx:cvar:k_on_start_f_version
- name: k_on_start_f_version
- type: cvar

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Automatically broadcasts the starting player's f_version (client version) report at match start when a matchtag is set (src/match.c:2949); same pattern as the other on_start/on_end f_* family, fitting Scoring & stats.

---

B6-RESULT | ktx:cvar:k_overtime | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_overtime

- canonical_id: ktx:cvar:k_overtime
- name: k_overtime
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Selects the resolution mechanism when a match reaches its time limit as a draw (no overtime / time extension / sudden death / tie-break / golden frag); this is a match-state-transition decision at the match boundary (src/match.c:522-561), directly fitting Match flow.

---

B6-RESULT | ktx:cvar:k_pause_without_matchtag | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_pause_without_matchtag

- canonical_id: ktx:cvar:k_pause_without_matchtag
- name: k_pause_without_matchtag
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls whether players can pause outside of a tagged (organised) match (src/client.c:5799 PlayerCanPause()); pausing is a match-state transition mechanism, and the matchtag gate is about match-flow policy, fitting Match flow.

---

B6-RESULT | ktx:cvar:k_pow | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:k_pow

- canonical_id: ktx:cvar:k_pow
- name: k_pow
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Master switch enabling or disabling all powerups (quad, pent, ring, suit) server-wide (src/g_utils.c:1741, src/items.c:111-114); this is a server-wide item-availability rule that applies across all modes, fitting Gameplay rules.

---

B6-RESULT | ktx:cvar:k_pow_check_time | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:cvar:k_pow_check_time

- canonical_id: ktx:cvar:k_pow_check_time
- name: k_pow_check_time
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the interval in seconds between auto-toggle checks of powerup availability based on player count in matchless mode (src/g_utils.c:1787-1816); this governs item-availability tuning behavior, fitting Gameplay rules. MED confidence because it is matchless-specific but the matchless mode is not one of the named Mode-scoped knob modes (CA/WP/LGC/etc.) and the item-respawn tuning framing is the better fit.

---
