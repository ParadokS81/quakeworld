# B5 format-unify ledger -- batch 17

**Batch:** 17 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:cvar:_k_captteam1 | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and mechanism detail | to-shape: D20-template

### ktx:cvar:_k_captteam1

- canonical_id: ktx:cvar:_k_captteam1
- prior length: 1108
- new length: 251

- OLD description:
  > Internal mod-state cvar (not operator-tuned). During captain-based team picking, the server stores the first captain's team name here; when that captain picks a player, the picked player is force-set to this team, and (with k_captains = 2) a player picked by captain 1 is locked to this team and cannot change away from it. Holds runtime state set and consumed by the team-picking code.

- NEW description:
  > Internal mod-state cvar. Stores the first captain's team name during captain-based team picking. Not operator-tuned; set and consumed automatically by the team-picking code.
  >
  > Default: "" (empty -- reset between captain sessions).
  > Set by: server runtime only (not intended for server config).

---

B5-RESULT | ktx:command:+scores | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and mechanism detail | to-shape: D20-template

### ktx:command:+scores

- canonical_id: ktx:command:+scores
- prior length: 1007
- new length: 387

- OLD description:
  > Press-and-hold bind: while held it shows a centerprint overlay of the current match time and team scores to the calling client, refreshed periodically (CTF mode also shows flag status); the paired -scores hides it on release. The overlay is suppressed during the pre-game/countdown state and in race mode. If a spectator is tracking no one it instead shows 'Tracking no one (+scores)'.

- NEW description:
  > Press-and-hold bind that displays a centered overlay of the current match time and team scores. While held the overlay refreshes periodically; releasing the key (-scores) hides it. CTF mode also shows flag status. Suppressed during the pre-game/countdown phase and in race mode. Spectators tracking no one see 'Tracking no one (+scores)' instead.
  >
  > Set by: client bind (use with -scores for press/release pair).

---

B5-RESULT | ktx:command:who | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and match-state guard detail | to-shape: D20-template

### ktx:command:who

- canonical_id: ktx:command:who
- prior length: 1025
- new length: 294

- OLD description:
  > Prints the current player list to the caller: one line per connected player showing a ready/not-ready marker, an admin marker, the player's team tag (in team modes), and the player's name, with the caller's own entry tagged. Prints "no players" if none are connected. Does nothing useful during a live match -- it prints "Game in progress" and shows no list while a match is running.

- NEW description:
  > Prints the connected player list to the caller. Each line shows a ready/not-ready marker, an admin marker, the player's team tag (in team modes), and the player's name; the caller's own entry is tagged. Prints "no players" if none are connected. Unavailable during a live match ("Game in progress").
  >
  > Set by: any player or spectator (no arguments).

---

B5-RESULT | ktx:cvar:_k_last_xonx | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and index-encoding detail | to-shape: D20-template

### ktx:cvar:_k_last_xonx

- canonical_id: ktx:cvar:_k_last_xonx
- prior length: 934
- new length: 280

- OLD description:
  > Internal store of the last-applied XonX usermode (game mode such as 1on1 / 2on2 / 4on4 / ffa / ctf), held as the usermode index plus one (0 = no mode remembered / reset). It is set whenever a usermode command runs, and on the next map spawn the server auto-reapplies that mode -- re-executing the mode's configs -- if a different map was loaded. Integer; 0 means no remembered mode.

- NEW description:
  > Internal mod-state cvar. Stores the last-applied XonX game mode (1on1 / 2on2 / 4on4 / ffa / ctf) so the server can auto-reapply it on map change. Not operator-tuned.
  >
  > 0 = no mode remembered (reset).
  > Non-zero = a mode is remembered and will be re-applied on next map load.
  >
  > Default: 0.
  > Set by: server runtime only (not intended for server config).

---

B5-RESULT | ktx:command:victim | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and stuffcmd detail | to-shape: D20-template

### ktx:command:victim

- canonical_id: ktx:command:victim
- prior length: 916
- new length: 305

- OLD description:
  > Sends a quick chat message addressed to the player the caller most recently fragged (the caller's last victim's name). The engine stuffs a say command containing that name, optionally wrapped with the caller's "premsg" and "postmsg" userinfo strings as prefix/suffix. Does nothing if no matching connected client is found. Player-only command, usable outside a match, no arguments.

- NEW description:
  > Sends a say message to the player the caller most recently fragged, addressed by name. The message is optionally wrapped with the caller's "premsg" / "postmsg" userinfo strings as prefix and suffix. Does nothing if no matching connected client is found. Usable outside a match.
  >
  > Set by: any player (no arguments; see also: 'killer' command for the inverse).

