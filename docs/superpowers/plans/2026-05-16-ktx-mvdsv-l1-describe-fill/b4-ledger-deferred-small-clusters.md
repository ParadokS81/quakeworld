# B4 ledger -- deferred small clusters (Session #9 hand-authored, thin shape)

**Batch id:** deferred-small-clusters (the 5 rows held back from the 6-batch fan-out)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Batch members:** 5 rows (3-row `k_on_end_f_*` family + 2-row `dmm1`/`dmm3` pair)
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth contract. B5 Stage-2 change-report ledger per row.
**Origin:** Session #9 orchestrator, inline hand-authored with operator
collaboration. Per the resume First Action #6 option (a): "cheapest at N=5".

## Shape note

This ledger uses the **thin** B5 Stage-2 shape -- OLD -> NEW + a one-line
defect note + a single load-bearing source cite per row. The elaborate
per-clause cite blocks used in the 8 fan-out ledgers are FAN-OUT
INFRASTRUCTURE; for hand-authored rows where the operator + orchestrator
diagnosed the shared roots in conversation, that ceremony is overhead.
The audit trail is the diagnosis dialogue (Session #9 transcript) + the
commit message + this file's defect-cite per row. Future re-runs against
KTX 1.48+ that hit these rows will start from the thin shape; if they
need fan-out rigour they can re-V-pass + author into the lean-v2 template.

## Members

```
ktx:cvar:k_on_end_f_modified    C-FIX  shared root: function-scope _done flag = once-per-match-end TOTAL, not per-player
ktx:cvar:k_on_end_f_ruleset     C-FIX  same root
ktx:cvar:k_on_end_f_version     C-FIX  same root
ktx:command:dmm1                C-FIX + WI-2  access-class overbroad + UNTRACEABLE-on-feature-path midair/instagib clears
ktx:command:dmm3                C-FIX + WI-2  same root
```

## Shared roots (diagnosed inline, not V-passed as separate Step 4 block)

**Root 1 (k_on_end_f_* trio):** the function-scope `f_*_done` boolean flags
declared at `match.c:285` (OUTSIDE the post-match player loop at `:402-420`)
latch true after the first successful `stuffcmd` to find_plr's first hit and
gate every subsequent iteration. Net behaviour: each f_* trigger fires
exactly once per match-end TOTAL (single player stuffed), not once per
player as the OLD descriptions all claimed. The practical outcome of
"every client publishes their f_X report" comes from the community
trigger chain on the client side: ezQuake/FTE ship triggers that watch
for the literal strings `f_modified` / `f_ruleset` / `f_version` in
incoming chat and auto-reply with the client's own info. KTX stuffs one;
the broadcast triggers everyone else.

**Root 2 (dmm1/dmm3 pair):** two defects share the root.
(a) Registration flags `CF_PLAYER | CF_SPC_ADMIN` at `commands.c:725/727`
allow any in-game player + admin spectators; "Admin/console" is overbroad
(admin required only for spectator callers).
(b) The "forces k_midair / k_instagib off" clauses are UNTRACEABLE on the
feature's own path -- both clears live behind a generic `if (dmm != 4)`
branch in `ChangeDM` at `commands.c:2889-2892` that fires for every mode
switch except mode 4, not a mode-1 or mode-3-specific test.

---

B4-RESULT | ktx:cvar:k_on_end_f_modified | TRACED-CLEAN | rev=1 | seed-clause: "every player is automatically made to issue 'say f_modified' once when the match ends, broadcasting each client's f_modified report" (function-scope `_done` flag = once-per-match-end TOTAL, not per-player) | new-clause: KTX stuffs `say f_modified` to exactly one player at match end; the per-client info chain comes from the community trigger chain on the client side, not from KTX iterating

### ktx:cvar:k_on_end_f_modified

- canonical_id: `ktx:cvar:k_on_end_f_modified`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed, batch-04): "every player ... 'say f_modified' once" + "non-zero = sent once per player" both -> MISMATCH at `match.c:285,406-410`. `qbool ... f_modified_done = false;` declared at function scope OUTSIDE the `for (p = world; (p = find_plr(p));)` loop; the `!f_modified_done` guard makes the stuffcmd fire for exactly the first iterated player.

