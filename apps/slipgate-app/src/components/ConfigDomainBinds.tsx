import { For, Show, createEffect, type JSX } from "solid-js";
import type { FiringPath, MovementKeys, TeamsayBind, Weapon, WeaponChangeDispatch } from "../types";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";
import type { AliasChainEntry, AliasChainResult } from "./AliasChainResolver";
import { lookupCvar } from "qw-config";
import { WEAPON_COLORS } from "./WeaponBindViz";
import type { RuntimeResolver } from "../lib/runtimeResolver";
import type { PlayerState } from "../lib/simulator/index.js";

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
    <span class="text-[0.6875rem] text-[var(--sg-text-dim)]">{text}</span>
  );

  if (p.method === "quickfire") {
    return (
      <>
        {keycap(p.trigger_key)}
        {word("quickfires")}
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
  primaryAliases?: Record<string, string>;
  compareAliases?: Record<string, string>;
  primaryBindCommands?: Record<string, string>;
  compareBindCommands?: Record<string, string>;
  primaryCvars?: Record<string, string>;
  compareCvars?: Record<string, string>;
  primaryDispatch?: WeaponChangeDispatch | null;
  compareDispatch?: WeaponChangeDispatch | null;
  primarySensBaseline?: number | null;
  compareSensBaseline?: number | null;
  hideDefaults?: boolean;
  aliasChainMode?: "pretty" | "raw";
  resolver?: RuntimeResolver | null;
  playerState?: PlayerState;
}

interface DiffRow {
  weapon: Weapon;
  primary?: FiringPath;
  compare?: FiringPath;
}

type PathType = "quickfire" | "select" | "hold";

function pathType(p: FiringPath): PathType {
  if (p.method === "quickfire") return "quickfire";
  return p.flavor === "hold" ? "hold" : "select";
}

// Per-weapon bipartite pairing with type-preference fallback.
// Per HANDOVER.md 2026-04-16 design:
//   select  pairs: select -> hold -> quickfire
//   hold    pairs: hold -> select -> quickfire
//   quickfire: quickfire -> (hold or select, either)
// Special case: both sides have exactly 1 path -> always pair regardless of type.
const TYPE_PREFERENCE: Record<PathType, PathType[]> = {
  quickfire: ["quickfire", "select", "hold"],
  select: ["select", "hold", "quickfire"],
  hold: ["hold", "select", "quickfire"],
};

function pairWeaponPaths(primary: FiringPath[], compare: FiringPath[], weapon: Weapon): DiffRow[] {
  if (primary.length === 0 && compare.length === 0) return [];
  if (primary.length === 1 && compare.length === 1) {
    return [{ weapon, primary: primary[0], compare: compare[0] }];
  }
  const rows: DiffRow[] = [];
  const remaining = [...compare];
  for (const p of primary) {
    const prefs = TYPE_PREFERENCE[pathType(p)];
    let matchIdx = -1;
    for (const pref of prefs) {
      matchIdx = remaining.findIndex((c) => pathType(c) === pref);
      if (matchIdx !== -1) break;
    }
    if (matchIdx !== -1) {
      rows.push({ weapon, primary: p, compare: remaining[matchIdx] });
      remaining.splice(matchIdx, 1);
    } else {
      rows.push({ weapon, primary: p });
    }
  }
  for (const c of remaining) {
    rows.push({ weapon, compare: c });
  }
  return rows;
}

const PATH_TYPE_ORDER: Record<PathType, number> = { quickfire: 0, select: 1, hold: 2 };

function rowSortKey(row: DiffRow): number {
  const ref = row.primary ?? row.compare;
  return ref ? PATH_TYPE_ORDER[pathType(ref)] : 99;
}

interface WeaponChainBlock {
  keyLabel: string;
  body: string;
  chain: AliasChainEntry[];
  macroRefs: Set<string>;
}

// Build the bind+alias chain block for one firing path. Manual paths' rebind
// of the fire key is already visible inside the trigger's alias walk (e.g.
// `bind mouse1 +shaft` then `+shaft: weapon 8 3 2; +attack`), so a second
// block keyed on the fire key is pure duplication and is dropped.
//
// When a `+X` alias appears in the chain and a matching `-X` release alias
// exists, `-X` is inlined right after `+X`'s subtree so press/release read as
// a pair. Pairing runs at any depth (top-level bind body AND aliases nested
// inside other aliases).
function buildChainBlocks(
  p: FiringPath | undefined,
  bindCmds: Record<string, string>,
  aliases: Record<string, string>,
): WeaponChainBlock[] {
  if (!p) return [];
  const triggerBody = bindCmds[p.trigger_key.toUpperCase()] ?? "";
  const triggerResolved = resolveAliasChain(triggerBody, aliases);

  const pairedChain: AliasChainEntry[] = [];
  const pairedMacroRefs = new Set<string>(triggerResolved.macroRefs);
  const injected = new Set<string>();
  const chain = triggerResolved.chain;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    pairedChain.push(entry);

    const canPair = entry.name.startsWith("+") && entry.name.length >= 2;
    if (!canPair) continue;
    const releaseName = "-" + entry.name.slice(1);
    if (injected.has(releaseName)) continue;
    const releaseBody =
      aliases[releaseName] ?? aliases[releaseName.toLowerCase()];
    if (releaseBody === undefined) continue;
    injected.add(releaseName);

    // Flush all descendants of `+X` first, then inject `-X` at the same depth
    // so the pair reads as siblings with their own subtrees underneath.
    let j = i + 1;
    while (j < chain.length && chain[j].depth > entry.depth) {
      pairedChain.push(chain[j]);
      j++;
    }
    i = j - 1;

    pairedChain.push({
      name: releaseName,
      command: releaseBody,
      depth: entry.depth,
    });
    const nested = resolveAliasChain(releaseBody, aliases);
    for (const n of nested.chain) {
      pairedChain.push({ ...n, depth: n.depth + entry.depth + 1 });
    }
    for (const r of nested.macroRefs) pairedMacroRefs.add(r);
  }

  return [{
    keyLabel: p.trigger_key,
    body: triggerBody,
    chain: pairedChain,
    macroRefs: pairedMacroRefs,
  }];
}

