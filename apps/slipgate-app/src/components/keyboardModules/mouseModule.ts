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
    // Row 0 - primary clicks (F-row level, top of module)
    { id: "Mouse1", label: "M1", x: 0, w: 2, row: 0 },
    { id: "Mouse2", label: "M2", x: 2, w: 2, row: 0 },
    // Rows 1.3-3.3 - wheel cluster, vertically centered between top/bottom
    { id: "MWheelUp", label: "MW\u2191", x: 2, w: 2, row: 1.3 },
    { id: "Mouse3", label: "M3", x: 2, w: 2, row: 2.3 },
    { id: "MWheelDown", label: "MW\u2193", x: 2, w: 2, row: 3.3 },
    // Row 5 - side/thumb buttons (bottom of module)
    { id: "Mouse5", label: "M5", x: 0, w: 2, row: 5 },
    { id: "Mouse4", label: "M4", x: 2, w: 2, row: 5 },
  ],
};
