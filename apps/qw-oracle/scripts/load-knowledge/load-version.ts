// apps/qw-oracle/scripts/load-knowledge/load-version.ts
//
// Stage 1 of the loader pipeline: ingest one (project, version) pair's
// JSON output into the knowledge DB.
//
// Per spec:
//   - Upsert versions row
//   - Upsert entities rows (preserve first_seen_version on creation;
//     extend last_seen_version to this version if ordinal is later)
//   - Upsert cvar_versions rows
//   - Emit source_state_transitions rows on initial observation
//   - Write schema_meta operational keys
//   - NO change events - that is the diff stage's job.

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import {
  extendFirstSeenVersion,
  setEntitySourceState,
  upsertCvarVersion,
  upsertEntity,
  upsertVersion,
} from './natural-keys.js';
import { logTransition } from './transitions.js';
import type {
  CvarVersionRow,
  EntityType,
  ExtractorOutput,
  Project,
  SourceState,
  VariableEntry,
} from './types.js';

export interface LoadVersionOptions {
  db: Database.Database;
  project: Project;
  version: string;
  type: EntityType;
  jsonPath: string;
  commitSha: string;
  tagDate: string | null;
  ordinal: number;
  parseState?: 'ok' | 'partial';
  notes?: string | null;
  extractorVersion: string;
  forceOverwrite?: boolean;
}

export interface LoadVersionResult {
  extractorRunId: string;
  entitiesUpserted: number;
  versionsUpserted: number;
  transitionsLogged: number;
  entityCount: number;
  parseState: 'ok' | 'partial';
}

const PARTIAL_DROP_GUARD_RATIO = 0.5;

export function loadVersion(options: LoadVersionOptions): LoadVersionResult {
  if (options.type !== 'cvar') {
    throw new Error(`Phase 2b load-version only handles type=cvar; got ${options.type}`);
  }

  const extractorRunId = ulid();
  const now = new Date().toISOString();

  const raw = readFileSync(options.jsonPath, 'utf-8');
  const payload = JSON.parse(raw) as ExtractorOutput;

  const entryCount = Object.keys(payload.vars).length;

  const priorRowCount = options.db.prepare(`
    SELECT COUNT(*) AS n FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
  `).get(options.project, options.version) as { n: number };

  if (priorRowCount.n > 0 && entryCount === 0 && !options.forceOverwrite) {
    throw new Error(
      `Regression: prior run populated ${priorRowCount.n} rows for ${options.project}@${options.version}, ` +
      `current JSON has zero. Aborting. Use --force to override.`
    );
  }

  let parseStateFinal: 'ok' | 'partial' = options.parseState ?? 'ok';
  if (priorRowCount.n > 0 && entryCount < priorRowCount.n * PARTIAL_DROP_GUARD_RATIO) {
    if (!options.forceOverwrite) {
      throw new Error(
        `Entity count dropped from ${priorRowCount.n} to ${entryCount} ` +
        `(>${(1 - PARTIAL_DROP_GUARD_RATIO) * 100}% drop). Aborting without --force.`
      );
    }
    parseStateFinal = 'partial';
    console.warn(
      `[load-version] entity count drop from ${priorRowCount.n} to ${entryCount}; ` +
      `marking version.parse_state='partial'.`
    );
  }

  const txn = options.db.transaction(() => {
    upsertVersion(options.db, {
      project: options.project,
      version: options.version,
      commit_sha: options.commitSha,
      tag_date: options.tagDate,
      ordinal: options.ordinal,
      parse_state: parseStateFinal,
      notes: options.notes ?? null,
      extracted_at: now,
    });

    let upserted = 0;
    let transitions = 0;

    for (const [nameRaw, entry] of Object.entries(payload.vars)) {
      const name = nameRaw.toLowerCase();
      if (!/^[a-z0-9_.]+$/.test(name)) {
        console.warn(`[load-version] skipping entity with invalid name: ${nameRaw}`);
        continue;
      }

      const sourceBacked = entry.ast !== null;
      const initialSourceState: SourceState = sourceBacked ? 'source_backed' : 'doc_only';

      const upsertResult = upsertEntity(options.db, {
        project: options.project,
        type: options.type,
        name,
        first_seen_version: options.version,
        last_seen_version: options.version,
        source_state: initialSourceState,
      });

      if (upsertResult.isNew) {
        logTransition(options.db, {
          entity_id: upsertResult.id,
          from_state: '',
          to_state: initialSourceState,
          reason: 'initial_observation',
          version_context: options.version,
          extractor_run_id: extractorRunId,
        });
        transitions += 1;
      } else if (upsertResult.prevSourceState === 'doc_only' && sourceBacked) {
        setEntitySourceState(options.db, upsertResult.id, 'source_backed');
        logTransition(options.db, {
          entity_id: upsertResult.id,
          from_state: 'doc_only',
          to_state: 'source_backed',
          reason: 'backfill_match',
          version_context: options.version,
          extractor_run_id: extractorRunId,
        });
        transitions += 1;

        const ent = options.db.prepare(`SELECT first_seen_version FROM entities WHERE id = ?`).get(upsertResult.id) as { first_seen_version: string };
        if (ent.first_seen_version > options.version) {
          extendFirstSeenVersion(options.db, upsertResult.id, options.version);
        }
      }

      upsertCvarVersion(options.db, cvarVersionRowFromEntry(upsertResult.id, options.version, entry, now));
      upserted += 1;
    }

    const setMeta = options.db.prepare(`
      INSERT INTO schema_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    setMeta.run('last_extraction_run_at', now);
    setMeta.run('extractor_version', options.extractorVersion);
    setMeta.run(`${options.project}:source_repo_commit`, options.commitSha);
    setMeta.run(`${options.project}:source_repo_tag`, options.tagDate ? options.version : '');

    return { upserted, transitions };
  });

  const { upserted, transitions } = txn();

  return {
    extractorRunId,
    entitiesUpserted: upserted,
    versionsUpserted: 1,
    transitionsLogged: transitions,
    entityCount: entryCount,
    parseState: parseStateFinal,
  };
}

function cvarVersionRowFromEntry(
  entityId: number,
  version: string,
  entry: VariableEntry,
  now: string,
): CvarVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,

    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    help_values: entry.values == null ? null : JSON.stringify(entry.values),
    help_group_id: entry['group-id'] ?? null,
    help_type: entry.type ?? null,

    default_value: entry.default == null ? null : String(entry.default),
    flags_raw: ast?.flags_raw ?? null,
    flag_names: ast?.flag_names ? JSON.stringify(ast.flag_names) : null,
    on_change: ast?.on_change ?? null,
    min_bound: ast?.min_bound ?? null,
    max_bound: ast?.max_bound ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    storage_class: ast?.storage_class ?? null,
    group_name_in_source: ast?.group_name_in_source ?? null,
    trailing_comment: ast?.trailing_comment ?? null,
    server_only: entry['server-only'] ? 1 : 0,

    raw_ast_hash,
    extracted_at: now,
  };
}
