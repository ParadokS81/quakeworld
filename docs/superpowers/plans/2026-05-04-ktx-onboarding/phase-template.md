# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase.
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template (e.g., MVDSV's `_handler_log_templates.py` for KTX's match_event loader). Do NOT subclass; port (D3).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

One paragraph. What this phase produces and why it's a coherent unit. End with a sentence naming the runnable state at phase boundary (matches `decisions.md` D16).

## Inputs from previous phase

What state must exist for this phase to start. Examples:
- "Phase 0 complete: doctrine fixes shipped; obsolete TS regex extractor at `scripts/extractors/ktx/commands.ts` deleted."
- "Phase 1 complete: Pattern 6 cross-header lift in `extractor_lib._source.py`; migrations 008/009/010 applied to dev DB; new `gameplay_sources` row for `'ktx'` exists."

If this is Phase 0, inputs are the items in `prerequisites.md`.

## Files touched

Two subsections.

### Created

```
path/to/new/file.py
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
path/to/legacy.ts                      # why deleted
```

Every deletion explains itself in a one-line comment. Deleting silently is forbidden.

## Tasks

Numbered. Each task has:
- **Goal** (one sentence).
- **Files** (subset of "Files touched" above; just the ones this task touches).
- **Steps** (`- [ ]` checkboxes).
- **Verification** (commands or queries -- YES/NO probes; see D16).
- **Execution mode** -- one line declaring `inline` OR `subagent (<model> <effort>)` with a one-line rationale.

Steps are imperative ("Edit X to do Y", "Run `<command>`", "Append to Z"). Avoid prose explaining what the step achieves -- the step should be doable mechanically; if it's not, split it.

If a step ships file content inline, ship the FULL file content (not a diff, not a sketch). The drafter is responsible for verifying the inlined content is correct against the live codebase. Sub-agent verification confirms it.

If a step is "engineer ports X" or "engineer fills in Y" -- that's a smell. Either inline the port, or split it into a task with its own steps.

### Execution mode declaration (per task)

Per `decisions.md` D18, every task declares its execution mode:

- `inline` -- task is purely textual edits AND plan ships full content / per-file diffs inline AND change has no logic. Markdown / doc edits / config-with-no-logic. Edit/Write/Bash directly.
- `subagent (Sonnet medium)` -- mechanical implementation requiring reasoning (clear spec, 1-2 files, code synthesis).
- `subagent (Sonnet MAX)` or `subagent (Opus medium)` -- multi-file integration, judgment-dense, plan drafting.
- `subagent (Opus MAX)` -- architecture / cross-cutting review / post-arc analysis.
- `subagent (Sonnet medium, Explore)` -- plan verification (read code, compare, report).
- `subagent (Haiku)` -- pure text shuffling (deletions, renames, doc edits with full content shipped inline).

Each declaration has a one-line rationale: e.g., `subagent (Sonnet medium) -- code synthesis across 3 files; clear spec`.

If the rough-cut shows >70% inline tasks for a phase that involves code synthesis, sanity-check the slicing -- inline-by-default for code-shaped work is the qw-oracle Arc 1 inline-execution defect.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase to confirm it landed correctly. YES/NO answers, not interpretive prose.

Examples:
- SQL queries with expected row counts.
- `bun test` invocations with expected pass count.
- `\d+ <table>` against Postgres compared to a snapshot.
- `python3 apps/qw-oracle/scripts/extractors/ktx/_handler_X.py --help` runs without import error (handler shape sanity).

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
- **Who can resolve:** "operator" / "Phase X" / "Future arc".

If there are no open questions, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Short section. Per-failure-mode recovery:
- "If verification step 3 fails: drop the table and re-run migration. Idempotent."
- "If row count is off: check the regression by running `<command>`; the most likely cause is <X>; if confirmed, do <Y>."

This section is not exhaustive -- it covers the failures the drafter could anticipate. Unanticipated failures route to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

List the F-numbers this phase touches and how each resolves. Example:

- **F1** (KTX cvar bucket counts). Resolved by Task 2 (handler emits 192 source-registered rows; F1 probe asserts the count).
- **F18** (delete TS regex extractor). Resolved by Task 1 (`git rm scripts/extractors/ktx/commands.ts`).

If a finding touches the phase but is NOT resolved here, surface it under "Open questions" with a default and who can resolve.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, and the following brief shape:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>
Read the design spec section relevant to this phase:
  /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
  (relevant section: Pass <N>.X)

Then verify, file-by-file:

1. Every locked count anchor in review-findings.md applicable to this
   phase -- verify the phase MD reproduces the count exactly. If the
   phase plans to extract more or fewer rows, flag CRITICAL.
2. Every CHECK constraint in any migration or schema reference -- diff
   against the corresponding section in decisions.md D5 (the three
   migration files). Report mismatches.
3. Every JSONB column write -- confirm the loader passes the JS value
   directly or wraps with tx.json(...). Flag CRITICAL on any
   JSON.stringify(...) followed by TEXT bind (per D14).
4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF
     is expected NOT to exist yet -- this is a paper plan, not
     executed code. Do NOT flag a Created file's non-existence as
     CRITICAL or anything else. Skip it entirely.
5. Every reference to a Pattern (Pattern 4 / 5 / 6 / 9 / 10 / 14) --
   confirm the pattern is correctly named and the EXTRACTOR-PLAYBOOK
   describes it.
6. Every reference to a KTX source file or line:line range -- verify
   the file exists at research/repos/ktx/<path>; if a line range is
   cited, sanity-check that the line number is in range for the file
   (no need to verify content; just bounds).
7. Every reference to a finding (F1-F21+ in review-findings.md) -- does
   this phase actually resolve the findings it claims to?
8. Every shell command -- does it use `bun` for scripts (D18 Bun
   discipline inherited from Arc 1 D2)?
9. "Engineer ports X" / "fills in details" / TODO smell -- list any.
10. Any tables, columns, fields, or kinds the phase introduces that
    aren't in decisions.md and aren't in the design spec -- flag as
    potential drift.
11. Every per-task "Execution mode" declaration -- confirm rationale
    matches D18 (subagent for code-synthesis; inline for markdown).
    Flag if >70% inline for a code-synthesis-shaped phase.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.

---

## Phase MD length

There is no hard cap. Length follows from the work the phase requires. Phase 2 (4 first-class entity handlers + 4 loader wirings) and Phase 3 (modes handler with cross-header dependency + ~336 rows) will be longer than Phase 0 (doctrine fixes only) or Phase 4 (taxonomies handler with 32 rows).

What matters is whether the phase MD reads end-to-end as a coherent unit. Apply judgement at the ~600-1000 line range:

- **Split** if the phase has two natural sub-deliverables that could ship as separate commits (e.g., Phase 2 might split into `phase-2a-handlers.md` and `phase-2b-loaders.md` if the handler-only commit is independently runnable). Update `README.md` to link both.
- **Don't split** if splitting forces shared state or context to be duplicated across files. A 1200-line phase that's one coherent unit beats two 600-line phases that both need the same preamble.

Cutting tasks, hand-waving file lists, or dropping verification to "fit" is the wrong move every time. The whole point of the scaffold is to land complete, verifiable plans -- length is a side effect, not a constraint.

If the drafter is unsure whether to split, default to NOT splitting and surface the question in the phase's "Open questions" section for operator review.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
