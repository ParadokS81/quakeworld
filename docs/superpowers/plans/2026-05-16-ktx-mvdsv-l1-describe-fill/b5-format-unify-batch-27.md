# B5 format-unify ledger -- batch 27

**Batch:** 27 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:about | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (229 chars) | to-shape: D20-template

### ktx:command:about

- canonical_id: ktx:command:about
- prior length: 229
- new length: 188

- OLD description:
  > Prints a server-information panel to the issuing client: QuakeWorld server name/version/build/date/homepage (from the qws_* cvars) and the running mod's name/version/build (from the qwm_* cvars). Read-only; changes no game state.

- NEW description:
  > Prints the server identity panel to the issuing player: server name, version, build, date, and homepage (from the qws_* cvars), followed by the mod name, version, and build (from the qwm_* cvars). Read-only.
  >
  > Set by: n/a (read-only command).

---

B5-RESULT | ktx:command:cam | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (243 chars) | to-shape: D20-template

### ktx:command:cam

- canonical_id: ktx:command:cam
- prior length: 243
- new length: 235

- OLD description:
  > Prints camera-control help to the invoking spectator: how to jump between spawn points (impulse 1), that [attack] changes the spectator camera mode, and that [jump] changes the tracked target. Produces console text only; changes no game state.

- NEW description:
  > Prints camera-control help to the invoking spectator. Lists: impulse 1 to jump between spawn points, [attack] to change camera mode, [jump] to change the tracked target. Spectator-only. Read-only.
  >
  > Set by: n/a (read-only command).

---

B5-RESULT | ktx:command:discharge | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (241 chars) | to-shape: D20-template

### ktx:command:discharge

- canonical_id: ktx:command:discharge
- prior length: 241
- new length: 223

- OLD description:
  > Toggles whether underwater weapon discharges (the chain-reaction self-damage when a discharge weapon is fired in water) are enabled, by flipping the k_dis cvar and broadcasting the change. The toggle is rejected while a match is in progress.

- NEW description:
  > Toggles underwater weapon discharges (chain-reaction self-damage when firing a discharge weapon in water). Broadcasts the new state to all players. Has no effect while a match is in progress.
  >
  > Set by: admin command 'discharge' (flips the k_dis cvar).

---

B5-RESULT | ktx:command:fav_all_del | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (238 chars) | to-shape: D20-template

### ktx:command:fav_all_del

- canonical_id: ktx:command:fav_all_del
- prior length: 238
- new length: 224

- OLD description:
  > Spectator-only command that clears the spectator's entire personal favourites list, zeroing every slot, then prints a message confirming whether the list was actually cleared or was already empty. Usable while a live match is in progress.

- NEW description:
  > Clears the spectator's entire personal favourites list, zeroing every slot. Prints a confirmation message indicating whether the list was cleared or was already empty. Spectator-only; usable during a live match.
  >
  > Set by: any spectator 'fav_all_del'.

---

B5-RESULT | ktx:command:fpslist | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (242 chars) | to-shape: D20-template

### ktx:command:fpslist

- canonical_id: ktx:command:fpslist
- prior length: 242
- new length: 224

- OLD description:
  > Prints a per-player framerate table to the issuer, listing each connected player's current, maximum, minimum, and average frames per second (derived from their reported frame times). Reports "No players present" when no players are connected.

- NEW description:
  > Prints a per-player framerate table to the issuer: current, maximum, minimum, and average FPS for each connected player, derived from their reported frame times. Reports "No players present" when empty.
  >
  > Set by: n/a (read-only command).

---

B5-RESULT | ktx:command:pos_move | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (231 chars) | to-shape: D20-template

### ktx:command:pos_move

- canonical_id: ktx:command:pos_move
- prior length: 231
- new length: 228

- OLD description:
  > Restores the player's saved position -- origin, view angles, and velocity -- from the previously stored position slot. Rate-limited to one move per second, and subject to the server's position-command restrictions (Pos_Disallowed).

- NEW description:
  > Restores the player's saved position: origin, view angles, and velocity from the stored slot. Rate-limited to one restore per second. Has no effect when position commands are restricted by the server.
  >
  > Set by: any player 'pos_move'.

---

B5-RESULT | ktx:command:race_chasecam | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (229 chars) | to-shape: D20-template

### ktx:command:race_chasecam

- canonical_id: ktx:command:race_chasecam
- prior length: 229
- new length: 213

- OLD description:
  > Toggles the calling spectator's race chasecam follow on or off (whether they automatically track the active racer with the chasecam). Has no effect if the caller is a racer or when the race-mode command preconditions are not met.

- NEW description:
  > Toggles the spectator's race chasecam follow on or off. Has no effect if the caller is an active racer or if race-mode preconditions are not met. Spectator-only.
  >
  > Set by: any spectator 'race_chasecam'.

