import { createMemo, For, Show } from "solid-js";
import type { CvarInfo } from "qw-config";
import CvarRow from "./CvarRow";
import CvarTooltip from "./CvarTooltip";

export interface EnrichedCvar {
  name: string;
  value: string;
  info: CvarInfo | undefined;
  hasLeft: boolean;
  compareValue: string | undefined;
  leftIsDefault: boolean;
  rightIsDefault: boolean;
  isObsolete: boolean;
  isUnknown: boolean;
}

interface ConfigSettingsSectionProps {
  cvars: EnrichedCvar[];
  isCompareMode: boolean;
  expandedCvar: string | null;
  hoveredCvar: string | null;
  onToggleCvar: (name: string) => void;
  onMouseEnter: (name: string, e: MouseEvent) => void;
  onMouseLeave: () => void;
}

interface CategoryGroup {
  category: string;
  totalCount: number;
  subGroups: { name: string; cvars: EnrichedCvar[] }[];
}

export default function ConfigSettingsSection(props: ConfigSettingsSectionProps) {
  // Group cvars by category → sub-group, sorted by size descending
  const groupedCvars = createMemo((): CategoryGroup[] => {
    const categories = new Map<string, Map<string, EnrichedCvar[]>>();
    for (const cvar of props.cvars) {
      const cat = cvar.info?.category ?? "Unknown";
      const group = cvar.info?.group ?? "";
      if (!categories.has(cat)) categories.set(cat, new Map());
      const catGroups = categories.get(cat)!;
      if (!catGroups.has(group)) catGroups.set(group, []);
      catGroups.get(group)!.push(cvar);
    }
    return Array.from(categories.entries())
      .map(([cat, groups]) => ({
        category: cat,
        totalCount: Array.from(groups.values()).reduce((sum, g) => sum + g.length, 0),
        subGroups: Array.from(groups.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .map(([name, cvars]) => ({ name, cvars })),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  });

  const showCategoryHeaders = () => groupedCvars().length > 1;

  return (
    <div>
      {/* Section header */}
      <div class="sg-config-section-header">
        Settings ({props.cvars.length})
      </div>

      {/* Column headers */}
      <div
        class="grid px-4 py-1 border-b border-[var(--sg-stat-border)] flex-shrink-0 text-[10px] uppercase tracking-wide text-[var(--sg-section-label)]"
        style={{
          "grid-template-columns": props.isCompareMode ? "240px 1fr 1fr" : "280px 1fr",
        }}
      >
        <span>Cvar</span>
        <span class="px-3">{props.isCompareMode ? "Your config" : "Value"}</span>
        <Show when={props.isCompareMode}>
          <span class="px-3 border-l border-[var(--sg-stat-border)]">Comparison</span>
        </Show>
      </div>

      {/* Cvar list, grouped by category → sub-group */}
      <Show
        when={props.cvars.length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No settings match the current filters
          </div>
        }
      >
        <For each={groupedCvars()}>
          {(catGroup) => (
            <>
              <Show when={showCategoryHeaders()}>
                <div class="sg-category-group-header">
                  {catGroup.category} <span class="opacity-40">{catGroup.totalCount}</span>
                </div>
              </Show>
              <For each={catGroup.subGroups}>
                {(subGroup) => (
                  <>
                    <Show when={subGroup.name && catGroup.subGroups.length > 1}>
                      <div class="sg-subgroup-header">
                        {subGroup.name} <span class="opacity-40">{subGroup.cvars.length}</span>
                      </div>
                    </Show>
                    <For each={subGroup.cvars}>
                      {(cvar) => (
                        <div class="relative">
                          <CvarRow
                            name={cvar.name}
                            value={cvar.value}
                            compareValue={cvar.compareValue}
                            info={cvar.info}
                            isExpanded={props.expandedCvar === cvar.name}
                            isCompareMode={props.isCompareMode}
                            isObsolete={cvar.isObsolete}
                            isUnknown={cvar.isUnknown}
                            onToggle={() => props.onToggleCvar(cvar.name)}
                            onMouseEnter={(e) => props.onMouseEnter(cvar.name, e)}
                            onMouseLeave={props.onMouseLeave}
                          />
                          <Show when={props.hoveredCvar === cvar.name && props.expandedCvar !== cvar.name}>
                            <CvarTooltip
                              name={cvar.name}
                              value={cvar.value}
                              compareValue={cvar.compareValue}
                              info={cvar.info}
                              mode="tooltip"
                            />
                          </Show>
                          <Show when={props.expandedCvar === cvar.name}>
                            <CvarTooltip
                              name={cvar.name}
                              value={cvar.value}
                              compareValue={cvar.compareValue}
                              info={cvar.info}
                              mode="expanded"
                            />
                          </Show>
                        </div>
                      )}
                    </For>
                  </>
                )}
              </For>
            </>
          )}
        </For>
      </Show>
    </div>
  );
}
