# Extractor discipline catch-up -- arc plan

**Spec:** `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md` (closed two-pass arc-brainstorm; Pass 1 + Pass 2 outcomes locked 2026-05-08)

**Goal:** Lift KTX-grade extractor discipline (idempotency / reproducibility / parallel-vs-serial / per-migration probes) to universal coverage across all 5 extractor projects (ezQuake / FTE / QWCL / MVDSV / KTX), retroactively certify existing projects, and bake the gate set into onboarding so future codebases inherit by default. Includes graduation-readiness deliverables: producer-side authoring guide doc + cross-project audit cadence rule + onboard-extractor skill update + arc-close cert doc.

**Total scope:** 5 universal probes (idempotency / reproducibility / parallel-vs-serial / per-migration / cert summary) + 1 process rule (audit cadence) + 1 doc (VALIDATION-GATES.md) + skill update split across 2 phases. Seven phases. Manual probes (not auto-invoked); CI integration is a separate future arc.

**Status:** Planning. Per-phase MDs are drafted by fresh terminals following the per-phase drafter prompts (`handoff-prompt.md` with `<PHASE_NUMBER>` substituted). Each phase MD is verified by a sub-agent before operator review. Phases land in commit order; each phase boundary is operator-reviewed before the next phase begins.

---

## Where we are right now

- **Stage:** Phase 1 + 2 SHIPPED; Phase 3 approved (executor prompt ready at `phase-3-executor-prompt.md`); Phase 4 drafter terminal in flight.
- **Last action:** 2026-05-08 -- Phase 3 drafter halted; MD reviewed against decisions + live source; approved; executor prompt generated. Q2 (F25 guard) auto-resolved -- guard already removed from `ktx/extract.py`, modes test will run actively. P2 housekeeping (SHA backfill + Post-execution amendments section) shipped in commit `8beb06b4`.
- **Next action:** Operator opens fresh terminal -> `@docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-executor-prompt.md` to ship Phase 3. Planner reviews Phase 4 drafter halt when it arrives, then generates P4 executor prompt.

Update these three lines whenever a phase boundary changes state. They are the source of truth for "where am I" when picking the arc back up cold.

---

## Read in this order

If you're new to this arc, read top-to-bottom:

1. **[`prerequisites.md`](prerequisites.md)** -- Operator-side one-shot setup. Verify Arc 1 + KTX onboarding inheritance + arc-specific items (5-project dev DBs loaded; source repos present).
2. **[`decisions.md`](decisions.md)** -- 17 locked cross-cutting decisions (CI-readiness conventions, per-project config dict, dispatcher pattern, gate-by-gate ship cadence, real-bug-fix rides commit, audit cadence trigger set, plus inherited workflow conventions). Every phase respects these.
3. **[`review-findings.md`](review-findings.md)** -- Empty initially; F-entries accrue during execution as catch-up audits run against the 5 projects.
4. **[`phase-template.md`](phase-template.md)** -- Mandatory shape for each phase MD.
5. **Per-phase MDs** (drafted in order; see "Phase index" below).

If you're the fresh terminal that's about to draft a phase, also read:

6. **[`handoff-prompt.md`](handoff-prompt.md)** -- Your orientation. Tells you what this arc is, what context you'll need, what sub-agent verification looks like, and how to halt for review.

---

## Phase index

Phases land in order. Each phase commits a coherent unit (per `decisions.md` D13). Operator reviews at phase boundaries before the next phase starts.