- OLD description:
  > When set (non-zero) and the match has a matchtag assigned, every player is automatically made to issue "say f_modified" once when the match ends, broadcasting each client's f_modified (modified-files) report to chat for the match record. 0 = no automatic f_modified at match end; non-zero = sent once per player at match end. No effect on matches without a matchtag. Default 1.

- NEW description:
  > When non-zero and the match has a matchtag assigned, KTX stuffs a single `say f_modified` to the first player iterated at match-end, broadcasting the literal trigger text "f_modified" into chat. Other ezQuake/FTE clients with the standard `f_modified` trigger see that chat line and auto-reply with their own modified-files report, producing the per-client info chain in the match record. A function-scope `f_modified_done` flag at `match.c:285` latches after the first stuffcmd and gates subsequent players in the same post-match loop -- so KTX fires the trigger exactly once per match-end; the per-client replies come from the community trigger chain on the client side, not from KTX iterating. 0 = no stuff fired; non-zero = stuff fires once per match-end. No effect on matches without a matchtag. Default 1.

- NEW source_ref: `src/match.c:406-410` (the gated stuffcmd inside the post-match player loop)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_on_end_f_ruleset | TRACED-CLEAN | rev=1 | seed-clause: same shape as k_on_end_f_modified (function-scope `_done` flag) | new-clause: same correction shape with ruleset trigger

### ktx:cvar:k_on_end_f_ruleset

- canonical_id: `ktx:cvar:k_on_end_f_ruleset`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed, batch-03): same defect shape as k_on_end_f_modified -- `f_ruleset_done` declared at function scope (`match.c:285`); gated stuffcmd at `match.c:411-415` fires once per match-end TOTAL via the same latch pattern.

- OLD description:
  > When set (non-zero) and the match has a matchtag assigned, every player is automatically made to issue "say f_ruleset" once when the match ends, broadcasting each client's f_ruleset report to chat for the match record. 0 = no automatic f_ruleset at match end; non-zero = sent once per player at match end. No effect on matches without a matchtag. Default 1.

- NEW description:
  > When non-zero and the match has a matchtag assigned, KTX stuffs a single `say f_ruleset` to the first player iterated at match-end, broadcasting the literal trigger text "f_ruleset" into chat. Other ezQuake/FTE clients with the standard `f_ruleset` trigger see that chat line and auto-reply with their own active-ruleset report, producing the per-client info chain in the match record. A function-scope `f_ruleset_done` flag at `match.c:285` latches after the first stuffcmd and gates subsequent players in the same post-match loop -- so KTX fires the trigger exactly once per match-end; the per-client replies come from the community trigger chain on the client side, not from KTX iterating. 0 = no stuff fired; non-zero = stuff fires once per match-end. No effect on matches without a matchtag. Default 1.

- NEW source_ref: `src/match.c:411-415` (the gated stuffcmd inside the post-match player loop)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_on_end_f_version | TRACED-CLEAN | rev=1 | seed-clause: same shape as k_on_end_f_modified (function-scope `_done` flag) | new-clause: same correction shape with version trigger

### ktx:cvar:k_on_end_f_version

- canonical_id: `ktx:cvar:k_on_end_f_version`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed, batch-06): same defect shape -- `f_version_done` declared at function scope (`match.c:285`); gated stuffcmd at `match.c:416-420` fires once per match-end TOTAL. Orchestrator HG2 re-grep at V-pass time confirmed decl scope vs loop.

- OLD description:
  > When set (non-zero) and the match has a matchtag assigned, every player is automatically made to issue "say f_version" once when the match ends, broadcasting each client's f_version (client version) report to chat for the match record. 0 = no automatic f_version at match end; non-zero = sent once per player at match end. No effect on matches without a matchtag. Default 1.

