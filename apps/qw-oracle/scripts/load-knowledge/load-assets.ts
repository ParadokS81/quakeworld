// apps/qw-oracle/scripts/load-knowledge/load-assets.ts
//
// Stage 1b orchestrator: ingest the four non-entity asset tables
// (asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites)
// from a pre-merged "asset bundle" JSON produced by build-asset-bundle.ts.
//
// The bundle's asset_category entity entries are loaded via the ordinary
// load-version pipeline (ADAPTERS.asset_category in load-version.ts) --
// this module is only for the relation rows.

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import {
  upsertAssetCvarBinding,
  upsertAssetExtension,
  upsertAssetLoaderSite,
  upsertAssetPathRule,
  upsertVersion,
} from './natural-keys.js';
import type {
  AssetBundle,
  AssetCvarBindingRow,
  AssetExtensionRow,
  AssetLoaderSiteRow,
  AssetPathRuleRow,
  Project,
} from './types.js';

export interface LoadAssetsOptions {
  db: Database.Database;
  project: Project;
  version: string;
  jsonPath: string;
  commitSha: string;
  tagDate: string | null;
  ordinal: number;
  parseState?: 'ok' | 'partial';
  notes?: string | null;
  extractorVersion: string;
}

export interface LoadAssetsResult {
  versionsUpserted: number;
  extensionsUpserted: number;
  pathRulesUpserted: number;
  cvarBindingsUpserted: number;
  loaderSitesUpserted: number;
  droppedRefs: {
    cvarBindingStale: number;   // cvar_canonical_id missing from entities
    categoryStale: number;      // category_id missing from entities
    loaderCvarStale: number;    // loader_site.path_cvar_id missing from entities
  };
}

