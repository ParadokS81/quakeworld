/**
 * Extract a diverse set of sessions for Tier 2 prompt testing.
 * Picks sessions across different channels, eras, and sizes.
 */
import { getDb } from './db.mjs';

const db = getDb();

// Get 8 varied sessions: mix of IRC/Discord, technical/social, different eras
const queries = [
  // Technical IRC discussion (ezQuake dev)
  { label: 'Technical IRC (ezQuake)', query: `
    SELECT id FROM sessions WHERE channel_name = '#ezQuake' AND platform = 'irc'
    AND chat_message_count BETWEEN 15 AND 50 AND participant_count >= 3
    ORDER BY RANDOM() LIMIT 1` },
  // Social IRC (ibh community)
  { label: 'Social IRC (ibh)', query: `
    SELECT id FROM sessions WHERE channel_name = '#ibh' AND platform = 'irc'
    AND chat_message_count BETWEEN 20 AND 60 AND participant_count >= 4
    ORDER BY RANDOM() LIMIT 1` },
  // Tournament IRC (eql)
  { label: 'Tournament IRC (eql)', query: `
    SELECT id FROM sessions WHERE channel_name = '#eql' AND platform = 'irc'
    AND chat_message_count BETWEEN 10 AND 40 AND participant_count >= 3
    ORDER BY RANDOM() LIMIT 1` },
  // Drama channel
  { label: 'Drama IRC (qwdrama)', query: `
    SELECT id FROM sessions WHERE channel_name = '#qwdrama' AND platform = 'irc'
    AND chat_message_count BETWEEN 10 AND 40 AND participant_count >= 2
    ORDER BY RANDOM() LIMIT 1` },
  // Discord dev-corner (technical)
  { label: 'Technical Discord (dev-corner)', query: `
    SELECT id FROM sessions WHERE channel_name = '#dev-corner' AND platform = 'discord'
    AND chat_message_count BETWEEN 15 AND 50 AND participant_count >= 3
    ORDER BY RANDOM() LIMIT 1` },
  // Discord quakeworld (community)
  { label: 'Community Discord (quakeworld)', query: `
    SELECT id FROM sessions WHERE channel_name = '#quakeworld' AND platform = 'discord'
    AND chat_message_count BETWEEN 15 AND 40 AND participant_count >= 4
    ORDER BY RANDOM() LIMIT 1` },
  // Helpdesk session
  { label: 'Helpdesk Discord', query: `
    SELECT id FROM sessions WHERE channel_name = '#helpdesk' AND platform = 'discord'
    AND chat_message_count BETWEEN 10 AND 30 AND participant_count >= 2
    ORDER BY RANDOM() LIMIT 1` },
  // LAN event (qhlan)
  { label: 'LAN event IRC (qhlan)', query: `
    SELECT id FROM sessions WHERE channel_name = '#qhlan' AND platform = 'irc'
    AND chat_message_count BETWEEN 20 AND 80 AND participant_count >= 5
    ORDER BY RANDOM() LIMIT 1` },
];

const output = [];

for (const q of queries) {
  const row = db.prepare(q.query).get();
  if (!row) { console.error(`No match for: ${q.label}`); continue; }

  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `).get(row.id);

  const messages = db.prepare(`
    SELECT m.author_name, m.content, m.created_at, ml.category
    FROM message_labels ml
    JOIN messages m ON m.id = ml.message_id
    WHERE ml.session_id = ?
    AND ml.category IN ('chat', 'link')
    ORDER BY m.created_at
  `).all(row.id);

  // Format as chat log
  const chatLog = messages.map(m => {
    const time = m.created_at.substring(11, 16);
    return `${time} <${m.author_name}> ${m.content || ''}`;
  }).join('\n');

  output.push({
    session_id: session.id,
    label: q.label,
    channel: session.channel_name,
    platform: session.platform,
    date: session.started_at.substring(0, 10),
    time_range: `${session.started_at.substring(11, 16)} → ${session.ended_at.substring(11, 16)}`,
    chat_messages: session.chat_message_count,
    participants: JSON.parse(session.participants_json),
    chat_log: chatLog,
  });
}

// Write to file for inspection
const outPath = 'output/tier2-sample.json';
const { writeFileSync } = await import('fs');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${output.length} sessions to ${outPath}`);

// Also print them nicely
for (const s of output) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${s.label}`);
  console.log(`  ${s.channel} (${s.platform}) | ${s.date} ${s.time_range} | ${s.chat_messages} msgs | ${s.participants.length} ppl`);
  console.log(`${'─'.repeat(70)}`);
  console.log(s.chat_log);
}

db.close();