interface CvarOverride {
  cvar: string;
  value: string;
  sourceAlias: string;
  isSensitivity: boolean;
}

interface ModifierBlock {
  weapon: Weapon;
  dispatchedAlias: string;
  chain: AliasChainEntry[];
  macroRefs: Set<string>;
  overrides: CvarOverride[];
}

// Walk the dispatched alias body (and nested alias calls) collecting every
// `cvar value` statement where the first token resolves to a known cvar.
// Mirrors the chain expansion used by the bind view.
function extractCvarOverrides(
  aliasName: string,
  aliases: Record<string, string>,
  maxDepth = 8,
): CvarOverride[] {
  const result: CvarOverride[] = [];
  const visited = new Set<string>();

  function walk(name: string, depth: number) {
    if (depth >= maxDepth || visited.has(name)) return;
    visited.add(name);
    const body = aliases[name] ?? aliases[name.toLowerCase()];
    if (!body) return;

    for (const stmt of body.split(";")) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      const firstSpace = trimmed.search(/\s/);
      if (firstSpace === -1) {
        // Lone token — could be another alias to recurse into.
        if (aliases[trimmed] !== undefined) walk(trimmed, depth + 1);
        continue;
      }
      const cvarName = trimmed.slice(0, firstSpace);
      const value = trimmed.slice(firstSpace + 1).trim();
      if (lookupCvar(cvarName)) {
        result.push({
          cvar: cvarName,
          value,
          sourceAlias: name,
          isSensitivity: cvarName.toLowerCase() === "sensitivity",
        });
      }
    }
  }

  walk(aliasName, 0);
  return result;
}

