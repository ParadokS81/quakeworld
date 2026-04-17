import { createMemo, For, Show } from "solid-js";
import { lookupCvar } from "qw-config";
import type { PlayerState, TraceStep } from "../lib/simulator/index.js";
import { createDefaultPlayerState, deriveNeed, evaluateTeamsay } from "../lib/simulator/index.js";
import { buildSpanTree, type SpanColor } from "../lib/prettyRender.js";
import type { RuntimeResolver } from "../lib/runtimeResolver.js";

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

function cvarMap(rec?: Record<string, string>): Map<string, string> {
  const m = new Map<string, string>();
  if (!rec) return m;
  for (const [k, v] of Object.entries(rec)) m.set(k, v);
  return m;
}

function colorStyle(c: SpanColor): { class?: string; style?: Record<string, string> } {
  if (c.kind === "qw") return { class: c.class };
  if (c.kind === "hex") return { style: { color: c.value } };
  return { class: "qw-default" };
}

function buildIssueMap(issues: Array<{ kind: string; detail: string }>): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const iss of issues) {
    const match = iss.detail.match(/\$\w+|%\w+/);
    if (!match) continue;
    const key = match[0];
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(`${iss.kind}: ${iss.detail}`);
  }
  return m;
}

function PrettyCmd(props: {
  cmd: string;
  state: PlayerState;
  cvars: Map<string, string>;
  resolver: RuntimeResolver | null;
  activeBranches?: Map<string, "then" | "else">;
}) {
  const result = () => buildSpanTree(props.cmd, {
    state: props.state,
    cvars: props.cvars,
    resolver: props.resolver,
    activeBranches: props.activeBranches,
  });
  const issueMap = () => buildIssueMap(result().issues);
  return (
    <span class="sg-alias-chain-cmd">
      <For each={result().spans}>
        {(s) => {
          const cs = colorStyle(s.color);
          const classes = [
            `sg-span-${s.origin}`,
            cs.class,
            s.branchInactive ? "sg-span-branch-inactive" : null,
          ].filter(Boolean).join(" ");
          const related = s.rawToken ? issueMap().get(s.rawToken) ?? [] : [];
          const fullTooltip = [s.tooltip, ...related].filter(Boolean).join("\n");
          return (
            <span
              class={classes}
              style={cs.style}
              title={fullTooltip || undefined}
            >{s.text}</span>
          );
        }}
      </For>
    </span>
  );
}

export function AliasChainView(props: {
  chain: AliasChainEntry[];
  label?: string;
  ownerClass?: string;
  macroRefs?: Set<string>;
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
  mode?: "pretty" | "raw";
  playerState?: PlayerState;
  resolver?: RuntimeResolver | null;
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

  const trace = createMemo<TraceStep[]>(() => {
    if ((props.mode ?? "pretty") !== "pretty") return [];
    if (!props.playerState || !props.primaryCvars) return [];
    if (props.chain.length === 0) return [];
    // IMPORTANT: feed the evaluator only the ROOT alias body. Earlier we
    // joined every chain entry with "; " which flattened the tree --
    // evaluateTeamsay walked each entry as a top-level segment, so every
    // direct say_team leaf body in the chain fired regardless of
    // conditionals, causing 8-of-9 rows to highlight for conditional
    // chains like Report. The nested entries are still reachable via the
    // aliases map; the evaluator follows them from the root.
    const root = props.chain.find((e) => e.depth === 0) ?? props.chain[0];
    const cvars = cvarMap(props.primaryCvars);
    // Pre-populate $need with the live-derived under-threshold list, matching
    // ezQuake's tp_msg_need which sets the $need cvar internally before
    // executing the need-message alias chain. Without this, the common
    // `if ('$need' == '$tp_name_nothing')` guard evaluates true under default
    // state and the `.msg.need` branch never fires in the trace.
    cvars.set("need", deriveNeed(props.playerState, cvars));
    const aliases = new Map<string, string>();
    for (const e of props.chain) aliases.set(e.name, e.command);
    return evaluateTeamsay(root.command, props.playerState, cvars, aliases).trace;
  });

  const activeBranches = createMemo(() => {
    const m = new Map<string, "then" | "else">();
    for (const step of trace()) {
      if (step.kind === "condition" && step.activeBranch) {
        m.set(step.text.trim(), step.activeBranch);
      }
    }
    return m;
  });

  // Commands (seg text) of say/say_team/tp_msg_* leaves that fired under the
  // current PlayerState. Used to highlight the alias row that produced the
  // active chat output.
  const activeLeafCommands = createMemo(() => {
    const set = new Set<string>();
    for (const step of trace()) {
      if (step.kind === "leaf" && step.text) set.add(step.text.trim());
    }
    return set;
  });

  return (
    <Show when={props.chain.length > 0 || macroDeps().length > 0}>
      <div class={`sg-alias-chain ${props.ownerClass ?? ""}`}>
        <Show when={props.label}>
          <div class="sg-alias-chain-label">{props.label}</div>
        </Show>
        <For each={props.chain}>
          {(entry) => {
            const isActive = () => activeLeafCommands().has(entry.command.trim());
            return (
              <div
                class={`sg-alias-chain-entry ${isActive() ? "sg-alias-chain-entry-active" : ""}`}
                style={{ "padding-left": `${12 + entry.depth * 16}px` }}
                title={isActive() ? "Active output under current player state" : undefined}
              >
                <span class="sg-alias-chain-name">{entry.name}</span>
                <Show
                  when={(props.mode ?? "pretty") === "pretty"}
                  fallback={<span class="sg-alias-chain-cmd">{entry.command}</span>}
                >
                  <PrettyCmd
                    cmd={entry.command}
                    state={props.playerState ?? createDefaultPlayerState()}
                    cvars={cvarMap(props.primaryCvars)}
                    resolver={props.resolver ?? null}
                    activeBranches={activeBranches()}
                  />
                </Show>
              </div>
            );
          }}
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
