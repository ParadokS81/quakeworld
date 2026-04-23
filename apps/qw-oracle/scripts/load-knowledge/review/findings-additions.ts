// apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts
//
// Q1: rows that appeared between from_version and to_version.
// Pulls from change_events (entity creations) and relation_changes
// (asset_* relation creations). One Finding per row.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export function findAdditions(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Entity creations.
  const entityRows = db.prepare(`
    SELECT ce.entity_id, ce.to_version, ce.commit_sha, ce.commit_message_excerpt,
           ce.pr_number, e.canonical_id, e.type, e.name
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE ce.to_version = ?
      AND ce.change_kind = 'created'
      AND e.project = ?
    ORDER BY e.type, e.name
  `).all(toVersion, project) as Array<{
    entity_id: number;
    to_version: string;
    commit_sha: string;
    commit_message_excerpt: string | null;
    pr_number: number | null;
    canonical_id: string;
    type: string;
    name: string;
  }>;

  for (const r of entityRows) {
    findings.push({
      id: makeFindingId('addition', r.canonical_id),
      bucket: 'addition',
      summary: `New ${r.type} \`${r.name}\` first observed at ${toVersion}.`,
      evidence: {
        entity_ref: r.canonical_id,
        commit_sha: r.commit_sha,
        ...(r.pr_number !== null ? { pr_number: r.pr_number } : {}),
        ...(r.commit_message_excerpt ? { to_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  // Relation creations.
  const relationRows = db.prepare(`
    SELECT relation_table, row_key_json, commit_sha, commit_message_excerpt
    FROM relation_changes
    WHERE project = ? AND to_version = ? AND change_kind = 'created'
    ORDER BY relation_table, row_key_json
  `).all(project, toVersion) as Array<{
    relation_table: string;
    row_key_json: string;
    commit_sha: string;
    commit_message_excerpt: string | null;
  }>;

  for (const r of relationRows) {
    const key = `${r.relation_table}:${r.row_key_json}`;
    findings.push({
      id: makeFindingId('addition', key),
      bucket: 'addition',
      summary: `New ${r.relation_table} row ${r.row_key_json} first observed at ${toVersion}.`,
      evidence: {
        relation_row_key: key,
        commit_sha: r.commit_sha,
        ...(r.commit_message_excerpt ? { to_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  return findings;
}
