// apps/qw-oracle/scripts/load-knowledge/review/prior-walks.ts
//
// Cross-walk detection per spec §2.1. Scans apps/qw-oracle/docs/reviews/*.md
// for prior walk drafts, extracts their cluster index (signals, members,
// majority disposition), and annotates current-walk clusters with
// prior_cluster_refs[] when any signal overlaps.
//
// Rule coverage (spec §2.1):
//   1. shared commit-sha  — strong, signal-only
//   2. shared PR-number   — strong, signal-only
//   3. shared entity-prefix + ≥1 shared member entity-ref — strong
//   4. shared topic / concept-note slug (when prior dispositioned to
//      concept-note) — medium. Implemented indirectly via skill-side
//      §3 scope-tracking, which already walks the concept-notes
//      directory; re-deriving it here would duplicate that work.
//
// For the 3.6.5 -> 3.6.6 regression, no priors exist and this module is
// a no-op. First real use is the next Phase 2f pair.

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Cluster, PriorClusterRef } from './types.js';

export interface PriorWalkCluster {
  walk_file: string;
  walk_label: string;
  project: string;
  from_version: string;
  to_version: string;
  generated_at: string;
  cluster_id: string;
  signals: string[];
  members: string[];
  majority_disposition: string | null;
}

export interface LoadPriorWalksOptions {
  reviewsDir: string;
  currentProject: string;
  currentFrom: string;
  currentTo: string;
}

/**
 * Reads every *.md under reviewsDir, parses the frontmatter + ## Clusters +
 * per-finding dispositions, and returns all clusters except those from the
 * current walk's own draft (matched by project + from + to).
 *
 * Drafts without a ## Clusters section (pre-Session 1) contribute nothing
 * and are silently ignored.
 */
export function loadPriorWalks(options: LoadPriorWalksOptions): PriorWalkCluster[] {
  const out: PriorWalkCluster[] = [];
  let entries: string[];
  try {
    entries = readdirSync(options.reviewsDir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const full = join(options.reviewsDir, entry);
    const md = readFileSync(full, 'utf-8');
    const parsed = parseWalkDraft(md, entry);
    if (!parsed) continue;
    if (
      parsed.project === options.currentProject &&
      parsed.from_version === options.currentFrom &&
      parsed.to_version === options.currentTo
    ) {
      continue;
    }
    for (const c of parsed.clusters) out.push(c);
  }
  return out;
}

/**
 * Attaches prior_cluster_refs[] to each cluster when any prior walk's
 * cluster shares a signal. Clusters without matches are returned unchanged.
 */
export function annotatePriorRefs(
  clusters: readonly Cluster[],
  priorWalks: readonly PriorWalkCluster[],
): Cluster[] {
  if (priorWalks.length === 0) {
    return clusters.map((c) => ({ ...c }));
  }
  return clusters.map((c) => {
    const refs: PriorClusterRef[] = [];
    for (const prior of priorWalks) {
      const ref = matchPriorCluster(c, prior);
      if (ref) refs.push(ref);
    }
    if (refs.length === 0) return { ...c };
    refs.sort((a, b) => a.walk_label.localeCompare(b.walk_label));
    return { ...c, prior_cluster_refs: refs };
  });
}

interface ParsedDraft {
  project: string;
  from_version: string;
  to_version: string;
  generated_at: string;
  clusters: PriorWalkCluster[];
}

function parseWalkDraft(md: string, filename: string): ParsedDraft | null {
  const fm = parseFrontmatter(md);
  if (!fm) return null;
  const project = fm['project'];
  const from_version = fm['from_version'];
  const to_version = fm['to_version'];
  const generated_at = fm['generated_at'] ?? '';
  if (!project || !from_version || !to_version) return null;

  const walkDate = generated_at.slice(0, 10);
  const walkLabel = walkDate
    ? `${project} ${from_version} -> ${to_version} (${walkDate})`
    : `${project} ${from_version} -> ${to_version}`;

  const rawClusters = parseClustersSection(md);
  const dispByFinding = parseFindingDispositions(md);
  const clusters: PriorWalkCluster[] = rawClusters.map((c) => {
    const dispositions = c.members
      .map((m) => dispByFinding.get(m))
      .filter((d): d is string => typeof d === 'string');
    return {
      walk_file: filename,
      walk_label: walkLabel,
      project,
      from_version,
      to_version,
      generated_at,
      cluster_id: c.cluster_id,
      signals: c.signals,
      members: c.members,
      majority_disposition: majorityOf(dispositions),
    };
  });

  return { project, from_version, to_version, generated_at, clusters };
}

function parseFrontmatter(md: string): Record<string, string> | null {
  if (!md.startsWith('---\n')) return null;
  const end = md.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const body = md.slice(4, end);
  const fields: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) fields[key] = val;
  }
  return fields;
}

