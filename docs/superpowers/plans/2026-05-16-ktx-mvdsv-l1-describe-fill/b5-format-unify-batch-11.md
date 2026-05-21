# B5 format-unify ledger -- batch 11

**Batch:** 11 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:banip | FORMAT-UNIFIED | rev=1 | from-shape: long prose with CF_REDIRECT jargon + "NOT legible from the KTX source tree" hedge | to-shape: D20-template

### ktx:command:banip

- canonical_id: ktx:command:banip
- prior length: 467
- new length: 263

- OLD description:
  > Admin command for timed-banning by IP address. In KTX-mod code this is a redirect stub: the mod re-sends it as 'cmd banip <params>' back to the issuer and deliberately reports it as not-found within the mod (CF_REDIRECT handling), so the actual IP timed-ban behaviour is performed by the underlying server (mvdsv) ban handler, not by KTX. The exact ban duration and ban-list semantics are implemented in the server engine and are NOT legible from the KTX source tree.

- NEW description:
  > Admin command for timed IP bans. KTX passes the command through to the underlying server (MVDSV); the actual ban duration and ban-list behaviour is handled by the server, not by KTX.
  >
  > Set by: admin command in-game.

---

B5-RESULT | ktx:command:clearpathflag:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: long prose with usage details, clean of jargon | to-shape: D20-template

### ktx:command:clearpathflag:frogbot:editor

- canonical_id: ktx:command:clearpathflag:frogbot:editor
- prior length: 460
- new length: 380

- OLD description:
  > Frogbot waypoint-editor command (available only in editor mode). Clears the given routing flag(s) from the path that runs from the saved marker to the marker nearest the player. Usage: clearpathflag <flags>; with no flag argument it prints the valid path-flag options, and reports the path's remaining flags after clearing. Does nothing if there is no marker nearby, no path links the saved marker to the nearest marker, or the supplied flag string is invalid.

- NEW description:
  > Frogbot waypoint-editor command (editor mode only). Clears the given routing flag(s) from the path connecting the saved marker to the marker nearest the player.
  >
  > With no argument: prints the valid path-flag options.
  > With a flag argument: clears the matching flag(s) and reports the path's remaining flags.
  > No-op if there is no nearby marker, no path links saved-to-nearest, or the flag string is invalid.
  >
  > Set by: editor-mode command.

---

B5-RESULT | ktx:command:dmm5 | FORMAT-UNIFIED | rev=1 | from-shape: long prose with backtick code refs + hedge on mode-3 distinction | to-shape: D20-template

### ktx:command:dmm5

- canonical_id: ktx:command:dmm5
- prior length: 470
- new length: 342

- OLD description:
  > Admin/console command that switches the server to deathmatch mode 5 (sets the `deathmatch` cvar to 5 and announces the change). In mode 5 picked-up weapons stay on the ground and ammo respawn time is halved (15 seconds instead of 30) -- the same behavior the source applies to mode 3. The rule that distinguishes mode 5 from mode 3 is not source-legible in a single authoritative site and is not asserted here. Switching to mode 5 forces `k_midair` and `k_instagib` off.

- NEW description:
  > Switches the server to deathmatch mode 5 and announces the change. In mode 5, picked-up weapons stay on the ground and ammo respawn time is halved (15 seconds instead of 30). Enabling mode 5 forces k_midair and k_instagib off.
  >
  > Note: The rule distinguishing mode 5 from mode 3 is not definitively established in KTX source.
  >
  > Set by: admin command in-game.

---

B5-RESULT | ktx:command:downplayers | FORMAT-UNIFIED | rev=1 | from-shape: long prose, mostly clean but no Default/Set-by structure | to-shape: D20-template

### ktx:command:downplayers

- canonical_id: ktx:command:downplayers
- prior length: 463
- new length: 344

- OLD description:
  > Admin command that lowers the server's player slot count: decrements the maxclients cvar by 1 each time it is run. The new value is clamped to the range 1..k_maxclients (it will not go below 1 or above the k_maxclients ceiling). Refused while a match is in progress and gated by the k_allowcountchange permission level; when it changes the count it broadcasts the new maxclients value to everyone on the server. (Counterpart of upplayers, which raises the count.)

- NEW description:
  > Admin command that decrements the server's player slot count (maxclients) by 1 each time it is run. The new value is clamped to the range 1..k_maxclients. Refused while a match is in progress; permission level controlled by k_allowcountchange. Broadcasts the new count when changed. (Counterpart of upplayers.)
  >
  > Set by: admin command in-game.

