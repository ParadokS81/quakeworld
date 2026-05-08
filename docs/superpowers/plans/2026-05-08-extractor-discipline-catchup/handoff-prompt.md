# Handoff prompt -- fresh terminal, phase-drafting session

This file is the literal first message to paste into a fresh Claude Code terminal when kicking off a phase-drafting session for the extractor discipline catch-up arc. Copy-paste everything between the `=== BEGIN PROMPT ===` and `=== END PROMPT ===` markers below.

The drafter is told what this arc is, what to read, what shape to produce, and how to halt for review.

---

## How to use this file

1. Decide which phase you want drafted (start with Phase 1).
2. Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`.
3. Paste the prompt below, with the `<PHASE_NUMBER>` placeholder replaced with the phase you want drafted.
4. The terminal drafts the phase MD, runs the sub-agent verification, applies findings, and halts.
5. You review the phase MD against the verification commands at its bottom.
6. If approved, paste the prompt again with `<PHASE_NUMBER>` set to the next phase.

You can run multiple phase-drafting sessions in parallel only if the phases don't depend on each other's output. Phase dependency map:

- Phase 1 (idempotency probe) -- canonical model gate; sets the dispatch shape mirrored by P2-P4.
- Phase 1 -> Phase 2, 3, 4 (P2-P4 mirror P1's dispatch shape, per-project config dict pattern, CI conventions).
- Phase 1 / 2 / 3 / 4 are mutually independent at the data level after Phase 1's shape lands. They CAN draft in parallel after Phase 1 is approved.
- Phase 5 (authoring guide doc) -> needs Phase 1-4 drafted (so the doc can reference real conventions, not speculation). Phase 5 can EXECUTE only after Phase 1-4 ship.
- Phase 6 (audit cadence + skill update part 2) -> can draft after Phase 5; can EXECUTE in any order with Phase 5 (both are doc/markdown phases).
- Phase 7 (arc-close cert doc) -> drafts after Phase 6; executes last (consolidates pass state across all gates).

The orchestrator (post-scaffold) decides whether to draft phases sequentially or in parallel based on operator preference and context budget.

---

## Tips

- The drafter has full freedom to read source files, run grep / Read on the live codebase, and source-walk `apps/qw-oracle/scripts/extractors/<project>/` for handler shapes when relevant. It does NOT execute probes or modify the live codebase -- drafting is paper-only.
- If the drafter encounters something unresolvable, it should add an "Open questions" item and proceed with a documented default. Don't ping the operator mid-draft.
- The verification sub-agent runs at the very end of the drafting session, before operator review.

---

## The prompt

```
=== BEGIN PROMPT ===

You are drafting Phase <PHASE_NUMBER> of the extractor discipline catch-up arc.

