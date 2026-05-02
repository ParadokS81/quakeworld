// apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts
//
// One-shot apply of db/seeds/discord_channels.sql. Idempotent.
// Run via: `bun scripts/load-chat/seed-discord-channels.ts`.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dirname, '..', '..', 'db', 'seeds', 'discord_channels.sql');

async function main(): Promise<void> {
  const sql = readFileSync(SEED_PATH, 'utf8');
  await db.unsafe(sql);
  const rows = await db<{ channel_name: string }[]>`
    SELECT channel_name FROM discord_channels ORDER BY channel_name
  `;
  console.log(`[seed-discord-channels] applied; ${rows.length} rows in discord_channels`);
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
