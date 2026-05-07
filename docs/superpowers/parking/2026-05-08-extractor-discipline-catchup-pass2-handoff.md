# Pass 2 handoff -- Lift KTX-grade extractor discipline (2026-05-08)

**Use as the literal first message in a fresh `claude` terminal IF the operator chooses fresh-terminal handoff. If continuing in the same session, this doc serves as the agenda.**

## Where things are

Pass 1 of the catch-up arc is COMPLETE (drained + committed). 

Parking doc: `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`.

Pass 1 locked:
- 5 universal probes + 1 process rule + 1 doc deliverable.
- Per-gate design sketches (CLI shape, file paths, design choices).
- CI-readiness conventions baked in.
- 4 separate-arc parks (CI setup, contributor onboarding, test-coverage parity, Stage 3 snapshot probes).

## Reads required (cold pickup, in order)

1. **`docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`** -- the parking doc itself; Pass 1 outcomes, locked design, carry-forwards.
2. **`docs/superpowers/parking/2026-05-07-ktx-postreview-investigation-and-prod-prep.md`** -- ongoing KTX post-review work; some Pass 2 audit findings may overlap with Issues #3 / #5 there.
3. **`apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`** -- the model universal-gate. Pass 2's roadmap recommendation should respect what this artifact already does.
4. **`apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`** -- methodology context; Pass 2's audit plan dispatches into RUNBOOK sections.
5. **`apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`** -- what onboard-extractor skill currently teaches; Pass 2 amends.
6. **`~/.claude/skills/onboard-extractor/`** -- the skill Pass 2 updates. Read its current shape to know what changes.
7. **Operator memory `feedback_retrofit_later_discipline.md`** -- the principle this arc encodes.

## Critical rules

- **Operator preferences:** plain-English at decision points; one question at a time during Q/A; be decisive (recommend, don't poll); ASCII discipline in shared docs/code.
- **Pass 1's lock-shape decisions are durable.** Do NOT relitigate the gate inventory or per-gate design unless a Pass 2 finding genuinely contradicts a Pass 1 commitment.
- **Trigger-based audit cadence.** Pass 2's roadmap should respect this -- the catch-up audit IS the first instance of the cadence rule firing (it's a "lift to universal + retroactively certify" event).
- **The onboard-extractor skill update touches a USER-GLOBAL skill** (`~/.claude/skills/`), not a project-local one. Edits go through the skill's source directory.
- **Don't bundle CI setup into this arc** -- it's parked as a separate future arc per Pass 1's carry-forwards.
- **Default ship cadence is gate-by-gate** per `feedback_narrow_arc_before_broad.md`. Push back only if you find a concrete reason to bundle.

## First three actions

1. **Re-read the parking doc end-to-end** to confirm Pass 1's lock-shape is solid in your head before opening Pass 2.
2. **Open Pass 2 with sub-question 2.1: catch-up audit plan.** Walk: which gates run against which projects, in what order, what we expect to surface, triage flow if findings emerge.
3. **Continue through 2.2 (onboard-extractor skill update) and 2.3 (roadmap).** Pass 2 expected to lock in 3-4 sub-questions; smaller surface than Pass 1 because the per-gate design is already settled.

## Pass 2 sub-questions (proposed -- can refine on open)

- **2.1 Catch-up audit plan.** What's the order of operations for running each new gate against the four earlier projects? What's the expected output shape (audit findings doc)? What's the triage flow if findings surface (drain-now / drain-in-arc / HANDOVER)? Is the catch-up audit one document or multiple?
- **2.2 onboard-extractor skill update.** What does the skill do today for a new codebase? What does it stop doing (no more per-project bash script scaffolding)? What does it start doing (add a per-project config dict entry to each universal-gate file)? Is there a migration story for the existing 5 projects' configs?
- **2.3 Roadmap.** Gate-by-gate (each in its own small arc) vs all-at-once (one bigger arc). Auto-run as post-load step vs separate manual probe. Sequencing: idempotency probe is the most concrete starter; what comes second / third?

## When in doubt

- **Default to gate-by-gate** for the roadmap. The argument for all-at-once needs a concrete benefit beyond "it's all related."
- **If onboard-extractor skill changes look bigger than expected,** surface as a sidequest -- don't widen Pass 2 silently.
- **If the catch-up audit suggests a real loader bug exists in an earlier project,** that's a finding to drain via the gate-by-gate ship (when the relevant gate lands, it surfaces the bug; the bugfix rides the gate's commit). Don't pre-fix bugs in Pass 2 brainstorm.
- **Pass 2 closes with an arc-planner handoff** at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup-planner-handoff.md` so arc-planner can scaffold the implementation arc.

## Exit criterion

Pass 2 is DONE when:

1. Catch-up audit plan is locked (order of operations, output shape, triage flow).
2. onboard-extractor skill update is sketched (concrete edits to make).
3. Roadmap recommendation is locked (gate sequencing, ship cadence, dependencies between gates).
4. arc-planner handoff prompt is drafted.

End of Pass 2 handoff.
