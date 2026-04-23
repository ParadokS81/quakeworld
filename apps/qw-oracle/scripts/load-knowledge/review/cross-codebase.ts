// apps/qw-oracle/scripts/load-knowledge/review/cross-codebase.ts
//
// Cross-codebase hint classifier per spec §4.
// Pure cue-set detector over entity_ref: when the name or type matches a
// known cross-codebase surface (server-side cvars, protocol-extension cvars,
// ruleset primitives), emit 'likely-shared'. Otherwise 'unknown'.
//
// Rationale for not auto-emitting 'ezquake-only': the cue set lists positive
// cross-codebase signals only. Claiming 'ezquake-only' without a negative
// signal risks false confidence; the walk operator asserts it when the
// disposition research rules out analogs.

import type { CrossCodebaseHint, Finding } from './types.js';

// Entity types whose *entire membership* originates in another codebase.
// rulesets are a KTX concept that ezQuake observes; any ruleset entity
// (name = qcon | smackdown | thunderdome | smackdrive | etc.) carries the
// hint by type alone.
const SHARED_TYPES = new Set(['ruleset']);

// Name-pattern cues. Matched against the lowercase entity name. Any hit
// yields 'likely-shared'.
const SHARED_NAME_PATTERNS: readonly RegExp[] = [
  /^sv_/,              // server-side cvars; MVDSV/KTX analog expected
  /^pext_/,            // protocol-extension cvars (FTE origin)
  /_pext_/,            // mid-name pext (cl_pext_*, etc.)
  /^restrict_/,        // ruleset primitives (KTX origin)
];

export function classifyFinding(finding: Finding): CrossCodebaseHint {
  const ref = finding.evidence.entity_ref;
  if (!ref) return 'unknown';
  const parts = ref.split(':');
  if (parts.length < 3) return 'unknown';
  const type = parts[1] ?? '';
  const name = (parts.slice(2).join(':') || '').toLowerCase();

  if (SHARED_TYPES.has(type)) return 'likely-shared';
  for (const pat of SHARED_NAME_PATTERNS) {
    if (pat.test(name)) return 'likely-shared';
  }
  return 'unknown';
}

/**
 * Non-mutating: returns a new Finding[] with cross_codebase_hint populated.
 */
export function annotateCrossCodebase(findings: readonly Finding[]): Finding[] {
  return findings.map((f) => ({
    ...f,
    cross_codebase_hint: classifyFinding(f),
  }));
}
