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
import { buildAssetBundle } from './build-asset-bundle.js';
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

// The `head` version is not a git tag — it's a moving snapshot of each
// project's default branch. Map it per-project so `extract-tag --version head`
// checks out the right ref instead of failing on a non-existent tag.
const PROJECT_DEFAULT_BRANCH: Record<Project, string> = {
  ezquake: 'master',
  fte: 'master',
  mvdsv: 'master',
  ktx: 'master',
};

const EXTRACTOR_OUTPUT_DIR = join(MONOREPO_ROOT, 'packages', 'qw-config', 'src', 'data');

// Per-entity-type JSON file mapping. Names must match the extractors' actual
// output filenames (unified and legacy). The cvar handler writes
// `ezquake-variables-ast.json` (historic name); everything else is on the
// canonical `ezquake-<type>-ast.json` pattern.
const ENTITY_JSON_FILES: Record<EntityType, string | null> = {
  cvar:            'ezquake-variables-ast.json',
  command:         'ezquake-commands-ast.json',
  macro:           'ezquake-macros-ast.json',
  cmdline_param:   'ezquake-cmdline-params-ast.json',
  keyname:         'ezquake-keynames-ast.json',
  hud_element:     'ezquake-hud-elements-ast.json',
  ruleset:         'ezquake-rulesets-ast.json',
  token_primitive: 'ezquake-token-primitives-ast.json',
  flag_bit:        'ezquake-flag-bits-ast.json',
  // asset_category rows live under the `asset_categories` top-level field
  // of the bundle JSON, so point the entity loader at the bundle.
  asset_category:  'ezquake-asset-bundle.json',
};

const ASSET_BUNDLE_FILE = 'ezquake-asset-bundle.json';

// Legacy single-purpose extractors not yet folded into the unified driver.
// Each takes --repo-root + --output; runs against the currently-checked-out
// source tree and writes the canonical JSON into EXTRACTOR_OUTPUT_DIR.
const LEGACY_EXTRACTORS_EZQUAKE: ReadonlyArray<{ script: string; output: string }> = [
  { script: 'extract-ezquake-rulesets-clang.py',         output: 'ezquake-rulesets-ast.json' },
  { script: 'extract-ezquake-token-primitives-clang.py', output: 'ezquake-token-primitives-ast.json' },
  { script: 'extract-ezquake-flag-bits-clang.py',        output: 'ezquake-flag-bits-ast.json' },
];

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
  // Skip the cross-type help-JSON orphan prune at end of each per-type
  // load. Use during deep-time walks to avoid the partial-state artifact
  // where an entity is doc_only at newer tags but source-defined at
  // not-yet-loaded older tags. Run `prune-cross-type-orphans` once at
  // end of walk.
  skipPrune?: boolean;
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

  // 1. Checkout. `head` resolves to the project's default branch; every other
  // value is treated as a tag. Only fetch if the target ref is not already
  // known locally, so the common case stays offline-safe.
  const checkoutRef = options.version === 'head'
    ? PROJECT_DEFAULT_BRANCH[options.project]
    : options.version;
  const refKnown = spawnSync(
    'git', ['-C', repoPath, 'rev-parse', '--verify', checkoutRef],
    { stdio: 'ignore' },
  ).status === 0;
  if (!refKnown) {
    execSync(`git -C "${repoPath}" fetch --tags --quiet`, { stdio: 'inherit' });
  }
  execSync(`git -C "${repoPath}" checkout "${checkoutRef}"`, { stdio: 'inherit' });

  const commitSha = options.commitSha ?? execSync(`git -C "${repoPath}" rev-parse HEAD`, {
    encoding: 'utf-8',
  }).trim();
  const tagDate = options.tagDate ?? resolveTagDate(repoPath, options.version);

  // 2. Unified Python extractor (cvar / command / macro / cmdline_param /
  // keyname / hud_element / asset_cvar_bindings / asset_loader_sites).
  const unifiedRun = spawnSync(
    'python3',
    [
      extractorPath,
      '--repo-root', repoPath,
      '--output-dir', EXTRACTOR_OUTPUT_DIR,
      '--handlers', 'all',
    ],
    { stdio: 'inherit' },
  );
  if (unifiedRun.status !== 0) {
    throw new Error(`Python unified extractor failed with status ${unifiedRun.status}`);
  }

  // 2b. Legacy single-purpose extractors (ruleset / token_primitive / flag_bit).
  // Older tags may not have the source files some of these scan — the scripts
  // themselves treat missing inputs as empty output with a diagnostic, so we
  // don't error the run on a non-zero status here. If a script is truly
  // broken the subsequent loadVersion call will fail loudly.
  if (options.project === 'ezquake') {
    const scriptsDir = join(MONOREPO_ROOT, 'packages', 'qw-config', 'scripts');
    for (const { script, output } of LEGACY_EXTRACTORS_EZQUAKE) {
      const scriptPath = join(scriptsDir, script);
      const outPath = join(EXTRACTOR_OUTPUT_DIR, output);
      const run = spawnSync(
        'python3',
        [scriptPath, '--repo-root', repoPath, '--output', outPath],
        { stdio: 'inherit' },
      );
      if (run.status !== 0) {
        console.warn(`[extract-tag] legacy extractor ${script} exited ${run.status}; continuing`);
      }
    }
  }

  // 2c. Rebuild the asset bundle for this specific version. The bundle merges
  // seed YAMLs + the two asset AST JSONs produced in step 2 and stamps its
  // own `version` field — loadAssets rejects a mismatch, so per-tag rebuild
  // is required.
  buildAssetBundle({ project: options.project, version: options.version });

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
      skipPrune: options.skipPrune ?? false,
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
