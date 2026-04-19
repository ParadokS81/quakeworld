// apps/qw-oracle/scripts/load-knowledge/load-keynames.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertKeynameVersion } from './natural-keys.js';
import type { KeynameEntry, KeynameVersionRow } from './types.js';

export const KEYNAME_PAYLOAD_FIELD = 'keynames';

export function keynameIsSourceBacked(entry: KeynameEntry): boolean {
  return entry.ast !== null;
}

export function buildKeynameVersionRow(
  entityId: number,
  version: string,
  entry: KeynameEntry,
  now: string,
): KeynameVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;
  return {
    entity_id: entityId,
    version,
    key_code: ast?.key_code ?? null,
    key_code_ident: ast?.key_code_ident ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    build_variant: ast?.build_variant ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertKeynameRow(db: Database.Database, row: KeynameVersionRow): void {
  upsertKeynameVersion(db, row);
}
