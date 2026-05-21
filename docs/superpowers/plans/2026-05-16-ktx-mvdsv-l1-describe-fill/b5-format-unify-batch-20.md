# B5 format-unify ledger -- batch 20

**Batch:** 20 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:cvar:k_maxclients | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_maxclients

- canonical_id: ktx:cvar:k_maxclients
- prior length: 695
- new length: 295

- OLD description:
  > The upper limit for the engine's player slot count (maxclients) when it is adjusted in-game via the player-count up/down controls. While no match is in progress, the player-count command raises or lowers maxclients but never above k_maxclients; once maxclients reaches k_maxclients the operator is told the limit is reached. Counted in player slots.

- NEW description:
  > Ceiling for the engine's maxclients value when adjusted in-game via the player-count controls. The in-game raise/lower commands will not push maxclients above this value; when the ceiling is reached the server reports the limit. Has no effect while a match is in progress.
  >
  > Range: 1 or higher (player slots).
  >
  > Default: server-configured.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_pow_pickup | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose, polarity-explaining, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_pow_pickup

- canonical_id: ktx:cvar:k_pow_pickup
- prior length: 457
- new length: 280

- OLD description:
  > Controls 'fair' powerup pickup. 0 (default) = normal behaviour, a player may pick up a powerup even while still holding an active one of the same kind (allowing the timer to stack). 1 = a player who already has an active powerup of a given kind (quad, pentagram, ring, or suit) cannot pick up another of that same kind until the current one expires.

- NEW description:
  > Toggle for "fair" powerup pickup -- prevents players from re-picking the same powerup while they still have it active, blocking timer stacking.
  >
  > 0 = a player can pick up the same powerup again while it is still active (timer stacks).
  > 1 = re-picking an active powerup (quad, pentagram, ring, or suit) is blocked until it expires.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:command:fav_del | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with array-distinction digression, no Default/Set-by | to-shape: D20-template

### ktx:command:fav_del

- canonical_id: ktx:command:fav_del
- prior length: 475
- new length: 304

- OLD description:
  > Spectator command. Removes the player the spectator is currently tracking (point-of-view target) from that spectator's personal favourites list (the auto-list shared with fav_add / fav_next; the per-slot list used by favN_add / Nfav_go is separate). Reports an error if the spectator is not tracking a player, or if that player is not on the list.

- NEW description:
  > Spectator command. Removes the currently tracked player (point-of-view target) from the spectator's auto-favourites list. Prints an error if the spectator is not tracking anyone, or if the tracked player is not on the list. Only affects the auto-list used by fav_add / fav_next -- not the per-slot list used by favN_add / Nfav_go.
  >
  > Set by: any spectator in-game ('fav_del').

---

B5-RESULT | ktx:cvar:k_pause_without_matchtag | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with internal cross-ref, no Default/Set-by header lines | to-shape: D20-template

### ktx:cvar:k_pause_without_matchtag

- canonical_id: ktx:cvar:k_pause_without_matchtag
- prior length: 514
- new length: 326

- OLD description:
  > Controls whether players may use the pause command outside a tagged match. 0 (default) = a player can only pause when the server has a 'matchtag' info key set (i.e. during an organised, tagged match); any non-zero value = players may pause even when no matchtag is set. The per-player pause-request budget still applies regardless of this setting.

- NEW description:
  > Controls whether players can pause outside of a tagged (organised) match. By default, pausing is only permitted when the server has a matchtag set; enabling this cvar lifts that restriction. The per-player pause-request budget applies regardless.
  >
  > 0 = pause allowed only when a matchtag info key is set on the server.
  > 1 = pause allowed even without a matchtag.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:command:no_gl | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:no_gl

- canonical_id: ktx:command:no_gl
- prior length: 607
- new length: 295

- OLD description:
  > Shorthand for /noweapon gl: re-issues the noweapon command with the gl argument on the caller's behalf, toggling the grenade launcher between allowed and disallowed for the match. Subject to the same constraints as noweapon (deathmatch mode 4 / dmm4 only, not while a match is in progress). The change is server-wide and announced to all players.

