# B4 ledger -- flag-name-inversion (batch B1, lean v2)

**Batch id:** B1 (flag-name-inversion)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Batch members:** 8 rows
**Triage plan section:** `b4-unique-rows-triage-plan.md` Batch B1
**Lean v2 shape:** ONE inline source-of-truth understanding (Step 4 -- two V-passed shared roots + per-row C-bucket) + per-row inline authoring (Step 5) + ONE blind sample-verify subagent (Step 6) + inline self-check on remaining rows.
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- seeded re-synth contract. B5 Stage-2 change-report ledger per row.

## Sub-group decomposition (refined from Pass 1 by per-row seed evidence)

Seeds re-sorted the 8 rows into THREE roots, not Pass 1's three sub-groups A/B/C:

- **Root A -- CF_MATCHLESS additive (3 rows):** `auto_pow`, `autotrackktx`, `k_vp_map` (the parenthetical "(where /break does not exist)" is a CF_MATCHLESS-shape claim about /break, not a vote-percent claim)
- **Root B -- STUFFCMD_IGNOREINDEMO = recording-exclusion, NOT playback-suppression (2 rows):** `dinfo`, `dlist`
- **Root C -- per-row name-inference defects, no shared site (3 rows):** `k_ctf_hook` (no `hook` command exists, only `nohook`), `fill:frogbot:std` (parent command is `botcmd`, not `frogbot`), `*ml:userinfo` (*ml := NEW just-set mmode, not the "previous/last/prior" the name implies)

`k_ctf_hook` was Pass 1's sub-group A but its actual defect is command-name inference, not CF_MATCHLESS -- relocated to Root C.

## Step 4 -- V-passed shared roots (structural-fact preambles)

### Root A V-pass -- CF_MATCHLESS dispatch interpretation

**Falsifiable claims, all PASSED at oracle 1.47-2-g67253dc:**

1. **`src/commands.c:1078-1081`** -- `DoCommand` dispatch carries `if (k_matchLess && !(cmds[icmd].cf_flags & CF_MATCHLESS)) return DO_CMD_DISALLOWED_MATCHLESS; // cmd isn't allowed in matchLess mode`. The gate fires ONLY when `k_matchLess` (server matchless-mode cvar) is true AND the command lacks CF_MATCHLESS. CF_MATCHLESS is therefore the PERMISSIVE bit: "also valid when the server is in matchless mode," NOT a "match-in-progress block."
2. **`include/g_local.h:647-657`** -- `CF_PLAYER (1<<0)`, `CF_SPECTATOR (1<<1)`, `CF_MATCHLESS (1<<4) /* command valid for matchLess mode */`, `CF_MATCHLESS_ONLY (1<<8) /* command valid for matchLess mode _only_ */`. CF_MATCHLESS_ONLY is the restrictive bit; CF_MATCHLESS is permissive.
3. **`src/commands.c:1083-1086`** -- the symmetric gate: `if (!k_matchLess && (cmds[icmd].cf_flags & CF_MATCHLESS_ONLY)) return DO_CMD_MATCHLESS_ONLY;`. Blocks CF_MATCHLESS_ONLY commands outside matchless mode.
4. **`src/commands.c:1453-1456`** -- `Init_cmds` startup promotion `if (cmds[i].cf_flags & CF_MATCHLESS_ONLY) cmds[i].cf_flags |= CF_MATCHLESS; // this let simplify cmds[] table`. The third sister promotion alongside `CF_PLR_ADMIN -> CF_PLAYER` (`:1443-1446`) and `CF_SPC_ADMIN -> CF_SPECTATOR` (`:1448-1451`). So CF_MATCHLESS_ONLY commands also get the CF_MATCHLESS bit at runtime.
5. **Tree-wide grep for `cf_flags &=` / `cf_flags ^=` returns EMPTY** -- no source mutates these bits at runtime. The Init_cmds startup state is permanent.
6. **No `match_in_progress` guard exists in the DoCommand dispatch path for CF_MATCHLESS commands.** The only match-state guards live inside specific handlers (e.g. `is_rules_change_allowed()` at `commands.c:9033+`). `AutoTrack` (`commands.c:6081+`) and the auto_pow / autotrackktx dispatch paths carry no such guard.

**Implication for Root A rows (`auto_pow`, `autotrackktx`, `k_vp_map`-parenthetical):** a command with CF_MATCHLESS (but NOT CF_MATCHLESS_ONLY) is dispatchable in BOTH normal mode and matchless mode -- in particular it is NOT blocked while a match is in progress. Any clause asserting "only outside a live match" / "not while a match is locked" / "does not exist in matchless" from the bare CF_MATCHLESS flag is wrong.

### Root B V-pass -- STUFFCMD_IGNOREINDEMO direction

**Falsifiable claims, all PASSED at oracle 1.47-2-g67253dc:**

1. **`include/g_syscalls.h:57-58`** -- canonical definition:
   ```
   #define STUFFCMD_IGNOREINDEMO (   1<<0) // do not put in mvd demo
   #define STUFFCMD_DEMOONLY     (   1<<1) // put in mvd demo only
   ```
   The flag governs whether `trap_stuffcmd(...)` writes the stuffed command into the recorded MVD demo stream -- recording-time inclusion control. Sibling DEMOONLY's comment confirms the recording-stream framing.
2. **Use-site evidence -- ~80+ call sites across `src/`** use STUFFCMD_IGNOREINDEMO to stuff client-side housekeeping into clients (`color N`, `team red`, `rate 5000`, `on_connect_*`, `on_observe_*`, `name "X"`, `track N`, etc.) -- short, ubiquitous client-side commands that recording the MVD stream into would clutter the demo without informational value. No use-site treats the flag as a "block when issuer is in demo playback" gate.
3. **`mv_is_playback()` (`src/commands.c:8133-8136`)** does exist as a real demo-playback predicate, but its only consumers are `mv_playback_status` / `mvd_record` enable/disable command handlers (`:8140`, `:8183`, `:8278`). Neither `dlist` nor `dinfo` references it.
4. **`dlist` handler (`src/commands.c:7984-7987`)** and **`dinfo` handler (`src/commands.c:7989-7992`)** are single-line pass-throughs: `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demo{list,info} %s\n", params_str(1, -1));`. NO `is_playback` / `mv_is_playback()` / playback-state branch anywhere on the handler path.

