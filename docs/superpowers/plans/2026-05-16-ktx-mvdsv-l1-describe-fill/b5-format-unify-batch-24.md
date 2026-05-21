# B5 format-unify ledger -- batch 24

**Batch:** 24 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:coop_nm_pu | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis prose with file:line refs and jargon | to-shape: D20-template

### ktx:command:coop_nm_pu

- canonical_id: ktx:command:coop_nm_pu
- prior length: 695
- new length: 233

- OLD description:
  > Toggles the k_nightmare_pu setting on or off and broadcasts the new state ('<name> enables/disables New Nightmare mode (drops powerups)'). While enabled, monsters drop powerups when they die (each death rolls k_nightmare_pu_droprate, default 0.15, for the drop). Has no effect while a match is in progress.

- NEW description:
  > Player command that toggles New Nightmare mode (k_nightmare_pu) on or off and announces the change to all players. While on, monsters drop powerups on death (drop rate controlled by k_nightmare_pu_droprate). Has no effect while a match is in progress.
  >
  > Default: off (follows k_nightmare_pu default).
  > Set by: any player via 'coop_nm_pu' command (match-gated).

---

B5-RESULT | ktx:command:hdptoggle | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs | to-shape: D20-template

### ktx:command:hdptoggle

- canonical_id: ktx:command:hdptoggle
- prior length: 502
- new length: 268

- OLD description:
  > Admin command that toggles server-wide whether players are allowed to change their handicap. It flips the k_lock_hdp lock and broadcasts whether handicap is now allowed or disallowed for everyone; while locked, players' /handicap commands are refused. Has no effect while a match is in progress.

- NEW description:
  > Admin command that toggles the server-wide handicap lock (k_lock_hdp) and announces the new state to all players. While locked, any player's attempt to change their handicap is refused. Has no effect while a match is in progress.
  >
  > Default: unlocked (follows k_lock_hdp default of 0).
  > Set by: admin command 'hdptoggle' (match-gated).

---

B5-RESULT | ktx:command:hook_classic | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:hook_classic

- canonical_id: ktx:command:hook_classic
- prior length: 674
- new length: 284

- OLD description:
  > CTF vote command: casts (or, if already cast, withdraws) your vote to switch the grappling-hook style to classic. When a majority is reached or an admin vetoes, the server sets the hook style to classic (k_ctf_hookstyle = 3) and announces it. Only usable in CTF mode and not while a match is in progress.

- NEW description:
  > CTF vote command: casts or withdraws your vote to switch the grappling-hook style to classic. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
  >
  > Default: n/a (vote command, not a persistent setting).
  > Set by: any player via 'hook_classic' (CTF mode, match-gated).

---

B5-RESULT | ktx:command:hook_crhook | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:hook_crhook

- canonical_id: ktx:command:hook_crhook
- prior length: 694
- new length: 283

- OLD description:
  > CTF vote command: casts (or, if already cast, withdraws) your vote to switch the grappling-hook style to crhook. When a majority is reached or an admin vetoes, the server sets the hook style to crhook (k_ctf_hookstyle = 4) and announces it. Only usable in CTF mode and not while a match is in progress.

- NEW description:
  > CTF vote command: casts or withdraws your vote to switch the grappling-hook style to crhook. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
  >
  > Default: n/a (vote command, not a persistent setting).
  > Set by: any player via 'hook_crhook' (CTF mode, match-gated).

---

B5-RESULT | ktx:command:hook_fast | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:hook_fast

- canonical_id: ktx:command:hook_fast
- prior length: 672
- new length: 280

- OLD description:
  > CTF vote command: casts (or, if already cast, withdraws) your vote to switch the grappling-hook style to fast. When a majority is reached or an admin vetoes, the server sets the hook style to fast (k_ctf_hookstyle = 2) and announces it. Only usable in CTF mode and not while a match is in progress.

- NEW description:
  > CTF vote command: casts or withdraws your vote to switch the grappling-hook style to fast. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
  >
  > Default: n/a (vote command, not a persistent setting).
  > Set by: any player via 'hook_fast' (CTF mode, match-gated).

---

B5-RESULT | ktx:command:hook_smooth | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:hook_smooth

