import { getDb } from './db.mjs';

const db = getDb();

// Find busiest #ibh days
const busy = db.prepare(`
  SELECT DATE(created_at) as day, COUNT(*) as cnt
  FROM messages
  WHERE channel_name = '#ibh' AND message_type = 'message'
  GROUP BY day ORDER BY cnt DESC LIMIT 5
`).all();
console.log('Busiest #ibh days:');
busy.forEach(r => console.log(`  ${r.day}  ${r.cnt} messages`));

// Sample from the busiest day
const day = busy[0].day;
console.log(`\n=== #ibh ${day} (${busy[0].cnt} chat messages) ===\n`);

const msgs = db.prepare(`
  SELECT author_name, content, created_at, message_type
  FROM messages
  WHERE channel_name = '#ibh' AND message_type IN ('message', 'action')
  AND created_at LIKE ? || '%'
  ORDER BY created_at LIMIT 120
`).all(day);

let prev = null;
msgs.forEach(r => {
  const t = r.created_at.substring(11, 16);
  const ts = new Date(r.created_at).getTime();
  if (prev && (ts - prev) > 20 * 60 * 1000) {
    console.log(`\n--- ${Math.round((ts - prev) / 60000)} min gap ---\n`);
  }
  if (r.message_type === 'action') {
    console.log(`${t} * ${r.author_name} ${(r.content || '').substring(0, 130)}`);
  } else {
    console.log(`${t} <${r.author_name}> ${(r.content || '').substring(0, 130)}`);
  }
  prev = ts;
});

// Also show a Discord #dev-corner sample - technical channel
console.log('\n\n=== Discord #dev-corner - 2024-06-15 ===\n');
const dev = db.prepare(`
  SELECT author_name, content, created_at
  FROM messages
  WHERE channel_name = '#dev-corner' AND message_type = 'message'
  AND created_at LIKE '2024-06-15%'
  ORDER BY created_at LIMIT 60
`).all();
if (dev.length === 0) {
  // try another date
  const devDays = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as cnt
    FROM messages
    WHERE channel_name = '#dev-corner' AND message_type = 'message'
    AND created_at > '2024-01-01'
    GROUP BY day ORDER BY cnt DESC LIMIT 3
  `).all();
  console.log('Busiest recent #dev-corner days:');
  devDays.forEach(r => console.log(`  ${r.day}  ${r.cnt} messages`));

  if (devDays.length > 0) {
    const devDay = devDays[0].day;
    console.log(`\nSampling ${devDay}:\n`);
    const devMsgs = db.prepare(`
      SELECT author_name, content, created_at
      FROM messages
      WHERE channel_name = '#dev-corner' AND message_type = 'message'
      AND created_at LIKE ? || '%'
      ORDER BY created_at LIMIT 60
    `).all(devDay);
    let p2 = null;
    devMsgs.forEach(r => {
      const t = r.created_at.substring(11, 16);
      const ts = new Date(r.created_at).getTime();
      if (p2 && (ts - p2) > 20 * 60 * 1000) {
        console.log(`\n--- ${Math.round((ts - p2) / 60000)} min gap ---\n`);
      }
      console.log(`${t} <${r.author_name}> ${(r.content || '').substring(0, 130)}`);
      p2 = ts;
    });
  }
} else {
  let p2 = null;
  dev.forEach(r => {
    const t = r.created_at.substring(11, 16);
    const ts = new Date(r.created_at).getTime();
    if (p2 && (ts - p2) > 20 * 60 * 1000) {
      console.log(`\n--- ${Math.round((ts - p2) / 60000)} min gap ---\n`);
    }
    console.log(`${t} <${r.author_name}> ${(r.content || '').substring(0, 130)}`);
    p2 = ts;
  });
}

db.close();
