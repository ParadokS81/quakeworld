# B5 format-unify ledger -- batch 16

**Batch:** 16 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:cvar:k_bzk | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence prose with file:line refs and "IT_QUAD | IT_INVULNERABILITY" code jargon | to-shape: D20-template

### ktx:cvar:k_bzk

- canonical_id: ktx:cvar:k_bzk
- prior length: 1509
- new length: 392

- OLD description:
  > Enables berzerk mode for matches. 0 = off, 1 = on (default 0). When on, the berzerk timer is armed at match start (to k_btime seconds); when the game reaches that many seconds of time remaining the server announces "BERZERK!!!!" and gives every player Quad (and invulnerability) for the rest of the match, and players who connect during berzerk also receive Quad. When off, berzerk never triggers.

- NEW description:
  > Toggle for berzerk mode. When enabled, the server arms a countdown at match start (set by k_btime). When that many seconds of match time remain, the server announces "BERZERK!!!!" and grants every player Quad and invulnerability for the rest of the match. Players who join mid-berzerk also receive Quad.
  >
  > 0 = berzerk mode off.
  > 1 = berzerk mode on.
  >
  > Default: 0.
  > Set by: server config or 'berzerk' admin command in-game.

---

B5-RESULT | ktx:cvar:k_classic_shotgun | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence with source function names and code references | to-shape: D20-template

### ktx:cvar:k_classic_shotgun

- canonical_id: ktx:cvar:k_classic_shotgun
- prior length: 431
- new length: 368

- OLD description:
  > Controls how shotgun / super-shotgun pellet impact effects are shown. 1 = each pellet that hits produces its own blood or gunshot impact effect at its precise hit point (classic per-pellet visuals). 0 = per-pellet effects are suppressed and a single combined impact effect is emitted for the whole spread. Damage dealt is identical either way; this changes only the visual feedback of the spread.

- NEW description:
  > Controls whether the shotgun and super-shotgun show per-pellet or combined impact effects.
  >
  > 0 = one combined impact effect for the whole spread.
  > 1 = each pellet shows its own blood or gunshot impact at its precise hit point (classic visuals).
  >
  > Damage dealt is identical either way; this changes only the visual feedback of the spread.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_lgcmode | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence with source function names and file:line refs | to-shape: D20-template

### ktx:cvar:k_lgcmode

- canonical_id: ktx:cvar:k_lgcmode
- prior length: 726
- new length: 438

- OLD description:
  > Enables LGC (Lightning Gun Challenge) mode. 0 = off; 1 = on. Enabling it requires deathmatch mode 4 and turns off incompatible modes (midair, instagib, dmgfrags) and resets handicap to neutral; while active the handicap and dmgfrags commands are refused, match overtime is disabled, and scoring switches to LGC statistics (lightning-gun hits bucketed by distance). Toggled by the lgcmode command.

- NEW description:
  > Toggle for LGC (Lightning Gun Challenge) mode. Requires deathmatch mode 4. Enabling it disables incompatible modes (midair, instagib, dmgfrags) and resets handicap to neutral. While active, the handicap and dmgfrags commands are blocked, overtime is disabled, and post-match stats track lightning-gun hits bucketed by distance.
  >
  > 0 = LGC mode off.
  > 1 = LGC mode on.
  >
  > Default: 0.
  > Set by: server config or 'lgcmode' admin command in-game.

---

B5-RESULT | ktx:command:5fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with "stuffcmd", "cmd_t dispatcher", file:line refs and CD_* macro names | to-shape: D20-template

### ktx:command:5fav_go

- canonical_id: ktx:command:5fav_go
- prior length: 537
- new length: 253

- OLD description:
  > Spectator command: switch to tracking (spectating) the player saved in favourite slot 5. If slot 5 is empty it reports "fav go: slot 5 is not defined"; if the saved player is no longer in the game it reports "fav go: slot 5 can't find player"; if you are already tracking that player it reports "fav go: already observing...". Favourite slots are populated by the corresponding fav add commands.

