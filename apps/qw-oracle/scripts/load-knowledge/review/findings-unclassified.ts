// apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts
//
// Q4: confidence movements on relation rows that carry a confidence column
// (asset_cvar_bindings, asset_loader_sites).
//
// Scope is deliberately restricted to CHANGES in this tag-pair:
//   - downward confidence movements recorded in relation_changes.
//
// Pre-existing low-confidence rows are NOT surfaced here — they'd re-surface
// on every pair review for the same row, which violates "one finding per
// moment of change". New low-confidence rows land in Q1 additions instead,
// where the user can still choose `classify` as the disposition. A
// systematic one-off "promote all heuristic sites" pass is a separate
// cleanup track outside the per-pair review.

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
    if (newOrd >= oldOrd) continue;
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
