import { createSignal, Switch, Match } from "solid-js";
import type { EzQuakeConfig } from "../types";
import ConfigViewer from "./ConfigViewer";

interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  exePath: string | null;
  configName: string | null;
}

type SubTab = "config" | "visuals" | "matches";

export default function MyQuakeTab(props: MyQuakeTabProps) {
  const [subTab, setSubTab] = createSignal<SubTab>("config");

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
              exePath={props.exePath}
              configName={props.configName}
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
