// apps/qw-oracle/scripts/load-knowledge/diff-versions.ts
//
// Stage 2 of the loader pipeline: compute change_events between two
// already-loaded versions of the same project.
//
// Per spec Section 3 + Section 4:
//   - Modification emits one row per changed substantive field.
//   - Creation emits one row with change_kind='created'; re-added entities
//     also flip source_state back to source_backed and log transition.
//   - Deletion emits one row with change_kind='deleted'; loader flips
//     source_state to source_retired and logs transition.
//   - commit_sha populated via git blame at the to-version source_file:source_line.
//     (Falls back to 'UNKNOWN' if blame fails; real lines always resolve.)

import type Database from 'better-sqlite3';
import { ulid } from 'ulid';
import { blameLine } from './git.js';
import { setEntitySourceState } from './natural-keys.js';
import { logTransition } from './transitions.js';
import type { ChangeKind, Project } from './types.js';

export interface DiffOptions {
  db: Database.Database;
  project: Project;
  fromVersion: string;
  toVersion: string;
  ezquakeRepoPath: string;
}

// Repo-relative prefix prepended to `cvar_versions.source_file` (which
// holds only the basename) before `git blame`. ezQuake / MVDSV / KTX
// all root their C sources under `src/`. FTE's layout is subsystem-
// partitioned (`engine/client/`, `engine/server/`, `engine/common/`,
// ...), so FTE's extractor will need to emit paths relative to the
// repo root itself rather than a single prefix.
const PROJECT_SRC_PREFIX: Record<Project, string> = {
  ezquake: 'src/',
  mvdsv:   'src/',
  ktx:     'src/',
  fte:     '',
};

export interface DiffResult {
  extractorRunId: string;
  changeEventsInserted: number;
  creationsEmitted: number;
  modificationsEmitted: number;
  deletionsEmitted: number;
  transitionsLogged: number;
}

const DIFFABLE_CVAR_FIELDS = [
  'default_value',
  'flags_raw',
  'flag_names',
  'on_change',
  'min_bound',
  'max_bound',
  'help_desc',
  'help_remarks',
  'help_values',
  'help_type',
  'source_file',
  'server_only',
  'group_name_in_source',
  'trailing_comment',
] as const;

interface CvarRow {
  entity_id: number;
  version: string;
  [col: string]: unknown;
}

