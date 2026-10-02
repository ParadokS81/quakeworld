// apps/qw-oracle/serve/mcp/src/grade.test.ts
//
// The closeness grade's rules (grade.ts). Pure -- no database.

import { describe, expect, test } from 'bun:test';
import { cutoffsFor, grade } from './grade.ts';

const CUT = { strong: 0.5, weak: 0.35 };

describe('grade', () => {
  test('no results is none, whatever else is known', () => {
    expect(grade({ resultCount: 0, bestSimilarity: 0.9, exactName: true }, CUT)).toEqual({ quality: 'none', basis: 'no_results' });
  });

  test('an exact name hit is strong even when its description embeds far away', () => {
    expect(grade({ resultCount: 3, bestSimilarity: 0.1, exactName: true }, CUT)).toEqual({ quality: 'strong', basis: 'exact_name' });
  });

  test('no closeness to judge by can never be strong', () => {
    expect(grade({ resultCount: 3, bestSimilarity: null }, CUT)).toEqual({ quality: 'weak', basis: 'no_embedding' });
  });

  test('closeness buckets at the cut-offs, inclusive', () => {
    expect(grade({ resultCount: 1, bestSimilarity: 0.5 }, CUT).quality).toBe('strong');
    expect(grade({ resultCount: 1, bestSimilarity: 0.49 }, CUT).quality).toBe('weak');
    expect(grade({ resultCount: 1, bestSimilarity: 0.35 }, CUT).quality).toBe('weak');
    expect(grade({ resultCount: 1, bestSimilarity: 0.34 }, CUT).quality).toBe('none');
  });

  test('an empty or non-numeric override falls back to the default (compose passes unset vars as "")', () => {
    const saved = process.env.ENTITY_MATCH_STRONG;
    process.env.ENTITY_MATCH_STRONG = '';
    expect(Number.isFinite(cutoffsFor('entities').strong)).toBe(true);
    process.env.ENTITY_MATCH_STRONG = 'abc';
    expect(Number.isFinite(cutoffsFor('entities').strong)).toBe(true);
    process.env.ENTITY_MATCH_STRONG = '0.61';
    expect(cutoffsFor('entities').strong).toBe(0.61);
    if (saved === undefined) delete process.env.ENTITY_MATCH_STRONG;
    else process.env.ENTITY_MATCH_STRONG = saved;
  });
});
