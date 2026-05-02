// apps/qw-oracle/scripts/load-knowledge/load-rulesets.ts

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertRulesetVersion } from './natural-keys.js';
import type { RulesetEntry, RulesetVersionRow, SourceOverrideRow } from './types.js';

export const RULESET_PAYLOAD_FIELD = 'rulesets';

export function rulesetIsSourceBacked(entry: RulesetEntry): boolean {
  return entry.ast !== null;
}

export function buildRulesetVersionRow(
  entityId: number,
  version: string,
  entry: RulesetEntry,
  now: string,
): RulesetVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;
  // Coerce 0/1 ints from extractor JSON to JS booleans (Postgres BOOLEAN
  // column). null survives; non-null int -> bool.
  const intToBool = (v: number | null | undefined): boolean | null =>
    v == null ? null : v ? true : false;
  return {
    entity_id: entityId,
    version,
    enum_ident: ast?.enum_ident ?? null,
    loader_fn: ast?.loader_fn ?? null,
    maxfps: ast?.maxfps ?? null,
    restrict_triggers: intToBool(ast?.restrict_triggers),
    restrict_packet: intToBool(ast?.restrict_packet),
    restrict_particles: intToBool(ast?.restrict_particles),
    restrict_play: intToBool(ast?.restrict_play),
    restrict_logging: intToBool(ast?.restrict_logging),
    restrict_rollangle: intToBool(ast?.restrict_rollangle),
    restrict_ipc: intToBool(ast?.restrict_ipc),
    restrict_exec: intToBool(ast?.restrict_exec),
    restrict_setcalc: intToBool(ast?.restrict_setcalc),
    restrict_seteval: intToBool(ast?.restrict_seteval),
    restrict_setex: intToBool(ast?.restrict_setex),
    // JSONB column. Pass the JS array directly so postgres-js encodes as JSONB array,
    // not JSONB string (legacy SQLite-era TEXT bug).
    locked_cvars_json: ast?.locked_cvars ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export async function upsertRulesetRow(tx: postgres.TransactionSql<{}>, row: RulesetVersionRow): Promise<void> {
  await upsertRulesetVersion(tx, row);
}

export function buildRulesetOverrides(
  entityId: number,
  version: string,
  entry: RulesetEntry,
  now: string,
): SourceOverrideRow[] {
  const ast = entry.ast;
  if (!ast || !ast.field_source_lines) return [];
  const out: SourceOverrideRow[] = [];
  for (const [field_name, loc] of Object.entries(ast.field_source_lines)) {
    out.push({
      entity_id: entityId,
      version,
      field_name,
      source_file: loc.source_file,
      source_line: loc.source_line,
      source_column: null,
      override_kind: 'struct_field_decl',
      extracted_at: now,
    });
  }
  return out;
}
