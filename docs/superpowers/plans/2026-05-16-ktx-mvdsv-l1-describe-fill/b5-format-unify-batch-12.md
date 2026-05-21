# B5 format-unify ledger -- batch 12

**Batch:** 12 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:dmgfrags | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no enum block, no Default/Set-by | to-shape: D20-template

### ktx:command:dmgfrags

- canonical_id: ktx:command:dmgfrags
- prior length: 448
- new length: 327

- OLD description:
  > Toggles damage-based scoring on or off (the k_dmgfrags cvar). When enabled, players are awarded score from damage dealt rather than from kills -- roughly one 'frag' per 100 points of damage dealt; telefrag/teledeath damage is excluded from the count, and ordinary kill-frags are not added while it is active. The toggle is rejected when a rules change is not currently allowed, and it is refused in LGC mode ('Dmgfrags is not allowed in LGC mode').

- NEW description:
  > Admin command that toggles damage-based scoring (k_dmgfrags). When on, score is awarded at roughly 1 frag per 100 damage dealt; telefrag damage is excluded and ordinary kill-frags are not counted. Blocked when rules changes are not permitted, or when LGC mode is active.
  >
  > Default: off (k_dmgfrags = 0).
  > Set by: admin command 'dmgfrags' or server config (k_dmgfrags).

---

B5-RESULT | ktx:command:fallbunny | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no enum block, no Default/Set-by | to-shape: D20-template

### ktx:command:fallbunny

- canonical_id: ktx:command:fallbunny
- prior length: 459
- new length: 338

- OLD description:
  > Toggles the fallbunny setting (server cvar k_fallbunny) on or off and broadcasts the new state to everyone. When off, a player who lands hard from a high fall after bunny-hopping gets a 'broken ankle' (movement penalty applied on landing); when on, that broken-ankle penalty is suppressed so hard landings carry no movement consequence. The command is ignored while a match is in progress, and is blocked (with a message) when race mode or yawnmode is active.

- NEW description:
  > Admin command that toggles the fallbunny setting (k_fallbunny). Controls whether hard landings after a high fall apply the broken-ankle movement penalty to the player.
  >
  > 0 = broken-ankle penalty applies on hard landings after bunny-hopping.
  > 1 = broken-ankle penalty suppressed; hard landings carry no movement consequence.
  >
  > Blocked during a live match and when race mode or yawnmode is active.
  > Set by: admin command 'fallbunny' or server config (k_fallbunny).

---

B5-RESULT | ktx:command:list | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no enum block, no Default/Set-by | to-shape: D20-template

### ktx:command:list

- canonical_id: ktx:command:list
- prior length: 454
- new length: 330

- OLD description:
  > Broadcasts to all clients the list of players who are not yet ready, each shown with their player-status line. Works only when no match is in progress; reports "Game in progress" during a match, "All players ready" if everyone is ready, and (for a player) "Ready yourself first" if the caller is an unready player. Rate-limited to once per 10 seconds across the server; if no unready players are found it privately reports "can't find not ready players".

- NEW description:
  > Broadcasts the list of not-yet-ready players to all clients, each with their status line. Only available when no match is in progress ("Game in progress" during a match; "All players ready" when everyone is ready; "Ready yourself first" if the caller is unready). Rate-limited to one broadcast per 10 seconds; prints "can't find not ready players" privately when none are unready.
  >
  > Set by: any player or spectator-admin ('list').

---

B5-RESULT | ktx:command:lock | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no Default/Set-by, admin-gate not structured | to-shape: D20-template

### ktx:command:lock

- canonical_id: ktx:command:lock
- prior length: 450
- new length: 337

- OLD description:
  > Temporarily locks the server: while locked, non-VIP players cannot connect (they are told the server is temporarily locked and how many seconds remain); spectators are unaffected. The lock lasts 15 seconds and then auto-expires with a broadcast "server unlocked". Issuing the command broadcasts "<name> locked server for 15 seconds"; issuing it again while the lock is active clears it immediately and broadcasts "<name> unlocked server". Admin only.

- NEW description:
  > Temporarily locks the server for 15 seconds, preventing non-VIP players from connecting (they are told the lock duration); spectators are unaffected. Auto-expires with a broadcast on timeout. Issuing again while the lock is active clears it immediately. Broadcasts the lock or unlock action to all.
  >
  > Set by: admin command 'lock' (toggle -- first call locks, second call unlocks early).

