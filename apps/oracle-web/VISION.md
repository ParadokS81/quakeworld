# QW Oracle Web -- vision

Why `oracle.quake.world` exists, who it is for, and what it is deliberately
not. This file condenses two documents in the monorepo root, which hold the
reasoning in full: the direction doc
`docs/superpowers/parking/2026-08-04-oracle-web-direction.md` (its Arc B
section) and the design spec
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` (D1-D7 plus the
2026-08-06 amendments). The commitments that bind every phase of the build
are numbered P1-P11 in
`docs/superpowers/plans/2026-08-06-oracle-web-v1/decisions.md`.

## The problem

The QW Oracle is a knowledge service that agents reach over MCP: thirty years
of QuakeWorld engine facts, Discord history and curated notes. From the
outside it is invisible. A player who hears about it cannot see what it knows,
how much, or how to plug their own agent into it, and the operator has no
public mirror of how the corpus grows.

The first concrete audience is the QW dev Discord on the day the MCP opens to
testers (spec D1): a tester should land, understand the kinds of knowledge in
under a minute, see live coverage numbers, and leave with a working MCP
connection. Public-web presence and the operator's own visibility fall out of
the same page.

## The shape of the answer: a growing brain

One page, two floors, read-only.

- **The brain (floor 1) is the coverage map, rendered with soul.** One
  datacenter per knowledge region, lit regions dense with scaffolding in
  proportion to what they hold, dormant regions drawn as dashed ghosts with
  honest teaser copy. The feeling to inspire is growth, not completeness.
- **The machine room (floor 2) is what the brain runs on**: racks for the
  subsystems and a field terminal whose boot screen is the connect
  quickstart. Every topic doors out to the public GitHub repo.
- **Three zoom levels owned, the fourth is always a door** (D3): datacenter,
  regions within it, an inventory card. The individual article is never
  rendered here. Engine facts open docs.quake.world; synthesis and community
  memory end in the literal MCP call for the visitor's own agent; machine-room
  topics open the repo. Every dead end sends the visitor toward connecting an
  agent.
- **An open registry, not a hard-coded trio** (D4). The page renders the
  datacenters the manifest carries, named by content (ENGINE FACTS, DISCORD,
  CONCEPT NOTES, GAME CONTENT, ...), never by internal layer numbers. The
  launch set was four lit and two dormant (D5); new regions attach by data.
- **Numbers arrive by one runtime fetch of a published manifest** (D7). The
  site is fully static and redeploys only for code; publishing fresh numbers
  is the oracle's harvest ritual, not a site deploy. A baked copy makes an
  unreachable oracle degrade to stale numbers, never an error.

## Principles that constrain it

- **Read-only, one endpoint, no writes.** No auth, forms, tickets, playground
  or analytics backend. The one network call is the manifest; everything else
  links out (P3, P5).
- **The mockup is the contract** (P1). The design was locked at roughly 90% in
  an interactive mockup; the port reproduces it, it does not redesign. A
  visible deviation is a finding or a dated amendment, never a local choice.
- **Portable by construction** (P4). SolidJS + Vite, Tailwind v4 + daisyUI
  tokens, dumb presentation components fed by props, pure generators: the
  stack locks of the quake.world federation, so this work can move onto
  vikpe's platform later without a rewrite.
- **No strawmen** (P6). The "Why do I need this?" comparison only ever shows
  verbatim, dated, model-labelled captures of agent-alone versus
  agent-plus-oracle. Until real captures exist the overlay ships dark.
- **Honest ghosts.** Dormant regions are inspiration for where this grows,
  never promises.

## Rejected along the way

- **Firebase or Firestore for the data**: a second platform inside a
  Cloudflare-locked federation, SDK weight in the bundle, real-time machinery
  for numbers that change monthly.
- **Rebuilding the site per data update**: couples content freshness to the
  code pipeline for no gain.
- **A browsable thread archive**: that is the read half of the deferred
  support.quake.world idea; building it here would un-defer that decision
  through the back door.
- **A public ask-box or playground**: an LLM-funding and answer-review
  question v1 does not take.
- **support.quake.world as the domain**: the support platform is an unproven
  hypothesis with an evidence trigger; the brain surface is not.

## Non-goals

Auth, forms, tickets, a playground, analytics, contributor sections, admin or
corpus-state detail, rendering individual artifacts in-site, a second connect
surface (the hero CTA, the YOUR AGENT node and the MCP card all open the one
CONNECT card), a second motion species (one pulse glyph, one speed), and
"brain barrier" or L1/L2/L3 vocabulary in user-facing copy.

## Where it lives

The intended home is `oracle.quake.world`, on a zone vikpe owns; until that
DNS ask lands, the site runs as a preview on the operator's own Cloudflare
Pages account. Going public is the operator's tester-invite timing call,
outside the arc that builds the site.
