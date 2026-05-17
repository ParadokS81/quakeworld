// apps/qw-oracle/scripts/describe-fill/review-gate.ts
//
// The D7 two-tier review gate. Every `synthesized` description that the D6
// guardrailed synthesis skill (describe-fill-synthesis) proposes passes this
// gate before any phase commits it. The gate RE-CHECKS; it does not author,
// does not write the DB, and does not commit. It returns a typed result the
// consuming phase/smoke persists -- mirroring the skill->gate->phase
// separation (skill proposes, gate re-checks, phase persists).
//
// =====================================================================
// MODEL DIAL (LOCKED -- spec-locked by D7; NOT a planner/executor choice)
// =====================================================================
// Tier-1's semantic evidence re-check runs as an INDEPENDENT Opus 4.7
// invocation at MAX reasoning, SEPARATE from the D6 authoring context.
// This dial is spec-locked by decisions.md D7 and its 2026-05-17
// clarification: "review = an independent Opus 4.7 at max". The word
// "cheap" in D5/D7 is in-invocation EFFORT routing (a clear PASS exits the
// reasoning early) -- it is explicitly NOT a cheaper model tier. A
// low-reasoning first pass is spec-REJECTED false economy on the one thing
// that must be correct (D7 / feedback_best_tool_no_overkill /
// feedback_model_effort_range Opus-MAX ceiling). The dispatcher that spawns
// the reviewer (the consuming phase/smoke -- Task 6, then Phase 3/4) MUST
// honor REVIEWER_MODEL_DIAL below; this file declares the dial, it does not
// let the caller lower it.
//
// WHY this file is a HARNESS, not a "review()" function that calls a model:
// D7 requires the evidence re-check to be a SEPARATE invocation, NOT the
// authoring context. Encoding the re-check as an in-process function call
// would collapse that separation. So review-gate.ts provides three things
// to the consuming phase: (1) the deterministic mechanical pre-filters
// (cheap TS rubric clauses + the stable-hash spot-check sampler), (2) the
// independent-reviewer CONTRACT (the prompt constant + the typed input it
// is fed + the typed result it returns), and (3) the outcome-routing logic
// that turns a returned reviewer verdict + the mechanical pre-filter into
// the final typed gate result. The independent reviewer itself is spawned
// by the phase, fed REVIEWER_PROMPT + a ReviewerInput, and its
// ReviewerVerdict is handed back into evaluateTier1() here.
//
// Engine-agnostic (hard constraint): zero KTX/MVDSV-specific logic. It
// consumes the structured D6 candidate + the verdict/confidence/reasoning
// trail only. KTX and MVDSV ride the identical harness; Phase 3/4 differ
// only in which rows they feed it.
//
// ASCII only (P5). Comments explain WHY and cite the governing decision.

import type postgres from 'postgres';
import { sql as defaultSql } from '../load-knowledge/db.js';

// ---------------------------------------------------------------------
// Locked vocabularies (CROSS-TASK CONTRACT -- do not invent alternatives)
// ---------------------------------------------------------------------

// The describe-fill-synthesis skill's verdict enum, verbatim. The gate
// reads and sets exactly these five strings and no others (SKILL.md
// "Verdict enum"; evidence-and-citation.md `description_verdict`). This is
// a LOCKED cross-task contract shared with Task 3 (skill), Task 5 (audit
// serializer) and Task 6 (smoke). Any drift here is a contract break.
export const DESCRIPTION_VERDICTS = [
  'affirmed',
  'synthesized',
  'dead_stamped',
  'hedged',
  'residue_routed',
] as const;
export type DescriptionVerdict = (typeof DESCRIPTION_VERDICTS)[number];

// The migration-014 confidence vocabulary (SCHEMA.md
// `description_confidence`; evidence-and-citation.md). Stored verbatim;
// the gate never narrows it.
export const DESCRIPTION_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type DescriptionConfidence = (typeof DESCRIPTION_CONFIDENCES)[number];

// ---------------------------------------------------------------------
// Candidate the gate consumes (the D6 skill's Step-6 record, structured)
// ---------------------------------------------------------------------