---

B5-RESULT | ktx:command:race_ready | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (232 chars) | to-shape: D20-template

### ktx:command:race_ready

- canonical_id: ktx:command:race_ready
- prior length: 232
- new length: 230

- OLD description:
  > Marks the calling player as ready to race, adding them to the race line-up. Has no effect for spectators or outside race mode; in race match mode it is refused once a match round is already running ('Cannot join match in progress').

- NEW description:
  > Marks the calling player as ready to race, adding them to the race line-up. Has no effect for spectators or outside race mode. In race match mode, refused once a round is in progress ("Cannot join match in progress").
  >
  > Set by: any player 'race_ready'.

---

B5-RESULT | ktx:command:tkfjump | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (234 chars) | to-shape: D20-template

### ktx:command:tkfjump

- canonical_id: ktx:command:tkfjump
- prior length: 234
- new length: 225

- OLD description:
  > Toggles whether the server allows kfjump (the scripted forward rocket-jump assist: switch to RL, turn 180 degrees, and fire). It flips the k_disallow_kfjump cvar and broadcasts whether kfjump is now enabled or disabled for all players. The command is ignored while a match is in progress.

- NEW description:
  > Toggles server permission for kfjump (scripted forward rocket-jump: switch to RL, turn 180, fire). Flips the k_disallow_kfjump cvar and broadcasts the result. Ignored while a match is in progress.
  >
  > Set by: admin command 'tkfjump'.

---

B5-RESULT | ktx:command:tkrjump | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (234 chars) | to-shape: D20-template

### ktx:command:tkrjump

- canonical_id: ktx:command:tkrjump
- prior length: 234
- new length: 211

- OLD description:
  > Toggles whether the server allows krjump (the kill-rjump trick action). It flips the k_disallow_krjump cvar and broadcasts whether krjump is now enabled or disabled for all players. The command is ignored while a match is in progress.

- NEW description:
  > Toggles server permission for krjump (the kill-rjump trick action). Flips the k_disallow_krjump cvar and broadcasts the result. Ignored while a match is in progress.
  >
  > Set by: admin command 'tkrjump'.

---

B5-RESULT | ktx:command:tp | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (242 chars) | to-shape: D20-template

### ktx:command:tp

- canonical_id: ktx:command:tp
- prior length: 242
- new length: 218

- OLD description:
  > Cycles the server's teamplay setting through the values 1 -> 2 -> 3 -> 4 -> back to 1 on each invocation, and broadcasts the new value. Has no effect while a match is in progress, and is rejected unless the current mode is a team or CTF mode.

- NEW description:
  > Cycles the teamplay setting through 1 -> 2 -> 3 -> 4 -> 1 and broadcasts the new value. Has no effect while a match is in progress. Only available in team or CTF modes.
  >
  > Set by: admin command 'tp'.

---

B5-RESULT | ktx:command:wp_reset | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (233 chars) | to-shape: D20-template

### ktx:command:wp_reset

- canonical_id: ktx:command:wp_reset
- prior length: 233
- new length: 213

- OLD description:
  > Clears the calling player's accumulated per-weapon stats (hits/attacks counters used by the weapon-stats display). Only works before a match starts -- it does nothing while a match is in progress. Affects only the caller's own stats.

- NEW description:
  > Clears the calling player's per-weapon stats (hits and attacks counters used by the weapon-stats display). Only works before a match starts; does nothing while a match is in progress.
  >
  > Set by: any player 'wp_reset'.

---

B5-RESULT | ktx:cvar:k_disallow_kfjump | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (244 chars) | to-shape: D20-template

### ktx:cvar:k_disallow_kfjump

- canonical_id: ktx:cvar:k_disallow_kfjump
- prior length: 244
- new length: 261

- OLD description:
  > Server-side toggle for the kfjump command (the scripted forward rocket-jump assist: switch to RL, turn 180 degrees, and fire). 0 = kfjump allowed. 1 (any non-zero) = kfjump disabled; invoking it prints "kfjump is disabled" and performs no jump.

- NEW description:
  > Controls whether the kfjump trick (scripted forward rocket-jump: switch to RL, turn 180 degrees, fire) is permitted server-wide.
  >
  > 0 = kfjump allowed.
  > 1 = kfjump disabled; invoking it prints "kfjump is disabled" and performs no jump.
  >
  > Default: 1.
  > Set by: server config or admin command 'tkfjump'.

---

B5-RESULT | ktx:cvar:k_nightmare_pu | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (243 chars) | to-shape: D20-template

### ktx:cvar:k_nightmare_pu

- canonical_id: ktx:cvar:k_nightmare_pu
- prior length: 243
- new length: 267