---

B5-RESULT | ktx:cvar:k_race_match_rounds | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and RACE_MIN/MAX define detail | to-shape: D20-template

### ktx:cvar:k_race_match_rounds

- canonical_id: ktx:cvar:k_race_match_rounds
- prior length: 813
- new length: 298

- OLD description:
  > Number of rounds in a race match. The value is read at race setup and clamped to the range 3-21 (values below 3 become 3, above 21 become 21) to set the match's total round count. The scoreboard shows progress as 'round: <current>/<this value>' and the match ends when the configured number of rounds has been played. Has effect only when race match mode (k_race_match) is enabled.

- NEW description:
  > Number of rounds in a race match. The scoreboard shows 'round: N/<this value>' and the match ends when the configured round count is reached.
  >
  > Range: 3-21 (clamped; values below 3 become 3, above 21 become 21).
  >
  > Default: see server config (only effective when k_race_match is enabled).
  > Set by: server config.

---

B5-RESULT | ktx:command:maps | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and loop/filter detail | to-shape: D20-template

### ktx:command:maps

- canonical_id: ktx:command:maps
- prior length: 769
- new length: 274

- OLD description:
  > Prints the list of custom maps available on the server (the in-memory mapslist) to the caller, along with instructions to vote for a map by typing its name or using 'votemap <map>'. An optional argument filters the list to map names containing that substring. The output ends with a '(shown/total maps)' count. Read-only; it lists and explains voting, it does not change the map.

- NEW description:
  > Prints the custom map list available on the server, with instructions for voting ('votemap <map>' or type the map name). An optional argument filters the list to maps containing that substring. Output ends with a '(shown/total maps)' count. Read-only.
  >
  > Set by: any player ('maps' or 'maps <filter>').

---

B5-RESULT | ktx:cvar:k_lockmap | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and empty-server reload detail | to-shape: D20-template

### ktx:cvar:k_lockmap

- canonical_id: ktx:cvar:k_lockmap
- prior length: 1497
- new length: 332

- OLD description:
  > When set to 1, the current map is locked: non-admin players are blocked from changing it through the map vote (they get a "MAP IS LOCKED!" message), and the automatic reload-to-default-map that normally fires when the server empties or holds only bots is suppressed so the locked map stays loaded. 0 = map not locked, 1 = map locked. The lockmap admin command toggles this value.

- NEW description:
  > Locks the current map. When locked, non-admin players cannot change the map via vote ("MAP IS LOCKED!"), and the automatic reload-to-default-map that fires when the server empties or holds only bots is suppressed.
  >
  > 0 = map not locked.
  > 1 = map locked.
  >
  > Default: 0.
  > Set by: server config or 'lockmap' admin command in-game (toggles 0/1).

---

B5-RESULT | ktx:command:trx_stop | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and mv_stop_record/mv_stop_playback detail | to-shape: D20-template

### ktx:command:trx_stop

- canonical_id: ktx:command:trx_stop
- prior length: 1403
- new length: 275

- OLD description:
  > Stops the calling player's in-memory trick-demo recording and any in-progress trick-demo playback for that player. If a recording was running it is ended (the captured-frame buffer is kept); if a playback was running its temporary playback entity is removed and "playback finished" is printed. Has no effect if the player had neither active. Player-issued command, no arguments.

- NEW description:
  > Stops the calling player's in-memory trick-demo recording and any active trick-demo playback. If a recording was running it is ended (the captured buffer is kept). If a playback was running it is removed and "playback finished" is printed. No effect if neither was active.
  >
  > Set by: any player (no arguments; see also: 'trx_rec', 'trx_play').

---

B5-RESULT | ktx:cvar:k_fp | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and say_fp_levels[] array detail | to-shape: D20-template

### ktx:cvar:k_fp

- canonical_id: ktx:cvar:k_fp
- prior length: 887
- new length: 346

- OLD description:
  > Selects the say/say_team flood-protection profile applied to players. The value picks one of three preset triples of (messages allowed, per N seconds, silence duration): 1 = up to 9 messages per 1 second then silenced 1 second (Low); 2 = 4 per 1 second then silenced 5 seconds (Medium); 3 = 5 per 3 seconds then silenced 7 seconds (High). Out-of-range values are clamped to 1-3.

- NEW description:
  > Selects the say/say_team flood-protection profile for players. Exceeding the message rate silences the player for the configured duration.
  >
  > 1 = Low: up to 9 messages per 1 second, silenced 1 second.
  > 2 = Medium: 4 per 1 second, silenced 5 seconds.
  > 3 = High: 5 per 3 seconds, silenced 7 seconds.
  >
  > Default: 1. Out-of-range values are clamped to 1-3.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_cmd_fp_disabled | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and isCmdFlood detail | to-shape: D20-template

