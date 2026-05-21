# B5 format-unify ledger -- batch 21

**Batch:** 21 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:cvar:k_vp_coop | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_vp_coop

- canonical_id: ktx:cvar:k_vp_coop
- prior length: 463
- new length: 341

- OLD description:
  > The percentage of eligible voters required to pass a cooperative-mode vote (the /votecoop command, which switches the server into coop mode). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)).

- NEW description:
  > Minimum percentage of eligible players required to pass a cooperative-mode vote (switching the server to coop play).
  >
  > Range: 51-100 (whole-number percentage; values below 51 behave as 51). Required votes = ceil(percent/100 * player count excluding bots).
  >
  > Default: 66.
  > Set by: server config.

---

B5-RESULT | ktx:command:time5 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:time5

- canonical_id: ktx:command:time5
- prior length: 400
- new length: 280

- OLD description:
  > Sets the match timelimit to 5 minutes. The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 5. The command is ignored while a match is in progress; if the timelimit is already at the resulting value it reports it as unchanged, otherwise it broadcasts the new match length to everyone.

- NEW description:
  > Sets the match timelimit to 5 minutes (clamped to k_timetop; has no effect if k_timetop is below 5). Ignored while a match is in progress. Broadcasts the new match length to all players; reports unchanged if the value did not change.
  >
  > Default: n/a (command, not a cvar).
  > Set by: admin command 'time5' in-game or server console.

---

B5-RESULT | ktx:cvar:k_lock_hdp | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_lock_hdp

- canonical_id: ktx:cvar:k_lock_hdp
- prior length: 479
- new length: 317

- OLD description:
  > Locks player handicap, disallowing the handicap feature. 0 = handicap allowed (players may set a handicap value); non-zero = handicap locked: every player's effective handicap is forced to 100 (neutral) and the handicap command is refused with 'handicap changes are not allowed'. Toggled out of a match by the corresponding admin command.

- NEW description:
  > Locks player handicap. When enabled, every player's effective handicap is forced to 100 (neutral) and attempts to change it are refused.
  >
  > 0 = handicap allowed (players may set their own value).
  > 1 = handicap locked (forced to 100; changes refused with "handicap changes are not allowed").
  >
  > Default: 0.
  > Set by: server config or 'handicap' admin command in-game.

---

B5-RESULT | ktx:cvar:k_minrate | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_minrate

- canonical_id: ktx:cvar:k_minrate
- prior length: 401
- new length: 307

- OLD description:
  > Server-enforced minimum network rate, in bytes per second, that a connecting player or spectator's client `rate` setting is allowed. A client whose rate is below this value is told its rate is too low and is force-set up to this minimum. 0 disables the floor (no minimum enforced). Works alongside sv_maxrate, which caps the upper bound.

- NEW description:
  > Server-enforced minimum network rate (bytes per second) for connecting players and spectators. Clients with a rate below this value are told their rate is too low and are force-corrected up to this minimum.
  >
  > Range: 0-unlimited. 0 = no minimum enforced.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:race_cancel | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:race_cancel

- canonical_id: ktx:command:race_cancel
- prior length: 365
- new length: 253

- OLD description:
  > In race mode, aborts the calling player's own current run. It only acts if the caller is a racer with a run in progress: it plays an abort sound, broadcasts "<name> aborted <his/her> run", and ends the run. Has no effect for spectators, when the caller is not currently running, or when the race-mode command preconditions are not met.

- NEW description:
  > Race mode only. Aborts your own current run if one is in progress. Plays an abort sound and broadcasts "<name> aborted his/her run". Has no effect for spectators or when no run is active.
  >
  > Default: n/a (command).
  > Set by: any racer ('race_cancel').

---

B5-RESULT | ktx:command:race_simultaneous | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:race_simultaneous

- canonical_id: ktx:command:race_simultaneous
- prior length: 393
- new length: 287

