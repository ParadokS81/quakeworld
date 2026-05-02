// apps/qw-oracle/scripts/load-chat/import-historical-from-qwdb.ts
//
// One-shot bulk-import of historical Discord messages from data/qw.db (SQLite)
// into Postgres `messages`. Used because the original Discord backfill JSON
// files were cleaned up locally before this phase ran; qw.db is the only
// surviving source for the 717,389 historical rows. The catchup window
// (apps/quad/exports/*.json) covers Feb-May 2026 and runs through the standard
// import-discord.ts path after this script finishes.
//
// Idempotent on snowflake: ON CONFLICT (id) DO NOTHING. Re-running is a no-op
// once messages are loaded; the import_log sentinel row also prevents
// accidental re-runs.
//
// Run via: `bun scripts/load-chat/import-historical-from-qwdb.ts`.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Database } from 'bun:sqlite';
import { db, closeDb } from '../../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QWDB_PATH = resolve(__dirname, '..', '..', 'data', 'qw.db');
const SOURCE_FILE_SENTINEL = 'qw.db-historical-bulk-import-2026-05-02';
const BATCH_SIZE = 1000;

// Shape of one row coming back from qw.db.messages. SQLite returns INTEGER 0/1
// for booleans and TEXT for the JSON columns; we coerce both at the seam.
interface SqliteMessageRow {
  id: string;
  guild_id: string | null;
  channel_name: string;
  author_id: string | null;
  author_name: string;
  author_display_name: string | null;
  author_is_bot: number;
  content: string;
  message_type: string;
  referenced_message_id: string | null;
  attachment_count: number;
  attachments_json: string | null;
  embed_count: number;
  embeds_json: string | null;
  reaction_count: number;
  reactions_json: string | null;
  created_at: string;
  edited_at: string | null;
  source: string;
  source_file: string | null;
}

// Parsed-and-typed row ready for Postgres bind. JSONB columns are parsed JS
// values (or null), per the JSONB binding rule in apps/qw-oracle/CLAUDE.md.
interface PgMessageRow {
  id: string;
  guild_id: string | null;
  channel_name: string;
  author_id: string | null;
  author_name: string;
  author_display_name: string | null;
  author_is_bot: boolean;
  content: string;
  message_type: string;
  referenced_message_id: string | null;
  attachment_count: number;
  attachments_json: unknown;
  embed_count: number;
  embeds_json: unknown;
  reaction_count: number;
  reactions_json: unknown;
  created_at: string;
  edited_at: string | null;
  source: string;
  source_file: string | null;
}

function parseJsonOrNull(text: string | null): unknown {
  if (text === null || text === '') return null;
  try {
    return sanitizeForJsonb(JSON.parse(text));
  } catch {
    // qw.db is operator-curated; unparseable JSON would be a real bug worth
    // surfacing rather than silently nulling. Throw with context.
    throw new Error(`unparseable JSON in qw.db row: ${text.slice(0, 80)}...`);
  }
}

// Postgres JSONB requires valid UTF-8; lone UTF-16 surrogates from JS strings
// (e.g., a malformed Discord embed missing the low surrogate of a 4-byte emoji)
// are valid per the JSON spec but invalid as UTF-8 bytes. Replace any unpaired
// surrogate with U+FFFD so the bind succeeds. Without this, ~24 historical
// rows out of 717,389 fail the JSONB cast and abort the entire batch.
function sanitizeForJsonb(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      '�',
    );
  }
  if (Array.isArray(value)) return value.map(sanitizeForJsonb);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForJsonb(v);
    }
    return out;
  }
  return value;
}

function toPgRow(r: SqliteMessageRow): PgMessageRow {
  return {
    id: r.id,
    guild_id: r.guild_id,
    channel_name: r.channel_name,
    author_id: r.author_id,
    author_name: r.author_name,
    author_display_name: r.author_display_name,
    author_is_bot: r.author_is_bot === 1,
    content: r.content ?? '',
    message_type: r.message_type,
    referenced_message_id: r.referenced_message_id,
    attachment_count: r.attachment_count ?? 0,
    attachments_json: parseJsonOrNull(r.attachments_json),
    embed_count: r.embed_count ?? 0,
    embeds_json: parseJsonOrNull(r.embeds_json),
    reaction_count: r.reaction_count ?? 0,
    reactions_json: parseJsonOrNull(r.reactions_json),
    created_at: r.created_at,
    edited_at: r.edited_at,
    source: r.source,
    source_file: r.source_file,
  };
}

