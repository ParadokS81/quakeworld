---
name: ktx-l1-batch-dispatcher
description: |
  Use this skill to dispatch one KTX L1 category's per-card recasts as a single
  sub-agent invocation that wraps the `ktx-l1-rewrite` fan-out. Triggers on
  "/ktx-l1-batch-dispatcher <category> <batch_date>", "dispatch the next
  ktx-l1-rewrite batch for <category>", "run ktx-l1-batch-dispatcher on
  <category>", or per-batch dispatch from a MAIN session orchestrating
  multiple parallel batches. One category per invocation; designed so a MAIN
  session can dispatch 2-3 batches in parallel with light context overhead.
  Opus 4.7 medium reasoning (locked) for orchestration + cross-card synthesis;
  per-card sub-agents stay at Sonnet 4.6 high (locked by `ktx-l1-rewrite` --
  do NOT override). The skill MUST halt the batch on novelty park triggers
  (trigger 1 no-shape-match / trigger 4 sui-generis) and surface the
  candidate-shape signature for operator review -- it never extends the shape
  catalog itself. Triggers 2 + 3 are per-card parks/flags that do NOT halt.
  Engine-scoped to KTX; future MVDSV/QWFWD/QTV variants fork per codebase.
---

# ktx-l1-batch-dispatcher

One KTX L1 category per invocation. Pre-fetches the category's entities,
dispatches one `ktx-l1-rewrite` sub-agent per entity, halts on novelty,
runs cross-card consistency synthesis, writes the assembled per-batch
drafts/park files atomically, appends the HANDOVER followup, and commits.

This skill is the dispatcher cousin of `ktx-l1-rewrite`. The per-card skill
processes ONE entity at a locked Sonnet 4.6-high dial; this skill orchestrates
N per-card invocations as a single batch with cross-card synthesis on top.
MAIN sessions invoke this skill 1-3 times in parallel; each batch produces a
single commit, a structured digest, and an apply-pass entry on HANDOVER.

Where this skill's procedural detail lives in `references/` (see below) and
the per-card skill's discipline rules live in `~/.claude/skills/ktx-l1-rewrite/`,
defer to those rather than re-stating here.

## Model dial (LOCKED -- not a per-invocation choice)

- **Dispatcher**: Opus 4.7 medium reasoning. Orchestration + cross-card
  synthesis benefit from the higher tier; the per-batch context budget hosts
  the fan-out coordination, novelty detection, and consistency pass.
- **Per-card sub-agents**: Sonnet 4.6 high (locked by `ktx-l1-rewrite`).
  Do NOT override -- dispatching at a higher dial defeats the cost
  differential that makes the per-card skill exist.

## Trigger phrases

- `/ktx-l1-batch-dispatcher <category> <batch_date>`
- "dispatch the next ktx-l1-rewrite batch for `<category>`"
- "run ktx-l1-batch-dispatcher on `<category>`"
- per-batch dispatch from a MAIN session orchestrating multiple parallel batches

## Inputs (skill args)

