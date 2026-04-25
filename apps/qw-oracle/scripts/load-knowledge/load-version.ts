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
  upsertSourceOverride,
  upsertVersion,
} from './natural-keys.js';
import { logTransition } from './transitions.js';
import {
  CVAR_PAYLOAD_FIELD,
  buildCvarOverrides,
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
import {
  KEYNAME_PAYLOAD_FIELD,
  buildKeynameVersionRow,
  keynameIsSourceBacked,
  upsertKeynameRow,
} from './load-keynames.js';
import {
  HUD_ELEMENT_PAYLOAD_FIELD,
  buildHudElementOverrides,
  buildHudElementVersionRow,
  hudElementIsSourceBacked,
  upsertHudElementRow,
} from './load-hud-elements.js';
import {
  RULESET_PAYLOAD_FIELD,
  buildRulesetOverrides,
  buildRulesetVersionRow,
  rulesetIsSourceBacked,
  upsertRulesetRow,
} from './load-rulesets.js';
import {
  TOKEN_PRIMITIVE_PAYLOAD_FIELD,
  buildTokenPrimitiveVersionRow,
  tokenPrimitiveIsSourceBacked,
  upsertTokenPrimitiveRow,
} from './load-token-primitives.js';
import {
  ASSET_CATEGORY_PAYLOAD_FIELD,
  assetCategoryIsSourceBacked,
  buildAssetCategoryVersionRow,
  upsertAssetCategoryRow,
} from './load-asset-categories.js';
import {
  FLAG_BIT_PAYLOAD_FIELD,
  buildFlagBitVersionRow,
  flagBitIsSourceBacked,
  upsertFlagBitRow,
} from './load-flag-bits.js';
import type {
  EntityType,
  Project,
  SourceOverrideRow,
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
  typeMismatchOrphansPruned: number;
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
  buildOverrides?: (
    entityId: number,
    version: string,
    entry: any,
    now: string,
    payload: any,
    nameLowered: string,
  ) => SourceOverrideRow[];
}

const ADAPTERS: Record<EntityType, TypeAdapter> = {
  cvar: {
    payloadField: CVAR_PAYLOAD_FIELD,
    versionsTable: 'cvar_versions',
    isSourceBacked: cvarIsSourceBacked,
    buildRow: buildCvarVersionRow,
    upsertRow: upsertCvarRow,
    buildOverrides: buildCvarOverrides,
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
  keyname: {
    payloadField: KEYNAME_PAYLOAD_FIELD,
    versionsTable: 'keyname_versions',
    isSourceBacked: keynameIsSourceBacked,
    buildRow: buildKeynameVersionRow,
    upsertRow: upsertKeynameRow,
  },
  hud_element: {
    payloadField: HUD_ELEMENT_PAYLOAD_FIELD,
    versionsTable: 'hud_element_versions',
    isSourceBacked: hudElementIsSourceBacked,
    buildRow: buildHudElementVersionRow,
    upsertRow: upsertHudElementRow,
    buildOverrides: buildHudElementOverrides,
  },
  ruleset: {
    payloadField: RULESET_PAYLOAD_FIELD,
    versionsTable: 'ruleset_versions',
    isSourceBacked: rulesetIsSourceBacked,
    buildRow: buildRulesetVersionRow,
    upsertRow: upsertRulesetRow,
    buildOverrides: buildRulesetOverrides,
  },
  token_primitive: {
    payloadField: TOKEN_PRIMITIVE_PAYLOAD_FIELD,
    versionsTable: 'token_primitive_versions',
    isSourceBacked: tokenPrimitiveIsSourceBacked,
    buildRow: buildTokenPrimitiveVersionRow,
    upsertRow: upsertTokenPrimitiveRow,
  },
  asset_category: {
    payloadField: ASSET_CATEGORY_PAYLOAD_FIELD,
    versionsTable: 'asset_category_versions',
    isSourceBacked: assetCategoryIsSourceBacked,
    buildRow: buildAssetCategoryVersionRow,
    upsertRow: upsertAssetCategoryRow,
  },
  flag_bit: {
    payloadField: FLAG_BIT_PAYLOAD_FIELD,
    versionsTable: 'flag_bit_versions',
    isSourceBacked: flagBitIsSourceBacked,
    buildRow: buildFlagBitVersionRow,
    upsertRow: upsertFlagBitRow,
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
      // Token primitive names ($G vs $g mean different byte values) must
      // preserve case. All other types use case-insensitive canonical keys.
      const name = options.type === 'token_primitive' ? nameRaw : nameRaw.toLowerCase();
      // Widened regex: commands/cmdline params can start with +, -; token
      // primitive names start with $ and carry a single suffix char (which
      // may be any printable glyph including punctuation -- '\', '(', etc.).
      // For non-token-primitive types we still require the stricter identifier
      // charset.
      const validTokenPrimitive = options.type === 'token_primitive' && /^\$.+$/.test(nameRaw);
      const validIdentifier = /^[a-z0-9_.+\-]+$/.test(name);
      if (!validTokenPrimitive && !validIdentifier) {
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
      } else {
        // Existing entity. Two independent concerns: extend first_seen
        // backwards if this version pre-dates the recorded earliest, and
        // record a doc_only -> source_backed transition when the extractor
        // newly catches what was previously help-JSON-only. Both must run
        // regardless of order; either can fire without the other.
        //
        // Ordinal comparison via the versions table -- '<' on version
        // strings breaks on multi-tag orderings like '3.10.0' vs '3.6.6'.
        const ordCheck = options.db.prepare(`
          SELECT vCur.ordinal AS cur_ord, vNew.ordinal AS new_ord
          FROM entities e
          JOIN versions vCur ON vCur.project = e.project AND vCur.version = e.first_seen_version
          JOIN versions vNew ON vNew.project = e.project AND vNew.version = ?
          WHERE e.id = ?
        `).get(options.version, upsertResult.id) as
          | { cur_ord: number; new_ord: number }
          | undefined;
        if (ordCheck && ordCheck.new_ord < ordCheck.cur_ord) {
          extendFirstSeenVersion(options.db, upsertResult.id, options.version);
        }

        if (upsertResult.prevSourceState === 'doc_only' && sourceBacked) {
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
        }
      }

      adapter.upsertRow(
        options.db,
        adapter.buildRow(upsertResult.id, options.version, entry, now),
      );

      if (adapter.buildOverrides) {
        const overrides = adapter.buildOverrides(
          upsertResult.id,
          options.version,
          entry,
          now,
          payload,
          name,
        );
        for (const ov of overrides) {
          upsertSourceOverride(options.db, ov);
        }
      }

      upserted += 1;
    }

    // Cross-type help-JSON orphan cleanup. Help-JSON files occasionally label
    // a name under the wrong entity type (e.g. `radar` is registered via
    // HUD_Register so it lands as `hud_element source_backed`, but
    // help_commands.json ALSO lists `radar` → commands extractor emits it with
    // ast=null → loader creates `command doc_only`). The loader-side check:
    // if a doc_only entity of the current type has a same-name, same-project
    // source_backed counterpart under any OTHER type, the current row is a
    // help-JSON labeling artifact and should be pruned. Delete from the
    // per-type versions table, transitions, overrides, and entities. Runs
    // per-type so each load-version invocation cleans up only the orphans it
    // would otherwise produce, and re-running the loader is idempotent.
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

    if (orphanRows.length > 0) {
      const deleteVersions = options.db.prepare(
        `DELETE FROM ${adapter.versionsTable} WHERE entity_id = ?`,
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
      console.log(
        `[load-version] pruned ${orphanRows.length} ${options.type} help-JSON orphan(s) ` +
        `(cross-type source_backed counterpart exists for ${options.project})`,
      );
    }

    const setMeta = options.db.prepare(`
      INSERT INTO schema_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    setMeta.run('last_extraction_run_at', now);
    setMeta.run('extractor_version', options.extractorVersion);
    setMeta.run(`${options.project}:source_repo_commit`, options.commitSha);
    setMeta.run(`${options.project}:source_repo_tag`, options.tagDate ? options.version : '');

    return { upserted, transitions, orphansPruned: orphanRows.length };
  });

  const { upserted, transitions, orphansPruned } = txn();

  return {
    extractorRunId,
    entitiesUpserted: upserted,
    versionsUpserted: 1,
    transitionsLogged: transitions,
    entityCount: entryCount,
    parseState: parseStateFinal,
    typeMismatchOrphansPruned: orphansPruned,
  };
}
