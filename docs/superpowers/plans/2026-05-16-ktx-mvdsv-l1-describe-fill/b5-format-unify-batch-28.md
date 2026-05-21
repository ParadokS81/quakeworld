# B5 format-unify ledger -- batch 28

**Batch:** 28 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:agree | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:agree

- canonical_id: ktx:command:agree
- prior length: 214
- new length: 231

- OLD description:
  > Selects and switches to the most recently voted map without a further vote. No-op if no map vote has occurred. The map change still goes through the normal match-in-progress and related guards before it is applied.

- NEW description:
  > Selects and switches to the most recently voted map without a further vote. No-op if no map vote has occurred. The map change still goes through the normal match-in-progress and related guards before it is applied.
  >
  > Default: n/a (command).
  > Set by: any player in-game ('agree').

---

B5-RESULT | ktx:command:airstep | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:airstep

- canonical_id: ktx:command:airstep
- prior length: 209
- new length: 246

- OLD description:
  > Toggles the server's airstep movement physics on or off by flipping the pm_airstep cvar (off->on or on->off) and broadcasting the new state to all players. Ignored while a match is in progress or in race mode.

- NEW description:
  > Toggles the server's airstep movement physics on or off and broadcasts the new state to all players. Ignored while a match is in progress or in race mode.
  >
  > Default: n/a (command).
  > Set by: admin command 'airstep' in-game (not during a live match or race).

---

B5-RESULT | ktx:command:dm | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:dm

- canonical_id: ktx:command:dm
- prior length: 213
- new length: 232

- OLD description:
  > Prints the server's current deathmatch mode (the 'deathmatch' cvar value, 1-5) to the player who runs it. It is display-only and does not change the mode -- the mode is changed by the separate dmm1..dmm5 commands.

- NEW description:
  > Prints the server's current deathmatch mode (1-5) to the player who runs it. Display-only -- the mode is changed by the separate dmm1..dmm5 commands.
  >
  > Default: n/a (command).
  > Set by: any player or spectator-admin in-game ('dm').

---

B5-RESULT | ktx:command:killquad | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:killquad

- canonical_id: ktx:command:killquad
- prior length: 165
- new length: 204

- OLD description:
  > Toggles KillQuad mode by flipping the k_killquad cvar on or off and broadcasting the new state. Player/spectator-admin command; ignored while a match is in progress.

- NEW description:
  > Toggles KillQuad mode on or off and broadcasts the new state to all players. Ignored while a match is in progress.
  >
  > Default: n/a (command).
  > Set by: player or spectator-admin command 'killquad' in-game (not during a live match).

---

B5-RESULT | ktx:command:noitems | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:noitems

- canonical_id: ktx:command:noitems
- prior length: 193
- new length: 229

- OLD description:
  > Toggles noitems mode on or off by flipping the k_noitems setting; the new state is announced server-wide. Cannot be changed while a match is in progress (the command is ignored during a match).

- NEW description:
  > Toggles noitems mode on or off and announces the new state server-wide. Ignored while a match is in progress.
  >
  > Default: n/a (command).
  > Set by: admin command 'noitems' in-game (not during a live match).

---

B5-RESULT | ktx:command:race_del_checkpoint | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:race_del_checkpoint

- canonical_id: ktx:command:race_del_checkpoint
- prior length: 190
- new length: 234

- OLD description:
  > Removes the highest-numbered checkpoint from the current map's race route. Only works in race mode and only while no race run is in progress; prints an error if the route has no checkpoints.

- NEW description:
  > Removes the highest-numbered checkpoint from the current map's race route. Only works in race mode and only while no race run is in progress; prints an error if the route has no checkpoints.
  >
  > Default: n/a (command).
  > Set by: any player in-game (race mode only, not during an active run).

---

B5-RESULT | ktx:command:time | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:time

- canonical_id: ktx:command:time
- prior length: 205
- new length: 254

- OLD description:
  > Prints the current server date and time privately to the player who issued it, formatted as weekday, month, day, then HH:MM:SS and year (server local time). It takes no arguments and changes no game state.

- NEW description:
  > Prints the current server date and time privately to the player who issued it, formatted as weekday, month, day, then HH:MM:SS and year (server local time). Takes no arguments and changes no game state.
  >
  > Default: n/a (command).
  > Set by: any player or spectator in-game ('time').

---

