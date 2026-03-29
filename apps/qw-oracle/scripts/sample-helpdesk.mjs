/**
 * Extract a large sample of helpdesk sessions where people actually asked questions.
 * Filter for sessions with question marks — likely actual help requests.
 */
import { getDb } from './db.mjs';
import { writeFileSync } from 'fs';

const db = getDb();

// Find helpdesk sessions that contain actual questions (have ? in content)
const sessions = db.prepare(`
  SELECT s.id, s.channel_name, s.platform, s.started_at, s.ended_at,
    s.chat_message_count, s.participant_count, s.participants_json
  FROM sessions s
  WHERE s.channel_name = '#helpdesk'
  AND s.chat_message_count >= 5
  AND s.participant_count >= 2
  AND EXISTS (
    SELECT 1 FROM message_labels ml
    JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = s.id
    AND m.content LIKE '%?%'
    AND ml.category = 'chat'
  )
  ORDER BY s.chat_message_count DESC
  LIMIT 30
`).all();

console.log(`Found ${sessions.length} helpdesk sessions with questions\n`);

const output = [];

for (const s of sessions) {
  const msgs = db.prepare(`
    SELECT m.author_name, m.content, m.created_at, ml.category
    FROM message_labels ml
    JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = ?
    AND ml.category IN ('chat', 'link')
    ORDER BY m.created_at
  `).all(s.id);

  const chatLog = msgs.map(m => {
    const time = m.created_at.substring(11, 16);
    return `${time} <${m.author_name}> ${m.content || ''}`;
  }).join('\n');

  // Extract the questions (lines with ?)
  const questions = msgs
    .filter(m => m.content && m.content.includes('?'))
    .map(m => `<${m.author_name}> ${m.content}`);

  output.push({
    session_id: s.id,
    date: s.started_at.substring(0, 10),
    chat_messages: s.chat_message_count,
    participants: JSON.parse(s.participants_json),
    questions,
    chat_log: chatLog,
  });

  // Print summary
  console.log(`Session #${s.id} | ${s.started_at.substring(0, 10)} | ${s.chat_message_count} msgs | ${s.participant_count} ppl`);
  questions.forEach(q => console.log(`  Q: ${q.substring(0, 120)}`));
  console.log('');
}

writeFileSync('output/helpdesk-sample.json', JSON.stringify(output, null, 2));
console.log(`\nWrote ${output.length} sessions to output/helpdesk-sample.json`);

// Also get some stats on helpdesk
console.log('\n=== HELPDESK STATS ===');
const total = db.prepare(`SELECT COUNT(*) as cnt FROM sessions WHERE channel_name = '#helpdesk' AND chat_message_count > 0`).get();
const withQ = db.prepare(`
  SELECT COUNT(DISTINCT s.id) as cnt FROM sessions s
  WHERE s.channel_name = '#helpdesk' AND s.chat_message_count >= 3
  AND EXISTS (SELECT 1 FROM message_labels ml JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = s.id AND m.content LIKE '%?%' AND ml.category = 'chat')
`).get();
console.log(`Total helpdesk sessions with chat: ${total.cnt}`);
console.log(`Sessions with questions (3+ msgs): ${withQ.cnt}`);

db.close();
