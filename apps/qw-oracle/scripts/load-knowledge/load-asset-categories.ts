// apps/qw-oracle/scripts/load-knowledge/load-asset-categories.ts

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertAssetCategoryVersion } from './natural-keys.js';
import type { AssetCategoryEntry, AssetCategoryVersionRow } from './types.js';

export const ASSET_CATEGORY_PAYLOAD_FIELD = 'asset_categories';

export function assetCategoryIsSourceBacked(entry: AssetCategoryEntry): boolean {
  // Categories are hand-authored taxonomy rather than source-backed.
  // They're always present for the covered project+version, so we mark
  // them source_backed to keep them out of the doc_only bucket and avoid
  // noisy "backfill_match" transitions on re-load.
  return entry.ast !== null;
}

export function buildAssetCategoryVersionRow(
  entityId: number,
  version: string,
  entry: AssetCategoryEntry,
  now: string,
): AssetCategoryVersionRow {
  const ast = entry.ast;
  if (!ast) {
    throw new Error(
      `asset_category entry has null ast; categories must always carry a display_name`,
    );
  }
  const raw_ast_hash = createHash('sha1').update(JSON.stringify(ast)).digest('hex');
  return {
    entity_id: entityId,
    version,
    display_name: ast.display_name,
    description: ast.description,
    notes: ast.notes,
    raw_ast_hash,
    extracted_at: now,
  };
}

export async function upsertAssetCategoryRow(tx: postgres.TransactionSql<{}>, row: AssetCategoryVersionRow): Promise<void> {
  await upsertAssetCategoryVersion(tx, row);
}