export function diffVersions(options: DiffOptions): DiffResult {
  const extractorRunId = ulid();
  const now = new Date().toISOString();

  const fromRows = options.db.prepare(`
    SELECT cv.*, e.id AS entity_id
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
  `).all(options.project, options.fromVersion) as CvarRow[];

  const toRows = options.db.prepare(`
    SELECT cv.*, e.id AS entity_id
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
  `).all(options.project, options.toVersion) as CvarRow[];

  if (fromRows.length === 0 && toRows.length === 0) {
    throw new Error(
      `Neither version has cvar rows. Did you run load-version for --from ${options.fromVersion} and --to ${options.toVersion}?`
    );
  }

  const fromByEntity = new Map<number, CvarRow>();
  const toByEntity = new Map<number, CvarRow>();
  for (const r of fromRows) fromByEntity.set(r.entity_id, r);
  for (const r of toRows) toByEntity.set(r.entity_id, r);

  const allIds = new Set<number>([...fromByEntity.keys(), ...toByEntity.keys()]);

  const insertEvent = options.db.prepare(`
    INSERT OR REPLACE INTO change_events (
      entity_id, from_version, to_version, change_kind, field_name,
      old_value, new_value, commit_sha, commit_message_excerpt,
      enrichment_source, extracted_at
    ) VALUES (
      @entity_id, @from_version, @to_version, @change_kind, @field_name,
      @old_value, @new_value, @commit_sha, @commit_message_excerpt,
      'git', @extracted_at
    )
  `);

  let creations = 0;
  let modifications = 0;
  let deletions = 0;
  let transitions = 0;

  // Per-call blame cache keyed by `<file>:<line>`. A modified entity with N
  // changed fields previously hit `git blame` N times; the cache collapses
  // that to one hit per (file, line) per diff call. Meaningful at Phase 2f
  // scale (~32 tags x thousands of cvars).
  const blameCache = new Map<
    string,
    { commit_sha: string; commit_message_excerpt: string | null }
  >();
  const blameFor = (row: CvarRow) => resolveBlameCached(options, row, blameCache);

  const txn = options.db.transaction(() => {
    for (const entityId of allIds) {
      const fromRow = fromByEntity.get(entityId);
      const toRow = toByEntity.get(entityId);

      if (!fromRow && toRow) {
        const blame = blameFor(toRow);
        insertEvent.run({
          entity_id: entityId,
          from_version: null,
          to_version: options.toVersion,
          change_kind: 'created' as ChangeKind,
          field_name: '',
          old_value: null,
          new_value: null,
          commit_sha: blame.commit_sha,
          commit_message_excerpt: blame.commit_message_excerpt,
          extracted_at: now,
        });
        creations += 1;

        const prev = options.db.prepare(`SELECT source_state FROM entities WHERE id = ?`).get(entityId) as { source_state: string };
        if (prev.source_state === 'source_retired') {
          setEntitySourceState(options.db, entityId, 'source_backed');
          logTransition(options.db, {
            entity_id: entityId,
            from_state: 'source_retired',
            to_state: 'source_backed',
            reason: 're_added',
            version_context: options.toVersion,
            extractor_run_id: extractorRunId,
          });
          transitions += 1;
        }
        continue;
      }

      if (fromRow && !toRow) {
        const blame = blameFor(fromRow);
        insertEvent.run({
          entity_id: entityId,
          from_version: options.fromVersion,
          to_version: options.toVersion,
          change_kind: 'deleted' as ChangeKind,
          field_name: '',
          old_value: null,
          new_value: null,
          commit_sha: blame.commit_sha,
          commit_message_excerpt: blame.commit_message_excerpt,
          extracted_at: now,
        });
        deletions += 1;

        setEntitySourceState(options.db, entityId, 'source_retired');
        logTransition(options.db, {
          entity_id: entityId,
          from_state: 'source_backed',
          to_state: 'source_retired',
          reason: 'removed_from_head',
          version_context: options.toVersion,
          extractor_run_id: extractorRunId,
        });
        transitions += 1;
        continue;
      }

      if (fromRow && toRow) {
        for (const field of DIFFABLE_CVAR_FIELDS) {
          const oldRaw = fromRow[field];
          const newRaw = toRow[field];
          if (!valuesDiffer(oldRaw, newRaw)) continue;
          const blame = blameFor(toRow);
          insertEvent.run({
            entity_id: entityId,
            from_version: options.fromVersion,
            to_version: options.toVersion,
            change_kind: 'modified' as ChangeKind,
            field_name: field,
            old_value: stringifyOrNull(oldRaw),
            new_value: stringifyOrNull(newRaw),
            commit_sha: blame.commit_sha,
            commit_message_excerpt: blame.commit_message_excerpt,
            extracted_at: now,
          });
          modifications += 1;
        }
      }
    }
  });

  txn();

  return {
    extractorRunId,
    changeEventsInserted: creations + modifications + deletions,
    creationsEmitted: creations,
    modificationsEmitted: modifications,
    deletionsEmitted: deletions,
    transitionsLogged: transitions,
  };
}

function resolveBlameCached(
  options: DiffOptions,
  row: CvarRow,
  cache: Map<string, { commit_sha: string; commit_message_excerpt: string | null }>,
): { commit_sha: string; commit_message_excerpt: string | null } {
  const file = row.source_file as string | null;
  const line = row.source_line as number | null;
  if (!file || !line) {
    return { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  }
  const key = `${file}:${line}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const prefix = PROJECT_SRC_PREFIX[options.project];
  const repoPath = `${prefix}${file}`;
  const result = blameLine(options.ezquakeRepoPath, 'HEAD', repoPath, line);
  const out = result ?? { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  cache.set(key, out);
  return out;
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return false;
  if (aNull !== bNull) return true;
  return String(a) !== String(b);
}

function stringifyOrNull(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}
