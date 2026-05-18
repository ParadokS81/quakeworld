# Execute Phase 5 of enforce-L1-runtime-truth (the LAST phase -- the arc completes)

You are an **arc-executor** in a FRESH terminal, EXECUTION mode. You are NOT
drafting. You are NOT arc-orchestrator. The unit of work is **Phase 5 --
Application outputs**, the TERMINAL phase: at its boundary both North-Star
directions are met for ezQuake (L1 no longer SHOWS non-working entities; L1
no longer HIDES working commands). Phases 1-4 are SHIPPED. There is no
Phase 6 -- nothing depends on this phase (X2 by construction; W4 vacuous).

Arc: `2026-05-17-enforce-l1-runtime-truth` (libclang call-graph reachability
+ HUD hidden-command recovery; Track A / Track B; D1-D22 + X1-X10;
ezQuake-only; 74 cmd / 92 cvar / ~129 reverse). SELF-CHECK -- you are in the
WRONG arc and must HALT if you see: "describe-fill" / "C1-C5 / P1-P5" / KTX
or MVDSV man-pages (the SEPARATE still-active
`2026-05-16-ktx-mvdsv-l1-describe-fill` arc); "Postgres port / pgvector /
RRF / 31-table" (`2026-05-02-qw-oracle-arc1`); "qwiki / MediaWiki / Page
Forms" (a qwiki arc). HALT and tell the operator if so.

Repo root: `/home/paradoks/projects/quakeworld`
Scaffold:  `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`

---

## Read COLD before touching anything (in this order)

1. The scaffold per README "read in this order": `prerequisites.md`;
   `decisions.md` (D1-D22 + the **D5/D7/D11 AMENDMENTS** + X1-X10 +
   non-goals IN FULL -- the brainstorm is CLOSED, do NOT re-open a D; if a D
   genuinely looks wrong HALT and surface a deviation, never silently
   comply/override); `review-findings.md` (Phase 5 owns role **"APP": R4
   (OWN -- delete-list regenerates the in-repo artifact byte-shape), F2 (use
   74/92/129, NEVER the stale 97), F6 (the X3 8-stem byte-identical check on
   the end-to-end run), W2, W4**; plus the standing rules **F8** the
   cross-arc ktx-mvdsv hazard, **F15 RESOLVED** `59d34786` consumed-state
   context, **F17 OPEN-tracked NON-Phase-5-blocking -- do NOT fold it in**,
   **F16** benign ADVISORY); `phase-template.md`; `README.md` (Phases 1-4
   `shipped`, Phase 5 `approved`).
2. **`phase-5-application-outputs.md` IN FULL** -- this is your executor
   contract; it is self-contained (Goal / Recon facts / Inputs / Files
   touched / 3 Tasks / 8-check phase-boundary Verification / Outputs /
   Open questions [OQ-1 + OQ-2 RESOLVED operator-ratified] / Recovery /
   sub-agent outcome). The APPROVED `phase-4-acceptance-contract.md`
   "Outputs" region (the SHIPPED+TESTED pure `route_by_level` enum contract
   you CONSUME) + `phase-3-unified-schema-loader.md` "Outputs" region (the
   Track-A/B evidence shape you READ -- no persisted registrar; OQ-2's
   basis) as needed.
3. Optional context (path narrative only -- the authoritative state is the
   live re-verify below): the s6->s7 resume
   `docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-execution-orchestrator-resume-s6-to-s7.md`;
   `apps/qw-oracle/docs/arc-history.md` enforce-L1 entry.
