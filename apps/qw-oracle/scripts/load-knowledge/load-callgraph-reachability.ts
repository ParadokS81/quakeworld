// apps/qw-oracle/scripts/load-knowledge/load-callgraph-reachability.ts
//
// Track-A OVERLAY (enforce-L1-runtime-truth Phase 3, OQ-1). Reads the
// additive 10th extractor file `ezquake-callgraph-reachability-ast.json`
// (written by emit_callgraph_signal.py) and stamps each entry's locked
// three-slot spine onto the track_a_reachability JSONB column of the
// EXISTING cvar_versions / command_versions row at the loaded version.
//
// THIS IS AN OVERLAY, NOT AN ADAPTER (X7):
//   - It creates NO entities. The cvar/command entities + their version
//     rows already exist from the per-type loaders (step 3) and -- for
//     recovered HUD commands -- from the Track-B adapter (3e). The overlay
//     runs AFTER both, so every row it stamps already exists.
//   - A signal entry that matches NO existing entity is SKIPPED and
//     COUNTED. It is NEVER created. A non-zero skip count is a LOUD
//     warning (printed), never a silent drop -- it means the signal named
//     an entity the per-type loaders did not produce (a join/name-case
//     mismatch or an entity genuinely out of the loaded pool).
//
// HOW the JSONB gets written (X9 -- loader's own idempotent write, NOT a
// bare in-place UPDATE): the overlay reads the existing row's columns,
// reconstructs a full version-row object from them, injects
// track_a_reachability = the spine, and re-runs the SAME
// upsertCvarVersion / upsertCommandVersion helper the per-type loaders
// use. ON CONFLICT (entity_id, version) DO UPDATE fires (the row exists);
// every base column round-trips identically (read from the DB, written
// back); only track_a_reachability changes. track_b_hud_recovery is read
// back and passed through unchanged (the Track-B value from 3e is
// preserved) -- and the upsert additionally COALESCEs it, so the overlay
// can never wipe Track-B. Re-running re-supplies the spine each time
// (idempotent).
//
// name_fold join (migration 013): entities are matched case-insensitively
// (lower() for everything except token_primitive, which is irrelevant
// here -- only cvar/command). The signal's keys carry the SOURCE-case
// name; the overlay folds with the same rule so the join is exact.
//
// JSONB binding (D14 / F1.jsonb_columns_not_strings): the spine is bound
// via tx.json(...) inside upsertCvarVersion / upsertCommandVersion -- this
// module passes a JS object; the upsert helpers own the tx.json wrap.
// Never JSON.stringify + a TEXT bind.
//
// STAGE-2 STAMP (enforce-L1-runtime-truth Phase 4 / Task 4):
// loadCallgraphReachabilityFromArray/FromFile take an OPTIONAL stamp-set
// (the SHIPPED level3-stamp-set-<pin>.json). When supplied (the gate is
// GREEN + the version is the pinned-dump version -- the caller in
// extract-tag.ts 3f decides this), for each entry whose name is in
// stamp_set.track_a_dump_confirmed the loader flips ONLY the in-memory
// spine.dump_confirmation from 'high-confidence-generalized' (level-2) to
// 'dump-confirmed' (level-3) BEFORE the existing upsert. conclusion +
// evidence are re-emitted VERBATIM from the same 10th-file source (slot-3
// is the ONLY field that differs L2 vs L3 -- CARRY-FORWARD 1). The write
// STILL routes through the SAME stampCvar/stampCommand ->
// upsertCvarVersion/upsertCommandVersion ON CONFLICT path (X9 -- NEVER an
// in-place UPDATE ... SET). The stamp-set is OPTIONAL + defaulted so
// non-pinned / ungated callers are byte-identical to Phase 3 (pure
// additive). The full track_a_reachability blob is re-emitted non-null, so
// the natural-keys.ts COALESCE(EXCLUDED, table) correctly takes EXCLUDED
// (the stamp lands) -- the COALESCE is NOT changed to =EXCLUDED (that would
// reintroduce the Phase-3 cross-writer clobber).

import { readFileSync } from 'node:fs';
import type postgres from 'postgres';
import { upsertCvarVersion, upsertCommandVersion } from './natural-keys.js';
import type {
  CallgraphReachabilityFile,
  CallgraphReachabilitySpine,
  CommandVersionRow,
  CvarVersionRow,
  Level3StampSet,
} from './types.js';

export interface LoadCallgraphReachabilityResult {
  cvarStamped: number;
  commandStamped: number;
  skipped: number;
  skippedNames: string[];
}

