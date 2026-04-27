// apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts
import type { Database } from 'bun:sqlite';
import { SERVER_VERSION } from '../version.ts';

export interface MapRecordRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string;
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
  popularity: { total: number; by_mode: Record<string, number>; rank: number } | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

export type LookupMapResponse =
  | { found: true; record: MapRecordRow; meta: { tool: string; server_version: string; queried_at: string } }
  | { found: false; name: string; suggestion: string | null; meta: { tool: string; server_version: string; queried_at: string } };

interface Args {
  name: string;
}

interface MapsTableRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: string;
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn_json: string;
  entity_count: number;
  class_counts_json: string;
  item_summary_json: string;
  spawn_summary_json: string;
  features_json: string;
  wads_referenced_json: string;
  inferred_gamemodes_json: string;
  popularity_total: number | null;
  popularity_by_mode_json: string | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

function rowToRecord(row: MapsTableRow): MapRecordRow {
  // All three popularity fields must be non-null to produce a popularity object.
  const popularity = row.popularity_rank != null && row.popularity_total != null && row.popularity_by_mode_json != null
    ? {
        total: row.popularity_total,
        by_mode: JSON.parse(row.popularity_by_mode_json) as Record<string, number>,
        rank: row.popularity_rank,
      }
    : null;
  return {
    canonical_name: row.canonical_name,
    file_name: row.file_name,
    display_name: row.display_name,
    // NULL author in DB means no attribution metadata; surface as "unknown"
    // rather than leaking null into MCP responses.
    author: row.author ?? 'unknown',
    bsp_version: row.bsp_version as 'V29' | 'BSP2',
    bsp_size_bytes: row.bsp_size_bytes,
    bsp_sha256: row.bsp_sha256,
    worldspawn: JSON.parse(row.worldspawn_json) as Record<string, string>,
    entity_count: row.entity_count,
    class_counts: JSON.parse(row.class_counts_json) as Record<string, number>,
    item_summary: JSON.parse(row.item_summary_json) as Record<string, number>,
    spawn_summary: JSON.parse(row.spawn_summary_json) as Record<string, number>,
    features: JSON.parse(row.features_json) as MapRecordRow['features'],
    wads_referenced: JSON.parse(row.wads_referenced_json) as string[],
    inferred_gamemodes: JSON.parse(row.inferred_gamemodes_json) as string[],
    popularity,
    notes: row.notes,
    source_bsp_url: row.source_bsp_url,
    extracted_at: row.extracted_at,
  };
}

// Simple iterative Levenshtein to find closest canonical_name on miss.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

function suggestClosest(db: Database, name: string): string | null {
  const rows = db.query(`SELECT canonical_name FROM maps`).all() as Array<{ canonical_name: string }>;
  let best: { name: string; dist: number } | null = null;
  const target = name.toLowerCase();
  for (const r of rows) {
    const d = levenshtein(target, r.canonical_name);
    if (best == null || d < best.dist) best = { name: r.canonical_name, dist: d };
  }
  if (!best) return null;
  // Suppress suggestions that are too distant to be useful typo hints.
  if (best.dist > Math.max(2, Math.floor(target.length / 3))) return null;
  return best.name;
}

export function lookupMap(db: Database, args: Args): LookupMapResponse {
  const meta = {
    tool: 'lookup_map',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const row = db
    .query(`SELECT * FROM maps WHERE canonical_name = ? COLLATE NOCASE`)
    .get(args.name) as MapsTableRow | null;
  if (!row) {
    return { found: false, name: args.name, suggestion: suggestClosest(db, args.name), meta };
  }
  return { found: true, record: rowToRecord(row), meta };
}
