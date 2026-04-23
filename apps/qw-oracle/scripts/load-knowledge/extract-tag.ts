// apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
//
// Atomic "ensure this tag is fully loaded" operation. Runs:
//   1. git checkout <tag> in the project's source repo
//   2. the unified Python extractor (writes JSON files to packages/qw-config/src/data/)
//   3. loadVersion() for each of the 9 entity types
//   4. loadAssets() for the asset bundle
//   5. loadReleaseNotes() if a GitHub token is available
//
// Idempotent: re-running against the same tag upserts rows via the existing
// loaders' natural-key patterns. Safe to call from skill preflight.
//
// ezQuake only for the first ship. FTE / MVDSV / KTX each need their own
// extractor; this file stubs them as 'not-yet-supported' errors.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import { loadVersion } from './load-version.js';
import { loadAssets } from './load-assets.js';
import { loadReleaseNotes } from './load-release-notes.js';
import type { EntityType, Project } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

const PROJECT_REPO_PATH: Record<Project, string> = {
  ezquake: join(MONOREPO_ROOT, 'research', 'repos', 'ezquake-source'),
  fte:     join(MONOREPO_ROOT, 'research', 'repos', 'fteqw'),
  mvdsv:   join(MONOREPO_ROOT, 'research', 'repos', 'mvdsv'),
  ktx:     join(MONOREPO_ROOT, 'research', 'repos', 'ktx'),
};

const PROJECT_EXTRACTOR: Record<Project, string | null> = {
  ezquake: join(MONOREPO_ROOT, 'packages', 'qw-config', 'scripts', 'extract-ezquake-unified.py'),
  fte: null,
  mvdsv: null,
  ktx: null,
};

const EXTRACTOR_OUTPUT_DIR = join(MONOREPO_ROOT, 'packages', 'qw-config', 'src', 'data');

// Per-entity-type JSON file mapping. Keyed on the unified extractor's output names.
const ENTITY_JSON_FILES: Record<EntityType, string | null> = {
  cvar:            'ezquake-cvars-ast.json',
  command:         'ezquake-commands-ast.json',
  macro:           'ezquake-macros-ast.json',
  cmdline_param:   'ezquake-cmdline-params-ast.json',
  keyname:         'ezquake-keynames-ast.json',
  hud_element:     'ezquake-hud-elements-ast.json',
  ruleset:         'ezquake-rulesets-ast.json',
  token_primitive: 'ezquake-token-primitives-ast.json',
  flag_bit:        'ezquake-flag-bits-ast.json',
  asset_category:  null, // loaded via asset bundle, not standalone
};

const ASSET_BUNDLE_FILE = 'ezquake-asset-bundle.json';

const EXTRACTOR_VERSION_DEFAULT = 'clang-ezquake-unified@1.0.0';

export interface ExtractTagOptions {
  db: Database.Database;
  project: Project;
  version: string;
  ordinal: number;
  commitSha?: string;    // resolved from tag if omitted
  tagDate?: string;      // resolved from tag if omitted
  githubToken?: string;
  skipReleaseNotes?: boolean;
  force?: boolean;
}

export interface ExtractTagResult {
  project: Project;
  version: string;
  commitSha: string;
  entitiesLoaded: Partial<Record<EntityType, number>>;
  assetsLoaded: { extensions: number; pathRules: number; cvarBindings: number; loaderSites: number };
  releaseNotesLoaded: number | null;
}

