import { createSignal, Switch, Match, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EzQuakeConfig, ConfigSourceBundle } from "../types";
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

    try {
      const source = await invoke<ConfigSourceBundle>("scan_dropped_input", { paths: supported });
      setCompareSource(source);
      setDropError(null);
    } catch (e) {
      setDropError(String(e));
      setTimeout(() => setDropError(null), 5000);
    }
  }

  function clearCompare() {
    setCompareSource(null);
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
