# ConfigViewer Keyboard Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side keyboard visualization panel to the ConfigViewer that stacks two keyboards in compare mode and links keys to text-list rows bidirectionally via click-to-pin, matched by command.

**Architecture:** Reuse the existing stateless `KeyboardLayout` component. Add a new `ConfigKeyboardPanel` container that composes one or two instances with a shared toggle bar, owner-frame tints, and linked selection state. Extract Profile's highlight/label builders into a shared helpers file so Profile and ConfigKeyboardPanel both consume them. Add a `Movement > Binds` sidebar section. Persist the toggle state and "Show keyboard" pref through `ProfilePrefs` / `updatePrefs`.

**Tech stack:** SolidJS + TypeScript, Tauri v2, Tailwind + DaisyUI, `tauri-plugin-store` via `src/store.ts`. No Rust changes — the existing `classify_chain_binds` command and `EzQuakeConfig` shape already provide everything needed.

**Testing note:** slipgate-app has **no test suite and no test runner configured** (no vitest/jest in `package.json`). Per the monorepo CLAUDE.md testing philosophy, automated tests are NOT added speculatively. Verification in every task uses three gates:

1. `cd apps/slipgate-app && bunx tsc --noEmit` — must produce 0 errors (memory rule: always typecheck slipgate frontend work)
2. `cd apps/slipgate-app && bun run build` — must succeed
3. Manual interaction in the running dev app — specific steps listed per task

If a task introduces a pure helper that is easy to unit-check manually, the plan shows a small driver snippet for the developer to paste into the console. No test files are created.

**Spec reference:** `apps/slipgate-app/docs/superpowers/specs/2026-04-14-config-viewer-keyboard-panel-design.md`

---

## File structure

### New files

- `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`
  Container component that renders one or two `<KeyboardLayout />` instances, owns the shared toggle state (Movement/Weapons/Teamplay), owns the selection state for click-to-pin, renders the owner-frame tints, labels ("You" / compare filename), and the "Show keyboard" hide toggle. Consumes primary `EzQuakeConfig` and optional compare `ChainBindClassification`. Emits an `onSelectionChange` event upward so `ConfigViewer` can drive row expansion on the left side.

- `apps/slipgate-app/src/components/keyboardHighlights.ts`
  Pure helper module. Exports:
  - `buildKeyHighlights(input): Map<string, KeyHighlight>` — builds the per-key color map from weapon_binds + teamsay_binds, honoring the three toggles.
  - `buildKeyLabels(input): Map<string, string> | undefined` — builds the per-key label override map when label mode is on.
  - `TEAMSAY_COLORS`, `WEAPON_LABELS`, `MOVE_ARROWS` constants currently hardcoded in `ProfileTab.tsx`.
  - `resolveCommandKeys(config, command): string[]` — given a parsed config and a canonical command name (e.g. `"safe"`, `"rl"`), returns all layout-key IDs bound to that command in that config. Used by click-to-pin to match by command across sides.

### Modified files

- `apps/slipgate-app/src/components/KeyboardLayout.tsx` — add optional `onKeyClick?(id: string): void` and `selectedKeyIds?: Set<string>` props; render a "neon frame" styling for selected keys. Profile behavior unchanged when new props are unused.
- `apps/slipgate-app/src/components/ProfileTab.tsx` — refactor to import highlight/label builders from `keyboardHighlights.ts`. Remove local duplicates. No user-visible behavior change.
- `apps/slipgate-app/src/components/ConfigSidebar.tsx` — add a "Movement" domain block with a "Binds" button, mirroring the existing Weapons/Teamplay pattern.
- `apps/slipgate-app/src/components/ConfigViewer.tsx` — add `movement:binds` section rendering; add `<ConfigKeyboardPanel>` in the right rail; add selection-pin signal; extend row-click handlers to emit selection into the panel and to accept selection from it.
- `apps/slipgate-app/src/components/ConfigDomainBinds.tsx` — add a new `ConfigMovementBindsSection` export rendering movement keys as a list. Sibling to the existing weapon/teamsay sections.
- `apps/slipgate-app/src/store.ts` — extend `ProfilePrefs` with `config_keyboard_visible: boolean`, `config_keyboard_show_movement: boolean`, `config_keyboard_show_weapons: boolean`, `config_keyboard_show_teamplay: boolean`. Update `DEFAULT_PREFS`.
- `apps/slipgate-app/src/app.css` — add new styles: `sg-config-kb-panel`, `sg-config-kb-frame-you`, `sg-config-kb-frame-them`, `sg-kb-key-selected`, `sg-config-kb-toggle-bar`, `sg-config-kb-label`.

---

## Task 1: Add Movement domain to ConfigSidebar

**Goal:** Sidebar shows a new "Movement > Binds" pill alongside Teamplay and Weapons. Clicking it toggles `movement:binds` in `activeRow2`, same mechanism as other domain pills. The content section it would reveal does not exist yet — that comes in Task 2. This task is purely additive UI.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigSidebar.tsx:141` — insert Movement block after the Weapons block

- [ ] **Step 1: Add the Movement domain block**

Edit `apps/slipgate-app/src/components/ConfigSidebar.tsx`. Find the closing `</div>` of the Weapons block at line 141. Immediately after that closing `</div>` (still inside the `Domains` parent flex container), insert:

```tsx
        <div class="sg-config-sidebar-domain-label">Movement</div>
        <div class="sg-config-sidebar-nested flex flex-col items-start gap-1">
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("movement:binds") ? "badge-binds" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("movement:binds")}
          >
            Binds
          </button>
        </div>
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: 0 errors. ConfigSidebar's props interface already takes `activeRow2: Set<string>` and `onToggleRow2Pill: (key: string) => void` — no signature change needed.

- [ ] **Step 3: Manual check**

Run `cd apps/slipgate-app && bun run dev` (from Windows terminal per CLAUDE.md). Open ConfigViewer in the app. The sidebar Domains area now shows Teamplay, Weapons, **Movement**. Click Movement > Binds. The pill should toggle visually (badge-binds when active). Nothing appears in the content area yet — expected, handled in Task 2.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigSidebar.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): add Movement > Binds pill to ConfigSidebar

First of three steps adding a Movement domain section. Sidebar pill
only — content rendering comes in the next commit.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add ConfigMovementBindsSection and wire it into ConfigViewer

**Goal:** Clicking the new "Movement > Binds" pill shows a section listing the 7 movement key bindings (forward, back, left, right, jump, moveup, movedown) with their values, in compare mode showing both sides.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigDomainBinds.tsx` — add `ConfigMovementBindsSection` export
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx` — import and render it under `activeRow2().has("movement:binds")`

- [ ] **Step 1: Add the MovementBindsSection component**

Open `apps/slipgate-app/src/components/ConfigDomainBinds.tsx`. At the bottom of the file, append a new exported component. If the file already imports `For` / `Show` from solid-js, reuse; otherwise add the import.

Paste this component verbatim at the end of the file:

