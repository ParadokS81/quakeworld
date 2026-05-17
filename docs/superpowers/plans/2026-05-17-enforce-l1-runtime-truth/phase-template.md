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
> 1. Read `decisions.md` IN FULL (D1-D22 + the D11 amendment + X1-X10 +
>    non-goals). The brainstorm is closed -- do NOT re-open a D; if a D looks
>    wrong, surface a deviation block and STOP.
> 2. Read `review-findings.md`; identify the F/R/W rows whose owning phase
>    role is this phase (ownership table at the bottom).
> 3. Recon the LIVE source before inlining anything: the actual extractor
>    shape (`apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py`,
>    `clang_config.py`; `ezquake/_handler_cvars.py`;
>    `ezquake/_handler_commands.py`; the per-project handler dir
>    `ezquake/`), the live `hud.c` line cites (D8/D10/F1), the 4 build
>    variants in `clang_config.py` (F3), the `entities` / `*_versions`
>    schema (`apps/qw-oracle/SCHEMA.md` + `db/migrations/`), and the banked
>    pool numbers re-checked against the live DB by re-running the sanity
>    gate (X8 / W2). Use 74 cmd / 92 cvar / ~129 reverse (F2) -- NEVER the
>    parking Scope numbers. Do NOT copy numbers or code from the spec
>    without verifying against live source.
> 4. After drafting, dispatch the verification sub-agent (brief at the
>    bottom of this file) before declaring the phase MD ready for review.

## Goal

One paragraph. What this phase produces and why it is a coherent unit. End
with a sentence naming the **runnable, verifiable state at the phase
boundary** (X1: each phase ends runnable, existing output byte-identical).
The runnable state must be self-contained -- it does NOT depend on a later
phase existing (X2: verify on this phase's own output, never a later phase's
artifact).

### Recon facts (verified) -- REQUIRED sub-block, immediately after Goal

A short bullet block titled "Recon facts (verified against live source
<date>; do not re-derive blind)" between the Goal and "Inputs from previous
phase". Records the numbers / paths / commits / columns / line cites the
phase depends on, each VERIFIED against the live repo / DB / dump / source
during drafting -- never copied from the spec unchecked. Includes the
re-run sanity-gate result for any pool number the phase rests on (X8 / W2).
This block is the evidence trail that makes the phase trustworthy. It is part
of the Goal section, not a new top-level section.

## Inputs from previous phase

