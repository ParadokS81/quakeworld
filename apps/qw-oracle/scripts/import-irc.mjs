// Import mIRC log files into SQLite
// Usage: node scripts/import-irc.mjs [path-to-mirc-logs-dir]
// mIRC format:
//   Session Start: Sun Jan 01 14:36:54 2006
//   [HH:MM] <nickname> message
//   [HH:MM] * nickname action/event
//   Session Close: ...
import { readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { getDb, initSchema } from './db.mjs';

const LOGS_DIR = process.argv[2] || join('..', 'quad', 'exports', 'mirc-logs');

const db = getDb();
initSchema(db);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO messages (
    id, platform, network, channel_name, author_name,
    author_display_name, content, message_type,
    created_at, source, source_file
  ) VALUES (
    ?, 'irc', 'quakenet', ?, ?,
    ?, ?, ?,
    ?, 'mirc-log', ?
  )
`);

const logStmt = db.prepare(`
  INSERT OR REPLACE INTO import_log (source_file, platform, channel_name, message_count, date_range_start, date_range_end)
  VALUES (?, 'irc', ?, ?, ?, ?)
`);

// Parse mIRC session date: "Sun Jan 01 14:36:54 2006"
function parseSessionDate(dateStr) {
  // Remove day name, parse the rest
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

// Parse a single IRC log file
function parseIrcLog(filePath, fileName) {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  const messages = [];
  let currentDate = null; // Date object for the current day
  let msgCounter = 0;

  // Derive channel name from filename: "#quakeworld.QuakeNet.log" → "#quakeworld"
  const channelName = fileName.split('.')[0]; // "#quakeworld"

  for (const line of lines) {
    // Session Start: Sun Jan 01 14:36:54 2006
    const sessionMatch = line.match(/^Session Start: (.+)$/);
    if (sessionMatch) {
      currentDate = parseSessionDate(sessionMatch[1]);
      continue;
    }

    // Session Close — ignore
    if (line.startsWith('Session Close:')) continue;

    // Skip empty lines and system messages without timestamps
    if (!line.startsWith('[')) continue;
    if (!currentDate) continue;

    // Parse timestamp: [HH:MM]
    const timeMatch = line.match(/^\[(\d{2}):(\d{2})\]\s(.*)$/);
    if (!timeMatch) continue;

    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const rest = timeMatch[3];

    // Build full timestamp — handle midnight rollover
    const ts = new Date(currentDate);
    const prevHours = currentDate.getHours();

    // If time wraps from 23:xx to 00:xx, advance the date
    if (prevHours > 20 && hours < 4) {
      currentDate.setDate(currentDate.getDate() + 1);
      ts.setDate(ts.getDate() + 1);
    }

    ts.setHours(hours, minutes, 0, 0);
    currentDate.setHours(hours, minutes, 0, 0);

    const isoTime = ts.toISOString();

    // Parse message content
    // Regular message: <nickname> text
    const msgMatch = rest.match(/^<([^>]+)>\s(.*)$/);
    if (msgMatch) {
      msgCounter++;
      const id = `irc-${channelName}-${msgCounter}`;
      messages.push({
        id,
        channel: channelName,
        author: msgMatch[1].replace(/^[@+%]/, ''), // Strip IRC mode prefixes
        content: msgMatch[2],
        type: 'message',
        time: isoTime,
      });
      continue;
    }

    // Action/event: * nickname ...
    const actionMatch = rest.match(/^\* (.+)$/);
    if (actionMatch) {
      const actionText = actionMatch[1];

      // Join: * nickname (~user@host) has joined #channel
      if (actionText.includes('has joined')) {
        const joinMatch = actionText.match(/^(\S+)/);
        if (joinMatch) {
          msgCounter++;
          messages.push({
            id: `irc-${channelName}-${msgCounter}`,
            channel: channelName,
            author: joinMatch[1],
            content: actionText,
            type: 'join',
            time: isoTime,
          });
        }
        continue;
      }

      // Quit/Part
      if (actionText.includes('Quit') || actionText.includes('has left')) {
        const quitMatch = actionText.match(/^(\S+)/);
        if (quitMatch) {
          msgCounter++;
          messages.push({
            id: `irc-${channelName}-${msgCounter}`,
            channel: channelName,
            author: quitMatch[1],
            content: actionText,
            type: 'quit',
            time: isoTime,
          });
        }
        continue;
      }

      // Nick change
      if (actionText.includes('is now known as')) {
        const nickMatch = actionText.match(/^(\S+) is now known as (\S+)/);
        if (nickMatch) {
          msgCounter++;
          messages.push({
            id: `irc-${channelName}-${msgCounter}`,
            channel: channelName,
            author: nickMatch[1],
            content: `→ ${nickMatch[2]}`,
            type: 'nick',
            time: isoTime,
          });
        }
        continue;
      }

      // Topic change
      if (actionText.includes('changes topic to') || actionText.includes('Topic is')) {
        msgCounter++;
        const topicAuthor = actionText.match(/^(\S+)/)?.[1] || 'system';
        messages.push({
          id: `irc-${channelName}-${msgCounter}`,
          channel: channelName,
          author: topicAuthor,
          content: actionText,
          type: 'topic',
          time: isoTime,
        });
        continue;
      }

      // Mode changes, kicks, etc — system
      if (actionText.includes('sets mode') || actionText.includes('was kicked')) {
        msgCounter++;
        messages.push({
          id: `irc-${channelName}-${msgCounter}`,
          channel: channelName,
          author: 'system',
          content: actionText,
          type: 'system',
          time: isoTime,
        });
        continue;
      }

      // /me action: * nickname does something (no parens, no "has joined", etc.)
      const meMatch = actionText.match(/^(\S+)\s(.+)$/);
      if (meMatch && !actionText.includes('(') && !actionText.includes('Now talking')) {
        msgCounter++;
        messages.push({
          id: `irc-${channelName}-${msgCounter}`,
          channel: channelName,
          author: meMatch[1],
          content: `* ${meMatch[1]} ${meMatch[2]}`,
          type: 'action',
          time: isoTime,
        });
        continue;
      }
    }

    // Channel service messages: -Q- or -L-
    const serviceMatch = rest.match(/^-(\w+)-\s(.+)$/);
    if (serviceMatch) {
      // Skip these — they're channel bots / services
      continue;
    }
  }

  return messages;
}

// Find all IRC log files
const files = readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'));
console.log(`Found ${files.length} IRC log files in ${LOGS_DIR}\n`);

let grandTotal = 0;

for (const file of files) {
  const filePath = join(LOGS_DIR, file);

  // Check if already imported
  const existing = db.prepare('SELECT message_count FROM import_log WHERE source_file = ?').get(file);
  if (existing) {
    console.log(`  ✓ ${file} — already imported (${existing.message_count} messages)`);
    grandTotal += existing.message_count;
    continue;
  }

  console.log(`  → ${file} — parsing...`);
  const startTime = Date.now();

  const messages = parseIrcLog(filePath, file);
  const parseTime = Date.now() - startTime;
  console.log(`    Parsed ${messages.length.toLocaleString()} messages (${parseTime}ms)`);

  // Batch insert
  const insertMany = db.transaction((msgs) => {
    let count = 0;
    for (const msg of msgs) {
      insertStmt.run(
        msg.id,
        msg.channel,
        msg.author,
        msg.author, // display name = author for IRC
        msg.content,
        msg.type,
        msg.time,
        file,
      );
      count++;
    }
    return count;
  });

  const count = insertMany(messages);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const times = messages.map(m => m.time).sort();
  logStmt.run(file, messages[0]?.channel || file, count, times[0] || null, times[times.length - 1] || null);

  console.log(`    ✓ Inserted ${count.toLocaleString()} messages in ${elapsed}s`);
  if (times.length > 0) {
    console.log(`    Date range: ${times[0]?.slice(0, 10)} → ${times[times.length - 1]?.slice(0, 10)}`);
  }
  grandTotal += count;
}

console.log(`\n=== IRC IMPORT COMPLETE ===`);
console.log(`Total: ${grandTotal.toLocaleString()} messages`);
db.close();
