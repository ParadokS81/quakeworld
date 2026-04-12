# Config Primary Swap Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "View as Primary" fully replace all parsed config data so no stale values leak from the original config.

**Architecture:** Add a `configOverride` signal alongside the existing `primaryOverride`. A new `effectiveConfig()` memo replaces all `props.config` reads. `handleViewAsPrimary` calls both `read_ezquake_config` (full Rust parse) and `load_config_from_source` (chain structure) in parallel. Reset clears both overrides.

**Tech Stack:** SolidJS (signals/memos/effects), Tauri IPC (`invoke`)

**Spec:** `docs/superpowers/specs/2026-04-12-config-primary-swap-fix-design.md`

---

### Task 1: Add configOverride signal and effectiveConfig memo

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:103-106`

- [ ] **Step 1: Add the configOverride signal after primaryOverride**

At line 104, after the existing `primaryOverride` signal, add a companion signal for the full config:

```typescript
  // ── Primary override (View as Primary) ──
  const [primaryOverride, setPrimaryOverride] = createSignal<ConfigChain | null>(null);
  const [configOverride, setConfigOverride] = createSignal<EzQuakeConfig | null>(null);

  const effectiveConfig = createMemo(() => configOverride() ?? props.config);
  const effectiveChain = createMemo(() => primaryOverride() ?? props.configChain);
```

Note: `effectiveChain` already exists — just add the two new lines above it. `EzQuakeConfig` is already imported (line 4).

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat(config-viewer): add configOverride signal and effectiveConfig memo"
```

---

### Task 2: Replace all props.config references with effectiveConfig()

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx` (multiple locations)

There are 10 references to `props.config` in the component body that must switch to `effectiveConfig()`. Apply each one:

- [ ] **Step 1: Update effectiveCvars fallback (line 164-166)**

```typescript
// Before:
  const effectiveCvars = createMemo(() =>
    mergedData()?.cvars ?? props.config?.raw_cvars ?? {},
  );

// After:
  const effectiveCvars = createMemo(() =>
    mergedData()?.cvars ?? effectiveConfig()?.raw_cvars ?? {},
  );
```

- [ ] **Step 2: Update enrichedCvars guard (line 233)**

```typescript
// Before:
    if (!props.config) return [];

// After:
    if (!effectiveConfig()) return [];
