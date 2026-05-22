# B6 categorize -- batch 13 ledger

Generated: 2026-05-21 | Model: claude-sonnet-4-6 | Prompt: b6-categorize-v1

---

B6-RESULT | ktx:command:rjfields:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:rjfields:frogbot:editor

- canonical_id: ktx:command:rjfields:frogbot:editor
- name: rjfields:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This is a frogbot path-editor command registered in editor_commands[] (src/bot_commands.c:2357) that reads or sets rocket-jump parameters (pitch, yaw, delay) on bot routing paths. It fits squarely in the Frogbot category — waypoint and path editing for bot navigation.

---

B6-RESULT | ktx:command:rnd | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:rnd

- canonical_id: ktx:command:rnd
- name: rnd
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `rnd` picks a random item from a list and broadcasts the result to all players; it is a general utility command available in any game context, not scoped to a specific mode, bot subsystem, or admin role. Among the 13 categories, Gameplay rules is the best fit for this cross-mode utility that affects in-game player decision-making (e.g., picking a random map or option), and it is explicitly blocked during a live match (consistent with match-flow utilities).

---

B6-RESULT | ktx:command:roundsdown | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:roundsdown

- canonical_id: ktx:command:roundsdown
- name: roundsdown
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `roundsdown` decreases `k_hoonyrounds` by 2, and is only available in HoonyMode games (src/hoonymode.c:1239); it is a knob whose effect is scoped to one specific mode (HoonyMode), placing it in Mode-scoped knobs rather than Match flow (which covers mode-agnostic prewar/ready/restart transitions).

---

B6-RESULT | ktx:command:roundsup | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:roundsup

- canonical_id: ktx:command:roundsup
- name: roundsup
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `roundsup` increases `k_hoonyrounds` by 2 and is also gated to HoonyMode only (src/hoonymode.c:1227); it is the symmetric counterpart of `roundsdown` and belongs in Mode-scoped knobs for the same reason.

---

B6-RESULT | ktx:command:rpickup | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:command:rpickup

- canonical_id: ktx:command:rpickup
- name: rpickup
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `rpickup` is a vote-based command for randomly reshuffling teams before or between matches (src/commands.c:5513-5557); it is refused during a live match and is about team composition setup — a pre-match / match-state-transition operation that fits Match flow (prewar team arrangement, not a mode-specific knob or admin-only permission).

---

B6-RESULT | ktx:command:rules | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:rules

- canonical_id: ktx:command:rules
- name: rules
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `rules` prints the current server game mode and mode-specific info to the caller (src/commands.c:3299); it is a server-state query command that reflects how the server is configured (mode, berserk, etc.), placing it closest to Server config & network among the 13 categories. It is not a mode selector, a match-flow transition, or an admin permission command.

---

B6-RESULT | ktx:command:save:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:save:frogbot:editor

- canonical_id: ktx:command:save:frogbot:editor
- name: save:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `save` is a frogbot path-editor command registered in editor_commands[] (src/bot_commands.c:2345) that renumbers and writes the routing data to a .bot file; it is a waypoint-editing persistence command squarely in the Frogbot category.

---

B6-RESULT | ktx:command:savemarker:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:savemarker:frogbot:editor

- canonical_id: ktx:command:savemarker:frogbot:editor
- name: savemarker:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `savemarker` selects and saves the nearest routing marker as the active anchor for path-editing commands (src/bot_commands.c:2336, editor_commands[]); it is a waypoint-navigation editing command that fits the Frogbot category directly.

---

B6-RESULT | ktx:command:+scores | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:+scores

- canonical_id: ktx:command:+scores
- name: +scores
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `+scores` is the press-and-hold half of a bind pair that displays a centered overlay with match time and team scores (src/commands.c:891); it is a scoring/stats display command whose entire purpose is showing score state to the player, fitting Scoring & stats.

---

B6-RESULT | ktx:command:-scores | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:-scores

- canonical_id: ktx:command:-scores
- name: -scores
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `-scores` is the release half of the `+scores`/`-scores` bind pair that hides the scoreboard overlay (src/commands.c:892); as the symmetric counterpart to `+scores` it belongs in Scoring & stats.

---

B6-RESULT | ktx:command:scores | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:scores

- canonical_id: ktx:command:scores
- name: scores
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `scores` prints match time, frags-remaining, per-team scores, and CA-specific scoreboards to the caller's console (src/commands.c:703 -> PrintScores); it is a direct score-retrieval command that fits Scoring & stats unambiguously.

