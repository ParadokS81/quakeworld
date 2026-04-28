// Uses node:test + tsx because better-sqlite3 is a native Node addon that
// Bun cannot load. Run with: tsx --test scripts/load-knowledge/quality-grid.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { applySchema } from './schema.js';
import { makeFloorCountProbe, makeFloorSourceStateProbe } from './quality-grid.js';

function newDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  const now = new Date().toISOString();
  db.exec(`
    INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
    VALUES
      ('fte', 'cvar', 'cv_one', 'fte:cvar:cv_one', 'source_backed', 'build-6698', 'build-6698', '${now}', '${now}'),
      ('fte', 'cvar', 'cv_two', 'fte:cvar:cv_two', 'source_backed', 'build-6698', 'build-6698', '${now}', '${now}'),
      ('fte', 'command', 'cmd_one', 'fte:command:cmd_one', 'source_backed', 'build-6698', 'build-6698', '${now}', '${now}'),
      ('ezquake', 'cvar', 'cv_three', 'ezquake:cvar:cv_three', 'doc_only', 'head', 'head', '${now}', '${now}');
  `);
  return db;
}

describe('makeFloorCountProbe', () => {
  it('returns PASS when count matches expected', () => {
    const db = newDb();
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'PASS');
    assert.equal(result.count, 2);
  });

  it('returns FAIL when count differs from expected', () => {
    const db = newDb();
    const probe = makeFloorCountProbe('fte', 'cvar', 99);
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'FAIL');
    assert.equal(result.count, 2);
  });

  it('skips when project does not match the probe project', () => {
    const db = newDb();
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = probe.run({ db, project: 'ezquake' });
    assert.equal(result.status, 'PASS');
    assert.match(result.summary, /skipped/);
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    assert.equal(probe.name, 'F1.fte.floor.cvar_count');
    assert.equal(probe.family, 'regression');
  });
});

describe('makeFloorSourceStateProbe', () => {
  it('returns PASS when source_state distribution matches', () => {
    const db = newDb();
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'PASS');
  });

  it('returns FAIL when source_state distribution differs', () => {
    const db = newDb();
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 1, doc_only: 1 });
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'FAIL');
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    assert.equal(probe.name, 'F1.fte.floor.cvar_source_state');
    assert.equal(probe.family, 'regression');
  });
});
