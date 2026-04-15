import { createEffect, createMemo, Show } from "solid-js";
import type { EzQuakeConfig, ChainBindClassification } from "../types";
import KeyboardLayout from "./KeyboardLayout";
import { moduleOf, type KeyboardRightModule } from "./keyboardModules";
import {
  buildKeyHighlights,
  buildSelectedIds,
  identifyKeyCommands,
  type BindSelection,
  type HighlightInput,
  type HighlightToggles,
} from "./keyboardHighlights";

interface ConfigKeyboardPanelProps {
  /** The primary (your) config. Null when no config is loaded. */
  primary: EzQuakeConfig | null;
  /** Relative path of the primary config file, shown as a label above its keyboard. */
  primaryName?: string | null;
  /** The compare chain's classified binds, when compare mode is active. */
  compare?: ChainBindClassification | null;
  /** Relative path of the comparison config file, shown as a label above its keyboard. */
  compareName?: string | null;
  /** When false, the panel renders only a slim "Show keyboard" button. */
  visible: boolean;
  onToggleVisible: () => void;
  /**
   * External selection -- when set, keyboards highlight matching keys.
   * Array form supports modifier combos: a single key click can pin
   * multiple commands at once (e.g. F = safe, Ctrl+F = lost).
   */
  selection: BindSelection;
  onSelectionChange: (sel: BindSelection) => void;
  showMovement: boolean;
  showWeapons: boolean;
  showTeamplay: boolean;
  onToggleMovement: () => void;
  onToggleWeapons: () => void;
  onToggleTeamplay: () => void;
  rightModule: KeyboardRightModule;
  setRightModule: (m: KeyboardRightModule) => void;
  availableModules: readonly KeyboardRightModule[];
}

