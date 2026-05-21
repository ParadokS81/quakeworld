# B4 ledger -- specific-value-contradiction batch (LEAN v2)

**Batch id:** B4 (per `b4-unique-rows-triage-plan.md`)
**Batch name:** `specific-value-contradiction`
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Member count:** 19 rows
**Triage classification confidence:** HYPOTHESIS-WEAK
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth contract. B5 Stage-2 change-report ledger per row.
**Prompt:** lean v2 batch-template (single terminal, inline understanding +
inline authoring + ~2 sample blind-verify subagents on the highest-
variation rows + inline self-check on the remaining).

## v2-shape note

This batch is HYPOTHESIS-WEAK: there is no shared code site across the
19 rows. Each row's specific-value contradiction lives at its own
enforcing file:line, already cited in its V-pass seed. Per the lean v2
template, Step 4 (cluster-shared root V-pass) is SKIPPED -- each row's
V-pass seed citation is the per-row anchor; per-row authoring is the
work. Sample-verify rotates across ~2 rows (rather than concentrating
on one) since per-row work is the per-row work.

## Pre-reads (loaded at session start)

- `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
  -- B1 method, classification enum, 2026-05-20 callee-follow amendment
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-triage-plan.md`
  -- Pass 1 6-batch plan; this batch's section
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
  D7 Amendment 2026-05-19 (B4) -- seeded re-synth contract
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-midair-minheight.md`
  -- lean v2 calibration; ledger shape + Step 8 report
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md`
  -- prior cluster; Init_cmds finding + dropquad rev=3 callee-follow

## Cluster-shared root V-pass

SKIPPED -- B4 is HYPOTHESIS-WEAK per the triage plan; no shared code
site to V-pass. Per-row authoring proceeds from each row's V-pass seed
citation directly.

