import { createEffect, createMemo, createSignal, untrack, Show } from "solid-js";
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

  // Per-side module state. The segmented control at the top is authoritative:
  // clicking it forces both sides to the chosen module AND persists to the
  // pref. Auto-reveal is allowed to drive the two sides apart when the
  // current selection's target keys live on different modules per side (e.g.
  // primary binds "kill me" to mouse4, compare binds it to kp_7); the split
  // state is transient and the next manual click re-syncs.
  //
  // The local signals are seeded from props.rightModule (the persisted hook
  // value) and re-seeded whenever it changes, so profile reloads flow in.
  const [primaryModule, setPrimaryModule] = createSignal<KeyboardRightModule>(props.rightModule);
  const [compareModule, setCompareModule] = createSignal<KeyboardRightModule>(props.rightModule);

  createEffect(() => {
    const m = props.rightModule;
    setPrimaryModule(m);
    setCompareModule(m);
  });

  function resolveContainingModules(input: HighlightInput | null, sel: BindSelection): Set<KeyboardRightModule> {
    const containing = new Set<KeyboardRightModule>();
    if (!input || !sel) return containing;
    const ids = buildSelectedIds(input, sel);
    for (const id of ids) {
      const m = moduleOf(id);
      if (m && m !== "main") containing.add(m);
    }
    return containing;
  }

  function pickRevealTarget(
    current: KeyboardRightModule,
    containing: Set<KeyboardRightModule>,
  ): KeyboardRightModule | null {
    if (containing.size === 0) return null;
    if (containing.has(current)) return null;
    const order: KeyboardRightModule[] = ["nav", "numpad", "mouse"];
    return order.find((m) => containing.has(m)) ?? null;
  }

  // Primary auto-reveal. Tracks selection + primary input only; reads the
  // current module via untrack so clicks on the segmented control (which
  // sync both sides via the mirror effect above, not via selection) do not
  // retrigger this effect and stomp the user's choice.
  createEffect(() => {
    const sel = props.selection;
    const input = primaryInput();
    const containing = resolveContainingModules(input, sel);
    const next = pickRevealTarget(untrack(primaryModule), containing);
    if (next && props.availableModules.includes(next)) {
      setPrimaryModule(next);
    }
  });

  // Compare auto-reveal. Same shape, but resolved against compareInput.
  createEffect(() => {
    const sel = props.selection;
    const input = compareInput();
    const containing = resolveContainingModules(input, sel);
    const next = pickRevealTarget(untrack(compareModule), containing);
    if (next && props.availableModules.includes(next)) {
      setCompareModule(next);
    }
  });

  function syncBothModules(m: KeyboardRightModule) {
    setPrimaryModule(m);
    setCompareModule(m);
    props.setRightModule(m);
  }

  const isModuleSynced = (m: KeyboardRightModule) =>
    primaryModule() === m && (!isCompare() || compareModule() === m);

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
        {/* Right-slot module segmented control. Clicking a button syncs
            both keyboards to that module and persists it. A button is
            marked active only when BOTH sides currently show that module;
            while the two sides are split (transient auto-reveal state), no
            button highlights - a visible signal that the next click will
            re-sync. */}
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
                classList={{ "sg-config-kb-module-btn-active": isModuleSynced(m) }}
                onClick={() => syncBothModules(m)}
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
              rightModule={primaryModule()}
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
              rightModule={compareModule()}
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}
