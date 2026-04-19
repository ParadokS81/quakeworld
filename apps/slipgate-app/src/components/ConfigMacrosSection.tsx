import { createMemo, For, Show } from "solid-js";
import { loadDatabase, loadEzQuakeMacros } from "qw-config";

const TYPE_LABELS: Record<string, string> = {
  string: "Text value (words, names, color codes)",
  boolean: "On/off toggle (0 = off, 1 = on)",
  float: "Decimal number (e.g. 0.5, 2.0, 100)",
  integer: "Whole number (e.g. 0, 1, 50, 120)",
  enum: "One of a set of predefined values",
};

interface MacroEntry {
  name: string;
  type: string;
  group: string;
  defaultValue: string;
  description: string;
  userValue?: string;
  compareValue?: string;
  isSet: boolean;
  isCustomized: boolean;
  compareIsSet: boolean;
  compareIsCustomized: boolean;
}

interface ConfigMacrosSectionProps {
  primaryCvars: Record<string, string>;
  compareCvars?: Map<string, string>;
  /** Cvar names declared via `set` in primary config (user-created variables) */
  primaryUserCreated: Set<string>;
  /** Cvar names declared via `set` in compare config */
  compareUserCreated?: Set<string>;
  hideDefaults: boolean;
  isCompareMode: boolean;
  search: string;
}

/** Group display order */
const GROUP_ORDER = ["Item Names", "Item Need Amounts", "Location Names", "Teamplay Communications", "User Created", "Runtime Macros"];

const USER_CREATED_GROUP = "User Created";

function buildTooltip(macro: MacroEntry): string {
  const parts = [macro.description];
  if (macro.defaultValue) parts.push(`Default: ${macro.defaultValue}`);
  const typeLabel = TYPE_LABELS[macro.type];
  if (typeLabel) parts.push(`Type: ${macro.type} — ${typeLabel}`);
  return parts.filter(Boolean).join("\n");
}

