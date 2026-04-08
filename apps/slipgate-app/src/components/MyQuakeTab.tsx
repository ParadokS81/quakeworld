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
}

type SubTab = "config" | "visuals" | "matches";

export default function MyQuakeTab(props: MyQuakeTabProps) {
  const [subTab, setSubTab] = createSignal<SubTab>("config");
  const [compareSource, setCompareSource] = createSignal<ConfigSourceBundle | null>(null);
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
    if (compareSource()) {
      setPendingDrop(supported);
      return;
    }

    await loadDroppedFiles(supported);
  }

  async function loadDroppedFiles(paths: string[]) {
    try {
      const source = await invoke<ConfigSourceBundle>("scan_dropped_input", { paths });
      setCompareSource(source);
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
      setCompareSource({
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

  function clearCompare() {
    setCompareSource(null);
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
            {/* Re-drop prompt */}
            <Show when={pendingDrop()}>
              <div class="flex items-center gap-2 px-4 py-2 bg-[color-mix(in_oklch,var(--color-primary)_15%,transparent)] border-b border-[var(--color-primary)] text-sm flex-shrink-0">
                <span class="text-[var(--sg-text-bright)]">
                  {pendingDrop()!.length} file{pendingDrop()!.length > 1 ? "s" : ""} dropped.
                </span>
                <button class="btn btn-primary btn-xs" onClick={handleReplace}>Replace</button>
                <button class="btn btn-ghost btn-xs" onClick={dismissPendingDrop}>Cancel</button>
              </div>
            </Show>
            <ConfigViewer
              config={props.config}
              configChain={props.configSource?.primary_chain ?? null}
              exePath={props.exePath}
              configName={props.configName}
              compareSource={compareSource()}
              onClearCompare={clearCompare}
              isDragOver={isDragOver()}
              dropError={dropError()}
              availableConfigs={props.configSource?.available_configs}
              onCompareConfig={handleCompareConfig}
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
