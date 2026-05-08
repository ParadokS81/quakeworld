# Phase 2 -- Reproducibility probe

> **Drafter checklist:** decisions.md (full) read; review-findings.md read (no F-entries
> at draft time); brainstorm parking doc Pass 1.2.4 + Pass 2.3 read; VALIDATION-RUNBOOK
> Section 1.1 read end-to-end; idempotency.ts (Phase 1 model gate) read end-to-end;
> per-project recon (extract.py invocation paths, output directory structure, source root
> paths) completed. Verification sub-agent dispatched (see bottom of this file).

---

## Goal

Ship a universal reproducibility probe that packages VALIDATION-RUNBOOK Section 1.1
methodology as runnable. The new file `scripts/load-knowledge/reproducibility-check.ts`
re-runs `extract.py` for a project (via subprocess), then asserts empty
`git diff --stat HEAD` on the project's `output/` directory. A non-empty diff means the
extractor produced different output from what is committed to HEAD -- a real determinism
bug. The probe is filesystem-only (no database required), mirrors the CLI shape of the
Phase 1 idempotency probe, and adds an optional `--workers <N>` flag to surface latent
parallelism-naive aggregations by testing different worker counts.

A `case 'reproducibility-check':` dispatcher entry is added to `scripts/load-knowledge/
index.ts`, following the F1 quality-grid mirror pattern (D4). A 5-project catch-up audit
runs inline with this phase's commit, with per-finding triage per D6 + D8.

Runnable state at phase boundary: `bun run load-knowledge -- reproducibility-check
--project <p>` re-runs `extract.py` for project `<p>` and exits 0 (reproducible) or 1
(drift detected).

---

## Inputs from previous phase

Phase 1 complete:
- `apps/qw-oracle/scripts/load-knowledge/idempotency.ts` shipped (398 lines); 5-project
  catch-up audit passed in steady state; KTX-only `idempotency-ktx.sh` deleted.
- `case 'idempotency':` in `scripts/load-knowledge/index.ts` registered and working.
- Per-project config dict (5 entries) pattern established as the model for all subsequent
  gate files (D3).
- Phase 1 DONE_WITH_CONCERNS. Three concerns: V6 stdout contamination + V8 grep
  historical-narration false positives (both amended in phase-1 MD); FTE asset-bundle
  re-stamp passed to Phase 2 (this phase) per decisions.md D8.

---

## Files touched

### Created

```
apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/index.ts    # dispatcher case + wrapper fn + usage entry + header comment
```

### Deleted

```
n/a
```

---

## Tasks

### Task 1: Write reproducibility-check.ts

**Goal:** New file implementing the universal reproducibility probe, mirroring the
idempotency.ts shape (parseArgs, PROJECT_*_CONFIG dict, runReproducibility /
runReproducibilityCli / formatJson / formatText / printHelp split, D2 CI-readiness
conventions, D3 per-project config dict).

**Files:** `apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts` (create)

**Steps:**
- [ ] Write file with the full content shown below (see "Full file content" subsection).

**Execution mode:** inline -- full file content shipped below; no code synthesis required
during execution. Write tool, new file.

**Verification:** TypeScript compiles clean (`bunx tsc --noEmit` from `apps/qw-oracle/`).

---

#### Full file content: reproducibility-check.ts

