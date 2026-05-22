# KTX L1 categorize + audit HTML -- fresh-terminal executor handoff

**Date:** 2026-05-22
**Status:** Spec + plan written and committed. Execution NOT started. Fresh terminal picks up from Task 1.
**Mode:** Subagent-driven execution. Required sub-skill: `superpowers:subagent-driven-development`.

## What this is

A mini-arc that does two things, in this order:

1. **Adds an LLM-derived category to every KTX L1 cvar+command** (~618 entities), stored in a new `category_inferred` column on `cvar_versions` / `command_versions`, written by Sonnet-medium sub-agent fan-out. Mirrors the format-unify pattern (`docs/superpowers/plans/2026-05-21-ktx-l1-format-unify.md`).
2. **Generates a single-page HTML audit catalog** at `apps/qw-oracle/docs/reviews/<TODAY-DATE>-ktx-l1-catalog.html` that renders all 618 entities with collapsible category groups + sticky TOC + filter box, so the operator can finally browse what shipped from format-unify without writing SQL.

Schema column persists; same script later regenerates an MVDSV catalog when MVDSV's describe-fill ships.

## Reads required (in this order)

1. `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md` -- the implementation plan. **5 phases, 21 tasks, ~1300 lines.** Self-contained: every step has the actual commands + code + expected output. Don't try to summarize before executing -- the bite-sized step shape is the contract.
2. `docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md` -- the spec. Read it to understand the WHY behind the plan; the plan itself is the WHAT.
3. `docs/superpowers/plans/2026-05-21-ktx-l1-format-unify.md` -- the pattern this mini-arc mirrors. Useful as a template if anything in the plan needs a sister-arc precedent.

## Critical rules (non-negotiable)

- **Migration ordinal is derived at execution time** (per `feedback_cross_phase_audit_shared_file_drift`). Do not freeze the `<NNN>` value from a stale read; check `ls apps/qw-oracle/db/migrations/` and increment the highest. The plan's Step 1.1 walks this.
- **Coverage guard is load-bearing** at Step 15.4 -- HTML generation refuses to ship if any KTX entity lacks `category_inferred`. Do not bypass with `--force` or skip the guard. If HALT rows or NEW-CATEGORY-NEEDED rows surface in Phase 3, resolve them via the overrides ledger (Step 14.3) before applying.
- **No invention of category names** in the sub-agent ledger -- the prompt's "Constraints (non-negotiable)" section forbids the sub-agent from putting an unlocked category in `NEW category_inferred:`. NEW-CATEGORY-NEEDED is the structured escape valve.
- **The category list locks at Phase 2 (calibration)** -- once locked, fan-out (Phase 3) enforces the locked set. If the calibration ledger reveals a gap, iterate the prompt + re-run calibration on the same 30 entities. Do not let the fan-out drift the taxonomy.
- **ezQuake stays out.** This mini-arc is KTX-only. ezQuake's `group_name_in_source` is source-truth and is sufficient; do not LLM-categorize ezQuake.

## Things to know about this terminal vs the prior one

- **Visual companion server may still be alive** at http://localhost:65493 (auto-exits after 30 min of inactivity). The brainstorm mockups persist in `.superpowers/brainstorm/14905-1779396922/content/`. The most relevant one is `collapse-pattern.html` -- it shows the locked per-row + two-tier collapse shape the HTML generator must produce at Task 18-20. Worth opening once for visual reference before authoring the renderer.
- **MEMORY.md size pressure** -- 26.2KB / 187 lines at session start, exceeds both 20KB and 150-line thresholds per docs-check. Independent of this work; flagging because the docs-check session-wrap may surface it. Do not let it block.
- **Git state at handoff:** spec + plan committed on `main`. No uncommitted work for this arc. Format-unify is on `main` at tag `arc-ktx-format-unify-shipped`.
- **No worktree needed.** Per CLAUDE.md, slipgate-app is the only project that requires the main tree; this work touches qw-oracle + docs. Main tree is fine.

## First three actions

1. Read the plan README (`docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md`) top to bottom. Read the "File Structure" + "Strawman category list" + Phase 1 in detail; skim Phases 2-5.
2. Invoke `superpowers:subagent-driven-development` to set up the per-task subagent dispatch shape. The plan's checkbox-tracked tasks become the work queue.
3. Start Task 1.1 (derive next migration ordinal). The fresh ordinal will probably be `016` (last shipped was `015_l1_runtime_fidelity_provenance.sql` from enforce-L1) -- verify at execution time; do not freeze.

## When in doubt

- **Plan beats spec.** The spec captures design intent; the plan captures the exact steps. If they conflict, follow the plan and surface the conflict as a finding to the operator before continuing.
- **Format-unify is the reference template.** When stuck on "how should the apply script handle X" or "what shape should the sub-agent ledger take," check `b5-format-unify-prompt.md` and `apply-l1-format-unify.py` -- this mini-arc mirrors them almost 1:1.
- **Operator pace estimates beat conservative ones** (`feedback_trust_operator_pace_estimates`). If a phase finishes faster than the plan estimates, that's expected, not a smell.
- **Verification discipline applies** -- before naming a number / file path / count in your status updates, verify against live DB or live source. Don't relay sub-agent claims unverified (`feedback_verify_dispatched_terminal_claims`).
- **Operator is not the technical review gate** (`feedback_operator_not_technical_review_gate`) -- surface plain-English judgments at gates, not raw SQL or stack traces.

## Expected sizing

- Phase 1 (schema + apply + F1 probe + SCHEMA.md): ~30-45 min
- Phase 2 (prompt + calibration + lock): ~60-90 min (sub-agent + operator review)
- Phase 3 (fan-out, 4 waves of 8): ~90 min (parallel sub-agent dispatch + spot-checks)
- Phase 4 (apply + verify): ~30 min
- Phase 5 (HTML generator, 4 tasks): ~2-3 hours

Total: roughly one focused session, mostly sub-agent-driven with operator review at gates.

## Ship criteria

- All 618 KTX entities have `category_inferred` populated (coverage guard PASS).
- `F1.category_inferred_provenance_integrity` PASSes.
- HTML catalog renders at `apps/qw-oracle/docs/reviews/<TODAY-DATE>-ktx-l1-catalog.html`.
- Operator opens the HTML, scans through, signs off.
- Git tag `arc-ktx-categorize-shipped` pushed.

Retrospective lands in `apps/qw-oracle/docs/arc-history.md` at the top of the file when shipped (operator-written or final-task-written -- follow format-unify's retrospective shape).
