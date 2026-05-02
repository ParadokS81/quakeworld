// apps/qw-oracle/scripts/load-knowledge/db.ts
//
// postgres-js Sql singleton for the Layer 1 loader. Connection URL comes
// from DATABASE_URL; the default targets the local Phase-1 dev container
// (apps/qw-oracle/db/docker-compose.dev.yml).
//
// Schema is owned by the migrator (db/migrations/), not this file. Run
// `bun db/migrate.ts` before invoking the loader against a fresh DB.

import postgres from 'postgres';

const DEFAULT_URL = 'postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle';

export const sql = postgres(process.env.DATABASE_URL ?? DEFAULT_URL, {
  // The migrator-applied schema includes generated columns (entities.description_tsv);
  // postgres-js's default notice handler is fine, but the loader prints its
  // own progress lines and we don't want NOTICE chatter mixed in.
  onnotice: () => {},
});

export async function closeSql(): Promise<void> {
  await sql.end();
}
