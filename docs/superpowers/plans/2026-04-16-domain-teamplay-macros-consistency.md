# Domain Teamplay Macros Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Domains > Teamplay > Macros show all teamplay-category macros from the database (matching Settings > Macros), instead of only alias-chain-reachable ones.

**Architecture:** Replace alias-chain extraction in ConfigTeamplayMacros with database-category sourcing identical to ConfigMacrosSection, minus Runtime Macros. Simplify props interface. Remove dead code from ConfigViewer.

**Tech Stack:** SolidJS, TypeScript, qw-config package

**Spec:** `docs/superpowers/specs/2026-04-16-domain-teamplay-macros-consistency-design.md`

---

### Task 1: Rewrite ConfigTeamplayMacros.tsx

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigTeamplayMacros.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file content**

Replace the full contents of `ConfigTeamplayMacros.tsx` with:

```tsx
import { createMemo, For, Show } from "solid-js";
import { loadDatabase } from "qw-config";

interface MacroEntry {
  name: string;
  group: string;
  defaultValue: string;
  description: string;
  userValue?: string;
  compareValue?: string;
  isSet: boolean;
  isCustomized: boolean;
  compareIsSet: boolean;
  compareIsCustomized: boolean;
}

interface ConfigTeamplayMacrosProps {
  primaryCvars: Record<string, string>;
  compareCvars?: Map<string, string>;
  primaryUserCreated: Set<string>;
  compareUserCreated?: Set<string>;
  hideDefaults: boolean;
  isCompareMode: boolean;
  search: string;
}

const GROUP_ORDER = [
  "Item Names",
  "Item Need Amounts",
  "Location Names",
  "Teamplay Communications",
  "User Created",
];

const USER_CREATED_GROUP = "User Created";

export default function ConfigTeamplayMacros(props: ConfigTeamplayMacrosProps) {
  const macros = createMemo((): MacroEntry[] => {
    const db = loadDatabase();
    const entries: MacroEntry[] = [];
    const seenNames = new Set<string>();

    for (const [name, info] of db.clients.ezquake.entries()) {
      if (info.category !== "Teamplay") continue;
      seenNames.add(name);

      const defaultValue = info.default ?? "";
      const userValue = props.primaryCvars[name];
      const compareValue = props.compareCvars?.get(name);
      const isSet = userValue !== undefined;
      const isCustomized = isSet && userValue !== defaultValue;
      const compareIsSet = compareValue !== undefined;
      const compareIsCustomized = compareIsSet && compareValue !== defaultValue;

      entries.push({
        name,
        group: info.group ?? "",
        defaultValue,
        description: info.description ?? "",
        userValue,
        compareValue,
        isSet,
        isCustomized,
        compareIsSet,
        compareIsCustomized,
      });
    }

    const userCreatedNames = new Set<string>([
      ...props.primaryUserCreated,
      ...(props.compareUserCreated ?? []),
    ]);
    for (const name of userCreatedNames) {
      if (seenNames.has(name)) continue;
      const userValue = props.primaryCvars[name];
      const compareValue = props.compareCvars?.get(name);
      const isSet = userValue !== undefined;
      const compareIsSet = compareValue !== undefined;
      entries.push({
        name,
        group: USER_CREATED_GROUP,
        defaultValue: "",
        description: "User-created variable (declared via set)",
        userValue,
        compareValue,
        isSet,
        isCustomized: isSet,
        compareIsSet,
        compareIsCustomized: compareIsSet,
      });
    }

    return entries;
  });

  const filtered = createMemo(() => {
    const q = props.search.trim().toLowerCase();

    return macros().filter((m) => {
      if (props.hideDefaults) {
        const leftIsDefault = !m.isSet || !m.isCustomized;
        const rightIsDefault = !props.isCompareMode || !m.compareIsSet || !m.compareIsCustomized;
        if (leftIsDefault && rightIsDefault) return false;
      }

      if (
        q &&
        !m.name.includes(q) &&
        !m.defaultValue.toLowerCase().includes(q) &&
        !m.userValue?.toLowerCase().includes(q) &&
        !m.compareValue?.toLowerCase().includes(q)
      )
        return false;

      return true;
    });
  });

  const grouped = createMemo(() => {
    const groups = new Map<string, MacroEntry[]>();
    for (const m of filtered()) {
      const arr = groups.get(m.group) ?? [];
      arr.push(m);
      groups.set(m.group, arr);
    }

    return GROUP_ORDER.filter((g) => groups.has(g))
      .map((g) => ({ group: g, entries: groups.get(g)! }))
      .concat(
        Array.from(groups.entries())
          .filter(([g]) => !GROUP_ORDER.includes(g))
          .map(([g, entries]) => ({ group: g, entries })),
      );
  });

  const totalCount = () => macros().length;
  const shownCount = () => filtered().length;
  const customizedCount = () =>
    macros().filter((m) => m.isCustomized || m.compareIsCustomized).length;

  return (
    <div>
      <div class="sg-category-group-header">
        Teamplay Macros
        <span class="text-[11px] font-normal text-[var(--sg-section-label)] ml-2">
          {customizedCount()} customized / {shownCount()} shown / {totalCount()} total
        </span>
      </div>

      {/* Column headers */}
      <div
        class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          Macro
        </span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {props.isCompareMode ? "Your Config" : "Value"}
        </span>
        <Show when={props.isCompareMode}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
            Comparison
          </span>
        </Show>
      </div>

      <Show
        when={grouped().length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            {props.hideDefaults ? "All macros are at default values" : "No macros found"}
          </div>
        }
      >
        <For each={grouped()}>
          {(group) => (
            <>
              <div class="sg-domain-bind-category" style="color: var(--sg-section-label)">
                {group.group}
              </div>
              <For each={group.entries}>
                {(macro) => {
                  const anyCustomized = macro.isCustomized || macro.compareIsCustomized;
                  return (
                    <div
                      class={props.isCompareMode ? "sg-macro-row-cmp" : "sg-macro-row"}
                      title={(() => {
                        const parts = [macro.description];
                        if (macro.defaultValue) parts.push(`Default: ${macro.defaultValue}`);
                        return parts.filter(Boolean).join("\n");
                      })()}
                    >
                      <span
                        class={`text-[13px] ${
                          anyCustomized
                            ? "text-[var(--color-warning)]"
                            : "text-[var(--sg-section-label)]"
                        }`}
                      >
                        {macro.name}
                      </span>

                      <span
                        class={`text-[13px] ${
                          macro.isCustomized
                            ? "text-[var(--sg-text-bright)] font-semibold"
                            : "text-[var(--sg-section-label)]"
                        }`}
                      >
                        {macro.isSet ? macro.userValue : macro.defaultValue || "\u2014"}
                      </span>

                      <Show when={props.isCompareMode}>
                        <span
                          class={`text-[13px] ${
                            macro.compareIsCustomized
                              ? "text-[var(--sg-text-bright)] font-semibold"
                              : "text-[var(--sg-section-label)]"
                          }`}
                        >
                          {macro.compareIsSet
                            ? macro.compareValue
                            : macro.defaultValue || "\u2014"}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </>
          )}
        </For>
      </Show>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/paradoks/projects/quakeworld && bunx tsc --noEmit -p apps/slipgate-app/tsconfig.json`

