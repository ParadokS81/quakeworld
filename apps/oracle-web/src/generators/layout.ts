// Desktop geometry for floor 1 (the brain), transcribed verbatim from the
// mockup's `buildBrain()` desktop branch (`P === false`).
// Source of truth: docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html
// (v4.7). Every constant below cites the mockup line(s) it was ported from --
// that is how later verification traces a value back to the comp (P1).
//
// Portrait is NOT transcribed here -- TBD-PHASE-5-portrait-layout. `BrainLayout`
// is the shape a future `PORTRAIT_LAYOUT` (Phase 5) drops into.
//
// Pure data + types only (P4 stack lock): no DOM, no `window`, no `fetch`,
// no imports from `solid-js`.

/** A seat is a fixed dot position for a lit datacenter's home station. */
export interface Seat {
  x: number;
  y: number;
  r: number;
}

/** Keyed by datacenter id (D4: registry, not positions). */
export type SeatMap = Record<string, Seat>;

/** Horizontal station: title/num/subs stack upward from `liney`, centered at `cx`. */
export interface CenterLabel {
  mode: 'center';
  cx: number;
  liney: number;
}

/** Vertical station: title/num/sub sit at fixed offsets from `(x, y)`. */
export interface SideLabel {
  mode: 'side';
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

export type StationLabel = CenterLabel | SideLabel;

/** One of the six desktop source stations (mockup `SRC` entries). */
export interface StationSource {
  id: string;             // datacenter id -- keys against the manifest registry (D4)
  d: string;               // trace path `d` attribute
  pad: [number, number, number, number];  // [x, y, width, height] of the pad rect
  label: StationLabel;
}

/** The output-side block: gather -> gate -> agent highway -> snapshot door. */
export interface OutputLayout {
  axon: string;
  gpt: [number, number];
  jn: [number, number];
  laneA: string;
  laneQ: string;
  arc1: string;
  arc2: string;
  port: [number, number, number, number];
  mcpXY: [number, number];
  agent: [number, number];
  agentLbl: [number, number];
  snap: string;
  snapEnd: [number, number];
  tpLbl: [number, number];
  sgC: [number, number];
  sgLbl: [number, number];
  snapLblXY: [number, number];
}

/** One growth dock (dashed circle + "+" glyph + reveal-on-hover label). */
export interface DockDef {
  cx: number;
  cy: number;
  label: string;
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface BrainLayout {
  VIEWBOX: string;
  S: number;                              // stroke/dot scale
  GATHER: { x: number; y: number };
  STEM_END: number;
  LOBES: Array<[number, number, number, number]>;  // [cx, cy, rx, ry] scatter bounds
  SEATS: SeatMap;
  SEAT_INDEX: Record<string, number>;     // seat draw/traversal order
  MIN_DIST: number;                       // scatter-point rejection radius
  SRC: StationSource[];                   // desktop order: ef, cm, cs, gc, ch, ms (see note below)
  SRC_DELAY_CLASSES: string[];            // cycled by `index % length` for the .sig trace overlay
  OUT: OutputLayout;
  DOCKS: DockDef[];                       // [0] = sources dock, [1] = consumers dock
  FIRE_MOD: Record<string, number>;       // mesh-dot flicker modulus, keyed by datacenter id
}

export const DESKTOP_LAYOUT: BrainLayout = {
  VIEWBOX: '0 0 1200 800',   // mockup 364
  S: 1,                       // mockup 386
  GATHER: { x: 600, y: 542 }, // mockup 387
  STEM_END: 800,              // mockup 388
  LOBES: [                    // mockup 390 (desktop half of the P-ternary on 389-390)
    [580, 380, 150, 125],
    [690, 370, 110, 100],
    [610, 480, 95, 60],
  ],

  // mockup 402-404 (desktop half of the P-ternary starting 398)
  SEATS: {
    ef: { x: 505, y: 330, r: 9 },
    cm: { x: 655, y: 425, r: 11 },
    cs: { x: 600, y: 292, r: 7 },
    gc: { x: 530, y: 468, r: 8 },
    ch: { x: 720, y: 310, r: 6 },
    ms: { x: 640, y: 512, r: 6 },
  },
  SEAT_INDEX: { ef: 0, cm: 1, cs: 2, gc: 3, ch: 4, ms: 5 }, // mockup 405
  MIN_DIST: 26,  // mockup 408 (desktop half of `P ? 34 : 26`)

  // mockup 602-611 (the desktop half of the SRC ternary) + 613-619.
  // TRANSCRIPTION TRAP: the inline desktop array (602-611) carries a
  // placeholder `gc` entry (`label: { mode: "side... placeholder" }`, never
  // rendered); lines 613-619 unconditionally overwrite `SRC[3]` with the real
  // `gc` descriptor, then push `ch` and `ms`. The effective desktop order is
  // therefore ef, cm, cs, gc, ch, ms -- flattened here in that order, with the
  // real (post-replacement) `gc` entry, not the placeholder.
  SRC: [
    {
      id: 'ef', // mockup 603-604
      d: 'M97,168 L260,168 L340,248 L423,248 L505,330',
      pad: [83, 160, 14, 16],
      label: { mode: 'center', cx: 170, liney: 160 },
    },
    {
      id: 'cm', // mockup 605-606
      d: 'M97,478 L255,478 L321,412 L642,412 L655,425',
      pad: [83, 470, 14, 16],
      label: { mode: 'center', cx: 176, liney: 470 },
    },
    {
      id: 'cs', // mockup 607-608
      d: 'M421,66 L421,180 L480,239 L547,239 L600,292',
      pad: [413, 52, 16, 14],
      label: { mode: 'side', x: 404, y: 84, anchor: 'end' },
    },
    {
      id: 'gc', // mockup 614-615 (replaces the 609-610 placeholder)
      d: 'M97,648 L258,648 L338,568 L430,568 L530,468',
      pad: [83, 640, 14, 16],
      label: { mode: 'center', cx: 177, liney: 640 },
    },
    {
      id: 'ch', // mockup 616-617 (appended)
      d: 'M648,66 L648,150 L700,202 L700,290 L720,310',
      pad: [640, 52, 16, 14],
      label: { mode: 'side', x: 632, y: 84, anchor: 'end' },
    },
    {
      id: 'ms', // mockup 618-619 (appended)
      d: 'M478,725 L478,620 L560,538 L614,538 L640,512',
      pad: [470, 725, 16, 14],
      label: { mode: 'side', x: 498, y: 700, anchor: 'start' },
    },
  ],
  SRC_DELAY_CLASSES: ['', 's2', 's3', 's2'], // mockup 621, cycled by index % 4

  OUT: { // mockup 728-734 (desktop half of the OUT ternary starting 720)
    axon: 'M795,400 L858,400',
    gpt: [795, 400],
    jn: [860, 400],
    laneA: 'M866,397 L1024,397',
    laneQ: 'M1024,403 L866,403',
    arc1: 'M896,340 Q922,400 896,460',
    arc2: 'M906,338 Q932,400 906,462',
    port: [904, 388, 10, 24],
    mcpXY: [901, 326],
    agent: [1046, 400],
    agentLbl: [1046, 440],
    snap: 'M860,400 L860,470 L950,560 L1010,560',
    snapEnd: [1030, 560],
    tpLbl: [1048, 556],
    sgC: [1022, 600],
    sgLbl: [1038, 597],
    snapLblXY: [902, 505],
  },

  // mockup 703-704 (landscape-only dockDef rows)
  DOCKS: [
    { cx: 112, cy: 300, label: 'new datacenters dock here', labelX: 132, labelY: 304, anchor: 'start' },
    { cx: 1030, cy: 650, label: 'future consumers dock here', labelX: 1030, labelY: 676, anchor: 'middle' },
  ],

  FIRE_MOD: { cm: 6, ef: 8, gc: 11, cs: 13 }, // mockup 453
};
