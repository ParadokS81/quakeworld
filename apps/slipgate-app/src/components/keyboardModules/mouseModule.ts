import type { KeyboardModule } from "./index";

/**
 * Mouse module - diagram layout. Primary clicks at top, wheel cluster
 * stacked on the right, side buttons at bottom. The left column
 * (x 0..2u, rows 2-4) is reserved for the mouse SVG diagram rendered
 * by MouseDiagram. Mouse6 omitted - virtually unused in QW.
 */
export const MOUSE_MODULE: KeyboardModule = {
  id: "mouse",
  widthU: 4,
  keys: [
    // Row 1 - primary clicks
    { id: "Mouse1", label: "M1", x: 0, w: 2, row: 1 },
    { id: "Mouse2", label: "M2", x: 2, w: 2, row: 1 },
    // Rows 2-4 - wheel cluster (right column, stacked)
    { id: "MWheelUp", label: "MW\u2191", x: 2, w: 2, row: 2 },
    { id: "Mouse3", label: "M3", x: 2, w: 2, row: 3 },
    { id: "MWheelDown", label: "MW\u2193", x: 2, w: 2, row: 4 },
    // Row 5 - side/thumb buttons
    { id: "Mouse5", label: "M5", x: 0, w: 2, row: 5 },
    { id: "Mouse4", label: "M4", x: 2, w: 2, row: 5 },
  ],
};
