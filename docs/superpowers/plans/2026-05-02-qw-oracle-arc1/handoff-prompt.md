# Handoff prompt — fresh terminal, phase-drafting session

This file is the literal first message to paste into a fresh Claude Code terminal when kicking off a phase-drafting session. Copy-paste everything between the `=== BEGIN PROMPT ===` and `=== END PROMPT ===` markers below.

The drafter is told what this arc is, what to read, what shape to produce, and how to halt for review.

---

## How to use this file

1. Decide which phase you want drafted (start with Phase 1).
2. Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`.
3. Paste the prompt below, with the `<PHASE_NUMBER>` placeholder replaced with the phase you want drafted. Phase 1 first.
4. The terminal drafts the phase MD, runs the sub-agent verification, applies findings, and halts.
5. You review the phase MD against the verification commands at its bottom.
6. If approved, paste the prompt again with `<PHASE_NUMBER>` set to the next phase.

You can run multiple phase-drafting sessions in parallel only if the phases don't depend on each other's output. Phases 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 are sequential. Phase 7 (observability) might be safe to draft in parallel with Phase 6 since they touch different files. All other pairs are sequential.

---

## Tips

- The drafter has full freedom to read source files, run grep / Read on the live codebase, and use Context7 for library docs (e.g., MCP SDK API). It does NOT execute migrations or run loaders — drafting is paper-only.
- If the drafter encounters something unresolvable, it should add an "Open questions" item and proceed with a documented default. Don't ping the operator mid-draft.
- The verification sub-agent runs at the very end of the drafting session, before operator review.

---

## The prompt

```
=== BEGIN PROMPT ===

You are drafting Phase <PHASE_NUMBER> of the QW Oracle Arc 1 plan.

This is a structured planning task. Your output is a markdown file. You do
NOT execute anything (no migrations, no loaders, no docker). The phase MD
you write becomes input to a separate execution session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (read all of these before drafting; do not skip):

1. docs/superpowers/plans/2026-05-02-qw-oracle-arc1/README.md
   - Phase index, "read this order" guidance.

2. docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md
   - 17 locked cross-cutting decisions. Every phase respects these.

3. docs/superpowers/plans/2026-05-02-qw-oracle-arc1/review-findings.md
   - 18 issues found in the legacy plan. Identify which findings touch
     Phase <PHASE_NUMBER> via the "Phase ownership of findings" table at
     the bottom.

4. docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-template.md
   - The mandatory shape for the phase MD you produce.

5. docs/superpowers/plans/2026-05-02-qw-oracle-arc1/_legacy-monolithic-plan.md
   - Read ONLY the section relevant to Phase <PHASE_NUMBER>. The legacy
     plan is the previous attempt — useful for inspiration but full of
     bugs (see review-findings.md). Do NOT copy SQL or code blocks; verify
     against live source files.

6. docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md
   - The architecture spec that drives this arc.

7. apps/qw-oracle/CLAUDE.md and apps/qw-oracle/SCHEMA.md
   - Project context.

8. apps/qw-oracle/scripts/load-knowledge/schema.ts (for Phase 1 / 2 only)
   - The source of truth for the Layer 1 schema. Phase 2 emits a generator
     against this file (per decisions.md D3).

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-<N>-<name>.md

Where <N>-<name> matches the phase index in README.md. Example:
phase-1-foundation.md, phase-2-layer1-port.md, etc.

Follow phase-template.md exactly: the section order, the section names,
the verification format. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only. No emoji. ASCII hyphen-minus, not em-dash or en-dash.
- All scripts run under Bun (D2). Use `bun` in command lines, not `tsx`.
  `import.meta.main` guards are fine; they're Bun-supported.
- Keep the entity_id INTEGER FK convention (D1). Do NOT switch to canonical_id PK.
- For Phase 2 specifically: do NOT hand-type CREATE TABLE blocks. Write a
  generator that emits Postgres-dialect SQL from schema.ts (D3).
