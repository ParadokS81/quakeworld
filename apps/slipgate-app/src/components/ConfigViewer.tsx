import { createSignal, createMemo, For, Show, Switch, Match, onCleanup } from "solid-js";
import { lookupCvar, loadDatabase, parseConfig, loadDomainTags } from "qw-config";
import type { EzQuakeConfig, ConfigChain } from "../types";
import ConfigChainPanel from "./ConfigChainPanel";
import ConfigSidebar from "./ConfigSidebar";
import ConfigSettingsSection from "./ConfigSettingsSection";
import ConfigBindsSection from "./ConfigBindsSection";
import ConfigAliasesSection from "./ConfigAliasesSection";
import ConfigConverter from "./ConfigConverter";
import { mergeSelectedFiles, categorizeBinds, mergeAliases } from "./configMerger";

interface ConfigViewerProps {
  config: EzQuakeConfig | null;
  configChain: ConfigChain | null;
  exePath: string | null;
  configName: string | null;
}

type ViewMode = "list" | "convert";
type CompareFilter = "all" | "diff" | "same" | "only_left" | "only_right";

/** Normalize a cvar value for comparison: trim, and if both parse as numbers, compare numerically. */
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

/** Categories that are domain-ized in row 2 (excluded from row 1 pills, but included in row 1 "All") */
const DOMAIN_CATEGORIES = new Set(["Teamplay"]);