// One contributing shipped-file provenance entry (D11 retained
// multi-source provenance element). Carried through verbatim so the gate
// can hand the reviewer the same provenance the phase will persist; the
// gate does NOT mutate it. `structured_choices` is the additive optional
// widening (decisions.md D11 Amendment 2026-05-17) -- absent for boolean
// knobs like the D19 `k_short_gib`, present for enum/bitmask knobs.
export interface ProvenanceEntry {
  source_file: string;
  source_line: number;
  shipped_value: string | null;
  raw_comment: string | null;
  structured_choices?: Array<{ value: string; label: string }>;
}

// The structured per-knob candidate the D6 skill emits and the consuming
// phase hands to this gate, pre-commit. Field names mirror the
// migration-014 description-provenance family (SCHEMA.md / migration 014)
// and the skill's Step-6 record one-to-one so the phase can persist the
// gate result without a re-mapping layer.
export interface DescribeFillCandidate {
  // Identity. canonical_id is `<project>:<type>:<name>` (SCHEMA.md). The
  // gate is engine-agnostic; `project` only scopes the reviewer's source
  // reads, it never selects a rule path.
  canonical_id: string;
  project: string;
  entity_name: string;

  // The proposed Layer 1 text the reviewer re-checks (maps to
  // entities.description_proposed; the committed text becomes
  // entities.description on PASS).
  description_proposed: string;

  // The D6 decision trail (maps to description_verdict /
  // description_confidence / description_reasoning). The reasoning is
  // STORED, not just logged (D11: "we want the reasoning so we can review
  // it") -- the gate carries it through onto its result.
  description_verdict: DescriptionVerdict;
  description_confidence: DescriptionConfidence;
  description_reasoning: string;

  // The evidence anchor. `source_ref` is `source_file:source_line` (the
  // EXISTING citation mechanism -- cvar_versions/command_versions
  // source_file+source_line pair, idx_cvar_versions_source; P3/D6 -- no
  // new format). It points at the AUTHORITATIVE READ use-site that
  // exhibits the described behavior, EXCEPT for `dead_stamped` /
  // `residue_routed` where it is the registration site (SKILL.md
  // flag-gated branch; evidence-and-citation.md). `description_anchor_version`
  // is the KTX/MVDSV dev-head version/commit the synthesis was authored
  // against (D2/D4 staleness anchor); NULL only for `affirmed`.
  source_ref: string | null;
  description_anchor_version: string | null;

  // D11 retained multi-source provenance, exactly as the skill emitted it
  // (one entry per contributing shipped file). The gate hands the cited
  // entry's context to the reviewer; it never discards alternates.
  description_provenance: ProvenanceEntry[];

  // True if Phase 0's C3 runtime-dead diff placed this knob in the
  // suspect pool. The gate CONSUMES this flag (it changes which
  // `source_ref` semantics are correct -- registration site, not read
  // use-site); it does not build the pool (C3).
  suspect_pool_member?: boolean;
}

// ---------------------------------------------------------------------
// Tier 1 part (a): deterministic mechanical-rubric pre-filter (cheap TS)
// ---------------------------------------------------------------------
//
// These are the MECHANIZABLE D5 clauses only -- the cheap pre-filters that
// run before the expensive independent semantic re-check. They are NOT a
// substitute for the semantic re-check (the load-bearing part D7 locks at
// Opus-4.7-MAX); they exist so a structurally-broken proposal fails
// without spending a reviewer invocation. The non-mechanizable D5 clauses
// ("says WHAT in admin-observable terms, not WHY"; "self-contained
// MEANING") are the reviewer's job, not these regexes.

export interface MechanicalRubricResult {
  pass: boolean;
  // Each failed mechanizable D5 clause, named. Empty when pass.
  failedClauses: string[];
}

// Opinion / recommendation lexicon. D5 clause (4): "mechanism only -- no
// recommended value, no opinion". Whole-word, case-insensitive. This is a
// blunt mechanical pre-filter on purpose; the reviewer makes the nuanced
// call. Kept deliberately small and obvious over a clever generic matcher
// (grug: simple repeated checks beat a hard-to-follow abstraction).
const OPINION_LEXICON = [
  'should',
  'recommended',
  'recommend',
  'best',
  'optimal',
  'we suggest',
  'suggested',
  'advisable',
  'preferable',
  'ideally',
];

