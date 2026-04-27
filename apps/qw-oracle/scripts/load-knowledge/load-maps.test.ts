// Uses node:test + tsx because better-sqlite3 is a native Node addon that
// Bun cannot load. Run with: tsx --test scripts/load-knowledge/load-maps.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { applySchema } from './schema.js';
import { loadMapsFromArray, type MapAstRecord } from './load-maps.js';

function newDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  return db;
}

const SAMPLE: MapAstRecord = {
  canonical_name: 'dm3',
  file_name: 'dm3.bsp',
  display_name: 'The Abandoned Base',
  author: null,
  bsp_version: 'V29',
  bsp_size_bytes: 1348355,
  bsp_sha256: 'a'.repeat(64),
  worldspawn: { message: 'The Abandoned Base', wad: 'gfx/base.wad' },
  entity_count: 211,
  class_counts: { worldspawn: 1, info_player_deathmatch: 6, light: 50 },
  item_summary: {
    ra: 0, ya: 1, ga: 0, mh: 1, h25: 8, h15: 1,
    quad: 1, pent: 1, ring: 1, bio: 0,
    ssg: 1, ng: 1, sng: 1, gl: 1, rl: 1, lg: 1,
    cells: 3, rockets: 7, spikes: 11, shells: 9,
  },
  spawn_summary: { dm: 6, team1: 0, team2: 0, coop: 0, start: 1, intermission: 4 },
  features: { teleporters: 2, has_water: true, has_lava: false, has_slime: false },
  wads_referenced: ['base.wad'],
  inferred_gamemodes: ['4on4'],
  popularity_total: 49789,
  popularity_by_mode: { '1on1': 2741, '2on2': 1109, '4on4': 39037, ffa: 6902 },
  popularity_rank: 10,
  notes: null,
  source_bsp_url: 'pak0/pak1 stock id1',
  extracted_at: '2026-04-26T00:00:00Z',
};

describe('loadMapsFromArray', () => {
  it('inserts a single record', () => {
    const db = newDb();
    const result = loadMapsFromArray(db, [SAMPLE]);
    assert.equal(result.inserted, 1);
    assert.equal(result.updated, 0);
    const row = db.prepare(`SELECT canonical_name, display_name, popularity_rank
                            FROM maps WHERE canonical_name = ?`).get('dm3') as any;
    assert.equal(row.canonical_name, 'dm3');
    assert.equal(row.display_name, 'The Abandoned Base');
    assert.equal(row.popularity_rank, 10);
  });

  it('upsert is idempotent and updates an existing row', () => {
    const db = newDb();
    loadMapsFromArray(db, [SAMPLE]);
    const updated = { ...SAMPLE, popularity_rank: 12, popularity_total: 50000 };
    const result = loadMapsFromArray(db, [updated]);
    assert.equal(result.inserted, 0);
    assert.equal(result.updated, 1);
    const row = db.prepare(`SELECT popularity_rank, popularity_total
                            FROM maps WHERE canonical_name = ?`).get('dm3') as any;
    assert.equal(row.popularity_rank, 12);
    assert.equal(row.popularity_total, 50000);
  });

  it('JSON columns are stringified arrays/objects', () => {
    const db = newDb();
    loadMapsFromArray(db, [SAMPLE]);
    const row = db.prepare(`SELECT item_summary_json, features_json, inferred_gamemodes_json
                            FROM maps WHERE canonical_name = ?`).get('dm3') as any;
    const items = JSON.parse(row.item_summary_json);
    assert.equal(items.lg, 1);
    const features = JSON.parse(row.features_json);
    assert.equal(features.has_water, true);
    const modes = JSON.parse(row.inferred_gamemodes_json);
    assert.deepEqual(modes, ['4on4']);
  });

  it('NULL popularity columns when stats absent', () => {
    const db = newDb();
    const noPop = { ...SAMPLE, canonical_name: 'unknownmap',
                    popularity_total: null, popularity_by_mode: null, popularity_rank: null };
    loadMapsFromArray(db, [noPop]);
    const row = db.prepare(`SELECT popularity_rank, popularity_by_mode_json
                            FROM maps WHERE canonical_name = ?`).get('unknownmap') as any;
    assert.equal(row.popularity_rank, null);
    assert.equal(row.popularity_by_mode_json, null);
  });
});
