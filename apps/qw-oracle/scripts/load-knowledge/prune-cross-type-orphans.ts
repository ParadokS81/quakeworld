// apps/qw-oracle/scripts/load-knowledge/prune-cross-type-orphans.ts
//
// Cross-type help-JSON orphan cleanup. Help-JSON files occasionally label a
// name under the wrong entity type (e.g. `radar` is registered via
// HUD_Register so it lands as `hud_element source_backed`, but
// help_commands.json ALSO lists `radar` -> commands extractor emits it with
// ast=null -> loader creates `command doc_only`). This pass deletes the
// wrong-type doc_only rows when a same-name source_backed counterpart exists
// under another type.
//
// IMPORTANT: this prune is order-sensitive. During a deep-time walk that
// proceeds backward (newer tags first), an entity that's doc_only at newer
// tags but real-source-defined at not-yet-loaded older tags (e.g.
// `scr_weaponstats_x` cvar at v3.0.1) will be incorrectly pruned because
// its entity-level source_state is doc_only at the time of pruning. To
// avoid this, walk callers should pass --skip-prune to extract-tag /
// load-version and run pruneCrossTypeOrphansAllTypes once at the end of
// the walk, when the entity-level source_state reflects the full picture.
//
// For single-tag loads (canonical use case before deep-time walks
// existed), the per-load prune in load-version.ts is correct because there
// is no "later" tag to reveal source presence.
import type Database from 'better-sqlite3';
import type { EntityType, Project } from './types.js';

// Mirror of PER_TYPE_VERSION_TABLE in quality-grid.ts. Keep in sync.
const PER_TYPE_VERSION_TABLE: Record<EntityType, string> = {
  cvar:            'cvar_versions',
  command:         'command_versions',
  macro:           'macro_versions',
  cmdline_param:   'cmdline_param_versions',
  keyname:         'keyname_versions',
  hud_element:     'hud_element_versions',
  ruleset:         'ruleset_versions',
  token_primitive: 'token_primitive_versions',
  flag_bit:        'flag_bit_versions',
  asset_category:  'asset_category_versions',
};

export interface PruneCrossTypeOrphansOptions {
  db: Database.Database;
  project: Project;
  type: EntityType;
}

export interface PruneCrossTypeOrphansResult {
  type: EntityType;
  pruned: number;
}

// Per-type prune. Identifies entities of the given type that are doc_only
// AND have a same-name same-project source_backed counterpart under some
// OTHER type. Deletes the version rows, transitions, overrides, and entity
// row.
export function pruneCrossTypeOrphans(
  options: PruneCrossTypeOrphansOptions,
): PruneCrossTypeOrphansResult {
  const versionsTable = PER_TYPE_VERSION_TABLE[options.type];
  if (!versionsTable) {
    throw new Error(`pruneCrossTypeOrphans: unknown type ${options.type}`);
  }

  const findOrphansStmt = options.db.prepare(`
    SELECT e.id FROM entities e
    WHERE e.project = ? AND e.type = ? AND e.source_state = 'doc_only'
      AND EXISTS (
        SELECT 1 FROM entities e2
        WHERE e2.project = e.project
          AND e2.name = e.name
          AND e2.type != e.type
          AND e2.source_state = 'source_backed'
      )
  `);
  const orphanRows = findOrphansStmt.all(options.project, options.type) as { id: number }[];

  if (orphanRows.length === 0) {
    return { type: options.type, pruned: 0 };
  }

  const deleteVersions = options.db.prepare(
    `DELETE FROM ${versionsTable} WHERE entity_id = ?`,
  );
  const deleteTransitions = options.db.prepare(
    `DELETE FROM source_state_transitions WHERE entity_id = ?`,
  );
  const deleteOverrides = options.db.prepare(
    `DELETE FROM source_overrides WHERE entity_id = ?`,
  );
  const deleteEntity = options.db.prepare(`DELETE FROM entities WHERE id = ?`);

  for (const { id } of orphanRows) {
    deleteVersions.run(id);
    deleteTransitions.run(id);
    deleteOverrides.run(id);
    deleteEntity.run(id);
  }

  return { type: options.type, pruned: orphanRows.length };
}

// Project-wide finalize: prune across all entity types. Use at the end of
// a deep-time walk (see header comment).
export function pruneCrossTypeOrphansAllTypes(
  db: Database.Database,
  project: Project,
): PruneCrossTypeOrphansResult[] {
  const types = Object.keys(PER_TYPE_VERSION_TABLE) as EntityType[];
  return types.map(type => pruneCrossTypeOrphans({ db, project, type }));
}
