# Review findings -- evidence ledger

This file is the audit trail of issues surfaced during plan drafting and execution. Each finding cites evidence and tags which decision in `decisions.md` resolves it (or which phase resolves it, if no decision needed).

The file decoupling: `decisions.md` carries the FIX; this file carries the WHY. Phase drafters consult both.

---

## How to use this doc

While drafting each phase MD:
1. Skim the findings table at the bottom for findings tagged with the phase you're drafting.
2. Verify the relevant decision in `decisions.md` resolves the issue. If a finding has no decision tag, either the phase resolves it directly or it remains open (operator review).
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. New findings discovered during phase drafting append here with sequential F-number.

---

## Status: no prior plan attempt

This arc has not been planned before; there is no monolithic-plan precursor with bugs to enumerate. Findings will accrue during phase MD drafting and during execution.

The brainstorm pass produced a design spec (`docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`) that is the source of truth for scope and ratified decisions. The spec is well-scoped; per-phase drafters should not need to re-derive structural choices.

---

## Findings

(No findings logged. New entries append below as F1, F2, ...)

---

## Phase ownership of findings

| F# | Finding | Resolves via | Phase |
|----|---------|--------------|-------|
| -- | -- | -- | -- |

(Empty until findings accrue.)

---

## Notes for the orchestrator

When wave 2 (arc-orchestrator) drives execution, mid-arc findings (issues discovered while a phase is shipping) append here in the same shape. The orchestrator may also append "deviation from decision" findings if a phase ships with a documented deviation that needs to be tracked across the rest of the arc.

The post-arc-reviewer (wave 2 / arc-reviewer skill) consumes this file as the audit trail input alongside `decisions.md` amendments and `arc-history.md`.
