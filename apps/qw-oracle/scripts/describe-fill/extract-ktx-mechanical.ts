// apps/qw-oracle/scripts/describe-fill/extract-ktx-mechanical.ts
//
// Phase-2 idempotency + coverage driver for the KTX describe-fill arc.
//
// Wraps the three-step pipeline (extract -> load -> report) and provides
// two gated modes:
//
//   --twice        Run extract+load twice, fingerprint both snapshots, assert
//                  IDENTICAL=YES (the phase-boundary idempotency proof).
//                  Exit non-zero on IDENTICAL=NO.
//
//   --report-only  Skip extract+load; re-derive the coverage report from
//                  current DB state (useful when the pipeline already ran and
//                  the report needs to be re-printed without re-extracting).
//
//   (default)      Run extract+load once, then emit the coverage report.
//
// WHY this file is glue, not logic: Tasks 1-3 (extractor / loader / probes)
// are verified-correct and closed. This driver asserts their observable outputs
// meet the Phase-2 boundary contracts (F-C1a, C1, C2/C3, D8, D19/C4) without
// re-implementing any extractor or loader internals. All hard logic delegates
// to subprocess invocations of the shipped commands or direct SQL queries.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, closeSql } from '../load-knowledge/db.js';

// ---------------------------------------------------------------------------
// Path anchors
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

// 2 levels up: describe-fill -> scripts -> qw-oracle
const QW_ORACLE_DIR = join(__dirname, '..', '..');

const OUTPUT_DIR = join(QW_ORACLE_DIR, 'output', 'describe-fill');
const REPORT_PATH = join(OUTPUT_DIR, 'ktx-mechanical-report.txt');

// WHY read the AST directly for re-derivation: --report-only skips extract+load
// so there is no loader stdout to parse. The AST file is the ground-truth source
// for config-drift names; querying it + DB resolves gives the same list the loader
// would have printed, without re-running any pipeline step.
const AST_PATH = join(
  QW_ORACLE_DIR,
  'scripts/extractors/ktx/output/ktx-shipped-config-ast.json',
);

// ---------------------------------------------------------------------------
// Pipeline steps (verified-correct commands -- use EXACTLY these)
// ---------------------------------------------------------------------------

// WHY stdout/stderr both to 'pipe': we want to capture the loader's stdout
// line for the C2/C3 unresolved list without printing mid-pipeline chatter
// to the terminal. We print it ourselves in the coverage report.