- NEW description:
  > When non-zero and the match has a matchtag assigned, KTX stuffs a single `say f_version` to the first player iterated at match-end, broadcasting the literal trigger text "f_version" into chat. Other ezQuake/FTE clients with the standard `f_version` trigger see that chat line and auto-reply with their own client-version report, producing the per-client info chain in the match record. A function-scope `f_version_done` flag at `match.c:285` latches after the first stuffcmd and gates subsequent players in the same post-match loop -- so KTX fires the trigger exactly once per match-end; the per-client replies come from the community trigger chain on the client side, not from KTX iterating. 0 = no stuff fired; non-zero = stuff fires once per match-end. No effect on matches without a matchtag. Default 1.

- NEW source_ref: `src/match.c:416-420` (the gated stuffcmd inside the post-match player loop)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:command:dmm1 | TRACED-CLEAN | rev=1 | seed-clause: "Admin/console command" (access-class overbroad: `CF_PLAYER | CF_SPC_ADMIN` -- any player + admin spectator) + "forces k_midair/k_instagib off" (UNTRACEABLE on mode-1 feature path; generic `if (dmm != 4)` clear in ChangeDM) | new-clause: access reframed + midair/instagib clear reframed as not-mode-4 side effect

### ktx:command:dmm1

- canonical_id: `ktx:command:dmm1`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed, batch-01):
  - C-FIX: "Switching to mode 1 forces `k_midair` / `k_instagib` off" -> UNTRACEABLE on the feature's own path. `commands.c:2889 if (dmm != 4) { cvar_set("k_midair","0"); cvar_set("k_instagib","0"); }` is the generic non-mode-4 fallback; no line tests mode==1 specifically.
  - WI-2: "Admin/console command" overbroad. Registration `commands.c:725` `{ "dmm1", DEF(ChangeDM), 1, CF_PLAYER | CF_SPC_ADMIN, CD_DMM1 }` -- the CF_PLAYER bit allows a non-admin in-game player to issue it; admin required only for spectator callers via CF_SPC_ADMIN.

- OLD description:
  > Admin/console command that switches the server to deathmatch mode 1 (sets the `deathmatch` cvar to 1 and announces the change). Mode 1 is standard deathmatch: picked-up weapons are removed and respawn on a timer, items respawn normally, and it is the only mode in which the `k_freshteams` and `k_nosweep` options take effect. Switching to mode 1 forces `k_midair` and `k_instagib` off.

- NEW description:
  > Command that switches the server to deathmatch mode 1 (sets the `deathmatch` cvar to 1 via `cvar_set` at `commands.c:2887` and announces via `G_bprint` at `:2899`). Access: any in-game player or admin spectator (`CF_PLAYER | CF_SPC_ADMIN` at `commands.c:725`); spectator non-admins are rejected by the dispatch's CF_SPC_ADMIN gate. Mode 1 is standard deathmatch: picked-up weapons are removed and respawn on a 30-second timer (or `k_freshteams_weapon_time` when freshteams is active); `k_freshteams` and `k_nosweep` are gated to mode 1 only (`world.c:1770-1777` clears them whenever `deathmatch != 1`, with adjacent comments "freshteams only in dmm1" / "nosweep only in dmm1"). As a side effect of the generic `if (dmm != 4)` branch in `ChangeDM` (`commands.c:2889-2892`), `k_midair` and `k_instagib` are also force-cleared when switching to mode 1 -- not by a mode-1-specific test but by the not-mode-4 fallback; the same clear fires for every mode switch except mode 4.

- NEW source_ref: `src/commands.c:725` (cmds[] registration; the access-class anchor)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:command:dmm3 | TRACED-CLEAN | rev=1 | seed-clause: same shape as dmm1 (access-class overbroad + UNTRACEABLE-on-feature-path midair/instagib clears) | new-clause: same correction shape with mode-3 body (weapons-stay + half ammo-respawn)

### ktx:command:dmm3