---

B5-RESULT | ktx:command:freshtime | FORMAT-UNIFIED | rev=1 | from-shape: long prose with parenthetical clarification, no Default/Set-by | to-shape: D20-template

### ktx:command:freshtime

- canonical_id: ktx:command:freshtime
- prior length: 469
- new length: 378

- OLD description:
  > Cycles the FreshTeams weapon respawn time (the k_freshteams_weapon_time server cvar) through 20, 15, and 10 seconds. Each invocation steps to the next value: from 20 it sets 15, from 15 it sets 10, and from any other value it resets to 20 (the default); the chosen value is broadcast. FreshTeams must already be enabled (the /fresh command); it also refuses to run while a match is in progress or while race mode is active. (It is a 3-step cycle, not an on/off toggle.)

- NEW description:
  > Cycles the FreshTeams weapon respawn time through 20, 15, and 10 seconds (a 3-step cycle, not a toggle). Broadcasts the chosen value each time.
  >
  > Cycle order: 20 s (default) -> 15 s -> 10 s -> 20 s.
  >
  > Requires FreshTeams to be enabled (/fresh). Refused while a match is in progress or race mode is active.
  >
  > Set by: admin command in-game (/freshtime).

---

B5-RESULT | ktx:command:noweapon | FORMAT-UNIFIED | rev=1 | from-shape: long prose with weapon list, no Default/Set-by structure | to-shape: D20-template

### ktx:command:noweapon

- canonical_id: ktx:command:noweapon
- prior length: 473
- new length: 393

- OLD description:
  > Manages which weapons are disallowed for the match in deathmatch mode 4 (dmm4). With no argument it prints the current list of disallowed weapons. With one argument (a weapon name axe, sg, ssg, ng, sng, gl, rl, lg, or its number 1-8) it toggles that weapon between allowed and disallowed in the k_disallow_weapons set and announces the change server-wide. Only works in dmm4; while a match is in progress it only shows the disallowed list (and does nothing in other modes).

- NEW description:
  > Manages the dmm4 weapon-disallow list (k_disallow_weapons). Only works in deathmatch mode 4.
  >
  > No argument: prints the current disallowed-weapons list.
  > One argument (weapon name axe/sg/ssg/ng/sng/gl/rl/lg, or its number 1-8): toggles that weapon between allowed and disallowed and announces the change.
  > During a live match: only shows the list (no changes allowed).
  >
  > Set by: admin command in-game.

---

B5-RESULT | ktx:command:race_set_start | FORMAT-UNIFIED | rev=1 | from-shape: long prose, clean but no Default/Set-by | to-shape: D20-template

### ktx:command:race_set_start

- canonical_id: ktx:command:race_set_start
- prior length: 462
- new length: 398

- OLD description:
  > Race-mode route editing command (player / spectator-admin). Places the race start gate at the caller's current position AND facing direction (the start node stores view angles so racers spawn aimed down the route) on the custom race route. Has no effect if the race is already running, or if the route already holds the maximum number of nodes. On success it broadcasts the start-node coordinates and direction and flags the route as a custom (non-preset) route.

- NEW description:
  > Race route editing command (player or spectator-admin). Places the race start gate at the caller's current position and facing direction, so racers spawn aimed down the route.
  >
  > No-op if the race is already running or the route has reached the maximum node count.
  > On success: broadcasts the start-node coordinates and direction, and marks the route as custom (not a preset).
  >
  > Set by: player or spectator-admin command in race mode.

---

B5-RESULT | ktx:command:silence | FORMAT-UNIFIED | rev=1 | from-shape: long prose with "fpd" bit + "sv_spectalk" engine-jargon + "serverinfo" internals | to-shape: D20-template

### ktx:command:silence

- canonical_id: ktx:command:silence
- prior length: 465
- new length: 327

- OLD description:
  > Toggles whether players can hear spectators' chat (the k_spectalk setting). Outside a running match any player may toggle it; once a match is in progress only an admin may, and during a live match it also updates the server's sv_spectalk and the serverinfo "fpd" spectator-talk bit (bit 64) accordingly. It announces the new state to everyone ("Spectalk on/off: players can[/no longer] hear spectators..."). Takes no arguments; it flips the current state each time.

- NEW description:
  > Toggles whether players can hear spectators' chat (the k_spectalk setting). Announces the new state to all players each time.
  >
  > Outside a match: any player may use it.
  > During a live match: admin-only.
  >
  > Set by: any player outside a match; admin command during a live match.
  > See also: QW team-chat visibility concept note.

