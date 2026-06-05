# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

The phase MD is a **paper plan**. The drafter does NOT execute (no migrations, no extractor runs, no loads). The phase MD becomes input to a separate execution session.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md`; identify which findings apply to this phase (ownership table at the bottom).
> 3. Run live recon (Read/grep/ls) on the real source files this phase touches -- do NOT plan from memory or from this scaffold's summaries.
> 4. After drafting, dispatch the verification sub-agent (brief at the bottom of this template) before declaring the phase MD ready for review.

## Goal

One paragraph. What this phase produces and why it is a coherent unit. End with a sentence naming the **runnable state at phase boundary** (decisions.md D11).

## Inputs from previous phase

What state must exist for this phase to start (mirror of the previous phase's Outputs). If this is Phase 0, inputs are the items in `prerequisites.md`.

## Files touched

### Created
```
path/from/repo/root/new-file.ext        # comment: generator-emitted vs hand-written
```

### Modified
```
path/from/repo/root/existing.ts          # what changes (file granularity, not line)
```

### Deleted
```
path/from/repo/root/legacy.ext           # why deleted (every deletion explains itself)
```

Absolute paths from repo root. Deleting silently is forbidden.

## Tasks

Numbered. Each task has:
- **Goal** (one sentence).
- **Files** (subset of "Files touched" -- just this task's).
- **Steps** (`- [ ]` imperative checkboxes; mechanically doable, else split).
- **Verification** (commands/queries; YES/NO; see the phase-boundary format below).
- **Execution mode** (one line; see the rule below).

If a step ships file content inline, ship the FULL content (not a diff sketch). The drafter is responsible for verifying inlined content against live source; the sub-agent confirms it. "Engineer ports X" / "fills in Y" is a smell -- inline it or split it into a real task.

### Execution-mode rule (decisions.md + operator memory)

Each task declares ONE of:

- `inline` -- only when the task is purely textual edits with full content shipped inline (markdown / doc / config-with-no-logic). One-line rationale.
- `subagent (<model> <effort>)` -- the default for anything with reasoning: code synthesis, multi-file integration, schema/migration writing, extractor handler authoring, test authoring. One-line rationale.

Model + effort guide (operator memory `feedback_model_effort_range`):

| Task shape | Model + effort |
|---|---|
| Architecture / cross-cutting review / post-arc analysis | Opus MAX |
| Multi-file integration, judgment-dense, plan drafting | Sonnet MAX or Opus medium |
| Mechanical implementation requiring reasoning (clear spec, 1-2 files, code synthesis) | Sonnet medium |
| Plan/draft verification (read, compare, report) | Sonnet medium, Explore-shape |
| Pure text shuffling (full content shipped inline) | Haiku, or skip subagent and direct-edit |
| Per-knob describe synthesis | **spec-locked Opus MAX via `describe-fill-synthesis`** (D8) -- do not re-select |

If a phase's task table is >70% inline AND the phase involves code synthesis, that is the qw-oracle Arc 1 mis-classification defect -- re-check before sign-off.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase. YES/NO, not interpretive prose. Each ends with a `PASS condition:` and a `FAIL condition:`. Examples for this arc:

- `bunx tsc --noEmit` -> exit 0 (D3 completeness gate).
- Postgres count: `SELECT type, count(*) FROM entities WHERE project='qwfwd' GROUP BY type;` -> expected per-type numbers.
- Reproducibility: re-run extractor -> `git diff --stat` on the output dir is empty.
- MCP smoke: a `lookup_entity` for a known knob returns the row.
- Idempotency: re-run `load-version` -> identical counts, no new rows.

**Postgres, not sqlite** (D12). Verification probes must be self-contained -- never depend on a later phase existing (D11).

## Outputs to next phase

What is now true that wasn't before. Mirror of the next phase's Inputs.

## Open questions / deferred items

Each: **Question** / **Default chosen for now** / **Who can resolve** (operator / Phase X / follow-on arc). If a sub-agent finding contradicted `decisions.md`, record the rejection here with a one-line rationale (decisions win). If none, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only:
- "If the migration's DROP CONSTRAINT errors on a name mismatch: the constraint name differs from the assumed `<table>_<col>_check`; re-query `pg_constraint` and use the real name. Migration is idempotent if wrapped to drop-if-exists."
- "If reproducibility diff is non-empty: most likely multiprocessing emit-order non-determinism or absolute-vs-relative `source_file` paths; check the handler's `finalize()` sort and the path normalization."

Unanticipated failures route to operator.

---

## Verification sub-agent dispatch (drafter runs AFTER drafting, BEFORE operator review)

After the phase MD is drafted, the drafter spawns a sub-agent (`Agent` tool, `subagent_type=Explore`, Sonnet medium) with this brief, paths substituted:

```
You are verifying a draft plan phase against the live codebase. Do NOT modify files; report findings only.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: <absolute path>
Read review-findings.md: <absolute path>

Then verify, against live source:

1. Every file path in "Files touched":
   - Modified/Deleted: the path exists in the live tree.
   - Created: the PARENT directory exists. The file itself is expected NOT to
     exist yet (paper plan) -- do NOT flag a Created file's absence.
2. Extractor JSON contract: every per-type payload field name the phase claims
   (vars / commands / params / info_keys) and the per-entity {name, ast:{...}}
   shape match what the loader adapters actually read -- load-cvars.ts,
   load-commands.ts, load-cmdline-params.ts, load-info-keys.ts. Report any
   field-name or ast-subfield mismatch.
3. Schema (Phase 0): the migration ALTERs all 10 project-CHECK clauses listed
   in decisions.md D2; constraint names match the live pg_constraint catalog
   (not assumed); it is a NEW migration file (020+), never an edit to 002.
4. Project plumbing (Phase 0): the Project union edit + every Record<Project,...>
   site (decisions.md D3 lists 12) is addressed; the phase's gate is
   `bunx tsc --noEmit`.
5. Load path: the phase uses `load-version --json` (D1), NOT extract-tag, for
   qtv/qwfwd. Flag any call to extract-tag for these projects.
6. Registration idioms (Phase 1/2): the handler/walker targets the right idiom
   (QWFWD Cvar_Get/Cvar_Register + Cmd_AddCommand; QTV qvs.Reg/RegEx +
   cmd.Register) and excludes non-registration call-sites (F6).
7. Verification probes: Postgres, not sqlite (D12). Self-contained, no
   dependency on a later phase (D11). Each has PASS/FAIL conditions.
8. Execution-mode annotations: every task has one; non-trivial code-synthesis
   tasks are subagent, not inline (decisions.md execution-mode rule).
9. Any table/column/field/entity-type the phase introduces that is not in
   decisions.md and not in the live schema -- flag as drift (D5: no new types).
10. "Engineer ports X" / "fills in Y" / TODO smells -- list any.

Report under 400 words:
CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...
"(none)" for an empty section.
```

The drafter applies the findings. If a finding contradicts `decisions.md`, decisions win and the finding is rejected with a one-line rationale in "Open questions."

---

## Phase MD length

No hard cap. Length follows from the work. Split only if a phase has two natural sub-deliverables that ship as separate runnable commits (update README.md to link both); don't split if it forces duplicated preamble. When unsure, do NOT split; surface the question in "Open questions."

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