**Implication for Root B rows (`dinfo`, `dlist`):** the STUFFCMD_IGNOREINDEMO clause omits the relayed `cmd demo*` from the MVD recording stream when the issuer's session is being recorded; it does NOT suppress the command if the issuer is viewing a demo. Any clause asserting "suppressed when issued from within demo playback" is wrong (and inverts the flag's recording-time vs. playback-time direction).

### Root C -- per-row defects (no shared site)

Three rows have no shared root and are treated per-seed:

- **`ktx:cvar:k_ctf_hook`** -- description claims toggle command is `"hook"`; exhaustive grep for the literal `{ "hook"` cmds[] registration returns ZERO. The actual command is `nohook` (`src/commands.c:916`). The "hook" string is the BROADCAST LABEL via `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"))` at `src/ctf.c:772`. Command-name inference from cvar/concept.
- **`ktx:command:fill:frogbot:std`** -- description claims parent command is `"frogbot"`; exhaustive grep for `{ "frogbot"` returns ZERO. The actual parent command is `botcmd` (`src/commands.c:1047`). The "frogbot" string is the function-family name (`FrogbotsCommand`, `FrogbotsFillServer`...), not a registered command. Command-name inference from function-family naming.
- **`ktx:info_key:*ml:userinfo`** -- description claims `*ml` holds the "previous (last) mmode value." The sole set-site at `src/g_cmd.c:1063` writes `*ml := mm := atoi(to)` where `to` is the NEW mmode value just being set (from the `info_sys_mm_update(p, from, to)` dispatch). The prior value `from` / `omm` is read at `:1053` only for an `mm==omm` early-out and is NEVER stored. "mmode last" (`g_cmd.c:1139-1148`) reads `*ml` and re-selects the same just-set mode. Name-inference from "ml" = "mode last" + the "mmode last" command string, contradicted by the enforcing assignment.

---

## Per-row results

(Authored per Step 5 inline; verified per Step 6 (sample-verify + inline self-check) per row below.)

---

B4-RESULT | ktx:command:auto_pow | TRACED-CLEAN | rev=1 | seed-clause: "Spectator-only and allowed only outside a live match" (CF_MATCHLESS name-inversion) | new-clause: spectator-only (CF_SPECTATOR), no match-state gate (CF_MATCHLESS is additive matchless-mode permission, not a match-block)

### ktx:command:auto_pow

- canonical_id: `ktx:command:auto_pow`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Spectator-only and allowed only outside a live match" -> MISMATCH at `include/g_local.h:653` (CF_MATCHLESS is the additive "command valid for matchLess mode" bit) + `src/commands.c:1078-1081` (the dispatch only blocks commands WITHOUT CF_MATCHLESS while the server is in matchless mode -- it is not a match-state guard); no `match_in_progress` guard exists in the `AutoTrack` body. Spectator-only half of the clause is correct (CF_SPECTATOR at the registration row). Seed at `/tmp/b4-flag-name-inversion/seed_ktx_command_auto_pow.md`.

- OLD description:
  > Spectator command that toggles automatic powerup tracking: with it on, the spectator's view automatically follows whichever live player currently scores highest by powerup weighting (pentagram > quad > ring, plus the player's frags). Issuing it again, or while it is already this mode, turns autotrack off. Affects only the issuing spectator; the chosen tracking mode is stored in the '*at' userinfo so it is restored after a level change. Spectator-only and allowed only outside a live match.

- NEW description:
  > Spectator command that toggles automatic powerup tracking: with it on, the spectator's view automatically follows whichever live player currently scores highest by powerup weighting (pentagram > quad > ring, plus the player's frags). Issuing it again, or while it is already this mode, turns autotrack off. Affects only the issuing spectator; the chosen tracking mode is stored in the `*at` userinfo so it is restored after a level change. Spectator-only (CF_SPECTATOR | CF_MATCHLESS at the registration row); no match-state gate on the handler -- it is dispatchable both during a live match and in matchless mode (CF_MATCHLESS is the additive "also valid in matchless mode" permission, not a match-block).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. The misseed access-class clause is corrected via Root A: registration `src/commands.c:895` `CF_SPECTATOR | CF_MATCHLESS`; dispatch `src/commands.c:1078-1081` gates CF_MATCHLESS-less commands in matchless mode only; `Init_cmds:1453-1456` promotes `CF_MATCHLESS_ONLY -> CF_MATCHLESS` (sister of `CF_SPC_ADMIN -> CF_SPECTATOR`); tree-wide grep for `cf_flags &=`/`cf_flags ^=` returns empty (no runtime clearing); the `AutoTrack` body (`src/commands.c:6081-6120`) carries no `match_in_progress` guard. Other clauses preserved from the V-pass MATCH cites: toggle at `:6086-6089`; `*at` userinfo write at `:6097`; level-change restore via `AutoTrackRestore` (`:6121+`) called from `src/spectate.c:225`; per-frame redirection in `DoAutoTrack`; powerup weighting in `CalculateBestPowPlayers` (`src/g_utils.c:2117-2123`) -- pent 4000, quad 2000, ring 1000, biosuit branch commented out, `+ s.v.frags`.

- NEW source_ref: `src/commands.c:6081` (handler entry AutoTrack)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Spectator command that toggles automatic powerup tracking" -> `src/commands.c:895` (registration, CF_SPECTATOR | CF_MATCHLESS, DEF(AutoTrack) atPow), `:6086-6089` (toggle)
  - "spectator's view follows whichever live player scores highest by powerup weighting" -> `src/commands.c:6017` (`case atPow: p = get_ed_bestPow();`) + `src/g_utils.c:2141` `get_ed_bestPow` + `:2086-2127` `CalculateBestPowPlayers` (per-frame in `DoAutoTrack` via `src/spectate.c:384-386`)
  - "pentagram > quad > ring, plus the player's frags" -> `src/g_utils.c:2117-2123` (pent 4000, quad 2000, ring 1000, +`s.v.frags`; biosuit branch commented out `:2120-2122`)
  - "Issuing it again, or while it is already this mode, turns autotrack off" -> `src/commands.c:6086-6089` `if ((autoTrackType == self->autotrack) || (autoTrackType == atNone)) self->autotrack = atNone;`
  - "Affects only the issuing spectator" -> per-`self`/per-edict `self->autotrack` (no broadcast)
  - "stored in `*at` userinfo so restored after a level change" -> `src/commands.c:6097` `SetUserInfo(self, "*at", va("%d", self->autotrack), SETUSERINFO_STAR);` + `src/spectate.c:225` `AutoTrackRestore()` call
  - "Spectator-only (CF_SPECTATOR | CF_MATCHLESS)" -> `src/commands.c:895` (registration flags)
  - "no match-state gate on the handler" -> `src/commands.c:6081-6120` (AutoTrack body, no `match_in_progress` branch)
  - "dispatchable both during a live match and in matchless mode (CF_MATCHLESS is the additive 'also valid in matchless mode' permission)" -> `include/g_local.h:653` (`/* command valid for matchLess mode */`) + `src/commands.c:1078-1081` (only blocks CF_MATCHLESS-less commands in matchless mode)