- OLD description:
  > Race mode only. Toggles simultaneous racing on or off and broadcasts the change to all players ("<player> enables/disables simultaneous racing"). When on, every readied racer runs the course at the same time instead of one racer at a time. Only usable when a race is not currently in progress; sets the k_race_simultaneous server cvar.

- NEW description:
  > Race mode only. Toggles simultaneous racing on or off. When on, all readied racers run the course at the same time; when off, racers take turns. Broadcasts the change to all players. Has no effect while a race is in progress.
  >
  > Default: n/a (command; sets k_race_simultaneous).
  > Set by: admin command 'race_simultaneous' in-game.

---

B5-RESULT | ktx:cvar:k_extralog_xsd_uri | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_extralog_xsd_uri

- canonical_id: ktx:cvar:k_extralog_xsd_uri
- prior length: 366
- new length: 296

- OLD description:
  > Sets the XML Schema location string written into the detailed match log's root element. Its value is emitted verbatim as the xsi:noNamespaceSchemaLocation attribute of the <ktxlog> element when the extra log (k_extralog) is active; it identifies the .xsd that describes the log format and has no effect unless extra logging is enabled.

- NEW description:
  > URI written as the schema location into the extra match log's root element when k_extralog is active. Identifies the .xsd that validates the log format. Has no effect unless k_extralog is enabled.
  >
  > Default: "http://mirror.quakeworld.eu/pub/quakeworld/servers/ktx/ktxlog_0.1.xsd".
  > Set by: server config.

---

B5-RESULT | ktx:command:s-l | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:s-l

- canonical_id: ktx:command:s-l
- prior length: 450
- new length: 291

- OLD description:
  > Resends a direct private message to the player you most recently targeted with s-p. Usage: s-l <text>. The text reaches only that one recipient; if no prior s-p recipient is recorded or that client has left, it reports that no client was found. During a match, players and spectators cannot message across the player/spectator divide.

- NEW description:
  > Sends a direct private message to the player you most recently targeted with s-p. Only that recipient sees the text. Reports "client not found" if no prior s-p target exists or that player has left. Players and spectators cannot message across the player/spec divide during a match.
  >
  > Default: n/a (command).
  > Set by: any player ('s-l <text>').

---

B5-RESULT | ktx:cvar:k_on_start_f_ruleset | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_on_start_f_ruleset

- canonical_id: ktx:cvar:k_on_start_f_ruleset
- prior length: 330
- new length: 278

- OLD description:
  > When set (non-zero) and the match has a matchtag assigned, the player triggering the match start is automatically made to issue "say f_ruleset", broadcasting the f_ruleset report to chat as the match begins. 0 = no automatic f_ruleset at match start; non-zero = sent at match start. No effect on matches without a matchtag. Default 1.

- NEW description:
  > Automatically broadcasts the f_ruleset report at match start (via the player who triggers the start). Only fires when the match has a matchtag assigned.
  >
  > 0 = no automatic f_ruleset at match start.
  > 1 = f_ruleset is broadcast automatically when the match begins.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_exttime | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_exttime

- canonical_id: ktx:cvar:k_exttime
- prior length: 445
- new length: 284

- OLD description:
  > Length of the overtime period, in minutes, used when k_overtime is 1 (timed overtime). On a tie at the end of regulation, play is extended by this many minutes (the value is clamped to 1-999) and it is shown as the overtime figure on the scoreboard. Has no effect under other k_overtime modes (sudden death, tie-break, golden frag).

- NEW description:
  > Length of the overtime period in minutes when k_overtime is 1 (timed overtime). Has no effect under other k_overtime modes (sudden death, tie-break, golden frag).
  >
  > Range: 1-999 (minutes; clamped).
  >
  > Default: 5.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_pace_jumps | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_race_pace_jumps

- canonical_id: ktx:cvar:k_race_pace_jumps
- prior length: 357
- new length: 271

