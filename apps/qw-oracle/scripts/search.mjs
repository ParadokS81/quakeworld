/**
 * Search the Oracle — full-text search over 20 years of QW community knowledge.
 *
 * Usage:
 *   node scripts/search.mjs "platform jitter sv_mintic"
 *   node scripts/search.mjs "mouse sensitivity settings"
 *   node scripts/search.mjs "linux fps drops compositor"
 */

import { getDb } from './db.mjs';

const query = process.argv[2];
if (!query) {
  console.log('Usage: node scripts/search.mjs "your search query"');
  console.log('\nExamples:');
  console.log('  node scripts/search.mjs "platform jitter online server"');
  console.log('  node scripts/search.mjs "mouse sensitivity rocket jump"');
  console.log('  node scripts/search.mjs "linux compositor fps drops"');
  console.log('  node scripts/search.mjs "ezquake fullscreen borderless streaming"');
  console.log('  node scripts/search.mjs "nquake installation error"');
  process.exit(0);
}

const db = getDb();

console.log(`Searching for: "${query}"\n`);

// FTS5 search with BM25 ranking
const results = db.prepare(`
  SELECT
    session_id,
    channel_name,
    platform,
    started_at,
    participants,
    chat_message_count,
    snippet(session_search, 6, '>>>', '<<<', '...', 40) as snippet,
    rank
  FROM session_search
  WHERE session_search MATCH ?
  ORDER BY rank
  LIMIT 10
`).all(query);

if (results.length === 0) {
  console.log('No results found. Try broader terms or different keywords.');
  db.close();
  process.exit(0);
}

console.log(`Found ${results.length} results:\n`);

for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const date = r.started_at.substring(0, 10);
  const participants = JSON.parse(r.participants);
  const pplStr = participants.slice(0, 5).join(', ') + (participants.length > 5 ? ` +${participants.length - 5}` : '');

  console.log(`─── Result ${i + 1} ──────────────────────────────────────────`);
  console.log(`  ${r.channel_name} (${r.platform}) | ${date} | ${r.chat_message_count} msgs | ${pplStr}`);
  console.log(`  Snippet: ${r.snippet.replace(/\n/g, ' ').substring(0, 200)}`);
  console.log('');
}

// Show full conversation for top result
console.log('═══════════════════════════════════════════════════════════════');
console.log('TOP RESULT — Full conversation:');
console.log('═══════════════════════════════════════════════════════════════\n');

const topId = results[0].session_id;
const topSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(topId);
const topMsgs = db.prepare(`
  SELECT m.author_name, m.content, m.created_at, ml.category
  FROM message_labels ml
  JOIN messages m ON m.id = ml.message_id
  WHERE ml.session_id = ?
  AND ml.category IN ('chat', 'link')
  ORDER BY m.created_at
`).all(topId);

console.log(`${topSession.channel_name} | ${topSession.started_at.substring(0, 10)} | ${topSession.chat_message_count} msgs`);
console.log(`Participants: ${topSession.participants_json}`);
console.log('');

topMsgs.forEach(m => {
  const time = m.created_at.substring(11, 16);
  console.log(`  ${time} <${m.author_name}> ${(m.content || '').substring(0, 150)}`);
});

db.close();
