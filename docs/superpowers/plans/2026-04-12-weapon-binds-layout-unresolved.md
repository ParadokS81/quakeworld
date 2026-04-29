# Per-Key Weapon Bind Layout + Unresolved Bind Detection -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure weapon binds to show one row per key-weapon pair (individually expandable), and detect/flag binds referencing undefined aliases or commands as "unresolved."

**Architecture:** Two independent changes in the config viewer. Feature 1 rewrites `ConfigWeaponBindsSection` to iterate flat WeaponBind entries instead of grouping by weapon. Feature 2 adds an "unresolved" category to `categorizeBinds` by checking bind commands against known aliases, cvars, and a built-in engine commands set.

**Tech Stack:** SolidJS, TypeScript, qw-config package (cvar database)

**Spec:** `docs/superpowers/specs/2026-04-12-weapon-binds-layout-unresolved-detection-design.md`

---

### Task 1: Add "unresolved" to the EnrichedBind category type

**Files:**
- Modify: `apps/slipgate-app/src/components/configMerger.ts:13-16,24`

- [ ] **Step 1: Update the category union type on EnrichedBind**

```typescript
// Before (line 16):
  category: "movement" | "weapons" | "teamsay" | "misc";

// After:
  category: "movement" | "weapons" | "teamsay" | "unresolved" | "misc";
```

Apply the same change to `compareCategory` on line 24:

```typescript
// Before:
  compareCategory?: "movement" | "weapons" | "teamsay" | "misc";

// After:
  compareCategory?: "movement" | "weapons" | "teamsay" | "unresolved" | "misc";
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/configMerger.ts
git commit -m "feat(config-viewer): add unresolved category to EnrichedBind type"
```

---

### Task 2: Add known engine commands set and unresolved detection to categorizeBinds

**Files:**
- Modify: `apps/slipgate-app/src/components/configMerger.ts`

- [ ] **Step 1: Add the KNOWN_ENGINE_COMMANDS constant before the categorizeBinds function**

Insert above line 81 (the `categorizeBinds` JSDoc comment):

