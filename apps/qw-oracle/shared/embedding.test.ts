// apps/qw-oracle/shared/embedding.test.ts
//
// Integration test against the real Voyage API. Skipped unless VOYAGE_API_KEY
// is set so CI without a key passes cleanly. No DB dependency in this file
// (the module under test has no DB dependency either).

import { describe, expect, test } from 'bun:test';
import {
  embedTexts,
  cosineSimilarity,
  verifyEmbeddingSpace,
  EMBEDDING_SPACE_THRESHOLD,
} from './embedding.ts';

const HAS_KEY = !!process.env.VOYAGE_API_KEY;

describe.skipIf(!HAS_KEY)('voyage embedding client', () => {
  test('embeds a small batch and returns 1024-dim vectors', async () => {
    const out = await embedTexts(
      ['weapon scripts', 'rocket jump'],
      'voyage-4-large',
      'document',
    );
    expect(out.vectors.length).toBe(2);
    expect(out.vectors[0]!.length).toBe(1024);
    expect(out.vectors[1]!.length).toBe(1024);
    expect(out.tokensInput).toBeGreaterThan(0);
  });

  test('returns an empty result without calling the API for an empty input', async () => {
    const out = await embedTexts([], 'voyage-4-large');
    expect(out.vectors.length).toBe(0);
    expect(out.tokensInput).toBe(0);
    expect(out.latencyMs).toBe(0);
  });

  test('throws on a bad API key', async () => {
    const oldKey = process.env.VOYAGE_API_KEY;
    process.env.VOYAGE_API_KEY = 'sk-bogus';
    try {
      await expect(embedTexts(['hi'], 'voyage-4-large')).rejects.toThrow();
    } finally {
      process.env.VOYAGE_API_KEY = oldKey;
    }
  });
});

describe('cosineSimilarity', () => {
  test('identical vectors yield 1', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
  });
  test('orthogonal vectors yield 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  test('dimension mismatch throws', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(/dimension mismatch/);
  });
});

describe.skipIf(!HAS_KEY)('verifyEmbeddingSpace (D8)', () => {
  test('build and query models land in a shared space above the threshold', async () => {
    const r = await verifyEmbeddingSpace();
    expect(r.similarity).toBeGreaterThanOrEqual(EMBEDDING_SPACE_THRESHOLD);
    expect(r.buildTokens).toBeGreaterThan(0);
    expect(r.queryTokens).toBeGreaterThan(0);
  });
});
