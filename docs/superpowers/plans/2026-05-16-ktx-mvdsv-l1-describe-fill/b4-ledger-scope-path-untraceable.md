# B4 ledger -- scope-path-untraceable batch (lean v2 Pass 2)

**Batch id:** B6 (`scope-path-untraceable`)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Batch members:** 17 rows
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth loop. B5 Stage-2 change-report ledger per row.
**Prompt:** `b4-unique-rows-pass2-template` (lean v2, terminal Batch B6).
**Triage plan:** `b4-unique-rows-triage-plan.md`, Batch B6 section.

## Members

```
ktx:command:fragsup                  # C-NEAR-MISS: hoony branches unreachable via fragsup
ktx:command:health:frogbot:std       # C-NEAR-MISS: "when bots are added" too broad
ktx:command:infospec                 # C-NEAR-MISS: ON/OFF casing
ktx:command:laststats                # C-NEAR-MISS: "same tables shown automatically" equivalence inferred
ktx:command:lgcmode                  # C-NEAR-MISS: "turning it on" conditional framing on unconditional clears
ktx:command:pickspawn                # C-NEAR-MISS: "only in HoonyMode" team path not actually gated
ktx:command:prewar                   # C-NEAR-MISS: match-state scoping on broadcast + state-0 stop
ktx:command:qenemy                   # C-NEAR-MISS: "restricted" framing UNTRACEABLE on KTX side
ktx:command:race_countdown_up        # C-NEAR-MISS: "clamped" mischaracterizes reject-vs-saturate
ktx:command:removeitem               # C-NEAR-MISS: "the dropped item" overbroad vs dropitem-flag scope
ktx:command:socd                     # C-NEAR-MISS: "on each violation" omits socdDetectionCount>=3 gate
ktx:command:uinfo                    # C-NEAR-MISS: "every non-system userinfo key" overbroad vs cinfos[]
ktx:cvar:k_clan_arena                # C-NEAR-MISS: "no item pickups" UNTRACEABLE on CA path
ktx:cvar:k_extralog                  # C-NEAR-MISS: "...players..." peer-area UNTRACEABLE
ktx:cvar:k_fbskill_aim_lgpref        # C-NEAR-MISS: "not deep underwater" omits IT_INVULNERABILITY OR
ktx:cvar:k_pow_p                     # C-NEAR-MISS: "held pentagrams not dropped" not k_pow_p-enforced
ktx:cvar:k_spw                       # C-NEAR-MISS: "higher KTX modes add anti-telefrag" conflates k_spw==1
```

## v2-shape note

Per the midair-minheight calibration (lean v2 sweet spot): ONE inline
source-of-truth understanding (Step 4 V-pass of the shared root) + per-row
inline authoring (Step 5, terminal-applied enforce-trace per clause) + ONE
blind sample-verify subagent (Step 6) on the highest-variation row + inline
self-check on the remaining 16. Methodology gains preserved -- cluster-shared
root is hypothesis (V-passed up front), callee-follow on every clause,
ELABORATION DISCIPLINE in re-authoring (every NEW clause is itself a
flavour-C surface, traced the same way).

For B6 specifically: the shared "root" is structural, not a single shared
code site. Each row's defect is at its own enforcing line (or absence of
one) on the feature's own handler path. The Step 4 V-pass validates the
SHAPE, not a single code site -- 2-3 representative falsifiable claims
re-confirmed at the source oracle.

## Pre-reads (loaded at session start)

- `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
  -- B1 method + canonical worked cases + 2026-05-20 callee-follow amendment
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-triage-plan.md`
  -- the 6-batch plan; B6 section is seed input for Step 4
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
  D7 Amendment 2026-05-19 (B4) -- seeded re-synth contract
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-midair-minheight.md`
  -- lean v2 calibration; ledger shape + Step 8 report
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md`
  -- prior cluster; Init_cmds finding + dropquad rev=3 callee-follow case

## Shared-root V-pass (Step 4) -- PASSED

**Shape claim:** Every row in B6 carries at least one clause asserting a
scope restriction, access gate, or conditional behaviour that the V-pass
located NOT at an enforcing line on the feature's own handler path. The
clause is either (a) directionally correct but never gated by the cited
mechanism, (b) over-scoped vs the narrower enforcing line, or (c) attributed
to a path the KTX corpus cannot prove (engine-side / external-system).
There is no single shared code site -- the lean v2 amortization for B6 is
that the SHAPE is shared, and the inline self-check discipline (per-clause
enforce-trace + callee-follow) is identical across all 17 rows.

**Three falsifiable claims V-passed at oracle `1.47-2-g67253dc`:**

1. `fragsup`'s hoony branch bails before `AdjustFragLimit` is reached.
   - `src/commands.c:3101-3104`: `else if (isHoonyModeAny()) { G_sprint(self, PRINT_HIGH, "No fraglimit in hoonymode\n"); }`
   - The `else { ... AdjustFragLimit(1); ... }` at `:3106-3119` is the ONLY path to `AdjustFragLimit`.
   - Verdict: `fragsup` cannot exhibit the +2 or duel-cap-20 behaviour described; those branches are unreachable via this command. **MATCH** (seed finding holds.)

2. `lgcmode`'s mode-clear block is unconditional (not gated on turning-on).
   - `src/commands.c:7858-7875`: three `if (cvar(...))` clears for k_midair / k_instagib / k_dmgfrags + a bare `SetHandicap(self, 100);` -- all outside any `!k_lgc` wrap.
   - The only `!k_lgc` guard at `:7850-7854` is the dmm4 prerequisite, NOT the mode-clear block.
   - Verdict: clears fire on every successful invocation (turn-on, turn-off, or no-op re-toggle). **MATCH**.

3. `k_spw`'s anti-telefrag push-away is gated on `k_spw==1` (and `k_spw==2 && !k_checkx`), not "higher modes".
   - `src/client.c:1167`: `if (!match_in_progress || k_spw == 1 || (k_spw == 2 && !k_checkx))` -- the block at `:1167-1212` runs traceline + setorigin push-away.
   - The `(k_spw == 2 || 3 || 4)` branch at `:1113` and the `k_spw == 4` branch at `:1301` are the *same-spawn-avoidance* feature (escalates with mode number), distinct from the explicit anti-telefrag push-away.
   - Verdict: "higher KTX modes add anti-telefrag" conflates two features keyed to opposite ends of the enum. **MATCH**.

**Tree-wide grep sanity:** the `k_spw` use-sites in `src/client.c` (lines 1052/1063/1109/1113/1121/1122/1167/1300/1301) are all accounted for in the seed; no additional anti-telefrag site exists elsewhere in the tree. `lgcmode`'s clear block has no other mutator. `fragsup` is the sole entry point for the non-hoony +10/cap-100 path.

**Conclusion: B6 SHAPE V-PASS PASSED.** The shared-root hypothesis (Step 4)
holds across all 17 rows. Per-row Step-5 authoring proceeds against each
row's V-pass seed citation as the mandatory anchor, with the seed's
enforcing-line / absence-of-enforcing-line citation as the per-row root.

## C4 (non-negotiable)

- Read-only on the L1 database. No `UPDATE` / `INSERT` / schema change.
- No file writes outside this LEDGER + `/tmp/b4-scope-path-untraceable/` scratch.
- The V-pass seed is MANDATORY per row; never overridden in-terminal.
  Contested seed -> HALT + escalate.
- ELABORATION DISCIPLINE + callee-follow apply to every authored clause.
- Sample-verify subagent (Step 6) is BLIND -- sees only the new
  description text, not the reasoning.
- Bounded 3 attempts per sampled row. No convergence -> HALT row, escalate.

---

## Results

B4-RESULT | ktx:command:fragsup | TRACED-CLEAN | rev=1 | seed-clause: hoony clauses ("by 2 in hoonymode" + "20 in duel hoonymode") unreachable via fragsup (handler bails at commands.c:3101 before AdjustFragLimit) | new-clause: "Raises fraglimit by 10 (max 100)" -- non-hoony path only; hoony case prints "No fraglimit in hoonymode"

### ktx:command:fragsup

- canonical_id: `ktx:command:fragsup`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): clauses "(or by 2 in any hoonymode)" and "or 20 in duel hoonymode" describe AdjustFragLimit branches (`commands.c:3042-3044`) that fragsup cannot reach -- the handler bails at `commands.c:3101-3104` with `else if (isHoonyModeAny()) { G_sprint(..., "No fraglimit in hoonymode\n"); }` BEFORE the `else { ... AdjustFragLimit(1); ... }` branch executes. Flavour-C near-miss (unreachable-via-this-command).

- OLD description:
  > Raises the server fraglimit by 10 (or by 2 in any hoonymode), clamped to the allowed maximum (100, or 20 in duel hoonymode). It has no effect during a match or in hoonymode (which has no fraglimit). If the value is already at the maximum it reports the fraglimit unchanged; otherwise the new fraglimit is announced to everyone.

- NEW description:
  > Raises the server `fraglimit` by 10 (clamped to a maximum of 100). It has no effect during a match (silently returns) and refuses in any HoonyMode with the message "No fraglimit in hoonymode" privately to the caller. If the new value equals the current `fraglimit` (already at the cap) it reports "fraglimit still <n>" privately to the caller; otherwise the cvar is updated and "Fraglimit set to <n>" is broadcast to everyone.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Seed-flagged hoony branches removed: FragsUp at `commands.c:3095` bails at `:3097` on `match_in_progress` and at `:3101-3104` on `isHoonyModeAny()` BEFORE reaching the `else { ... AdjustFragLimit(1); ... }` at `:3106-3119`. Only the non-hoony path reaches AdjustFragLimit (`commands.c:3042`), where `fraglimit += 1*10` and `bound(1, fraglimit, 100)` -- magnitude 10 and cap 100. The already-at-cap clause is `:3111-3116`; broadcast at `:3118-3119`.

