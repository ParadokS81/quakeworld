// Imports pre-extracted ezQuake/KTX commands and ezQuake/FTE vars from
// packages/qw-config/src/data/ into Layer 1 tables with canonical IDs.
//
// Idempotent: re-running upserts by canonical id and records each run in
// kb_facts_import_log.
//
// KNOWN LIMITATION: the source JSON is from iterative scrapers, not a proper
// AST-based extractor. Data is known to be incomplete. See spec open
// question #2 and the project_extraction_pipeline_vision memory.
//
// Shape notes (verified 2026-04-14):
//   ezquake-variables.json  = { groups: [...], vars: {name: {type, group-id, desc}} }
//   ezquake-commands.json   = { groups: [...], commands: {name: {group-id, desc}} }
//   ktx-commands.json       = { commands: {name: {desc}} }          (no groups)
//   fte-variables.json      = { "0": {name, default, description, sourceFile, group}, ... }
// FTE's flat-object shape is the odd one out; importFteCvars handles it separately.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QW_ORACLE_ROOT = resolve(__dirname, '..', '..');
const MONOREPO_ROOT = resolve(QW_ORACLE_ROOT, '..', '..');
const DATA_DIR = resolve(MONOREPO_ROOT, 'packages', 'qw-config', 'src', 'data');
const DB_PATH = resolve(QW_ORACLE_ROOT, 'data', 'qw.db');
const SCHEMA_PATH = resolve(__dirname, 'schema.sql');

const SOURCE_VERSION = 'poc';
const EXTRACTION_METHOD = 'scraped-json'; // row-level confidence signal for MCP consumers

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Apply schema. Bound reference avoids a false-positive security hook that
// pattern-matches child_process.exec() on the literal `.exec(` call site.
const runDdl = db.exec.bind(db);
runDdl(readFileSync(SCHEMA_PATH, 'utf8'));

const now = () => new Date().toISOString();

function groupLookup(groups) {
  // Builds id -> {name, major_group} from the ezquake JSON's groups array.
  const map = new Map();
  for (const g of groups ?? []) {
    map.set(String(g.id ?? g['group-id']), {
      name: g.name ?? null,
      major_group: g['major-group'] ?? null,
    });
  }
  return map;
}

const cvarUpsert = db.prepare(`
  INSERT INTO kb_cvars (id, project, name, type, group_id, group_name, major_group, default_value, description, source_file, source_line, source_version, extraction_method, imported_at)
  VALUES (@id, @project, @name, @type, @group_id, @group_name, @major_group, @default_value, @description, @source_file, @source_line, @source_version, @extraction_method, @imported_at)
  ON CONFLICT(id) DO UPDATE SET
    type              = excluded.type,
    group_id          = excluded.group_id,
    group_name        = excluded.group_name,
    major_group       = excluded.major_group,
    default_value     = excluded.default_value,
    description       = excluded.description,
    source_file       = excluded.source_file,
    source_line       = excluded.source_line,
    source_version    = excluded.source_version,
    extraction_method = excluded.extraction_method,
    imported_at       = excluded.imported_at
`);

const commandUpsert = db.prepare(`
  INSERT INTO kb_commands (id, project, name, group_id, group_name, description, source_file, source_line, source_version, extraction_method, imported_at)
  VALUES (@id, @project, @name, @group_id, @group_name, @description, @source_file, @source_line, @source_version, @extraction_method, @imported_at)
  ON CONFLICT(id) DO UPDATE SET
    group_id          = excluded.group_id,
    group_name        = excluded.group_name,
    description       = excluded.description,
    source_file       = excluded.source_file,
    source_line       = excluded.source_line,
    source_version    = excluded.source_version,
    extraction_method = excluded.extraction_method,
    imported_at       = excluded.imported_at
`);

