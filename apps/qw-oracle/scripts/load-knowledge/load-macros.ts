// apps/qw-oracle/scripts/load-knowledge/load-macros.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertMacroVersion } from './natural-keys.js';
import type { MacroEntry, MacroVersionRow } from './types.js';

export const MACRO_PAYLOAD_FIELD = 'macros';

export function macroIsSourceBacked(entry: MacroEntry): boolean {
  return entry.ast !== null;
}

export function buildMacroVersionRow(
  entityId: number,
  version: string,
  entry: MacroEntry,
  now: string,
): MacroVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    help_desc: entry.desc ?? null,
    macro_type: entry.type ?? null,
    teamplay_restricted: entry['teamplay-restricted'] ? 1 : 0,
    related_cvars_json: entry['related-cvars']
      ? JSON.stringify(entry['related-cvars'])
      : null,
    handler_fn: ast?.handler_fn ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    registration_file: ast?.enclosing_function ?? null,
    // FTE entries carry source_root as a top-level field; ezQuake/QWCL entries
    // have no source_root field (NULL = "engine" per SCHEMA.md semantics).
    source_root: entry.source_root ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertMacroRow(db: Database.Database, row: MacroVersionRow): void {
  upsertMacroVersion(db, row);
}