Expected: Type errors for the ConfigViewer call site (old props no longer exist). That's expected -- Task 2 fixes the call site.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigTeamplayMacros.tsx
git commit -m "refactor(slipgate): rewrite ConfigTeamplayMacros to use database-category sourcing

Replace alias-chain extraction with loadDatabase() category filter,
matching ConfigMacrosSection approach. Add group subheaders, hideDefaults,
and search support."
```

---

### Task 2: Update ConfigViewer.tsx call site and remove dead code

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:556-574` (remove teamsayAliasNames memo)
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:864-874` (update props)

- [ ] **Step 1: Remove the `teamsayAliasNames` memo**

Delete lines 556-574 in ConfigViewer.tsx (the entire `teamsayAliasNames` memo and its preceding comment):

```typescript
  // ── Teamsay alias names (for macros extraction) ──
  const teamsayAliasNames = createMemo((): Set<string> => {
    const names = new Set<string>();
    const binds = effectiveConfig()?.teamsay_binds ?? [];
    const bindCmds = primaryBindCommands();
    for (const tb of binds) {
      const cmd = bindCmds[tb.key.toUpperCase()];
      if (cmd) {
        // Extract alias names from the bind command
        for (const part of cmd.split(";")) {
          const token = part.trim().split(/\s+/)[0];
          if (token && !token.startsWith("+") && !token.startsWith("-")) {
            names.add(token);
          }
        }
      }
    }
    return names;
  });
```

- [ ] **Step 2: Update the `<ConfigTeamplayMacros>` call site**

Replace the current call site (around line 865 after the deletion above):

```tsx
                <Show when={activeRow2().has("teamplay:macros")}>
                  <ConfigTeamplayMacros
                    primaryAliases={primaryAliases()}
                    compareAliases={isCompareMode() ? compareAliases() : undefined}
                    primaryCvars={effectiveCvars()}
                    compareCvars={isCompareMode() ? compareCvars() : undefined}
                    teamsayAliasNames={teamsayAliasNames()}
                    primaryUserCreated={userCreatedCvars()}
                    compareUserCreated={isCompareMode() ? compareUserCreatedCvars() : undefined}
                  />
                </Show>
```

With:

```tsx
                <Show when={activeRow2().has("teamplay:macros")}>
                  <ConfigTeamplayMacros
                    primaryCvars={effectiveCvars()}
                    compareCvars={isCompareMode() ? compareCvars() : undefined}
                    primaryUserCreated={userCreatedCvars()}
                    compareUserCreated={isCompareMode() ? compareUserCreatedCvars() : undefined}
                    hideDefaults={hideDefaults()}
                    isCompareMode={isCompareMode()}
                    search={search()}
                  />
                </Show>
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `cd /home/paradoks/projects/quakeworld && bunx tsc --noEmit -p apps/slipgate-app/tsconfig.json`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "refactor(slipgate): update ConfigTeamplayMacros call site, remove dead teamsayAliasNames memo"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start dev server and verify Domains > Teamplay > Macros**

Open the config viewer, click Domains > Teamplay > Macros. Verify:
- Shows grouped macros: Item Names, Item Need Amounts, Location Names, Teamplay Communications
- Customized macros are highlighted (warning color name, bold value)
- Stats header shows "X customized / Y shown / Z total"
- Count roughly matches Settings > Macros teamplay groups (minus Runtime Macros)

- [ ] **Step 2: Test hideDefaults toggle**

Toggle "hide defaults" on. Verify only customized macros remain visible. Toggle off, verify all macros reappear.

- [ ] **Step 3: Test search**

Type a search term (e.g. "quad"). Verify macros filter by name and value.

- [ ] **Step 4: Test compare mode**

Load a second config for comparison. Verify the three-column layout shows both configs with correct highlighting.

- [ ] **Step 5: Push**

```bash
git push origin main
```
