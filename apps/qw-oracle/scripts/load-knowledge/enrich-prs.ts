// apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts
//
// Stage 3 of the loader: populate PR metadata on existing change_events rows.
// Groups by commit_sha, calls GitHub once per unique commit, updates all
// rows sharing that SHA in a single transaction.

import type Database from 'better-sqlite3';
import { GitHubClient } from './github.js';
import type { Project } from './types.js';

// `null` for projects without a GitHub upstream (qwcl: 1996 id Software dump
// kept as a single-commit local snapshot; no live repo to enrich against).
// Lookup-site guards check for null and short-circuit with a clear error.
const PROJECT_REPOS: Record<Project, { owner: string; repo: string } | null> = {
  ezquake: { owner: 'QW-Group', repo: 'ezquake-source' },
  fte:     { owner: 'fte-team', repo: 'fteqw' },
  mvdsv:   { owner: 'QW-Group', repo: 'mvdsv' },
  ktx:     { owner: 'QW-Group', repo: 'ktx' },
  qwcl:    null,
};

export interface EnrichOptions {
  db: Database.Database;
  project: Project;
  githubToken: string;
  limit?: number;
  rateLimitGuardPct?: number;
}

export interface EnrichResult {
  commitsAttempted: number;
  commitsEnriched: number;
  rowsUpdated: number;
  commitsSkipped: number;
  pausedDueToRateLimit: boolean;
  rateLimitRemaining: number | null;
}

export async function enrichPrs(options: EnrichOptions): Promise<EnrichResult> {
  const repoInfo = PROJECT_REPOS[options.project];
  if (!repoInfo) {
    throw new Error(
      `Project '${options.project}' has no GitHub upstream; PR enrichment is not applicable.`,
    );
  }

  const gh = new GitHubClient(options.githubToken);
  const guardPct = options.rateLimitGuardPct ?? 10;

  const limitClause = options.limit ? 'LIMIT ?' : '';
  const query = `
    SELECT DISTINCT ce.commit_sha
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE e.project = ?
      AND ce.enrichment_source = 'git'
      AND ce.pr_number IS NULL
      AND ce.commit_sha <> 'UNKNOWN'
    ${limitClause}
  `;
  const commits = options.limit
    ? options.db.prepare(query).all(options.project, options.limit)
    : options.db.prepare(query).all(options.project);

  const updateStmt = options.db.prepare(`
    UPDATE change_events
    SET pr_number = @pr_number,
        pr_title = @pr_title,
        pr_body_excerpt = @pr_body_excerpt,
        linked_issues_json = @linked_issues_json,
        enrichment_source = 'github_api'
    WHERE commit_sha = @commit_sha
  `);

  const markUnlinkedStmt = options.db.prepare(`
    UPDATE change_events
    SET enrichment_source = 'github_api'
    WHERE commit_sha = @commit_sha
  `);

  let attempted = 0;
  let enriched = 0;
  let skipped = 0;
  let rowsUpdated = 0;
  let paused = false;

  for (const row of commits as Array<{ commit_sha: string }>) {
    attempted += 1;

    const rl = gh.getRateLimit();
    if (rl && rl.limit > 0 && (rl.remaining / rl.limit) * 100 < guardPct) {
      paused = true;
      break;
    }

    const pr = await gh.getPrsForCommit(repoInfo.owner, repoInfo.repo, row.commit_sha);

    if (!pr) {
      const result = markUnlinkedStmt.run({ commit_sha: row.commit_sha });
      rowsUpdated += Number(result.changes);
      skipped += 1;
      continue;
    }

    const result = updateStmt.run({
      commit_sha: row.commit_sha,
      pr_number: pr.pr_number,
      pr_title: pr.pr_title,
      pr_body_excerpt: pr.pr_body.slice(0, 500),
      linked_issues_json: JSON.stringify(pr.linked_issues),
    });
    rowsUpdated += Number(result.changes);
    enriched += 1;
  }

  // Per spec Section 6 schema_meta keyspace: record this run's completion timestamp.
  options.db.prepare(`
    INSERT INTO schema_meta (key, value) VALUES ('last_enrichment_run_at', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(new Date().toISOString());

  return {
    commitsAttempted: attempted,
    commitsEnriched: enriched,
    rowsUpdated,
    commitsSkipped: skipped,
    pausedDueToRateLimit: paused,
    rateLimitRemaining: gh.getRateLimit()?.remaining ?? null,
  };
}
