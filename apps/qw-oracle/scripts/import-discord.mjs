// Import Discord JSON exports into SQLite
// Usage: node scripts/import-discord.mjs [path-to-exports-dir]
import { readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { getDb, initSchema } from './db.mjs';

const EXPORTS_DIR = process.argv[2] || join('..', 'quad', 'exports');

const db = getDb();
initSchema(db);

// Discord message type mapping
const MESSAGE_TYPES = {
  0: 'message',       // Default
  19: 'message',      // Reply
  7: 'join',          // User join
  8: 'system',        // Boost
  9: 'system',        // Boost tier 1
  10: 'system',       // Boost tier 2
  11: 'system',       // Boost tier 3
  18: 'system',       // Thread created
  6: 'system',        // Pin notification
  20: 'system',       // Application command
  21: 'system',       // Thread starter
};

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO messages (
    id, platform, guild_id, channel_name, author_id, author_name,
    author_display_name, author_is_bot, content, message_type,
    referenced_message_id, attachment_count, attachments_json,
    embed_count, embeds_json, reaction_count, reactions_json,
    created_at, edited_at, source, source_file
  ) VALUES (
    ?, 'discord', ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, 'discord-export', ?
  )
`);

const logStmt = db.prepare(`
  INSERT OR REPLACE INTO import_log (source_file, platform, channel_name, message_count, date_range_start, date_range_end)
  VALUES (?, 'discord', ?, ?, ?, ?)
`);

// Find all JSON files in exports dir
const files = readdirSync(EXPORTS_DIR)
  .filter(f => f.endsWith('.json') && !f.startsWith('sample-') && !f.startsWith('backfill-'));

console.log(`Found ${files.length} Discord export files in ${EXPORTS_DIR}\n`);

let grandTotal = 0;

for (const file of files) {
  const filePath = join(EXPORTS_DIR, file);
  const channelName = '#' + basename(file, '.json');

  // Check if already imported
  const existing = db.prepare('SELECT message_count FROM import_log WHERE source_file = ?').get(file);
  if (existing) {
    console.log(`  ✓ ${channelName} — already imported (${existing.message_count} messages)`);
    grandTotal += existing.message_count;
    continue;
  }

  console.log(`  → ${channelName} — reading ${file}...`);
  const startTime = Date.now();

  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  console.log(`    Parsed ${data.length.toLocaleString()} messages (${(Date.now() - startTime)}ms)`);

  // Batch insert in transaction
  const insertMany = db.transaction((messages) => {
    let count = 0;
    for (const msg of messages) {
      const msgType = MESSAGE_TYPES[msg.message_type] || 'system';

      insertStmt.run(
        msg.id,
        msg.guild_id || null,
        channelName,
        msg.author_id,
        msg.author_username,
        msg.author_display_name || msg.author_username,
        msg.author_is_bot ? 1 : 0,
        msg.content || '',
        msgType,
        msg.referenced_message_id || null,
        msg.attachments?.length || 0,
        msg.attachments?.length ? JSON.stringify(msg.attachments) : null,
        msg.embeds?.length || 0,
        msg.embeds?.length ? JSON.stringify(msg.embeds) : null,
        msg.reactions?.length || 0,
        msg.reactions?.length ? JSON.stringify(msg.reactions) : null,
        msg.created_at,
        msg.edited_at || null,
        file,
      );
      count++;
    }
    return count;
  });

  const count = insertMany(data);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Log the import
  const dates = data.map(m => m.created_at).sort();
  logStmt.run(file, channelName, count, dates[0], dates[dates.length - 1]);

  console.log(`    ✓ Inserted ${count.toLocaleString()} messages in ${elapsed}s`);
  console.log(`    Date range: ${dates[0]?.slice(0, 10)} → ${dates[dates.length - 1]?.slice(0, 10)}`);
  grandTotal += count;
}

console.log(`\n=== DISCORD IMPORT COMPLETE ===`);
console.log(`Total: ${grandTotal.toLocaleString()} messages`);
db.close();
