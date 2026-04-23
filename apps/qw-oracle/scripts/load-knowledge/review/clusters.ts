// apps/qw-oracle/scripts/load-knowledge/review/clusters.ts
//
// Mechanical cluster detection for the extraction-review CLI.
// Runs over the full findings list (cross-category: addition, retirement,
// semantic-crossing, unclassified, source-invisible) after findings assembly
// and before draft emit.
//
// Spec: docs/superpowers/specs/2026-04-24-extraction-review-skill-tweaks.md
// (§1.1 mechanical pass, §1.3 cross-category merge, §7 regression target).
// Semantic Q5 matching (§1.2) is deferred to Session 3 and is not implemented
// here; release-notes findings therefore cluster only when they happen to
// carry an entity_ref (rare for Q5) — in practice they stay unclustered
// until the semantic pass ships.

import type { Cluster, ClusterConfidence, Finding } from './types.js';
import { commitTimestamps } from '../git.js';

// Window (seconds) over committer timestamps (%ct). Sliding / transitive:
// consecutive commits within CLUSTER_COMMIT_WINDOW_SECONDS of each other
// share a window id. Uses %ct rather than %at because cluster detection asks
// "did these commits LAND together" not "were they AUTHORED together".
//
// Threshold-TBD — see spec §8. Starting value 60s matches spec §1.1's
// proposed initial and is validated against the 3.6.5 -> 3.6.6 regression
// target: the three cl_allow_* / cl_remote_capabilities commits landed in a
// 3-second window (2024-12-31 11:42:47 -> 11:42:50 UTC+1), well inside 60s.
// Calibrate after first Phase 2f pair if false-positive / false-negative
// rates diverge.
const CLUSTER_COMMIT_WINDOW_SECONDS = 60;

// 1-token prefixes that are too generic to cluster on by themselves.
// Match thousands of unrelated entities; anti-heuristic per spec §1.1.
// Only applies to 1-token prefix emission (≥5 char / ≥3 siblings branch);
// 2+ token prefixes starting with one of these tokens remain specific
// enough to keep (e.g. `cl_allow`, `scr_scoreboard`).
const GENERIC_PREFIX_TOKENS = new Set(['cl', 'sv', 'r', 'cvar', 'cmd']);

// Minimum length for a 1-token (no underscore) entity-name prefix.
const SINGLE_TOKEN_PREFIX_MIN_LEN = 5;
// Minimum siblings required for a 1-token prefix to qualify. 2+ token
// prefixes qualify at ≥2 siblings per spec §1.1.
const SINGLE_TOKEN_PREFIX_MIN_SIBLINGS = 3;
const MULTI_TOKEN_PREFIX_MIN_SIBLINGS = 2;

interface SignalKey {
  key: string;
  strength: 'strong' | 'medium';
}

export interface DetectClustersOptions {
  ezquakeRepoPath: string | null;
}

export interface DetectClustersResult {
  clusters: Cluster[];
  findings: Finding[];
}

/**
 * Assigns cluster_id to each finding and returns the discovered clusters.
 * Inputs are not mutated; findings are returned as new objects with
 * cluster_id set (null when the finding is not a cluster member).
 */
