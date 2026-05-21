# B5 format-unify ledger -- batch 14

**Batch:** 14 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:17fav_go | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with failure branches and internal mechanism | to-shape: D20-template

### ktx:command:17fav_go

- canonical_id: `ktx:command:17fav_go`
- prior length: 422
- new length: 239

- OLD description:
  > Spectator-only command. Switches your spectator point of view to track the player stored in favourite slot 17 (the slot assigned beforehand with fav17_add). If slot 17 is empty it prints "fav go: slot 17 is not defined" and does nothing; if that slot's player has left it prints "can't find player"; if you are already tracking that player it prints "already observing...". Takes no arguments. Rejected for non-spectators.

- NEW description:
  > Spectator command. Switches your point of view to track the player stored in favourite slot 17 (set up with fav17_add). Prints an error if the slot is empty, the player has left, or you are already tracking them.
  >
  > Set by: any spectator (player use rejected).

---

B5-RESULT | ktx:command:fp | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal cvar and mechanism chain | to-shape: D20-template

### ktx:command:fp

- canonical_id: `ktx:command:fp`
- prior length: 419
- new length: 319

- OLD description:
  > Admin command. Advances the chat flood-protection level applied to players to the next preset in the configured list (cycling back to the first level after the last), updating the k_fp setting and re-applying flood protection. Each preset defines how many messages are allowed, over what time window, and for how long a flooder is muted; the new level's name and limits are broadcast to everyone. Requires admin rights.

- NEW description:
  > Admin command. Cycles the chat flood-protection level to the next configured preset (wrapping back to first after last). Each preset sets how many messages are allowed, over what time window, and how long a flooder is muted. The new level and its limits are broadcast to everyone.
  >
  > Set by: admin command 'fp'.
  > See also: k_fp (cvar storing the current level index).

---

B5-RESULT | ktx:command:fragsup | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with cap value and failure branches | to-shape: D20-template

### ktx:command:fragsup

- canonical_id: `ktx:command:fragsup`
- prior length: 426
- new length: 335

- OLD description:
  > Raises the server `fraglimit` by 10 (clamped to a maximum of 100). It has no effect during a match (silently returns) and refuses in any HoonyMode with the message "No fraglimit in hoonymode" privately to the caller. If the new value equals the current `fraglimit` (already at the cap) it reports "fraglimit still <n>" privately to the caller; otherwise the cvar is updated and "Fraglimit set to <n>" is broadcast to everyone.

- NEW description:
  > Raises the server fraglimit by 10, capped at 100. Has no effect during a live match. Refuses in HoonyMode ("No fraglimit in hoonymode"). If already at the cap, reports "fraglimit still <n>" privately; otherwise broadcasts "Fraglimit set to <n>" to all players.
  >
  > Set by: admin command 'fragsup'.

---

B5-RESULT | ktx:command:midair | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with auto-disable list and prerequisite | to-shape: D20-template

### ktx:command:midair

- canonical_id: `ktx:command:midair`
- prior length: 420
- new length: 320

- OLD description:
  > Toggles midair mode on or off (sets the k_midair cvar) and broadcasts the new state. Enabling requires deathmatch mode 4 (dmm4) first, otherwise it refuses with 'Midair requires dmm4'. When midair is enabled it automatically turns off the conflicting mutators instagib, LGC mode, ToT mode, and dmm4 grenade mode. Subject to the standard rules-change permission check (cannot be changed when rule changes are disallowed).

- NEW description:
  > Admin command. Toggles midair mode on or off. Enabling requires dmm4; otherwise refuses with "Midair requires dmm4". When enabled, automatically disables instagib, LGC mode, ToT mode, and dmm4 grenade mode. Subject to the rules-change permission check.
  >
  > Set by: admin command 'midair'.
  > See also: k_midair (the underlying cvar).

---

B5-RESULT | ktx:command:pos_show | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with slot index, field list, and match-state behaviour | to-shape: D20-template

### ktx:command:pos_show

- canonical_id: `ktx:command:pos_show`
- prior length: 426
- new length: 309

