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
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type postgres from 'postgres';
import { loadVersion, recheckFullyOrphanedAfterPostLoops } from './load-version.js';
import { loadAssets } from './load-assets.js';
import { loadReleaseNotes, projectHasGithubUpstream } from './load-release-notes.js';
import { buildAssetBundle } from './build-asset-bundle.js';
import { embedEntitiesPass } from '../embed/embed-entities.ts';
import type {
  AcceptanceValidationRecord,
  EntityType,
  Level3StampSet,
  Project,
} from './types.js';

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
  // qtv/qwfwd are frozen vendored snapshots; no live source repo clone needed.
  qtv:     join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'reference', 'qtv'),
  qwfwd:   join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'reference', 'qwfwd'),
};

const EXTRACTORS_ROOT = join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'scripts', 'extractors');

const PROJECT_EXTRACTOR: Record<Project, string | null> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'extract.py'),
  fte: join(EXTRACTORS_ROOT, 'fte', 'extract.py'),
  mvdsv: join(EXTRACTORS_ROOT, 'mvdsv', 'extract.py'),
  ktx: join(EXTRACTORS_ROOT, 'ktx', 'extract.py'),
  qwcl: join(EXTRACTORS_ROOT, 'qwcl', 'extract.py'),
  qw: null,
  // frozen vendored snapshots -- bypass extract-tag entirely (D1)
  qtv: null,
  qwfwd: null,
};

const PROJECT_EXTRACTOR_OUTPUT_DIR: Record<Project, string> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'output'),
  fte:     join(EXTRACTORS_ROOT, 'fte', 'output'),
  mvdsv:   join(EXTRACTORS_ROOT, 'mvdsv', 'output'),
  ktx:     join(EXTRACTORS_ROOT, 'ktx', 'output'),
  qwcl:    join(EXTRACTORS_ROOT, 'qwcl', 'output'),
  qw:      '',  // no engine source; maps are extracted separately
  qtv:     join(EXTRACTORS_ROOT, 'qtv', 'output'),
  qwfwd:   join(EXTRACTORS_ROOT, 'qwfwd', 'output'),
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
  qtv:   'main',
  qwfwd: 'main',
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
  qtv:     {},
  qwfwd:   {},
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
  qtv:     false,
  qwfwd:   false,
};

// Slipgate absorbed the bundle location during qw-config dissolution Half 2a
// (2026-04-25); the legacy packages/qw-config/src/data/ tree is gone. Bundle
// rebuild calls (buildAssetBundle in step 2c, asset_category load in step 3,
// loadAssets in step 4) all resolve here.
const BUNDLE_OUTPUT_DIR = join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'src', 'lib', 'config', 'data');

// enforce-L1-runtime-truth Phase 4 / Task 4 -- the SHIPPED acceptance
// artifacts directory (written by extractor_lib._acceptance run_stage1/2).
const DETECTION_DIR = join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'data', 'detection');

// Prefix-tolerant (case-insensitive) commit agreement -- the SAME mechanic
// _acceptance.validation_record_ok documents (F7 self-certifies via a short
// prefix): the validation record holds the SHORT pin token while oracle_meta
// holds the FULL 40-char hash. True iff either string is a prefix of the
// other. Empty inputs -> false (fail-safe-CLOSED).
function pinsAgree(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.startsWith(y) || y.startsWith(x);
}

