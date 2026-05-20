# B4 ledger -- wi2-access-class batch (LEAN v2, B2)

**Batch id:** `wi2-access-class` (B4 Pass 2 -- Batch B2)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Member count:** 7 rows
**Triage plan section:** `b4-unique-rows-triage-plan.md` -> Batch B2 (size 7, MEDIUM)
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth contract. B5 Stage-2 change-report ledger per row.
**Prompt:** `b4-unique-rows-pass2-template.md` (BATCH_ID=2).

## Lean v2 shape note

Single-terminal inline work: source-of-truth understanding inline (Step 4
shared-root V-pass + per-row deviations), per-row inline authoring under
enforce-trace + callee-follow (Step 5), ONE blind sample-verify subagent
on the highest-variation row (Step 6), inline self-check on the
remaining rows. No per-row Opus synth fan-out; no DB writes; all output
lands in this LEDGER + `/tmp/b4-wi2-access-class/` scratch.

## Members

```
ktx:command:forcebreak       # C-FIX (batch-04)        access-class or vote-count floor
ktx:command:dmm4             # WI2-FIX (batch-??)      access-class only
ktx:command:qizmo            # WI2-FIX (batch-??)      access-class only
ktx:command:admin            # C-NEAR-MISS (batch-??)  access-class
ktx:cvar:k_vp_admin          # C-NEAR-MISS (batch-??)  vote-permission cvar
ktx:cvar:k_vp_antilag        # C-NEAR-MISS (batch-??)  vote-permission cvar
ktx:cvar:lock_practice       # C-NEAR-MISS (batch-??)  G_ShutDown vs match-reset trigger
```

(Step 4 V-pass evidence appended below before any per-row authoring.)

---

## Step 4 -- shared-root V-pass evidence

**Hypothesis (MEDIUM, per triage plan B2):** access-class / permission
clauses are wrong because the registered cmds[] flags are a shorthand;
runtime cf_flags are augmented by Init_cmds at mod startup. For
non-command rows the shared root is the vote-count formula plus the
per-vote-type minimum-vote floor; lock_practice (singleton) is a
trigger-condition error (G_ShutDown / level-change vs match-reset).

Three sub-shapes (each row hits exactly one):

- **Sub-A (Init_cmds-root commands):** `forcebreak`, `dmm4`, `qizmo`, `admin`
- **Sub-B (vote-threshold cvars with `max(2, ...)` floor):** `k_vp_admin`, `k_vp_antilag`
- **Singleton (G_ShutDown trigger):** `lock_practice`

### Sub-A V-pass: Init_cmds promotion holds at oracle 1.47-2-g67253dc

Same structure as the dead-CF_SPC_ADMIN cluster's corrected root, re-V'd
inline against the source oracle here. `void Init_cmds(void)` at
`src/commands.c:1427-1459` walks `cmds[]` and applies three systematic
flag promotions:

```c
if (cmds[i].cf_flags & CF_PLR_ADMIN)         // src/commands.c:1443
{
    cmds[i].cf_flags |= CF_PLAYER;           // :1445
}
if (cmds[i].cf_flags & CF_SPC_ADMIN)         // :1448
{
    cmds[i].cf_flags |= CF_SPECTATOR;        // :1450
}
if (cmds[i].cf_flags & CF_MATCHLESS_ONLY)    // :1453
{
    cmds[i].cf_flags |= CF_MATCHLESS;        // :1455
}
```

