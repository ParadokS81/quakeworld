# B5 format-unify ledger -- batch 29

**Batch:** 29 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:info:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 42-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:info:frogbot:editor

- canonical_id: `ktx:command:info:frogbot:editor`
- prior length: 42 chars
- new length: 146 chars

- OLD description:
  > Shows information about the current marker

- NEW description:
  > Frogbot editor command. Prints the index, classname, and encoded flags of the routing marker nearest the editing player (or by optional marker number).
  >
  > Set by: bot editor command ('botcmd info' in editor mode).

---

B5-RESULT | ktx:command:removemarker:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 37-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:removemarker:frogbot:editor

- canonical_id: `ktx:command:removemarker:frogbot:editor`
- prior length: 37 chars
- new length: 144 chars

- OLD description:
  > Removes a routing marker from the map

- NEW description:
  > Frogbot editor command. Removes the nearest manually-placed routing marker from the map. Cannot remove non-manual markers; prints an error if none is nearby.
  >
  > Set by: bot editor command ('botcmd removemarker' in editor mode).

---

B5-RESULT | ktx:command:mapinfo:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 35-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:mapinfo:frogbot:editor

- canonical_id: `ktx:command:mapinfo:frogbot:editor`
- prior length: 35 chars
- new length: 153 chars

- OLD description:
  > Shows information about current map

- NEW description:
  > Frogbot editor command. Prints bot-routing diagnostics for the current map: marker count, goals, zones, and indicators. Used to audit bot navigation coverage.
  >
  > Set by: bot editor command ('botcmd mapinfo' in editor mode).

---

B5-RESULT | ktx:command:removeallpaths:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 34-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:removeallpaths:frogbot:editor

- canonical_id: `ktx:command:removeallpaths:frogbot:editor`
- prior length: 34 chars
- new length: 167 chars

- OLD description:
  > Removes all paths from this marker

- NEW description:
  > Frogbot editor command. Removes every outbound path from the routing marker nearest the editing player, leaving the marker in place but with no connections.
  >
  > Set by: bot editor command ('botcmd removeallpaths' in editor mode).

---

B5-RESULT | ktx:command:addbot:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: 33-char bare verb phrase with args note (no Set-by) | to-shape: D20-template

### ktx:command:addbot:frogbot:std

- canonical_id: `ktx:command:addbot:frogbot:std`
- prior length: 33 chars
- new length: 166 chars

- OLD description:
  > Adds a bot. Skill & team optional

- NEW description:
  > Adds a Frogbot to the server. Optional arguments: skill level (numeric) and team. When teamplay is on and no team is specified the bot is auto-balanced to the smaller team.
  >
  > Set by: server admin via 'botcmd addbot' command.

---

B5-RESULT | ktx:cvar:k_motd_time | FORMAT-UNIFIED | rev=1 | from-shape: 33-char bare description (no Range/Default/Set-by) | to-shape: D20-template (scalar/range variant)

### ktx:cvar:k_motd_time

- canonical_id: `ktx:cvar:k_motd_time`
- prior length: 33 chars
- new length: 194 chars

- OLD description:
  > time motd is displayed in seconds

- NEW description:
  > How long the message-of-the-day (MOTD) is displayed to connecting players, in seconds.
  >
  > Range: 0-30 (clamped). Value 0 falls back to a built-in default: 7 seconds during a match, 3 seconds otherwise.
  >
  > Default: 0 (effective 7s in-match / 3s matchless).
  > Set by: server config.

---

B5-RESULT | ktx:command:addmarker:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 32-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:addmarker:frogbot:editor

- canonical_id: `ktx:command:addmarker:frogbot:editor`
- prior length: 32 chars
- new length: 158 chars

- OLD description:
  > Adds a routing marker to the map

- NEW description:
  > Frogbot editor command. Places a new routing marker at the editing player's current position. Refused if within the minimum distance of an existing marker.
  >
  > Set by: bot editor command ('botcmd addmarker' in editor mode).

---

B5-RESULT | ktx:command:breakondeath:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: 32-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:breakondeath:frogbot:std

- canonical_id: `ktx:command:breakondeath:frogbot:std`
- prior length: 32 chars
- new length: 196 chars

- OLD description:
  > Automatically break when you die

- NEW description:
  > Frogbot standard command. Toggles whether a break is automatically issued on your death during a bot practice session. Applies to human players; bots are unaffected.
  >
  > Set by: any player in a bot practice session ('botcmd breakondeath' in-game).

---

B5-RESULT | ktx:command:move:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 32-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:move:frogbot:editor

- canonical_id: `ktx:command:move:frogbot:editor`
- prior length: 32 chars
- new length: 142 chars

- OLD description:
  > Moves marker to current position

- NEW description:
  > Frogbot editor command. Relocates the nearest routing marker to the editing player's current position.
  >
  > Set by: bot editor command ('botcmd move' in editor mode).

---

B5-RESULT | ktx:command:removepath:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 30-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:removepath:frogbot:editor

- canonical_id: `ktx:command:removepath:frogbot:editor`
- prior length: 30 chars
- new length: 196 chars

- OLD description:
  > Removes a path between markers

- NEW description:
  > Frogbot editor command. Removes the bidirectional path between the saved marker and the nearest marker. Both directions are cleared. Requires a saved marker (set with the 'savemarker' command) and a nearby marker.
  >
  > Set by: bot editor command ('botcmd removepath' in editor mode).