```typescript
// apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts
//
// Universal reproducibility probe. Re-runs extract.py for a project,
// then asserts empty `git diff --stat HEAD` on the project's output
// directory. Packages VALIDATION-RUNBOOK Section 1.1 methodology as
// runnable. No database required; filesystem-only.
//
// Per docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/
// decisions.md:
//   D2 -- CI-readiness conventions (--project / --all / --json / --help,
//         absolute paths via import.meta.url, exit 0 PASS / non-zero FAIL).
//   D3 -- Per-project config dict shipped inline; not a unified registry.
//   D4 -- Dispatcher case mirrors quality-grid pattern.
//   D6 -- Phase commit body captures cross-project audit findings.
//
// Subprocess invocation uses Bun.spawnSync (Bun-native; no shell
// injection surface; array args only).
//
// Run:
//   bun run load-knowledge -- reproducibility-check --project <p>
//   bun run load-knowledge -- reproducibility-check --all
//   bun run load-knowledge -- reproducibility-check --project <p> --json
//   bun run load-knowledge -- reproducibility-check --help

import { parseArgs } from 'util';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

type ReproducibilityProject = 'ezquake' | 'fte' | 'qwcl' | 'mvdsv' | 'ktx';

const PROJECTS: readonly ReproducibilityProject[] = [
  'ezquake',
  'fte',
  'qwcl',
  'mvdsv',
  'ktx',
] as const;

interface ProjectReproducibilityConfig {
  // Absolute path to the project's extract.py driver.
  extractPy: string;
  // Absolute path to the project's source repo checkout.
  // Passed as --repo-root to extract.py; avoids CWD dependency (D2).
  repoRoot: string;
  // Absolute path to the project's output/ directory.
  // Passed as --output-dir to extract.py; target for git diff assertion.
  outputDir: string;
}

// Absolute path to this file's directory -- all paths resolved from here.
// Mirrors the dirname(fileURLToPath(import.meta.url)) pattern in index.ts.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// Per-project config dict. Each entry names the project's extract.py,
// source repo root, and output directory. D3: per-gate dict, not unified
// registry; onboarding a new project adds one entry here.
const PROJECT_REPRODUCIBILITY_CONFIG: Record<
  ReproducibilityProject,
  ProjectReproducibilityConfig
> = {
  ezquake: {
    extractPy: resolve(SCRIPT_DIR, '../extractors/ezquake/extract.py'),
    repoRoot:  resolve(SCRIPT_DIR, '../../../../research/repos/ezquake-source'),
    outputDir: resolve(SCRIPT_DIR, '../extractors/ezquake/output'),
  },
  fte: {
    extractPy: resolve(SCRIPT_DIR, '../extractors/fte/extract.py'),
    repoRoot:  resolve(SCRIPT_DIR, '../../../../research/repos/fteqw'),
    outputDir: resolve(SCRIPT_DIR, '../extractors/fte/output'),
  },
  qwcl: {
    extractPy: resolve(SCRIPT_DIR, '../extractors/qwcl/extract.py'),
    repoRoot:  resolve(SCRIPT_DIR, '../../../../research/repos/qwcl-original'),
    outputDir: resolve(SCRIPT_DIR, '../extractors/qwcl/output'),
  },
  mvdsv: {
    extractPy: resolve(SCRIPT_DIR, '../extractors/mvdsv/extract.py'),
    repoRoot:  resolve(SCRIPT_DIR, '../../../../research/repos/mvdsv'),
    outputDir: resolve(SCRIPT_DIR, '../extractors/mvdsv/output'),
  },
  ktx: {
    extractPy: resolve(SCRIPT_DIR, '../extractors/ktx/extract.py'),
    repoRoot:  resolve(SCRIPT_DIR, '../../../../research/repos/ktx'),
    outputDir: resolve(SCRIPT_DIR, '../extractors/ktx/output'),
  },
};

interface ReproducibilityResult {
  project: ReproducibilityProject;
  status: 'PASS' | 'FAIL';
  extractExitCode: number;
  diffOutput: string;
  summary: string;
}

// Synchronous via Bun.spawnSync; acceptable for a manual probe (not a
// hot path; no event loop contention concerns).
export function runReproducibility(opts: {
  project: ReproducibilityProject;
  workers?: number;
}): ReproducibilityResult {
  const { project, workers } = opts;
  const config = PROJECT_REPRODUCIBILITY_CONFIG[project];

  process.stderr.write(`[reproducibility:${project}] running extract.py...\n`);

  const extractArgs: string[] = [
    config.extractPy,
    '--repo-root', config.repoRoot,
    '--output-dir', config.outputDir,
  ];
  if (workers !== undefined) {
    extractArgs.push('--workers', String(workers));
  }

  let extractResult: ReturnType<typeof Bun.spawnSync>;
  try {
    extractResult = Bun.spawnSync(['python3', ...extractArgs], {
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    });
  } catch (err) {
    return {
      project,
      status: 'FAIL',
      extractExitCode: 1,
      diffOutput: '',
      summary: `failed to spawn python3: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!extractResult.success) {
    const stderrText = extractResult.stderr.toString('utf8').slice(0, 300);
    return {
      project,
      status: 'FAIL',
      extractExitCode: extractResult.exitCode,
      diffOutput: '',
      summary: `extract.py exited ${extractResult.exitCode}: ${stderrText}`,
    };
  }

  process.stderr.write(`[reproducibility:${project}] checking git diff...\n`);

  const diffResult = Bun.spawnSync(
    ['git', '-C', config.outputDir, 'diff', '--stat', 'HEAD'],
    { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
  );

  const diffOutput = diffResult.stdout.toString('utf8').trim();
  const status: 'PASS' | 'FAIL' = diffOutput === '' ? 'PASS' : 'FAIL';
  const lineCount = diffOutput === '' ? 0 : diffOutput.split('\n').length;
  const summary =
    status === 'PASS'
      ? 'zero git diff -- extractor output is reproducible'
      : `non-empty diff: ${lineCount} line(s) of drift detected`;

  return {
    project,
    status,
    extractExitCode: extractResult.exitCode,
    diffOutput,
    summary,
  };
}