---

B5-RESULT | ktx:command:mapcycle | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no Default/Set-by | to-shape: D20-template

### ktx:command:mapcycle

- canonical_id: ktx:command:mapcycle
- prior length: 448
- new length: 333

- OLD description:
  > Prints the server's configured map-rotation list (the k_ml_0..k_ml_N cvar series) to the caller, one map per line with a 1-based index, marking the entry that matches the current map. Prints 'Map cycle: empty' when no rotation is configured, and additionally 'Map cycle: not active' when the samelevel cvar is set (which pins the server to the current map regardless of the list). Read-only; it lists the rotation, it does not advance or change it.

- NEW description:
  > Prints the server's configured map-rotation list (k_ml_0..k_ml_N) to the caller, one map per line with a 1-based index; the current map is marked. Prints "Map cycle: empty" when no rotation is configured. Prints "Map cycle: not active" additionally when the samelevel cvar is set (which pins the server to the current map). Read-only: lists, does not advance or change the rotation.
  >
  > Set by: any player or spectator-admin ('mapcycle').

---

B5-RESULT | ktx:command:nospecs | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no Default/Set-by, vote mechanism not structured | to-shape: D20-template

### ktx:command:nospecs

- canonical_id: ktx:command:nospecs
- prior length: 447
- new length: 369

- OLD description:
  > Casts (or withdraws) the caller's vote for No-spectators mode; an admin can set it directly. When the vote passes or is set by admin, the No-spectators mode is toggled server-wide and announced, and while it is on every spectator is disconnected except allowed VIPs, real admins, and coaches. Non-admins need at least 2 players present to start the vote. While a match is in progress the command only prints the current No-spectators on/off state.

- NEW description:
  > Casts or withdraws the caller's vote to enable No-spectators mode. When the vote passes (or an admin sets it directly), all spectators are disconnected except VIPs, real admins, and coaches. Non-admins require at least 2 players present to vote. During a live match the command only reports the current on/off state.
  >
  > Default: off (_k_nospecs = 0).
  > Set by: player vote ('nospecs') or admin command; vote threshold determined by k_vp_nospecs.

---

B5-RESULT | ktx:command:rjfields:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no Default/Set-by, frogbot context implicit | to-shape: D20-template

### ktx:command:rjfields:frogbot:editor

- canonical_id: ktx:command:rjfields:frogbot:editor
- prior length: 449
- new length: 337

- OLD description:
  > Bot path-editor command operating on the rocket-jump-flagged path from the saved marker to the marker nearest the editing player. With no arguments it prints that path's current rocket-jump pitch, yaw, and delay. Given three arguments <pitch> <yaw> <delay> it sets those fields on the path (pitch and yaw as floats, delay as an integer). Errors to the caller if there is no nearby marker, no linked path, or the path is not flagged as a rocket jump.

- NEW description:
  > Frogbot path-editor command. Reads or sets the rocket-jump fields (pitch, yaw, delay) on the path from the saved marker to the nearest marker. With no arguments: prints current pitch, yaw, and delay. With three arguments <pitch> <yaw> <delay>: sets those fields (pitch/yaw as floats, delay as integer). Reports an error if no nearby marker, no linked path, or the path is not flagged as a rocket jump.
  >
  > Set by: frogbot editor command 'rjfields <pitch> <yaw> <delay>'.

---

B5-RESULT | ktx:command:rnd | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no Default/Set-by | to-shape: D20-template

### ktx:command:rnd

- canonical_id: ktx:command:rnd
- prior length: 452
- new length: 300

- OLD description:
  > Takes one or more space-separated arguments and randomly selects one of them, broadcasting to all players the list of candidates ("Random select by <netname> from: <a, b, ...>") and the chosen value ("selected: <x>"). With zero user-supplied arguments it prints "usage: rnd <1st 2nd ...>" to the caller; with one argument that single value is trivially "selected" and broadcast. Refused silently while a match is in progress (early return, no message).

- NEW description:
  > Picks one item at random from the supplied space-separated list and broadcasts the candidates and the selected value to all players. With no arguments prints usage to the caller. Refused silently during a live match.
  >
  > Set by: any player ('rnd <option1> <option2> ...'). Blocked during match.

---

