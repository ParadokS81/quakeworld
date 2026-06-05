# Phase 4 -- validate + concept-note decision

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). DONE.
> 2. Read `review-findings.md`; identify which findings apply: F3 (VALIDATION-RUNBOOK sqlite commands stale -> translate to Postgres) and F7 (counts are extractor-truth, not hand-counts). DONE.
> 3. Run live recon (Read/grep) on all real source files this phase touches: VALIDATION-RUNBOOK.md, the validate-extractor SKILL.md, quality-grid.ts floor-probe factories + arrays + REGRESSION_PROBES, the three concept-note candidate anchors, the entities/versions schema. DONE. See Open questions for findings.
> 4. After drafting, dispatch the verification sub-agent. DONE -- `Agent` tool unavailable in this drafting session; verification performed INLINE by the drafter against live source. The planner runs an independent Explore verifier after this halts. See Open questions for what was verified and any gaps.

---

## Live recon summary (verified against source before drafting)

**Validation methodology source (F3/D12 -- the load-bearing translation):**
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` is the canonical methodology BUT it is riddled with stale `sqlite3 .../data/knowledge.db` commands (Section 0 pre-flight lines 37-46; Section 1.2 line 95; Section 3.1 lines 168-173; Section 3.2.1/3.2.2 lines 192-228; Section 6 lines 315-318). It also uses `extract-tag` and `npm --prefix apps/qw-oracle` invocations. For this arc: every DB query is Postgres (psql / postgres-js), the load path is `load-version --json` not `extract-tag` (D1), and the runner is `bun` (qw-oracle CLAUDE.md). The runbook's METHOD is sound; its COMMANDS are translated below per section.
- `~/.claude/skills/validate-extractor/SKILL.md` -- the orchestrator. Mode A (post-ship) is the right mode for both projects. Its dispatch shape (Phase 1 reproduction sequential -> Phase 2 parallel sub-agent deep checks -> Phase 3 integration -> Phase 4 synthesis) is the structure Task 1 follows. NOTE: the skill itself ALSO carries stale sqlite3 + extract-tag pre-flight commands (lines 78-83); apply its METHOD, not those commands (it predates the Postgres port). The runbook is the authority; the skill is the dispatcher.

**Quality-grid floor-probe factories (verified, exact signatures):**
- `makeFloorCountProbe(project: Project, type: string, expected: number): Probe` -- `quality-grid.ts:2367`. Emits `F1.<project>.floor.<type>_count`; equality assertion (`actual === expected`); gated to run only when `ctx.project === project` (returns PASS-skip otherwise).
- `makeFloorSourceStateProbe(project: Project, type: string, expected: Record<string, number>): Probe` -- `quality-grid.ts:2407`. Emits `F1.<project>.floor.<type>_source_state`; exact key-set + per-key equality; same `ctx.project` gating.
- Per-project arrays: `EZQUAKE_FLOOR_PROBES` (2505), `FTE_FLOOR_PROBES` (2549), `MVDSV_FLOOR_PROBES` (2564), `QWCL_FLOOR_PROBES` (2581), `KTX_FLOOR_PROBES` (2590). The MVDSV array (the closest analog: a source-only C port with no help-JSON) uses pure `{ source_backed: N }` shapes for every type (lines 2565-2578) -- the shape qtv/qwfwd will mirror.
- `REGRESSION_PROBES` array at line 2913; the five per-project arrays are spread in at lines 2958-2962. `quality-grid --family regression` (or `both`) pushes `REGRESSION_PROBES` (line 3014). Adding `QWFWD_FLOOR_PROBES` and `QTV_FLOOR_PROBES` + spreading them is the complete wiring.

**Source-state shape (verified):** `upsertEntity` in `natural-keys.ts:154-155` sets `source_state` from the adapter input on INSERT; for a first-load source-only project with no help-JSON origin (D2 implication: qtv/qwfwd have no ezquake/fte help-JSON), every row is `source_backed`. No `doc_only`, no `source_retired` (those require a help-JSON seed or a prior-version retirement, neither of which exists for a single frozen snapshot). MVDSV confirms the pattern.

**Phase-1/2 V4 baselines (the floor-probe `expected` values):**
- **QTV** (Phase-2 V4, hardcoded AND grep-verified during planning): `cvar = 41`, `command = 12`. (My recon grep returns 41 cvar registration call-sites and 13 `cmd.Register` call-sites; the 13th is the commented-out `// qtv.cmd.Register("set", setCmd)` at `var.go:86`, which `go/ast` skips -- so the extractor yields 12, matching the Phase-2 V4 hardcode. This is exactly the F7 lesson: the extractor count is truth, a raw grep is not.) `cmdline_param = 0`, `info_key = 0` (no probes for absent types).
- **QWFWD** (Phase-1 V4, NOT hardcoded -- F7 governs, counts recorded at execution): planning recon expects approximately `cvar ~12-14`, `command ~30`, `cmdline_param = 2`, `info_key = 6`. These are NOT authoritative. The executor reads the LIVE Phase-1 V4 counts from Postgres and uses those exact numbers as the floor-probe `expected` (Task 2 step 1 below). The probes are written with placeholder tokens the executor replaces.

**Three concept-note candidate anchors (all verified against live source):**
- (a) **Master-server registration/heartbeat:** QTV `masters` (`udp.go:67`, default const `qwDefaultMasters`); QWFWD `masters`/`masters_query`/`masters_heartbeat`/`masters_filter_servers` (`query.c:697-700`). Cross-codebase: MVDSV + ezQuake (querier).
- (b) **MVD streaming + parse_delay ghosting:** QTV `parse_delay` (`upstream_storage.go:85`, default `"7"`) + `tick_time` (`qtv.go:212`, default `"100"`). MVDSV `qtv_*` See-also anchors shipped.
- (c) **qtv_password cross-codebase auth matrix:** QTV `qtv_password` (`downstream_storage.go:200`, default `""`); MVDSV `qtv_password` ledger documents the full PLAIN / CCITT / MD4 / SHA3-512 matrix (`sv_demo_qtv.c:514/520/529/544`). The three shipped MVDSV See-also ledgers exist: `mvdsv-svdemo-ledger-qtv_password.md`, `mvdsv-svdemo-ledger-qtv_maxstreams.md`, `mvdsv-svdemo-ledger-qtv_streamport.md`.

**Concept-note breadcrumb input (verified):** the `[L3 breadcrumb: <candidate>]` tag is a NEW convention this arc's Phase 3 introduces (mother-ledger SR-5; absent from the sibling arc -- grep of the sibling plan dir returns 0 hits). The tag is written into `description_reasoning` (a real column, `entities`, migration `014:98`). Phase 4's concept-note decision queries those tags + the now-described knobs as its evidence. No tag exists until Phase 3 runs; this is a Phase-3 -> Phase-4 input.

**Report precedent (verified):** validation reports live at `docs/superpowers/reviews/` named `<date>-<project>-<version>-validation.md` (e.g. `2026-04-28-ezquake-validation.md`, `2026-04-28-mvdsv-validation.md` shape). No qtv/qwfwd reviews exist yet. The cross-project audit precedent is `2026-04-28-cross-extractor-audit-report.md` / `2026-05-06-ktx-onboarding-cross-project-audit.md`.

---

## Goal