- OLD description:
  > Toggles visible jump markers along the pacemaker ghost trail. When set (1) and a trail resolution is active, marker entities (a star or lavaball model) are spawned at the ghost's recorded jump points as it progresses; when 0 (or when no trail is being drawn) no jump markers are created. Toggled by the pacemaker 'jumps' subcommand.

- NEW description:
  > Toggles visible jump markers along the pacemaker ghost trail in race mode. When enabled and a trail is active, small markers appear at the ghost's recorded jump points.
  >
  > 0 = no jump markers shown.
  > 1 = jump markers visible along the ghost trail.
  >
  > Default: 0.
  > Set by: server config or pacemaker 'jumps' subcommand.

---

B5-RESULT | ktx:command:pos_origin | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:pos_origin

- canonical_id: ktx:command:pos_origin
- prior length: 431
- new length: 264

- OLD description:
  > Teleports the player to the origin given as three coordinate arguments (x y z); an argument of "*" leaves that coordinate unchanged. Requires exactly three arguments (otherwise a usage message is printed) and is rate-limited to one position change per second. Subject to the server's position-command restrictions (Pos_Disallowed).

- NEW description:
  > Teleports you to the map position given as three coordinates (x y z). Use "*" to leave a coordinate unchanged. Requires exactly three arguments; rate-limited to one position change per second. May be restricted by the server.
  >
  > Default: n/a (command).
  > Set by: any player ('pos_origin <x> <y> <z>').

---

B5-RESULT | ktx:command:spawn | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:spawn

- canonical_id: ktx:command:spawn
- prior length: 449
- new length: 349

- OLD description:
  > Cycles the server's respawn model and broadcasts the new model's name. The setting (k_spw) advances through: -1 = pre-qtest nonrandom respawns, 0 = Normal QW respawns, 1 = KT SpawnSafety, 2 = Kombat Teams respawns, 3 = KTX respawns, 4 = KTX2 respawns. Advancing past 4 wraps back to -1. Has no effect while a match is in progress.

- NEW description:
  > Cycles the respawn model through all available options and broadcasts the new setting. Has no effect while a match is in progress.
  >
  > -1 = pre-qtest nonrandom respawns.
  > 0 = Normal QW respawns.
  > 1 = KT SpawnSafety.
  > 2 = Kombat Teams respawns.
  > 3 = KTX respawns.
  > 4 = KTX2 respawns.
  >
  > Default: n/a (command; sets k_spw, wraps from 4 back to -1).
  > Set by: admin command 'spawn' in-game.

---

B5-RESULT | ktx:cvar:k_pow_q | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_pow_q

- canonical_id: ktx:cvar:k_pow_q
- prior length: 432
- new length: 264

- OLD description:
  > Per-type switch for the Quad Damage powerup. 0 = quad entities are hidden and cannot be picked up, and quad is not dropped on death; 1 = quad enabled. Only takes effect while powerups are globally enabled (see k_pow); the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset.

- NEW description:
  > Per-type switch for the Quad Damage powerup. When disabled, quad entities are hidden and cannot be picked up, and quad is never dropped on death. Requires k_pow (global powerup switch) to be on.
  >
  > 0 = quad disabled.
  > 1 = quad enabled.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_vp_coach | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_vp_coach

- canonical_id: ktx:cvar:k_vp_coach
- prior length: 437
- new length: 329

- OLD description:
  > The percentage of eligible voters required to pass a coach election (the /coach vote, used by spectators to be elected team coach). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)).

- NEW description:
  > Minimum percentage of eligible players required to pass a coach election (a spectator standing for election as team coach).
  >
  > Range: 51-100 (whole-number percentage; values below 51 behave as 51). Required votes = ceil(percent/100 * player count excluding bots).
  >
  > Default: 66.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_highspeed | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_highspeed

- canonical_id: ktx:cvar:k_highspeed
- prior length: 388
- new length: 271

