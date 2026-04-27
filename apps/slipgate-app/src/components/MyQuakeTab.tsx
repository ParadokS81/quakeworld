import { createSignal, createEffect, Switch, Match, Show, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EzQuakeConfig, ConfigSourceBundle, ConfigChain, ConfigEntry, ScanResult, BrowseDomainName } from "../types";
import type { ProfileData } from "../store";
import { updatePrefs } from "../store";
import ConfigViewer from "./ConfigViewer";
import BrowseView from "./BrowseView";
import MatchesDomain from "./MatchesDomain";
import ClientsDomain from "./ClientsDomain";

// activeView replaces the previous (mode + domain) pair: Browse becomes a peer of the Domains
// in a single flat top-row nav. Profile prefs `my_quake_mode` + `my_quake_domain` stay as the
// persisted shape (backward-compat); we derive activeView from them on mount and persist back.
type ActiveView = "browse" | BrowseDomainName;

interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configSource: ConfigSourceBundle | null;
  exePath: string | null;
  configName: string | null;
  compareSource: ConfigSourceBundle | null;
  onCompareSourceChange: (source: ConfigSourceBundle | null) => void;
  profile: ProfileData | null;
  onConfigLoaded?: (config: EzQuakeConfig, exePath: string, configName: string, version: string | null) => void;
}

