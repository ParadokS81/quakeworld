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

  // Cite the first usage site when present; otherwise fall back to the
  // manifest entry in cmdline_params_ids.h. Some params (e.g. -nolibpng,
  // -showliberrors) are declared but consumed by library-init code rather
  // than read via COM_CheckParm, so usage_sites is legitimately empty.
  const primarySite = ast?.usage_sites?.[0] ?? null;
  const sourceFile = primarySite?.source_file ?? ast?.manifest_file ?? null;
  const sourceLine = primarySite?.source_line ?? ast?.manifest_line ?? null;

  return {
    entity_id: entityId,
    version,
    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    arguments: entry.arguments ?? null,
    flags_json: entry.flags ? JSON.stringify(entry.flags) : null,
    systems_json: entry.systems ? JSON.stringify(entry.systems) : null,
    source_file: sourceFile,
    source_line: sourceLine,
    source_column: primarySite?.source_column ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertCmdlineParamRow(db: Database.Database, row: CmdlineParamVersionRow): void {
  upsertCmdlineParamVersion(db, row);
}
