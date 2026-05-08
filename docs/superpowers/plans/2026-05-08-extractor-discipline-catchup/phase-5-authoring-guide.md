# Phase 5 -- Authoring guide + skill update part 1

> **Drafter checklist completed before writing this phase:**
> 1. Read `decisions.md` (full). All 17 decisions absorbed.
> 2. Read `review-findings.md`. F1 (sys.path pollution, HANDOVER track) does not touch Phase 5.
> 3. Read parking doc Pass 1.2.6 (seven-section list, LOCKED) + Pass 2.2 (skill update sketch) + Pass 2.3 (roadmap).
> 4. Source-walked: quality-grid.ts (dispatch model), idempotency.ts (volatile-column strip + per-project config dict), reproducibility-check.ts (CLI shape + filesystem-only pattern), migration-probes.ts + db/migration-probes.ts (global registry, no per-project config), parallel_serial_helpers.py (pytest helper + finalize-via-param context), VALIDATION-RUNBOOK.md (cross-link insertion point), EXTRACTOR-PLAYBOOK.md (stylistic alignment), ~/.claude/skills/onboard-extractor/SKILL.md (insertion/expansion targets identified).
> 5. Read phase-template.md. Shape followed.
> 6. Verification sub-agent dispatched at Step 3. Findings applied before handing back to operator.

---

## Goal

This phase produces four paper-only deliverables. First: a new producer-side
authoring guide at `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md`
covering the seven locked sections from Pass 1.2.6 (CLI conventions, F1 dispatch
mirror, env-var DB config, volatile-column strip, per-project config dict shape,
pytest test conventions, CI-readiness checklist). Second: a one-line cross-link
from the top of `VALIDATION-RUNBOOK.md` to the new doc (per D9 -- two-doc model,
clean audience separation). Third: the first half of the onboard-extractor skill
update (per D10) -- a new Phase F4.5/P4.5 step that teaches "register the new
project in each universal gate's config dict," plus an expansion of Phase F5/P5
validation from one probe (re-extract diff) to all four universal gates, plus a
drain-now fix to Phase F4's pre-Postgres-era `npm --prefix` and `sqlite3`
commands (operator-confirmed audit finding 2026-05-08; commands are actively
broken today since npm rejects workspace: deps and `data/knowledge.db` no
longer exists). Fourth: comment-only fix to two stale `sqlite3 "$DB"`
references in `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (lines
~1379 and ~1397) -- documentation drift in the floor-probe seed-capture
comments; replaced with `psql "$DATABASE_URL"` form. No new code, no DB writes,
no extractor runs. Phase boundary: VALIDATION-GATES.md exists with 7 section
headers; cross-link is present in RUNBOOK; SKILL.md shows new F4.5 phase +
expanded F5 gate set + clean F4 commands under grep; quality-grid.ts has zero
remaining `sqlite3` references.

---

## Inputs from previous phase

Phases 1-4 shipped:

- `apps/qw-oracle/scripts/load-knowledge/idempotency.ts` -- universal idempotency
  probe; `bun run load-knowledge -- idempotency --project <p>`.
- `apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts` -- universal
  reproducibility probe; `bun run load-knowledge -- reproducibility-check --project <p>`.
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py`
  -- lifted pytest helper; per-handler test files across all 5 projects.
- `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` +
  `apps/qw-oracle/db/migration-probes.ts` -- universal migration probe runner +
  registry; `bun run load-knowledge -- migration-probes`.
- All five dispatcher cases registered in `scripts/load-knowledge/index.ts`.

Phase 5 documents the conventions encoded by these four gates. The doc references
actual file paths and CLI flag shapes; it does not add code.

---

## Files touched

### Created

```
apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md
```

### Modified

```
apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md   # one-line cross-link inserted near top (D9)
~/.claude/skills/onboard-extractor/SKILL.md               # F4.5 step added; F5 validation expanded (D10); F4 stale npm + sqlite3 commands replaced with bun --cwd + psql equivalents (drain-now per D7; ADVISORY operator-confirmed 2026-05-08)
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts     # two stale sqlite3 references in floor-probe seed-capture comments (lines 1379, 1397) replaced with psql "$DATABASE_URL" form -- comment-only edit, no logic change
```

### Deleted

n/a

---

## Tasks

### Task 1: Write VALIDATION-GATES.md