// "see source" / "refer to code" style escape hatches. D5 clause (5):
// self-contained without reading source.
const NON_SELF_CONTAINED_PHRASES = [
  'see source',
  'see the source',
  'refer to code',
  'refer to the code',
  'see code',
  'read the source',
  'check the source',
  'consult the source',
];

function normalizeForMatch(text: string): string {
  return text.toLowerCase();
}

function containsWholeWord(haystackLower: string, needleLower: string): boolean {
  // Whole-word for single tokens; substring for multi-word phrases (a
  // phrase like "we suggest" is already specific enough that substring is
  // correct and a word-boundary regex around a space is brittle).
  if (needleLower.includes(' ')) return haystackLower.includes(needleLower);
  // Manual boundary scan -- avoids the repo's RegExp-iteration
  // security-hook false positive (CLAUDE.md misc conventions) and is
  // obvious enough to debug (grug: named intermediate over clever regex).
  let from = 0;
  for (;;) {
    const idx = haystackLower.indexOf(needleLower, from);
    if (idx === -1) return false;
    const before = idx === 0 ? '' : haystackLower[idx - 1] ?? '';
    const afterIdx = idx + needleLower.length;
    const after = afterIdx >= haystackLower.length ? '' : haystackLower[afterIdx] ?? '';
    const beforeIsBoundary = before === '' || !/[a-z0-9]/.test(before);
    const afterIsBoundary = after === '' || !/[a-z0-9]/.test(after);
    if (beforeIsBoundary && afterIsBoundary) return true;
    from = idx + 1;
  }
}

// Run the deterministic mechanizable D5 clauses. Pure, no IO. The
// non-mechanizable clauses are explicitly NOT here -- they are the
// independent reviewer's job (D7 load-bearing tier).
export function checkMechanicalRubric(candidate: DescribeFillCandidate): MechanicalRubricResult {
  const failed: string[] = [];
  const text = candidate.description_proposed ?? '';
  const trimmed = text.trim();
  const lower = normalizeForMatch(trimmed);

  // D5 mechanizable: non-empty.
  if (trimmed.length === 0) {
    failed.push('empty_description');
    // Nothing else is meaningful on an empty string; return early.
    return { pass: false, failedClauses: failed };
  }

  // D5 clause (2): not a bare restatement of the knob's name. Mechanical
  // floor only: exact-or-near-exact equality to the entity name (after
  // case-fold and stripping non-alphanumerics). The richer "is this just
  // the name reworded" judgment is the reviewer's.
  const nameCollapsed = candidate.entity_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const textCollapsed = lower.replace(/[^a-z0-9]/g, '');
  if (textCollapsed.length > 0 && textCollapsed === nameCollapsed) {
    failed.push('equals_knob_name');
  }

  // D5 clause (4): no opinion / recommendation lexicon.
  for (const term of OPINION_LEXICON) {
    if (containsWholeWord(lower, term)) {
      failed.push(`opinion_lexicon:${term}`);
    }
  }

  // D5 clause (5): self-contained -- no "see source" / "refer to code".
  for (const phrase of NON_SELF_CONTAINED_PHRASES) {
    if (lower.includes(phrase)) {
      failed.push(`non_self_contained:${phrase}`);
    }
  }

  // D5 clause (3), mechanizable slice: for enum/bitmask knobs the enum
  // labels/units must appear in the text. Engine-agnostic: "enum/bitmask"
  // is detected purely from the structured provenance the D9 extractor
  // carried (structured_choices) -- never from project-specific knowledge.
  // If any provenance entry carries structured_choices, at least one of
  // the choice labels (or its value) must appear in the proposed text.
  // The deeper "are ALL meanings spelled out correctly" check is the
  // reviewer's; this only catches a proposal that ignores the enum
  // entirely.
  const allChoices = candidate.description_provenance.flatMap(
    (p) => p.structured_choices ?? [],
  );
  if (allChoices.length > 0) {
    const mentionsAnyChoice = allChoices.some((c) => {
      const labelLower = c.label.toLowerCase();
      const valueLower = c.value.toLowerCase();
      return (
        (labelLower.length > 0 && lower.includes(labelLower)) ||
        (valueLower.length > 0 && lower.includes(valueLower))
      );
    });
    if (!mentionsAnyChoice) {
      failed.push('enum_labels_absent');
    }
  }

  return { pass: failed.length === 0, failedClauses: failed };
}

