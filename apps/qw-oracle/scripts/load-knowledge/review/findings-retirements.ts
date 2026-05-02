// apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts
//
// Q2: rows that disappeared between from_version and to_version.
// change_events + relation_changes with change_kind='deleted'.

import type postgres from 'postgres';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export async function findRetirements(
  sql: postgres.Sql,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Entity deletions. Pull commit blame from change_events and the entity's
  // type/name for the summary.
  const entityRows = await sql<Array<{
    entity_id: number;
    commit_sha: string;
    commit_message_excerpt: string | null;
    pr_number: number | null;
    canonical_id: string;
    type: string;
    name: string;
  }>>`
    SELECT ce.entity_id, ce.commit_sha, ce.commit_message_excerpt, ce.pr_number,
           e.canonical_id, e.type, e.name
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE ce.from_version = ${fromVersion}
      AND ce.to_version = ${toVersion}
      AND ce.change_kind = 'deleted'
      AND e.project = ${project}
    ORDER BY e.type, e.name
  `;

  for (const r of entityRows) {
    findings.push({
      id: makeFindingId('retirement', r.canonical_id),
      bucket: 'retirement',
      summary: `${r.type} \`${r.name}\` present in ${fromVersion}, gone in ${toVersion}.`,
      evidence: {
        entity_ref: r.canonical_id,
        commit_sha: r.commit_sha,
        ...(r.pr_number !== null ? { pr_number: r.pr_number } : {}),
        ...(r.commit_message_excerpt ? { from_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  // Relation deletions.
  const relationRows = await sql<Array<{
    relation_table: string;
    row_key_json: string;
    commit_sha: string;
    commit_message_excerpt: string | null;
  }>>`
    SELECT relation_table, row_key_json, commit_sha, commit_message_excerpt
    FROM relation_changes
    WHERE project = ${project} AND from_version = ${fromVersion} AND to_version = ${toVersion} AND change_kind = 'deleted'
    ORDER BY relation_table, row_key_json
  `;

  for (const r of relationRows) {
    const key = `${r.relation_table}:${r.row_key_json}`;
    findings.push({
      id: makeFindingId('retirement', key),
      bucket: 'retirement',
      summary: `${r.relation_table} row ${r.row_key_json} present in ${fromVersion}, gone in ${toVersion}.`,
      evidence: {
        relation_row_key: key,
        commit_sha: r.commit_sha,
        ...(r.commit_message_excerpt ? { from_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  return findings;
}
