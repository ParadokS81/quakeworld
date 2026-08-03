# Cross-card consistency pass

The cross-card pass runs AFTER all sub-agents complete and BEFORE files
are written -- only on batches that don't halt at the novelty gate. It
catches inconsistencies that per-card sub-agents cannot see (sub-agents
are isolated; they can't read each other's drafts).

Pattern: 5-12 checks per batch. The exact number depends on category
density (8-card batches surface fewer cross-card concerns than 34-card
batches).

## Categories of check

### Shared misintuitions

Multiple cards mis-describing the same mechanism. Prior batches surfaced:

- Voting batch F1 (swapall admin-veto Effect): draft said "vote then
  clears without executing the swap"; source showed the team-swap loop
  IS inside the veto branch. Multiple cards in the same admin-veto
  family could share the misintuition.
- Spectator batch F1 (k_ann + k_sayteam_to_spec See-also): both cards
  described `silence` as a per-spectator mute; source shows it's a
  server-wide `k_spectalk` toggle. Two cards inherited the wrong See-also
  framing from the same upstream synthesis.

### Cross-card factual contradictions

Card A says one thing about mechanism X; card B says a different thing
about the same X. Prior batches surfaced:

- Server-config batch (c) -- `k_noframechecks` says "after 3 accumulated
  FPS warnings" (imprecise); `maxfps` says "the fourth warning in a
  session triggers a forced disconnect" (source-true). Same mechanism,
  two different wordings.

### See-also bidirectional checks

If card A references card B in See-also, does card B reference A back?
Bidirectionality isn't always required, but missing back-links are
worth flagging:

- Voting batch: `next_map` See-also includes `break` (shared handler),
  `forcebreak` (admin override), `k_vp_break`. Check that `break` and
  `k_vp_break` (in their own cards, drafted same batch) reference
  `next_map` back where the relationship is symmetric.

The mechanism map (`ktx-map-voting-mechanism-map.md`) carries a
See-also matrix for exactly this purpose -- consult it when the batch
covers entities the map covers.

### Shape-classification consistency

Sibling cards using inconsistent shape-tag formatting. Prior batches
surfaced:

- Voting batch F3: `hook_classic` / `hook_fast` / `hook_smooth` headers
  all use `"Shape 7b + fan-out modifier"`; `hook_crhook` alone used
  `"Shape 7b + Shape 1c, reference card"` (Shape 1c is for binary
  toggle commands, not vote commands). Misclassification + formatting
  inconsistency in the same card.

Standardize: shape-tag formatting matches across siblings; reference-card
markers (`[REFERENCE CARD]`) use the same notation per the per-card
skill's canonical-card pattern.

### Paired-relationship pair-integrity (amendment 2026-05-27)

When a card's shape classification names a paired relationship (Shape 1c
paired-toggle, Shape 7b paired vote-toggle, Shape 9a side-channel
cvar+command, Shape 11a/11b bitmask shared-container, any cross-half
"X+Y" composition), BOTH halves of the pair MUST have separate top-level
`##` cards. Folding the cvar half into the command's card body as
commentary (or vice versa) is a discipline violation.

Worked example -- the failure mode this rule catches:

- KTX Race batch (2026-05-27) classified `k_race_simultaneous` +
  `race_simultaneous` as Shape 1 + Shape 1c paired toggle. The batch's
  drafts file discussed `k_race_simultaneous` in detail (Effect, Default,
  FLAG findings, See-also) -- but only `race_simultaneous` (the command)
  got a top-level `## race_simultaneous` header. The cvar half's analysis
  was folded into the command card's body as commentary, no separate
  `## k_race_simultaneous` card emitted. Post-arc gap audit found this as
  one of two failure modes in the KTX dispatch arc.

**Check procedure**: walk every card's shape classification. For any
multi-entity shape composition (`Shape 1c`, `Shape 7b`, `Shape 9a`,
`Shape 11a`, `Shape 11b`, or any `Shape X + Shape Y` composition naming
a paired entity), confirm the paired entity has its OWN `## <name>`
header in this batch's drafts file (or has been drafted in a prior
batch -- check via grep across `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`).
If the pair-partner is in scope (`category_inferred` matches this batch)
but has no card here, surface as a CRITICAL finding -- the dispatcher
should re-dispatch the missing half rather than ship a half-pair batch.

If the pair-partner is OUT of scope for this batch (different category):
record it as a cross-batch follow-up; the next batch that covers that
category picks it up. Do NOT fold the out-of-scope half into the in-scope
card's body.

### Flag-prefix consistency

Cards with `drafted_with_flag` verdicts should include the same
`FLAG:` prefix in Notes. Prior batch (Voting F4): `k_vp_map` skipped
the `default-stored-0` FLAG annotation that all other non-`k_vp_suggestcolor`
k_vp_* cards carry. Content factually accurate but lacks the prefix --
apply-pass-author may miss the consistent treatment without it.

## Section template (append at end of drafts file)

```markdown
## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: <finding name -- short, descriptive>

**Verdict**: ACTIONABLE | CONFIRMED_CLEAN | OBSOLETED

**Cards involved**: <list of entity_names>

**Observation**: <1-3 sentences describing the inconsistency or shared
misintuition>

**Source evidence**: <file:line refs>

**Recommendation**: <what apply-pass-author should do -- e.g. "align both
cards' wording to maxfps phrasing", "drop the See-also reference in card A
since the relationship is one-way">

---

### F2: <finding name>
...
```

Use F1, F2, F3, ... numbering. ACTIONABLE findings need apply-pass action;
CONFIRMED_CLEAN findings document that a suspected inconsistency was
verified and is actually fine; OBSOLETED findings document things resolved
during the cross-card pass itself (e.g. one draft re-drafted to fix
something).

## When the pass surfaces zero findings

Possible. Smaller batches (5-10 cards) with strong per-card discipline
often pass cleanly. In that case, still emit the section with a single
note:

```markdown
## Cross-card consistency notes

Cross-card pass found no actionable inconsistencies across the N drafted
cards. <Optionally: 1-2 sentences naming what was checked, so future
batches see the precedent.>
```

This documents that the pass ran rather than implying it was skipped.

## Discipline: don't fabricate findings

The cross-card pass is for issues SURFACED BY READING the assembled drafts.
Don't manufacture findings to fill a quota. If a 30-card batch genuinely
has 3 cross-card concerns, write up 3. If a 10-card batch has 11, write
up 11. The 5-12 range is empirical from prior batches, not a target.

If you find something but can't verify it without re-grepping source: park
it as a follow-up note rather than asserting. Cross-card synthesis is a
read-across-drafts pass, not a re-verification pass -- per-card source
checks are the sub-agent's job.

## Bidirectional See-also: how to check efficiently

For each drafted card, the See-also list names peer entities. Build an
index: `{entity_name -> [peers referenced]}`. Then check: for each pair
(A, B) where A references B, is B also in this batch? If yes, does B
reference A? If no, that's a candidate F-entry.

Missing back-links aren't always errors -- some relationships are
genuinely asymmetric (a leaf references its family head; the head doesn't
need to enumerate every leaf). Use judgment per the per-card skill's
See-also discipline (cap at 4-5; order by relationship strength).
