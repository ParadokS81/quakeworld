# Resume: enforce-L1-runtime-truth EXECUTION orchestrator -- session 3 -> session 4

**For:** arc-orchestrator, FRESH terminal, EXECUTION mode (NOT drafting; NOT
arc-reviewer). Execution-orchestrator session 3 ran cold pre-flight
(every s2->s3 "verified" claim independently re-checked vs LIVE -- all
GREEN), dispatched + received + independently 3-way-gated the Phase-3
arc-executor halt (DONE_WITH_CONCERNS), shipped Phase 3 (commits
`895817bb` ship + `8ed860fe` README-flip), applied the F12 dated
MD-correction + the F13 floor recalibration + confirmed F11 accept-as-is,
re-verified F1 FULLY GREEN post-fix, and handed off at THIS clean
Phase-3-shipped boundary rather than push into Phase 4 (Phase 4 is the
acceptance phase -- the arc's heaviest verification regime: OPERATOR-RUN
floor, D19 dump-as-overriding-answer-key, R6 version-pin proxy re-run, F7
embedded-SHA sub-gate, the D18 combined harness; the judgment fidelity
needs a fresh full budget -- symmetric to the s2->s3 Phase-2-shipped
handoff). You are COLD -- read before acting. You do NOT execute phase
code; you dispatch arc-executor terminals, independently re-verify each
boundary vs LIVE source, own cross-phase memory, judge fresh-terminal
handoffs on budget.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Model: draft-then-execute, 5 phases, fully SEQUENTIAL (1->2->3->4->5; each
ships a runnable byte-identical state + commits before the next). README
phase index is authoritative. All 5 MDs APPROVED; pre-execution
cross-phase audit RAN + CLEARED (F8). EXECUTION underway.

Status:
- **Phase 1: SHIPPED** -- commit `51604f67` (session 1; F9 caught +
  operator-ratified D5 AMENDMENT; orchestrator-3-gate-GREEN + X3
  byte-identical two ways). Untouched s2/s3.
- **Phase 2: SHIPPED** -- commits `3c136826` + `b23f96eb` (session 2; no
  deviation; R1 GREEN; C1 -> F10 dated MD-correction; orchestrator 3-way
  re-verified). Untouched s3.
- **Phase 3: SHIPPED** -- commit `895817bb`
  (`docs(arc-exec): enforce-L1 Phase 3 SHIPPED -- unified L1 fidelity
  schema+loader ...`) + `8ed860fe` (README Phase-3 -> shipped, refs
  `895817bb`). 16 files in the ship commit:
  `015_l1_runtime_fidelity_provenance.sql` (new, ordinal EXECUTOR-DERIVED
  live per F8 -- orchestrator independently re-derived 014->015, exactly
  one, no silent-corruption dup), `emit_callgraph_signal.py` (new, OQ-1
  Track-A serialization seam -> the additive 10th file
  `ezquake-callgraph-reachability-ast.json`, invoked from the EXISTING
  Phase-1 post-walk behind the SAME Phase-1 boolean -- D6 no-re-pay-parse),
  `load-callgraph-reachability.ts` (new, Track-A OVERLAY not-create --
  X7), `load-hud-commands.ts` (new, Track-B adapter -- D21
  `source_state='source_backed'` first-class `command` entities,
  D16 element-linked), `extract.py`/`extract-tag.ts`/`types.ts`/
  `natural-keys.ts`/`load-cvars.ts`/`load-commands.ts`/`quality-grid.ts`/
  `quality-grid.test.ts`/`SCHEMA.md` (v18) plumbing,
  `phase-3-unified-schema-loader.md` (F12+F13 dated corrections),
  `review-findings.md` (F11/F12/F13), `arc-history.md` (Phase-3 bullet).
  **TWO physically-separate nullable JSONB cols: `track_a_reachability`
  on `cvar_versions` AND `command_versions`; `track_b_hud_recovery` on
  `command_versions` ONLY** -- no CHECK, D12 structural no-blend (no
  `runtime_fidelity` col, no `kind`); D14 three-slot spine; D15
  feeder-tagged; D16 element-linked; **slot-3 uniformly level-2
  (`high-confidence-generalized`) -- Phase 3 NEVER stamps level-3; the
  dump cross-check is Phase 4 (D14/D19; X2/W4 held)**. OQ-1/OQ-2 the
  operator-ratified defaults (s3 confirmed coherent, NOT re-litigated).
- **Phase-3 boundary: orchestrator independently re-verified 3 ways**
  (executor "DONE_WITH_CONCERNS/PASS" treated as hypothesis --
  `feedback_verify_dispatched_terminal_claims`; the Phase-2 3-way method):
  STRUCTURAL (migration body 3 bare `ALTER ADD COLUMN JSONB`;
  information_schema 3 jsonb/nullable/no-CHECK; D12 SQL count=0; the
  COALESCE upsert read line-by-line in `natural-keys.ts:187-277`; ordinal
  independently re-derived 015, exactly one, no dup) + PRIMARY-SOURCE
  BY-SYMBOL (the 3-gate JSONB round-trip EXACT: `sb_qtvlist_url`
  genuine-dead/callgraph/unreachable-everywhere; `gl_outline_scale_world`
  genuine-dead/commented-register/`r_rmain.c:730`; **`cl_bobhead`
  build-excluded/callgraph/server=`reachable`** -- the F9 D5-amendment
  load-bearing assertion, conclusion `build-excluded` UNCHANGED;
  `radar`/`+hud_radar`/`-hud_radar` `source_backed` element-linked to the
  one `radar`, `hud_radar.c:1422`; slot-3 DISTINCT only
  `high-confidence-generalized`; cross-arc forensics -- 4 ktx-mvdsv
  commits during the run, NONE touched `db/migrations/` or
  `quality-grid.ts`) + EMPIRICAL (own F1 grid re-run -> only the 2 stale
  command floor probes RED; own `mktemp` OFF/ON X3 re-run, F10-explicit
  `CALLGRAPH_OFF=1 HUD_COMMANDS_OFF=1` -> 8 F6 stems byte-identical,
  9th+10th additive, 3312 signal entries - 10 skipped == 3302 == 2788
  cvar + 514 cmd Track-A populated [EXACT reconciliation]; post-fix F1
  grid FULLY GREEN 132 probes 0 regression failures; `npm run typecheck`
  exit 0). **P3->P4 contract a verbatim match** (Phase-3 "Outputs to next
  phase" == Phase-4 "Inputs from previous phase / From Phase 3";
  cold-verified s3 pre-flight).