- NEW description:
  > Shorthand admin command that toggles the grenade launcher between allowed and disallowed for the current match. Equivalent to issuing '/noweapon gl'. Only works in deathmatch mode 4 (dmm4) and cannot be used while a match is in progress. The change is announced to all players.
  >
  > Set by: admin command 'no_gl' in-game (dmm4 only, not during a live match).

---

B5-RESULT | ktx:command:qpoint | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with bit-value jargon in user surface, no Default/Set-by | to-shape: D20-template

### ktx:command:qpoint

- canonical_id: ktx:command:qpoint
- prior length: 424
- new length: 282

- OLD description:
  > Toggles the FPD "point function" restriction on or off by flipping bit 128 (value 128) of the server's fpd serverinfo key and re-broadcasting it. When the bit is set, clients are restricted from using the QiZmo proxy's pointing/point feature; the new enabled/disabled state is announced to all players. Has no effect while a match is in progress.

- NEW description:
  > Admin command that toggles the QiZmo proxy pointing restriction on or off server-wide. When enabled, clients are prevented from using the pointing feature. The new state is announced to all players. Has no effect while a match is in progress.
  >
  > Set by: admin command 'qpoint' in-game (not during a live match).

---

B5-RESULT | ktx:command:pos_angles | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose, no Default/Set-by | to-shape: D20-template

### ktx:command:pos_angles

- canonical_id: ktx:command:pos_angles
- prior length: 450
- new length: 308

- OLD description:
  > Sets the player's view angles to the three values given as arguments (pitch, yaw, roll); an argument of "*" leaves that component unchanged. Requires exactly three arguments (otherwise a usage message is printed) and is rate-limited to one position/angle change per second. Subject to the server's position-command restrictions (Pos_Disallowed).

- NEW description:
  > Sets the player's view angles to the three given values (pitch, yaw, roll). Pass "*" for any component to leave it unchanged. Requires exactly three arguments; invalid usage prints a usage message. Rate-limited to one change per second. May be blocked by server-side position restrictions.
  >
  > Usage: pos_angles <pitch> <yaw> <roll>  (use '*' to keep a component unchanged)
  >
  > Set by: any player in-game ('pos_angles').

---

B5-RESULT | ktx:cvar:k_disallow_weapons | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs in surface, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_disallow_weapons

- canonical_id: ktx:cvar:k_disallow_weapons
- prior length: 462
- new length: 436

- OLD description:
  > Bitmask of weapons that are REMOVED from players in dmm4 (deathmatch 4) during a running match: any weapon whose bit is set is stripped from the player's inventory and is not given. Bits (sum to combine): 1 = shotgun, 2 = super shotgun, 4 = nailgun, 8 = super nailgun, 16 = grenade launcher, 32 = rocket launcher, 64 = lightning gun, 4096 = axe.

- NEW description:
  > Bitmask specifying which weapons are removed from players in deathmatch 4 (dmm4) during a live match. Set bits identify disallowed weapons; sum values to disable multiple weapons at once.
  >
  > 1 = shotgun, 2 = super shotgun, 4 = nailgun, 8 = super nailgun, 16 = grenade launcher, 32 = rocket launcher, 64 = lightning gun, 4096 = axe.
  >
  > Default: 0 (no weapons disabled).
  > Set by: server config or 'no_gl' / 'no_lg' admin commands in-game (dmm4 only, not during a live match).

---

B5-RESULT | ktx:cvar:k_no_vote_map | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with mode-gate detail, no Default/Set-by header lines | to-shape: D20-template

### ktx:cvar:k_no_vote_map

- canonical_id: ktx:cvar:k_no_vote_map
- prior length: 397
- new length: 293

- OLD description:
  > When set (non-zero), disables map voting and the next-map/break commands while the server is in matchless (pickup-style) mode and not running Bloodfest. A player attempting to vote a map or call /next_map is refused with "Voting map is not allowed". 0 = map voting and next_map allowed; non-zero = blocked. Has no effect outside matchless mode.

