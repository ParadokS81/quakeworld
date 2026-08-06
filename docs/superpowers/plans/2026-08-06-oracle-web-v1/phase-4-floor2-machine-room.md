# Phase 4 -- floor 2: the machine room

**Arc:** oracle-web-v1. **Ledger:** `decisions.md` P1-P11 (load-bearing here:
P1 mockup-is-comp, P7 animation rules, P8 naming/copy locks, P9
doors/zoom-stop). **Spec:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` -- the 2026-08-06
amendment's "Floor 2 = machine room as root system" block + the rounds-4.5-4.7
addendum (naming locks apply to racks + terminal subsystem headers). **Comp:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7; every
behavior in this doc carries its mockup line range, verified 2026-08-06).
**Skeleton:** Phase 2's app-skeleton contract. **Handoff:** Phase 3's
journey-handoff contract (`phase-3-floor1-brain.md`, normative section) --
consumed here WITHOUT renegotiation.

**Path caveat:** `apps/oracle-web` does not exist at drafting time -- Phase 2
creates it, Phase 3 fills floor 1. Every literal below touching
`apps/oracle-web/...` is an **arc-RUN-time literal**, consistent with Phase 2's
skeleton diagram and Phase 3's files. Literals against the mockup, the spec,
the live GitHub URLs, and this repo were smoke-tested read-only at drafting
time (2026-08-06).

## Goal

Port floor 2 of the mockup -- the machine room as root system -- into the
skeleton at full parity (P1): the roots SVG (center trunk fanning into
per-rack root curves, dashed dim roots to dormant racks), six racks in
floor-1 skin flanking the dominant full-height FIELD TERMINAL (no expand
toggle -- the terminal owns the real estate), rack click loading
concept-altitude subsystem copy into the terminal with the rack's root
lighting hot, the terminal boot screen AS the connect quickstart, and root
travelers wired to Phase 3's `stemExits` handoff -- one fresh glyph per stem
exit, same species, same speed, landing on the queued rack with a flare
(P7a). PLUS the arc's main content-authoring task: the terminal topic card
set at stable-concepts altitude, each lit card dooring OUT to the public
GitHub repo at stable landmarks only (P9). The phase ends with BOTH floors
complete on the real deploy URL (`https://qw-oracle-web.pages.dev/`),
rack/terminal interactions matching the comp in the operator's side-by-side
ritual, fold-crossing continuity verified live, and the terminal content
passed through the named operator content-review checklist (this phase's
verification floor: operator-run copy review).

## Local decisions (this phase's calls, within the ledger)

### The glow filter gets its own id in the roots SVG

The mockup's root traveler sets `filter="url(#aglow)"` (line 1007) and leans
on document-wide id resolution to reach the `#aglow` filter DEFINED INSIDE the
floor-1 brain SVG (mockup 374-377). That is a cross-component coupling the
port must not reproduce: Floor2 would silently depend on Floor1's internal
SVG, and a duplicate `id="aglow"` in two SVGs is invalid HTML (first-match
resolution). Ruling: the roots SVG defines its OWN filter, identical
parameters (feGaussianBlur stdDeviation 3.2 + merge), under id `aglowR`;
travelers reference `url(#aglowR)`. Visual result identical (P1 appearance
holds); the components stay independent (P4).

### Two rAF loops total is the comp's own architecture

Phase 3's "one rAF loop" discipline is floor-1-scoped: the mockup itself runs
a SECOND, self-contained loop for root travelers (`rstep`, lines 1013-1039,
self-rearming at 1038, parking `rtRun = false` when empty). Floor 2 owns
exactly that one loop -- kicked off on spawn (1011), parked when no travelers
remain. This is not a P7a violation: P7a is about visual species and speed
(both imported from `journeys.ts`), not loop count. A third loop anywhere on
the page IS a violation.

### Terminal topic numbers interpolate from the manifest; prose is byte-identical

The mockup's terminal copy embeds 2026-08-05 snapshot numbers in authored
prose ("741,128 Discord messages ... 20,270 topic-coherent threads",
886-888). Per P2 the manifest is number truth and per Phase 3's precedent
(ritual items D-b/D-e: prose bytes identical, digits live), every figure with
a raw manifest field renders live via `toLocaleString('en-US')`:

| Mockup figure (line) | Manifest source |
|---|---|
| ef "11,081 documented entities" (883) | `ef.num` |
| cm "741,128 Discord messages" (888) | `cm.num` |
| cm "20,270 topic-coherent threads" (888) | `cm.threads` (Phase 1 amendment 2026-08-06) |
| cm "6,666 threads carry a solved resolution" (888) | `cm.solved` (same amendment) |
| cs "44 concept notes" (893) | `cs.num` |
| gc "254 maps" (897) | `gc.num` |
| gc "514 mechanics" (897) | `gc.stats` row labeled `mechanics` |
| gc "76 entity definitions" (897) | `gc.stats` row labeled `entity defs` |

