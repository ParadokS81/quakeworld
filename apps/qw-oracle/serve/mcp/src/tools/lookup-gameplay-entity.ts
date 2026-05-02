// apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts
//
// Layer 1 qw-namespace gameplay-entity lookup. JSONB columns deserialise
// automatically; the SQLite-era JSON.parse pattern is gone. Sort by gate
// width ascending so empty/least-restrictive gate (default '{}'::jsonb)
// surfaces first.

import { db } from '../db.ts';
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

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export type LookupGameplayEntityResponse =
  | { found: false; message: string; meta: Meta }
  | {
      found: true;
      entity: Omit<GameplayEntityRow, 'props_json' | 'ruleset_gate_json'> & {
        props: Record<string, unknown>;
        ruleset_gate: Record<string, unknown>;
      };
      meta: Meta;
    };

export async function lookupGameplayEntity(args: LookupGameplayEntityArgs): Promise<LookupGameplayEntityResponse> {
  const meta: Meta = {
    tool: 'lookup_gameplay_entity',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const rows = await db<GameplayEntityRow[]>`
    SELECT
      gameplay_source_id, kind, name, classname,
      damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
      pickup_amount, max_carry, duration_seconds,
      ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_entity_defs
    WHERE name ILIKE ${args.name}
      AND gameplay_source_id = ${source}
    ORDER BY length(ruleset_gate_json::text) ASC, ruleset_gate_json::text
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) {
    return {
      found: false,
      message: `No gameplay entity named '${args.name}' in source '${source}'.`,
      meta,
    };
  }
  const { props_json, ruleset_gate_json, ...rest } = row;
  return {
    found: true,
    entity: {
      ...rest,
      props: props_json,
      ruleset_gate: ruleset_gate_json,
    },
    meta,
  };
}
