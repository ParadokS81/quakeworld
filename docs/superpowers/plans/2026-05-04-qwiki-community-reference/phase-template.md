# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` (currently empty; check the Phase ownership table at the bottom for any findings tagged with this phase).
> 3. Read `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md` -- the spec section relevant to this phase.
> 4. Read the snapshot: `apps/qw-oracle/data/wiki-snapshots/2026-05-04/manifest.json` and 3-5 sample articles relevant to this phase's entity type.
> 5. Read the current state of `apps/qw-oracle/scripts/load-knowledge/`, `apps/qw-oracle/db/migrations/`, `apps/qw-oracle/serve/mcp/` (whichever subset this phase touches).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

One paragraph. What this phase produces and why it's a coherent unit. End with a sentence naming the runnable state at phase boundary (matches `decisions.md` D16).

## Inputs from previous phase

What state must exist for this phase to start. Examples:
- "Snapshot is finalized: slug-collisions fixed, redirects refetched, commit policy applied (Phase 0 complete)."
- "`community.players` and `community.clans` tables exist and are empty; `apps/qw-oracle/curated/` directory tree exists with `concept-notes/` content moved (Phase 1 complete)."

If this is Phase 0, inputs are the items in `prerequisites.md`.

## Files touched

Two subsections.

### Created

```
path/to/new/file.ts
path/to/another.sql
```

Bullet list. Absolute paths from repo root. Comment if a file is created by a generator vs hand-written.

### Modified

```
path/to/existing.ts                    # what changes
```

Comments name the change at file granularity, not line granularity.

### Deleted

```
path/to/legacy.mjs                     # why deleted
```

Every deletion explains itself in a one-line comment. Deleting silently is forbidden.

## Tasks

Numbered. Each task has:
- **Goal** (one sentence).
- **Files** (subset of "Files touched" above; just the ones this task touches).
- **Steps** (`- [ ]` checkboxes).
- **Verification** (commands or queries -- YES/NO probes, not interpretive prose).
- **Execution mode** (one line; see "Execution mode annotations" below).

Steps are imperative ("Edit X to do Y", "Run `<command>`", "Append to Z"). Avoid prose explaining what the step achieves -- the step should be doable mechanically; if it's not, split it.

If a step ships file content inline, ship the FULL file content (not a diff, not a sketch). The drafter is responsible for verifying the inlined content is correct against the live codebase. Sub-agent verification confirms it.

If a step is "engineer ports X" or "engineer fills in Y" -- that's a smell. Either inline the port, or split it into a task with its own steps.

### Execution mode annotations

Each task declares ONE of:

- **`subagent (Sonnet medium)`** -- default for code-synthesis tasks (parser writing, schema migration writing, MCP tool implementation, test authoring). One-line rationale: "<why this shape>".
- **`subagent (Sonnet MAX)`** or **`subagent (Opus medium)`** -- multi-file integration, judgment-dense work. Sonnet MAX preferred for speed; Opus medium when knowledge breadth matters more than reasoning depth.
- **`subagent (Opus MAX)`** -- architecture-level decisions, cross-cutting review, post-arc analytical work. Use sparingly.
- **`subagent (Haiku)`** -- pure mechanical text shuffling (deletions, renames, applying a fully-specified diff to a doc). Use only when the task genuinely cannot benefit from reasoning.
- **`inline`** -- direct Edit/Write/Bash from the executor terminal. Used ONLY when the task is purely textual edits with full content shipped inline (markdown / doc / config-with-no-logic). Code synthesis defaults to subagent.

Default rule: if the task involves code synthesis, multi-file integration, schema/migration writing, or test authoring, dispatch a subagent. The qw-oracle Arc 1 inline-execution defect was running ~80% inline tasks that should have been subagent-dispatched, hitting 400-500k context where subagent dispatch keeps the executor under 200k.

The honest test for picking model size: would a Stack Overflow answer suffice? If yes, Haiku. If the task synthesizes from 4+ files or requires non-obvious judgment, Sonnet medium minimum. If the task is architectural / post-arc analytical, Opus MAX.

Write the rationale on the same line as the mode declaration. Example:

```
**Execution mode:** subagent (Sonnet medium) -- multi-branch parser code synthesis, isolated context preferred over polluting executor main thread.
```

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase to confirm it landed correctly. YES/NO answers, not interpretive prose.

Examples:
- SQL queries with expected row counts.
- `bunx tsc --noEmit` for tooling consistency.
- Markdown count probes (`ls apps/qw-oracle/curated/<type>-notes/ | wc -l`).
- MCP tool smoke tests.

Each verification ends with one of:
- "PASS condition: <specific check>"
- "FAIL condition: <specific signal>"

If verification PASSes, operator proceeds to phase N+1.
If verification FAILs, phase MD's "Recovery" section (below) is consulted.

## Outputs to next phase

What state is now true that wasn't before. Mirror of "Inputs from previous phase" -- Phase N's outputs match Phase N+1's inputs.

## Open questions / deferred items

Anything the drafter encountered but decided not to resolve in-phase. Each item:
- **Question:** one-line statement of the unresolved decision.
- **Default chosen for now:** what the phase MD does in absence of a decision.
- **Who can resolve:** "operator" / "Phase X" / "Arc 2".

If there are no open questions, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Short section. Per-failure-mode recovery:
- "If migration apply fails: re-run via `bun db/migrate.ts`. Idempotent."
- "If row count is off: check the regression by running `<command>`; the most likely cause is <X>; if confirmed, do <Y>."

This section is not exhaustive -- it covers the failures the drafter could anticipate. Unanticipated failures route to operator.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with `Agent` tool, `subagent_type=Explore`, model `sonnet` at default effort, with the following brief shape (replace `<...>` placeholders with absolute paths):

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>
Read the design spec section relevant to this phase: <absolute path>

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. Every CREATE TABLE / ALTER TABLE / CREATE INDEX in this phase:
   - Verify schema name is `community` (D2) for new tables.
   - Verify column types match common Postgres conventions.
   - Verify FK references are well-formed.

3. Every reference to a wiki snapshot artifact:
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`
     exists.
   - For sample articles cited, spot-check the file actually exists.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if used) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only.

5. Every reference to existing code (load-knowledge/, serve/mcp/, db/):
   - Verify the path exists.
   - Verify the symbol or function name matches.

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode (don't claim "isolated context"
     for an inline task; don't claim "purely textual" for a code-synthesis
     task).
   - Flag tasks that are coded as `inline` but involve code synthesis,
     migration writing, or test authoring -- those should be subagent.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists.
   - Confirm this phase actually resolves the findings it claims to.

8. Every column / table introduced that isn't in `decisions.md` and isn't
   already in `apps/qw-oracle/SCHEMA.md`:
   - Flag as potential drift.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing
    voice. Flag any.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.

---

## Phase MD length

There is no hard cap. Length follows from the work the phase requires.

- **Split** if the phase has two natural sub-deliverables that could ship as separate commits (e.g., Phase 4 might split into `phase-4a-tournament-pilot.md` and `phase-4b-tournament-parser.md` if the pilot output justifies it). Update `README.md` to link both.
- **Don't split** if splitting forces shared state or context to be duplicated across files. A 1200-line phase that's one coherent unit beats two 600-line phases that both need the same preamble.

Cutting tasks, hand-waving file lists, or dropping verification to "fit" is the wrong move every time.

If the drafter is unsure whether to split, default to NOT splitting and surface the question in the phase's "Open questions" section for operator review.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
