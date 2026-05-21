# B5 format-unify ledger -- batch 18

**Batch:** 18 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:ksound2 | FORMAT-UNIFIED | rev=1 | from-shape: long mechanism prose with stuffcmd/KF_KTSOUNDS jargon | to-shape: D20-template

### ktx:command:ksound2

- canonical_id: `ktx:command:ksound2`
- prior length: 568
- new length: 256

- OLD description:
  > Sends team audio cue 2 (plays ktsound2.wav) to your same-team players. The server stuffs a 'play' of ktsound2.wav into the console of every other client on your team who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key) and a non-empty name; each recipient's file path honours their own k_sdir sound-directory setting. Only active in team or CTF games.

- NEW description:
  > Plays team audio cue 2 (ktsound2.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:command:ksound3 | FORMAT-UNIFIED | rev=1 | from-shape: long mechanism prose with stuffcmd/KF_KTSOUNDS jargon | to-shape: D20-template

### ktx:command:ksound3

- canonical_id: `ktx:command:ksound3`
- prior length: 568
- new length: 256

- OLD description:
  > Sends team audio cue 3 (plays ktsound3.wav) to your same-team players. The server stuffs a 'play' of ktsound3.wav into the console of every other client on your team who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key) and a non-empty name; each recipient's file path honours their own k_sdir sound-directory setting. Only active in team or CTF games.

- NEW description:
  > Plays team audio cue 3 (ktsound3.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:command:ksound4 | FORMAT-UNIFIED | rev=1 | from-shape: long mechanism prose with stuffcmd/KF_KTSOUNDS jargon | to-shape: D20-template

### ktx:command:ksound4

- canonical_id: `ktx:command:ksound4`
- prior length: 568
- new length: 256

- OLD description:
  > Sends team audio cue 4 (plays ktsound4.wav) to your same-team players. The server stuffs a 'play' of ktsound4.wav into the console of every other client on your team who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key) and a non-empty name; each recipient's file path honours their own k_sdir sound-directory setting. Only active in team or CTF games.

- NEW description:
  > Plays team audio cue 4 (ktsound4.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:command:ksound5 | FORMAT-UNIFIED | rev=1 | from-shape: long mechanism prose with stuffcmd/KF_KTSOUNDS jargon | to-shape: D20-template

### ktx:command:ksound5

- canonical_id: `ktx:command:ksound5`
- prior length: 568
- new length: 256

- OLD description:
  > Sends team audio cue 5 (plays ktsound5.wav) to your same-team players. The server stuffs a 'play' of ktsound5.wav into the console of every other client on your team who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key) and a non-empty name; each recipient's file path honours their own k_sdir sound-directory setting. Only active in team or CTF games.

