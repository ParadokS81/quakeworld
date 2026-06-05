// apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts
//
// Layer 1 qw-namespace gameplay-entity lookup. JSONB columns deserialise
// automatically; the SQLite-era JSON.parse pattern is gone. Sort by gate
// width ascending so empty/least-restrictive gate (default '{}'::jsonb)
// surfaces first.

import { db } from '../db.ts';
import type { ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

export type LookupGameplayEntityArgs = {
  name: string;
  gameplay_source?: string;
};

export interface GameplayEntityRow {
  gameplay_source_id: string;
  kind: 'item' | 'weapon' | 'projectile';
  name: string;
  classname: string | null;
  damage: number | null;
  splash_damage: number | null;
  splash_radius: number | null;
  refire_seconds: number | null;
  respawn_seconds: number | null;
  pickup_amount: number | null;
  max_carry: number | null;
  duration_seconds: number | null;
  ruleset_gate_json: Record<string, unknown>;
  source_ref: string;
  props_json: Record<string, unknown>;
  notes: string | null;
}

export type GameplayEntityResult = Omit<GameplayEntityRow, 'props_json' | 'ruleset_gate_json'> & {
  props: Record<string, unknown>;
  ruleset_gate: Record<string, unknown>;
};

export type LookupGameplayEntityResponse = ToolResponse<GameplayEntityResult>;

export async function lookupGameplayEntity(args: LookupGameplayEntityArgs): Promise<LookupGameplayEntityResponse> {
  const meta = {
    tool: 'lookup_gameplay_entity',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const sourceClause = args.gameplay_source ? db`AND gameplay_source_id = ${args.gameplay_source}` : db``;
  const rows = await db<GameplayEntityRow[]>`
    SELECT DISTINCT ON (gameplay_source_id)
      gameplay_source_id, kind, name, classname,
      damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
      pickup_amount, max_carry, duration_seconds,
      ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_entity_defs
    WHERE name ILIKE ${args.name}
      ${sourceClause}
    ORDER BY gameplay_source_id, length(ruleset_gate_json::text) ASC, ruleset_gate_json::text
  `;

  if (rows.length === 0) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No gameplay entity named '${args.name}'. Omit gameplay_source to search all sources, or use search_gameplay_entities with a kind/substring filter.`,
      meta,
    };
  }
  const results = rows.map(({ props_json, ruleset_gate_json, ...rest }) => ({
    ...rest, props: props_json, ruleset_gate: ruleset_gate_json,
  }));
  return { results, match_quality: 'strong', suggested_fallback: null, meta };
}
