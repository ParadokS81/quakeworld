# Halt-on-novelty gate

The dispatcher operationalizes the per-card skill's earn-their-keep
discipline at batch scale. The shape catalog grows only by operator
judgment, never by sub-agent inference. When a sub-agent surfaces a
candidate shape (trigger 1) or an irreducibly novel mechanism (trigger 4),
the dispatcher HALTS the batch and surfaces the candidate-shape signature
for operator review.

## Trigger taxonomy (4 triggers, only 2 halt)

Per the per-card skill's `references/park-triggers.md`:

| Trigger | Name | Fires at step | Halts batch? |
|---|---|---|---|
| 1 | no-shape-match (relational) | Per-card Step 2 | **YES** |
| 2 | conflicting-shape-match | Per-card Step 2 | No |
| 3 | source-vs-description-contradiction | Per-card Step 3 | No |
| 4 | sui-generis-mechanism | Per-card Step 4 | **YES** |

### Why triggers 1 + 4 halt

Both signal "the catalog may need a new Shape N." The operator owns that
decision (earn-their-keep: 2-3 instance evidence + load-bearing template
differentiation). The dispatcher cannot adjudicate from one card; even
proceeding with the rest of the batch can introduce inconsistency if the
candidate shape would have changed See-also wiring or value-enum placement
for sibling cards in the same batch.

Halting at the first trigger 1/4 also surfaces the novelty BEFORE downstream
work commits. A novelty halt produces zero shipped files -- the only output
is the structured halt report. Operator reviews, decides, and either:

- Extends the catalog (new Shape N added to `shape-catalog.md`), then
  re-runs the batch from clean.
- Accepts the park (1-of-1 stays parked; future batches surface siblings
  or not).
- Investigates further (the parked entity is sui-generis; the rest of the
  batch is unaffected; re-run with the parked entity skipped or hand-drafted).

### Why triggers 2 + 3 do NOT halt

Both are per-card concerns:

- **Trigger 2 (conflicting-shape-match)**: the entity has multiple
  candidate shapes and the sub-agent can't adjudicate. Operator decides
  composition vs primary; the rest of the batch is unaffected.
- **Trigger 3 (source-vs-description-contradiction)**: the existing L1
  description has a foundational framing error. The sub-agent parks the
  card so the operator can re-research; the rest of the batch is
  unaffected.

These produce per-card park entries in the batch's park file, just like
flag entries produce flagged drafts. The apply-pass handles them.

## Halt detection logic

After collecting all sub-agent reports (Step 3 done, before Step 5):

```
for each sub-agent report:
  if report.verdict == "parked":
    if report.trigger in [1, 4]:
      novelty_halt = {
        entity: report.entity_name,
        trigger: report.trigger,
        candidate_shape_signature: report.observed_source_signature,
        partial_state_summary: <verdict counts collected so far>
      }
      HALT BATCH
      return halt_report

# if loop completes without setting novelty_halt:
proceed to Step 5 (cross-card consistency)
```

The dispatcher halts on the FIRST trigger 1/4 it encounters in scan order.
If multiple sub-agents surface trigger 1/4, operator sees the first one;
re-running after operator decision will surface the next.

## Halt report shape

```
batch_date: <YYYY-MM-DD>
category: <category>
status: HALTED_ON_NOVELTY
novelty_halt: {
  entity: <entity_name>,
  trigger: <1 | 4>,
  candidate_shape_signature: <2-4 sentence prose describing the observed
    source pattern -- registration site, key read use-sites, why no
    cataloged shape matches>,
  rationale: <why the sub-agent decided this trigger applies>,
  source_refs: [<file:line>, ...]  # registration + key read sites
}
partial_state: {
  cards_processed: <N>,
  cards_drafted: <count>,
  cards_flagged: <count>,
  cards_parked: <count>  # includes the halt-causing card + any prior trigger 2/3 parks
  files_written: []  # none -- halt means no atomic file write happens
}
operator_decision_options: [
  "extend_catalog: add candidate Shape N to ktx-l1-rewrite/references/shape-catalog.md, re-run batch",
  "accept_park: leave entity parked as shape-less / sui-generis, re-run batch with this entity skipped",
  "investigate: hand-research the entity, decide later"
]
```

The halt report goes to MAIN's return shape. NO files are written (drafts
or park). The partial-state records stay in the dispatcher's context for
the operator to inspect if they want, but they don't persist past the
dispatcher's return.

## Why "no files on halt"

Two reasons:

1. **Atomic semantics**: a partial drafts file (with a 30-card batch
   halted at card 17) is more confusing than no file. The operator can't
   tell which cards are "ready to apply" vs "interrupted." Clean halt
   means clean re-run.
2. **No accidental commits**: if the dispatcher wrote partial files then
   halted, an operator running multiple parallel batches might commit
   the partial file by mistake when handling a sibling batch's commit.
   Empty halt = no commit collision risk.

The trade-off is per-card sub-agent work isn't persisted on halt. That's
acceptable -- each sub-agent's per-card budget is small, and the
trigger 1/4 case is the rare one. The common case (no novelty halt) ships
files normally.

## Discrimination notes (when in doubt)

- **Trigger 1 vs shape-less**: the per-card skill's Step 2 amendment is
  clear -- `shape-less` is valid when the entity has NO inter-entity
  relationship to tag (standalone state-printer, command-side lever, leaf
  of a family). Trigger 1 fires when the entity HAS relationships but no
  cataloged shape captures them. If the sub-agent reports `shape-less`,
  that's NOT a halt -- the card drafts normally.
- **Trigger 1 vs trigger 4**: trigger 1 = "shape vocabulary missing a
  pattern that exists with multiple potential siblings"; trigger 4 =
  "this mechanism is genuinely unique, no siblings exist." Sub-agent
  uses the more conservative call (trigger 4) when ambiguous.
- **Trigger 2 vs trigger 1**: trigger 2 = "multiple cataloged shapes
  match strongly, can't decide primary"; trigger 1 = "no cataloged shape
  matches at all." Different problems -- trigger 1 needs the catalog
  extended; trigger 2 needs the operator to adjudicate composition.