- OLD description:
  > Enables the Nightmare powerup-drop behavior: when on, monsters killed at skill 3+ have a chance to drop a powerup (Quad, Pentagram, or Ring) at their death location. The drop probability is governed by k_nightmare_pu_droprate. 0 = off, 1 = on.

- NEW description:
  > Enables Nightmare powerup drops: monsters killed at skill 3 or higher have a chance to drop a Quad, Pentagram, or Ring at their death location. Drop probability is set by k_nightmare_pu_droprate.
  >
  > 0 = disabled.
  > 1 = enabled.
  >
  > Default: 0.
  > Set by: server config or admin command 'nightmare_pu'.

---

B5-RESULT | ktx:cvar:k_no_wizard_animation | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (232 chars) | to-shape: D20-template

### ktx:cvar:k_no_wizard_animation

- canonical_id: ktx:cvar:k_no_wizard_animation
- prior length: 232
- new length: 230

- OLD description:
  > Controls whether the floating wizard model used for spectator camera points animates. 0 = the wizard model's animation frame advances each think tick (animated); non-zero = the animation frame is held, so the wizard model is static.

- NEW description:
  > Controls whether the floating wizard model used for spectator camera points animates.
  >
  > 0 = wizard model animates (frame advances each tick).
  > 1 = wizard model is static (animation held).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_short_gib | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (240 chars) | to-shape: D20-template

### ktx:cvar:k_short_gib

- canonical_id: ktx:cvar:k_short_gib
- prior length: 240
- new length: 225

- OLD description:
  > Controls how long gib corpse pieces persist before the server removes them. When set to a non-zero value, each gib is removed 2 seconds after it is thrown. When set to 0, each gib is removed after a random delay of 10 to 20 seconds instead.

- NEW description:
  > Controls how long gib corpse pieces persist before removal.
  >
  > 0 = each gib removed after a random delay of 10 to 20 seconds.
  > 1 = each gib removed 2 seconds after it is thrown.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_spm_show | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (229 chars) | to-shape: D20-template

### ktx:cvar:k_spm_show

- canonical_id: ktx:cvar:k_spm_show
- prior length: 229
- new length: 268

- OLD description:
  > Controls when spawn-point marker entities are visible to players. 0 = disabled (markers never shown); 1 = shown during prewar only (hidden once the match starts); 2 = shown during prewar and kept visible during the match as well.

- NEW description:
  > Controls when spawn-point marker entities are visible to players.
  >
  > 0 = markers never shown.
  > 1 = markers shown during prewar only (hidden once the match starts).
  > 2 = markers shown during prewar and remain visible during the match.
  >
  > Default: 0.
  > Set by: server config or admin command 'spm_show'.

---

B5-RESULT | ktx:cvar:k_timetop | FORMAT-UNIFIED | rev=1 | from-shape: affirmed source_inline prose (244 chars) | to-shape: D20-template

### ktx:cvar:k_timetop

- canonical_id: ktx:cvar:k_timetop
- prior length: 244
- new length: 276

- OLD description:
  > Maximum match time limit, in minutes, that players may set via the in-game time/timeset votes. Player time-change requests are clamped to this ceiling. The server clamps it to the range 0-600; if it is 0 or below it is reset to a default of 30.

- NEW description:
  > Maximum match time limit (in minutes) that players may set via in-game time/timeset votes. Player-requested values are clamped to this ceiling.
  >
  > Range: 0-600 (server-clamped). Value 0 or below resets to 30 (server default).
  >
  > Default: 30 (effective when set to 0).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_vp_privategame | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (229 chars) | to-shape: D20-template

### ktx:cvar:k_vp_privategame

- canonical_id: ktx:cvar:k_vp_privategame
- prior length: 229
- new length: 268

- OLD description:
  > Minimum share of eligible voters (as a percentage) required to pass a /privategame vote, which toggles private-game mode (logins forced on the server). Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100.

- NEW description:
  > Minimum percentage of eligible voters required to pass a private-game vote (toggling forced logins on the server).
  >
  > Range: 51-100 (clamped; values below 51 treated as 51, above 100 treated as 100).
  >
  > Default: 51.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_vp_rpickup | FORMAT-UNIFIED | rev=1 | from-shape: verbose synthesized prose (241 chars) | to-shape: D20-template

### ktx:cvar:k_vp_rpickup

- canonical_id: ktx:cvar:k_vp_rpickup
- prior length: 241
- new length: 280

- OLD description:
  > Minimum share of eligible voters (as a percentage) required to pass a random-pickup vote (the /rpickup random team-shuffle vote; also reused for the swapall vote). Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100.

- NEW description:
  > Minimum percentage of eligible voters required to pass a random-pickup vote (random team shuffle). Also governs the swapall vote threshold (no separate cvar).
  >
  > Range: 51-100 (clamped; values below 51 treated as 51, above 100 treated as 100).
  >
  > Default: 51.
  > Set by: server config.

---
