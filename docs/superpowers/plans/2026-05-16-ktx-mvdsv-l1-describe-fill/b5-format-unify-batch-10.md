# B5 format-unify ledger -- batch 10

**Batch:** 10 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:itempickupbonus:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: long prose with ToT-mode gate and item-cap list | to-shape: D20-template

### ktx:command:itempickupbonus:frogbot:std

- canonical_id: ktx:command:itempickupbonus:frogbot:std
- prior length: 677
- new length: 330

- OLD description:
  > Frogbot subcommand ("fb itempickupbonus") that toggles the bot item-pickup bonus by flipping the corresponding frogbot cvar (default off). Only available when bots are enabled and ToT mode is active, otherwise it is refused. When on, item pickups in ToT mode are made more generous: health pickups may stack to 300 (vs 250), Megahealth grants +100 and is not blocked at 250, and shell/nail/rocket/cell ammo caps rise to 255 (vs 100/200/100/100). Prints "item pickup bonus changed to on/off".

- NEW description:
  > Frogbot subcommand (used as 'fb itempickupbonus'). Toggles the item-pickup bonus for bots in ToT mode. Only available when bots are enabled and ToT mode is active. When on, item pickups are more generous: health stacks to 300 (vs 250), Megahealth grants +100, and ammo caps rise to 255. Prints "item pickup bonus changed to on/off".
  >
  > 0 = item-pickup bonus off (default).
  > 1 = item-pickup bonus on.
  >
  > Default: 0.
  > Set by: admin command 'fb itempickupbonus'.

---

B5-RESULT | ktx:cvar:demo_tmp_record | FORMAT-UNIFIED | rev=1 | from-shape: long prose with game-type decision tree | to-shape: D20-template

### ktx:cvar:demo_tmp_record

- canonical_id: ktx:cvar:demo_tmp_record
- prior length: 644
- new length: 343

- OLD description:
  > Master switch for KTX server-side automatic MVD demo recording at match start. 0 = off (no auto-recording). Any non-zero value enables it: at match start KTX decides whether to begin an sv_demoeasyrecord based on game type -- race is recorded; non-deathmatch is skipped; FFA is skipped if demo_skip_ktffa_record is set; a HoonyMode game already past its first point is skipped; otherwise the match is recorded. If a server demo is already running it is cancelled before the new one starts.

- NEW description:
  > Master switch for KTX automatic server-side MVD demo recording. When enabled, a demo is started at match begin for most game types: race matches are always recorded, non-deathmatch and FFA (when demo_skip_ktffa_record is set) are skipped, and HoonyMode games past the first point are skipped. A running demo is cancelled before the new one starts.
  >
  > 0 = auto-recording off.
  > 1 = auto-recording on (typical value).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:3fav_go | FORMAT-UNIFIED | rev=1 | from-shape: long prose with error messages and array-distinction note | to-shape: D20-template

### ktx:command:3fav_go

- canonical_id: ktx:command:3fav_go
- prior length: 490
- new length: 260

- OLD description:
  > Spectator command: switches your point of view to whichever player is stored in favourites slot 3. The slot is populated beforehand by the `fav3_add` command. If slot 3 holds no player it prints "slot 3 is not defined"; if the stored player is no longer an active player it prints "can't find player"; if you are already observing that player it does nothing. Spectator-only (CF_SPECTATOR). One of the per-slot family 1fav_go..20fav_go, identical behavior with the slot number fixed to 3.

- NEW description:
  > Spectator command. Switches your point of view to the player stored in named favourite slot 3 (set previously with fav3_add). Prints an error if the slot is empty or that player is no longer connected. One of the numbered family 1fav_go..20fav_go, each tied to its own slot.
  >
  > Default: n/a (command).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:4on4on4 | FORMAT-UNIFIED | rev=1 | from-shape: long prose with code-trace parameter list | to-shape: D20-template

### ktx:command:4on4on4

- canonical_id: ktx:command:4on4on4
- prior length: 507
- new length: 308

- OLD description:
  > Applies the 4on4on4 game-mode preset: a three-team match with three squads of four. Caps the server at 12 players (maxclients/k_maxclients 12), sets teamplay 2 (teammates and self can be damaged), deathmatch 1 (base mode -- weapons do not stay on pickup), enables powerups, requires 3 players minimum per team and allows 1-3 teams (k_lockmax 3), runs a 20-minute timelimit with time-based 5-minute overtime, and sets the internal game mode to k_mode 2. The shared common reset runs first.

