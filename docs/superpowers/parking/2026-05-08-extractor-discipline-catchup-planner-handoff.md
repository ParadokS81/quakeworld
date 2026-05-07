# arc-planner handoff -- Lift KTX-grade extractor discipline (2026-05-08)

**Use as the literal first message in a fresh `claude` terminal.** Pass 2 of the brainstorm closed 2026-05-08 (commit pending at handoff time). The brainstorm is DONE; remaining unknowns are implementation-shaped and ready for arc-planner to scaffold against.

## Where things are

- **Brainstorm:** complete. Pass 1 (inventory + per-gate design) and Pass 2 (catch-up pattern + skill update + roadmap) both LOCKED.
- **Parking doc:** `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` -- contains all locked decisions, Pass 1 + Pass 2 outcomes, carry-forwards.
- **Pass 2 handoff (the input doc that drove Pass 2):** `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-pass2-handoff.md` -- still useful as a per-pass record.
- **Total scope:** one arc, seven phases, ~5 universal probes + 1 process rule + 1 doc + 1 cert doc. Graduation-readiness arc; CI-readiness conventions baked in but CI itself is parked separately.

## Reads required (cold pickup, in order)

1. **`docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`** -- the parking doc end-to-end. Pass 1 outcomes (gate inventory, per-gate design, CI-readiness conventions) and Pass 2 outcomes (catch-up pattern, skill update sketch, roadmap with 7-phase sequence) are the durable input.
2. **`apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`** -- the model universal gate. Every new gate mirrors its dispatch shape (per-project flag, exit codes, `--json`, dispatcher case in `index.ts`).
3. **`apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`** -- methodology context. The new gates make sections of this RUNBOOK runnable rather than prose.
4. **`apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`** -- producer-facing playbook; the new VALIDATION-GATES.md doc is its sibling on the validation-gate side.
5. **`apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh`** -- the KTX-only bash probe that's the lift source for Phase 1. Read end-to-end; the universal `idempotency.ts` borrows the volatile-column-strip pattern (Issue #5 post-fix shape).
6. **`~/.claude/skills/onboard-extractor/SKILL.md`** -- the skill that Phase 5 + Phase 6 update.
7. **`docs/superpowers/plans/2026-05-04-ktx-onboarding/`** -- the most-recent multi-phase arc (closest exemplar for arc-planner to scaffold against). Read: README.md, decisions.md, review-findings.md, phase-template.md, handoff-prompt.md.
8. **Operator memory:**
   - `feedback_retrofit_later_discipline.md` -- the principle this arc encodes.
   - `feedback_scaffold_then_fanout_for_multi_phase_plans.md` -- this arc qualifies; scaffold first, fan out per-phase MDs with sub-agent verification.
   - `feedback_model_effort_range.md` -- per-task model + effort selection.
   - `feedback_narrow_arc_before_broad.md` -- gate-by-gate ship cadence, no bundling within phases.
   - `feedback_no_subagents_for_mechanical_edits.md` -- when phase MDs ship full file content, executor edits inline (no subagent).
   - `feedback_plain_english_at_decision_points.md` -- arc-planner phases describe what changes in plain English first; SQL DDL / column lists / regex patterns go into the body, not the conversation.

## Critical rules

