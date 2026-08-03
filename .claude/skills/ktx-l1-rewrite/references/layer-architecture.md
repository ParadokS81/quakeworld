# Mod-codebase L1 documentation architecture (two-layer model)

L1 documentation in a mod codebase is **two orthogonal layers**:

- **Layer A -- Universal card shape** (structural, codebase-agnostic). Full
  spec in `universal-shape-v2.md`. Sections: Headliner / Effect /
  Prerequisites / Permission / Match-state / Default / Example / See-also.
  Every card has these sections; some collapse for trivial entities.
- **Layer B -- Relationship shapes** (semantic, per-codebase). Full spec in
  `shape-catalog.md`. Each codebase has its own catalog of recurring
  entity-relationship patterns; each shape tells the drafter WHICH Layer A
  sections are populated and HOW.

Locked 2026-05-23 during KTX L1 catalog visual review session 2. Replicable
to MVDSV, QWFWD, QTV, and any future server-mod codebase loaded into the QW
Oracle.

## Workflow for drafting (or recasting) a card

1. **Recognize the entity's relationship shape** (Shape 1c? Shape 4? New
   shape? -> park as trigger 1 / 4). See `shape-catalog.md`.
2. **Apply the Layer A skeleton** (Headliner / Effect / Prerequisites / etc).
   See `universal-shape-v2.md`.
3. **The shape tells you what each section contains** (where the value enum
   lives, which entities go in See-also, what relationship-tags apply).
4. **Collapse sections that don't apply** (atomic cvars don't need Effect;
   commands don't need Default; orphans don't need See-also).
5. **If no shape fits cleanly** -- park the entity (trigger 1 in
   `park-triggers.md`).

## L1 vs L3 division of labor

**L1 = source-verifiable graph node.**

- Facts that can be proven from source code at a specific commit.
- One entity per card, factual within scope.
- Edges to other entities are explicit (Prerequisites = incoming, Effect
  mentions + See-also = outgoing/peer).
- No lived-experience content (no "people usually use this for X", no
  community history).

**L3 = subgraph with lived-experience narrative.**

- Patterns / stories / strategies that span multiple L1 entities.
- Cross-domain choreography (multi-setting, multi-engine, scripting recipes).
- Community context not derivable from source (mode is solo-vs-bots, RA is
  competitive, ...).
- Each concept note lists its L1 entities in frontmatter -> wiki-jump
  navigation works.

Rule of thumb: **include in L1 only what changes the user's action plan**.
Defer mechanism, strategy, and community-context to the concept note.

## L1 is a graph node; edges encode the relationships

Three edge types built into the Layer A shape:

- **Prerequisites** = incoming edges (what this entity needs to exist /
  be-set)
- **Effect** = outgoing edges (what this entity changes; cvar/command names
  in the Effect block are themselves implicit references)
- **See also** = peer edges (siblings, paired toggles, mutually-exclusive,
  gated-by)

L3 concept notes represent **subgraphs with narrative** -- a story arc that
pulls together several L1 nodes.

For consumer navigation (MCP / website / wiki):

- Prose stays inline-parenthetical: `See also: tot (preset that bundles
  this), k_tot_mode (state cvar this toggles)`. Best for human readers.
- DB carries a structured `related_entities` JSONB field with relationship
  tags (apply-time work, not description-shape work; the skill does NOT
  populate this -- the apply-pass does). Best for machine consumers (LLM
  graph traversal, wiki-link generation).

Standard relationship tags (for the structured field, sibling to the prose
See-also):

- `pair` -- paired toggle / cvar combo (Shape 1/1c/1d)
- `sibling` -- same family (mode presets, k_lock_* family, etc.)
- `exclusive` -- mutually exclusive (TOT vs midair vs instagib)
- `prereq` -- required before this fires (1on1 -> arena)
- `gates` -- controls availability of N other things (k_allowed_free_modes)
- `concept` -- covered by an L3 concept note

## See-also discipline (cognitive-load management)

In a mod codebase, every entity has dense cross-references. To keep See-also
from ballooning:

1. **Don't repeat what's already in Effect or Prerequisites.** If `dmm4` is
   named in Prerequisites, don't also put it in See-also.
2. **Cap at the 4-5 most load-bearing peers.** If you have more, the entity
   is begging for an L3 concept note -- write the note (NOT in this skill),
   let See-also point at it.
3. **Order by relationship strength**: pair > prereq > sibling > exclusive >
   concept. Reader scans top-down.

If See-also exceeds 5 links on a non-mode-preset card, that's a signal the
entity is begging for a concept note. The skill flags this in Notes but does
not author the concept note.

## Forward-reference convention (concept notes that don't yet exist)

**Do NOT** insert placeholders like `[qw-game-modes -- pending]` into L1
prose. Two failure modes:

- Forget to write the note -> pointer stays as a perpetual TODO in
  production data.
- Write the note but forget to update the L1 cards that point to it.

**Instead**: the operator tracks planned concept notes in the findings file
under "Follow-up work surfaced". The skill adds See-also pointers to L1 only
when the concept note actually exists.

## Why this architecture is replicable

The Layer A universal shape is codebase-agnostic. The four user questions
("What is this? / What does it do? / Why isn't it working? / Can I use
it?") apply to any mod entity. The shape maps cleanly to them.

The Layer B shape catalog is per-codebase because each codebase has its own
relationship patterns. KTX has cvar+toggle pairs because that's the KTX
idiom (`cvar_toggle_msg` helper). MVDSV likely has different idioms
(admin-restricted commands, console-only cvars). QWFWD / QTV will have
their own.

The architecture stays constant; the shape catalog grows per-codebase. This
skill is the KTX implementation; future MVDSV/QWFWD/QTV variants fork the
skill (not parameterize it).

## Concept-note authoring economics (operator-side, not skill-side)

The L1 substrate makes concept notes **cheaper to author, not trivial**.
The L1 work eliminates the fact-verification cost. The remaining
concept-note authoring is:

- Picking the narrative arc (what story does this group of entities tell?)
- Adding lived-experience content (community usage, common pitfalls)
- Choosing what to emphasize vs defer
- Picking spanning examples that tie cards together

That's authorship, not transcription. With L1 done, concept-note authoring
becomes a 30-minute job per note, not a 3-hour one. The skill enables this
downstream economy but does not perform it.
