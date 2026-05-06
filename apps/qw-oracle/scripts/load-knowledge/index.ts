// apps/qw-oracle/scripts/load-knowledge/index.ts
//
// CLI dispatcher: load-knowledge <subcommand> [...args]
// Subcommands: load-version, diff, enrich, load-assets, release-notes,
//              extract-tag, prune-cross-type-orphans, review, quality-grid,
//              build-snapshot, load-maps, load-gameplay, re-derive

import { parseArgs } from 'util';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { sql, closeSql } from './db.js';
import { loadVersion } from './load-version.js';
import { HEAD_ORDINAL } from './constants.js';
import type { EntityType, Project } from './types.js';
import type postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const [, , subcommand, ...rest] = process.argv;

  if (!subcommand) {
    usageAndExit();
  }

  if (subcommand === 'load-version')              { await runLoadVersion(rest); return; }
  if (subcommand === 'diff')                      { await runDiff(rest); return; }
  if (subcommand === 'enrich')                    { await runEnrich(rest); return; }
  if (subcommand === 'load-assets')               { await runLoadAssets(rest); return; }
  if (subcommand === 'release-notes')             { await runReleaseNotes(rest); return; }
  if (subcommand === 'extract-tag')               { await runExtractTag(rest); return; }
  if (subcommand === 'review')                    { await runReviewCli(rest); return; }
  if (subcommand === 'prune-cross-type-orphans')  { await runPruneCrossTypeOrphans(rest); return; }
  if (subcommand === 'quality-grid')              { await runQualityGridCli(rest); return; }
  if (subcommand === 'build-snapshot')            { await runBuildSnapshot(rest); return; }
  if (subcommand === 'load-maps')                 { await runLoadMaps(rest); return; }
  if (subcommand === 'load-gameplay')             { await runLoadGameplay(rest); return; }
  if (subcommand === 'load-ktx-modes')            { await runLoadKtxModes(rest); return; }
  if (subcommand === 're-derive')                 { await runReDerive(rest); return; }

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
                --json <path> --commit <sha> [--ordinal <n>]
                [--tag-date <iso8601>] [--extractor-version <s>] [--force]
  diff          --project <p> --from <v1> --to <v2>
  enrich        --project <p> --github-token <token> [--limit <n>]
  load-assets   --project <p> --version <v> --json <bundle-path>
                --commit <sha> [--ordinal <n>]
                [--tag-date <iso8601>] [--extractor-version <s>]
  release-notes --project <p> --version <v> --github-token <token>
  extract-tag   --project <p> --version <v> [--ordinal <n>]
                [--commit <sha>] [--tag-date <iso8601>]
                [--github-token <t>] [--skip-release-notes]
                [--skip-prune] [--force]
  prune-cross-type-orphans --project <p>
                Run the cross-type help-JSON orphan prune across all
                entity types. Use at end of a deep-time walk where
                extract-tag was invoked with --skip-prune.
  review        --project <p> --from <v1> --to <v2>
                [--out <path>] [--ezquake-repo <path>] [--force]
                [--fail-on <bucket>] (repeatable; exit 2 if bucket has findings)
  quality-grid  --project <p>
                [--family regression|anomaly|both] [--probe <name>]
                [--list] [--json]
  build-snapshot --project <p> [--version <v>] [--output <dir>]
                Read Postgres and emit slipgate-shaped JSON snapshots
                (one per entity type) into apps/slipgate-app/src/lib/config/data/.
  load-maps     [--json <path>]
                Load qw-maps-ast.json into the maps table (schema v13).
                Defaults to scripts/extractors/qw/output/qw-maps-ast.json.
  load-gameplay [--yaml <path>]
                Load id1 game-mechanics seed YAML (37 entity defs + 41
                mechanics) into gameplay_* tables (schema v14). Defaults
                to scripts/extractors/qw/seeds/id1-gameplay.yaml.
  load-ktx-modes [--json <path>]
                Load KTX modes AST JSON (27 game_mode catalog rows + ~309
                mode_default overlay rows) into gameplay_mechanics. Defaults
                to scripts/extractors/ktx/output/ktx-modes-ast.json.
  re-derive     [--project <p>] [--type <t>]
                Re-run the derive-entity-description step over existing
                rows without re-loading from extractor JSON. Use when
                the derive logic changes (e.g. concat formula updates)
                and the search corpus needs to be rebuilt. Flips
                description_embedding_stale=TRUE on every touched row;
                the next embed-entities pass picks up the changed rows
                via the description_embedding_sha256 hash check.
                Defaults to all projects, all derivable types.
