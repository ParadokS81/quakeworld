// Integration tests against the qw_oracle_test Postgres database (D13).

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations } from '../../db/migrate.js';
import { makeFloorCountProbe, makeFloorSourceStateProbe, makeGameplayKindProbe } from './quality-grid.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run quality-grid.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const sql = postgres(url, { onnotice: () => {} });

async function seed(): Promise<void> {
  await runMigrations(sql);
  // TRUNCATE only the tables this test touches; CASCADE picks up FK dependencies
  // (per-version tables, transitions, etc.) so re-runs start from a clean slate.
  await sql`TRUNCATE entities RESTART IDENTITY CASCADE`;
  await sql`TRUNCATE versions RESTART IDENTITY CASCADE`;
  const now = new Date().toISOString();
  // Seed a versions row so quality-grid probes that JOIN versions don't return
  // empty (the probes themselves only count entities, but we want the test
  // schema to look like a real load).
  await sql`
    INSERT INTO versions (project, version, commit_sha, ordinal, extracted_at)
    VALUES
      ('fte', 'build-6698', 'abc', 6698, ${now}),
      ('ezquake', 'head', 'def', 999999, ${now})
  `;
  await sql`
    INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
    VALUES
      ('fte', 'cvar', 'cv_one', 'fte:cvar:cv_one', 'source_backed', 'build-6698', 'build-6698', ${now}, ${now}),
      ('fte', 'cvar', 'cv_two', 'fte:cvar:cv_two', 'source_backed', 'build-6698', 'build-6698', ${now}, ${now}),
      ('fte', 'command', 'cmd_one', 'fte:command:cmd_one', 'source_backed', 'build-6698', 'build-6698', ${now}, ${now}),
      ('ezquake', 'cvar', 'cv_three', 'ezquake:cvar:cv_three', 'doc_only', 'head', 'head', ${now}, ${now})
  `;
}

describe('makeFloorCountProbe', () => {
  beforeEach(async () => { await seed(); });

  it('returns PASS when count matches expected', async () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
    expect(result.count).toBe(2);
  });

  it('returns FAIL when count differs from expected', async () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 99);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('FAIL');
    expect(result.count).toBe(2);
  });

  it('skips when project does not match the probe project', async () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = await probe.run({ sql, project: 'ezquake' });
    expect(result.status).toBe('PASS');
    expect(result.summary).toMatch(/skipped/);
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    expect(probe.name).toBe('F1.fte.floor.cvar_count');
    expect(probe.family).toBe('regression');
  });
});

describe('makeFloorSourceStateProbe', () => {
  beforeEach(async () => { await seed(); });

  it('returns PASS when source_state distribution matches', async () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
  });

  it('returns FAIL when source_state distribution differs', async () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 1, doc_only: 1 });
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('FAIL');
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    expect(probe.name).toBe('F1.fte.floor.cvar_source_state');
    expect(probe.family).toBe('regression');
  });
});

describe('makeGameplayKindProbe', () => {
  beforeEach(async () => { await seed(); });
  afterAll(async () => { await sql.end(); });

  it('uses canonical probe name', () => {
    const probe = makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27);
    expect(probe.name).toBe('F1.ktx.gameplay_kind.game_mode_count');
    expect(probe.family).toBe('regression');
  });

  it('skips when project does not match the probe gameplay_source_id', async () => {
    const probe = makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
    expect(result.summary).toMatch(/skipped/);
  });
});