```tsx
import type { MovementKeys } from "../types";

interface ConfigMovementBindsSectionProps {
  primary: MovementKeys;
  compare?: MovementKeys | null;
}

const MOVEMENT_ROWS: { key: keyof MovementKeys; label: string }[] = [
  { key: "forward",   label: "Forward" },
  { key: "back",      label: "Back" },
  { key: "moveleft",  label: "Strafe Left" },
  { key: "moveright", label: "Strafe Right" },
  { key: "jump",      label: "Jump" },
  { key: "moveup",    label: "Swim Up" },
  { key: "movedown",  label: "Swim Down" },
];

export function ConfigMovementBindsSection(props: ConfigMovementBindsSectionProps) {
  return (
    <div class="sg-category-group">
      <div class="sg-category-group-header">Movement Binds</div>
      <div class="sg-domain-bind-table">
        <div class="sg-domain-bind-row sg-domain-bind-header">
          <span>Action</span>
          <span>Your Bind</span>
          <Show when={props.compare}><span>Comparison</span></Show>
        </div>
        <For each={MOVEMENT_ROWS}>
          {(row) => {
            const yours = props.primary[row.key] || "--";
            const theirs = props.compare ? (props.compare[row.key] || "--") : null;
            return (
              <div class="sg-domain-bind-row">
                <span class="sg-domain-bind-action">{row.label}</span>
                <span class="sg-domain-bind-key"><code>{yours}</code></span>
                <Show when={props.compare}>
                  <span class="sg-domain-bind-key"><code>{theirs}</code></span>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
```

If `Show` or `For` is not already imported at the top of the file, add it to the existing solid-js import line, e.g.:

```tsx
import { For, Show } from "solid-js";
```

Note: the styling classes (`sg-category-group`, `sg-category-group-header`, `sg-domain-bind-table`, `sg-domain-bind-row`, `sg-domain-bind-action`, `sg-domain-bind-key`) already exist and are used by `ConfigWeaponBindsSection` / `ConfigTeamsayBindsSection`. No new CSS needed.

- [ ] **Step 2: Render it in ConfigViewer**

Open `apps/slipgate-app/src/components/ConfigViewer.tsx`.

At the top, line 9, extend the existing import:

```tsx
import { ConfigWeaponBindsSection, ConfigTeamsayBindsSection, ConfigMovementBindsSection } from "./ConfigDomainBinds";
```

In the JSX, find the `<Show when={activeRow2().has("teamplay:binds")}>` block (around line 815). Immediately after the block that renders `<ConfigWeaponBindsSection>` and before the `<Show when={activeRow2().has("teamplay:binds")}>`, insert:

```tsx
                <Show when={activeRow2().has("movement:binds")}>
                  <ConfigMovementBindsSection
                    primary={effectiveConfig()?.movement ?? {
                      forward: "", back: "", moveleft: "", moveright: "",
                      jump: "", moveup: "", movedown: "",
                    }}
                    compare={isCompareMode() ? (compareBinds()?.movement ?? null) : null}
                  />
                </Show>
```

Placement: inside the scroll-content `<div class="sg-content-scroll ...">` at ConfigViewer.tsx:795, between the weapon-binds and teamplay-binds Show blocks.

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual check**

In the running dev app, click **Movement > Binds** in the sidebar. The content area should now show a "Movement Binds" table with 7 rows (Forward / Back / Strafe Left / Strafe Right / Jump / Swim Up / Swim Down) and the key bound to each in your current config. Load a compare config — the table should gain a "Comparison" column with the opponent's movement keys.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigDomainBinds.tsx apps/slipgate-app/src/components/ConfigViewer.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): render Movement Binds section in ConfigViewer

Lists the 7 movement keys and their bindings, with compare-mode
column when a compare chain is loaded.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extend KeyboardLayout with click and selection props

**Goal:** Add optional `onKeyClick` and `selectedKeyIds` props to `<KeyboardLayout>` so consumers can opt into click-to-pin without breaking Profile's current usage.

**Files:**
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx:186-195` — extend props interface
- Modify: `apps/slipgate-app/src/components/KeyboardLayout.tsx:271-318` — wire click handler and selected styling

- [ ] **Step 1: Extend the props interface**

Open `apps/slipgate-app/src/components/KeyboardLayout.tsx`. Replace the `KeyboardLayoutProps` interface (lines 186-195) with:

```tsx
interface KeyboardLayoutProps {
  movement: MovementKeys;
  keyboardName?: string | null;
  /** Per-key highlights (key layout ID → color). Overrides movement highlights when present. */
  highlights?: Map<string, KeyHighlight>;
  /** When true, movement keys are dimmed instead of highlighted (bind viz mode). */
  showMovement?: boolean;
  /** Per-key label overrides (key layout ID → display label). Shows bound function instead of physical key. */
  keyLabels?: Map<string, string>;
  /** Click handler. When set, every key becomes an interactive target. Click events emit the layout ID. */
  onKeyClick?: (id: string) => void;
  /** Set of key IDs to render with a bright "neon" selection frame. */
  selectedKeyIds?: Set<string>;
}
```

- [ ] **Step 2: Extend the `keyClass` helper to account for selection**

Replace the existing `keyClass` function (lines 215-225) with:

```tsx
  const keyClass = (id: string) => {
    const selected = props.selectedKeyIds?.has(id) ?? false;
    // Custom highlights take precedence
    if (props.highlights?.has(id)) {
      return selected ? "sg-kb-key sg-kb-highlight sg-kb-key-selected" : "sg-kb-key sg-kb-highlight";
    }
    // Movement highlights only when showMovement is on
    if (showMovement()) {
      const { moveIds, jumpId } = resolved();
      if (id === jumpId) return selected ? "sg-kb-key sg-kb-jump sg-kb-key-selected" : "sg-kb-key sg-kb-jump";
      if (moveIds.has(id)) return selected ? "sg-kb-key sg-kb-move sg-kb-key-selected" : "sg-kb-key sg-kb-move";
    }
    return selected ? "sg-kb-key sg-kb-key-selected" : "sg-kb-key";
  };
