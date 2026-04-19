# Modular Keyboard Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the right-hand slot of `KeyboardLayout` swappable between three modules (nav + arrows, numpad, mouse) so ConfigViewer and Profile can display bindings that today have no keys to highlight.

**Architecture:** `KeyboardLayout.tsx` splits its flat `LAYOUT` array into a fixed `MAIN_BLOCK` plus three module files (`navModule.ts`, `numpadModule.ts`, `mouseModule.ts`) under a new `keyboardModules/` directory. A `MODULES` registry + `moduleOf` reverse-lookup helper live alongside them. The component takes a new `rightModule` prop and composes the active module's keys into its render pipeline. State for the active module lives in `useKeyboardPanelState` (one new signal + persistence + optional auto-reveal effect). ConfigViewer and ProfileTab each instantiate the hook independently with different `availableModules` and persistence keys. `TOTAL_W_U` is pinned permanently at `NAV_X + 4 = 19.5u` so the keyboard size is stable across module toggles.

**Tech Stack:** SolidJS + TypeScript, Tauri v2 store, SVG (no new libraries), DaisyUI/Tailwind for the segmented control styling, Biome linting, Bun for compile + build.

**Spec:** `apps/slipgate-app/docs/superpowers/specs/2026-04-15-modular-keyboard-panel-design.md`

---

## Reference data: ezQuake numpad key names

Verified in `apps/slipgate-app/reference/ezquake-source/src/keys.c:122-218` (the `keynames[]` table). ezQuake maps multiple input strings to the same physical numpad key (Num Lock on/off behavior). The plan canonicalises on **digit names** for cells that have a digit variant and functional names otherwise.

**17 canonical numpad cells:**

| Cell ID (layout) | Display label | ezQuake input strings that map here |
|---|---|---|
| `Kp_Num` | Num | `NUMLOCK`, `KP_NUMLCK`, `KP_NUMLOCK` |
| `Kp_Slash` | `/` | `KP_SLASH`, `KP_DIVIDE` |
| `Kp_Star` | `*` | `KP_STAR`, `KP_MULTIPLY` |
| `Kp_Minus` | `-` | `KP_MINUS` |
| `Kp_7` | 7 | `KP_7`, `KP_HOME` |
| `Kp_8` | 8 | `KP_8`, `KP_UPARROW` |
| `Kp_9` | 9 | `KP_9`, `KP_PGUP` |
| `Kp_Plus` | `+` | `KP_PLUS` |
| `Kp_4` | 4 | `KP_4`, `KP_LEFTARROW` |
| `Kp_5` | 5 | `KP_5` |
| `Kp_6` | 6 | `KP_6`, `KP_RIGHTARROW` |
| `Kp_1` | 1 | `KP_1`, `KP_END` |
| `Kp_2` | 2 | `KP_2`, `KP_DOWNARROW` |
| `Kp_3` | 3 | `KP_3`, `KP_PGDN` |
| `Kp_Enter` | ↵ | `KP_ENTER` |
| `Kp_0` | 0 | `KP_0`, `KP_INS` |
| `Kp_Dot` | `.` | `KP_DEL` |

`KP_EQUAL` (line 143) exists in ezQuake but is not on standard numpads; omitted from the module. If it ever comes up in a real config, it silently won't render — same safety the mouse module has for `MOUSE7`/`MOUSE8`.

**Physical layout** (4 columns × 5 rows):

```
Row 0:  Num  /    *    -
Row 1:  7    8    9    +       <- + spans rows 1-2
Row 2:  4    5    6    +
Row 3:  1    2    3    ↵       <- ↵ spans rows 3-4
Row 4:  0    0    .    ↵       <- 0 spans 2 columns
```

The module uses rows 1-5 of the keyboard grid (skipping the F-row), matching how `nav` currently works.

---

## Project conventions

**Working directory:** all commands run from `/home/paradoks/projects/quakeworld/apps/slipgate-app` unless otherwise noted. If you're in the monorepo root, prefix with `cd apps/slipgate-app && ...`.

**Compile check (required after every task that touches TypeScript):**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected output: no errors. Vite's dev build does not enforce types, so this check is mandatory per slipgate-app conventions (`feedback_verify_typescript.md`).

**Manual verification (when the task affects UI):** the Tauri app runs on Windows, not WSL. For most tasks a visual check isn't feasible mid-plan — the engineer should rely on compile checks for intermediate tasks and do the full manual pass in Task 16 at the end. When a task explicitly calls for manual verification, it will say so.

**Commits:** one commit per task, directly on `main`. No feature branch. The `src-tauri/` rsync hook never fires because this plan is 100% frontend. Commit messages follow the existing slipgate convention (`feat(slipgate):` / `refactor(slipgate):` / `docs(slipgate):`).

**No automated tests added.** Slipgate has no test infrastructure. Per `CLAUDE.md`: "Compile and build first. Manual verification second. Automated tests only when the project already has them or when explicitly asked."

---

## Task 1: Scaffold `keyboardModules/` directory + types + empty registry

Creates the new directory and the shared type surface. Nothing renders differently yet; this task only introduces types and a placeholder `MODULES` registry. It must compile cleanly before anything else is built.

**Files:**
- Create: `apps/slipgate-app/src/components/keyboardModules/index.ts`

- [ ] **Step 1: Create the directory and `index.ts` file**

Create `apps/slipgate-app/src/components/keyboardModules/index.ts` with the following exact content:

```ts
import type { JSX } from "solid-js";
import type { KeyDef } from "../KeyboardLayout";

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
// biome-ignore lint/suspicious/noExplicitAny: registry is built up incrementally across plan tasks
export const MODULES: Record<KeyboardRightModule, KeyboardModule> = {} as any;

/**
 * Returns which module a layout ID belongs to, or "main" for main-block
 * keys, or null if the ID is unknown. Populated in Task 8 once all modules
 * exist; until then it returns null for non-main IDs.
 */
export function moduleOf(_layoutId: string): KeyboardRightModule | "main" | null {
  return null;
}
```

- [ ] **Step 2: Export `KeyDef` from `KeyboardLayout.tsx` so the module file can import it**

Open `apps/slipgate-app/src/components/KeyboardLayout.tsx` and find this line (around line 6):

```ts
interface KeyDef {
```

Change it to:

```ts
export interface KeyDef {
```

No other changes in this file for Task 1.

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors. The `MODULES` cast is the only suspicious expression and it's annotated with a biome-ignore comment.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/keyboardModules/index.ts apps/slipgate-app/src/components/KeyboardLayout.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): scaffold keyboardModules directory and types

Introduce KeyboardRightModule / KeyboardModule / ModuleDecorationCtx
types, an empty MODULES registry, and a moduleOf stub. Export KeyDef
from KeyboardLayout so per-module files can import it. Groundwork for
the swappable right-slot refactor.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract `MAIN_BLOCK` and create `navModule.ts`

Split the current flat `LAYOUT` array into `MAIN_BLOCK` (main alphanumeric keys, rows 0-5, x in 0..15) and a `NAV_MODULE` constant containing only the nav cluster + arrow keys. `KeyboardLayout.tsx` still renders identically to today — this is a pure refactor. At the end of this task the on-screen keyboard looks exactly like the current keyboard but the nav cluster's keys are now defined in a separate file.

**Files:**
- Create: `apps/slipgate-app/src/components/keyboardModules/navModule.ts`
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx`
- Modify: `apps/slipgate-app/src/components/keyboardModules/index.ts`

- [ ] **Step 1: Create `navModule.ts`**

Create `apps/slipgate-app/src/components/keyboardModules/navModule.ts` with the following exact content:

```ts
import type { KeyboardModule } from "./index";

/**
 * Nav cluster + arrow keys. Local coordinate space: x in 0..3, rows
 * match the main keyboard's row grid (F-row = 0, top-row = 1, etc.).
 * Mirrors the pre-refactor hardcoded layout exactly.
 */