- **Goal:** Create the producer-side authoring guide for new universal gates (7 locked sections, Pass 1.2.6).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` (Created).
- **Steps:**
  - [ ] Write `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` with the full content below.
- **Verification:** `test -f apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md && echo EXISTS` outputs EXISTS. `grep -c "^## " apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` outputs 7.
- **Execution mode:** `inline` -- full file content shipped below; markdown-only authoring, no logic.

---
VALIDATION-GATES.md FULL CONTENT -- write this file verbatim:
---

# Validation Gate Authoring Guide

For gate consumption (how to run a gate against a project), see
`apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`.
This guide is for gate AUTHORS: how to write a new gate that integrates with the
universal probe set and inherits CI-readiness conventions by default.

The four shipped gates are the canonical reference for every convention documented
here:

- `scripts/load-knowledge/idempotency.ts` -- DB snapshot + re-extract + diff
- `scripts/load-knowledge/reproducibility-check.ts` -- re-extract + git diff
- `scripts/load-knowledge/migration-probes.ts` -- migration invariant runner
- `db/migration-probes.ts` -- probe function registry (consumed by runner above)
- `extractor_lib/tests/parallel_serial_helpers.py` -- pytest equivalence helper

When in doubt, read the shipped gate. The doc describes the pattern; the code is
the ground truth.

---

## 1. CLI shape conventions

Two dispatch shapes exist for the universal gate set. Pick the one that fits the
gate you are writing.

### Shape A: TypeScript subcommand

Invocation:

    bun run load-knowledge -- <gate> [options]

All TypeScript gates are registered as subcommands under `bun run load-knowledge --`.
The dispatcher is `scripts/load-knowledge/index.ts`. Commands run from within the
`apps/qw-oracle/` directory.

**Standard flags for per-project gates (idempotency, reproducibility-check):**

| Flag | Behavior |
|---|---|
| `--project <p>` | Run probe against this project. One of: ezquake / fte / qwcl / mvdsv / ktx. |
| `--all` | Run sequentially against all 5 projects. Mutually exclusive with `--project`. |
| `--json` | Emit structured output (valid JSON array) to stdout. Recommended for CI. |
| `--help` | Print flag list to stderr and exit 0. |

**Flag variation for global gates (migration-probes):**

Migrations are global (not per-project). Gates without per-project scope omit
`--project` and `--all`. Use a filter flag instead if partial runs are needed
(e.g. `--migration NNN`).

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | PASS -- all targeted probes passed -- OR `--help` requested. |
| 1 | FAIL -- one or more probes found issues; review output for details. |
| 2 | Invalid arguments -- bad `--project` value, unknown filter prefix, etc. |

The exit-0-on-help convention lets CI verify a gate is wired up (`--help`) without
triggering a real probe run.

### Shape B: pytest test file

Invocation:

    pytest apps/qw-oracle/scripts/extractors/

pytest discovers per-handler equivalence test files at:

    <project>/tests/test_handler_<name>_parallel_serial.py

CI-ready by being pytest. No custom runner or dispatcher required.

---

## 2. Reuse the F1 quality-grid dispatch pattern

Every new TypeScript gate mirrors the dispatch shape established by `quality-grid.ts`
(D4). This keeps the subcommand surface consistent and makes contributor onboarding
linear.

### Gate file

Create `scripts/load-knowledge/<gate>.ts`. The file must export:

    export async function run<Gate>Cli(args: string[]): Promise<void>

The CLI function owns flag parsing, `--help`, result formatting, and exit code
assignment. Do NOT call `process.exit()` from the gate's core logic -- only from
the CLI entry point, after emitting results.

Use `parseArgs` from `'util'` (Node/Bun built-in) for flag parsing. See
`idempotency.ts` lines 352-398 for the canonical shape: parse, handle `--help`
first, validate `--project`, collect targets, iterate, format, set `process.exitCode`.

### index.ts dispatch (four edits)

1. Add the subcommand name to the comment at the top of `index.ts`:

       // Subcommands: ..., <gate>

2. Add a dispatch case in `main()`:

       if (subcommand === '<gate>') { await run<Gate>Cli(rest); return; }

3. Add a thin wrapper function that does a dynamic import and delegates:

       async function run<Gate>Cli(args: string[]): Promise<void> {
         const { <exportName>: run } = await import('./<gate>.js');
         await run(args);
       }

   The dynamic import name (`<exportName>`) must match the actual export in
   the gate file, which may differ from the wrapper function name. Example:
   the wrapper in `index.ts` is named `runReproducibilityCheckCli` but it
   imports `{ runReproducibilityCli: run }` because the gate file exports
   `runReproducibilityCli` (shorter name). Use the rename syntax
   `{ actualExportName: run }` when the names differ. Verify the export name:
   `grep "^export async function" scripts/load-knowledge/<gate>.ts`.

4. Add the gate to the `usageAndExit()` usage text with a short flag summary.

The thin-wrapper with dynamic import is the standard pattern for all gates added
in the extractor-discipline-catchup arc. See `runIdempotencyCli`,
`runReproducibilityCheckCli`, and `runMigrationProbesCli` in `index.ts` for
concrete examples.

---

## 3. Env-var driven DB config

### Gates that use the database (idempotency, migration-probes)

Import the module-level sql object:

    import { sql } from './db.js';

The `sql` object reads `DATABASE_URL` at module load time.
Default value if unset: `postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle`.

Do NOT hardcode connection strings. Do NOT use `docker exec`, host `psql`, or
any host-tooling assumption. Every environment where CI could run the gate must
be able to configure the DB via one env var.

**Recommended pre-flight guard** (add to the CLI entry point before the first DB
call -- see `migration-probes.ts` for the shipped example):

    if (!process.env.DATABASE_URL) {
      process.stderr.write('ERROR: DATABASE_URL is not set\n');
      process.exit(1);
    }

This produces a clear error message instead of a postgres connection-refused
stack trace. Exit code 1 (FAIL) is correct here -- the probe cannot run.

### Gates that do NOT use the database (reproducibility-check)

Do NOT import `sql` or `./db.js`. Mention "No database required" in the `--help`
output so CI runners know no DB service container is needed.

### JSONB column writes (D12)

If a gate writes JSONB data (e.g., a migration probe's sentinel insert), pass JS
values directly to postgres-js. Never call `JSON.stringify()` before binding to a
JSONB parameter -- pre-stringifying stores a JSONB string scalar rather than the
intended structure (the legacy SQLite-era TEXT bug). `F1.jsonb_columns_not_strings`
in `quality-grid.ts` is the regression gate that catches recurrence.

Correct:
    await tx`INSERT INTO t (jsonb_col) VALUES (${[]})`

Wrong:
    await tx`INSERT INTO t (jsonb_col) VALUES (${JSON.stringify([])})`

---

## 4. Volatile-column strip pattern

When a gate snapshots DB state before and after a re-extract (idempotency
pattern), some columns drift by design and must be stripped before comparison.
PostgreSQL's `to_jsonb(row) - 'key'` chain strips columns from a row cast to
JSONB. The `-` operator is a no-op when the key is absent on the table, so a
single strip list covers all three table buckets.

### The five volatile columns

| Column | Reason for stripping |
|---|---|
| `updated_at` | Bumped on every `entities` UPSERT regardless of data change. |
| `extracted_at` | Bumped on every `*_versions` UPSERT regardless of data change. |
| `description_embedding` | Regenerated by the embed pipeline; update order is non-deterministic. |
| `description_embedding_sha256` | Derived from description text; regenerated after embed. |
| `description_embedding_stale` | Transient flag; flips to TRUE during embed pass, FALSE after. |

### Strip fragment (from idempotency.ts)

    (to_jsonb(t) - 'updated_at' - 'extracted_at' - 'description_embedding'
      - 'description_embedding_sha256' - 'description_embedding_stale')

Three aliases are used for the three table buckets:
- `t` -- `entities` table (scoped by `project = <p>`)
- `v` -- `*_versions` tables (joined to `entities` via `entity_id`, filtered by project)
- `g` -- `gameplay_*` tables (scoped by `gameplay_source_id = <p>`)

idempotency.ts implements this as a `stripFragment(s, alias)` helper function
that returns the fragment for the given alias. See lines 146-158.

Use this same strip list in any new snapshot-and-compare gate. Adding a column
to the volatile list requires updating both this doc and every gate file that
uses the pattern.

### Columns to NOT strip

Do not strip columns that are deterministically derived from source inputs. Drift
in these is a real signal that the probe must catch:

- `entities.created_at` -- set once on first insert; drift means a row was deleted
  and reinserted, which IS what idempotency must catch.
- `entities.description` -- derived deterministically from source or help-JSON.
- `entities.description_origin` -- migration 012; deterministic CASE expression.
- `*_versions` body fields -- the whole point of the comparison.
- `gameplay_*` JSONB fields -- parsed deterministically from extracted JSON.

---

## 5. Per-project config dict shape

Each gate that needs per-project configuration carries its own small config dict
inside its own file. There is NO unified registry across all gates (D3). When
onboarding a new project, add one entry to each applicable gate file. This takes
approximately 5 minutes per gate.

### Config layout per gate

**`idempotency.ts` -- `PROJECT_IDEMPOTENCY_CONFIG`**

```typescript
interface ProjectIdempotencyConfig {
  versionsTables: readonly string[];  // *_versions tables with rows for this project
  gameplayTables: readonly string[];  // gameplay_* tables; empty [] for non-KTX projects
}
```

Determination: read the project's loader files (`scripts/load-knowledge/load-*.ts`)
to find which `*_versions` tables get rows written. Each table listed must have
non-zero rows for the project in the dev DB.

**`reproducibility-check.ts` -- `PROJECT_REPRODUCIBILITY_CONFIG`**

```typescript
interface ProjectReproducibilityConfig {
  extractPy: string;  // absolute path to the project's extract.py
  repoRoot:  string;  // absolute path to the project's research/repos checkout
  outputDir: string;  // absolute path to the project's extractors/output/ dir
}
```

Resolve via `resolve(SCRIPT_DIR, '../extractors/<project>/...')` where `SCRIPT_DIR`
is `dirname(fileURLToPath(import.meta.url))` (the `scripts/load-knowledge/`
directory). See existing entries in the file for the exact pattern.

**`extractor_lib/tests/parallel_serial_helpers.py`**

No top-level dict. Per-project config lives in individual per-handler test files:

    <project>/tests/test_handler_<name>_parallel_serial.py

Each test file hardcodes `EXTRACT_PY` (path to `extract.py`) and `REPO_ROOT`
(path to the source repo), then calls `assert_parallel_serial_equivalent` with
the handler name and output filename. When onboarding: write one test file per
handler identified as parallel-aggregation-risky (see Section 6).

**`migration-probes.ts` / `db/migration-probes.ts`**

n/a -- migrations are global; no per-project config.

### Adding a sixth project (checklist)

1. `idempotency.ts` -- add entry to `PROJECT_IDEMPOTENCY_CONFIG`.
2. `reproducibility-check.ts` -- add entry to `PROJECT_REPRODUCIBILITY_CONFIG`.
3. `extractor_lib/tests/parallel_serial_helpers.py` -- write per-handler test files
   for any handlers with parallel-aggregation risk. Skip if none identified.
4. `migration-probes.ts` -- no action needed.

This is the "register in each gate's config dict" step in the onboard-extractor
skill (Phase F4.5 / P4.5).

---

## 6. Test pattern conventions (parallel-vs-serial)

Parallel-vs-serial equivalence tests verify that a handler produces the same
output regardless of worker count. This targets the extractor (Python, pre-DB)
rather than the loader (TypeScript, post-DB) -- a different failure class from
the DB-snapshot probes.

### When to add a test

Add a test ONLY for handlers with parallel-aggregation risk. Risk indicators:
- The handler walks `MACRO_DEFINITION` or similar multi-file patterns and
  accumulates per-TU state that is merged in `finalize()`.
- The handler performs per-TU enum walks where emission order affects downstream
  aggregation logic.
- Any handler where reducing multiple workers' row sets uses mutable shared state
  rather than a pure element-wise merge.

Do NOT add tests for handlers where each TU's output is fully independent and
the driver simply concatenates per-TU rows with no cross-TU aggregation.

### Test file location and naming

    <project>/tests/test_handler_<name>_parallel_serial.py

Example:
    apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies_parallel_serial.py

### Import and test shape

```python
import pytest
from pathlib import Path
from extractor_lib.tests import assert_parallel_serial_equivalent

