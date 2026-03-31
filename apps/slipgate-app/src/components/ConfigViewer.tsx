import { createSignal, createMemo, For, Show, Switch, Match } from "solid-js";
import { lookupCvar, getEzQuakeCategories } from "qw-config";
import type { EzQuakeConfig } from "../types";
import CvarRow from "./CvarRow";
import CvarDetail from "./CvarDetail";
import ConfigCompare from "./ConfigCompare";
import ConfigConverter from "./ConfigConverter";

interface ConfigViewerProps {
  config: EzQuakeConfig | null;
  exePath: string | null;
  configName: string | null;
}

type ViewMode = "list" | "compare" | "convert";

export default function ConfigViewer(props: ConfigViewerProps) {
  const [viewMode, setViewMode] = createSignal<ViewMode>("list");
  const [activeCategory, setActiveCategory] = createSignal<string>("All");
  const [hideDefaults, setHideDefaults] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [expandedCvar, setExpandedCvar] = createSignal<string | null>(null);
  const [configExpanded, setConfigExpanded] = createSignal(false);
  const [compareText, setCompareText] = createSignal<string | null>(null);

  // Build enriched cvar list from raw_cvars
  const enrichedCvars = createMemo(() => {
    if (!props.config) return [];
    return Object.entries(props.config.raw_cvars).map(([name, value]) => {
      const info = lookupCvar(name, "ezquake");
      return { name, value, info };
    });
  });

  // Gather category counts from the enriched list
  const categories = createMemo(() => {
    const counts = new Map<string, number>();
    for (const { info } of enrichedCvars()) {
      const cat = info?.category ?? "Unknown";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    // Sort by count desc
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  });

  // Filtered cvar list
  const filteredCvars = createMemo(() => {
    const q = search().trim().toLowerCase();
    return enrichedCvars().filter(({ name, value, info }) => {
      // Category filter
      if (activeCategory() !== "All") {
        const cat = info?.category ?? "Unknown";
        if (cat !== activeCategory()) return false;
      }
      // Hide defaults
      if (hideDefaults()) {
        if (info?.default !== undefined && value === info.default) return false;
      }
      // Search
      if (q) {
        const nameMatch = name.toLowerCase().includes(q) || name.toLowerCase().replace(/_/g, "").includes(q);
        const descMatch = info?.description?.toLowerCase().includes(q) ?? false;
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
  }

  // No config loaded state
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
      <Match when={viewMode() === "compare"}>
        <ConfigCompare
          config={props.config}
          configName={props.configName}
          initialCompareText={compareText()}
          onBack={() => setViewMode("list")}
        />
      </Match>
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
            {/* Config tree toggle */}
            <button
              class="flex items-center gap-1.5 text-sm font-semibold text-[var(--sg-text-bright)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
              onClick={() => setConfigExpanded(v => !v)}
            >
              <span class="text-xs">{configExpanded() ? "▼" : "▶"}</span>
              <span class="badge badge-primary text-xs px-1.5 h-5">ezQuake</span>
              <span class="text-[var(--sg-text-dim)]">›</span>
              <span class="font-mono">{props.configName ?? "config.cfg"}</span>
            </button>

            {/* Stats */}
            <span class="text-xs text-[var(--sg-section-label)]">
              {enrichedCvars().length} cvars
            </span>
            <Show when={changedCount() > 0}>
              <span class="text-xs text-[var(--color-primary)]">
                · {changedCount()} changed
              </span>
            </Show>

            <div class="flex-1" />

            {/* Action buttons */}
            <button
              class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
              onClick={() => setViewMode("compare")}
              title="Compare with another config file"
            >
              Compare
            </button>
            <button
              class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
              title="Drop another config here (paste text)"
              onClick={() => setViewMode("compare")}
            >
              + Drop
            </button>
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

          {/* ── Filter bar ── */}
          <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 overflow-x-auto">
            {/* Category pills */}
            <button
              class={`badge cursor-pointer flex-shrink-0 transition-colors ${
                activeCategory() === "All"
                  ? "badge-primary"
                  : "badge-ghost hover:badge-outline"
              }`}
              onClick={() => setActiveCategory("All")}
            >
              All ({enrichedCvars().length})
            </button>
            <For each={categories()}>
              {([cat, count]) => (
                <button
                  class={`badge cursor-pointer flex-shrink-0 whitespace-nowrap transition-colors ${
                    activeCategory() === cat
                      ? "badge-primary"
                      : "badge-ghost hover:badge-outline"
                  }`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat} ({count})
                </button>
              )}
            </For>

            <div class="flex-1" />

            {/* Hide defaults */}
            <label class="flex items-center gap-1.5 text-xs text-[var(--sg-text-dim)] flex-shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                checked={hideDefaults()}
                onChange={(e) => setHideDefaults(e.currentTarget.checked)}
              />
              Hide defaults
            </label>

            {/* Search */}
            <input
              type="text"
              class="input input-xs w-40 font-mono"
              placeholder="Search cvars…"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>

          {/* ── Cvar list ── */}
          <div class="flex-1 overflow-y-auto">
            <Show
              when={filteredCvars().length > 0}
              fallback={
                <div class="flex items-center justify-center h-20 text-xs text-[var(--sg-section-label)]">
                  No cvars match the current filters
                </div>
              }
            >
              <For each={filteredCvars()}>
                {({ name, value, info }) => (
                  <>
                    <CvarRow
                      name={name}
                      value={value}
                      info={info}
                      isExpanded={expandedCvar() === name}
                      onToggle={() => toggleCvar(name)}
                    />
                    <Show when={expandedCvar() === name}>
                      <CvarDetail name={name} value={value} info={info} />
                    </Show>
                  </>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
