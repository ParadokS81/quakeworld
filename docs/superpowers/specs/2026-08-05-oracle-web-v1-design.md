---
date: 2026-08-05
type: design-spec
arc-slug: oracle-web-v1
status: Pass 1 COMPLETE (D1 + D2). Pass 2 IN PROGRESS (D3 + D4 locked; launch-registry question posed). Pass plan locked 2026-08-05.
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

### D2 -- the coverage map lives on oracle.quake.world (locked 2026-08-05)

docs-web's front page links to it instead of duplicating it. Why: the map's
content is oracle-scoped (all layers, all codebases, incl. data docs-web never
renders); the brain hero needs the app framework (SolidJS), not VitePress; one
map = one staleness surface. Shrinks the parked docs-web front-page brainstorm
to "compact per-codebase entry strip + link to the brain" -- that carry-forward
can now wait for Arc B to ship.

### D3 -- zoom-stop rule: three levels owned, level four is always a door (locked 2026-08-05)

The brain owns three zoom levels everywhere: (1) datacenters, (2) regions
within one (codebases / channels / topic domains), (3) the inventory card --
counts + named highlights. The individual artifact is NEVER rendered
in-sandbox; level four is a door, differing by layer:

- **Engine facts -> docs.quake.world** ("browse all ezQuake cvars ->").
- **Synthesis + community memory -> the visitor's agent.** The MCP is the
  street view: cards end in the literal tool call (`get_concept_note(...)`,
  `search_solved_issues(...)`) and funnel into the connect-your-agent
  quickstart. Every deep-zoom dead-end reinforces D1's job.
- **Future doors stay honest**: "wiki (narrative -- coming)"; NO browsable
  thread archive in v1 -- that is support.quake.world's deferred read-half
  (needs the distillation/consent pipeline; building it here would un-defer
  the support decision through the back door).

Captured for the support-archive arc when its trigger fires: the operator's
"topic threads within topic domains" visualization instinct is that surface's
browse IA.

### D4 -- open datacenter registry, not a hardcoded L1/L2/L3 (locked 2026-08-05)

The brain renders a REGISTRY of datacenters; new regions attach without
redesign. Receipt: the registry already exceeds the three layers today -- 920
player/clan/tournament profiles live in `curated/` (community-reference arc)
and fit none of the trio; qw-stats holds 18K+ games; operator names community
history (tournaments/LANs) and match stats as future regions and anticipates
non-"L#" category kinds. UI names datacenters by CONTENT (Engine Facts /
Community Memory / Curated Synthesis / Game Content / Community History /
Match Stats / ...); layer numbers stay internal vocabulary. Federation
guardrail: vikpe-platform community data is queried, never duplicated -- a
datacenter may be a window onto another owner's surface.

Note (not a new arc): the operator's note->wiki lockstep idea IS the locked
federation architecture (2026-06-07 roadmap: note-first, wiki derived,
staleness flags flow downhill; flag machinery in the 2026-04-30 parking doc).
Execution stays the parked parallel track; v1's L3 door does not block on it.
Contributor onboarding is the agreed next sequence AFTER v1; v1 lays its
cheapest brick by showing synthesis gaps honestly (45 notes + the domains
with none yet).

## Open questions

- **Pass 2 (current):** the v1 launch registry -- which datacenters ship lit,
  which render as dim/dormant future regions, and where the 920 profiles live
  (inside Curated Synthesis vs seeding a partially-lit Community History).
  Posed 2026-08-05, recommendation with operator.
- **Pass 2 (queued):** per-datacenter inventory-card contents; layer-flow
  explainer transfer-or-wait; naming/tagline.
- **Pass 3:** all (export contract, static vs live, rebuild cadence vs harvest
  ritual, scaffold confirmation).