- verify route: inline-self-check (terminal-applied enforce-trace per clause; Root A V-passed at Step 4)
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:autotrackktx | TRACED-CLEAN | rev=1 | seed-clause: "and not while a match is locked" (CF_MATCHLESS name-inversion) | new-clause: spectator-only (CF_SPECTATOR), no match-state gate on the handler path

### ktx:command:autotrackktx

- canonical_id: `ktx:command:autotrackktx`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "and not while a match is locked" -> MISMATCH at `include/g_local.h:653` + `src/commands.c:1078-1081` (CF_MATCHLESS is additive matchless permission, NOT a match-lock guard) + `src/commands.c:6081-6119` AutoTrack body has no `match_in_progress` / match-lock branch + `is_rules_change_allowed` (`src/commands.c:9033-9040`) is never called on this path. Spectator-only half is correct. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_command_autotrackktx.md`.

- OLD description:
  > Spectator-only toggle that enables KTX's "best player" autotracking: while active, the camera automatically follows the player KTX rates as best to watch (rerouted each frame, with a brief delay before switching off a player who just died). Issuing it again while this mode is active turns autotracking off. Distinct from autotrack (KTeams-Pro event-driven autotrack) and auto_pow (follows powerup carriers); the chosen mode persists across map changes. Usable only by spectators and not while a match is locked.

- NEW description:
  > Spectator-only toggle that enables KTX's "best player" autotracking: while active, the camera automatically follows the player KTX rates as best to watch (rerouted each frame, with a brief delay before switching off a player who just died). Issuing it again while this mode is active turns autotracking off. Distinct from `autotrack` (KTeams-Pro event-driven autotrack) and `auto_pow` (follows powerup carriers); the chosen mode is stored in the `*at` userinfo so it persists across map changes. Spectator-only (CF_SPECTATOR | CF_MATCHLESS at the registration row); no match-state gate on the handler path -- it is dispatchable both during a live match and in matchless mode (CF_MATCHLESS is the additive "also valid in matchless mode" permission, not a match-lock).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. The misseed match-lock clause corrected via Root A (same enforcing lines as `auto_pow`: dispatch `src/commands.c:1078-1081`, `Init_cmds:1453-1456` promotion, no `cf_flags` clearing, no `match_in_progress` guard in `AutoTrack`). Other clauses preserved from V-pass MATCH cites: registration `src/commands.c:894` (`DEF(AutoTrack) atBest`, `CF_SPECTATOR | CF_MATCHLESS`); `case atBest: p = get_ed_best1();` at `src/commands.c:6013-6015` -> `get_ed_best1` -> `CalculateBestPlayers` (`src/g_utils.c:2127-2132`); per-frame redirection `DoAutoTrack` `src/spectate.c:386`; 2-second post-death hold at `src/commands.c:6059`; toggle at `:6086-6089`; `*at` userinfo persist at `:6097`; level-change restore via `AutoTrackRestore` at `src/spectate.c:225`. The three autotrack variants `atKTPRO=0` / `atBest=1` / `atPow=2` registered at `src/commands.c:893`-`:895`.

- NEW source_ref: `src/commands.c:6014` (handler dispatch `case atBest: p = get_ed_best1();`)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Spectator-only toggle ... KTX's 'best player' autotracking" -> `src/commands.c:894` (registration), `:6086-6089` (toggle), `:6013-6015` (`case atBest`)
  - "camera automatically follows the player KTX rates as best to watch" -> `src/g_utils.c:2127-2132` `CalculateBestPlayers`
  - "rerouted each frame" -> `src/spectate.c:386` `DoAutoTrack` per spectate frame
  - "brief delay before switching off a player who just died" -> `src/commands.c:6059` `if ((goal->ct == ctPlayer) && ISDEAD(goal) && ((g_globalvars.time - goal->dead_time) < 2)) ... return;` (2s post-death hold)
  - "Issuing it again while this mode is active turns autotracking off" -> `src/commands.c:6086-6089` (toggle)
  - "Distinct from autotrack (KTeams-Pro event-driven) and auto_pow (powerup carriers)" -> `src/commands.c:893` (atKTPRO -> CD_AUTOTRACK), `:894` (atBest -> CD_AUTOTRACKKTX), `:895` (atPow -> CD_AUTO_POW)
  - "stored in the `*at` userinfo so persists across map changes" -> `src/commands.c:6097` + `AutoTrackRestore` at `:6121+` called from `src/spectate.c:225`
  - "Spectator-only (CF_SPECTATOR | CF_MATCHLESS)" -> `src/commands.c:894`
  - "no match-state gate on the handler path; dispatchable during live match and in matchless mode; CF_MATCHLESS is additive permission, not match-lock" -> `include/g_local.h:653` + `src/commands.c:1078-1081` + `src/commands.c:6081-6119` (no match guard in body)

- verify route: inline-self-check (Root A V-passed at Step 4; same enforcing lines as `auto_pow`)
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:dinfo | TRACED-CLEAN | rev=1 | seed-clause: "suppressed when issued from within demo playback" (STUFFCMD_IGNOREINDEMO flag-name inversion) | new-clause: relayed `cmd demoinfo` is omitted from the MVD recording stream (recording-time exclusion), no playback-time gate on the handler

### ktx:command:dinfo

- canonical_id: `ktx:command:dinfo`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "The command is suppressed when issued from within demo playback" -> MISMATCH at `include/g_syscalls.h:57` `#define STUFFCMD_IGNOREINDEMO (1<<0) // do not put in mvd demo` (canonical comment defines it as recording-stream exclusion); `src/commands.c:7989-7992` `dinfo` body and the registration at `src/commands.c:966` contain no `mv_is_playback()` / `is_playback` branch. The clause inverts a demo-recording-exclusion flag into a playback-time guard. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_command_dinfo.md`.

- OLD description:
  > Requests demo information from the server for the current or specified demo: it forwards a 'demoinfo' command (with any arguments passed through) to the underlying MVDSV server, which returns the demo's details. The command is suppressed when issued from within demo playback.

