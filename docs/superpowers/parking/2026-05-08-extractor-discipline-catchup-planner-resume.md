You are the arc-planner taking over from a previous session that hit context exhaustion (~400k tokens). Your job: review P5/P6/P7 drafter halts as they arrive, generate executor prompts on approval, ship-housekeep each phase as the executor lands, and drive the arc to completion through P7. After P7 ships, the work routes to arc-reviewer (separate fresh terminal; operator initiates).

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs have similarly-named files in adjacent directories. Always verify reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`. KTX-onboarding tell-tale signs in any drafter halt: "Pattern 6 cross-header lift", "F25 mode_defaults", "F7/F8 anchors", "modes-handler refactor", "taxonomies handler", "27 catalog rows" -- if you see these, the drafter went to the wrong arc; halt + retry.

Working directory: /home/paradoks/projects/quakeworld

## Where things are

- **Phases 1-4 SHIPPED.** Universal probes (idempotency / reproducibility / parallel-vs-serial / migration-probes) all green; 5-project catch-up audit clean across 4 runtime gates. F1 (per-project conftest.py for extractor pytest) is the only HANDOVER carry-forward; deferred indefinitely (P5/P6/P7 add no new tests).
- **Phase 5 / 6 / 7 drafter terminals firing in parallel right now** (operator just spun them up). Drafter prompts at `phase-5-drafter-prompt.md`, `phase-6-drafter-prompt.md`, `phase-7-drafter-prompt.md` (file-as-prompt shape with CRITICAL ARC ID block at top).
- **Doc/cert phase scope:** P5 = `VALIDATION-GATES.md` authoring (7 locked sections per Pass 1.2.6) + onboard-extractor `SKILL.md` update part 1. P6 = audit cadence rule (PLAYBOOK + HANDOVER + memory cross-link) + `SKILL.md` update part 2. P7 = arc-close cert doc at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`.
- **All scaffold artifacts intact** at `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

## Reads required (cold pickup, in order)

1. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md`
   The "Where we are right now" 3-line block is the live source of truth for state. Phase index table shows shipped vs not-started.

2. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md`
   17 locked cross-cutting decisions (D1-D17). For P5/P6/P7 review: D2 (CI-readiness conventions table -> P5 Section 7), D3 (per-project config dict -> P5 Section 5), D4 (F1 quality-grid mirror -> P5 Section 2), D6 (per-gate ship + audit -> P7 cert doc), D8 (per-finding triage -> P7 findings ledger), D9 (VALIDATION-GATES sibling-doc to RUNBOOK), D10 (skill update split: P5 part 1 + P6 part 2), D11 (audit cadence trigger-based -> P6), D15 (mostly inline for doc phases), D16 (ASCII), D17 (git workflow main tree).

3. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md`
   F1 entry from Phase 3 (HANDOVER track). VALIDATION-GATES.md Section 6 should reference the finalize-via-param requirement (Phase 5's responsibility). No other F-entries currently.

4. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md`
   Mandatory shape for each phase MD.

5. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-1-idempotency-probe.md`
   Phase 1 MD. Note the "Post-execution amendments (2026-05-08)" section at the bottom (V6/V8 strictness amendments + FTE asset-bundle cross-arc concern). Style exemplar for P5/P6/P7 amendments if surprises arise.

6. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-2-reproducibility-probe.md`
   Phase 2 MD. Post-execution amendments at bottom (git-diff scoping + Bun.spawnSync stderr type narrowing + FTE asset-bundle EXPLICIT REJECT).

7. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md`
   Phase 3 MD. Post-execution amendments at bottom (V6 strictness amendment + F1 HANDOVER pointer). The V6 amendment mirrors well for any phase whose verification depends on pre-existing-but-not-gate-introduced infrastructure.

8. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md`
   Phase 4 MD. Shipped clean; no amendments section needed.

9. `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`
   Closed two-pass arc-brainstorm parking doc. Pass 1.2.5 (audit cadence trigger set), Pass 1.2.6 (VALIDATION-GATES section list), Pass 2.1 (cert doc shape), Pass 2.2 (skill update split P5/P6), Pass 2.3 (7-phase roadmap) are most load-bearing for P5/P6/P7 review.

10. Operator memory files (read for collaboration style):
    - `feedback_planning_first.md` -- read code, present plan, get approval before building.
    - `feedback_be_decisive.md` -- give recommendations, don't poll.
    - `feedback_one_question_at_a_time.md` -- one question per turn during Q&A.
    - `feedback_plain_english_at_decision_points.md` -- plain English first; SQL/JSON/column lists go to spec, not conversation.
    - `feedback_no_subagents_for_mechanical_edits.md` -- inline execution when full content shipped inline.
    - `feedback_model_effort_range.md` -- Sonnet medium floor; Sonnet MAX for plan drafting; Opus MAX ceiling.
    - `feedback_minimize_branch_ceremony.md` + `feedback_worktree_per_terminal.md` -- main tree default; no PRs.

## Critical rules

- **Operator is creative-director-level technical.** Plain English first at decision points; technical detail in the spec/phase MD body, not the conversation.
- **Lock-shape decisions are durable.** D1-D17 + parking doc Pass 1 + Pass 2 commitments do NOT get relitigated unless a phase reveals a concrete reason. Mid-arc amendments land as dated blocks under the original decision.
- **File-as-prompt shape is the convention.** All drafter + executor prompts in this arc are file-as-prompt (no BEGIN/END wrapper, CRITICAL ARC IDENTIFICATION at top). Future executor prompts you generate follow the same shape.
- **Operator does not touch git.** You commit + push at natural checkpoints (phase boundaries, scaffold landings, prompt refactors). Use HEREDOC commit messages with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` per project CLAUDE.md.
- **ASCII-only in shared docs.** D16 + operator memory `feedback_output_discipline_sentiment.md`. HANDOVER.md may contain pre-existing em-dashes; do NOT propagate them; new entries use ASCII.
- **Don't dispatch subagents for mechanical markdown edits.** Phase MDs that ship full content inline get executed via Edit/Write/Bash directly. P5/P6/P7 are markdown-heavy; almost all tasks should be inline.
- **Workflow per phase:** drafter terminal halts -> you review phase MD against scaffold + decisions + parking doc -> if approved, generate executor prompt (file-as-prompt at `phase-N-executor-prompt.md`) -> operator opens fresh terminal to execute -> executor halts with structured status -> you review status + apply post-execution amendments to phase MD if needed -> commit + flip README status to `shipped (<sha>)`.

## Phase index (current status)

| Phase | Status | Phase MD path | Next planner action |
|---|---|---|---|
| 1 | shipped (`f64ef308` + `7d398e62`) | `phase-1-idempotency-probe.md` | n/a |
| 2 | shipped (`2e7808eb` + amendments in `8beb06b4`) | `phase-2-reproducibility-probe.md` | n/a |
| 3 | shipped (`8f561cba` + ship-housekeeping in `6429fc90`) | `phase-3-parallel-serial-tests.md` | n/a |
| 4 | shipped (`9901f308` + ship-housekeeping in `54ce06d3`) | `phase-4-migration-probes.md` | n/a |
| 5 | drafter in flight | `phase-5-authoring-guide.md` (not yet drafted) | Review halt -> generate executor prompt |
| 6 | drafter in flight | `phase-6-audit-cadence.md` (not yet drafted) | Review halt -> generate executor prompt |
| 7 | drafter in flight | `phase-7-cert-doc.md` (not yet drafted) | Review halt -> generate executor prompt |

## First three actions

1. **Confirm arc state.** Read scaffold (README + decisions + review-findings + phase-template) + skim P3 + P4 amendments sections as exemplars for P5/P6/P7 amendments. Check `git status` to see if any uncommitted work exists from the prior session. Greet operator with a 1-paragraph plain-English summary: "Picked up cold; here's what shipped + what's pending; ready for next drafter halt."

2. **Wait for P5/P6/P7 drafter halts.** Operator will paste back drafter status reports as those terminals finish. For each:
   - Verify the phase MD path is in this arc's directory (NOT KTX onboarding).
   - Read the phase MD top-to-bottom; cross-check against decisions.md (D2/D3/D4/D9/D10/D11/D15/D16) + parking doc (Pass 1.2.5 / 1.2.6 / 2.1 / 2.2 / 2.3 per phase) + live source (shipped P1-P4 gate files for P5; PLAYBOOK + SKILL.md for P6; commit bodies for P7).
   - For P7: cross-check the per-gate cross-project pass-state matrix against shipped commit bodies (run `git show <sha>` for f64ef308 / 2e7808eb / 8f561cba / 9901f308 + the eventual P5 + P6 commits).
   - If approved: commit phase MD + flip README status row to "approved"; generate executor prompt at `phase-N-executor-prompt.md` in file-as-prompt shape; tell operator to `@<path>` it in a fresh terminal (with Esc-then-Enter to bypass the picker default-selection bug).
   - If revisions needed: surface concretely; recommend either re-prompt the same drafter terminal OR open a new fresh terminal with corrections in the prompt's optional hint section.

3. **After each phase ships (executor commits + halts), apply ship-housekeeping** (mirror the pattern from P3 commit `6429fc90` + P4 commit `54ce06d3`):
   - Add Post-execution amendments section to phase MD if surprises arose (P1/P2/P3 patterns are exemplars; skip if shipped clean per P4)
   - Flip README phase row to "shipped (`<sha>`)"
   - Update "Where we are right now" 3-line block
   - Add F-entries to `review-findings.md` if any found
   - Add HANDOVER.md entries if any HANDOVER tracks (use ASCII `--`, not em-dash)
   - Commit + push

## Open follow-ups

- **F1 (per-project conftest.py for extractor pytest)** -- HANDOVER, deferred indefinitely. P5/P6/P7 add no new tests; deferral safe through arc close. Tracked in `review-findings.md` + `HANDOVER.md` Small followups.
- **arc-orchestrator handoff doc:** When all 7 phase MDs land + ship, write the orchestrator handoff at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-orchestrator-handoff.md`. (For solo-execution arcs like this one, the handoff doubles as the wrap-up summary.)
- **arc-reviewer pass:** Post-arc, runs in a fresh terminal per `arc-reviewer` skill (operator initiates). Reviewer reads parking doc + decisions + per-phase MDs + commit bodies cold; produces DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING walkthrough.

## When in doubt

- Route to operator with concise plain-English consequences. Don't poll; recommend.
- If a finding from a drafter conflicts with decisions.md, decisions wins; reject with a one-line rationale in the phase MD's "Open questions" section.
- If a drafter terminal got the wrong arc (signs: KTX onboarding finding numbers F1-F30 with KTX onboarding context, "modes handler", "Pass 1 entity handlers", references to `2026-05-04` paths), have operator close the terminal and retry with the correct file via `@<path>` + Esc + Enter (the picker default-selection bug fires the wrong file when raw paths are typed; Esc dismisses the picker so Enter submits the typed text verbatim).

## Recent commit log (this arc)

```
814621ea docs(arc-plan): phase-5/6/7 drafter prompts -- doc/cert phases queued
54ce06d3 docs(arc-plan): phase-4 ship-housekeeping -- README flip + 4/7 phases shipped
6429fc90 docs(arc-plan): phase-3 ship-housekeeping -- amendments + F1 HANDOVER pointer + README flip
9901f308 extractor-discipline-catchup phase 4: per-migration validation probes
8f561cba extractor-discipline-catchup phase 3: parallel-vs-serial test pattern lift
c6f6e322 docs(arc-plan): phase-4 MD approved + executor prompt
868dfc22 docs(arc-plan): phase-3 MD approved + executor prompt
8beb06b4 docs(arc-plan): phase-2 housekeeping -- README SHA backfill + post-execution amendments
2e03bbb5 docs(arc-plan): planner resume handoff -- prior session at 435k context (THIS doc supersedes that one; same path, fresher content)
2e7808eb feat(qw-oracle): universal reproducibility probe + 5-project audit -- Phase 2
7d398e62 docs(arc-plan): phase-1 post-execution amendments -- V6/V8 strictness + FTE asset-bundle flag
f64ef308 extractor-discipline-catchup phase 1: universal idempotency probe + 5-project audit
9a55c6d8 docs(arc-plan): extractor-discipline-catchup scaffold complete -- 6 artifacts
```

End of arc-planner resume handoff.
