// apps/qw-oracle/scripts/load-knowledge/index.ts
//
// CLI dispatcher: load-knowledge <subcommand> [...args]
// Subcommands: load-version, diff, enrich

import { parseArgs } from 'util';
import { openKnowledgeDb } from './db.js';
import { loadVersion } from './load-version.js';
import type { EntityType, Project } from './types.js';

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
                        hud_element|ruleset|token_primitive>
                --json <path> --commit <sha> --ordinal <n>
                [--tag-date <iso8601>] [--extractor-version <s>] [--force]
  diff          --project <p> --from <v1> --to <v2>
  enrich        --project <p> --github-token <token> [--limit <n>]
  load-assets   --project <p> --version <v> --json <bundle-path>
                --commit <sha> --ordinal <n>
                [--tag-date <iso8601>] [--extractor-version <s>]
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
