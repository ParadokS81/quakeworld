// apps/qw-oracle/db/migrate.ts
//
// Hand-rolled migrator. SQL files in db/migrations/ run in lexicographic
// order, each in its own transaction, tracked in schema_migrations by sha256.
// Append-only by design: editing an already-applied migration is rejected.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

export async function runMigrations(sql: postgres.Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      sha256      TEXT NOT NULL
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const filename of files) {
    const path = resolve(MIGRATIONS_DIR, filename);
    const text = readFileSync(path, 'utf8');
    const sha = await sha256(text);

    const existing = await sql<{ sha256: string }[]>`
      SELECT sha256 FROM schema_migrations WHERE filename = ${filename}
    `;
    if (existing.length > 0) {
      if (existing[0]!.sha256 !== sha) {
        throw new Error(
          `Migration ${filename} was modified after it was applied. ` +
          `Migrations are append-only; create a new migration file instead of editing this one.`,
        );
      }
      continue;
    }

    console.log(`[migrate] applying ${filename}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations(filename, sha256) VALUES (${filename}, ${sha})`;
    });
    applied += 1;
  }
  console.log(`[migrate] up-to-date (${files.length} migration(s) total, ${applied} newly applied)`);
}

export async function resetDb(sql: postgres.Sql): Promise<void> {
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  // Migration 008 creates the `community` schema (community.players etc.).
  // resetDb must drop it too -- otherwise a re-run reaches 008's
  // CREATE TABLE community.players on a surviving table ("already exists"),
  // which aborts mid-suite and corrupts the shared public schema for the
  // remaining test files. community is rebuilt by 008's CREATE SCHEMA IF NOT EXISTS.
  await sql`DROP SCHEMA IF EXISTS community CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO public`;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(url, { onnotice: () => {} });
  try {
    if (process.argv.includes('--reset')) {
      console.log('[migrate] resetting public schema');
      await resetDb(sql);
    }
    await runMigrations(sql);
  } finally {
    await sql.end();
  }
}