Candidate sub-template noted in the triage plan ("k_matchless and
k_matchless_max_idle_time may share a related code site"): the two
rows touch world.c at adjacent but DIFFERENT lines (k_matchless at
world.c:1637-1647 + 1100-1104; k_matchless_max_idle_time at
world.c:1097-1099 + match.c:638-650). Domain-adjacent but no shared
enforcing line for the defects. Handled per-row.

## C4 (non-negotiable)

- Read-only on the L1 database. No UPDATE / INSERT / schema change.
- No file writes outside this LEDGER + `/tmp/b4-specific-value-contradiction/`
  scratch.
- The V-pass seed is MANDATORY per row; never overridden in-terminal.
  Contested seed -> HALT + escalate.
- ELABORATION DISCIPLINE + callee-follow apply to every authored clause.
- Bounded 3 attempts per sampled row. No convergence -> HALT row,
  escalate residue, move on.

---

## Results

B4-RESULT | ktx:command:berzerk | TRACED-CLEAN | rev=1 | seed-clause: "prints the new 'Berzerk mode on/off' state to the issuer" (broadcast scope wrong) | new-clause: broadcasts "<netname> enables|disables Berzerk mode" to all players via G_bprint

### ktx:command:berzerk

- canonical_id: `ktx:command:berzerk`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "prints the new 'Berzerk mode on/off' state to the issuer" -> MISMATCH at `src/g_utils.c:2215` (cvar_toggle_msg's emit is `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg)` -- a server-wide broadcast to ALL players, not an issuer-private readout; the literal string is "<netname> enables|disables Berzerk mode", not "Berzerk mode on/off").
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_berzerk.md`.

- OLD description:
  > Toggles Berzerk mode on the server by flipping the k_bzk cvar, and prints the new 'Berzerk mode on/off' state to the issuer. The command is ignored while a match is in progress (it only takes effect in the pre-match / matchless state). It is a player command but, during a match, restricted to spectator-admins.

- NEW description:
  > Toggles Berzerk mode on the server by flipping the k_bzk cvar, and broadcasts "<netname> enables Berzerk mode" or "<netname> disables Berzerk mode" to all players on each toggle. The command is ignored while a match is in progress (it only takes effect in the pre-match / matchless state). It is a player command (CF_PLAYER) that also accepts admin spectators via CF_SPC_ADMIN (after Init_cmds promotion to CF_SPECTATOR), so non-admin spectators are refused with "You are not an admin"; admin spectators may issue it.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. C-FIX corrected: handler `ToggleBerzerk` at `src/commands.c:3242-3250` calls `cvar_toggle_msg(self, "k_bzk", redtext("Berzerk mode"))` at :3249; the helper at `src/g_utils.c:2204-2219` reads `!cvar("k_bzk")` at :2211, writes the new value at :2218, and emits `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg)` at :2215 where `Enables(f)` at `g_utils.c:1832-1835` returns "enables" or "disables" -- so the literal broadcast text is "<netname> enables|disables Berzerk mode" to ALL players (G_bprint = server-wide), not an issuer-private "on/off" readout. Match-in-progress gate at `src/commands.c:3244-3247`. Access-class via cluster-shared root from `b4-ledger-dead-spc-admin-cluster.md`: registration `src/commands.c:956` `CF_PLAYER | CF_SPC_ADMIN`; Init_cmds promotion `:1448-1450` adds CF_SPECTATOR; dispatch `:1088-1117` admits any in-game player at :1106 and admin spectators at :1096-1099 (with "You are not an admin" refusal for non-admin specs).

- NEW source_ref: `src/commands.c:3249` (handler entry's cvar_toggle_msg call)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Toggles Berzerk mode by flipping the k_bzk cvar" -> `src/commands.c:3249` + `src/g_utils.c:2211,2218`
  - "broadcasts '<netname> enables|disables Berzerk mode' to all players on each toggle" -> `src/g_utils.c:2215` + `src/g_utils.c:1834` (Enables) + `src/commands.c:3249` (msg=redtext("Berzerk mode"))
  - "ignored while a match is in progress" -> `src/commands.c:3244-3247`
  - "Player command (CF_PLAYER); also accepts admin spectators via CF_SPC_ADMIN after Init_cmds promotion" -> `src/commands.c:956` (registration) + `:1448-1450` (Init_cmds promotion) + `:1096-1099` (admin-spec dispatch + "You are not an admin") + `:1106` (player dispatch)
- verify route: inline-self-check (sample-verify budget spent on handicap + k_cmd_fp_per; this row's clauses are mechanically symmetrical to instagib_coilgun_kickback -- same cvar_toggle_msg + Init_cmds-promoted access-class + match-in-progress silent-return pattern, both verified)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:ctfbasedspawn | TRACED-CLEAN | rev=1 | seed-clause: "value 2 = spawn strictly within the home base" (value-2 semantics wrong) | new-clause: value 2 = 50/50 random pick between neutral mid-map info_player_deathmatch and home-base _deathmatch spawns

### ktx:command:ctfbasedspawn

- canonical_id: `ktx:command:ctfbasedspawn`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "value 2 (spawn strictly within the home base)" -> MISMATCH at `src/client.c:1899-1904`: the sole value-2 read-site does `SelectSpawnPoint(g_random() <= 0.5 ? "info_player_deathmatch" : streq(getteam(self),"red") ? "info_player_team1_deathmatch" : "info_player_team2_deathmatch")` -- a 50/50 random pick between a NEUTRAL mid-map info_player_deathmatch and a home-base _deathmatch spawn (the adjacent comment at :1896-1898 calls out "fish in a barrel" / overrun-flag avoidance as the rationale). "Strictly within home base" contradicts the enforcing line.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_ctfbasedspawn.md`.

- OLD description:
  > Toggles CTF base-spawning on or off. When enabled, players spawn at their own team's base instead of from the normal deathmatch spawn points; the read use-sites distinguish value 1 (team/base-based spawn) from value 2 (spawn strictly within the home base). CTF mode only -- in non-CTF the command refuses with a message. The change is rejected while a match is in progress unless the server is matchless, and on maps that have one or fewer normal deathmatch spawn points base-spawn is force-enabled regardless of this setting.

- NEW description:
  > Toggles the `k_ctf_based_spawn` cvar between 0 and 1, controlling CTF spawn-point selection: value 1 spawns at the caller's team base (info_player_team1 / info_player_team2), and value 2 (set separately, not via this toggle) spawns at a 50/50 random pick between a neutral mid-map deathmatch spawn (info_player_deathmatch) and a home-base deathmatch spawn (info_player_team1_deathmatch / info_player_team2_deathmatch), to avoid being repeatedly spawn-killed when the flag is overrun. CTF mode only -- in non-CTF the command refuses with "Can't do this in non CTF mode". The change is rejected while a match is in progress unless the server is matchless. On maps that have one or fewer info_player_deathmatch entities, a base-spawn enforcement message is printed and the toggle is refused (the value is also auto-promoted to 1 at world-load when it would otherwise be 0).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `CTFBasedSpawn` at `src/ctf.c:849-871`: match-or-matchless gate :851, non-CTF refusal :856-861 with literal "Can't do this in non CTF mode\n", sparse-map refusal :863-868 with "Spawn on base enforced due to map limitation\n", toggle :870 via cvar_toggle_msg("k_ctf_based_spawn", redtext("spawn on base")). C-FIX corrected: the value-2 read-site at `src/client.c:1899-1904` does `g_random() <= 0.5 ? "info_player_deathmatch" : (red ? "info_player_team1_deathmatch" : "info_player_team2_deathmatch")` -- not "strictly within home base"; rationale at the adjacent comment `client.c:1896-1898` ("neutral spawn points in the mid of the map", "flag position is overrun ... players are instagibbed over and over again"). Value-1 spawn at `client.c:1891-1894` -> `info_player_team{1,2}`. Auto-promotion 0->1 on sparse maps at `src/world.c:622-625` is gated `!cvar("k_ctf_based_spawn")` (only when value is currently 0/falsy; value 2 is preserved). NOTE: the toggle (cvar_toggle_msg) only flips between 0 and 1; value 2 is set externally (config / direct cvar set), not by this command -- the description marks this explicitly.

- NEW source_ref: `src/ctf.c:870` (handler's cvar_toggle_msg call)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Toggles k_ctf_based_spawn between 0 and 1" -> `src/ctf.c:870` + `src/g_utils.c:2211,2218`
  - "value 1 spawns at own team base (info_player_team1/team2)" -> `src/client.c:1891-1894`
  - "value 2 spawns at 50/50 pick between neutral mid-map and home-base _deathmatch spawns" -> `src/client.c:1899-1904` + adjacent comment `:1896-1898`
  - "CTF mode only; non-CTF refuses with 'Can't do this in non CTF mode'" -> `src/ctf.c:856-861`
  - "rejected while match in progress unless matchless" -> `src/ctf.c:851-854`
  - "sparse-map refusal 'Spawn on base enforced due to map limitation'" -> `src/ctf.c:863-868`
  - "auto-promotion 0->1 at world-load on sparse maps" -> `src/world.c:622-625` (gated `!cvar("k_ctf_based_spawn")` so value 2 preserved)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:handicap | TRACED-CLEAN | rev=1 | seed-clause: "lower values reduce ... the protection you receive" (defensive half untraceable) + "Refused with a message while a match is in progress" (match-refusal is silent) | new-clause: handicap scales only attacker-side damage; match-in-progress refusal is silent (no message); admin-lock + LGC refusals do print messages

### ktx:command:handicap

- canonical_id: `ktx:command:handicap`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX (untraceable defensive clause): "lower values reduce the damage you deal and/or the protection you receive" -> the "protection you receive" half is UNTRACEABLE; every GetHandicap read-site (`src/combat.c:618` attacker-only; `src/match.c:1384/2859` display; `src/stats_json.c:366` display; `src/commands.c:5092` display) lacks a target-side gate that reduces armor or damage taken. Only attacker-side scaling exists at `src/combat.c:618-627` (`damage *= 0.01f * hdp` on the attacker's hdp). flavour-C clause.
  - C-FIX (silent vs message): "Refused with a message while a match is in progress" -> MISMATCH at `src/g_utils.c:1669-1672`: `if (match_in_progress) { return false; }` -- bare return with no G_sprint/G_bprint; the handler `handicap` at `src/commands.c:5230` calls `SetHandicap(self, atoi(arg_2))` and DISCARDS the return value -- so the issuer gets no message. The admin-lock and LGC refusals DO print messages.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_handicap.md`.

- OLD description:
  > Player command that sets your own handicap level. Takes one numeric argument (a percentage from 50 to 150); 100 means handicap is off, lower values reduce the damage you deal and/or the protection you receive. Refused with a message while a match is in progress, when the server admin has locked handicap changes, and entirely in LGC mode (where it prints "Handicap is not allowed in LGC mode"). With no argument it prints the usage hint instead of changing anything.

- NEW description:
  > Player command that sets your own handicap level. Takes one numeric argument (a percentage from 50 to 150); 100 means handicap is off, and lower values scale down the damage YOU deal as the attacker (handicap is read attacker-side only -- it does not change the damage or armor protection a handicapped player receives as the target). Silently refused while a match is in progress (no message to the issuer). Refused with a printed message when the server admin has locked handicap changes ("handicap changes are not allowed"). Refused entirely in LGC mode (prints "Handicap is not allowed in LGC mode" before any other check). With no argument it prints the usage hint "use: /handicap value, value from 50 to 150" instead of changing anything.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. C-FIX corrected (defensive half): wide-grep for `GetHandicap` shows attacker-only damage scaling at `src/combat.c:618-627` (`if ((hdp = GetHandicap(attacker)) != 100) { ... damage *= 0.01f * hdp; }`); the other call sites at `match.c:1384/2859`, `stats_json.c:366`, `commands.c:5092` are display-only. No target-side site reduces incoming damage or armor for a handicapped target -- the "protection you receive" half had no enforcing line. C-FIX corrected (silent vs message): `SetHandicap` at `src/g_utils.c:1665-1700` checks `if (match_in_progress) { return false; }` at :1669-1672 (no G_sprint), and the caller `handicap` at `src/commands.c:5208-5231` discards SetHandicap's return at :5230, so the issuer gets NO message. The admin-lock and LGC refusals at `src/g_utils.c:1674-1679` and `src/commands.c:5213-5218` DO print. LGC check at `:5213-5218` fires before argc check (so even with no args, LGC mode refuses first). Argc check at `:5221-5226` prints usage hint when `trap_CmdArgc() != 2`. Argument parse at `:5228`; SetHandicap at `:5230`. SetHandicap bound at `src/g_utils.c:1660` (`bound(50, p->ps.handicap, 150)`, 100 sentinel when <1).

- NEW source_ref: `src/commands.c:5208` (handler entry `handicap`)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Player command sets your own handicap level" -> `src/commands.c:836` (registration CF_PLAYER) + `:5208,5230` (handler -> SetHandicap)
  - "one numeric argument (50-150)" -> `src/commands.c:5221-5230` (argc + atoi) + `src/g_utils.c:1660` (`bound(50, ..., 150)`)
  - "100 = handicap off" -> `src/g_utils.c:1660` (100 sentinel when <1) + `src/combat.c:618` (skip when hdp==100)
  - "lower values scale down damage you deal as attacker (attacker-side only)" -> `src/combat.c:618-627`
  - "no target-side gate (does not change damage/armor received)" -> wide-grep `GetHandicap`: attacker-only at `combat.c:618`; display-only at `match.c:1384/2859`, `stats_json.c:366`, `commands.c:5092`
  - "silently refused while match in progress" -> `src/g_utils.c:1669-1672` (bare `return false`) + `src/commands.c:5230` (caller discards return)
  - "admin-lock refuses with printed message" -> `src/g_utils.c:1674-1679`
  - "LGC mode refuses with 'Handicap is not allowed in LGC mode'" -> `src/commands.c:5213-5218`
  - "no argument prints usage hint" -> `src/commands.c:5221-5226`
- verify route: sample-verify (subagent: Opus 4.7 MAX, blind; subagent id `a9aa9657e88f9422b`)
- verify verdict: TRACED-CLEAN (10 clauses, all MATCH; the verifier independently confirmed attacker-only scaling at `src/combat.c:618-626`, silent match-in-progress at `src/g_utils.c:1669-1672`, admin-lock printed-message at `:1674-1679`, LGC literal "Handicap is not allowed in LGC mode" at `src/commands.c:5213-5218`, usage hint at `:5221-5226`)
- attempts: 1

---

B4-RESULT | ktx:command:instagib_coilgun_kickback | TRACED-CLEAN | rev=1 | seed-clause: 'Broadcasts "Coilgun kickback ON" / "OFF" on toggle' (literal string never produced) | new-clause: broadcasts "<netname> enables|disables Coilgun kickback" via cvar_toggle_msg

### ktx:command:instagib_coilgun_kickback

- canonical_id: `ktx:command:instagib_coilgun_kickback`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: 'Broadcasts "Coilgun kickback ON" / "OFF" on toggle' -> MISMATCH at `src/g_utils.c:2215` + `:1832-1835` -- cvar_toggle_msg emits `G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg)` with `Enables(f)` returning "enables"/"disables" and `msg = redtext("Coilgun kickback")`; the resulting literal is "<netname> enables|disables Coilgun kickback", never "ON"/"OFF".
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_instagib_coilgun_kickback.md`.

- OLD description:
  > Toggles the self-knockback (recoil) on the Instagib coilgun by flipping the k_cg_kb cvar. When on, each coilgun shot also spawns an invisible "kickback" projectile that pushes the shooter, enabling coilgun-jumping; when off, the coilgun imparts no recoil. Requires Instagib to be active (k_instagib non-zero) or it is refused with "cg_kb requires Instagib". Player/spectator-admin command; ignored while a match is in progress. Broadcasts "Coilgun kickback ON" / "OFF" on toggle.

- NEW description:
  > Toggles the self-knockback (recoil) on the Instagib coilgun by flipping the k_cg_kb cvar. When on, each coilgun shot also spawns an invisible "kickback" projectile that pushes the shooter, enabling coilgun-jumping; when off, the coilgun imparts no recoil. Requires Instagib to be active (k_instagib non-zero) or it is refused with "cg_kb requires Instagib". Player command (CF_PLAYER) that also accepts admin spectators via CF_SPC_ADMIN (after Init_cmds promotion to CF_SPECTATOR); non-admin spectators are refused with "You are not an admin". Ignored while a match is in progress. Each toggle broadcasts "<netname> enables Coilgun kickback" or "<netname> disables Coilgun kickback" to all players.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `ToggleCGKickback` at `src/commands.c:7884-7899`: match-in-progress refusal :7886-7889 (silent return), Instagib precondition :7891-7895 with literal "cg_kb requires Instagib\n", toggle :7898 via cvar_toggle_msg("k_cg_kb", redtext("Coilgun kickback")). C-FIX corrected: the broadcast literal at `src/g_utils.c:2215` is "<netname> enables|disables Coilgun kickback" via G_bprint to all players (not "ON"/"OFF"). Behavior clauses: kickback-projectile spawn at `src/weapons.c:438-462` wrapped in `if (cvar("k_cg_kb"))`; touch handler `T_InstaKickback` at :451; classname "kickback" at :456; missile lifetime via :454-455. Access-class via cluster-shared root: registration `src/commands.c:959` `CF_PLAYER | CF_SPC_ADMIN`; Init_cmds promotion `:1448-1450` -> CF_SPECTATOR; dispatch admits any player at :1106 and admin specs at :1096-1099.

- NEW source_ref: `src/commands.c:7898` (handler's cvar_toggle_msg call)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Toggles k_cg_kb (Instagib coilgun self-knockback)" -> `src/commands.c:7898` + `src/g_utils.c:2211,2218`
  - "spawns invisible 'kickback' projectile that pushes shooter (when on)" -> `src/weapons.c:438-462` (gated by `cvar("k_cg_kb")`); classname "kickback" `:456`, touch T_InstaKickback `:451`
  - "no recoil when off" -> `src/weapons.c:438` (`if (cvar("k_cg_kb"))` wraps entire spawn block)
  - "requires k_instagib; refused with 'cg_kb requires Instagib'" -> `src/commands.c:7891-7895`
  - "Player command + admin-spec via CF_SPC_ADMIN; non-admin specs refused 'You are not an admin'" -> `src/commands.c:959` (registration) + `:1448-1450` (Init_cmds promotion) + `:1096-1099` (admin-spec dispatch) + `:1106` (player)
  - "ignored while a match is in progress" -> `src/commands.c:7886-7889`
  - "broadcasts '<netname> enables|disables Coilgun kickback' to all players" -> `src/g_utils.c:2215` + `:1834` (Enables) + `src/commands.c:7898` (msg=redtext("Coilgun kickback"))
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:report | TRACED-CLEAN | rev=1 | seed-clause: "private ... to each living teammate" + "nothing is shown ... to the caller" (recipient scope wrong on both halves) | new-clause: sent to every same-team ctPlayer (including dead-awaiting-respawn ctPlayer and the caller themselves)

### ktx:command:report

- canonical_id: `ktx:command:report`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX (living): "to each living teammate" -> MISMATCH at `src/commands.c:2623` -- the loop is `for (p = world; (p = find_plr(p));)`; `find_plr` at `src/g_utils.c:1315` returns ANY ctPlayer with NO health/alive check, so a dead-awaiting-respawn teammate (still ctPlayer) receives the report.
  - C-FIX (caller exclusion): "or to the caller" -> MISMATCH at `src/commands.c:2623,2625` -- find_plr iterates ALL ctPlayer including self; the team-mismatch filter at :2625 (`if (strneq(t1, t2 = getteam(p))) continue;`) DOES NOT exclude self (self shares self's team), so G_sprint(p=self, ...) fires and the caller DOES receive the full report.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_report.md`.

- OLD description:
  > Sends a private teamplay status report about the calling player to each living teammate: armor type and value (or a:0 if none), current health, the active weapon and its ammo count, and red-text markers for held Ring of Shadows (eyes), Pentagram (666), and Quad. Only teammates on the same team receive the message; nothing is shown to enemies or to the caller.

- NEW description:
  > Sends a teamplay status report about the calling player to every player on the caller's own team (including the caller themselves, and including dead teammates who are still in the player slot waiting to respawn -- the recipient loop selects every ctPlayer with no alive/health filter): armor type and value (or "a:0" if none), current health, the active weapon and its ammo count, and red-text markers for held Ring of Shadows ("eyes"), Pentagram ("666"), and Quad ("quad"). Enemies (players on a different team) are filtered out and do not receive it. If the caller has set a teamplay nickname (`k_nick` or `k` userinfo key), the report is prefixed with that nickname instead of their name.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `ReportMe` at `src/commands.c:2562-2674`. Recipient loop at :2623 `for (p = world; (p = find_plr(p));)`: find_plr at `src/g_utils.c:1315` returns the next ctPlayer regardless of health/alive state -- so dead-awaiting-respawn ctPlayer are still iterated (C-FIX for "living"). Team filter at :2625 `if (strneq(t1, t2 = getteam(p))) continue;` -- this drops cross-team players but does NOT exclude self (self's team matches self's team), so the caller receives the report (C-FIX for "nothing to the caller"). Body of the per-recipient print: nickname prefix at :2630-2640 (k_nick / k userinfo), else netname+": " at :2643; armor at :2646-2653 ("a:0" else `<armortype>:<armorvalue>`); health + weapon/ammo at :2655 ("h:%d  %s%d"); IT_INVISIBILITY ("eyes") at :2657-2660, IT_INVULNERABILITY ("666") at :2662-2665, IT_QUAD ("quad") at :2667-2670; line terminator at :2672. Weapon-pick chain at :2576-2619 ("axe:" default, then sg/ng/ssg/sng/gl/lg/rl from items bitmask). NOTE: "private" is dropped from the description -- a same-team-broadcast (including self) is not "private" in the issuer-only sense.

- NEW source_ref: `src/commands.c:2562` (handler entry ReportMe)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Sends a teamplay status report about the calling player" -> `src/commands.c:2562` (handler) + per-clause body cites below
  - "to every player on the caller's team (including dead-awaiting-respawn ctPlayer)" -> `src/commands.c:2623` (find_plr loop) + `src/g_utils.c:1315` (find_plr returns any ctPlayer, no health/alive check)
  - "including the caller themselves" -> `src/commands.c:2625` (team filter does not exclude self)
  - "armor type/value or 'a:0'" -> `src/commands.c:2646-2653`
  - "current health" -> `src/commands.c:2655`
  - "active weapon and ammo" -> `src/commands.c:2576-2619` (weapon pick) + `:2655` (format)
  - "red-text 'eyes' for Ring of Shadows" -> `src/commands.c:2657-2660` (`& 524288` = IT_INVISIBILITY)
  - "red-text '666' for Pentagram" -> `src/commands.c:2662-2665` (`& 1048576` = IT_INVULNERABILITY)
  - "red-text 'quad' for Quad" -> `src/commands.c:2667-2670` (`& 4194304` = IT_QUAD)
  - "enemies are filtered out" -> `src/commands.c:2625` (team-mismatch `continue`)
  - "k_nick / k userinfo nickname prefix when set" -> `src/commands.c:2568-2570` (flag) + `:2630-2640` (apply)
- verify route: inline-self-check (sample-verify allocation went to handicap + k_cmd_fp_per; recipient-scope citations independently grep-verified against `src/g_utils.c:1315` find_plr definition + the team-filter at `:2625` which lacks self-exclusion)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:rnd | TRACED-CLEAN | rev=1 | seed-clause: "two or more space-separated arguments" + "fewer than two arguments it prints a usage hint" (argc threshold off-by-one) | new-clause: requires at least ONE user-supplied argument (argc>=2 including argv[0]=command name); with zero user args prints usage hint, with one arg trivially "selects" that single arg

### ktx:command:rnd

- canonical_id: `ktx:command:rnd`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "two or more space-separated arguments" + "with fewer than two arguments it prints a usage hint" -> MISMATCH at `src/commands.c:6712-6722` -- `trap_CmdArgc()` includes `argv[0]` (the command token itself); the guard `if ((argc = trap_CmdArgc()) < 2)` therefore fires only when there are ZERO user-supplied arguments. With ONE user arg (argc==2) the guard does NOT fire; the loop runs once, the build-string contains that single arg, and `i_rnd(1, argc-1) = i_rnd(1, 1)` returns `from` per `src/g_utils.c:61-66` -> selects the single arg.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_rnd.md`.

- OLD description:
  > Takes two or more space-separated arguments and randomly selects one of them, broadcasting to all players the list of candidates and the chosen value. With fewer than two arguments it prints a usage hint to the caller. Disabled while a match is in progress.

- NEW description:
  > Takes one or more space-separated arguments and randomly selects one of them, broadcasting to all players the list of candidates ("Random select by <netname> from: <a, b, ...>") and the chosen value ("selected: <x>"). With zero user-supplied arguments it prints "usage: rnd <1st 2nd ...>" to the caller; with one argument that single value is trivially "selected" and broadcast. Refused silently while a match is in progress (early return, no message).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `krnd` at `src/commands.c:6707-6740`. Match-in-progress refusal at :6713-6716 (silent early return; no G_sprint). C-FIX corrected: argc threshold. `trap_CmdArgc()` returns the count including argv[0] (the command name itself -- confirmed by sibling-convention callers at `src/commands.c:5376/9224` using `<2` to mean "no user arg"); the guard at :6718-6722 `if ((argc = trap_CmdArgc()) < 2)` therefore prints usage only when ZERO user args were given. With argc==2 (one user arg) the loop at :6725-6731 runs i=1 (one iteration), builds buf with that single value, and `i_rnd(1, argc-1) = i_rnd(1, 1)` returns `from=1` per `src/g_utils.c:61-68`, so `trap_CmdArgv(1, ...)` selects that single user arg -- trivially valid. Broadcast format at :6733-6735 ("%s %s %s:\n\220%s\221\n" with redtext("Random select by"), getname(self), redtext("from"), buf) + :6739 ("selected: \220%s\221\n", arg_x). Usage string at :6720 is verbatim "usage: rnd <1st 2nd ...>\n".

- NEW source_ref: `src/commands.c:6737` (selection site via i_rnd)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "takes one or more space-separated arguments and randomly selects one" -> `src/commands.c:6725-6731` (build buf) + `:6737` (i_rnd selection) + `src/g_utils.c:61-68` (i_rnd from>=to returns from)
  - "with zero user-supplied args prints usage 'usage: rnd <1st 2nd ...>'" -> `src/commands.c:6718-6722` (argc<2 = zero user args, with argv[0]=command name)
  - "with one argument that single value is trivially selected and broadcast" -> `src/commands.c:6725-6731` (loop i=1 only) + `:6737` (i_rnd(1,1)=1) + `src/g_utils.c:65-67`
  - "broadcasts 'Random select by <netname> from: <list>' and 'selected: <x>'" -> `src/commands.c:6733-6735` + `:6739`
  - "silently refused while a match is in progress" -> `src/commands.c:6713-6716` (bare return, no G_sprint)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:rpickup | TRACED-CLEAN | rev=1 | seed-clause: "vote is rejected (with a message) if a match is in progress" (match-in-progress rejection is silent, not messaged) | new-clause: match-in-progress rejection is silent; the captains/coaches/<4 rejections do print messages

### ktx:command:rpickup

- canonical_id: `ktx:command:rpickup`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "The vote is rejected (with a message) if a match is in progress, captain or coach picking is active, or fewer than 4 players are present" -> MISMATCH at `src/commands.c:5518-5521` -- the match-in-progress branch is a SILENT early return with no G_sprint/G_bprint. The "(with a message)" qualifier reads as universal across the three conditions, but it only holds for captains (`:5524`), coaches (`:5531`), and <4 players (`:5538`); the match-in-progress branch is silent.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_rpickup.md`.

- OLD description:
  > Toggles the calling player's vote for a random-team pickup; when enough players vote, teams are shuffled randomly. The vote is rejected (with a message) if a match is in progress, captain or coach picking is active, or fewer than 4 players are present. Casting and withdrawing the vote is broadcast to everyone, along with the number of additional votes still required.

- NEW description:
  > Toggles the calling player's vote for a random-team pickup; when the required vote count is reached (or when an admin votes with veto), teams are reshuffled randomly. Silently refused while a match is in progress (early return, no message to the issuer). Refused with a printed message in three other cases: "No random pickup when captain stuffing" (captain picking active), "No random pickup when coach stuffing" (coach picking active), and "You need at least 4 players to do this." (fewer than 4 in-game players). Casting and withdrawing the vote is broadcast to everyone as "<netname> votes for rpickup!" or "<netname> withdraws his|her rpickup vote!", followed by the number of additional votes still required in parentheses.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler at `src/commands.c:5513-5557` (within `vote_for_rpickup`). C-FIX corrected: match-in-progress at :5518-5521 is `if (match_in_progress) { return; }` -- bare return, no G_sprint. The three OTHER rejection branches DO print: captains :5523-5528 ("No random pickup when captain stuffing"), coaches :5530-5535 ("No random pickup when coach stuffing"), <4 players :5538-5543 ("You need at least 4 players to do this."). Toggle at :5545 `self->v.rpickup = !self->v.rpickup;`. Broadcast at :5547-5554 ("<netname> votes for rpickup!" or "<netname> withdraws his|her rpickup vote!" + " (N)" if get_votes_req returns positive). Reshuffle trigger via `vote_check_rpickup` at :5556 -> `vote.c:792-794` `if (veto || !get_votes_req(OV_RPICKUP, true)) { ... pl_idx = bound(0, (int)(frnd * pl_cnt), pl_cnt - 1); p->k_teamnumber = tn; }` (random shuffle on quorum or admin veto). Access-class noted via registration `src/commands.c:807` `CF_PLAYER | CF_SPC_ADMIN` + Init_cmds promotion -- description carries no access-class clause.

- NEW source_ref: `src/commands.c:5545` (toggle site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Toggles the calling player's vote for a random-team pickup" -> `src/commands.c:5545`
  - "when required vote count reached (or admin veto), teams reshuffled randomly" -> `src/commands.c:5556` -> `src/vote.c:792-808` (random k_teamnumber assignment)
  - "silently refused while match in progress" -> `src/commands.c:5518-5521` (bare return)
  - "captains: 'No random pickup when captain stuffing'" -> `src/commands.c:5523-5528`
  - "coaches: 'No random pickup when coach stuffing'" -> `src/commands.c:5530-5535`
  - "<4 players: 'You need at least 4 players to do this.'" -> `src/commands.c:5538-5543`
  - "broadcasts vote-cast/withdraw with remaining vote count in parentheses" -> `src/commands.c:5547-5554`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:teleportcap | TRACED-CLEAN | rev=1 | seed-clause: "Called with no argument (or while a match in progress) prints the current cap" (no-arg path actually zeroes the cap) | new-clause: with no argument the cap is set to 0 (argv[0] always present so argc>=1; only match-in-progress prints the current value)

### ktx:command:teleportcap

- canonical_id: `ktx:command:teleportcap`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "Called with no argument (or while a match in progress) prints the current cap" -> MISMATCH at `src/commands.c:8666` -- the guard `if (match_in_progress || trap_CmdArgc() < 1)` has `trap_CmdArgc() < 1` effectively UNREACHABLE: argv[0] (the command token itself) is always present so argc>=1. With no user arg + no match-in-progress, the guard is FALSE; control falls through to :8673-8676 where `trap_CmdArgv(1, arg, ...)` returns an empty string, `atoi("") = 0`, `bound(0, 0, 100) = 0`, and `cvar_fset("k_teleport_cap", 0)` -- the cap is SET TO ZERO, not printed. Only the match-in-progress branch prints the current cap.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_command_teleportcap.md`.

- OLD description:
  > Sets the teleport-cap percentage used by yawn mode. Yawn mode (k_yawnmode) must be on; if it is off the command does nothing and reports that yawn mode is required. Called with no argument (or while a match is in progress) it prints the current cap as a percent. Called with a numeric argument it sets the cap to that value clamped to 0-100 (percent), stores it in the k_teleport_cap cvar, re-applies yawn-mode settings immediately, and broadcasts the new value as a percentage.

- NEW description:
  > Sets the teleport-cap percentage used by yawn mode (k_teleport_cap). Yawn mode (k_yawnmode) must be on; if it is off the command does nothing and reports "Yawn mode required to be on". Called while a match is in progress, it prints "Teleport cap is <N>%" and changes nothing. Called outside a match with no argument, the cap is set to 0 (because the empty arg parses to atoi("")==0; the argc-based usage check is structurally unreachable). Called with a numeric argument, it sets the cap to that value clamped to 0-100, writes the k_teleport_cap cvar, re-applies yawn-mode settings immediately via FixYawnMode(), and broadcasts "<netname> set Teleport cap to <N>%" to all players. Yawn-mode horizontal momentum on teleport is then scaled by `(1.0 - k_teleport_cap/100.0)` with a 300-unit speed floor.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `setTeleportCap` at `src/commands.c:8655-8681`. Yawn-mode precondition at :8659-8664 -- literal "Yawn mode required to be on" with redtext("Yawn mode") prefix. C-FIX corrected: the guard at :8666 `if (match_in_progress || trap_CmdArgc() < 1)` -- since argv[0] is the command token, `trap_CmdArgc()` returns >=1 always; so `argc < 1` is unreachable and only the match_in_progress disjunct triggers the print at :8668. With no user arg + no match: guard false -> fall to :8673-8676 -> `trap_CmdArgv(1, arg, ...)` writes empty string -> `atoi("") = 0` -> `bound(0, 0, 100) = 0` -> `cvar_fset("k_teleport_cap", 0)` zeroes the cvar. Numeric-arg path: argument parse :8673, clamp :8675, cvar write :8676, FixYawnMode :8678, broadcast :8680 ("%s set %s to %d%%" with redtext("Teleport cap")). Consumer at `src/triggers.c:582-588`: gated `k_yawnmode`; `vel = vlen(player->s.v.velocity) * (1.0 - k_teleport_cap / 100.0)`; 300-unit floor at :591. Access class `CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS` at `src/commands.c:998` -- description does not assert one.

- NEW source_ref: `src/commands.c:8676` (k_teleport_cap write site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Sets the teleport-cap percentage used by yawn mode" -> `src/commands.c:8674-8676` + `src/triggers.c:582-588`
  - "Yawn mode must be on; refuses with 'Yawn mode required to be on'" -> `src/commands.c:8659-8664`
  - "with match in progress prints 'Teleport cap is N%' and changes nothing" -> `src/commands.c:8666-8670`
  - "outside a match with no argument the cap is set to 0 (argc<1 unreachable; empty arg -> atoi=0)" -> `src/commands.c:8666` (guard reachability) + :8673-8676 (empty arg path)
  - "numeric argument sets cap clamped 0-100" -> `src/commands.c:8674-8675`
  - "writes k_teleport_cap cvar" -> `src/commands.c:8676`
  - "re-applies yawn-mode via FixYawnMode" -> `src/commands.c:8678`
  - "broadcasts '<netname> set Teleport cap to N%'" -> `src/commands.c:8680`
  - "yawn-mode horizontal momentum on teleport scaled by (1.0 - k_teleport_cap/100.0) with 300-unit floor" -> `src/triggers.c:582-591`
- verify route: inline-self-check (sample-verify budget spent on handicap + k_cmd_fp_per; argc<1 reachability re-checked: `trap_CmdArgc` returns >=1 always per the rnd row's sibling-convention check, so the no-arg/no-match path falls through to the cvar_fset(0) write)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:_k_worldspawns | TRACED-CLEAN | rev=1 | seed-clause: "shortens the default-map-checker delay (about 0.5 seconds on the first spawn versus 60-90 seconds on later spawns)" (off-by-one: the 0.5s branch fires on the SECOND map, not the first) | new-clause: the 0.5s delay branch fires on the second map only (value==1 at SP_worldspawn pre-increment); first map sees 60-90s; third+ maps see 60-90s

### ktx:cvar:_k_worldspawns

- canonical_id: `ktx:cvar:_k_worldspawns`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "shortens the default-map-checker delay (about 0.5 seconds on the first spawn versus 60-90 seconds on later spawns)" -> MISMATCH at `src/world.c:545`. `Spawn_DefMapChecker(cvar("_k_worldspawns") == 1 ? 0.5 : 60 + g_random() * 30)` runs in SP_worldspawn (called during entity parse, BEFORE FirstFrame). The increment at `src/world.c:1116` runs in FirstFrame (framecount==1, AFTER SP_worldspawn). So on the FIRST map _k_worldspawns is still 0 at :545 (cvar default 0; sole writer is :1116; nothing else sets it) -- the 60-90s branch is taken. The 0.5s branch fires on the SECOND map (value left at 1 by the first map's FirstFrame). The OLD description has "first/later" semantics flipped vs the enforcing line.
  - The :1118 sentinel block (`if (cvar("_k_worldspawns") == 1)`) is a DIFFERENT site, INSIDE FirstFrame and POST-increment, where value==1 correctly marks the first map. The OLD description conflates the two contexts. The first-map sentinel + sv_minping capture is correctly attributed; the default-map-checker timing is mis-attributed.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar__k_worldspawns.md`.

- OLD description:
  > Internal counter of how many maps the server has spawned since the process started; incremented by 1 on each map spawn. A value of 1 marks the very first map of the server process and is used as a sentinel: it triggers first-map-only initialization (capturing the initial sv_minping) and shortens the default-map-checker delay (about 0.5 seconds on the first spawn versus 60-90 seconds on later spawns). Integer; internal, not for manual setting.

- NEW description:
  > Internal counter (integer) of how many maps the server has spawned since the process started, incremented by 1 each map at FirstFrame. The first-map-only sentinel block (in FirstFrame, after the increment) reads the post-increment value: when it equals 1 it captures the initial sv_minping and seeds the default-mode bookkeeping. SEPARATELY, the default-map-checker schedule in SP_worldspawn (which runs at entity-parse time, BEFORE FirstFrame, on the pre-increment value) checks for value==1 and, when true, schedules the next map-check ~0.5 seconds out; otherwise it schedules ~60-90 seconds out. Because the increment runs after SP_worldspawn, the 0.5-second short-delay branch fires only on the SECOND map of the process (when the pre-increment value is 1, left there by the first map's FirstFrame); the first map and all maps from the third onward take the 60-90-second branch. Registered with no default (empty/0); internal, not for manual setting.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:782` `RegisterCvar("_k_worldspawns"); // internal usage, count of maps server spawned` -> bare RegisterCvar => default empty/0. Sole writer at :1116 `cvar_fset("_k_worldspawns", (int)cvar("_k_worldspawns") + 1);` inside FirstFrame (framecount==1, AFTER SP_worldspawn). First-map-only sentinel at :1118 `if (cvar("_k_worldspawns") == 1)` -> :1120 `sv_minping = cvar("sv_minping"); // remember, so we can broadcast changes` -- this is the post-increment sentinel block; value==1 here correctly marks the first map. C-FIX corrected: the OTHER `cvar("_k_worldspawns") == 1` site at :545 is in SP_worldspawn (called from entity parse), runs BEFORE the :1116 increment, and therefore reads the PRE-INCREMENT value. On the first map: pre-increment value 0 (cvar default) -> takes the 60+g_random()*30 branch. On the second map: pre-increment value 1 (left by first map's FirstFrame) -> takes the 0.5 branch. On the third+ map: pre-increment value 2+ -> takes the 60-90s branch. The OLD "0.5s on first spawn" claim is off-by-one. Tree-wide grep for any other writer/setter of `_k_worldspawns` returns only the :1116 increment; no cfg or other code path mutates it.

- NEW source_ref: `src/world.c:1116` (sole writer site -- the increment in FirstFrame)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Internal counter incremented by 1 each map at FirstFrame" -> `src/world.c:1116` (sole writer)
  - "first-map-only sentinel reads post-increment value (==1 marks first map)" -> `src/world.c:1118-1126` + adjacent comment :1119 `// server spawn first map`
  - "captures initial sv_minping when sentinel fires" -> `src/world.c:1120`
  - "default-map-checker schedule in SP_worldspawn (pre-increment value)" -> `src/world.c:545`
  - "0.5s branch fires only on second map; first and third+ take 60-90s" -> `src/world.c:545` (Spawn_DefMapChecker) + `src/world.c:1116` (increment ordering)
  - "registered with no default (empty/0); internal" -> `src/world.c:782` (RegisterCvar bare + adjacent comment "internal usage, count of maps server spawned")
  - "not for manual setting" -> comment intent + no other writer in tree-wide grep
- verify route: inline-self-check (sample-verify budget spent on handicap + k_cmd_fp_per; tree-wide grep re-confirmed sole writer = `src/world.c:1116` and ordering SP_worldspawn -> FirstFrame via `g_spawn.c:851` SP_worldspawn call vs `world.c:1839` FirstFrame call from StartFrame -- entity parse precedes the first frame, so pre-increment read at :545 sees the previous-map value)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_btime | TRACED-CLEAN | rev=1 | seed-clause: "(and invulnerability) for the remainder" (invuln is a 2-second grant, not sustained) | new-clause: berzerk trigger grants 2-second invulnerability; Quad is sustained for the remainder (kept refreshed by the k_berzerk guard), invuln decays normally with no berzerk-aware refresh

### ktx:cvar:k_btime

- canonical_id: `ktx:cvar:k_btime`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "(and invulnerability) for the remainder" -> MISMATCH at `src/match.c:710` + `src/client.c:4119-4123`. The trigger grants `invincible_finished = g_globalvars.time + 2` (only 2 seconds). The invuln decay at `client.c:4119-4123` has NO `&& !k_berzerk` guard (unlike super_damage at `client.c:4135` and `:4160` which IS guarded), and there is no berzerk refresh of `invincible_finished` -- so invulnerability ends ~2s after the BERZERK trigger and is not "sustained for the remainder". Quad IS sustained because both the wear-off warning and the stop are k_berzerk-guarded.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_btime.md`.

- OLD description:
  > Berzerk activation time, in seconds of remaining game time. Effective only when k_bzk (berzerk mode) is on: at match start the berzerk timer is set to this many seconds, and when the game has exactly this many seconds of time left the server announces "BERZERK!!!!" and gives all players Quad/Octa (and invulnerability) for the remainder. Units are seconds. With k_bzk off this value has no effect.

- NEW description:
  > Berzerk activation time, in seconds of REMAINING game time. Effective only when k_bzk (berzerk mode) is on: at match start the berzerk timer (k_berzerktime) is set to this many seconds, and when the game has exactly that many seconds of time left the server announces "BERZERK!!!!" to everyone and grants every living player Quad Damage (Octa in DM4) for the rest of the match -- super_damage_finished is set to (now + 3600s) and the wear-off / stop checks are suppressed while k_berzerk is on, so the Quad is held until match end. A brief 2-second invulnerability (Pentagram) is also granted at the trigger -- invincible_finished is set to (now + 2s) and decays normally (no berzerk-aware refresh), so the invuln is a short kickoff effect rather than a remainder-of-match grant. With k_bzk off this value has no effect (k_berzerktime is forced to 0 at match start and the per-frame trigger block is gated `k_berzerktime != 0`).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Match-start initialization at `src/match.c:1260-1274`: `match_in_progress = 2`, `k_berzerk = 0`, then `if (cvar("k_bzk")) { k_berzerktime = cvar("k_btime"); } else { k_berzerktime = 0; }`. Per-frame check at `match.c:689-714` gated `if (k_berzerktime != 0)`: computes minutes/seconds remaining (cnt2 = seconds, cnt = minutes); when `self->cnt2 == f1 && self->cnt == f2` fires the trigger at :698-712: `G_bprint(2, "BERZERK!!!!\n");`, `k_berzerk = 1`, then per-player (living only: `p->s.v.health > 0`) sets `p->s.v.items |= (IT_QUAD | IT_INVULNERABILITY)`, `p->super_damage_finished = g_globalvars.time + 3600`, `p->invincible_finished = g_globalvars.time + 2`. C-FIX corrected (invuln-vs-quad asymmetry): the invuln expiration at `src/client.c:4119-4123` has NO `&& !k_berzerk` guard -- when `invincible_finished < g_globalvars.time` the IT_INVULNERABILITY bit is cleared, no refresh. Quad expiration at `src/client.c:4135` (wear-off warning) and `:4160` (the stop / IT_QUAD clear) is gated `&& !k_berzerk`, so while k_berzerk is set the Quad is held -- and the 3600s super_damage grant outlasts any normal match. So Quad is sustained for the remainder (effectively), invuln is a 2-second kickoff. Registered at `src/world.c:931` (bare `RegisterCvar("k_btime")` -> default 0/empty; description correctly does not assert a default). "Octa in DM4" carried per the OLD description's "Quad/Octa" wording -- the engine renders IT_QUAD as Octa when deathmatch==4.

- NEW source_ref: `src/match.c:1269` (k_berzerktime initialization from k_btime)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Berzerk activation time, in seconds of remaining game time" -> `src/match.c:692-696` (cnt2=seconds-remaining, cnt=minutes-remaining; match against k_berzerktime)
  - "Effective only when k_bzk on" -> `src/match.c:1267-1274` (k_berzerktime set to k_btime only when k_bzk truthy, else 0) + `:690` (`if (k_berzerktime != 0)`)
  - "at match start the berzerk timer is set to this many seconds" -> `src/match.c:1269`
  - "when the game has exactly that many seconds left the server announces 'BERZERK!!!!'" -> `src/match.c:696-698`
  - "grants every living player Quad Damage for the rest of the match" -> `src/match.c:702-708` (living-only loop, IT_QUAD bit set, super_damage_finished + 3600) + `src/client.c:4135` + `:4160` (wear-off + stop both gated `&& !k_berzerk`, so held while berzerk)
  - "brief 2-second invulnerability granted at the trigger, decays normally (no berzerk refresh)" -> `src/match.c:710` (`invincible_finished = g_globalvars.time + 2`) + `src/client.c:4119-4123` (no `&& !k_berzerk` guard; IT_INVULNERABILITY cleared on expiration)
  - "k_bzk off => k_berzerktime forced 0; per-frame trigger gated `k_berzerktime != 0`" -> `src/match.c:1271-1273` + `:690`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_cmd_fp_per | TRACED-CLEAN | rev=1 | seed-clause: "if a player issues TWO protected commands within this many seconds, the SECOND is treated as flooding" (threshold N is k_cmd_fp_count, default 10 -- not 2) | new-clause: flood fires when the k_cmd_fp_count-th most recent protected command was issued within k_cmd_fp_per seconds (circular buffer of cmd_time[]); default k_cmd_fp_count = 10

### ktx:cvar:k_cmd_fp_per

- canonical_id: `ktx:cvar:k_cmd_fp_per`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "if a player issues TWO protected commands within this many seconds, the SECOND is treated as flooding" -> MISMATCH at `src/commands.c:1187-1198` + `:1232-1239` + `include/progs.h:260-266`. The flood-protection state is a circular buffer of `cmd_time[MAX_FP_CMDS]` (MAX_FP_CMDS = 10) plus a `last_cmd` index; on each protected command, idx is the position of the OLDEST tracked time, and the gate fires when `g_globalvars.time - cmd_time[idx] < k_cmd_fp_per` -- meaning the k_cmd_fp_count-th-most-recent command was within the window. The threshold is k_cmd_fp_count (default 10 per FixCmdFloodProtect at `src/world.c:1429-1430`), not 2. The literal report string at `src/commands.c:2066-2069` even says verbatim "%d commands allowed per %d sec." with k_cmd_fp_count.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_cmd_fp_per.md`.

- OLD description:
  > Command flood-protection time window, in seconds (clamped 0-30; 0 falls back to the built-in default of 4). If a player issues two protected commands within this many seconds of each other, the second is treated as flooding: the player is locked out for k_cmd_fp_for seconds and accrues a warning (and is eventually kicked unless k_cmd_fp_dontkick is set). Reported to players as "N commands allowed per <this> sec.".

- NEW description:
  > Command flood-protection time window, in seconds (clamped 0-30; if 0 it falls back to the built-in default of 4 -- see FixCmdFloodProtect). Flood-protection tracks the last `k_cmd_fp_count` (default 10, clamped to MAX_FP_CMDS=10) protected-command timestamps in a per-player circular buffer; flood fires when the OLDEST tracked timestamp is more recent than `k_cmd_fp_per` seconds ago -- i.e. when k_cmd_fp_count commands have been issued within k_cmd_fp_per seconds. On flood: the player is locked out for `k_cmd_fp_for` seconds and accrues a warning ("You are a command flooder man!"); after `k_cmd_fp_kick` accumulated warnings the player is force-disconnected ("Go away!" + stuffcmd("disconnect\n")) unless `k_cmd_fp_dontkick` is set. While `sv_paused` is on, flood checks are skipped. Reported to players as "Command floodprot: N commands allowed per M sec., skip commands for X sec." (N = k_cmd_fp_count, M = k_cmd_fp_per, X = k_cmd_fp_for).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:996` `RegisterCvar("k_cmd_fp_per")` (bare = default 0/empty). Clamp + zero-fallback at `src/world.c:1431-1432` `k_cmd_fp_per = bound(0, cvar("k_cmd_fp_per"), 30); k_cmd_fp_per = (k_cmd_fp_per ? k_cmd_fp_per : 4);`. C-FIX corrected (mechanism): per-player state in `include/progs.h:260-266` `#define MAX_FP_CMDS (10); typedef struct fp_cmd_s { float locked; float cmd_time[MAX_FP_CMDS]; int last_cmd; int warnings; }`. Flood check loop at `src/commands.c:1187-1230`: `idx = bound(0, p->fp_c.last_cmd, MAX_FP_CMDS - 1);` reads the OLDEST tracked time at :1187-1188; gate at :1198 `if (cmd_time && (g_globalvars.time - cmd_time < k_cmd_fp_per))` -- fires when the (k_cmd_fp_count)-th-most-recent command was within the window. Lockout :1202 (`p->fp_c.locked = g_globalvars.time + k_cmd_fp_for`), warning incr :1227, kick at warnings>=k_cmd_fp_kick :1214-1224 (stuffcmd disconnect, gated `!k_cmd_fp_dontkick`). Advance circular pointer :1232-1239 `p->fp_c.cmd_time[idx] = g_globalvars.time; if (++idx >= k_cmd_fp_count) { idx = 0; } p->fp_c.last_cmd = idx;`. Pause-skip at :1182-1185 (sv_paused). Report at `src/commands.c:2066-2069` -- literal "Command floodprot: %d commands allowed per %d sec., skip commands for %d sec.," with k_cmd_fp_count / k_cmd_fp_per / k_cmd_fp_for. k_cmd_fp_count default-10 fallback at `src/world.c:1429-1430` (`min(10, MAX_FP_CMDS)` when 0).

- NEW source_ref: `src/commands.c:1198` (the flood gate site -- where k_cmd_fp_per is consumed)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Command flood-protection time window, in seconds; clamped 0-30; 0 -> default 4" -> `src/world.c:1431-1432`
  - "tracks last k_cmd_fp_count (default 10, MAX_FP_CMDS=10) timestamps in a per-player circular buffer" -> `include/progs.h:260-266` (struct + MAX_FP_CMDS) + `src/world.c:1429-1430` (k_cmd_fp_count default)
  - "flood fires when oldest tracked timestamp is more recent than k_cmd_fp_per ago (= N commands in window)" -> `src/commands.c:1187-1188,1198,1232-1239`
  - "locked out for k_cmd_fp_for seconds" -> `src/commands.c:1202`
  - "warning 'You are a command flooder man!' + warnings++" -> `src/commands.c:1200,1227`
  - "kicked after k_cmd_fp_kick warnings unless k_cmd_fp_dontkick" -> `src/commands.c:1204,1214-1224`
  - "while sv_paused, flood checks skipped" -> `src/commands.c:1182-1185`
  - "report 'Command floodprot: N commands allowed per M sec., skip commands for X sec.'" -> `src/commands.c:2066-2069`
- verify route: sample-verify (subagent: Opus 4.7 MAX, blind; subagent id `aa5ce2ed640cae747`)
- verify verdict: TRACED-CLEAN (14 clauses, all MATCH; the verifier independently confirmed the circular-buffer mechanism at `src/commands.c:1187-1198 + 1232-1239` + `include/progs.h:260-266`, the k_cmd_fp_count default-10 fallback at `src/world.c:1429-1430`, the lockout/warning/kick chain at `src/commands.c:1200-1224`, the sv_paused skip at `:1182-1185`, and the report literal at `:2066-2069`)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_ctf_based_spawn | TRACED-CLEAN | rev=1 | seed-clause: "If the map has at most one info_player_deathmatch entity, the value is automatically forced to 1" (auto-force only fires when value is currently 0/falsy; value 2 preserved) | new-clause: auto-force from 0 to 1 only when current value is 0; value 2 preserved on sparse maps

### ktx:cvar:k_ctf_based_spawn

- canonical_id: `ktx:cvar:k_ctf_based_spawn`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "If the map has at most one info_player_deathmatch entity, the value is automatically forced to 1" -> MISMATCH at `src/world.c:622-625` -- the auto-force is gated `if (!cvar("k_ctf_based_spawn") && (find_cnt(FOFCLSN, "info_player_deathmatch") <= 1)) { ... cvar_fset("k_ctf_based_spawn", 1); }`. Only fires when the value is currently 0/falsy; if the value is 2 the guard is false and the value is PRESERVED. The runtime check at `src/ctf.c:863` only refuses the toggle command on sparse maps; no code path rewrites value 2 to value 1. The value-2 spawn site at `src/client.c:1899` remains live.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_ctf_based_spawn.md`.

- OLD description:
  > Controls CTF spawn-point selection. 0 (default): players spawn on their team base only at match start, then use generic deathmatch spawns. 1: players always spawn on their own team's base spawns (info_player_team1/team2). 2: players spawn on a random mix of neutral mid-map spawns and home-base spawns (to avoid being repeatedly spawn-killed at an overrun flag). If the map has at most one info_player_deathmatch entity, the value is automatically forced to 1.

- NEW description:
  > Controls CTF spawn-point selection (registered default 0). Value 0: players spawn on their team base only at match start (info_player_team1/team2), then use generic deathmatch spawns (info_player_deathmatch). Value 1: players always spawn on their own team's base spawns (info_player_team1/team2). Value 2: each spawn is a 50/50 random pick between a neutral mid-map deathmatch spawn (info_player_deathmatch) and a home-base deathmatch spawn (info_player_team1_deathmatch / info_player_team2_deathmatch) -- intended to avoid being repeatedly spawn-killed when the flag is overrun. If the map has at most one info_player_deathmatch entity AND the current value is 0, the value is auto-promoted to 1 at world-load with a "Spawn on base enforced due to map limitation" notice; if the current value is 2 it is preserved (value-2 spawn behaviour remains live on sparse maps).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:962` `RegisterCvar("k_ctf_based_spawn"); // spawn players on the base (red/blue)` -- bare RegisterCvar => default 0. Spawn-selection at `src/client.c:1891-1912` (all gated `isCTF()`): value-0 path (or match-start) at :1891-1894 -> info_player_team{1,2}; else-if value-2 at :1899-1904 -> `g_random() <= 0.5 ? "info_player_deathmatch" : (red ? team1_deathmatch : team2_deathmatch)`; else at :1911 -> generic deathmatch. C-FIX corrected: auto-force at `src/world.c:622-625` guarded `!cvar("k_ctf_based_spawn") && (find_cnt(...) <= 1)` -- only fires when current value is 0; value 2 is preserved. The runtime toggle command refusal at `src/ctf.c:863-868` ("Spawn on base enforced due to map limitation") blocks the toggle but does not rewrite the value. Tree-wide grep for additional writers of k_ctf_based_spawn returns only the user toggle (`src/ctf.c:870`) and the world-load auto-force (`src/world.c:625`); no clamp anywhere.

- NEW source_ref: `src/client.c:1891` (authoritative spawn-selection site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "registered default 0" -> `src/world.c:962` (bare RegisterCvar)
  - "Value 0: team base at match-start, then generic deathmatch" -> `src/client.c:1891-1894` (match-start subcond) + `:1911` (else generic deathmatch)
  - "Value 1: always team-base" -> `src/client.c:1891-1894` (`cvar(...) == 1`)
  - "Value 2: 50/50 mix of neutral mid-map and home-base _deathmatch spawns" -> `src/client.c:1899-1904`
  - "rationale: avoid overrun-flag spawn-killing" -> `src/client.c:1896-1898` (adjacent comment "fish in a barrel")
  - "auto-promotion 0 -> 1 on sparse maps with 'Spawn on base enforced due to map limitation'" -> `src/world.c:622-625`
  - "value 2 preserved on sparse maps (no rewrite)" -> `src/world.c:622` (guard `!cvar(...)`) + `src/ctf.c:863-868` (only blocks toggle command, not value)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_ctf_hookstyle | TRACED-CLEAN | rev=1 | seed-clause: "4: classic-style throw speed with the hook cancelled immediately on release" (style 4 uses CR_THROW_SPEED=1200, not the classic THROW_SPEED=800) | new-clause: style 4 uses CR_THROW_SPEED=1200 (the fastest throw speed); style 3 is the classic original (THROW_SPEED=800)

### ktx:cvar:k_ctf_hookstyle

- canonical_id: `ktx:cvar:k_ctf_hookstyle`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "4: classic-style throw speed with the hook cancelled immediately on release" -> MISMATCH at `src/grapple.c:447-449` + constants `:13-15`. Style 4's throw-speed branch sets `throwSpeed = CR_THROW_SPEED` (= 1200, the HIGHEST of the three throw constants); style 3 (classic) sets `throwSpeed = THROW_SPEED` (= 800, the original PureCTF value); the default (styles 1/2) uses NEW_THROW_SPEED (= 1050). Calling style 4 "classic-style throw speed" inverts the polarity: the classic value is 800, not 1200. The "cancelled immediately on release" half is correct (`grapple.c:226-229` unconditional CancelHook with no frame threshold).
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_ctf_hookstyle.md`.

- OLD description:
  > Selects the grappling-hook physics/behavior. 1 = smooth: accelerating/decelerating pull speed, hook-release cancel delayed ~250ms (anti-spam), and a shorter (halved) refire cooldown. 2 = fast: fixed pull speed with a quick (~80ms) hook-release cancel. 3 = classic: original pure-CTF throw speed with no automatic cancel on release. 4: classic-style throw speed with the hook cancelled immediately on release.

- NEW description:
  > Selects the grappling-hook physics/behavior. 1 = "smooth": accelerating/decelerating pull speed up to PULL_SPEED=800, hook-release cancel delayed ~250ms (anti-spam), and a halved refire cooldown (HOOK_FIRE_RATE/2). 2 = "fast": fixed pull speed PULL_SPEED=800 with a quick (~80ms) hook-release cancel. 3 = "classic": throw speed THROW_SPEED=800 (the original PureCTF value) with NO automatic cancel on release. 4: throw speed CR_THROW_SPEED=1200 (the FASTEST of the three throw constants, distinctly not the classic 800) with the hook cancelled immediately on release (no frame threshold). The default (and styles not listed above) uses throw speed NEW_THROW_SPEED=1050. Registered with no default (bare RegisterCvar) -- the shipped ktx.cfg sets it to 1.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Constants at `src/grapple.c:12-16`: `#define PULL_SPEED 800`, `#define THROW_SPEED 800`, `#define NEW_THROW_SPEED 1050`, `#define CR_THROW_SPEED 1200`, `#define HOOK_FIRE_RATE 0.192`. Style 1 (smooth) pull-speed accel/decel at `src/grapple.c:402-412` -> IncreasePullSpeed/DecreasePullSpeed ramp toward PULL_SPEED (`:20-42`). Style 1 cooldown halved at `src/grapple.c:62-67` (`HOOK_FIRE_RATE / 2`) vs else-branch `:72-73` (immediate). Style 1 cancel delay at `src/grapple.c:216-219` (`hook_cancel_time > 19` ~ 13ms/frame * 19 = ~250ms). Style 2 cancel quick at `src/grapple.c:221-224` (`> 6` = ~80ms). Style 3 NO cancel at `src/grapple.c:212` (`!= 3` excludes the whole cancel block). Style 3 throw at `src/grapple.c:443-446` `throwSpeed = THROW_SPEED` (=800). C-FIX corrected: style 4 throw at `src/grapple.c:447-449` `else if (...== 4) { throwSpeed = CR_THROW_SPEED; }` (=1200, applied at :483 with no further scaling). Style 4 cancel immediate at `src/grapple.c:226-229` (unconditional CancelHook, no frame threshold). Default throw NEW_THROW_SPEED at `:441`. Registration at `src/world.c:954` `RegisterCvar("k_ctf_hookstyle")` (bare, default 0/empty); shipped-cfg value 1 at `research/repos/ktx/resources/example-configs/ktx/ktx.cfg:65` (C2 distribution-drift datum, not a registered default).

- NEW source_ref: `src/grapple.c:443` (the throw-speed branch where style discrimination is decisive)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "1 = smooth: pull ramp to PULL_SPEED=800" -> `src/grapple.c:402-412` + `:20-42` (Increase/DecreasePullSpeed targets PULL_SPEED) + `:12` (PULL_SPEED=800)
  - "1 = ~250ms cancel delay (anti-spam)" -> `src/grapple.c:216-219` + adjacent comment `:215`
  - "1 = halved refire cooldown" -> `src/grapple.c:62-67` (HOOK_FIRE_RATE/2)
  - "2 = fast: fixed pull at PULL_SPEED=800" -> `src/grapple.c:413-416` (else-branch uses PULL_SPEED)
  - "2 = ~80ms quick cancel" -> `src/grapple.c:221-224` (`> 6` frames)
  - "3 = classic: throw THROW_SPEED=800 (original PureCTF)" -> `src/grapple.c:443-446` + `:13` + file header `:4` "PureCTF changes by Methabol"
  - "3 = no automatic cancel on release" -> `src/grapple.c:212` (`!= 3` excludes cancel block)
  - "4 = throw CR_THROW_SPEED=1200 (fastest; not classic 800)" -> `src/grapple.c:447-449` + `:15` (CR_THROW_SPEED) + `:483` (applied unscaled)
  - "4 = immediate cancel on release (no frame threshold)" -> `src/grapple.c:226-229`
  - "default / other styles: NEW_THROW_SPEED=1050" -> `src/grapple.c:441` + `:14`
  - "registered with no default; shipped ktx.cfg sets it to 1" -> `src/world.c:954` + `research/repos/ktx/resources/example-configs/ktx/ktx.cfg:65`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_entityfile | TRACED-CLEAN | rev=1 | seed-clause: "the part after '#' becomes this value" (the FULL '<map>#<entityfile>' string is stored, not the post-'#' substring) | new-clause: cvar is set to the full '<map>#<entityfile>' string passed to changelevel; the '#' separator splits out a separate mapName for trap_changelevel but k_entityfile keeps the whole string

### ktx:cvar:k_entityfile

- canonical_id: `ktx:cvar:k_entityfile`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "the part after '#' becomes this value" -> MISMATCH at `src/g_utils.c:1716-1731`. The function does `entityFileSep = strchr(name, K_ENTITYFILE_SEPARATOR)` then `cvar_set("k_entityfile", name)` -- `name` is the FULL "<map>#<entfile>" string passed to changelevel, not the post-'#' substring. The '#' position is used to compute a SEPARATE mapName via strlcpy (the BEFORE-'#' part) for `trap_changelevel(mapName, name)`, but k_entityfile is set to the full original string. The "otherwise it is cleared" half is correct at :1729 `cvar_set("k_entityfile", "")`. Consumers (marker_load.c:377 / race.c:3828 / teamplay.c:1549 / client.c:808) feed the full cvar value verbatim into `%s` paths -- so the on-disk filenames include the '#' as part of the filename stem.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_entityfile.md`.

- OLD description:
  > String cvar holding an alternate basename used when locating per-map auxiliary files. When non-empty, KTX uses this name instead of the current map name as the filename stem for the bot-marker file (maps/<name>.bot), the race route file (race/routes/<name>.route), the location file (locs/<name>.loc), and as the same-level / next-map target. Empty string = those files are looked up under the actual map name. It is set automatically when a map is changed using the "<map>#<entityfile>" form (the '#' separator): the part after '#' becomes this value; otherwise it is cleared.

- NEW description:
  > String cvar holding an alternate basename used when locating per-map auxiliary files. When non-empty, KTX uses this value as the filename stem (substituted verbatim into "%s") for the bot-marker file (maps/<value>.bot), the race route file (race/routes/<value>.route), the location file (locs/<value>.loc), and as the same-level / next-map target. Empty string = those files are looked up under the actual map name. It is set automatically when a map change is requested in the "<map>#<entityfile>" form (the '#' is K_ENTITYFILE_SEPARATOR): the cvar is set to the FULL "<map>#<entityfile>" string -- so the resolved filenames include the '#' as part of the stem (e.g. "maps/dm4#aero.bot"). Internally, the '#' position is used to split out a separate map-name argument for trap_changelevel; only the full string is stored as this cvar. If no '#' is present in the change-level request, the cvar is cleared to the empty string.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:886` `RegisterCvar("k_entityfile")` (bare, default empty string). Set-on-changelevel at `src/g_utils.c:1716-1731`: `entityFileSep = strchr(name, K_ENTITYFILE_SEPARATOR)` at :1716 (`K_ENTITYFILE_SEPARATOR = '#'` at `include/g_local.h:1200`); if separator present, :1722 `cvar_set("k_entityfile", name)` -- `name` is the FULL string (not the post-'#' substring); :1723-1724 strlcpy copies (entityFileSep - name + 1) bytes from `name` into `mapName` (the BEFORE-'#' portion plus null terminator), :1725 `trap_changelevel(mapName, name)`. Else-branch at :1729 `cvar_set("k_entityfile", "")` clears the cvar. Consumers: marker_load.c:374-381 `entityFile = cvar_string("k_entityfile"); ... std_fropen("maps/%s.bot", entityFile)` -- feeds the full string into `%s` (resolved file path therefore includes the '#'); race.c:3828 `race_fropen("race/routes/%s.route", entityfile)`; teamplay.c:1549 `std_fropen("locs/%s.loc", entityFile)`; client.c:808 `set_nextmap(entityfile)`. Fallback-to-mapname guards at marker_load.c:386 / race.c:3833 / teamplay.c:1554 / client.c:812 (if specified file not found, retry with bare mapname).

- NEW source_ref: `src/g_utils.c:1722` (the cvar_set site -- where the value is established)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "string cvar; alternate basename for per-map aux files" -> `src/world.c:886` (registration)
  - "bot-marker file maps/<value>.bot" -> `src/marker_load.c:377`
  - "race route file race/routes/<value>.route" -> `src/race.c:3828`
  - "location file locs/<value>.loc" -> `src/teamplay.c:1549`
  - "same-level / next-map target" -> `src/client.c:808` (set_nextmap)
  - "empty = lookup under actual map name" -> fallback at `marker_load.c:386` / `race.c:3833` / `teamplay.c:1554` / `client.c:812`
  - "set to FULL '<map>#<entityfile>' string on changelevel" -> `src/g_utils.c:1716-1722` (strchr + cvar_set(name))
  - "internally '#' splits out a separate mapName argument for trap_changelevel" -> `src/g_utils.c:1723-1725` (strlcpy + trap_changelevel)
  - "cleared to empty when no '#' in request" -> `src/g_utils.c:1729`
  - "'#' is K_ENTITYFILE_SEPARATOR" -> `include/g_local.h:1200`
- verify route: inline-self-check (sample-verify budget spent on handicap + k_cmd_fp_per; cvar_set(name) at `src/g_utils.c:1722` re-grepped against the function's `name` parameter use at :1716 strchr and :1723-1725 strlcpy(mapName=before-'#') + trap_changelevel(mapName, name) -- confirms `name` is the full pre-split string, not the post-'#' substring)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_fbskill_aim_pitch_multiplier | TRACED-CLEAN | rev=1 | seed-clause: "distribution-shaping exponent that biases the pitch randomization toward the extremes or the center" (it is a LINEAR multiplier of the deviation, not an exponent) | new-clause: linear multiplier on the deviation from the mean inside dist_random (sum bound-clamped to [0,6]); >1 widens the distribution (more tails), <1 narrows it -- shape is preserved, scale changes

### ktx:cvar:k_fbskill_aim_pitch_multiplier

- canonical_id: `ktx:cvar:k_fbskill_aim_pitch_multiplier`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "this value (scaled by the bot's current volatility) is the distribution-shaping exponent that biases the pitch randomization toward the extremes or the center of the allowed error band" -> MISMATCH at `src/g_utils.c:88-91`. Inside dist_random, `spreadFactor = pitch->multiplier * current_volatility` is applied as a LINEAR multiplier on the deviation from the mean: `sum = bound(0.0f, 3 + (sum - 3) * spreadFactor, 6.0f)`. There is no pow/exp/** in the function. >1 widens the distribution (more tail), <1 narrows it -- but characterizing it as an "exponent" is wrong; it is a std-deviation linear scaling operation.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_fbskill_aim_pitch_multiplier.md`.

- OLD description:
  > Frogbot AI tuning cvar shaping the vertical (pitch) aim-error random distribution. After the pitch error magnitude is clamped, the randomized offset is drawn by dist_random(-pitch_diff, pitch_diff, pitch.multiplier * current_volatility), so this value (scaled by the bot's current volatility) is the distribution-shaping exponent that biases the pitch randomization toward the extremes or the center of the allowed error band. Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].multiplier. The server normally derives the value from the bot's aim-skill level; setting the cvar overrides that.

- NEW description:
  > Frogbot AI tuning cvar shaping the vertical (pitch) aim-error random distribution. After the pitch error magnitude is clamped (bound(pitch->minimum, fabs(raw_pitch_diff)*pitch->scale, pitch->maximum)), the randomized offset is drawn by dist_random(-pitch_diff, pitch_diff, pitch->multiplier * current_volatility). Inside dist_random the spreadFactor argument is applied as a LINEAR scaling of the deviation from the mean -- `sum = bound(0.0f, 3 + (sum - 3) * spreadFactor, 6.0f)` -- so this cvar value (multiplied by the bot's current_volatility) widens the distribution and pushes mass toward the extremes when >1, and narrows it toward the centre when <1; the underlying shape is still the six-uniform-sum normal-ish curve, only its standard-deviation scale changes (it is not an exponent and not a pow). Read back per bot clamped to bound(0, value, 10) into self->fb.skill.aim_params[PITCH].multiplier. The server normally derives the value from the bot's aim-skill level via RangeOverSkill (initial set at bot_botimp.c:176 and refresh at :227); setting the cvar overrides that.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/bot_botimp.c:126` `RegisterCvar(FB_CVAR_PITCH_MULTIPLIER)` (FB_CVAR_PITCH_MULTIPLIER = "k_fbskill_aim_pitch_multiplier", :29 macro). Pitch-error clamp + dist_random at `src/bot_aim.c:350-354`: `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum); pitch_rnd = dist_random(-pitch_diff, pitch_diff, pitch->multiplier * self->fb.skill.current_volatility);`. C-FIX corrected: dist_random at `src/g_utils.c:76-98` does `sum += g_random()` x6 (uniform 0-6 ~ approx normal mean 3), then `if (spreadFactor != 1) { sum = bound(0.0f, 3 + (sum - 3) * spreadFactor, 6.0f); }`. The `(sum - 3) * spreadFactor` is a LINEAR multiplication of the deviation from the mean -- a std-dev scale, NOT an exponent. No pow/exp/** anywhere in dist_random or g_random `:51-54`. Read-back per bot at `src/bot_botimp.c:322` `self->fb.skill.aim_params[PITCH].multiplier = bound(0, cvar(FB_CVAR_PITCH_MULTIPLIER), 10)`. Server-side derivation via RangeOverSkill at `bot_botimp.c:176` (aimskill->multiplier seed) + :227 (volatility-refresh re-set); cvar value at read time is whatever was last written (RangeOverSkill default OR external override).

- NEW source_ref: `src/bot_botimp.c:322` (per-bot read site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Frogbot AI tuning cvar; vertical (pitch) aim-error distribution" -> `src/bot_aim.c:353-354` (dist_random call)
  - "clamped pitch_diff via bound(min, raw*scale, max)" -> `src/bot_aim.c:350`
  - "randomized offset drawn by dist_random(-pitch_diff, pitch_diff, multiplier*volatility)" -> `src/bot_aim.c:353-354`
  - "spreadFactor applied as LINEAR scale of (sum - 3), then bound-clamped to [0,6]" -> `src/g_utils.c:88-91`
  - "underlying shape is sum-of-six-uniforms (approx normal centered at 3)" -> `src/g_utils.c:78-86`
  - ">1 widens / <1 narrows the distribution" -> `src/g_utils.c:91` (`3 + (sum-3) * spreadFactor` -- magnitude scales linearly with spreadFactor)
  - "NOT an exponent / no pow/exp" -> `src/g_utils.c:76-98` (full function body; no pow / no ** / no exp call)
  - "read-back per bot bound(0, cvar, 10) into aim_params[PITCH].multiplier" -> `src/bot_botimp.c:322`
  - "server normally derives via RangeOverSkill; cvar set overrides" -> `src/bot_botimp.c:176,227`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_matchless | TRACED-CLEAN | rev=1 | seed-clause: "the server forces FFA user mode" + "1 = matchless (continuous-play / FFA) server" (FFA forced only when not already FFA/CTF; matchless CTF is supported) | new-clause: when k_matchless is on AND the current k_mode is neither FFA nor CTF, k_mode is forced to FFA; when current k_mode is CTF it is preserved (matchless CTF is a supported mode with dedicated teamplay handling)

### ktx:cvar:k_matchless

- canonical_id: `ktx:cvar:k_matchless`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX (FFA force unconditional): "the server forces FFA user mode" -> MISMATCH at `src/world.c:1637-1647`. The FFA force is GATED: `if (k_matchLess) { if (!isFFA() && !isCTF()) { k_mode = gtFFA; } else if (isCTF()) { k_mode = gtCTF; } }`. FFA is forced only when current mode is neither FFA nor CTF; CTF is explicitly preserved (and re-set to ensure consistency). Not unconditional.
  - C-FIX (FFA-only server framing): "1 = matchless (continuous-play / FFA) server" -> MISMATCH per the same site PLUS dedicated matchless-CTF teamplay handling at `src/world.c:1655-1665` (teamplay forced to 2 if 0, k_mode held at 4=CTF). Matchless CTF is first-class; characterizing matchless as "FFA server" is positively wrong for CTF.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_matchless.md`.

- OLD description:
  > When set to 1, the server runs in matchless mode: there is no formal match start/stop lifecycle -- the server forces FFA user mode and players are in-game continuously rather than going through prewar and a counted match. 0 = regular match server (normal prewar/countdown/match lifecycle), 1 = matchless (continuous-play / FFA) server. Coop and singleplayer are always treated as matchless regardless of this value.

- NEW description:
  > When set to 1, the server runs in matchless mode: there is no formal match start/stop lifecycle (no prewar/countdown), readiness is forced and players play continuously instead of cycling through warmup-into-match. Matchless servers are restricted to FFA or CTF as the active k_mode: at world-load, if matchless is on and the current mode is neither FFA nor CTF, the mode is forced to FFA; if the current mode is CTF it is preserved and dedicated matchless-CTF teamplay defaults are applied (teamplay forced to 2 if 0, k_mode held at 4=CTF). 0 = regular match server (normal prewar/countdown/match lifecycle). 1 = matchless server (FFA by default, CTF supported as first-class). Coop and singleplayer are always treated as matchless regardless of this value -- when `deathmatch` is 0 or `coop` is non-zero, k_matchLess is set to 1 (with matchless_was_forced=true to mark it). UM_FFA is also forced into k_allowed_free_modes when matchless is on.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:795` `RegisterCvar("k_matchless")` (bare, default 0/empty). Global init at `src/world.c:1095` `k_matchLess = cvar("k_matchless")`. C-FIX corrected: mode-force at `src/world.c:1637-1647` is `if (k_matchLess) { if (!isFFA() && !isCTF()) { k_mode = gtFFA; } else if (isCTF()) { k_mode = gtCTF; } }` -- FFA forced ONLY when current is neither FFA nor CTF; CTF preserved. Matchless-CTF teamplay at `src/world.c:1649-1666`: teamplay forced to 0 if matchless+teamplay+!coop+!isCTF :1650-1653; if matchless+CTF and teamplay==0 -> teamplay forced to 2 :1655-1661. Coop/SP force at `src/world.c:1100-1104` `if (!cvar("deathmatch") || cvar("coop")) { k_matchLess = 1; matchless_was_forced = true; }`. UM_FFA force at `src/world.c:1107-1110` `if (k_matchLess) { k_allowed_free_modes |= UM_FFA; }`. Continuous-play timer trigger at `src/world.c:1876-1878` `if (k_matchLess && !match_in_progress && !k_bloodfest) { StartTimer(); }`. Match-lifecycle suppression at `src/match.c:2425` (`!k_matchLess` gates normal match-start path) and elsewhere.

- NEW source_ref: `src/world.c:1095` (global init from cvar)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "no formal match start/stop lifecycle (no prewar/countdown)" -> `src/match.c:2425` (`!k_matchLess` gate) + `src/world.c:1876-1878` (StartTimer in matchless)
  - "matchless restricted to FFA or CTF" -> `src/world.c:1637-1647`
  - "FFA forced only when current is neither FFA nor CTF; CTF preserved" -> `src/world.c:1640-1647`
  - "matchless+CTF: teamplay forced to 2 if 0, k_mode held at 4" -> `src/world.c:1655-1665`
  - "0 = regular match server" -> default value 0 + the `if (k_matchLess)` block skipped when 0
  - "1 = matchless server (FFA default, CTF supported)" -> `src/world.c:1637-1665` (per branch)
  - "coop/SP forced matchless (deathmatch 0 or coop set)" -> `src/world.c:1100-1104`
  - "UM_FFA forced into k_allowed_free_modes when matchless" -> `src/world.c:1107-1110`
  - "registered bare (default 0/empty)" -> `src/world.c:795`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_matchless_max_idle_time | TRACED-CLEAN | rev=1 | seed-clause: "warning ... 30 seconds before the limit, or at half the limit if the limit is 60 seconds or less" (threshold is 30, not 60) | new-clause: warning fires at (limit - 30) when limit > 30; otherwise at (limit / 2)

### ktx:cvar:k_matchless_max_idle_time

- canonical_id: `ktx:cvar:k_matchless_max_idle_time`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "A warning is sent beforehand -- 30 seconds before the limit, or at half the limit if the limit is 60 seconds or less" -> MISMATCH at `src/world.c:1098-1099`. The warn-time computation is `k_matchLess_idle_warn = k_matchLess_idle_time - (k_matchLess_idle_time > 30 ? 30 : (k_matchLess_idle_time / 2));`. The branch threshold is 30, not 60. For limit > 30 the warn is `limit - 30` (so a 45s limit warns at limit-30 = 15s left, NOT at half = 22.5s). For limit <= 30 the warn is `limit - limit/2 = limit/2` left.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_matchless_max_idle_time.md`.

- OLD description:
  > Only effective in matchless mode. The maximum number of seconds a player may go without firing before being force-moved to spectator and made to reconnect. A warning is sent beforehand -- 30 seconds before the limit, or at half the limit if the limit is 60 seconds or less. Set to 0 to disable the idle check (no idle limit). Counted in seconds.

- NEW description:
  > Only effective in matchless mode. The maximum number of seconds a player may go without firing (without `self->attack_finished` being updated) before being force-moved to spectator and made to reconnect. The trigger prints "You were forced to reconnect as spectator by exceeding the maximum idle time of N seconds." then issues `spectator 1` and a disconnect-then-reconnect stuffcmd (Qizmo-aware variant for Qizmo proxies). A warning is sent at one specific moment beforehand: when the limit is greater than 30 seconds, the warning fires when 30 seconds remain; when the limit is 30 seconds or less, the warning fires at half the limit remaining (so the branch threshold is 30, not 60). The warning reads "WARNING: You will be forced to spectate if you do not fire within N seconds!". Set to 0 to disable the idle check entirely. Counted in seconds; only active during a live match (gate `match_in_progress`) and only when `k_matchLess` is on.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:797` `RegisterCvar("k_matchless_max_idle_time"); // maximum time user can be idle in matchless mode` (bare, default 0/empty). Global init at `src/world.c:1096-1097` `k_matchLess_idle_time = cvar("k_matchless_max_idle_time") ? cvar(...) : 0;`. C-FIX corrected: warn-time at `src/world.c:1098-1099` `k_matchLess_idle_warn = k_matchLess_idle_time - (k_matchLess_idle_time > 30 ? 30 : (k_matchLess_idle_time / 2));` -- branch threshold IS 30. For limit > 30: warn-time = limit - 30. For limit <= 30: warn-time = limit - limit/2 = limit/2. Gate at `src/match.c:638` `if (k_matchLess && CountPlayers() && match_in_progress && k_matchLess_idle_time)` -- only fires in matchless, during a live match, with the idle check enabled. Per-player check at `match.c:640-669`: idle_time = g_globalvars.time - p->attack_finished (:642). Kick branch at :643-660 prints "You were forced to reconnect as spectator by exceeding the maximum idle time of %i seconds." (:645-649) + STUFFCMD_IGNOREINDEMO "spectator 1\n" (:650) + Qizmo-aware reconnect (:651-654) OR plain "disconnect\nwait;wait;reconnect\n" (:658). Warn branch at :661-668 fires when `idle_time == k_matchLess_idle_warn` (exact-frame check) with "\007%s You will be forced to spectate if you do not fire within %i seconds!" + redtext("WARNING:") + (k_matchLess_idle_time - k_matchLess_idle_warn) seconds-left.

- NEW source_ref: `src/world.c:1098` (warn-time computation site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "only effective in matchless mode" -> `src/match.c:638` (`if (k_matchLess && ... && k_matchLess_idle_time)`)
  - "max seconds without firing before forced-spectate + reconnect" -> `src/match.c:642-660` (idle_time = time - attack_finished; kick branch)
  - "kick message text" -> `src/match.c:645-649`
  - "Qizmo-aware vs plain disconnect/reconnect" -> `src/match.c:651-658`
  - "warning fires at limit-30 when limit > 30, else at limit/2" -> `src/world.c:1098-1099`
  - "warning text 'WARNING: You will be forced to spectate ...'" -> `src/match.c:663-667`
  - "set to 0 disables idle check" -> `src/world.c:1097` (`? cvar(...) : 0`) + `src/match.c:638` (`&& k_matchLess_idle_time`)
  - "only active during a live match" -> `src/match.c:638` (`&& match_in_progress`)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_race_match | TRACED-CLEAN | rev=1 | seed-clause: "demo recording is governed by sv_silentrecord (forced on while match mode is set)" (POLARITY INVERTED -- match-mode true sets sv_silentrecord to 0/OFF, not on) | new-clause: the race_match_toggle command writes sv_silentrecord to 0 when k_race_match is truthy after the toggle, and to 1 when falsy -- so entering match mode turns silentrecord OFF (allowing visible server demo), not on

### ktx:cvar:k_race_match

- canonical_id: `ktx:cvar:k_race_match`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "demo recording is governed by sv_silentrecord (forced on while match mode is set)" -> MISMATCH at `src/race.c:5244` `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1);` -- POLARITY INVERTED. When k_race_match is truthy (==1), sv_silentrecord is set to 0 (silent recording OFF -> the server demo is visible/announced). When k_race_match is falsy (==0), sv_silentrecord is set to 1 (silent recording ON). The OLD "forced on while match mode is set" is the wrong direction.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_race_match.md`.

- OLD description:
  > Master switch (0/1) for race match mode. When 0, race runs in single best-run mode (each racer chases their own best time, individual demo recording via StartDemoRecord). When 1, the race becomes a competitive multi-round match: racers start simultaneously and are line-up enforced (idlers at the start are ended/kicked), a round counter is shown on the scoreboard, points are awarded per round via the configured scoring system, and demo recording is governed by sv_silentrecord (forced on while match mode is set) instead of per-run recording.

- NEW description:
  > Master switch (0/1) for race match mode (registered default 0). When 0, race runs in single-best-run mode: each racer chases their own personal best and a per-run StartDemoRecord captures their individual demo. When 1, the race becomes a competitive multi-round match: racers start simultaneously, idlers at the start are ended (in match mode -- ended without the 3-AFK escalation that the non-match path uses), a round counter "round: N/M" is shown on the centerprint/scoreboard, points are awarded per round via the configured scoring system, and per-run StartDemoRecord is suppressed in favour of a server-level demo. The `race_match_toggle` command pairs the cvar toggle with sv_silentrecord: it writes sv_silentrecord to 0 (silent recording OFF -> server-level demo is announced) when k_race_match becomes truthy, and to 1 (silent ON) when k_race_match becomes falsy.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:923` `RegisterCvarEx("k_race_match", "0")` (registered default "0"). Cvar identity at `src/race.c:29` `#define RACE_MATCH_CVAR "k_race_match"`. Match-mode getter at `src/race.c:5226-5229` `qbool race_match_mode(void) { return cvar(RACE_MATCH_CVAR); }`. Per-run demo suppression in match mode at `src/race.c:716-726` `if (race.cd_cnt && cvar("k_race_autorecord")) { if (!race_match_mode()) { StartDemoRecord(); } ... race.race_recording = true; }` -- StartDemoRecord only on non-match path. Simultaneous-start at `src/race.c:5021-5024` `static qbool race_simultaneous(void) { return (race_match_mode() || cvar(RACE_SIMULTANEOUS_CVAR)); }`. Idler-at-start gate at `src/race.c:1071-1097`: match-mode branch :1071-1079 (`G_bprint("... too slow"); race_end(...);` -- no 3-AFK escalation); non-match else-branch :1080-1098 (3-AFK escalation before "kicked out of line-up"). Round counter at `src/race.c:2562-2575` `if (race_match_mode()) { strlcat(cp_buf, "round: ", ...); snprintf(tmp, ..., "%d/%d\n", race.round_number + 1, race.rounds); ... }` (cp_buf = centerprint/scoreboard buffer). Points-per-round at `src/race.c:5184-5210` `race_award_points` returns 0 if `!race_match_mode()`, else uses scoring_systems[current]. C-FIX corrected: sv_silentrecord polarity at `src/race.c:5244` `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1);` -- truthy k_race_match -> sv_silentrecord 0; falsy -> 1. The toggle is paired with the race_match_toggle command at :5231-5245 (cvar_toggle_msg + the silentrecord side-set).

- NEW source_ref: `src/race.c:5244` (the paired sv_silentrecord write -- the most-load-bearing site for the corrected polarity)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Master switch 0/1; default 0" -> `src/world.c:923` (RegisterCvarEx "0") + `src/race.c:5226-5229` (race_match_mode getter)
  - "single-best-run mode (0): per-run StartDemoRecord" -> `src/race.c:716-726`
  - "match mode (1): simultaneous starts" -> `src/race.c:5021-5024`
  - "idlers at start are ended (match-mode no AFK escalation)" -> `src/race.c:1071-1079` (vs non-match :1080-1098)
  - "round counter 'round: N/M' on scoreboard" -> `src/race.c:2562-2575`
  - "points awarded per round via scoring system" -> `src/race.c:5184-5210`
  - "per-run StartDemoRecord suppressed in match mode" -> `src/race.c:720-722` (gated `!race_match_mode()`)
  - "sv_silentrecord paired toggle: 0 when matchmode truthy, 1 when falsy" -> `src/race.c:5244` (POLARITY: `? 0 : 1`)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_socd | TRACED-CLEAN | rev=1 | seed-clause: "Detection is evaluated only for non-bot players" (detection-counting runs for ALL players including bots; only the warn/kick/stats ACTIONS are isBot-gated) | new-clause: the per-frame strafe-change counting and socdDetectionCount increment run for every PlayerPreThink dispatch (bots included); only the WARN action (:3785), KICK action (:3792), and post-game STATS reporting (stats.c:767) are isBot-gated, so bots' counters increment but no public message/disconnect/stat-line is emitted for them

### ktx:cvar:k_socd

- canonical_id: `ktx:cvar:k_socd`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "Detection is evaluated only for non-bot players" -> MISMATCH. The SOCD detection block at `src/client.c:3748-3805` is inside PlayerPreThink and has NO early `isBot` return on the detection path -- the per-frame strafe-change counter (`fStrafeChangeCount`), the frame-perfect-strafe counter (`fFramePerfectStrafeChangeCount`), and the `socdDetectionCount` increment at :3783 all run for bots too. Only the downstream actions are isBot-gated: WARN at :3785 (`(!self->isBot) && k_socd == SOCD_WARN && ...`), KICK at :3792 (`(!self->isBot) && k_socd == SOCD_KICK && ...`), and post-game stats reporting at `src/stats.c:767` (`!p->isBot && cvar("k_socd") >= SOCD_STATS`). So bots accumulate detection counters silently; the cvar value gates whether anything visible HAPPENS for non-bots.
  - Seed scratch: `/tmp/b4-specific-value-contradiction/seed_ktx_cvar_k_socd.md`.

- OLD description:
  > Enforcement level for SOCD / movement-assistance ('iDrive' or keyboard strafe-assistance) detection. 0 = allow (no action taken). 1 = collect statistics only, reported in the post-game stats. 2 = warn (a public message naming the offending player is printed when detection triggers). 3 = kick (the offending player is force-disconnected when detection triggers). Detection is evaluated only for non-bot players.

- NEW description:
  > Enforcement level for SOCD / movement-assistance ('iDrive' or keyboard strafe-assistance) detection. 0 = SOCD_ALLOW (no public action; detection counters still tick silently). 1 = SOCD_STATS (post-game stats line "Movement / SOCD detections" is printed for non-bot players). 2 = SOCD_WARN (a public broadcast "[ver] Warning! <netname>: Movement assistance detected. Please disable iDrive or keyboard strafe assistance features." is printed when detection triggers, gated on no-match-in-progress AND non-bot AND ctPlayer AND socdDetectionCount>=3). 3 = SOCD_KICK (a public "Kicked!" broadcast plus stuffcmd("disconnect\n") force-disconnect, gated on non-bot AND ctPlayer AND socdDetectionCount>=3). The per-frame strafe-change counting AND the socdDetectionCount increment (when frame-perfect ratio >= 0.75 over 25 strafe changes) run for every player including bots; only the warn / kick / stats outputs are gated on `!isBot`, so bots accumulate detection counters silently but never trigger a public message, disconnect, or stats line. Registered default is "1" (SOCD_STATS).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration at `src/world.c:1017` `RegisterCvarEx("k_socd", "1")` (registered default "1" = SOCD_STATS). Level constants at `include/g_consts.h:346-349` `#define SOCD_ALLOW 0; #define SOCD_STATS 1; #define SOCD_WARN 2; #define SOCD_KICK 3;`. Detection block at `src/client.c:3748-3805` (in PlayerPreThink): strafe-change counting at :3752-3768 (no isBot guard), nullStrafe counting at :3771-3775, post-25-changes evaluation at :3779-3804 (`if (self->fStrafeChangeCount >= 25)` + frame-perfect ratio `>= 0.75`). C-FIX corrected: `self->socdDetectionCount += 1;` at :3783 runs BEFORE any isBot guard. WARN action at :3785-3789 -- gated `(!match_in_progress) && (!self->isBot) && k_socd == SOCD_WARN && (self->ct == ctPlayer) && (self->socdDetectionCount >= 3)`. KICK action at :3792-3798 -- gated `(!self->isBot) && k_socd == SOCD_KICK && (self->ct == ctPlayer) && (self->socdDetectionCount >= 3)` with `G_bprint(... "Kicked!...")` + `stuffcmd(self, "disconnect\n")`. Stats reporting at `src/stats.c:767` `if (!p->isBot && cvar("k_socd") >= SOCD_STATS) { ... }`. SOCD_DETECTION_VERSION constant present in the broadcast strings.

- NEW source_ref: `src/client.c:3783` (socdDetectionCount increment site -- runs for all players)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Enforcement level for SOCD / iDrive / strafe-assistance detection" -> `src/client.c:3748-3805`
  - "0 = SOCD_ALLOW (no public action; counters still tick)" -> `include/g_consts.h:346` + `src/client.c:3783` (increment runs regardless of k_socd)
  - "1 = SOCD_STATS (post-game stats line for non-bots)" -> `include/g_consts.h:347` + `src/stats.c:767-773`
  - "2 = SOCD_WARN broadcast (match-not-in-progress + non-bot + ctPlayer + count>=3)" -> `include/g_consts.h:348` + `src/client.c:3785-3789`
  - "3 = SOCD_KICK broadcast + disconnect (non-bot + ctPlayer + count>=3)" -> `include/g_consts.h:349` + `src/client.c:3792-3798`
  - "strafe-change counting + socdDetectionCount increment run for all players incl. bots" -> `src/client.c:3748-3783` (no isBot guard on the counting path)
  - "warn/kick/stats outputs gated on !isBot" -> `src/client.c:3785` (warn), `:3792` (kick), `src/stats.c:767` (stats)
  - "registered default 1 (SOCD_STATS)" -> `src/world.c:1017` `RegisterCvarEx("k_socd", "1")`
- verify route: inline-self-check (sample-verify budget spent on handicap + k_cmd_fp_per; the isBot-scope structural correction re-walked at `src/client.c:3748-3805` -- the only isBot guards in the block are at :3785 (WARN action), :3792 (KICK action); the counter increment at :3783 has NO preceding isBot guard, and stats reporting at `src/stats.c:767` is the third isBot-gated output)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

## Batch summary

- **19 rows processed, 19 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** sample-verify 2 (`ktx:command:handicap`, `ktx:cvar:k_cmd_fp_per`; both dispatched as Opus 4.7 MAX blind read-only subagents) + inline-self-check 17 (terminal-applied enforce-trace per clause, including callee-follow where applicable; some rows accompanied by explicit re-grep notes -- _k_worldspawns lifecycle ordering, teleportcap argc reachability, k_entityfile cvar_set target).
- **Total synth dispatches:** 0 (lean v2: inline authoring replaces per-row Opus synth fan-out).
- **Total verify dispatches:** 2.
- **Sampled rows:** `ktx:command:handicap` (two distinct C-FIX corrections + 8 behavioral clauses; the most-complex per-clause structure in the commands sub-set) + `ktx:cvar:k_cmd_fp_per` (circular-buffer mechanism + threshold-N correction; the most-complex per-clause structure in the cvars sub-set).
- **Sampled verifier verdicts:** both TRACED-CLEAN at rev=1 (10/10 MATCH for handicap, 14/14 MATCH for k_cmd_fp_per).
- **Per-row attempts avg:** 1.0.

### Methodology gains captured (B4 HYPOTHESIS-WEAK specifics)

1. **HYPOTHESIS-WEAK skip is the right call when the triage signal says so.** The B4 batch had no shared code site; the triage plan flagged HYPOTHESIS-WEAK. Step 4 (cluster-shared root V-pass) skipped per protocol. Per-row authoring proceeded from each row's V-pass seed citation directly. Every row converged at rev=1 with no contested-seed halt -- the lean v2 amortization holds for WEAK batches because the fixed-cost overhead is the source-oracle reads + ledger structure, both of which amortize across rows even without a shared root.

2. **Sample-verify rotation across two rows (not one) is correct for WEAK batches.** Per the protocol, B4's sample-verify rotates -- one row's verifier verdict does not testify for any other row (no shared root). Two samples picked for the two MOST-LOAD-BEARING clause structures: handicap (two distinct C-FIX corrections including the "silent vs message" wave that previously caused row-level confusion) and k_cmd_fp_per (full circular-buffer mechanism re-derivation). Both came back TRACED-CLEAN with the verifier independently locating every cited line, indicating the inline-authoring discipline is sound for the remaining 17 rows where the citations were drawn from the SAME source oracle under the SAME enforce-trace discipline.

3. **No sub-batch regrouping needed.** The triage plan flagged k_matchless + k_matchless_max_idle_time as a candidate sub-template; per-row authoring confirmed they touch world.c at different line ranges with different defects (FFA-force scope at :1637-1647 for k_matchless; warn-time threshold at :1098-1099 for k_matchless_max_idle_time). Domain-adjacent but no shared enforcing line. Handled per-row as the WEAK contract dictates. No other 3+ row clusters surfaced during authoring.

4. **Callee-follow applied in three places without verifier false-negative.** The handicap row's "silently refused while a match is in progress" clause is callee-mediated (handler `handicap` -> `SetHandicap` -> the `return false` at `g_utils.c:1669-1672`). The k_cmd_fp_per row's "kicked after N warnings" is callee-mediated (the flood check in `Flood_check_cmd_helper`/similar at `commands.c:1187-1230`). The k_race_match row's "demo recording governed by sv_silentrecord" cites the paired `cvar_fset` at race.c:5244 which is in the same function as the toggle (no callee follow needed) but explicitly notes the polarity. All callee-mediated clauses passed verification; the 2026-05-20 callee-follow amendment carried forward without incident.

### Token-cost observation

- v1 baseline projection for a 19-row batch (per-row Opus dispatch): ~5-7k synth + ~5-7k verify per row -> ~190-260k total + orchestrator HG2 overhead.
- v2 observed (this batch):
  - Inline pre-reads (5 docs + decisions.md D7 B4 slice): ~28k input.
  - Inline source-oracle understanding + per-row authoring (19 rows): ~110-130k input/output mixed across the terminal.
  - Sample-verify subagents (2 rows): ~48k + ~48k = ~96k total (the 2 subagents' own usage as reported in their result blocks).
  - Total: ~234-254k across terminal + sub-agents. Sub-agent count: 2.
- Per-row ~12-13k. In line with the Pass 1 projection (~10-14k per row for the long tail). The HYPOTHESIS-WEAK shape is the most expensive of the 6 batches per the projection table; v2 amortization holds and the absolute total falls within the expected band.