export const NAV_MODULE: KeyboardModule = {
  id: "nav",
  widthU: 3,
  keys: [
    // Row 1 - top of nav cluster
    { id: "Insert", label: "Ins", x: 0, w: 1, row: 1 },
    { id: "Home", label: "Hm", x: 1, w: 1, row: 1 },
    { id: "PageUp", label: "PU", x: 2, w: 1, row: 1 },
    // Row 2 - middle of nav cluster
    { id: "Delete", label: "Del", x: 0, w: 1, row: 2 },
    { id: "End", label: "End", x: 1, w: 1, row: 2 },
    { id: "PageDown", label: "PD", x: 2, w: 1, row: 2 },
    // Row 4 - Up arrow (row 3 intentionally empty)
    { id: "UpArrow", label: "\u2191", x: 1, w: 1, row: 4 },
    // Row 5 - Left, Down, Right arrows
    { id: "LeftArrow", label: "\u2190", x: 0, w: 1, row: 5 },
    { id: "DownArrow", label: "\u2193", x: 1, w: 1, row: 5 },
    { id: "RightArrow", label: "\u2192", x: 2, w: 1, row: 5 },
  ],
};
```

The arrow glyphs use Unicode escape sequences rather than literal characters so the ASCII-only source rule is preserved.

- [ ] **Step 2: Remove nav cluster + arrow keys from `LAYOUT` in `KeyboardLayout.tsx`**

Open `apps/slipgate-app/src/components/KeyboardLayout.tsx`. Find the `LAYOUT` array (around line 22). Delete the following entries:

- Row 1: `Insert`, `Home`, `PageUp` (3 entries)
- Row 2: `Delete`, `End`, `PageDown` (3 entries)
- Row 4: `UpArrow` (1 entry)
- Row 5: `LeftArrow`, `DownArrow`, `RightArrow` (3 entries)

10 entries total, all with `x` based on `NAV_X` or `ARR_X`. The `NAV_X` and `ARR_X` constants themselves stay in the file for now.

Rename `LAYOUT` to `MAIN_BLOCK` throughout this file (one declaration + one usage in the `.map()` call at the bottom of the component):

```ts
const MAIN_BLOCK: KeyDef[] = [
  // Row 0 - Function row
  ...
];

// Fast lookup by ID (used by consumers)
export const KEY_BY_ID = new Map(MAIN_BLOCK.map(k => [k.id, k]));
```

The `KEY_BY_ID` map is built from `MAIN_BLOCK` only for now; module keys will be added to a unified lookup during render composition in Task 3.

- [ ] **Step 3: Import and register `NAV_MODULE` in the registry**

In `apps/slipgate-app/src/components/keyboardModules/index.ts`, add an import at the top and populate the registry:

```ts
import type { JSX } from "solid-js";
import type { KeyDef } from "../KeyboardLayout";
import { NAV_MODULE } from "./navModule";
```

Replace the current `MODULES` line with:

```ts
export const MODULES: Partial<Record<KeyboardRightModule, KeyboardModule>> = {
  nav: NAV_MODULE,
};
```

`Partial<Record<...>>` reflects that `numpad` and `mouse` are still missing. Later tasks will tighten the type when the other modules land.

- [ ] **Step 4: Update `KeyboardLayout.tsx` to compose `MAIN_BLOCK + NAV_MODULE.keys`**

Still in `KeyboardLayout.tsx`, find the `.map(k => ...)` call that iterates `LAYOUT`/`MAIN_BLOCK` at the bottom of the component's JSX (around line 278 before the refactor). Replace the iteration so it walks a combined array:

```tsx
{[
  ...MAIN_BLOCK,
  ...NAV_MODULE.keys.map(k => ({ ...k, x: k.x + NAV_X })),
].map(k => (
  <g>
    {/* existing key rect + label rendering, unchanged */}
  </g>
))}
```

Add `import { NAV_MODULE } from "./keyboardModules/navModule";` at the top of the file.

- [ ] **Step 5: Update `TOTAL_W_U` to `NAV_X + 4 = 19.5u`**

Find this line in `KeyboardLayout.tsx` (around line 173):

```ts
const TOTAL_W_U = NAV_X + 3; // TKL width: main block + nav cluster
```

Replace with:

```ts
const TOTAL_W_U = NAV_X + 4; // Pinned to widest module (numpad / mouse = 4u) so keyboard size stays stable when swapping modules. Nav mode leaves 1u of dead space to the right of the arrow cluster - intentional.
```

- [ ] **Step 6: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/KeyboardLayout.tsx apps/slipgate-app/src/components/keyboardModules/navModule.ts apps/slipgate-app/src/components/keyboardModules/index.ts && git commit -m "$(cat <<'EOF'
refactor(slipgate): extract MAIN_BLOCK and navModule from KeyboardLayout

Split the flat LAYOUT array into a fixed MAIN_BLOCK (main alphanumeric
keys) plus NAV_MODULE (nav cluster + arrow keys) in a new
keyboardModules directory. KeyboardLayout composes the two at render
time. Bumps TOTAL_W_U to NAV_X + 4 so the keyboard size stays stable
when wider modules (numpad, mouse) land in later tasks. No visible
behavior change.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `rightModule` prop and thread it through callers

Introduce the `rightModule: KeyboardRightModule` prop on `KeyboardLayout`. The component reads `MODULES[props.rightModule]` at render time instead of always using `NAV_MODULE` directly. Callers (`ConfigKeyboardPanel`, `ProfileTab`) add the prop and pass `"nav"` hardcoded for now. Nothing changes on screen because `nav` is still the only module that exists in the registry.

**Files:**
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx`
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`
- Modify: `apps/slipgate-app/src/components/ProfileTab.tsx`

- [ ] **Step 1: Add the prop to `KeyboardLayoutProps`**

In `KeyboardLayout.tsx`, find the `KeyboardLayoutProps` interface (around line 186). Add:

```ts
import { MODULES, type KeyboardRightModule } from "./keyboardModules";
```

(replacing the earlier `import { NAV_MODULE } from "./keyboardModules/navModule";`)

```ts
interface KeyboardLayoutProps {
  movement: MovementKeys;
  keyboardName?: string | null;
  highlights?: Map<string, KeyHighlight>;
  showMovement?: boolean;
  keyLabels?: Map<string, string>;
  onKeyClick?: (id: string) => void;
  selectedKeyIds?: Set<string>;
  /** Which module to render in the right slot. */
  rightModule: KeyboardRightModule;
}
```

- [ ] **Step 2: Replace the hardcoded `NAV_MODULE` composition with a dynamic lookup**

Replace the `.map` iteration introduced in Task 2 with:

```tsx
{(() => {
  const mod = MODULES[props.rightModule];
  if (!mod) {
    throw new Error(`KeyboardLayout: unknown rightModule ${props.rightModule}`);
  }
  return [
    ...MAIN_BLOCK,
    ...mod.keys.map(k => ({ ...k, x: k.x + NAV_X })),
  ];
})().map(k => (
  <g>
    {/* existing key rect + label rendering, unchanged */}
  </g>
))}
```

The `throw` is a safety net; in practice every caller passes a valid `rightModule` value from the typed `KeyboardRightModule` union, so this can only trigger if the registry is incomplete at runtime. Keeping it loud catches task-order mistakes.

- [ ] **Step 3: Add the prop to `ConfigKeyboardPanel` and pass it through**

In `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`, find the `ConfigKeyboardPanelProps` interface (around line 13). Add at the end:

```ts
import type { KeyboardRightModule } from "./keyboardModules";
```

```ts
interface ConfigKeyboardPanelProps {
  // ... existing props unchanged
  rightModule: KeyboardRightModule;
}
```

Then find both `<KeyboardLayout />` instances in the component JSX (around lines 155 and 169) and add `rightModule={props.rightModule}` to each:

```tsx
<KeyboardLayout
  movement={props.primary!.movement}
  highlights={primaryHighlights()}
  showMovement={props.showMovement}
  onKeyClick={(id) => handleKeyClick(primaryInput(), id)}
  selectedKeyIds={yourSelectedIds()}
  rightModule={props.rightModule}
