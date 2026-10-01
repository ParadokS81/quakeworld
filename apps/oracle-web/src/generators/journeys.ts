// The journey-handoff contract: ambient tracepoint "travelers" that flow
// source -> mesh hops -> gather -> brainstem, then hand off to floor 2.
// Ported from the mockup's tracepoint-journey block, lines 485-585.
// Source of truth: docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html
// (v4.7). This module OWNS the contract cited by
// docs/superpowers/plans/2026-08-06-oracle-web-v1/phase-3-floor1-brain.md
// ("The journey-handoff contract" section) -- every export name and value
// below is normative; Phase 4 (floor 2 / roots) consumes it without
// renegotiation.
//
// PURE (P4 stack lock): no DOM, no `window`, no `fetch`, no `solid-js`
// import. Anything needing the DOM (SVG path length / point sampling) enters
// through `PathSampler`, built by the component from a live SVGPathElement.

import type { MeshGeometry } from './mesh';

// ============================================================================
// P7a -- the one pulse species (mockup 51-53, 524, 565, 1016, 1033).
// Journey travelers move at the canonical dash speed and render as the same
// dash glyph as the CSS `.sig` pulse -- never a second visual species. Floor
// 2's root travelers (Phase 4) import these SAME constants so the two floors
// cannot drift apart; never inline these values a second time.
// ============================================================================

/** Canonical dash speed: 400 units / 5.5s. The mockup's own JS literal for
 * this (mockup 524, `adv = 0.073 * dt`) is 0.073, not the mathematically
 * exact 400/5500 = 0.0727...; the contract value is 0.073 -- match the comp,
 * not the ideal. */
export const PULSE_ADV_PER_MS = 0.073;

/** Traveler glyph = a trailing `<line>`, 10 local units long x S (S = 1 on
 * desktop; portrait scaling is Phase 5's, TBD-PHASE-5-portrait-layout).
 * Mockup 513-514, 565. */
export const PULSE_TRAIL_UNITS = 10;

/** Mockup 513: traveler glyph stroke color. */
export const PULSE_STROKE = '#4aa8ff';

/** Mockup 514: traveler glyph stroke width, x S; linecap round; filter
 * `url(#aglow)` (component-side rendering detail, not encoded here). */
export const PULSE_STROKE_WIDTH = 2.4;

/** Mockup 51-52: CSS `.sig` dash pattern -- the trace-overlay pulse (a
 * DIFFERENT visual than the traveler glyph, but the same canonical speed;
 * kept here because Task 1's CSS port and this module both cite it). */
export const SIG_DASHARRAY = '10 190';

/** Mockup 51-52: `.sig` animation period. */
export const SIG_PERIOD_S = 5.5;

/** Mockup 53: `.sig` stagger delays for the s2/s3 trace-delay classes. */
export const SIG_DELAYS_S = { s2: -1.8, s3: -3.6 };

// ============================================================================
// Floor-1 journey tuning (mockup 486-580, 621, 684-689, 835-839).
// ============================================================================

/** Mockup 509: `spawn()` refuses above this many concurrent travelers.
 * Enforced by the CALLER (the rAF-loop owner, Task 9) before invoking
 * `spawnTraveler` -- this module has no travelers-array of its own to check
 * against, by design (P4: the array lives in the component). */
export const MAX_TRAVELERS = 6;

/** Mockup 539: `p.hops > 11` forces a gather transition. 12 hops ARE
 * permitted -- compare with `>`, never `>=`. */
export const MAX_HOPS = 11;

/** Mockup 539: within this distance of GATHER, a hop-arrival forces phase 3
 * regardless of hop count. */
export const GATHER_CAPTURE_RADIUS = 95;

/** Mockup 491: `.touch` class duration on a mesh dot the traveler passes
 * through. `advanceTravelers` reports which dots to flash; the component
 * owns the actual class-toggle + timeout using this constant. */
export const TOUCH_FLASH_MS = 450;

/** Mockup 686: per-station hover-spawn throttle. */
export const HOVER_SPAWN_THROTTLE_MS = 1100;