interface RawCluster {
  cluster_id: string;
  signals: string[];
  members: string[];
}

function parseClustersSection(md: string): RawCluster[] {
  const sectionHeader = '\n## Clusters\n';
  const start = md.indexOf(sectionHeader);
  if (start === -1) return [];
  const afterHeader = start + sectionHeader.length;
  const nextHeading = md.indexOf('\n## ', afterHeader);
  const sectionEnd = nextHeading === -1 ? md.length : nextHeading + 1;
  const body = md.slice(afterHeader, sectionEnd);
  if (body.trim().startsWith('_No clusters detected')) return [];

  const out: RawCluster[] = [];
  const blocks = body.split(/(?=^### cluster:)/m);
  for (const block of blocks) {
    const headerMatch = block.match(/^### cluster:([^\s(]+)/m);
    if (!headerMatch) continue;
    const clusterId = headerMatch[1]!;
    const signalsMatch = block.match(/^Signals:\s*(.+)$/m);
    const signals = signalsMatch
      ? signalsMatch[1]!.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
      : [];
    const members: string[] = [];
    const membersHeader = block.indexOf('\nMembers');
    if (membersHeader !== -1) {
      const rest = block.slice(membersHeader);
      for (const line of rest.split('\n')) {
        const m = line.match(/^-\s+(\S.*)$/);
        if (m) members.push(m[1]!.trim());
      }
    }
    out.push({ cluster_id: clusterId, signals, members });
  }
  return out;
}

function parseFindingDispositions(md: string): Map<string, string> {
  const out = new Map<string, string>();
  const findingsIdx = md.indexOf('\n## Findings\n');
  if (findingsIdx === -1) return out;
  const body = md.slice(findingsIdx);
  const blocks = body.split(/(?=^### )/m);
  for (const block of blocks) {
    const headerMatch = block.match(/^### (\S+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1]!;
    const dispMatch = block.match(/^\*\*Proposed disposition:\*\*\s+(\S+)/m);
    if (!dispMatch) continue;
    const disp = dispMatch[1]!;
    if (disp === '_(pending)_') continue;
    out.set(id, disp);
  }
  return out;
}

function majorityOf(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount || (c === bestCount && best !== null && k < best)) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

function matchPriorCluster(cluster: Cluster, prior: PriorWalkCluster): PriorClusterRef | null {
  const priorSignals = new Set(prior.signals);
  const sharedCommit: string[] = [];
  const sharedPr: string[] = [];
  const sharedPrefix: string[] = [];
  for (const s of cluster.signals) {
    if (!priorSignals.has(s)) continue;
    if (s.startsWith('commit:')) sharedCommit.push(s);
    else if (s.startsWith('pr:')) sharedPr.push(s);
    else if (s.startsWith('prefix:')) sharedPrefix.push(s);
  }

  if (sharedCommit.length > 0 || sharedPr.length > 0) {
    return buildRef(prior, [...sharedCommit, ...sharedPr], 'strong');
  }

  if (sharedPrefix.length > 0) {
    const priorEntityRefs = new Set(
      prior.members.map(memberEntityRef).filter((r): r is string => r !== null),
    );
    for (const m of cluster.members) {
      const ref = memberEntityRef(m);
      if (ref && priorEntityRefs.has(ref)) {
        return buildRef(prior, sharedPrefix, 'strong');
      }
    }
  }

  return null;
}

function buildRef(
  prior: PriorWalkCluster,
  signals: string[],
  strength: 'strong' | 'medium',
): PriorClusterRef {
  return {
    walk_file: prior.walk_file,
    walk_label: prior.walk_label,
    prior_cluster_id: prior.cluster_id,
    match_signals: signals,
    match_strength: strength,
    prior_member_count: prior.members.length,
    majority_disposition: prior.majority_disposition,
  };
}

function memberEntityRef(memberId: string): string | null {
  // memberId shape: "<bucket>:<project>:<type>:<name>"
  // Returns "<project>:<type>:<name>". Non-entity members (e.g.
  // source-invisible:release_notes:...) still return the tail string;
  // they won't match entity-ref-based priors by construction.
  const firstColon = memberId.indexOf(':');
  if (firstColon === -1) return null;
  return memberId.slice(firstColon + 1);
}
