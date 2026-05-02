// apps/qw-oracle/scripts/load-chat/build-session-references.ts
//
// Builds session_references from messages.referenced_message_id.
// Must run after build-sessions.ts (needs message_labels.session_id populated).
// Idempotent: TRUNCATE + rebuild.
//
// Algorithm:
//   For each message m that has a referenced_message_id:
//     - source_session = message_labels.session_id for m (may be NULL if m is bot/reaction)
//     - target_session = message_labels.session_id for the referenced message (may be NULL)
//     - If either session is NULL or source = target: skip.
//     - Otherwise: increment the (source, target) count.
//
// Usage:
//   bun scripts/load-chat/build-session-references.ts

import { db, closeDb } from '../../shared/db.ts';

async function main(): Promise<void> {
  console.log('[build-session-references] truncating session_references');
  await db`TRUNCATE session_references`;

  // Single INSERT ... SELECT aggregation over the reply graph.
  // Both source and target message_labels rows must have non-NULL session_id
  // (i.e., the replying message and the referenced message both belong to a
  // real chat/link session). Cross-session condition excludes within-session
  // replies (source_session_id <> target_session_id).
  await db`
    INSERT INTO session_references (source_session_id, target_session_id, reference_count)
    SELECT
      src_lbl.session_id  AS source_session_id,
      tgt_lbl.session_id  AS target_session_id,
      COUNT(*)::int       AS reference_count
    FROM messages m
    JOIN message_labels src_lbl ON src_lbl.message_id = m.id
    JOIN messages ref_m         ON ref_m.id = m.referenced_message_id
    JOIN message_labels tgt_lbl ON tgt_lbl.message_id = ref_m.id
    WHERE m.referenced_message_id IS NOT NULL
      AND src_lbl.session_id IS NOT NULL
      AND tgt_lbl.session_id IS NOT NULL
      AND src_lbl.session_id <> tgt_lbl.session_id
    GROUP BY src_lbl.session_id, tgt_lbl.session_id
    ON CONFLICT (source_session_id, target_session_id) DO UPDATE
      SET reference_count = EXCLUDED.reference_count
  `;
  console.log('[build-session-references] done');
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
