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
import type postgres from 'postgres';
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
  sql: postgres.Sql;
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

export async function loadAssets(options: LoadAssetsOptions): Promise<LoadAssetsResult> {
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

  const result = await options.sql.begin(async (tx) => {
    // Cache entity lookups: canonical_id -> exists. Scoped to this txn so the
    // lookup sees rows just-upserted by load-version (which runs before
    // load-assets in extract-tag's pipeline).
    const knownCache = new Map<string, boolean>();
    const entityExists = async (canonical: string): Promise<boolean> => {
      const cached = knownCache.get(canonical);
      if (cached !== undefined) return cached;
      const rows = await tx<{ one: number }[]>`
        SELECT 1 AS one FROM entities WHERE canonical_id = ${canonical}
      `;
      const exists = rows.length > 0;
      knownCache.set(canonical, exists);
      return exists;
    };

    await upsertVersion(tx, {
      project: options.project,
      version: options.version,
      commit_sha: options.commitSha,
      tag_date: options.tagDate,
      ordinal: options.ordinal,
      parse_state: options.parseState ?? 'ok',
      notes: options.notes ?? null,
      extracted_at: now,
    });

    // Wipe existing relation rows for this (project, version) before re-inserting
    // from the bundle. The four upsert helpers use ON CONFLICT keyed on
    // UNIQUE(project, version, ..., path_hint / path_pattern). Postgres treats
    // NULLs in unique indexes as distinct (matching SQLite), so re-runs at the
    // same (project, version) would otherwise append duplicate rows for entries
    // whose path_hint or path_pattern is NULL. Wipe-then-insert keeps the DB an
    // idempotent reflection of the bundle.
    await tx`DELETE FROM asset_extensions    WHERE project=${options.project} AND version=${options.version}`;
    await tx`DELETE FROM asset_path_rules    WHERE project=${options.project} AND version=${options.version}`;
    await tx`DELETE FROM asset_cvar_bindings WHERE project=${options.project} AND version=${options.version}`;
    await tx`DELETE FROM asset_loader_sites  WHERE project=${options.project} AND version=${options.version}`;

    let extCount = 0;
    let ruleCount = 0;
    let bindCount = 0;
    let siteCount = 0;
    const drops = { cvarBindingStale: 0, categoryStale: 0, loaderCvarStale: 0 };

    // Extensions.
    for (const e of bundle.asset_extensions) {
      if (!(await entityExists(e.category_id))) {
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
        verification_status: e.verification_status,
        verification_reason: e.verification_reason,
        raw_ast_hash: e.raw_ast_hash ?? hashRow(e),
        extracted_at: now,
      };
      await upsertAssetExtension(tx, row);
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
        source_verified: !!r.source_verified,
        notes: r.notes,
        raw_ast_hash: r.raw_ast_hash ?? hashRow(r),
        extracted_at: now,
      };
      await upsertAssetPathRule(tx, row);
      ruleCount += 1;
    }

    // Cvar bindings. Skip rows whose cvar_canonical_id or category_id doesn't
    // resolve -- these indicate seed drift and we prefer a loud warning over
    // a row that'll FK-fail on commit.
    for (const b of bundle.asset_cvar_bindings) {
      if (!(await entityExists(b.cvar_canonical_id))) {
        console.warn(`[load-assets] asset_cvar_bindings: cvar ${b.cvar_canonical_id} not in entities; skipping`);
        drops.cvarBindingStale += 1;
        continue;
      }
      if (!(await entityExists(b.category_id))) {
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
      await upsertAssetCvarBinding(tx, row);
      bindCount += 1;
    }

    // Loader sites. category and cvar FKs are nullable; when the bundle
    // carries a value but it doesn't resolve, null it out + log rather than
    // dropping the whole site.
    for (const s of bundle.asset_loader_sites) {
      let reads_category_id = s.reads_category_id;
      if (reads_category_id && !(await entityExists(reads_category_id))) {
        console.warn(`[load-assets] asset_loader_sites: category ${reads_category_id} not in entities; clearing for ${s.canonical_id}`);
        drops.categoryStale += 1;
        reads_category_id = null;
      }
      let path_cvar_id = s.path_cvar_id;
      if (path_cvar_id && !(await entityExists(path_cvar_id))) {
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
        dev_only: !!s.dev_only,
        notes: s.notes,
        raw_ast_hash: s.raw_ast_hash ?? hashRow(s),
        extracted_at: now,
      };
      await upsertAssetLoaderSite(tx, row);
      siteCount += 1;
    }

    const setMetaPairs: Array<[string, string]> = [
      ['last_extraction_run_at', now],
      ['assets_extractor_version', options.extractorVersion],
    ];
    for (const [key, value] of setMetaPairs) {
      await tx`
        INSERT INTO oracle_meta (key, value, updated_at)
        VALUES (${key}, ${value}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
    }

    return { extCount, ruleCount, bindCount, siteCount, drops };
  });

  return {
    versionsUpserted: 1,
    extensionsUpserted: result.extCount,
    pathRulesUpserted: result.ruleCount,
    cvarBindingsUpserted: result.bindCount,
    loaderSitesUpserted: result.siteCount,
    droppedRefs: result.drops,
  };
}

function hashRow(obj: unknown): string {
  return createHash('sha1').update(JSON.stringify(obj)).digest('hex');
}
