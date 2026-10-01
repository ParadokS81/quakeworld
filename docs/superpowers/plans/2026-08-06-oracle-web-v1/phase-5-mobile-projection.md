# Phase 5 -- mobile projection (portrait <=900px)

**Arc:** oracle-web-v1. **Ledger:** `decisions.md` P1-P11 (load-bearing here:
P1 mockup-is-comp, P6 dark overlay, P7 animation rules -- "the mobile pass may
drop elements but never introduces a new motion species", P8 copy locks, P11
real-URL verification). **Spec:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` -- the addendum's
"First portrait projection (<=900px)" block (lines 283-290) is this phase's
core spec, including the unresolved Chrome device-mode-inside-artifact-panel
scroll quirk ("retest on the real deploy before chasing further"). **Comp:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7 -- the
comp INCLUDES the portrait projection; every `P`-flag branch is enumerated
below with its verified line ref). **Predecessors:** Phase 3's floor-1 port
(desktop branches only, by design) + Phase 4's floor-2 port -- their Outputs
sections are this phase's inputs.

**Path caveat:** `apps/oracle-web` does not exist at drafting time -- Phase 2
creates it, Phases 3-4 fill it. Every literal below touching
`apps/oracle-web/...` is an **arc-RUN-time literal**. Literals against the
mockup and the spec were smoke-tested read-only at drafting time (2026-08-06).

**Phase 4 status caveat:** Phase 4's doc was mid-check at this doc's drafting
time. Its content is treated as near-final; if Phase 4's checker changes
anything this doc mirrors (notably the roots-degrade guard or the floor-2 CSS
skip list), re-run this doc's Inputs probes and flag the delta as a finding --
do not silently adapt.

## Goal

Ship the mockup's first portrait projection (<=900px) on the real deploy:
floor 1 rebuilt on the portrait layout constants (viewBox `0 0 760 1240`,
1.55x scale, three-station crown, left-rail stations, outputs in the
bottom-right quadrant, docks + MCP tool-reveal dropped -- all per the comp's
`P === true` arms), floor 2 reflowed by the mockup's portrait CSS alone
(roots hidden -- Phase 4's traveler guard goes quiet with zero JS changes;
racks become two rows of three; terminal auto-height), the breakpoint wired
as a `matchMedia` signal in the App shell (the port's expression of the
mockup's `P` flag + its media-change rebuild, resolving
`TBD-PHASE-5-portrait-layout` and `TBD-PHASE-5-portrait-rebuild`), and the
spec's parked scroll quirk **adjudicated** on the deploy URL with a binary
decision rule. No new motion species, no new elements: the portrait pass
drops (docks, tool-reveal, roots) and rescales -- it never adds (P7). The
phase ends with `https://qw-oracle-web.pages.dev/` correct on the operator's
real phone in portrait (M-ritual green), the quirk recorded as either a
fixed page-CSS finding or a closed host-frame artifact-panel issue, and
desktop parity untouched (R-regression items re-run from Phases 3-4).

## The portrait fork inventory (normative -- every `P` branch in the comp)

The mockup computes one flag -- `var P = window.matchMedia("(max-width:
900px)").matches` (line 360) -- rebuilt on media change (832-834). Everything
that forks on it is listed here; anything NOT listed is shared between the
two projections and must not fork in the port.

### CSS (three blocks; Phase 2 already shipped the first)

- **Lines 166-168** -- `@media (max-width: 900px), (pointer: coarse) { html {
  scroll-snap-type: none; scroll-behavior: auto; } }`. **Already shipped by
  Phase 2** (its Task 2 shell CSS). This phase verifies presence and does NOT
  re-add it. Note the second arm: a coarse-pointer device WIDER than 900px
  (tablet landscape) gets snap-off + desktop layout -- comp behavior (Open
  question 1).
