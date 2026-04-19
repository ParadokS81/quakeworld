// apps/qw-oracle/scripts/load-knowledge/load-cvars.ts
//
// Per-type adapter for cvar entities. Factored out of the original
// load-version.ts so the orchestrator can dispatch uniformly across cvar /
// command / macro / cmdline_param types.

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertCvarVersion } from './natural-keys.js';
import type { CvarVersionRow, VariableEntry } from './types.js';

export const CVAR_PAYLOAD_FIELD = 'vars';

// For cvars the "source-backed" signal is `entry.ast !== null` -- AST
// extractors emit ast=null for help-only (doc-only) entries.
export function cvarIsSourceBacked(entry: VariableEntry): boolean {
  return entry.ast !== null;
}

export function buildCvarVersionRow(
  entityId: number,
  version: string,
  entry: VariableEntry,
  now: string,
): CvarVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,

    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    help_values: entry.values == null ? null : JSON.stringify(entry.values),
    help_group_id: entry['group-id'] ?? null,
    help_type: entry.type ?? null,

    default_value: entry.default == null ? null : String(entry.default),
    flags_raw: ast?.flags_raw ?? null,
    flag_names: ast?.flag_names ? JSON.stringify(ast.flag_names) : null,
    on_change: ast?.on_change ?? null,
    min_bound: ast?.min_bound ?? null,
    max_bound: ast?.max_bound ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    storage_class: ast?.storage_class ?? null,
    group_name_in_source: ast?.group_name_in_source ?? null,
    trailing_comment: ast?.trailing_comment ?? null,
    server_only: entry['server-only'] ? 1 : 0,

    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertCvarRow(db: Database.Database, row: CvarVersionRow): void {
  upsertCvarVersion(db, row);
}
