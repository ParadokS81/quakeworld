// apps/qw-oracle/scripts/load-concepts/upsert.test.ts
//
// Integration test: hits qw_oracle_test (per decisions.md D13). Refuses to run
// against a non-test DB to prevent an accidental `bun test` from clobbering
// dev data.

import { describe, expect, test, beforeEach, afterAll } from 'bun:test';
import { db } from '../../shared/db.ts';
import { upsertConcept } from './upsert.ts';
import type { ParsedConcept, ChunkWithHash } from './parse.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run upsert.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url ?? '<unset>'}`,
  );
}

const SLUG = 'phase4-test-note';

function makeSample(overrides: Partial<ParsedConcept> = {}): ParsedConcept {
  const chunk: ChunkWithHash = {
    index: 0,
    text: '## A\nbody',
    sha256: 'a'.repeat(64),
  };
  return {
    slug: SLUG,
    title: 'Phase 4 test',
    summary: 'A test note.',
    body: '## A\nbody',
    bodySha256: 'b'.repeat(64),
    shape: 'domain-walkthrough',
    frontmatter: {
      slug: SLUG,
      summary: 'A test note.',
      title: 'Phase 4 test',
      shape: 'domain-walkthrough',
      primary_contributors: ['@operator'],
    },
    relatedEntities: ['ezquake:cvar:cl_bob'],
    externalRefs: ['ezquake:commit:abc123'],
    relatedConcepts: ['weapon-scripts'],
    chunks: [chunk],
    ...overrides,
  };
}

describe('upsertConcept', () => {
  beforeEach(async () => {
    await db`DELETE FROM concepts WHERE slug = ${SLUG}`;
  });
  afterAll(async () => {
    await db`DELETE FROM concepts WHERE slug = ${SLUG}`;
  });

  test('inserts a new concept with chunks, entity-graph, concept-graph rows', async () => {
    await upsertConcept(makeSample());
    const c = await db`SELECT * FROM concepts WHERE slug = ${SLUG}`;
    expect(c.length).toBe(1);
    expect((c[0] as { title: string }).title).toBe('Phase 4 test');

    const chunks = await db`SELECT * FROM concept_chunks WHERE concept_slug = ${SLUG}`;
    expect(chunks.length).toBe(1);
    expect((chunks[0] as { embedding: unknown }).embedding).toBeNull();
    expect((chunks[0] as { embedding_stale: boolean }).embedding_stale).toBe(false);

    const entities = await db`SELECT * FROM concept_entities WHERE concept_slug = ${SLUG}`;
    expect(entities.length).toBe(1);
    expect((entities[0] as { entity_canonical_id: string }).entity_canonical_id).toBe('ezquake:cvar:cl_bob');

    const sibling = await db`SELECT * FROM concept_concepts WHERE source_slug = ${SLUG}`;
    expect(sibling.length).toBe(1);
    expect((sibling[0] as { target_slug: string }).target_slug).toBe('weapon-scripts');
  });

  test('preserves external refs in concepts.frontmatter JSONB (not in concept_entities)', async () => {
    await upsertConcept(makeSample());
    const fm = (await db`SELECT frontmatter FROM concepts WHERE slug = ${SLUG}`)[0] as { frontmatter: Record<string, unknown> };
    expect(fm.frontmatter.primary_contributors).toEqual(['@operator']);
    const entityRows = await db`
      SELECT entity_canonical_id FROM concept_entities WHERE concept_slug = ${SLUG}
    `;
    const ids = entityRows.map((r) => (r as { entity_canonical_id: string }).entity_canonical_id);
    expect(ids).not.toContain('ezquake:commit:abc123');
  });

  test('skips chunk rewrite when body_sha256 unchanged on second call', async () => {
    const sample = makeSample();
    const first = await upsertConcept(sample);
    expect(first.chunksRewritten).toBe(true);

    const second = await upsertConcept(sample);
    expect(second.chunksRewritten).toBe(false);
    const chunks = await db`SELECT * FROM concept_chunks WHERE concept_slug = ${SLUG}`;
    expect(chunks.length).toBe(1);
  });

  test('rewrites chunks when body_sha256 changes', async () => {
    await upsertConcept(makeSample());
    const changed = makeSample({
      bodySha256: 'c'.repeat(64),
      body: '## A\nbody\n\n## B\nmore',
      chunks: [
        { index: 0, text: '## A\nbody', sha256: 'a'.repeat(64) },
        { index: 1, text: '## B\nmore', sha256: 'd'.repeat(64) },
      ],
    });
    const result = await upsertConcept(changed);
    expect(result.chunksRewritten).toBe(true);
    const chunks = await db`SELECT * FROM concept_chunks WHERE concept_slug = ${SLUG} ORDER BY chunk_index`;
    expect(chunks.length).toBe(2);
  });

  test('rebuilds graph rows on every call (rebuild always - drift-proof)', async () => {
    await upsertConcept(makeSample());
    // Second call drops one entity ref:
    const changed = makeSample({ relatedEntities: [] });
    await upsertConcept(changed);
    const entities = await db`SELECT * FROM concept_entities WHERE concept_slug = ${SLUG}`;
    expect(entities.length).toBe(0);
  });
});