```

- [ ] **Step 3: Wire the click handler onto each key's `<rect>`**

Find the `LAYOUT.map(k => (` block around line 271. Replace the outer `<rect>` element (lines 273-281) with:

```tsx
            <rect
              x={k.x * KU + PAD}
              y={rowY(k.row) + PAD}
              width={k.w * KU - PAD * 2}
              height={ROW_H - PAD * 2}
              rx={4}
              class={keyClass(k.id)}
              style={keyStyle(k.id)}
              onClick={props.onKeyClick ? (e) => { e.stopPropagation(); props.onKeyClick!(k.id); } : undefined}
              cursor={props.onKeyClick ? "pointer" : undefined}
            />
```

- [ ] **Step 4: Add the `sg-kb-key-selected` CSS rule**

Open `apps/slipgate-app/src/app.css`. Search for `sg-kb-key` to find the existing keyboard styles. At the end of that block (wherever the `sg-kb-highlight` rule lives), add:

```css
.sg-kb-key-selected {
  stroke: oklch(0.92 0.18 85);
  stroke-width: 2.5px;
  filter: drop-shadow(0 0 4px oklch(0.92 0.18 85 / 0.7));
}
```

The color (`oklch(0.92 0.18 85)` — bright yellow) is intentionally distinct from the category tints (cyan/green/red/purple) and the owner-frame tints added in Task 6. Iterate during Task 11 if it reads poorly next to real content.

- [ ] **Step 5: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 6: Manual regression check — Profile must be unchanged**

Open the Profile tab. Toggle Movement / Weapons / Teamplay on the keyboard. Verify: colors render identically to before, no visible selection frame anywhere, no cursor pointer over keys (because Profile does not pass `onKeyClick`). This task must not change Profile's appearance or behavior at all.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/KeyboardLayout.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): add click + selection props to KeyboardLayout

Optional onKeyClick and selectedKeyIds props for consumers that need
click-to-pin interactions. Profile's usage is unchanged — no click
handler passed means keys stay non-interactive, no cursor change.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Extract Profile's highlight and label builders into a shared helper

**Goal:** Move `TEAMSAY_COLORS`, `WEAPON_LABELS`, `MOVE_ARROWS`, `weaponKeyHighlights`, and `keyLabels` logic out of `ProfileTab.tsx` and into a shared module so `ConfigKeyboardPanel` can reuse them. Profile imports from the new module. No user-visible change.

**Files:**
- Create: `apps/slipgate-app/src/components/keyboardHighlights.ts`
- Modify: `apps/slipgate-app/src/components/ProfileTab.tsx:92-194` — remove locals, import from new module

- [ ] **Step 1: Create the shared helper module**

Write `apps/slipgate-app/src/components/keyboardHighlights.ts`:

```ts
import type { EzQuakeConfig, FiringPath, TeamsayBind, MovementKeys } from "../types";
import type { KeyHighlight } from "./KeyboardLayout";
import { toLayoutId } from "./KeyboardLayout";
import { WEAPON_COLORS } from "./WeaponBindViz";

/** Teamsay category → OKLCH color, shared between Profile and ConfigViewer. */
export const TEAMSAY_COLORS: Record<string, string> = {
  status:   "oklch(0.7 0.15 210)",
  death:    "oklch(0.65 0.2 25)",
  movement: "oklch(0.7 0.15 145)",
  items:    "oklch(0.75 0.15 85)",
  enemy:    "oklch(0.65 0.2 30)",
  orders:   "oklch(0.7 0.15 55)",
  powerups: "oklch(0.7 0.18 300)",
  confirm:  "oklch(0.65 0.1 250)",
  custom:   "oklch(0.6 0.08 0)",
};

export const WEAPON_LABELS: Record<string, string> = {
  rl: "RL", lg: "LG", gl: "GL", sng: "SNG", ng: "NG",
  ssg: "SSG", sg: "SG", axe: "AXE",
};

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
    for (const wb of input.weapon_binds) {
      const id = toLayoutId(wb.trigger_key);
      if (id) {
        const existing = labels.get(id);
        const wLabel = WEAPON_LABELS[wb.weapon] ?? wb.weapon.toUpperCase();
        labels.set(id, existing ? `${existing}/${wLabel}` : wLabel);
      }
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
 * Given a parsed config and a canonical command identifier (weapon name like
 * "rl" / "sg" or a teamsay label like "safe" / "lost"), return the set of
 * layout key IDs bound to that command. Used by click-to-pin to find the
 * matching key on the OTHER keyboard when commands are matched by name.
 */
export function resolveCommandKeys(
  input: HighlightInput,
  command: { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string },
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
  modifierKey?: string; // "Ctrl" / "Shift" / "Alt" when this bind is a modifier combo
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
    // Plain single-key binds
    if (toLayoutId(tb.key) === keyId) {
      matches.push({ kind: "teamsay", label: tb.label, category: tb.category });
      continue;
    }
    // Modifier-combo binds like "CTRL+F" — split and match the target half
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
```

- [ ] **Step 2: Refactor ProfileTab to import from the helper**

Open `apps/slipgate-app/src/components/ProfileTab.tsx`.

At the top (around line 11), add an import:

```tsx
import { buildKeyHighlights, buildKeyLabels, TEAMSAY_COLORS } from "./keyboardHighlights";
```

**Delete the local `TEAMSAY_COLORS` constant at lines 92-102** — it now lives in the helper.

**Delete the local `WEAPON_LABELS` and `MOVE_ARROWS` constants at lines 150-156** — they are now internal to the helper.

**Replace the `weaponKeyHighlights` memo (lines 105-128)** with:

```tsx
  // Build keyboard highlights from weapon binds + teamsay binds
  const weaponKeyHighlights = createMemo(() => {
    const cfg = props.ezConfig;
    if (!cfg) return new Map();
    return buildKeyHighlights(
      {
        weapon_binds: cfg.weapon_binds,
        teamsay_binds: cfg.teamsay_binds,
        movement: cfg.movement,
      },
      {
        showMovement: showMovement(),
        showWeapons: showWeapons(),
        showTeamplay: showTeamplay(),
      },
    );
  });
```

**Replace the `keyLabels` memo (lines 157-194)** with:

```tsx
  const keyLabels = createMemo(() => {
    const cfg = props.ezConfig;
    if (!cfg) return undefined;
    return buildKeyLabels(
      {
        weapon_binds: cfg.weapon_binds,
        teamsay_binds: cfg.teamsay_binds,
        movement: cfg.movement,
      },
      {
        showMovement: showMovement(),
        showWeapons: showWeapons(),
        showTeamplay: showTeamplay(),
      },
      showBindLabels(),
    );
  });
```

Leave the `teamsayMouseHighlights` memo at lines 131-147 in place — it's Profile-specific (mouse highlights, not keyboard) and not part of this extraction. It still references `TEAMSAY_COLORS` but now imports it.

- [ ] **Step 3: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 4: Manual regression check — Profile tab**

Open the Profile tab. Toggle **Weapons** — the weapon keys light up in the same colors as before. Toggle **Teamplay** — teamsay keys light up, mouse highlights still render. Toggle **Movement** off — movement keys dim. Toggle **Bind labels** (if the UI exposes it) — weapon labels and arrows appear on keys. Every one of these should look **exactly** the same as before the refactor. If anything differs, the extraction introduced a regression — fix before committing.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/keyboardHighlights.ts apps/slipgate-app/src/components/ProfileTab.tsx && git commit -m "$(cat <<'EOF'
refactor(slipgate): extract keyboard highlight builders to shared helper

Moves TEAMSAY_COLORS, buildKeyHighlights, buildKeyLabels out of
ProfileTab into keyboardHighlights.ts. Adds resolveCommandKeys and
identifyKeyCommands for click-to-pin command matching.

Profile behavior unchanged — same colors, same labels, same toggles.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Build ConfigKeyboardPanel (single view, local toggle state, no selection, no compare)

**Goal:** Create the container component that renders one keyboard in the ConfigViewer right rail. Toggle bar with three buttons (Movement / Weapons / Teamplay) — state is local to the component for now. Not yet visible in ConfigViewer — that happens in Task 6.

**Files:**
- Create: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`
- Modify: `apps/slipgate-app/src/app.css` — add panel styles

- [ ] **Step 1: Create the component**

Write `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`:

```tsx
import { createSignal, createMemo, Show, For } from "solid-js";
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
  // Local toggle state. Task 10 moves this into ProfilePrefs.
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
```

- [ ] **Step 2: Add panel styles to app.css**

Open `apps/slipgate-app/src/app.css`. Append these rules at the end of the file:

```css
.sg-config-kb-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  min-width: 0;
  overflow: auto;
}

.sg-config-kb-toggle-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.25rem 0;
}

.sg-config-kb-wrap {
  position: relative;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid transparent;
}

.sg-config-kb-frame-you {
  border-color: color-mix(in oklch, oklch(0.65 0.18 230) 40%, transparent);
  background: color-mix(in oklch, oklch(0.65 0.18 230) 4%, transparent);
}

.sg-config-kb-frame-them {
  border-color: color-mix(in oklch, oklch(0.7 0.18 40) 40%, transparent);
  background: color-mix(in oklch, oklch(0.7 0.18 40) 4%, transparent);
}

.sg-config-kb-label {
  position: absolute;
  top: 0.25rem;
  left: 0.5rem;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sg-section-label);
  z-index: 1;
}
```

Colors `oklch(0.65 0.18 230)` (you = blue) and `oklch(0.7 0.18 40)` (them = orange) are the owner-frame tints. They are intentionally different from the bright-yellow selection frame (`oklch(0.92 0.18 85)`) from Task 3 so selection reads clearly against either tint. Iterate in Task 11 if they clash with theme.

- [ ] **Step 3: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds. Component is not yet rendered anywhere — this task only checks the component compiles on its own.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): add ConfigKeyboardPanel (not yet wired)

Container composes one or two KeyboardLayout instances with a shared
toggle bar and owner-frame tints. Not yet rendered in ConfigViewer —
that wiring comes in the next commit.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire ConfigKeyboardPanel into ConfigViewer's right rail

**Goal:** Make the keyboard panel visible in the ConfigViewer when a Binds section is focused. Single view (no compare yet — compare already works from Task 5 because the panel accepts optional compare data, and ConfigViewer already has `compareBinds`).

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:16` — import panel
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:793-886` — insert panel in flex row between content and minimap

- [ ] **Step 1: Import the panel in ConfigViewer**

Open `apps/slipgate-app/src/components/ConfigViewer.tsx`. At line 16, after `import SectionMinimap from "./SectionMinimap";`, add:

```tsx
import ConfigKeyboardPanel from "./ConfigKeyboardPanel";
```

- [ ] **Step 2: Add a memo for panel visibility**

In the signals section of ConfigViewer, around the existing `isCompareMode` (line 184), add a new memo:

```tsx
  const isBindsSectionFocused = createMemo(() => {
    const row2 = activeRow2();
    return row2.has("weapons:binds") || row2.has("teamplay:binds") || row2.has("movement:binds");
  });
```

Place this right after `const isCompareMode = () => compareCvars().size > 0;` at line 184.

- [ ] **Step 3: Insert the panel in the JSX**

Find the block at ConfigViewer.tsx:793-886:

```tsx
              {/* ── Content + minimap ── */}
              <div class="flex-1 flex overflow-hidden">
              <div class="sg-content-scroll flex-1 overflow-y-auto relative pt-1" ref={setContentScrollEl}>
                ...all the Show blocks for content sections...
              </div>
              <SectionMinimap scrollContainer={contentScrollEl} />
              </div>
```

Insert a new `<Show>` block between the scroll-content closing `</div>` (line 884) and the `<SectionMinimap>` element (line 885). The result should read:

```tsx
              <div class="flex-1 flex overflow-hidden">
              <div class="sg-content-scroll flex-1 overflow-y-auto relative pt-1" ref={setContentScrollEl}>
                ...existing content...
              </div>
              <Show when={isBindsSectionFocused()}>
                <ConfigKeyboardPanel
                  primary={effectiveConfig()}
                  compare={isCompareMode() ? compareBinds() : null}
                  compareName={isCompareMode() ? props.compareSource?.primary_chain?.files[0]?.name ?? null : null}
                />
              </Show>
              <SectionMinimap scrollContainer={contentScrollEl} />
              </div>
```

Placement note: the panel sits between the scroll-content column and the minimap column within the existing `flex-1 flex overflow-hidden` row. Its flex sizing comes from the `sg-config-kb-panel` class (`display: flex; flex-direction: column`) — the panel takes the space its content requires and leaves room for the minimap.

- [ ] **Step 4: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 5: Manual check — single view**

In the dev app, load a config and click **Weapons > Binds**. The right side of the content area now shows a keyboard with weapon keys lit up. Toggle **Weapons** off on the panel's toggle bar — weapon keys go dark. Toggle **Movement** on — the W/A/S/D (or equivalent) light up. Click **Teamplay > Binds** — the text list updates, the keyboard stays visible and still honors the toggles. Click **Settings > HUD** (a non-Binds section) — the keyboard panel disappears entirely.

- [ ] **Step 6: Manual check — compare view**

Drop or load a second config to enter compare mode. Click **Weapons > Binds**. The panel should now show **two stacked keyboards** — top tinted blue ("You"), bottom tinted orange with the compare filename as the label. Both respect the shared toggle bar.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigViewer.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): render ConfigKeyboardPanel in Binds sections

Shows a keyboard (or two stacked keyboards in compare mode) next to
the bind text list whenever Weapons/Teamplay/Movement > Binds is
focused in the sidebar.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Persist the "Show keyboard" pref and add the hide toggle

**Goal:** Add a persisted user preference to hide/show the keyboard panel entirely. Defaults to visible. Survives app restart. Adds the toggle control to the top of the panel.

**Files:**
- Modify: `apps/slipgate-app/src/store.ts:58-60, 113-115` — extend `ProfilePrefs` + defaults
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` — accept visibility prop (pulled up to ConfigViewer which owns profile)
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx` — wire pref + hide button

- [ ] **Step 1: Extend ProfilePrefs**

Open `apps/slipgate-app/src/store.ts`. Replace the `ProfilePrefs` interface at line 58:

```ts
export interface ProfilePrefs {
  map_backdrop: string;
  config_keyboard_visible: boolean;
}
```

Replace `DEFAULT_PREFS` at line 113:

```ts
const DEFAULT_PREFS: ProfilePrefs = {
  map_backdrop: "dm3",
  config_keyboard_visible: true,
};
```

Because profile.json may have been written by older versions without these fields, also check that `loadProfile` (around line 150-230, not fully shown) merges defaults on missing fields. If the existing `loadProfile` already spreads `DEFAULT_PREFS` when loading, no change needed. If it doesn't, add a merge step: look for the spot where `prefs` is reconstructed from the loaded JSON and change it from `loaded.prefs ?? DEFAULT_PREFS` to `{ ...DEFAULT_PREFS, ...(loaded.prefs ?? {}) }`. Verify by reading the `loadProfile` function in `store.ts` before editing.

- [ ] **Step 2: Accept visibility props in ConfigKeyboardPanel**

Open `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`. Extend the `ConfigKeyboardPanelProps` interface:

```ts
interface ConfigKeyboardPanelProps {
  primary: EzQuakeConfig | null;
  compare?: ChainBindClassification | null;
  compareName?: string | null;
  /** When false, the panel renders only the "show keyboard" toggle collapsed. */
  visible: boolean;
  onToggleVisible: () => void;
}
```

Replace the entire `return (...)` block in `ConfigKeyboardPanel` with this visibility-aware version:

```tsx
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
            />
          </div>
        </Show>
      </Show>
    </div>
  );
```

- [ ] **Step 3: Add collapsed + header styles to app.css**

Append to `apps/slipgate-app/src/app.css`:

```css
.sg-config-kb-header {
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 0;
}

.sg-config-kb-panel-collapsed {
  min-width: auto;
  max-width: 6rem;
}
```

- [ ] **Step 4: Wire the pref in ConfigViewer**

Open `apps/slipgate-app/src/components/ConfigViewer.tsx`.

At the top, add an import for the update helper (if not already imported):

```tsx
import { updatePrefs } from "../store";
```

Check where the component accesses `profile` (it should already receive profile-related props through app state — look for an existing `props.profile` or similar around the component signature at line 96-100). If it does not currently have profile access, route `profile` from App.tsx. Inspect `src/App.tsx` for how Profile tab receives `profile={profile()}` and add the same pattern for ConfigViewer's JSX invocation.

Add a local signal that mirrors the pref and updates in both directions:

```tsx
  const [keyboardVisible, setKeyboardVisible] = createSignal<boolean>(
    props.profile?.prefs.config_keyboard_visible ?? true,
  );
  createEffect(() => {
    const p = props.profile?.prefs.config_keyboard_visible;
    if (p !== undefined) setKeyboardVisible(p);
  });
  async function toggleKeyboardVisible() {
    const next = !keyboardVisible();
    setKeyboardVisible(next);
    try {
      await updatePrefs({ config_keyboard_visible: next });
    } catch (e) {
      console.error("Failed to persist keyboard visibility pref:", e);
    }
  }
```

Update the `<ConfigKeyboardPanel>` JSX invocation from Task 6 to pass the new props:

```tsx
              <Show when={isBindsSectionFocused()}>
                <ConfigKeyboardPanel
                  primary={effectiveConfig()}
                  compare={isCompareMode() ? compareBinds() : null}
                  compareName={isCompareMode() ? props.compareSource?.primary_chain?.files[0]?.name ?? null : null}
                  visible={keyboardVisible()}
                  onToggleVisible={toggleKeyboardVisible}
                />
              </Show>
```

If ConfigViewer does not currently receive `profile` as a prop, add it to `ConfigViewerProps`:

```tsx
interface ConfigViewerProps {
  // ... existing props ...
  profile?: ProfileData | null;
}
```

Import `ProfileData` at the top:

```tsx
import type { ProfileData } from "../store";
```

Then update the `<ConfigViewer>` callsite in `src/App.tsx` to pass `profile={profile()}`.

- [ ] **Step 5: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 6: Manual check**

Open the dev app on a Binds section. A "Hide keyboard" button appears at the top-right of the panel. Click it — the keyboards and toggle bar disappear; a slim "Show keyboard" button remains. Click that — panel restores. Close the app completely and reopen — the hidden state should persist across sessions.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/store.ts apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/App.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): persist ConfigKeyboardPanel show/hide pref

Adds config_keyboard_visible to ProfilePrefs with a header toggle so
users can reclaim horizontal space at 1080p. Survives restart.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Click-to-pin selection — key click lights up both keyboards

**Goal:** Clicking a key on either keyboard identifies the bound command(s), matches by command on the other keyboard, and highlights the matching key(s) on both. Row expansion comes in Task 9.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` — selection state + click handler + selectedKeyIds prop

- [ ] **Step 1: Add selection state and click logic**

Open `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`. Add the import for the new helpers at the top:

```tsx
import { buildKeyHighlights, resolveCommandKeys, identifyKeyCommands, type HighlightInput, type HighlightToggles, type KeyCommandMatch } from "./keyboardHighlights";
```

Inside the component body, add selection state:

```tsx
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
      // Clicked an unbound key — clear selection
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
```

Pass the click handler and selected IDs into each `<KeyboardLayout>` invocation:

```tsx
          <KeyboardLayout
            movement={props.primary!.movement}
            highlights={primaryHighlights()}
            showMovement={showMovement()}
            onKeyClick={(id) => handleKeyClick(primaryInput(), id)}
            selectedKeyIds={yourSelectedIds()}
          />
```

```tsx
          <KeyboardLayout
            movement={props.compare!.movement}
            highlights={compareHighlights()}
            showMovement={showMovement()}
            onKeyClick={(id) => handleKeyClick(compareInput(), id)}
            selectedKeyIds={theirSelectedIds()}
          />
```

Add an Escape handler. Above the `return` in the component:

```tsx
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && selection() !== null) setSelection(null);
    });
  }
