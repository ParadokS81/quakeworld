// apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
//
// Atomic "ensure this tag is fully loaded" operation. Runs:
//   1. git checkout <tag> in the project's source repo
//   2. the unified Python extractor (writes JSON files to apps/qw-oracle/scripts/extractors/<project>/output/)
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
import { loadReleaseNotes, projectHasGithubUpstream } from './load-release-notes.js';
import { buildAssetBundle } from './build-asset-bundle.js';
import type { EntityType, Project } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

const PROJECT_REPO_PATH: Record<Project, string> = {
  ezquake: join(MONOREPO_ROOT, 'research', 'repos', 'ezquake-source'),
  fte:     join(MONOREPO_ROOT, 'research', 'repos', 'fteqw'),
  mvdsv:   join(MONOREPO_ROOT, 'research', 'repos', 'mvdsv'),
  ktx:     join(MONOREPO_ROOT, 'research', 'repos', 'ktx'),
  qwcl:    join(MONOREPO_ROOT, 'research', 'repos', 'qwcl-original'),
};

const EXTRACTORS_ROOT = join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'scripts', 'extractors');

const PROJECT_EXTRACTOR: Record<Project, string | null> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'extract.py'),
  fte: null,
  mvdsv: null,
  ktx: null,
  qwcl: join(EXTRACTORS_ROOT, 'qwcl', 'extract.py'),
};

const PROJECT_EXTRACTOR_OUTPUT_DIR: Record<Project, string> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'output'),
  fte:     join(EXTRACTORS_ROOT, 'fte', 'output'),
  mvdsv:   join(EXTRACTORS_ROOT, 'mvdsv', 'output'),
  ktx:     join(EXTRACTORS_ROOT, 'ktx', 'output'),
  qwcl:    join(EXTRACTORS_ROOT, 'qwcl', 'output'),
};

// The `head` version is not a git tag — it's a moving snapshot of each
// project's default branch. Map it per-project so `extract-tag --version head`
// checks out the right ref instead of failing on a non-existent tag.
//
// QWCL's repo has 2 commits and no tags; `master` resolves to the WinQuake
// import commit, not the QW dump. Hardcode the QW-dump commit so any caller
// that passes --version head lands on the right tree. The expected workflow
// is to pass --version 2.33 explicitly; head is a fallback.
const PROJECT_DEFAULT_BRANCH: Record<Project, string> = {
  ezquake: 'master',
  fte: 'master',
  mvdsv: 'master',
  ktx: 'master',
  qwcl: 'bf4ac42',
};

// Projects with hand-authored asset taxonomy (seed YAMLs + bundle output +
// asset_loader_sites/asset_cvar_bindings extractors). When false, extract-tag
// skips buildAssetBundle, loadAssets, and the asset_category entity-type load.
// QWCL is single-version pre-tooling source; asset taxonomy is not meaningful.
// FTE/MVDSV/KTX flip to true only after their seed authoring lands.
const PROJECT_HAS_ASSET_BUNDLE: Record<Project, boolean> = {
  ezquake: true,
  fte:     false,
  mvdsv:   false,
  ktx:     false,
  qwcl:    false,
};

// Bundle output stays in qw-config until slipgate-app migrates to oracle snapshots
// (qw-config dissolution Half 2). Slipgate's bundle.ts imports from this path.
const BUNDLE_OUTPUT_DIR = join(MONOREPO_ROOT, 'packages', 'qw-config', 'src', 'data');

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
// source tree and writes the canonical JSON into the project's output dir.
const LEGACY_EXTRACTORS_EZQUAKE: ReadonlyArray<{ script: string; output: string }> = [
  { script: 'rulesets.py',         output: 'ezquake-rulesets-ast.json' },
  { script: 'token-primitives.py', output: 'ezquake-token-primitives-ast.json' },
  { script: 'flag-bits.py',        output: 'ezquake-flag-bits-ast.json' },
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
  const extractorOutputDir = PROJECT_EXTRACTOR_OUTPUT_DIR[options.project];
  const unifiedRun = spawnSync(
    'python3',
    [
      extractorPath,
      '--repo-root', repoPath,
      '--output-dir', extractorOutputDir,
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
    const projectScriptsDir = join(EXTRACTORS_ROOT, 'ezquake');
    for (const { script, output } of LEGACY_EXTRACTORS_EZQUAKE) {
      const scriptPath = join(projectScriptsDir, script);
      const outPath = join(extractorOutputDir, output);
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
  // is required. Skipped for projects without an asset bundle (QWCL today).
  const hasAssetBundle = PROJECT_HAS_ASSET_BUNDLE[options.project];
  if (hasAssetBundle) {
    buildAssetBundle({ project: options.project, version: options.version });
  }

  // 3. Entity loaders.
  const entitiesLoaded: Partial<Record<EntityType, number>> = {};
  for (const [type, jsonFile] of Object.entries(ENTITY_JSON_FILES) as [EntityType, string | null][]) {
    if (!jsonFile) continue;
    // asset_category lives only in the asset bundle; skip when the project
    // doesn't ship one. Every other type loads from the extractor's per-project
    // output dir.
    if (type === 'asset_category' && !hasAssetBundle) continue;
    const jsonPath = type === 'asset_category'
      ? join(BUNDLE_OUTPUT_DIR, jsonFile)
      : join(extractorOutputDir, jsonFile);
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

  // 4. Asset bundle. Skipped for projects without one.
  let assets = { extensionsUpserted: 0, pathRulesUpserted: 0, cvarBindingsUpserted: 0, loaderSitesUpserted: 0 };
  if (hasAssetBundle) {
    const bundlePath = join(BUNDLE_OUTPUT_DIR, ASSET_BUNDLE_FILE);
    if (!existsSync(bundlePath)) {
      throw new Error(
        `Asset bundle missing at ${bundlePath}. ` +
        `Run build-asset-bundle for ${options.project}:${options.version} before extract-tag.`,
      );
    }
    assets = loadAssets({
      db: options.db,
      project: options.project,
      version: options.version,
      jsonPath: bundlePath,
      commitSha,
      tagDate,
      ordinal: options.ordinal,
      extractorVersion: EXTRACTOR_VERSION_DEFAULT,
    });
  }

  // 5. Release notes (optional — skill preflight will call release-notes separately if skipped here).
  // Skipped automatically for projects without a GitHub upstream (qwcl).
  let releaseNotesLoaded: number | null = null;
  const token = options.githubToken ?? process.env.GITHUB_TOKEN;
  if (!options.skipReleaseNotes && token && projectHasGithubUpstream(options.project)) {
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