// ---------------------------------------------------------------------
// Tier 1 part (b): the INDEPENDENT semantic evidence re-check CONTRACT
// ---------------------------------------------------------------------
//
// This is the load-bearing tier (D7). It is performed as an INDEPENDENT
// Opus 4.7 MAX invocation, SEPARATE from the D6 authoring context. This
// file does NOT call a model; it provides the CONTRACT the consuming
// phase/smoke uses to spawn that independent reviewer:
//   - REVIEWER_MODEL_DIAL : the locked dial (Opus 4.7 MAX), declared here.
//   - REVIEWER_PROMPT     : the structured re-check prompt text.
//   - ReviewerInput       : exactly what the dispatcher feeds the reviewer
//                           (the candidate record + the cited source
//                           excerpt -- nothing from the authoring turn).
//   - ReviewerVerdict     : the typed result the dispatcher hands back to
//                           evaluateTier1().
//
// The spawn happens in the phase (Task 6 smoke first, then Phase 3/4
// fan-out), NOT in a unit test here -- the harness is engine-agnostic TS;
// the reviewer is the spec-locked Opus-4.7-MAX invocation.

// The locked model dial, as a constant the dispatcher MUST pass through.
// Recorded, not lowered (D7 + the 2026-05-17 clarification).
export const REVIEWER_MODEL_DIAL = {
  model: 'opus-4.7',
  reasoning: 'max',
  // Structural note for the dispatcher: this invocation MUST NOT reuse the
  // D6 authoring context/transcript. Independence is the point of D7's
  // tier 1 -- the same context that wrote the text cannot be the context
  // that re-checks it. The dispatcher spawns a fresh reviewer turn.
  independentOfAuthoring: true as const,
} as const;

// What the dispatcher feeds the independent reviewer. NOTHING from the
// authoring turn is included -- only the persisted candidate fields plus
// the freshly-read source excerpt at the cited location. The dispatcher is
// responsible for reading `sourceExcerpt` from the live `project` source
// at `citedSourceRef` (the gate provides a DB helper for the version-table
// blame-context lookup, but the authoritative excerpt is the actual C
// file -- source is ground truth, D6).
export interface ReviewerInput {
  // Identity, echoed for the reviewer's report line.
  canonicalId: string;
  project: string;
  entityName: string;

  // The text under re-check.
  proposedDescription: string;

  // The D6 trail, for context (the reviewer re-derives independently; the
  // trail is shown so a disagreement is explainable, not so it is
  // deferred to).
  d6Verdict: DescriptionVerdict;
  d6Confidence: DescriptionConfidence;
  d6Reasoning: string;

  // The evidence under re-check. citedSourceRef is `source_file:source_line`.
  // sourceExcerpt is the verbatim code around that line, read fresh from
  // the live `project` source by the dispatcher (NOT from the authoring
  // turn). isRegistrationSiteOnly is TRUE for dead_stamped / residue_routed
  // (their source_ref is the registration site by design, not a read
  // use-site -- SKILL.md flag-gated branch); for those verdicts the
  // reviewer checks the row is a complete traceable stub, not that the
  // line "exhibits behavior".
  citedSourceRef: string | null;
  sourceExcerpt: string | null;
  isRegistrationSiteOnly: boolean;

  // The full retained provenance (so the reviewer sees the alternates a
  // C2 conflict note in d6Reasoning refers to).
  provenance: ProvenanceEntry[];
}