```

(Fine for v1. If it causes test or lifecycle issues, move to a proper `createEffect`/`onCleanup` pair.)

- [ ] **Step 2: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 3: Manual check — single view**

Single config loaded (no compare). Click a weapon key on the keyboard (e.g. the key bound to RL). It should get a bright neon frame. Click the same key again — frame clears. Click a different weapon key — frame moves to the new key. Click an unbound key — frame clears.

- [ ] **Step 4: Manual check — compare view**

Load a compare config where you and the opponent both bind the same weapon to DIFFERENT keys (e.g. both have `+attack` but your RL is on 4, theirs is on F3). Click your 4 key. **Both** 4 on your keyboard **and** F3 on theirs should light up. Click a key that only you have bound — only your key lights up, theirs stays dark. Click a key that only they have bound — only their key lights up.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): click-to-pin key highlighting across both keyboards

Clicking a key identifies the bound command(s) and lights up matching
keys on the other keyboard, matched by command name (not position).
Click-again or Escape clears selection.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Click-to-pin — expand matching rows in the left text list

**Goal:** Extend click-to-pin so key clicks also expand the matching row in the left text list, and row clicks highlight the matching key on both keyboards. Selection is shared state between the panel and the ConfigViewer.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` — emit selection upward via callback prop
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx` — own the selection, pipe into panel and into bind sections
- Modify: `apps/slipgate-app/src/components/ConfigDomainBinds.tsx` — accept `selectedBindKey` + `onBindKeyClick` props on weapon/teamsay/movement sections, visually mark expanded row

- [ ] **Step 1: Pull selection state up to ConfigViewer**

The cleanest shared state for bidirectional linking is a single `selectedCommand` signal on `ConfigViewer`. Both the keyboard panel and the bind sections read and write it.

In `apps/slipgate-app/src/components/ConfigViewer.tsx`, add near the other signals (around line 140, after `compareFilter`):

```tsx
  // Shared selection for click-to-pin linking between keyboard and bind list.
  // Matched by canonical command identity so both sides agree.
  type BindSelection = { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string } | null;
  const [bindSelection, setBindSelection] = createSignal<BindSelection>(null);