- canonical_id: ktx:command:hook_smooth
- prior length: 677
- new length: 282

- OLD description:
  > CTF vote command: casts (or, if already cast, withdraws) your vote to switch the grappling-hook style to smooth. When a majority is reached or an admin vetoes, the server sets the hook style to smooth (k_ctf_hookstyle = 1) and announces it. Only usable in CTF mode and not while a match is in progress.

- NEW description:
  > CTF vote command: casts or withdraws your vote to switch the grappling-hook style to smooth. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
  >
  > Default: n/a (vote command, not a persistent setting).
  > Set by: any player via 'hook_smooth' (CTF mode, match-gated).

---

B5-RESULT | ktx:command:killer | FORMAT-UNIFIED | rev=1 | from-shape: adequate prose but missing Set-by line | to-shape: D20-template

### ktx:command:killer

- canonical_id: ktx:command:killer
- prior length: 349
- new length: 329

- OLD description:
  > Opens a chat "say" line addressed to the player who last killed you (your killer), pre-filled with that player's name. If your premsg / postmsg userinfo keys are set they are inserted before / after the name. If no such player can be found, prints "No name to display". Player command, usable outside a match.

- NEW description:
  > Opens a chat line pre-filled with the name of the player who last killed you, so you can send them a message. If your 'premsg' or 'postmsg' userinfo keys are set, they are inserted before and after the name. Prints "No name to display" if no killer is recorded.
  >
  > Default: n/a (command).
  > Set by: any player via 'killer' command (usable outside a match).

---

B5-RESULT | ktx:command:race_break | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:race_break

- canonical_id: ktx:command:race_break
- prior length: 523
- new length: 293

- OLD description:
  > In race mode, marks the calling player as not ready for the race (clears their race-ready state). If the player was actively running at the time, their run is ended and the server broadcasts "<name> has quit the race". Has no effect for spectators or when the race-mode command preconditions are not met.

- NEW description:
  > Race mode command: marks you as not ready for the race and clears your race-ready state. If you are actively running at the time, your run is ended and the server announces "<name> has quit the race". Has no effect for spectators.
  >
  > Default: n/a (command).
  > Set by: any player via 'race_break' (race mode only).

---

B5-RESULT | ktx:command:race_dl_record_demo | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:race_dl_record_demo

- canonical_id: ktx:command:race_dl_record_demo
- prior length: 694
- new length: 336

- OLD description:
  > Sends the caller a client-side download of the saved MVD demo for one stored race record. Takes the record number as an argument; prints 'record not found' if that record does not exist and 'demo for record #N is not available' if the record has no saved demo. Available to players and spectators.

- NEW description:
  > Downloads the saved demo for a stored race record to the requesting client. Takes the record number as an argument (1-based). Prints "record not found" if that record does not exist, or "demo for record #N is not available" if the record has no associated demo file.
  >
  > Default: n/a (command).
  > Set by: any player or spectator via 'race_dl_record_demo <record_number>' (race mode only).

---

B5-RESULT | ktx:command:race_set_timeout | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and constant names | to-shape: D20-template

### ktx:command:race_set_timeout

- canonical_id: ktx:command:race_set_timeout
- prior length: 802
- new length: 326

- OLD description:
  > Race-mode setup command (player / spectator-admin) taking one numeric argument: the race time limit in seconds. A value of 0 or empty resets to the default of 60 seconds; any other value is clamped to the range 1..3600 seconds. Has no effect while a race is running. On change it broadcasts the new time limit.

- NEW description:
  > Race mode command: sets the race time limit in seconds. A value of 0 or empty resets to the default (60 seconds); other values are clamped to 1-3600 seconds. Has no effect while a race is running; announces the new time limit on change.
  >
  > Range: 1-3600 seconds. Value 0 resets to default of 60 seconds.
  >
  > Default: 60 seconds.
  > Set by: any player or spectator via 'race_set_timeout <seconds>' (race mode only, not while a race is running).

---

B5-RESULT | ktx:command:timedown1 | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:command:timedown1

- canonical_id: ktx:command:timedown1
- prior length: 508
- new length: 318