function buildModifierBlock(
  weapon: Weapon,
  dispatch: WeaponChangeDispatch | null | undefined,
  aliases: Record<string, string>,
): ModifierBlock | null {
  if (!dispatch) return null;
  const dispatched = dispatch.per_weapon?.[weapon];
  if (!dispatched) return null;
  // Skip the block when the weapon's dispatch alias matches the else-branch —
  // no deviation from baseline, nothing worth surfacing.
  if (dispatch.else_alias && dispatched === dispatch.else_alias) return null;

  const resolved = resolveAliasChain(dispatched, aliases);
  const overrides = extractCvarOverrides(dispatched, aliases);
  return {
    weapon,
    dispatchedAlias: dispatched,
    chain: resolved.chain,
    macroRefs: resolved.macroRefs,
    overrides,
  };
}

function formatSensDisplay(
  value: string,
  sensBaseline: number | null | undefined,
  cvars: Record<string, string> | undefined,
): string {
  const baseline =
    sensBaseline !== null && sensBaseline !== undefined
      ? sensBaseline
      : (() => {
          const raw = cvars?.sensitivity;
          const parsed = raw !== undefined ? parseFloat(raw) : NaN;
          return Number.isFinite(parsed) ? parsed : null;
        })();
  if (baseline === null) return value;
  return `${value} (base ${baseline})`;
}

