# Alias Chain Macro Dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show macro dependencies (variable names + resolved values) below expanded alias chains in all config viewer sections.

**Architecture:** Modify `resolveAliasChain` to collect `$variable` tokens it currently skips, return them alongside the chain. Extend `AliasChainView` to render a "Macro Dependencies" section when cvar data is provided. Thread cvar props from ConfigViewer to all 4 consumer sections.

**Tech Stack:** SolidJS, TypeScript, qw-config package

**Spec:** `docs/superpowers/specs/2026-04-16-alias-chain-macro-dependencies-design.md`

---

### Task 1: Modify resolveAliasChain to collect macro references

**Files:**
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx:5-48`

- [ ] **Step 1: Add AliasChainResult interface and update resolveAliasChain**

Add the result interface after `AliasChainEntry` and update the function signature and body:

```typescript
export interface AliasChainEntry {
  name: string;
  command: string;
  depth: number;
}

export interface AliasChainResult {
  chain: AliasChainEntry[];
  macroRefs: Set<string>;
}
```

Update `resolveAliasChain` -- change return type and collect `$` tokens:

```typescript
export function resolveAliasChain(
  command: string,
  aliases: Record<string, string>,
  maxDepth = 8,
): AliasChainResult {
  const result: AliasChainEntry[] = [];
  const macroRefs = new Set<string>();
  const visited = new Set<string>();

  function resolve(cmd: string, depth: number) {
    if (depth >= maxDepth) return;

    const tokens = cmd.split(/[\s;]+/).filter(Boolean);
    const seen = new Set<string>();

    for (const token of tokens) {
      if (token.startsWith("'") || token.startsWith("%")) continue;
      if (token.startsWith("$")) {
        const varName = token.slice(1);
        if (varName) macroRefs.add(varName);
        continue;
      }
      if (token === "if" || token === "then" || token === "else" || token === "AND" || token === "OR") continue;
      if (/^[<>=!]+$/.test(token) || /^\d+$/.test(token)) continue;

      const aliasBody = aliases[token] ?? aliases[token.toLowerCase()];
      if (aliasBody && !visited.has(token) && !seen.has(token)) {
        seen.add(token);
        visited.add(token);
        result.push({ name: token, command: aliasBody, depth });
        resolve(aliasBody, depth + 1);
        visited.delete(token);
      }
    }
  }

  resolve(command, 0);
  return { chain: result, macroRefs };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/paradoks/projects/quakeworld && bunx tsc --noEmit -p apps/slipgate-app/tsconfig.json`

Expected: Type errors in all 4 consumers (`ConfigDomainBinds.tsx`, `ConfigBindsSection.tsx`, `ConfigAliasesSection.tsx`, `ConfigTriggersSection.tsx`) because they treat the return value as `AliasChainEntry[]` instead of `AliasChainResult`. This is expected -- Tasks 3-6 fix them.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/components/AliasChainResolver.tsx
git commit -m "refactor(slipgate): collect macro refs in resolveAliasChain"
```

---

### Task 2: Add macro dependencies rendering to AliasChainView

**Files:**
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx:1,52-73`

- [ ] **Step 1: Add lookupCvar import and extend AliasChainView**

Add `lookupCvar` to the imports:

```typescript
import { For, Show } from "solid-js";
import { lookupCvar } from "qw-config";
```

Replace the `AliasChainView` function with the extended version:

```typescript
interface MacroDepEntry {
  name: string;
  defaultValue: string;
  userValue?: string;
  isCustomized: boolean;
}

export function AliasChainView(props: {
  chain: AliasChainEntry[];
  label?: string;
  ownerClass?: string;
  macroRefs?: Set<string>;
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
}) {
  const macroDeps = (): MacroDepEntry[] => {
    if (!props.macroRefs || props.macroRefs.size === 0 || !props.primaryCvars) return [];

    const entries: MacroDepEntry[] = [];
    for (const name of props.macroRefs) {
      const info = lookupCvar(name);
      const defaultValue = info?.default ?? "";
      const userValue = props.primaryCvars[name];
      const isSet = userValue !== undefined;
      const isCustomized = isSet && userValue !== defaultValue;

      if (props.hideDefaults && (!isSet || !isCustomized)) continue;

      entries.push({
        name,
        defaultValue,
        userValue,
        isCustomized,
      });
    }

    entries.sort((a, b) => {
      const aCustom = a.isCustomized ? 0 : 1;
      const bCustom = b.isCustomized ? 0 : 1;
      if (aCustom !== bCustom) return aCustom - bCustom;
      return a.name.localeCompare(b.name);
    });

    return entries;
  };

  return (
    <Show when={props.chain.length > 0}>
      <div class={`sg-alias-chain ${props.ownerClass ?? ""}`}>
        <Show when={props.label}>
          <div class="sg-alias-chain-label">{props.label}</div>
        </Show>
        <For each={props.chain}>
          {(entry) => (
            <div
              class="sg-alias-chain-entry"
              style={{ "padding-left": `${12 + entry.depth * 16}px` }}
            >
              <span class="sg-alias-chain-name">{entry.name}</span>
              <span class="sg-alias-chain-cmd">{entry.command}</span>
            </div>
          )}
        </For>

        <Show when={macroDeps().length > 0}>
          <div class="sg-alias-chain-macro-deps">
            <div class="sg-alias-chain-macro-deps-label">
              Macro Dependencies ({macroDeps().length})
            </div>
            <For each={macroDeps()}>
              {(dep) => (
                <div class="sg-macro-row">
                  <span
                    class={`text-[13px] ${
                      dep.isCustomized
                        ? "text-[var(--color-warning)]"
                        : "text-[var(--sg-section-label)]"
                    }`}
                  >
                    {dep.name}
                  </span>
                  <span
                    class={`text-[13px] ${
                      dep.isCustomized
                        ? "text-[var(--sg-text-bright)] font-semibold"
                        : "text-[var(--sg-section-label)]"
                    }`}
                  >
                    {dep.userValue ?? (dep.defaultValue || "\u2014")}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
```

- [ ] **Step 2: Add CSS for the macro deps label**

In whatever CSS file contains the `sg-alias-chain` styles, add:

```css
.sg-alias-chain-macro-deps {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--sg-stat-border);
}
.sg-alias-chain-macro-deps-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sg-section-label);
  padding: 2px 12px;
}
```

Find the CSS file first:

Run: `grep -rn "sg-alias-chain-label" apps/slipgate-app/src/ --include="*.css" -l`

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/components/AliasChainResolver.tsx
git add <css-file-from-step-2>
git commit -m "feat(slipgate): add macro dependencies rendering to AliasChainView"
```

---

### Task 3: Update ConfigDomainBinds.tsx (teamsay binds)

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigDomainBinds.tsx:341-350,412-416,514-563`

- [ ] **Step 1: Add cvar props to TeamsayBindsProps**

Add two new props to the `TeamsayBindsProps` interface (around line 341):

```typescript
interface TeamsayBindsProps {
  primaryBinds: TeamsayBind[];
  compareBinds?: TeamsayBind[];
  primaryAliases: Record<string, string>;
  compareAliases: Record<string, string>;
  primaryBindCommands: Record<string, string>;
  compareBindCommands: Record<string, string>;
  isLabelSelected?: (label: string) => boolean;
  onLabelClick?: (label: string) => void;
  // New
  primaryCvars?: Record<string, string>;
  compareCvars?: Record<string, string>;
  hideDefaults?: boolean;
}
```

- [ ] **Step 2: Update getChain return type and destructuring**

Change the `getChain` helper (line 412) to return `AliasChainResult`:

```typescript
import { resolveAliasChain, AliasChainView, type AliasChainResult } from "./AliasChainResolver";
```

```typescript
  function getChain(key: string | undefined, bindCommands: Record<string, string>, aliases: Record<string, string>): AliasChainResult {
    if (!key) return { chain: [], macroRefs: new Set() };
    const cmd = bindCommands[key.toUpperCase()];
    if (!cmd) return { chain: [], macroRefs: new Set() };
    return resolveAliasChain(cmd, aliases);
  }
```

- [ ] **Step 3: Update AliasChainView calls in the expansion area**

In the expansion area (around lines 514-563), update both primary and compare `AliasChainView` calls. The `chain()` variable now returns `AliasChainResult`, so access `.chain` for the chain and `.macroRefs` for the refs.

For the primary side (around line 516):
```typescript
const result = () => getChain(key(), props.primaryBindCommands, props.primaryAliases);
```

Then update the `AliasChainView` call:
```tsx
<Show when={result().chain.length > 0}>
  <AliasChainView
    chain={result().chain}
    label={`${key()} \u2014 your config`}
    ownerClass="sg-alias-chain-you"
    macroRefs={result().macroRefs}
    primaryCvars={props.primaryCvars}
    hideDefaults={props.hideDefaults}
  />
</Show>
<Show when={result().chain.length === 0 && rawCmd()}>
```

For the compare side (around line 541):
```typescript
const result = () => getChain(key(), props.compareBindCommands, props.compareAliases);
```

Then update the `AliasChainView` call:
```tsx
<Show when={result().chain.length > 0}>
  <AliasChainView
    chain={result().chain}
    label={`${key()} \u2014 comparison`}
    ownerClass="sg-alias-chain-them"
    macroRefs={result().macroRefs}
    primaryCvars={props.compareCvars}
    hideDefaults={props.hideDefaults}
  />
</Show>
<Show when={result().chain.length === 0 && rawCmd()}>
```

Note: For the compare side chain, we pass `compareCvars` as `primaryCvars` because each chain shows its own config's macro values.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /home/paradoks/projects/quakeworld && bunx tsc --noEmit -p apps/slipgate-app/tsconfig.json`

Expected: Still type errors in the other 3 consumers, but ConfigDomainBinds should be clean.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigDomainBinds.tsx
git commit -m "feat(slipgate): thread cvar data to teamsay bind alias chains"
```

---

### Task 4: Update ConfigBindsSection.tsx (misc binds)

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigBindsSection.tsx:1-10,5-9,28-31,210-240`

- [ ] **Step 1: Add cvar props and update interface**

Import the new type:
```typescript
import { resolveAliasChain, AliasChainView, type AliasChainResult } from "./AliasChainResolver";
```

Add props to `ConfigBindsSectionProps`:
```typescript
interface ConfigBindsSectionProps {
  binds: EnrichedBind[];
  isCompareMode?: boolean;
  primaryAliases?: Record<string, string>;
  compareAliases?: Record<string, string>;
  // New
  primaryCvars?: Record<string, string>;
  compareCvars?: Record<string, string>;
  hideDefaults?: boolean;
}
```

- [ ] **Step 2: Update getChain helper**

```typescript
  function getChain(command: string, aliases?: Record<string, string>): AliasChainResult {
    if (!aliases || !command) return { chain: [], macroRefs: new Set() };
    return resolveAliasChain(command, aliases);
  }
```

- [ ] **Step 3: Update all AliasChainView calls**

There are 4 `AliasChainView` calls in this file. Each needs `.chain` access and the new props. The `chain()` and `compareChain()` variables now return `AliasChainResult`.

For primary chain calls (lines ~216, ~229):
```tsx
<AliasChainView
  chain={chain().chain}
  ownerClass="sg-alias-chain-you"
  macroRefs={chain().macroRefs}
  primaryCvars={props.primaryCvars}
  hideDefaults={props.hideDefaults}
/>
```

For compare chain call (line ~220):
```tsx
<AliasChainView
  chain={compareChain().chain}
  ownerClass="sg-alias-chain-them"
  macroRefs={compareChain().macroRefs}
  primaryCvars={props.compareCvars}
  hideDefaults={props.hideDefaults}
/>
```

For modifier press/release chains (lines ~229, ~235):
```tsx
<AliasChainView
  chain={chain().chain}
  macroRefs={chain().macroRefs}
  primaryCvars={props.primaryCvars}
  hideDefaults={props.hideDefaults}
/>
```
```tsx
<AliasChainView
  chain={releaseChain().chain}
  macroRefs={releaseChain().macroRefs}
  primaryCvars={props.primaryCvars}
  hideDefaults={props.hideDefaults}
/>
```

Also update any `.length` checks on these variables from `chain().length > 0` to `chain().chain.length > 0`.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigBindsSection.tsx
git commit -m "feat(slipgate): thread cvar data to misc bind alias chains"
```

---

### Task 5: Update ConfigAliasesSection.tsx

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigAliasesSection.tsx:1-8,17-19,43-45,79`

- [ ] **Step 1: Add cvar props and update interface**

Import the new type:
```typescript
import { resolveAliasChain, AliasChainView, type AliasChainResult } from "./AliasChainResolver";
```

Add props:
```typescript
interface ConfigAliasesSectionProps {
  aliases: EnrichedAlias[];
  allAliases?: Record<string, string>;
  // New
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
}
```

- [ ] **Step 2: Update getChain helper**

```typescript
  function getChain(command: string): AliasChainResult {
    if (!props.allAliases) return { chain: [], macroRefs: new Set() };
    return resolveAliasChain(command, props.allAliases);
  }
```

- [ ] **Step 3: Update AliasChainView call and chain length checks**

Update the `isExpandable` check (line 45):
```typescript
const isExpandable = () => alias.command.length > 60 || chain().chain.length > 0;
```

Update the `AliasChainView` call (line 79):
```tsx
<AliasChainView
  chain={chain().chain}
  label="Alias chain"
  macroRefs={chain().macroRefs}
  primaryCvars={props.primaryCvars}
  hideDefaults={props.hideDefaults}
/>
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigAliasesSection.tsx
git commit -m "feat(slipgate): thread cvar data to alias section chain view"
```

---

### Task 6: Update ConfigTriggersSection.tsx

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigTriggersSection.tsx:2,159-161,165,240`

- [ ] **Step 1: Add cvar props and update**

Import the new type:
```typescript
import { resolveAliasChain, AliasChainView, type AliasChainResult } from "./AliasChainResolver";
```

Add props to the component's interface (find the props interface in the file):
```typescript
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
```

- [ ] **Step 2: Update getChain helper**

```typescript
  function getChain(command: string): AliasChainResult {
    return resolveAliasChain(command, props.aliases);
  }
```

- [ ] **Step 3: Update chain length check and AliasChainView call**

Update the chain usage in `renderRow` (line 165):
```typescript
const chain = () => row.userCommand ? getChain(row.userCommand) : { chain: [], macroRefs: new Set<string>() };
```

Update the `AliasChainView` call (line 240):
```tsx
<AliasChainView
  chain={chain().chain}
  label="Alias chain"
  macroRefs={chain().macroRefs}
  primaryCvars={props.primaryCvars}
  hideDefaults={props.hideDefaults}
/>
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigTriggersSection.tsx
git commit -m "feat(slipgate): thread cvar data to trigger alias chains"
```

---

### Task 7: Thread cvar props from ConfigViewer.tsx

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:829-841,857-862,866,882-886`

- [ ] **Step 1: Add cvar props to ConfigTeamsayBindsSection call site**

Around line 829. Note: `compareCvars()` is a `Map<string, string>` in ConfigViewer, but `TeamsayBindsProps` and `ConfigBindsSectionProps` expect `Record<string, string>`. Convert with `Object.fromEntries()`:
```tsx
<ConfigTeamsayBindsSection
  primaryBinds={primaryTeamsayBinds()}
  compareBinds={compareTeamsayBinds()}
  primaryAliases={primaryAliases()}
  compareAliases={compareAliases()}
  primaryBindCommands={primaryBindCommands()}
  compareBindCommands={compareBindCommands()}
  primaryCvars={effectiveCvars()}
  compareCvars={isCompareMode() ? Object.fromEntries(compareCvars()) : undefined}
  hideDefaults={hideDefaults()}
  isLabelSelected={kbState.isLabelSelected}
  onLabelClick={(l) => {
    if (kbState.isLabelSelected(l)) kbState.setSelection(null);
    else kbState.setSelection([{ kind: "teamsay", label: l }]);
  }}
/>
```

- [ ] **Step 2: Add cvar props to ConfigBindsSection call site**

Around line 857:
```tsx
<ConfigBindsSection
  binds={allBinds()}
  isCompareMode={isCompareMode()}
  primaryAliases={primaryAliases()}
  compareAliases={isCompareMode() ? compareAliases() : undefined}
  primaryCvars={effectiveCvars()}
  compareCvars={isCompareMode() ? Object.fromEntries(compareCvars()) : undefined}
  hideDefaults={hideDefaults()}
/>
```

- [ ] **Step 3: Add cvar props to ConfigAliasesSection call site**

Around line 866:
```tsx
<ConfigAliasesSection
  aliases={filteredAliases()}
  allAliases={primaryAliases()}
  primaryCvars={effectiveCvars()}
  hideDefaults={hideDefaults()}
/>
```

- [ ] **Step 4: Add cvar props to ConfigTriggersSection call site**

Around line 882:
```tsx
<ConfigTriggersSection
  aliases={primaryAliases()}
  compareAliases={isCompareMode() ? compareAliases() : undefined}
  search={search()}
  primaryCvars={effectiveCvars()}
  hideDefaults={hideDefaults()}
/>
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

Run: `cd /home/paradoks/projects/quakeworld && bunx tsc --noEmit -p apps/slipgate-app/tsconfig.json`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat(slipgate): thread cvar data from ConfigViewer to all alias chain consumers"
```

---

### Task 8: Manual verification

- [ ] **Step 1: Start dev server, verify teamsay binds**

Open config viewer, go to Domains > Teamplay > Binds. Expand a teamsay bind. Verify a "Macro Dependencies" section appears below the alias chain listing the `$variable` names with resolved values. Customized values should be highlighted.

- [ ] **Step 2: Verify Settings > Aliases**

Go to Settings > Aliases. Expand an alias that contains `$variable` references. Verify macro dependencies appear.

- [ ] **Step 3: Verify Settings > Binds**

Go to Settings > Binds. Expand a bind with alias chains. Verify macro dependencies appear.

- [ ] **Step 4: Verify hide-defaults toggle**

Toggle "hide defaults" on. Verify only customized macro dependencies remain visible. Verify alias chains with no customized dependencies show no dependency section.

- [ ] **Step 5: Verify compare mode**

Load a second config. Expand a teamsay bind. Verify two-column macro dependencies (yours vs comparison) with correct highlighting.

- [ ] **Step 6: Push**

```bash
git push origin main
```
