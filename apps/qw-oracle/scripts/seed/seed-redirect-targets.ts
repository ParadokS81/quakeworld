#!/usr/bin/env bun
// apps/qw-oracle/scripts/seed/seed-redirect-targets.ts
//
// One-shot seed apply for db/seeds/redirect_targets.sql. Idempotent (the SQL
// file uses ON CONFLICT). Run via: bun scripts/seed/seed-redirect-targets.ts
// (or the package.json script `bun run seed:redirect-targets`).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = resolve(__dirname, '..', '..', 'db', 'seeds', 'redirect_targets.sql');

async function main(): Promise<void> {
  const sql = readFileSync(SQL_PATH, 'utf8');
  await db.unsafe(sql);
  const rows = await db<{ topic: string }[]>`SELECT topic FROM redirect_targets ORDER BY topic`;
  console.error(`[seed] redirect_targets: ${rows.length} rows`);
  for (const r of rows) console.error(`  - ${r.topic}`);
  await closeDb();
}

if (import.meta.main) {
  await main();
}