This phase closes the arc: it runs the `validate-extractor` / VALIDATION-RUNBOOK methodology against both new extractors (Postgres-only, F3/D12), adds the F1 floor probes for `qtv` and `qwfwd` to `quality-grid.ts` so `quality-grid --family regression` covers all seven projects, and produces the deferred concept-note if/which DECISION (D9) -- a written author/defer/drop recommendation per the three candidates, grounded in the Phase-3 breadcrumbs plus the now-described knobs, WITHOUT authoring any note. Deliverables: two per-project validation reports at `docs/superpowers/reviews/` (Task 4); the floor-probe additions (Task 2); the concept-note decision write-up appended to the validation reports / a standalone decision section (Task 3). At phase boundary: both extractors pass the runbook checks (reproducibility re-confirmed, count reconciliation source->JSON->DB exact, field-accuracy sample clean), `quality-grid --family regression` is green WITH the new qtv/qwfwd floor probes for both projects, `bunx tsc --noEmit` is green (the quality-grid edit compiles), and the concept-note decision is documented with per-candidate verdicts. Runnable state at boundary: the L1 extraction pipeline for qtv/qwfwd is validated end-to-end and regression-guarded; the arc is complete.

---

## Inputs from previous phase

Phase 3 outputs (all must be verified before Phase 4 begins):

- Every `project='qtv'` entity (41 cvars + 12 commands) has `description IS NOT NULL`, `description_origin='synthesized'`, `description_anchor_version='1.16-dev'`.
- Every `project='qwfwd'` entity (all four types) has `description IS NOT NULL`, `description_origin='synthesized'`, `description_anchor_version='1.40-dev'`.
- Phase-3 V6 green: no QTV description references a C-only knob; all QTV descriptions anchor to a Go `source_file` under `pkg/`.
- `description_reasoning` carries `[L3 breadcrumb: <candidate>]` tags (SR-5) for any knob touching the three concept-note candidates. THESE TAGS ARE THE DECISION INPUT for Task 3.
- The quality-grid `synthesized_requires_anchor` / `origin_vocabulary` / `provenance_entry_exists` probes are already extended to cover qtv/qwfwd (Phase-3 Task 3). Phase 4 ADDS the floor probes; it does NOT re-touch the describe-fill probes.
- `bunx tsc --noEmit` exits 0 (Phase 0/1/2/3 V-chains green).
- Postgres `versions` table: one row each for `qtv` (`1.16-dev`, ordinal 1) and `qwfwd` (`1.40-dev`, ordinal 1).
- Both extractors are reproducible (empty re-extract diff) and idempotent (re-load = no new rows) -- proven per-phase (Phase-1 V7/V8, Phase-2 V7/V8). Phase 4 re-confirms this cross-project as a validation gate, not as new work.
- The Phase-1 V4 QWFWD per-type counts and the Phase-2 V4 QTV per-type counts are RECORDED (in the executed phase outputs / commit). These are the floor-probe baselines. If the executed counts were not captured, re-run the V4 count query (Task 2 step 1) to recover them.

---

## Files touched

### Created

```
docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md   # hand-written; QWFWD validation report + concept-note decision section
docs/superpowers/reviews/2026-06-05-qtv-1.16-dev-validation.md     # hand-written; QTV validation report + (shared) concept-note decision reference
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts             # add QWFWD_FLOOR_PROBES + QTV_FLOOR_PROBES arrays; spread both into REGRESSION_PROBES
```

### Deleted

```
n/a
```

Absolute paths from repo root. No silent deletions.

Note on the concept-note decision artifact: D9 mandates a written if/which recommendation, not authored notes. The decision lives as a dedicated section inside the QWFWD validation report (the master-server candidate touches QWFWD, so that report is the natural home), with the QTV report cross-referencing it. A separate decision file is NOT created -- the decision is small and belongs with the validation evidence it draws on (avoids a fourth doc that drifts). If the operator prefers a standalone `docs/superpowers/reviews/2026-06-05-qtv-qwfwd-concept-note-decision.md`, that is a one-paragraph relocation; surfaced in Open questions.

---

## Tasks

---

### Task 1 -- Run the validation pass (both projects, Postgres-only)

**Goal:** Execute the VALIDATION-RUNBOOK methodology against `qtv` and `qwfwd` via the `validate-extractor` Mode-A dispatch shape, translating every sqlite command to Postgres (F3/D12). This task PRODUCES the evidence; Task 4 writes it up.

**Files:** none created/modified by this task itself -- it gathers evidence (command outputs) consumed by Task 4. (The validation pass is read-only against the DB and source; it modifies nothing.)

**The Postgres connection (used by every probe below):** all DB queries run via `psql "$DATABASE_URL"` or `bun` against postgres-js. `$DATABASE_URL` is the `postgresql://` URL from the qw-oracle env (the same one `db/migrate.ts` uses). There is NO `data/knowledge.db` (it is 0 bytes; the SQLite era ended at Arc 1). A single inline helper for the report:
```bash
# from apps/qw-oracle/ -- DATABASE_URL is read from the project env (.env / shell)
psql "$DATABASE_URL" -c "<query>"
```

**Steps (the runbook sections, translated to Postgres + the load-version load path; run per project for `<project>` in {qwfwd, qtv}):**

- [ ] **Section 0 -- Pre-flight (Postgres).** Confirm the loaded version row and schema state:
  ```sql
  -- replaces runbook lines 37-46 (sqlite + git rev-parse against research/repos -- N/A, qtv/qwfwd are vendored no-.git)
  SELECT project, version, commit_sha, ordinal, parse_state
  FROM versions WHERE project = '<project>';
  ```
  PASS: exactly 1 row; `version`/`commit_sha` = the frozen label (`1.40-dev` qwfwd, `1.16-dev` qtv per D4), `parse_state='ok'`. There is no `git rev-parse` cross-check (no `.git`); the version constant IS the identity (D4/F5). Schema-version check (runbook lines 45-46, `PRAGMA user_version`): replaced by confirming migration 020 is applied --
  ```sql
  SELECT filename FROM schema_migrations WHERE filename = '020_qtv_qwfwd_projects.sql';
  ```
  PASS: 1 row.

