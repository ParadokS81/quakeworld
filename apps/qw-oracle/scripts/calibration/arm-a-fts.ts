// Arm A -- lexical FTS baseline. Postgres websearch_to_tsquery('simple', q)
// against session_search.session_tsv, restricted to the locked window + channels.
// Returns the top-k sessions by ts_rank. Empty/stopword-only queries match
// nothing -> [] -> caller records [NO HIT].

import { db } from '../../shared/db.ts';
import { CHANNELS, WINDOW_START, WINDOW_END } from './config.ts';

const chans = CHANNELS as unknown as string[];

export interface FtsHit { id: string; channel: string; text: string }

export async function ftsTopK(q: string, k: number): Promise<FtsHit[]> {
  const rows = await db<{ session_id: number; channel_name: string; content: string }[]>`
    SELECT session_id, channel_name, content
    FROM session_search
    WHERE channel_name IN ${db(chans)}
      AND started_at >= ${WINDOW_START} AND started_at < ${WINDOW_END}
      AND session_tsv @@ websearch_to_tsquery('simple', ${q})
    ORDER BY ts_rank(session_tsv, websearch_to_tsquery('simple', ${q})) DESC
    LIMIT ${k}
  `;
  return rows.map((r) => ({ id: String(r.session_id), channel: r.channel_name, text: r.content }));
}
