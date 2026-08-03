# Park triggers and file format

This skill MUST park entities it cannot confidently classify. Parking is the
operational counterpart of the catalog's earn-their-keep discipline (see
`shape-catalog.md`): the catalog says "don't lock new shapes on 1-of-1
evidence"; parking says "when the skill encounters 1-of-1 ambiguity, surface
it, don't guess."

The cost of parking is one entry in the per-batch park file. The cost of a
force-fitted L1 description is a shipped lie. The skill's job includes
refusing to guess.

## The 4 park triggers

### Trigger 1: no-shape-match

Fires at Step 2 (shape classification) when NO shape from the catalog
matches cleanly using the identification guide.

**Example:** an entity whose source signature doesn't match any of the 14+
shape patterns -- no `cvar_toggle_msg`, no `cvar_fset` cycle, no command-arg
side-channel, no per-player vote flag, no `G_sprint` curated menu, etc. The
entity simply has a mechanism that doesn't match the catalog.

**What goes in the park entry:**
- The shape candidates considered + why each was ruled out.
- The source signature observed (registration site + read use-sites + any
  unusual patterns).
- Suggested manual investigation: "if a future walk surfaces a sibling, this
  may crystallize a new shape."

### Trigger 2: conflicting-shape-match

Fires at Step 2 when MULTIPLE shapes match with strong evidence in
conflicting ways -- the skill cannot adjudicate which is the primary
classification.

**Example:** an entity that has both a `cvar_toggle_msg` site (Shape 1
signal) AND a `cvar_fset` cycle pattern (Shape 2 signal) AND looks like
neither is a clean composition. Or an entity where Shape 6 (stateful +
one-shot pair) AND Shape 8 (subcommand of parent-dispatcher) both
plausibly apply and the source is ambiguous.