What state must exist for this phase to start. Mirror of the previous
phase's "Outputs". If this is the first phase, inputs are the checked items
in `prerequisites.md`.

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/...        # what it is; generator vs hand-written
db/migrations/<NNN>_<name>.sql               # append-only
```

Absolute paths from repo root. Bullet list.

### Modified

```
path/to/existing.py                          # what changes (file granularity)
apps/qw-oracle/SCHEMA.md                     # alongside any migration
```

### Deleted

```
path/to/legacy                               # why deleted
```

Every deletion explains itself in a one-line comment. Deleting silently is
forbidden. (This arc is almost entirely additive -- D6/D9; deletions are rare
and suspicious. A deletion that touches existing handler output violates X3.)

## Tasks

Numbered. Each task has, in order:

- **Goal** (one sentence).
- **Files** (subset of "Files touched" -- just this task's).
- **Steps** (`- [ ]` checkboxes; imperative; mechanically doable -- if a step
  is "engineer synthesizes X" that is a smell: inline the exact spec or split
  into sub-steps with their own verification).
- **Verification** (commands / SQL / probe invocations -- YES/NO, see the
  phase-boundary format below; verifies on THIS phase's own output -- X2).
- **Execution mode** (MANDATORY -- one of):
  - `subagent (<model> <effort>)` + one-line rationale. **Default** for any
    task involving code synthesis, multi-file integration, schema/migration
    writing, extractor/handler/loader/harness/probe authoring, or
    judgment-dense work. Model+effort per `feedback_model_effort_range`
    (X6): Sonnet medium floor for reasoning; Sonnet MAX / Opus medium for
    multi-file judgment-dense; Opus MAX for architecture / cross-cutting
    (the call-graph mechanism design and the unified-schema design are
    Opus-MAX-shaped).
  - `inline` + one-line rationale. ONLY when the task is purely textual edits
    with full content shipped inline AND the change has no logic (markdown,
    doc, config-with-no-logic). Per `feedback_no_subagents_for_mechanical_edits`
    (X5): a handler / module / migration / loader / harness / probe is NOT
    inline-shaped.

If a phase's task table is >70% inline AND the phase involves code synthesis,
that is the qw-oracle Arc 1 inline-execution defect -- re-classify, do not
ship it. This is a code-synthesis arc; expect near-zero inline.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase. YES/NO
answers, not interpretive prose. Each ends with one of:
- "PASS condition: <specific check>"
- "FAIL condition: <specific signal>"

Mandatory probes where they apply:
- **X3 zero-diff non-corruption** (every phase that touches the extractor):
  the actual before/after diff command of emitted entity JSON (passenger
  toggled off vs prior HEAD output) and its EMPTY result. Asserted-in-prose
  is a FAIL.
- **Mechanism self-validation** (the two mechanism phases): the phase's own
  known-answer probes on the mechanism's own output -- Track A: the 3-gate
  (`sb_qtvlist_url` unreachable-everywhere / `gl_outline_scale_world`
  commented-register feeder / `cl_bobhead` reachable) run against the
  `reachable()` query + feeder output, NOT an L1 column. Track B: the 3
  anchors (`radar` bare / `+hud_radar`+`-hud_radar` / `togglehud` untouched)
  + the R7 zero-`type=cvar` emission probe, run against the handler JSON.
- **F1 quality-grid** (schema/loader/application phases):
  `npm run load-knowledge -- quality-grid --project ezquake` GREEN; new data
  shapes extend it.
- **SQL** against the dev DB:
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "<query>"`.

If PASS, operator proceeds to phase N+1. If FAIL, "Recovery" is consulted.

## Outputs to next phase

What state is now true that was not before. Mirror of the next phase's
"Inputs". Name the runnable state explicitly (the boundary commit leaves the
pipeline runnable AND existing output byte-identical -- X1/X3).

## Open questions / deferred items

Anything the drafter encountered but did not resolve in-phase. Each item:
- **Question:** one-line statement.
- **Default chosen for now:** what the phase MD does absent a decision.
- **Who can resolve:** "operator" / "Phase X" / "a sibling arc (named)".

If a sub-agent finding contradicted `decisions.md`, the decision wins --
record the rejected finding here with a one-line rationale. If the decision
itself looks wrong, do NOT silently comply or override -- surface for an
operator amendment.

If there are no open questions, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only. **X9 discipline:** recovery is
"re-run the corrected extract+load pipeline end-to-end", NEVER "UPDATE the
bad rows in place". Examples:
- "If the zero-diff probe is non-empty (X3 violated): the passenger is not a
  pure observer -- find the write into existing handler state, make the
  passenger read-only, re-run the extractor, re-diff. Do not patch the diff."
- "If a known-answer probe is red (X2/D18): the mechanism is broken OR
  upstream moved -- the phase is NOT done; fix the mechanism, do not lower
  the probe."

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

1. No-blend (D1/D12): Track A (call-graph) and Track B (literal HUD_Register
   modeling) share NO code, NO schema discriminator, NO acceptance gate. Flag
   any shared module, any single field with a kind discriminator, any blended
   probe.
2. Track B is COMMANDS ONLY (D11 amended / R7): the phase does NOT have
   `_handler_hud.py` emit any `type='cvar'` entity. Flag any cvar synthesis
   in the new handler (collision with _handler_cvars.py:288-351 on
   entities UNIQUE(project,type,name)).