function formatJson(results: ReproducibilityResult[]): string {
  return JSON.stringify(results, null, 2);
}

function formatText(results: ReproducibilityResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`=== ${r.project}: ${r.status} ===`);
    lines.push(`  ${r.summary}`);
    if (r.diffOutput) {
      const snippet = r.diffOutput.split('\n').slice(0, 10).join('\n    ');
      lines.push(`  diff snippet:\n    ${snippet}`);
    }
  }
  return lines.join('\n');
}

function printHelp(): void {
  process.stderr.write(
    `
load-knowledge -- reproducibility-check [options]

Re-run extract.py for a project and assert empty git diff --stat HEAD on
the project's output directory. Packages VALIDATION-RUNBOOK Section 1.1
methodology as runnable. No database required; filesystem-only.

Options:
  --project <p>   Run probe against project <p>. One of:
                    ezquake | fte | qwcl | mvdsv | ktx.
  --all           Run probe sequentially against all 5 projects.
  --workers <n>   Override worker count passed to extract.py (must be >= 1).
                  Omit to use the extractor's default (os.cpu_count() or 4).
                  Use --workers 1 for serial mode to test parallelism safety.
  --json          Emit JSON-formatted results to stdout.
  --help          Print this help and exit.

Exit codes:
  0   all targeted projects reproducible (empty git diff) OR
      --help requested (informational success).
  1   one or more projects produced a non-empty diff, or extract.py
      exited non-zero; review output for details.
  2   invalid arguments.

No database required -- this probe is filesystem-only.
`.trim() + '\n',
  );
}

