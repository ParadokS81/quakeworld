// Integration tests against the qw_oracle_test Postgres database (D13).
// Run via `bun test` after `DATABASE_URL` is exported. The test runner script
// in package.json sets DATABASE_URL automatically.

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations } from '../../db/migrate.js';
import { loadMapsFromArray, type MapAstRecord } from './load-maps.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run load-maps.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const sql = postgres(url, { onnotice: () => {} });

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
  beforeEach(async () => {
    await runMigrations(sql);
    await sql`TRUNCATE maps`;
  });

  afterAll(async () => {
    await sql.end();
  });

  it('inserts a single record', async () => {
    const result = await loadMapsFromArray(sql, [SAMPLE]);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
    const rows = await sql<Array<{ canonical_name: string; display_name: string | null; popularity_rank: number | null }>>`
      SELECT canonical_name, display_name, popularity_rank
      FROM maps WHERE canonical_name = ${'dm3'}
    `;
    expect(rows[0]!.canonical_name).toBe('dm3');
    expect(rows[0]!.display_name).toBe('The Abandoned Base');
    expect(rows[0]!.popularity_rank).toBe(10);
  });

  it('upsert is idempotent and updates an existing row', async () => {
    await loadMapsFromArray(sql, [SAMPLE]);
    const updated = { ...SAMPLE, popularity_rank: 12, popularity_total: 50000 };
    const result = await loadMapsFromArray(sql, [updated]);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(1);
    const rows = await sql<Array<{ popularity_rank: number; popularity_total: number }>>`
      SELECT popularity_rank, popularity_total
      FROM maps WHERE canonical_name = ${'dm3'}
    `;
    expect(rows[0]!.popularity_rank).toBe(12);
    expect(rows[0]!.popularity_total).toBe(50000);
  });

  it('JSON columns round-trip as JS values (postgres-js auto-decodes JSONB)', async () => {
    await loadMapsFromArray(sql, [SAMPLE]);
    const rows = await sql<Array<{
      item_summary_json: Record<string, number>;
      features_json: { has_water: boolean; has_lava: boolean; has_slime: boolean; teleporters: number };
      inferred_gamemodes_json: string[];
    }>>`
      SELECT item_summary_json, features_json, inferred_gamemodes_json
      FROM maps WHERE canonical_name = ${'dm3'}
    `;
    expect(rows[0]!.item_summary_json.lg).toBe(1);
    expect(rows[0]!.features_json.has_water).toBe(true);
    expect(rows[0]!.inferred_gamemodes_json).toEqual(['4on4']);
  });

  it('NULL popularity columns when stats absent', async () => {
    const noPop = { ...SAMPLE, canonical_name: 'unknownmap',
                    popularity_total: null, popularity_by_mode: null, popularity_rank: null };
    await loadMapsFromArray(sql, [noPop]);
    const rows = await sql<Array<{ popularity_rank: number | null; popularity_by_mode_json: unknown }>>`
      SELECT popularity_rank, popularity_by_mode_json
      FROM maps WHERE canonical_name = ${'unknownmap'}
    `;
    expect(rows[0]!.popularity_rank).toBeNull();
    expect(rows[0]!.popularity_by_mode_json).toBeNull();
  });
});