- [ ] **Section 1.1 -- Reproducibility (re-extract = empty diff).** Re-run each extractor and confirm zero git diff on its output dir. This re-confirms Phase-1 V8 / Phase-2 V8 at validation time (the runbook's primary determinism proof):
  ```bash
  # QWFWD (libclang)
  cd apps/qw-oracle/scripts/extractors/qwfwd
  python3 extract.py --repo-root ../../../../slipgate-app/reference/qwfwd --output-dir output --handlers all --workers 12
  git diff --stat output/
  # QTV (go/ast)
  cd apps/qw-oracle/scripts/extractors/qtv
  go run . --src ../../../../slipgate-app/reference/qtv --out output
  git diff --stat output/
  ```
  PASS: both `git diff --stat output/` are empty. FAIL: non-empty -> non-deterministic finalize sort or absolute-vs-relative path (runbook 1.1 common causes; Phase-1 V8 / Phase-2 V8 recovery notes apply). Record wall time for the report.

- [ ] **Section 1.2 + 1.3 -- Count reconciliation source->JSON->DB + idempotency (Postgres + load-version, NOT extract-tag).** D1: qtv/qwfwd never use `extract-tag`; the load path is `load-version --json`. Re-run the Phase-1/2 load recipe (the four `load-version` calls for qwfwd; the two for qtv) a SECOND time and confirm idempotency, then reconcile counts JSON->DB:
  ```bash
  # the _stats.count from each output JSON is the JSON-side count
  python3 -c "import json,glob;
  [print(p, json.load(open(p))['_stats'].get('count')) for p in sorted(glob.glob('apps/qw-oracle/scripts/extractors/<project>/output/*-ast.json'))]"
  ```
  ```sql
  -- DB-side count
  SELECT type, COUNT(*)::int AS n FROM entities WHERE project = '<project>' GROUP BY type ORDER BY type;
  ```
  PASS: per-type DB count == the corresponding JSON `_stats.count` (source->JSON->DB exact, runbook 1.2 acceptance); the second load-version run reports `inserted: 0` for every type (runbook 1.3 idempotency). FAIL: any mismatch -> silent data loss (a load-version drop) or an idempotency break (re-run inflation -- the `feedback_idempotency_before_staleness` failure mode).

- [ ] **Section 2 -- Runtime cross-validation: N/A, documented as a SKIP with reason.** Both targets are frozen vendored snapshots with no live build / no runtime dump (no `cvarlist`/`cmdlist` capture) in this environment (`project_qw_dev_head_not_releases` notes the dev-head self-build model applies to the engine ports, not these two frozen proxies). Section 2's three-bucket diff requires a runtime dump that does not exist. Record this as "Section 2: not applicable (no runtime dump for a frozen vendored snapshot)" in the report -- a documented skip, not a silent omission (runbook discipline line 15). This is NOT a finding; it is a precondition failure flagged per Section 0 guidance.

- [ ] **Section 3.1 -- Field-accuracy audit (random sample, Postgres).** Pull a random sample per type and verify each field against the literal source at `source_file:source_line`. Sample size 20/type (Mode A); for the small qtv/qwfwd surfaces, sample ALL rows for any type with <= 20 entities (i.e. all qwfwd cmdline_param/info_key, all qtv commands):
  ```sql
  -- cvars (replaces runbook lines 168-173 sqlite)
  SELECT e.name, cv.default_value, cv.flags_raw, cv.on_change, cv.source_file, cv.source_line, cv.trailing_comment
  FROM entities e JOIN cvar_versions cv ON e.id = cv.entity_id
  WHERE e.project = '<project>' ORDER BY RANDOM() LIMIT 20;
  -- commands
  SELECT e.name, cmv.handler_fn, cmv.source_file, cmv.source_line, cmv.help_desc
  FROM entities e JOIN command_versions cmv ON e.id = cmv.entity_id
  WHERE e.project = '<project>' ORDER BY RANDOM() LIMIT 20;
  -- qwfwd only: cmdline_param + info_key (sample all)
  SELECT e.name, cpv.source_file, cpv.source_line
  FROM entities e JOIN cmdline_param_versions cpv ON e.id = cpv.entity_id
  WHERE e.project = 'qwfwd';
  SELECT e.name, ikv.scope, ikv.operations, ikv.source_file, ikv.source_line
  FROM entities e JOIN info_key_versions ikv ON e.id = ikv.entity_id
  WHERE e.project = 'qwfwd';
  ```
  For each row: open the source file at `source_file:source_line` and confirm `default_value` matches the registration's default arg, `flags_raw` matches the flag arg (qtv: `qVarFlag*` symbolic; qwfwd: `CVAR_*` symbolic, empty for `0`/absent), `handler_fn` matches the registered function, and the position points to the real registration line. PASS: every sampled field matches source (runbook 3.1 acceptance). Any mismatch is a finding (severity per the field's downstream load-bearing-ness).

- [ ] **Section 3.2 -- Cross-project field-shape audit (Postgres).** Confirm qtv/qwfwd `flags_raw` follows the post-v17 sentinel contract (absent/`0` -> empty string, never NULL or `'0'`) for `source_backed` cvars. NOTE the runbook's 3.2.2 positive contract is scoped to `ezquake/fte/mvdsv` (the CVAR_* bitmask domain); qtv uses `qVarFlag*` names and qwfwd uses `CVAR_*` names -- qwfwd fits the CVAR_* family, qtv does NOT (Go flag identifiers). Run the NEGATIVE regression bar (3.2.1) for both, and the POSITIVE contract only where applicable:
  ```sql
  -- 3.2.1 negative bar (both projects): zero rows expected
  SELECT e.project, cv.flags_raw, COUNT(*)::int
  FROM cvar_versions cv JOIN entities e ON cv.entity_id = e.id
  WHERE e.project IN ('qtv','qwfwd')
    AND e.source_state = 'source_backed'
    AND (cv.flags_raw IN ('0','CVAR_NONE') OR cv.flags_raw IS NULL)
  GROUP BY e.project, cv.flags_raw;
  ```
  PASS: 0 rows (no NULL / `'0'` / `'CVAR_NONE'` flags_raw -- the post-v17 contract). FAIL: a handler bypassed flag normalization (Phase-1 cvars handler imports `normalize_flags_raw`; Phase-2 extractor's `resolveFlags` emits `""` for `0`). Whether to ADD a qtv `qVarFlag*` positive contract to the runbook's "candidate positive contracts" list is a finding-disposition decision (default: note as future-arc work, mirroring the QWCL carve-out rationale at runbook line 234).

- [ ] **Section 4 -- Code review (handlers + adapters), dispatched as parallel sub-agents (the validate-extractor Mode-A Phase-2 fan-out).** Three read-only sub-agents (see Execution mode):
  - Sub-agent 4a (QWFWD handlers): read `apps/qw-oracle/scripts/extractors/qwfwd/_handler_{cvars,commands,cmdline,info_keys}.py` end-to-end per runbook 4.1; confirm the F6 `cvar.c` exclusion (cvars handler) and the no-exclusion-for-commands distinction (Phase-1 A1); confirm fork-mode worker boundary (plain-data only); confirm finalize sorts by name (determinism).
  - Sub-agent 4b (QTV extractor): read `apps/qw-oracle/scripts/extractors/qtv/extract.go` end-to-end; confirm the const-table pre-pass resolves `qwDefaultMasters`/`qtvRelease`, the `cmd.Register` lowercasing (`cmd.go:282`), the `*version` verbatim emission, the BinaryExpr int-fold, and the sort-before-emit (determinism); confirm stdlib-only imports.
  - Sub-agent 4c (cross-project adapter + sibling shape, runbook 4.2 + 4.4): confirm the four loader adapters (`load-cvars.ts`/`load-commands.ts`/`load-cmdline-params.ts`/`load-info-keys.ts`) read exactly the `ast` fields the two extractors emit (the contract Phase-1/2 already verified); line up the qwfwd C handlers against the mvdsv siblings (apples-to-apples post-consolidation) and flag undocumented divergences; confirm the qtv Go extractor's JSON shape matches the C-port JSON shape (the cross-front-end audit unique to this arc). NOTE: KTX is tree-sitter-excluded from this skill, but qtv (Go) is a NEW front-end class -- the divergence here is expected and documented (a Go extractor vs C extractors), not a finding.
  PASS: every divergence has a written justification (runbook 4.4 acceptance); no swallowed exceptions without docstring; no non-determinism. Findings -> Task 4 findings table.

- [ ] **Section 5 -- Spec compliance (Postgres).** Validate against the arc spec (`docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md`), not memory: every entity type the spec claims is present with non-zero rows; "no new entity types" holds (only cvar/command/cmdline_param/info_key for these projects):
  ```sql
  SELECT DISTINCT type FROM entities WHERE project IN ('qtv','qwfwd') ORDER BY type;
  ```
  PASS: qwfwd shows exactly {cvar, command, cmdline_param, info_key}; qtv shows exactly {cvar, command}; NO other type (D5 no-new-types gate). When spec hand-counts diverge from live counts, trust live data + flag the spec (F7).

- [ ] **Section 6 -- Quality grid (Postgres, all projects).** Run the full grid for the two NEW projects (and spot-check the existing five did not regress). This is run AFTER Task 2 adds the floor probes (Task 2 is a dependency for the green-grid gate; the report records the post-Task-2 run):
  ```bash
  cd apps/qw-oracle
  bun scripts/load-knowledge/index.ts quality-grid --project qwfwd --family both
  bun scripts/load-knowledge/index.ts quality-grid --project qtv --family both
  ```
  PASS: every `F1.qwfwd.*` and `F1.qtv.*` probe PASS (floor counts + source_state + the describe-fill probes Phase 3 extended); F2 anomaly probes CLEAN or tracked. FAIL: a floor-count mismatch (re-baseline per F7 if the extractor legitimately changed) or a describe-fill probe FAIL (route to Phase-3 recovery).

- [ ] **Section 8 -- Final integration checks (Postgres + tooling).**
  ```bash
  cd apps/qw-oracle && bunx tsc --noEmit                 # clean exit (the Task 2 edit compiles)
  python3 -c "import sys; sys.path.insert(0,'apps/qw-oracle/scripts/extractors'); import qwfwd._handler_cvars, qwfwd._handler_commands, qwfwd._handler_cmdline, qwfwd._handler_info_keys"  # qwfwd handlers import clean
  # MCP smoke (Postgres-backed): lookup a known knob per project
  ```
  MCP smoke via the MCP tools (server pointed at the Postgres `$DATABASE_URL`):
  ```
  lookup_entity(project="qwfwd", name="masters")        -> row, description non-null, source_file query.c
  lookup_entity(project="qtv",   name="qtv_password")   -> row, description non-null, source_file downstream_storage.go
  ```
  PASS: tsc exit 0; both handler-import lines succeed; both MCP lookups return described rows. (Go extractor has no Python import check -- it is a standalone `go run` binary; the equivalent is `go vet ./...` from the extractor dir, optional.)

**Verification (task-level):** every section above either PASSes its acceptance or produces a dispositioned finding. Section 2 is a documented N/A. No section is silently skipped (runbook discipline).

**Execution mode:** `subagent (Sonnet medium, Explore-shape)` for the Section-4 read-only deep checks (4a/4b/4c dispatched in parallel -- the validate-extractor Mode-A Phase-2 fan-out; read-and-report, no fixes). The remaining sections (0/1/2/3/5/6/8) are `inline` -- they are deterministic command/SQL invocations the orchestrator runs in-terminal and records, per the runbook's "run sequentially in this terminal" guidance for reproduction + integration phases. Rationale: code-review reading benefits from fresh-context parallel sub-agents (the skill's design); command execution + evidence capture does not need a sub-agent.

