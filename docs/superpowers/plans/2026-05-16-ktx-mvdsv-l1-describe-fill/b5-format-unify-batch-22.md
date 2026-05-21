# B5 format-unify ledger -- batch 22

**Batch:** 22 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:fav10_add | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:command:fav10_add

- canonical_id: ktx:command:fav10_add
- prior length: 313
- new length: 196

- OLD description:
  > Spectator command. Stores the player you are currently tracking into indexed favourite slot 10. Does nothing unless you are tracking a real player; if you are, the tracked player's identity is written to slot 10 (overwriting any previous occupant), and 10fav_go later snaps your POV to whoever occupies that slot.

- NEW description:
  > Spectator command. Saves the player you are currently tracking into favourite slot 10, overwriting any previous entry. Does nothing if you are not tracking a real player. Use 10fav_go to snap your view to whoever is stored in that slot.
  >
  > Default: n/a (command).
  > Set by: any spectator in-game.

---

B5-RESULT | ktx:command:fav11_add | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:command:fav11_add

- canonical_id: ktx:command:fav11_add
- prior length: 313
- new length: 196

- OLD description:
  > Spectator command. Stores the player you are currently tracking into indexed favourite slot 11. Does nothing unless you are tracking a real player; if you are, the tracked player's identity is written to slot 11 (overwriting any previous occupant), and 11fav_go later snaps your POV to whoever occupies that slot.

- NEW description:
  > Spectator command. Saves the player you are currently tracking into favourite slot 11, overwriting any previous entry. Does nothing if you are not tracking a real player. Use 11fav_go to snap your view to whoever is stored in that slot.
  >
  > Default: n/a (command).
  > Set by: any spectator in-game.

---

B5-RESULT | ktx:command:fav12_add | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:command:fav12_add

- canonical_id: ktx:command:fav12_add
- prior length: 313
- new length: 196

- OLD description:
  > Spectator command. Stores the player you are currently tracking into indexed favourite slot 12. Does nothing unless you are tracking a real player; if you are, the tracked player's identity is written to slot 12 (overwriting any previous occupant), and 12fav_go later snaps your POV to whoever occupies that slot.

- NEW description:
  > Spectator command. Saves the player you are currently tracking into favourite slot 12, overwriting any previous entry. Does nothing if you are not tracking a real player. Use 12fav_go to snap your view to whoever is stored in that slot.
  >
  > Default: n/a (command).
  > Set by: any spectator in-game.

---

B5-RESULT | ktx:command:fresh | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line, code-trace, and jargon | to-shape: D20-template

### ktx:command:fresh

- canonical_id: ktx:command:fresh
- prior length: 316
- new length: 285

- OLD description:
  > Toggles FreshTeams mode (the k_freshteams server cvar) on or off. FreshTeams is the dmm1-based fresh-spawn ruleset; the command flips it between off (0) and on (1) and broadcasts the new state. It requires deathmatch mode 4 (dmm4) to enable and refuses to run while a match is in progress or while race mode is active.

- NEW description:
  > Toggles FreshTeams mode on or off and broadcasts the new state. FreshTeams is a fresh-spawn ruleset based on deathmatch 1.
  >
  > Cannot be used while a match is in progress or while race mode is active. Enabling requires dmm1 (deathmatch == 1); the attempt is refused otherwise.
  >
  > Default: n/a (command).
  > Set by: admin command 'fresh' in-game.

---

B5-RESULT | ktx:command:race_hide_players | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:command:race_hide_players

- canonical_id: ktx:command:race_hide_players
- prior length: 318
- new length: 290

- OLD description:
  > Toggles the calling player's own preference for whether other racers are drawn during a race. Each call flips between hiding and showing other racers for that player only (other players are unaffected) and prints the new state; if a race is currently running the change is applied immediately. Only works in race mode.

- NEW description:
  > Toggles your personal preference for whether other racers are drawn while you race. Each call flips between hidden and shown for you only -- other players are not affected. If a race is currently running the change takes effect immediately.
  >
  > Only works in race mode; has no effect in other modes.
  >
  > Default: n/a (command).
  > Set by: any player in-game (race mode only).

