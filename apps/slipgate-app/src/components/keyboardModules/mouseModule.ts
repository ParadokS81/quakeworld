import type { KeyboardModule } from "./index";

/**
 * Mouse module - 8 cells arranged to resemble a mouse. Local coordinate
 * space: x in 0..4, rows 1..4 (the module uses one fewer row than the
 * numpad; row 5 is intentionally empty).
 *
 * Layout:
 *   Row 1: [ Mouse1 (2u) ] [ Mouse2 (2u) ]      primary clicks
 *   Row 2: [M5] [ Mouse3 (2u) ] [MW+]            upper thumb + wheel row
 *   Row 3: [M4] [ Mouse6 (2u) ] [MW-]            lower thumb + wheel row
 *
 * Mouse6 is rendered dimmed when no mouse6 bind exists (handled in
 * KeyboardLayout's key rendering, not in the module data). The
 * decoration function (added in Task 7) draws the mouse outline and
 * wheel glyphs behind these cells.
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
