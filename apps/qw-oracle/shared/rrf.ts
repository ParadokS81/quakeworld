// apps/qw-oracle/shared/rrf.ts
//
// Reciprocal Rank Fusion. Merges N ranked lists into a single ranked output
// without needing per-retriever score normalization.
//
//   score(item) = sum over lists L of [ 1 / (k + rank_in_L(item) + 1) ]
//
// k=60 is the standard literature default. Higher k flattens score
// differences (the tail contributes more); lower k makes top ranks dominate.
// The +1 is because callers pass 0-indexed ranks (array position).
//
// Items appearing in multiple lists rank above items appearing in only one;
// this is the load-bearing property when fusing tsvector lexical hits with
// pgvector semantic hits.

export interface FusedHit<T> {
  item: T;
  score: number;
  ranks: number[]; // per-input rank, -1 if missing from that list
}

export function reciprocalRankFusion<T>(
  rankedLists: T[][],
  keyOf: (item: T) => string,
  opts: { k?: number } = {},
): FusedHit<T>[] {
  const k = opts.k ?? 60;
  const accum = new Map<string, FusedHit<T>>();

  rankedLists.forEach((list, listIdx) => {
    list.forEach((item, rank) => {
      const key = keyOf(item);
      let slot = accum.get(key);
      if (!slot) {
        slot = { item, score: 0, ranks: rankedLists.map(() => -1) };
        accum.set(key, slot);
      }
      slot.ranks[listIdx] = rank;
      slot.score += 1 / (k + rank + 1);
    });
  });

  return [...accum.values()].sort((a, b) => b.score - a.score);
}
