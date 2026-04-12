import { createSignal, For, Show } from "solid-js";
import type { WeaponBind, TeamsayBind } from "../types";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";
import type { AliasChainEntry } from "./AliasChainResolver";

/* ─── Shared colors ──────────────────────────────────────────────── */

const WEAPON_COLORS: Record<string, string> = {
  rl: "oklch(0.7 0.2 30)",
  lg: "oklch(0.75 0.15 80)",
  gl: "oklch(0.65 0.15 145)",
  sng: "oklch(0.6 0.1 260)",
  ng: "oklch(0.55 0.08 260)",
  ssg: "oklch(0.65 0.12 50)",
  sg: "oklch(0.55 0.08 50)",
  axe: "oklch(0.5 0.05 30)",
};

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

const WEAPON_ORDER = ["rl", "lg", "gl", "sng", "ng", "ssg", "sg", "axe"];
const WEAPON_LABELS: Record<string, string> = {
  rl: "Rocket Launcher", lg: "Lightning Gun", gl: "Grenade Launcher",
  sng: "Super Nailgun", ng: "Nailgun", ssg: "Super Shotgun",
  sg: "Shotgun", axe: "Axe",
};

function formatMethod(wb: WeaponBind): string {
  if (wb.method === "quickfire") return "quickfire";
  return wb.fire_key ? `manual → ${wb.fire_key}` : "manual";
}

interface WeaponBindsProps {
  primaryBinds: WeaponBind[];
  compareBinds?: WeaponBind[];
  primaryAliases: Record<string, string>;
  compareAliases: Record<string, string>;
  primaryBindCommands: Record<string, string>;
  compareBindCommands: Record<string, string>;
}

interface WeaponRow {
  weapon: string;
  primary?: WeaponBind;
  compare?: WeaponBind;
}

