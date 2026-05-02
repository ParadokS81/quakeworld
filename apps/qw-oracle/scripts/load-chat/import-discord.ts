// apps/qw-oracle/scripts/load-chat/import-discord.ts
//
// Port of scripts/import-discord.mjs (SQLite, retired in this phase).
// Reads Discord channel exports from /home/paradoks/projects/quakeworld/apps/quad/exports/
// and bulk-loads into Postgres `messages`. Skips files already in import_log.
// Idempotent: re-running is a no-op once import_log is populated; even on a
// fresh DB, ON CONFLICT (id) DO NOTHING absorbs duplicates within a single file.
//
// Usage:
//   bun scripts/load-chat/import-discord.ts                          # default dir: ../quad/exports/
//   bun scripts/load-chat/import-discord.ts <dir>                    # explicit dir
//   bun scripts/load-chat/import-discord.ts --file <path.json>       # single file

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { db, closeDb } from '../../shared/db.ts';

// Discord message type code -> our message_type CHECK enum value. Matches
// scripts/import-discord.mjs exactly. Anything not in this map falls back
// to 'system'.
const MESSAGE_TYPES: Record<number, string> = {
  0:  'message',
  19: 'message',
  7:  'join',
  8:  'system',
  9:  'system',
  10: 'system',
  11: 'system',
  18: 'system',
  6:  'system',
  20: 'system',
  21: 'system',
};

interface DiscordMessage {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  author_display_name?: string;
  author_is_bot: boolean;
  channel_id?: string;
  channel_name?: string;
  guild_id?: string;
  message_type: number;
  referenced_message_id?: string | null;
  attachments?: unknown[];
  embeds?: unknown[];
  reactions?: unknown[];
  created_at: string;
  edited_at?: string | null;
}

const BATCH_SIZE = 1000;

// Channel handle = filename minus the optional date-range suffix that catchup
// exports add. Handles both legacy 'helpdesk.json' (-> '#helpdesk') and the
// catchup form 'helpdesk-2026-02-to-2026-05.json' (-> '#helpdesk'). Without
// this, catchup messages land in '#helpdesk-2026-02-to-2026-05' instead of
// '#helpdesk' and per-channel queries split.
export function channelNameFromFile(filePath: string): string {
  const base = basename(filePath, '.json');
  const stripped = base.replace(/-\d{4}-.*$/, '');
  return '#' + stripped;
}

async function alreadyImported(sourceFile: string): Promise<number | null> {
  const rows = await db<{ message_count: number }[]>`
    SELECT message_count FROM import_log WHERE source_file = ${sourceFile}
  `;
  return rows.length > 0 ? rows[0]!.message_count : null;
}

async function recordImport(args: {
  sourceFile: string;
  channelName: string;
  count: number;
  earliest: string | null;
  latest: string | null;
}): Promise<void> {
  await db`
    INSERT INTO import_log (source_file, platform, channel_name, message_count,
                            date_range_start, date_range_end)
    VALUES (${args.sourceFile}, 'discord', ${args.channelName}, ${args.count},
            ${args.earliest}, ${args.latest})
    ON CONFLICT (source_file) DO UPDATE
      SET message_count    = EXCLUDED.message_count,
          date_range_start = EXCLUDED.date_range_start,
          date_range_end   = EXCLUDED.date_range_end,
          imported_at      = now()
  `;
}

export async function importFile(filePath: string): Promise<number> {
  const sourceFile = basename(filePath);
  const channelName = channelNameFromFile(filePath);

  const skip = await alreadyImported(sourceFile);
  if (skip !== null) {
    console.log(`  [skip] ${channelName} -- already imported (${skip.toLocaleString()} rows)`);
    return skip;
  }

  console.log(`  [read] ${channelName} from ${filePath}`);
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw) as DiscordMessage[];
  console.log(`  [parsed] ${data.length.toLocaleString()} messages`);

  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    await db.begin(async (tx) => {
      for (const m of batch) {
        const messageType = MESSAGE_TYPES[m.message_type] ?? 'system';
        await tx`
          INSERT INTO messages (
            id, platform, guild_id, channel_name, author_id, author_name,
            author_display_name, author_is_bot, content, message_type,
            referenced_message_id, attachment_count, attachments_json,
            embed_count, embeds_json, reaction_count, reactions_json,
            created_at, edited_at, source, source_file
          ) VALUES (
            ${m.id}, 'discord', ${m.guild_id ?? null}, ${channelName},
            ${m.author_id}, ${m.author_username},
            ${m.author_display_name ?? m.author_username}, ${m.author_is_bot ?? false},
            ${m.content ?? ''}, ${messageType},
            ${m.referenced_message_id ?? null},
            ${m.attachments?.length ?? 0},
            ${m.attachments?.length ? tx.json(m.attachments as never) : null},
            ${m.embeds?.length ?? 0},
            ${m.embeds?.length ? tx.json(m.embeds as never) : null},
            ${m.reactions?.length ?? 0},
            ${m.reactions?.length ? tx.json(m.reactions as never) : null},
            ${m.created_at}::timestamptz, ${m.edited_at ?? null}::timestamptz,
            'discord-export', ${sourceFile}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      }
    });
    if ((i + BATCH_SIZE) % 10000 === 0 || i + BATCH_SIZE >= data.length) {
      const pct = Math.min(100, Math.round((inserted / data.length) * 100));
      console.log(`  [batch] ${channelName} -- ${inserted.toLocaleString()}/${data.length.toLocaleString()} (${pct}%)`);
    }
  }

  // Discord exports are not strictly chronological in the source JSON, but
  // ISO-8601 strings sort lexically.
  const dates = data.map((d) => d.created_at).sort();
  await recordImport({
    sourceFile,
    channelName,
    count: inserted,
    earliest: dates[0] ?? null,
    latest:   dates[dates.length - 1] ?? null,
  });
  console.log(`  [done] ${channelName} -- ${inserted.toLocaleString()} inserted`);
  return inserted;
}

async function importDir(dir: string): Promise<void> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('sample-') && !f.startsWith('backfill-'));
  console.log(`Found ${files.length} Discord export files in ${dir}`);

  let total = 0;
  for (const f of files) total += await importFile(join(dir, f));
  console.log(`\n=== DISCORD IMPORT COMPLETE === total: ${total.toLocaleString()} rows`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0) {
    await importFile(resolve(args[fileIdx + 1]!));
  } else {
    const dir = args[0] ? resolve(args[0]) : resolve('..', 'quad', 'exports');
    await importDir(dir);
  }
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
