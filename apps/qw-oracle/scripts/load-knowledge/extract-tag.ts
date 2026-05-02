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
import type postgres from 'postgres';
import { loadVersion } from './load-version.js';
import { loadAssets } from './load-assets.js';
import { loadReleaseNotes, projectHasGithubUpstream } from './load-release-notes.js';
import { buildAssetBundle } from './build-asset-bundle.js';
import { embedEntitiesPass } from '../embed/embed-entities.ts';
import type { EntityType, Project } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

const PROJECT_REPO_PATH: Record<Project, string> = {
  ezquake: join(MONOREPO_ROOT, 'research', 'repos', 'ezquake-source'),
  fte:     join(MONOREPO_ROOT, 'research', 'repos', 'fteqw'),
  mvdsv:   join(MONOREPO_ROOT, 'research', 'repos', 'mvdsv'),
  ktx:     join(MONOREPO_ROOT, 'research', 'repos', 'ktx'),
  qwcl:    join(MONOREPO_ROOT, 'research', 'repos', 'qwcl-original'),
  // qw is the game-itself namespace; it has no engine source repo.
  qw:      '',
};

const EXTRACTORS_ROOT = join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'scripts', 'extractors');

const PROJECT_EXTRACTOR: Record<Project, string | null> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'extract.py'),
  fte: join(EXTRACTORS_ROOT, 'fte', 'extract.py'),
  mvdsv: join(EXTRACTORS_ROOT, 'mvdsv', 'extract.py'),
  ktx: null,
  qwcl: join(EXTRACTORS_ROOT, 'qwcl', 'extract.py'),
  qw: null,
};

const PROJECT_EXTRACTOR_OUTPUT_DIR: Record<Project, string> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'output'),
  fte:     join(EXTRACTORS_ROOT, 'fte', 'output'),
  mvdsv:   join(EXTRACTORS_ROOT, 'mvdsv', 'output'),
  ktx:     join(EXTRACTORS_ROOT, 'ktx', 'output'),
  qwcl:    join(EXTRACTORS_ROOT, 'qwcl', 'output'),
  qw:      '',  // no engine source; maps are extracted separately
};

// The `head` version is not a git tag — it's a moving snapshot of each
// project's default branch. Map it per-project so `extract-tag --version head`
// checks out the right ref instead of failing on a non-existent tag.
//
// QWCL's repo has 2 commits and no tags; `master` resolves to the WinQuake
// import commit, not the QW dump. Hardcode the QW-dump commit so any caller
// that passes --version head lands on the right tree.
const PROJECT_DEFAULT_BRANCH: Record<Project, string> = {
  ezquake: 'master',
  fte: 'master',
  mvdsv: 'master',
  ktx: 'master',
  qwcl: 'bf4ac42',
  qw: '',  // no source repo; extract-tag is not used for qw
};

// Per-project version-label-to-git-ref aliases. The version label is what
// gets stored in the DB (e.g. '2.33') and presented to consumers; the git
// ref is what `git checkout` actually resolves. Most projects don't need
// this — their tag names ARE valid git refs. QWCL is the exception: its
// canonical release name is `2.33` but the underlying commit is bf4ac42
// with no tag.
const PROJECT_VERSION_ALIASES: Record<Project, Record<string, string>> = {
  ezquake: {},
  fte:     { 'build-6698': '35843773' },
  mvdsv:   {},
  ktx:     {},
  qwcl:    { '2.33': 'bf4ac42' },
  qw:      {},  // no source repo; no version aliases needed
};

// Projects with hand-authored asset taxonomy (seed YAMLs + bundle output +
// asset_loader_sites/asset_cvar_bindings extractors). When false, extract-tag
// skips buildAssetBundle, loadAssets, and the asset_category entity-type load.
// QWCL is single-version pre-tooling source; asset taxonomy is not meaningful.
// FTE/MVDSV/KTX flip to true only after their seed authoring lands.
const PROJECT_HAS_ASSET_BUNDLE: Record<Project, boolean> = {
  ezquake: true,
  fte:     true,
  mvdsv:   false,
  ktx:     false,
  qwcl:    false,
  qw:      false,  // maps table stands alone; no asset bundle taxonomy
};

// Slipgate absorbed the bundle location during qw-config dissolution Half 2a
// (2026-04-25); the legacy packages/qw-config/src/data/ tree is gone. Bundle
// rebuild calls (buildAssetBundle in step 2c, asset_category load in step 3,
// loadAssets in step 4) all resolve here.
const BUNDLE_OUTPUT_DIR = join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'src', 'lib', 'config', 'data');