- For Layer 2 tsvector (Phase 3 only): use 'simple' config, not 'english' (D7).
- All 31 tables in scope for Phase 2 (D4). Use the inventory in SCHEMA.md.
- entities.description must be derived from per-version rows (D6).
- Eval and calibration sets are disjoint (D10). Score out-of-corpus by
  match_quality, not hit count (D11).
- Embedding-space sanity check at MCP startup (D8).
- Phase MDs have no hard length cap. Length follows from the work.
  Don't cut tasks or hand-wave file lists to fit a target. See
  "Phase MD length" in phase-template.md for split-vs-don't-split
  guidance — default to not splitting if unsure.

STEP-BY-STEP:

Step 1: Read all 8 required files. Take notes on the findings that touch
        Phase <PHASE_NUMBER>.

Step 2: Run any necessary recon on the live codebase (Read, grep, ls).
        Examples by phase:
        - Phase 1: confirm package.json shape, current dependencies.
        - Phase 2: list every file in scripts/load-knowledge/; count
          tables in schema.ts; snapshot the SQLite entity counts via
          `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT project,
          count(*) FROM entities GROUP BY project"`.
        - Phase 3: list scripts/import-*.mjs files and their imports;
          confirm /home/paradoks/projects/quake/quad/exports/ exists.
        - Phase 6: list serve/mcp/src/tools/*.ts; check
          @modelcontextprotocol/sdk version in package.json; pull
          current SDK transport docs via Context7.

Step 3: Draft the phase MD following phase-template.md.

Step 4: Dispatch the verification sub-agent (instructions below).

Step 5: Apply the sub-agent's findings. If a finding contradicts
        decisions.md, note the rejection in the phase's "Open questions"
        section with a one-line rationale.

Step 6: Halt. Reply to the operator with:
        - Path to the drafted phase MD.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Any open questions that need operator attention before
          execution can begin.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to phase N+1. Do NOT execute migrations. Do NOT modify
the live codebase. Drafting is paper-only.

VERIFICATION SUB-AGENT:

After drafting, dispatch the sub-agent with:

  Tool: Agent
  subagent_type: Explore
  description: "Verify Phase <PHASE_NUMBER> draft"
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
- Approve → opens a new fresh terminal and runs this prompt again with
  <PHASE_NUMBER> incremented.
- Request revisions → continues the current session with feedback. You
  apply revisions and dispatch the sub-agent again.

You are NOT the executor. The phase MD you produce is a plan. Execution
happens in a separate, later session (likely also a fresh terminal).

=== END PROMPT ===
```

---

## Optional: orientation hint to add when bootstrapping

If you want the fresh terminal to immediately understand context without re-reading from scratch, prepend the prompt with this hint (one paragraph):

```
Context hint: A previous Claude session (long context) reviewed a 3596-line
monolithic plan, found 18 issues, and restructured the work into per-phase
MDs in docs/superpowers/plans/2026-05-02-qw-oracle-arc1/. The decisions
doc, review findings, and phase template are all written. Your job is to
draft Phase <N> following the structure already in place. Read the README
in that directory first; it tells you the rest.
```

This saves the fresh terminal from re-deriving the situation. Optional — the prompt above is self-contained.

---

## Recovery: phase MD comes back wrong

If the operator reviews a phase MD and finds it's still buggy after sub-agent verification:

1. Don't re-prompt the same terminal — its context is now polluted with the wrong draft.
2. Open a new fresh terminal.
3. Paste this prompt with the same phase number.
4. Add a one-paragraph hint at the top: "The previous draft of phase-<N>-*.md had these issues: <X>, <Y>, <Z>. Read the file at <path>, then redraft. Don't preserve the old draft's bugs."
5. The new terminal redrafts from scratch with the corrections in mind.

This is the "fresh context for plan execution" pattern from the operator's memory (`feedback_fresh_context_for_execution.md`).
