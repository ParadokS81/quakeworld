import { getDb } from './db.mjs';

const db = getDb();

const total = db.prepare(`SELECT COUNT(*) as cnt FROM messages WHERE channel_name = '#helpdesk'`).get();
const chat = db.prepare(`SELECT COUNT(*) as cnt FROM messages WHERE channel_name = '#helpdesk' AND message_type = 'message'`).get();
const sessions = db.prepare(`SELECT COUNT(*) as cnt FROM sessions WHERE channel_name = '#helpdesk' AND chat_message_count > 0`).get();
const qSessions = db.prepare(`
  SELECT COUNT(DISTINCT s.id) as cnt FROM sessions s
  WHERE s.channel_name = '#helpdesk' AND s.chat_message_count >= 3
  AND EXISTS (SELECT 1 FROM message_labels ml JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = s.id AND m.content LIKE '%?%' AND ml.category = 'chat')
`).get();

console.log('=== HELPDESK CHANNEL - FULL PICTURE ===\n');
console.log(`Total messages:                  ${total.cnt.toLocaleString()}`);
console.log(`Chat messages:                   ${chat.cnt.toLocaleString()}`);
console.log(`Sessions with chat:              ${sessions.cnt.toLocaleString()}`);
console.log(`Sessions with questions (3+ msg): ${qSessions.cnt.toLocaleString()}`);

const range = db.prepare(`SELECT MIN(created_at) as first, MAX(created_at) as last FROM messages WHERE channel_name = '#helpdesk'`).get();
console.log(`Date range:                      ${range.first.substring(0, 10)} → ${range.last.substring(0, 10)}`);

// What I actually read for the benchmark
const benchmarkedMsgs = 2481; // rough total from the 10 sessions I read
console.log(`\n=== WHAT I ACTUALLY BENCHMARKED ===\n`);
console.log(`Sessions read in detail:         10`);
console.log(`Out of question-sessions:        ${qSessions.cnt} (${(10 / qSessions.cnt * 100).toFixed(1)}%)`);
console.log(`Messages in those 10 sessions:   ~2,481`);
console.log(`Out of total chat messages:      ${chat.cnt.toLocaleString()} (${(2481 / chat.cnt * 100).toFixed(1)}%)`);

// Also: what other channels have help-style content?
console.log(`\n=== OTHER CHANNELS WITH HELP CONTENT ===\n`);
const helpChannels = ['#ezQuake', '#ktx', '#mvdsv', '#fte', '#helpdesk'];
for (const ch of helpChannels) {
  const r = db.prepare(`
    SELECT COUNT(*) as sessions, SUM(chat_message_count) as msgs
    FROM sessions WHERE channel_name = ? AND chat_message_count > 0
  `).get(ch);
  const q = db.prepare(`
    SELECT COUNT(DISTINCT s.id) as cnt FROM sessions s
    WHERE s.channel_name = ? AND s.chat_message_count >= 3
    AND EXISTS (SELECT 1 FROM message_labels ml JOIN messages m ON m.id = ml.message_id
      WHERE ml.session_id = s.id AND m.content LIKE '%?%' AND ml.category = 'chat')
  `).get(ch);
  console.log(`${ch.padEnd(15)} ${r.sessions.toLocaleString().padStart(6)} sessions  ${r.msgs.toLocaleString().padStart(8)} chat msgs  ${q.cnt.toLocaleString().padStart(5)} with questions`);
}

db.close();