---

B5-RESULT | ktx:command:stats | FORMAT-UNIFIED | rev=1 | from-shape: long prose with "match_in_progress == 2" code expression | to-shape: D20-template

### ktx:command:stats

- canonical_id: ktx:command:stats
- prior length: 464
- new length: 377

- OLD description:
  > Prints end-of-match player statistics to the requesting player. Only works after a match has finished (match_in_progress == 2); otherwise it replies "no game - no statistics". For each player, grouped by team, it lists name, frags, rank (frags minus deaths), and -- in team modes -- friendly kills, plus an efficiency column. In CTF the frag-based columns are computed net of capture points. In Race Arena modes it instead delegates to the Race Arena stats output.

- NEW description:
  > Prints end-of-match player statistics. Only works after a match has ended; replies "no game - no statistics" otherwise.
  >
  > Output: players grouped by team, each showing name, frags, rank (frags minus deaths), friendly kills (team modes), and efficiency.
  > In CTF: frag-based columns are net of capture points.
  > In Race Arena: delegates to the Race Arena stats output.
  >
  > Set by: any player command (/stats).

---

B5-RESULT | ktx:command:teamoverlay | FORMAT-UNIFIED | rev=1 | from-shape: long prose with vote mechanics, clean but verbose | to-shape: D20-template

### ktx:command:teamoverlay

- canonical_id: ktx:command:teamoverlay
- prior length: 470
- new length: 366

- OLD description:
  > Casts (or withdraws) the calling player's vote to flip the server's k_teamoverlay setting (whether clients are allowed to use the team-overlay HUD). While a match is in progress it does not vote and instead just reports the current Teamoverlay on/off state. Non-admins need at least 2 players present to vote; an admin may toggle the setting alone. Each call toggles the player's vote and broadcasts it with the running count; once enough players vote the setting flips.

- NEW description:
  > Votes to toggle the server's team-overlay HUD permission (k_teamoverlay). Each call casts or withdraws the player's vote and broadcasts the running count; once enough votes are collected, the setting flips.
  >
  > During a live match: reports the current state only (no vote cast).
  > Non-admin: requires at least 2 players present to vote.
  > Admin: may toggle the setting directly.
  >
  > Set by: any player command (/teamoverlay).

---

B5-RESULT | ktx:command:y | FORMAT-UNIFIED | rev=1 | from-shape: long prose with kick-mode lifecycle detail, clean | to-shape: D20-template

### ktx:command:y

- canonical_id: ktx:command:y
- prior length: 467
- new length: 310

- OLD description:
  > Confirmation keystroke for the interactive admin kick walk-through. After an admin runs `kick` with no arguments, KTX enters a kick-selection mode that steps through connected players/spectators one at a time, prompting "Kick player/spectator <name>?". Typing `y` kicks the currently-prompted client and advances to the next one; if there is no valid target it just advances to the next client. Outside an active kick mode it does nothing. Admin-only (CF_BOTH_ADMIN).

- NEW description:
  > Confirms the kick of the currently-prompted player or spectator during the interactive /kick walk-through. The /kick command (with no argument) enters a step-through mode; typing y at each prompt kicks that client and advances to the next. Does nothing outside an active kick session.
  >
  > Set by: admin command in-game (/y).

---

B5-RESULT | ktx:cvar:allow_toggle_practice | FORMAT-UNIFIED | rev=1 | from-shape: long prose with "as enforced in code" + unimplemented-tier detail | to-shape: D20-template

### ktx:cvar:allow_toggle_practice

- canonical_id: ktx:cvar:allow_toggle_practice
- prior length: 470
- new length: 443

- OLD description:
  > Access control for the `practice` command (which toggles the server in and out of practice mode). Effect by value as enforced in code: 0 = no one may use the command; 1 or 2 = admins only; 3 or 4 = admins only (the judge tiers are not implemented and fall back to requiring admin); 5 = all players; any other value = command rejected as misconfigured. The command is always ignored while a match is in progress, when force-start is active, or when an idlebot is present.

- NEW description:
  > Access control for the /practice command (toggles the server in and out of practice mode).
  >
  > 0 = no one may use /practice.
  > 1 or 2 = admins only.
  > 3 or 4 = admins only (judge tiers are not implemented; these values fall back to admin-only).
  > 5 = all players.
  > Other = command rejected (server misconfigured).
  >
  > The command is always blocked while a match is in progress, force-start is active, or an idlebot is present.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_allowklist | FORMAT-UNIFIED | rev=1 | from-shape: long prose with parenthetical client-list detail, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_allowklist

