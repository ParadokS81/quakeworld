# Fix: Config Primary Swap Does Not Replace Parsed Data

**Date:** 2026-04-12
**Status:** Draft
**Scope:** `apps/slipgate-app/src/components/ConfigViewer.tsx`

## Problem

When the user clicks "View as Primary" on another config from the available_configs list, the UI shows the new config name but displays stale data from the original config. The root cause is that `handleViewAsPrimary` only loads a `ConfigChain` (raw file structure) and stores it in `primaryOverride`, but `props.config` -- the full `EzQuakeConfig` with Rust-classified weapon binds, teamsay binds, movement keys, macros, triggers -- never updates. Every reference to `props.config.*` in the component continues reading the original config's classified data.

### What updates today (correctly)

- `primaryOverride` signal -- new ConfigChain
- `effectiveChain` memo -- resolves to new chain
- `effectiveConfigName` memo -- shows new config filename
- `mergedData` memo -- re-merges cvars/binds/aliases from the new chain's files

### What stays stale

- `props.config.weapon_binds` (used at lines 428, 441)
- `props.config.teamsay_binds` (used at lines 429, 446)
- `props.config.movement` (used at line 430)
- `props.config` passed to `ConfigConverter` (line 588)
- All fallbacks like `mergedData()?.cvars ?? props.config?.raw_cvars` (line 165)

### Secondary issue

The chain-change detection at lines 119-127 uses a mutable `let lastChainKey` inside a `createMemo` to trigger `setSelectedFiles`. This is a SolidJS anti-pattern -- `createMemo` is for deriving values, not firing side effects. It should be a `createEffect`.

## Design

### Principle

Both sides of the viewer (primary and compare) must run the full Rust classification engine independently. Swapping the primary means replacing ALL parsed data, not just the chain structure.

### Changes

All changes are confined to `ConfigViewer.tsx`. No changes to App.tsx, MyQuakeTab.tsx, Rust commands, or configMerger.ts.

#### 1. Add `configOverride` signal

```typescript
const [configOverride, setConfigOverride] = createSignal<EzQuakeConfig | null>(null);
```

Sits alongside the existing `primaryOverride` (which holds the chain).

#### 2. Create `effectiveConfig` memo

```typescript
const effectiveConfig = createMemo(() => configOverride() ?? props.config);
```

Every reference to `props.config` in the component body switches to `effectiveConfig()`. This includes:

- `effectiveCvars` fallback: `mergedData()?.cvars ?? effectiveConfig()?.raw_cvars ?? {}`
- `enrichedBinds`: pass `effectiveConfig().weapon_binds`, `.teamsay_binds`, `.movement`
- `primaryWeaponBinds`: `effectiveConfig()?.weapon_binds ?? []`
- `primaryTeamsayBinds`: `effectiveConfig()?.teamsay_binds ?? []`
- `enrichedCvars` guard: `if (!effectiveConfig()) return [];`
- `ConfigConverter` prop: `config={effectiveConfig()}`
- The early-return null guard: `if (!effectiveConfig())` instead of `if (!props.config)`

#### 3. Update `handleViewAsPrimary`

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

Both Rust calls fire in parallel. `read_ezquake_config` returns the full classified config (weapon_binds, teamsay_binds, movement, raw_cvars, etc.). `load_config_from_source` returns the chain structure for the file-level merge UI.

#### 4. Update "Reset to default"

The existing reset button (line 610) clears `primaryOverride`. It must also clear `configOverride`:

```typescript
onClick={() => {
  setPrimaryOverride(null);
  setConfigOverride(null);
}}
```

This snaps everything back to `props.config` from App.tsx -- the user's own config, held by the App-level `ezConfig` signal and kept current by the file watcher.

#### 5. Fix selectedFiles reset pattern

Replace the `createMemo` + mutable variable pattern:

```typescript
// Before (anti-pattern):
const chainKey = () => effectiveChain()?.files.map((f) => f.relative_path).join("|") ?? "";
let lastChainKey = chainKey();
createMemo(() => {
  const key = chainKey();
  if (key !== lastChainKey) {
    lastChainKey = key;
    setSelectedFiles(new Set(effectiveChain()?.files.map((_, i) => i) ?? []));
  }
});
```

```typescript
// After (correct SolidJS):
createEffect((prev: string) => {
  const key = effectiveChain()?.files.map((f) => f.relative_path).join("|") ?? "";
  if (key !== prev) {
    setSelectedFiles(new Set(effectiveChain()?.files.map((_, i) => i) ?? []));
  }
  return key;
}, "");
```

Uses `createEffect` with a return value for previous-state tracking, which is the idiomatic SolidJS pattern for "run side effect when derived value changes."

## Scope boundaries

**In scope:**
- ConfigViewer.tsx: add configOverride signal, effectiveConfig memo, update handleViewAsPrimary, update reset, fix createMemo anti-pattern, replace all props.config references

**Out of scope:**
- App.tsx -- no changes. The App-level ezConfig signal remains the user's ground truth.
- MyQuakeTab.tsx -- no changes. It passes props through unchanged.
- Rust commands -- no changes. Both `read_ezquake_config` and `load_config_from_source` already exist and do what we need.
- configMerger.ts -- no changes. Pure merge logic is unaffected.
- Compare side -- already has its own classification path via `classify_chain_binds`. Unchanged.

## Testing

Manual verification:

1. Load app with primary config (config.cfg)
2. Open config chain panel, click "View as Primary" on another config (e.g. player2.cfg)
3. Verify: config name updates, cvars update, weapon binds update, teamsay binds update, movement keys update, macros/triggers update
4. Verify: compare mode works against the new primary (drag-drop a third config)
5. Click "Reset to default" -- verify everything reverts to the original config
6. Verify: file watcher still works after reset (edit config.cfg on disk, confirm viewer updates)