EXTRACT_PY = Path(__file__).resolve().parent.parent / "extract.py"
REPO_ROOT   = (Path(__file__).resolve().parent.parent.parent.parent.parent
               / "research" / "repos" / "<project>")

def test_handler_<name>_parallel_serial_equivalent(tmp_path):
    serial, parallel = assert_parallel_serial_equivalent(
        extract_py=EXTRACT_PY,
        repo_root=REPO_ROOT,
        handler_name="<handler_name>",
        output_filename="<project>-<type>-ast.json",
        tmp_path=tmp_path,
    )
    # Field-level equivalence assertions (caller's responsibility):
    assert sorted(serial["items"], key=lambda x: x["name"]) == \
           sorted(parallel["items"], key=lambda x: x["name"])
```

`assert_parallel_serial_equivalent` runs `extract.py` twice (once with
`--workers 1`, once with `--workers 4`) and asserts both runs produce the
same top-level output keys. Row-count and field-level assertions are the
caller's responsibility -- add them based on the handler's actual output shape.

### Finalize-via-param requirement

Handler `finalize()` methods MUST accept accumulated rows as an explicit
parameter, NOT read from `self._all_rows` (instance attribute accumulated
during the per-TU traversal). This ensures the finalization logic is identical
whether called from the serial (1 worker, all TUs in one process) or the
parallel (N workers, each with a subset of TUs) execution path.

**Unsafe (reads instance state -- breaks under parallel):**

```python
def finalize(self) -> dict:
    return self._aggregate(self._all_rows)   # each worker sees only its TUs
