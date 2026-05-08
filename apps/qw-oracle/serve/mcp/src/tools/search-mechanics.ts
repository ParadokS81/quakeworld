// apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts
//
// Layer 1 qw-namespace gameplay-mechanic listing/filter. Postgres-js port:
// ILIKE for case-insensitive substring (no COLLATE NOCASE), parameterised
// fragments via tagged-template composition.

import { db } from '../db.ts';
import type { ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

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

export type SearchMechanicsResponse = ToolResponse<SearchMechanicsRow>;

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function searchMechanics(args: SearchMechanicsArgs): Promise<SearchMechanicsResponse> {
  const meta = {
    tool: 'search_mechanics',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const queryClause = args.query
    ? db`AND (name ILIKE ${'%' + args.query + '%'}
              OR value_text ILIKE ${'%' + args.query + '%'}
              OR notes ILIKE ${'%' + args.query + '%'})`
    : db``;
  const kindClause = args.kind ? db`AND kind = ${args.kind}` : db``;

  const rowsPlusOne = await db<SearchMechanicsRow[]>`
    SELECT kind, name, value_numeric, value_text, source_ref
    FROM gameplay_mechanics
    WHERE gameplay_source_id = ${source}
      ${queryClause}
      ${kindClause}
    ORDER BY kind, name
    LIMIT ${limit + 1}
  `;
  const truncated = rowsPlusOne.length > limit;
  const rows = rowsPlusOne.slice(0, limit);

  return {
    results: rows,
    match_quality: rows.length > 0 ? 'strong' : 'none',
    suggested_fallback: rows.length === 0
      ? `No mechanics match the given filters in source '${source}'. Try broadening the kind filter or removing the substring query.`
      : null,
    truncated,
    meta,
  };
}
