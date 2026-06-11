# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full) and `review-findings.md` (identify findings owned by this phase).
> 2. Read the design spec section(s) this phase implements.
> 3. Read the live source files this phase touches -- never trust the spec's or this template's claims about file shapes; verify against the tree (`feedback_plan_snippet_vs_file_shape.md`).
> 4. After drafting, dispatch the verification sub-agent (brief below) before declaring the phase MD ready for operator review.

## Goal

One paragraph. What this phase produces and why it's a coherent unit. End with a sentence naming the runnable state at phase boundary.

## Inputs from previous phase

What state must exist for this phase to start. Phase 0's inputs are the items in `prerequisites.md`.

## Files touched

### Created

Bullet list, paths from repo root, one-line purpose each.

### Modified

Path + one-line comment naming the change at file granularity.

### Deleted

Every deletion explains itself in a one-line comment. Deleting silently is forbidden.

## Tasks

Numbered. Each task has:

- **Goal** (one sentence).
- **Files** (subset of "Files touched").
- **Execution mode** -- one of:
  - `inline` -- with one-line rationale (typically: MD ships fully-locked content, or the task is the YAML assembler per D5/D19).
  - `subagent (<model> <effort>)` -- with one-line rationale (genuine synthesis: test authoring, exploratory code). Model + effort per `feedback_model_effort_range.md`.
  - `workflow fan-out (Sonnet high, low concurrency)` -- for extraction/verification sweeps per D10; the task names the item list, the per-agent prompt shape, and the structured-output schema fields (citations REQUIRED per D11).
- **Steps** (`- [ ]` checkboxes, imperative, mechanically doable).
- **Verification** (commands or queries with PASS/FAIL conditions).

If a step ships YAML rows, TS diffs, or doc text inline, ship the FULL content -- not a sketch. The drafter verifies inlined content against the live codebase; the sub-agent confirms. "Engineer fills in Y" is a smell: either inline it or split it into steps.

Operator SME gates (D12) appear as explicit HALT steps with the list format the operator will see.

## Verification (phase boundary)

Copy-paste commands the operator (or executor) runs at the end of the phase. YES/NO probes, not interpretive prose. For data phases this section includes, at minimum (D13):

- citation gate run (every ref resolves under the D7 two-form rule)
- F1 quality-grid for the per-(source, kind) probes this phase re-baselined
- seed double-load (identical counts + content hash)
- a spot SQL or MCP query with expected output

Each verification ends with "PASS condition: ..." / "FAIL condition: ...".

## Outputs to next phase

What state is now true that wasn't before. Mirrors the next phase's Inputs.

## Open questions / deferred items

Each item: **Question** / **Default chosen for now** / **Who can resolve** (operator | Phase X | post-arc). If none: "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Per-failure-mode recovery for anticipatable failures (bad load -> fix YAML and reload, loader is idempotent; citation gate fail -> the offending ref list is the work queue; probe mismatch -> diff expected vs live, suspect idempotency bugs before staleness per `feedback_idempotency_before_staleness.md`). Unanticipated failures route to operator.

---

## Verification sub-agent dispatch (drafter runs AFTER drafting, BEFORE operator review)

Dispatch with `Agent` tool, `subagent_type=Explore`, Sonnet medium, brief:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>

Then verify:

1. Every file path in "Files touched": Modified/Deleted paths exist in the
   live tree. Created files are EXPECTED not to exist -- skip them entirely;
   verify only that their parent directory exists.
2. Every inlined YAML row against the conventions in
   apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml: cluster
   header comments, per-prop *_source_ref siblings, gate shape (D3: single
   key, catalog tokens), notes style.
3. Every gate token in inlined rows exists in the live game_mode catalog
   (run: docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle
   -t -c "SELECT name FROM gameplay_mechanics WHERE gameplay_source_id='ktx'
   AND kind='game_mode'").
4. Every TS interface/function the MD claims exists (loader fields,
   quality-grid helpers, CLI flags) -- grep the live file and report drift.
5. Every count or row number stated as fact -- check against the live DB
   where queryable; report numbers that are stated but unverifiable.
6. Every F1 probe predicate the MD ships -- verify the predicate returns the
   expected result against the live dev DB NOW where the data already
   exists (F29 discipline); for data the phase will create, verify the
   predicate parses and targets the right columns.
7. Natural-key discipline: any row the MD adds must be new under
   (gameplay_source_id, kind, name, ruleset_gate_json) -- flag collisions
   with live rows (D9).
8. Workflow fan-out tasks: item list is honest (no silent caps), schema
   requires citations (D11), dials match D10.
9. "Engineer fills in X" / TODO smells -- list any.
10. Conflicts with decisions.md -- flag with the D-number.

Report under 400 words:
CRITICAL (would break execution): ...
SUBSTANTIVE (would ship wrong data): ...
ADVISORY (style / consistency): ...
If a section has no findings, write "(none)".
```

The drafter applies findings before handing back. If a finding contradicts `decisions.md`, decisions wins; reject the finding with a one-line rationale in "Open questions".

---

## Phase MD length

No hard cap; length follows from the work. Phase 3 (KTX sweep) will be the longest. Don't cut tasks or hand-wave to fit a target. If a phase has two natural sub-deliverables that could ship as separate commits, splitting is allowed -- update README.md; default to NOT splitting if unsure and surface in Open questions.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
