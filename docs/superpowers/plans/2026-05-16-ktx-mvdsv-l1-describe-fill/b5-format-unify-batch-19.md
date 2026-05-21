# B5 format-unify ledger -- batch 19

**Batch:** 19 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:12fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with jargon (CF_SPECTATOR, stuffcmd, cmd_t) | to-shape: D20-template

### ktx:command:12fav_go

- canonical_id: ktx:command:12fav_go
- prior length: 353
- new length: 196

- OLD description:
  > Spectator command: switches your spectator camera to track the player saved in favourite slot 12 (the slot set by fav12_add). If slot 12 is empty or that player is no longer connected, it prints a notice and does nothing; if you are already observing that player, it reports that and does nothing. Slots are per-spectator. Spectator-only (CF_SPECTATOR).

- NEW description:
  > Switches your spectator camera to track the player saved in favourite slot 12 (set via fav12_add). If the slot is empty or that player is no longer connected, prints a notice and does nothing. If you are already tracking that player, reports that and does nothing.
  >
  > Set by: spectator only (has no effect for players or admins).

---

B5-RESULT | ktx:command:flagstatus | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (src/ctf.c, G_sprint, cnt fields) | to-shape: D20-template

### ktx:command:flagstatus

- canonical_id: ktx:command:flagstatus
- prior length: 354
- new length: 290

- OLD description:
  > CTF-only command (no effect outside CTF). Prints the current state of both team flags to the requesting client. Each flag is reported as one of: in its base, carried by a named player, or dropped and lying on the ground. Spectators see the RED and BLUE flags labelled by colour; players see the report relative to their own team (your flag / enemy flag).

- NEW description:
  > Prints the current state of both team flags to you. Each flag is reported as one of: in its base, carried by a named player, or dropped on the ground. Spectators see flags labelled RED and BLUE; players see the report relative to their own team (your flag / enemy flag). Has no effect outside CTF.
  >
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:forcemap | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (admin.c, GetMapNum, changelevel) | to-shape: D20-template

### ktx:command:forcemap

- canonical_id: ktx:command:forcemap
- prior length: 349
- new length: 290

- OLD description:
  > Admin command. Immediately changes the server to the map named as its argument. Usage is "forcemap <mapname>". The change is refused if a match is in progress (unless the server is in matchless mode), if no map name is given, or if the named map is not available on the server. On success it announces the map change and loads the new level at once.

- NEW description:
  > Immediately changes the server to the named map. Usage: forcemap <mapname>. Refused if a match is currently in progress (unless the server runs in matchless mode), if no map name is given, or if the map is not available on the server. Announces the change and loads the new level at once.
  >
  > Set by: admin command 'forcemap <mapname>'.

---

B5-RESULT | ktx:command:overtime | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (state machine, SD_GOLDEN_FRAG const) | to-shape: D20-template

### ktx:command:overtime

- canonical_id: ktx:command:overtime
- prior length: 353
- new length: 357

- OLD description:
  > Cycles the server's overtime mode each time it is run (no-op while a match is in progress). The mode advances through a fixed sequence on successive invocations: off -> time-based (extra timed period of k_exttime minutes; if k_exttime was 0 it is set to 1) -> sudden death -> tie-break -> golden frag -> off. The chosen mode is announced to all players.

- NEW description:
  > Cycles the overtime mode through a fixed sequence each time it is run. Has no effect while a match is in progress.
  >
  > Sequence (advances on each call):
  > off -> time-based (extra k_exttime minutes; k_exttime is set to 1 if it was 0) -> sudden death -> tie-break -> golden frag -> off.
  >
  > The new mode is announced to all players.
  >
  > Set by: admin command 'overtime'.

---

B5-RESULT | ktx:command:spawnicide | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (ToggleSpawnicide, SPAWNICIDE_* enums, g_local.h) | to-shape: D20-template

### ktx:command:spawnicide

- canonical_id: ktx:command:spawnicide
- prior length: 356
- new length: 290

- OLD description:
  > Cycles the spawnicide mode (k_spawnicide), which kills a player who lingers on a spawn point so respawns are not blocked, and announces the new mode. The mode advances through: 0 = off, 1 = prewar (active only before the match starts), 2 = match (active during the match). Advancing past match wraps back to off. Has no effect while a match is in progress.