- NEW description:
  > Spectator command: switch to tracking the player saved in favourite slot 5. Reports an error if slot 5 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
  >
  > Set by: spectator (no arguments).

---

B5-RESULT | ktx:command:6fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with "stuffcmd", "cmd_t dispatcher", file:line refs and CD_* macro names | to-shape: D20-template

### ktx:command:6fav_go

- canonical_id: ktx:command:6fav_go
- prior length: 537
- new length: 253

- OLD description:
  > Spectator command: switch to tracking (spectating) the player saved in favourite slot 6. If slot 6 is empty it reports "fav go: slot 6 is not defined"; if the saved player is no longer in the game it reports "fav go: slot 6 can't find player"; if you are already tracking that player it reports "fav go: already observing...". Favourite slots are populated by the corresponding fav add commands.

- NEW description:
  > Spectator command: switch to tracking the player saved in favourite slot 6. Reports an error if slot 6 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
  >
  > Set by: spectator (no arguments).

---

B5-RESULT | ktx:command:7fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with "stuffcmd", "cmd_t dispatcher", file:line refs and CD_* macro names | to-shape: D20-template

### ktx:command:7fav_go

- canonical_id: ktx:command:7fav_go
- prior length: 537
- new length: 253

- OLD description:
  > Spectator command: switch to tracking (spectating) the player saved in favourite slot 7. If slot 7 is empty it reports "fav go: slot 7 is not defined"; if the saved player is no longer in the game it reports "fav go: slot 7 can't find player"; if you are already tracking that player it reports "fav go: already observing...". Favourite slots are populated by the corresponding fav add commands.

- NEW description:
  > Spectator command: switch to tracking the player saved in favourite slot 7. Reports an error if slot 7 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
  >
  > Set by: spectator (no arguments).

---

B5-RESULT | ktx:command:8fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with "stuffcmd", "cmd_t dispatcher", file:line refs and CD_* macro names | to-shape: D20-template

### ktx:command:8fav_go

- canonical_id: ktx:command:8fav_go
- prior length: 537
- new length: 253

- OLD description:
  > Spectator command: switch to tracking (spectating) the player saved in favourite slot 8. If slot 8 is empty it reports "fav go: slot 8 is not defined"; if the saved player is no longer in the game it reports "fav go: slot 8 can't find player"; if you are already tracking that player it reports "fav go: already observing...". Favourite slots are populated by the corresponding fav add commands.

- NEW description:
  > Spectator command: switch to tracking the player saved in favourite slot 8. Reports an error if slot 8 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
  >
  > Set by: spectator (no arguments).

---

B5-RESULT | ktx:command:9fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with "stuffcmd", "cmd_t dispatcher", file:line refs and CD_* macro names | to-shape: D20-template

### ktx:command:9fav_go

- canonical_id: ktx:command:9fav_go
- prior length: 537
- new length: 253

- OLD description:
  > Spectator command: switch to tracking (spectating) the player saved in favourite slot 9. If slot 9 is empty it reports "fav go: slot 9 is not defined"; if the saved player is no longer in the game it reports "fav go: slot 9 can't find player"; if you are already tracking that player it reports "fav go: already observing...". Favourite slots are populated by the corresponding fav add commands.

- NEW description:
  > Spectator command: switch to tracking the player saved in favourite slot 9. Reports an error if slot 9 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
  >
  > Set by: spectator (no arguments).

---

B5-RESULT | ktx:cvar:k_fp_spec | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with source function names, file:line refs, and internal array/variable names | to-shape: D20-template

### ktx:cvar:k_fp_spec

- canonical_id: ktx:cvar:k_fp_spec
- prior length: 731
- new length: 382

