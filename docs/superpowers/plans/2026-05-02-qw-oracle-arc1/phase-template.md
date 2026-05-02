# Phase template — shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" — empty sections are easier to spot than missing ones.

---

# Phase N — <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only — do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

One paragraph. What this phase produces and why it's a coherent unit. End with a sentence naming the runnable state at phase boundary (matches `decisions.md` D14).

## Inputs from previous phase

What state must exist for this phase to start. Examples:
- "Postgres dev container running, migrator works (Phase 1 complete)."
- "Layer 1 entity rows populated; embedding columns exist but are NULL (Phase 2 + Phase 4 complete)."

If this is Phase 1, inputs are the items in `prerequisites.md`.

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
- **Verification** (commands or queries — see "Verification queries" template below).

Steps are imperative ("Edit X to do Y", "Run `<command>`", "Append to Z"). Avoid prose explaining what the step achieves — the step should be doable mechanically; if it's not, split it.

If a step ships file content inline, ship the FULL file content (not a diff, not a sketch). The drafter is responsible for verifying the inlined content is correct against the live codebase. Sub-agent verification confirms it.

If a step is "engineer ports X" or "engineer fills in Y" — that's a smell. Either inline the port, or split it into a task with its own steps.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase to confirm it landed correctly. YES/NO answers, not interpretive prose.

Examples:
- SQL queries with expected row counts.
- `bun test` invocations with expected pass count.
- `\d+ <table>` against Postgres compared to a snapshot.

Each verification ends with one of:
- "PASS condition: <specific check>"
- "FAIL condition: <specific signal>"

If verification PASSes, operator proceeds to phase N+1.
If verification FAILs, phase MD's "Recovery" section (below) is consulted.

## Outputs to next phase

What state is now true that wasn't before. Mirror of "Inputs from previous phase" — Phase N's outputs match Phase N+1's inputs.

## Open questions / deferred items

Anything the drafter encountered but decided not to resolve in-phase. Each item:
- **Question:** one-line statement of the unresolved decision.
- **Default chosen for now:** what the phase MD does in absence of a decision.
- **Who can resolve:** "operator" / "Phase X" / "Arc 2".

If there are no open questions, write "n/a — phase scope is fully resolved."

## Recovery (if verification fails)

Short section. Per-failure-mode recovery:
- "If verification step 3 fails: drop the table and re-run migration. Idempotent."
- "If row count is off: check the regression by running `<command>`; the most likely cause is <X>; if confirmed, do <Y>."

This section is not exhaustive — it covers the failures the drafter could anticipate. Unanticipated failures route to operator.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with `Agent` tool, `subagent_type=Explore`, and the following brief shape:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>

Then verify, file-by-file:

1. Every CREATE TABLE column list — diff against the corresponding section in
   apps/qw-oracle/scripts/load-knowledge/schema.ts. Report mismatches.
2. Every CHECK constraint — verify enum values match schema.ts.
3. Every FK reference — verify it matches the FK convention locked in
   decisions.md D1 (entity_id INTEGER for *_versions, canonical_id TEXT for
   asset relation tables).
4. Every file path mentioned in "Files touched" — verify the path exists
   (for Modified/Deleted) or its parent dir exists (for Created).
5. Every `import.meta.main` usage — confirmed allowed (D2 says yes under Bun).
6. Every shell command — does it use `bun` for scripts (D2)?
7. Every reference to a finding (F1-F18 in review-findings.md) — does this
   phase actually resolve the findings it claims to?
8. Every SQL query in verification — does it parse against the schema this
   phase produces? (Best-effort eyeball; Postgres validation comes at runtime.)
9. "Engineer ports X" / "fills in details" / TODO smell — list any.
10. Any tables, columns, or fields the phase introduces that aren't in
    decisions.md and aren't in schema.ts — flag as potential drift.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale.

---

## Phase MD length

There is no hard cap. Length follows from the work the phase requires. Phase 2 (schema port for 31 tables + loader port for 17+ adapter files) and Phase 6 (MCP rewrite for 11 tools + new transport + new tools) will be longer than Phase 1 (foundation) or Phase 7 (observability cheatsheet). That's correct.

What matters is whether the phase MD reads end-to-end as a coherent unit. Apply judgement at the ~600-1000 line range:

- **Split** if the phase has two natural sub-deliverables that could ship as separate commits (e.g., Phase 2 might split into `phase-2a-schema-port.md` and `phase-2b-loader-port.md` if the schema-only commit is independently runnable). Update `README.md` to link both.
- **Don't split** if splitting forces shared state or context to be duplicated across files. A 1200-line phase that's one coherent unit beats two 600-line phases that both need the same preamble.

Cutting tasks, hand-waving file lists, or dropping verification to "fit" is the wrong move every time. The whole point of restructuring was to land complete, verifiable plans — length is a side effect, not a constraint.

If the drafter is unsure whether to split, default to NOT splitting and surface the question in the phase's "Open questions" section for operator review.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
