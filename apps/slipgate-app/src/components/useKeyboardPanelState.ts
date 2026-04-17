import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import {
  updatePrefs,
  updateSimulatorState,
  saveSimulatorTemplate,
  loadSimulatorTemplate,
  deleteSimulatorTemplate,
  resetSimulatorState,
  type ProfileData,
  type SimulatorTemplate,
} from "../store";
import type { PlayerState } from "../lib/simulator";
import { createDefaultPlayerState } from "../lib/simulator";
import type { BindSelection } from "./keyboardHighlights";
import type { KeyboardRightModule } from "./keyboardModules";

interface UseKeyboardPanelStateInput {
  profile: () => ProfileData | null | undefined;
  activeRow2: () => Set<string>;
  // NEW - which modules the consumer supports (shapes the toggle row).
  availableModules: readonly KeyboardRightModule[];
  // NEW - selects which ProfilePrefs field to read/write.
  persistKey: "config" | "profile";
}

/**
 * Owns all state the ConfigKeyboardPanel needs, plus the shared click-to-pin
 * selection used by both the panel and the bind-list sections. Extracted from
 * ConfigViewer so the file stays focused on config merging/rendering and so
 * the modular-keyboard feature has a single place to land.
 *
 * Persistence is one-way (local signal mirrors props.profile.prefs via effect;
 * togglers write to the Tauri store). The mirror can be clobbered if another
 * code path calls setProfile() during a session; accepted trade-off until a
 * reactive profile store lands. See the same note in ConfigViewer history.
 */
