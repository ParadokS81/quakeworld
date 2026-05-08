// apps/qw-oracle/scripts/load-knowledge/migration-probes.ts
//
// Universal per-migration validation probe runner. Dispatches probe
// functions from db/migration-probes.ts registry. Each probe asserts
// the invariants introduced by its migration (table/column/index
// existence, CHECK reachability, seed values). Migrations are GLOBAL
// (not per-project), so there is no --project flag; --migration NNN
// filters to a single probe by 3-digit prefix (e.g. 009 or 9).
//
// Per docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/
// decisions.md:
//   D2  -- CI-readiness conventions (--migration / --json / --help,
//           env-var driven DATABASE_URL, exit 0 PASS / non-zero FAIL).
//   D3  -- No per-project config (migrations are global; n/a).
//   D4  -- Dispatcher case mirrors quality-grid pattern.
//   D6  -- Phase commit body captures audit findings.
//   D12 -- JSONB binding: probe sentinel inserts pass JS values
//           directly; never JSON.stringify(...) to TEXT.
//
// Run:
//   bun run load-knowledge -- migration-probes
//   bun run load-knowledge -- migration-probes --migration 009
//   bun run load-knowledge -- migration-probes --json
//   bun run load-knowledge -- migration-probes --help

import { parseArgs } from 'util';
import type postgres from 'postgres';
import { sql } from './db.js';
import {
  MIGRATION_PROBES,
  type MigrationProbeResult,
  type MigrationProbeFn,
} from '../../db/migration-probes.js';

export type { MigrationProbeResult, MigrationProbeFn };

export async function runMigrationProbes(opts: {
  sql: postgres.Sql;
  migration?: string;
}): Promise<MigrationProbeResult[]> {
  const names = Object.keys(MIGRATION_PROBES);
  let targets: string[];
  if (opts.migration !== undefined) {
    const padded = opts.migration.padStart(3, '0');
    targets = names.filter((k) => k.startsWith(padded + '_'));
    if (targets.length === 0) {
      throw new Error(
        `no probe found for --migration ${opts.migration}; ` +
        `expected a key starting with '${padded}_' in the registry`,
      );
    }
  } else {
    targets = names;
  }
  const results: MigrationProbeResult[] = [];
  for (const name of targets) {
    process.stderr.write(`[migration-probes] ${name}...\n`);
    const probe = MIGRATION_PROBES[name]!;
    const result = await probe(opts.sql);
    results.push(result);
  }
  return results;
}

function formatJson(results: MigrationProbeResult[]): string {
  return JSON.stringify(results, null, 2);
}

function formatText(results: MigrationProbeResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`=== ${r.migration}: ${r.status} ===`);
    for (const f of r.findings) {
      lines.push(`  FAIL: ${f}`);
    }
  }
  return lines.join('\n');
}

function printHelp(): void {
  process.stderr.write(`
load-knowledge -- migration-probes [options]

Assert each migration's invariants (table/column/index existence,
CHECK reachability, seed values). Migrations are GLOBAL; no --project flag.

Options:
  --migration <NNN>  Run probe for a single migration by 3-digit prefix
                     (e.g. --migration 009 or --migration 9). Omit to
                     run all 12 probes.
  --json             Emit JSON-formatted results to stdout.
  --help             Print this help and exit.

Exit codes:
  0   all targeted probes PASS, OR --help requested.
  1   one or more probes FAIL; review output for findings.
  2   invalid --migration prefix (no matching probe in registry).

Required env: DATABASE_URL
  (default postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle)
`.trim() + '\n');
}

export async function runMigrationProbesCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      migration: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // D2: fail early with a clear message rather than a postgres connection error
  if (!process.env.DATABASE_URL) {
    process.stderr.write('ERROR: DATABASE_URL is not set\n');
    process.exit(1);
  }

  let results: MigrationProbeResult[];
  try {
    results = await runMigrationProbes({ sql, migration: values.migration });
  } catch (e) {
    process.stderr.write((e instanceof Error ? e.message : String(e)) + '\n');
    process.exit(2);
  }

  if (values.json) {
    process.stdout.write(formatJson(results) + '\n');
  } else {
    process.stdout.write(formatText(results) + '\n');
  }

  const failed = results.some((r) => r.status === 'FAIL');
  process.exitCode = failed ? 1 : 0;
}
