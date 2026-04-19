// Seed the discord_channels lookup so MCP session output can emit deep links
// back into Discord. One row per channel_name that appears in the messages
// table for platform='discord'. Guild ID is a single constant (all messages
// come from the Quake.World server).
//
// Idempotent: CREATE TABLE IF NOT EXISTS + INSERT OR REPLACE.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(HERE, '..', 'data', 'qw.db');

const QUAKEWORLD_GUILD_ID = '166866762787192833';

const CHANNELS = [
  { channel_name: '#antilag',     channel_id: '854976516231397417' },
  { channel_name: '#dev-corner',  channel_id: '179895022366228481' },
  { channel_name: '#helpdesk',    channel_id: '709360526899150858' },
  { channel_name: '#quakeworld',  channel_id: '166866762787192833' },
];

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS discord_channels (
    channel_name TEXT PRIMARY KEY,
    channel_id   TEXT NOT NULL,
    guild_id     TEXT NOT NULL
  );
`);

const stmt = db.prepare(`
  INSERT INTO discord_channels (channel_name, channel_id, guild_id)
  VALUES (?, ?, ?)
  ON CONFLICT(channel_name) DO UPDATE SET
    channel_id = excluded.channel_id,
    guild_id   = excluded.guild_id
`);

const tx = db.transaction((rows) => {
  for (const r of rows) stmt.run(r.channel_name, r.channel_id, QUAKEWORLD_GUILD_ID);
});
tx(CHANNELS);

const rows = db.prepare('SELECT channel_name, channel_id, guild_id FROM discord_channels ORDER BY channel_name').all();
console.log('discord_channels seeded:');
for (const r of rows) console.log(`  ${r.channel_name.padEnd(14)} ${r.channel_id}  (guild ${r.guild_id})`);

// Coverage check: every Discord channel_name in messages should have a lookup row.
const missing = db.prepare(`
  SELECT DISTINCT m.channel_name
  FROM messages m
  LEFT JOIN discord_channels dc ON dc.channel_name = m.channel_name
  WHERE m.platform = 'discord' AND dc.channel_name IS NULL
`).all();
if (missing.length === 0) {
  console.log('coverage: all discord channel_names in messages have a lookup row.');
} else {
  console.log('coverage GAP: channels in messages without a lookup row:', missing);
}

db.close();