export default function MyQuakeTab(props: MyQuakeTabProps) {
  // Derive initial activeView from persisted prefs.
  const initialView: ActiveView = (() => {
    if (props.profile?.prefs.my_quake_mode === "browse") return "browse";
    return (props.profile?.prefs.my_quake_domain ?? "configs") as ActiveView;
  })();
  const [activeView, setActiveView] = createSignal<ActiveView>(initialView);
  const [hideDefaults, setHideDefaults] = createSignal<boolean>(
    props.profile?.prefs.browse_hide_defaults ?? false
  );

  const [isDragOver, setIsDragOver] = createSignal(false);
  const [dropError, setDropError] = createSignal<string | null>(null);
  const [pendingDrop, setPendingDrop] = createSignal<string[] | null>(null);

  // Browse / Matches share a single quake-dir scan (lifted from BrowseView so the diagnostic
  // buttons Rescan + Dump inventory can render in the top nav row).
  const [scan, setScan] = createSignal<ScanResult | null>(null);
  const [scanError, setScanError] = createSignal<string | null>(null);
  const [stale, setStale] = createSignal(false);
  const [dumping, setDumping] = createSignal(false);
  const [dumpMsg, setDumpMsg] = createSignal<string | null>(null);

  async function runScan() {
    if (!props.exePath) {
      setScan(null);
      return;
    }
    setScanError(null);
    try {
      const result = await invoke<ScanResult>("scan_quake_dir", {
        exePath: props.exePath,
        mergedCvars: mergedCvarsFromConfig(props.config),
      });
      setScan(result);
      setStale(false);
    } catch (e) {
      setScanError(String(e));
    }
  }

  async function dumpInventory() {
    if (!props.exePath) return;
    setDumping(true);
    setDumpMsg(null);
    try {
      const written = await invoke<string>("dump_inventory_report", {
        exePath: props.exePath,
        mergedCvars: mergedCvarsFromConfig(props.config),
        outPath: "quake-dir-inventory.md",
      });
      setDumpMsg(`Wrote ${written}`);
    } catch (e) {
      setDumpMsg(`Failed: ${String(e)}`);
    } finally {
      setDumping(false);
    }
  }

  onMount(runScan);

  // Re-run scan whenever exePath or config-derived cvars change, and (re)bind the watcher.
  createEffect(() => {
    void props.exePath;
    void Object.keys(mergedCvarsFromConfig(props.config)).length;
    runScan();
  });

  createEffect(() => {
    const exe = props.exePath;
    invoke("stop_browse_watch").catch(() => {});
    if (exe) {
      invoke("start_browse_watch", { exePath: exe }).catch((e) => console.error(e));
    }
  });

  let unlistenStale: (() => void) | null = null;
  (async () => {
    unlistenStale = await listen("browse-scan-stale", () => setStale(true));
  })();
  onCleanup(() => {
    unlistenStale?.();
    invoke("stop_browse_watch").catch(() => {});
  });

  // Persist prefs whenever the active view or hide-defaults toggle changes.
  createEffect(() => {
    const v = activeView();
    updatePrefs({
      my_quake_mode: v === "browse" ? "browse" : "domains",
      my_quake_domain: v === "browse" ? (props.profile?.prefs.my_quake_domain ?? "configs") : v,
      browse_hide_defaults: hideDefaults(),
    }).catch((e) => console.error("Failed to persist MyQuake prefs:", e));
  });

  let unlisten: (() => void) | null = null;
  (async () => {
    const appWindow = getCurrentWindow();
    unlisten = await appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        handleDrop(event.payload.paths);
      }
    });
  })();
  onCleanup(() => unlisten?.());

  async function handleDrop(paths: string[]) {
    const supported = paths.filter((p) => {
      const ext = p.split(".").pop()?.toLowerCase();
      return ext === "cfg" || ext === "zip" || ext === "pak" || ext === "pk3";
    });

    if (supported.length === 0) {
      setDropError("No .cfg, .zip, .pak, or .pk3 files found");
      setTimeout(() => setDropError(null), 3000);
      return;
    }

    // If right side already has content, ask user
    if (props.compareSource) {
      setPendingDrop(supported);
      return;
    }

    await loadDroppedFiles(supported);
  }

  async function loadDroppedFiles(paths: string[]) {
    try {
      const source = await invoke<ConfigSourceBundle>("scan_dropped_input", { paths });
      props.onCompareSourceChange(source);
      setDropError(null);
      setPendingDrop(null);
    } catch (e) {
      setDropError(String(e));
      setTimeout(() => setDropError(null), 5000);
      setPendingDrop(null);
    }
  }

  function handleReplace() {
    const paths = pendingDrop();
    if (paths) loadDroppedFiles(paths);
  }

  function dismissPendingDrop() {
    setPendingDrop(null);
  }

  async function handleCompareConfig(entry: ConfigEntry) {
    if (entry.location.type === "inside_pak") {
      console.warn("Compare not yet supported for configs inside paks");
      return;
    }
    try {
      const chain = await invoke<ConfigChain>("load_config_from_source", {
        sourceType: "local_install",
        configPath: entry.relative_path,
        contextPath: props.exePath ?? "",
      });
      props.onCompareSourceChange({
        origin: { type: "dropped_files", filenames: [entry.filename] },
        primary_chain: chain,
        available_configs: [],
        detected_client: null,
        label: entry.filename,
      });
    } catch (e) {
      console.error("Failed to load config for compare:", e);
    }
  }

  async function handleSwapCompareConfig(entry: ConfigEntry) {
    const source = props.compareSource;
    if (!source) return;

    try {
      // Determine how to load based on origin type
      let sourceType: string;
      let contextPath: string;

      if (source.origin.type === "archive" && source.origin.path) {
        sourceType = "archive";
        contextPath = source.origin.path;
      } else if (source.origin.type === "local_install" && source.origin.exe_path) {
        sourceType = "local_install";
        contextPath = source.origin.exe_path;
      } else {
        console.warn("Cannot swap compare config: unknown origin type or missing path");
        return;
      }

      const chain = await invoke<ConfigChain>("load_config_from_source", {
        sourceType,
        configPath: entry.relative_path,
        contextPath,
      });

      // Rebuild available_configs: old primary goes back, clicked entry leaves
      const oldPrimaryFiles = source.primary_chain?.files ?? [];
      const newAvailable: ConfigEntry[] = [
        ...oldPrimaryFiles.map((f) => ({
          filename: f.name,
          relative_path: f.relative_path,
          size: f.line_count as number,
          location: { type: "loose" as const },
        })),
        ...source.available_configs.filter((c) => c.relative_path !== entry.relative_path),
      ];

      props.onCompareSourceChange({
        ...source,
        primary_chain: chain,
        available_configs: newAvailable,
        label: entry.filename,
      });
    } catch (e) {
      console.error("Failed to swap compare config:", e);
    }
  }

  function clearCompare() {
    props.onCompareSourceChange(null);
    setPendingDrop(null);
  }

  async function handleOpenConfigFromBrowse(virtualPath: string) {
    setActiveView("configs");
    const leaf = virtualPath.split("/").pop() ?? virtualPath;
    try {
      const chain = await invoke<ConfigChain>("load_config_from_source", {
        sourceType: "local_install",
        configPath: virtualPath,
        contextPath: props.exePath ?? "",
      });
      const bundle: ConfigSourceBundle = {
        origin: { type: "dropped_files", filenames: [leaf] },
        primary_chain: chain,
        available_configs: [],
        detected_client: null,
        label: leaf,
      };
      props.onCompareSourceChange(bundle);
    } catch (e) {
      console.error("Failed to open config from browse:", e);
    }
  }

  // Flat-nav button class helper.
  function navBtnClass(view: ActiveView | "browse") {
    const isActive = activeView() === view;
    return `px-3 py-1.5 text-sm font-semibold rounded transition-colors cursor-pointer ${
      isActive
        ? "bg-base-100 text-[var(--color-primary)] shadow-sm"
        : "text-[var(--sg-text-dim)] hover:text-[var(--sg-tab-hover-text)]"
    }`;
  }

  return (
    <div class="flex flex-col h-full">
      {/* Single flat nav row: Browse | Clients Configs Maps Matches Assets ... Rescan Dump inventory */}
      <div class="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-[var(--sg-stat-border)]">
        <div class="flex gap-1 bg-base-200 rounded-md p-1">
          <button class={navBtnClass("browse")} onClick={() => setActiveView("browse")}>
            Browse
          </button>
          <span class="w-px bg-[var(--sg-stat-border)] mx-1 self-stretch" aria-hidden="true" />
          <button class={navBtnClass("clients")} onClick={() => setActiveView("clients")}>
            Clients
          </button>
          <button class={navBtnClass("configs")} onClick={() => setActiveView("configs")}>
            Configs
          </button>
          <button
            class="px-3 py-1.5 text-sm font-semibold rounded transition-colors cursor-not-allowed opacity-40"
            disabled
            title="Coming soon"
          >
            Maps
          </button>
          <button class={navBtnClass("matches")} onClick={() => setActiveView("matches")}>
            Matches
          </button>
          <button
            class="px-3 py-1.5 text-sm font-semibold rounded transition-colors cursor-not-allowed opacity-40"
            disabled
            title="Coming soon"
          >
            Assets
          </button>
        </div>

        {/* Right-aligned diagnostics. Always visible — they operate on the underlying scan that
            feeds Browse + Domain views. */}
        <div class="ml-auto flex items-center gap-2">
          <Show when={activeView() === "browse"}>
            <label class="flex items-center gap-2 text-sm text-[var(--sg-text-dim)] cursor-pointer select-none mr-2">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                checked={hideDefaults()}
                onChange={(e) => setHideDefaults(e.currentTarget.checked)}
              />
              Show only custom
            </label>
          </Show>
          <Show when={stale()}>
            <span class="text-xs text-amber-400">changes detected</span>
          </Show>
          <Show when={dumpMsg()}>
            <span class="text-xs text-[var(--sg-text-dim)] truncate max-w-[260px]">{dumpMsg()}</span>
          </Show>
          <button class="btn btn-sm btn-outline" onClick={runScan} disabled={!props.exePath}>
            Rescan
          </button>
          <button
            class="btn btn-sm btn-outline"
            onClick={dumpInventory}
            disabled={dumping() || !props.exePath}
            title="Write a markdown inventory report to <quake-dir>/quake-dir-inventory.md"
          >
            {dumping() ? "Dumping..." : "Dump inventory"}
          </button>
        </div>
      </div>

      {/* Content pane */}
      <div class="flex-1 overflow-hidden">
        <Switch>
          <Match when={activeView() === "browse"}>
            <BrowseView
              exePath={props.exePath}
              mergedCvars={mergedCvarsFromConfig(props.config)}
              profile={props.profile}
              hideDefaults={hideDefaults()}
              scan={scan()}
              scanError={scanError()}
              onOpenInConfigs={handleOpenConfigFromBrowse}
              onSwitchToClientsDomain={() => setActiveView("clients")}
              onRetryScan={runScan}
            />
          </Match>
          <Match when={activeView() === "clients"}>
            <ClientsDomain
              onConfigLoaded={props.onConfigLoaded}
              profile={props.profile}
            />
          </Match>
          <Match when={activeView() === "configs"}>
            {/* Re-drop modal */}
            <Show when={pendingDrop()}>
              <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
                <div class="bg-base-200 rounded-lg shadow-xl p-6 max-w-sm mx-4 border border-[var(--sg-stat-border)]">
                  <p class="text-sm text-[var(--sg-text-bright)] mb-4">
                    {pendingDrop()!.length} file{pendingDrop()!.length > 1 ? "s" : ""} dropped. Replace current comparison?
                  </p>
                  <div class="flex gap-2 justify-end">
                    <button class="btn btn-ghost btn-sm" onClick={dismissPendingDrop}>Cancel</button>
                    <button class="btn btn-primary btn-sm" onClick={handleReplace}>Replace</button>
                  </div>
                </div>
              </div>
            </Show>
            <ConfigViewer
              config={props.config}
              configChain={props.configSource?.primary_chain ?? null}
              exePath={props.exePath}
              configName={props.configName}
              compareSource={props.compareSource}
              onClearCompare={clearCompare}
              isDragOver={isDragOver()}
              dropError={dropError()}
              availableConfigs={props.configSource?.available_configs}
              onCompareConfig={handleCompareConfig}
              onSwapCompareConfig={handleSwapCompareConfig}
              profile={props.profile}
            />
          </Match>
          <Match when={activeView() === "matches"}>
            <MatchesDomain
              exePath={props.exePath}
              mergedCvars={mergedCvarsFromConfig(props.config)}
              scan={scan()}
              onRescan={runScan}
            />
          </Match>
        </Switch>
      </div>
    </div>
  );
}

function mergedCvarsFromConfig(cfg: EzQuakeConfig | null): Record<string, string> {
  if (!cfg) return {};
  return cfg.raw_cvars ?? {};
}