/>
```

(And the same addition in the compare-side `<KeyboardLayout>` block.)

- [ ] **Step 4: Pass `rightModule="nav"` from ConfigViewer to ConfigKeyboardPanel**

In `apps/slipgate-app/src/components/ConfigViewer.tsx`, find the `<ConfigKeyboardPanel ... />` usage (around line 921). Add `rightModule="nav"` as a hardcoded prop:

```tsx
<ConfigKeyboardPanel
  primary={effectiveConfig()}
  primaryName={effectiveChain()?.files[0]?.relative_path ?? null}
  compare={isCompareMode() ? compareBinds() : null}
  compareName={isCompareMode() ? props.compareSource?.primary_chain?.files[0]?.relative_path ?? null : null}
  visible={kbState.visible()}
  onToggleVisible={kbState.toggleVisible}
  selection={kbState.selection()}
  onSelectionChange={kbState.setSelection}
  showMovement={kbState.showMovement()}
  showWeapons={kbState.showWeapons()}
  showTeamplay={kbState.showTeamplay()}
  onToggleMovement={kbState.toggleMovement}
  onToggleWeapons={kbState.toggleWeapons}
  onToggleTeamplay={kbState.toggleTeamplay}
  rightModule="nav"
/>
```

This is temporary. It will become `rightModule={kbState.rightModule()}` in Task 11.

- [ ] **Step 5: Add `rightModule="nav"` to the `KeyboardLayout` usage in ProfileTab**

In `apps/slipgate-app/src/components/ProfileTab.tsx`, find the `<KeyboardLayout ... />` usage (around line 414). Add `rightModule="nav"` as a hardcoded prop:

```tsx
<KeyboardLayout
  movement={m}
  keyboardName={keyboardDisplayName()}
  highlights={weaponKeyHighlights()}
  showMovement={showMovement()}
  keyLabels={keyLabels()}
  rightModule="nav"
/>
```

Also temporary; becomes dynamic in Task 14.

- [ ] **Step 6: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/KeyboardLayout.tsx apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/components/ProfileTab.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): add rightModule prop to KeyboardLayout

KeyboardLayout reads the active module from MODULES[props.rightModule]
at render time. Callers (ConfigKeyboardPanel, ConfigViewer, ProfileTab)
pass "nav" hardcoded for now - dynamic module state lands in Task 11
(ConfigViewer) and Task 14 (ProfileTab).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Extend `toLayoutId` with numpad and mouse key cases

Add ezQuake input-string -> layout-ID mappings for all numpad keys and all mouse inputs. Remove the early return that currently nulls out `MOUSE*` / `MWHEEL*`. No module cells exist yet for these IDs, so they won't render anywhere visible — but `identifyKeyCommands`, `resolveCommandKeys`, and `buildSelectedIds` will now produce non-null IDs for numpad and mouse binds, which later tasks depend on.

**Files:**
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx`

- [ ] **Step 1: Remove the `MOUSE*` early return in `toLayoutId`**

In `KeyboardLayout.tsx`, find `toLayoutId` (around line 126). Delete this line:

```ts
if (k.startsWith("MOUSE") || k.startsWith("MWHEEL")) return null;
```

- [ ] **Step 2: Add mouse and numpad cases to the `map` object**

Within `toLayoutId`, extend the `map` object. Add the following entries to the existing map (order doesn't matter, but group them logically):

```ts
    // Mouse buttons and wheel
    MOUSE1: "Mouse1", MOUSE2: "Mouse2", MOUSE3: "Mouse3",
    MOUSE4: "Mouse4", MOUSE5: "Mouse5", MOUSE6: "Mouse6",
    MWHEELUP: "MWheelUp", MWHEELDOWN: "MWheelDown",
    // Numpad cluster - many ezQuake inputs collapse to the same cell
    // (Num Lock on/off dual naming; see plan reference data)
    NUMLOCK: "Kp_Num", KP_NUMLCK: "Kp_Num", KP_NUMLOCK: "Kp_Num",
    KP_SLASH: "Kp_Slash", KP_DIVIDE: "Kp_Slash",
    KP_STAR: "Kp_Star", KP_MULTIPLY: "Kp_Star",
    KP_MINUS: "Kp_Minus", KP_PLUS: "Kp_Plus",
    KP_7: "Kp_7", KP_HOME: "Kp_7",
    KP_8: "Kp_8", KP_UPARROW: "Kp_8",
    KP_9: "Kp_9", KP_PGUP: "Kp_9",
    KP_4: "Kp_4", KP_LEFTARROW: "Kp_4",
    KP_5: "Kp_5",
    KP_6: "Kp_6", KP_RIGHTARROW: "Kp_6",
    KP_1: "Kp_1", KP_END: "Kp_1",
    KP_2: "Kp_2", KP_DOWNARROW: "Kp_2",
    KP_3: "Kp_3", KP_PGDN: "Kp_3",
    KP_0: "Kp_0", KP_INS: "Kp_0",
    KP_DEL: "Kp_Dot",
    KP_ENTER: "Kp_Enter",
```

`MOUSE7`, `MOUSE8`, and `KP_EQUAL` are intentionally not mapped. They'll fall through to the final `return null` and silently not render — safer than throwing, and consistent with the spec.

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/KeyboardLayout.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): extend toLayoutId with numpad and mouse key mappings

Remove the MOUSE*/MWHEEL* early return and add ezQuake input-string
mappings for all 8 mouse inputs plus 17 canonical numpad cells.
Numpad mappings collapse ezQuake's dual naming (KP_7 and KP_HOME both
map to "Kp_7", etc.) onto digit-name canonical IDs. Mouse7, Mouse8,
and KP_EQUAL are intentionally unmapped. Cells for these IDs land in
Tasks 5 and 6.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create `numpadModule.ts`

Create the numpad module data with 17 cells on a 4u × 5-row grid. Wire it into `MODULES`. After this task, the numpad can be rendered by temporarily passing `rightModule="numpad"` (verified in a sanity step below, then reverted).

**Files:**
- Create: `apps/slipgate-app/src/components/keyboardModules/numpadModule.ts`
- Modify: `apps/slipgate-app/src/components/keyboardModules/index.ts`

- [ ] **Step 1: Create `numpadModule.ts`**

Create `apps/slipgate-app/src/components/keyboardModules/numpadModule.ts` with the following exact content:

```ts
import type { KeyboardModule } from "./index";

/**
 * Full extended numpad cluster. Local coordinate space: x in 0..4,
 * rows 1..5 (row 0 / F-row intentionally empty to match nav module).
 *
 * Display labels are chosen to match what a user sees on the physical
 * key - digit names take priority over functional names (so "7" not
 * "HOME"), matching the plan's canonical cell IDs.
 *
 * 0 spans 2u, + spans rows 1-2, Enter spans rows 3-4.
 */
export const NUMPAD_MODULE: KeyboardModule = {
  id: "numpad",
  widthU: 4,
  keys: [
    // Row 1 - Num Lock, /, *, -
    { id: "Kp_Num", label: "Num", x: 0, w: 1, row: 1 },
    { id: "Kp_Slash", label: "/", x: 1, w: 1, row: 1 },
    { id: "Kp_Star", label: "*", x: 2, w: 1, row: 1 },
    { id: "Kp_Minus", label: "-", x: 3, w: 1, row: 1 },
    // Row 2 - 7, 8, 9 (+ would start here but we place it in row 2 since our rows are narrower than a real numpad)
    { id: "Kp_7", label: "7", x: 0, w: 1, row: 2 },
    { id: "Kp_8", label: "8", x: 1, w: 1, row: 2 },
    { id: "Kp_9", label: "9", x: 2, w: 1, row: 2 },
    { id: "Kp_Plus", label: "+", x: 3, w: 1, row: 2 },
    // Row 3 - 4, 5, 6 (+ continues visually; we render Kp_Plus only once so row 3 skips column 3)
    { id: "Kp_4", label: "4", x: 0, w: 1, row: 3 },
    { id: "Kp_5", label: "5", x: 1, w: 1, row: 3 },
    { id: "Kp_6", label: "6", x: 2, w: 1, row: 3 },
    // Row 4 - 1, 2, 3, Enter
    { id: "Kp_1", label: "1", x: 0, w: 1, row: 4 },
    { id: "Kp_2", label: "2", x: 1, w: 1, row: 4 },
    { id: "Kp_3", label: "3", x: 2, w: 1, row: 4 },
    { id: "Kp_Enter", label: "\u21b5", x: 3, w: 1, row: 4 },
    // Row 5 - 0 (wide), .
    { id: "Kp_0", label: "0", x: 0, w: 2, row: 5 },
    { id: "Kp_Dot", label: ".", x: 2, w: 1, row: 5 },
  ],
};
```

