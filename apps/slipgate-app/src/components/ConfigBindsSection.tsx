import { For, Show } from "solid-js";
import type { EnrichedBind } from "./configMerger";

interface ConfigBindsSectionProps {
  binds: EnrichedBind[];
}

const CATEGORY_COLORS: Record<string, string> = {
  weapons: "oklch(0.7 0.15 30)",    // warm orange
  teamsay: "oklch(0.65 0.15 180)",  // teal
  misc: "oklch(0.6 0.03 260)",      // neutral grey-blue
};

export default function ConfigBindsSection(props: ConfigBindsSectionProps) {
  return (
    <div>
      {/* Category header (matches settings style) */}
      <div class="sg-category-group-header">Binds</div>

      {/* Column headers */}
      <div class="sg-bind-row text-[10px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
        <span>Key</span>
        <span>Command</span>
        <span>Type</span>
        <span>Source</span>
      </div>

      {/* Bind list */}
      <Show
        when={props.binds.length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No binds match the current filters
          </div>
        }
      >
        <For each={props.binds}>
          {(bind) => (
            <div class="sg-bind-row" title={bind.description}>
              <span
                class="font-mono text-xs font-semibold px-1.5 py-0.5 rounded text-center"
                style={{
                  background: "color-mix(in oklch, var(--sg-stat-border) 40%, transparent)",
                  color: "var(--sg-text-bright)",
                }}
              >
                {bind.key}
              </span>
              <span class="font-mono text-xs text-[var(--sg-text-dim)] truncate" title={bind.command}>
                {bind.command}
              </span>
              <span
                class="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: CATEGORY_COLORS[bind.category] ?? "var(--sg-text-dim)" }}
              >
                {bind.category === "weapons" ? bind.label : bind.category}
              </span>
              <span class="text-[10px] text-[var(--sg-section-label)] truncate">
                {bind.sourceFile}
              </span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
