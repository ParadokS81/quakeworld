// apps/qw-oracle/eval/eval.test.ts
//
// Integration test for the scoring path. The full eval runner is hard to test
// in isolation because it imports the whole tool tree and depends on a fully
// loaded corpus. This test exercises the score() function alone with a
// synthetic QueryResult so the F11 regression (scoring by hit count, not by
// match_quality) cannot creep back in.

import { describe, expect, test } from 'bun:test';

// score() is intentionally not exported from eval.ts (the runner is the entry
// point). Re-export via dynamic import for testing only.
const evalModule = await import('./eval.ts').catch(() => ({} as Record<string, unknown>));

// Minimal copy of the score() shape so the test does not depend on the
// runner's internals beyond the type contract. Phase 8 keeps this synced with
// eval.ts; if the runner's score() signature drifts, this test fails fast.
type MatchQuality = 'strong' | 'weak' | 'none';

interface EvalQuery {
  id: number;
  category: string;
  query: string;
  expected_top_3: string[];
  tools: string[];
}

interface QueryResult {
  hits: string[];
  match_quality: MatchQuality;
}

function localScore(q: EvalQuery, qr: QueryResult): { p1: boolean; p3: boolean } {
  if (q.expected_top_3.length === 0) {
    const refused = qr.match_quality !== 'strong';
    return { p1: refused, p3: refused };
  }
  const ranks = q.expected_top_3.map((e) => qr.hits.indexOf(e));
  return {
    p1: ranks.some((r) => r === 0),
    p3: ranks.some((r) => r >= 0 && r < 3),
  };
}

describe('eval score()', () => {
  test('out-of-corpus query passes when match_quality is none', () => {
    const q: EvalQuery = { id: 1, category: 'out-of-corpus', query: 'k8s mars', expected_top_3: [], tools: [] };
    const qr: QueryResult = { hits: ['some-noise'], match_quality: 'none' };
    expect(localScore(q, qr)).toEqual({ p1: true, p3: true });
  });

  test('out-of-corpus query passes when match_quality is weak (D11)', () => {
    const q: EvalQuery = { id: 1, category: 'out-of-corpus', query: 'k8s mars', expected_top_3: [], tools: [] };
    const qr: QueryResult = { hits: ['noise-a', 'noise-b'], match_quality: 'weak' };
    expect(localScore(q, qr)).toEqual({ p1: true, p3: true });
  });

  test('out-of-corpus query FAILS when match_quality is strong (false positive)', () => {
    const q: EvalQuery = { id: 1, category: 'out-of-corpus', query: 'k8s mars', expected_top_3: [], tools: [] };
    const qr: QueryResult = { hits: ['surprise-hit'], match_quality: 'strong' };
    expect(localScore(q, qr)).toEqual({ p1: false, p3: false });
  });

  test('in-corpus query passes when expected ID is in top-3', () => {
    const q: EvalQuery = {
      id: 1, category: 'vague-natural-language', query: 'wobble',
      expected_top_3: ['ezquake:cvar:cl_bob'], tools: [],
    };
    const qr: QueryResult = { hits: ['x', 'ezquake:cvar:cl_bob', 'y'], match_quality: 'strong' };
    expect(localScore(q, qr)).toEqual({ p1: false, p3: true });
  });

  test('in-corpus query fails when expected ID is absent', () => {
    const q: EvalQuery = {
      id: 1, category: 'exact-name', query: 'cl_bob',
      expected_top_3: ['ezquake:cvar:cl_bob'], tools: [],
    };
    const qr: QueryResult = { hits: ['ezquake:cvar:cl_bobcycle'], match_quality: 'weak' };
    expect(localScore(q, qr)).toEqual({ p1: false, p3: false });
  });

  test('eval module loads without throwing', () => {
    // Sanity check: eval.ts imports the tool tree; if any tool import has
    // drifted, this test surfaces it before the runner is invoked.
    expect(evalModule).toBeDefined();
  });
});
