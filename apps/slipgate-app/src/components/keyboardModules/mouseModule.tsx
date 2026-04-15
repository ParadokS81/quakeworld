import type { JSX } from "solid-js";
import type { KeyboardModule, ModuleDecorationCtx } from "./index";

function renderMouseDecoration(ctx: ModuleDecorationCtx): JSX.Element {
  const { kuBase, rowY, ku } = ctx;
  // Module spans 4u wide, 3 content rows (rows 1-3). Outline is a
  // rounded mouse silhouette framing the cells. Coordinates are in SVG
  // pixels so we can hand off directly to the SVG renderer.
  const left = kuBase - ku * 0.1;
  const right = kuBase + ku * 4.1;
  const top = rowY(1) - ku * 0.15;
  const bottom = rowY(3) + ku * 0.95;

  // Mouse outline: rounded rect with a subtle "waist" at the top (where
  // real mice have the scroll-wheel channel). Single decorative stroke.
  const outlinePath = `
    M ${left + ku * 0.4} ${top}
    L ${right - ku * 0.4} ${top}
    Q ${right} ${top}, ${right} ${top + ku * 0.4}
    L ${right} ${bottom - ku * 0.4}
    Q ${right} ${bottom}, ${right - ku * 0.4} ${bottom}
    L ${left + ku * 0.4} ${bottom}
    Q ${left} ${bottom}, ${left} ${bottom - ku * 0.4}
    L ${left} ${top + ku * 0.4}
    Q ${left} ${top}, ${left + ku * 0.4} ${top}
    Z
  `;

  // Wheel glyph: three small ridged ovals placed near the top edge of
  // Mouse3, MWheelUp, and MWheelDown cells. They share an accent color
  // to visually group the three wheel inputs.
  const wheelCx = kuBase + ku * 2; // center of M3 (spans cols 1-2)
  const wheelGlyph = (cx: number, cy: number) => (
    <g>
      <ellipse cx={cx} cy={cy} rx={ku * 0.18} ry={ku * 0.32}
               fill="var(--sg-kb-wheel-accent)" opacity="0.35"
               stroke="var(--sg-kb-wheel-accent)" stroke-width="1" />
      {/* ridges: three horizontal bars inside the oval */}
      <line x1={cx - ku * 0.12} y1={cy - ku * 0.12}
            x2={cx + ku * 0.12} y2={cy - ku * 0.12}
            stroke="var(--sg-kb-wheel-accent)" stroke-width="1.2" />
      <line x1={cx - ku * 0.12} y1={cy}
            x2={cx + ku * 0.12} y2={cy}
            stroke="var(--sg-kb-wheel-accent)" stroke-width="1.2" />
      <line x1={cx - ku * 0.12} y1={cy + ku * 0.12}
            x2={cx + ku * 0.12} y2={cy + ku * 0.12}
            stroke="var(--sg-kb-wheel-accent)" stroke-width="1.2" />
    </g>
  );

  return (
    <g class="sg-kb-mouse-decoration">
      <path d={outlinePath}
            fill="none"
            stroke="var(--sg-kb-mouse-outline)"
            stroke-width="2"
            stroke-linejoin="round" />
      {/* Wheel glyph on M3 (top of cell) */}
      {wheelGlyph(wheelCx, rowY(2) + ku * 0.22)}
      {/* Wheel glyph on MWheelUp (right column, top cell) */}
      {wheelGlyph(kuBase + ku * 3.5, rowY(2) + ku * 0.22)}
      {/* Wheel glyph on MWheelDown (right column, bottom cell) */}
      {wheelGlyph(kuBase + ku * 3.5, rowY(3) + ku * 0.22)}
    </g>
  );
}

export const MOUSE_MODULE: KeyboardModule = {
  id: "mouse",
  widthU: 4,
  keys: [
    // Row 1 - primary clicks
    { id: "Mouse1", label: "M1", x: 0, w: 2, row: 1 },
    { id: "Mouse2", label: "M2", x: 2, w: 2, row: 1 },
    // Row 2 - upper thumb, wheel click, wheel up
    { id: "Mouse5", label: "M5", x: 0, w: 1, row: 2 },
    { id: "Mouse3", label: "M3", x: 1, w: 2, row: 2 },
    { id: "MWheelUp", label: "MW\u2191", x: 3, w: 1, row: 2 },
    // Row 3 - lower thumb, reserved M6, wheel down
    { id: "Mouse4", label: "M4", x: 0, w: 1, row: 3 },
    { id: "Mouse6", label: "M6", x: 1, w: 2, row: 3 },
    { id: "MWheelDown", label: "MW\u2193", x: 3, w: 1, row: 3 },
  ],
  decoration: renderMouseDecoration,
};