- **Lines 39-41** -- `svg.portrait` type overrides: `.majorlabel` 13px -> 22px,
  `.majornum` 16px -> 26px, `.majorsub` 10.5px -> 16px (the addendum's "~1.55x
  type"). Phase 3 Task 1 skipped these by design; this phase ports them.
- **Lines 169-185** -- the portrait block, skipped by Phase 3 Task 1 (39-41's
  sibling) and Phase 4 Task 1 (169-185 explicitly): `body { overflow-x:
  hidden }`; `html, body { touch-action: pan-y }`; `section.floor { overflow:
  visible; scroll-snap-align: none }`; `#brain svg.main, svg.roots {
  touch-action: pan-y }`; titleblock centered full-width at top 2.5% with
  `h1 { white-space: normal }`; cornernote moved UNDER the title (top
  `calc(2.5% + 2.6rem)`, centered, tag `white-space: nowrap` at
  `clamp(.66rem, 2.9vw, .9rem)` -- the "tagline top full-width one row");
  herolinks to `bottom: 4%` centered (CTAs bottom-center); `svg.roots {
  display: none }` (triggers Phase 4's traveler guard); `.rackcol` static
  `flex-direction: row` with 8px gap + 3vw padding; `.rk { min-height:
  110px }`; `.termwrap { width: 94vw }`; `.term { height: auto; min-height:
  380px }`.
- Line 186 (`.qa` single-column at 820px) is already Phase 3 Task 1's --
  not this phase's.

### JS -- floor 1 (`buildBrain` `P` arms; port target = `layout.ts` + `Floor1Brain.tsx`)

Constants that fork (desktop value | portrait value, mockup line):

| Fork | Desktop | Portrait | Line |
|---|---|---|---|
| svg class `portrait` toggled | off | on | 363 |
| viewBox | `0 0 1200 800` | `0 0 760 1240` | 364 |
| `S` (stroke/dot scale) | 1 | 1.55 | 386 |
| `GATHER` | `{x:600, y:542}` | `{x:380, y:742}` | 387 |
| `STEM_END` | 800 | 1240 | 388 |
| `LOBES` | `[[580,380,150,125],[690,370,110,100],[610,480,95,60]]` | `[[370,560,165,140],[455,550,115,105],[395,665,100,60]]` | 389-390 |
| `SEATS` | ef 505,330 r9 · cm 655,425 r11 · cs 600,292 r7 · gc 530,468 r8 · ch 720,310 r6 · ms 640,512 r6 | ef 296,484 r13 · cm 470,590 r16 · cs 390,455 r11 · gc 286,654 r12 · ch 310,456 r9 · ms 360,722 r9 | 398-404 |
| `MIN_DIST` | 26 | 34 | 408 |
| scatter per-share dot budget | `round(110 * share)` | `round(80 * share)` | 419 |
| scatter sigma base | `45 + 55*share` | `55 + 55*share` | 420 |
| unattributed fill count | 40 | 26 | 428 |
| unattributed fill box | `390+rnd()*430, 220+rnd()*350` | `200+rnd()*380, 415+rnd()*320` | 431-432 |
| `SRC` station array | effective order ef, cm, cs, gc, ch, ms; modes center/center/side/center/side/side | order cs, ch, cm, ef, gc, ms; ALL `mode: 'center'` | 589-619 |
| station label metrics | lh 14 · bottomPad 6 · numGap 18 · titleGap 2 · hover rect 220x(+20) at cx-110, top -14 | lh 22 · bottomPad 12 · numGap 28 · titleGap 6 · hover rect 260x(+30) at cx-130, top -24 | 642, 645, 650-651, 664-665 |
| growth docks | two rows (703-704) | NONE (`if (!P)`) | 702 |
| `OUT` output-side block | 728-734 values | 720-727 values (whole output side relocated to the bottom-right quadrant) | 720-734 |
| MCP label font | 17 | 26 | 748 |
| MCP tool-reveal (3 tool names) | present at x=926, y=350+i*15 | NONE (`if (!P)`) | 750-756 |
| agent/tp/sg node radius scale | x1 | x1.2 (agent 15/6, tp 9/3.5, sg 8 all scaled) | 763, 765, 780, 782, 789 |
| agent sub dy | +16 | +24 | 768 |
| THIS PAGE / SLIPGATE label anchor | `start` | `end` (labels sit LEFT of the nodes) | 783, 791 |
| tp/sg sub dy | +15 | +22 | 785, 793 |
| `snapshot door` label font | 10 | 15 | 796 |
| brainstem label offset / font | STEM_END-25 / 10.5 | STEM_END-60 / 15 | 827-828 |

The portrait `SRC` geometry (589-601) IS the addendum's layout: the
three-station crown across the top -- by cx left-to-right COMMUNITY HISTORY
(cx 140), CONCEPT NOTES (cx 350), DISCORD (cx 630), titles above nodes (the
addendum lists the same three in `SRC`-array order cs/ch/cm, not positional
order -- the comp wins on position, P1); ENGINE FACTS (liney 512), GAME
CONTENT (752), MATCH STATS (944) entering from the left edge below it;
outputs + snapshot branch in the bottom-right quadrant; brainstem at x=380
descending to 1240.

**Explicitly SHARED (must not fork):** the LCG + seed 41 (366-367 -- a fresh
`generateMesh` call restarts at 41, so the portrait scatter is exactly as
deterministic as the desktop one); sigma share-multiplier 55 and y-compression
0.8 (420, 424); 3000-try caps (421, 429); adjacency k=2 + midpoint jitter 24
(442-444); dot radius/fill/fire rules incl. `FIRE_MOD` (452-465); ALL
journey constants -- `PULSE_ADV_PER_MS` 0.073, capture radius 95 (unscaled by
S, line 539), `MAX_HOPS` 11, `MAX_TRAVELERS` 6, hover throttle 1100, ambient
4200/700/order (486-580, 835-839); trace-delay cycle `["", "s2", "s3", "s2"]`
(621 -- the portrait array ORDER differs, so stations pick up different
delays purely by index: comp behavior, free); trace colors; glyph trail 10
local units (x S); flash 450ms; the `.stemext` div CSS (56-60); floor-2
`ROOT_LANDING_QUEUE` / `LAND_FLARE_MS`. `journeys.ts` is NOT touched by this
phase -- the Phase 3 handoff contract stays frozen.

**The S-multiplication sweep (part of the fork, easy to miss):** every
stroke-width and radius the mockup writes as `<n> * S` scales at 1.55 in
portrait. Sites: mesh edge width 1*S (447); dot radii 4.2/2.7*S (457); trace
widths 2*S base / 2.4*S sig (469-476); dim trace 2*S (469); traveler glyph
2.4*S stroke + 10*S trail (514, 565-566); seat ring 2*S + core
`max(2.5, r - 5*S)` (631-632); drop-curve 1*S (635); dormant ring 1.4*S
(638); hit strokes 16*S (679, 806); gather dot 5*S, junction 3.5*S
(736-737); gate arcs 2*S / 1.6*S, port stroke 1.4*S (741-746); agent ring
2*S (764); tp ring 2*S (781); sg ring 1.6*S (790); brainstem 2.5*S main /
1*S rails / 2.4*S sig / 5*S head dot (817-826). Phase 3's handoff contract
already documents `PULSE_STROKE_WIDTH` and `PULSE_TRAIL_UNITS` as "x S (S = 1
on desktop)"; Task 2 audits that the implementation actually multiplies.

### JS -- floor 2: NO fork

`buildRack`, `layoutRoots`, the terminal, and the root-traveler machinery
carry zero `P` branches (872-1039). Portrait floor 2 is pure CSS (169-185)
plus the guard Phase 4 already ships: `stemExit` refuses when
`getComputedStyle(rootsSvg).display === 'none'` (997-998) -- Phase 4's
Outputs promise this verbatim ("Phase 5 hides the SVG and the handoff
consumer goes quiet with zero JS changes"). `Floor2MachineRoom.tsx` is NOT
touched by this phase. (The mockup's resize->`layoutRoots` still runs against
the hidden SVG in portrait -- harmless, comp behavior, keep.)

### The rebuild seam

The mockup listens on the media query and re-runs `buildBrain()` wholesale on
change (832-834): the SVG is wiped, the traveler array (`FXp`, function-local,
486) and hover-throttle map start fresh, in-flight travelers are dropped. The
port reproduces exactly these semantics by REMOUNTING `Floor1Brain` on flag
change (Task 4). One sanctioned micro-difference: the mockup's ambient spawn
timer lives OUTSIDE `buildBrain` (835-839) and keeps its phase across
rebuilds, while Phase 3 Task 9 placed the timers inside `Floor1Brain` -- so
the port's ambient cadence restarts from kickoff on a flip. Behaviorally
invisible (one ~0.7s kickoff beat); recorded as ritual deviation D-h, not a
finding.

## Inputs from previous phase

Mirrored from Phase 3's and Phase 4's "Outputs to next phase" (probes run at
phase start, arc-RUN time):

- **Both floors complete on the deploy URL** (Phase 4): floor-2 elements
  carry the mockup's class names so the 169-185 rules drop onto matching
  selectors. Verify:
  `curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/`
  -> `200`;
  `grep -c "rackcol\|termwrap\|\.rk \|svg.roots\|\.roots" /home/dev/projects/quakeworld/apps/oracle-web/src/styles/app.css`
  -> >= 4.
- **`BrainLayout` is the drop-in shape** (Phase 3): `layout.ts` exports
  `DESKTOP_LAYOUT: BrainLayout`; nothing portrait exists yet. Verify:
  `grep -c "BrainLayout\|DESKTOP_LAYOUT" /home/dev/projects/quakeworld/apps/oracle-web/src/generators/layout.ts`
  -> >= 2, and
  `grep -rin "portrait" /home/dev/projects/quakeworld/apps/oracle-web/src/` -> zero hits.
- **Roots degrade by CSS alone** (Phase 4): the computed-style guard is in
  the traveler spawner. Verify:
  `grep -c "getComputedStyle" /home/dev/projects/quakeworld/apps/oracle-web/src/components/Floor2MachineRoom.tsx`
  -> >= 1.
- **The 166-168 touch/narrow snap guard** (Phase 2): already in the shell
  CSS -- this phase must not duplicate it. Verify:
  `grep -c "pointer: coarse" /home/dev/projects/quakeworld/apps/oracle-web/src/styles/app.css`
  -> exactly `1`.
- **The journey handoff seam** (Phase 3): `data-stem-exits` on the root div;
  `journeys.ts` constants frozen. Verify:
  `grep -c "data-stem-exits" /home/dev/projects/quakeworld/apps/oracle-web/src/App.tsx` -> >= 1.
- **Environment-read discipline** (Phases 2-3): `matchMedia` /
  URLSearchParams reads live ONLY in `App.tsx`. Verify:
  `grep -rn "matchMedia" /home/dev/projects/quakeworld/apps/oracle-web/src/components/ /home/dev/projects/quakeworld/apps/oracle-web/src/generators/`
  -> zero hits.
- **Deploy pipeline** (Phase 2): the one-command redeploy in
  `apps/oracle-web/DEPLOYMENT.md`.

Drafting-time environment facts (probed 2026-08-06 on this box):

- Mockup readable at
  `/home/dev/projects/quakeworld/docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html`
  (1045 lines; every line ref above verified against it).
- Spec addendum block verified at
  `docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` lines 283-290,
  including "Real-phone check passed" (prior evidence for the quirk
  adjudication's expected outcome) and the retest instruction.
- `python3` 3.12.13 and `bun 1.3.11` on PATH; cockpit ports 5173/5174
  published to Tailscale (Phase 3 ritual caveats apply if the desktop
  side-by-side is re-staged).

## Files touched

**Created:** none. (PORTRAIT_LAYOUT lives in the existing `layout.ts` -- one
module owns both projections of one shape.)

**Modified (all inside `apps/oracle-web/src/`):**

- `generators/layout.ts` -- `BrainLayout` type extended with the fields
  Phase 3 left as component/generator literals (Task 2 table);
  `DESKTOP_LAYOUT` gains those fields at its current values;
  `PORTRAIT_LAYOUT` added (Task 3)
- `generators/mesh.ts` -- scatter literals (110 / 45 / 40 / fill box) become
  reads from the layout param (signature `generateMesh(litShares, layout)`
  unchanged)
- `components/Floor1Brain.tsx` -- hardcoded desktop metrics replaced by
  layout reads; `portrait` class on the SVG from the layout; docks +
  tool-reveal render only when the layout carries them; S-sweep audit
- `App.tsx` -- portrait `matchMedia` signal + remount wiring
- `styles/app.css` -- portrait blocks appended (mockup 39-41, 169-185)

**NOT touched (binding):** `generators/journeys.ts` (Phase 3 contract,
frozen), `components/Floor2MachineRoom.tsx`, `components/Rack.tsx`,
`components/TerminalTopics.tsx`, `components/DrillOverlay.tsx` /
`DatacenterCard.tsx` / `XnCards.tsx` / `WhyCompare.tsx` (the drill/card
system is already width-responsive: `.dcard` is `min(660px, 94vw)`, mockup
126 -- phone usability is verified, not re-implemented), `generators/roots.ts`,
everything in `data/`. **Deleted:** none. **Outside the subtree:** nothing.

## Tasks

**Split-feasibility ruling (tripwire): NOT HIT.** Five tasks, doc near the
phase median. One phase, one doc; ruling recorded so the arc log shows the
check ran.

Wave structure: T1 (CSS) is independent; T2 -> T3 -> T4 are sequential (T3
needs T2's extended type; T4 needs both layouts); T5 closes with the deploy,
the quirk adjudication, and the ritual staging.

### Task 1 -- portrait CSS port · `agent (workhorse, low)`

**Goal:** the comp's portrait visual rules exist in `app.css`; nothing is
duplicated.

**Files:** `src/styles/app.css` (append one labeled block; one-line addition
to the floor-1 block).

**Steps:**
1. Confirm (do not add) the Phase 2 guard: exactly one
   `@media (max-width: 900px), (pointer: coarse)` rule exists.
2. Append `/* ===== PORTRAIT (mockup 39-41, 169-185) ===== */`: the three
   `svg.portrait` type overrides (39-41) and the full 169-185 block verbatim
   (inventory above -- including `svg.roots { display: none }`, which is what
   flips Phase 4's traveler guard). Port the block as-is; do NOT "improve"
   `touch-action` / `overflow-x` values -- they are quirk-adjudication
   subjects (Task 5) and P1-bound until adjudicated.
3. Nothing from 186-192 is touched (Phase 3 owns 186 and the reduced-motion
   guards).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && grep -c "svg.portrait" src/styles/app.css && grep -c "pointer: coarse" src/styles/app.css && grep -c "touch-action: pan-y" src/styles/app.css && pnpm build

Expect: `svg.portrait` >= 3, `pointer: coarse` exactly 1, `touch-action`
>= 2, build clean.

### Task 2 -- de-hardcode: the desktop literals move into `BrainLayout` · `agent (workhorse, high)`

**Goal:** every value in the fork inventory that Phase 3 shipped as a literal
inside `mesh.ts` or `Floor1Brain.tsx` becomes a `BrainLayout` field, with
`DESKTOP_LAYOUT` carrying today's values -- so Task 3's `PORTRAIT_LAYOUT` is
a pure data drop-in. Desktop output must be bit-identical before/after.

Phase 3's Outputs said "`BrainLayout` is the drop-in shape for a
`PORTRAIT_LAYOUT`" -- that holds for the fields Task 2 of Phase 3 transcribed
(VIEWBOX, S, GATHER, STEM_END, LOBES, SEATS, MIN_DIST, SRC, OUT, DOCKS,
FIRE_MOD), but the inventory shows more forks living as literals in Phase 3's
steps: mesh scatter params (its Task 3), label metrics, tool-reveal coords,
node scale, side anchors, fonts (its Tasks 5-6). This task closes that gap.
It is additive-only against Phase 3's shipped interface -- no exported name
changes, no `journeys.ts` touch.

**Files:** `src/generators/layout.ts`, `src/generators/mesh.ts`,
`src/components/Floor1Brain.tsx`.

**Steps:**
1. Extend `BrainLayout` (names indicative; keep them once chosen -- Task 3
   and the probes use them): `portrait: boolean` (drives the SVG's
   `portrait` class, mockup 363); `SCATTER_PER_SHARE` (110),
   `SIGMA_BASE` (45), `UNI_WANT` (40), `UNI_BOX` (`{x0:390, dx:430, y0:220,
   dy:350}`) -- consumed by `mesh.ts` in place of its literals (mockup 419,
   420, 428, 431-432); `LABEL` metrics object (`lh:14, bottomPad:6,
   numGap:18, titleGap:2, rectHalfW:110, rectW:220, rectTopPad:14,
   rectHPad:20` -- mockup 642, 645, 650-651, 664-665); `OUT` gains
   `mcpFont:17`, `toolReveal: {x:926, y0:350, dy:15} | undefined`,
   `nodeScale:1`, `agentSubDy:16`, `sideAnchor:'start'`, `sideSubDy:15`,
   `snapLblFont:10` (mockup 748, 750-756, 763-796); `STEM_LBL` (`{dy:25,
   font:10.5}`, mockup 827-828).
2. `mesh.ts`: replace the four scatter literals with layout reads. Nothing
   else changes -- LCG, ordering, adjacency untouched (Phase 3 Port
   discipline stands).
3. `Floor1Brain.tsx`: replace the corresponding hardcoded metrics with
   layout reads; render docks only over `layout.DOCKS` entries (empty array
   = none -- expresses mockup 702); render the tool-reveal only when
   `layout.OUT.toolReveal` is present (expresses 750); toggle the SVG class
   `portrait` from `layout.portrait` (363).
4. S-sweep audit: walk the S-multiplication site list in the inventory and
   confirm each rendered width/radius multiplies by `layout.S` (or the
   `journeys.ts` "x S" contract note) rather than baking `S = 1`. Fix any
   baked-in value found; log which were baked as a one-line note in
   `review-findings.md` (drift measurement, not blame).
5. Re-run Phase 3's Task 3 determinism probe UNCHANGED and diff against a
   pre-change run captured in step 0 (`bun` probe output to a scratch file
   before editing): byte-identical mesh output proves the refactor moved
   values without changing them.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && bun -e "
    import { DESKTOP_LAYOUT as L } from './src/generators/layout.ts';
    console.log(L.portrait === false, L.SCATTER_PER_SHARE, L.SIGMA_BASE, L.UNI_WANT,
      L.LABEL.lh, L.OUT.mcpFont, L.OUT.nodeScale, L.OUT.sideAnchor, L.OUT.toolReveal !== undefined, L.STEM_LBL.dy)"

Expect: tsc + build clean; `true 110 45 40 14 17 1 start true 25`. Plus the
step-5 determinism diff: identical.

### Task 3 -- `PORTRAIT_LAYOUT`: transcribe the comp's `P === true` arms · `agent (workhorse, medium)` -- after Task 2

**Goal:** `layout.ts` exports `PORTRAIT_LAYOUT: BrainLayout` -- a pure
transcription of the fork-inventory table's portrait column, line-cited in
comments like `DESKTOP_LAYOUT` is.

**Files:** `src/generators/layout.ts`.

**Steps:**
1. `portrait: true`; `VIEWBOX = '0 0 760 1240'` (364); `S = 1.55` (386);
   `GATHER = {x:380, y:742}` (387); `STEM_END = 1240` (388); portrait
   `LOBES` (389); portrait `SEATS` (398-401); `MIN_DIST = 34` (408);
   `SCATTER_PER_SHARE = 80`, `SIGMA_BASE = 55`, `UNI_WANT = 26`,
   `UNI_BOX = {x0:200, dx:380, y0:415, dy:320}` (419-432).
2. Portrait `SRC` (589-601): six entries in mockup order cs, ch, cm, ef, gc,
   ms, ALL `mode: 'center'`, path `d` / `pad` / `cx` / `liney` verbatim.
   (No transcription quirk here -- unlike the desktop array, the portrait
   array is clean; the `if (!P)` fixups at 613-619 are desktop-only and
   already handled by Phase 3.)
3. Portrait `LABEL` (`lh:22, bottomPad:12, numGap:28, titleGap:6,
   rectHalfW:130, rectW:260, rectTopPad:24, rectHPad:30`).
4. Portrait `OUT` verbatim (720-727) + `mcpFont:26`, `toolReveal: undefined`,
   `nodeScale:1.2`, `agentSubDy:24`, `sideAnchor:'end'`, `sideSubDy:22`,
   `snapLblFont:15`.
5. `DOCKS = []` (702); `FIRE_MOD` identical to desktop (shared, 453);
   `STEM_LBL = {dy:60, font:15}` (827-828).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && bun -e "
    import { PORTRAIT_LAYOUT as L } from './src/generators/layout.ts';
    import { generateMesh } from './src/generators/mesh.ts';
    const modes = L.SRC.map(s => s.label.mode).join(',');
    console.log(L.portrait, L.S, L.GATHER.x, L.STEM_END, L.SRC.map(s=>s.id).join(','), modes, L.DOCKS.length, L.OUT.toolReveal === undefined, L.OUT.sideAnchor);
    const shares = [['ef',0.289],['cm',0.420],['cs',0.118],['gc',0.172]];
    const a = generateMesh(shares, L), b = generateMesh(shares, L);
    console.log(a.pts.length, JSON.stringify(a.pts) === JSON.stringify(b.pts));"

Expect: tsc clean;
`true 1.55 380 1240 cs,ch,cm,ef,gc,ms center,center,center,center,center,center 0 true end`;
portrait `pts.length` in 92..112 (6 seats + up to 80 share-scattered + 26
fill; rejection sampling may fall short), determinism `true`.

### Task 4 -- breakpoint wiring: the `P` flag as a matchMedia signal + remount · `agent (workhorse, medium)` -- after Task 3

**Goal:** the port's expression of mockup lines 360 + 832-834: a reactive
portrait flag in the App shell selecting which layout `Floor1Brain` mounts
with; a flag flip rebuilds floor 1 wholesale (the comp's own semantics).

**Files:** `src/App.tsx`.

**Steps:**
1. In `App.tsx` (the shell -- environment reads stay out of components, P4 /
   Phase 3 discipline): create the flag as a signal wired to the media query,
   with the change listener the mockup itself uses (832-834) plus Solid
   cleanup:

       const pq = window.matchMedia('(max-width: 900px)');
       const [portrait, setPortrait] = createSignal(pq.matches);
       const onPq = (e: MediaQueryListEvent) => setPortrait(e.matches);
       pq.addEventListener('change', onPq);
       onCleanup(() => pq.removeEventListener('change', onPq));

   (The mockup's legacy `addListener` fallback, 834, is dropped: the port's
   browser floor is whatever runs the SolidJS bundle, and `addEventListener`
   on MediaQueryList is standard there -- a sanctioned support-floor
   deviation, recorded in this step; it needs no ritual D-label since no
   ritual item can observe it.)
2. Mount floor 1 through Solid's `<Show>` control-flow component -- NOT a
   raw JSX ternary (cold review CR-SPEC-4) -- so a flip disposes and
   recreates the component: travelers, samplers, timers, and hover state
   reset exactly as the mockup's `buildBrain()` re-run does (SVG wipe +
   fresh `FXp`, 362 + 486):

       <Show
         when={portrait()}
         fallback={<Floor1Brain layout={DESKTOP_LAYOUT} ...same props... />}
       >
         <Floor1Brain layout={PORTRAIT_LAYOUT} ...same props... />
       </Show>

   Why `<Show>` over the ternary: `<Show>` is Solid's documented primitive
   for conditional mounting and owns the reactive-scope boundary explicitly,
   so the disposal of the outgoing branch (and with it `onCleanup` for the
   rAF loop, the ambient interval, and the `PathSampler` refs) is the
   framework's contract rather than an inference about how a ternary's
   reactive scope happens to behave. A leaked branch here does not fail
   loudly -- it double-runs the animation loop -- so the predictable
   primitive is worth the two extra lines. Solid control-flow docs:
   https://docs.solidjs.com/reference/components/show . If the port needs
   the outgoing branch's state genuinely destroyed rather than reused, use
   `<Show keyed>`; verify the actual disposal behavior at install-time probe
   P-A rather than trusting either form on faith.

   Both branches receive the same `reduced` / `onStemExit` / `manifest` /
   `showWhyDoor` props. The `stemExits` signal lives in App and survives the
   flip (the counter keeps counting across orientations -- fine; floor 2's
   spawn guard is what gates portrait, not the counter). Install-time probe
   P-A covers the disposal semantics.
3. `Floor2MachineRoom` gets NO new prop -- portrait floor 2 is CSS +
   Phase 4's computed-style guard (Open question 3).
4. If Phase 3 shipped `Floor1Brain` importing `DESKTOP_LAYOUT` internally
   rather than taking a `layout` prop, add the prop now (default
   `DESKTOP_LAYOUT`) -- interface-additive, no other caller exists.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "matchMedia" src/App.tsx && grep -rn "matchMedia" src/components/ src/generators/ ; echo "exit=$?" ; grep -c "0 0 760 1240" dist/assets/*.js dist/assets/*.css 2>/dev/null | grep -v ":0" | head -1

Expect: tsc + build clean; `matchMedia` in App.tsx == 2 (reduced-motion +
portrait, nowhere else -- the grep over components/generators returns zero
hits, `exit=1`); the portrait viewBox string present in the bundle.

### Task 5 -- deploy, scroll-quirk adjudication, boundary staging · `inline`

**Steps:**
1. Run the Phase 2 one-command redeploy (`set -a; .
   ~/.secrets/cloudflare-pages.env; set +a; pnpm --dir
   /home/dev/projects/quakeworld/apps/oracle-web run deploy`).
2. Run automated probes A1-A6 below.
3. Run the desktop-regression probe sets (R-auto below).
4. Stage the quirk adjudication + real-phone ritual with the operator: hand
   over `https://qw-oracle-web.pages.dev/`, the Q-rule, and the M-checklist.
5. Record the quirk verdict in `review-findings.md` (both outcomes get an
   entry -- adjudicated-closed is a disposition, not an omission). Commit the
   subtree at green probes; push at the checkpoint.

**The scroll-quirk decision rule (Q -- normative):**

Context: during mockup rounds, drag-scrolling in Chrome device mode failed
while the mockup ran inside the claude.ai artifact panel; the spec parked it
as "suspected host-frame drag capture, not page CSS -- retest on the real
deploy before chasing further" and separately records "real-phone check
passed" on the mockup. Nobody chases anything before this rule runs.

- **Q1 (authority -- real phone):** operator's phone, portrait, directly on
  `https://qw-oracle-web.pages.dev/` -- does a vertical swipe scroll the page
  smoothly from the top of floor 1 to the bottom of floor 2 and back?
- **Q2 (diagnostic -- device mode off the artifact panel):** desktop Chrome,
  DevTools device emulation (any phone preset), same URL in a normal tab --
  does drag-scroll work?

| Q1 | Q2 | Verdict |
|---|---|---|
| YES | YES | Quirk does NOT reproduce on the real deploy -> confirmed artifact-panel host-frame issue. Record in `review-findings.md` as adjudicated-closed; no code change; done. |
| NO | any | Quirk IS page behavior -> a finding to FIX IN THIS PHASE. Suspects in order (all Task 1 ports): `touch-action: pan-y` on html/body/SVGs (mockup 171, 173), the 166-168 snap guard interplay, `section.floor { overflow: visible }` (172), `body { overflow-x: hidden }` (170). Minimal CSS fix, logged; re-run Q1+Q2, then the M-ritual. |
| YES | NO | Page scrolls on real hardware but not in emulation -> record as adjudicated-closed with the emulation caveat noted (real phone is the authority; P11 verifies on real devices). No code change; optionally note upstream. |

**Verification probe:** A1-A6 + R-auto green; quirk entry present in
`review-findings.md`; commit visible in
`git -C /home/dev/projects/quakeworld log --oneline -1 -- apps/oracle-web`.

## Phase-boundary verification

### Automated probes (arc-RUN; run in order)

1. **A1 -- build + types clean:**

       cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && pnpm run check && echo YES

   Expect `YES` -- YES/NO.

2. **A2 -- portrait artifacts in the bundle:**

       cd /home/dev/projects/quakeworld/apps/oracle-web && grep -rlq "0 0 760 1240" dist/assets/ && grep -rlq "svg.portrait" dist/assets/ && grep -rlq "touch-action" dist/assets/ && echo YES

   Expect `YES` -- YES/NO.

3. **A3 -- no duplicated snap guard:**

       grep -c "pointer: coarse" /home/dev/projects/quakeworld/apps/oracle-web/src/styles/app.css

   Expect exactly `1` -- YES/NO.

4. **A4 -- determinism, both projections:** re-run Task 2's step-5 diff
   (desktop, byte-identical to the pre-phase capture) and Task 3's portrait
   probe (twice, identical) -- YES/NO.

5. **A5 -- environment-read + dumb-component audit (extended):**

       grep -rn "fetch(\|location.search\|matchMedia" /home/dev/projects/quakeworld/apps/oracle-web/src/components/ /home/dev/projects/quakeworld/apps/oracle-web/src/generators/ | grep -v "^Binary" ; echo "exit=$?"

   Expect zero hits (`exit=1`) -- YES/NO.

6. **A6 -- deployed URL serves the portrait-capable bundle:**

       curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/
       ASSET=$(curl -s https://qw-oracle-web.pages.dev/ | grep -o '/assets/[^"]*\.js' | head -1); curl -s "https://qw-oracle-web.pages.dev$ASSET" | grep -c "0 0 760 1240"

   Expect `200` and >= 1 (chunk-split fallback per Phase 2 probe 2; if the
   string lands in a CSS/other chunk, widen the grep across
   `curl`-fetched assets before calling NO) -- YES/NO.

### Operator real-phone ritual (P11 -- the phase's verification floor)

**Setup:** none on the phone -- the operator's phone opens
`https://qw-oracle-web.pages.dev/` directly (public CF Pages URL). For the
optional comp side-by-side, the operator's DESKTOP runs the Phase 3 serve
command (`python3 -m http.server 5174 --bind 0.0.0.0 --directory
/home/dev/projects/quakeworld/docs/superpowers/specs`, Tailscale caveats as
in Phase 3) with Chrome device mode at a <=900px width -- the phone is not
assumed to reach the Tailscale comp URL.

**Deviations-by-design (read first; Phase 3's D-a/D-b/D-c and Phase 4's
D-f/D-g stand at phone width too; anything else that differs from the comp's
portrait rendering is a finding):**

- **D-h:** the ambient journey cadence restarts (~0.7s kickoff beat) after a
  rotation/width flip -- the comp's module-level timer keeps its phase across
  rebuilds; the port's timers live in the remounted component. In-flight
  travelers are dropped on a flip in BOTH comp and port.
- **D-i:** at rest the bottom-center CTA row holds ONE pill (`connect your
  agent`) -- the comp shows two; the why door is dark (P6, D-a's portrait
  sibling).

**M-checklist -- every line answered YES/NO on the real phone, portrait:**

- **M1 frame:** title `THE ORACLE IS AWAKE` centered at the top (wrapping
  allowed), the tagline on ONE row directly beneath it, the green CTA pill
  bottom-center. No horizontal scroll anywhere on the page.
- **M2 crown:** three stations across the top -- left to right COMMUNITY
  HISTORY / CONCEPT NOTES / DISCORD -- titles ABOVE their nodes, traces
  descending into the mesh; station type visibly larger than desktop
  (~1.55x).
- **M3 left rail:** ENGINE FACTS, GAME CONTENT, MATCH STATS enter from the
  left edge below the crown, top to bottom in that order.
- **M4 mesh + stem:** the dot mesh sits lower-center; the brainstem descends
  from the gather point down the center to the floor's bottom; ambient
  travelers spawn and ride trace -> mesh -> stem at the same pace as the
  dash pulses (P7a); NO growth docks and NO MCP tool-name reveal exist
  anywhere (dropped by design).
- **M5 output quadrant:** MCP gate (large `MCP` label), YOUR AGENT, and the
  snapshot branch (THIS PAGE + SLIPGATE APP ghost + `snapshot door` label)
  all sit in the bottom-right quadrant; THIS PAGE / SLIPGATE APP labels sit
  LEFT of their nodes.
- **M6 tap targets:** tapping each of the six stations opens its drill card
  (lit -> data card, dormant -> teaser); the card fits the screen, scrolls
  internally if long, and closes via the X and via backdrop tap (no esc on a
  phone).
- **M7 connect card:** the CTA pill opens the CONNECT card; endpoint, client
  steps, and the paste-able prompt are readable at phone width with no
  page-level horizontal overflow.
- **M8 floor 2:** scrolling down -- two rows of three racks (row 1 ENGINE
  FACTS / CONCEPT NOTES / COMMUNITY HISTORY, row 2 DISCORD / GAME CONTENT /
  MATCH STATS), then the full-width terminal at content height; NO root
  lines visible and NO root travelers ever (the guard live); rack tap swaps
  the terminal card + `sel` highlight; all 7 cards readable; door links open
  the GitHub landmarks in a new tab.
- **M9 scroll feel:** one continuous vertical scroll across both floors --
  no snap fighting, no stuck regions, no sideways rubber-banding. (This is
  also quirk probe Q1.)
- **M10 rotation (MULTI-rotation -- a single flip does not prove disposal):**
  rotate portrait->landscape->portrait->landscape, at least FOUR crossings,
  pausing ~10s on each side. Expect after every crossing: the projection
  rebuilds, travelers reset, and the ambient cadence is UNCHANGED from the
  first portrait load -- roughly one traveler launching every ~4s, never
  visibly faster. Then leave it idle 30s and watch. **The failure this item
  exists to catch is a leaked branch**: an undisposed `Floor1Brain` keeps its
  rAF loop and ambient interval alive, so each rotation ADDS a loop and the
  spawn rate multiplies (2x after one bad flip, 4x after two) -- doubled
  glyphs, travelers moving in lockstep pairs, rising CPU/fan. A one-rotation
  check cannot distinguish "disposed correctly" from "leaked once", which is
  why this is now a multi-rotation item (cold review CR-SPEC-4). Also check
  the console for errors and `data-stem-exits` still incrementing sanely
  (one increment per traveler reaching the stem end, not bursts). If the
  phone's landscape width stays <=900px, no crossing occurs -- portrait
  persisting is correct behavior; answer YES and note that the disposal path
  went unexercised on this device (P-A stays open, verified on the desktop
  resize path instead).
- **M11 quirk adjudication:** the Q-rule (Task 5) has been run and its
  verdict row recorded in `review-findings.md`.

### Desktop regression (both floors untouched at >900px)

- **R-auto:** re-run Phase 3's automated probes A1-A5 and Phase 4's probes
  1-6 verbatim -- all green -- YES/NO. (Task 2's refactor is the risk
  surface; these sets already cover copy locks, doors, seams, and audits.)
- **R-op (consolidated -- cold review, operator load):** operator re-runs, in
  a desktop window wider than 900px against the deploy, exactly SIX items:
  Phase 3 **V2, V3, V7, V10, V11** plus Phase 4 **F7** -- all YES.

  The set is chosen by what Task 2's refactor actually moves, not by
  familiarity: **V2** mesh (scatter params -- `uniWant`, `minDist`, sigma,
  fill counts), **V3** station hover chains, walking all six (label metrics
  -- line height, pads, hover-rect geometry), **V7** output side (node scale,
  gate arcs, tool-reveal coordinates, MCP font), **V10** snapshot branch
  (tp/sg label anchors, sub `dy`, label font) -- **V10 was missing from the
  earlier list and is the only ritual item that observes roughly half the
  literals Task 2 lifts into `BrainLayout`**, which is precisely the gap the
  cold review found. **V11** journeys + handoff guards the P7a species and
  the stem seam; **F7** is the one floor-2 item retained, because the fold is
  where portrait CSS could bleed across floors.

  Dropped from the earlier ten with reasons, not by trimming: V1 rest state
  and V6 drill cards (copy and card content are untouched by a
  layout-constant lift, and A2's copy-lock grep re-runs automatically in
  R-auto); Phase 4's F1/F3/F6 (floor 2 has ZERO JS forks in portrait -- its
  rules are pure CSS inside a `max-width` media query, and Phase 4's probes
  1-6 re-run in R-auto regardless).

  V2 carries extra teeth here: with unchanged shares the desktop mesh must
  still be dot-for-dot identical to the comp (A4's visual twin).

All M + R items YES = phase boundary passed. Any NO = finding in
`review-findings.md`, fix-or-amend before the boundary closes (P1: no silent
deviations).

## Outputs to next phase

**Phase 6 may rely on:**

- **The portrait projection is live** on the deploy URL and keyed entirely
  off `PORTRAIT_LAYOUT` + the appended CSS block: the ship pass's a11y /
  reduced-motion / perf sweep must run at BOTH widths, and every floor-1
  geometry/type value it might touch now lives in `layout.ts`, not in
  component literals.
- **The scroll quirk is adjudicated** -- a dated entry in
  `review-findings.md` states which Q-verdict row fired and what (if
  anything) changed. Phase 6 does not reopen it without new evidence.
- **The breakpoint seam is one signal in `App.tsx`** (`portrait`), media
  query `(max-width: 900px)` -- if `TBD-PHASE-6-fragment-urls` or the a11y
  sweep needs width awareness, consume that signal; never a second
  matchMedia read in a component (A5 enforces).
- **Regression harness:** A1-A6 here + the R-auto union are the arc's full
  automated probe set to date; the ship pass re-runs them as its baseline.
- Unchanged and still Phase 6's: `TBD-PHASE-6-endpoint-truth`,
  `TBD-PHASE-6-fragment-urls`, the `● ALL LAYERS UP` question (Phase 4 Open
  question 3).

## Open questions (default + who overrules)

1. **Coarse-pointer devices wider than 900px (landscape tablets) get the
   DESKTOP layout with snap off** (the comp's own split: 166-168 gates snap
   on width-OR-coarse, the JS `P` flag on width only, mockup 360). Hover
   reveals on such a device need tap-and-hold or fire alongside the click --
   comp behavior. Default: comp-faithful, no special handling. Overrule:
   operator (a touch-specific projection would be a P1 amendment, likely
   post-arc).
2. **If the quirk is page CSS (Q-rule row 2), how far may the fix deviate
   from the comp's portrait CSS?** Default: minimal edit to the ported block,
   logged as a dated P1 amendment (the comp demonstrably mis-scrolls in that
   world, so fidelity to it is not a virtue on that line). Overrule:
   operator.
3. **`Floor2MachineRoom` gets no `portrait` prop.** Default: CSS + Phase 4's
   computed-style guard cover floor 2 entirely (Phase 4's Outputs promise
   exactly this). Overrule: implementer via a finding if a real portrait
   floor-2 JS need surfaces at run time -- with the finding explaining why
   CSS could not carry it.
4. **Layout-flip semantics: in-flight travelers dropped, ambient cadence
   restarted (D-h).** Default: sanctioned -- the comp drops travelers on
   rebuild too; the cadence restart is the one micro-difference and it is
   invisible. Overrule: operator (hoisting the timers to App would erase it;
   not worth the seam by default).
5. **New `BrainLayout` field names (Task 2).** Default: the names given in
   the task, chosen once, used by Task 3 and the probes. Overrule:
   implementer may rename during Task 2 ONLY if Task 3 + probe literals are
   updated in the same commit (they ship in the same phase; nothing external
   consumes them -- unlike the frozen `journeys.ts` names).

## Facts asserted on install-time / on-deploy probes (not verifiable read-only)

- **P-A (install-time):** a `<Show>` branch switch disposes the old
  `Floor1Brain` (running `onCleanup`: rAF, timers, listeners) and mounts a
  fresh one. This is `<Show>`'s documented contract
  (https://docs.solidjs.com/reference/components/show), but "documented" is
  not "observed in THIS component": verify it at install time by flipping the
  desktop viewport across 900px repeatedly with the animation running, and
  confirm the spawn cadence does not multiply. Cold review CR-SPEC-4 flagged
  the original raw-ternary wiring as the weaker form for exactly this
  disposal path. Symptoms of violation: doubled travelers / runaway rAF after
  a flip -- the multi-rotation M10 and Recovery both key on that signature.
- **P-B (install-time):** `matchMedia('(max-width: 900px)')` fires its
  `change` event on phone rotation across mobile browsers. The mockup proves
  desktop resize (832-834); phone rotation is verified at M10.
- **P-C (on-deploy):** portrait at S=1.55 holds acceptable frame rates on a
  real phone. The spec records the mockup's real-phone check as passed --
  expected, not proven, until M4/M9.
- **P-D (on-deploy):** the operator's phone reaches `qw-oracle-web.pages.dev`
  (public URL, no tailnet needed). Checked at ritual start; a failure here is
  network, not page (see Recovery).
- **P-E (install-time):** how many S-multiplication sites Phases 3-4 baked as
  `S = 1` literals is unknown until Task 2's audit runs -- the audit is
  designed to make the answer irrelevant (all sites end up reading
  `layout.S`).
- **The quirk's cause** is by construction unknowable until Task 5's Q-rule
  runs on the deploy -- that is the point of the adjudication.

## Recovery

- **Portrait renders but mis-matches the comp's portrait (geometry/type):**
  diff `PORTRAIT_LAYOUT` field-by-field against the fork-inventory table
  (every value line-cited); then check the S-sweep (a baked `S=1` shows as
  hairline strokes at 1.55x type). Comp reference: open the mockup in Chrome
  device mode at <=900px width.
- **Desktop regressed after Task 2 (R items fail):** the refactor changed a
  value while moving it -- diff `DESKTOP_LAYOUT`'s new fields against the
  table's desktop column; A4's byte-identical requirement localizes mesh
  drift to `mesh.ts`'s four moved literals.
- **Doubled travelers / runaway animation after rotation (M10 fails):** P-A
  violated -- an rAF loop or timer escaped `onCleanup` in `Floor1Brain`;
  Phase 3's HMR recovery applies verbatim. A full reload clears the symptom;
  the fix is the cleanup.
- **No relayout on rotation:** P-B -- confirm the `change` listener is on the
  MediaQueryList (not `resize`), and that the phone's landscape width
  actually crosses 900 CSS px (many phones stay under it -- that is M10's
  sanctioned no-flip case, not a bug).
- **Root lines visible / root travelers appear in portrait:** the
  `svg.roots { display: none }` rule missing or out-scoped (Task 1), or
  Phase 4's computed-style guard regressed -- check `getComputedStyle` is
  read on the SVG element itself, and that the CSS selector matches the
  ported class exactly.
- **Page scrolls badly on the phone:** do NOT start editing CSS -- run the
  Q-rule first (Task 5). Only its row-2 verdict authorizes touching the
  ported portrait block, and then minimally with a dated amendment.
- **Phone cannot load the URL:** P-D -- verify from desktop (A6), then the
  phone's network (captive portal / DNS). Not a page finding.
- **Drill/connect card unusable at phone width (M6/M7 fail):** measure
  before patching -- the comp's own card CSS (`min(660px, 94vw)`, 86vh cap)
  is width-responsive and un-forked; a failure is more likely page-level
  horizontal overflow (M1's check) than card CSS. Fix the overflow source;
  card-CSS deviation would be a P1 amendment.
- **Deploy pipeline failure:** Phase 2's `DEPLOYMENT.md` + Recovery own it.
