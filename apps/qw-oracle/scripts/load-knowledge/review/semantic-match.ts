// apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts
//
// Semantic pass for source-invisible (Q5 / release-notes) findings per
// spec §1.2. Runs after mechanical cluster detection; matches each Q5
// bullet's body against existing non-Q5 clusters using two heuristic
// signals, and proposes (proposal, not mandate) a cluster_id on the
// finding.
//
// Two-stage detector:
//  1. Direct signal: entity-name token overlap between the release-note
//     body and cluster members' entity names, with a shared-prefix fuzzy
//     match (downloadable <-> downloads, transparency <-> verfortrans).
//  2. Theme extension: once a cluster attracts >=1 Q5 bullet via the
//     direct signal, pull in other Q5 bullets that share the same
//     commit-message-style prefix (SECURITY:, PROTOCOL:, RENDERER:, ...).
//     This is the pattern the 3.6.5 -> 3.6.6 walk hit when #64 + #79
//     needed to join the security cluster despite lacking entity-name
//     overlap -- they shared the "SECURITY:" theme with #65 + #66.
//
// Deterministic by design: no LLM call. The "LLM-driven" framing in the
// spec refers to the shape of judgment (fuzzy theme/keyword matching)
// rather than a literal API call. A mechanical implementation using the
// same signal set hits the regression target and remains testable.

import type { Cluster, Finding } from './types.js';

const MIN_TOKEN_LEN = 4;
const SHARED_PREFIX_THRESHOLD = 5;

// Words that show up in release-note bodies but carry no cluster signal.
// Kept short; expand only when a false-positive is observed.
const STOPWORDS = new Set([
  'add', 'added', 'adds', 'adding',
  'fix', 'fixed', 'fixes', 'fixing',
  'make', 'makes', 'made', 'making',
  'use', 'uses', 'used', 'using',
  'remove', 'removed', 'removes',
  'update', 'updated', 'updates',
  'support', 'supports',
  'allow', 'allows', 'allowed',
  'only', 'also', 'more', 'less',
  'actually', 'originally', 'previously',
  'through', 'where', 'which', 'from',
  'this', 'that', 'these', 'those',
  'with', 'without', 'into', 'onto',
  'been', 'being', 'have', 'having',
  'when', 'while', 'will', 'would',
  'some', 'most', 'many', 'much',
  'now', 'not', 'yet', 'half',
  'new', 'old',
]);

// Commit-message-style theme prefixes. Matched at the start of a release
// note body ("SECURITY: ...", "PROTOCOL: ..."). Used by the theme-extension
// pass to pull siblings into a cluster that already has >=1 Q5 member.
const THEME_PREFIX_RE = /^([A-Z][A-Z0-9_]{1,15}):\s/;

export interface RunSemanticMatchOptions {
  minScore?: number; // default 1
}

export interface SemanticMatchResult {
  findings: Finding[];
}

/**
 * Annotates source-invisible findings with proposed_cluster_id +
 * match_rationale. Non-source-invisible findings pass through unchanged.
 */
