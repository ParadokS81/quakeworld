import { createSignal, For, Show } from "solid-js";
import type { EnrichedAlias } from "./configMerger";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";
import type { AliasChainResult } from "./AliasChainResolver";

interface ConfigAliasesSectionProps {
  aliases: EnrichedAlias[];
  allAliases?: Record<string, string>;
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
  aliasChainMode?: "pretty" | "raw";
}

export default function ConfigAliasesSection(props: ConfigAliasesSectionProps) {
  const [expanded, setExpanded] = createSignal<string | null>(null);

  function toggleExpand(name: string) {
    setExpanded((prev) => (prev === name ? null : name));
  }

  function getChain(command: string): AliasChainResult {
    if (!props.allAliases) return { chain: [], macroRefs: new Set() };
    return resolveAliasChain(command, props.allAliases);
  }

  return (
    <div>
      <div class="sg-category-group-header">Aliases</div>

      <div class="sg-alias-row text-[11px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
        <span>Name</span>
        <span>Command</span>
        <span>Source</span>
      </div>

      <Show
        when={props.aliases.length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No aliases match the current filters
          </div>
        }
      >
        <For each={props.aliases}>
          {(alias) => {
            const isExpanded = () => expanded() === alias.name;
            const chain = () => getChain(alias.command);
            // Show expand toggle if command is long or has sub-aliases
            const isExpandable = () => alias.command.length > 60 || chain().chain.length > 0;

            return (
              <>
                <div
                  class="sg-alias-row"
                  classList={{ "cursor-pointer": isExpandable() }}
                  onClick={() => isExpandable() && toggleExpand(alias.name)}
                >
                  <span class="text-[13px] flex items-center gap-1" style={{ color: "oklch(0.65 0.15 180)" }}>
                    <span class="text-[11px] text-[var(--sg-section-label)] w-3">
                      {isExpandable() ? (isExpanded() ? "▾" : "▸") : ""}
                    </span>
                    {alias.name}
                  </span>
                  <span class="text-[13px] text-[var(--sg-text-dim)] truncate" title={alias.command}>
                    {alias.command}
                  </span>
                  <span class="text-[11px] text-[var(--sg-section-label)] truncate">
                    {alias.sourceFile}
                  </span>
                </div>

                <Show when={isExpanded()}>
                  <div class="sg-domain-bind-expanded">
                    {/* Full command (untruncated) */}
                    <div class="sg-alias-chain">
                      <div class="sg-alias-chain-entry" style="padding-left: 12px">
                        <span class="sg-alias-chain-cmd" style="word-break: break-all">
                          {alias.command}
                        </span>
                      </div>
                    </div>
                    {/* Sub-alias chain */}
                    <AliasChainView
                      chain={chain().chain}
                      macroRefs={chain().macroRefs}
                      primaryCvars={props.primaryCvars}
                      hideDefaults={props.hideDefaults}
                      label="Alias chain"
                      mode={props.aliasChainMode}
                    />
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
