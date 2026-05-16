# KTX / MVDSV Layer-1 describe-fill -- Pass 4 fresh-terminal handoff

**For:** a fresh terminal resuming the arc-brainstormer multi-pass brainstorm
at Pass 4. Created 2026-05-16 at the Pass 3 wrap.

## Where things are

- arc-brainstormer multi-pass brainstorm. Passes 1-3 COMPLETE and committed.
  P1 schema D1-D4; P2 synthesis method D5-D8 + C1/C2 (2026-05-15);
  P3 mechanical-extract pipeline + drift/conflict policy + Phase-0 probe
  bundle D9-D12 + cross-cutting C3, amends D4/D6/D7 (2026-05-16).
- Single drain doc: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
  -- holds C1/C2/C3, D1-D12, the D5/D6-D7 amendments, and per-pass closes.
  Source of truth for what is locked.
- Parking doc `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md`
  status line tracks pass progress.
- Passes 4-5 pending. Five-pass plan unrevised. Pass 5's upstream-export
  piece remains the deferrable tail (operator steer + D3).

## Pass 4 scope (from the spec Pass-status table)

**Multi-projection data contract + wiki-feed mechanism.** The single
structured record (description + retained multi-source provenance + the
verdict/confidence/reasoning trail, D11) serialized to N consumers: MCP,
Slipgate JSON snapshot, the future web server-manager, wiki.slipgate.me, and
the `cvar-audit-review.html` review surface. One schema, N serializers, no
dual maintenance.

## Reads required (in order, before opening Pass 4)

1. The spec (ALL locked decisions; absorb C1/C2/C3 + D1-D12 + amendments
   cold). Do not relitigate; surface genuine conflicts for explicit
   amendment (arc-brainstormer rule).
2. Arc capture `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md`
   -- the multi-projection + wiki-feed open questions seed Pass 4.
3. D11 (the audit-review-HTML pattern; review surface = one projection) and
   D9-D10 (the structured record + per-source provenance Pass 4 serializes).
4. `apps/qw-oracle/API_CONTRACTS.md` (Discovery/Query/Storage + citation
   discipline the contract must respect); the qwiki-v1-beta wiki target
   `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`.
5. Memory: `project_concept_notes_vertical_slice`,
   `feedback_visual_anchors_force_hygiene`, `project_l1_seed_l3_layering`,
   `feedback_inline_pairs_over_split_panels`.

## Pass 4 sub-questions (seed -- refine in-pass)

- 4.1 The exact structured shape consumers need (structured fields
  first-class for the web-manager dropdowns) vs the MCP/embedding shape --
  one schema, N serializers?
- 4.2 Wiki-feed mechanism: bot-generated read-only renders (stamped
  auto-generated) vs seeded-then-editable; how the projection reaches
  wiki.slipgate.me without dual maintenance.
- 4.3 Review-surface-as-projection (Pass 3 carry-forward): the
  `cvar-audit-review.html` page is one generated projection off the same
  record; reconcile with the consumer contract.

## Critical rules

- Operator is a non-coder. Plain-English-first; lead with what changes + the
  recommendation. One question per turn. Be decisive (recommend, do not
  poll). Operator pace beats conservative estimates. Momentum over ceremony.
- ASCII only, no em-dashes, no filler in committed docs.
- arc-brainstormer discipline: open the pass with scope + drain destination
  (the same spec); one sub-question per turn; drain each locked decision
  inline; close with carry-forwards (each with a track) + commit
  `docs(brainstorm): ktx-mvdsv-l1-describe-fill Pass 4 complete -- <scope>`.
- Locked C1/C2/C3 + D1-D12 + amendments are durable. Do not relitigate; a
  genuine conflict is surfaced for explicit amendment.
- Single source of truth + generated projections (locked model): the wiki and
  every consumer are render targets, never hand-edited.

## First three actions

1. Do the Reads (spec first -- absorb the locked state cold).
2. Re-invoke `arc-brainstormer`; confirm Pass 1-3 locked state without
   relitigating; open Pass 4 with a scope statement and drain destination.
3. Pose sub-question 4.1: plain-English-first, decisive recommendation,
   one question.

## When in doubt

The spec's locked decisions win. Single source of truth, generated
projections, no dual maintenance. The review surface is a projection, not a
new home. If a Pass 4 direction conflicts with a locked decision, surface it
explicitly for amendment -- do not silently override or silently comply.
