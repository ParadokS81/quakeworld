# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

ASCII only throughout (no emoji, no em-dash / en-dash -- ASCII hyphen-minus). This is an operator output-discipline rule, not a style preference.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- D1-D21).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see the findings-to-phase table).
> 3. Read the relevant live source cold: `build-snapshot.ts` + `SCHEMA.md` for the export phase; the scaffolded `apps/docs-web/` for the render phases. Do NOT copy code from the spec or this scaffold -- verify against live files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" at the bottom) before declaring the phase MD ready for operator review.

## Goal

One paragraph. What this phase produces and why it is a coherent unit. End with a sentence naming the **runnable state at phase boundary** -- the thing an operator can run/see that proves the phase landed (e.g., "the docs dev server renders the ezQuake cvar browse view with working filter and inline cards").

## Inputs from previous phase

What state must exist for this phase to start. Examples:
- "qw_oracle Postgres up and populated; extractor AST output present (prerequisites Task 0)."
- "Phase 1 complete: `apps/docs-web/data/*.json` exists for all 6 codebases in the uniform record shape; slipgate-parity probe green."
- "Phase 2 complete: VitePress scaffold boots; the generic browse + card components render ezQuake end-to-end."

If this is Phase 1, inputs are the items in `prerequisites.md`.

## Files touched

Three subsections. Absolute paths from repo root. Comment each at file granularity.

### Created
```
apps/docs-web/...                       # hand-written vs generator
```

### Modified
```
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts   # what changes (and how the slipgate paths stay untouched -- F1)
```

### Deleted
```
path/to/thing                           # why deleted (deleting silently is forbidden)
```

## Tasks

Numbered. Each task has:
- **Goal** (one sentence).
- **Files** (subset of "Files touched" above; just this task's).
- **Steps** (`- [ ]` checkboxes, imperative: "Edit X to do Y", "Run `<command>`"). If a step ships file content inline, ship the FULL content (not a diff sketch). "Engineer ports X" / "fills in Y" is a smell -- inline it or split it.
- **Verification** (commands or queries; YES/NO).
- **Execution mode** (REQUIRED -- one of the forms below, with a one-line rationale).

### Execution mode vocabulary

- `inline` -- the orchestrator/executor does this directly (Edit/Write/Bash). Use ONLY when the task is purely textual edits with full content shippable inline and no code synthesis / multi-file judgment. Rationale names why it is mechanical.
- `subagent (<model> <effort>)` -- dispatch to a sub-agent. Model in {Haiku, Sonnet, Opus}; effort in {medium, high, MAX}. Rationale names why this tier.

Selection guide (from operator memory `feedback_model_effort_range.md`; full table in `references/arc-phase-archetypes.md`):

| Task shape | Mode |
|---|---|
| Architecture / cross-cutting / post-arc analysis | `subagent (Opus MAX)` |
| Multi-file integration, judgment-dense (the build-snapshot extension; the generic renderer) | `subagent (Sonnet MAX)` or `subagent (Opus medium)` |
| Mechanical implementation needing reasoning (clear spec, 1-2 files, code synthesis -- e.g. one Vue component, one data module) | `subagent (Sonnet medium)` |
| Plan/code verification (read, compare, report) | `subagent (Sonnet medium)`, Explore-shape |
| Pure text shuffling (full content inlined) | `inline` (or `subagent (Haiku)`) |

Honest test for model size: would a Stack Overflow answer suffice? -> Haiku. Synthesizing from 4+ files or a non-obvious judgment? -> Sonnet medium minimum. Architectural / cross-cutting? -> Opus MAX. Any fan-out of sub-agents: Sonnet, low concurrency, paced (shared rate limit); report honest counts.

## Verification (phase boundary)

Copy-paste commands the operator (or orchestrator) runs at phase end. YES/NO answers, not interpretive prose. Examples:
- `pnpm --dir apps/docs-web build` exits 0.
- A node/bun probe that validates every emitted record against the uniform shape (D13) and reports 0 violations.
- The slipgate-parity probe: `sha256sum` of slipgate's consumed files matches the Task-0 baseline (F1).
- "Open the dev server, the ezQuake cvar list filters to N rows when typing `cl_`."

Each verification ends with "PASS condition: <check>" or "FAIL condition: <signal>". PASS -> proceed to N+1. FAIL -> consult Recovery.

For the deploy phase, verification is **operator-run floor** (production cannot be faked): the public `docs.quake.world` URL responds with the right shape. Automated probes (build exits 0, CF Pages preview URL responds) stack on top but are not the floor.

## Outputs to next phase

What is now true that was not before. Mirror of the next phase's "Inputs."

## Open questions / deferred items

Each item:
- **Question:** one-line statement.
- **Default chosen for now:** what the phase MD does absent a decision.
- **Who can resolve:** "operator" / "Phase X" / "deferred to a later arc".

If a sub-agent verification finding contradicts `decisions.md`, the decision wins -- record the rejected finding here with a one-line rationale.

If none, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only:
- "If the slipgate-parity probe fails: the docs emit wrote into slipgate's dir or mutated a shared helper. Revert the emitter change, re-isolate the docs path (D12), re-run."
- "If a codebase's category coverage is 0: you read `head` instead of the frozen version for qtv/qwfwd/qwcl (F3/D16). Switch to the per-codebase default version."

Unanticipated failures route to operator.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting, BEFORE operator review)