```

**Correct (param-driven -- safe under parallel):**

```python
def finalize(self, all_rows: list[dict]) -> dict:
    return self._aggregate(all_rows)         # driver merges rows before calling
```

The driver in `extract.py` merges all workers' per-TU rows before calling
`finalize(merged_rows)`. When `finalize()` reads `self._all_rows` instead of
the parameter, the parallel path silently processes an incomplete row set.
The parallel-vs-serial equivalence test is the gate that catches this class of bug.

---

## 7. CI-readiness checklist

Before declaring a new gate "CI-ready", verify all seven conventions from D2.

| Convention | Requirement |
|---|---|
| Exit codes | 0 = PASS or `--help`; 1 = FAIL; 2 = invalid args. No ambiguous codes. |
| `--project` flag | Per-project dispatch for per-project gates; `--all` for sequential cross-project run. |
| `--json` flag | Emits valid JSON (parseable by `python3 -m json.tool` or `bun -e "JSON.parse"`). |
| `--help` | Prints flag list to stderr; exits 0. |
| DB config | `DATABASE_URL` only; no `docker exec`, no host `psql`, no hardcoded connection strings. |
| Path resolution | No CWD assumptions; absolute paths via `import.meta.url` / `Path(__file__)`. |
| Determinism | Probe is idempotent; running twice in a row produces identical output. |

**Ship `--json` before CI integration.** CI workflows parse structured output;
prose output requires brittle regexes. The JSON output shape should be an array
of result objects, one per targeted project (or migration). Each object carries
at minimum: a name identifier, a `status` field (`"PASS"` or `"FAIL"`), and a
`summary` string. See `IdempotencyResult` in `idempotency.ts` and
`MigrationProbeResult` in `db/migration-probes.ts` as canonical shapes.

---
END OF VALIDATION-GATES.md CONTENT
---

---

### Task 2: Add cross-link to VALIDATION-RUNBOOK.md

- **Goal:** Insert one-line cross-link near the top of VALIDATION-RUNBOOK.md so gate authors can find the authoring guide from the runbook (D9).
- **Files:** `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (Modified).
- **Steps:**
  - [ ] Edit `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`. Insert the one-line cross-link between the intro paragraph and `**Scope:**` as shown in the AFTER block below.
- **Verification:** `grep -n "VALIDATION-GATES" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` returns exactly one match.
- **Execution mode:** `inline` -- one-line Edit; markdown-only; no logic.

BEFORE (lines 1-8 of VALIDATION-RUNBOOK.md):

```
# QW Oracle Extractor Validation Runbook

The encyclopedic reference for validating Layer 1 extractor output. Companion to `EXTRACTOR-PLAYBOOK.md`: the playbook tells you how to BUILD an extractor; this runbook tells you how to PROVE the extractor's output is correct.

**Scope:** libclang-based extractors (ezQuake, FTE, QWCL, MVDSV today; canonical KTX onboarding via the KTX onboarding arc; future ezQuake-family forks like unezQuake; future MVDSV-family forks like antilag-mvdsv). Tree-sitter is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), out of scope for canonical onboarding -- a parallel runbook will land when dusty-ktx ships.
```

AFTER (insert the cross-link line between the intro paragraph and **Scope:**):

```
# QW Oracle Extractor Validation Runbook

The encyclopedic reference for validating Layer 1 extractor output. Companion to `EXTRACTOR-PLAYBOOK.md`: the playbook tells you how to BUILD an extractor; this runbook tells you how to PROVE the extractor's output is correct.

For gate authoring, see `scripts/load-knowledge/VALIDATION-GATES.md`.

**Scope:** libclang-based extractors (ezQuake, FTE, QWCL, MVDSV today; canonical KTX onboarding via the KTX onboarding arc; future ezQuake-family forks like unezQuake; future MVDSV-family forks like antilag-mvdsv). Tree-sitter is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), out of scope for canonical onboarding -- a parallel runbook will land when dusty-ktx ships.
```

The Edit tool target: use old_string = the blank line + `**Scope:**` prefix, and
new_string = the blank line + cross-link line + blank line + `**Scope:**` prefix.
Specifically, replace the text between the intro paragraph and `**Scope:**`.

---

### Task 3: Update onboard-extractor SKILL.md (part 1 of 2)

- **Goal:** Insert Phase F4.5 (register in universal gate config dicts) between Phase F4 and Phase F5; expand Phase F5 validation from 1 probe to all 4 universal gates; update Mode P reference line to include P4.5.
- **Files:** `~/.claude/skills/onboard-extractor/SKILL.md` (Modified, user-global -- NOT in repo).
- **Steps:**
  - [ ] Change 1 -- Insert Phase F4.5 section. Find the line `### Phase F5: Validation handoff` in SKILL.md and insert the F4.5 content block (CHANGE 1 AFTER below) immediately before it.
  - [ ] Change 2 -- Replace Phase F5 section. Replace everything from `### Phase F5: Validation handoff` to (not including) `### Phase F6: Documentation` with the expanded content (CHANGE 2 AFTER below).
  - [ ] Change 3 -- Update Mode P onward line. Find the `### Phase P3 onward` section and update the single-sentence description (CHANGE 3 AFTER below).
- **Verification:** `grep -n "F4.5\|config dict" ~/.claude/skills/onboard-extractor/SKILL.md | head -5` returns at least 2 matching lines. `grep -n "universal gates\|idempotency.*project\|reproducibility.*project" ~/.claude/skills/onboard-extractor/SKILL.md | head -5` returns at least 1 matching line in the F5 section.
- **Execution mode:** `inline` -- full before/after blocks shipped below; markdown-only; no logic.

---
CHANGE 1 -- INSERT before `### Phase F5: Validation handoff`

(The executor locates the exact line `### Phase F5: Validation handoff` in SKILL.md
and inserts the following block immediately before it.)

INSERT CONTENT:

```
### Phase F4.5: Register in universal gate config dicts

Register the new project in each universal gate's per-project config dict.
This step takes approximately 5 minutes per gate file. The gates and their
config keys:

- **`idempotency.ts` (`PROJECT_IDEMPOTENCY_CONFIG`):** add entry with
  `versionsTables` (read each `scripts/load-knowledge/load-*.ts` file to
  find which `*_versions` tables get rows written for this project) and
  `gameplayTables` (empty `[]` unless the project has gameplay rows like KTX).

- **`reproducibility-check.ts` (`PROJECT_REPRODUCIBILITY_CONFIG`):** add
  entry with `extractPy`, `repoRoot`, and `outputDir` (resolve via
  `resolve(SCRIPT_DIR, '../extractors/<project>/...')` -- see existing entries
  for the exact pattern).

- **`extractor_lib/tests/parallel_serial_helpers.py`:** write per-handler test
  file(s) at `<project>/tests/test_handler_<name>_parallel_serial.py` for any
  handlers identified as parallel-aggregation-risky. Use
  `assert_parallel_serial_equivalent` from `extractor_lib.tests`. If no
  handlers have parallel-aggregation risk, skip.

- **`migration-probes.ts`:** n/a -- migrations are global; no per-project
  config needed.

Cross-reference: `scripts/load-knowledge/VALIDATION-GATES.md` Section 5 has
the full per-gate config dict shapes and a step-by-step checklist.

This phase also applies as **Phase P4.5** in Mode P (cross-codebase port)
onboarding. The steps are identical.

```
---
END OF CHANGE 1 INSERT CONTENT

---
CHANGE 2 -- REPLACE Phase F5 section

BEFORE (current Phase F5 in SKILL.md -- everything from the header line to the
blank line before `### Phase F6: Documentation`):

```
### Phase F5: Validation handoff

Run `VALIDATION-RUNBOOK.md` Section 1 (reproducibility) as the smoke check that the onboarding produces stable output.

- [ ] **Step 1: Re-run extraction + confirm zero JSON diff.**

```bash
python3 apps/qw-oracle/scripts/extractors/<fork>/extract.py --workers 12
git -C apps/qw-oracle/scripts/extractors/<fork>/output diff --stat HEAD
```

- [ ] **Step 2: Re-run load + confirm idempotency.**

Counts must be identical to Phase F4 Step 1.

- [ ] **Step 3: Recommend a follow-up validate-extractor pass.**

Tell the user: "First-ship onboarding complete. Recommend running `validate-extractor` skill in Mode A (post-ship validation) on `<fork>` before declaring the project production-ready. The runbook's full Sections 0-8 catch issues that Phase F5's smoke check doesn't."

If the fork has a runtime dump (cvarlist/cmdlist), also recommend populating `validation-fixtures/` and running the runbook's Section 2.
```

AFTER (replacement Phase F5 content):

```
### Phase F5: Validation handoff

Run ALL universal gates against the new project. All must pass before declaring
the onboarding complete. The smoke check has grown from one probe (re-extract
diff) to four probes.

- [ ] **Step 1: Reproducibility -- re-run extraction + confirm zero git diff.**

```bash
bun run load-knowledge -- reproducibility-check --project <fork>
```

PASS condition: exit 0 (empty diff -- extractor output is reproducible).

- [ ] **Step 2: Idempotency -- re-run load + confirm no row drift.**

```bash
bun run load-knowledge -- idempotency --project <fork>
```

PASS condition: exit 0 (no count or content drift across all checked tables).

- [ ] **Step 3: Parallel-vs-serial equivalence -- run per-handler tests (if any).**

```bash
pytest apps/qw-oracle/scripts/extractors/<fork>/tests/ -v
```

PASS condition: all tests pass. If no test files exist (no handlers with
parallel-aggregation risk were identified in Phase F4.5), this step is skipped.

- [ ] **Step 4: Migration probes (if applicable).**

Run only if the onboarding introduced a new schema migration:

```bash
bun run load-knowledge -- migration-probes
```

PASS condition: all probes PASS (exit 0).

- [ ] **Step 5: Recommend a follow-up validate-extractor pass.**

Tell the user: "First-ship onboarding complete. All universal gates pass.
Recommend running `validate-extractor` skill in Mode A (post-ship validation)
on `<fork>` before declaring the project production-ready. The runbook's full
Sections 0-8 catch issues that the Phase F5 gate set does not."

If the fork has a runtime dump (cvarlist/cmdlist), also recommend populating
`validation-fixtures/` and running the runbook's Section 2.
```
---
END OF CHANGE 2

---
CHANGE 3 -- UPDATE Mode P "Phase P3 onward" line

BEFORE:

```
### Phase P3 onward

Phases P3 (load-knowledge wiring), P4 (quality-grid probes), P5 (validation handoff), P6 (documentation), P7 (commit) are identical to Mode F's F3-F7.
```

AFTER:

```
### Phase P3 onward

Phases P3 (load-knowledge wiring), P4 (quality-grid probes), P4.5 (register in universal gate config dicts), P5 (validation handoff), P6 (documentation), P7 (commit) are identical to Mode F's F3, F4, F4.5, F5-F7.
```
---
END OF CHANGE 3

---
CHANGE 4 -- UPDATE Phase F4 stale commands

This change replaces three pre-Postgres-era commands in Phase F4 (Quality-grid probes) that no longer work today:
- `npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- ...` -- npm rejects the `workspace:` deps in apps/qw-oracle/package.json with EUNSUPPORTEDPROTOCOL (qw-oracle/CLAUDE.md "Bun is the runtime").
- `DB=...; sqlite3 -header "$DB" "SELECT ..."` -- the `data/knowledge.db` SQLite file no longer exists; Layer 1 data lives in Postgres since Arc 1 Phase 2 (2026-05-02). Only `.bak` historical backups remain at that path.

Two locations in Phase F4. Edit each with the Edit tool; the BEFORE block on each side is unique enough to anchor without disambiguation.

CHANGE 4a -- Phase F4 Step 1 baseline-counts capture command

BEFORE (one continuous bash codeblock in F4 Step 1):

