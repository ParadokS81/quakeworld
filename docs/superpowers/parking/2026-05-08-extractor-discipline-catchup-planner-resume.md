You are the arc-planner taking over from a previous session that hit context exhaustion (~435k tokens). Your job: continue reviewing phase MDs as drafter terminals halt, generate executor prompts on approval, and drive the arc to completion.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs have similarly-named files in adjacent directories. Always verify reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

Working directory: /home/paradoks/projects/quakeworld

## Where things are

- **Arc:** Lift KTX-grade extractor discipline (idempotency / reproducibility / parallel-vs-serial / per-migration probes) to universal coverage across all 5 extractor projects. 7 phases total.
- **Phase 1 SHIPPED** -- commit `f64ef308` (deliverables) + `7d398e62` (post-execution amendments). Universal `idempotency.ts` lift; 5-project audit clean in steady state; V6/V8/asset-bundle concerns documented in phase MD's "Post-execution amendments" section.
- **Phase 2 SHIPPED** -- per README's "Where we are right now" block; universal `reproducibility-check.ts`; all 5 projects PASS; 2 drain-now fixes shipped during execution (git-diff scoped to output/ dir; `extractResult.stderr` optional chaining for Bun.spawnSync type narrowing). Phase 2 may benefit from a "Post-execution amendments" section mirroring Phase 1's pattern (operator's call).
- **Phase 3 drafter retry pending** -- first drafter terminal got the WRONG file (KTX onboarding's phase-3-modes-handler.md instead of this arc's phase-3-parallel-serial-tests). Refactored prompt at `phase-3-drafter-prompt.md` now uses file-as-prompt shape with strong arc identification at top.
- **Phase 4 drafter status unknown** -- might have hit the same wrong-file issue; verify with operator.
- **Phase 5/6/7 drafter prompts not yet generated** -- wait for P3+P4 phase MDs to land first (so doc phases reference shipped conventions).
- **All 6 prompt files in this arc refactored to file-as-prompt shape** in commit `f0adb772` (no BEGIN/END wrapper; CRITICAL ARC IDENTIFICATION at top). Operator types `@<path>` in fresh terminals to attach.
- **arc-planner SKILL.md updated** at `~/.claude/skills/arc-planner/SKILL.md` (user-global, not in repo) -- section 1e mandates file-as-prompt shape for future arcs.

## Reads required (cold pickup, in order)

1. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md`
   - The "Where we are right now" 3-line block is the live source of truth for state. Phase index table shows shipped vs not-started.

2. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md`
   - 17 locked cross-cutting decisions (D1-D17). Every phase MD respects these. D2 (CI-readiness conventions), D3 (per-project config dict), D6 (per-gate catch-up audit), D7 (real-bug-fix rides commit), D8 (per-finding triage), D12 (JSONB binding), D15 (execution modes) are most load-bearing.

3. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md`
   - Currently empty preamble; F-entries accrue during execution.

4. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md`
   - Mandatory shape every phase MD must follow.

5. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-1-idempotency-probe.md`
   - Shipped P1 phase MD. Note the "Post-execution amendments" section at the bottom (V6 stdout contamination + V8 grep historical narration + FTE asset-bundle re-stamp).

6. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-2-reproducibility-probe.md`
   - Shipped P2 phase MD. May lack a "Post-execution amendments" section that documents the 2 drain-now fixes from execution; operator may want one added.

7. `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`
   - The closed two-pass arc-brainstorm parking doc (Pass 1 inventory + per-gate design; Pass 2 catch-up audit pattern + skill update + roadmap). Source of truth for shape questions.

8. Operator memory files (read for collaboration style):
   - `feedback_planning_first.md` -- read code, present plan, get approval before building.
   - `feedback_be_decisive.md` -- give recommendations, don't poll.
   - `feedback_one_question_at_a_time.md` -- one question per turn during Q&A.
   - `feedback_plain_english_at_decision_points.md` -- plain English first; SQL/JSON/column lists go to spec, not conversation.
   - `feedback_no_subagents_for_mechanical_edits.md` -- inline execution when full content shipped inline.
   - `feedback_model_effort_range.md` -- Sonnet medium floor; Sonnet MAX for plan drafting; Opus MAX ceiling.
   - `feedback_minimize_branch_ceremony.md` + `feedback_worktree_per_terminal.md` -- main tree default; no PRs.

## Critical rules

- **Operator is creative-director-level technical.** Conceptually fluent (data transforms, system boundaries, contracts) but not deep on implementation. Plain English first at decision points; technical detail in the spec/phase MD body, not the conversation.
- **Lock-shape decisions are durable.** Pass 1 + Pass 2 from brainstorm + the 17 decisions in decisions.md don't get relitigated unless a phase reveals a concrete reason. Mid-arc amendments land as dated blocks under the original decision.
- **File-as-prompt shape is the convention.** All 6 prompt files in this arc are file-as-prompt (no BEGIN/END wrapper, CRITICAL ARC IDENTIFICATION at top). Future drafter/executor prompts you generate follow the same shape.
- **Operator does not touch git.** You commit + push at natural checkpoints (phase boundaries, scaffold landings, prompt refactors). Use HEREDOC commit messages with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` per project CLAUDE.md.
- **Don't dispatch subagents for mechanical markdown edits.** Phase MDs that ship full content inline get executed via Edit/Write/Bash directly.
- **Workflow:** drafter terminal halts -> you review phase MD against scaffold + decisions + parking doc -> if approved, generate executor prompt (file-as-prompt at `phase-N-executor-prompt.md`) -> operator opens fresh terminal to execute -> executor halts with structured status -> you review status + apply post-execution amendments to phase MD if needed -> commit + flip README status to `shipped (<sha>)`.

## Phase index (current status)

| Phase | Status | Phase MD path | Notes |
|---|---|---|---|
| 1 | shipped (`f64ef308` + `7d398e62`) | `phase-1-idempotency-probe.md` | Post-execution amendments documented |
| 2 | shipped | `phase-2-reproducibility-probe.md` | May benefit from post-exec amendments section (operator's call) |
| 3 | drafter retry pending | `phase-3-parallel-serial-tests.md` (not yet drafted) | First drafter got wrong file (KTX arc); refactored prompt fixes |
| 4 | drafter status unknown | `phase-4-migration-probes.md` (not yet confirmed) | Verify with operator |
| 5 | not started | `phase-5-authoring-guide.md` | Drafter prompt not yet generated; depends on P1-P4 drafts |
| 6 | not started | `phase-6-audit-cadence.md` | Drafter prompt not yet generated |
| 7 | not started | `phase-7-cert-doc.md` | Drafter prompt not yet generated; arc-close cert |

## First three actions

1. **Confirm arc state.** Read scaffold (README + decisions + review-findings + phase-template) + Phase 1/2 phase MDs cold. Check git status to see if any uncommitted work exists from the prior session. Greet operator with a 1-paragraph plain-English summary: "Picked up cold; here's what shipped + what's pending; ready for next report."

2. **Wait for P3/P4 drafter halts.** Operator will paste back drafter status reports as those terminals finish. For each:
   - Verify the phase MD path is in this arc's directory (NOT KTX onboarding).
   - Read the phase MD top-to-bottom; cross-check against decisions.md (D2/D3/D4/D6/D7/D8/D12/D13/D15) + parking doc Pass 1.2.X for the gate's lock-shape spec.
   - If approved: commit phase MD + flip README status row to "approved"; generate executor prompt at `phase-N-executor-prompt.md` in file-as-prompt shape; tell operator to `@<path>` it in a fresh terminal.
   - If revisions needed: surface concretely; recommend either re-prompt the same drafter terminal OR open a new fresh terminal with corrections in the prompt's optional hint section.

3. **After P3 + P4 ship.** Generate P5/P6/P7 drafter prompts (file-as-prompt shape; CRITICAL ARC IDENTIFICATION at top; phase-specific scope + reads + recon + step-by-step). Per the parking doc Pass 2.3 roadmap:
   - P5: VALIDATION-GATES.md authoring + onboard-extractor SKILL.md update part 1 (register-in-config-dict step + validation step expansion).
   - P6: cross-project audit cadence rule (EXTRACTOR-PLAYBOOK section + HANDOVER tracking) + SKILL.md update part 2 ("no per-project bash" callout).
   - P7: arc-close cert doc at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`.

## Open follow-ups

- **P2 post-execution amendments:** Phase 2 shipped with 2 drain-now fixes (git-diff scoping; Bun.spawnSync stderr type). Phase MD might benefit from a "Post-execution amendments" section mirroring Phase 1's pattern at the bottom of `phase-1-idempotency-probe.md`. Surface to operator; their call.
- **P2 commit SHA in README:** README's Phase 2 row says "shipped" without SHA; Phase 1's row has `f64ef308`. Minor inconsistency; ask operator if they want it filled in.
- **arc-orchestrator handoff doc:** When all 7 phase MDs land (per arc-planner exit criterion), write the orchestrator handoff at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-orchestrator-handoff.md`.
- **arc-reviewer pass:** Post-arc, runs in a fresh terminal per arc-reviewer skill (operator initiates).

## When in doubt

- Route to operator with concise plain-English consequences. Don't poll; recommend.
- If a finding from a drafter conflicts with decisions.md, decisions wins; reject with a one-line rationale in the phase MD's "Open questions" section.
- If a drafter terminal got the wrong arc (signs: KTX onboarding finding numbers, "modes handler", "Pass 1 entity handlers", references to `2026-05-04` paths), have operator close the terminal and retry with the correct file via `@<path>`.

## Recent commit log (this arc)

```
f0adb772 docs(arc-plan): refactor remaining prompts to file-as-prompt shape
2e7808eb [Phase 2 ship; commit message TBD -- check with operator]
52cfa91f docs(arc-plan): refactor phase-3/4 drafter prompts -- file-as-prompt for @<path> use
7d398e62 docs(arc-plan): phase-1 post-execution amendments -- V6/V8 strictness + FTE asset-bundle flag
f64ef308 [Phase 1 ship -- universal idempotency.ts + dispatcher + KTX bash deletion + 5-project audit]
60d3c123 docs(arc-plan): extractor-discipline-catchup phase-1 drafter prompt -- pre-substituted
a3780d35 docs(arc-plan): phase-1 executor prompt + phase 2/3/4 drafter prompts for parallel fan-out
54611ab9 docs(arc-plan): phase-1 phase MD approved -- universal idempotency probe + 5-project audit
9a55c6d8 docs(arc-plan): extractor-discipline-catchup scaffold complete -- 6 artifacts
```
