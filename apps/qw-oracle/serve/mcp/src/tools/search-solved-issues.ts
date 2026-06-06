// apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts
//
// Hybrid retrieval over chat_threads (Layer 2 corpus reconstruction). Fuses:
//   - lexical: content_tsv @@ websearch_to_tsquery('simple', query) -- same
//     'simple' config as the sessions-era tsvector (D7: language-agnostic for
//     mixed-language Discord corpus).
//   - semantic: pgvector cosine kNN on topic_embedding (voyage-4-lite query).
// Fusion via Reciprocal Rank Fusion (k=60). Lexical-only degraded path on
// Voyage API failure -- no throw, error logged to embedding_api_log.
//
// Thresholds (R10 PROVISIONAL): L2_RRF_STRONG_THRESHOLD / L2_RRF_WEAK_THRESHOLD
// default to 0.02 / 0.005 -- borrowed from search_entities calibration, not yet
// calibrated against a Layer 2 eval set. Pending Phase D recalibration on the
// full fenced-thread backfill.

import { db } from '../db.ts';
import { embedTexts } from '../../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../../shared/rrf.ts';
import type { ThreadHit, SessionMessage, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
// PROVISIONAL thresholds (R10): borrowed from search_entities (STRONG=0.02,
// WEAK=0.005). Not yet calibrated for thread retrieval. Pending Phase D
// recalibration on the full fenced-thread backfill.
const STRONG_THRESHOLD = parseFloat(process.env.L2_RRF_STRONG_THRESHOLD ?? '0.02');
const WEAK_THRESHOLD = parseFloat(process.env.L2_RRF_WEAK_THRESHOLD ?? '0.005');

interface Args {
  query: string;
  limit?: number;
  max_messages_per_session?: number;
}

interface ThreadRow {
  thread_id: string;       // BIGINT -> string via ::text cast
  topic_label: string;
  channel_name: string;
  platform: string;
  date_range_start: string;
  date_range_end: string;
  participant_count: number;
  participants_json: string[] | null;
  message_count: number;
  resolution_status: string | null;
}

interface MessageRow {
  message_id: string;
  author_name: string;
  created_at: string;
  content: string;
  platform: string;
  channel_id: string | null;
  guild_id: string | null;
}

async function lexicalCandidates(query: string, fanout: number): Promise<ThreadRow[]> {
  try {
    return await db<ThreadRow[]>`
      SELECT id::text AS thread_id, topic_label, channel_name, platform,
             date_range_start, date_range_end, participant_count,
             participants_json, message_count, resolution_status
      FROM chat_threads
      WHERE content_tsv @@ websearch_to_tsquery('simple', ${query})
      ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple', ${query})) DESC
      LIMIT ${fanout}
    `;
  } catch {
    // Defensive: tsquery can reject malformed queries. Return empty and let
    // the semantic path (or empty result) handle it gracefully.
    return [];
  }
}

async function semanticCandidates(vec: number[], fanout: number): Promise<ThreadRow[]> {
  const vecLiteral = `[${vec.join(',')}]`;
  return db<ThreadRow[]>`
    SELECT id::text AS thread_id, topic_label, channel_name, platform,
           date_range_start, date_range_end, participant_count,
           participants_json, message_count, resolution_status
    FROM chat_threads
    WHERE topic_embedding IS NOT NULL
    ORDER BY topic_embedding <=> ${vecLiteral}::vector
    LIMIT ${fanout}
  `;
}

async function hydrateThread(threadId: string, maxMessages: number): Promise<MessageRow[]> {
  return db<MessageRow[]>`
    SELECT m.id AS message_id, m.author_name, m.created_at, m.content,
           m.platform, dc.channel_id, dc.guild_id
    FROM thread_messages tm
    JOIN messages m ON m.id = tm.message_id
    LEFT JOIN discord_channels dc ON dc.channel_name = m.channel_name
    WHERE tm.thread_id = ${threadId}::bigint
    ORDER BY m.created_at
    LIMIT ${maxMessages}
  `;
}

function rowToMessage(r: MessageRow): SessionMessage {
  const m: SessionMessage = {
    author: r.author_name,
    at: r.created_at,
    text: r.content ?? '',
  };
  if (r.platform === 'discord' && r.guild_id && r.channel_id) {
    m.discord_url = `https://discord.com/channels/${r.guild_id}/${r.channel_id}/${r.message_id}`;
  }
  return m;
}

export async function searchSolvedIssues(args: Args): Promise<ToolResponse<ThreadHit>> {
  const limit = args.limit ?? 3;
  const maxMessages = args.max_messages_per_session ?? 40;
  const fanout = limit * 4;

  // Kick off lexical candidates immediately (no Voyage dependency).
  const lexPromise = lexicalCandidates(args.query, fanout);

  // Attempt semantic embedding; degrade to lexical-only on failure.
  let semHits: ThreadRow[] = [];
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    semHits = await semanticCandidates(result.vectors[0]!, fanout);
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
    // Lexical-only degraded path; no throw.
  }

  const lexHits = await lexPromise;

  const fused = reciprocalRankFusion([lexHits, semHits], (t) => t.thread_id);
  const top = fused.slice(0, limit);

  // Hydrate each top thread with its messages.
  const results: ThreadHit[] = await Promise.all(
    top.map(async (f) => {
      const row = f.item;
      const msgRows = await hydrateThread(row.thread_id, maxMessages);
      const messages = msgRows.map(rowToMessage);
      return {
        thread_id: row.thread_id,
        topic_label: row.topic_label,
        channel: row.channel_name,
        platform: 'discord' as const,
        date_range_start: row.date_range_start,
        date_range_end: row.date_range_end,
        participant_count: row.participant_count,
        participants: row.participants_json ?? [],
        message_count: row.message_count,
        resolution_status: (row.resolution_status as ThreadHit['resolution_status']) ?? null,
        messages,
        score: f.score,
      };
    }),
  );

  // match_quality from top fused score vs PROVISIONAL thresholds (R10).
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
        ? `No community threads matched "${args.query}". Try a more specific term or ask directly in #ezquake on the Quake.World Discord.`
        : null,
    meta: {
      tool: 'search_solved_issues',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