- OLD description:
  > Prints, to the calling player's console, the contents of one of 5 saved position slots -- its stored velocity, origin, and view angle -- followed by the player's own current velocity, origin, and view angle, so the two can be compared. With no argument it shows slot 1; an optional numeric argument (clamped to 1-5) selects the slot. Unlike pos_save and pos_move it is not blocked during a match, intermission, pause, or race.

- NEW description:
  > Prints a saved position slot (velocity, origin, view angle) and the caller's current values side by side, for comparison. Without an argument shows slot 1; pass a number 1-5 to select a slot. Available at any time -- not blocked during a match, intermission, or race.
  >
  > Set by: any player or spectator ('pos_show [1-5]').

---

B5-RESULT | ktx:command:race_set_checkpoint | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal node-type routing and enum constants | to-shape: D20-template

### ktx:command:race_set_checkpoint

- canonical_id: `ktx:command:race_set_checkpoint`
- prior length: 427
- new length: 315

- OLD description:
  > Race-mode route editing command (player / spectator-admin). Adds an intermediate checkpoint node at the caller's current position to the custom race route. Has no effect if the race is already running, or if the route already holds the maximum number of nodes (prints "Can't add more checkpoints!"). On success it broadcasts the checkpoint's assigned id and world coordinates and flags the route as a custom (non-preset) route.

- NEW description:
  > Race route editing command. Adds a checkpoint node at the caller's current position to the custom race route. Has no effect while a race is running or when the route is already at its node limit ("Can't add more checkpoints!"). On success broadcasts the new checkpoint's id and coordinates and marks the route as custom.
  >
  > Set by: any player or spectator-admin.

---

B5-RESULT | ktx:command:race_set_falsestart | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with enum values and score-reload side-effect | to-shape: D20-template

### ktx:command:race_set_falsestart

- canonical_id: `ktx:command:race_set_falsestart`
- prior length: 424
- new length: 375

- OLD description:
  > Race-mode setup command (player / spectator-admin). Each invocation cycles the race start mode one step forward and wraps around: "no falsestart" (racers are frozen at the start until the go signal) and "falsestart enabled" (racers may move any time before the go signal). Has no effect while a race is running. On change it broadcasts the new start mode and reloads the stored top scores (which are tracked per start mode).

- NEW description:
  > Race route setup command. Cycles the race start mode between two states. Has no effect while a race is running. On change, broadcasts the new mode and reloads the top scores (scores are tracked per start mode).
  >
  > no falsestart = racers are frozen at the start until the go signal.
  > falsestart enabled = racers may move any time before the go signal.
  >
  > Set by: any player or spectator-admin.

---

B5-RESULT | ktx:command:sct_hex | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with loop range and grid layout details | to-shape: D20-template

### ktx:command:sct_hex

- canonical_id: `ktx:command:sct_hex`
- prior length: 425
- new length: 262

- OLD description:
  > Prints the QuakeWorld character set to the issuing player's console as a table laid out in hexadecimal. It walks character codes 16 through 255 and prints each as a 16-column grid with a "0123456789ABCDEF" column header and a hexadecimal high-nibble label on each row, so the operator can read off the code of any drawable character (e.g. for colored-name or message text). Takes no arguments; output goes only to the caller.

- NEW description:
  > Prints the QuakeWorld character set to your console as a hexadecimal table (character codes 16-255, 16 columns wide). Useful for looking up codes for colored names or message text. Output goes only to the caller.
  >
  > Set by: any player or spectator ('sct_hex').

---

B5-RESULT | ktx:command:s-p | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal dispatch path, match barrier, and s-l side-effect | to-shape: D20-template

### ktx:command:s-p

- canonical_id: `ktx:command:s-p`
- prior length: 421
- new length: 328

- OLD description:
  > Sends a private text message to a single specified player. Usage: s-p <id|name> <text>; the recipient is resolved by player id or name and only that player receives the message. Sending fails with a usage hint if arguments are missing, or 'client not found' if the named/id player is not connected. During a match the message will not cross the player/spectator divide. The target is remembered so s-l can resend to them.

