// Post-import sanity check for Layer 1 tables. Prints counts per project,
// a handful of sample rows, and the latest entries in kb_facts_import_log.
// Read-only: safe to re-run.

import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'qw.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('=== kb_cvars counts ===');
for (const row of db.prepare(`SELECT project, COUNT(*) AS n FROM kb_cvars GROUP BY project ORDER BY project`).all()) {
  console.log(`  ${row.project}: ${row.n}`);
}

console.log('\n=== kb_commands counts ===');
for (const row of db.prepare(`SELECT project, COUNT(*) AS n FROM kb_commands GROUP BY project ORDER BY project`).all()) {
  console.log(`  ${row.project}: ${row.n}`);
}

console.log('\n=== sample rows (expected to include common cvars/commands) ===');
const samples = [
  { id: 'ezquake:cvar:cl_bob',      table: 'kb_cvars' },
  { id: 'ezquake:cvar:crosshair',   table: 'kb_cvars' },
  { id: 'ezquake:cvar:sensitivity', table: 'kb_cvars' },
  { id: 'ezquake:cmd:say_team',     table: 'kb_commands' },
  { id: 'ezquake:cmd:+attack',      table: 'kb_commands' },
  { id: 'ktx:cmd:rpickup',          table: 'kb_commands' },
  { id: 'ktx:cmd:break',            table: 'kb_commands' },
  { id: 'fte:cvar:sv_wallfriction', table: 'kb_cvars' },
];
for (const { id, table } of samples) {
  const columns = table === 'kb_cvars'
    ? 'id, name, type, project, major_group, group_name, substr(description, 1, 70) AS desc'
    : 'id, name, project, group_name, substr(description, 1, 70) AS desc';
  const row = db.prepare(`SELECT ${columns} FROM ${table} WHERE id = ?`).get(id);
  console.log(' ', row ?? `NOT FOUND: ${id}`);
}

console.log('\n=== FTE row with source_file populated (unique to FTE scrape) ===');
const fteWithSource = db.prepare(`
  SELECT id, name, source_file, substr(description, 1, 70) AS desc
  FROM kb_cvars
  WHERE project = 'fte' AND source_file IS NOT NULL
  LIMIT 3
`).all();
for (const row of fteWithSource) console.log(' ', row);

console.log('\n=== import log (latest 6 runs) ===');
for (const row of db.prepare(`SELECT * FROM kb_facts_import_log ORDER BY id DESC LIMIT 6`).all()) {
  console.log(`  [${row.imported_at}] ${row.project}:${row.entity_type} ${row.rows_inserted}+${row.rows_updated} from ${row.source_file}`);
}

db.close();
