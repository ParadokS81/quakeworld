// Loader for KTX gameplay-tables rows (monster + score_system + drop_item +
// loc_macro + teamplay_message). Reads the AST JSON produced by
// _handler_gameplay_tables.py and idempotently UPSERTs each kind into its
// home table:
//   monster          -> gameplay_entity_defs (kind='monster')
//   score_system     -> gameplay_mechanics    (kind='score_system')
//   drop_item        -> gameplay_mechanics    (kind='drop_item')
//   loc_macro        -> gameplay_mechanics    (kind='loc_macro')
//   teamplay_message -> gameplay_mechanics    (kind='teamplay_message')
//
// D14 JSONB binding: every JSONB column passes its JS value via
// tx.json(...). NEVER pre-stringify.
// D15 idempotent: ON CONFLICT (gameplay_source_id, kind, name,
//                              ruleset_gate_json) DO UPDATE; re-run is a no-op.
// F10 invariant: every score_system row has positions.length === 10.
// Loader-side fail-fast (throws before transaction commit).
//
// Preconditions:
//   1. gameplay_sources row 'ktx' must exist (Phase 1 Task 5).
//   2. gameplay_entity_defs.kind CHECK constraint must include 'monster'
//      and gameplay_mechanics.kind must include 'score_system', 'drop_item',
//      'loc_macro', 'teamplay_message' (Phase 1 gameplay-kind widening migration).

import { readFileSync } from 'node:fs';
import type postgres from 'postgres';

const KTX_GAMEPLAY_SOURCE_ID = 'ktx' as const;

interface MonsterRow {
  name: string;
  kind: 'monster';
  value_text: string;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    hp_for_kill: number | null;
    armor_for_kill: number | null;
    boss_able: boolean;
    array_position: number;
    is_first_required: boolean;
  };
}

interface ScoreSystemRow {
  name: string;
  kind: 'score_system';
  value_text: string;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    positions: number[];               // exactly 10 elements per F10
    completion: number | null;
    beating: number | null;
    dnf_penalty: number | null;
    round_max_diff: number | null;
  };
}

interface DropItemRow {
  name: string;
  kind: 'drop_item';
  value_text: string | null;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    drop_token: string;
    spawned_classname: string | null;
    spawnflags_raw: string;
    spawnflags_value: number | null;
    angle_set: boolean;
    spawn_function: string | null;
    related_entity_canonical_id: string | null;
  };
}

interface LocMacroRow {
  name: string;
  kind: 'loc_macro';
  value_text: string;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    expansion: string;
    is_identity: boolean;
    category: string;
    related_item: string | null;
  };
}

interface TeamplayMessageRow {
  name: string;
  kind: 'teamplay_message';
  value_text: string;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    description: string;
    handler_function: string | null;
    source_ref_handler: string | null;
    harvested_description: string | null;
  };
}

export interface TablesAstFile {
  monsters:          MonsterRow[];
  score_systems:     ScoreSystemRow[];
  drop_items:        DropItemRow[];
  loc_macros:        LocMacroRow[];
  teamplay_messages: TeamplayMessageRow[];
  _stats?: Record<string, unknown>;
}

export interface LoadTablesResult {
  inserted: { monster: number; score_system: number; drop_item: number; loc_macro: number; teamplay_message: number };
  updated:  { monster: number; score_system: number; drop_item: number; loc_macro: number; teamplay_message: number };
  total:    { monster: number; score_system: number; drop_item: number; loc_macro: number; teamplay_message: number };
}

// Canonicalise object key order so the same logical gate always
// serialises identically. Empty gates collapse to {}. Mirrors
// load-modes.ts / load-gameplay-taxonomies.ts / load-gameplay.ts patterns.
function canonicaliseGate(
  gate: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!gate || Object.keys(gate).length === 0) return {};
  const sortedKeys = Object.keys(gate).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = gate[k];
  return ordered;
}

