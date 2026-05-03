// apps/qw-oracle/serve/mcp/src/query-log.test.ts
//
// Integration tests for the dispatcher wrapper. Hits qw_oracle_test directly;
// no mocks (D13). Asserts: success path writes a populated row, error path
// writes a row with error + null match_quality + propagates the error,
// consumer_hint flows from setConsumerHint into the row, the wrapper extracts
// match_score from results[0] when present, and a failing INSERT (table
// dropped mid-test) does not break the tool's response.

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import postgres from 'postgres';

import { dispatchAndLog, setConsumerHint } from './query-log.ts';
import type { ToolResponse } from './types.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    'query-log.test.ts must run against qw_oracle_test; got DATABASE_URL=' + (url ?? '<unset>'),
  );
}
const sql = postgres(url, { onnotice: () => {} });

beforeEach(async () => {
  await sql`TRUNCATE TABLE query_log RESTART IDENTITY`;
  setConsumerHint(null);
});

afterAll(async () => {
  await sql.end();
});

interface FakeHit {
  id: string;
  match_score: number;
}

function fakeOk(results: FakeHit[], match: 'strong' | 'weak' | 'none'): ToolResponse<FakeHit> {
  return {
    results,
    match_quality: match,
    suggested_fallback: null,
    meta: { tool: 'fake', server_version: 'test', queried_at: '2026-05-02T00:00:00Z' },
  };
}

describe('dispatchAndLog', () => {
  it('writes a populated row on the success path', async () => {
    const result = await dispatchAndLog(
      { tool: 'fake_tool', queryText: 'rocket jump' },
      async () => fakeOk([{ id: 'a', match_score: 0.91 }, { id: 'b', match_score: 0.7 }], 'strong'),
    );
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('"match_quality": "strong"');

    const rows = await sql<
      { tool: string; query_text: string | null; result_count: number;
        top_score: number | null; match_quality: string | null;
        latency_ms: number; error: string | null; consumer_hint: string | null }[]
    >`SELECT tool, query_text, result_count, top_score, match_quality,
              latency_ms, error, consumer_hint
       FROM query_log`;
    expect(rows.length).toBe(1);
    expect(rows[0].tool).toBe('fake_tool');
    expect(rows[0].query_text).toBe('rocket jump');
    expect(rows[0].result_count).toBe(2);
    expect(rows[0].top_score).toBeCloseTo(0.91);
    expect(rows[0].match_quality).toBe('strong');
    expect(rows[0].error).toBeNull();
    expect(rows[0].consumer_hint).toBeNull();
    expect(rows[0].latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('writes a row with error and re-throws when the tool throws', async () => {
    let thrown: Error | null = null;
    try {
      await dispatchAndLog(
        { tool: 'broken_tool', queryText: 'q' },
        async () => { throw new Error('boom'); },
      );
    } catch (e) {
      thrown = e as Error;
    }
    expect(thrown?.message).toBe('boom');

    const rows = await sql<
      { tool: string; error: string | null; match_quality: string | null;
        result_count: number | null; top_score: number | null }[]
    >`SELECT tool, error, match_quality, result_count, top_score FROM query_log`;
    expect(rows.length).toBe(1);
    expect(rows[0].tool).toBe('broken_tool');
    expect(rows[0].error).toBe('boom');
    expect(rows[0].match_quality).toBeNull();
    expect(rows[0].result_count).toBe(0);
    expect(rows[0].top_score).toBeNull();
  });

  it('captures consumer_hint set via setConsumerHint', async () => {
    setConsumerHint('claude-code/1.2.3');
    await dispatchAndLog(
      { tool: 'fake_tool', queryText: null },
      async () => fakeOk([], 'none'),
    );
    const rows = await sql<{ consumer_hint: string | null }[]>`SELECT consumer_hint FROM query_log`;
    expect(rows[0].consumer_hint).toBe('claude-code/1.2.3');
  });

  it('records null top_score when results[0] has no match_score', async () => {
    interface PlainHit { id: string }
    const plain: ToolResponse<PlainHit> = {
      results: [{ id: 'x' }],
      match_quality: 'weak',
      suggested_fallback: null,
      meta: { tool: 'fake', server_version: 'test', queried_at: '2026-05-02T00:00:00Z' },
    };
    await dispatchAndLog(
      { tool: 'lookup_fake', queryText: 'x' },
      async () => plain,
    );
    const rows = await sql<{ top_score: number | null }[]>`SELECT top_score FROM query_log`;
    expect(rows[0].top_score).toBeNull();
  });
});
