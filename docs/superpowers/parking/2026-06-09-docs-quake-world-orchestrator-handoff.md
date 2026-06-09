# Handoff: docs.quake.world arc -- planning done, drafting + orchestration next

> Paste into a fresh `claude` terminal in the quakeworld monorepo (main tree),
> or tell it: *"Read `docs/superpowers/parking/2026-06-09-docs-quake-world-orchestrator-handoff.md` and follow it."*

The arc-planner pass is complete. The six-artifact scaffold is built, the slicing is locked (operator approved 6 phases, 2026-06-09), execution modes are rough-cut, and a file-as-prompt drafter prompt exists for every phase. **The per-phase MDs are NOT drafted yet** -- that is the immediate next sub-wave.

## Two stages remain

**Stage 0 (immediate) -- draft the 6 phase MDs.** Each phase MD is drafted in a FRESH terminal running its pre-written drafter prompt (file-as-prompt). This is arc-planner Step 4; the drafting terminal does live-source recon + dispatches a sub-agent to verify its own draft + halts for operator review. Drafting is paper-only (no code execution). Draft in order; operator reviews each at its boundary before the next. Phases 2b / 3 / 4 / 5 reference prior phases' real outputs (the scaffold, the generic renderer) -- draft them AFTER those phases exist, or expect forward-reference gaps the orchestrator augments.

**Stage 1 -- execute.** Once all 6 phase MDs are approved, invoke **arc-orchestrator** in a fresh terminal to drive execution (it dispatches per-phase arc-executor terminals, owns cross-phase memory, verifies phase outputs against live source at each boundary, and writes the per-phase executor bootstraps -- those are NOT pre-written here; the orchestrator augments them per prior-phase learnings).

## Where things are

- **Scaffold:** `docs/superpowers/plans/2026-06-09-docs-quake-world/`
  - `decisions.md` -- D1-D11 (product, verbatim from spec) + D12-D21 (build/execution, arc-planner)
  - `review-findings.md` -- F1-F5 (the known hazards; F1 = slipgate-parity hard gate)
  - `prerequisites.md` -- operator Task 0 (pnpm + Node; live Postgres; slipgate-parity baseline; vikpe DNS for deploy)
  - `phase-template.md` -- the mandatory phase-MD shape (note the required Execution-mode column + the docs-domain verification sub-agent brief)
  - `README.md` -- the locked 6-phase index + slicing shape + non-goals
  - `handoff-prompt.md` -- the SHAPE template the per-phase prompts follow (not run directly)
  - `phase-1-drafter-prompt.md` ... `phase-5-drafter-prompt.md` -- file-as-prompt, one per phase (1, 2a, 2b, 3, 4, 5)
- **Phase MDs:** none yet (`phase-1-l1-export.md` etc. are produced by Stage 0).

## Locked phase index (6 phases)

| Phase | Deliverable | Runnable state at boundary |
|---|---|---|
| 1 | Extend build-snapshot: uniform docs JSON for all 6 + 3 probes | docs JSON for 6 codebases; slipgate provably untouched |
| 2a | VitePress scaffold (pnpm + Tailwind v4 + daisyUI tokens) + module skeleton | dev server boots; landing page with tokens |
| 2b | Type-generic browse + card renderer, proven on ezQuake | ezQuake browse views render end-to-end (filter / group / inline cards) |
| 3 | Fan-out to other 5 codebases (data + config only, SAME components) | all 6 codebases browsable |
| 4 | cvar->cvar + entity->wiki cross-links (build-time) | links render; no dead wiki links |
| 5 | Cloudflare Pages deploy + vikpe DNS | docs.quake.world live (operator-run smoke) |

## Reads required (for whoever drives Stage 0 or Stage 1)

1. The scaffold, in README's "read in this order": `prerequisites.md` -> `decisions.md` -> `review-findings.md` -> `phase-template.md` -> the relevant `phase-N-drafter-prompt.md`.
2. The spec: `docs/superpowers/specs/2026-06-09-docs-quake-world-design.md`.
3. The roadmap (locked architecture): `docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md`.
4. The producer Phase 1 extends: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts` (it THROWS for the 4 server codebases today; the ezquake/qwcl/qw paths feed slipgate -- do not perturb).
5. arc-planner `references/arc-phase-archetypes.md` (verification regime per phase shape).
6. Operator memory: `feedback_scaffold_then_fanout_for_multi_phase_plans`, `feedback_model_effort_range`, `feedback_orchestrator_terminal_pattern`, `feedback_fresh_context_for_execution`, `feedback_operator_not_technical_review_gate`, `feedback_output_discipline_sentiment`.

## Critical rules

- **F1 / D12 is the hard gate on Phase 1:** the docs export is a SEPARATE emit path to a docs-owned dir; slipgate's consumed files stay byte-identical. Phase 1 ships a slipgate-parity probe. A shape regression silently breaks slipgate's config viewer.
- **D14 / D15 are won or lost in Phase 2b:** one type-generic, codebase-generic renderer; all logic in plain-TS modules, none in `.vue` files. If Phase 3 needs new component code, Phase 2b failed -- escalate, don't fork a component. This is also the FTE-later and infiniti-port insurance.
- **D16 / F3:** export reads the FROZEN version for qtv/qwfwd/qwcl (1.16-dev / 1.40-dev / 2.33), not head, or their categories vanish.
- **The Phase 1 type-scope call is an OPEN QUESTION for operator review, not a silent default:** v1 exports user-facing tunable types (cvar/command/macro/cmdline/info_key) and defers the deep-internal high-count types (KTX's 1196 log_templates, MVDSV's protocol_messages / qc_builtins). The type-generic renderer makes adding them later pure data, zero rework -- but the operator approves the v1 set at the Phase 1 boundary.
- **Operator preferences:** one question at a time; plain English first; be decisive (recommend, don't poll). ASCII only in code/regex; no em/en dashes; no AI-slop voice. Momentum over ceremony. Operator does NOT touch git -- Claude commits to `main` directly. Operator works at intent level; arc execution wants an overseer terminal for the technical gate.
- **Fan-out discipline:** any sub-agent fan-out (e.g., Phase 3's 5 codebases) runs Sonnet, low concurrency, paced (shared rate limit); report honest counts.

## First three actions (for the Stage 0 driver)

1. Scope check: read the scaffold's `README.md` + `decisions.md`. Confirm the 6-phase slicing is still what you are drafting against (it is locked; don't reopen the design).
2. Draft Phase 1: open a fresh terminal, `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-1-drafter-prompt.md`. It drafts `phase-1-l1-export.md`, self-verifies via a sub-agent, halts. Operator reviews (the type-scope open question is the one decision to make at this boundary).
3. On approval, draft Phase 2a (then 2b, 3, 4, 5) the same way, each in a fresh terminal, each reviewed at its boundary. Update `README.md`'s status column as each lands.

When all 6 MDs are approved, switch to Stage 1: invoke arc-orchestrator in a fresh terminal to execute.

## When in doubt

The spec's decisions are locked (D1-D11), the roadmap's architecture is locked, the precursor's data is shipped, the slicing is locked (6 phases). Do not reopen the design. If a phase MD draft surfaces a genuine cross-cutting conflict with a decision, amend `decisions.md` with a dated block (never silently override in a phase MD), and re-draft the affected phases. Route true ambiguity to the operator with concise plain-English consequences.
