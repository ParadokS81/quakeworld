# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings (if any) apply to this phase. (For this arc, F-entries accrue during execution; phase 1 typically has none at draft time.)
> 3. Read the relevant section of the brainstorm parking doc at `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`:
>    - Phase 1 (idempotency probe) -> Pass 1.2.1 + Pass 2.3 (roadmap entry)
>    - Phase 2 (reproducibility probe) -> Pass 1.2.4 + Pass 2.3
>    - Phase 3 (parallel-vs-serial) -> Pass 1.2.3 + Pass 2.3
>    - Phase 4 (migration probes) -> Pass 1.2.2 + Pass 2.3
>    - Phase 5 (authoring guide) -> Pass 1.2.6 + Pass 2.2 (skill update part 1) + Pass 2.3
>    - Phase 6 (audit cadence) -> Pass 1.2.5 + Pass 2.2 (skill update part 2) + Pass 2.3
>    - Phase 7 (cert doc) -> Pass 2.1 (per-gate ship + cert doc shape)
> 4. Source-walk the live codebase for the gate's lift source:
>    - Phase 1 -> `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` (canonical bash version; lift to TS)
>    - Phase 2 -> `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` Section 1.1 (Stage 1 reproducibility methodology)
>    - Phase 3 -> `apps/qw-oracle/scripts/extractors/ktx/tests/` (KTX-only pytest helpers; lift to `extractor_lib/tests/`)
>    - Phase 4 -> `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (inline migration validation SQL; lift to TS registry)
>    - Phase 5 -> `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (model gate's CLI shape) + the gate files shipped by Phases 1-4
>    - Phase 6 -> `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (existing structure)
>    - Phase 7 -> `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` (closest precedent for cert-doc shape)
> 5. Read the analogous prior gate / doc as a template (e.g., `quality-grid.ts` for any new TS gate; existing `validate-extractor` skill for cross-project audit shape).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

One paragraph. What this phase produces and why it's a coherent unit. End with a sentence naming the runnable state at phase boundary (matches `decisions.md` D13).

## Inputs from previous phase

What state must exist for this phase to start. Examples:
- "Phase 0 (n/a -- this arc has no Phase 0; Phase 1 starts cold from prerequisites)."
- "Phase 1 complete: `idempotency.ts` shipped; per-project config dict carries entries for ezquake / FTE / QWCL / MVDSV / KTX; KTX-only `idempotency-ktx.sh` deleted; dispatcher case in `index.ts` registered."

If this is Phase 1, inputs are the items in `prerequisites.md`.

## Files touched

Two subsections.

### Created

```
path/to/new/file.ts
path/to/another.py
```

Bullet list. Absolute paths from repo root. Comment if a file is created by a generator vs hand-written.

### Modified

```
path/to/existing.ts                    # what changes
```

Comments name the change at file granularity, not line granularity.

### Deleted

```
path/to/legacy.sh                      # why deleted
```

Every deletion explains itself in a one-line comment. Deleting silently is forbidden.

## Tasks

Numbered. Each task has:

- **Goal** (one sentence).
- **Files** (subset of "Files touched" above; just the ones this task touches).
- **Steps** (`- [ ]` checkboxes).
- **Verification** (commands or queries -- YES/NO probes; see D13).
- **Execution mode** -- one line declaring `inline` OR `subagent (<model> <effort>)` with a one-line rationale.

Steps are imperative ("Edit X to do Y", "Run `<command>`", "Append to Z"). Avoid prose explaining what the step achieves -- the step should be doable mechanically; if it's not, split it.

If a step ships file content inline, ship the FULL file content (not a diff, not a sketch). The drafter is responsible for verifying the inlined content is correct against the live codebase. Sub-agent verification confirms it.

If a step is "engineer ports X" or "engineer fills in Y" -- that's a smell. Either inline the port, or split it into a task with its own steps.

### Execution mode declaration (per task)

Per `decisions.md` D15, every task declares its execution mode:

- `inline` -- task is purely textual edits AND plan ships full content / per-file diffs inline AND change has no logic. Markdown / doc edits / config-with-no-logic. Edit/Write/Bash directly.
- `subagent (Sonnet medium)` -- mechanical implementation requiring reasoning (clear spec, 1-2 files, code synthesis).
- `subagent (Sonnet MAX)` or `subagent (Opus medium)` -- multi-file integration, judgment-dense, plan drafting.
- `subagent (Opus MAX)` -- architecture / cross-cutting review / post-arc analysis.
- `subagent (Sonnet medium, Explore)` -- plan verification (read code, compare, report).
- `subagent (Haiku)` -- pure text shuffling (deletions, renames, doc edits with full content shipped inline).

Each declaration has a one-line rationale: e.g., `subagent (Sonnet medium) -- code synthesis across 2 files; clear spec from Pass 1.2.1`.

If the rough-cut shows >70% inline tasks for a phase that involves code synthesis, sanity-check the slicing -- inline-by-default for code-shaped work is the qw-oracle Arc 1 inline-execution defect.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase to confirm it landed correctly. YES/NO answers, not interpretive prose.

Examples:
- `bun run load-knowledge -- <gate> --help` exits 0 and prints flag list.
- `bun run load-knowledge -- <gate> --project ezquake` exits 0; `--json` output parses as valid JSON.
- `bun run load-knowledge -- <gate> --project <p>` runs against all 5 projects (ezquake / FTE / QWCL / MVDSV / KTX); each returns exit 0 (or, if a real bug is surfaced, exit non-zero with a finding documented per D7 + D8).
- `pytest apps/qw-oracle/scripts/extractors/` runs without import error; expected pass count matches.
- SQL queries with expected row counts.

Each verification ends with one of:
- "PASS condition: <specific check>"
- "FAIL condition: <specific signal>"

If verification PASSes, operator proceeds to phase N+1.
If verification FAILs, phase MD's "Recovery" section (below) is consulted.

**Per D6:** every probe phase's verification section includes "run probe against all 5 projects." A real bug found during this run rides the phase commit per D7; pre-existing anomalies route to HANDOVER per D8; explicit-rejects are documented in commit body.

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

- "If verification step 3 fails for project X (idempotency shows count drift): inspect the diff output; most likely cause is a non-volatile column being treated as volatile, OR a real loader bug in project X. If real loader bug, drain-now per D7."
- "If verification step 5 fails (probe non-zero on `--all`): check which project failed first via `--project <p>` runs; triage the finding per D8."

This section is not exhaustive -- it covers the failures the drafter could anticipate. Unanticipated failures route to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

For this arc, F-entries accrue during execution; phase 1 typically has none at draft time. List the F-numbers this phase touches (if any exist when drafting) and how each resolves. Example:

- **F1** (idempotency catch-up: ezquake real bug found during P1 run). Resolved by Task 4 (loader bugfix rides P1's commit per D7).

If a finding touches the phase but is NOT resolved here, surface it under "Open questions" with a default and who can resolve.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, and the following brief shape:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>
Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (relevant Pass section: 1.2.X + 2.3 for probe phases; 1.2.6 + 2.2 + 2.3 for doc phases)

Then verify, file-by-file:

1. Every CI-readiness convention from D2 (exit codes, --project flag,
   --all, --json, --help, env-var driven DB, no CWD assumptions,
   deterministic output) -- verify the phase MD's gate authoring covers
   each. Flag CRITICAL on any missing convention for a TS-probe phase.

2. Every per-project config dict entry the phase ships -- verify the
   shape matches Pass 1.2.1 / 1.2.4 (per-gate dict; not unified
   registry; one entry per project: ezquake / FTE / QWCL / MVDSV / KTX).
   Flag SUBSTANTIVE on shape drift or missing project entries.

3. Every dispatcher case added to scripts/load-knowledge/index.ts --
   verify the case follows the F1 quality-grid mirror pattern (D4).
   Flag SUBSTANTIVE on dispatch shape drift. Confirm `case '<gate>':`
   imports + invokes the gate cleanly.

4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF
     is expected NOT to exist yet -- this is a paper plan, not
     executed code. Do NOT flag a Created file's non-existence.

5. Every JSONB column write (relevant if migration probes use sentinel
   inserts) -- confirm the loader/probe passes JS values directly or
   wraps with tx.json(...). Flag CRITICAL on any JSON.stringify(...)
   followed by TEXT bind (per D12).

6. Every reference to a finding (F-numbers in review-findings.md if
   any exist) -- does this phase actually resolve the findings it
   claims to?

7. Every shell command -- does it use `bun` for scripts (per project
   CLAUDE.md), not `tsx` or `node`? `python3` is acceptable for
   reproducibility probe + pytest invocations.

8. Every per-project audit step -- confirm phase MD's verification
   section includes "run probe against all 5 projects (ezquake / FTE /
   QWCL / MVDSV / KTX)" probe per D6; commit body capture findings
   inline per D6 + D8.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Every per-task "Execution mode" declaration -- confirm rationale
    matches D15 (subagent for code-synthesis; inline for markdown).
    Flag if >70% inline for a code-synthesis-shaped phase (P1-P4);
    Flag if >30% subagent for a markdown-shaped phase (P5-P7).

11. Every reference to existing infrastructure (idempotency-ktx.sh,
    quality-grid.ts, extractor_lib/tests/, VALIDATION-RUNBOOK.md,
    EXTRACTOR-PLAYBOOK.md, ~/.claude/skills/onboard-extractor/SKILL.md,
    etc.) -- verify the path exists and the cited line/structure
    matches.

12. For Phase 5 / Phase 6: verify ~/.claude/skills/onboard-extractor/
    SKILL.md exists; verify the phase MD's edits target sections that
    actually appear in the current SKILL.md content (read the file,
    cross-check section headers).

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.

---

## Phase MD length

There is no hard cap. Length follows from the work the phase requires. Phase 1 (idempotency probe + 5-project audit + bash deletion) and Phase 4 (12-migration registry + per-migration probes + 5-project audit) will be longer than Phase 7 (cert doc only).

What matters is whether the phase MD reads end-to-end as a coherent unit. Apply judgement at the ~600-1000 line range:

- **Split** if the phase has two natural sub-deliverables that could ship as separate commits (e.g., Phase 4 might split into `phase-4a-registry-shape.md` and `phase-4b-per-migration-probes.md` if the registry-only commit is independently runnable). Update `README.md` to link both.
- **Don't split** if splitting forces shared state or context to be duplicated across files.

Cutting tasks, hand-waving file lists, or dropping verification to "fit" is the wrong move every time. The whole point of the scaffold is to land complete, verifiable plans -- length is a side effect, not a constraint.

If the drafter is unsure whether to split, default to NOT splitting and surface the question in the phase's "Open questions" section for operator review.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
