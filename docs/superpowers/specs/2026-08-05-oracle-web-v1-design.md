---
date: 2026-08-05
type: design-spec
arc-slug: oracle-web-v1
status: Pass 1 IN PROGRESS (D1 locked; coverage-map home open). Pass plan locked 2026-08-05.
parent: docs/superpowers/parking/2026-08-04-oracle-web-direction.md (Arc B section)
related:
  - docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md (ancestor content design; Section 5.3 "Corpus state" is the closest relative; playground/contributor/admin sections stay deferred per the parking doc)
  - docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md (stack locks + note-first + design-exploration path)
  - docs/superpowers/specs/2026-06-09-docs-quake-world-design.md (docs-web sibling; front-page coverage-map carry-forward coordinates here)
---

# oracle.quake.world v1 -- design spec (visualize the brain, read-only)

Design conversation running 2026-08-05 in-session (arc-design). Locked decisions
land here as D-entries; amendments are dated blocks, never silent edits.

## Pass plan (locked 2026-08-05)

1. **Product frame & audience** -- v1's job, audience, tester-invite + docs-web
   relationships, success shape. (IN PROGRESS)
2. **Content & IA** -- what earns a place: L1 coverage map, L2 corpus view
   (aggregate vs browsable; consent posture), L3 notes/profiles, layer-flow
   explainer transfer-or-wait; page/section structure.
3. **Data & build shape** -- how the site gets numbers (snapshot-pipeline
   extension vs new export; static-at-build vs live; rebuild cadence vs harvest
   ritual), scaffold confirmation (SolidJS+Vite, daisyUI tokens,
   `apps/oracle-web` pnpm subtree, CF Pages, dumb components).

## Decisions

### D1 -- v1's primary job: the tester-invite companion (locked 2026-08-05)

**Decision:** v1 shows **what the oracle is, what it knows, and how to use it
today.** It is the page linked in the QW dev Discord the day the MCP opens to
testers: understand the brain, then connect your agent to it.

**Why:** the tester invite is the next real product event (technical bar met
2026-08-04; timing = operator call). Anchoring v1 to it gives the site a launch
moment, a concrete audience (~60 dev-server members), and a first-sentence job.
Operator self-visibility (the old showcase spec's third leg) falls out of the
same coverage data for free; public-web presence comes along passively.

**Implications:**
- v1 gains a **"connect your agent" quickstart** section: the MCP endpoint, a
  copy-paste client config snippet, what to expect (and what to do when the
  oracle doesn't know -- redirect_to_human exists). Not in the parking doc's
  original sketch; demanded by the frame.
- v1 stays READ-ONLY (parking-doc lock): no auth, no tickets, no playground --
  no LLM funding question.
- Success shape: a tester lands, understands the three layers in under a
  minute, sees live coverage numbers, and leaves with a working MCP connection.

### Design direction -- the growing brain (recorded 2026-08-05; layout NOT locked)

Operator's vision: a brain with tentacles out to small **datacenters**, one per
layer/data category, each drillable to reveal what it holds; regions of the
brain light up as the corpus grows -- the feeling to inspire is *a growing
brain*. Status of this record:

- The brain IS the coverage map ("what does the oracle know") rendered with
  soul -- it is v1's hero content, not decoration.
- **IA is designed brain-first with graceful degradation:** every datacenter
  node is backed by drillable data that can equally render as plain
  cards/tables. If the full interactive brain outgrows v1's build, v1 ships a
  simpler hero over the identical content model and the brain lands later as an
  upgrade, not a rewrite.
- The visual exploration itself is a build-time design job (claude.ai/design /
  design-skill pass -- the federation doc's endorsed path; dumb-component
  discipline keeps it portable to infiniti's platform).

## Open questions

- **Pass 1:** coverage-map home -- docs-web's front-page brainstorm
  (HANDOVER carry-forward) wants an oracle coverage map too; one map needs one
  home. (Posed 2026-08-05, recommendation pending operator.)
- **Pass 2:** all (content inventory, L2 presentation + consent posture, layer
  explainer transfer, naming/tagline).
- **Pass 3:** all (export contract, static vs live, cadence, scaffold).
