// apps/qw-oracle/scripts/load-knowledge/load-protocol-messages.ts
//
// Phase 2e MVDSV: protocol_message adapter. Consumes the array of
// {name, ast} rows emitted by mvdsv/_handler_protocol.py and writes them to
// protocol_message_versions. The kind field is CHECK-constrained at the
// schema level; entries lacking an ast (doc_only) never reach buildRow
// because isSourceBacked filters them upstream.

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertProtocolMessageVersion } from './natural-keys.js';
import type { ProtocolMessageEntry, ProtocolMessageVersionRow } from './types.js';

export const PROTOCOL_MESSAGE_PAYLOAD_FIELD = 'protocol_messages';

export function protocolMessageIsSourceBacked(entry: ProtocolMessageEntry): boolean {
  return entry.ast !== null;
}

export function buildProtocolMessageVersionRow(
  entityId: number,
  version: string,
  entry: ProtocolMessageEntry,
  now: string,
): ProtocolMessageVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    // CHECK-constrained at schema v16: one of the 13 kinds (svc / clc / nq;
    // pext_fte_bit / pext_fte_const / pext_fte_alias / pext_fte_marker;
    // pext_mvd_bit / pext_mvd_const / pext_mvd_alias / pext_mvd_marker;
    // protocol_version / protocol_extension_id). The handler emits the
    // final kind directly -- no further classification happens here.
    // Defensive empty fallback for doc_only rows; in practice they're
    // filtered out by isSourceBacked before reaching this builder.
    kind: ast?.kind ?? '',
    value: ast?.value ?? null,
    value_kind: ast?.value_kind ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    trailing_comment: ast?.trailing_comment ?? null,
    raw_ast_hash,
    // MVDSV entries don't carry source_root (single-engine project, NULL =
    // "engine" per SCHEMA.md semantics). FTE entries would carry it as a
    // top-level field; protocol_message is MVDSV-only today.
    source_root: null,
    extracted_at: now,
  };
}

export function upsertProtocolMessageRow(db: Database.Database, row: ProtocolMessageVersionRow): void {
  upsertProtocolMessageVersion(db, row);
}
