// apps/qw-oracle/scripts/load-chat/build-sessions.test.ts
//
// Integration test against qw_oracle_test (D13). Inserts a small messages
// fixture, runs the classifier + session builder, asserts session count
// and category breakdown.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { classifyMessage } from './classify.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(`refusing to run build-sessions.test.ts against non-test DB; got: ${url}`);
}

const sql = postgres(url, { onnotice: () => {} });

describe('classifier', () => {
  test('plain chat is "chat"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: 'I have a question about cl_bob', attachment_count: 0,
    })).toBe('chat');
  });
  test('bot author is "bot"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: true,
      content: '!ttop10', attachment_count: 0,
    })).toBe('bot');
  });
  test('"lol" is "reaction"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: 'lol', attachment_count: 0,
    })).toBe('reaction');
  });
  test('bare URL is "link"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: 'https://wiki.quakeworld.nu/', attachment_count: 0,
    })).toBe('link');
  });
  test('join is "system"', () => {
    expect(classifyMessage({
      message_type: 'join', author_is_bot: false,
      content: 'foo has joined #ezQuake', attachment_count: 0,
    })).toBe('system');
  });
});

describe('build-sessions integration', () => {
  beforeAll(async () => {
    await sql`TRUNCATE messages, sessions, message_labels, session_search, processing_log RESTART IDENTITY CASCADE`;
    // Two sessions: t=0..t=5min (4 chat messages), 30min gap, then 1 chat msg.
    const base = new Date('2024-01-01T00:00:00.000Z').getTime();
    const rows = [
      { id: 'd1', t: base + 0,                content: 'hi all',                  type: 'message' },
      { id: 'd2', t: base + 60_000,           content: 'help with cl_bob',         type: 'message' },
      { id: 'd3', t: base + 180_000,          content: 'try setting it to 0',      type: 'message' },
      { id: 'd4', t: base + 300_000,          content: 'thanks',                   type: 'message' },
      { id: 'd5', t: base + 30 * 60_000 + 60, content: 'second session msg',       type: 'message' },
    ];
    for (const r of rows) {
      await sql`
        INSERT INTO messages (id, platform, channel_name, author_name, content,
                              message_type, created_at, source)
        VALUES (${r.id}, 'discord', '#test', 'alice', ${r.content}, ${r.type},
                ${new Date(r.t).toISOString()}::timestamptz, 'test-fixture')
      `;
    }
  });
  afterAll(async () => { await sql.end(); });

  test('build-sessions produces 2 sessions and labels every message', async () => {
    await sql`DELETE FROM processing_log WHERE version = 'v1'`;
    const mod = await import('./build-sessions.ts');
    await mod.main();

    const sessRow = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM sessions`;
    expect(sessRow[0]!.c).toBe(2);

    const labelRow = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM message_labels`;
    expect(labelRow[0]!.c).toBe(5);

    const cats = await sql<{ category: string; c: number }[]>`
      SELECT category, count(*)::int AS c FROM message_labels GROUP BY category
    `;
    expect(cats.find((r) => r.category === 'chat')!.c).toBe(5);
  });
});
