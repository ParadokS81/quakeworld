// apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts
//
// Q3: field changes that indicate categorical / semantic evolution rather
// than value drift. Hard-coded allowlist per table so "cvar default_value
// changed from 0 to 1" does NOT surface as a semantic crossing (that's
// ordinary value drift), while "asset_loader_site load_trigger changed
// from unknown to on_map_load" DOES.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

// Entity-level fields whose changes are categorical.
// Keyed on change_events.field_name exactly as the diff pipeline writes it.
const ENTITY_SEMANTIC_FIELDS: readonly string[] = [
  'flag_names',          // cvar flag-bit set changed
  'teamplay_restricted', // macro restriction toggled
  'macro_type',          // runtime vs static
  'server_only',         // cvar server_only flipped
  'key_code',            // keyname remapped
  'build_variant',       // keyname platform changed
  'hud_alias',           // hud element alias changed
  'min_state_raw',       // hud element visibility gate
  'draw_order_raw',      // hud element paint order
  // ruleset restrict_* flags (all eleven per schema.ts) + cap + pin list
  'restrict_triggers', 'restrict_packet', 'restrict_particles', 'restrict_play',
  'restrict_logging', 'restrict_rollangle', 'restrict_ipc', 'restrict_exec',
  'restrict_setcalc', 'restrict_seteval', 'restrict_setex',
  'maxfps',
  'locked_cvars_json',
  'enum_ident',          // ruleset enum rename
  'category',            // token_primitive category (led / glyph / separator / expansion)
  'bitmask_family',      // flag_bit family reassignment
];

// Relation fields whose changes carry categorical meaning.
// Per relation_table -> field_name allowlist. Keep in sync with the
// RELATION_DIFF_CONFIGS in diff-versions.ts.
const RELATION_SEMANTIC_FIELDS: Record<string, readonly string[]> = {
  asset_extensions: ['category_id'],
  asset_path_rules: ['rule_kind'],
  asset_cvar_bindings: ['load_trigger', 'confidence'],
  asset_loader_sites: ['reads_category_id', 'load_trigger', 'path_source', 'confidence'],
};

export function findSemanticCrossings(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Entity-level crossings.
  const entityPlaceholders = ENTITY_SEMANTIC_FIELDS.map(() => '?').join(',');
  const entityRows = db.prepare(`
    SELECT ce.entity_id, ce.field_name, ce.old_value, ce.new_value, ce.commit_sha,
           ce.commit_message_excerpt, e.canonical_id, e.type, e.name
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE ce.from_version = ? AND ce.to_version = ?
      AND ce.change_kind = 'modified'
      AND e.project = ?
      AND ce.field_name IN (${entityPlaceholders})
    ORDER BY e.type, e.name, ce.field_name
  `).all(fromVersion, toVersion, project, ...ENTITY_SEMANTIC_FIELDS) as Array<{
    entity_id: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    commit_sha: string;
    commit_message_excerpt: string | null;
    canonical_id: string;
    type: string;
    name: string;
  }>;

  for (const r of entityRows) {
    findings.push({
      id: makeFindingId('semantic-crossing', `${r.canonical_id}:${r.field_name}`),
      bucket: 'semantic-crossing',
      summary: `${r.type} \`${r.name}\`: ${r.field_name} changed.`,
      evidence: {
        entity_ref: r.canonical_id,
        commit_sha: r.commit_sha,
        from_value: r.old_value ?? '',
        to_value: r.new_value ?? '',
      },
    });
  }

  // Relation-level crossings, one per (relation_table, field).
  for (const [table, fields] of Object.entries(RELATION_SEMANTIC_FIELDS)) {
    if (fields.length === 0) continue;
    const placeholders = fields.map(() => '?').join(',');
    const relRows = db.prepare(`
      SELECT relation_table, row_key_json, field_name, old_value, new_value,
             commit_sha, commit_message_excerpt
      FROM relation_changes
      WHERE project = ? AND from_version = ? AND to_version = ?
        AND change_kind = 'modified'
        AND relation_table = ?
        AND field_name IN (${placeholders})
      ORDER BY row_key_json, field_name
    `).all(project, fromVersion, toVersion, table, ...fields) as Array<{
      relation_table: string;
      row_key_json: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
      commit_sha: string;
      commit_message_excerpt: string | null;
    }>;

    for (const r of relRows) {
      const key = `${r.relation_table}:${r.row_key_json}`;
      findings.push({
        id: makeFindingId('semantic-crossing', `${key}:${r.field_name}`),
        bucket: 'semantic-crossing',
        summary: `${r.relation_table}[${r.row_key_json}]: ${r.field_name} changed.`,
        evidence: {
          relation_row_key: key,
          commit_sha: r.commit_sha,
          from_value: r.old_value ?? '',
          to_value: r.new_value ?? '',
        },
      });
    }
  }

  return findings;
}
