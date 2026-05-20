# B4 ledger -- wrong-mechanism-scope batch (B3, lean v2)

**Batch id:** `B3` (`wrong-mechanism-scope`)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Batch members:** 13 rows
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth contract. B5 Stage-2 change-report ledger per row.
**Prompt:** `b4-unique-rows-pass2-template-prompt.md` (Pass 2 lean v2
template for the unique-rows tail; BATCH_ID=3).
**Triage section:** `b4-unique-rows-triage-plan.md` -> Batch B3 (MEDIUM
confidence; "wrong mechanism on feature's own handler path"; per-row
seeds, no cluster-shared code site).

## Members

```
ktx:command:-scores                       C-FIX  (wrong mechanism: HUD-field repurpose)
ktx:command:commands                      C-FIX  (wrong scope: admin-only section gating)
ktx:command:effi                          C-FIX  (wrong mechanism: Race-mode delegation)
ktx:command:fragsdown                     C-FIX  (wrong magnitude in hoonymode)
ktx:command:shownick                      C-FIX  (wrong scope: CTF distinction; wrong output channel: console-text)
ktx:command:summary:frogbot:editor        C-FIX  (wrong output scope + conflated sibling commands)
ktx:command:togglequad:frogbot:std        C-FIX  (wrong subject: bot vs self)
ktx:cvar:_k_coachteam1                    C-FIX  (no write-site exists; "holds team name" fabricated)
ktx:cvar:_k_coachteam2                    C-FIX  (same as _k_coachteam1; paired family)
ktx:cvar:k_ctf_rune_bounce                C-FIX  (wrong mechanism: bit-2 governs tossrune cmd, not death-drop)
ktx:cvar:k_fbskill_wiggleframes           C-FIX  (wrong scope: deathmatch==4, not "/ duel"; duel disables wiggle)
ktx:cvar:k_freshteams_weapon_time         C-FIX  (wrong mechanism: no clamp on feature path)
ktx:cvar:k_hoonymode                      C-FIX  (wrong scope: not inert outside duel/team)
```

## Lean v2 shape note

