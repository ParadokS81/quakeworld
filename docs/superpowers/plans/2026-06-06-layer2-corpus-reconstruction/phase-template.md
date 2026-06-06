# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing in it, write "n/a" -- empty sections are easier to spot than missing ones.

Phase MD length is NOT capped. Length follows from the work. This arc's phases are small relative to Arc 1 (one migration, one thin loader, a tool rewire vs. 31 tables + 17 adapters), so phase MDs should be modest -- but never cut tasks or hand-wave file lists to hit a target.

---

# Phase <ID> -- <name>

> **Drafter / executor checklist before this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and note which risks this phase owns (see the ownership table).
> 3. Read the live source files this phase touches BEFORE writing against them -- the plan's snippets are hypotheses until grepped (`feedback_plan_snippet_vs_file_shape`).
> 4. After drafting, dispatch the verification sub-agent (brief below) before declaring the phase ready.

## Goal

One paragraph. What this phase produces and why it is a coherent unit. End with a sentence naming the runnable state at the phase boundary (decisions.md D2: each phase commits a working state).

## Inputs from previous phase

What state must exist for this phase to start. For Phase A, inputs are the items in `prerequisites.md`. For gated phases (C / buckets-E / D), the FIRST input line is the precondition, e.g. "PRECONDITION: Phase A gate green (decisions.md D2)."

## Files touched

### Created
```
path/from/repo/root.ts          # one-line note; mark if generated vs hand-written
```

### Modified
```
path/to/existing.ts             # what changes, at file granularity
```

### Deleted
```
path/to/legacy.ts               # why deleted -- deleting silently is forbidden
```

Absolute paths from repo root. (Most paths here live under `apps/qw-oracle/`.)

## Tasks

Numbered. Each task has:
- **Goal** (one sentence).
- **Files** (the subset of "Files touched" this task hits).
- **Steps** (`- [ ]` checkboxes; imperative -- "Edit X to do Y", "Run `<cmd>`"). If a step ships file content inline, ship the FULL content, not a sketch. "Engineer ports X" / "fills in Y" is a smell -- split it.
- **Verification** (commands/queries with a PASS/FAIL condition).
- **Execution mode** -- exactly one of:
  - `subagent (<model> <effort>)` with a one-line rationale -- e.g. `subagent (Sonnet medium) -- SQL synthesis against a known pattern, 1 file`.
  - `inline` with a one-line rationale -- e.g. `inline -- markdown/doc edit, full content shipped here, no logic`.
  - `workflow (Sonnet, conc-5, paced)` for an LLM fan-out task -- the fence/label passes ARE Workflow runs (decisions.md D9), not ordinary subagents.

  Default for reasoning/code-synthesis work is `subagent (Sonnet medium)`. Use `inline` only for pure textual edits with full content shipped. Use `workflow` for the LLM fan-out passes. Model/effort per `feedback_model_effort_range`: architecture/cross-cutting -> Opus MAX; multi-file judgment-dense -> Sonnet MAX or Opus medium; clear-spec code synthesis -> Sonnet medium; pure text shuffling -> Haiku or direct-edit.

## Verification (phase boundary)

Copy-paste commands the operator (or overseer terminal) runs to confirm the phase landed. YES/NO answers, not interpretive prose. Each ends with "PASS condition: ..." / "FAIL condition: ...".

For Phase A specifically, the boundary verification INCLUDES the operator-run go/no-go gate (decisions.md D2 + D11): the exact live-query comparison procedure, the seed query set, and what "threads win" looks like.

## Outputs to next phase

What is now true that was not before. Mirror of the next phase's "Inputs". For the gate phase, state explicitly whether the gate is green and what that unlocks.

## Open questions / deferred items

Each: **Question** / **Default chosen for now** / **Who can resolve** (operator / Phase X / a deferred stub). If a sub-agent finding contradicted `decisions.md`, the rejection + one-line rationale is recorded here. If none, "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Per-failure-mode recovery for the failures the drafter can anticipate (migration re-run is idempotent; a bad batch is re-runnable by D5; scratch regeneration per prerequisites.md). Not exhaustive -- unanticipated failures route to the operator.

---

## Verification sub-agent dispatch (run AFTER drafting, BEFORE handing to operator)

After the phase MD is drafted, dispatch a sub-agent with the `Agent` tool, `subagent_type=Explore`, and this brief (fill in the absolute paths):

```
You are verifying a draft plan phase against the live qw-oracle codebase. You
do NOT modify files; you report findings.

Read this phase MD: <abs path to phase-<ID>-*.md>
Read decisions.md: <abs path>
Read review-findings.md: <abs path>

Then verify, against live source:

1. Migration (if this phase writes one): every column / CHECK / index in the
   proposed DDL is consistent with decisions.md D4 AND follows the conventions
   in db/migrations/004_layer2_chat.sql (tsvector 'simple', GIN) and
   005_layer3_concepts.sql (vector(1024), hnsw vector_cosine_ops,
   embedding_stale). The migration number is the next FREE one (ls
   db/migrations/). Report any column type / CHECK enum / index drift.
2. Loader (if this phase loads data): the text it embeds is byte-identical to
   the probe representation -- "${author}: ${content}" joined by "\n", sliced
   to 30000 chars (verify against scripts/calibration/03-embed-and-retrieve.ts
   and vectors.ts). The thread_key construction matches decisions.md D5. The
   cache key matches vectors.ts:14. Report any divergence (R2).
3. Tool rewire (if this phase touches search_solved_issues): the hybrid path
   mirrors serve/mcp/src/tools/search-entities.ts (embedTexts query path,
   pgvector <=> kNN, websearch_to_tsquery('simple'), reciprocalRankFusion k=60,
   degraded lexical-only on Voyage failure). Confirm types.ts + orientation.ts +
   API_CONTRACTS.md are in the phase's "Files touched" (R3 / Discovery contract).
4. Workflow scripts (if this phase fans out LLM work): args normalized as a JSON
   string; model='sonnet'; low concurrency; paced waves; recovery+retry; honest
   success/fail counts (decisions.md D9 / R7). No Opus, no auto-concurrency.
5. Idempotency (if this phase backfills): the batch DELETE predicate exactly
   covers the INSERT scope and is consistent with the thread_key (R5). An
   idempotency probe (run twice -> identical state) is in the verification.
6. Every file path in "Files touched": Modified/Deleted must exist live;
   Created must have an existing parent dir (the file itself is expected NOT to
   exist -- do not flag that).
7. Every shell command uses `bun` for scripts (not tsx/node) and `bun db/migrate.ts`
   for migrations.
8. Any table / column / field the phase introduces that is NOT in decisions.md
   D4 -- flag as drift.
9. "Engineer fills in X" / TODO smell -- list any.

Report under 400 words:
CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...
If a section has no findings, write "(none)".
```

The drafter applies the findings. If a finding contradicts `decisions.md`, decisions wins -- record the rejection with a one-line rationale in the phase's "Open questions" section.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
