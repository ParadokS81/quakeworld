# B5 format-unify ledger -- batch 15

**Batch:** 15 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:4fav_go | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no enum/default/set-by | to-shape: D20-template

### ktx:command:4fav_go

- canonical_id: `ktx:command:4fav_go`
- prior length: 418
- new length: 286

- OLD description:
  > Spectator command: switches your point of view to track the player stored in favorites slot 4 of your personal favorites list (the slot set by fav4_add). If slot 4 is empty it prints "fav go: slot 4 is not defined"; if the stored player is no longer in the game it prints "can't find player"; if you are already tracking that player it does nothing. There are parallel commands 1fav_go through 20fav_go for slots 1-20.

- NEW description:
  > Spectator command: switch your view to track the player saved in favorites slot 4 (set via fav4_add). Prints an error if the slot is empty or the player has left; does nothing if already tracking them. Parallel commands 1fav_go through 20fav_go cover all 20 slots.
  >
  > Set by: spectator command.

---

B5-RESULT | ktx:command:pathinfo:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:pathinfo:frogbot:editor

- canonical_id: `ktx:command:pathinfo:frogbot:editor`
- prior length: 416
- new length: 337

- OLD description:
  > Frogbot route-editor subcommand (run via the bot command with editor mode enabled): prints the routing paths to and from a marker. By default it uses the marker the player is touching or nearest; an optional marker number selects a specific marker. "Paths away" lists each outgoing path's destination marker index, classname, path flags, and angle hint; "Path to" lists the markers whose paths lead into this marker.

- NEW description:
  > Frogbot route-editor command (requires editor mode): prints the routing paths to and from a waypoint marker. Uses the marker the player is touching or nearest; an optional marker number overrides the selection. "Paths away" shows each outgoing path's destination index, classname, path flags, and angle hint; "Path to" lists all markers whose paths lead into this one.
  >
  > Set by: bot editor command (requires Frogbot editor mode enabled).

---

B5-RESULT | ktx:cvar:k_lockmode | FORMAT-UNIFIED | rev=1 | from-shape: inline-enum prose no default/set-by | to-shape: D20-template

### ktx:cvar:k_lockmode

- canonical_id: `ktx:cvar:k_lockmode`
- prior length: 416
- new length: 368

- OLD description:
  > Controls whether players may join while a match is in progress. 0 = server not locked (players may join freely; no ghost tracking). 1 = team-locked: only players belonging to an already-existing team may rejoin (tracked via ghosts); new players are kept out. 2 = fully locked: no players may join during the match -- they are told to reconnect as spectators. The in-game status display labels these off / team / all.

- NEW description:
  > Controls whether new player joins are allowed during a live match.
  >
  > 0 = unlocked -- anyone may join (no ghost tracking).
  > 1 = team-locked -- only players already on an existing team may rejoin (ghost tracking active); new players are blocked.
  > 2 = fully locked -- no players may join; they are told to reconnect as spectators.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:s-m | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:s-m

- canonical_id: `ktx:command:s-m`
- prior length: 415
- new length: 303

- OLD description:
  > Sends a private text message to every player currently in your configured 'multi' recipient set (the set you build with the multi command). Usage: s-m <text>. Recipients see the message tagged with the multi-set number; you are excluded from your own send, and if no one in your set is currently connected it reports that no clients were found. During a match the message will not cross the player/spectator divide.

- NEW description:
  > Send a private text message to every player in your configured multi recipient set (built with the multi command). Usage: s-m <text>. Recipients see the message tagged with the set number. You are not included in your own send; if no recipients are connected it reports "no clients found". During a match the message does not cross the player/spectator divide.
  >
  > Set by: player command.

---

B5-RESULT | ktx:command:multi | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:multi

- canonical_id: `ktx:command:multi`
- prior length: 413
- new length: 333

- OLD description:
  > Edits or prints this client's 'multi' recipient set -- the custom group of players targeted by multi-message mode (stored as the '*mu' userinfo bitmask). 'multi = name1 name2 ...' replaces the set with the named players, 'multi + ...' adds them, 'multi - ...' removes them, 'multi ?' prints the current set, and 'multi ?? <n>' prints the set encoded by the numeric value n. Players are given by client id or name.

- NEW description:
  > Edit or print your multi recipient set -- the custom group of players targeted by the s-m private message command.
  >
  > multi = name1 name2 ... = replace the set with the named players.
  > multi + name1 ...       = add players to the set.
  > multi - name1 ...       = remove players from the set.
  > multi ?                 = print the current set.
  > multi ?? <n>            = print the set encoded by the numeric value n.
  >
  > Players are identified by client id or name.
  > Set by: player command.

---

B5-RESULT | ktx:cvar:k_cg_kb | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/nonzero no default/set-by | to-shape: D20-template

### ktx:cvar:k_cg_kb

