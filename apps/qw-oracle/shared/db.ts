// apps/qw-oracle/shared/db.ts
//
// Single postgres-js client for every loader/script/MCP consumer in Arc 1+.
// Imported lazily by callers; the connection pool is process-scoped.

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

export const db = postgres(url, {
  // Quiet the NOTICE channel; loader output is already chatty enough.
  onnotice: () => {},
  // Sized for one MCP server + one loader process running concurrently.
  max: 16,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function closeDb(): Promise<void> {
  await db.end();
}