```

- [ ] **Step 2: Change ConfigKeyboardPanel to use an external selection**

Rather than duplicating selection inside the panel, lift it. Open `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`. Replace the Task 8 internal `selection` state with props:

```tsx
interface ConfigKeyboardPanelProps {
  primary: EzQuakeConfig | null;
  compare?: ChainBindClassification | null;
  compareName?: string | null;
  visible: boolean;
  onToggleVisible: () => void;
  /** External selection — when set, keyboards highlight matching keys. */
  selection: { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string } | null;
  onSelectionChange: (sel: { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string } | null) => void;
}
```

Remove the local `selection` / `setSelection` and derive `yourSelectedIds` / `theirSelectedIds` from `props.selection` instead:

```tsx
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
```

Update `handleKeyClick` to call `props.onSelectionChange` instead of the internal setter. Multi-bind handling picks the first match for v1 (Task 10 extends to proper multi-bind):

```tsx
  function handleKeyClick(sideInput: HighlightInput | null, keyId: string) {
    if (!sideInput) return;
    const matches = identifyKeyCommands(sideInput, keyId);
    if (matches.length === 0) {
      props.onSelectionChange(null);
      return;
    }
    const first = matches[0];
    const next: NonNullable<ConfigKeyboardPanelProps["selection"]> =
      first.kind === "weapon"
        ? { kind: "weapon", weapon: first.weapon! }
        : { kind: "teamsay", label: first.label! };
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
```

Remove the Task 8 Escape listener (move to ConfigViewer in Step 4 below).

- [ ] **Step 3: Pipe the selection into the panel from ConfigViewer**

Update the `<ConfigKeyboardPanel>` JSX invocation:

```tsx
              <Show when={isBindsSectionFocused()}>
                <ConfigKeyboardPanel
                  primary={effectiveConfig()}
                  compare={isCompareMode() ? compareBinds() : null}
                  compareName={isCompareMode() ? props.compareSource?.primary_chain?.files[0]?.name ?? null : null}
                  visible={keyboardVisible()}
                  onToggleVisible={toggleKeyboardVisible}
                  selection={bindSelection()}
                  onSelectionChange={setBindSelection}
                />
              </Show>
```

- [ ] **Step 4: Add an Escape-clears-selection effect in ConfigViewer**

Near the existing `onCleanup` for the hover timer (line 146), add:

```tsx
  function handleEscSelection(e: KeyboardEvent) {
    if (e.key === "Escape" && bindSelection() !== null) setBindSelection(null);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEscSelection);
    onCleanup(() => window.removeEventListener("keydown", handleEscSelection));
  }