- NEW description:
  > Sends a private message to one specified player. Usage: s-p <id|name> <text>. Only the named recipient sees the message. Fails with a usage hint if arguments are missing, or "client not found" if the player is not connected. During a match, messages do not cross the player/spectator divide. The target is remembered so 's-l' can resend to them.
  >
  > Set by: any player or spectator ('s-p <id|name> <text>').

---

B5-RESULT | ktx:cvar:k_allowtracklist | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with gate condition and scope qualifiers | to-shape: D20-template

### ktx:cvar:k_allowtracklist

- canonical_id: `ktx:cvar:k_allowtracklist`
- prior length: 420
- new length: 303

- OLD description:
  > Controls whether the tracklist command (which prints the list of spectators and, for each, the player they are currently tracking) may be used by a player while a match is in progress. 0 = tracklist is refused for players during a match (responds 'tracklist is disabled'); 1 = tracklist is allowed. The restriction applies only to clients of type player during a match; spectators and use outside a match are unaffected.

- NEW description:
  > Controls whether players may use the 'tracklist' command (which lists spectators and who each is tracking) during a live match. The restriction applies to players only; spectators and out-of-match use are unaffected.
  >
  > 0 = tracklist is disabled for players during a match ("tracklist is disabled").
  > 1 = tracklist is allowed at all times.
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_auto_xonx | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with count-to-mode breakpoints and block-on-manual side-effect | to-shape: D20-template

### ktx:cvar:k_auto_xonx

- canonical_id: `ktx:cvar:k_auto_xonx`
- prior length: 423
- new length: 407

- OLD description:
  > When enabled, the server automatically switches the active user mode to match the live count of players plus ready spectators: 0-3 -> 1on1, 4-5 -> 2on2, 6-7 -> 3on3, 8-9 -> 4on4, 10 or more -> 10on10. 0 = off, 1 = on. The auto-switch is only evaluated while no match is in progress and not in matchless mode; when on it also blocks manual user-mode change commands (the server reports "Command blocked due to k_auto_xonx").

- NEW description:
  > Automatically sets the XonX user mode based on the count of players plus ready spectators. Only active outside of a live match and outside matchless mode. When enabled, manual user-mode commands are blocked ("Command blocked due to k_auto_xonx").
  >
  > 0 = off.
  > 1 = on (0-3 players -> 1on1; 4-5 -> 2on2; 6-7 -> 3on3; 8-9 -> 4on4; 10+ -> 10on10).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_ctf_rune_power_rgn | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with formula, interval calc, and spawn gate | to-shape: D20-template

### ktx:cvar:k_ctf_rune_power_rgn

- canonical_id: `ktx:cvar:k_ctf_rune_power_rgn`
- prior length: 425
- new length: 366

- OLD description:
  > CTF runes only. Scales the strength of the regeneration rune and gates whether it spawns. A value of 0 disables the regeneration rune entirely (it is not placed in the map). Above 0, higher values make the rune stronger: a carrier below 150 health gains +5 health per tick, and the delay between ticks is 1 / ((value / 2) + 1) seconds, so a larger value means faster healing. With the default 2.0 the interval is 0.5 seconds.

- NEW description:
  > CTF runes only. Scales the strength of the regeneration rune and controls whether it spawns.
  >
  > 0 = regeneration rune is disabled (not placed in the map).
  > Above 0 = rune is active; higher values give faster healing (carrier below 150 health gains +5 HP per tick; tick interval = 1 / (value/2 + 1) seconds -- default 2.0 gives 0.5 s intervals).
  >
  > Default: 2.0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_combatjump | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with probability formula, guard conditions, and normal-vs-easy divergence | to-shape: D20-template

### ktx:cvar:k_fbskill_combatjump

- canonical_id: `ktx:cvar:k_fbskill_combatjump`
- prior length: 425
- new length: 312

- OLD description:
  > Frogbot AI tuning cvar. Sets the per-decision probability that the bot performs a combat jump while engaging an enemy: when the bot is looking at an enemy (and not surprised, no ledge expected, enemy not firing LG), it jumps if random(0..1) is below this value. Read into self->fb.skill.combat_jump_chance clamped with bound(0, value, 1.0) (a probability). Consumed by the combat-jump decision in bot_botjump.c (SetJumpFlag).