```typescript
/**
 * Built-in ezQuake engine commands that are valid bind targets.
 * This is NOT exhaustive -- add entries as false positives surface.
 * Commands with +/- variants: store without prefix, check both forms.
 */
const KNOWN_ENGINE_COMMANDS = new Set([
  // Movement / action (stored without +/- prefix)
  "forward", "back", "moveleft", "moveright", "jump", "moveup", "movedown",
  "attack", "speed", "strafe", "mlook", "klook", "use", "hook",
  "left", "right", "lookup", "lookdown",
  // Weapon
  "impulse", "weapon", "fire", "fire_ar",
  // Communication
  "say", "say_team", "messagemode", "messagemode2",
  // Meta / config
  "bind", "unbind", "unbindall", "alias", "unalias", "unalias_re",
  "set", "unset", "seta", "exec", "echo", "if", "wait",
  "toggle", "inc", "dec", "reset", "resetall", "cfg_save",
  // Client
  "quit", "disconnect", "reconnect", "connect", "join", "observe",
  "ready", "break", "noready", "toggleconsole", "clear",
  "cmdlist", "cvarlist", "apropos", "color", "name", "team",
  "reconnect", "dns", "packet", "rcon", "cl_demospeed",
  // Demo / recording
  "record", "stop", "playdemo", "timedemo", "demo_jump", "demo_setspeed",
  "easyrecord", "stopdemo",
  // Visual
  "screenshot", "vid_restart", "bf", "r_restart",
  "hud_262_load", "loadcharset", "loadloc",
  // Team play (common tp_ commands)
  "tp_msgsound", "tp_msgpoint", "tp_msg",
  "tp_took", "tp_pickup", "tp_point", "tp_report",
  // Misc actions
  "menu_main", "menu_options", "menu_keys", "togglemenu",
  "pause", "status", "serverinfo", "ping", "notify",
  "kill", "god", "fly", "noclip", "give",
  "timerefresh", "changing", "skins", "skinselect",
  "cl_weapon", "cl_weaponhide",
  // HUD
  "hud_editor", "hud_planmode",
  // Volume / media
  "volume",
  // Score
  "showscores",
]);

/** Check if a command token is a known engine command, alias, or cvar. */
function isKnownCommand(
  token: string,
  aliases: Record<string, string>,
  cvarSet: Set<string>,
): boolean {
  const t = token.toLowerCase();

  // Strip +/- prefix for engine command lookup
  const stripped = t.replace(/^[+-]/, "");
  if (KNOWN_ENGINE_COMMANDS.has(stripped)) return true;

  // Check with prefix too (some commands like "tp_msg" have no prefix)
  if (KNOWN_ENGINE_COMMANDS.has(t)) return true;

  // tp_ prefix match -- many tp_ commands exist
  if (t.startsWith("tp_")) return true;

  // Check user-defined aliases (with and without +/- prefix)
  if (aliases[token] !== undefined) return true;
  if (aliases[t] !== undefined) return true;
  if (aliases["+" + stripped] !== undefined) return true;
  if (aliases["-" + stripped] !== undefined) return true;

  // Check cvar database
  if (cvarSet.has(t)) return true;

  // Numeric literals (e.g. standalone "7" from "impulse 7" residue) are fine
  if (/^\d+(\.\d+)?$/.test(t)) return true;

  // Quoted strings are values, not commands
  if (t.startsWith('"')) return true;

  return false;
}

/**
 * Check if a bind command references any unknown commands/aliases.
 * Returns the first unresolved token, or null if all tokens are known.
 */
function findUnresolvedToken(
  command: string,
  aliases: Record<string, string>,
  cvarSet: Set<string>,
): string | null {
  // Split compound commands on semicolons
  const parts = command.split(";").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Skip if/then/else structural keywords
    const firstWord = part.split(/\s+/)[0].toLowerCase();
    if (["if", "then", "else", "and", "or", "not"].includes(firstWord)) continue;

    // The first token of each part is the command
    const token = part.split(/\s+/)[0];
    if (!token) continue;

    if (!isKnownCommand(token, aliases, cvarSet)) {
      return token;
    }
  }

  return null;
}
```

- [ ] **Step 2: Update categorizeBinds to use unresolved detection**

In the `categorizeBinds` function, add a `cvarSet` parameter and the unresolved check. First, update the function signature (line 87):

```typescript
// Before:
export function categorizeBinds(
  rawBinds: [string, string][],
  weaponBinds: WeaponBind[],
  teamsayBinds: TeamsayBind[],
  movement: MovementKeys,
  chain: ConfigChain,
  selectedIndices: Set<number>,
  aliases: Record<string, string>,
  compareClassification?: ChainBindClassification | null,
  compareRawCommands?: Record<string, string>,
): EnrichedBind[] {

// After:
export function categorizeBinds(
  rawBinds: [string, string][],
  weaponBinds: WeaponBind[],
  teamsayBinds: TeamsayBind[],
  movement: MovementKeys,
  chain: ConfigChain,
  selectedIndices: Set<number>,
  aliases: Record<string, string>,
  cvarSet: Set<string>,
  compareClassification?: ChainBindClassification | null,
  compareRawCommands?: Record<string, string>,
): EnrichedBind[] {
```

Then insert the unresolved check between the rocket jump check and the misc fallback (currently around line 196):

```typescript
    } else if (isRocketJump(command, aliases)) {
      result.push({
        key, command, category: "movement",
        label: "rocket jump", description: command,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    } else {
      // Check for unresolved commands before falling through to misc
      const unresolvedToken = findUnresolvedToken(command, aliases, cvarSet);
      if (unresolvedToken) {
        result.push({
          key, command, category: "unresolved",
          label: unresolvedToken,
          description: `${unresolvedToken} not found in config chain or engine`,
          sourceFile, hasLeft: true, hasRight, ...compareData,
        });
      } else {
        result.push({
          key, command, category: "misc",
          label: command.length > 24 ? `${command.slice(0, 24)}...` : command,
          description: command,
          sourceFile, hasLeft: true, hasRight, ...compareData,
        });
      }
    }
```

