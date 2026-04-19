import type { KeyboardModule } from "./index";

/**
 * Full extended numpad cluster. Local coordinate space: x in 0..4,
 * rows 1..5 (row 0 / F-row intentionally empty to match nav module).
 *
 * Display labels are chosen to match what a user sees on the physical
 * key - digit names take priority over functional names (so "7" not
 * "HOME"), matching the plan's canonical cell IDs.
 *
 * + spans rows 2-3 and Enter spans rows 4-5 via the h=2 field, so the
 * layout visually matches a real numpad.
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
    // Row 2 - 7, 8, 9, + (+ spans rows 2-3)
    { id: "Kp_7", label: "7", x: 0, w: 1, row: 2 },
    { id: "Kp_8", label: "8", x: 1, w: 1, row: 2 },
    { id: "Kp_9", label: "9", x: 2, w: 1, row: 2 },
    { id: "Kp_Plus", label: "+", x: 3, w: 1, row: 2, h: 2 },
    // Row 3 - 4, 5, 6 (+ continues from row 2, no cell at col 3)
    { id: "Kp_4", label: "4", x: 0, w: 1, row: 3 },
    { id: "Kp_5", label: "5", x: 1, w: 1, row: 3 },
    { id: "Kp_6", label: "6", x: 2, w: 1, row: 3 },
    // Row 4 - 1, 2, 3, Enter (Enter spans rows 4-5)
    { id: "Kp_1", label: "1", x: 0, w: 1, row: 4 },
    { id: "Kp_2", label: "2", x: 1, w: 1, row: 4 },
    { id: "Kp_3", label: "3", x: 2, w: 1, row: 4 },
    { id: "Kp_Enter", label: "\u21b5", x: 3, w: 1, row: 4, h: 2 },
    // Row 5 - 0 (wide), . (Enter continues from row 4, no cell at col 3)
    { id: "Kp_0", label: "0", x: 0, w: 2, row: 5 },
    { id: "Kp_Dot", label: ".", x: 2, w: 1, row: 5 },
  ],
};