---

B5-RESULT | ktx:command:ra_pos | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:command:ra_pos

- canonical_id: ktx:command:ra_pos
- prior length: 317
- new length: 295

- OLD description:
  > Rocket Arena only. Privately prints your current position in the challenger waiting queue to your own console: "You are next", "There is 1 person ahead of you", "There are N people ahead of you", or "You are out of line" if you are not queued. Has no effect for the current arena winner/loser or outside Rocket Arena.

- NEW description:
  > Rocket Arena only. Privately prints your current position in the challenger queue to your own console.
  >
  > Messages: "You are next", "There is 1 person ahead of you", "There are N people ahead of you", or "You are out of line" if you are not queued.
  >
  > Has no effect for the current arena winner/loser or outside Rocket Arena.
  >
  > Default: n/a (command).
  > Set by: any player in-game (Rocket Arena mode only).

---

B5-RESULT | ktx:command:slowready | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code-trace jargon | to-shape: D20-template

### ktx:command:slowready

- canonical_id: ktx:command:slowready
- prior length: 319
- new length: 300

- OLD description:
  > Marks you as ready for the match to start, exactly like the ready command, except it does not trigger the idle-bot check that ready performs when not all players are ready yet. Usable by players and spectators and outside an active match. Has no effect during a running match, in practice mode, or once a match is over.

- NEW description:
  > Marks you as ready for the match to start, like the 'ready' command, but skips the idle-player check that 'ready' triggers when not all players are ready yet.
  >
  > Usable by players and spectators, and outside an active match. Has no effect during a running match, in practice mode, or after the match is over.
  >
  > Default: n/a (command).
  > Set by: any player or spectator in-game.

---

B5-RESULT | ktx:command:spawn_show | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line, code-trace, and jargon | to-shape: D20-template

### ktx:command:spawn_show

- canonical_id: ktx:command:spawn_show
- prior length: 314
- new length: 311

- OLD description:
  > Cycles visible spawn points on or off (k_spm_show) and tells you the new state. The mode advances through: 0 = off (spawns hidden), 1 = prewar (spawns shown only before the match starts), 2 = match (spawns shown during the match). Advancing past match wraps back to off. Has no effect while a match is in progress.

- NEW description:
  > Cycles the spawn-point visibility mode (k_spm_show) forward and announces the new state. Has no effect while a match is in progress.
  >
  > 0 = off (spawn points hidden).
  > 1 = prewar (spawn points shown only before the match starts).
  > 2 = match (spawn points shown during the match).
  > Advancing past 2 wraps back to 0.
  >
  > Default: n/a (command).
  > Set by: admin command 'spawn_show' in-game.

---

B5-RESULT | ktx:command:totmode | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:command:totmode

- canonical_id: ktx:command:totmode
- prior length: 317
- new length: 292

- OLD description:
  > Toggles 'Tribe of Tjernobyl' mode on or off (and broadcasts the new state). Enabling it requires deathmatch mode 4 (dmm4); the attempt is refused otherwise. Turning it on also forces midair mode and instagib off, and the player's current ammo is re-applied. Only takes effect when a rules change is currently allowed.

- NEW description:
  > Toggles Tribe of Tjernobyl (ToT) mode on or off and broadcasts the new state. Only takes effect when a rules change is currently allowed.
  >
  > Enabling requires dmm4; the attempt is refused otherwise. Turning ToT on also disables midair mode and instagib if either is active.
  >
  > Default: n/a (command).
  > Set by: admin command 'totmode' in-game.

---

B5-RESULT | ktx:cvar:demo_skip_ktffa_record | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:demo_skip_ktffa_record

- canonical_id: ktx:cvar:demo_skip_ktffa_record
- prior length: 318
- new length: 275

- OLD description:
  > When server-side MVD auto-recording is enabled (demo_tmp_record non-zero), this controls whether free-for-all (FFA) games are recorded. 0 = FFA games are auto-recorded like other modes; 1 (any non-zero) = FFA games are skipped and not auto-recorded. Has no effect when demo_tmp_record is off or for non-FFA game types.

