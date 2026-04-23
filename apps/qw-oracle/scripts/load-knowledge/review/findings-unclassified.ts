// apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts
//
// Q4: confidence promotions / demotions on relation rows that carry a
// confidence column (asset_cvar_bindings, asset_loader_sites).
// Two surfaces:
//   A. Rows at toVersion with confidence='unclassified' or 'heuristic'
//      (loader sites) or 'auto' / 'auto_orphan' (cvar bindings).
//   B. Rows whose confidence moved downward between the two versions.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

const CONFIDENCE_ORDER: Record<string, number> = {
  unclassified: 0,
  heuristic: 1,
  auto: 1,
  intentionally_generic: 2,
  auto_confirms_seed: 2,
  auto_orphan: 2,
  seed: 3,
  certain: 3,
};

export function findUnclassified(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Surface A: loader-sites still unclassified/heuristic at toVersion.
  const loaderRows = db.prepare(`
    SELECT canonical_id, confidence, source_file, source_line, notes
    FROM asset_loader_sites
    WHERE project = ? AND version = ? AND confidence IN ('unclassified','heuristic')
    ORDER BY canonical_id
  `).all(project, toVersion) as Array<{
    canonical_id: string;
    confidence: string;
    source_file: string;
    source_line: number;
    notes: string | null;
  }>;

  for (const r of loaderRows) {
    const key = `asset_loader_sites:${r.canonical_id}`;
    findings.push({
      id: makeFindingId('unclassified', key),
      bucket: 'unclassified',
      summary: `asset_loader_sites \`${r.canonical_id}\` at confidence='${r.confidence}'.`,
      evidence: {
        relation_row_key: key,
        source_file: r.source_file,
        source_line: r.source_line,
        ...(r.notes ? { to_value: r.notes } : {}),
      },
    });
  }

  // Surface A: cvar-bindings still low-confidence at toVersion.
  // asset_cvar_bindings.confidence in {seed, auto, auto_confirms_seed, auto_orphan}.
  // 'auto' and 'auto_orphan' are candidates for promotion.
  const bindingRows = db.prepare(`
    SELECT cvar_canonical_id, category_id, path_pattern, confidence, notes
    FROM asset_cvar_bindings
    WHERE project = ? AND version = ? AND confidence IN ('auto','auto_orphan')
    ORDER BY cvar_canonical_id, category_id
  `).all(project, toVersion) as Array<{
    cvar_canonical_id: string;
    category_id: string;
    path_pattern: string | null;
    confidence: string;
    notes: string | null;
  }>;

  for (const r of bindingRows) {
    const key = `asset_cvar_bindings:${r.cvar_canonical_id}|${r.category_id}|${r.path_pattern ?? ''}`;
    findings.push({
      id: makeFindingId('unclassified', key),
      bucket: 'unclassified',
      summary: `asset_cvar_bindings \`${r.cvar_canonical_id}\` -> \`${r.category_id}\` at confidence='${r.confidence}'.`,
      evidence: {
        relation_row_key: key,
        ...(r.notes ? { to_value: r.notes } : {}),
      },
    });
  }

  // Surface B: downward confidence movements recorded in relation_changes.
  const movementRows = db.prepare(`
    SELECT relation_table, row_key_json, old_value, new_value, commit_sha, commit_message_excerpt
    FROM relation_changes
    WHERE project = ? AND from_version = ? AND to_version = ?
      AND change_kind = 'modified'
      AND field_name = 'confidence'
    ORDER BY relation_table, row_key_json
  `).all(project, fromVersion, toVersion) as Array<{
    relation_table: string;
    row_key_json: string;
    old_value: string | null;
    new_value: string | null;
    commit_sha: string;
    commit_message_excerpt: string | null;
  }>;

  for (const r of movementRows) {
    const oldOrd = CONFIDENCE_ORDER[r.old_value ?? ''] ?? -1;
    const newOrd = CONFIDENCE_ORDER[r.new_value ?? ''] ?? -1;
    if (newOrd >= oldOrd) continue; // only demotions in surface B
    const key = `${r.relation_table}:${r.row_key_json}`;
    findings.push({
      id: makeFindingId('unclassified', `${key}:confidence-demotion`),
      bucket: 'unclassified',
      summary: `${r.relation_table}[${r.row_key_json}]: confidence demoted.`,
      evidence: {
        relation_row_key: key,
        commit_sha: r.commit_sha,
        from_value: r.old_value ?? '',
        to_value: r.new_value ?? '',
      },
    });
  }

  return findings;
}