export async function extractTag(options: ExtractTagOptions): Promise<ExtractTagResult> {
  const repoPath = PROJECT_REPO_PATH[options.project];
  const extractorPath = PROJECT_EXTRACTOR[options.project];
  if (!extractorPath) {
    throw new Error(
      `extract-tag does not yet support project=${options.project}. ` +
      `Only ezquake is wired in the first ship; FTE/MVDSV/KTX require their own extractors.`,
    );
  }
  if (!existsSync(repoPath)) {
    throw new Error(`Source repo not found at ${repoPath}. Clone it first.`);
  }

  // 1. Checkout. Only fetch if the tag is not already known locally, so the
  // common case (tag already present) stays offline-safe.
  const tagKnown = spawnSync(
    'git', ['-C', repoPath, 'rev-parse', '--verify', `refs/tags/${options.version}`],
    { stdio: 'ignore' },
  ).status === 0;
  if (!tagKnown) {
    execSync(`git -C "${repoPath}" fetch --tags --quiet`, { stdio: 'inherit' });
  }
  execSync(`git -C "${repoPath}" checkout "${options.version}"`, { stdio: 'inherit' });

  const commitSha = options.commitSha ?? execSync(`git -C "${repoPath}" rev-parse HEAD`, {
    encoding: 'utf-8',
  }).trim();
  const tagDate = options.tagDate ?? resolveTagDate(repoPath, options.version);

  // 2. Extractor (Python).
  const spawn = spawnSync(
    'python3',
    [
      extractorPath,
      '--repo-root', repoPath,
      '--output-dir', EXTRACTOR_OUTPUT_DIR,
      '--handlers', 'all',
    ],
    { stdio: 'inherit' },
  );
  if (spawn.status !== 0) {
    throw new Error(`Python extractor failed with status ${spawn.status}`);
  }

  // 3. Entity loaders.
  const entitiesLoaded: Partial<Record<EntityType, number>> = {};
  for (const [type, jsonFile] of Object.entries(ENTITY_JSON_FILES) as [EntityType, string | null][]) {
    if (!jsonFile) continue;
    const jsonPath = join(EXTRACTOR_OUTPUT_DIR, jsonFile);
    if (!existsSync(jsonPath)) {
      console.warn(`[extract-tag] missing ${jsonFile}; skipping type=${type}`);
      continue;
    }
    const result = loadVersion({
      db: options.db,
      project: options.project,
      version: options.version,
      type,
      jsonPath,
      commitSha,
      tagDate,
      ordinal: options.ordinal,
      extractorVersion: EXTRACTOR_VERSION_DEFAULT,
      forceOverwrite: options.force ?? false,
    });
    entitiesLoaded[type] = result.entityCount;
  }

  // 4. Asset bundle.
  const bundlePath = join(EXTRACTOR_OUTPUT_DIR, ASSET_BUNDLE_FILE);
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Asset bundle missing at ${bundlePath}. ` +
      `Run build-asset-bundle for ${options.project}:${options.version} before extract-tag.`,
    );
  }
  const assets = loadAssets({
    db: options.db,
    project: options.project,
    version: options.version,
    jsonPath: bundlePath,
    commitSha,
    tagDate,
    ordinal: options.ordinal,
    extractorVersion: EXTRACTOR_VERSION_DEFAULT,
  });

  // 5. Release notes (optional — skill preflight will call release-notes separately if skipped here).
  let releaseNotesLoaded: number | null = null;
  const token = options.githubToken ?? process.env.GITHUB_TOKEN;
  if (!options.skipReleaseNotes && token) {
    const rn = await loadReleaseNotes({
      db: options.db,
      project: options.project,
      version: options.version,
      githubToken: token,
    });
    releaseNotesLoaded = rn.bulletsInserted;
  }

  return {
    project: options.project,
    version: options.version,
    commitSha,
    entitiesLoaded,
    assetsLoaded: {
      extensions: assets.extensionsUpserted,
      pathRules: assets.pathRulesUpserted,
      cvarBindings: assets.cvarBindingsUpserted,
      loaderSites: assets.loaderSitesUpserted,
    },
    releaseNotesLoaded,
  };
}

function resolveTagDate(repoPath: string, tag: string): string | null {
  try {
    const iso = execSync(`git -C "${repoPath}" log -1 --format=%cI "${tag}"`, {
      encoding: 'utf-8',
    }).trim();
    return iso || null;
  } catch {
    return null;
  }
}
