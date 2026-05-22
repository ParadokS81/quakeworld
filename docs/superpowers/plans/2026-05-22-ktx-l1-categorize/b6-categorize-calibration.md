# B6 categorize -- CALIBRATION ledger (sample, ~30 rows)

**Category list LOCKED at v1, 2026-05-22.** Operator accepted both judgment calls (fpslist → Server config & network; dp → Gameplay rules). 30/30 categorized, 0 HALT, 0 NEW-CATEGORY-NEEDED. Distribution: 4 Voting, 3 each of Admin & permissions / Demo & spectator / Frogbot / Internal state / Match flow / Mode-scoped knobs / Race, 2 Spectator chat & visibility, 1 each of Gameplay rules / Mode selection / Server config & network, 0 Scoring & stats (sampling artifact, not a taxonomy gap).

Calibration sample of KTX cvar/command canonical_ids drawn at random across 9 prefix families + 3 anchors (dp, k_spectalk, k_sayteam_to_spec).

canonical_ids in this batch:

- ktx:command:2on2on2
- ktx:command:admin
- ktx:command:cm
- ktx:command:fpslist
- ktx:command:race_del_checkpoint
- ktx:command:race_route_clear
- ktx:command:race_set_falsestart
- ktx:cvar:_k_captcolor1
- ktx:cvar:_k_last_xonx
- ktx:cvar:_k_worldspawns
- ktx:cvar:demo_scoreslength
- ktx:cvar:dp
- ktx:cvar:k_admincode
- ktx:cvar:k_admins
- ktx:cvar:k_demoname_date
- ktx:cvar:k_demotxt_format
- ktx:cvar:k_dmm4_gren_mode
- ktx:cvar:k_fbskill_aim_lgpref
- ktx:cvar:k_fbskill_vol_init
- ktx:cvar:k_fbskill_vol_ownvel
- ktx:cvar:k_matchless
- ktx:cvar:k_matchless_max_idle_time
- ktx:cvar:k_midair
- ktx:cvar:k_midair_minheight
- ktx:cvar:k_prewar
- ktx:cvar:k_sayteam_to_spec
- ktx:cvar:k_spectalk
- ktx:cvar:k_vp_coop
- ktx:cvar:k_vp_map
- ktx:cvar:k_vp_nospecs

Locked category list (v1) -- LOCKED 2026-05-22 after operator review of this calibration ledger.

---

B6-RESULT | ktx:command:2on2on2 | CATEGORIZED | category=Mode selection | confidence=HIGH

### ktx:command:2on2on2

- canonical_id: ktx:command:2on2on2
- name: 2on2on2
- type: command

- NEW category_inferred: Mode selection
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This command switches the server to the 2on2on2 three-team game mode by applying a mode preset (slots, rounds, teamplay, overtime settings) and execs layered usermode configs. It is a command an admin runs to activate a specific team-play mode -- the canonical definition of Mode selection.

---

B6-RESULT | ktx:command:admin | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:command:admin

- canonical_id: ktx:command:admin
- name: admin
- type: command

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This command is the mechanism for claiming or relinquishing admin status on the server using the admin password (k_admincode). The description explicitly references k_admins (master admin toggle), VIP auto-grant, and the admin code entry flow -- all core admin & permissions machinery (src/admin.c).

---

B6-RESULT | ktx:command:cm | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:command:cm

- canonical_id: ktx:command:cm
- name: cm
- type: command

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The `cm` command casts a map vote by index, broadcasts suggestions, re-tallies votes, and is gated by vote-related policies (k_no_vote_map, k_lockmap). The description explicitly says "casts (or changes) a map vote" -- this is squarely Voting. Source at src/maps.c calls vote_check_map() as its terminal action.

---

B6-RESULT | ktx:command:fpslist | CATEGORIZED | category=Server config & network | confidence=MED

### ktx:command:fpslist

- canonical_id: ktx:command:fpslist
- name: fpslist
- type: command

- NEW category_inferred: Server config & network
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `fpslist` prints a per-player framerate table (current / max / min / avg FPS) derived from reported frame times. It is a server-side diagnostic read-only command with no mode-specific scope -- closest fit is Server config & network as a server introspection tool. No other category covers diagnostic/reporting commands. Confidence MED because no perfect category exists for diagnostics; this is the least-bad fit from the locked 13.

---

B6-RESULT | ktx:command:race_del_checkpoint | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_del_checkpoint

- canonical_id: ktx:command:race_del_checkpoint
- name: race_del_checkpoint
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This command removes the highest-numbered checkpoint from the current map's race route. It is only available in race mode (gated by isRACE()) and is part of the race route setup toolchain (src/race.c:2842). Unambiguous Race membership by name prefix, scope gate, and description.