- NEW description:
  > Frogbot AI tuning cvar. Sets the probability (0.0-1.0) that a bot performs a combat jump while engaging an enemy. Higher values mean the bot jumps more often during combat.
  >
  > Range: 0.0 to 1.0 (probability; clamped).
  >
  > Default: derived from bot skill level (typically 0.03-0.1 depending on skill and mode).
  > Set by: server config or automatically by the bot skill system.

---

B5-RESULT | ktx:cvar:k_freshteams_fast_ammo | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with AND-gate dependency and override chain | to-shape: D20-template

### ktx:cvar:k_freshteams_fast_ammo

- canonical_id: `ktx:cvar:k_freshteams_fast_ammo`
- prior length: 426
- new length: 332

- OLD description:
  > Fresh Teams (dmm1) only: when enabled (1) and k_freshteams is active, picked-up ammo boxes respawn after k_freshteams_weapon_time seconds instead of the normal item respawn time, making ammo respawn on the same cadence as weapons. 0 = ammo uses the standard respawn timing (30 seconds, or 15 in deathmatch 3/5); 1 = ammo respawn time is overridden to k_freshteams_weapon_time seconds. Has no effect unless k_freshteams is set.

- NEW description:
  > Fresh Teams only. When enabled, ammo boxes respawn on the same timer as weapons (k_freshteams_weapon_time seconds) instead of the normal 30-second (or 15-second in dmm3/5) respawn. Has no effect unless k_freshteams is also set.
  >
  > 0 = ammo uses standard respawn timing.
  > 1 = ammo respawn time matches weapon respawn time.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_instagib | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with C2 conflict note in description | to-shape: D20-template

### ktx:cvar:k_instagib

- canonical_id: `ktx:cvar:k_instagib`
- prior length: 419
- new length: 302

- OLD description:
  > Instagib mode selector. 0 = off; 1 = slow coilgun; 2 = fast coilgun; 3 = extreme coilgun. When non-zero, players fight with the instagib coilgun; the mode requires dmm4 (or midair). Higher non-zero values use a faster-firing coilgun. Note: the shipped ktx.cfg comment labels 1 as 'fast' and 2 as 'slow' and lists only 0/1/2, which conflicts with the source command handler's labelling and its 0-3 range (see reasoning).

- NEW description:
  > Instagib mode selector. When non-zero, players fight with the instagib coilgun. Requires dmm4 or midair mode. Higher values use a faster-firing coilgun.
  >
  > 0 = off.
  > 1 = slow coilgun.
  > 2 = fast coilgun.
  > 3 = extreme coilgun.
  >
  > Default: 0.
  > Set by: server config or 'instagib' admin command in-game.

---

B5-RESULT | ktx:cvar:_k_lastmap | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with internal state role, write sites, and XonX reapply logic | to-shape: D20-template

### ktx:cvar:_k_lastmap

- canonical_id: `ktx:cvar:_k_lastmap`
- prior length: 425
- new length: 310

- OLD description:
  > Internal-state cvar (not set from config). Stores the name of the last map played; it is set to the map name on map change and cleared to an empty string on a forced reset. On the first frame of a new map KTX compares it to the current map name and, only if the map actually changed, re-applies the last XonX usermode (via _k_last_xonx) so an active NonN team mode carries across a real map switch but not a same-map restart.

- NEW description:
  > Internal cvar. Not set from config. Stores the name of the last map played; cleared to empty on a forced reset. On map load, KTX compares this to the current map name and re-applies the saved XonX user mode (via _k_last_xonx) only if the map actually changed -- so a team mode persists across a real map switch but not a same-map restart.
  >
  > Set by: KTX engine (map change / reset). Do not set manually.

---

B5-RESULT | ktx:cvar:k_midair | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose listing damage rules and respawn delay | to-shape: D20-template

### ktx:cvar:k_midair

- canonical_id: `ktx:cvar:k_midair`
- prior length: 421
- new length: 409

