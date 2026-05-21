# B5 format-unify ledger -- batch 26

**Batch:** 26 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:race_show_route | FORMAT-UNIFIED | rev=1 | from-shape: verbose multi-sentence prose listing printed fields with file:line refs | to-shape: D20-template

### ktx:command:race_show_route

- canonical_id: ktx:command:race_show_route
- prior length: 901
- new length: 261

- OLD description:
  > Race-mode query command (players and spectators). Prints to the caller the current route summary: the route name, the active route number, the configured race time limit in seconds, the route description (only when a non-custom route is active), and the current weapon mode.

- NEW description:
  > Race-mode query command available to players and spectators. Prints the current route summary to the caller: route name, active route number, time limit (seconds), route description (for non-custom routes only), and weapon mode.
  >
  > Set by: any player or spectator in race mode.

---

B5-RESULT | ktx:cvar:k_cmd_fp_for | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and internal variable names | to-shape: D20-template

### ktx:cvar:k_cmd_fp_for

- canonical_id: ktx:cvar:k_cmd_fp_for
- prior length: 1070
- new length: 278

- OLD description:
  > Command flood protection lockout duration in seconds: when a client trips the command flood limit, their commands are blocked for this many seconds. Clamped to the range 0-30; 0 means use the default of 5 seconds. Applies only to command flooding (not say/chat flood, k_fp).

- NEW description:
  > Lockout duration (in seconds) applied when a player trips the command flood limit. Commands are blocked for this many seconds.
  >
  > Range: 0-30. Value 0 uses the built-in default of 5 seconds.
  >
  > Default: 0 (effective 5 seconds).
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_disallow_krjump | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, code-trace details, and polarity confusion | to-shape: D20-template

### ktx:cvar:k_disallow_krjump

- canonical_id: ktx:cvar:k_disallow_krjump
- prior length: 581
- new length: 295

- OLD description:
  > Server-side toggle for the krjump command (the scripted vertical rocket-jump assist: switch to RL, pitch straight down to the maximum 80 degrees, and fire). 0 = krjump allowed. 1 (any non-zero) = krjump disabled; invoking it prints "krjump is disabled" and performs no jump.

- NEW description:
  > Server-side toggle that disables the krjump command (a scripted vertical rocket-jump assist: switches to the rocket launcher, pitches straight down, and fires).
  >
  > 0 = krjump is allowed.
  > 1 = krjump is disabled; attempting it prints "krjump is disabled".
  >
  > Default: 1.
  > Set by: server config only.

---

B5-RESULT | ktx:command:roundsup | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and step/clamp details inline | to-shape: D20-template

### ktx:command:roundsup

- canonical_id: ktx:command:roundsup
- prior length: 375
- new length: 270

- OLD description:
  > Increases the HoonyMode round limit (cvar k_hoonyrounds) by 2 rounds, clamped to a maximum of 20, and broadcasts the new round limit. Only works in a HoonyMode game and only when no match is in progress; in any other mode it tells the caller the command is HoonyMode-only.

- NEW description:
  > HoonyMode admin command that increases the round limit (k_hoonyrounds) by 2 rounds (maximum 20) and announces the new value to all players. Has no effect while a match is in progress; in non-HoonyMode games it tells the caller the command is unavailable.
  >
  > Set by: any player in a HoonyMode game (before match start).

---

B5-RESULT | ktx:command:roundsdown | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and step/clamp details inline | to-shape: D20-template

### ktx:command:roundsdown

- canonical_id: ktx:command:roundsdown
- prior length: 382
- new length: 279

- OLD description:
  > Decreases the HoonyMode round limit (cvar k_hoonyrounds) by 2 rounds, clamped to a minimum of 2, and broadcasts the new round limit. Only works in a HoonyMode game and only when no match is in progress; in any other mode it tells the caller the command is HoonyMode-only.

- NEW description:
  > HoonyMode admin command that decreases the round limit (k_hoonyrounds) by 2 rounds (minimum 2) and announces the new value to all players. Has no effect while a match is in progress; in non-HoonyMode games it tells the caller the command is unavailable.
  >
  > Set by: any player in a HoonyMode game (before match start).

---

B5-RESULT | ktx:command:skill:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal symbol names, and namespace explanation | to-shape: D20-template

### ktx:command:skill:frogbot:std

- canonical_id: ktx:command:skill:frogbot:std
- prior length: 514
- new length: 298

- OLD description:
  > Sets the frogbot skill level applied to bots added afterward. Takes one integer argument clamped to 0-20 (lowest to highest skill); higher values produce stronger bot opponents. With no argument it reports the current bot skill. Requires bots to be enabled on the server.

- NEW description:
  > Frogbot command that sets the skill level applied to bots added after this point. Takes one integer argument; higher values produce stronger opponents.
  >
  > Range: 0 (lowest) to 20 (highest).
  >
  > Set by: any player (requires bots to be enabled on the server). With no argument, reports the current skill level.

---

B5-RESULT | ktx:command:tracklist | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and internal function names | to-shape: D20-template

### ktx:command:tracklist

