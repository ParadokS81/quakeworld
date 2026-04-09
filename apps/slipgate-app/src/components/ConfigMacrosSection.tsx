import { createMemo, For, Show } from "solid-js";
import { loadDatabase } from "qw-config";

interface MacroEntry {
  name: string;
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
  hideDefaults: boolean;
  isCompareMode: boolean;
  search: string;
}

/** Group display order */
const GROUP_ORDER = ["Item Names", "Item Need Amounts", "Location Names", "Teamplay Communications"];

export default function ConfigMacrosSection(props: ConfigMacrosSectionProps) {
  const macros = createMemo((): MacroEntry[] => {
    const db = loadDatabase();
    const entries: MacroEntry[] = [];

    for (const [name, info] of db.clients.ezquake.entries()) {
      if (info.category !== "Teamplay") continue;

      const defaultValue = info.default ?? "";
      const userValue = props.primaryCvars[name];
      const compareValue = props.compareCvars?.get(name);
      const isSet = userValue !== undefined;
      const isCustomized = isSet && userValue !== defaultValue;
      const compareIsSet = compareValue !== undefined;
      const compareIsCustomized = compareIsSet && compareValue !== defaultValue;

      entries.push({
        name,
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

    return entries;
  });

  const filtered = createMemo(() => {
    const q = props.search.trim().toLowerCase();

    return macros().filter((m) => {
      // Hide defaults: skip entries where user hasn't set it or value matches default
      if (props.hideDefaults) {
        const leftIsDefault = !m.isSet || !m.isCustomized;
        const rightIsDefault = !props.isCompareMode || !m.compareIsSet || !m.compareIsCustomized;
        if (leftIsDefault && rightIsDefault) return false;
      }

      // Search filter
      if (q && !m.name.includes(q) && !m.defaultValue.toLowerCase().includes(q)
        && !(m.userValue?.toLowerCase().includes(q))
        && !(m.compareValue?.toLowerCase().includes(q))) return false;

      return true;
    });
  });

  // Group by sub-group for display
  const grouped = createMemo(() => {
    const groups = new Map<string, MacroEntry[]>();
    for (const m of filtered()) {
      const arr = groups.get(m.group) ?? [];
      arr.push(m);
      groups.set(m.group, arr);
    }

    // Sort groups by defined order
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
        <span class="text-[10px] font-normal text-[var(--sg-section-label)] ml-2">
          {customizedCount()} customized / {shownCount()} shown / {totalCount()} total
        </span>
      </div>

      {/* Column headers */}
      <div
        class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[10px] uppercase tracking-wide text-[var(--sg-section-label)]">Name</span>
        <span class="text-[10px] uppercase tracking-wide text-[var(--sg-section-label)]">Default</span>
        <span class="text-[10px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {props.isCompareMode ? "Your Value" : "Value"}
        </span>
        <Show when={props.isCompareMode}>
          <span class="text-[10px] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
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
                {(macro) => (
                  <div
                    class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
                    classList={{ "sg-macro-customized": macro.isCustomized || macro.compareIsCustomized }}
                    title={macro.description}
                  >
                    <span class="font-mono text-[11px] text-[var(--sg-text-bright)]">
                      {macro.name}
                    </span>

                    <span class="font-mono text-[11px] text-[var(--sg-section-label)]">
                      {macro.defaultValue || "—"}
                    </span>

                    <span
                      class="font-mono text-[11px]"
                      classList={{
                        "text-[var(--color-warning)]": macro.isCustomized,
                        "text-[var(--sg-text-dim)]": !macro.isCustomized,
                      }}
                    >
                      {macro.isSet ? macro.userValue : (macro.defaultValue || "—")}
                    </span>

                    <Show when={props.isCompareMode}>
                      <span
                        class="font-mono text-[11px]"
                        classList={{
                          "text-[var(--color-warning)]": macro.compareIsCustomized,
                          "text-[var(--sg-text-dim)]": !macro.compareIsCustomized,
                        }}
                      >
                        {macro.compareIsSet ? macro.compareValue : (macro.defaultValue || "—")}
                      </span>
                    </Show>
                  </div>
                )}
              </For>
            </>
          )}
        </For>
      </Show>
    </div>
  );
}
