# B6 categorize batch 03

Generated: 2026-05-21
Agent: claude-sonnet-4-6 | b6-categorize-v1
Batch file: /tmp/ktx-categorize-batches/batch-03.txt
Row count: 20

---

B6-RESULT | ktx:command:ctfbasedspawn | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:command:ctfbasedspawn

- canonical_id: ktx:command:ctfbasedspawn
- name: ctfbasedspawn
- type: command

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This command toggles k_ctf_based_spawn and explicitly refuses with "Can't do this in non CTF mode" on non-CTF servers -- its effect is scoped entirely to CTF mode. The disambiguation guide lists k_ca*, k_bf*, etc. as mode-scoped; CTF spawn control is the same pattern for CTF mode.

---

B6-RESULT | ktx:command:deathheight:frogbot:editor | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:deathheight:frogbot:editor

- canonical_id: ktx:command:deathheight:frogbot:editor
- name: deathheight:frogbot:editor
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The :frogbot:editor canonical_id suffix and the description ("Frogbot route-editor command, invoked as 'botcmd deathheight'") place this squarely in the Frogbot category; it sets a per-map Z-height floor for bot routing and persists to the .bot file.

---

B6-RESULT | ktx:command:debug:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:debug:frogbot:std

- canonical_id: ktx:command:debug:frogbot:std
- name: debug:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The :frogbot:std canonical_id suffix and the description ("Frogbot debug subcommand, invoked as 'botcmd debug'") make this unambiguously Frogbot; it prints bot thinking state, goal lists, and routing markers -- all frogbot-internal diagnostics.

---

B6-RESULT | ktx:command:demomark | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:demomark

- canonical_id: ktx:command:demomark
- name: demomark
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Places a named, timestamped marker into the server-side MVD demo recording so the moment can be jumped to during playback" -- this is demo recording infrastructure. The disambiguation guide lists "recording, replay, spec controls, broadcast policy" under Demo & spectator.

---

B6-RESULT | ktx:command:dinfo | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:dinfo

- canonical_id: ktx:command:dinfo
- name: dinfo
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Requests demo information from the server for the current or a specified demo" -- this is demo inspection/retrieval. Source registers it with CF_BOTH|CF_MATCHLESS|CF_PARAMS and the handler forwards to the server-side `demoinfo` handler, excluded from MVD recording (housekeeping).

---

B6-RESULT | ktx:command:disable:frogbot:std | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:command:disable:frogbot:std

- canonical_id: ktx:command:disable:frogbot:std
- name: disable:frogbot:std
- type: command

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The :frogbot:std canonical_id suffix and the description ("Disables frogbots -- clears the bot-enabled flag, advances to the next map, and restores the player/spectator mode") make this unambiguously Frogbot; it directly controls the FB_CVAR_ENABLED (k_fb_enabled) state.

---

B6-RESULT | ktx:command:discharge | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:discharge

- canonical_id: ktx:command:discharge
- name: discharge
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Toggles underwater weapon discharges (chain-reaction self-damage when firing a discharge weapon in water)" -- this is a weapon-interaction rule that applies globally across all modes, not scoped to any one mode. The disambiguation guide cites "weapon balance, damage tuning that applies across all modes" for Gameplay rules.

---

B6-RESULT | ktx:command:dlist | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:command:dlist

- canonical_id: ktx:command:dlist
- name: dlist
- type: command

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Lists the demos available on the server. Forwards the request to the MVDSV server with any arguments passed through, returning the demo listing to the caller's console" -- this is demo listing/discovery, squarely in the Demo & spectator category.

---

B6-RESULT | ktx:command:dm | CATEGORIZED | category=Match flow | confidence=MED

### ktx:command:dm

- canonical_id: ktx:command:dm
- name: dm
- type: command

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Prints the server's current deathmatch mode (1-5) to the player who runs it. Display-only -- the mode is changed by the separate dmm1..dmm5 commands." This is a query command for server state during match setup. MED confidence because it could also fit Mode selection (it displays the active mode); however since it is display-only and oriented toward inspecting current server state (not switching mode), Match flow is the closer fit.

---

B6-RESULT | ktx:command:dmgfrags | CATEGORIZED | category=Scoring & stats | confidence=HIGH

### ktx:command:dmgfrags

- canonical_id: ktx:command:dmgfrags
- name: dmgfrags
- type: command

