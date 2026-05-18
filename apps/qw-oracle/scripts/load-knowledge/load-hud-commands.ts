// apps/qw-oracle/scripts/load-knowledge/load-hud-commands.ts
//
// Track-B adapter (enforce-L1-runtime-truth Phase 3). Loads the recovered
// HUD commands from the 9th extractor file `ezquake-hud-commands-ast.json`
// (written by _handler_hud.py) as FIRST-CLASS command entities, each
// carrying the locked track_b_hud_recovery spine on its command_versions
// row.
//
// WHY a quartet that mirrors load-commands.ts (not a build*VersionRow added
// to the existing command adapter): these commands are recovered from a
// STATICALLY-MODELED HUD-registration pattern the regular commands handler
// does not emit. They are real, runtime-registered ezQuake commands
// (D20/D21) and must exist as entities.type='command' with
// source_state='source_backed' (D21 -- NOT 'dynamically_registered'; a
// second distinguisher would contradict "distinguished ONLY by the
// Track-B field"). The Track-B field IS the only thing that marks them as
// HUD-recovered.
//
// COMMANDS ONLY (R7): this adapter MUST NOT build any cvar row, import
// _handler_cvars, or emit anything of type='cvar'. A duplicate cvar
// emitter would collide with _handler_cvars on
// entities UNIQUE(project, type, name_fold).
//
// Idempotent: keyed by (project, type, name_fold) at the entity level and
// (entity_id, version) at the row level. Re-running upserts in place. This
// IS the loader's own idempotent write path (X9) -- NOT an in-place
// repair.
//
// Wiring: invoked as a project-scoped post-loop special call from
// extract-tag.ts (3e), AFTER the EntityType dispatch loop and BEFORE the
// Track-A overlay. Mirrors the 3b/3c KTX-modes/taxonomies precedent: a
// non-standard loader whose data is not EntityType-loop-shaped runs
// outside the loop. The `command` type is loaded in step 3 first, so the
// `versions` row this adapter's command_versions rows reference already
// exists.
//
// JSONB binding (D14 / F1.jsonb_columns_not_strings): track_b_hud_recovery
// is bound via tx.json(...) inside upsertCommandVersion -- never
// JSON.stringify + a TEXT bind. This module passes a JS object; the upsert
// helper owns the tx.json wrap.
//
// STAGE-2 STAMP (enforce-L1-runtime-truth Phase 4 / Task 4):
// loadHudCommandsFromArray/FromFile take an OPTIONAL stamp-set (the SHIPPED
// level3-stamp-set-<pin>.json). When supplied (the caller in extract-tag.ts
// 3e decides this -- gate GREEN + version is the pinned-dump version), for
// each recovered HUD command whose name is in
// stamp_set.track_b_dump_confirmed the row's track_b_hud_recovery.
// dump_confirmation is built as 'dump-confirmed' (level-3); absent-from-
// stamp-set rows keep the level-2 'high-confidence-generalized' (D21 --
// nothing withheld; still a first-class level-2 command). EVERYTHING ELSE
// (the row shape, source_state='source_backed', the upsertCommandVersion
// ON CONFLICT path, the tx.json bind) is UNCHANGED. The stamp-set is
// OPTIONAL + defaulted so non-pinned / ungated callers are byte-identical
// to Phase 3 (pure additive).

import { readFileSync } from 'node:fs';
import type postgres from 'postgres';
import { upsertEntity, upsertCommandVersion } from './natural-keys.js';
import type {
  CommandVersionRow,
  HudCommandEntry,
  HudCommandsFile,
  Level3StampSet,
} from './types.js';

// The dict key in the 9th file that holds the recovered commands.
export const HUD_COMMANDS_PAYLOAD_FIELD = 'hud_commands';

export interface LoadHudCommandsResult {
  inserted: number;
  updated: number;
  total: number;
}

// Every emitted Track-B row is a statically-modeled source literal (the
// HUD-registration site is in the AST). There is no doc-only HUD command,
// so source-backed is unconditional (D21). Kept as a named predicate to
// mirror the load-commands.ts quartet shape (commandIsSourceBacked).
export function hudCommandIsSourceBacked(_entry: HudCommandEntry): boolean {
  return true;
}

