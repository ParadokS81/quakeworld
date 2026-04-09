import { createSignal, For, Show } from "solid-js";
import type { EnrichedBind } from "./configMerger";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";

interface ConfigBindsSectionProps {
  binds: EnrichedBind[];
  isCompareMode?: boolean;
  primaryAliases?: Record<string, string>;
  compareAliases?: Record<string, string>;
}

const CATEGORY_COLORS: Record<string, string> = {
  movement: "oklch(0.7 0.15 220)",  // blue
  weapons: "oklch(0.7 0.15 30)",    // warm orange
  teamsay: "oklch(0.65 0.15 180)",  // teal
  misc: "oklch(0.6 0.03 260)",      // neutral grey-blue
};

export default function ConfigBindsSection(props: ConfigBindsSectionProps) {
  const [expanded, setExpanded] = createSignal<string | null>(null);

  function toggleExpand(key: string) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  function getChain(command: string, aliases?: Record<string, string>) {
    if (!aliases || !command) return [];
    return resolveAliasChain(command, aliases);
  }

  return (
    <div>
      <div class="sg-category-group-header">Binds</div>

      {/* Column headers */}
      <Show
        when={props.isCompareMode}
        fallback={
          <div class="sg-cv-bind-row text-[10px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
            <span>Key</span>
            <span>Command</span>
            <span>Type</span>
            <span>Source</span>
          </div>
        }
      >
        <div class="sg-cv-bind-row-cmp text-[10px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
          <span>Key</span>
          <span>Your Config</span>
          <span>Comparison</span>
        </div>
      </Show>

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
          {(bind) => {
            const isExpanded = () => expanded() === bind.key;
            const chain = () => getChain(bind.command, props.primaryAliases);
            const hasChain = () => chain().length > 0;

            return (
              <>
                <Show
                  when={props.isCompareMode}
                  fallback={
                    <div
                      class="sg-cv-bind-row"
                      classList={{ "cursor-pointer": hasChain() }}
                      title={bind.description}
                      onClick={() => hasChain() && toggleExpand(bind.key)}
                    >
                      <span
                        class="font-mono text-xs font-semibold px-1.5 py-0.5 rounded text-center"
                        style={{
                          background: "color-mix(in oklch, var(--sg-stat-border) 40%, transparent)",
                          color: "var(--sg-text-bright)",
                        }}
                      >
                        {hasChain() ? (isExpanded() ? "▾ " : "▸ ") : ""}{bind.key}
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
                  }
                >
                  <div
                    class="sg-cv-bind-row-cmp"
                    classList={{
                      "sg-cv-bind-only-left": bind.hasLeft && !bind.hasRight,
                      "sg-cv-bind-only-right": !bind.hasLeft && bind.hasRight,
                      "sg-cv-bind-diff": bind.hasLeft && bind.hasRight && bind.label !== bind.compareLabel,
                      "cursor-pointer": hasChain(),
                    }}
                    title={bind.description || bind.compareDescription}
                    onClick={() => hasChain() && toggleExpand(bind.key)}
                  >
                    <span
                      class="font-mono text-xs font-semibold px-1.5 py-0.5 rounded text-center"
                      style={{
                        background: "color-mix(in oklch, var(--sg-stat-border) 40%, transparent)",
                        color: "var(--sg-text-bright)",
                      }}
                    >
                      {hasChain() ? (isExpanded() ? "▾ " : "▸ ") : ""}{bind.key}
                    </span>

                    <div class="flex items-center gap-2 min-w-0">
                      <Show when={bind.hasLeft}>
                        <span
                          class="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                          style={{ color: CATEGORY_COLORS[bind.category] ?? "var(--sg-text-dim)" }}
                        >
                          {bind.label}
                        </span>
                        <span class="font-mono text-[10px] text-[var(--sg-text-dim)] truncate">
                          {bind.command}
                        </span>
                      </Show>
                      <Show when={!bind.hasLeft}>
                        <span class="text-[10px] text-[var(--sg-section-label)] italic">—</span>
                      </Show>
                    </div>

                    <div class="flex items-center gap-2 min-w-0">
                      <Show when={bind.hasRight}>
                        <span
                          class="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                          style={{ color: CATEGORY_COLORS[bind.compareCategory ?? "misc"] ?? "var(--sg-text-dim)" }}
                        >
                          {bind.compareLabel}
                        </span>
                        <span class="font-mono text-[10px] text-[var(--sg-text-dim)] truncate">
                          {bind.compareDescription}
                        </span>
                      </Show>
                      <Show when={!bind.hasRight}>
                        <span class="text-[10px] text-[var(--sg-section-label)] italic">—</span>
                      </Show>
                    </div>
                  </div>
                </Show>

                {/* Expanded alias chain */}
                <Show when={isExpanded()}>
                  <div class="sg-domain-bind-expanded">
                    <AliasChainView chain={chain()} />
                  </div>
                </Show>
              </>
            );
          }}
        </For>
      </Show>
    </div>
  );
}
