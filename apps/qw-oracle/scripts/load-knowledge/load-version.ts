// apps/qw-oracle/scripts/load-knowledge/load-version.ts
//
// Stage 1 orchestrator: ingest one (project, version, type) triple into the
// knowledge DB. Per-type logic lives in load-{cvars,commands,macros,cmdline-params}.ts;
// this file owns the shared scaffolding (version upsert, entity upsert,
// transitions, schema_meta, partial-drop guard).

import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import {
  extendFirstSeenVersion,
  setEntitySourceState,
  upsertEntity,
  upsertVersion,
} from './natural-keys.js';
import { logTransition } from './transitions.js';
import {
  CVAR_PAYLOAD_FIELD,
  buildCvarVersionRow,
  cvarIsSourceBacked,
  upsertCvarRow,
} from './load-cvars.js';
import {
  COMMAND_PAYLOAD_FIELD,
  buildCommandVersionRow,
  commandIsSourceBacked,
  upsertCommandRow,
} from './load-commands.js';
import {
  MACRO_PAYLOAD_FIELD,
  buildMacroVersionRow,
  macroIsSourceBacked,
  upsertMacroRow,
} from './load-macros.js';
import {
  CMDLINE_PARAM_PAYLOAD_FIELD,
  buildCmdlineParamVersionRow,
  cmdlineIsSourceBacked,
  upsertCmdlineParamRow,
} from './load-cmdline-params.js';
import type {
  EntityType,
  Project,
  SourceState,
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

// Per-type adapter interface. Each type supplies:
//   - the field name under which entries live in the extractor JSON
//   - which table the loader should count against for the drop-guard
//   - an is-source-backed predicate for the initial source_state decision
//   - a row builder + upsert call
interface TypeAdapter {
  payloadField: string;
  versionsTable: string;
  isSourceBacked: (entry: any) => boolean;
  buildRow: (entityId: number, version: string, entry: any, now: string) => any;
  upsertRow: (db: Database.Database, row: any) => void;
}

const ADAPTERS: Record<EntityType, TypeAdapter> = {
  cvar: {
    payloadField: CVAR_PAYLOAD_FIELD,
    versionsTable: 'cvar_versions',
    isSourceBacked: cvarIsSourceBacked,
    buildRow: buildCvarVersionRow,
    upsertRow: upsertCvarRow,
  },
  command: {
    payloadField: COMMAND_PAYLOAD_FIELD,
    versionsTable: 'command_versions',
    isSourceBacked: commandIsSourceBacked,
    buildRow: buildCommandVersionRow,
    upsertRow: upsertCommandRow,
  },
  macro: {
    payloadField: MACRO_PAYLOAD_FIELD,
    versionsTable: 'macro_versions',
    isSourceBacked: macroIsSourceBacked,
    buildRow: buildMacroVersionRow,
    upsertRow: upsertMacroRow,
  },
  cmdline_param: {
    payloadField: CMDLINE_PARAM_PAYLOAD_FIELD,
    versionsTable: 'cmdline_param_versions',
    isSourceBacked: cmdlineIsSourceBacked,
    buildRow: buildCmdlineParamVersionRow,
    upsertRow: upsertCmdlineParamRow,
  },
};

export function loadVersion(options: LoadVersionOptions): LoadVersionResult {
  const adapter = ADAPTERS[options.type];
  if (!adapter) {
    throw new Error(`Unknown entity type: ${options.type}`);
  }

  const extractorRunId = ulid();
  const now = new Date().toISOString();

  const raw = readFileSync(options.jsonPath, 'utf-8');
  const payload = JSON.parse(raw) as Record<string, unknown>;
  const entries = (payload as any)[adapter.payloadField] as Record<string, any> | undefined;
  if (!entries || typeof entries !== 'object') {
    throw new Error(
      `Extractor JSON at ${options.jsonPath} has no "${adapter.payloadField}" field for type=${options.type}`
    );
  }

  const entryCount = Object.keys(entries).length;

  // Drop-guard: bound against the same (project, version, type) only. Keying
  // on the per-type versions table keeps the guard isolated -- loading
  // commands doesn't compare row counts against cvar rows.
  const priorRowCount = options.db.prepare(`
    SELECT COUNT(*) AS n FROM ${adapter.versionsTable} cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND e.type = ? AND cv.version = ?
  `).get(options.project, options.type, options.version) as { n: number };

  if (priorRowCount.n > 0 && entryCount === 0 && !options.forceOverwrite) {
    throw new Error(
      `Regression: prior run populated ${priorRowCount.n} rows for ${options.project}:${options.type}@${options.version}, ` +
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

    for (const [nameRaw, entry] of Object.entries(entries)) {
      const name = nameRaw.toLowerCase();
      // Widened vs cvar-only regex so commands (+attack, -attack) and cmdline
      // params (-basedir) pass. '?'-prefixed entries are diagnostic display
      // names from the cmdline extractor for undeclared enum constants --
      // skip them explicitly rather than pollute the DB.
      if (!/^[a-z0-9_.+\-]+$/.test(name)) {
        console.warn(`[load-version] skipping entity with invalid name: ${nameRaw}`);
        continue;
      }

      const sourceBacked = adapter.isSourceBacked(entry);
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

      adapter.upsertRow(
        options.db,
        adapter.buildRow(upsertResult.id, options.version, entry, now),
      );
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
