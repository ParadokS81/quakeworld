// apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts
//
// Hybrid retrieval over concept_chunks. The "no Layer 3 search tool" gap that
// triggered the whole arc closes here: a vague how-to query now finds the
// matching chunk via either lexical or semantic, RRF fuses them, and the
// snippet is post-truncated so the consumer LLM gets a focused signal.
//
// Thresholds default to the values calibrated by `bun run calibrate` against
// eval/calibration-queries.json (D10 disjoint set). Operator overrides via
// MATCH_QUALITY_* env vars; .env wins over source defaults.

import { db } from '../db.ts';
import { embedTexts } from '../../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../../shared/rrf.ts';
import type { SearchConceptResult, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
// Last sweep 2026-05-06: STRONG=0.02 WEAK=0.005 hit 100% accuracy on the
// 5-query calibration set. Recalibrate after any eval-set extension.
const STRONG_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_STRONG_THRESHOLD ?? '0.02');
const WEAK_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_WEAK_THRESHOLD ?? '0.005');
const SNIPPET_CHARS = 600;

interface Args {
  query: string;
  limit?: number;
}

interface ChunkRow {
  id: string;            // BIGSERIAL serialised as string by postgres-js
  concept_slug: string;
  chunk_index: number;
}

async function lexicalChunks(query: string, fanout: number): Promise<ChunkRow[]> {
  return db<ChunkRow[]>`
    SELECT id::text, concept_slug, chunk_index
    FROM concept_chunks
    WHERE tsv @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(tsv, websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${fanout}
  `;
}

async function semanticChunks(vector: number[], fanout: number): Promise<ChunkRow[]> {
  const vec = `[${vector.join(',')}]`;
  return db<ChunkRow[]>`
    SELECT id::text, concept_slug, chunk_index
    FROM concept_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${fanout}
  `;
}

function truncateAroundQuery(text: string, query: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lower = text.toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const probe = tokens[0] ?? query.toLowerCase();
  const idx = lower.indexOf(probe);
  if (idx < 0) return text.slice(0, maxChars) + '...';
  const start = Math.max(0, idx - Math.floor(maxChars / 2));
  const end = Math.min(text.length, start + maxChars);
  return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}

function bucket(score: number): 'strong' | 'weak' | 'none' {
  if (score >= STRONG_THRESHOLD) return 'strong';
  if (score >= WEAK_THRESHOLD) return 'weak';
  return 'none';
}

export async function searchConcepts(args: Args): Promise<ToolResponse<SearchConceptResult>> {
  const limit = Math.min(args.limit ?? 5, 25);
  const fanout = limit * 4;
  const now = () => new Date().toISOString();

  const lexPromise = lexicalChunks(args.query, fanout);

  let semHits: ChunkRow[] = [];
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    semHits = await semanticChunks(result.vectors[0]!, fanout);
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
  }

  const lexHits = await lexPromise;

  const fused = reciprocalRankFusion([lexHits, semHits], (c) => `${c.concept_slug}:${c.chunk_index}`);
  const top = fused.slice(0, limit);

  if (top.length === 0) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No matches for "${args.query}". Consider redirect_to_human or asking in #helpdesk on Discord.`,
      meta: { tool: 'search_concepts', server_version: SERVER_VERSION, queried_at: now() },
    };
  }

  // Pull the matching chunk text + concept summary in one round-trip per row.
  // O(N) round-trips at limit<=25 is acceptable; the tool is rare-ish (per-LLM-question).
  const results: SearchConceptResult[] = [];
  for (const hit of top) {
    const chunkRows = await db<{ text: string; concept_slug: string }[]>`
      SELECT text, concept_slug FROM concept_chunks WHERE id = ${hit.item.id}::bigint
    `;
    const chunk = chunkRows[0];
    if (!chunk) continue;

    const conceptRows = await db<{ slug: string; title: string; summary: string }[]>`
      SELECT slug, title, summary FROM concepts WHERE slug = ${chunk.concept_slug}
    `;
    const concept = conceptRows[0];
    if (!concept) continue;

    const [entityRows, conceptRefs] = await Promise.all([
      db<{ entity_canonical_id: string }[]>`
        SELECT entity_canonical_id FROM concept_entities
        WHERE concept_slug = ${concept.slug}
        ORDER BY entity_canonical_id
      `,
      db<{ target_slug: string }[]>`
        SELECT target_slug FROM concept_concepts
        WHERE source_slug = ${concept.slug}
        ORDER BY target_slug
      `,
    ]);

    results.push({
      id: `concept:${concept.slug}`,
      slug: concept.slug,
      title: concept.title,
      summary: concept.summary,
      match_score: hit.score,
      match_quality: bucket(hit.score),
      snippet: truncateAroundQuery(chunk.text, args.query, SNIPPET_CHARS),
      related_entities: entityRows.map((e) => e.entity_canonical_id),
      related_concepts: conceptRefs.map((c) => `concept:${c.target_slug}`),
    });
  }

  const overall: 'strong' | 'weak' | 'none' = bucket(top[0]!.score);

  return {
    results,
    match_quality: overall,
    suggested_fallback:
      overall === 'none'
        ? `No strong matches for "${args.query}". Consider redirect_to_human.`
        : null,
    meta: { tool: 'search_concepts', server_version: SERVER_VERSION, queried_at: now() },
  };
}