Spawn a sub-agent with the `Agent` tool, `subagent_type=Explore`, this brief (fill in absolute paths):

```
You are verifying a draft plan phase against the live codebase. You read and
report; you do NOT modify files.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>

Then verify, item by item:

1. Every file path in "Files touched":
   - Modified/Deleted: verify the path exists in the live codebase.
   - Created: verify the PARENT directory exists (or is created by an earlier
     task in this phase). The file itself is expected NOT to exist yet -- this
     is a paper plan. Do NOT flag a Created file's absence.
2. For the export phase: every SQL the emitter runs -- do the table + column
   names exist in SCHEMA.md / the live schema? (cvar_versions.category_inferred,
   command_versions.help_group_id, entities.description, etc.) Flag any column
   that does not exist.
3. The slipgate-parity gate (F1/D12): does the phase modify build-snapshot's
   ezquake/qwcl/qw emit paths or DEFAULT_OUTPUT_DIR in a way that could change
   slipgate's consumed files? Is there a parity probe in Verification? Flag if
   the emit path is not isolated or the probe is missing.
4. The per-codebase version (F3/D16): does the export read the frozen snapshot
   version for qtv/qwfwd/qwcl (1.16-dev / 1.40-dev / 2.33), NOT head? Flag if it
   reads head for those three.
5. The uniform record shape (D13): does the export emit the same record shape
   for every type, omitting absent fields rather than null-filling? Is there a
   shape-validation probe? Flag drift.
6. Presentation/logic decoupling (D15): for render phases, does any .vue file
   carry data-fetching or a .filter()/.map() derivation in <script>? That logic
   belongs in a plain-TS module. Flag any logic-in-component.
7. Type-generic renderer (D14): for render phases, is the browse/card component
   codebase-agnostic and type-agnostic (data + config in, render out)? Flag any
   per-codebase or per-type branching baked into a component.
8. Cross-link scope (D19, amended 2026-06-09): for the cross-link phase, does
   cvar->cvar resolve WITHIN one codebase's entity set (not cross-fork)? Does the
   entity->guide "Used in" link render only where a note anchors the entity (no
   dead links) and target the docs guides portal (NOT the wiki)? Flag violations.
9. Execution-mode annotations: does every task carry an execution mode
   (inline | subagent (model effort)) with a rationale? Flag any task missing it.
   Is anything code-synthesis-shaped marked inline? Flag it.
10. Scope creep (D21, amended 2026-06-09): does the phase drift into a non-goal
    (FTE, L3-guide/concept-note authoring, the guides-portal render surface,
    cross-engine, faceted search, ranges, deploy automation, community data)?
    Flag it.
11. "Engineer ports X" / "fills in details" / TODO smell -- list any.

Report findings under 400 words:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the findings before declaring the phase ready. If a finding contradicts `decisions.md`, the decision wins -- reject it with a one-line rationale in the phase's "Open questions" section.

---

## Phase MD length

No hard cap. Length follows from the work. The export phase (one generic emitter + per-codebase dispatch + 3 probes) and the ezQuake-template phase (scaffold + generic renderer + full ezQuake wiring) will be longer than the deploy phase. That is correct.

Split only when a phase has two natural sub-deliverables that ship as independent commits (e.g., scaffold-boots vs ezQuake-renders). Don't split when splitting duplicates shared context. If unsure, default to NOT splitting and surface the question in "Open questions."

Cutting tasks, hand-waving file lists, or dropping verification to "fit" is wrong every time. Length is a side effect, not a constraint.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
