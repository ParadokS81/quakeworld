# Config Viewer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the config viewer with clean rows (name + value only), a hover tooltip, click-to-expand, and compare mode merged into the main list view.

**Architecture:** Rewrite CvarRow as a minimal grid row. Create a new CvarTooltip component for hover/expand. Add compare state and paste UI to ConfigViewer. Delete ConfigCompare after merging its filtering logic. All components are SolidJS with Tailwind/DaisyUI.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS 4, DaisyUI 5, qw-config package

**Spec:** `docs/superpowers/specs/2026-04-02-config-viewer-redesign.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/CvarRow.tsx` | Rewrite | Minimal grid row: name + value (+ optional compare value) |
| `src/components/CvarTooltip.tsx` | Create | Shared tooltip/detail content: description, metadata, values |
| `src/components/ConfigViewer.tsx` | Modify | Add compare state, compare filters, tooltip hover logic, paste UI |
| `src/components/ConfigCompare.tsx` | Delete | Functionality absorbed into ConfigViewer |
| `src/components/CvarDetail.tsx` | Delete | Replaced by CvarTooltip |

All paths relative to `apps/slipgate-app/`.

---

### Task 1: Rewrite CvarRow as a clean grid row

**Files:**
- Rewrite: `src/components/CvarRow.tsx`

- [ ] **Step 1: Rewrite CvarRow**

Replace the entire contents of `src/components/CvarRow.tsx` with:

```tsx
import { Show } from "solid-js";
import type { CvarInfo } from "qw-config";

interface CvarRowProps {
  name: string;
  value: string;
  compareValue?: string;
  info: CvarInfo | undefined;
  isExpanded: boolean;
  isCompareMode: boolean;
  onToggle: () => void;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: () => void;
}

export default function CvarRow(props: CvarRowProps) {
  const isChanged = () => {
    if (!props.info?.default) return false;
    return props.value !== props.info.default;
  };

  const isDiff = () =>
    props.compareValue !== undefined && props.value !== props.compareValue;

  const isOnlyLeft = () => props.isCompareMode && props.compareValue === undefined;
  const isOnlyRight = () => false; // "only right" rows are handled separately

  return (
    <div
      class={`grid text-sm cursor-pointer transition-colors border-b border-[var(--sg-stat-border)]
        hover:bg-[color-mix(in_oklch,var(--sg-stat-border)_20%,transparent)]
        ${props.isExpanded ? "bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)]" : ""}
        ${isDiff() ? "bg-[color-mix(in_oklch,var(--color-warning)_5%,transparent)]" : ""}
        ${!isChanged() && props.info ? "opacity-45" : ""}
        ${isOnlyLeft() ? "opacity-60" : ""}
      `}
      style={{
        "grid-template-columns": props.isCompareMode ? "240px 1fr 1fr" : "280px 1fr",
      }}
      onClick={props.onToggle}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {/* Cvar name */}
      <span
        class={`px-4 py-1.5 font-mono truncate ${
          isChanged() ? "text-[var(--color-primary)]" : "text-[var(--sg-text-dim)]"
        }`}
        title={props.name}
      >
        {props.name}
      </span>

      {/* Your value */}
      <span
        class={`px-3 py-1.5 font-mono truncate ${
          isDiff()
            ? "text-[var(--color-warning)] font-semibold"
            : isChanged()
              ? "text-[var(--sg-text-bright)] font-semibold"
              : "text-[var(--sg-text-dim)]"
        }`}
        title={props.value}
      >
        {props.value}
      </span>

      {/* Compare value (only in compare mode) */}
      <Show when={props.isCompareMode}>
        <span
          class={`px-3 py-1.5 font-mono truncate border-l border-[var(--sg-stat-border)] ${
            props.compareValue === undefined
              ? "text-[var(--sg-section-label)] italic"
              : isDiff()
                ? "text-[var(--color-success)] font-semibold"
                : "text-[var(--sg-text-dim)]"
          }`}
        >
          {props.compareValue ?? "—"}
        </span>
      </Show>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors in CvarRow**

Run: `cd apps/slipgate-app && bunx tsc --noEmit 2>&1 | grep CvarRow`
Expected: may show errors in ConfigViewer where CvarRow is consumed (props changed) — that's expected, we fix it in Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/components/CvarRow.tsx
git commit -m "Rewrite CvarRow as clean name + value grid row"
```