The `gc.stats` lookups key by the label strings (`maps` / `mechanics` /
`entity defs`), byte-pinned as emitter config by the concurrent Phase 1
label-pin amendment (2026-08-06; Phase 1's number-sources table defines
exactly these rows) -- contract values, not parsed display strings. Figures with NO raw field stay
static prose: "Seven C codebases" (883 -- drifts only on codebase
onboarding, itself an emitter+copy event) and "18,000+" (904 -- qw-stats
territory, static by Phase 1's own ruling on the `ms` teaser). Open
question 2 covers the overrule paths. Rack faces need no interpolation
judgment: `rkn` = `fmt(num)`, `rks` = manifest `sub` as delivered (cm's sub
already carries threads/solved, emitter-composed).

### Topic copy home: one component module, mockup structure preserved

Terminal card bodies live in `src/components/TerminalTopics.tsx` as JSX
keyed by `'boot' | datacenter id` -- the same pattern as Phase 3's
`XnCards.tsx` (static site copy as component content, links and `<code>`
spans in markup, zero fetching). The mockup's `.mut` / `code` / `.door2`
class vocabulary is CSS ported in Task 1, so the JSX reproduces the exact
rendered structure. Decomposition latitude per Phase 3 Open question 5:
implementer may fold/split within `src/components/` if the props-only
discipline holds; the topic SET and copy in "The terminal topic set" below
are NOT implementer-negotiable (operator-review-gated instead).

## The terminal topic set (normative -- the content-authoring contract)

The spec amendment orders "6-10 cards at stable-concepts altitude, repo
doors". The mockup-of-record resolves that range at **7 cards**: the boot
screen plus one card per rack (`TOPICS`, mockup 873-905). No card beyond the
six racks is addable without a click surface the comp does not have -- the
set is closed at 7 for this arc.

**Altitude rule** (binding for ported truth-ups and new authoring alike):
cards carry stable concepts -- what a subsystem IS and why it works that way
-- never implementation detail that rots (no file names beyond the door
itself, no counts lacking a manifest field, no library versions, no schema
columns). The mockup's own `ef` card states the rule in-copy: "concept
altitude here; the fine detail lives in the repo, always current:" (884). The
doors carry the detail-burden: each lit card doors OUT to the public repo at
a **stable landmark only** (P9 / spec: app README / extractors / load-chat /
concept-notes) -- directories whose existence survives refactors, never a
source file or line anchor.

**Per-card shape** (the mockup's, made explicit for authoring):
- **Header**: `SUBSYS NN — <NAME>` in bold, name matching the P8 rack name
  in parenthetical or full form exactly as the mockup renders it; dormant
  cards append the muted suffix `· no power`.
- **Body**: 2-4 sentences at the altitude above, live-interpolated figures
  per the Local decision table; optionally one muted aside line (`.mut`).
- **Door**: lit cards end in a `.door2` block linking one stable landmark;
  dormant cards have NO door (nothing to read yet -- Open question 1).

**The set** -- every URL below curl-probed 2026-08-06, all `HTTP 200`, no
redirects; the repo root is this monorepo's own `origin`
(`git@github.com:ParadokS81/quakeworld.git`) and every door path exists in
the local tree:

| Card | Terminal header (mockup lines) | Door target | Status |
|---|---|---|---|
| `boot` | `CONNECT YOUR AGENT` (874-880) | `https://github.com/ParadokS81/quakeworld` → `apps/qw-oracle` | mockup-ported, finished |
| `ef` | `SUBSYS 01 — EXTRACTION (Engine Facts)` (881-885) | `https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/scripts/extractors` | mockup-ported, finished |
| `cm` | `SUBSYS 02 — MEMORY INGEST (Discord)` (886-890) | `https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/scripts/load-chat` | mockup-ported, finished |
| `cs` | `SUBSYS 03 — SYNTHESIS (Concept Notes)` (891-894) | `https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/curated/concept-notes` | mockup-ported, finished |
| `gc` | `SUBSYS 04 — GAME CONTENT` (895-898) | `https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle` (app README landmark) | mockup-ported, finished |
| `ch` | `SUBSYS 05 — COMMUNITY HISTORY · no power` (899-901) | none (dormant) | mockup-ported, finished |
| `ms` | `SUBSYS 06 — MATCH STATS · no power` (902-904) | none (dormant) | **STUB -- newly authored below** |

**Stub enumeration:** `ms` is the mockup's one stub -- a single line
duplicating the manifest teaser ("18,000+ recorded 4on4 games await their
wiring.", 904). Every other card is finished draft copy. `boot`'s endpoint
snippet ships byte-identical INCLUDING the `(illustrative)` marker (876) --
Phase 3 Task 8 already scoped this sibling to Phase 4; truth-up is Phase 6's
(`TBD-PHASE-6-endpoint-truth`).

**Newly authored `ms` body (DRAFT -- the operator content review is the
acceptance gate, per-claim sources: spec D5's Match Stats entry):**

> **SUBSYS 06 — MATCH STATS** *· no power*
> 18,000+ recorded 4on4 games already sit in the qw-stats database, with hub
> match data beside them. This rack powers on when their wiring into the
> brain is designed — the hook-in shape is still open. Rendered dark on
> purpose — where this grows, not a promise.

(Three sentences; the closing line reuses the dormant-honesty formula the
`ch` card and floor 1's dormant drill cards already carry -- one voice for
one rule. The `18,000+` figure is static per the Local decision.)

**Terminal chrome copy locks (byte-identical, P1/P8):** header
`QW ORACLE — FIELD TERMINAL` + status badge `● ALL LAYERS UP` (mockup
221-222; `&#9679;` renders as `●`); footer `click a rack · esc closes cards`
+ `door:` link to `github.com/ParadokS81/quakeworld` (225-226); floor header
`The Machine Room · what the brain runs on · click a rack` (215) -- Phase 2's
skeleton deliberately shipped this WITHOUT the trailing `· click a rack`
clause (no racks existed to click); this phase completes it. Dormant rack
face: num `—` (site-supplied -- Phase 1 contract omits `num` on dormant) over
the literal `dormant · awaiting power` (961). The mockup's `.mockupnote`
block (229-234) is mockup meta -- NOT ported (Phase 3 ritual item D-c's
floor-2 sibling).

## Inputs from previous phase

Mirrored from Phase 3's "Outputs to next phase" (each line's probe runs at
phase start -- arc-RUN time):

- **Module `src/generators/journeys.ts`** with the exported names/values as
  specified in Phase 3's handoff contract -- notably `PULSE_ADV_PER_MS`
  (0.073), `PULSE_TRAIL_UNITS` (10), `PULSE_STROKE` (`#4aa8ff`),
  `PULSE_STROKE_WIDTH` (2.4), `ROOT_LANDING_QUEUE` (`['cm','ef','gc','cs']`),
  `LAND_FLARE_MS` (650), and the `PathSampler` interface for floor 2's own
  root sampling. Verify:
  `grep -c "PULSE_ADV_PER_MS\|ROOT_LANDING_QUEUE\|LAND_FLARE_MS\|PathSampler" /home/dev/projects/quakeworld/apps/oracle-web/src/generators/journeys.ts`
  -> >= 4.
- **Seam**: `Floor2MachineRoom` already receives `stemExits: number`
  (increments once per traveler finishing the stem; observable at
  `data-stem-exits` on the root div) and `reduced: boolean` -- optional
  props added by Phase 3, ignored by the Phase 2 placeholder body. Verify:
  `grep -c "stemExits" /home/dev/projects/quakeworld/apps/oracle-web/src/App.tsx /home/dev/projects/quakeworld/apps/oracle-web/src/components/Floor2MachineRoom.tsx`
  -> >= 1 in each.
- **Coordinate + z-order invariants**: trunk starts at `(clientWidth / 2, 0)`
  of `#machine-room`; roots SVG behind rack columns (`z-index: 0` vs the
  columns' `2`, terminal `3` -- mockup 65, 78, 99); **no coordinates cross
  the fold** -- floor 2 spawns a fresh glyph, never receives floor-1
  positions. (Precision note, mockup-faithful: the glyph spawns at
  `getPointAtLength(0)` of the target ROOT path, i.e. `(cx, 44)` where the
  trunk fans out (1002 + 942); the trunk segment y 0-44 carries its own
  ambient `.sig` pulse (929). The contract's invariants -- trunk anchored at
  horizontal center, event-only handoff -- hold exactly; this pins the
  spawn point to the comp's actual behavior.)
- **Visual vocabulary**: the floor-1 CSS block (trace colors, `.sig`
  keyframes + `s2`/`s3` delays, aglow) is in `app.css` for the rack/root
  skin to match; the P7c reduced-motion guard ALREADY covers floor 2's
  `.rk .rkd i.on.bl` selector (Phase 3 Task 1 step 3 -- do not re-add).
  Verify: `grep -c "i.on.bl" /home/dev/projects/quakeworld/apps/oracle-web/src/styles/app.css` -> >= 1.
- **Drill overlay**: `DrillOverlay` exists, but floor 2's terminal is NOT a
  drill card -- this phase does not use it (the terminal is in-flow; esc
  continues to close floor-1 cards only, matching the comp).

From Phase 2 (still binding): the skeleton homes (`src/components/`,
`src/generators/`, `src/styles/app.css`), the `#machine-room` section wrapper
owned by `App.tsx`, `loadManifest()` called exactly once with `manifest`
arriving via props, and the deploy pipeline
(`apps/oracle-web/DEPLOYMENT.md`). From Phase 1: the manifest fields this
floor renders -- `id/name/lit/num/sub` + `cm.threads`/`cm.solved` (2026-08-06
amendment) + `gc.stats` -- and the dormant-omits-num/sub rule.

Drafting-time environment facts (probed 2026-08-06 on this box):

- Mockup readable at
  `/home/dev/projects/quakeworld/docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html`
  (1045 lines; all line refs in this doc verified against it).
- **All five door URLs return `HTTP 200`, no redirects** (curl -sI,
  2026-08-06): repo root + `/tree/main/apps/qw-oracle` +
  `.../scripts/extractors` + `.../scripts/load-chat` +
  `.../curated/concept-notes`. The corresponding directories exist in the
  local tree, and `origin` IS `git@github.com:ParadokS81/quakeworld.git` --
  the doors point at this monorepo's public mirror. Landmark-stability is an
  argument, not a guarantee: these four paths are the spec's named stable
  landmarks precisely because they are top-level app/pipeline directories
  that refactors preserve; the run-time probe (boundary probe 4) re-checks.
- `python3` 3.12.13 on PATH (parity-ritual serve command); ports 5173/5174
  published to Tailscale per the cockpit compose (same caveats as Phase 3's
  ritual: re-check occupancy at run time).
- `bun 1.3.11` on PATH (pure-generator probes, no Vite toolchain needed).

## Files touched

**Created (all inside `apps/oracle-web/src/` -- Phase 2 skeleton homes):**

- `generators/roots.ts` -- pure root-geometry generator (trunk, rootlets,
  per-rack root curves + sig delay classes) over measured rack anchors
- `components/Rack.tsx` -- one rack: title/num/sub/dot-grid face, sel/land
  states, a11y (fold-latitude per the Local decision)
- `components/TerminalTopics.tsx` -- the 7 topic card bodies (normative set
  above) + `FieldTerminal` chrome (header, body slot, footer)

**Modified:**

- `components/Floor2MachineRoom.tsx` -- placeholder replaced by the full
  port (resolves Phase 2's `TBD-PHASE-4-machine-room-port` and Phase 3's
  `TBD-PHASE-4-root-travelers`); consumes the `stemExits`/`reduced` props
  Phase 3 wired
- `styles/app.css` -- floor-2 CSS block appended

**Deleted:** none. **Outside the subtree:** nothing (deploy uses the Phase 2
pipeline as-is). `App.tsx` needs NO touch -- Phase 3 already passes both
props.

## Tasks

**Split-feasibility ruling (tripwire): NOT HIT.** Six tasks (well under the
~10 threshold), doc size near the phase-doc median. One phase, one doc; the
recorded ruling exists so the arc log shows the check ran.

Wave structure: T1 + T2 + T3 are mutually independent (parallelizable); T4
needs T1's CSS classes and T3's card set; T5 needs T2 + T4 and Phase 3's
live seam; T6 closes. (Every "after Task N" points backward -- numeric
dispatch order is safe.)

### Task 1 -- floor-2 CSS port · `agent (workhorse, low)`

**Goal:** the comp's floor-2 visual vocabulary exists in `app.css`.

**Files:** `src/styles/app.css` (append one labeled block).

**Steps:**
1. Port mockup lines 62-120 verbatim as a `/* ===== FLOOR 2 (mockup 62-120)
   ===== */` block: `#machine-room` flex column (63-64), `svg.roots` at
   z-index 0 (65), the root path classes `trunk` / `root` / `rootlet` /
   `dimroot` / `rootsig` / `hotroot` (66-72), `.mrhead` (73-76), `.rackcol`
   + `.left`/`.right` (77-79), the `.rk` family -- base/hover/`sel`/`land`
   (80-85), `rkt`/`rkn`/`rks` (86-89), the `rkd` dot grid + `@keyframes
   dotBlink` + `on`/`f2`/`bl` (90-96), `.rk.off` (97-98) -- and the
   terminal: `.termwrap` z-index 3 (99), `.term` full-height
   `calc(100svh - 170px)` column (100-105), `.hd`/`.ok` (106-109), `.body`
   + its `b`/`.mut`/`code`/`a` vocabulary (110-114), `.door2` (115), `.ft`
   (116-118). SKIP `.mockupnote` (119-120 -- mockup meta, not ported) and
   the floor-2 portrait rules (169-185: `svg.roots { display: none }`,
   rackcol row layout, term auto-height -- `TBD-PHASE-5-portrait-layout`).
2. Do NOT touch the reduced-motion block: Phase 3 already shipped the
   `.rk .rkd i.on.bl` guard (mockup 189). Verify presence, add nothing.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && grep -c "dotBlink\|hotroot\|termwrap\|rackcol\|dimroot" src/styles/app.css && grep -c "mockupnote" src/styles/app.css || true; pnpm build

Expect: first grep >= 5, `mockupnote` grep 0, build clean.

### Task 2 -- `src/generators/roots.ts`: pure root geometry · `agent (workhorse, medium)`

**Goal:** the mockup's `layoutRoots` geometry (921-951) as a pure function --
measured anchors in, path descriptors out; no DOM.

**Files:** `src/generators/roots.ts`.

**Steps:**
1. Input type: `{ w: number; h: number; racks: Array<{ id: string; lit:
   boolean; x: number; y: number; w: number; h: number }> }` -- rack rects
   already converted to section-relative pixels (the component owns
   measurement; same narrow-DOM-seam philosophy as Phase 3's
   `PathSampler`).
2. Output: ordered path descriptors `{ d: string; cls: string }` matching
   the mockup's build order and classes exactly -- trunk `M cx,0 L cx,44`
   (928) + its `sig s2 rootsig` overlay (929); the two decorative rootlets
   (930-933, the exact bezier arithmetic over `h`); then per rack in the
   given order: side test `(rack center x) < w/2` (939), tap point
   `xT = (leftSide ? right : left) ∓/± 6`, `yT = top + height * 0.5`
   (940-941), the root curve
   `M cx,44 C cx,round(44+(yT-44)*.55) round(xT+(cx-xT)*.42),round(yT) round(xT),round(yT)`
   (942-944), class `root` (+ ` dimroot` when unlit, 945), and for lit racks
   a `sig rootsig` overlay cycling `delaysR = ["", "s2", "s3", "s3", "",
   "s2"]` by build index (935, 947). Return the per-rack base-path
   descriptors keyed by id as well (the component needs them for `hotroot`
   and for traveler sampling).
3. `COLS = { L: ['ef', 'cs', 'ch'], R: ['cm', 'gc', 'ms'] }` (913) exports
   from this module -- rack-to-column assignment is layout knowledge, keyed
   by id (D4 registry discipline: a manifest id absent from `COLS` is
   skipped with `console.warn` at the component, per Phase 3 Open
   question 4's precedent).

**Verification probe (arc-RUN -- purity + shape):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && bun -e "
    import { generateRoots, COLS } from './src/generators/roots.ts';
    const racks = [
      { id: 'ef', lit: true,  x: 20,  y: 100, w: 140, h: 120 },
      { id: 'cm', lit: true,  x: 840, y: 100, w: 140, h: 120 },
      { id: 'ch', lit: false, x: 20,  y: 400, w: 140, h: 120 }];
    const g = generateRoots({ w: 1000, h: 600, racks });
    console.log(g.paths.length, g.paths[0].d.startsWith('M500,0'), COLS.L.join(','), COLS.R.join(','));"

Expect: tsc clean; path count = 4 fixed (trunk + trunk sig + 2 rootlets)
+ 3 base roots + 2 lit sigs = `9`, `true`, `ef,cs,ch`, `cm,gc,ms`.

### Task 3 -- terminal topic content: port + author + interpolate · `agent (session-tier, high)` -- THE ARC'S CONTENT TASK

**Goal:** `TerminalTopics.tsx` carries the normative 7-card set -- six
mockup bodies ported byte-identical with manifest-interpolated figures, the
`ms` stub replaced by the authored draft, every door URL exactly as
verified -- ready for the operator content review. Judgment-dense: prose
fidelity vs live-number seams, altitude discipline, and the one authored
body all live here; session-tier so the drafting judgment and the review
staging happen with full arc context.

**Files:** `src/components/TerminalTopics.tsx`.

**Steps:**
1. Port the six mockup card bodies (`TOPICS`, 873-905) byte-identical --
   including `boot`'s `(illustrative)` endpoint marker (876,
   `TBD-PHASE-6-endpoint-truth`), the `ef` altitude line (884), `cm`'s
   embeddings aside (889), and the `ch` dormant-honesty close (901). HTML
   entities (`&amp;`, `&ldquo;`-class) render as characters in JSX text
   nodes (Phase 3 P-D).
2. Replace each figure in the Local-decision table with its manifest
   expression (`fmt(...)` over the raw field / `gc.stats` label lookup);
   the surrounding prose bytes do not change. The card components take the
   manifest `Datacenter` (or the needed fields) as props -- no imports from
   `data/`, no fetching (P4).
3. Replace the `ms` stub with the authored draft from "The terminal topic
   set" VERBATIM -- the doc's draft is the reviewed artifact; silent
   rewording would bypass the operator gate.
4. Door links: `target="_blank" rel="noopener"`, hrefs exactly the five
   verified URLs (repo root in `boot` + `ft`; the four landmark trees).
   Dormant cards render no door (Open question 1).
5. Re-run the door probe (boundary probe 4) after writing -- the URLs were
   verified at drafting time; this re-pins them at content time.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && for s in "SUBSYS 01" "SUBSYS 06" "topic-coherent threads" "the whole brain is open source" "concept altitude here" "hook-in shape is still open" "tree/main/apps/qw-oracle/scripts/extractors" "curated/concept-notes"; do grep -rlq "$s" dist/assets/ && echo "YES  $s" || echo "NO   $s"; done

Expect: tsc + build clean, eight `YES`.

### Task 4 -- racks + field terminal + selection wiring · `agent (workhorse, high)` -- after Tasks 1, 3

**Goal:** the machine room's DOM organism renders and responds: mrhead, two
rack columns from the manifest registry, the dominant terminal booting into
the connect quickstart, rack click swapping the terminal body + `sel` +
`hotroot`.

**Files:** `src/components/Floor2MachineRoom.tsx`, `src/components/Rack.tsx`.

**Steps:**
1. Section content inside App's `#machine-room` wrapper (Phase 2 owns the
   `<section>`): the roots SVG (`class="roots"`, `preserveAspectRatio="none"`,
   `aria-hidden="true"`, pixel-space viewBox `0 0 w h` set from measurement --
   mockup 214, 925-926; own `aglowR` filter def per the Local decision);
   `.mrhead` with the COMPLETED header line (215, chrome copy lock above);
   `.rackcol.left` / `.rackcol.right` filled from `COLS` keyed against the
   manifest registry (913, 985-986); the `.termwrap > .term` block (218-228).
2. `Rack.tsx` (buildRack port, 952-984): class `rk` (+ ` off` unlit),
   `role="button"`, `tabindex="0"`, aria-label `name` (+ ` (dormant)`)
   (955-958); face = `rkt` name / `rkn` `fmt(num)` (dormant: `—`) / `rks`
   manifest `sub` (dormant: `dormant · awaiting power`) (959-961); the
   18-cell dot grid with the mockup's exact pattern -- cell on when
   `lit && (i * 7 + id.length) % 3 !== 0`, `f2` when `i % 4 === 0`, `bl`
   when `i % 2 === 0`, `animation-delay: (i * 421) % 2600` ms (963-971;
   keep the `id.length` term verbatim -- it is constant 2 across the launch
   registry, but it is the comp's expression). Click + Enter/Space fire the
   select callback (972-982).
3. Selection state: one Solid signal `selected: string | null` (initial
   `null`); the terminal body renders `TerminalTopics[selected ?? 'boot']`
   -- boot IS the rest state (987); selecting sets `sel` on that rack only
   and `hotroot` on its base root path (974-979), both derived reactively so
   hot state survives relayout for free (the mockup re-applies it manually,
   950 -- same visible behavior).
4. Terminal chrome from `TerminalTopics.tsx`'s `FieldTerminal`: `hd` spans,
   scrollable `body`, `ft` footer -- copy locks byte-identical (220-226).
   NO expand toggle, no drill overlay -- the terminal is in-flow and always
   full-height (spec amendment block).
5. Measurement + relayout: on mount, one `requestAnimationFrame` then
   measure rack rects (`getBoundingClientRect` relative to the section,
   934, 988), call `generateRoots`, render the paths; re-measure on window
   resize debounced 160ms (989-992). Listeners cleared in `onCleanup`.
6. Registry grace (D4): manifest id missing from `COLS` -> skip +
   `console.warn`; `COLS` id missing from the manifest -> skip silently
   (Phase 3 Open question 4's precedent, applied to racks).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "FIELD TERMINAL\|ALL LAYERS UP\|dormant · awaiting power\|click a rack" dist/assets/*.js

Expect: tsc + build clean, grep >= 4. Interaction verification is the
boundary ritual's (F3-F5).

### Task 5 -- root travelers: the stemExits consumer · `agent (workhorse, high)` -- after Tasks 2, 4

**Goal:** Phase 3's handoff obligation discharged: one root traveler per
`stemExits` increment, cycling `ROOT_LANDING_QUEUE`, same glyph species and
speed (P7a), landing with a `LAND_FLARE_MS` flare; suppressed under
`reduced` or hidden roots.

**Files:** `src/components/Floor2MachineRoom.tsx`.

**Steps:**
1. Consume the prop reactively:
   `createEffect(on(() => props.stemExits, (n, prev) => { ... }, { defer: true }))`
   (Phase 3 P-B's named pattern); spawn `n - prev` travelers so a batched
   update never drops one. Refuse when `props.reduced` or when
   `getComputedStyle(rootsRef).display === 'none'` (mockup 997-998 -- the
   roots are display-none under the portrait media rule, 179; the computed
   check keeps the guard true automatically when Phase 5 lands).
2. Spawn (996-1011): next id from `ROOT_LANDING_QUEUE` cycling; build a
   `PathSampler` (Phase 3 interface) from the rack's rendered base root
   path (`getTotalLength`/`getPointAtLength`); glyph = trailing `<line>`
   in the roots SVG using ONLY the imported constants -- `PULSE_STROKE`,
   `PULSE_STROKE_WIDTH`, linecap round, `filter="url(#aglowR)"`,
   `PULSE_TRAIL_UNITS` trail (1003-1007, 1033-1036). No id in the queue
   without a rendered root -> no-op (1001).
3. The floor-2 rAF loop (rstep port, 1013-1039): dt clamp 50ms (1015),
   advance `PULSE_ADV_PER_MS * dt` (1016 -- the mockup's comment "same
   speed as every other pulse on the page" IS P7a), orientation from the
   motion vector with the 0.4-length guard (1029-1032). On arrival: remove
   glyph, add `land` to the rack, clear after `LAND_FLARE_MS` (1020-1026).
   Loop self-rearms while travelers exist, parks otherwise (1011, 1038 --
   the Local decision's second loop, floor 2's only one). rAF + pending
   flare timeouts cancelled in `onCleanup` (HMR discipline, Phase 3
   Recovery precedent).

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c "ROOT_LANDING_QUEUE\|LAND_FLARE_MS\|PULSE_ADV_PER_MS\|PULSE_STROKE\b\|PULSE_TRAIL_UNITS" src/components/Floor2MachineRoom.tsx && grep -c "requestAnimationFrame" src/components/Floor2MachineRoom.tsx

Expect: tsc + build clean; constants grep >= 5 -- all five consumed P7a
constants imported, not re-declared (`PULSE_STROKE\b` also matches the
`PULSE_STROKE_WIDTH` use sites; the count covers both). Negative check --
no forked literals:
`grep -icE "0\.073|73e-3|7\.3e-2|\b650\b|['\"]#4aa8ff['\"]|2\.4" src/components/Floor2MachineRoom.tsx`
must be 0 (case-insensitive; catches a hardcoded speed in decimal or
exponent notation, a bare flare duration, the stroke color in either quote
style or case, or the stroke width). This grep is a TRIPWIRE, not a proof
-- literal forks have unbounded spellings; the authoritative P7a check is
the import-count positive grep (>= 5) plus ritual item F6's
same-species/same-speed eyeball. rAF count 1-2, both call sites in the one
loop function (Phase 3's A-probe convention). End-to-end traveler behavior
= ritual F6.

### Task 6 -- deploy + boundary run + review staging · `inline`

**Steps:** run the Phase 2 one-command redeploy
(`set -a; . ~/.secrets/cloudflare-pages.env; set +a; pnpm --dir
/home/dev/projects/quakeworld/apps/oracle-web run deploy`), run automated
probes 1-6 below, then stage BOTH operator floors: the visual-parity ritual
(serve the mockup as in Phase 3, hand over both URLs + the F-checklist) and
the content review (hand over the C-checklist with the live page). Commit
the subtree at green probes; push at the checkpoint.

**Verification probe:** probes 1-6 green; commit visible in
`git -C /home/dev/projects/quakeworld log --oneline -1 -- apps/oracle-web`.

## Phase-boundary verification

### Automated probes (arc-RUN; run in order)

1. **Build + types clean:**

       cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && pnpm run check && echo YES

   Expect `YES` -- YES/NO.

2. **Copy locks in the shipped bundle** (P8/P1 spot checks):

       cd /home/dev/projects/quakeworld/apps/oracle-web && for s in "QW ORACLE — FIELD TERMINAL" "ALL LAYERS UP" "The Machine Room" "click a rack" "dormant · awaiting power" "SUBSYS 03 — SYNTHESIS" "MEMORY INGEST" "no power" "esc closes cards"; do grep -rlq "$s" dist/assets/ && echo "YES  $s" || echo "NO   $s"; done

   Expect nine `YES` -- YES/NO.

3. **Doors in the bundle are exactly the verified set** (no stray deep
   links -- the stable-landmark rule mechanically):

       grep -rho 'https://github\.com/ParadokS81/quakeworld[^"'"'"' ]*' /home/dev/projects/quakeworld/apps/oracle-web/dist/assets/ | sort -u

   Expect exactly five URLs: the repo root and the four `/tree/main/...`
   landmarks from the topic-set table; nothing else (in particular no
   `/blob/` file links) -- YES/NO.

4. **Doors are live** (re-run of the drafting-time probe):

       for u in "https://github.com/ParadokS81/quakeworld" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/scripts/extractors" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/scripts/load-chat" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/curated/concept-notes"; do echo "$(curl -sI -o /dev/null -w '%{http_code}' "$u")  $u"; done

   Expect five `200` (drafting-time observation 2026-08-06: five `200`, no
   redirects) -- YES/NO.

5. **Deployed URL serves the new bundle:**

       curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/
       ASSET=$(curl -s https://qw-oracle-web.pages.dev/ | grep -o '/assets/[^"]*\.js' | head -1); curl -s "https://qw-oracle-web.pages.dev$ASSET" | grep -c "FIELD TERMINAL"

   Expect `200` and >= 1 (chunk-split fallback per Phase 2 probe 2) --
   YES/NO.

6. **Dumb-component audit re-run** (P4/P5):

       grep -rn "fetch(\|location.search" /home/dev/projects/quakeworld/apps/oracle-web/src/components/ /home/dev/projects/quakeworld/apps/oracle-web/src/generators/ | grep -v "^Binary" ; echo "exit=$?"

   Expect zero hits (`exit=1`) -- YES/NO.

### Operator visual-parity ritual (P1 -- side-by-side against the comp)

Setup identical to Phase 3's (serve the specs dir on 5174/5173, both
windows > 900px). **Deviations-by-design** (read first; anything else is a
finding): Phase 3's D-a/D-b/D-c stand -- plus **D-f:** the comp's floor-2
`.mockupnote` block is absent from the deploy (mockup meta); **D-g:** all
rack and terminal numbers differ from the comp per D-b (live manifest;
check format and placement, not values -- e.g. the comp's `20,270` renders
as the live thread count).

**Checklist -- every line answered YES/NO:**

- **F1 rest state:** header `THE MACHINE ROOM · what the brain runs on ·
  click a rack` centered; six racks -- left column ENGINE FACTS / CONCEPT
  NOTES / COMMUNITY HISTORY, right column DISCORD / GAME CONTENT / MATCH
  STATS (P8 names); the FIELD TERMINAL dominant center, full height, no
  expand control; terminal shows the boot screen (CONNECT YOUR AGENT
  quickstart with config snippet, first questions, repo door); roots fan
  from a center trunk to every rack, dashed-dim to the two dormant racks;
  ambient `rootsig` pulses run the lit roots at the canonical speed.
- **F2 rack faces:** lit racks show name / live number (en-US) / sub line +
  a blinking indicator-dot grid (staggered, cyan-blue mix); dormant racks
  are dashed, dim, `—` over `dormant · awaiting power`, zero lit dots.
- **F3 rack select (walk all six):** click (and Enter/Space via keyboard
  focus) marks the rack `sel` (cyan border + glow), loads its SUBSYS card
  into the terminal, and lights its root cyan (`hotroot`); selecting
  another rack moves all three; dormant racks select too (their `no power`
  cards load).
- **F4 terminal content (walk all 7 cards):** each card matches the
  normative set -- header, body at concept altitude with live figures,
  muted asides, door line present on the four lit cards + boot, absent on
  the two dormant cards; footer always `click a rack · esc closes cards` +
  the repo door.
- **F5 doors:** clicking each of the five distinct links opens the correct
  GitHub landmark in a new tab (repo root / apps/qw-oracle / extractors /
  load-chat / concept-notes).
- **F6 root travelers + handoff (the fold contract, live):** left idle on
  floor 2 with floor 1 in view above, each traveler that finishes the
  brainstem produces a fresh glyph riding a root within the same beat --
  landing racks cycle DISCORD -> ENGINE FACTS -> GAME CONTENT -> CONCEPT
  NOTES; landing flares the rack border for ~0.65s; glyph is
  indistinguishable in size/color/speed from every other pulse on the page
  (P7a); `data-stem-exits` in devtools matches the count of glyphs seen.
- **F7 fold continuity:** scrolling the fold, stem -> stemext rails ->
  trunk read as ONE continuous line on the one gradient; the trunk starts
  at the horizontal center; roots SVG sits BEHIND the rack columns and
  terminal.
- **F8 reduced motion (P7c):** with OS reduce-motion on, reload: no root
  pulses, no dot blink, no root travelers ever (even after floor-1 idle
  time -- spawns are suppressed on both floors); rack select and terminal
  swap still work instantly.
- **F9 resize:** after a window resize, roots re-anchor to the moved racks
  (within ~a beat -- 160ms debounce); the selected rack's root stays hot;
  no orphaned paths or travelers.
- **F10 single network call (P3/P5 re-audit):** Network tab still shows
  exactly one non-asset request (the manifest), status 200 -- rack clicks
  and terminal swaps trigger zero requests.

### Operator content-review checklist (the phase's acceptance gate for Task 3)

Reviewed against the live deploy URL, one card at a time (boot + 6).

**How it is answered (cold-review consolidation -- do NOT run this as a
7x7 matrix).** C1-C7 below are the RUBRIC the operator holds in mind, not
49 separate answers. For each of the 7 cards the operator reads it once and
gives ONE verdict: YES / NO / EDIT (an EDIT is a copy change the
implementer applies verbatim, then re-deploys; a NO is a finding). Seven
answers total. Only when a card draws NO or EDIT does the operator walk
that card against the individual C-criteria, to say precisely which one it
failed -- that specificity is what the implementer needs, and it is only
needed for cards that actually failed. The floor is unchanged: every
criterion still governs every card; the bookkeeping is what shrinks.

Per-card verdict question: *"accurate today, right altitude, door lands
where it says, right voice and locked names?"*

- **C1 altitude:** the body explains what the subsystem IS at
  stable-concept level -- nothing that rots with a refactor (no file names
  outside the door, no versions, no schema detail).
- **C2 accuracy:** every claim is true of the system TODAY (e.g. cm's
  hybrid-retrieval description, ef's idempotent-re-run claim, cs's
  every-claim-cites framing); figures match the floor-1 drill cards
  (same manifest).
- **C3 doors:** the door lands where the copy promises, and the target is
  a stable landmark (directory, not file).
- **C4 naming (P8):** rack names and subsystem headers carry the locked
  names -- DISCORD and CONCEPT NOTES, never Community Memory / Curated
  Synthesis; no L1/L2/L3 vocabulary anywhere user-facing.
- **C5 voice:** one register across all 7 cards -- terse, monospace-native,
  confident without promising; dormant cards use the dormant-honesty
  formula, no roadmap language.
- **C6 the authored `ms` card:** the draft (or the operator's edit of it)
  is approved as the shipped copy.
- **C7 known-deferred acknowledged:** the boot endpoint still reads
  `(illustrative)` -- deliberate, Phase 6 truths it up
  (`TBD-PHASE-6-endpoint-truth`); the `● ALL LAYERS UP` badge is static
  copy (Open question 3).

All F-items + C-items YES (or EDIT-applied) = phase boundary passed. Any NO
= finding in `review-findings.md`, fix-or-amend before the boundary closes
(P1: no silent deviations).

## Outputs to next phase

**Phase 5 may rely on:**

- **Both floors complete on the deploy URL** -- the mobile projection pass
  works against a finished desktop page; every floor-2 element carries the
  mockup's class names, so the un-ported portrait rules (mockup 169-185:
  `svg.roots` hidden, rack columns become static rows, terminal
  auto-height, `.rk` min-height 110px) drop onto matching selectors
  (`TBD-PHASE-5-portrait-layout`).
- **Roots degrade by CSS alone:** travelers self-suppress when the roots
  SVG is display-none (the Task 5 computed-style guard) -- Phase 5 hides
  the SVG and the handoff consumer goes quiet with zero JS changes.
- **`generateRoots` is measurement-driven** (rects in, paths out) -- any
  portrait rack geometry that keeps the roots visible re-layouts for free;
  hiding them (the mockup's choice) is also fine.

**Phase 6 may rely on:**

- Terminal copy truth-up markers: `TBD-PHASE-6-endpoint-truth` on the boot
  card (sibling to Phase 3's XN marker); the `● ALL LAYERS UP` badge
  question (Open question 3) is queued for the final-copy pass.
- Rack selection is one narrow signal in `Floor2MachineRoom`
  (`TBD-PHASE-6-fragment-urls` may lift it if `/#machine-room`-deep
  fragments are wanted).
- The five door URLs + probe 3/4 literals -- the ship pass re-runs them as
  part of its sweep.

## Open questions (default + who overrules)

1. **Dormant topic cards carry no door -- the spec's "every topic doors
   OUT" sentence vs the comp.** The mockup's `ch`/`ms` cards end doorless
   (899-904); the spec amendment says every topic doors out. Contradiction
   surfaced, not resolved here. Default: mockup-faithful (doorless dormant
   cards -- there is nothing honest to link; a door would be roadmap
   language). Overrule: operator (C-checklist row C5/C6 is the natural
   place to rule; a door added there is an EDIT, not a redesign).
2. **Figures without raw manifest fields.** Default: "Seven C codebases"
   (ef) and "18,000+" (ms) stay static prose; gc's mechanics/entity-defs
   figures interpolate via `gc.stats` label lookup (labels are emitter
   static config, treated as contract values). Overrule: operator; if the
   codebase count should go live, that is a finding to Phase 1 for a dated
   amendment (raw `codebases` field on `ef`), NOT a display-string parse.
3. **`● ALL LAYERS UP` stays static.** Default: byte-identical static copy
   (P1); it is a status badge, not data, and the page renders even on the
   baked fallback. Overrule: operator; a manifest-derived variant (e.g.
   dimming on `source === 'baked'`) would be a Phase 6 finding + P1
   amendment, since the comp has no such state.
4. **The authored `ms` body.** Default: the draft in "The terminal topic
   set", shipped verbatim pending C6. Overrule: operator (the review gate
   IS the overrule mechanism -- EDITs apply verbatim).
5. **Component decomposition granularity.** Default: the three component
   files in Files touched. Overrule: implementer may fold/split within
   `src/components/` under the props-only discipline (Phase 3 Open
   question 5's rule); `generateRoots`/`COLS` exports and every consumed
   `journeys.ts` name are NOT negotiable.

## Facts asserted on install-time / on-deploy probes (not verifiable read-only)

- **P-A (install-time):** root base-path `PathSampler`s need mounted
  elements (`getTotalLength`) -- built after the mount-rAF measurement
  pass, same class as Phase 3's P-A. Violation symptom: travelers frozen at
  the trunk fan-point.
- **P-B (install-time):** `on(() => props.stemExits, ..., { defer: true })`
  fires once per increment across the component boundary, and the
  `n - prev` spawn count covers Solid batching. Verified when F6's counts
  match.
- **P-C (install-time):** `getComputedStyle(rootsRef).display` correctly
  reports `none` under the media rule in the Solid render (the mockup
  proves the DOM mechanism, not the Solid lifecycle timing).
- **P-D (on-deploy):** the second rAF loop + blinking dot grids alongside
  floor 1's full animation load hold 60fps -- the self-contained mockup
  already runs this exact total load, so parity is expected, not proven,
  until F6/F9.
- **GitHub landmark stability** is a world-facing claim verified by
  observation (five `200`s on 2026-08-06) + the landmark argument, never
  guaranteed -- probes 3/4 re-pin it at run time and again in Phase 6.

## Recovery

- **Visual mismatch in the ritual:** Phase 3's recovery rule applies
  verbatim -- classify port bug vs Solid-idiom-forced change; fix or dated
  P1 amendment, log in `review-findings.md`, never silent.
- **Roots mis-anchored / pointing at nothing:** measurement ran before
  layout settled -- confirm the mount-rAF ordering (mockup 988) and that
  rects are converted section-relative (934); a rack rendered but missing
  from `COLS` (or vice versa) is the D4 grace path, check the console
  warns.
- **Travelers frozen at the fan-point:** P-A -- sampler built pre-mount; or
  the queue handed an id with no rendered root (dormant ids are NOT in
  `ROOT_LANDING_QUEUE`; if one appears there, the queue was edited --
  restore the imported constant).
- **`stemExits` increments but no glyph ever spawns:** check in order --
  `reduced` true in the test browser? viewport <= 900px (roots
  display-none -- the guard working as designed)? the `defer: true` effect
  actually mounted? Phase 3's own V11 green (increments arriving at all)?
- **Glyph visibly differs from floor-1 pulses (species/speed):** a `PULSE_*`
  value was re-declared locally instead of imported -- the Task 5 negative
  grep catches it; fix the import, never fork the constant (P7a).
- **Flare sticks on a rack / doubles under HMR:** the `LAND_FLARE_MS`
  timeout or the rAF loop escaped `onCleanup` -- Phase 3's HMR recovery
  applies; a full reload clears the symptom, the fix is the cleanup.
- **A door 404s at run time:** the public repo drifted from the landmark
  set -- do NOT deep-link to a moved path as a workaround; that breaks the
  stable-landmark rule. Fix the repo side (restore/redirect the landmark)
  or route a finding here amending the topic-set table with a new landmark,
  operator-approved.
- **Terminal figure renders `undefined`/NaN:** contract drift (missing
  `cm.threads`/`gc.stats` row) -- do not patch in components; route a
  finding to Phase 1 (P2), exactly as Phases 2-3 prescribe.
- **Deploy pipeline failure:** Phase 2's `DEPLOYMENT.md` + Recovery own it.
