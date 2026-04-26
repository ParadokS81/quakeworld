// apps/qw-oracle/scripts/load-knowledge/load-cvar-aliases.ts
//
// Per-type adapter for cvar_alias entities (schema v12). Spec:
// docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md.

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { parseVersionSpec } from '@qw/version-resolution';
import { upsertCvarAliasVersion } from './natural-keys.js';
import type { CvarAliasEntry, CvarAliasVersionRow } from './types.js';

export const CVAR_ALIAS_PAYLOAD_FIELD = 'aliases';

export function cvarAliasIsSourceBacked(entry: CvarAliasEntry): boolean {
  return entry.ast !== null;
}

// parseVersionSpec is total (never throws), so we explicitly reject strings
// that fall back to kind='tag' but don't look like a clean semver-shaped tag.
// The reviewer's concern was producer drift like 'build_6698' vs 'build-6698'
// silently surviving as tag-kind. This catches it.
//
// A null / undefined value is allowed (the column is nullable; mimics axis is
// optional for internal-engine aliases).
function assertVersionStringWellFormed(s: string | null | undefined, fieldName: string): string | null {
  if (s == null) return null;
  if (typeof s !== 'string' || s.length === 0) {
    throw new Error(`[load-cvar-aliases] ${fieldName} must be a non-empty string, got: ${JSON.stringify(s)}`);
  }
  const spec = parseVersionSpec(s);
  if (spec.kind === 'tag') {
    // Accept canonical semver-ish tags (3.6.9, 2.33, 1.10) and head/build
    // strings parse on their own kinds. Reject anything else as malformed.
    if (!/^\d+(\.\d+)*$/.test(spec.value)) {
      throw new Error(
        `[load-cvar-aliases] ${fieldName}=${JSON.stringify(s)} is not a recognized version string ` +
        `(expected semver-like tag, build-NNN, or head-YYYY-MM-DD)`,
      );
    }
  }
  return s;
}

export function buildCvarAliasVersionRow(
  entityId: number,
  version: string,
  entry: CvarAliasEntry,
  now: string,
): CvarAliasVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  const verifiedTarget = assertVersionStringWellFormed(
    entry.verified_target_version ?? null,
    'verified_target_version',
  );
  const verifiedMimics = assertVersionStringWellFormed(
    entry.verified_mimics_version ?? null,
    'verified_mimics_version',
  );

  return {
    entity_id: entityId,
    version,
    target_project: entry.target_project,
    target_kind: entry.target_kind,
    target_name: entry.target_name,
    // Resolved by upsertCvarAliasVersion at insert time -- best-effort lookup
    // against entities.canonical_id for the (target_project, target_kind,
    // target_name) triple. NULL when the target entity isn't loaded yet.
    target_canonical_id: null,
    mimics_project: entry.mimics_project ?? null,
    value_transform: entry.value_transform ?? 'identity',
    value_transform_params_json:
      entry.value_transform_params == null
        ? null
        : JSON.stringify(entry.value_transform_params),
    default_drift_status: entry.default_drift_status ?? 'unknown',
    semantic_confidence: entry.semantic_confidence ?? 'needs_review',
    verified_target_version: verifiedTarget,
    verified_mimics_version: verifiedMimics,
    freshness_state: entry.freshness_state ?? 'unknown',
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    source_root: entry.source_root ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertCvarAliasRow(db: Database.Database, row: CvarAliasVersionRow): void {
  upsertCvarAliasVersion(db, row);
}
