---
date: 2026-08-05
type: design-spec
arc-slug: oracle-web-v1
status: DESIGN COMPLETE 2026-08-05 -- all three passes closed (D1-D7); remaining unknowns are implementation-shaped -> arc-plan picks up from this spec + the parking doc.
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

### D5 -- launch registry: 4 lit + 2 dim (locked 2026-08-05)

**Lit:** Engine Facts (11,081 entities / 7 codebases) · Community Memory
(741K messages, thread corpus) · Curated Synthesis (45 notes + honest gap
list) · Game Content (254 maps + gameplay catalog). **Dim/dormant, rendered
as inspiration-of-where-this-grows, not promises:** Community History
(clans / players / official tournament results / LANs) · Match Stats
(qw-stats' 18K+ games + hub data; hook-in shape unknown).

**Profile-rows correction (operator quality ruling):** the 920 profile rows
in `curated/` are old-wiki farm output -- the corpus whose content+quality
gaps prompted the operator's own wiki -- and have no serving surface (MCP
profile tools were severed to the community-reference arc, never shipped).
They stay backstage as possible seed-stock; Community History renders DIM
and waits on real community-platform data (vikpe). Reinforces the
federation community-data divide from the wiki side: the wiki holds only
what a wiki should hold; structured profiles/results belong in a proper
database that can visualize them.

### D6 -- page inventory: single page, drill panels, three strips (locked 2026-08-05)

Single page; zoom never navigates away -- datacenter/region views open in
place, URL fragment makes any view shareable (`/#community-memory` in a
Discord paste lands zoomed in). Around the brain, three strips: (1) light
explainer -- the librarian one-liner + ONE static worked trace (real question
annotated through its actual tool hops to a cited answer); old showcase
spec's consumer-landscape diagram + animated ping-pong stay deferred;
(2) connect-your-agent quickstart (D1) -- endpoint, copy-paste config, first
three questions; every level-4 "ask your agent" door deep-links here;
(3) footer doors to sibling surfaces (docs.quake.world, wiki; exact list at
drafting). Guard: NO contributor sections, NO admin/corpus-state detail, NO
auth, NO forms -- all deferred per the parking doc.

### Naming disposition (recorded 2026-08-05)

Working name: **QW Oracle** (settled by use). Hero copy = growing-brain
feeling + functional sub-line ("see what it knows, then plug in your agent"
register). Final wording is the design pass's job, not a spec lock.

### D7 -- manifest served from the reserved snapshots URL; site deploys only for code (locked 2026-08-05)