`.trim());
  process.exit(2);
}

// Resolve --ordinal from CLI args. The 'head' version defaults to
// HEAD_ORDINAL when --ordinal is omitted, so operators don't have to remember
// the sentinel value. Tagged releases use the explicit --ordinal when
// passed; otherwise the (project, version) pair is looked up in the
// versions table -- only net-new versions need the flag.
async function resolveOrdinal(
  s: postgres.Sql,
  project: Project,
  version: string | undefined,
  raw: string | undefined,
): Promise<number> {
  if (raw !== undefined) return Number(raw);
  if (version === 'head') return HEAD_ORDINAL;
  if (version) {
    const rows = await s<{ ordinal: number }[]>`
      SELECT ordinal FROM versions WHERE project = ${project} AND version = ${version}
    `;
    if (rows.length > 0) return rows[0]!.ordinal;
  }
  throw new Error('--ordinal is required for tagged versions not yet in the versions table');
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

  for (const required of ['project', 'version', 'type', 'json', 'commit'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const result = await loadVersion({
    sql,
    project: values.project as Project,
    version: values.version!,
    type: values.type as EntityType,
    jsonPath: values.json!,
    commitSha: values.commit!,
    tagDate: values['tag-date'] ?? null,
    ordinal: await resolveOrdinal(sql, values.project as Project, values.version, values.ordinal),
    extractorVersion: values['extractor-version'] ?? 'clang-ezquake-cvars@1.0.0',
    forceOverwrite: values.force ?? false,
  });
  console.log(JSON.stringify(result, null, 2));
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
  const result = await diffVersions({
    sql,
    project: values.project as Project,
    fromVersion: values.from!,
    toVersion: values.to!,
    ezquakeRepoPath: values['ezquake-repo'] ?? '/home/paradoks/projects/quakeworld/research/repos/ezquake-source',
  });
  console.log(JSON.stringify(result, null, 2));
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
  const result = await enrichPrs({
    sql,
    project: values.project as Project,
    githubToken: token,
    limit: values.limit ? Number(values.limit) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
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

  for (const required of ['project', 'version', 'json', 'commit'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const { loadAssets } = await import('./load-assets.js');
  const result = await loadAssets({
    sql,
    project: values.project as Project,
    version: values.version!,
    jsonPath: values.json!,
    commitSha: values.commit!,
    tagDate: values['tag-date'] ?? null,
    ordinal: await resolveOrdinal(sql, values.project as Project, values.version, values.ordinal),
    extractorVersion: values['extractor-version'] ?? 'clang-ezquake-assets@1.0.0',
  });
  console.log(JSON.stringify(result, null, 2));
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
  const result = await loadReleaseNotes({
    sql,
    project: values.project as Project,
    version: values.version!,
    githubToken: token,
  });
  console.log(JSON.stringify(result, null, 2));
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
      'skip-prune': { type: 'boolean' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'version'] as const) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }

  const { extractTag } = await import('./extract-tag.js');
  const result = await extractTag({
    sql,
    project: values.project as Project,
    version: values.version!,
    ordinal: await resolveOrdinal(sql, values.project as Project, values.version, values.ordinal),
    commitSha: values.commit,
    tagDate: values['tag-date'],
    githubToken: values['github-token'] ?? process.env.GITHUB_TOKEN,
    skipReleaseNotes: values['skip-release-notes'] ?? false,
    skipPrune: values['skip-prune'] ?? false,
    force: values.force ?? false,
  });
  console.log(JSON.stringify(result, null, 2));
}

async function runPruneCrossTypeOrphans(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
    },
  });

  if (!values.project) throw new Error('--project is required');

  const { pruneCrossTypeOrphansAllTypes } = await import('./prune-cross-type-orphans.js');
  const results = await sql.begin(async (tx) =>
    pruneCrossTypeOrphansAllTypes(tx, values.project as Project),
  );
  const total = results.reduce((sum, r) => sum + r.pruned, 0);
  const breakdown = results
    .filter((r) => r.pruned > 0)
    .map((r) => `${r.type}=${r.pruned}`)
    .join(' ');
  console.log(JSON.stringify({
    project: values.project,
    total_pruned: total,
    breakdown,
    per_type: results,
  }, null, 2));
}

async function runReviewCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      out: { type: 'string' },
      'ezquake-repo': { type: 'string' },
      force: { type: 'boolean' },
      'fail-on': { type: 'string', multiple: true },
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
  const report = await runReview({
    sql,
    project: values.project as Project,
    fromVersion: values.from!,
    toVersion: values.to!,
    outPath,
    force: values.force ?? false,
    ezquakeRepoPath: values['ezquake-repo']
      ?? '/home/paradoks/projects/quakeworld/research/repos/ezquake-source',
  });

  // Gate: fire BEFORE the JSON dump so failed runs don't emit a
  // misleading-looking success payload to stdout. Exit 2 distinguishes
  // gate-fail from generic error (exit 1).
  const failOnBuckets = (values['fail-on'] as string[] | undefined) ?? [];
  for (const bucket of failOnBuckets) {
    const count = (report.counts as unknown as Record<string, number>)[bucket] ?? 0;
    if (count > 0) {
      process.stderr.write(
        `Gate fail: bucket '${bucket}' has ${count} findings.\n` +
        `Resolve via classify-help-json.py --project ${values.project} or omit --fail-on.\n`
      );
      process.exit(2);
    }
  }

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

async function runQualityGridCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      family: { type: 'string' },
      probe: { type: 'string' },
      list: { type: 'boolean' },
      json: { type: 'boolean' },
    },
  });

  const { runQualityGrid, listProbes, formatGridText } = await import('./quality-grid.js');

  if (values.list) {
    const probes = listProbes();
    for (const p of probes) console.log(`[${p.family}] ${p.name}`);
    return;
  }

  if (!values.project) throw new Error('--project is required');
  const family = (values.family as 'regression' | 'anomaly' | 'both' | undefined) ?? 'both';
  if (!['regression', 'anomaly', 'both'].includes(family)) {
    throw new Error(`--family must be regression|anomaly|both, got ${family}`);
  }

  const results = await runQualityGrid({
    sql,
    project: values.project as Project,
    family,
    probeFilter: values.probe,
  });
  if (values.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(formatGridText(results));
  }
  const failed = results.some((r) => r.status === 'FAIL' || r.status === 'ERROR');
  process.exitCode = failed ? 1 : 0;
}

async function runBuildSnapshot(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      output: { type: 'string' },
    },
  });

  if (!values.project) throw new Error('--project is required');

  const { buildSnapshot } = await import('./build-snapshot.js');
  const result = await buildSnapshot({
    sql,
    project: values.project as Project,
    version: values.version,
    outputDir: values.output,
  });
  console.log(JSON.stringify(result, null, 2));
}

async function runLoadMaps(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: 'string' },
    },
  });

  const jsonPath = values.json ?? join(__dirname, '..', 'extractors', 'qw', 'output', 'qw-maps-ast.json');
  const { loadMapsFromFile } = await import('./load-maps.js');
  const result = await loadMapsFromFile(sql, jsonPath);
  console.log(`load-maps: inserted=${result.inserted} updated=${result.updated} total=${result.total}`);
}

async function runLoadGameplay(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      yaml: { type: 'string' },
    },
  });

  const yamlPath = values.yaml ?? join(__dirname, '..', 'extractors', 'qw', 'seeds', 'id1-gameplay.yaml');
  const { loadGameplayFromFile } = await import('./load-gameplay.js');
  const r = await loadGameplayFromFile(sql, yamlPath);
  console.log(
    `load-gameplay: entities inserted=${r.inserted.entities} updated=${r.updated.entities} total=${r.total.entities}; ` +
    `mechanics inserted=${r.inserted.mechanics} updated=${r.updated.mechanics} total=${r.total.mechanics}`,
  );

  const expectedEntities = 37;
  const expectedMechanics = 41;
  if (r.total.entities !== expectedEntities || r.total.mechanics !== expectedMechanics) {
    console.error(
      `load-gameplay: STOP - row-count mismatch. Expected entities=${expectedEntities} mechanics=${expectedMechanics}. ` +
      `Got entities=${r.total.entities} mechanics=${r.total.mechanics}. Investigate the YAML before re-running.`,
    );
    process.exitCode = 1;
  }
}

async function runLoadKtxModes(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: 'string' },
    },
  });

  const jsonPath = values.json ?? join(__dirname, '..', 'extractors', 'ktx', 'output', 'ktx-modes-ast.json');
  const { loadModesFromFile } = await import('./load-modes.js');
  const r = await loadModesFromFile(sql, jsonPath);
  console.log(
    `load-ktx-modes: game_mode inserted=${r.inserted.game_mode} updated=${r.updated.game_mode} total=${r.total.game_mode}; ` +
    `mode_default inserted=${r.inserted.mode_default} updated=${r.updated.mode_default} total=${r.total.mode_default}`,
  );

  if (r.total.game_mode < 27) {
    console.error(
      `load-ktx-modes: STOP - catalog count below F5 anchor 27 (got ${r.total.game_mode}). ` +
      `Re-run extraction; the handler may have failed to emit one or more catalog rows.`,
    );
    process.exitCode = 2;
  }
}

async function runReDerive(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      type: { type: 'string' },
    },
  });

  const { deriveEntityDescriptionsForVersion } = await import('./derive-entity-description.js');

  // Find every (project, type, last_seen_version) tuple present in the
  // current entities table, optionally filtered by --project / --type.
  // We derive against the version recorded as last_seen_version because
  // that is the version whose per-version row currently feeds entities.description.
  const projectClause = values.project ? sql`AND project = ${values.project}` : sql``;
  const typeClause = values.type ? sql`AND type = ${values.type}` : sql``;

  const tuples = await sql<{ project: Project; type: EntityType; version: string; n: number }[]>`
    SELECT project, type, last_seen_version AS version, COUNT(*)::int AS n
    FROM entities
    WHERE last_seen_version IS NOT NULL
      ${projectClause}
      ${typeClause}
    GROUP BY project, type, last_seen_version
    ORDER BY project, type, last_seen_version
  `;

  if (tuples.length === 0) {
    console.log('re-derive: no matching (project, type, version) tuples — nothing to do');
    return;
  }

  console.log(`re-derive: ${tuples.length} (project, type, version) tuples covering ${tuples.reduce((s, t) => s + t.n, 0)} entities`);

  let touched = 0;
  await sql.begin(async (tx) => {
    for (const t of tuples) {
      await deriveEntityDescriptionsForVersion(tx, t.project, t.type, t.version);
      touched += t.n;
      console.log(`  ${t.project}/${t.type}@${t.version}: ${t.n} entities`);
    }
  });

  console.log(`re-derive: done. ${touched} entities touched. Next embed-entities pass will pick up changed descriptions via hash check.`);
}

function defaultReviewPath(project: Project, from: string, to: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const name = `${today}-${project}-${from}-to-${to}.md`;
  return join(__dirname, '..', '..', 'docs', 'reviews', name);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