- NEW description:
  > Applies the 4on4on4 game-mode preset: a three-team match with three squads of four. Sets a 12-player cap, enables powerups and teamfire, runs a 20-minute time limit with 5-minute overtime, requires at least 3 players per team, and allows 1-3 teams. The shared common reset runs first.
  >
  > Default: n/a (command).
  > Set by: admin command '4on4on4'.

---

B5-RESULT | ktx:command:ban | FORMAT-UNIFIED | rev=1 | from-shape: long prose with redirect-mechanism and engine-boundary hedge | to-shape: D20-template

### ktx:command:ban

- canonical_id: ktx:command:ban
- prior length: 685
- new length: 283

- OLD description:
  > Admin command (by user id or nick) for timed-banning a connected player. In KTX-mod code this is a redirect stub: the mod re-sends it as 'cmd ban <params>' back to the issuer and deliberately reports it as not-found within the mod (CF_REDIRECT handling), so the actual timed-ban behaviour is performed by the underlying server (mvdsv) ban handler, not by KTX. The exact ban duration and ban-list semantics are implemented in the server engine and are NOT legible from the KTX source tree.

- NEW description:
  > Bans a connected player by user id or nick for a timed period. KTX passes this command to the underlying server engine, which performs the actual ban; ban duration and ban-list semantics are controlled by the server, not by KTX.
  >
  > Default: n/a (command).
  > Set by: admin command 'ban <userid|nick>'.

---

B5-RESULT | ktx:cvar:k_privategame_voteable | FORMAT-UNIFIED | rev=1 | from-shape: long prose with voting-path detail and rules-reset interaction | to-shape: D20-template

### ktx:cvar:k_privategame_voteable

- canonical_id: ktx:cvar:k_privategame_voteable
- prior length: 637
- new length: 330

- OLD description:
  > Controls whether players can vote to toggle private-game mode. When unset (0) a player using the private-game vote is told 'Private game not enabled on this server' and the vote is refused; the rules-reset routine also will not auto-apply k_privategame_default unless this is set. When set, players may vote for private game (a player must be logged in to cast the vote, and at least 2 players are required unless an admin issues it). 0 = private-game voting disabled, non-zero = enabled.

- NEW description:
  > Controls whether players can vote to toggle private-game mode. When disabled, any private-game vote attempt is refused. When enabled, logged-in players with at least 2 participants may vote; the server rules-reset routine will also auto-apply k_privategame_default.
  >
  > 0 = private-game voting disabled.
  > 1 = private-game voting enabled.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:fav_show | FORMAT-UNIFIED | rev=1 | from-shape: long prose with array names and output-format detail | to-shape: D20-template

### ktx:command:fav_show

- canonical_id: ktx:command:fav_show
- prior length: 763
- new length: 300

- OLD description:
  > Spectator command. Prints the caller's personal favourites list to that spectator only. First the slot-based favourites are listed (each line as "slot N -> player name", iterating the per-slot favx[] array, 1-indexed); then the plain favourites list (just player names, from the auto-add fav[] array). Entries that point to a no-longer-present player or an empty netname are silently skipped. If both lists produce no printable entries, prints "Favourites list empty or nothing to show".

- NEW description:
  > Spectator command. Prints your personal favourites lists: first the named-slot entries (set via fav1_add..fav20_add), then the auto-add list (set via fav_add). Entries for players no longer connected are silently skipped. If both lists are empty, prints "Favourites list empty or nothing to show".
  >
  > Default: n/a (command).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:fav_add | FORMAT-UNIFIED | rev=1 | from-shape: long prose with array-distinction technical note | to-shape: D20-template

### ktx:command:fav_add

- canonical_id: ktx:command:fav_add
- prior length: 537
- new length: 310

- OLD description:
  > Spectator command (usable only by spectators). Adds the player the spectator is currently tracking (point-of-view target) to that spectator's personal favourites list at self->fav[], placing them in the first free slot, for later cycling by fav_next (distinct from the per-slot favx[] populated by fav1_add..fav20_add and read by 1fav_go..20fav_go). Reports an error if the spectator is not tracking a player, if that player is already on the list, or if all favourites slots are full.

- NEW description:
  > Spectator command. Adds the player you are currently tracking to your auto-add favourites list, for later cycling with fav_next. Reports an error if you are not tracking a player, the player is already on the list, or all slots are full. Distinct from the named-slot list (fav1_add..fav20_add / 1fav_go..20fav_go).
  >
  > Default: n/a (command).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:race_scoring | FORMAT-UNIFIED | rev=1 | from-shape: long prose with enum table and source-trace detail | to-shape: D20-template

### ktx:command:race_scoring