- canonical_id: ktx:command:tracklist
- prior length: 629
- new length: 286

- OLD description:
  > Prints a list of all spectators present and, for each, the player they are currently tracking (or 'not tracking'). Prints 'No spectators present' if there are none. For players, this list is suppressed during a match unless the k_allowtracklist permission is enabled.

- NEW description:
  > Prints the list of spectators and who each is tracking. Shows "not tracking" for spectators not currently following a player; "No spectators present" if there are none.
  >
  > Players cannot use this command during a live match unless k_allowtracklist is enabled.
  >
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:whonot | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and internal function names | to-shape: D20-template

### ktx:command:whonot

- canonical_id: ktx:command:whonot
- prior length: 565
- new length: 285

- OLD description:
  > Prints only the players who are NOT marked ready: one line per not-ready player showing a ready marker, admin marker, team tag (in team modes), and name. Prints "All players ready" if everyone is ready, and "Game in progress" (with no list) while a match is running.

- NEW description:
  > Prints the list of players who are not yet ready, one per line with ready status, admin marker, team tag (in team modes), and name.
  >
  > Prints "All players ready" if everyone is ready. Prints "Game in progress" without a list while a match is running.
  >
  > Set by: any player or spectator.

---

B5-RESULT | ktx:command:noga | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal function names, and code-trace prose | to-shape: D20-template

### ktx:command:noga

- canonical_id: ktx:command:noga
- prior length: 662
- new length: 271

- OLD description:
  > Toggles whether players receive green armor on spawn in Capture the Flag, on or off, by flipping the k_ctf_ga setting; the new state is announced server-wide. Only works in CTF mode and is blocked while a match is in progress unless the server is in matchless mode.

- NEW description:
  > CTF admin command that toggles whether players spawn with green armor (k_ctf_ga). The new state is announced to all players.
  >
  > Only works in CTF mode. Blocked during a live match unless the server is in matchless mode.
  >
  > Set by: admin command in CTF mode.

---

B5-RESULT | ktx:command:tossflag | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal function names, and velocity values | to-shape: D20-template

### ktx:command:tossflag

- canonical_id: ktx:command:tossflag
- prior length: 714
- new length: 241

- OLD description:
  > Throws the CTF flag the caller is carrying: the flag is dropped at the player's position and given a forward-and-upward toss velocity so it travels ahead of the player (rather than simply falling at their feet). Does nothing if the caller is not carrying a flag.

- NEW description:
  > CTF command that throws the flag the caller is carrying forward and upward (rather than simply dropping it at their feet). Does nothing if the caller is not holding a flag.
  >
  > Set by: any player carrying a flag.

---

B5-RESULT | ktx:command:overtimeup | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal variable names, and wrap-around details | to-shape: D20-template

### ktx:command:overtimeup

- canonical_id: ktx:command:overtimeup
- prior length: 481
- new length: 275

- OLD description:
  > Increases the overtime period length (the k_exttime cvar, in minutes) by one minute each time it is run, wrapping back to 1 minute when it would reach 11 or drop to 0 or below. The new length is announced to all players. No effect while a match is in progress.

- NEW description:
  > Admin command that increases the overtime duration (k_exttime) by one minute and announces the new value to all players. Wraps back to 1 minute if the value would reach 11 or fall to 0 or below. No effect while a match is in progress.
  >
  > Set by: admin command (before match start).

---

B5-RESULT | ktx:cvar:k_cmd_fp_count | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal variable names, and ring-buffer internals | to-shape: D20-template

### ktx:cvar:k_cmd_fp_count

- canonical_id: ktx:cvar:k_cmd_fp_count
- prior length: 1038
- new length: 294

- OLD description:
  > Command flood protection: the number of console commands a client may issue within the k_cmd_fp_per time window before being treated as a command flooder. Clamped to the range 0-10; 0 means use the default of 10. Distinct from say/chat flood protection (k_fp).

- NEW description:
  > Number of console commands a player may send within the k_cmd_fp_per time window before triggering command flood protection. Distinct from say/chat flood protection (k_fp).
  >
  > Range: 0-10. Value 0 uses the built-in default of 10.
  >
  > Default: 0 (effective 10 commands per window).
  > Set by: server config only.

---

B5-RESULT | ktx:command:race_break_all | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and internal function names | to-shape: D20-template

### ktx:command:race_break_all

- canonical_id: ktx:command:race_break_all
- prior length: 503
- new length: 239

- OLD description:
  > Admin command for race mode: forces every racer to stop. It clears the ready state of all racers and broadcasts "<name> has forced the race to stop" to everyone. Has no effect when the race-mode command preconditions are not met. Requires admin privileges.

- NEW description:
  > Race-mode admin command that forces all racers to stop, clearing their ready state and broadcasting "<name> has forced the race to stop" to all players. Requires admin privileges.
  >
  > Set by: admin command in race mode.

---

B5-RESULT | ktx:command:race_show_lineup | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal field names, and internal glyph references | to-shape: D20-template

### ktx:command:race_show_lineup

- canonical_id: ktx:command:race_show_lineup
- prior length: 717
- new length: 283