- NEW description:
  > Cycles the spawnicide mode -- spawnicide kills a player who camps a spawn point so respawns are not blocked. Has no effect while a match is in progress. Cycles through:
  >
  > 0 = off.
  > 1 = prewar (active during warm-up only).
  > 2 = match (active during the live match). Advancing past match wraps back to off.
  >
  > Set by: admin command 'spawnicide'.

---

B5-RESULT | ktx:command:timeup | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (TimeUp handler, DEF arg, timelimit ramp) | to-shape: D20-template

### ktx:command:timeup

- canonical_id: ktx:command:timeup
- prior length: 349
- new length: 301

- OLD description:
  > Increases the match time limit (the timelimit cvar, in minutes) and announces the new length to all players. It normally adds 5 minutes; as a special low-value ramp it instead steps 0 -> 1 -> 3 -> 5 when the current limit is 0, 1, or 3. The result is clamped to the range 0 to the k_timetop cvar. The command is ignored while a match is in progress.

- NEW description:
  > Increases the match time limit (timelimit, in minutes) and announces the new value to all players. Ignored while a match is in progress.
  >
  > Normally adds 5 minutes. Low-value ramp: steps 0 -> 1 -> 3 -> 5 when the current limit is 0, 1, or 3. Result is clamped to k_timetop.
  >
  > Set by: admin command 'timeup'.

---

B5-RESULT | ktx:command:toggleklist | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (k_allowklist, klist(), 5175-5194 handler) | to-shape: D20-template

### ktx:command:toggleklist

- canonical_id: ktx:command:toggleklist
- prior length: 362
- new length: 292

