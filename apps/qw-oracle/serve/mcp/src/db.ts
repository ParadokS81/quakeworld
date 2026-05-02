// apps/qw-oracle/serve/mcp/src/db.ts
//
// Single Postgres client for every MCP tool. Re-exports the project-wide
// shared client so the loader, the embed pipelines, and the MCP server all
// hit the same connection pool. The SQLite era's split between knowledgeDb
// (Layer 1) and corpusDb (Layer 2) is gone - one engine, all three layers,
// one client.
//
// The bun:sqlite imports that lived here previously are removed. Every
// consumer in serve/mcp/src/tools/ is rewritten in this phase.

export { db, closeDb } from '../../../shared/db.ts';
