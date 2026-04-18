// apps/qw-oracle/scripts/load-knowledge/transitions.ts

import type Database from 'better-sqlite3';
import type { SourceState, TransitionReason } from './types.js';

export interface TransitionInput {
  entity_id: number;
  from_state: SourceState | '';
  to_state: SourceState;
  reason: TransitionReason;
  version_context: string | null;
  extractor_run_id: string;
}

export function logTransition(db: Database.Database, input: TransitionInput): void {
  db.prepare(`
    INSERT INTO source_state_transitions
      (entity_id, from_state, to_state, reason, version_context, extractor_run_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.entity_id,
    input.from_state,
    input.to_state,
    input.reason,
    input.version_context,
    input.extractor_run_id,
    new Date().toISOString(),
  );
}
