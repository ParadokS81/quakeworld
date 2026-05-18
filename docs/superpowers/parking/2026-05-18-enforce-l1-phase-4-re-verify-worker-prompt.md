# Execute the enforce-L1 Phase-4 RE-VERIFY (the 9 boundary checks on the clean idempotent DB)

You are an **arc-executor** in a FRESH terminal, EXECUTION mode. You are NOT
drafting. You are NOT arc-orchestrator. You are NOT executing Phase 5. The
unit of work is the **Phase-4 RE-VERIFY**: re-run the full Phase-4
acceptance-contract phase boundary (the 9 operator-run checks) on the
post-F15-fix clean idempotent DB, AND confirm the 3 F15-family regression
FAILs that were SCOPED OUT at the s4 checkpoint are now CLEARED. This is a
full orchestrator-gated boundary, NOT a rubber-stamp. It is NOT a phase, NOT
a `decisions.md` amendment. You do NOT flip README/arc-history and you do NOT
proceed to Phase 5 -- the orchestrator owns the boundary flip after
independently re-gating your HALT.

Arc: `2026-05-17-enforce-l1-runtime-truth` (libclang call-graph reachability
+ HUD hidden-command recovery; Track A / Track B; D1-D22 + X1-X10;
ezQuake-only; 74 cmd / 92 cvar / ~129 reverse). SELF-CHECK -- WRONG ARC if
you see "describe-fill" / "C1-C5 / P1-P5" / KTX man-pages (that is the
SEPARATE still-active 2026-05-16-ktx-mvdsv-l1-describe-fill arc), or
"Postgres port / pgvector / 31-table" (that is 2026-05-02-qw-oracle-arc1).
HALT if so.

Repo root: `/home/paradoks/projects/quakeworld`
Scaffold:  `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`

---

## Read COLD before touching anything (in this order)

1. The scaffold per README "read in this order": `prerequisites.md`,
   `decisions.md` (D1-D22 + the **D5/D7/D11 AMENDMENTS** + X1-X10 + non-goals
   IN FULL -- do NOT re-open a D), `review-findings.md` (**F15
   FIX-SHIPPED+RE-GATED + F16 ADVISORY** the freshest; F7 the Phase-4
   load-bearing rule; F8 the cross-arc standing rule; F12/F13/F14 RESOLVED --
   do NOT re-litigate), `phase-template.md`, `README.md` (Phase 1-3
   `shipped`, Phase 4 `CHECKPOINT ... BLOCKED on F15` commit `702421a1`,
   Phase 5 pending -- the README Phase-4 row still says CHECKPOINT; this
   RE-VERIFY is what flips it AFTER the orchestrator gates you).
2. **The Phase-4 MD IN FULL** (`phase-4-acceptance-contract.md`) -- the
   RE-VERIFY contract. Authoritative sections: the **F12+F14 dated
   MD-correction block** (after the no-deviation block -- it fixes the
   literals: `extract-tag` not `load-version`; canonical `qw_oracle_test`-DB
   `bun test`; `extract-tag.ts` not `load-version.ts`), the **9
   `## Verification (phase boundary)` checks** (the exact copy-paste
   commands + PASS/FAIL), the **F15 DATED SCOPING note inside Verification
   8**, **Task 2 Verification block** (check 2 invokes it), **Task 4
   Verification block** (checks 4/5/6 invoke its negative scenarios),
   `## Recovery`. Then the **Phase-5 MD** `## Inputs from previous phase`
   only (so you know what Phase 5 consumes from this boundary -- do NOT
   execute Phase 5). P1/P2/P3 SHIPPED contracts as needed.
3. The s5->s6 resume doc
   `docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-execution-orchestrator-resume-s5-to-s6.md`
   (the F15 fix-cycle disposition + the RE-VERIFY contract) and the s4->s5
   resume (the operator-ratified F15 = F13-INVERSE disposition; the prior
   chain s1->s4 for cumulative rules).
