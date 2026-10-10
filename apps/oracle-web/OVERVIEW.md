# oracle-web -- overview

What is load-bearing about this app right now: the things a fresh session
cannot reconstruct from the code in two minutes. The arc building it is the
"Oracle web direction" row of the monorepo's root `HANDOVER.md`; phase state
is the Status block of
`docs/superpowers/plans/2026-08-06-oracle-web-v1/README.md`.

## Identity

Does: fetch one published manifest, validate its shape, render it as a
two-floor SVG/HTML scene, drill three levels, link out. Does not: fetch
anything else, write anything, authenticate anyone, render an article, or
show a number the manifest does not carry.

## Shape of the code

| Path | What it is |
|---|---|
| `src/App.tsx` | The shell: the one `loadManifest()` call, the two floor sections, and the only reads of `location.search` and `matchMedia`. |
| `src/data/manifest.ts` | The one network call: fetch with a 5 s timeout, shape check, baked fallback. |
| `src/data/manifest-types.ts` | Hand-mirrored copy of the emitter's `BrainManifest` contract. |
| `src/data/baked-manifest.json` | Generated at `dev`/`build` from `apps/qw-oracle/snapshots/brain-manifest.json`; gitignored. |
| `src/generators/` | Pure functions and constants: `layout.ts` (desktop geometry), `mesh.ts` (seeded scaffold), `journeys.ts` (traveler animation contract). No DOM, no solid-js imports. |
| `src/components/Floor1Brain.tsx` | The brain: stations, mesh, output side, drill wiring, animation runtime. Large by design: it is the mockup's `buildBrain()` ported group by group. |
| `src/components/{DrillOverlay,DatacenterCard,XnCards,WhyCompare}.tsx` | Drill-card chrome; a manifest datacenter's card body; the four system cards (MCP / CONNECT / SNAPSHOT DOOR / SLIPGATE APP); the dark comparison overlay. |
| `src/components/Floor2MachineRoom.tsx` | Phase-2 placeholder: header copy and a provenance line. |
| `src/styles/app.css` | daisyUI theme `oracle` (palette from the mockup) plus the floor-1 and drill CSS ported verbatim. |
| `scripts/bake-manifest.mjs` | Copies the committed snapshot into the bundle; refuses a non-v1 schema. |

## Parked with purpose

Things that exist in code but are intentionally not yet alive. Each has an
owner; none is a defect.

| Item | State today | Owner |
|---|---|---|
| Floor 2 (machine room) | Placeholder component; racks, field terminal and root travelers unbuilt | Arc phase 4 (`phase-4-floor2-machine-room.md`) |
| "Why do I need this?" overlay | Built and in the bundle; its door renders only under `?dev=why`; the answer columns are placeholder copy under a draftstamp that must survive until real captures land | P6; captures come from the oracle-eval-simulation arc |
| Portrait / mobile layout | Not transcribed; `BrainLayout` is the slot a `PORTRAIT_LAYOUT` drops into | Arc phase 5 |
| URL fragments, footer doors, a11y / perf sweep, final copy | Unbuilt | Arc phase 6 (`phase-6-ship-pass.md`) |
| CONNECT card endpoint text `https://oracle.quake.world/mcp` | Mockup copy; that host does not resolve. The live endpoint is `https://oracle.slipgate.me/mcp` | Phase 6 owns the swap; its doc names all three copy sites |
| Dormant datacenters (COMMUNITY HISTORY, MATCH STATS) and the SLIPGATE APP ghost | Dashed ghosts with teaser copy; lit versus dormant is the manifest's call, not code | Data (`lit: true` in the manifest); the slipgate ghost is static copy |

True cruft: none attested.

## Design intent

Rules that are expensive to reverse-engineer and easy to break by improving
them.

- **One seam.** `manifest.ts` is the only fetch; `App.tsx` is the only reader
  of `location.search` and `matchMedia`; components take props, generators
  take arguments. A second network call or an environment read inside a
  component is a finding, not a style choice (P3, P4, P5).