- OLD description:
  > Selects the say/say_team flood-protection profile applied to spectators (the spectator counterpart of k_fp). The value picks one of three preset triples of (messages allowed, per N seconds, silence duration): 1 = up to 9 messages per 1 second then silenced 1 second; 2 = 4 per 1 second then silenced 5 seconds; 3 = 5 per 3 seconds then silenced 7 seconds. Out-of-range values are clamped to 1-3.

- NEW description:
  > Flood-protection profile for spectator chat (the spectator counterpart of k_fp). Selects one of three presets that limit how many messages a spectator can send before being silenced.
  >
  > 1 = up to 9 messages per second; silence 1 second.
  > 2 = up to 4 messages per second; silence 5 seconds.
  > 3 = up to 5 messages per 3 seconds; silence 7 seconds.
  >
  > Default: 3.
  > Set by: server config or 'fp_toggle' admin command in-game (cycles 1-3).

---

B5-RESULT | ktx:cvar:_k_last_cycle_map | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal function names, file:line refs, source commentary and code logic | to-shape: D20-template

### ktx:cvar:_k_last_cycle_map

- canonical_id: ktx:cvar:_k_last_cycle_map
- prior length: 758
- new length: 335

- OLD description:
  > Internal-state cvar (not set from config). Stores the 1-based map-cycle index of the most recently selected map cycle entry. When choosing the next map, KTX resumes the map cycle from this index so that if a vote jumped to a map that is not in the cycle, the cycle continues from where it left off rather than restarting. It is rewritten whenever the chosen next map is found within the cycle.

- NEW description:
  > Internal runtime state -- not for manual configuration. Stores the 1-based index of the most recently used map-cycle entry. When choosing the next map KTX reads this value to resume the cycle from where it left off, so a voted map that is outside the cycle does not restart the rotation from the beginning.
  >
  > Set by: server automatically at each map transition.

---

B5-RESULT | ktx:cvar:k_tot_mode | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence prose with macro names, file:line refs, and internal code references | to-shape: D20-template

### ktx:cvar:k_tot_mode

- canonical_id: ktx:cvar:k_tot_mode
- prior length: 538
- new length: 430

- OLD description:
  > Enables "Tribe of Tjernobyl" (ToT) mode. 0 = off; non-zero = on. Requires dmm4 (deathmatch mode 4). When enabled it alters dmm4 rules: the quad-damage multiplier becomes a configurable bot quad multiplier instead of the dmm4 octa (8x), and various item, health-cap and bot-weapon behaviors switch to their ToT variants. Mutually exclusive with midair and instagib (enabling ToT disables them).

- NEW description:
  > Toggle for Tribe of Tjernobyl (ToT) mode. Requires deathmatch mode 4. When enabled, alters dmm4 rules: replaces the standard octa (8x) quad-damage multiplier with a configurable bot quad multiplier, and switches item, health-cap, and bot-weapon rules to ToT variants. Mutually exclusive with midair and instagib (enabling ToT disables them).
  >
  > 0 = ToT mode off.
  > 1 = ToT mode on.
  >
  > Default: 0.
  > Set by: server config or 'totmode' admin command in-game.

---

B5-RESULT | ktx:command:pathlist:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal function names, source citations, and flag-data struct details | to-shape: D20-template

### ktx:command:pathlist:frogbot:editor

- canonical_id: ktx:command:pathlist:frogbot:editor
- prior length: 877
- new length: 341

- OLD description:
  > Frogbot route-editor subcommand (run via the bot command with editor mode enabled): lists every routing path across all markers whose path flags match a required flag-filter argument. For each match it prints the source and destination marker indices and their location names, followed by the total count of matching paths. With no flag argument it prints the list of valid path-flag options.

- NEW description:
  > Frogbot editor subcommand (requires bot editor mode). Lists all routing paths whose flags match the given flag-filter argument. Output shows the source and destination marker indices and their location names, followed by the total count of matching paths. Omitting the flag argument prints the list of valid flag-filter options instead.
  >
  > Usage: pathlist <flag>
  > Set by: server admin with editor mode enabled.