- OLD description:
  > Toggles the k_allowklist cvar, which controls whether the klist command (the mod's full client list) is usable by players during a match. Turning it on enables klist during matches; turning it off disables it. The new on/off state is broadcast to all players together with a reminder to also toggle tracklist. The command is ignored while a match is in progress.

- NEW description:
  > Toggles whether the klist command (full client list) is available to players during a live match. The new state is broadcast to all players with a reminder to also toggle tracklist. Has no effect while a match is in progress.
  >
  > Controls the k_allowklist cvar.
  >
  > Set by: admin command 'toggleklist'.

---

B5-RESULT | ktx:cvar:allow_spec_wizard | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (spectate.c:46, GetSpecWizard, bound(), match_in_progress guard) | to-shape: D20-template

### ktx:cvar:allow_spec_wizard

- canonical_id: ktx:cvar:allow_spec_wizard
- prior length: 349
- new length: 340

- OLD description:
  > Controls whether spectators may become a flying "wizard" free-roaming camera. Value is clamped to 0-2. Wizards are always disabled while a match is in progress, during intermission, and in race mode. 0 = spectator wizards never allowed; 1 = allowed only when there are no players on the server; 2 = allowed in prematch even when players are present.

- NEW description:
  > Controls whether spectators may use the free-roaming "wizard" camera. Wizards are always disabled during a live match, intermission, and race mode.
  >
  > 0 = spectator wizards never allowed.
  > 1 = allowed only when there are no players on the server.
  > 2 = allowed in prematch even when players are present.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:dmm4_invinc_time | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (PutClientInServer, invincible_finished, DMM4_INVINCIBLE_MAX) | to-shape: D20-template

### ktx:cvar:dmm4_invinc_time

- canonical_id: ktx:cvar:dmm4_invinc_time
- prior length: 362
- new length: 302

- OLD description:
  > Duration in seconds of the spawn invincibility granted to a player respawning in deathmatch 4 (DMM4) or bloodfest, applied at PutClientInServer time. A value of 0 selects the built-in default of 2 seconds; a negative value disables spawn invincibility entirely (it is also forced off when k_midair is set); a positive value is clamped to a maximum of 30 seconds.

- NEW description:
  > Duration in seconds of spawn invincibility granted to players respawning in DMM4 or bloodfest.
  >
  > Range: positive values are clamped to 30 seconds. Negative value disables spawn invincibility (also forced off when k_midair is active).
  >
  > Default: 0 (effective 2 seconds).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_clan_arena_max_respawns | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (clan_arena.c:616, in_limbo, round_deaths) | to-shape: D20-template

### ktx:cvar:k_clan_arena_max_respawns

- canonical_id: ktx:cvar:k_clan_arena_max_respawns
- prior length: 353
- new length: 285

- OLD description:
  > Number of times a player may respawn per Clan Arena / Wipeout round before staying dead (a spectating ghost) for the remainder of that round. A player goes to limbo (will respawn) only while their death count this round is at or below this value; 0 = no respawns (eliminated on first death of the round). Also feeds the staged respawn-timer calculation.

- NEW description:
  > Number of times a player may respawn per Clan Arena / Wipeout round. A player who has used all respawns becomes a spectating ghost for the remainder of the round.
  >
  > Range: 0 or higher. 0 = eliminated on first death (no respawns).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_demotxt_format | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (StatsToFile, FindStatsFormat, file_formats[]) | to-shape: D20-template

### ktx:cvar:k_demotxt_format

- canonical_id: ktx:cvar:k_demotxt_format
- prior length: 351
- new length: 249

- OLD description:
  > Selects the file format of the per-game text stats file KTX writes next to a recorded .mvd demo. Valid values: "xml" or "json"; any unrecognized value falls back to "xml". (KTX always also writes a JSON copy for demo-embedding / central-website upload; this cvar controls the format of the additional non-JSON stats file when a non-json value is set.)

- NEW description:
  > Format of the per-game text stats file written next to each recorded demo.
  >
  > "xml" = XML stats file.
  > "json" = JSON stats file.
  > Any unrecognized value falls back to "xml".
  >
  > Default: "xml".
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_dis | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (weapons.c:1203, combat.c:1196, T_RadiusDamage, dtLG_DIS, waterlevel) | to-shape: D20-template

### ktx:cvar:k_dis

- canonical_id: ktx:cvar:k_dis
- prior length: 361
- new length: 295

- OLD description:
  > Controls lightning-gun discharge (firing the LG while standing in water). 0 = discharge disabled: the player loses their cells but no area damage is dealt. 1 = discharge enabled: dealing radius damage scaled by the cells spent. 2 = discharge still fires but only players who are themselves in liquid take the discharge damage (a victim out of water takes none).

- NEW description:
  > Controls lightning-gun discharge -- the area damage dealt when the LG is fired while the player stands in water.
  >
  > 0 = discharge disabled (cells are consumed but no area damage is dealt).
  > 1 = discharge enabled (radius damage scaled by cells spent).
  > 2 = discharge fires but only hits players who are themselves in liquid.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_free_mode | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (check_perm, UserMode, matchless guard) + C2 source-vs-shipped-doc divergence noted | to-shape: D20-template

### ktx:cvar:k_free_mode

- canonical_id: ktx:cvar:k_free_mode
- prior length: 362
- new length: 345

- OLD description:
  > Sets who is permitted to issue the user-mode switch commands (XonX / ffa / ctf and related). The value is an access level: 0 = no one; 1 = real admin only; 2 = admin; 3 and 4 = judges (rejected as not implemented in this code path); 5 = anyone. In matchless mode the effective level is forced to 5. The chosen level is enforced before the mode switch is applied.

- NEW description:
  > Access level required to issue mode-switch commands (XonX, ffa, ctf and related). In matchless mode the effective level is forced to 5 regardless of this setting.
  >
  > 0 = no one may switch modes.
  > 1 = real admin only.
  > 2 = admin.
  > 3-4 = not implemented (denied).
  > 5 = anyone.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_freeze | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (doors.c, plats.c, triggers.c, match_in_progress states) | to-shape: D20-template

### ktx:cvar:k_freeze

- canonical_id: ktx:cvar:k_freeze
- prior length: 357
- new length: 291

- OLD description:
  > Controls whether moving map entities are frozen before the match starts. When 1, platforms, doors and trains do not activate while no match is in progress (warmup / pre-match); when 0 they operate normally during that time. During the match countdown they are frozen regardless of this setting, and practice mode bypasses freezing entirely. 0 = no, 1 = yes.

- NEW description:
  > Controls whether moving map entities (platforms, doors, trains) are frozen during warm-up and pre-match. During the match countdown they are always frozen regardless of this setting. Practice mode bypasses freezing entirely.
  >
  > 0 = map entities move freely before the match.
  > 1 = map entities are frozen until the match starts.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_on_start_f_modified | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (match.c:2939, stuffcmd, has_matchtag) | to-shape: D20-template

### ktx:cvar:k_on_start_f_modified

- canonical_id: ktx:cvar:k_on_start_f_modified
- prior length: 354
- new length: 271

- OLD description:
  > When set (non-zero) and the match has a matchtag assigned, the player triggering the match start is automatically made to issue "say f_modified", broadcasting the f_modified (modified-files) report to chat as the match begins. 0 = no automatic f_modified at match start; non-zero = sent at match start. No effect on matches without a matchtag. Default 1.

- NEW description:
  > When enabled and the match has a matchtag, automatically broadcasts the starting player's f_modified (modified-files) report to chat at match start. Has no effect on matches without a matchtag.
  >
  > 0 = no automatic f_modified at match start.
  > 1 = f_modified sent at match start.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_on_start_f_version | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (match.c:2949, stuffcmd, has_matchtag) | to-shape: D20-template

### ktx:cvar:k_on_start_f_version

- canonical_id: ktx:cvar:k_on_start_f_version
- prior length: 351
- new length: 267

- OLD description:
  > When set (non-zero) and the match has a matchtag assigned, the player triggering the match start is automatically made to issue "say f_version", broadcasting the f_version (client version) report to chat as the match begins. 0 = no automatic f_version at match start; non-zero = sent at match start. No effect on matches without a matchtag. Default 1.

- NEW description:
  > When enabled and the match has a matchtag, automatically broadcasts the starting player's f_version (client version) report to chat at match start. Has no effect on matches without a matchtag.
  >
  > 0 = no automatic f_version at match start.
  > 1 = f_version sent at match start.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_pow_r | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (items.c:2036, items.c:111, DropPowerups, IT_INVISIBILITY) | to-shape: D20-template

### ktx:cvar:k_pow_r

- canonical_id: ktx:cvar:k_pow_r
- prior length: 355
- new length: 290

- OLD description:
  > Per-type switch for the Ring of Shadows (invisibility) powerup. 0 = ring entities are hidden and cannot be picked up, and a held ring is not dropped on death; 1 = ring enabled. Only takes effect while powerups are globally enabled (see k_pow); the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset.

- NEW description:
  > Enables or disables the Ring of Shadows (invisibility) powerup. When disabled, ring items are hidden and cannot be picked up, and a held ring is not dropped on death. Only takes effect while powerups are globally enabled (k_pow).
  >
  > 0 = ring of shadows disabled.
  > 1 = ring of shadows enabled.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_privategame_default | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (vote.c:1615, commands.c:4851, private_game_toggle) | to-shape: D20-template

### ktx:cvar:k_privategame_default

- canonical_id: ktx:cvar:k_privategame_default
- prior length: 352
- new length: 288

- OLD description:
  > The private-game state the server returns to on a rules/map reset. During the rules-reset routine, if the current private-game state differs from this value and private-game voting is enabled (k_privategame_voteable), the server toggles private game to match this value. 0 = default to public game on reset, non-zero = default to private game on reset.

- NEW description:
  > The private-game state the server restores on a rules or map reset. Only takes effect when the current private-game state differs from this value and private-game voting is enabled (k_privategame_voteable).
  >
  > 0 = return to public game on reset.
  > 1 = return to private game on reset.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_rocketarena | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (arena.c:130-132, isRA(), isDuel(), ra_que, ra_match_fight) | to-shape: D20-template

### ktx:cvar:k_rocketarena

- canonical_id: ktx:cvar:k_rocketarena
- prior length: 351
- new length: 281

- OLD description:
  > When enabled (non-zero) and the server is running a duel, turns the duel into Rocket Arena: instead of a single 1v1, a winner-stays queue is used -- the round winner remains in the arena and the next challenger from the spectator/queue line comes in to fight, with winner/loser/line-leader roles managed automatically. Has no effect outside duel mode.

- NEW description:
  > Enables Rocket Arena mode within a duel server. Instead of a single ongoing 1v1, a winner-stays queue is used: the round winner stays in the arena and the next challenger from the spectator queue comes in to fight. Has no effect outside duel mode.
  >
  > 0 = standard duel.
  > 1 = Rocket Arena (winner-stays queue).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:_k_team2 | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code references (match.c:1164, SM_PrepareShowscores, SM_PrepareHostname) | to-shape: D20-template

### ktx:cvar:_k_team2

- canonical_id: ktx:cvar:_k_team2
- prior length: 352
- new length: 228

- OLD description:
  > Internal store of the second participating team's name, captured at match start. The server records the competing team names when the scoreboard is prepared; this holds team 2's name and is read for scoreboard team labels, score attribution, and the match hostname decoration ('<host> (team1 vs. team2)'). String; set by the server, not for manual use.

- NEW description:
  > Internal store of the second team's name, captured at match start. Used for scoreboard team labels, score attribution, and the match hostname decoration. Set by the server automatically -- not for manual configuration.
  >
  > Set by: server (internal, not for manual use).

---
