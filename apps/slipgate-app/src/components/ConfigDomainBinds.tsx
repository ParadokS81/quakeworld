import { For, Show, createEffect, type JSX } from "solid-js";
import type { FiringPath, ManualFlavor, MovementKeys, TeamsayBind, Weapon } from "../types";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";
import type { AliasChainEntry } from "./AliasChainResolver";
import { WEAPON_COLORS } from "./WeaponBindViz";

/**
 * When a bind row becomes selected (via keyboard click or row click), scroll
 * the nearest preceding category header into view so the user sees the row in
 * its group context rather than being parachuted onto an orphan row.
 * Walks backwards through sibling DOM nodes because the teamsay section renders
 * category headers as flat siblings of the rows, not as ancestors.
 */
function scrollSelectionIntoView(rowEl: HTMLElement | undefined) {
  if (!rowEl) return;
  let target: Element = rowEl;
  let sib: Element | null = rowEl.previousElementSibling;
  while (sib) {
    if (
      sib.classList.contains("sg-domain-bind-category") ||
      sib.classList.contains("sg-category-group-header")
    ) {
      target = sib;
      break;
    }
    sib = sib.previousElementSibling;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TEAMSAY_COLORS: Record<string, string> = {
  status: "oklch(0.7 0.12 200)",
  death: "oklch(0.65 0.18 20)",
  movement: "oklch(0.7 0.15 145)",
  items: "oklch(0.75 0.15 85)",
  enemy: "oklch(0.7 0.2 30)",
  orders: "oklch(0.65 0.1 290)",
  powerups: "oklch(0.7 0.18 310)",
  confirm: "oklch(0.65 0.1 250)",
  custom: "oklch(0.6 0.08 0)",
};

/* ─── Weapons ────────────────────────────────────────────────────── */

const WEAPON_ORDER: Weapon[] = ["rl", "lg", "gl", "sng", "ng", "ssg", "sg", "axe"];
const WEAPON_LABELS: Record<string, string> = {
  rl: "Rocket Launcher", lg: "Lightning Gun", gl: "Grenade Launcher",
  sng: "Super Nailgun", ng: "Nailgun", ssg: "Super Shotgun",
  sg: "Shotgun", axe: "Axe",
};

/**
 * Renders a firing path as a short sentence with keycap graphics.
 *   quickfire     -> [KEY] selects and fires
 *   manual-select -> [TRIGGER] selects and [FIRE] fires
 *   manual-hold   -> hold [TRIGGER] and [FIRE] fires
 */
function formatFiringSentence(p: FiringPath, color: string): JSX.Element {
  const borderColor = `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))`;
  const keycap = (key: string) => (
    <span class="sg-domain-keycap" style={{ "border-color": borderColor }}>
      {key}
    </span>
  );
  const word = (text: string) => (
    <span class="text-[11px] text-[var(--sg-text-dim)]">{text}</span>
  );

  if (p.method === "quickfire") {
    return (
      <>
        {keycap(p.trigger_key)}
        {word("selects and fires")}
      </>
    );
  }

  // Manual: trigger_key activates, fire_key fires.
  // fire_key is guaranteed non-null for Manual paths emitted by the classifier.
  const fireKey = p.fire_key ?? "";

  if (p.flavor === "hold") {
    return (
      <>
        {word("hold")}
        {keycap(p.trigger_key)}
        {word("and")}
        {keycap(fireKey)}
        {word("fires")}
      </>
    );
  }

  return (
    <>
      {keycap(p.trigger_key)}
      {word("selects and")}
      {keycap(fireKey)}
      {word("fires")}
    </>
  );
}

interface WeaponBindsProps {
  primaryBinds: FiringPath[];
  compareBinds?: FiringPath[];
  isWeaponSelected?: (weapon: string) => boolean;
  onWeaponClick?: (weapon: string) => void;
}

interface DiffRow {
  weapon: Weapon;
  trigger_key: string;
  fire_key: string | null;
  flavor: ManualFlavor | null;
  primary?: FiringPath;
  compare?: FiringPath;
}

function rowKey(p: FiringPath): string {
  return `${p.weapon}|${p.trigger_key}|${p.fire_key ?? ""}|${p.flavor ?? ""}`;
}

function pairRows(primary: FiringPath[], compare: FiringPath[] = []): DiffRow[] {
  const byKey = new Map<string, DiffRow>();
  for (const p of primary) {
    const key = rowKey(p);
    byKey.set(key, {
      weapon: p.weapon,
      trigger_key: p.trigger_key,
      fire_key: p.fire_key,
      flavor: p.flavor,
      primary: p,
    });
  }
  for (const c of compare) {
    const key = rowKey(c);
    const existing = byKey.get(key);
    if (existing) {
      existing.compare = c;
    } else {
      byKey.set(key, {
        weapon: c.weapon,
        trigger_key: c.trigger_key,
        fire_key: c.fire_key,
        flavor: c.flavor,
        compare: c,
      });
    }
  }
  return Array.from(byKey.values());
}

export function ConfigWeaponBindsSection(props: WeaponBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;

  // Build flat list of DiffRows paired by (weapon, trigger_key, fire_key, flavor),
  // sorted by WEAPON_ORDER then trigger_key alpha. Weapons with no paths on either
  // side get a placeholder row so every weapon is always represented.
  const rows = (): DiffRow[] => {
    const paired = pairRows(props.primaryBinds, props.compareBinds ?? []);
    const result: DiffRow[] = [];

    for (const weapon of WEAPON_ORDER) {
      const forWeapon = paired.filter((r) => r.weapon === weapon);
      if (forWeapon.length === 0) {
        // Placeholder: no paths at all for this weapon.
        result.push({ weapon, trigger_key: "", fire_key: null, flavor: null });
      } else {
        forWeapon.sort((a, b) => a.trigger_key.localeCompare(b.trigger_key));
        result.push(...forWeapon);
      }
    }

    return result;
  };

  return (
    <div>
      <div class="sg-category-group-header">Weapon Binds</div>

      <div
        class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Weapon</span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Bind" : "Key"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <For each={rows()}>
        {(row) => {
          const color = WEAPON_COLORS[row.weapon] ?? "var(--sg-text-dim)";
          // Placeholder: trigger_key is empty string sentinel set above.
          const isPlaceholder = !row.primary && !row.compare;
          const hasContent = !isPlaceholder;

          // Expansion + pin are a single derived concept: the lifted
          // selection is the sole source of truth. Row expand state flows
          // through the predicate so a keyboard click that updates the
          // parent's selection expands the matching row here. The predicate
          // form lets multiple rows be selected simultaneously (modifier
          // combos).
          const isSelected = () => !isPlaceholder && (props.isWeaponSelected?.(row.weapon) ?? false);
          const isExpanded = isSelected;

          let rowEl: HTMLDivElement | undefined;
          createEffect(() => {
            if (isSelected()) scrollSelectionIntoView(rowEl);
          });

          return (
            <>
              <div
                ref={rowEl}
                class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
                classList={{
                  "sg-cv-bind-only-left": isCompare() && !!row.primary && !row.compare,
                  "sg-cv-bind-only-right": isCompare() && !row.primary && !!row.compare,
                  "cursor-pointer": hasContent,
                  "sg-domain-bind-row-selected": isSelected(),
                }}
                onClick={() => {
                  if (!hasContent) return;
                  props.onWeaponClick?.(row.weapon);
                }}
              >
                {/* Weapon identity: color badge + short name + full name */}
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-[var(--sg-section-label)] w-3">
                    {hasContent ? (isExpanded() ? "▾" : "▸") : ""}
                  </span>
                  <span class="text-[13px] font-bold uppercase" style={{ color, opacity: isPlaceholder ? 0.4 : 1 }}>
                    {row.weapon.toUpperCase()}
                  </span>
                  <span class="text-[11px] text-[var(--sg-section-label)]" style={{ opacity: isPlaceholder ? 0.4 : 1 }}>
                    {WEAPON_LABELS[row.weapon]}
                  </span>
                </div>

                {/* Primary path cell */}
                <div class="flex items-center gap-1">
                  <Show when={row.primary} fallback={
                    <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                  }>
                    {(p) => (
                      <>
                        {formatFiringSentence(p(), color)}
                        <Show when={p().source === "engine_default"}>
                          <span class="text-[10px] text-[var(--sg-section-label)] italic">(default)</span>
                        </Show>
                      </>
                    )}
                  </Show>
                </div>

                {/* Compare path cell (only in compare mode) */}
                <Show when={isCompare()}>
                  <div class="flex items-center gap-1">
                    <Show when={row.compare} fallback={
                      <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                    }>
                      {(p) => (
                        <>
                          {formatFiringSentence(p(), color)}
                          <Show when={p().source === "engine_default"}>
                            <span class="text-[10px] text-[var(--sg-section-label)] italic">(default)</span>
                          </Show>
                        </>
                      )}
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Expanded: show origin_alias_chain for debugging */}
              <Show when={isExpanded() && hasContent}>
                <div class="sg-domain-bind-expanded">
                  <Show when={row.primary}>
                    {(p) => (
                      <Show when={p().origin_alias_chain.length > 0}>
                        <div class="sg-alias-chain sg-alias-chain-you">
                          <div class="sg-alias-chain-label">{p().trigger_key} — your config</div>
                          <For each={p().origin_alias_chain}>
                            {(step) => (
                              <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                <span class="sg-alias-chain-cmd">{step}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    )}
                  </Show>
                  <Show when={isCompare() && row.compare}>
                    {(p) => (
                      <Show when={p().origin_alias_chain.length > 0}>
                        <div class="sg-alias-chain sg-alias-chain-them">
                          <div class="sg-alias-chain-label">{p().trigger_key} — comparison</div>
                          <For each={p().origin_alias_chain}>
                            {(step) => (
                              <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                <span class="sg-alias-chain-cmd">{step}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    )}
                  </Show>
                </div>
              </Show>
            </>
          );
        }}
      </For>
    </div>
  );
}

/* ─── Teamsay ────────────────────────────────────────────────────── */

const CATEGORY_ORDER = ["status", "death", "movement", "items", "enemy", "orders", "powerups", "confirm", "custom"];
const CATEGORY_LABELS: Record<string, string> = {
  status: "Status", death: "Death", movement: "Movement", items: "Items",
  enemy: "Enemy", orders: "Orders", powerups: "Powerups", confirm: "Confirm", custom: "Custom",
};

interface TeamsayAction {
  label: string;
  category: string;
  description: string;
  primaryKey?: string;
  compareKey?: string;
}

interface TeamsayBindsProps {
  primaryBinds: TeamsayBind[];
  compareBinds?: TeamsayBind[];
  primaryAliases: Record<string, string>;
  compareAliases: Record<string, string>;
  primaryBindCommands: Record<string, string>;
  compareBindCommands: Record<string, string>;
  isLabelSelected?: (label: string) => boolean;
  onLabelClick?: (label: string) => void;
}

export function ConfigTeamsayBindsSection(props: TeamsayBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;

  const actions = (): TeamsayAction[] => {
    const map = new Map<string, TeamsayAction>();

    for (const tb of props.primaryBinds) {
      const key = `${tb.category}:${tb.label}`;
      map.set(key, {
        label: tb.label,
        category: tb.category,
        description: tb.description,
        primaryKey: tb.key,
      });
    }

    for (const tb of props.compareBinds ?? []) {
      const key = `${tb.category}:${tb.label}`;
      const existing = map.get(key);
      if (existing) {
        existing.compareKey = tb.key;
      } else {
        map.set(key, {
          label: tb.label,
          category: tb.category,
          description: tb.description,
          compareKey: tb.key,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category);
      const catB = CATEGORY_ORDER.indexOf(b.category);
      if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
      return a.label.localeCompare(b.label);
    });
  };

  const groupedActions = () => {
    const groups: { category: string; actions: TeamsayAction[] }[] = [];
    let currentCat = "";
    let currentGroup: TeamsayAction[] = [];

    for (const action of actions()) {
      if (action.category !== currentCat) {
        if (currentGroup.length > 0) {
          groups.push({ category: currentCat, actions: currentGroup });
        }
        currentCat = action.category;
        currentGroup = [];
      }
      currentGroup.push(action);
    }
    if (currentGroup.length > 0) {
      groups.push({ category: currentCat, actions: currentGroup });
    }
    return groups;
  };

  function getChain(key: string | undefined, bindCommands: Record<string, string>, aliases: Record<string, string>): AliasChainEntry[] {
    if (!key) return [];
    const cmd = bindCommands[key.toUpperCase()];
    if (!cmd) return [];
    return resolveAliasChain(cmd, aliases);
  }

  return (
    <div>
      <div class="sg-category-group-header">Teamplay Binds</div>

      <div
        class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Action</span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Bind" : "Key"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <For each={groupedActions()}>
        {(group) => {
          const color = TEAMSAY_COLORS[group.category] ?? "var(--sg-text-dim)";
          return (
            <>
              <div class="sg-domain-bind-category" style={{ color }}>
                {CATEGORY_LABELS[group.category] ?? group.category}
              </div>

              <For each={group.actions}>
                {(action) => {
                  const hasAnyKey = () => !!action.primaryKey || !!action.compareKey;

                  // Expansion + pin share a single source of truth: the
                  // lifted selection. Keyboard clicks that update the
                  // parent's selection expand the matching row here. The
                  // predicate form lets multiple rows be selected
                  // simultaneously (modifier combos).
                  const isSelected = () => props.isLabelSelected?.(action.label) ?? false;
                  const isExpanded = isSelected;

                  let rowEl: HTMLDivElement | undefined;
                  createEffect(() => {
                    if (isSelected()) scrollSelectionIntoView(rowEl);
                  });

                  return (
                    <>
                      <div
                        ref={rowEl}
                        class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
                        classList={{
                          "sg-cv-bind-only-left": isCompare() && !!action.primaryKey && !action.compareKey,
                          "sg-cv-bind-only-right": isCompare() && !action.primaryKey && !!action.compareKey,
                          "cursor-pointer": hasAnyKey(),
                          "sg-domain-bind-row-selected": isSelected(),
                        }}
                        title={action.description}
                        onClick={() => {
                          if (!hasAnyKey()) return;
                          props.onLabelClick?.(action.label);
                        }}
                      >
                        <div class="flex items-center gap-1">
                          <span class="text-[11px] text-[var(--sg-section-label)] w-3">
                            {hasAnyKey() ? (isExpanded() ? "▾" : "▸") : ""}
                          </span>
                          <span class="text-[13px] font-semibold capitalize" style={{ color }}>
                            {action.label}
                          </span>
                        </div>

                        <div>
                          <Show when={action.primaryKey} fallback={
                            <span class="text-[11px] text-[var(--sg-section-label)] italic">—</span>
                          }>
                            <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                              {action.primaryKey}
                            </span>
                          </Show>
                        </div>

                        <Show when={isCompare()}>
                          <div>
                            <Show when={action.compareKey} fallback={
                              <span class="text-[11px] text-[var(--sg-section-label)] italic">—</span>
                            }>
                              <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                                {action.compareKey}
                              </span>
                            </Show>
                          </div>
                        </Show>
                      </div>

                      {/* Expanded alias chain */}
                      <Show when={isExpanded()}>
                        <div class="sg-domain-bind-expanded">
                          <Show when={action.primaryKey}>
                            {(key) => {
                              const chain = () => getChain(key(), props.primaryBindCommands, props.primaryAliases);
                              const rawCmd = () => props.primaryBindCommands[key().toUpperCase()];
                              return (
                                <>
                                  <Show when={chain().length > 0}>
                                    <AliasChainView
                                      chain={chain()}
                                      label={`${key()} — your config`}
                                      ownerClass="sg-alias-chain-you"
                                    />
                                  </Show>
                                  <Show when={chain().length === 0 && rawCmd()}>
                                    <div class="sg-alias-chain sg-alias-chain-you">
                                      <div class="sg-alias-chain-label">{key()} — your config</div>
                                      <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                        <span class="sg-alias-chain-cmd">{rawCmd()}</span>
                                      </div>
                                    </div>
                                  </Show>
                                </>
                              );
                            }}
                          </Show>
                          <Show when={isCompare() && action.compareKey}>
                            {(key) => {
                              const chain = () => getChain(key(), props.compareBindCommands, props.compareAliases);
                              const rawCmd = () => props.compareBindCommands[key().toUpperCase()];
                              return (
                                <>
                                  <Show when={chain().length > 0}>
                                    <AliasChainView
                                      chain={chain()}
                                      label={`${key()} — comparison`}
                                      ownerClass="sg-alias-chain-them"
                                    />
                                  </Show>
                                  <Show when={chain().length === 0 && rawCmd()}>
                                    <div class="sg-alias-chain sg-alias-chain-them">
                                      <div class="sg-alias-chain-label">{key()} — comparison</div>
                                      <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                        <span class="sg-alias-chain-cmd">{rawCmd()}</span>
                                      </div>
                                    </div>
                                  </Show>
                                </>
                              );
                            }}
                          </Show>
                        </div>
                      </Show>
                    </>
                  );
                }}
              </For>
            </>
          );
        }}
      </For>
    </div>
  );
}

/* ─── Movement Binds ─────────────────────────────────────────────── */

const MOVEMENT_ROWS: { key: keyof MovementKeys; label: string }[] = [
  { key: "forward",   label: "Forward" },
  { key: "back",      label: "Back" },
  { key: "moveleft",  label: "Strafe Left" },
  { key: "moveright", label: "Strafe Right" },
  { key: "jump",      label: "Jump" },
  { key: "moveup",    label: "Swim Up" },
  { key: "movedown",  label: "Swim Down" },
];

interface ConfigMovementBindsSectionProps {
  primary: MovementKeys;
  compare?: MovementKeys | null;
}

export function ConfigMovementBindsSection(props: ConfigMovementBindsSectionProps) {
  const isCompare = () => !!props.compare;

  return (
    <div>
      <div class="sg-category-group-header">Movement Binds</div>

      <div
        class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Action</span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Bind" : "Key"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <For each={MOVEMENT_ROWS}>
        {(row) => {
          return (
            <div class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}>
              <span class="text-[13px]">{row.label}</span>
              <div>
                <Show when={props.primary[row.key]} fallback={
                  <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                }>
                  <span class="sg-domain-keycap">{props.primary[row.key]}</span>
                </Show>
              </div>
              <Show when={isCompare()}>
                <div>
                  <Show when={props.compare && props.compare[row.key]} fallback={
                    <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                  }>
                    <span class="sg-domain-keycap">{props.compare![row.key]}</span>
                  </Show>
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}
