// apps/qw-oracle/scripts/load-chat/thread-key.ts
//
// Deterministic thread-key helpers shared by the Phase A loader and the Phase C
// backfill. Lives here (load-chat/) because both consumers are in this subtree.
// A single shared module ensures delete-scope and insert-scope can never drift
// apart (R5 idempotency contract -- decisions.md D5).

import type { Sql } from 'postgres';

// D12: model + prompt version tag for this arc's fence pass. Bumping this
// value logically invalidates all prior chat_threads rows and triggers a full
// re-fence on the next backfill run -- intentional; the version is part of
// the thread_key UNIQUE constraint so old rows and new rows coexist until the
// old scope is explicitly deleted.
export const RECONSTRUCTION_VERSION = 'fence-sonnet-v1';

// v1 = increment-1 probe scaffolding (cap 750 / 3h gap, Feb-Mar 2021 only);
// v2 = production full-corpus (12h gap / cap 1500 + resolution_status passenger).
export const PRODUCTION_VERSION = 'fence-sonnet-v2';

export interface ThreadKeyParts {
  channel: string;
  reconstructionVersion: string;
  chunkId: string;
  threadIndex: number;
}

// Produces the UNIQUE DB key for a thread. Encoding: colon-delimited fields in
// stable order so any downstream parse can split on ':' at known positions
// without a schema lookup.
export function threadKey(p: ThreadKeyParts): string {
  return `${p.channel}:${p.reconstructionVersion}:${p.chunkId}:${p.threadIndex}`;
}

export interface BatchScope {
  channel: string;
  reconstructionVersion: string;
  rangeStart: string; // ISO timestamp, inclusive
  rangeEnd: string;   // ISO timestamp, exclusive
}

// Returns the postgres-js WHERE-clause fragment that EXACTLY covers the rows an
// INSERT for this scope writes (R5). Both the Phase A loader and the Phase C
// backfill build their idempotent "delete scope then re-insert" using this, so
// delete-scope and insert-scope can never drift apart.
//
// Scoped by date_range_start (a thread's date_range_start = min created_at of
// its member messages). Consistent with thread_key because chunks are
// within-channel and time-ordered, so a (channel, year) batch only ever touches
// that year's messages (decisions.md D5).
export function batchScopeClause(db: Sql, scope: BatchScope) {
  return db`channel_name = ${scope.channel}
            AND reconstruction_version = ${scope.reconstructionVersion}
            AND date_range_start >= ${scope.rangeStart}::timestamptz
            AND date_range_start <  ${scope.rangeEnd}::timestamptz`;
}