- **F11 -- RESOLVED accept-as-is (orchestrator gate-confirmed).** The
  Task-2 subagent's `015` migration HEADER comment + (originally)
  `SCHEMA.md` v18 conflated Track-B's recovered-HUD scope with the
  Track-A 74/D20 pool. The SCHEMA.md leg was DRAINED in-place at
  execution (consumer-facing, editable). The applied-`015`-header leg is
  ACCEPT-AS-IS: it is sha256-tracked in `schema_migrations`, editing it
  is the silent-corruption class F8 exists to prevent (a `--reset` drops
  the whole schema; a manual un-apply is X9-forbidden); the migration
  BODY is canonical+correct; `SCHEMA.md` + Phase-3 MD + decisions
  D21/X7 all carry the precise scope; data-corroborated (loader loaded
  exactly 129 `track_b_hud_recovery` rows, all `type='command'`, 0 cvar
  -- R7 clean; 129 == X7 reverse-diff, a DIFFERENT set from the Track-A
  74/D20 pool). No code/schema/data/runtime impact; NO D-amendment. A
  future no-op `016` comment-only migration would be pure ceremony --
  not recommended.
- **F12 -- RESOLVED, orchestrator-applied dated MD-correction (the
  F6/F10 precedent).** The Phase-3 MD Task-3 Verification block +
  phase-boundary check 3 literal `bun scripts/load-knowledge/index.ts
  load-version --project ezquake --version head --force` is the WRONG
  subcommand (`load-version` requires --type/--json/--commit, ingests
  ONE single-type JSON, copy-run HARD-THROWS; correct entrypoint is
  `extract-tag`); check-5 + Task-4's bare `bun test
  scripts/load-knowledge/quality-grid.test.ts` fails the
  `qw_oracle_test`-DB safety guard. The executor ran the CORRECT commands
  at execution (extract-tag + canonical test-DB). Orchestrator applied a
  dated MD-correction (Task-3 block -> `extract-tag --skip-release-notes`;
  Task-4 + check-5 -> the `DATABASE_URL=...qw_oracle_test bun test`
  canonical form; check-3 references the Task-3 block so it inherits the
  fix), narrative-preserved house style (F6/F8/F9/F10), no redraft, no
  D-amendment, code/data correct. **Standing lesson (binds Phase-4/5):
  every phase MD literal verification command must be the ACTUAL working
  invocation -- `extract-tag` not `load-version` for a real
  extract+load+post-loop round-trip; the canonical `qw_oracle_test`
  `bun test` form (package.json `test` script) not a bare `bun test`.**
- **F13 -- RESOLVED, operator-routed recalibrate (orchestrator-applied;
  the F2/F4/F7 stale-recon family, NOT a D-amendment).** Phase-3's OWN
  correct D21/Track-B deliverable adds +129 first-class recovered HUD
  `command` entities, legitimately outgrowing the stale calibrated
  `quality-grid.ts` `ezquake.command` floor snapshot ->
  `F1.ezquake.floor.command_count` (564->693) +
  `..command_source_state` (source_backed 495->624) RED. Orchestrator
  independently primary-source-verified LEGITIMATE growth NOT
  idempotency inflation (693 DISTINCT name_fold, 0 dup,
  `UNIQUE(project,type,name_fold)` forbids re-run inflation, 693-129 ==
  exactly the prior 564 baseline intact, 129 == the Phase-2 handler
  `_stats.source_total`, doc_only=7/source_retired=62 UNCHANGED). The
  operator chose recalibrate+check-5-note. Orchestrator RECALIBRATED
  `quality-grid.ts` (`makeFloorCountProbe('ezquake','command',693)`,
  `makeFloorSourceStateProbe(...{source_backed:624}...)`, the inline
  dated note in the cvar-block house style, the `:1949` snapshot line)
  -- an F8-SCOPED SURGICAL edit, DISJOINT from the active ktx-mvdsv
  `F1.describe_fill.*` region -- and folded the expected-D21-growth note
  into the F12 dated check-5 MD-correction. The
  `reference_qw_oracle_floor_vs_clean_reload` family materialized again
  (a correct deliverable GROWS the floor; verify-before-crying-regression
  -> recalibrate the snapshot). NO `decisions.md` deviation (D20/D21/X7
  were always correct). Post-recalibration F1 grid FULLY GREEN, 0
  regression failures (orchestrator re-ran it -- not the executor's word).
- **COALESCE deviation -- VERIFIED SOUND, surfaced for arc-reviewer
  (NOT a blocker, NOT a D-amendment).** `natural-keys.ts`
  `upsertCvarVersion`/`upsertCommandVersion` use
  `COALESCE(EXCLUDED.col, table.col)` for the 3 NEW provenance columns
  ONLY; EVERY existing column keeps `= EXCLUDED.col` (X3 row-parity
  preserved exactly -- orchestrator read it line-by-line). Rationale
  (precise inline comments at `:226-234`/`:266-275`): the Track-B
  adapter + the Track-A overlay are TWO SEPARATE single-column writer
  passes sharing the MD-mandated upsert path + the MD-mandated
  overlay-runs-AFTER ordering; plain `=EXCLUDED` would let the post-pass
  NULL-clobber the earlier pass's column. COALESCE is the NECESSARY
  correct realization of D12 (independent columns) + the MD's own
  architecture -- the MD did not pre-specify the ON CONFLICT form
  (executor latitude, like Phase-2's OFF-env seam). Idempotent
  (re-load re-supplies both from their owning passes; 0 dup name_fold
  confirms). One theoretical edge: a pool-SHRINK between runs would
  leave a stale signal -- but X9 recovery is clean-reload (no "old" to
  persist) and the pool is banked/stable (X7), so not a Phase-3
  scenario. Flag for arc-reviewer awareness only.
- **Process note (recorded so arc-reviewer does NOT re-flag).** The
  executor's Task-3 subagent brief carried one wrong expected value
  (`cl_bobhead.address_taken_residue=true`). The Phase-3 MD does NOT
  gate on the residue value; Phase-1's OQ-3 self-validation
  (`verify-callgraph-probes.py`) mandates `false`; the loader faithfully
  round-tripped `false`; check-3 PASSES; the subagent correctly REFUSED
  to fabricate `true` (F5/X4). Orchestrator verified the DB shows
  `address_taken_residue=false` for `cl_bobhead` AND `sb_qtvlist_url`.
  A non-defect; no track.
- **No memory written this session.** Two candidate lessons assessed:
  (1) the COALESCE-shared-upsert-path pattern (two independent
  single-column writers sharing one upsert path need
  `COALESCE(EXCLUDED,table)` not `SET=EXCLUDED` or the post-pass
  clobbers) -- already captured by the precise `natural-keys.ts` inline
  comments + the arc-history Phase-3 bullet + the ship commit body (do
  NOT save what the repo records); surfaced to the operator as an
  OPTIONAL memory offer, not auto-written (memory writes are
  operator-approved). (2) `reference_qw_oracle_floor_vs_clean_reload`
  + `feedback_cross_phase_audit_shared_file_drift` were both correctly
  APPLIED + CONFIRMED this session (F13 is a fresh materialization of
  the floor memory; the F8 live-re-derive worked perfectly) -- neither
  refuted nor extended; the existing memories stand.
- **Phases 4, 5: not started.** Sequential; Phase 4 needs 1+2+3 +
  prereq-4 (durable dump -- CLOSED in-repo; R6 proxy RE-RUN at the
  Phase-4 boundary live -- X8/W2; the operator attests provenance).
  Phase 5 needs 4. **The sibling ktx-mvdsv describe-fill arc is STILL
  ACTIVE** and shares the migration chain + `quality-grid.ts` (its
  commits interleave the log -- a SEPARATE arc; NEVER touch its files or
  `git add -A`; the cross-arc drift is invisible to pairwise gates --
  `feedback_cross_phase_audit_shared_file_drift` / F8). At s3 ship the
  highest live migration ordinal is `015` (the enforce-L1 one; ktx-mvdsv
  last consumed `014`); RE-DERIVE LIVE at the Phase-4 boundary -- the
  Phase-4 migration-if-any is `(highest db/migrations/ int)+1`, never
  frozen (F8). Phase 4 may add NO migration (it is the acceptance
  harness + the additive level-3 stamp-set artifact, slot-3 only); if it
  does, F8 binds it.

Commits (arc-relevant; the parallel **ktx-mvdsv-l1-describe-fill** arc
interleaves the log -- SEPARATE arc, stay single-arc-scoped, NEVER touch
its files or `git add -A`): ... `51604f67` (**P1 SHIPPED**) ... `3c136826`
+ `b23f96eb` (**P2 SHIPPED**) ... `292d3ad5` (ktx-mvdsv, last before s3
ship) -> `895817bb` (**P3 SHIPPED**) -> `8ed860fe` (README P3 -> shipped)
-> this resume's session-wrap commit. Branch `main`, solo-dev silent
commits, no PR ceremony. **NOT pushed** -- the established rhythm is
push-at-wrap; `main` is many commits ahead of origin; **push is the
operator's call at session wrap** (surface it; do NOT auto-push).

**Repo working tree:** ~21 unrelated dirty files (HANDOVER.md,
`.claude/settings.json`, slipgate `fte-asset-bundle.json`, the
ktx-onboarding / qwiki / slipgate-managed-mode docs,
`.claude/scheduled_tasks.lock`, the empty 0-byte
`apps/qw-oracle/qw-oracle.db` SQLite RED HERRING [the real DB is the
`qw-oracle-postgres-dev` Postgres container; do NOT add or `sqlite3`
it], the `ezquake-help-json-empty-entries*.md` upstream-PR docs, the
qwiki parking docs, ...) PLUS the two REGENERABLE extractor output JSONs
`scripts/extractors/ezquake/output/ezquake-{hud-commands,callgraph-
reachability}-ast.json` (the 9th + 10th files -- NOT committed,
matching the P1/P2 pattern: regenerable artifacts, not in the P3 MD
"Files touched"; do NOT add them). NONE are this arc's source/scaffold.
Scoped `git add` of ONLY the phase's shipped files + this arc's scaffold,
EVERY commit. NEVER `git add -A`.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`
   (item 4 -- the durable dump -- CLOSED in-repo at
   `apps/qw-oracle/data/detection/`; Phase-4 RE-RUNS the R6 proxy live +
   the operator attests provenance), `decisions.md` (D1-D22 + the
   **D5/D7/D11 AMENDMENTS** + X1-X10 + non-goals IN FULL; do NOT
   re-open a D), `review-findings.md` (F1-F13 + R1-R7 + W1-W4 + the
   phase-ownership table; **F7 binds Phase 4 hardest** -- the dump
   self-certifies its commit via the embedded `~<sha>`, the PRIMARY
   version-pin proxy leg; **F8** the cross-arc standing rule; **F9
   RESOLVED**; **F10/F12** the env-var/wrong-subcommand X3/verify-literal
   standing lessons; **F11 accept-as-is**; **F13 RESOLVED -- the floor
   re-baselined, do NOT re-litigate**), `phase-template.md`,
   `README.md` (LOCKED index; Phase 1+2+3 `shipped`, 4-5 pending).
