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
  movement: "oklch(0.7 0.15 220)",   // blue
  weapons: "oklch(0.7 0.15 30)",     // warm orange
  teamsay: "oklch(0.65 0.15 180)",   // teal
  unresolved: "oklch(0.75 0.18 85)", // yellow
  misc: "oklch(0.6 0.03 260)",       // neutral grey-blue
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
          <div class="sg-cv-bind-row text-[11px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
            <span />
            <span>Key</span>
            <span>Command</span>
            <span>Type</span>
          </div>
        }
      >
        <div class="sg-cv-bind-row-cmp text-[11px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
          <span />
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
            // For modifier-combo entries, expand to the press/release alias bodies.
            // For normal binds, expand to the command's alias chain.
            const chain = () => {
              if (bind.modifierAlias) {
                return getChain(bind.modifierAlias, props.primaryAliases);
              }
              return getChain(bind.command, props.primaryAliases);
            };
            const releaseChain = () => {
              if (!bind.modifierAlias) return [];
              const releaseName = "-" + bind.modifierAlias.slice(1);
              return getChain(releaseName, props.primaryAliases);
            };
            const compareChain = () => getChain(bind.compareCommand ?? "", props.compareAliases);
            const hasChain = () => chain().length > 0 || compareChain().length > 0 || releaseChain().length > 0;

            return (
              <>
                <Show
                  when={props.isCompareMode}
                  fallback={
                    <div
                      class="sg-cv-bind-row"
                      classList={{ "cursor-pointer": hasChain() || bind.category === "unresolved" }}
                      title={bind.description}
                      onClick={() => (hasChain() || bind.category === "unresolved") && toggleExpand(bind.key)}
                    >
                      <span class="text-[11px] text-[var(--sg-section-label)]">
                        {bind.category === "unresolved"
                          ? "⚠"
                          : hasChain() ? (isExpanded() ? "▾" : "▸") : ""}
                      </span>
                      <span
                        class="font-mono text-xs font-semibold px-1.5 py-0.5 rounded text-center border"
                        style={{
                          background: "color-mix(in oklch, var(--sg-stat-border) 40%, transparent)",
                          "border-color": `color-mix(in oklch, ${CATEGORY_COLORS[bind.category] ?? "var(--sg-stat-border)"} 50%, var(--sg-stat-border))`,
                          color: CATEGORY_COLORS[bind.category] ?? "var(--sg-text-bright)",
                        }}
                      >
                        {bind.key}
                      </span>
                      <span class="text-[13px] text-[var(--sg-text-bright)] font-semibold truncate" title={bind.command}>
                        {bind.command}
                      </span>
                      <span
                        class="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: CATEGORY_COLORS[bind.category] ?? "var(--sg-text-dim)" }}
                      >
                        {bind.category === "weapons" ? bind.label : bind.category}
                      </span>
                    </div>
                  }
                >
                  <div
                    class="sg-cv-bind-row-cmp"
                    classList={{
                      "cursor-pointer": hasChain() || bind.category === "unresolved",
                    }}
                    title={bind.description || bind.compareDescription}
                    onClick={() => (hasChain() || bind.category === "unresolved") && toggleExpand(bind.key)}
                  >
                    <span class="text-[11px] text-[var(--sg-section-label)]">
                      {bind.category === "unresolved"
                        ? "⚠"
                        : hasChain() ? (isExpanded() ? "▾" : "▸") : ""}
                    </span>
                    <span
                      class="font-mono text-xs font-semibold px-1.5 py-0.5 rounded text-center border"
                      style={{
                        background: "color-mix(in oklch, var(--sg-stat-border) 40%, transparent)",
                        "border-color": `color-mix(in oklch, ${CATEGORY_COLORS[bind.category] ?? "var(--sg-stat-border)"} 50%, var(--sg-stat-border))`,
                        color: CATEGORY_COLORS[bind.category] ?? "var(--sg-text-bright)",
                      }}
                    >
                      {bind.key}
                    </span>

                    <div class="grid min-w-0" style={{ "grid-template-columns": "90px 1fr" }}>
                      <Show when={bind.hasLeft} fallback={
                        <span class="text-[11px] text-[var(--sg-section-label)] italic col-span-2">—</span>
                      }>
                        <span
                          class="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: CATEGORY_COLORS[bind.category] ?? "var(--sg-text-dim)" }}
                        >
                          {bind.label}
                        </span>
                        <span class="text-[13px] text-[var(--sg-text-bright)] font-semibold truncate">
                          {bind.command}
                        </span>
                      </Show>
                    </div>

                    <div class="grid min-w-0" style={{ "grid-template-columns": "90px 1fr" }}>
                      <Show when={bind.hasRight} fallback={
                        <span class="text-[11px] text-[var(--sg-section-label)] italic col-span-2">—</span>
                      }>
                        <span
                          class="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: CATEGORY_COLORS[bind.compareCategory ?? "misc"] ?? "var(--sg-text-dim)" }}
                        >
                          {bind.compareLabel}
                        </span>
                        <span class="text-[13px] text-[var(--sg-text-bright)] font-semibold truncate">
                          {bind.compareDescription}
                        </span>
                      </Show>
                    </div>
                  </div>
                </Show>

                {/* Expanded alias chains */}
                <Show when={isExpanded()}>
                  <div class="sg-domain-bind-expanded">
                    <Show when={bind.category === "unresolved"}>
                      <div class="text-[11px] px-3 py-1.5 mb-1 rounded"
                        style={{
                          background: "color-mix(in oklch, oklch(0.75 0.18 85) 15%, transparent)",
                          color: "oklch(0.75 0.18 85)",
                        }}
                      >
                        Command <span class="font-mono font-bold">{bind.label}</span> was not found
                        as an alias in the config chain or as a known engine command. This bind will
                        likely not work during gameplay.
                      </div>
                    </Show>
                    <Show when={bind.modifierAlias} fallback={
                      <>
                        <Show when={chain().length > 0}>
                          <Show when={props.isCompareMode}>
                            <div class="text-[11px] text-[var(--sg-section-label)] uppercase tracking-wide px-4 pt-2 pb-1">Your config</div>
                          </Show>
                          <AliasChainView chain={chain()} />
                        </Show>
                        <Show when={props.isCompareMode && compareChain().length > 0}>
                          <div class="text-[11px] text-[var(--sg-section-label)] uppercase tracking-wide px-4 pt-2 pb-1">Comparison</div>
                          <AliasChainView chain={compareChain()} />
                        </Show>
                      </>
                    }>
                      {/* Modifier combo: show press and release alias chains */}
                      <Show when={chain().length > 0}>
                        <div class="text-[11px] text-[var(--sg-section-label)] uppercase tracking-wide px-4 pt-2 pb-1">
                          On press ({bind.modifierAlias})
                        </div>
                        <AliasChainView chain={chain()} />
                      </Show>
                      <Show when={releaseChain().length > 0}>
                        <div class="text-[11px] text-[var(--sg-section-label)] uppercase tracking-wide px-4 pt-2 pb-1">
                          On release ({"-" + (bind.modifierAlias ?? "").slice(1)})
                        </div>
                        <AliasChainView chain={releaseChain()} />
                      </Show>
                    </Show>
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
