// apps/qw-oracle/scripts/load-knowledge/load-hud-elements.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertHudElementVersion } from './natural-keys.js';
import type { HudElementEntry, HudElementVersionRow } from './types.js';

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
    owned_cvars_json: ast?.owned_cvars ? JSON.stringify(ast.owned_cvars) : null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertHudElementRow(db: Database.Database, row: HudElementVersionRow): void {
  upsertHudElementVersion(db, row);
}
