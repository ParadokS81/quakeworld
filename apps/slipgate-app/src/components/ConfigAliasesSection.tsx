import { For, Show } from "solid-js";
import type { EnrichedAlias } from "./configMerger";

interface ConfigAliasesSectionProps {
  aliases: EnrichedAlias[];
}

export default function ConfigAliasesSection(props: ConfigAliasesSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div class="sg-config-section-header">
        Aliases ({props.aliases.length})
      </div>

      {/* Column headers */}
      <div class="sg-alias-row text-[10px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
        <span>Name</span>
        <span>Command</span>
        <span>Source</span>
      </div>

      {/* Alias list */}
      <Show
        when={props.aliases.length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No aliases match the current filters
          </div>
        }
      >
        <For each={props.aliases}>
          {(alias) => (
            <div class="sg-alias-row">
              <span class="font-mono text-xs" style={{ color: "oklch(0.65 0.15 180)" }}>
                {alias.name}
              </span>
              <span class="font-mono text-xs text-[var(--sg-text-dim)] truncate" title={alias.command}>
                {alias.command}
              </span>
              <span class="text-[10px] text-[var(--sg-section-label)] truncate">
                {alias.sourceFile}
              </span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