export function ConfigWeaponBindsSection(props: WeaponBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;
  const [expanded, setExpanded] = createSignal<string | null>(null);

  // Build flat list of per-key rows, matched on weapon+key, sorted by WEAPON_ORDER then key alpha.
  const rows = (): WeaponRow[] => {
    const result: WeaponRow[] = [];

    for (const weapon of WEAPON_ORDER) {
      const primaryForWeapon = props.primaryBinds.filter((wb) => wb.weapon === weapon);
      const compareForWeapon = (props.compareBinds ?? []).filter((wb) => wb.weapon === weapon);

      if (primaryForWeapon.length === 0 && compareForWeapon.length === 0) {
        // Placeholder row for weapons with no binds at all.
        result.push({ weapon });
        continue;
      }

      // Collect all unique keys across both sides.
      const allKeys = new Set<string>();
      for (const wb of primaryForWeapon) allKeys.add(wb.key);
      for (const wb of compareForWeapon) allKeys.add(wb.key);

      const sortedKeys = Array.from(allKeys).sort((a, b) => a.localeCompare(b));

      for (const key of sortedKeys) {
        result.push({
          weapon,
          primary: primaryForWeapon.find((wb) => wb.key === key),
          compare: compareForWeapon.find((wb) => wb.key === key),
        });
      }
    }

    return result;
  };

  function toggleExpand(rowKey: string) {
    setExpanded((prev) => (prev === rowKey ? null : rowKey));
  }

  function getChain(key: string, bindCommands: Record<string, string>, aliases: Record<string, string>): AliasChainEntry[] {
    const cmd = bindCommands[key.toUpperCase()];
    if (!cmd) return [];
    return resolveAliasChain(cmd, aliases);
  }

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
          // Placeholder row: no binds on either side for this weapon.
          const isPlaceholder = !row.primary && !row.compare;
          // Expanded state key is "weapon:KEY" for real rows, weapon name for placeholders.
          const rowKey = row.primary?.key
            ? `${row.weapon}:${row.primary.key}`
            : row.compare?.key
            ? `${row.weapon}:${row.compare.key}`
            : row.weapon;
          const isExpanded = () => expanded() === rowKey;
          const hasContent = !isPlaceholder;

          return (
            <>
              <div
                class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
                classList={{
                  "sg-cv-bind-only-left": isCompare() && !!row.primary && !row.compare,
                  "sg-cv-bind-only-right": isCompare() && !row.primary && !!row.compare,
                  "cursor-pointer": hasContent,
                }}
                onClick={() => hasContent && toggleExpand(rowKey)}
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

                {/* Primary key cell */}
                <div class="flex items-center gap-1">
                  <Show when={row.primary} fallback={
                    <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                  }>
                    {(wb) => (
                      <>
                        <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                          {wb().key}
                        </span>
                        <span class="text-[11px] text-[var(--sg-text-dim)]">{formatMethod(wb())}</span>
                      </>
                    )}
                  </Show>
                </div>

                {/* Compare key cell (only in compare mode) */}
                <Show when={isCompare()}>
                  <div class="flex items-center gap-1">
                    <Show when={row.compare} fallback={
                      <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                    }>
                      {(wb) => (
                        <>
                          <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                            {wb().key}
                          </span>
                          <span class="text-[11px] text-[var(--sg-text-dim)]">{formatMethod(wb())}</span>
                        </>
                      )}
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Expanded alias chain for this single key */}
              <Show when={isExpanded() && hasContent}>
                <div class="sg-domain-bind-expanded">
                  <Show when={row.primary}>
                    {(wb) => {
                      const chain = () => getChain(wb().key, props.primaryBindCommands, props.primaryAliases);
                      const rawCmd = () => props.primaryBindCommands[wb().key.toUpperCase()];
                      return (
                        <>
                          <Show when={chain().length > 0}>
                            <AliasChainView
                              chain={chain()}
                              label={`${wb().key} — your config`}
                            />
                          </Show>
                          <Show when={chain().length === 0 && rawCmd()}>
                            <div class="sg-alias-chain">
                              <div class="sg-alias-chain-label">{wb().key} — your config</div>
                              <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                <span class="sg-alias-chain-cmd">{rawCmd()}</span>
                              </div>
                            </div>
                          </Show>
                        </>
                      );
                    }}
                  </Show>
                  <Show when={isCompare() && row.compare}>
                    {(wb) => {
                      const chain = () => getChain(wb().key, props.compareBindCommands, props.compareAliases);
                      const rawCmd = () => props.compareBindCommands[wb().key.toUpperCase()];
                      return (
                        <>
                          <Show when={chain().length > 0}>
                            <AliasChainView
                              chain={chain()}
                              label={`${wb().key} — comparison`}
                            />
                          </Show>
                          <Show when={chain().length === 0 && rawCmd()}>
                            <div class="sg-alias-chain">
                              <div class="sg-alias-chain-label">{wb().key} — comparison</div>
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
}

export function ConfigTeamsayBindsSection(props: TeamsayBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;
  const [expanded, setExpanded] = createSignal<string | null>(null);

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

  function toggleExpand(actionKey: string) {
    setExpanded((prev) => (prev === actionKey ? null : actionKey));
  }

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
                  const actionKey = `${action.category}:${action.label}`;
                  const isExpanded = () => expanded() === actionKey;
                  const hasAnyKey = () => !!action.primaryKey || !!action.compareKey;

                  return (
                    <>
                      <div
                        class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
                        classList={{
                          "sg-cv-bind-only-left": isCompare() && !!action.primaryKey && !action.compareKey,
                          "sg-cv-bind-only-right": isCompare() && !action.primaryKey && !!action.compareKey,
                          "cursor-pointer": hasAnyKey(),
                        }}
                        title={action.description}
                        onClick={() => hasAnyKey() && toggleExpand(actionKey)}
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
                                    />
                                  </Show>
                                  <Show when={chain().length === 0 && rawCmd()}>
                                    <div class="sg-alias-chain">
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
                                    />
                                  </Show>
                                  <Show when={chain().length === 0 && rawCmd()}>
                                    <div class="sg-alias-chain">
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