// Resolve an entity id by the (project, type, name_fold) natural key.
// Mirrors upsertEntity's fold: lower() for everything we admit here
// (cvar / command are never token_primitive).
async function resolveEntityId(
  tx: postgres.TransactionSql<{}>,
  type: 'cvar' | 'command',
  name: string,
): Promise<number | null> {
  const fold = name.toLowerCase();
  const rows = await tx<{ id: number }[]>`
    SELECT id FROM entities
    WHERE project = 'ezquake' AND type = ${type} AND name_fold = ${fold}
  `;
  return rows.length > 0 ? Number(rows[0]!.id) : null;
}

async function stampCommand(
  tx: postgres.TransactionSql<{}>,
  entityId: number,
  version: string,
  spine: object,
): Promise<boolean> {
  const existing = await tx<Array<Omit<CommandVersionRow, 'entity_id' | 'version'>>>`
    SELECT help_desc, help_remarks, help_group_id, handler_fn, source_file,
           source_line, source_column, registration_file, source_root,
           raw_ast_hash, extracted_at, track_a_reachability, track_b_hud_recovery
    FROM command_versions
    WHERE entity_id = ${entityId} AND version = ${version}
  `;
  if (existing.length === 0) return false;
  const e = existing[0]!;
  // Reconstruct the row from DB state + the new spine, then re-upsert.
  // Base columns round-trip unchanged; track_a is replaced; track_b is
  // carried through (and the upsert COALESCEs it for belt-and-braces).
  const row: CommandVersionRow = {
    entity_id: entityId,
    version,
    help_desc: e.help_desc,
    help_remarks: e.help_remarks,
    help_group_id: e.help_group_id,
    handler_fn: e.handler_fn,
    source_file: e.source_file,
    source_line: e.source_line,
    source_column: e.source_column,
    registration_file: e.registration_file,
    source_root: e.source_root,
    raw_ast_hash: e.raw_ast_hash,
    extracted_at: e.extracted_at,
    track_a_reachability: spine,
    track_b_hud_recovery: e.track_b_hud_recovery,
  };
  await upsertCommandVersion(tx, row);
  return true;
}

async function stampCvar(
  tx: postgres.TransactionSql<{}>,
  entityId: number,
  version: string,
  spine: object,
): Promise<boolean> {
  const existing = await tx<Array<Omit<CvarVersionRow, 'entity_id' | 'version'>>>`
    SELECT help_desc, help_remarks, help_values, help_group_id, help_type,
           default_value, flags_raw, flag_names, on_change, min_bound,
           max_bound, source_file, source_line, source_column, storage_class,
           group_name_in_source, trailing_comment, server_only, source_root,
           raw_ast_hash, extracted_at, track_a_reachability
    FROM cvar_versions
    WHERE entity_id = ${entityId} AND version = ${version}
  `;
  if (existing.length === 0) return false;
  const e = existing[0]!;
  const row: CvarVersionRow = {
    entity_id: entityId,
    version,
    help_desc: e.help_desc,
    help_remarks: e.help_remarks,
    help_values: e.help_values,
    help_group_id: e.help_group_id,
    help_type: e.help_type,
    default_value: e.default_value,
    flags_raw: e.flags_raw,
    flag_names: e.flag_names,
    on_change: e.on_change,
    min_bound: e.min_bound,
    max_bound: e.max_bound,
    source_file: e.source_file,
    source_line: e.source_line,
    source_column: e.source_column,
    storage_class: e.storage_class,
    group_name_in_source: e.group_name_in_source,
    trailing_comment: e.trailing_comment,
    server_only: e.server_only,
    source_root: e.source_root,
    raw_ast_hash: e.raw_ast_hash,
    extracted_at: e.extracted_at,
    track_a_reachability: spine,
  };
  await upsertCvarVersion(tx, row);
  return true;
}