2. **All 5 phase MDs IN FULL** -- LOCKED execution contracts carrying
   the F9 + F10 + F12 + F13 dated corrections. Order: **P4** (the next
   dispatched phase -- read CLOSELY IN FULL incl. all Tasks /
   Verification / Outputs / Open questions; s3 read only P4's "Inputs
   from previous phase" for the contract check -- you MUST read P4 in
   full before dispatching), P3 + P1 + P2 (SHIPPED -- the contracts P4
   COMPOSES but must NOT re-author: P1 `verify-callgraph-probes.py` +
   P2 `verify-hud-probes.py` + the P3 two-column populated provenance
   are P4's inputs), P5 (cross-phase footprint you gate for drift).
3. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D-rationale; decisions.md is the distilled
   contract -- do NOT re-open a D).
4. The handoff chain (critical rules cumulative): the s1->s2 resume,
   the s2->s3 resume
   (`docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-
   execution-orchestrator-resume-s2-to-s3.md`), and THIS doc (s3->s4,
   the freshest).
5. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty
   -- the Phase-3 3-way gate is the freshest worked example: structural
   + primary-source + empirical, corroborate AND sharpen [Phase 3
   needed no sharpening; the executor's own F13 subagent-claim catch +
   the residue=false subagent-refusal are the freshest in-executor
   materializations]), `feedback_parking_verified_state_is_hypothesis`,
   `feedback_cross_phase_audit_shared_file_drift` (THE load-bearing
   shared-substrate rule -- F8's sibling; worked perfectly s3, keep
   applying it at the Phase-4 boundary -- re-derive any shared volatile
   value LIVE), `reference_runtime_dump_self_certifies_commit` (**THE
   load-bearing Phase-4 memory** -- F7: the dump's `version`-command
   tail carries an embedded `<build>~<sha>`; the embedded-SHA vs
   `oracle_meta ezquake:source_repo_commit` match is the EXACT D19
   version-pin sub-gate, the PRIMARY proxy leg; `front1-diff.sh:33-36`
   heuristic is the secondary corroborator),
   `reference_rigor_bar_follows_consumer` (level-3 autonomous-ship =
   strict bar; level-2 assistant-only never withheld -- D21),
   `reference_postgres_js_jsonb_binding` (F1.jsonb gate -- still applies
   if Phase 4 touches any loader path; the 3 P3 cols are in
   `probeJsonbNotStrings`), `feedback_idempotency_before_staleness`
   (inflated counts are re-run idempotency bugs not stale snapshots --
   the F13 0-dup-name_fold check is the freshest worked example),
   `feedback_repair_by_reextract_not_sql_update` (X9),
   `reference_qw_oracle_floor_vs_clean_reload` (F13 freshest
   materialization), `reference_libclang_compiled_means_parsed_not_
   linked` (the F9 lesson), `feedback_model_effort_range`,
   `feedback_no_subagents_for_mechanical_edits`,
   `feedback_orchestrator_terminal_pattern`,
   `feedback_verification_layer_catches_lift_residuals` (F6/F10/F12 are
   its materialization), `reference_destructive_rm_harness_gate`
   (`rm -rf` harness-blocked -- use `mktemp -d`; the Phase-3 X3 re-run
   used it correctly), `feedback_operator_not_technical_review_gate`
   (the executor surfaced F11/F12/F13 + did NOT silently fix them --
   the operator/orchestrator routes; one question, plain English,
   recommended option).
