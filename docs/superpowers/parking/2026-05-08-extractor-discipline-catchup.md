# Lift KTX-grade extractor discipline to universal coverage -- arc capture

**Captured:** 2026-05-08 by arc-classifier mode D (routed from a fresh-terminal handoff that bundled brainstorm + research + parking-doc work into one session).
**Status:** Pass 1 COMPLETE; Pass 2 COMPLETE 2026-05-08; awaiting arc-planner handoff at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-planner-handoff.md`.

## Why this is arc-shaped

7 of 8 arc-classifier criteria fired:

- Multi-session expected (multiple gate refactors + audit + skill update).
- Multi-phase deliverable (each gate ships independently with own verification).
- Multi-terminal execution (phase boundaries naturally fresh-terminal).
- Spec required (universal-gate authoring guide doc + per-gate design).
- Cross-cutting decisions (CI-readiness checklist, env-var conventions, exit codes, `--json` flag, dispatcher case adds, per-project config dict pattern).
- Verification regime per phase (each gate has its own success criteria).
- Mid-arc amendments expected if the catch-up audit surfaces real loader bugs in earlier projects.
- Post-arc review wanted (graduation-readiness depends on the whole gate set landing coherently).

## Why now

The KTX onboarding arc shipped Issue #5 fixes (commit `66382a50`) for `idempotency-ktx.sh` -- a probe that certifies the KTX loader is deterministic on re-runs. Discovery during that work: only KTX has this gate. The four earlier extractor projects (ezQuake / FTE / MVDSV / QWCL) shipped before the discipline existed.

Operator's framing:

- KTX was the most structured arc; the structure surfaced gaps that wouldn't have been caught in the earlier improvised onboardings.
- The four earlier projects are probably fine, but we don't have the gates to certify it.
- Lift KTX-grade discipline to universal coverage, retroactively certify existing projects, bake gates into onboarding so future codebases inherit by default.

Reinforcing operator framing during Pass 1: the work is also about graduation-readiness. If someone else takes over OR the project moves to a centrally-managed community pipeline, the discipline must be visible and runnable, not vibe-coded.

## Pass plan

- **Pass 1** -- Inventory + universal-gate design (senior-dev lens). **COMPLETE 2026-05-08.**
- **Pass 2** -- Catch-up audit plan + onboard-extractor skill update + roadmap. **COMPLETE 2026-05-08.**

## Pass 1 outcomes

### Sub-question 1.1: Gate inventory (LOCKED)

Methodology: 8 dimensions x 5 projects (ezquake / FTE / QWCL / MVDSV / KTX), plus extras that surfaced during the walk.

#### Already universal -- no work needed

- F1 quality-grid + F2 anomaly probes (the model shape, `--project <p>`)
- Cross-project sibling-handler shape audit (RUNBOOK 4.4 + 3.2.2)
- F28 transition-scan exclusion-list reconciliation
- JSONB-binding regression gate (`F1.jsonb_columns_not_strings`)
- "Source citation" + "regression guards" (built into probes / load-version)

#### KTX-only -- needs lifting (this arc's scope)

- Idempotency probe (lift `idempotency-ktx.sh` bash to `idempotency.ts` universal)
- Per-migration validation probes (lift inline RUNBOOK SQL to `migration-probes.ts` universal)
- Parallel-vs-serial equivalence pattern (lift KTX test helpers to `extractor_lib/tests/`)
- Stage 1 reproducibility probe (package RUNBOOK 1.1 methodology as runnable)

#### Process rule

- Cross-project audit cadence (trigger-based on cross-project-affecting changes)

#### Doc deliverable

- Validation gate authoring guide at `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md`

#### Total scope: 5 universal probes + 1 process rule + 1 doc deliverable

#### Parked as separate future arcs

- **CI setup for qw-oracle** -- biggest graduation lift; needs its own arc with Postgres service container + workflow YAML + fixture project.
- **Contributor onboarding doc / CONTRIBUTING.md** -- holistic graduation-shape doc.
- **Test-coverage parity per project** -- per-project test-authoring effort (ezquake 1, FTE 1, QWCL 0, MVDSV 0, KTX 3 test files).
- **Stage 3 snapshot probes** -- revisit when slipgate-app's snapshot needs stabilize. Slipgate is heavily in development; targeting a moving target. Authoring guide doc (1.2.6 below) must be solid enough that future-Claude can apply patterns to Stage 3 probes without re-deriving conventions.

#### Deferred indefinitely

- "Tag every generated output with model + prompt version" probe (low priority).
- "Schema evolution is append-only" manifest-hash check (low priority).

#### Observed gaps that informed scope (not gates themselves)

- No qw-oracle CI workflows -- only `quad-*.yml` exists at `.github/workflows/`. F1 quality grid is operator-discipline-only.
- No pre-commit hook coverage.
- Cross-project audit ran ad-hoc at-ship-time only (2026-04-28 four-engine, 2026-05-06 five-engine); no cadence rule.
- No CONTRIBUTING.md at qw-oracle root; PLAYBOOK + onboard-extractor skill cover "how to add a project," not "graduate-ready holistic onboarding."

### Sub-question 1.2: Per-gate universal-shape design (LOCKED)

#### Lock-shape summary table

| Gate | Type | File | Invocation |
|---|---|---|---|
| Idempotency | runtime probe | `scripts/load-knowledge/idempotency.ts` | `bun run load-knowledge -- idempotency --project <p>` |
| Per-migration probes | runtime probe | `scripts/load-knowledge/migration-probes.ts` + `db/migration-probes.ts` | `bun run load-knowledge -- migration-probes [--migration NNN]` |
| Parallel-vs-serial | pytest pattern | `extractor_lib/tests/parallel_serial_helpers.py` + `<project>/tests/test_handler_<name>_parallel_serial.py` | `pytest apps/qw-oracle/scripts/extractors/` |
| Reproducibility | runtime probe | `scripts/load-knowledge/reproducibility-check.ts` | `bun run load-knowledge -- reproducibility-check --project <p>` |
| Audit cadence | process rule | PLAYBOOK new section + HANDOVER + memory | (manual; triggered by cross-project-affecting arc completion) |
| Authoring guide | doc | `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` | (read at gate-author time) |

#### CI-readiness conventions (apply to ALL runtime probes)

- Exit 0 = pass, non-zero = fail (no "hmm" codes).
- `--project <p>` flag drives per-project dispatch; `--all` optional for sequential cross-project run.
- `--json` flag emits structured output for future CI parsing (~5 lines per probe; tiny lift, large future payoff).
- `--help` self-documents flags; RUNBOOK references the canonical command line.
- Env-var driven DB config (`DATABASE_URL`); no host-tooling assumptions, no `docker exec`, no host-`psql`.
- No CWD assumptions; absolute paths via `import.meta.url` (`path.resolve(import.meta.dir, ...)`).
- Deterministic output (no flakiness; probes are by design idempotent and offline).

#### 1.2.1 -- Idempotency probe shape (the model gate)

One TypeScript file at `scripts/load-knowledge/idempotency.ts`. Snapshots project DB rows, re-runs `extract-tag --force`, snapshots again, diffs the two. Same outcome `idempotency-ktx.sh` delivers, but universal across all 5 projects, env-var-driven, CI-friendly.

**Borrowed from `idempotency-ktx.sh`:**
- `to_jsonb(row) - 'key'` chain for stripping volatile columns (the just-shipped Issue #5 pattern).
- Three-bucket table grouping (entities / `*_versions` / `gameplay_*`).
- Volatile-column strip list (`updated_at`, `extracted_at`, `description_embedding`, `description_embedding_sha256`, `description_embedding_stale`).

**New vs the bash version:**
- postgres-js via `DATABASE_URL` (no `docker exec ... psql`).
- Per-project config dict in TS -- each entry names its scoping convention (`project='X'` for entities; possibly `gameplay_source_id='X'` for KTX-style gameplay rows) and which `*_versions` tables apply.
- Internal snapshot maps (not /tmp text files); diff in TS.
- Dispatcher case added to `scripts/load-knowledge/index.ts` so it joins the existing subcommand surface (extract-tag, quality-grid, build-snapshot, etc.).

**Optional flags (recommend including):**
- `--all` to run all 5 projects sequentially; convenient locally.
- `--no-extract` to snapshot-only-diff against an already-loaded state (skip the inner re-extract). Useful for "did anyone touch the DB outside of extract-tag?" checks.

**Deferred to implementation (not brainstorm):**
- Exact volatile-column list per current schema.
- Exact `*_versions` table list per project (5-minute dev-side check by reading each loader at implementation time).
- Whether `--force` is implicit or explicit on the inner extract-tag call.

#### 1.2.2 -- Per-migration validation probes shape

File: `scripts/load-knowledge/migration-probes.ts` runner + sibling registry `db/migration-probes.ts`. Invocation: `bun run load-knowledge -- migration-probes [--migration NNN]`.

**Design choice: explicit probe registry, not auto-discovery from migration SQL.** A `db/migration-probes.ts` (sibling to `db/migrations/`) maps migration name -> probe function. Each probe asserts the migration's invariants (CHECK reachability, table/index existence, sentinel insert/reject, etc.). The runner dispatches.

**Why explicit:** SQL parsing for auto-discovery is fragile; explicit probes force the migration author to think about validation, which IS the discipline we're after. Cost: ~10-line probe function per migration.

**First population:**
- Extract inline RUNBOOK SQL for migrations 009 / 010 / 011 into the registry (already authored as positive-shape and negative-shape SQL block in RUNBOOK; mechanical port).
- Add probes for migration 012 (`description_origin`).
- Add probes for migrations 001-008 retroactively as part of Pass 2's catch-up audit.

#### 1.2.3 -- Parallel-vs-serial equivalence test pattern

Different shape: pytest convention, not runtime probe.

**Lift:** move the KTX test helpers from `ktx/tests/` into `extractor_lib/tests/parallel_serial_helpers.py` so every project can `from extractor_lib.tests import assert_parallel_serial_equivalent`.

**Per-project tests:** at `<project>/tests/test_handler_<name>_parallel_serial.py`, using the helper. Pass 2's catch-up audit identifies which handlers have parallel-aggregation risk (handlers walking `MACRO_DEFINITION`, doing per-TU enum walks, aggregating stats from worker emissions -- anything where worker count affects intermediate state) and adds tests for those. NOT blanket coverage.

**CLI:** standard `pytest apps/qw-oracle/scripts/extractors/`. CI-ready by being pytest.

#### 1.2.4 -- Stage 1 reproducibility probe shape

File: `scripts/load-knowledge/reproducibility-check.ts`. Invocation: `bun run load-knowledge -- reproducibility-check --project <p>`.

What it does: re-runs `extract.py` for the project, then checks `git diff --stat HEAD` on the project's `output/` directory. Empty diff -> exit 0; non-empty -> exit 1 with diff snippet. Packages the prose RUNBOOK Section 1.1 methodology as runnable.

**Optional:** `--workers <N>` flag to test different worker counts; surfaces latent parallelism-naive aggregations alongside the parallel-serial pytest tests.

#### 1.2.5 -- Cross-project audit cadence (process rule, not script)

Drains into: PLAYBOOK new section + HANDOVER tracking entry + memory `feedback_retrofit_later_discipline.md` (already encodes the principle).

**Rule: trigger-based, scoped to cross-project changes.** Run the cross-project audit (via the `validate-extractor` skill in cross-project mode) after every arc that:

- adds a new project, OR
- adds a new entity type, OR
- ships a schema migration, OR
- modifies `extractor_lib/` or `load-version.ts` (cross-cutting infrastructure).

Skip for per-handler tweaks within a single project that don't touch shared infrastructure. Audit doc lands at `docs/superpowers/reviews/YYYY-MM-DD-<arc>-cross-project-audit.md`.

**Why this trigger set:** extraction work isn't calendar-based; it's arc-based. These are the cases where prior-engine regressions are actually possible. Per-project tweaks can't break siblings.

#### 1.2.6 -- Authoring guide doc location

**New sibling doc at `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md`,** NOT extending VALIDATION-RUNBOOK.

**Rationale:** RUNBOOK is the consumer-perspective doc ("how do I validate output"); VALIDATION-GATES is the producer-perspective doc ("how do I author a new gate"). Clean separation; RUNBOOK gets a cross-link.

**Sections (locked):**

1. CLI shape conventions (`bun run load-knowledge -- <gate> --project <p>`, `--help`, `--json`, exit codes).
2. Reuse the F1 quality-grid pattern (`quality-grid.ts` is the model; new gates mirror its dispatch shape).
3. Env-var driven DB config (`DATABASE_URL`, postgres-js, no `docker exec` or host-psql).
4. Volatile-column strip pattern (the `to_jsonb(row) - 'key'` chain from idempotency-ktx.sh's just-fixed shape).
5. Per-project config dict shape (how to add a new project's table-set entry without forking a script).
6. Test pattern conventions (pytest equivalence-tests for parallel-vs-serial, naming, where they live).
7. CI-readiness checklist (the conventions table above; consolidates the must-haves and `--json` recommendation).

**When slipgate's snapshot needs evolve:** future-Claude reads this guide, applies the conventions, the new snapshot probe slots in cleanly. No re-derivation.

## Carry-forwards

| Item | Track | Trigger |
|---|---|---|
| Test coverage parity | Separate future arc | Operator-initiated when test-authoring effort surfaces (per-project) |
| CI setup for qw-oracle | Separate future arc | After this catch-up arc lands -- CI workflow can run the universal probes once they exist |
| Contributor onboarding doc / CONTRIBUTING.md | Separate future arc | Bundle with broader graduation-doc shape |
| Stage 3 snapshot probes | Parked, revisit-on-trigger | When slipgate-app's snapshot needs stabilize |
| "Tag every generated output" probe | HANDOVER small followup | Operator decision; low priority |
| "Schema evolution is append-only" manifest check | HANDOVER small followup | Operator decision; low priority |
| Regen-after-extract automation | Folds into CI arc | Same trigger as CI setup |

## Pass 2 outcomes

### Sub-question 2.1: Catch-up audit plan (LOCKED)

**Pattern: per-gate ship discipline + arc-close cert doc.** No central living audit doc.

- Each gate's done-criterion is "ran against all 5 projects (ezquake / FTE / QWCL / MVDSV / KTX); findings tracked." Catch-up IS the gate-by-gate ship rather than a separate audit pass.
- **Triage per finding** (per `feedback_every_finding_gets_a_track.md`):
  - Drain-now: real bug found, bugfix rides the gate's commit (one logical unit, D16 style).
  - HANDOVER small followup: defer with explicit reason ("pre-existing F2 anomaly, not gate-introduced").
  - Reject explicitly: rationale captured in commit body. No "we'll figure that out later" prose.
- **Per-gate findings live inline** in the gate's commit body / arc phase MD, not a moving-target document.
- **Final arc-close cert doc** at `docs/superpowers/reviews/<date>-extractor-discipline-catchup-arc-review.md`. Short -- one section per gate recording cross-project pass state. Graduation-readiness artifact written once, by arc-reviewer at arc close.

**Why this shape:** findings batched at gate-level are small enough to triage cleanly; bug-fixes ride the gate that found them; matches `feedback_narrow_arc_before_broad.md`; graduation artifact arrives once at the right time, not as living-doc churn; CI workflow later just runs all gates and bundles the audit naturally.

### Sub-question 2.2: onboard-extractor skill update (LOCKED)

**Three concrete changes** to `~/.claude/skills/onboard-extractor/SKILL.md`:

1. **New step between scaffolding and validation (Phase F4.5 / P4.5):** "register the new project in each universal gate's config dict." 5-minute edit per gate file (volatile columns for idempotency, source root for reproducibility, `*_versions` table list, etc.).
2. **Validation step expands** (Phase F5 / P5): instead of "re-run extract, confirm zero diff," becomes "run ALL universal gates against the new project; all must pass before declaring onboarding done." Smoke-validation grows from 1 probe (re-extract diff) to 4-5 probes (idempotency, reproducibility, parallel-vs-serial tests, migration probes if relevant).
3. **Explicit "no per-project bash scripts":** call out that the KTX-style `idempotency-ktx.sh` pattern is gone. Universal gates handle this; per-project bash extracts are an anti-pattern.

**Per-project config lives per-gate, NOT in a unified registry.** Each universal gate file (`idempotency.ts`, `reproducibility-check.ts`, `parallel_serial_helpers.py`) carries its own small project config dict. Onboarding adds 4-5 small entries.

**Rationale:** each gate's needs differ (idempotency wants volatile-column-list; reproducibility wants source-root; migration probes don't need project config at all) -- a unified registry would be a junk drawer. Per `grug-brain.md`, copy-paste with small variations beats premature unification. VALIDATION-GATES.md (Pass 1.2.6) already locks "per-project config dict shape" as a section; auto-discovery would contradict that.

**Migration story for the existing 5 projects:** there isn't a separate one. The catch-up arc IS the migration -- when each universal gate ships, its commit adds per-project config entries for all 5 existing projects. By the time anyone next runs onboard-extractor, the gates already cover the 5; the skill teaches them to add a 6th entry.

**Concrete edit deferred to arc execution.** This pass sketches the shape; the actual SKILL.md edits land in Phase 5 of the implementation arc (after the gates exist; doc references actual gate files).

### Sub-question 2.3: Roadmap (LOCKED)

**Shape: one arc, seven phases, manual probes (not auto-invoked).**

| Phase | What ships | Why this slot |
|---|---|---|
| 1 | **Idempotency probe** (`idempotency.ts` universal; lifts from KTX bash) | Most concrete starter; most likely to surface real loader bugs in earlier projects; rides the just-shipped Issue #5 volatile-column-strip pattern |
| 2 | **Reproducibility probe** (`reproducibility-check.ts`; Stage 1 methodology) | Complements idempotency; together they certify extractor + loader are both deterministic |
| 3 | **Parallel-vs-serial test pattern** (lift KTX test helpers to `extractor_lib/tests/parallel_serial_helpers.py`) | Different failure class from reproducibility; pins specific handlers as parallel-safe via pytest |
| 4 | **Per-migration validation probes** (`migration-probes.ts` runner + `db/migration-probes.ts` registry) | Most labor-intensive (~10-line probe per migration); covers 001-008 retroactively + 009/010/011 from KTX arc + 012 |
| 5 | **Authoring guide doc** (`apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md`) | Written AFTER gates ship so doc references real conventions, not speculation |
| 6 | **Cross-project audit cadence rule** (PLAYBOOK new section + HANDOVER tracking + memory) | Process rule lands with the doc since rule references the gates that just shipped |
| 7 | **Arc-close cert doc** (`docs/superpowers/reviews/<date>-extractor-discipline-catchup-arc-review.md`) | Graduation artifact: one section per gate, cross-project pass state |

**Three sub-decisions baked in:**

1. **One arc, seven phases -- NOT seven separate arcs.** Phases share decisions (CI conventions from Pass 1.2's lock-shape table) and benefit from shared cross-phase context. arc-orchestrator's value peaks when phases share context. Splitting into seven arcs is bureaucratic overhead.
2. **Each gate is a separate manual probe, NOT auto-invoked on every load.** Mirrors existing F1 quality-grid pattern (`bun run load-knowledge -- quality-grid`). Some gates are slow (reproducibility re-runs `extract.py`); auto-invoking would slow the dev loop. CI later bundles them via workflow YAML; dev workflow keeps them surgical.
3. **Idempotency first** because Pass 1 already framed it as the canonical model gate (lift of the KTX bash script that triggered this whole arc) and most likely to surface latent loader bugs in earlier projects -- early concrete value.

**Execution-time amendments expected:**
- Phase 1 surfaces a real idempotency bug in (e.g.) ezQuake -> Phase 1 grows by ~1 day for the bugfix, ride same commit.
- Phase 2 reveals more parallel-aggregation bugs beyond the known one (KTX gameplay_taxonomies Issue #3) -> Phase 3 per-handler test scope grows.
- Phase 4 migration-probe authoring reveals invariants that don't fit the 10-line shape -> mid-arc decisions amendment.

These are normal execution surprises; arc-orchestrator handles via decisions.md amendments.

## Pass 2 carry-forwards

| Item | Track |
|---|---|
| KTX `idempotency-ktx.sh` deletion | Resolved-by-Phase-1: shipping `idempotency.ts` universal makes the bash version redundant; deletion rides Phase 1's commit |
| Issue #5 false-positive drift fix from KTX post-review | Resolved-by-Phase-1: universal probe inherits the volatile-column-strip pattern by design |
| Schema-version bump policy + CLAUDE.md status-line drift after migration 012 | Already in HANDOVER; not in this arc's scope |
| QWCL cross-engine description borrow arc | Already parked at `docs/superpowers/parking/2026-05-07-qwcl-cross-engine-description-borrow.md`; separate arc |
| CI setup / Contributor onboarding doc / Test-coverage parity / Stage 3 snapshot probes | Pass 1 carry-forwards still valid; separate future arcs |

## Operator notes

- **Graduation-readiness framing.** This arc is about making the discipline visible and runnable, not vibe-coded. If someone takes over OR project moves to community-managed pipeline, the gate set must be self-documenting.
- **"Baby steps toward CI" approved.** Bake CI-readiness conventions into universal probes now (must-haves + `--json` flag); CI itself is a separate arc later. The CI arc then becomes "wire universal probes into a workflow YAML," not "refactor bash scripts so they can run in CI."
- **Stage 3 (slipgate snapshots) parked** because slipgate-app is "heavily in development"; revisit when stabilized. Authoring guide doc must be solid enough that future-Claude can apply patterns to slipgate snapshot probes without re-deriving conventions.
- **Operator's terminology.** "Vibe-coded mess" = implicit conventions / Claude-only-knowledge / no enforcement; "graduation-ready" = visible discipline / runnable verification / docs that point to enforcement.

## Related

- **Operator memory `feedback_retrofit_later_discipline.md`** -- encodes the principle this arc applies.
- **Recent commit `66382a50`** -- Issue #5 fixes (the bash idempotency probe robustness work that triggered this arc).
- **KTX onboarding arc plan** -- `docs/superpowers/plans/2026-05-04-ktx-onboarding/` (decisions + review-findings the gate set retrofits against).
- **Cross-project audit** -- `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` (5-engine state at Pass 1 entry).
- **VALIDATION-RUNBOOK** -- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (the methodology bible that the new VALIDATION-GATES doc complements).
- **F1 quality-grid model** -- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (the universal-shape exemplar).
- **Post-review parking doc** -- `docs/superpowers/parking/2026-05-07-ktx-postreview-investigation-and-prod-prep.md` (Issue #5 origin context).