---

### Task 2: Create CvarTooltip component

**Files:**
- Create: `src/components/CvarTooltip.tsx`

This component renders the tooltip/detail content used for both hover and expanded views.

- [ ] **Step 1: Create CvarTooltip.tsx**

```tsx
import { Show } from "solid-js";
import { findEquivalent } from "qw-config";
import type { CvarInfo } from "qw-config";

interface CvarTooltipProps {
  name: string;
  value: string;
  compareValue?: string;
  info: CvarInfo | undefined;
  /** "tooltip" = absolutely positioned below row, "expanded" = inline in document flow */
  mode: "tooltip" | "expanded";
}

export default function CvarTooltip(props: CvarTooltipProps) {
  const fteEquivalent = () => findEquivalent(props.name, "ezquake", "fte");
  const qwclEquivalent = () => findEquivalent(props.name, "ezquake", "qwcl");

  const isChanged = () => props.info?.default !== undefined && props.value !== props.info.default;

  return (
    <div
      class={`text-xs ${
        props.mode === "tooltip"
          ? "absolute left-3 right-auto z-30 mt-0 shadow-lg"
          : "mx-3 my-1"
      }`}
      style={{ "max-width": "480px" }}
    >
      <div class="bg-[var(--sg-stat-bg)] border border-[var(--sg-stat-border)] rounded-md p-3 shadow-lg">
        {/* Header: name + category */}
        <div class="flex justify-between items-baseline gap-4 mb-1.5">
          <span class="font-mono font-semibold text-[var(--color-primary)] text-sm truncate">
            {props.name}
          </span>
          <Show when={props.info?.category}>
            <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0">
              {props.info!.category}
              <Show when={props.info!.group}>
                {" "}› {props.info!.group}
              </Show>
            </span>
          </Show>
        </div>

        {/* Description */}
        <Show when={props.info?.description}>
          <p class="text-[var(--sg-text-dim)] leading-relaxed mb-2 text-xs" style={{ "font-family": "var(--font-sans, sans-serif)" }}>
            {props.info!.description}
          </p>
        </Show>

        {/* Remarks */}
        <Show when={props.info?.remarks}>
          <p class="text-[var(--sg-section-label)] leading-relaxed mb-2 text-[11px] whitespace-pre-wrap">
            {props.info!.remarks}
          </p>
        </Show>

        {/* Metadata grid */}
        <div class="grid gap-x-4 gap-y-1 border-t border-[var(--sg-stat-border)] pt-2 mt-1"
          style={{ "grid-template-columns": props.compareValue !== undefined ? "1fr 1fr 1fr" : "1fr 1fr" }}
        >
          <div>
            <span class="text-[var(--sg-section-label)]">Yours</span>
            <span class={`font-mono ml-2 ${isChanged() ? "text-[var(--sg-text-bright)] font-semibold" : "text-[var(--sg-text-dim)]"}`}>
              {props.value}
            </span>
          </div>

          <Show when={props.compareValue !== undefined}>
            <div>
              <span class="text-[var(--sg-section-label)]">Theirs</span>
              <span class={`font-mono ml-2 ${props.compareValue !== props.value ? "text-[var(--color-success)] font-semibold" : "text-[var(--sg-text-dim)]"}`}>
                {props.compareValue}
              </span>
            </div>
          </Show>

          <div>
            <span class="text-[var(--sg-section-label)]">Default</span>
            <span class="font-mono ml-2 text-[var(--sg-text-dim)]">
              {props.info?.default ?? "—"}
            </span>
          </div>

          <div>
            <span class="text-[var(--sg-section-label)]">Type</span>
            <span class="ml-2 text-[var(--sg-text-dim)]">
              {props.info?.type ?? "—"}
            </span>
          </div>

          <Show when={fteEquivalent()}>
            <div>
              <span class="text-[var(--sg-section-label)]">FTE</span>
              <span class="font-mono ml-2 text-[var(--sg-text-dim)]">{fteEquivalent()}</span>
            </div>
          </Show>

          <Show when={qwclEquivalent()}>
            <div>
              <span class="text-[var(--sg-section-label)]">QWCL</span>
              <span class="font-mono ml-2 text-[var(--sg-text-dim)]">{qwclEquivalent()}</span>
            </div>
          </Show>
        </div>

        {/* Enum values (if present) */}
        <Show when={props.info?.values && props.info!.values!.length > 0}>
          <div class="border-t border-[var(--sg-stat-border)] pt-2 mt-2">
            <p class="text-[var(--sg-section-label)] font-semibold uppercase tracking-wide mb-1 text-[10px]">Values</p>
            <div class="flex flex-col gap-0.5">
              {props.info!.values!.map((v) => (
                <div class="flex gap-2">
                  <span class={`font-mono w-8 flex-shrink-0 ${props.value === v.name ? "text-[var(--color-primary)] font-bold" : "text-[var(--sg-text-dim)]"}`}>
                    {v.name}{props.value === v.name ? " ✓" : ""}
                  </span>
                  <span class="text-[var(--sg-text-dim)]">{v.description}</span>
                </div>
              ))}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && bunx tsc --noEmit 2>&1 | grep CvarTooltip`
