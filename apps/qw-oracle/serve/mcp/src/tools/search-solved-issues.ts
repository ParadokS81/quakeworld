// Layer 2 full-text search. Queries the existing session_search FTS5 virtual
// table, joins to the sessions table for metadata, and materialises each hit
// with its raw chat transcript (filtered to category='chat' via
// message_labels so noise drops out). The outlet LLM reads the raw messages
// and synthesises the answer.
//
// No build-time summariser. No precomputed entity-mention index. FTS5's
// bm25 rank ordering does the work.

import { db } from '../db.ts';
import type { SessionHit, SessionMessage, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface SearchSolvedIssuesArgs {
  query: string;
  limit?: number;
  max_messages_per_session?: number;
}

interface FtsHitRow {
  session_id: number;
  rank: number;
}

interface SessionMetaRow {
  id: number;
  channel_name: string;
  platform: string;
  started_at: string;
  ended_at: string;
  chat_message_count: number;
  participants_json: string | null;
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

// FTS5 bm25 rank is negative (lower = more relevant). We sort ascending.
// Filter to sessions with at least 5 chat messages to drop one-line callouts
// that are technically hits but contain no signal for a knowledge query.
const searchFts = db.prepare(`
  SELECT ss.session_id AS session_id, ss.rank AS rank
  FROM session_search ss
  JOIN sessions s ON s.id = ss.session_id
  WHERE session_search MATCH ?
    AND s.chat_message_count >= 5
  ORDER BY ss.rank
  LIMIT ?
`);

const getMeta = db.prepare(`
  SELECT id, channel_name, platform, started_at, ended_at,
         chat_message_count, participants_json
  FROM sessions
  WHERE id = ?
`);

const getChatMessages = db.prepare(`
  SELECT m.id AS message_id, m.author_name, m.created_at, m.content,
         m.platform, dc.channel_id, dc.guild_id
  FROM messages m
  JOIN message_labels l ON l.message_id = m.id
  LEFT JOIN discord_channels dc ON dc.channel_name = m.channel_name
  WHERE l.session_id = ?
    AND l.category = 'chat'
  ORDER BY m.created_at
  LIMIT ?
`);

function canonicalSessionId(meta: SessionMetaRow): string {
  return `session:${meta.platform}:${meta.channel_name}:${meta.started_at}`;
}

function hydrateSession(sessionId: number, maxMessages: number, rank: number): SessionHit | null {
  const meta = getMeta.get(sessionId) as SessionMetaRow | undefined;
  if (!meta) return null;
  const rows = getChatMessages.all(sessionId, maxMessages) as unknown as ChatRow[];
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
  return {
    session_id: canonicalSessionId(meta),
    numeric_id: meta.id,
    channel: meta.channel_name,
    platform: meta.platform,
    started_at: meta.started_at,
    ended_at: meta.ended_at,
    chat_message_count: meta.chat_message_count,
    participants: meta.participants_json ? (JSON.parse(meta.participants_json) as string[]) : [],
    messages,
    rank,
  };
}

export function searchSolvedIssues(args: SearchSolvedIssuesArgs): ToolResponse<SessionHit> {
  const limit = args.limit ?? 3;
  const maxMessages = args.max_messages_per_session ?? 40;

  let ftsRows: FtsHitRow[];
  try {
    ftsRows = searchFts.all(args.query, limit) as unknown as FtsHitRow[];
  } catch (err) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `FTS5 rejected the query "${args.query}": ${(err as Error).message}. Try a simpler term or quote the full phrase.`,
      meta: {
        tool: 'search_solved_issues',
        server_version: SERVER_VERSION,
        queried_at: new Date().toISOString(),
      },
    };
  }

  const results: SessionHit[] = [];
  for (const row of ftsRows) {
    const hit = hydrateSession(row.session_id, maxMessages, row.rank);
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
