import type { JSX } from "solid-js";
import type { KeyDef } from "../KeyboardLayout";
import { MAIN_BLOCK } from "../KeyboardLayout";
import { NAV_MODULE } from "./navModule";
import { NUMPAD_MODULE } from "./numpadModule";
import { MOUSE_MODULE } from "./mouseModule";

/** Identifier for a swappable right-slot module. */
export type KeyboardRightModule = "nav" | "numpad" | "mouse";

/** Rendering context passed to a module's decoration function. */
export interface ModuleDecorationCtx {
  /** Absolute x of module origin in SVG coordinates (NAV_X * KU). */
  kuBase: number;
  /** Row-to-pixel helper shared with the main block (applies F-row gap). */
  rowY: (row: number) => number;
  /** Keyboard-unit pixel size (KU constant from KeyboardLayout). */
  ku: number;
}

/**
 * A self-contained right-slot keyboard module. Each module owns its own
 * width and the keys (in local 0..widthU coordinate space) that appear in
 * that slot. Optional decoration renders behind the cells (used by the
 * mouse module to draw the silhouette + wheel glyphs).
 */
export interface KeyboardModule {
  id: KeyboardRightModule;
  widthU: number;
  keys: KeyDef[];
  decoration?: (ctx: ModuleDecorationCtx) => JSX.Element;
}

/**
 * Registry populated by the per-module files. Filled in during Tasks 2, 5,
 * 6, and 7. `null` entries compile but `KeyboardLayout` will throw if it
 * tries to render a missing module - that's intentional; tasks should land
 * in order.
 */
export const MODULES: Record<KeyboardRightModule, KeyboardModule> = {
  nav: NAV_MODULE,
  numpad: NUMPAD_MODULE,
  mouse: MOUSE_MODULE,
};

/** Cached lookup: layout ID -> module that owns it (or "main"). Built once. */
const moduleOfMap: Map<string, KeyboardRightModule | "main"> = (() => {
  const m = new Map<string, KeyboardRightModule | "main">();
  for (const key of MAIN_BLOCK) m.set(key.id, "main");
  for (const mod of Object.values(MODULES)) {
    for (const key of mod.keys) m.set(key.id, mod.id);
  }
  return m;
})();

/**
 * Returns which module a layout ID belongs to, "main" for main-block
 * keys, or null if the ID is unknown. Constant-time lookup.
 */
export function moduleOf(layoutId: string): KeyboardRightModule | "main" | null {
  return moduleOfMap.get(layoutId) ?? null;
}
