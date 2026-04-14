import { createSignal, createMemo, Show } from "solid-js";
import type { EzQuakeConfig, ChainBindClassification } from "../types";
import KeyboardLayout from "./KeyboardLayout";
import { buildKeyHighlights, type HighlightInput, type HighlightToggles } from "./keyboardHighlights";

interface ConfigKeyboardPanelProps {
  /** The primary (your) config. Null when no config is loaded. */
  primary: EzQuakeConfig | null;
  /** The compare chain's classified binds, when compare mode is active. */
  compare?: ChainBindClassification | null;
  /** Filename of the comparison config, used as the label above the bottom keyboard. */
  compareName?: string | null;
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

  return (
    <div class="sg-config-kb-panel">
      {/* Toggle bar */}
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

      {/* Primary keyboard */}
      <Show when={props.primary}>
        <div class="sg-config-kb-wrap" classList={{ "sg-config-kb-frame-you": isCompare() }}>
          <Show when={isCompare()}>
            <div class="sg-config-kb-label">You</div>
          </Show>
          <KeyboardLayout
            movement={props.primary!.movement}
            highlights={primaryHighlights()}
            showMovement={showMovement()}
          />
        </div>
      </Show>

      {/* Compare keyboard */}
      <Show when={isCompare()}>
        <div class="sg-config-kb-wrap sg-config-kb-frame-them">
          <div class="sg-config-kb-label">{props.compareName ?? "Comparison"}</div>
          <KeyboardLayout
            movement={props.compare!.movement}
            highlights={compareHighlights()}
            showMovement={showMovement()}
          />
        </div>
      </Show>
    </div>
  );
}
