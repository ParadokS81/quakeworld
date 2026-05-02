// apps/qw-oracle/scripts/load-knowledge/load-hud-elements.ts

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertHudElementVersion } from './natural-keys.js';
import type { HudElementEntry, HudElementVersionRow, SourceOverrideRow } from './types.js';

export const HUD_ELEMENT_PAYLOAD_FIELD = 'hud_elements';

export function hudElementIsSourceBacked(entry: HudElementEntry): boolean {
  return entry.ast !== null;
}

export function buildHudElementVersionRow(
  entityId: number,
  version: string,
  entry: HudElementEntry,
  now: string,
): HudElementVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;
  return {
    entity_id: entityId,
    version,
    help_desc: entry.desc ?? null,
    hud_alias: ast?.alias ?? null,
    flags_raw: ast?.flags_raw ?? null,
    min_state_raw: ast?.min_state_raw ?? null,
    draw_order_raw: ast?.draw_order_raw ?? null,
    draw_fn: ast?.draw_fn ?? null,
    enclosing_function: ast?.enclosing_function ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    // JSONB column. Pass the JS array directly so postgres-js encodes as JSONB array,
    // not JSONB string (legacy SQLite-era TEXT bug).
    owned_cvars_json: ast?.owned_cvars ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export async function upsertHudElementRow(tx: postgres.TransactionSql<{}>, row: HudElementVersionRow): Promise<void> {
  await upsertHudElementVersion(tx, row);
}

export function buildHudElementOverrides(
  entityId: number,
  version: string,
  entry: HudElementEntry,
  now: string,
): SourceOverrideRow[] {
  const ast = entry.ast;
  if (!ast || !ast.field_source_lines) return [];
  const out: SourceOverrideRow[] = [];
  for (const [field_name, loc] of Object.entries(ast.field_source_lines)) {
    out.push({
      entity_id: entityId,
      version,
      field_name,
      source_file: loc.source_file,
      source_line: loc.source_line,
      source_column: null,
      override_kind: 'header_declaration',
      extracted_at: now,
    });
  }
  return out;
}
