import type { KeyboardModule } from "./index";

/**
 * Full extended numpad cluster. Local coordinate space: x in 0..4,
 * rows 1..5 (row 0 / F-row intentionally empty to match nav module).
 *
 * Display labels are chosen to match what a user sees on the physical
 * key - digit names take priority over functional names (so "7" not
 * "HOME"), matching the plan's canonical cell IDs.
 *
 * 0 spans 2u, + spans rows 1-2, Enter spans rows 3-4.
 */
export const NUMPAD_MODULE: KeyboardModule = {
  id: "numpad",
  widthU: 4,
  keys: [
    // Row 1 - Num Lock, /, *, -
    { id: "Kp_Num", label: "Num", x: 0, w: 1, row: 1 },
    { id: "Kp_Slash", label: "/", x: 1, w: 1, row: 1 },
    { id: "Kp_Star", label: "*", x: 2, w: 1, row: 1 },
    { id: "Kp_Minus", label: "-", x: 3, w: 1, row: 1 },
    // Row 2 - 7, 8, 9 (+ would start here but we place it in row 2 since our rows are narrower than a real numpad)
    { id: "Kp_7", label: "7", x: 0, w: 1, row: 2 },
    { id: "Kp_8", label: "8", x: 1, w: 1, row: 2 },
    { id: "Kp_9", label: "9", x: 2, w: 1, row: 2 },
    { id: "Kp_Plus", label: "+", x: 3, w: 1, row: 2 },
    // Row 3 - 4, 5, 6 (+ continues visually; we render Kp_Plus only once so row 3 skips column 3)
    { id: "Kp_4", label: "4", x: 0, w: 1, row: 3 },
    { id: "Kp_5", label: "5", x: 1, w: 1, row: 3 },
    { id: "Kp_6", label: "6", x: 2, w: 1, row: 3 },
    // Row 4 - 1, 2, 3, Enter
    { id: "Kp_1", label: "1", x: 0, w: 1, row: 4 },
    { id: "Kp_2", label: "2", x: 1, w: 1, row: 4 },
    { id: "Kp_3", label: "3", x: 2, w: 1, row: 4 },
    { id: "Kp_Enter", label: "\u21b5", x: 3, w: 1, row: 4 },
    // Row 5 - 0 (wide), .
    { id: "Kp_0", label: "0", x: 0, w: 2, row: 5 },
    { id: "Kp_Dot", label: ".", x: 2, w: 1, row: 5 },
  ],
};