```
python3 apps/qw-oracle/scripts/extractors/<fork>/extract.py --workers 12
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project <fork> --version <version> --ordinal <next-ordinal>
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 -header "$DB" "SELECT type, COUNT(*) FROM entities WHERE project='<fork>' AND source_state='source_backed' GROUP BY type ORDER BY type;"
```

AFTER:

```
python3 apps/qw-oracle/scripts/extractors/<fork>/extract.py --workers 12
bun --cwd apps/qw-oracle run load-knowledge -- extract-tag --project <fork> --version <version> --ordinal <next-ordinal>
psql "$DATABASE_URL" -c "SELECT type, COUNT(*) FROM entities WHERE project='<fork>' AND source_state='source_backed' GROUP BY type ORDER BY type;"
```

The `DB=...` env-export line is dropped; `psql` reads `DATABASE_URL` directly. The `bun --cwd apps/qw-oracle` invocation matches the `npm --prefix apps/qw-oracle` cwd-monorepo-root convention the existing F4 uses.

CHANGE 4b -- Phase F4 Step 4 quality-grid run command

BEFORE (one bash codeblock in F4 Step 4):

```
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project <fork> --family both
```

AFTER:

```
bun --cwd apps/qw-oracle run load-knowledge -- quality-grid --project <fork> --family both
```

---
END OF CHANGE 4

---

### Task 4: Replace stale sqlite3 references in quality-grid.ts comments

- **Goal:** Replace two stale `sqlite3 "$DB"` references in floor-probe seed-capture documentation comments with the postgres-era `psql "$DATABASE_URL"` form. Comment-only edit; no logic change. Operator-confirmed drain-now (paired with CHANGE 4 in Task 3 since both surface from the same SQLite-era doc-drift audit).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (Modified).
- **Steps:**
  - [ ] Edit `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` to replace the comment block at lines ~1379-1381 (count-by-project-and-type capture comment) per CHANGE 5a below.
  - [ ] Edit the same file to replace the comment block at lines ~1397-1399 (count-by-project-and-type-and-source_state capture comment) per CHANGE 5b below.
- **Verification:** `grep -n "sqlite3" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` returns 0 matches; `grep -c "psql \"\$DATABASE_URL\"" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` returns 2 (V8 below).
- **Execution mode:** `inline` -- two BEFORE/AFTER comment blocks shipped below; no logic change; no test impact (the comments document seed-capture provenance, not runtime behavior).

---
CHANGE 5a -- quality-grid.ts L1379-1381 (count-by-project-and-type comment)

BEFORE:

```
//   sqlite3 "$DB" "SELECT project, type, COUNT(*) FROM entities
//                  GROUP BY project, type HAVING COUNT(*) > 0
//                  ORDER BY project, type;"
```

AFTER:

```
//   psql "$DATABASE_URL" -c "SELECT project, type, COUNT(*) FROM entities
//                            GROUP BY project, type HAVING COUNT(*) > 0
//                            ORDER BY project, type;"
```

The continuation-line indentation increases by 6 columns to align under the new `psql "$DATABASE_URL" -c "` prefix; the SQL body is identical.

---
CHANGE 5b -- quality-grid.ts L1397-1399 (count-by-project-and-type-and-source_state comment)

BEFORE:

```
//   sqlite3 "$DB" "SELECT project, type, source_state, COUNT(*) FROM entities
//                  GROUP BY project, type, source_state HAVING COUNT(*) > 0
//                  ORDER BY project, type, source_state;"
```

AFTER:

```
//   psql "$DATABASE_URL" -c "SELECT project, type, source_state, COUNT(*) FROM entities
//                            GROUP BY project, type, source_state HAVING COUNT(*) > 0
//                            ORDER BY project, type, source_state;"
```

---
END OF CHANGE 5

---

## Verification (phase boundary)

All commands run from the monorepo root (`/home/paradoks/projects/quakeworld/`).

**V1.** VALIDATION-GATES.md created:

    test -f apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md && echo EXISTS

PASS condition: outputs `EXISTS`.
FAIL condition: file not found.

**V2.** VALIDATION-GATES.md has exactly 7 top-level section headers:

    grep -c "^## " apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md

PASS condition: outputs `7`.
FAIL condition: any other number.

**V3.** VALIDATION-RUNBOOK.md has the cross-link:

    grep -n "VALIDATION-GATES" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md

PASS condition: returns exactly one matching line.
FAIL condition: no match (cross-link not inserted) or multiple matches (inserted twice).

**V4.** SKILL.md has Phase F4.5:

    grep -n "F4.5" ~/.claude/skills/onboard-extractor/SKILL.md | head -5

PASS condition: returns at least 2 lines (section header + at least one reference).
FAIL condition: no match.

**V5.** SKILL.md F5 expansion references universal gates:

    grep -n "idempotency\|reproducibility-check\|migration-probes" \
      ~/.claude/skills/onboard-extractor/SKILL.md | grep "bun run" | head -5

PASS condition: returns at least 2 matching lines (idempotency and reproducibility-check
invocations in the expanded F5 step).
FAIL condition: no match or only 1 match.

**V6.** VALIDATION-GATES.md parent directory is correct (smoke check path):

    ls apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md

PASS condition: file listed.
FAIL condition: no such file.

**V7.** SKILL.md Phase F4 has no stale npm or sqlite3 invocations:

    grep -n "npm --prefix\|sqlite3\|knowledge.db" ~/.claude/skills/onboard-extractor/SKILL.md

PASS condition: returns 0 matches.
FAIL condition: any of the three patterns appears anywhere in SKILL.md (CHANGE 4 missed at least one of the three locations -- L189 / L190-191 / L205 in the BEFORE state).

**V8.** quality-grid.ts has no stale sqlite3 references AND uses psql/postgres-js form in the floor-probe seed-capture comments:

    grep -n "sqlite3" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
    grep -c "psql \"\$DATABASE_URL\"" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts

PASS condition: first command returns 0 matches; second command returns `2` (one for each comment block at lines ~1379 and ~1397 post-edit).
FAIL condition: any sqlite3 invocation reference remains, OR fewer than 2 psql/DATABASE_URL matches.

