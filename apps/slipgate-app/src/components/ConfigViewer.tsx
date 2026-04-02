import { createSignal, createMemo, For, Show, Switch, Match, onCleanup } from "solid-js";
import { lookupCvar, loadDatabase, parseConfig } from "qw-config";
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

/** Normalize a cvar value for comparison: trim, and if both parse as numbers, compare numerically.
 *  "1.0" equals "1", "0.000" equals "0", but "red" stays "red". */
function valuesEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return false;
}

/** Check if a value matches the documented default (numeric-aware). */
function isDefaultValue(value: string | undefined, defaultVal: string | undefined): boolean {
  if (value === undefined || defaultVal === undefined) return false;
  return valuesEqual(value, defaultVal);
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
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => { if (hoverTimer) clearTimeout(hoverTimer); });

  function handleMouseEnter(name: string, _e: MouseEvent) {
    if (expandedCvar() === name) return;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      setHoveredCvar(name);
    }, 200);
  }

  function handleMouseLeave() {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    setHoveredCvar(null);
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

  // Build complete cvar list: start from full database, overlay user's config values
  const enrichedCvars = createMemo(() => {
    if (!props.config) return [];
    const db = loadDatabase();
    const allDbNames = Array.from(db.clients.ezquake.keys());
    const userCvars = props.config.raw_cvars;
    const cmpMode = isCompareMode();
    const cmpMap = compareCvars();

    // Union of database cvars + any user/compare cvars not in database (custom set vars, etc.)
    const extraUserKeys = Object.keys(userCvars).filter(k => !db.clients.ezquake.has(k));
    const extraCompareKeys = cmpMode
      ? Array.from(cmpMap.keys()).filter(k => !db.clients.ezquake.has(k) && !(k in userCvars))
      : [];
    const allKeys = [...allDbNames, ...extraUserKeys, ...extraCompareKeys].sort();

    return allKeys.map((name) => {
      const info = lookupCvar(name);
      const userValue = userCvars[name];
      const hasLeft = userValue !== undefined;
      // Use user's value if set, otherwise fall back to documented default
      const value = userValue ?? info?.default ?? "";
      const compareValue = cmpMode ? cmpMap.get(name) : undefined;
      const leftIsDefault = isDefaultValue(value, info?.default);
      const rightIsDefault = isDefaultValue(compareValue, info?.default);
      return { name, value, info, hasLeft, compareValue, leftIsDefault, rightIsDefault };
    });
  });

  // In compare mode, filter out rows where both sides are at default (noise reduction)
  const relevantCvars = createMemo(() => {
    const cvars = enrichedCvars();
    if (!isCompareMode()) return cvars;
    return cvars.filter(c => !c.leftIsDefault || !c.rightIsDefault);
  });

  // Category counts (from relevant cvars, not the full bloated list)
  const categories = createMemo(() => {
    const counts = new Map<string, number>();
    for (const { info } of relevantCvars()) {
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

  // Compare filter counts (from relevant cvars — excludes both-at-default noise)
  const compareCounts = createMemo(() => {
    if (!isCompareMode()) return { diff: 0, same: 0, onlyLeft: 0, onlyRight: 0 };
    const cvars = relevantCvars();
    let diff = 0, same = 0, onlyLeft = 0, onlyRight = 0;
    for (const c of cvars) {
      if (c.hasLeft && c.compareValue !== undefined) {
        if (!valuesEqual(c.value, c.compareValue)) diff++;
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

    return relevantCvars().filter((cvar) => {
      // Category filter
      if (!showAll && active.size > 0) {
        const cat = cvar.info?.category ?? "Unknown";
        if (!active.has(cat)) return false;
      }
      if (active.size === 0) return false;

      // Compare filter (uses numeric-aware comparison)
      if (cmpMode && cmpFilter !== "all") {
        const hasLeft = cvar.hasLeft;
        const hasRight = cvar.compareValue !== undefined;
        switch (cmpFilter) {
          case "diff":
            if (!hasLeft || !hasRight || valuesEqual(cvar.value, cvar.compareValue!)) return false;
            break;
          case "same":
            if (!hasLeft || !hasRight || !valuesEqual(cvar.value, cvar.compareValue!)) return false;
            break;
          case "only_left":
            if (hasRight) return false;
            break;
          case "only_right":
            if (hasLeft) return false;
            break;
        }
      }

      // Hide defaults (uses numeric-aware comparison)
      if (hideDefaults()) {
        if (cvar.leftIsDefault) {
          if (cmpMode && cvar.compareValue !== undefined && !cvar.rightIsDefault) {
            // Keep — compare value is non-default
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
    relevantCvars().filter(({ value, info }) =>
      info?.default !== undefined && !isDefaultValue(value, info.default)
    ).length
  );

  function toggleCvar(name: string) {
    setExpandedCvar(prev => prev === name ? null : name);
    setHoveredCvar(null);
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
              {relevantCvars().length} cvars
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
              <button
                class="btn btn-ghost btn-xs text-[var(--sg-text-dim)] mr-1"
                onClick={clearCompare}
                title="Exit compare mode"
              >
                ✕
              </button>
              <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide mr-1">Compare:</span>
              <For each={[
                { id: "all" as CompareFilter, label: `All (${relevantCvars().length})` },
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