// Per-project entity-type JSON file mapping. Filenames must match each
// extractor's actual output. ezQuake's cvar handler writes
// `ezquake-variables-ast.json` (historic name); other types follow the
// `<project>-<type>-ast.json` pattern. Types absent from a project's map
// (e.g. macros for QWCL, hud_element everywhere except ezQuake) are
// silently skipped during the loader loop. asset_category rows live in
// the asset bundle and are skipped when the project lacks one (see
// PROJECT_HAS_ASSET_BUNDLE).
const ENTITY_JSON_FILES: Record<Project, Partial<Record<EntityType, string>>> = {
  ezquake: {
    cvar:            'ezquake-variables-ast.json',
    command:         'ezquake-commands-ast.json',
    macro:           'ezquake-macros-ast.json',
    cmdline_param:   'ezquake-cmdline-params-ast.json',
    keyname:         'ezquake-keynames-ast.json',
    hud_element:     'ezquake-hud-elements-ast.json',
    ruleset:         'ezquake-rulesets-ast.json',
    token_primitive: 'ezquake-token-primitives-ast.json',
    flag_bit:        'ezquake-flag-bits-ast.json',
    asset_category:  'ezquake-asset-bundle.json',
  },
  qwcl: {
    cvar:          'qwcl-variables-ast.json',
    command:       'qwcl-commands-ast.json',
    cmdline_param: 'qwcl-cmdline-params-ast.json',
  },
  fte: {
    cvar:           'fte-variables-ast.json',
    command:        'fte-commands-ast.json',
    macro:          'fte-macros-ast.json',
    cmdline_param:  'fte-cmdline-params-ast.json',
    cvar_alias:     'fte-aliases-ast.json',
    asset_category: 'fte-asset-bundle.json',
  },
  mvdsv: {
    cvar:             'mvdsv-variables-ast.json',
    command:          'mvdsv-commands-ast.json',
    cmdline_param:    'mvdsv-cmdline-params-ast.json',
    protocol_message: 'mvdsv-protocol-messages-ast.json',
    info_key:         'mvdsv-info-keys-ast.json',
    log_template:     'mvdsv-log-templates-ast.json',
    qc_builtin:       'mvdsv-qc-builtins-ast.json',
  },
  ktx:   {},
  qw:    {},  // no entity types; maps live in the maps table, not entities
};

// Per-project asset bundle filename. The bundle output dir is shared
// (BUNDLE_OUTPUT_DIR), but each project produces its own <project>-asset-bundle.json.
const ASSET_BUNDLE_FILE: Record<Project, string> = {
  ezquake: 'ezquake-asset-bundle.json',
  fte:     'fte-asset-bundle.json',
  mvdsv:   '',  // unused; PROJECT_HAS_ASSET_BUNDLE.mvdsv === false
  ktx:     '',  // unused; PROJECT_HAS_ASSET_BUNDLE.ktx === false
  qwcl:    '',  // unused; PROJECT_HAS_ASSET_BUNDLE.qwcl === false
  qw:      '',  // unused; PROJECT_HAS_ASSET_BUNDLE.qw === false
};

// Legacy single-purpose extractors not yet folded into the unified driver.
// Each takes --repo-root + --output; runs against the currently-checked-out
// source tree and writes the canonical JSON into the project's output dir.
const LEGACY_EXTRACTORS_EZQUAKE: ReadonlyArray<{ script: string; output: string }> = [
  { script: 'rulesets.py',         output: 'ezquake-rulesets-ast.json' },
  { script: 'token-primitives.py', output: 'ezquake-token-primitives-ast.json' },
  { script: 'flag-bits.py',        output: 'ezquake-flag-bits-ast.json' },
];

// FTE legacy single-purpose extractors. Just the path-rules verifier today;
// expand if more land. Same shape and error-handling as the ezQuake set.
const LEGACY_EXTRACTORS_FTE: ReadonlyArray<{ script: string; output: string }> = [
  { script: 'asset-path-rules-verify.py', output: 'fte-asset-path-rules-verified.json' },
];

const EXTRACTOR_VERSION_DEFAULT = 'clang-ezquake-unified@1.0.0';

export interface ExtractTagOptions {
  sql: postgres.Sql;
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

  // 1. Checkout. `head` resolves to the project's default branch. Other
  // version labels are first translated through PROJECT_VERSION_ALIASES so
  // tagless projects (qwcl) can map a canonical release name to a commit
  // sha; an unmapped label falls through as a tag/ref to git directly. Only
  // fetch if the target ref is not already known locally, so the common
  // case stays offline-safe.
  const aliasMap = PROJECT_VERSION_ALIASES[options.project];
  const checkoutRef = options.version === 'head'
    ? PROJECT_DEFAULT_BRANCH[options.project]
    : (aliasMap[options.version] ?? options.version);
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
  // Resolve tag_date against the checked-out ref, not the version label —
  // version labels can be aliases (qwcl '2.33' -> commit bf4ac42) that
  // git log won't recognize as a revision.
  const tagDate = options.tagDate ?? resolveTagDate(repoPath, checkoutRef);

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
  } else if (options.project === 'fte') {
    const projectScriptsDir = join(EXTRACTORS_ROOT, 'fte');
    for (const { script, output } of LEGACY_EXTRACTORS_FTE) {
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
  const fileMap = ENTITY_JSON_FILES[options.project];
  for (const [type, jsonFile] of Object.entries(fileMap) as [EntityType, string][]) {
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
    const result = await loadVersion({
      sql: options.sql,
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
    const bundlePath = join(BUNDLE_OUTPUT_DIR, ASSET_BUNDLE_FILE[options.project]);
    if (!existsSync(bundlePath)) {
      throw new Error(
        `Asset bundle missing at ${bundlePath}. ` +
        `Run build-asset-bundle for ${options.project}:${options.version} before extract-tag.`,
      );
    }
    assets = await loadAssets({
      sql: options.sql,
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
      sql: options.sql,
      project: options.project,
      version: options.version,
      githubToken: token,
    });
    releaseNotesLoaded = rn.bulletsInserted;
  }

  // 6. Layer 1 entity-description embedding pass. Runs OUTSIDE any loader
  // transaction; structured rows are already committed by step 3 / step 4.
  // A Voyage outage marks affected rows description_embedding_stale=TRUE
  // but does not fail the overall extract-tag exit -- lexical search via
  // description_tsv stays operational either way.
  try {
    await embedEntitiesPass();
  } catch (err) {
    console.error(`[extract-tag] embedEntitiesPass threw: ${(err as Error).message}`);
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
