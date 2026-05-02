// apps/qw-oracle/scripts/load-knowledge/constants.ts
//
// Runtime constants the loader pulls from a JS source. These used to live in
// schema.ts alongside the SQLite SQL blocks. After the Postgres port (Arc 1
// Phase 2), schema.ts is gone and the migrator in db/migrations/ owns the
// schema. The constants survive here so the loader, snapshot builder,
// quality-grid probes, and CLI dispatcher don't need to duplicate them.

export const SCHEMA_VERSION = 18;

// Sentinel ordinal for the per-project 'head' version row. Greater than any
// plausible release ordinal so first_seen / last_seen comparisons place head
// after every tagged release.
export const HEAD_ORDINAL = 999999;

// Mirrored by the SQL-level CHECK constraints on info_key_versions.scope and
// log_template_versions.channel. Keep in sync with the literal CHECK values
// in db/migrations/002_layer1_schema.sql when adding a new scope/channel.
export const INFO_KEY_SCOPES = ['userinfo', 'serverinfo', 'localinfo'] as const;
export const LOG_TEMPLATE_CHANNELS = ['broadcast', 'client', 'console', 'system'] as const;
