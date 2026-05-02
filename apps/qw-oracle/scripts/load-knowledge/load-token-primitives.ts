// apps/qw-oracle/scripts/load-knowledge/load-token-primitives.ts

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertTokenPrimitiveVersion } from './natural-keys.js';
import type { TokenPrimitiveEntry, TokenPrimitiveVersionRow } from './types.js';

export const TOKEN_PRIMITIVE_PAYLOAD_FIELD = 'token_primitives';

export function tokenPrimitiveIsSourceBacked(entry: TokenPrimitiveEntry): boolean {
  return entry.ast !== null;
}

export function buildTokenPrimitiveVersionRow(
  entityId: number,
  version: string,
  entry: TokenPrimitiveEntry,
  now: string,
): TokenPrimitiveVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;
  // Reconstruct the canonical "form" ($X) from the suffix so the DB row
  // carries it regardless of what name the loader chose as the entity key.
  const form = ast ? `$${ast.suffix_char}` : null;
  return {
    entity_id: entityId,
    version,
    form,
    suffix_char: ast?.suffix_char ?? null,
    byte_value: ast?.byte_value ?? null,
    category: ast?.category ?? null,
    case_style: ast?.case_style ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export async function upsertTokenPrimitiveRow(tx: postgres.TransactionSql<{}>, row: TokenPrimitiveVersionRow): Promise<void> {
  await upsertTokenPrimitiveVersion(tx, row);
}
