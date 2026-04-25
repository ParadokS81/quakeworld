// apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts
//
// Merges the four hand-authored seed YAMLs and the two extractor JSONs into
// a single "asset bundle" JSON consumable by load-assets. This is where the
// seed-vs-auto reconciliation for cvar bindings happens; by the time the
// bundle hits load-assets, every row is a final-confidence row ready to
// write.
//
// Inputs (defaults assume monorepo layout):
//   apps/qw-oracle/scripts/extractors/<project>/seeds/<project>-asset-categories.yaml
//   apps/qw-oracle/scripts/extractors/<project>/seeds/<project>-asset-extensions.yaml
//   apps/qw-oracle/scripts/extractors/<project>/seeds/<project>-asset-path-rules.yaml      (seed authoring)
//   apps/qw-oracle/scripts/extractors/<project>/seeds/<project>-asset-cvar-bindings.yaml   (seed)
//   apps/qw-oracle/scripts/extractors/<project>/output/<project>-asset-path-rules-verified.json
//   apps/qw-oracle/scripts/extractors/<project>/output/<project>-asset-loader-sites-ast.json
//   apps/qw-oracle/scripts/extractors/<project>/output/<project>-asset-cvar-bindings-ast.json
//
// Output (slipgate-consumed location): apps/slipgate-app/src/lib/config/data/<project>-asset-bundle.json
// (relocated from packages/qw-config/src/data/ in qw-config dissolution Half 2a, 2026-04-25).

import { writeFileSync, readFileSync } from 'fs';
import { parseArgs } from 'util';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load as yamlLoad } from 'js-yaml';
import type {
  AssetBundle,
  AssetCategoryEntry,
  AssetCvarBindingRow,
  AssetExtensionRow,
  AssetLoadTrigger,
  AssetLoaderSiteRow,
  AssetPathRuleKind,
  AssetPathRuleRow,
  ClientDefaults,
  Project,
  ReservedSubdirEntry,
} from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const DEFAULT_EXTRACTORS_DIR = resolve(REPO_ROOT, 'apps/qw-oracle/scripts/extractors');
// Slipgate absorbed the bundle location during qw-config dissolution Half 2a
// (2026-04-25); the legacy packages/qw-config/src/data/ tree is gone.
const DEFAULT_BUNDLE_OUTPUT_DIR = resolve(REPO_ROOT, 'apps/slipgate-app/src/lib/config/data');

interface CategorySeed {
  name: string;
  display_name: string;
  description?: string;
  notes?: string;
}

interface ExtensionSeed {
  extension: string;
  path_hint?: string;
  category: string;
  notes?: string;
  // Optional per-row hygiene stamp. Defaults to 'ast_verified' when omitted
  // (the common case). Stamp explicit values for orphaned entries (.kmap)
  // and intentional cross-engine signals (.dll).
  verification_status?:
    | 'ast_verified'
    | 'seed_only_with_ast_support'
    | 'seed_only_no_ast_support'
    | 'orphaned_historical';
  verification_reason?: string;
}

interface PathRuleSeedRaw {
  canonical_id: string;
  rule_kind: AssetPathRuleKind;
  ordinal: number;
  description: string;
  source_ref?: string;
  source_verified?: 0 | 1;
  notes?: string;
  verified_function_name?: string | null;
  verified_function_fingerprint?: string | null;
  verification_notes?: string | null;
}

interface CvarBindingSeed {
  cvar: string;
  category: string;
  path_pattern?: string;
  load_trigger: AssetLoadTrigger;
  source_ref?: string;
  notes?: string;
}

interface AutoCvarBinding {
  cvar_canonical_id: string;
  category_id: string | null;
  load_trigger: AssetLoadTrigger;
  path_pattern: string | null;
  confidence: string;
  source_ref: string;
  enclosing_function: string | null;
  loader_function: string;
  notes?: string | null;
}

interface AutoLoaderSite {
  canonical_id: string;
  function_name: string;
  source_file: string;
  source_line: number;
  source_column: number | null;
  enclosing_function: string | null;
  reads_category_id: string | null;
  load_trigger: AssetLoadTrigger;
  path_source: 'literal' | 'cvar' | 'computed' | 'unknown';
  path_literal: string | null;
  path_cvar_id: string | null;
  confidence: 'certain' | 'heuristic' | 'unclassified';
  dev_only: 0 | 1;
  notes?: string | null;
  // Path 1 additions from the Python extractor JSON.
  path_template?: string | null;
  path_parameters?: Array<{ slot: number; expression_snippet: string; semantic: string }> | null;
  path_extension?: string | null;
  format_function?: string | null;
}