// The typed result the dispatcher hands BACK from the independent reviewer
// into evaluateTier1(). The reviewer answers two questions D7 mandates:
//   evidenceExhibitsBehavior -- does citedSourceRef ACTUALLY exhibit the
//     behavior the proposed text claims? (for registration-site-only
//     verdicts: is this a complete, honest, traceable stub instead?)
//   textPassesSemanticRubric -- do the non-mechanizable D5 clauses hold
//     (WHAT in admin-observable terms not WHY; self-contained MEANING)?
// recheckReasoning is the reviewer's rationale -- STORED on the gate
// result (D11), never just logged.
export interface ReviewerVerdict {
  evidenceExhibitsBehavior: boolean;
  textPassesSemanticRubric: boolean;
  // The reviewer's independent confidence in its own re-check.
  recheckConfidence: DescriptionConfidence;
  // Rationale -- stored (D11). Includes any expected-vs-observed gap the
  // reviewer found (never explained away -- D6 verification discipline).
  recheckReasoning: string;
}

// The structured re-check prompt the dispatcher spawns the independent
// Opus-4.7-MAX reviewer with. Kept here (not in the skill) because this is
// the GATE's contract, separate from authoring (D7). The dispatcher
// substitutes the ReviewerInput fields; the reviewer returns a
// ReviewerVerdict-shaped answer.
export const REVIEWER_PROMPT = [
  'You are the D7 tier-1 independent evidence reviewer for the QW Oracle',
  'KTX/MVDSV L1 describe-fill arc. You are a SEPARATE invocation from the',
  'context that authored this description. You did NOT write it. Do not',
  'defer to the D6 trail shown below -- re-derive independently; the trail',
  'is context for explaining a disagreement, not an answer to adopt.',
  '',
  'Model dial: Opus 4.7, MAX reasoning. This is spec-locked (D7). "Cheap"',
  'is in-invocation effort routing only -- a clear PASS may exit reasoning',
  'early; a clear FAIL is decisive. A low-reasoning pass is rejected false',
  'economy on the one thing that must be correct.',
  '',
  'You are given: the proposed Layer 1 description, the cited source',
  'reference (source_file:source_line), the VERBATIM source excerpt read',
  'fresh from the live project source at that location, the retained',
  'multi-source provenance, and the D6 verdict/confidence/reasoning trail.',
  '',
  'Answer exactly two questions, with rationale:',
  '',
  '1. evidenceExhibitsBehavior: Does the cited source_file:source_line',
  '   ACTUALLY exhibit the behavior the proposed text claims? Read the',
  '   excerpt; the cited line must be the authoritative READ use-site',
  '   whose behavior the text describes. If isRegistrationSiteOnly is',
  '   true (dead_stamped / residue_routed), instead confirm the row is a',
  '   complete, honest, traceable stub citing the registration site -- NOT',
  '   a confident behavior claim. A citation that does not exhibit the',
  '   claimed behavior FAILS this question (do not explain the gap away).',
  '',
  '2. textPassesSemanticRubric: Do the non-mechanizable D5 clauses hold?',
  '   The text must say WHAT the knob does in admin-observable terms (not',
  '   WHY the code does it), not be a reworded restatement of the knob',
  '   name, spell out enum/bitmask meanings and units correctly, be',
  '   mechanism-only (no recommended value, no opinion), and be',
  '   self-contained without reading source.',
  '',
  'Return: evidenceExhibitsBehavior (bool), textPassesSemanticRubric',
  '(bool), recheckConfidence (high|medium|low), recheckReasoning (your',
  'independent rationale, including any expected-vs-observed gap -- state',
  'it, never explain it away). If you cannot verify from the excerpt, that',
  'is a FAIL with the reason stated, not a guess.',
].join('\n');

// ---------------------------------------------------------------------
// Tier 1 outcome routing -> the typed gate result (no throw, no DB write)
// ---------------------------------------------------------------------

export type Tier1Outcome = 'pass' | 'fail';
// Where a FAILED row goes (D7): back to re-synthesis, or onto the C1
// residue / community-outreach track. It does NOT commit either way.
export type FailRoute = 're_synthesis' | 'c1_residue';
export type TailReason = 'hedged' | 'residue' | 'spotcheck';

// The result the gate returns per candidate. The consuming phase persists
// the description_* fields (P2: JSONB as JS values) and never the gate;
// the gate writes nothing and commits nothing (mirrors skill->gate->phase
// separation). Carries the full decision trail so Task 5's audit-review
// page can render before/after/why inline (D11/D15).
export interface GateResult {
  canonicalId: string;

