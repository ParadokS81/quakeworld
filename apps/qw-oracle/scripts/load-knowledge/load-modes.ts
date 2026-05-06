// Loader for KTX modes (game_mode catalog + mode_default overlays). Reads
// apps/qw-oracle/scripts/extractors/ktx/output/ktx-modes-ast.json and
// upserts every row into gameplay_mechanics keyed on
// (gameplay_source_id='ktx', kind, name, ruleset_gate_json). Idempotent.
//
// Mirror of load-gameplay.ts shape; consumes the handler's AST JSON
// instead of a YAML seed. Dispatches per row.kind: 'game_mode' rows are
// catalog (27 expected); 'mode_default' rows are per-line overlays
// (~309 expected). Both target gameplay_mechanics; unique constraint
// (gameplay_source_id, kind, name, ruleset_gate_json) prevents
// duplicates and supports re-runs.
//
// JSONB binding (D14): every JSONB column is bound via tx.json(...) so
// the column receives a structured JSONB value, NOT a JSONB string
// scalar (the legacy SQLite-era stringify bug).
//
// Validation: rejects on missing required fields per row shape; the
// handler's _stats block carries diagnostic counts but the loader does
// not consume them (loader trusts the handler's contract).
//
// Preconditions:
//   1. gameplay_sources row 'ktx' must exist (Phase 1 Task 5).
//   2. gameplay_mechanics.kind CHECK constraint must include 'game_mode'
//      and 'mode_default' (Phase 1 gameplay-kind widening migration).
//
// Sanity gates:
//   - F5 hard-fail: total game_mode rows < 27 throws.
//   - F6 soft-warn: total mode_default rows outside [280, 360] warns.

import { readFileSync } from 'node:fs';
import type postgres from 'postgres';

const KTX_GAMEPLAY_SOURCE_ID = 'ktx' as const;

interface CatalogRow {
  name: string;
  kind: 'game_mode';
  value_text: string | null;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: Record<string, unknown>;
}

interface ModeDefaultRow {
  name: string;
  kind: 'mode_default';
  value_text: string;
  value_numeric: number | null;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: Record<string, unknown>;
}

interface ModesAstFile {
  groups?: Record<string, string>;
  game_modes: CatalogRow[];
  mode_defaults: ModeDefaultRow[];
  _stats?: Record<string, unknown>;
}

export interface LoadModesResult {
  inserted: { game_mode: number; mode_default: number };
  updated:  { game_mode: number; mode_default: number };
  total:    { game_mode: number; mode_default: number };
}

// Canonicalise object key order so the same logical gate always serialises
// identically. Returns the ordered object; postgres-js auto-encodes it as JSONB
// when bound. Pre-stringifying would store a JSONB string scalar (legacy
// SQLite-era TEXT bug). Postgres compares JSONB by content for the unique
// index, so the ordered-key form keeps the comparison stable across runs.
function canonicaliseGate(gate: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!gate || Object.keys(gate).length === 0) return {};
  const sortedKeys = Object.keys(gate).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = gate[k];
  return ordered;
}

export async function loadModesFromArray(sql: postgres.Sql, ast: ModesAstFile): Promise<LoadModesResult> {
  // Precondition: gameplay_sources row for 'ktx' must exist before loading.
  // Runs outside the transaction (read-only, idempotent on re-run).
  const sourceRows = await sql<{ id: string }[]>`
    SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
  `;
  if (sourceRows.length === 0) {
    throw new Error(
      `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before load-modes. ` +
      `See docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md.`
    );
  }

  const result: LoadModesResult = {
    inserted: { game_mode: 0, mode_default: 0 },
    updated:  { game_mode: 0, mode_default: 0 },
    total:    { game_mode: 0, mode_default: 0 },
  };

  await sql.begin(async (tx) => {
    // Catalog rows (kind='game_mode'). Expected count: 27 (F5 anchor).
    for (const row of ast.game_modes) {
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
      if (wasExisting) result.updated.game_mode++; else result.inserted.game_mode++;
      result.total.game_mode++;
    }

    // Overlay rows (kind='mode_default'). Expected count: ~309 (F6 anchor).
    for (const row of ast.mode_defaults) {
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
          ${row.value_numeric ?? null}, ${row.value_text},
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
      if (wasExisting) result.updated.mode_default++; else result.inserted.mode_default++;
      result.total.mode_default++;
    }
  });

  // F5 hard-fail: catalog must have at least 27 rows.
  if (result.total.game_mode < 27) {
    throw new Error(
      `load-modes: catalog count ${result.total.game_mode} < 27 expected (F5 anchor). ` +
      `Handler emitted fewer game_mode rows than required.`
    );
  }

  // F6 soft-warn: overlay count should be in [280, 360] band around ~309 anchor.
  if (result.total.mode_default < 280 || result.total.mode_default > 360) {
    console.warn(
      `[load-modes] mode_default count ${result.total.mode_default} outside [280, 360] band ` +
      `(F6 ~309 anchor). Investigate if structural rather than per-tag drift.`
    );
  }

  return result;
}

export async function loadModesFromFile(sql: postgres.Sql, jsonPath: string): Promise<LoadModesResult> {
  const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as ModesAstFile;
  return loadModesFromArray(sql, ast);
}
