// apps/qw-oracle/scripts/load-knowledge/load-maps.ts
//
// Loader for the schema-v13 `maps` table. Reads the qw extractor's
// JSON output and upserts each record by canonical_name.

import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';

export interface MapAstRecord {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: 'V29' | 'BSP2';
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

const UPSERT_SQL = `
INSERT INTO maps (
  canonical_name, file_name, display_name, author,
  bsp_version, bsp_size_bytes, bsp_sha256,
  worldspawn_json, entity_count, class_counts_json,
  item_summary_json, spawn_summary_json, features_json,
  wads_referenced_json, inferred_gamemodes_json,
  popularity_total, popularity_by_mode_json, popularity_rank,
  notes, source_bsp_url, extracted_at
) VALUES (
  @canonical_name, @file_name, @display_name, @author,
  @bsp_version, @bsp_size_bytes, @bsp_sha256,
  @worldspawn_json, @entity_count, @class_counts_json,
  @item_summary_json, @spawn_summary_json, @features_json,
  @wads_referenced_json, @inferred_gamemodes_json,
  @popularity_total, @popularity_by_mode_json, @popularity_rank,
  @notes, @source_bsp_url, @extracted_at
)
ON CONFLICT(canonical_name) DO UPDATE SET
  file_name               = excluded.file_name,
  display_name            = excluded.display_name,
  author                  = excluded.author,
  bsp_version             = excluded.bsp_version,
  bsp_size_bytes          = excluded.bsp_size_bytes,
  bsp_sha256              = excluded.bsp_sha256,
  worldspawn_json         = excluded.worldspawn_json,
  entity_count            = excluded.entity_count,
  class_counts_json       = excluded.class_counts_json,
  item_summary_json       = excluded.item_summary_json,
  spawn_summary_json      = excluded.spawn_summary_json,
  features_json           = excluded.features_json,
  wads_referenced_json    = excluded.wads_referenced_json,
  inferred_gamemodes_json = excluded.inferred_gamemodes_json,
  popularity_total        = excluded.popularity_total,
  popularity_by_mode_json = excluded.popularity_by_mode_json,
  popularity_rank         = excluded.popularity_rank,
  notes                   = excluded.notes,
  source_bsp_url          = excluded.source_bsp_url,
  extracted_at            = excluded.extracted_at
;
`;

function recordToParams(r: MapAstRecord): Record<string, unknown> {
  return {
    canonical_name: r.canonical_name,
    file_name: r.file_name,
    display_name: r.display_name,
    author: r.author,
    bsp_version: r.bsp_version,
    bsp_size_bytes: r.bsp_size_bytes,
    bsp_sha256: r.bsp_sha256,
    worldspawn_json: JSON.stringify(r.worldspawn),
    entity_count: r.entity_count,
    class_counts_json: JSON.stringify(r.class_counts),
    item_summary_json: JSON.stringify(r.item_summary),
    spawn_summary_json: JSON.stringify(r.spawn_summary),
    features_json: JSON.stringify(r.features),
    wads_referenced_json: JSON.stringify(r.wads_referenced),
    inferred_gamemodes_json: JSON.stringify(r.inferred_gamemodes),
    popularity_total: r.popularity_total,
    popularity_by_mode_json: r.popularity_by_mode ? JSON.stringify(r.popularity_by_mode) : null,
    popularity_rank: r.popularity_rank,
    notes: r.notes,
    source_bsp_url: r.source_bsp_url,
    extracted_at: r.extracted_at,
  };
}

export interface LoadMapsResult {
  inserted: number;
  updated: number;
  total: number;
}

export function loadMapsFromArray(db: Database.Database, records: MapAstRecord[]): LoadMapsResult {
  const upsert = db.prepare(UPSERT_SQL);
  // Pre-fetch existing keys so we can report inserted vs updated accurately.
  // The upsert itself is the source of truth for persistence; this set is
  // only used for bookkeeping.
  const existing = new Set<string>(
    (db.prepare(`SELECT canonical_name FROM maps`).all() as Array<{ canonical_name: string }>)
      .map((r) => r.canonical_name),
  );
  let inserted = 0;
  let updated = 0;
  const txn = db.transaction((rows: MapAstRecord[]) => {
    for (const r of rows) {
      upsert.run(recordToParams(r));
      if (existing.has(r.canonical_name)) updated += 1;
      else inserted += 1;
    }
  });
  txn(records);
  return { inserted, updated, total: records.length };
}

export function loadMapsFromFile(db: Database.Database, jsonPath: string): LoadMapsResult {
  const records = JSON.parse(readFileSync(jsonPath, 'utf-8')) as MapAstRecord[];
  return loadMapsFromArray(db, records);
}