- OLD description:
  > Enables midair mode. When on, the only damage that counts is direct rocket or telefrag/stomp damage, which is forced to an instant kill (9999); all other damage sources are nullified, self rocket damage is removed, and a frag only registers if the target was airborne above the height floor set by k_midair_minheight. Also forces a 2-second respawn delay and suppresses the normal frag-on-kill increment. 0 = off, 1 = on.

- NEW description:
  > Enables midair mode. When on, only direct rocket hits and telefrags deal damage (forced to instant kill); all other damage is nullified and self-rocket damage is removed. A frag only counts if the target was airborne above the height set by k_midair_minheight. Also forces a 2-second respawn delay.
  >
  > 0 = off.
  > 1 = on (requires dmm4).
  >
  > Default: 0.
  > Set by: server config or 'midair' admin command in-game.

---

B5-RESULT | ktx:cvar:k_noframechecks | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with polarity note, C2 conflict inline, and disconnect mechanism | to-shape: D20-template

### ktx:cvar:k_noframechecks

- canonical_id: `ktx:cvar:k_noframechecks`
- prior length: 419
- new length: 346

- OLD description:
  > When enabled (the default; cvar 0), the server monitors each human player's effective frame rate and machine uptime: it warns players whose FPS exceeds the server FPS cap or whose long machine uptime is triggering a QW client timing bug, and forcibly disconnects the offending client after repeated warnings. Set to 1 to turn this frametime/FPS enforcement off entirely (0 = checks on, 1 = checks off). Bots are exempt.

- NEW description:
  > Controls the server's frametime/FPS enforcement for human players. When checks are on, the server warns players whose FPS exceeds the server cap or whose machine uptime is triggering a QW timing bug, and disconnects after repeated warnings. Bots are exempt.
  >
  > 0 = frame checks enabled (default).
  > 1 = frame checks disabled.
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_race_pace_resolution | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose with trail-count formula and jump-marker gate | to-shape: D20-template

### ktx:cvar:k_race_pace_resolution

- canonical_id: `ktx:cvar:k_race_pace_resolution`
- prior length: 421
- new length: 366

- OLD description:
  > Sets the length/density of the pacemaker ghost's visible trail. The value is read as an integer clamped to 0-3: 0 draws no trail (pacemaker shown without a trail), and each higher step extends the trail by 12 recorded ghost positions in each direction around the ghost's current position (so 1, 2, 3 give progressively longer trails). The active trail length also gates whether jump markers (k_race_pace_jumps) are shown.

- NEW description:
  > Sets the trail length of the race pacemaker ghost. Each step adds 12 recorded ghost positions in each direction around the ghost. A non-zero value is also required for jump markers (k_race_pace_jumps) to display.
  >
  > 0 = no trail (pacemaker shown without a trail).
  > 1 = short trail (12 positions each side).
  > 2 = medium trail (24 positions each side).
  > 3 = long trail (36 positions each side).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_yawnmode | FORMAT-UNIFIED | rev=1 | from-shape: verbose prose listing specific constants and prerequisites | to-shape: D20-template

### ktx:cvar:k_yawnmode

- canonical_id: `ktx:cvar:k_yawnmode`
- prior length: 419
- new length: 355

- OLD description:
  > Toggles 'yawn mode', an alternative deathmatch ruleset that changes core combat constants when enabled: set to 1 to enable, 0 to disable. While on it raises axe damage (50 instead of 20 in dmm3), increases shotgun pellet counts, alters armor protection values, changes nail/projectile velocities and the backpack-drop rules, and is a prerequisite for the teleport-cap setting. Toggled in-game with the yawnmode command.

- NEW description:
  > Enables yawn mode, an alternative deathmatch ruleset with modified combat values. When on: axe damage is raised (50 instead of 20 in dmm3), shotgun pellet count is higher, armor protection values and projectile velocities are altered, backpack-drop rules change, and the teleport-cap setting becomes available.
  >
  > 0 = off.
  > 1 = on.
  >
  > Default: 0.
  > Set by: server config or 'yawnmode' admin command in-game.

---
