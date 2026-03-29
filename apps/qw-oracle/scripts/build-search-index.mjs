/**
 * Build FTS5 search index over session chat content.
 * Concatenates all chat+link messages per session into a searchable document.
 *
 * This enables fast full-text search like:
 *   "platform jitter sv_mintic"
 *   "mouse sensitivity rocket jump"
 *   "linux compositor fps drops"
 */

import { getDb, initSearchSchema, resetSearch } from './db.mjs';

const db = getDb();
initSearchSchema(db);
resetSearch(db);

console.log('Building FTS5 search index...\n');

// Get all sessions with actual chat content
const sessions = db.prepare(`
  SELECT id, channel_name, platform, started_at, participants_json, chat_message_count
  FROM sessions
  WHERE chat_message_count > 0
  ORDER BY id
`).all();

console.log(`Sessions to index: ${sessions.length.toLocaleString()}`);

const insertStmt = db.prepare(`
  INSERT INTO session_search (session_id, channel_name, platform, started_at, participants, chat_message_count, content)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getMsgs = db.prepare(`
  SELECT m.author_name, m.content
  FROM message_labels ml
  JOIN messages m ON m.id = ml.message_id
  WHERE ml.session_id = ?
  AND ml.category IN ('chat', 'link')
  ORDER BY m.created_at
`);

const BATCH = 1000;
let indexed = 0;
const t0 = Date.now();

// Process in batches within a transaction
const batch = db.transaction((sessionBatch) => {
  for (const s of sessionBatch) {
    const msgs = getMsgs.all(s.id);

    // Concatenate as "author: message" lines
    const content = msgs
      .map(m => `${m.author_name}: ${m.content || ''}`)
      .join('\n');

    if (content.trim().length === 0) continue;

    insertStmt.run(
      s.id,
      s.channel_name,
      s.platform,
      s.started_at,
      s.participants_json,
      s.chat_message_count,
      content
    );
    indexed++;
  }
});

// Process in chunks
for (let i = 0; i < sessions.length; i += BATCH) {
  const chunk = sessions.slice(i, i + BATCH);
  batch(chunk);

  if ((i + BATCH) % 10000 === 0 || i + BATCH >= sessions.length) {
    const pct = Math.min(100, ((i + BATCH) / sessions.length * 100)).toFixed(0);
    console.log(`  ${pct}% — ${indexed.toLocaleString()} sessions indexed`);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nDone! Indexed ${indexed.toLocaleString()} sessions in ${elapsed}s`);

// Quick sanity check
const count = db.prepare('SELECT COUNT(*) as cnt FROM session_search').get();
console.log(`FTS5 index has ${count.cnt.toLocaleString()} documents`);

db.close();
