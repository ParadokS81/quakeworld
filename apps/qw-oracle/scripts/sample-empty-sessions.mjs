import { getDb } from './db.mjs';

const db = getDb();

// What's in those 0-chat sessions?
console.log('=== EMPTY SESSIONS (0 chat messages) ===\n');

const stats = db.prepare(`
  SELECT s.id, s.channel_name, s.platform, s.started_at, s.message_count,
    (SELECT GROUP_CONCAT(DISTINCT ml.category) FROM message_labels ml WHERE ml.session_id = s.id) as categories
  FROM sessions s
  WHERE s.chat_message_count = 0
  ORDER BY s.message_count DESC
  LIMIT 20
`).all();

console.log('Top 20 by total message count:\n');
stats.forEach(r => {
  console.log(`  #${r.id} ${r.channel_name.padEnd(20)} ${r.started_at.substring(0, 10)}  ${r.message_count} msgs  categories: ${r.categories}`);
});

// Show actual content of a few
console.log('\n\n=== SAMPLE EMPTY SESSION CONTENTS ===\n');
const samples = db.prepare(`
  SELECT s.id, s.channel_name, s.started_at, s.message_count
  FROM sessions s
  WHERE s.chat_message_count = 0 AND s.message_count > 1
  ORDER BY RANDOM() LIMIT 3
`).all();

for (const s of samples) {
  console.log(`--- Session #${s.id}: ${s.channel_name} ${s.started_at.substring(0, 16)} (${s.message_count} msgs) ---`);
  const msgs = db.prepare(`
    SELECT m.author_name, m.content, m.message_type, ml.category, m.created_at
    FROM message_labels ml
    JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = ?
    ORDER BY m.created_at
    LIMIT 20
  `).all(s.id);
  msgs.forEach(r => {
    const t = r.created_at.substring(11, 16);
    console.log(`  ${t} [${r.category}] <${r.author_name}> ${r.message_type}: ${(r.content || '').substring(0, 100)}`);
  });
  console.log('');
}

// Category breakdown in empty sessions
console.log('\n=== WHAT FILLS EMPTY SESSIONS ===\n');
const catBreak = db.prepare(`
  SELECT ml.category, COUNT(*) as cnt
  FROM message_labels ml
  JOIN sessions s ON s.id = ml.session_id
  WHERE s.chat_message_count = 0
  GROUP BY ml.category
  ORDER BY cnt DESC
`).all();
catBreak.forEach(r => console.log(`  ${r.category.padEnd(12)} ${r.cnt.toLocaleString()}`));

db.close();