---

## Outputs to next phase

- `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` exists with 7
  sections documenting CLI conventions, dispatch pattern, DB config, volatile-column
  strip, per-project config dict shape, pytest test conventions, and CI-readiness
  checklist. Future gate authors read this before writing a new probe.
- `VALIDATION-RUNBOOK.md` has a cross-link to the new doc at the top.
- `~/.claude/skills/onboard-extractor/SKILL.md` teaches Phase F4.5/P4.5
  (register in each gate's config dict) and Phase F5/P5 runs all 4 universal
  gates before declaring onboarding done.
- Phase 6 can now reference VALIDATION-GATES.md when documenting the audit
  cadence rule in EXTRACTOR-PLAYBOOK.md and adding the "no per-project bash
  scripts" callout (part 2 of the SKILL.md update, per D10).

---

## Open questions / deferred items

n/a -- phase scope is fully resolved.

**Resolved 2026-05-08 by operator at planner-review time:** the F4 stale
commands (sub-agent ADVISORY) were originally punted to "Phase 6 or HANDOVER"
default. Operator verified that sqlite3 is genuinely retired across qw-oracle
(Postgres + postgres-js since Arc 1 Phase 2; no `data/knowledge.db` live file;
no sqlite3/better-sqlite3 deps in package.json) and confirmed the F4 commands
are actively broken (npm rejects workspace: deps with EUNSUPPORTEDPROTOCOL;
sqlite3 path no longer exists). Drain-now per D7: fix rides this commit since
P5 is already editing SKILL.md. CHANGE 4 (three SKILL.md F4 line-edits) added
to Task 3; Task 4 (two quality-grid.ts comment fixes) added for the related
documentation drift surfaced by the same audit. V7 + V8 verification probes
gate the fix.

---

## Recovery (if verification fails)

**V1/V6 fails (VALIDATION-GATES.md not found):** re-run Task 1. Confirm the
Write tool succeeded -- look for error output. Verify the path is
`apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` (not under `extractors/`).

**V2 fails (section count != 7):** the file exists but a section header was
mis-formatted. Read the file and grep for `^##` to identify the miscount. The
7 headers should be: `## 1. CLI shape conventions`, `## 2. Reuse the F1
quality-grid dispatch pattern`, `## 3. Env-var driven DB config`, `## 4.
Volatile-column strip pattern`, `## 5. Per-project config dict shape`, `## 6.
Test pattern conventions (parallel-vs-serial)`, `## 7. CI-readiness checklist`.

**V3 fails (no cross-link in RUNBOOK):** re-run Task 2. Confirm the Edit tool
found the exact old_string. The insertion point is the blank line immediately
before `**Scope:**` in VALIDATION-RUNBOOK.md (around line 5).

**V4 fails (no F4.5 in SKILL.md):** re-run Task 3 Change 1. Confirm the path
`~/.claude/skills/onboard-extractor/SKILL.md` exists (`test -f` it first).
The insertion target is the line `### Phase F5: Validation handoff`.

**V5 fails (no gate invocations in expanded F5):** re-run Task 3 Change 2.
Confirm the Edit tool's old_string matched the current Phase F5 content.
The expected new F5 content has `bun run load-knowledge -- idempotency` and
`bun run load-knowledge -- reproducibility-check` in Steps 2 and 1 respectively.

**V7 fails (stale npm/sqlite3/knowledge.db still in SKILL.md):** at least one
of CHANGE 4a / 4b missed its target. Re-grep to identify which pattern
remains. Three edit locations were specified in CHANGE 4: F4 Step 1 npm
invocation (BEFORE/AFTER 4a top half), F4 Step 1 sqlite3 + DB= lines
(BEFORE/AFTER 4a bottom half -- the two-line edit), F4 Step 4 npm invocation
(BEFORE/AFTER 4b). Re-run Task 3 Change 4 for whichever target was missed.

**V8 fails (sqlite3 still in quality-grid.ts):** at least one of CHANGE 5a /
5b missed its target. Re-run Task 4 for the remaining sqlite3 reference.
Read the file and locate `sqlite3 "$DB"` -- the remaining match is one of the
two comment blocks at lines ~1379 and ~1397.

**V8b grep-quoting gotcha (executor advisory, 2026-05-08):** the V8b probe
`grep -c "psql \"\$DATABASE_URL\""` is sensitive to shell invocation context.
Under double-quoted multi-command runs (e.g., HEREDOC bodies, certain shells)
the inner `\"\$DATABASE_URL\"` can produce a false 0 even when the matches
are present. If V8b reports 0, re-run with single quotes:
`grep -c 'psql "$DATABASE_URL"' apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.
The single-quoted form sidesteps shell expansion entirely. The probe content
is correct; only the wrapping quotes need attention. Not a gate bug; not
tracked in review-findings.md per executor recommendation.

---

## Findings resolved by this phase (per review-findings.md)

- **F1** (full-suite pytest sys.path pollution -- FTE + QW collection errors):
  NOT resolved by this phase. F1 is on the HANDOVER track (deferred fix via
  per-project conftest.py). Phase 5 is paper-only; it does not modify any
  Python test infrastructure.

No other findings currently in review-findings.md touch Phase 5.

---

## Verification sub-agent dispatch

After the phase MD was drafted, the following sub-agent was dispatched with
the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md

Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md

Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md

Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (relevant Pass sections: 1.2.6 + 2.2 + 2.3)

Then verify, file-by-file:

1. Every CI-readiness convention from D2 (exit codes, --project flag,
   --all, --json, --help, env-var driven DATABASE_URL, no CWD assumptions,
   deterministic output) -- verify the phase MD's VALIDATION-GATES.md content
   covers each convention in Section 1 and Section 7. Flag CRITICAL on any
   missing convention.

2. Every per-project config dict entry the phase MD documents -- verify
   the shape described in VALIDATION-GATES.md Section 5 matches the actual
   per-project config dict shapes in the shipped gate files:
     - idempotency.ts PROJECT_IDEMPOTENCY_CONFIG
     - reproducibility-check.ts PROJECT_REPRODUCIBILITY_CONFIG
     - parallel_serial_helpers.py (no top-level dict; per-test-file shape)
     - migration-probes.ts (n/a -- confirm this claim is accurate)
   Flag SUBSTANTIVE on shape drift or missing/incorrect key descriptions.

3. Every reference to the dispatcher pattern in Section 2 -- verify the
   described index.ts edit steps (comment + dispatch case + wrapper + usage)
   match what the live index.ts actually uses for the three shipped gates
   (idempotency, reproducibility-check, migration-probes). Flag SUBSTANTIVE
   on inaccurate step descriptions.

4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF
     is expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag Created file non-existence.
   Verify:
   - apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md EXISTS
   - ~/.claude/skills/onboard-extractor/SKILL.md EXISTS
   - apps/qw-oracle/scripts/load-knowledge/ directory EXISTS (parent for Created file)

5. Every reference to the volatile-column strip pattern (Section 4) -- verify
   the 5 volatile columns listed match what idempotency.ts actually strips
   (check the stripFragment function). Flag CRITICAL on any discrepancy.

6. Every finding reference (F1) -- confirm F1's resolution track (HANDOVER)
   is correctly stated and that Phase 5 does NOT claim to resolve it.

7. Every shell command in the phase MD -- verify bun is used (not npm or tsx)
   for load-knowledge invocations per project CLAUDE.md. python3 is acceptable
   for reproducibility probe and pytest invocations.

8. Every SKILL.md edit target -- verify that:
   a. ~/.claude/skills/onboard-extractor/SKILL.md exists at that path.
   b. The BEFORE text for Change 2 (Phase F5 current content) matches what is
      actually in the skill file at the Phase F5 section.
   c. The BEFORE text for Change 3 (Mode P "Phase P3 onward") matches what is
      actually in the skill file.
   Flag CRITICAL on any BEFORE text that does not match the current file content
   (executor Edit tool will fail to apply the change if BEFORE is wrong).

9. "Engineer ports X" / "fills in details" / TODO smell -- list any steps
   that require the executor to guess at content rather than apply content
   shipped inline.

10. Every per-task "Execution mode" declaration -- confirm all three tasks
    are declared inline (Phase 5 is markdown-heavy; D15 specifies inline
    default for markdown phases). Flag if any task is incorrectly declared
    as subagent.

11. VALIDATION-GATES.md Section 2 references quality-grid.ts as the dispatch
    model (D4). Verify the description of the thin-wrapper dynamic-import
    pattern is accurate by checking index.ts lines for runIdempotencyCli,
    runReproducibilityCheckCli, runMigrationProbesCli.

12. VALIDATION-GATES.md Section 6 finalize-via-param requirement -- this
    requirement was surfaced in Phase 3. Verify parallel_serial_helpers.py
    exists at apps/qw-oracle/scripts/extractors/extractor_lib/tests/
    parallel_serial_helpers.py and that the import shape described in Section 6
    (`from extractor_lib.tests import assert_parallel_serial_equivalent`) matches
    the actual function name exported.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

Sub-agent findings and drafter response are in the section below.

---

### Sub-agent findings

CRITICAL:
- Section 2 step 3 template used `{ run<Gate>Cli: run }` as the dynamic import
  name, implying the export name always matches the wrapper name. In the live
  codebase, `runReproducibilityCheckCli` wrapper imports `{ runReproducibilityCli: run }`
  -- the names differ. A new gate author following the template literally could
  write the wrong import name and get a runtime error on dispatch.

SUBSTANTIVE: (none)

ADVISORY:
- SKILL.md Phase F4 still uses pre-Postgres-era `npm --prefix` and `sqlite3`
  commands. Phase 5 does not touch F4 (out of scope per D1 / Pass 2.2); the
  inconsistency will be visible after Phase 5 inserts F4.5/F5 with bun commands.

---

### Drafter response to findings

CRITICAL applied: Section 2 step 3 updated. Replaced `{ run<Gate>Cli: run }`
with `{ <exportName>: run }` and added a note that the export name may differ
from the wrapper name, with a verification command and the concrete
`runReproducibilityCli` example.

ADVISORY noted in Open questions: Phase F4 stale commands flagged. Operator
decision whether to expand Phase 6 scope or add a HANDOVER cleanup task.
Not a decisions.md conflict; no rejection needed.

---

## Post-execution amendments (2026-05-08)

### Phase 6 SKILL.md callout already in place at execution time

Phase 5 + Phase 6 are parallel-safe per Pass 2.3 + decisions.md. Operator
fired both executors in parallel. Phase 6 committed first
(`aae53d38`), then Phase 5 (`b2f8a107`). At Phase 5's CHANGE 1 execution
time, the user-global SKILL.md already carried the Phase 6 "Anti-pattern --
no per-project bash scripts" callout immediately before
`### Phase F5: Validation handoff`.

The executor adapted CHANGE 1's `old_string` to anchor on the callout +
F5 header and preserved the callout in `new_string`. Final ordering:
F4 -> F4.5 -> Anti-pattern callout -> F5. This matches the spec
("callout sits between F4.5 and F5"). No correctness impact; execution
was smooth. The pre-flight gate (g) in the executor prompt anticipated
this scenario; the executor recognized it correctly.

Halt-report misdiagnosis (informational): Phase 5's executor halt report
states "P6's SKILL.md edit is filesystem-only (no commit yet)." This is
incorrect -- P6 committed at `aae53d38` BEFORE P5's run. The misdiagnosis
did not affect correctness because the executor adapted CHANGE 1
appropriately based on the live SKILL.md state, not git log state.

### V8b grep-quoting gotcha

V8b's grep probe `grep -c "psql \"\$DATABASE_URL\""` is sensitive to shell
invocation context. The executor's first-pass run reported 0 matches; a
re-run with single quotes (`'psql "$DATABASE_URL"'`) confirmed the correct
count of 2. The probe pattern is correct; only the wrapping quotes need
attention. Documented in the Recovery section above. Not tracked as an
F-entry per executor's call (probe-wording issue, not a gate or extractor
bug).
