# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Do not add sections; do not
remove them. If a section has nothing to put in it, write "n/a" -- empty
sections are easier to spot than missing ones.

Phase MD length is NOT capped. The template enforces shape, not length. A
longer phase is correct if the work genuinely belongs together (split only
when two sub-deliverables ship as independent commits; default to NOT
splitting and surface the question in "Open questions").

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5, P1-P5, D1-D18).
> 2. Read `review-findings.md`; identify the rows whose "Phase" is this
>    phase (ownership table at the bottom).
> 3. Recon the LIVE source before inlining anything: the actual extractor
>    shape for the engine in scope (KTX tree-sitter vs MVDSV libclang are
>    DIFFERENT -- F confirmed-good note), the actual `entities` /
>    `*_versions` schema (`apps/qw-oracle/SCHEMA.md` + `db/migrations/`),
>    the actual probe-0 N/M denominators. Do NOT copy numbers or code from
>    the spec without verifying against live source.
> 4. After drafting, dispatch the verification sub-agent (brief at the
>    bottom of this file) before declaring the phase MD ready for review.

## Goal

One paragraph. What this phase produces and why it is a coherent unit. End
with a sentence naming the **runnable, verifiable state at the phase
boundary** (D17: each phase ends runnable). For Phase 1 specifically, the
runnable state must be self-contained -- it does NOT depend on Phase 2/3 rows
existing (the D17 planner note: Phase 1 ships a smoke probe proving the spine
round-trips against one fixture knob).

### Recon facts (verified) -- REQUIRED sub-block, immediately after Goal

Every phase MD carries a short bullet block titled "Recon facts (verified
against live source <date>; do not re-derive blind)" between the Goal and
"Inputs from previous phase". It records the numbers/paths/commits/columns
the phase depends on, each VERIFIED against the live DB / repo / dump / spec
during drafting -- never copied from the spec unchecked. This block is the
evidence trail that makes the phase trustworthy and lets the operator and the
verification sub-agent confirm the phase rests on reality. Established as a
norm 2026-05-17 (the Phase 0 draft introduced it; institutionalized for
consistency + the verify-before-asserting discipline). It is part of the
Goal section, not a new top-level section -- the canonical section list
below is unchanged.

## Inputs from previous phase

What state must exist for this phase to start. Mirror of the previous phase's
"Outputs". Examples:
- "Phase 0 complete: the C3 suspect pool exists at `<path>`; the ezquake.com
  shape-quant report exists; `load-commands.ts` fixed and the 28/108 MVDSV
  commands reloaded."
- "Phase 1 complete: the origin-tag/anchor/provenance/trail schema migration
  applied; the D6 synthesis skill exists; the D7 two-tier gate + the D11/D15
  audit serializer exist; the C5 tag+anchor F1 probes are green against the
  fixture knob."

If this is Phase 0, inputs are the checked items in `prerequisites.md`.

## Files touched

### Created

```
path/to/new/file.ts                    # what it is; generator vs hand-written
db/migrations/<NNN>_<name>.sql          # append-only (P1)
```

Absolute paths from repo root. Bullet list.

### Modified

```
path/to/existing.ts                     # what changes (file granularity)
apps/qw-oracle/SCHEMA.md                # alongside any migration (P1)
serve/mcp/src/orientation.ts            # only if the public projection changes (F-D13a)
```

### Deleted

```
path/to/legacy                          # why deleted
```

Every deletion explains itself in a one-line comment. Deleting silently is
forbidden. (Most phases here Create/Modify; deletions are rare -- the loader
fix is a modify, not a delete.)

## Tasks

Numbered. Each task has, in order:

