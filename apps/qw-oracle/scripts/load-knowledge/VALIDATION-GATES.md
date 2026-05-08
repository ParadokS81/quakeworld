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
