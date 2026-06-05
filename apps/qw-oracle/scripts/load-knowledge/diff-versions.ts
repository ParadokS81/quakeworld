// apps/qw-oracle/scripts/load-knowledge/diff-versions.ts
//
// Stage 2 of the loader pipeline. Two parallel diff streams:
//
// 1. Entity change_events across the 10 entity types in TYPE_DIFF_CONFIGS.
//    Per spec Section 3 + Section 4:
//      - Modification emits one row per changed substantive field.
//      - Creation emits one row with change_kind='created'; re-added entities
//        also flip source_state back to source_backed and log transition.
//      - Deletion emits one row with change_kind='deleted'; loader flips
//        source_state to source_retired and logs transition.
//      - commit_sha populated via git blame at the correct version ref:
//          * creations / modifications -> blame at toVersion.commit_sha
//          * deletions -> blame at fromVersion.commit_sha (file may no longer
//            exist at toVersion)
//        Falls back to 'UNKNOWN' if blame fails or the version-row lacks
//        source_file/source_line (asset_category has no source location).
//      - Per-field blame override: modifications look up source_overrides
//        via resolveBlameForField before falling back to the row's primary
//        source_line (Batch 3 / schema v6).
//
// 2. Asset relation_changes across the 4 relation tables in
//    RELATION_DIFF_CONFIGS (see diffAssetRelations). Relation rows are not
//    entity-keyed; keyed on each table's UNIQUE natural-key columns via
//    deterministic JSON. Relation-row blame is still deferred -- Batch 3
//    shipped entity per-field blame via source_overrides (see
//    resolveBlameForField), but relation tables still lack source_file /
//    source_line so diffAssetRelations writes commit_sha='UNKNOWN'.

import type postgres from 'postgres';
import { ulid } from 'ulid';
import { blameLine, treeHasDirectory } from './git.js';
import { setEntitySourceState } from './natural-keys.js';
import { logTransition } from './transitions.js';
import type { ChangeKind, EntityType, Project } from './types.js';

export interface DiffOptions {
  sql: postgres.Sql;
  project: Project;
  fromVersion: string;
  toVersion: string;
  ezquakeRepoPath: string;
}

// Per-project fallback prefix used only when `treeHasDirectory(repo, sha, 'src')`
// can't answer (degraded-mode fallback). The real prefix is resolved per-version
// from the git tree so ezQuake's 2023-01-05 root->src relocation doesn't break
// blame across that boundary. Phase 2f historical walks traverse ~15 ezQuake
// tags, half of them pre-`src/`, so the detection must run per side (fromVersion,
// toVersion) independently.
const PROJECT_SRC_PREFIX_FALLBACK: Record<Project, string> = {
  ezquake: 'src/',
  mvdsv:   'src/',
  ktx:     'src/',
  fte:     '',
  // QWCL keeps client sources under QW/client/. There is no `src/` dir, so
  // detectSrcPrefix's treeHasDirectory(repo, sha, 'src') returns false and the
  // fallback prefix is the actual repo-relative path.
  qwcl:    'QW/client/',
  // qw is the game-itself namespace (maps table); it has no engine source tree.
  qw:      '',
  // unused -- frozen single-version snapshots; extract-tag never runs for qtv/qwfwd (D1)
  qtv:   '',
  qwfwd: 'src/',
};

function detectSrcPrefix(
  repoPath: string,
  commitSha: string,
  project: Project,
): string {
  if (commitSha === 'UNKNOWN' || !/^[0-9a-f]{7,40}$/.test(commitSha)) {
    return PROJECT_SRC_PREFIX_FALLBACK[project];
  }
  return treeHasDirectory(repoPath, commitSha, 'src') ? 'src/' : '';
}

interface TypeDiffConfig {
  entityType: EntityType;
  versionsTable: string;
  diffableFields: readonly string[];
  // Whether the versions table exposes source_file + source_line for blame.
  // Only false for asset_category (logical entity, no code location).
  hasSource: boolean;
}