### ktx:cvar:k_cmd_fp_disabled

- canonical_id: ktx:cvar:k_cmd_fp_disabled
- prior length: 717
- new length: 330

- OLD description:
  > Master switch for command flood protection. 0 = command flood protection is active (clients exceeding the command rate are warned, locked out, and optionally kicked). 1 = command flood protection is entirely disabled (no command-rate tracking, no warnings, no kicks). Clamped to 0 or 1. This affects only command flooding; say/chat flood protection (k_fp) is a separate system.

- NEW description:
  > Master switch for command flood protection. Affects only command-rate flooding; say/chat flood protection is a separate system (k_fp).
  >
  > 0 = command flood protection active (clients exceeding the command rate are warned, locked out, and optionally kicked).
  > 1 = command flood protection disabled (no tracking, no warnings, no kicks).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_instagib_custom_models | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and precache/model path detail | to-shape: D20-template

### ktx:cvar:k_instagib_custom_models

- canonical_id: ktx:cvar:k_instagib_custom_models
- prior length: 995
- new length: 321

- OLD description:
  > When 1, KTX precaches and uses the custom instagib coilgun assets (the progs/v_coil.mdl view model, the progs/w_coil.mdl vwep model, and the weapons/coilgun.wav sound) for instagib mode; the models are precached at map load even if instagib is not yet active, and the instagib mode messages report 'coilgun mode'. When 0, instagib reuses default weapon models. 0 = no, 1 = yes.

- NEW description:
  > Enables custom coilgun assets for instagib mode. When enabled, KTX uses a custom view model, vwep model, and sound instead of the default weapon models, and instagib mode messages report 'coilgun mode'. Assets are precached at map load even if instagib is not yet active.
  >
  > 0 = use default weapon models.
  > 1 = use custom coilgun assets.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:swapall | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and SwapAll vote-toggle detail | to-shape: D20-template

### ktx:command:swapall

- canonical_id: ktx:command:swapall
- prior length: 1282
- new length: 340

- OLD description:
  > Casts (or withdraws) the calling player's vote to swap every player to the opposing team. CTF-only and unavailable while a match is in progress, and refused while captain or coach team-picking is active. Each call toggles the player's swapall vote and broadcasts the vote (with the running count); once enough players have voted, all players are swapped between the two teams.

- NEW description:
  > Casts or withdraws the calling player's vote to swap all players to opposing teams. Once enough players vote, all players are swapped between the two teams. Each call toggles the caller's vote and broadcasts the running tally. CTF-only; unavailable during a live match or while captain/coach team-picking is active.
  >
  > Set by: any CTF player (no arguments).

---

B5-RESULT | ktx:cvar:k_maxspectators | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and ChangeClientsCount type-2 detail | to-shape: D20-template

### ktx:cvar:k_maxspectators

- canonical_id: ktx:cvar:k_maxspectators
- prior length: 737
- new length: 310

- OLD description:
  > The upper limit for the engine's spectator slot count (maxspectators) when it is adjusted in-game via the spectator-count up/down controls. While no match is in progress, the spectator-count command raises or lowers maxspectators but never above k_maxspectators; once maxspectators reaches k_maxspectators the operator is told the limit is reached. Counted in spectator slots.

- NEW description:
  > Sets the upper limit for spectator slots (maxspectators) when adjusted in-game via the spectator-count up/down controls. While no match is in progress, maxspectators can be raised or lowered but never above this value. Has no effect during a live match.
  >
  > Range: 1 and above (spectator slots).
  >
  > Default: see server config.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_times_per_port | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and filename-format detail | to-shape: D20-template

### ktx:cvar:k_race_times_per_port

- canonical_id: ktx:cvar:k_race_times_per_port
- prior length: 642
- new length: 329

- OLD description:
  > In race mode, controls whether saved race-time record files are kept separately per server UDP port. When 0, the race record filename omits the port, so multiple server instances sharing a gamedir read and write the same record file. When non-zero, the server's listen port is embedded in the race record filename, giving each port its own independent set of saved race times.

- NEW description:
  > Controls whether race-time record files are stored separately per server UDP port. Relevant when multiple server instances share the same gamedir.
  >
  > 0 = shared record files (all instances on the same gamedir use the same race records).
  > 1 = per-port record files (each port gets its own independent set of saved race times).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:zonesummary:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and dispatcher/admin-gate detail | to-shape: D20-template