- NEW description:
  > Requests demo information from the server for the current or specified demo by forwarding a `cmd demoinfo` request (with any arguments passed through) to the underlying MVDSV server, which produces the response server-side. The stuffed command is flagged STUFFCMD_IGNOREINDEMO, which means MVDSV omits this relayed `cmd demoinfo` from any MVD recording in progress for the issuer's session (it is housekeeping that would clutter the demo stream without informational value). The flag is recording-stream exclusion, not playback-time suppression -- the handler has no `is_playback` / `mv_is_playback()` guard, so issuing `dinfo` is not blocked when the user is viewing a demo.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Root B V-pass: `include/g_syscalls.h:57` `STUFFCMD_IGNOREINDEMO (1<<0) // do not put in mvd demo` with sibling `:58` `STUFFCMD_DEMOONLY (1<<1) // put in mvd demo only` confirms the recording-stream framing; ~80+ use-sites across `src/` use the flag for short client-side housekeeping (`color N`, `team X`, `rate N`, `on_connect_*`, `track N`, `name "X"`, etc.); `mv_is_playback()` exists at `src/commands.c:8133-8136` but its only consumers are MVD record/playback enable/disable handlers (`:8140`, `:8183`, `:8278`), never `dlist`/`dinfo`. The corrected clause anchors on this preamble. Other clauses preserved from V-pass MATCH cites: handler body `src/commands.c:7989-7992` is a single-line `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demoinfo %s\n", params_str(1, -1));` pass-through; `params_str(1, -1)` at `src/g_utils.c:2610` returns all args from index 1; registration `src/commands.c:966` `CF_BOTH | CF_MATCHLESS | CF_PARAMS` with CD_DINFO.

- NEW source_ref: `src/commands.c:7991` (the authoritative pass-through line)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Requests demo information from the server ... forwarding a `cmd demoinfo` request (with any arguments passed through)" -> `src/commands.c:7991` `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demoinfo %s\n", params_str(1, -1));` + `src/g_utils.c:2610` `params_str(1, -1)` (all args from index 1)
  - "to the underlying MVDSV server, which produces the response server-side" -> `src/commands.c:7991` (the `cmd ...` stuffed back to client, relayed by client to server)
  - "stuffed command is flagged STUFFCMD_IGNOREINDEMO, which means MVDSV omits this relayed `cmd demoinfo` from any MVD recording in progress" -> `include/g_syscalls.h:57` `// do not put in mvd demo`
  - "recording-stream exclusion, not playback-time suppression" -> sibling `include/g_syscalls.h:58` `STUFFCMD_DEMOONLY // put in mvd demo only` + absence of any `is_playback`-gated dispatch
  - "handler has no `is_playback` / `mv_is_playback()` guard" -> `src/commands.c:7989-7992` (handler body) + `src/commands.c:8133-8136` (mv_is_playback consumers: only MVD record/playback control handlers)