- canonical_id: ktx:cvar:k_allowklist
- prior length: 466
- new length: 310

- OLD description:
  > Controls whether the klist command (which prints the connected-clients list -- players with their id, admin/VIP flags, handicap and team; spectators with who they are tracking; and ghosts) may be used by a player while a match is in progress. 0 = klist is refused for players during a match (responds 'klist is disabled'); 1 = klist is allowed. The restriction applies only to clients of type player during a match; spectators and use outside a match are unaffected.

- NEW description:
  > Controls whether players may use /klist (the connected-clients list) during a live match.
  >
  > 0 = /klist is refused for players during a match ("klist is disabled").
  > 1 = /klist is allowed at all times.
  >
  > Spectators and use outside a match are unaffected regardless of this setting.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_bloodfest | FORMAT-UNIFIED | rev=1 | from-shape: long prose with parenthetical implementation-detail list, minor code jargon | to-shape: D20-template

### ktx:cvar:k_bloodfest

- canonical_id: ktx:cvar:k_bloodfest
- prior length: 468
- new length: 295

- OLD description:
  > Enables Bloodfest game mode. 0 = off, 1 = on (default 0). With it on, the server runs the Bloodfest wave-based monster survival logic: monsters are spawned in escalating waves and players fight them cooperatively (the per-frame bloodfest monster spawner and bloodfest client logic become active, monster AI and monster-vs-player weapon behavior change, and bloodfest interacts with matchless mode). With it off none of the Bloodfest behavior runs and play is standard.

- NEW description:
  > Enables Bloodfest game mode -- a wave-based cooperative monster survival mode where monsters are spawned in escalating waves and players fight them together.
  >
  > 0 = Bloodfest off (standard play).
  > 1 = Bloodfest on.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_vol_init | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code identifiers (self->fb.skill.initial_volatility, cvar_fset, setSkillAttributes) | to-shape: D20-template

### ktx:cvar:k_fbskill_vol_init

- canonical_id: ktx:cvar:k_fbskill_vol_init
- prior length: 462
- new length: 296

- OLD description:
  > Frogbot AI aim-volatility tuning cvar. The bot's aim error is scaled by a running per-target 'volatility' scalar; this cvar sets the starting value that scalar is reset to whenever the bot's look-target changes (treated as if it had not seen the player before). The bot reads it clamped to bound(0, value, 5.0) into self->fb.skill.initial_volatility. Server-managed: derived from bot skill via cvar_fset in setSkillAttributes()/setSkillAttributesEasySkillMode().

- NEW description:
  > Frogbot aim-volatility seed. Sets the initial aim-error volatility assigned to a bot each time it acquires a new target (as if it has not seen the player before). Higher values mean more erratic aiming when first engaging a new target.
  >
  > Range: 0 to 5.0 (clamped). Set automatically by the skill level; not intended for manual tuning.
  >
  > Default: derived from bot skill level.
  > Set by: server config (managed automatically).

---

B5-RESULT | ktx:cvar:k_freshteams_limit_packs | FORMAT-UNIFIED | rev=1 | from-shape: long prose with explicit per-cvar ceiling list, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_freshteams_limit_packs

- canonical_id: ktx:cvar:k_freshteams_limit_packs
- prior length: 469
- new length: 358

- OLD description:
  > Fresh Teams (dmm1) only: when enabled (1) and k_freshteams is active, the ammo carried by a dropped backpack is capped per ammo type to the k_freshteams_pack_shells / k_freshteams_pack_nails / k_freshteams_pack_rockets / k_freshteams_pack_cells ceilings. 0 = a dropped backpack keeps the full amount of ammo the dead player was carrying; 1 = each ammo type in the dropped backpack is clamped to its configured per-type maximum. Has no effect unless k_freshteams is set.

- NEW description:
  > Fresh Teams (dmm1) only: when enabled, caps the ammo in dropped backpacks to the per-type limits set by k_freshteams_pack_shells, k_freshteams_pack_nails, k_freshteams_pack_rockets, and k_freshteams_pack_cells. Has no effect unless k_freshteams is active.
  >
  > 0 = backpacks carry the full ammo the dead player was holding.
  > 1 = each ammo type in the backpack is clamped to its configured maximum.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_hoonymode_prevmap | FORMAT-UNIFIED | rev=1 | from-shape: long prose, internally clean, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_hoonymode_prevmap

- canonical_id: ktx:cvar:k_hoonymode_prevmap
- prior length: 462
- new length: 358