```

- [ ] **Step 5: Pipe selection into the weapon binds section for visual expansion**

Open `apps/slipgate-app/src/components/ConfigDomainBinds.tsx`. Find `ConfigWeaponBindsSection` and its props interface. Add two optional props:

```ts
interface ConfigWeaponBindsSectionProps {
  // ... existing ...
  selectedWeapon?: string | null;
  onWeaponClick?: (weapon: string) => void;
}
```

Inside the component, when rendering each weapon row (search for the mapping over `primaryBinds`), compute an `isSelected` flag per row:

```tsx
const isSelected = props.selectedWeapon === bind.weapon;
```

Apply a CSS class (add a new one to `app.css` if needed) like `sg-domain-bind-row-selected` that visually emphasizes the row, and wrap the row with an `onClick` that calls `props.onWeaponClick?.(bind.weapon)`. If the existing row layout is not clickable, wrap the row in a `<button class="contents">` so it's both accessible and clickable without breaking grid/flex layout.

Do the same for `ConfigTeamsayBindsSection` with a `selectedLabel` / `onLabelClick` pair, and for `ConfigMovementBindsSection` with `selectedMovement` / `onMovementClick` (movement clicks select movement binds, which for v1 we can map as a teamsay-style match on `forward`/`back`/etc. — or skip movement selection entirely in v1 since movement binds don't have commands, they have directions).

**v1 simplification:** movement binds do not participate in click-to-pin. Movement keys still light up visually when `showMovement` is on, but clicking them does nothing (no row expansion, no cross-highlight). The spec allows this because movement is a baseline-every-player-has-it category, not the main insight target. Revisit in a follow-up if users ask for it.

Concretely, in `ConfigDomainBinds.tsx`'s new `ConfigMovementBindsSection`, do NOT add selection props. In the weapon/teamsay sections, add the props listed above.

Add the new CSS rule to `app.css`:

```css
.sg-domain-bind-row-selected {
  background: color-mix(in oklch, oklch(0.92 0.18 85) 10%, transparent);
  border-left: 3px solid oklch(0.92 0.18 85);
  padding-left: calc(var(--sg-domain-bind-row-padding, 0.5rem) - 3px);
}
```

- [ ] **Step 6: Wire the weapon and teamsay sections to ConfigViewer selection**

Back in `apps/slipgate-app/src/components/ConfigViewer.tsx`, extend the existing weapon-binds and teamsay-binds `Show` blocks:

```tsx
                <Show when={activeRow2().has("weapons:binds")}>
                  <ConfigWeaponBindsSection
                    primaryBinds={primaryWeaponBinds()}
                    compareBinds={compareWeaponBinds()}
                    selectedWeapon={bindSelection()?.kind === "weapon" ? bindSelection()!.weapon : null}
                    onWeaponClick={(w) => {
                      const cur = bindSelection();
                      if (cur && cur.kind === "weapon" && cur.weapon === w) {
                        setBindSelection(null);
                      } else {
                        setBindSelection({ kind: "weapon", weapon: w });
                      }
                    }}
                  />
                </Show>

                <Show when={activeRow2().has("teamplay:binds")}>
                  <ConfigTeamsayBindsSection
                    primaryBinds={primaryTeamsayBinds()}
                    compareBinds={compareTeamsayBinds()}
                    primaryAliases={primaryAliases()}
                    compareAliases={compareAliases()}
                    primaryBindCommands={primaryBindCommands()}
                    compareBindCommands={compareBindCommands()}
                    selectedLabel={bindSelection()?.kind === "teamsay" ? bindSelection()!.label : null}
                    onLabelClick={(l) => {
                      const cur = bindSelection();
                      if (cur && cur.kind === "teamsay" && cur.label === l) {
                        setBindSelection(null);
                      } else {
                        setBindSelection({ kind: "teamsay", label: l });
                      }
                    }}
                  />
                </Show>
```

- [ ] **Step 7: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds. Address any typing issues by narrowing the `bindSelection()` return before passing into subsections (use `createMemo` to pre-narrow if inline narrowing breaks type inference).

- [ ] **Step 8: Manual check — bidirectional linking**

Compare mode. Weapons > Binds section focused.

1. Click the RL row in the left text list. The row should get a left-border + subtle background tint, and the key bound to `rl` on both keyboards should light up with the neon frame.
2. Click the same row again — selection clears.
3. Click a key on the keyboard (e.g. `F3` if that's bound to something). The matching row in the left list should gain the same visual emphasis and scroll into view if it was below the fold.
4. Switch to Teamplay > Binds. Click the "SAFE" row — the keys bound to safe on both keyboards light up.
5. Press Escape — selection clears.
6. Switch to Movement > Binds — clicking rows or movement keys does nothing (v1 simplification).

If the row does not scroll into view when expanded via a keyboard click, that is OK for v1 unless the text list is long enough to actually hide the row. If it's a problem in practice, add `scrollIntoView({ behavior: "smooth", block: "nearest" })` on the selected row element via a `createEffect` in the bind section.

- [ ] **Step 9: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/components/ConfigDomainBinds.tsx apps/slipgate-app/src/app.css && git commit -m "$(cat <<'EOF'
feat(slipgate): bidirectional click-to-pin between keyboard and bind list

Selection state lifted to ConfigViewer. Clicking a key expands the
matching weapon/teamsay row in the left list; clicking a row
highlights the matching keys on both keyboards. Escape clears.
Movement binds do not participate in selection for v1.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Multi-bind key handling (modifier combos)

**Goal:** When a key participates in a modifier combo (e.g. `F` = safe, `Ctrl+F` = lost), clicking `F` highlights both `F` and `Ctrl` on the keyboard and expands BOTH rows in the left list.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` — return multi-match selection upward
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx` — widen `bindSelection` to accept arrays

- [ ] **Step 1: Widen the bind selection type**

Open `apps/slipgate-app/src/components/ConfigViewer.tsx`. Replace the `BindSelection` type from Task 9 with:

```tsx
  type BindSelectionItem = { kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string };
  type BindSelection = BindSelectionItem[] | null;
  const [bindSelection, setBindSelection] = createSignal<BindSelection>(null);
```

Update the `selected*` helpers for the bind sections to check "any item in the selection matches":

```tsx
  function isWeaponSelected(weapon: string): boolean {
    const sel = bindSelection();
    return !!sel && sel.some((s) => s.kind === "weapon" && s.weapon === weapon);
  }
  function isLabelSelected(label: string): boolean {
    const sel = bindSelection();
    return !!sel && sel.some((s) => s.kind === "teamsay" && s.label === label);
  }
```

Update the `<ConfigWeaponBindsSection>` prop:

```tsx
                    selectedWeapon={null /* legacy */}
                    isWeaponSelected={isWeaponSelected}
                    onWeaponClick={(w) => {
                      if (isWeaponSelected(w)) setBindSelection(null);
                      else setBindSelection([{ kind: "weapon", weapon: w }]);
                    }}
