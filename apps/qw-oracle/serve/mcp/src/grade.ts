// apps/qw-oracle/serve/mcp/src/grade.ts
//
// match_quality for the three ranked retrieval tools (search_entities,
// search_concepts, search_solved_issues). The label is graded on how close the
// best returned hit is to the question in embedding space -- cosine
// similarity, 0..1 -- against a cut-off pair per corpus.
//
// Why not the fused RRF score (the pre-2026-10 grade): RRF is rank-only. The
// vector leg always returns its nearest rows, so a fused score never fell low
// enough to say 'none', and 'strong' needed the all-words lexical leg to agree,
// which long natural-language questions almost never do. Prod's query_log
// (2026-08-06..09-29) showed it: every weak concept answer scored exactly the
// one-list ceiling 1/61, right answers and off-topic junk alike.
//
// Cut-offs are tuned per corpus by eval/calibrate.ts against
// eval/calibration-queries.json -- descriptions, concept chunks and chat
// threads sit in different similarity ranges, so one pair cannot serve all
// three. The env vars override the calibrated defaults.

import type { MatchBasis, MatchQuality } from './types.ts';

export type Corpus = 'entities' | 'concepts' | 'threads';

export interface Cutoffs {
  strong: number;
  weak: number;
}

// Calibrated 2026-10-02 on the 81-question set (eval/calibrate.ts):
// - entities: right answers 0.43-0.65, uncovered 0.30-0.34, so weak 0.35 is a
//   clean 'none' line. Strong 0.50 rather than the sweep's cost-minimum 0.60:
//   the only uncovered question above 0.50 is a near-domain one ("valorant
//   crosshair code", 0.58 -- other-game questions embed like ours), and
//   guarding against it would label four more right answers weak.
// - concepts: right, partial and uncovered overlap (0.42-0.58 / 0.37-0.55 /
//   0.16-0.50), so strong is reserved for very close chunks and most answers
//   grade weak; weak 0.39 still separates the clearly off-topic.
// - threads: only 11 labeled questions (right 0.39-0.65, uncovered 0.32-0.36);
//   strong 0.50 is a cautious placeholder until a larger chat set exists.
const DEFAULT_CUTOFFS: Record<Corpus, Cutoffs> = {
  entities: { strong: 0.5, weak: 0.35 },
  concepts: { strong: 0.56, weak: 0.39 },
  threads: { strong: 0.5, weak: 0.37 },
};

const ENV_NAMES: Record<Corpus, [string, string]> = {
  entities: ['ENTITY_MATCH_STRONG', 'ENTITY_MATCH_WEAK'],
  concepts: ['CONCEPT_MATCH_STRONG', 'CONCEPT_MATCH_WEAK'],
  threads: ['THREAD_MATCH_STRONG', 'THREAD_MATCH_WEAK'],
};

export function cutoffsFor(corpus: Corpus): Cutoffs {
  const [strongVar, weakVar] = ENV_NAMES[corpus];
  const fallback = DEFAULT_CUTOFFS[corpus];
  return {
    strong: parseFloat(process.env[strongVar] ?? String(fallback.strong)),
    weak: parseFloat(process.env[weakVar] ?? String(fallback.weak)),
  };
}

export function envNamesFor(corpus: Corpus): [string, string] {
  return ENV_NAMES[corpus];
}

export interface GradeInput {
  resultCount: number;
  // Highest cosine similarity among the returned results; null when there is
  // none to judge by -- the embedding call failed (lexical-only path) or no
  // returned row has an embedding (a description-less entity found by name).
  bestSimilarity: number | null;
  // The caller typed an entity's exact name: the answer is right by
  // construction, however its description happens to embed.
  exactName?: boolean;
}

export function grade(input: GradeInput, cutoffs: Cutoffs): { quality: MatchQuality; basis: MatchBasis } {
  if (input.resultCount === 0) return { quality: 'none', basis: 'no_results' };
  if (input.exactName) return { quality: 'strong', basis: 'exact_name' };
  // Something matched the words, but there is no closeness to judge it by, so
  // it can never be vouched for as strong.
  if (input.bestSimilarity === null) return { quality: 'weak', basis: 'no_embedding' };
  const s = input.bestSimilarity;
  const quality: MatchQuality = s >= cutoffs.strong ? 'strong' : s >= cutoffs.weak ? 'weak' : 'none';
  return { quality, basis: 'closeness' };
}
