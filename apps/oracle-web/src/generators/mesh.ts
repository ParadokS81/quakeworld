// Seeded neural-mesh generator, ported verbatim from the mockup's
// buildBrain() (desktop branch), lines 366-465.
// Source of truth: docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html
// (v4.7).
//
// PURE (P4 stack lock): no DOM, no `window`, no `fetch`, no `solid-js`
// import, no module-level mutable state -- every value a `generateMesh()`
// call needs is either an argument or created fresh inside the call. A
// fresh call restarts the RNG at seed 41, matching the mockup's
// `buildBrain()` re-entry; state never leaks between calls.
//
// Determinism contract: the mockup's LCG (seed 41, mockup 366-367) runs in
// JS doubles -- the multiply `seed * 1103515245` exceeds 2^53 and loses low
// bits deterministically. Do NOT "fix" this with BigInt or Math.imul; the
// port keeps the identical expression, or the mesh stops matching the comp
// dot-for-dot (Port discipline, phase-3-floor1-brain.md).

import type { BrainLayout } from './layout';

/** One (id, share) pair for a LIT datacenter, in manifest registry order.
 * Callers filter to lit-only before calling `generateMesh` (mockup's
 * `DC.forEach` does the `!dc.lit` skip inline; here the caller does it so
 * this function stays a pure function of its two arguments). */
export type LitShare = readonly [id: string, share: number];

/** A single mesh point: a seat, a share-scattered dot, or an unattributed
 * fill dot. `tag` is the owning datacenter id, or `null` for fill dots. */
export interface MeshPoint {
  x: number;
  y: number;
  tag: string | null;
}

/** One edge from a point to an earlier point it connects to (mockup's
 * `adj[i].push({ to, cx, cy })`, 448-449). `cx`/`cy` is the jittered bezier
 * control point shared with the corresponding drawn edge path. */
export interface MeshEdge {
  to: number;
  cx: number;
  cy: number;
}

/** Render flags for one non-seat dot (`pts` index >= 6, mockup 452-465). */
export interface MeshDot {
  idx: number; // index into `pts`
  cx: number;
  cy: number;
  r: number;
  fill: string;
  fire: boolean;
  fireDelayMs?: number; // present only when `fire` is true (mockup 460-462)
}

/** Render-ready mesh geometry -- no DOM, consumed dumbly by components. */
export interface MeshGeometry {
  pts: MeshPoint[];
  adj: MeshEdge[][]; // adj[i] = the other points i connects to
  edges: string[]; // one quadratic-bezier `d` string per drawn edge
  dots: MeshDot[];
}

/**
 * Reproduce the mockup's scatter + adjacency for the desktop layout.
 *
 * Call-order is part of the determinism contract: seats first (in
 * `SEAT_INDEX` order), then per-datacenter scatter in `litShares` order,
 * then the universal fill, then adjacency in point order. Reordering any
 * of these silently shifts every draw downstream of the reorder.
 */
export function generateMesh(litShares: readonly LitShare[], layout: BrainLayout): MeshGeometry {
  // -- mockup 366-367: LCG local to this call --
  let seed = 41;
  function rnd(): number {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  function inside(x: number, y: number): boolean {
    for (const [cx, cy, rx, ry] of layout.LOBES) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) return true;
    }
    return false;
  }

  const pts: MeshPoint[] = [];

  function tryAdd(x: number, y: number, tag: string | null): boolean {
    if (!inside(x, y)) return false;
    for (const p of pts) {
      const ddx = p.x - x;
      const ddy = p.y - y;
      if (ddx * ddx + ddy * ddy < layout.MIN_DIST * layout.MIN_DIST) return false;
    }
    pts.push({ x, y, tag });
    return true;
  }

  // -- seats first, in SEAT_INDEX order (mockup 406-407) --
  const seatOrder = Object.keys(layout.SEAT_INDEX).sort(
    (a, b) => layout.SEAT_INDEX[a] - layout.SEAT_INDEX[b],
  );
  for (const id of seatOrder) {
    const seat = layout.SEATS[id];
    pts.push({ x: seat.x, y: seat.y, tag: id });
  }

  // -- per-lit-datacenter gaussian-ish scatter (mockup 417-427) --
  for (const [id, share] of litShares) {
    const seat = layout.SEATS[id];
    const want = Math.round(110 * share);
    const sigma = 45 + 55 * share;
    let got = 0;
    let tries = 0;
    while (got < want && tries < 3000) {
      tries++;
      const x = seat.x + (rnd() + rnd() + rnd() - 1.5) * sigma;
      const y = seat.y + (rnd() + rnd() + rnd() - 1.5) * sigma * 0.8;
      if (tryAdd(x, y, id)) got++;
    }
  }

  // -- 40 unattributed fill points (mockup 428-433) --
  let uni = 0;
  let utry = 0;
  const uniWant = 40;
  while (uni < uniWant && utry < 3000) {
    utry++;
    if (tryAdd(390 + rnd() * 430, 220 + rnd() * 350, null)) uni++;
  }

  // -- adjacency + edges: each point (skipping the first) connects to its
  // 2 nearest predecessors, mockup 434-451 --
  const adj: MeshEdge[][] = pts.map(() => []);
  const edges: string[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i];
    const best: Array<[number, number]> = []; // [distSq, j]
    for (let j = 0; j < i; j++) {
      const b = pts[j];
      const d2 = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
      best.push([d2, j]);
    }
    best.sort((u, v) => u[0] - v[0]);
    for (let k = 0; k < Math.min(2, best.length); k++) {
      const j = best[k][1];
      const b = pts[j];
      const mx = (a.x + b.x) / 2 + (rnd() - 0.5) * 24;
      const my = (a.y + b.y) / 2 + (rnd() - 0.5) * 24;
      edges.push(
        `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
      );
      adj[i].push({ to: j, cx: mx, cy: my });
      adj[j].push({ to: i, cx: mx, cy: my });
    }
  }

  // -- dot styling flags: seats (idx 0-5) render separately, mockup 452-465 --
  const dots: MeshDot[] = [];
  for (let idx = 6; idx < pts.length; idx++) {
    const pt = pts[idx];
    const r = idx % 7 === 0 ? 4.2 : 2.7;
    let fill = idx % 3 === 0 ? '#4aa8ff' : '#2f6db3';
    let fire = false;
    let fireDelayMs: number | undefined;
    const tag = pt.tag;
    if (tag !== null && idx % layout.FIRE_MOD[tag] === 0) {
      fire = true;
      fill = '#6fe3ff';
      fireDelayMs = (idx * 431) % 6000;
    }
    dots.push({ idx, cx: pt.x, cy: pt.y, r, fill, fire, fireDelayMs });
  }

  return { pts, adj, edges, dots };
}
