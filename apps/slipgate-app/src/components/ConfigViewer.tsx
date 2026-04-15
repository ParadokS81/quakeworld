import { createSignal, createMemo, createEffect, For, Show, Switch, Match, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { lookupCvar, loadDatabase, loadDomainTags, loadEzQuakeCommands, loadKtxCommands } from "qw-config";
import type { EzQuakeConfig, ConfigChain, ConfigSourceBundle, ConfigEntry, ChainBindClassification } from "../types";
import ConfigChainPanel from "./ConfigChainPanel";
import ConfigSidebar from "./ConfigSidebar";
import ConfigSettingsSection from "./ConfigSettingsSection";
import ConfigBindsSection from "./ConfigBindsSection";
import { ConfigWeaponBindsSection, ConfigTeamsayBindsSection, ConfigMovementBindsSection } from "./ConfigDomainBinds";
import ConfigAliasesSection from "./ConfigAliasesSection";
import ConfigTeamplayMacros from "./ConfigTeamplayMacros";
import ConfigMacrosSection from "./ConfigMacrosSection";
import ConfigTriggersSection from "./ConfigTriggersSection";
import ConfigCommandsSection from "./ConfigCommandsSection";
import ConfigConverter from "./ConfigConverter";
import SectionMinimap from "./SectionMinimap";
import ConfigKeyboardPanel from "./ConfigKeyboardPanel";
import { useKeyboardPanelState } from "./useKeyboardPanelState";
import { mergeSelectedFiles, categorizeBinds, mergeAliases, synthesizeModifierTeamsayBinds } from "./configMerger";
import type { ProfileData } from "../store";

interface ConfigViewerProps {
  config: EzQuakeConfig | null;
  configChain: ConfigChain | null;
  exePath: string | null;
  configName: string | null;
  compareSource?: ConfigSourceBundle | null;
  onClearCompare?: () => void;
  isDragOver?: boolean;
  dropError?: string | null;
  availableConfigs?: ConfigEntry[];
  onCompareConfig?: (entry: ConfigEntry) => void;
  onSwapCompareConfig?: (entry: ConfigEntry) => void;
  profile?: ProfileData | null;
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

/**
 * Whether a cvar is effectively at its default from the viewer's perspective.
 * - Not present in the config → default
 * - Present and matches the documented default → default
 * - Present as empty string AND we don't know the default → treated as default
 *   (matches ezQuake cfg_save behavior, which writes `""` for unset strings)
 */
function isEffectivelyDefault(
  hasValue: boolean,
  value: string | undefined,
  defaultVal: string | undefined,
): boolean {
  if (!hasValue) return true;
  if (defaultVal !== undefined) return isDefaultValue(value, defaultVal);
  return value === "";
}

/** Categories that are domain-ized in row 2 (excluded from row 1 pills, but included in row 1 "All") */
const DOMAIN_CATEGORIES = new Set(["Teamplay"]);

/**
 * Fixed category display order grouped by relevance.
 * Categories not listed here appear at the end alphabetically.
 * Group boundaries (marked with `gap: true`) get visual spacing in the sidebar.
 */
const CATEGORY_ORDER: { name: string; gap?: boolean }[] = [
  // Visual
  { name: "HUD" },
  { name: "Graphics" },
  { name: "Sound" },
  { name: "Input", gap: true },
  // Gameplay
  { name: "Multiplayer", gap: true },
  // Reference
  { name: "Miscellaneous" },
  { name: "Demos" },
  { name: "Server", gap: true },
  // Catch-all
  { name: "Unknown" },
  { name: "Obsolete" },
];

const CATEGORY_PRIORITY = new Map(CATEGORY_ORDER.map((c, i) => [c.name, i]));
const CATEGORY_GAPS = new Set(CATEGORY_ORDER.filter((c) => c.gap).map((c) => c.name));

export default function ConfigViewer(props: ConfigViewerProps) {
  const [viewMode, setViewMode] = createSignal<ViewMode>("list");
  const [configExpanded, setConfigExpanded] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [hideDefaults, setHideDefaults] = createSignal(false);
  const [expandedCvar, setExpandedCvar] = createSignal<string | null>(null);
  const [contentScrollEl, setContentScrollEl] = createSignal<HTMLDivElement | undefined>();

  // ── Primary override (View as Primary) ──
  const [primaryOverride, setPrimaryOverride] = createSignal<ConfigChain | null>(null);
  const [configOverride, setConfigOverride] = createSignal<EzQuakeConfig | null>(null);

  const effectiveConfig = createMemo(() => configOverride() ?? props.config);
  const effectiveChain = createMemo(() => primaryOverride() ?? props.configChain);
  const effectiveConfigName = createMemo(() => {
    const override = primaryOverride();
    if (override && override.files.length > 0) return override.files[0].name;
    return props.configName;
  });

  // ── File selection (all selected by default) ──
  const [selectedFiles, setSelectedFiles] = createSignal<Set<number>>(
    new Set(effectiveChain()?.files.map((_, i) => i) ?? []),
  );

  // Reset selection when chain changes
  createEffect((prev: string) => {
    const key = effectiveChain()?.files.map((f) => f.relative_path).join("|") ?? "";
    if (key !== prev) {
      setSelectedFiles(new Set(effectiveChain()?.files.map((_, i) => i) ?? []));
    }
    return key;
  }, "");

  // ── Row 1: Settings category state (excludes HUD/Teamplay/Server) ──
  const [activeRow1, setActiveRow1] = createSignal<Set<string>>(new Set(["__all__"]));

  // ── Row 2: Domain sub-pills (e.g. "teamplay:settings", "weapons:binds") + Aliases ──
  const [activeRow2, setActiveRow2] = createSignal<Set<string>>(new Set());
  const [aliasesActive, setAliasesActive] = createSignal(false);
  const [macrosActive, setMacrosActive] = createSignal(false);
  const [triggersActive, setTriggersActive] = createSignal(false);
  const [commandsActive, setCommandsActive] = createSignal(false);

  // ── Compare state ──
  const [compareFilter, setCompareFilter] = createSignal<CompareFilter>("all");

  // ── Tooltip hover state ──
  const [hoveredCvar, setHoveredCvar] = createSignal<string | null>(null);
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  onCleanup(() => { if (hoverTimer) clearTimeout(hoverTimer); });

  // Keyboard panel state (selection, visibility, category toggles, section
  // focus predicate). Extracted to useKeyboardPanelState so ConfigViewer stays
  // focused on config merging and rendering.
  const kbState = useKeyboardPanelState({
    profile: () => props.profile,
    activeRow2,
  });

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
    if (!effectiveChain()) return null;
    return mergeSelectedFiles(effectiveChain()!, selectedFiles());
  });

  const effectiveCvars = createMemo(() =>
    mergedData()?.cvars ?? effectiveConfig()?.raw_cvars ?? {},
  );

  const userCreatedCvars = createMemo((): Set<string> =>
    mergedData()?.userCreated ?? new Set<string>(),
  );

  // ── Compare config from source bundle ──
  const compareCvars = createMemo((): Map<string, string> => {
    const source = props.compareSource;
    if (!source?.primary_chain) return new Map();
    // Merge all files from the compare chain
    const allIndices = new Set(source.primary_chain.files.map((_: any, i: number) => i));
    const merged = mergeSelectedFiles(source.primary_chain, allIndices);
    return new Map(Object.entries(merged.cvars));
  });

  const isCompareMode = () => compareCvars().size > 0;

  // ── Alias + bind command maps for chain expansion ──
  const primaryAliases = createMemo((): Record<string, string> =>
    mergedData()?.aliases ?? {},
  );
  const primaryBindCommands = createMemo((): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const [key, cmd] of mergedData()?.binds ?? []) {
      map[key.toUpperCase()] = cmd;
    }
    return map;
  });
  const compareMerged = createMemo(() => {
    const source = props.compareSource;
    if (!source?.primary_chain) return null;
    const allIndices = new Set(source.primary_chain.files.map((_: any, i: number) => i));
    return mergeSelectedFiles(source.primary_chain, allIndices);
  });
  const compareAliases = createMemo((): Record<string, string> =>
    compareMerged()?.aliases ?? {},
  );
  const compareBindCommands = createMemo((): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const [key, cmd] of compareMerged()?.binds ?? []) {
      map[key.toUpperCase()] = cmd;
    }
    return map;
  });
  const compareUserCreatedCvars = createMemo((): Set<string> =>
    compareMerged()?.userCreated ?? new Set<string>(),
  );

  // ── Compare bind classification (runs Rust classifier on compare chain) ──
  const [compareBinds, setCompareBinds] = createSignal<ChainBindClassification | null>(null);
  createEffect(() => {
    const source = props.compareSource;
    if (!source?.primary_chain) {
      setCompareBinds(null);
      return;
    }
    invoke<ChainBindClassification>("classify_chain_binds", { chain: source.primary_chain })
      .then(setCompareBinds)
      .catch((e) => {
        console.error("Failed to classify compare binds:", e);
        setCompareBinds(null);
      });
  });

  // ── Enriched cvar list (database + user values) ──
  const enrichedCvars = createMemo(() => {
    if (!effectiveConfig()) return [];
    const db = loadDatabase();
    const userCvars = effectiveCvars();
    const cmpMode = isCompareMode();
    const cmpMap = compareCvars();

    const dbNames = Array.from(db.clients.ezquake.entries())
      .filter(([_, info]) => info.category !== "Obsolete" && !info.serverOnly)
      .map(([name]) => name);

    const userCreated = userCreatedCvars();
    const compareUserCreated = compareUserCreatedCvars();
    const dbNameSet = new Set(dbNames);
    // Exclude user-created cvars from Unknown — they belong in the Macros section
    const extraUserKeys = Object.keys(userCvars).filter(
      (k) => !dbNameSet.has(k) && !userCreated.has(k),
    );
    const extraCompareKeys = cmpMode
      ? Array.from(cmpMap.keys()).filter(
          (k) => !dbNameSet.has(k) && !(k in userCvars) && !compareUserCreated.has(k),
        )
      : [];
    const allKeys = [...dbNames, ...extraUserKeys, ...extraCompareKeys].sort();

    return allKeys.map((name) => {
      const info = lookupCvar(name);
      const userValue = userCvars[name];
      const hasLeft = userValue !== undefined;
      const value = userValue ?? info?.default ?? "";
      const compareValue = cmpMode ? cmpMap.get(name) : undefined;
      const hasRight = compareValue !== undefined;
      const leftIsDefault = isEffectivelyDefault(hasLeft, value, info?.default);
      const rightIsDefault = isEffectivelyDefault(hasRight, compareValue, info?.default);
      const isObsolete = info?.category === "Obsolete";
      return { name, value, info, hasLeft, hasRight, compareValue, leftIsDefault, rightIsDefault, isObsolete };
    });
  });

  // "Hide defaults" toggle is the explicit control for hiding at-default rows;
  // we don't permanently filter them out in compare mode.
  const relevantCvars = createMemo(() => enrichedCvars());

  // ── Category counts (all categories, then split into rows) ──
  const allCategories = createMemo(() => {
    const counts = new Map<string, number>();
    for (const { info } of relevantCvars()) {
      const cat = info?.category ?? "Unknown";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => {
      const pa = CATEGORY_PRIORITY.get(a[0]) ?? 999;
      const pb = CATEGORY_PRIORITY.get(b[0]) ?? 999;
      if (pa !== pb) return pa - pb;
      return a[0].localeCompare(b[0]); // alphabetical fallback for unlisted
    });
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
        // Hide if both sides are at default (single mode: just left)
        if (cvar.leftIsDefault && cvar.rightIsDefault) return false;
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
    if (!mergedData() || !effectiveConfig()) return [];
    const db = loadDatabase();
    const cvarNames = new Set(
      Array.from(db.clients.ezquake.entries()).map(([name]) => name.toLowerCase()),
    );
    const ezquakeCommandSet = new Set(
      Array.from(loadEzQuakeCommands().commands.keys()).map((n) => n.toLowerCase()),
    );
    const ktxCommandSet = new Set(
      Array.from(loadKtxCommands().commands.keys()).map((n) => n.toLowerCase()),
    );
    return categorizeBinds(
      mergedData()!.binds,
      effectiveConfig()!.weapon_binds,
      effectiveConfig()!.teamsay_binds,
      effectiveConfig()!.movement,
      effectiveChain()!,
      selectedFiles(),
      primaryAliases(),
      cvarNames,
      ezquakeCommandSet,
      ktxCommandSet,
      compareBinds(),
      compareBindCommands(),
    );
  });

  const primaryWeaponBinds = createMemo(() =>
    effectiveConfig()?.weapon_binds ?? []
  );
  const primaryTeamsayBinds = createMemo(() => {
    const base = effectiveConfig()?.teamsay_binds ?? [];
    const combos = synthesizeModifierTeamsayBinds(
      mergedData()?.binds ?? [],
      primaryAliases(),
      base,
    );
    return [...base, ...combos];
  });
  const compareWeaponBinds = createMemo(() =>
    compareBinds()?.weapon_binds ?? []
  );
  const compareTeamsayBinds = createMemo(() => {
    const base = compareBinds()?.teamsay_binds;
    if (!base) return undefined;
    const cmpRaw = Array.from(Object.entries(compareBindCommands())).map(
      ([k, v]) => [k, v] as [string, string],
    );
    const combos = synthesizeModifierTeamsayBinds(cmpRaw, compareAliases(), base);
    return [...base, ...combos];
  });

  // ── Aliases data ──
  const enrichedAliases = createMemo(() => {
    if (!effectiveChain()) return [];
    return mergeAliases(effectiveChain()!, selectedFiles());
  });

  // ── Command invocations ──
  // Aggregate across all selected chain files so that commands in autoexec.cfg etc. are included.
  // Source file is carried with each entry so the UI can show where each command came from.
  const commandInvocations = createMemo(() => {
    const chain = effectiveChain();
    if (!chain) return [];
    const selected = selectedFiles();
    const result: Array<{ name: string; args: string; sourceFile: string }> = [];
    for (let i = 0; i < chain.files.length; i++) {
      if (!selected.has(i)) continue;
      const file = chain.files[i];
      for (const ci of file.command_invocations ?? []) {
        result.push({ name: ci.name, args: ci.args, sourceFile: file.name });
      }
    }
    return result;
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
    return active.has("teamplay:binds") || active.has("weapons:binds") || active.has("misc:binds") || active.has("teamplay:macros");
  });
  // All binds — unfiltered raw bind list for Settings > Binds, sorted by category
  const CAT_SORT: Record<string, number> = { movement: 0, weapons: 1, teamsay: 2, ktx: 3, unresolved: 4, misc: 5 };
  const allBinds = createMemo(() => {
    if (!activeRow2().has("misc:binds")) return [];
    const q = search().trim().toLowerCase();
    return enrichedBinds()
      .filter((b) => {
        if (q && !b.key.toLowerCase().includes(q) && !b.command.toLowerCase().includes(q) && !b.label.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (CAT_SORT[a.category] ?? 9) - (CAT_SORT[b.category] ?? 9));
  });
  const showAliasesSection = createMemo(() => aliasesActive());
  const showMacrosSection = createMemo(() => macrosActive());
  const showTriggersSection = createMemo(() => triggersActive());
  const showCommandsSection = createMemo(() => commandsActive());

  // ── Teamsay alias names (for macros extraction) ──
  const teamsayAliasNames = createMemo((): Set<string> => {
    const names = new Set<string>();
    const binds = effectiveConfig()?.teamsay_binds ?? [];
    const bindCmds = primaryBindCommands();
    for (const tb of binds) {
      const cmd = bindCmds[tb.key.toUpperCase()];
      if (cmd) {
        // Extract alias names from the bind command
        for (const part of cmd.split(";")) {
          const token = part.trim().split(/\s+/)[0];
          if (token && !token.startsWith("+") && !token.startsWith("-")) {
            names.add(token);
          }
        }
      }
    }
    return names;
  });

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

  function clearCompare() {
    setCompareFilter("all");
    props.onClearCompare?.();
  }

  async function handleViewAsPrimary(entry: ConfigEntry) {
    if (entry.location.type === "inside_pak") {
      console.warn("View as Primary not yet supported for configs inside paks");
      return;
    }
    try {
      const [chain, cfg] = await Promise.all([
        invoke<ConfigChain>("load_config_from_source", {
          sourceType: "local_install",
          configPath: entry.relative_path,
          contextPath: props.exePath ?? "",
        }),
        invoke<EzQuakeConfig>("read_ezquake_config", {
          exePath: props.exePath ?? "",
          configName: entry.filename,
        }),
      ]);
      setPrimaryOverride(chain);
      setConfigOverride(cfg);
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  }

  // ── Render ──
  if (!effectiveConfig()) {
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
          config={effectiveConfig()!}
          configName={effectiveConfigName()}
          onBack={() => setViewMode("list")}
        />
      </Match>
      <Match when={viewMode() === "list"}>
        <div class="flex flex-col h-full overflow-hidden relative">
          {/* ── Top bar ── */}
          <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 flex-wrap">
            <button
              class="flex items-center gap-1.5 text-sm font-semibold text-[var(--sg-text-bright)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
              onClick={() => setConfigExpanded((v) => !v)}
            >
              <span class="text-xs">{configExpanded() ? "▼" : "▶"}</span>
              <span class="badge badge-primary text-xs px-1.5 h-5">ezQuake</span>
              <span class="text-[var(--sg-text-dim)]">›</span>
              <span class="font-mono">{effectiveConfigName() ?? "config.cfg"}</span>
            </button>

            <Show when={primaryOverride()}>
              <button
                class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
                onClick={() => {
                  setPrimaryOverride(null);
                  setConfigOverride(null);
                }}
              >
                ↩ Reset to default
              </button>
            </Show>

            <div class="flex-1" />

            <Show when={isCompareMode()}>
              <div class="flex items-center gap-2 text-sm">
                <span class="font-mono text-xs text-[var(--sg-text-dim)]">{props.compareSource?.label}</span>
                <button class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]" onClick={clearCompare}>
                  ✕
                </button>
              </div>
            </Show>
            <button class="btn btn-primary btn-xs" onClick={() => setViewMode("convert")}>
              Convert to FTE
            </button>
          </div>

          {/* ── Sidebar + Content (horizontal layout) ── */}
          <div class="flex-1 flex overflow-hidden">
            <ConfigSidebar
              row1Categories={row1Categories()}
              activeRow1={activeRow1()}
              isAllRow1={isAllRow1()}
              row1Total={row1Total()}
              onToggleRow1Cat={toggleRow1Cat}
              onToggleAllRow1={toggleAllRow1}
              categoryGaps={CATEGORY_GAPS}
              activeRow2={activeRow2()}
              onToggleRow2Pill={toggleRow2Pill}
              aliasesActive={aliasesActive()}
              onToggleAliases={() => setAliasesActive((v) => !v)}
              macrosActive={macrosActive()}
              onToggleMacros={() => setMacrosActive((v) => !v)}
              triggersActive={triggersActive()}
              onToggleTriggers={() => setTriggersActive((v) => !v)}
              commandsActive={commandsActive()}
              onToggleCommands={() => setCommandsActive((v) => !v)}
              hideDefaults={hideDefaults()}
              onHideDefaultsChange={setHideDefaults}
              search={search()}
              onSearchChange={setSearch}
              isCompareMode={isCompareMode()}
            />

            <div class="flex-1 flex flex-col overflow-hidden max-w-4xl">
              {/* ── Config chain panel (expandable, inside content column) ── */}
              <Show when={configExpanded() && effectiveChain()}>
                <div class={`flex-shrink-0 border-b border-[var(--sg-stat-border)] ${isCompareMode() ? "flex" : ""}`}>
                  <div class={isCompareMode() ? "flex-1" : ""}>
                    <ConfigChainPanel
                      configChain={effectiveChain()!}
                      selectedFiles={selectedFiles()}
                      onToggleFile={toggleFile}
                      availableConfigs={props.availableConfigs}
                      onCompareConfig={props.onCompareConfig}
                      onViewConfig={(entry) => handleViewAsPrimary(entry)}
                    />
                  </div>
                  <Show when={isCompareMode() && props.compareSource?.primary_chain}>
                    <div class="flex-1 px-4 py-2 bg-[var(--sg-stat-bg)] text-xs text-[var(--sg-text-dim)] border-l border-[var(--sg-stat-border)]">
                      <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide">
                        Compare chain ({props.compareSource!.primary_chain!.files.length} file{props.compareSource!.primary_chain!.files.length !== 1 ? "s" : ""})
                      </span>
                      <div class="mt-1 font-mono">
                        <For each={props.compareSource!.primary_chain!.files}>
                          {(file, i) => (
                            <div class="flex items-center gap-2 py-0.5">
                              <span class="text-[var(--sg-section-label)] select-none w-4">
                                {i() === props.compareSource!.primary_chain!.files.length - 1 ? "└─" : "├─"}
                              </span>
                              <span class="text-[var(--sg-text-bright)]">{file.relative_path}</span>
                              <span class="text-[var(--sg-section-label)]">{file.line_count} lines</span>
                            </div>
                          )}
                        </For>
                      </div>
                      <Show when={props.compareSource!.primary_chain!.unresolved.length > 0}>
                        <div class="mt-2">
                          <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide">
                            Missing files ({props.compareSource!.primary_chain!.unresolved.length})
                          </span>
                          <div class="mt-1 font-mono">
                            <For each={props.compareSource!.primary_chain!.unresolved}>
                              {(u) => (
                                <div class="flex items-center gap-2 py-0.5 text-yellow-500">
                                  <span class="select-none w-4">⚠</span>
                                  <span>{u.raw_ref}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                      <Show when={props.compareSource!.available_configs.length > 0}>
                        <div class="mt-2 pt-2 border-t border-[var(--sg-stat-border)]">
                          <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide">
                            Other configs ({props.compareSource!.available_configs.length})
                          </span>
                          <div class="mt-1 font-mono">
                            <For each={props.compareSource!.available_configs}>
                              {(entry) => (
                                <div
                                  class="flex items-center gap-1.5 py-0.5 cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                                  onClick={() => props.onSwapCompareConfig?.(entry)}
                                >
                                  <span class="text-[var(--sg-text-dim)]">{entry.filename}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>
              </Show>

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

              {/* ── Content + minimap ── */}
              <div class="flex-1 flex overflow-hidden">
              <div class="sg-content-scroll flex-1 overflow-y-auto relative pt-1" ref={setContentScrollEl}>
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

                <Show when={activeRow2().has("weapons:binds")}>
                  <ConfigWeaponBindsSection
                    primaryBinds={primaryWeaponBinds()}
                    compareBinds={compareWeaponBinds()}
                    isWeaponSelected={kbState.isWeaponSelected}
                    onWeaponClick={(w) => {
                      if (kbState.isWeaponSelected(w)) kbState.setSelection(null);
                      else kbState.setSelection([{ kind: "weapon", weapon: w }]);
                    }}
                  />
                </Show>

                <Show when={activeRow2().has("movement:binds")}>
                  <ConfigMovementBindsSection
                    primary={effectiveConfig()?.movement ?? {
                      forward: "", back: "", moveleft: "", moveright: "",
                      jump: "", moveup: "", movedown: "",
                    }}
                    compare={isCompareMode() ? (compareBinds()?.movement ?? null) : null}
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
                    isLabelSelected={kbState.isLabelSelected}
                    onLabelClick={(l) => {
                      if (kbState.isLabelSelected(l)) kbState.setSelection(null);
                      else kbState.setSelection([{ kind: "teamsay", label: l }]);
                    }}
                  />
                </Show>

                <Show when={activeRow2().has("teamplay:macros")}>
                  <ConfigTeamplayMacros
                    primaryAliases={primaryAliases()}
                    compareAliases={isCompareMode() ? compareAliases() : undefined}
                    primaryCvars={effectiveCvars()}
                    compareCvars={isCompareMode() ? compareCvars() : undefined}
                    teamsayAliasNames={teamsayAliasNames()}
                    primaryUserCreated={userCreatedCvars()}
                    compareUserCreated={isCompareMode() ? compareUserCreatedCvars() : undefined}
                  />
                </Show>

                <Show when={activeRow2().has("misc:binds")}>
                  <ConfigBindsSection
                    binds={allBinds()}
                    isCompareMode={isCompareMode()}
                    primaryAliases={primaryAliases()}
                    compareAliases={isCompareMode() ? compareAliases() : undefined}
                  />
                </Show>

                <Show when={showAliasesSection()}>
                  <ConfigAliasesSection aliases={filteredAliases()} allAliases={primaryAliases()} />
                </Show>

                <Show when={showMacrosSection()}>
                  <ConfigMacrosSection
                    primaryCvars={effectiveCvars()}
                    compareCvars={isCompareMode() ? compareCvars() : undefined}
                    primaryUserCreated={userCreatedCvars()}
                    compareUserCreated={isCompareMode() ? compareUserCreatedCvars() : undefined}
                    hideDefaults={hideDefaults()}
                    isCompareMode={isCompareMode()}
                    search={search()}
                  />
                </Show>

                <Show when={showTriggersSection()}>
                  <ConfigTriggersSection
                    aliases={primaryAliases()}
                    compareAliases={isCompareMode() ? compareAliases() : undefined}
                    search={search()}
                  />
                </Show>

                <Show when={showCommandsSection()}>
                  <ConfigCommandsSection
                    commands={commandInvocations()}
                    hideDefaults={hideDefaults()}
                    search={search()}
                  />
                </Show>

                <Show when={!showSettingsSection() && !showBindsSection() && !showAliasesSection() && !showMacrosSection() && !showTriggersSection() && !showCommandsSection()}>
                  <div class="flex items-center justify-center h-20 text-xs text-[var(--sg-section-label)]">
                    Select a category to view settings, binds, or aliases
                  </div>
                </Show>
              </div>
              <SectionMinimap scrollContainer={contentScrollEl} />
              </div>
            </div>
            <Show when={kbState.isBindsSectionFocused()}>
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
            </Show>
          </div>

          {/* Drop zone overlay */}
          <Show when={props.isDragOver}>
            <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 border-2 border-dashed border-[var(--color-primary)] rounded">
              <div class="text-center">
                <p class="text-lg text-[var(--color-primary)] font-semibold">Drop to compare</p>
                <p class="text-xs text-[var(--sg-text-dim)]">.cfg, .zip, .pak, .pk3</p>
              </div>
            </div>
          </Show>

          {/* Drop error toast */}
          <Show when={props.dropError}>
            <div class="absolute top-2 right-2 z-50 bg-error/90 text-error-content text-xs px-3 py-1.5 rounded">
              {props.dropError}
            </div>
          </Show>
        </div>
      </Match>
    </Switch>
  );
}