6. `arc-planner/references/arc-phase-archetypes.md` -- per-phase
   verification FLOOR: **P4 = Acceptance contract -> OPERATOR-RUN
   floor** (the harness passes LOUD/green at the pinned commit; a
   broken-pin proves ZERO level-3; toggle-off == today's pipeline;
   the operator-run public-smoke-equivalent is mandatory -- CI-only is
   insufficient for the acceptance archetype). P5 application = MIXED
   -> OPERATOR-RUN higher floor (carried for when you reach it).

## Critical rules (carry into the remaining gates -- cumulative)

- **Verify executor claims yourself -- against LIVE shipped code/DB/
  migration/emitted-JSON/dump/a re-run.** "DONE / PASS / GREEN" + a
  sub-agent "0 CRITICAL" are HYPOTHESES until you re-run probes +
  grep/SQL/Read primary source. The Phase-3 3-way gate is the freshest
  worked example (structural proof AND primary-source-by-symbol AND an
  independent empirical re-run -- own F1 grid re-run + own mktemp OFF/ON
  X3 re-run + own SQL battery + own ordinal re-derive). The executor
  also correctly applied this duty ONE LEVEL DOWN (caught its own
  Task-4 subagent's false "benign non-regression-family" F13 claim; the
  Task-3 subagent correctly refused to fabricate residue=true) -- gate
  the executor's gating too, but credit it where it held.