- OLD description:
  > Race-mode query command (players and spectators). Prints to the caller a numbered list of every player currently marked race-ready; players who are actively racing at that moment are flagged with a distinct marker. Prints "(Empty)" when no player is ready.

- NEW description:
  > Race-mode query command available to players and spectators. Prints a numbered list of all race-ready players to the caller; players currently mid-race are flagged with a distinct marker. Prints "(Empty)" when no player is race-ready.
  >
  > Set by: any player or spectator in race mode.

---

B5-RESULT | ktx:cvar:k_remove_end_hurt | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and code-trace details | to-shape: D20-template

### ktx:cvar:k_remove_end_hurt

- canonical_id: ktx:cvar:k_remove_end_hurt
- prior length: 506
- new length: 289

- OLD description:
  > On the 'end' map only, removes built-in level triggers. 0 = no modifications (hurt and changelevel triggers behave normally). 1 = remove both the hurt trigger and the changelevel trigger. 2 = remove only the hurt trigger (the changelevel trigger is kept).

- NEW description:
  > On the "end" map only, controls removal of built-in level triggers.
  >
  > 0 = no modifications; hurt and changelevel triggers behave normally.
  > 1 = remove both the hurt trigger and the changelevel trigger.
  > 2 = remove only the hurt trigger (changelevel trigger kept).
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:command:race_match | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal symbol names, and sv_silentrecord coupling details | to-shape: D20-template

### ktx:command:race_match

- canonical_id: ktx:command:race_match
- prior length: 671
- new length: 315

- OLD description:
  > Toggles race match mode on or off (the k_race_match cvar) and announces the new state. Turning match mode on also sets sv_silentrecord to 0; turning it off sets sv_silentrecord to 1. Only works in race mode and is refused while a race run is in progress.

- NEW description:
  > Race-mode command that toggles match mode (k_race_match) on or off and announces the new state. Enabling match mode also enables demo recording; disabling it suppresses recording.
  >
  > Only works in race mode. Refused while a race run is in progress.
  >
  > Set by: any player in race mode (before a run starts).

---

B5-RESULT | ktx:command:powerups_pickup | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and internal engine-label prose | to-shape: D20-template

### ktx:command:powerups_pickup

- canonical_id: ktx:command:powerups_pickup
- prior length: 621
- new length: 253

- OLD description:
  > Toggles the powerup pickup policy (server cvar k_pow_pickup) on or off and announces the new state as "new powerups pickup (no multi pickup)". When enabled, the no-multi-pickup policy is in force. The command has no effect while a match is in progress.

- NEW description:
  > Toggles the no-multi-pickup powerup policy (k_pow_pickup) on or off and announces the new state. When enabled, a player cannot pick up multiple powerups at the same time. Has no effect while a match is in progress.
  >
  > Set by: admin command (before match start).

---

B5-RESULT | ktx:cvar:k_clan_arena_rounds | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs, internal function names, and arithmetic details | to-shape: D20-template

### ktx:cvar:k_clan_arena_rounds

- canonical_id: ktx:cvar:k_clan_arena_rounds
- prior length: 724
- new length: 337

- OLD description:
  > Number of rounds in a Clan Arena / Wipeout series. The value is clamped to the range 3-101 and, if even, rounded up to the next odd number; the match is then best-of-that, won by the first team to take a majority of rounds ((rounds+1)/2 wins required).

- NEW description:
  > Number of rounds in a Clan Arena or Wipeout series. Values are clamped to 3-101; even values are silently rounded up to the next odd number. The series is best-of-that, won by the first team to take a majority of rounds.
  >
  > Range: 3-101 (odd values only; even inputs are rounded up).
  >
  > Default: 9.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_count | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and mode-specific floor values | to-shape: D20-template

### ktx:cvar:k_count

- canonical_id: ktx:cvar:k_count
- prior length: 315
- new length: 284

- OLD description:
  > Duration, in seconds, of the pre-match countdown before a game starts. The effective countdown is floored at 3 seconds (raised to a minimum of 5 in bloodfest mode); in coop and other non-deathmatch modes there is no countdown regardless of this value.

- NEW description:
  > Duration in seconds of the pre-match countdown before a game starts. The countdown is always at least 3 seconds (at least 5 in bloodfest mode). In coop and other non-deathmatch modes there is no countdown regardless of this value.
  >
  > Range: 0 upward (effective minimum 3, or 5 in bloodfest).
  >
  > Default: 10.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_vp_suggestcolor | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with file:line refs and clamp details | to-shape: D20-template

### ktx:cvar:k_vp_suggestcolor

- canonical_id: ktx:cvar:k_vp_suggestcolor
- prior length: 477
- new length: 272

- OLD description:
  > Minimum share of eligible voters (as a percentage) required to pass a team color-suggestion election, which applies a suggested team color. Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100. Registered with a default of 51.

- NEW description:
  > Percentage of eligible voters required to pass a team color-suggestion election. Values below 51 are treated as 51; values above 100 are treated as 100.
  >
  > Range: 51-100.
  >
  > Default: 51.
  > Set by: server config only.

---
