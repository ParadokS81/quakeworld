// apps/qw-oracle/shared/db.test.ts
//
// Integration test - runs against qw_oracle_test (set by the npm test script).
import { describe, expect, test, afterAll } from 'bun:test';
import { db, closeDb } from './db.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run shared/db.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url ?? '<unset>'}`,
  );
}

describe('shared db client', () => {
  afterAll(async () => { await closeDb(); });

  test('connects and runs a trivial query', async () => {
    const rows = await db<{ one: number }[]>`SELECT 1::int AS one`;
    expect(rows[0]!.one).toBe(1);
  });

  test('vector extension is reachable via the shared client', async () => {
    const rows = await db<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(rows.length).toBe(1);
  });
});