**Simplification note:** a real numpad has `+` spanning rows 1-2 and `Enter` spanning rows 3-4 (double-height keys). The module uses single-row cells instead. This is a deliberate simplification: the extra rendering code for double-height keys isn't worth the complexity, and the information (which numpad key is bound to what) is perfectly clear with single-height cells. If future polish wants double-height cells, the `KeyDef` type would need a `h` field and `KeyboardLayout` would render `h * ROW_H` tall rects — out of scope for this plan.

- [ ] **Step 2: Register `NUMPAD_MODULE` in the registry**

In `apps/slipgate-app/src/components/keyboardModules/index.ts`, add the import and registry entry:

```ts
import { NAV_MODULE } from "./navModule";
import { NUMPAD_MODULE } from "./numpadModule";
```

```ts
export const MODULES: Partial<Record<KeyboardRightModule, KeyboardModule>> = {
  nav: NAV_MODULE,
  numpad: NUMPAD_MODULE,
};
```

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Sanity-check the numpad renders (optional local preview)**

This is a temporary check. Only run it if a Windows build environment is available - the Tauri app doesn't run in WSL. If skipping, the full manual pass in Task 16 will catch any rendering issues.

In `apps/slipgate-app/src/components/ConfigViewer.tsx`, temporarily change `rightModule="nav"` to `rightModule="numpad"` on the `<ConfigKeyboardPanel>` call, run the app on Windows, verify the numpad cluster appears in the right slot with 17 cells, then revert the change before committing.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/keyboardModules/numpadModule.ts apps/slipgate-app/src/components/keyboardModules/index.ts && git commit -m "$(cat <<'EOF'
feat(slipgate): add numpadModule with 17 cells

Full extended numpad cluster in the keyboardModules registry. 4u wide,
rows 1-5 of the keyboard grid, single-height cells (real numpad + and
Enter span two rows but we keep cells uniform for rendering
simplicity). Canonical cell IDs match the digit-name mappings added to
toLayoutId in Task 4.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create `mouseModule.ts` (cells only, no decoration yet)

Create the mouse module with 8 cells in a 4u × 4-row layout. Wire into `MODULES`. Decoration function (mouse outline + wheel glyphs) lands in Task 7 to keep this task focused on cell data.

**Files:**
- Create: `apps/slipgate-app/src/components/keyboardModules/mouseModule.ts`
- Modify: `apps/slipgate-app/src/components/keyboardModules/index.ts`

- [ ] **Step 1: Create `mouseModule.ts` (cells only)**

Create `apps/slipgate-app/src/components/keyboardModules/mouseModule.ts` with:

```ts
import type { KeyboardModule } from "./index";

/**
 * Mouse module - 8 cells arranged to resemble a mouse. Local coordinate
 * space: x in 0..4, rows 1..4 (the module uses one fewer row than the
 * numpad; row 5 is intentionally empty).
 *
 * Layout:
 *   Row 1: [ Mouse1 (2u) ] [ Mouse2 (2u) ]      primary clicks
 *   Row 2: [M5] [ Mouse3 (2u) ] [MW+]            upper thumb + wheel row
 *   Row 3: [M4] [ Mouse6 (2u) ] [MW-]            lower thumb + wheel row
 *
 * Mouse6 is rendered dimmed when no mouse6 bind exists (handled in
 * KeyboardLayout's key rendering, not in the module data). The
 * decoration function (added in Task 7) draws the mouse outline and
 * wheel glyphs behind these cells.
 */
export const MOUSE_MODULE: KeyboardModule = {
  id: "mouse",
  widthU: 4,
  keys: [
    // Row 1 - primary clicks
    { id: "Mouse1", label: "M1", x: 0, w: 2, row: 1 },
    { id: "Mouse2", label: "M2", x: 2, w: 2, row: 1 },
    // Row 2 - upper thumb, wheel click, wheel up
    { id: "Mouse5", label: "M5", x: 0, w: 1, row: 2 },
    { id: "Mouse3", label: "M3", x: 1, w: 2, row: 2 },
    { id: "MWheelUp", label: "MW\u2191", x: 3, w: 1, row: 2 },
    // Row 3 - lower thumb, reserved M6, wheel down
    { id: "Mouse4", label: "M4", x: 0, w: 1, row: 3 },
    { id: "Mouse6", label: "M6", x: 1, w: 2, row: 3 },
    { id: "MWheelDown", label: "MW\u2193", x: 3, w: 1, row: 3 },
  ],
};
```

- [ ] **Step 2: Register `MOUSE_MODULE` in the registry**

In `apps/slipgate-app/src/components/keyboardModules/index.ts`, add the import and registry entry, and tighten the type from `Partial<Record<...>>` to `Record<...>` now that all three modules exist:

```ts
import { NAV_MODULE } from "./navModule";
import { NUMPAD_MODULE } from "./numpadModule";
import { MOUSE_MODULE } from "./mouseModule";
```

```ts
export const MODULES: Record<KeyboardRightModule, KeyboardModule> = {
  nav: NAV_MODULE,
  numpad: NUMPAD_MODULE,
  mouse: MOUSE_MODULE,
};
```

- [ ] **Step 3: Update `KeyboardLayout.tsx` to use the non-partial registry type**

The previous `MODULES[props.rightModule]` lookup currently returns `KeyboardModule | undefined` because of `Partial<Record<...>>`. With the full registry, it returns `KeyboardModule`. The existing runtime check stays (defensive, free), but TypeScript narrows happily.

No code change required in `KeyboardLayout.tsx` — the runtime `throw` for missing module still catches corruption, and the type flow tightens automatically.

- [ ] **Step 4: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/keyboardModules/mouseModule.ts apps/slipgate-app/src/components/keyboardModules/index.ts && git commit -m "$(cat <<'EOF'
feat(slipgate): add mouseModule with 8 cells

Mouse module with M1/M2 top row, M4/M5 thumb column, M3/M6 center
column, and MW+/MW- right column. 4u wide, 3 rows of content. Cells
share the main-block keycap rendering pipeline so highlights and
click handling work uniformly. Decoration function (mouse outline +
wheel glyphs) lands in Task 7. Registry type tightens to a full
Record now that all three modules exist.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add mouse module decoration function

Add a `decoration` function to `MOUSE_MODULE` that draws the mouse silhouette outline and three small wheel glyphs behind the cells. Update `KeyboardLayout.tsx` to render the decoration as a sibling `<g>` inserted before the keys group so it sits behind them.

**Files:**
- Modify: `apps/slipgate-app/src/components/keyboardModules/mouseModule.ts`
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx`
- Modify: `apps/slipgate-app/src/app.css`

- [ ] **Step 1: Add semantic color variables for mouse decoration in `app.css`**

Open `apps/slipgate-app/src/app.css` and find the `--sg-kb-selected` / `--sg-kb-owner-*` block (around line 78). Add two new variables next to them:

```css
  --sg-kb-mouse-outline: color-mix(in oklch, var(--sg-grad-dark) 70%, white 10%);
  --sg-kb-wheel-accent: oklch(0.72 0.15 145); /* green, distinct from movement / jump tints */
```

These let the decoration share semantic colors with the rest of the keyboard panel instead of hardcoding OKLCH values in the `.ts` file.

- [ ] **Step 2: Add the decoration function to `mouseModule.ts`**

Open `apps/slipgate-app/src/components/keyboardModules/mouseModule.ts`. Add the decoration function by replacing the current module definition with:

```ts
import type { JSX } from "solid-js";
import type { KeyboardModule, ModuleDecorationCtx } from "./index";

