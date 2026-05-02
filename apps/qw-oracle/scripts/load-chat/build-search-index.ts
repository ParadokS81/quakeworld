// apps/qw-oracle/scripts/load-chat/build-search-index.ts
//
// Port of scripts/build-search-index.mjs. Rebuilds `session_search` from
// sessions + messages + message_labels. tsvector ('simple', D7) replaces FTS5.
//
// Usage:
//   bun scripts/load-chat/build-search-index.ts

import { db, closeDb } from '../../shared/db.ts';

interface SessionRow {
  id: number;
  channel_name: string;
  platform: string;
  started_at: string;
  participants_json: unknown;
  chat_message_count: number;
}

interface ChatRow {
  author_name: string;
  content: string;
}

const BATCH = 1000;

async function main(): Promise<void> {
  console.log('[build-search-index] truncating session_search');
  await db`TRUNCATE session_search`;

  const sessions = await db<SessionRow[]>`
    SELECT id, channel_name, platform, started_at, participants_json, chat_message_count
    FROM sessions
    WHERE chat_message_count > 0
    ORDER BY id
  `;
  console.log(`[build-search-index] sessions to index: ${sessions.length.toLocaleString()}`);

  const t0 = Date.now();
  let indexed = 0;

  for (let i = 0; i < sessions.length; i += BATCH) {
    const batch = sessions.slice(i, i + BATCH);
    await db.begin(async (tx) => {
      for (const s of batch) {
        const msgs = await tx<ChatRow[]>`
          SELECT m.author_name, m.content
          FROM message_labels l
          JOIN messages m ON m.id = l.message_id
          WHERE l.session_id = ${s.id}
            AND l.category IN ('chat', 'link')
          ORDER BY m.created_at
        `;
        const content = msgs.map((m) => `${m.author_name}: ${m.content ?? ''}`).join('\n').trim();
        if (content.length === 0) continue;
        await tx`
          INSERT INTO session_search (session_id, channel_name, platform, started_at,
                                      participants, chat_message_count, content)
          VALUES (${s.id}, ${s.channel_name}, ${s.platform}, ${s.started_at}::timestamptz,
                  ${tx.json(s.participants_json as never)},
                  ${s.chat_message_count}, ${content})
        `;
        indexed++;
      }
    });
    if ((i + BATCH) % 10000 === 0 || i + BATCH >= sessions.length) {
      const pct = Math.min(100, Math.round((indexed / sessions.length) * 100));
      console.log(`  [batch] ${indexed.toLocaleString()} sessions indexed (${pct}%)`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[build-search-index] done: ${indexed.toLocaleString()} sessions in ${elapsed}s`);
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
