// Two readonly handles. Layer 1 (structured engine facts) lives in
// knowledge.db; Layer 2 (community chat corpus) lives in qw.db. They sit
// next to each other in apps/qw-oracle/data/. bun:sqlite is used because
// the native better-sqlite3 binding does not load under Bun.

import { Database } from 'bun:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// serve/mcp/src -> serve/mcp -> serve -> qw-oracle -> data/
const DATA_DIR = resolve(__dirname, '..', '..', '..', 'data');

export const knowledgeDb = new Database(resolve(DATA_DIR, 'knowledge.db'), { readonly: true });
export const corpusDb = new Database(resolve(DATA_DIR, 'qw.db'), { readonly: true });