- **F7 is Phase 4's hardest wired rule (its F9/F8-analogue -- the
  load-bearing Phase-4 memory).** The runtime dump
  `apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt`
  SELF-CERTIFIES its commit: its `version`-command output tail carries
  an embedded `<build>~<sha>` (line ~3347, OUTSIDE the 7-564 / 571-3272
  / 3276-3344 extraction ranges so it never polluted 74/92/129). The
  EXACT D19 version-pin sub-gate is `embedded ~<sha>` vs `oracle_meta
  ezquake:source_repo_commit` -- the PRIMARY proxy hard leg
  (operator-ratified s2; `reference_runtime_dump_self_certifies_
  commit`); `front1-diff.sh:33-36` heuristic stays a SECONDARY
  corroborator; `front1-diff.sh` is byte-IMMUTABLE (the SHA leg lives
  in `version-pin-proxy.sh`). Phase 4 RE-RUNS the R6 proxy LIVE at its
  boundary (X8/W2 -- the s4/5 drafting re-runs were point-in-time);
  re-derive + re-run it YOURSELF at the gate, do not trust the
  executor's "GREEN" on faith. Prereq item 4 is CLOSED in-repo (the
  matched triple + README SECURED git-tracked at
  `apps/qw-oracle/data/detection/`); the operator attests provenance
  (they ran the `3f9e724f` build) -- surface that as the one
  operator-side Phase-4 precondition.
- **D17/D18/D19 the Phase-4 core; X2/W4 the load-bearing slicing
  invariant.** Phase 4 COMPOSES the already-shipped P1
  `verify-callgraph-probes.py` 3-gate + P2 `verify-hud-probes.py`
  3-anchor+R7+R1 into ONE hard/all-or-nothing/loud one-time-per-fork
  D18 gate -- it AUTHORS NO new validation logic (R5; composition of
  probes the mechanism phases already shipped). D19: the dump is the
  OVERRIDING answer key; on any static-vs-dump disagreement the dump
  wins + the conservative direction (Track A drops the accusation;
  Track B does not ship the name). Phase 4 STAMPS slot-3 -> level-3
  (`dump-confirmed`) ONLY where the pinned dump confirms (a broken pin
  -> ZERO level-3, everything falls to level-2 -- the F7 sub-gate is
  HARD). A Phase-4 verification that needs Phase 5 to exist is a regime
  collision -- bounce it (X2/W4).
- **Slot-3 is REPRESENTATION-ONLY at Phase 3, STAMPED at Phase 4.**
  Phase 3 shipped every populated row at level-2
  (`high-confidence-generalized`) and NEVER `dump-confirmed`
  (orchestrator s3-verified: DISTINCT dump_confirmation == only
  high-confidence-generalized). Phase 4's stage-2 dump cross-check is
  the FIRST writer of level-3. If Phase 4's executor reports any
  pre-existing `dump-confirmed` row, that is a Phase-3 regression --
  STOP and investigate (it cannot be there).
- **Refuted premise -> dated `decisions.md` amendment + operator
  ratification, NEVER a silent in-flight redesign.** F9 (s1->s2) is the
  worked example. Phases 2+3 had NONE (R1 GREEN; F10/F11/F12/F13 were
  mechanical/stale-recon corrections -- the F6 precedent: orchestrator
  applies, operator clears at the gate; NOT refuted premises -> NO
  D-amendment). Surface ONE question, plain English, recommended
  option (`feedback_be_decisive` + `feedback_one_question_at_a_time` +
  `feedback_operator_not_technical_review_gate`). The orchestrator
  applies the amendment + propagates (decisions.md + review-findings
  F-row + every affected MD as a DATED correction with narrative
  preserved + README + arc-history; check the Phase-5 footprint).
- **F8 / cross-arc shared-substrate (continues to bind).** The active
  ktx-mvdsv arc shares `db/migrations/` + `quality-grid.ts`. Any
  shared volatile value (a migration ordinal if Phase 4 adds one; any
  `quality-grid.ts` cite if Phase 4 extends F1) is EXECUTOR-DERIVED +
  ORCHESTRATOR-RE-DERIVED LIVE at the gate, never frozen. The s3 F13
  recalibration was an F8-scoped surgical edit DISJOINT from the
  ktx-mvdsv `F1.describe_fill.*` region -- mirror that discipline.
  `git log --since=<phase-freeze> -- db/migrations/ quality-grid.ts`
  for sibling-arc commits is the cheap forensic.
- **F12 standing lesson (binds Phase-4/5 verification literals).** A
  phase MD literal verification command MUST be the actual working
  invocation: `extract-tag` (real extract+load+post-loop), not
  `load-version` (single-type ingest); the canonical
  `DATABASE_URL=...qw_oracle_test bun test` (package.json `test`),
  not a bare `bun test`. If a Phase-4/5 MD copies the wrong shape,
  orchestrator dated MD-correction (F6/F10/F12 precedent), no
  D-amendment.