- canonical_id: ktx:command:race_scoring
- prior length: 793
- new length: 357

- OLD description:
  > Cycles the race match scoring system to the next one (the k_race_scoring_system cvar) and announces the newly active system. The systems are, in order: 'Win Only' (1 point for the winner only), 'Scaled' (points for completing plus per-opponent-beaten plus a winner bonus), and 'Formula1' (Formula-1 style points allocated by finishing position); it wraps from the last back to the first. Only works in race mode and is refused while a race run is in progress or a match is in progress.

- NEW description:
  > Race-mode command. Cycles the scoring system (k_race_scoring_system) to the next one and announces the change. Wraps from the last system back to the first. Refused while a race run or match is in progress.
  >
  > Systems in order: Win Only (1 point for the winner only), Scaled (completion points + per-opponent bonus + winner bonus), Formula1 (points by finishing position).
  >
  > Default: n/a (command).
  > Set by: admin command 'race_scoring'.

---

B5-RESULT | ktx:cvar:k_race | FORMAT-UNIFIED | rev=1 | from-shape: long prose with toggle-mechanism and code-trace guard list | to-shape: D20-template

### ktx:cvar:k_race

- canonical_id: ktx:cvar:k_race
- prior length: 645
- new length: 285

- OLD description:
  > Whether the server is in Race mode. Non-zero means Race is active: isRACE() reports true, which switches the server into the race game type (checkpoint time-trial running) and applies the hardcoded race settings (practice mode, deathmatch 4, etc.). It is toggled by the race-mode toggle command rather than set directly during play, and the toggle is refused while bots are enabled or while a race is already started with players present. 0 = Race mode off, non-zero = Race mode on.

- NEW description:
  > Enables Race mode on the server. When on, the server runs checkpoint time-trial rules and applies race-specific settings (practice mode, deathmatch 4, etc.). Toggled by the 'race' command; the toggle is refused while bots are enabled or a race is already started with players present.
  >
  > 0 = Race mode off.
  > 1 = Race mode on.
  >
  > Default: 0.
  > Set by: server config or 'race' toggle command.

---

B5-RESULT | ktx:cvar:k_ctf_rune_power_hst | FORMAT-UNIFIED | rev=1 | from-shape: long prose with per-formula speed/cooldown breakdown | to-shape: D20-template

### ktx:cvar:k_ctf_rune_power_hst

- canonical_id: ktx:cvar:k_ctf_rune_power_hst
- prior length: 744
- new length: 341

- OLD description:
  > CTF runes only. Scales the strength of the haste rune and gates whether it spawns. A value of 0 disables the haste rune entirely (it is not placed in the map). Above 0, higher values make the rune stronger: the carrier's max running speed is multiplied by (value / 8) + 1, melee/weapon attack cooldowns are shortened (by value/10 for most weapons, value/20 for some), and the grappling-hook fire interval is divided by the value. With the default 2.0 the speed multiplier is 1.25x.

- NEW description:
  > CTF runes only. Controls the strength of the haste rune and whether it spawns. A value of 0 disables the rune entirely (it is not placed in the map). Higher values increase carrier speed, shorten weapon cooldowns, and speed up the grappling hook. At the default of 2.0 the speed multiplier is 1.25x.
  >
  > Range: 0 (disabled) or any positive value (stronger with higher values).
  >
  > Default: 2.0.
  > Set by: server config.

---

B5-RESULT | ktx:command:14fav_go | FORMAT-UNIFIED | rev=1 | from-shape: long prose with per-error-message enumeration | to-shape: D20-template

### ktx:command:14fav_go

- canonical_id: ktx:command:14fav_go
- prior length: 499
- new length: 262

- OLD description:
  > Spectator-only command. Switches your spectator POV to track the player you previously saved into favourite slot 14 (the slot set by fav14_add while tracking that player). If slot 14 is empty it prints "fav go: slot 14 is not defined"; if the saved player is no longer connected it prints "fav go: slot 14 can't find player"; if you are already tracking that player it prints "fav go: already observing...". One of a numbered family 1fav_go..20fav_go, each recalling its own slot.

- NEW description:
  > Spectator command. Switches your point of view to the player stored in named favourite slot 14 (set previously with fav14_add). Prints an error if the slot is empty or that player is no longer connected. One of the numbered family 1fav_go..20fav_go, each tied to its own slot.
  >
  > Default: n/a (command).
  > Set by: any spectator.

---

B5-RESULT | ktx:command:giveme | FORMAT-UNIFIED | rev=1 | from-shape: long prose with full argument dispatch and cheat-gate | to-shape: D20-template

### ktx:command:giveme

