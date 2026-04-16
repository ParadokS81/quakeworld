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

interface ConfigTeamplayMacrosProps {
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
const GROUP_ORDER = [
  "Item Names",
  "Item Need Amounts",
  "Location Names",
  "Teamplay Communications",
  "User Created",
];

const USER_CREATED_GROUP = "User Created";

function buildTooltip(macro: MacroEntry): string {
  const parts = [macro.description];
  if (macro.defaultValue) parts.push(`Default: ${macro.defaultValue}`);
  return parts.filter(Boolean).join("\n");
}

export default function ConfigTeamplayMacros(props: ConfigTeamplayMacrosProps) {
  const macros = createMemo((): MacroEntry[] => {
    const db = loadDatabase();
    const entries: MacroEntry[] = [];
    const seenNames = new Set<string>();

    // Built-in teamplay macros from the database (category === "Teamplay")
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

    // User-created variables (declared via `set`) -- merged from both sides
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
        group: USER_CREATED_GROUP,
        defaultValue: "",
        description: "User-created variable (declared via `set`)",
        userValue,
        compareValue,
        isSet,
        // User-created have no engine default -- any value counts as customized
        isCustomized: isSet,
        compareIsSet,
        compareIsCustomized: compareIsSet,
      });
    }

    return entries;
  });

  const filtered = createMemo(() => {
    const q = props.search.trim().toLowerCase();

    return macros().filter((m) => {
      if (props.hideDefaults) {
        const leftIsDefault = !m.isSet || !m.isCustomized;
        const rightIsDefault =
          !props.isCompareMode || !m.compareIsSet || !m.compareIsCustomized;
        if (leftIsDefault && rightIsDefault) return false;
      }

      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !m.defaultValue.toLowerCase().includes(q) &&
        !(m.userValue?.toLowerCase().includes(q)) &&
        !(m.compareValue?.toLowerCase().includes(q))
      )
        return false;

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

    return GROUP_ORDER.filter((g) => groups.has(g))
      .map((g) => ({ group: g, entries: groups.get(g)! }))
      .concat(
        Array.from(groups.entries())
          .filter(([g]) => !GROUP_ORDER.includes(g))
          .map(([g, entries]) => ({ group: g, entries })),
      );
  });

  const totalCount = () => macros().length;
  const shownCount = () => filtered().length;
  const customizedCount = () =>
    macros().filter((m) => m.isCustomized || m.compareIsCustomized).length;

  return (
    <div>
      <div class="sg-category-group-header">
        Teamplay Macros
        <span class="text-[11px] font-normal text-[var(--sg-section-label)] ml-2">
          {customizedCount()} customized / {shownCount()} shown / {totalCount()} total
        </span>
      </div>

      {/* Column headers */}
      <div
        class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          Macro
        </span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {props.isCompareMode ? "Your Config" : "Value"}
        </span>
        <Show when={props.isCompareMode}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
            Comparison
          </span>
        </Show>
      </div>

      <Show
        when={grouped().length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            {props.hideDefaults
              ? "All macros are at default values"
              : "No macros found"}
          </div>
        }
      >
        <For each={grouped()}>
          {(group) => (
            <>
              <div
                class="sg-domain-bind-category"
                style="color: var(--sg-section-label)"
              >
                {group.group}
              </div>
              <For each={group.entries}>
                {(macro) => {
                  const anyCustomized =
                    macro.isCustomized || macro.compareIsCustomized;
                  return (
                    <div
                      class={
                        props.isCompareMode
                          ? "sg-macro-row-cmp"
                          : "sg-macro-row"
                      }
                      title={buildTooltip(macro)}
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

                      <span
                        class={`text-[13px] ${
                          macro.isCustomized
                            ? "text-[var(--sg-text-bright)] font-semibold"
                            : "text-[var(--sg-section-label)]"
                        }`}
                      >
                        {macro.isSet
                          ? macro.userValue
                          : macro.defaultValue || "\u2014"}
                      </span>

                      <Show when={props.isCompareMode}>
                        <span
                          class={`text-[13px] ${
                            macro.compareIsCustomized
                              ? "text-[var(--sg-text-bright)] font-semibold"
                              : "text-[var(--sg-section-label)]"
                          }`}
                        >
                          {macro.compareIsSet
                            ? macro.compareValue
                            : macro.defaultValue || "\u2014"}
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
