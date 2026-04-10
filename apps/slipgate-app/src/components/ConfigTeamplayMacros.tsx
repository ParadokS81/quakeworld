import { createMemo, For, Show } from "solid-js";
import { lookupCvar } from "qw-config";

interface MacroEntry {
  name: string;
  defaultValue: string;
  userValue?: string;
  compareValue?: string;
  isCustomized: boolean;
  compareIsCustomized: boolean;
}

interface ConfigTeamplayMacrosProps {
  /** All team alias bodies to scan for variable references */
  primaryAliases: Record<string, string>;
  compareAliases?: Record<string, string>;
  /** User's cvar values (merged from config chain) */
  primaryCvars: Record<string, string>;
  compareCvars?: Map<string, string>;
  /** Teamsay bind keys to identify which aliases are team-related */
  teamsayAliasNames: Set<string>;
  /** User-created cvar names (declared via `set`) in primary */
  primaryUserCreated: Set<string>;
  /** User-created cvar names in compare */
  compareUserCreated?: Set<string>;
}

/**
 * Extract variable references ($name) from team-related aliases.
 * Includes any referenced cvar that is either:
 *   - a known cvar in the database (built-in, e.g. tp_name_*, loc_name_*)
 *   - a user-created variable declared via `set`
 * Typo refs (unknown names that were never declared) are excluded.
 */
function extractTeamMacros(
  aliases: Record<string, string>,
  teamsayAliasNames: Set<string>,
  userCreated: Set<string>,
): Set<string> {
  const macros = new Set<string>();

  // Collect all alias names reachable from teamsay binds
  const teamAliases = new Set<string>();
  const visited = new Set<string>();

  function collectReachable(name: string) {
    if (visited.has(name)) return;
    visited.add(name);
    const body = aliases[name];
    if (!body) return;
    teamAliases.add(name);

    // Find alias references in body
    const tokens = body.split(/[\s;]+/);
    for (const token of tokens) {
      if (token.startsWith("'") || token.startsWith("$") || token.startsWith("%")) continue;
      if (aliases[token] || aliases[token.toLowerCase()]) {
        collectReachable(token);
        collectReachable(token.toLowerCase());
      }
    }
  }

  // Start from teamsay-bound aliases
  for (const name of teamsayAliasNames) {
    collectReachable(name);
  }

  // Scan all team aliases for $variable references
  for (const name of teamAliases) {
    const body = aliases[name];
    if (!body) continue;

    const refs = body.matchAll(/\$(\w+)/g);
    for (const match of refs) {
      const varName = match[1];
      // Include if it's a known cvar in the database, or user-created via `set`
      if (userCreated.has(varName) || lookupCvar(varName)) {
        macros.add(varName);
      }
    }
  }

  return macros;
}

export default function ConfigTeamplayMacros(props: ConfigTeamplayMacrosProps) {
  const isCompare = () => props.compareCvars != null && props.compareCvars.size > 0;

  const macros = createMemo((): MacroEntry[] => {
    // Extract macro names from primary aliases
    const primaryMacroNames = extractTeamMacros(
      props.primaryAliases,
      props.teamsayAliasNames,
      props.primaryUserCreated,
    );

    // Also extract from compare aliases if available
    const compareMacroNames = props.compareAliases
      ? extractTeamMacros(
          props.compareAliases,
          props.teamsayAliasNames,
          props.compareUserCreated ?? new Set<string>(),
        )
      : new Set<string>();

    // Union of all macro names
    const allNames = new Set([...primaryMacroNames, ...compareMacroNames]);

    // Build entries
    const entries: MacroEntry[] = [];
    for (const name of allNames) {
      const info = lookupCvar(name);
      const defaultValue = info?.default ?? "";
      const userValue = props.primaryCvars[name];
      const compareValue = props.compareCvars?.get(name);
      const isCustomized = userValue !== undefined && userValue !== defaultValue;
      const compareIsCustomized = compareValue !== undefined && compareValue !== defaultValue;

      entries.push({
        name,
        defaultValue,
        userValue,
        compareValue,
        isCustomized,
        compareIsCustomized,
      });
    }

    // Sort: customized first, then alphabetically
    entries.sort((a, b) => {
      const aCustom = a.isCustomized || a.compareIsCustomized ? 0 : 1;
      const bCustom = b.isCustomized || b.compareIsCustomized ? 0 : 1;
      if (aCustom !== bCustom) return aCustom - bCustom;
      return a.name.localeCompare(b.name);
    });

    return entries;
  });

  const customCount = () => macros().filter((m) => m.isCustomized || m.compareIsCustomized).length;

  return (
    <div>
      <div class="sg-category-group-header">
        Teamplay Macros
        <span class="text-[10px] font-normal text-[var(--sg-section-label)] ml-2">
          {customCount()} customized / {macros().length} referenced
        </span>
      </div>

      {/* Column headers */}
      <div
        class={isCompare() ? "sg-macro-row-cmp" : "sg-macro-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Macro</span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Config" : "Value"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <Show
        when={macros().length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No teamplay macros referenced in aliases
          </div>
        }
      >
        <For each={macros()}>
          {(macro) => {
            const anyCustomized = macro.isCustomized || macro.compareIsCustomized;
            return (
              <div
                class={isCompare() ? "sg-macro-row-cmp" : "sg-macro-row"}
                title={(() => {
                  const info = lookupCvar(macro.name);
                  const parts = [info?.description ?? ""];
                  if (macro.defaultValue) parts.push(`Default: ${macro.defaultValue}`);
                  return parts.filter(Boolean).join("\n");
                })()}
              >
                <span
                  class={`text-[13px] ${
                    anyCustomized
                      ? "text-[var(--color-warning)]"
                      : "text-[var(--sg-section-label)]"
                  }`}
                >
                  {macro.name}
                </span>

                {/* User value */}
                <span
                  class={`text-[13px] ${
                    macro.isCustomized
                      ? "text-[var(--sg-text-bright)] font-semibold"
                      : "text-[var(--sg-section-label)]"
                  }`}
                >
                  {macro.userValue ?? (macro.defaultValue || "—")}
                </span>

                {/* Compare value */}
                <Show when={isCompare()}>
                  <span
                    class={`text-[13px] ${
                      macro.compareIsCustomized
                        ? "text-[var(--sg-text-bright)] font-semibold"
                        : "text-[var(--sg-section-label)]"
                    }`}
                  >
                    {macro.compareValue ?? (macro.defaultValue || "—")}
                  </span>
                </Show>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
}