export function runSemanticMatch(
  findings: readonly Finding[],
  clusters: readonly Cluster[],
  options: RunSemanticMatchOptions = {},
): SemanticMatchResult {
  const minScore = options.minScore ?? 1;
  // Only clusters whose members are NOT exclusively source-invisible are
  // valid targets. In practice Session 1 clusters are all entity-based,
  // but guard defensively.
  const targetClusters = clusters.filter((c) =>
    c.members.some((m) => !m.startsWith('source-invisible:')),
  );
  if (targetClusters.length === 0) {
    return { findings: findings.map((f) => ({ ...f })) };
  }

  const findingById = new Map<string, Finding>();
  for (const f of findings) findingById.set(f.id, f);

  // Precompute cluster -> { memberNames[], themeCounts{prefix: count} }.
  const clusterIndex = targetClusters.map((c) => {
    const memberNames: string[] = [];
    const memberThemes = new Map<string, number>();
    for (const memberId of c.members) {
      const name = entityNameFromMemberId(memberId);
      if (name) memberNames.push(name);
      const f = findingById.get(memberId);
      if (f) {
        const theme = extractTheme(f.evidence.to_value ?? '')
          ?? extractTheme(f.evidence.from_value ?? '');
        if (theme) memberThemes.set(theme, (memberThemes.get(theme) ?? 0) + 1);
      }
    }
    return { cluster: c, memberNames, memberThemes };
  });

  // Stage 1: direct entity-name overlap per source-invisible finding.
  interface Proposal {
    cluster_id: string;
    rationale: string;
    score: number;
    matchedTokens: string[];
    matchedMembers: string[];
  }
  const proposals = new Map<string, Proposal>();
  const themeByCluster = new Map<string, Map<string, number>>();

  for (const f of findings) {
    if (f.bucket !== 'source-invisible') continue;
    const body = f.evidence.release_note_body ?? '';
    if (!body.trim()) continue;
    const bodyTokens = tokenizeBody(body);
    if (bodyTokens.length === 0) continue;

    let best: Proposal | null = null;
    for (const entry of clusterIndex) {
      let score = 0;
      const matchedTokens = new Set<string>();
      const matchedMembers = new Set<string>();
      for (const memberName of entry.memberNames) {
        const memberTokens = tokenizeName(memberName);
        for (const bt of bodyTokens) {
          if (matchedTokens.has(bt)) continue;
          for (const mt of memberTokens) {
            if (tokensFuzzyMatch(bt, mt)) {
              score += 1;
              matchedTokens.add(bt);
              matchedMembers.add(memberName);
              break;
            }
          }
        }
      }
      if (score >= minScore) {
        if (best === null || score > best.score) {
          const tokenList = [...matchedTokens].sort();
          const memberList = [...matchedMembers].sort();
          const rationale = buildDirectRationale(tokenList, memberList);
          best = {
            cluster_id: entry.cluster.cluster_id,
            rationale,
            score,
            matchedTokens: tokenList,
            matchedMembers: memberList,
          };
        }
      }
    }
    if (best) {
      proposals.set(f.id, best);
      const theme = extractTheme(body);
      if (theme) {
        let byCluster = themeByCluster.get(best.cluster_id);
        if (!byCluster) {
          byCluster = new Map<string, number>();
          themeByCluster.set(best.cluster_id, byCluster);
        }
        byCluster.set(theme, (byCluster.get(theme) ?? 0) + 1);
      }
    }
  }

  // Stage 2: theme extension. For each cluster that attracted >=1 Q5
  // finding in stage 1, pull in unattracted Q5 findings whose body
  // starts with the same theme prefix.
  for (const f of findings) {
    if (f.bucket !== 'source-invisible') continue;
    if (proposals.has(f.id)) continue;
    const body = f.evidence.release_note_body ?? '';
    const theme = extractTheme(body);
    if (!theme) continue;

    let best: { cluster_id: string; count: number } | null = null;
    for (const [clusterId, themeCounts] of themeByCluster) {
      const count = themeCounts.get(theme) ?? 0;
      if (count === 0) continue;
      if (best === null || count > best.count) {
        best = { cluster_id: clusterId, count };
      }
    }
    if (best) {
      const rationale =
        `Shared "${theme}:" theme with ${best.count} Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.`;
      proposals.set(f.id, {
        cluster_id: best.cluster_id,
        rationale,
        score: 0,
        matchedTokens: [],
        matchedMembers: [],
      });
    }
  }

  // Emit annotated findings.
  const annotated = findings.map((f) => {
    const p = proposals.get(f.id);
    if (!p) return { ...f };
    return {
      ...f,
      proposed_cluster_id: p.cluster_id,
      match_rationale: p.rationale,
    };
  });

  return { findings: annotated };
}

function entityNameFromMemberId(memberId: string): string | null {
  // "<bucket>:<project>:<type>:<name>" -> "<name>" (lowercased).
  const parts = memberId.split(':');
  if (parts.length < 4) return null;
  return parts.slice(3).join(':').toLowerCase();
}

function tokenizeBody(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of body
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(/\s+/)) {
    if (tok.length < MIN_TOKEN_LEN) continue;
    if (STOPWORDS.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue; // drop bare numbers like "2013"
    if (seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
  }
  return out;
}

function tokenizeName(name: string): string[] {
  const out: string[] = [];
  for (const tok of name.toLowerCase().split('_')) {
    if (tok.length < MIN_TOKEN_LEN) continue;
    out.push(tok);
  }
  return out;
}

/**
 * True if `bt` (a release-note body token) and `mt` (an entity-name token)
 * are related in a way that justifies a keyword match:
 *  - exact match, or
 *  - containment either way, but only if the longer side is a multi-token
 *    identifier (contains '_'); this blocks "executed" (English) from
 *    matching "exec" (code identifier) while keeping "fte_pext_trans"
 *    matching "pext", and
 *  - shared prefix of at least SHARED_PREFIX_THRESHOLD chars, only when
 *    both sides are at least SHARED_PREFIX_THRESHOLD chars (downloadable
 *    <-> downloads, transparency <-> verfortrans).
 */
function tokensFuzzyMatch(bt: string, mt: string): boolean {
  if (bt === mt) return true;
  const minLen = Math.min(bt.length, mt.length);
  if (minLen < SHARED_PREFIX_THRESHOLD) {
    // Shorter side is <5 chars. Containment risks matching a code
    // identifier to a natural-language word with a coincidental root.
    // Gate on longer side being a multi-token identifier (has '_').
    const longer = bt.length >= mt.length ? bt : mt;
    if (!longer.includes('_')) return false;
    return bt.includes(mt) || mt.includes(bt);
  }
  if (bt.includes(mt) || mt.includes(bt)) return true;
  return sharedPrefixLen(bt, mt) >= SHARED_PREFIX_THRESHOLD;
}

function sharedPrefixLen(a: string, b: string): number {
  const min = Math.min(a.length, b.length);
  let i = 0;
  while (i < min && a[i] === b[i]) i += 1;
  return i;
}

function extractTheme(body: string): string | null {
  const m = THEME_PREFIX_RE.exec(body);
  return m ? m[1]! : null;
}

function buildDirectRationale(tokens: readonly string[], members: readonly string[]): string {
  const tokenPart = tokens.length === 1
    ? `token "${tokens[0]}"`
    : `tokens [${tokens.map((t) => `"${t}"`).join(', ')}]`;
  const memberPart = members.length === 1
    ? `cluster member \`${members[0]}\``
    : `cluster members [${members.map((m) => `\`${m}\``).join(', ')}]`;
  return `Entity-name keyword overlap: ${tokenPart} in release-note body matched ${memberPart}.`;
}
