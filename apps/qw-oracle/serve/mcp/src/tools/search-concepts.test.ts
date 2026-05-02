// apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts
//
// Integration test. Requires (a) qw_oracle_test populated with at least one
// concept + matching chunk, and (b) VOYAGE_API_KEY for the per-query embedding
// leg. The lexical-only degraded path is exercised by the second test (no
// API key).
//
// The phase 6 executor seeds a minimal concept + chunk into qw_oracle_test
// here so the tests can run without depending on a full load-concepts run
// against the test DB. Per D13 (each test file owns its setup) this beforeAll
// is idempotent and TRUNCATEs only the L3 tables it touches.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { db } from '../db.ts';
import { searchConcepts } from './search-concepts.ts';

const HAS_KEY = !!process.env.VOYAGE_API_KEY;
const HAS_DB = !!process.env.DATABASE_URL;

const SEED_SLUG = 'phase6-search-concepts-fixture';

describe.skipIf(!HAS_DB)('searchConcepts', () => {
  beforeAll(async () => {
    await db`DELETE FROM concept_chunks WHERE concept_slug = ${SEED_SLUG}`;
    await db`DELETE FROM concept_concepts WHERE source_slug = ${SEED_SLUG} OR target_slug = ${SEED_SLUG}`;
    await db`DELETE FROM concept_entities WHERE concept_slug = ${SEED_SLUG}`;
    await db`DELETE FROM concepts WHERE slug = ${SEED_SLUG}`;
    await db`
      INSERT INTO concepts (slug, title, summary, body, frontmatter, body_sha256)
      VALUES (
        ${SEED_SLUG},
        'Phase 6 fixture: weapon scripts and screen wobble',
        'Test fixture covering screen-wobble and weapon-script topics.',
        'Body text covering cl_bob screen wobble and weapon-switching scripts.',
        ${db.json({ slug: SEED_SLUG, title: 'fixture' })},
        'fixture-sha'
      )
    `;
    await db`
      INSERT INTO concept_chunks (concept_slug, chunk_index, text, text_sha256)
      VALUES (
        ${SEED_SLUG}, 0,
        'Screen wobble in QuakeWorld is controlled by cl_bob, cl_bobcycle, and cl_bobup; weapon switching scripts often combine bind aliases with priority chains.',
        'fixture-chunk-sha'
      )
    `;
  });

  afterAll(async () => {
    await db`DELETE FROM concept_chunks WHERE concept_slug = ${SEED_SLUG}`;
    await db`DELETE FROM concept_concepts WHERE source_slug = ${SEED_SLUG} OR target_slug = ${SEED_SLUG}`;
    await db`DELETE FROM concept_entities WHERE concept_slug = ${SEED_SLUG}`;
    await db`DELETE FROM concepts WHERE slug = ${SEED_SLUG}`;
  });

  test('finds the seeded fixture from a vague query', async () => {
    const result = await searchConcepts({ query: 'screen wobble bob' });
    expect(result.results.length).toBeGreaterThan(0);
    const slugs = result.results.map((r) => r.slug);
    expect(slugs).toContain(SEED_SLUG);
  });

  test('returns match_quality none/weak for genuinely out-of-corpus queries', async () => {
    const result = await searchConcepts({ query: 'how to deploy kubernetes to mars' });
    expect(['weak', 'none']).toContain(result.match_quality);
  });

  test.skipIf(HAS_KEY)('lexical-only degraded path runs without VOYAGE_API_KEY', async () => {
    const result = await searchConcepts({ query: 'crosshair' });
    expect(result).toBeDefined();
  });
});