- **category** -- required. KTX category name (e.g. "Match flow", "Mode
  selection", "Administration"). Matches the catalog HTML category label.
- **batch_date** -- required. `YYYY-MM-DD`. Used for the drafts/park
  filenames + the per-card sub-agents' batch_date arg.
- **anchor_version** -- required. KTX dev-head commit the batch is anchored
  against (e.g. `v1.36-1633-g67253dc`).
- **chunk_size** -- optional. Entities per sub-agent (4-8 accepted; default 6). See Step 3 rationale.
- **entity_pre_fetch** -- optional. If MAIN pre-fetched the entity list,
  pass it to skip the dispatcher's own pre-fetch step.

## Pre-flight gate (abort if any fail)

1. **Anchor verified**: `git -C /home/paradoks/projects/quakeworld/research/repos/ktx
   describe --always` matches `anchor_version`. If drifted: abort with a
   structured "anchor drift" report; operator decides advance-vs-wait.
2. **Per-card skill loaded**: cold-read `~/.claude/skills/ktx-l1-rewrite/SKILL.md`
   + all 6 files in `~/.claude/skills/ktx-l1-rewrite/references/`. These
   govern per-card discipline; the dispatcher cannot diverge from them
   silently.
3. **Cross-batch precedent loaded**: read drafts files from prior batches
   (`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`) for shape +
   See-also continuity. Skim, not full read.
4. **Mechanism maps loaded**: read any existing cross-batch mechanism maps
   in `apps/qw-oracle/docs/reviews/ktx-*-mechanism-map.md`. If a map covers
   entities in this batch's category, treat it as source-truth.
5. **Category-enumeration audit (amendment 2026-05-27)**: query the DB
   for `category_inferred = '<category>'` via
   `bun apps/qw-oracle/scripts/list-entities-by-category.ts --project ktx --category '<category>'`
   and diff against the batch's entity list (the `entity_pre_fetch` arg if
   passed, OR the Source-1 enumeration if pre-fetching here). HALT if any
   DB row is missing from the list -- surface the gap to operator for
   explicit accept/reject before fan-out. Reason: the prior arc's KTX
   batches silently skipped 16 entities because the entity-list assembly
   used semantic intuition (catalog HTML walk grouped by "what botcmd
   dispatches" / "what's the primary command in a Shape 1c pair") instead
   of literal `category_inferred` membership. The audit gate makes this
   skip-by-omission impossible.

Full procedural detail in `references/pre-flight.md` (gates 1-4) and
`references/pre-fetch.md` (gate 5 + Source-1 query mechanics).

## Workflow

Each step links to a `references/` file for the load-bearing detail. Read
the reference inline at the step rather than pre-loading everything.

### Step 1 -- Pre-flight gate

Run the 4-point gate above. Abort on any failure.

### Step 2 -- Pre-fetch L1 entities for the category

If `entity_pre_fetch` arg is present, use it directly (but pre-flight gate
#5 still audits it against DB). Otherwise: query Postgres directly via
`bun apps/qw-oracle/scripts/list-entities-by-category.ts --project ktx --category '<category>'`.
Output per entity: `{entity_name, entity_type, existing_description, source_ref,
catalog_line}`.

**MCP `search_entities` is NOT a valid source for category enumeration**
(amendment 2026-05-27). It's a hybrid retrieval tool tuned for consumer
queries -- no category parameter, 25-result cap, NULL-description entities
structurally invisible. Internal arc workflows must query DB directly; MCP
keeps its lane. See `references/pre-fetch.md` for the rationale.

**NULL-description entities**: route them to `describe-fill-synthesis`
FIRST (separate terminal, Opus 4.7 MAX) before this dispatcher's batch
runs. The per-card skill's pre-flight gate would otherwise abort each one
as `needs-synthesis`, leaving a partial batch.

### Step 3 -- Chunked sub-agent fan-out

Chunk the category's entities into groups of `chunk_size` (default 6; 4-8
accepted). Dispatch one sub-agent per CHUNK -- not per entity. Each
sub-agent runs the `ktx-l1-rewrite` skill at its locked Sonnet 4.6-high
dial in chunked mode: loads the skill + 6 reference files ONCE, then
applies the workflow to each entity in its chunk sequentially.

Pass to each sub-agent: the chunk's list of entity inputs (each carrying
`entity_name`, `entity_type`, `category`, `existing_description`,
`source_ref`, `anchor_version`, `catalog_line`, `batch_date`) plus the
override instructions below.

**MANDATORY Task-tool invocation shape** (amendment 2026-05-27): when
invoking the `Task` tool to dispatch each chunk sub-agent, you MUST pass:

- `model: "sonnet"` -- enforces the per-card skill's locked Sonnet 4.6-high
  dial. Omitting this parameter causes the sub-agent to INHERIT the
  dispatcher's higher-tier dial (typically Opus MAX or Opus 4.7 medium),
  silently defeating the cost differential that justifies the separated
  per-card skill. The skill's textual statement that "sub-agents run at
  Sonnet 4.6-high" is INTENT; only an explicit `model` parameter on the
  Task call enforces it at runtime.
- `subagent_type: "general-purpose"` -- the per-card skill is invoked
  inside the sub-agent's prompt; no specialized agent type is needed.
- `description`: 3-5 word task summary (e.g. "ktx-l1-rewrite chunk A").
- `prompt`: the full chunk instructions + per-entity input list + the
  override instructions below + the reporting-line collection block.

