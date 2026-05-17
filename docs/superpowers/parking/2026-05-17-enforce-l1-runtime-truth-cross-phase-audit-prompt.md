# Cross-phase consistency audit -- enforce-L1-runtime-truth (pre-execution GATE)

**For:** a FRESH, COLD terminal whose ONLY job is this audit. You have ZERO
dispatch agenda. You are NOT arc-reviewer (that is a post-SHIP spec-vs-shipped
read; nothing has shipped). You are NOT arc-orchestrator (that drives
execution; execution is BLOCKED behind this audit). You do not draft, execute,
or fix. You read all 5 frozen phase MDs together and report whether the
TRANSITIVE contracts hold end-to-end.

## Why this audit exists (the gap it closes)

The arc is draft-then-execute, 5 phases, gated fresh-terminal-per-phase.
Every ADJACENT seam was verified PAIRWISE by whichever cold session drafted
the later phase (1/2->3 by session 3; 3->4 by session 4; 4->5 by session 5).
Each phase also self-verified its own X2/X3 boundary. But:

- No single reader has ever held all 5 FROZEN MDs at once. Each seam was
  checked through a HANDOFF SUMMARY of the far side, not both MDs open
  together -- a 4-link telephone chain. Cumulative wording/key/enum drift
  across the chain has never been audited with all contracts simultaneously
  visible.
- The workflow has per-phase gates + a POST-arc reviewer, but NO
  pre-execution holistic gate. This audit is that gate. Operator-requested
  2026-05-17 (session 5), operator chose the dedicated-fresh-terminal form
  for maximum isolation.

Catching a transitive break HERE is a paper edit. Catching it mid-execution
is shipped-code rework + an X9 re-extract. This is the highest-leverage,
cheapest gate point in the arc.

## Reads required (cold, in this order; read them IN FULL)

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.

1. `decisions.md` IN FULL (D1-D22 + the D7 AND D11 amendments + X1-X10 +
   non-goals). These are LOCKED. You are NOT re-opening them.
2. `review-findings.md` IN FULL (F1-F7, R1-R7, W1-W4 + the phase-ownership
   table).
3. **All 5 APPROVED phase MDs IN FULL, in order, with a cross-phase lens:**
   `phase-1-track-a-callgraph-passenger.md`,
   `phase-2-track-b-handler-hud.md`,
   `phase-3-unified-schema-loader.md`,
   `phase-4-acceptance-contract.md`,
   `phase-5-application-outputs.md`.
   For each, the load-bearing sub-blocks for THIS audit are: "Inputs from
   previous phase", "Outputs to next phase", the locked shape/contract
   blocks (JSONB shapes, enum vocabularies, toggle names, file stems,
   probe names), "Verification (phase boundary)", and the execution-mode
   annotations.
4. `prerequisites.md`, `phase-template.md`, `README.md` (the LOCKED index +
   the per-phase gate record -- evidence each phase WAS individually gated;
   you do not redo that).
5. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (the WHY; decisions.md is the distilled
   contract -- do NOT re-open a D).
6. The handoff chain (the pairwise-gate record + the telephone links you
   are auditing for cumulative drift): the s3->s4, s4->s5, and
   `2026-05-17-enforce-l1-runtime-truth-drafts-approved-to-execution-handoff.md`.
7. Memory: `feedback_verify_dispatched_terminal_claims` (THE method: every
   cross-phase claim in an MD's "Inputs/Outputs" prose is a HYPOTHESIS;
   verify the actual token strings match across MDs, do not trust the prose
   summary), `feedback_parking_verified_state_is_hypothesis`,
   `reference_rigor_bar_follows_consumer`.

## SCOPE -- the ONLY things you audit (T1-T6)

