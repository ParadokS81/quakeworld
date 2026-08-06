# Phase 3 -- floor 1: the brain

**Arc:** oracle-web-v1. **Ledger:** `decisions.md` P1-P11 (load-bearing here:
P1 mockup-is-comp, P6 dark overlay, P7 animation rules, P8 copy locks, P9
doors/singular connect). **Spec:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` D1/D3/D6 + BOTH
2026-08-06 amendment blocks + the rounds-4.5-4.7 addendum. **Comp:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7; every
behavior in this doc carries its mockup line range). **Skeleton:** Phase 2's
app-skeleton contract (`phase-2-scaffold-hello-production.md`, Files touched
diagram) -- every file this phase creates lands in exactly those homes.

**Path caveat:** `apps/oracle-web` does not exist at drafting time -- Phase 2
creates it. Every literal below that touches `apps/oracle-web/...` is an
**arc-RUN-time literal**, consistent with Phase 2's skeleton diagram but not
runnable today. Literals against the mockup, the spec, and this box's
toolchain were smoke-tested read-only at drafting time (2026-08-06).

## Goal

Port floor 1 of the mockup -- the neural-circuit brain -- into the Phase 2
skeleton at full visual and behavioral parity (P1): the log-scaled mesh over
manifest `share`, depth-scattered seats inside the lobes, asymmetric
title-only stations with progressive disclosure per the addendum's label
patterns, hover/click chain targets, drill cards fed by live manifest data
(bars / stats / notes / door per datacenter), dormant dashed ghosts with
teaser cards, the output side (gather point -> MCP gate -> two-way agent
highway -> YOUR AGENT; snapshot door bypassing the gate to THIS PAGE "you are
here" + slipgate ghost; growth docks), ambient tracepoint journeys including
their floor-2 handoff interface (normative contract below -- Phase 4 wires
into it), the singular CONNECT card reachable from all three openers (hero
CTA, YOUR AGENT node, MCP card -- P9), and the why-comparison overlay BUILT
but dark (P6: dev-flag accessible, hero door absent at rest). Desktop-first:
the mockup's portrait branch is NOT ported (`TBD-PHASE-5-portrait-layout`);
this phase verifies at >900px only. The phase ends with the deployed
`https://qw-oracle-web.pages.dev/` rendering floor 1 at parity with the comp
in a side-by-side operator ritual, all automated probes green, and the
journey-handoff seam observable via a DOM hook (`data-stem-exits`) so Phase 4
can be briefed against a live, verified interface.

## Port discipline (binding task guidance)

- **Generators are pure.** The mockup's imperative builders port as pure
  functions into `src/generators/` taking (manifest data, seed, layout
  constants) and returning render-ready structures -- no DOM, no fetch, no
  `window`. Components render those structures dumbly via props (P4).
  Anything needing the DOM (SVG path length sampling) enters through a narrow
  interface (`PathSampler`, below), supplied by the component.
- **One rAF loop.** Floor 1 owns exactly one `requestAnimationFrame` loop
  (travelers). Dash pulses stay CSS keyframes (`.sig`, mockup lines 51-53),
  flicker stays CSS (`.fire`, lines 54-55) -- as in the comp. No second JS
  animation species (P7a).
- **Contract constants are named, never inlined twice.** From the addendum +
  mockup: seed `41` with the LCG `seed = (seed * 1103515245 + 12345) %
  2147483648` (lines 366-367); ~150 dots = 6 seats + 110 share-scattered
  (`Math.round(110 * share)`, line 419) + 40 unattributed fill (line 428);
  canonical dash speed 400u per 5.5s -- CSS `stroke-dasharray: 10 190` +
  `aPulse 5.5s` (51-52), JS `adv = 0.073 * dt` (524); `.sig` delays s2
  `-1.8s` / s3 `-3.6s` (53); flicker `aFire 6s` (54) gated by `fireMod = {
  cm: 6, ef: 8, gc: 11, cs: 13 }` (453) with delay `(idx * 431) % 6000` ms
  (463). These live once in `src/generators/` and are imported everywhere.
- **LCG precision is part of the contract.** The mockup's LCG runs in JS
  doubles (the multiply exceeds 2^53 and loses low bits deterministically);
  the port keeps the identical expression -- do NOT "fix" it with BigInt or
  `Math.imul`, or the mesh stops matching the comp dot-for-dot.
- **Copy is byte-identical** (P1/P8). Strings quoted in this doc are exact;
  card bodies referenced by line range are ported verbatim from the mockup
  (HTML entities like `&amp;` render as their characters; JSX text nodes
  handle this natively). Manifest-fed strings (`name`, `sub`, `stationSubs`,
  `notes`, `teaser`) render as delivered -- the mockup's inline values are
  the 2026-08-05 snapshot and numbers WILL differ (P2: manifest is truth).
- **Raw numbers format site-side**: `num`, `bars` values, `stats` values
  arrive as raw integers (Phase 1 contract) and render via
  `n.toLocaleString('en-US')` (mockup `fmt`, line 267).
- **Registry, not positions** (D4): all per-datacenter render code keys by
  `id`. A manifest datacenter with no layout entry is skipped with a
  `console.warn`, never a crash (Open question 4).
- **No fetching, no URL parsing in components** (P4, Phase 2 seam). The two
  environment reads this phase needs -- `prefers-reduced-motion` (mockup line
  240) and the why-overlay dev flag -- happen once in `App.tsx` (the shell)
  and flow down as props.

## The journey-handoff contract (normative -- Phase 4 cites this)

The mockup couples the floors through two module-level variables: `stemExit`
(declared line 355, called by floor 1 when a traveler finishes its stem
descent, line 555; implemented by floor 2, lines 996-1012) and `brainSpawn`
(line 356, set line 520, driven by the ambient timer lines 835-839). The port
replaces both with an explicit, typed seam. **This phase OWNS this contract;
Phase 4 consumes it without renegotiation.** Floor-2 mechanics beyond the
interface stay `TBD-PHASE-4-root-travelers`.

### Module: `src/generators/journeys.ts` (exported names normative)

```ts
// -- P7a: the one pulse species (mockup 51-53, 524, 565, 1016, 1033) --
export const PULSE_ADV_PER_MS = 0.073;   // canonical speed; the mockup's JS literal
                                         // for 400u / 5.5s (= 0.0727..; 0.073 is the
                                         // contract value -- match the comp, not the ideal)
export const PULSE_TRAIL_UNITS = 10;     // traveler glyph = trailing <line>, 10 local units x S
export const PULSE_STROKE = '#4aa8ff';
export const PULSE_STROKE_WIDTH = 2.4;   // x S (S = 1 on desktop); linecap round; filter url(#aglow)
export const SIG_DASHARRAY = '10 190';
export const SIG_PERIOD_S = 5.5;
export const SIG_DELAYS_S = { s2: -1.8, s3: -3.6 };

// -- floor-1 journey tuning (mockup 486-580, 621, 684-689, 835-839) --
export const MAX_TRAVELERS = 6;          // spawn refused above this (509)
export const MAX_HOPS = 11;              // forced gather fires when hops EXCEED this
                                         // (mockup 539: `p.hops > 11` -- 12 hops are
                                         // permitted; port as `> MAX_HOPS`, NOT `>=`)
export const GATHER_CAPTURE_RADIUS = 95; // within this of GATHER -> phase 3 (539)
export const TOUCH_FLASH_MS = 450;       // meshdot .touch duration (491)
export const HOVER_SPAWN_THROTTLE_MS = 1100;  // per-station hover spawn gate (686)
export const AMBIENT_INTERVAL_MS = 4200;      // (837)
export const AMBIENT_KICKOFF_MS = 700;        // first spawn, always 'cm' (838)
export const AMBIENT_ORDER = ['cm', 'ef', 'gc', 'cs'] as const;  // (836)

// -- floor-2 side of the fold (Phase 4 consumes; mockup 995-999, 1022-1026) --
export const ROOT_LANDING_QUEUE = ['cm', 'ef', 'gc', 'cs'] as const;  // (995)
export const LAND_FLARE_MS = 650;        // rack .land duration (1025)

// -- the pure stepping machinery --
export interface PathSampler {           // narrow DOM seam: components build these from
  length: number;                        // rendered SVGPathElement refs (getTotalLength /
  pointAt(d: number): { x: number; y: number };  // getPointAtLength)
}
export interface Traveler { /* phase 1|2|3|4 state machine per mockup 508-580 */ }
export function spawnTraveler(
  srcId: string, srcTrace: PathSampler, mesh: MeshGeometry): Traveler;
export function advanceTravelers(
  travelers: Traveler[], dtMs: number, mesh: MeshGeometry,
  gather: { x: number; y: number }, stemEnd: number
): { touchedDotIdxs: number[]; stemExits: number };
// advanceTravelers mutates traveler state (positions consumed by the render
// pass), returns which mesh dots to flash and how many travelers finished the
// stem this tick. dt is clamped at 50ms per the mockup (523).
```

