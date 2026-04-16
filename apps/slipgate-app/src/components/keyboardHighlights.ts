import type { FiringPath, TeamsayBind, MovementKeys } from "../types";
import type { KeyHighlight } from "./KeyboardLayout";
import { toLayoutId } from "./KeyboardLayout";
import { WEAPON_COLORS } from "./WeaponBindViz";

/** Teamsay category -> OKLCH color, shared between Profile and ConfigViewer. */
export const TEAMSAY_COLORS: Record<string, string> = {
  status:   "oklch(0.7 0.15 210)",  // cyan
  death:    "oklch(0.65 0.2 25)",   // red
  movement: "oklch(0.7 0.15 145)",  // green
  items:    "oklch(0.75 0.15 85)",  // yellow
  enemy:    "oklch(0.65 0.2 30)",   // red-orange
  orders:   "oklch(0.7 0.15 55)",   // orange
  powerups: "oklch(0.7 0.18 300)",  // purple
  confirm:  "oklch(0.65 0.1 250)",  // blue-gray
  custom:   "oklch(0.6 0.08 0)",    // neutral gray
};

export const WEAPON_LABELS: Record<string, string> = {
  rl: "RL", lg: "LG", gl: "GL", sng: "SNG", ng: "NG",
  ssg: "SSG", sg: "SG", axe: "AXE",
};

// Unicode arrows preserved from ProfileTab.tsx - ASCII-only rule is pre-existing
// drift here; cleanup is a separate task.
export const MOVE_ARROWS: Record<string, string> = {
  forward: "↑", back: "↓", moveleft: "←", moveright: "→",
};

export interface HighlightToggles {
  showMovement: boolean;
  showWeapons: boolean;
  showTeamplay: boolean;
}

export interface HighlightInput {
  weapon_binds: FiringPath[];
  teamsay_binds: TeamsayBind[];
  movement: MovementKeys;
}

/** Build the per-key color map based on which categories are enabled. */
export function buildKeyHighlights(
  input: HighlightInput,
  toggles: HighlightToggles,
): Map<string, KeyHighlight> {
  const highlights = new Map<string, KeyHighlight>();
  // Note: showMovement has no effect here. Movement keys are labeled
  // (arrow glyphs) in buildKeyLabels but never color-tinted in the
  // highlight map. The field lives on HighlightToggles because
  // buildKeyLabels also consumes it.
  if (toggles.showWeapons) {
    for (const wb of input.weapon_binds) {
      const id = toLayoutId(wb.trigger_key);
      if (id) {
        const color = WEAPON_COLORS[wb.weapon] ?? "oklch(0.5 0.05 0)";
        highlights.set(id, { color });
      }
    }
  }
  if (toggles.showTeamplay) {
    for (const tb of input.teamsay_binds) {
      const id = toLayoutId(tb.key);
      if (id && !highlights.has(id)) {
        const color = TEAMSAY_COLORS[tb.category] ?? "oklch(0.6 0.08 0)";
        highlights.set(id, { color });
      }
    }
  }
  return highlights;
}

/** Build the per-key label override map when label mode is on. */
export function buildKeyLabels(
  input: HighlightInput,
  toggles: HighlightToggles,
  showBindLabels: boolean,
): Map<string, string> | undefined {
  if (!showBindLabels) return undefined;
  const labels = new Map<string, string>();
  if (toggles.showMovement) {
    const m = input.movement;
    for (const [dir, arrow] of Object.entries(MOVE_ARROWS)) {
      const key = m[dir as keyof typeof m];
      const id = toLayoutId(key);
      if (id) labels.set(id, arrow);
    }
    const jumpId = toLayoutId(m.jump);
    if (jumpId) labels.set(jumpId, "jump");
  }
  if (toggles.showWeapons) {
    // Quickfire paths take priority: if a key has both quickfire and
    // manual for the same weapon, showing both produces noisy labels
    // like "SSG/SSG". Collect quickfire first, then only add manual
    // paths whose weapon isn't already represented on that key.
    const quickfireByKey = new Map<string, Set<string>>();
    for (const wb of input.weapon_binds) {
      if (wb.method !== "quickfire") continue;
      const id = toLayoutId(wb.trigger_key);
      if (!id) continue;
      if (!quickfireByKey.has(id)) quickfireByKey.set(id, new Set());
      quickfireByKey.get(id)!.add(wb.weapon);
      const existing = labels.get(id);
      const wLabel = WEAPON_LABELS[wb.weapon] ?? wb.weapon.toUpperCase();
      labels.set(id, existing ? `${existing}/${wLabel}` : wLabel);
    }
    for (const wb of input.weapon_binds) {
      if (wb.method === "quickfire") continue;
      const id = toLayoutId(wb.trigger_key);
      if (!id) continue;
      if (quickfireByKey.get(id)?.has(wb.weapon)) continue;
      const existing = labels.get(id);
      const wLabel = WEAPON_LABELS[wb.weapon] ?? wb.weapon.toUpperCase();
      labels.set(id, existing ? `${existing}/${wLabel}` : wLabel);
    }
  }
  if (toggles.showTeamplay) {
    for (const tb of input.teamsay_binds) {
      const id = toLayoutId(tb.key);
      if (id && !labels.has(id)) {
        labels.set(id, tb.label);
      }
    }
  }
  return labels.size > 0 ? labels : undefined;
}