// Resolve the Task-4 stage-2 stamp-set for the ezQuake Track-A/B loaders,
// computed ONCE and shared by the 3e (Track-B) + 3f (Track-A) blocks.
//
// This is the LOADER-SIDE realization of the D22 structural gate (the
// emit-side gate already governs whether the 10th file exists at all; this
// governs whether the stamp is APPLIED). Returns the parsed stamp-set ONLY
// when ALL hold:
//   - the SHIPPED acceptance-validated-ezquake.json exists AND status==GREEN
//   - its validation_commit prefix-agrees with the loaded version's
//     per-version commit (versions.commit_sha WHERE version=<version>) -- i.e.
//     the loaded `version` IS the pinned-dump version (Phase-3 rows are all at
//     version='head' and that is what the pin certifies). NB: per-version
//     commit_sha, not the global oracle_meta pin, which a stable-tag backfill
//     clobbers off head.
//   - level3-stamp-set-<validation_commit>.json exists and parses
// Otherwise returns null -> the loaders run with NO stamp-set ->
// Phase-3 level-2 behaviour EXACTLY (D18/D22 fail-safe-CLOSED). Any
// read/parse failure -> null (never throws -- a stamp-set we cannot trust
// is one we do not apply).
async function resolveStageTwoStampSet(
  sql: postgres.Sql,
  version: string,
): Promise<Level3StampSet | null> {
  try {
    const recordPath = join(DETECTION_DIR, 'acceptance-validated-ezquake.json');
    if (!existsSync(recordPath)) {
      console.warn(
        `[extract-tag] D22 (loader): acceptance-validated-ezquake.json absent ` +
        `-> NO stage-2 stamp (Phase-3 level-2; today's pipeline).`,
      );
      return null;
    }
    const record = JSON.parse(
      readFileSync(recordPath, 'utf-8'),
    ) as AcceptanceValidationRecord;
    if (record.status !== 'GREEN') {
      console.warn(
        `[extract-tag] D22 (loader): acceptance record status=${record.status} ` +
        `(not GREEN) -> NO stage-2 stamp (Phase-3 level-2; today's pipeline).`,
      );
      return null;
    }

    // The loaded version's certifying commit is its PER-VERSION provenance in
    // versions.commit_sha (the full 40-char hash). The validation record holds
    // the short token. They must prefix-agree for this version to BE the
    // pinned-dump version.
    //
    // WHY versions.commit_sha and NOT oracle_meta:source_repo_commit (the
    // original source): oracle_meta:source_repo_commit is GLOBAL and records
    // whatever extraction ran LAST. A stable-tag backfill (e.g. 3.6.7) run
    // after a head walk CLOBBERS it to the tag's commit, even though the head
    // entities are still at the head commit -> the pin would spuriously fail on
    // a correct head dump (verified 2026-06-05: 3.6.7 backfill clobbered
    // oracle_meta to 7b2f0552 while versions head = e4a2c20a). The per-version
    // commit_sha is head-stable across backfills.
    const pinRows = await sql<{ commit_sha: string }[]>`
      SELECT commit_sha FROM versions
      WHERE project = 'ezquake' AND version = ${version}
    `;
    const currentPin = pinRows.length > 0 ? pinRows[0]!.commit_sha : null;
    if (!pinsAgree(record.validation_commit, currentPin)) {
      console.warn(
        `[extract-tag] D22 (loader): version='${version}' pin ` +
        `${currentPin ?? '<unset>'} does not agree with validated commit ` +
        `${record.validation_commit} -> NO stage-2 stamp (not the ` +
        `pinned-dump version; Phase-3 level-2).`,
      );
      return null;
    }

    // The stamp-set filename keys off the SHORT validation_commit token
    // (matches _acceptance._stamp_set_path(pin)).
    const stampPath = join(
      DETECTION_DIR,
      `level3-stamp-set-${record.validation_commit}.json`,
    );
    if (!existsSync(stampPath)) {
      console.warn(
        `[extract-tag] D22 (loader): ${stampPath} absent though the record ` +
        `is GREEN -> NO stage-2 stamp (Phase-3 level-2). Re-run ` +
        `accept-runtime-truth.py --stage all if this is unexpected.`,
      );
      return null;
    }
    const stampSet = JSON.parse(
      readFileSync(stampPath, 'utf-8'),
    ) as Level3StampSet;
    console.log(
      `[extract-tag] D22 (loader): GREEN + pin-agreed -> stage-2 stamp-set ` +
      `proxy=${stampSet.proxy}, track_a=${stampSet.track_a_dump_confirmed.length}, ` +
      `track_b=${stampSet.track_b_dump_confirmed.length} ` +
      `(level-3 stamp applied for the dump-confirmed names; ` +
      `proxy=FAIL would mean empty lists -> nothing stamped).`,
    );
    return stampSet;
  } catch (e) {
    // Fail-safe-CLOSED: an unreadable / malformed stamp-set is one we do
    // not apply. The loaders then run Phase-3 level-2 exactly.
    console.warn(
      `[extract-tag] D22 (loader): stamp-set resolution failed (${e}) ` +
      `-> NO stage-2 stamp (Phase-3 level-2; today's pipeline).`,
    );
    return null;
  }
}

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
  ktx: {
    cvar:         'ktx-variables-ast.json',
    command:      'ktx-commands-ast.json',
    info_key:     'ktx-info-keys-ast.json',
    log_template: 'ktx-log-templates-ast.json',
    match_event:  'ktx-match-events-ast.json',
  },
  qw:    {},  // no entity types; maps live in the maps table, not entities
  qtv: {
    cvar:    'qtv-variables-ast.json',
    command: 'qtv-commands-ast.json',
  },
  qwfwd: {
    cvar:         'qwfwd-variables-ast.json',
    command:      'qwfwd-commands-ast.json',
    cmdline_param: 'qwfwd-cmdline-params-ast.json',
    info_key:     'qwfwd-info-keys-ast.json',
  },
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
  qtv:     '',  // unused; PROJECT_HAS_ASSET_BUNDLE.qtv === false
  qwfwd:   '',  // unused; PROJECT_HAS_ASSET_BUNDLE.qwfwd === false
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

  // F17 fail-safe-completeness (2026-05-22): unlink the additive 10th
  // file BEFORE the extractor runs. emit_callgraph_signal.py writes it
  // IFF the D22 gate is GREEN; on OFF/RED it returns None and the file
  // is NOT refreshed. Pre-unlinking guarantees existsSync after the
  // extractor reflects THIS run's GREEN/OFF/RED state, not a prior
  // GREEN run's stale signal. The 9th file (ezquake-hud-commands-ast.json)
  // is unconditional (HUD commands are real entities discovered
  // independently of the callgraph passenger), so it is NOT unlinked here.
  if (options.project === 'ezquake') {
    const stale10thPath = join(extractorOutputDir, 'ezquake-callgraph-reachability-ast.json');
    if (existsSync(stale10thPath)) {
      unlinkSync(stale10thPath);
    }
  }

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
  // F16 fix (2026-05-21): collect fully-orphaned IDs per type so we can
  // re-check them after post-loop adapters (3e Track-B HUD commands, etc.)
  // have populated their version-rows. Per-entity + summary warnings are
  // deferred to recheckFullyOrphanedAfterPostLoops at the boundary below
  // (step 3g) so transient inter-step gaps don't fire false positives.
  const orphansByType: Partial<Record<EntityType, number[]>> = {};
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
    if (result.fullyOrphanedEntityIds.length > 0) {
      orphansByType[type] = result.fullyOrphanedEntityIds;
    }
  }

  // 3b. KTX modes load (Phase 3 of KTX onboarding arc). After the entity-loader
  // loop, also load mode_default + game_mode rows from _handler_modes.py's
  // ktx-modes-ast.json. These rows live in gameplay_mechanics (not entities), so
  // they're handled outside the entity-loader loop. Idempotent UPSERT; safe to
  // re-run. existsSync-guarded so the call no-ops on a fresh checkout where the
  // modes handler hasn't yet been exercised.
  if (options.project === 'ktx') {
    const modesJsonPath = join(extractorOutputDir, 'ktx-modes-ast.json');
    if (existsSync(modesJsonPath)) {
      const { loadModesFromFile } = await import('./load-modes.js');
      const modesResult = await loadModesFromFile(options.sql, modesJsonPath);
      console.log(
        `[extract-tag] ktx modes loaded: game_mode total=${modesResult.total.game_mode}, ` +
        `mode_default total=${modesResult.total.mode_default}`,
      );
    } else {
      console.warn(
        `[extract-tag] ktx-modes-ast.json missing at ${modesJsonPath}; ` +
        `skipping mode loading. Re-run extract-tag once the modes handler ships if this is unexpected.`,
      );
    }
  }

  // 3c. KTX taxonomies load (Phase 4 of KTX onboarding arc). After modes, also
  // load election_type + death_rule rows from _handler_gameplay_taxonomies.py's
  // ktx-gameplay-taxonomies-ast.json. Same pattern as 3b above. Idempotent
  // UPSERT; safe to re-run. existsSync-guarded so the call no-ops on a fresh
  // checkout where the taxonomies handler hasn't yet been exercised.
  if (options.project === 'ktx') {
    const taxonomiesJsonPath = join(extractorOutputDir, 'ktx-gameplay-taxonomies-ast.json');
    if (existsSync(taxonomiesJsonPath)) {
      const { loadTaxonomiesFromFile } = await import('./load-gameplay-taxonomies.js');
      const taxonomiesResult = await loadTaxonomiesFromFile(options.sql, taxonomiesJsonPath);
      console.log(
        `[extract-tag] ktx taxonomies loaded: ` +
        `election_type total=${taxonomiesResult.total.election_type}, ` +
        `death_rule total=${taxonomiesResult.total.death_rule}`,
      );
    } else {
      console.warn(
        `[extract-tag] ktx-gameplay-taxonomies-ast.json missing at ${taxonomiesJsonPath}; ` +
        `skipping taxonomies loading. Re-run extract-tag once Phase 4 ships if this is unexpected.`,
      );
    }
  }

  // 3d. KTX gameplay-tables load (Phase 5 of KTX onboarding arc). After
  // taxonomies, load monster + score_system + drop_item + loc_macro +
  // teamplay_message rows from _handler_gameplay_tables.py's
  // ktx-gameplay-tables-ast.json. Cross-table dispatch: monster lands in
  // gameplay_entity_defs; the other 4 land in gameplay_mechanics. Idempotent
  // UPSERT; safe to re-run. F10 invariant: every score_system row has
  // positions.length === 10 (loader-side fail-fast).
  if (options.project === 'ktx') {
    const tablesJsonPath = join(extractorOutputDir, 'ktx-gameplay-tables-ast.json');
    if (existsSync(tablesJsonPath)) {
      const { loadTablesFromFile } = await import('./load-gameplay-tables.js');
      const tablesResult = await loadTablesFromFile(options.sql, tablesJsonPath);
      console.log(
        `[extract-tag] ktx tables loaded: ` +
        `monster=${tablesResult.total.monster}, ` +
        `score_system=${tablesResult.total.score_system}, ` +
        `drop_item=${tablesResult.total.drop_item}, ` +
        `loc_macro=${tablesResult.total.loc_macro}, ` +
        `teamplay_message=${tablesResult.total.teamplay_message}`,
      );
    } else {
      console.warn(
        `[extract-tag] ktx-gameplay-tables-ast.json missing at ${tablesJsonPath}; ` +
        `skipping tables loading. Re-run extract-tag once Phase 5 ships if this is unexpected.`,
      );
    }
  }

  // 3e. ezQuake Track-B HUD-commands load (enforce-L1-runtime-truth Phase
  // 3). After the entity-loader loop, load the recovered HUD commands from
  // _handler_hud.py's ezquake-hud-commands-ast.json as first-class
  // type='command' entities, each carrying the track_b_hud_recovery spine
  // on its command_versions row. Same 3b/3c precedent as the KTX modes
  // block above: a non-standard loader whose data is NOT
  // EntityType-dispatch-loop-shaped (hud_command is not an EntityType --
  // D21 keeps these as type='command', so they cannot ride
  // ENTITY_JSON_FILES + the typed dispatch loop, which casts as
  // [EntityType,string][] and would throw "Unknown entity type"). Runs
  // BEFORE the Track-A overlay (3f) so the rows it creates already exist
  // when the overlay stamps them. Project-scoped + existsSync-guarded +
  // idempotent (safe to re-run; the call no-ops on a checkout where the
  // HUD-commands handler has not yet been exercised).
  // enforce-L1-runtime-truth Phase 4 / Task 4 -- resolve the stage-2
  // stamp-set ONCE here (ezQuake-only) so the 3e (Track-B) + 3f (Track-A)
  // blocks share the SAME decision and one set of LOUD log lines. null when
  // not mechanism-validated GREEN at the loaded version's pin -> both
  // loaders run Phase-3 level-2 exactly (D18/D22 fail-safe-CLOSED). This is
  // the LIVE wiring site (F6/F10/F12 family: the Phase-4 MD's "wire in
  // load-version.ts" is wrong vs live -- load-version.ts has ZERO
  // overlay/adapter/stamp references; loadHudCommandsFromFile /
  // loadCallgraphReachabilityFromFile are invoked HERE, in 3e/3f).
  const stageTwoStampSet =
    options.project === 'ezquake'
      ? await resolveStageTwoStampSet(options.sql, options.version)
      : null;

  if (options.project === 'ezquake') {
    const hudCommandsJsonPath = join(extractorOutputDir, 'ezquake-hud-commands-ast.json');
    if (existsSync(hudCommandsJsonPath)) {
      const { loadHudCommandsFromFile } = await import('./load-hud-commands.js');
      const hudResult = await loadHudCommandsFromFile(
        options.sql,
        options.version,
        hudCommandsJsonPath,
        // Stage-2 stamp-set (null -> Phase-3 level-2 exactly).
        stageTwoStampSet ?? undefined,
      );
      console.log(
        `[extract-tag] ezquake Track-B HUD commands loaded: ` +
        `total=${hudResult.total} (inserted=${hudResult.inserted}, updated=${hudResult.updated})`,
      );
    } else {
      console.warn(
        `[extract-tag] ezquake-hud-commands-ast.json missing at ${hudCommandsJsonPath}; ` +
        `skipping Track-B HUD-command loading. Re-run extract-tag once the HUD-commands ` +
        `handler ships if this is unexpected.`,
      );
    }
  }

  // 3f. ezQuake Track-A reachability overlay (enforce-L1-runtime-truth
  // Phase 3). After Track-B (3e), overlay the locked Track-A spine from
  // emit_callgraph_signal.py's additive 10th file
  // ezquake-callgraph-reachability-ast.json onto the EXISTING
  // cvar_versions / command_versions rows (including the
  // just-created Track-B command rows). This is an OVERLAY: it creates NO
  // entities (X7); a signal entry that matches no existing entity is
  // skipped + counted (a non-zero skip count is logged LOUD, never a
  // silent drop). Runs LAST of the ezQuake post-loop blocks so every
  // cvar/command row it stamps already exists. Project-scoped +
  // existsSync-guarded + idempotent (the ON CONFLICT path re-supplies the
  // spine each run; the per-type loaders' nulls are COALESCEd so they
  // never wipe it).
  //
  // F17 fail-safe-completeness (2026-05-22): the existsSync guard is
  // necessary but not sufficient -- a prior GREEN run leaves a valid 10th
  // file on disk that a subsequent OFF/RED run would still consume (the
  // producer fail-safe-CLOSES by not writing new content but does not
  // unlink). The pre-extractor unlink (in step 2) closes the
  // freshness gap so existsSync now reflects THIS run's emit state. We
  // ADDITIONALLY gate on stageTwoStampSet (the loader-side D22 gate; same
  // record + GREEN + pin-agreement check the producer applies) -- if the
  // mechanism is not GREEN at the loaded pin, the overlay is skipped AND
  // the level-2 column is explicitly wiped (the COALESCE in natural-keys
  // would otherwise preserve stale prior-GREEN values; the UPDATE below
  // sidesteps it by writing outside the upsert path). Level-3 / source_state
  // = 'dump-confirmed' is unaffected by this branch -- it is governed by
  // the existing stageTwoStampSet null-path on the loader side and was
  // proven 0 on RED at the Phase-4 RE-VERIFY (the safety property the
  // North Star rests on).
  if (options.project === 'ezquake') {
    const reachabilityJsonPath = join(extractorOutputDir, 'ezquake-callgraph-reachability-ast.json');
    const artifactPresent = existsSync(reachabilityJsonPath);
    const gateGreen = stageTwoStampSet !== null;
    if (artifactPresent && gateGreen) {
      const { loadCallgraphReachabilityFromFile } = await import('./load-callgraph-reachability.js');
      const cgResult = await loadCallgraphReachabilityFromFile(
        options.sql,
        options.version,
        reachabilityJsonPath,
        // Same stage-2 stamp-set as 3e (null -> Phase-3 level-2 exactly).
        stageTwoStampSet ?? undefined,
      );
      console.log(
        `[extract-tag] ezquake Track-A reachability overlay: ` +
        `cvar_stamped=${cgResult.cvarStamped}, command_stamped=${cgResult.commandStamped}, ` +
        `skipped=${cgResult.skipped}`,
      );
      if (cgResult.skipped > 0) {
        console.warn(
          `[extract-tag] Track-A overlay SKIPPED ${cgResult.skipped} signal ` +
          `entr${cgResult.skipped === 1 ? 'y' : 'ies'} with no matching loaded entity ` +
          `(NOT created -- X7). First few: ${cgResult.skippedNames.slice(0, 10).join(', ')}` +
          `${cgResult.skippedNames.length > 10 ? ', ...' : ''}`,
        );
      }
    } else {
      // F17 fix: retreat the level-2 track_a_reachability column to NULL
      // when the mechanism is OFF (no fresh artifact this run) or RED
      // (D22 gate not GREEN at loaded pin). UPDATE bypasses the COALESCE
      // in natural-keys (which is load-bearing for command_versions
      // Track-A <-> Track-B coexistence and must stay).
      const reason = !artifactPresent
        ? 'no callgraph signal artifact this run (passenger OFF or D22 RED at emit-side)'
        : 'D22 gate not GREEN at loaded pin (loader-side stageTwoStampSet null)';
      const cvarWipe = await options.sql`
        UPDATE cvar_versions SET track_a_reachability = NULL
        WHERE entity_id IN (SELECT id FROM entities WHERE project = 'ezquake')
          AND track_a_reachability IS NOT NULL
      `;
      const cmdWipe = await options.sql`
        UPDATE command_versions SET track_a_reachability = NULL
        WHERE entity_id IN (SELECT id FROM entities WHERE project = 'ezquake')
          AND track_a_reachability IS NOT NULL
      `;
      const sep = '='.repeat(64);
      console.warn(sep);
      console.warn(
        `[extract-tag] ezquake Track-A reachability overlay SKIPPED -- ${reason}. ` +
        `F17 fail-safe-completeness: wiped track_a_reachability on ` +
        `${cvarWipe.count} cvar_versions + ${cmdWipe.count} command_versions ` +
        `row(s) (level-2 retreats to NULL when mechanism is OFF/RED; ` +
        `level-3 safety property unchanged).`,
      );
      console.warn(sep);
    }
  }

  // 3g. Deferred fully-orphaned re-check (enforce-L1-runtime-truth F16
  // fix, 2026-05-21). The per-type retreat scan in load-version.ts ran
  // BEFORE the post-loop adapters above (3b-3d KTX loaders, 3e Track-B
  // HUD commands, 3f Track-A overlay) populated their version-rows; any
  // "fully-orphaned" determination made during step 3 was necessarily
  // premature for any type whose entities a post-loop adapter populates.
  // Re-check the collected orphan IDs now that every adapter has finished
  // -- emit warnings only for entities STILL orphaned. Real orphans
  // surface loudly; transient inter-step gaps stay quiet. The warning
  // text shape matches the original load-version one so downstream
  // log-scanning tools (validate-extractor, arc-reviewer) keep recognizing
  // the [load-version] fully-orphaned signature.
  await recheckFullyOrphanedAfterPostLoops(options.sql, options.project, orphansByType);

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