- NEW description:
  > Controls whether FFA games are included in server-side MVD auto-recording. Only applies when demo_tmp_record is enabled; has no effect otherwise.
  >
  > 0 = FFA games are auto-recorded like other modes.
  > 1 = FFA games are skipped and not recorded.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:_k_captcolor1 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line, code-trace, and internal jargon | to-shape: D20-template

### ktx:cvar:_k_captcolor1

- canonical_id: ktx:cvar:_k_captcolor1
- prior length: 323
- new length: 267

- OLD description:
  > Internal mod-state cvar (not operator-tuned). During captain-based team picking, the server stores the first captain's player colors (top and bottom color, space-separated) here; when that captain picks a player, the picked player is force-set to these colors. Holds runtime state set and consumed by the team-picking code.

- NEW description:
  > Internal mod-state cvar -- not intended for operator configuration. Stores captain #1's player colors (top color and bottom color, space-separated) during captain-based team picking. When captain #1 picks a player, the picked player is assigned these colors.
  >
  > Default: "" (empty; set at runtime by the team-picking process).
  > Set by: internal mod state only.

---

B5-RESULT | ktx:cvar:k_cmd_fp_dontkick | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_cmd_fp_dontkick

- canonical_id: ktx:cvar:k_cmd_fp_dontkick
- prior length: 314
- new length: 287

- OLD description:
  > Controls whether repeat command flooders are kicked. 0 = flooders are kicked from the server after k_cmd_fp_kick warnings (in addition to being warned and locked out). 1 = flooders are only warned and locked out, never kicked. Clamped to 0 or 1. Applies only to command flood protection (not say/chat flood, k_fp).

- NEW description:
  > Controls whether players who repeatedly flood the server with commands are kicked, in addition to being warned and locked out. Applies to command flood protection only (not say/chat flood -- see k_fp).
  >
  > 0 = flooders are warned, locked out, and eventually kicked.
  > 1 = flooders are warned and locked out, but never kicked.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_force_mapcycle | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_force_mapcycle

- canonical_id: ktx:cvar:k_force_mapcycle
- prior length: 320
- new length: 280

- OLD description:
  > Forces use of the map cycle on level change even when deathmatch is 0. Normally the next map is selected from the map cycle only when deathmatch is non-zero; with this enabled the map cycle is also followed when deathmatch is 0. 0 = off, 1 = on. (Has no effect when samelevel is set, which always keeps the current map.)

- NEW description:
  > Forces the server to follow the map cycle on level change even when deathmatch is 0. Normally the map cycle is only used when deathmatch is non-zero. Has no effect when samelevel is set (samelevel always keeps the current map regardless).
  >
  > 0 = off (map cycle requires deathmatch non-zero).
  > 1 = map cycle is followed even when deathmatch is 0.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_monster_spawn_time | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_monster_spawn_time

- canonical_id: ktx:cvar:k_monster_spawn_time
- prior length: 314
- new length: 296

- OLD description:
  > Base respawn delay, in seconds, before a killed monster reappears (single-player/coop style monster modes, skill 3+). A value of 0 or below disables monster respawning entirely. When positive, the actual delay is the value plus a random extra of up to half the value (value + value*rand*0.5). Clamped to 0..999999.

- NEW description:
  > Base respawn delay in seconds before a killed monster reappears. Only applies in single-player/coop monster modes at skill 3 or higher.
  >
  > Range: 0 to 999999 (seconds, clamped). A value of 0 or below disables monster respawning. When positive, the actual delay is the base value plus a random bonus of up to half the base value.
  >
  > Default: 20.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_pow_s | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_pow_s

- canonical_id: ktx:cvar:k_pow_s
- prior length: 323
- new length: 257

- OLD description:
  > Per-type switch for the Environmental Protection Suit (biosuit) powerup. 0 = suit entities are hidden and cannot be picked up; 1 = suit enabled. Only takes effect while powerups are globally enabled (see k_pow); the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset.

- NEW description:
  > Per-type toggle for the Environmental Protection Suit (biosuit) powerup. Only applies while powerups are globally enabled (k_pow).
  >
  > 0 = suit is hidden and cannot be picked up.
  > 1 = suit is available.
  >
  > Default: 1.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_race_pace_legal | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_race_pace_legal