- NEW category_inferred: Scoring & stats
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "toggles damage-based scoring (k_dmgfrags). When on, score is awarded at roughly 1 frag per 100 damage dealt; telefrag damage is excluded and ordinary kill-frags are not counted" -- this directly controls how frags/score are counted, which is the core of Scoring & stats. The disambiguation guide lists "frag rules, stat tracking" under Scoring & stats.

---

B6-RESULT | ktx:command:dmm1 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:dmm1

- canonical_id: ktx:command:dmm1
- name: dmm1
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Switches the server to deathmatch mode 1 (standard deathmatch)" -- this is exactly the dmm <N> mode-switching command pattern cited in the disambiguation guide under Mode selection ("commands an admin runs to switch the active mode: clan_arena, wipeout, midair, dmm <N>").

---

B6-RESULT | ktx:command:dmm2 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:dmm2

- canonical_id: ktx:command:dmm2
- name: dmm2
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Switches the server to deathmatch mode 2 and announces the change" -- this is the dmm <N> mode-switching pattern explicitly named under Mode selection in the disambiguation guide.

---

B6-RESULT | ktx:command:dmm3 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:dmm3

- canonical_id: ktx:command:dmm3
- name: dmm3
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Switches the server to deathmatch mode 3" -- identical pattern to dmm1/dmm2; the disambiguation guide explicitly names "dmm <N>" as the Mode selection archetype.

---

B6-RESULT | ktx:command:dmm4 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:dmm4

- canonical_id: ktx:command:dmm4
- name: dmm4
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Switches the server to deathmatch mode 4" -- identical pattern; the disambiguation guide explicitly names "dmm <N>" as Mode selection. DMM4's unique k_midair/k_instagib interactions and OctaPower rename are mode-specific behaviors, but the command itself is a mode-switcher.

---

B6-RESULT | ktx:command:dmm5 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:dmm5

- canonical_id: ktx:command:dmm5
- name: dmm5
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Switches the server to deathmatch mode 5 and announces the change" -- same dmm <N> pattern; Mode selection per the disambiguation guide. The confidence hedge in the description (mode-5 vs mode-3 distinction not definitively established) does not affect the category -- the command's role as a mode-switcher is unambiguous.

---

B6-RESULT | ktx:command:downplayers | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:downplayers

- canonical_id: ktx:command:downplayers
- name: downplayers
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Decrements the server's player slot count (maxclients) by 1 each time it is run. The new value is clamped to the range 1..k_maxclients" -- maxclients is a core server configuration value. The disambiguation guide lists "slots" explicitly under Server config & network.

---

B6-RESULT | ktx:command:downspecs | CATEGORIZED | category=Server config & network | confidence=HIGH

### ktx:command:downspecs

- canonical_id: ktx:command:downspecs
- name: downspecs
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Decrements the server's spectator slot count (maxspectators) by 1" -- spectator slot count is server configuration. Parallel to downplayers; the disambiguation guide lists "slots" under Server config & network.

---

B6-RESULT | ktx:command:dropitem | CATEGORIZED | category=Admin & permissions | confidence=MED

### ktx:command:dropitem

- canonical_id: ktx:command:dropitem
- name: dropitem
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Debug/map-testing command that spawns a named item at your position. Requires cheats enabled (*cheats serverinfo set) and is refused during a match" -- cheats-gating places this in the admin/privileged-access tier. MED confidence: no perfect locked-list fit (it is a debug/map-testing tool), but Admin & permissions is closest given the explicit cheats-permission gate.

---

B6-RESULT | ktx:command:droppack | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:droppack

- canonical_id: ktx:command:droppack
- name: droppack
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Toggles the dp (drop backpack) rule -- when enabled, players drop a backpack containing their ammo and weapon on death during a live match" -- this is a death-behavior/item-drop rule that applies across all modes (with standard guards). The disambiguation guide places cross-mode damage and item rules under Gameplay rules.

---

B6-RESULT | ktx:command:dropquad | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:command:dropquad

- canonical_id: ktx:command:dropquad
- name: dropquad
- type: command

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description says "Toggles the 'dq' setting, which controls whether players drop their Quad Damage on death during a live match" -- this is a powerup-drop rule on player death, a cross-mode gameplay rule in the same family as droppack. The disambiguation guide's "weapon balance, item respawn, damage tuning that applies across all modes" encompasses powerup-drop behavior.

---
