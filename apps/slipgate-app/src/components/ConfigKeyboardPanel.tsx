import { createSignal, createMemo, Show } from "solid-js";
import type { EzQuakeConfig, ChainBindClassification } from "../types";
import KeyboardLayout from "./KeyboardLayout";
import { buildKeyHighlights, resolveCommandKeys, identifyKeyCommands, type HighlightInput, type HighlightToggles } from "./keyboardHighlights";

interface ConfigKeyboardPanelProps {
  /** The primary (your) config. Null when no config is loaded. */
  primary: EzQuakeConfig | null;
  /** The compare chain's classified binds, when compare mode is active. */
  compare?: ChainBindClassification | null;
  /** Filename of the comparison config. */
  compareName?: string | null;
  /** When false, the panel renders only a slim "Show keyboard" button. */
  visible: boolean;
  onToggleVisible: () => void;
  /** External selection -- when set, keyboards highlight matching keys. */
  selection: { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string } | null;
  onSelectionChange: (sel: { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string } | null) => void;
}

const DEFAULT_TOGGLES: HighlightToggles = {
  showMovement: true,
  showWeapons: true,
  showTeamplay: true,
};

export default function ConfigKeyboardPanel(props: ConfigKeyboardPanelProps) {
  // Local toggle state. Task 11 moves this into ProfilePrefs.
  const [showMovement, setShowMovement] = createSignal(DEFAULT_TOGGLES.showMovement);
  const [showWeapons, setShowWeapons] = createSignal(DEFAULT_TOGGLES.showWeapons);
  const [showTeamplay, setShowTeamplay] = createSignal(DEFAULT_TOGGLES.showTeamplay);

  const toggles = createMemo<HighlightToggles>(() => ({
    showMovement: showMovement(),
    showWeapons: showWeapons(),
    showTeamplay: showTeamplay(),
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

  // Derived: set of layout IDs to mark as selected on the "your" keyboard.
  // Driven by the lifted selection prop so both keyboards and the bind list
  // agree on what's pinned.
  const yourSelectedIds = createMemo<Set<string>>(() => {
    const sel = props.selection;
    const input = primaryInput();
    if (!sel || !input) return new Set();
    return resolveCommandKeys(input, sel);
  });

  const theirSelectedIds = createMemo<Set<string>>(() => {
    const sel = props.selection;
    const input = compareInput();
    if (!sel || !input) return new Set();
    return resolveCommandKeys(input, sel);
  });

  function handleKeyClick(sideInput: HighlightInput | null, keyId: string) {
    if (!sideInput) return;
    const matches = identifyKeyCommands(sideInput, keyId);
    if (matches.length === 0) {
      props.onSelectionChange(null);
      return;
    }
    // Task 9 picks the first match. Task 10 widens this for multi-bind combos.
    const first = matches[0];
    const next = first.kind === "weapon"
      ? { kind: "weapon" as const, weapon: first.weapon! }
      : { kind: "teamsay" as const, label: first.label! };
    // Click-again-to-dismiss
    const cur = props.selection;
    if (cur && cur.kind === next.kind &&
        ((cur.kind === "weapon" && next.kind === "weapon" && cur.weapon === next.weapon) ||
         (cur.kind === "teamsay" && next.kind === "teamsay" && cur.label === next.label))) {
      props.onSelectionChange(null);
      return;
    }
    props.onSelectionChange(next);
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
            class={`badge cursor-pointer ${showMovement() ? "badge-binds" : "badge-ghost"}`}
            onClick={() => setShowMovement(v => !v)}
          >
            Movement
          </button>
          <button
            class={`badge cursor-pointer ${showWeapons() ? "badge-binds" : "badge-ghost"}`}
            onClick={() => setShowWeapons(v => !v)}
          >
            Weapons
          </button>
          <button
            class={`badge cursor-pointer ${showTeamplay() ? "badge-binds" : "badge-ghost"}`}
            onClick={() => setShowTeamplay(v => !v)}
          >
            Teamplay
          </button>
        </div>
        <Show when={props.primary}>
          <div class="sg-config-kb-wrap" classList={{ "sg-config-kb-frame-you": isCompare() }}>
            <Show when={isCompare()}>
              <div class="sg-config-kb-label">You</div>
            </Show>
            <KeyboardLayout
              movement={props.primary!.movement}
              highlights={primaryHighlights()}
              showMovement={showMovement()}
              onKeyClick={(id) => handleKeyClick(primaryInput(), id)}
              selectedKeyIds={yourSelectedIds()}
            />
          </div>
        </Show>
        <Show when={isCompare()}>
          <div class="sg-config-kb-wrap sg-config-kb-frame-them">
            <div class="sg-config-kb-label">{props.compareName ?? "Comparison"}</div>
            <KeyboardLayout
              movement={props.compare!.movement}
              highlights={compareHighlights()}
              showMovement={showMovement()}
              onKeyClick={(id) => handleKeyClick(compareInput(), id)}
              selectedKeyIds={theirSelectedIds()}
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}