B5-RESULT | ktx:command:vwep | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no enum block, no Default/Set-by | to-shape: D20-template

### ktx:command:vwep

- canonical_id: ktx:command:vwep
- prior length: 446
- new length: 320

- OLD description:
  > Toggles the server's visible-weapons feature on or off. When enabled, each player's carried weapon is shown as a 3D model on their in-game model so opponents can see which weapon someone is holding. Has no effect while a match is in progress, and silently does nothing if the server lacks vwep model support or k_allow_vwep is disabled. On a successful toggle it broadcasts an on/off message and immediately refreshes every player's weapon model.

- NEW description:
  > Toggles visible weapons (k_vwep): when on, each player's held weapon is shown as a 3D model on their character. Broadcasts the on/off change and immediately refreshes all players' weapon models. No effect during a live match or if the server lacks vwep support or k_allow_vwep is disabled.
  >
  > Default: off (k_vwep = 0).
  > Set by: player or spectator-admin command 'vwep'; server config (k_vwep / k_allow_vwep).

---

B5-RESULT | ktx:command:xonx | FORMAT-UNIFIED | rev=1 | from-shape: prose-only with full config params inline, no Default/Set-by | to-shape: D20-template

### ktx:command:xonx

- canonical_id: ktx:command:xonx
- prior length: 459
- new length: 340

- OLD description:
  > Applies the XonX game-mode preset: an open-size team match with a high player cap. Allows up to 32 players (maxclients/k_maxclients 32), sets teamplay 2 (teammates and self can be damaged), deathmatch 1 (base mode -- weapons do not stay on pickup), enables powerups, requires 1 player minimum per team and 1-2 teams, runs a 20-minute timelimit with time-based 5-minute overtime, and sets the internal game mode to k_mode 2. The shared common reset runs first.

- NEW description:
  > Applies the XonX game-mode preset: an open-size team match supporting up to 32 players. Sets teamplay 2 (friendly fire on), deathmatch 1 (weapons disappear on pickup), powerups enabled, 1-2 teams with at least 1 player each, 20-minute timelimit, 5-minute time-based overtime.
  >
  > Set by: admin command 'XonX' (blocked when k_auto_xonx is active). No individual cvar to toggle -- the command applies the full preset.

---

B5-RESULT | ktx:cvar:k_admincode | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_admincode

- canonical_id: ktx:cvar:k_admincode
- prior length: 446
- new length: 344

- OLD description:
  > Server admin passcode used by the /admin command to grant a player real admin privileges. A player supplies the value either by typing /admin <code> (matched as a string) or by entering it through the numeric impulse/number-key path (matched as an integer); an exact match grants admin. Set to an empty value or to "none" to disable passcode-based admin access (it is also gated by k_admins). Failed attempts are throttled by a 5-second cooldown.

- NEW description:
  > Server passcode that grants a player real admin privileges when supplied to the /admin command. Matched as a string (/admin <code>) or via the numeric impulse path (integer match). Set to empty or "none" to disable passcode-based admin access. Failed attempts are throttled by a 5-second cooldown. Also gated by k_admins (master admin toggle).
  >
  > Default: (empty -- passcode access disabled).
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_ctf_runes | FORMAT-UNIFIED | rev=1 | from-shape: prose-only with mid-game behaviour, no structured enum/Default/Set-by | to-shape: D20-template

### ktx:cvar:k_ctf_runes

- canonical_id: ktx:cvar:k_ctf_runes
- prior length: 459
- new length: 357

- OLD description:
  > CTF mode only. Master on/off switch for the four CTF power runes (resistance, strength, haste, regeneration). When nonzero and the server is in CTF mode, the runes are spawned in the map and can be picked up; when 0, no runes are spawned, and in matchless mode any rune a player is already carrying is removed and that player's speed is reset. Changing the value mid-game (or switching into CTF mode) re-evaluates and respawns or clears the runes accordingly.

- NEW description:
  > CTF mode only. Master toggle for the four CTF power runes (resistance, strength, haste, regeneration). When enabled and in CTF mode, runes are spawned and can be picked up. When disabled outside of a match, any carried runes are removed and player speed is reset. Changing the value mid-game re-evaluates rune spawning immediately.
  >
  > 0 = no runes spawned.
  > 1 = runes enabled (CTF mode required).
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_fbskill_movement | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-jargon (self->fb.skill.movement, bound(0,value,1.0), ApplyPhysics()) | to-shape: D20-template

