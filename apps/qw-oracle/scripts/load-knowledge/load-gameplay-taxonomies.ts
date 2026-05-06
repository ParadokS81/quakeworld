// Loader for KTX gameplay-taxonomies rows (election_type + death_rule).
// Reads the AST JSON produced by _handler_gameplay_taxonomies.py and
// idempotently UPSERTs both kind groups into gameplay_mechanics.
//
// D14 JSONB binding: every JSONB column passes its JS value via
// tx.json(...). NEVER pre-stringify.
// D15 idempotent: ON CONFLICT (gameplay_source_id, kind, name,
//                              ruleset_gate_json) DO UPDATE; re-run is a no-op.
//
// Preconditions:
//   1. gameplay_sources row 'ktx' must exist (Phase 1 Task 5).
//   2. gameplay_mechanics.kind CHECK constraint must include 'election_type'
//      and 'death_rule' (Phase 1 gameplay-kind widening migration).
//
// Sanity gates:
//   - F7 hard-fail: total election_type rows < 5 throws.
//   - F8 hard-fail: total death_rule rows < 27 throws.

import { readFileSync } from 'node:fs';
import type postgres from 'postgres';

const KTX_GAMEPLAY_SOURCE_ID = 'ktx' as const;

interface ElectionTypeRow {
  name: string;
  kind: 'election_type';
  value_text: string;            // dt enum tag
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    description: string;
    related_commands_json: string[];
    required_role: string;
  };
}

interface DeathRuleRow {
  name: string;
  kind: 'death_rule';
  value_text: string;
  source_ref: string;
  ruleset_gate_json: Record<string, unknown>;
  props_json: {
    category: string;
    id1_baseline: boolean;
    ktx_extension: boolean;
    related_weapon: string | null;
  };
}

export interface TaxonomiesAstFile {
  election_types: ElectionTypeRow[];
  death_rules: DeathRuleRow[];
  _stats?: Record<string, unknown>;
}

export interface LoadTaxonomiesResult {
  inserted: { election_type: number; death_rule: number };
  updated:  { election_type: number; death_rule: number };
  total:    { election_type: number; death_rule: number };
}

// Canonicalise object key order so the same logical gate always
// serialises identically. Empty gates collapse to {}. Mirrors
// load-modes.ts and load-gameplay.ts patterns.
function canonicaliseGate(
  gate: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!gate || Object.keys(gate).length === 0) return {};
  const sortedKeys = Object.keys(gate).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = gate[k];
  return ordered;
}

export async function loadTaxonomiesFromArray(
  sql: postgres.Sql,
  ast: TaxonomiesAstFile,
): Promise<LoadTaxonomiesResult> {
  const result: LoadTaxonomiesResult = {
    inserted: { election_type: 0, death_rule: 0 },
    updated:  { election_type: 0, death_rule: 0 },
    total:    { election_type: 0, death_rule: 0 },
  };

  // Precondition: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).
  const sourceRows = await sql<{ id: string }[]>`
    SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
  `;
  if (sourceRows.length === 0) {
    throw new Error(
      `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before ` +
      `load-gameplay-taxonomies. See ` +
      `docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md.`,
    );
  }

  await sql.begin(async (tx) => {
    // election_type rows. Expected count: 5 (F7).
    for (const row of ast.election_types) {
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
      if (wasExisting) result.updated.election_type++;
      else result.inserted.election_type++;
      result.total.election_type++;
    }

    // death_rule rows. Expected count: 27 (F8).
    for (const row of ast.death_rules) {
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
      if (wasExisting) result.updated.death_rule++;
      else result.inserted.death_rule++;
      result.total.death_rule++;
    }
  });

  // Hard count gates (F7 + F8 anchors). Sub-anchor counts trigger
  // a fail-fast so a regressed handler doesn't silently land short rows.
  if (result.total.election_type < 5) {
    throw new Error(
      `load-gameplay-taxonomies: election_type count ${result.total.election_type} < 5 ` +
      `expected (F7 anchor). Handler emitted fewer election_type rows than required.`,
    );
  }
  if (result.total.death_rule < 27) {
    throw new Error(
      `load-gameplay-taxonomies: death_rule count ${result.total.death_rule} < 27 ` +
      `expected (F8 anchor). Handler emitted fewer death_rule rows than required.`,
    );
  }

  return result;
}

export async function loadTaxonomiesFromFile(
  sql: postgres.Sql,
  jsonPath: string,
): Promise<LoadTaxonomiesResult> {
  const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as TaxonomiesAstFile;
  return loadTaxonomiesFromArray(sql, ast);
}