function renderMouseDecoration(ctx: ModuleDecorationCtx): JSX.Element {
  const { kuBase, rowY, ku } = ctx;
  // Module spans 4u wide, 3 content rows (rows 1-3). Outline is a
  // rounded mouse silhouette framing the cells. Coordinates are in SVG
  // pixels so we can hand off directly to the SVG renderer.
  const left = kuBase - ku * 0.1;
  const right = kuBase + ku * 4.1;
  const top = rowY(1) - ku * 0.15;
  const bottom = rowY(3) + ku * 0.95;

  // Mouse outline: rounded rect with a subtle "waist" at the top (where
  // real mice have the scroll-wheel channel). Single decorative stroke.
  const outlinePath = `
    M ${left + ku * 0.4} ${top}
    L ${right - ku * 0.4} ${top}
    Q ${right} ${top}, ${right} ${top + ku * 0.4}
    L ${right} ${bottom - ku * 0.4}
    Q ${right} ${bottom}, ${right - ku * 0.4} ${bottom}
    L ${left + ku * 0.4} ${bottom}
    Q ${left} ${bottom}, ${left} ${bottom - ku * 0.4}
    L ${left} ${top + ku * 0.4}
    Q ${left} ${top}, ${left + ku * 0.4} ${top}
    Z
  `;

  // Wheel glyph: three small ridged ovals placed near the top edge of
  // Mouse3, MWheelUp, and MWheelDown cells. They share an accent color
  // to visually group the three wheel inputs.
  const wheelCx = kuBase + ku * 2; // center of M3 (spans cols 1-2)
  const wheelGlyph = (cx: number, cy: number) => (
    <g>
      <ellipse cx={cx} cy={cy} rx={ku * 0.18} ry={ku * 0.32}
               fill="var(--sg-kb-wheel-accent)" opacity="0.35"
               stroke="var(--sg-kb-wheel-accent)" stroke-width="1" />
      {/* ridges: three horizontal bars inside the oval */}
      <line x1={cx - ku * 0.12} y1={cy - ku * 0.12}
            x2={cx + ku * 0.12} y2={cy - ku * 0.12}
            stroke="var(--sg-kb-wheel-accent)" stroke-width="1.2" />
      <line x1={cx - ku * 0.12} y1={cy}
            x2={cx + ku * 0.12} y2={cy}
            stroke="var(--sg-kb-wheel-accent)" stroke-width="1.2" />
      <line x1={cx - ku * 0.12} y1={cy + ku * 0.12}
            x2={cx + ku * 0.12} y2={cy + ku * 0.12}
            stroke="var(--sg-kb-wheel-accent)" stroke-width="1.2" />
    </g>
  );

  return (
    <g class="sg-kb-mouse-decoration">
      <path d={outlinePath}
            fill="none"
            stroke="var(--sg-kb-mouse-outline)"
            stroke-width="2"
            stroke-linejoin="round" />
      {/* Wheel glyph on M3 (top of cell) */}
      {wheelGlyph(wheelCx, rowY(2) + ku * 0.22)}
      {/* Wheel glyph on MWheelUp (right column, top cell) */}
      {wheelGlyph(kuBase + ku * 3.5, rowY(2) + ku * 0.22)}
      {/* Wheel glyph on MWheelDown (right column, bottom cell) */}
      {wheelGlyph(kuBase + ku * 3.5, rowY(3) + ku * 0.22)}
    </g>
  );
}

export const MOUSE_MODULE: KeyboardModule = {
  id: "mouse",
  widthU: 4,
  keys: [
    // Row 1 - primary clicks
    { id: "Mouse1", label: "M1", x: 0, w: 2, row: 1 },
    { id: "Mouse2", label: "M2", x: 2, w: 2, row: 1 },
    // Row 2 - upper thumb, wheel click, wheel up
    { id: "Mouse5", label: "M5", x: 0, w: 1, row: 2 },
    { id: "Mouse3", label: "M3", x: 1, w: 2, row: 2 },
    { id: "MWheelUp", label: "MW\u2191", x: 3, w: 1, row: 2 },
    // Row 3 - lower thumb, reserved M6, wheel down
    { id: "Mouse4", label: "M4", x: 0, w: 1, row: 3 },
    { id: "Mouse6", label: "M6", x: 1, w: 2, row: 3 },
    { id: "MWheelDown", label: "MW\u2193", x: 3, w: 1, row: 3 },
  ],
  decoration: renderMouseDecoration,
};
```

- [ ] **Step 3: Invoke the decoration from `KeyboardLayout.tsx`**

In `KeyboardLayout.tsx`, find the `<svg>` body where keys are iterated. Before the `.map(k => <g>...</g>)` block, insert a `<Show>` block that renders the active module's decoration if it exists:

```tsx
<svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
  {/* Keyboard name (existing <Show>) */}
  <Show when={props.keyboardName}>
    {/* unchanged */}
  </Show>
  {/* Module decoration - sits behind the keys */}
  {(() => {
    const mod = MODULES[props.rightModule];
    if (!mod.decoration) return null;
    return mod.decoration({
      kuBase: NAV_X * KU,
      rowY,
      ku: KU,
    });
  })()}
  {/* Keys - existing iteration */}
  {[
    ...MAIN_BLOCK,
    ...MODULES[props.rightModule].keys.map(k => ({ ...k, x: k.x + NAV_X })),
  ].map(k => (
    {/* unchanged */}
  ))}
</svg>
```

The decoration renders first (so keys paint over it where they overlap), and it's keyed off the same module lookup as the keys themselves — they stay in sync automatically.

- [ ] **Step 4: Add a CSS rule for `.sg-kb-mouse-decoration` (pointer events passthrough)**

In `apps/slipgate-app/src/app.css`, add:

```css
.sg-kb-mouse-decoration {
  pointer-events: none;
}
```

This makes sure the decoration doesn't swallow clicks meant for the cells on top.

- [ ] **Step 5: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/keyboardModules/mouseModule.ts apps/slipgate-app/src/components/KeyboardLayout.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): mouse module decoration with outline and wheel glyphs

Add a decoration function to MOUSE_MODULE that draws the mouse
silhouette outline and three small ridged-oval wheel glyphs on M3,
MWheelUp, and MWheelDown cells. KeyboardLayout renders the decoration
as a sibling group before the keys so it sits behind them. New
semantic color vars --sg-kb-mouse-outline and --sg-kb-wheel-accent
join the keyboard color set.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Implement `moduleOf` reverse-lookup helper

Replace the stub `moduleOf` in `keyboardModules/index.ts` with a real implementation that builds a cached layout-ID -> module map at module load.

**Files:**
- Modify: `apps/slipgate-app/src/components/keyboardModules/index.ts`

- [ ] **Step 1: Import `MAIN_BLOCK` for the main-block key list**

The `moduleOf` function needs to know which keys live in `MAIN_BLOCK` so it can return `"main"` for them. `MAIN_BLOCK` currently lives inside `KeyboardLayout.tsx` and isn't exported. Add an export:

In `KeyboardLayout.tsx`, find the `MAIN_BLOCK` declaration and add `export`:

```ts
export const MAIN_BLOCK: KeyDef[] = [
  // ... unchanged content
];
```

- [ ] **Step 2: Replace the `moduleOf` stub**

In `apps/slipgate-app/src/components/keyboardModules/index.ts`, replace the stub at the bottom of the file with:

```ts
import { MAIN_BLOCK } from "../KeyboardLayout";

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
```

Remove the old stub `moduleOf` function and its `_layoutId` param.

- [ ] **Step 3: Verify there's no circular import issue**

`keyboardModules/index.ts` now imports `MAIN_BLOCK` from `KeyboardLayout.tsx`, and `KeyboardLayout.tsx` imports `MODULES` from `keyboardModules/index.ts`. TypeScript + ES modules handle this cleanly because both are top-level module exports — the runtime just sees two modules that reference each other's exports, and both resolve at import time.

Run the compile check to confirm:

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors, no circular-import warnings.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/KeyboardLayout.tsx apps/slipgate-app/src/components/keyboardModules/index.ts && git commit -m "$(cat <<'EOF'
feat(slipgate): implement moduleOf reverse lookup helper

Replace the stub in keyboardModules/index.ts with a real
implementation that builds a cached layout-ID -> module map at module
load. Export MAIN_BLOCK from KeyboardLayout so the lookup can include
main-block keys. Constant-time lookup thereafter - used by the
auto-reveal effect in Task 13.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Add persistence fields to `ProfilePrefs`

Two new fields on `ProfilePrefs` with `"nav"` defaults. Slipgate's profile loading already tolerates missing fields (existing migration code uses spread-with-defaults), so no migration code is needed.

**Files:**
- Modify: `apps/slipgate-app/src/store.ts`

- [ ] **Step 1: Extend the `ProfilePrefs` interface**

In `apps/slipgate-app/src/store.ts`, find the `ProfilePrefs` interface (around line 58) and add two fields at the end:

```ts
import type { KeyboardRightModule } from "./components/keyboardModules";
```

(Add the import at the top of the file alongside the other imports.)

```ts
export interface ProfilePrefs {
  map_backdrop: string;
  config_keyboard_visible: boolean;
  config_keyboard_show_movement: boolean;
  config_keyboard_show_weapons: boolean;
  config_keyboard_show_teamplay: boolean;
  /** Last-used right-slot module in the ConfigViewer keyboard panel. */
  config_keyboard_right_module: KeyboardRightModule;
  /** Last-used right-slot module in the Profile keyboard (nav or numpad only). */
  profile_keyboard_right_module: "nav" | "numpad";
}
```

- [ ] **Step 2: Extend `DEFAULT_PREFS`**

Find `DEFAULT_PREFS` (around line 117). Add the two new fields with `"nav"` defaults:

```ts
const DEFAULT_PREFS: ProfilePrefs = {
  map_backdrop: "dm3",
  config_keyboard_visible: true,
  config_keyboard_show_movement: true,
  config_keyboard_show_weapons: true,
  config_keyboard_show_teamplay: true,
  config_keyboard_right_module: "nav",
  profile_keyboard_right_module: "nav",
};
```

- [ ] **Step 3: Verify migration still spreads cleanly**

The existing `migrateProfile` function at line ~160 already uses `{ ...DEFAULT_PREFS, ...data.prefs }` which means pre-existing profiles that don't have the new fields will silently get the `"nav"` default. No migration code changes needed.

- [ ] **Step 4: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/store.ts && git commit -m "$(cat <<'EOF'
feat(slipgate): add keyboard right-module prefs fields

Two new ProfilePrefs fields: config_keyboard_right_module (nav /
numpad / mouse) and profile_keyboard_right_module (nav / numpad
only). Both default to "nav". Existing migration spread handles the
addition silently for pre-existing profiles.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Add module state to `useKeyboardPanelState` hook

Extend the hook with two new inputs (`availableModules`, `persistKey`) and three new outputs (`rightModule`, `setRightModule`, `availableModules`). The hook owns module state and its persistence; the auto-reveal effect does **not** live in the hook. Auto-reveal needs access to the primary config's `HighlightInput` to resolve selections into layout IDs, and that data only exists in `ConfigKeyboardPanel` — so the effect goes there in Task 13.

**Files:**
- Modify: `apps/slipgate-app/src/components/useKeyboardPanelState.ts`
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`