**The site is fully static** (CF Pages) and redeploys only when code changes.
At pageload it fetches `brain-manifest.json` from
`https://oracle.slipgate.me/snapshots/` -- the nginx location reserved since
Arc 1 for exactly this consumer class ("the public URL stays stable across
arcs"), Cache-Control max-age=300. The bundle bakes a build-time fallback
copy so an unreachable oracle degrades to slightly-stale numbers, never an
error. **Updating the brain = emit manifest + copy the file into
`/mnt/user/appdata/qw-oracle/snapshots/`** (rw-mounted on the cockpit) as the
harvest ritual's final step -- visible worldwide within the 5-minute cache,
no deploy touched. The manifest carries the D3 zoom-level data (counts +
named inventory + glow/state) plus a small history stub for growth trails;
level-4 artifacts never ride it.

Consequences: the brain manifest is the FIRST TENANT of the Arc-2
snapshot-distribution surface (slipgate delta-fetch joins later, same door).
One `Access-Control-Allow-Origin` line gets added to the snapshots nginx
block at build time. Rejected: Firestore/Firebase (operator floated,
un-married) -- second platform inside a Cloudflare-locked federation, SDK
weight in the bundle, real-time listener machinery for data that changes
monthly. Rejected: rebuild-site-per-update -- couples content freshness to
the code pipeline for no gain.

## Remaining for arc-plan (implementation-shaped; no operator decisions here)

- Manifest emitter home (extend `build-snapshot` vs small standalone script)
  + exact field shapes + history-stub mechanics.
- CORS line + reload on the snapshots nginx block; baked-fallback wiring.
- Scaffold per federation locks (SolidJS + Vite, daisyUI tokens,
  `apps/oracle-web` pnpm subtree, CF Pages, dumb presentation components for
  the infiniti port).
- Visual design job sequencing (claude.ai/design exploration; emitter-first
  ordering lets the design job work with REAL manifest data).
- Harvest-runbook rider: append emit+copy as the ritual's last step
  (coordinate with Arc A finish-out, which owns the runbook).

## Amendment -- visual design exploration outcome (2026-08-06)

The "visual design job" queued for arc-plan ran 2026-08-05/06 as an
interactive mockup loop (claude.ai artifact, version-labeled rounds 1
through 4.7; mockup-of-record committed at
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` -- a single
self-contained HTML file, open directly in a browser; ported to the SolidJS
scaffold at build time). Operator verdict: overall
design LOCKED (~90%; residual = content granularity + a dedicated mobile
pass). What this locks, amending D6's sketch:

- **One page, two floors, gentle scroll-snap** (`#brain` /
  `#machine-room`), one continuous navy->dark-teal gradient -- one
  organism: canopy above, roots below; the brainstem crosses the fold and
  fans into root-traces.
- **Floor 1 hero = neural-circuit brain.** Outside asymmetric title-only
  stations; traces penetrate to depth-scattered seats; scaffolding density
  log-scaled per category (share of ~150 dots via ln(1+count) -- CM .42 /
  EF .29 / GC .17 / CS .12). Progressive disclosure everywhere: numbers +
  subs reveal on chain hover (title + trace + seat are one hover/click
  target); drill cards on click; dormant = dashed ghosts. Output side:
  single gather point -> bare "MCP" gate -> two-way agent highway (cyan
  questions in / green answers out) -> YOUR AGENT; snapshot door visibly
  bypasses the gate to THIS PAGE ("you are here") + slipgate ghost; growth
  docks both sides. Ambient "tracepoint journeys": the standard trace pulse
  (one canonical speed, 400u per 5.5s) continues through the mesh --
  touched scaffold nodes flicker -- down the brainstem, into a floor-2
  root, landing on a rack with a flare.
- **Floor 2 = machine room as root system.** Six racks in floor-1 skin
  flanking a dominant full-height FIELD TERMINAL (no expand toggle -- the
  terminal owns the real estate); rack click loads concept-altitude
  subsystem copy; every topic doors OUT to the public GitHub repo (stable
  landmarks only: app README / extractors / load-chat / concept-notes).
  Terminal boot screen IS the connect quickstart.
- **"Why do I need this?"** hero link -> in-place comparison overlay (3-4
  questions, agent-alone vs agent+oracle). Integrity rule: the final page
  shows BOTH columns as verbatim captured answers, dated + model-labeled --
  no strawmen (the community will re-run the test). Supersedes D6's "one
  static worked trace".
- **Connect surface is singular**: hero CTA, YOUR AGENT node, and the MCP
  card all open one CONNECT card (endpoint + per-client steps + paste-able
  prompt for CLI agents). Client landscape verified 2026-08-06: Claude
  connectors (claude.ai / Desktop / Code), ChatGPT Developer Mode (paid
  plans; requires public HTTPS streamable-HTTP + OAuth-or-no-auth), CLI
  agents self-configure from a pasted prompt; consumer Gemini app and Grok
  lack custom connectors. Deploy consequence: the MCP auth posture at
  tester-invite time decides ChatGPT reach.
- **Copy locks**: tagline "30 years of QuakeWorld knowledge, routed to your
  agent or API."; no legends or annotation text at rest; "brain barrier"
  retired as user-facing copy (internal metaphor only).

New arc-plan items from the exploration: comparison capture session (clean
sessions, verbatim, dated); terminal topic copy (6-10 cards at
stable-concepts altitude, repo doors); dedicated mobile projection pass;
port of the mesh/journey/roots generators to SolidJS dumb components.

### Amendment addendum -- post-lock refinements (2026-08-06, rounds 4.5-4.7)

- **Naming locks**: datacenter display names shortened -- COMMUNITY MEMORY ->
  **DISCORD**, CURATED SYNTHESIS -> **CONCEPT NOTES** (operator ruling:
  concrete beats abstract; applies everywhere -- stations, drill cards,
  racks, terminal subsystem headers).
- **Station label pattern**: horizontal stations center the title above the
  outside node with revealed details wrapping beneath (Community Memory's
  long sub splits into two lines); vertical stations keep side-anchored
  labels. The MCP tool-reveal sits beside the gate, not floating below.
- **One-pulse rule**: journey travelers move at the canonical dash speed
  (400u per 5.5s) and render as the same dash glyph -- never a second
  visual species. Z-order keeps the stem animation above the HTML bridge
  div; the down-flow cue depends on it.
- **First portrait projection** (<=900px) ships in the mockup: tagline top
  full-width one row, CTAs bottom-center, three-station crown across the
  top (CONCEPT NOTES / COMMUNITY HISTORY / DISCORD with nodes under
  titles), outputs in the bottom-right quadrant, ~1.55x type, docks and
  tool-reveal dropped. Real-phone check passed; a Chrome
  device-mode-inside-artifact-panel scroll quirk remains unresolved
  (suspected host-frame drag capture, not page CSS -- retest on the real
  deploy before chasing further).
