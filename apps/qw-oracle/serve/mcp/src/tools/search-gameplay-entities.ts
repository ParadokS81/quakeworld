// apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts
//
// Layer 1 qw-namespace gameplay-entity listing/filter. Postgres-js port:
// ILIKE for case-insensitive substring; JSONB ammo_type filter via the
// `props_json->>'ammo_type'` operator (replaces SQLite's json_extract).

import { db } from '../db.ts';
import type { ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

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

export type SearchGameplayEntitiesResponse = ToolResponse<SearchGameplayEntityRow>;

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export async function searchGameplayEntities(args: SearchGameplayEntitiesArgs): Promise<SearchGameplayEntitiesResponse> {
  const meta = {
    tool: 'search_gameplay_entities',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const queryClause = args.query
    ? db`AND (name ILIKE ${'%' + args.query + '%'}
              OR classname ILIKE ${'%' + args.query + '%'})`
    : db``;
  const kindClause = args.kind ? db`AND kind = ${args.kind}` : db``;
  const splashClause =
    args.has_splash === true
      ? db`AND splash_damage IS NOT NULL AND splash_damage > 0`
      : args.has_splash === false
      ? db`AND (splash_damage IS NULL OR splash_damage = 0)`
      : db``;
  const minDamageClause = typeof args.min_damage === 'number' ? db`AND damage >= ${args.min_damage}` : db``;
  const maxDamageClause = typeof args.max_damage === 'number' ? db`AND damage <= ${args.max_damage}` : db``;
  const minRespawnClause = typeof args.min_respawn === 'number' ? db`AND respawn_seconds >= ${args.min_respawn}` : db``;
  const maxRespawnClause = typeof args.max_respawn === 'number' ? db`AND respawn_seconds <= ${args.max_respawn}` : db``;
  const ammoClause = args.ammo_type ? db`AND props_json->>'ammo_type' = ${args.ammo_type}` : db``;

  const rowsPlusOne = await db<SearchGameplayEntityRow[]>`
    SELECT kind, name, classname, damage, splash_damage, splash_radius,
           refire_seconds, respawn_seconds, pickup_amount, duration_seconds, source_ref
    FROM gameplay_entity_defs
    WHERE gameplay_source_id = ${source}
      ${queryClause}
      ${kindClause}
      ${splashClause}
      ${minDamageClause}
      ${maxDamageClause}
      ${minRespawnClause}
      ${maxRespawnClause}
      ${ammoClause}
    ORDER BY kind, name
    LIMIT ${limit + 1}
  `;
  const truncated = rowsPlusOne.length > limit;
  const rows = rowsPlusOne.slice(0, limit);

  return {
    results: rows,
    match_quality: rows.length > 0 ? 'strong' : 'none',
    suggested_fallback: rows.length === 0
      ? `No gameplay entities match the given filters in source '${source}'. Try broadening the kind filter or removing the substring query.`
      : null,
    truncated,
    meta,
  };
}