### ktx:cvar:k_fbskill_movement

- canonical_id: ktx:cvar:k_fbskill_movement
- prior length: 452
- new length: 320

- OLD description:
  > Frogbot AI tuning cvar. Sets the bot's overall movement-skill factor used by the bot physics/strafe model: the bot's per-frame air/ground movement application reads this as movement_skill (clamped 0..1) and uses it to scale how well the bot executes its intended velocity (lower = sloppier strafe/air control, higher = cleaner movement). Read into self->fb.skill.movement clamped with bound(0, value, 1.0). Consumed by ApplyPhysics() in bot_movement.c.

- NEW description:
  > Frogbot AI tuning cvar. Sets the bot's movement-skill factor (0.0 to 1.0): lower values produce sloppier strafe and air-control; higher values produce cleaner movement. Normally derived from the bot skill level automatically; can be set manually to override.
  >
  > Range: 0.0 to 1.0 (clamped).
  >
  > Default: derived from bot skill level.
  > Set by: server config or setSkillAttributes (automatic).

---

B5-RESULT | ktx:cvar:k_freshteams_sweep_ng_ammo | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, units stated mid-sentence, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_freshteams_sweep_ng_ammo

- canonical_id: ktx:cvar:k_freshteams_sweep_ng_ammo
- prior length: 458
- new length: 328

- OLD description:
  > Fresh Teams (dmm1) only: the number of nails awarded when a player picks up a nailgun they already own ('sweeping' it), applied only when k_freshteams and k_freshteams_limit_sweep_ammo are both enabled. This value is added to the player's nails. When sweep limiting is off, picking up an already-owned nailgun instead grants the default 30 nails. Units are nails (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set.

- NEW description:
  > Fresh Teams (dmm1) only. Number of nails awarded when a player picks up a nailgun they already own ("sweeping"). Only applied when both k_freshteams and k_freshteams_limit_sweep_ammo are enabled. When sweep limiting is off, the default 30 nails are awarded instead.
  >
  > Units: nails (ammo count).
  >
  > Default: 6.
  > Set by: server config only. Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set.

---

B5-RESULT | ktx:cvar:__k_ls | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, ring-buffer mechanics in prose, no Default/Set-by | to-shape: D20-template

### ktx:cvar:__k_ls

- canonical_id: ktx:cvar:__k_ls
- prior length: 455
- new length: 298

- OLD description:
  > Internal write cursor for the server's stored match-results history (the lastscores / lastscoresktx ring buffer). Holds the index of the next slot in a fixed 30-entry ring (MAX_LASTSCORES = 30); after a match result is recorded the value advances to (index + 1) modulo 30, overwriting the oldest entry, and the lastscores command reads it as the ring's start point to print recorded matches oldest-to-newest. Integer 0-29; not intended for manual setting.

- NEW description:
  > Internal write cursor for the match-results ring buffer (lastscores / lastscoresktx). Advances by 1 (mod 30) each time a match result is recorded, wrapping around to overwrite the oldest entry. The lastscores command uses this as the starting point when printing recorded matches.
  >
  > Range: 0 to 29 (integer slot index). Internal; not for manual setting.
  >
  > Set by: server automatically after each match.

---

B5-RESULT | ktx:cvar:k_noitems | FORMAT-UNIFIED | rev=1 | from-shape: prose with entity-class names and command name, needs enum block + Default/Set-by | to-shape: D20-template

### ktx:cvar:k_noitems

- canonical_id: ktx:cvar:k_noitems
- prior length: 456
- new length: 329

- OLD description:
  > When set (non-zero), strips all weapon, ammo, health, armor and powerup pickups from the map at match start (weapon_*, item_shells/spikes/rockets/cells, item_health, item_armor1/2/Inv, and all artifact powerup entities are removed). Players keep only their starting equipment. 0 = items present normally; non-zero = items removed. While active and not in Race mode the match settings readout shows "NoItems on". Toggled out of match by the noitems command.

- NEW description:
  > Removes all weapon, ammo, health, armor, and powerup pickups from the map at match start. Players keep only their starting equipment. While active (and not in Race mode) the match settings readout shows "NoItems on".
  >
  > 0 = items present normally.
  > 1 = all pickups removed at match start.
  >
  > Default: 0.
  > Set by: server config or 'noitems' admin command (outside of match).