/** Mockup 837: ambient spawn interval. */
export const AMBIENT_INTERVAL_MS = 4200;

/** Mockup 838: first ambient spawn fires at this delay, always `cm`. */
export const AMBIENT_KICKOFF_MS = 700;

/** Mockup 836: ambient spawn cycle order. */
export const AMBIENT_ORDER = ['cm', 'ef', 'gc', 'cs'] as const;

// ============================================================================
// Floor-2 side of the fold (mockup 995-999, 1022-1026). Phase 4 consumes
// these; floor-2 mechanics beyond them are TBD-PHASE-4-root-travelers.
// ============================================================================

/** Mockup 995: rack-landing cycle order for root travelers. */
export const ROOT_LANDING_QUEUE = ['cm', 'ef', 'gc', 'cs'] as const;

/** Mockup 1025: rack `.land` flare duration. */
export const LAND_FLARE_MS = 650;

// ============================================================================
// The pure stepping machinery.
// ============================================================================

/** Narrow DOM seam: the component builds one of these per source-trace path
 * from a live `SVGPathElement` (`getTotalLength()` / `getPointAtLength(d)`).
 * `journeys.ts` never touches the DOM directly (P4). */
export interface PathSampler {
  length: number;
  pointAt(d: number): { x: number; y: number };
}

/**
 * One in-flight tracepoint traveler. Fields are this module's own design --
 * the contract left `Traveler` as a placeholder for the implementer to fill
 * in (phase-3-floor1-brain.md, journey-handoff contract). Chosen shape:
 *
 * - `ph` / `t` / `seg` drive the phase-local parametric progress, mirroring
 *   the mockup's `p.ph`/`p.t`/`p.seg` directly (508-585).
 * - `cur`/`prev`/`toIdx` are `MeshGeometry.pts` indices (`-1` = none / not
 *   applicable), replacing the mockup's raw array indices 1:1.
 * - `a`/`b`/`ctrl` are the current segment's endpoints/control point in mesh
 *   coordinates -- `[x, y]` tuples, matching the mockup's own `p.a`/`p.b`.
 * - `px`/`py`/`dx`/`dy` are the previous position and current unit motion
 *   vector, used only to compute glyph orientation (560-569).
 * - `x1,y1,x2,y2` are the trailing-line glyph endpoints -- the render output
 *   the component sets directly on its `<line>` element each tick. Exposing
 *   these on the traveler (rather than returning a separate parallel array)
 *   keeps `advanceTravelers`'s return type limited to the two things that
 *   need per-tick AGGREGATION (touched dots, stem-exit count); everything
 *   else the component reads per-traveler off the array it already holds.
 * - No `el` field: the mockup's `p.el` (a live DOM node, 513-514) has no
 *   place in a pure traveler -- the component owns the DOM node and reads
 *   `x1..y2` to position it.
 */
export interface Traveler {
  ph: 1 | 2 | 3 | 4;

  // Phase 1 (source-trace run) state.
  d: number;
  len: number;
  path: PathSampler;

  // Mesh-hop state (phase 2) and its carry-over into phases 3/4.
  cur: number;
  prev: number;
  toIdx: number;
  hops: number;
  t: number;
  seg: number;
  a: [number, number] | null;
  b: [number, number] | null;
  ctrl: [number, number] | null;

  // Orientation bookkeeping (560-569).
  px: number;
  py: number;
  dx: number;
  dy: number;