- **F1 jsonb gate + the 3 P3 columns.** `probeJsonbNotStrings` now
  targets the 3 new columns; `F1.runtime_fidelity_shape` asserts the
  D14 three-slot shape + that level-3 is well-formed IF present (Phase 3
  asserts shape only; Phase 4 ADDS the "level-3 only at a pinned-dump
  commit" cross-check -- that is the X2/W4 boundary Phase 3 deferred).
  Bind any JSONB via `tx.json(...)` NEVER `JSON.stringify`+TEXT
  (`reference_postgres_js_jsonb_binding`). The COALESCE-on-new-cols-only
  upsert is the established pattern now (do NOT "fix" it to =EXCLUDED --
  that reintroduces the clobber).
- **Draft-FAITHFUL, honor the locked execution modes** (`feedback_
  model_effort_range`/X6). Grade the executor's mode-fidelity; do not
  inflate or downgrade. Phase 4 acceptance-contract design is
  Opus-MAX-shaped where it is architectural; composition/wiring is
  Sonnet-medium; near-zero inline (X5).
- **Commit cadence:** at Phase-4 SHIP, after operator approval, scoped
  `git add` of ONLY Phase-4's shipped files + this arc's scaffold (incl.
  README Phase-4 -> shipped + arc-history append) + a session-wrap
  resume doc at a handoff. Mirror the two-commit pattern (ship commit;
  then a tiny README-flip commit referencing the ship SHA). Message
  `docs(arc-exec): enforce-L1 Phase 4 SHIPPED ...`, end with
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. NEVER
  `git add -A`. At Phase 5 SHIP: `git tag -a
  arc-enforce-l1-runtime-truth-shipped`, then the POST-ARC handoff
  routes to **arc-reviewer** (a DIFFERENT skill, fresh terminal). Push
  is the operator's call at session wrap.
- **`rm -rf` is harness-blocked.** Use `mktemp -d` working dirs (the
  Phase-3 X3 re-run did this correctly).

## First three actions

1. Cold-read the scaffold + all 5 MDs (**P4 IN FULL** -- s3 only read
   its Inputs) + the handoff chain + the named memory. Confirm: README
   Phase-1/2/3 `shipped` (`51604f67` / `3c136826`+`b23f96eb` /
   `895817bb`+`8ed860fe`); F11 accept-as-is + F12 RESOLVED + F13
   RESOLVED (the floor re-baselined 564->693/495->624 -- do NOT
   re-litigate) + F7 present (the embedded-SHA PRIMARY proxy leg) in
   review-findings; the D5/D7/D11 amendments coherent; prereq pin BOTH
   legs still `3f9e724fa608e516040f02b9557808ff3efda53e` (re-run: `git
   -C research/repos/ezquake-source rev-parse HEAD` + `docker exec
   qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "SELECT
   value FROM oracle_meta WHERE key='ezquake:source_repo_commit'"`);
   prereq item 4 (the durable dump triple) SECURED at
   `apps/qw-oracle/data/detection/`; the ~21-file + 2-output-JSON
   unrelated/regenerable drift is NOT this arc (never `git add -A`).
   Do NOT re-open design; do NOT re-derive pools (74/92/129 banked,
   X7); do NOT re-litigate F9/F11/F12/F13.
2. Independently re-verify the Phase-3-SHIPPED boundary is intact
   before building on it (the P3 "Outputs" are P4's inputs -- treat the
   s3 "verified" claims as hypotheses): SQL the 3 new columns exist
   jsonb/nullable/no-CHECK; DISTINCT dump_confirmation == only
   `high-confidence-generalized` (zero `dump-confirmed` -- Phase 4 is
   the FIRST level-3 writer); the 3-gate JSONB still round-trips exact
   (`cl_bobhead` server=`reachable`/`build-excluded` -- the F9
   load-bearing assertion); F1 grid FULLY GREEN incl. the recalibrated
   command floor (693 / source_backed 624) + `F1.runtime_fidelity_shape`
   + `F1.jsonb_columns_not_strings`; the migration chain has exactly
   one `015` (re-derive `ls db/migrations/`); `git log
   292d3ad5..HEAD -- db/migrations/ quality-grid.ts` for any NEW
   ktx-mvdsv shared-substrate drift since s3.
3. Dispatch a FRESH arc-executor terminal for Phase 4 with the EXECUTION
   prompt you ASSEMBLE from `handoff-prompt.md` + the Phase-4 MD (read
   IN FULL first) + the carry-forwards in "Phase-4 executor prompt
   scaffold" below (F7 primary-SHA proxy leg verbatim + F8 standing rule
   + the P3->P4 contract [the populated two-column three-slot provenance
   is P4's stage-2 input] + F12 verify-literal lesson + prereq-4-CLOSED
   + the COALESCE-deviation-is-established note + slot-3-was-level-2-only
   so Phase-4 is the FIRST level-3 writer). The operator opens the
   terminal + pastes it; the operator attests dump provenance. Receive
   the halt; independently re-verify vs LIVE (the Phase-3 3-way method:
   re-run the R6 proxy + the embedded-SHA match YOURSELF; re-run the
   composed D18 harness; SQL the level-3 stamp-set; confirm broken-pin
   -> zero level-3; confirm toggle-off == today's pipeline; the P4
   "Outputs" == P5 "Inputs" verbatim). Gate; capture cross-phase
   memory; on operator approval do the scoped Phase-4 two-commit ship +
   README flip + arc-history append; then prep Phase 5 (the LAST phase
   -> at Phase-5 ship, `git tag` + route to arc-reviewer fresh
   terminal). Re-project YOUR budget after the Phase-4 gate; if >350k
   hand off again at that clean boundary.

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. The spec is source-of-truth; the 5 MDs are LOCKED
execution contracts (carrying the F9 + F10 + F12 + F13 dated
corrections); parking / "verified" / prior-session / sub-agent /
executor lines are HYPOTHESES until re-verified vs LIVE source (real
code / DB / migration / emitted JSON / dump / a re-run). Conservative
always (D3/D8); never false-accuse; **the dump is the overriding answer
key (D19) and it SELF-CERTIFIES its commit via the embedded `~<sha>`
(F7 -- the EXACT version-pin sub-gate, the PRIMARY proxy leg, the
load-bearing Phase-4 rule)**; level-3 ships autonomously (strict bar,
ONLY at a pinned-dump commit), level-2 is assistant-only and NEVER
withheld (D21); the two tracks NEVER blend (D1/D12 structural -- two
physically separate columns, verified live at Phase 3). The Phase-3
3-way gate is the freshest proof of the method: structural +
primary-source-by-symbol + an independent empirical re-run, corroborate
AND sharpen (Phase 3 needed no sharpening; the executor's own subagent
catches show the duty also applies one level down). Refuted premises
route to the operator as dated `decisions.md` amendments, never silent
overrides (one question, plain English, recommended option); mechanical
/ stale-recon corrections (F6/F10/F11/F12/F13 family) are
orchestrator-applied dated MD/recon corrections, narrative preserved,
no D-amendment, operator-cleared at the gate. The **ktx-mvdsv-l1-
describe-fill arc is a SEPARATE, STILL-ACTIVE arc** sharing the
migration chain + `quality-grid.ts` -- F8 /
`feedback_cross_phase_audit_shared_file_drift`: re-derive every shared
volatile value LIVE at the Phase-4 gate, NEVER trust a frozen
ordinal/cite, NEVER touch its files or `git add -A`. The ezQuake
help-JSON doc-gap arc is a SEPARATE sequenced follow-on (NOT this arc).
FTE/QWCL/MVDSV is a per-fork gated follow-on (D2/D22), off by default
(NOT this arc). Post-arc review is arc-reviewer, fresh terminal, NOT
the execution orchestrator -- it runs ONLY after Phase 5 ships + the
`git tag`.

## Phase-4 executor prompt scaffold (the fresh orchestrator finalizes this from a FULL P4 cold-read, then dispatches verbatim)

> NOTE TO THE FRESH ORCHESTRATOR: s3 read only Phase-4's "Inputs from
> previous phase" (for the P3->P4 contract check -- it is a verbatim
> match). You MUST cold-read the Phase-4 MD IN FULL (all Tasks /
> Verification / Outputs / Open questions) before finalizing this
> prompt -- do NOT dispatch a prompt assembled from an unread MD
> (`feedback_no_inference`). The carry-forwards below are
> orchestrator-verified and bind regardless of the MD's task shape;
> fold them into the `handoff-prompt.md`-shaped prompt with
> `<PHASE_NUMBER>=4` and the P4-MD-specific task/mode detail you read.