- verify route: inline-self-check (Root B V-passed at Step 4)
- verify verdict: TRACED-CLEAN (5 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:dlist | TRACED-CLEAN | rev=1 | seed-clause: "suppressed when issued from within demo playback" (STUFFCMD_IGNOREINDEMO flag-name inversion) | new-clause: relayed `cmd demolist` is omitted from the MVD recording stream (recording-time exclusion), no playback-time gate on the handler

### ktx:command:dlist

- canonical_id: `ktx:command:dlist`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "The command is suppressed when issued from within demo playback" -> MISMATCH at `include/g_syscalls.h:57` (recording-stream exclusion semantic, NOT playback-time guard); no enforcing line suppresses `dlist` during playback. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_command_dlist.md`.

- OLD description:
  > Lists the demos available on the server: it forwards a 'demolist' command (with any arguments passed through) to the underlying MVDSV server, which returns the demo listing. The command is suppressed when issued from within demo playback.

- NEW description:
  > Lists the demos available on the server by forwarding a `cmd demolist` request (with any arguments passed through) to the underlying MVDSV server, which returns the demo listing server-side. The stuffed command is flagged STUFFCMD_IGNOREINDEMO, which means MVDSV omits this relayed `cmd demolist` from any MVD recording in progress for the issuer's session (housekeeping that would clutter the demo without informational value). The flag is recording-stream exclusion, not playback-time suppression -- the handler has no `is_playback` / `mv_is_playback()` guard, so issuing `dlist` is not blocked when the user is viewing a demo.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Same Root B preamble as `dinfo` (`include/g_syscalls.h:57` recording-exclusion semantic; sibling `:58` STUFFCMD_DEMOONLY; ~80+ housekeeping use-sites). Handler body `src/commands.c:7984-7987` single-line `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demolist %s\n", params_str(1, -1));` pass-through; registration `src/commands.c:965` `CF_BOTH | CF_MATCHLESS | CF_PARAMS` with CD_DLIST.

- NEW source_ref: `src/commands.c:7986` (the authoritative pass-through line)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Lists the demos available on the server ... forwarding a `cmd demolist` request (with any arguments passed through)" -> `src/commands.c:7986` + `src/g_utils.c:2610` `params_str(1, -1)`
  - "to the underlying MVDSV server, which returns the demo listing server-side" -> `src/commands.c:7986` (stuffed `cmd demolist` relayed by client to server)
  - "stuffed command is flagged STUFFCMD_IGNOREINDEMO ... MVDSV omits this relayed `cmd demolist` from any MVD recording in progress" -> `include/g_syscalls.h:57` `// do not put in mvd demo`
  - "recording-stream exclusion, not playback-time suppression" -> `include/g_syscalls.h:58` `STUFFCMD_DEMOONLY // put in mvd demo only` (sibling confirms framing) + absence of `is_playback`-gated dispatch
  - "handler has no `is_playback` / `mv_is_playback()` guard" -> `src/commands.c:7984-7987` (handler body)

- verify route: inline-self-check (Root B V-passed at Step 4; identical pattern to dinfo, same enforcing lines)
- verify verdict: TRACED-CLEAN (5 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:fill:frogbot:std | TRACED-CLEAN | rev=1 | seed-clause: "Frogbot subcommand ('frogbot fill')" (command-name inference; no `frogbot` command exists) | new-clause: `fill` subcommand of the standard `botcmd` (parent registered as `botcmd`; FrogbotsCommand dispatches to `std_commands[]`)

### ktx:command:fill:frogbot:std

- canonical_id: `ktx:command:fill:frogbot:std`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Frogbot subcommand ('frogbot fill')" -> MISMATCH at `src/commands.c:1047` `{ "botcmd", FrogbotsCommand, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_BOTCOMMAND }` + `src/bot_commands.c:2319` `{ "fill", FrogbotsFillServer, "Fills the server (max 8 bots at a time)" }`. Tree-wide grep for `{ "frogbot"` returns ZERO -- no `frogbot` command or alias exists. The "frogbot" string is inferred from the `Frogbots*` function-family name; the actual parent registered command is `botcmd`. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_command_fill_frogbot_std.md`.

- OLD description:
  > Frogbot subcommand ("frogbot fill"). Adds frogbots to fill the empty client slots up to the server's maxclients, capped at 8 bots added per invocation; run it again to add more. An optional numeric third argument sets the skill level for the bots added (and stores it as the current frogbot skill); without it the bots use the current frogbot skill level.

- NEW description:
  > Subcommand of the `botcmd` parent command in the standard (non-editor) `std_commands[]` dispatch table -- invoked as `botcmd fill [skill]`. Adds frogbots to fill the empty client slots up to the server's `maxclients`, capped at 8 bots added per invocation; run it again to add more. An optional numeric third argument sets the skill level for the bots added (and stores it as the current frogbot skill via `FB_CVAR_SKILL`); without it the bots use the current frogbot skill level returned by `FrogbotSkillLevel()`. Subject to the `FB_CVAR_ADMIN_ONLY` runtime admin gate at the top of `FrogbotsCommand` (2 = real-admin required, 1 = admin required, 0 = unrestricted), and reached via the standard dispatch table only when `FB_OPTION_EDITOR_MODE` is OFF.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Root C per-row defect (command-name inference): tree-wide grep for `{ "frogbot"` returns empty; the parent command registered at `src/commands.c:1047` is `botcmd` -> `FrogbotsCommand`. `FrogbotsCommand` (`src/bot_commands.c:2383+`) dispatches `frogbot_cmd_t *commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;`, so the `:fill:frogbot:std` knob is reached via the `std_commands[]` table only when editor mode is off. `std_commands[]` carries `{ "fill", FrogbotsFillServer, "..." }` at `src/bot_commands.c:2319`. Other clauses preserved from V-pass MATCH cites: handler `src/bot_commands.c:1887-1912` reads `cvar("maxclients")` (`:1889`), bounded loop `for (i = 0; i < min(max_clients - plr_count, 8); ++i)` at `:1906`, optional 3rd argv `(CmdArgc>=3) && isdigit(temp[0]) -> skill_level = atoi(temp)` at `:1894-1900`, `cvar_fset(FB_CVAR_SKILL, skill_level)` persists at `:1911`, default `skill_level = FrogbotSkillLevel()` at `:1891`. The new `FB_CVAR_ADMIN_ONLY` clause traced to the gate at the top of `FrogbotsCommand` (`src/bot_commands.c:2393-2405`).

- NEW source_ref: `src/bot_commands.c:1906` (the authoritative slot-fill loop)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Subcommand of the `botcmd` parent command in the standard `std_commands[]` dispatch table -- invoked as `botcmd fill [skill]`" -> `src/commands.c:1047` (parent `botcmd` registration) + `src/bot_commands.c:2383` `FrogbotsCommand` body + `:2315` `static frogbot_cmd_t std_commands[]` + `:2319` `{ "fill", FrogbotsFillServer, "..." }`
  - "Adds frogbots to fill the empty client slots up to the server's `maxclients`" -> `src/bot_commands.c:1889` `int max_clients = cvar("maxclients");` + `:1906` `min(max_clients - plr_count, 8)`
  - "capped at 8 bots added per invocation" -> `src/bot_commands.c:1906`
  - "run it again to add more" -> `:1906` (per-invocation bounded loop)
  - "optional numeric third argument sets the skill level" -> `src/bot_commands.c:1894-1900` `if (trap_CmdArgc() >= 3) { ... if (isdigit(temp[0])) skill_level = atoi(temp); }`
  - "stores it as the current frogbot skill via `FB_CVAR_SKILL`" -> `src/bot_commands.c:1911` `cvar_fset(FB_CVAR_SKILL, skill_level);`
  - "without it the bots use the current frogbot skill level returned by `FrogbotSkillLevel()`" -> `src/bot_commands.c:1891` `int skill_level = FrogbotSkillLevel();`
  - "Subject to the `FB_CVAR_ADMIN_ONLY` runtime admin gate at the top of `FrogbotsCommand` (2 = real-admin, 1 = admin, 0 = unrestricted)" -> `src/bot_commands.c:2393-2405` `float admin_rules = cvar(FB_CVAR_ADMIN_ONLY); if ((admin_rules == 2) && !is_real_adm(self)) { ... return; } else if (admin_rules && !is_adm(self)) { ... return; }`
  - "reached via the standard dispatch table only when `FB_OPTION_EDITOR_MODE` is OFF" -> `src/bot_commands.c:2385-2386` `frogbot_cmd_t *commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;`

- verify route: sample-verify (subagent: Opus 4.7 MAX, blind) -- this row is the highest-variation pick (Root C with the most complex per-clause structure: parent-cmd correction + dispatch-table branching + admin-class gate + editor-mode routing)
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH; per-clause table at `/tmp/b4-flag-name-inversion/sample_verify.md`)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_ctf_hook | TRACED-CLEAN | rev=1 | seed-clause: "Toggleable in-game via the CTF 'hook' command" (command-name inference; no `hook` command exists, only `nohook`) | new-clause: toggleable via the `nohook` command (announced as "hook" via redtext label)

### ktx:cvar:k_ctf_hook

- canonical_id: `ktx:cvar:k_ctf_hook`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Toggleable in-game via the CTF 'hook' command" -> MISMATCH at exhaustive grep for `{ "hook"` returns ZERO; the actual registered command is `nohook` at `src/commands.c:916` `{ "nohook", nohook, 0, CF_PLAYER | CF_MATCHLESS, CD_NOHOOK }`. The "hook" string is the broadcast LABEL via `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"))` at `src/ctf.c:772`, not the registered command name -- name-inference from the cvar / concept. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_cvar_k_ctf_hook.md`.

- OLD description:
  > When enabled (non-zero), every player in CTF mode is given the grappling hook (added to their inventory on spawn) and may quick-switch to it by re-selecting the axe. When disabled, the hook is removed from all players. Toggleable in-game via the CTF "hook" command (announced as "hook").

