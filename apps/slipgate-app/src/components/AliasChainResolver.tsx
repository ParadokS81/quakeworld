import { For, Show } from "solid-js";

/* ─── Alias chain resolution ─────────────────────────────────────── */

export interface AliasChainEntry {
  name: string;
  command: string;
  depth: number;
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
): AliasChainEntry[] {
  const result: AliasChainEntry[] = [];
  const visited = new Set<string>();

  function resolve(cmd: string, depth: number) {
    if (depth >= maxDepth) return;

    const tokens = cmd.split(/[\s;]+/).filter(Boolean);
    const seen = new Set<string>();

    for (const token of tokens) {
      if (token.startsWith("'") || token.startsWith("$") || token.startsWith("%")) continue;
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
  return result;
}

/* ─── Shared alias chain display ─────────────────────────────────── */

export function AliasChainView(props: { chain: AliasChainEntry[]; label?: string }) {
  return (
    <Show when={props.chain.length > 0}>
      <div class="sg-alias-chain">
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
      </div>
    </Show>
  );
}
