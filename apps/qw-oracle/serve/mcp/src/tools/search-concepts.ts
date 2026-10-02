// apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts
//
// Hybrid retrieval over concept_chunks. The "no Layer 3 search tool" gap that
// triggered the whole arc closes here: a vague how-to query now finds the
// matching chunk via either lexical or semantic, RRF fuses them, and the
// snippet is post-truncated so the consumer LLM gets a focused signal.
//
// match_quality is graded on closeness (grade.ts): the best chunk's cosine
// similarity to the question against the 'concepts' cut-offs.

import { db } from '../db.ts';
import { embedTexts } from '../../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../../shared/rrf.ts';
import { cutoffsFor, grade } from '../grade.ts';
import type { SearchConceptResult, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
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

// Closeness of each chunk to the question (cosine similarity, 0..1).
async function closeness(chunkIds: string[], vector: number[] | null): Promise<Map<string, number>> {
  if (!vector || chunkIds.length === 0) return new Map();
  const vec = `[${vector.join(',')}]`;
  const rows = await db<{ id: string; sim: number }[]>`
    SELECT id::text, 1 - (embedding <=> ${vec}::vector) AS sim
    FROM concept_chunks
    WHERE id = ANY(${chunkIds}::bigint[]) AND embedding IS NOT NULL
  `;
  return new Map(rows.map((r) => [r.id, Number(r.sim)]));
}

export async function searchConcepts(args: Args): Promise<ToolResponse<SearchConceptResult>> {
  const limit = Math.min(args.limit ?? 5, 25);
  const fanout = limit * 4;
  const now = () => new Date().toISOString();

  const lexPromise = lexicalChunks(args.query, fanout);

  let semHits: ChunkRow[] = [];
  let vector: number[] | null = null;
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    vector = result.vectors[0]!;
    semHits = await semanticChunks(vector, fanout);
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
      meta: {
        tool: 'search_concepts',
        server_version: SERVER_VERSION,
        queried_at: now(),
        best_match_score: null,
        match_basis: 'no_results',
      },
    };
  }

  const cutoffs = cutoffsFor('concepts');
  const sims = await closeness(top.map((h) => h.item.id), vector);

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
      match_score: sims.get(hit.item.id) ?? null,
      match_quality: grade({ resultCount: 1, bestSimilarity: sims.get(hit.item.id) ?? null }, cutoffs).quality,
      snippet: truncateAroundQuery(chunk.text, args.query, SNIPPET_CHARS),
      related_entities: entityRows.map((e) => e.entity_canonical_id),
      related_concepts: conceptRefs.map((c) => `concept:${c.target_slug}`),
    });
  }

  const best = sims.size ? Math.max(...sims.values()) : null;
  const { quality: overall, basis } = grade({ resultCount: results.length, bestSimilarity: best }, cutoffs);

  return {
    results,
    match_quality: overall,
    suggested_fallback:
      overall === 'none'
        ? `No strong matches for "${args.query}". Consider redirect_to_human.`
        : null,
    meta: {
      tool: 'search_concepts',
      server_version: SERVER_VERSION,
      queried_at: now(),
      best_match_score: best,
      match_basis: basis,
    },
  };
}