export function useKeyboardPanelState(input: UseKeyboardPanelStateInput) {
  // Shared click-to-pin selection
  const [selection, setSelection] = createSignal<BindSelection>(null);

  function handleEsc(e: KeyboardEvent) {
    if (e.key === "Escape") setSelection(null);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEsc);
    onCleanup(() => window.removeEventListener("keydown", handleEsc));
  }

  function isWeaponSelected(weapon: string): boolean {
    const sel = selection();
    return !!sel && sel.some((s) => s.kind === "weapon" && s.weapon === weapon);
  }
  function isLabelSelected(label: string): boolean {
    const sel = selection();
    return !!sel && sel.some((s) => s.kind === "teamsay" && s.label === label);
  }

  // Whether the binds section is the active row-2 pill
  const isBindsSectionFocused = createMemo(() => {
    const row2 = input.activeRow2();
    return row2.has("weapons:binds") || row2.has("teamplay:binds") || row2.has("movement:binds");
  });

  // Panel visibility
  const [visible, setVisible] = createSignal<boolean>(
    input.profile()?.prefs.config_keyboard_visible ?? true,
  );
  createEffect(() => {
    const p = input.profile()?.prefs.config_keyboard_visible;
    if (p !== undefined) setVisible(p);
  });
  async function toggleVisible() {
    const next = !visible();
    setVisible(next);
    try {
      await updatePrefs({ config_keyboard_visible: next });
    } catch (e) {
      console.error("Failed to persist keyboard visibility pref:", e);
    }
  }

  // Category toggles (Movement / Weapons / Teamplay)
  const [showMovement, setShowMovement] = createSignal<boolean>(
    input.profile()?.prefs.config_keyboard_show_movement ?? true,
  );
  const [showWeapons, setShowWeapons] = createSignal<boolean>(
    input.profile()?.prefs.config_keyboard_show_weapons ?? true,
  );
  const [showTeamplay, setShowTeamplay] = createSignal<boolean>(
    input.profile()?.prefs.config_keyboard_show_teamplay ?? true,
  );
  createEffect(() => {
    const p = input.profile()?.prefs;
    if (!p) return;
    setShowMovement(p.config_keyboard_show_movement);
    setShowWeapons(p.config_keyboard_show_weapons);
    setShowTeamplay(p.config_keyboard_show_teamplay);
  });
  async function toggleMovement() {
    const next = !showMovement();
    setShowMovement(next);
    try { await updatePrefs({ config_keyboard_show_movement: next }); }
    catch (e) { console.error("Failed to persist kb movement toggle:", e); }
  }
  async function toggleWeapons() {
    const next = !showWeapons();
    setShowWeapons(next);
    try { await updatePrefs({ config_keyboard_show_weapons: next }); }
    catch (e) { console.error("Failed to persist kb weapons toggle:", e); }
  }
  async function toggleTeamplay() {
    const next = !showTeamplay();
    setShowTeamplay(next);
    try { await updatePrefs({ config_keyboard_show_teamplay: next }); }
    catch (e) { console.error("Failed to persist kb teamplay toggle:", e); }
  }

  // Right-slot module state
  const moduleField = input.persistKey === "config"
    ? "config_keyboard_right_module"
    : "profile_keyboard_right_module";

  function readPersistedModule(): KeyboardRightModule {
    const raw = input.profile()?.prefs[moduleField];
    if (raw && input.availableModules.includes(raw as KeyboardRightModule)) {
      return raw as KeyboardRightModule;
    }
    return "nav";
  }

  const [rightModule, setRightModuleSignal] = createSignal<KeyboardRightModule>(readPersistedModule());

  createEffect(() => {
    const next = readPersistedModule();
    setRightModuleSignal(next);
  });

  async function setRightModule(m: KeyboardRightModule) {
    if (!input.availableModules.includes(m)) return;
    setRightModuleSignal(m);
    try {
      await updatePrefs({ [moduleField]: m } as Partial<import("../store").ProfilePrefs>);
    } catch (e) {
      console.error("Failed to persist kb module:", e);
    }
  }

  // Right-panel mode
  const [rightPanelMode, setRightPanelModeSignal] = createSignal<"keyboard" | "state">(
    input.profile()?.prefs.config_right_panel_mode ?? "keyboard",
  );
  createEffect(() => {
    const p = input.profile()?.prefs.config_right_panel_mode;
    if (p) setRightPanelModeSignal(p);
  });
  async function setRightPanelMode(m: "keyboard" | "state") {
    setRightPanelModeSignal(m);
    try { await updatePrefs({ config_right_panel_mode: m }); }
    catch (e) { console.error("persist right-panel mode:", e); }
  }

  // Simulator state mirrors ProfilePrefs.simulator.
  const [simulatorState, setSimulatorStateSignal] = createSignal<PlayerState>(
    input.profile()?.prefs.simulator.currentState ?? createDefaultPlayerState(),
  );
  const [templates, setTemplates] = createSignal<SimulatorTemplate[]>(
    input.profile()?.prefs.simulator.templates ?? [],
  );
  createEffect(() => {
    const p = input.profile()?.prefs.simulator;
    if (p) {
      setSimulatorStateSignal(p.currentState);
      setTemplates(p.templates);
    }
  });

  async function updateSimState(next: PlayerState) {
    setSimulatorStateSignal(next);
    try { await updateSimulatorState(next); }
    catch (e) { console.error("persist sim state:", e); }
  }
  async function saveTemplate(name: string) {
    try {
      const p = await saveSimulatorTemplate(name);
      setTemplates(p.prefs.simulator.templates);
    } catch (e) { console.error("save template:", e); }
  }
  async function loadTemplate(id: string) {
    try {
      const p = await loadSimulatorTemplate(id);
      setSimulatorStateSignal(p.prefs.simulator.currentState);
      setTemplates(p.prefs.simulator.templates);
    } catch (e) { console.error("load template:", e); }
  }
  async function deleteTemplate(id: string) {
    try {
      const p = await deleteSimulatorTemplate(id);
      setTemplates(p.prefs.simulator.templates);
    } catch (e) { console.error("delete template:", e); }
  }
  async function resetSimState() {
    try {
      const p = await resetSimulatorState();
      setSimulatorStateSignal(p.prefs.simulator.currentState);
    } catch (e) { console.error("reset sim state:", e); }
  }

  return {
    selection,
    setSelection,
    isWeaponSelected,
    isLabelSelected,
    isBindsSectionFocused,
    visible,
    toggleVisible,
    showMovement,
    showWeapons,
    showTeamplay,
    toggleMovement,
    toggleWeapons,
    toggleTeamplay,
    // NEW outputs
    rightModule,
    setRightModule,
    availableModules: input.availableModules,
    rightPanelMode,
    setRightPanelMode,
    simulatorState,
    updateSimState,
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    resetSimState,
  };
}