  // Tier-1 outcome. `pass` => eligible to commit (the phase persists it).
  // `fail` => bounced; does NOT commit.
  tier1: Tier1Outcome;

  // On fail only.
  failReason: string | null;
  route: FailRoute | null;

  // The decision trail carried onto the persisted row. On PASS these are
  // the D6 values reconciled with the reviewer's re-check; on FAIL they
  // record why it bounced (still stored -- D11; the audit page shows it).
  descriptionVerdict: DescriptionVerdict;
  descriptionConfidence: DescriptionConfidence;
  // The re-check rationale, STORED (D11) -- never just logged. On PASS
  // this is the reviewer's recheckReasoning; on a mechanical FAIL it is
  // the failed-clause list; the audit-review page renders it as the "why".
  descriptionReasoning: string;

  // Tier-2 operator-batch-tail membership (plumbing only -- Phase 1 marks,
  // Task 5 renders, Phase 3/4 run the actual operator pass). A row lands
  // in the tail if it is hedged, residue-routed, or spot-check sampled
  // from the auto-passed bulk (D7).
  inTail: boolean;
  tailReason: TailReason | null;
}

// Deterministic spot-check sampler for the auto-passed bulk (D7 tier 2:
// "a spot-check sample of the auto-passed bulk"). Stable hash on
// canonical_id so the same corpus + rate always selects the same sample
// (reproducible operator review surface -- not a fresh random draw each
// run). FNV-1a 32-bit: tiny, deterministic, no deps; cryptographic
// strength is irrelevant here (we only need a stable uniform-ish bucket).
export function spotCheckSelected(canonicalId: string, ratePerThousand: number): boolean {
  if (ratePerThousand <= 0) return false;
  if (ratePerThousand >= 1000) return true;
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonicalId.length; i++) {
    hash ^= canonicalId.charCodeAt(i);
    // FNV prime 16777619, kept in 32-bit via Math.imul + >>> 0.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const bucket = hash % 1000;
  return bucket < ratePerThousand;
}

// Default spot-check rate for the auto-passed bulk: 5% (50/1000). Tunable
// by the consuming phase; recorded as a default so Phase 3/4 do not have
// to invent one. Hedged and residue rows are ALWAYS in the tail
// regardless of this rate (they are not "auto-passed bulk").
export const DEFAULT_SPOTCHECK_RATE_PER_THOUSAND = 50;

