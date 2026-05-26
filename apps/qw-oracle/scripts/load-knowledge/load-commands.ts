// apps/qw-oracle/scripts/load-knowledge/load-commands.ts

import { createHash } from 'crypto';
import type postgres from 'postgres';
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
    help_desc: entry.desc ?? ast?.description ?? null,
    help_remarks: entry.remarks ?? null,
    help_group_id: entry['group-id'] ?? null,
    handler_fn: ast?.handler_fn ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    registration_file: ast?.enclosing_function ?? null,
    // FTE entries carry source_root as a top-level field; ezQuake/QWCL entries
    // have no source_root field (NULL = "engine" per SCHEMA.md semantics).
    source_root: entry.source_root ?? null,
    // Cmd_AddLegacyCommand alias target (migration 017). Extractor emits
    // this when the registration call is Cmd_AddLegacyCommand("old","new");
    // NULL for normal Cmd_AddCommand registrations.
    legacy_alias_of: (ast as { legacy_alias_of?: string } | null)?.legacy_alias_of ?? null,
    raw_ast_hash,
    extracted_at: now,

    // L1 runtime-fidelity provenance (migration 015). The per-type command
    // loader populates NEITHER column -- track_a_reachability is owned by
    // the Track-A overlay (load-callgraph-reachability.ts) and
    // track_b_hud_recovery by the Track-B adapter (load-hud-commands.ts),
    // each via its own post-loop upsert. These nulls keep the shared row
    // shape compiling; a normal load leaves both columns NULL (D13
    // level-1). The upsert COALESCEs so these nulls do not clobber a value
    // a sibling pass wrote in the same run.
    track_a_reachability: null,
    track_b_hud_recovery: null,
  };
}

export async function upsertCommandRow(tx: postgres.TransactionSql<{}>, row: CommandVersionRow): Promise<void> {
  await upsertCommandVersion(tx, row);
}