export async function runReproducibilityCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      all:     { type: 'boolean' },
      workers: { type: 'string' },
      json:    { type: 'boolean' },
      help:    { type: 'boolean' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const targets: ReproducibilityProject[] = [];
  if (values.all) {
    targets.push(...PROJECTS);
  } else if (values.project) {
    if (!PROJECTS.includes(values.project as ReproducibilityProject)) {
      process.stderr.write(
        `--project must be one of ${PROJECTS.join(' | ')}; got ${values.project}\n`,
      );
      process.exit(2);
    }
    targets.push(values.project as ReproducibilityProject);
  } else {
    process.stderr.write('Either --project <p> or --all is required.\n');
    printHelp();
    process.exit(2);
  }

  let workers: number | undefined;
  if (values.workers !== undefined) {
    const parsed = Number(values.workers);
    if (!Number.isInteger(parsed) || parsed < 1) {
      process.stderr.write(
        `--workers must be a positive integer >= 1; got ${values.workers}\n`,
      );
      process.exit(2);
    }
    workers = parsed;
  }

  const results: ReproducibilityResult[] = [];
  for (const project of targets) {
    const r = runReproducibility({ project, workers });
    results.push(r);
  }

  if (values.json) {
    process.stdout.write(formatJson(results) + '\n');
  } else {
    process.stdout.write(formatText(results) + '\n');
  }

  const failed = results.some((r) => r.status === 'FAIL');
  process.exitCode = failed ? 1 : 0;
}
```

---

### Task 2: Add reproducibility-check dispatcher to index.ts

**Goal:** Wire `reproducibility-check` into the dispatcher with the same lazy-import
pattern used for `idempotency`.

**Files:** `apps/qw-oracle/scripts/load-knowledge/index.ts` (modify)

**Steps:**
- [ ] Apply Edit A (header comment -- add `idempotency` + `reproducibility-check` that
      were missing from the comment).
- [ ] Apply Edit B (dispatcher case -- add `reproducibility-check` case after
      `idempotency`).
- [ ] Apply Edit C (usage string -- add `reproducibility-check` entry after `idempotency`
      entry in the long usage string).
- [ ] Apply Edit D (wrapper function -- add `runReproducibilityCheckCli` after
      `runIdempotencyCli`).

**Execution mode:** inline -- all four Edit blocks are precise old/new string pairs; no
code synthesis required during execution. Edit tool, 4 separate edits.

**Verification:** `bun run load-knowledge -- reproducibility-check --help` exits 0.

---

#### Edit A: Header comment (lines 6-7)

old_string:
```
// Subcommands: load-version, diff, enrich, load-assets, release-notes,
//              extract-tag, prune-cross-type-orphans, review, quality-grid,
//              build-snapshot, load-maps, load-gameplay, re-derive
```

new_string:
```
// Subcommands: load-version, diff, enrich, load-assets, release-notes,
//              extract-tag, prune-cross-type-orphans, review, quality-grid,
//              idempotency, reproducibility-check, build-snapshot,
//              load-maps, load-gameplay, re-derive
```

---

#### Edit B: Dispatcher case (after idempotency case)

old_string:
```
  if (subcommand === 'idempotency')               { await runIdempotencyCli(rest); return; }
  if (subcommand === 'build-snapshot')            { await runBuildSnapshot(rest); return; }
```

new_string:
```
  if (subcommand === 'idempotency')               { await runIdempotencyCli(rest); return; }
  if (subcommand === 'reproducibility-check')     { await runReproducibilityCheckCli(rest); return; }
  if (subcommand === 'build-snapshot')            { await runBuildSnapshot(rest); return; }
```

---

#### Edit C: Usage string (add reproducibility-check after idempotency entry)

old_string:
```
  idempotency   [--project <p>] [--all] [--json] [--help]
                Snapshot Layer 1 rows, re-run extract-tag --version head
                --force, snapshot again, diff per table. Universal
                idempotency probe (D2/D3/D4 from extractor-discipline-
                catchup arc). Exit 0 = all targeted projects idempotent;
                exit 1 = drift detected; exit 2 = invalid args.
  build-snapshot --project <p> [--version <v>] [--output <dir>]
```

new_string:
```
  idempotency   [--project <p>] [--all] [--json] [--help]
                Snapshot Layer 1 rows, re-run extract-tag --version head
                --force, snapshot again, diff per table. Universal
                idempotency probe (D2/D3/D4 from extractor-discipline-
                catchup arc). Exit 0 = all targeted projects idempotent;
                exit 1 = drift detected; exit 2 = invalid args.
  reproducibility-check [--project <p>] [--all] [--workers <n>]
                [--json] [--help]
                Re-run extract.py and assert empty git diff on the
                project's output directory. Packages VALIDATION-RUNBOOK
                Section 1.1 as runnable. No database required.
                Exit 0 = reproducible; exit 1 = diff detected or
                extract.py failed; exit 2 = invalid args.
  build-snapshot --project <p> [--version <v>] [--output <dir>]