For each, trace the exact contract TOKEN (key name / enum string literal /
toggle identifier / file stem / probe name / wording) across EVERY phase
that touches it, with all those MDs open. A token that is locally valid in
each phase but spelled/scoped differently across phases is the target. The
anchors below are what session 5 found -- treat them as HYPOTHESES to
re-verify against the frozen MDs (and live source where checkable), not as
gospel.

- **T1 -- `dump_confirmation` slot lifecycle P3 -> P4 -> P5.** P3's locked
  `track_a_reachability` / `track_b_hud_recovery` shape writes slot-3
  `dump_confirmation` = `"high-confidence-generalized"` (level-2) for every
  populated row, NEVER `"dump-confirmed"`. P4's loader rewrites EXACTLY the
  matched rows to `"dump-confirmed"` (level-3). P5's `route_by_level` reads
  it (`"dump-confirmed"` -> autonomous-eligible; `"high-confidence-
  generalized"` -> assistant-only; `None` -> no-signal). VERIFY: the JSONB
  KEY (`dump_confirmation`), the THREE enum string LITERALS, and the COLUMN
  set (`cvar_versions.track_a_reachability`,
  `command_versions.track_a_reachability`,
  `command_versions.track_b_hud_recovery`) are byte-identical across all
  three independently-drafted MDs. A single mismatched literal silently
  breaks the level filter and ships a wrong delete-list.
- **T2 -- two-feeder string contract P1 -> P3 -> P5.** P1 emits
  `evidence.feeder` for Track-A genuine-dead; P3 stores it; P5 maps
  `"callgraph"` -> Class 1, `"commented-register"` -> Class 2 and raises
  LOUD on a third value. VERIFY: P1 emits EXACTLY those two string
  literals (the call-graph feeder + the minimal standalone
  commented-register scanner per the D7 amendment), P3 stores them
  unchanged, P5's mapping keys match byte-identical. A feeder string
  drift mis-tags a delete-list entry's Class (a wrong upstream PR shape).
- **T3 -- X4 "off == today's pipeline" as a COMPOSED property.** Each
  phase tested its OWN slice toggled off (P1 `ENABLE_CALLGRAPH_PASSENGER`,
  P2 `ENABLE_HUD_COMMANDS_HANDLER`, P3 nullable/absent-safe columns, P4
  the D22 gate + stamp, P5 the post-load generator). VERIFY: with ALL of
  them off SIMULTANEOUSLY the composition is byte-identical to the pre-arc
  pipeline -- no phase's "off" path depends on another phase's "on" state,
  no toggle default flips a non-ezQuake fork on, the 8 F6 byte-identical
  stems hold across the whole stack (the 9th
  `ezquake-hud-commands-ast.json` is ADDITIVE: off-absent/on-present, NOT
  in the byte-identical set). This composed property is tested by NO single
  phase boundary.
- **T4 -- F1 grid coherence across P3 / P4 / P5 + the carried probe.**
  P3 creates `F1.runtime_fidelity_shape`; P4 EXTENDS it (level-3-pinned-
  only assertion); P5 ADDS `F1.callgraph_signal_pool_coverage` +
  `F1.hud_recovery_first_class`; `F1.jsonb_columns_not_strings` is the
  carried Arc-1 regression gate. VERIFY: probe NAMES are consistent and
  unique, no two probes assert contradictory things about the same row,
  the level vocabulary + column names inside every probe match T1's, and
  "extend not rewrite" actually holds (P4/P5 do not silently redefine the
  P3 probe).
- **T5 -- Inputs/Outputs verbatim mirror across all 5 FROZEN MDs.** Read
  each phase's "Outputs to next phase" immediately against the next
  phase's "Inputs from previous phase", all 5 open at once (the
  pairwise gates did this through handoff summaries across 4 cold
  sessions -- this is the same check done ONCE, end-to-end, by one
  reader). Flag any term that drifted in wording, any output a later
  phase assumes that the producing phase does not actually state, any
  input mismatch.