- NEW description:
  > Disables map voting and the /next_map command in matchless (pickup-style) mode. When blocked, players attempting either action see "Voting map is not allowed". Has no effect outside matchless mode or during Bloodfest.
  >
  > 0 = map voting and /next_map allowed.
  > 1 = map voting and /next_map blocked.
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:command:no_lg | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:no_lg

- canonical_id: ktx:command:no_lg
- prior length: 581
- new length: 289

- OLD description:
  > Shorthand for /noweapon lg: re-issues the noweapon command with the lg argument on the caller's behalf, toggling the lightning gun between allowed and disallowed for the match. Subject to the same constraints as noweapon (deathmatch mode 4 / dmm4 only, not while a match is in progress). The change is server-wide and announced to all players.

- NEW description:
  > Shorthand admin command that toggles the lightning gun between allowed and disallowed for the current match. Equivalent to issuing '/noweapon lg'. Only works in deathmatch mode 4 (dmm4) and cannot be used while a match is in progress. The change is announced to all players.
  >
  > Set by: admin command 'no_lg' in-game (dmm4 only, not during a live match).

---

B5-RESULT | ktx:cvar:maxfps | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs and warning threshold detail inline, no Default/Set-by | to-shape: D20-template

### ktx:cvar:maxfps

- canonical_id: ktx:cvar:maxfps
- prior length: 479
- new length: 327

- OLD description:
  > Sets the maximum client frame rate (frames per second) the server allows. Clients whose measured FPS exceeds this limit by more than 2 receive a public high-frame-rate warning and are disconnected after four such warnings. The value is clamped to the range 50-1981; if set outside that range it is reset to 77. Registered with a default of 77.

- NEW description:
  > Maximum client frame rate (FPS) the server permits. Clients exceeding this limit by more than 2 FPS receive a public high-FPS warning; four warnings result in disconnection. Values outside the valid range are reset to the default.
  >
  > Range: 50-1981 (values outside this range are reset to 77).
  >
  > Default: 77.
  > Set by: server config only.

---

B5-RESULT | ktx:command:time10 | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:time10

- canonical_id: ktx:command:time10
- prior length: 446
- new length: 238

- OLD description:
  > Sets the match timelimit to 10 minutes. The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 10. The command is ignored while a match is in progress; if the timelimit is already at the resulting value it reports it as unchanged, otherwise it broadcasts the new match length to everyone.

- NEW description:
  > Sets the match timelimit to 10 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 10. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 10.
  >
  > Set by: admin command 'time10' in-game (not during a live match).

---

B5-RESULT | ktx:command:time15 | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:time15

- canonical_id: ktx:command:time15
- prior length: 446
- new length: 238

- OLD description:
  > Sets the match timelimit to 15 minutes. The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 15. The command is ignored while a match is in progress; if the timelimit is already at the resulting value it reports it as unchanged, otherwise it broadcasts the new match length to everyone.

- NEW description:
  > Sets the match timelimit to 15 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 15. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 15.
  >
  > Set by: admin command 'time15' in-game (not during a live match).

---

B5-RESULT | ktx:command:time20 | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:time20

- canonical_id: ktx:command:time20
- prior length: 446
- new length: 238

- OLD description:
  > Sets the match timelimit to 20 minutes. The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 20. The command is ignored while a match is in progress; if the timelimit is already at the resulting value it reports it as unchanged, otherwise it broadcasts the new match length to everyone.

- NEW description:
  > Sets the match timelimit to 20 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 20. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 20.
  >
  > Set by: admin command 'time20' in-game (not during a live match).

---

B5-RESULT | ktx:command:time25 | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:time25

- canonical_id: ktx:command:time25
- prior length: 446
- new length: 238

- OLD description:
  > Sets the match timelimit to 25 minutes. The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 25. The command is ignored while a match is in progress; if the timelimit is already at the resulting value it reports it as unchanged, otherwise it broadcasts the new match length to everyone.

- NEW description:
  > Sets the match timelimit to 25 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 25. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 25.
  >
  > Set by: admin command 'time25' in-game (not during a live match).

---

B5-RESULT | ktx:command:time30 | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line refs, no Default/Set-by | to-shape: D20-template

### ktx:command:time30

- canonical_id: ktx:command:time30
- prior length: 446
- new length: 238