function runExtract(): void {
  // WHY python3 not python: WSL Ubuntu exposes python3, not a bare python symlink.
  execFileSync(
    'python3',
    ['scripts/extractors/ktx/extract.py', '--handlers', 'shipped_config'],
    { cwd: QW_ORACLE_DIR, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function runLoad(): string {
  // Returns combined stdout so the driver can extract the C2/C3 unresolved
  // line for the coverage report (the loader prints it to stdout).
  const out = execFileSync(
    'bun',
    ['scripts/load-knowledge/index.ts', 'load-ktx-shipped-config'],
    { cwd: QW_ORACLE_DIR, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return out;
}

// ---------------------------------------------------------------------------
// Fingerprint query (phase-MD locked -- do not alter)
// ---------------------------------------------------------------------------

async function fingerprint(): Promise<string> {
  const rows = await sql<{ fp: string | null }[]>`
    SELECT md5(string_agg(canonical_id || coalesce(description,'') || coalesce(description_origin,'') || coalesce(description_provenance::text,''), ',' ORDER BY canonical_id)) AS fp
    FROM entities
    WHERE project = 'ktx' AND type = 'cvar'
  `;
  return rows[0]?.fp ?? '';
}

// ---------------------------------------------------------------------------
// k_short_gib assertions (D19/C4 -- exit non-zero on any failure)
// ---------------------------------------------------------------------------

async function assertKShortGib(): Promise<string> {
  // Exactly ONE entity row.
  const rows = await sql<{
    canonical_id: string;
    description_origin: string | null;
    description_verdict: string | null;
    description_provenance_len: number;
  }[]>`
    SELECT
      canonical_id,
      description_origin,
      description_verdict,
      jsonb_array_length(description_provenance) AS description_provenance_len
    FROM entities
    WHERE canonical_id = 'ktx:cvar:k_short_gib'
  `;

  if (rows.length !== 1) {
    throw new Error(
      `k_short_gib assertion FAILED: expected exactly 1 row, got ${rows.length}`,
    );
  }

  const row = rows[0]!;

  // description_origin must be 'synthesized' (NOT regressed to shipped_doc).
  if (row.description_origin !== 'synthesized') {
    throw new Error(
      `k_short_gib assertion FAILED: description_origin='${row.description_origin}', expected 'synthesized'. ` +
        'Phase-1 terminal row may have been clobbered (F-D4a violation).',
    );
  }

  // description_provenance must have exactly 2 entries (Phase-1's 2 entries reproduced/untouched).
  if (row.description_provenance_len !== 2) {
    throw new Error(
      `k_short_gib assertion FAILED: jsonb_array_length(description_provenance)=${row.description_provenance_len}, ` +
        'expected 2. Phase-1 provenance entries may have been clobbered.',
    );
  }

  // Counted exactly once in the 'covered' set (has provenance, IS the synthesized row).
  // The coverage query counts separately; we verify description_provenance IS NOT NULL.
  const covRows = await sql<{ cnt: string }[]>`
    SELECT count(*)::text AS cnt
    FROM entities
    WHERE canonical_id = 'ktx:cvar:k_short_gib'
      AND description_provenance IS NOT NULL
      AND jsonb_array_length(description_provenance) >= 1
  `;
  const covCount = parseInt(covRows[0]?.cnt ?? '0', 10);
  if (covCount !== 1) {
    throw new Error(
      `k_short_gib assertion FAILED: counted ${covCount} times in covered set, expected 1.`,
    );
  }

  return 'k_short_gib: OK (synthesized, 2 provenance entries, 1 row, counted once)';
}

// ---------------------------------------------------------------------------
// Coverage report data queries (F-C1a / C1 -- denominator reconned live, never hardcoded)
// ---------------------------------------------------------------------------

interface CoverageData {
  m: number;                 // live denominator
  covered: number;           // has >=1 provenance entry
  shippedDoc: number;        // description_origin='shipped_doc'
  synthesized: number;       // description_origin='synthesized'
  residue: number;           // M - covered
  residueCvars: string[];    // canonical_ids with no provenance, ordered
  configDrift: Array<{ name: string; source_file: string; source_line: number }>;
  kShortGibStatus: string;
}

async function collectCoverageData(loaderStdout: string): Promise<CoverageData> {
  // M -- reconned live (F-C1a: never hardcode this value).
  const mRows = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM entities WHERE project = 'ktx' AND type = 'cvar'
  `;
  const m = parseInt(mRows[0]?.n ?? '0', 10);

  // Covered: has >=1 description_provenance entry.
  const covRows = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM entities
    WHERE project = 'ktx' AND type = 'cvar'
      AND description_provenance IS NOT NULL
      AND jsonb_array_length(description_provenance) >= 1
  `;
  const covered = parseInt(covRows[0]?.n ?? '0', 10);

  // Breakdown by origin.
  const sdRows = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM entities
    WHERE project = 'ktx' AND type = 'cvar'
      AND description_origin = 'shipped_doc'
  `;
  const shippedDoc = parseInt(sdRows[0]?.n ?? '0', 10);

  const synRows = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM entities
    WHERE project = 'ktx' AND type = 'cvar'
      AND description_origin = 'synthesized'
  `;
  const synthesized = parseInt(synRows[0]?.n ?? '0', 10);

  // Residue list -- enumerated fully (C1: never truncated, never importance-cut).
  const residueRows = await sql<{ canonical_id: string }[]>`
    SELECT canonical_id FROM entities
    WHERE project = 'ktx' AND type = 'cvar'
      AND (description_provenance IS NULL OR jsonb_array_length(description_provenance) < 1)
    ORDER BY canonical_id
  `;
  const residueCvars = residueRows.map((r) => r.canonical_id);

  // Config-drift unresolved list (C2/C3 -- collected, never created, never dropped).
  //
  // WHY always re-derive from the AST file + DB resolve: the loader stdout line is only
  // available when extract+load just ran in this process. For --report-only (no fresh
  // load) we have no loader stdout, so we use a single DB re-derivation code path for
  // both modes. Re-deriving from the AST JSON + DB name_fold lookup gives the exact
  // same list the loader would have emitted (AST records whose name does NOT
  // case-insensitively resolve to a live KTX cvar -- the "re-derive equivalently" path
  // from the spec, C2/C3). The unused `loaderStdout` parameter is kept for future
  // callers that may want to cross-check the parsed list against the re-derived one.
  const configDrift: Array<{ name: string; source_file: string; source_line: number }> = [];
  // Suppress unused-variable lint for the kept parameter.
  void loaderStdout;
  try {
    const ast = JSON.parse(readFileSync(AST_PATH, 'utf8')) as {
      records?: Array<{ name: string; source_file: string; source_line: number }>;
    };
    const allRecs = (ast.records ?? []).map((r) => ({
      name: r.name,
      source_file: r.source_file,
      source_line: r.source_line,
    }));
    // Batch-resolve: collect distinct lower(name) set, query once, then check each record.
    const distinctLower = [...new Set(allRecs.map((r) => r.name.toLowerCase()))];
    const resolvedRows = await sql<{ name_fold: string }[]>`
      SELECT name_fold FROM entities
      WHERE project = 'ktx' AND type = 'cvar'
        AND name_fold = ANY(${distinctLower})
    `;
    const resolvedSet = new Set(resolvedRows.map((r) => r.name_fold));
    for (const rec of allRecs) {
      if (!resolvedSet.has(rec.name.toLowerCase())) {
        configDrift.push(rec);
      }
    }
  } catch (err) {
    // AST not yet available (extraction hasn't run): configDrift stays empty.
    // Re-running --report-only after extraction will populate correctly.
    console.warn(`config-drift re-derivation skipped: ${String(err)}`);
  }

  const kShortGibStatus = await assertKShortGib();

  return {
    m,
    covered,
    shippedDoc,
    synthesized,
    residue: m - covered,
    residueCvars,
    configDrift,
    kShortGibStatus,
  };
}

// ---------------------------------------------------------------------------
// Coverage report renderer (ASCII; print to stdout AND write to file)
// ---------------------------------------------------------------------------

function buildReportText(d: CoverageData): string {
  const lines: string[] = [];

  lines.push('=== KTX describe-fill Phase-2 coverage report ===');
  lines.push('');

  // 1. M denominator -- reconned live (F-C1a / C1).
  lines.push(`M (POST-Phase-0 KTX-cvar, reconned live) = ${d.m}`);
  lines.push('');

  // 2. Coverage counts.
  lines.push('Coverage:');
  lines.push(`  covered (>=1 description_provenance entry) = ${d.covered}`);
  lines.push(`    of which shipped_doc = ${d.shippedDoc}`);
  lines.push(`    of which synthesized (Phase-1 k_short_gib) = ${d.synthesized}`);
  lines.push(`  residue (M - covered) = ${d.residue}  [tracked Phase-3 hand-off]`);
  lines.push('');

  // 3. Residue list -- ENUMERATED, never importance-cut (C1).
  // Annotate counts: k_fbskill_* (D8 bot/judgment), source_inline, description IS NULL.
  const fbskillCvars = d.residueCvars.filter((id) => id.startsWith('ktx:cvar:k_fbskill_'));
  const nonFbskill = d.residueCvars.filter((id) => !id.startsWith('ktx:cvar:k_fbskill_'));

  lines.push(`Residue list (${d.residueCvars.length} cvars, full enumeration -- no truncation, no importance-cut):`);
  lines.push(`  k_fbskill_* count = ${fbskillCvars.length}  [bot/judgment, D8 Phase-3 mechanism-only]`);
  lines.push(`  non-k_fbskill_* count = ${nonFbskill.length}`);
  lines.push('');

  // Print full residue list: k_fbskill_* first, then the rest, both alphabetically.
  for (const id of fbskillCvars) {
    lines.push(`  [k_fbskill_*] ${id}`);
  }
  for (const id of nonFbskill) {
    lines.push(`  ${id}`);
  }
  lines.push('');

  // 4. Config-drift unresolved list (C2/C3).
  lines.push(`Config-drift unresolved (C2/C3): ${d.configDrift.length} records`);
  if (d.configDrift.length === 0) {
    lines.push('  (none)');
  } else {
    for (const u of d.configDrift) {
      lines.push(`  ${u.name}@${u.source_file}:${u.source_line}`);
    }
  }
  lines.push('');

  // 5. k_short_gib idempotency assertion result.
  lines.push(`D19/C4 k_short_gib: ${d.kShortGibStatus}`);
  lines.push('');

  return lines.join('\n');
}

async function emitCoverageReport(loaderStdout: string): Promise<void> {
  const d = await collectCoverageData(loaderStdout);
  const text = buildReportText(d);

  // Print to stdout.
  process.stdout.write(text);

  // Write to file (F-D11b: output/describe-fill/ is gitignored -- regenerable projection).
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, text, 'utf-8');
  console.log(`report written: ${REPORT_PATH}`);
}

// ---------------------------------------------------------------------------
// --twice mode: idempotency proof
// ---------------------------------------------------------------------------

async function runTwice(): Promise<void> {
  console.log('--- Pass 1: extract + load ---');
  runExtract();
  const stdout1 = runLoad();
  process.stdout.write(stdout1);

  console.log('--- Fingerprint F1 ---');
  const f1 = await fingerprint();
  console.log(`F1 = ${f1}`);

  console.log('--- Pass 2: extract + load ---');
  runExtract();
  const stdout2 = runLoad();
  process.stdout.write(stdout2);

  console.log('--- Fingerprint F2 ---');
  const f2 = await fingerprint();
  console.log(`F2 = ${f2}`);

  const identical = f1 === f2;
  console.log('');
  console.log(`F1 md5: ${f1}`);
  console.log(`F2 md5: ${f2}`);
  console.log(`IDENTICAL=${identical ? 'YES' : 'NO'}`);

  if (!identical) {
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// main() -- flag dispatch
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const twiceMode = args.includes('--twice');
  const reportOnlyMode = args.includes('--report-only');

  try {
    if (twiceMode) {
      await runTwice();
    } else if (reportOnlyMode) {
      // Re-derive the C2/C3 drift list from the loader's last stdout. Since we
      // are skipping a fresh load, we query DB directly for the unresolved list.
      // WHY empty loaderStdout: --report-only skips extract+load entirely; the
      // config-drift section falls back to the DB query path (no loader stdout
      // to parse). This is correct for re-derivation without re-running the pipeline.
      await emitCoverageReport('');
    } else {
      // Default: one extract+load pass, then the coverage report.
      console.log('--- extract ---');
      runExtract();
      console.log('--- load ---');
      const loaderStdout = runLoad();
      process.stdout.write(loaderStdout);
      console.log('--- coverage report ---');
      await emitCoverageReport(loaderStdout);
    }
  } finally {
    await closeSql();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point (Bun P1 -- import.meta.main guard)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  main().catch((err) => {
    console.error('extract-ktx-mechanical error:', err);
    process.exit(1);
  });
}