---

B6-RESULT | ktx:command:race_route_clear | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_route_clear

- canonical_id: ktx:command:race_route_clear
- name: race_route_clear
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Clears the entire current race route: removes start/checkpoints/finish entities, restores weapons, unmutes players, clears the pacemaker. Only available in race mode (gated by race_command_checks). Race prefix + race-mode-only gate + src/race.c handler = unambiguous Race.

---

B6-RESULT | ktx:command:race_set_falsestart | CATEGORIZED | category=Race | confidence=HIGH

### ktx:command:race_set_falsestart

- canonical_id: ktx:command:race_set_falsestart
- name: race_set_falsestart
- type: command

- NEW category_inferred: Race
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Cycles the race start mode (frozen-until-go vs free-move-before-go), broadcasts the mode change, and reloads top scores per start mode. Only available in race mode (race_command_checks gate). Handled at src/race.c:3173. Race in name, scope, and handler location.

---

B6-RESULT | ktx:cvar:_k_captcolor1 | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:cvar:_k_captcolor1

- canonical_id: ktx:cvar:_k_captcolor1
- name: _k_captcolor1
- type: cvar

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: The description explicitly labels this an "Internal mod-state cvar -- not intended for operator configuration." The `_k_` prefix, the "internal mod usage" registration comment (src/world.c:1024), and the dynamic name construction (accessed via va("_k_captcolor%d", capt_num)) all confirm this is KTX engine state, set by the team-picking process, not by server config. Internal state is the exact match.

---

B6-RESULT | ktx:cvar:_k_last_xonx | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:cvar:_k_last_xonx

- canonical_id: ktx:cvar:_k_last_xonx
- name: _k_last_xonx
- type: cvar

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description explicitly says "Internal mod-state cvar ... Not operator-tuned." The `_k_` prefix, the registration comment "internal usage, save last XonX command" (src/world.c:778), and the automated read/write cycle (UserMode + map-change reapply) all confirm this is KTX runtime bookkeeping, not a configurable knob.

---

B6-RESULT | ktx:cvar:_k_worldspawns | CATEGORIZED | category=Internal state | confidence=HIGH

### ktx:cvar:_k_worldspawns

- canonical_id: ktx:cvar:_k_worldspawns
- name: _k_worldspawns
- type: cvar

- NEW category_inferred: Internal state
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Description says "Internal counter of how many maps the server has loaded ... Not intended for manual configuration." The `_k_` prefix + registration comment "internal usage, count of maps server spawned" (src/world.c:782) + sole writer being the server's FirstFrame handler = Internal state. The description explicitly says "Set by: automatically by the server on each map load."

---

B6-RESULT | ktx:cvar:demo_scoreslength | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:demo_scoreslength

- canonical_id: ktx:cvar:demo_scoreslength
- name: demo_scoreslength
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls the number of seconds the end-of-game score table is displayed before the server advances to the next level. The read use-site is src/client.c:690 inside `execute_changelevel` -- this is the intermission/post-match display interval, which is a spectator/demo-flow concern. The `demo_` prefix and the intermission-timing nature fit Demo & spectator.

---

B6-RESULT | ktx:cvar:dp | CATEGORIZED | category=Gameplay rules | confidence=HIGH

### ktx:cvar:dp

- canonical_id: ktx:cvar:dp
- name: dp
- type: cvar

- NEW category_inferred: Gameplay rules
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: `dp` controls whether dying players drop a backpack with their ammo and current weapon during a live match. The description notes it applies "in competitive play -- dmm1, dmm3, dmm4" and may be 0 in clan-arena/wipeout, but is itself a cross-mode item-drop rule, not scoped to a single mode by the cvar itself. Backpack-from-corpse is a core gameplay mechanic -- this is Gameplay rules, not Mode-scoped knobs (whose effect must be scoped TO one specific mode by the cvar, not merely referenced as a note).

---

B6-RESULT | ktx:cvar:k_admincode | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:cvar:k_admincode

- canonical_id: ktx:cvar:k_admincode
- name: k_admincode
- type: cvar

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This is the server passcode that grants a player real admin privileges when supplied to the /admin command. The description explicitly mentions the 5-second anti-brute-force cooldown, the k_admins master toggle dependency, and the two grant paths (password match, numeric impulse). This is the core Admin & permissions credential cvar.

---

B6-RESULT | ktx:cvar:k_admins | CATEGORIZED | category=Admin & permissions | confidence=HIGH

### ktx:cvar:k_admins

