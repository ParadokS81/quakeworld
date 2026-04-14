import { createSignal, createMemo, createEffect, onCleanup, Show } from "solid-js";
import type { EzQuakeConfig, ChainBindClassification } from "../types";
import KeyboardLayout from "./KeyboardLayout";
import { buildKeyHighlights, resolveCommandKeys, identifyKeyCommands, type HighlightInput, type HighlightToggles, type KeyCommandMatch } from "./keyboardHighlights";

interface ConfigKeyboardPanelProps {
  /** The primary (your) config. Null when no config is loaded. */
  primary: EzQuakeConfig | null;
  /** The compare chain's classified binds, when compare mode is active. */
  compare?: ChainBindClassification | null;
  /** Filename of the comparison config, used as the label above the bottom keyboard. */
  compareName?: string | null;
  /** When false, the panel renders only a slim "Show keyboard" button. */
  visible: boolean;
  onToggleVisible: () => void;
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

  // Selection state: which side was clicked and the list of matched commands.
  // When non-null, both keyboards render selectedKeyIds for those commands.
  const [selection, setSelection] = createSignal<KeyCommandMatch[] | null>(null);

  // Derived: set of layout IDs to mark as selected on the "your" keyboard.
  const yourSelectedIds = createMemo<Set<string>>(() => {
    const sel = selection();
    const input = primaryInput();
    if (!sel || !input) return new Set();
    const ids = new Set<string>();
    for (const match of sel) {
      if (match.kind === "weapon" && match.weapon) {
        for (const id of resolveCommandKeys(input, { kind: "weapon", weapon: match.weapon })) ids.add(id);
      } else if (match.kind === "teamsay" && match.label) {
        for (const id of resolveCommandKeys(input, { kind: "teamsay", label: match.label })) ids.add(id);
      }
    }
    return ids;
  });

  // Derived: same for the "theirs" keyboard.
  const theirSelectedIds = createMemo<Set<string>>(() => {
    const sel = selection();
    const input = compareInput();
    if (!sel || !input) return new Set();
    const ids = new Set<string>();
    for (const match of sel) {
      if (match.kind === "weapon" && match.weapon) {
        for (const id of resolveCommandKeys(input, { kind: "weapon", weapon: match.weapon })) ids.add(id);
      } else if (match.kind === "teamsay" && match.label) {
        for (const id of resolveCommandKeys(input, { kind: "teamsay", label: match.label })) ids.add(id);
      }
    }
    return ids;
  });

  function handleKeyClick(sideInput: HighlightInput | null, keyId: string) {
    if (!sideInput) return;
    const matches = identifyKeyCommands(sideInput, keyId);
    if (matches.length === 0) {
      // Clicked an unbound key -- clear selection
      setSelection(null);
      return;
    }
    // Click-again-to-dismiss: if current selection matches exactly, clear it
    const current = selection();
    if (current && current.length === matches.length && current.every((c, i) =>
      c.kind === matches[i].kind &&
      c.weapon === matches[i].weapon &&
      c.label === matches[i].label
    )) {
      setSelection(null);
      return;
    }
    setSelection(matches);
  }

  createEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selection() !== null) setSelection(null);
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

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