/**
 * Canonical selection item: either a weapon (matched by name) or a teamsay
 * label. Shared by the click-to-pin flow across the keyboard panel, the bind
 * list, and useKeyboardPanelState.
 */
export type BindSelectionItem =
  | { kind: "weapon"; weapon: string }
  | { kind: "teamsay"; label: string };
export type BindSelection = BindSelectionItem[] | null;

/**
 * Given a parsed config and a canonical command identifier (weapon name like
 * "rl" / "sg" or a teamsay label like "safe" / "lost"), return the set of
 * layout key IDs bound to that command. Used by click-to-pin to find the
 * matching key on the OTHER keyboard when commands are matched by name.
 */
export function resolveCommandKeys(
  input: HighlightInput,
  command: BindSelectionItem,
): Set<string> {
  const ids = new Set<string>();
  if (command.kind === "weapon") {
    for (const wb of input.weapon_binds) {
      if (wb.weapon === command.weapon) {
        const id = toLayoutId(wb.trigger_key);
        if (id) ids.add(id);
      }
    }
  } else {
    for (const tb of input.teamsay_binds) {
      if (tb.label === command.label) {
        const id = toLayoutId(tb.key);
        if (id) ids.add(id);
      }
    }
  }
  return ids;
}

/**
 * Reverse lookup: given a parsed config and a layout key ID, identify what
 * command(s) that key is bound to. Returns all matching binds so modifier
 * combos (e.g. F = safe, Ctrl+F = lost) can be handled.
 */
export interface KeyCommandMatch {
  kind: "weapon" | "teamsay";
  weapon?: string;
  label?: string;
  category?: string;
  modifierKey?: string;
}

/**
 * Build the set of layout key IDs to mark as "selected" on a keyboard for a
 * given selection. Mirrors what resolveCommandKeys would return for each
 * selection item, plus the extra modifier keys for teamsay combos (Ctrl+F,
 * Shift+G) so the full combo is tinted on the layout.
 *
 * Used by ConfigKeyboardPanel for both the primary ("your") and compare
 * ("their") keyboards so the highlighting stays consistent across sides.
 */
export function buildSelectedIds(
  input: HighlightInput | null,
  selection: BindSelection,
): Set<string> {
  if (!selection || !input) return new Set();
  const ids = new Set<string>();
  for (const s of selection) {
    for (const id of resolveCommandKeys(input, s)) ids.add(id);
  }
  for (const s of selection) {
    if (s.kind !== "teamsay") continue;
    for (const tb of input.teamsay_binds) {
      if (tb.label !== s.label) continue;
      if (!tb.key.includes("+")) continue;
      const parts = tb.key.split("+").map((p) => p.trim());
      for (const mod of parts.slice(0, -1)) {
        const layoutId = toLayoutId(mod);
        if (layoutId) ids.add(layoutId);
      }
    }
  }
  return ids;
}

export function identifyKeyCommands(
  input: HighlightInput,
  keyId: string,
): KeyCommandMatch[] {
  const matches: KeyCommandMatch[] = [];
  for (const wb of input.weapon_binds) {
    if (toLayoutId(wb.trigger_key) === keyId) {
      matches.push({ kind: "weapon", weapon: wb.weapon });
    }
  }
  for (const tb of input.teamsay_binds) {
    if (toLayoutId(tb.key) === keyId) {
      matches.push({ kind: "teamsay", label: tb.label, category: tb.category });
      continue;
    }
    if (tb.key.includes("+")) {
      const parts = tb.key.split("+").map(p => p.trim());
      const target = parts[parts.length - 1];
      const mod = parts.slice(0, -1).join("+");
      if (toLayoutId(target) === keyId) {
        matches.push({ kind: "teamsay", label: tb.label, category: tb.category, modifierKey: mod });
      }
    }
  }
  return matches;
}
