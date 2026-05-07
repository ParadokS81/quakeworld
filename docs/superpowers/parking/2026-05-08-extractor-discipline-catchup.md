# Lift KTX-grade extractor discipline to universal coverage -- arc capture

**Captured:** 2026-05-08 by arc-classifier mode D (routed from a fresh-terminal handoff that bundled brainstorm + research + parking-doc work into one session).
**Status:** Pass 1 COMPLETE; awaiting Pass 2 (catch-up audit + skill update + roadmap).
**Trigger to start Pass 2:** active. Pass 2 handoff at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-pass2-handoff.md`.

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
- **Pass 2** -- Catch-up audit plan + onboard-extractor skill update + roadmap. **AWAITING.**

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

## Pass 2 surface

- **2.1 Catch-up audit plan.** Order of operations for running new gates against ezquake / FTE / QWCL / MVDSV; what likely surfaces; triage flow if findings emerge (silent loader bugs, parallel-naive aggregations, etc.).
- **2.2 onboard-extractor skill update.** Per-project-config-dict entry shape; what the skill does for a new codebase; what it stops doing (no more per-project bash script scaffolding).
- **2.3 Roadmap.** Gate-by-gate (small arcs each) vs all-at-once (one bigger arc); auto-run vs separate manual probe; sequencing recommendation for landing the 5 probes + 1 rule + 1 doc.

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
