// Schema-apply smoke. Tests fresh-DB and migration paths.
// Run with: npx tsx scripts/load-knowledge/_smoke-v14-schema.ts
import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { applySchema, SCHEMA_VERSION } from './schema';

function dump(db: Database.Database, label: string) {
  const meta = db.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get() as any;
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'gameplay_%' ORDER BY name`).all();
  console.log(`${label}: schema_version=${meta?.value}, tables=${JSON.stringify(tables)}`);
}

// Fresh-DB path
fs.rmSync('/tmp/v14-fresh.db', { force: true });
const fresh = new Database('/tmp/v14-fresh.db');
applySchema(fresh);
dump(fresh, 'fresh');
fresh.close();

// Migration path: simulate a v13 DB then apply schema
fs.rmSync('/tmp/v14-migrate.db', { force: true });
const old = new Database('/tmp/v14-migrate.db');
// Apply schema once with VERSION temporarily forced to 13... easier to copy live DB if it's v13.
// Simpler: copy live data/knowledge.db (which is at v13 per pre-flight) and apply.
old.close();
fs.copyFileSync('data/knowledge.db', '/tmp/v14-migrate.db');
const migrated = new Database('/tmp/v14-migrate.db');
applySchema(migrated);
dump(migrated, 'migrated');
console.log(`SCHEMA_VERSION constant: ${SCHEMA_VERSION}`);
migrated.close();