// Ordered by data volume (largest first) so cache warms up on the hot type.
const TYPE_DIFF_CONFIGS: readonly TypeDiffConfig[] = [
  {
    entityType: 'cvar',
    versionsTable: 'cvar_versions',
    diffableFields: [
      'default_value', 'flags_raw', 'flag_names', 'on_change',
      'min_bound', 'max_bound', 'help_desc', 'help_remarks',
      'help_values', 'help_type', 'source_file', 'server_only',
      'group_name_in_source', 'trailing_comment',
    ],
    hasSource: true,
  },
  {
    entityType: 'command',
    versionsTable: 'command_versions',
    diffableFields: [
      'help_desc', 'help_remarks', 'help_group_id',
      'handler_fn', 'source_file', 'registration_file',
    ],
    hasSource: true,
  },
  {
    entityType: 'macro',
    versionsTable: 'macro_versions',
    diffableFields: [
      'help_desc', 'macro_type', 'teamplay_restricted', 'related_cvars_json',
      'handler_fn', 'source_file', 'registration_file',
    ],
    hasSource: true,
  },
  {
    entityType: 'cmdline_param',
    versionsTable: 'cmdline_param_versions',
    diffableFields: [
      'help_desc', 'help_remarks', 'arguments', 'flags_json', 'systems_json',
      'source_file',
    ],
    hasSource: true,
  },
  {
    entityType: 'keyname',
    versionsTable: 'keyname_versions',
    diffableFields: ['key_code', 'key_code_ident', 'source_file', 'build_variant'],
    hasSource: true,
  },
  {
    entityType: 'hud_element',
    versionsTable: 'hud_element_versions',
    diffableFields: [
      'help_desc', 'hud_alias', 'flags_raw', 'min_state_raw', 'draw_order_raw',
      'draw_fn', 'enclosing_function', 'source_file', 'owned_cvars_json',
    ],
    hasSource: true,
  },
  {
    entityType: 'ruleset',
    versionsTable: 'ruleset_versions',
    diffableFields: [
      'enum_ident', 'loader_fn', 'maxfps',
      'restrict_triggers', 'restrict_packet', 'restrict_particles', 'restrict_play',
      'restrict_logging', 'restrict_rollangle', 'restrict_ipc', 'restrict_exec',
      'restrict_setcalc', 'restrict_seteval', 'restrict_setex',
      'locked_cvars_json', 'source_file',
    ],
    hasSource: true,
  },
  {
    entityType: 'token_primitive',
    versionsTable: 'token_primitive_versions',
    diffableFields: [
      'form', 'suffix_char', 'byte_value', 'category', 'case_style', 'source_file',
    ],
    hasSource: true,
  },
  {
    entityType: 'asset_category',
    versionsTable: 'asset_category_versions',
    diffableFields: ['display_name', 'description', 'notes'],
    hasSource: false,
  },
  {
    entityType: 'flag_bit',
    versionsTable: 'flag_bit_versions',
    diffableFields: [
      'bitmask_family', 'value_raw', 'value_numeric', 'source_file',
    ],
    hasSource: true,
  },
];

interface RelationDiffConfig {
  table: 'asset_extensions' | 'asset_path_rules' | 'asset_cvar_bindings' | 'asset_loader_sites';
  naturalKeyColumns: readonly string[];
  diffableColumns: readonly string[];
}

const RELATION_DIFF_CONFIGS: readonly RelationDiffConfig[] = [
  {
    table: 'asset_extensions',
    naturalKeyColumns: ['extension', 'path_hint'],
    diffableColumns: ['category_id', 'notes'],
  },
  {
    table: 'asset_path_rules',
    naturalKeyColumns: ['canonical_id'],
    diffableColumns: ['rule_kind', 'ordinal', 'description', 'source_ref', 'source_verified', 'notes'],
  },
  {
    table: 'asset_cvar_bindings',
    naturalKeyColumns: ['cvar_canonical_id', 'category_id', 'path_pattern'],
    diffableColumns: ['load_trigger', 'confidence', 'source_ref', 'notes'],
  },
  {
    table: 'asset_loader_sites',
    naturalKeyColumns: ['canonical_id'],
    diffableColumns: [
      'function_name', 'source_file', 'source_line', 'source_column',
      'enclosing_function', 'reads_category_id', 'load_trigger',
      'path_source', 'path_literal', 'path_cvar_id', 'confidence',
      'dev_only', 'notes',
    ],
  },
];