async function alreadyRan(): Promise<boolean> {
  const rows = await db<{ id: number }[]>`
    SELECT id FROM import_log WHERE source_file = ${SOURCE_FILE_SENTINEL} LIMIT 1
  `;
  return rows.length > 0;
}

async function insertBatch(rows: PgMessageRow[]): Promise<void> {
  await db.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        INSERT INTO messages (
          id, platform, guild_id, channel_name, author_id, author_name,
          author_display_name, author_is_bot, content, message_type,
          referenced_message_id, attachment_count, attachments_json,
          embed_count, embeds_json, reaction_count, reactions_json,
          created_at, edited_at, source, source_file
        ) VALUES (
          ${r.id}, 'discord', ${r.guild_id}, ${r.channel_name}, ${r.author_id},
          ${r.author_name}, ${r.author_display_name}, ${r.author_is_bot},
          ${r.content}, ${r.message_type}, ${r.referenced_message_id},
          ${r.attachment_count},
          ${r.attachments_json === null ? null : tx.json(r.attachments_json as never)},
          ${r.embed_count},
          ${r.embeds_json === null ? null : tx.json(r.embeds_json as never)},
          ${r.reaction_count},
          ${r.reactions_json === null ? null : tx.json(r.reactions_json as never)},
          ${r.created_at}::timestamptz,
          ${r.edited_at}::timestamptz,
          ${r.source}, ${r.source_file}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function main(): Promise<void> {
  if (await alreadyRan()) {
    console.log(`[import-historical-from-qwdb] sentinel '${SOURCE_FILE_SENTINEL}' already in import_log; nothing to do`);
    return;
  }

  console.log(`[import-historical-from-qwdb] opening ${QWDB_PATH}`);
  const sqlite = new Database(QWDB_PATH, { readonly: true });
  try {
    const totalRow = sqlite.query<{ c: number }, []>(
      `SELECT COUNT(*) AS c FROM messages WHERE platform='discord'`,
    ).get();
    const total = totalRow?.c ?? 0;
    console.log(`[import-historical-from-qwdb] qw.db has ${total.toLocaleString()} discord messages`);

    const stmt = sqlite.query<SqliteMessageRow, [number, number]>(`
      SELECT id, guild_id, channel_name, author_id, author_name,
             author_display_name, author_is_bot, content, message_type,
             referenced_message_id, attachment_count, attachments_json,
             embed_count, embeds_json, reaction_count, reactions_json,
             created_at, edited_at, source, source_file
      FROM messages
      WHERE platform='discord'
      ORDER BY created_at, id
      LIMIT ? OFFSET ?
    `);

    const t0 = Date.now();
    let earliest: string | null = null;
    let latest: string | null = null;
    let processed = 0;
    let offset = 0;

    while (true) {
      const batch = stmt.all(BATCH_SIZE, offset);
      if (batch.length === 0) break;

      const pgRows = batch.map(toPgRow);
      await insertBatch(pgRows);

      // Track date range across the full pass.
      const first = pgRows[0]!.created_at;
      const last = pgRows[pgRows.length - 1]!.created_at;
      if (earliest === null || first < earliest) earliest = first;
      if (latest === null || last > latest) latest = last;

      processed += batch.length;
      offset += BATCH_SIZE;
      if (offset % 50_000 === 0 || batch.length < BATCH_SIZE) {
        const pct = Math.round((processed / total) * 100);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  [batch] ${processed.toLocaleString()}/${total.toLocaleString()} (${pct}%) in ${elapsed}s`);
      }
    }

    await db`
      INSERT INTO import_log (source_file, platform, channel_name, message_count,
                              date_range_start, date_range_end)
      VALUES (${SOURCE_FILE_SENTINEL}, 'discord', NULL, ${processed},
              ${earliest}::timestamptz, ${latest}::timestamptz)
      ON CONFLICT (source_file) DO UPDATE
        SET message_count    = EXCLUDED.message_count,
            date_range_start = EXCLUDED.date_range_start,
            date_range_end   = EXCLUDED.date_range_end,
            imported_at      = now()
    `;

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n[import-historical-from-qwdb] done: ${processed.toLocaleString()} rows processed in ${elapsed}s`);
  } finally {
    sqlite.close();
  }
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
