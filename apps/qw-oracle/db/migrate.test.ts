// apps/qw-oracle/db/migrate.test.ts
//
// Integration test against the qw_oracle_test database (per decisions.md D13).
// Refuses to run unless DATABASE_URL is the test DB - this prevents an
// accidental `bun test` from wiping the dev DB.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations, resetDb } from './migrate.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run migrate.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

describe('migrator', () => {
  const sql = postgres(url, { onnotice: () => {} });

  beforeAll(async () => { await resetDb(sql); });
  afterAll(async () => { await sql.end(); });

  test('first run applies 001_init and records it in schema_migrations', async () => {
    await runMigrations(sql);
    const rows = await sql<{ filename: string }[]>`
      SELECT filename FROM schema_migrations ORDER BY applied_at
    `;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.filename).toBe('001_init.sql');
  });

  test('vector extension is installed', async () => {
    const rows = await sql<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(rows.length).toBe(1);
  });

  test('oracle_meta seeded with schema_version', async () => {
    const rows = await sql<{ value: string }[]>`
      SELECT value FROM oracle_meta WHERE key = 'schema_version'
    `;
    expect(rows[0]!.value).toBe('18');
  });

  test('embedding_metadata table exists and accepts the singleton row', async () => {
    await sql`
      INSERT INTO embedding_metadata (id, model_name, model_version, dimension)
      VALUES (1, 'voyage-4-large', 'arc1-bootstrap', 1024)
      ON CONFLICT (id) DO NOTHING
    `;
    const rows = await sql<{ dimension: number }[]>`
      SELECT dimension FROM embedding_metadata WHERE id = 1
    `;
    expect(rows[0]!.dimension).toBe(1024);
  });

  test('re-running migrations is idempotent', async () => {
    const before = (await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM schema_migrations`)[0]!.c;
    await runMigrations(sql);
    await runMigrations(sql);
    const after = (await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM schema_migrations`)[0]!.c;
    expect(after).toBe(before);
  });
});
