import { For } from "solid-js";

interface ConfigSidebarProps {
  // Row 1 — Settings
  row1Categories: [string, number][];
  activeRow1: Set<string>;
  isAllRow1: boolean;
  row1Total: number;
  onToggleRow1Cat: (cat: string) => void;
  onToggleAllRow1: () => void;

  // Row 2 — Domains
  activeRow2: Set<string>;
  onToggleRow2Pill: (key: string) => void;
  aliasesActive: boolean;
  onToggleAliases: () => void;

  // Shared controls
  hideDefaults: boolean;
  onHideDefaultsChange: (val: boolean) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export default function ConfigSidebar(props: ConfigSidebarProps) {
  function isRow1Active(cat: string): boolean {
    return props.activeRow1.has(cat) || props.activeRow1.has("__all__");
  }

  return (
    <div class="sg-config-sidebar">
      {/* ── Settings ── */}
      <div class="flex flex-col items-start gap-1">
        <div class="sg-config-sidebar-section-label">Settings</div>
        <button
          class={`badge cursor-pointer ${props.isAllRow1 ? "badge-primary" : "badge-ghost"}`}
          onClick={props.onToggleAllRow1}
        >
          All
        </button>
        <For each={props.row1Categories}>
          {([cat]) => (
            <button
              class={`badge cursor-pointer ${isRow1Active(cat) ? "badge-primary" : "badge-ghost"}`}
              onClick={() => props.onToggleRow1Cat(cat)}
            >
              {cat}
            </button>
          )}
        </For>
      </div>

      {/* ── Domains ── */}
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

        <div class="sg-config-sidebar-domain-label">Misc</div>
        <div class="sg-config-sidebar-nested flex flex-col items-start gap-1">
          <button
            class={`badge cursor-pointer ${props.activeRow2.has("misc:binds") ? "badge-binds" : "badge-ghost"}`}
            onClick={() => props.onToggleRow2Pill("misc:binds")}
          >
            Binds
          </button>
        </div>

        <button
          class={`badge cursor-pointer mt-1 ${props.aliasesActive ? "badge-binds" : "badge-ghost"}`}
          onClick={props.onToggleAliases}
        >
          Aliases
        </button>
      </div>

      {/* ── Options ── */}
      <div class="flex flex-col items-start gap-2">
        <div class="sg-config-sidebar-section-label">Options</div>
        <label class="flex items-center gap-1.5 text-xs text-[var(--sg-text-dim)] cursor-pointer select-none">
          <input
            type="checkbox"
            class="checkbox checkbox-xs"
            checked={props.hideDefaults}
            onChange={(e) => props.onHideDefaultsChange(e.currentTarget.checked)}
          />
          Hide defaults
        </label>
        <input
          type="text"
          class="input input-xs font-mono w-full"
          placeholder="Search..."
          value={props.search}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
        />
      </div>
    </div>
  );
}