After Phase 1 lands the canonical dispatch shape, Phases 2 / 3 / 4 are mutually independent at the data level (different gate files, different dispatch entries, different test surfaces); they CAN draft in parallel (orchestrator decides). Phase 5 needs Phases 1-4 drafted (so the doc references real conventions, not speculation); Phase 5 + Phase 6 can EXECUTE in any order with each other (both markdown). Phase 7 executes last (consolidates pass state across all gates).

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 1 | shipped (`f64ef308`) | `phase-1-idempotency-probe.md` | Universal `scripts/load-knowledge/idempotency.ts` (lifts `idempotency-ktx.sh` to `--project <p>` dispatch); `case 'idempotency':` in `index.ts`; per-project config dict (5 entries); KTX bash version deleted; 5-project catch-up audit findings inline in commit body | `bun run load-knowledge -- idempotency --project <p>` works for all 5 projects; `--all` runs sequentially; KTX-only bash gone |
| 2 | shipped (`2e7808eb`) | `phase-2-reproducibility-probe.md` | Universal `scripts/load-knowledge/reproducibility-check.ts` (packages VALIDATION-RUNBOOK Section 1.1 as runnable); `case 'reproducibility-check':` in `index.ts`; per-project config dict (source roots, optional `--workers`); 5-project audit findings inline | `bun run load-knowledge -- reproducibility-check --project <p>` re-runs `extract.py` and asserts empty `git diff --stat HEAD` on output |
| 3 | approved | `phase-3-parallel-serial-tests.md` | Lifted `extractor_lib/tests/parallel_serial_helpers.py` (from KTX-only); per-handler `<project>/tests/test_handler_<name>_parallel_serial.py` files for handlers identified as parallel-aggregation-risky; pytest convention CI-ready by being pytest | `pytest apps/qw-oracle/scripts/extractors/` runs without import error; per-handler equivalence tests pass |
| 4 | not started | `phase-4-migration-probes.md` | Universal `scripts/load-knowledge/migration-probes.ts` runner + `db/migration-probes.ts` registry mapping migration name -> probe function; probes for 001-012 (retroactive 001-008 + KTX-shipped 009/010/011 + new 012); `case 'migration-probes':` in `index.ts` | `bun run load-knowledge -- migration-probes` runs all probes; `--migration NNN` runs single probe; all 12 migrations pass |
| 5 | not started | `phase-5-authoring-guide.md` | New `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` (sections 1-7 per Pass 1.2.6); cross-link from VALIDATION-RUNBOOK.md top; SKILL.md update part 1 (new register-in-config-dict step + validation step expansion to 4-5 probes) | New gate authoring is documented; onboarding skill teaches register-in-each-gate pattern |
| 6 | not started | `phase-6-audit-cadence.md` | EXTRACTOR-PLAYBOOK.md new section on audit cadence trigger set; HANDOVER.md tracking entry; SKILL.md update part 2 (explicit "no per-project bash" callout); cross-link to `feedback_retrofit_later_discipline.md` memory | Cross-project audit cadence rule is documented; onboarding skill prevents per-project bash anti-pattern |
| 7 | not started | `phase-7-cert-doc.md` | Arc-close cert doc at `docs/superpowers/reviews/<date>-extractor-discipline-catchup-arc-review.md` -- one section per gate recording cross-project pass state (5-project per-gate summary); graduation-readiness artifact | All 5 gates documented as passing across all 5 projects; arc done |

When a phase MD lands, change `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

---

## Phase dependency map

```
Phase 1 (idempotency probe; sets canonical dispatch shape)
   |
   +---> Phase 2 (reproducibility probe; mirrors P1 shape)
   +---> Phase 3 (parallel-vs-serial pytest pattern; different dispatch)
   +---> Phase 4 (migration probes registry; mirrors P1 shape)
              |
              v
         Phase 5 (authoring guide doc + skill update part 1;
                  references shipped P1-P4 conventions)
              |
              +---> Phase 6 (audit cadence + skill update part 2;
                             can execute in any order with P5)
                       |
                       v
                  Phase 7 (cert doc; consolidates pass state across
                           all P1-P6 gates)
