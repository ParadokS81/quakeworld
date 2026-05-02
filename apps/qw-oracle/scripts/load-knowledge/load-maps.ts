// apps/qw-oracle/scripts/load-knowledge/load-maps.ts
//
// Loader for the schema-v13 `maps` table. Reads the qw extractor's
// JSON output and upserts each record by canonical_name.

import { readFileSync } from 'node:fs';
import type postgres from 'postgres';

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

export interface LoadMapsResult {
  inserted: number;
  updated: number;
  total: number;
}

export async function loadMapsFromArray(sql: postgres.Sql, records: MapAstRecord[]): Promise<LoadMapsResult> {
  // Pre-fetch existing keys so we can report inserted vs updated accurately.
  const existingRows = await sql<{ canonical_name: string }[]>`SELECT canonical_name FROM maps`;
  const existing = new Set<string>(existingRows.map((r) => r.canonical_name));

  let inserted = 0;
  let updated = 0;
  await sql.begin(async (tx) => {
    for (const r of records) {
      // Postgres-side JSONB columns: pass JS values directly; postgres-js
      // auto-encodes objects/arrays. Pre-stringifying defeats the type and
      // sends the value as TEXT, which Postgres then implicit-casts to JSONB
      // (round-trips correctly but adds a copy). Send native to skip the copy.
      await tx`
        INSERT INTO maps (
          canonical_name, file_name, display_name, author,
          bsp_version, bsp_size_bytes, bsp_sha256,
          worldspawn_json, entity_count, class_counts_json,
          item_summary_json, spawn_summary_json, features_json,
          wads_referenced_json, inferred_gamemodes_json,
          popularity_total, popularity_by_mode_json, popularity_rank,
          notes, source_bsp_url, extracted_at
        ) VALUES (
          ${r.canonical_name}, ${r.file_name}, ${r.display_name}, ${r.author},
          ${r.bsp_version}, ${r.bsp_size_bytes}, ${r.bsp_sha256},
          ${tx.json(r.worldspawn)}, ${r.entity_count}, ${tx.json(r.class_counts)},
          ${tx.json(r.item_summary)}, ${tx.json(r.spawn_summary)}, ${tx.json(r.features)},
          ${tx.json(r.wads_referenced)}, ${tx.json(r.inferred_gamemodes)},
          ${r.popularity_total}, ${r.popularity_by_mode ? tx.json(r.popularity_by_mode) : null}, ${r.popularity_rank},
          ${r.notes}, ${r.source_bsp_url}, ${r.extracted_at}
        )
        ON CONFLICT (canonical_name) DO UPDATE SET
          file_name               = EXCLUDED.file_name,
          display_name            = EXCLUDED.display_name,
          author                  = EXCLUDED.author,
          bsp_version             = EXCLUDED.bsp_version,
          bsp_size_bytes          = EXCLUDED.bsp_size_bytes,
          bsp_sha256              = EXCLUDED.bsp_sha256,
          worldspawn_json         = EXCLUDED.worldspawn_json,
          entity_count            = EXCLUDED.entity_count,
          class_counts_json       = EXCLUDED.class_counts_json,
          item_summary_json       = EXCLUDED.item_summary_json,
          spawn_summary_json      = EXCLUDED.spawn_summary_json,
          features_json           = EXCLUDED.features_json,
          wads_referenced_json    = EXCLUDED.wads_referenced_json,
          inferred_gamemodes_json = EXCLUDED.inferred_gamemodes_json,
          popularity_total        = EXCLUDED.popularity_total,
          popularity_by_mode_json = EXCLUDED.popularity_by_mode_json,
          popularity_rank         = EXCLUDED.popularity_rank,
          notes                   = EXCLUDED.notes,
          source_bsp_url          = EXCLUDED.source_bsp_url,
          extracted_at            = EXCLUDED.extracted_at
      `;
      if (existing.has(r.canonical_name)) updated += 1;
      else inserted += 1;
    }
  });
  return { inserted, updated, total: records.length };
}

export async function loadMapsFromFile(sql: postgres.Sql, jsonPath: string): Promise<LoadMapsResult> {
  const records = JSON.parse(readFileSync(jsonPath, 'utf-8')) as MapAstRecord[];
  return loadMapsFromArray(sql, records);
}
