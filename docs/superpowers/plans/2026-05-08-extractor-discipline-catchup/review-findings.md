# Review findings -- evidence trail for extractor discipline catch-up arc

This arc has no prior plan attempt; the two-pass arc-brainstormer (`docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`) closed cleanly with operator sign-off at each pass close. Findings here are NOT plan-bug fixes; they are:

1. **Per-gate catch-up audit findings** that surface during phase execution -- when each gate runs against all 5 projects, real bugs / pre-existing anomalies / acceptable gaps get captured here.
2. **Spec-callouts** that influence one or more phase drafts and don't fit cleanly into a single decision.
3. **Caveats** the brainstorm surfaced as worth flagging for execution-time vigilance.

The fixes (where applicable) are encoded as decisions in `decisions.md`. This file is the audit trail: per-finding evidence + which phase resolves it.

New findings discovered during phase drafting / execution append to this file with sequential F-numbers. Each finding gets a track per D8 (drain-now / HANDOVER small followup / explicit reject).

---

## How to use this doc

While drafting each phase MD:

1. Identify which findings touch the phase you're drafting (see "Phase ownership of findings" table at bottom).
2. Verify the relevant decision in `decisions.md` resolves the issue, OR confirm the finding is a count / shape anchor your phase must reproduce exactly.
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. New findings emerging during phase drafting append to this file with sequential F-numbers and tag the phase that resolves them.

While executing each phase:

1. Run the gate against all 5 projects per D6.
2. Triage each finding per D8 (drain-now / HANDOVER small followup / explicit reject).
3. Append a section here for any drain-now or HANDOVER-bound finding (skipping explicit-reject is fine; commit body captures the rejection).

---

## Findings

*(none yet -- arc has no prior plan attempt; F-entries accrue during phase drafting / execution as catch-up audits run against the 5 projects.)*

---

## Phase ownership of findings

| Finding | Phase | Status | Resolution |
|---|---|---|---|
| *(none yet)* | -- | -- | -- |

When new findings land, append rows here mapping F-number -> phase that resolves it -> status (open / in-progress / resolved) -> short resolution description.

---

*End of review-findings. This file accrues during execution; it is not pre-populated at scaffold time.*