- **T6 -- sequencing + budget realism end-to-end.** The arc is fully
  SEQUENTIAL with a fresh executor terminal per phase. VERIFY: the
  per-phase context-budget projections + the fresh-terminal-per-phase
  discipline are mutually consistent (Phase 1's ~250-450k call-graph
  budget is the flagged uncertainty -- confirm the MD's mitigation is
  internally coherent), and no phase's execution-mode annotation
  contradicts another's assumptions about what is already shipped.

A genuine transitive issue OUTSIDE T1-T6 is in scope ONLY if it crosses
>=2 phase boundaries and a phase-local reader could not have seen it.
Per-phase-local concerns are OUT (see below).

## OUT of scope (do NOT do these)

- Re-opening or re-litigating D1-D22 / X1-X10 / any per-phase OQ. Every
  per-phase decision was individually cold-gated (P1 OQ-1->D7 amendment;
  P3 OQ-1/OQ-2; P4 OQ-1/OQ-2/OQ-3 + F7/S2; P5 OQ-1/OQ-2 -- all
  operator-ratified, recorded in the MDs). You are NOT re-reviewing
  per-phase correctness; you audit ONLY what no single reader has held
  all-5-together.
- Re-deriving the pools (74/92/129 -- banked + session-5-reproduced via
  the BANKED proxy/dump, X7) or re-running detection.
- Proposing a redesign. A confirmed cross-phase defect routes to the
  operator as a DATED `decisions.md` amendment OR a targeted single-phase
  MD revision -- recommended, not applied. You REPORT; you do not edit any
  MD, decisions.md, or code.

## Method

For each T-item: identify the contract token, grep/Read it in EVERY phase
MD that touches it (and live source where checkable -- the schema via
`docker exec qw-oracle-postgres-dev psql ... \d cvar_versions`, the 4
variants in `extractor_lib/clang_config.py`, the banked proxy under
`apps/qw-oracle/data/detection/`), and compare the actual strings, not the
prose. The MDs' "Inputs/Outputs" narratives are hypotheses; the verified
fact is the token literal appearing identically in the producing AND
consuming MD. If a grep returns an anomalous empty on a file you know is
non-empty, escalate to Read (the Phase-3 worked lesson).

## Output -- structured verdict, then HALT

Report (under ~500 words):

```
CROSS-PHASE AUDIT VERDICT: CLEAN | FINDINGS

Per T-item (T1..T6): CLEAN <one line of what you traced> | FINDING

FINDINGS (if any), each:
- id: T<n> (or X<n> for an out-of-T1-T6 transitive issue)
- phases involved: <e.g. P3 + P4>
- the exact mismatch: <quoted token A at phase-N-md:line vs token B at
  phase-M-md:line -- the literal strings>
- severity: CRITICAL (ships a dishonest/wrong KB or breaks execution) |
  SUBSTANTIVE (buggy behaviour) | ADVISORY (wording/consistency)
- recommended resolution: dated decisions.md amendment |
  targeted phase-<N>-MD revision | accept-with-note (and why)
```

CLEAN -> the execution handoff
(`...-drafts-approved-to-execution-handoff.md`) is UNBLOCKED; tell the
operator execution may proceed. FINDINGS -> the operator + the session-5
orchestrator act on them (amendment/revision) BEFORE the execution
handoff fires. Then STOP -- you do not fix, dispatch, or proceed.

## When in doubt

The brainstorm is closed; the spec/decisions are source-of-truth; the 5
approved MDs are the LOCKED execution contracts and the per-phase
decisions are NOT your remit. A real cross-phase defect is a dated
`decisions.md` amendment routed to the operator (one question at a time,
plain-English consequences), NEVER a silent override and NEVER a redesign.
Parking/handoff/prior-session/sub-agent lines are hypotheses until you
re-verify the token strings across the frozen MDs yourself. The ezQuake
help-JSON doc-gap arc and FTE/QWCL/MVDSV are separate sequenced follow-ons
-- not in this audit's scope.
