// Uses bun:sqlite + bun:test because the MCP server runs under Bun.
// The shared `db.ts` opens databases via bun:sqlite; tools must accept that.
//
// Run: cd apps/qw-oracle/serve/mcp && bun test src/tools/maps.test.ts
import { describe, expect, test, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';

import { lookupMap } from './lookup-map.ts';

// Schema-v13 maps table inlined here (we don't pull from the loader's
// schema.ts because that uses better-sqlite3-specific Database type).
const MAPS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS maps (
  canonical_name           TEXT PRIMARY KEY,
  file_name                TEXT NOT NULL,
  display_name             TEXT,
  author                   TEXT,
  bsp_version              TEXT NOT NULL,
  bsp_size_bytes           INTEGER NOT NULL,
  bsp_sha256               TEXT NOT NULL,
  worldspawn_json          TEXT NOT NULL,
  entity_count             INTEGER NOT NULL,
  class_counts_json        TEXT NOT NULL,
  item_summary_json        TEXT NOT NULL,
  spawn_summary_json       TEXT NOT NULL,
  features_json            TEXT NOT NULL,
  wads_referenced_json     TEXT NOT NULL,
  inferred_gamemodes_json  TEXT NOT NULL,
  popularity_total         INTEGER,
  popularity_by_mode_json  TEXT,
  popularity_rank          INTEGER,
  notes                    TEXT,
  source_bsp_url           TEXT NOT NULL,
  extracted_at             TEXT NOT NULL
);
`;

interface SampleMap {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: string;
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn: Record<string, string>;
  entity_count: number;
  class_counts: Record<string, number>;
  item_summary: Record<string, number>;
  spawn_summary: Record<string, number>;
  features: { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
  wads_referenced: string[];
  inferred_gamemodes: string[];
  popularity_total: number | null;
  popularity_by_mode: Record<string, number> | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

// bun:sqlite db.run() spread signature makes TS infer the object as an array;
// cast to any to use named $param bindings without fighting the overload.
function insertMap(db: Database, m: SampleMap): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db.run(`
    INSERT INTO maps VALUES (
      $canonical_name, $file_name, $display_name, $author,
      $bsp_version, $bsp_size_bytes, $bsp_sha256,
      $worldspawn_json, $entity_count, $class_counts_json,
      $item_summary_json, $spawn_summary_json, $features_json,
      $wads_referenced_json, $inferred_gamemodes_json,
      $popularity_total, $popularity_by_mode_json, $popularity_rank,
      $notes, $source_bsp_url, $extracted_at
    )`,
    {
      $canonical_name: m.canonical_name,
      $file_name: m.file_name,
      $display_name: m.display_name,
      $author: m.author,
      $bsp_version: m.bsp_version,
      $bsp_size_bytes: m.bsp_size_bytes,
      $bsp_sha256: m.bsp_sha256,
      $worldspawn_json: JSON.stringify(m.worldspawn),
      $entity_count: m.entity_count,
      $class_counts_json: JSON.stringify(m.class_counts),
      $item_summary_json: JSON.stringify(m.item_summary),
      $spawn_summary_json: JSON.stringify(m.spawn_summary),
      $features_json: JSON.stringify(m.features),
      $wads_referenced_json: JSON.stringify(m.wads_referenced),
      $inferred_gamemodes_json: JSON.stringify(m.inferred_gamemodes),
      $popularity_total: m.popularity_total,
      $popularity_by_mode_json: m.popularity_by_mode ? JSON.stringify(m.popularity_by_mode) : null,
      $popularity_rank: m.popularity_rank,
      $notes: m.notes,
      $source_bsp_url: m.source_bsp_url,
      $extracted_at: m.extracted_at,
    } as any,
  );
}

const SAMPLES: SampleMap[] = [
  {
    canonical_name: 'dm3',
    file_name: 'dm3.bsp',
    display_name: 'The Abandoned Base',
    author: null,
    bsp_version: 'V29',
    bsp_size_bytes: 1348355,
    bsp_sha256: 'a'.repeat(64),
    worldspawn: { message: 'The Abandoned Base', wad: 'gfx/base.wad' },
    entity_count: 211,
    class_counts: { worldspawn: 1, info_player_deathmatch: 6 },
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
  },
  {
    canonical_name: 'aerowalk',
    file_name: 'aerowalk.bsp',
    display_name: 'Aerowalk',
    author: 'Preacher',
    bsp_version: 'V29',
    bsp_size_bytes: 632040,
    bsp_sha256: 'b'.repeat(64),
    worldspawn: { message: 'Aerowalk' },
    entity_count: 345,
    class_counts: { info_player_deathmatch: 6 },
    item_summary: {
      ra: 1, ya: 1, ga: 2, mh: 0, h25: 9, h15: 0,
      quad: 0, pent: 0, ring: 0, bio: 0,
      ssg: 0, ng: 0, sng: 2, gl: 1, rl: 2, lg: 1,
      cells: 4, rockets: 4, spikes: 4, shells: 0,
    },
    spawn_summary: { dm: 6, team1: 0, team2: 0, coop: 0, start: 1, intermission: 1 },
    features: { teleporters: 4, has_water: false, has_lava: false, has_slime: false },
    wads_referenced: ['preach.wad'],
    inferred_gamemodes: ['1on1', '2on2'],
    popularity_total: 317194,
    popularity_by_mode: { '1on1': 248640, '2on2': 46708, '4on4': 34, ffa: 21827 },
    popularity_rank: 4,
    notes: null,
    source_bsp_url: 'https://maps.quakeworld.nu/base/aerowalk.bsp',
    extracted_at: '2026-04-26T00:00:00Z',
  },
  {
    canonical_name: 'povdmm4',
    file_name: 'povdmm4.bsp',
    display_name: 'DMM4 Arena By Povo-Hat',
    author: 'Povo-Hat',
    bsp_version: 'V29',
    bsp_size_bytes: 130920,
    bsp_sha256: 'c'.repeat(64),
    worldspawn: { message: 'DMM4 Arena By Povo-Hat' },
    entity_count: 26,
    class_counts: { info_player_deathmatch: 4, item_armor2: 2 },
    item_summary: {
      ra: 0, ya: 2, ga: 0, mh: 0, h25: 0, h15: 0,
      quad: 0, pent: 0, ring: 0, bio: 0,
      ssg: 0, ng: 0, sng: 0, gl: 0, rl: 0, lg: 0,
      cells: 0, rockets: 0, spikes: 0, shells: 0,
    },
    spawn_summary: { dm: 4, team1: 0, team2: 0, coop: 0, start: 1, intermission: 0 },
    features: { teleporters: 0, has_water: false, has_lava: false, has_slime: false },
    wads_referenced: [],
    inferred_gamemodes: ['1on1'],
    popularity_total: 674619,
    popularity_by_mode: { '1on1': 672239, '2on2': 738, '4on4': 23, ffa: 1619 },
    popularity_rank: 1,
    notes: null,
    source_bsp_url: 'https://maps.quakeworld.nu/base/povdmm4.bsp',
    extracted_at: '2026-04-26T00:00:00Z',
  },
];

function newDbWithSamples(): Database {
  const db = new Database(':memory:');
  db.exec(MAPS_TABLE_SQL);
  for (const s of SAMPLES) insertMap(db, s);
  return db;
}

describe('lookupMap', () => {
  let db: Database;
  beforeAll(() => { db = newDbWithSamples(); });

  test('returns full record for known map', () => {
    const r = lookupMap(db, { name: 'dm3' });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error('unreachable');
    expect(r.record.canonical_name).toBe('dm3');
    expect(r.record.display_name).toBe('The Abandoned Base');
    expect(r.record.item_summary.lg).toBe(1);
    expect(r.record.features.has_water).toBe(true);
    expect(r.record.popularity?.rank).toBe(10);
    expect(r.record.author).toBe('unknown');
  });

  test('case-insensitive name match', () => {
    const r = lookupMap(db, { name: 'AeroWalk' });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error('unreachable');
    expect(r.record.canonical_name).toBe('aerowalk');
  });

  test('returns found:false with suggestion for typo', () => {
    const r = lookupMap(db, { name: 'aerowalk2' });
    expect(r.found).toBe(false);
    if (r.found) throw new Error('unreachable');
    expect(r.suggestion).toBe('aerowalk');
  });

  test('NULL author surfaced as "unknown"', () => {
    const r = lookupMap(db, { name: 'dm3' });
    expect(r.found).toBe(true);
    if (!r.found) throw new Error('unreachable');
    expect(r.record.author).toBe('unknown');
  });
});
