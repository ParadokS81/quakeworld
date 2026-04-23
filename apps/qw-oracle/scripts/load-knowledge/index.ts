// apps/qw-oracle/scripts/load-knowledge/index.ts
//
// CLI dispatcher: load-knowledge <subcommand> [...args]
// Subcommands: load-version, diff, enrich

import { parseArgs } from 'util';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openKnowledgeDb } from './db.js';
import { loadVersion } from './load-version.js';
import type { EntityType, Project } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const [, , subcommand, ...rest] = process.argv;

  if (!subcommand) {
    usageAndExit();
  }

  if (subcommand === 'load-version') {
    await runLoadVersion(rest);
    return;
  }

  if (subcommand === 'diff') {
    await runDiff(rest);
    return;
  }

  if (subcommand === 'enrich') {
    await runEnrich(rest);
    return;
  }

  if (subcommand === 'load-assets') {
    await runLoadAssets(rest);
    return;
  }

  if (subcommand === 'release-notes') {
    await runReleaseNotes(rest);
    return;
  }

  if (subcommand === 'extract-tag') {
    await runExtractTag(rest);
    return;
  }

  if (subcommand === 'review') {
    await runReviewCli(rest);
    return;
  }

  if (subcommand === 'full') {
    throw new Error(`subcommand 'full' is out of scope for Phase 2b; run load-version + diff + enrich manually.`);
  }

  usageAndExit();
}

function usageAndExit(): never {
  console.error(`
load-knowledge <subcommand> [...args]

Subcommands:
  load-version  --project <p> --version <v>
                --type <cvar|command|macro|cmdline_param|keyname|
                        hud_element|ruleset|token_primitive|flag_bit>
                --json <path> --commit <sha> --ordinal <n>
                [--tag-date <iso8601>] [--extractor-version <s>] [--force]
  diff          --project <p> --from <v1> --to <v2>
  enrich        --project <p> --github-token <token> [--limit <n>]
  load-assets   --project <p> --version <v> --json <bundle-path>
                --commit <sha> --ordinal <n>
                [--tag-date <iso8601>] [--extractor-version <s>]
  release-notes --project <p> --version <v> --github-token <token>
  extract-tag   --project <p> --version <v> --ordinal <n>
                [--commit <sha>] [--tag-date <iso8601>]
                [--github-token <t>] [--skip-release-notes] [--force]
  review        --project <p> --from <v1> --to <v2>
                [--out <path>] [--force]
`.trim());
  process.exit(2);
}

async function runLoadVersion(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      type: { type: 'string' },
      json: { type: 'string' },
      commit: { type: 'string' },
      ordinal: { type: 'string' },
      'tag-date': { type: 'string' },
      'extractor-version': { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'version', 'type', 'json', 'commit', 'ordinal'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const db = openKnowledgeDb();
  try {
    const result = loadVersion({
      db,
      project: values.project as Project,
      version: values.version!,
      type: values.type as EntityType,
      jsonPath: values.json!,
      commitSha: values.commit!,
      tagDate: values['tag-date'] ?? null,
      ordinal: Number(values.ordinal),
      extractorVersion: values['extractor-version'] ?? 'clang-ezquake-cvars@1.0.0',
      forceOverwrite: values.force ?? false,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

async function runDiff(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      'ezquake-repo': { type: 'string' },
    },
  });

  for (const required of ['project', 'from', 'to'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const { diffVersions } = await import('./diff-versions.js');
  const db = openKnowledgeDb();
  try {
    const result = diffVersions({
      db,
      project: values.project as Project,
      fromVersion: values.from!,
      toVersion: values.to!,
      ezquakeRepoPath: values['ezquake-repo'] ?? '/home/paradoks/projects/quakeworld/research/repos/ezquake-source',
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

async function runEnrich(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      'github-token': { type: 'string' },
      limit: { type: 'string' },
    },
  });

  const token = values['github-token'] ?? process.env.GITHUB_TOKEN;
  if (!values.project) throw new Error('--project is required');
  if (!token) throw new Error('--github-token or GITHUB_TOKEN environment variable is required');

  const { enrichPrs } = await import('./enrich-prs.js');
  const db = openKnowledgeDb();
  try {
    const result = await enrichPrs({
      db,
      project: values.project as Project,
      githubToken: token,
      limit: values.limit ? Number(values.limit) : undefined,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

async function runLoadAssets(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      json: { type: 'string' },
      commit: { type: 'string' },
      ordinal: { type: 'string' },
      'tag-date': { type: 'string' },
      'extractor-version': { type: 'string' },
    },
  });

  for (const required of ['project', 'version', 'json', 'commit', 'ordinal'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const { loadAssets } = await import('./load-assets.js');
  const db = openKnowledgeDb();
  try {
    const result = loadAssets({
      db,
      project: values.project as Project,
      version: values.version!,
      jsonPath: values.json!,
      commitSha: values.commit!,
      tagDate: values['tag-date'] ?? null,
      ordinal: Number(values.ordinal),
      extractorVersion: values['extractor-version'] ?? 'clang-ezquake-assets@1.0.0',
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

async function runReleaseNotes(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      'github-token': { type: 'string' },
    },
  });

  const token = values['github-token'] ?? process.env.GITHUB_TOKEN;
  if (!values.project) throw new Error('--project is required');
  if (!values.version) throw new Error('--version is required');
  if (!token) throw new Error('--github-token or GITHUB_TOKEN environment variable is required');

  const { loadReleaseNotes } = await import('./load-release-notes.js');
  const db = openKnowledgeDb();
  try {
    const result = await loadReleaseNotes({
      db,
      project: values.project as Project,
      version: values.version!,
      githubToken: token,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

async function runExtractTag(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      ordinal: { type: 'string' },
      commit: { type: 'string' },
      'tag-date': { type: 'string' },
      'github-token': { type: 'string' },
      'skip-release-notes': { type: 'boolean' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'version', 'ordinal'] as const) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }

  const { extractTag } = await import('./extract-tag.js');
  const db = openKnowledgeDb();
  try {
    const result = await extractTag({
      db,
      project: values.project as Project,
      version: values.version!,
      ordinal: Number(values.ordinal),
      commitSha: values.commit,
      tagDate: values['tag-date'],
      githubToken: values['github-token'] ?? process.env.GITHUB_TOKEN,
      skipReleaseNotes: values['skip-release-notes'] ?? false,
      force: values.force ?? false,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

async function runReviewCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      out: { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'from', 'to'] as const) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }

  const outPath = values.out ?? defaultReviewPath(
    values.project as Project,
    values.from!,
    values.to!,
  );

  const { runReview } = await import('./review/index.js');
  const db = openKnowledgeDb();
  try {
    const report = runReview({
      db,
      project: values.project as Project,
      fromVersion: values.from!,
      toVersion: values.to!,
      outPath,
      force: values.force ?? false,
    });
    // stdout contract: emit the full report as JSON for the skill to consume.
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally {
    db.close();
  }
}

function defaultReviewPath(project: Project, from: string, to: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const name = `${today}-${project}-${from}-to-${to}.md`;
  // Anchor to apps/qw-oracle/docs/reviews/ regardless of cwd, so the CLI
  // writes to the right place whether invoked from apps/qw-oracle/ or the
  // monorepo root. __dirname is scripts/load-knowledge/; ../.. is the app root.
  return join(__dirname, '..', '..', 'docs', 'reviews', name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