// Apply the Task-4 stage-2 slot-3 stamp to ONE spine.
//
// Returns a spine whose conclusion + evidence are byte-identical to the
// input (re-emitted verbatim -- CARRY-FORWARD 1) and whose
// dump_confirmation is 'dump-confirmed' IFF `name` is in the stamp-set's
// track_a_dump_confirmed list; otherwise the spine is returned UNCHANGED
// (keeps the emit seam's level-2 'high-confidence-generalized'). A new
// object is built (never a mutation of the parsed signal) so re-runs and
// the no-stamp-set path are order-independent. When `dumpConfirmed` is
// empty (proxy FAIL / stage-1 RED -> Task-3 wrote empty lists) NOTHING is
// flipped -- every row stays Phase-3 level-2 (D22 fail-safe-CLOSED).
function applyStageTwoStamp(
  spine: CallgraphReachabilitySpine,
  name: string,
  dumpConfirmed: Set<string> | null,
): CallgraphReachabilitySpine {
  if (dumpConfirmed === null || !dumpConfirmed.has(name)) return spine;
  // Slot-3-ONLY flip: conclusion + evidence pass through by reference
  // (same in-memory values the emit seam produced -- CARRY-FORWARD 1);
  // only dump_confirmation is replaced. The DB JSONB round-trip then shows
  // conclusion + evidence byte-identical to the Phase-3 write.
  return {
    conclusion: spine.conclusion,
    evidence: spine.evidence,
    dump_confirmation: 'dump-confirmed',
  };
}

export async function loadCallgraphReachabilityFromArray(
  sql: postgres.Sql,
  version: string,
  signal: CallgraphReachabilityFile,
  // OPTIONAL stage-2 stamp-set (enforce-L1 Phase 4 / Task 4). When omitted
  // (the default -- every non-pinned / ungated caller) behaviour is
  // byte-identical to Phase 3: NOTHING is flipped, every row stays level-2.
  // The caller (extract-tag.ts 3f) supplies this ONLY when the validation
  // record is GREEN AND the version is the pinned-dump version.
  stampSet?: Level3StampSet,
): Promise<LoadCallgraphReachabilityResult> {
  const entries = signal.entries;
  if (!entries || typeof entries !== 'object') {
    throw new Error(
      'load-callgraph-reachability: signal file has no "entries" object',
    );
  }

  // Build the dump-confirmed name-set ONLY when the caller passed a
  // proxy=PASS stamp-set. proxy=FAIL (broken pin / RED mechanism) -> the
  // confirmed list is empty by construction (Task-3) AND we additionally
  // refuse to consult it -> null -> nothing stamped (D22/D19 fail-safe).
  const trackADumpConfirmed: Set<string> | null =
    stampSet && stampSet.proxy === 'PASS'
      ? new Set(stampSet.track_a_dump_confirmed)
      : null;

  const result: LoadCallgraphReachabilityResult = {
    cvarStamped: 0,
    commandStamped: 0,
    skipped: 0,
    skippedNames: [],
  };

  await sql.begin(async (tx) => {
    for (const entry of Object.values(entries)) {
      const { type, name, spine } = entry;
      const entityId = await resolveEntityId(tx, type, name);
      if (entityId === null) {
        // X7: no matching entity -> SKIP + COUNT. Never create.
        result.skipped++;
        result.skippedNames.push(`${type}::${name}`);
        continue;
      }
      // Stage-2 slot-3 stamp (CARRY-FORWARD 1: conclusion + evidence
      // verbatim, only dump_confirmation may flip to 'dump-confirmed').
      // No-op (returns the spine unchanged) for every name NOT in the
      // proxy=PASS stamp-set, and for EVERY name when no stamp-set was
      // supplied -> Phase-3 level-2 behaviour exactly.
      const stampedSpine = applyStageTwoStamp(spine, name, trackADumpConfirmed);
      const stamped =
        type === 'command'
          ? await stampCommand(tx, entityId, version, stampedSpine)
          : await stampCvar(tx, entityId, version, stampedSpine);
      if (!stamped) {
        // Entity exists but has no version row at this version (the
        // per-type loader did not emit it for this tag). Same safe
        // direction as a missing entity: skip + count, never fabricate
        // a row.
        result.skipped++;
        result.skippedNames.push(`${type}::${name} (entity present, no ${version} row)`);
        continue;
      }
      if (type === 'command') result.commandStamped++;
      else result.cvarStamped++;
    }
  });

  return result;
}

export async function loadCallgraphReachabilityFromFile(
  sql: postgres.Sql,
  version: string,
  jsonPath: string,
  // OPTIONAL stage-2 stamp-set -- threaded straight through. Omitted by
  // every non-pinned / ungated caller (Phase-3 behaviour exactly).
  stampSet?: Level3StampSet,
): Promise<LoadCallgraphReachabilityResult> {
  const signal = JSON.parse(
    readFileSync(jsonPath, 'utf-8'),
  ) as CallgraphReachabilityFile;
  return loadCallgraphReachabilityFromArray(sql, version, signal, stampSet);
}
