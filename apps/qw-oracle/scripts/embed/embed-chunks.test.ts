// apps/qw-oracle/scripts/embed/embed-chunks.test.ts
//
// Integration test against qw_oracle_test + the real Voyage API. Same
// gating as embed-entities.test.ts. Seeds a synthetic concept + one chunk,
// runs embedConceptChunks(), verifies vector + log effects, runs again to
// confirm idempotency.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { embedConceptChunks } from './embed-chunks.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run embed-chunks.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const HAS_KEY = !!process.env.VOYAGE_API_KEY;
const sql = postgres(url, { onnotice: () => {} });

const TEST_SLUG = '_phase5_test_concept';

describe.skipIf(!HAS_KEY)('embedConceptChunks', () => {
  beforeAll(async () => {
    // ON DELETE CASCADE on concept_chunks (per Phase 4 migration) cleans up
    // chunks when the concept goes; we rely on that here.
    await sql`DELETE FROM concepts WHERE slug = ${TEST_SLUG}`;
    await sql`
      INSERT INTO concepts (slug, title, summary, body, frontmatter, body_sha256)
      VALUES (
        ${TEST_SLUG},
        'Phase 5 test concept',
        'Phase 5 embedding pipeline test concept',
        'rocket jump teleport quad damage',
        '{}'::jsonb,
        'deadbeef'
      )
    `;
    await sql`
      INSERT INTO concept_chunks (concept_slug, chunk_index, text, text_sha256)
      VALUES (
        ${TEST_SLUG}, 0,
        'rocket jump teleport quad damage',
        'cafef00d'
      )
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM concepts WHERE slug = ${TEST_SLUG}`;
    await sql.end();
  });

  test('first run embeds the seeded chunk', async () => {
    const result = await embedConceptChunks();
    expect(result.embedded).toBeGreaterThanOrEqual(1);

    const rows = await sql<{ embedding: unknown; stale: boolean }[]>`
      SELECT embedding, embedding_stale AS stale
      FROM concept_chunks
      WHERE concept_slug = ${TEST_SLUG} AND chunk_index = 0
    `;
    expect(rows[0]!.embedding).not.toBeNull();
    expect(rows[0]!.stale).toBe(false);
  });

  test('embedding_api_log carries a loader row from the run', async () => {
    const rows = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM embedding_api_log WHERE source = 'loader'
    `;
    expect(rows[0]!.c).toBeGreaterThanOrEqual(1);
  });

  test('second run is a no-op (no stale or NULL chunks)', async () => {
    const result = await embedConceptChunks();
    expect(result.embedded).toBe(0);
  });

  test('manually flagging stale forces a re-embed', async () => {
    await sql`
      UPDATE concept_chunks SET embedding_stale = TRUE
      WHERE concept_slug = ${TEST_SLUG}
    `;
    const result = await embedConceptChunks();
    expect(result.embedded).toBeGreaterThanOrEqual(1);
  });
});