This replaces the current simple `else` block.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/components/configMerger.ts
git commit -m "feat(config-viewer): detect unresolved bind commands with engine command set"
```

---

### Task 3: Update ConfigViewer.tsx to pass cvarSet to categorizeBinds

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`

- [ ] **Step 1: Build cvarSet and pass it to categorizeBinds**

Find the `enrichedBinds` memo (search for `categorizeBinds(`). Add a cvarSet computation and pass it as a parameter. The `loadDatabase` function is already imported from `qw-config` (line 3).

```typescript
  // ── Binds data ──
  const enrichedBinds = createMemo(() => {
    if (!mergedData() || !effectiveConfig()) return [];
    const db = loadDatabase();
    const cvarNames = new Set(
      Array.from(db.clients.ezquake.entries()).map(([name]) => name),
    );
    return categorizeBinds(
      mergedData()!.binds,
      effectiveConfig()!.weapon_binds,
      effectiveConfig()!.teamsay_binds,
      effectiveConfig()!.movement,
      effectiveChain()!,
      selectedFiles(),
      primaryAliases(),
      cvarNames,
      compareBinds(),
      compareBindCommands(),
    );
  });
```

Note: `loadDatabase()` is cached internally, so calling it in a memo is cheap.

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat(config-viewer): pass cvarSet to categorizeBinds for unresolved detection"
```

---

### Task 4: Add unresolved styling to ConfigBindsSection

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigBindsSection.tsx:12-17`

- [ ] **Step 1: Add unresolved color to CATEGORY_COLORS**

```typescript
// Before:
const CATEGORY_COLORS: Record<string, string> = {
  movement: "oklch(0.7 0.15 220)",  // blue
  weapons: "oklch(0.7 0.15 30)",    // warm orange
  teamsay: "oklch(0.65 0.15 180)",  // teal
  misc: "oklch(0.6 0.03 260)",      // neutral grey-blue
};

// After:
const CATEGORY_COLORS: Record<string, string> = {
  movement: "oklch(0.7 0.15 220)",  // blue
  weapons: "oklch(0.7 0.15 30)",    // warm orange
  teamsay: "oklch(0.65 0.15 180)",  // teal
  unresolved: "oklch(0.75 0.18 85)", // yellow warning
  misc: "oklch(0.6 0.03 260)",      // neutral grey-blue
};
```

- [ ] **Step 2: Update the expand arrow to show warning triangle for unresolved binds**

In the non-compare bind row (around line 94), replace the expand arrow with a warning triangle for unresolved binds:

```typescript
// Before:
                      <span class="text-[11px] text-[var(--sg-section-label)]">
                        {hasChain() ? (isExpanded() ? "▾" : "▸") : ""}
                      </span>

// After:
                      <span class="text-[11px] text-[var(--sg-section-label)]">
                        {bind.category === "unresolved"
                          ? "⚠"
                          : hasChain() ? (isExpanded() ? "▾" : "▸") : ""}
                      </span>
```

Apply the same change to the compare-mode row (around line 127).

- [ ] **Step 3: Add expanded explanation for unresolved binds**

In the expanded section (after line 176, inside `<Show when={isExpanded()}>`), add an explanation banner at the top of the expanded content when the bind is unresolved:

```tsx
                <Show when={isExpanded()}>
                  <div class="sg-domain-bind-expanded">
                    <Show when={bind.category === "unresolved"}>
                      <div class="text-[11px] px-3 py-1.5 mb-1 rounded"
                        style={{
                          background: "color-mix(in oklch, oklch(0.75 0.18 85) 15%, transparent)",
                          color: "oklch(0.75 0.18 85)",
                        }}
                      >
                        Command <span class="font-mono font-bold">{bind.label}</span> was not found
                        as an alias in the config chain or as a known engine command. This bind will
                        likely not work during gameplay.
                      </div>
                    </Show>
                    {/* ... existing chain expansion code ... */}
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigBindsSection.tsx
git commit -m "feat(config-viewer): yellow warning styling and explanation for unresolved binds"
```

