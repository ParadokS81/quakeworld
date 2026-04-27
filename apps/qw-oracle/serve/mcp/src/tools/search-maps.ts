// apps/qw-oracle/serve/mcp/src/tools/search-maps.ts
//
// Filters happen in TS (not SQL json_extract) because map count is ~250 --
// small enough that a full table scan + JS-side filter is faster to maintain
// than building dynamic JSON-extract WHERE clauses and binding parameters.
import type { Database } from 'bun:sqlite';
import { SERVER_VERSION } from '../version.ts';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface SearchMapsArgs {
  has_weapon?: string[];
  lacks_weapon?: string[];
  has_powerup?: string[];
  lacks_powerup?: string[];
  has_armor?: string[];
  has_water?: boolean;
  has_lava?: boolean;
  has_slime?: boolean;
  has_teleporters?: boolean;
  gamemode?: '1on1' | '2on2' | '4on4' | 'ffa';
  min_popularity_rank?: number;
  max_popularity_rank?: number;
  min_dm_spawns?: number;
  max_dm_spawns?: number;
  limit?: number;
}

export interface SearchMapsRow {
  canonical_name: string;
  display_name: string | null;
  popularity_rank: number | null;
  popularity_total: number | null;
  dm_spawns: number;
  inferred_gamemodes: string[];
  items_compact: string;
}

export interface SearchMapsResponse {
  results: SearchMapsRow[];
  count: number;
  meta: { tool: string; server_version: string; queried_at: string };
}

// Fixed display order for items_compact -- mirrors what a player cares about
// when scanning a map list: armor tier, then powerups, then weapons.
const ARMOR_ORDER: Array<[string, string]> = [['ra', 'RA'], ['ya', 'YA'], ['ga', 'GA']];
const POWERUP_ORDER: Array<[string, string]> = [['quad', 'quad'], ['pent', 'pent'], ['ring', 'ring'], ['bio', 'bio']];
const WEAPON_ORDER: Array<[string, string]> = [['ssg', 'SSG'], ['ng', 'NG'], ['sng', 'SNG'], ['gl', 'GL'], ['rl', 'RL'], ['lg', 'LG']];

function buildItemsCompact(
  item_summary: Record<string, number>,
  features: { has_water: boolean; has_lava: boolean; has_slime: boolean },
): string {
  const armors   = ARMOR_ORDER.filter(([k])   => (item_summary[k] ?? 0) > 0).map(([, label]) => label);
  const powerups = POWERUP_ORDER.filter(([k]) => (item_summary[k] ?? 0) > 0).map(([, label]) => label);
  const weapons  = WEAPON_ORDER.filter(([k])  => (item_summary[k] ?? 0) > 0).map(([, label]) => label);
  const liquids: string[] = [];
  if (features.has_water) liquids.push('water');
  if (features.has_lava)  liquids.push('lava');
  if (features.has_slime) liquids.push('slime');
  const parts: string[] = [];
  if (armors.length || powerups.length) parts.push([...armors, ...powerups].join(' '));
  if (weapons.length)                   parts.push(weapons.join(' '));
  if (liquids.length)                   parts.push(liquids.join('+'));
  return parts.join(' | ');
}

interface RawRow {
  canonical_name: string;
  display_name: string | null;
  popularity_rank: number | null;
  popularity_total: number | null;
  spawn_summary_json: string;
  inferred_gamemodes_json: string;
  item_summary_json: string;
  features_json: string;
}

export function searchMaps(db: Database, args: SearchMapsArgs): SearchMapsResponse {
  const rows = db.query(`
    SELECT canonical_name, display_name, popularity_rank, popularity_total,
           spawn_summary_json, inferred_gamemodes_json, item_summary_json, features_json
    FROM maps
  `).all() as RawRow[];

  const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const filtered: SearchMapsRow[] = [];
  for (const row of rows) {
    const items    = JSON.parse(row.item_summary_json)       as Record<string, number>;
    const features = JSON.parse(row.features_json)           as { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
    const spawns   = JSON.parse(row.spawn_summary_json)      as Record<string, number>;
    const modes    = JSON.parse(row.inferred_gamemodes_json) as string[];

    if (args.has_weapon?.length    && !args.has_weapon.every((w) => (items[w] ?? 0) > 0))    continue;
    if (args.lacks_weapon?.length  && args.lacks_weapon.some((w) => (items[w] ?? 0) > 0))    continue;
    if (args.has_powerup?.length   && !args.has_powerup.every((p) => (items[p] ?? 0) > 0))   continue;
    if (args.lacks_powerup?.length && args.lacks_powerup.some((p) => (items[p] ?? 0) > 0))   continue;
    if (args.has_armor?.length     && !args.has_armor.every((a) => (items[a] ?? 0) > 0))      continue;
    if (args.has_water      != null && features.has_water            !== args.has_water)       continue;
    if (args.has_lava       != null && features.has_lava             !== args.has_lava)        continue;
    if (args.has_slime      != null && features.has_slime            !== args.has_slime)       continue;
    if (args.has_teleporters != null && (features.teleporters > 0)   !== args.has_teleporters) continue;
    if (args.gamemode && !modes.includes(args.gamemode))                                       continue;
    if (args.min_popularity_rank != null && (row.popularity_rank == null || row.popularity_rank < args.min_popularity_rank)) continue;
    if (args.max_popularity_rank != null && (row.popularity_rank == null || row.popularity_rank > args.max_popularity_rank)) continue;
    if (args.min_dm_spawns != null && (spawns['dm'] ?? 0) < args.min_dm_spawns) continue;
    if (args.max_dm_spawns != null && (spawns['dm'] ?? 0) > args.max_dm_spawns) continue;

    filtered.push({
      canonical_name:    row.canonical_name,
      display_name:      row.display_name,
      popularity_rank:   row.popularity_rank,
      popularity_total:  row.popularity_total,
      dm_spawns:         spawns['dm'] ?? 0,
      inferred_gamemodes: modes,
      items_compact:     buildItemsCompact(items, features),
    });
  }

  // Sort: popularity_rank ASC NULLS LAST, then canonical_name ASC as tiebreak.
  filtered.sort((a, b) => {
    if (a.popularity_rank == null && b.popularity_rank == null) return a.canonical_name.localeCompare(b.canonical_name);
    if (a.popularity_rank == null) return 1;
    if (b.popularity_rank == null) return -1;
    return a.popularity_rank - b.popularity_rank;
  });

  return {
    results: filtered.slice(0, limit),
    count:   filtered.length,
    meta: {
      tool:           'search_maps',
      server_version: SERVER_VERSION,
      queried_at:     new Date().toISOString(),
    },
  };
}
