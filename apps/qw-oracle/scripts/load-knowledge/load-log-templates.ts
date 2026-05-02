// apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts
//
// Phase 2e MVDSV: log_template adapter. Consumes the array of {name, ast}
// rows emitted by mvdsv/_handler_log_templates.py and writes them to
// log_template_versions. The channel field is CHECK-constrained at the
// schema level (broadcast/client/console/system); entries lacking an ast
// (doc_only) never reach buildRow because isSourceBacked filters them
// upstream. Both format_string and format_string_normalized are NOT NULL
// at the schema level; defensive empty-string fallbacks guard against the
// same isSourceBacked edge case.

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertLogTemplateVersion } from './natural-keys.js';
import type { LogTemplateEntry, LogTemplateVersionRow } from './types.js';

export const LOG_TEMPLATE_PAYLOAD_FIELD = 'log_templates';

export function logTemplateIsSourceBacked(entry: LogTemplateEntry): boolean {
  return entry.ast !== null;
}

export function buildLogTemplateVersionRow(
  entityId: number,
  version: string,
  entry: LogTemplateEntry,
  now: string,
): LogTemplateVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    // CHECK-constrained: must be one of broadcast/client/console/system.
    // Defensive empty fallback for doc_only rows; in practice they're filtered
    // out by isSourceBacked before reaching this builder.
    channel: ast?.channel ?? '',
    // NOT NULL; defensive empty-string fallback if isSourceBacked filter ever
    // fails. format_string carries the raw template; format_string_normalized
    // is the canonical-form variant used for entity-name dedup.
    format_string: ast?.format_string ?? '',
    format_string_normalized: ast?.format_string_normalized ?? '',
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    containing_function: ast?.containing_function ?? null,
    // JSONB column. Pass the JS array directly so postgres-js encodes as JSONB array,
    // not JSONB string (legacy SQLite-era TEXT bug). Handler aggregates every
    // (source_file, source_line, containing_function) for this (channel, format_string).
    // NULL when the handler didn't emit the field (defensive for legacy outputs).
    all_call_sites_json: ast?.all_call_sites ?? null,
    raw_ast_hash,
    // MVDSV entries don't carry source_root (single-engine project, NULL =
    // "engine" per SCHEMA.md semantics). log_template is MVDSV-only today.
    source_root: null,
    extracted_at: now,
  };
}

export async function upsertLogTemplateRow(tx: postgres.TransactionSql<{}>, row: LogTemplateVersionRow): Promise<void> {
  await upsertLogTemplateVersion(tx, row);
}
