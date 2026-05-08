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
    const stderrText = extractResult.stderr?.toString('utf8').slice(0, 300) ?? '';
    return {
      project,
      status: 'FAIL',
      extractExitCode: extractResult.exitCode,
      diffOutput: '',
      summary: `extract.py exited ${extractResult.exitCode}: ${stderrText}`,
    };
  }

  process.stderr.write(`[reproducibility:${project}] checking git diff...\n`);

  // Scope the diff to config.outputDir only (not the whole repo) so that
  // other uncommitted changes in the working tree don't produce false FAILs.
  const diffResult = Bun.spawnSync(
    ['git', 'diff', '--stat', 'HEAD', '--', config.outputDir],
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