- NEW description:
  > Plays team audio cue 5 (ktsound5.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:command:ksound6 | FORMAT-UNIFIED | rev=1 | from-shape: long mechanism prose with stuffcmd/KF_KTSOUNDS jargon | to-shape: D20-template

### ktx:command:ksound6

- canonical_id: `ktx:command:ksound6`
- prior length: 568
- new length: 256

- OLD description:
  > Sends team audio cue 6 (plays ktsound6.wav) to your same-team players. The server stuffs a 'play' of ktsound6.wav into the console of every other client on your team who has KT sounds enabled (the KF_KTSOUNDS bit in their kf userinfo key) and a non-empty name; each recipient's file path honours their own k_sdir sound-directory setting. Only active in team or CTF games.

- NEW description:
  > Plays team audio cue 6 (ktsound6.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:command:clearmarkerflag:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: long mechanism prose with code-citation and internal flag jargon | to-shape: D20-template

### ktx:command:clearmarkerflag:frogbot:editor

- canonical_id: `ktx:command:clearmarkerflag:frogbot:editor`
- prior length: 688
- new length: 351

- OLD description:
  > Frogbot waypoint-editor command (available only in editor mode). Clears the given routing flag(s) from the marker nearest the player. Usage: clearmarkerflag <flags>; with no flag argument it prints the valid marker-flag options, and reports the marker's remaining flags after clearing. Does nothing if there is no marker nearby or if the supplied flag string is invalid.

- NEW description:
  > Frogbot waypoint-editor command (available only when editor mode is active). Clears the specified routing flag(s) from the waypoint marker nearest the player. Usage: clearmarkerflag <flags>. With no argument, prints the list of valid flag names. Reports the marker's remaining flags after clearing. Has no effect if there is no nearby marker or the supplied flag is not recognised.
  >
  > Set by: editor-mode only (server command).

---

B5-RESULT | ktx:command:sct_oct | FORMAT-UNIFIED | rev=1 | from-shape: mechanism prose with internal loop detail | to-shape: D20-template

### ktx:command:sct_oct

- canonical_id: `ktx:command:sct_oct`
- prior length: 453
- new length: 227

- OLD description:
  > Prints the QuakeWorld character set to the issuing player's console as a table laid out in octal. It walks character codes 16 through 255 and prints each as an 8-column grid with a "01234567" column header and an octal high-bits label on each row, so the operator can read off the octal code of any drawable character. Takes no arguments; output goes only to the caller.

- NEW description:
  > Prints the QuakeWorld character set as an octal table to the caller's console. Output is an 8-column grid covering codes 16-255 with a row label showing the octal high-bits group. Takes no arguments; output is private to the caller.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:cvar:k_random_maplist | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code-citation references | to-shape: D20-template

### ktx:cvar:k_random_maplist

- canonical_id: `ktx:cvar:k_random_maplist`
- prior length: 487
- new length: 325

- OLD description:
  > Controls how the next map is chosen from the configured map cycle (the k_ml_0, k_ml_1, ... map-list variables). When 0, the cycle advances sequentially in list order, honoring per-entry min/max player requirements. When non-zero, the next map is instead picked at random from the map-list entries (retrying a few times to avoid immediately repeating the current map).

- NEW description:
  > Controls whether the server picks the next map sequentially or at random from the configured map cycle (k_ml_0, k_ml_1, ...).
  >
  > 0 = advance through the map list in order, respecting each entry's min/max player requirements.
  > 1 (non-zero) = pick the next map at random from the list, retrying a few times to avoid repeating the current map.
  >
  > Default: not enforced by registration (no default value set).
  > Set by: server config.

---

B5-RESULT | ktx:command:race_show_record_details | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line citations | to-shape: D20-template

### ktx:command:race_show_record_details

- canonical_id: `ktx:command:race_show_record_details`
- prior length: 527
- new length: 352

- OLD description:
  > Race-mode query command (players and spectators) taking one numeric argument: the record slot to inspect. Prints to the caller the full detail of that stored map record - finishing time (seconds), racer name, demo name, distance, max speed, average speed, date, weapon mode, and falsestart mode. Prints "record not found" if the requested slot holds no valid record.

- NEW description:
  > Prints full details of a stored race record to the caller. Takes one argument: the record slot number to inspect. Output includes finishing time (seconds), racer name, demo name, distance, max speed, average speed, date, weapon mode, and falsestart mode. Prints "record not found" if the slot is empty. Available to both players and spectators.
  >
  > Set by: any player or spectator (in-game command).

---

B5-RESULT | ktx:command:norunes | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with file:line citations and jargon | to-shape: D20-template

### ktx:command:norunes

- canonical_id: `ktx:command:norunes`
- prior length: 549
- new length: 382

- OLD description:
  > Toggles CTF runes on or off by flipping the k_ctf_runes setting; the new state is announced server-wide. In matchless mode it also strips any rune from players carrying one (resetting their speed) when runes are turned off, and respawns runes when turned on. Only works in CTF mode and is blocked while a match is in progress unless the server is in matchless mode.

- NEW description:
  > Toggles CTF runes on or off and announces the new state server-wide. Only available in CTF mode. Blocked while a match is in progress, unless the server runs in matchless mode.
  >
  > When run in matchless mode: turning runes off strips any rune currently carried by a player (resetting their movement speed); turning them on immediately respawns the rune items in the map.
  >
  > Set by: admin command 'norunes' in-game.

---

B5-RESULT | ktx:cvar:k_ctf_rune_power_str | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation and formula | to-shape: D20-template

### ktx:cvar:k_ctf_rune_power_str

- canonical_id: `ktx:cvar:k_ctf_rune_power_str`
- prior length: 512
- new length: 347

- OLD description:
  > CTF runes only. Scales the strength of the strength rune and gates whether it spawns. A value of 0 disables the strength rune entirely (it is not placed in the map). Above 0, higher values make the rune stronger: damage dealt by a player carrying the strength rune is multiplied by (value / 2) + 1. With the default 2.0 outgoing damage is doubled (multiplied by 2).

- NEW description:
  > CTF runes only. Controls the power of the strength rune and whether it spawns in the map.
  >
  > 0 = strength rune is disabled and does not spawn.
  > Above 0 = rune spawns; outgoing damage for a carrier is multiplied by (value / 2) + 1 (e.g. default 2.0 doubles damage).
  >
  > Range: 0.0 and above (floating-point).
  >
  > Default: 2.0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_autorecord | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code-citation references | to-shape: D20-template

### ktx:cvar:k_race_autorecord

- canonical_id: `ktx:cvar:k_race_autorecord`
- prior length: 395
- new length: 259

- OLD description:
  > Controls whether the server automatically starts an MVD demo recording when a race run begins. When non-zero, on the start of a counted race run (and when not in race match mode) the server begins recording a demo and marks the run as being recorded. When 0 no automatic demo recording is started for race runs. 0 = no auto-record, non-zero = auto-record race runs.

- NEW description:
  > Controls whether the server automatically records an MVD demo when a race run starts.
  >
  > 0 = no automatic demo recording for race runs.
  > 1 (non-zero) = server starts recording when a counted run begins (not active in race match mode).
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_vwep | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with code-citation and dependency detail | to-shape: D20-template

### ktx:cvar:k_vwep

- canonical_id: `ktx:cvar:k_vwep`
- prior length: 506
- new length: 336

- OLD description:
  > Enables the visible-weapons (vwep) extension so players see the actual model of the weapon each other player is currently holding. Set to 1 to enable, 0 to disable. Takes effect only when the server also has k_allow_vwep enabled and the vwep extension is available; can be toggled in-game with the vwep command before a match starts. Registered with a default of 1.

- NEW description:
  > Enables the visible-weapons (vwep) extension -- other players see the model of the weapon you are currently holding. Takes effect only when k_allow_vwep is also enabled and the vwep extension is available. Can be toggled before a match starts with the 'vwep' in-game command.
  >
  > 0 = visible weapons disabled.
  > 1 = visible weapons enabled.
  >
  > Default: 1.
  > Set by: server config or 'vwep' command before match start.

---

B5-RESULT | ktx:cvar:k_ctf_rune_power_res | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation and formula | to-shape: D20-template

### ktx:cvar:k_ctf_rune_power_res

- canonical_id: `ktx:cvar:k_ctf_rune_power_res`
- prior length: 479
- new length: 346

- OLD description:
  > CTF runes only. Scales the strength of the resistance rune and gates whether it spawns. A value of 0 disables the resistance rune entirely (it is not placed in the map). Above 0, higher values make the rune stronger: damage taken by a player carrying the resistance rune is divided by (value / 2) + 1. With the default 2.0 incoming damage is halved (divided by 2).

- NEW description:
  > CTF runes only. Controls the power of the resistance rune and whether it spawns in the map.
  >
  > 0 = resistance rune is disabled and does not spawn.
  > Above 0 = rune spawns; incoming damage for a carrier is divided by (value / 2) + 1 (e.g. default 2.0 halves damage).
  >
  > Range: 0.0 and above (floating-point).
  >
  > Default: 2.0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_spawnicide | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation and #define values | to-shape: D20-template

### ktx:cvar:k_spawnicide

- canonical_id: `ktx:cvar:k_spawnicide`
- prior length: 524
- new length: 352

- OLD description:
  > Controls 'spawnicide' kill zones placed on spawn points and teleporter exits. 0 = disabled. 1 = active during prewar (the pre-match warmup). 2 = active during the match. While active, any non-bot player who lingers on a spawn point or teleporter-exit spot (more than ~1 second after their own spawn/teleport) is instantly killed, preventing spawn camping/blocking.

- NEW description:
  > Controls spawnicide -- instant-kill zones placed on spawn points and teleporter exits to deter spawn camping or blocking. Any non-bot player who lingers on a covered spot for more than ~1 second after spawning or teleporting is instantly killed.
  >
  > 0 = disabled.
  > 1 = active during prewar (the pre-match warm-up phase).
  > 2 = active during the live match.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:command:arena | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation and config-path detail | to-shape: D20-template

### ktx:command:arena

- canonical_id: `ktx:command:arena`
- prior length: 575
- new length: 352

- OLD description:
  > Toggles Rocket Arena mode on or off by flipping the k_rocketarena cvar and broadcasting the new state. Requires the server to be in duel mode first (Rocket Arena is a duel modifier) and the rules-change to be allowed. When turning it on it also execs the configs/usermodes/1on1/ra/default.cfg and per-map ra config if present and forces safe spawn mode (k_spw 1).

- NEW description:
  > Toggles Rocket Arena mode on or off and announces the change server-wide. Rocket Arena is a duel modifier: the server must already be in duel mode for this command to work, and rule changes must be permitted at the time it is issued.
  >
  > When enabling: loads the Rocket Arena default config and the per-map RA config if one exists, and sets safe spawn mode on.
  >
  > Set by: admin command 'arena' in-game.

---

B5-RESULT | ktx:cvar:k_cmd_fp_kick | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation and cross-reference detail | to-shape: D20-template

### ktx:cvar:k_cmd_fp_kick

- canonical_id: `ktx:cvar:k_cmd_fp_kick`
- prior length: 568
- new length: 344

- OLD description:
  > Number of command-flood warnings a client receives before being kicked (disconnected) from the server. Each repeated flood event counts down toward this limit; on the final warning the client is kicked. Clamped to the range 0-10; 0 means use the default of 4. Has no effect if k_cmd_fp_dontkick is set. Applies only to command flooding (not say/chat flood, k_fp).

- NEW description:
  > Number of command-flood warnings a client receives before being kicked from the server. Applies to command flooding only (not chat/say flooding, which is governed by k_fp). Ignored entirely when k_cmd_fp_dontkick is set.
  >
  > Range: 0-10. Value 0 falls back to a built-in default of 4 warnings.
  >
  > Default: 0 (effective 4 warnings).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_defmode | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation and reset-path detail | to-shape: D20-template

### ktx:cvar:k_defmode

- canonical_id: `ktx:cvar:k_defmode`
- prior length: 517
- new length: 320

- OLD description:
  > Sets the server's default game mode, named as a usermode string (for example 1on1, 2on2, 4on4, ffa, ctf). On the server's first map spawn this mode's configuration is applied, and on a full reset it is re-applied (in matchless servers ffa is used instead). The value must match a known usermode name; an unrecognized name is ignored and no default mode is forced.

- NEW description:
  > Sets the server's default game mode, specified as a usermode name (e.g. 1on1, 2on2, 4on4, ffa, ctf). Applied on the first map spawn and re-applied on a full server reset. On matchless servers, ffa is always used on reset regardless of this value. An unrecognised name is silently ignored and no default mode is forced.
  >
  > Default: (empty -- no forced default mode).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_hoonyrounds | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation | to-shape: D20-template

### ktx:cvar:k_hoonyrounds

- canonical_id: `ktx:cvar:k_hoonyrounds`
- prior length: 533
- new length: 303

- OLD description:
  > HoonyMode round limit: the number of point-rounds a HoonyMode match runs before it can end. In team HoonyMode the match plays sets of rounds and finishes once at least this many rounds have been played and there is a lead; the value is treated as 6 if set to 0. The in-game roundsup/roundsdown commands step it in increments of 2 within the range 2-20. Default 6.

- NEW description:
  > HoonyMode only. Sets the number of point-rounds the match must play before it can end. The match finishes once at least this many rounds have been played and one side has a lead. Value 0 is treated as 6.
  >
  > Range: 2-20 (enforced by roundsup/roundsdown commands, which step in increments of 2).
  >
  > Default: 6.
  > Set by: server config or 'roundsup' / 'roundsdown' admin commands in-game.

---

B5-RESULT | ktx:cvar:k_race_countdown | FORMAT-UNIFIED | rev=1 | from-shape: verbose mechanism prose with code-citation | to-shape: D20-template

### ktx:cvar:k_race_countdown

- canonical_id: `ktx:cvar:k_race_countdown`
- prior length: 485
- new length: 306

- OLD description:
  > Length, in seconds, of the countdown before a race run starts. When a run is armed the race countdown timer is initialised from this value. It is also the value adjusted by the in-race countdown-change command, which only accepts new values strictly between 0 and 6 seconds (values outside that range are rejected and the previous setting is kept). Unit: seconds.

- NEW description:
  > Length in seconds of the countdown before a race run starts. When a run is armed the timer is set from this value. Can be changed mid-run via the race countdown-change command, which accepts values strictly between 0 and 6; values outside that range are rejected and the previous setting is kept.
  >
  > Range: strictly 0 to 6 seconds (exclusive, enforced by the countdown-change command).
  >
  > Default: 2.
  > Set by: server config or race countdown-change command.

---