### Component seam (wired by this phase in `App.tsx`)

- `Floor1Brain` props gain `reduced: boolean` and `onStemExit?: () => void`.
  `onStemExit` fires **exactly once per traveler** at the moment it reaches
  `STEM_END` and despawns (mockup 553-556) -- never under
  `prefers-reduced-motion` (spawns are suppressed entirely, line 509).
- `App.tsx` wiring (this phase lands it):
  `const [stemExits, setStemExits] = createSignal(0)`; Floor1 gets
  `onStemExit={() => setStemExits(n => n + 1)}`; the root div (which already
  carries `data-manifest-source`, Phase 2) gains
  `data-stem-exits={stemExits()}` -- the invisible verification hook;
  `Floor2MachineRoom` gets `stemExits={stemExits()}` and `reduced` as new
  OPTIONAL props (interface-only touch to the Phase 2 placeholder; ignored
  until Phase 4).
- **Phase 4's obligation:** one root traveler spawned per `stemExits`
  increment, cycling `ROOT_LANDING_QUEUE`, rendered as the SAME glyph species
  (`PULSE_*` constants) at the SAME speed (P7a), landing with a
  `LAND_FLARE_MS` flare; suppressed when `reduced` or when the roots SVG is
  hidden (mockup 997-998). Everything else about roots/racks is
  `TBD-PHASE-4-root-travelers`.

### Coordinate contract

**No coordinates cross the fold.** Floor 1's traveler lives in the `#brain`
SVG's own viewBox (desktop `0 0 1200 800`, mockup 364) and despawns at its
bottom edge (`STEM_END = 800`, line 388); floor 2 spawns a FRESH glyph at its
trunk start -- `(clientWidth / 2, 0)` of `#machine-room` in that SVG's
pixel-space viewBox (mockup 925-928). Continuity is carried by three
invariants, not by a coordinate transform:

1. **Both stems anchor the viewport horizontal midline.** Floor 1: stem x =
   `GATHER.x = 600` = viewBox center, and `preserveAspectRatio="xMidYMid
   meet"` (line 204) maps viewBox center to section center at every aspect
   ratio. Floor 2: trunk starts at `w / 2`. Phase 4 MUST keep the trunk start
   at horizontal center.
2. **One glyph species at one speed** (P7a) -- both sides import the same
   `PULSE_*` constants.
3. **The `.stemext` bridge div** (mockup 56-60, 206): floor 1's `meet`
   letterboxing means viewBox y=800 sits ABOVE the section's bottom edge on
   wide viewports; the 30vh HTML div (2px gradient line + two 1px side rails
   at +-5px) continues the stem visual to the fold. It carries no traveler.

### Z-order (P7b)

`.stemext` is `z-index: 0` (line 56); `#brain svg.main` is `z-index: 1`
(line 21) -- the stem's SVG pulse and the traveler render ABOVE the HTML
bridge div. The down-flow cue depends on this; do not reorder. Inside the
SVG the group order is normative (mockup 379-384): `gDrops` (seat->gather
ghost curves) < `gTrace` (traces, output side, brainstem) < `gMesh` (edges +
dots) < `gTop` (seats, station labels, gate, agent, snapshot nodes, docks) <
`gFx` (travelers) < `gHit` (fat transparent hit strokes). Phase 4's roots SVG
sits at `z-index: 0` behind its rack columns (line 65) -- recorded here only
so the cross-fold picture is complete; it is Phase 4's to build.

## Inputs from previous phase

Mirrored from Phase 2's "Outputs to next phase"; each line's probe runs at
phase start (arc-RUN time -- the subtree does not exist at drafting time).

- **The live URL + pipeline**: `https://qw-oracle-web.pages.dev/` serving the
  Phase 2 skeleton; redeploy = the one command in
  `apps/oracle-web/DEPLOYMENT.md`. Verify:
  `curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/`
  -> `200`; `test -f /home/dev/projects/quakeworld/apps/oracle-web/DEPLOYMENT.md && echo OK`.
- **The skeleton contract**: the Phase 2 file map. Verify:
  `ls /home/dev/projects/quakeworld/apps/oracle-web/src/components/Floor1Brain.tsx /home/dev/projects/quakeworld/apps/oracle-web/src/components/Floor2MachineRoom.tsx /home/dev/projects/quakeworld/apps/oracle-web/src/App.tsx /home/dev/projects/quakeworld/apps/oracle-web/src/styles/app.css`
  -> all present. `src/generators/` is reserved-but-empty (Phase 2 diagram);
  this phase creates it -- absence of the dir at phase start is expected, not
  a failure.
- **The data contract surface**: `loadManifest(): Promise<ManifestResult>`
  called exactly once. Verify:
  `grep -c "createResource(loadManifest)" /home/dev/projects/quakeworld/apps/oracle-web/src/App.tsx`
  -> `1`, and
  `grep -rn "fetch(" /home/dev/projects/quakeworld/apps/oracle-web/src/components/`
  -> no hits. Components receive `manifest` (typed `BrainManifest` from
  `src/data/manifest-types.ts`) and `source` via props.
- **The dev-flag pattern**: `?data=force-fallback` precedent. Verify:
  `grep -c "force-fallback" /home/dev/projects/quakeworld/apps/oracle-web/src/data/manifest.ts`
  -> >= 1. This phase resolves Phase 2's `TBD-PHASE-3-overlay-flag` with the
  same query-param shape (Open question 1).
- **The theme tokens + shell CSS**: daisyUI theme `oracle`; the two-floor
  shell (scroll-snap, gradient, P7c reduced-motion `scroll-behavior` guard)
  already in `src/styles/app.css`. Verify:
  `grep -c '"oracle"' /home/dev/projects/quakeworld/apps/oracle-web/src/styles/app.css`
  -> >= 1. P1 wins over token purity: this phase styles floor 1 with
  mockup-verbatim CSS, not token re-derivations.