```

(And similarly for `<ConfigTeamsayBindsSection>`.)

In `apps/slipgate-app/src/components/ConfigDomainBinds.tsx`, change `selectedWeapon` / `selectedLabel` props to `isWeaponSelected` / `isLabelSelected` predicates:

```ts
interface ConfigWeaponBindsSectionProps {
  // ...
  isWeaponSelected?: (weapon: string) => boolean;
  onWeaponClick?: (weapon: string) => void;
}
```

Inside the component, compute `isSelected` per row as `props.isWeaponSelected?.(bind.weapon) ?? false`.

- [ ] **Step 2: Update ConfigKeyboardPanel to emit array selections**

Open `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`. Change the `selection` / `onSelectionChange` props to accept arrays:

```ts
interface ConfigKeyboardPanelProps {
  // ...
  selection: Array<{ kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string }> | null;
  onSelectionChange: (sel: Array<{ kind: "weapon"; weapon: string } | { kind: "teamsay"; label: string }> | null) => void;
}
```

Update `handleKeyClick` to send ALL matches and, for teamsay modifier combos, to ALSO include the modifier key in the selected ID sets:

```tsx
  function handleKeyClick(sideInput: HighlightInput | null, keyId: string) {
    if (!sideInput) return;
    const matches = identifyKeyCommands(sideInput, keyId);
    if (matches.length === 0) {
      props.onSelectionChange(null);
      return;
    }
    // Normalize to the prop shape
    const normalized = matches.flatMap<NonNullable<ConfigKeyboardPanelProps["selection"]>[number]>((m) => {
      if (m.kind === "weapon" && m.weapon) return [{ kind: "weapon", weapon: m.weapon }];
      if (m.kind === "teamsay" && m.label) return [{ kind: "teamsay", label: m.label }];
      return [];
    });
    // Click-again-to-dismiss
    const cur = props.selection;
    if (cur && cur.length === normalized.length && cur.every((c, i) =>
      c.kind === normalized[i].kind &&
      (c as any).weapon === (normalized[i] as any).weapon &&
      (c as any).label === (normalized[i] as any).label
    )) {
      props.onSelectionChange(null);
      return;
    }
    props.onSelectionChange(normalized);
  }
```

Update the `yourSelectedIds` / `theirSelectedIds` memos to iterate over the array and additionally include modifier layout IDs (`Ctrl`, `Shift`, `Alt`) when a matched bind is a combo. First ensure `toLayoutId` is imported at the top of the file (it should already be imported for other uses, otherwise add):

```tsx
import { toLayoutId } from "./KeyboardLayout";
```

Then update the memos:

```tsx
  const yourSelectedIds = createMemo<Set<string>>(() => {
    const sel = props.selection;
    const input = primaryInput();
    if (!sel || !input) return new Set();
    const ids = new Set<string>();
    for (const s of sel) {
      for (const id of resolveCommandKeys(input, s)) ids.add(id);
    }
    // Include modifier keys for teamsay modifier combos
    for (const s of sel) {
      if (s.kind !== "teamsay") continue;
      for (const tb of input.teamsay_binds) {
        if (tb.label !== s.label) continue;
        if (!tb.key.includes("+")) continue;
        const parts = tb.key.split("+").map(p => p.trim());
        for (const mod of parts.slice(0, -1)) {
          const layoutId = toLayoutId(mod);
          if (layoutId) ids.add(layoutId);
        }
      }
    }
    return ids;
  });
```

Mirror the same change to `theirSelectedIds` (iterate `compareInput().teamsay_binds`).

- [ ] **Step 3: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 4: Manual check — multi-bind**

Load a config that has a modifier combo teamsay bind. If the current test configs don't have one, craft a small `multibind.cfg` with:

```
bind f "safe"
bind ctrl+f "lost"
```

Load it as the primary. Click Teamplay > Binds. Click the `F` key on the keyboard. Both `F` and `Ctrl` should light up. The safe AND lost rows should both get the selected styling on the left. Click `F` again — selection clears.

Regression: click a plain (non-combo) bind like just `f` → safe. Only `F` lights up. `Ctrl` stays dark.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/components/ConfigDomainBinds.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): multi-bind click-to-pin for modifier combos

Clicking a key that participates in multiple binds (e.g. F = safe,
Ctrl+F = lost) highlights both the key and its modifier and expands
all matching rows.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Persist Movement/Weapons/Teamplay toggle state across sessions

**Goal:** The three panel toggles move from local signals into `ProfilePrefs` so they survive restart.

**Files:**
- Modify: `apps/slipgate-app/src/store.ts` — extend `ProfilePrefs` + defaults
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` — drive toggles from props, not local signals
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx` — own toggle state, update pref on change

- [ ] **Step 1: Extend ProfilePrefs**

Open `apps/slipgate-app/src/store.ts`. Update `ProfilePrefs`:

```ts
export interface ProfilePrefs {
  map_backdrop: string;
  config_keyboard_visible: boolean;
  config_keyboard_show_movement: boolean;
  config_keyboard_show_weapons: boolean;
  config_keyboard_show_teamplay: boolean;
}
```

Update `DEFAULT_PREFS`:

```ts
const DEFAULT_PREFS: ProfilePrefs = {
  map_backdrop: "dm3",
  config_keyboard_visible: true,
  config_keyboard_show_movement: true,
  config_keyboard_show_weapons: true,
  config_keyboard_show_teamplay: true,
};
```

Verify `loadProfile` still merges defaults on missing fields (same concern as Task 7 Step 1).

- [ ] **Step 2: Lift toggles out of ConfigKeyboardPanel**

Open `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`. Remove the local `showMovement` / `showWeapons` / `showTeamplay` signals. Add props:

```ts
interface ConfigKeyboardPanelProps {
  // ... existing ...
  showMovement: boolean;
  showWeapons: boolean;
  showTeamplay: boolean;
  onToggleMovement: () => void;
  onToggleWeapons: () => void;
  onToggleTeamplay: () => void;
}
```

Replace every reference to `showMovement()` with `props.showMovement`, every `setShowMovement(v => !v)` with `props.onToggleMovement()`, and same for weapons/teamplay. Update the toggles memo accordingly.

- [ ] **Step 3: Drive the pref from ConfigViewer**

In `apps/slipgate-app/src/components/ConfigViewer.tsx`, add three local signals mirroring the pref + a generic toggle helper:

```tsx
  const [kbShowMovement, setKbShowMovement] = createSignal<boolean>(
    props.profile?.prefs.config_keyboard_show_movement ?? true,
  );
  const [kbShowWeapons, setKbShowWeapons] = createSignal<boolean>(
    props.profile?.prefs.config_keyboard_show_weapons ?? true,
  );
  const [kbShowTeamplay, setKbShowTeamplay] = createSignal<boolean>(
    props.profile?.prefs.config_keyboard_show_teamplay ?? true,
  );
  createEffect(() => {
    const p = props.profile?.prefs;
    if (!p) return;
    setKbShowMovement(p.config_keyboard_show_movement);
    setKbShowWeapons(p.config_keyboard_show_weapons);
    setKbShowTeamplay(p.config_keyboard_show_teamplay);
  });

  async function toggleKbMovement() {
    const next = !kbShowMovement();
    setKbShowMovement(next);
    try { await updatePrefs({ config_keyboard_show_movement: next }); }
    catch (e) { console.error("Failed to persist kb movement toggle:", e); }
  }
  async function toggleKbWeapons() {
    const next = !kbShowWeapons();
    setKbShowWeapons(next);
    try { await updatePrefs({ config_keyboard_show_weapons: next }); }
    catch (e) { console.error("Failed to persist kb weapons toggle:", e); }
  }
  async function toggleKbTeamplay() {
    const next = !kbShowTeamplay();
    setKbShowTeamplay(next);
    try { await updatePrefs({ config_keyboard_show_teamplay: next }); }
    catch (e) { console.error("Failed to persist kb teamplay toggle:", e); }
  }