### ktx:command:zonesummary:frogbot:editor

- canonical_id: ktx:command:zonesummary:frogbot:editor
- prior length: 1495
- new length: 270

- OLD description:
  > Frogbot waypoint-editor sub-command (available only when the frogbot editor mode is enabled, subject to the frogbot admin-only setting). Prints a "Zone summary:" report to the calling player that lists, for each zone number on the current map, every route marker assigned to that zone (marker index and classname). Read-only diagnostic; it does not modify any waypoint data.

- NEW description:
  > Frogbot waypoint-editor command. Prints a 'Zone summary:' report listing, for each zone on the current map, every route marker assigned to it (marker index and classname). Read-only; does not modify waypoint data. Available only when frogbot editor mode is enabled (subject to the frogbot admin-only setting).
  >
  > Set by: frogbot editor (no arguments).

---

B5-RESULT | ktx:cvar:k_vp_hookstyle | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and OV_HOOK* case detail | to-shape: D20-template

### ktx:cvar:k_vp_hookstyle

- canonical_id: ktx:cvar:k_vp_hookstyle
- prior length: 847
- new length: 327

- OLD description:
  > The percentage of eligible voters required to pass a grappling-hook-style vote in CTF (the /hookstyle command, which switches the hook behavior, e.g. smooth / fast / classic). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)).

- NEW description:
  > Percentage of eligible voters required to pass a grappling-hook-style change vote in CTF (smooth / fast / classic). The required vote count is calculated as ceil(percent/100 * eligible players).
  >
  > Range: 51-100 (values below 51 are treated as 51; values above 100 are capped at 100).
  >
  > Default: 51.
  > Set by: server config.

---

B5-RESULT | ktx:command:freshpacks | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and cvar_toggle_msg/precondition detail | to-shape: D20-template

### ktx:command:freshpacks

- canonical_id: ktx:command:freshpacks
- prior length: 1212
- new length: 324

- OLD description:
  > Toggles the FreshPacks rule (the k_freshteams_limit_packs server cvar) on or off, which limits the ammo carried in dropped backpacks while playing FreshTeams. It flips the cvar between off (0) and on (1) and broadcasts the new state. FreshTeams must already be enabled (the /fresh command); it also refuses to run while a match is in progress or while race mode is active.

- NEW description:
  > Toggles the FreshPacks rule on or off. When enabled, dropped backpacks contain limited ammo (the FreshTeams ammo-limit policy). Broadcasts the new state. Requires FreshTeams to already be enabled (/fresh); unavailable during a live match or in race mode.
  >
  > Set by: admin command 'freshpacks' (toggles k_freshteams_limit_packs between 0 and 1).

---

B5-RESULT | ktx:command:mkick | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and argc/only_digits/DoKick detail | to-shape: D20-template

### ktx:command:mkick

- canonical_id: ktx:command:mkick
- prior length: 727
- new length: 298

- OLD description:
  > Admin-only command that immediately kicks one or more clients identified by their numeric user IDs in a single call: 'mkick <id1 [id2 [id3 ...]] [reason]>'. Any trailing non-numeric argument after the IDs is broadcast to everyone as the kick reason. Unknown IDs are reported ('mkick: client <id> not found') and skipped. Non-admins are refused with 'You are not an admin'.

- NEW description:
  > Admin-only command that kicks one or more clients by numeric user ID in a single call. Syntax: 'mkick <id1 [id2 [id3 ...]] [reason]>'. Any trailing non-numeric argument is broadcast as the kick reason. Unknown IDs are reported and skipped. Non-admins are refused.
  >
  > Set by: admin command 'mkick'.

---

B5-RESULT | ktx:command:ksound1 | FORMAT-UNIFIED | rev=1 | from-shape: long synthesized prose with file:line refs and stuffcmd/KF_KTSOUNDS/k_sdir detail | to-shape: D20-template

### ktx:command:ksound1

- canonical_id: ktx:command:ksound1
- prior length: 988
- new length: 304

- OLD description:
  > Sends team audio cue 1 (plays ktsound1.wav) to your same-team players. The server stuffs a 'play' of ktsound1.wav into the console of every other client on your team who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key) and a non-empty name; each recipient's file path honours their own k_sdir sound-directory setting. Only active in team or CTF games.

- NEW description:
  > Plays team audio cue 1 (ktsound1.wav) for teammates who have KT sounds enabled. Each recipient's sound is played from their configured sound directory (k_sdir). Only active in team or CTF games. No effect on players with KT sounds disabled.
  >
  > Set by: any team player (no arguments; see also: 'ksound2', 'ksound3' for other cues).

---
