import { For } from "solid-js";

interface ConfigCategoryBarProps {
  // Row 1 — Settings
  row1Categories: [string, number][];
  activeRow1: Set<string>;
  isAllRow1: boolean;
  row1Total: number;
  onToggleRow1Cat: (cat: string) => void;
  onToggleAllRow1: () => void;

  // Row 2 — Specialized cvar categories + Binds + Aliases
  row2CvarCats: [string, number][];
  activeRow2Cats: Set<string>;
  onToggleRow2Cat: (cat: string) => void;
  bindTotal: number;
  activeBinds: Set<string>;
  onToggleBindCat: (cat: string) => void;
  aliasesActive: boolean;
  onToggleAliases: () => void;
  isAllRow2: boolean;
  onToggleAllRow2: () => void;

  // Shared controls
  hideDefaults: boolean;
  onHideDefaultsChange: (val: boolean) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export default function ConfigCategoryBar(props: ConfigCategoryBarProps) {
  return (
    <div class="border-b border-[var(--sg-stat-border)] flex-shrink-0">
      {/* ── Row 1: All + Settings categories ── */}
      <div class="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.isAllRow1 ? "badge-primary" : "badge-ghost hover:badge-outline"
          }`}
          onClick={props.onToggleAllRow1}
        >
          All
        </button>
        <span class="sg-category-row-label flex-shrink-0">
          Settings ({props.row1Total})
        </span>
        <For each={props.row1Categories}>
          {([cat]) => (
            <button
              class={`badge cursor-pointer flex-shrink-0 whitespace-nowrap transition-colors ${
                props.activeRow1.has(cat) || props.activeRow1.has("__all__")
                  ? "badge-primary"
                  : "badge-ghost hover:badge-outline"
              }`}
              onClick={() => props.onToggleRow1Cat(cat)}
            >
              {cat}
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

      {/* ── Row 2: All + HUD/Teamplay/Server + Binds + Aliases ── */}
      <div class="flex items-center gap-2 px-4 py-1.5 overflow-x-auto border-t border-[var(--sg-stat-border)]">
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.isAllRow2 ? "badge-primary" : "badge-ghost hover:badge-outline"
          }`}
          onClick={props.onToggleAllRow2}
        >
          All
        </button>
        <For each={props.row2CvarCats}>
          {([cat]) => (
            <button
              class={`badge cursor-pointer flex-shrink-0 whitespace-nowrap transition-colors ${
                props.activeRow2Cats.has(cat)
                  ? "badge-primary"
                  : "badge-ghost hover:badge-outline"
              }`}
              onClick={() => props.onToggleRow2Cat(cat)}
            >
              {cat}
            </button>
          )}
        </For>

        <div class="sg-category-separator" />

        <span class="sg-category-row-label flex-shrink-0">
          Binds ({props.bindTotal})
        </span>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.activeBinds.has("weapons") ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={() => props.onToggleBindCat("weapons")}
        >
          Weapons
        </button>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.activeBinds.has("teamsay") ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={() => props.onToggleBindCat("teamsay")}
        >
          Teamsay
        </button>
        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.activeBinds.has("misc") ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={() => props.onToggleBindCat("misc")}
        >
          Misc
        </button>

        <div class="sg-category-separator" />

        <button
          class={`badge cursor-pointer flex-shrink-0 transition-colors ${
            props.aliasesActive ? "badge-binds" : "badge-ghost hover:badge-outline"
          }`}
          onClick={props.onToggleAliases}
        >
          Aliases
        </button>
      </div>
    </div>
  );
}
