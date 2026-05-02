// apps/qw-oracle/scripts/load-knowledge/load-version.ts
//
// Stage 1 orchestrator: ingest one (project, version, type) triple into the
// knowledge DB. Per-type logic lives in load-{cvars,commands,macros,cmdline-params}.ts;
// this file owns the shared scaffolding (version upsert, entity upsert,
// transitions, oracle_meta bookkeeping, partial-drop guard).

import { readFileSync } from 'fs';
import type postgres from 'postgres';
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
import {
  CVAR_ALIAS_PAYLOAD_FIELD,
  buildCvarAliasVersionRow,
  cvarAliasIsSourceBacked,
  upsertCvarAliasRow,
} from './load-cvar-aliases.js';
import {
  PROTOCOL_MESSAGE_PAYLOAD_FIELD,
  buildProtocolMessageVersionRow,
  protocolMessageIsSourceBacked,
  upsertProtocolMessageRow,
} from './load-protocol-messages.js';
import {
  INFO_KEY_PAYLOAD_FIELD,
  buildInfoKeyVersionRow,
  infoKeyIsSourceBacked,
  upsertInfoKeyRow,
} from './load-info-keys.js';
import {
  LOG_TEMPLATE_PAYLOAD_FIELD,
  buildLogTemplateVersionRow,
  logTemplateIsSourceBacked,
  upsertLogTemplateRow,
} from './load-log-templates.js';
import {
  QC_BUILTIN_PAYLOAD_FIELD,
  buildQcBuiltinVersionRow,
  qcBuiltinIsSourceBacked,
  upsertQcBuiltinRow,
} from './load-qc-builtins.js';
import { pruneCrossTypeOrphans } from './prune-cross-type-orphans.js';
import { deriveEntityDescriptionsForVersion } from './derive-entity-description.js';
import { INFO_KEY_SCOPES, LOG_TEMPLATE_CHANNELS } from './constants.js';
import type {
  EntityType,
  Project,
  SourceOverrideRow,
  SourceState,
} from './types.js';

const INFO_KEY_NAME_RE = new RegExp(
  `^\\*?[a-z0-9_.+\\-]+:(${INFO_KEY_SCOPES.join('|')})$`
);
const LOG_TEMPLATE_NAME_RE = new RegExp(
  `^(${LOG_TEMPLATE_CHANNELS.join('|')}):`,
  'i'
);

export interface LoadVersionOptions {
  sql: postgres.Sql;
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
  // Skip the cross-type help-JSON orphan prune at end of this load. Use
  // during deep-time walks to avoid the partial-state artifact where an
  // entity is doc_only at newer tags but source-defined at not-yet-loaded
  // older tags. Run pruneCrossTypeOrphansAllTypes once at end of walk.
  skipPrune?: boolean;
}

export interface LoadVersionResult {
  extractorRunId: string;
  entitiesUpserted: number;
  versionsUpserted: number;
  transitionsLogged: number;
  // Rows in the per-type versions table for this (project, type, version)
  // after the load completes. Equals `entitiesUpserted - typeMismatchOrphansPruned`
  // for steady-state runs; the post-load SQL count is authoritative because
  // the prune can also touch entities from other versions.
  entityCount: number;
  parseState: 'ok' | 'partial';
  typeMismatchOrphansPruned: number;
}

const PARTIAL_DROP_GUARD_RATIO = 0.5;

// Per-type adapter interface. Each type supplies:
//   - the field name under which entries live in the extractor JSON
//   - which table the loader should count against for the drop-guard
//   - an is-source-backed predicate for the initial source_state decision
//   - a row builder + (async) upsert call
interface TypeAdapter {
  payloadField: string;
  versionsTable: string;
  isSourceBacked: (entry: any) => boolean;
  buildRow: (entityId: number, version: string, entry: any, now: string) => any;
  upsertRow: (tx: postgres.TransactionSql<{}>, row: any) => Promise<void>;
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
  cvar_alias: {
    payloadField: CVAR_ALIAS_PAYLOAD_FIELD,
    versionsTable: 'cvar_alias_versions',
    isSourceBacked: cvarAliasIsSourceBacked,
    buildRow: buildCvarAliasVersionRow,
    upsertRow: upsertCvarAliasRow,
  },
  protocol_message: {
    payloadField: PROTOCOL_MESSAGE_PAYLOAD_FIELD,
    versionsTable: 'protocol_message_versions',
    isSourceBacked: protocolMessageIsSourceBacked,
    buildRow: buildProtocolMessageVersionRow,
    upsertRow: upsertProtocolMessageRow,
  },
  info_key: {
    payloadField: INFO_KEY_PAYLOAD_FIELD,
    versionsTable: 'info_key_versions',
    isSourceBacked: infoKeyIsSourceBacked,
    buildRow: buildInfoKeyVersionRow,
    upsertRow: upsertInfoKeyRow,
  },
  log_template: {
    payloadField: LOG_TEMPLATE_PAYLOAD_FIELD,
    versionsTable: 'log_template_versions',
    isSourceBacked: logTemplateIsSourceBacked,
    buildRow: buildLogTemplateVersionRow,
    upsertRow: upsertLogTemplateRow,
  },
  qc_builtin: {
    payloadField: QC_BUILTIN_PAYLOAD_FIELD,
    versionsTable: 'qc_builtin_versions',
    isSourceBacked: qcBuiltinIsSourceBacked,
    buildRow: buildQcBuiltinVersionRow,
    upsertRow: upsertQcBuiltinRow,
  },
};

