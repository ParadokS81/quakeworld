import { For } from "solid-js";

interface ConfigSidebarProps {
  // Row 1 — Settings categories
  row1Categories: [string, number][];
  activeRow1: Set<string>;
  isAllRow1: boolean;
  isAll: boolean;
  row1Total: number;
  onToggleRow1Cat: (cat: string) => void;
  onToggleAll: () => void;
  categoryGaps?: Set<string>;

  // Row 2 — Domains + misc
  activeRow2: Set<string>;
  onToggleRow2Pill: (key: string) => void;
  aliasesActive: boolean;
  onToggleAliases: () => void;
  macrosActive: boolean;
  onToggleMacros: () => void;
  triggersActive: boolean;
  onToggleTriggers: () => void;
  commandsActive: boolean;
  onToggleCommands: () => void;

  // Settings-row filter (lives here rather than the top bar because
  // it conceptually narrows the Settings list below it).
  hideDefaults: boolean;
  onHideDefaultsChange: (val: boolean) => void;

  isCompareMode: boolean;
}

export default function ConfigSidebar(props: ConfigSidebarProps) {
  function isRow1Active(cat: string): boolean {
    return props.activeRow1.has(cat) || props.activeRow1.has("__all__");
  }

  return (
    <div class="sg-config-sidebar">
      {/* Hide-defaults filter sits above the Settings header since it
          narrows the cvar row set that Settings renders. Kept on its
          own row so the Settings header stays visually aligned. */}
      <label class="flex items-center gap-1.5 text-[0.6875rem] text-[var(--sg-text-dim)] cursor-pointer select-none">
        <input
          type="checkbox"
          class="checkbox checkbox-xs"
          checked={props.hideDefaults}
          onChange={(e) => props.onHideDefaultsChange(e.currentTarget.checked)}
        />
        Hide defaults
      </label>

      {/* ── Settings — all raw config data ── */}
      <div class="flex flex-col items-start gap-1">
        <div class="sg-config-sidebar-section-label">Settings</div>
        <button
          class={`badge cursor-pointer ${props.isAll ? "badge-primary" : "badge-ghost"}`}
          onClick={props.onToggleAll}
        >
          All
        </button>
        <div class="h-1" />
        <For each={props.row1Categories}>
          {([cat]) => (
            <>
              <button
                class={`badge cursor-pointer ${isRow1Active(cat) ? "badge-primary" : "badge-ghost"}`}
                onClick={() => props.onToggleRow1Cat(cat)}
              >
                {cat}
              </button>
              {props.categoryGaps?.has(cat) && <div class="h-1" />}
            </>
          )}
        </For>

        {/* Binds + Aliases — raw config data, not domain-curated */}
        <div class="h-1" />
        <button
          class={`badge cursor-pointer ${props.activeRow2.has("misc:binds") ? "badge-binds" : "badge-ghost"}`}
          onClick={() => props.onToggleRow2Pill("misc:binds")}
        >
          Binds
        </button>
        <button
          class={`badge cursor-pointer ${props.aliasesActive ? "badge-binds" : "badge-ghost"}`}
          onClick={props.onToggleAliases}
        >
          Aliases
        </button>
        <button
          class={`badge cursor-pointer ${props.macrosActive ? "badge-binds" : "badge-ghost"}`}
          onClick={props.onToggleMacros}
        >
          Macros
        </button>
        <button
          class={`badge cursor-pointer ${props.triggersActive ? "badge-binds" : "badge-ghost"}`}
          onClick={props.onToggleTriggers}
        >
          Triggers
        </button>
        <button
          class={`badge cursor-pointer ${props.commandsActive ? "badge-binds" : "badge-ghost"}`}
          onClick={props.onToggleCommands}
        >
          Commands
        </button>
      </div>

      {/* ── Separator ── */}
      <div class="sg-config-sidebar-divider" />

      {/* ── Domains — curated, action-centric views ── */}
      <div class="flex flex-col items-start gap-1">
        <div class="sg-config-sidebar-section-label">Domains</div>

        <div class="sg-config-sidebar-domain-label">Teamplay</div>
        <div class="sg-config-sidebar-nested flex flex-col items-start gap-1">
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("teamplay:settings") ? "badge-primary" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("teamplay:settings")}
          >
            Settings
          </button>
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("teamplay:binds") ? "badge-binds" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("teamplay:binds")}
          >
            Binds
          </button>
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("teamplay:macros") ? "badge-binds" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("teamplay:macros")}
          >
            Macros
          </button>
        </div>

        <div class="sg-config-sidebar-domain-label">Weapons</div>
        <div class="sg-config-sidebar-nested flex flex-col items-start gap-1">
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("weapons:settings") ? "badge-primary" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("weapons:settings")}
          >
            Settings
          </button>
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("weapons:binds") ? "badge-binds" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("weapons:binds")}
          >
            Binds
          </button>
        </div>

        <div class="sg-config-sidebar-domain-label">Movement</div>
        <div class="sg-config-sidebar-nested flex flex-col items-start gap-1">
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("movement:binds") ? "badge-binds" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("movement:binds")}
          >
            Binds
          </button>
        </div>
      </div>

    </div>
  );
}
