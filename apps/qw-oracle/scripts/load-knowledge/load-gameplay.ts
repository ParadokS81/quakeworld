// Loader for the gameplay_sources / gameplay_entity_defs / gameplay_mechanics
// tables. Reads scripts/extractors/qw/seeds/id1-gameplay.yaml and upserts every
// row in a single transaction. Idempotent (relies on ruleset_gate_json being
// NOT NULL DEFAULT '{}' so the unique index has no NULL columns; see schema.ts
// SCHEMA_V14_ADDITIONS_SQL comment for rationale).

import { readFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import type Database from 'better-sqlite3';

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
// identically. The unique index keys on the literal string, so {a:1,b:2}
// and {b:2,a:1} would otherwise produce two rows.
function canonicaliseGate(gate: Record<string, unknown> | null | undefined): string {
  if (!gate || Object.keys(gate).length === 0) return '{}';
  const sortedKeys = Object.keys(gate).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = gate[k];
  return JSON.stringify(ordered);
}

export function loadGameplayFromArray(db: Database.Database, seed: SeedFile): LoadGameplayResult {
  const upsertSource = db.prepare(`
    INSERT INTO gameplay_sources (id, display_name, description, source_root, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      display_name = excluded.display_name,
      description  = excluded.description,
      source_root  = excluded.source_root,
      notes        = excluded.notes
  `);

  const existsEntity = db.prepare(`
    SELECT 1 FROM gameplay_entity_defs
    WHERE gameplay_source_id = ? AND kind = ? AND name = ? AND ruleset_gate_json = ?
  `);
  const existsMechanic = db.prepare(`
    SELECT 1 FROM gameplay_mechanics
    WHERE gameplay_source_id = ? AND kind = ? AND name = ? AND ruleset_gate_json = ?
  `);

  const upsertEntity = db.prepare(`
    INSERT INTO gameplay_entity_defs (
      gameplay_source_id, kind, name, classname,
      damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
      pickup_amount, max_carry, duration_seconds,
      ruleset_gate_json, source_ref, props_json, notes
    ) VALUES (
      @gameplay_source_id, @kind, @name, @classname,
      @damage, @splash_damage, @splash_radius, @refire_seconds, @respawn_seconds,
      @pickup_amount, @max_carry, @duration_seconds,
      @ruleset_gate_json, @source_ref, @props_json, @notes
    )
    ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
      classname = excluded.classname,
      damage = excluded.damage,
      splash_damage = excluded.splash_damage,
      splash_radius = excluded.splash_radius,
      refire_seconds = excluded.refire_seconds,
      respawn_seconds = excluded.respawn_seconds,
      pickup_amount = excluded.pickup_amount,
      max_carry = excluded.max_carry,
      duration_seconds = excluded.duration_seconds,
      source_ref = excluded.source_ref,
      props_json = excluded.props_json,
      notes = excluded.notes
  `);

  const upsertMechanic = db.prepare(`
    INSERT INTO gameplay_mechanics (
      gameplay_source_id, kind, name, value_numeric, value_text,
      ruleset_gate_json, source_ref, props_json, notes
    ) VALUES (
      @gameplay_source_id, @kind, @name, @value_numeric, @value_text,
      @ruleset_gate_json, @source_ref, @props_json, @notes
    )
    ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
      value_numeric = excluded.value_numeric,
      value_text = excluded.value_text,
      source_ref = excluded.source_ref,
      props_json = excluded.props_json,
      notes = excluded.notes
  `);

  const result: LoadGameplayResult = {
    inserted: { entities: 0, mechanics: 0 },
    updated: { entities: 0, mechanics: 0 },
    total: { entities: 0, mechanics: 0 },
  };

  const txn = db.transaction(() => {
    upsertSource.run(
      seed.gameplay_source.id,
      seed.gameplay_source.display_name,
      seed.gameplay_source.description,
      seed.gameplay_source.source_root,
      seed.gameplay_source.notes ?? null,
    );

    for (const listName of ['weapons', 'projectiles', 'items'] as const) {
      const kind = ENTITY_KIND_BY_LIST[listName];
      const rows = seed[listName] ?? [];
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate);
        const wasExisting = !!existsEntity.get(seed.gameplay_source.id, kind, row.name, gateJson);
        upsertEntity.run({
          gameplay_source_id: seed.gameplay_source.id,
          kind,
          name: row.name,
          classname: row.classname ?? null,
          damage: row.damage ?? null,
          splash_damage: row.splash_damage ?? null,
          splash_radius: row.splash_radius ?? null,
          refire_seconds: row.refire_seconds ?? null,
          respawn_seconds: row.respawn_seconds ?? null,
          pickup_amount: row.pickup_amount ?? null,
          max_carry: row.max_carry ?? null,
          duration_seconds: row.duration_seconds ?? null,
          ruleset_gate_json: gateJson,
          source_ref: row.source_ref,
          props_json: JSON.stringify(row.props ?? {}),
          notes: row.notes ?? null,
        });
        if (wasExisting) result.updated.entities++; else result.inserted.entities++;
        result.total.entities++;
      }
    }

    for (const listName of Object.keys(MECHANIC_KIND_BY_LIST)) {
      const kind = MECHANIC_KIND_BY_LIST[listName];
      const rows = (seed.mechanics as Record<string, MechanicRow[]>)[listName] ?? [];
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate);
        const wasExisting = !!existsMechanic.get(seed.gameplay_source.id, kind, row.name, gateJson);
        upsertMechanic.run({
          gameplay_source_id: seed.gameplay_source.id,
          kind,
          name: row.name,
          value_numeric: row.value_numeric ?? null,
          value_text: row.value_text ?? null,
          ruleset_gate_json: gateJson,
          source_ref: row.source_ref,
          props_json: JSON.stringify(row.props ?? {}),
          notes: row.notes ?? null,
        });
        if (wasExisting) result.updated.mechanics++; else result.inserted.mechanics++;
        result.total.mechanics++;
      }
    }
  });
  txn();
  return result;
}

export function loadGameplayFromFile(db: Database.Database, yamlPath: string): LoadGameplayResult {
  const seed = yaml.load(readFileSync(yamlPath, 'utf-8')) as SeedFile;
  return loadGameplayFromArray(db, seed);
}