// Tier-1 evaluation: combine the deterministic mechanical pre-filter with
// the independent reviewer's verdict into the final typed result, and mark
// tier-2 tail membership. Pure (no IO, no throw) -- the caller spawns the
// reviewer (D7 separate invocation), passes its ReviewerVerdict here, and
// persists the returned GateResult.
//
// REVIEWER MODEL DIAL: the `reviewer` argument MUST have been produced by
// an independent Opus 4.7 MAX invocation per REVIEWER_MODEL_DIAL above.
// This function cannot enforce the dial mechanically (it only sees the
// verdict), so the contract is documented here and on the dispatcher:
// spec-locked D7, not lowerable, not the authoring context.
export function evaluateTier1(
  candidate: DescribeFillCandidate,
  reviewer: ReviewerVerdict,
  options?: { spotCheckRatePerThousand?: number },
): GateResult {
  const rate =
    options?.spotCheckRatePerThousand ?? DEFAULT_SPOTCHECK_RATE_PER_THOUSAND;

  const mechanical = checkMechanicalRubric(candidate);

  // PASS requires BOTH (D7 tier 1): (a) the cited source_ref actually
  // exhibits the claimed behavior AND (b) the text passes the D5 rubric
  // (mechanizable clauses here + the reviewer's semantic clauses). Any
  // failing leg fails the gate.
  const evidenceOk = reviewer.evidenceExhibitsBehavior;
  const rubricOk = mechanical.pass && reviewer.textPassesSemanticRubric;
  const tier1: Tier1Outcome = evidenceOk && rubricOk ? 'pass' : 'fail';

  // Tier-2 tail membership is verdict-driven for hedged/residue and
  // sampler-driven for the auto-passed bulk (D7). hedged and
  // residue_routed ALWAYS land in the tail -- they are the operator's to
  // adjudicate by construction (SKILL.md flag-gated branch: both are
  // C1-routed). They are tail members whether tier 1 passed or failed.
  let inTail = false;
  let tailReason: TailReason | null = null;
  if (candidate.description_verdict === 'hedged') {
    inTail = true;
    tailReason = 'hedged';
  } else if (candidate.description_verdict === 'residue_routed') {
    inTail = true;
    tailReason = 'residue';
  } else if (tier1 === 'pass' && spotCheckSelected(candidate.canonical_id, rate)) {
    // Only the AUTO-PASSED bulk is spot-check sampled. A failed row is not
    // "auto-passed bulk"; it is bounced and re-worked, not operator-spot-
    // checked.
    inTail = true;
    tailReason = 'spotcheck';
  }

  if (tier1 === 'pass') {
    // Reconcile confidence: the gate keeps the LOWER of the D6 confidence
    // and the reviewer's re-check confidence (an independent re-check that
    // is less sure than the author lowers the stored confidence -- the
    // honest direction; never raise it). The verdict is unchanged on a
    // clean pass (the D6 verdict stood the independent re-check).
    const confidence = lowerConfidence(
      candidate.description_confidence,
      reviewer.recheckConfidence,
    );
    return {
      canonicalId: candidate.canonical_id,
      tier1: 'pass',
      failReason: null,
      route: null,
      descriptionVerdict: candidate.description_verdict,
      descriptionConfidence: confidence,
      // Store the reviewer's independent rationale (D11). It is the "why"
      // the audit-review page renders next to the before/after.
      descriptionReasoning: reviewer.recheckReasoning,
      inTail,
      tailReason,
    };
  }

  // FAIL routing (D7): an evidence failure (the cited line does not
  // exhibit the claimed behavior) means the synthesis was not source-
  // grounded -> route to the C1 residue track (tracked, never dropped --
  // C1; it is not merely a wording problem re-synthesis can fix on the
  // same evidence). A rubric-only failure (evidence is fine, the text
  // breaks a D5 clause) is a wording problem -> bounce to re-synthesis.
  // Either way it does NOT commit.
  const route: FailRoute = evidenceOk ? 're_synthesis' : 'c1_residue';
  const failBits: string[] = [];
  if (!evidenceOk) {
    failBits.push(
      'cited source_ref does not exhibit the claimed behavior (independent re-check)',
    );
  }
  if (!mechanical.pass) {
    failBits.push(`mechanical D5 rubric: ${mechanical.failedClauses.join(', ')}`);
  }
  if (!reviewer.textPassesSemanticRubric) {
    failBits.push('semantic D5 rubric failed (independent re-check)');
  }
  const failReason = failBits.join(' | ');

  return {
    canonicalId: candidate.canonical_id,
    tier1: 'fail',
    failReason,
    route,
    // On fail the verdict/confidence are carried through unchanged (the
    // phase does NOT persist a failed row's description; these travel so
    // the audit-review page and the re-synthesis dispatcher have the
    // trail). The reasoning records BOTH the D6 rationale and the
    // re-check failure (D11 -- stored, the audit "why").
    descriptionVerdict: candidate.description_verdict,
    descriptionConfidence: candidate.description_confidence,
    descriptionReasoning: `${candidate.description_reasoning} || RE-CHECK FAIL: ${failReason} || reviewer: ${reviewer.recheckReasoning}`,
    inTail,
    tailReason,
  };
}

// Keep the lower of two confidences (low < medium < high). An independent
// re-check never RAISES confidence above what the author claimed -- the
// honest direction is to defer downward when the re-checker is less sure.
function lowerConfidence(
  a: DescriptionConfidence,
  b: DescriptionConfidence,
): DescriptionConfidence {
  const rank: Record<DescriptionConfidence, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };
  return rank[a] <= rank[b] ? a : b;
}