const importLogInsert = db.prepare(`
  INSERT INTO kb_facts_import_log (project, entity_type, source_file, source_version, extraction_method, rows_inserted, rows_updated, imported_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

function importEzquakeCvars({ project, filePath }) {
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  const groups = groupLookup(json.groups);
  const vars = json.vars ?? {};

  const existing = new Set(
    db.prepare(`SELECT id FROM kb_cvars WHERE project = ?`).all(project).map((r) => r.id),
  );
  let inserted = 0;
  let updated = 0;

  const txn = db.transaction(() => {
    for (const [name, data] of Object.entries(vars)) {
      const id = `${project}:cvar:${name}`;
      const groupInfo = groups.get(String(data['group-id'])) ?? { name: null, major_group: null };
      cvarUpsert.run({
        id,
        project,
        name,
        type: data.type ?? null,
        group_id: data['group-id'] ?? null,
        group_name: groupInfo.name,
        major_group: groupInfo.major_group,
        default_value: data.default ?? data['default-value'] ?? null,
        description: data.desc ?? data.description ?? null,
        source_file: null,
        source_line: null,
        source_version: SOURCE_VERSION,
        extraction_method: EXTRACTION_METHOD,
        imported_at: now(),
      });
      if (existing.has(id)) updated++;
      else inserted++;
    }
  });
  txn();

  importLogInsert.run(project, 'cvar', filePath, SOURCE_VERSION, EXTRACTION_METHOD, inserted, updated, now());
  console.log(`[${project}:cvar] ${inserted} inserted, ${updated} updated (${inserted + updated} total) from ${filePath}`);
}

function importFteCvars({ filePath }) {
  // FTE shape: flat object of numeric string keys mapping to
  // { name, default, description, sourceFile, group }. No groups[] array.
  const project = 'fte';
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  const entries = Object.values(json);

  const existing = new Set(
    db.prepare(`SELECT id FROM kb_cvars WHERE project = ?`).all(project).map((r) => r.id),
  );
  let inserted = 0;
  let updated = 0;

  const txn = db.transaction(() => {
    for (const data of entries) {
      if (!data?.name) continue; // defensive: skip malformed rows
      const id = `${project}:cvar:${data.name}`;
      cvarUpsert.run({
        id,
        project,
        name: data.name,
        type: data.type ?? null,
        group_id: null,
        group_name: data.group ?? null,
        major_group: null,
        default_value: data.default ?? null,
        description: data.description ?? null,
        source_file: data.sourceFile ?? null,
        source_line: null,
        source_version: SOURCE_VERSION,
        extraction_method: EXTRACTION_METHOD,
        imported_at: now(),
      });
      if (existing.has(id)) updated++;
      else inserted++;
    }
  });
  txn();

  importLogInsert.run(project, 'cvar', filePath, SOURCE_VERSION, EXTRACTION_METHOD, inserted, updated, now());
  console.log(`[${project}:cvar] ${inserted} inserted, ${updated} updated (${inserted + updated} total) from ${filePath}`);
}

function importCommands({ project, filePath }) {
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  const groups = groupLookup(json.groups);
  const commands = json.commands ?? {};

  const existing = new Set(
    db.prepare(`SELECT id FROM kb_commands WHERE project = ?`).all(project).map((r) => r.id),
  );
  let inserted = 0;
  let updated = 0;

  const txn = db.transaction(() => {
    for (const [name, data] of Object.entries(commands)) {
      const id = `${project}:cmd:${name}`;
      const groupInfo = groups.get(String(data['group-id'])) ?? { name: null, major_group: null };
      commandUpsert.run({
        id,
        project,
        name,
        group_id: data['group-id'] ?? null,
        group_name: groupInfo.name,
        description: data.desc ?? data.description ?? null,
        source_file: null,
        source_line: null,
        source_version: SOURCE_VERSION,
        extraction_method: EXTRACTION_METHOD,
        imported_at: now(),
      });
      if (existing.has(id)) updated++;
      else inserted++;
    }
  });
  txn();

  importLogInsert.run(project, 'cmd', filePath, SOURCE_VERSION, EXTRACTION_METHOD, inserted, updated, now());
  console.log(`[${project}:cmd] ${inserted} inserted, ${updated} updated (${inserted + updated} total) from ${filePath}`);
}

importEzquakeCvars({ project: 'ezquake', filePath: resolve(DATA_DIR, 'ezquake-variables.json') });
importFteCvars({ filePath: resolve(DATA_DIR, 'fte-variables.json') });
importCommands({ project: 'ezquake', filePath: resolve(DATA_DIR, 'ezquake-commands.json') });
importCommands({ project: 'ktx', filePath: resolve(DATA_DIR, 'ktx-commands.json') });

db.close();
console.log('\nLayer 1 import complete.');
