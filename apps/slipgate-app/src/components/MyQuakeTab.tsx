import { createSignal, createEffect, Switch, Match, Show, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EzQuakeConfig, ConfigSourceBundle, ConfigChain, ConfigEntry, BrowseModeName, BrowseDomainName } from "../types";
import type { ProfileData } from "../store";
import { updatePrefs } from "../store";
import ConfigViewer from "./ConfigViewer";
import BrowseView from "./BrowseView";

interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configSource: ConfigSourceBundle | null;
  exePath: string | null;
  configName: string | null;
  compareSource: ConfigSourceBundle | null;
  onCompareSourceChange: (source: ConfigSourceBundle | null) => void;
  profile: ProfileData | null;
  onSwitchToTab: (tab: string) => void;
}

export default function MyQuakeTab(props: MyQuakeTabProps) {
  const [mode, setMode] = createSignal<BrowseModeName>(
    props.profile?.prefs.my_quake_mode ?? "domains"
  );
  const [domain, setDomain] = createSignal<BrowseDomainName>(
    props.profile?.prefs.my_quake_domain ?? "configs"
  );
  const [hideDefaults, setHideDefaults] = createSignal<boolean>(
    props.profile?.prefs.browse_hide_defaults ?? false
  );

  const [isDragOver, setIsDragOver] = createSignal(false);
  const [dropError, setDropError] = createSignal<string | null>(null);
  const [pendingDrop, setPendingDrop] = createSignal<string[] | null>(null);

  // Persist prefs whenever any of the three signals change
  createEffect(() => {
    updatePrefs({
      my_quake_mode: mode(),
      my_quake_domain: domain(),
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
    setMode("domains");
    setDomain("configs");
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

  return (
    <div class="flex flex-col h-full">
      {/* Top bar: mode toggle + hide-defaults checkbox */}
      <div class="flex items-center px-4 pt-3 pb-2 border-b border-[var(--sg-stat-border)]">
        <div class="flex gap-1 bg-base-200 rounded-md p-1">
          <button
            class={`px-3 py-1 text-sm font-semibold rounded transition-colors cursor-pointer ${
              mode() === "browse"
                ? "bg-base-100 text-[var(--color-primary)] shadow-sm"
                : "text-[var(--sg-text-dim)] hover:text-[var(--sg-tab-hover-text)]"
            }`}
            onClick={() => setMode("browse")}
          >
            Browse
          </button>
          <button
            class={`px-3 py-1 text-sm font-semibold rounded transition-colors cursor-pointer ${
              mode() === "domains"
                ? "bg-base-100 text-[var(--color-primary)] shadow-sm"
                : "text-[var(--sg-text-dim)] hover:text-[var(--sg-tab-hover-text)]"
            }`}
            onClick={() => setMode("domains")}
          >
            Domains
          </button>
        </div>

        <Show when={mode() === "browse"}>
          <label class="ml-auto flex items-center gap-2 text-sm text-[var(--sg-text-dim)] cursor-pointer select-none">
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              checked={hideDefaults()}
              onChange={(e) => setHideDefaults(e.currentTarget.checked)}
            />
            Show only custom
          </label>
        </Show>
      </div>

      {/* Domains sub-nav - visible only in domains mode */}
      <Show when={mode() === "domains"}>
        <div class="flex items-center gap-1 px-4 pt-2 pb-0 border-b border-[var(--sg-stat-border)]">
          <button
            class={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              domain() === "configs"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--sg-text-dim)] hover:text-[var(--sg-tab-hover-text)]"
            }`}
            onClick={() => setDomain("configs")}
          >
            Configs
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold border-b-2 border-transparent transition-colors cursor-not-allowed opacity-40"
            disabled
            title="Coming soon"
          >
            Maps
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold border-b-2 border-transparent transition-colors cursor-not-allowed opacity-40"
            disabled
            title="Coming soon"
          >
            Matches
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold border-b-2 border-transparent transition-colors cursor-not-allowed opacity-40"
            disabled
            title="Coming soon"
          >
            Assets
          </button>
        </div>
      </Show>

      {/* Content pane */}
      <div class="flex-1 overflow-hidden">
        <Switch>
          <Match when={mode() === "browse"}>
            <BrowseView
              exePath={props.exePath}
              mergedCvars={mergedCvarsFromConfig(props.config)}
              profile={props.profile}
              hideDefaults={hideDefaults()}
              onOpenInConfigs={handleOpenConfigFromBrowse}
              onSwitchToClientsTab={() => props.onSwitchToTab("clients")}
            />
          </Match>
          <Match when={mode() === "domains" && domain() === "configs"}>
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
        </Switch>
      </div>
    </div>
  );
}

function mergedCvarsFromConfig(cfg: EzQuakeConfig | null): Record<string, string> {
  if (!cfg) return {};
  return cfg.raw_cvars ?? {};
}
