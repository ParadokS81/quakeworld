// apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts
//
// Layer 1 qw-namespace gameplay-mechanic lookup. JSONB columns deserialise
// automatically; the SQLite-era JSON.parse pattern is gone. Sort by gate
// width ascending so empty/least-restrictive gate (default '{}'::jsonb)
// surfaces first.

import { db } from '../db.ts';
import type { ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

export type LookupMechanicArgs = {
  name: string;
  gameplay_source?: string;
};

export interface GameplayMechanicRow {
  gameplay_source_id: string;
  kind: string;
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  ruleset_gate_json: Record<string, unknown>;
  source_ref: string;
  props_json: Record<string, unknown>;
  notes: string | null;
}

export type GameplayMechanicResult = Omit<GameplayMechanicRow, 'props_json' | 'ruleset_gate_json'> & {
  props: Record<string, unknown>;
  ruleset_gate: Record<string, unknown>;
};

export type LookupMechanicResponse = ToolResponse<GameplayMechanicResult>;

export async function lookupMechanic(args: LookupMechanicArgs): Promise<LookupMechanicResponse> {
  const meta = {
    tool: 'lookup_mechanic',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const sourceClause = args.gameplay_source ? db`AND gameplay_source_id = ${args.gameplay_source}` : db``;
  const rows = await db<GameplayMechanicRow[]>`
    SELECT DISTINCT ON (gameplay_source_id)
           gameplay_source_id, kind, name, value_numeric, value_text,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_mechanics
    WHERE name ILIKE ${args.name}
      ${sourceClause}
    ORDER BY gameplay_source_id, length(ruleset_gate_json::text) ASC, ruleset_gate_json::text
  `;

  if (rows.length === 0) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No mechanic named '${args.name}'. Omit gameplay_source to search all sources, or use search_mechanics with a kind/mode filter.`,
      meta,
    };
  }
  const results = rows.map(({ props_json, ruleset_gate_json, ...rest }) => ({
    ...rest, props: props_json, ruleset_gate: ruleset_gate_json,
  }));
  return { results, match_quality: 'strong', suggested_fallback: null, meta };
}
