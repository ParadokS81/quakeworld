// apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertFlagBitVersion } from './natural-keys.js';
import type { FlagBitEntry, FlagBitVersionRow } from './types.js';

export const FLAG_BIT_PAYLOAD_FIELD = 'flag_bits';

export function flagBitIsSourceBacked(entry: FlagBitEntry): boolean {
  return entry.ast !== null;
}

export function buildFlagBitVersionRow(
  entityId: number,
  version: string,
  entry: FlagBitEntry,
  now: string,
): FlagBitVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;
  return {
    entity_id: entityId,
    version,
    // bitmask_family is required (NOT NULL); default to 'other' for doc_only rows.
    bitmask_family: ast?.bitmask_family ?? 'other',
    value_raw: ast?.value_raw ?? null,
    value_numeric: ast?.value_numeric ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertFlagBitRow(db: Database.Database, row: FlagBitVersionRow): void {
  upsertFlagBitVersion(db, row);
}