- canonical_id: ktx:cvar:k_race_pace_legal
- prior length: 321
- new length: 277

- OLD description:
  > Controls whether a run completed while the pacemaker ghost is active counts as a legal record. When 0, runs made with the pacemaker enabled are blocked from being saved as a record; when 1, such runs are allowed to set records. Only relevant while the pacemaker is enabled; with the pacemaker off, records are unaffected.

- NEW description:
  > Controls whether a run completed with the pacemaker ghost active is allowed to set a record. Has no effect when the pacemaker is off.
  >
  > 0 = runs made with the pacemaker enabled do not count as records.
  > 1 = runs made with the pacemaker enabled can set records.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_race_simultaneous | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_race_simultaneous

- canonical_id: ktx:cvar:k_race_simultaneous
- prior length: 324
- new length: 293

- OLD description:
  > In race mode, controls whether queued players race one at a time or all together. When 0, players take turns: each ready racer runs the course alone, others wait in the queue. When 1 (or whenever race-match mode is active), every ready player in the queue is made an active racer and they all race the course simultaneously.

- NEW description:
  > In race mode, controls whether queued players race individually in turn or all race simultaneously. Race-match mode enables simultaneous racing regardless of this setting.
  >
  > 0 = queued racers take turns; each player runs the course alone while others wait.
  > 1 = all ready players in the queue race the course at the same time.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_spec_info | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line, code-trace, and jargon | to-shape: D20-template

### ktx:cvar:k_spec_info

- canonical_id: ktx:cvar:k_spec_info
- prior length: 320
- new length: 296

- OLD description:
  > Bitmask controlling extra 'moreinfo' status (powerups, armor, weapons) sent to spectators. Bit 0 (value 1) = on/off: when set, the extra info is sent to spectators. Bit 1 (value 2) = restrict delivery to admin-status spectators only; when clear, all spectators receive it. With both bits clear (0) no extra info is sent.

- NEW description:
  > Bitmask controlling whether extra player-status info (powerups, armor, weapons) is sent to spectators and who receives it.
  >
  > 0 = no extra info sent to spectators.
  > 1 = extra info sent to all spectators.
  > 2 = extra info sent to admin-status spectators only (add to 1: value 3).
  >
  > Default: 0.
  > Set by: server config or 'infospec' / 'infolock' admin commands in-game.

---

B5-RESULT | ktx:cvar:k_teamoverlay | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_teamoverlay

- canonical_id: ktx:cvar:k_teamoverlay
- prior length: 323
- new length: 287

- OLD description:
  > Enables sending the Quake3-style team overlay (live teammate location/status info, the "ti" team-info stream) to players on a team. 0 = team info is sent to spectators only; 1 = team info is also sent to teammates (subject to each client requesting it and not in duel or race). Only takes effect in team, CTF or coop games.

- NEW description:
  > Controls whether live teammate location/status info (team overlay) is sent to players on a team. Only takes effect in team, CTF, or coop games; no effect in duel or race.
  >
  > 0 = team info is sent to spectators only.
  > 1 = team info is also sent to teammates (each client must have requested it).
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_teleport_cap | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line and code-trace | to-shape: D20-template

### ktx:cvar:k_teleport_cap

- canonical_id: ktx:cvar:k_teleport_cap
- prior length: 319
- new length: 290

- OLD description:
  > In yawn mode, the percentage of a player's speed that is lost when passing through a teleporter. Range 0-100 (0 = full speed preserved, 100 = velocity reduced toward the floor). Exit speed is the entry speed scaled by (1 - k_teleport_cap/100), with a minimum preserved speed of 300. Has no effect when yawn mode is off.

- NEW description:
  > In yawn mode, the percentage of a player's entry speed that is lost on passing through a teleporter. Has no effect when yawn mode is off.
  >
  > Range: 0 to 100 (percent, clamped). 0 = full entry speed preserved; 100 = maximum speed reduction. Exit speed is never lower than 300 regardless of the value.
  >
  > Default: 24.
  > Set by: server config or 'setTeleportCap' admin command in-game.

---
