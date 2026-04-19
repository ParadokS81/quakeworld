// apps/qw-oracle/scripts/load-knowledge/load-commands.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertCommandVersion } from './natural-keys.js';
import type { CommandEntry, CommandVersionRow } from './types.js';

export const COMMAND_PAYLOAD_FIELD = 'commands';

export function commandIsSourceBacked(entry: CommandEntry): boolean {
  return entry.ast !== null;
}

export function buildCommandVersionRow(
  entityId: number,
  version: string,
  entry: CommandEntry,
  now: string,
): CommandVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    help_group_id: entry['group-id'] ?? null,
    handler_fn: ast?.handler_fn ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    registration_file: ast?.enclosing_function ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertCommandRow(db: Database.Database, row: CommandVersionRow): void {
  upsertCommandVersion(db, row);
}
