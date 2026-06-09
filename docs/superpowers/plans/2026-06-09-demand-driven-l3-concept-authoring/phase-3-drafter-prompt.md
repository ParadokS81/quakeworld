You are drafting the **Phase 3** MD for arc **`2026-06-09-demand-driven-l3-concept-authoring`** -- the L3 player-help concept-notes arc. **Phase 3 is PROVISIONAL (decisions.md D16):** it is a decision-point, not a committed deliverable. Do not draft it as a normal phase until the in/out call is made.

**Sibling-arc guard:** neighbor is `2026-06-09-docs-quake-world`. VitePress / build-snapshot = wrong arc, stop.

**Working directory:** `/home/paradoks/projects/quakeworld/`

## Step 0 -- the in/out decision (do this FIRST)

Phase 3 covers the **caveated trio**: performance/stutter (296 threads, 39% unresolved), crash (147, 50%), Linux (236, 29%). Per D2, high unresolved-rate is a "hard domain -- the note is a checklist, not a fix" flag, not a priority multiplier. The in/out decision was deferred until Tier-1 + Tier-2 shipped (D16).

Before drafting any note, surface the decision to the operator with the Phase 1-2 evidence:
- Did the gate work cleanly on the clean domains? Is the authoring throughput such that 3 more caveated notes are worth it?
- For a domain where the underlying issue is often UNSOLVABLE (Ryzen FPS stutter), the gate criteria change: a note cannot always move a thread to fully NAILED. The realistic bar is **catches the QW-specific gotcha + names the correct cvars + introduces ZERO confabulation** -- recall that the 2 confabulations in the whole hypothesis test were BOTH in the unsolvable Ryzen-stutter thread, exactly where L1 retrieval was thin. So these notes' real job is to **kill the confabulation** on the hardest threads, even when they can't promise a fix.

**If the operator says OUT:** record the decision (a short Phase-3 MD that documents the drop + rationale), update the README phase index, done.

**If the operator says IN:** draft the trio as below.

## If IN -- what Phase 3 delivers

Three **honest diagnostic checklist** notes: performance/stutter, crash, Linux. Same machinery (skill + runner) as Phase 1-2, with the adjusted gate framing above.

## Required reads (if IN)

Same as Phase 1 (decisions D1-D6/D10/D14, findings F5, phase-template, contract, the `domain-concept-curate` skill, the demand map + `faq-clusters.json` for each domain's threadIds, the template notes). Plus the **hypothesis-test outputs** (`apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/outputs/`) -- study the Ryzen-stutter thread (one of the 11) to see exactly where confabulation crept in, so the checklist note closes that gap.

## How to draft (if IN)

Same task shape as Phase 1 -- one task per domain, `subagent (Sonnet MAX)` -- with two MD-level rules:
1. **Caveat framing is explicit in the note:** the note states up front it is a diagnostic checklist, not a guaranteed fix. (D7: grounded, honest -- no overpromising.)
2. **The gate criterion is confab-zero + gotcha-caught**, not necessarily PARTIAL->NAILED. Spell this out in each task's Verification so the runner/operator judge it correctly.

## Verification at the phase boundary (if IN)

- Each note loads clean; each names only L1-present entities (zero confab -- the primary bar here); each catches the domain's QW-specific gotcha; each operator-reviewed.
- The README phase index records the trio as shipped (or the OUT decision as recorded).

## After drafting

Sub-agent verify, apply findings (decisions win), halt with the standard status report. If OUT, the report is simply the recorded decision.