- NEW description:
  > When enabled (non-zero), every player in CTF mode is given the grappling hook (added to their inventory on spawn in `PutClientInServer`) and may quick-switch to it by re-selecting the axe. When disabled, the hook is removed from all players (the `AddHook(false)` sweep clears `IT_HOOK` from every player and resets any in-flight hook entity). Toggleable in-game by the `nohook` command (registered as `nohook`, not `hook`), which calls `cvar_toggle_msg` to flip the cvar and broadcast the announce label "hook"; in matchless mode `nohook` additionally calls `AddHook(true|false)` immediately so the toggle takes effect mid-game.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Root C per-row defect: exhaustive grep for `{ "hook"` registration returns empty; the actual command is `nohook` at `src/commands.c:916` (`nohook` handler at `src/ctf.c:758-783`). The "hook" string is the announce LABEL passed to `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"))` at `src/ctf.c:772` -- the redtext() label, not a command name. Other clauses preserved from V-pass MATCH cites: spawn-time grant `src/client.c:2341-2345` `if (isCTF()) { if (cvar("k_ctf_hook")) { self->s.v.items |= IT_HOOK; } }`; axe quick-switch `src/weapons.c:2381` `if (isCTF() && (self->s.v.weapon == IT_AXE) && cvar("k_ctf_hook")) { fl = IT_HOOK; }`; `AddHook` sweep `src/ctf.c:184-211` (yes branch adds IT_HOOK, no branch strips IT_HOOK + clears in-flight hook entity + clears active hook weapon); change-detection `src/world.c:1297-1299` `if ((old_k_mode != k_mode) || (k_ctf_hook != cvar("k_ctf_hook"))) { AddHook(isCTF() && cvar("k_ctf_hook")); }`; matchless-mode immediate-apply branch at `src/ctf.c:774-783`.

