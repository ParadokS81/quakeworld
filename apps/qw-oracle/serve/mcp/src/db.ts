// Uses bun:sqlite (built-in to Bun) instead of better-sqlite3 because the
// native better-sqlite3 binding does not load under Bun. The rest of the
// qw-oracle scripts run on Node + better-sqlite3; only the MCP server runs
// on Bun. Both point at the same data/qw.db file.

import { Database } from 'bun:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// serve/mcp/src -> serve/mcp -> serve -> qw-oracle -> data/qw.db
const DB_PATH = resolve(__dirname, '..', '..', '..', 'data', 'qw.db');

export const db = new Database(DB_PATH, { readonly: true });