---

B5-RESULT | ktx:command:newcomer | FORMAT-UNIFIED | rev=1 | from-shape: 29-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:newcomer

- canonical_id: `ktx:command:newcomer`
- prior length: 29 chars
- new length: 131 chars

- OLD description:
  > message to last player joined

- NEW description:
  > Sends a chat message to the most recently joined player. The message text is taken from the caller's 'premsg'/'postmsg' userinfo wrapping.
  >
  > Set by: any player ('newcomer' in-game).

---

B5-RESULT | ktx:command:anglehint:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 28-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:anglehint:frogbot:editor

- canonical_id: `ktx:command:anglehint:frogbot:editor`
- prior length: 28 chars
- new length: 245 chars

- OLD description:
  > Sets angle hint for bot path

- NEW description:
  > Frogbot editor command. Gets or sets the angle hint on the path between the saved marker and the nearest marker. Called with no value it reports the current hint; called with a value it stores the integer angle. Used to guide bot movement direction along a path.
  >
  > Set by: bot editor command ('botcmd anglehint [angle]' in editor mode).

---

B5-RESULT | ktx:command:race_toggle | FORMAT-UNIFIED | rev=1 | from-shape: 28-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:race_toggle

- canonical_id: `ktx:command:race_toggle`
- prior length: 28 chars
- new length: 184 chars

- OLD description:
  > toggle ready status for race

- NEW description:
  > Toggles your ready status for race mode. If you are mid-run when you toggle, the run is first ended before ready status changes.
  >
  > Set by: any in-game player ('race_toggle' in-game).

---

B5-RESULT | ktx:command:removeall:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: 28-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:removeall:frogbot:std

- canonical_id: `ktx:command:removeall:frogbot:std`
- prior length: 28 chars
- new length: 94 chars

- OLD description:
  > Removes all bots from server

- NEW description:
  > Removes all Frogbots from the server in one command.
  >
  > Set by: server admin via 'botcmd removeall' command.

---

B5-RESULT | ktx:command:addpath:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 27-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:addpath:frogbot:editor

- canonical_id: `ktx:command:addpath:frogbot:editor`
- prior length: 27 chars
- new length: 246 chars

- OLD description:
  > Adds a path between markers

- NEW description:
  > Frogbot editor command. Links the saved marker to the nearest marker. First call adds one direction; second call upgrades to a bidirectional link. If both directions already exist, both are removed instead. Requires a saved marker and a nearby marker.
  >
  > Set by: bot editor command ('botcmd addpath' in editor mode).

---

B5-RESULT | ktx:command:next_best | FORMAT-UNIFIED | rev=1 | from-shape: 27-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:next_best

- canonical_id: `ktx:command:next_best`
- prior length: 27 chars
- new length: 169 chars

- OLD description:
  > set pov to next best player

- NEW description:
  > Spectator command. Switches your point-of-view to the next top-ranked player, toggling between the two best-performing players in the match. Available before and during a match.
  >
  > Set by: spectator only ('next_best' in-game).

---

B5-RESULT | ktx:command:gamemodes | FORMAT-UNIFIED | rev=1 | from-shape: 25-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:gamemodes

- canonical_id: `ktx:command:gamemodes`
- prior length: 25 chars
- new length: 135 chars

- OLD description:
  > list available game modes

- NEW description:
  > Lists the game-mode selection commands available on this server (e.g. 1on1, race, wipeout, totmode).
  >
  > Set by: any player ('gamemodes' in-game).

---

B5-RESULT | ktx:command:next_pow | FORMAT-UNIFIED | rev=1 | from-shape: 23-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:next_pow

- canonical_id: `ktx:command:next_pow`
- prior length: 23 chars
- new length: 200 chars

- OLD description:
  > set pov to next powerup

- NEW description:
  > Spectator command. Cycles your point-of-view to the next player currently holding a powerup (quad, ring, invincibility, or suit). Wraps around after the last. Prints an error if no player is carrying a powerup. Available before and during a match.
  >
  > Set by: spectator only ('next_pow' in-game).

---

B5-RESULT | ktx:command:goto:frogbot:editor | FORMAT-UNIFIED | rev=1 | from-shape: 22-char bare verb phrase with marker-# note (no Set-by) | to-shape: D20-template

### ktx:command:goto:frogbot:editor

- canonical_id: `ktx:command:goto:frogbot:editor`
- prior length: 22 chars
- new length: 137 chars

- OLD description:
  > Teleport to a marker #

- NEW description:
  > Frogbot editor command. Teleports the editing player to routing marker number N.
  >
  > Set by: bot editor command ('botcmd goto <marker#>' in editor mode).

---

B5-RESULT | ktx:command:removebot:frogbot:std | FORMAT-UNIFIED | rev=1 | from-shape: 20-char bare verb phrase (no Set-by) | to-shape: D20-template

### ktx:command:removebot:frogbot:std

- canonical_id: `ktx:command:removebot:frogbot:std`
- prior length: 20 chars
- new length: 94 chars

- OLD description:
  > Removes a single bot

- NEW description:
  > Removes the most recently added Frogbot from the server.
  >
  > Set by: server admin via 'botcmd removebot' command.

---