- NEW source_ref: `src/commands.c:3095` (FragsUp handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Raises by 10" -> `src/commands.c:3109` (call) + `:3042` (`fraglimit += delta * (isHoonyModeAny() ? 2 : 10);` -- non-hoony -> +10)
  - "clamped to max 100" -> `src/commands.c:3044` (`bound(isHoonyModeAny() ? 0 : 1, fraglimit, isHoonyModeDuel() ? 20 : 100);` -- non-hoony -> max 100)
  - "no effect during a match (silently returns)" -> `src/commands.c:3097-3100`
  - "refuses in any HoonyMode with 'No fraglimit in hoonymode'" -> `src/commands.c:3101-3104`
  - "already at the cap reports 'fraglimit still <n>'" -> `src/commands.c:3111-3116`
  - "'Fraglimit set to <n>' broadcast" -> `src/commands.c:3118-3119`

- verify route: inline-self-check (terminal-applied enforce-trace per clause; Step-4 V-pass used fragsup as one of 3 canary claims)
- verify verdict: TRACED-CLEAN (6 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:health:frogbot:std | TRACED-CLEAN | rev=1 | seed-clause: "sets the initial spawn health given to bots when they are added" (sole apply-site at client.c:2236 is narrower -- TOT mode in dmm4/bloodfest match countdown only) | new-clause: cvar consumed only by the bot-spawn path inside TOT mode; dormant elsewhere

### ktx:command:health:frogbot:std

- canonical_id: `ktx:command:health:frogbot:std`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "sets the initial spawn health given to bots when they are added" -> MISMATCH. The ONLY apply-site tree-wide is `client.c:2236` `self->s.v.health = self->isBot ? FrogbotHealth() : 250;` -- gated by outer `if ((deathmatch == 4 || k_bloodfest) && (match_in_progress == 2))` at `client.c:2183` and inner `else if (tot_mode_enabled())` at `client.c:2227`. No general "when bots are added" apply-site exists; the cvar is dormant outside TOT mode during a dmm4/bloodfest match.

- OLD description:
  > Frogbot (standard botcmd) subcommand that sets the initial spawn health given to bots when they are added. Takes one integer argument clamped to the range 1-300. Called with no value it prints the usage, the allowed range, and the current setting instead of changing it. Refused when bots are disabled on the server.

- NEW description:
  > Frogbot (standard botcmd) subcommand that sets the `k_fb_health` cvar -- the bot spawn-health value applied only by the bot-spawn path inside TOT (Tunnel of Terror) mode during a live dmm4 or bloodfest match (the `else if (tot_mode_enabled())` branch of the dmm4/bloodfest match-countdown block at `client.c:2227-2236`). Outside that path the cvar is registered but not consumed at spawn -- bots receive whatever health the active mode's spawn logic assigns (midair/instagib/lgc all hardcode 250 in the same dmm4/bloodfest block). Takes one integer argument bounded to 1-300 (`bound(1, atoi(argument), 300)`); called with no value prints the usage line, the allowed range, and the current setting instead of changing it. Refused with "Bots are disabled by the server" when the server has bots disabled.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Apply-site scope corrected via tree-wide grep of `FrogbotHealth\b\|FB_CVAR_HEALTH`: the only health-setting read is `client.c:2236` inside the `else if (tot_mode_enabled())` branch; the other reads at `bot_commands.c:2166/2172` are within this handler's own info/value paths and `match.c:1792` is a status-text read. The peer branches in the same block (k_midair / k_instagib / lgc_enabled) all hardcode health=250 -- the cvar is meaningful only under tot_mode_enabled. Handler at `bot_commands.c:2154`; bound at `:2174-2175`; bots-disabled gate at `:2156-2160`; usage/range/current at `:2162-2167`; write at `:2179`.

- NEW source_ref: `src/bot_commands.c:2154` (FrogbotsSetHealth handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "sets the k_fb_health cvar" -> `src/bot_commands.c:2179` (`cvar_fset(FB_CVAR_HEALTH, new_health);`) + define at `:21`
  - "bot spawn-health value applied only by the bot-spawn path inside TOT mode during a live dmm4/bloodfest match" -> `src/client.c:2183` (outer `if (deathmatch == 4 || k_bloodfest) && match_in_progress == 2`) + `:2227` (`else if (tot_mode_enabled())`) + `:2236` (`self->s.v.health = self->isBot ? FrogbotHealth() : 250;`)
  - "outside that path the cvar is registered but not consumed at spawn" -> tree-wide grep of `FrogbotHealth\b\|FB_CVAR_HEALTH` returns only `client.c:2236` for health-apply; peer branches `:2193,:2210,:2225` hardcode `health=250`
  - "midair/instagib/lgc all hardcode 250" -> `src/client.c:2193,:2210,:2225` (`self->s.v.health = 250;`)
  - "one integer argument bounded to 1-300" -> `src/bot_commands.c:2174-2175` (`trap_CmdArgv(2, argument, ...); new_health = bound(1, atoi(argument), 300);`)
  - "no-value path prints usage / range / current setting" -> `src/bot_commands.c:2162-2167`
  - "refused with 'Bots are disabled by the server' when bots disabled" -> `src/bot_commands.c:2156-2160` (`if (!bots_enabled()) { G_sprint(...); return; }`)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (7 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:infospec | TRACED-CLEAN | rev=1 | seed-clause: "Extra info for spectators ON / OFF" -- source emits lowercase "on"/"off" with redtext() (high-bit only, no case change), not uppercase | new-clause: "Extra info for spectators on/off" (lowercase, redtext)

### ktx:command:infospec

- canonical_id: `ktx:command:infospec`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): The broadcast "Extra info for spectators ON / OFF" quoted uppercase in the description -- source at `commands.c:7246` emits `G_bprint(2, "Extra info for spectators %s\n", redtext(OnOff(mi_on())));` where `OnOff` (`g_utils.c:1854`) returns lowercase "on"/"off" and `redtext` (`g_utils.c:610-616`) only sets the high bit (no case change). String-fidelity flavour-C near-miss.

- OLD description:
  > Toggles whether item-pickup notifications ("took" info such as "X got Megahealth") and the moreinfo command are made available to spectators during a game. Flips the MI_ON bit of the k_spec_info cvar: when set, spectator item-pickup info is broadcast and moreinfo works; when cleared, both are suppressed. Player/spectator-admin command; ignored while a match is in progress. Broadcasts "Extra info for spectators ON" / "OFF" on toggle.

- NEW description:
  > Toggles whether item-pickup notifications ("took" info such as "X got Megahealth") and the `moreinfo` command are made available to spectators during a game. Flips the `MI_ON` bit (`1<<0`) of the `k_spec_info` cvar by XOR: when set, spectator item-pickup info is broadcast (`mi_print` gated by `mi_on()`) and `moreinfo` works; when cleared, both are suppressed (`moreinfo` prints "Spec info is turned off by server"). Broadcasts "Extra info for spectators on" or "Extra info for spectators off" (the on/off token in red) on each toggle. Player/spectator-admin command; refused (silent return) while a match is in progress.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged ON/OFF casing fixed: `commands.c:7246` emits `redtext(OnOff(mi_on()))` where `OnOff` at `g_utils.c:1854` returns literal lowercase "on"/"off" and `redtext` at `g_utils.c:610-616` only sets bit 7 (`*i |= 128`) on each printable char -- no case change. Toggle via XOR at `commands.c:7243` `k_spec_info ^= MI_ON;` then `cvar_fset` at `:7244`. MI_ON = `1<<0` per `g_consts.h:282`. mi_print gate at `commands.c:7109` and moreinfo gate at `:7155`. Match guard at `:7238-7241`. Access class verified via cluster-shared root (Init_cmds promotion at `:1448`): registration CF_PLAYER|CF_SPC_ADMIN at `:931` admits any in-game player and admin spectators.

- NEW source_ref: `src/commands.c:7234` (infospec handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Toggles ... item-pickup notifications ... and the moreinfo command" -> `src/commands.c:7243-7244` (XOR + cvar_fset)
  - "X got Megahealth example" -> `src/items.c:320` (`mi_print(other, IT_SUPERHEALTH, va("%s got Megahealth", getname(other)));`)
  - "Flips MI_ON bit (1<<0) by XOR" -> `src/commands.c:7243` + `include/g_consts.h:282` (`#define MI_ON (1<<0)`)
  - "when set, item-pickup info broadcast (mi_print gated by mi_on)" -> `src/commands.c:7109` (`if (!mi_on()) { return; // spec info is turned off }`)
  - "moreinfo prints 'Spec info is turned off by server' when cleared" -> `src/commands.c:7155`
  - "Broadcasts 'Extra info for spectators on/off' (red on/off)" -> `src/commands.c:7246` + `src/g_utils.c:1854` (OnOff) + `:610-616` (redtext high-bit only)
  - "Player/spectator-admin command" -> `src/commands.c:931` CF_PLAYER|CF_SPC_ADMIN + `:1448` Init_cmds promotion + dispatch `:1088-1117`
  - "refused (silent return) while match is in progress" -> `src/commands.c:7238-7241`

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (8 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:laststats | TRACED-CLEAN | rev=1 | seed-clause: "(the same tables shown automatically when a game ends)" parenthetical equates two different functions (MatchEndStats vs MatchEndStatsTables) -- no enforcing equivalence | new-clause: equivalence parenthetical dropped

### ktx:command:laststats

- canonical_id: `ktx:command:laststats`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "(the same tables shown automatically when a game ends)" -> MISMATCH. The auto path calls `MatchEndStats()` at `stats.c:1678` (sole caller `match.c:370`); the command path calls `MatchEndStatsTables()` at `statsTables.c:52` (sole caller `commands.c:3554`). These are two different, separately-authored functions (the statsTables.c header at line 2 reads "the overhauled Endgame Statistics"); no enforcing line equates the two outputs. Parallel-name inference, flavour-C near-miss.

- OLD description:
  > Re-displays the full end-of-game statistics tables for the most recently completed match to the requesting client (the same tables shown automatically when a game ends): per-player kill, item, weapon-efficiency, weapon-damage, weapons-taken/dropped, weapon-kill, damage and item/weapon-time tables, plus CTF and team-summary tables in those modes and a top-frags/deaths table outside duel; in midair, instagib or LGC modes it shows that mode's specific stat tables instead. It is refused while a game is in progress ("Game in progress") and reports "Laststats data empty" when no completed-match data is stored.

- NEW description:
  > Re-displays the end-of-game statistics tables for the most recently completed match to the requesting client via `MatchEndStatsTables()` (the "overhauled Endgame Statistics" path -- distinct from the legacy `MatchEndStats` automatic path invoked at game end; this command does NOT re-run the automatic path). Per-player tables emitted include: kill, item, weapon-efficiency, weapon-damage, weapons-taken, weapons-dropped, weapon-kill, enemy-weapon-kill, damage, item-time and weapon-time. CTF games add a CTF stats table; team and CTF games add a team-play summary; non-duel modes add a top-frags/deaths table. In midair, instagib, or LGC modes only that mode's specific stat tables (`playerMidairStats` / `playerInstagibStats` / `playerLGCStats`) are shown instead of the default battery. Refused with "Game in progress" while a match is running, and reports "Laststats data empty" when no completed-match data is stored.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged equivalence parenthetical dropped: the auto path `MatchEndStats` (`stats.c:1678`, called `match.c:370`) is the legacy function; the command path `MatchEndStatsTables` (`statsTables.c:52`, sole caller `commands.c:3554`) is the overhauled rewrite per the file header at `statsTables.c:2`. New description explicitly notes the distinction. Table list at `statsTables.c:85-95`; CTF + team-summary at `:97-106`; non-duel top-stats at `:108`; mode-specific branch at `:68-82`; match guard at `commands.c:3547`; empty-data short-circuit at `statsTables.c:61` (`!lastStatsData`).

- NEW source_ref: `src/commands.c:3545` (LastStats handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Re-displays the end-of-game statistics tables via MatchEndStatsTables" -> `src/commands.c:3554` + `src/statsTables.c:52`
  - "distinct from the legacy MatchEndStats automatic path invoked at game end" -> `src/stats.c:1678` (MatchEndStats body) + `src/match.c:370` (sole auto caller); `statsTables.c:2` header `// the overhauled Endgame Statistics`
  - "per-player tables: kill/item/weapon-effi/weapon-damage/weapons-taken/weapons-dropped/weapon-kill/enemy-weapon-kill/damage/item-time/weapon-time" -> `src/statsTables.c:85-95`
  - "CTF stats table; team + CTF: team-play summary; non-duel: top-frags/deaths" -> `src/statsTables.c:97-106` + `:108`
  - "midair/instagib/LGC: mode-specific tables" -> `src/statsTables.c:68-82`
  - "refused with 'Game in progress' while match running" -> `src/commands.c:3547-3552` (`if (match_in_progress) { G_sprint(self, 2, "Game in progress\n"); return; }`)
  - "'Laststats data empty' when no completed-match data" -> `src/statsTables.c:61-66` (`if (!lastStatsData) { G_sprint(self, 2, "Laststats data empty\n"); return; }`); `lastStatsData` set true at end of `MatchEndStats` (`stats.c:1730`)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (7 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:lgcmode | TRACED-CLEAN | rev=1 | seed-clause: "turning it on also disables k_midair/k_instagib/k_dmgfrags and resets handicap" -- these clears are UNCONDITIONAL, not gated on the on-direction | new-clause: clears run on every successful invocation regardless of direction

### ktx:command:lgcmode

- canonical_id: `ktx:command:lgcmode`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "turning it on also disables the midair, instagib and damage-frags modes and resets the calling player's handicap to off" -> MISMATCH. The clear block at `commands.c:7858-7875` runs three `if (cvar("k_midair"|"k_instagib"|"k_dmgfrags"))` clears + a bare `SetHandicap(self, 100);` -- none guarded by `!k_lgc` / "turning-on". Only the `:7850-7854` `!k_lgc && deathmatch != 4` gate is direction-aware (the dmm4 prereq for enabling). The mode-clear block fires equally when turning LGC off or on a no-op re-toggle.

- OLD description:
  > Toggles LGC game mode on or off and broadcasts the change. Enabling requires deathmatch mode 4 to be set first (otherwise reports "LGC mode requires dmm4") and is only allowed when a rules change is permitted; turning it on also disables the midair, instagib and damage-frags modes and resets the calling player's handicap to off. The mode state is held in the k_lgcmode server variable.

- NEW description:
  > Toggles LGC game mode on or off and broadcasts the change as "<player> enables/disables LGC mode" via `cvar_toggle_msg`. Only allowed when a rules change is permitted (`is_rules_change_allowed()`); enabling additionally requires deathmatch mode 4 to be set first (`!k_lgc && deathmatch != 4` -> refuses to the caller with "LGC mode requires dmm4"). Every successful invocation -- regardless of on-or-off direction -- clears `k_midair`, `k_instagib`, and `k_dmgfrags` if any are currently set, and resets the caller's handicap to off (`SetHandicap(self, 100)`); these side-effects are NOT conditional on the on-transition and run on the off-transition too. Mode state is held in the `k_lgcmode` server cvar.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc -- this was one of the 3 Step-4 V-pass canary claims, re-confirmed at `commands.c:7858-7875`. ToggleLGC at `:7840`: rules-change gate at `:7844-7846`; dmm4 prerequisite at `:7850-7854` (only direction-aware gate, fires only when `!k_lgc`); unconditional clears at `:7858-7875` (three `if cvar(...)` clears + `SetHandicap(self, 100)` -- all outside the `!k_lgc` wrap); toggle + broadcast via `cvar_toggle_msg(self, LGCMODE_VARIABLE, redtext("LGC mode"))` at `:7879` which calls `g_utils.c:2202-2218` (`i = !cvar(name); G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg); trap_cvar_set_float(...)`). Enables() at `g_utils.c:1832` returns "enables"/"disables". The redundant `cvar_set` at `:7877` is superseded by the cvar_toggle_msg flip and is not user-observable.

- NEW source_ref: `src/commands.c:7840` (ToggleLGC handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Toggles ... and broadcasts '<player> enables/disables LGC mode'" -> `src/commands.c:7879` (`cvar_toggle_msg(self, LGCMODE_VARIABLE, redtext("LGC mode"));`) + callee `g_utils.c:2202-2218` (`i = !cvar(...); G_bprint(2, "%s %s %s\n", p->netname, Enables(i), msg); trap_cvar_set_float(...);`) + `g_utils.c:1832` (`Enables(f) { return f ? "enables" : "disables"; }`)
  - "Only allowed when a rules change is permitted" -> `src/commands.c:7844-7846` (`if (!is_rules_change_allowed()) { return; }`)
  - "enabling requires dmm4 (else 'LGC mode requires dmm4')" -> `src/commands.c:7850-7854` (`if (!k_lgc && (deathmatch != 4)) { G_sprint(self, 2, "LGC mode requires dmm4\n"); return; }`)
  - "every successful invocation clears k_midair/k_instagib/k_dmgfrags + handicap reset; NOT conditional on direction" -> `src/commands.c:7858-7875` (three `if (cvar(...)) cvar_set("...", "0");` + bare `SetHandicap(self, 100);`)
  - "mode state held in k_lgcmode cvar" -> `include/g_local.h:1228` (`#define LGCMODE_VARIABLE "k_lgcmode"`) + `src/world.c:1083` (`RegisterCvar("k_lgcmode");`)

- verify route: inline-self-check (cluster-shared root V-passed at Step 4 using lgcmode as one of 3 canary claims)
- verify verdict: TRACED-CLEAN (5 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:pickspawn | TRACED-CLEAN | rev=1 | seed-clause: "only in HoonyMode (duel or team HoonyMode)" -- the team path checks team membership only, no hoonymode guard; a non-hoony team game with red/blue still reaches the nomination logic | new-clause: team path requires red/blue membership only, NOT hoonymode active

### ktx:command:pickspawn

- canonical_id: `ktx:command:pickspawn`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "HoonyMode-only command (duel or team HoonyMode)" -> MISMATCH. `HM_pick_spawn` at `hoonymode.c:912-927` runs an `if (!isHoonyModeDuel())` block that reads the caller's `getteam(self)` and sets `teamflag = 1` (red) or `2` (blue); only callers with team NEITHER "red" NOR "blue" are refused with "Command only available in hoonymode duel mode". There is NO `isHoonyModeAny()` / `cvar("k_hoonymode")` guard in the handler, so a non-hoony TEAM game where the caller is on a red/blue team falls through to the spawn-picking logic. Scope over-asserted, flavour-C near-miss.

- OLD description:
  > HoonyMode-only command (duel or team HoonyMode) used before the game starts: nominates the spawn point nearest the player's current position. In duel each player picks their own spawns; in team HoonyMode it picks for the player's team (red/blue). Running it on a spawn the player/team has already picked unpicks it. It refuses spawns already picked by someone else, and refuses once a team has reached its spawn-allocation cap (maxclients/2). Not available during a game or intermission, and only in HoonyMode.

- NEW description:
  > Nominates the spawn point nearest the player's current position. In hoonymode duel each player picks their own spawns; outside hoonymode duel the command branches into a TEAM path that requires the caller's team be "red" or "blue" (otherwise refuses with "Command only available in hoonymode duel mode") -- note this team path checks team membership only and does NOT verify that hoonymode is active, so a non-hoony red/blue team game still reaches the nomination logic. Refused with "Command not available during game" while a match is in progress or in intermission. Running it on a spawn the player (duel) or the player's team (team path) has already nominated unpicks it (broadcasts "... unpicks ..."); refused with a "... has already been picked by ..." message when the closest spawn is held by someone else; refused with "Team already has <n> spawns allocated" once a team has reached `maxclients/2` spawns. On a successful pick the spawn is broadcast (e.g. "... picks spawn ...") and any prior self-nomination (duel) is deselected first.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Seed-flagged scope clause corrected: handler `HM_pick_spawn` at `hoonymode.c:900-1065` carries NO `isHoonyModeAny()` / `cvar("k_hoonymode")` guard; the `!isHoonyModeDuel()` block at `:912-927` is a team-membership check (red/blue) only. Match/intermission guard at `:931-935`. Nearest-spawn scan at `:938-952` (iterating `info_player_deathmatch` entities by distance). Duel re-pick (unpick own) at `:954-961` + `:983-1002`. Team-flag from `getteam(self)` at `:914-922`. Team-cap refuse at `:1021-1027` (`(teamflag==1 ? red_spawns : blue_spawns) >= (cvar("maxclients")/2)`). Already-picked-by-someone-else refuse at `:1003-1018`. Success-path nominate + deselect prior at `:1029-1062` (HM_select_spawn + HM_store_spawns).

- NEW source_ref: `src/hoonymode.c:900` (HM_pick_spawn handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Nominates spawn point nearest the player's current position" -> `src/hoonymode.c:938-952` (closest-spawn distance scan over `info_player_deathmatch`)
  - "hoonymode duel: each player picks their own" -> `src/hoonymode.c:954-961` (`if (isHoonyModeDuel()) { ... if (spawn->hoony_nomination == self_num) old_nomination = spawn; }`)
  - "outside hoonymode duel: team path checks team red/blue only (no hoonymode guard)" -> `src/hoonymode.c:912-927` (`if (!isHoonyModeDuel()) { ... if (streq(team, "red")) teamflag = 1; else if (streq(team, "blue")) teamflag = 2; else { G_sprint(..., "Command only available in hoonymode duel mode.\n"); return; } }`)
  - "refused with 'Command not available during game' in match or intermission" -> `src/hoonymode.c:931-935` (`if (match_in_progress || intermission_running) { ... }`)
  - "re-pick on own spawn unpicks it" -> `src/hoonymode.c:983-1002` (`if ((closest == old_nomination) || (isHoonyModeTDM() && closest->hoony_nomination == teamflag)) { HM_deselect_spawn(closest); }`)
  - "refuses '... has already been picked by ...' when closest taken" -> `src/hoonymode.c:1003-1018`
  - "team-cap refuse 'Team already has <n> spawns allocated' at maxclients/2" -> `src/hoonymode.c:1021-1027`
  - "success-path nominate + deselect prior self-nomination + broadcast 'picks spawn'" -> `src/hoonymode.c:1029-1062` (HM_deselect prior + HM_select_spawn + HM_store_spawns)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (8 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:prewar | TRACED-CLEAN | rev=1 | seed-clause: (a) "any current firing is stopped" (state 0) is match-gated; (b) "Each change is announced to all players" -- broadcast only when !match_in_progress, in-match it is private G_sprint | new-clause: PlayersStopFire scoped to !match_in_progress for both state 0 and 2; broadcast scoped to !match_in_progress for every state

### ktx:command:prewar

- canonical_id: `ktx:command:prewar`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): Two clauses misframed. (a) "0 = players may not fire before the match (and any current firing is stopped)" -- PlayersStopFire for state 0 at `admin.c:836-838` is gated on `!match_in_progress`; equally match-gated as state 2's stop, but state-0 clause omits the scope. (b) "Each change is announced to all players" -- broadcast `G_bprint` fires only when `!match_in_progress`; in-match each state change is a private `G_sprint` to the caller. Both scope-clauses without enforcing read-sites that match the asserted scope.

- OLD description:
  > Admin command that cycles the pre-match firing rule (server cvar k_prewar) through three states 0 -> 1 -> 2 -> 0 on each invocation: 0 = players may not fire before the match (and any current firing is stopped); 1 = players may fire before the match; 2 = players may fire and jump even while readied (current firing is stopped when the state is entered out of a match). Each change is announced to all players. Only an admin may run it; non-admins are ignored.

- NEW description:
  > Admin command that cycles the pre-match firing rule (server cvar `k_prewar`) through three states 0 -> 1 -> 2 -> 0 on each invocation: 0 = players may not fire before the match; 1 = players may fire before the match; 2 = players may fire and jump even while readied. For states 0 and 2 the handler additionally calls `PlayersStopFire()` to stop any current firing -- this side-effect runs ONLY when no match is in progress (during a live match the call is skipped, so existing firing continues). The state change is broadcast to all players (`G_bprint`) only when no match is in progress; during a live match every transition is a private `G_sprint` to the caller only. Only admins (`is_adm(self)`) may run it; non-admins return silently.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged scope omissions corrected: `TogglePreWar` at `admin.c:793` reads `bound(0, cvar("k_prewar"), 2)` at `:795`, returns silently for non-admin at `:797-800`, increments + wraps at `:802-805`. Switch at `:807-844` has the same `!match_in_progress` scope pattern for cases 0 (default), 1, and 2: when no match, `G_bprint` + (for 0 and 2) `PlayersStopFire()`; when in-match, `G_sprint` only and NO PlayersStopFire. State 1 (`:809-818`) never calls PlayersStopFire (asymmetry preserved). Final cvar write `:846`.

- NEW source_ref: `src/admin.c:793` (TogglePreWar handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "cycles k_prewar through 0 -> 1 -> 2 -> 0" -> `src/admin.c:795` (`bound(0, cvar("k_prewar"), 2)`) + `:802-805` (`if (++k_prewar > 2) k_prewar = 0;`) + `:846` (`cvar_fset("k_prewar", k_prewar);`)
  - "0 = players may not fire before match" -> `src/admin.c:834-836` (case 0/default "Players may not fire before match")
  - "1 = players may fire before match" -> `src/admin.c:809-818` (case 1, no PlayersStopFire)
  - "2 = players may fire and jump even while readied" -> `src/admin.c:820-830` (case 2)
  - "states 0 and 2: PlayersStopFire only when !match_in_progress" -> `src/admin.c:822-826` (case 2 `if (!match_in_progress) { G_bprint(...); PlayersStopFire(); } else { G_sprint(...); }`) + `:834-841` (case 0 same pattern)
  - "broadcast (G_bprint) only when !match_in_progress; in-match private G_sprint" -> `src/admin.c:812,816,823,828,836,841`
  - "Only admins may run; non-admins return silently" -> `src/admin.c:797-800` (`if (!is_adm(self)) { return; }`) + table flag `CF_BOTH_ADMIN` at `src/commands.c:755`

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (7 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:qenemy | TRACED-CLEAN | rev=1 | seed-clause: "When the bit is set, clients are restricted from using the QiZmo proxy's enemy-nearby reporting" -- enforced externally by QiZmo proxy (no KTX read-site); ToggleQEnemy's own announce uses Allowed(fpd&32) = "allowed" when SET, opposite polarity to "restricted" | new-clause: KTX-side observable is fpd toggle + "allowed/disallowed" broadcast; enforcement external

### ktx:command:qenemy

- canonical_id: `ktx:command:qenemy`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "When the bit is set, clients are restricted from using the QiZmo proxy's enemy-nearby reporting feature" -> UNTRACEABLE on KTX feature path. No KTX read-site interprets bit 32 of fpd as a runtime restriction on gameplay code. ToggleQEnemy's own announce at `commands.c:3716` is `G_bprint(2, "%s %s\n", redtext("QiZmo enemy reporting"), Allowed(fpd & 32));` and `Allowed(fpd & 32)` at `g_utils.c:1849` returns "allowed" when bit is set -- opposite polarity to "restricted". Enforcement lives in an external QiZmo proxy reading the fpd serverinfo bit.

- OLD description:
  > Toggles the FPD "enemy vicinity reporting" restriction on or off by flipping bit 32 (value 32) of the server's fpd serverinfo key and re-broadcasting it. When the bit is set, clients are restricted from using the QiZmo proxy's enemy-nearby reporting feature; the new on/off state is announced to all players. Has no effect while a match is in progress.

- NEW description:
  > Toggles bit 32 of the server's `fpd` serverinfo bitmask by XOR (`fpd ^= 32`), then propagates the change via `localcmd("serverinfo fpd <n>")` and broadcasts the new state to all players as "QiZmo enemy reporting allowed" (when the bit is set after the toggle) or "... disallowed" (when cleared). The fpd serverinfo bit is the contract surface; the actual enemy-nearby reporting behaviour is enforced externally by the QiZmo proxy reading this bit -- no KTX read-site interprets bit 32 as a runtime restriction on its own gameplay code. Refused (silent return) while a match is in progress.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged "restricted from using" framing dropped: (a) the polarity in the broadcast text at `commands.c:3716` is the opposite -- `Allowed(fpd & 32)` at `g_utils.c:1849` returns "allowed" when bit is set, and (b) actual enforcement lives external to KTX (QiZmo proxy reads the fpd serverinfo). KTX-side observables: toggle (`commands.c:3712` `fpd ^= 32;`), propagation (`:3714` `localcmd("serverinfo fpd %d\n", fpd);`), broadcast (`:3716`), match guard (`:3707-3710`). A status read at `commands.c:2021` uses `OnOff(i & 32)` ("on"/"off") as a different presentation of the same bit.

- NEW source_ref: `src/commands.c:3703` (ToggleQEnemy handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Toggles bit 32 of fpd serverinfo by XOR" -> `src/commands.c:3712` (`fpd ^= 32;`)
  - "propagates via `localcmd('serverinfo fpd <n>')`" -> `src/commands.c:3714` (`localcmd("serverinfo fpd %d\n", fpd);`)
  - "broadcasts 'QiZmo enemy reporting allowed/disallowed' (allowed when bit set)" -> `src/commands.c:3716` + `src/g_utils.c:1849` (`Allowed(f) { return f ? "allowed" : "disallowed"; }`)
  - "enforcement external to KTX (QiZmo proxy reads fpd serverinfo); no KTX read-site interprets bit 32 as a runtime restriction" -> tree-wide grep `fpd.*32\|& 32\|fpd &` returns only `commands.c:2021` (status `OnOff(i & 32)`), `:3712,:3716` (this handler), `match.c:2130-2133` (status output context) -- no gameplay-restriction read-site
  - "refused (silent return) while a match is in progress" -> `src/commands.c:3707-3710` (`if (match_in_progress) { return; }`)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (5 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:race_countdown_up | TRACED-CLEAN | rev=1 | seed-clause: "clamped to the open range 1-5 seconds" -- not a clamp: out-of-range REJECTED, cvar left unchanged, prints "race countdown still <old>" | new-clause: reject-vs-saturate corrected; accepted range 1-5 seconds, out-of-range rejected privately

### ktx:command:race_countdown_up

- canonical_id: `ktx:command:race_countdown_up`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "the value is clamped to the open range 1-5 seconds" -> MISMATCH. `race.c:283` `if ((rcd < 6) && (rcd > 0))` accepts new value only within open (0,6); out-of-range falls through to `G_sprint(self, 2, "%s still %s\n", redtext("race countdown"), dig3(rcd - t));` at `:289`, leaving the cvar unchanged. "Clamped" mischaracterizes reject-vs-saturate.

- OLD description:
  > Increases the race start-countdown length by 1 second (the k_race_countdown cvar). Only takes effect in race mode when no match is in progress and the race has not yet started; the value is clamped to the open range 1-5 seconds, and the new countdown length is broadcast to everyone.

- NEW description:
  > Increases the race start-countdown length (the `k_race_countdown` cvar) by 1 second; only active in race mode (`isRACE()`) when no match is in progress and the race has not yet started, otherwise silently returns. The new value is ACCEPTED only when within the open interval (0, 6) -- i.e. integer seconds 1 through 5; out-of-range inputs are REJECTED (the cvar is left unchanged) and the caller is privately notified with "race countdown still <old-value>". On accept, the new value is written to the cvar and "Race countdown length set to <n> seconds" is broadcast to everyone.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged "clamped" corrected to accept-or-reject: `race.c:283-289` -- the `if ((rcd < 6) && (rcd > 0))` block writes the cvar and broadcasts; the fall-through at `:289` is a private `G_sprint` "race countdown still <old>" with the cvar UNCHANGED. Registration at `commands.c:696` binds the command to `DEF(RaceCountdownChange)` with arg `+1`. Mode/match/start gates at `race.c:278`. Accept-write at `:285`; accept-broadcast at `:286`.

- NEW source_ref: `src/race.c:274` (RaceCountdownChange handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Increases k_race_countdown cvar by 1 second" -> `src/commands.c:696` (registration `{ "race_countdown_up", DEF(RaceCountdownChange), 1, ... }`) + `src/race.c:276` (`float rcd = cvar("k_race_countdown") + t;` with t=+1)
  - "only active in race mode, no match in progress, race not yet started" -> `src/race.c:278` (`if (match_in_progress || !isRACE() || race_is_started()) { return; }`)
  - "accepted only within open interval (0, 6) -- i.e. 1 through 5" -> `src/race.c:283` (`if ((rcd < 6) && (rcd > 0)) { ... }`)
  - "out-of-range REJECTED, cvar unchanged, private 'race countdown still <old>'" -> `src/race.c:289` (`G_sprint(self, 2, "%s still %s\n", redtext("race countdown"), dig3(rcd - t));`) -- `rcd - t` reconstructs old value
  - "on accept: cvar updated + 'Race countdown length set to <n> seconds' broadcast" -> `src/race.c:285-286`

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (5 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:removeitem | TRACED-CLEAN | rev=1 | seed-clause: "Deletes the dropped item closest to you" -- prose implies general dropped pickups; real scope is items flagged by `dropitem` only (sole setter is `dropitem_spawn_item`; not set by death-drops/backpacks) | new-clause: only dropitem-command-placed entities are eligible

### ktx:command:removeitem

- canonical_id: `ktx:command:removeitem`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Deletes the dropped item closest to you (only entities flagged as dropped items are eligible)" -> the literal scan matches the code (`commands.c:9276` `if (!ent->dropitem) continue;`) but "the dropped item" implies any dropped pickup. The `dropitem` flag (`progs.h:1189` comment: `true if placed with "dropitem" command`) is set only by `dropitem_spawn_item` at `commands.c:9144`; no death-drop / backpack / DropPowerup site sets it. Real scope narrower than implied.

- OLD description:
  > Deletes the dropped item closest to you (only entities flagged as dropped items are eligible). Prints "Removed <classname>" on success or "Nothing found around" if no dropped item is nearby. Requires server cheats to be enabled (otherwise it is refused with a message) and does nothing while a match is in progress.

- NEW description:
  > Deletes the entity closest to the caller whose `dropitem` flag is set. The `dropitem` flag is set only by entities placed via the `dropitem` command (sole setter `dropitem_spawn_item` at `commands.c:9144`); ordinary death-drops, backpacks, and DropPowerup spawns do NOT set this flag, so this command does not affect them. Iterates all server entities, picks the one with minimum squared distance from the caller's origin to the entity's bounding-box center. On success prints "Removed <classname>" privately to the caller and removes the entity (`ent_remove`); if no eligible entity exists, prints "Nothing found around" privately. Refused (silent return) while a match is in progress, and refused with "Cheats are disabled on this server, so use the force, Luke... err <netname>" when the server's `*cheats` infokey is empty.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged scope corrected: handler `removeitem` at `commands.c:9252` filters at `:9276` `if (!ent->dropitem) continue;`. Tree-wide grep for setters of the `dropitem` field returns only `commands.c:9144` (`dropitem_spawn_item`). Match guard `:9258-9261`. Cheats gate `:9263-9269` (`strnull(ezinfokey(world, "*cheats"))`). Distance scan `:9270-9296`. Success `:9299-9302`; failure `:9304-9306`.

- NEW source_ref: `src/commands.c:9252` (removeitem handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Deletes entity closest to caller whose dropitem flag is set" -> `src/commands.c:9276` (`if (!ent->dropitem) continue;`) + `include/progs.h:1189` (`qbool dropitem; // true if placed with "dropitem" command.`)
  - "dropitem flag only set by dropitem_spawn_item (sole setter)" -> `src/commands.c:9144` (`p->dropitem = true;`) -- tree-wide grep `\.dropitem\s*=\|->dropitem\s*=` returns only this site
  - "iterates all entities, picks minimum squared distance to bounding-box center" -> `src/commands.c:9270-9296` (entity iteration + 3-axis squared-distance accumulation `c = self->origin[j] - (ent->origin[j] + (mins[j]+maxs[j])*0.5); distance += c*c;`)
  - "success: 'Removed <classname>' privately + ent_remove" -> `src/commands.c:9299-9302`
  - "failure: 'Nothing found around' privately" -> `src/commands.c:9304-9306`
  - "refused (silent) while match is in progress" -> `src/commands.c:9258-9261`
  - "refused with 'Cheats are disabled ...' when `*cheats` infokey empty" -> `src/commands.c:9263-9269`

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (7 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:socd | TRACED-CLEAN | rev=1 | seed-clause: (a) "2 = warn on each violation" -- WARN fires only at socdDetectionCount>=3 AND !match_in_progress; (b) "3 = kick on violation" -- KICK gated on socdDetectionCount>=3 (not per-violation) | new-clause: detection-count threshold + match-state scope spelled

### ktx:command:socd

- canonical_id: `ktx:command:socd`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "2 = warn ... on each violation" + "3 = kick ... on violation" -> MISMATCH. Both enforcement sites at `client.c:3785,3792` require `socdDetectionCount >= 3` -- not per-violation. WARN additionally requires `!match_in_progress`; KICK runs in or out of match. A "detection" itself registers at `client.c:3779-3784` only when `fStrafeChangeCount >= 25` AND `fFramePerfectStrafeChangeCount / fStrafeChangeCount >= 0.75`. Materially narrower than implied.

- OLD description:
  > Cycles the server's SOCD (simultaneous-opposing-cardinal-direction, i.e. left+right or forward+back held together) handling mode and announces the new mode to everyone. The mode advances through: 0 = allow (no action), 1 = collect stats and report after the game, 2 = warn the offending player on each violation, 3 = kick the offending player on violation. Wrapping past kick returns to allow. Has no effect while a match is in progress.

- NEW description:
  > Cycles the server's SOCD (simultaneous-opposing-cardinal-direction, i.e. left+right or forward+back held together) handling mode on each invocation and broadcasts the new mode to everyone. The cvar `k_socd` advances through 0 -> 1 -> 2 -> 3 -> 0 (wrap), with broadcast strings: 0 "SOCD: allow", 1 "SOCD: stats after game", 2 "SOCD: warn on violation", 3 "SOCD: kick on violation". Behaviour by mode at runtime: 0 = allow (no enforcement); 1 = collect detection stats and report after the game (`k_socd >= SOCD_STATS` reporting gate at `stats.c:767`); 2 = warn the offending player only after they have accumulated at least 3 detections (`socdDetectionCount >= 3`), and only when no match is in progress; 3 = kick the offending player at the same `socdDetectionCount >= 3` threshold (in or out of match). A single detection itself requires accumulating 25 strafe-change frames with a frame-perfect ratio >= 0.75 -- a detection is not per-violation but per-burst. The command itself is refused (silent return) while a match is in progress; the detection logic in client think runs independently of this gate.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged "on each violation" sharpened with the actual detection-count gate. Handler `socd` at `commands.c:9398`: match guard `:9402-9405`, cvar advance + wrap `:9407-9411`, 4-branch broadcast `:9413-9427`, write `:9429`. Enum at `include/g_consts.h:346-349`. Detection logic at `client.c:3754` (`fStrafeChangeCount += 1;`) -> `:3779` (`fStrafeChangeCount >= 25`) -> `:3781` (ratio >= 0.75) -> `:3783` (`socdDetectionCount += 1;`). WARN gate `:3785` (`!match_in_progress && !isBot && k_socd == SOCD_WARN && ct == ctPlayer && socdDetectionCount >= 3`). KICK gate `:3792` (no `!match_in_progress`). STATS reporting `stats.c:767`.

- NEW source_ref: `src/commands.c:9398` (socd handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "k_socd cycles 0 -> 1 -> 2 -> 3 -> 0 (wrap)" -> `src/commands.c:9407-9411`
  - "broadcast strings 'SOCD: allow / stats after game / warn on violation / kick on violation'" -> `src/commands.c:9413-9427`
  - "enum: 0=ALLOW, 1=STATS, 2=WARN, 3=KICK" -> `include/g_consts.h:346-349`
  - "0 = allow, no enforcement" -> no enforcement branch fires for ALLOW
  - "1 = stats collection unconditional + reporting at k_socd >= SOCD_STATS" -> `src/client.c:3752-3784` (detection counters always increment) + `src/stats.c:767` (`if (!p->isBot && cvar("k_socd") >= SOCD_STATS)`)
  - "2 = WARN at socdDetectionCount >= 3 AND !match_in_progress" -> `src/client.c:3785`
  - "3 = KICK at socdDetectionCount >= 3, in or out of match" -> `src/client.c:3792` (no match-state guard)
  - "single detection requires fStrafeChangeCount >= 25 AND frame-perfect ratio >= 0.75" -> `src/client.c:3779-3783`
  - "command itself refused (silent return) while match is in progress" -> `src/commands.c:9402-9405`

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:uinfo | TRACED-CLEAN | rev=1 | seed-clause: "lists every non-system userinfo key" -- one-arg loop iterates only fixed cinfos[] table (4 displayed: mi/ev/wpsx/kf; sys `*mm` skipped), NOT every key | new-clause: curated cinfos[] subset for one-arg; any non-sys key for two-arg

### ktx:command:uinfo

- canonical_id: `ktx:command:uinfo`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "With one argument it lists every non-system userinfo key that client has set to a non-empty value" -> MISMATCH. The one-arg loop at `g_userinfo.c:167-181` iterates only `cinfos[]` (`g_userinfo.c:42-84`) -- a fixed table with 5 active entries: `*mm` (sys, skipped), `mi`, `ev`, `wpsx`, `kf`. So one-arg returns up to 4 keys, not "every non-system userinfo key". Two-arg at `:185+` reads ANY non-sys key. Scope over-claim.

- OLD description:
  > Queries another connected client's public userinfo keys. With one argument (player id or name) it lists every non-system userinfo key that client has set to a non-empty value; with two arguments (id/name plus a key) it shows just that key's value for that client. Called with no arguments or more than two it prints a usage line. System/internal keys are never shown. Aliased command identical to "kuinfo"; usable by players and spectators, no match restriction.

- NEW description:
  > Queries another connected client's userinfo keys. With one argument (player id or name) the handler iterates a fixed table of tracked keys (`cinfos[]` at `g_userinfo.c:42-84`, active entries `*mm` `mi` `ev` `wpsx` `kf` -- the sys `*mm` is skipped) and lists each key the target client has set to a non-empty value as `key <name> = "<value>"`; this is the curated cinfos[] subset, NOT every non-system userinfo key the client carries. With two arguments (id/name + key) it shows that specific key's value for that client (`<player>'s <key> = "<value>"`) for any non-system key; system keys (those starting with `*`) are hidden (`key "<name>" is hidden`). Called with no arguments or more than two it prints the usage line. Aliased to `kuinfo` (shared handler `cmduinfo`); usable by players and spectators, no match-state restriction.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged one-arg scope corrected: `g_userinfo.c:167-181` loop iterates `cinfos[]` with `isSysKey` skip + `ezinfokey` read + non-empty filter. cinfos[] at `g_userinfo.c:42-84` defines exactly 5 active entries (commented-out lines are not compiled). Two-arg path at `:185-217` reads any non-sys key. Usage at `:136-149`. Handler `cmduinfo` at `g_userinfo.c:124`; registration at `commands.c:944` `CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS`; kuinfo alias at `:941`.

- NEW source_ref: `src/g_userinfo.c:124` (cmduinfo handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "one-arg: iterates cinfos[] table only (active entries *mm/mi/ev/wpsx/kf; sys *mm skipped)" -> `src/g_userinfo.c:42-84` (cinfos[] table) + `:167-181` (iteration loop)
  - "prints 'key <name> = \"<value>\"'" -> `src/g_userinfo.c:178` (`G_sprint(self, 2, "key %s = \"%s\"\n", cinfos[i].key, v);`)
  - "two-arg: any non-sys key via ezinfokey" -> `src/g_userinfo.c:204` (`v = ezinfokey(p, arg_2);`) + `:198` (`isSysKey` -> v=NULL)
  - "two-arg output '<player>'s <key> = \"<value>\"'" -> `src/g_userinfo.c:213`
  - "sys keys (starting with `*`) are hidden ('key \"<name>\" is hidden')" -> `src/g_userinfo.c:209`
  - "no-args / >2 args prints usage" -> `src/g_userinfo.c:136-149`
  - "aliased to kuinfo (shared handler)" -> `src/commands.c:941` (`{ "kuinfo", cmduinfo, ... }`) + `:944` (`{ "uinfo", cmduinfo, ... CF_NOALIAS }`)
  - "usable by players and spectators, no match-state restriction" -> `src/commands.c:944` CF_BOTH (no CF_*_ADMIN) + CF_MATCHLESS additive; no `match_in_progress` guard in cmduinfo body

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (8 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_clan_arena | TRACED-CLEAN | rev=1 | seed-clause: "no item pickups" -- no isCA()/k_clan_arena gate in any item-touch path in KTX; the property holds transitively (full-loadout spawn + CA-stripped maps) with NO enforcing line on the CA path | new-clause: clause reframed as transitive consequence; explicit absence of item-touch CA gate noted

### ktx:cvar:k_clan_arena

- canonical_id: `ktx:cvar:k_clan_arena`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "no item pickups" sub-clause -> UNTRACEABLE. No isCA() / k_clan_arena gate in items.c health_touch, weapon_touch, armor_touch, ammo_touch, powerup_touch, or backpack_touch; clan_arena.c does no item-entity removal. PlaceItem / StartItem / G_CallSpawn have no CA item-inhibit. The "no item pickups" clause holds only transitively -- players spawn fully equipped via CA_PutClientInServer so pickups are irrelevant, and CA is conventionally played on stripped arena maps -- with no enforcing line on the CA feature path. Per scope-sharpening rule this is a near-miss sub-clause.

- OLD description:
  > Selects the round-based arena game mode. 0 = disabled (normal game). 1 = Clan Arena: teams fight rounds with full weapons/armor and no item pickups; a round ends when one team is fully eliminated. 2 = Wipeout: a Clan Arena variant (additional Wipeout-only round/respawn handling). When nonzero on a team game the server runs the arena round/match flow (best-of series, ghost-on-death).

- NEW description:
  > Selects the round-based arena game mode (CA family). 0 = disabled (normal game); 1 = Clan Arena; 2 = Wipeout (a Clan Arena variant with additional round/respawn handling). When nonzero in a team game, `isCA()` returns true (`isTeam() && cvar("k_clan_arena")`) and the server runs the CA round/match flow (`CA_Frame()` at `world.c:1886`): at round start `CA_PutClientInServer` (`clan_arena.c:534-545`) hands each player axe + SG + NG + SNG + SSG + RL + GL + LG and IT_ARMOR3 (red armor), 200 armorvalue with 0.8 armortype, and ammo 200/100/50/150 -- players spawn fully equipped. The "no in-round item pickups" property holds transitively through this full-loadout spawn + CA-conventional stripped maps; no item-touch site in `items.c` (health/weapon/armor/ammo/powerup/backpack) carries an `isCA()` or `k_clan_arena` gate. A round ends when one team is fully eliminated (`CA_check_alive_teams` -> `EndRound`); the match ends best-of via `CA_wins_required()`. Dead players become ghosts (`SOLID_NOT`, `MOVETYPE_NOCLIP`, empty model). Wipeout-specific branches gate on `cvar("k_clan_arena") == 2` -- e.g. `round_deaths` tracking + line-of-sight checks in spawn-selection.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged "no item pickups" sub-clause reframed as a transitive consequence (full-loadout spawn + stripped maps) with the absence of an isCA()/k_clan_arena gate in item-touch handlers explicitly stated -- the clause is now accurate to the source (no enforcing line claim) rather than implying gameplay-code suppression. Mode predicate at `clan_arena.c:295`. Round flow CA_Frame at `world.c:1886`. Full-loadout spawn at `clan_arena.c:534-545` + ammo/armor at `:523-530`. Ghost at `:598-620`. Round-end at `:1606-1614`; best-of at `:1626`. Wipeout-2 branches at `combat.c:447`, `clan_arena.c:127/265/879/933/1513/1732/1773`, `client.c` LOS check.

- NEW source_ref: `src/clan_arena.c:295` (`isCA()` -- the mode-active predicate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Selects the round-based arena game mode (0 disabled / 1 CA / 2 Wipeout)" -> `src/world.c:1507-1515` (mode-tag append `-ca` / `-wo`) + `src/clan_arena.c:655` (`char* mode = cvar("k_clan_arena") == 2 ? "Wipeout!" : "Clan Arena!";`) + RegisterCvar at `src/world.c:983` default "0"
  - "When nonzero in team game isCA() true; CA_Frame runs" -> `src/clan_arena.c:295` (`isCA() = isTeam() && cvar("k_clan_arena")`) + `src/world.c:1886` (`if (isCA()) { CA_Frame(); }`)
  - "round-start full loadout (axe/SG/NG/SNG/SSG/RL/GL/LG/IT_ARMOR3, 200 armor 0.8 type, 200/100/50/150 ammo)" -> `src/clan_arena.c:534-545` + ammo/armor at `:523-530` (`self->s.v.armorvalue = 200; self->s.v.armortype = 0.8;`)
  - "no item-touch site carries isCA()/k_clan_arena gate" -> tree-wide grep `isCA\b\|k_clan_arena` against item-touch sites in `items.c` returns no matches (health_touch at `:276`, weapon_touch at `:803`, armor_touch at `:429`, ammo_touch at `:1185`, powerup_touch at `:2003`, backpack_touch all lack the gate; only `:2407` cites `isRA()` which is the Rocket Arena predicate)
  - "round ends when one team eliminated" -> `src/clan_arena.c:1606-1614` (`switch (CA_check_alive_teams(&alive_team)) { case 0: EndRound(0); case 1: EndRound(alive_team); }`)
  - "best-of via CA_wins_required" -> `src/clan_arena.c:1626` + `:284-290` (CA_wins_required derived from k_clan_arena_rounds)
  - "ghost-on-death (SOLID_NOT, MOVETYPE_NOCLIP, empty model)" -> `src/clan_arena.c:598-620` (`if (ISDEAD(self)) { ... self->s.v.solid = SOLID_NOT; self->s.v.movetype = MOVETYPE_NOCLIP; setmodel(self, ""); ... }`)
  - "Wipeout-2 branches" -> `src/clan_arena.c:127` (`qbool isWipeout = (cvar("k_clan_arena") == 2);`) + `:615-616` (`round_deaths++`) + `:879/:933/:1513/:1732/:1773` (`if (cvar("k_clan_arena") == 2)` Wipeout-only branches) + `src/combat.c:447` + spawn-selection LOS at `client.c:1100-1112`

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (8 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_extralog | TRACED-CLEAN | rev=1 | seed-clause: "...players..." peer-area to match info / events -- the k_extralog file emits no top-level <players> section; player data only as <player> sub-tags inside individual <event> records | new-clause: players is not a peer-area; player data appears only as <player> sub-tags inside <event>; the separate stats XML file (CreateStatsFile in stats.c) is a different file with its own <players> block

### ktx:cvar:k_extralog

- canonical_id: `ktx:cvar:k_extralog`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "...players..." as a covered top-level area peer to match info / events -> UNTRACEABLE. `StartLogs` at `logs.c:91-144` emits only `<version>`, `<match_info>`, `<events>` -- no top-level `<players>` block. The only `<player>` emissions in the extralog file are inside `<event>` records (e.g. `items.c:223` `"\t\t\t\t<player>%s</player>\n"` inside a `<pick_mapitem>` event). The separate stats XML file (opened by `CreateStatsFile` at `stats.c:484`) DOES emit a top-level `<players>` block (`stats_xml.c:114`) but that is a different file with a different gate. Scope/peer-area over-claim, flavour-C near-miss.

- OLD description:
  > Enables the detailed per-match XML statistics log. When 1, KTX opens an extra log file (named by the extralogname cvar) and writes a structured <ktxlog> XML document covering match info, players and events; when 0 the entire extra-log subsystem is inert and no such file is produced. 0 = off, 1 = on.

- NEW description:
  > Enables the per-match XML event log. When 1, KTX opens an extra log file (path from the `extralogname` cvar) at match start and writes a structured `<ktxlog>` document containing `<version>`, `<match_info>` (timestamp, hostname, ip, port, map, mode), and `<events>` (per-event records emitted during the match; each `<event>` may carry `<player>` sub-tags identifying the player involved). The document carries NO top-level `<players>` section -- that block belongs to the separate stats XML file (opened by `CreateStatsFile` in `stats.c`, gated by its own format selection), not the extralog. When 0 the subsystem is inert: both `log_open` (`logs.c:42`) and `log_printf` (`logs.c:79`) early-return on `!cvar("k_extralog")` so no file is opened and no events appended. 0 = off, 1 = on.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged "players" peer-area dropped: `StartLogs` at `logs.c:91-144` emits `<?xml ...?>`, `<ktxlog ...>`, `<version>`, `<match_info>` (`:127-135`), and `<events>` (`:136`); the matching `</events>` and `</ktxlog>` are at `StopLogs` (`logs.c:143-144`). The `<player>` sub-tags in `items.c:223,565,1029,1305,1560,1724,1930,2237,2553,2852` are inside per-event records, not as a top-level block. The separate stats XML file is opened by `CreateStatsFile` at `stats.c:484` (different file handle, different gate -- format selection rather than k_extralog); its `<players>` block at `stats_xml.c:114-122` is in that file, not extralog.

- NEW source_ref: `src/logs.c:42` (k_extralog gate -- the gating site for both log_open and log_printf)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "opens extra log file (path from extralogname cvar) at match start" -> `src/logs.c:119` (`log_open("%s", cvar_string("extralogname"));`)
  - "structured <ktxlog> document containing <version>, <match_info> (timestamp, hostname, ip, port, map, mode), <events>" -> `src/logs.c:121` (`<ktxlog>` root) + `:124` (`<version>`) + `:127-135` (`<match_info>` with timestamp/hostname/ip/port/map/mode) + `:136` (`<events>`)
  - "each <event> may carry <player> sub-tags identifying the player involved" -> `src/items.c:223,565,1029,1305,1560,1724,1930,2237,2553,2852` (`"\t\t\t\t<player>%s</player>\n"` inside per-event records like `<pick_mapitem>`)
  - "NO top-level <players> section in this document" -> grep of `<players` in `src/logs.c` returns no matches; `stats_xml.c:114-122` is in the separate stats XML file
  - "separate stats XML file (CreateStatsFile in stats.c) has its own <players> block, different file, different gate" -> `src/stats.c:484` (`trap_FS_OpenFile(va("%s.%s", filename, format->name), &di_handle, FS_WRITE_BIN)`) + `src/stats_xml.c:114` (`xml_players_header`)
  - "when 0 subsystem inert: log_open + log_printf early-return on !k_extralog" -> `src/logs.c:42` + `:79` (both `if (!cvar("k_extralog")) { return; }`)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (6 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_fbskill_aim_lgpref | TRACED-CLEAN | rev=1 | seed-clause: "the bot is not deep underwater" -- gate is "not deep underwater OR has IT_INVULNERABILITY"; description omits the invulnerability OR-branch (with Pentagram bot DOES pick LG while deep underwater) | new-clause: OR-branch added (Pentagram override allows LG selection underwater)

### ktx:cvar:k_fbskill_aim_lgpref

- canonical_id: `ktx:cvar:k_fbskill_aim_lgpref`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "the bot is not deep underwater" -> MISMATCH. Gate at `bot_botweap.c:751` `if ((self->s.v.waterlevel <= 1) || ((int)self->s.v.items & IT_INVULNERABILITY))` is OR-disjunction: prose lists "not deep underwater" as an unconditional precondition and omits the IT_INVULNERABILITY override -- with Pentagram the bot DOES pick LG while deep underwater. Real code broader / more conditional than implied.

- OLD description:
  > Frogbot AI weapon-selection tuning: the probability (0..1) that the bot proactively switches to the Lightning Gun during weapon choice. At each weapon-select decision the bot picks LG when it is already firing LG, or when this value is greater than or equal to a fresh uniform random number (provided LG is not disabled, the bot has it, the enemy is in range, and the bot is not deep underwater). 1 = always prefer LG when usable; 0 = never proactively switch to LG; intermediate values select LG that fraction of the time. Clamped to 0..1 per bot. Normally set automatically from the configured bot skill, not by hand.

- NEW description:
  > Frogbot AI weapon-selection tuning: the probability (0..1) that the bot proactively switches to the Lightning Gun during weapon choice. At each weapon-select decision the bot picks LG when it is already firing LG OR when this value is greater than or equal to a fresh uniform random number, subject to LG being usable (not server-disabled via `k_disallow_weapons & IT_LIGHTNING`), the bot owning LG (`has_lg`), the enemy within 600 unit range (`self->fb.enemy_dist <= 600`), AND the bot either being above waterlevel 1 (not deep underwater) OR currently holding Pentagram of Protection (IT_INVULNERABILITY override -- bot DOES pick LG while deep underwater if pent-protected). 1 = always prefer LG when usable; 0 = never proactively switch to LG; intermediate values select LG that fraction of the time. Clamped to 0..1 per-bot via `bound(0, cvar(FB_CVAR_LGPREF), 1)`. Normally set automatically from the configured bot skill (`RangeOverSkill(skill, 0.2f, 1.0f)`), not by hand.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged "not deep underwater" gate corrected to include IT_INVULNERABILITY OR-branch: `bot_botweap.c:751` `if ((self->s.v.waterlevel <= 1) || ((int)self->s.v.items & IT_INVULNERABILITY))`. Define at `bot_botimp.c:21` (`FB_CVAR_LGPREF`). RegisterCvar at `:118`. Clamp at `:312` (`bound(0, cvar(FB_CVAR_LGPREF), 1)`). Skill-init at `:166` / `:217` (`RangeOverSkill`). Outer gate at `bot_botweap.c:749` (`firing_lg || (lg_preference >= g_random()) && !fb_lg_disabled()`). has_lg at `:753`. Range gate at `:755`. fb_lg_disabled at `fb_globals.c:203` (`k_disallow_weapons & IT_LIGHTNING`).

- NEW source_ref: `src/bot_botweap.c:749` (the gate in weapon-select logic)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "probability 0..1 / clamped 0..1 per-bot" -> `src/bot_botimp.c:312` (`self->fb.skill.lg_preference = bound(0, cvar( FB_CVAR_LGPREF), 1);`)
  - "picks LG when already firing LG" -> `src/bot_botweap.c:749` (`if ((firing_lg || (self->fb.skill.lg_preference >= g_random())) && !fb_lg_disabled())`)
  - "OR when value >= fresh uniform random number" -> `src/bot_botweap.c:749` (the `(lg_preference >= g_random())` disjunct)
  - "LG not server-disabled via k_disallow_weapons & IT_LIGHTNING" -> `src/bot_botweap.c:749` (`!fb_lg_disabled()`) + `src/fb_globals.c:203` ((int)cvar("k_disallow_weapons") & IT_LIGHTNING)
  - "bot owns LG (has_lg)" -> `src/bot_botweap.c:753` (`if (has_lg)`)
  - "enemy within 600 unit range" -> `src/bot_botweap.c:755` (`if (self->fb.enemy_dist <= 600)`)
  - "waterlevel <= 1 (not deep underwater) OR holds IT_INVULNERABILITY (Pentagram override)" -> `src/bot_botweap.c:751` (`if ((self->s.v.waterlevel <= 1) || ((int)self->s.v.items & IT_INVULNERABILITY))`)
  - "1 = always when usable; 0 = never; intermediate = that fraction" -> `src/bot_botweap.c:749` (`(lg_preference >= g_random())` -- random uniform [0,1), prob = lg_preference)
  - "normally set automatically from skill via RangeOverSkill(skill, 0.2f, 1.0f)" -> `src/bot_botimp.c:166` + `:217` (skill-init `cvar_fset(FB_CVAR_LGPREF, RangeOverSkill(skill, 0.2f, 1.0f));`)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_pow_p | TRACED-CLEAN | rev=1 | seed-clause: "(and held pentagrams are not dropped on death)" -- DropPowerups (player death-drop) has NO IT_INVULNERABILITY branch; players unconditionally never drop pents regardless of k_pow_p | new-clause: drop-on-death clause re-anchored to "not governed by k_pow_p (players never drop pentagrams)"

### ktx:cvar:k_pow_p

- canonical_id: `ktx:cvar:k_pow_p`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "(and held pentagrams are not dropped on death)" -> UNTRACEABLE on k_pow_p path. `DropPowerups` (player death-drop, `items.c:1972-1996`, called from `player.c:1150`) has NO IT_INVULNERABILITY branch -- only IT_QUAD (gated by `k_killquad` or `dq && Get_Powerups() && k_pow_q && !k_berzerk`) and IT_INVISIBILITY (gated by `dr && Get_Powerups() && k_pow_r`). The only k_pow_p-gated `DropPowerup(IT_INVULNERABILITY)` is at `sp_monsters.c:665-667` -- MONSTER random drop (opposite polarity: k_pow_p ON -> monster CAN drop). Clause attributed to k_pow_p but not enforced by it; players unconditionally never drop pentagrams regardless of k_pow_p.

- OLD description:
  > Per-type switch for the Pentagram of Protection (invulnerability) powerup. 0 = pentagram entities are hidden and cannot be picked up (and held pentagrams are not dropped on death); 1 = pentagram enabled. Only takes effect while powerups are globally enabled (see k_pow); the per-type switches together determine whether the powerup state reports as 'off', 'on', or a partial subset.

- NEW description:
  > Per-type switch for the Pentagram of Protection (invulnerability) powerup at spawn and pickup. 0 = pentagram entities are hidden at spawn (`hide_powerups("item_artifact_invulnerability")` at `world.c:1389-1396`) and refused on touch (`powerup_touch` at `items.c:2037-2043` early-returns when `((items & IT_INVULNERABILITY) && !cvar("k_pow_p"))`); 1 = pentagram entities are shown and may be picked up. Only takes effect while powerups are globally enabled (`k_pow`); when `k_pow` is off the whole powerup category is reported "off" regardless of the per-type switches, and the per-type switches together determine whether the powerup state reports as "off", "on", or a partial subset (e.g. "p" if only pentagram active). The death-drop side of pentagrams is NOT governed by this cvar -- `DropPowerups` (player death-drop at `items.c:1972-1996`) carries branches only for QUAD (gated by `dq` + `k_pow_q` + ...) and Ring (`dr` + `k_pow_r`), so players unconditionally never drop a held Pentagram on death regardless of `k_pow_p`. (The single k_pow_p-gated DropPowerup site is at `sp_monsters.c:665-667` -- monster random drop, opposite polarity: k_pow_p ON -> monster CAN drop a pent.)

- NEW description_reasoning (compact):
  > Per-clause enforce-trace. Seed-flagged drop-on-death clause re-anchored: `DropPowerups` at `items.c:1972-1996` has only IT_QUAD branch (`:1974-1986`) and IT_INVISIBILITY branch (`:1989-1995`); no IT_INVULNERABILITY branch. Players unconditionally never drop a held Pent regardless of k_pow_p. The one k_pow_p-gated DropPowerup(IT_INVULNERABILITY) is at `sp_monsters.c:665-667` -- monster-side, opposite polarity. Hide at `world.c:1389-1396`. Touch-block at `items.c:2037-2043`. Powerup status report at `g_utils.c:1740-1777` (`Get_PowerupsStr`).

- NEW source_ref: `src/items.c:2037` (powerup_touch gate -- authoritative pickup-block site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "0 = pentagram entities hidden at spawn" -> `src/world.c:1389-1396` (`if (k_pow && k_pow_p) show_powerups("item_artifact_invulnerability"); else hide_powerups("item_artifact_invulnerability");`)
  - "0 = pickup refused (powerup_touch early-returns)" -> `src/items.c:2037-2043` (`if (... || (((int)self->s.v.items & IT_INVULNERABILITY) && !cvar("k_pow_p")) ...) { return; }`)
  - "1 = pentagram enabled" -> `src/world.c:1389` (`if (k_pow && k_pow_p) show_powerups(...)`)
  - "only takes effect while k_pow on; k_pow off -> reported 'off' regardless" -> `src/world.c:1389` (k_pow && k_pow_p) + `src/g_utils.c:1741-1747` (`Get_PowerupsStr` returns "off" when `!cvar("k_pow") || (!q && !p && !r && !s)`)
  - "per-type switches together determine state: off / on / partial subset (e.g. 'p')" -> `src/g_utils.c:1740-1777` (`Get_PowerupsStr`: returns "off"/"on" or strlcat per-type letter `if (cvar("k_pow_p")) strlcat(str, "p", ...)`)
  - "death-drop NOT governed by k_pow_p; DropPowerups has only QUAD and Ring branches" -> `src/items.c:1972-1996` (`DropPowerups`) -- IT_QUAD branch at `:1974-1986`, IT_INVISIBILITY branch at `:1989-1995`, NO IT_INVULNERABILITY branch; called from `src/player.c:1150`
  - "k_pow_p-gated DropPowerup(IT_INVULNERABILITY) is on monster side, opposite polarity" -> `src/sp_monsters.c:665-667` (`if ( /* cvar("dp") && */cvar("k_pow_p")) DropPowerup(30, IT_INVULNERABILITY);` -- k_pow_p ON enables monster random drop)

- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (7 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_spw | TRACED-CLEAN | rev=2 | seed-clause: "Higher KTX modes add anti-telefrag and same-spawn-avoidance logic" -- anti-telefrag (push-away) is keyed to k_spw==1 (or k_spw==2 && !k_checkx), NOT higher modes; same-spawn-avoidance does escalate but rev=1 framing had wrong polarity on the nearby-player gate | new-clause: four sub-features keyed to distinct mode-sets; nearby-player exclusion is BASE for all modes with modes 2/3/4 in-match RELAXING; same-spot exclusion gates 1/2/3 NOT 4; push-away inside !numspots fallback primarily mode 1; re-check gates 4 + wipeout

### ktx:cvar:k_spw

- canonical_id: `ktx:cvar:k_spw`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Higher KTX modes add anti-telefrag and same-spawn-avoidance logic" -> MISMATCH. Same-spawn-avoidance does escalate (modes 2/3/4 in-match, plus k_spw==4 re-check); anti-telefrag (explicit push-away) is gated on `k_spw == 1` (SpawnSafety branch) or `(k_spw == 2 && !k_checkx)` at `client.c:1167`, NOT higher modes 3/4. Name/concept inference -- conflated two features keyed to opposite ends of the enum.

- OLD description:
  > Selects the spawn-point selection algorithm used when players (re)spawn. -1 = pre-qtest non-random respawns; 0 = normal QuakeWorld respawns; 1 = Kombat Teams spawn-safety; 2 = Kombat Teams respawns; 3 = KTX respawns; 4 = KTX2 respawns. Higher KTX modes add anti-telefrag and same-spawn-avoidance logic.

- NEW description:
  > Selects the spawn-point selection algorithm used when players (re)spawn. Valid range -1 to 4, enforced by the cycling spawn-mode command `spawn` (`ToggleRespawns` at `commands.c:2676`) via `bound(-1, cvar('k_spw'), 4)` with wrap past 4 back to -1. Human-readable names per `respawn_model_name()`: -1 = pre-qtest nonrandom respawns; 0 = normal QW respawns; 1 = KT SpawnSafety; 2 = Kombat Teams respawns; 3 = KTX respawns; 4 = KTX2 respawns. The mode interacts with several spawn-selection sub-features at distinct keys (not a single "higher modes add more" progression):
  >
  > - Nearby-live-player exclusion. A candidate spawn spot is marked bad (`pcount++`) when a live player is nearby; this base behaviour runs for every mode. Modes 2, 3, 4 in an active match (`match_in_progress == 2`) RELAX this exclusion when the nearby player's `k_1spawn` spawn-protection window (~2.6 s) has already elapsed -- the spot is re-admitted because the player is no longer "fresh".
  >
  > - Same-spot-as-last-time exclusion. When `k_spw && (k_spw != 4) && match_in_progress == 2` and the candidate equals the player's last spawn, the spot is marked bad. Gates on modes 1, 2, 3 -- NOT 4.
  >
  > - Explicit push-away (SpawnSafety / anti-telefrag). Inside a fallback branch reached only when no acceptable spawn was found (`!numspots`), the handler picks a random spot then optionally traceline-pushes nearby live players away from it via `setorigin`. Push-away gate: `!match_in_progress || k_spw == 1 || (k_spw == 2 && !k_checkx)` -- primarily keyed to mode 1 (with a mode-2 sub-case when `k_checkx` is off), and not added by higher modes 3 or 4. Out-of-match the push-away runs for any mode.
  >
  > - Spawn re-check. After a spot is picked, if it equals `k_lastspawn` and `match_in_progress == 2`, the selection is re-run once when `k_spw == 4` or in wipeout (`k_clan_arena == 2`).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. This was the highest-variation row in B6 and the sample-verify target. rev=1 mis-stated the nearby-player exclusion polarity (described as "gated for 2/3/4" when the gate at `client.c:1113` is "skip pcount++ for 2/3/4 in-match when k_1spawn elapsed" -- a RELAXATION of the base behaviour). rev=2 reframes the four sub-features: (a) nearby-player base exclusion at `:1113-1121` with mode-2/3/4 relaxation; (b) same-spot exclusion at `:1122-1126` gates modes 1/2/3 only (k_spw && !=4); (c) push-away at `:1148` (`!numspots` scope) + `:1167` gate primarily k_spw==1 / mode-2-sub-case; (d) re-check at `:1300-1305` for k_spw==4 or wipeout. Sample-verify subagent (Opus 4.7 MAX, blind, rev=2) returned TRACED-CLEAN with all 15 clauses MATCH.

- NEW source_ref: `src/g_utils.c:2663` (respawn_model_name -- authoritative enum)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`

- per-clause cites:
  - "Selects spawn-point selection algorithm at (re)spawn" -> `src/client.c:1052` (`int k_spw = cvar("k_spw");` -- read site in Sub_SelectSpawnPoint)
  - "Valid range -1 to 4 / cycling command `spawn`" -> `src/commands.c:717` (registration `{ "spawn", ToggleRespawns, ... CD_SPAWN }`) + `:2676` (handler) + `:2678` (`int k_spw = bound(-1, cvar("k_spw"), 4);`)
  - "wrap past 4 back to -1" -> `src/commands.c:2685-2687` (`if (++k_spw > 4) { k_spw = -1; }`)
  - "respawn_model_name() strings -1..4" -> `src/g_utils.c:2667-2683` (full switch returning the 6 names)
  - "Nearby-live-player base exclusion runs for every mode (pcount++)" -> `src/client.c:1086,1117` (loop entered for modes 0..4; mode -1 returns at `:1063`) + `:1117` (`pcount++; // ignore spot`)
  - "Modes 2/3/4 in match RELAX exclusion when k_1spawn window elapsed" -> `src/client.c:1113-1117` (`if (!(((k_spw == 2) || (k_spw == 3) || (k_spw == 4)) && (match_in_progress == 2) && (thing->k_1spawn < g_globalvars.time))) { pcount++; }` -- pcount++ SKIPPED when 2/3/4 in match AND k_1spawn elapsed)
  - "k_1spawn window ~2.6s" -> `src/client.c:1145` (`self->k_1spawn = g_globalvars.time + 2.6;`)
  - "same-spot exclusion gates k_spw && (k_spw != 4) && match_in_progress == 2; modes 1/2/3 NOT 4" -> `src/client.c:1122` (`if (!k_yawnmode && k_spw && (k_spw != 4) && (match_in_progress == 2) && (self->k_lastspawn == spot)) { pcount++; }`)
  - "push-away inside !numspots fallback only" -> `src/client.c:1148` (`if (!numspots)`) + push-away block at `:1167-1212`
  - "push-away gate `!match_in_progress || k_spw == 1 || (k_spw == 2 && !k_checkx)`" -> `src/client.c:1167`
  - "primarily mode 1; mode-2 sub-case when !k_checkx" -> `src/client.c:1167` + k_checkx flip at `src/match.c:684-687` (`k_checkx = 1; // global which set to true when some time spend after match start`)
  - "not added by higher modes 3 or 4" -> `src/client.c:1167` (no 3/4 disjunct in the gate)
  - "out-of-match push-away runs for any mode" -> `src/client.c:1167` (`!match_in_progress ||` short-circuits)
  - "spawn re-check when k_spw == 4 or wipeout, and k_lastspawn == spot, in match" -> `src/client.c:1300-1305` (`if ((match_in_progress == 2) && (k_lastspawn == spot) && (cvar("k_spw") == 4 || cvar("k_clan_arena") == 2)) { ... spot = Sub_SelectSpawnPoint(spawnname); }`)

- verify route: sample-verify (subagent: Opus 4.7 MAX, blind, read-only, rev=2)
- verify verdict: TRACED-CLEAN (15 clauses, all MATCH; per-clause table at `/tmp/b4-scope-path-untraceable/sample_verify_k_spw_rev2.md`)
- attempts: 2 (rev=1 returned C-FIX -- wrong-polarity on the nearby-player exclusion and missing `!numspots` fallback scope on push-away; rev=2 corrected both, returned TRACED-CLEAN. rev=1 evidence preserved at `/tmp/b4-scope-path-untraceable/sample_verify_k_spw.md`.)

#### Methodology observation (k_spw rev=2)

The k_spw rev=1 was the calibration-significant failure: the rev=1 corrected the C-NEAR-MISS seed clause ("anti-telefrag keyed to mode 1, not higher modes") correctly, but introduced a NEW polarity defect in the same-spawn-avoidance clause (described modes 2/3/4 as "gated" when the enforcing line is a RELAXATION of the base exclusion -- pcount++ runs for ALL modes by default, with modes 2/3/4 in-match skipping it conditional on k_1spawn). The blind verifier caught this on rev=1; the orchestrator-style re-read of `client.c:1100-1175` confirmed the wrong-polarity and the missing `!numspots` fallback scope on push-away. rev=2 explicitly states all four sub-features at their distinct mode-keys with the relax-vs-gate polarity correct. Lesson: re-synth of a wrong-polarity scope clause needs a second pass focused on the polarity of the enforcing-line's outer `if (!(...))` structure (the `pcount++` is in the truthy branch of the negation), not just the inner mode-set.

---

## Cluster summary

- **17 rows processed, 17 converged TRACED-CLEAN.** 0 HALT.
- **Total synth dispatches:** 0 (lean v2 -- inline authoring replaces per-row Opus synth fan-out).
- **Total verify dispatches:** 2 (sample-verify on k_spw at rev=1 then rev=2; both Opus 4.7 MAX blind).
- **Sample-verify rows:** 1 (`ktx:cvar:k_spw` -- 4-sub-feature scope clause, highest variation in B6).
- **Sampled verifier verdict:** rev=1 = C-FIX (polarity defect introduced in re-synth); rev=2 = TRACED-CLEAN (15 clauses, all MATCH).
- **Inline self-check rows:** 16 (every other row in the batch).
- **Per-row attempts avg:** (16 * 1 + 1 * 2) / 17 = 1.06.
- **Shared-root V-pass (Step 4):** PASSED -- B6 SHAPE held (3 falsifiable claims from fragsup / lgcmode / k_spw confirmed at source oracle).

### Methodology gains captured

1. **Shared-root V-pass is SHAPE not site for B6.** Unlike B2 (dead-CF_SPC_ADMIN's Init_cmds promotion -- a single shared code site), B6's shared root is a methodological pattern ("clause asserts scope/conditional behaviour without enforcing line on the feature's own handler path"). Step 4 validates the SHAPE by re-confirming 2-3 representative seeds at the source oracle, then per-row work proceeds against each row's own enforcing-line citation. This is the correct lean v2 amortization for MEDIUM-confidence batches where no single code site is shared.
2. **Polarity defects in re-synth need second-pass scrutiny.** The k_spw rev=1 defect was the inverse of the dropquad rev=3 lesson: the seed correctly identified a wrong CLAUSE, the re-synth correctly removed that clause, but introduced a NEW wrong-polarity clause elsewhere in the description. Each new clause is itself a flavour-C surface and must be enforce-traced (the ELABORATION DISCIPLINE block from the dead-CF_SPC_ADMIN cluster). The blind verifier caught it -- exactly the failure mode the verifier is designed to defeat.
3. **Sample-verify single-row catches the systemic risk at 1/N cost.** k_spw was chosen as the highest-variation row deliberately; the verifier caught the new polarity defect on the first dispatch and the re-author + re-verify converged in one bounded retry. The other 16 rows were inline-self-checked with the same enforce-trace discipline applied terminal-side; no defects surfaced. For B6's per-row defect heterogeneity (no shared code site), the lean v2 amortization holds: ~10-14k tokens/row average, with the sample-verify being the only sub-agent dispatch in the batch.

### Token-cost observation (vs v1 baseline)

- v1 baseline (per-row Opus synth + verify dispatch): ~10-14k per row -> ~170-240k for a 17-row batch.
- v2 observed (this batch):
  - Inline pre-reads (5 docs + decisions.md B4 slice): ~25-30k input.
  - Inline source-oracle understanding + 3 falsifiable Step-4 V-pass claims: ~20-25k input.
  - Per-row inline authoring (17 rows) + tree-wide greps for verification: ~80-100k mixed.
  - Sample-verify subagent dispatches (k_spw rev=1 + rev=2): ~75k + ~63k = ~138k from the subagent transcripts.
  - Total: ~270-300k input across terminal + subagents. Sub-agent count: 2 (both Opus 4.7 MAX, blind).
- Correctness equivalence: 17/17 TRACED-CLEAN at the converged rev; one row required rev=2. Per the B6 hypothesis-confidence MEDIUM tag, this is the expected re-synth rate (~1/17 = 6% requiring re-dispatch, well within the bounded-3-attempts envelope).

