# B5 format-unify ledger -- batch 01

**Batch:** 01 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:2on2on2 | FORMAT-UNIFIED | rev=1 | from-shape: prose with preset-settings dump + access-gate details | to-shape: D20-template

### ktx:command:2on2on2

- canonical_id: `ktx:command:2on2on2`
- prior length: 837 chars
- new length: 389 chars

- OLD description:
  > Switches the server to KTX's built-in 2on2on2 three-team game mode. Running it applies the mode's preset and then execs any layered configs/usermodes/2on2on2/*.cfg overrides; a chat line announcing the mode is printed. The preset sets: maxclients and k_maxclients to 6 (six player slots, three teams of two), k_lockmin 1 and k_lockmax 3 (1-3 teams permitted), timelimit 10 (10-minute rounds), k_overtime 1 with k_exttime 3 (time-based 3-minute overtime), teamplay 2 (team and self damage on), deathmatch 3 (weapons stay on pickup), k_pow 1 (powerups enabled), k_membercount 1 (minimum players per team enforced), coop 0, k_mode 2. Server-side invocation requires k_free_mode 5; client invocation is gated by the k_free_mode access level and the k_allowed_free_modes mask, and is blocked when k_auto_xonx is set or on hoonymode-only maps.

- NEW description:
  > Switches the server to the built-in 2on2on2 three-team game mode. Applies the mode preset (6 player slots / 3 teams of 2, 10-minute rounds, 3-minute overtime, teamplay 2, weapons stay, powerups on) then execs any layered usermodes/2on2on2/*.cfg overrides and announces the change.
  >
  > Set by: server config or any player with sufficient k_free_mode access (blocked when k_auto_xonx is set or on hoonymode-only maps).

---

B5-RESULT | ktx:command:commands | FORMAT-UNIFIED | rev=1 | from-shape: prose with admin-class partition detail + filter clause | to-shape: D20-template

### ktx:command:commands

- canonical_id: `ktx:command:commands`
- prior length: 819 chars
- new length: 389 chars

- OLD description:
  > Prints to the caller the full KTX server-command list, in two sections: a common-commands section followed by an admin-commands section, each labelled with the caller's class ("common commands for player" or "common commands for spectator", then "admin commands for ..."); both sections are emitted for every caller, including non-admin callers (there is no per-caller admin-rights filter -- the split is by the command's own admin-class flag, not by who is asking). Each line shows the command name and its one-line description. Commands with no description and commands not valid for the caller's class (`isValidCmdForClass`: wrong player/spec class, or matchless-mode commands when no match is running) are omitted from both sections. An optional argument filters the list to command names containing that substring.

- NEW description:
  > Lists all KTX server commands in two sections: common commands and admin commands. Both sections are shown to every caller regardless of admin status -- the split is by command flag, not by caller rights. Commands with no description or not valid for the caller's class are omitted. An optional argument filters the list to names containing that substring.
  >
  > Set by: any player or spectator (no match-state restriction).

---

B5-RESULT | ktx:command:ctfbasedspawn | FORMAT-UNIFIED | rev=1 | from-shape: prose with spawn-point classnames + match-gate + auto-promote detail | to-shape: D20-template

### ktx:command:ctfbasedspawn

- canonical_id: `ktx:command:ctfbasedspawn`
- prior length: 870 chars
- new length: 421 chars

- OLD description:
  > Toggles the `k_ctf_based_spawn` cvar between 0 and 1, controlling CTF spawn-point selection: value 1 spawns at the caller's team base (info_player_team1 / info_player_team2), and value 2 (set separately, not via this toggle) spawns at a 50/50 random pick between a neutral mid-map deathmatch spawn (info_player_deathmatch) and a home-base deathmatch spawn (info_player_team1_deathmatch / info_player_team2_deathmatch), to avoid being repeatedly spawn-killed when the flag is overrun. CTF mode only -- in non-CTF the command refuses with "Can't do this in non CTF mode". The change is rejected while a match is in progress unless the server is matchless. On maps that have one or fewer info_player_deathmatch entities, a base-spawn enforcement message is printed and the toggle is refused (the value is also auto-promoted to 1 at world-load when it would otherwise be 0).

- NEW description:
  > Toggles the k_ctf_based_spawn cvar between 0 and 1, switching CTF spawn-point selection between standard deathmatch spawns (0) and team-base spawns (1). CTF mode only -- refuses with "Can't do this in non CTF mode" on non-CTF servers. On maps with very few deathmatch spawns the toggle is refused and base-spawn is enforced automatically.
  >
  > Set by: admin command 'ctfbasedspawn' in-game (CTF mode only; not while a match is in progress unless matchless).

---

B5-RESULT | ktx:command:dmm4 | FORMAT-UNIFIED | rev=1 | from-shape: prose with per-branch source-trace + OctaPower detail | to-shape: D20-template

### ktx:command:dmm4

- canonical_id: `ktx:command:dmm4`
- prior length: 883 chars
- new length: 461 chars

- OLD description:
  > Switches the server to deathmatch mode 4: bounds the new mode value to the range [1, 5], sets the `deathmatch` cvar accordingly, and broadcasts "Deathmatch <n>". Runnable by any in-game player or by spectators who hold admin status (rcon-set or elected via /elect); spectators without admin are refused with "You are not an admin". Subject to the standard rules-change permission check (`is_rules_change_allowed`), which gates the whole handler. Mode 4 is the only mode in which the `k_midair` and `k_instagib` options remain permitted: the sibling commands dmm1/dmm2/dmm3/dmm5 explicitly zero both options on entry, and a separate post-config check at `src/world.c:1760-1769` zeros either option whenever `deathmatch != 4`. Entering dmm4 also forces `timelimit` to 3 minutes; while dmm4 is the active mode, the Quad Damage powerup is renamed "OctaPower" on the in-world item entity.

- NEW description:
  > Switches the server to deathmatch mode 4. Sets deathmatch to 4, forces timelimit to 3 minutes, and broadcasts the change. Mode 4 is the only deathmatch mode that permits k_midair and k_instagib -- switching away from dmm4 zeroes both options automatically. The Quad Damage powerup is renamed "OctaPower" while dmm4 is active.
  >
  > Set by: any in-game player or admin spectator ('dmm4' command; subject to rules-change permission).

---

B5-RESULT | ktx:command:droppack | FORMAT-UNIFIED | rev=1 | from-shape: prose with per-guard conditions + match-timing clause | to-shape: D20-template

### ktx:command:droppack

- canonical_id: `ktx:command:droppack`
- prior length: 823 chars
- new length: 399 chars

- OLD description:
  > Toggle of the "dp" (drop-pack) rule, which controls whether a player drops a backpack containing their ammo and weapon when they die during a live match. Runnable by any in-game player; admin spectators may also run it, but non-admin spectators are refused with "You are not an admin". Each invocation flips the rule between enabled and disabled and broadcasts "<player> enables/disables DropPacks" to everyone. The command itself is refused while a match is in progress, so it is set during warmup. When enabled, backpack-on-death is still gated by the match being in the live in-progress state and by DropBackpack's other guards (bloodfest mode disables it; suicide kills do not drop in non-yawn modes; nothing is dropped if the player has no ammo and no droppable weapon). When disabled, no backpack is dropped on death.

- NEW description:
  > Toggles the dp (drop backpack) rule and broadcasts the new state to all players. Must be set before the match starts (refused while a match is in progress). When enabled, players drop a backpack containing their ammo and weapon on death during a live match (subject to standard guards: bloodfest disables it, suicides in non-yawn modes do not drop, empty inventory drops nothing).
  >
  > Set by: any in-game player or admin spectator ('droppack' command; warmup only).

---

B5-RESULT | ktx:command:laststats | FORMAT-UNIFIED | rev=1 | from-shape: prose with per-table enumeration + mode-branch detail | to-shape: D20-template

### ktx:command:laststats

- canonical_id: `ktx:command:laststats`
- prior length: 922 chars
- new length: 398 chars

- OLD description:
  > Re-displays the end-of-game statistics tables for the most recently completed match to the requesting client via `MatchEndStatsTables()` (the "overhauled Endgame Statistics" path -- distinct from the legacy `MatchEndStats` automatic path invoked at game end; this command does NOT re-run the automatic path). Per-player tables emitted include: kill, item, weapon-efficiency, weapon-damage, weapons-taken, weapons-dropped, weapon-kill, enemy-weapon-kill, damage, item-time and weapon-time. CTF games add a CTF stats table; team and CTF games add a team-play summary; non-duel modes add a top-frags/deaths table. In midair, instagib, or LGC modes only that mode's specific stat tables (`playerMidairStats` / `playerInstagibStats` / `playerLGCStats`) are shown instead of the default battery. Refused with "Game in progress" while a match is running, and reports "Laststats data empty" when no completed-match data is stored.

- NEW description:
  > Re-displays the end-of-game statistics tables for the most recently completed match to the requesting client. Includes kill, item, weapon, and damage tables; CTF games add a CTF stats table; team games add a team-play summary. In midair, instagib, or LGC modes only the mode-specific stat tables are shown. Refused while a match is running; reports "Laststats data empty" if no data is stored.
  >
  > Set by: any player or spectator ('laststats' command; post-match only).

---

B5-RESULT | ktx:command:removeitem | FORMAT-UNIFIED | rev=1 | from-shape: prose with entity-iteration detail + setter-list note | to-shape: D20-template

### ktx:command:removeitem

- canonical_id: `ktx:command:removeitem`
- prior length: 827 chars
- new length: 378 chars

- OLD description:
  > Deletes the entity closest to the caller whose `dropitem` flag is set. The `dropitem` flag is set only by entities placed via the `dropitem` command (sole setter `dropitem_spawn_item` at `commands.c:9144`); ordinary death-drops, backpacks, and DropPowerup spawns do NOT set this flag, so this command does not affect them. Iterates all server entities, picks the one with minimum squared distance from the caller's origin to the entity's bounding-box center. On success prints "Removed <classname>" privately to the caller and removes the entity (`ent_remove`); if no eligible entity exists, prints "Nothing found around" privately. Refused (silent return) while a match is in progress, and refused with "Cheats are disabled on this server, so use the force, Luke..." when the server's `*cheats` infokey is empty.

- NEW description:
  > Removes the placed item (from the 'dropitem' command) closest to the caller. Only affects items placed via 'dropitem' -- ordinary backpacks, death-drops, and powerup spawns are not affected. Prints "Removed <classname>" on success or "Nothing found around" if no placed item is nearby. Refused while a match is in progress and when cheats are disabled on the server.
  >
  > Set by: any player with cheats enabled ('removeitem' command; no match in progress).

---

B5-RESULT | ktx:command:-scores | FORMAT-UNIFIED | rev=1 | from-shape: prose with sc_stats field mechanics + centerprint-slot detail | to-shape: D20-template

### ktx:command:-scores

- canonical_id: `ktx:command:-scores`
- prior length: 824 chars
- new length: 268 chars

- OLD description:
  > Release half of the +scores/-scores press-and-release bind pair. The shared handler decrements its argument and writes the result to the caller's `sc_stats` field; `-scores` passes 1 so `sc_stats` becomes 0 (`+scores` passes 2 so `sc_stats` becomes 1). While `sc_stats` is non-zero the server periodically re-renders the text-form scoreboard via `G_centerprint` (the on-screen centered "scores" overlay), and the MOTD think-cycle is suppressed so the centerprint slot is not contested. Setting `sc_stats` to 0 stops that periodic refresh, lets the MOTD think-cycle resume, and -- on the next client think after the timer settles -- triggers the centerprint-clear path so the overlay disappears. Other HUD fields (health, armor, ammo) are never written by this path; only the centerprint slot is involved. Takes no arguments.

- NEW description:
  > Release half of the +scores/-scores press-and-release bind pair. Hides the on-screen scoreboard overlay. Intended to be bound alongside +scores: hold to show the scoreboard, release to hide it. Takes no arguments.
  >
  > Set by: any player or spectator (typically bound with +scores).

---

B5-RESULT | ktx:command:summary:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: prose with editor-mode gate + per-problem-field detail | to-shape: D20-template

### ktx:command:summary:frogbot:editor

- canonical_id: `ktx:command:summary:frogbot:editor`
- prior length: 876 chars
- new length: 411 chars

- OLD description:
  > Frogbot waypoint-editor diagnostic, available only while the bot editor mode is on (`FB_OPTION_EDITOR_MODE`). Prints a summary of the current map's bot-routing markers to the requesting player. Output: a "Marker summary:" header, then one line for EACH MARKER THAT HAS PROBLEMS -- the index, classname, and a tag indicating "no paths" (when the marker has zero outbound paths) and/or "no zone" (when the marker has not been assigned a zone) -- followed by a final "<N> markers in total" line. Markers that are fully configured (have paths and a zone) are NOT enumerated; only the problem markers are listed. The per-goal and per-zone aggregate counts are computed internally but are NOT emitted here -- they are produced by the sibling editor commands `goalsummary` and `zonesummary` respectively. Used while editing bot navigation to find unconnected or unconfigured markers.

- NEW description:
  > Frogbot editor command (available only in bot editor mode). Prints a diagnostic summary of the current map's bot-routing markers: lists only problem markers (those with no outbound paths and/or no zone assigned), followed by a total marker count. Fully configured markers are not listed. Use 'goalsummary' and 'zonesummary' for goal and zone aggregate counts.
  >
  > Set by: bot editor mode only ('summary' botcmd).

---

B5-RESULT | ktx:command:togglequad:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: prose with self-vs-bot clarification + expiry calculation | to-shape: D20-template

### ktx:command:togglequad:frogbot:std

- canonical_id: `ktx:command:togglequad:frogbot:std`
- prior length: 830 chars
- new length: 329 chars

- OLD description:
  > Frogbot standard botcmd subcommand (invoked as `botcmd togglequad`). Toggles the quad-damage powerup on the CALLER (i.e. on `self`, the command issuer) -- there is no isBot guard or self->bot redirect, so the handler operates on whoever invokes it: a human admin running it grants or clears quad on themselves, not on any bot. If the caller currently holds quad (`s.v.items & IT_QUAD`) the flag is cleared and `super_time` + `super_damage_finished` are zeroed; otherwise the IT_QUAD flag is set, `super_time = 1`, and `super_damage_finished = time + 3600 * 20` (~20-hour expiry, effectively unlimited). Gated -- like every other `botcmd` subcommand -- by the frogbot admin-permission cvar `FB_CVAR_ADMIN_ONLY` checked in `FrogbotsCommand` (with `is_real_adm` required if the cvar is 2, otherwise `is_adm` if the cvar is non-zero).

- NEW description:
  > Frogbot standard command (invoked as `botcmd togglequad`). Grants or removes quad damage on the caller. If the caller holds quad it is removed; otherwise quad is granted with an effectively unlimited duration. Requires frogbot admin permission.
  >
  > Set by: admin command 'botcmd togglequad' in-game (frogbot admin permission required).

---

B5-RESULT | ktx:command:uinfo | FORMAT-UNIFIED | rev=1 | from-shape: prose with one-arg vs two-arg path distinction + cinfos[] note | to-shape: D20-template

### ktx:command:uinfo

- canonical_id: `ktx:command:uinfo`
- prior length: 832 chars
- new length: 406 chars

- OLD description:
  > Queries another connected client's userinfo keys. With one argument (player id or name) the handler iterates a fixed table of tracked keys (`cinfos[]` at `g_userinfo.c:42-84`, active entries `*mm` `mi` `ev` `wpsx` `kf` -- the sys `*mm` is skipped) and lists each key the target client has set to a non-empty value as `key <name> = "<value>"`; this is the curated cinfos[] subset, NOT every non-system userinfo key the client carries. With two arguments (id/name + key) it shows that specific key's value for that client (`<player>'s <key> = "<value>"`) for any non-system key; system keys (those starting with `*`) are hidden (`key "<name>" is hidden`). Called with no arguments or more than two it prints the usage line. Aliased to `kuinfo` (shared handler `cmduinfo`); usable by players and spectators, no match-state restriction.

- NEW description:
  > Queries a connected client's userinfo keys. With one argument (player id or name) shows the curated subset of tracked keys that the target has set. With two arguments (id/name + key) shows that specific key's value for the target; system keys (starting with `*`) are shown as hidden. Prints usage if called with no arguments. Also available as 'kuinfo'.
  >
  > Set by: any player or spectator ('uinfo' / 'kuinfo' command; no match-state restriction).

---

B5-RESULT | ktx:cvar:k_btime | FORMAT-UNIFIED | rev=1 | from-shape: prose with per-field timer mechanics + Quad/invuln asymmetry | to-shape: D20-template scalar variant

### ktx:cvar:k_btime

- canonical_id: `ktx:cvar:k_btime`
- prior length: 928 chars
- new length: 415 chars

- OLD description:
  > Berzerk activation time, in seconds of REMAINING game time. Effective only when k_bzk (berzerk mode) is on: at match start the berzerk timer (k_berzerktime) is set to this many seconds, and when the game has exactly that many seconds of time left the server announces "BERZERK!!!!" to everyone and grants every living player Quad Damage (Octa in DM4) for the rest of the match -- super_damage_finished is set to (now + 3600s) and the wear-off / stop checks are suppressed while k_berzerk is on, so the Quad is held until match end. A brief 2-second invulnerability (Pentagram) is also granted at the trigger -- invincible_finished is set to (now + 2s) and decays normally (no berzerk-aware refresh), so the invuln is a short kickoff effect rather than a remainder-of-match grant. With k_bzk off this value has no effect (k_berzerktime is forced to 0 at match start and the per-frame trigger block is gated `k_berzerktime != 0`).

- NEW description:
  > When k_bzk (berzerk mode) is enabled: the number of seconds of game time remaining at which the server triggers the berzerk event -- announcing "BERZERK!!!!" and granting every living player Quad Damage (OctaPower in dmm4) for the rest of the match, plus a brief 2-second invulnerability as a kickoff effect. Has no effect when k_bzk is off.
  >
  > Range: seconds of remaining match time (any positive value; 0 disables berzerk).
  >
  > Default: 0 (no default set; bare registration).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:_k_coachteam2 | FORMAT-UNIFIED | rev=1 | from-shape: prose with dead-code explanation + branch-unreachability detail | to-shape: D20-template

### ktx:cvar:_k_coachteam2

- canonical_id: `ktx:cvar:_k_coachteam2`
- prior length: 899 chars
- new length: 297 chars

- OLD description:
  > Internal-only cvar registered by KTX (bare `RegisterCvar`, so the runtime default is empty) but never assigned anywhere in the KTX source. The single read site is the slot-2 arm of the same captain-style team-lock branch inside `FixPlayerTeam` (`g_userinfo.c:366-368`), under `k_coaches == 2 && self->k_picked == 2`; as with the slot-1 partner, `self->k_picked` is assigned only by the captain flow, coaches identify via `self->k_coach`, and the coach team-lock is enforced earlier at `g_userinfo.c:343-353` against the live team name (not against this cvar). The branch is therefore unreachable from the coach flow and the cvar reads as "" regardless, so it has no observable effect on team-locking at runtime. The companion `_k_coachteam1` is structurally identical; both shadow `_k_captteam{1,2}` (which the captain flow does write at `captain.c:389`) but were never wired to a coach-side writer.

- NEW description:
  > Internal cvar registered by KTX but never written in the source. Intended as the slot-2 complement to _k_captteam2 for a coach-side team-lock path that was never fully wired; the branch that reads it is unreachable at runtime. Always empty; has no observable effect. See also _k_coachteam1 (structurally identical).
  >
  > Default: empty (no default set).
  > Set by: not set by any in-game mechanism (internal / dead code).

---

B5-RESULT | ktx:cvar:k_ctf_based_spawn | FORMAT-UNIFIED | rev=1 | from-shape: prose with per-value classname list + auto-promote clause | to-shape: D20-template enum variant

### ktx:cvar:k_ctf_based_spawn

- canonical_id: `ktx:cvar:k_ctf_based_spawn`
- prior length: 870 chars
- new length: 441 chars

- OLD description:
  > Controls CTF spawn-point selection (registered default 0). Value 0: players spawn on their team base only at match start (info_player_team1/team2), then use generic deathmatch spawns (info_player_deathmatch). Value 1: players always spawn on their own team's base spawns (info_player_team1/team2). Value 2: each spawn is a 50/50 random pick between a neutral mid-map deathmatch spawn (info_player_deathmatch) and a home-base deathmatch spawn (info_player_team1_deathmatch / info_player_team2_deathmatch) -- intended to avoid being repeatedly spawn-killed when the flag is overrun. If the map has at most one info_player_deathmatch entity AND the current value is 0, the value is auto-promoted to 1 at world-load with a "Spawn on base enforced due to map limitation" notice; if the current value is 2 it is preserved (value-2 spawn behaviour remains live on sparse maps).

- NEW description:
  > CTF spawn-point selection policy.
  >
  > 0 = generic deathmatch spawns (team-base spawns only at match start).
  > 1 = always spawn at own team base.
  > 2 = each spawn is a 50/50 pick between a neutral mid-map spawn and a home-base spawn (reduces repeated spawn kills when the flag is overrun).
  >
  > Default: 0. On maps with very few deathmatch spawns, auto-promoted to 1 at world-load if currently 0.
  > Set by: server config or 'ctfbasedspawn' admin command in-game (CTF mode only).

---

B5-RESULT | ktx:cvar:k_entityfile | FORMAT-UNIFIED | rev=1 | from-shape: prose with '#' separator mechanics + per-consumer file-path detail | to-shape: D20-template scalar variant

### ktx:cvar:k_entityfile

- canonical_id: `ktx:cvar:k_entityfile`
- prior length: 926 chars
- new length: 441 chars

- OLD description:
  > String cvar holding an alternate basename used when locating per-map auxiliary files. When non-empty, KTX uses this value as the filename stem (substituted verbatim into "%s") for the bot-marker file (maps/<value>.bot), the race route file (race/routes/<value>.route), the location file (locs/<value>.loc), and as the same-level / next-map target. Empty string = those files are looked up under the actual map name. It is set automatically when a map change is requested in the "<map>#<entityfile>" form (the '#' is K_ENTITYFILE_SEPARATOR): the cvar is set to the FULL "<map>#<entityfile>" string -- so the resolved filenames include the '#' as part of the stem (e.g. "maps/dm4#aero.bot"). Internally, the '#' position is used to split out a separate map-name argument for trap_changelevel; only the full string is stored as this cvar. If no '#' is present in the change-level request, the cvar is cleared to the empty string.

- NEW description:
  > Alternate filename stem used when locating per-map auxiliary files (bot markers, race routes, location files). When non-empty, KTX looks for files under this stem instead of the actual map name. Set automatically when a map is loaded with the `<map>#<entityfile>` syntax; the full string including the '#' is stored. Cleared to empty when no '#' is present in the map change request.
  >
  > Default: empty (uses actual map name).
  > Set by: set automatically on map change with `<map>#<entityfile>` syntax; not typically set directly.

---

B5-RESULT | ktx:cvar:k_freshteams_weapon_time | FORMAT-UNIFIED | rev=1 | from-shape: prose with clamped-local vs unclamped-read detail + ammo path | to-shape: D20-template scalar variant

### ktx:cvar:k_freshteams_weapon_time

- canonical_id: `ktx:cvar:k_freshteams_weapon_time`
- prior length: 937 chars
- new length: 381 chars

- OLD description:
  > FreshTeams (dmm1) only: the respawn delay, in seconds, before a picked-up weapon reappears on the map. When `k_freshteams` is on, the weapon-touch path uses `weapon_time = cvar("k_freshteams_weapon_time")` (read directly, no clamp on the respawn-apply path) instead of the standard 30-second weapon respawn; when `k_freshteams` is off, weapons respawn in 30 seconds regardless of this cvar. If `k_freshteams_fast_ammo` is also enabled, ammo entities re-use the raw cvar value as their respawn delay too (replacing their own defaults). The companion admin command `ToggleFreshTime` cycles the stored value among 20 / 15 / 10 (with a 0..60 bound used only as a LOCAL inside that command to decide the next cycle step, never written back to the cvar); a direct `set` to a value outside that range will take effect on the next pickup unclamped.

- NEW description:
  > Fresh Teams (dmm1) only: weapon respawn delay in seconds. Replaces the standard 30-second respawn while k_freshteams is on. When k_freshteams_fast_ammo is also enabled, this value is also used as the ammo respawn delay. Has no effect when k_freshteams is off.
  >
  > Range: seconds (any positive value; applied unclamped at the weapon pickup site).
  >
  > Default: 20.
  > Set by: server config or 'freshtime' admin command (cycles 20 / 15 / 10).

---

B5-RESULT | ktx:cvar:k_matchless | FORMAT-UNIFIED | rev=1 | from-shape: prose with mode-force conditions + coop/SP force + allowed-modes detail | to-shape: D20-template enum variant

### ktx:cvar:k_matchless

- canonical_id: `ktx:cvar:k_matchless`
- prior length: 945 chars
- new length: 443 chars

- OLD description:
  > When set to 1, the server runs in matchless mode: there is no formal match start/stop lifecycle (no prewar/countdown), readiness is forced and players play continuously instead of cycling through warmup-into-match. Matchless servers are restricted to FFA or CTF as the active k_mode: at world-load, if matchless is on and the current mode is neither FFA nor CTF, the mode is forced to FFA; if the current mode is CTF it is preserved and dedicated matchless-CTF teamplay defaults are applied (teamplay forced to 2 if 0, k_mode held at 4=CTF). 0 = regular match server (normal prewar/countdown/match lifecycle). 1 = matchless server (FFA by default, CTF supported as first-class). Coop and singleplayer are always treated as matchless regardless of this value -- when `deathmatch` is 0 or `coop` is non-zero, k_matchLess is set to 1 (with matchless_was_forced=true to mark it). UM_FFA is also forced into k_allowed_free_modes when matchless is on.

- NEW description:
  > Toggle for matchless mode -- removes the formal match lifecycle (no prewar/countdown) so players play continuously.
  >
  > 0 = regular match server with prewar/countdown/match cycle.
  > 1 = matchless server (FFA by default; CTF is supported as first-class with teamplay forced to 2 if needed). Coop and singleplayer are always treated as matchless regardless.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_matchless_max_idle_time | FORMAT-UNIFIED | rev=1 | from-shape: prose with warn-time formula + Qizmo-aware reconnect path | to-shape: D20-template scalar variant

### ktx:cvar:k_matchless_max_idle_time

- canonical_id: `ktx:cvar:k_matchless_max_idle_time`
- prior length: 943 chars
- new length: 449 chars

- OLD description:
  > Only effective in matchless mode. The maximum number of seconds a player may go without firing (without `self->attack_finished` being updated) before being force-moved to spectator and made to reconnect. The trigger prints "You were forced to reconnect as spectator by exceeding the maximum idle time of N seconds." then issues `spectator 1` and a disconnect-then-reconnect stuffcmd (Qizmo-aware variant for Qizmo proxies). A warning is sent at one specific moment beforehand: when the limit is greater than 30 seconds, the warning fires when 30 seconds remain; when the limit is 30 seconds or less, the warning fires at half the limit remaining (so the branch threshold is 30, not 60). The warning reads "WARNING: You will be forced to spectate if you do not fire within N seconds!". Set to 0 to disable the idle check entirely. Counted in seconds; only active during a live match (gate `match_in_progress`) and only when `k_matchLess` is on.

- NEW description:
  > Matchless mode only: maximum seconds a player may go without firing before being force-moved to spectator and asked to reconnect. A warning is sent beforehand -- 30 seconds before the limit if the limit exceeds 30 seconds, or at half the limit otherwise. Set to 0 to disable idle enforcement.
  >
  > Range: 0-N seconds (0 = disabled; no upper clamp).
  >
  > Default: 0 (disabled; bare registration).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_match | FORMAT-UNIFIED | rev=1 | from-shape: prose with single-vs-match mode difference + sv_silentrecord side-effect | to-shape: D20-template enum variant

### ktx:cvar:k_race_match

- canonical_id: `ktx:cvar:k_race_match`
- prior length: 872 chars
- new length: 421 chars

- OLD description:
  > Master switch (0/1) for race match mode (registered default 0). When 0, race runs in single-best-run mode: each racer chases their own personal best and a per-run StartDemoRecord captures their individual demo. When 1, the race becomes a competitive multi-round match: racers start simultaneously, idlers at the start are ended (in match mode -- ended without the 3-AFK escalation that the non-match path uses), a round counter "round: N/M" is shown on the centerprint/scoreboard, points are awarded per round via the configured scoring system, and per-run StartDemoRecord is suppressed in favour of a server-level demo. The `race_match_toggle` command pairs the cvar toggle with sv_silentrecord: it writes sv_silentrecord to 0 (silent recording OFF -> server-level demo is announced) when k_race_match becomes truthy, and to 1 (silent ON) when k_race_match becomes falsy.

- NEW description:
  > Master toggle for race match mode. Controls whether race runs as individual best-run attempts or as a competitive multi-round match.
  >
  > 0 = individual mode: each racer chases their personal best; per-run demos are recorded individually.
  > 1 = match mode: racers start simultaneously, points awarded per round, server-level demo recorded instead of per-run demos.
  >
  > Default: 0.
  > Set by: server config or 'race_match_toggle' admin command (also adjusts server demo recording settings).

---

B5-RESULT | ktx:cvar:lock_practice | FORMAT-UNIFIED | rev=1 | from-shape: prose with G_ShutDown trigger path + TogglePractice gate detail | to-shape: D20-template enum variant

### ktx:cvar:lock_practice

- canonical_id: `ktx:cvar:lock_practice`
- prior length: 857 chars
- new length: 405 chars

- OLD description:
  > Controls whether practice mode can be toggled and whether it auto-clears across level changes. 0 = practice mode is automatically cleared (`SetPractice(0, NULL)`) at the next level change or mod shutdown -- the clear runs inside `G_ShutDown`, the engine's GAME_SHUTDOWN handler that fires before each level change or server reload (not on match reset specifically; the auto-clear coincides with match boundaries only because a level change typically separates matches). 1 = the practice-toggle command is allowed and practice mode persists across level changes (the auto-clear branch is skipped). 2 = the server is locked in its current practice mode and the practice-toggle command is refused with "console: command is locked". Any value other than 0, 1 or 2 is treated as locked (toggle refused). Registered with no built-in default (bare `RegisterCvar`).

- NEW description:
  > Controls whether practice mode can be toggled and whether it persists across level changes.
  >
  > 0 = practice mode auto-clears on level change (returns server to normal mode).
  > 1 = practice-toggle command allowed; practice mode persists across level changes.
  > 2 = server locked in current practice mode; toggle command refused with "console: command is locked". Any value other than 0 or 1 is also treated as locked.
  >
  > Default: 0 (empty; bare registration).
  > Set by: server config.

---