// Build a command_versions row for one recovered HUD command, carrying the
// locked Track-B spine. Transform (f)-(l):
//   (f) conclusion: hud_family 'bare' -> 'bare-command';
//                    'plus'|'minus'    -> 'plus-minus-pair'.
//   (g) evidence.hud_element     = entry.hud_element
//   (h) evidence.hud_family      = entry.hud_family
//   (i) evidence.registration_api= entry.ast.registration_api
//   (j) evidence.handler_fn      = entry.ast.handler_fn
//   (k) evidence.site            = {source_file, source_line} from ast
//   (l) dump_confirmation        = "high-confidence-generalized" (the
//        level-2 default) UNLESS the Task-4 stage-2 stamp confirms this
//        command name (dumpConfirmed=true) -> "dump-confirmed" (level-3,
//        D19). CARRY-FORWARD 1: slot-3 is the ONLY field the stamp may
//        change; conclusion + evidence are built identically either way.
// The base command_versions columns map from entry.ast
// (handler_fn/source_file/source_line/source_column);
// registration_file = entry.ast.enclosing_function; help_* are null
// (these commands have no help-JSON envelope). track_a_reachability is
// null here -- the Track-A overlay owns that column via its own upsert.
export function buildHudCommandVersionRow(
  entityId: number,
  version: string,
  entry: HudCommandEntry,
  now: string,
  // Task-4 stage-2: true IFF this command name is in the proxy=PASS
  // stamp-set's track_b_dump_confirmed list. Defaults false -> Phase-3
  // level-2 behaviour exactly (every ungated / non-pinned caller).
  dumpConfirmed = false,
): CommandVersionRow {
  const ast = entry.ast;
  const conclusion =
    entry.hud_family === 'bare' ? 'bare-command' : 'plus-minus-pair';

  const trackB = {
    conclusion,
    evidence: {
      hud_element: entry.hud_element,
      hud_family: entry.hud_family,
      registration_api: ast.registration_api,
      handler_fn: ast.handler_fn,
      site: {
        source_file: ast.source_file,
        source_line: ast.source_line,
      },
    },
    // Slot-3-ONLY: level-3 when the runtime dump confirmed the name,
    // else the level-2 default. conclusion + evidence above are identical
    // in both branches (CARRY-FORWARD 1).
    dump_confirmation: dumpConfirmed
      ? 'dump-confirmed'
      : 'high-confidence-generalized',
  };

  return {
    entity_id: entityId,
    version,
    help_desc: null,
    help_remarks: null,
    help_group_id: null,
    handler_fn: ast.handler_fn,
    source_file: ast.source_file,
    source_line: ast.source_line,
    source_column: ast.source_column,
    registration_file: ast.enclosing_function,
    // These are ezQuake-native commands; NULL source_root = "engine" per
    // SCHEMA.md (mirrors load-commands.ts for ezQuake entries).
    source_root: null,
    // No AST struct hash is meaningful here (the row IS the modeled
    // literal, not a raw libclang AST capture). NULL is consistent with
    // help-only command rows in the regular handler.
    raw_ast_hash: null,
    extracted_at: now,
    // The Track-A overlay owns this column via its own post-pass upsert.
    track_a_reachability: null,
    track_b_hud_recovery: trackB,
  };
}

// Upsert one recovered HUD command: ensure the type='command' entity
// exists (idempotent by project/type/name_fold), then upsert its
// command_versions row (idempotent by entity_id/version). source_state is
// unconditionally 'source_backed' (D21). Mirrors the load-modes.ts
// post-loop pattern -- a lean idempotent upsert, NOT a re-implementation
// of loadVersion's full transition machinery (the per-type command loader
// in step 3 owns transition logging; double-logging here would be wrong).
export async function upsertHudCommandRow(
  tx: postgres.TransactionSql<{}>,
  version: string,
  name: string,
  entry: HudCommandEntry,
  now: string,
  // Task-4 stage-2: passed straight to buildHudCommandVersionRow. Defaults
  // false -> Phase-3 level-2 (every ungated / non-pinned caller).
  dumpConfirmed = false,
): Promise<{ wasExisting: boolean }> {
  const upsertResult = await upsertEntity(tx, {
    project: 'ezquake',
    type: 'command',
    name,
    first_seen_version: version,
    last_seen_version: version,
    source_state: 'source_backed',
  });
  const row = buildHudCommandVersionRow(
    upsertResult.id,
    version,
    entry,
    now,
    dumpConfirmed,
  );
  await upsertCommandVersion(tx, row);
  return { wasExisting: !upsertResult.isNew };
}

export async function loadHudCommandsFromArray(
  sql: postgres.Sql,
  version: string,
  ast: HudCommandsFile,
  // OPTIONAL stage-2 stamp-set (enforce-L1 Phase 4 / Task 4). Omitted by
  // every non-pinned / ungated caller -> Phase-3 level-2 behaviour
  // exactly. Supplied by extract-tag.ts 3e ONLY when the validation record
  // is GREEN AND the version is the pinned-dump version.
  stampSet?: Level3StampSet,
): Promise<LoadHudCommandsResult> {
  const commands = ast[HUD_COMMANDS_PAYLOAD_FIELD];
  if (!commands || typeof commands !== 'object') {
    throw new Error(
      `load-hud-commands: extractor JSON has no "${HUD_COMMANDS_PAYLOAD_FIELD}" object`,
    );
  }

  // Dump-confirmed name-set ONLY when proxy=PASS. proxy=FAIL (broken pin /
  // RED mechanism) -> the list is empty by construction (Task-3) AND we
  // refuse to consult it -> null -> nothing stamped (D22/D19 fail-safe).
  const trackBDumpConfirmed: Set<string> | null =
    stampSet && stampSet.proxy === 'PASS'
      ? new Set(stampSet.track_b_dump_confirmed)
      : null;

  const now = new Date().toISOString();
  const result: LoadHudCommandsResult = { inserted: 0, updated: 0, total: 0 };

  await sql.begin(async (tx) => {
    for (const [name, entry] of Object.entries(commands)) {
      // Slot-3-only stamp: true IFF this name is dump-confirmed. false for
      // every name when no stamp-set was supplied -> Phase-3 level-2.
      const dumpConfirmed =
        trackBDumpConfirmed !== null && trackBDumpConfirmed.has(name);
      const { wasExisting } = await upsertHudCommandRow(
        tx,
        version,
        name,
        entry,
        now,
        dumpConfirmed,
      );
      if (wasExisting) result.updated++;
      else result.inserted++;
      result.total++;
    }
  });

  return result;
}

export async function loadHudCommandsFromFile(
  sql: postgres.Sql,
  version: string,
  jsonPath: string,
  // OPTIONAL stage-2 stamp-set -- threaded straight through.
  stampSet?: Level3StampSet,
): Promise<LoadHudCommandsResult> {
  const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as HudCommandsFile;
  return loadHudCommandsFromArray(sql, version, ast, stampSet);
}
