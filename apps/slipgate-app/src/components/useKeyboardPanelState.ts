import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { updatePrefs, type ProfileData } from "../store";
import type { BindSelection } from "./keyboardHighlights";

interface UseKeyboardPanelStateInput {
  profile: () => ProfileData | null | undefined;
  activeRow2: () => Set<string>;
}

/**
 * Owns all state the ConfigKeyboardPanel needs, plus the shared click-to-pin
 * selection used by both the panel and the bind-list sections. Extracted from
 * ConfigViewer so the file stays focused on config merging/rendering and so
 * upcoming panel features (module swap) have a single place to land.
 *
 * Persistence is one-way (local signal mirrors props.profile.prefs via effect;
 * togglers write to the Tauri store). The mirror can be clobbered if another
 * code path calls setProfile() during a session; accepted trade-off until a
 * reactive profile store lands. See the same note in ConfigViewer history.
 */
export function useKeyboardPanelState(input: UseKeyboardPanelStateInput) {
  // ── Shared click-to-pin selection ──
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

  // ── Whether the binds section is the active row-2 pill ──
  const isBindsSectionFocused = createMemo(() => {
    const row2 = input.activeRow2();
    return row2.has("weapons:binds") || row2.has("teamplay:binds") || row2.has("movement:binds");
  });

  // ── Panel visibility ──
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

  // ── Category toggles (Movement / Weapons / Teamplay) ──
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
  };
}
