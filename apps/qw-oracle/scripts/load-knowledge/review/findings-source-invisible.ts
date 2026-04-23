// apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts
//
// Q5: release-note bullets at toVersion that have no corresponding entity
// or relation change. A bullet is source-invisible when BOTH conditions hold:
//   (a) referenced_entity_ids_json is NULL (the bullet didn't mention any
//       loaded entity by identifier), AND
//   (b) none of the bullet's commit_urls resolve to a commit_sha present in
//       change_events or relation_changes for the tag-pair.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export function findSourceInvisible(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  // Collect all commit SHAs referenced by the tag-pair's entity + relation diff.
  const tagPairShas = new Set<string>();
  const entityShas = db.prepare(`
    SELECT DISTINCT commit_sha FROM change_events
    WHERE from_version = ? AND to_version = ?
  `).all(fromVersion, toVersion) as Array<{ commit_sha: string }>;
  for (const r of entityShas) tagPairShas.add(r.commit_sha.toLowerCase());
  const relationShas = db.prepare(`
    SELECT DISTINCT commit_sha FROM relation_changes
    WHERE project = ? AND from_version = ? AND to_version = ?
  `).all(project, fromVersion, toVersion) as Array<{ commit_sha: string }>;
  for (const r of relationShas) tagPairShas.add(r.commit_sha.toLowerCase());

  // Release notes for toVersion.
  const noteRows = db.prepare(`
    SELECT id, section, ordinal, body_md, referenced_entity_ids_json, commit_urls_json
    FROM release_notes
    WHERE project = ? AND version = ?
    ORDER BY section, ordinal
  `).all(project, toVersion) as Array<{
    id: number;
    section: string;
    ordinal: number;
    body_md: string;
    referenced_entity_ids_json: string | null;
    commit_urls_json: string | null;
  }>;

  const findings: Finding[] = [];
  for (const r of noteRows) {
    if (r.referenced_entity_ids_json) continue; // (a) fails: has entity ref
    const urls = r.commit_urls_json ? (JSON.parse(r.commit_urls_json) as string[]) : [];
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