export default function ConfigMacrosSection(props: ConfigMacrosSectionProps) {
  const macros = createMemo((): MacroEntry[] => {
    const db = loadDatabase();
    const entries: MacroEntry[] = [];
    const seenNames = new Set<string>();

    // Built-in teamplay macros from the database
    for (const [name, info] of db.clients.ezquake.entries()) {
      if (info.category !== "Teamplay") continue;
      seenNames.add(name);

      const defaultValue = info.default ?? "";
      const userValue = props.primaryCvars[name];
      const compareValue = props.compareCvars?.get(name);
      const isSet = userValue !== undefined;
      const isCustomized = isSet && userValue !== defaultValue;
      const compareIsSet = compareValue !== undefined;
      const compareIsCustomized = compareIsSet && compareValue !== defaultValue;

      entries.push({
        name,
        type: info.type ?? "string",
        group: info.group ?? "",
        defaultValue,
        description: info.description ?? "",
        userValue,
        compareValue,
        isSet,
        isCustomized,
        compareIsSet,
        compareIsCustomized,
      });
    }

    // User-created variables (declared via `set` in the config) — merged from both sides
    const userCreatedNames = new Set<string>([
      ...props.primaryUserCreated,
      ...(props.compareUserCreated ?? []),
    ]);
    for (const name of userCreatedNames) {
      if (seenNames.has(name)) continue;
      const userValue = props.primaryCvars[name];
      const compareValue = props.compareCvars?.get(name);
      const isSet = userValue !== undefined;
      const compareIsSet = compareValue !== undefined;
      entries.push({
        name,
        type: "string",
        group: USER_CREATED_GROUP,
        defaultValue: "",
        description: "User-created variable (declared via `set`)",
        userValue,
        compareValue,
        isSet,
        // User-created have no engine default — any value counts as "customized"
        isCustomized: isSet,
        compareIsSet,
        compareIsCustomized: compareIsSet,
      });
    }

    // Runtime %-prefix macros (engine-provided expansion tokens)
    const runtimeMacros = loadEzQuakeMacros();
    for (const [name, info] of runtimeMacros.macros.entries()) {
      const displayName = `%${name}`;
      entries.push({
        name: displayName,
        type: "string",
        group: "Runtime Macros",
        defaultValue: "",
        description: info.description || "Engine-provided runtime expansion token",
        userValue: undefined,
        compareValue: undefined,
        isSet: false,
        isCustomized: false,
        compareIsSet: false,
        compareIsCustomized: false,
      });
    }

    return entries;
  });

  const filtered = createMemo(() => {
    const q = props.search.trim().toLowerCase();

    return macros().filter((m) => {
      // Runtime macros are a reference catalog — always visible regardless of hideDefaults,
      // because they have no user value to customize (isSet is always false).
      if (m.group !== "Runtime Macros") {
        if (props.hideDefaults) {
          const leftIsDefault = !m.isSet || !m.isCustomized;
          const rightIsDefault = !props.isCompareMode || !m.compareIsSet || !m.compareIsCustomized;
          if (leftIsDefault && rightIsDefault) return false;
        }
      }

      if (q && !m.name.includes(q) && !m.defaultValue.toLowerCase().includes(q)
        && !(m.userValue?.toLowerCase().includes(q))
        && !(m.compareValue?.toLowerCase().includes(q))) return false;

      return true;
    });
  });

  const grouped = createMemo(() => {
    const groups = new Map<string, MacroEntry[]>();
    for (const m of filtered()) {
      const arr = groups.get(m.group) ?? [];
      arr.push(m);
      groups.set(m.group, arr);
    }

    return GROUP_ORDER
      .filter((g) => groups.has(g))
      .map((g) => ({ group: g, entries: groups.get(g)! }))
      .concat(
        Array.from(groups.entries())
          .filter(([g]) => !GROUP_ORDER.includes(g))
          .map(([g, entries]) => ({ group: g, entries })),
      );
  });

  const totalCount = () => macros().length;
  const shownCount = () => filtered().length;
  const customizedCount = () => macros().filter((m) => m.isCustomized || m.compareIsCustomized).length;

  return (
    <div>
      <div class="sg-category-group-header">
        Macros
        <span class="text-[0.6875rem] font-normal text-[var(--sg-section-label)] ml-2">
          {customizedCount()} customized / {shownCount()} shown / {totalCount()} total
        </span>
      </div>

      {/* Column headers */}
      <div
        class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Macro</span>
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">
          {props.isCompareMode ? "Your Config" : "Value"}
        </span>
        <Show when={props.isCompareMode}>
          <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <Show
        when={grouped().length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            {props.hideDefaults ? "All macros are at default values" : "No macros found"}
          </div>
        }
      >
        <For each={grouped()}>
          {(group) => (
            <>
              <div class="sg-domain-bind-category" style="color: var(--sg-section-label)">
                {group.group}
              </div>
              <For each={group.entries}>
                {(macro) => {
                  const anyCustomized = macro.isCustomized || macro.compareIsCustomized;
                  return (
                    <div
                      class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
                      title={buildTooltip(macro)}
                    >
                      <span
                        class={`text-[0.8125rem] ${
                          anyCustomized
                            ? "text-[var(--color-warning)]"
                            : "text-[var(--sg-section-label)]"
                        }`}
                      >
                        {macro.name}
                      </span>

                      <span
                        class={`text-[0.8125rem] ${
                          macro.isCustomized
                            ? "text-[var(--sg-text-bright)] font-semibold"
                            : "text-[var(--sg-section-label)]"
                        }`}
                      >
                        {macro.isSet ? macro.userValue : (macro.defaultValue || "—")}
                      </span>

                      <Show when={props.isCompareMode}>
                        <span
                          class={`text-[0.8125rem] ${
                            macro.compareIsCustomized
                              ? "text-[var(--sg-text-bright)] font-semibold"
                              : "text-[var(--sg-section-label)]"
                          }`}
                        >
                          {macro.compareIsSet ? macro.compareValue : (macro.defaultValue || "—")}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </>
          )}
        </For>
      </Show>
    </div>
  );
}
