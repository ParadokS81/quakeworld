import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

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

export function lookupMechanic(db: Database, args: LookupMechanicArgs): LookupMechanicResponse {
  const meta: Meta = {
    tool: 'lookup_mechanic',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const row = db
    .query(`
      SELECT gameplay_source_id, kind, name, value_numeric, value_text,
             ruleset_gate_json, source_ref, props_json, notes
      FROM gameplay_mechanics
      WHERE name = ? COLLATE NOCASE
        AND gameplay_source_id = ?
      ORDER BY length(ruleset_gate_json) ASC, ruleset_gate_json
      LIMIT 1
    `)
    .get(args.name, source) as GameplayMechanicRow | null;

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
      props: JSON.parse(props_json),
      ruleset_gate: JSON.parse(ruleset_gate_json),
    },
    meta,
  };
}
