// apps/qw-oracle/scripts/load-knowledge/db.ts
//
// Opens the knowledge DB at apps/qw-oracle/data/knowledge.db,
// applies migrations, returns a better-sqlite3 handle.
// Gitignored - regenerable from extractor JSON.

import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { applySchema } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '..', '..', 'data', 'knowledge.db');

export function openKnowledgeDb(options: { path?: string; inMemory?: boolean } = {}): Database.Database {
  const target = options.inMemory ? ':memory:' : (options.path ?? DEFAULT_DB_PATH);

  if (!options.inMemory) {
    mkdirSync(dirname(target), { recursive: true });
  }

  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  applySchema(db);
  return db;
}