- canonical_id: ktx:command:giveme
- prior length: 788
- new length: 391

- OLD description:
  > Cheat command that grants the issuing player a powerup or runes. Requires cheats enabled (the *cheats serverinfo key); otherwise it is refused. Usage: 'giveme <q|p|r|s> [seconds]' grants Quad (q), Pentagram/invulnerability (p), Ring/invisibility (r), or Biosuit (s) for the given duration (default 30 seconds if omitted or 0). 'giveme rune [1|2|3|4]' grants the numbered runeflag, 'giveme runes' grants all four, 'giveme norunes' clears all four. With no argument it prints usage.

- NEW description:
  > Cheat command. Grants the calling player a powerup or runes. Requires the *cheats serverinfo key to be set; refused otherwise.
  >
  > giveme <q|p|r|s> [seconds] -- grants Quad (q), Pentagram (p), Ring (r), or Biosuit (s) for the given duration (default 30 s).
  > giveme rune [1-4] -- grants the numbered runeflag.
  > giveme runes -- grants all four runes.
  > giveme norunes -- clears all four runes.
  >
  > Default: n/a (command).
  > Set by: any player (requires cheats enabled on the server).

---

B5-RESULT | ktx:command:timedown | FORMAT-UNIFIED | rev=1 | from-shape: long prose with step-ramp and hoonymode detail | to-shape: D20-template

### ktx:command:timedown

- canonical_id: ktx:command:timedown
- prior length: 633
- new length: 310

- OLD description:
  > Decreases the match time limit (the timelimit cvar, in minutes) and announces the new length to all players. It normally subtracts 5 minutes; as a special low-value ramp it instead steps 5 -> 3 -> 1 when the current limit is 5 or 3, and in any hoonymode it subtracts 2 instead of 5. The result is clamped to the range 0 to the k_timetop cvar. If lowering it would leave both timelimit and fraglimit at 0 the change is refused. The command is ignored while a match is in progress.

- NEW description:
  > Decreases the match time limit (in minutes) and announces the new value. Normally subtracts 5 minutes; steps 5->3->1 when already at 5 or 3; subtracts 2 instead of 5 in HoonyMode. Result is clamped to 0..k_timetop. Refused if both timelimit and fraglimit would reach 0, or while a match is in progress.
  >
  > Default: n/a (command).
  > Set by: admin command 'timedown'.

---

B5-RESULT | ktx:cvar:k_dmgfrags | FORMAT-UNIFIED | rev=1 | from-shape: long prose with conversion formula and mode-string suffix | to-shape: D20-template

### ktx:cvar:k_dmgfrags

- canonical_id: ktx:cvar:k_dmgfrags
- prior length: 760
- new length: 348

- OLD description:
  > Damage-frags scoring mode. When on (non-zero) and a match is running, frags are awarded by cumulative damage dealt to enemies -- 1 frag per 100 points of damage -- instead of by kills; while it is on, a normal kill grants no separate +1 frag. Damage to teammates and self does not count, tele-death damage does not count, and damage to a victim with Pentagram is not capped by the victim's health. The active mode string gets a "-df" suffix.

- NEW description:
  > Enables damage-frags scoring. When on, frags are earned by cumulative damage dealt to enemies (1 frag per 100 damage) instead of by kills; a normal kill no longer awards a +1 frag. Teammate and self-damage do not count; tele-death is excluded; Pentagram interaction is handled specially. The active mode name gains a "-df" suffix.
  >
  > 0 = normal kill-based scoring.
  > 1 = damage-based scoring.
  >
  > Default: 0.
  > Set by: server config or 'dmgfrags' toggle command.

---

B5-RESULT | ktx:command:kill | FORMAT-UNIFIED | rev=1 | from-shape: long prose with guard-list and rate-limit detail | to-shape: D20-template

### ktx:command:kill

- canonical_id: ktx:command:kill
- prior length: 658
- new length: 311

- OLD description:
  > Suicide command: kills the calling player by applying lethal self-damage (death recorded as a suicide). Blocked while the server is paused or in standby, if the player is already dead or not a player, in RA mode ("Can't suicide in RA mode"), at restricted times in CA/wipeout (and after a wipeout-round suicide the player cannot respawn that round), and during the first 10 seconds of a CTF match. Rate-limited to one suicide per second. Player command, usable outside a match.

- NEW description:
  > Kills your own player (suicide). Blocked while the server is paused or in standby, in RA mode, during CA/wipeout at restricted times (wipeout-round suicide also blocks respawn for that round), and during the first 10 seconds of a CTF match. Rate-limited to one per second.
  >
  > Default: n/a (command).
  > Set by: any player.