B5-RESULT | ktx:command:timeup1 | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:timeup1

- canonical_id: ktx:command:timeup1
- prior length: 221
- new length: 261

- OLD description:
  > Increases the match time limit (the timelimit cvar) by 1 minute and announces the new length to all players. The result is clamped to the range 0 to the k_timetop cvar. The command is ignored while a match is in progress.

- NEW description:
  > Increases the match time limit by 1 minute and announces the new length to all players. The result is clamped to 0–k_timetop. Ignored while a match is in progress.
  >
  > Default: n/a (command).
  > Set by: admin command 'timeup1' in-game (not during a live match).

---

B5-RESULT | ktx:command:toggleready | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:toggleready

- canonical_id: ktx:command:toggleready
- prior length: 224
- new length: 266

- OLD description:
  > Toggles the caller's ready state for match start: if the player is already ready it cancels ready (breaks), otherwise it readies the player up immediately. In race mode it instead toggles the player's race ready/break state.

- NEW description:
  > Toggles the caller's ready state for match start: if the player is already ready it cancels ready (breaks), otherwise it readies the player up immediately. In race mode it toggles the player's race ready/break state instead.
  >
  > Default: n/a (command).
  > Set by: any player in-game ('toggleready').

---

B5-RESULT | ktx:command:whoskin | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:whoskin

- canonical_id: ktx:command:whoskin
- prior length: 211
- new length: 255

- OLD description:
  > Prints a player-skins list to the caller: one line per connected player showing that player's "skin" userinfo value next to their name. Prints "no players" if none are connected. Works regardless of match state.

- NEW description:
  > Prints a player-skins list to the caller: one line per connected player showing that player's skin userinfo value next to their name. Prints "no players" if none are connected. Works regardless of match state.
  >
  > Default: n/a (command).
  > Set by: any player or spectator in-game ('whoskin').

---

B5-RESULT | ktx:command:-wp_stats | FORMAT-UNIFIED | rev=1 | from-shape: clean prose, no Default/Set-by | to-shape: D20-template

### ktx:command:-wp_stats

- canonical_id: ktx:command:-wp_stats
- prior length: 179
- new length: 213

- OLD description:
  > Turns off the on-screen weapon-stats overlay for the caller (the per-weapon hit/accuracy centerprint that +wp_stats enables). It is the off half of the +wp_stats / -wp_stats pair.

- NEW description:
  > Turns off the on-screen weapon-stats overlay for the caller (the per-weapon hit/accuracy centerprint that +wp_stats enables). The off half of the +wp_stats / -wp_stats pair.
  >
  > Default: n/a (command).
  > Set by: any player in-game ('-wp_stats').

---

B5-RESULT | ktx:cvar:add_q_aerowalk | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/1 semantics, no Default/Set-by | to-shape: D20-template

### ktx:cvar:add_q_aerowalk

- canonical_id: ktx:cvar:add_q_aerowalk
- prior length: 186
- new length: 233

- OLD description:
  > When set to 1, KTX spawns an extra Quad Damage on the map `aerowalk` (at a fixed location) during map setup. When 0, no extra Quad is added. Has no effect on any map other than aerowalk.

- NEW description:
  > Spawns an extra Quad Damage at a fixed location on the map aerowalk during map setup.
  >
  > 0 = no extra Quad on aerowalk.
  > 1 = extra Quad spawns on aerowalk.
  >
  > Default: 0 (code default; servers may set 1 in config). Has no effect on any other map.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:demo_scoreslength | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula inline, no Default/Set-by | to-shape: D20-template scalar variant

### ktx:cvar:demo_scoreslength

- canonical_id: ktx:cvar:demo_scoreslength
- prior length: 217
- new length: 252

- OLD description:
  > Number of seconds the end-of-game intermission (score table) is held before the server changes to the next level. The actual enforced delay is 1 + max(1, demo_scoreslength) seconds, so values below 1 are treated as 1.

- NEW description:
  > Number of seconds the end-of-game score table is displayed before the server changes to the next level. The enforced delay is 1 + max(1, demo_scoreslength), so values below 1 are treated as 1.
  >
  > Range: 0+ (seconds).
  >
  > Default: 10.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_defmap | FORMAT-UNIFIED | rev=1 | from-shape: short affirmed prose, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_defmap

- canonical_id: ktx:cvar:k_defmap
- prior length: 77
- new length: 133

