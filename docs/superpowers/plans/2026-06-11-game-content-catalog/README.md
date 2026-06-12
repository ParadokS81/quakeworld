# game-content-catalog -- completion arc plan

**Spec:** `docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md` (D1-D7 + M1-M5, locked 2026-06-11)
**Planner handoff:** `docs/superpowers/parking/2026-06-11-game-content-catalog-planner-handoff.md`

**Goal:** Complete the qw-oracle `gameplay_*` Layer 1 catalog: audit + re-verify the live id1 baseline (37 entity defs + 41 mechanics, shipped 2026-04-27), add id1 monster stats from the acquired Quake v1.06 QC, add the KTX hardcoded-override layer (`ktx-gameplay.yaml`), wire `map_summary_key` join props, and land the conventions in SCHEMA.md. No schema migration; no new MCP surface.

**Status:** EXECUTING as of 2026-06-12 -- all five phase MDs drafted, planner-reviewed against live source, and approved; the M4 execution gate was LIFTED by operator the same day (decisions D16 amendment). Execution routes through `docs/superpowers/parking/2026-06-12-game-content-catalog-orchestrator-handoff.md` (arc-orchestrator).

**Execution gate:** LIFTED 2026-06-12 (D16 amendment, operator-signed) -- phases execute now, sequentially 0 -> 4.

---

## Read in this order

1. **[`prerequisites.md`](prerequisites.md)** -- operator-side checks + the execution gate.
2. **[`decisions.md`](decisions.md)** -- 22 locked cross-cutting decisions (D22 added 2026-06-11 at Phase 3 review). Every phase respects these. Numbering note: bare D-numbers mean the PLAN decisions; the spec's are cited as "spec D2" / "spec M3".
3. **[`review-findings.md`](review-findings.md)** -- evidence ledger; opens with 6 pre-flight findings (no prior plan existed).
4. **[`phase-template.md`](phase-template.md)** -- mandatory shape for each phase MD, including the Execution mode column and the verification sub-agent brief.
5. Per-phase MDs (drafted in order; see index below).

To draft a phase: open a fresh terminal, type `@docs/superpowers/plans/2026-06-11-game-content-catalog/phase-<N>-drafter-prompt.md`. See [`handoff-prompt.md`](handoff-prompt.md) for the workflow.

---

## Phase index

Slicing: one horizontal foundation phase (0), then per-deliverable data slices, each end-to-end through the existing pipeline (YAML -> loader -> Postgres -> F1 probes -> MCP) with self-contained verification. Locked by operator 2026-06-11.

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 0 | shipped | `phase-0-prereqs-loader.md` | v1.06 QC tree + provenance; loader `monsters` section; expected_counts STOP-gate rework (F2); citation-gate + seed-double-load probes | Loader accepts all five seed sections; unchanged id1 YAML loads green under the new gate; probes runnable |
| 1 | in execution | `phase-1-audit.md` | id1 audit: ~400 props re-verified, exhaustive gap sweep, falloff + self-splash rows, id1 F1 probes | id1 baseline verified-under-current-regime; new mechanics rows queryable; F1 id1 grid green |
| 2 | approved | `phase-2-monsters.md` | id1 monster stat rows (~15) + wiki snapshot cross-check | `search_gameplay_entities kind=monster gameplay_source=id1` returns the roster |
| 3 | approved | `phase-3-ktx-overlay.md` | `ktx-gameplay.yaml` override layer (4 file families, exhaustive value deltas) + disjointness probe (F3) | `describe_mode` joins catalog + mode_defaults + hardcoded overlays on one token |
| 4 | approved | `phase-4-joinkeys-docs.md` | `map_summary_key` props; SCHEMA.md conventions subsection; RUNBOOK qw section; verify-gameplay.ts fix (F4); snapshot regen | Full F1 sweep green; snapshot + MCP surfacing confirmed; docs current |

Status values: `not drafted` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

Phase budgets (projection): 0 ~100-150k, 1 ~200-300k, 2 ~200-300k, 3 ~250-350k, 4 ~150-250k -- all subagent/Workflow-heavy to stay under the 350k smell zone.

---

## What this arc deliberately does NOT cover

- L3 concept notes (weapon pairs / powerups / resources) -- Track A, the live demand-driven-l3 arc.
- The "what does the oracle know" coverage map -- Track C, queued under the docs.quake.world front-page brainstorm (HANDOVER).
- Engine-tunable cvars (`sv_maxspeed` etc.) -- engine cvar track (standing v14 rule).
- Whole-subsystem KTX content (race scoring, grapple, CTF flag logic) -- only VALUE deltas to cataloged combat entities (decisions D4).
- KTX knob existence + mode_default settings -- already shipped (KTX onboarding arc); this arc adds only hardcoded behavior deltas.

If a phase drifts into one of these, that's scope creep -- flag it.

---

## Operator quick-reference

- **Draft a phase:** fresh terminal, `@.../phase-<N>-drafter-prompt.md`. Drafter drafts, self-verifies via sub-agent, halts.
- **Review a draft:** read the MD top-to-bottom; check task execution-mode annotations, verification probes, recovery section; update the status column here.
- **A verifier finding conflicts with a decision:** the decision wins; rejection noted in the phase MD's Open questions. If the decision itself is wrong, amend `decisions.md` (dated block) before redrafting.
- **New finding mid-arc:** append to `review-findings.md` with the next F-number + ownership-table update.