export interface BuildAssetBundleOptions {
  project: Project;
  version: string;
  seedsDir?: string;
  dataDir?: string;
  outputPath?: string;
}

export interface BuildAssetBundleResult {
  outputPath: string;
  categoryCount: number;
  extensionCount: number;
  pathRuleCount: number;
  cvarBindingCount: number;
  loaderSiteCount: number;
  reconciliation: {
    seedRetained: number;
    seedUpgradedToAutoConfirms: number;
    seedNotCorroborated: number;
    autoOrphans: number;
  };
}

export function buildAssetBundle(
  options: BuildAssetBundleOptions,
): BuildAssetBundleResult {
  const projectDir = resolve(DEFAULT_EXTRACTORS_DIR, options.project);
  const seedsDir = options.seedsDir ?? resolve(projectDir, 'seeds');
  const dataDir = options.dataDir ?? resolve(projectDir, 'output');
  const outputPath =
    options.outputPath ??
    resolve(DEFAULT_BUNDLE_OUTPUT_DIR, `${options.project}-asset-bundle.json`);

  // --- Load inputs --------------------------------------------------------

  const categoriesDoc = loadYaml<{ categories: CategorySeed[] }>(
    resolve(seedsDir, `${options.project}-asset-categories.yaml`),
  );
  const extensionsDoc = loadYaml<{ extensions: ExtensionSeed[] }>(
    resolve(seedsDir, `${options.project}-asset-extensions.yaml`),
  );
  const cvarBindingsSeedDoc = loadYaml<{ cvar_bindings: CvarBindingSeed[] }>(
    resolve(seedsDir, `${options.project}-asset-cvar-bindings.yaml`),
  );

  // client_defaults is optional: engines that haven't authored a seed yet
  // simply omit the block. Missing file is warn-and-continue, not fatal.
  let clientDefaults: ClientDefaults | undefined;
  const clientDefaultsPath = resolve(seedsDir, `${options.project}-client-defaults.yaml`);
  try {
    const doc = loadYaml<{ client_defaults: ClientDefaults }>(clientDefaultsPath);
    clientDefaults = doc.client_defaults;
  } catch {
    console.warn(
      `[build-asset-bundle] client_defaults seed missing (${clientDefaultsPath}); bundle will omit the block`,
    );
  }

  // Path rules: prefer the verifier JSON (carries source_verified +
  // verified_function_fingerprint). Fall back to the raw seed YAML if the
  // verifier hasn't run yet.
  let pathRulesSource: PathRuleSeedRaw[];
  const verifiedPath = resolve(dataDir, `${options.project}-asset-path-rules-verified.json`);
  try {
    const doc = JSON.parse(readFileSync(verifiedPath, 'utf-8')) as {
      path_rules: PathRuleSeedRaw[];
    };
    pathRulesSource = doc.path_rules;
  } catch {
    const fallback = loadYaml<{ path_rules: PathRuleSeedRaw[] }>(
      resolve(seedsDir, `${options.project}-asset-path-rules.yaml`),
    );
    pathRulesSource = fallback.path_rules;
    console.warn(
      `[build-asset-bundle] verifier JSON missing (${verifiedPath}); using raw seed (source_verified=0)`,
    );
  }

  const loaderSitesDoc = JSON.parse(
    readFileSync(resolve(dataDir, `${options.project}-asset-loader-sites-ast.json`), 'utf-8'),
  ) as { loader_sites: AutoLoaderSite[] };

  const autoBindingsDoc = JSON.parse(
    readFileSync(resolve(dataDir, `${options.project}-asset-cvar-bindings-ast.json`), 'utf-8'),
  ) as { cvar_bindings: AutoCvarBinding[] };

  // --- Build bundle sections ---------------------------------------------

  // 1. Categories -> entity entries (keyed by canonical_id suffix).
  const asset_categories: Record<string, AssetCategoryEntry> = {};
  for (const c of categoriesDoc.categories) {
    asset_categories[c.name] = {
      ast: {
        display_name: c.display_name,
        description: c.description ?? null,
        notes: c.notes ?? null,
      },
    };
  }

  const validCategoryIds = new Set(
    Object.keys(asset_categories).map((n) => catId(options.project, n)),
  );

  // 2. Extensions.
  const asset_extensions: Omit<AssetExtensionRow, 'project' | 'version' | 'extracted_at'>[] = [];
  for (const e of extensionsDoc.extensions) {
    const cid = catId(options.project, e.category);
    if (!validCategoryIds.has(cid)) {
      console.warn(`[build-asset-bundle] extension ${e.extension}/${e.path_hint ?? ''} references unknown category '${e.category}'`);
      continue;
    }
    asset_extensions.push({
      extension: e.extension,
      path_hint: e.path_hint ?? null,
      category_id: cid,
      notes: e.notes ?? null,
      verification_status: e.verification_status ?? 'ast_verified',
      verification_reason: e.verification_reason ?? null,
      raw_ast_hash: null,
    });
  }

  // 2b. Reserved subdirs (Path 2). Optional: warn-and-continue if the
  // derivation output is missing.
  let reserved_subdirs: ReservedSubdirEntry[] | undefined;
  const reservedPath = resolve(dataDir, `${options.project}-reserved-subdirs.json`);
  try {
    const doc = JSON.parse(readFileSync(reservedPath, 'utf-8')) as {
      reserved_subdirs: ReservedSubdirEntry[];
    };
    reserved_subdirs = doc.reserved_subdirs;
  } catch {
    console.warn(
      `[build-asset-bundle] reserved_subdirs derivation missing (${reservedPath}); bundle will omit the block`,
    );
  }

  // 3. Path rules (with verification flag passed through).
  const asset_path_rules: Omit<AssetPathRuleRow, 'project' | 'version' | 'extracted_at'>[] = [];
  for (const r of pathRulesSource) {
    const notesParts: string[] = [];
    if (r.notes) notesParts.push(r.notes);
    if (r.verified_function_name) {
      notesParts.push(`enclosing=${r.verified_function_name}`);
    }
    if (r.verification_notes) {
      notesParts.push(`verify_note=${r.verification_notes}`);
    }
    asset_path_rules.push({
      canonical_id: r.canonical_id,
      rule_kind: r.rule_kind,
      ordinal: r.ordinal,
      description: r.description.trim(),
      source_ref: r.source_ref ?? null,
      source_verified: r.source_verified ?? 0,
      notes: notesParts.length ? notesParts.join(' | ') : null,
      raw_ast_hash: null,
    });
  }

  // 4. Cvar bindings -- reconcile seed vs auto.
  const asset_cvar_bindings: Omit<AssetCvarBindingRow, 'project' | 'version' | 'extracted_at'>[] = [];
  let seedRetained = 0;
  let seedUpgradedToAutoConfirms = 0;
  let seedNotCorroborated = 0;
  let autoOrphans = 0;

  // Index auto bindings by cvar canonical_id for O(1) lookup.
  const autoByCvar = new Map<string, AutoCvarBinding[]>();
  for (const a of autoBindingsDoc.cvar_bindings) {
    const key = a.cvar_canonical_id;
    const arr = autoByCvar.get(key) ?? [];
    arr.push(a);
    autoByCvar.set(key, arr);
  }
  const seenSeedCvars = new Set<string>();

  for (const b of cvarBindingsSeedDoc.cvar_bindings) {
    const cvarCanonical = `${options.project}:cvar:${b.cvar}`;
    const catCanonical = catId(options.project, b.category);
    if (!validCategoryIds.has(catCanonical)) {
      console.warn(`[build-asset-bundle] seed binding for cvar=${b.cvar} references unknown category '${b.category}'; skipping`);
      continue;
    }
    seenSeedCvars.add(cvarCanonical);

    const autos = autoByCvar.get(cvarCanonical) ?? [];
    // Seed is corroborated when any auto row points at the same cvar. We do
    // not require category to match -- seed's hand-verified category wins
    // regardless, and the auto match is just "AST sees this cvar being read
    // near a loader."
    const corroborated = autos.length > 0;
    const confidence = corroborated ? 'auto_confirms_seed' : 'seed';
    if (corroborated) {
      seedUpgradedToAutoConfirms += 1;
    } else {
      seedNotCorroborated += 1;
    }
    seedRetained += 1;

    const notesParts: string[] = [];
    if (b.notes) notesParts.push(b.notes);
    if (!corroborated) {
      notesParts.push('AST did not corroborate; seed retained as source of truth');
    }

    asset_cvar_bindings.push({
      cvar_canonical_id: cvarCanonical,
      category_id: catCanonical,
      path_pattern: b.path_pattern ?? null,
      load_trigger: b.load_trigger,
      confidence: confidence as AssetCvarBindingRow['confidence'],
      source_ref: b.source_ref ?? null,
      notes: notesParts.length ? notesParts.join(' | ') : null,
      raw_ast_hash: null,
    });
  }

  // Auto entries for cvars NOT in the seed become auto_orphans.
  for (const [cvarCanonical, autos] of autoByCvar.entries()) {
    if (seenSeedCvars.has(cvarCanonical)) continue;
    // Collapse multiple auto rows for the same cvar into one orphan per
    // (cvar, category) pair to keep the table tidy.
    const seenPairs = new Set<string>();
    for (const a of autos) {
      if (!a.category_id) {
        // No category from the auto pass -> not load-worthy. Log only.
        console.warn(`[build-asset-bundle] auto_orphan ${cvarCanonical} @ ${a.source_ref} has no category; skipping`);
        continue;
      }
      if (!validCategoryIds.has(a.category_id)) {
        console.warn(`[build-asset-bundle] auto_orphan ${cvarCanonical} references unknown category '${a.category_id}'; skipping`);
        continue;
      }
      const pairKey = `${cvarCanonical}|${a.category_id}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      asset_cvar_bindings.push({
        cvar_canonical_id: cvarCanonical,
        category_id: a.category_id,
        path_pattern: null,
        load_trigger: a.load_trigger,
        confidence: 'auto_orphan',
        source_ref: a.source_ref,
        notes: `auto-detected at ${a.source_ref} via ${a.loader_function}; consider adding to seed or mark as noise`,
        raw_ast_hash: null,
      });
      autoOrphans += 1;
    }
  }

  // 5. Loader sites (pass-through from extractor JSON).
  const asset_loader_sites: Omit<AssetLoaderSiteRow, 'project' | 'version' | 'extracted_at'>[] = [];
  for (const s of loaderSitesDoc.loader_sites) {
    asset_loader_sites.push({
      canonical_id: s.canonical_id,
      function_name: s.function_name,
      source_file: s.source_file,
      source_line: s.source_line,
      source_column: s.source_column,
      enclosing_function: s.enclosing_function,
      reads_category_id: s.reads_category_id,
      load_trigger: s.load_trigger,
      path_source: s.path_source,
      path_literal: s.path_literal,
      path_cvar_id: s.path_cvar_id,
      confidence: s.confidence,
      dev_only: s.dev_only,
      notes: s.notes ?? null,
      path_template: s.path_template ?? null,
      path_parameters: s.path_parameters ?? null,
      path_extension: s.path_extension ?? null,
      format_function: s.format_function ?? null,
      raw_ast_hash: null,
    });
  }

  const bundle: AssetBundle = {
    project: options.project,
    version: options.version,
    ...(clientDefaults ? { client_defaults: clientDefaults } : {}),
    asset_categories,
    asset_extensions,
    asset_path_rules,
    asset_cvar_bindings,
    asset_loader_sites,
    ...(reserved_subdirs ? { reserved_subdirs } : {}),
    _stats: {
      categories: Object.keys(asset_categories).length,
      extensions: asset_extensions.length,
      path_rules: asset_path_rules.length,
      cvar_bindings: asset_cvar_bindings.length,
      loader_sites: asset_loader_sites.length,
      reconciliation: {
        seed_retained: seedRetained,
        seed_upgraded_to_auto_confirms: seedUpgradedToAutoConfirms,
        seed_not_corroborated: seedNotCorroborated,
        auto_orphans: autoOrphans,
      },
    },
  };

  writeFileSync(outputPath, JSON.stringify(bundle, null, 2) + '\n', 'utf-8');

  return {
    outputPath,
    categoryCount: Object.keys(asset_categories).length,
    extensionCount: asset_extensions.length,
    pathRuleCount: asset_path_rules.length,
    cvarBindingCount: asset_cvar_bindings.length,
    loaderSiteCount: asset_loader_sites.length,
    reconciliation: {
      seedRetained,
      seedUpgradedToAutoConfirms,
      seedNotCorroborated,
      autoOrphans,
    },
  };
}

function loadYaml<T>(path: string): T {
  const text = readFileSync(path, 'utf-8');
  return yamlLoad(text) as T;
}

function catId(project: Project, name: string): string {
  return `${project}:asset_category:${name}`;
}

// --- CLI entrypoint ---------------------------------------------------------

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      'seeds-dir': { type: 'string' },
      'data-dir': { type: 'string' },
      output: { type: 'string' },
    },
  });
  if (!values.project) throw new Error('--project required');
  if (!values.version) throw new Error('--version required');

  const result = buildAssetBundle({
    project: values.project as Project,
    version: values.version!,
    seedsDir: values['seeds-dir'],
    dataDir: values['data-dir'],
    outputPath: values.output,
  });

  console.log(JSON.stringify(result, null, 2));
}

// Only run as CLI when invoked directly (tsx/node).
const invokedAsScript = (() => {
  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '');
  } catch {
    return false;
  }
})();
if (invokedAsScript) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