From Phase 1 (via Phase 2's bake): the manifest contract fields this phase
renders -- `id/name/lit/num/sub/stationSubs/share/bars/stats/notes/teaser`
and the structured `door` (`kind: 'site' | 'agent'`). One Phase 1 output
claim is contradicted at drafting time -- see Open question 2 (MCP-card
thread count has no raw field).

Drafting-time environment facts (probed 2026-08-06 on this box):

- Mockup readable at
  `/home/dev/projects/quakeworld/docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html`
  (1045 lines; all line refs in this doc verified against it).
- `python3` 3.12.13 on PATH (parity-ritual serve command); cockpit ports
  5173/5174 published to Tailscale per the cockpit compose; neither bound at
  drafting time (`ss -tln` clean) -- re-check at run time, fall back to 5173
  if 5174 is taken by a traveldiary lane.
- `bun 1.3.11` on PATH (runs `.ts` directly -- used for the pure-generator
  probes; the generators import no Solid code, so bun executes them without
  the Vite toolchain).

## Files touched

**Created (all inside `apps/oracle-web/src/` -- Phase 2 skeleton homes):**

- `generators/layout.ts` -- desktop layout constants + types (`BrainLayout`)
- `generators/mesh.ts` -- seeded mesh generation (pure)
- `generators/journeys.ts` -- the handoff-contract module (constants + pure
  traveler state machine)
- `components/DrillOverlay.tsx` -- the fixed overlay + card chrome +
  zoom-from-origin animation + esc/backdrop/X close
- `components/DatacenterCard.tsx` -- lit/dormant drill-card content from a
  manifest `Datacenter` (bars/stats/notes/door templates)
- `components/XnCards.tsx` -- MCP / CONNECT YOUR AGENT / SNAPSHOT DOOR /
  SLIPGATE APP card contents (static site copy, mockup XN block)
- `components/WhyCompare.tsx` -- the why-comparison overlay content (P6 dark)

**Modified:**

- `components/Floor1Brain.tsx` -- placeholder replaced by the full port
  (resolves Phase 2's `TBD-PHASE-3-brain-port`)
- `components/Floor2MachineRoom.tsx` -- interface-only touch: optional
  `stemExits` / `reduced` props added and ignored (body untouched;
  `TBD-PHASE-4-machine-room-port` stands)
- `App.tsx` -- reduced-motion read, why-flag read, `stemExits` signal +
  `data-stem-exits` hook, new props passed to both floors
- `styles/app.css` -- floor-1 + drill CSS blocks appended

**Deleted:** none. **Outside the subtree:** nothing (deploy uses the Phase 2
pipeline as-is).

## Tasks

**Split-feasibility ruling (tripwire): KEEP.** This phase hits the tripwire
markers -- 10 tasks (at the ~10 threshold, not past it) and ~1.45x the
median doc size (under the 2x line). Ruling: keep one phase, one doc.
Grounds: (a) T1-T4 are independent pure modules with standalone probes, so
orchestration load is below the raw task count; (b) floor 1 is one
interaction organism -- hover chains feed the journey spawner, drill cards
hang off the same chain targets, the output side shares the trace builder --
a phase boundary anywhere inside it would demand a second operator parity
ritual on a half-interactive floor; (c) an internal split would force an
artificial intermediate contract between the halves with no independent
consumer; (d) the doc stays within budget because geometry is cited by
verified mockup line ranges rather than transcribed.

Wave structure: T1-T4 are independent of each other (parallelizable); T5-T9
build on them and are sequential where they share `Floor1Brain.tsx` /
`App.tsx`; T10 closes.

### Task 1 -- floor-1 + drill CSS port · `agent (workhorse, low)`

**Goal:** the comp's floor-1 visual vocabulary exists in `app.css`.

**Files:** `src/styles/app.css` (append two labeled blocks).

**Steps:**
1. Port mockup lines 20-60 verbatim as a `/* ===== FLOOR 1 (mockup 20-60)
   ===== */` block: `#brain svg.main` (z-index 1), `.titleblock`,
   `.herolinks`/`.herolink`(+`.go`), `.cornernote`, `.majorlabel` /
   `.majornum` / `.majorsub`, the `.detail`/`g.reveal` progressive-disclosure
   pair (42-43), `g.major`(+`.dim`), `g.gate`, `.hotbase`, `.hotseat`,
   `.meshdot`(+`.touch`), `@keyframes aPulse` + `.sig`(+`.s2`/`.s3`),
   `@keyframes aFire` + `.fire`, `.stemext` (z-index 0 -- P7b). SKIP the
   `svg.portrait` overrides (39-41): portrait is Phase 5's
   (`TBD-PHASE-5-portrait-layout`).
2. Port mockup lines 122-165 verbatim as a `/* ===== DRILL OVERLAY (mockup
   122-165) ===== */` block: `.drill`, `.backdrop`, `.dcard`(+`.pre`,
   `.wide`), `.x`, `h3`, `.headline`, `.brow`/`.bar`, `.stats`, `ul.notes`,
   `.door`, `.escnote`, `.chipdim`, `.draftstamp`, `.qa` (+ the 820px
   single-column rule, line 186).
3. Extend the existing `prefers-reduced-motion` block (Phase 2 shipped the
   `scroll-behavior` line) with the mockup's remaining guards (188-191):
   `.sig, .fire { animation: none !important; }` and `.dcard, text.detail,
   g .detail { transition: none !important; }` (the `.rk .rkd i.on.bl`
   selector in line 189 is floor 2's -- include it now, harmless, so Phase 4
   inherits P7c complete).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && grep -c "aPulse\|aFire\|hotseat\|stemext\|draftstamp" src/styles/app.css && pnpm build

Expect: grep >= 5, build clean.

### Task 2 -- `src/generators/layout.ts`: desktop layout constants · `agent (workhorse, medium)`

**Goal:** every hardcoded desktop geometry from `buildBrain()` lives in one
typed module; `BrainLayout` is the shape a future `PORTRAIT_LAYOUT` (Phase 5)
drops into.

**Files:** `src/generators/layout.ts` (create; also `mkdir src/generators`).

**Steps -- transcribe the mockup's desktop (`P === false`) branch exactly:**
1. `VIEWBOX = '0 0 1200 800'` (364), `S = 1` (386), `GATHER = { x: 600,
   y: 542 }` (387), `STEM_END = 800` (388), `LOBES = [[580,380,150,125],
   [690,370,110,100],[610,480,95,60]]` (390).
2. `SEATS` (desktop object, 402-404) + `SEAT_INDEX = { ef:0, cm:1, cs:2,
   gc:3, ch:4, ms:5 }` (405), `MIN_DIST = 26` (408).
3. `SRC`: the six desktop station descriptors -- trace path `d`, `pad` rect,
   label descriptor (`mode: 'center'` with `cx`/`liney`, or `mode: 'side'`
   with `x`/`y`/`anchor`). NOTE the mockup's transcription quirk: the inline
   desktop array (602-611) carries a placeholder `gc` entry that lines
   613-619 REPLACE and then append `ch` + `ms` -- the effective desktop
   order is `ef, cm, cs, gc, ch, ms`; flatten to that six-entry array and
   record the quirk in a comment. Trace-delay classes follow `["", "s2",
   "s3", "s2"]` cycled by index (621).
4. `OUT`: the desktop output-side block verbatim (728-734): `axon`, `gpt`,
   `jn`, `laneA`, `laneQ`, `arc1`, `arc2`, `port`, `mcpXY`, `agent`,
   `agentLbl`, `snap`, `snapEnd`, `tpLbl`, `sgC`, `sgLbl`, `snapLblXY`.
5. `DOCKS`: the two dock rows (703-704).
6. `FIRE_MOD = { cm: 6, ef: 8, gc: 11, cs: 13 }` (453).
7. Export as `DESKTOP_LAYOUT: BrainLayout` plus the `BrainLayout` type.
   Portrait constants are NOT transcribed -- the mockup keeps them for
   Phase 5 (`TBD-PHASE-5-portrait-layout`).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && bun -e "import { DESKTOP_LAYOUT as L } from './src/generators/layout.ts'; console.log(L.GATHER.x, L.STEM_END, L.SRC.length, Object.keys(L.SEATS).length)"

Expect: tsc clean; `600 800 6 6`.

### Task 3 -- `src/generators/mesh.ts`: seeded mesh generation · `agent (workhorse, high)`

**Goal:** a pure `generateMesh(litShares, layout)` reproducing the mockup's
scatter + adjacency byte-for-byte in geometry.

**Files:** `src/generators/mesh.ts`.

**Steps (port mockup 366-465 as pure functions):**
1. LCG exactly as lines 366-367 (seed 41; keep double-precision semantics --
   see Port discipline). The RNG is module-internal to one `generateMesh`
   call; a fresh call restarts at 41 (matching `buildBrain()` re-entry).
2. Points: seats first in `SEAT_INDEX` order (406-407); per lit datacenter in
   manifest registry order, `want = Math.round(110 * share)` gaussian-ish
   scatter (`(rnd()+rnd()+rnd()-1.5) * sigma`, `sigma = 45 + 55 * share`, y
   compressed x0.8) with lobe inside-test + `MIN_DIST` rejection, 3000 tries
   (417-427); then 40 unattributed fills in the box `390+rnd()*430,
   220+rnd()*350` (428-433). **Call-order sensitivity is part of the
   contract** -- iterate `datacenters` filtered to `lit` in manifest order
   (the manifest emits `ef, cm, cs, gc` -- same as the mockup's DC order).
3. Adjacency + edges: for each point (skipping index 0), connect to its 2
   nearest predecessors with a quad bezier whose midpoint jitters +-12
   (`(rnd()-0.5)*24`, 434-451); emit edge path strings and the symmetric
   `adj` list carrying control points.
4. Dot styling flags per lines 452-465: skip indices 0-5 (seats render
   separately); radius `idx % 7 === 0 ? 4.2 : 2.7` (x S), fill `idx % 3 ===
   0 ? '#4aa8ff' : '#2f6db3'`; `fire` flag when the point's datacenter tag
   satisfies `idx % FIRE_MOD[tag] === 0` (fill `#6fe3ff`, delay `(idx * 431)
   % 6000` ms).
5. Return `MeshGeometry`: `{ pts, adj, edges, dots }` -- render-ready, no
   DOM.

**Verification probe (arc-RUN -- determinism + population):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && bun -e "
    import { generateMesh } from './src/generators/mesh.ts';
    import { DESKTOP_LAYOUT as L } from './src/generators/layout.ts';
    const shares = [['ef',0.289],['cm',0.420],['cs',0.118],['gc',0.172]];
    const a = generateMesh(shares, L), b = generateMesh(shares, L);
    console.log(a.pts.length, a.edges.length, JSON.stringify(a.pts) === JSON.stringify(b.pts));"

Expect: `pts.length` in 140..156 (6 seats + up to 110 scattered + 40 fill;
rejection sampling may fall short of `want`), `true` for determinism. With
the mockup's 2026-08-05 shares the scatter is IDENTICAL to the comp's; live
shares may drift the counts slightly (parity ritual item V4 tolerates this).

### Task 4 -- `src/generators/journeys.ts`: the handoff-contract module · `agent (workhorse, high)`

**Goal:** the module specified in "The journey-handoff contract" exists
exactly as written there -- constants + pure traveler state machine.

**Files:** `src/generators/journeys.ts`.

**Steps:**
1. Export every constant from the contract section with the values given
   (each traces to its verified mockup line, cited in comments).
2. Port the traveler state machine as pure functions over `PathSampler` +
   `MeshGeometry` (mockup 493-585): `pickNext` (gather-greedy with noise
   `0.85 + rnd() * 0.3`, avoid backtracking unless dead-end, 493-506),
   `startHop` (bezier segment setup, `seg = max(14, dist * 1.05)`, 573-580),
   `quad` interpolation (582-585), phase transitions: 1 source-trace ->
   2 mesh hops (flash on arrival, forced-gather on `MAX_HOPS`/-capture
   radius, 529-545) -> 3 straight run to GATHER (546-550) -> 4 stem descent
   to `STEM_END`, then despawn + stem-exit signal (551-559). Glyph
   orientation math (trailing line along the motion vector, 560-569) returns
   per-traveler `{x1,y1,x2,y2}` for the component to set.
3. Journey randomness uses its own LCG instance (same algorithm) -- the
   mockup shares one `rnd()` between mesh build and journeys, but the mesh
   is built once and journeys draw indefinitely; sharing would make mesh
   determinism depend on journey history on rebuild. Document this as the
   one sanctioned behavior difference: journey PATHS are random either way
   (not part of visual parity); mesh geometry stays deterministic.
4. dt clamp 50ms (523); `spawnTraveler` starts at the source trace's length-0
   point (511-517).

**Verification probe (arc-RUN -- pure sim, fake sampler):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && bun -e "
    import * as J from './src/generators/journeys.ts';
    import { generateMesh } from './src/generators/mesh.ts';
    import { DESKTOP_LAYOUT as L } from './src/generators/layout.ts';
    const mesh = generateMesh([['ef',0.289],['cm',0.420],['cs',0.118],['gc',0.172]], L);
    const fake = { length: 500, pointAt: (d) => ({ x: 97 + d, y: 168 }) };
    const ts = [J.spawnTraveler('cm', fake, mesh)];
    let exits = 0;
    for (let i = 0; i < 4000 && ts.length; i++) exits += J.advanceTravelers(ts, 16, mesh, L.GATHER, L.STEM_END).stemExits;
    console.log('exits:', exits, 'remaining:', ts.length);"

Expect: `exits: 1 remaining: 0` -- one traveler traverses trace, mesh,
gather, stem within 64 simulated seconds and signals exactly one stem exit.

### Task 5 -- `Floor1Brain.tsx` input side: mesh, stations, disclosure, chains · `agent (session-tier, high)`

**Goal:** the section's static frame + the whole input side render and
respond: mesh, six stations with the addendum label patterns, hover chains,
click targets, dormant ghosts, growth docks. Heaviest task of the arc --
imperative-DOM-to-SolidJS port judgment lives here; where Solid idiom forces
a structural change, behavior and appearance still match the comp (P1).

**Files:** `src/components/Floor1Brain.tsx` (placeholder replaced).

**Steps:**
1. Section frame inside App's `#brain` section (Phase 2 owns the `<section>`
   wrapper): titleblock h1 `THE ORACLE IS <b>AWAKE</b>` (198); herolinks --
   `connect your agent` (`.herolink.go`, 202) always, `Why do I need this?`
   (201) ONLY when the `showWhyDoor` prop is true (P6; Task 8 wires the
   flag); cornernote tagline `30 years of QuakeWorld knowledge, routed to
   your agent or API.` (208, P8); the `stemext` div (`aria-hidden`, 206);
   the main SVG with `viewBox` from layout, `preserveAspectRatio="xMidYMid
   meet"`, and aria-label byte-identical to mockup 205: `Oracle
   architecture: sources feed the brain; MCP barrier and snapshot door serve
   consumers; the brainstem leads to the machine room below`.
2. SVG scaffolding: the `aglow` filter (feGaussianBlur stdDeviation 3.2 +
   merge, 374-377) and the six groups in the P7b-normative order (gDrops,
   gTrace, gMesh, gTop, gFx, gHit).
3. Render `generateMesh` output: edge paths (`#24466e`, width 1, opacity .5,
   446-447) then dots with their flags (class `meshdot`, `fire` class +
   `animation-delay` style where flagged).
4. Stations (`SRC` loop, 622-699), keyed by `id` against the manifest
   registry (D4): base trace via the trace builder (kind `in` for lit --
   base `#2a4a74` width 2 + `.sig` overlay `#4aa8ff` width 2.4 with aglow --
   kind `dim` dashed `3 7` `#1d3350` for dormant, 467-478); pad rect
   (626-627); seat -- lit: `#0d2036` disc, `#4aa8ff` ring, `#6fe3ff` core +
   ghost drop-curve to GATHER in gDrops (629-635); dormant: dashed `3 4`
   `#3c4a60` ring (636-638).
5. Station label group `g.major` (+`.dim` for dormant), `tabindex="0"`,
   `role="button"`, aria-label `name` (+ ` (dormant)` suffix, 640-641).
   **Center pattern** (horizontal stations -- addendum/P8): stack upward
   from `liney`: `stationSubs` lines bottom-up (line height 14), then `num`
   (lit only), then title; all `text-anchor: middle` at `cx`; num + subs
   carry class `detail` (hidden until reveal); transparent hover rect
   spanning the stack (644-666). **Side pattern** (vertical stations):
   title at anchor, num (or the literal `dormant`) at +19, sub at +33, both
   `detail`; 208-wide transparent rect (667-677). Subs come from
   `stationSubs` (fallback `[sub]`); dormant shows the single line
   `dormant` (643).
6. Hover/click chain (678-698): fat transparent hit path over the trace
   (stroke-width 16, `pointer-events: stroke`) in gHit; `chain(on)` toggles
   `reveal` on the label group + `hotbase` on the base trace + `hotseat` on
   the seat; wired on mouseenter/leave of BOTH group and hit path, plus
   focus/blur on the group. Hover-spawn (686-688) is wired in Task 9 (needs
   the runtime); leave the `chain` seam ready (`onChainHover(id, on)` up to
   the component root). Click + Enter/Space on group or hit path open the
   station's drill card (479-483, 697-698) -- drill opening arrives with
   Task 7; until then route through a stub prop.
7. Growth docks (701-717): two `opacity .7` groups -- dashed circle r10 +
   `+` glyph + `detail` label revealing on hover; copy exactly `new
   datacenters dock here` / `future consumers dock here`.
8. Registry grace (D4): a manifest datacenter id with no `SEATS`/`SRC` entry
   -> skip + `console.warn` (Open question 4); a layout id missing from the
   manifest -> skip silently (dock-shaped future).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "ORACLE IS\|dock here\|aglow" dist/assets/*.js

Expect: tsc + build clean, grep >= 3. Interaction verification is the
boundary ritual's (V2, V3, V5, V6).

### Task 6 -- `Floor1Brain.tsx` output side: gate, highway, snapshot door, brainstem · `agent (workhorse, high)` -- after Task 5 (same file)

**Goal:** everything right of the gather point renders and responds per
mockup 719-829.

**Files:** `src/components/Floor1Brain.tsx`.

**Steps:**
1. Gather + axon (735-737): green `a`-kind trace on `OUT.axon` with `s3`
   delay; `#52ffa8` gather dot r5 with aglow at `gpt`; junction dot r3.5 at
   `jn`.
2. Agent highway (738-739): `laneA` green answers-out pulse (`a`, `s2`,
   left-to-right toward the agent) and `laneQ` cyan questions-in pulse
   (`q`, no delay, right-to-left toward the gate) -- the two-way cue.
3. MCP gate `g.gate` (740-759): solid `#6fe3ff` arc + dashed `#2a4a74`
   counter-arc, port rect, the label `MCP` (17px bold, letter-spacing .2em);
   tool-channel reveal BESIDE the gate (addendum): three `detail` texts at
   x=926, y=350+i*15 -- exactly `search_solved_issues`, `get_concept_note`,
   `lookup_map` (750-756); hover toggles `reveal`; click/Enter opens the MCP
   card (Task 7 stub as in T5), aria-label `MCP`.
4. YOUR AGENT node (761-773): disc + core at `OUT.agent`, label `YOUR AGENT`
   with `detail` sub `any MCP client`; hover reveal; click opens the CONNECT
   card (P9 -- the same singular card as the hero CTA); aria-label `Your
   agent`.
5. Snapshot branch (775-813): green `a` trace on `OUT.snap` (visibly
   bypassing the gate); THIS PAGE node -- `#52ffa8`-ringed disc, label
   `THIS PAGE`, `detail` sub `you are here`, aria-label `This page, a
   snapshot consumer`; SLIPGATE APP ghost -- dashed dim circle, label
   `SLIPGATE APP`, `detail` sub `future · same door`, aria-label `Slipgate
   app (future consumer)`; the `detail` label `snapshot door` at
   `snapLblXY`; `snapChain` hover unifies all four (+ `hotbase` on the
   branch) from either node or the fat hit path; click THIS PAGE -> snapshot
   card, click ghost -> slipgate teaser card, click hit path -> snapshot
   card (807-813).
6. Brainstem (815-829): main `#2a4a74` 2.5-wide line GATHER->STEM_END, two
   `#1d3350` side rails at +-6 starting GATHER.y+18, green `.sig.s3` pulse
   overlay, green dot r5 at the stem head, and the mono label `brainstem ·
   the machines below ↓` at (x+14, STEM_END-25).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "YOUR AGENT\|any MCP client\|you are here\|snapshot door\|brainstem" dist/assets/*.js

Expect: tsc + build clean, grep >= 5.

### Task 7 -- drill system: overlay + datacenter cards · `agent (workhorse, high)`

**Goal:** click any chain target and a drill card zooms out of it, fed by
manifest data; esc / backdrop / X close it; P7c honors reduced motion.

**Files:** `src/components/DrillOverlay.tsx`,
`src/components/DatacenterCard.tsx`, `src/components/Floor1Brain.tsx`
(replace the T5/T6 stubs with real card state).

**Steps:**
1. `DrillOverlay` (mockup 321-353): props `originRect` (from the clicked
   element's `getBoundingClientRect()`), `label` (dialog aria-label),
   `wide?`, `onClose`, children. Renders `.drill` > `.backdrop` + `.dcard`
   with close button `.x` (aria-label `close`). Zoom-from-origin: card
   starts translated/scaled at the origin (`pre` class, transform to origin
   delta, opacity 0) and transitions to identity on the next frame
   (double-rAF, 336-338); close reverses (scale .7, 260ms, 350-352); under
   `reduced`, both are instant (330, 349). Document-level Escape listener
   attached on mount, removed on cleanup (1041-1043). Only one card open at
   a time -- opening replaces instantly (322).
2. `DatacenterCard` (buildCard, 296-320): lit card = `h3` name; headline
   `num.toLocaleString('en-US')` + `sub`; `bars` rows -- label, bar scaled
   to `max(2, round(v / max * 100))`%, en-US value (301-307); `stats` tiles
   -- en-US value over label (308-312); `notes` list (313); door line with
   prefix `door: ` (314) rendering the structured `Door` (Phase 1 contract,
   Open question 5 there): `kind: 'site'` -> `{label} → <code>{code}</code>`
   wrapped in a link to `href` (renders exactly the mockup's `browse the
   full reference → docs.quake.world`); `kind: 'agent'` -> `ask your agent →
   <code>{call}</code>` -- and per P9/D3 the agent-door line links into the
   CONNECT card (the funnel; in the mockup the equivalent affordance is the
   MCP card's `data-open` link, 275/342-344). Dormant card = `h3` name +
   chip `dormant` (297); headline = manifest `teaser`; footer line exactly
   `rendered dim on purpose — inspiration of where this grows, not a
   promise.` (317). Every card ends with the escnote `esc / click outside
   to close` (298/319).
3. Card state lives in `Floor1Brain` (floor-1-local UI): a signal holding
   `{ kind: 'dc'|'xn'|'why', id, originRect } | null`; T5/T6 click stubs now
   set it. `TBD-PHASE-6-fragment-urls` may lift this state later; keep the
   setter narrow.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "esc / click outside to close\|rendered dim on purpose" dist/assets/*.js

Expect: tsc + build clean, grep >= 2. Zoom/close behavior = ritual V6.

### Task 8 -- XN cards, singular CONNECT card, why-overlay (dark) · `agent (workhorse, medium)`

**Goal:** the four system cards + the comparison overlay exist with
byte-identical copy; the connect surface is singular (P9); the why door is
dark (P6).

**Files:** `src/components/XnCards.tsx`, `src/components/WhyCompare.tsx`,
`src/App.tsx` (flag read), `src/components/Floor1Brain.tsx` (wiring).

**Steps:**
1. `XnCards.tsx`: port the four XN card bodies byte-identical from mockup
   269-292 -- `mcp` (`MCP`, 270-275), `agent` (`CONNECT YOUR AGENT`,
   276-284), `snap` (`SNAPSHOT DOOR`, 285-289), `slip` (`SLIPGATE APP`
   dormant teaser, 290-291). The MCP card's `connect your agent →` door line
   (275) opens the CONNECT card in place (the mockup's `data-open`
   mechanism, 342-344) -- all three openers (hero CTA 868-870, YOUR AGENT
   node, MCP card link) reach the ONE card (P9). Two mockup copy lines embed
   drifting snapshot numbers (`— 20,270 community threads`, 272; `— 44
   curated notes`, 273): render these counts from the manifest -- notes from
   `cs.num`; threads from the raw field Open question 2 routes to Phase 1.
   Until that amendment lands this task is GATED on it for the one line
   (file the finding first, per Open question 2's default).
2. Endpoint copy ships byte-identical including `(illustrative in this
   mockup)` (277, and the boot-card sibling is Phase 4's) -- truth-up is
   Phase 6's final-copy pass (Open question 3, `TBD-PHASE-6-endpoint-truth`).
3. `WhyCompare.tsx`: port the COMPARE content byte-identical (842-864) --
   h3 `WHY DO I NEED THIS?`, the headline, the draftstamp `draft — final
   page shows verbatim captured answers, dated + model-labeled`, the four
   q/a column pairs (`agent alone` / `agent + oracle` column headers),
   escnote. Opens `wide` (866).
4. Dark wiring (P6): `App.tsx` reads the flag once --
   `new URLSearchParams(window.location.search).get('dev') === 'why'`
   (query-param precedent per Phase 2's `?data=force-fallback`; resolves
   `TBD-PHASE-3-overlay-flag`; Open question 1) -- and passes
   `showWhyDoor: boolean` to `Floor1Brain`. At rest the herolinks row
   renders ONLY `connect your agent`; with the flag, `Why do I need this?`
   renders before it (mockup order 200-203) and opens the overlay.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "WHY DO I NEED THIS?\|agent alone\|CONNECT YOUR AGENT\|illustrative in this mockup" dist/assets/*.js

Expect: tsc + build clean, grep >= 4 (the overlay RIDES the bundle, dark --
P6 verifies presence-in-bundle + absence-at-rest, ritual V9).

### Task 9 -- animation runtime: rAF loop, journeys, flicker, App wiring · `agent (workhorse, high)` -- after Tasks 4, 5, 6

**Goal:** ambient tracepoint journeys run end to end -- source trace, mesh
hops with dot flashes, gather, stem descent, stem-exit signal -- from the
single rAF loop; reduced motion kills all of it; App carries the handoff
seam.

**Files:** `src/components/Floor1Brain.tsx`, `src/App.tsx`,
`src/components/Floor2MachineRoom.tsx` (props interface only).

**Steps:**
1. `App.tsx`: read `reduced` once (`window.matchMedia('(prefers-reduced-
   motion: reduce)').matches`, mockup 240 -- no change listener, faithful);
   create the `stemExits` signal; set `data-stem-exits={stemExits()}` on the
   root div; pass `reduced` + `onStemExit` to Floor1 and `reduced` +
   `stemExits` to Floor2 per the handoff contract. Add the two optional
   props to `Floor2MachineRoom`'s props interface (body ignores them).
2. `Floor1Brain`: build `PathSampler`s from the six source-trace base-path
   refs after mount (`getTotalLength`/`getPointAtLength` need the element in
   the DOM -- install-time probe P-A below); one rAF loop advancing
   `advanceTravelers` with the 50ms dt clamp, rendering each traveler as its
   `<line>` glyph in gFx (`PULSE_*` constants), flashing touched mesh dots
   (`touch` class, `TOUCH_FLASH_MS`), and calling `onStemExit` per stem
   exit. Loop runs only while travelers exist (mockup 518, 571); cancel +
   clear on component cleanup (`onCleanup`) so HMR never doubles it.
3. Spawning: ambient interval `AMBIENT_INTERVAL_MS` cycling `AMBIENT_ORDER`
   + kickoff spawn of `cm` at `AMBIENT_KICKOFF_MS` (835-839); hover-spawn on
   lit-station chain hover, throttled per station by
   `HOVER_SPAWN_THROTTLE_MS` (684-689); both refuse when `reduced` or at
   `MAX_TRAVELERS` (509). Timers cleared on cleanup.
4. Reduced-motion sweep (P7c): with `reduced`, no spawns, no timers; CSS
   already halts `.sig`/`.fire` (Task 1); hover reveals still function (the
   mockup keeps them, transitions off).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "data-stem-exits" dist/assets/*.js && grep -c "requestAnimationFrame" src/components/Floor1Brain.tsx

Expect: tsc + build clean; `data-stem-exits` >= 1; the
`requestAnimationFrame` count is 1 or 2 -- the mockup's own faithful
one-loop pattern has two call sites (kickoff + self-rearm, lines 518/571);
if 2, BOTH must belong to the same self-contained loop function. A third
call site fails the one-rAF-loop discipline.

### Task 10 -- deploy + boundary run · `inline`

**Steps:** run the Phase 2 one-command redeploy
(`set -a; . ~/.secrets/cloudflare-pages.env; set +a; pnpm --dir
/home/dev/projects/quakeworld/apps/oracle-web run deploy`), then run the
automated boundary probes A1-A5 below, then stage the operator ritual
(serve the mockup, hand over both URLs + the checklist). Commit the subtree
at green probes; push at the checkpoint.

**Verification probe:** A1-A5 below; commit visible in
`git -C /home/dev/projects/quakeworld log --oneline -1 -- apps/oracle-web`.

## Phase-boundary verification

### Automated probes (arc-RUN; run in order)

1. **A1 -- build + types clean:**

       cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && pnpm run check && echo YES

   Expect `YES` -- YES/NO.

2. **A2 -- copy locks in the shipped bundle** (P8 spot checks; the why
   overlay must be IN the bundle even though dark -- P6):

       cd /home/dev/projects/quakeworld/apps/oracle-web && for s in "THE ORACLE IS" "any MCP client" "you are here" "snapshot door" "Why do I need this?" "WHY DO I NEED THIS?" "rendered dim on purpose" "esc / click outside to close" "30 years of QuakeWorld knowledge"; do grep -rlq "$s" dist/assets/ && echo "YES  $s" || echo "NO   $s"; done

   Expect nine `YES` -- YES/NO.

3. **A3 -- deployed URL serves the new bundle:**

       curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/
       ASSET=$(curl -s https://qw-oracle-web.pages.dev/ | grep -o '/assets/[^"]*\.js' | head -1); curl -s "https://qw-oracle-web.pages.dev$ASSET" | grep -c "data-stem-exits"

   Expect `200` and >= 1 (chunk-split fallback per Phase 2 probe 2) -- YES/NO.

4. **A4 -- generator determinism** (Task 3's probe, run twice more at the
   boundary): identical output both runs -- YES/NO.

5. **A5 -- dumb-component audit** (P4/P5):

       grep -rn "fetch(\|location.search" /home/dev/projects/quakeworld/apps/oracle-web/src/components/ /home/dev/projects/quakeworld/apps/oracle-web/src/generators/ | grep -v "^Binary" ; echo "exit=$?"

   Expect zero hits (`exit=1`) -- fetching stays in `data/`, URL parsing in
   `App.tsx` -- YES/NO.

### Operator visual-parity ritual (P1 -- side-by-side against the comp)

**Setup (Claude runs, then hands the operator two URLs):**

    python3 -m http.server 5174 --bind 0.0.0.0 --directory /home/dev/projects/quakeworld/docs/superpowers/specs

Operator opens, side by side, both windows wider than 900px:

- **Window A (comp):** `http://100.114.81.91:5174/2026-08-05-oracle-web-v1-mockup.html`
- **Window B (deploy):** `https://qw-oracle-web.pages.dev/`

(Port 5174 free at drafting time; if a traveldiary lane claims it, use 5173.
Both ports are conventionally traveldiary-web's preview lanes and the ONLY
ports the cockpit compose publishes to Tailscale -- if both are busy at
ritual time, any other port needs a compose addition + ops letter first;
coordinate with the operator rather than picking a random port. Kill the
server after the ritual.)

**Deviations-by-design -- the operator reads these FIRST; each is sanctioned,
anything else that differs is a finding:**

- D-a: the comp shows the `Why do I need this?` pill; the deploy at rest
  MUST NOT (P6). It appears only in V9's flag check.
- D-b: numbers differ -- the comp carries the 2026-08-05 snapshot, the
  deploy renders the live manifest (P2). Check FORMAT (en-US separators,
  placement), not values. Mesh dot counts may drift a few dots with live
  `share`.
- D-c: the comp's bottom-of-page mockupnote ("v4.7 skeleton ...") and its
  browser title ("Design Direction Explorer") are mockup meta -- not ported.
- D-d: floor 2 on the deploy is still the Phase 2 placeholder
  (`TBD-PHASE-4-machine-room-port`); only the stem handoff hook is checked
  (V11).
- D-e: the MCP card's thread/note counts on the deploy come from the live
  manifest (Open question 2), not the comp's `20,270` / `44`.

**Checklist -- every line answered YES/NO:**

- **V1 rest state:** title top-right `THE ORACLE IS AWAKE` with AWAKE in
  bold cyan; ONE pill (`connect your agent`, green); tagline bottom-left;
  no legends, no annotation text, no revealed numbers anywhere at rest (P8)
  -- matches comp (minus D-a).
- **V2 mesh:** dot field shape, density gradient per datacenter, edge curves,
  and the slow ambient flicker of scattered cyan dots all match the comp
  (D-b tolerance); with unchanged shares the scatter is dot-for-dot
  identical.
- **V3 station hover chains (walk all six):** hovering title OR trace lights
  the full chain -- trace brightens to solid blue, seat ring whitens, number
  + sub lines fade in. ENGINE FACTS / DISCORD / GAME CONTENT: centered title
  with details beneath it (DISCORD's sub split across two lines); CONCEPT
  NOTES / COMMUNITY HISTORY / MATCH STATS: side-anchored labels. Dormant
  pair reveals only the word `dormant`, in dim grey.
- **V4 hover spawns:** hover-holding a lit station launches a traveler down
  its trace within ~1s; repeat hovers are throttled (~1.1s), never a swarm.
- **V5 dormant ghosts:** COMMUNITY HISTORY + MATCH STATS render dashed
  traces + dashed seat rings; click opens the teaser card with the `dormant`
  chip, the manifest teaser text, and the `rendered dim on purpose` footer.
- **V6 drill cards (walk all four lit):** click zooms a card out of the
  station; ENGINE FACTS shows 7 codebase bars, DISCORD 4 channel bars (en-US
  values), GAME CONTENT three stat tiles, CONCEPT NOTES the highlight list;
  each ends in its door line (`door: browse the full reference →
  docs.quake.world` on ENGINE FACTS -- link opens the docs site; `door: ask
  your agent → <tool call>` on the other three); esc, backdrop click, and X
  all close with the shrink animation.
- **V7 output side:** green pulse runs gather -> axon -> junction; two lanes
  pulse in OPPOSITE directions (cyan toward the gate = questions in, green
  toward the agent = answers out); MCP gate arcs + port match; hovering the
  gate reveals the three tool names BESIDE it; hovering YOUR AGENT reveals
  `any MCP client`.
- **V8 singular connect (P9):** hero CTA, YOUR AGENT click, and the MCP
  card's `connect your agent →` link all open the SAME `CONNECT YOUR AGENT`
  card (endpoint + Claude / ChatGPT / CLI steps + paste-able prompt).
- **V9 why overlay dark (P6):** at rest no why door exists anywhere on the
  page; opening `https://qw-oracle-web.pages.dev/?dev=why` renders the
  `Why do I need this?` pill, which opens the wide comparison overlay --
  four question pairs, `agent alone` vs `agent + oracle` columns, the
  draftstamp visible; esc closes.
- **V10 snapshot branch:** hovering the branch (line or nodes) reveals
  `snapshot door` + `you are here` + `future · same door` together and
  brightens the branch -- it visibly bypasses the gate; THIS PAGE click
  opens the snapshot card; the slipgate ghost click opens its dormant
  teaser. Growth docks reveal their labels on hover.
- **V11 journeys + handoff:** left idle, a traveler launches every ~4s:
  runs its source trace, hops the mesh (touched dots flash cyan), pulls to
  the gather point, descends the brainstem ABOVE the stemext rails (P7b),
  and despawns at the bottom. Its pace matches the dash pulses on the traces
  -- one species, one speed (P7a). In devtools:
  `document.querySelector('[data-stem-exits]').dataset.stemExits` increases
  by 1 per completed descent (the Phase 4 seam, live).
- **V12 reduced motion (P7c):** with OS reduce-motion on (or devtools
  emulation), reload: no dash pulses, no flicker, no travelers, drill cards
  open/close instantly -- hover reveals and clicks still work.
- **V13 fold continuity:** scrolling to the fold, the stem + stemext line
  runs continuously into floor 2's section on the one gradient; snap
  behavior unchanged from Phase 2.
- **V14 single network call (P3/P5 re-audit):** Network tab shows exactly one
  non-asset request (the manifest), status 200.

All 14 YES = phase boundary passed. Any NO = finding in
`review-findings.md`, fix-or-amend before the boundary closes (P1: no silent
deviations).

## Outputs to next phase

**Phase 4 may rely on (the handoff contract, verbatim from the normative
section above):**

- **Module** `src/generators/journeys.ts` with the exported names/values as
  specified -- notably `PULSE_ADV_PER_MS`, `PULSE_TRAIL_UNITS`,
  `PULSE_STROKE`, `PULSE_STROKE_WIDTH`, `ROOT_LANDING_QUEUE`,
  `LAND_FLARE_MS`, and the `PathSampler` interface for floor 2's own root
  sampling.
- **Seam**: `Floor2MachineRoom` already receives `stemExits: number`
  (increments once per traveler finishing the stem; observable at
  `data-stem-exits` on the root div) and `reduced: boolean`. Phase 4 spawns
  one root traveler per increment per the contract's Phase-4 obligation.
- **Coordinate + z-order invariants**: trunk starts at `(clientWidth / 2, 0)`
  of `#machine-room`; roots SVG behind rack columns; no coordinates cross
  the fold.
- **Visual vocabulary**: the floor-1 CSS block (trace colors, `.sig`
  keyframes + delays, `aglow`) is in `app.css` for the rack/root skin to
  match; the P7c reduced-motion guard already covers floor 2's
  `.rk .rkd i.on.bl` selector.
- **Drill overlay**: `DrillOverlay` exists, but floor 2's terminal is NOT a
  drill card -- Phase 4 needs it only if it reuses the esc-close pattern.

**Phase 5 may rely on:** `BrainLayout` is the drop-in shape for a
`PORTRAIT_LAYOUT` (`TBD-PHASE-5-portrait-layout`); the mockup's portrait
branch (CSS 39-41, 169-185; JS `P === true` arms throughout `buildBrain`)
remains un-ported and is Phase 5's source; below 900px the Phase 3 deploy
renders the scaled desktop SVG (acceptable interim; the media-change rebuild,
mockup 832-834, is also Phase 5's -- `TBD-PHASE-5-portrait-rebuild`).

**Phase 6 may rely on:** drill-card state is held in one narrow signal in
`Floor1Brain` (`TBD-PHASE-6-fragment-urls` lifts it if deep-link fragments
demand); the why-door flag is `?dev=why` in `App.tsx`; the endpoint copy
truth-up marker is `TBD-PHASE-6-endpoint-truth` in `XnCards.tsx`.

## Open questions (default + who overrules)

1. **Why-overlay dev flag shape.** Default: `?dev=why`, read once in
   `App.tsx` (Phase 2's query-param precedent; components stay URL-blind per
   P4). Overrule: operator; Phase 6 may migrate it to its fragment scheme.
2. **MCP-card thread count has no raw manifest field.** The mockup's MCP
   card embeds `— 20,270 community threads` (line 272). Phase 1's outputs
   claim these numbers are "already derivable from cm/cs fields" -- true for
   notes (`cs.num` = 44) but NOT for threads: `cm.num` is the MESSAGE count;
   the thread count exists only inside emitter-composed display strings
   (`sub`/`stationSubs`). Parsing display strings is contract abuse. Default:
   route a finding to Phase 1 for a dated contract amendment adding raw
   thread (and, for symmetry, solved) counts to the `cm` datacenter; Task 8
   gates its one copy line on the amendment + re-emit + re-bake. Overrule:
   operator (may instead rule the MCP card drops the embedded counts -- a
   copy deviation logged as a dated amendment per P1/P8).
3. **Connect-card endpoint copy.** The mockup ships `Endpoint (illustrative
   in this mockup): https://oracle.quake.world/mcp` (line 277) and its
   client steps are flagged "drafts" by the mockupnote (231-233). The real
   endpoint depends on the MCP auth posture (spec amendment: decides ChatGPT
   reach) -- undecided at drafting time. Default: port byte-identical now
   (P1/P8; the page lives on the preview URL until the operator's
   tester-invite call), truth-up in Phase 6's final-copy pass. Overrule:
   operator.
4. **Unknown-id datacenter handling (D4 vs hardcoded layout).** The manifest
   registry is open, but seats/traces are hand-placed layout -- a NEW
   datacenter cannot be auto-placed. Default: skip + `console.warn`; a new
   datacenter needs a `layout.ts` entry (one commit, no redesign -- D4's
   actual promise). Overrule: operator; if this bites, route a finding to
   the ledger as a dated D4 clarification.
5. **Component decomposition granularity.** Default: the five component
   files named in Files touched. Overrule: implementer may fold/split WITHIN
   `src/components/` if the props-only discipline holds (record in
   `review-findings.md`); the generator module boundaries and every exported
   name in the handoff contract are NOT negotiable (Phase 4 cites them).

## Facts asserted on install-time / on-deploy probes (not verifiable read-only)

- **P-A (install-time):** `SVGPathElement.getTotalLength()` /
  `getPointAtLength()` on Solid-rendered paths require the element mounted;
  the `PathSampler` build therefore happens in `onMount`. Verified by Task
  9's first live run (symptom of violation: zero-length paths, travelers
  frozen at origin -- see Recovery).
- **P-B (install-time):** Solid `createSignal` + prop-getter reactivity for
  the `stemExits` counter (Phase 4's `on(() => props.stemExits, ...)`
  consumption pattern). Verified when V11's DOM counter increments.
- **P-C (on-deploy):** rendering ~150 SVG circles + 3 glow filters + one rAF
  loop holds 60fps on the operator's machine -- the self-contained mockup
  already does exactly this DOM load, so parity is expected, not proven,
  until V2/V11 run.
- **P-D (install-time):** JSX text nodes render `&`/`·`/`—` from manifest
  strings without entity handling (A2 + V6 confirm).

## Recovery

- **Visual mismatch found in the ritual:** classify first -- port bug (fix,
  re-run the V item) vs Solid-idiom-forced structure change (P1: behavior
  and appearance must still match; if truly forced, dated amendment in
  `decisions.md` under P1, never silent). Log either way in
  `review-findings.md`.
- **Mesh doesn't match the comp dot-for-dot (shares unchanged):** the LCG or
  the call order drifted. Check: seed 41; the exact LCG expression (no
  BigInt/imul "fix" -- Port discipline); seats pushed before scatter;
  datacenters iterated in manifest order; scatter before universal fill;
  adjacency built in point order. Dump `pts` from the Task 3 bun probe and
  diff against a browser-console dump from the mockup
  (`copy(JSON.stringify(...))` on a temporary hook) if it persists.
- **Travelers frozen at spawn / never arrive:** `PathSampler` built before
  mount (P-A) -- move to `onMount`; or `MAX_TRAVELERS` starved by a leak
  (see next).
- **Travelers accelerate or multiply after edits (dev):** HMR left a stale
  rAF loop or timer -- verify `onCleanup` cancels the frame AND clears both
  timers; a full reload clears the symptom, the fix is the cleanup.
- **`data-stem-exits` never increments:** check in order -- `reduced` true
  in the test browser? ambient timers wired (Task 9 step 3)? travelers
  reaching phase 4 (Task 4's pure-sim probe still green)? `onStemExit` prop
  actually passed in `App.tsx`?
- **Why overlay reachable at rest / not reachable with the flag:** the
  `showWhyDoor` prop chain (App -> Floor1) inverted or the URLSearchParams
  read landed in a component (A5 catches that). P6's boundary is BOTH
  directions: absent at rest AND working under the flag.
- **Jank on deploy (P-C fails):** profile before touching the SVG (grug:
  measure first). The comp runs the same DOM load smoothly -- suspect
  port-added reactivity (per-dot signals, effects in the rAF hot path)
  before suspecting SVG counts; render mesh dots as static JSX from the
  generator output, not reactive primitives.
- **Deploy pipeline failure:** Phase 2's `DEPLOYMENT.md` + its Recovery
  section own this (auth gate, wrangler version, rollback-by-redeploy).
- **Manifest shape surprise at render (missing `stationSubs`, door kind
  unknown):** contract drift -- do not patch around it in components; route
  a finding to Phase 1 (P2) exactly as Phase 2's recovery prescribes.