export default function ConfigKeyboardPanel(props: ConfigKeyboardPanelProps) {
  const toggles = createMemo<HighlightToggles>(() => ({
    showMovement: props.showMovement,
    showWeapons: props.showWeapons,
    showTeamplay: props.showTeamplay,
  }));

  const primaryInput = createMemo<HighlightInput | null>(() => {
    const cfg = props.primary;
    if (!cfg) return null;
    return {
      weapon_binds: cfg.weapon_binds,
      teamsay_binds: cfg.teamsay_binds,
      movement: cfg.movement,
    };
  });

  const compareInput = createMemo<HighlightInput | null>(() => {
    const c = props.compare;
    if (!c) return null;
    return {
      weapon_binds: c.weapon_binds,
      teamsay_binds: c.teamsay_binds,
      movement: c.movement,
    };
  });

  const primaryHighlights = createMemo(() => {
    const input = primaryInput();
    if (!input) return new Map();
    return buildKeyHighlights(input, toggles());
  });

  const compareHighlights = createMemo(() => {
    const input = compareInput();
    if (!input) return new Map();
    return buildKeyHighlights(input, toggles());
  });

  const isCompare = () => props.compare != null && props.primary != null;

  // Lifted selection drives which keys are marked as "pinned" on each side.
  // buildSelectedIds handles the teamsay modifier-combo expansion so the
  // Ctrl/Shift/Alt keys get tinted alongside the letter key for a combo bind.
  const yourSelectedIds = createMemo(() => buildSelectedIds(primaryInput(), props.selection));
  const theirSelectedIds = createMemo(() => buildSelectedIds(compareInput(), props.selection));

  // Auto-reveal effect: when the selection's target keys live in a
  // non-active module on the primary keyboard, swap the active module
  // so they become visible. Tie-break: if the current module already
  // contains at least one of the keys, stay. Otherwise pick the first
  // module in order nav -> numpad -> mouse that contains a match.
  createEffect(() => {
    const sel = props.selection;
    if (!sel) return;

    const input = primaryInput();
    if (!input) return;

    const ids = buildSelectedIds(input, sel);
    if (ids.size === 0) return;

    const containingModules = new Set<KeyboardRightModule>();
    for (const id of ids) {
      const m = moduleOf(id);
      if (m && m !== "main") containingModules.add(m);
    }

    if (containingModules.size === 0) return;
    if (containingModules.has(props.rightModule)) return;

    const order: KeyboardRightModule[] = ["nav", "numpad", "mouse"];
    const next = order.find((m) => containingModules.has(m));
    if (next && props.availableModules.includes(next)) {
      props.setRightModule(next);
    }
  });

  function handleKeyClick(sideInput: HighlightInput | null, keyId: string) {
    if (!sideInput) return;
    const matches = identifyKeyCommands(sideInput, keyId);
    if (matches.length === 0) {
      props.onSelectionChange(null);
      return;
    }
    const normalized: NonNullable<ConfigKeyboardPanelProps["selection"]> = [];
    for (const m of matches) {
      if (m.kind === "weapon" && m.weapon) normalized.push({ kind: "weapon", weapon: m.weapon });
      else if (m.kind === "teamsay" && m.label) normalized.push({ kind: "teamsay", label: m.label });
    }
    if (normalized.length === 0) {
      props.onSelectionChange(null);
      return;
    }
    // Click-again-to-dismiss: current selection must match the new array exactly.
    const cur = props.selection;
    if (cur && cur.length === normalized.length && cur.every((c, i) => {
      const n = normalized[i];
      if (c.kind !== n.kind) return false;
      if (c.kind === "weapon" && n.kind === "weapon") return c.weapon === n.weapon;
      if (c.kind === "teamsay" && n.kind === "teamsay") return c.label === n.label;
      return false;
    })) {
      props.onSelectionChange(null);
      return;
    }
    props.onSelectionChange(normalized);
  }

  return (
    <div class="sg-config-kb-panel" classList={{ "sg-config-kb-panel-collapsed": !props.visible }}>
      <div class="sg-config-kb-header">
        <button
          class="btn btn-ghost btn-xs"
          onClick={props.onToggleVisible}
          title={props.visible ? "Hide keyboard panel" : "Show keyboard panel"}
        >
          {props.visible ? "Hide keyboard" : "Show keyboard"}
        </button>
      </div>
      <Show when={props.visible}>
        <div class="sg-config-kb-toggle-bar">
          <button
            class={`badge cursor-pointer ${props.showMovement ? "badge-binds" : "badge-ghost"}`}
            onClick={props.onToggleMovement}
          >
            Movement
          </button>
          <button
            class={`badge cursor-pointer ${props.showWeapons ? "badge-binds" : "badge-ghost"}`}
            onClick={props.onToggleWeapons}
          >
            Weapons
          </button>
          <button
            class={`badge cursor-pointer ${props.showTeamplay ? "badge-binds" : "badge-ghost"}`}
            onClick={props.onToggleTeamplay}
          >
            Teamplay
          </button>
        </div>
        {/* Right-slot module segmented control */}
        <div class="sg-config-kb-module-bar">
          {props.availableModules.map((m) => {
            const labels: Record<KeyboardRightModule, string> = {
              nav: "Nav",
              numpad: "Numpad",
              mouse: "Mouse",
            };
            return (
              <button
                class="sg-config-kb-module-btn"
                classList={{ "sg-config-kb-module-btn-active": props.rightModule === m }}
                onClick={() => props.setRightModule(m)}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>
        <Show when={props.primary}>
          <div class="sg-config-kb-wrap" classList={{ "sg-config-kb-frame-you": isCompare() }}>
            <Show when={props.primaryName}>
              <div class="sg-config-kb-label">{props.primaryName}</div>
            </Show>
            <KeyboardLayout
              movement={props.primary!.movement}
              highlights={primaryHighlights()}
              showMovement={props.showMovement}
              onKeyClick={(id) => handleKeyClick(primaryInput(), id)}
              selectedKeyIds={yourSelectedIds()}
              rightModule={props.rightModule}
            />
          </div>
        </Show>
        <Show when={isCompare()}>
          <div class="sg-config-kb-wrap sg-config-kb-frame-them">
            <Show when={props.compareName}>
              <div class="sg-config-kb-label">{props.compareName}</div>
            </Show>
            <KeyboardLayout
              movement={props.compare!.movement}
              highlights={compareHighlights()}
              showMovement={props.showMovement}
              onKeyClick={(id) => handleKeyClick(compareInput(), id)}
              selectedKeyIds={theirSelectedIds()}
              rightModule={props.rightModule}
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}