Shapes are facets, not exclusive buckets -- so composition is expected
(Shape 7 + Shape 4 + Shape 1c is common, see `shape-catalog.md`). The skill
should NOT trigger 2 just because multiple shapes apply (that's normal).
Trigger 2 fires when the composition itself is unclear, not when there's a
multi-facet entity.

**What goes in the park entry:**
- The 2+ shapes that match + the evidence for each.
- Why they conflict (e.g. "the entity has signals of both X and Y; cannot
  determine which is primary because Z").
- Suggested manual investigation: "operator decides composition vs primary
  classification; may require deep read of consumer code paths."

### Trigger 3: source-vs-description-contradiction (foundational)

Fires at Step 3 (spot-check) when the existing description has a
FOUNDATIONAL contradiction with source that the skill cannot adjudicate --
the framing of the entity itself is wrong, not a single value.

**Example:** an entity described as a vote-toggle but source treats it as a
recipient-state setter; an entity described as a one-shot command but source
shows it sets persistent userinfo state; an entity described as having no
side effects but source shows it modifies global state. The
mmode-`multi`-"editor" framing error from session 2 was close to this
class -- "multi opens an editor" was a factually-wrong framing rooted in a
misunderstanding of the mechanism.

**Distinguished from `drafted_with_flag`:** localized contradictions (wrong
default, missing prerequisite, outdated permission) get `drafted_with_flag`
-- the recast proceeds and the flag tells the apply-pass-author to review.
Foundational contradictions (the entity is fundamentally being described as
something it isn't) get PARKED -- the skill can't safely recast something
whose existing framing is wrong.

**What goes in the park entry:**
- The contradiction observed (existing description claim vs source
  evidence).
- Why it's foundational (entity framing wrong, not value-level).
- Suggested manual investigation: "operator needs to re-research the
  entity's actual purpose before a recast is possible."

### Trigger 4: sui-generis-mechanism

Fires at Step 4 (final park gate) when an entity has a CLEARLY unusual
mechanism that doesn't pattern-match anything in the catalog -- even if a
shape sort-of fits.

The canonical example is `callalias` (session 3): server-side per-player
timer + client-side dispatch via `stuffcmd`. No analog elsewhere in KTX --
other per-player `*_time` fields are for internal display state (not
command-installed deferred dispatch); other `stuffcmd_flags` calls are
demo-only metadata markers. The mechanism is genuinely unique.

The catalog's earn-their-keep discipline forbids the skill from creating
new shapes on 1-of-1 evidence. The skill cannot escalate; it parks. If a
sibling surfaces in a later walk, the operator extends the catalog.

**Distinguished from trigger 1:** trigger 1 fires when shape classification
genuinely doesn't match anything (e.g. signature unfamiliar). Trigger 4
fires when shape classification COULD match something cosmetically but the
underlying mechanism is clearly novel. Sometimes the distinction is
ambiguous; if so, park under trigger 4 (the more conservative call) and
note both candidates.

**What goes in the park entry:**
- The mechanism observed (concrete source signature).
- The siblings searched + why each was ruled out (the sibling-search trail
  is what makes "sui generis" defensible vs an unjustified force-fit).
- Suggested manual investigation: "operator may still draft this card by
  hand. If a future codebase walk (MVDSV / unezQuake / KTX additions)
  surfaces a sibling, the operator can crystallize a new shape."

## Park vs flag (different review queues)

| Aspect | Parked (verdict `parked`) | Drafted with flag (verdict `drafted_with_flag`) |
|---|---|---|
| File | `ktx-l1-rewrite-parked-<batch>.md` | `ktx-l1-rewrite-drafts-<batch>.md` |
| Recast proceeds? | No -- skill stops before Step 5. | Yes -- skill writes a full v2 recast in Notes-flagged form. |
| Apply path | Blocked. Operator decides manual path. | Apply-pass-author reviews the flagged factual change, then applies (or hand-edits). |
| Triggers | Trigger 1/2/3/4 (above). | Localized factual contradiction at Step 3: wrong default value, missing prerequisite, outdated permission, etc. |
| Review effort | High -- operator investigates manually. | Low -- operator reviews one specific factual claim. |
| Pile size matters | Yes -- park pile = empirical data on framework gaps. | Yes -- flag pile = factual-fix queue. |

The two queues should not get confused. Parking is "the skill can't safely
recast"; flagging is "the skill recast it correctly, but the existing
description had a localized factual error worth surfacing."

## Park file entry format

Per parked entity, append a section to
`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-<batch_date>.md` (relative
to the quakeworld repo root):

```
## <entity_name> (KTX <entity_type>, <category>)

- **Source**: <source_file:source_line>
- **Anchor**: <anchor_version>
- **Park trigger**: <1 / 2 / 3 / 4> <trigger name>

### What the skill saw

- <observation bullet 1>
- <observation bullet 2>
- ...

### Suggested manual investigation

- <next-step bullet 1>
- <next-step bullet 2>
- ...
```

If the park file does not exist yet for this batch_date, create it with this
header before appending the first section:

```
# ktx-l1-rewrite parked entities -- batch <YYYY-MM-DD>

Entities the skill could not confidently recast. Each entry names the park
trigger and the source signature observed. Operator reviews at end of batch.
```

## Drafts file entry format

Per drafted entity (verdict `drafted` or `drafted_with_flag`), append a
section to `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md`:

```
## <entity_name> (KTX <entity_type>, <category> -- <shape>)

- **Status**: drafted | drafted_with_flag
- **Source**: <source_file:source_line>
- **Catalog line**: <catalog_line>
- **Anchor**: <anchor_version>

### Current description

> <existing_description, verbatim>

### Shape classification

<shape ID + composition if applicable, e.g. "Shape 7a election + Shape 4 admin gate">
<reasoning trail: 1-3 sentences on why this shape>

### Proposed draft

\`\`\`
<v2 recast text -- Headliner + Effect + Prerequisites + Permission + Match-state + Default + Example + See also>
\`\`\`

### Notes

- <factual contradiction flags called out explicitly, prefixed with "FLAG:">
- <reasoning for borderline calls>
- <any operator-facing context the apply-pass-author needs>
```

If the drafts file does not exist yet for this batch_date, create it with
this header before appending the first section:

```
# ktx-l1-rewrite drafts -- batch <YYYY-MM-DD>

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill. Apply-pass-author
reviews each card, applies clean drafts, hand-edits flagged-drafts after
verifying the surfaced contradiction. Drafts do NOT auto-apply to L1
(`entities.description`); the apply pass is a separate phase.
```

## Why park-when-ambiguous matters (the operator-side payoff)

- **Skill makes confident progress on the easy ~90% of cards.** The recast
  path is the high-throughput path; parking just diverts the 10% of cards
  the skill can't safely handle.
- **Hard cases stick out.** Operator doesn't have to audit every drafted
  card looking for bad classifications; they go directly to the park pile.
- **Parked pile = empirical data.** Each parked entity is a data point on
  where the framework has gaps. Sibling-rich patterns earn a new Shape N in
  the catalog (operator's call, per earn-their-keep); 1-of-1s stay
  shape-less in v2.
- **Pairs with earn-their-keep.** Catalog says "don't lock new shapes on
  1-of-1 evidence"; parking says "skill operationalizes that by refusing to
  guess." Together they prevent both shape proliferation (in the catalog)
  and force-fits (in the descriptions).