- OLD description:
  > The elevated server maxspeed value (in Quake speed units, clamped 0-9999) that the admin "speed" command switches to. Running the speed command toggles sv_maxspeed (and every connected player's max running speed) between the standard 320 and this k_highspeed value; it has no effect until the speed command is used. Default 320.

- NEW description:
  > The elevated max running speed that the 'speed' admin command switches to. The speed command toggles all players' max speed between the standard 320 and this value. Has no effect until the speed command is used.
  >
  > Range: 0-9999 (Quake speed units; clamped).
  >
  > Default: 320.
  > Set by: server config.

---

B5-RESULT | ktx:command:race_chasecam_view | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:race_chasecam_view

- canonical_id: ktx:command:race_chasecam_view
- prior length: 395
- new length: 278

- OLD description:
  > Cycles the calling spectator's race chasecam through its view modes, one step per invocation, wrapping back to the start. There are four modes: 1st person, 3rd person, hawk eye, and backpack ride; the new mode is printed each time. Has no effect if the caller is a racer or when the race-mode command preconditions are not met.

- NEW description:
  > Race mode only. Cycles the spectator's chasecam through its four view modes, one step per call, wrapping at the end. The new mode is printed each time. Has no effect for racers.
  >
  > 0 = 1st person. 1 = 3rd person. 2 = hawk eye. 3 = backpack ride.
  >
  > Default: n/a (command).
  > Set by: any spectator ('race_chasecam_view').

---

B5-RESULT | ktx:command:save:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:save:frogbot:editor

- canonical_id: ktx:command:save:frogbot:editor
- prior length: 453
- new length: 271

- OLD description:
  > Bot waypoint-editor command: compacts and renumbers all current markers, then writes the full routing (marker positions and the paths between them) to a timestamped .bot file under bots/maps/, named after the current map or the k_entityfile override. Reports an error to the caller if the bots/maps/ directory is not writable.

- NEW description:
  > Bot editor command. Renumbers all waypoint markers compactly, then saves the full routing (markers and paths) to a timestamped .bot file under bots/maps/ named after the current map (or k_entityfile if set). Reports an error if bots/maps/ is not writable.
  >
  > Default: n/a (command).
  > Set by: bot editor user ('save' inside the frogbot editor).

---

B5-RESULT | ktx:command:dmm2 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:command:dmm2

- canonical_id: ktx:command:dmm2
- prior length: 355
- new length: 253

- OLD description:
  > Admin/console command that switches the server to deathmatch mode 2 (sets the `deathmatch` cvar to 2 and announces the change). In mode 2 picked-up weapons stay on the ground for others to grab, and items/health do not respawn (the regeneration timer is disabled). Switching to mode 2 forces `k_midair` and `k_instagib` off.

- NEW description:
  > Switches the server to deathmatch mode 2 and announces the change. In dmm2, picked-up weapons remain on the ground and items/health do not respawn. Enabling dmm2 forces k_midair and k_instagib off.
  >
  > Default: n/a (command).
  > Set by: admin command 'dmm2' in-game or server console.

---

B5-RESULT | ktx:cvar:_k_captcolor2 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with no Default/Set-by | to-shape: D20-template

### ktx:cvar:_k_captcolor2

- canonical_id: ktx:cvar:_k_captcolor2
- prior length: 488
- new length: 255

- OLD description:
  > Internal mod-state cvar (not operator-tuned). During captain-based team picking, the server stores the second captain's player colors (top and bottom color, space-separated) here; when that captain picks a player, the picked player is force-set to these colors. Holds runtime state set and consumed by the team-picking code.

- NEW description:
  > Internal mod-state cvar. Stores the second captain's player colors (top and bottom, space-separated) during captain-based team picking. When the second captain picks a player, that player is force-set to these colors. Not operator-tuned; managed automatically by the team-picking code.
  >
  > Default: "" (empty; set at runtime).
  > Set by: server (internal; not configurable).

---
