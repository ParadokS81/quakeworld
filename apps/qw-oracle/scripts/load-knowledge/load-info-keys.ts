// apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts
//
// Phase 2e MVDSV: info_key adapter. Consumes the array of {name, ast} rows
// emitted by mvdsv/_handler_info_keys.py and writes them to
// info_key_versions. The scope field is CHECK-constrained at the schema level
// (userinfo/serverinfo/localinfo); entries lacking an ast (doc_only) never
// reach buildRow because isSourceBacked filters them upstream. The two
// array-shaped ast fields (operations, all_call_sites) are JSON-stringified
// for storage in SQLite TEXT columns.
//
// Phase B 2026-04-28: entry.name is the suffixed `<bare>:<scope>` canonical
// form (per InfoKeyEntry). It flows through load-version.ts unchanged into
// entities.name so cross-scope registrations of the same key survive the
// UNIQUE(project, type, name) constraint. The schema v16 migration
// backfills pre-v15 unsuffixed rows to the suffixed form before the next
// extract-tag idempotently re-upserts.

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertInfoKeyVersion } from './natural-keys.js';
import type { InfoKeyEntry, InfoKeyVersionRow } from './types.js';

export const INFO_KEY_PAYLOAD_FIELD = 'info_keys';

export function infoKeyIsSourceBacked(entry: InfoKeyEntry): boolean {
  return entry.ast !== null;
}

export function buildInfoKeyVersionRow(
  entityId: number,
  version: string,
  entry: InfoKeyEntry,
  now: string,
): InfoKeyVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    // CHECK-constrained: must be one of userinfo/serverinfo/localinfo.
    // Defensive empty fallback for doc_only rows; in practice they're filtered
    // out by isSourceBacked before reaching this builder.
    scope: ast?.scope ?? '',
    operations: ast?.operations ? JSON.stringify(ast.operations) : null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    containing_function: ast?.containing_function ?? null,
    call_sites_json: ast?.all_call_sites ? JSON.stringify(ast.all_call_sites) : null,
    raw_ast_hash,
    // MVDSV entries don't carry source_root (single-engine project, NULL =
    // "engine" per SCHEMA.md semantics). info_key is MVDSV-only today.
    source_root: null,
    extracted_at: now,
  };
}

export function upsertInfoKeyRow(db: Database.Database, row: InfoKeyVersionRow): void {
  upsertInfoKeyVersion(db, row);
}