4. The live source surfaces (the synthesis targets -- read, do not assume):
   - The house generator split to mirror EXACTLY:
     `apps/qw-oracle/scripts/build-help-json-pr-digest.py` +
     `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest.py`
     + `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_pr_digest.py`.
   - The byte-shape regen TARGET (carries the STALE "97 cvars / 74 commands"
     to be corrected to the live-re-derived 92/74; the embedded-SHA /
     zero-skew framing PRESERVED):
     `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`.
   - The Phase-4 SHIPPED predicate -- CONSUMED, never re-implemented:
     `extractor_lib/_acceptance.py` `route_by_level` + its test
     `extractor_lib/tests/test_acceptance.py`.
   - The banked X8/W2 sanity-gate predicate to RE-RUN (-> 74/92/129):
     `apps/qw-oracle/data/detection/front1-diff.sh` + the in-repo dump
     `apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt`.
   - The F1 idiom to EXTEND (do NOT rewrite the Phase-3/4
     `F1.runtime_fidelity_shape`): `apps/qw-oracle/scripts/load-knowledge/
     quality-grid.ts` + `quality-grid.test.ts`.
   - The Phase-4 harness Phase 5 runs end-to-end as a precondition:
     `apps/qw-oracle/scripts/extractors/ezquake/accept-runtime-truth.py`.
5. Memory (the lens): `feedback_verify_dispatched_terminal_claims`,
   `feedback_parking_verified_state_is_hypothesis` (THIS block is a
   hypothesis -- re-verify), `reference_rigor_bar_follows_consumer` (the
   delete-list is an AUTONOMOUS PUBLISHED VERDICT consumed UNSEEN by
   nano/slime -- the strict-bar consumer; that is why Task 1 is Opus MAX and
   check 6 is operator-mandatory), `feedback_repair_by_reextract_not_sql_update`
   (X9 -- the generator is READ-ONLY on the DB; recovery is fix-the-generator
   + re-run, NEVER an in-place SQL UPDATE), `feedback_cross_phase_audit_shared_file_drift`
   / F8 (ktx-mvdsv describe-fill is a STILL-ACTIVE sibling arc on
   `quality-grid.ts` / migrations / `natural-keys.ts`),
   `feedback_idempotency_before_staleness` (the generator MUST be
   byte-idempotent -- run it twice, diff), `feedback_no_subagents_for_mechanical_edits`
   (BUT Phase 5 is code synthesis -> subagent-default, near-zero inline),
   `reference_destructive_rm_harness_gate` (`rm -rf` harness-blocked).

---

## State the orchestrator independently verified vs LIVE this session (HYPOTHESIS -- re-verify; do not trust on faith)

Per `feedback_parking_verified_state_is_hypothesis` this is the record of
the path, NOT a contract. The s6->s7 cheap-verify was RE-RUN live by the
orchestrator opening this terminal (2026-05-18); re-confirm each before you
rely on it.

- **Pin BOTH legs = `3f9e724fa608e516040f02b9557808ff3efda53e`** -- git
  `research/repos/ezquake-source` HEAD AND `oracle_meta
  ezquake:source_repo_commit`. A moved pin at execution invalidates the
  level-3 stamp Phase 5 filters on -- STOP and re-pin/re-extract with the
  operator (X8/W2). This is phase-boundary check 1, run it FIRST.