export function detectClusters(
  findings: readonly Finding[],
  options: DetectClustersOptions,
): DetectClustersResult {
  const commitTsByFinding = lookupCommitTimestamps(findings, options.ezquakeRepoPath);
  const commitWindowByFinding = assignCommitWindows(findings, commitTsByFinding);
  const prefixKeyByFinding = computePrefixKeys(findings);

  // Emit all signal keys per finding.
  const keysByFinding = new Map<string, SignalKey[]>();
  for (const f of findings) {
    const keys: SignalKey[] = [];
    if (f.evidence.commit_sha && f.evidence.commit_sha !== 'UNKNOWN') {
      keys.push({ key: `commit:${shortSha(f.evidence.commit_sha)}`, strength: 'strong' });
    }
    if (typeof f.evidence.pr_number === 'number') {
      keys.push({ key: `pr:${f.evidence.pr_number}`, strength: 'strong' });
    }
    const windowId = commitWindowByFinding.get(f.id);
    if (windowId !== undefined) {
      keys.push({ key: `commit-window:${windowId}`, strength: 'medium' });
    }
    for (const p of prefixKeyByFinding.get(f.id) ?? []) {
      keys.push({ key: `prefix:${p}`, strength: 'medium' });
    }
    keysByFinding.set(f.id, keys);
  }

  // Union-find across shared keys. Findings sharing any key merge.
  const parent = new Map<string, string>();
  for (const f of findings) parent.set(f.id, f.id);
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r)! !== r) r = parent.get(r)!;
    let cur = x;
    while (parent.get(cur)! !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, r);
      cur = next;
    }
    return r;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const keyToFirst = new Map<string, string>();
  for (const [findingId, keys] of keysByFinding) {
    for (const { key } of keys) {
      const prev = keyToFirst.get(key);
      if (prev === undefined) keyToFirst.set(key, findingId);
      else union(findingId, prev);
    }
  }

  // Group findings by root; skip singletons.
  const groups = new Map<string, string[]>();
  for (const f of findings) {
    const root = find(f.id);
    let bucket = groups.get(root);
    if (!bucket) {
      bucket = [];
      groups.set(root, bucket);
    }
    bucket.push(f.id);
  }

  const findingById = new Map<string, Finding>();
  for (const f of findings) findingById.set(f.id, f);

  const clusters: Cluster[] = [];
  const clusterIdByFinding = new Map<string, string>();
  const usedSlugs = new Map<string, number>();

  for (const [, memberIds] of groups) {
    if (memberIds.length < 2) continue;

    // Aggregate signals across members.
    const signalSet = new Set<string>();
    let hasStrong = false;
    let hasMedium = false;
    for (const id of memberIds) {
      for (const { key, strength } of keysByFinding.get(id) ?? []) {
        signalSet.add(key);
        if (strength === 'strong') hasStrong = true;
        else if (strength === 'medium') hasMedium = true;
      }
    }
    // Anti-heuristic: a cluster with no strong-or-medium signal doesn't
    // qualify. In the current key set (author-window deliberately skipped
    // for Session 1), this can only happen if some future weak key is
    // added. Defensive.
    if (!hasStrong && !hasMedium) continue;

    const confidence: ClusterConfidence = hasStrong ? 'strong' : hasMedium ? 'medium' : 'weak';

    const memberFindings = memberIds
      .map((id) => findingById.get(id)!)
      .sort((a, b) => a.id.localeCompare(b.id));

    const slug = uniqueSlug(makeSlug(memberFindings, signalSet), usedSlugs);
    const clusterId = slug;

    const sortedSignals = [...signalSet].sort();

    clusters.push({
      cluster_id: clusterId,
      confidence,
      signals: sortedSignals,
      members: memberFindings.map((m) => m.id),
    });
    for (const m of memberFindings) clusterIdByFinding.set(m.id, clusterId);
  }

  // Stable cluster ordering: by confidence (strong first), then member
  // count desc, then cluster_id asc.
  clusters.sort((a, b) => {
    const rank = (c: ClusterConfidence): number =>
      c === 'strong' ? 0 : c === 'medium' ? 1 : 2;
    if (rank(a.confidence) !== rank(b.confidence)) return rank(a.confidence) - rank(b.confidence);
    if (a.members.length !== b.members.length) return b.members.length - a.members.length;
    return a.cluster_id.localeCompare(b.cluster_id);
  });

  const enriched = findings.map((f) => ({
    ...f,
    cluster_id: clusterIdByFinding.get(f.id) ?? null,
  }));

  return { clusters, findings: enriched };
}

function lookupCommitTimestamps(
  findings: readonly Finding[],
  repoPath: string | null,
): Map<string, number> {
  const byFinding = new Map<string, number>();
  if (!repoPath) return byFinding;
  const shas = new Set<string>();
  for (const f of findings) if (f.evidence.commit_sha) shas.add(f.evidence.commit_sha);
  if (shas.size === 0) return byFinding;
  const tsBySha = commitTimestamps(repoPath, [...shas]);
  for (const f of findings) {
    const sha = f.evidence.commit_sha;
    if (!sha) continue;
    const ts = tsBySha.get(sha);
    if (ts !== undefined) byFinding.set(f.id, ts);
  }
  return byFinding;
}

/**
 * Sliding window over committer timestamps. Findings without a known
 * timestamp are omitted from the result (no commit-window key for them).
 */
function assignCommitWindows(
  findings: readonly Finding[],
  tsByFinding: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  const timed = findings
    .filter((f) => tsByFinding.has(f.id))
    .map((f) => ({ id: f.id, ts: tsByFinding.get(f.id)! }))
    .sort((a, b) => a.ts - b.ts);

  let windowId = 0;
  let prevTs = Number.NEGATIVE_INFINITY;
  for (const { id, ts } of timed) {
    if (ts - prevTs > CLUSTER_COMMIT_WINDOW_SECONDS) windowId += 1;
    out.set(id, windowId);
    prevTs = ts;
  }
  return out;
}

/**
 * For each finding, the set of prefix keys that qualify for clustering.
 * A prefix qualifies if it is shared by enough siblings:
 *  - 2+ underscore-delimited tokens, ≥2 siblings
 *  - OR 1 token, ≥5 chars, ≥3 siblings, not in the generic set.
 */