4. The live verification surface (read, do not edit):
   `apps/qw-oracle/scripts/extractors/ezquake/accept-runtime-truth.py`
   (the harness; `--stage all`), `apps/qw-oracle/data/detection/
   version-pin-proxy.sh` (the R6 proxy; PRIMARY embedded-SHA leg + 2
   SANITY legs), `apps/qw-oracle/scripts/extractors/extractor_lib/
   _acceptance.py` (`run_stage1`/`run_stage2`/`route_by_level`/
   `validation_record_ok`), the Phase-4-modified loaders
   (`load-callgraph-reachability.ts`, `load-hud-commands.ts`,
   `extract-tag.ts` -- the F14 real wiring site), `quality-grid.ts`
   (F1.runtime_fidelity_shape level-3-pinned-only; the F13 floor
   624/7/62 -- do NOT touch it), `quality-grid.test.ts`.
5. Memory (the lens): `feedback_verify_dispatched_terminal_claims` (you are
   re-verifying a shipped boundary; report ACTUAL per-check output, never
   "all pass"), `feedback_idempotency_before_staleness` (F15 is
   F13-INVERSE -- a re-load MUST reproduce the clean-load 624/7/62; do NOT
   recalibrate), `feedback_repair_by_reextract_not_sql_update` (X9 -- if a
   check needs the DB restored, re-extract+re-load, NEVER hand-SQL),
   `feedback_cross_phase_audit_shared_file_drift` / F8 (the all-project F1
   grid -- ktx-mvdsv is a STILL-ACTIVE sibling arc on shared substrate),
   `reference_runtime_dump_self_certifies_commit` (F7 -- the proxy's
   PRIMARY embedded-`~<sha>` leg), `reference_qw_oracle_floor_vs_clean_reload`
   (the F13/F15 family -- F15 is the INVERSE), `reference_destructive_rm_
   harness_gate` (`rm -rf` is harness-blocked -- use `mktemp -d`; the
   Phase-4 MD's `/tmp/*` tamper files via `head`/`sed` redirection are fine,
   they are not `rm`).

---

## State the orchestrator independently verified vs LIVE (treat as a HYPOTHESIS -- re-verify; do not trust on faith)

Per `feedback_parking_verified_state_is_hypothesis` this block is the record
of the path, NOT a contract. Re-verify each before you rely on it.

