# Resume: enforce-L1-runtime-truth EXECUTION orchestrator -- session 2 -> session 3

**For:** arc-orchestrator, FRESH terminal, EXECUTION mode (NOT drafting; NOT
arc-reviewer). Execution-orchestrator session 2 ran cold pre-flight,
received + independently 3-way-gated the Phase-2 arc-executor halt (DONE;
no deviation; R1 GREEN), shipped Phase 2 (commits `3c136826` ship +
`b23f96eb` README flip), captured the F10 doc-hazard + tidied the stale
F9 table row, and handed off at THIS clean Phase-2-shipped boundary
rather than push into Phase 3 (Phase 3 is the heaviest F8-binding gate;
the resume-doc + orchestrator-skill smell-zone discipline -- judgment
fidelity for the Phase-3 boundary needs a fresh full budget). You are
COLD -- read before acting. You do NOT execute phase code; you dispatch
arc-executor terminals, independently re-verify each boundary vs LIVE
source, own cross-phase memory, judge fresh-terminal handoffs on budget.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Model: draft-then-execute, 5 phases, fully SEQUENTIAL (1->2->3->4->5; each
ships a runnable byte-identical state + commits before the next). README
phase index is authoritative. All 5 MDs APPROVED; pre-execution
cross-phase audit RAN + CLEARED (F8). EXECUTION is underway.

Status:
- **Phase 1: SHIPPED** -- commit `51604f67` (session 1; F9 caught +
  operator-ratified D5 AMENDMENT; orchestrator-3-gate-GREEN + X3
  byte-identical two ways). Untouched this session.
- **Phase 2: SHIPPED** -- commit `3c136826` (`docs(arc-exec): enforce-L1
  Phase 2 SHIPPED -- Track B _handler_hud.py ...`) + `b23f96eb` (README
  Phase-2 -> shipped, refs `3c136826`). 6 files in the ship commit:
  `_handler_hud.py` (new, the Tier-3 ezQuake-private HUD_Register COMMAND
  Visitor), `verify-hud-probes.py` (new, the 3-anchor+R7+R1
  self-validation harness), `extract.py` (the single-boolean seam,
  `HUD_COMMANDS_OFF` mirroring Phase-1 `CALLGRAPH_OFF`),
  `phase-2-track-b-handler-hud.md` (F10 dated correction),
  `review-findings.md` (F10 + F9-table tidy), `arc-history.md` (Phase-2
  bullet + heading parenthetical). **No deviation. R1 GREEN** --
  `nonliteral_count==0` (the prime refuted-premise candidate the s1->s2
  note named did NOT fire; D8 literal-only premise AST-confirmed; clean
  gate-and-ship, NO `decisions.md` amendment, contrast Phase-1 F9).
  **Orchestrator independently re-verified the boundary 3 ways (executor
  "DONE/GREEN" treated as hypothesis -- `feedback_verify_dispatched_
  terminal_claims`):** structural (all 3 on-disk files read -- the
  `visit_cursor` HUD_Register-only filter makes `togglehud` + the
  `hud.c:1281-1282` comment-trap STRUCTURALLY impossible not merely
  asserted; R1 record+emit-nothing+no-constant-propagate path; zero cvar
  code path; the seam diff provably mirrors Phase-1 shipped
  `CALLGRAPH_OFF`); primary-source by-symbol (every `hud.c`/`hud.h`/
  `hud_radar.c` cite re-verified at pin `3f9e724f` -- ZERO drift; unlike
  F9 the executor recon needed NO sharpening); empirical (own `mktemp`
  OFF/ON re-run: 8 F6 stems byte-identical, 9th file additive,
  committed-baseline leg non-vacuous + clean, `verify-hud-probes.py`
  ANCHOR1/2/3+R7+R1 GREEN exit 0, emitted radar/+hud_radar/-hud_radar
  rows == live `hud_radar.c:1422`). P2->P3 contract a three-way verbatim
  match (Phase-2 Outputs == Phase-3 Inputs == actual `finalize()`).