  // Render output: trailing-line glyph endpoints, updated every tick.
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// -- journeys' own LCG instance (mockup's shared `rnd()`, but NOT shared
// with mesh.ts -- see the module-level note below). Same algorithm as
// mesh.ts (seed 41, mockup 366-367), separate state. --
//
// Deliberate deviation from the comp (the one sanctioned behavior
// difference, per Task 4 step 3 / Port discipline): the mockup uses ONE
// `rnd()` for both mesh construction and journey picks. We split them
// because the mesh is built ONCE per `generateMesh()` call while journeys
// draw INDEFINITELY (every `pickNext`, forever, for the life of the page) --
// sharing would make mesh dot-for-dot determinism depend on how many
// journey picks happened before a mesh rebuild, which is exactly the kind of
// hidden coupling `generateMesh`'s own determinism contract forbids. Journey
// PATHS are random either way (not a visual-parity concern); mesh geometry
// staying deterministic IS one (Task 3's contract). This LCG persists across
// calls for the life of the module -- unlike `generateMesh`, which restarts
// at 41 every call -- because journeys have no natural "re-entry point" to
// reset from; the mockup's own `rnd()` never resets either.
let journeySeed = 41;
function journeyRnd(): number {
  journeySeed = (journeySeed * 1103515245 + 12345) % 2147483648;
  return journeySeed / 2147483648;
}

function dist(a: readonly [number, number], b: readonly [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Quadratic-bezier interpolation (mockup 582-585). */
function quad(
  a: readonly [number, number],
  c: readonly [number, number],
  b: readonly [number, number],
  t: number,
): [number, number] {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

/** Gather-greedy neighbor choice with noise, avoiding backtracking unless at
 * a dead end (mockup 493-506). */
function pickNext(
  cur: number,
  prev: number,
  mesh: MeshGeometry,
  gather: { x: number; y: number },
): { to: number; cx: number; cy: number } | null {
  const opts = mesh.adj[cur];
  if (!opts || !opts.length) return null;
  let bestO: { to: number; cx: number; cy: number } | null = null;
  let bestS = 1e9;
  for (const o of opts) {
    if (o.to === prev && opts.length > 1) continue; // no backtracking unless it's the only option
    const p = mesh.pts[o.to];
    const dx = p.x - gather.x;
    const dy = p.y - gather.y;
    const s = Math.sqrt(dx * dx + dy * dy) * (0.85 + journeyRnd() * 0.3);
    if (s < bestS) {
      bestS = s;
      bestO = o;
    }
  }
  return bestO;
}

/** Bezier segment setup for the next mesh hop (mockup 573-580). */
function startHop(p: Traveler, mesh: MeshGeometry, gather: { x: number; y: number }): void {
  const o = pickNext(p.cur, p.prev, mesh, gather);
  const a = mesh.pts[p.cur];
  p.a = [a.x, a.y];
  if (!o) {
    // Dead end: no unvisited neighbor -- head straight for GATHER (577).
    p.toIdx = -1;
    p.b = [gather.x, gather.y];
    p.ctrl = [(a.x + gather.x) / 2, (a.y + gather.y) / 2];
  } else {
    p.toIdx = o.to;
    const b = mesh.pts[o.to];
    p.b = [b.x, b.y];
    p.ctrl = [o.cx, o.cy];
  }
  p.seg = Math.max(14, dist(p.a, p.b) * 1.05); // mockup 579
  p.t = 0;
}

/** Find the seat index (0-5) for a source id -- `MeshGeometry.pts[0..5]` are
 * always the six seats, in `SEAT_INDEX` order (mesh.ts contract), regardless
 * of which datacenters are lit. Mirrors the mockup's `seatIdx[srcId]`
 * lookup table (a plain object) without needing `layout` as an extra
 * parameter: the seat's `tag` already carries its id. */
function seatIndexFor(srcId: string, mesh: MeshGeometry): number {
  for (let i = 0; i < 6 && i < mesh.pts.length; i++) {
    if (mesh.pts[i].tag === srcId) return i;
  }
  return -1;
}

/** Spawn one traveler at the length-0 point of its source trace (mockup
 * 508-517). Callers enforce `MAX_TRAVELERS` and `reduced` before calling
 * this -- see the `MAX_TRAVELERS` doc comment above. */
export function spawnTraveler(srcId: string, srcTrace: PathSampler, mesh: MeshGeometry): Traveler {
  const p0 = srcTrace.pointAt(0);
  return {
    ph: 1,
    d: 0,
    len: srcTrace.length,
    path: srcTrace,

    cur: seatIndexFor(srcId, mesh),
    prev: -1,
    toIdx: -1,
    hops: 0,
    t: 0,
    seg: 0,
    a: null,
    b: null,
    ctrl: null,

    px: p0.x,
    py: p0.y,
    dx: 1,
    dy: 0,

    x1: p0.x,
    y1: p0.y,
    x2: p0.x,
    y2: p0.y,
  };
}

/**
 * Advance every traveler by `dtMs` (clamped to 50ms, mockup 523): phase 1
 * source-trace run -> phase 2 mesh hops (flash on arrival; forced gather
 * past `MAX_HOPS` or within `GATHER_CAPTURE_RADIUS`) -> phase 3 straight run
 * to `gather` -> phase 4 stem descent to `stemEnd`, then despawn + signal a
 * stem exit (mockup 521-571).
 *
 * Mutates `travelers` in place -- despawned travelers (phase 4 complete) are
 * REMOVED from the array (mockup 554, `FXp.splice(i, 1)`); surviving
 * travelers have their `x1,y1,x2,y2` (glyph line) updated for the render
 * pass to read directly off the array.
 */
export function advanceTravelers(
  travelers: Traveler[],
  dtMs: number,
  mesh: MeshGeometry,
  gather: { x: number; y: number },
  stemEnd: number,
): { touchedDotIdxs: number[]; stemExits: number } {
  const dt = Math.min(50, dtMs); // mockup 523
  const adv = PULSE_ADV_PER_MS * dt;
  const touchedDotIdxs: number[] = [];
  let stemExits = 0;

  for (let i = travelers.length - 1; i >= 0; i--) {
    const p = travelers[i];
    let pos: [number, number] | null = null;

    if (p.ph === 1) {
      p.d += adv;
      if (p.d >= p.len) {
        p.ph = 2;
        startHop(p, mesh, gather);
      } else {
        const pt = p.path.pointAt(p.d);
        pos = [pt.x, pt.y];
      }
    }

    if (p.ph === 2 && !pos) {
      p.t += adv / p.seg;
      if (p.t >= 1) {
        if (p.toIdx >= 0) touchedDotIdxs.push(p.toIdx);
        const np = p.toIdx >= 0 ? mesh.pts[p.toIdx] : null;
        const npx = np ? np.x : gather.x;
        const npy = np ? np.y : gather.y;
        const dxg = npx - gather.x;
        const dyg = npy - gather.y;
        p.hops++;
        if (p.toIdx < 0 || p.hops > MAX_HOPS || Math.sqrt(dxg * dxg + dyg * dyg) < GATHER_CAPTURE_RADIUS) {
          p.ph = 3;
          p.a = [npx, npy];
          p.b = [gather.x, gather.y];
          p.seg = Math.max(20, dist(p.a, p.b)); // mockup 541
          p.t = 0;
        } else {
          p.prev = p.cur;
          p.cur = p.toIdx;
          startHop(p, mesh, gather);
        }
      }
      if (p.ph === 2) pos = quad(p.a!, p.ctrl!, p.b!, Math.min(1, p.t));
    }

    if (p.ph === 3) {
      p.t += adv / p.seg;
      if (p.t >= 1) {
        p.ph = 4;
        p.t = 0;
        p.seg = stemEnd - gather.y;
      } else {
        pos = [p.a![0] + (p.b![0] - p.a![0]) * p.t, p.a![1] + (p.b![1] - p.a![1]) * p.t];
      }
    }

    if (p.ph === 4) {
      p.t += adv / p.seg;
      if (p.t >= 1) {
        travelers.splice(i, 1);
        stemExits++;
        continue;
      }
      pos = [gather.x, gather.y + (stemEnd - gather.y) * p.t];
    }

    if (pos) {
      const mdx = pos[0] - p.px;
      const mdy = pos[1] - p.py;
      const mlen = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mlen > 0.4) {
        p.dx = mdx / mlen;
        p.dy = mdy / mlen;
      }
      p.px = pos[0];
      p.py = pos[1];
      p.x1 = pos[0] - p.dx * PULSE_TRAIL_UNITS;
      p.y1 = pos[1] - p.dy * PULSE_TRAIL_UNITS;
      p.x2 = pos[0];
      p.y2 = pos[1];
    }
  }

  return { touchedDotIdxs, stemExits };
}
