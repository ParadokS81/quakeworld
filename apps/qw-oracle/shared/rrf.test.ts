// apps/qw-oracle/shared/rrf.test.ts
//
// Unit tests; no database dependency. Run via `bun test shared/rrf.test.ts`.

import { describe, expect, test } from 'bun:test';
import { reciprocalRankFusion } from './rrf.ts';

describe('reciprocalRankFusion', () => {
  test('items in both lists fuse to the top', () => {
    const lex = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const sem = [{ id: 'b' }, { id: 'c' }, { id: 'd' }];
    const fused = reciprocalRankFusion([lex, sem], (r) => r.id);
    expect(fused.map((f) => f.item.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(fused.length).toBe(4);
  });

  test('higher k flattens the score differential between top and tail', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    const f1 = reciprocalRankFusion([list], (r) => r.id, { k: 1 });
    const f60 = reciprocalRankFusion([list], (r) => r.id, { k: 60 });
    const diff1 = f1[0].score - f1[1].score;
    const diff60 = f60[0].score - f60[1].score;
    expect(diff1).toBeGreaterThan(diff60);
  });

  test('ranks vector records the per-list position; -1 when missing', () => {
    const lex = [{ id: 'a' }, { id: 'b' }];
    const sem = [{ id: 'b' }, { id: 'c' }];
    const fused = reciprocalRankFusion([lex, sem], (r) => r.id);
    const a = fused.find((f) => f.item.id === 'a')!;
    const b = fused.find((f) => f.item.id === 'b')!;
    const c = fused.find((f) => f.item.id === 'c')!;
    expect(a.ranks).toEqual([0, -1]);
    expect(b.ranks).toEqual([1, 0]);
    expect(c.ranks).toEqual([-1, 1]);
  });

  test('empty input lists produce empty output', () => {
    expect(reciprocalRankFusion<{ id: string }>([], (r) => r.id)).toEqual([]);
    expect(reciprocalRankFusion<{ id: string }>([[], []], (r) => r.id)).toEqual([]);
  });
});