3. Conservative posture (D3/D5): not-compiled is physically distinct from
   unreachable; reachable-in-any-variant -> build-excluded -> never
   auto-shipped; address-taken roots fully traversed (D4). Flag any logic
   that could false-accuse a live entity, or that collapses not-compiled
   into unreachable.
4. Non-corrupting zero-diff (X3/D6/D9): the phase ships the ACTUAL
   before/after diff command of emitted entity JSON and its empty result as
   a probe -- not a prose assertion. Flag a prose-only "output unchanged".
5. Toggle seam (X4): single subscription + single boolean; off == today's
   pipeline; off is the default for non-ezQuake forks. Flag a missing or
   multi-point seam.
6. Regime self-containment (X2/W4): the phase's verification uses THIS
   phase's own output (reachable() query / handler JSON / its own probes),
   NOT a later phase's L1 column or the combined harness. Flag any
   verification that needs a later phase to exist.
7. Two feeders (D7.1/D15): genuine-dead has two independent feeders
   (call-graph unreachable-everywhere vs commented-register textual); they
   are feeder-tagged, never collapsed. Flag any single-feeder collapse.
8. Provenance shape (D12/D14/D15/D16): two physically separate nullable
   fields, one shared three-slot spine (conclusion / evidence /
   dump-confirmation status); Track A evidence feeder-tagged per-variant;
   Track B element-linked (HUD_Register arg #1). Slot 3 is representation
   only in the schema phase (the cross-check is the acceptance phase). Flag
   a discriminated container or a cross-check done too early.
9. Three-level coverage (D13): per-version, mechanism-derived (NOT
   HEAD-dump-derived); level-3 only at pinned-dump commits; level-2 is the
   valid assistant-usable state, never auto-shipped, never withheld (D21).
10. Numbers (F2/F3/X7/X8): the phase uses 74 cmd / 92 cvar / ~129 reverse
    and the 4 build variants from clang_config.py; it states a re-run
    sanity-gate result in "Recon facts (verified)"; it does NOT re-run
    detection or re-derive pools. Flag stale 77/97/166/132 or a 2-variant
    assumption or a detection re-run.
11. Residuals: R1 (AST-confirm 0 non-literal HUD_Register first args before
    literal-only is load-bearing) for Track B; R4 (delete-list regenerates
    the in-repo ezquake-runtime-dead-entities.md byte-shape, build-excluded
    NEVER in it) for application; R5/R6 (harness = composition of
    mechanism-phase probes; reuse the banked version-pin proxy) for
    acceptance. Flag a residual the phase owns but does not resolve.
12. File paths in "Files touched": Modified/Deleted paths exist live;
    Created paths' parent dirs exist (the Created file itself is expected
    absent -- this is a paper plan; do NOT flag that).
13. Boundary creep: no FTE/QWCL/MVDSV ship (D2/D22), no cvar half, no
    help-JSON doc-gap arc, no entity-name case mini-arc, no detection-side
    automation, no detection re-run. Flag scope creep.
14. Execution mode: every task annotated subagent(<model> <effort>)+rationale
    or inline+rationale; subagent-default for code synthesis; not >70%
    inline. Opus MAX for the call-graph/schema design tasks (X6).
15. ASCII discipline (X10): no em-dash / en-dash / emoji in the phase MD or
    any inlined content; `--` for dashes.

Report under 400 words:

CRITICAL (would break execution or ship a dishonest/corrupt KB): ...
SUBSTANTIVE (would ship buggy behavior or mis-size a phase): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings before declaring the phase
ready. If a finding contradicts `decisions.md`, the decision wins and the
finding is rejected with a one-line rationale in the phase's "Open questions"
section (never silently comply, never silently override -- surface for an
amendment if the lock itself looks wrong).

---

*This template is enforced. Phase MDs that drift from this shape get bounced
to revision before review.*
