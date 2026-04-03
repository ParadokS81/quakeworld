import { For } from "solid-js";

interface ConfigCategoryBarProps {
  // Settings (Row 1)
  settingsCategories: [string, number][];
  activeSettings: Set<string>;
  isAllSettingsSelected: boolean;
  allSettingsCount: number;
  onToggleSettingsCat: (cat: string) => void;
  onToggleAllSettings: () => void;

  // Binds (Row 2 left)
  bindCounts: { weapons: number; teamsay: number; misc: number };
  activeBinds: Set<string>;
  onToggleBindCat: (cat: string) => void;

  // Aliases (Row 2 right)
  aliasCount: number;
  aliasesActive: boolean;
  onToggleAliases: () => void;

  // Shared controls
  hideDefaults: boolean;
  onHideDefaultsChange: (val: boolean) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export default function ConfigCategoryBar(props: ConfigCategoryBarProps) {
  return (
    <div class="border-b border-[var(--sg-stat-border)] flex-shrink-0">
      {/* ── Row 1: Settings categories ── */}
      <div class="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.isAllSettingsSelected ? "badge-primary" : "badge-ghost hover:badge-outline"
          }`}
          onClick={props.onToggleAllSettings}
        >
          All ({props.allSettingsCount})
        </button>
        <For each={props.settingsCategories}>
          {([cat, count]) => (
            <button
              class={`badge cursor-pointer flex-shrink-0 whitespace-nowrap transition-colors ${
                props.activeSettings.has(cat) || props.activeSettings.has("__all__")
                  ? "badge-primary"
                  : "badge-ghost hover:badge-outline"
              }`}
              onClick={() => props.onToggleSettingsCat(cat)}
            >
              {cat} ({count})
            </button>
          )}
        </For>

        <div class="flex-1" />

        <label class="flex items-center gap-1.5 text-xs text-[var(--sg-text-dim)] flex-shrink-0 cursor-pointer select-none">
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
          class="input input-xs w-40 font-mono"
          placeholder="Search..."
          value={props.search}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
        />
      </div>

      {/* ── Row 2: Binds + Aliases ── */}
      <div class="flex items-center gap-2 px-4 py-1.5 overflow-x-auto border-t border-[var(--sg-stat-border)]">
        <span class="sg-category-row-label flex-shrink-0">Binds</span>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.activeBinds.has("weapons") ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={() => props.onToggleBindCat("weapons")}
        >
          Weapons ({props.bindCounts.weapons})
        </button>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.activeBinds.has("teamsay") ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={() => props.onToggleBindCat("teamsay")}
        >
          Teamsay ({props.bindCounts.teamsay})
        </button>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.activeBinds.has("misc") ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={() => props.onToggleBindCat("misc")}
        >
          Misc ({props.bindCounts.misc})
        </button>

        <div class="sg-category-separator" />

        <span class="sg-category-row-label flex-shrink-0">Aliases</span>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.aliasesActive ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={props.onToggleAliases}
        >
          All ({props.aliasCount})
        </button>
      </div>
    </div>
  );
}