Do NOT call Task without `model`. Do NOT call Task with `model: "opus"`
expecting per-card cost discipline. The chunked-mode dial only holds when
this parameter is passed explicitly per chunk.

**Override the per-card file-write step**: instruct each sub-agent to
RETURN a LIST of per-card section contents (drafts or park) as part of
its structured report, NOT to write to per-batch files. The dispatcher
writes the assembled file atomically at Step 6. This protects against
partial drafts files if a sub-agent crashes mid-chunk.

**Sub-agent scratch-file convention (when return-in-YAML is impractical)**:
For chunks too large to return inline (>~5 entities at full v2 detail),
sub-agents MAY write to a `/tmp` scratch file under these rules:
- Filename MUST be batch-date-suffixed:
  `/tmp/chunk_<chunk_id>_<batch_date>.md` (e.g.
  `/tmp/chunk_A_powerup_family_2026-05-27.md`). Prevents cross-batch
  collision with stale `/tmp` files from prior batches.
- Sub-agent MUST use the `Write` tool (clobber semantics), NOT `Edit`. If
  the file exists from a prior run, OVERWRITE cleanly -- DO NOT preserve
  or extend stale content. The dispatcher does not expect the file to
  exist before the sub-agent's write; pre-existing content is residue.
- Dispatcher MUST validate each scratch file before assembly: (a) file
  exists; (b) section count (`^## ` headers) equals expected entity
  count; (c) entity-name list in the file matches the chunk's input
  entity-name list (no stale entities from prior batches).
- If section count or entity-name list mismatches: extract only the
  in-batch sections via line-range slicing OR re-dispatch the chunk; do
  not ship mixed-batch content. Added 2026-05-27 after Gameplay rules
  batch F13 (two chunks inherited stale /tmp content; dispatcher
  recovered via line-range slicing).

Collect per sub-agent: a list of `{verdict, section_content, shape_tag,
reporting_line}` records, one per entity in the chunk, in input order.
Aggregate across all chunks before proceeding to Step 4.

**Why chunking**: the per-card skill's 6 reference files (~30-40k tokens)
load once per sub-agent. At chunk_size=6 the front-matter overhead drops
~83% vs the prior one-sub-agent-per-entity pattern. Parallelism is
preserved across chunks; sub-agents within the same batch can fire in
parallel waves (typical: 4-8 sub-agents per wave per the existing arc
dispatch pattern).

**chunk_size rationale**: 6 balances context safety (Sonnet 4.6's 200k
window: ~30-40k front matter + 6 x ~15-20k entity work = ~120-160k, well
under cap), failure radius (lose at most 6 entities on a sub-agent
crash, not the whole category), and parallelism (Frogbot 78 -> 13
chunks; Scoring & stats 19 -> 4 chunks).

### Step 4 -- Halt-on-novelty gate

After all sub-agents return, scan parked verdicts. If ANY sub-agent returned
`parked` with **trigger 1 (no-shape-match relational)** or **trigger 4
(sui-generis-mechanism)**, HALT the batch:

- Do NOT proceed to cross-card synthesis or file writes.
- Return a "needs operator review" structured report with the candidate-shape
  signature, source pattern observed, and partial-state files (per-card
  records collected so far).
- Operator decides: extend catalog vs accept-park vs investigate further.

Triggers 2 (conflicting-shape-match) and 3 (source-vs-description-contradiction)
do NOT halt -- they are per-card parks/flags that the apply-pass-author
handles normally.

Full discrimination logic + halt-report shape in `references/halt-on-novelty.md`.

### Step 5 -- Cross-card consistency pass (only if no novelty halt)

Inspect all drafted entries for:

- Shared misintuitions (multiple cards mis-describing the same mechanism).
- Cross-card factual contradictions (e.g. card A says "after 3 warnings",
  card B says "the fourth warning").
- See-also bidirectional checks (if A references B, does B reference A?).
- Shape-classification consistency (sibling cards using the same shape tag
  format).

Pattern: 5-12 checks per batch. Copy the structure from the Voting batch's
`## Cross-card consistency notes` section. Worked examples + the section
template in `references/cross-card-checks.md`.

### Step 6 -- Atomic file writes

Write the assembled files in one `Write` call each (not append-per-card):