This is a structured planning task. Your output is a markdown file. You do
NOT execute anything (no probes, no migrations, no extractors, no loaders).
The phase MD you write becomes input to a separate execution session
later (kicked off by arc-orchestrator).

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (read all of these before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
   - Phase index, "read in this order" guidance.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   - 17 locked cross-cutting decisions. Every phase respects these.

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   - Empty initially; F-entries accrue during execution. If any have
     accrued, identify which findings touch Phase <PHASE_NUMBER> via
     the "Phase ownership of findings" table.

4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
   - The mandatory shape for the phase MD you produce.

5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   - The closed two-pass brainstorm parking doc. The relevant section
     for Phase <PHASE_NUMBER> is (pick one or more):
       Phase 1 -> Pass 1.2.1 (idempotency probe shape) + Pass 2.3
                  (roadmap entry); KTX bash idempotency-ktx.sh as lift
                  source
       Phase 2 -> Pass 1.2.4 (reproducibility probe shape) + Pass 2.3;
                  VALIDATION-RUNBOOK Section 1.1 as methodology source
       Phase 3 -> Pass 1.2.3 (parallel-vs-serial pattern) + Pass 2.3;
                  apps/qw-oracle/scripts/extractors/ktx/tests/ as
                  lift source
       Phase 4 -> Pass 1.2.2 (per-migration probes) + Pass 2.3;
                  VALIDATION-RUNBOOK inline migration SQL as lift source
       Phase 5 -> Pass 1.2.6 (VALIDATION-GATES.md sections 1-7) +
                  Pass 2.2 (skill update part 1: register-in-config-dict
                  step + validation step expansion) + Pass 2.3
       Phase 6 -> Pass 1.2.5 (audit cadence rule) + Pass 2.2 (skill
                  update part 2: explicit "no per-project bash" callout)
                  + Pass 2.3
       Phase 7 -> Pass 2.1 (per-gate ship + cert doc shape); existing
                  cross-project audit at
                  docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md
                  as the closest precedent for cert-doc shape

6. apps/qw-oracle/CLAUDE.md
   - Project context. JSONB-binding rule + Bun runtime + idempotency.

7. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Producer-side handler / extractor playbook. Phase 6 amends it
     with audit cadence section.

8. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   - Consumer-side validation runbook. Phase 5 cross-links to
     VALIDATION-GATES.md from this doc's top.

9. apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
   - The model gate. Every TS gate this arc ships mirrors its dispatch
     shape (per D4).

10. apps/qw-oracle/scripts/load-knowledge/index.ts
    - The dispatcher. Every TS-probe phase adds a `case` here per D4.

11. apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
    - The KTX-only bash probe. Phase 1's universal idempotency.ts lift
      source. Read end-to-end; the volatile-column-strip pattern (Issue
      #5 post-fix shape) is what universal probe inherits.

12. apps/qw-oracle/scripts/extractors/extractor_lib/
    - The shared Python extractor infrastructure. Phase 3's pytest
      helpers land in extractor_lib/tests/parallel_serial_helpers.py.

13. ~/.claude/skills/onboard-extractor/SKILL.md
    - The user-global skill. Phase 5 + Phase 6 amend it inline (per D10).

14. ~/.claude/projects/-home-paradoks-projects-quakeworld/memory/feedback_retrofit_later_discipline.md
    - Operator memory: the principle this arc encodes. Phase 6's audit
      cadence rule cross-links to this.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-<N>-<slug>.md

Where <N>-<slug> matches the phase index in README.md. Slugs:
- phase-1-idempotency-probe.md
- phase-2-reproducibility-probe.md
- phase-3-parallel-serial-tests.md
- phase-4-migration-probes.md
- phase-5-authoring-guide.md
- phase-6-audit-cadence.md
- phase-7-cert-doc.md

Follow phase-template.md exactly: the section order, the section names,
the verification format, the per-task execution-mode declaration. Don't
add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only. No emoji. ASCII hyphen-minus, not em-dash or en-dash. (D16)
- All TS scripts run under Bun (project CLAUDE.md). Use `bun` in command
  lines, not `tsx` or `node`.
- Git workflow: main tree, no worktrees, no PRs (D17).
- CI-readiness conventions apply to all runtime probes (D2): exit codes,
  --project flag, --all optional, --json, --help, env-var DB, no CWD
  assumptions, deterministic.
- Per-project config dict per gate, NOT unified registry (D3).
- Universal gate dispatch mirrors F1 quality-grid pattern (D4).
- Manual probes, not auto-invoked (D5).
- Each gate ships its own catch-up audit (D6); per-finding triage per D8.
- Real-bug-fix rides same phase commit (D7).
- Authoring guide doc is sibling to VALIDATION-RUNBOOK (D9).
- onboard-extractor SKILL.md update is part of arc, split P5/P6 (D10).
- Cross-project audit cadence is trigger-based (D11).
- JSONB binding (D12): pass JS values directly to postgres-js or wrap
  with tx.json(); NEVER pre-stringify.
- Per-task execution mode declared in task table (D15). Inline only for
  markdown-only / fully-specified-edit tasks; subagent for code-synthesis.
- Phase MDs have no hard length cap (per phase-template.md "Phase MD
  length"); split only if two natural sub-deliverables.

STEP-BY-STEP:

Step 1: Read all 14 required reads. Take notes on which decisions touch
        Phase <PHASE_NUMBER>.

Step 2: Run any necessary recon on the live codebase:
        - For Phase 1: read idempotency-ktx.sh end-to-end; read
          quality-grid.ts (CLI shape model); list `*_versions` tables
          per project (`ls apps/qw-oracle/db/migrations/` + scan
          schema for `*_versions` table names); enumerate volatile
          columns from idempotency-ktx.sh + match against current
          schema (added: description_origin in 012); note dispatcher
          case shape in index.ts.
        - For Phase 2: read VALIDATION-RUNBOOK.md Section 1.1 (Stage 1
          methodology); enumerate per-project source roots (e.g.,
          research/repos/<project>/); identify how each project's
          extract.py is invoked (`apps/qw-oracle/scripts/extractors/
          <project>/extract.py` or `extract-tag` subcommand).
        - For Phase 3: read apps/qw-oracle/scripts/extractors/ktx/tests/
          (3 test files); identify which helpers are reusable
          (assert_parallel_serial_equivalent likely candidate); read
          existing extractor_lib/__init__.py to understand import
          shape; identify candidate per-handler tests for the catch-up
          (handlers walking MACRO_DEFINITION, doing per-TU enum walks,
          aggregating stats from worker emissions).
        - For Phase 4: read VALIDATION-RUNBOOK.md inline migration
          validation SQL for migrations 009 / 010 / 011 (KTX-arc
          authored); enumerate migrations 001-012 (ls
          apps/qw-oracle/db/migrations/); read 1-2 migration files to
          identify invariant shapes (CHECK reachability, table/index
          existence, sentinel insert/reject).
        - For Phase 5: read all gate files shipped by Phases 1-4
          (idempotency.ts, reproducibility-check.ts,
          parallel_serial_helpers.py, migration-probes.ts) -- the doc
          must reference real conventions, not speculation; read
          quality-grid.ts as the model. Read
          ~/.claude/skills/onboard-extractor/SKILL.md to identify the
          insertion points for the new pre-flight + register-in-config-
          dict step + validation step expansion.
        - For Phase 6: read EXTRACTOR-PLAYBOOK.md to identify where
          the new audit cadence section slots (likely sibling to
          existing Pattern catalog or three-tier handler architecture
          section); read HANDOVER.md to plan the tracking entry; read
          ~/.claude/skills/onboard-extractor/SKILL.md to identify the
          insertion point for the "no per-project bash" callout.
        - For Phase 7: read
          docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md
          as the closest precedent for cert-doc shape; enumerate the
          gates shipped by Phases 1-6; plan one section per gate
          recording cross-project pass state (5-project per-gate
          summary).

Step 3: Draft the phase MD following phase-template.md.

Step 4: Dispatch the verification sub-agent (instructions in
        phase-template.md "Verification sub-agent dispatch").

Step 5: Apply the sub-agent's findings. If a finding contradicts
        decisions.md, note the rejection in the phase's "Open questions"
        section with a one-line rationale.

Step 6: Halt. Reply to the operator with:
        - Path to the drafted phase MD.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Any open questions that need operator attention before
          execution can begin.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to phase N+1. Do NOT execute probes / migrations /
extractors / loaders. Do NOT modify the live codebase. Drafting is
paper-only.

VERIFICATION SUB-AGENT:

After drafting, dispatch the sub-agent with:

  Tool: Agent
  subagent_type: Explore
  description: "Verify Phase <PHASE_NUMBER> draft against extractor discipline catch-up scaffold"
  prompt: (paste the verification brief from phase-template.md, with
           the absolute paths filled in for this phase's MD,
           decisions.md, and review-findings.md)

The sub-agent reads files, finds drift, and reports under 400 words.
It does NOT modify files. You take its findings and apply them yourself.

If the sub-agent finds CRITICAL issues you can't resolve in-session,
list them under "Open questions" and recommend "needs another pass" to
the operator.

THE OPERATOR'S WORKFLOW:

After you halt, the operator reviews the phase MD and the sub-agent
findings. They either:
- Approve -> opens a new fresh terminal and runs this prompt again with
  <PHASE_NUMBER> incremented (or in parallel for the 1/2/3/4 set
  if the orchestrator chooses parallel drafting after Phase 1 lands).
- Request revisions -> continues the current session with feedback. You
  apply revisions and dispatch the sub-agent again.

You are NOT the executor. The phase MD you produce is a plan. Execution
happens in a separate, later session driven by arc-orchestrator (or, if
arc-orchestrator hasn't shipped, by the operator manually opening a
fresh executor terminal per phase).

=== END PROMPT ===
```

---

## Optional: orientation hint to add when bootstrapping

If you want the fresh terminal to immediately understand context without re-reading from scratch, prepend the prompt with this hint (one paragraph):

```
Context hint: A previous Claude session (arc-planner) closed a two-pass
arc-brainstorm on extractor discipline catch-up and produced the scaffold
at docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/.
The decisions doc (17 entries), review findings (empty preamble),
prerequisites, phase template, and README are all written. The brainstorm
parking doc at docs/superpowers/parking/2026-05-08-extractor-discipline-
catchup.md is the source of truth. Your job is to draft Phase <N>
following the structure already in place. Read the README in that
directory first; it tells you the rest.
```

This saves the fresh terminal from re-deriving the situation. Optional -- the prompt above is self-contained.

---

## Recovery: phase MD comes back wrong

If the operator reviews a phase MD and finds it's still buggy after sub-agent verification:

1. Don't re-prompt the same terminal -- its context is now polluted with the wrong draft.
2. Open a new fresh terminal.
3. Paste this prompt with the same phase number.
4. Add a one-paragraph hint at the top: "The previous draft of phase-<N>-*.md had these issues: <X>, <Y>, <Z>. Read the file at <path>, then redraft. Don't preserve the old draft's bugs."
5. The new terminal redrafts from scratch with the corrections in mind.

This is the "fresh context for plan execution" pattern from the operator's memory (`feedback_fresh_context_for_execution.md`).