// ---------------------------------------------------------------------
// Optional DB helper: blame-context lookup for the cited source_ref
// ---------------------------------------------------------------------
//
// Reuses db.ts (no new access layer). The AUTHORITATIVE excerpt the
// reviewer re-checks is the live C source at source_file:source_line
// (source is ground truth -- D6; the dispatcher reads the actual file).
// This helper only confirms the cited (source_file, source_line) is the
// SAME pair the version table recorded for the entity -- a cheap
// consistency cross-check so a candidate citing a line the L1 extract
// never saw is caught before a reviewer invocation is spent. It does NOT
// replace the reviewer's source read. postgres-js tagged template, JSONB
// read as JS values (P2). Returns the version-table source pair(s); the
// caller compares.
export interface VersionSourcePair {
  source_file: string | null;
  source_line: number | null;
}

// canonical_id is `<project>:<type>:<name>`; the type segment selects
// which `_versions` table carries the source pair. Engine-agnostic: it
// switches on the L1 TYPE segment (a schema fact), never on the project.
export async function fetchVersionSourcePairs(
  canonicalId: string,
  client: postgres.Sql = defaultSql,
): Promise<VersionSourcePair[]> {
  const parts = canonicalId.split(':');
  const type = parts[1] ?? '';
  // Map the L1 entity type to its per-version snapshot table. Only the
  // four D1 configurable buckets are in arc scope; others return [] (the
  // gate is engine-agnostic but type-aware -- a schema fact, not engine
  // logic).
  let versionTable: string | null = null;
  if (type === 'cvar') versionTable = 'cvar_versions';
  else if (type === 'command') versionTable = 'command_versions';
  else if (type === 'cmdline_param') versionTable = 'cmdline_param_versions';
  else if (type === 'info_key') versionTable = 'info_key_versions';
  if (versionTable === null) return [];

  // Parameterize the table via sql() identifier helper (postgres-js): the
  // table name is from a closed allow-list above, never user input, but
  // the identifier helper keeps it a single safe code path.
  const rows = await client<VersionSourcePair[]>`
    SELECT v.source_file, v.source_line
    FROM ${client(versionTable)} v
    JOIN entities e ON e.id = v.entity_id
    WHERE e.canonical_id = ${canonicalId}
  `;
  return rows.map((r) => ({
    source_file: r.source_file,
    source_line: r.source_line,
  }));
}

// ---------------------------------------------------------------------
// CLI entry (Bun; mirrors the load-knowledge script convention)
// ---------------------------------------------------------------------
//
// The gate's real entry points are the exported functions above (the
// consuming phase/smoke imports them, spawns the independent reviewer per
// REVIEWER_PROMPT + REVIEWER_MODEL_DIAL, and persists the GateResult). The
// CLI exists only as a self-documentation surface: it prints the locked
// model dial and the reviewer-prompt contract so an operator can confirm
// the spec-locked dial without reading the source. It performs NO review
// (the review is an independent Opus-4.7-MAX invocation spawned by the
// phase -- D7) and writes nothing.
if (import.meta.main) {
  const out = [
    'D7 two-tier review gate -- contract surface (no review performed here).',
    '',
    `Reviewer model dial (LOCKED, spec D7): model=${REVIEWER_MODEL_DIAL.model} ` +
      `reasoning=${REVIEWER_MODEL_DIAL.reasoning} ` +
      `independentOfAuthoring=${REVIEWER_MODEL_DIAL.independentOfAuthoring}`,
    '',
    `Verdict enum (LOCKED): ${DESCRIPTION_VERDICTS.join(' | ')}`,
    `Confidence enum: ${DESCRIPTION_CONFIDENCES.join(' | ')}`,
    `Default spot-check rate (per 1000): ${DEFAULT_SPOTCHECK_RATE_PER_THOUSAND}`,
    '',
    'The independent semantic evidence re-check is spawned by the consuming',
    'phase/smoke as a SEPARATE Opus 4.7 MAX invocation (NOT here, NOT the',
    'authoring context). It is fed REVIEWER_PROMPT + a ReviewerInput and',
    'returns a ReviewerVerdict, which the phase passes to evaluateTier1().',
  ].join('\n');
  console.log(out);
}