- **F10 -- caught at execution, orchestrator-resolved (NOT a refuted
  premise; the F6 mechanical-correction precedent).** The Phase-2 MD
  Task-2 X3 baseline-leg command set NO OFF env var (comment said
  "ENABLE_HUD_COMMANDS_HANDLER forced False" but the shipped seam defaults
  ON unless `HUD_COMMANDS_OFF=1`) -> a verbatim copy-run = two ON runs ->
  X3 silently no-ops. EXACT F6 class (a phase-MD literal X3 command that
  silent-no-ops). The executor implemented the correct env-var seam
  (within the MD's authorized "least-invasive concrete form" latitude),
  ran X3 genuinely off, and SURFACED it (did NOT silently edit the
  approved MD -- operator-not-technical-gate). Orchestrator independently
  re-ran X3 the same way (clean) + applied: dated Phase-2 MD
  orchestrator-correction (Task-2 block + phase-boundary check 2;
  narrative preserved -- the F6/F8/F9 house style) + `review-findings`
  **F10** + the phase-ownership-table F10 row. No code/data impact, no
  `decisions.md` amendment. Standing lesson (Action in F10): every phase
  shipping an env-var-gated X3 MUST enumerate the OFF switch in the
  literal block (the F6 "enumerate the live stems" sibling -- here
  "enumerate the OFF switch"); binds the Phase-3 / ACC / APP X3 blocks.
- **F9 phase-ownership-table tidy.** review-findings.md's table F9 row
  was stale `OPEN -- P1 executor HALT BLOCKED` while the F9 body + D5
  AMENDMENT + README all showed RESOLVED; tidied to `RESOLVED 2026-05-17
  -- Option B operator-ratified ...` (consistent; not load-bearing,
  hygiene only). Committed in `3c136826`.
- **Phases 3, 4, 5: not started.** Sequential; Phase 3 needs 1+2; Phase 4
  needs 3 + prereq-4 (durable dump CLOSED in-repo, R6 proxy RE-RUN at the
  Phase-4 boundary -- X8/W2); Phase 5 needs 4. **Phase 3 is the heaviest
  F8-binding phase** -- migration ordinal + every `quality-grid.ts` cite
  EXECUTOR-DERIVED LIVE; the sibling **ktx-mvdsv describe-fill arc is
  STILL ACTIVE** and shares the migration chain + `quality-grid.ts` (its
  commits `5160b49f`/`851379cc` interleave the log THIS session -- a
  SEPARATE arc; NEVER touch its files; the cross-arc drift is invisible
  to pairwise gates -- `feedback_cross_phase_audit_shared_file_drift`).
- **No memory written this session.** F10 is the F6 pattern already
  captured by the in-repo F6/F10 review-findings trail + the dated MD
  corrections + `feedback_verification_layer_catches_lift_residuals`;
  a new memory would be redundant (do not save what the repo records).
  Surfaced to the operator as an optional offer; not auto-written
  (memory writes are operator-approved). The F9 lesson memory
  (`reference_libclang_compiled_means_parsed_not_linked`) from session 1
  stands; nothing this session refuted or extended it.
- **Uncommitted-but-INTENTIONAL on disk:** none for this arc -- the
  README Phase-2 flip is committed (`b23f96eb`) so a cold README read is
  true. If you see any enforce-L1 file dirty, investigate (this session
  left the arc clean).

Commits (arc-relevant; the parallel **ktx-mvdsv-l1-describe-fill** arc
interleaves the log -- SEPARATE arc, stay single-arc-scoped, NEVER touch
its files or `git add -A`): ... `51604f67` (**Phase 1 SHIPPED**) ...
`847139e8` (s1->s2 resume) -> `3c136826` (**Phase 2 SHIPPED**) ->
`b23f96eb` (README Phase-2 -> shipped) -> this resume's session-wrap
commit. Branch `main`, solo-dev silent commits, no PR ceremony, NOT
pushed (the established rhythm is push-at-wrap; main is many commits
ahead of origin -- push is the operator's call at session wrap).

**Repo working tree:** ~22 unrelated dirty files (HANDOVER.md,
`.claude/settings.json`, slipgate `fte-asset-bundle.json`, the
ktx-onboarding / qwiki / slipgate-managed-mode docs,
`.claude/scheduled_tasks.lock`, `apps/qw-oracle/qw-oracle.db` [an EMPTY
0-byte SQLite red herring -- the real DB is the `qw-oracle-postgres-dev`
Postgres container; do NOT add or `sqlite3` it], the
`ezquake-help-json-empty-entries*.md` upstream-PR docs, the qwiki parking
docs, `help-json-doc-consistency-gate.md`, ...). NONE are this arc's.
Scoped `git add` of ONLY the phase's shipped files + this arc's scaffold,
EVERY commit. NEVER `git add -A`.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`
   (items 1-3 re-confirm-live; item 4 CLOSED, Phase-4 re-runs R6),
   `decisions.md` (D1-D22 + the **D5 / D7 / D11 AMENDMENTS** + X1-X10 +
   non-goals IN FULL), `review-findings.md` (F1-F10 + R1-R7 + W1-W4 +
   the phase-ownership table; **F8 binds Phase 3 hardest**; **F9
   RESOLVED**; **F10 NEW this session** -- the env-var-gated-X3 standing
   lesson), `phase-template.md`, `README.md` (LOCKED index; Phase 1+2
   `shipped`, 3-5 pending).
2. **All 5 phase MDs IN FULL** -- LOCKED execution contracts carrying the
   F9 + F10 dated corrections. Order: P3 (the next dispatched phase --
   read CLOSELY incl. Tasks 2-5 / Verification / Outputs / Open questions;
   session 2 deferred the P3 remainder for budget -- you must read it
   fully), P1 + P2 (SHIPPED -- the contracts P3 must NOT blend with; P2's
   `hud_commands` + P1's `reachable()` are P3's two inputs), P4, P5
   (cross-phase footprint you gate for drift).
3. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D-rationale; decisions.md is the distilled
   contract -- do NOT re-open a D).
4. The handoff chain (critical rules cumulative): the s1->s2 resume
   `docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-
   execution-orchestrator-resume-s1-to-s2.md`, and THIS doc (s2->s3, the
   freshest).
5. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty --
   the Phase-2 3-way gate is the freshest worked example: structural +
   primary-source + empirical, corroborate AND sharpen [Phase 2 needed
   NO sharpening; F9 did]), `feedback_parking_verified_state_is_
   hypothesis`, `feedback_cross_phase_audit_shared_file_drift` (THE
   load-bearing Phase-3 memory -- F8's sibling: the active ktx-mvdsv arc
   mutating the shared migration chain + `quality-grid.ts` post-freeze is
   invisible to pairwise gates; diff shared recon-cited files vs
   freeze-time, derive volatile values at runtime), `reference_postgres_
   js_jsonb_binding` (F1.jsonb gate -- re-run every schema/loader
   boundary; `tx.json(...)`, NEVER `JSON.stringify`+TEXT bind),
   `feedback_idempotency_before_staleness` (inflated row counts are
   re-run idempotency bugs not stale snapshots),
   `feedback_repair_by_reextract_not_sql_update` (X9 -- recovery is
   re-extract+re-load, never SQL UPDATE), `reference_qw_oracle_floor_vs_
   clean_reload` (F1 floor vs a correct prune), `reference_libclang_
   compiled_means_parsed_not_linked` (the F9 lesson),
   `reference_rigor_bar_follows_consumer`, `feedback_model_effort_range`,
   `feedback_no_subagents_for_mechanical_edits`, `feedback_orchestrator_
   terminal_pattern`, `feedback_verification_layer_catches_lift_residuals`
   (F6/F10 are its materialization), `reference_destructive_rm_harness_
   gate` (`rm -rf` harness-blocked -- use `mktemp -d`; the Phase-2 X3
   re-run used it correctly).
6. `arc-planner/references/arc-phase-archetypes.md` -- per-phase
   verification FLOOR: **P3 = Schema port + Loader port**: AUTOMATED floor
   = migration applies (+ idempotent re-run no-op) + SCHEMA.md diff +
   CHECK/enum/column-list audit + F1 + a REAL Phase-1/2-output round-trip
   + row-parity vs a pre-port baseline. (P4 acceptance = OPERATOR-RUN
   floor; P5 application = MIXED -> OPERATOR-RUN higher floor -- carried
   for when you reach them.)

## Critical rules (carry into the remaining gates)

- **Verify executor claims yourself -- against LIVE shipped code/DB/
  migration/emitted-JSON/a re-run.** "DONE / PASS / GREEN" + a sub-agent
  "0 CRITICAL" are HYPOTHESES until you re-run probes + grep/SQL/Read
  primary source. The Phase-2 3-way gate is the freshest worked example
  (structural proof AND primary-source-by-symbol AND an independent
  empirical re-run, where independent -- corroborate AND sharpen; Phase 2
  needed no sharpening, F9 did). Do BOTH the structural proof AND the
  empirical re-run where they are independent.
- **F8 is Phase 3's hardest wired rule (its F9-analogue).** The Phase-3
  migration ordinal = EXECUTOR-DERIVED live `(highest db/migrations/
  integer prefix)+1` IMMEDIATELY before writing (e.g. `ls db/migrations/
  | sed 's/_.*//' | sort -n | tail -1` then +1); NEVER frozen (the P3 MD
  Recon's "currently 015" is STALE the moment you read it -- the
  ktx-mvdsv arc is live and may have consumed more). Every
  `quality-grid.ts` line-cite re-derived by SYMBOL search at execution
  (the ktx-mvdsv arc appended ~166+ lines post-P3-freeze; a frozen cite
  reads the wrong lines). A duplicate migration ordinal in the
  append-only sha256-tracked chain is silent-corruption-class. RE-CHECK
  LIVE at the Phase-3 boundary, do not trust the executor's derived
  number on faith -- re-derive it yourself (`feedback_cross_phase_audit_
  shared_file_drift`). Augment the Phase-3 executor prompt with F8
  verbatim (it is in the prompt below) AND independently re-derive at the
  gate.
- **Refuted premise -> dated `decisions.md` amendment + operator
  ratification, NEVER a silent in-flight redesign.** F9 (s1->s2) +
  D7/D11 (drafting) are the worked examples. Phase 2 had NONE (R1 GREEN;
  F10 was a mechanical doc-correction, NOT a refuted premise -- the F6
  precedent: orchestrator applies, operator clears at the gate). Surface
  ONE question, plain English, recommended option (`feedback_be_decisive`
  + `feedback_one_question_at_a_time` + `feedback_operator_not_technical_
  review_gate`). The orchestrator applies the amendment + propagates it
  (decisions.md + review-findings F-row + every affected MD as a DATED
  correction with narrative preserved + README + arc-history; check the
  Phase-4/5 footprint for cross-phase drift).
- **D1/D12 structural no-blend (Phase 3's core).** TWO physically
  separate independently-nullable JSONB columns (`track_a_reachability`
  on `cvar_versions` AND `command_versions`; `track_b_hud_recovery` on
  `command_versions` ONLY) -- NO single `runtime_fidelity` column, NO
  shared `kind` discriminator. Both conform to ONE D14 three-slot spine
  (conclusion / evidence / dump_confirmation). D15 Track-A evidence
  FEEDER-TAGGED per-variant (4 ezQuake configs + the D5 3-valued state +
  address_taken_residue flag). D16 Track-B evidence ELEMENT-LINKED
  (literal HUD_Register arg0). **Slot 3 (`dump_confirmation`) is
  REPRESENTATION ONLY at Phase 3** -- the loader writes `high-confidence-
  generalized` (level-2) for every populated row; the runtime-dump
  cross-check that stamps level-3 is Phase 4 / D19 (X2/W4 -- a Phase-3
  cross-check is a regime collision; bounce it).
- **F1 jsonb gate re-run (`reference_postgres_js_jsonb_binding`).** The 3
  new JSONB columns bind via `tx.json(...)`, NEVER `JSON.stringify(...)`
  then TEXT-bind (the legacy SQLite-era bug). `probeJsonbNotStrings`
  targets += the 3 columns; a NEW shape probe (three-slot keys; conclusion
  in the allowed set; NO cross-track kind; Track-A per-variant over
  EXACTLY the 4 ids; Track-B hud_element present; slot-3 in {high-
  confidence-generalized} ONLY -- never dump-confirmed here). Re-derive
  every `quality-grid.ts` line number live.
- **X3 still applies.** The 8 F6 `output_filename` stems
  (`ezquake-commands-ast.json`, `ezquake-variables-ast.json` [NOT
  `cvars`], `ezquake-macros-ast.json`, `ezquake-cmdline-params-ast.json`
  [NOT `cmdline`], `ezquake-hud-elements-ast.json`,
  `ezquake-keynames-ast.json`, `ezquake-asset-cvar-bindings-ast.json`,
  `ezquake-asset-loader-sites-ast.json`) byte-identical; Phase-2's
  `ezquake-hud-commands-ast.json` is the additive 9th; Phase-3's Track-A
  signal file (`ezquake-callgraph-reachability-ast.json` per P3 MD
  OQ-1/Files) is the additive 10th -- NOT in the byte-identical set. The
  Phase-3 X3 baseline leg MUST set the handler OFF switches explicitly
  (F10 standing lesson -- enumerate the OFF env vars, never a bare
  command + a "forced off" comment).
- **X9 repair-by-reextract.** Population/recovery is "re-run the corrected
  extract+load end-to-end", NEVER an in-place SQL UPDATE. The P3 columns
  are `013`-shape (pure schema, NO migration-time backfill -- values
  arrive via loader re-run).
- **Per-phase prereq re-confirm (X8).** Pin BOTH legs ==
  `3f9e724fa608e516040f02b9557808ff3efda53e` at the Phase-3 boundary
  (git HEAD of `research/repos/ezquake-source` + `oracle_meta
  ezquake:source_repo_commit` via `docker exec qw-oracle-postgres-dev
  psql -U qworacle -d qw_oracle -tAc "SELECT value FROM oracle_meta WHERE
  key='ezquake:source_repo_commit'"`). STOP if moved. The Postgres
  container IS required by Phase 3 (migration/loader/F1/SQL run against
  it). The empty `apps/qw-oracle/qw-oracle.db` SQLite file is a red
  herring -- ignore it.
- **Draft-FAITHFUL, honor the locked execution modes** (`feedback_model_
  effort_range`/X6). Phase-3 Task-1 (the two-field/three-slot schema
  DESIGN) is Opus-MAX-shaped; mechanical synthesis Sonnet-medium;
  near-zero inline (X5). Grade the executor's mode-fidelity; do not
  inflate or downgrade.
- **Commit cadence:** at Phase-3 SHIP, after operator approval, scoped
  `git add` of ONLY Phase-3's shipped files + this arc's scaffold (incl.
  README Phase-3 -> shipped + arc-history append) + a session-wrap resume
  doc at a handoff. Mirror Phase-2's two-commit pattern if you embed the
  ship SHA in README (ship commit; then a tiny README-flip commit
  referencing it -- avoids the self-reference problem). Message
  `docs(arc-exec): enforce-L1 Phase 3 shipped ...`, end with
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. At Phase 5
  SHIP: `git tag -a arc-enforce-l1-runtime-truth-shipped`, then the
  POST-ARC handoff routes to **arc-reviewer** (a DIFFERENT skill, fresh
  terminal).
- **`rm -rf` is harness-blocked.** Use `mktemp -d` working dirs (the
  Phase-2 X3 re-run did this correctly).

## First three actions

1. Cold-read the scaffold + all 5 MDs (P3 IN FULL incl. its deferred
   remainder) + the handoff chain + the named memory. Confirm: README
   Phase-1 `shipped` (`51604f67`) + Phase-2 `shipped` (`3c136826` /
   `b23f96eb`); F10 present in review-findings + the F9 table row reads
   RESOLVED; the D5/D7/D11 amendments coherent; prereq pin BOTH legs
   still `3f9e724f...` (re-run the two commands); the ~22-file unrelated
   drift is NOT this arc (never `git add -A`). Do NOT re-open design; do
   NOT re-derive pools (74/92/129 banked, X7); do NOT re-litigate
   F9/F10.
2. Dispatch a FRESH arc-executor terminal for Phase 3 with the augmented
   EXECUTION prompt reproduced verbatim in "Phase-3 executor prompt"
   below (it carries the F8 standing rule verbatim + the Phase-2 OQ-2
   consumed-field-names contract + the F10 standing lesson + the P1/P2
   SHIPPED state). The operator opens the terminal and pastes it.
3. Receive its halt; independently re-verify vs LIVE (the executor's
   "GREEN" is a hypothesis -- the Phase-2 3-way worked example): the
   migration applied (re-run = idempotent no-op); the migration ordinal
   is the LIVE-derived `(highest db/migrations/ int)+1` you re-derive
   YOURSELF at the gate (NOT a frozen 014/015; NOT colliding with the
   ktx-mvdsv arc's live consumption -- `feedback_cross_phase_audit_
   shared_file_drift`); `SCHEMA.md` diff matches; `npm run load-knowledge
   -- quality-grid --project ezquake` GREEN incl. the 3 new jsonb targets
   + the new shape probe; the REAL Phase-1 `reachable()` + Phase-2
   `ezquake-hud-commands-ast.json` round-trip into the TWO physically
   separate columns with correct D14/D15/D16 shape; `dump_confirmation`
   uniformly level-2 (NO dump cross-check -- X2/W4); the 8 F6 stems
   byte-identical (X3) + the additive 9th/10th; every `quality-grid.ts`
   cite the executor used re-derived by symbol; the P3 "Outputs to next
   phase" == P4 "Inputs from previous phase" verbatim (contract-drift =
   latent-bug ship). If a P3 premise refuted -> route an operator dated
   `decisions.md` amendment (the F9/D7/D11 precedent), do NOT let the
   executor silently redesign. Gate; capture cross-phase memory; on
   operator approval do the scoped Phase-3 ship commit + README Phase-3
   -> shipped + arc-history append; then prep the Phase-4 fresh executor
   (Phase 4 RE-RUNS the R6 version-pin proxy live + re-confirms
   prereq-4/F7 -- the OPERATOR-RUN floor). Re-project YOUR budget after
   the Phase-3 gate; if >350k hand off again at that clean boundary.

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. The spec is source-of-truth; the 5 MDs are LOCKED
execution contracts (carrying F9 + F10 dated corrections); parking /
"verified" / prior-session / sub-agent / executor lines are HYPOTHESES
until re-verified vs LIVE source (real code / DB / migration / emitted
JSON / a re-run). Conservative always (D3/D8); never false-accuse; the
dump is the overriding answer key (D19 + the F7 embedded-SHA sub-gate,
Phase 4); level-3 ships autonomously (strict bar), level-2 is
assistant-only and NEVER withheld (D21); the two tracks NEVER blend
(D1/D12 structural -- two physically separate columns at Phase 3). The
Phase-2 3-way gate is the freshest proof of the method: structural +
primary-source-by-symbol + an independent empirical re-run, corroborate
AND sharpen (Phase 2 needed no sharpening; F9 did -- both outcomes are
the method working). Refuted premises route to the operator as dated
`decisions.md` amendments, never silent overrides (one question, plain
English, recommended option). The **ktx-mvdsv-l1-describe-fill arc is a
SEPARATE, STILL-ACTIVE arc** sharing the migration chain + `quality-
grid.ts` -- F8 / `feedback_cross_phase_audit_shared_file_drift`:
re-derive every shared volatile value LIVE at the Phase-3 gate, NEVER
trust a frozen ordinal/cite, NEVER touch its files or `git add -A`. The
ezQuake help-JSON doc-gap arc is a SEPARATE sequenced follow-on (NOT
this arc). FTE/QWCL/MVDSV is a per-fork gated follow-on (D2/D22), off by
default (NOT this arc). Post-arc review is arc-reviewer, fresh terminal,
NOT the execution orchestrator.

## Phase-3 executor prompt (dispatch this verbatim in a FRESH arc-executor terminal)

> [EXECUTION] arc-executor, arc `2026-05-17-enforce-l1-runtime-truth`,
> Phase 3 (Unified L1 fidelity schema + loader). LOCKED MD:
> `phase-3-unified-schema-loader.md`. Read the scaffold + the P3 MD +
> the spec COLD; critically review vs decisions/review-findings FIRST.
> Confirm pin BOTH legs `3f9e724fa608e516040f02b9557808ff3efda53e` (git
> HEAD of `research/repos/ezquake-source` + `oracle_meta
> ezquake:source_repo_commit` via the Postgres container; STOP if
> moved). Phases 1+2 SHIPPED (`51604f67` / `3c136826`+`b23f96eb`) --
> share NO code/schema/gate between the two tracks (D1/D12: TWO
> physically separate JSONB columns, no `kind` discriminator). Confirm
> the Phase-3 target files are in their expected state and the Postgres
> dev container `qw-oracle-postgres-dev` is up (REQUIRED by this phase).
>
> Prior-phase learnings carried (HARD):
> - **F8 STANDING RULE (the load-bearing Phase-3 rule -- verbatim).**
>   The migration ordinal MUST be EXECUTOR-DERIVED at execution as
>   `(highest integer prefix in db/migrations/) + 1` (e.g. `ls
>   db/migrations/ | sed 's/_.*//' | sort -n | tail -1` then +1),
>   IMMEDIATELY before writing the file, and NEVER hard-coded. The P3 MD
>   Recon's "currently 015" is STALE the moment you read it -- the
>   SIBLING **ktx-mvdsv describe-fill arc is STILL ACTIVE** and shares
>   the append-only sha256-tracked migration chain; it may have consumed
>   more ordinals since the P3 freeze. A duplicate ordinal is
>   silent-corruption-class. Likewise EVERY `quality-grid.ts` line-cite
>   in the P3 MD is re-derived by SYMBOL search at execution (the
>   ktx-mvdsv arc appended ~166+ lines to `quality-grid.ts`
>   post-P3-freeze -- a frozen cite reads the wrong lines). NEVER trust
>   a frozen number/cite; derive live, state what you derived and the
>   command you used.
> - **Phase-2 OQ-2 consumed-field-names contract (P3 resolves it -- this
>   IS the Track-B input shape, verified live this session against the
>   shipped `_handler_hud.py finalize()`).** `ezquake-hud-commands-ast
>   .json` = `{ "hud_commands": { "<name>": { "hud_family":
>   "bare"|"plus"|"minus", "hud_element": "<HUD_Register arg0 literal>",
>   "ast": { "handler_fn": "HUD_Func_f"|"HUD_Plus_f"|"HUD_Minus_f",
>   "source_file", "source_line", "source_column", "enclosing_function",
>   "build_variant", "registration_api": "Cmd_AddCommand"|
>   "Cmd_AddRemCommand" } } }, "r1": {"nonliteral_first_arg_sites":[],
>   "nonliteral_count":0}, "_stats": {"source_total":129,"bare":83,
>   "plus":23,"minus":23,"elements":83} }`. The Phase-1 Track-A input is
>   the IN-PROCESS `reachable(entity) -> {conclusion: genuine-dead|
>   build-excluded, feeder: callgraph|commented-register, evidence:
>   <feeder-tagged>}` contract (P1 writes NO file; P3 owns the additive
>   serialization seam per OQ-1 / D7.3 / D14).
> - **F10 standing lesson (the X3 baseline leg).** Phase 3 ships X3
>   too. Its X3 baseline (toggle-OFF) leg MUST explicitly set the
>   handler OFF env vars in the literal command (e.g. `CALLGRAPH_OFF=1
>   HUD_COMMANDS_OFF=1 ...`); a bare command + a "forced off" comment
>   silently no-ops X3 (the F6/F10 silent-no-op class). Enumerate the
>   OFF switches in the literal block.
> - The F9 worked example (a drafter "Recon (verified)" block is a
>   hypothesis -- re-verify live; trust live code over the MD's frozen
>   cites). Phase-2 had NO deviation (R1 GREEN); the F6/F9/F10 pattern
>   is the precedent if a P3 premise is refuted: surface + STOP for an
>   operator amendment, do NOT silently redesign.
> Constraints (HARD): D1/D12 two physically separate nullable JSONB
> columns, no `kind` discriminator; D14 one three-slot spine; D15
> Track-A feeder-tagged per-variant (the 4 ezQuake configs + D5
> 3-valued state + address_taken_residue); D16 Track-B element-linked;
> D13 slot-3 `dump_confirmation` REPRESENTATION ONLY -- loader writes
> level-2 (`high-confidence-generalized`) for every populated row, NO
> dump cross-check (that is Phase 4 / D19; a Phase-3 cross-check is an
> X2/W4 regime collision). F1 `probeJsonbNotStrings` += the 3 columns +
> a new shape probe; bind JSONB via `tx.json(...)` NEVER
> `JSON.stringify`+TEXT (`reference_postgres_js_jsonb_binding`). X9
> population is re-extract+re-load, never SQL UPDATE; `013`-shape
> migration (pure schema, no backfill). X3: 8 F6 stems byte-identical;
> the Phase-2 9th + the Phase-3 Track-A signal 10th are additive (NOT
> in the byte-identical set). Verify ENTIRELY on THIS phase's own
> output (X2/W4: migration applies + idempotent re-run + SCHEMA.md diff
> + F1 + a REAL Phase-1/2-output round-trip) -- NEVER the runtime dump
> (Phase 4 answer key) or the combined harness (Phase 4/5). Locked
> modes: Task-1 (the two-field/three-slot schema DESIGN) `subagent
> (Opus MAX)`; mechanical synthesis `subagent (Sonnet medium)`;
> near-zero inline (X5/X6). Do NOT commit; HALT structured (STATUS +
> the ACTUAL probe OUTPUTS not "PASS"; the live-derived migration
> ordinal + the exact command you derived it with; every re-derived
> `quality-grid.ts` cite; any decisions.md deviation; open questions;
> the F8 carry-forward verbatim for the Phase-4 chain). Do NOT proceed
> to Phase 4.
