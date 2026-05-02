// apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts
//
// Q5: release-note bullets at toVersion that have no corresponding entity
// or relation change. A bullet is source-invisible when BOTH conditions hold:
//   (a) referenced_entity_ids_json is NULL (the bullet didn't mention any
//       loaded entity by identifier), AND
//   (b) none of the bullet's commit_urls resolve to a commit_sha present in
//       change_events or relation_changes for the tag-pair.

import type postgres from 'postgres';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export async function findSourceInvisible(
  sql: postgres.Sql,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Promise<Finding[]> {
  // Collect all commit SHAs referenced by the tag-pair's entity + relation diff.
  const tagPairShas = new Set<string>();
  const entityShas = await sql<Array<{ commit_sha: string }>>`
    SELECT DISTINCT commit_sha FROM change_events
    WHERE from_version = ${fromVersion} AND to_version = ${toVersion}
  `;
  for (const r of entityShas) tagPairShas.add(r.commit_sha.toLowerCase());
  const relationShas = await sql<Array<{ commit_sha: string }>>`
    SELECT DISTINCT commit_sha FROM relation_changes
    WHERE project = ${project} AND from_version = ${fromVersion} AND to_version = ${toVersion}
  `;
  for (const r of relationShas) tagPairShas.add(r.commit_sha.toLowerCase());

  // Release notes for toVersion. The *_json columns are JSONB on Postgres;
  // postgres-js auto-decodes them to JS values, so referenced_entity_ids_json
  // arrives as an array (or null) and commit_urls_json as a string array (or
  // null). No JSON.parse needed.
  const noteRows = await sql<Array<{
    id: number;
    section: string;
    ordinal: number;
    body_md: string;
    referenced_entity_ids_json: number[] | null;
    commit_urls_json: string[] | null;
  }>>`
    SELECT id, section, ordinal, body_md, referenced_entity_ids_json, commit_urls_json
    FROM release_notes
    WHERE project = ${project} AND version = ${toVersion}
    ORDER BY section, ordinal
  `;

  const findings: Finding[] = [];
  for (const r of noteRows) {
    if (r.referenced_entity_ids_json) continue; // (a) fails: has entity ref
    const urls = r.commit_urls_json ?? [];
    const shasFromUrls = urls
      .map((u) => /\/commit\/([a-f0-9]{7,40})/i.exec(u)?.[1]?.toLowerCase())
      .filter((s): s is string => !!s);
    const hasTagPairCommit = shasFromUrls.some((sha) =>
      [...tagPairShas].some((known) => known.startsWith(sha) || sha.startsWith(known)),
    );
    if (hasTagPairCommit) continue; // (b) fails: covered by entity/relation change

    findings.push({
      id: makeFindingId('source-invisible', `release_notes:${r.id}`),
      bucket: 'source-invisible',
      summary: `Release-note bullet in section \`${r.section}\` without entity / commit coverage.`,
      evidence: {
        release_note_body: r.body_md,
      },
    });
  }

  return findings;
}