export default function ConfigViewer(props: ConfigViewerProps) {
  const [viewMode, setViewMode] = createSignal<ViewMode>("list");
  const [configExpanded, setConfigExpanded] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [hideDefaults, setHideDefaults] = createSignal(false);
  const [expandedCvar, setExpandedCvar] = createSignal<string | null>(null);

  // ── File selection (all selected by default) ──
  const [selectedFiles, setSelectedFiles] = createSignal<Set<number>>(
    new Set(props.configChain?.files.map((_, i) => i) ?? []),
  );

  // Reset selection when chain changes
  const chainKey = () => props.configChain?.files.map((f) => f.relative_path).join("|") ?? "";
  let lastChainKey = chainKey();
  createMemo(() => {
    const key = chainKey();
    if (key !== lastChainKey) {
      lastChainKey = key;
      setSelectedFiles(new Set(props.configChain?.files.map((_, i) => i) ?? []));
    }
  });

  // ── Row 1: Settings category state (excludes HUD/Teamplay/Server) ──
  const [activeRow1, setActiveRow1] = createSignal<Set<string>>(new Set(["__all__"]));

  // ── Row 2: Domain sub-pills (e.g. "teamplay:settings", "weapons:binds") + Aliases ──
  const [activeRow2, setActiveRow2] = createSignal<Set<string>>(new Set());
  const [aliasesActive, setAliasesActive] = createSignal(false);

  // ── Compare state ──
  const [compareText, setCompareText] = createSignal("");
  const [compareActive, setCompareActive] = createSignal(false);
  const [showPasteUI, setShowPasteUI] = createSignal(false);
  const [compareFilter, setCompareFilter] = createSignal<CompareFilter>("all");

  // ── Tooltip hover state ──
  const [hoveredCvar, setHoveredCvar] = createSignal<string | null>(null);
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  onCleanup(() => { if (hoverTimer) clearTimeout(hoverTimer); });

  function handleMouseEnter(name: string, _e: MouseEvent) {
    if (expandedCvar() === name) return;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => setHoveredCvar(name), 200);
  }

  function handleMouseLeave() {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    setHoveredCvar(null);
  }

  // ── Per-file merged data ──
  const mergedData = createMemo(() => {
    if (!props.configChain) return null;
    return mergeSelectedFiles(props.configChain, selectedFiles());
  });

  const effectiveCvars = createMemo(() =>
    mergedData()?.cvars ?? props.config?.raw_cvars ?? {},
  );

  // ── Compare config parsing ──
  const compareCvars = createMemo((): Map<string, string> => {
    if (!compareActive()) return new Map();
    const text = compareText().trim();
    if (!text) return new Map();
    const parsed = parseConfig(text);
    return new Map(parsed.cvars);
  });

  const isCompareMode = () => compareActive() && compareCvars().size > 0;

  // ── Enriched cvar list (database + user values) ──
  const enrichedCvars = createMemo(() => {
    if (!props.config) return [];
    const db = loadDatabase();
    const userCvars = effectiveCvars();
    const cmpMode = isCompareMode();
    const cmpMap = compareCvars();

    const dbNames = Array.from(db.clients.ezquake.entries())
      .filter(([_, info]) => info.category !== "Obsolete")
      .map(([name]) => name);

    const dbNameSet = new Set(dbNames);
    const extraUserKeys = Object.keys(userCvars).filter((k) => !dbNameSet.has(k));
    const extraCompareKeys = cmpMode
      ? Array.from(cmpMap.keys()).filter((k) => !dbNameSet.has(k) && !(k in userCvars))
      : [];
    const allKeys = [...dbNames, ...extraUserKeys, ...extraCompareKeys].sort();

    return allKeys.map((name) => {
      const info = lookupCvar(name);
      const userValue = userCvars[name];
      const hasLeft = userValue !== undefined;
      const value = userValue ?? info?.default ?? "";
      const compareValue = cmpMode ? cmpMap.get(name) : undefined;
      const leftIsDefault = isDefaultValue(value, info?.default);
      const rightIsDefault = isDefaultValue(compareValue, info?.default);
      const isObsolete = info?.category === "Obsolete";
      const isUnknown = !info;
      return { name, value, info, hasLeft, compareValue, leftIsDefault, rightIsDefault, isObsolete, isUnknown };
    });
  });

  // In compare mode, filter out rows where both sides are at default
  const relevantCvars = createMemo(() => {
    const cvars = enrichedCvars();
    if (!isCompareMode()) return cvars;
    return cvars.filter((c) => !c.leftIsDefault || !c.rightIsDefault);
  });

  // ── Category counts (all categories, then split into rows) ──
  const allCategories = createMemo(() => {
    const counts = new Map<string, number>();
    for (const { info } of relevantCvars()) {
      const cat = info?.category ?? "Unknown";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  });

  const row1Categories = createMemo(() =>
    allCategories().filter(([cat]) => !DOMAIN_CATEGORIES.has(cat)),
  );

  const row1CatNames = createMemo(() => row1Categories().map(([cat]) => cat));

  const row1Total = createMemo(() =>
    row1Categories().reduce((sum, [_, count]) => sum + count, 0),
  );

  const isAllRow1 = createMemo(() => {
    const active = activeRow1();
    return active.has("__all__") || row1CatNames().every((c) => active.has(c));
  });

  function toggleRow1Cat(cat: string) {
    const allNames = row1CatNames();
    if (allNames.length === 0) return;
    setActiveRow1((prev) => {
      const next = new Set(prev);
      if (next.has("__all__")) {
        next.delete("__all__");
        for (const c of allNames) next.add(c);
        next.delete(cat);
        return next;
      }
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
        if (allNames.every((c) => next.has(c))) next.add("__all__");
      }
      return next;
    });
  }

  function toggleAllRow1() {
    if (isAllRow1()) {
      setActiveRow1(new Set<string>());
    } else {
      setActiveRow1(new Set<string>(["__all__"]));
    }
  }

  function toggleRow2Pill(key: string) {
    setActiveRow2((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Compare filter counts ──
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

  // ── Weapons domain cvar set (loaded once) ──
  const weaponCvarSet = createMemo(() => loadDomainTags().get("weapons") ?? new Set<string>());

  // ── Filtered cvar list ──
  const filteredCvars = createMemo(() => {
    const q = search().trim().toLowerCase();
    const row1 = activeRow1();
    const row2 = activeRow2();
    const showAllRow1 = row1.has("__all__");
    const cmpFilter = compareFilter();
    const cmpMode = isCompareMode();
    const weaponCvars = weaponCvarSet();

    return relevantCvars().filter((cvar) => {
      const cat = cvar.info?.category ?? "Unknown";

      // Check row 1 categories
      let passRow1 = false;
      if (showAllRow1) passRow1 = true;
      else if (row1.size > 0 && row1.has(cat)) passRow1 = true;

      // Check row 2 domain settings
      let passRow2 = false;
      if (row2.has("teamplay:settings") && cat === "Teamplay") passRow2 = true;
      if (row2.has("weapons:settings") && weaponCvars.has(cvar.name)) passRow2 = true;

      if (!passRow1 && !passRow2) return false;

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

      if (hideDefaults()) {
        if (cvar.leftIsDefault) {
          if (cmpMode && cvar.compareValue !== undefined && !cvar.rightIsDefault) {
            // Keep — compare value is non-default
          } else {
            return false;
          }
        }
      }

      if (q) {
        const nameMatch = cvar.name.toLowerCase().includes(q) || cvar.name.toLowerCase().replace(/_/g, "").includes(q);
        const descMatch = cvar.info?.description?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
  });

  // ── Binds data ──
  const enrichedBinds = createMemo(() => {
    if (!mergedData() || !props.config) return [];
    return categorizeBinds(
      mergedData()!.binds,
      props.config.weapon_binds,
      props.config.teamsay_binds,
      props.config.movement,
      props.configChain!,
      selectedFiles(),
    );
  });

  const filteredBinds = createMemo(() => {
    const active = activeRow2();
    // Map domain sub-pills to bind categories
    const activeCats = new Set<string>();
    if (active.has("teamplay:binds")) activeCats.add("teamsay");
    if (active.has("weapons:binds")) activeCats.add("weapons");
    if (active.has("misc:binds")) activeCats.add("misc");

    if (activeCats.size === 0) return [];
    const q = search().trim().toLowerCase();
    return enrichedBinds().filter((b) => {
      if (!activeCats.has(b.category)) return false;
      if (q && !b.key.toLowerCase().includes(q) && !b.command.toLowerCase().includes(q) && !b.label.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  // ── Aliases data ──
  const enrichedAliases = createMemo(() => {
    if (!props.configChain) return [];
    return mergeAliases(props.configChain, selectedFiles());
  });

  const filteredAliases = createMemo(() => {
    if (!aliasesActive()) return [];
    const q = search().trim().toLowerCase();
    return enrichedAliases().filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.command.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  // ── Section visibility ──
  const showSettingsSection = createMemo(() => {
    const row2 = activeRow2();
    return activeRow1().size > 0 || row2.has("teamplay:settings") || row2.has("weapons:settings");
  });

  const showBindsSection = createMemo(() => {
    const active = activeRow2();
    return active.has("teamplay:binds") || active.has("weapons:binds") || active.has("misc:binds");
  });
  const showAliasesSection = createMemo(() => aliasesActive());

  // ── Actions ──
  function toggleCvar(name: string) {
    setExpandedCvar((prev) => (prev === name ? null : name));
    setHoveredCvar(null);
  }

  function toggleFile(index: number) {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function startCompare() { setShowPasteUI(true); }

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

  // ── Render ──
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
              onClick={() => setConfigExpanded((v) => !v)}
            >
              <span class="text-xs">{configExpanded() ? "▼" : "▶"}</span>
              <span class="badge badge-primary text-xs px-1.5 h-5">ezQuake</span>
              <span class="text-[var(--sg-text-dim)]">›</span>
              <span class="font-mono">{props.configName ?? "config.cfg"}</span>
            </button>

            <div class="flex-1" />

            <Show when={!isCompareMode()}>
              <button class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]" onClick={startCompare}>
                Compare
              </button>
            </Show>
            <Show when={isCompareMode()}>
              <button class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]" onClick={clearCompare}>
                Clear compare
              </button>
            </Show>
            <button class="btn btn-primary btn-xs" onClick={() => setViewMode("convert")}>
              Convert to FTE
            </button>
          </div>

          {/* ── Config chain panel (expandable) ── */}
          <Show when={configExpanded() && props.configChain}>
            <ConfigChainPanel
              configChain={props.configChain!}
              selectedFiles={selectedFiles()}
              onToggleFile={toggleFile}
            />
          </Show>

          {/* ── Paste UI (compare mode) ── */}
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
                <button class="btn btn-primary btn-sm" disabled={!compareText().trim()} onClick={applyCompare}>
                  Compare
                </button>
                <button class="btn btn-ghost btn-sm" onClick={() => setShowPasteUI(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </Show>

          {/* ── Sidebar + Content (horizontal layout) ── */}
          <div class="flex-1 flex overflow-hidden">
            <ConfigSidebar
              row1Categories={row1Categories()}
              activeRow1={activeRow1()}
              isAllRow1={isAllRow1()}
              row1Total={row1Total()}
              onToggleRow1Cat={toggleRow1Cat}
              onToggleAllRow1={toggleAllRow1}
              activeRow2={activeRow2()}
              onToggleRow2Pill={toggleRow2Pill}
              aliasesActive={aliasesActive()}
              onToggleAliases={() => setAliasesActive((v) => !v)}
              hideDefaults={hideDefaults()}
              onHideDefaultsChange={setHideDefaults}
              search={search()}
              onSearchChange={setSearch}
            />

            <div class="flex-1 flex flex-col overflow-hidden">
              {/* ── Compare filter bar ── */}
              <Show when={isCompareMode()}>
                <div class="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--sg-stat-border)] flex-shrink-0 bg-[color-mix(in_oklch,var(--sg-stat-bg)_50%,transparent)]">
                  <button class="btn btn-ghost btn-xs text-[var(--sg-text-dim)] mr-1" onClick={clearCompare} title="Exit compare mode">
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

              {/* ── Content sections ── */}
              <div class="flex-1 overflow-y-auto relative">
                <Show when={showSettingsSection()}>
                  <ConfigSettingsSection
                    cvars={filteredCvars()}
                    isCompareMode={isCompareMode()}
                    expandedCvar={expandedCvar()}
                    hoveredCvar={hoveredCvar()}
                    onToggleCvar={toggleCvar}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  />
                </Show>

                <Show when={showBindsSection()}>
                  <ConfigBindsSection binds={filteredBinds()} />
                </Show>

                <Show when={showAliasesSection()}>
                  <ConfigAliasesSection aliases={filteredAliases()} />
                </Show>

                <Show when={!showSettingsSection() && !showBindsSection() && !showAliasesSection()}>
                  <div class="flex items-center justify-center h-20 text-xs text-[var(--sg-section-label)]">
                    Select a category to view settings, binds, or aliases
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