---

B5-RESULT | ktx:command:race_set_weapon_mode | FORMAT-UNIFIED | rev=1 | from-shape: long prose with enum-value source detail and side-effects list | to-shape: D20-template

### ktx:command:race_set_weapon_mode

- canonical_id: ktx:command:race_set_weapon_mode
- prior length: 759
- new length: 346

- OLD description:
  > Race-mode setup command (player / spectator-admin). Each invocation cycles the race weapon mode one step forward and wraps around: "disallowed" (no weapons during the race), "allowed" (weapons available immediately), and "allowed after 2s" (weapons unlocked two seconds into the run). Has no effect while a race is running. On change it broadcasts the new weapon mode, reloads the stored top scores (tracked per weapon mode), and flags the route as a custom (non-preset) route.

- NEW description:
  > Race-mode command. Cycles the weapon availability mode one step forward, wrapping from last to first. Has no effect while a race is running. On change, broadcasts the new mode, reloads top scores for that weapon mode, and marks the route as custom.
  >
  > Modes in order: disallowed (no weapons), allowed (weapons available immediately), allowed after 2s (weapons unlock two seconds into the run).
  >
  > Default: n/a (command).
  > Set by: admin command 'race_set_weapon_mode'.

---

B5-RESULT | ktx:cvar:k_allow_vwep | FORMAT-UNIFIED | rev=1 | from-shape: long prose with AND-gate formula and no-op gate detail | to-shape: D20-template

### ktx:cvar:k_allow_vwep

- canonical_id: ktx:cvar:k_allow_vwep
- prior length: 643
- new length: 329

- OLD description:
  > Server-side master enable for visible weapons (vwep): when set, other players' currently-held weapon is shown as a model on their character instead of every player appearing to carry the same weapon. 0 = off, 1 = on (default 0). This is the master gate; the related `k_vwep` toggle only takes effect while this is on, and when this is off the in-game `vwep` toggle command is a no-op. When set, the server also precaches the visible-weapon player and weapon models on map load.

- NEW description:
  > Master enable for visible weapons (vwep). When on, other players' currently-held weapon is shown as a model on their character. This is the master gate -- k_vwep only takes effect while this is on, and the in-game 'vwep' command is a no-op when this is off. Enabling also precaches the visible-weapon models on map load.
  >
  > 0 = vwep disabled.
  > 1 = vwep enabled (k_vwep then acts as the per-player toggle).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:race_route_switch | FORMAT-UNIFIED | rev=1 | from-shape: long prose with server-context branch and load-fail detail | to-shape: D20-template

### ktx:command:race_route_switch

- canonical_id: ktx:command:race_route_switch
- prior length: 705
- new length: 337

- OLD description:
  > Cycles to the next predefined route for the current map, wrapping back to the first route after the last. Hides spawn points and resets the map first; prints 'No routes defined for this map' if the map has none and an error if the route fails to load. When run from a server-side context whose configured route-map name matches the current map, it loads that configured route number instead of advancing. Only works in race mode and is refused while a race run is in progress.

- NEW description:
  > Race-mode command. Cycles to the next predefined route for the current map, wrapping back to the first after the last. Resets the map and hides spawn points before switching. Prints an error if no routes exist for the map or a route fails to load. A server-configured route number overrides the cycle when the configured map matches. Refused while a race is in progress.
  >
  > Default: n/a (command).
  > Set by: admin command 'race_route_switch'.

---

B5-RESULT | ktx:command:pos_save | FORMAT-UNIFIED | rev=1 | from-shape: long prose with slot-index formula and guard list | to-shape: D20-template

### ktx:command:pos_save

- canonical_id: ktx:command:pos_save
- prior length: 729
- new length: 338

- OLD description:
  > Saves the calling player's current position -- origin, view angles, and velocity -- into one of 5 numbered slots. With no argument it uses slot 1; an optional numeric argument (clamped to 1-5) selects the slot. The command is refused while a match is in progress, during intermission, while sv_paused is set, or during an active race round; otherwise it confirms with "Position N was saved". The saved slot is later recalled by pos_show / pos_move / pos_origin / pos_angles.

- NEW description:
  > Saves your current position (origin, view angles, and velocity) into one of 5 numbered slots. With no argument uses slot 1; an optional number (1-5) selects the slot. Confirms with "Position N was saved". Refused during a match, intermission, while paused, or during an active race round. Recalled by pos_show / pos_move / pos_origin / pos_angles.
  >
  > Default: n/a (command).
  > Set by: any player.

---
