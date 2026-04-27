// Schema-fitness spike. Verifies the proposed v14 schema accepts compound
// KTX ruleset gates and that re-runs are idempotent. Delete after Task 0.

import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';

const PROPOSED_SCHEMA = `
CREATE TABLE gameplay_sources (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  source_root TEXT NOT NULL,
  notes TEXT
);
CREATE TABLE gameplay_entity_defs (
  id INTEGER PRIMARY KEY,
  gameplay_source_id TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind TEXT NOT NULL CHECK (kind IN ('item','weapon','projectile')),
  name TEXT NOT NULL,
  classname TEXT,
  damage REAL,
  splash_damage REAL,
  splash_radius REAL,
  refire_seconds REAL,
  respawn_seconds REAL,
  pickup_amount REAL,
  max_carry REAL,
  duration_seconds REAL,
  ruleset_gate_json TEXT NOT NULL DEFAULT '{}',
  source_ref TEXT NOT NULL,
  props_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
CREATE TABLE gameplay_mechanics (
  id INTEGER PRIMARY KEY,
  gameplay_source_id TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind TEXT NOT NULL CHECK (kind IN (
    'constant','env_hazard','player_stat','powerup_behavior',
    'armor_model','death_rule','spawn_rule','dm_mode_rule'
  )),
  name TEXT NOT NULL,
  value_numeric REAL,
  value_text TEXT,
  ruleset_gate_json TEXT NOT NULL DEFAULT '{}',
  source_ref TEXT NOT NULL,
  props_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
`;

const db = new Database(':memory:');
db.exec(PROPOSED_SCHEMA);
db.prepare('INSERT INTO gameplay_sources VALUES (?,?,?,?,?)').run('ktx', 'KTX', 'spike', 'research/repos/ktx/src/', null);
db.prepare('INSERT INTO gameplay_sources VALUES (?,?,?,?,?)').run('id1', 'id1', 'baseline', 'research/repos/qwcl-original/QW/progs/', null);

const seed = yaml.load(fs.readFileSync('scripts/extractors/qw/seeds/_ktx-spike.yaml', 'utf8')) as { rows: any[] };

const upsertEntity = db.prepare(`
  INSERT INTO gameplay_entity_defs (
    gameplay_source_id, kind, name, classname, damage, splash_damage, splash_radius,
    refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds,
    ruleset_gate_json, source_ref, props_json, notes
  ) VALUES (
    @gameplay_source_id, @kind, @name, @classname, @damage, @splash_damage, @splash_radius,
    @refire_seconds, @respawn_seconds, @pickup_amount, @max_carry, @duration_seconds,
    @ruleset_gate_json, @source_ref, @props_json, @notes
  )
  ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
    damage = excluded.damage,
    source_ref = excluded.source_ref,
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
    notes = excluded.notes
`);

const ENTITY_KINDS = new Set(['item','weapon','projectile']);

function pad(row: any) {
  return {
    gameplay_source_id: row.gameplay_source_id,
    kind: row.kind,
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
    value_numeric: row.value_numeric ?? null,
    value_text: row.value_text ?? null,
    ruleset_gate_json: row.ruleset_gate_json ?? '{}',
    source_ref: row.source_ref,
    props_json: '{}',
    notes: row.notes ?? null,
  };
}

// First load
for (const row of seed.rows) {
  const r = pad(row);
  if (ENTITY_KINDS.has(row.kind)) upsertEntity.run(r);
  else upsertMechanic.run(r);
}
const e1 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_entity_defs').get() as any).c;
const m1 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_mechanics').get() as any).c;
console.log(`first load:  entity_defs=${e1}, mechanics=${m1}`);

// Second load (idempotency check)
for (const row of seed.rows) {
  const r = pad(row);
  if (ENTITY_KINDS.has(row.kind)) upsertEntity.run(r);
  else upsertMechanic.run(r);
}
const e2 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_entity_defs').get() as any).c;
const m2 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_mechanics').get() as any).c;
console.log(`second load: entity_defs=${e2}, mechanics=${m2}`);
console.log(`idempotent:  ${e1 === e2 && m1 === m2 ? 'YES' : 'NO'}`);

// Compound gate query (must work)
const compound = db.prepare(`
  SELECT name, damage, ruleset_gate_json, source_ref FROM gameplay_entity_defs
  WHERE gameplay_source_id = ?
    AND json_extract(ruleset_gate_json, '$.yawn') = 1
    AND json_extract(ruleset_gate_json, '$.dm') = 4
`).all('ktx');
console.log('compound-gate query result:', compound);
db.close();