interface RelationStats {
  table: string;
  fromCount: number;
  toCount: number;
  created: number;
  modified: number;
  deleted: number;
}

export interface DiffTypeStats {
  type: EntityType;
  fromCount: number;
  toCount: number;
  created: number;
  modified: number;
  deleted: number;
}

export interface DiffResult {
  extractorRunId: string;
  fromCommitSha: string;
  toCommitSha: string;
  changeEventsInserted: number;
  creationsEmitted: number;
  modificationsEmitted: number;
  deletionsEmitted: number;
  transitionsLogged: number;
  perType: DiffTypeStats[];
  relationStats: RelationStats[];
}

interface Row {
  entity_id: number;
  version: string;
  source_file?: string | null;
  source_line?: number | null;
  [col: string]: unknown;
}

interface BlameOut {
  commit_sha: string;
  commit_message_excerpt: string | null;
}

export async function diffVersions(options: DiffOptions): Promise<DiffResult> {
  const extractorRunId = ulid();
  const now = new Date().toISOString();
  const sql = options.sql;

  // Resolve both versions' commit_sha up front so blame anchors at the right
  // ref rather than hardcoded HEAD. Read-only, can run before opening the txn.
  const fromVerRows = await sql<{ commit_sha: string }[]>`
    SELECT commit_sha FROM versions WHERE project = ${options.project} AND version = ${options.fromVersion}
  `;
  const toVerRows = await sql<{ commit_sha: string }[]>`
    SELECT commit_sha FROM versions WHERE project = ${options.project} AND version = ${options.toVersion}
  `;

  if (fromVerRows.length === 0) {
    throw new Error(
      `No versions row for ${options.project}:${options.fromVersion}. Run load-version first.`
    );
  }
  if (toVerRows.length === 0) {
    throw new Error(
      `No versions row for ${options.project}:${options.toVersion}. Run load-version first.`
    );
  }

  const fromCommitSha = fromVerRows[0]!.commit_sha;
  const toCommitSha = toVerRows[0]!.commit_sha;
  // Resolve src-prefix per side -- ezQuake moved files from repo root into
  // `src/` on 2023-01-05 (between 3.6.1 and 3.6.2). A diff crossing that
  // boundary needs different prefixes on each side, so blame paths resolve
  // correctly against each version's actual tree layout.
  const fromSrcPrefix = detectSrcPrefix(options.ezquakeRepoPath, fromCommitSha, options.project);
  const toSrcPrefix = detectSrcPrefix(options.ezquakeRepoPath, toCommitSha, options.project);

  // Per-(ref, file, line) blame cache. Shared across all type loops because
  // different entity types can share source locations (e.g. a cvar and an
  // hud_element registered at the same site).
  const blameCache = new Map<string, BlameOut>();

  let totalCreations = 0;
  let totalModifications = 0;
  let totalDeletions = 0;
  let totalTransitions = 0;
  const perType: DiffTypeStats[] = [];
  const diffResultExtras: { relationStats?: RelationStats[] } = {};

  await sql.begin(async (tx) => {
    // Preload source_overrides for the toVersion once so per-field blame
    // lookups during the modification loop hit a Map, not a fresh SQL query.
    // Keyed by `${entityId}|${fieldName}`.
    const overridesForToVersion = new Map<string, { source_file: string; source_line: number }>();
    {
      const rows = await tx<Array<{
        entity_id: number;
        field_name: string;
        source_file: string;
        source_line: number;
      }>>`
        SELECT entity_id, field_name, source_file, source_line
        FROM source_overrides
        WHERE version = ${options.toVersion}
      `;
      for (const r of rows) {
        overridesForToVersion.set(`${Number(r.entity_id)}|${r.field_name}`, {
          source_file: r.source_file,
          source_line: Number(r.source_line),
        });
      }
    }

    for (const config of TYPE_DIFF_CONFIGS) {
      // Bulk SELECT into Map<entity_id, Row> -- the per-field comparison loop
      // below hits no DB after this point (Map-preload optimisation).
      const fromRows = await tx<Row[]>`
        SELECT tv.*, e.id AS entity_id
        FROM ${tx(config.versionsTable)} tv
        JOIN entities e ON e.id = tv.entity_id
        WHERE e.project = ${options.project} AND e.type = ${config.entityType} AND tv.version = ${options.fromVersion}
      `;

      const toRows = await tx<Row[]>`
        SELECT tv.*, e.id AS entity_id
        FROM ${tx(config.versionsTable)} tv
        JOIN entities e ON e.id = tv.entity_id
        WHERE e.project = ${options.project} AND e.type = ${config.entityType} AND tv.version = ${options.toVersion}
      `;

      const fromByEntity = new Map<number, Row>();
      const toByEntity = new Map<number, Row>();
      for (const r of fromRows) fromByEntity.set(Number(r.entity_id), r);
      for (const r of toRows) toByEntity.set(Number(r.entity_id), r);

      const allIds = new Set<number>([...fromByEntity.keys(), ...toByEntity.keys()]);

      let created = 0;
      let modified = 0;
      let deleted = 0;

      for (const entityId of allIds) {
        const fromRow = fromByEntity.get(entityId);
        const toRow = toByEntity.get(entityId);

        if (!fromRow && toRow) {
          const blame = resolveBlame(
            options.ezquakeRepoPath, toCommitSha, toRow, blameCache, toSrcPrefix, config.hasSource,
          );
          await tx`
            INSERT INTO change_events (
              entity_id, from_version, to_version, change_kind, field_name,
              old_value, new_value, commit_sha, commit_message_excerpt,
              enrichment_source, extracted_at
            ) VALUES (
              ${entityId}, ${null}, ${options.toVersion}, ${'created' satisfies ChangeKind}, ${''},
              ${null}, ${null}, ${blame.commit_sha}, ${blame.commit_message_excerpt},
              ${'git'}, ${now}
            )
            ON CONFLICT (entity_id, to_version, field_name, change_kind) DO UPDATE SET
              from_version           = EXCLUDED.from_version,
              old_value              = EXCLUDED.old_value,
              new_value              = EXCLUDED.new_value,
              commit_sha             = EXCLUDED.commit_sha,
              commit_message_excerpt = EXCLUDED.commit_message_excerpt,
              enrichment_source      = EXCLUDED.enrichment_source,
              extracted_at           = EXCLUDED.extracted_at
          `;
          created += 1;

          const prevRows = await tx<{ source_state: string }[]>`
            SELECT source_state FROM entities WHERE id = ${entityId}
          `;
          const prev = prevRows[0]!;
          if (prev.source_state === 'source_retired') {
            await setEntitySourceState(tx, entityId, 'source_backed');
            await logTransition(tx, {
              entity_id: entityId,
              from_state: 'source_retired',
              to_state: 'source_backed',
              reason: 're_added',
              version_context: options.toVersion,
              extractor_run_id: extractorRunId,
            });
            totalTransitions += 1;
          }
          continue;
        }

        if (fromRow && !toRow) {
          // Blame at fromVersion for deletions: the file/line refers to
          // fromVersion state; at toVersion the file may have been removed.
          const blame = resolveBlame(
            options.ezquakeRepoPath, fromCommitSha, fromRow, blameCache, fromSrcPrefix, config.hasSource,
          );
          await tx`
            INSERT INTO change_events (
              entity_id, from_version, to_version, change_kind, field_name,
              old_value, new_value, commit_sha, commit_message_excerpt,
              enrichment_source, extracted_at
            ) VALUES (
              ${entityId}, ${options.fromVersion}, ${options.toVersion}, ${'deleted' satisfies ChangeKind}, ${''},
              ${null}, ${null}, ${blame.commit_sha}, ${blame.commit_message_excerpt},
              ${'git'}, ${now}
            )
            ON CONFLICT (entity_id, to_version, field_name, change_kind) DO UPDATE SET
              from_version           = EXCLUDED.from_version,
              old_value              = EXCLUDED.old_value,
              new_value              = EXCLUDED.new_value,
              commit_sha             = EXCLUDED.commit_sha,
              commit_message_excerpt = EXCLUDED.commit_message_excerpt,
              enrichment_source      = EXCLUDED.enrichment_source,
              extracted_at           = EXCLUDED.extracted_at
          `;
          deleted += 1;

          await setEntitySourceState(tx, entityId, 'source_retired');
          await logTransition(tx, {
            entity_id: entityId,
            from_state: 'source_backed',
            to_state: 'source_retired',
            reason: 'removed_from_head',
            version_context: options.toVersion,
            extractor_run_id: extractorRunId,
          });
          totalTransitions += 1;
          continue;
        }

        if (fromRow && toRow) {
          for (const field of config.diffableFields) {
            const oldRaw = fromRow[field];
            const newRaw = toRow[field];
            if (!valuesDiffer(oldRaw, newRaw)) continue;
            const blame = resolveBlameForField(
              overridesForToVersion, options.ezquakeRepoPath, toCommitSha, toRow, blameCache,
              toSrcPrefix, config.hasSource, entityId, field,
            );
            await tx`
              INSERT INTO change_events (
                entity_id, from_version, to_version, change_kind, field_name,
                old_value, new_value, commit_sha, commit_message_excerpt,
                enrichment_source, extracted_at
              ) VALUES (
                ${entityId}, ${options.fromVersion}, ${options.toVersion}, ${'modified' satisfies ChangeKind}, ${field},
                ${stringifyOrNull(oldRaw)}, ${stringifyOrNull(newRaw)}, ${blame.commit_sha}, ${blame.commit_message_excerpt},
                ${'git'}, ${now}
              )
              ON CONFLICT (entity_id, to_version, field_name, change_kind) DO UPDATE SET
                from_version           = EXCLUDED.from_version,
                old_value              = EXCLUDED.old_value,
                new_value              = EXCLUDED.new_value,
                commit_sha             = EXCLUDED.commit_sha,
                commit_message_excerpt = EXCLUDED.commit_message_excerpt,
                enrichment_source      = EXCLUDED.enrichment_source,
                extracted_at           = EXCLUDED.extracted_at
            `;
            modified += 1;
          }
        }
      }

      totalCreations += created;
      totalModifications += modified;
      totalDeletions += deleted;
      perType.push({
        type: config.entityType,
        fromCount: fromRows.length,
        toCount: toRows.length,
        created,
        modified,
        deleted,
      });
    }

    const relResult = await diffAssetRelations(
      tx, options.project, options.fromVersion, options.toVersion, now,
    );
    totalCreations += relResult.totalCreated;
    totalModifications += relResult.totalModified;
    totalDeletions += relResult.totalDeleted;
    diffResultExtras.relationStats = relResult.stats;
  });

  return {
    extractorRunId,
    fromCommitSha,
    toCommitSha,
    changeEventsInserted: totalCreations + totalModifications + totalDeletions,
    creationsEmitted: totalCreations,
    modificationsEmitted: totalModifications,
    deletionsEmitted: totalDeletions,
    transitionsLogged: totalTransitions,
    perType,
    relationStats: diffResultExtras.relationStats ?? [],
  };
}

