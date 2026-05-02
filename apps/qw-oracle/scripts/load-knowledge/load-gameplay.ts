// Loader for the gameplay_sources / gameplay_entity_defs / gameplay_mechanics
// tables. Reads scripts/extractors/qw/seeds/id1-gameplay.yaml and upserts every
// row in a single transaction. Idempotent (relies on ruleset_gate_json being
// NOT NULL DEFAULT '{}' so the unique index has no NULL columns).

import { readFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import type postgres from 'postgres';

interface GameplaySourceRow {
  id: string;
  display_name: string;
  description: string;
  source_root: string;
  notes?: string | null;
}

interface EntityDefRow {
  name: string;
  classname?: string | null;
  damage?: number | null;
  splash_damage?: number | null;
  splash_radius?: number | null;
  refire_seconds?: number | null;
  respawn_seconds?: number | null;
  pickup_amount?: number | null;
  max_carry?: number | null;
  duration_seconds?: number | null;
  ruleset_gate?: Record<string, unknown> | null;
  source_ref: string;
  props?: Record<string, unknown>;
  notes?: string | null;
}

interface MechanicRow {
  name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  ruleset_gate?: Record<string, unknown> | null;
  source_ref: string;
  props?: Record<string, unknown>;
  notes?: string | null;
}

export interface SeedFile {
  gameplay_source: GameplaySourceRow;
  weapons: EntityDefRow[];
  projectiles: EntityDefRow[];
  items: EntityDefRow[];
  mechanics: {
    constants: MechanicRow[];
    env_hazards: MechanicRow[];
    player_stats: MechanicRow[];
    powerup_behaviors: MechanicRow[];
    armor_models: MechanicRow[];
    death_rules: MechanicRow[];
    spawn_rules: MechanicRow[];
    dm_mode_rules: MechanicRow[];
  };
}

export interface LoadGameplayResult {
  inserted: { entities: number; mechanics: number };
  updated: { entities: number; mechanics: number };
  total: { entities: number; mechanics: number };
}

const ENTITY_KIND_BY_LIST: Record<'weapons' | 'projectiles' | 'items', 'item' | 'weapon' | 'projectile'> = {
  weapons: 'weapon',
  projectiles: 'projectile',
  items: 'item',
};

const MECHANIC_KIND_BY_LIST: Record<string, string> = {
  constants: 'constant',
  env_hazards: 'env_hazard',
  player_stats: 'player_stat',
  powerup_behaviors: 'powerup_behavior',
  armor_models: 'armor_model',
  death_rules: 'death_rule',
  spawn_rules: 'spawn_rule',
  dm_mode_rules: 'dm_mode_rule',
};

// Canonicalise object key order so the same logical gate always serialises
// identically. The unique index keys on the JSONB value (Postgres compares by
// content), but we also still want stable text output for downstream
// inspection. Canonical-form JSON serves both.
function canonicaliseGate(gate: Record<string, unknown> | null | undefined): string {
  if (!gate || Object.keys(gate).length === 0) return '{}';
  const sortedKeys = Object.keys(gate).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = gate[k];
  return JSON.stringify(ordered);
}

export async function loadGameplayFromArray(sql: postgres.Sql, seed: SeedFile): Promise<LoadGameplayResult> {
  const result: LoadGameplayResult = {
    inserted: { entities: 0, mechanics: 0 },
    updated: { entities: 0, mechanics: 0 },
    total: { entities: 0, mechanics: 0 },
  };

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO gameplay_sources (id, display_name, description, source_root, notes)
      VALUES (
        ${seed.gameplay_source.id}, ${seed.gameplay_source.display_name},
        ${seed.gameplay_source.description}, ${seed.gameplay_source.source_root},
        ${seed.gameplay_source.notes ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description  = EXCLUDED.description,
        source_root  = EXCLUDED.source_root,
        notes        = EXCLUDED.notes
    `;

    for (const listName of ['weapons', 'projectiles', 'items'] as const) {
      const kind = ENTITY_KIND_BY_LIST[listName];
      const rows = seed[listName] ?? [];
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate);
        const existsRows = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM gameplay_entity_defs
          WHERE gameplay_source_id = ${seed.gameplay_source.id}
            AND kind = ${kind}
            AND name = ${row.name}
            AND ruleset_gate_json = ${gateJson}::jsonb
        `;
        const wasExisting = existsRows.length > 0;
        await tx`
          INSERT INTO gameplay_entity_defs (
            gameplay_source_id, kind, name, classname,
            damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
            pickup_amount, max_carry, duration_seconds,
            ruleset_gate_json, source_ref, props_json, notes
          ) VALUES (
            ${seed.gameplay_source.id}, ${kind}, ${row.name}, ${row.classname ?? null},
            ${row.damage ?? null}, ${row.splash_damage ?? null}, ${row.splash_radius ?? null},
            ${row.refire_seconds ?? null}, ${row.respawn_seconds ?? null},
            ${row.pickup_amount ?? null}, ${row.max_carry ?? null}, ${row.duration_seconds ?? null},
            ${gateJson}::jsonb, ${row.source_ref}, ${tx.json((row.props ?? {}) as Record<string, never>)}, ${row.notes ?? null}
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
        if (wasExisting) result.updated.entities++; else result.inserted.entities++;
        result.total.entities++;
      }
    }

    for (const listName of Object.keys(MECHANIC_KIND_BY_LIST)) {
      const kind = MECHANIC_KIND_BY_LIST[listName]!;
      const rows = (seed.mechanics as Record<string, MechanicRow[]>)[listName] ?? [];
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate);
        const existsRows = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM gameplay_mechanics
          WHERE gameplay_source_id = ${seed.gameplay_source.id}
            AND kind = ${kind}
            AND name = ${row.name}
            AND ruleset_gate_json = ${gateJson}::jsonb
        `;
        const wasExisting = existsRows.length > 0;
        await tx`
          INSERT INTO gameplay_mechanics (
            gameplay_source_id, kind, name, value_numeric, value_text,
            ruleset_gate_json, source_ref, props_json, notes
          ) VALUES (
            ${seed.gameplay_source.id}, ${kind}, ${row.name},
            ${row.value_numeric ?? null}, ${row.value_text ?? null},
            ${gateJson}::jsonb, ${row.source_ref}, ${tx.json((row.props ?? {}) as Record<string, never>)}, ${row.notes ?? null}
          )
          ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
            value_numeric = EXCLUDED.value_numeric,
            value_text    = EXCLUDED.value_text,
            source_ref    = EXCLUDED.source_ref,
            props_json    = EXCLUDED.props_json,
            notes         = EXCLUDED.notes
        `;
        if (wasExisting) result.updated.mechanics++; else result.inserted.mechanics++;
        result.total.mechanics++;
      }
    }
  });

  return result;
}

export async function loadGameplayFromFile(sql: postgres.Sql, yamlPath: string): Promise<LoadGameplayResult> {
  const seed = yaml.load(readFileSync(yamlPath, 'utf-8')) as SeedFile;
  return loadGameplayFromArray(sql, seed);
}