- **Pass 1 + Pass 2 lock-shape decisions are durable.** Do NOT relitigate the gate inventory, per-gate design, sequencing, or skill-update shape unless arc-planner finds a concrete reason a phase MD cannot honor a locked decision.
- **One arc, seven phases.** Not seven separate arcs. Phases share Pass-1 CI-conventions table and benefit from cross-phase orchestrator context.
- **Each phase ships its own catch-up audit** (the per-gate ship discipline locked in 2.1). Phase done-criterion includes "ran against all 5 projects, findings inline in commit body."
- **Manual probes, not auto-invoked.** Mirrors existing F1 quality-grid pattern. CI integration is a separate future arc.
- **Real-bug-found bugfix rides the same phase commit** (D16 coherent-unit principle). If Phase 1 surfaces a real idempotency bug in MVDSV, the bugfix is part of Phase 1, not a follow-up.
- **The onboard-extractor skill update is part of the implementation arc**, NOT a side-edit. Phase 5 (authoring guide doc) and Phase 6 (cadence rule) include the SKILL.md edits per Pass 2.2's three concrete changes. Skill lives at `~/.claude/skills/onboard-extractor/SKILL.md` (user-global, not project-local).
- **Operator preferences:** plain English at decision points; one question at a time during Q/A; be decisive (recommend, don't poll); ASCII discipline in shared docs / code.

## First three actions

1. **Re-read the parking doc end-to-end** to confirm Pass 1 + Pass 2 lock-shape is solid before scaffolding. The 7-phase roadmap table is the load-bearing input.
2. **Build the 6-artifact arc scaffold** at `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`:
   - `README.md` -- arc-level overview, phase list, links to spec docs
   - `decisions.md` -- promote Pass 1 + Pass 2 locked decisions to D1-Dn entries
   - `review-findings.md` -- empty initially; F-entries land during execution
   - `prerequisites.md` -- DB state, dev env, Postgres + dev container running
   - `phase-template.md` -- standard phase MD shape (header / context / tasks / verification / commit / handoff)
   - `handoff-prompt.md` -- the prompt that arc-orchestrator pastes into each phase's executor terminal
3. **Run slicing analysis per phase.** For each of the 7 phases:
   - Verification regime (which probes / tests / smoke checks)
   - Context budget (rough token estimate; flag any phase >250k as needing tight scope)
   - Per-task execution mode annotations (subagent + model + effort | inline). Idempotency probe authoring is likely Sonnet-medium-or-Opus-medium subagent territory; documentation phases (Phase 5 / 6) are inline; migration-probe authoring (Phase 4) is per-migration subagent fan-out (one subagent per ~3 migrations grouped).
4. **Draft per-phase MDs** at `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-N-<slug>.md`. Per `feedback_scaffold_then_fanout_for_multi_phase_plans.md`, build the scaffold first, then fan out per-phase drafters in fresh sub-agent terminals with verification.

## Phase outline (locked from Pass 2.3)

| Phase | Slug | Slug for filename |
|---|---|---|
| 1 | Idempotency probe (universal `idempotency.ts`) | `phase-1-idempotency-probe.md` |
| 2 | Reproducibility probe (Stage 1 `reproducibility-check.ts`) | `phase-2-reproducibility-probe.md` |
| 3 | Parallel-vs-serial test pattern (lift KTX helpers) | `phase-3-parallel-serial-tests.md` |
| 4 | Per-migration validation probes | `phase-4-migration-probes.md` |
| 5 | Authoring guide doc (`VALIDATION-GATES.md`) + skill update part 1 | `phase-5-authoring-guide.md` |
| 6 | Cross-project audit cadence rule + skill update part 2 | `phase-6-audit-cadence.md` |
| 7 | Arc-close cert doc | `phase-7-cert-doc.md` |

Phase 5 + Phase 6 split the onboard-extractor SKILL.md update across them: Phase 5 lands the new pre-flight + register-in-config-dict step, Phase 6 lands the validation-step expansion + explicit "no per-project bash" callout.

## When in doubt

- **If a phase MD draft proposes a different shape than Pass 2.3's roadmap,** surface to operator before committing the draft. Brainstorm-locked decisions are durable.
- **If the per-gate config-dict pattern doesn't fit a specific gate** (e.g., migration probes don't need per-project config), document the carve-out in the phase MD; don't force the pattern.
- **If Pass 1's CI-readiness conventions** (exit codes, `--json`, env-var DB config) feel under-specified for a phase, reference Pass 1's lock-shape table directly in the phase MD; don't paraphrase.
- **If a phase looks bigger than expected** (e.g., Phase 4 migration-probe authoring exceeds 1 day of executor time), surface a slicing recommendation to operator. Sub-phase split is acceptable; bundling phases is not.

## Exit criterion

arc-planner is DONE when:

1. The 6-artifact scaffold exists at `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.
2. Each of the 7 phase MDs is drafted with task list + execution mode annotations + verification regime + commit pattern.
3. Slicing analysis identifies per-phase context budget and any phase that needs tight scoping.
4. Operator approves the scaffold.
5. arc-orchestrator handoff prompt is included in `handoff-prompt.md`, ready for the operator to paste into a fresh terminal to begin execution.

End of arc-planner handoff.