```

---

#### Edit D: Wrapper function (add runReproducibilityCheckCli after runIdempotencyCli)

old_string:
```
async function runIdempotencyCli(args: string[]): Promise<void> {
  const { runIdempotencyCli: run } = await import('./idempotency.js');
  await run(args);
}
```

new_string:
```
async function runIdempotencyCli(args: string[]): Promise<void> {
  const { runIdempotencyCli: run } = await import('./idempotency.js');
  await run(args);
}

async function runReproducibilityCheckCli(args: string[]): Promise<void> {
  const { runReproducibilityCli: run } = await import('./reproducibility-check.js');
  await run(args);
}
```

---

## Verification (phase boundary)

Run these after execution to confirm the phase landed correctly.

**V1. TypeScript compiles clean.**
```bash
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS condition: exits 0 with no output.
FAIL condition: any type error (most likely `Bun` global not recognized -- see Recovery).

**V2. --help exits 0 and prints flag list.**
```bash
bun run load-knowledge -- reproducibility-check --help; echo "exit: $?"
```
PASS condition: exits 0; stderr contains `--project`, `--all`, `--workers`,
`--json`, `--help`, and "No database required".
FAIL condition: non-zero exit or missing flags.

**V3. Invalid project name exits 2.**
```bash
bun run load-knowledge -- reproducibility-check --project badproject; echo "exit: $?"
```
PASS condition: "exit: 2".
FAIL condition: any other exit code.

**V4. --workers validation exits 2 on out-of-range value.**
```bash
bun run load-knowledge -- reproducibility-check --project ezquake --workers 0; echo "exit: $?"
```
PASS condition: "exit: 2" with "--workers must be a positive integer >= 1" in stderr.
FAIL condition: any other exit code.

**V5. No --project and no --all exits 2.**
```bash
bun run load-knowledge -- reproducibility-check; echo "exit: $?"
```
PASS condition: "exit: 2".

**V6. --json output parses as valid JSON.**
```bash
bun run load-knowledge -- reproducibility-check --project ezquake --json | python3 -m json.tool > /dev/null; echo "exit: $?"
```
PASS condition: exits 0 (valid JSON emitted to stdout).
FAIL condition: JSON parse error or no stdout output.

**V7. 5-project catch-up audit (run probe against all 5 projects). Per D6.**
```bash
bun run load-knowledge -- reproducibility-check --all
```
PASS condition: each project reports PASS (zero git diff) OR reports FAIL with the
finding documented per D7+D8 in this phase's commit body. No undocumented non-zero
diff. Wall time for all 5 projects is expected to be 60-120s (each extract.py run
is ~14s on a 12-core system using default workers).

Expected finding for FTE: investigate whether `fte-asset-path-rules-verified.json`
or any FTE output file shows a non-empty diff. The file currently shows `"version":
"build-6698"` at top level (stable string from source repo state). If the diff is
empty, FTE PASS. If non-empty, triage per D8: drain-now if trivially fixable (e.g.,
sort order or non-deterministic field), HANDOVER if deeper investigation needed.

Note: the slipgate bundle drift (`apps/slipgate-app/src/lib/config/data/
fte-asset-bundle.json`) flagged in Phase 1 is NOT in scope for this probe. That
file is outside `extractors/fte/output/` and originates from `extract-tag` (TS),
not `extract.py` (Python). If it appears as a pre-existing uncommitted change in
the working tree, stash or commit it before running the probe to get a clean baseline.
If it shows up as a NEW change after running the probe, that is a separate finding --
surface per D8 (most likely: extract.py should not reach outside its output dir;
investigate and drain-now or HANDOVER).

