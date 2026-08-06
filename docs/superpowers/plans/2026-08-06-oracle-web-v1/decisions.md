# oracle-web-v1 -- cross-cutting decisions ledger

Commitments that bind more than one phase. Sourced from the design spec
(`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md`, D1-D7 + the
2026-08-06 amendments) and the planning session 2026-08-06. Amendments are
dated blocks under the original entry, never silent edits. Implementation
briefs cite entries by number.

## P1 -- The mockup-of-record is the comp

**Decision:** `docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html`
(v4.7) is the visual contract. The port reproduces it faithfully -- layout,
motion, interaction, copy -- it does not redesign. Where SolidJS idiom forces
a structural change, behavior and appearance still match the mockup.
**Why:** operator ratified the design at ~90% after rounds 1-4.7; the
residual 10% is content granularity + the dedicated mobile pass, not layout.
**Implication:** any visible deviation is a finding or a dated amendment,
never a silent drafter/implementer choice. Phase verification includes
side-by-side against the mockup opened from disk.

## P2 -- brain-manifest.json is the arc's one data contract

**Decision:** Phase 1 locks the manifest field shapes; the emitter, the
site's fetch path, and the baked fallback all conform to that one contract.
The mockup's inline `DC` data block (labeled "brain-manifest.json,
2026-08-05") is the shape seed; the live DB is the number truth (mockup
numbers are a 2026-08-05 snapshot, already drifted -- e.g. concept-note
count).
**Why:** spec D7; single contract = single staleness surface.
**Implication:** phases 2-6 never invent fields; a needed-but-missing field
is a finding routed back to the Phase 1 contract with a dated amendment.

## P3 -- Fully static site; data arrives by runtime manifest fetch (spec D7)

**Decision:** CF Pages static bundle; at pageload the site fetches
`https://oracle.slipgate.me/snapshots/brain-manifest.json` (Cache-Control
max-age=300); a build-time fallback copy is baked into the bundle so an
unreachable oracle degrades to slightly-stale numbers, never an error. Site
redeploys only for code changes; data updates = overwrite the file in
`/mnt/user/appdata/qw-oracle/snapshots/` (rw-mounted on the cockpit).
**Why:** spec D7 (rejected: Firebase, rebuild-per-update).
**Implication:** the manifest fetch is the site's ONLY network call. No
other runtime data dependencies may be introduced in any phase.

## P4 -- Stack locks (federation)

**Decision:** SolidJS + Vite, Tailwind v4 + daisyUI tokens, own
pnpm-workspace subtree at `apps/oracle-web`, deployed to CF Pages. All
rendering components are DUMB presentation components: data in via props,
generators (mesh / journeys / roots) as pure functions over manifest data +
seed, no fetching inside components.
**Why:** federation roadmap locks (2026-06-07, infiniti confirmation
`da3ec6d1`); dumb-component discipline keeps the work portable to vikpe's
platform.
**Implication:** the fetch/fallback logic lives in one thin shell; every
phase's components stay portable. Deviation = amendment here.

## P5 -- Read-only, no backends, no writes