async function diffAssetRelations(
  tx: postgres.TransactionSql<{}>,
  project: Project,
  fromVersion: string,
  toVersion: string,
  now: string,
): Promise<{ stats: RelationStats[]; totalCreated: number; totalModified: number; totalDeleted: number }> {
  // commit_sha='UNKNOWN' / commit_message_excerpt=NULL are hardcoded
  // intentionally. Relation rows (asset_extensions / _path_rules /
  // _cvar_bindings / _loader_sites) don't yet carry source_file+source_line,
  // so git blame has no anchor. Batch 3 will add loader-site line tracking
  // and retire this stub.
  const stats: RelationStats[] = [];
  let totalCreated = 0;
  let totalModified = 0;
  let totalDeleted = 0;

  for (const config of RELATION_DIFF_CONFIGS) {
    const fromRows = await tx<Array<Record<string, unknown>>>`
      SELECT * FROM ${tx(config.table)} WHERE project = ${project} AND version = ${fromVersion}
    `;
    const toRows = await tx<Array<Record<string, unknown>>>`
      SELECT * FROM ${tx(config.table)} WHERE project = ${project} AND version = ${toVersion}
    `;

    const keyOf = (row: Record<string, unknown>): string => {
      const obj: Record<string, unknown> = {};
      for (const col of [...config.naturalKeyColumns].sort()) {
        obj[col] = row[col] ?? null;
      }
      return JSON.stringify(obj);
    };

    const fromByKey = new Map<string, Record<string, unknown>>();
    const toByKey = new Map<string, Record<string, unknown>>();
    for (const r of fromRows) fromByKey.set(keyOf(r), r);
    for (const r of toRows) toByKey.set(keyOf(r), r);

    const allKeys = new Set<string>([...fromByKey.keys(), ...toByKey.keys()]);
    let created = 0;
    let modified = 0;
    let deleted = 0;

    for (const key of allKeys) {
      const fromRow = fromByKey.get(key);
      const toRow = toByKey.get(key);

      if (!fromRow && toRow) {
        await tx`
          INSERT INTO relation_changes (
            relation_table, project, from_version, to_version, change_kind,
            row_key_json, field_name, old_value, new_value,
            commit_sha, commit_message_excerpt, extracted_at
          ) VALUES (
            ${config.table}, ${project}, ${fromVersion}, ${toVersion}, ${'created' satisfies ChangeKind},
            ${key}, ${''}, ${null}, ${null},
            ${'UNKNOWN'}, ${null}, ${now}
          )
          ON CONFLICT (relation_table, project, to_version, row_key_json, field_name, change_kind) DO UPDATE SET
            from_version           = EXCLUDED.from_version,
            old_value              = EXCLUDED.old_value,
            new_value              = EXCLUDED.new_value,
            commit_sha             = EXCLUDED.commit_sha,
            commit_message_excerpt = EXCLUDED.commit_message_excerpt,
            extracted_at           = EXCLUDED.extracted_at
        `;
        created += 1;
        continue;
      }

      if (fromRow && !toRow) {
        await tx`
          INSERT INTO relation_changes (
            relation_table, project, from_version, to_version, change_kind,
            row_key_json, field_name, old_value, new_value,
            commit_sha, commit_message_excerpt, extracted_at
          ) VALUES (
            ${config.table}, ${project}, ${fromVersion}, ${toVersion}, ${'deleted' satisfies ChangeKind},
            ${key}, ${''}, ${null}, ${null},
            ${'UNKNOWN'}, ${null}, ${now}
          )
          ON CONFLICT (relation_table, project, to_version, row_key_json, field_name, change_kind) DO UPDATE SET
            from_version           = EXCLUDED.from_version,
            old_value              = EXCLUDED.old_value,
            new_value              = EXCLUDED.new_value,
            commit_sha             = EXCLUDED.commit_sha,
            commit_message_excerpt = EXCLUDED.commit_message_excerpt,
            extracted_at           = EXCLUDED.extracted_at
        `;
        deleted += 1;
        continue;
      }

      if (fromRow && toRow) {
        for (const col of config.diffableColumns) {
          if (!valuesDiffer(fromRow[col], toRow[col])) continue;
          await tx`
            INSERT INTO relation_changes (
              relation_table, project, from_version, to_version, change_kind,
              row_key_json, field_name, old_value, new_value,
              commit_sha, commit_message_excerpt, extracted_at
            ) VALUES (
              ${config.table}, ${project}, ${fromVersion}, ${toVersion}, ${'modified' satisfies ChangeKind},
              ${key}, ${col}, ${stringifyOrNull(fromRow[col])}, ${stringifyOrNull(toRow[col])},
              ${'UNKNOWN'}, ${null}, ${now}
            )
            ON CONFLICT (relation_table, project, to_version, row_key_json, field_name, change_kind) DO UPDATE SET
              from_version           = EXCLUDED.from_version,
              old_value              = EXCLUDED.old_value,
              new_value              = EXCLUDED.new_value,
              commit_sha             = EXCLUDED.commit_sha,
              commit_message_excerpt = EXCLUDED.commit_message_excerpt,
              extracted_at           = EXCLUDED.extracted_at
          `;
          modified += 1;
        }
      }
    }

    stats.push({
      table: config.table,
      fromCount: fromRows.length,
      toCount: toRows.length,
      created,
      modified,
      deleted,
    });
    totalCreated += created;
    totalModified += modified;
    totalDeleted += deleted;
  }

  return { stats, totalCreated, totalModified, totalDeleted };
}