- [ ] **Step 1: Add the new inputs and outputs to the hook**

Replace the contents of `apps/slipgate-app/src/components/useKeyboardPanelState.ts` with the extended version. The existing behavior (selection, visibility, category toggles, section focus) is unchanged; additions are noted inline with `// NEW` comments.

```ts
import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { updatePrefs, type ProfileData } from "../store";
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

  // ── NEW: Right-slot module state ──
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
  };
}
```

Key points about the new code:

- `moduleField` is computed once based on `persistKey` — no `if` ladders downstream.
- `readPersistedModule` reads the profile pref, validates it against the consumer's `availableModules` list (so a Profile hook instance will never pick up a `"mouse"` value stored by ConfigViewer, even if the user somehow ends up with a shared pref), and falls back to `"nav"`.
- The mirror `createEffect` runs whenever the profile reloads — same pattern as the existing visibility and category toggles.
- `setRightModule` is async because `updatePrefs` is async, matching the existing toggle methods.
- The cast to `Partial<ProfilePrefs>` is needed because TypeScript can't narrow the computed key. Imported as an inline type-only import to keep the file dependency list small.
- Auto-reveal effect is **not** in this task — added in Task 13.

- [ ] **Step 2: Update the ConfigViewer call site**

Adding the new required inputs to the hook breaks the existing call site in `ConfigViewer.tsx` (the hook now expects `availableModules` and `persistKey`). Fix it in the same task so the commit is clean.

In `apps/slipgate-app/src/components/ConfigViewer.tsx`, find the `useKeyboardPanelState` call (around line 155). Update it to:

```ts
const kbState = useKeyboardPanelState({
  profile: () => props.profile,
  activeRow2,
  availableModules: ["nav", "numpad", "mouse"] as const,
  persistKey: "config",
});
```

This wires the new required inputs. ConfigKeyboardPanel still receives `rightModule="nav"` hardcoded — we don't switch to `kbState.rightModule()` yet because that's Task 11's job. The hook produces a `rightModule` signal but no consumer reads it in this task.

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/useKeyboardPanelState.ts apps/slipgate-app/src/components/ConfigViewer.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): add module state to useKeyboardPanelState hook

New inputs (availableModules, persistKey, optional selection), new
outputs (rightModule, setRightModule, availableModules), and a
persistence-mirror effect that reads the right-module pref on profile
reload. ConfigViewer's call site updated with the new required
inputs; the signal's value is not yet consumed (Task 11). Auto-reveal
effect intentionally deferred to Task 13.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Wire ConfigViewer's hook output through to `KeyboardLayout`

Replace the hardcoded `rightModule="nav"` in ConfigViewer + ConfigKeyboardPanel with the live hook signal. After this task, the module state round-trips: if the user manually edits `profile.json` to set `config_keyboard_right_module: "numpad"`, the ConfigViewer keyboard renders the numpad when the app reloads. The on-screen toggle UI lands in Task 12.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`

- [ ] **Step 1: Add `setRightModule` prop to `ConfigKeyboardPanelProps`**

In `ConfigKeyboardPanel.tsx`, extend the props interface:

```ts
interface ConfigKeyboardPanelProps {
  // ... existing props unchanged
  rightModule: KeyboardRightModule;
  setRightModule: (m: KeyboardRightModule) => void;  // NEW
  availableModules: readonly KeyboardRightModule[];  // NEW
}
```

Don't use `setRightModule` / `availableModules` yet — they're plumbed through now so Task 12 only has to add the UI, not re-thread the props.

- [ ] **Step 2: Wire ConfigViewer's `<ConfigKeyboardPanel>` usage to the hook**

In `ConfigViewer.tsx`, find the `<ConfigKeyboardPanel ... />` element (around line 921, edited in Task 3 step 4). Replace the hardcoded `rightModule="nav"` with hook outputs:

```tsx
<ConfigKeyboardPanel
  primary={effectiveConfig()}
  primaryName={effectiveChain()?.files[0]?.relative_path ?? null}
  compare={isCompareMode() ? compareBinds() : null}
  compareName={isCompareMode() ? props.compareSource?.primary_chain?.files[0]?.relative_path ?? null : null}
  visible={kbState.visible()}
  onToggleVisible={kbState.toggleVisible}
  selection={kbState.selection()}
  onSelectionChange={kbState.setSelection}
  showMovement={kbState.showMovement()}
  showWeapons={kbState.showWeapons()}
  showTeamplay={kbState.showTeamplay()}
  onToggleMovement={kbState.toggleMovement}
  onToggleWeapons={kbState.toggleWeapons}
  onToggleTeamplay={kbState.toggleTeamplay}
  rightModule={kbState.rightModule()}
  setRightModule={kbState.setRightModule}
  availableModules={kbState.availableModules}
/>
```

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): thread hook rightModule signal to ConfigKeyboardPanel

ConfigViewer now passes kbState.rightModule() / setRightModule /
availableModules to ConfigKeyboardPanel, replacing the hardcoded
rightModule="nav" from Task 3. Module state round-trips through the
pref; the visible toggle UI lands in Task 12.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Implement the segmented control UI in `ConfigKeyboardPanel` + CSS

Add three pill-style HTML buttons `[Nav] [Numpad] [Mouse]` in a new row above the keyboard SVG. Active button highlighted, click fires `props.setRightModule(m)`. Style with new CSS class shared with the existing keyboard panel color variables.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`
- Modify: `apps/slipgate-app/src/app.css`

- [ ] **Step 1: Add the segmented control row to the panel JSX**

In `ConfigKeyboardPanel.tsx`, find the existing `sg-config-kb-toggle-bar` `<div>` (around line 130). Directly after it, add the new segmented control row:

```tsx
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
{/* NEW: right-slot module segmented control */}
<div class="sg-config-kb-module-bar">
  {props.availableModules.map(m => {
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
```

