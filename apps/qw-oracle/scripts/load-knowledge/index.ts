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

  if (subcommand === 'diff' || subcommand === 'enrich' || subcommand === 'full') {
    throw new Error(`subcommand '${subcommand}' is implemented in a later task of this plan.`);
  }

  usageAndExit();
}

function usageAndExit(): never {
  console.error(`
load-knowledge <subcommand> [...args]

Subcommands:
  load-version  --project <p> --version <v> --type <cvar> --json <path>
                --commit <sha> --ordinal <n> [--tag-date <iso8601>]
                [--extractor-version <s>] [--force]
  diff          --project <p> --from <v1> --to <v2>
  enrich        --project <p> --github-token <token> [--limit <n>]
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
