import { For, Show } from "solid-js";
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

export default function ConfigSettingsSection(props: ConfigSettingsSectionProps) {
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

      {/* Cvar list */}
      <Show
        when={props.cvars.length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No settings match the current filters
          </div>
        }
      >
        <For each={props.cvars}>
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
      </Show>
    </div>
  );
}
