// docs-probe-category-coverage.ts
//
// D16/F3 inversion guard: proves cvar category coverage is non-empty for
// qtv/qwfwd/qwcl at their FROZEN snapshot versions, and cross-checks that
// _meta.snapshot_version equals the frozen value (catching any future edit
// that flips the dispatch to 'head').
//
// PART 1 -- CVAR COVERAGE (HARD GATE):
//   For qtv, qwfwd, qwcl -- asserts fraction of entries with a non-empty
//   category >= 0.95, AND asserts _meta.snapshot_version === frozen version.
//   Exit code 1 if any cvar check fails.
//
// PART 2 -- COMMAND COVERAGE (REPORTED, NOT GATED):
//   For every *-command.json in apps/docs-web/data/ -- prints fraction of
//   entries with a non-empty category. Informational only; never affects exit
//   code. A genuinely-empty command category degrades to uncategorized per
//   D11/F5 and is not a Phase 1 failure.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');
const DOCS_DATA_DIR = join(MONOREPO_ROOT, 'apps', 'docs-web', 'data');

// PART 1: the three (codebase, file, frozen-version) triples.
const CVAR_GATES = [
  { codebase: 'qtv',   file: 'qtv-cvar.json',   frozenVersion: '1.16-dev' },
  { codebase: 'qwfwd', file: 'qwfwd-cvar.json',  frozenVersion: '1.40-dev' },
  { codebase: 'qwcl',  file: 'qwcl-cvar.json',   frozenVersion: '2.33'     },
] as const;

const COVERAGE_THRESHOLD = 0.95;

interface DocsEntry {
  category?: string;
  [key: string]: unknown;
}

interface DocsFile {
  _meta: {
    snapshot_version: string;
    [key: string]: unknown;
  };
  entries: DocsEntry[];
  [key: string]: unknown;
}

function readDocsFile(filePath: string): DocsFile {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as DocsFile;
}

function categoryFraction(entries: DocsEntry[]): { covered: number; total: number; fraction: number } {
  const total = entries.length;
  const covered = entries.filter(
    (e) => typeof e.category === 'string' && e.category.trim().length > 0
  ).length;
  return { covered, total, fraction: total > 0 ? covered / total : 0 };
}

function formatFraction(covered: number, total: number, fraction: number): string {
  return `${covered}/${total} = ${(fraction * 100).toFixed(1)}%`;
}

if (import.meta.main) {
  console.log('--- docs-probe-category-coverage ---');
  console.log('');

  // ----------------------------------------------------------------
  // PART 1: cvar coverage hard gate
  // ----------------------------------------------------------------
  console.log('PART 1 -- CVAR COVERAGE (hard gate, threshold >= 95%)');
  console.log('');

  let anyCvarBelowThreshold = false;
  let anyWrongSnapshotVersion = false;

  for (const gate of CVAR_GATES) {
    const filePath = join(DOCS_DATA_DIR, gate.file);
    const doc = readDocsFile(filePath);
    const { covered, total, fraction } = categoryFraction(doc.entries);
    const fractionStr = formatFraction(covered, total, fraction);

    const coveragePass = fraction >= COVERAGE_THRESHOLD;
    const versionPass = doc._meta.snapshot_version === gate.frozenVersion;

    const coverageLabel = coveragePass ? 'PASS' : 'FAIL';
    const versionLabel = versionPass ? 'PASS' : 'FAIL';

    console.log(`  ${gate.codebase} (${gate.file})`);
    console.log(`    coverage : [${coverageLabel}]  ${fractionStr}`);
    console.log(
      `    version  : [${versionLabel}]  got "${doc._meta.snapshot_version}" / expected "${gate.frozenVersion}"`
    );
    console.log('');

    if (!coveragePass) anyCvarBelowThreshold = true;
    if (!versionPass) anyWrongSnapshotVersion = true;
  }

  // ----------------------------------------------------------------
  // PART 2: command coverage (informational, no gate)
  // ----------------------------------------------------------------
  console.log('PART 2 -- COMMAND COVERAGE (informational, not gated)');
  console.log('');

  const commandFiles = readdirSync(DOCS_DATA_DIR)
    .filter((f) => f.endsWith('-command.json'))
    .sort();

  if (commandFiles.length === 0) {
    console.log('  (no *-command.json files found)');
  } else {
    for (const fname of commandFiles) {
      const filePath = join(DOCS_DATA_DIR, fname);
      const doc = readDocsFile(filePath);
      const { covered, total, fraction } = categoryFraction(doc.entries);
      const fractionStr = formatFraction(covered, total, fraction);
      console.log(`  ${fname.padEnd(30)} ${fractionStr}`);
    }
  }
  console.log('');

  // ----------------------------------------------------------------
  // Final verdict
  // ----------------------------------------------------------------
  const gateFailed = anyCvarBelowThreshold || anyWrongSnapshotVersion;

  if (gateFailed) {
    if (anyCvarBelowThreshold) {
      console.log(
        'CATEGORY COVERAGE FAIL -- at least one codebase is below the 95% threshold.'
      );
      console.log('  Recovery: confirm DOCS_CODEBASES[*].version uses the frozen version');
      console.log('  (qtv=1.16-dev, qwfwd=1.40-dev, qwcl=2.33) and re-run the emitter.');
    }
    if (anyWrongSnapshotVersion) {
      console.log('VERSION CHECK FAIL -- at least one _meta.snapshot_version does not match.');
      console.log('  Recovery: confirm the emitter writes the frozen version into _meta, not "head".');
    }
    process.exitCode = 1;
  } else {
    console.log('CATEGORY COVERAGE OK');
    process.exitCode = 0;
  }
}
