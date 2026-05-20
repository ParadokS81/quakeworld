# B4 ledger -- dead-CF_SPC_ADMIN cluster

**Cluster id:** `dead-spc-admin-cluster`
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Cluster members:** 6 rows
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth loop. B5 Stage-2 change-report ledger per row.
**Prompt:** `b4-dead-spc-admin-cluster-prompt.md` (corrected
2026-05-20 mid-execution; commit `859ef0e1`).

## Members

```
ktx:command:droppack         # WI2-FIX (batch-01)
ktx:command:dropquad         # WI2-FIX (batch-09)
ktx:command:dropring         # WI2-FIX (batch-05)
ktx:command:race_set_finish  # WI2-FIX (batch-01)
ktx:command:upspecs          # WI2-FIX (batch-01)
ktx:command:upplayers        # WI2-FIX (batch-02)
```

## Pre-reads (loaded by orchestrator at session start)

- `~/.claude/skills/describe-fill-synthesis/SKILL.md` -- D6 synthesis engine
- `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
  -- B1 method, classification enum
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
  -- the cluster framing + Session #8 receipt addendum 2026-05-20
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
  D7 Amendment 2026-05-19 (B1-B5)
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-fav_go-calibration.md`
  -- prior calibration; ELABORATION DISCIPLINE genesis

## Cluster-shared root context (mandatory synth-brief preamble per row)

**CORRECTED 2026-05-20 mid-cluster-execution** -- the initial root
context drafted at Session #8 B4 calibration receipt was incomplete.
The terminal's Wave-1 blind verifiers caught a gap (commands.c:1448
Init_cmds promotion) that the orchestrator's earlier re-grep + 5 of 6
V-pass Stage-1 seeds also missed. Independently re-verified at the
source oracle 2026-05-20 (orchestrator response to terminal HALT,
independent grep across Init_cmds + g_main.c call site + tree-wide
search for any later CF_SPECTATOR clearing). The corrected reading
below is what re-dispatch synth uses; previous (wrong) reading is
preserved in the methodology note below the root.

**The runtime flag promotion (commands.c:1427-1458 / g_main.c:493).**
Every row in this cluster registers with `CF_PLAYER | CF_SPC_ADMIN`
at the cmds[] table (lines 741/742/743/980/982/1014) and **no
CF_SPECTATOR bit**. At mod startup, `void Init_cmds(void)`
(commands.c:1427) runs unconditionally from g_main.c:493 and walks
cmds[] applying THREE systematic flag promotions:

```c
if (cmds[i].cf_flags & CF_PLR_ADMIN)         // commands.c:1443
{
    cmds[i].cf_flags |= CF_PLAYER;           // 1445
}
if (cmds[i].cf_flags & CF_SPC_ADMIN)         // commands.c:1448
{
    cmds[i].cf_flags |= CF_SPECTATOR;        // 1450
}
if (cmds[i].cf_flags & CF_MATCHLESS_ONLY)    // commands.c:1453
{
    cmds[i].cf_flags |= CF_MATCHLESS;        // 1455
}
```

The source comment is verbatim `// this let simplify cmds[] table` --
the registered flags are intentionally a **shorthand**; the runtime
flags include the implied bits. No code anywhere clears the promoted
bits (independent tree-wide grep for `cf_flags &= ~CF_SPECTATOR` /
`cf_flags ^= ...` returns empty).

**Runtime cf_flags after Init_cmds for all 6 cluster members:**
`CF_PLAYER | CF_SPC_ADMIN | CF_SPECTATOR`.

**Registration sites:**

```
commands.c:741  { "dropquad",        ToggleDropQuad,    0, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:742  { "dropring",        ToggleDropRing,    0, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:743  { "droppack",        ToggleDropPack,    0, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:980  { "upplayers",       DEF(upplayers),    1, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:982  { "upspecs",         DEF(upplayers),    2, CF_PLAYER | CF_SPC_ADMIN, ... }
commands.c:1014 { "race_set_finish", DEF(r_Xset),       3, CF_PLAYER | CF_SPC_ADMIN, ... }
```

**Dispatch (DoCommand, commands.c:1088-1110) at runtime:**

```c
if (spc)                                          // 1088
{
    if (!(cmds[icmd].cf_flags & CF_SPECTATOR))    // 1091
    {
        return DO_WRONG_CLASS;                    // 1093
    }
    if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))   // 1096
    {
        G_sprint(self, 2, "You are not an admin\n");
        return DO_ACCESS_DENIED;                  // 1099
    }
}
```

