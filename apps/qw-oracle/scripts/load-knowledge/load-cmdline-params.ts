// apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertCmdlineParamVersion } from './natural-keys.js';
import type { CmdlineParamEntry, CmdlineParamVersionRow } from './types.js';

export const CMDLINE_PARAM_PAYLOAD_FIELD = 'params';

export function cmdlineIsSourceBacked(entry: CmdlineParamEntry): boolean {
  return entry.ast !== null;
}

export function buildCmdlineParamVersionRow(
  entityId: number,
  version: string,
  entry: CmdlineParamEntry,
  now: string,
): CmdlineParamVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  // Use the first usage site as the primary source location (if any).
  // Full usage_sites detail is preserved in the AST hash / can be surfaced
  // later if needed as a separate junction table.
  const primarySite = ast?.usage_sites?.[0] ?? null;

  return {
    entity_id: entityId,
    version,
    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    arguments: entry.arguments ?? null,
    flags_json: entry.flags ? JSON.stringify(entry.flags) : null,
    systems_json: entry.systems ? JSON.stringify(entry.systems) : null,
    source_file: primarySite?.source_file ?? null,
    source_line: primarySite?.source_line ?? null,
    source_column: primarySite?.source_column ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertCmdlineParamRow(db: Database.Database, row: CmdlineParamVersionRow): void {
  upsertCmdlineParamVersion(db, row);
}
