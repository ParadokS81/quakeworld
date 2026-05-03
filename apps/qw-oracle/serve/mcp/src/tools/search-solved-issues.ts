// apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts
//
// Layer 2 lexical search. Queries session_search.session_tsv (tsvector, config
// 'simple' per D7), joins back to sessions for metadata, then materialises
// each hit by reading message_labels + messages for the chat transcript.
// Sessions with fewer than 5 chat messages are filtered out (one-line
// callouts hit but contain no signal).

import { db } from '../db.ts';
import type { SessionHit, SessionMessage, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface SearchSolvedIssuesArgs {
  query: string;
  limit?: number;
  max_messages_per_session?: number;
}

interface FtsHitRow {
  session_id: string; // BIGINT comes back as string from postgres-js
  rank: number;
}

interface SessionMetaRow {
  id: string;
  channel_name: string;
  platform: string;
  started_at: string;
  ended_at: string;
  chat_message_count: number;
  participants: string[] | null;
}

interface ChatRow {
  message_id: string;
  author_name: string;
  created_at: string;
  content: string;
  platform: string;
  channel_id: string | null;
  guild_id: string | null;
}

function canonicalSessionId(meta: SessionMetaRow): string {
  return `session:${meta.platform}:${meta.channel_name}:${meta.started_at}`;
}

async function hydrateSession(
  sessionId: string,
  maxMessages: number,
  rank: number,
): Promise<SessionHit | null> {
  const metaRows = await db<SessionMetaRow[]>`
    SELECT id::text, channel_name, platform, started_at, ended_at,
           chat_message_count, participants_json AS participants
    FROM sessions
    WHERE id = ${sessionId}::bigint
  `;
  const meta = metaRows[0];
  if (!meta) return null;

  const rows = await db<ChatRow[]>`
    SELECT m.id AS message_id, m.author_name, m.created_at, m.content,
           m.platform, dc.channel_id, dc.guild_id
    FROM messages m
    JOIN message_labels l ON l.message_id = m.id
    LEFT JOIN discord_channels dc ON dc.channel_name = m.channel_name
    WHERE l.session_id = ${sessionId}::bigint
      AND l.category = 'chat'
    ORDER BY m.created_at
    LIMIT ${maxMessages}
  `;

  const messages: SessionMessage[] = rows.map((r) => {
    const m: SessionMessage = {
      author: r.author_name,
      at: r.created_at,
      text: r.content ?? '',
    };
    if (r.platform === 'discord' && r.guild_id && r.channel_id) {
      m.discord_url = `https://discord.com/channels/${r.guild_id}/${r.channel_id}/${r.message_id}`;
    }
    return m;
  });

  // platform column has a CHECK constraint locking to 'discord' (D9-revised);
  // TS narrowing has no view of that, so cast through the literal.
  return {
    session_id: canonicalSessionId(meta),
    numeric_id: Number(meta.id),
    channel: meta.channel_name,
    platform: meta.platform as 'discord',
    started_at: meta.started_at,
    ended_at: meta.ended_at,
    chat_message_count: meta.chat_message_count,
    participants: meta.participants ?? [],
    messages,
    rank,
  };
}

export async function searchSolvedIssues(args: SearchSolvedIssuesArgs): Promise<ToolResponse<SessionHit>> {
  const limit = args.limit ?? 3;
  const maxMessages = args.max_messages_per_session ?? 40;

  let ftsRows: FtsHitRow[];
  try {
    ftsRows = await db<FtsHitRow[]>`
      SELECT ss.session_id::text AS session_id,
             ts_rank(ss.session_tsv, websearch_to_tsquery('simple', ${args.query})) AS rank
      FROM session_search ss
      WHERE ss.session_tsv @@ websearch_to_tsquery('simple', ${args.query})
        AND ss.chat_message_count >= 5
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
  } catch (err) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `tsvector rejected the query "${args.query}": ${(err as Error).message}. Try a simpler term or quote the full phrase.`,
      meta: {
        tool: 'search_solved_issues',
        server_version: SERVER_VERSION,
        queried_at: new Date().toISOString(),
      },
    };
  }

  const results: SessionHit[] = [];
  for (const row of ftsRows) {
    const hit = await hydrateSession(row.session_id, maxMessages, row.rank);
    if (hit) results.push(hit);
  }

  const matchQuality: 'strong' | 'weak' | 'none' =
    results.length === 0 ? 'none' : results.length >= 2 ? 'strong' : 'weak';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No indexed chat sessions with >=5 chat messages match "${args.query}". The denoising pass is structural only (bot/system/reaction filter); semantic noise like pickup callouts is still in the corpus. Try a more specific query or ask in #ezquake on Discord.`
        : null,
    meta: {
      tool: 'search_solved_issues',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