**Decision:** no auth, no forms, no tickets, no playground, no analytics
backends. The site calls exactly one endpoint (P3's manifest URL) and links
out (docs.quake.world, GitHub repo doors, wiki placeholder).
**Why:** parking-doc lock; sidesteps the no-API-key playground problem.
**Implication:** any phase proposing a second network call or a write
surface is out of scope by construction.

## P6 -- The why-comparison overlay ships dark-until-fed

**Decision:** the "Why do I need this?" overlay is BUILT (structure,
styling, open/close) but its hero door stays hidden in production until the
oracle-eval-simulation arc delivers real captures (verbatim, dated,
model-labeled -- integrity rule stands unchanged). Captures land as a
content drop, no redesign.
**Why:** spec amendment 2026-08-06 (capture re-homed to the eval arc); the
integrity rule forbids placeholder answers.
**Implication:** phases verify the overlay works via a dev flag, and verify
the door is ABSENT from the shipped page at rest.

## P7 -- Animation rules: one-pulse, stem z-order, reduced-motion

**Decision:** (a) one-pulse rule -- journey travelers move at the canonical
dash speed (400u per 5.5s) and render as the same dash glyph, never a second
visual species; (b) the brainstem animation renders ABOVE the HTML bridge
div (the down-flow cue depends on this z-order); (c) `prefers-reduced-motion`
disables ambient journeys/pulses everywhere, matching the mockup's `reduced`
guard.
**Why:** spec addendum 2026-08-06 (rounds 4.5-4.7 locks); mockup implements
all three.
**Implication:** binds phases 3, 4, 5; the mobile pass may drop elements but
never introduces a new motion species.

## P8 -- Naming + copy locks

**Decision:** datacenter display names: ENGINE FACTS / DISCORD / CONCEPT
NOTES / GAME CONTENT / COMMUNITY HISTORY / MATCH STATS (DISCORD and CONCEPT
NOTES are the locked renames -- concrete beats abstract -- applied
everywhere: stations, drill cards, racks, terminal headers). Tagline: "30
years of QuakeWorld knowledge, routed to your agent or API." No legends or
annotation text at rest. "Brain barrier" never appears in user-facing copy.
Station label patterns per the addendum (horizontal stations: centered
title, details wrap beneath; vertical stations: side-anchored).
**Why:** spec amendment + addendum 2026-08-06.
**Implication:** copy-bearing tasks in phases 3, 4, 6 cite this entry;
layer-number vocabulary (L1/L2/L3) stays internal, never user-facing.

## P9 -- Zoom-stop + doors (spec D3/D4)

**Decision:** the site owns three zoom levels (datacenters -> regions ->
inventory card); level four is always a door out: Engine Facts ->
docs.quake.world; synthesis + community memory -> the visitor's agent
(literal MCP tool-call rendering, funneling to the connect card); machine-room
topics -> the public GitHub repo at stable landmarks only (app README /
extractors / load-chat / concept-notes). Dormant datacenters render as
dashed ghosts with teaser copy, never promises. NO browsable thread archive.
The connect surface is SINGULAR: hero CTA, YOUR AGENT node, and MCP card all
open the one CONNECT card.
**Why:** spec D3, D4, amendment (singular connect card + verified client
landscape).
**Implication:** binds phases 3, 4, 6; no phase adds an in-site artifact
browser or a second connect surface.

## P10 -- Lane and concurrent-arc coordination

**Decision:** this arc holds the MAIN checkout
(`/home/dev/projects/quakeworld`, branch `main`). The parallel
oracle-eval-simulation arc holds worktree `/home/dev/projects/quakeworld-eval`
(branch `eval-oracle-sim`). Arc A (L2 finish-out) touches
`apps/qw-oracle/scripts/load-chat/` + the harvest runbook; this arc's only
contact with that surface is the Phase 1 runbook-rider handoff (one appended
step naming the emitter invocation). `apps/oracle-web` is a new subtree no
other arc touches.
**Why:** planning session 2026-08-06, lane-claim rule; operator ratified.
**Implication:** merge order with the eval branch is not a concern (disjoint
files by construction); if that changes, surface to the operator.

## P11 -- Deploy target: CF Pages on the operator's personal account

**Decision:** the arc ends at a live CF Pages preview URL (the docs-web
pattern, procedure seeded from `apps/docs-web/DEPLOYMENT.md`). Going public
(Discord link, vikpe DNS ask for `oracle.quake.world`) is the operator's
tester-invite timing call, outside this arc.
**Why:** planning session 2026-08-06; parking doc (interim URL = CF Pages).
**Implication:** Phase 2 establishes the deploy pipeline (Hello Production);
every later phase's boundary verification runs against the real URL. The
portrait scroll-quirk retest (spec addendum) happens on this URL in Phase 5.
