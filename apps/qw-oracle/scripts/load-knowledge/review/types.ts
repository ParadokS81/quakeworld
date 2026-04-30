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
  | 'source-invisible'
  | 'help-json-classification';

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
  pr_number?: number;
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

export type CrossCodebaseHint = 'likely-shared' | 'ezquake-only' | 'unknown';

export interface Finding {
  id: string;
  bucket: Bucket;
  summary: string;
  evidence: FindingEvidence;
  proposed_disposition?: ProposedDisposition;
  cluster_id?: string | null;
  // Semantic pass (§1.2): source-invisible findings may receive a
  // proposal to join a non-source-invisible cluster. Skill operator
  // confirms at preamble; CLI emits proposal + rationale only.
  proposed_cluster_id?: string | null;
  match_rationale?: string;
  // Cue-set classifier (§4): per-finding bias signal for concept-note
  // disposition when the entity's source region suggests analogs in
  // not-yet-walked codebases. CLI emits 'likely-shared' on cue match,
  // 'unknown' otherwise. Operator may override to 'ezquake-only'.
  cross_codebase_hint?: CrossCodebaseHint;
}

export type ClusterConfidence = 'strong' | 'medium' | 'weak';

// Cross-walk detection output per spec §2.1. Attached to a current-walk
// cluster when any prior walk's cluster shares a signal surface. The
// skill uses this to render the "EXTENDS PRIOR WALK" prompt at preamble.
export interface PriorClusterRef {
  walk_file: string;           // basename of the prior walk draft
  walk_label: string;          // "<project> <from> -> <to> (<date>)"
  prior_cluster_id: string;
  match_signals: string[];     // signals that overlap
  match_strength: 'strong' | 'medium';
  prior_member_count: number;
  majority_disposition: string | null;
}

export interface Cluster {
  cluster_id: string;
  confidence: ClusterConfidence;
  signals: string[];
  members: string[];
  prior_cluster_refs?: PriorClusterRef[];
}

export interface ReviewCounts {
  addition: number;
  retirement: number;
  'semantic-crossing': number;
  unclassified: number;
  'source-invisible': number;
  'help-json-classification': number;
}

export interface ReviewReport {
  project: Project;
  from_version: string;
  to_version: string;
  generated_at: string;
  draft_path: string;
  counts: ReviewCounts;
  findings: Finding[];
  clusters: Cluster[];
}

// Helper for finding-id stability across re-runs of the same (project, from, to).
// Keep implementation in a single place so callers can't drift.
export function makeFindingId(bucket: Bucket, naturalKey: string): string {
  // Deterministic and short; collisions across buckets are allowed because
  // the bucket is part of the stored Finding anyway.
  return `${bucket}:${naturalKey}`;
}