function WeaponChainStack(props: {
  weapon: Weapon;
  path: FiringPath | undefined;
  bindCmds: Record<string, string>;
  aliases: Record<string, string>;
  cvars?: Record<string, string>;
  dispatch?: WeaponChangeDispatch | null;
  sensBaseline?: number | null;
  hideDefaults?: boolean;
  aliasChainMode?: "pretty" | "raw";
  resolver?: RuntimeResolver | null;
  playerState?: PlayerState;
  ownerClass: string;
}) {
  const blocks = () => buildChainBlocks(props.path, props.bindCmds, props.aliases);
  const modifier = () => buildModifierBlock(props.weapon, props.dispatch, props.aliases);
  const hasAnyContent = () => blocks().length > 0 || modifier() !== null;
  const mergedMacroRefs = () => {
    const refs = new Set<string>();
    for (const b of blocks()) for (const r of b.macroRefs) refs.add(r);
    const m = modifier();
    if (m) for (const r of m.macroRefs) refs.add(r);
    return refs;
  };
  return (
    <Show when={hasAnyContent()}>
      <For each={blocks()}>
        {(block) => (
          <div class={`sg-alias-chain ${props.ownerClass}`}>
            <div class="sg-alias-chain-entry" style="padding-left: 12px">
              <span class="sg-alias-chain-name">bind {block.keyLabel.toUpperCase()}</span>
              <span class="sg-alias-chain-cmd">{block.body || "<missing>"}</span>
            </div>
            <For each={block.chain}>
              {(entry) => (
                <div
                  class="sg-alias-chain-entry"
                  style={{ "padding-left": `${28 + entry.depth * 16}px` }}
                >
                  <span class="sg-alias-chain-name">alias {entry.name}</span>
                  <span class="sg-alias-chain-cmd">{entry.command}</span>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
      <Show when={modifier()}>
        {(m) => (
          <div class={`sg-alias-chain ${props.ownerClass}`}>
            <div class="sg-alias-chain-entry" style="padding-left: 12px">
              <span class="sg-alias-chain-name">
                when {m().weapon.toUpperCase()} active
              </span>
              <span class="sg-alias-chain-cmd">{m().dispatchedAlias}</span>
            </div>
            <Show when={m().overrides.length > 0}>
              <div class="sg-alias-chain-macro-deps">
                <div class="sg-alias-chain-macro-deps-label">
                  Overrides ({m().overrides.length})
                </div>
                <For each={m().overrides}>
                  {(ov) => (
                    <div class="sg-macro-row">
                      <span class="sg-alias-chain-name">{ov.cvar}</span>
                      <span class="text-[var(--sg-text-bright)] font-semibold">
                        {ov.isSensitivity
                          ? formatSensDisplay(ov.value, props.sensBaseline, props.cvars)
                          : ov.value}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
            <For each={m().chain}>
              {(entry) => (
                <div
                  class="sg-alias-chain-entry"
                  style={{ "padding-left": `${28 + entry.depth * 16}px` }}
                >
                  <span class="sg-alias-chain-name">alias {entry.name}</span>
                  <span class="sg-alias-chain-cmd">{entry.command}</span>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
      {/* Macro-deps panel: union of refs across bind chain + modifier chain. */}
      <AliasChainView
        chain={[]}
        macroRefs={mergedMacroRefs()}
        primaryCvars={props.cvars}
        hideDefaults={props.hideDefaults}
        ownerClass={props.ownerClass}
        mode={props.aliasChainMode}
        resolver={props.resolver ?? null}
        playerState={props.playerState}
      />
    </Show>
  );
}

export function ConfigWeaponBindsSection(props: WeaponBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;

  // Per-weapon pairing via type-preference matching. Weapons with no paths on
  // either side get a placeholder row so every weapon is always represented.
  const rows = (): DiffRow[] => {
    const result: DiffRow[] = [];
    for (const weapon of WEAPON_ORDER) {
      const pForW = props.primaryBinds.filter((p) => p.weapon === weapon);
      const cForW = (props.compareBinds ?? []).filter((p) => p.weapon === weapon);
      const paired = pairWeaponPaths(pForW, cForW, weapon);
      if (paired.length === 0) {
        result.push({ weapon });
      } else {
        paired.sort((a, b) => rowSortKey(a) - rowSortKey(b));
        result.push(...paired);
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
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Weapon</span>
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Bind" : "Key"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <For each={rows()}>
        {(row) => {
          const color = WEAPON_COLORS[row.weapon] ?? "var(--sg-text-dim)";
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
                  <span class="text-[0.6875rem] text-[var(--sg-section-label)] w-3">
                    {hasContent ? (isExpanded() ? "▾" : "▸") : ""}
                  </span>
                  <span class="text-[0.8125rem] font-bold uppercase" style={{ color, opacity: isPlaceholder ? 0.4 : 1 }}>
                    {row.weapon.toUpperCase()}
                  </span>
                  <span class="text-[0.6875rem] text-[var(--sg-section-label)]" style={{ opacity: isPlaceholder ? 0.4 : 1 }}>
                    {WEAPON_LABELS[row.weapon]}
                  </span>
                </div>

                {/* Primary path cell */}
                <div class="flex items-center gap-1">
                  <Show when={row.primary} fallback={
                    <span class="text-[0.6875rem] text-[var(--sg-section-label)] italic">--</span>
                  }>
                    {(p) => (
                      <>
                        {formatFiringSentence(p(), color)}
                        <Show when={p().source === "engine_default"}>
                          <span class="text-[0.625rem] text-[var(--sg-section-label)] italic">(default)</span>
                        </Show>
                      </>
                    )}
                  </Show>
                </div>

                {/* Compare path cell (only in compare mode) */}
                <Show when={isCompare()}>
                  <div class="flex items-center gap-1">
                    <Show when={row.compare} fallback={
                      <span class="text-[0.6875rem] text-[var(--sg-section-label)] italic">--</span>
                    }>
                      {(p) => (
                        <>
                          {formatFiringSentence(p(), color)}
                          <Show when={p().source === "engine_default"}>
                            <span class="text-[0.625rem] text-[var(--sg-section-label)] italic">(default)</span>
                          </Show>
                        </>
                      )}
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Expanded view: bind + alias chain for each firing path, with
                  teal (yours) / orange (theirs) color coding. Manual paths get
                  two blocks: the trigger bind + the effective fire-key bind. */}
              <Show when={isExpanded() && hasContent}>
                <div class="sg-domain-bind-expanded">
                  <WeaponChainStack
                    weapon={row.weapon}
                    path={row.primary}
                    bindCmds={props.primaryBindCommands ?? {}}
                    aliases={props.primaryAliases ?? {}}
                    cvars={props.primaryCvars}
                    dispatch={props.primaryDispatch}
                    sensBaseline={props.primarySensBaseline}
                    hideDefaults={props.hideDefaults}
                    aliasChainMode={props.aliasChainMode}
                    resolver={props.resolver ?? null}
                    playerState={props.playerState}
                    ownerClass="sg-alias-chain-you"
                  />
                  <Show when={isCompare()}>
                    <WeaponChainStack
                      weapon={row.weapon}
                      path={row.compare}
                      bindCmds={props.compareBindCommands ?? {}}
                      aliases={props.compareAliases ?? {}}
                      cvars={props.compareCvars}
                      dispatch={props.compareDispatch}
                      sensBaseline={props.compareSensBaseline}
                      hideDefaults={props.hideDefaults}
                      aliasChainMode={props.aliasChainMode}
                      resolver={props.resolver ?? null}
                      playerState={props.playerState}
                      ownerClass="sg-alias-chain-them"
                    />
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
  /** All keys in the primary config bound to this label. Some players bind
      the same teamsay (report, lost) to multiple keys (e.g. `1` + `MwheelUp`). */
  primaryKeys: string[];
  compareKeys: string[];
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
  primaryCvars?: Record<string, string>;
  compareCvars?: Record<string, string>;
  hideDefaults?: boolean;
  aliasChainMode?: "pretty" | "raw";
  resolver?: RuntimeResolver | null;
  playerState?: PlayerState;
}

export function ConfigTeamsayBindsSection(props: TeamsayBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;

  const actions = (): TeamsayAction[] => {
    const map = new Map<string, TeamsayAction>();

    for (const tb of props.primaryBinds) {
      const key = `${tb.category}:${tb.label}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.primaryKeys.includes(tb.key)) existing.primaryKeys.push(tb.key);
      } else {
        map.set(key, {
          label: tb.label,
          category: tb.category,
          description: tb.description,
          primaryKeys: [tb.key],
          compareKeys: [],
        });
      }
    }

    for (const tb of props.compareBinds ?? []) {
      const key = `${tb.category}:${tb.label}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.compareKeys.includes(tb.key)) existing.compareKeys.push(tb.key);
      } else {
        map.set(key, {
          label: tb.label,
          category: tb.category,
          description: tb.description,
          primaryKeys: [],
          compareKeys: [tb.key],
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

  function getChain(key: string | undefined, bindCommands: Record<string, string>, aliases: Record<string, string>): AliasChainResult {
    if (!key) return { chain: [], macroRefs: new Set() };
    const cmd = bindCommands[key.toUpperCase()];
    if (!cmd) return { chain: [], macroRefs: new Set() };
    return resolveAliasChain(cmd, aliases);
  }

  return (
    <div>
      <div class="sg-category-group-header">Teamplay Binds</div>

      <div
        class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Action</span>
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Bind" : "Key"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
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
                  const hasAnyKey = () => action.primaryKeys.length > 0 || action.compareKeys.length > 0;
                  const primaryKey = () => action.primaryKeys[0];
                  const compareKey = () => action.compareKeys[0];

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
                          "sg-cv-bind-only-left": isCompare() && action.primaryKeys.length > 0 && action.compareKeys.length === 0,
                          "sg-cv-bind-only-right": isCompare() && action.primaryKeys.length === 0 && action.compareKeys.length > 0,
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
                          <span class="text-[0.6875rem] text-[var(--sg-section-label)] w-3">
                            {hasAnyKey() ? (isExpanded() ? "▾" : "▸") : ""}
                          </span>
                          <span class="text-[0.8125rem] font-semibold capitalize" style={{ color }}>
                            {action.label}
                          </span>
                        </div>

                        <div class="flex flex-wrap items-center gap-1">
                          <Show when={action.primaryKeys.length > 0} fallback={
                            <span class="text-[0.6875rem] text-[var(--sg-section-label)] italic">—</span>
                          }>
                            <For each={action.primaryKeys}>
                              {(k) => (
                                <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                                  {k}
                                </span>
                              )}
                            </For>
                          </Show>
                        </div>

                        <Show when={isCompare()}>
                          <div class="flex flex-wrap items-center gap-1">
                            <Show when={action.compareKeys.length > 0} fallback={
                              <span class="text-[0.6875rem] text-[var(--sg-section-label)] italic">—</span>
                            }>
                              <For each={action.compareKeys}>
                                {(k) => (
                                  <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                                    {k}
                                  </span>
                                )}
                              </For>
                            </Show>
                          </div>
                        </Show>
                      </div>

                      {/* Expanded alias chain */}
                      <Show when={isExpanded()}>
                        <div class="sg-domain-bind-expanded">
                          <Show when={primaryKey()}>
                            {(key) => {
                              const result = () => getChain(key(), props.primaryBindCommands, props.primaryAliases);
                              const rawCmd = () => props.primaryBindCommands[key().toUpperCase()];
                              return (
                                <>
                                  <Show when={result().chain.length > 0}>
                                    <AliasChainView
                                      chain={result().chain}
                                      macroRefs={result().macroRefs}
                                      primaryCvars={props.primaryCvars}
                                      hideDefaults={props.hideDefaults}
                                      ownerClass="sg-alias-chain-you"
                                      mode={props.aliasChainMode}
                                      resolver={props.resolver ?? null}
                                      playerState={props.playerState}
                                    />
                                  </Show>
                                  <Show when={result().chain.length === 0 && rawCmd()}>
                                    <div class="sg-alias-chain sg-alias-chain-you">
                                      <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                        <span class="sg-alias-chain-cmd">{rawCmd()}</span>
                                      </div>
                                    </div>
                                  </Show>
                                </>
                              );
                            }}
                          </Show>
                          <Show when={isCompare() && compareKey()}>
                            {(key) => {
                              const result = () => getChain(key(), props.compareBindCommands, props.compareAliases);
                              const rawCmd = () => props.compareBindCommands[key().toUpperCase()];
                              return (
                                <>
                                  <Show when={result().chain.length > 0}>
                                    <AliasChainView
                                      chain={result().chain}
                                      macroRefs={result().macroRefs}
                                      primaryCvars={props.compareCvars}
                                      hideDefaults={props.hideDefaults}
                                      ownerClass="sg-alias-chain-them"
                                      mode={props.aliasChainMode}
                                      resolver={props.resolver ?? null}
                                      playerState={props.playerState}
                                    />
                                  </Show>
                                  <Show when={result().chain.length === 0 && rawCmd()}>
                                    <div class="sg-alias-chain sg-alias-chain-them">
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
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Action</span>
        <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Bind" : "Key"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[0.6875rem] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      <For each={MOVEMENT_ROWS}>
        {(row) => {
          return (
            <div class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}>
              <span class="text-[0.8125rem]">{row.label}</span>
              <div>
                <Show when={props.primary[row.key]} fallback={
                  <span class="text-[0.6875rem] text-[var(--sg-section-label)] italic">--</span>
                }>
                  <span class="sg-domain-keycap">{props.primary[row.key]}</span>
                </Show>
              </div>
              <Show when={isCompare()}>
                <div>
                  <Show when={props.compare && props.compare[row.key]} fallback={
                    <span class="text-[0.6875rem] text-[var(--sg-section-label)] italic">--</span>
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