- **Drafts file**: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md`
  -- header + all `drafted` + `drafted_with_flag` sections + the cross-card
  consistency notes section.
- **Park file** (only if at least one `parked` verdict, AND it wasn't a
  trigger-1/4 halt -- if novelty halted at Step 4, no files were written):
  `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-<batch_date>.md`.

File templates + section formats in `references/file-formats.md`.

### Step 7 -- HANDOVER followup entry

Append a Small-followups entry to `HANDOVER.md` mirroring the shape of the
3 prior batch entries (Server config / Spectator chat / Voting). Standard
sub-items: (a) apply pass note, (b) cross-card findings, (c) shape /
A-B-probe notes if any, (d) open follow-ups for future batches.

Template in `references/file-formats.md`.

### Step 8 -- Commit

One commit per batch. Message format:

```
docs(ktx-l1-rewrite): SHIPPED <category> category (N cards, M drafted_clean + K flagged + P parked)
```

Staging: drafts file + park file (if any) + HANDOVER.md. Do NOT push --
MAIN session pushes after collecting multi-batch results.

## Return shape (structured digest for MAIN to collect)

```
batch_date: <YYYY-MM-DD>
category: <category name>
verdict_counts: {drafted: N, drafted_with_flag: K, parked: P}
files_written: [<drafts_path>, <park_path or null>]
cross_card_findings_count: <int>
novelty_halt: null OR {entity, trigger, candidate_shape_signature, partial_state_files}
commit_sha: <sha>
anchor: <anchor_version>
```

Full schema in `references/return-shape.md`.

## Discipline rules (the load-bearing ones)

The same rules the user spec calls out. Each is restated tersely; deeper
context in `references/`.

- **Halt on novelty, do not extend the catalog.** Park trigger 1 / 4 halts
  the batch. Operator reviews shape-candidate signature, decides extend
  catalog vs accept park. The per-card skill's earn-their-keep discipline
  governs the catalog; this dispatcher operationalizes it at batch scale.
- **Sub-agent for every per-card recast.** Do not inline-recast from the
  dispatcher -- per-card budget belongs to the sub-agent, not you. Inlining
  burns the per-card context allotment that's the whole point of the
  separated dial.
- **Atomic file writes.** Collect all sub-agent verdicts before writing
  drafts or park files; never leave a partial drafts file on disk. Override
  the per-card skill's per-card append behavior -- instruct sub-agents to
  RETURN section content, not write it.
- **Anchor at start.** Drifted anchor aborts the batch -- operator decides
  whether to advance anchor across the catalog or wait. Drift mid-batch is
  rare but the cost of shipping recasts against a different commit than
  declared is high.
- **One commit per batch.** No multi-commit batches; no mid-batch commits.
  Operator can roll back a batch with one revert.
- **Lean SKILL.md.** This file stays under ~300 lines; per-step detail
  lives in `references/`. Same discipline the per-card skill applies.

## What this skill does NOT do

- **Touch the L1 DB** -- apply pass remains operator-driven, separate phase.
- **Extend the shape catalog** -- earn-their-keep is human-judgment work;
  this skill parks novelty for operator review.
- **Push commits** -- MAIN session pushes.
- **Cross-batch synthesis** -- findings spanning multiple batches stay at
  MAIN level (sub-agents can't see each other's drafts; the dispatcher
  only sees its own batch).
- **Run apply-pass-author logic** -- `drafted_with_flag` entries get
  surfaced in the report but not auto-resolved.
- **Override the per-card model dial** -- per-card sub-agents stay at
  Sonnet 4.6 high. Dispatcher orchestration runs at Opus 4.7 medium.

## Engine scope

KTX-locked. Skill name: `ktx-l1-batch-dispatcher`. Future siblings:
`mvdsv-l1-batch-dispatcher`, `qwfwd-l1-batch-dispatcher`, `qtv-l1-batch-dispatcher`
-- forked per codebase when those L1 surfaces fan out catalog-wide. Layer A
(v2 universal shape) stays engine-agnostic across forks; the per-codebase
shape catalog is the forked surface. Forking (vs parameterizing) keeps each
skill's references/ tight and avoids conditional logic.

## When unsure, halt

If the batch's state is ambiguous in any of the halt conditions, HALT and
report rather than guess. The cost of halting is one operator review; the
cost of a force-fitted batch is corrupted L1 across N cards.