---

### Task 5: Restructure ConfigWeaponBindsSection to per-key rows

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigDomainBinds.tsx:54-227`

- [ ] **Step 1: Replace the entire ConfigWeaponBindsSection component**

Replace lines 54-227 with the new per-key row implementation:

```tsx
export function ConfigWeaponBindsSection(props: WeaponBindsProps) {
  const isCompare = () => (props.compareBinds?.length ?? 0) > 0;
  const [expanded, setExpanded] = createSignal<string | null>(null);

  /** Build a flat list of per-key rows sorted by weapon order, then key. */
  const rows = () => {
    const result: { weapon: string; primary?: WeaponBind; compare?: WeaponBind }[] = [];

    // Index compare binds by weapon+key for matching
    const compareIndex = new Map<string, WeaponBind>();
    for (const wb of props.compareBinds ?? []) {
      compareIndex.set(`${wb.weapon}:${wb.key.toUpperCase()}`, wb);
    }

    // Track which compare entries have been matched
    const matchedCompare = new Set<string>();

    // Add primary binds (one row each)
    for (const wb of props.primaryBinds) {
      const cmpKey = `${wb.weapon}:${wb.key.toUpperCase()}`;
      const cmp = compareIndex.get(cmpKey);
      if (cmp) matchedCompare.add(cmpKey);
      result.push({ weapon: wb.weapon, primary: wb, compare: cmp });
    }

    // Add compare-only binds
    for (const wb of props.compareBinds ?? []) {
      const cmpKey = `${wb.weapon}:${wb.key.toUpperCase()}`;
      if (!matchedCompare.has(cmpKey)) {
        result.push({ weapon: wb.weapon, compare: wb });
      }
    }

    // Sort: weapon order first, then key alphabetically
    const weaponPriority = new Map(WEAPON_ORDER.map((w, i) => [w, i]));
    result.sort((a, b) => {
      const wa = weaponPriority.get(a.weapon) ?? 99;
      const wb2 = weaponPriority.get(b.weapon) ?? 99;
      if (wa !== wb2) return wa - wb2;
      const ka = (a.primary?.key ?? a.compare?.key ?? "").toUpperCase();
      const kb = (b.primary?.key ?? b.compare?.key ?? "").toUpperCase();
      return ka.localeCompare(kb);
    });

    return result;
  };

  /** Weapons with no binds at all -- show placeholder row. */
  const unboundWeapons = () => {
    const bound = new Set<string>();
    for (const wb of props.primaryBinds) bound.add(wb.weapon);
    for (const wb of props.compareBinds ?? []) bound.add(wb.weapon);
    return WEAPON_ORDER.filter((w) => !bound.has(w));
  };

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
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

      {/* Per-key weapon bind rows */}
      <For each={rows()}>
        {(row) => {
          const color = WEAPON_COLORS[row.weapon] ?? "var(--sg-text-dim)";
          const rowId = `${row.weapon}:${(row.primary?.key ?? row.compare?.key ?? "").toUpperCase()}`;
          const isExpanded = () => expanded() === rowId;
          const hasPrimary = () => !!row.primary;
          const hasCompare = () => !!row.compare;

          return (
            <>
              <div
                class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}
                classList={{
                  "sg-cv-bind-only-left": isCompare() && hasPrimary() && !hasCompare(),
                  "sg-cv-bind-only-right": isCompare() && !hasPrimary() && hasCompare(),
                  "cursor-pointer": true,
                }}
                onClick={() => toggleExpand(rowId)}
              >
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-[var(--sg-section-label)] w-3">
                    {isExpanded() ? "▾" : "▸"}
                  </span>
                  <span class="text-[13px] font-bold uppercase" style={{ color }}>
                    {row.weapon.toUpperCase()}
                  </span>
                  <span class="text-[11px] text-[var(--sg-section-label)]">
                    {WEAPON_LABELS[row.weapon]}
                  </span>
                </div>

                <div class="flex items-center gap-1.5">
                  <Show when={hasPrimary()} fallback={
                    <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                  }>
                    <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                      {row.primary!.key}
                    </span>
                    <span class="text-[11px] text-[var(--sg-text-dim)]">{formatMethod(row.primary!)}</span>
                  </Show>
                </div>

                <Show when={isCompare()}>
                  <div class="flex items-center gap-1.5">
                    <Show when={hasCompare()} fallback={
                      <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
                    }>
                      <span class="sg-domain-keycap" style={{ "border-color": `color-mix(in oklch, ${color} 40%, var(--sg-stat-border))` }}>
                        {row.compare!.key}
                      </span>
                      <span class="text-[11px] text-[var(--sg-text-dim)]">{formatMethod(row.compare!)}</span>
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Expanded alias chain -- single key only */}
              <Show when={isExpanded()}>
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
                              label={`${wb().key} -- your config`}
                            />
                          </Show>
                          <Show when={chain().length === 0 && rawCmd()}>
                            <div class="sg-alias-chain">
                              <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                <span class="sg-alias-chain-name">{wb().key}</span>
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
                              label={`${wb().key} -- comparison`}
                            />
                          </Show>
                          <Show when={chain().length === 0 && rawCmd()}>
                            <div class="sg-alias-chain">
                              <div class="sg-alias-chain-entry" style="padding-left: 12px">
                                <span class="sg-alias-chain-name">{wb().key}</span>
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

      {/* Unbound weapons -- placeholder rows */}
      <For each={unboundWeapons()}>
        {(weapon) => {
          const color = WEAPON_COLORS[weapon] ?? "var(--sg-text-dim)";
          return (
            <div class={isCompare() ? "sg-domain-bind-row-cmp" : "sg-domain-bind-row"}>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-[var(--sg-section-label)] w-3" />
                <span class="text-[13px] font-bold uppercase" style={{ color, opacity: 0.4 }}>
                  {weapon.toUpperCase()}
                </span>
                <span class="text-[11px] text-[var(--sg-section-label)]" style={{ opacity: 0.4 }}>
                  {WEAPON_LABELS[weapon]}
                </span>
              </div>
              <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
              <Show when={isCompare()}>
                <span class="text-[11px] text-[var(--sg-section-label)] italic">--</span>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigDomainBinds.tsx
git commit -m "feat(config-viewer): per-key weapon bind rows with individual expand"
```

---

### Task 6: Type-check and verify

**Files:**
- None (verification only)

- [ ] **Step 1: Type-check**

Run: `cd apps/slipgate-app && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "configMerger|ConfigViewer|ConfigBinds|ConfigDomain"`

Expected: zero errors in the changed files.

- [ ] **Step 2: Manual verification**

Build from Windows terminal and test:

1. Load HangTime's config (or any config with multiple binds per weapon)
2. Verify: each weapon bind key gets its own row (RL appears multiple times)
3. Verify: weapon order preserved (RL first, AXE last)
4. Verify: expanding one row shows only that key's alias chain
5. Verify: unbound weapons show dimmed with "--"
6. Switch to Binds view -- verify unresolved binds show yellow warning triangle
7. Expand an unresolved bind -- verify explanation text appears
8. Verify: built-in commands (+attack, +jump, screenshot, etc.) are NOT flagged
9. Verify: normal aliases from the config are NOT flagged
10. Compare mode -- verify per-key matching works

- [ ] **Step 3: Commit any fixes found during verification**

```bash
git add apps/slipgate-app/src/components/
git commit -m "fix(config-viewer): address issues from per-key layout + unresolved detection verification"
```
