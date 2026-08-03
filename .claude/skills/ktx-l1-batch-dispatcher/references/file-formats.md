# File formats + return shape

What the dispatcher writes to disk + what it returns to MAIN.

## Drafts file

Path: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md`
(relative to `/home/paradoks/projects/quakeworld/`).

Header:

```markdown
# ktx-l1-rewrite drafts -- batch <YYYY-MM-DD>

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.
```

Per-card section format (mirrors the per-card skill's drafts file format
in `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`):

```markdown
---
## <entity_name> (KTX <entity_type>, <category> -- <shape>)

- **Status**: drafted | drafted_with_flag
- **Source**: <source_file:source_line>
- **Catalog line**: <catalog_line>
- **Anchor**: <anchor_version>

### Current description

> <existing_description, verbatim>

### Shape classification

<shape ID + composition if applicable, e.g. "Shape 7a election + Shape 4 admin gate">
<reasoning trail: 1-3 sentences>

### Proposed draft

\`\`\`
<v2 recast text>
\`\`\`

### Notes

- <factual contradiction flags called out explicitly, prefixed with "FLAG:">
- <reasoning for borderline calls>
- <any operator-facing context the apply-pass-author needs>
```

Section order in the assembled file:

1. Header (above).
2. All per-card sections, sorted by `entity_name` ascending OR by category
   sub-grouping if the category has natural sub-groups (e.g. Voting has
   election-family / vote-family / threshold-cvar sub-groups). Pick one
   ordering and stay consistent within the file.
3. `## Cross-card consistency notes` section per
   `references/cross-card-checks.md`.

## Park file

Path: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-<batch_date>.md`.

Only written if the batch has at least one `parked` verdict AND the batch
did NOT halt at the novelty gate. (Halt-on-novelty batches produce ZERO
files -- see `references/halt-on-novelty.md`.)

Header:

```markdown
# ktx-l1-rewrite parked entities -- batch <YYYY-MM-DD>

Entities the skill could not confidently recast. Each entry names the park
trigger and the source signature observed. Operator reviews at end of
batch.
```

Per-card park section format:

```markdown
---
## <entity_name> (KTX <entity_type>, <category>)

- **Source**: <source_file:source_line>
- **Anchor**: <anchor_version>
- **Park trigger**: <2 | 3> <trigger name>

### What the skill saw

- <observation bullet 1>
- <observation bullet 2>
- ...

### Suggested manual investigation

- <next-step bullet 1>
- <next-step bullet 2>
- ...
```

Note: trigger 1 + trigger 4 parks do NOT appear in the park file -- they
halt the batch before any file write. The park file only contains
trigger 2 + trigger 3 parks.

## HANDOVER entry (Small followups section)

Append to `HANDOVER.md` under `### Small followups`. Shape mirrors the
3 prior batches (Server config / Spectator chat / Voting):

```markdown
- **ktx-l1-rewrite <Category> -- apply pass + cross-card findings** --
  <N>-card batch SHIPPED <YYYY-MM-DD>: all <N> cards drafted,
  **<P> parked** (or "**0 parked**" if zero). **<M> drafted clean**
  + **<K> drafted_with_flag**. All in
  `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<YYYY-MM-DD>.md`;
  <"no parked file" | "parked file at ktx-l1-rewrite-parked-<date>.md">.
  (a) **Apply pass** -- operator audits + applies clean drafts to
  `entities.description`; <K> `drafted_with_flag` entries need review
  before applying. Same operator phase as prior batches' apply passes
  above; tackle in sequence.
  (b) **Cross-card findings (<N> actionable)** -- <one-line per F-entry
  summary, e.g. "F1: <name>. F2: <name>. ..."> Full details in
  `## Cross-card consistency notes` section at end of drafts file.
  (c) **<new shapes / probe findings / model-dial notes if any>**
  (d) **Open follow-ups for future batches** -- <one-line per follow-up>.
  Cumulative ktx-l1-rewrite drafts: <cumulative_N> of 618 KTX L1 entities
  = ~<percentage>%. [small followup]
```

Sub-items (a) through (d) are conventional; not every batch fills (c). The
cumulative-progress line goes at the end (reflects the running total
across all shipped batches).

## Commit message format

```
docs(ktx-l1-rewrite): SHIPPED <Category> category (<N> cards, <M> drafted_clean + <K> flagged + <P> parked)
```

Substitutions:

- `<Category>`: the dispatcher arg, capitalized as in the catalog.
- `<N>`: total cards in the batch.
- `<M>`: count of `drafted` verdicts.
- `<K>`: count of `drafted_with_flag` verdicts.
- `<P>`: count of `parked` verdicts (trigger 2/3 only -- trigger 1/4
  halts produce a different commit message; see below).

Use `HEREDOC` for the commit invocation:

```bash
git commit -m "$(cat <<'EOF'
docs(ktx-l1-rewrite): SHIPPED <Category> category (<N> cards, <M> drafted_clean + <K> flagged + <P> parked)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### On halt: no commit

If the batch halted at the novelty gate (Step 4), the dispatcher does NOT
commit. The halt report goes to MAIN; no files were written; nothing to
commit. Operator decides next steps and re-runs.

### Staging

Stage these files for the batch commit:

- The drafts file (always written on non-halt batches).
- The park file (if at least one trigger 2/3 park).
- `HANDOVER.md` (always edited on non-halt batches).

Do NOT use `git add -A` -- explicit `git add <files>` only, per the
repo's git workflow rules.

## Return shape (structured digest for MAIN)

The dispatcher returns this digest to MAIN at the end of every invocation
(both successful batches and novelty halts):

```yaml
batch_date: <YYYY-MM-DD>
category: <category arg>
status: SHIPPED | HALTED_ON_NOVELTY | PREFLIGHT_ABORT

# Populated on SHIPPED:
verdict_counts:
  drafted: <M>
  drafted_with_flag: <K>
  parked: <P>  # trigger 2/3 only
files_written:
  - <drafts_path>
  - <park_path or null>
cross_card_findings_count: <int>
commit_sha: <sha>

# Populated on HALTED_ON_NOVELTY:
novelty_halt:
  entity: <entity_name>
  trigger: <1 | 4>
  candidate_shape_signature: <prose>
  rationale: <prose>
  source_refs: [<file:line>, ...]
partial_state:
  cards_processed: <int>
  cards_drafted: <int>
  cards_flagged: <int>
  cards_parked: <int>

# Populated on PREFLIGHT_ABORT:
preflight_abort:
  reason: <anchor_drift | reference_load_fail | mcp_unreachable | ...>
  details: <one-line summary>
  recommendation: <what operator should do next>

# Always populated:
anchor: <anchor_version>
```

MAIN collects N of these (one per dispatched batch) and synthesizes
cross-batch state for the operator at session end.