```

Phases 1 / 2 / 3 / 4 are mutually independent at the data level after Phase 1 lands. Phase 5 has a soft dependency on Phase 1-4 drafts existing (the doc cites real conventions). Phase 6 is markdown-only and parallel-safe with Phase 5 at execution time. Phase 7 is the arc-close graduation artifact.

---

## Slicing rationale (load-bearing for orchestrator)

The arc is **vertical-slice per gate for P1-P4 + linear doc tail for P5-P7**. Each gate phase (P1-P4) is its own probe + 5-project catch-up audit + commit -- a self-contained vertical that delivers one universal gate to coverage. Doc/process phases (P5-P7) follow a linear sequence after the gates exist.

**Why 7 phases (not 5-6 or 8+):**

- P1-P4 cannot be bundled because each gate is a distinct shape: idempotency = TS DB-snapshot diff; reproducibility = TS re-extract + git-diff; parallel-vs-serial = pytest pattern (different dispatch); migration probes = TS registry. Bundling would push phase context budget past the 350k smell zone (per `references/arc-phase-archetypes.md` projections: refactor 100-250k + loader port 200-400k = 300-650k).
- P5 and P6 are split because they cover different concerns (producer-side authoring guide vs. process rule + skill cleanup) AND because the SKILL.md edits naturally split between them (Pass 2.2's three concrete changes: P5 lands the register-in-config-dict step + validation step expansion; P6 lands the "no per-project bash" callout). One phase ships per concern; bundling would conflate audiences.
- P7 separated as arc-close cert doc because it's the graduation artifact -- written once after all gates ship, consolidating cross-project pass state. Bundling into P6 would conflate "rule landing" with "arc closing."

**Estimated context budgets per phase** (with subagent-default; <350k smell zone):

| Phase | Budget projection | Subagent vs inline |
|---|---|---|
| 1 | ~250-300k | Subagent for idempotency.ts authoring (Sonnet medium); per-project config inline; bash deletion inline; 5-project audit subagent (Sonnet medium, Explore) |
| 2 | ~150-250k | Subagent for reproducibility-check.ts authoring (Sonnet medium); per-project config inline |
| 3 | ~250-400k | Subagent for parallel_serial_helpers.py lift (Sonnet medium); per-handler test authoring fan-out (Sonnet medium each, batched ~3-5 tests per subagent) |
| 4 | ~250-400k | Subagent for runner + registry skeleton (Sonnet medium); per-migration probe fan-out (Sonnet medium each, batched ~3 migrations per subagent) -- 12 migrations / 3 = ~4 subagents |
| 5 | ~150-200k | Mostly inline (markdown VALIDATION-GATES.md authoring + SKILL.md edits with full content shipped) |
| 6 | ~100-150k | Mostly inline (markdown PLAYBOOK section + SKILL.md edits + memory cross-link) |
| 7 | ~80-150k | Mostly inline (markdown cert doc; one section per gate recording 5-project summary) |

P3 and P4 are borderline; subagent fan-out (one per ~3 tests / migrations) keeps each below the 350k smell zone. Single-subagent fan-out for those phases would push the executor's main thread context to the failure zone (500k+).

---

## Other artifacts in this directory

- (None yet -- no legacy plan to migrate. The two-pass arc-brainstormer closed without a prior plan attempt.)

---

## Why split into per-phase MDs?

Two reasons:

1. **Context window discipline.** A monolithic plan would crowd the executor's working memory across 7 phases of ~200k average context each. Per-phase MDs land independently with their own verification probes; executor terminals stay under the smell zone.

2. **Verification at boundaries.** Each phase MD gets a dedicated sub-agent verification pass before operator review. The qw-oracle Arc 1 monolithic plan's 18 review findings (wrong CHECK enums, missing tables, wrong column lists, FK convention break) all came from cross-cutting hand-typed SQL the author hadn't checked. Per-phase MDs + targeted sub-agent verification catches drift mechanically.

The split is structural, not just cosmetic. See `decisions.md` D13 (phase atomicity) and D6 (per-gate ship + per-gate audit) for the accompanying philosophy.

---

## What this arc deliberately does NOT cover

Per `decisions.md` D1 + the parking doc's "Parked as separate future arcs" + "Deferred indefinitely" sections:

- **CI setup for qw-oracle** -- biggest graduation lift; needs its own arc with Postgres service container + workflow YAML + fixture project. The CI arc consumes this arc's universal probes; ordering is "this arc ships gates, CI arc wires them into a workflow."
- **Contributor onboarding doc / CONTRIBUTING.md** -- holistic graduation-shape doc; bundles with broader graduation work in a separate arc.
- **Test-coverage parity per project** -- per-project test-authoring effort (ezquake 1, FTE 1, QWCL 0, MVDSV 0, KTX 3 test files); separate operator-initiated arc when test-authoring effort surfaces per-project.
- **Stage 3 snapshot probes** -- revisit when slipgate-app's snapshot needs stabilize. Slipgate is heavily in development; Stage 3 targeting is a moving target. VALIDATION-GATES.md (Phase 5) must be solid enough that future-Claude can apply patterns to Stage 3 probes without re-deriving conventions.
- **"Tag every generated output with model + prompt version" probe** -- low priority; HANDOVER small followup if operator decides to drain.
- **"Schema evolution is append-only" manifest-hash check** -- low priority; HANDOVER small followup if operator decides to drain.
- **Regen-after-extract automation** -- folds into CI arc; same trigger as CI setup.
- **No new entity types or schema migrations** -- this arc lifts discipline; it does not add new data shape. Migrations 001-012 are covered as-is by Phase 4's retroactive probe authoring.

If a phase drifts into one of these, that's a scope creep -- flag it.

---

## Operator quick-reference

- **Kicking off a fresh phase-drafting session:** open a new terminal, paste the contents of `handoff-prompt.md` with `<PHASE_NUMBER>` substituted. Phase 1 is the natural starting point (canonical model gate).
- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the verification queries listed at the bottom, eyeball the file lists / TS shape / per-project config dict / dispatcher case, sign off. Update the phase index "Status" column AND the "Where we are right now" lines at top of this README.
- **A finding resolves but conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase MD's "Open questions" section. If the decision itself is wrong, amend `decisions.md` with a dated block before re-running the phase draft.
- **A new finding emerges during phase drafting or execution:** append to `review-findings.md` with a sequential F-number and tag which phase resolves it. Per D8: drain-now / HANDOVER followup / explicit reject.
- **A real bug found in a project during catch-up audit:** per D7, the bugfix rides the gate's commit. If the fix would explode scope (real loader rewrite), surface to operator and let them choose drain-now-with-scope-growth vs explicit-defer-to-HANDOVER per D8.
- **A spec commitment turns out to be wrong during phase drafting:** halt and surface to operator; the spec is locked per D1 but amendments via the operator's explicit decision are possible. The amendment lands in `decisions.md` as a dated block.

---

## Post-arc handoff

After all 7 phases ship and `arc-reviewer` runs the spec-vs-shipped walkthrough (per `arc-reviewer` skill), the arc is done. Follow-on arcs:

- **CI setup arc** -- becomes unblocked the moment Phase 1-4 ship (probes are wireable into a workflow YAML); can start before Phase 5-7 if operator wants parallel arc work.
- **Contributor onboarding doc / CONTRIBUTING.md** -- separate arc; consumes this arc's VALIDATION-GATES.md as one of its references.
- **Test-coverage parity per project** -- separate arc; per-project test-authoring effort.
- **Stage 3 snapshot probes** -- parked, revisit-on-trigger when slipgate-app's snapshot needs stabilize.

The arc-reviewer pass runs in **fresh terminal** per `arc-reviewer` skill structural requirement (a terminal that ran any phase has anchored expectations and cannot deliver an honest spec-vs-shipped read). Reviewer reads parking doc + decisions + per-phase MDs + cross-phase memory captures cold; produces DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING walkthrough + Arc N+1 prep recommendations.