Expected: no errors for CvarTooltip itself

- [ ] **Step 3: Commit**

```bash
git add src/components/CvarTooltip.tsx
git commit -m "Create CvarTooltip component for hover and expanded views"
```

---

### Task 3: Rewrite ConfigViewer with compare integration and tooltip

**Files:**
- Rewrite: `src/components/ConfigViewer.tsx`

This is the big task. It rewrites ConfigViewer to:
- Use the new CvarRow (with compare column)
- Add hover tooltip with delay
- Add compare state (paste UI, second column, compare filter pills)
- Keep all existing functionality (category multi-select, hide defaults, search, convert)

- [ ] **Step 1: Rewrite ConfigViewer.tsx**

Replace the entire contents of `src/components/ConfigViewer.tsx` with:

```tsx
import { createSignal, createMemo, For, Show, Switch, Match, onCleanup } from "solid-js";
import { lookupCvar, parseConfig } from "qw-config";
import type { CvarInfo } from "qw-config";
import type { EzQuakeConfig } from "../types";
import CvarRow from "./CvarRow";
import CvarTooltip from "./CvarTooltip";
import ConfigConverter from "./ConfigConverter";

interface ConfigViewerProps {
  config: EzQuakeConfig | null;
  exePath: string | null;
  configName: string | null;
}

type ViewMode = "list" | "convert";
type CompareFilter = "all" | "diff" | "same" | "only_left" | "only_right";

interface EnrichedCvar {
  name: string;
  value: string;
  info: CvarInfo | undefined;
}

export default function ConfigViewer(props: ConfigViewerProps) {
  const [viewMode, setViewMode] = createSignal<ViewMode>("list");
  const [activeCategories, setActiveCategories] = createSignal<Set<string>>(new Set(["__all__"]));
  const [hideDefaults, setHideDefaults] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [expandedCvar, setExpandedCvar] = createSignal<string | null>(null);
  const [configExpanded, setConfigExpanded] = createSignal(false);

  // Compare state
  const [compareText, setCompareText] = createSignal("");
  const [compareActive, setCompareActive] = createSignal(false);
  const [showPasteUI, setShowPasteUI] = createSignal(false);
  const [compareFilter, setCompareFilter] = createSignal<CompareFilter>("all");

  // Tooltip hover state
  const [hoveredCvar, setHoveredCvar] = createSignal<string | null>(null);
  const [tooltipTarget, setTooltipTarget] = createSignal<HTMLElement | null>(null);
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => { if (hoverTimer) clearTimeout(hoverTimer); });

  function handleMouseEnter(name: string, e: MouseEvent) {
    if (expandedCvar() === name) return; // don't tooltip if expanded
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      setHoveredCvar(name);
      setTooltipTarget(e.currentTarget as HTMLElement);
    }, 200);
  }

  function handleMouseLeave() {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    setHoveredCvar(null);
    setTooltipTarget(null);
  }

  // Compare config parsing
  const compareCvars = createMemo((): Map<string, string> => {
    if (!compareActive()) return new Map();
    const text = compareText().trim();
    if (!text) return new Map();
    const parsed = parseConfig(text);
    return new Map(parsed.cvars);
  });

  const isCompareMode = () => compareActive() && compareCvars().size > 0;

  // Build enriched cvar list
  const enrichedCvars = createMemo(() => {
    if (!props.config) return [];
    const leftKeys = Object.keys(props.config.raw_cvars);
    const rightKeys = isCompareMode() ? Array.from(compareCvars().keys()) : [];
    const allKeys = Array.from(new Set([...leftKeys, ...rightKeys])).sort();

    return allKeys.map((name) => {
      const info = lookupCvar(name);
      const value = props.config!.raw_cvars[name] ?? undefined;
      const compareValue = isCompareMode() ? compareCvars().get(name) : undefined;
      return { name, value: value ?? "", info, hasLeft: value !== undefined, compareValue };
    });
  });

  // Category counts
  const categories = createMemo(() => {
    const counts = new Map<string, number>();
    for (const { info } of enrichedCvars()) {
      const cat = info?.category ?? "Unknown";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  });

  const allCategoryNames = createMemo(() => categories().map(([cat]) => cat));

  const isAllSelected = createMemo(() => {
    const active = activeCategories();
    return active.has("__all__") || allCategoryNames().every(c => active.has(c));
  });

  function toggleCategory(cat: string) {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has("__all__")) {
        next.delete("__all__");
        for (const c of allCategoryNames()) next.add(c);
        next.delete(cat);
        return next;
      }
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
        if (allCategoryNames().every(c => next.has(c))) next.add("__all__");
      }
      return next;
    });
  }

  function toggleAll() {
    if (isAllSelected()) {
      setActiveCategories(new Set<string>());
    } else {
      setActiveCategories(new Set<string>(["__all__"]));
    }
  }

  // Compare filter counts
  const compareCounts = createMemo(() => {
    if (!isCompareMode()) return { diff: 0, same: 0, onlyLeft: 0, onlyRight: 0 };
    const cvars = enrichedCvars();
    let diff = 0, same = 0, onlyLeft = 0, onlyRight = 0;
    for (const c of cvars) {
      if (c.hasLeft && c.compareValue !== undefined) {
        if (c.value !== c.compareValue) diff++;
        else same++;
      } else if (c.hasLeft && c.compareValue === undefined) {
        onlyLeft++;
      } else if (!c.hasLeft && c.compareValue !== undefined) {
        onlyRight++;
      }
    }
    return { diff, same, onlyLeft, onlyRight };
  });

  // Filtered cvar list
  const filteredCvars = createMemo(() => {
    const q = search().trim().toLowerCase();
    const active = activeCategories();
    const showAll = active.has("__all__");
    const cmpFilter = compareFilter();
    const cmpMode = isCompareMode();

    return enrichedCvars().filter((cvar) => {
      // Category filter
      if (!showAll && active.size > 0) {
        const cat = cvar.info?.category ?? "Unknown";
        if (!active.has(cat)) return false;
      }
      if (active.size === 0) return false;

      // Compare filter
      if (cmpMode && cmpFilter !== "all") {
        const hasLeft = cvar.hasLeft;
        const hasRight = cvar.compareValue !== undefined;
        switch (cmpFilter) {
          case "diff":
            if (!hasLeft || !hasRight || cvar.value === cvar.compareValue) return false;
            break;
          case "same":
            if (!hasLeft || !hasRight || cvar.value !== cvar.compareValue) return false;
            break;
          case "only_left":
            if (hasRight) return false;
            break;
          case "only_right":
            if (hasLeft) return false;
            break;
        }
      }

      // Hide defaults
      if (hideDefaults()) {
        if (cvar.info?.default !== undefined && cvar.value === cvar.info.default) {
          // In compare mode, also check if compare value differs from default
          if (cmpMode && cvar.compareValue !== undefined && cvar.compareValue !== cvar.info.default) {
            // Keep it — compare value is non-default
          } else {
            return false;
          }
        }
      }

      // Search
      if (q) {
        const nameMatch = cvar.name.toLowerCase().includes(q) || cvar.name.toLowerCase().replace(/_/g, "").includes(q);
        const descMatch = cvar.info?.description?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
  });

  const changedCount = createMemo(() =>
    enrichedCvars().filter(({ value, info }) =>
      info?.default !== undefined && value !== info.default
    ).length
  );

  function toggleCvar(name: string) {
    setExpandedCvar(prev => prev === name ? null : name);
    // Clear tooltip when expanding
    setHoveredCvar(null);
    setTooltipTarget(null);
  }

  function startCompare() {
    setShowPasteUI(true);
  }

  function applyCompare() {
    if (compareText().trim()) {
      setCompareActive(true);
      setShowPasteUI(false);
    }
  }

  function clearCompare() {
    setCompareActive(false);
    setCompareText("");
    setCompareFilter("all");
  }

  if (!props.config) {
    return (
      <div class="flex flex-col items-center justify-center h-full gap-3 text-[var(--sg-text-dim)]">
        <span class="text-4xl opacity-20">⚙</span>
        <p class="text-sm">No config loaded.</p>
        <p class="text-xs text-[var(--sg-section-label)]">
          Go to Clients tab to set up your ezQuake installation.
        </p>
      </div>
    );
  }

  return (
    <Switch>
      <Match when={viewMode() === "convert"}>
        <ConfigConverter
          config={props.config}
          configName={props.configName}
          onBack={() => setViewMode("list")}
        />
      </Match>
      <Match when={viewMode() === "list"}>
        <div class="flex flex-col h-full overflow-hidden">
          {/* ── Top bar ── */}
          <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 flex-wrap">
            <button
              class="flex items-center gap-1.5 text-sm font-semibold text-[var(--sg-text-bright)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
              onClick={() => setConfigExpanded(v => !v)}
            >
              <span class="text-xs">{configExpanded() ? "▼" : "▶"}</span>
              <span class="badge badge-primary text-xs px-1.5 h-5">ezQuake</span>
              <span class="text-[var(--sg-text-dim)]">›</span>
              <span class="font-mono">{props.configName ?? "config.cfg"}</span>
            </button>

            <span class="text-xs text-[var(--sg-section-label)]">
              {enrichedCvars().length} cvars
            </span>
            <Show when={changedCount() > 0}>
              <span class="text-xs text-[var(--color-primary)]">
                · {changedCount()} changed
              </span>
            </Show>

            <div class="flex-1" />

            <Show when={!isCompareMode()}>
              <button
                class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
                onClick={startCompare}
              >
                Compare
              </button>
            </Show>
            <Show when={isCompareMode()}>
              <button
                class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
                onClick={clearCompare}
              >
                Clear compare
              </button>
            </Show>
            <button
              class="btn btn-primary btn-xs"
              onClick={() => setViewMode("convert")}
            >
              Convert to FTE
            </button>
          </div>

          {/* ── Config tree (expandable) ── */}
          <Show when={configExpanded()}>
            <div class="px-4 py-2 bg-[var(--sg-stat-bg)] border-b border-[var(--sg-stat-border)] text-xs text-[var(--sg-text-dim)] flex-shrink-0">
              <div class="flex flex-col gap-1">
                <div class="flex gap-4">
                  <span class="text-[var(--sg-section-label)] w-24">Path</span>
                  <span class="font-mono">{props.exePath ?? "—"}</span>
                </div>
                <div class="flex gap-4">
                  <span class="text-[var(--sg-section-label)] w-24">Config</span>
                  <span class="font-mono">{props.configName ?? "config.cfg"}</span>
                </div>
                <div class="flex gap-4">
                  <span class="text-[var(--sg-section-label)] w-24">Total cvars</span>
                  <span>{enrichedCvars().length}</span>
                </div>
                <div class="flex gap-4">
                  <span class="text-[var(--sg-section-label)] w-24">Changed</span>
                  <span class="text-[var(--color-primary)]">{changedCount()}</span>
                </div>
              </div>
            </div>
          </Show>

          {/* ── Paste UI (shown when entering compare mode) ── */}
          <Show when={showPasteUI()}>
            <div class="flex flex-col gap-3 p-4 border-b border-[var(--sg-stat-border)] flex-shrink-0">
              <p class="text-sm text-[var(--sg-text-dim)]">
                Paste a config file to compare with <span class="font-mono text-[var(--sg-text-bright)]">{props.configName ?? "config.cfg"}</span>:
              </p>
              <textarea
                class="textarea textarea-bordered font-mono text-xs h-32 w-full"
                placeholder={`sensitivity "3"\ncl_maxfps "500"\n...`}
                value={compareText()}
                onInput={(e) => setCompareText(e.currentTarget.value)}
              />
              <div class="flex gap-2">
                <button
                  class="btn btn-primary btn-sm"
                  disabled={!compareText().trim()}
                  onClick={applyCompare}
                >
                  Compare
                </button>
                <button class="btn btn-ghost btn-sm" onClick={() => setShowPasteUI(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </Show>

          {/* ── Category filter bar ── */}
          <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 overflow-x-auto">
            <button
              class={`badge cursor-pointer flex-shrink-0 transition-colors ${
                isAllSelected() ? "badge-primary" : "badge-ghost hover:badge-outline"
              }`}
              onClick={toggleAll}
            >
              All ({enrichedCvars().length})
            </button>
            <For each={categories()}>
              {([cat, count]) => (
                <button
                  class={`badge cursor-pointer flex-shrink-0 whitespace-nowrap transition-colors ${
                    activeCategories().has(cat) || activeCategories().has("__all__")
                      ? "badge-primary"
                      : "badge-ghost hover:badge-outline"
                  }`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat} ({count})
                </button>
              )}
            </For>

            <div class="flex-1" />

            <label class="flex items-center gap-1.5 text-xs text-[var(--sg-text-dim)] flex-shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                checked={hideDefaults()}
                onChange={(e) => setHideDefaults(e.currentTarget.checked)}
              />
              Hide defaults
            </label>
            <input
              type="text"
              class="input input-xs w-40 font-mono"
              placeholder="Search cvars…"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>

          {/* ── Compare filter bar (shown only when compare is active) ── */}
          <Show when={isCompareMode()}>
            <div class="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--sg-stat-border)] flex-shrink-0 bg-[color-mix(in_oklch,var(--sg-stat-bg)_50%,transparent)]">
              <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide mr-1">Compare:</span>
              <For each={[
                { id: "all" as CompareFilter, label: `All (${enrichedCvars().length})` },
                { id: "diff" as CompareFilter, label: `Different (${compareCounts().diff})` },
                { id: "same" as CompareFilter, label: `Same (${compareCounts().same})` },
                { id: "only_left" as CompareFilter, label: `Only yours (${compareCounts().onlyLeft})` },
                { id: "only_right" as CompareFilter, label: `Only theirs (${compareCounts().onlyRight})` },
              ]}>
                {(f) => (
                  <button
                    class={`badge cursor-pointer flex-shrink-0 transition-colors ${
                      compareFilter() === f.id ? "badge-primary" : "badge-ghost hover:badge-outline"
                    }`}
                    onClick={() => setCompareFilter(f.id)}
                  >
                    {f.label}
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* ── Column headers ── */}
          <div
            class="grid px-4 py-1 border-b border-[var(--sg-stat-border)] flex-shrink-0 text-[10px] uppercase tracking-wide text-[var(--sg-section-label)]"
            style={{
              "grid-template-columns": isCompareMode() ? "240px 1fr 1fr" : "280px 1fr",
            }}
          >
            <span>Cvar</span>
            <span class="px-3">{isCompareMode() ? "Your config" : "Value"}</span>
            <Show when={isCompareMode()}>
              <span class="px-3 border-l border-[var(--sg-stat-border)]">Comparison</span>
            </Show>
          </div>

          {/* ── Cvar list ── */}
          <div class="flex-1 overflow-y-auto relative">
            <Show
              when={filteredCvars().length > 0}
              fallback={
                <div class="flex items-center justify-center h-20 text-xs text-[var(--sg-section-label)]">
                  No cvars match the current filters
                </div>
              }
            >
              <For each={filteredCvars()}>
                {(cvar) => (
                  <div class="relative">
                    <CvarRow
                      name={cvar.name}
                      value={cvar.value}
                      compareValue={cvar.compareValue}
                      info={cvar.info}
                      isExpanded={expandedCvar() === cvar.name}
                      isCompareMode={isCompareMode()}
                      onToggle={() => toggleCvar(cvar.name)}
                      onMouseEnter={(e) => handleMouseEnter(cvar.name, e)}
                      onMouseLeave={handleMouseLeave}
                    />
                    {/* Tooltip on hover */}
                    <Show when={hoveredCvar() === cvar.name && expandedCvar() !== cvar.name}>
                      <CvarTooltip
                        name={cvar.name}
                        value={cvar.value}
                        compareValue={cvar.compareValue}
                        info={cvar.info}
                        mode="tooltip"
                      />
                    </Show>
                    {/* Expanded detail on click */}
                    <Show when={expandedCvar() === cvar.name}>
                      <CvarTooltip
                        name={cvar.name}
                        value={cvar.value}
                        compareValue={cvar.compareValue}
                        info={cvar.info}
                        mode="expanded"
                      />
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && bunx tsc --noEmit 2>&1 | grep -E "ConfigViewer|CvarRow|CvarTooltip"`
Expected: no errors in these files (pre-existing errors in other files are OK)

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfigViewer.tsx
git commit -m "Rewrite ConfigViewer with compare integration and tooltip"
```

---

### Task 4: Delete old components and clean up imports

**Files:**
- Delete: `src/components/ConfigCompare.tsx`
- Delete: `src/components/CvarDetail.tsx`

- [ ] **Step 1: Delete the old components**

```bash
rm src/components/ConfigCompare.tsx src/components/CvarDetail.tsx
```

- [ ] **Step 2: Remove stale imports from any file that referenced them**

Check if any file still imports these deleted components:

Run: `grep -r "ConfigCompare\|CvarDetail" src/components/ src/App.tsx 2>/dev/null`

If any references remain (they shouldn't since ConfigViewer was fully rewritten), remove the import lines.

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/slipgate-app && bunx tsc --noEmit 2>&1 | grep -E "ConfigCompare|CvarDetail|ConfigViewer|CvarRow|CvarTooltip"`
Expected: no errors for any of these files

- [ ] **Step 4: Commit**

```bash
git add -A src/components/
git commit -m "Delete ConfigCompare and CvarDetail, replaced by integrated viewer"
```

---

### Summary

| Task | What | Files |
|------|------|-------|
| 1 | Rewrite CvarRow — clean name + value grid | `CvarRow.tsx` |
| 2 | Create CvarTooltip — hover/expand content | `CvarTooltip.tsx` (new) |
| 3 | Rewrite ConfigViewer — compare integration, tooltip, paste UI | `ConfigViewer.tsx` |
| 4 | Delete old components | Remove `ConfigCompare.tsx`, `CvarDetail.tsx` |

After task 4, F5 in the app should show the redesigned viewer with clean rows, hover tooltips, and compare mode accessible from the main list view.