- NEW source_ref: `src/client.c:2344` (the authoritative spawn-time grant gate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "every player in CTF mode is given the grappling hook (added on spawn in `PutClientInServer`)" -> `src/client.c:2341-2345`
  - "may quick-switch to it by re-selecting the axe" -> `src/weapons.c:2381`
  - "When disabled, the hook is removed from all players (the `AddHook(false)` sweep clears `IT_HOOK` ... and resets any in-flight hook entity)" -> `src/world.c:1297-1299` (change-detection -> `AddHook(...)` call) + `src/ctf.c:184-211` `AddHook` body (item strip, GrappleReset, hook-weapon clear)
  - "Toggleable in-game by the `nohook` command (registered as `nohook`, not `hook`)" -> `src/commands.c:916` `{ "nohook", nohook, 0, CF_PLAYER | CF_MATCHLESS, CD_NOHOOK }` + `src/ctf.c:758` handler entry
  - "which calls `cvar_toggle_msg` to flip the cvar and broadcast the announce label 'hook'" -> `src/ctf.c:772` `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"));`
  - "in matchless mode `nohook` additionally calls `AddHook(true|false)` immediately so the toggle takes effect mid-game" -> `src/ctf.c:774-783` (matchless-mode immediate-apply branch)

- verify route: inline-self-check (Root C per-row; the defect cuts to a single registration-table miss and the broadcast-label vs command-name distinction)
- verify verdict: TRACED-CLEAN (6 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_vp_map | TRACED-CLEAN | rev=1 | seed-clause: parenthetical "(where /break does not exist)" (CF_MATCHLESS name-inversion lifted from a misleading code comment) | new-clause: in matchless mode, the OV_BREAK vote (the same `/break` command) reads `k_vp_map` for its percentage threshold instead of `k_vp_break`

### ktx:cvar:k_vp_map

- canonical_id: `ktx:cvar:k_vp_map`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): governs-clause MATCH; parenthetical "(where /break does not exist)" -> MISMATCH at `src/commands.c:709` `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }` -- `/break` HAS CF_MATCHLESS (additive) and lacks CF_MATCHLESS_ONLY, so it IS dispatchable in matchless mode. The parenthetical was lifted verbatim from the code comment at `src/vote.c:246` (`// in matchless mode there is no /break but /next_map so using "k_vp_map"`), but the command-table line contradicts the comment. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_cvar_k_vp_map.md`.

- OLD description:
  > The percentage of eligible voters required to pass a map-change vote. Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)) and is tallied against the most-voted map; in Race mode a mode-specific count is used. This cvar also governs the next-map vote in matchless mode (where /break does not exist).

- NEW description:
  > The percentage of eligible voters required to pass a map-change vote. Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is `ceil(percent/100 * (players minus bots))` and is tallied against the most-voted map; in Race mode a mode-specific count is used (`race_count_votes_req(percent)`). In matchless mode this same cvar also drives the OV_BREAK vote -- i.e. the `/break` vote that becomes a next-map vote when no formal match is in progress -- so `k_vp_map` substitutes for `k_vp_break` on that path; `/break` itself is still dispatchable in matchless mode (it carries CF_MATCHLESS at registration, with no CF_MATCHLESS_ONLY).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. The misseed parenthetical corrected via Root A: `src/commands.c:709` registers `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }` -- CF_MATCHLESS is additive, so `/break` is dispatchable in matchless mode. The vote.c:246 comment ("in matchless mode there is no /break but /next_map") is the source the OLD synth lifted from, but is loose-prose contradicted by the command-table. The corrected clause states the actual behavior: OV_BREAK reads `k_vp_map` in matchless mode (`src/vote.c:245-247`). Other clauses preserved from V-pass MATCH cites: OV_MAP read at `src/vote.c:257-258`; bound + scale at `src/vote.c:330` `bound(0.51, bound(51, percent, 100) / 100, 1)`; vote-count formula at `src/vote.c:343` `vt_req = ceil(percent * (CountPlayers() - CountBots()));`; race-mode branch at `src/vote.c:332-334` `if (isRACE() && (fofs == OV_MAP)) { vt_req = race_count_votes_req(percent); }`; most-voted-map tally at `src/vote.c:259-263`.

- NEW source_ref: `src/vote.c:258` (the primary OV_MAP read site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "percentage of eligible voters required to pass a map-change vote" -> `src/vote.c:257-258` `case OV_MAP: percent = cvar("k_vp_map");`
  - "Expressed as a whole-number percentage; floored at 51 and capped at 100" -> `src/vote.c:330` `percent = bound(0.51, bound(51, percent, 100) / 100, 1);`
  - "required vote count is `ceil(percent/100 * (players minus bots))`" -> `src/vote.c:343` `vt_req = ceil(percent * (CountPlayers() - CountBots()));`
  - "tallied against the most-voted map" -> `src/vote.c:259-263` `idx = vote_get_maps(); if ((idx >= 0) && ...) { votes = maps_voted[idx].map_votes; }`
  - "in Race mode a mode-specific count is used (`race_count_votes_req(percent)`)" -> `src/vote.c:332-334` `if (isRACE() && (fofs == OV_MAP)) { vt_req = race_count_votes_req(percent); }`
  - "In matchless mode this same cvar also drives the OV_BREAK vote ... `k_vp_map` substitutes for `k_vp_break`" -> `src/vote.c:245-247` `case OV_BREAK: percent = cvar(k_matchLess ? "k_vp_map" : "k_vp_break"); break;`
  - "`/break` itself is still dispatchable in matchless mode (CF_MATCHLESS at registration, no CF_MATCHLESS_ONLY)" -> `src/commands.c:709` `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }` + `src/commands.c:1078-1086` (dispatch gates; CF_MATCHLESS-bearing commands always reach dispatch)

- verify route: inline-self-check (Root A V-passed at Step 4)
- verify verdict: TRACED-CLEAN (7 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:info_key:*ml:userinfo | TRACED-CLEAN | rev=1 | seed-clause: "client's PREVIOUS ('last') mmode value; the server records the PRIOR mode here" (name-inference from "ml" = "mode last" + "mmode last" command string) | new-clause: `*ml` holds the most-recently-set non-zero mmode value (= the value `*mm` was being set to), so "mmode last" re-selects the latest non-zero mode

### ktx:info_key:*ml:userinfo

- canonical_id: `ktx:info_key:*ml:userinfo`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "holding the client's PREVIOUS ('last') mmode value; the server records the PRIOR mode here" -> MISMATCH at `src/g_cmd.c:1048-1063` `info_sys_mm_update(p, from, to)` body: `int mm = atoi(to);` (NEW value), `int omm = atoi(from);` (OLD value); after the `mm == omm` and `mm == MMODE_NONE` early-outs, `SetUserInfo(p, "*ml", va("%d", mm), SETUSERINFO_STAR);` -- `*ml` is set to `mm` = the NEW just-set mmode value, NOT the previous. The prior `omm`/`from` is read only for the no-change early-out and is never stored. "mmode last" at `src/g_cmd.c:1139-1148` reads `*ml` and re-selects the just-set mode. Seed at `/tmp/b4-flag-name-inversion/seed_ktx_info_key__ml_userinfo.md`.

- OLD description:
  > Server-set star userinfo key holding the client's previous ("last") mmode value. When the active mmode (*mm) changes the server records the prior mode here so the "mmode last" command can restore it. Value is the MMODE enum: 0 = none, 1 = player, 2 = team, 3 = multi, 4 = rcon, 5 = name.

- NEW description:
  > Server-set star userinfo key holding the most-recently-set non-zero mmode value -- i.e. the latest value the server wrote to `*mm` (excluding transitions to NONE). Updated by `info_sys_mm_update` whenever the active mmode (`*mm`) changes to a different non-zero value; if the new value equals the current `*mm` or is NONE the function returns early without writing. The "mmode last" command (`mmode last`) reads this key to re-select the latest non-zero mode -- effectively a "restore the last non-zero mmode I was in" lookup that is useful after the user has transitioned `*mm` to NONE (or to another mode and then back). The value is the MMODE enum: 0 = none, 1 = player, 2 = team, 3 = multi, 4 = rcon, 5 = name. (The "last" / "ml" naming reflects the user-facing "mmode last" command; the stored value is the latest non-zero mmode, not the value `*mm` held before the most recent change.)

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Root C per-row defect: the sole set-site at `src/g_cmd.c:1063` `SetUserInfo(p, "*ml", va("%d", mm), SETUSERINFO_STAR);` writes `mm = atoi(to)` -- the NEW value, not the previous. The `from`/`omm` parameter is read only for the `mm == omm` early-out at `:1053`. The `mm == MMODE_NONE` guard at `:1057` skips writes when transitioning to NONE, so `*ml` retains the latest non-zero value across NONE transitions -- which makes "mmode last" useful for restoring after a transition to NONE. Dispatch chain: `info_sys_mm_update` is invoked from the userinfo-callback table at `src/g_userinfo.c:287/295` (`old = ezinfokey(self, arg_1); (cinfos[i].f)(self, old, arg_2);` -- from=OLD `*mm`, to=NEW `*mm`). Other clauses preserved from V-pass MATCH cites: enum mapping at `include/g_consts.h:291-296` (MMODE_NONE 0, PLAYER 1, TEAM 2, MULTI 3, RCON 4, NAME 5); read+restore at `src/g_cmd.c:1139-1148` `int last = iKey(self, "*ml"); SetUserInfo(self, "*mm", va("%d", last), ...); G_sprint(..., "last mmode(%s)\n", mmode_str(last));`. The semantic-rather-than-temporal framing ("most-recently-set non-zero" instead of "previous") is the corrected anchor.

- NEW source_ref: `src/g_cmd.c:1063` (the sole `*ml` set-site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Server-set star userinfo key" -> `src/g_cmd.c:1063` `SetUserInfo(p, "*ml", va("%d", mm), SETUSERINFO_STAR);` (sole set-site tree-wide; `src/g_userinfo.c:45` is a commented-out table entry)
  - "holding the most-recently-set non-zero mmode value -- i.e. the latest value the server wrote to `*mm` (excluding transitions to NONE)" -> `src/g_cmd.c:1048-1063` `info_sys_mm_update(p, from, to) { int mm = atoi(to); int omm = atoi(from); if (mm == omm) return; if (mm == MMODE_NONE) return; SetUserInfo(p, "*ml", va("%d", mm), ...); }` -- mm = atoi(to) = NEW value; from/omm read only for the mm==omm early-out
  - "Updated by `info_sys_mm_update` whenever the active mmode (`*mm`) changes to a different non-zero value" -> `src/g_userinfo.c:287/295` dispatch (from=OLD/to=NEW) -> `src/g_cmd.c:1048-1063` body
  - "if the new value equals the current `*mm` or is NONE the function returns early" -> `src/g_cmd.c:1053-1058` (`mm == omm` and `mm == MMODE_NONE` early-outs)
  - "'mmode last' command reads this key to re-select the latest non-zero mode" -> `src/g_cmd.c:1139-1148` `int last = iKey(self, "*ml"); SetUserInfo(self, "*mm", va("%d", last), SETUSERINFO_STAR); G_sprint(self, 2, "last mmode(%s)\n", mmode_str(last));`
  - "useful after the user has transitioned `*mm` to NONE (or to another mode and then back)" -> the `mm == MMODE_NONE` early-out at `:1057` preserves the prior non-zero value across NONE transitions (semantic derivation from the early-out, not a separate enforcing line)
  - "value is the MMODE enum: 0 = none, 1 = player, 2 = team, 3 = multi, 4 = rcon, 5 = name" -> `include/g_consts.h:291-296` `MMODE_NONE(0) MMODE_PLAYER(1) MMODE_TEAM(2) MMODE_MULTI(3) MMODE_RCON(4) MMODE_NAME(5)`
  - "the 'last' / 'ml' naming reflects the user-facing 'mmode last' command; the stored value is the latest non-zero mmode, not the value `*mm` held before the most recent change" -> direct statement of the corrected semantic vs the name-inferred OLD description, anchored on the set-site + early-out structure above

- verify route: inline-self-check (Root C per-row; the set-site at g_cmd.c:1063 + early-outs at :1053-:1058 + the read/restore at :1139-:1148 form a closed loop)
- verify verdict: TRACED-CLEAN (8 clauses, all MATCH)
- attempts: 1

---

## Cluster summary

- **8 rows processed, 8 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** sample-verify 1 (`fill:frogbot:std`, dispatched Opus 4.7 MAX subagent, read-only, blind) + inline-self-check 7 (terminal-applied enforce-trace per clause, anchored on Root A V-pass for `auto_pow` / `autotrackktx` / `k_vp_map`, Root B V-pass for `dinfo` / `dlist`, per-row defect cites for `k_ctf_hook` / `*ml:userinfo`).
- **Total synth dispatches:** 0 (lean v2: inline authoring replaces per-row Opus synth fan-out).
- **Total verify dispatches:** 1 (lean v2: ONE blind sample on the highest-variation row; inline self-check on the other 7).
- **Sampled row:** `ktx:command:fill:frogbot:std` (highest per-row variation -- parent-cmd correction + dispatch-table branching + FB_CVAR_ADMIN_ONLY runtime gate + FB_OPTION_EDITOR_MODE routing; two clauses new vs the V-pass seed required external verification).
- **Sampled verifier verdict:** TRACED-CLEAN (11 clauses, all MATCH; per-clause table at `/tmp/b4-flag-name-inversion/sample_verify.md`).
- **Per-row attempts avg:** 1.0.

### Methodology gains captured

1. **Pass 1 sub-group framing refined by per-row seeds.** Pass 1 grouped `k_ctf_hook` into sub-group A (CF_MATCHLESS) and the three other rows into sub-group C as no-shared-site. The actual seed evidence re-sorted them into Root A (CF_MATCHLESS additive -- 3 rows: `auto_pow`, `autotrackktx`, `k_vp_map`-parenthetical) + Root B (STUFFCMD_IGNOREINDEMO direction -- 2 rows: `dinfo`, `dlist`) + Root C (per-row command/name inference -- 3 rows: `k_ctf_hook`, `fill:frogbot:std`, `*ml:userinfo`). `k_vp_map`'s parenthetical "(where /break does not exist)" is a CF_MATCHLESS-shape defect even though the cvar itself is a vote-percent knob -- the wrong-clause shape (not the row's primary domain) drives Root assignment.
2. **Root A shares enforcing lines with the dead-CF_SPC_ADMIN cluster's Init_cmds promotion lesson.** The `Init_cmds` at `src/commands.c:1427-1458` applies three structurally parallel flag promotions: `CF_PLR_ADMIN -> CF_PLAYER` (`:1443-1446`), `CF_SPC_ADMIN -> CF_SPECTATOR` (`:1448-1451`), `CF_MATCHLESS_ONLY -> CF_MATCHLESS` (`:1453-1456`). The dead-CF_SPC_ADMIN cluster surfaced the second promotion; B1's Root A surfaces the third. The pattern is consistent: registered flags are a shorthand, runtime flags include the promoted bits. Future B4 batches dealing with command-flag defects should grep for all three promotions before drafting.
3. **Sample-verify callee-follow held without re-dispatch.** The verifier explicitly followed the call chain into `FrogbotSkillLevel()` body at `bot_commands.c:113-116` to verify the "current frogbot skill" clause. The 2026-05-20 callee-follow amendment (dropquad rev=3) carried forward end-to-end with no false-negative; the verifier's table cites the callee body alongside the caller `:1891`.
4. **Root B has only 2 members.** STUFFCMD_IGNOREINDEMO direction defects are likely rare across the broader KTX corpus (only `dinfo` and `dlist` carry the user-visible "during demo playback" misseed inference); the flag's other ~80 use-sites are short housekeeping stuffs that are not user-facing commands.

### Token-cost observation (vs midair_minheight calibration)

- midair_minheight calibration (2 rows, parametric family): ~110k total terminal-side + 1 subagent (58k).
- B1 (8 rows, three roots; mixed parametric + per-row): ~estimated 110-160k total terminal-side (8 rows including code-reading + inline authoring + ledger composition) + 1 subagent (~49k as reported). Sub-agent count: 1. Per-row cost: ~20k -- in line with the Pass 1 projection of 90-120k for the batch.
- The terminal-side scaled sub-linearly with row count because the two V-passed roots amortize across 3 + 2 = 5 of the 8 rows; only the 3 Root-C rows required per-row pre-trace work.

### Open items / forward-looking

- The Root A pattern's third Init_cmds promotion (CF_MATCHLESS_ONLY -> CF_MATCHLESS) is now V-passed in both the dead-CF_SPC_ADMIN cluster ledger (for the SPC_ADMIN sister) and this B1 ledger (for the MATCHLESS_ONLY sister). Future B-batch clusters touching command-flag defects can cite either as the methodology anchor.
- No new findings outside the V-pass seed scope. No DB writes (C4 honored).
- The 7 inline-self-check verdicts (vs the 1 sample-verify) were each anchored on V-pass MATCH cites for the preserved clauses + V-passed Root A/B for the corrected clauses + per-row enforce-trace for `k_ctf_hook` + `*ml:userinfo` (Root C). All cites in the per-clause lists are reproducible from the oracle at `1.47-2-g67253dc`.



