// apps/qw-oracle/scripts/load-knowledge/review/types.ts
//
// Public types for the extraction-review CLI subcommand.
// Consumed by the five findings-*.ts modules, index.ts, draft-writer.ts,
// and by the extraction-review skill on the stdout side.
// Keep stable: skill prompt pattern-matches field names at runtime.

import type { Project } from '../types.js';

export type Bucket =
  | 'addition'
  | 'retirement'
  | 'semantic-crossing'
  | 'unclassified'
  | 'source-invisible';

export type DispositionKind =
  | 'classify'
  | 'mark-orphan'
  | 'concept-note'
  | 'handover'
  | 'reject-as-noise';

export interface FindingEvidence {
  entity_ref?: string;
  relation_row_key?: string;
  commit_sha?: string;
  source_file?: string;
  source_line?: number;
  from_value?: string;
  to_value?: string;
  release_note_body?: string;
}

export interface ProposedDisposition {
  kind: DispositionKind;
  rationale: string;
}

export interface Finding {
  id: string;
  bucket: Bucket;
  summary: string;
  evidence: FindingEvidence;
  proposed_disposition?: ProposedDisposition;
}

export interface ReviewCounts {
  addition: number;
  retirement: number;
  'semantic-crossing': number;
  unclassified: number;
  'source-invisible': number;
}

export interface ReviewReport {
  project: Project;
  from_version: string;
  to_version: string;
  generated_at: string;
  draft_path: string;
  counts: ReviewCounts;
  findings: Finding[];
}

// Helper for finding-id stability across re-runs of the same (project, from, to).
// Keep implementation in a single place so callers can't drift.
export function makeFindingId(bucket: Bucket, naturalKey: string): string {
  // Deterministic and short; collisions across buckets are allowed because
  // the bucket is part of the stored Finding anyway.
  return `${bucket}:${naturalKey}`;
}