**V8. Per D12: probe does not write to the database.**
```bash
grep -n 'sql\|postgres\|DATABASE_URL' apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts
```
PASS condition: zero matches (filesystem-only probe; no DB writes).
FAIL condition: any match -- indicates accidental DB access was introduced.

---

## Outputs to next phase

- `apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts` exists; probe
  runnable for all 5 projects.
- `case 'reproducibility-check':` in `index.ts` dispatches correctly.
- 5-project catch-up audit complete; findings triaged per D6 + D8; commit body
  captures per-project results.
- Phase 2 status: shipped. README.md phase index "not started" -> "shipped"; "Where
  we are right now" updated.

Phase 3 (parallel-vs-serial pytest pattern) and Phase 4 (migration probes) are
independent and can proceed in any order after Phase 2.

---

## Open questions / deferred items

**Q1. FTE asset-bundle re-stamp scope.**
- Question: Phase 1 passed "FTE asset-bundle re-stamp" to Phase 2's scope. The
  slipgate bundle file (`apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`)
  is NOT in the `extractors/fte/output/` directory that this probe checks. If FTE's
  output/ is clean and only the slipgate bundle shows drift, the drift is outside
  this probe's scope.
- Default chosen for now: probe scopes to `extractors/<project>/output/` per
  RUNBOOK 1.1. Slipgate bundle triage is separate D8 territory.
- Who can resolve: Phase 2 executor during catch-up audit. If FTE output/ is clean
  and the slipgate bundle is the only drift source, triage as HANDOVER with note
  "investigate when build-snapshot or extract-tag re-stamps slipgate bundles on
  forced re-load."

**Q2. git diff scope: tracked files only.**
- Question: `git diff --stat HEAD` only shows changes to tracked files. New output
  files not previously committed would appear as untracked (not in the diff).
- Default chosen for now: match RUNBOOK 1.1 exactly. All expected output files are
  tracked. A new untracked output file would be a different concern (extractor added
  a new output type) worth catching separately.
- Who can resolve: if a new untracked file appears after a probe run, investigate
  whether it should be committed or whether the extractor has a scoping bug.

**Q3. Bun.spawnSync vs other subprocess APIs.**
- Question: `Bun.spawnSync` is Bun-native and correct for this project. If the file is
  ever run under Node.js (not expected -- project is Bun-only), it would fail.
- Default chosen for now: `Bun.spawnSync` is the right choice. The project is
  Bun-only per CLAUDE.md and D2 explicitly references Bun-native path APIs.
- Who can resolve: not an issue given project constraints; no action needed.

---

## Recovery (if verification fails)

**V1 fails (TypeScript compile error involving Bun global):**
Most likely cause: `bun-types` not in tsconfig.json's `types` array, so `Bun` global
is not recognized. Fix: add `"types": ["bun-types"]` to `apps/qw-oracle/tsconfig.json`
compilerOptions, or verify it is already listed. Alternatively, if the existing
tsconfig already handles Bun globals for idempotency.ts (which does NOT use Bun-native
APIs directly), the issue may be specific to `Bun.spawnSync` being used for the first
time in this file. Check if `Bun` is declared anywhere else in the project.

**V2 fails (--help exits non-zero or import error):**
Most likely cause: wrong import path in the lazy import in index.ts
(`'./reproducibility-check.js'`). Confirm the file was written to the correct path
(`apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts`). Bun compiles ts
to js lazily; the `.js` extension in the import is correct.

**V6 fails (--json output is not valid JSON):**
Most likely cause: process.stderr.write progress messages leaking into stdout.
Confirm `[reproducibility:...]` messages in `runReproducibility` use `process.stderr`
not `process.stdout`. In `runReproducibilityCli`, confirm `formatJson` output goes to
`process.stdout.write` and progress messages go to `process.stderr.write`.

