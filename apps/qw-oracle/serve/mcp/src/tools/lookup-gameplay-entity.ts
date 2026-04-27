import type { Database } from 'bun:sqlite';
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
  ruleset_gate_json: string;
  source_ref: string;
  props_json: string;
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

export function lookupGameplayEntity(db: Database, args: LookupGameplayEntityArgs): LookupGameplayEntityResponse {
  const meta: Meta = {
    tool: 'lookup_gameplay_entity',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const row = db
    .query(`
      SELECT
        gameplay_source_id, kind, name, classname,
        damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
        pickup_amount, max_carry, duration_seconds,
        ruleset_gate_json, source_ref, props_json, notes
      FROM gameplay_entity_defs
      WHERE name = ? COLLATE NOCASE
        AND gameplay_source_id = ?
      ORDER BY length(ruleset_gate_json) ASC, ruleset_gate_json
      LIMIT 1
    `)
    .get(args.name, source) as GameplayEntityRow | null;

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
      props: JSON.parse(props_json),
      ruleset_gate: JSON.parse(ruleset_gate_json),
    },
    meta,
  };
}