---

### Task 2 -- Add F1 floor probes for qwfwd + qtv to quality-grid.ts

**Goal:** Add `QWFWD_FLOOR_PROBES` and `QTV_FLOOR_PROBES` arrays via the existing `makeFloorCountProbe` / `makeFloorSourceStateProbe` factories, baselines from the Phase-1/2 V4 loaded counts, and spread both into `REGRESSION_PROBES` so `quality-grid --family regression` covers the two new projects.

**Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

**Step 0 -- recover the exact baselines (F7: extractor counts are truth).** Before writing the probes, read the LIVE per-type counts from Postgres (the Phase-1/2 V4 numbers):
```sql
SELECT project, type, COUNT(*)::int AS n
FROM entities WHERE project IN ('qwfwd','qtv')
GROUP BY project, type ORDER BY project, type;
SELECT project, type, source_state, COUNT(*)::int AS n
FROM entities WHERE project IN ('qwfwd','qtv')
GROUP BY project, type, source_state ORDER BY project, type, source_state;
```
The first query gives the `makeFloorCountProbe` `expected` per type; the second gives the `makeFloorSourceStateProbe` `expected` Record per type. **Use these live numbers, not the planning estimates.** Expected shape (verified analog -- MVDSV, a source-only C port): every type is `{ source_backed: N }` (no `doc_only`, no `source_retired` -- a single frozen snapshot from source with no help-JSON). If the source_state query returns any other key for qtv/qwfwd, STOP and investigate before baselining (it would mean the loader mis-set source_state -- the `feedback_loader_adapter_must_reassert_source_state` failure mode).

**Steps:**

- [ ] Run Step 0 and capture the per-type counts + source_state distributions for both projects.
- [ ] Add the QWFWD array immediately after `KTX_FLOOR_PROBES` (after line 2620, before `REGRESSION_PROBES` at 2913 -- place adjacent to the other floor arrays). QTV has NO cmdline_param and NO info_key, so it gets only cvar + command probes. QWFWD has all four. Full content (replace the `<N>` baseline tokens with the Step-0 live counts):
  ```typescript
  // QWFWD (qqshka UDP forwarder/proxy) -- frozen vendored snapshot, source-only
  // (no help-JSON), so every entity is source_backed. Baselines = the Phase-1
  // V4 loaded counts (F7: extractor count is the truth, not the design hand-count).
  // Post-v17 these are equality assertions, not floors.
  const QWFWD_FLOOR_PROBES: Probe[] = [
    makeFloorCountProbe('qwfwd', 'cvar', <N_cvar>),
    makeFloorSourceStateProbe('qwfwd', 'cvar', { source_backed: <N_cvar> }),
    makeFloorCountProbe('qwfwd', 'command', <N_command>),
    makeFloorSourceStateProbe('qwfwd', 'command', { source_backed: <N_command> }),
    makeFloorCountProbe('qwfwd', 'cmdline_param', <N_cmdline>),
    makeFloorSourceStateProbe('qwfwd', 'cmdline_param', { source_backed: <N_cmdline> }),
    makeFloorCountProbe('qwfwd', 'info_key', <N_info>),
    makeFloorSourceStateProbe('qwfwd', 'info_key', { source_backed: <N_info> }),
  ];

  // QTV (QW-Group Go proxy) -- frozen vendored snapshot, source-only, all
  // source_backed. Baselines = the Phase-2 V4 loaded counts (grep-verified
  // during planning: 41 cvars + 12 commands; 0 cmdline_param, 0 info_key).
  const QTV_FLOOR_PROBES: Probe[] = [
    makeFloorCountProbe('qtv', 'cvar', 41),
    makeFloorSourceStateProbe('qtv', 'cvar', { source_backed: 41 }),
    makeFloorCountProbe('qtv', 'command', 12),
    makeFloorSourceStateProbe('qtv', 'command', { source_backed: 12 }),
  ];
  ```
  NOTE on the QTV baselines: 41 / 12 are the Phase-2 V4 hardcoded-and-verified counts. The executor MUST still confirm them against Step 0's live query (F7 -- if the executed extractor produced a different count, the live number wins and this comment is updated). The QWFWD baselines have NO planning hardcode (Phase-1 V4 deferred to execution per F7) -- the `<N>` tokens are mandatory replacements from Step 0.
- [ ] Spread both arrays into `REGRESSION_PROBES` (line 2913), immediately after the `...KTX_FLOOR_PROBES,` line (currently 2962):
  ```typescript
    ...KTX_FLOOR_PROBES,
    ...QWFWD_FLOOR_PROBES,
    ...QTV_FLOOR_PROBES,
  ```
- [ ] Run `bunx tsc --noEmit` from `apps/qw-oracle/` to confirm the edit compiles. The `'qtv'`/`'qwfwd'` string literals are valid `Project` members (Phase-0 widened the union; the factories take `project: Project`).

**Verification (task-level):**
```bash
cd apps/qw-oracle && bunx tsc --noEmit   # exit 0
bun scripts/load-knowledge/index.ts quality-grid --project qwfwd --family regression
bun scripts/load-knowledge/index.ts quality-grid --project qtv --family regression
```
PASS: tsc exit 0; both runs show the new `F1.qwfwd.floor.*` and `F1.qtv.floor.*` probes PASS (4 type-pairs for qwfwd = 8 probes; 2 type-pairs for qtv = 4 probes). FAIL: a count mismatch means the baseline token was wrong (re-read Step 0) or the executed extractor count differs from the Phase-1/2 V4 capture (F7: the live count wins -- update the baseline).

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis from a clear spec; 1 file; the judgment is correctly placing the two arrays + the two spread lines and substituting the Step-0 live baselines for the `<N>` tokens (the QWFWD numbers are NOT known at planning time -- the sub-agent reads them from Postgres first, per Step 0). This is the qw-oracle floor-probe pattern applied to two new projects.

---

### Task 3 -- The concept-note if/which DECISION (D9 -- decide, do NOT author)

