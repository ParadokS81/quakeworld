# Pre-flight gate

Four checks. Abort the batch on any failure -- the cost of running the batch
against drifted state or without the per-card discipline is corrupted L1
output. Abort returns a structured report; operator decides advance vs wait
vs investigate.

## Check 1: Anchor verified

Run:

```
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Compare against the `anchor_version` arg. If they differ:

- Abort the batch.
- Return: `{halt: anchor_drift, expected: <anchor_version>, actual: <git_describe_output>}`.
- Operator decides whether to advance the anchor across all in-flight
  batches OR roll back the KTX repo to the declared anchor OR park this
  batch until alignment is possible.

Drift is rare but consequential. A batch shipped against the wrong anchor
ships factual claims tied to source lines that may not be current. The
anchor IS the contract.

## Check 2: Per-card skill loaded

Cold-load every file the per-card sub-agents will rely on:

- `~/.claude/skills/ktx-l1-rewrite/SKILL.md`
- `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md`
- `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md`
- `~/.claude/skills/ktx-l1-rewrite/references/layer-architecture.md`
- `~/.claude/skills/ktx-l1-rewrite/references/entity-categories.md`
- `~/.claude/skills/ktx-l1-rewrite/references/worked-examples.md`
- `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`

Why the dispatcher needs them despite sub-agents loading them too:

- **Shape catalog**: novelty detection at Step 4 + cross-card consistency
  (Step 5) need the catalog to recognize what's novel and what's standard.
- **Park triggers**: discriminating trigger 1/4 (halt) from trigger 2/3
  (don't halt) requires the trigger taxonomy.
- **Universal shape v2 + layer-architecture**: cross-card consistency
  references See-also discipline, MVI rules, action-level discipline.
- **Worked examples**: comparing the batch's drafts against shape
  exemplars during cross-card synthesis.

If any reference fails to load: abort. The skill is non-functional with a
partial reference stack.

## Check 3: Cross-batch precedent loaded

Glob `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`. Skim (not
full read) each one:

- Headers + the `## Cross-card consistency notes` section if present.
- For any entity in THIS batch that has a sibling cross-link in a prior
  batch, note the prior cross-link target so the new draft picks the
  same See-also wording.
- Shape classifications already used: stays consistent across batches
  (e.g. always "Shape 7b" not "Shape 7b vote-cast" sometimes).

Why this isn't full read: 100+ drafted cards by ship time. Skim is for
shape continuity, not per-card review. The apply-pass-author does
per-card review when applying drafts to L1.

If no prior drafts files exist (first batch): skip this check. The first
batch sets the precedent.

## Check 4: Mechanism maps loaded

Glob `apps/qw-oracle/docs/reviews/ktx-*-mechanism-map.md`. For each, check
the entity inventory section -- if any entity in THIS batch's category
appears in the map, the map is source-truth for that entity's framing,
See-also matrix, and shape classification.

Example: `ktx-map-voting-mechanism-map.md` covers `votemap`, `mapslist_dl`,
`k_lockmap`, `lockmap`, `break`, `forcebreak` -- if your batch includes
any of these, lift framing from the map rather than from the existing L1
description. The map was authored expressly to anchor cross-batch
framing.

If no mechanism maps cover this batch: skip the check, treat existing L1
descriptions as the recast input (with the per-card skill's source spot-
check catching localized drift).

## Pre-flight report (returned on abort)

```
preflight_abort: {
  reason: <anchor_drift | reference_load_fail | mcp_unreachable | ...>,
  details: <one-line summary>,
  recommendation: <what operator should do next>
}
```

The dispatcher does NOT proceed past pre-flight failure. No sub-agents
dispatched, no files written, no commit.