- canonical_id: `ktx:command:dmm3`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed, batch-01):
  - C-FIX: "Switching to mode 3 forces `k_midair` / `k_instagib` off" -> UNTRACEABLE same shape as dmm1.
  - WI-2: "Admin/console command" overbroad. Registration `commands.c:727` `{ "dmm3", DEF(ChangeDM), 3, CF_PLAYER | CF_SPC_ADMIN, CD_DMM3 }` -- same access pattern as dmm1.

- OLD description:
  > Admin/console command that switches the server to deathmatch mode 3 (sets the `deathmatch` cvar to 3 and announces the change). In mode 3 picked-up weapons stay on the ground for others to grab, and ammo respawn time is halved (15 seconds instead of 30). Switching to mode 3 forces `k_midair` and `k_instagib` off.

- NEW description:
  > Command that switches the server to deathmatch mode 3 (sets the `deathmatch` cvar to 3 via `cvar_set` at `commands.c:2887` and announces via `G_bprint` at `:2899`). Access: any in-game player or admin spectator (`CF_PLAYER | CF_SPC_ADMIN` at `commands.c:727`); spectator non-admins are rejected by the dispatch's CF_SPC_ADMIN gate. In mode 3 picked-up weapons stay on the ground for others to grab (`items.c:835` -- `leave=1` when `deathmatch == 3`; `:1047` `if (leave) { ItemTaken(self, other); return; }`) and ammo respawn time is halved to 15 seconds instead of the default 30 (`items.c:1342/1347-1349` -- the 30-second `nextthink` is overwritten with 15 when `deathmatch == 3 || == 5`). As a side effect of the generic `if (dmm != 4)` branch in `ChangeDM` (`commands.c:2889-2892`), `k_midair` and `k_instagib` are also force-cleared when switching to mode 3 -- not by a mode-3-specific test but by the not-mode-4 fallback; the same clear fires for every mode switch except mode 4.

- NEW source_ref: `src/commands.c:727` (cmds[] registration; the access-class anchor)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

## Batch summary

- **5 rows processed, 5 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** 5 x inline-orchestrator-hand-authored (Session #9 orchestrator
  + operator collaboration; no sample-verify subagent dispatch).
- **Total subagent dispatches:** 0.
- **Per-row attempts avg:** 1.0.
- **Token cost:** negligible (the 5 rows shared diagnosis conversation
  in the orchestrator session; no per-row terminal dispatch).

### Methodology note: thin shape vs lean-v2 fan-out shape

The lean-v2 template (sample-verify subagents + per-clause cite blocks +
structured ledger entries) is FAN-OUT INFRASTRUCTURE. It pays off when N
is large enough that operator + orchestrator cannot diagnose every row
in conversation, and the verifier dispatch amortizes across the row
count. For small N where operator + orchestrator can identify the
shared root + author the correction inline, the heavy machinery is
ceremony.

For these 5 rows: shared roots were identified in the Session #9
orchestrator conversation (operator domain knowledge surfaced the
community trigger-chain mechanism for the k_on_end_f_* trio; the
dmm1/dmm3 access + side-effect roots followed from the V-pass seeds
directly). The thin ledger captures OLD -> NEW + defect + load-bearing
cite per row; the audit trail is the conversation + commit. Future
re-runs against KTX 1.48+ that hit these rows will start from the thin
shape; if they need fan-out rigour they can re-V-pass + author into the
lean-v2 template.

This pattern -- **fan-out for scale, inline for diagnostic** -- is the
right default. Apply lean-v2 when N is large + no clear shared root;
apply inline when operator + orchestrator have already diagnosed in
conversation. The decision is per-batch, not arc-wide.

### Notable byproduct (not gating L1 apply)

The k_on_end_f_* once-per-match-end pattern is almost certainly an
**unintentional KTX behaviour**: the cvar name + comment intent + the
per-player iteration loop all suggest the original author meant "fire
for every player" but accidentally hoisted the `_done` flag to function
scope. The descriptions correctly describe what the code DOES, not
what it should do. If a future arc files an upstream PR to KTX (move
the `_done` declarations inside the loop body), the descriptions would
need re-authoring. Not gating the current L1 apply.