**Goal:** Produce a written author/defer/drop recommendation for each of the three concept-note candidates, grounded in the Phase-3 `[L3 breadcrumb]` tags plus the now-described knobs. This is a DECISION artifact (D9), NOT a concept note. No note is authored in this arc; if the operator greenlights authoring, that is a follow-on arc.

**Planning provenance (2026-06-05, operator eyes-on at Phase-4 approval):** the operator reviewed the drafter's priors and endorsed them as the executor's STARTING BIAS -- (a) master-server registration/heartbeat = author (strong; widest cross-codebase span); (b) MVD streaming + `parse_delay` ghosting = author-lean, defer if the Step-0 breadcrumb harvest is thin; (c) `qtv_password` auth matrix = defer (the MVDSV ledger already documents the full PLAIN/CCITT/MD4/SHA3-512 matrix and the QTV row See-also-links to it). Step 0 refines these against live evidence -- the bias is the prior, not a lock -- but do not lightly discard (a), which the operator blessed as the strongest note. The FINAL author/defer/drop stays the operator's call at execution sign-off (framing/convention is human eyes-on per this arc's Phase-1 port/ip and Phase-3 Probe-B precedent).

**Files:** the decision section inside `docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md` (Task 4 writes the file; this task produces the section content).

**Step 0 -- gather the evidence (Postgres, the breadcrumb harvest).** Query the Phase-3 breadcrumbs and the described knobs per candidate:
```sql
-- which knobs Phase 3 tagged for each candidate
SELECT project, name, type, description_reasoning
FROM entities
WHERE project IN ('qtv','qwfwd')
  AND description_reasoning ILIKE '%[L3 breadcrumb:%'
ORDER BY project, name;
-- the described master-server knobs (candidate a)
SELECT project, name, description FROM entities
WHERE project IN ('qtv','qwfwd') AND name ILIKE 'masters%' ORDER BY project, name;
-- the described streaming knobs (candidate b)
SELECT project, name, description FROM entities
WHERE project='qtv' AND name IN ('parse_delay','tick_time');
-- the described auth knob (candidate c) + the shipped MVDSV anchor
SELECT project, name, description FROM entities
WHERE name = 'qtv_password' AND project IN ('qtv','mvdsv');
```