- **Consumed P4->P5 contract GREEN (matches the Phase-5 MD "Inputs from
  previous phase" verbatim -- no drift):** dev `qw_oracle` clean idempotent.
  `command_source_state = {source_backed:624, doc_only:7, source_retired:62}`
  total `693`; `cvar_count 2992`; F1 grid `132 probes, 130 clean, 0
  regression failures` (the 2 anomalies are the CALIBRATED expected pair --
  `F2.doc_only_crosstab` 57 informational + `F2.default_value_ping_pong`
  gl_lightmode, itself a PASSing F1 anchor -- NOT defects);
  `F1.runtime_fidelity_shape` PASS, `F1.jsonb_columns_not_strings` PASS,
  `F1.cross_type_orphans` PASS.
- **Level-3 stamp set:** `cvar_versions` dump-confirmed == `2`;
  `command_versions.track_b_hud_recovery` dump-confirmed == `129`. The JSONB
  key is `dump_confirmation`; values seen are in
  `{"high-confidence-generalized" (level-2), "dump-confirmed" (level-3)}`.
  build-excluded rows carry `high-confidence-generalized` (permanently
  level-2 -- Phase-4 OQ-3; structurally unreachable by your level-3 filter).
- **F8 ktx_sentinel:** `SELECT count(*) FROM entities WHERE project='ktx'`
  == `1828`. This MUST stay `1828` before and after your run.
- **README Phase-4 `shipped` / Phase-5 `approved`; F15 RESOLVED
  `59d34786`; F17 OPEN-tracked NON-Phase-5-blocking; F16 benign ADVISORY.**
  The R4 regen target
  `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
  exists (4814 bytes, the STALE-97 in-repo artifact).
- **OQ-1 + OQ-2 are RESOLVED, operator-ratified 2026-05-17 -- do NOT
  re-litigate them.** OQ-1: the render helper carries Class-3 +
  Attribution + Channel/Routing as FIXED template constants (verbatim from
  the shipped artifact at the Task-1 lock) + a one-line provenance note
  marking Class 3 a SEPARATE non-call-graph (cmdline-consumer-presence)
  feeder. OQ-2: the generator renders the byte-SHAPE + the per-variant
  signal evidence + the entity's L1 `*_versions` declaration cite + a
  TEMPLATED per-feeder disposition line; it does NOT fabricate or hand-copy
  the original hand-authored investigative narrative (that would invent
  facts the signal does not carry -- the dishonest-KB failure this arc
  exists to prevent). Neither is a `decisions.md` amendment.

## Hard constraints (cumulative -- all bind)

- **CONSUME, never re-implement (D1/X2/augmentation pt 1).** The generator
  `from extractor_lib._acceptance import route_by_level` and CALLS it. It
  does NOT re-implement level routing, does NOT re-run the dump cross-check,
  does NOT re-decide genuine-dead. If `route_by_level` itself misbehaves
  that is a Phase-4 bug -- HALT and bounce, do NOT route here.
- **No Track-A/Track-B blend (D1/D20 -- structural).** The delete-list
  generator's signal query SELECTs ONLY `track_a_reachability`; it NEVER
  reads `track_b_hud_recovery`. The recovered HUD commands are a SEPARATE
  first-class output (D21), certified by the Task-3 F1 probe + the
  phase-boundary SQL -- not via the delete-list.
- **X7 -- no detection re-run.** You RE-RUN the BANKED `front1-diff.sh`
  proxy against the BANKED in-repo dump (the X8/W2 sanity gate -> 74/92/129)
  -- that is NOT a fresh detection capture. The pool figure in the artifact
  is the live-re-derived constant `92 cvars / 74 commands`, NEVER the stale
  97, NEVER re-detected.
- **X9 -- the generator is READ-ONLY on the DB.** It SELECTs the signal and
  `write_text`s a `.md`; ZERO DB writes. A wrong artifact = fix the
  generator/render helper + re-run the deterministic generator. A wrong L1
  signal = bounce to the owning Phase + re-run extract+accept+load
  end-to-end -- NEVER an in-place SQL UPDATE.
- **X10 ASCII only:** `--` for dashes, no em/en-dash, no emoji, in code,
  the generated `.md`, and any shipped doc (the Phase-5 sub-agent already
  caught + fixed one self-referential X10 defect in the MD -- hold the
  line in the generator output too: the check-5 probe is
  `LC_ALL=C grep -nP '[^\x00-\x7F]'`).
- **The mixed-archetype OPERATOR-RUN floor (augmentation pt 7).** Check 6
  (the operator eyeballs the regenerated artifact as nano/slime would) is
  MANDATORY and is the FLOOR; the automated byte-shape-diff (check 5)
  stacks ON TOP and does NOT replace it. A purely-automated sign-off of
  the artifact is itself a FAIL. You PRESENT the regenerated artifact for
  the operator's eyeball; you do NOT self-certify check 6.
- **F8 / ktx-mvdsv shared substrate.** `quality-grid.ts` /
  `quality-grid.test.ts` are also touched by the STILL-ACTIVE ktx-mvdsv
  describe-fill arc. ADD two new probes; do NOT rewrite the Phase-3/4
  `F1.runtime_fidelity_shape`; do NOT touch the F13 floor or any ktx
  `describe_fill.*` region. `git log --oneline --since="2026-05-17" --
  apps/qw-oracle/scripts/load-knowledge/ apps/qw-oracle/db/migrations/` for
  sibling-arc drift before AND after. Post-run gate: F1 quality-grid GREEN
  for ezQuake AND ktx AND every other project; `entities project='ktx'`
  still `1828`. NEVER `git add -A`; NEVER touch any ktx-mvdsv file.
- **F17 is NON-Phase-5-blocking and is its OWN scoped follow-up.** Do NOT
  fold it into Phase 5. Phase 5 runs the pipeline GREEN; F17 does not
  touch its correctness.
- **NOT a `decisions.md` amendment.** OQ-1/OQ-2 are RESOLVED Phase-5-scoped
  application choices, not refuted premises. If a D genuinely looks wrong,
  HALT and surface -- do not amend, do not silently comply.
- **Commit cadence (the executor ships ONE commit; the orchestrator owns
  the boundary).** Scoped `git add` of ONLY Phase-5's shipped files: the
  3 created (`scripts/build-runtime-dead-entities.py`,
  `extractor_lib/_runtime_dead_entities.py`,
  `extractor_lib/tests/test_runtime_dead_entities.py`), the 2 modified
  (`quality-grid.ts`, `quality-grid.test.ts`), and the regenerated
  `docs/upstream-prs/ezquake-runtime-dead-entities.md`. ONE ship/record
  commit; report its SHA. End the message with
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Do NOT push
  (operator's call at wrap). Do NOT flip README / arc-history, do NOT
  `git tag`, do NOT write the arc-reviewer handoff -- the orchestrator
  owns the second (boundary-flip) commit + the `git tag -a
  arc-enforce-l1-runtime-truth-shipped` + the POST-ARC arc-reviewer
  handoff AFTER independently re-gating your halt.

## Execution-mode (per the Phase-5 MD task annotations -- enforce them)

This is a code-synthesis phase: subagent-default, near-zero inline.

- **Task 1 -- lock the byte-shape + consumption contract: `subagent (Opus
  MAX)`.** THE cross-cutting application-output contract design (the same
  Opus-MAX-lock precedent Phase-3 Task-1 + Phase-4 Task-1 used): the
  delete-list is an autonomous published verdict consumed UNSEEN by
  nano/slime; a wrong byte-shape / level filter / Class-3 reconciliation
  ships a wrong "delete this" upstream PR. The subagent independently
  re-derives the byte-shape + consumption contract from the LIVE artifact +
  the APPROVED Phase-3/4 MD "Outputs" + live schema and returns a STRUCTURED
  PASS/FAIL shape-match report (prose alone is not the deliverable).
- **Task 2 -- generator + render helper: `subagent (Sonnet medium)`.**
  Mechanical synthesis against the Task-1 LOCKED shape + the
  `build-help-json-pr-digest.py` house split. Starts ONLY after Task 1's
  lock is subagent-confirmed (sequential within the phase).
- **Task 3 -- F1 application-boundary probes + tests: `subagent (Sonnet
  medium)`.** Probe+test authoring against the locked level vocabulary +
  the `quality-grid.ts` idiom. Depends on Task-1's lock; independent of
  Task 2.

If you find yourself running >70% inline on this code-synthesis phase, STOP
-- that is the qw-oracle Arc 1 inline-execution defect; re-dispatch per the
annotation.

## HALT contract (structured -- the orchestrator independently re-gates this)

Do NOT report "done" / "shipped". Report:

- **STATUS:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED.
- **Task 1 lock:** the locked byte-shape + `route_by_level` consumption
  contract + feeder->Class mapping; the Opus-MAX subagent's structured
  shape-match PASS/FAIL outcome (CRITICAL/SUBSTANTIVE/ADVISORY counts + how
  each resolved).
- **Tasks 2-3:** the generator + render helper + test + the two new F1
  probes + their test rows -- the diffs (files + hunks), the stderr
  one-line summary (per-Class entry counts + pool figure).
- **The 8 phase-boundary checks with ACTUAL output (not prose claims):**
  1 pin both legs `3f9e724f`; 2 the X8/W2 sanity gate -> `command
  CANDIDATES 74 / cvar CANDIDATES 92 / command reverse 129`, SANITY GATE
  both legs `[PASS]`; 3 the full pipeline end-to-end (`accept-runtime-truth.py
  --stage all` exit 0, `load-version --force`) + the signal-over-pool
  crosstab SQL (every build-excluded row level-2; every dump-confirmed row
  genuine-dead); 4 F1 GREEN incl. `F1.callgraph_signal_pool_coverage` +
  `F1.hud_recovery_first_class` + the Phase-3/4 `F1.runtime_fidelity_shape`
  + `F1.jsonb_columns_not_strings`, 0 regression FAIL, the test file
  passes incl. the new FAIL cases; 5 the delete-list automated probe
  (idempotent byte-stable re-run, headings in the Task-1-locked order,
  every `### ` under Class 1/2, NO `build-excluded`, `92 cvars / 74
  commands` present + `97` absent, ASCII clean, imports `route_by_level`,
  never reads `track_b_hud_recovery`); 7 the D21 radar trio
  (`radar`/`+hud_radar`/`-hud_radar` all `command`/`source_backed`, never
  NULL `dump_confirmation`); 8 the X3 8-stem byte-identical diff (empty).
- **Check 6 is the operator's:** present the regenerated
  `ezquake-runtime-dead-entities.md` for the operator's MANDATORY eyeball
  (Class 1/2 credible level-3 dump-confirmed genuine-dead with resolving
  cites; Class 3 carried + OQ-1 provenance note; honest mechanism-generated
  "How these were found" with the corrected 92/74). Do NOT self-sign it.
- **F8 cross-arc gate:** the all-project F1 grid (ezQuake + ktx + others
  GREEN; ktx `describe_fill.*` + every `*.floor.*_source_state` GREEN);
  `git log` sibling-drift before+after; confirmation `entities
  project='ktx'` still `1828` and no ktx-mvdsv file touched.
- **Scope:** confirmation NOT a `decisions.md` amendment; the scoped
  `git add` file list; the ONE ship/record commit SHA.
- Then STOP. The orchestrator independently re-runs the decisive legs (R4
  byte-shape regen vs the in-repo artifact, the level-3-only genuine-dead
  filter, the two F1 application probes, the F8 all-project grid +
  ktx_sentinel 1828), then -- and ONLY then -- does the boundary-flip
  commit + `git tag` + the arc-reviewer handoff. Do NOT do those yourself.
  Do NOT start the help-JSON doc-gap arc or any FTE/QWCL/MVDSV onboarding
  (sequenced separate future arcs -- scope held).

## Recovery (per the Phase-5 MD Recovery section -- consult it in full on any FAIL)

Pin moved (check 1) -> STOP, re-pin/re-capture with operator (not a code
bug; X7). Sanity gate not 74/92/129 (check 2) -> STOP, do NOT weaken the
gate (it is the Phase-4 answer key). Harness non-zero / signal not over
pool (check 3) -> a Phase-1-4 deliverable regressed or toggles off; bounce
to the owning Phase + re-run, Phase 5 authors NO mechanism. F1 regression
(check 4) -> a probe rewrote (not extended) the Phase-3/4 probe or a
`JSON.stringify` slipped before a JSONB read
(`reference_postgres_js_jsonb_binding`); fix the probe, never lower it.
Byte-shape/level/figure wrong (check 5) -> fix the generator/render helper
+ RE-RUN (deterministic from the signal); `route_by_level` misbehaving is a
Phase-4 bug, bounce. Operator flags a false accusation/incoherent artifact
(check 6) -> either the Phase-4 stamp is wrong (bounce to Phase 4) or the
render is dishonest (fix the render helper + re-run); NEVER hand-edit the
generated `.md` to make the operator pass. Recovered command withheld
(check 7) -> Phase-3 emission / Phase-4 stamp bug, bounce. X3 stem diff
(check 8) -> impossible by design; find the write, make Phase 5
post-load/read-only again, re-diff, do NOT patch the diff. If you corrupt
the dev DB mid-run it is fully reproducible via `extract-tag --project
ezquake --version head --force` (X9, never hand-SQL it back; `rm -rf`
harness-blocked -- use `mktemp -d` / a throwaway test DB / drop+migrate).
Unanticipated -> route to operator with the exact command + output + the
generated `.md` + the stored Track-A/B JSONB for the level-3 entities and
the radar trio; do not improvise a mutating fix.
