import { createSignal, Switch, Match, Show, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EzQuakeConfig, ConfigSourceBundle, ConfigChain, ConfigEntry } from "../types";
import ConfigViewer from "./ConfigViewer";

interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configSource: ConfigSourceBundle | null;
  exePath: string | null;
  configName: string | null;
  compareSource: ConfigSourceBundle | null;
  onCompareSourceChange: (source: ConfigSourceBundle | null) => void;
}

type SubTab = "config" | "visuals" | "matches";

export default function MyQuakeTab(props: MyQuakeTabProps) {
  const [subTab, setSubTab] = createSignal<SubTab>("config");
  const [isDragOver, setIsDragOver] = createSignal(false);
  const [dropError, setDropError] = createSignal<string | null>(null);
  const [pendingDrop, setPendingDrop] = createSignal<string[] | null>(null);

  let unlisten: (() => void) | null = null;
  (async () => {
    const appWindow = getCurrentWindow();
    unlisten = await appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave" || event.payload.type === "cancel") {
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

  return (
    <div class="flex flex-col h-full">
      {/* Horizontal sub-tab bar */}
      <div class="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[var(--sg-stat-border)]">
        <button
          class={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            subTab() === "config"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--sg-text-dim)] hover:text-[var(--sg-tab-hover-text)]"
          }`}
          onClick={() => setSubTab("config")}
        >
          Config
        </button>
        <button
          class={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer opacity-40 cursor-not-allowed ${
            subTab() === "visuals"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--sg-text-dim)]"
          }`}
          disabled
          title="Coming soon"
        >
          Visuals
        </button>
        <button
          class={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer opacity-40 cursor-not-allowed ${
            subTab() === "matches"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--sg-text-dim)]"
          }`}
          disabled
          title="Coming soon"
        >
          Matches
        </button>
      </div>

      {/* Sub-tab content */}
      <div class="flex-1 overflow-hidden">
        <Switch>
          <Match when={subTab() === "config"}>
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
            />
          </Match>
          <Match when={subTab() === "visuals"}>
            <div class="flex items-center justify-center h-full text-[var(--sg-text-dim)] text-sm">
              Visuals — coming soon
            </div>
          </Match>
          <Match when={subTab() === "matches"}>
            <div class="flex items-center justify-center h-full text-[var(--sg-text-dim)] text-sm">
              Matches — coming soon
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
}
