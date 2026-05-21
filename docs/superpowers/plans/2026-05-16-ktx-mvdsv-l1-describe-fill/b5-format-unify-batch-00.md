# B5 format-unify ledger -- batch 00

**Batch:** 00 (20 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:15fav_go | FORMAT-UNIFIED | rev=1 | from-shape: prose with stuffcmd/file:line jargon + failure-message enumeration | to-shape: D20-template (command, no enum block needed)

### ktx:command:15fav_go

- canonical_id: `ktx:command:15fav_go`
- prior length: 986 chars
- new length: 397 chars

- OLD description:
  > Spectator-only command (CF_SPECTATOR). Switches your spectator view to track the player saved in favourite slot 15. The slot is filled beforehand by the matching per-slot populator command fav15_add, which stores whoever you are currently tracking into that slot; the generic fav_add command does NOT populate this slot (it writes a separate "fav" cycle list consumed by fav_next, not the per-slot favx array). If slot 15 holds no player it prints a "fav go: slot 15 is not defined" message; if the stored entity is no longer a connected player it prints "fav go: slot 15 can't find player"; if you are already tracking that player it prints "fav go: already observing...". On success it issues an internal "track <userid>" stuffcmd to your client to repoint the spectator view. Slots are addressed by a fixed family of 20 per-slot consumer commands 1fav_go..20fav_go (one command per slot, with the slot number baked into the command argument); this is the slot-15 instance.

- NEW description:
  > Spectator-only command. Switches your spectator view to track the player saved in favourite slot 15. The slot is pre-populated by the companion command 'fav15_add' (which stores whoever you are currently tracking). The generic 'fav_add' command does NOT populate per-slot favourites -- it feeds a separate cycle list used by 'fav_next'. Prints an error if the slot is empty, the stored player has disconnected, or you are already tracking them.
  >
  > One of a fixed family of 20 per-slot commands: 1fav_go through 20fav_go.
  >
  > Set by: spectator only ('15fav_go' in-game).

---

B5-RESULT | ktx:command:dmm1 | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs and code-trace detail | to-shape: D20-template (command, no enum block needed)

### ktx:command:dmm1

- canonical_id: `ktx:command:dmm1`
- prior length: 770 chars
- new length: 346 chars

- OLD description:
  > Command that switches the server to deathmatch mode 1 (sets the `deathmatch` cvar to 1 via `cvar_set` at `commands.c:2887` and announces via `G_bprint` at `:2899`). Access: any in-game player or admin spectator (`CF_PLAYER | CF_SPC_ADMIN` at `commands.c:725`); spectator non-admins are rejected by the dispatch's CF_SPC_ADMIN gate. Mode 1 is standard deathmatch: picked-up weapons are removed and respawn on a 30-second timer (or `k_freshteams_weapon_time` when freshteams is active); `k_freshteams` and `k_nosweep` are gated to mode 1 only (`world.c:1770-1777` clears them whenever `deathmatch != 1`, with adjacent comments "freshteams only in dmm1" / "nosweep only in dmm1"). As a side effect of the generic `if (dmm != 4)` branch in `ChangeDM` (`commands.c:2889-2892`), `k_midair` and `k_instagib` are also force-cleared when switching to mode 1 -- not by a mode-1-specific test but by the not-mode-4 fallback; the same clear fires for every mode switch except mode 4.

- NEW description:
  > Switches the server to deathmatch mode 1 (standard deathmatch). In dmm1, picked-up weapons are removed and respawn on a 30-second timer. The k_freshteams and k_nosweep features are only available in dmm1; switching away from mode 1 force-clears them. k_midair and k_instagib are also cleared when switching to any mode other than dmm4.
  >
  > Set by: any in-game player or admin spectator ('dmm1' in-game).

---

B5-RESULT | ktx:command:dmm3 | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs and code-trace detail | to-shape: D20-template (command, no enum block needed)

### ktx:command:dmm3

- canonical_id: `ktx:command:dmm3`
- prior length: 764 chars
- new length: 358 chars

- OLD description:
  > Command that switches the server to deathmatch mode 3 (sets the `deathmatch` cvar to 3 via `cvar_set` at `commands.c:2887` and announces via `G_bprint` at `:2899`). Access: any in-game player or admin spectator (`CF_PLAYER | CF_SPC_ADMIN` at `commands.c:727`); spectator non-admins are rejected by the dispatch's CF_SPC_ADMIN gate. In mode 3 picked-up weapons stay on the ground for others to grab (`items.c:835` -- `leave=1` when `deathmatch == 3`; `:1047` `if (leave) { ItemTaken(self, other); return; }`) and ammo respawn time is halved to 15 seconds instead of the default 30 (`items.c:1342/1347-1349` -- the 30-second `nextthink` is overwritten with 15 when `deathmatch == 3 || == 5`). As a side effect of the generic `if (dmm != 4)` branch in `ChangeDM` (`commands.c:2889-2892`), `k_midair` and `k_instagib` are also force-cleared when switching to mode 3 -- not by a mode-3-specific test but by the not-mode-4 fallback; the same clear fires for every mode switch except mode 4.

- NEW description:
  > Switches the server to deathmatch mode 3. In dmm3, picked-up weapons stay on the ground for others to grab (weapons are not removed on pickup), and ammo respawn time is halved to 15 seconds. k_midair and k_instagib are also cleared when switching to any mode other than dmm4.
  >
  > Set by: any in-game player or admin spectator ('dmm3' in-game).

---

B5-RESULT | ktx:command:midair_minheight | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-variable names, and medal-vs-tier detail | to-shape: D20-template (command, no enum block needed)

### ktx:command:midair_minheight

- canonical_id: `ktx:command:midair_minheight`
- prior length: 1268 chars
- new length: 475 chars

- OLD description:
  > Cycles the rocket-damage-floor tier for midair mode one step each invocation, by reading and writing the `k_midair_minheight` cvar in the sequence 0 -> 1 -> 2 -> 3 -> 4 -> 0, and broadcasts the new tier as "Midair minimum height set to <label> enabled level" with the label being "ground" / "bronze" / "silver" / "gold" / "platinum" for values 0/1/2/3/4 respectively. The tier sets the minimum airborne height (target's height above the ground at impact) below which rocket damage in midair mode is zeroed -- no damage means no frag is awarded. Floor heights at runtime are 64 / 128 / 256 / 512 / 1024 Quake units for tiers 0/1/2/3/4; value 0 broadcasts as "ground" but still enforces a 64-unit floor (it is not "no minimum"). The bronze/silver/gold/platinum labels coincide with the names of the midair-frag medal ranks, but the medal a midair frag earns at runtime is computed independently from the z-delta between target and rocket (>1024 platinum, >512 gold, >256 silver, else bronze) -- the cvar tier governs the damage floor, not the medal awarded. Requires midair mode on (k_midair = 1) or it refuses with "Midair must be turned on to set minimal frag height". Subject to is_rules_change_allowed() (the standard rules-change permission check).

- NEW description:
  > Cycles the rocket-damage floor tier for midair mode one step per invocation, advancing k_midair_minheight in the sequence 0 -> 1 -> 2 -> 3 -> 4 -> 0. Broadcasts the new tier by name: 0 = ground (64 units), 1 = bronze (128), 2 = silver (256), 3 = gold (512), 4 = platinum (1024). Rockets that hit a target below the selected floor deal no damage. The tier labels share names with midair medal ranks but the medal earned is computed separately from the actual height of each frag. Refuses if midair mode is off or a rules change is not currently allowed.
  >
  > Set by: admin command 'midair_minheight' in-game (rules-change window required).

---

B5-RESULT | ktx:command:pickspawn | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs and code-trace detail | to-shape: D20-template (command, no enum block needed)

### ktx:command:pickspawn

- canonical_id: `ktx:command:pickspawn`
- prior length: 1393 chars
- new length: 487 chars

- OLD description:
  > Nominates the spawn point nearest the player's current position. In hoonymode duel each player picks their own spawns; outside hoonymode duel the command branches into a TEAM path that requires the caller's team be "red" or "blue" (otherwise refuses with "Command only available in hoonymode duel mode") -- note this team path checks team membership only and does NOT verify that hoonymode is active, so a non-hoony red/blue team game still reaches the nomination logic. Refused with "Command not available during game" while a match is in progress or in intermission. Running it on a spawn the player (duel) or the player's team (team path) has already nominated unpicks it (broadcasts "... unpicks ..."); refused with a "... has already been picked by ..." message when the closest spawn is held by someone else; refused with "Team already has <n> spawns allocated" once a team has reached `maxclients/2` spawns. On a successful pick the spawn is broadcast (e.g. "... picks spawn ...") and any prior self-nomination (duel) is deselected first.

- NEW description:
  > Nominates the spawn point nearest the player's current position. In hoonymode duel, each player nominates their own spawns. In team mode, nominees are per-team (red/blue) with a cap of maxclients/2 spawns per team. Running the command on an already-nominated spawn unpicks it. Refused if the closest spawn is held by the opposing team, the team cap is reached, or a match is in progress.
  >
  > Set by: any in-game player ('pickspawn' during prewar).

---

B5-RESULT | ktx:command:shownick | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, cone-math detail, and code-variable names | to-shape: D20-template (command, no enum block needed)

### ktx:command:shownick

- canonical_id: `ktx:command:shownick`
- prior length: 2004 chars
- new length: 452 chars

- OLD description:
  > Reports info about the player the issuer is currently aiming at. The command requires Team or CTF mode to operate while a match is in progress -- in prewar (`!match_in_progress`) it is allowed in any game type. It ray-casts along the caller's view direction, picks the closest on-screen player within roughly a 60-degree cone (the `miss > dist * 1.7` cull at `commands.c:3898`) and in line of sight (multi-corner traceline check), preferring small angular miss. While a match is in progress the candidate pool is filtered to the caller's own team (same `team` infokey); in prewar any player is eligible. For version 1 it sends a machine-readable `"//sn <fields...>"` stuffcmd to the caller for the client HUD to render (index, position, health, armor, items, ammo, nick). For version 0 (the default, including no argument) it builds a text block (powerups Pent/Quad/Suit, armor type:value, weapon-specific ammo on RL/LG/GL/SNG/SSG/NG/SG/axe, health, and nick) and emits it as an on-screen CENTERPRINT (`G_centerprint`), not as console text -- the centerprint is auto-cleared 0.8 s later. Does nothing if no eligible player is being aimed at.

- NEW description:
  > Reports stats for the player you are currently aiming at. In prewar, any visible player is eligible; during a live match only teammates are shown (Team / CTF mode required). Uses line-of-sight detection within a ~60-degree cone around your aim direction.
  >
  > 0 = (default) displays a centerprint with the target's powerups, armor, ammo per weapon, health, and nick (auto-cleared after 0.8 s).
  > 1 = sends a machine-readable data line to your client HUD instead.
  >
  > Set by: any player ('shownick' or 'shownick 1' in-game).

---

B5-RESULT | ktx:command:socd | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-variable names, file:line refs, and frame-count details | to-shape: D20-template

### ktx:command:socd

- canonical_id: `ktx:command:socd`
- prior length: 1250 chars
- new length: 387 chars

- OLD description:
  > Cycles the server's SOCD (simultaneous-opposing-cardinal-direction, i.e. left+right or forward+back held together) handling mode on each invocation and broadcasts the new mode to everyone. The cvar `k_socd` advances through 0 -> 1 -> 2 -> 3 -> 0 (wrap), with broadcast strings: 0 "SOCD: allow", 1 "SOCD: stats after game", 2 "SOCD: warn on violation", 3 "SOCD: kick on violation". Behaviour by mode at runtime: 0 = allow (no enforcement); 1 = collect detection stats and report after the game (`k_socd >= SOCD_STATS` reporting gate at `stats.c:767`); 2 = warn the offending player only after they have accumulated at least 3 detections (`socdDetectionCount >= 3`), and only when no match is in progress; 3 = kick the offending player at the same `socdDetectionCount >= 3` threshold (in or out of match). A single detection itself requires accumulating 25 strafe-change frames with a frame-perfect ratio >= 0.75 -- a detection is not per-violation but per-burst. The command itself is refused (silent return) while a match is in progress; the detection logic in client think runs independently of this gate.

- NEW description:
  > Cycles the k_socd enforcement level one step per invocation (0 -> 1 -> 2 -> 3 -> 0) and announces the new mode. Cannot be used while a match is in progress.
  >
  > 0 = allow (SOCD inputs are not acted on).
  > 1 = stats only (post-game SOCD detection count is reported).
  > 2 = warn (broadcasts a public warning after repeated detections, prewar only).
  > 3 = kick (force-disconnects the player after repeated detections).
  >
  > Set by: admin command 'socd' in-game (not allowed during a live match).

---

B5-RESULT | ktx:cvar:k_clan_arena | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-function names, and spawn-loadout detail | to-shape: D20-template

### ktx:cvar:k_clan_arena

- canonical_id: `ktx:cvar:k_clan_arena`
- prior length: 1613 chars
- new length: 440 chars

- OLD description:
  > Selects the round-based arena game mode (CA family). 0 = disabled (normal game); 1 = Clan Arena; 2 = Wipeout (a Clan Arena variant with additional round/respawn handling). When nonzero in a team game, `isCA()` returns true (`isTeam() && cvar("k_clan_arena")`) and the server runs the CA round/match flow (`CA_Frame()` at `world.c:1886`): at round start `CA_PutClientInServer` (`clan_arena.c:534-545`) hands each player axe + SG + NG + SNG + SSG + RL + GL + LG and IT_ARMOR3 (red armor), 200 armorvalue with 0.8 armortype, and ammo 200/100/50/150 -- players spawn fully equipped. The "no in-round item pickups" property holds transitively through this full-loadout spawn + CA-conventional stripped maps; no item-touch site in `items.c` (health/weapon/armor/ammo/powerup/backpack) carries an `isCA()` or `k_clan_arena` gate. A round ends when one team is fully eliminated (`CA_check_alive_teams` -> `EndRound`); the match ends best-of via `CA_wins_required()`. Dead players become ghosts (`SOLID_NOT`, `MOVETYPE_NOCLIP`, empty model). Wipeout-specific branches gate on `cvar("k_clan_arena") == 2` -- e.g. `round_deaths` tracking + line-of-sight checks in spawn-selection.

- NEW description:
  > Selects the round-based arena mode. Each round, all players spawn fully equipped; rounds end when one team is fully eliminated.
  >
  > 0 = disabled (normal team game).
  > 1 = Clan Arena (standard round-based play).
  > 2 = Wipeout (CA variant with additional respawn handling per round).
  >
  > Default: 0.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_cmd_fp_per | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-variable names, file:line refs, and circular-buffer detail | to-shape: D20-template scalar variant

### ktx:cvar:k_cmd_fp_per

- canonical_id: `ktx:cvar:k_cmd_fp_per`
- prior length: 1706 chars
- new length: 389 chars

- OLD description:
  > Command flood-protection time window, in seconds (clamped 0-30; if 0 it falls back to the built-in default of 4 -- see FixCmdFloodProtect). Flood-protection tracks the last `k_cmd_fp_count` (default 10, clamped to MAX_FP_CMDS=10) protected-command timestamps in a per-player circular buffer; flood fires when the OLDEST tracked timestamp is more recent than `k_cmd_fp_per` seconds ago -- i.e. when k_cmd_fp_count commands have been issued within k_cmd_fp_per seconds. On flood: the player is locked out for `k_cmd_fp_for` seconds and accrues a warning ("You are a command flooder man!"); after `k_cmd_fp_kick` accumulated warnings the player is force-disconnected ("Go away!" + stuffcmd("disconnect\n")) unless `k_cmd_fp_dontkick` is set. While `sv_paused` is on, flood checks are skipped. Reported to players as "Command floodprot: N commands allowed per M sec., skip commands for X sec." (N = k_cmd_fp_count, M = k_cmd_fp_per, X = k_cmd_fp_for).

- NEW description:
  > Time window (in seconds) for command flood protection. A player triggers flood protection when they issue k_cmd_fp_count commands within this many seconds. On flood, the player is locked out for k_cmd_fp_for seconds and warned; after k_cmd_fp_kick accumulated warnings they are force-disconnected (unless k_cmd_fp_dontkick is set). Value 0 falls back to a hardcoded default of 4 seconds.
  >
  > Range: 0-30 (clamped; 0 = effective 4).
  >
  > Default: 0 (effective 4 seconds).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_ctf_rune_bounce | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-variable names, and bitmask explanation | to-shape: D20-template

### ktx:cvar:k_ctf_rune_bounce

- canonical_id: `ktx:cvar:k_ctf_rune_bounce`
- prior length: 1556 chars
- new length: 480 chars

- OLD description:
  > CTF runes only. Bitmask controlling whether two specific rune-spawn paths use bounce physics (MOVETYPE_BOUNCE) or settle-on-land physics (MOVETYPE_TOSS); registered default `3` (both bits on). Bit 1 (`value & 1`) governs the auto-respawn FALLBACK path inside `DoDropRune` -- it is consulted only when no dedicated rune-spawn entity (`item_rune_res`/`_str`/`_hst`/`_rgn`) is found on the map and the rune has to be dropped on the player's own position instead; with bit 1 set the fallback rune gets bounce physics with a randomized velocity, unset it gets toss physics. Bit 2 (`value & 2`) governs the VOLUNTARY `tossrune` command (player typing `tossrune` to discard a held rune); set = the tossed rune bounces, unset = it settles. The two bits combine independently, so 0 = neither path bounces, 1 = only the auto-respawn fallback bounces, 2 = only the `tossrune` command bounces, 3 = both bounce. On-death rune drops (`PlayerDie` -> `DropRune` -> `DoDropRune(rune, false)`) are NOT controlled by this cvar -- they are hardcoded to settle-on-land physics.

- NEW description:
  > CTF runes only. Bitmask controlling bounce physics for two rune-drop paths. On-death rune drops are hardcoded to settle-on-land and are not affected by this cvar.
  >
  > 0 = neither path bounces (both settle on landing).
  > 1 = auto-respawn fallback path bounces (when no map rune-spawn entity exists).
  > 2 = voluntary 'tossrune' command bounces.
  > 3 = both paths bounce.
  >
  > Default: 3.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_aim_lgpref | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-variable names, file:line refs, and probability-formula detail | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_lgpref

- canonical_id: `ktx:cvar:k_fbskill_aim_lgpref`
- prior length: 1376 chars
- new length: 410 chars

- OLD description:
  > Frogbot AI weapon-selection tuning: the probability (0..1) that the bot proactively switches to the Lightning Gun during weapon choice. At each weapon-select decision the bot picks LG when it is already firing LG OR when this value is greater than or equal to a fresh uniform random number, subject to LG being usable (not server-disabled via `k_disallow_weapons & IT_LIGHTNING`), the bot owning LG (`has_lg`), the enemy within 600 unit range (`self->fb.enemy_dist <= 600`), AND the bot either being above waterlevel 1 (not deep underwater) OR currently holding Pentagram of Protection (IT_INVULNERABILITY override -- bot DOES pick LG while deep underwater if pent-protected). 1 = always prefer LG when usable; 0 = never proactively switch to LG; intermediate values select LG that fraction of the time. Clamped to 0..1 per-bot via `bound(0, cvar(FB_CVAR_LGPREF), 1)`. Normally set automatically from the configured bot skill (`RangeOverSkill(skill, 0.2f, 1.0f)`), not by hand.

- NEW description:
  > Frogbot AI tuning: probability (0 to 1) that the bot proactively switches to the Lightning Gun during weapon selection. At each decision the bot picks LG when already firing it, or randomly based on this value. Only applies when the bot owns LG, the enemy is within 600 units, and the bot is not deep underwater (unless protected by Pentagram). Normally derived automatically from bot skill level; manual override is possible.
  >
  > Range: 0 to 1 (0 = never proactively switch to LG; 1 = always prefer LG when available).
  >
  > Default: derived from bot skill (via RangeOverSkill).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_aim_pitch_multiplier | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-variable names, file:line refs, and distribution-math detail | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_aim_pitch_multiplier

- canonical_id: `ktx:cvar:k_fbskill_aim_pitch_multiplier`
- prior length: 1520 chars
- new length: 418 chars

- OLD description:
  > Frogbot AI tuning cvar shaping the vertical (pitch) aim-error random distribution. After the pitch error magnitude is clamped (bound(pitch->minimum, fabs(raw_pitch_diff)*pitch->scale, pitch->maximum)), the randomized offset is drawn by dist_random(-pitch_diff, pitch_diff, pitch->multiplier * current_volatility). Inside dist_random the spreadFactor argument is applied as a LINEAR scaling of the deviation from the mean -- `sum = bound(0.0f, 3 + (sum - 3) * spreadFactor, 6.0f)` -- so this cvar value (multiplied by the bot's current_volatility) widens the distribution and pushes mass toward the extremes when >1, and narrows it toward the centre when <1; the underlying shape is still the six-uniform-sum normal-ish curve, only its standard-deviation scale changes (it is not an exponent and not a pow). Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].multiplier. The server normally derives the value from the bot's aim-skill level via RangeOverSkill (initial set at bot_botimp.c:176 and refresh at :227); setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning: scales the spread of the bot's vertical (pitch) aim error. Values above 1 widen the distribution and push error toward the extremes; values below 1 narrow it toward the centre. The underlying distribution shape is unchanged -- only its standard-deviation scale is affected. Normally derived automatically from bot skill level; manual override is possible.
  >
  > Range: 0 to 10 (clamped per bot).
  >
  > Default: derived from bot skill (via RangeOverSkill).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_fbskill_wiggleframes | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-variable names, and mode-scope detail | to-shape: D20-template scalar variant

### ktx:cvar:k_fbskill_wiggleframes

- canonical_id: `ktx:cvar:k_fbskill_wiggleframes`
- prior length: 1753 chars
- new length: 452 chars

- OLD description:
  > Frogbot AI movement tuning: the amplitude, in movement-think ticks, of the bot's side-to-side `wiggle run` in deathmatch 4. The movement-wiggle branch in `bot_movement.c` runs while `deathmatch == 4`: each move-think tick increments (or decrements) `self->fb.wiggle_run_dir`, reversing direction when the counter passes +/- this cvar's value -- so a larger value makes the bot drift further to one side before swapping back (wider, slower oscillation), a smaller value gives a tighter, faster zig-zag. The damage-induced wiggle-direction flip runs while `deathmatch >= 4` and only triggers once `abs(wiggle_run_dir)` exceeds half this cvar's value (and `g_random() < wiggle_toggle`). Each bot reads the cvar once into a per-bot integer `wiggle_run_limit` clamped to 0..45 at attribute-setup. Mode scope: the wiggle is active in dmm==4 broadly (movement) and dmm>=4 (damage-flip); however, in dmm>=4 duel specifically the movement wiggle is GATED OFF by `bot_movement.c:141` `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4) return;` unless the per-bot `wiggle_run_dmm4` attribute is set, and that attribute defaults to enabled only for bot skill > 10 (per `bot_botimp.c:199/:251`). Normally set automatically from the configured bot skill (`RangeOverSkill(skill, 30, 20)` at `bot_botimp.c:202/:254`), not by hand.

- NEW description:
  > Frogbot AI movement tuning: amplitude (in movement ticks) of the bot's side-to-side wiggle run in dmm4. Larger values produce a wider, slower oscillation; smaller values produce a tighter, faster zig-zag. In dmm4 duel the wiggle is off by default for lower-skill bots and only enabled for skill > 10. Normally derived automatically from bot skill level; manual override is possible.
  >
  > Range: 0 to 45 (clamped per bot).
  >
  > Default: derived from bot skill (via RangeOverSkill).
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_hoonymode | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, predicate-function names, and mode-scope detail | to-shape: D20-template

### ktx:cvar:k_hoonymode

- canonical_id: `ktx:cvar:k_hoonymode`
- prior length: 2141 chars
- new length: 476 chars

- OLD description:
  > Enables HoonyMode, a round-based match format ported from CPMA (best-of-N point rounds with rigged / nominated spawns). 0 = off; non-zero = on. The round-by-round STRUCTURE -- the point ladder, nominated-spawn voting, and per-point flow -- is gated to duel and team modes via `isHoonyModeDuel()` (`isDuel() && cvar(k_hoonymode)`) and `isHoonyModeTDM()` (`isTeam() && cvar(k_hoonymode)`); in FFA or CTF those structural paths are skipped. However, several AUXILIARY behaviors fire via the mode-agnostic `isHoonyModeAny()` (which is just the cvar) and so activate in any game type when the cvar is set: normal sudden-death and fraglimit-driven `EndMatch` are suppressed (`combat.c:320`), the match-end announcement switches to "The point is over" + `HM_point_stats` (`match.c:324`), the fraglimit row is hidden from the rules text (`match.c:1687`), the hoony spawn-point picker is used at respawn (`client.c:1865/2058`), and the normal "won the match" frag-pop is suppressed (`client.c:2559`). KTX does not force the cvar back to 0 outside duel/team -- it stays where it was set. Practical reading: the cvar is intended for duel and team-game use; setting it in FFA or CTF still toggles the auxiliary side effects but does not run the round structure. Registered default `0`.

- NEW description:
  > Enables HoonyMode, a round-based format (best-of-N points with nominated spawns, ported from CPMA). The round-by-round structure (point ladder, spawn nominations, per-point flow) is active in duel and team modes. Setting this in FFA or CTF skips the round structure but still suppresses the standard fraglimit and match-end behaviour -- intended use is duel and team mode only.
  >
  > 0 = HoonyMode off.
  > 1 = HoonyMode on.
  >
  > Default: 0.
  > Set by: server config or 'hoonymode' admin command in-game.

---

B5-RESULT | ktx:cvar:k_midair_minheight | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-variable names, floor-cascade detail | to-shape: D20-template

### ktx:cvar:k_midair_minheight

- canonical_id: `ktx:cvar:k_midair_minheight`
- prior length: 1648 chars
- new length: 499 chars

- OLD description:
  > Sets the rocket-damage floor for midair mode: the minimum airborne height (the target's height above the ground, computed by a downward traceline from the target's origin at the moment of damage application) a target must exceed for rocket damage to apply. Cvar values 1/2/3/4 map to floor heights 128/256/512/1024 Quake units; value 0 or any out-of-range value falls into the else branch with a 64-unit floor. Below the selected floor, rocket damage to that target is zeroed so no frag is awarded; the same midair block also separately zeros rocket damage below 45 units when the target is out of water. The registered default is "1" (-> 128-unit floor), so unset is not the value-0 64-unit floor but the tier-1 128-unit floor. Has no effect unless k_midair is on -- the entire floor check (and the broader midair damage block) is gated by k_midair at runtime. The matching cycling command `midair_minheight` reads/writes this cvar and broadcasts a per-tier label ("ground" for value 0, "bronze" / "silver" / "gold" / "platinum" for 1/2/3/4); those labels are tier-name flavor only. Midair-frag medal ranks (bronze/silver/gold/platinum) are computed independently in MidairDamageBonus from the per-frag z-delta between target and inflictor (>1024 platinum, >512 gold, >256 silver, else bronze) and do not correspond to this cvar's tier value.

- NEW description:
  > Minimum airborne height a target must exceed for rocket damage to apply in midair mode. Rockets hitting a target below the floor deal no damage. Has no effect unless k_midair is on. Cycle with the 'midair_minheight' admin command.
  >
  > 0 = 64 units (ground tier).
  > 1 = 128 units (bronze tier).
  > 2 = 256 units (silver tier).
  > 3 = 512 units (gold tier).
  > 4 = 1024 units (platinum tier).
  >
  > Default: 1 (128-unit floor).
  > Set by: server config or 'midair_minheight' admin command in-game.

---

B5-RESULT | ktx:cvar:k_pow_p | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-function names, and polarity-inversion note | to-shape: D20-template

### ktx:cvar:k_pow_p

- canonical_id: `ktx:cvar:k_pow_p`
- prior length: 1504 chars
- new length: 460 chars

- OLD description:
  > Per-type switch for the Pentagram of Protection (invulnerability) powerup at spawn and pickup. 0 = pentagram entities are hidden at spawn (`hide_powerups("item_artifact_invulnerability")` at `world.c:1389-1396`) and refused on touch (`powerup_touch` at `items.c:2037-2043` early-returns when `((items & IT_INVULNERABILITY) && !cvar("k_pow_p"))`); 1 = pentagram entities are shown and may be picked up. Only takes effect while powerups are globally enabled (`k_pow`); when `k_pow` is off the whole powerup category is reported "off" regardless of the per-type switches, and the per-type switches together determine whether the powerup state reports as "off", "on", or a partial subset (e.g. "p" if only pentagram active). The death-drop side of pentagrams is NOT governed by this cvar -- `DropPowerups` (player death-drop at `items.c:1972-1996`) carries branches only for QUAD (gated by `dq` + `k_pow_q` + ...) and Ring (`dr` + `k_pow_r`), so players unconditionally never drop a held Pentagram on death regardless of `k_pow_p`. (The single k_pow_p-gated DropPowerup site is at `sp_monsters.c:665-667` -- monster random drop, opposite polarity: k_pow_p ON -> monster CAN drop a pent.)

- NEW description:
  > Per-type toggle for the Pentagram of Protection (invulnerability) powerup. When disabled, pentagram entities are hidden at spawn and cannot be picked up. Only takes effect when powerups are globally enabled (k_pow). Players never drop a held Pentagram on death regardless of this setting.
  >
  > 0 = Pentagram disabled (hidden and unpickable).
  > 1 = Pentagram enabled (spawns and may be picked up).
  >
  > Default: 1.
  > Set by: server config.

---

B5-RESULT | ktx:cvar:k_socd | FORMAT-UNIFIED | rev=1 | from-shape: prose with code-variable names, file:line refs, and frame-count detail | to-shape: D20-template

### ktx:cvar:k_socd

- canonical_id: `ktx:cvar:k_socd`
- prior length: 1822 chars
- new length: 468 chars

- OLD description:
  > Enforcement level for SOCD / movement-assistance ('iDrive' or keyboard strafe-assistance) detection. 0 = SOCD_ALLOW (no public action; detection counters still tick silently). 1 = SOCD_STATS (post-game stats line "Movement / SOCD detections" is printed for non-bot players). 2 = SOCD_WARN (a public broadcast "[ver] Warning! <netname>: Movement assistance detected. Please disable iDrive or keyboard strafe assistance features." is printed when detection triggers, gated on no-match-in-progress AND non-bot AND ctPlayer AND socdDetectionCount>=3). 3 = SOCD_KICK (a public "Kicked!" broadcast plus stuffcmd("disconnect\n") force-disconnect, gated on non-bot AND ctPlayer AND socdDetectionCount>=3). The per-frame strafe-change counting AND the socdDetectionCount increment (when frame-perfect ratio >= 0.75 over 25 strafe changes) run for every player including bots; only the warn / kick / stats outputs are gated on `!isBot`, so bots accumulate detection counters silently but never trigger a public message, disconnect, or stats line. Registered default is "1" (SOCD_STATS).

- NEW description:
  > Enforcement level for SOCD (simultaneous-opposing-cardinal-direction) / movement-assistance detection. Detection runs continuously for all players; warn and kick outputs apply to human players only.
  >
  > 0 = allow (detection runs silently, no public action).
  > 1 = stats only (SOCD detection count shown in post-game stats).
  > 2 = warn (public warning broadcast after repeated detections, prewar only).
  > 3 = kick (force-disconnect after repeated detections).
  >
  > Default: 1.
  > Set by: server config or 'socd' admin command in-game.

---

B5-RESULT | ktx:cvar:k_spw | FORMAT-UNIFIED | rev=1 | from-shape: long prose with file:line refs, predicate-function names, and per-sub-feature gating detail | to-shape: D20-template

### ktx:cvar:k_spw

- canonical_id: `ktx:cvar:k_spw`
- prior length: 2270 chars
- new length: 497 chars

- OLD description:
  > Selects the spawn-point selection algorithm used when players (re)spawn. Valid range -1 to 4, enforced by the cycling spawn-mode command `spawn` (`ToggleRespawns` at `commands.c:2676`) via `bound(-1, cvar('k_spw'), 4)` with wrap past 4 back to -1. Human-readable names per `respawn_model_name()`: -1 = pre-qtest nonrandom respawns; 0 = normal QW respawns; 1 = KT SpawnSafety; 2 = Kombat Teams respawns; 3 = KTX respawns; 4 = KTX2 respawns. The mode interacts with several spawn-selection sub-features at distinct keys (not a single "higher modes add more" progression):
  >
  > - Nearby-live-player exclusion. A candidate spawn spot is marked bad (`pcount++`) when a live player is nearby; this base behaviour runs for every mode. Modes 2, 3, 4 in an active match (`match_in_progress == 2`) RELAX this exclusion when the nearby player's `k_1spawn` spawn-protection window (~2.6 s) has already elapsed -- the spot is re-admitted because the player is no longer "fresh".
  >
  > - Same-spot-as-last-time exclusion. When `k_spw && (k_spw != 4) && match_in_progress == 2` and the candidate equals the player's last spawn, the spot is marked bad. Gates on modes 1, 2, 3 -- NOT 4.
  >
  > - Explicit push-away (SpawnSafety / anti-telefrag). Inside a fallback branch reached only when no acceptable spawn was found (`!numspots`), the handler picks a random spot then optionally traceline-pushes nearby live players away from it via `setorigin`. Push-away gate: `!match_in_progress || k_spw == 1 || (k_spw == 2 && !k_checkx)` -- primarily keyed to mode 1 (with a mode-2 sub-case when `k_checkx` is off), and not added by higher modes 3 or 4. Out-of-match the push-away runs for any mode.
  >
  > - Spawn re-check. After a spot is picked, if it equals `k_lastspawn` and `match_in_progress == 2`, the selection is re-run once when `k_spw == 4` or in wipeout (`k_clan_arena == 2`).

- NEW description:
  > Selects the spawn-point selection algorithm. Cycle with the 'spawn' admin command (-1 -> 0 -> 1 -> 2 -> 3 -> 4 -> -1).
  >
  > -1 = pre-qtest (nonrandom).
  > 0 = normal QW respawns.
  > 1 = KT SpawnSafety (anti-telefrag push-away active).
  > 2 = Kombat Teams respawns (relaxed nearby-player exclusion in-match; SpawnSafety when k_checkx is off).
  > 3 = KTX respawns (relaxed nearby-player exclusion in-match; same-spot exclusion active).
  > 4 = KTX2 respawns (relaxed nearby-player exclusion; no same-spot exclusion; spawn re-check active).
  >
  > Default: 0.
  > Set by: server config or 'spawn' admin command in-game.

---

B5-RESULT | ktx:cvar:_k_coachteam1 | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-variable names, and dead-code explanation | to-shape: D20-template (dormant internal cvar)

### ktx:cvar:_k_coachteam1

- canonical_id: `ktx:cvar:_k_coachteam1`
- prior length: 1570 chars
- new length: 264 chars

- OLD description:
  > Internal-only cvar registered by KTX (bare `RegisterCvar`, so the runtime default is empty) but never assigned anywhere in the KTX source. The single read site is inside `FixPlayerTeam` (`g_userinfo.c:362-364`), in a captain-style team-lock branch that requires `k_coaches == 2 && self->k_picked == 1`; the `k_picked` field is only set by the captain flow (`captain.c`), and coaches identify themselves via `self->k_coach` and are caught earlier by the `coach_num(self) || is_elected(self, etCoach)` gate at `g_userinfo.c:343-353` (which refuses team change and stuffs the client back to `getteam(self)`). The `k_picked == 1` branch that reads this cvar is therefore unreachable from the coach flow, and the cvar reads as "" regardless, so it has no observable effect on team-locking at runtime. The shape mirrors `_k_captteam1` (`captain.c:389`), but the corresponding coach write side was never ported, leaving this cvar registered-but-dormant.

- NEW description:
  > Internal cvar registered by KTX but never written anywhere in the source. Intended as the coach-side equivalent of _k_captteam1 (which stores captain team assignments), but the write side was never implemented. Has no observable effect at runtime.
  >
  > Default: empty (internal; do not set manually).
  > Set by: never (dormant -- no write path exists).

---

B5-RESULT | ktx:cvar:_k_worldspawns | FORMAT-UNIFIED | rev=1 | from-shape: prose with file:line refs, code-function names, and off-by-one explanation | to-shape: D20-template (internal counter)

### ktx:cvar:_k_worldspawns

- canonical_id: `ktx:cvar:_k_worldspawns`
- prior length: 1648 chars
- new length: 353 chars

- OLD description:
  > Internal counter (integer) of how many maps the server has spawned since the process started, incremented by 1 each map at FirstFrame. The first-map-only sentinel block (in FirstFrame, after the increment) reads the post-increment value: when it equals 1 it captures the initial sv_minping and seeds the default-mode bookkeeping. SEPARATELY, the default-map-checker schedule in SP_worldspawn (which runs at entity-parse time, BEFORE FirstFrame, on the pre-increment value) checks for value==1 and, when true, schedules the next map-check ~0.5 seconds out; otherwise it schedules ~60-90 seconds out. Because the increment runs after SP_worldspawn, the 0.5-second short-delay branch fires only on the SECOND map of the process (when the pre-increment value is 1, left there by the first map's FirstFrame); the first map and all maps from the third onward take the 60-90-second branch. Registered with no default (empty/0); internal, not for manual setting.

- NEW description:
  > Internal counter of how many maps the server has loaded since the process started. Incremented once per map. Used internally to gate first-map-only initialisation and to determine the map-check scheduling interval. Not intended for manual configuration.
  >
  > Default: empty/0 (internal; do not set manually).
  > Set by: automatically by the server on each map load.

---
