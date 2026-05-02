// apps/qw-oracle/scripts/load-knowledge/load-qc-builtins.ts
//
// Phase 2e MVDSV: qc_builtin adapter. Consumes the array of {name, ast} rows
// emitted by mvdsv/_handler_qc_builtins.py and writes them to
// qc_builtin_versions. table_name / builtin_index / handler_fn are NOT NULL
// at the schema level; entries lacking an ast (doc_only) never reach buildRow
// because isSourceBacked filters them upstream. Defensive empty-string / -1
// fallbacks guard against the same isSourceBacked edge case.

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertQcBuiltinVersion } from './natural-keys.js';
import type { QcBuiltinEntry, QcBuiltinVersionRow } from './types.js';

export const QC_BUILTIN_PAYLOAD_FIELD = 'qc_builtins';

export function qcBuiltinIsSourceBacked(entry: QcBuiltinEntry): boolean {
  return entry.ast !== null;
}

export function buildQcBuiltinVersionRow(
  entityId: number,
  version: string,
  entry: QcBuiltinEntry,
  now: string,
): QcBuiltinVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    // NOT NULL columns; isSourceBacked filters null-ast paths in practice.
    // table_name is free-form (no CHECK) -- expected std_builtins /
    // ext_builtins / ext_syscalls. builtin_index sentinel -1 marks the
    // edge case explicitly.
    table_name: ast?.table_name ?? '',
    builtin_index: ast?.builtin_index ?? -1,
    handler_fn: ast?.handler_fn ?? '',
    qc_signature: ast?.qc_signature ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    trailing_comment: ast?.trailing_comment ?? null,
    raw_ast_hash,
    // MVDSV entries don't carry source_root (single-engine project, NULL =
    // "engine" per SCHEMA.md semantics). qc_builtin is MVDSV-only today.
    source_root: null,
    extracted_at: now,
  };
}

export async function upsertQcBuiltinRow(tx: postgres.TransactionSql<{}>, row: QcBuiltinVersionRow): Promise<void> {
  await upsertQcBuiltinVersion(tx, row);
}