The `labels` map is declared inline inside the callback so it ties to the `KeyboardRightModule` type. Since `ConfigKeyboardPanel`'s `availableModules` is always `["nav","numpad","mouse"]`, all three buttons render. When ProfileTab instantiates its own panel variant in Task 14, it'll use a two-button version.

- [ ] **Step 2: Add CSS for the module bar**

In `apps/slipgate-app/src/app.css`, find the existing `.sg-config-kb-toggle-bar` block (around line 2000) and add a new block right after it:

```css
.sg-config-kb-module-bar {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem 0;
  margin-bottom: -0.25rem;
}

.sg-config-kb-module-btn {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  border-radius: 4px;
  background: color-mix(in oklch, var(--sg-grad-dark) 70%, transparent);
  color: var(--sg-text-dim);
  border: 1px solid color-mix(in oklch, var(--sg-stat-border) 50%, transparent);
  cursor: pointer;
  transition: all 0.12s;
}

.sg-config-kb-module-btn:hover {
  background: color-mix(in oklch, var(--sg-grad-dark) 85%, white 5%);
  color: var(--sg-text);
}

.sg-config-kb-module-btn-active {
  background: color-mix(in oklch, var(--color-primary) 25%, var(--sg-grad-dark));
  color: var(--color-primary);
  border-color: color-mix(in oklch, var(--color-primary) 40%, transparent);
}
```

All colors use existing semantic variables (`--sg-grad-dark`, `--sg-text-dim`, `--sg-text`, `--sg-stat-border`, `--color-primary`) — no hardcoded OKLCH or hex.

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): segmented control to swap keyboard right module

Three-button pill row (Nav / Numpad / Mouse) sits above the keyboard
SVG in ConfigKeyboardPanel. Active button highlighted, click fires
props.setRightModule. CSS uses semantic color variables only. Both
stacked keyboards in compare mode receive the same rightModule value
via the shared panel-level signal.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Implement auto-reveal effect in `ConfigKeyboardPanel`

The auto-reveal effect lives in `ConfigKeyboardPanel`, not the hook, because the effect needs two things: the current selection (which the panel already receives via `props.selection`) AND the primary config's `HighlightInput` (which the panel already computes in its `primaryInput` memo). The hook has access to selection but not the config-specific data, so placing the effect in the panel keeps all its dependencies local.

No changes to the hook in this task.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`

- [ ] **Step 1: Add the auto-reveal `createEffect` in `ConfigKeyboardPanel.tsx`**

Open `ConfigKeyboardPanel.tsx`. At the top add the import:

```ts
import { createEffect } from "solid-js";
import { moduleOf } from "./keyboardModules";
```

Inside the `ConfigKeyboardPanel` function, after the existing `primaryInput` / `compareInput` / `primaryHighlights` / `compareHighlights` memos, add:

```tsx
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
  const next = order.find(m => containingModules.has(m));
  if (next && props.availableModules.includes(next)) {
    props.setRightModule(next);
  }
});
```

The effect's reactive deps are `props.selection`, `primaryInput()`, and `props.rightModule`. SolidJS tracks them automatically. `props.availableModules` is consulted defensively (belt-and-suspenders — ConfigViewer always passes all three modules, but if that ever changes the effect won't try to switch to an unavailable module).

- [ ] **Step 2: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): auto-reveal module on selection change

Add a createEffect in ConfigKeyboardPanel that watches the selection
prop, resolves its target layout IDs on the primary keyboard, and
swaps rightModule to the containing module if the current one doesn't
already show them. Tie-break: stay if current works, else pick nav ->
numpad -> mouse in order. Keys in the main block never trigger a
switch. Effect only runs in the config panel because only the config
panel has both the selection and the primary input.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Wire ProfileTab with second hook instance

Instantiate a second `useKeyboardPanelState` call in `ProfileTab` with `availableModules: ["nav","numpad"]` and `persistKey: "profile"`. Thread `rightModule` to Profile's `<KeyboardLayout>`. Profile ignores the hook's unused outputs (category toggles, visibility, selection).

**Files:**
- Modify: `apps/slipgate-app/src/components/ProfileTab.tsx`

- [ ] **Step 1: Add the hook import and instantiate a second copy**

In `apps/slipgate-app/src/components/ProfileTab.tsx`, add the import at the top of the file alongside the existing component imports:

```ts
import { useKeyboardPanelState } from "./useKeyboardPanelState";
```

Inside the `ProfileTab` component function, near the other hooks/memos (the existing profile code uses `createSignal`, `createMemo`, etc. around line 60-100 — pick a spot after those signals are declared), add:

```ts
// Profile's keyboard panel state - right-slot module only. The hook's
// category toggles, visibility, and selection outputs are ignored here;
// Profile doesn't use click-to-pin and has its own show-bind-labels
// toggle outside this hook. A dummy activeRow2 is fine.
const profileKbState = useKeyboardPanelState({
  profile: () => props.profile,
  activeRow2: () => new Set<string>(),
  availableModules: ["nav", "numpad"] as const,
  persistKey: "profile",
});
```

- [ ] **Step 2: Pass `rightModule` to the `KeyboardLayout` usage**

Find the existing `<KeyboardLayout ... rightModule="nav" />` in ProfileTab (added in Task 3, around line 414). Replace the hardcoded `rightModule="nav"` with:

```tsx
<KeyboardLayout
  movement={m}
  keyboardName={keyboardDisplayName()}
  highlights={weaponKeyHighlights()}
  showMovement={showMovement()}
  keyLabels={keyLabels()}
  rightModule={profileKbState.rightModule()}
/>
```

- [ ] **Step 3: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ProfileTab.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): wire ProfileTab with separate keyboard module state

ProfileTab instantiates its own useKeyboardPanelState with
availableModules: ["nav","numpad"] and persistKey: "profile" so
Profile's module selection is remembered independently from
ConfigViewer's. Profile's KeyboardLayout reads from the new hook
instance's rightModule signal. Category toggles, visibility, and
selection outputs from the hook are ignored. Toggle UI lands in
Task 15.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Add the Profile-side module toggle UI

Add a small two-button toggle between F12 and the "NuPhy Field75 HE" brand label, above the Backspace key area. Brand label text is unchanged; the slot is reclaimed from whitespace, not from the label itself.

**Files:**
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx`
- Modify: `apps/slipgate-app/src/components/ProfileTab.tsx`
- Modify: `apps/slipgate-app/src/app.css`

**Note on toggle placement:** the brand label renders *inside* the SVG as a `<rect>` + `<text>` element (see `KeyboardLayout.tsx` lines 259-277). The toggle needs to render alongside the SVG, not inside it. The cleanest approach: render the toggle as HTML absolutely positioned over the keyboard container, using CSS grid/flex to place it in the slot. This task uses an HTML overlay pattern.

- [ ] **Step 1: Accept an optional `rightModuleToggle` slot prop on `KeyboardLayout`**

In `KeyboardLayout.tsx`, add an optional prop for an overlay element. This gives ProfileTab a way to render its toggle inside the keyboard container without KeyboardLayout needing to know about the hook:

```ts
interface KeyboardLayoutProps {
  // ... existing props
  rightModule: KeyboardRightModule;
  /** Optional overlay rendered absolutely inside the keyboard container. Used by ProfileTab for its nav/numpad toggle. */
  rightModuleToggle?: JSX.Element;
}
```

Import `JSX` from `solid-js` at the top if it isn't already:

```ts
import { Show, createMemo, type JSX } from "solid-js";
```

At the bottom of the component's JSX, wrap the return in the existing `<div class="sg-keyboard-container">` and add a `<Show>` for the overlay:

```tsx
return (
  <div class="sg-keyboard-container">
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      {/* existing content unchanged */}
    </svg>
    <Show when={props.rightModuleToggle}>
      <div class="sg-keyboard-module-toggle-overlay">
        {props.rightModuleToggle}
      </div>
    </Show>
  </div>
);
```

- [ ] **Step 2: Add CSS for the overlay positioning**

In `apps/slipgate-app/src/app.css`, find the `.sg-keyboard-container` block (around line 598) and update it to be a positioning context, then add the overlay rule:

```css
.sg-keyboard-container {
  position: relative;  /* NEW - anchor for the overlay */
  /* existing properties unchanged */
}

.sg-keyboard-module-toggle-overlay {
  /* Position it over the F-row slot between F12 and the brand label.
     Percent coordinates scale with the SVG automatically because the
     SVG uses preserveAspectRatio. */
  position: absolute;
  top: 2%;
  /* 14.25u / 19.5u (TOTAL_W_U) ~= 73% - just before where the brand label starts */
  left: 73%;
  width: 7%;
  height: 11%;
  display: flex;
  gap: 2px;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.sg-keyboard-module-toggle-btn {
  flex: 1;
  height: 100%;
  font-size: 0.6rem;
  background: color-mix(in oklch, var(--sg-grad-dark) 80%, transparent);
  color: var(--sg-text-dim);
  border: 1px solid color-mix(in oklch, var(--sg-stat-border) 60%, transparent);
  border-radius: 3px;
  cursor: pointer;
  padding: 0;
}

.sg-keyboard-module-toggle-btn:hover {
  color: var(--sg-text);
  background: color-mix(in oklch, var(--sg-grad-dark) 95%, white 3%);
}

.sg-keyboard-module-toggle-btn-active {
  background: color-mix(in oklch, var(--color-primary) 25%, var(--sg-grad-dark));
  color: var(--color-primary);
  border-color: color-mix(in oklch, var(--color-primary) 40%, transparent);
}
```

The percent-based positioning keeps the overlay in the right place as the keyboard scales. If the exact position looks off in practice, adjust the `left`/`width` values during Task 16's manual pass.

- [ ] **Step 3: Pass the toggle JSX from `ProfileTab`**

In `ProfileTab.tsx`, find the `<KeyboardLayout>` usage from Task 14 (around line 414). Construct the toggle element and pass it via the new prop:

```tsx
<KeyboardLayout
  movement={m}
  keyboardName={keyboardDisplayName()}
  highlights={weaponKeyHighlights()}
  showMovement={showMovement()}
  keyLabels={keyLabels()}
  rightModule={profileKbState.rightModule()}
  rightModuleToggle={
    <>
      <button
        class="sg-keyboard-module-toggle-btn"
        classList={{ "sg-keyboard-module-toggle-btn-active": profileKbState.rightModule() === "nav" }}
        onClick={() => profileKbState.setRightModule("nav")}
        title="Nav cluster + arrow keys"
      >
        Nav
      </button>
      <button
        class="sg-keyboard-module-toggle-btn"
        classList={{ "sg-keyboard-module-toggle-btn-active": profileKbState.rightModule() === "numpad" }}
        onClick={() => profileKbState.setRightModule("numpad")}
        title="Numpad"
      >
        Num
      </button>
    </>
  }
/>
```

Short labels (`Nav`, `Num`) fit the tiny slot. The fragment is valid JSX — Solid renders it inline inside the overlay div.

- [ ] **Step 4: Compile check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/KeyboardLayout.tsx apps/slipgate-app/src/components/ProfileTab.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): profile-side nav/numpad toggle next to F12

KeyboardLayout accepts an optional rightModuleToggle JSX slot rendered
as an HTML overlay absolutely positioned over the F-row area between
F12 and the brand label. ProfileTab passes a two-button Nav/Num toggle
into that slot. Button styles share semantic color variables with the
ConfigViewer module bar. Exact overlay position may need a nudge in
Task 16 if it doesn't visually line up with the intended slot.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Final verification pass

End-to-end manual verification of every spec requirement. This is the only point in the plan where a Windows build is strictly required — everything before this was compile-checked only.

**Files:** possibly small fixes to any file touched above, depending on findings.

- [ ] **Step 1: Full compile + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: both commands succeed with no errors.

- [ ] **Step 2: Launch the app on Windows and run the verification checklist**

The app builds from a Windows terminal — WSL builds do not produce a working Tauri binary. Either:

- On Windows: `cd C:\path\to\apps\slipgate-app && bun run tauri dev` (or whatever the project's dev command is; check `apps/slipgate-app/package.json` scripts)
- Or run the verification against a deployed build.

Run through every item from the spec's §10:

1. **ConfigViewer module toggle.** Load a config. Click each of the three module buttons in turn. Verify: main block stays in the same pixel position, module content swaps correctly, **no visual size snap** when swapping. If the keyboard visibly resizes on toggle, the `TOTAL_W_U` bump from Task 2 didn't apply everywhere — re-check that every SVG path (main rendering + decoration ctx) uses the new `NAV_X + 4` width.
2. **Compare mode sync.** Load two configs in compare mode. Click each module button. Verify: both stacked keyboards swap simultaneously, same module shown on both.
3. **Click-to-pin auto-reveal.** Set the module to `nav`. Click a bind in the left list whose key is on the numpad (if your test config doesn't have numpad binds, edit one temporarily). Verify: the module auto-swaps to `numpad` and the target key is highlighted. Repeat with a mouse bind -> auto-swap to `mouse`.
4. **Auto-reveal tie-break.** Click a bind whose key is in the main block (e.g. `F`). Verify: module does **not** change, and the F key lights up on the currently-active module view.
5. **Numpad binds render.** Load a config that binds something to `kp_5`. Switch to numpad module. Verify the 5 key lights up with the correct color. Try a few more numpad keys to confirm the mappings work.
6. **Mouse binds render.** Load a config with a `mouse1` or `mwheelup` bind. Switch to mouse module. Verify all bound mouse inputs light up. Try `mouse3`, `mwheeldown`, and a thumb button (`mouse4` / `mouse5`).
7. **Mouse6 reserved cell.** With no `mouse6` bind in the config, verify the M6 cell renders dimmed. Add a `bind mouse6 ...` line, reload, verify M6 lights up like any other cell.
8. **Profile module toggle.** Open the Profile view. Verify the two-button toggle is visible in the slot next to F12. Click each button, verify the profile keyboard swaps correctly. Verify the mouse gear card underneath is unchanged (still renders the product image, still highlights mouse binds there).
9. **Persistence independence.** Set ConfigViewer to `mouse` and Profile to `numpad`. Close the app. Relaunch. Verify ConfigViewer is still on `mouse` and Profile is still on `numpad`.
10. **Decoration pointer events.** In mouse mode, verify clicks on the mouse cells still register (the decoration's `pointer-events: none` keeps it out of the way). Click M1, confirm it behaves like a click on any other key.

- [ ] **Step 3: Fix anything that doesn't match spec**

Any mismatch -> surgical fix targeted at the specific failure, then re-run the checklist. Common issues to watch for:
- CSS `top`/`left` on the profile overlay doesn't hit the slot perfectly: adjust the percent values in `.sg-keyboard-module-toggle-overlay`.
- Brand label text overlaps the toggle: shorten `keyboardDisplayName()` output in ProfileTab if needed, or shrink the overlay width.
- Auto-reveal swaps when it shouldn't (e.g. on every selection change): double-check the effect's current-module-already-works gate.
- Decoration mouse outline doesn't look right: adjust the path coordinates in `renderMouseDecoration`. This is expected to need visual tuning.

- [ ] **Step 4: Commit any fixes**

If any small tweaks were needed:

```bash
cd /home/paradoks/projects/quakeworld && git add <touched-files> && git commit -m "$(cat <<'EOF'
fix(slipgate): modular keyboard panel visual polish

Adjustments from the final manual verification pass - see commit
diff for specifics.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no fixes were needed, skip the commit step. The feature is complete at the end of Task 15.

- [ ] **Step 5: Push to origin**

```bash
cd /home/paradoks/projects/quakeworld && git push origin main
```

---

## Done

At the end of Task 16, the modular keyboard panel feature is complete:

- `KeyboardLayout` renders one fixed main block plus a swappable right module.
- ConfigViewer swaps between nav / numpad / mouse via a segmented control; compare mode syncs both keyboards.
- Click-to-pin auto-reveals the containing module when the target key lives in a non-active module.
- Profile swaps between nav / numpad via a smaller toggle next to F12; the mouse gear card underneath is unchanged.
- Both views persist their module independently in `ProfilePrefs`.
- Numpad cells render ezQuake's 17 canonical numpad keys; mouse cells render 7 mouse inputs (Mouse1-5, MWheelUp, MWheelDown) plus a reserved Mouse6 slot.
- No automated tests added; compile + build + full manual verification are the quality gates.
