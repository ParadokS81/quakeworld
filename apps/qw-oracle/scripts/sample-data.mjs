import { getDb } from './db.mjs';

const db = getDb();

// 1. IRC conversation sample
console.log('=== IRC #quakeworld - 2007-03-15 (sample day) ===\n');
const irc = db.prepare(`
  SELECT author_name, message_type, content, created_at
  FROM messages
  WHERE channel_name = '#quakeworld' AND platform = 'irc'
  AND created_at LIKE '2007-03-15%'
  ORDER BY created_at
  LIMIT 100
`).all();
irc.forEach(r => {
  const time = r.created_at.substring(11, 16);
  if (r.message_type === 'message') {
    console.log(`${time} <${r.author_name}> ${(r.content || '').substring(0, 120)}`);
  } else {
    console.log(`${time} * ${r.message_type}: ${r.author_name} ${(r.content || '').substring(0, 80)}`);
  }
});

// 2. Discord conversation sample
console.log('\n\n=== Discord #quakeworld - 2025-12-15 ===\n');
const disc = db.prepare(`
  SELECT author_name, message_type, content, created_at
  FROM messages
  WHERE channel_name = '#quakeworld' AND platform = 'discord'
  AND created_at LIKE '2025-12-15%'
  AND message_type = 'message'
  ORDER BY created_at
  LIMIT 80
`).all();
disc.forEach(r => {
  const time = r.created_at.substring(11, 16);
  console.log(`${time} <${r.author_name}> ${(r.content || '').substring(0, 130)}`);
});

// 3. Short message analysis
console.log('\n\n=== SHORT MESSAGES (1-3 chars) - Top 20 ===\n');
const short = db.prepare(`
  SELECT content, COUNT(*) as cnt
  FROM messages
  WHERE message_type = 'message' AND LENGTH(content) <= 3 AND content != ''
  GROUP BY content ORDER BY cnt DESC LIMIT 20
`).all();
short.forEach(r => console.log(`${JSON.stringify(r.content).padEnd(8)} ${r.cnt.toLocaleString()}`));

// 4. Bot messages
console.log('\n\n=== BOT AUTHORS ===\n');
const bots = db.prepare(`
  SELECT author_name, COUNT(*) as cnt
  FROM messages
  WHERE author_is_bot = 1
  GROUP BY author_name ORDER BY cnt DESC LIMIT 15
`).all();
bots.forEach(r => console.log(`${r.author_name.padEnd(25)} ${r.cnt.toLocaleString()}`));

// 5. Content length distribution
console.log('\n\n=== CONTENT LENGTH DISTRIBUTION (chat messages only) ===\n');
const lens = db.prepare(`
  SELECT
    CASE
      WHEN LENGTH(content) = 0 THEN '0-empty'
      WHEN LENGTH(content) <= 5 THEN '1-5'
      WHEN LENGTH(content) <= 20 THEN '6-20'
      WHEN LENGTH(content) <= 50 THEN '21-50'
      WHEN LENGTH(content) <= 100 THEN '51-100'
      WHEN LENGTH(content) <= 200 THEN '101-200'
      WHEN LENGTH(content) <= 500 THEN '201-500'
      ELSE '500+'
    END as len_bucket,
    COUNT(*) as cnt
  FROM messages
  WHERE message_type = 'message'
  GROUP BY len_bucket
  ORDER BY MIN(LENGTH(content))
`).all();
lens.forEach(r => console.log(`${r.len_bucket.padEnd(15)} ${r.cnt.toLocaleString()}`));

// 6. Non-message type counts (the noise we auto-filter)
console.log('\n\n=== NON-CHAT MESSAGE TYPES (auto-filterable) ===\n');
const types = db.prepare(`
  SELECT message_type, COUNT(*) as cnt
  FROM messages
  WHERE message_type != 'message'
  GROUP BY message_type ORDER BY cnt DESC
`).all();
const total = types.reduce((s, r) => s + r.cnt, 0);
types.forEach(r => console.log(`${r.message_type.padEnd(15)} ${r.cnt.toLocaleString()}`));
console.log(`${'TOTAL'.padEnd(15)} ${total.toLocaleString()} (auto-filterable)`);

// 7. Sample a conversation with natural gaps to see session boundaries
console.log('\n\n=== CONVERSATION FLOW WITH TIME GAPS - #ibh 2008-06-10 ===\n');
const flow = db.prepare(`
  SELECT author_name, content, created_at, message_type
  FROM messages
  WHERE channel_name = '#ibh' AND platform = 'irc'
  AND created_at LIKE '2008-06-10%'
  AND message_type IN ('message', 'action')
  ORDER BY created_at
  LIMIT 120
`).all();
let prevTime = null;
flow.forEach(r => {
  const time = r.created_at.substring(11, 16);
  const ts = new Date(r.created_at).getTime();
  if (prevTime && (ts - prevTime) > 20 * 60 * 1000) {
    const gapMin = Math.round((ts - prevTime) / 60000);
    console.log(`\n--- ${gapMin} minute gap ---\n`);
  }
  if (r.message_type === 'action') {
    console.log(`${time} * ${r.author_name} ${(r.content || '').substring(0, 120)}`);
  } else {
    console.log(`${time} <${r.author_name}> ${(r.content || '').substring(0, 120)}`);
  }
  prevTime = ts;
});

db.close();