export async function loadTablesFromArray(
  sql: postgres.Sql,
  ast: TablesAstFile,
): Promise<LoadTablesResult> {
  const result: LoadTablesResult = {
    inserted: { monster: 0, score_system: 0, drop_item: 0, loc_macro: 0, teamplay_message: 0 },
    updated:  { monster: 0, score_system: 0, drop_item: 0, loc_macro: 0, teamplay_message: 0 },
    total:    { monster: 0, score_system: 0, drop_item: 0, loc_macro: 0, teamplay_message: 0 },
  };

  // Precondition: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).
  const sourceRows = await sql<{ id: string }[]>`
    SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
  `;
  if (sourceRows.length === 0) {
    throw new Error(
      `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before ` +
      `load-gameplay-tables. See ` +
      `docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md.`,
    );
  }

  // F10 pre-flight: validate positions-length-10 invariant on every
  // score_system row BEFORE opening the transaction. Fail-fast prevents
  // partially-loaded state.
  for (const row of ast.score_systems ?? []) {
    const len = Array.isArray(row.props_json?.positions)
      ? row.props_json.positions.length
      : -1;
    if (len !== 10) {
      throw new Error(
        `load-gameplay-tables: F10 invariant violation -- score_system ` +
        `row '${row.name}' has positions.length=${len}, expected 10. ` +
        `Re-extract; do not bypass.`,
      );
    }
  }

  await sql.begin(async (tx) => {
    // monster rows -> gameplay_entity_defs. Expected count: 13 (F9).
    for (const row of ast.monsters ?? []) {
      const gateJson = canonicaliseGate(row.ruleset_gate_json ?? {});
      const propsJson = row.props_json ?? {};
      const existsRows = await tx<{ one: number }[]>`
        SELECT 1 AS one FROM gameplay_entity_defs
        WHERE gameplay_source_id = ${KTX_GAMEPLAY_SOURCE_ID}
          AND kind = ${row.kind}
          AND name = ${row.name}
          AND ruleset_gate_json = ${tx.json(gateJson as never)}
      `;
      const wasExisting = existsRows.length > 0;
      await tx`
        INSERT INTO gameplay_entity_defs (
          gameplay_source_id, kind, name, classname,
          damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
          pickup_amount, max_carry, duration_seconds,
          ruleset_gate_json, source_ref, props_json, notes
        ) VALUES (
          ${KTX_GAMEPLAY_SOURCE_ID}, ${row.kind}, ${row.name}, ${row.value_text ?? null},
          ${null}, ${null}, ${null}, ${null}, ${null},
          ${null}, ${null}, ${null},
          ${tx.json(gateJson as never)}, ${row.source_ref}, ${tx.json(propsJson as never)}, ${null}
        )
        ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
          classname        = EXCLUDED.classname,
          damage           = EXCLUDED.damage,
          splash_damage    = EXCLUDED.splash_damage,
          splash_radius    = EXCLUDED.splash_radius,
          refire_seconds   = EXCLUDED.refire_seconds,
          respawn_seconds  = EXCLUDED.respawn_seconds,
          pickup_amount    = EXCLUDED.pickup_amount,
          max_carry        = EXCLUDED.max_carry,
          duration_seconds = EXCLUDED.duration_seconds,
          source_ref       = EXCLUDED.source_ref,
          props_json       = EXCLUDED.props_json,
          notes            = EXCLUDED.notes
      `;
      if (wasExisting) result.updated.monster++;
      else result.inserted.monster++;
      result.total.monster++;
    }

    // score_system / drop_item / loc_macro / teamplay_message all land in
    // gameplay_mechanics; same UPSERT shape, different row arrays. Iterate
    // through all four kind groups via a shared helper.
    const mechanicsKindGroups: Array<[
      'score_system' | 'drop_item' | 'loc_macro' | 'teamplay_message',
      ScoreSystemRow[] | DropItemRow[] | LocMacroRow[] | TeamplayMessageRow[],
    ]> = [
      ['score_system',     ast.score_systems     ?? []],
      ['drop_item',        ast.drop_items        ?? []],
      ['loc_macro',        ast.loc_macros        ?? []],
      ['teamplay_message', ast.teamplay_messages ?? []],
    ];
    for (const [kindLabel, rows] of mechanicsKindGroups) {
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate_json ?? {});
        const propsJson = row.props_json ?? {};
        const existsRows = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM gameplay_mechanics
          WHERE gameplay_source_id = ${KTX_GAMEPLAY_SOURCE_ID}
            AND kind = ${row.kind}
            AND name = ${row.name}
            AND ruleset_gate_json = ${tx.json(gateJson as never)}
        `;
        const wasExisting = existsRows.length > 0;
        await tx`
          INSERT INTO gameplay_mechanics (
            gameplay_source_id, kind, name,
            value_numeric, value_text,
            ruleset_gate_json, source_ref, props_json, notes
          ) VALUES (
            ${KTX_GAMEPLAY_SOURCE_ID}, ${row.kind}, ${row.name},
            ${null}, ${row.value_text ?? null},
            ${tx.json(gateJson as never)}, ${row.source_ref},
            ${tx.json(propsJson as never)}, ${null}
          )
          ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
            value_numeric = EXCLUDED.value_numeric,
            value_text    = EXCLUDED.value_text,
            source_ref    = EXCLUDED.source_ref,
            props_json    = EXCLUDED.props_json,
            notes         = EXCLUDED.notes
        `;
        if (wasExisting) result.updated[kindLabel]++;
        else result.inserted[kindLabel]++;
        result.total[kindLabel]++;
      }
    }
  });

  // Hard count gates (F9 / F10 / F11 / F12 / F13 anchors). Sub-anchor counts
  // trigger fail-fast so a regressed handler doesn't silently land short
  // rows. Note F11 anchor amends from 30 -> 31 per drafter source-walk
  // (see Open Questions); the gate uses the live-source value.
  const failures: string[] = [];
  if (result.total.monster < 13) failures.push(`monster=${result.total.monster}<13 (F9)`);
  if (result.total.score_system < 3) failures.push(`score_system=${result.total.score_system}<3 (F10)`);
  if (result.total.drop_item < 31) failures.push(`drop_item=${result.total.drop_item}<31 (F11 amended)`);
  if (result.total.loc_macro < 15) failures.push(`loc_macro=${result.total.loc_macro}<15 (F12)`);
  if (result.total.teamplay_message < 21) failures.push(`teamplay_message=${result.total.teamplay_message}<21 (F13)`);
  if (failures.length) {
    throw new Error(`load-gameplay-tables: count gates failed: ${failures.join('; ')}`);
  }

  return result;
}

export async function loadTablesFromFile(
  sql: postgres.Sql,
  jsonPath: string,
): Promise<LoadTablesResult> {
  const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as TablesAstFile;
  return loadTablesFromArray(sql, ast);
}