---

B5-RESULT | ktx:cvar:k_ip_list | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with check_perm case values and internal permission-tier labels | to-shape: D20-template

### ktx:cvar:k_ip_list

- canonical_id: ktx:cvar:k_ip_list
- prior length: 698
- new length: 396

- OLD description:
  > Permission level required to use the iplist command (which lists connected players' IP addresses). Uses KTX's standard permission tiers: 0 = no one may use it; 1 = real (password-authenticated) admin only; 2 = admin only; 5 = everyone; values 3 and 4 ('judges') are not implemented and behave as denied. When a player lacks the required level, iplist instead just prints that player's own IP.

- NEW description:
  > Permission level required to view all connected players' IP addresses via the iplist command. Players who do not meet the level can still run iplist but only see their own IP.
  >
  > 0 = no one (iplist always shows own-IP only).
  > 1 = real (password-authenticated) admin only.
  > 2 = any admin.
  > 5 = all players and spectators.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:freshguns | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence prose with internal cvar name, source function name, file:line refs | to-shape: D20-template

### ktx:command:freshguns

- canonical_id: ktx:command:freshguns
- prior length: 622
- new length: 310

- OLD description:
  > Toggles the FreshGuns rule (the k_freshteams_limit_sweep_ammo server cvar) on or off, which limits the ammo granted when picking up (sweeping) a weapon while playing FreshTeams. It flips the cvar between off (0) and on (1) and broadcasts the new state. FreshTeams must already be enabled (the /fresh command); it also refuses to run while a match is in progress or while race mode is active.

- NEW description:
  > Admin command: toggle the FreshGuns rule on or off. When on, picking up (sweeping) a weapon in FreshTeams mode grants limited ammo rather than the full load. Broadcasts the new state when toggled. Requires FreshTeams to be enabled first; blocked during a live match or in race mode.
  >
  > Set by: admin command '/freshguns' (outside of a live match).

---

B5-RESULT | ktx:command:weapon:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence prose with internal handler name, source function names, file:line refs, and "bots_enabled()" code reference | to-shape: D20-template

### ktx:command:weapon:frogbot:std

- canonical_id: ktx:command:weapon:frogbot:std
- prior length: 887
- new length: 342

- OLD description:
  > Frogbot sub-command (under botcmd/frogbot, standard non-editor command set): sets which weapon all bots should use. The argument is a weapon number from 1 to 8, or "random" / 0 to let bots choose freely; out-of-range numbers are clamped into the 1-8 range. Called with no argument it prints usage and the currently selected weapon. Refuses with a message if bots are disabled on the server.

- NEW description:
  > Frogbot command: set which weapon all bots should use. Takes a weapon number (1-8) or "random" / 0 to let bots choose freely; out-of-range values are clamped to 1-8. Called with no argument, prints usage and the currently selected weapon. Blocked if bots are disabled on the server.
  >
  > Usage: weapon <1-8 | random>
  > Set by: admin or bot commander.

---

B5-RESULT | ktx:command:goalinfo:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal field names, source line ranges, "G_sprint" code reference, and PRINT_HIGH jargon | to-shape: D20-template

### ktx:command:goalinfo:frogbot:editor

- canonical_id: ktx:command:goalinfo:frogbot:editor
- prior length: 821
- new length: 324

- OLD description:
  > Frogbot editor subcommand (botcmd goalinfo, available when bot editor mode is on). Prints the bot routing goal information for the marker the issuing player is currently touching: for each defined goal it shows the goal number, the traversal time, and the linked next marker's index and classname. If the player is not on a marker it prints nothing. Output goes to the issuing player only.

- NEW description:
  > Frogbot editor subcommand (requires bot editor mode). Prints routing goal information for the marker the issuing player is currently touching. For each goal it shows the goal number, the traversal time, and the linked next marker's index and classname. Prints nothing if the player is not standing on a marker. Output is private to the issuing player.
  >
  > Set by: admin with editor mode enabled (no arguments).

---

B5-RESULT | ktx:command:kuinfo | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence prose with source handler names, file:line refs, and internal userinfo implementation details | to-shape: D20-template

### ktx:command:kuinfo

- canonical_id: ktx:command:kuinfo
- prior length: 910
- new length: 339

- OLD description:
  > Prints another client's userinfo to the requesting client. Usage: kuinfo <id/name> [key]. Given only an id or name it lists all of that client's non-empty userinfo keys and their values; given an additional key it prints just that single key's value. Keys whose name begins with '*' (system keys) are never shown. With a missing or too-many argument count it prints a usage line instead.

- NEW description:
  > Prints a connected client's userinfo fields. Given a player ID or name, lists all non-empty userinfo keys and their values. Given an optional second argument (a key name), prints just that key's value. System keys (those beginning with '*') are always hidden. Prints a usage line if arguments are missing or too many.
  >
  > Usage: kuinfo <id/name> [key]
  > Set by: any player or spectator.

---

B5-RESULT | ktx:cvar:_k_captteam2 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with source function names, "stuffcmd" code reference, file:line refs, and dynamic cvar access notation | to-shape: D20-template

### ktx:cvar:_k_captteam2

- canonical_id: ktx:cvar:_k_captteam2
- prior length: 805
- new length: 310

- OLD description:
  > Internal mod-state cvar (not operator-tuned). During captain-based team picking, the server stores the second captain's team name here; when that captain picks a player, the picked player is force-set to this team, and (with k_captains = 2) a player picked by captain 2 is locked to this team and cannot change away from it. Holds runtime state set and consumed by the team-picking code.

- NEW description:
  > Internal runtime state -- not for manual configuration. During captain-based team picking, stores the second captain's team name. Players picked by captain 2 are force-assigned to this team and cannot switch away from it. Written and read by the team-picking system; not meaningful outside of an active captain session.
  >
  > Set by: server automatically during captain team selection.

---

B5-RESULT | ktx:cvar:_k_team1 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with source function names, file:line refs, and internal variable context | to-shape: D20-template

### ktx:cvar:_k_team1

- canonical_id: ktx:cvar:_k_team1
- prior length: 634
- new length: 305

- OLD description:
  > Internal store of the first participating team's name, captured at match start. The server records the two (or in three-team modes, three) competing team names when the scoreboard is prepared; this holds team 1's name and is read for scoreboard team labels, score attribution, and the match hostname decoration ('<host> (team1 vs. team2)'). String; set by the server, not for manual use.

- NEW description:
  > Internal runtime state -- not for manual configuration. Stores the first competing team's name, captured when the match scoreboard is prepared. Used for scoreboard labels, score attribution, and the server hostname decoration (e.g. 'host (team1 vs. team2)'). Sibling of _k_team2 and _k_team3.
  >
  > Set by: server automatically at match start.

---

B5-RESULT | ktx:command:iplist | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal function name, permission-check variable name, and source file:line detail | to-shape: D20-template

### ktx:command:iplist

- canonical_id: ktx:command:iplist
- prior length: 596
- new length: 303

- OLD description:
  > Prints client IP addresses. If the caller passes the k_ip_list permission check, lists every connected player and then every spectator as "<IP> <A-if-admin> <name>" under "IPs list players:" / "IPs list spectators:" headers; otherwise the caller is shown only their own IP ("Your IP is: <ip>"). Output is sent privately to the caller. Available to both players and spectators (CF_BOTH).

- NEW description:
  > Prints IP addresses for connected clients. If the caller has the required permission (set by k_ip_list), lists all players and spectators with their IP, an 'A' marker if admin, and their name. If the caller lacks permission, prints only their own IP. Output is private to the caller. Available to both players and spectators.
  >
  > Set by: any player or spectator (output depends on k_ip_list permission level).

---