---

B6-RESULT | ktx:command:sct_hex | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:sct_hex

- canonical_id: ktx:command:sct_hex
- name: sct_hex
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `sct_hex` prints the QuakeWorld hexadecimal character-set table to the caller's console (src/commands.c:760); it is a utility/reference command for server operators and players configuring colored names or message text. None of the 13 categories covers "reference utilities" precisely; Server config & network is the closest fit as it covers server-operator configuration tooling, and this command is a config-authoring aid (helping admins compose colored serverinfo strings, hostnames, MOTDs).

---

B6-RESULT | ktx:command:sct_oct | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:sct_oct

- canonical_id: ktx:command:sct_oct
- name: sct_oct
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `sct_oct` is the octal-table counterpart of `sct_hex`, printing the QuakeWorld character set in octal format to the caller (src/commands.c:759); same rationale as `sct_hex` — a config-authoring reference utility, best placed in Server config & network among the 13 locked categories.

---

B6-RESULT | ktx:command:setmarkerflag:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:setmarkerflag:frogbot:editor

- canonical_id: ktx:command:setmarkerflag:frogbot:editor
- name: setmarkerflag:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `setmarkerflag` ORs behavior flags onto the nearest routing marker in the frogbot editor (src/bot_commands.c:2341, editor_commands[]); it is a waypoint-editing command directly in the Frogbot category.

---

B6-RESULT | ktx:command:setpathflag:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:setpathflag:frogbot:editor

- canonical_id: ktx:command:setpathflag:frogbot:editor
- name: setpathflag:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `setpathflag` ORs traversal flags onto a bot routing path between two markers (src/bot_commands.c:2343, editor_commands[]); it is a path-editing command in the frogbot waypoint editor, fitting Frogbot directly.

---

B6-RESULT | ktx:command:setzone:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:setzone:frogbot:editor

- canonical_id: ktx:command:setzone:frogbot:editor
- name: setzone:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `setzone` assigns zone numbers to routing markers in the frogbot waypoint editor (src/bot_commands.c:2340, editor_commands[]); zones define navigation regions for bots, placing this squarely in the Frogbot category.

---

B6-RESULT | ktx:command:shownick | CATEGORIZED | category=Gameplay rules | confidence=MED

### ktx:command:shownick

- canonical_id: ktx:command:shownick
- name: shownick
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `shownick` lets a player see a nearby teammate's health, armor, ammo, and powerup status (src/commands.c:762, handler ShowNick); it is an in-match teammate-awareness command that supports team play and functions across all team modes (Team/CTF). It is not scoring, not spectator, not a mode-scoped knob, and not server config — Gameplay rules is the best fit among the 13 categories for this cross-mode tactical player command.

---

B6-RESULT | ktx:command:sh_speed | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:sh_speed

- canonical_id: ktx:command:sh_speed
- name: sh_speed
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `sh_speed` toggles per-client prewar speed display — the HUD stat fields show movement speed during the prewar phase only, with no effect once a match is in progress (src/commands.c:912, src/client.c:4570-4595). It operates exclusively in the prewar/pre-match phase, making Match flow the best fit (prewar-phase player tooling), ahead of Gameplay rules which covers cross-phase balance tuning.

---

B6-RESULT | ktx:command:silence | CATEGORIZED | category=Spectator chat & visibility | confidence=HIGH

### ktx:command:silence

- canonical_id: ktx:command:silence
- name: silence
- type: command

- NEW category_inferred: Spectator chat & visibility
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `silence` toggles `k_spectalk` — whether players can hear spectator chat — and is linked in the description's `See also` to the "QW team-chat visibility concept note" (src/commands.c:745, handler ToggleSpecTalk). The description explicitly covers spectator-to-player chat policy, placing it in Spectator chat & visibility exactly as the disambiguation guide states ("k_spectalk, k_sayteam_to_spec, spec-chat policy").

---

B6-RESULT | ktx:command:skill:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:skill:frogbot:std

- canonical_id: ktx:command:skill:frogbot:std
- name: skill:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `skill` sets the skill level (0-20) for subsequently added bots, registered in std_commands[] (src/bot_commands.c:2319, handler FrogbotsSetSkill); it is a bot behavior/skill tuning command that fits the Frogbot category directly.

---
