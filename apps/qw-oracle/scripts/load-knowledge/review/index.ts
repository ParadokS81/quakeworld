// apps/qw-oracle/scripts/load-knowledge/review/index.ts
//
// Composes the five finders, writes the pre-seeded markdown draft, returns
// a ReviewReport. Called by the CLI (index.ts) runReview handler.

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import type Database from 'better-sqlite3';
import { findAdditions } from './findings-additions.js';
import { findRetirements } from './findings-retirements.js';
import { findSemanticCrossings } from './findings-semantic-crossings.js';
import { findUnclassified } from './findings-unclassified.js';
import { findSourceInvisible } from './findings-source-invisible.js';
import {
  findHelpJsonClassifications,
  type SeedMap,
} from './findings-help-json-classifications.js';
import { detectClusters } from './clusters.js';
import { annotatePriorRefs, loadPriorWalks } from './prior-walks.js';
import { runSemanticMatch } from './semantic-match.js';
import { annotateCrossCodebase } from './cross-codebase.js';
import { writeDraft } from './draft-writer.js';
import type { Finding, ReviewCounts, ReviewReport } from './types.js';
import type { Project } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadHelpJsonSeed(project: Project): SeedMap {
  const seedPath = join(
    __dirname, '..', '..', 'extractors', project,
    'seeds', 'help_json_classifications.yaml',
  );
  if (!existsSync(seedPath)) return {};
  const parsed = yaml.load(readFileSync(seedPath, 'utf-8')) as
    { classifications?: Array<{ name: string; classification: string }> } | null;
  const map: SeedMap = {};
  for (const entry of parsed?.classifications ?? []) {
    map[entry.name] = entry as SeedMap[string];
  }
  return map;
}

export interface RunReviewOptions {
  db: Database.Database;
  project: Project;
  fromVersion: string;
  toVersion: string;
  outPath: string;
  force: boolean;
  ezquakeRepoPath: string | null;
  reviewsDir?: string;
}

export function runReview(options: RunReviewOptions): ReviewReport {
  assertPreconditions(options);
  assertDraftNotFilled(options.outPath, options.force);

  const now = new Date().toISOString();

  const helpJsonSeed = loadHelpJsonSeed(options.project);
  const rawFindings: Finding[] = [
    ...findAdditions(options.db, options.project, options.fromVersion, options.toVersion),
    ...findRetirements(options.db, options.project, options.fromVersion, options.toVersion),
    ...findSemanticCrossings(options.db, options.project, options.fromVersion, options.toVersion),
    ...findUnclassified(options.db, options.project, options.fromVersion, options.toVersion),
    ...findSourceInvisible(options.db, options.project, options.fromVersion, options.toVersion),
    ...findHelpJsonClassifications(options.db, options.project, helpJsonSeed),
  ];

  const { clusters: rawClusters, findings: clusteredFindings } = detectClusters(rawFindings, {
    ezquakeRepoPath: options.ezquakeRepoPath,
  });

  const reviewsDir = options.reviewsDir
    ?? join(__dirname, '..', '..', '..', 'docs', 'reviews');
  const priorWalks = loadPriorWalks({
    reviewsDir,
    currentProject: options.project,
    currentFrom: options.fromVersion,
    currentTo: options.toVersion,
  });
  const clusters = annotatePriorRefs(rawClusters, priorWalks);

  // Semantic pass over source-invisible (§1.2): propose cluster membership
  // for release-note bullets that lack a mechanical signal.
  const { findings: semanticallyAnnotated } = runSemanticMatch(clusteredFindings, clusters);
  // Cross-codebase hint (§4): cue-set classifier per finding.
  const findings = annotateCrossCodebase(semanticallyAnnotated);

  const counts: ReviewCounts = {
    addition: 0,
    retirement: 0,
    'semantic-crossing': 0,
    unclassified: 0,
    'source-invisible': 0,
    'help-json-classification': 0,
  };
  for (const f of findings) counts[f.bucket] += 1;

  const report: ReviewReport = {
    project: options.project,
    from_version: options.fromVersion,
    to_version: options.toVersion,
    generated_at: now,
    draft_path: options.outPath,
    counts,
    findings,
    clusters,
  };

  writeDraft(report);
  return report;
}

function assertPreconditions(options: RunReviewOptions): void {
  const { db, project, fromVersion, toVersion } = options;

  const fromRow = db.prepare(`SELECT 1 FROM versions WHERE project = ? AND version = ?`).get(project, fromVersion);
  if (!fromRow) {
    throw new Error(
      `No versions row for ${project}:${fromVersion}. Run \`extract-tag --version ${fromVersion}\` first.`,
    );
  }
  const toRow = db.prepare(`SELECT 1 FROM versions WHERE project = ? AND version = ?`).get(project, toVersion);
  if (!toRow) {
    throw new Error(
      `No versions row for ${project}:${toVersion}. Run \`extract-tag --version ${toVersion}\` first.`,
    );
  }

  const ceCount = db.prepare(
    `SELECT COUNT(*) AS n FROM change_events WHERE from_version = ? AND to_version = ?`,
  ).get(fromVersion, toVersion) as { n: number };
  const rcCount = db.prepare(
    `SELECT COUNT(*) AS n FROM relation_changes WHERE project = ? AND from_version = ? AND to_version = ?`,
  ).get(project, fromVersion, toVersion) as { n: number };
  if (ceCount.n === 0 && rcCount.n === 0) {
    throw new Error(
      `No change_events or relation_changes for ${project}:${fromVersion}->${toVersion}. ` +
      `Run \`diff --project ${project} --from ${fromVersion} --to ${toVersion}\` first.`,
    );
  }

  const rnCount = db.prepare(
    `SELECT COUNT(*) AS n FROM release_notes WHERE project = ? AND version = ?`,
  ).get(project, toVersion) as { n: number };
  if (rnCount.n === 0) {
    throw new Error(
      `No release_notes rows for ${project}:${toVersion}. ` +
      `Run \`release-notes --project ${project} --version ${toVersion} --github-token $GITHUB_TOKEN\` first.`,
    );
  }
}

function assertDraftNotFilled(outPath: string, force: boolean): void {
  if (!existsSync(outPath)) return;
  if (force) return;
  const body = readFileSync(outPath, 'utf-8');
  // "**Applied:** " followed by anything except "_(pending)_" indicates a
  // disposition has been recorded.
  const hasFilledApplied = /\*\*Applied:\*\*\s+(?!_\(pending\)_)/.test(body);
  const hasFilledDisposition = /\*\*Proposed disposition:\*\*\s+(?!_\(pending\)_)/.test(body);
  if (hasFilledApplied || hasFilledDisposition) {
    throw new Error(
      `Output draft at ${outPath} has filled-in dispositions. ` +
      `Pass --force to overwrite or resume via the extraction-review skill.`,
    );
  }
}