```

Pass the props into the panel:

```tsx
                <ConfigKeyboardPanel
                  primary={effectiveConfig()}
                  compare={isCompareMode() ? compareBinds() : null}
                  compareName={isCompareMode() ? props.compareSource?.primary_chain?.files[0]?.name ?? null : null}
                  visible={keyboardVisible()}
                  onToggleVisible={toggleKeyboardVisible}
                  selection={bindSelection()}
                  onSelectionChange={setBindSelection}
                  showMovement={kbShowMovement()}
                  showWeapons={kbShowWeapons()}
                  showTeamplay={kbShowTeamplay()}
                  onToggleMovement={toggleKbMovement}
                  onToggleWeapons={toggleKbWeapons}
                  onToggleTeamplay={toggleKbTeamplay}
                />
```

- [ ] **Step 4: Typecheck + build**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app && bunx tsc --noEmit && bun run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 5: Manual check — persistence**

Open the dev app, focus Weapons > Binds. Toggle Movement OFF in the panel toggle bar. Fully close the app and reopen. Focus Weapons > Binds again. Movement should still be OFF. Repeat for Weapons and Teamplay.

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/slipgate-app/src/store.ts apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx && git commit -m "$(cat <<'EOF'
feat(slipgate): persist ConfigKeyboardPanel toggle state to ProfilePrefs

Movement/Weapons/Teamplay toggles now survive app restart.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Final verification against the spec's success criteria

**Goal:** Walk the full spec success-criteria list and confirm each one passes in the running dev app. This task is not "write code" — it is "prove the feature works end-to-end." Fixes found during this pass should be one-off commits with clear messages.

- [ ] **Step 1: Checklist run, single view**

Single config loaded, no compare.

- [ ] Focus Weapons > Binds — one keyboard appears on the right with weapon keys lit, toggles show Movement/Weapons/Teamplay as independent badges.
- [ ] Toggle Movement off — W/A/S/D go dark. Toggle back on — they light up.
- [ ] Toggle Weapons off — weapon keys go dark. Teamplay keys (if any) remain lit if Teamplay is on.
- [ ] Click an unbound key — selection stays clear, no errors in console.
- [ ] Click a weapon key (e.g. the key for RL) — the key gets a neon frame, the RL row in the left list gains selected styling.
- [ ] Click the same key again — selection clears.
- [ ] Click the RL row in the left list — same behavior from the reverse direction.
- [ ] Press Escape with a selection active — clears.
- [ ] Click "Hide keyboard" — panel collapses to a slim button. Click "Show keyboard" — panel restores.
- [ ] Focus Settings > HUD (a non-Binds section) — panel disappears entirely (regardless of Hide/Show state).

- [ ] **Step 2: Checklist run, compare view**

Load a second config via drag-drop or the compare UI.

- [ ] Focus Weapons > Binds — two stacked keyboards appear, top has blue tint + "You" label, bottom has orange tint + the compare filename.
- [ ] Both keyboards honor the shared toggle bar — toggling Teamplay affects both simultaneously.
- [ ] Find a weapon both players bind to DIFFERENT keys (if none exist in the test configs, craft a minimal compare.cfg that binds RL to a different key). Click that key on your keyboard — your key AND the corresponding key on their keyboard both light up; the RL row expands.
- [ ] Click a key that only one side has bound — only that side's key lights up; the other stays dark. Row expansion still happens on the side that has the bind.
- [ ] Switch the compare filter tab to "Different" then "Only yours" — click-to-pin still works even when the target row is hidden by the filter (spec: the click is authoritative).

- [ ] **Step 3: Checklist run, multi-bind**

Load the `multibind.cfg` test (or craft one per Task 10 Step 4).

- [ ] Click the `F` key — both `F` and `Ctrl` light up; both safe and lost rows get selected styling.
- [ ] Click one of the two rows — the same key + modifier light up; the OTHER row also gains selected styling (because both rows map to the same key).
- [ ] Escape clears everything.

- [ ] **Step 4: Checklist run, 1080p**

Resize the window to 1920x1080 or run on a 1080p display. Focus Weapons > Binds in compare mode.

- [ ] Two stacked keyboards fit in the right panel without overlapping the left text list.
- [ ] If horizontal space is genuinely cramped, use the "Hide keyboard" toggle and confirm the text list reclaims the full width.
- [ ] No visual breakage (clipped labels, overlapping keyboards, broken border radii).

- [ ] **Step 5: Regression check — Profile unchanged**

Open the Profile tab. Toggle every combination of Movement/Weapons/Teamplay. Verify the keyboard looks identical to pre-plan behavior — same colors, same labels, same mouse highlights. If anything differs, open a fix commit referencing the extraction in Task 4.

- [ ] **Step 6: If everything passes, final commit (empty or a fix roll-up)**

If Steps 1-5 revealed fixes, commit them with a clear message like:

```bash
cd /home/paradoks/projects/quakeworld && git add -p && git commit -m "$(cat <<'EOF'
fix(slipgate): <specific issue found during verification>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no fixes were needed, no commit required. Report success to the user.

---

## Self-Review Notes

**Spec coverage:**

- Single view keyboard panel — Task 6
- Compare view with stacked keyboards + owner tint + labels — Task 5 (panel shell) + Task 6 (wiring)
- Toggle bar (Movement/Weapons/Teamplay, independent, one set controls both in compare) — Task 5 (local) + Task 11 (persisted)
- Show keyboard pref — Task 7
- Movement > Binds sidebar + content section — Tasks 1-2
- KeyboardLayout reuse — Task 3 (extend) + Task 4 (extract helpers) + Task 5 (compose)
- Click-to-pin, bidirectional, command-matched — Tasks 8-9
- Multi-bind key handling — Task 10
- Command-bound-on-one-side behavior — falls out naturally from Task 8's matching logic (covered in Task 12 Step 2)
- Dismiss behavior (click again, Escape, click empty area) — Tasks 8-9 (click-again and Escape); click-empty-area is not explicitly wired as v1 simplification. Added to non-goals retroactively if it becomes an issue.
- Orientation cues — Task 5 (frame tints) + labels in Task 5
- Profile regression — Tasks 3-4 + Task 12 Step 5

**Placeholder scan:** no "TBD" / "implement later" strings. Every code step contains actual code.

**Type consistency:** `BindSelection` type changes from a scalar to an array in Task 10 — the refactor is explicit, not silent. `ProfilePrefs` grows in Tasks 7 and 11 — both tasks show the full new interface. `ConfigKeyboardPanelProps` evolves across Tasks 5, 7, 8, 10, 11 — each evolution shows the full new interface.

**Plan size check:** 12 tasks, most with 4-7 small steps. Each task produces a committable, typecheck-clean, visibly testable increment. Estimated 3-5 minutes per step on average.

---

## Execution Handoff

**Plan complete and saved to** `apps/slipgate-app/docs/superpowers/plans/2026-04-14-config-viewer-keyboard-panel.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review the diff between tasks, fast iteration. Best for long plans and when you want to catch regressions before they compound.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review. Faster but uses more of the main conversation context.

**Which approach?**
