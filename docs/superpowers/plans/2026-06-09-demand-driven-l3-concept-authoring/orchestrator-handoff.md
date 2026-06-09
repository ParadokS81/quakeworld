# Orchestrator handoff -- demand-driven L3 concept authoring

**For:** a FRESH terminal to ORCHESTRATE this arc's execution. Routes to **`arc-orchestrator`**. The planner session built the scaffold + gated Phase 0; this hands the orchestrator role fresh context. Everything load-bearing is committed -- read the durable artifacts, do not rely on the planner's in-context memory.

## Where things are

- **Scaffold complete + committed** (unpushed -- see below): the 6 artifacts + 4 drafter prompts in this dir, plus the cross-arc contract at `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md`.
- **Slicing LOCKED** (operator-approved 2026-06-09): Phase 0 machinery; Phase 1 Tier-1 (7 notes); Phase 2 Tier-2 (~10); Phase 3 caveated trio **PROVISIONAL** (D16).
- **Phase 0 is DRAFTED + GATED + APPROVED + committed** (`62d8fa5c`). The MD is `phase-0-machinery.md`. The planner did the independent technical gate (verified the guardrail anchor, the weapon-scripts->thread-12393 mapping, the scratch-tracking claim against live source). **D12 was amended (2026-06-10): the generalized runner is TRACKED at `apps/qw-oracle/scripts/calibration/faq-gate/`** (not gitignored scratch) -- see the top amendment block in `phase-0-machinery.md` + the decisions.md amendment log. **Phase 0 is ready to EXECUTE.**
- **Cross-arc state:** the contract is committed. The docs-quake-world sibling arc's reconciling amendment (retargets its guides from the wiki to the docs portal) was applied in ITS own terminal -- confirm it landed so both arcs agree.
- **Unpushed commits on `main`** (scaffold, contract, calendar snooze, this handoff, Phase-0 approval/amendment). Push at a safe checkpoint. The sibling terminal is active in the SAME working tree -- scope every `git add` to this arc's files and verify staging (`git diff --cached --stat`) before committing; never `git add -A`.

## Reads required (in order)

1. The scaffold: `README.md`, `decisions.md` (+ amendment log), `review-findings.md`, `prerequisites.md`, `phase-template.md`, `phase-0-machinery.md`.
2. `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` -- the note-structure contract the authoring phases produce to.
3. `docs/superpowers/parking/2026-06-09-demand-driven-l3-concept-authoring.md` -- shaping context (its "/tmp" harness framing is superseded by F1).
4. Memories: `feedback_orchestrator_terminal_pattern`, `feedback_operator_not_technical_review_gate`, `feedback_model_effort_range`, `feedback_fresh_context_for_execution`, `feedback_verify_dispatched_terminal_claims`.

## Critical rules

- **You are the technical gate.** The operator reviews PROSE + intent (D4); he is not the deep technical reviewer. Verify every phase output against LIVE source at the boundary -- an executing terminal's "verified" is a hypothesis until you check it.
- **No SDK -- Workflow subagents only** for programmatic LLM calls (D11 / F2). The Phase-0 runner's answer step is the single highest-risk build; scrutinize it hardest.
- **Fork, not extend** (D9). **80/20 gate** (D10). **Bun not npm; `tx.json` JSONB; 3-part refs for cross-link edges** (D13 / F5). **Runner is tracked at `faq-gate/`** (D12 amendment).
- **Sibling-arc guard:** the neighbor is `2026-06-09-docs-quake-world`. If a read pulls toward VitePress / build-snapshot, you are in the wrong arc.
- **Decisions + contract are law.** Amend decisions via dated blocks; never silently override in a phase MD. ASCII discipline (hyphens, not em-dashes).

## First three actions

1. Read the scaffold + `phase-0-machinery.md` + the contract; confirm the docs-quake-world amendment landed (both arcs reconciled).
2. Push the unpushed commits at a safe checkpoint (verify staging; scope to this arc's files).
3. **Dispatch the Phase-0 EXECUTOR** (fresh terminal, `arc-executor`) to build the machinery -- guardrail (A, inline) + runner (B, Sonnet MAX) + skill (C, Sonnet MAX | Opus medium), with the runner landing in the TRACKED `apps/qw-oracle/scripts/calibration/faq-gate/` per the D12 amendment. Then **verify the Phase-0 boundary against live runs** (runner scores weapon-scripts NAILED + zero hard confab on thread 12393; the skill produces a note that loads via `bun run load-concepts`), NOT against the executor's claims. On pass, move Phase 0 -> shipped in the README and proceed to Phase 1 drafting.

## When in doubt

Route to the operator with plain-English consequences. The decisions + contract resolve most questions; where they do not, it is a genuine operator call. Track executor context budget; recommend a fresh-terminal handoff near ~350k.