- OLD description:
  > Decreases the match time limit (the timelimit cvar) by 1 minute and announces the new length to all players. The result is clamped to the range 0 to the k_timetop cvar. If lowering it would leave both timelimit and fraglimit at 0 the change is refused. The command is ignored while a match is in progress.

- NEW description:
  > Decreases the match time limit by 1 minute and announces the new value to all players. The result is clamped between 0 and k_timetop. If lowering the time limit would leave both timelimit and fraglimit at 0 simultaneously, the change is refused. Has no effect while a match is in progress.
  >
  > Default: n/a (command).
  > Set by: admin command 'timedown1' (match-gated).

---

B5-RESULT | ktx:cvar:k_end_tele_spawn | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:cvar:k_end_tele_spawn

- canonical_id: ktx:cvar:k_end_tele_spawn
- prior length: 464
- new length: 283

- OLD description:
  > On the map named "end" (the classic "The End" arena), controls whether the spawn point next to the teleporter (the "tele spawn", at a fixed origin) is kept. 0 = the tele spawn point is removed, so players never spawn there. 1 = the tele spawn point is kept (not removed). Has no effect on any other map.

- NEW description:
  > On the map named "end" only: controls whether the teleporter-adjacent spawn point is kept active.
  >
  > 0 = tele spawn removed; players cannot spawn there.
  > 1 = tele spawn kept active.
  >
  > Default: 0. Has no effect on any other map.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_freshteams_sweep_rl_ammo | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and condition listing | to-shape: D20-template

### ktx:cvar:k_freshteams_sweep_rl_ammo

- canonical_id: ktx:cvar:k_freshteams_sweep_rl_ammo
- prior length: 434
- new length: 297

- OLD description:
  > FreshTeams (dmm1) only: the number of rockets a player gains when picking up a rocket launcher they already own (a "sweep"), applied in place of the normal 5-rocket pickup. Active only while k_freshteams is on and k_freshteams_limit_sweep_ammo is enabled; otherwise the standard +5 rockets is given. Default 1.

- NEW description:
  > FreshTeams (dmm1) mode only: rockets gained when picking up a rocket launcher you already own (a sweep), replacing the normal +5 pickup. Only takes effect when k_freshteams and k_freshteams_limit_sweep_ammo are both on; otherwise the standard +5 rockets is given.
  >
  > Range: integer rocket count.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_freshteams_sweep_sng_ammo | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and condition listing | to-shape: D20-template

### ktx:cvar:k_freshteams_sweep_sng_ammo

- canonical_id: ktx:cvar:k_freshteams_sweep_sng_ammo
- prior length: 430
- new length: 295

- OLD description:
  > FreshTeams (dmm1) only: the number of nails a player gains when picking up a super nailgun they already own (a "sweep"), applied in place of the normal 30-nail pickup. Active only while k_freshteams is on and k_freshteams_limit_sweep_ammo is enabled; otherwise the standard +30 nails is given. Default 6.

- NEW description:
  > FreshTeams (dmm1) mode only: nails gained when picking up a super nailgun you already own (a sweep), replacing the normal +30 pickup. Only takes effect when k_freshteams and k_freshteams_limit_sweep_ammo are both on; otherwise the standard +30 nails is given.
  >
  > Range: integer nail count.
  >
  > Default: 6.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_freshteams_sweep_ssg_ammo | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and condition listing | to-shape: D20-template

### ktx:cvar:k_freshteams_sweep_ssg_ammo

- canonical_id: ktx:cvar:k_freshteams_sweep_ssg_ammo
- prior length: 427
- new length: 292

- OLD description:
  > FreshTeams (dmm1) only: the number of shells a player gains when picking up a super shotgun they already own (a "sweep"), applied in place of the normal 5-shell pickup. Active only while k_freshteams is on and k_freshteams_limit_sweep_ammo is enabled; otherwise the standard +5 shells is given. Default 1.

- NEW description:
  > FreshTeams (dmm1) mode only: shells gained when picking up a super shotgun you already own (a sweep), replacing the normal +5 pickup. Only takes effect when k_freshteams and k_freshteams_limit_sweep_ammo are both on; otherwise the standard +5 shells is given.
  >
  > Range: integer shell count.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_frp | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:cvar:k_frp

