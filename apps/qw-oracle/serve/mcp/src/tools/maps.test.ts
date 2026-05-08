// apps/qw-oracle/serve/mcp/src/tools/maps.test.ts
//
// Integration test against qw_oracle_test. Seeds two rows in beforeAll,
// asserts on the postgres-js-flavoured tools, TRUNCATEs in afterAll. The
// SQLite-era inline MAPS_TABLE_SQL is gone - the schema lives in the Phase
// 2 migration that the test DB already carries.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { lookupMap } from './lookup-map.ts';
import { searchMaps } from './search-maps.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');

describe.skipIf(!HAS_DB)('maps tools (postgres-js)', () => {
  beforeAll(async () => {
    await db`TRUNCATE maps`;
    await db`
      INSERT INTO maps (
        canonical_name, file_name, display_name, author,
        bsp_version, bsp_size_bytes, bsp_sha256,
        worldspawn_json, entity_count, class_counts_json,
        item_summary_json, spawn_summary_json, features_json,
        wads_referenced_json, inferred_gamemodes_json,
        popularity_total, popularity_by_mode_json, popularity_rank,
        notes, source_bsp_url, extracted_at
      ) VALUES
        (
          'aerowalk', 'aerowalk.bsp', 'Aerowalk', 'Preacher',
          'V29', 1234567, 'aaaaaaa',
          ${db.json({ message: 'Aerowalk' })}, 100, ${db.json({ info_player_deathmatch: 4 })},
          ${db.json({ rl: 1, lg: 1, ssg: 1 })}, ${db.json({ dm: 4 })}, ${db.json({ teleporters: 0, has_water: false, has_lava: false, has_slime: false })},
          ${db.json(['quake.wad'])}, ${db.json(['1on1'])},
          1000, ${db.json({ '1on1': 800 })}, 1,
          null, 'https://example.com/aerowalk.bsp', '2026-05-02T00:00:00Z'
        ),
        (
          'dm3', 'dm3.bsp', 'The Abandoned Base', 'American McGee',
          'V29', 234567, 'bbbbbbb',
          ${db.json({ message: 'The Abandoned Base' })}, 150, ${db.json({ info_player_deathmatch: 8 })},
          ${db.json({ rl: 1, lg: 1, sng: 1, ssg: 1, ng: 1 })}, ${db.json({ dm: 8 })}, ${db.json({ teleporters: 1, has_water: false, has_lava: true, has_slime: false })},
          ${db.json(['quake.wad'])}, ${db.json(['4on4'])},
          800, ${db.json({ '4on4': 800 })}, 2,
          null, 'https://example.com/dm3.bsp', '2026-05-02T00:00:00Z'
        )
    `;
  });

  afterAll(async () => {
    await db`TRUNCATE maps`;
  });

  test('lookupMap hit', async () => {
    const result = await lookupMap({ name: 'aerowalk' });
    expect(result.match_quality).toBe('strong');
    expect(result.results[0]?.canonical_name).toBe('aerowalk');
  });

  test('lookupMap is case-insensitive', async () => {
    const result = await lookupMap({ name: 'AeroWalk' });
    expect(result.match_quality).toBe('strong');
  });

  test('lookupMap miss with close suggestion', async () => {
    const result = await lookupMap({ name: 'aerowak' }); // 1-char typo
    expect(result.match_quality).toBe('none');
    expect(result.suggested_fallback).toContain('aerowalk');
  });

  test('searchMaps filter has_lava=true returns dm3 only', async () => {
    const result = await searchMaps({ has_lava: true });
    const names = result.results.map((r) => r.canonical_name);
    expect(names).toContain('dm3');
    expect(names).not.toContain('aerowalk');
  });
});