- OLD description:
  > Sets the match timelimit to 30 minutes. The requested value is clamped to the range 0..k_timetop, so it takes effect only if k_timetop is at least 30. The command is ignored while a match is in progress; if the timelimit is already at the resulting value it reports it as unchanged, otherwise it broadcasts the new match length to everyone.

- NEW description:
  > Sets the match timelimit to 30 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 30. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 30.
  >
  > Set by: admin command 'time30' in-game (not during a live match).

---

B5-RESULT | ktx:cvar:k_killquad | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with match-gate and item removal detail inline, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_killquad

- canonical_id: ktx:cvar:k_killquad
- prior length: 495
- new length: 291

- OLD description:
  > Enables KillQuad mode (0 = off, 1 = on). When on, the normal Quad Damage pickup is removed from the map and instead a quad is automatically dropped into play; picking up a dropped quad removes it after a short time (KillQuadThink), and quad handling bypasses the standard powerup-spawn rules. Cannot be toggled while a match is in progress.

- NEW description:
  > Enables KillQuad mode, replacing the standard Quad Damage spawn with a dropped quad that appears in play. The dropped quad expires after a short time if not picked up. Cannot be toggled during a live match.
  >
  > 0 = standard Quad Damage spawn rules.
  > 1 = KillQuad mode active (no normal quad pickup; a dropped quad appears instead).
  >
  > Default: 0.
  > Set by: server config or 'killquad' admin command in-game (not during a live match).

---

B5-RESULT | ktx:cvar:k_ctf_custom_models | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with model filenames in surface, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_ctf_custom_models

- canonical_id: ktx:cvar:k_ctf_custom_models
- prior length: 481
- new length: 290

- OLD description:
  > Selects which models CTF flags and the grappling hook use. 1: use the dedicated CTF models (e.g. progs/flag.mdl for flags, progs/bit.mdl for the hook), which are precached server-side. 0: use the original Quake models instead (progs/w_g_key.mdl / progs/w_s_key.mdl for the two flags). Only takes effect when CTF is actually allowed/active.

- NEW description:
  > Selects whether CTF flags and the grappling hook use dedicated CTF models or the original Quake key models. Only takes effect when CTF is active.
  >
  > 0 = use original Quake models for flags and hook.
  > 1 = use dedicated CTF models (precached server-side).
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_idletime | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with countdown detail inline, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_idletime

- canonical_id: ktx:cvar:k_idletime
- prior length: 499
- new length: 338

- OLD description:
  > Idle-bot timeout in seconds. When greater than 0, once at least half the players are ready KTX spawns an internal 'idle bot' that counts down from this many seconds (with a 3-second floor); if the players still have not all readied when the countdown reaches zero, the bot force-starts the match. Set to 0 to disable the idle bot entirely.

- NEW description:
  > Timeout in seconds after which KTX force-starts the match if players have not all readied up. Once at least half the players are ready, a countdown begins from this value (minimum 3 seconds); when it expires the match starts automatically. Set to 0 to disable the auto-start.
  >
  > Range: 0 or more (seconds; minimum effective countdown is 3 seconds).
  >
  > Default: 0 (disabled).
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_pow_check_time | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with matchless-gate and 0-fallback detail inline, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_pow_check_time

- canonical_id: ktx:cvar:k_pow_check_time
- prior length: 456
- new length: 322

- OLD description:
  > In matchless deathmatch mode, the interval in seconds between the server's re-checks of whether enough players are present to keep powerups enabled (the player-count gate is k_pow_min_players). Bounded to 0-999; a value of 0 means use the built-in default of 10 seconds. Has no effect outside matchless mode or when k_pow_min_players is 0.

- NEW description:
  > In matchless (pickup-style) deathmatch, the interval in seconds between checks of whether enough players are present to keep powerups enabled (governed by k_pow_min_players). Has no effect outside matchless mode or when k_pow_min_players is 0.
  >
  > Range: 0-999 (seconds). Value 0 uses the built-in default of 10 seconds.
  >
  > Default: 0 (effective 10 seconds).
  > Set by: server config only.

---
