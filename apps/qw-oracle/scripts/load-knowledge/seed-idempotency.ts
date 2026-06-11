// apps/qw-oracle/scripts/load-knowledge/seed-idempotency.ts
//
// Seed double-load idempotency probe. Loads a gameplay seed YAML twice and
// asserts identical row counts + identical ordered-row content hash. The
// ordered dump approach (SELECT with explicit column list + ORDER BY) avoids
// the volatile-column strip needed by the generic idempotency.ts probe,
// because gameplay tables have no updated_at / extracted_at / embedding cols.
//
// Run:
//   bun scripts/load-knowledge/seed-idempotency.ts --yaml <path>
//   bun scripts/load-knowledge/seed-idempotency.ts --yaml <path> --json
//   bun scripts/load-knowledge/seed-idempotency.ts --help

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'util';
import * as yaml from 'js-yaml';
import type postgres from 'postgres';
import { loadGameplayFromFile } from './load-gameplay.js';

// Minimal interface -- only the field we need to scope the snapshot queries.
interface SeedHeader {
  gameplay_source: { id: string };
}

// Ordered dump of all gameplay rows for a given source. The SELECT column
// list is explicit so JSON.stringify key order is deterministic regardless of
// Postgres column order evolution. ORDER BY (kind, name, ruleset_gate_json::text)
// matches the unique index key shape, giving a stable sort across runs.
async function dumpEntityRows(sql: postgres.Sql, sourceId: string): Promise<string[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT kind, name, classname, damage, splash_damage, splash_radius, refire_seconds,
           respawn_seconds, pickup_amount, max_carry, duration_seconds, ruleset_gate_json,
           source_ref, props_json, notes
    FROM gameplay_entity_defs
    WHERE gameplay_source_id = ${sourceId}
    ORDER BY kind, name, ruleset_gate_json::text
  `;
  return rows.map((r) => JSON.stringify(r));
}

async function dumpMechanicRows(sql: postgres.Sql, sourceId: string): Promise<string[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT kind, name, value_numeric, value_text, ruleset_gate_json,
           source_ref, props_json, notes
    FROM gameplay_mechanics
    WHERE gameplay_source_id = ${sourceId}
    ORDER BY kind, name, ruleset_gate_json::text
  `;
  return rows.map((r) => JSON.stringify(r));
}

// Concatenate all serialised rows (entities first, then mechanics) separated
// by newlines and SHA-256 hash the result. An empty seed yields a stable hash
// of an empty string, which is acceptable -- two consecutive empty hashes still
// satisfy pass=true.
function hashSnapshot(entityLines: string[], mechanicLines: string[]): string {
  const combined = [...entityLines, ...mechanicLines].join('\n');
  return createHash('sha256').update(combined).digest('hex');
}

export interface SeedIdempotencyResult {
  pass: boolean;
  first: { entities: number; mechanics: number };
  second: { entities: number; mechanics: number };
  hashFirst: string;
  hashSecond: string;
}

export async function checkSeedIdempotency(
  sql: postgres.Sql,
  yamlPath: string,
): Promise<SeedIdempotencyResult> {
  // Read source ID from the YAML header -- needed to scope the snapshot queries
  // without re-exporting internals from load-gameplay.ts.
  const raw = readFileSync(yamlPath, 'utf-8');
  const seed = yaml.load(raw) as SeedHeader;
  const sourceId = seed.gameplay_source.id;

  // First load.
  const firstResult = await loadGameplayFromFile(sql, yamlPath);

  const firstEntityLines = await dumpEntityRows(sql, sourceId);
  const firstMechanicLines = await dumpMechanicRows(sql, sourceId);
  const hashFirst = hashSnapshot(firstEntityLines, firstMechanicLines);

  // Second load -- must produce identical row state (idempotency).
  const secondResult = await loadGameplayFromFile(sql, yamlPath);

  const secondEntityLines = await dumpEntityRows(sql, sourceId);
  const secondMechanicLines = await dumpMechanicRows(sql, sourceId);
  const hashSecond = hashSnapshot(secondEntityLines, secondMechanicLines);

  const pass =
    firstResult.total.entities === secondResult.total.entities &&
    firstResult.total.mechanics === secondResult.total.mechanics &&
    hashFirst === hashSecond;

  return {
    pass,
    first: { entities: firstResult.total.entities, mechanics: firstResult.total.mechanics },
    second: { entities: secondResult.total.entities, mechanics: secondResult.total.mechanics },
    hashFirst,
    hashSecond,
  };
}

function printHelp(): void {
  process.stderr.write(`
seed-idempotency -- load a seed YAML twice and assert stable counts + content hash.

Options:
  --yaml <path>   Path to the seed YAML file (required).
  --json          Emit JSON-formatted result to stdout.
  --help          Print this help and exit.

Exit codes:
  0   pass=true (both loads produced identical counts and content hash).
  1   pass=false (counts or content diverged; loader is not idempotent).
  2   invalid arguments.

Required env: DATABASE_URL (default postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle).
`.trim() + '\n');
}

export async function runSeedIdempotencyCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      yaml: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (!values.yaml) {
    process.stderr.write('--yaml <path> is required.\n');
    printHelp();
    process.exit(2);
  }

  // Import sql lazily so the module is safe to import without a DB connection
  // when the caller only needs checkSeedIdempotency with an injected sql.
  const { sql } = await import('./db.js');

  const result = await checkSeedIdempotency(sql, values.yaml);

  if (values.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(
      `seed-idempotency: pass=${result.pass}` +
      ` first.entities=${result.first.entities}` +
      ` first.mechanics=${result.first.mechanics}` +
      ` second.entities=${result.second.entities}` +
      ` second.mechanics=${result.second.mechanics}` +
      ` hashFirst=${result.hashFirst}` +
      ` hashSecond=${result.hashSecond}\n`,
    );
  }

  process.exitCode = result.pass ? 0 : 1;
}

if (import.meta.main) {
  runSeedIdempotencyCli(process.argv.slice(2)).catch((err: unknown) => {
    process.stderr.write(`seed-idempotency: fatal: ${String(err)}\n`);
    process.exitCode = 1;
  });
}
