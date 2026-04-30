# Modular Keyboard Panel - Design Spec

**Date:** 2026-04-15
**Status:** Design approved, ready for planning phase.
**Predecessor:** `docs/superpowers/plans/2026-04-15-modular-keyboard-panel-brief.md` (pre-brainstorm brief).
**Related prior work:** `docs/superpowers/specs/2026-04-14-config-viewer-keyboard-panel-design.md` (original panel), `docs/superpowers/plans/2026-04-14-config-viewer-keyboard-panel.md` (original plan).

---

## 1. Purpose

The ConfigViewer keyboard panel today renders a fixed TKL layout: main alphanumeric block + nav cluster + arrow keys. This leaves two whole classes of real binds with nothing to highlight:

- **Numpad binds.** Players routinely bind weapon selection or movement to `kp_*` keys.
- **Mouse binds.** Weapon fires and teamsay triggers on `mouse1-5` / `mwheelup` / `mwheeldown` are common.

This spec introduces a **modular right-hand slot** on the existing `KeyboardLayout` component. The main alphanumeric block stays fixed. The right slot swaps between three modules at runtime:

- `nav` - current nav cluster + arrow keys (the default, preserves today's behavior)
- `numpad` - full extended numpad cluster
- `mouse` - all seven mouse inputs plus a reserved cell

Both the ConfigViewer keyboard panel and the Profile view's keyboard get the modular treatment, but with different allowed module sets and different toggle placements. Profile's existing `MouseLayout` gear card remains untouched - Profile's right slot only swaps between `nav` and `numpad`.

## 2. Goals and non-goals

**Goals:**

- Let ConfigViewer display bindings on numpad keys, mouse buttons, and the scroll wheel without losing the current nav/arrows experience.
- Keep the main alphanumeric block rendered identically across all three module modes.
- Auto-reveal: when a click-to-pin selection's target keys live in a non-active module, the ConfigViewer panel swaps to the containing module automatically.
- Preserve keyboard size stability across module toggles - no visual "snap" when the active module changes.
- Persist each view's last-used module independently, so ConfigViewer and Profile remember their own state.
- Reuse the existing SVG keycap rendering for all module cells (including mouse buttons), so highlights, click handling, and labels work uniformly.

**Non-goals:**

- No visual redesign of the main block.
- No auto-reveal on the Profile side (Profile has no click-to-pin flow).
- No new state beyond what the existing `useKeyboardPanelState` hook already owns.
- No changes to ezQuake config parsing. `toLayoutId` gains new cases, but parser output is consumed as-is.
- No mouse-shape SVG reused from `MouseLayout` / `MouseSvg`. ConfigViewer's mouse module is rendered in the same SVG coordinate system as the keyboard, with its own data and a small decoration function for the mouse outline + wheel glyphs.

## 3. Data model

### 3.1 New types

```ts
type KeyboardRightModule = "nav" | "numpad" | "mouse";

interface KeyboardModule {
  id: KeyboardRightModule;
  widthU: number;       // width in keyboard units (3 for nav, 4 for numpad, 4 for mouse)
  keys: KeyDef[];       // positions in local coords (x in 0..widthU, rows 0..5)
  decoration?: (ctx: ModuleDecorationCtx) => JSX.Element;
                        // optional SVG drawn behind the cells - used by mouse module
}

interface ModuleDecorationCtx {
  kuBase: number;       // absolute x of module origin in SVG coordinates (NAV_X * KU)
  rowY: (row: number) => number;  // row-to-pixel helper shared with main block
  ku: number;           // keyboard-unit pixel size (KU constant)
}
```

### 3.2 Module data files

Three new files under `src/components/keyboardModules/`:

- `navModule.ts` - exports `NAV_MODULE: KeyboardModule`. Contains exactly the keys currently hardcoded as the nav cluster (`Insert`, `Home`, `PageUp`, `Delete`, `End`, `PageDown`) plus the arrow cluster (`UpArrow`, `LeftArrow`, `DownArrow`, `RightArrow`). `widthU = 3`. Moved verbatim from the current `LAYOUT` array in `KeyboardLayout.tsx`.
- `numpadModule.ts` - exports `NUMPAD_MODULE: KeyboardModule`. Contains ~18 numpad keys. `widthU = 4`. Uses rows 1-5 (no F-row content). Exact key `id` strings match ezQuake's canonical `KP_*` names, **to be verified in planning phase** (see Section 8).
- `mouseModule.ts` - exports `MOUSE_MODULE: KeyboardModule`. 8 cells, `widthU = 4`, includes a `decoration` function. See Section 3.4 for layout.

### 3.3 Module registry

`src/components/keyboardModules/index.ts` exports:

```ts
export const MODULES: Record<KeyboardRightModule, KeyboardModule> = {
  nav: NAV_MODULE,
  numpad: NUMPAD_MODULE,
  mouse: MOUSE_MODULE,
};

// Cached reverse lookup: layout ID -> which module (or "main" for main-block keys).
export function moduleOf(layoutId: string): KeyboardRightModule | "main" | null;
```

`moduleOf` builds its map once at module load by iterating `MAIN_BLOCK` and each module's `keys` array. Constant-time lookup thereafter.

### 3.4 Mouse module layout

8 cells on a uniform grid inside a 4u-wide footprint. All cells are flat keycap-style rectangles sharing the keyboard's rendering pipeline - highlights, click handling, labels, and selection all work identically to main-block keys.

Row-by-row (conceptual - exact row heights tuned in implementation):

- **Top row:** `Mouse1` (left half, 2u wide), `Mouse2` (right half, 2u wide). Primary clicks.
- **Upper middle row:** `Mouse5` (left 1u, upper thumb), `Mouse3` (center 2u, wheel click), `MWheelUp` (right 1u, wheel up).
- **Lower middle row:** `Mouse4` (left 1u, lower thumb), `Mouse6` (center 2u, reserved), `MWheelDown` (right 1u, wheel down).

**Decoration function** draws (behind the cells, as a single `<g>`):

1. A mouse-silhouette outline as a decorative path.
2. Three small wheel-glyph indicators - one on `Mouse3`, one on `MWheelUp`, one on `MWheelDown` - sharing a color accent so the three wheel inputs visually group as "the wheel column".

`Mouse6` is rendered with reduced opacity and no label when no `mouse6` bind exists in the config. When a bind is present, it lights up like any other cell.

### 3.5 `toLayoutId` extension

`toLayoutId` in `KeyboardLayout.tsx` currently returns `null` for `MOUSE*` and `MWHEEL*` keys. That early return is removed. New cases:

- `MOUSE1` -> `"Mouse1"` through `MOUSE6` -> `"Mouse6"` (matches the six cells defined in the mouse module).
- `MOUSE7` / `MOUSE8` continue to return `null` - no cells for them in the module today, so highlights for those inputs silently do not render. Adding them later means one new cell in `mouseModule.ts` plus one new mapping line; no other plumbing changes.
- `MWHEELUP` -> `"MWheelUp"`, `MWHEELDOWN` -> `"MWheelDown"`.
- Full `KP_*` set -> canonical numpad IDs (exact names verified in planning phase - see Section 8).

### 3.6 Canonical width

`TOTAL_W_U` becomes `NAV_X + 4 = 19.5` permanently - pinned to the widest module. Nav mode leaves 1u of intentional dead space to the right of the arrow cluster. This is the explicit decision made during brainstorming to avoid a visual size snap when the user toggles modules.

## 4. Component surface

### 4.1 `KeyboardLayout.tsx`

New required prop:

```ts
interface KeyboardLayoutProps {
  // ... existing props unchanged
  rightModule: KeyboardRightModule;
}
```

At render time the component composes:

```ts
const mod = MODULES[props.rightModule];
const keysToRender = [
  ...MAIN_BLOCK,
  ...mod.keys.map(k => ({ ...k, x: k.x + NAV_X })),
];
```

Then iterates `keysToRender.map(...)` exactly like today. If `mod.decoration` is defined (mouse module), its return value renders as a sibling `<g>` inserted before the keys group so it sits behind them.

All other logic - `keyClass`, `keyStyle`, `labelClass`, `labelStyle`, `onKeyClick`, `selectedKeyIds`, movement resolution, two-word label stacking - is untouched.

### 4.2 `ConfigKeyboardPanel.tsx`

New props (threaded through from the hook):

```ts
interface ConfigKeyboardPanelProps {
  // ... existing props unchanged
  rightModule: KeyboardRightModule;
  setRightModule: (m: KeyboardRightModule) => void;
  availableModules: readonly KeyboardRightModule[];  // always ["nav","numpad","mouse"] from ConfigViewer
}
```

A new segmented-control row renders above the keyboard SVG, right-aligned over the right-slot area. Three HTML `<button>` elements `[Nav] [Numpad] [Mouse]`, styled as a pill segmented control, active one highlighted. Clicking a button calls `props.setRightModule(m)`.

Both stacked keyboards in compare mode receive the same `rightModule` value - single signal at the panel level, not per-keyboard. The compare keyboard's `<KeyboardLayout>` passes `rightModule={props.rightModule}` identically.

The existing Movement/Weapons/Teamplay pill row stays where it is. The new segmented row sits in its own space in the F-row area above the right slot. CSS details (exact positioning, spacing, pill styling) are implementation-level and share semantic color variables with the rest of the keyboard panel.

### 4.3 `ProfileTab.tsx`

Gets its own segmented control with two buttons: `[Nav] [Numpad]`. No mouse button - Profile already has `MouseLayout` as a separate gear card underneath the keyboard, which is unchanged by this spec.

**Toggle placement:** in the small slot to the left of the existing "NuPhy Field75 HE" brand label, above the Backspace key. The brand label text keeps its content but sits slightly narrower to make room. Exact pixel placement is an implementation detail; the slot was agreed during brainstorming and matches the user's mockup (`2026-04-15_15-05.png`).

ProfileTab passes its own `rightModule` state to `<KeyboardLayout rightModule={...} />`. Profile's `MouseLayout` gear card is untouched - it already handles mouse binds on its own, independently of this spec.

### 4.4 Icon design for the segmented controls

Text labels (`Nav`, `Numpad`, `Mouse`) are the default. Icon-only variants are a possible future polish pass if the row feels cramped; not in scope for this spec.

## 5. State hook additions

`useKeyboardPanelState.ts` grows to cover module state in the same way it already covers visibility and category toggles.

### 5.1 New input fields

```ts
interface UseKeyboardPanelStateInput {
  profile: () => ProfileData | null | undefined;
  activeRow2: () => Set<string>;
  // NEW:
  availableModules: readonly KeyboardRightModule[];  // e.g. ["nav","numpad","mouse"] or ["nav","numpad"]
  persistKey: "config" | "profile";                  // selects which ProfilePrefs field to read/write
}
```

**Note -- auto-reveal does not live in the hook.** See Section 6 for the corrected placement. The hook owns the selection signal but not the primary config's `HighlightInput`, which is required to resolve a selection into layout IDs. The `HighlightInput` lives in `ConfigKeyboardPanel`, so the auto-reveal `createEffect` lives there as well.

### 5.2 New outputs

```ts
rightModule: () => KeyboardRightModule;
setRightModule: (m: KeyboardRightModule) => void;
availableModules: readonly KeyboardRightModule[];  // pass-through for the panel to render buttons
```

### 5.3 Behavior

1. **Init:** read the persisted module from `profile()?.prefs.config_keyboard_right_module` (when `persistKey === "config"`) or `profile()?.prefs.profile_keyboard_right_module` (when `persistKey === "profile"`). Fall back to `"nav"`. Validate the stored value against `availableModules` so a Profile instance can never pick up a `"mouse"` value that ConfigViewer stored.
2. **Mirror effect:** a `createEffect` mirrors the pref back into the local signal when the profile reloads, matching the pattern used by the existing toggle methods. Same one-way-mirror trade-off noted in the existing hook docstring.
3. **Toggle:** `setRightModule(m)` validates against `availableModules`, updates the local signal, then calls `updatePrefs({ [field]: m })` with the appropriate field name. Errors logged via `console.error` with the same wording as existing toggle methods.

### 5.4 Two consumers

- **ConfigViewer** instantiates the hook with `availableModules: ["nav","numpad","mouse"]` and `persistKey: "config"`.
- **ProfileTab** instantiates a second copy with `availableModules: ["nav","numpad"]` and `persistKey: "profile"`. ProfileTab ignores the hook outputs it doesn't use (category toggles, visibility, selection) - minor wasted surface, but simpler than splitting the hook into two.

## 6. Auto-reveal logic

### 6.1 Where it lives

The `createEffect` lives in `ConfigKeyboardPanel`, not in `useKeyboardPanelState`. Reason: the effect has to resolve the current selection into layout IDs via `buildSelectedIds(primaryInput, selection)`, and `primaryInput` is a config-specific `HighlightInput` built from the primary `EzQuakeConfig` prop. That data is local to the panel -- the hook doesn't know about it.

ProfileTab does not render `ConfigKeyboardPanel` (Profile has its own keyboard rendering path that doesn't use click-to-pin), so Profile automatically gets no auto-reveal. No gating is needed.

### 6.2 Algorithm

```ts
// Inside ConfigKeyboardPanel, after primaryInput / primaryHighlights memos.
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

  if (containingModules.size === 0) return;          // only main-block keys, no switch needed
  if (containingModules.has(props.rightModule)) return;  // current module already works - stay

  // Tie-break: prefer first module in fixed order.
  const order: KeyboardRightModule[] = ["nav", "numpad", "mouse"];
  const next = order.find(m => containingModules.has(m));
  if (next && props.availableModules.includes(next)) {
    props.setRightModule(next);
  }
});
```

### 6.3 Intentional non-behaviors

- **Keys in `main` never trigger a switch.** Main block is always visible regardless of which right module is active.
- **Compare side does not drive auto-reveal.** Primary keyboard is the source of truth; compare keyboard shows the same module via the Section 4.2 sync rule.
- **Category toggles (Movement / Weapons / Teamplay) do not trigger auto-reveal.** They change highlight sets, not selection.
- **No auto-revert on selection clear.** Module stays on whatever the user last saw.

### 6.4 Tie-breaking edge case

If a selection's target keys straddle two non-main modules (e.g., a teamsay label bound to both `Kp_5` and `Mouse1`), auto-reveal picks the first in order `nav -> numpad -> mouse`. Accepted as a non-issue given the player count; not worth a more sophisticated rule.

## 7. Persistence

Two new fields on `ProfilePrefs` in `src/store.ts`:

```ts
interface ProfilePrefs {
  // ... existing fields unchanged
  config_keyboard_right_module: KeyboardRightModule;  // default "nav"
  profile_keyboard_right_module: "nav" | "numpad";    // default "nav"
}
```

Both default to `"nav"` in `DEFAULT_PREFS`. Slipgate's prefs loading already tolerates missing fields (falls back to defaults for pre-existing profiles), so no explicit migration code is needed. Same behavior as previous pref additions in the same file.

Toggle handlers in the hook call `updatePrefs({ config_keyboard_right_module: next })` or `updatePrefs({ profile_keyboard_right_module: next })` depending on the `persistKey` input. Error logging matches the existing toggle-methods pattern.

## 8. Open items for the planning phase

**Research task (blocks numpad module implementation):** verify ezQuake's canonical numpad key names. ezQuake uses `KP_*` conventions (e.g. `KP_HOME`, `KP_5`, `KP_PLUS`), but the exact set needs cross-checking against ezQuake's `keys.c` or config parser source before `numpadModule.ts` and `toLayoutId` can be finalized. Estimated 10 minutes of grepping, but it gates the numpad cell `id` values. The implementation plan will front-load this task before writing numpad module data.

**CSS container check:** `app.css` currently sizes the keyboard container via flex. Before shipping, verify that the SVG's aspect-ratio scaling does what we expect under the new `TOTAL_W_U = 19.5u` viewBox - i.e., that the container doesn't force a fixed height that would letterbox the SVG. Minor implementation concern, not a design blocker.

**Profile toggle exact UI:** the two-button toggle for Profile sits in the slot marked in `2026-04-15_15-05.png`. The exact visual (icon buttons vs tiny segmented pill vs a single cycle button) is resolved during implementation review of that area. Doesn't affect the spec architecture.

## 9. Files touched

**New:**

- `src/components/keyboardModules/index.ts`
- `src/components/keyboardModules/navModule.ts`
- `src/components/keyboardModules/numpadModule.ts`
- `src/components/keyboardModules/mouseModule.ts`

**Modified:**

- `src/components/KeyboardLayout.tsx` - extract `MAIN_BLOCK`, add `rightModule` prop, compose keys at render time, extend `toLayoutId`, bump `TOTAL_W_U` to `19.5u`.
- `src/components/useKeyboardPanelState.ts` - new input fields (`availableModules`, `persistKey`, optional `selection`), new outputs (`rightModule`, `setRightModule`, `availableModules`), auto-reveal effect.
- `src/components/ConfigKeyboardPanel.tsx` - new toggle row, new props threaded from hook.
- `src/components/ConfigViewer.tsx` - instantiate hook with new inputs, thread new props to the panel.
- `src/components/ProfileTab.tsx` - instantiate second hook instance, add two-button toggle in the slot next to F12, pass `rightModule` to `<KeyboardLayout>`.
- `src/store.ts` - two new `ProfilePrefs` fields + defaults.
- `src/app.css` - styling for the new segmented-control rows and (if needed) any container adjustments for the new viewBox width.

## 10. Testing approach

Per monorepo policy: compile/build first, manual verification second, no automated test infrastructure added speculatively.

**Compile checks:**

- `bunx tsc --noEmit` on the slipgate-app frontend (TypeScript types for new props, new hook inputs/outputs, new prefs fields).
- `bun run build` (Vite build).

**Manual verification in the running app:**

- ConfigViewer: toggle between nav / numpad / mouse, verify main block stays put, verify module content renders, verify no size snap.
- ConfigViewer compare mode: verify both keyboards sync on module changes.
- ConfigViewer click-to-pin with a key in a non-active module: verify auto-reveal swaps modules, verify the correct tie-break when a selection spans modules.
- ConfigViewer with a config that has numpad binds: verify they light up when numpad module is active.
- ConfigViewer with a config that has mouse binds: verify `Mouse1`-`Mouse5`, `MWheelUp`, `MWheelDown` all light up when mouse module is active.
- ConfigViewer with no `mouse6` bind: verify the reserved cell renders dimmed; with a `mouse6` bind: verify it lights up.
- Profile: toggle between nav and numpad, verify the mouse gear card underneath is unchanged, verify the brand label slot still shows the keyboard name.
- Persistence: set ConfigViewer to mouse and Profile to numpad, reload the app, verify both remembered their own module independently.