---

B5-RESULT | ktx:cvar:_k_pow_last | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, internal semantics in mid-sentence, no Default/Set-by | to-shape: D20-template

### ktx:cvar:_k_pow_last

- canonical_id: ktx:cvar:_k_pow_last
- prior length: 450
- new length: 295

- OLD description:
  > Internal carry-over of whether powerups were enabled on the previous map. At map end the server stores the resolved powerups-enabled state (the on/off result of the k_pow setting after the minimum-players check) here; on the first frame of the next map this stored value seeds the active powerups state so powerup spawning continues consistently across the map change. Integer (0 = powerups were off, non-zero = on); internal, not for manual setting.

- NEW description:
  > Internal carry-over of the powerups-enabled state from the previous map. Written at map end (stores the resolved on/off result of k_pow); read on the first frame of the next map to seed powerup spawning consistently across the map change.
  >
  > 0 = powerups were off on the previous map.
  > 1 = powerups were on.
  >
  > Internal; not for manual setting. Set by: server automatically at map end.

---

B5-RESULT | ktx:cvar:k_race_pace_enabled | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, dual-gate condition not structured, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_race_pace_enabled

- canonical_id: ktx:cvar:k_race_pace_enabled
- prior length: 452
- new length: 330

- OLD description:
  > Enables the race pacemaker (a recorded ghost run shown as a moving trail/entity that racers chase). The pacemaker is considered active when this is non-zero AND a ghost route has been captured; with it enabled the ghost is spawned at race start, advances along its recorded path, and a head-start may be applied. It is set automatically: enabled (1) when a pacemaker run is selected, set to 0 when the pacemaker is turned off via the pacemaker command.

- NEW description:
  > Enables the race pacemaker -- a recorded ghost run that racers chase. Active only when non-zero AND a ghost route has been captured. When active, the ghost spawns at race start and advances along its recorded path; a head-start offset may apply.
  >
  > 0 = pacemaker off.
  > 1 = pacemaker active (requires a captured ghost route).
  >
  > Set by: server automatically via the 'pacemaker' command (set to 1 on select, 0 on disable).

---

B5-RESULT | ktx:cvar:k_race_route_mapname | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, web-post detail should stay in reasoning, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_race_route_mapname

- canonical_id: ktx:cvar:k_race_route_mapname
- prior length: 445
- new length: 318

- OLD description:
  > Stores the map name that the saved race route number (k_race_route_number) applies to. On a server-side route (re)load, if this matches the current map the stored route number is reloaded; otherwise the race advances to the next route. It is cleared to an empty string when a custom route is set, and rewritten to the current map name whenever a route is loaded. It is also reported (with the route number) in the LogRaceAttempt server web-post.

- NEW description:
  > Stores the map name that the saved race route number (k_race_route_number) belongs to. On a server-side route reload, if this matches the current map the stored route number is reused; otherwise the next route is selected. Cleared to empty when a custom route is set; updated to the current map name whenever a route loads.
  >
  > Internal; managed automatically. Set by: server automatically on route load or custom route set.

---

B5-RESULT | ktx:cvar:_k_team3 | FORMAT-UNIFIED | rev=1 | from-shape: prose-only, mode-scoping buried mid-sentence, no Default/Set-by | to-shape: D20-template

### ktx:cvar:_k_team3

- canonical_id: ktx:cvar:_k_team3
- prior length: 450
- new length: 304

- OLD description:
  > Internal store of the third participating team's name in three-team usermodes (2on2on2, 3on3on3, 4on4on4) only, captured at match start. The server records it when a distinct third team is detected while preparing the scoreboard; it is read for the three-team scoreboard labels, score attribution, and the hostname decoration ('<host> (team1 vs. team2 vs. team3)'). String; empty/unset outside three-team modes; set by the server, not for manual use.

- NEW description:
  > Internal store of the third team's name in three-team game modes (2on2on2, 3on3on3, 4on4on4). Captured at match start when a distinct third team is detected. Used for the three-team scoreboard labels, score attribution, and the server hostname display (team1 vs. team2 vs. team3).
  >
  > Empty/unset outside three-team modes. Internal; not for manual use.
  > Set by: server automatically at match start.

---
