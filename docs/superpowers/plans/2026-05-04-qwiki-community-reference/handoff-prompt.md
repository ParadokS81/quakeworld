# Handoff prompt -- fresh terminal, phase-drafting session

This file is the literal first message to paste into a fresh Claude Code terminal when kicking off a phase-drafting session. Copy-paste everything between the `=== BEGIN PROMPT ===` and `=== END PROMPT ===` markers below, with the `<PHASE_NUMBER>` placeholder replaced with the phase you want drafted.

The drafter is told what this arc is, what to read, what shape to produce, and how to halt for review.

---

## How to use this file

1. Decide which phase you want drafted (start with Phase 0).
2. Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`.
3. Paste the prompt below, with `<PHASE_NUMBER>` replaced. Phase 0 first.
4. The terminal drafts the phase MD, runs the sub-agent verification, applies findings, and halts.
5. You review the phase MD against the verification commands at its bottom.
6. If approved, paste the prompt again with `<PHASE_NUMBER>` set to the next phase.

Parallel drafting: phases that don't depend on each other's output can draft in parallel (different fresh terminals, same scaffold). Most phases in this arc are sequential -- Phase 5 depends on 2/3/4 ship; Phase 6 depends on 5; Phase 7 depends on 6. Phase 7 (primer) might safely parallel with Phase 6 since they touch different files, but default to sequential unless you have a reason to parallelize.

---

## Tips

- The drafter has full freedom to read source files, run grep / Read on the live codebase, and consult Context7 for library docs. It does NOT execute migrations, run parsers, or modify production state -- drafting is paper-only.
- If the drafter encounters something unresolvable, it should add an "Open questions" item and proceed with a documented default. Don't ping the operator mid-draft.
- The verification sub-agent runs at the very end of the drafting session, before operator review.

---

## The prompt

```
=== BEGIN PROMPT ===

You are drafting Phase <PHASE_NUMBER> of the QWiki community-reference arc plan.

This is a structured planning task. Your output is a markdown file. You do
NOT execute anything (no migrations, no parsers, no SQL). The phase MD you
write becomes input to a separate execution session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (read all of these before drafting; do not skip):

1. docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md
   - Phase index, "read this order" guidance.

2. docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
   - 20 locked cross-cutting decisions. Every phase respects these.

3. docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
   - Findings ledger (currently empty for this fresh arc; new findings
     accrue here as they're discovered).

4. docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-template.md
   - The mandatory shape for the phase MD you produce.

5. docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md
   - The design spec (source of truth for scope, schema sketch, ratified
     decisions, phase decomposition).

6. apps/qw-oracle/CLAUDE.md and apps/qw-oracle/SCHEMA.md
   - Project context.

7. apps/qw-oracle/data/wiki-snapshots/2026-05-04/manifest.json
   - Snapshot metadata. Confirm counts match before drafting Phase 0/2/3/4.

8. Sample articles relevant to this phase's entity type (3-5 files):
   - Phase 2 (players): Milton.json, ParadokS.json, Crit.json, Bomkia.json,
     plus one NO_INFOBOX outlier of your choosing.
   - Phase 3 (clans): Slackers.json, Black_Book.json, plus 2-3 stratified.
   - Phase 4 (tournaments): pick 5-10 from category lists -- this is the
     pilot phase, sampling is part of the work.

9. Existing code surface relevant to this phase:
   - Phase 0: scripts/ folder (where the wiki snapshotter lives or should
     live).
   - Phase 1: apps/qw-oracle/concept-notes/, apps/qw-oracle/db/migrations/,
     apps/qw-oracle/scripts/load-concepts/, apps/qw-oracle/serve/mcp/.
   - Phase 2/3/4: apps/qw-oracle/scripts/load-knowledge/ (for adapter
     conventions), apps/qw-oracle/db/migrations/ (last migration number).
   - Phase 5: existing cross-link-shaped tables for pattern reference.
   - Phase 6: apps/qw-oracle/serve/mcp/src/tools/ (existing tool shape).
   - Phase 7: apps/qw-oracle/scripts/ (where primer-build script lands).

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-<N>-<name>.md

Where <N>-<name> matches the phase index in README.md. Example:
phase-0-snapshot-finalize.md, phase-1-curated-rename.md, phase-2-players.md,
phase-3-clans.md, phase-4-tournaments.md, phase-5-cross-link-backfill.md,
phase-6-mcp-tools.md, phase-7-l2-primer.md.

Follow phase-template.md exactly: section order, section names, the
verification format. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):