- canonical_id: ktx:cvar:k_admins
- name: k_admins
- type: cvar

- NEW category_inferred: Admin & permissions
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Master toggle for the KTX admin system -- when 0, all admin-related commands bail. The description lists commands like /admin, /elect, and rcon admin designation as depending on this. This is the top-level Admin & permissions gate cvar; it is one of the 11 D20 template anchors (no reasoning, authored by hand).

---

B6-RESULT | ktx:cvar:k_demoname_date | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:k_demoname_date

- canonical_id: ktx:cvar:k_demoname_date
- name: k_demoname_date
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Appends a strftime-format timestamp to auto-generated demo filenames. The read use-site is src/match.c:2337 in the auto-demo-naming path. This is a demo recording configuration knob -- fits Demo & spectator exactly by description and source location.

---

B6-RESULT | ktx:cvar:k_demotxt_format | CATEGORIZED | category=Demo & spectator | confidence=HIGH

### ktx:cvar:k_demotxt_format

- canonical_id: ktx:cvar:k_demotxt_format
- name: k_demotxt_format
- type: cvar

- NEW category_inferred: Demo & spectator
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls the format (xml or json) of the per-game text stats file written next to each recorded demo (src/stats.c:573 in StatsToFile, gated on serverdemo). The `k_demo` prefix and the tight coupling to demo recording make this an unambiguous Demo & spectator cvar.

---

B6-RESULT | ktx:cvar:k_dmm4_gren_mode | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_dmm4_gren_mode

- canonical_id: ktx:cvar:k_dmm4_gren_mode
- name: k_dmm4_gren_mode
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: This toggle enables "grenade mode" within deathmatch 4 specifically -- the description notes it is "a sub-mode emphasising precision grenade-launcher play" and is "mutually exclusive with k_midair and k_instagib." The `k_dmm4_` prefix matches the Mode-scoped knobs pattern exactly (disambiguation guide: "k_dmm4_*"). Its effect is scoped to dmm4.

---

B6-RESULT | ktx:cvar:k_fbskill_aim_lgpref | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_aim_lgpref

- canonical_id: ktx:cvar:k_fbskill_aim_lgpref
- name: k_fbskill_aim_lgpref
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Frogbot AI tuning cvar: probability (0-1) that the bot proactively switches to the Lightning Gun during weapon selection. Handler at src/bot_botimp.c:118 (k_fbskill_* family). The description is entirely about bot LG-preference behavior and the disambiguation guide explicitly lists k_fbskill_* under Frogbot.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_init | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_init

- canonical_id: ktx:cvar:k_fbskill_vol_init
- name: k_fbskill_vol_init
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the initial aim-error volatility assigned to a bot when it acquires a new target. Handler at src/bot_botimp.c:134 (k_fbskill_* family). Purely a Frogbot AI skill parameter -- k_fbskill_* is listed explicitly in the disambiguation guide under Frogbot.

---

B6-RESULT | ktx:cvar:k_fbskill_vol_ownvel | CATEGORIZED | category=Frogbot | confidence=HIGH

### ktx:cvar:k_fbskill_vol_ownvel

- canonical_id: ktx:cvar:k_fbskill_vol_ownvel
- name: k_fbskill_vol_ownvel
- type: cvar

- NEW category_inferred: Frogbot
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Horizontal speed threshold above which the bot's own movement triggers increased aim volatility. Handler at src/bot_botimp.c:136 (k_fbskill_* family). The description is entirely about Frogbot AI tuning; k_fbskill_* is a Frogbot indicator per the disambiguation guide.

---

B6-RESULT | ktx:cvar:k_matchless | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_matchless

- canonical_id: ktx:cvar:k_matchless
- name: k_matchless
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Removes the formal match lifecycle (no prewar/countdown) so players play continuously. The description describes it as controlling the "formal match lifecycle" -- prewar, countdown, match cycle -- which is precisely Match flow. It governs the top-level structural question of how a session on the server progresses, not a gameplay balance rule or a mode-specific knob.

---

B6-RESULT | ktx:cvar:k_matchless_max_idle_time | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_matchless_max_idle_time

- canonical_id: ktx:cvar:k_matchless_max_idle_time
- name: k_matchless_max_idle_time
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Matchless mode only: maximum seconds a player may go idle (not firing) before being force-moved to spectator. This is a match-state management cvar -- it governs player lifecycle during the (matchless) session, with warning timers, forced spectator transitions, and a reconnect flow. The description header says "Matchless mode only" and the behavior (force-spectate + reconnect) is a match-flow enforcement tool. Closest to Match flow rather than Mode-scoped knobs (which covers gameplay-rule cvars scoped to a mode, not lifecycle management).