function computePrefixKeys(findings: readonly Finding[]): Map<string, string[]> {
  // Enumerate all candidate prefixes per finding (entity-ref derived),
  // then bucket by prefix and drop those below the sibling threshold.
  interface Candidate {
    findingId: string;
    prefix: string;
    numTokens: number;
  }
  const all: Candidate[] = [];
  for (const f of findings) {
    const name = entityName(f);
    if (!name) continue;
    const tokens = name.split('_');
    if (tokens.length === 1) {
      if (name.length >= SINGLE_TOKEN_PREFIX_MIN_LEN && !GENERIC_PREFIX_TOKENS.has(name)) {
        all.push({ findingId: f.id, prefix: name, numTokens: 1 });
      }
      continue;
    }
    // Multi-token: emit every proper prefix boundary. 1-token prefixes
    // (just tokens[0]) are allowed here too — the spec §1.1 "without _"
    // branch applies to the prefix string's own shape, not the entity's.
    for (let i = 1; i <= tokens.length - 1; i += 1) {
      const prefix = tokens.slice(0, i).join('_');
      if (i === 1) {
        if (prefix.length < SINGLE_TOKEN_PREFIX_MIN_LEN) continue;
        if (GENERIC_PREFIX_TOKENS.has(prefix)) continue;
      }
      all.push({ findingId: f.id, prefix, numTokens: i });
    }
  }

  const byPrefix = new Map<string, Candidate[]>();
  for (const c of all) {
    let bucket = byPrefix.get(c.prefix);
    if (!bucket) {
      bucket = [];
      byPrefix.set(c.prefix, bucket);
    }
    bucket.push(c);
  }

  const out = new Map<string, string[]>();
  for (const [prefix, bucket] of byPrefix) {
    const uniqueFindings = new Set(bucket.map((c) => c.findingId));
    const numTokens = bucket[0]?.numTokens ?? 0;
    const minSiblings =
      numTokens === 1 ? SINGLE_TOKEN_PREFIX_MIN_SIBLINGS : MULTI_TOKEN_PREFIX_MIN_SIBLINGS;
    if (uniqueFindings.size < minSiblings) continue;
    for (const fid of uniqueFindings) {
      let keys = out.get(fid);
      if (!keys) {
        keys = [];
        out.set(fid, keys);
      }
      keys.push(prefix);
    }
  }
  return out;
}

/**
 * Extract the entity name from a finding's evidence for prefix detection.
 * Pulls from entity_ref (project:type:name) when present. Relation-only
 * findings (asset_* rows) have no name-prefix semantics — skip.
 */
function entityName(f: Finding): string | null {
  const ref = f.evidence.entity_ref;
  if (!ref) return null;
  // canonical_id shape: <project>:<type>:<name>
  const parts = ref.split(':');
  if (parts.length < 3) return null;
  return parts.slice(2).join(':');
}

function shortSha(sha: string): string {
  return sha.slice(0, 8);
}

/**
 * Slug preference order per spec §1.1: shared name-prefix > commit-sha > PR.
 * The prefix must cover >=80% of members to qualify for the prefix slug.
 */
function makeSlug(members: readonly Finding[], signals: ReadonlySet<string>): string {
  // Collect prefix signals present in the cluster. Pick the longest one
  // covering >=80% of members.
  const prefixSignals = [...signals].filter((s) => s.startsWith('prefix:'));
  if (prefixSignals.length > 0) {
    const prefixes = prefixSignals
      .map((s) => s.slice('prefix:'.length))
      .sort((a, b) => b.length - a.length);
    for (const prefix of prefixes) {
      const tokens = prefix.split('_');
      const covered = members.filter((m) => {
        const name = entityName(m);
        if (!name) return false;
        const nameTokens = name.split('_');
        if (nameTokens.length < tokens.length) return false;
        for (let i = 0; i < tokens.length; i += 1) {
          if (nameTokens[i] !== tokens[i]) return false;
        }
        return true;
      }).length;
      if (covered / members.length >= 0.8) return `${prefix}-family`;
    }
  }

  const commitSignals = [...signals].filter((s) => s.startsWith('commit:'));
  if (commitSignals.length > 0) {
    // Prefer the commit-sha that covers the most members.
    const commitCounts = new Map<string, number>();
    for (const m of members) {
      const sha = m.evidence.commit_sha;
      if (!sha) continue;
      const key = `commit:${shortSha(sha)}`;
      if (!commitSignals.includes(key)) continue;
      commitCounts.set(key, (commitCounts.get(key) ?? 0) + 1);
    }
    let best = '';
    let bestCount = -1;
    for (const [k, c] of commitCounts) {
      if (c > bestCount || (c === bestCount && k < best)) {
        best = k;
        bestCount = c;
      }
    }
    if (best) return best.replace(':', '-');
  }

  const prSignals = [...signals].filter((s) => s.startsWith('pr:'));
  if (prSignals.length > 0) {
    return prSignals.sort()[0]!.replace(':', '-');
  }

  // Fallback: synthesize from first member id.
  return `cluster-${members[0]!.id.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`;
}

function uniqueSlug(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  if (count === 0) return base;
  return `${base}-${count + 1}`;
}