- canonical_id: `ktx:cvar:k_cg_kb`
- prior length: 411
- new length: 362

- OLD description:
  > When set (nonzero), the Instagib coilgun spawns an additional invisible kickback projectile alongside the instant hitscan bullet; on impact that projectile delivers rocket-launcher-style radius damage and knockback at the hit point, giving the coilgun rocket-jump / push capability. When 0, no kickback projectile is spawned (pure hitscan, no recoil push). Only effective while Instagib (k_instagib) is enabled.

- NEW description:
  > Toggle for coilgun kickback in Instagib mode. When enabled, each coilgun shot spawns an invisible projectile that delivers rocket-launcher-style splash damage and knockback on impact, giving the coilgun rocket-jump and push capability. Only active while k_instagib is enabled.
  >
  > 0 = no kickback (pure hitscan, no push).
  > 1 = kickback projectile spawned on each shot.
  >
  > Default: 1.
  > Set by: server config or 'cg_kb' admin command in-game.

---

B5-RESULT | ktx:command:downspecs | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:downspecs

- canonical_id: `ktx:command:downspecs`
- prior length: 409
- new length: 323

- OLD description:
  > Admin command that lowers the server's spectator slot count: decrements the maxspectators cvar by 1 each time it is run. The new value is clamped to the range 1..k_maxspectators. Refused while a match is in progress and gated by the k_allowcountchange permission level; when it changes the count it broadcasts the new maxspectators value to everyone on the server. (Spectator-slot counterpart of downplayers.)

- NEW description:
  > Decrements the server's spectator slot count (maxspectators) by 1. The result is clamped to the range 1 to k_maxspectators. Refused while a match is in progress. Requires the k_allowcountchange permission level. Broadcasts the new spectator count when changed. Spectator-slot counterpart of downplayers.
  >
  > Set by: admin command (permission level set by k_allowcountchange).

---

B5-RESULT | ktx:cvar:k_race_custom_models | FORMAT-UNIFIED | rev=1 | from-shape: prose with repeated inline 0/nonzero no default/set-by | to-shape: D20-template

### ktx:cvar:k_race_custom_models

- canonical_id: `ktx:cvar:k_race_custom_models`
- prior length: 409
- new length: 320

- OLD description:
  > Controls whether race checkpoint markers use dedicated custom models. When non-zero the server precaches and uses progs/start.mdl, progs/check.mdl and progs/finish.mdl for the start, checkpoint and finish markers respectively; when 0 those custom models are neither precached nor used (the default node models are used instead). 0 = use default checkpoint models, non-zero = use custom race checkpoint models.

- NEW description:
  > Controls whether race checkpoint markers use dedicated custom models (progs/start.mdl, progs/check.mdl, progs/finish.mdl) for the start, checkpoint, and finish positions respectively.
  >
  > 0 = use default node models for race markers.
  > 1 = precache and use custom race marker models.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_no_fps_physics | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/1 enum no default/set-by | to-shape: D20-template

### ktx:cvar:k_no_fps_physics

- canonical_id: `ktx:cvar:k_no_fps_physics`
- prior length: 408
- new length: 332

- OLD description:
  > When on, disables the framerate-dependent jump-height adjustment. Normally the upward velocity of a jump is scaled by a multiplier that varies with the client's frame time (so different framerates jump slightly differently); with this set the multiplier is forced to 1, giving the same jump height regardless of framerate. 0 = off (framerate-dependent jump scaling active), 1 = on (jump scaling neutralized).

- NEW description:
  > Toggle for framerate-independent jump height. When enabled, the jump-velocity multiplier is forced to 1 so all clients jump to the same height regardless of framerate. When disabled, jump height varies slightly with the client's frame time.
  >
  > 0 = framerate-dependent jump scaling active.
  > 1 = jump height equalised across all framerates.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_tp_tele_death | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/1 and jargon (dtTELE1) no default/set-by | to-shape: D20-template

### ktx:cvar:k_tp_tele_death

- canonical_id: `ktx:cvar:k_tp_tele_death`
- prior length: 408
- new length: 310

- OLD description:
  > Controls whether a team telefrag (a teammate killed by being telefragged, deathtype dtTELE1) costs the attacker a frag. When 0, telefragging a teammate does NOT deduct a frag from the attacker; when 1, a team telefrag is penalized like any other teamkill (the attacker loses 1 frag and the kill is logged as a suicide). Treated as a boolean (any value is clamped to 0 or 1). The /teleteam command toggles it.

- NEW description:
  > Toggle for whether team telefrags are penalized as teamkills. When enabled, telefragging a teammate costs the attacker 1 frag (logged as a suicide), matching the penalty for any other teamkill. When disabled, team telefrags carry no frag penalty.
  >
  > 0 = team telefrag not penalized.
  > 1 = team telefrag costs attacker 1 frag.
  >
  > Default: 0.
  > Set by: server config or 'teleteam' admin command in-game.

