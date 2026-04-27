import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

export type SearchGameplayEntitiesArgs = {
  query?: string;
  kind?: 'item' | 'weapon' | 'projectile';
  has_splash?: boolean;
  min_damage?: number;
  max_damage?: number;
  min_respawn?: number;
  max_respawn?: number;
  ammo_type?: 'shells' | 'nails' | 'rockets' | 'cells';
  gameplay_source?: string;
  limit?: number;
};

export interface SearchGameplayEntityRow {
  kind: string;
  name: string;
  classname: string | null;
  damage: number | null;
  splash_damage: number | null;
  splash_radius: number | null;
  refire_seconds: number | null;
  respawn_seconds: number | null;
  pickup_amount: number | null;
  duration_seconds: number | null;
  source_ref: string;
}

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export interface SearchGameplayEntitiesResponse {
  rows: SearchGameplayEntityRow[];
  count: number;
  truncated: boolean;
  meta: Meta;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export function searchGameplayEntities(db: Database, args: SearchGameplayEntitiesArgs): SearchGameplayEntitiesResponse {
  const meta: Meta = {
    tool: 'search_gameplay_entities',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const where: string[] = ['gameplay_source_id = ?'];
  const params: unknown[] = [source];

  if (args.query) {
    where.push('(name LIKE ? COLLATE NOCASE OR classname LIKE ? COLLATE NOCASE)');
    const q = `%${args.query}%`;
    params.push(q, q);
  }
  if (args.kind) { where.push('kind = ?'); params.push(args.kind); }
  if (args.has_splash === true)  { where.push('splash_damage IS NOT NULL AND splash_damage > 0'); }
  if (args.has_splash === false) { where.push('(splash_damage IS NULL OR splash_damage = 0)'); }
  if (typeof args.min_damage === 'number') { where.push('damage >= ?'); params.push(args.min_damage); }
  if (typeof args.max_damage === 'number') { where.push('damage <= ?'); params.push(args.max_damage); }
  if (typeof args.min_respawn === 'number') { where.push('respawn_seconds >= ?'); params.push(args.min_respawn); }
  if (typeof args.max_respawn === 'number') { where.push('respawn_seconds <= ?'); params.push(args.max_respawn); }
  if (args.ammo_type) {
    where.push("json_extract(props_json, '$.ammo_type') = ?");
    params.push(args.ammo_type);
  }

  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const sql = `
    SELECT kind, name, classname, damage, splash_damage, splash_radius,
           refire_seconds, respawn_seconds, pickup_amount, duration_seconds, source_ref
    FROM gameplay_entity_defs
    WHERE ${where.join(' AND ')}
    ORDER BY kind, name
    LIMIT ?
  `;
  params.push(limit + 1);
  const rowsPlusOne = db.query(sql).all(...params as never[]) as SearchGameplayEntityRow[];
  const truncated = rowsPlusOne.length > limit;
  const rows = rowsPlusOne.slice(0, limit);
  return { rows, count: rows.length, truncated, meta };
}
