import { For, Show } from "solid-js";
import { lookupCvar } from "qw-config";

/* --- Alias chain resolution --- */

export interface AliasChainEntry {
  name: string;
  command: string;
  depth: number;
}

export interface AliasChainResult {
  chain: AliasChainEntry[];
  macroRefs: Set<string>;
}

/**
 * Resolve a bind command into its alias chain.
 * Scans every token in the command for alias references recursively.
 * Catches aliases inside if/then/else, compound commands, etc.
 */
export function resolveAliasChain(
  command: string,
  aliases: Record<string, string>,
  maxDepth = 8,
): AliasChainResult {
  const result: AliasChainEntry[] = [];
  const visited = new Set<string>();
  const macroRefs = new Set<string>();

  function resolve(cmd: string, depth: number) {
    if (depth >= maxDepth) return;

    // Extract $variable refs via regex -- handles embedded refs like $\$tpname, {&cf00$var&cfff}
    for (const match of cmd.matchAll(/\$(\w+)/g)) {
      macroRefs.add(match[1]);
    }

    const tokens = cmd.split(/[\s;]+/).filter(Boolean);
    const seen = new Set<string>();

    for (const token of tokens) {
      if (token.startsWith("'") || token.startsWith("%") || token.startsWith("$")) continue;
      if (token === "if" || token === "then" || token === "else" || token === "AND" || token === "OR") continue;
      if (/^[<>=!]+$/.test(token) || /^\d+$/.test(token)) continue;

      const aliasBody = aliases[token] ?? aliases[token.toLowerCase()];
      if (aliasBody && !visited.has(token) && !seen.has(token)) {
        seen.add(token);
        visited.add(token);
        result.push({ name: token, command: aliasBody, depth });
        resolve(aliasBody, depth + 1);
        visited.delete(token);
      }
    }
  }

  resolve(command, 0);
  return { chain: result, macroRefs };
}

/* --- Shared alias chain display --- */

interface MacroDepEntry {
  name: string;
  defaultValue: string | undefined;
  description: string | undefined;
  userValue: string | undefined;
  isCustomized: boolean;
}

export function AliasChainView(props: {
  chain: AliasChainEntry[];
  label?: string;
  ownerClass?: string;
  macroRefs?: Set<string>;
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
}) {
  function macroDeps(): MacroDepEntry[] {
    if (!props.macroRefs || !props.primaryCvars) return [];

    const entries: MacroDepEntry[] = [];
    for (const name of props.macroRefs) {
      const info = lookupCvar(name);
      const userValue = props.primaryCvars[name];

      // Only show refs that are known cvars or exist in the user's config
      if (!info && userValue === undefined) continue;

      const defaultValue = info?.default;
      const description = info?.description;
      const isCustomized = userValue !== undefined && userValue !== defaultValue;

      if (props.hideDefaults && !isCustomized) continue;

      entries.push({ name, defaultValue, description, userValue, isCustomized });
    }

    entries.sort((a, b) => {
      if (a.isCustomized !== b.isCustomized) return a.isCustomized ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  }

  return (
    <Show when={props.chain.length > 0}>
      <div class={`sg-alias-chain ${props.ownerClass ?? ""}`}>
        <Show when={props.label}>
          <div class="sg-alias-chain-label">{props.label}</div>
        </Show>
        <For each={props.chain}>
          {(entry) => (
            <div
              class="sg-alias-chain-entry"
              style={{ "padding-left": `${12 + entry.depth * 16}px` }}
            >
              <span class="sg-alias-chain-name">{entry.name}</span>
              <span class="sg-alias-chain-cmd">{entry.command}</span>
            </div>
          )}
        </For>
        <Show when={macroDeps().length > 0}>
          <div class="sg-alias-chain-macro-deps">
            <div class="sg-alias-chain-macro-deps-label">
              Macro Dependencies ({macroDeps().length})
            </div>
            <For each={macroDeps()}>
              {(dep) => {
                const displayValue = dep.isCustomized
                  ? dep.userValue
                  : (dep.defaultValue || dep.description || "\u2014");
                const tooltip = [dep.description, dep.defaultValue ? `Default: ${dep.defaultValue}` : ""]
                  .filter(Boolean).join("\n");
                return (
                  <div class="sg-macro-row" title={tooltip}>
                    <span
                      class={`sg-alias-chain-name ${
                        dep.isCustomized ? "" : "sg-alias-chain-name-dim"
                      }`}
                    >
                      {dep.name}
                    </span>
                    <span
                      class={
                        dep.isCustomized
                          ? "text-[var(--sg-text-bright)] font-semibold"
                          : "text-[var(--sg-section-label)]"
                      }
                    >
                      {displayValue}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