export async function loadVersion(options: LoadVersionOptions): Promise<LoadVersionResult> {
  const adapter = ADAPTERS[options.type];
  if (!adapter) {
    throw new Error(`Unknown entity type: ${options.type}`);
  }

  const extractorRunId = ulid();
  const now = new Date().toISOString();

  const raw = readFileSync(options.jsonPath, 'utf-8');
  // Postgres TEXT/JSONB reject the U+0000 NUL byte; SQLite accepted it. Some
  // upstream sources (FTE C string literals via libclang) leak embedded NULs.
  // Strip them at the JSON-parse boundary so they never reach an upsert.
  const NUL_CHAR = String.fromCharCode(0);
  const stripFn = (v: unknown): unknown => {
    if (typeof v === 'string') return v.includes(NUL_CHAR) ? v.split(NUL_CHAR).join('') : v;
    if (Array.isArray(v)) return v.map(stripFn);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = stripFn(val);
      return out;
    }
    return v;
  };
  const payload = stripFn(JSON.parse(raw)) as Record<string, unknown>;
  const rawPayload = (payload as any)[adapter.payloadField];
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error(
      `Extractor JSON at ${options.jsonPath} has no "${adapter.payloadField}" field for type=${options.type}`
    );
  }

  // Phase 2e MVDSV: the new-type handlers (protocol_messages, info_keys,
  // log_templates, qc_builtins) emit Array<{name, ast, ...}> instead of the
  // dict-by-name shape used by the older extractors. Normalize to the dict
  // shape the rest of this orchestrator (case-fold merge, key iteration) was
  // built for. The "first wins" rule mirrors finalize() in the Python
  // handlers, which already cross-file dedup before emitting.
  let rawEntries: Record<string, any>;
  if (Array.isArray(rawPayload)) {
    rawEntries = {};
    for (const item of rawPayload) {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string') {
        throw new Error(
          `Extractor JSON at ${options.jsonPath}: array element under "${adapter.payloadField}" missing string "name" field`,
        );
      }
      if (rawEntries[item.name] === undefined) {
        rawEntries[item.name] = item;
      } else {
        // Belt-and-braces (Phase B 2026-04-28): future cross-X dups in any
        // entity type should not disappear silently. With the info_key
        // `<bare>:<scope>` suffixing in place, this branch should not fire
        // for info_key today; if it does for any type, the canonical name
        // emitted by the handler isn't carrying enough discriminator.
        console.warn(
          `[load-version] dropped duplicate name "${item.name}" in ${options.type} payload -- ` +
          `cross-scope or cross-shape collision; canonical name should include scope/shape suffix`,
        );
      }
    }
  } else {
    rawEntries = rawPayload as Record<string, any>;
  }

  // Case-fold merge (see caseFoldMergeEntries header for rationale).
  const entries = (options.type === 'token_primitive')
    ? rawEntries
    : caseFoldMergeEntries(rawEntries);

  const entryCount = Object.keys(entries).length;
  const sql = options.sql;

  // Drop-guard pre-checks: read-only against pre-load DB state. If they
  // throw, we abort before opening any txn.
  const priorRowCountRows = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM ${sql(adapter.versionsTable)} cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ${options.project} AND e.type = ${options.type} AND cv.version = ${options.version}
  `;
  const priorRowCount = priorRowCountRows[0]!.n;

  if (priorRowCount > 0 && entryCount === 0 && !options.forceOverwrite) {
    throw new Error(
      `Regression: prior run populated ${priorRowCount} rows for ${options.project}:${options.type}@${options.version}, ` +
      `current JSON has zero. Aborting. Use --force to override.`
    );
  }

  let parseStateFinal: 'ok' | 'partial' = options.parseState ?? 'ok';
  if (priorRowCount > 0 && entryCount < priorRowCount * PARTIAL_DROP_GUARD_RATIO) {
    if (!options.forceOverwrite) {
      throw new Error(
        `Entity count dropped from ${priorRowCount} to ${entryCount} ` +
        `(>${(1 - PARTIAL_DROP_GUARD_RATIO) * 100}% drop). Aborting without --force.`
      );
    }
    parseStateFinal = 'partial';
    console.warn(
      `[load-version] entity count drop from ${priorRowCount} to ${entryCount}; ` +
      `marking version.parse_state='partial'.`
    );
  }

  // Stale-row cleanup: existing per-version rows whose entity name is NOT
  // in the incoming JSON. Catches the legacy-extractor-stale-JSON bug where
  // a prior load (e.g., pre-fix extract-tag pre-2026-04-23) inserted rows
  // for entities that don't actually exist at this version. Done before the
  // txn opens so the orphan-set is computed once on the pre-load DB state.
  const incomingNames = new Set<string>();
  for (const nameRaw of Object.keys(entries)) {
    const canonical = options.type === 'token_primitive' ? nameRaw : nameRaw.toLowerCase();
    incomingNames.add(canonical);
  }
  const existingVersionRows = await sql<{ entity_id: number; name: string }[]>`
    SELECT cv.entity_id, e.name FROM ${sql(adapter.versionsTable)} cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ${options.project} AND e.type = ${options.type} AND cv.version = ${options.version}
  `;
  const staleVersionRows = existingVersionRows.filter(r => !incomingNames.has(r.name));
  if (staleVersionRows.length > 0 && existingVersionRows.length > 0) {
    const staleRatio = staleVersionRows.length / existingVersionRows.length;
    if (staleRatio > 1 - PARTIAL_DROP_GUARD_RATIO && !options.forceOverwrite) {
      throw new Error(
        `Stale-row cleanup would delete ${staleVersionRows.length}/${existingVersionRows.length} ` +
        `${options.type} rows (${(staleRatio * 100).toFixed(0)}%) at ${options.project}@${options.version}. ` +
        `Use --force to override.`
      );
    }
  }

  const result = await sql.begin(async (tx) => {
    await upsertVersion(tx, {
      project: options.project,
      version: options.version,
      commit_sha: options.commitSha,
      tag_date: options.tagDate,
      ordinal: options.ordinal,
      parse_state: parseStateFinal,
      notes: options.notes ?? null,
      extracted_at: now,
    });

    if (staleVersionRows.length > 0) {
      const staleIds = staleVersionRows.map(r => Number(r.entity_id));
      await tx`
        DELETE FROM ${tx(adapter.versionsTable)}
        WHERE entity_id = ANY(${staleIds}::bigint[]) AND version = ${options.version}
      `;
      console.log(
        `[load-version] cleaned up ${staleVersionRows.length} stale ${options.type} version rows ` +
        `at ${options.project}@${options.version}`,
      );
    }

    let upserted = 0;
    let transitions = 0;

    for (const [nameRaw, entry] of Object.entries(entries)) {
      // Token primitive names ($G vs $g mean different byte values) must
      // preserve case. All other types use case-insensitive canonical keys.
      const name = options.type === 'token_primitive' ? nameRaw : nameRaw.toLowerCase();
      const validTokenPrimitive = options.type === 'token_primitive' && /^\$.+$/.test(nameRaw);
      const validIdentifier = /^[a-z0-9_.+\-]+$/.test(name);
      const validInfoKey = options.type === 'info_key' && INFO_KEY_NAME_RE.test(name);
      const validLogTemplate = options.type === 'log_template' && LOG_TEMPLATE_NAME_RE.test(name);
      const validQcBuiltin = options.type === 'qc_builtin' && /^[a-z0-9_.+\-]+:(std_builtins|ext_builtins|ext_syscalls)$/.test(name);
      if (!validTokenPrimitive && !validIdentifier && !validInfoKey && !validLogTemplate && !validQcBuiltin) {
        console.warn(`[load-version] skipping entity with invalid name: ${nameRaw}`);
        continue;
      }

      const sourceBacked = adapter.isSourceBacked(entry);
      const initialSourceState: SourceState = sourceBacked ? 'source_backed' : 'doc_only';

      const upsertResult = await upsertEntity(tx, {
        project: options.project,
        type: options.type,
        name,
        first_seen_version: options.version,
        last_seen_version: options.version,
        source_state: initialSourceState,
      });

      if (upsertResult.isNew) {
        await logTransition(tx, {
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
        const ordRows = await tx<{ cur_ord: number; new_ord: number }[]>`
          SELECT vCur.ordinal AS cur_ord, vNew.ordinal AS new_ord
          FROM entities e
          JOIN versions vCur ON vCur.project = e.project AND vCur.version = e.first_seen_version
          JOIN versions vNew ON vNew.project = e.project AND vNew.version = ${options.version}
          WHERE e.id = ${upsertResult.id}
        `;
        if (ordRows.length > 0 && ordRows[0]!.new_ord < ordRows[0]!.cur_ord) {
          await extendFirstSeenVersion(tx, upsertResult.id, options.version);
        }

        if (upsertResult.prevSourceState === 'doc_only' && sourceBacked) {
          await setEntitySourceState(tx, upsertResult.id, 'source_backed');
          await logTransition(tx, {
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

      await adapter.upsertRow(
        tx,
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
          await upsertSourceOverride(tx, ov);
        }
      }

      upserted += 1;
    }

    // Cross-type help-JSON orphan cleanup, scoped to this load's type. See
    // prune-cross-type-orphans.ts for the rationale and the order-sensitivity
    // caveat. Skipped during deep-time walks (see options.skipPrune); a final
    // pruneCrossTypeOrphansAllTypes call at end of walk reconciles state.
    let orphansPrunedCount = 0;
    if (!options.skipPrune) {
      const pruneResult = await pruneCrossTypeOrphans({
        tx,
        project: options.project,
        type: options.type,
      });
      orphansPrunedCount = pruneResult.pruned;
    }

    if (orphansPrunedCount > 0) {
      console.log(
        `[load-version] pruned ${orphansPrunedCount} ${options.type} help-JSON orphan(s) ` +
        `(cross-type source_backed counterpart exists for ${options.project})`,
      );
    }

    // Per-version state-transition detection. Walk each source_backed
    // entity's version rows ordered by ordinal and watch for citation flips:
    //   - non-null -> null  : source_retired_at_version
    //   - null -> non-null  : backfill_match
    // Idempotent on (entity_id, reason, version_context). asset_category
    // skipped because its versions table has no source_file column.
    if (options.type !== 'asset_category') {
      const transitionScan = await tx<Array<{
        entity_id: number;
        entity_name: string;
        ordinal: number;
        version: string;
        source_file: string | null;
      }>>`
        SELECT e.id AS entity_id, e.name AS entity_name, v.ordinal,
               vrow.version, vrow.source_file
        FROM entities e
        JOIN ${tx(adapter.versionsTable)} vrow ON vrow.entity_id = e.id
        JOIN versions v ON v.project = e.project AND v.version = vrow.version
        WHERE e.project = ${options.project} AND e.type = ${options.type} AND e.source_state = 'source_backed'
        ORDER BY e.id, v.ordinal
      `;

      let retirementsLogged = 0;
      let backfillsLogged = 0;
      let currentEntityId: number | null = null;
      let prevHadCitation = false;
      let hasSeenRow = false;
      for (const row of transitionScan) {
        if (Number(row.entity_id) !== currentEntityId) {
          currentEntityId = Number(row.entity_id);
          prevHadCitation = false;
          hasSeenRow = false;
        }
        const hasCitation = row.source_file != null;
        if (hasSeenRow && prevHadCitation && !hasCitation) {
          const exists = await tx<{ one: number }[]>`
            SELECT 1 AS one FROM source_state_transitions
            WHERE entity_id = ${Number(row.entity_id)} AND reason = 'source_retired_at_version' AND version_context = ${row.version}
            LIMIT 1
          `;
          if (exists.length === 0) {
            await logTransition(tx, {
              entity_id: Number(row.entity_id),
              from_state: 'source_backed',
              to_state: 'source_retired',
              reason: 'source_retired_at_version',
              version_context: row.version,
              extractor_run_id: extractorRunId,
            });
            retirementsLogged += 1;
          }
        } else if (hasSeenRow && !prevHadCitation && hasCitation) {
          const exists = await tx<{ one: number }[]>`
            SELECT 1 AS one FROM source_state_transitions
            WHERE entity_id = ${Number(row.entity_id)} AND reason = 'backfill_match' AND version_context = ${row.version}
            LIMIT 1
          `;
          if (exists.length === 0) {
            await logTransition(tx, {
              entity_id: Number(row.entity_id),
              from_state: 'doc_only',
              to_state: 'source_backed',
              reason: 'backfill_match',
              version_context: row.version,
              extractor_run_id: extractorRunId,
            });
            backfillsLogged += 1;
          }
        }
        prevHadCitation = hasCitation;
        hasSeenRow = true;
      }

      if (retirementsLogged > 0) {
        console.log(
          `[load-version] logged ${retirementsLogged} ${options.type} source_retired_at_version transition(s)`,
        );
      }
      if (backfillsLogged > 0) {
        console.log(
          `[load-version] logged ${backfillsLogged} ${options.type} backfill_match transition(s)`,
        );
      }
    }

    // oracle_meta is the Postgres-side replacement for SQLite's schema_meta
    // (per Phase 1 migration 001). Same (key, value) shape; updated_at moves
    // forward on every upsert so timestamps survive.
    const setMetaPairs: Array<[string, string]> = [
      ['last_extraction_run_at', now],
      ['extractor_version', options.extractorVersion],
      [`${options.project}:source_repo_commit`, options.commitSha],
      [`${options.project}:source_repo_tag`, options.tagDate ? options.version : ''],
    ];
    for (const [key, value] of setMetaPairs) {
      await tx`
        INSERT INTO oracle_meta (key, value, updated_at)
        VALUES (${key}, ${value}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
    }

    // D6 / F7: derive entities.description for the just-loaded version. Runs
    // inside the txn so a roll-back leaves description in sync with the
    // per-version rows it was derived from.
    await deriveEntityDescriptionsForVersion(tx, options.project, options.type, options.version);

    // Post-load row count for this (project, type, version). Reflects the
    // actual DB state after upserts and cross-type orphan prune.
    const dbCountRows = await tx<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM ${tx(adapter.versionsTable)} cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = ${options.project} AND e.type = ${options.type} AND cv.version = ${options.version}
    `;

    return {
      upserted,
      transitions,
      orphansPruned: orphansPrunedCount,
      dbEntityCount: dbCountRows[0]!.n,
    };
  });

  return {
    extractorRunId,
    entitiesUpserted: result.upserted,
    versionsUpserted: 1,
    transitionsLogged: result.transitions,
    entityCount: result.dbEntityCount,
    parseState: parseStateFinal,
    typeMismatchOrphansPruned: result.orphansPruned,
  };
}

// Recursively strip U+0000 NUL bytes from any string in a parsed-JSON tree.
// Postgres TEXT and JSONB reject NULs; SQLite accepted them silently. The
// strip is idempotent and lossless for any string that does not actually
// contain a NUL.
function stripNulBytes(v: unknown): unknown {
  if (typeof v === 'string') {
    return v.includes(' ') ? v.replace(/ /g, '') : v;
  }
  if (Array.isArray(v)) return v.map(stripNulBytes);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = stripNulBytes(val);
    return out;
  }
  return v;
}

// Group dict entries by their lowercase key and merge case-variants. The two
// real-world flavours: AST-bearing source-truth name (e.g. `loadFragfile`,
// `HUD262_add`) carrying source_file/source_line but empty desc; lowercased
// help-JSON name carrying desc but no AST. Without this merge they collide
// at the case-folding step downstream and the help-JSON entry blanks the
// citation. Strategy: pick the AST-bearing variant as base, fold help-text
// fields from any sibling that has them; if multiple variants both carry
// AST, keep the first and log a warning (would indicate a genuine source
// conflict, not the AST-vs-help case-collision pattern).
function caseFoldMergeEntries(
  raw: Record<string, any>,
): Record<string, any> {
  const groups = new Map<string, Array<[string, any]>>();
  for (const [k, v] of Object.entries(raw)) {
    const lc = k.toLowerCase();
    const list = groups.get(lc);
    if (list) list.push([k, v]);
    else groups.set(lc, [[k, v]]);
  }

  const merged: Record<string, any> = {};
  for (const [lc, variants] of groups.entries()) {
    const first = variants[0]!;
    if (variants.length === 1) {
      merged[lc] = first[1];
      continue;
    }
    const astBearing = variants.filter(([, v]) => v && v.ast != null);
    if (astBearing.length > 1) {
      const names = astBearing.map(([k]) => k).join(', ');
      console.warn(
        `[load-version] case-fold merge: multiple variants carry ast for "${lc}" (${names}); keeping first`,
      );
    }
    const base = astBearing.length > 0 ? astBearing[0]![1] : first[1];
    const out: Record<string, any> = { ...base };
    for (const [, v] of variants) {
      if (v === base) continue;
      for (const [field, val] of Object.entries(v)) {
        if (val == null || val === '') continue;
        if (out[field] == null || out[field] === '') out[field] = val;
      }
    }
    merged[lc] = out;
  }
  return merged;
}