---

B5-RESULT | ktx:command:ra_break | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:ra_break

- canonical_id: `ktx:command:ra_break`
- prior length: 406
- new length: 307

- OLD description:
  > Rocket Arena command: toggles the calling player's position in the arena waiting queue. If the player is currently in the queue, it takes them out and grants up to a 5-minute break (their idle timeout is extended); running it again puts them back into the queue. The command is ignored unless Rocket Arena mode is active and the caller is neither the current round's winner nor a loser awaiting their turn.

- NEW description:
  > Rocket Arena command: toggle your position in the arena waiting queue. If you are in the queue, removes you and grants a 5-minute break (idle timeout extended). Running it again re-enters you into the queue. Only works in Rocket Arena mode; ignored if you are the current round's winner or a loser awaiting your turn.
  >
  > Set by: player command (Rocket Arena mode only).

---

B5-RESULT | ktx:command:savemarker:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:savemarker:frogbot:editor

- canonical_id: `ktx:command:savemarker:frogbot:editor`
- prior length: 406
- new length: 340

- OLD description:
  > Bot waypoint-editor command: selects the routing marker nearest the editing player and stores it as the active 'saved marker' (the anchor used by subsequent path-editing commands), printing the marker's number and class. Invoking it again while standing at the same saved position cycles to the next nearby marker; invoking it after moving away clears the saved marker and restores the last touched marker.

- NEW description:
  > Bot waypoint-editor command: select the nearest routing marker and save it as the active anchor for subsequent path-editing commands. Prints the marker's number and class. Running it again while standing at the same position cycles to the next nearby marker. Moving away before running it again clears the saved marker and restores the last touched marker.
  >
  > Set by: bot editor command (requires Frogbot editor mode enabled).

---

B5-RESULT | ktx:command:antilag | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:antilag

- canonical_id: `ktx:command:antilag`
- prior length: 403
- new length: 343

- OLD description:
  > Casts or withdraws the issuing player's vote to toggle the server's antilag (lag-compensation) mode; when enough players vote (or an admin votes, acting as a veto), sv_antilag is flipped between 0 (off) and 2 (on) and the new state is announced. An admin gets the toggle alone. With fewer than 2 players a non-admin cannot start it. While a match is in progress it only reports the current antilag mode.

- NEW description:
  > Cast or withdraw your vote to toggle the server's lag-compensation (antilag) mode. When enough players vote, or an admin votes alone, antilag is toggled on or off and the new state is announced. Non-admins cannot start a vote with fewer than 2 players on the server. During a match the command only reports the current antilag state instead of casting a vote.
  >
  > Set by: player vote command or admin command.

---

B5-RESULT | ktx:command:gren_mode | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:gren_mode

- canonical_id: `ktx:command:gren_mode`
- prior length: 402
- new length: 348