- canonical_id: ktx:cvar:k_frp
- prior length: 921
- new length: 347

- OLD description:
  > Fairpacks: controls which weapon a player's dropped backpack contains when they are killed. 0 = the weapon the player was currently wielding; 1 = the player's best owned weapon (highest-tier weapon they hold with ammo); 2 = the last weapon the player fired (dropped even if it has no ammo). Default 0.

- NEW description:
  > Fairpacks: controls which weapon appears in the backpack a player drops on death.
  >
  > 0 = the weapon currently wielded at death.
  > 1 = the best weapon the player holds with ammo (highest-tier).
  > 2 = the last weapon fired (dropped even if it has no ammo).
  >
  > Default: 0.
  > Set by: server config or 'fairpacks' admin command in-game.

---

B5-RESULT | ktx:cvar:k_lockmax | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:cvar:k_lockmax

- canonical_id: ktx:cvar:k_lockmax
- prior length: 566
- new length: 287

- OLD description:
  > Maximum number of teams allowed for a match to start. If the count of teams that have players ready exceeds this value, the match is blocked from starting and players are told to "Get rid of N teams!". Counted in teams. In Clan Arena and Race modes this cvar is ignored and the maximum is forced to 2.

- NEW description:
  > Maximum number of teams required for a match to start. If more teams have ready players than this value, the match is blocked and players are told "Get rid of N teams!". Ignored in Clan Arena and Race modes, where the maximum is forced to 2.
  >
  > Range: integer team count.
  >
  > Default: 2.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_lockmin | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and code-trace prose | to-shape: D20-template

### ktx:cvar:k_lockmin

- canonical_id: ktx:cvar:k_lockmin
- prior length: 551
- new length: 283

- OLD description:
  > Minimum number of teams required for a match to start. If the count of teams that have players ready is below this value, the match is blocked from starting and players are told "N more teams required!". Counted in teams. In Clan Arena and Race modes this cvar is ignored and the minimum is forced to 2.

- NEW description:
  > Minimum number of teams required for a match to start. If fewer teams have ready players than this value, the match is blocked and players are told "N more teams required!". Ignored in Clan Arena and Race modes, where the minimum is forced to 2.
  >
  > Range: integer team count.
  >
  > Default: 2.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_nightmare_pu_droprate | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesis with file:line refs and probability direction explanation | to-shape: D20-template

### ktx:cvar:k_nightmare_pu_droprate

- canonical_id: ktx:cvar:k_nightmare_pu_droprate
- prior length: 507
- new length: 271

- OLD description:
  > Probability (0.0 to 1.0) that a monster killed under Nightmare powerup mode (k_nightmare_pu on, skill 3+) drops a powerup. On each kill a random roll in [0,1) is taken; if it exceeds this value no powerup is dropped, so higher values mean more frequent drops. Has no effect unless k_nightmare_pu is on.

- NEW description:
  > Drop probability for powerups when a monster is killed in Nightmare powerup mode (k_nightmare_pu on, skill 3+). Higher values mean more frequent drops. Has no effect unless k_nightmare_pu is enabled.
  >
  > Range: 0.0 to 1.0.
  >
  > Default: 0.15.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_spm_custom_model | FORMAT-UNIFIED | rev=1 | from-shape: affirmed source_inline, slight normalisation to D20 shape | to-shape: D20-template

### ktx:cvar:k_spm_custom_model

- canonical_id: ktx:cvar:k_spm_custom_model
- prior length: 364
- new length: 322

- OLD description:
  > Selects the model used for spawn-point marker entities. A purely numeric value selects a built-in model: 0 = the gold-key model (progs/w_g_key.mdl), any non-zero number = the wizard model (progs/wizard.mdl). A non-numeric value is treated as a literal model path (e.g. "progs/spawn.mdl") and used directly.

- NEW description:
  > Model used for spawn-point marker entities. Numeric values select a built-in model; non-numeric values are used as a literal model path.
  >
  > 0 = gold-key model (progs/w_g_key.mdl).
  > 1 (or any non-zero number) = wizard model (progs/wizard.mdl).
  > "progs/spawn.mdl" (example) = any custom model path.
  >
  > Default: 0 (gold-key model).
  > Set by: server config.

---
