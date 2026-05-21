# B5 format-unify ledger -- batch CAL

**CALIBRATION SAMPLE -- 5 rows, operator review pending**

**Batch:** CAL (5 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:cvar:k_vp_map | FORMAT-UNIFIED | rev=1 | from-shape: prose-with-backtick-formula + matchless-mode clause | to-shape: D20-template

### ktx:cvar:k_vp_map

- canonical_id: `ktx:cvar:k_vp_map`
- prior length: 584 chars
- new length: 327 chars

- OLD description:
  > The percentage of eligible voters required to pass a map-change vote. Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is `ceil(percent/100 * (players minus bots))` and is tallied against the most-voted map; in Race mode a mode-specific count is used (`race_count_votes_req(percent)`). In matchless mode this same cvar also drives the OV_BREAK vote -- i.e. the `/break` vote that becomes a next-map vote when no formal match is in progress -- so `k_vp_map` substitutes for `k_vp_break` on that path; `/break` itself is still dispatchable in matchless mode (it carries CF_MATCHLESS at registration, with no CF_MATCHLESS_ONLY).

- NEW description:
  > Percentage of eligible voters (players minus bots) required to pass a map-change vote. Values below 51 are treated as 51; maximum is 100. In Race mode a mode-specific vote-count formula is used. In matchless mode this cvar also sets the threshold for the /break (next-map) vote.
  >
  > Range: 51-100 (effective; values below 51 floor to 51).
  >
  > Default: 51.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_freshteams_sweep_gl_ammo | FORMAT-UNIFIED | rev=1 | from-shape: prose with conditional description + units note | to-shape: D20-template scalar variant

### ktx:cvar:k_freshteams_sweep_gl_ammo

- canonical_id: `ktx:cvar:k_freshteams_sweep_gl_ammo`
- prior length: 446 chars
- new length: 348 chars

- OLD description:
  > Fresh Teams (dmm1) only: the number of rockets awarded when a player picks up a grenade launcher they already own ('sweeping' it), applied only when k_freshteams and k_freshteams_limit_sweep_ammo are both enabled. The grenade launcher draws from the rocket ammo pool, so this value is added to the player's rockets. When sweep limiting is off, picking up an already-owned grenade launcher instead grants the default 5 rockets. Units are rockets (ammo count). Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set.

- NEW description:
  > Fresh Teams (dmm1) only: rockets awarded when a player picks up a grenade launcher they already own (a 'sweep'). The GL draws from the rocket ammo pool -- this value is added to the player's rocket count. Only active when both k_freshteams and k_freshteams_limit_sweep_ammo are enabled; when sweep limiting is off, sweeping a GL grants the standard 5 rockets instead.
  >
  > Range: integer rocket count (any non-negative value).
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:command:trx_play | FORMAT-UNIFIED | rev=1 | from-shape: prose with stop-then-spawn detail | to-shape: D20-template (command, no enum block needed)

### ktx:command:trx_play

- canonical_id: `ktx:command:trx_play`
- prior length: 311 chars
- new length: 217 chars

- OLD description:
  > Plays back a previously recorded 'trick' movement capture. It first stops any in-progress trick recording or playback, then, if playback is currently allowed, spawns a player-model entity that replays the recorded movement; if playback is not currently possible it prints 'can't playback now' and does nothing.

- NEW description:
  > Plays back a previously recorded trick movement capture. Stops any in-progress trick recording or playback first, then spawns a player-model entity that replays the capture. Prints 'can't playback now' and does nothing if playback is not currently possible.
  >
  > Set by: any player (in-game command).

---

B5-RESULT | ktx:cvar:k_vp_captain | FORMAT-UNIFIED | rev=1 | from-shape: prose with formula | to-shape: D20-template scalar variant

### ktx:cvar:k_vp_captain

- canonical_id: `ktx:cvar:k_vp_captain`
- prior length: 256 chars
- new length: 226 chars
- operator-edit 2026-05-21: dropped "(/captain vote)" parenthetical; KTX voting mechanism varies (/captain is self-nomination + others use /yes to approve, not a same-cmd consensus vote), so the description uses generic "captain election" framing.

- OLD description:
  > The percentage of eligible voters required to pass a captain election (the /captain vote). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)).

- NEW description:
  > Percentage of eligible voters (players minus bots) required to pass a captain election. Values below 51 are treated as 51; maximum is 100.
  >
  > Range: 51-100 (effective; values below 51 floor to 51).
  >
  > Default: 51.
  > Set by: server config.

---

B5-RESULT | ktx:command:nosweep | FORMAT-UNIFIED | rev=1 | from-shape: prose with mode-gate details | to-shape: D20-template (command, no enum block needed)

### ktx:command:nosweep

- canonical_id: `ktx:command:nosweep`
- prior length: 219 chars
- new length: 224 chars

- OLD description:
  > Toggles NoSweep mode on or off by flipping the k_nosweep setting; the new state is announced server-wide. Requires deathmatch mode 1 (dmm1) to enable, and is only accepted when a rules change is currently allowed.

- NEW description:
  > Toggles NoSweep mode on or off (flips k_nosweep) and announces the new state to all players. Only accepted during a rules-change window and only when the server is running dmm1.
  >
  > Set by: admin command 'nosweep' in-game (dmm1 + rules-change-allowed required).

---