- **The mockup is the contract, line by line.**
  `docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7) is the
  comp; the CSS was ported verbatim and every geometry constant cites the
  mockup line it came from. Those line references are the parity audit
  trail; keep them. A visible deviation is a finding or a dated amendment in
  the arc's ledger (P1).
- **The mesh is deterministic in JS doubles.** `mesh.ts` runs the mockup's
  LCG (seed 41) with a multiply that overflows 2^53 and loses low bits the
  same way every time. Do not fix it with BigInt or `Math.imul`; the dots
  would stop matching the comp.
- **One pulse species.** Journey travelers move at the canonical dash speed
  and render as the dash glyph; the constants in `journeys.ts` are normative
  and floor 2 imports them rather than restating them (P7). The brainstem
  animation paints above the HTML bridge; `prefers-reduced-motion` disables
  ambient motion everywhere, read once.
- **The registry is open on the data side and closed on the layout side.**
  Which datacenters exist, their names, numbers and lit state come from the
  manifest, keyed by id. Where each one sits comes from `layout.ts` (the
  `SRC` stations and `SEATS`), also keyed by id. A manifest id with no
  layout entry is silently not drawn; a layout id absent from the manifest
  is skipped. Adding a region means a manifest change upstream and a station
  plus seat here.
- **Copy locks (P8).** Datacenter display names, the tagline, no legends at
  rest, no "brain barrier", no L1/L2/L3 in user-facing text. The WhyCompare
  draftstamp is load-bearing while the answer columns are placeholders.
- **Animation state is plain mutable, not signals**, on purpose: the phase-3
  doc's "Jank on deploy" recovery entry rules out per-frame signal updates.
  Keep the runtime outside Solid's reactivity.

## Code landmarks

- Change what the page can show: the emitter
  `apps/qw-oracle/scripts/build-brain-manifest.ts` first, then re-mirror
  `src/data/manifest-types.ts`, then the shape check in `manifest.ts` if a
  required field moved.
- Change fetch, timeout, fallback or the force-fallback flag:
  `src/data/manifest.ts`.
- Move a station, seat, dock or output node: `src/generators/layout.ts`
  (desktop only).
- Change mesh density or scatter: `src/generators/mesh.ts`; the shares come
  from the manifest.
- Change traveler speed, counts, hop limits or landing order:
  `src/generators/journeys.ts`.
- Change a drill card: `DatacenterCard.tsx` for manifest datacenters,
  `XnCards.tsx` for the four system cards, `DrillOverlay.tsx` for the
  open/close/zoom chrome.
- Change colours: the theme block at the top of `src/styles/app.css`.

## Integration boundaries

| Boundary | Shape | Trust |
|---|---|---|
| Brain manifest (the only input) | `GET https://oracle.slipgate.me/snapshots/brain-manifest.json`, served by qw-oracle's nginx with `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=300`; emitted and published by `build-brain-manifest.ts --publish`, the closing step of `apps/qw-oracle/scripts/load-chat/HARVEST-RUNBOOK.md` | Validated on arrival (`schema_version` plus datacenter shape); any failure falls back to the baked copy and `[data-manifest-source]` reads `baked`. Contract drift is fixed upstream, never patched here. |
| Doors out | `door.href` per datacenter comes from the manifest (the ENGINE FACTS door targets the docs preview URL today and is flipped in the emitter when docs.quake.world resolves); the MCP endpoint text and repo links are site copy | Links only; nothing round-trips. |
| Cloudflare Pages | Static `dist/` on project `qw-oracle-web`, operator's personal account | `DEPLOYMENT.md`; the production domain waits on vikpe's zone. |
| Sibling `apps/docs-web` | Shares the pnpm-workspace isolation pattern and the preview-deploy posture, nothing else | No code or data shared. |

## Maintenance model

Numbers refresh by republishing the manifest; the page picks them up within
the five-minute cache with no deploy. Deploys ship code only, and each deploy
freezes a new baked copy, so the fallback is as stale as the last deploy by
design. There are no tests; typecheck plus build is the gate, and the arc's
phase docs hold the visual-parity and behavioural probes.

## Not covered here

| For | Read |
|---|---|
| Run, build, dev server, runtime flags | `DEVELOPMENT.md` |
| Deploy, token location, rollback, gotchas | `DEPLOYMENT.md` |
| Why these choices | `VISION.md` |
| The contract's field meanings and the publish gate | the header of `apps/qw-oracle/scripts/build-brain-manifest.ts` and `docs/superpowers/plans/2026-08-06-oracle-web-v1/phase-1-manifest-pipeline.md` |
| Phase state, findings, decisions | `docs/superpowers/plans/2026-08-06-oracle-web-v1/` (`README.md`, `review-findings.md`, `decisions.md`) |