---

B6-RESULT | ktx:cvar:k_midair | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_midair

- canonical_id: ktx:cvar:k_midair
- name: k_midair
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Enables midair mode -- when on, only direct rocket hits and telefrags deal damage, frags require the target to be airborne above k_midair_minheight, and a 2-second respawn delay is forced. The description notes it "requires dmm4" and the disambiguation guide explicitly lists k_midair_* under Mode-scoped knobs. This is a sub-mode cvar scoped entirely to dmm4/midair.

---

B6-RESULT | ktx:cvar:k_midair_minheight | CATEGORIZED | category=Mode-scoped knobs | confidence=HIGH

### ktx:cvar:k_midair_minheight

- canonical_id: ktx:cvar:k_midair_minheight
- name: k_midair_minheight
- type: cvar

- NEW category_inferred: Mode-scoped knobs
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Sets the minimum airborne height a target must exceed for rocket damage to apply in midair mode. The description explicitly states "Has no effect unless k_midair is on." The k_midair_* prefix + the midair-mode-only effect gate = Mode-scoped knobs per the disambiguation guide (k_midair_* listed explicitly).

---

B6-RESULT | ktx:cvar:k_prewar | CATEGORIZED | category=Match flow | confidence=HIGH

### ktx:cvar:k_prewar

- canonical_id: ktx:cvar:k_prewar
- name: k_prewar
- type: cvar

- NEW category_inferred: Match flow
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls fire and jump permissions during the prewar (warm-up) phase before the match goes live. The three values (no fire/jump, allowed, allowed after 'ready') govern the prewar phase -- a match-state transition period. This is Match flow by definition; prewar is explicitly listed in the Match flow disambiguation guide. One of the 11 D20 template anchors.

---

B6-RESULT | ktx:cvar:k_sayteam_to_spec | CATEGORIZED | category=Spectator chat & visibility | confidence=HIGH

### ktx:cvar:k_sayteam_to_spec

- canonical_id: ktx:cvar:k_sayteam_to_spec
- name: k_sayteam_to_spec
- type: cvar

- NEW category_inferred: Spectator chat & visibility
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Controls KTX's policy for routing player teambind broadcasts to spectators, with four states (never / during match / during prewar / always). The description carries a "See also: QW team-chat visibility concept note" pointer confirming its cluster. The disambiguation guide says Spectator chat & visibility covers "k_sayteam_to_spec" by name. One of the 11 D20 template anchors (Session #9).

---

B6-RESULT | ktx:cvar:k_spectalk | CATEGORIZED | category=Spectator chat & visibility | confidence=HIGH

### ktx:cvar:k_spectalk

- canonical_id: ktx:cvar:k_spectalk
- name: k_spectalk
- type: cvar

- NEW category_inferred: Spectator chat & visibility
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Server-wide policy for whether spectators may publicly chat to players during a live match. Two-state (muted / allowed at all times). The description carries a "See also: QW team-chat visibility concept note" pointer. The disambiguation guide names k_spectalk explicitly under Spectator chat & visibility. One of the 11 D20 template anchors (Session #9).

---

B6-RESULT | ktx:cvar:k_vp_coop | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:cvar:k_vp_coop

- canonical_id: ktx:cvar:k_vp_coop
- name: k_vp_coop
- type: cvar

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Minimum percentage of eligible players required to pass a cooperative-mode vote (votecoop). Read use-site src/vote.c:312 under `case OV_COOP`. The k_vp_* prefix family is explicitly listed in the disambiguation guide under Voting. This is a vote-threshold cvar for a specific vote type.

---

B6-RESULT | ktx:cvar:k_vp_map | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:cvar:k_vp_map

- canonical_id: ktx:cvar:k_vp_map
- name: k_vp_map
- type: cvar

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Percentage of eligible voters required to pass a map-change vote (OV_MAP) or the /break next-map vote in matchless mode (OV_BREAK). Read use-sites at src/vote.c:257-258 and src/vote.c:245-247. k_vp_* prefix family is Voting per the disambiguation guide.

---

B6-RESULT | ktx:cvar:k_vp_nospecs | CATEGORIZED | category=Voting | confidence=HIGH

### ktx:cvar:k_vp_nospecs

- canonical_id: ktx:cvar:k_vp_nospecs
- name: k_vp_nospecs
- type: cvar

- NEW category_inferred: Voting
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: Percentage of eligible voters required to pass a no-spectators vote (OV_NOSPECS). Read use-site src/vote.c:304. k_vp_* prefix family is Voting per the disambiguation guide; this cvar sets the pass threshold for the /nospecs vote.

---