- OLD description:
  > Toggles grenade mode (the k_dmm4_gren_mode server cvar) on or off. It flips the cvar between off (0) and on (1) and broadcasts the new state; when turned on it also restricts the allowed weapons to the grenade launcher only (clears every other weapon from k_disallow_weapons' allowed set). It requires dmm4 (deathmatch == 4) to run and refuses while a match is in progress or while race mode is active.

- NEW description:
  > Admin command: toggle grenade mode for dmm4 (flips the k_dmm4_gren_mode cvar). When enabled, only the grenade launcher is available; all other weapons are disallowed. Broadcasts the new state when changed. Requires dmm4 to be active; refused during a live match or while race mode is running.
  >
  > See also: k_dmm4_gren_mode (the underlying cvar).
  > Set by: admin command 'gren_mode' in-game (dmm4 only, outside a live match).

---

B5-RESULT | ktx:command:votemap | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:votemap

- canonical_id: `ktx:command:votemap`
- prior length: 402
- new length: 296

- OLD description:
  > Initiates a direct map change to the map named in the argument, if that map exists in the server's map list. Takes one argument (the map name); with no argument it prints a usage line, and if the named map is not on the server it prints "Map '<name>' not available on this server". When the map is found the level switch is performed immediately. Usable by players and spectators, no match restriction.

- NEW description:
  > Switch to a named map immediately, if it exists in the server's map list. Usage: votemap <mapname>. Prints a usage line if no argument is given; prints "Map '<name>' not available on this server" if the map is not found. Usable by players and spectators, with no match restriction.
  >
  > Set by: player or spectator command.

---

B5-RESULT | ktx:cvar:k_allowcountchange | FORMAT-UNIFIED | rev=1 | from-shape: prose enum embedded in sentence no default/set-by | to-shape: D20-template

### ktx:cvar:k_allowcountchange

- canonical_id: `ktx:cvar:k_allowcountchange`
- prior length: 400
- new length: 368

- OLD description:
  > Permission tier governing who may change the player and spectator slot counts (the count-up / count-down commands), and only outside a running match. The value is a permission level, not a boolean: 0 = no one may change the count; 1 = real admin only; 2 = admin; 3 and 4 = judges (not implemented in this mode, treated as denied); 5 = anyone. Any change is also rejected while a match is in progress.

- NEW description:
  > Permission tier controlling who may run the player/spectator count change commands (upplayers, downplayers, upspecs, downspecs). Always refused during a live match regardless of this setting.
  >
  > 0 = no one may change slot counts.
  > 1 = real admin only.
  > 2 = admin.
  > 3 = denied (judge role not implemented in this mode).
  > 4 = denied (judge role not implemented in this mode).
  > 5 = anyone.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:moreinfo | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:moreinfo

- canonical_id: `ktx:command:moreinfo`
- prior length: 399
- new length: 310

- OLD description:
  > Spectator command that cycles this spectator's extra-info detail level (the 'mi' userinfo, 0..N wrapping). Each level controls how much live item/powerup pickup information the spectator is fed during play -- from off, through powerups/armors/mega/RL, up to all weapons. If the server has spectator info disabled (k_spec_info), it instead prints 'Spec info is turned off by server' and does nothing.

- NEW description:
  > Spectator command: cycle your extra-info detail level, controlling how much live item and powerup pickup information you receive during play. Levels progress from off, through powerups/armors/mega/RL, up to all weapons, then wrap back to off. If the server has spectator info disabled (k_spec_info), prints 'Spec info is turned off by server' and does nothing.
  >
  > Set by: spectator command.

---

B5-RESULT | ktx:command:race_countdown_down | FORMAT-UNIFIED | rev=1 | from-shape: long-prose no set-by | to-shape: D20-template

### ktx:command:race_countdown_down

- canonical_id: `ktx:command:race_countdown_down`
- prior length: 398
- new length: 319

- OLD description:
  > Decreases the race start countdown length by 1 second (writes the k_race_countdown cvar). The new length is only accepted while it stays in the range 1-5 seconds (strictly greater than 0 and less than 6); otherwise the value is left unchanged and the current countdown length is reported. The command is ignored unless race mode is active, no match is in progress, and the race has not yet started.

- NEW description:
  > Decrease the race start countdown length by 1 second (adjusts k_race_countdown). The change is only accepted if the result stays in the range 1-5 seconds; otherwise the current value is reported unchanged. Ignored unless race mode is active, no match is in progress, and the race has not yet started.
  >
  > Range: 1-5 seconds (k_race_countdown).
  > Set by: admin command 'race_countdown_down' (race mode, pre-start only).

---

B5-RESULT | ktx:cvar:_k_host | FORMAT-UNIFIED | rev=1 | from-shape: prose internal-state cvar no default/set-by | to-shape: D20-template

### ktx:cvar:_k_host

- canonical_id: `ktx:cvar:_k_host`
- prior length: 398
- new length: 307

- OLD description:
  > Internal-state cvar (not set from config). At match start KTX copies the current value of the server's hostname cvar into _k_host; while a match is in progress the saved value is emitted into the XML extra-log as the match's <hostname> field; at match end, if _k_host is non-empty, the server's hostname is restored from it. Used so a temporary in-match hostname change is logged and then reverted.

- NEW description:
  > Internal-state cvar set by KTX at runtime -- not intended for manual configuration. At match start the current server hostname is saved here; during the match it is written into the XML match log as the hostname field; at match end the server hostname is restored from it. Allows a temporary in-match hostname change to be logged and then automatically reverted.
  >
  > Default: (empty -- set by KTX at match start).
  > Set by: KTX internal (runtime only; not set from server config).

---

B5-RESULT | ktx:cvar:_k_nospecs | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/nonzero no default/set-by | to-shape: D20-template

### ktx:cvar:_k_nospecs

- canonical_id: `ktx:cvar:_k_nospecs`
- prior length: 398
- new length: 364

- OLD description:
  > No-spectators mode toggle. 0 = spectators may connect normally; non-zero = incoming spectator connections are refused (except whitelisted VIP spectators and coaches), and a coach who is demoted while this is active is disconnected. Toggled by the nospecs admin/vote action; the server also clears it to 0 automatically when, after 10 seconds with no match in progress, there are no players present.

- NEW description:
  > No-spectators mode toggle. When active, incoming spectator connections are refused; exceptions are whitelisted VIP spectators and coaches. A coach demoted while this is active is disconnected. Automatically cleared to 0 when 10 seconds pass with no match in progress and no players on the server.
  >
  > 0 = spectators may connect normally.
  > 1 = spectator connections refused (VIPs and coaches excepted).
  >
  > Default: 0.
  > Set by: 'nospecs' admin command or vote.

---
