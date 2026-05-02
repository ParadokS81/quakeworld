// apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts
//
// Layer 1 qw-namespace gameplay-mechanic lookup. JSONB columns deserialise
// automatically; the SQLite-era JSON.parse pattern is gone. Sort by gate
// width ascending so empty/least-restrictive gate (default '{}'::jsonb)
// surfaces first.

import { db } from '../db.ts';
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

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export type LookupMechanicResponse =
  | { found: false; message: string; meta: Meta }
  | {
      found: true;
      mechanic: Omit<GameplayMechanicRow, 'props_json' | 'ruleset_gate_json'> & {
        props: Record<string, unknown>;
        ruleset_gate: Record<string, unknown>;
      };
      meta: Meta;
    };

export async function lookupMechanic(args: LookupMechanicArgs): Promise<LookupMechanicResponse> {
  const meta: Meta = {
    tool: 'lookup_mechanic',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const rows = await db<GameplayMechanicRow[]>`
    SELECT gameplay_source_id, kind, name, value_numeric, value_text,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_mechanics
    WHERE name ILIKE ${args.name}
      AND gameplay_source_id = ${source}
    ORDER BY length(ruleset_gate_json::text) ASC, ruleset_gate_json::text
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) {
    return {
      found: false,
      message: `No mechanic named '${args.name}' in source '${source}'.`,
      meta,
    };
  }
  const { props_json, ruleset_gate_json, ...rest } = row;
  return {
    found: true,
    mechanic: {
      ...rest,
      props: props_json,
      ruleset_gate: ruleset_gate_json,
    },
    meta,
  };
}