- OLD description:
  > server homemap. server will change to this when last player leaves the server

- NEW description:
  > The server's home map. When the last player leaves, the server changes to this map.
  >
  > Default: "" (empty; server stays on current map if unset).
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_mode | FORMAT-UNIFIED | rev=1 | from-shape: short affirmed with enum, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_mode

- canonical_id: ktx:cvar:k_mode
- prior length: 50
- new length: 162

- OLD description:
  > server mode (1 = duel, 2 = team, 3 = ffa, 4 = ctf)

- NEW description:
  > Sets the server's game type.
  >
  > 1 = duel.
  > 2 = team.
  > 3 = ffa.
  > 4 = ctf.
  >
  > Default: 0 (unset; behaviour is mode-unspecified until set).
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_spm_glow | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/non-zero semantics, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_spm_glow

- canonical_id: ktx:cvar:k_spm_glow
- prior length: 210
- new length: 264

- OLD description:
  > Adds a glow effect to spawn-point marker entities. 0 = no glow; non-zero = the markers glow (a combined red+green dlight on normal deathmatch spawns; in CTF, team-1 spawns glow red and team-2 spawns glow blue).

- NEW description:
  > Adds a glow effect to spawn-point marker entities shown by the spawn-markers system.
  >
  > 0 = no glow on spawn markers.
  > 1 = markers glow (red+green on deathmatch spawns; team-1 red and team-2 blue in CTF).
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_sready | FORMAT-UNIFIED | rev=1 | from-shape: prose with inline 0/1 semantics, no Default/Set-by | to-shape: D20-template

### ktx:cvar:k_sready

- canonical_id: ktx:cvar:k_sready
- prior length: 202
- new length: 231

- OLD description:
  > When enabled, players who have not yet typed ready glow (a bright self-illumination) during the prewar phase. 0 = no glow; 1 = glow. The effect applies only before the match starts and not in race mode.

- NEW description:
  > Causes players who have not yet typed 'ready' to glow during the prewar phase, making unready players visually distinct.
  >
  > 0 = no glow on unready players.
  > 1 = unready players glow during prewar (not in race mode).
  >
  > Default: 0.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_vp_nospecs | FORMAT-UNIFIED | rev=1 | from-shape: prose with Range inline, no Default/Set-by | to-shape: D20-template scalar variant

### ktx:cvar:k_vp_nospecs

- canonical_id: ktx:cvar:k_vp_nospecs
- prior length: 209
- new length: 214

- OLD description:
  > Minimum share of eligible voters (as a percentage) required to pass a /nospecs vote, which toggles the server's no-spectators mode. Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100.

- NEW description:
  > Percentage of eligible voters required to pass a no-spectators vote, which toggles whether spectators are allowed on the server.
  >
  > Range: 51-100 (values below 51 treated as 51).
  >
  > Default: 51.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_vp_pickup | FORMAT-UNIFIED | rev=1 | from-shape: prose with Range inline, no Default/Set-by | to-shape: D20-template scalar variant

### ktx:cvar:k_vp_pickup

- canonical_id: ktx:cvar:k_vp_pickup
- prior length: 192
- new length: 202

- OLD description:
  > Minimum share of eligible voters (as a percentage) required to pass a pickup vote (the /pickup team-shuffle vote). Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100.

- NEW description:
  > Percentage of eligible voters required to pass a pickup team-shuffle vote.
  >
  > Range: 51-100 (values below 51 treated as 51).
  >
  > Default: 51.
  > Set by: server config only.

---

B5-RESULT | ktx:cvar:k_vp_teamoverlay | FORMAT-UNIFIED | rev=1 | from-shape: prose with Range inline, no Default/Set-by | to-shape: D20-template scalar variant

### ktx:cvar:k_vp_teamoverlay

- canonical_id: ktx:cvar:k_vp_teamoverlay
- prior length: 212
- new length: 206

- OLD description:
  > Minimum share of eligible voters (as a percentage) required to pass a /teamoverlay vote, which toggles the server's team-overlay mode. Values are clamped to 51-100; below 51 is treated as 51 and above 100 as 100.

- NEW description:
  > Percentage of eligible voters required to pass a team-overlay vote, which toggles team-overlay mode on the server.
  >
  > Range: 51-100 (values below 51 treated as 51).
  >
  > Default: 51.
  > Set by: server config only.

---
