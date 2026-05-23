// apps/qw-oracle/serve/mcp/src/tools/search-entities.ts
//
// Hybrid retrieval: tsvector (description_tsv, 'english' config from Phase 2)
// + pgvector kNN (description_embedding) + Reciprocal Rank Fusion. The
// substring fallback that lived here in the SQLite era is retired - vague
// queries land in the vector path, exact-name queries land in lookup_entity.

import { db } from '../db.ts';
import { embedTexts } from '../../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../../shared/rrf.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
// Defaults reflect calibration against eval/calibration-queries.json (last
// sweep 2026-05-06: STRONG=0.02 WEAK=0.005 hit 100% accuracy on the 5-query
// set). Operator overrides via MATCH_QUALITY_* env vars; recalibrate after
// any eval-set extension via `bun run calibrate`.
const STRONG_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_STRONG_THRESHOLD ?? '0.02');
const WEAK_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_WEAK_THRESHOLD ?? '0.005');

const USER_FACING_TYPES = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'] as const;

interface Args {
  query: string;
  project?: string;
  type?: EntityType | string;
  limit?: number;
}

async function lexicalCandidates(args: Args, fanout: number): Promise<EntityRow[]> {
  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(USER_FACING_TYPES)}`;
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version, description
    FROM entities
    WHERE description_tsv @@ websearch_to_tsquery('english', ${args.query})
      ${projectClause}
      ${typeClause}
    ORDER BY ts_rank(description_tsv, websearch_to_tsquery('english', ${args.query})) DESC
    LIMIT ${fanout}
  `;
}

async function semanticCandidates(
  args: Args,
  vector: number[],
  fanout: number,
): Promise<EntityRow[]> {
  const vec = `[${vector.join(',')}]`;
  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(USER_FACING_TYPES)}`;
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version, description
    FROM entities
    WHERE description_embedding IS NOT NULL
      ${projectClause}
      ${typeClause}
    ORDER BY description_embedding <=> ${vec}::vector
    LIMIT ${fanout}
  `;
}

export async function searchEntities(args: Args): Promise<ToolResponse<EntityRecord>> {
  const limit = Math.min(args.limit ?? 10, 25);
  const fanout = limit * 4;

  const lexPromise = lexicalCandidates(args, fanout);

  let semHits: EntityRow[] = [];
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    semHits = await semanticCandidates(args, result.vectors[0]!, fanout);
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
    // Lexical-only degraded path; no throw.
  }

  const lexHits = await lexPromise;

  const fused = reciprocalRankFusion([lexHits, semHits], (e) => e.canonical_id);
  const top = fused.slice(0, limit);

  const results = await Promise.all(top.map((f) => toEntityRecord(f.item)));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (top.length === 0) matchQuality = 'none';
  else if (top[0]!.score >= STRONG_THRESHOLD) matchQuality = 'strong';
  else if (top[0]!.score >= WEAK_THRESHOLD) matchQuality = 'weak';
  else matchQuality = 'none';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No strong matches for "${args.query}". Try search_concepts for how-to questions, or call redirect_to_human.`
        : null,
    meta: {
      tool: 'search_entities',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
