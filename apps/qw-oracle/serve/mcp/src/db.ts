// apps/qw-oracle/serve/mcp/src/db.ts
//
// Layer 1 (engine + game content) used to live in knowledge.db; Layer 2
// (community chat corpus) used to live in qw.db. Both have been retired
// by Arc 1 Phases 2 and 3 respectively. Phase 6 rewires this module to
// postgres-js. Until then, both exports are tripwires: any property access
// throws a named error so the failure surfaces clearly instead of as a
// confusing bun:sqlite file-not-found.

import type { Database } from 'bun:sqlite';

function makeStub(name: string): Database {
  const message =
    `MCP DB '${name}' is not yet rewired to Postgres. ` +
    `Arc 1 Phase 6 (mcp-rewrite) replaces bun:sqlite with postgres-js.`;
  return new Proxy({} as Database, {
    get() { throw new Error(message); },
    apply() { throw new Error(message); },
  });
}

export const knowledgeDb = makeStub('knowledge.db');
export const corpusDb = makeStub('qw.db');