**V7 (catch-up audit): extract.py exits non-zero for a project:**
Read the stderr snippet in the probe output. Common causes:
- Missing python3 or libclang: `python3 -c "import clang.cindex"` in WSL.
- Source repo wrong path: verify `research/repos/<slug>` matches the config dict.
  Slugs: ezquake-source, fteqw, qwcl-original, mvdsv, ktx.
- Source repo has uncommitted changes that affect output: `git -C research/repos/<slug>
  status` to confirm clean checkout at the correct SHA.

**V7 (catch-up audit): non-empty diff for a project:**
Steps: (1) run `bun run load-knowledge -- reproducibility-check --project <p>` to see
the diff snippet; (2) run `git -C apps/qw-oracle/scripts/extractors/<p>/output diff HEAD`
for full diff; (3) identify the changed file(s); (4) determine root cause (merge order
non-determinism, timestamp in output, path normalization drift); (5) drain-now bugfix
per D7 -- fix in `extract.py` finalize() sort or strip the volatile field; (6) re-run
probe to confirm PASS; (7) bugfix rides this phase's commit.

**V7 (catch-up audit): slipgate bundle file appears as a new change after probe run:**
The reproducibility probe runs `extract.py` only. If the slipgate bundle file is
modified, something else is at play (e.g., the probe spawned a subprocess that
unexpectedly ran a downstream step). Investigate with `git diff --name-only` to
identify all changed files. Most likely this is a pre-existing uncommitted change from
Phase 1 that was not committed before running Phase 2. Stash or commit first.

---

## Findings resolved by this phase (per review-findings.md)

No F-entries exist in `review-findings.md` at draft time.

Cross-arc concern from Phase 1 (FTE asset-bundle re-stamp): Phase 2's catch-up audit
is the resolution point per D8. Executor documents the triage disposition (drain-now /
HANDOVER / reject) in the commit body. If the triage is drain-now with a non-trivial
fix, an F-entry is added to `review-findings.md` at that time.

---

## Verification sub-agent dispatch

Dispatched post-draft per phase-template.md. Sub-agent brief:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-2-reproducibility-probe.md
Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (relevant Pass section: 1.2.4 + 2.3)

Then verify, file-by-file:

1. Every CI-readiness convention from D2 (exit codes, --project flag,
   --all, --json, --help, env-var driven DB, no CWD assumptions,
   deterministic output) -- verify the phase MD's gate authoring covers
   each. Flag CRITICAL on any missing convention for a TS-probe phase.

2. Every per-project config dict entry the phase ships -- verify the
   shape matches Pass 1.2.4 (per-gate dict; not unified registry;
   one entry per project: ezquake / FTE / QWCL / MVDSV / KTX).
   Flag SUBSTANTIVE on shape drift or missing project entries.

3. Every dispatcher case added to scripts/load-knowledge/index.ts --
   verify the case follows the F1 quality-grid mirror pattern (D4).
   Flag SUBSTANTIVE on dispatch shape drift. Confirm the case imports
   + invokes the gate cleanly.

4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF
     is expected NOT to exist yet -- this is a paper plan, not
     executed code. Do NOT flag a Created file's non-existence.

5. No database access in reproducibility-check.ts (filesystem-only probe).
   Confirm no postgres-js imports, no sql object usage, no DATABASE_URL
   references in the inline file content. Flag CRITICAL if any are present.

6. Every reference to a finding (F-numbers) -- none at draft time;
   confirm phase MD acknowledges this correctly.

7. Every shell command -- does it use `bun` for scripts (per project
   CLAUDE.md), not `tsx` or `node`? `python3` and `git` are acceptable
   for subprocess invocations in the probe.

8. Every per-project audit step -- confirm phase MD's verification
   section includes "run probe against all 5 projects" probe per D6;
   commit body capture of findings inline per D6 + D8.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Every per-task "Execution mode" declaration -- confirm rationale
    matches D15. Flag if >70% inline for a code-synthesis-shaped phase.