- OLD description:
  > Internal HoonyMode state, not meant to be set by hand: stores the identifier of the last map (the .ent entityfile name, or the map name if none) for which team-game spawn nominations were saved. On the next team HoonyMode game, if the current map identifier matches this stored value the previously saved spawn assignments (see k_hoonymode_prevspawns) are restored; if it differs, the saved spawns are cleared. Written automatically by the engine; default empty.

- NEW description:
  > Internal HoonyMode state -- do not set manually. Stores the map identifier (entity file name, or map name if no entity file) for which the previous team spawn nominations were saved.
  >
  > On the next team HoonyMode game: if the current map matches this value, the saved spawn assignments (k_hoonymode_prevspawns) are restored; if it differs, the saved spawns are cleared.
  >
  > Default: empty (no saved map).
  > Set by: written automatically by the server; not a user-configurable setting.

---

B5-RESULT | ktx:cvar:k_nosweep | FORMAT-UNIFIED | rev=1 | from-shape: long prose with match-readout string, clean content | to-shape: D20-template

### ktx:cvar:k_nosweep

- canonical_id: ktx:cvar:k_nosweep
- prior length: 461
- new length: 320

- OLD description:
  > When set (non-zero), a player who already carries a given weapon cannot pick up another instance of that same weapon -- touching a duplicate weapon does nothing (the player neither re-takes it nor gains its sweep ammo). 0 = weapons can be re-swept normally; non-zero = duplicate-weapon pickup blocked. Only effective in DMM1 (deathmatch 1); the server forces it back to 0 in any other deathmatch mode. While active the match settings readout shows "NoSweep on".

- NEW description:
  > Prevents players from picking up a weapon they already carry in dmm1. Touching a duplicate weapon does nothing -- no re-take, no sweep ammo gained.
  >
  > 0 = weapons can be re-swept normally.
  > 1 (or non-zero) = duplicate-weapon pickup blocked.
  >
  > DMM1 only. The server automatically resets this to 0 in any other deathmatch mode.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_route_number | FORMAT-UNIFIED | rev=1 | from-shape: long prose with internal-state detail including web-post mention, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_race_route_number

- canonical_id: ktx:cvar:k_race_route_number
- prior length: 469
- new length: 366

- OLD description:
  > Stores the race route index (0-based) currently selected for the map. On a server-side route (re)load, if k_race_route_mapname matches the current map this route index is reloaded directly; otherwise the next route is selected. Out-of-range values fall back to route 0; it is set to -1 to mark a custom (non-stored) route, and rewritten to the loaded route index whenever a route is loaded. It is also reported (with the map name) in the LogRaceAttempt server web-post.

- NEW description:
  > Stores the race route index (0-based) currently selected for the map. Updated automatically when a route loads.
  >
  > Range: 0-based integer. Out-of-range values fall back to route 0.
  > -1 = a custom (non-stored) route is active.
  >
  > On route load: if k_race_route_mapname matches the current map, this index is reloaded; otherwise the next available route is selected.
  >
  > Default: 0.
  > Set by: managed automatically by the race system; not intended for manual config.

---

B5-RESULT | ktx:cvar:k_race_scoring_system | FORMAT-UNIFIED | rev=1 | from-shape: long prose with inline scoring table and "not source-legible" style verbiage | to-shape: D20-template

### ktx:cvar:k_race_scoring_system

- canonical_id: ktx:cvar:k_race_scoring_system
- prior length: 469
- new length: 399

- OLD description:
  > Selects which point-scoring table is used to award frags per round in race match mode. Read as an integer clamped to 0-2: 0 = 'Win Only' (1 frag to the round winner only), 1 = 'Scaled' (1 frag for completing the run, +1 per opponent beaten, plus a winner bonus), 2 = 'Formula1' (position-based points 25/18/15/12/10/8/6/4/2/1). Cycled by the scoring-system toggle command. Has no effect outside race match mode (point awards return zero unless k_race_match is enabled).

- NEW description:
  > Selects the scoring system used to award frags per round in race match mode. Cycled by the scoring-system toggle command.
  >
  > 0 = Win Only: 1 frag to the round winner only.
  > 1 = Scaled: 1 frag for completing the run, +1 per opponent beaten, plus a winner bonus.
  > 2 = Formula1: position-based points (25/18/15/12/10/8/6/4/2/1).
  >
  > No effect outside race match mode (requires k_race_match enabled).
  >
  > Default: 0.
  > Set by: server config or scoring-system toggle command.

---