- **F15 fix is shipped + cheap-re-verified GREEN (orchestrator, s6
  2026-05-18).** `git show 59d34786 --stat` = EXACTLY one file
  `load-hud-commands.ts` +28/-1 ("F15 -- Track-B HUD adapter asserts its
  owned source_state on the existing-entity path"); `59d34786` in
  `git log`. Dev DB (`docker exec qw-oracle-postgres-dev psql -U qworacle
  -d qw_oracle`) `entities` ezquake/command source_state crosstab =
  `{doc_only:7, source_backed:624, source_retired:62}`, total **693** --
  the F13-recalibrated CORRECT clean-load expectation (NOT the F15
  612/19/62 bad state). The 12 F15 names (`radar, bar_armor, bar_health,
  itemsclock, netproblem, score_difference, score_enemy, score_position,
  speed, speed2, teamholdbar, teamholdinfo`) ALL `source_backed`; the 7
  legit doc_only (`gl_checkmodels, gl_inferno, gl_setmode, in_evdevlist,
  legacyquake, mp3_volume, validate_clients`) ALL still `doc_only`.
- **Pin BOTH legs = `3f9e724fa608e516040f02b9557808ff3efda53e`**
  (`git -C research/repos/ezquake-source rev-parse HEAD` AND `oracle_meta
  ezquake:source_repo_commit`). If a leg has moved at execution: STOP
  (Verification 1 FAIL -- the dump cross-check is version-noise; X8/W2).
- **qw_oracle_test was RESET WHOLE by the orchestrator (RE-VERIFY prep --
  s5 broke it; the dev DB was never touched).** Both `community` + `public`
  schemas present, 15 migrations applied (001->015), `public.entities` +
  `public.command_versions` exist. Confirm at start:
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle_test
  -tAc "SELECT count(*) FROM schema_migrations;"` == `15`. If it is broken
  (count != 15, or a `relation "players" already exists` throw on
  re-migrate), the both-schema reset is:
  ```
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle_test -c \
    "DROP SCHEMA IF EXISTS community CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"
  cd apps/qw-oracle && DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun db/migrate.ts
  ```
  VERIFY the target is `qw_oracle_test`, NEVER `qw_oracle` (dev is
  verified intact at 10905 total / ktx 1828 / ezq cmd 693 -- it MUST stay
  so; never run a DROP/`--reset`/`--force`-clean against `qw_oracle`).
- **Phase-4's OWN deliverables were independently orchestrator-verified
  GREEN at the s4 gate** (the acceptance contract sound; F7 PRIMARY
  embedded-SHA proxy incl. tamper-B trips-PRIMARY-alone; stage-1 pure
  subprocess COMPOSITION; level-3 stamp EXACT -- Track-A
  `{gl_outline_scale_world, sb_qtvlist_url}`, Track-B 129, `cl_bobhead`
  build-excluded stays L2 OQ-3; CARRY-FORWARD 1 held;
  `F1.runtime_fidelity_shape` + `F1.jsonb_columns_not_strings` PASS;
  F8 held). The ONE Phase-4 leg s4 could NOT complete in-budget = the
  full end-to-end `--stage all` harness (~540s serial extractor) -- the
  RE-VERIFY MUST land it (check 3). The F15-fix s5 re-gate already ran 3x
  `extract-tag --force` BYTE-IDENTICAL 624/7/62 (no period-2 oscillation,
  ktx untouched) -- the RE-VERIFY confirms it on the FULL clean boundary,
  not just a spot crosstab.

---

## The unit of work -- the 9 Phase-4 boundary checks + the F15-fix DELTA

Execute the **9 checks in the Phase-4 MD `## Verification (phase boundary)`
section, verbatim** (the exact copy-paste commands are there; checks 2/4/5/6
invoke the Task-2 / Task-4 Verification sub-blocks -- run those too). Honor
every F12/F14 dated correction (use `extract-tag` not `load-version`;
canonical `qw_oracle_test`-DB `bun test`; `extract-tag.ts` not
`load-version.ts`).

Ordering discipline (checks 4/5/7 deliberately mutate DB state):
1. Run the GREEN-baseline + read-only checks FIRST -- **1** (pin), **2**
   (proxy + tamper A + tamper B + front1-diff.sh byte-immutable), **3**
   (`accept-runtime-truth.py --stage all` -- the ~540s leg; consider
   running it backgrounded and polling), **9** (X9 grep), then **6**
   (slot-3-only CARRY-FORWARD 1), **8** (F1 + the F15 DELTA below).
2. Then the NEGATIVE scenarios that mutate state -- **4**
   (deliberately-failed probe -> LOUD no-signal), **5**
   (deliberately-broken pin -> ZERO level-3), **7** (toggle-off ==
   today's pipeline byte-for-byte). After EACH negative scenario, restore
   GREEN by re-running the harness + `extract-tag --project ezquake
   --version head --force --skip-release-notes` (X9 re-extract, never
   hand-SQL).
3. **FINAL idempotency seal:** after all 9, run ONE more
   `extract-tag --project ezquake --version head --force
   --skip-release-notes` and re-pull the `entities` ezquake/command
   crosstab -- it MUST be `{doc_only:7, source_backed:624,
   source_retired:62}` / 693 (the DB ends in the clean idempotent GREEN
   state; F15's whole point is re-load idempotency -- prove the RE-VERIFY's
   repeated re-loads did not re-introduce the divergence).

**The F15-fix DELTA (THE reason this RE-VERIFY exists -- check 8 +
all-project F8):** at the s4 checkpoint the 3 F15-family probes were
expected-RED and SCOPED OUT (a routed pre-existing blocker). Post-F15-fix
they MUST now be **CLEARED**. In check 8, report these THREE with their
actual literals (NOT "no regression FAIL"):
- `F1.ezquake.floor.command_source_state` == `{source_backed:624,
  doc_only:7, source_retired:62}` (NOT 612/19/62 -- F13-INVERSE; the floor
  snapshot was NOT recalibrated).
- `F1.ezquake.anchor.doc_only_count` == `57` (NOT 69).
- `F1.cross_type_orphans` == `0` (NOT 12).
Plus Phase-4's OWN: `F1.runtime_fidelity_shape` PASS (incl. the
level-3-pinned-only assertion), `F1.jsonb_columns_not_strings` PASS,
`command_count` 693, the `bun test quality-grid.test.ts` (canonical
`qw_oracle_test`-DB form) GREEN incl. the level-3-at-non-pinned FAIL case.

**F8 all-project gate (cross-arc, mandatory):** run the F1 quality-grid for
**every project**, not just ezquake (`npm run load-knowledge --
quality-grid` with no `--project`, or per-project). Expected: ezquake 0
regression FAILs (the 3 F15-family now CLEARED + F13 floor GREEN
NOT-recalibrated); mvdsv/fte/qwcl fully clean; **ktx's 2
`log_template`-floor FAILs are PRE-EXISTING sibling ktx-mvdsv arc
calibration drift (1196 vs 1195) -- independently confirm they are
structurally impossible to be F15-caused (disjoint project/type/loader;
`load-hud-commands.ts` is ezQuake-Track-B-only), NOT introduced by anything
in this RE-VERIFY**; ktx `describe_fill.*` GREEN; no ktx-mvdsv file
touched; `ktx_sentinel` (`SELECT count(*) FROM entities WHERE
project='ktx'`) == `1828` constant before AND after (cross-arc
non-interference witnessed). `git log --oneline --since="2026-05-18" --
apps/qw-oracle/scripts/load-knowledge/ apps/qw-oracle/db/migrations/` for
sibling-arc drift before AND after.

---

## Hard constraints (cumulative -- all bind)

- **F13-INVERSE: do NOT recalibrate the floor.** `624/7/62` is the CORRECT
  expectation. If check 8 shows the floor still RED at 612/19/62, the F15
  fix did NOT hold on the full boundary -- HALT with the actual crosstab;
  do NOT "fix" it by editing `quality-grid.ts`. Never touch the F13
  calibrated snapshot or the ktx `describe_fill` region.
- **X9: repair by re-extract, NEVER an in-place SQL UPDATE.** Every DB
  restore between checks is `extract-tag --project ezquake --version head
  --force --skip-release-notes`. An `UPDATE ... SET` of any
  `entities`/`*_versions` row is automatically the wrong instinct.
- **Do NOT edit the shipped probes / harness / loaders / proxy.** The
  negative scenarios (check 4 failed-probe, check 5 broken-pin) use an
  env/arg the probe honors OR a COPY with one assertion inverted OR a
  tampered-dump file -- NEVER an edit to the shipped
  `verify-*-probes.py` / `version-pin-proxy.sh` / `accept-runtime-truth.py`.
  `git diff --quiet apps/qw-oracle/data/detection/front1-diff.sh` MUST hold
  (check 2).
- **F8 / shared-substrate.** The F15 fix is in `load-hud-commands.ts`
  (ezQuake-Track-B-only, ZERO contact with the F8-shared `natural-keys.ts`
  / retreat / prune / `quality-grid.ts`). The all-project F1 grid is the
  gate that proves the RE-VERIFY did not perturb the STILL-ACTIVE
  ktx-mvdsv arc. NEVER `git add -A`; NEVER touch ktx-mvdsv files.
- **This is NOT a `decisions.md` amendment** and NOT a phase. If you
  believe a D is genuinely wrong, HALT and surface to the
  orchestrator/operator -- do not amend, do not redesign, do not lower a
  probe.
- **`rm -rf` is harness-blocked.** Use `mktemp -d`. The Phase-4 MD's
  literal `/tmp/broken-dump.txt` etc. via `head`/`sed` redirection are
  fine (not `rm`); clean them with plain file ops or leave them.
- ASCII only (X10) in any shipped doc; `--` for dashes; no em/en-dash, no
  emoji.
- Commit cadence: you do NOT commit the boundary flip (orchestrator owns
  it). If you must commit anything (you should not need to -- the RE-VERIFY
  is read-mostly + re-load), scoped `git add` ONLY, NEVER `git add -A`,
  end messages `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`,
  do NOT push. Pre-existing session-start drift (`.claude/settings.json`,
  slipgate `fte-asset-bundle.json`, `docs/superpowers/**`, untracked
  extractor-output JSONs, `qw-oracle.db`, `.lock`) is NOT this arc's --
  do NOT sweep it.

## Execution-mode

This is verification execution (X5/X6): the `--stage all` harness + the
extract-tag re-loads are long-running real pipeline runs -- run them for
real, full effort on the per-check adjudication (a wrong "GREEN" ships a
false boundary). Near-zero inline; no subagent fan-out needed (this is one
sequential boundary). Background the ~540s harness if it helps you not block.

## HALT contract (structured -- the orchestrator independently re-gates this; "all 9 PASS" without per-check output is BOUNCED)

Do NOT report "all pass". Report:

- **STATUS:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED.
- **Per-check (1..9), each with the ACTUAL output:**
  - 1: both pin legs (the two literal hashes).
  - 2: the `version-pin-proxy.sh` PRIMARY-SHA + 2 SANITY leg `[PASS]/[FAIL]`
    lines + `exit=` for the in-repo run, tamper A, tamper B; the
    `front1-diff.sh BYTE-IMMUTABLE` line.
  - 3: the literal `STAGE 1 GREEN`/`STAGE 2 GREEN`/`STAGE 3 OK` banner +
    `exit=`; `acceptance-validated-ezquake.json` `status`+`validation_commit`;
    `level3-stamp-set-3f9e724f.json` `proxy:` + the `track_a_dump_confirmed`
    / `track_b_dump_confirmed` counts (Track-A should be
    `{gl_outline_scale_world, sb_qtvlist_url}`; Track-B 129).
  - 4: the LOUD banner text + the validation-record `status` + the
    `track_a_reachability IS NOT NULL` count (expect 0) + 8-F6-stem diff
    result.
  - 5: the `dump-confirmed` UNION count (expect 0).
  - 6: the pre/post JSONB for the 3-gate + radar entities -- show that ONLY
    `dump_confirmation` differs (conclusion+evidence byte-identical).
  - 7: the 8-stem `diff -q` loop output (expect empty) + the
    `track_a_reachability IS NOT NULL` count (expect 0).
  - 8: the F1 grid Summary line + the 3 F15-family probe literals
    (`command_source_state` 624/7/62, `doc_only_count` 57,
    `cross_type_orphans` 0) + `runtime_fidelity_shape` +
    `jsonb_columns_not_strings` + `command_count` + the `bun test` result.
  - 9: the literal `X9 PATH OK` line (or the offending grep hit).
- **F8 all-project grid:** the per-project PASS/FAIL summary (ezquake 0
  regress; ktx the 2 pre-existing `log_template` FAILs proven not-F15;
  mvdsv/fte/qwcl clean; ktx `describe_fill` GREEN); `ktx_sentinel` before
  and after; the `git log` sibling-drift check.
- **FINAL idempotency seal:** the post-final-re-load ezquake/command
  crosstab (MUST be 624/7/62 / 693).
- **Scope:** confirmation no shipped probe/harness/loader/proxy edited; no
  ktx-mvdsv file touched; no F13 floor / `describe_fill` edit; no
  `decisions.md` amendment; no README/arc-history flip; the working tree
  state (only expected re-load artifacts / `/tmp` tamper files).
- Then STOP. The orchestrator independently re-runs the decisive legs
  (at minimum: the ezquake F1 grid incl. the 3 F15-family literals, the
  harness GREEN banner + exit, the X9 grep, the pin both legs) -- your
  GREEN is a hypothesis until it does. Do NOT flip the boundary, do NOT
  proceed to Phase 5.

## Recovery

If a check FAILs: consult the Phase-4 MD `## Recovery` (per-failure-mode;
X9 -- re-run the corrected accept+extract+load, NEVER an in-place UPDATE).
If the 3 F15-family probes are STILL RED at 612/19/62 on the full boundary:
the F15 fix did not hold under the full RE-VERIFY's repeated re-loads --
HALT with the actual clean-vs-reload crosstab + which re-load introduced the
divergence; do NOT recalibrate, do NOT widen scope, do NOT hand-SQL. If the
DB is left mid-divergence, it is fully reproducible via `extract-tag
--project ezquake --version head --force` (post-fix). Unanticipated failure
-> HALT structured with the exact command + output for the orchestrator to
route; do not improvise a fix that mutates rows, the 8 byte-identical stems,
the Phase-1/2 mechanism, or any ktx-mvdsv substrate.