This terminal runs the lean v2 template for B3 -- a heterogeneous batch
with MEDIUM confidence in the SHAPE pattern ("wrong mechanism on
feature's own handler path") but no single shared code site. Per the
B3 triage notes, Step 4 is a brief structural-fact preamble (the shape
pattern, not a shared code site); per-row authoring uses each row's
own V-pass seed as the per-row anchor. Step 6 sample-verify rotates
across ~2 highest-variation rows since there is no shared
force-multiplier to validate. Inline self-check covers the remaining
rows under the enforce-trace discipline + callee-follow.

## Pre-reads (loaded at session start)

- `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
  -- B1 method, classification enum, 2026-05-20 callee-follow amendment
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-triage-plan.md`
  -- B3 batch section (MEDIUM confidence; no shared code site)
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
  D7 Amendment 2026-05-19 (B1-B5) -- seeded re-synth contract
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-midair-minheight.md`
  -- lean v2 calibration shape (single terminal, inline authoring,
  ONE blind sample-verify subagent)
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-dead-spc-admin-cluster.md`
  -- v1 methodology evidence (Init_cmds halt, dropquad rev=3 callee-follow)

## Structural-fact preamble (Step 4)

The B3 batch hypothesis is a SHAPE pattern, NOT a shared code site
(triage plan: "no single shared code site -- Pass 2 uses per-row seeds
directly with no cluster-shared root V-pass step"). The shape:

- Every row carries at least one clause whose described mechanism /
  scope / output-channel / subject is wrong vs the code's actual
  enforcing line on the FEATURE'S OWN handler path.
- Common sub-shapes per the triage classification:
  (a) described effect is enforced on an ADJACENT feature's code path,
      not the feature's own handler (k_teamoverlay correct-by-accident
      pattern);
  (b) a cvar's described write-effect doesn't match what the actual
      write site produces (or, in this batch's coach-cvar case, no
      write site exists at all);
  (c) a command's attributed mechanism belongs to a sibling function
      that handles a different invocation context.

Per-row falsifiable claim, validated row-by-row at Step 5: the seed's
cited enforcing file:line contradicts the described
mechanism / scope / output / subject. Each authored clause must
enforce-trace to a located line (and follow callees per the 2026-05-20
amendment); no NEW flavour-C surfaces introduced in elaborations.

V-pass evidence for the SHAPE (not for a shared code site): all 13
seed citations independently produced by the V-pass (Stage-1, multiple
batches batch-01 through batch-08); the SHAPE classification matches
the seed-cited defects 13/13. Methodology assumption -- the per-row
seeds are the per-row anchors -- holds without a cluster-root V-pass
gate.

## C4 (non-negotiable)

- Read-only on the L1 database. No UPDATE / INSERT / schema change.
- No file writes outside this LEDGER + `/tmp/b4-wrong-mechanism-scope/`
  scratch.
- The V-pass seed is MANDATORY per row; never overridden in-terminal.
  Contested seed -> HALT + escalate.
- ELABORATION DISCIPLINE + callee-follow apply to every authored clause.
- Bounded 3 attempts per sampled row. No convergence -> HALT row,
  escalate, move on.

---

## Results

B4-RESULT | ktx:command:-scores | TRACED-CLEAN | rev=1 | seed-clause: "the server repurposes the player's HUD stat fields" + "the normal HUD returns" (HUD-field repurpose) | new-clause: sc_stats=0 stops Print_Scores from re-rendering the text scoreboard via G_centerprint; HUD stat fields are never touched

### ktx:command:-scores

- canonical_id: `ktx:command:-scores`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "While sc_stats is non-zero ... the server repurposes the player's HUD stat fields" -> MISMATCH; sc_stats only triggers Print_Scores which builds a text scoreboard via `G_centerprint` (`src/client.c:3575`); health/armor/ammo/STAT_* are never written. The only other sc_stats reads are the MOTD-suppression guard (`motd.c:46-52`) and the centerprint-clear path (`client.c:4320-4328`).
  - C-FIX: "-scores ends that state so the normal HUD/MOTD returns" -> MISMATCH on "normal HUD returns" (HUD fields were never altered to begin with); MATCH on the MOTD/centerprint-clear half.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command__scores.md`.

- OLD description:
  > Release half of the +scores/-scores press-and-release bind pair. Issuing it sets the invoking client's on-screen stats overlay state to off (hidden): the handler decrements its argument and writes the result to the client's sc_stats field, and -scores passes 1, yielding sc_stats = 0. While sc_stats is non-zero (held via +scores) the server repurposes the player's HUD stat fields and suppresses the MOTD; -scores ends that state so the normal HUD/MOTD returns. Takes no arguments.

- NEW description:
  > Release half of the +scores/-scores press-and-release bind pair. The shared handler decrements its argument and writes the result to the caller's `sc_stats` field; `-scores` passes 1 so `sc_stats` becomes 0 (`+scores` passes 2 so `sc_stats` becomes 1). While `sc_stats` is non-zero the server periodically re-renders the text-form scoreboard via `G_centerprint` (the on-screen centered "scores" overlay), and the MOTD think-cycle is suppressed so the centerprint slot is not contested. Setting `sc_stats` to 0 stops that periodic refresh, lets the MOTD think-cycle resume, and -- on the next client think after the timer settles -- triggers the centerprint-clear path so the overlay disappears. Other HUD fields (health, armor, ammo) are never written by this path; only the centerprint slot is involved. Takes no arguments.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `Sc_Stats` (`src/commands.c:4996-5002`): `on--; self->sc_stats = (int)on; self->sc_stats_time = g_globalvars.time;` -- the +/- bind argument is 2/1 from the cmds[] table (`commands.c:891-892`). Scoreboard render via `Print_Scores` gated at `src/client.c:3723-3727` on `sc_stats && sc_stats_time && (sc_stats_time <= time) && match_in_progress != 1 && !isRACE()`; Print_Scores at `src/client.c:3575` emits via `G_centerprint(self, "%s", buf)` and re-arms `sc_stats_time` at `:3573`. MOTD suppression at `src/motd.c:46-52` (`if (... sc_stats ...) nextthink+=1; return;`). Centerprint clear at `src/client.c:4320-4328` (when `sc_stats==0` the timer is zeroed, then if all overlay timers are idle `G_centerprint(self, "%s", "")` clears). Tree-wide grep of `sc_stats` (12 sites) confirms no STAT_*/HUD-field write; the only writes are by the handler itself and the timer field.

- NEW source_ref: `src/commands.c:5000` (handler write -- the authoritative behavior site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "shared handler decrements argument and writes to sc_stats" -> `src/commands.c:4996-5002`
  - "+scores passes 2, -scores passes 1" -> `src/commands.c:891-892` (cmds[] arg column)
  - "periodically re-renders text scoreboard via G_centerprint while sc_stats non-zero" -> `src/client.c:3723-3727` (gate) + `:3575` (centerprint)
  - "MOTD think suppressed while sc_stats non-zero" -> `src/motd.c:46-52`
  - "setting sc_stats to 0 stops the refresh" -> `src/client.c:3723` (gate becomes false)
  - "centerprint-clear path triggers when timer settles" -> `src/client.c:4320-4328`
  - "other HUD fields not written by this path" -> tree-wide grep on `sc_stats` (only writes are `commands.c:5000`, `client.c:3380`, `:3573`, `:4322`; no STAT_* writes)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (per-clause enforce-trace, callee-follow N/A -- no helper-mediated clauses)
- attempts: 1

---

B4-RESULT | ktx:command:fragsdown | TRACED-CLEAN | rev=1 | seed-clause: "or by 2 in any hoonymode" (magnitude-contradiction; FragsDown returns before AdjustFragLimit in hoonymode) | new-clause: fragsdown is a no-op in any hoonymode (refused with "No fraglimit in hoonymode")

### ktx:command:fragsdown

- canonical_id: `ktx:command:fragsdown`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "or by 2 in any hoonymode" -> MISMATCH at `src/commands.c:3053-3057`; FragsDown returns BEFORE reaching `AdjustFragLimit(-1)` whenever `isHoonyModeAny()` is true (the `isHoonyModeAny() ? 2 : 10` branch in `AdjustFragLimit` at `:3042` is unreachable from this command). The clause also self-contradicts the row's own "no effect ... in hoonymode" clause.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command_fragsdown.md`.

- OLD description:
  > Lowers the server fraglimit by 10 (or by 2 in any hoonymode), clamped to the allowed range. It has no effect during a match or in hoonymode (which has no fraglimit). As special cases a fraglimit of 1 drops directly to 0, and 0 stays at 0; if lowering would leave both fraglimit and timelimit at zero the change is rejected so at least one limit remains. The new fraglimit is announced to everyone.

- NEW description:
  > Lowers the server fraglimit by 10, clamped to the allowed range (1..100 outside hoonymode). It has no effect during a match (returns silently while one is in progress) and no effect in any hoonymode -- it prints "No fraglimit in hoonymode" and returns before any change is applied. As special cases a fraglimit of 1 drops directly to 0 (skipping the -10 step), and 0 stays at 0; if lowering would leave both fraglimit and timelimit at zero the change is rejected and the prior value restored, so at least one limit remains. When the change applies, the new fraglimit is announced to everyone with "Fraglimit set to <value>".

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. `FragsDown` (`src/commands.c:3047-3093`): in-match early-return at `:3049-3052`; hoonymode early-return with G_sprint "No fraglimit in hoonymode" at `:3053-3058`; fraglimit==1 special-case (`:3063-3067`) sets fraglimit=0; fraglimit==0 special-case (`:3068-3072`); else calls `AdjustFragLimit(-1)` (`:3075`). Callee `AdjustFragLimit` (`commands.c:3040-3045`): `fraglimit += delta * (isHoonyModeAny() ? 2 : 10)` (`:3042`) followed by `bound(isHoonyModeAny() ? 0 : 1, fraglimit, isHoonyModeDuel() ? 20 : 100)` (`:3044`) -- the hoony multiplier branch is unreachable from FragsDown because of the `:3053` early-return; the -10 magnitude is what actually applies. Reject-both-zero at `commands.c:3078-3082` restores `fl`. Broadcast at `commands.c:3090-3091`.

- NEW source_ref: `src/commands.c:3047` (handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "lowers fraglimit by 10" -> `src/commands.c:3075` (AdjustFragLimit(-1)) + `:3042` (`delta * 10` non-hoony branch -- the only reachable branch from FragsDown)
  - "clamped to 1..100 outside hoonymode" -> `src/commands.c:3044` (`bound(1, fraglimit, 100)` non-hoony branches)
  - "no effect during a match" -> `src/commands.c:3049-3052`
  - "no effect in any hoonymode; prints 'No fraglimit in hoonymode'" -> `src/commands.c:3053-3058`
  - "fraglimit of 1 drops directly to 0" -> `src/commands.c:3063-3067`
  - "0 stays at 0" -> `src/commands.c:3068-3072`
  - "rejected if both fraglimit and timelimit would be <=0; prior value restored" -> `src/commands.c:3078-3082`
  - "announced with 'Fraglimit set to <value>'" -> `src/commands.c:3090-3091`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (the only callee, AdjustFragLimit, traced; hoony branch within it is unreachable from this caller, established by the `:3053` early-return)
- attempts: 1

---

B4-RESULT | ktx:cvar:_k_coachteam1 | TRACED-CLEAN | rev=1 | seed-clause: "Internal mod-state cvar holding the team name that the first coach slot is bound to" + force-back-to-team-lock semantics (no write site exists; the read branch is unreachable for coaches) | new-clause: cvar is registered but never assigned by KTX; the only read sits in a captain-style team-lock branch whose `self->k_picked == 1` gate is unreachable from the coach flow, so the cvar has no observable effect at runtime

### ktx:cvar:_k_coachteam1

- canonical_id: `ktx:cvar:_k_coachteam1`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "holding the team name that the first coach slot is bound to" -> MISMATCH; tree-wide grep of `cvar_set`/`cvar_fset` for `coachteam` returns empty -- no source ever writes a team name into this cvar, so `cvar_string("_k_coachteam1")` always returns "" (the bare-`RegisterCvar` default).
  - C-FIX: "a spectating coach assigned to slot 1 (k_picked == 1) is locked to this team" -> MISMATCH; `self->k_picked` is assigned only by the captain flow (`captain.c:70`, `:106`, `:383`). Coaches set `self->k_coach` (`coach.c:211`, `client.c:486`, `spectate.c:111`), not `self->k_picked`. The `if (self->k_picked == 1)` branch (`g_userinfo.c:362`) is unreachable from the coach flow.
  - C-FIX: "any attempt to switch to a different team is rejected and the client is forced back to the stored team name" -> MISMATCH; (a) the branch is unreachable, and (b) `s2` would be "" if the branch were reached.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_cvar__k_coachteam1.md`.

- OLD description:
  > Internal mod-state cvar holding the team name that the first coach slot is bound to. When two coaches are active, a spectating coach assigned to slot 1 (k_picked == 1) is locked to this team: any attempt to switch to a different team is rejected and the client is forced back to the stored team name.

- NEW description:
  > Internal-only cvar registered by KTX (bare `RegisterCvar`, so the runtime default is empty) but never assigned anywhere in the KTX source. The single read site is inside `FixPlayerTeam` (`g_userinfo.c:362-364`), in a captain-style team-lock branch that requires `k_coaches == 2 && self->k_picked == 1`; the `k_picked` field is only set by the captain flow (`captain.c`), and coaches identify themselves via `self->k_coach` and are caught earlier by the `coach_num(self) || is_elected(self, etCoach)` gate at `g_userinfo.c:343-353` (which refuses team change and stuffs the client back to `getteam(self)`). The `k_picked == 1` branch that reads this cvar is therefore unreachable from the coach flow, and the cvar reads as "" regardless, so it has no observable effect on team-locking at runtime. The shape mirrors `_k_captteam1` (`captain.c:389`), but the corresponding coach write side was never ported, leaving this cvar registered-but-dormant.
- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration: `src/world.c:1027` `RegisterCvar("_k_coachteam1"); // internal mod usage` -- bare RegisterCvar yields empty default. No write site: tree-wide grep `cvar_set\|cvar_fset` for `coachteam` returns zero hits. Read site: `src/g_userinfo.c:362-364` inside `FixPlayerTeam` under `if (k_coaches == 2)` and `if (self->k_picked == 1)`. `k_picked` field assignments: `src/captain.c:70` `p->k_picked = capt_num(cap)`, `:106` `p->k_captain = p->k_picked = 0`, `:383` `p->k_picked = 0` -- all in the captain flow. Coach-identifier field is `self->k_coach`, set at `src/coach.c:211` `coach->k_coach = (p && coach_num(p) == 1) ? 2 : 1`. Earlier coach-trap branch at `src/g_userinfo.c:341-353` short-circuits any spec who is coach_num(self) OR is_elected(self, etCoach) with `stuffcmd_flags(...,"team \"%s\"\n", getteam(self))` -- this is the actual coach team-lock, sourced from the live team, not from the cvar. Analog with a real writer: `src/captain.c:389` `cvar_set(va("_k_captteam%d", capt_num(p)), getteam(p))` writes `_k_captteam{1,2}`; there is no `_k_coachteam{1,2}` analog.

- NEW source_ref: `src/world.c:1027` (registration -- the only definitional site for this cvar)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "registered by KTX (bare RegisterCvar -> empty default)" -> `src/world.c:1027`
  - "never assigned anywhere in the source" -> tree-wide grep `cvar_set\|cvar_fset.*coachteam` empty
  - "single read site inside FixPlayerTeam" -> `src/g_userinfo.c:362-364`
  - "the branch requires k_coaches==2 && self->k_picked==1" -> `src/g_userinfo.c:357,362`
  - "k_picked is assigned only by the captain flow" -> `src/captain.c:70,106,383`
  - "coaches identify via self->k_coach" -> `src/coach.c:211`, `src/client.c:486`, `src/spectate.c:111`
  - "earlier coach gate refuses team change" -> `src/g_userinfo.c:341-353`
  - "reads as '' regardless" -> bare RegisterCvar -> empty default + no writer
  - "captain analog has the write the coach side lacks" -> `src/captain.c:389`
- verify route: inline-self-check (paired-row partner of `_k_coachteam2`; sample-verify on the partner would not increase confidence since the structure is identical)
- verify verdict: TRACED-CLEAN (every clause enforce-traced; tree-wide grep used to certify "no writer")
- attempts: 1

---

B4-RESULT | ktx:cvar:_k_coachteam2 | TRACED-CLEAN | rev=1 | seed-clause: same defect as `_k_coachteam1` (paired family) | new-clause: same fix as `_k_coachteam1` for slot 2

### ktx:cvar:_k_coachteam2

- canonical_id: `ktx:cvar:_k_coachteam2`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: same defect pattern as `_k_coachteam1` -- no write site, the read branch is unreachable, and the cvar would read as "" if it were reached.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_cvar__k_coachteam2.md`.

- OLD description:
  > Internal mod-state cvar holding the team name that the second coach slot is bound to. When two coaches are active, a spectating coach assigned to slot 2 (k_picked == 2) is locked to this team: any attempt to switch to a different team is rejected and the client is forced back to the stored team name.

- NEW description:
  > Internal-only cvar registered by KTX (bare `RegisterCvar`, so the runtime default is empty) but never assigned anywhere in the KTX source. The single read site is the slot-2 arm of the same captain-style team-lock branch inside `FixPlayerTeam` (`g_userinfo.c:366-368`), under `k_coaches == 2 && self->k_picked == 2`; as with the slot-1 partner, `self->k_picked` is assigned only by the captain flow, coaches identify via `self->k_coach`, and the coach team-lock is enforced earlier at `g_userinfo.c:343-353` against the live team name (not against this cvar). The branch is therefore unreachable from the coach flow and the cvar reads as "" regardless, so it has no observable effect on team-locking at runtime. The companion `_k_coachteam1` is structurally identical; both shadow `_k_captteam{1,2}` (which the captain flow does write at `captain.c:389`) but were never wired to a coach-side writer.
- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration: `src/world.c:1028` `RegisterCvar("_k_coachteam2"); // internal mod usage`. No write site (tree-wide grep for `cvar_set|cvar_fset.*coachteam` returns zero hits). Read site: `src/g_userinfo.c:366-368` under `k_coaches == 2` and `self->k_picked == 2`. `k_picked` assignments captain-flow only (`captain.c:70,106,383`). Earlier coach trap at `g_userinfo.c:343-353` enforces the team-lock for any coach using `coach_num(self) || is_elected(self, etCoach)` against `getteam(self)`. Captain analog with a real writer at `captain.c:389`. Same record-pattern as `_k_coachteam1`.

- NEW source_ref: `src/world.c:1028` (registration -- the only definitional site for this cvar)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "registered (bare RegisterCvar -> empty default)" -> `src/world.c:1028`
  - "never assigned anywhere in the source" -> tree-wide grep empty
  - "single read site under k_coaches==2 && self->k_picked==2" -> `src/g_userinfo.c:366-368`
  - "k_picked is captain-flow only" -> `src/captain.c:70,106,383`
  - "coaches identify via self->k_coach" -> `src/coach.c:211`
  - "coach team-lock enforced earlier against live team name" -> `src/g_userinfo.c:341-353`
  - "captain analog writes _k_captteam{1,2}" -> `src/captain.c:389`
- verify route: inline-self-check (paired with `_k_coachteam1`; structure-identical)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:commands | TRACED-CLEAN | rev=1 | seed-clause: "admin commands the caller cannot use are omitted" (no is_adm(self) gate in Do_ShowCmds; isCmdRequireAdmin tests the command's flags, not the caller) | new-clause: both common and admin sections are printed for every caller; the admin/common split is by command-class only

### ktx:command:commands

- canonical_id: `ktx:command:commands`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "admin commands the caller cannot use are omitted" -> MISMATCH at `src/commands.c:1478,1483`. `Do_ShowCmds` skips a command on `!isValidCmdForClass` (wrong class) and partitions on `adm_req != isCmdRequireAdmin` (the command's own admin-ness), but never calls `is_adm(self)`. `ShowCmds` invokes `Do_ShowCmds(false)` then `Do_ShowCmds(true)` so every caller, admin or not, sees BOTH the common and admin sections.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command_commands.md`.

- OLD description:
  > Prints to the caller the list of KTX server commands they may use, split into a common-commands section and an admin-commands section, each labelled for the caller's role (player or spectator). Each line shows the command name and its one-line description; commands with no description, commands not valid for the caller's class, and admin commands the caller cannot use are omitted. An optional argument filters the list to command names containing that substring.

- NEW description:
  > Prints to the caller the full KTX server-command list, in two sections: a common-commands section followed by an admin-commands section, each labelled with the caller's class ("common commands for player" or "common commands for spectator", then "admin commands for ..."); both sections are emitted for every caller, including non-admin callers (there is no per-caller admin-rights filter -- the split is by the command's own admin-class flag, not by who is asking). Each line shows the command name and its one-line description. Commands with no description and commands not valid for the caller's class (`isValidCmdForClass`: wrong player/spec class, or matchless-mode commands when no match is running) are omitted from both sections. An optional argument filters the list to command names containing that substring.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration `src/commands.c:702` `{ "commands", ShowCmds, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_COMMANDS }`. Handler `ShowCmds` (`commands.c:1507-1511`) calls `Do_ShowCmds(false)` then `Do_ShowCmds(true)` -- both sections unconditionally. Inside `Do_ShowCmds` (`commands.c:1460-1505`): substring filter from `trap_CmdArgv(1,...)` at `:1467` + `:1488`; description-empty skip at `:1473-1476`; class-validity skip at `:1478-1481` (callee `isValidCmdForClass` at `commands.c:1288`); admin-class PARTITION at `:1483-1486` (`adm_req != isCmdRequireAdmin(i, ...)`, where `isCmdRequireAdmin` at `commands.c:1325` tests the command's CF_* flags, NOT `is_adm(self)`). Header at `:1497-1499` `"%s commands for %s:"` with redtext labels. Body line at `:1503` `"%s%s %s\n"` (name, dots, description). Tree-wide grep `is_adm.*ShowCmds|Do_ShowCmds.*is_adm` returns empty -- confirms no caller-rights check in this path.

- NEW source_ref: `src/commands.c:1507` (handler entry ShowCmds)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "two sections: common then admin, each labelled by class" -> `src/commands.c:1509-1510` + `:1497-1499`
  - "both sections emitted for every caller; no per-caller admin-rights filter" -> `src/commands.c:1507-1511` (unconditional pair) + `src/commands.c:1483` (callee `isCmdRequireAdmin` reads command flags only, no `is_adm(self)`)
  - "name and one-line description per line" -> `src/commands.c:1503`
  - "no-description commands omitted" -> `src/commands.c:1473-1476`
  - "class-invalid commands omitted (incl. matchless gating)" -> `src/commands.c:1478-1481` + callee `isValidCmdForClass` at `commands.c:1288`
  - "optional argument filters by substring" -> `src/commands.c:1467` + `:1488`
- verify route: inline-self-check (callee `isCmdRequireAdmin` followed; callee body confirmed to test command flags, not caller)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:effi | TRACED-CLEAN | rev=1 | seed-clause: "In Race / Rocket Arena it instead shows that mode's own stats listing" (Race half wrong; PlayerStats has no isRACE() branch) | new-clause: Rocket-Arena delegates to ra_PlayerStats; Race mode falls through to the standard table or the "no game - no statistics" guard

### ktx:command:effi

- canonical_id: `ktx:command:effi`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "In Race / Rocket Arena it instead shows that mode's own stats listing" -> Rocket-Arena half MATCH (`commands.c:3564-3568` delegates to `ra_PlayerStats`); Race half MISMATCH -- `PlayerStats` has NO `isRACE()` branch; in Race mode, `isRA()` is false (it requires `isDuel() && cvar("k_rocketarena")`), and the function either prints the standard per-player table (if a match is in progress) or falls through to "no game - no statistics" (if not). The race-specific listing `race_match_stats` (`race.c:5423`) is invoked only from `MatchEndStats` (`stats.c:1694`), not from this command.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command_effi.md`.

- OLD description:
  > Prints a per-player statistics table to the player who runs it: each player's name, frags, rank (frags minus deaths), friendly kills (in team modes), and efficiency, grouped by team. Only available while a game is actually in progress (otherwise it replies "no game - no statistics"). In Race / Rocket Arena it instead shows that mode's own stats listing.

- NEW description:
  > Prints a per-player statistics table to the caller: each player's name, frags, rank (frags minus deaths, with capture points subtracted in CTF), friendly kills (in team modes only), and efficiency, grouped by team. Only available while a game is actually in progress (`match_in_progress == 2`); otherwise it replies "no game - no statistics" and emits nothing. In Rocket Arena it delegates to that mode's own listing (`ra_PlayerStats`, which prints Name / Frags / Wins / Loses / Effi) and skips the standard table. Race mode is NOT specially branched -- in Race the command prints the standard table if a match is in progress, or returns "no game - no statistics" if not; the dedicated race scoring listing is shown only by the automatic end-of-match flow, not by this command.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration `commands.c:705` `{ "effi", PlayerStats, 0, CF_BOTH | CF_MATCHLESS, CD_EFFI }`. Handler `PlayerStats` (`commands.c:3558-...`): RA delegate at `:3564-3568` `if (isRA()) { ra_PlayerStats(); return; }` (callee `isRA` at `arena.c:130-133` is `isDuel() && cvar("k_rocketarena")`; `ra_PlayerStats` at `arena.c:706+` prints Name/Frags/Wins/Loses/Effi). Match-state guard at `:3571-3575` `if (match_in_progress != 2) { G_sprint(... "no game - no statistics") }`. Header at `:3591-3594` with `isTeam() ? redtext("friendkills ")`. Per-team loop at `:3577-3613` (`k_flag` marks served; team filter at `:3611`). Per-player columns: netname (`:3625`); frags / CTF frags-captures (`:3631-3634`); rank / CTF rank (`:3636-3641`); friendkills under `isTeam()` (`:3643-3647`); efficiency (`:3673-3674`). Tree-wide grep of `PlayerStats|isRACE` in commands.c around the handler returns no `isRACE()` branch in PlayerStats -- the absence is itself the enforce-trace for "Race not specially branched". `race_match_stats` callers: `stats.c:1694` (MatchEndStats), `race.c:5423` (definition); no path from the `effi` command into either.

- NEW source_ref: `src/commands.c:3558` (handler entry PlayerStats)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "per-player table: name, frags, rank, friendkills (team only), efficiency, grouped by team" -> `src/commands.c:3625` (name), `:3631-3641` (frags + rank with CTF adjustment), `:3643-3647` (friendkills under isTeam), `:3673-3674` (efficiency), `:3577-3613` (per-team loop)
  - "only while match_in_progress == 2; otherwise 'no game - no statistics'" -> `src/commands.c:3571-3575`
  - "Rocket Arena delegates to ra_PlayerStats" -> `src/commands.c:3564-3568` -> callee `arena.c:706+`
  - "Race mode NOT specially branched in this command" -> structural absence (grep of `PlayerStats` body shows no `isRACE` between `:3558` and `:3700`); `race_match_stats` callers `stats.c:1694` only (end-of-match flow)
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN (callee `ra_PlayerStats` body confirmed to print Name/Frags/Wins/Loses/Effi; the absence of `isRACE` in `PlayerStats` is the load-bearing structural fact, established by tree-wide grep)
- attempts: 1

---

B4-RESULT | ktx:command:summary:frogbot:editor | TRACED-CLEAN | rev=1 | seed-clause: "a list of all placed markers" + "aggregate counts of markers per goal and per zone" (output scope wrong + sibling commands conflated) | new-clause: prints only flagged markers (no-paths and/or no-zone) plus a single marker total; per-goal and per-zone aggregates are separate sibling commands (goalsummary / zonesummary)

### ktx:command:summary:frogbot:editor

- canonical_id: `ktx:command:summary:frogbot:editor`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "a list of all placed markers" -> MISMATCH at `src/bot_commands.c:2118-2127`; only markers with `path_count == 0` or `!fb.Z_` get a printed line. The marker totals are counted internally (`marker_count` at `:2109`) but each marker is not enumerated.
  - C-FIX: "aggregate counts of markers per goal and per zone" -> MISMATCH at `src/bot_commands.c:2141`; only `marker_count` is printed. `goal_count[]` and `zone_count[]` are populated at `:2131,:2136` but never emitted. Per-goal aggregates live in the separate `goalsummary` sibling command (`FrogbotGoalSummary` at `:1924`); per-zone aggregates in `zonesummary` (`FrogbotZoneSummary` at `:1949`).
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command_summary_frogbot_editor.md`.

- OLD description:
  > Frogbot waypoint-editor diagnostic. Prints a summary of the current map's bot routing data to the requesting player: a list of all placed markers, flagging any marker that has no paths and/or no assigned zone, followed by aggregate counts of markers per goal and per zone. Used while editing bot navigation to find unconnected or unconfigured markers.

- NEW description:
  > Frogbot waypoint-editor diagnostic, available only while the bot editor mode is on (`FB_OPTION_EDITOR_MODE`). Prints a summary of the current map's bot-routing markers to the requesting player. Output: a "Marker summary:" header, then one line for EACH MARKER THAT HAS PROBLEMS -- the index, classname, and a tag indicating "no paths" (when the marker has zero outbound paths) and/or "no zone" (when the marker has not been assigned a zone) -- followed by a final "<N> markers in total" line. Markers that are fully configured (have paths and a zone) are NOT enumerated; only the problem markers are listed. The per-goal and per-zone aggregate counts are computed internally but are NOT emitted here -- they are produced by the sibling editor commands `goalsummary` and `zonesummary` respectively. Used while editing bot navigation to find unconnected or unconfigured markers.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration `src/bot_commands.c:2348` in `editor_commands[]` (frogbot_cmd_t array; entry shape verified at struct def `:2308-2313`). Editor-mode gate `FrogbotsCommand` (`bot_commands.c:2383-2389`): `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands`. Handler `FrogbotSummary` (`bot_commands.c:2093-2142`): header at `:2102` "Marker summary:"; per-marker loop `:2103-2138`; flagged-only line at `:2118-2121` (no-paths branch with optional " and no zone" suffix) and `:2123-2126` (no-zone-only branch); `goal_count[]`/`zone_count[]` incremented at `:2129-2137` but never printed by this function; total "<N> markers in total" at `:2141`. Siblings: `FrogbotGoalSummary` (`:1924`, registered `:2349` as "goalsummary", "Show summary of goals"); `FrogbotZoneSummary` (`:1949`, registered `:2350` as "zonesummary", "Show summary of zones") -- both in `editor_commands[]`.

- NEW source_ref: `src/bot_commands.c:2093` (handler entry FrogbotSummary)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "waypoint-editor diagnostic; editor-mode-gated" -> `src/bot_commands.c:2386` (FrogbotsCommand editor/std picker) + `:2348` (entry in editor_commands)
  - "'Marker summary:' header" -> `src/bot_commands.c:2102`
  - "per problem-marker line: index, classname, 'no paths' and/or 'no zone'" -> `src/bot_commands.c:2118-2121` + `:2123-2126`
  - "final 'N markers in total' line" -> `src/bot_commands.c:2141`
  - "fully-configured markers not enumerated" -> structural; the per-marker emit is gated on `if (path_count == 0)` or `else if (!fb.Z_)` (`:2118,:2123`); no else-branch prints the marker
  - "goal_count[] and zone_count[] computed internally but not emitted here" -> `src/bot_commands.c:2129-2137` (computation) + absence of any further G_sprint after `:2141`
  - "per-goal aggregate in sibling 'goalsummary' (FrogbotGoalSummary)" -> `src/bot_commands.c:1924` + registration `:2349`
  - "per-zone aggregate in sibling 'zonesummary' (FrogbotZoneSummary)" -> `src/bot_commands.c:1949` + registration `:2350`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:togglequad:frogbot:std | TRACED-CLEAN | rev=1 | seed-clause: "on the bot itself" + "affects only the calling bot, not human players" (subject is `self` = command issuer; no isBot guard) | new-clause: handler operates on the command's caller (self), so an admin running it grants/removes quad on themselves; no isBot redirect or guard exists

### ktx:command:togglequad:frogbot:std

- canonical_id: `ktx:command:togglequad:frogbot:std`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "on the bot itself" / "affects only the calling bot, not human players" -> MISMATCH at `src/bot_commands.c:2232-2243`. `FrogbotsToggleQuad` operates on `self` (the command issuer). `FrogbotsCommand` dispatches with no isBot/ctBot guard and no `self->bot` redirect, so a human admin running `botcmd togglequad` toggles quad on themselves. (Orchestrator HG2 re-grep confirmed body + zero isBot/ctBot guard.)
  - C-FIX (secondary): "Frogbot debug subcommand" -> MISMATCH (mislabel; the entry sits in `std_commands[]` at `:2327`, not under the `debug` subcommand).
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command_togglequad_frogbot_std.md`.

- OLD description:
  > Frogbot debug subcommand (invoked as 'botcmd togglequad'). Toggles the quad-damage powerup on the bot itself: if the bot currently holds quad it is removed (quad item flag cleared, super-damage timer zeroed); otherwise quad is granted with an effectively unlimited duration (super-damage expiry set ~20 hours out). Gated by the frogbot admin-permission cvar like other botcmd subcommands; affects only the calling bot, not human players.
- NEW description:
  > Frogbot standard botcmd subcommand (invoked as `botcmd togglequad`). Toggles the quad-damage powerup on the CALLER (i.e. on `self`, the command issuer) -- there is no isBot guard or self->bot redirect, so the handler operates on whoever invokes it: a human admin running it grants or clears quad on themselves, not on any bot. If the caller currently holds quad (`s.v.items & IT_QUAD`) the flag is cleared and `super_time` + `super_damage_finished` are zeroed; otherwise the IT_QUAD flag is set, `super_time = 1`, and `super_damage_finished = time + 3600 * 20` (~20-hour expiry, effectively unlimited). Gated -- like every other `botcmd` subcommand -- by the frogbot admin-permission cvar `FB_CVAR_ADMIN_ONLY` checked in `FrogbotsCommand` (with `is_real_adm` required if the cvar is 2, otherwise `is_adm` if the cvar is non-zero).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration `src/bot_commands.c:2327` `{ "togglequad", FrogbotsToggleQuad, "Toggle quad damage" }` in `std_commands[]` (array def `:2315-...`). Dispatcher `FrogbotsCommand` (`bot_commands.c:2383`): the std/editor picker at `:2386` (`FB_OPTION_EDITOR_MODE`), then the admin gate at `:2392-2405` (`FB_CVAR_ADMIN_ONLY`: ==2 -> `is_real_adm(self)`; non-zero -> `is_adm(self)`); no isBot/ctBot guard anywhere on the path. Handler body `FrogbotsToggleQuad` (`bot_commands.c:2232-2243`): `if ((int)self->s.v.items & IT_QUAD) { self->s.v.items &= ~IT_QUAD; self->super_time = 0; self->super_damage_finished = 0; } else { self->s.v.items |= IT_QUAD; self->super_time = 1; self->super_damage_finished = g_globalvars.time + 3600 * 20; }` -- subject is `self`, never redirected. (Normal quad grant for comparison is `g_globalvars.time + 30` at `items.c:2191`; 3600*20s = 20 hours.)

- NEW source_ref: `src/bot_commands.c:2232` (handler entry FrogbotsToggleQuad)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "std botcmd subcommand; invoked as 'botcmd togglequad'" -> `src/bot_commands.c:2327` (std_commands entry) + `src/commands.c:1047` (botcmd registration -> FrogbotsCommand)
  - "operates on self (the caller); no isBot guard" -> `src/bot_commands.c:2232-2243` (body refers to `self` throughout); dispatcher `:2383-2406` has no isBot check
  - "remove path: clears IT_QUAD + zeros super_time + super_damage_finished" -> `src/bot_commands.c:2234-2237`
  - "grant path: sets IT_QUAD + super_time=1 + super_damage_finished = time + 3600*20" -> `src/bot_commands.c:2239-2242`
  - "~20-hour expiry vs normal 30s grant" -> `src/bot_commands.c:2241` + `src/items.c:2191`
  - "FB_CVAR_ADMIN_ONLY gate (is_real_adm at 2; is_adm if non-zero)" -> `src/bot_commands.c:2392-2405`
- verify route: inline-self-check (handler-body subject + dispatcher gate are the only load-bearing paths; both followed)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:command:shownick | TRACED-CLEAN | rev=1 | seed-clause: "outside CTF only teammates are eligible (in prewar any player is eligible)" (CTF vs Team distinction is wrong; gate is prewar-vs-match, applied identically in Team and CTF) + "console text" for version 0 (it is centerprint, not console text) | new-clause: command requires Team/CTF mode (or prewar) to operate; the teammate-only filter is prewar-vs-in-match, applied identically in Team and CTF; version-0 output is an on-screen centerprint, not console text

### ktx:command:shownick

- canonical_id: `ktx:command:shownick`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "outside CTF only teammates are eligible (in prewar any player is eligible)" -> MISMATCH at `src/commands.c:3868-3878`. The teammate filter is gated solely on `!match_in_progress` (prewar=any, in-match=same `team`), applied IDENTICALLY in Team mode and CTF mode. The only `isCTF`/`isTeam` use is the early gate at `:3824` `else if (!isTeam() && !isCTF()) return;` -- so the OUTER gate is "Team or CTF (or prewar)", not a teammate-vs-anyone distinction.
  - C-FIX: "With no argument (or argument 0) the report is printed as console text to the caller" -> MISMATCH at `src/commands.c:4144` `G_centerprint(self, "%s", buf);` -- version-0 output is an on-screen CENTERPRINT, not console text. Console text would be `G_sprint` (i.e. `trap_SPrint`).
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_command_shownick.md`.

- OLD description:
  > Reports info about the player the issuer is currently aiming at. It ray-casts along the caller's view direction and picks the best on-screen player within roughly a 60-degree cone and in line of sight; outside CTF only teammates are eligible (in prewar any player is eligible). For the chosen player it reports nick, map position, health, armor, ammo (shells/nails/rockets/cells) and active powerups (Pent/Quad/Suit). With no argument (or argument 0) the report is printed as console text to the caller; with argument 1 it is sent as a machine-readable "//sn" message for the client HUD to render. Does nothing if no eligible player is being aimed at.

- NEW description:
  > Reports info about the player the issuer is currently aiming at. The command requires Team or CTF mode to operate while a match is in progress -- in prewar (`!match_in_progress`) it is allowed in any game type. It ray-casts along the caller's view direction, picks the closest on-screen player within roughly a 60-degree cone (the `miss > dist * 1.7` cull at `commands.c:3898`) and in line of sight (multi-corner traceline check), preferring small angular miss. While a match is in progress the candidate pool is filtered to the caller's own team (same `team` infokey); in prewar any player is eligible. For version 1 it sends a machine-readable `"//sn <fields...>"` stuffcmd to the caller for the client HUD to render (index, position, health, armor, items, ammo, nick). For version 0 (the default, including no argument) it builds a text block (powerups Pent/Quad/Suit, armor type:value, weapon-specific ammo on RL/LG/GL/SNG/SSG/NG/SG/axe, health, and nick) and emits it as an on-screen CENTERPRINT (`G_centerprint`), not as console text -- the centerprint is auto-cleared 0.8 s later. Does nothing if no eligible player is being aimed at.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration `commands.c:762` (binds `shownick` to ShowNick with CF_PARAMS). Handler `ShowNick` (`commands.c:3809-4148`): outer mode-gate at `:3820-3827` (`!match_in_progress -> ok; else if (!isTeam() && !isCTF()) return;`); view ang at `:3831-3835`; per-player loop at `:3844-3985` (skip dead `:3849`, skip self `:3854`, skip non-player `:3859/:3864`); teammate filter at `:3869-3878` (`s1 = getteam(self)`, `s2 = getteam(p)`, gated solely on `!match_in_progress`, identical for Team and CTF); 60-deg cone at `:3893-3901` (`dist >= 10`, `miss <= 300`, `miss <= dist*1.7`); LOS multi-corner traceline at `:3924-3978`. Version arg at `:3992-3994` `bound(0, atoi(arg_1), 1)`. Version 1 stuffcmd at `:4021` `//sn %d %d ...` with index, origin, health, armor, items, nick, shells/nails/rockets/cells. Version 0 builds buf with pups (Pent/Quad/Suit `:4033-4046`), armor (`:4053-4060`), weapon+ammo (`:4063-4099`), nick (`:4101-4109`); centerprint at `:4144` `G_centerprint(self, "%s", buf);` + clear-time at `:4147` `shownick_time = time + 0.8`. No-aim no-op at `:3987-3990`.

- NEW source_ref: `src/commands.c:4144` (centerprint -- the authoritative version-0 output site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "requires Team/CTF in-match; prewar allowed in any game type" -> `src/commands.c:3820-3827`
  - "ray-casts along caller's view direction" -> `src/commands.c:3831-3835`
  - "picks closest on-screen player within ~60-degree cone" -> `src/commands.c:3898-3901` (`miss > dist * 1.7` at `:3898`, explicit comment "over 60 degrees off" at `:3900`)
  - "and in line of sight (multi-corner traceline)" -> `src/commands.c:3924-3978`
  - "in-match: same-team filter; prewar: any player; identical in Team and CTF" -> `src/commands.c:3869-3878` (single gate; no isCTF here)
  - "version arg bounded 0..1" -> `src/commands.c:3992-3994`
  - "version 1: stuffcmd '//sn ...' to caller" -> `src/commands.c:4021-4023`
  - "version 0: builds powerups/armor/weapon+ammo/nick text" -> `src/commands.c:4029-4109`
  - "version 0 output is centerprint (NOT console text)" -> `src/commands.c:4144`
  - "centerprint auto-cleared after 0.8s" -> `src/commands.c:4147`
  - "no-op when no eligible player found" -> `src/commands.c:3987-3990`
- verify route: sample-verify (Opus 4.7 MAX, blind) -- highest-variation row in the batch (two distinct C-FIX clauses; multi-branch dispatch + output-channel + cone-and-LOS geometry)
- verify verdict: TRACED-CLEAN (verifier returned every clause MATCH; one minor off-by-one on the `miss > dist*1.7` cite -- author had `:3897`, actual line is `:3898`, corrected above; verifier per-clause table in `/tmp/b4-wrong-mechanism-scope/sample_verify_shownick.md`)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_ctf_rune_bounce | TRACED-CLEAN | rev=1 | seed-clause: "Bit 2 (& 2) governs runes a player manually tosses/drops on death" (bit 2 governs the voluntary `tossrune` command, not death drops) | new-clause: bit 1 governs the auto-respawn fallback (only when no dedicated rune-spawn entity exists); bit 2 governs the voluntary `tossrune` command; on-death drops are cvar-independent (hardcoded MOVETYPE_TOSS)

### ktx:cvar:k_ctf_rune_bounce

- canonical_id: `ktx:cvar:k_ctf_rune_bounce`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "Bit 2 (& 2) governs runes a player manually tosses/drops on death" -> MISMATCH at `src/runes.c:107`. The `& 2` test lives in `DoTossRune`, which is reached ONLY from `TossRune` (the `tossrune` command at `commands.c:914`). On-death drops invoke `DropRune` -> `DoDropRune(rune, false)`, and in that path `movetype = MOVETYPE_TOSS` is hardcoded at `runes.c:52` -- the cvar is never read. The bit-2 mislabel inflates the description's per-value table.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_cvar_k_ctf_rune_bounce.md`.

- OLD description:
  > CTF runes only. Bitmask controlling whether dropped/respawned rune pickups bounce (MOVETYPE_BOUNCE) instead of resting where they land (MOVETYPE_TOSS). Bit 1 (value & 1) governs runes that auto-respawn in the world: set = the respawned rune bounces with randomized motion, unset = it is tossed and settles. Bit 2 (value & 2) governs runes a player manually tosses/drops on death: set = bounce, unset = toss. The two bits combine, so 0 = neither bounces, 1 = only auto-respawned runes bounce, 2 = only player-tossed runes bounce, 3 = both bounce.

- NEW description:
  > CTF runes only. Bitmask controlling whether two specific rune-spawn paths use bounce physics (MOVETYPE_BOUNCE) or settle-on-land physics (MOVETYPE_TOSS); registered default `3` (both bits on). Bit 1 (`value & 1`) governs the auto-respawn FALLBACK path inside `DoDropRune` -- it is consulted only when no dedicated rune-spawn entity (`item_rune_res`/`_str`/`_hst`/`_rgn`) is found on the map and the rune has to be dropped on the player's own position instead; with bit 1 set the fallback rune gets bounce physics with a randomized velocity, unset it gets toss physics. Bit 2 (`value & 2`) governs the VOLUNTARY `tossrune` command (player typing `tossrune` to discard a held rune); set = the tossed rune bounces, unset = it settles. The two bits combine independently, so 0 = neither path bounces, 1 = only the auto-respawn fallback bounces, 2 = only the `tossrune` command bounces, 3 = both bounce. On-death rune drops (`PlayerDie` -> `DropRune` -> `DoDropRune(rune, false)`) are NOT controlled by this cvar -- they are hardcoded to MOVETYPE_TOSS at `runes.c:52`.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registered default: `src/world.c:956` `RegisterCvarEx("k_ctf_rune_bounce", "3");`. `DoDropRune(rune, on_respawn)` at `runes.c:13`: on_respawn=true branch (`:20-38`) does `ez_find(world, "item_rune_*")` for a dedicated rune-spawn position; if found, `pos != NULL` and `movetype` stays at the initial MOVETYPE_NONE (the function's `:16` init). Fallback at `:41-54`: `if (pos == NULL) { pos = self; if (on_respawn) movetype = cvar("k_ctf_rune_bounce") & 1 ? MOVETYPE_BOUNCE : MOVETYPE_TOSS; else movetype = MOVETYPE_TOSS; }` -- the cvar bit-1 read happens only in the auto-respawn-fallback subcase; the on-death subcase hard-sets MOVETYPE_TOSS. `DropRune` at `:149` is called from `player.c:1161` and `client.c:3031` (death paths) and feeds `DoDropRune(..., false)`. `DoTossRune` at `:96-107`: `item->s.v.movetype = cvar("k_ctf_rune_bounce") & 2 ? MOVETYPE_BOUNCE : MOVETYPE_TOSS;` -- the bit-2 read site. `TossRune` at `:179` is the only caller; registered as the `tossrune` command at `commands.c:914`. `RuneRespawn` at `:236-243` schedules `DoDropRune(rune, true)` for the auto-respawn flow.

- NEW source_ref: `src/runes.c:47` (the cvar bit-1 read site -- the load-bearing enforcement for the bitmask semantics)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "CTF runes only" -> ctf_flag / CTF_RUNE_* used throughout `runes.c`; runes are CTF-mode entities
  - "registered default '3'" -> `src/world.c:956`
  - "bit 1 governs auto-respawn FALLBACK (when no dedicated rune-spawn entity)" -> `src/runes.c:41-47`
  - "fallback uses self position" -> `src/runes.c:43` `pos = self;`
  - "with bit 1 set: bounce + randomized velocity" -> `src/runes.c:47` + `:60-65` (random velocity)
  - "bit 2 governs the voluntary `tossrune` command" -> `src/runes.c:107` (in DoTossRune) + caller chain `:179` (TossRune) <- `commands.c:914` (`tossrune`)
  - "on-death drops are NOT cvar-controlled; hardcoded MOVETYPE_TOSS" -> `src/runes.c:52` + caller chain `:149` (DropRune) -> `DoDropRune(..., false)` <- death paths at `src/player.c:1161` + `src/client.c:3031`
  - "the two bits combine independently" -> `src/runes.c:47` (`& 1`) + `:107` (`& 2`) are independent tests, no inter-bit dependency
- verify route: inline-self-check (callee chain DropRune -> DoDropRune followed; tree-wide grep for additional `k_ctf_rune_bounce` reads returns only `:47` and `:107`)
- verify verdict: TRACED-CLEAN (verified via callee-follow per the 2026-05-20 amendment: the seed flagged "ON DEATH" specifically -- the death path's hardcoded MOVETYPE_TOSS in the same function is the precise enforcing line)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_freshteams_weapon_time | TRACED-CLEAN | rev=1 | seed-clause: "(clamped 0-60)" (the clamp is a local variable inside ToggleFreshTime used for branch logic only; the respawn-apply path reads the cvar unclamped) | new-clause: respawn-apply path uses the raw cvar value; the bound(0,...,60) inside ToggleFreshTime is a local used to decide which cycle step to apply, it does not store back to the cvar

### ktx:cvar:k_freshteams_weapon_time

- canonical_id: `ktx:cvar:k_freshteams_weapon_time`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "(clamped 0-60)" -> MISMATCH; the weapon-respawn path (`items.c:812 -> :1061`) and the ammo path (`items.c:1355`) read `cvar("k_freshteams_weapon_time")` directly with no clamp. The only `bound(0, ..., 60)` is `commands.c:7674` inside `ToggleFreshTime`, a separate admin command that reads a bounded LOCAL into a `k_freshtime` variable to pick the next cycle value (20 -> 15 -> 10 -> 20); it never writes a clamped value back to the cvar, and the respawn-apply paths see whatever value was set.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_cvar_k_freshteams_weapon_time.md`.

- OLD description:
  > FreshTeams (dmm1) only: the respawn delay, in seconds, before a picked-up weapon reappears on the map. When k_freshteams is on this value (clamped 0-60) replaces the normal 30-second weapon respawn; when k_freshteams is off, weapons respawn in the standard 30 seconds regardless of this cvar. If k_freshteams_fast_ammo is also enabled, ammo entities use this same delay instead of their default respawn time. Default 20.

- NEW description:
  > FreshTeams (dmm1) only: the respawn delay, in seconds, before a picked-up weapon reappears on the map. When `k_freshteams` is on, the weapon-touch path uses `weapon_time = cvar("k_freshteams_weapon_time")` (read directly, no clamp on the respawn-apply path) instead of the standard 30-second weapon respawn; when `k_freshteams` is off, weapons respawn in 30 seconds regardless of this cvar. If `k_freshteams_fast_ammo` is also enabled, ammo entities re-use the raw cvar value as their respawn delay too (replacing their own defaults). The companion admin command `ToggleFreshTime` cycles the stored value among 20 / 15 / 10 (with a 0..60 bound used only as a LOCAL inside that command to decide the next cycle step, never written back to the cvar); a direct `set` to a value outside that range will take effect on the next pickup unclamped. Registered default `20`. `k_freshteams` itself is reset to 0 outside dmm1 (`world.c:1770-1772`).

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registered default: `src/world.c:895` `RegisterCvarEx("k_freshteams_weapon_time", "20");`. Weapon-respawn read site: `src/items.c:812` `int weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30;` -- the cvar value, not a bounded local. Apply site: `src/items.c:1061` `self->s.v.nextthink = g_globalvars.time + weapon_time;`. Ammo path: `src/items.c:1189` `qbool freshteams_fast_ammo = (cvar("k_freshteams") && cvar("k_freshteams_fast_ammo"));` + `src/items.c:1353-1355` `if (freshteams_fast_ammo) self->s.v.nextthink = g_globalvars.time + cvar("k_freshteams_weapon_time");` -- also unclamped. ToggleFreshTime callsite: `src/commands.c:7671-7703`: reads `int k_freshtime = bound(0, cvar("k_freshteams_weapon_time"), 60);` (`:7674`) into a LOCAL, uses the local only for the `if (k_freshtime == 20) cvar_set(..., "15")` / 15 -> 10 / else -> 20 cycle; the `cvar_set` writes the literal next step (20/15/10), never the bounded local back. FreshTeams-dmm1 reset: `src/world.c:1770-1772` `if (cvar("k_freshteams") && deathmatch != 1) cvar_fset("k_freshteams", 0); // freshteams only in dmm1`.

- NEW source_ref: `src/items.c:812` (the cvar read site that drives the respawn delay)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "FreshTeams (dmm1) only -- k_freshteams reset outside dmm1" -> `src/world.c:1770-1772`
  - "weapon-respawn delay; cvar read directly (no clamp on respawn-apply path)" -> `src/items.c:812` + `:1061`
  - "when k_freshteams off, default 30s applies" -> `src/items.c:812` ternary `: 30`
  - "ammo respawn also reads this cvar when k_freshteams_fast_ammo is on" -> `src/items.c:1189` + `:1353-1355`
  - "ToggleFreshTime bound is LOCAL for branch logic; never written back to cvar" -> `src/commands.c:7671-7703` (esp. `:7674` bound, `:7691/:7696/:7700` literal cvar_set values)
  - "registered default '20'" -> `src/world.c:895`
- verify route: inline-self-check (callees followed: `ToggleFreshTime` body inspected for whether the bounded local is ever stored back -- it is not; the cvar_set writes are literal 20/15/10 strings)
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_fbskill_wiggleframes | TRACED-CLEAN | rev=1 | seed-clause: "Applies only in deathmatch 4 / duel" (movement scope is dmm==4, damage-flip is dmm>=4; the only isDuel branch DISABLES wiggle in dmm>=4 duel unless wiggle_run_dmm4 is enabled) | new-clause: wiggle applies in deathmatch == 4 (movement) / >= 4 (damage-flip); in dmm>=4 duel the movement wiggle is OFF unless the per-bot wiggle_run_dmm4 attribute is set (default: only skill > 10)

### ktx:cvar:k_fbskill_wiggleframes

- canonical_id: `ktx:cvar:k_fbskill_wiggleframes`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "Applies only in deathmatch 4 / duel" -> MISMATCH. The movement-wiggle branch in `bot_movement.c` is gated on `deathmatch == 4` only (no isDuel predicate); the damage-induced flip in `bot_botenemy.c` is gated on `deathmatch >= 4`. The only `isDuel()` use on the feature path is `bot_movement.c:141`, which DISABLES the movement wiggle in dmm>=4 duel UNLESS the per-bot `wiggle_run_dmm4` attribute is set -- and `wiggle_run_dmm4` defaults to `skill > 10 ? 1 : 0` at `bot_botimp.c:199/:251`, so for skill 0..10 the wiggle is OFF in dmm>=4 duel.
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_cvar_k_fbskill_wiggleframes.md`.

- OLD description:
  > Frogbot AI movement tuning: the amplitude, in movement-think ticks, of the bot's deathmatch-4 / duel side-to-side 'wiggle run'. In deathmatch 4 the bot's wiggle counter increments each tick and reverses direction once it passes plus/minus this value, so a larger value makes the bot drift further to one side before swapping back (a wider, slower oscillation); a smaller value gives a tighter, faster zig-zag. It also gates the damage-induced wiggle-direction flip, which only triggers once the counter exceeds half this value. Integer ticks, clamped to 0..45 per bot. Applies only in deathmatch 4 / duel. Normally set automatically from the configured bot skill, not by hand.

- NEW description:
  > Frogbot AI movement tuning: the amplitude, in movement-think ticks, of the bot's side-to-side `wiggle run` in deathmatch 4. The movement-wiggle branch in `bot_movement.c` runs while `deathmatch == 4`: each move-think tick increments (or decrements) `self->fb.wiggle_run_dir`, reversing direction when the counter passes +/- this cvar's value -- so a larger value makes the bot drift further to one side before swapping back (wider, slower oscillation), a smaller value gives a tighter, faster zig-zag. The damage-induced wiggle-direction flip runs while `deathmatch >= 4` and only triggers once `abs(wiggle_run_dir)` exceeds half this cvar's value (and `g_random() < wiggle_toggle`). Each bot reads the cvar once into a per-bot integer `wiggle_run_limit` clamped to 0..45 at attribute-setup. Mode scope: the wiggle is active in dmm==4 broadly (movement) and dmm>=4 (damage-flip); however, in dmm>=4 duel specifically the movement wiggle is GATED OFF by `bot_movement.c:141` `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4) return;` unless the per-bot `wiggle_run_dmm4` attribute is set, and that attribute defaults to enabled only for bot skill > 10 (per `bot_botimp.c:199/:251`). Normally set automatically from the configured bot skill (`RangeOverSkill(skill, 30, 20)` at `bot_botimp.c:202/:254`), not by hand.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration: `src/bot_botimp.c:145` `RegisterCvar(FB_CVAR_MOVEMENT_WIGGLEFRAMES);` (define at `:52` `#define FB_CVAR_MOVEMENT_WIGGLEFRAMES "k_fbskill_wiggleframes"`). Per-bot attribute load: `src/bot_botimp.c:353` `self->fb.skill.wiggle_run_limit = bound(0, (int)cvar(FB_CVAR_MOVEMENT_WIGGLEFRAMES), 45.0f);` (integer cast + 0..45 bound). Movement-wiggle branch: `src/bot_movement.c:242-266` under `else if (deathmatch == 4)` -- increments wiggle_run_dir, reverses at `> wiggle_run_limit` (`:249`) or `< -wiggle_run_limit` (`:254`). Damage-flip branch: `src/bot_botenemy.c:34-37` `if ((deathmatch >= 4) && (g_random() < targ->fb.skill.wiggle_toggle) && (abs(targ->fb.wiggle_run_dir) > (self->fb.skill.wiggle_run_limit / 2))) targ->fb.wiggle_run_dir = targ->fb.wiggle_run_dir < 0 ? 1 : -1;`. Duel-disable gate: `src/bot_movement.c:141` `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4) return;`. wiggle_run_dmm4 default: `src/bot_botimp.c:199` `cvar_fset(FB_CVAR_MOVEMENT_DMM4WIGGLE, skill > 10 ? 1 : 0);` (and `:251` in easy-skill mode) -- attribute loaded at `:352` `bound(0, (int)cvar(FB_CVAR_MOVEMENT_DMM4WIGGLE), 1.0f)`. Skill-driven default: `src/bot_botimp.c:202` `cvar_fset(FB_CVAR_MOVEMENT_WIGGLEFRAMES, RangeOverSkill(skill, 30, 20));` (also `:254` easy-skill).

- NEW source_ref: `src/bot_botimp.c:353` (the per-bot read site -- the load-bearing site for both the value clamp and the cvar's identity)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "amplitude in movement-think ticks of the wiggle run" -> `src/bot_movement.c:249-266` (counter swing bounded by wiggle_run_limit)
  - "movement wiggle runs while deathmatch == 4" -> `src/bot_movement.c:242` (`else if (deathmatch == 4)`)
  - "increments/decrements counter; reverses at +/- this value" -> `src/bot_movement.c:249-266`
  - "damage-flip while deathmatch >= 4; gated on abs(counter) > half-value" -> `src/bot_botenemy.c:34-37`
  - "integer ticks, per-bot clamp 0..45" -> `src/bot_botimp.c:353`
  - "dmm>=4 duel DISABLES the movement wiggle unless wiggle_run_dmm4 is on" -> `src/bot_movement.c:141`
  - "wiggle_run_dmm4 default skill > 10 -> 1 else 0" -> `src/bot_botimp.c:199` + `:251` + `:352`
  - "normally set automatically from skill via RangeOverSkill(skill, 30, 20)" -> `src/bot_botimp.c:202` + `:254`
- verify route: inline-self-check
- verify verdict: TRACED-CLEAN
- attempts: 1

---

B4-RESULT | ktx:cvar:k_hoonymode | TRACED-CLEAN | rev=1 | seed-clause: "it is only active in duel or team modes and is inert otherwise" (isHoonyModeAny has no mode predicate; bare-cvar reads suppress sudden-death + fraglimit in any game mode) | new-clause: in FFA/CTF the cvar is not "inert" -- it suppresses normal sudden-death + fraglimit-end, alters match-end messaging, and enables the hoony spawn-point picker via the bare-cvar `isHoonyModeAny` paths; only the round-by-round STRUCTURE (rounds, nominations, point ladder) is gated to duel/team via `isHoonyModeDuel`/`isHoonyModeTDM`

### ktx:cvar:k_hoonymode

- canonical_id: `ktx:cvar:k_hoonymode`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-FIX: "it is only active in duel or team modes and is inert otherwise" -> MISMATCH at `src/hoonymode.c:92-95` `qbool isHoonyModeAny(void) { return cvar("k_hoonymode"); }` -- no mode predicate. With `k_hoonymode=1` in FFA or CTF the bare-cvar paths fire: `combat.c:320` suppresses Check_SD + fraglimit-EndMatch; `match.c:324` switches the match-end message; `match.c:1687` hides the fraglimit display from the rules text; etc. There is no force-reset of the cvar based on game mode (`world.c:888` registers default "0" only).
  - Seed scratch: `/tmp/b4-wrong-mechanism-scope/seed_ktx_cvar_k_hoonymode.md`.

- OLD description:
  > Enables HoonyMode, a round-based duel/team match format (best-of-N point rounds with rigged/nominated spawns, ported from CPMA). 0 = off; non-zero = on. When on it changes match flow to round-by-round play in duel (1on1) and team games; it is only active in duel or team modes and is inert otherwise. Default 0.

- NEW description:
  > Enables HoonyMode, a round-based match format ported from CPMA (best-of-N point rounds with rigged / nominated spawns). 0 = off; non-zero = on. The round-by-round STRUCTURE -- the point ladder, nominated-spawn voting, and per-point flow -- is gated to duel and team modes via `isHoonyModeDuel()` (`isDuel() && cvar(k_hoonymode)`) and `isHoonyModeTDM()` (`isTeam() && cvar(k_hoonymode)`); in FFA or CTF those structural paths are skipped. However, several AUXILIARY behaviors fire via the mode-agnostic `isHoonyModeAny()` (which is just the cvar) and so activate in any game type when the cvar is set: normal sudden-death and fraglimit-driven `EndMatch` are suppressed (`combat.c:320`), the match-end announcement switches to "The point is over" + `HM_point_stats` (`match.c:324`), the fraglimit row is hidden from the rules text (`match.c:1687`), the hoony spawn-point picker is used at respawn (`client.c:1865/2058`), and the normal "won the match" frag-pop is suppressed (`client.c:2559`). KTX does not force the cvar back to 0 outside duel/team -- it stays where it was set. Practical reading: the cvar is intended for duel and team-game use; setting it in FFA or CTF still toggles the auxiliary side effects but does not run the round structure. Registered default `0`.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Registration: `src/world.c:888` `RegisterCvarEx("k_hoonymode","0");`. Predicate helpers: `src/hoonymode.c:87-95` `isHoonyModeDuel := isDuel() && cvar("k_hoonymode")`, `isHoonyModeAny := cvar("k_hoonymode")` (bare cvar, no mode test), `isHoonyModeTDM := isTeam() && cvar("k_hoonymode")`. Round STRUCTURE callsites use mode-predicated forms: `hoonymode.c:150,212,245,868,886,912,954,983-1058,1082` (isHoonyModeDuel); `hoonymode.c:983,1257` (isHoonyModeTDM). Mode-AGNOSTIC bare-cvar callsites: `combat.c:320` `if (!isHoonyModeAny()) { Check_SD(targ); /* + fraglimit EndMatch */ }`; `match.c:324` `if (isHoonyModeAny()) { G_bprint "The point is over"; HM_point_stats(); }`; `match.c:1687` `if (!isHoonyModeAny() && fraglimit) { append "Fraglimit" row }`; `client.c:1865` `if (isHoonyModeAny() && (spot = HM_choose_spawn_point(self)))`; `client.c:2058` `if (spot->s.v.items && isHoonyModeAny())`; `client.c:2559` `if (!isHoonyModeAny() && fraglimit && self->s.v.frags >= fraglimit)`; `client.c:4580` `... && !isHoonyModeAny()`; `statsTables.c:56` `if (isHoonyModeAny() && !HM_is_game_over())`. Tree-wide grep for `cvar_set\|cvar_fset.*k_hoonymode` returns no auto-reset based on game mode -- the cvar is not force-cleared in FFA/CTF.

- NEW source_ref: `src/hoonymode.c:92` (definition of isHoonyModeAny, the load-bearing structural fact)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "round-based; best-of-N points; rigged/nominated spawns; ported from CPMA" -> `src/hoonymode.c:1` (header comment "for idea from cpma" / "Got spawn rigging to work") + round-machinery at `hoonymode.c:47-61` + nomination at `:868,886`
  - "0 = off; non-zero = on" -> `src/hoonymode.c:92-95` (bare cvar truthiness)
  - "round STRUCTURE gated to duel and team via mode-predicated helpers" -> `src/hoonymode.c:87-89,97-100` + every `isHoonyModeDuel`/`isHoonyModeTDM` callsite in `hoonymode.c`
  - "FFA/CTF: structural paths skipped" -> same predicate; bare cvar=1 + !isDuel + !isTeam => Duel/TDM predicates false
  - "auxiliary: sudden-death + fraglimit-EndMatch suppressed via bare-cvar" -> `src/combat.c:320`
  - "match-end announce switches to 'The point is over' + HM_point_stats" -> `src/match.c:324`
  - "fraglimit row hidden from rules text" -> `src/match.c:1687`
  - "hoony spawn-point picker used at respawn" -> `src/client.c:1865`, `:2058`
  - "normal 'won the match' frag-pop suppressed" -> `src/client.c:2559`
  - "no force-reset of cvar based on game mode" -> tree-wide grep on `cvar_set|cvar_fset.*k_hoonymode` returns no reset
  - "registered default 0" -> `src/world.c:888`
- verify route: sample-verify (Opus 4.7 MAX, blind) -- highest-variation row in the batch (multiple bare-cvar side effects + mode-predicated structure + nuanced "not inert" framing)
- verify verdict: TRACED-CLEAN (verifier returned every clause MATCH; verifier flagged the "won the match frag-pop" framing at `client.c:2559` as editorial-but-semantically-accurate, MATCH; verifier per-clause table in `/tmp/b4-wrong-mechanism-scope/sample_verify_k_hoonymode.md`)
- attempts: 1

---
