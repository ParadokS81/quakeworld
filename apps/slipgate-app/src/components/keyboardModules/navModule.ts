import type { KeyboardModule } from "./index";

/**
 * Nav cluster + arrow keys. Local coordinate space: x in 0..3, rows
 * match the main keyboard's row grid (F-row = 0, top-row = 1, etc.).
 * Mirrors the pre-refactor hardcoded layout exactly.
 */
export const NAV_MODULE: KeyboardModule = {
  id: "nav",
  widthU: 3,
  keys: [
    // Row 1 - top of nav cluster
    { id: "Insert", label: "Ins", x: 0, w: 1, row: 1 },
    { id: "Home", label: "Hm", x: 1, w: 1, row: 1 },
    { id: "PageUp", label: "PU", x: 2, w: 1, row: 1 },
    // Row 2 - middle of nav cluster
    { id: "Delete", label: "Del", x: 0, w: 1, row: 2 },
    { id: "End", label: "End", x: 1, w: 1, row: 2 },
    { id: "PageDown", label: "PD", x: 2, w: 1, row: 2 },
    // Row 4 - Up arrow (row 3 intentionally empty)
    { id: "UpArrow", label: "\u2191", x: 1, w: 1, row: 4 },
    // Row 5 - Left, Down, Right arrows
    { id: "LeftArrow", label: "\u2190", x: 0, w: 1, row: 5 },
    { id: "DownArrow", label: "\u2193", x: 1, w: 1, row: 5 },
    { id: "RightArrow", label: "\u2192", x: 2, w: 1, row: 5 },
  ],
};
