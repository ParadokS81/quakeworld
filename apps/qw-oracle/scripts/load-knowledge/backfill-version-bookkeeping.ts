// apps/qw-oracle/scripts/load-knowledge/backfill-version-bookkeeping.ts
//
// One-shot recompute of entities.first_seen_version and entities.last_seen_version
// from the per-type *_versions tables, ordered by versions.ordinal.
//
// Why this exists: the loader had two bookkeeping bugs (extendFirstSeenVersion
// only fired on doc_only -> source_backed transitions; upsertEntity overwrote
// last_seen unconditionally regardless of ordinal). Both fixed in
// load-version.ts and natural-keys.ts. This script repairs the existing DB.
//
// Idempotent: re-running on a clean DB is a no-op (every UPDATE writes the
// same value already there).
//
// Run: bunx tsx scripts/load-knowledge/backfill-version-bookkeeping.ts

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../data/knowledge.db');

interface TypeMapping {
  entity_type: string;
  version_table: string;
}

const TYPE_MAPPINGS: TypeMapping[] = [
  { entity_type: 'cvar', version_table: 'cvar_versions' },
  { entity_type: 'command', version_table: 'command_versions' },
  { entity_type: 'macro', version_table: 'macro_versions' },
  { entity_type: 'cmdline_param', version_table: 'cmdline_param_versions' },
  { entity_type: 'keyname', version_table: 'keyname_versions' },
  { entity_type: 'hud_element', version_table: 'hud_element_versions' },
  { entity_type: 'ruleset', version_table: 'ruleset_versions' },
  { entity_type: 'token_primitive', version_table: 'token_primitive_versions' },
  { entity_type: 'asset_category', version_table: 'asset_category_versions' },
  { entity_type: 'flag_bit', version_table: 'flag_bit_versions' },
];

interface DriftRow {
  id: number;
  name: string;
  project: string;
  current_first: string;
  current_last: string;
  computed_first: string;
  computed_last: string;
}

function backfillType(db: Database.Database, mapping: TypeMapping): void {
  const { entity_type, version_table } = mapping;

  const drifted = db.prepare(`
    SELECT
      e.id, e.name, e.project,
      e.first_seen_version AS current_first,
      e.last_seen_version  AS current_last,
      (
        SELECT v.version FROM versions v
        JOIN ${version_table} xv ON xv.version = v.version AND v.project = e.project
        WHERE xv.entity_id = e.id
        ORDER BY v.ordinal ASC LIMIT 1
      ) AS computed_first,
      (
        SELECT v.version FROM versions v
        JOIN ${version_table} xv ON xv.version = v.version AND v.project = e.project
        WHERE xv.entity_id = e.id
        ORDER BY v.ordinal DESC LIMIT 1
      ) AS computed_last
    FROM entities e
    WHERE e.type = ?
      AND EXISTS (SELECT 1 FROM ${version_table} xv WHERE xv.entity_id = e.id)
  `).all(entity_type) as DriftRow[];

  const now = new Date().toISOString();
  const update = db.prepare(`
    UPDATE entities
    SET first_seen_version = ?, last_seen_version = ?, updated_at = ?
    WHERE id = ?
  `);

  let touched = 0;
  let firstFixed = 0;
  let lastFixed = 0;
  const samples: DriftRow[] = [];

  const tx = db.transaction((rows: DriftRow[]) => {
    for (const r of rows) {
      if (r.computed_first === null || r.computed_last === null) continue;
      const firstChanged = r.current_first !== r.computed_first;
      const lastChanged = r.current_last !== r.computed_last;
      if (!firstChanged && !lastChanged) continue;
      update.run(r.computed_first, r.computed_last, now, r.id);
      touched += 1;
      if (firstChanged) firstFixed += 1;
      if (lastChanged) lastFixed += 1;
      if (samples.length < 5) samples.push(r);
    }
  });
  tx(drifted);

  console.log(
    `[${entity_type}] scanned=${drifted.length} updated=${touched} first_fixed=${firstFixed} last_fixed=${lastFixed}`,
  );
  for (const s of samples) {
    console.log(
      `  ${s.project}:${entity_type}:${s.name}  first ${s.current_first} -> ${s.computed_first}  last ${s.current_last} -> ${s.computed_last}`,
    );
  }
}

function main(): void {
  const db = new Database(DB_PATH);
  try {
    for (const mapping of TYPE_MAPPINGS) {
      backfillType(db, mapping);
    }
  } finally {
    db.close();
  }
}

main();