Source comment verbatim `// this let simplify cmds[] table` -- the
registered flags are intentionally a shorthand; runtime flags include
the implied bits. Caller `src/g_main.c:493 Init_cmds();` (unconditional
mod-startup path; same as dead-CF_SPC_ADMIN cluster's verified reading).

**Tree-wide grep for `cf_flags` write-sites returns ONLY the three
promotion lines** (`:1445`, `:1450`, `:1455`); no clearing anywhere in
the source tree (no `&= ~CF_`, no `^=`). The runtime cf_flags are
monotonic after Init_cmds.

Dispatch at `src/commands.c:1088-1117` (re-V'd verbatim against the
oracle):

```c
if (spc)
{
    // spec
    if (!(cmds[icmd].cf_flags & CF_SPECTATOR))            // :1091
    {
        return DO_WRONG_CLASS;                             // :1093
    }
    if ((cmds[icmd].cf_flags & CF_SPC_ADMIN) && !is_adm(self))  // :1096
    {
        G_sprint(self, 2, "You are not an admin\n");      // :1098
        return DO_ACCESS_DENIED;                           // :1100
    }
}
else
{
    // player
    if (!(cmds[icmd].cf_flags & CF_PLAYER))               // :1106
    {
        return DO_WRONG_CLASS;                             // :1108
    }
    if ((cmds[icmd].cf_flags & CF_PLR_ADMIN) && !is_adm(self))  // :1111
    {
        G_sprint(self, 2, "You are not an admin\n");      // :1113
        return DO_ACCESS_DENIED;                           // :1115
    }
}
```

`CF_*` macro definitions (`include/g_local.h`):

- `:649` `#define CF_BOTH        (CF_PLAYER | CF_SPECTATOR)        /* command valid for both: specs and players */`
- `:652` `#define CF_BOTH_ADMIN  (CF_PLR_ADMIN | CF_SPC_ADMIN)     /* this command require admin rights, any way */`

**Per-row registered cmds[] flags (verified at the oracle) -> post-Init_cmds runtime cf_flags -> effective access:**

| Row | Registered (cmds[]) | After Init_cmds | Effective access |
|---|---|---|---|
| `forcebreak` (`src/commands.c:752`) | `CF_BOTH_ADMIN` (= `CF_PLR_ADMIN \| CF_SPC_ADMIN`) | `+ CF_PLAYER + CF_SPECTATOR` (both promotions fire) | admin player + admin spectator (admin = rcon-set or elected); on both dispatch branches the CF_*_ADMIN gate fires and requires `is_adm(self)` |
| `dmm4` (`src/commands.c:728`) | `CF_PLAYER \| CF_SPC_ADMIN` | `+ CF_SPECTATOR` (SPC_ADMIN promotion fires) | any in-game player (player branch admits, no CF_PLR_ADMIN gate) + admin spectator (spec branch CF_SPC_ADMIN gate fires) |
| `qizmo` (`src/commands.c:777`) | `CF_PLAYER` | (no promotion fires) | any in-game player only; specs hit `DO_WRONG_CLASS` at `:1091-1093` because CF_SPECTATOR is not set |
| `admin` (`src/commands.c:750`) | `CF_BOTH \| CF_MATCHLESS \| CF_PARAMS` | (no admin-promotion; CF_MATCHLESS already explicit) | any in-game player + any spectator (no admin gate); CF_MATCHLESS admits the command outside a live match |

**`is_adm` callee body** (`src/admin.c:16-19`, re-V'd via dead-CF_SPC_ADMIN
cluster's HG2): `is_adm(p) = is_real_adm(p) || (p->k_admin & AF_ADMIN)`
-- covers rcon-set admins (`AF_REAL_ADMIN`, set at `src/admin.c:356/378/433`)
and elected admins (`AF_ADMIN`, set at `src/vote.c:677 BecomeAdmin(p, AF_ADMIN)`).
Use the broad qualifier "admin (rcon-set or elected via /elect)" per
the dead-CF_SPC_ADMIN dropquad rev=3 broadening lesson.

**Methodology note (seed-vs-cluster contradiction resolved at Step 4).**
The dmm4 seed's reasoning ("a spectator is rejected at :1093 DO_WRONG_CLASS
because CF_SPECTATOR is NOT set (CF_SPC_ADMIN is inert without
CF_SPECTATOR)") is the SAME Init_cmds-blind gap the dead-CF_SPC_ADMIN
cluster's initial drafting hit. The seed's CLASSIFICATION (WI2-FIX --
the OLD's "Admin/console command" is wrong) is correct; its dispatch
reasoning misses Init_cmds. By contrast the qizmo seed implicitly
accounts for the promotion ("the CF_SPC_ADMIN gate fires only on the
spectator branch"). Authoring uses the corrected dead-CF_SPC_ADMIN
dispatch reading uniformly across all four sub-A rows -- exactly the
"cluster-shared root is itself a hypothesis" lesson applied a second
time.

### Sub-B V-pass: vote-threshold formula includes `max(2, ...)` floor

`get_votes_req` body at `src/vote.c:236-447` (the function that returns
the required vote count per vote type). Three relevant sites:

- Percent clamp at `:330` `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` (with `bound` at `src/g_utils.c:351-354`, per dead-CF_SPC_ADMIN cluster's verified reading). Inner `bound(51, percent, 100)` clamps to `[51, 100]`; outer `bound(0.51, ..., 1)` enforces the bottom after `/100`.
- Players-minus-bots ceil at `:343` `vt_req = ceil(percent * (CountPlayers() - CountBots()));` (with the `CA_count_ready_players()` swap-in for the CA + OV_BREAK case, and `race_count_votes_req(percent)` for the race + OV_MAP case, neither relevant here).
- Per-vote-type minimum-vote floors (the omitted clause in both OLD descriptions):
  - `:367-369` `else if (fofs == OV_ELECT) { vt_req = max(2, vt_req); }` -- covers every `/elect` election (`etAdmin`, `etCaptain`, `etCoach`, `etSuggestColor`, `etLateJoin`).
  - `:411-413` `else if (fofs == OV_ANTILAG) { vt_req = max(2, vt_req); }` -- covers the antilag vote.
- Bot-bias correction at `:430` non-diff path `return max(0, vt_req - CountBots());`.

`/elect admin` is the path that creates the etAdmin election:
- Registration `src/commands.c:800 { "elect", VoteAdmin, ... }`
- `VoteAdmin` sets `self->v.elect_type = etAdmin` at `src/admin.c:530`
- `get_votes_req` case OV_ELECT at `:270-274` picks `cvar("k_vp_admin")` when `get_elect_type() == etAdmin`

The `/admin` command (`src/commands.c:750`, ReqAdmin handler) is the
password / VIP-grant path for self-promotion -- it does NOT set
`elect_type` and is unrelated to the admin ELECTION. The k_vp_admin
OLD description's "(the /admin vote)" parenthetical is the C-NEAR-MISS
command-name slip.

`/antilag` (`src/commands.c:722` -> `antilag` handler at `src/vote.c:1413`)
casts a vote which, on pass, runs `vote_check_antilag` at `src/vote.c:1447`
which toggles `sv_antilag` between `0` and `2` at `src/vote.c:1394`. The
vote enum is `OV_ANTILAG`; the k_vp_antilag cvar is its percent threshold.

### Singleton V-pass: lock_practice trigger is `G_ShutDown` / level-change

Tree-wide grep `lock_practice` -- READ-sites only (registration is
`src/world.c:851 RegisterCvar("lock_practice");`):

- `src/g_main.c:521` `if (!cvar("lock_practice") && k_practice) { SetPractice(0, NULL); ... }` -- inside `G_ShutDown` (`src/g_main.c:516+`). `G_ShutDown` is the `GAME_SHUTDOWN` trampoline body (`src/g_main.c:395-400 case GAME_SHUTDOWN: G_ShutDown();`) with verbatim adjacent comment `// called before level change/spawn`.
- `src/client.c:3100` `else if (!cvar("lock_practice") && k_practice) changelevel(mapname);` -- in ClientDisconnect, this triggers a map RELOAD (not a practice clear); the level-change path then fires `GAME_SHUTDOWN` which routes through the `g_main.c:521` site.
- `src/commands.c:4913-4927` `TogglePractice` -- reads `lock_practice` and refuses on value 2 or {0,1 outside} with "console: command is locked".
- `src/race.c:297` / `:318` -- stuffcmd template strings (`"lock_practice 1\n"` / `"lock_practice 0\n"`), WRITE-sites issued during race mode setup / teardown, not read-sites.

There is NO read-site of `lock_practice` on any match-reset code path.
The "0 = clears on match reset" clause was inferred (likely because a
level change typically happens between matches, so the auto-clear
coincides with match boundaries -- but the trigger is the level
change, not the match reset). Sharpened: the auto-clear fires inside
`G_ShutDown` at `g_main.c:521-523`, which the engine invokes via the
`GAME_SHUTDOWN` syscall before each level change or mod shutdown.

### Verdict

All three sub-shape V-passes hold at oracle 1.47-2-g67253dc:
- Sub-A: Init_cmds promotion + dispatch shape identical to dead-CF_SPC_ADMIN cluster's corrected root.
- Sub-B: `max(2, vt_req)` floor enforced for OV_ELECT (vote.c:367-369) and OV_ANTILAG (vote.c:411-413); percent clamp + ceil + bot-bias correction at cited lines.
- Singleton: lock_practice trigger is `G_ShutDown` via `g_main.c:521-523`; no match-reset enforcing line tree-wide.

Authoring proceeds.

---

## Results

B4-RESULT | ktx:command:forcebreak | TRACED-CLEAN | rev=1 | seed-clause: "Restricted to admins who are not playing (spectator/admin side)" (C-FIX -- the `ct != ctPlayer` guard is on the matchless-clear and countdown-cancel branches ONLY, not the EndMatch branch) | new-clause: "admin player or admin spectator (CF_BOTH_ADMIN); the ct != ctPlayer restriction applies only to the matchless-clear and countdown-cancel branches; the live-match end-match branch has no such restriction, so a playing admin can break a live match"

### ktx:command:forcebreak

- canonical_id: `ktx:command:forcebreak`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "Restricted to admins who are not playing (spectator/admin side)" -> MISMATCH at `src/admin.c:710/724` (the `self->ct != ctPlayer` guards exist ONLY on the matchless-clear and countdown-cancel branches); `src/admin.c:719` then falls through to `:739 EndMatch(0)` with NO `ct != ctPlayer` guard, AND registration `src/commands.c:752 CF_BOTH_ADMIN = CF_PLR_ADMIN | CF_SPC_ADMIN` plus Init_cmds promotion `src/commands.c:1443-1450` admits admin players via the player branch. Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_command_forcebreak.md`.
  - WI-2: n/a.

- OLD description:
  > Admin command. Ends the current match immediately. While a match is in progress it terminates the game (running the normal match-end handling); if a countdown/warmup timer is running it instead cancels that timer; if a forced start is queued but the match has not begun it clears the forced-start standby state. Restricted to admins who are not playing (spectator/admin side).

- NEW description:
  > Admin command, runnable by an admin player or by an admin spectator (admin = rcon-set or elected via /elect). Behaves differently across three branches in `AdminForceBreak`: while a live match is in progress it broadcasts "<player> forces a break!" and runs the normal match-end handling via `EndMatch(0)`; if a countdown / warmup timer is running it instead cancels that timer; if a forced start is queued before the match has begun it clears the forced-start standby state and announces "serverinfo status Standby". The matchless-clear and countdown-cancel branches additionally require `self->ct != ctPlayer` (the caller must be a non-playing admin), but the live-match end-match branch has no such restriction, so an admin who is also playing can use it to break a live match.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Access class via cluster-shared root: registration `src/commands.c:752 CF_BOTH_ADMIN` (= `CF_PLR_ADMIN | CF_SPC_ADMIN` per `include/g_local.h:652`); Init_cmds promotion `src/commands.c:1443-1450` adds `CF_PLAYER` (from PLR_ADMIN) AND `CF_SPECTATOR` (from SPC_ADMIN); dispatch `:1088-1117` admits admin players at `:1106/1111-1115` and admin spectators at `:1091/1096-1100`, both branches requiring `is_adm(self)`. `is_adm` body `src/admin.c:16-19`: `is_real_adm(p) || (p->k_admin & AF_ADMIN)` covers rcon-set (AF_REAL_ADMIN) and elected (AF_ADMIN) admins. Three handler branches at `src/admin.c:708-740`: matchless-clear `:710-717` gates on `(self->ct != ctPlayer) && !match_in_progress`; admin+match guard `:719-722`; countdown-cancel `:724-730` gates on `(self->ct != ctPlayer) && (match_in_progress == 1)`; live-match end-match `:732-739` has NO `ct != ctPlayer` guard -> `G_bprint(2, "%s forces a break!\n", self->netname); EndMatch(0);`. C-FIX corrected: a playing admin (`self->ct == ctPlayer` AND `is_adm(self)`) is dispatched via the player branch + lands on the end-match branch in a live match. Callee-follow performed on `StopTimer` (`src/match.c:2517-2525` clears center print + k_force + match_in_progress + k_standby) and `EndMatch` per dead-CF_SPC_ADMIN cluster's prior trace.

- NEW source_ref: `src/admin.c:708` (AdminForceBreak handler entry -- authoritative behavior site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Admin command, runnable by an admin player or by an admin spectator" -> `src/commands.c:752` (CF_BOTH_ADMIN) + `:1443-1450` (Init_cmds promotion) + `:1088-1117` (dispatch CF_*_ADMIN gates calling `is_adm`)
  - "admin = rcon-set or elected via /elect" -> `src/admin.c:16-19` (`is_adm = is_real_adm(p) || (p->k_admin & AF_ADMIN)`)
  - "three branches in AdminForceBreak" -> `src/admin.c:708-740` (three return arms at :710-717, :724-730, :732-739)
  - "live match: broadcasts '<player> forces a break!' + EndMatch(0)" -> `src/admin.c:737-739` (G_bprint + EndMatch(0))
  - "countdown / warmup timer cancel" -> `src/admin.c:724-730` + callee `StopTimer` at `src/match.c:2517-2525` (clears center print / k_force / match_in_progress / k_standby)
  - "forced start standby clear + 'serverinfo status Standby'" -> `src/admin.c:710-717` (k_force = 0; localcmd("serverinfo status Standby\n")) + k_force set by `AdminForceStart` at `src/admin.c:691`
  - "matchless-clear and countdown-cancel additionally require self->ct != ctPlayer" -> `src/admin.c:710` + `:724`
  - "live-match end-match branch has no such restriction" -> `src/admin.c:732-739` carries no `ct != ctPlayer` guard
  - "an admin who is also playing can use it to break a live match" -> control-flow read: CF_BOTH_ADMIN includes CF_PLR_ADMIN, dispatch admits playing admin on player branch (`:1106/1111-1115`), `:710` and `:724` skipped (ct == ctPlayer), `:732-739` reached

- verify route: sample-verify (subagent: Opus 4.7 MAX, blind)
- verify verdict: TRACED-CLEAN (10 clauses, all MATCH; per-clause table at `/tmp/b4-wi2-access-class/sample_verify_ktx_command_forcebreak.md`)
- attempts: 1

---

B4-RESULT | ktx:command:dmm4 | TRACED-CLEAN | rev=1 | seed-clause: "Admin/console command" (WI-2 access-class) | new-clause: "Runnable by any in-game player or by spectators who hold admin status (rcon-set or elected via /elect)"

### ktx:command:dmm4

- canonical_id: `ktx:command:dmm4`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - WI2-FIX: "Admin/console command" -> WRONG. Registration `src/commands.c:728 CF_PLAYER | CF_SPC_ADMIN`; Init_cmds promotion `:1448-1450` adds CF_SPECTATOR (the seed's reasoning missed this -- corrected via Step-4 shared-root V-pass). On the player branch there is no CF_PLR_ADMIN gate (any in-game player runs); on the spec branch the CF_SPC_ADMIN gate fires and requires `is_adm`. dmm4 is dispatchable by any in-game player + admin spectators, not an "Admin/console command".
  - All four behavior clauses in OLD (dmm cvar set, k_midair/k_instagib gating, OctaPower rename, timelimit=3) -> MATCH at seed cites.
  - Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_command_dmm4.md`.

- OLD description:
  > Admin/console command that switches the server to deathmatch mode 4 (sets the `deathmatch` cvar to 4 and announces the change). Mode 4 is the only mode in which the `k_midair` and `k_instagib` options are permitted; the Quad Damage powerup is replaced by "OctaPower"; entering this mode forces `timelimit` to 3 minutes.

- NEW description:
  > Switches the server to deathmatch mode 4: bounds the new mode value to the range [1, 5], sets the `deathmatch` cvar accordingly, and broadcasts "Deathmatch <n>". Runnable by any in-game player or by spectators who hold admin status (rcon-set or elected via /elect); spectators without admin are refused with "You are not an admin". Subject to the standard rules-change permission check (`is_rules_change_allowed`), which gates the whole handler. Mode 4 is the only mode in which the `k_midair` and `k_instagib` options remain permitted: the sibling commands dmm1/dmm2/dmm3/dmm5 explicitly zero both options on entry, and a separate post-config check at `src/world.c:1760-1769` zeros either option whenever `deathmatch != 4`. Entering dmm4 also forces `timelimit` to 3 minutes; while dmm4 is the active mode, the Quad Damage powerup is renamed "OctaPower" on the in-world item entity.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Access class via cluster-shared root: registration `src/commands.c:728 CF_PLAYER | CF_SPC_ADMIN`; Init_cmds promotion `:1448-1450` adds CF_SPECTATOR; dispatch `:1088-1117` admits any player at `:1106` (no CF_PLR_ADMIN gate) and admin specs at `:1091/1096-1100` with `is_adm` ("You are not an admin" `:1098`). Handler `ChangeDM(float dmm)` at `src/commands.c:2871-2900`: rules-change gate `:2873-2876` `if (!is_rules_change_allowed()) return;` (callee per dead-CF_SPC_ADMIN race_set_finish: refuses on `match_in_progress` or `isRACE()` at `commands.c:9033-9051`); already-set short-circuit `:2878-2883`; bound `:2885` `deathmatch = bound(1, (int)dmm, 5);`; write `:2887` `cvar_set("deathmatch", va("%d", (int)deathmatch));`; leaving-dmm4 zeroing `:2889-2893` `if (dmm != 4) { cvar_set("k_midair", "0"); cvar_set("k_instagib", "0"); }`; entering-dmm4 timelimit `:2894-2897` `else { cvar_set("timelimit", "3"); }`; broadcast `:2899` `G_bprint(2, "Deathmatch %s\n", dig3(deathmatch));`. Post-config periodic gate at `src/world.c:1760-1769` `if (cvar("k_midair") && deathmatch != 4) cvar_fset("k_midair", 0); // midair only in dmm4` + same for k_instagib with `// instagib only in dmm4`. OctaPower at `src/items.c:2341` `self->netname = deathmatch == 4 ? "OctaPower" : "Quad Damage";` on the super_damage item entity (classname `item_artifact_super_damage`, model `progs/quaddama.mdl`, `s.v.items = IT_QUAD`).

- NEW source_ref: `src/commands.c:2871` (ChangeDM handler entry -- dmm4 dispatches via ChangeDM with arg=4)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Switches to dmm4: bounds to [1, 5]" -> `src/commands.c:2885` `deathmatch = bound(1, (int)dmm, 5);`
  - "sets the `deathmatch` cvar accordingly" -> `src/commands.c:2887` `cvar_set("deathmatch", va("%d", (int)deathmatch));`
  - "broadcasts 'Deathmatch <n>'" -> `src/commands.c:2899` `G_bprint(2, "Deathmatch %s\n", dig3(deathmatch));`
  - "Runnable by any in-game player" -> `src/commands.c:728` CF_PLAYER + dispatch `:1106` admits (no CF_PLR_ADMIN gate fires)
  - "or by spectators who hold admin status" -> `src/commands.c:728` CF_SPC_ADMIN + Init_cmds `:1448-1450` -> CF_SPECTATOR + dispatch `:1091/1096-1100` (CF_SPC_ADMIN gate calls `is_adm`)
  - "(rcon-set or elected via /elect)" -> `src/admin.c:16-19` `is_adm` body
  - "spectators without admin are refused with 'You are not an admin'" -> `src/commands.c:1098-1100` `G_sprint(self, 2, "You are not an admin\n"); return DO_ACCESS_DENIED;`
  - "Subject to is_rules_change_allowed which gates the whole handler" -> `src/commands.c:2873-2876` (callee per dead-CF_SPC_ADMIN race_set_finish prior trace)
  - "Mode 4 is the only mode in which k_midair and k_instagib remain permitted" -> `src/world.c:1760-1769` periodic gate + `src/commands.c:2889-2893` sibling zeroing
  - "sibling commands dmm1/dmm2/dmm3/dmm5 zero both on entry" -> `src/commands.c:2889-2893` (the `if (dmm != 4)` else-of-dmm4 branch fires for dmm1/2/3/5; cmds[] entries at `src/commands.c:725-729`)
  - "post-config check at world.c:1760-1769 zeros either when deathmatch != 4" -> verbatim cited (adjacent comments `// midair only in dmm4` / `// instagib only in dmm4`)
  - "Entering dmm4 forces timelimit to 3 minutes" -> `src/commands.c:2894-2897` else branch `cvar_set("timelimit", "3"); // Set match length to 3 minutes`
  - "Quad Damage renamed 'OctaPower' on the in-world item entity" -> `src/items.c:2341` `self->netname = deathmatch == 4 ? "OctaPower" : "Quad Damage";` (super_damage item, classname `item_artifact_super_damage`)

- verify route: inline-self-check (Init_cmds shared root V-passed at Step 4; dmm4 is the canonical Sub-A row -- its handler and access class follow the cluster pattern; rules-change callee referenced from dead-CF_SPC_ADMIN race_set_finish prior trace)
- verify verdict: TRACED-CLEAN (13 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:qizmo | TRACED-CLEAN | rev=1 | seed-clause: "admin sub-commands" (WI-2 access-class) | new-clause: "the three listed sub-commands are themselves dual-path commands runnable by any in-game player or by admin spectators" (qizmo itself is CF_PLAYER only -- specs cannot run it)

### ktx:command:qizmo

- canonical_id: `ktx:command:qizmo`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - WI2-FIX: "admin sub-commands" overstates access. qlag/qenemy/qpoint are registered `CF_PLAYER | CF_SPC_ADMIN` at `src/commands.c:784-786`; handlers `ToggleQLag` / `ToggleQEnemy` / `ToggleQPoint` carry no admin check on the player path. They are dual-path commands (any player + admin-spec via Init_cmds promotion), not admin-only.
  - All three behavior clauses (prints help, lists three sub-commands, no state mutation) -> MATCH at seed cites.
  - Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_command_qizmo.md`.
  - NOTE: qizmo command itself at `src/commands.c:777` is `CF_PLAYER` ONLY (not CF_PLAYER | CF_SPC_ADMIN); the access class for /qizmo and for the sub-commands DIFFERS -- /qizmo is player-only, the sub-commands are dual-path.

- OLD description:
  > Prints, to the calling player's console, a short help listing of the three QiZmo-proxy admin sub-commands and what each does: qlag (lag settings), qenemy (enemy vicinity reporting), and qpoint (point function). It only displays this list; it changes no settings itself.

- NEW description:
  > Prints, to the calling player's console, a short help listing of the three QiZmo-proxy sub-commands and what each does: `qlag` (lag settings), `qenemy` (enemy vicinity reporting), and `qpoint` (point function). It only displays this list; it changes no settings itself. Runnable only by an in-game player (registered with `CF_PLAYER` alone -- a spectator hits `DO_WRONG_CLASS` at the dispatch class-gate). The three listed sub-commands are themselves dual-path commands runnable by any in-game player or by admin spectators (admin = rcon-set or elected via /elect); none of the three sub-command handlers carries an additional admin check on the player path.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. ShowQizmo handler at `src/commands.c:1585-1591` body is a single `G_sprint(self, 2, ...)` printing three labeled lines (qlag / qenemy / qpoint) with `redtext()`; no state mutation. Access class for /qizmo: registration `src/commands.c:777 { "qizmo", ShowQizmo, 0, CF_PLAYER, CD_QIZMO }` -- CF_PLAYER ONLY, no CF_SPC_ADMIN, no Init_cmds promotion fires; dispatch `:1091-1093` returns DO_WRONG_CLASS for any spec caller. Sub-command registrations at `src/commands.c:784-786` (qlag/qenemy/qpoint) all carry `CF_PLAYER | CF_SPC_ADMIN`; Init_cmds promotion `:1448-1450` adds CF_SPECTATOR; dispatch admits player branch unconditionally (`:1106`, no CF_PLR_ADMIN gate) and admin specs via `:1091/1096-1100` (CF_SPC_ADMIN gate calling `is_adm`). Tree-wide grep confirms no admin check inside the three sub-command handlers themselves.

- NEW source_ref: `src/commands.c:1585` (ShowQizmo handler entry -- authoritative behavior site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Prints to the calling player's console a short help listing" -> `src/commands.c:1587-1590` `G_sprint(self, 2, ...)` (self = caller, level 2 = console only)
  - "qlag (lag settings)" -> `src/commands.c:1588` `"%s....... lagsettings\n"` with `redtext("qlag")`
  - "qenemy (enemy vicinity reporting)" -> `src/commands.c:1589` `"%s..... enemy vicinity reporting\n"` with `redtext("qenemy")`
  - "qpoint (point function)" -> `src/commands.c:1590` `"%s..... point function\n"` with `redtext("qpoint")`
  - "It only displays this list; changes no settings" -> ShowQizmo body `src/commands.c:1585-1591` is solely G_sprint, no cvar / state mutation
  - "Runnable only by an in-game player (CF_PLAYER alone)" -> `src/commands.c:777 { "qizmo", ShowQizmo, 0, CF_PLAYER, CD_QIZMO }` (no CF_SPC_ADMIN)
  - "a spectator hits DO_WRONG_CLASS at the dispatch class-gate" -> `src/commands.c:1091-1093` `if (!(cmds[icmd].cf_flags & CF_SPECTATOR)) { return DO_WRONG_CLASS; }`
  - "three listed sub-commands are dual-path commands" -> `src/commands.c:784/785/786` qlag/qenemy/qpoint all `CF_PLAYER | CF_SPC_ADMIN` + Init_cmds promotion `:1448-1450` -> + CF_SPECTATOR
  - "runnable by any in-game player or by admin spectators" -> dispatch player branch `:1106` (no CF_PLR_ADMIN gate) + spec branch `:1091/1096-1100` (CF_SPC_ADMIN gate fires on `is_adm`)
  - "(admin = rcon-set or elected via /elect)" -> `src/admin.c:16-19` `is_adm` body
  - "none of the three sub-command handlers carries an additional admin check on the player path" -> `ToggleQLag` / `ToggleQEnemy` / `ToggleQPoint` at `src/commands.c:3686-3733` carry no `is_adm` check on the player path

- verify route: inline-self-check (Init_cmds shared root V-passed at Step 4; access-class divergence between qizmo and its sub-commands is the only deviation from the canonical Sub-A pattern, and it's grounded in distinct cmds[] entries at `src/commands.c:777` vs `:784-786`)
- verify verdict: TRACED-CLEAN (11 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:admin | TRACED-CLEAN | rev=1 | seed-clause: "or while an admin election is pending" (C-NEAR-MISS -- guard at `is_elected(self, etAdmin)` is SELF-scoped) | new-clause: "while the issuing client is themselves currently the subject of a pending admin election (a third party's pending admin election does not block the caller's /admin)"

### ktx:command:admin

- canonical_id: `ktx:command:admin`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "or while an admin election is pending" -> too broad. Guard at `src/admin.c:316-321 if (is_elected(self, etAdmin))` is SELF-scoped: `is_elected` callee at `src/vote.c:460-462 return (p->v.elect_type == et);` returns true ONLY when the passed-in player is the elect-subject. A third party's pending admin election does NOT block self's /admin.
  - All seven other behavior clauses (manage self, no-arg branches, k_admincode + delay, VIP grant, k_admins refuse) -> MATCH at seed cites.
  - Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_command_admin.md`.

- OLD description:
  > Manages the issuing client's admin status. With no argument: if already admin, relinquishes admin; if an admin-code entry is in progress, cancels it; otherwise begins admin-code entry (enter the code via the number/impulse commands), or grants admin immediately for a VIP flagged as admin. With one argument: treats it as the admin password (k_admincode) and grants admin if it matches, with a brief anti-brute-force delay between attempts. Refuses if no admins are configured on the server (k_admins) or while an admin election is pending.

- NEW description:
  > Manages the issuing client's admin status. With no argument: if already admin, relinquishes admin; if an admin-code entry is in progress, cancels it; otherwise begins admin-code entry (enter the code via the number / impulse commands), or grants admin immediately for a VIP flagged as admin. With one argument: treats it as the admin password (`k_admincode`) and grants admin if it matches, with a brief anti-brute-force delay (5 seconds) between attempts. Refuses if no admins are configured on the server (`k_admins` is unset), or while the issuing client is themselves currently the subject of a pending admin election (a third party's pending admin election does not block the caller's /admin -- the guard is SELF-scoped).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. ReqAdmin handler at `src/admin.c:313-394` operates on `self`. Registration `src/commands.c:750 CF_BOTH | CF_MATCHLESS | CF_PARAMS` -- CF_BOTH = CF_PLAYER | CF_SPECTATOR (`include/g_local.h:649`), no CF_*_ADMIN gate, no Init_cmds promotion fires; CF_MATCHLESS admits usage outside a live match (dispatch gate `src/commands.c:1078`). Branch order: pending-self-election guard `:316-321 if (is_elected(self, etAdmin)) { "Abort election first"; return; }`; already-admin relinquish `:323-336`; in-progress code cancel `:339-345`; no-admins refuse `:347-352 if (!cvar("k_admins")) { "NO admins on this server!"; return; }`; VIP fast-grant `:354-359 if (VIP_IsFlags(self, VIP_ADMIN)) { BecomeAdmin(self, AF_REAL_ADMIN); return; }`; one-arg password path `:362-379` with anti-brute-force `:366-372` (5-second wait window from `self->k_adm_lasttime`) and `:383 self->k_adm_lasttime = g_globalvars.time;`; no-arg admin-code start `:389-393 self->k_adminc = 6; "Use numbers or impulses to enter code"`. C-NEAR-MISS corrected via callee-follow on `is_elected`: body at `src/vote.c:460-462 qbool is_elected(gedict_t *p, electType_t et) { return (p->v.elect_type == et); }` -- the guard at `admin.c:316` fires ONLY when `self->v.elect_type == etAdmin`, i.e. self is the election subject; a third party's etAdmin election leaves self->v.elect_type untouched.

- NEW source_ref: `src/admin.c:313` (ReqAdmin handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Manages the issuing client's admin status" -> `src/admin.c:313-394` ReqAdmin operates on `self`; registration `src/commands.c:750 CF_BOTH | CF_MATCHLESS | CF_PARAMS` admits both classes, usable outside match
  - "if already admin, relinquishes admin" -> `src/admin.c:323-336` `if (is_adm(self)) { ... self->k_admin = 0; on_unadmin(self); return; }`
  - "if an admin-code entry is in progress, cancels it" -> `src/admin.c:339-345` `if (self->k_adminc) { ... self->k_adminc = 0; return; }` with "code canceled"
  - "begins admin-code entry (number / impulse commands)" -> `src/admin.c:389-393` `self->k_adminc = 6; ... "Use numbers or impulses to enter code"`
  - "grants admin immediately for a VIP flagged as admin" -> `src/admin.c:354-359` `if (VIP_IsFlags(self, VIP_ADMIN)) { BecomeAdmin(self, AF_REAL_ADMIN); return; }`
  - "one argument: treats it as the admin password (k_admincode)" -> `src/admin.c:362-379` argc==2 branch reading `cvar_string("k_admincode")`
  - "grants admin if it matches" -> `src/admin.c:378` `BecomeAdmin(self, AF_REAL_ADMIN);` on `streq(arg_2, pass)` match
  - "brief anti-brute-force delay (5 seconds) between attempts" -> `src/admin.c:366-372` `int till = Q_rint(self->k_adm_lasttime + 5 - g_globalvars.time); if (self->k_adm_lasttime && (till > 0)) { "Wait %d second%s" return; }` + `:383 self->k_adm_lasttime = g_globalvars.time;`
  - "Refuses if no admins are configured (k_admins unset)" -> `src/admin.c:347-352` `if (!cvar("k_admins")) { "NO admins on this server!"; return; }`
  - "or while the issuing client is themselves currently the subject of a pending admin election" -> `src/admin.c:316-321` `if (is_elected(self, etAdmin)) { "Abort election first"; return; }` + callee `src/vote.c:460-462 return (p->v.elect_type == et);` (SELF-scoped)
  - "a third party's pending admin election does not block the caller's /admin" -> logical consequence of `is_elected` checking only `p->v.elect_type` (the passed-in player's own field), not a tree-wide elect state

- verify route: inline-self-check (callee-follow performed on `is_elected` -- the only C-NEAR-MISS clause; access class CF_BOTH is the simple no-promotion case)
- verify verdict: TRACED-CLEAN (11 clauses, all MATCH; callee body followed for is_elected)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_vp_admin | TRACED-CLEAN | rev=1 | seed-clause: (a) "(the /admin vote)" command-name slip (b) "ceil(percent/100 * (players minus bots))" omits max(2,...) floor | new-clause: "the /elect vote that promotes the caller to admin via VoteAdmin (NOT /admin)"; "max(2, ceil(percent/100 * (players minus bots)))" with explicit minimum-vote floor

### ktx:cvar:k_vp_admin

- canonical_id: `ktx:cvar:k_vp_admin`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS (a): "(the /admin vote)" -> MISMATCH. The admin election is created by `VoteAdmin` bound to `/elect` (`src/commands.c:800`), which sets `self->v.elect_type = etAdmin` at `src/admin.c:530`. The `/admin` command (`src/commands.c:750 ReqAdmin`) is the password / VIP-grant self-promotion path and never sets `elect_type`. Minor command-name slip; core semantic still correct.
  - C-NEAR-MISS (b): "ceil(percent/100 * (players minus bots))" -> MISMATCH. The stated formula omits `vote.c:367-369 else if (fofs == OV_ELECT) { vt_req = max(2, vt_req); }`; real required count is `max(2, ceil(...))`.
  - All other clauses (percent threshold, 51/100 clamp, election passes on majority) -> MATCH at seed cites.
  - Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_cvar_k_vp_admin.md`.

- OLD description:
  > The percentage of eligible voters required to pass an admin election (the /admin vote). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)); when enough players vote for admin, the election passes.

- NEW description:
  > The percentage of eligible voters required to pass an admin election -- the `/elect` vote that promotes the caller to admin via `VoteAdmin` (NOT the `/admin` command, which is the password / VIP-grant self-promotion path and is unrelated to the election). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is `max(2, ceil(percent/100 * (players minus bots)))` -- the percent term is the primary scaling factor, but every `/elect` election (admin, captain, coach, etc.) applies a minimum-vote floor of 2 regardless of player count. When enough players vote for admin, the election passes.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. k_vp_admin is read at `src/vote.c:270-274 case OV_ELECT: if ((el_type = get_elect_type()) == etAdmin) { percent = cvar("k_vp_admin"); break; }` -- only when the active election is etAdmin. Election creation: registration `src/commands.c:800 { "elect", VoteAdmin, 0, CF_BOTH | CF_MATCHLESS, CD_ELECT }`; handler `src/admin.c:450 void VoteAdmin(void)` sets `:530 self->v.elect_type = etAdmin;` (passes through the standard vote-cast machinery). C-NEAR-MISS (a) corrected: `/admin` is `src/commands.c:750 { "admin", ReqAdmin, ... }` -- the ReqAdmin handler at `src/admin.c:313-394` never sets `elect_type`; it is the password / VIP-grant self-promotion path. Percent clamp at `src/vote.c:330 percent = bound(0.51, bound(51, percent, 100) / 100, 1);` (with `bound` at `src/g_utils.c:351-354`) -- inner `bound(51, percent, 100)` clamps to [51, 100]; outer enforces the 0.51 bottom after /100. Vote count base at `:343 vt_req = ceil(percent * (CountPlayers() - CountBots()));`. C-NEAR-MISS (b) corrected via `:367-369 else if (fofs == OV_ELECT) { vt_req = max(2, vt_req); }` -- the OV_ELECT case covers etAdmin/etCaptain/etCoach/etSuggestColor/etLateJoin elections; the floor is universal across the `/elect` family. Bot-bias correction at `:430 return max(0, vt_req - CountBots());`. Election pass check via `:159` finalize path (per seed).

- NEW source_ref: `src/vote.c:273` (the `cvar("k_vp_admin")` read site in OV_ELECT/etAdmin case -- authoritative for k_vp_admin's role)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "percentage of eligible voters required to pass an admin election" -> `src/vote.c:270-274` case OV_ELECT etAdmin -> `percent = cvar("k_vp_admin");`
  - "the /elect vote that promotes the caller to admin via VoteAdmin" -> `src/commands.c:800` `{ "elect", VoteAdmin, ... }` + handler `src/admin.c:450` + `src/admin.c:530 self->v.elect_type = etAdmin;`
  - "NOT the /admin command, which is the password / VIP-grant self-promotion path" -> `src/commands.c:750 { "admin", ReqAdmin, ... }` + ReqAdmin at `src/admin.c:313-394` (never assigns to `v.elect_type`)
  - "Expressed as a whole-number percentage" -> read via `cvar()` returns the numeric value of the cvar string (any non-numeric clamps via the bound chain below)
  - "effective value is floored at 51 and capped at 100" -> `src/vote.c:330` `percent = bound(0.51, bound(51, percent, 100) / 100, 1);` (with `bound` body `src/g_utils.c:351-354`)
  - "values below 51 behave as 51" -> same `src/vote.c:330` (inner clamp)
  - "required vote count is max(2, ceil(percent/100 * (players minus bots)))" -> `src/vote.c:343` `vt_req = ceil(percent * (CountPlayers() - CountBots()));` (percent already /100 at :330) + `src/vote.c:367-369` `else if (fofs == OV_ELECT) { vt_req = max(2, vt_req); }`
  - "every /elect election (admin, captain, coach, etc.) applies a minimum-vote floor of 2" -> `src/vote.c:367-369` (OV_ELECT covers etAdmin/etCaptain/etCoach/etSuggestColor/etLateJoin)
  - "when enough players vote for admin, the election passes" -> `src/vote.c:159` `if ((votes = get_votes_req(OV_ELECT, true)))` gating the do_elect finalize path

- verify route: inline-self-check (cluster Sub-B max(2,...) floor V-passed at Step 4; the /admin vs /elect command-name slip is purely a documentation precision fix, traced to two distinct cmds[] entries `:800` vs `:750` with distinct handlers)
- verify verdict: TRACED-CLEAN (9 clauses, all MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_vp_antilag | TRACED-CLEAN | rev=1 | seed-clause: "ceil(percent/100 * (players minus bots))" omits max(2,...) floor | new-clause: "max(2, ceil(percent/100 * (players minus bots)))" with explicit minimum-vote floor + sv_antilag 0/2 toggle citation

### ktx:cvar:k_vp_antilag

- canonical_id: `ktx:cvar:k_vp_antilag`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "ceil(percent/100 * (players minus bots))" -> MISMATCH. Omits `src/vote.c:411-413 else if (fofs == OV_ANTILAG) { vt_req = max(2, vt_req); }`; real required count is `max(2, ceil(...))`.
  - Other clauses (percent threshold, /antilag toggles sv_antilag, 51/100 clamp) -> MATCH at seed cites.
  - Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_cvar_k_vp_antilag.md`.

- OLD description:
  > The percentage of eligible voters required to pass an antilag vote (the /antilag command, which toggles the server's lag-compensation mode). Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is ceil(percent/100 * (players minus bots)).

- NEW description:
  > The percentage of eligible voters required to pass an antilag vote -- the `/antilag` command casts a vote that, on pass, toggles `sv_antilag` between `0` and `2` (lag-compensation off / on) via `vote_check_antilag`. Expressed as a whole-number percentage; the effective value is floored at 51 and capped at 100, so values below 51 behave as 51. The required vote count is `max(2, ceil(percent/100 * (players minus bots)))` -- the percent term is the primary scaling factor, but the antilag vote applies a minimum-vote floor of 2 regardless of player count.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. k_vp_antilag is read at `src/vote.c:321-322 case OV_ANTILAG: percent = cvar("k_vp_antilag");`. Vote casting: registration `src/commands.c:722 { "antilag", antilag, ... }`; handler `src/vote.c:1413 void antilag(void)` casts the vote (`self->v.antilag` flip + `G_bprint` announce) then calls `vote_check_antilag` at `:1447`. Tally + toggle: `src/vote.c:1373 void vote_check_antilag(void)` evaluates the vote and, on pass, `:1394 trap_cvar_set_float("sv_antilag", (float)(cvar("sv_antilag") ? 0 : 2));` -- toggle between 0 (off) and 2 (on). Percent clamp at `:330` (same `bound(0.51, bound(51, percent, 100) / 100, 1)` chain as k_vp_admin). Vote count base at `:343`. C-NEAR-MISS corrected via `:411-413 else if (fofs == OV_ANTILAG) { vt_req = max(2, vt_req); }`. Bot-bias correction at `:430`.

- NEW source_ref: `src/vote.c:322` (the `cvar("k_vp_antilag")` read site in OV_ANTILAG case -- authoritative for k_vp_antilag's role)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "percentage of eligible voters required to pass an antilag vote" -> `src/vote.c:321-322` case OV_ANTILAG -> `percent = cvar("k_vp_antilag");`
  - "/antilag command casts a vote that, on pass, toggles sv_antilag between 0 and 2" -> `src/commands.c:722 { "antilag", antilag, ... }` + handler `src/vote.c:1413 void antilag(void)` -> `:1447 vote_check_antilag();` -> `src/vote.c:1373 void vote_check_antilag(void)` -> `:1394 trap_cvar_set_float("sv_antilag", (float)(cvar("sv_antilag") ? 0 : 2));` (callee-follow)
  - "(lag-compensation off / on)" -> 0 / 2 semantics confirmed by adjacent announce strings at `src/vote.c:1400/1408 "Antilag mode %s ... OnOff(2 == cvar(\"sv_antilag\"))"`
  - "Expressed as a whole-number percentage" -> read via `cvar("k_vp_antilag")` returns the numeric value
  - "effective value is floored at 51 and capped at 100" -> `src/vote.c:330` `percent = bound(0.51, bound(51, percent, 100) / 100, 1);`
  - "values below 51 behave as 51" -> same `src/vote.c:330`
  - "required vote count is max(2, ceil(percent/100 * (players minus bots)))" -> `src/vote.c:343 vt_req = ceil(percent * (CountPlayers() - CountBots()));` + `src/vote.c:411-413 else if (fofs == OV_ANTILAG) { vt_req = max(2, vt_req); }`
  - "antilag vote applies a minimum-vote floor of 2 regardless of player count" -> `src/vote.c:411-413` (the OV_ANTILAG-specific floor)

- verify route: inline-self-check (cluster Sub-B max(2,...) floor V-passed at Step 4; the OV_ANTILAG floor at `:411-413` is the per-vote-type counterpart to the OV_ELECT floor at `:367-369`; callee-follow performed on antilag -> vote_check_antilag -> trap_cvar_set_float toggle)
- verify verdict: TRACED-CLEAN (8 clauses, all MATCH; callee chain followed for the sv_antilag 0/2 toggle)
- attempts: 1

---

B4-RESULT | ktx:cvar:lock_practice | TRACED-CLEAN | rev=1 | seed-clause: "0 = practice mode is automatically turned off when the match is reset" (C-NEAR-MISS -- trigger is G_ShutDown / level-change, not match-reset) | new-clause: "0 = practice mode is automatically cleared (SetPractice(0, NULL)) at the next level change or mod shutdown -- inside G_ShutDown, the engine's GAME_SHUTDOWN handler"

### ktx:cvar:lock_practice

- canonical_id: `ktx:cvar:lock_practice`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "0 = practice mode is automatically turned off when the match is reset" -> MISMATCH. The only lock_practice-gated auto-clear is at `src/g_main.c:521-523 if (!cvar("lock_practice") && k_practice) { SetPractice(0, NULL); ... }`, INSIDE `G_ShutDown` (the GAME_SHUTDOWN handler at `src/g_main.c:395-400 case GAME_SHUTDOWN: G_ShutDown();` with comment `// called before level change/spawn`). Trigger is a level change / mod shutdown, NOT a match reset; no KTX match-reset path reads `lock_practice`. Polarity (0 -> clears, non-0 -> persists) is correct; the stated trigger condition is wrong.
  - All other clauses (1 = allowed, 2 = locked, any-other = locked, no built-in default) -> MATCH at seed cites.
  - Seed scratch: `/tmp/b4-wi2-access-class/seed_ktx_cvar_lock_practice.md`.

- OLD description:
  > Controls whether practice mode can be toggled and whether it auto-clears. 0 = practice mode is automatically turned off when the match is reset; 1 = the practice-toggle command is allowed (practice mode persists across resets); 2 = the server is locked in its current practice mode and the practice-toggle command is refused. Any value other than 0, 1 or 2 is treated as locked (toggle refused). Registered with no built-in default.

- NEW description:
  > Controls whether practice mode can be toggled and whether it auto-clears across level changes. 0 = practice mode is automatically cleared (`SetPractice(0, NULL)`) at the next level change or mod shutdown -- the clear runs inside `G_ShutDown`, the engine's GAME_SHUTDOWN handler that fires before each level change or server reload (not on match reset specifically; the auto-clear coincides with match boundaries only because a level change typically separates matches). 1 = the practice-toggle command is allowed and practice mode persists across level changes (the auto-clear branch is skipped). 2 = the server is locked in its current practice mode and the practice-toggle command is refused with "console: command is locked". Any value other than 0, 1 or 2 is treated as locked (toggle refused). Registered with no built-in default (bare `RegisterCvar`).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Tree-wide grep of `lock_practice` (READ-sites): `src/g_main.c:521` auto-clear inside `G_ShutDown`; `src/client.c:3100` (level-change trigger in ClientDisconnect -- WRITE-side path, triggers a `changelevel` which routes to GAME_SHUTDOWN -> G_ShutDown -> g_main.c:521); `src/commands.c:4913-4927` TogglePractice (the toggle-permission gate); `src/race.c:297/318` (stuffcmd template strings, write-side). C-NEAR-MISS corrected via callee-follow on the trigger: `src/g_main.c:395-400 case GAME_SHUTDOWN: ClearGlobals(); G_ShutDown(); return 0;` with verbatim adjacent comment `// called before level change/spawn`. `G_ShutDown` body at `src/g_main.c:516+` first calls `AbortElect()`, then the lock_practice-gated auto-clear at `:521-523 if (!cvar("lock_practice") && k_practice) { SetPractice(0, NULL); // return server to normal mode }`, then end-match if `match_in_progress`. There is NO match-reset code path that reads `lock_practice`. TogglePractice at `src/commands.c:4913-4927` reads the cvar and gates: `:4916-4919` if match_in_progress, returns silently; `:4921-4927 if ((lock_practice == 2) || ((lock_practice != 0) && (lock_practice != 1))) { G_sprint(self, 3, "console: command is locked\n"); return; }` with adjacent comment `/* server locked in current practice mode */` and `/* unknown lock type, ignore command */`. Registered default at `src/world.c:851 RegisterCvar("lock_practice");` -- bare, no default arg (0/empty default).

- NEW source_ref: `src/g_main.c:521` (the auto-clear enforcing line -- authoritative behavior site for the corrected C-NEAR-MISS clause)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Controls whether practice mode can be toggled and whether it auto-clears across level changes" -> `src/commands.c:4913` (toggle read in TogglePractice) + `src/g_main.c:521` (auto-clear read in G_ShutDown)
  - "0 = practice mode is automatically cleared (SetPractice(0, NULL))" -> `src/g_main.c:521-523` `if (!cvar("lock_practice") && k_practice) { SetPractice(0, NULL); ... }` with adjacent comment `// return server to normal mode`
  - "at the next level change or mod shutdown" -> trigger is GAME_SHUTDOWN: `src/g_main.c:395-400 case GAME_SHUTDOWN: G_ShutDown();` with verbatim comment `// called before level change/spawn`
  - "the clear runs inside G_ShutDown, the engine's GAME_SHUTDOWN handler" -> `src/g_main.c:516+` G_ShutDown body, invoked from GAME_SHUTDOWN dispatch at `:397`
  - "fires before each level change or server reload" -> `src/g_main.c:396` verbatim adjacent comment `// called before level change/spawn`
  - "(not on match reset specifically)" -> tree-wide grep returns NO lock_practice read on any match-reset code path (only `g_main.c:521`, `client.c:3100`, `commands.c:4913`, race.c WRITE-sites)
  - "1 = the practice-toggle command is allowed" -> `src/commands.c:4921-4922` neither refuse condition holds for value 1 (lock_practice != 2 AND lock_practice == 1)
  - "and practice mode persists across level changes (the auto-clear branch is skipped)" -> contrapositive of `src/g_main.c:521` `if (!cvar("lock_practice")...)`: when lock_practice == 1 the auto-clear is skipped
  - "2 = the server is locked in its current practice mode and the practice-toggle command is refused with 'console: command is locked'" -> `src/commands.c:4921-4927` `if ((lock_practice == 2) ... ) { G_sprint(self, 3, "console: command is locked\n"); return; }` with adjacent comment `/* server locked in current practice mode */`
  - "Any value other than 0, 1 or 2 is treated as locked (toggle refused)" -> `src/commands.c:4922` `|| ((lock_practice != 0) && (lock_practice != 1))` -- same refuse-and-return branch, adjacent comment `/* unknown lock type, ignore command */`
  - "Registered with no built-in default (bare RegisterCvar)" -> `src/world.c:851 RegisterCvar("lock_practice");` -- single-arg form (no default value)

- verify route: inline-self-check (singleton; trigger callee-follow performed: GAME_SHUTDOWN dispatch -> G_ShutDown -> lock_practice-gated SetPractice(0, NULL); tree-wide grep confirmed no match-reset enforcing line)
- verify verdict: TRACED-CLEAN (11 clauses, all MATCH; callee chain followed for the GAME_SHUTDOWN -> G_ShutDown -> SetPractice trigger)
- attempts: 1

---

## Cluster summary

- **7 rows processed, 7 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** sample-verify 1 (`forcebreak`, dispatched Opus 4.7 MAX subagent, read-only, blind) + inline-self-check 6 (`dmm4`, `qizmo`, `admin`, `k_vp_admin`, `k_vp_antilag`, `lock_practice` -- terminal-applied enforce-trace per clause with callee-follow on `is_elected` (admin row), `vote_check_antilag` (k_vp_antilag row), and `GAME_SHUTDOWN -> G_ShutDown` (lock_practice row)).
- **Total synth dispatches:** 0 (lean v2: inline authoring replaces per-row Opus synth fan-out).
- **Total verify dispatches:** 1 (lean v2: ONE blind sample on the highest-variation access-class row; inline self-check on the other 6).
- **Sampled row:** `ktx:command:forcebreak` (Sub-A, CF_BOTH_ADMIN -- both dispatch branches require `is_adm`; the handler has THREE branches with DIFFERENT internal gates including the per-branch `self->ct != ctPlayer` guards; the C-FIX is on a structural per-branch interaction with class).
- **Sampled verifier verdict:** TRACED-CLEAN (10 clauses, all MATCH; per-clause table at `/tmp/b4-wi2-access-class/sample_verify_ktx_command_forcebreak.md`; verifier explicitly followed the callee chains for `is_adm`, `StopTimer`, and `EndMatch`).
- **Per-row attempts avg:** 1.0.

### Methodology gains captured

1. **Cluster-shared root re-V'd inline a second time (Init_cmds promotion).** Step 4 chased 2 falsifiable claims against the source oracle: (a) Init_cmds promotion at `commands.c:1443-1456` still holds at oracle 1.47-2-g67253dc (verbatim re-read confirmed); (b) tree-wide grep for `cf_flags` write-sites returns ONLY the three promotion lines (no clearing). The dmm4 V-pass seed's "CF_SPECTATOR is NOT set (CF_SPC_ADMIN is inert without CF_SPECTATOR)" is the SAME Init_cmds-blind gap the dead-CF_SPC_ADMIN cluster's initial drafting hit; the qizmo seed implicitly accounts for the promotion -- the seeds are internally inconsistent on the same mechanic, and Step 4 V-pass resolves the contradiction by re-confirming the dead-CF_SPC_ADMIN corrected reading. Authoring under the corrected root proceeded uniformly.

2. **Cross-sub-shape batch handled in one terminal.** B2 mixes three sub-shapes (Init_cmds-root commands, vote-threshold cvars, singleton G_ShutDown trigger) -- the lean v2 template amortizes a single source-of-truth understanding pass across all three. Sub-B's max(2, ...) floor required a separate V-pass at vote.c:367-369 + :411-413 (per-vote-type floors), independent of Sub-A's dispatch root, but the unified inline reading kept the cost flat.

3. **Singleton callee-follow on lock_practice -> GAME_SHUTDOWN -> G_ShutDown.** The C-NEAR-MISS corrected clause spans a dispatcher boundary (engine GAME_SHUTDOWN syscall -> mod handler `G_ShutDown` -> `SetPractice(0, NULL)`). Inline self-check followed the call chain: `g_main.c:395-400 case GAME_SHUTDOWN -> G_ShutDown() -> g_main.c:516+ body -> :521-523 lock_practice-gated SetPractice(0, NULL)`. Adjacent comments at `:396 // called before level change/spawn` and `:522 // return server to normal mode` anchor the corrected trigger framing.

4. **Forcebreak C-FIX exposed an asymmetric per-branch gate within a single handler.** The OLD's "Restricted to admins who are not playing" applied a single class-condition to the WHOLE handler, but the source has THREE branches with DIFFERENT gates: branches 1 + 2 (matchless-clear and countdown-cancel) gate on `ct != ctPlayer`, but branch 3 (live-match end-match, the primary path) does NOT. The C-FIX rewrite makes the per-branch asymmetry explicit, traceable per-branch. The blind verifier independently traced all three branches + followed callee chains for `is_adm`, `StopTimer`, and `EndMatch`, returning TRACED-CLEAN at rev=1.

### Token-cost observation (lean v2, B2 batch)

- Pre-reads (5 docs + decisions.md B4 slice + B5 prior batch ledger): ~28-32k input.
- Step 4 inline source-of-truth understanding (Init_cmds + dispatch + CF_* macros + vote.c formula + G_ShutDown chain + 7 seed reads + L1 state): ~25-30k input/output mixed.
- Per-row inline authoring (7 rows): ~15-20k output across all rows.
- Sample-verify subagent (forcebreak only): 57,728 total tokens (17 tool uses, 107.3s) per the subagent's own usage report.
- Sub-agent count: 1.
- Total terminal-side + subagent: ~110-130k input range; in line with the B2 MEDIUM-confidence projection (80-110k from the template's cost expectations; +20k for the Init_cmds re-V'd inline at Step 4).