- ASCII only. No emoji. ASCII hyphen-minus, not em-dash or en-dash. (D13)
- All scripts run under Bun (D14). Use `bun` in command lines, not `tsx`.
  `import.meta.main` guards are fine; they're Bun-supported.
- Two outputs per entity type (D1): rows for everyone, notes for
  content-rich only.
- New `community` schema (D2). Tables go there, not in `public`.
- `curated/` folder reframe (D3). Phase 1 does the rename; Phase 2/3/4
  emit into the new tree.
- Deterministic extraction (D4). No LLM-per-page in player/clan flow.
  Tournament pilot (Phase 4) is the only LLM-shaped task in the arc.
- Two-threshold model (D5). is_substantive AND has_note are SEPARATE
  booleans. Don't conflate them.
- is_substantive heuristic >=2 of 5 structured-field signals (D6).
  Tunable in Phase 2 first run.
- has_note rule v1 ships in Phase 2 (D7). Tuned empirically; not
  pre-locked here. Phase 3/4 reuse the tuned shape.
- Active-year priority `min(spawned, foundquake, earliest TH/achievement
  year)`; ignore birth_date (D8).
- Tournament schema TBD until Phase 4 pilot (D9). Phase 1 ships
  placeholder columns only.
- `source` column on cross-link tables (D10).
- Per-type MCP tools for v1 (D11). No unified search_curated.
- Snapshot dir permanent at apps/qw-oracle/data/wiki-snapshots/<date>/;
  Phase 0 decides commit policy (D12).
- Append-only migrations (D15). Last applied migration is 007;
  Phase 1 ships 008.
- Phase atomicity (D16). Each phase ends commit-ready.
- Note frontmatter mirrors row + body for unique prose (D18).
- JSONB columns receive JS values, not pre-stringified (D19).
- Stub flag is multi-signal heuristic, NOT `{{Player-stub}}` template
  tag (D20).

Per-task execution mode annotations are mandatory (phase-template.md).
For each task, declare one of: subagent (Sonnet medium / Sonnet MAX /
Opus medium / Opus MAX / Haiku) OR inline. Default to subagent for
code-synthesis tasks. Inline only for purely textual edits with full
content shipped inline.

STEP-BY-STEP:

Step 1: Read all required files. Take notes on the decisions and findings
        that touch Phase <PHASE_NUMBER>.

Step 2: Run any necessary recon on the live codebase (Read, grep, ls).
        Examples by phase:
        - Phase 0: list apps/qw-oracle/data/wiki-snapshots/2026-05-04/
          contents; identify the snapshotter script (or note its absence).
        - Phase 1: list apps/qw-oracle/concept-notes/; list code that
          references the path; check apps/qw-oracle/db/migrations/ tail.
        - Phase 2: read 3-5 sample player articles; sample template
          variant distribution if helpful.
        - Phase 6: list serve/mcp/src/tools/*.ts; check existing tool
          response shape.

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
  model: sonnet
  description: "Verify Phase <PHASE_NUMBER> draft"
  prompt: (paste the verification brief from phase-template.md, with
           the absolute paths filled in for this phase's MD,
           decisions.md, review-findings.md, and the spec section
           relevant to this phase)

The sub-agent reads files, finds drift, and reports under 400 words.
It does NOT modify files. You take its findings and apply them yourself.

If the sub-agent finds CRITICAL issues you can't resolve in-session,
list them under "Open questions" and recommend "needs another pass" to
the operator.

THE OPERATOR'S WORKFLOW:

After you halt, the operator reviews the phase MD and the sub-agent
findings. They either:
- Approve -> opens a new fresh terminal and runs this prompt again with
  <PHASE_NUMBER> incremented.
- Request revisions -> continues the current session with feedback. You
  apply revisions and dispatch the sub-agent again.

You are NOT the executor. The phase MD you produce is a plan. Execution
happens in a separate, later session (likely also a fresh terminal,
either driven manually or by an arc-orchestrator skill).

=== END PROMPT ===
```

---

## Optional: orientation hint to add when bootstrapping

If you want the fresh terminal to immediately understand context without re-reading from scratch, prepend the prompt with this hint (one paragraph):

```
Context hint: A previous Claude session ran arc-planner against the
QWiki community-reference design spec. The scaffold (decisions /
review-findings / prerequisites / phase-template / handoff-prompt /
README) is at docs/superpowers/plans/2026-05-04-qwiki-community-reference/.
Your job is to draft Phase <N> following the structure already in place.
Read the README in that directory first; it tells you the rest.
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

This is the "fresh context for plan execution" pattern from operator memory (`feedback_fresh_context_for_execution.md`).