**Step 1 -- write the decision section.** For EACH candidate, write a verdict block with this shape (the decision is the operator's to make at sign-off; this task drafts the RECOMMENDATION with rationale so the operator can ratify or override):

```markdown
## Concept-note decision (D9 -- if/which; this arc decides, a follow-on arc authors)

This section is the deferred D9 decision: a per-candidate author/defer/drop recommendation
grounded in the Phase-3 breadcrumbs (`description_reasoning` `[L3 breadcrumb]` tags) and the
now-described L1 knobs. NO concept note is authored here (D9). The three MVDSV `qtv_*` See-also
anchors are shipped (`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/
mvdsv-svdemo-ledger-qtv_{password,maxstreams,streamport}.md`); any greenlit note links to them.

### Candidate (a) -- Master-server registration / heartbeat
- **Cross-codebase surface:** QWFWD `masters`/`masters_query`/`masters_heartbeat`/`masters_filter_servers`
  (query.c:697-700); QTV `masters` (udp.go:67); MVDSV `sv_master*` (sender side); ezQuake (querier side).
- **Phase-3 breadcrumb evidence:** <fill from Step-0 query: which knobs carried the master-server tag>.
- **Recommendation:** <author | defer | drop> -- <one-line rationale grounded in the breadcrumb density + cross-codebase span>.

### Candidate (b) -- MVD streaming + parse_delay ghosting
- **Cross-codebase surface:** QTV `parse_delay` (upstream_storage.go:85, default 7) + `tick_time`
  (qtv.go:212, default 100) <-> MVDSV MVD source (the `qtv_*` stream cvars) <-> ezQuake viewer.
- **Phase-3 breadcrumb evidence:** <fill from Step-0>.
- **Recommendation:** <author | defer | drop> -- <rationale>.

### Candidate (c) -- qtv_password cross-codebase auth matrix
- **Cross-codebase surface:** QTV `qtv_password` (downstream_storage.go:200) <-> MVDSV `qtv_password`
  (PLAIN/CCITT/MD4/SHA3-512, sv_demo_qtv.c:514/520/529/544, fully documented in the shipped ledger)
  <-> fteqtv wire protocol (research/repos/fteqw/fteqtv/source.c -- AUTH negotiation; D13 says fteqtv
  is xref-only, never an extraction target).
- **Phase-3 breadcrumb evidence:** <fill from Step-0>.
- **Recommendation:** <author | defer | drop> -- <rationale>.

### Decision summary
| Candidate | Recommendation | One-line why |
|---|---|---|
| (a) master-server | <...> | <...> |
| (b) MVD streaming / parse_delay | <...> | <...> |
| (c) qtv_password auth matrix | <...> | <...> |

**Operator ratification:** these are recommendations; the operator confirms or overrides at phase
sign-off. Any greenlit candidate becomes a follow-on concept-note authoring arc (not Phase-4 scope).
```

**The drafter's prior (recorded here so the executor has a starting position, NOT a mandate -- the breadcrumb harvest is the real input and may move these):**

- **(a) master-server registration/heartbeat -> AUTHOR (strong).** Widest cross-codebase span of the three: a single concept genuinely spread across qwfwd (4 knobs) + qtv (1) + mvdsv (sender) + ezquake (querier). The spec already grades it "Strong." This is the textbook case for a concept note -- it ties knobs no single L1 row can connect (the sender/querier split is invisible at the per-cvar level). Recommend authoring it as the FIRST follow-on note.
- **(b) MVD streaming + parse_delay ghosting -> AUTHOR (strong) OR DEFER (if breadcrumb-thin).** The ghosting mechanism (parse_delay holding the stream back N seconds so the proxy can ghost-fill) is a real cross-codebase behavior tying qtv timing knobs to the mvdsv MVD source and the ezquake viewer. Spec grades it "Strong." Lean AUTHOR, but its payoff depends on whether Phase 3 actually tagged `parse_delay`/`tick_time` with the streaming breadcrumb -- if the breadcrumb harvest is empty here, DEFER (the L1 descriptions may already carry enough, and a note with thin cross-references is premature; `feedback_l3_concept_notes_wiki_shape` -- earn the note).
- **(c) qtv_password cross-codebase auth matrix -> DEFER (lean) or AUTHOR.** The MVDSV `qtv_password` ledger ALREADY documents the full PLAIN/CCITT/MD4/SHA3-512 matrix in its `description_reasoning` + the shipped See-also anchor; the QTV `qtv_password` L1 row (Phase 3) will carry a See-also to it. The cross-codebase auth detail is the OTHER end of the protocol (how the proxy computes/sends the password), which the MVDSV ledger explicitly judged "not action-changing for the server admin beyond 'set it to require a password'" (qtv_password ledger D20 split note). So the payoff is narrower than (a): the knobs are already See-also-wired, and a full auth-matrix note risks being protocol-trivia rather than actionable guidance. DEFER unless the operator wants the negotiation-flow note for its own sake (it is genuine cross-codebase knowledge, just lower actionability). The fteqtv xref (D13) means a full note would reference a non-extracted codebase -- fine for a concept note (xref-only), but reinforces "defer until earned."

**The executor REPLACES these priors with the breadcrumb-grounded verdicts** -- if Step-0 evidence contradicts a prior, the evidence wins and the contradiction is noted. Decisions.md D9 is satisfied by the written if/which recommendation existing with per-candidate rationale; the operator ratifies.

**Steps:**

- [ ] Run the Step-0 breadcrumb-harvest queries; record which knobs carried which candidate tag.
- [ ] Write the decision section (above shape) with each `<fill>` replaced by the harvested evidence and each `<author|defer|drop>` set from the evidence (starting from the drafter's prior, moved only if evidence warrants).
- [ ] Confirm NO concept-note file is created anywhere under `curated/` (D9 -- decide, do not author). The ONLY output is the decision prose in the validation report.

**Verification (task-level):** the decision section exists with a verdict + rationale for all three candidates; a decision-summary table; an operator-ratification line. No file under `apps/qw-oracle/curated/concept-notes/` or `curated/asset-notes/` is created (`git status` shows no new curated file). PASS: three verdicts + table present, zero curated files touched. FAIL: a candidate has no verdict, OR a concept note was authored (D9 violation).

**Execution mode:** `subagent (Opus MAX)` -- the per-candidate author/defer/drop judgment is judgment-dense cross-codebase analysis (it weighs breadcrumb density, cross-codebase span, actionability, and the earn-the-note bar against three candidates with shipped See-also anchors). This is the "architecture / cross-cutting analysis" row of the model+effort guide. It is read-and-reason + write-prose (no DB writes, no authoring); a single Opus-MAX analysis sub-agent fits. Alternatively `inline` if the orchestrator session has budget and the breadcrumb evidence is unambiguous -- but the judgment density favors a dedicated MAX pass. Rationale for NOT routing through `describe-fill-synthesis` (D8): that skill is per-knob description synthesis, not concept-note scoping; this is a different task shape.

---

### Task 4 -- Assemble the validation report(s)

**Goal:** Write the two per-project validation reports at `docs/superpowers/reviews/`, each following the validate-extractor reporting format (one section per runbook section run, a findings table with dispositions), with the concept-note decision section (Task 3) embedded in the QWFWD report and cross-referenced from the QTV report.

**Files:**
- `docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md`
- `docs/superpowers/reviews/2026-06-05-qtv-1.16-dev-validation.md`

**Report shape (per the validate-extractor SKILL.md reporting format, lines 166-203, ASCII-only D7):**

```markdown
# <PROJECT> <VERSION> Validation Report

**Date:** 2026-06-05
**Mode:** post-ship (validate-extractor Mode A)
**Validated version:** <1.40-dev | 1.16-dev> (frozen vendored snapshot; commit sentinel = version label, D4/F5 -- no .git)
**DB:** Postgres 16 (postgresql:// via DATABASE_URL; data/knowledge.db is 0 bytes / unused)
**Validator:** Claude (validate-extractor methodology, Postgres-translated per arc decisions.md D12/F3)

## Summary
One paragraph: headline verdict + finding count by severity.

## Section-by-section results
### Section 0: Pre-flight        -- verdict + evidence (version row, migration 020 applied)
### Section 1: Reproducibility   -- verdict + evidence (empty re-extract diff; count reconciliation; idempotency)
### Section 2: Runtime cross-validation -- N/A (frozen snapshot, no runtime dump) -- documented skip with reason
### Section 3: Field-accuracy    -- verdict + sample evidence (20/type or all-rows for small types)
### Section 4: Code review       -- verdict + sub-agent 4a/4b/4c findings
### Section 5: Spec compliance   -- verdict (type-set matches spec; no new types)
### Section 6: Quality grid      -- verdict (all F1.<project>.* PASS incl. new floor probes)
### Section 8: Integration       -- verdict (tsc clean; handler imports; MCP smoke)

## Findings table
| ID | Section | Severity | File:Line | Description | Disposition |
|---|---|---|---|---|---|

## Follow-up plan
Per finding: drain-now / drain-in-arc / HANDOVER. If only HANDOVER, append to HANDOVER.md + note here.

<<QWFWD REPORT ONLY: the full "Concept-note decision (D9)" section from Task 3>>
```

The QTV report's tail instead carries: `## Concept-note decision (D9) -- see the QWFWD report's decision section (the master-server candidate spans both projects; the decision is consolidated there): docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md`.

**Steps:**

- [ ] Write `2026-06-05-qwfwd-1.40-dev-validation.md` with the section-by-section verdicts from Task 1's evidence, the findings table (dispositioned per the runbook's drain-now / drain-in-arc / HANDOVER rule -- no prose deferrals), and the Task-3 concept-note decision section embedded at the tail.
- [ ] Write `2026-06-05-qtv-1.16-dev-validation.md` with the same structure, the concept-note decision cross-referenced (not duplicated).
- [ ] For any finding dispositioned HANDOVER: append the one-line entry to root `HANDOVER.md` (per the SKILL.md reporting rule) and note it in the report. For any drain-now finding: it must be fixed in THIS phase before sign-off (re-run the affected Section). For any drain-in-arc finding: this is the last phase, so "in-arc" means "fix now or convert to a follow-on/HANDOVER" -- surface the choice to the operator (do not silently defer; `feedback_every_finding_gets_a_track`).
- [ ] Commit: both reports + the quality-grid edit (Task 2) + the (already-extended-in-Phase-3) probes. Message: `arc(qtv-qwfwd-l1): Phase 4 -- validate both extractors (Postgres), add F1 floor probes, concept-note decision`. Tag the arc ship per the monorepo git convention: `git tag -a arc-qtv-qwfwd-l1-shipped -m "QTV + QWFWD L1 extraction: both validated, floor-probed, concept-note decision recorded"`.

**Verification (task-level):** both report files exist under `docs/superpowers/reviews/` with all eight section headings (0/1/2/3/4/5/6/8) + a findings table; the QWFWD report carries the concept-note decision; the QTV report cross-references it; every finding has a disposition. PASS: both files present + complete + every finding dispositioned. FAIL: a missing section, an un-dispositioned finding, or a duplicated (not cross-referenced) decision section.

**Execution mode:** `inline` -- report assembly is prose synthesis of evidence already gathered (Task 1) and the decision already drafted (Task 3); full structure shipped above; no code synthesis, no new reasoning beyond transcribing verdicts. The orchestrator writes both files directly.

---

## Verification (phase boundary)

Copy-paste, Postgres-only (D12), YES/NO, self-contained (Phase 4 is the last phase -- no probe depends on a later phase, trivially satisfying D11). All DB queries run via `psql "$DATABASE_URL"` or `bun` against postgres-js.

---

### V1 -- Reproducibility re-confirmed (both extractors, empty diff)

```bash
cd apps/qw-oracle/scripts/extractors/qwfwd && python3 extract.py --repo-root ../../../../slipgate-app/reference/qwfwd --output-dir output --handlers all --workers 1 && git diff --stat output/
cd apps/qw-oracle/scripts/extractors/qtv && go run . --src ../../../../slipgate-app/reference/qtv --out output && git diff --stat output/
```

PASS condition: BOTH `git diff --stat output/` produce no output (empty diff).
FAIL condition: any non-empty diff -> non-deterministic finalize sort or path normalization (runbook 1.1; Phase-1 V8 / Phase-2 V8 recovery).

---

### V2 -- Count reconciliation source->JSON->DB exact (both projects)

```sql
SELECT type, COUNT(*)::int AS db_count
FROM entities WHERE project = 'qwfwd' GROUP BY type ORDER BY type;
SELECT type, COUNT(*)::int AS db_count
FROM entities WHERE project = 'qtv' GROUP BY type ORDER BY type;
```
Compare each `db_count` to the corresponding output JSON `_stats.count`:
```bash
python3 -c "import json,glob;
[print(p.split('/')[-1], json.load(open(p))['_stats'].get('count')) for p in sorted(glob.glob('apps/qw-oracle/scripts/extractors/qwfwd/output/*-ast.json')+glob.glob('apps/qw-oracle/scripts/extractors/qtv/output/*-ast.json'))]"
```

PASS condition: every per-type DB count equals the matching JSON `_stats.count`. QTV: cvar=41, command=12 (and JSON matches). QWFWD: each type matches its JSON (no silent loss).
FAIL condition: any DB count != JSON count -> the loader dropped rows (silent data loss).

---

### V3 -- Idempotency: re-load produces no new rows (both projects)

Re-run the Phase-1 load recipe (4 `load-version` calls, qwfwd) and the Phase-2 recipe (2 calls, qtv) a second time, then:
```sql
SELECT project, COUNT(*)::int AS n FROM entities WHERE project IN ('qwfwd','qtv') GROUP BY project;
```

PASS condition: counts identical to V2; each second-run `load-version` JSON reports `"inserted": 0`.
FAIL condition: counts increase (re-run inflation -- `feedback_idempotency_before_staleness`).

---

### V4 -- Field-accuracy sample clean (spot-check, both projects)

```sql
-- pull 5 cvars per project at random; manually confirm each default_value/flags_raw/source_file:source_line against source
SELECT e.project, e.name, cv.default_value, cv.flags_raw, cv.source_file, cv.source_line
FROM entities e JOIN cvar_versions cv ON e.id = cv.entity_id
WHERE e.project IN ('qwfwd','qtv') ORDER BY RANDOM() LIMIT 10;
```

PASS condition: every sampled row's `default_value`/`flags_raw`/position matches the literal source at `source_file:source_line` (the full 20/type audit is Task 1 Section 3.1; this is the boundary spot-check).
FAIL condition: any field mismatch -> a finding (re-open Task 1 Section 3.1 for the full audit).

---

### V5 -- New floor probes exist and PASS (both projects)

```bash
cd apps/qw-oracle
bun scripts/load-knowledge/index.ts quality-grid --project qwfwd --family regression
bun scripts/load-knowledge/index.ts quality-grid --project qtv --family regression
```

PASS condition: the output lists `F1.qwfwd.floor.cvar_count`, `F1.qwfwd.floor.cvar_source_state`, `F1.qwfwd.floor.command_count`, `F1.qwfwd.floor.command_source_state`, `F1.qwfwd.floor.cmdline_param_count`, `F1.qwfwd.floor.cmdline_param_source_state`, `F1.qwfwd.floor.info_key_count`, `F1.qwfwd.floor.info_key_source_state` (8 probes) and `F1.qtv.floor.cvar_count`, `F1.qtv.floor.cvar_source_state`, `F1.qtv.floor.command_count`, `F1.qtv.floor.command_source_state` (4 probes) -- ALL PASS.
FAIL condition: any of the 12 probes missing (not spread into REGRESSION_PROBES) or FAIL (baseline mismatch -> re-check Task 2 Step 0 live counts).

---

### V6 -- Full regression grid green, no prior-project regression

```bash
cd apps/qw-oracle
for proj in ezquake fte mvdsv qwcl ktx qwfwd qtv; do
  echo "=== $proj ==="
  bun scripts/load-knowledge/index.ts quality-grid --project "$proj" --family regression
done
```

PASS condition: every `F1.*` regression probe PASS for all seven projects (the five existing projects did not regress; the two new projects are green).
FAIL condition: any FAIL. A prior-project FAIL means the Task-2 edit broke something (it should not -- the additions are append-only); a new-project FAIL routes to V5.

---

### V7 -- TypeScript compiles clean

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: exit 0, no output.
FAIL condition: type error -> most likely a malformed probe array entry or a stray token in the Task-2 edit.

---

### V8 -- Concept-note decision documented; nothing authored (D9)

```bash
# the decision section exists in the QWFWD report
grep -c "Concept-note decision" docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md
# all three candidates have a verdict line
grep -cE "Recommendation:" docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md
# NO concept note was authored in this arc (D9)
git status --porcelain apps/qw-oracle/curated/concept-notes/ apps/qw-oracle/curated/asset-notes/ | wc -l
```

PASS condition: first grep >= 1 (decision section present); second grep == 3 (three candidate recommendations); third == 0 (no curated note created or modified).
FAIL condition: decision section absent, fewer than 3 recommendations, OR any curated note touched (D9 violation -- the phase decides, it does not author).

---

### V9 -- Both validation reports exist and are complete

```bash
test -f docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md && echo QWFWD_OK
test -f docs/superpowers/reviews/2026-06-05-qtv-1.16-dev-validation.md && echo QTV_OK
# every finding has a disposition (no bare findings table rows lacking a disposition column)
grep -A50 "Findings table" docs/superpowers/reviews/2026-06-05-qwfwd-1.40-dev-validation.md | grep -cE "drain-now|drain-in-arc|HANDOVER|no findings"
```

PASS condition: both `*_OK` print; the findings section either lists dispositioned findings or states "no findings."
FAIL condition: a report missing, or a findings table with un-dispositioned rows (`feedback_every_finding_gets_a_track`).

---

### V10 -- MCP smoke: described knobs return through the live service

```
lookup_entity(project="qwfwd", name="masters")
lookup_entity(project="qtv",   name="qtv_password")
```

PASS condition: both return a row with non-null `description`, `description_origin='synthesized'`, and the expected `source_file` (qwfwd `query.c`, qtv `downstream_storage.go`).
FAIL condition: `null` / no match -> the MCP server is not pointed at the Postgres `$DATABASE_URL`, or Phase 3's describe pass did not persist.

---

## Outputs to next phase

This is the LAST phase. After Phase 4 approval there is no next phase -- the arc is complete. What is now true:

- Both extractors are validated post-ship (reproducibility, count reconciliation, field-accuracy, code review, spec compliance) against the Postgres-translated VALIDATION-RUNBOOK methodology. Two reports at `docs/superpowers/reviews/2026-06-05-{qwfwd-1.40-dev,qtv-1.16-dev}-validation.md`.
- `quality-grid.ts` carries `QWFWD_FLOOR_PROBES` (8 probes) + `QTV_FLOOR_PROBES` (4 probes), spread into `REGRESSION_PROBES`. `quality-grid --family regression` now regression-guards all seven projects; a future count drift on qtv/qwfwd fails loudly.
- The deferred D9 concept-note decision is documented: a per-candidate author/defer/drop recommendation grounded in the Phase-3 breadcrumbs, with the operator ratifying at sign-off. Any greenlit candidate is a follow-on authoring arc (NOT this arc).
- `bunx tsc --noEmit` green; full regression grid green; no prior-project regression.
- The arc ship is tagged `arc-qtv-qwfwd-l1-shipped`.

**After Phase 4 is approved** (per the drafter prompt's closing note): the planner writes the arc-orchestrator handoff at `docs/superpowers/parking/2026-06-05-qtv-qwfwd-l1-extraction-orchestrator-handoff.md` (Where things are / Reads required / Critical rules / First three actions / When in doubt), then the arc plan is COMPLETE. The one execution-time prerequisite carried from Phase 3 (Q-SKILL Option A: widen the `describe-fill-synthesis` line-102 gate to `{'ktx','mvdsv','qtv','qwfwd'}` + the 4 doc references) must be applied before Phase 3 executes; it does NOT block Phase 4.

---

## Open questions / deferred items

**Q-DECISION-HOME -- where the concept-note decision artifact lives**
- **Question:** D9 mandates a written if/which recommendation; should it be a standalone file or embedded in a validation report?
- **Default chosen for now:** embedded as a section in the QWFWD validation report (the master-server candidate spans QWFWD, so that report draws the same evidence), QTV report cross-references. Avoids a fourth doc that drifts; keeps the decision with its evidence.
- **Who can resolve:** operator. If a standalone `docs/superpowers/reviews/2026-06-05-qtv-qwfwd-concept-note-decision.md` is preferred, it is a one-paragraph relocation (the content is identical).

**Q-QWFWD-BASELINES -- the QWFWD floor-probe baselines are NOT known at planning time**
- **Question:** Task 2's QWFWD `<N>` baseline tokens depend on the Phase-1 V4 executed counts (F7: Phase-1 V4 deliberately did NOT hardcode them; the extractor count is truth).
- **Default chosen for now:** Task 2 Step 0 reads the live per-type counts from Postgres before writing the probes. The QTV baselines (41/12) ARE known (Phase-2 V4 hardcoded + grep-verified) but the executor still re-confirms them against Step 0.
- **Who can resolve:** the executor, at execution time (read Step 0; substitute). No operator action needed -- this is the F7 discipline working as designed.

**Q-SECTION2-NA -- runtime cross-validation is not applicable**
- **Question:** Runbook Section 2 (runtime dump diff) needs a `cvarlist`/`cmdlist` dump; qtv/qwfwd are frozen vendored snapshots with no live build here.
- **Default chosen for now:** document Section 2 as N/A with reason in both reports (a precondition failure flagged per Section 0 guidance, NOT a silent skip and NOT a finding). The reproducibility + count-reconciliation + field-accuracy sections carry the correctness proof in Section 2's absence.
- **Who can resolve:** n/a -- this is the correct disposition for a frozen snapshot (consistent with `project_qw_dev_head_not_releases`: the runtime-dump oracle is for the self-building engine ports).

**Q-QTV-FLAGS-CONTRACT -- no positive flags_raw contract for qtv's qVarFlag* names**
- **Question:** The runbook's Section 3.2.2 positive contract is scoped to `ezquake/fte/mvdsv` (CVAR_* bitmask domain). QTV uses Go `qVarFlag*` identifiers; QWFWD uses `CVAR_*` (fits the family).
- **Default chosen for now:** run the NEGATIVE bar (3.2.1) for both (catches NULL/`'0'`); note a "QTV qVarFlag* positive contract" as future-arc work in the report (mirroring the QWCL lowercase-boolean carve-out at runbook line 234). Do NOT widen the runbook regex in this arc.
- **Who can resolve:** future-arc; the negative bar is sufficient for this ship.

**Findings rejected because a decision won:** none at drafting time. The drafter's concept-note priors (Task 3) are explicitly a starting position the breadcrumb harvest overrides -- not a rejected finding, an evidence-deferred recommendation. No sub-agent finding contradicted decisions.md (the verification was performed inline by the drafter; see the dispatch note below).

**Verification sub-agent dispatch note (Phase 4 drafter)**
The `Agent` tool for dispatching a `subagent_type=Explore` sub-agent was not available in this drafting session. The verification brief (bottom of `phase-template.md`) was performed INLINE by the drafter against live source. The planner runs an INDEPENDENT Explore verifier after this halts. What the drafter verified inline:
- All "Files touched" paths: `quality-grid.ts` exists (modified target); `docs/superpowers/reviews/` exists (parent of the two Created reports; the report files correctly do NOT exist yet -- paper plan). VERIFIED.
- Quality-grid factory signatures + names: `makeFloorCountProbe(project: Project, type: string, expected: number)` at 2367; `makeFloorSourceStateProbe(project: Project, type: string, expected: Record<string,number>)` at 2407; the five per-project arrays + `REGRESSION_PROBES` at 2913 with spreads at 2958-2962. VERIFIED against live source.
- Floor-probe baselines: QTV 41/12 match the Phase-2 V4 hardcode AND a fresh grep (41 cvar sites; 13 raw cmd.Register minus 1 commented = 12). QWFWD baselines are NOT planning-knowable (Phase-1 V4 deferred per F7) -> Task 2 Step 0 reads them live. VERIFIED the discipline; the QWFWD numbers are intentionally placeholder tokens.
- Source-state shape `{ source_backed: N }`: verified via `natural-keys.ts:154-155` (INSERT sets from input) + the MVDSV analog (pure source_backed, no doc_only/source_retired for a source-only C port). VERIFIED.
- Three concept-note candidate anchors: `masters` (qtv udp.go:67, qwfwd query.c:697-700), `parse_delay`/`tick_time` (qtv upstream_storage.go:85 / qtv.go:212), `qtv_password` (qtv downstream_storage.go:200, mvdsv ledger). All three shipped MVDSV See-also ledgers exist. VERIFIED against live source + the ledger files.
- Every DB command is Postgres: no `sqlite3` appears in this draft; the stale runbook/skill sqlite commands are explicitly flagged as translated. The load path is `load-version` (D1), not `extract-tag`. The runner is `bun`. VERIFIED by self-review of the draft.
- Schema columns referenced: `entities.description_origin` (012:29), `entities.canonical_id`, `entities.description_reasoning` (014:98), `versions.parse_state` (002:35), `schema_migrations.filename`. VERIFIED.
- Execution-mode annotations: every task has one; the validation deep-read fan-out + the floor-probe code + the concept-note judgment are subagent; report assembly is inline. The task table is NOT >70% inline-with-code-synthesis (Task 2 + the Section-4 sub-agents + Task 3 are subagent). VERIFIED against the execution-mode rule.

**Gaps the drafter could NOT verify inline (flagged for the planner's independent verifier):**
- The PRECISE per-type column names in `cmdline_param_versions` / `info_key_versions` used in Task 1 Section 3.1 sample queries (`cpv.source_file`, `ikv.scope`/`ikv.operations`) were taken from the Phase-1 MD's adapter-contract section, not re-read from the live adapter in this session. The Phase-1 MD verified them against `load-cmdline-params.ts` / `load-info-keys.ts`; the planner's verifier should re-confirm the column names if exact SQL correctness matters (the queries are illustrative field-accuracy samples, so an off column name is a cosmetic fix, not a plan defect).
- Whether the Phase-1 V4 QWFWD counts were actually CAPTURED in the executed phase output (vs needing re-derivation via Task 2 Step 0) is unknowable at planning time -- Task 2 Step 0 re-derives them regardless, so this is robust either way.

---

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only:

- **V1 (reproducibility) non-empty diff:** a finalize sort regressed or a path went absolute. For QWFWD, check each handler's `finalize()` sorts by name + uses `_relative_source` (Phase-1 V8 recovery). For QTV, check Phase C sorts by name before marshalling (Phase-2 V8 recovery). This re-confirms a per-phase invariant; a failure here means something changed since the phase shipped (investigate git history of the output dir / extractor).
- **V2/V3 (count reconciliation / idempotency):** a DB count below the JSON count = silent loss in a `load-version` adapter; a count ABOVE = re-run inflation (suspect idempotency first, `feedback_idempotency_before_staleness`). Re-run the load with `--force` only after confirming the natural-key dedup is correct.
- **V5 (floor probe FAIL):** the baseline `expected` does not match the live count. F7: the live count is the truth -- re-read Task 2 Step 0 and update the baseline (do NOT force the extractor to match a stale planning estimate). If the live count itself looks wrong, that is an extractor regression (re-open Task 1 Section 1/3).
- **V6 (prior-project regression):** the Task-2 edit should be purely additive (two new arrays + two spread lines). A prior-project FAIL means a syntax slip merged the new array into an existing one, or a `REGRESSION_PROBES` spread landed mid-array. Re-read the edit; the additions go AFTER `...KTX_FLOOR_PROBES,`.
- **V8 (D9 violation -- a note was authored):** if `git status` shows a new `curated/` file, the executor over-stepped D9. Delete the authored note (it is a follow-on-arc deliverable, not Phase-4 scope); keep only the decision prose in the report.
- **Section 6 quality-grid describe-fill probe FAIL** (not a floor probe): this is a Phase-3 regression surfacing at validation (e.g. a `synthesized` row lost its anchor). Route to Phase-3 recovery (re-apply the affected ledger via `synthesize-<project>.ts --operator-override <knob>`); it is NOT a Phase-4 bug.

Unanticipated failures route to operator.

---

*Phase 4 is the final phase. After operator approval + the arc-orchestrator handoff doc, the arc `2026-06-05-qtv-qwfwd-l1-extraction` is COMPLETE.*
