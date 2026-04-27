import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

export type SearchMechanicsArgs = {
  query?: string;
  kind?: 'constant' | 'env_hazard' | 'player_stat' | 'powerup_behavior'
       | 'armor_model' | 'death_rule' | 'spawn_rule' | 'dm_mode_rule';
  gameplay_source?: string;
  limit?: number;
};

export interface SearchMechanicsRow {
  kind: string;
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  source_ref: string;
}

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export interface SearchMechanicsResponse {
  rows: SearchMechanicsRow[];
  count: number;
  truncated: boolean;
  meta: Meta;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function searchMechanics(db: Database, args: SearchMechanicsArgs): SearchMechanicsResponse {
  const meta: Meta = {
    tool: 'search_mechanics',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const where: string[] = ['gameplay_source_id = ?'];
  const params: unknown[] = [source];

  if (args.query) {
    where.push('(name LIKE ? COLLATE NOCASE OR value_text LIKE ? COLLATE NOCASE OR notes LIKE ? COLLATE NOCASE)');
    const q = `%${args.query}%`;
    params.push(q, q, q);
  }
  if (args.kind) { where.push('kind = ?'); params.push(args.kind); }

  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const sql = `
    SELECT kind, name, value_numeric, value_text, source_ref
    FROM gameplay_mechanics
    WHERE ${where.join(' AND ')}
    ORDER BY kind, name
    LIMIT ?
  `;
  params.push(limit + 1);
  const rowsPlusOne = db.query(sql).all(...params as never[]) as SearchMechanicsRow[];
  const truncated = rowsPlusOne.length > limit;
  const rows = rowsPlusOne.slice(0, limit);
  return { rows, count: rows.length, truncated, meta };
}
