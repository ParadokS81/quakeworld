// apps/qw-oracle/scripts/embed/embed-entities.test.ts
//
// Integration test against qw_oracle_test + the real Voyage API. Skipped
// unless VOYAGE_API_KEY is set; refuses to run against any DB other than
// qw_oracle_test (D13). Seeds a tiny entity row, runs embedEntitiesPass(),
// verifies the vector + sha + log + metadata effects, then runs again to
// confirm the hash-skip path is a no-op.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { embedEntitiesPass } from './embed-entities.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run embed-entities.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const HAS_KEY = !!process.env.VOYAGE_API_KEY;
const sql = postgres(url, { onnotice: () => {} });

const TEST_CANONICAL_ID = 'ezquake:cvar:_phase5_test_cvar';

describe.skipIf(!HAS_KEY)('embedEntitiesPass', () => {
  beforeAll(async () => {
    // Wipe Phase 5 test residue and seed one entity with a known description.
    // We do not TRUNCATE entities globally because Phase 2's loader test set
    // may have populated the table; targeted DELETE keeps us hermetic.
    await sql`DELETE FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}`;
    await sql`
      INSERT INTO entities (
        project, type, name, canonical_id,
        first_seen_version, last_seen_version,
        source_state, description, created_at, updated_at
      ) VALUES (
        'ezquake', 'cvar', '_phase5_test_cvar', ${TEST_CANONICAL_ID},
        'head', 'head',
        'source_backed', 'Phase 5 embedding pipeline test - rocket jump teleport',
        now(), now()
      )
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}`;
    await sql.end();
  });

  test('first run embeds the seeded row and writes back vector + sha', async () => {
    const before = await sql<{ embedding: unknown; sha: string | null }[]>`
      SELECT description_embedding AS embedding, description_embedding_sha256 AS sha
      FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}
    `;
    expect(before[0]!.embedding).toBeNull();
    expect(before[0]!.sha).toBeNull();

    const result = await embedEntitiesPass();
    expect(result.embedded).toBeGreaterThanOrEqual(1);

    const after = await sql<{ embedding: unknown; sha: string | null }[]>`
      SELECT description_embedding AS embedding, description_embedding_sha256 AS sha
      FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}
    `;
    expect(after[0]!.embedding).not.toBeNull();
    expect(after[0]!.sha).not.toBeNull();
    expect(after[0]!.sha!.length).toBe(64);
  });

  test('embedding_metadata is upserted to dimension=1024', async () => {
    const rows = await sql<{ dimension: number; rows_embedded: number }[]>`
      SELECT dimension, rows_embedded FROM embedding_metadata WHERE id = 1
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]!.dimension).toBe(1024);
    expect(rows[0]!.rows_embedded).toBeGreaterThanOrEqual(1);
  });

  test('embedding_api_log has at least one loader-source row', async () => {
    const rows = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM embedding_api_log WHERE source = 'loader'
    `;
    expect(rows[0]!.c).toBeGreaterThanOrEqual(1);
  });

  test('second run is a no-op via hash skip', async () => {
    const result = await embedEntitiesPass();
    expect(result.embedded).toBe(0);
  });
});
