import type { KeyboardModule } from "./index";

/**
 * Mouse module - 8 cells arranged to resemble a mouse. Local coordinate
 * space: x in 0..4, rows 1..3. Cells share the main-block keycap
 * rendering pipeline so highlights and click handling work uniformly.
 * No decoration function - the decorative outline and wheel glyphs were
 * removed because they overflowed the viewbox and rendered incorrectly;
 * the cell grid alone communicates the mouse layout adequately.
 */
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
};
