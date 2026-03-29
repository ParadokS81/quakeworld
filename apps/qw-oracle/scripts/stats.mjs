// Quick stats on the imported data
import { getDb } from './db.mjs';

const db = getDb();

console.log('=== QW ORACLE — DATABASE STATS ===\n');

// Overall counts
const total = db.prepare('SELECT COUNT(*) as count FROM messages').get();
const byPlatform = db.prepare('SELECT platform, COUNT(*) as count FROM messages GROUP BY platform').all();
console.log(`Total messages: ${total.count.toLocaleString()}`);
for (const p of byPlatform) {
  console.log(`  ${p.platform}: ${p.count.toLocaleString()}`);
}

// Date range
const dateRange = db.prepare('SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM messages').get();
console.log(`\nDate range: ${dateRange.earliest?.slice(0, 10)} → ${dateRange.latest?.slice(0, 10)}`);

// By channel
console.log('\n--- Messages per channel ---');
const byChannel = db.prepare(`
  SELECT channel_name, platform, COUNT(*) as count,
    MIN(created_at) as earliest, MAX(created_at) as latest
  FROM messages
  WHERE message_type IN ('message', 'action')
  GROUP BY channel_name, platform
  ORDER BY count DESC
`).all();

for (const ch of byChannel) {
  const pad = ch.channel_name.padEnd(22);
  const platPad = ch.platform.padEnd(8);
  console.log(`  ${pad} ${platPad} ${ch.count.toLocaleString().padStart(8)} msgs  (${ch.earliest?.slice(0, 10)} → ${ch.latest?.slice(0, 10)})`);
}

// Message type breakdown
console.log('\n--- Message types ---');
const byType = db.prepare(`
  SELECT message_type, COUNT(*) as count FROM messages GROUP BY message_type ORDER BY count DESC
`).all();
for (const t of byType) {
  console.log(`  ${t.message_type.padEnd(12)} ${t.count.toLocaleString().padStart(10)}`);
}

// Top authors (messages only, not joins/quits)
console.log('\n--- Top 20 authors (by message count) ---');
const topAuthors = db.prepare(`
  SELECT author_name, platform, COUNT(*) as count
  FROM messages
  WHERE message_type IN ('message', 'action')
  GROUP BY author_name, platform
  ORDER BY count DESC
  LIMIT 20
`).all();
for (const a of topAuthors) {
  console.log(`  ${a.author_name.padEnd(25)} ${a.platform.padEnd(8)} ${a.count.toLocaleString().padStart(8)} msgs`);
}

// Messages per year
console.log('\n--- Messages per year (chat only) ---');
const byYear = db.prepare(`
  SELECT substr(created_at, 1, 4) as year, platform, COUNT(*) as count
  FROM messages
  WHERE message_type IN ('message', 'action')
  GROUP BY year, platform
  ORDER BY year
`).all();

const years = new Map();
for (const y of byYear) {
  if (!years.has(y.year)) years.set(y.year, { irc: 0, discord: 0 });
  years.get(y.year)[y.platform] = y.count;
}
for (const [year, counts] of years) {
  const total = counts.irc + counts.discord;
  const bar = '█'.repeat(Math.round(total / 2000));
  const ircPart = counts.irc ? `irc:${counts.irc.toLocaleString()}` : '';
  const discordPart = counts.discord ? `discord:${counts.discord.toLocaleString()}` : '';
  const parts = [ircPart, discordPart].filter(Boolean).join(' + ');
  console.log(`  ${year}  ${bar} ${total.toLocaleString()} (${parts})`);
}

// DB file size
const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
console.log(`\nDatabase size: ${(dbSize.size / 1024 / 1024).toFixed(1)} MB`);

db.close();