export function loadAssets(options: LoadAssetsOptions): LoadAssetsResult {
  const now = new Date().toISOString();

  const raw = readFileSync(options.jsonPath, 'utf-8');
  const bundle = JSON.parse(raw) as AssetBundle;

  if (bundle.project !== options.project) {
    throw new Error(
      `bundle project=${bundle.project} does not match --project=${options.project}`,
    );
  }
  if (bundle.version !== options.version) {
    throw new Error(
      `bundle version=${bundle.version} does not match --version=${options.version}`,
    );
  }

  // Cache entity lookups: canonical_id -> exists
  const entityExists = (canonical: string): boolean => {
    const r = options.db
      .prepare(`SELECT 1 FROM entities WHERE canonical_id = ?`)
      .get(canonical);
    return r !== undefined;
  };

  const txn = options.db.transaction(() => {
    upsertVersion(options.db, {
      project: options.project,
      version: options.version,
      commit_sha: options.commitSha,
      tag_date: options.tagDate,
      ordinal: options.ordinal,
      parse_state: options.parseState ?? 'ok',
      notes: options.notes ?? null,
      extracted_at: now,
    });

    let extCount = 0;
    let ruleCount = 0;
    let bindCount = 0;
    let siteCount = 0;
    const drops = { cvarBindingStale: 0, categoryStale: 0, loaderCvarStale: 0 };

    // Extensions.
    for (const e of bundle.asset_extensions) {
      if (!entityExists(e.category_id)) {
        console.warn(`[load-assets] asset_extensions: category ${e.category_id} not in entities; skipping ${e.extension}/${e.path_hint ?? ''}`);
        drops.categoryStale += 1;
        continue;
      }
      const row: AssetExtensionRow = {
        project: options.project,
        version: options.version,
        extension: e.extension,
        path_hint: e.path_hint,
        category_id: e.category_id,
        notes: e.notes,
        raw_ast_hash: e.raw_ast_hash ?? hashRow(e),
        extracted_at: now,
      };
      upsertAssetExtension(options.db, row);
      extCount += 1;
    }

    // Path rules.
    for (const r of bundle.asset_path_rules) {
      const row: AssetPathRuleRow = {
        project: options.project,
        version: options.version,
        canonical_id: r.canonical_id,
        rule_kind: r.rule_kind,
        ordinal: r.ordinal,
        description: r.description,
        source_ref: r.source_ref,
        source_verified: r.source_verified,
        notes: r.notes,
        raw_ast_hash: r.raw_ast_hash ?? hashRow(r),
        extracted_at: now,
      };
      upsertAssetPathRule(options.db, row);
      ruleCount += 1;
    }

    // Cvar bindings. Skip rows whose cvar_canonical_id or category_id doesn't
    // resolve -- these indicate seed drift and we prefer a loud warning over
    // a row that'll FK-fail on commit.
    for (const b of bundle.asset_cvar_bindings) {
      if (!entityExists(b.cvar_canonical_id)) {
        console.warn(`[load-assets] asset_cvar_bindings: cvar ${b.cvar_canonical_id} not in entities; skipping`);
        drops.cvarBindingStale += 1;
        continue;
      }
      if (!entityExists(b.category_id)) {
        console.warn(`[load-assets] asset_cvar_bindings: category ${b.category_id} not in entities; skipping ${b.cvar_canonical_id}`);
        drops.categoryStale += 1;
        continue;
      }
      const row: AssetCvarBindingRow = {
        project: options.project,
        version: options.version,
        cvar_canonical_id: b.cvar_canonical_id,
        category_id: b.category_id,
        path_pattern: b.path_pattern,
        load_trigger: b.load_trigger,
        confidence: b.confidence,
        source_ref: b.source_ref,
        notes: b.notes,
        raw_ast_hash: b.raw_ast_hash ?? hashRow(b),
        extracted_at: now,
      };
      upsertAssetCvarBinding(options.db, row);
      bindCount += 1;
    }

    // Loader sites. category and cvar FKs are nullable; when the bundle
    // carries a value but it doesn't resolve, null it out + log rather than
    // dropping the whole site.
    for (const s of bundle.asset_loader_sites) {
      let reads_category_id = s.reads_category_id;
      if (reads_category_id && !entityExists(reads_category_id)) {
        console.warn(`[load-assets] asset_loader_sites: category ${reads_category_id} not in entities; clearing for ${s.canonical_id}`);
        drops.categoryStale += 1;
        reads_category_id = null;
      }
      let path_cvar_id = s.path_cvar_id;
      if (path_cvar_id && !entityExists(path_cvar_id)) {
        console.warn(`[load-assets] asset_loader_sites: cvar ${path_cvar_id} not in entities; clearing for ${s.canonical_id}`);
        drops.loaderCvarStale += 1;
        path_cvar_id = null;
      }
      const row: AssetLoaderSiteRow = {
        project: options.project,
        version: options.version,
        canonical_id: s.canonical_id,
        function_name: s.function_name,
        source_file: s.source_file,
        source_line: s.source_line,
        source_column: s.source_column,
        enclosing_function: s.enclosing_function,
        reads_category_id,
        load_trigger: s.load_trigger,
        path_source: s.path_source,
        path_literal: s.path_literal,
        path_cvar_id,
        confidence: s.confidence,
        dev_only: s.dev_only,
        notes: s.notes,
        raw_ast_hash: s.raw_ast_hash ?? hashRow(s),
        extracted_at: now,
      };
      upsertAssetLoaderSite(options.db, row);
      siteCount += 1;
    }

    const setMeta = options.db.prepare(`
      INSERT INTO schema_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    setMeta.run('last_extraction_run_at', now);
    setMeta.run('assets_extractor_version', options.extractorVersion);

    return { extCount, ruleCount, bindCount, siteCount, drops };
  });

  const { extCount, ruleCount, bindCount, siteCount, drops } = txn();

  return {
    versionsUpserted: 1,
    extensionsUpserted: extCount,
    pathRulesUpserted: ruleCount,
    cvarBindingsUpserted: bindCount,
    loaderSitesUpserted: siteCount,
    droppedRefs: drops,
  };
}

function hashRow(obj: unknown): string {
  return createHash('sha1').update(JSON.stringify(obj)).digest('hex');
}
