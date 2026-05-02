// apps/qw-oracle/scripts/load-chat/import-discord.test.ts
//
// Integration test against qw_oracle_test (D13).
// Verifies (1) import inserts the expected rows, (2) re-import is idempotent,
// (3) channel name is derived from filename.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import postgres from 'postgres';
import { channelNameFromFile } from './import-discord.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(`refusing to run import-discord.test.ts against non-test DB; got: ${url}`);
}

const sql = postgres(url, { onnotice: () => {} });

const SAMPLE = [
  {
    id: '100', content: 'hello', author_id: 'u1', author_username: 'alice',
    author_display_name: 'Alice', author_is_bot: false,
    channel_id: 'c1', channel_name: 'helpdesk',
    message_type: 0, referenced_message_id: null,
    attachments: [], embeds: [], reactions: [],
    created_at: '2024-01-01T00:00:00.000Z', edited_at: null,
  },
  {
    id: '101', content: '!ttop10', author_id: 'u2', author_username: 'bot',
    author_display_name: 'Bot', author_is_bot: true,
    channel_id: 'c1', channel_name: 'helpdesk',
    message_type: 0, referenced_message_id: null,
    attachments: [], embeds: [], reactions: [],
    created_at: '2024-01-01T00:00:01.000Z', edited_at: null,
  },
];

let tmpDir: string;
let samplePath: string;

describe('import-discord', () => {
  beforeAll(async () => {
    await sql`TRUNCATE messages, import_log, sessions, message_labels, session_search RESTART IDENTITY CASCADE`;
    tmpDir = mkdtempSync(join(tmpdir(), 'qwo-import-discord-'));
    samplePath = join(tmpDir, 'helpdesk.json');
    writeFileSync(samplePath, JSON.stringify(SAMPLE), 'utf8');
  });
  afterAll(async () => {
    rmSync(tmpDir, { recursive: true, force: true });
    await sql.end();
  });

  test('first import inserts rows and records import_log', async () => {
    const { importFile } = await import('./import-discord.ts');
    await importFile(samplePath);

    const counts = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM messages WHERE platform='discord'`;
    expect(counts[0]!.c).toBe(SAMPLE.length);

    const log = await sql<{ message_count: number }[]>`SELECT message_count FROM import_log WHERE source_file='helpdesk.json'`;
    expect(log[0]!.message_count).toBe(SAMPLE.length);
  });

  test('re-import is idempotent (skips via import_log)', async () => {
    const { importFile } = await import('./import-discord.ts');
    await importFile(samplePath);
    const counts = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM messages WHERE platform='discord'`;
    expect(counts[0]!.c).toBe(SAMPLE.length);
  });

  test('channel name is derived from filename (#helpdesk)', async () => {
    const rows = await sql<{ channel_name: string }[]>`SELECT DISTINCT channel_name FROM messages WHERE platform='discord'`;
    expect(rows[0]!.channel_name).toBe('#helpdesk');
  });
});

describe('channelNameFromFile', () => {
  test('legacy filename has no suffix', () => {
    expect(channelNameFromFile('/x/y/helpdesk.json')).toBe('#helpdesk');
  });
  test('catchup filename strips -YYYY-... suffix', () => {
    expect(channelNameFromFile('/x/y/helpdesk-2026-02-to-2026-05.json')).toBe('#helpdesk');
  });
  test('hyphenated channel still strips correctly', () => {
    expect(channelNameFromFile('/x/y/dev-corner-2026-02-to-2026-05.json')).toBe('#dev-corner');
  });
});
