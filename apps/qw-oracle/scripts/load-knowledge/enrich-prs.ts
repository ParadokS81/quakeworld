// apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts
//
// Stage 3 of the loader: populate PR metadata on existing change_events rows.
// Groups by commit_sha, calls GitHub once per unique commit, updates all
// rows sharing that SHA in a single transaction.

import type postgres from 'postgres';
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
  qw:      null,
  // frozen vendored snapshots; no PR enrichment flow (D1)
  qtv:   null,
  qwfwd: null,
};

export interface EnrichOptions {
  sql: postgres.Sql;
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

  const commits = options.limit
    ? await options.sql<{ commit_sha: string }[]>`
        SELECT DISTINCT ce.commit_sha
        FROM change_events ce
        JOIN entities e ON e.id = ce.entity_id
        WHERE e.project = ${options.project}
          AND ce.enrichment_source = 'git'
          AND ce.pr_number IS NULL
          AND ce.commit_sha <> 'UNKNOWN'
        LIMIT ${options.limit}
      `
    : await options.sql<{ commit_sha: string }[]>`
        SELECT DISTINCT ce.commit_sha
        FROM change_events ce
        JOIN entities e ON e.id = ce.entity_id
        WHERE e.project = ${options.project}
          AND ce.enrichment_source = 'git'
          AND ce.pr_number IS NULL
          AND ce.commit_sha <> 'UNKNOWN'
      `;

  let attempted = 0;
  let enriched = 0;
  let skipped = 0;
  let rowsUpdated = 0;
  let paused = false;

  for (const row of commits) {
    attempted += 1;

    const rl = gh.getRateLimit();
    if (rl && rl.limit > 0 && (rl.remaining / rl.limit) * 100 < guardPct) {
      paused = true;
      break;
    }

    const pr = await gh.getPrsForCommit(repoInfo.owner, repoInfo.repo, row.commit_sha);

    if (!pr) {
      const result = await options.sql`
        UPDATE change_events
        SET enrichment_source = 'github_api'
        WHERE commit_sha = ${row.commit_sha}
      `;
      rowsUpdated += result.count;
      skipped += 1;
      continue;
    }

    const result = await options.sql`
      UPDATE change_events
      SET pr_number = ${pr.pr_number},
          pr_title = ${pr.pr_title},
          pr_body_excerpt = ${pr.pr_body.slice(0, 500)},
          linked_issues_json = ${JSON.stringify(pr.linked_issues)},
          enrichment_source = 'github_api'
      WHERE commit_sha = ${row.commit_sha}
    `;
    rowsUpdated += result.count;
    enriched += 1;
  }

  // oracle_meta is the Postgres-side replacement for SQLite's schema_meta.
  await options.sql`
    INSERT INTO oracle_meta (key, value, updated_at)
    VALUES ('last_enrichment_run_at', ${new Date().toISOString()}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;

  return {
    commitsAttempted: attempted,
    commitsEnriched: enriched,
    rowsUpdated,
    commitsSkipped: skipped,
    pausedDueToRateLimit: paused,
    rateLimitRemaining: gh.getRateLimit()?.remaining ?? null,
  };
}