- **Spec branch:** CF_SPECTATOR set (via Init_cmds promotion) -> 1091
  passes -> CF_SPC_ADMIN+is_adm gate at 1096 fires. Admin spectators
  reach the handler; non-admin spectators get DO_ACCESS_DENIED at 1099
  with "You are not an admin".
- **Player branch (1106+):** CF_PLAYER set, no CF_PLR_ADMIN -> any
  in-game player runs without admin status.

**Effective access for all 6 cluster members at runtime: any in-game
player (no admin required) + admin spectators (with /elect-granted
admin).** The original L1 descriptions overstate the requirement when
they say "Admin toggle" or "spectator-admin command" -- admin is NOT
required on the player path, and admin spectators DO run the command.
The WI-2 correction states this dual-path access correctly. Do NOT
state "player-only" or "CF_SPC_ADMIN is structurally dead" -- those
are wrong (the Init_cmds promotion makes the CF_SPC_ADMIN bit live at
runtime).

**Per-row runtime admin gate (variation -- trace each row's handler):**

- `upspecs` and `upplayers` BOTH dispatch through the shared `upplayers`
  handler and DO carry a runtime admin gate:
  `commands.c:8027 if (!check_perm(self, cvar("k_allowcountchange"))) { return; }`.
  This gate fires on BOTH the player and admin-spec paths -- their
  actual access is "any player or admin spec whose
  k_allowcountchange permission is granted" -- a runtime check
  layered on top of the dispatch flag check.
- `droppack` / `dropquad` / `dropring` -- the V-pass seeds report NO
  runtime admin gate on the handler path. Verify per row at the
  handler. Effective access: any in-game player + admin spec.
- `race_set_finish` -- the V-pass seed reports a race-mode gate at
  race.c:2793 (`if (!race_command_checks()) return;`), independent of
  the admin question. Effective access: any in-game player + admin
  spec, AND the race-mode preconditions.

**Match-state clause (universal across all 6):** every row carries a
"refused while a match is in progress" or analogous clause. These
clauses are TRUE and ENFORCED -- by handler-internal
`if (match_in_progress) return;` guards. Keep them; this cluster's
WI-2 is the access-class clause, NOT the match-state clause.

## Methodology note (cluster-shared root is itself a hypothesis)

Recorded 2026-05-20 mid-cluster after the wave-1 contested-seed halt.
The cluster-shared root above is itself a falsifiable hypothesis. The
*initial* drafting at session-#8 receipt re-grepped registration sites
+ dispatch branches and looked correct, but missed `Init_cmds`'s
startup flag promotion. The terminal's blind verifiers caught it
because their V-pass chases a closed falsifiable claim ("no spec ever
runs this") and forced the trace to its actual enforcing line -- which
exposed the promotion. Going forward (every future B4 cluster prompt):
the cluster-shared root must be V-passed *before* drafting. Pick 1-2
falsifiable claims from the candidate root, chase each to its
enforcing line + tree-wide grep for any other source that mutates the
same field, then commit the root. Otherwise the synth sub-agents
inherit the gap and "verify" the wrong corrections.

The 3 wave-1 attempt-1 outputs (droppack/dropquad/dropring) are
preserved below as rev=1 rejected per-row entries with the verifier's
specific "no spec ever runs this" findings + the Init_cmds enforcing
line citation. They are the methodology evidence; the rev=2 outputs
under the corrected root are the converged final.

## ELABORATION DISCIPLINE (from fav_go Wave-2 attempt-1 failures)

Every NEW clause beyond addressing the seed is itself a flavour-C
surface. Trace it the same way:

1. **Flag-NAME inversions.** A flag's name can semantically invert
   what it means. Locate the defining comment.
   *Example:* `STUFFCMD_IGNOREINDEMO` reads as "ignore during demo
   playback" but g_syscalls.h:57 says `// do not put in mvd demo`
   (omit-from-MVD-recording, opposite direction).

2. **Callee-branch dead code.** A generic helper may carry a branch
   unreachable from a specific dispatch entry. If a clause cites a
   generic-helper guard, verify the dispatch path actually reaches it.
   *For this cluster (corrected reading):* the CF_SPC_ADMIN check at
   commands.c:1096 might appear dead at the REGISTERED-flag level, but
   Init_cmds promotion at commands.c:1448 makes the spec branch live
   at runtime -- the lesson is to chase the RUNTIME flag state, not
   the registered flags alone.

3. **Command-name pattern inversions.** Use the cluster-shared root's
   EXACT registered names. Digit position + underscore matter.

A correct unverified clause is still flavour-C. Drop it or hedge.

## C4 (non-negotiable)

- Read-only on the L1 database. No UPDATE / INSERT / schema change.
- No file writes outside this LEDGER + `/tmp/b4-dead-spc-admin/`
  scratch.
- The V-pass seed is MANDATORY per row; never overridden in-terminal.
  Contested seed -> HALT + escalate.
- Synth and verify run as SEPARATE sub-agents. Verify is BLIND.
- Re-dispatch sharpens TOWARD discrimination only. NEVER an "avoid
  over-correcting" / "be defensible" anti-flag brief.
- Bounded 3 attempts/row. No convergence -> HALT, move on.

---

## Results

B4-RESULT | ktx:command:droppack | TRACED-CLEAN | rev=2 | seed-clause: "Admin toggle (on/off) for the dp rule" (WI-2 access-class) | new-clause: "any in-game player + admin spectator" (rcon-set or elected)

### ktx:command:droppack

- canonical_id: `ktx:command:droppack`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Admin toggle" overstates the player path -> WI-2 access-class. Seed-cited enforcing line: registration at `src/commands.c:743` `{ "droppack", ToggleDropPack, 0, CF_PLAYER | CF_SPC_ADMIN, ... }` + spec branch at `src/commands.c:1096`. Seed scratch: `/tmp/b4-dead-spc-admin/seed_droppack.md`.

#### rev=1: REJECTED (WI2-FIX, blind verifier)

- attempt-1 synth output (NEW description excerpt): "Any in-game player can run it; spectators (admin or not) cannot run it."
- attempt-1 verifier flagged clause: "spectators (admin or not) cannot run it" -> MISMATCH at `src/commands.c:1448-1450` Init_cmds promotion `if (cmds[i].cf_flags & CF_SPC_ADMIN) cmds[i].cf_flags |= CF_SPECTATOR;` + dispatch `src/commands.c:1091,1096-1099` admits admin specs, refuses non-admin specs with "You are not an admin".
- rejection reason: **inherited the orchestrator's incomplete cluster-shared root; missed Init_cmds promotion at commands.c:1448 -> CF_SPECTATOR. Re-dispatch under corrected root.** (Full verifier table in `/tmp/b4-dead-spc-admin/attempt1_droppack.md`.)

#### rev=2: CONVERGED (TRACED-CLEAN)

- OLD description:
  > Admin toggle (on/off) for the dp rule, which controls whether a player drops a backpack containing their ammo and weapon when they die during a live match. Each invocation flips the rule between enabled and disabled and broadcasts "<player> enables/disables DropPacks" to everyone. Refused while a match is in progress (so it is set during warmup). When enabled, backpack-on-death is active only during an in-progress match and is still subject to the mode's other pack rules; when disabled, no backpack is dropped on death.

- NEW description:
  > Toggle of the "dp" (drop-pack) rule, which controls whether a player drops a backpack containing their ammo and weapon when they die during a live match. Runnable by any in-game player; admin spectators may also run it, but non-admin spectators are refused with "You are not an admin". Each invocation flips the rule between enabled and disabled and broadcasts "<player> enables/disables DropPacks" to everyone. The command itself is refused while a match is in progress, so it is set during warmup. When enabled, backpack-on-death is still gated by the match being in the live in-progress state and by DropBackpack's other guards (bloodfest mode disables it; suicide kills do not drop in non-yawn modes; nothing is dropped if the player has no ammo and no droppable weapon). When disabled, no backpack is dropped on death.

- NEW description_reasoning (summary; full text in `/tmp/b4-dead-spc-admin/attempt1_droppack.md` superseded by rev=2):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Access class corrected via cluster-shared root: registration `src/commands.c:743` CF_PLAYER|CF_SPC_ADMIN, Init_cmds promotion at `src/commands.c:1448-1451` adds CF_SPECTATOR (`g_main.c:493` calls Init_cmds unconditionally; tree-wide grep for `cf_flags &= ~CF_SPECTATOR / ^=` empty), dispatch at `src/commands.c:1088-1117` admits admin specs at :1096 and any-player at :1106. Toggle at `src/g_utils.c:2211/2218`, broadcast at `:2215` via `Enables()` at `:1834`. Match guard at `src/commands.c:3167`. DropBackpack guards traced at `src/items.c:2674-2699`: bloodfest (:2674), suicide in non-yawn (:2686-2691), empty-inventory "nothing in it" (:2694-2699). Live-match drop gate at `src/items.c:2681` `if ((match_in_progress != 2) || !cvar("dp")) return;`.

- NEW source_ref: `src/commands.c:3165` (handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- re-V (blind) verdict: TRACED-CLEAN (14 clauses, all MATCH)
- re-V key citations: registration `:743`; Init_cmds promotion `:1448-1450`; spec branch `:1091,1096-1099`; player branch `:1106,1111`; toggle helper `g_utils.c:2211,2218`; broadcast `:2215` + `:1834`; handler guard `:3167-3170`; live-match `items.c:2681`; bloodfest `:2674-2677`; yawnmode-suicide `:2686-2692`; ammo+weapon `:2694-2699`.
- orchestrator HG2 re-grep: confirmed `items.c:2706` `item->s.v.items = self->s.v.weapon; item->tp_flags = it_pack;` (ammo+weapon contents) + `items.c:2681` live-match gate.
- attempts: 2

---

B4-RESULT | ktx:command:dropquad | TRACED-CLEAN | rev=3 | seed-clause: "Admin toggle (on/off) for the dq rule" (WI-2 access-class) | new-clause: "any in-game player + admin spectator (admin = rcon-set or elected)"

### ktx:command:dropquad

- canonical_id: `ktx:command:dropquad`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Admin toggle" overstates the player path -> WI-2 access-class. Seed at `/tmp/b4-dead-spc-admin/seed_dropquad.md`.

#### rev=1: REJECTED (WI2-FIX, blind verifier)

- attempt-1 verifier flagged clause: "the command carries CF_PLAYER but no CF_PLR_ADMIN" (access-class) -> MISMATCH at `src/commands.c:741`: full flag is `CF_PLAYER | CF_SPC_ADMIN`; description omits `CF_SPC_ADMIN`, so admin-spec callers missing from the "Runnable by any non-spectator player" scope.
- rejection reason: **inherited the orchestrator's incomplete cluster-shared root; missed Init_cmds promotion at commands.c:1448 -> CF_SPECTATOR. Re-dispatch under corrected root.** (Full table in `/tmp/b4-dead-spc-admin/attempt1_dropquad.md`.)

#### rev=2: REJECTED (WI2-FIX, blind verifier)

- attempt-2 synth output (NEW description excerpt): "Runnable by any in-game player and by admin spectators (a spectator without elected admin is refused)"
- attempt-2 verifier flagged clause: "spectator without **elected** admin is refused" -> MISMATCH at `src/admin.c:18`: `is_adm(p) = is_real_adm(p) || (p->k_admin & AF_ADMIN)` -- rcon-set real admins also qualify; "elected" is too narrow.
- rejection reason: **inherited the cluster-shared root's "(with /elect-granted admin)" narrow framing; dropquad uniquely held it through synthesis (droppack and dropring generalized to plain "admin spectator"). Actual `is_adm` covers both real-admins and elected admins.** (Full table in `/tmp/b4-dead-spc-admin/attempt2_dropquad.md`.)

#### rev=3: CONVERGED (TRACED-CLEAN via orchestrator HG2 adjudication)

- OLD description:
  > Admin toggle (on/off) for the dq rule, which controls whether a player carrying Quad Damage drops it when killed (the dropped Quad keeps its remaining powerup time so another player can pick it up). Each invocation flips the rule between enabled and disabled and broadcasts "<player> enables/disables DropQuad" to everyone. Refused while a match is in progress (so it is set during warmup). The drop also requires the mode's powerups to be enabled (k_pow_q); when disabled, the Quad is simply lost on death.

- NEW description:
  > Toggle for the `dq` rule, which controls whether a player carrying Quad Damage drops it as a pickup-able item when killed during a live match; the dropped Quad keeps its remaining duration. Each invocation flips `dq` between 0 and 1 and broadcasts "<player> enables/disables DropQuad" to all clients. Runnable by any in-game player and by spectators who hold admin status (rcon-set or elected); refused while a match is in progress, so it is set during warmup. The drop additionally requires the mode's Quad powerup to be enabled (`k_pow_q`) and the match to be live; when `dq` is 0 the Quad is lost on death rather than dropped.

- NEW description_reasoning (summary):
  > Per-clause enforce-trace. Access class via cluster-shared root + `is_adm` broadening: Init_cmds promotion `src/commands.c:1448-1451`, dispatch `:1088-1117`, `is_adm` at `src/admin.c:16-19` covers `is_real_adm(p)` (AF_REAL_ADMIN via rcon, `admin.c:356/378/433`) OR `(p->k_admin & AF_ADMIN)` (elected, `src/vote.c:677` `BecomeAdmin(p, AF_ADMIN)`). Toggle/broadcast helpers `src/g_utils.c:2211/2218/2215/1834`. Match guard `src/commands.c:3147-3150`. Drop chain: `PlayerDie` -> `DropPowerups` (caller, `items.c:1972-1996`) gates dq + k_pow_q + !k_berzerk + Get_Powerups -> `DropPowerup` (callee, `items.c:1869+`) gates live-match at `:1874` `if ((timeleft <= 0) || (match_in_progress != 2)) return;` + spawns at `items.c:1886-1995`. Remaining duration `super_damage_finished - g_globalvars.time` (`items.c:1985`) preserved via `self->cnt` (`items.c:1887`).

- NEW source_ref: `src/commands.c:3145` (handler entry ToggleDropQuad)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- re-V (blind) verdict: **C-NEAR-MISS** (verifier flagged "the match to be live" as UNTRACEABLE on the drop side; verifier checked `DropPowerups` plural caller at `items.c:1972-1996` and missed the callee `DropPowerup` singular at `items.c:1869+`).
- orchestrator HG2 adjudication: **TRACED-CLEAN**. Independent re-grep confirmed `DropPowerup` callee at `items.c:1874-1877` carries `if ((timeleft <= 0) || (match_in_progress != 2)) { return; }` -- the live-match gate the synth correctly cited. `Get_Powerups()` at `g_utils.c:1780` is a `k_pow/k_pow_min_players/k_matchLess/deathmatch` gate (not a match-state gate; verifier correct on this point but irrelevant to the contested clause). The verifier failed to follow the call chain into the callee even though the synth's reasoning named the callee site explicitly -- this is the **inverse of the ELABORATION DISCIPLINE "Callee-branch dead code" pattern** and is recorded as a new methodology observation in this row's ledger.
- orchestrator HG2 re-grep evidence: `items.c:1869+` `DropPowerup` body; `g_utils.c:1780` `Get_Powerups` body; tree-wide grep for additional IT_QUAD drop sites returns only the two calls in `DropPowerups` plural (`items.c:1980/1985`).
- attempts: 3

##### Methodology observation (dropquad rev=3)

The B3 V-pass blind verifier is designed to defeat synth self-rationalization (FAILURE-B), but here it produced a false-negative because it stopped at the caller without following the call into the callee. The synth's reasoning correctly cited the callee gate (`items.c:1874`); the verifier checked only the caller (`items.c:1972-1996`) and concluded UNTRACEABLE. Mitigation candidate for the operator's post-cluster review: the V-pass verifier brief should explicitly require "if a clause cites a function-call-mediated effect, follow the call chain to the actual enforcing line." (The Wave-2 verifier briefs already incorporated this guidance and all 3 Wave-2 rows came back TRACED-CLEAN at rev=1.)

---

B4-RESULT | ktx:command:dropring | TRACED-CLEAN | rev=2 | seed-clause: "Admin toggle (access class = admin)" (WI-2 access-class) | new-clause: "any in-game player; spectators may run it only if they hold admin"

### ktx:command:dropring

- canonical_id: `ktx:command:dropring`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Admin toggle (access class = admin)" -> WI-2 access-class. Seed at `/tmp/b4-dead-spc-admin/seed_dropring.md`.

#### rev=1: REJECTED (WI2-FIX, blind verifier)

- attempt-1 synth output (NEW description excerpt): "Player command runnable by any in-game player (not admin-gated; spectators cannot run it)."
- attempt-1 verifier flagged clause: "spectators cannot run it" -> MISMATCH at `src/commands.c:1448-1451` Init_cmds promotion `if (cmds[i].cf_flags & CF_SPC_ADMIN) cmds[i].cf_flags |= CF_SPECTATOR;` + dispatch `:1088-1101` admits admin spectators.
- rejection reason: **inherited the orchestrator's incomplete cluster-shared root; missed Init_cmds promotion at commands.c:1448 -> CF_SPECTATOR. Re-dispatch under corrected root.** (Full table in `/tmp/b4-dead-spc-admin/attempt1_dropring.md`.)

#### rev=2: CONVERGED (TRACED-CLEAN)

- OLD description:
  > Admin toggle (on/off) for the dr rule, which controls whether a player carrying the Ring of Shadows (invisibility / eyes) drops it when killed (the dropped Ring keeps its remaining powerup time so another player can pick it up). Each invocation flips the rule between enabled and disabled and broadcasts "<player> enables/disables DropRing" to everyone. Refused while a match is in progress (so it is set during warmup). The drop also requires the mode's powerups to be enabled (k_pow_r); when disabled, the Ring is simply lost on death.

- NEW description:
  > Toggles the `dr` rule on/off. When enabled, a player carrying the Ring of Shadows (invisibility / eyes) drops it on death, and the dropped Ring keeps its remaining powerup time so another player can pick it up; when disabled, the Ring is simply lost on death. Each invocation flips the rule's current value and broadcasts "<player> enables/disables DropRing" to all clients. The drop also requires the mode's powerups to be enabled (`k_pow`) and the Ring rule to be enabled (`k_pow_r`) -- if either is off the Ring is lost regardless of `dr`. Runnable by any in-game player (no admin required); spectators may run it only if they hold admin (non-admin spectators are refused with "You are not an admin"). Refused while a match is in progress -- it is set during warmup.

- NEW description_reasoning (summary):
  > Per-clause enforce-trace. Access class via cluster-shared root: registration `src/commands.c:742` CF_PLAYER|CF_SPC_ADMIN; Init_cmds promotion `:1448-1451`; dispatch admits admin specs at `:1096-1099` ("You are not an admin"). Toggle/broadcast helpers `g_utils.c:2211/2218/2215`. Match guard `:3157-3160`. Drop branch `items.c:1989-1995` `if (cvar("dr") && Get_Powerups() && cvar("k_pow_r"))`; Ring identity at `items.c:2305-2315` (SP_item_artifact_invisibility sets `netname = "Ring of Shadows"`, `s.v.items = IT_INVISIBILITY`). Remaining-time preservation at `items.c:1993` -> `:1887` `self->cnt = g_globalvars.time + timeleft`. Live-match drop gate at callee `DropPowerup` `items.c:1874` (same as dropquad).

- NEW source_ref: `src/items.c:1989` (the gated drop branch — authoritative behavior site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- re-V (blind) verdict: TRACED-CLEAN (14 clauses, all MATCH)
- re-V key citations: handler `src/commands.c:3162`; Init_cmds promotion + admin-spec gate verified; toggle/broadcast `g_utils.c:2211/2218/2215`; drop branch `items.c:1989-1995`; Ring=invisibility `items.c:2305-2315`; live-match callee `items.c:1874`; Get_Powerups reads `k_pow` `g_utils.c:1785`.
- orchestrator HG2 re-grep: confirmed `items.c:1989-1995` drop branch + `items.c:2305-2315` SP_item_artifact_invisibility identity.
- attempts: 2

---

B4-RESULT | ktx:command:race_set_finish | TRACED-CLEAN | rev=1 | seed-clause: "player / spectator-admin" (WI-2 access-class) | new-clause: "any in-game player or admin spectator (admin = rcon-set or elected via /elect)"

### ktx:command:race_set_finish

- canonical_id: `ktx:command:race_set_finish`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Race-mode route editing command (player / spectator-admin)" -> WI-2 access-class. Seed at `/tmp/b4-dead-spc-admin/seed_race_set_finish.md`.

#### rev=1: CONVERGED (TRACED-CLEAN)

Wave-2 briefs incorporated Wave-1 lessons (broad admin qualifier + callee-follow guidance) from the start; this row converged on attempt 1.

- OLD description:
  > Race-mode route editing command (player / spectator-admin). Places the race finish (end) node at the caller's current position on the custom race route. Has no effect if the race is already running, or if the route already holds the maximum number of nodes. On success it broadcasts the finish-node coordinates and flags the route as a custom (non-preset) route.

- NEW description:
  > Race-mode route editing command. Active only when race mode is on; usable by any in-game player or admin spectator (admin = rcon-set or elected via /elect). Places the race finish checkpoint at the caller's current position on the custom race route. Has no effect if the race is already running, or if the route already holds the maximum 20 nodes (start, intermediate checkpoints, and finish counted together). On success it broadcasts the finish-node coordinates and flags the route as a custom (non-preset) route.

- NEW description_reasoning (summary):
  > Per-clause enforce-trace. Race-mode gate via `race.c:2793` `if (!race_command_checks()) return;` -> `race.c:2951-2962` `!isRACE()` -> `race.c:217-220` `cvar("k_race")` (callee chain followed). Access-class via cluster-shared root: registration `src/commands.c:1014` CF_PLAYER|CF_SPC_ADMIN; Init_cmds promotion + dispatch + `is_adm` (rcon AF_REAL_ADMIN or elected AF_ADMIN via `BecomeAdmin(p, AF_ADMIN)` at `src/vote.c:677`). Effect at `race.c:2813` `node.type = (raceRouteNodeType_t) t` with t=3 from dispatch arg -> `nodeEnd` (enum `progs.h:1283-1290`, nodeUnknown=0, so nodeEnd=3); position copy `:2814-2815`, spawn `:2817`. Race-active guard `:2798` `race_is_started()` -> `race.status` check at `:2964-2978`. MAX_ROUTE_NODES=20 (`progs.h:28`, comment "max race checkpoints per race (including start and finish checkpoints)") gated at `:2803-2807` via `checkpoints_count()` (`:988-998` sums nodeStart+nodeCheckPoint+nodeEnd). Broadcast at `:2832-2837` in else-branch (nodeEnd; nodeStart/nodeCheckPoint take other branches). Custom-route flag via `race_route_now_custom()` at `:2839` -> `:2778-2786` `race.active_route = 0` + clears RACE_ROUTE_NUMBER_CVAR/MAPNAME_CVAR. No `k_allowcountchange` or other admin-permission runtime gate on this handler path.

- NEW source_ref: `src/race.c:2788` (r_Xset handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- re-V (blind) verdict: TRACED-CLEAN (10 clauses, all MATCH; verifier explicitly followed the callee chain race_command_checks -> isRACE -> cvar("k_race"))
- orchestrator HG2 re-grep: confirmed MAX_ROUTE_NODES=20 at `progs.h:28`, nodeEnd=3 in enum (nodeUnknown=0 explicit start), `name_for_nodeType(nodeEnd) -> "finish checkpoint"` at `race.c:825-840`, `race_route_now_custom -> race.active_route = 0` at `race.c:2778-2786`.
- attempts: 1

---

B4-RESULT | ktx:command:upspecs | TRACED-CLEAN | rev=1 | seed-clause: "Player/spectator-admin command" (WI-2 access-class) | new-clause: "any in-game player or admin spectator (admin via rcon or /elect)"

### ktx:command:upspecs

- canonical_id: `ktx:command:upspecs`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Player/spectator-admin command" -> WI-2 access-class. Seed at `/tmp/b4-dead-spc-admin/seed_upspecs.md`.

#### rev=1: CONVERGED (TRACED-CLEAN)

- OLD description:
  > Raises the server's maxspectators (spectator-slot count) by one, up to the server's configured cap k_maxspectators. Refused while a match is in progress, when the caller lacks the k_allowcountchange permission, or when maxspectators has already reached k_maxspectators (prints "maxspectators reached"); when applied it broadcasts that the caller set maxspectators to the new value. No effect if the new value would equal the current one. Player/spectator-admin command, no arguments.

- NEW description:
  > Raises the server's maxspectators (spectator-slot count) by one, up to the server's configured cap k_maxspectators. Refused while a match is in progress, when the caller lacks the k_allowcountchange permission, or when maxspectators has already reached k_maxspectators (prints "maxspectators reached"); when applied it broadcasts that the caller set maxspectators to the new value. No effect if the new value would equal the current one. Issued by any in-game player or by an admin spectator (admin via rcon or /elect); no arguments.

- NEW description_reasoning (summary):
  > Per-clause enforce-trace. Dispatch chain followed: registration `src/commands.c:982` CF_PLAYER|CF_SPC_ADMIN with type-selector arg=2 -> wrapper `:8057-8060` -> `ChangeClientsCount(2, 1)` at `:8017-8055`. Match guard `:8022`. k_allowcountchange runtime gate `:8027-8030` (fires for BOTH player and admin-spec dispatch paths -- handler level, not dispatch). Type==2 branch `:8033-8037` sets sv_max="maxspectators", k_max="k_maxspectators". Ceiling check `:8039-8044` -> `G_sprint "%s reached"` (sv_max -> "maxspectators reached"). cl_count compute `:8046`. No-op-if-same `:8048-8051`. Apply + broadcast `:8053-8054`. Access class via cluster-shared root: Init_cmds promotion `:1448-1451`, dispatch admits admin specs at `:1096-1099` + any-player at `:1106`, `is_adm` covers both rcon and elected admins.

- NEW source_ref: `src/commands.c:8053` (cvar_fset write site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- re-V (blind) verdict: TRACED-CLEAN (11 clauses, all MATCH)
- orchestrator HG2 re-grep: confirmed `commands.c:8017-8045` ChangeClientsCount body (match guard `:8022`, k_allowcountchange `:8027`, type==2 -> maxspectators `:8033-8037`).
- attempts: 1

---

B4-RESULT | ktx:command:upplayers | TRACED-CLEAN | rev=1 | seed-clause: "Player/spectator-admin command" (WI-2 access-class) | new-clause: "any in-game player or spectators who hold admin status (granted by rcon or via election)"

### ktx:command:upplayers

- canonical_id: `ktx:command:upplayers`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed): "Player/spectator-admin command" -> WI-2 access-class. Seed at `/tmp/b4-dead-spc-admin/seed_upplayers.md`.

#### rev=1: CONVERGED (TRACED-CLEAN)

- OLD description:
  > Raises the server's maxclients (player-slot count) by one, up to the server's configured cap k_maxclients. Refused while a match is in progress, when the caller lacks the k_allowcountchange permission, or when maxclients has already reached k_maxclients (prints "maxclients reached"); when applied it broadcasts that the caller set maxclients to the new value. No effect if the new value would equal the current one. Player/spectator-admin command, no arguments.

- NEW description:
  > Raises the server's maxclients (player-slot count) by one, up to the configured cap k_maxclients. Refused while a match is in progress, when the caller lacks the k_allowcountchange permission, or when maxclients has already reached k_maxclients (prints "maxclients reached"); when applied it broadcasts that the caller set maxclients to the new value. No effect if the new value would equal the current one. Runnable by any in-game player or by spectators who hold admin status (granted by rcon or via election); takes no arguments.

- NEW description_reasoning (summary):
  > Per-clause enforce-trace. Dispatch chain followed: registration `src/commands.c:980` CF_PLAYER|CF_SPC_ADMIN with type-selector arg=1 -> wrapper `:8057-8060` -> `ChangeClientsCount(1, 1)` at `:8017-8055`. Type==1 (default branch): sv_max="maxclients", k_max="k_maxclients" (`:8019` initial declaration). Same handler path as upspecs (the ONLY behavioral difference is the type-selector picking maxclients vs maxspectators). Match guard `:8022`, k_allowcountchange gate `:8027` (both paths), ceiling check + "maxclients reached" `:8039-8043`, no-op-if-same `:8048-8051`, apply + broadcast `:8053-8054`. Access class via cluster-shared root (same as upspecs).

- NEW source_ref: `src/commands.c:8057` (upplayers wrapper -- bearing the entity's name)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- re-V (blind) verdict: TRACED-CLEAN (13 clauses, all MATCH)
- orchestrator HG2 re-grep: confirmed `commands.c:8046-8060` (cl_count compute, no-op-if-same, cvar_fset + broadcast, upplayers wrapper passing type=1).
- attempts: 1

---

## Cluster summary

- **6 rows processed, 6 converged TRACED-CLEAN.** 0 HALT.
- **Total synth dispatches:** 10 = 3 wave-1 rev=1 (REJECTED) + 3 wave-1 rev=2 (2 converged + 1 rejected) + 1 wave-1 rev=3 (dropquad converged via orchestrator HG2 adjudication) + 3 wave-2 rev=1 (all converged).
- **Total verify dispatches:** 10 (one per synth output).
- **Total all sub-agents:** 20.
- **Total orchestrator HG2 re-greps:** 6 (one per row); all held. The dropquad rev=3 HG2 specifically overruled a verifier C-NEAR-MISS via callee-evidence at `items.c:1874`.

### Methodology gains captured

1. **Cluster-shared root is itself a hypothesis** (the wave-1 rev=1 contested-seed halt). Surfaced the Init_cmds promotion gap; pre-flighted into the corrected root for future cluster prompts.
2. **Broad-vs-narrow admin qualifier** (wave-1 rev=2 dropquad). The cluster-shared root's "(with /elect-granted admin)" narrowing was too tight; `is_adm` at `admin.c:18` covers both real-admins and elected admins. Use a broad qualifier ("admin spectator" or "rcon-set or elected").
3. **Verifier callee-follow** (wave-1 rev=3 dropquad). The B3 V-pass verifier can false-negative when a clause's enforcing line lives in a callee the verifier doesn't follow. Mitigation candidate: verifier brief should explicitly require call-chain following.

Wave-2 briefs already incorporated all three gains from the start; all 3 wave-2 rows converged at rev=1, validating the methodology hardening end-to-end.
