// apps/qw-oracle/scripts/load-knowledge/load-rulesets.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
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
  return {
    entity_id: entityId,
    version,
    enum_ident: ast?.enum_ident ?? null,
    loader_fn: ast?.loader_fn ?? null,
    maxfps: ast?.maxfps ?? null,
    restrict_triggers: ast?.restrict_triggers ?? null,
    restrict_packet: ast?.restrict_packet ?? null,
    restrict_particles: ast?.restrict_particles ?? null,
    restrict_play: ast?.restrict_play ?? null,
    restrict_logging: ast?.restrict_logging ?? null,
    restrict_rollangle: ast?.restrict_rollangle ?? null,
    restrict_ipc: ast?.restrict_ipc ?? null,
    restrict_exec: ast?.restrict_exec ?? null,
    restrict_setcalc: ast?.restrict_setcalc ?? null,
    restrict_seteval: ast?.restrict_seteval ?? null,
    restrict_setex: ast?.restrict_setex ?? null,
    locked_cvars_json: ast?.locked_cvars ? JSON.stringify(ast.locked_cvars) : null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertRulesetRow(db: Database.Database, row: RulesetVersionRow): void {
  upsertRulesetVersion(db, row);
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