- **Goal** (one sentence).
- **Files** (subset of "Files touched" -- just this task's).
- **Steps** (`- [ ]` checkboxes; imperative; mechanically doable -- if a step
  is "engineer synthesizes X" or "fills in the descriptions", that is a smell:
  either inline the exact spec, or split it into sub-steps with their own
  verification).
- **Verification** (commands / SQL / probe invocations -- YES/NO, see the
  phase-boundary format below).
- **Execution mode** (MANDATORY -- one of):
  - `subagent (<model> <effort>)` + one-line rationale. Default for any task
    involving code synthesis, multi-file integration, schema/migration
    writing, extractor/loader/serializer authoring, test/probe authoring, or
    judgment-dense work. Model+effort per `feedback_model_effort_range`:
    Sonnet medium floor for reasoning; Sonnet MAX / Opus medium for
    multi-file judgment-dense; Opus MAX for architecture / cross-cutting.
    **Spec-locked exception:** the D6 synthesis pass AND the D7 independent
    review pass are **Opus 4.7 MAX** -- the spec fixes this dial, the
    annotation records it, the planner does not lower it.
  - `inline` + one-line rationale. ONLY when the task is purely textual edits
    with full content shipped inline in the phase MD AND the change has no
    logic (markdown, doc, config-with-no-logic). Per
    `feedback_no_subagents_for_mechanical_edits` (sharpened): a schema
    migration / extractor / loader / serializer / probe is NOT inline-shaped.

If a phase's task table is >70% inline AND the phase involves code synthesis
(extractor, serializer, schema, skill, probe), that is the qw-oracle Arc 1
inline-defect pattern -- re-classify, do not ship it.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase. YES/NO answers,
not interpretive prose. Each ends with one of:
- "PASS condition: <specific check>"
- "FAIL condition: <specific signal>"

Use the project's real probes where they apply:
- The F1 quality-grid: `npm run load-knowledge -- quality-grid --project <p>`
  (regression + anomaly; `scripts/load-knowledge/quality-grid.ts`). C5 probes
  extend this -- the phase that first writes a data shape verifies its new
  probe is GREEN here.
- SQL against the dev DB:
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "<query>"`.
- Coverage counts vs the probe-0 N/M denominators (C1 -- exhaustive
  denominator, never a hand-picked subset).

If PASS, operator proceeds to phase N+1. If FAIL, the "Recovery" section is
consulted.

## Outputs to next phase

What state is now true that was not before. Mirror of the next phase's
"Inputs". Name the runnable state explicitly (the commit at the phase
boundary leaves the system runnable -- D17).

## Open questions / deferred items

Anything the drafter encountered but did not resolve in-phase. Each item:
- **Question:** one-line statement.
- **Default chosen for now:** what the phase MD does absent a decision.
- **Who can resolve:** "operator" / "Phase X" / "a sibling arc (named)".

If a sub-agent finding contradicted `decisions.md`, the decision wins -- record
the rejected finding here with a one-line rationale.

If there are no open questions, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only. **C4 discipline:** recovery is
"re-run the corrected pipeline", NEVER "UPDATE the bad rows in place".
Examples:
- "If the origin-tag probe fails (a tag outside the vocabulary): fix the
  emitter, re-run the affected extract/load end-to-end (C4), re-run the F1
  probe. Do not SQL-patch the rows."
- "If coverage is below the probe-0 N: the extractor seam dropped candidates
  -- check the `coverage.ndjson` input boundary (D9), do not lower the
  denominator (C1)."

Unanticipated failures route to operator.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting, BEFORE handing back)

Spawn with `Agent`, `subagent_type=Explore`, `description="Verify Phase N
draft"`, and this brief (fill the absolute paths):

```
You are verifying a draft plan phase against the live codebase. You do NOT
modify files; you report findings.

Read this phase MD: <abs path to phase-N-*.md>
Read decisions.md:   <abs path>
Read review-findings.md: <abs path>

Then verify, point by point:

1. Schema: every column the phase adds (origin tag, anchor version,
   re-review flag, retained-provenance JSONB, verdict/confidence/reasoning/
   proposed_desc) -- does it land as an append-only db/migrations/<NNN>.sql
   with a matching SCHEMA.md edit in the same task (P1)? Flag any hand-edit
   of an applied migration.
2. Origin-tag vocabulary: is it exactly the locked set
   source_inline / synthesized / shipped_doc (D2/D11)? Flag any other tag,
   any tag-per-file (D2 forbids vocabulary bloat).
3. JSONB: every structured-choices / retained-provenance / trail write --
   does it bind JS values directly (or tx.json), never a pre-stringified
   string (P2)? Flag any JSON.stringify into a JSONB column. Does the phase
   that first writes a JSONB shape extend F1.jsonb_columns_not_strings (C5)?
4. The D9 seam: does the mechanical extractor STOP at harvest (structured
   facts + candidate text + provenance) with ZERO quality verdict, and does
   every candidate AND every comment-less entity flow to the D5-D8
   evaluation? Flag any first-pass "comment looks fine" affirmation inside
   the parser.
5. Citation: does every synthesized/extracted row carry source_ref file:line
   via the EXISTING mechanism -- no new citation format invented (P3, D6)?
6. C5 gate: does this phase ship the F1 probe for any NEW data shape it is
   the first to write (not deferred to Phase 5)?
7. Coverage: are counts stated against the probe-0 N/M denominators, not a
   hand-picked subset (C1)? Flag any importance-argument scope-cut of
   residue.
8. Extractor shape: if the phase touches a KTX extractor it must be
   tree-sitter-shaped and a NEW sibling handler (NOT the registration
   handler, NOT libclang); MVDSV is libclang. Flag a shared-scaffold
   assumption.
9. Model dials: are the D6 synthesis pass and D7 review pass annotated
   Opus 4.7 MAX (spec-locked)? Flag a lowered dial. Are other tasks'
   execution-mode annotations present with a rationale, subagent-default for
   code synthesis?
10. File paths in "Files touched": Modified/Deleted paths exist in the live
    tree; Created paths' parent dirs exist (the Created file itself is
    expected absent -- this is a paper plan; do NOT flag that).
11. Boundary creep: does the phase stay out of the parked/sibling arcs --
    no dusty-* fork extraction (F-D10c), no reachability classification
    (F-C3b), no casing fix (F-D10b), no wiki-side plumbing (F-D14a)?
12. D17 shape: the phase matches its D17 slot; it does NOT re-derive the
    seven-phase shape or the engine order.
13. ASCII discipline (P5): no em-dash / en-dash / emoji in the phase MD or
    any inlined content.

Report under 400 words:

CRITICAL (would break execution or ship a dishonest/corrupt KB): ...
SUBSTANTIVE (would ship buggy behavior or mis-size a phase): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings before declaring the phase ready.
If a finding contradicts `decisions.md`, the decision wins and the finding is
rejected with a one-line rationale in the phase's "Open questions" section
(never silently comply, never silently override -- surface for amendment if
the lock itself looks wrong).

---

*This template is enforced. Phase MDs that drift from this shape get bounced
to revision before review.*
