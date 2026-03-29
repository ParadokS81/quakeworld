/**
 * Tier 1 Processing Stats — validate and explore the results
 */

import { getDb } from './db.mjs';

const db = getDb();

// ── Category breakdown ─────────────────────────────────────────────────

console.log('=== MESSAGE CLASSIFICATION ===\n');
const cats = db.prepare(`
  SELECT category, COUNT(*) as cnt
  FROM message_labels
  GROUP BY category ORDER BY cnt DESC
`).all();
const totalMsgs = cats.reduce((s, r) => s + r.cnt, 0);
cats.forEach(r => {
  const pct = ((r.cnt / totalMsgs) * 100).toFixed(1);
  console.log(`  ${r.category.padEnd(12)} ${r.cnt.toLocaleString().padStart(12)}  (${pct}%)`);
});
console.log(`  ${'TOTAL'.padEnd(12)} ${totalMsgs.toLocaleString().padStart(12)}`);

// ── Session size distribution ──────────────────────────────────────────

console.log('\n\n=== SESSION SIZE DISTRIBUTION (by chat messages) ===\n');
const sizes = db.prepare(`
  SELECT
    CASE
      WHEN chat_message_count = 0 THEN '0 (empty)'
      WHEN chat_message_count <= 2 THEN '1-2'
      WHEN chat_message_count <= 5 THEN '3-5'
      WHEN chat_message_count <= 10 THEN '6-10'
      WHEN chat_message_count <= 25 THEN '11-25'
      WHEN chat_message_count <= 50 THEN '26-50'
      WHEN chat_message_count <= 100 THEN '51-100'
      WHEN chat_message_count <= 250 THEN '101-250'
      ELSE '250+'
    END as bucket,
    COUNT(*) as session_count,
    SUM(chat_message_count) as total_chat_msgs
  FROM sessions
  GROUP BY bucket
  ORDER BY MIN(chat_message_count)
`).all();
sizes.forEach(r => {
  console.log(`  ${r.bucket.padEnd(12)} ${r.session_count.toLocaleString().padStart(8)} sessions  ${r.total_chat_msgs.toLocaleString().padStart(10)} chat msgs`);
});

// ── Sessions per channel ───────────────────────────────────────────────

console.log('\n\n=== SESSIONS PER CHANNEL ===\n');
const chSess = db.prepare(`
  SELECT channel_name, platform,
    COUNT(*) as sessions,
    SUM(chat_message_count) as chat_msgs,
    ROUND(AVG(chat_message_count), 1) as avg_chat,
    ROUND(AVG(participant_count), 1) as avg_participants,
    ROUND(AVG((julianday(ended_at) - julianday(started_at)) * 24 * 60), 1) as avg_duration_min
  FROM sessions
  GROUP BY channel_name, platform
  ORDER BY chat_msgs DESC
`).all();
console.log(`  ${'Channel'.padEnd(22)} ${'Plat'.padEnd(8)} ${'Sessions'.padStart(8)} ${'Chat Msgs'.padStart(10)} ${'Avg Chat'.padStart(9)} ${'Avg Ppl'.padStart(8)} ${'Avg Min'.padStart(8)}`);
chSess.forEach(r => {
  console.log(`  ${r.channel_name.padEnd(22)} ${r.platform.padEnd(8)} ${r.sessions.toLocaleString().padStart(8)} ${r.chat_msgs.toLocaleString().padStart(10)} ${String(r.avg_chat).padStart(9)} ${String(r.avg_participants).padStart(8)} ${String(r.avg_duration_min).padStart(8)}`);
});

// ── Interesting sessions (high chat count, many participants) ──────────

console.log('\n\n=== TOP 20 MOST ACTIVE SESSIONS ===\n');
const topSessions = db.prepare(`
  SELECT id, channel_name, platform, started_at, ended_at,
    chat_message_count, participant_count,
    ROUND((julianday(ended_at) - julianday(started_at)) * 24 * 60, 0) as duration_min
  FROM sessions
  ORDER BY chat_message_count DESC
  LIMIT 20
`).all();
topSessions.forEach(r => {
  const date = r.started_at.substring(0, 10);
  const duration = r.duration_min > 0 ? `${r.duration_min}m` : '<1m';
  console.log(`  ${r.channel_name.padEnd(20)} ${date}  ${r.chat_message_count.toLocaleString().padStart(6)} msgs  ${r.participant_count} ppl  ${duration.padStart(6)}`);
});

// ── Sample a medium-sized session to see what it looks like ────────────

console.log('\n\n=== SAMPLE SESSION (medium-sized, #quakeworld Discord) ===\n');
const sampleSession = db.prepare(`
  SELECT s.id, s.channel_name, s.started_at, s.ended_at,
    s.chat_message_count, s.participant_count, s.participants_json
  FROM sessions s
  WHERE s.channel_name = '#quakeworld' AND s.platform = 'discord'
  AND s.chat_message_count BETWEEN 15 AND 40
  AND s.participant_count >= 3
  ORDER BY RANDOM()
  LIMIT 1
`).get();

if (sampleSession) {
  console.log(`  Session #${sampleSession.id}: ${sampleSession.started_at} → ${sampleSession.ended_at}`);
  console.log(`  ${sampleSession.chat_message_count} chat msgs, ${sampleSession.participant_count} participants`);
  console.log(`  Participants: ${sampleSession.participants_json}`);
  console.log('');

  const sessionMsgs = db.prepare(`
    SELECT m.author_name, m.content, m.created_at, ml.category
    FROM message_labels ml
    JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = ?
    ORDER BY m.created_at
  `).all(sampleSession.id);

  sessionMsgs.forEach(r => {
    const time = r.created_at.substring(11, 16);
    const tag = r.category !== 'chat' ? ` [${r.category}]` : '';
    console.log(`  ${time} <${r.author_name}> ${(r.content || '').substring(0, 120)}${tag}`);
  });
}

// ── Sample an IRC session too ──────────────────────────────────────────

console.log('\n\n=== SAMPLE SESSION (medium-sized, IRC) ===\n');
const ircSession = db.prepare(`
  SELECT s.id, s.channel_name, s.started_at, s.ended_at,
    s.chat_message_count, s.participant_count, s.participants_json
  FROM sessions s
  WHERE s.platform = 'irc'
  AND s.chat_message_count BETWEEN 20 AND 60
  AND s.participant_count >= 3
  ORDER BY RANDOM()
  LIMIT 1
`).get();

if (ircSession) {
  console.log(`  Session #${ircSession.id}: ${ircSession.started_at} → ${ircSession.ended_at}`);
  console.log(`  ${ircSession.chat_message_count} chat msgs, ${ircSession.participant_count} participants`);
  console.log(`  Participants: ${ircSession.participants_json}`);
  console.log('');

  const ircMsgs = db.prepare(`
    SELECT m.author_name, m.content, m.created_at, ml.category
    FROM message_labels ml
    JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = ?
    AND ml.category != 'system'
    ORDER BY m.created_at
  `).all(ircSession.id);

  ircMsgs.forEach(r => {
    const time = r.created_at.substring(11, 16);
    const tag = r.category !== 'chat' ? ` [${r.category}]` : '';
    console.log(`  ${time} <${r.author_name}> ${(r.content || '').substring(0, 120)}${tag}`);
  });
}

db.close();