> [EXECUTION] arc-executor, arc `2026-05-17-enforce-l1-runtime-truth`,
> Phase 4 (Acceptance contract -- D17/D18/D19). LOCKED MD:
> `phase-4-acceptance-contract.md`. Read the scaffold + the P4 MD + the
> spec COLD; critically review vs decisions/review-findings FIRST.
> Confirm pin BOTH legs `3f9e724fa608e516040f02b9557808ff3efda53e`
> (git HEAD of `research/repos/ezquake-source` + `oracle_meta
> ezquake:source_repo_commit`; STOP if moved -- a moved pin makes the
> dump-vs-L1 cross-check version-noise). Phases 1+2+3 SHIPPED
> (`51604f67` / `3c136826`+`b23f96eb` / `895817bb`+`8ed860fe`) --
> Phase 4 COMPOSES their probes + the P3 populated provenance; it
> AUTHORS NO new validation logic (R5/X2) and shares NO mechanism code
> between the two tracks (D1/D12). Confirm `qw-oracle-postgres-dev` is
> up (REQUIRED) and the durable dump triple is at
> `apps/qw-oracle/data/detection/` (prereq item 4 CLOSED).
>
> Prior-phase learnings carried (HARD):
> - **F7 STANDING RULE (the load-bearing Phase-4 rule -- verbatim).**
>   The runtime dump `apps/qw-oracle/data/detection/entities-runtime-
>   dump-3f9e724f.txt` SELF-CERTIFIES its commit: its `version`-command
>   output tail carries an embedded `<build>~<sha>` (line ~3347,
>   OUTSIDE the 7-564 / 571-3272 / 3276-3344 extraction ranges). The
>   EXACT D19 version-pin sub-gate is `embedded ~<sha>` vs `oracle_meta
>   ezquake:source_repo_commit` -- the PRIMARY hard proxy leg
>   (operator-ratified); `front1-diff.sh:33-36` heuristic is the
>   SECONDARY corroborator; `front1-diff.sh` is byte-IMMUTABLE (the SHA
>   leg lives in `version-pin-proxy.sh`). RE-RUN the R6 proxy LIVE at
>   the boundary + state the embedded `~<sha>` you read + the
>   `oracle_meta` value + the match. A broken pin -> ZERO level-3 for
>   that dump, everything falls to level-2 (HARD, all-or-nothing,
>   LOUD). Never trust a frozen/prior "GREEN"; derive live.
> - **The P3->P4 contract (verified s3 vs the actual shipped state).**
>   The two physically-separate nullable JSONB columns
>   (`track_a_reachability` on cvar_versions + command_versions;
>   `track_b_hud_recovery` on command_versions only), D14 three-slot,
>   D12 no-blend, are POPULATED at slot-3 == `high-confidence-
>   generalized` (level-2) for EVERY pool/HUD row -- Phase 3 NEVER
>   wrote `dump-confirmed`. Phase 4 is the FIRST level-3 writer (its
>   stage-2 dump cross-check stamps `dump-confirmed` ONLY where the
>   pinned dump confirms -- D19). Phase 1's
>   `verify-callgraph-probes.py` (3-gate, exit-non-zero-on-RED) + the
>   `ENABLE_CALLGRAPH_PASSENGER` toggle and Phase 2's
>   `verify-hud-probes.py` (3-anchor+R7+R1) + the
>   `ENABLE_HUD_COMMANDS_HANDLER` toggle are the shipped probe inputs
>   Phase 4 COMPOSES (not re-authors -- R5/X2). The Phase-3-created
>   `emit_callgraph_signal.py` / `load-callgraph-reachability.ts` /
>   `load-hud-commands.ts` + the `F1.runtime_fidelity_shape` probe
>   (which DEFERS the level-3-pinned-only assertion to Phase 4) are
>   live.
> - **F8 STANDING RULE (cross-arc shared substrate).** If Phase 4 adds
>   a migration its ordinal is EXECUTOR-DERIVED `(highest
>   db/migrations/ int)+1` IMMEDIATELY before writing, NEVER frozen
>   (currently `015` is the highest -- the enforce-L1 one; the sibling
>   ktx-mvdsv arc is STILL ACTIVE on the chain + `quality-grid.ts` and
>   may consume more; RE-DERIVE). Every `quality-grid.ts` cite
>   re-derived by SYMBOL at execution. State what you derived + the
>   command. (Phase 4 may add NO migration -- it is the acceptance
>   harness + the additive level-3 stamp-set artifact, slot-3 only;
>   if it does, F8 binds it.)
> - **F12 standing lesson (verify-literal).** Every literal
>   verification command in the MD must be the ACTUAL working
>   invocation -- `extract-tag` (real extract+load+post-loop) not
>   `load-version`; the canonical `DATABASE_URL=...qw_oracle_test bun
>   test` (package.json `test`) not a bare `bun test`. If the P4 MD
>   copies a wrong-shaped literal, RUN the correct command + SURFACE
>   it for an orchestrator dated MD-correction (do NOT silently edit
>   the MD; do NOT skip the check -- the F6/F10/F12 silent-no-op /
>   hard-fail class).
> - **The COALESCE-on-the-new-provenance-cols-only upsert is the
>   ESTABLISHED Phase-3 pattern** (`natural-keys.ts` -- existing cols
>   `=EXCLUDED`, the 3 new cols `COALESCE(EXCLUDED,table)`; necessary
>   for the two independent single-column writers; X3 row-parity
>   preserved). Do NOT "fix" it to `=EXCLUDED` -- that reintroduces
>   the clobber. If Phase 4 writes slot-3 via the loader path, follow
>   the same COALESCE discipline for the provenance columns.
> - The F9 worked example (a drafter "Recon (verified)" block is a
>   hypothesis -- re-verify live; trust live code over the MD's frozen
>   cites). Phases 2+3 had NO refuted premise (R1 GREEN; F10/F11/F12/
>   F13 were mechanical/stale-recon, NOT refuted premises -> NO
>   D-amendment). If a P4 premise is refuted: surface + STOP for an
>   operator amendment, do NOT silently redesign.
> Constraints (HARD): D17 ONE shared 3-stage shape per-track (never a
> blended gate); D18 the hard/all-or-nothing/loud one-time-per-fork
> mechanism-validation gate = COMPOSITION of the shipped P1 3-gate +
> P2 3-anchor+R7+R1 probes (R5 -- NOT new validation logic); D19 the
> dump is the OVERRIDING answer key (static-vs-dump disagreement ->
> dump wins + conservative direction) + the F7 embedded-SHA version-
> pin HARD sub-gate (broken pin -> ZERO level-3); stage-3 route-by-D13-
> level; D22 per-fork-per-track precondition + off-by-default toggle.
> Verify ENTIRELY on the composed harness + the dump (the Phase-4
> answer key is now IN SCOPE -- contrast Phases 1-3 X2) -- but NOT a
> Phase-5 artifact (the delete-list / recovered-entity application is
> Phase 5; a P4 check needing P5 is the X2/W4 collision -- bounce it).
> X3 still applies (8 F6 stems byte-identical; the F10 standing lesson
> -- any X3 baseline leg sets the OFF env vars explicitly). X9
> repair-by-reextract. Honor the locked execution modes (X6; grade
> mode-fidelity). Do NOT commit; HALT structured (STATUS + the ACTUAL
> probe/harness OUTPUTS not "PASS"; the embedded `~<sha>` + `oracle_meta`
> value + the match; the live-derived migration ordinal + command if
> any; every re-derived `quality-grid.ts` cite if F1 touched; any
> decisions.md deviation; open questions; the F7/F8 carry-forward
> verbatim for the Phase-5 chain). Do NOT proceed to Phase 5.
