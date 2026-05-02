// apps/qw-oracle/scripts/load-knowledge/transitions.ts

import type postgres from 'postgres';
import type { SourceState, TransitionReason } from './types.js';

export interface TransitionInput {
  entity_id: number;
  from_state: SourceState | '';
  to_state: SourceState;
  reason: TransitionReason;
  version_context: string | null;
  extractor_run_id: string;
}

export async function logTransition(tx: postgres.TransactionSql<{}>, input: TransitionInput): Promise<void> {
  await tx`
    INSERT INTO source_state_transitions
      (entity_id, from_state, to_state, reason, version_context, extractor_run_id, created_at)
    VALUES
      (${input.entity_id}, ${input.from_state}, ${input.to_state}, ${input.reason}, ${input.version_context}, ${input.extractor_run_id}, ${new Date().toISOString()})
  `;
}