```

- [ ] **Step 3: Update enrichedBinds guard and classified bind references (lines 425-430)**

```typescript
// Before:
    if (!mergedData() || !props.config) return [];
    return categorizeBinds(
      mergedData()!.binds,
      props.config.weapon_binds,
      props.config.teamsay_binds,
      props.config.movement,

// After:
    if (!mergedData() || !effectiveConfig()) return [];
    return categorizeBinds(
      mergedData()!.binds,
      effectiveConfig()!.weapon_binds,
      effectiveConfig()!.teamsay_binds,
      effectiveConfig()!.movement,
```

- [ ] **Step 4: Update primaryWeaponBinds (line 441)**

```typescript
// Before:
    const base = props.config?.weapon_binds ?? [];

// After:
    const base = effectiveConfig()?.weapon_binds ?? [];
```

- [ ] **Step 5: Update primaryTeamsayBinds (line 446)**

```typescript
// Before:
    const base = props.config?.teamsay_binds ?? [];

// After:
    const base = effectiveConfig()?.teamsay_binds ?? [];
```

- [ ] **Step 6: Update teamsayAliasNames (line 517)**

```typescript
// Before:
    const binds = props.config?.teamsay_binds ?? [];

// After:
    const binds = effectiveConfig()?.teamsay_binds ?? [];
```

- [ ] **Step 7: Update the early-return null guard (line 572)**

```typescript
// Before:
  if (!props.config) {

// After:
  if (!effectiveConfig()) {
```

- [ ] **Step 8: Update ConfigConverter prop (line 588)**

```typescript
// Before:
          config={props.config}

// After:
          config={effectiveConfig()!}
```

- [ ] **Step 9: Verify no remaining props.config references in the component body**

Run: `grep -n "props\.config" apps/slipgate-app/src/components/ConfigViewer.tsx`

Expected: zero matches (the interface declaration at line 19 is `config:` not `props.config`, so it won't match).

- [ ] **Step 10: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat(config-viewer): replace all props.config reads with effectiveConfig()"
```

---

### Task 3: Update handleViewAsPrimary to do full parse

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:554-569`

- [ ] **Step 1: Replace handleViewAsPrimary with parallel Rust calls**

```typescript
  async function handleViewAsPrimary(entry: ConfigEntry) {
    if (entry.location.type === "inside_pak") {
      console.warn("View as Primary not yet supported for configs inside paks");
      return;
    }
    try {
      const [chain, cfg] = await Promise.all([
        invoke<ConfigChain>("load_config_from_source", {
          sourceType: "local_install",
          configPath: entry.relative_path,
          contextPath: props.exePath ?? "",
        }),
        invoke<EzQuakeConfig>("read_ezquake_config", {
          exePath: props.exePath ?? "",
          configName: entry.relative_path,
        }),
      ]);
      setPrimaryOverride(chain);
      setConfigOverride(cfg);
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat(config-viewer): handleViewAsPrimary calls read_ezquake_config for full parse"
```

---

### Task 4: Update reset button to clear both overrides

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:607-614`

- [ ] **Step 1: Update the reset button onClick**

```typescript
// Before:
            <Show when={primaryOverride()}>
              <button
                class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
                onClick={() => setPrimaryOverride(null)}
              >
                ↩ Reset to default
              </button>
            </Show>

// After:
            <Show when={primaryOverride()}>
              <button
                class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
                onClick={() => {
                  setPrimaryOverride(null);
                  setConfigOverride(null);
                }}
              >
                ↩ Reset to default
              </button>
            </Show>
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "fix(config-viewer): reset button clears both chain and config overrides"
```

---

### Task 5: Fix selectedFiles reset pattern (createMemo anti-pattern)

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx:118-127`

- [ ] **Step 1: Replace createMemo + mutable variable with createEffect**

```typescript
// Before:
  // Reset selection when chain changes
  const chainKey = () => effectiveChain()?.files.map((f) => f.relative_path).join("|") ?? "";
  let lastChainKey = chainKey();
  createMemo(() => {
    const key = chainKey();
    if (key !== lastChainKey) {
      lastChainKey = key;
      setSelectedFiles(new Set(effectiveChain()?.files.map((_, i) => i) ?? []));
    }
  });

// After:
  // Reset selection when chain changes
  createEffect((prev: string) => {
    const key = effectiveChain()?.files.map((f) => f.relative_path).join("|") ?? "";
    if (key !== prev) {
      setSelectedFiles(new Set(effectiveChain()?.files.map((_, i) => i) ?? []));
    }
    return key;
  }, "");
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "fix(config-viewer): use createEffect for selectedFiles reset instead of createMemo"
```

---

### Task 6: Build and verify

**Files:**
- None (verification only)

- [ ] **Step 1: Type-check**

Run: `cd apps/slipgate-app && bun run check`

If `check` script doesn't exist, run: `cd apps/slipgate-app && npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 2: Build**

Run from Windows terminal (Tauri needs Windows toolchain):
```bash
cd apps/slipgate-app && bun run build
```

Expected: successful build with no errors.

- [ ] **Step 3: Manual verification**

Launch the app and test:

1. Load primary config (config.cfg) — verify all sections display correctly
2. Open config chain panel, expand "other configs"
3. Click "View as Primary" on another config (e.g. player2.cfg or any other .cfg in the ezQuake dir)
4. Verify: config name in header updates
5. Verify: cvars/settings section shows the NEW config's values (not the original)
6. Verify: weapon binds section shows the NEW config's weapon binds
7. Verify: teamsay binds section shows the NEW config's teamsay binds
8. Verify: aliases, macros, triggers sections all update
9. Drag-drop a third config — verify compare mode works against the new primary
10. Click "Reset to default" — verify everything reverts to the original config
11. Edit config.cfg on disk — verify file watcher still updates the viewer after reset

- [ ] **Step 4: Commit verification pass (if any fixes were needed)**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "fix(config-viewer): address issues found during verification"
```