function resolveBlame(
  ezquakeRepoPath: string,
  blameRef: string,
  row: Row,
  cache: Map<string, BlameOut>,
  sourcePrefix: string,
  hasSource: boolean,
): BlameOut {
  if (!hasSource) {
    return { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  }
  const file = row.source_file as string | null;
  const line = row.source_line as number | null;
  if (!file || !line) {
    return { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  }
  const key = `${blameRef}|${file}:${line}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const repoPath = `${sourcePrefix}${file}`;
  const result = blameLine(ezquakeRepoPath, blameRef, repoPath, line);
  const out = result ?? { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  cache.set(key, out);
  return out;
}

// Modification events prefer the per-field site recorded in source_overrides
// (e.g. a ruleset's maxfps struct-field line, a hud_element's header-declared
// flags, a cvar's default_value call-site). Fields without an override row
// fall back to the entity's primary declaration via resolveBlame. Creation
// and deletion events don't pass through here -- they have no field_name and
// correctly stay on entity-level blame.
function resolveBlameForField(
  overrides: Map<string, { source_file: string; source_line: number }>,
  ezquakeRepoPath: string,
  blameRef: string,
  row: Row,
  cache: Map<string, BlameOut>,
  sourcePrefix: string,
  hasSource: boolean,
  entityId: number,
  fieldName: string,
): BlameOut {
  const override = overrides.get(`${entityId}|${fieldName}`);
  if (override) {
    const key = `${blameRef}|${override.source_file}:${override.source_line}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const repoPath = `${sourcePrefix}${override.source_file}`;
    const result = blameLine(ezquakeRepoPath, blameRef, repoPath, override.source_line);
    const out = result ?? { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
    cache.set(key, out);
    return out;
  }
  return resolveBlame(ezquakeRepoPath, blameRef, row, cache, sourcePrefix, hasSource);
}

// Compare two field values for diff purposes. JSONB columns auto-decode to
// JS objects/arrays via postgres-js; SQLite-era code stored them as strings
// so plain `String(v)` worked. Now we route non-primitive values through
// JSON.stringify to preserve diff semantics; primitives keep `String(v)` so
// numeric/string compare is still cheap.
function valuesDiffer(a: unknown, b: unknown): boolean {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return false;
  if (aNull !== bNull) return true;
  return canonicalize(a) !== canonicalize(b);
}

// Likewise: TEXT old_value/new_value columns must store a stable string, not
// '[object Object]'. Wraps non-primitive values in JSON.stringify.
function stringifyOrNull(v: unknown): string | null {
  if (v == null) return null;
  return canonicalize(v);
}

function canonicalize(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