11. Path arithmetic in PROJECT_REPRODUCIBILITY_CONFIG -- verify the
    relative paths from SCRIPT_DIR (apps/qw-oracle/scripts/load-knowledge/)
    are correct:
    - ../extractors/<project>/extract.py resolves to
      apps/qw-oracle/scripts/extractors/<project>/extract.py
    - ../../../../research/repos/<slug> resolves to
      research/repos/<slug> at monorepo root
    Verify all 5 project slugs: ezquake-source, fteqw, qwcl-original,
    mvdsv, ktx. Confirm research/repos/<slug> exists for each.

12. Confirm all 5 extract.py files exist at the paths in the config dict.
    Confirm all 5 output directories exist at ../extractors/<project>/output.

Report findings under 400 words:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

---

## Post-execution amendments (2026-05-08)

Phase 2 executor halted DONE_WITH_CONCERNS at commit `2e7808eb`. Deliverables shipped correctly (universal `reproducibility-check.ts` packaging VALIDATION-RUNBOOK Section 1.1 as runnable; dispatcher case wired; `--workers` flag for surfacing latent parallelism-naive aggregations); 5-project catch-up audit clean (all 5 PASS; no real determinism bugs surfaced). Two drain-now fixes shipped during execution; one P1 carry-forward resolved at this gate. Documented here for the audit trail.

### Drain-now fix 1 -- git diff scoping

Original phase MD specified `git diff --stat HEAD` with `-C <outputDir>` to change directory before diffing. That form runs the diff against the ENTIRE repo from the output dir's CWD; on a workspace with any uncommitted tree (the normal dev state), the diff would surface UNRELATED uncommitted changes elsewhere in the repo and false-FAIL the probe.

**Amended invocation:** scope diff to the project's output directory via pathspec:

```
git diff --stat HEAD -- <config.outputDir>
```

The `-- <path>` form restricts the diff to that pathspec regardless of CWD. PASS condition: empty stdout AND exit 0. The probe now correctly distinguishes "extractor output drifted" (real determinism bug) from "operator has unrelated uncommitted work" (noise).

### Drain-now fix 2 -- Bun.spawnSync stderr type narrowing

Original phase MD invoked `Bun.spawnSync(...)` with `stderr: 'pipe'` and accessed `extractResult.stderr` directly. Bun's `spawnSync` return type does NOT narrow `stderr` to non-undefined when `stderr: 'pipe'` is passed (the pipe-vs-inherit distinction lives in option-type generics that Bun does not currently enforce in inference). Direct access compiled but was a type-soundness latent.

**Amended access:** optional chaining at the access site:

```
extractResult.stderr?.toString() ?? ''
```

Belt-and-suspenders default to empty string when stderr is structurally undefined. Behavior identical at runtime for the `'pipe'` case; type-clean at compile time. No-op for the probe's PASS/FAIL logic.

### Cross-arc concern -- FTE asset-bundle re-stamp (carried from Phase 1; resolved)

Phase 1 flagged that re-running `extract.py` for FTE re-stamps `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json` (`version: "build-6698"` -> `version: "head"`) and routed the concern to Phase 2 for triage under reproducibility scope.

**Disposition: EXPLICIT REJECT (D8).** Phase 2's audit confirmed the slipgate bundle file is NOT in `apps/qw-oracle/scripts/extractors/fte/output/` -- it is a separate downstream artifact driven by `extract-tag.ts` (TypeScript), not `extract.py` (Python). The reproducibility probe's scope is `extract.py`-driven `output/` only; FTE's `output/` itself is clean across re-runs. The re-stamp behavior is real but lives in a different pipeline and is out of scope for this probe.

**No F-entry added to `review-findings.md`** -- the concern is rejected at this gate. If cross-arc resolution is needed (e.g., `extract-tag` should never re-stamp the slipgate bundle when re-loading the same SHA), a separate arc handles it.

---
