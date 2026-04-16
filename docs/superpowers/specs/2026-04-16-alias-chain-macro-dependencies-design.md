# Alias Chain Macro Dependencies

**Date:** 2026-04-16
**Status:** Design

## Problem

When expanding an alias chain (teamsay binds, aliases, misc binds, triggers), the user sees raw alias bodies containing `$variable` references like `$tp_name_rl`, `$tpname`, `$cells`. These are opaque -- the user can't see what values those variables resolve to without manually cross-referencing the macros section. The alias chain resolver already encounters these tokens but silently skips them.

## Solution

Extract `$variable` references during alias chain resolution and display a "Macro Dependencies" section below the expanded chain, showing each referenced variable with its resolved value from the config. This surfaces the relationship between alias chains and macros directly where the user is looking.

## Scope

### In scope

- Modify `resolveAliasChain` to collect `$variable` tokens from alias bodies
- Add a macro dependencies section to `AliasChainView`
- Thread cvar data from ConfigViewer to all 4 consumers (teamsay binds, misc binds, aliases, triggers)
- Respect `hideDefaults` toggle
- Compare mode support (two value columns)

### Out of scope

- `%macro` runtime tokens (not configurable, no values to show)
- Inline variable substitution / "pretty view" (separate future feature)
- Color code rendering (`&cRGB`) (separate future feature)

## Design

### Data extraction (AliasChainResolver.tsx)

Modify `resolveAliasChain` return type:

```typescript
interface AliasChainResult {
  chain: AliasChainEntry[];
  macroRefs: Set<string>;
}
```

In the `resolve()` inner function, when a token starts with `$`, strip the prefix and add the name to the `macroRefs` set (instead of just `continue`). The token skip (`continue`) still applies -- we don't try to resolve `$` tokens as aliases. We just collect them.

### AliasChainView changes (AliasChainResolver.tsx)

Add optional props for macro dependency rendering:

```typescript
interface AliasChainViewProps {
  chain: AliasChainEntry[];
  label?: string;
  ownerClass?: string;
  // New optional props for macro dependencies
  macroRefs?: Set<string>;
  primaryCvars?: Record<string, string>;
  compareCvars?: Map<string, string>;
  isCompareMode?: boolean;
  hideDefaults?: boolean;
}
```

When `macroRefs` is provided and non-empty, render a "Macro Dependencies" section after the chain entries, inside the same `sg-alias-chain` container. For each macro ref:

- Look up default value via `lookupCvar(name)`
- Look up user value from `primaryCvars[name]`
- Look up compare value from `compareCvars?.get(name)`
- Determine if customized (same logic as ConfigTeamplayMacros)
- If `hideDefaults` is on, skip entries where neither side is customized

Render using `sg-macro-row` / `sg-macro-row-cmp` classes for consistency with the macros sections. Section header: "Macro Dependencies (N)" using a small label style inside the chain container.

### Call site updates

All 4 consumers call `resolveAliasChain` and pass the result to `AliasChainView`. Each needs to:
1. Destructure the new return type `{ chain, macroRefs }` instead of treating the return as a plain array
2. Pass `macroRefs` + cvar data to `AliasChainView`

#### ConfigDomainBinds.tsx (teamsay binds)

Props interface (`TeamsayBindsProps`) gains:
- `primaryCvars: Record<string, string>`
- `compareCvars?: Map<string, string>`
- `hideDefaults: boolean`

The `getChain` helper (line 416) returns `AliasChainResult` instead of `AliasChainEntry[]`. Both `AliasChainView` calls (lines 521, 546) get the new props.

ConfigViewer call site (line 829) adds:
```tsx
primaryCvars={effectiveCvars()}
compareCvars={isCompareMode() ? compareCvars() : undefined}
hideDefaults={hideDefaults()}
```

#### ConfigBindsSection.tsx (misc binds)

Props interface gains:
- `primaryCvars?: Record<string, string>`
- `compareCvars?: Map<string, string>`
- `hideDefaults?: boolean`

The `getChain` helper (line 28) returns `AliasChainResult`. All `AliasChainView` calls (lines 216, 220, 229, 235) get the new props.

ConfigViewer call site (line 857) adds:
```tsx
primaryCvars={effectiveCvars()}
compareCvars={isCompareMode() ? compareCvars() : undefined}
hideDefaults={hideDefaults()}
```

#### ConfigAliasesSection.tsx (aliases)

Props interface gains:
- `primaryCvars?: Record<string, string>`
- `hideDefaults?: boolean`

No compare mode in this section (it doesn't have compare support currently). The `getChain` helper (line 17) returns `AliasChainResult`. The `AliasChainView` call (line 79) gets the new props.

ConfigViewer call site (line 866) adds:
```tsx
primaryCvars={effectiveCvars()}
hideDefaults={hideDefaults()}
```

#### ConfigTriggersSection.tsx (triggers)

Props interface gains:
- `primaryCvars?: Record<string, string>`
- `hideDefaults?: boolean`

The `getChain` helper (line 159) returns `AliasChainResult`. The `AliasChainView` call (line 240) gets the new props.

ConfigViewer call site (line 882) adds:
```tsx
primaryCvars={effectiveCvars()}
hideDefaults={hideDefaults()}
```

## Files changed

| File | Change |
|---|---|
| `AliasChainResolver.tsx` | Extract `$variable` tokens, new return type, add macro deps rendering to `AliasChainView` |
| `ConfigDomainBinds.tsx` | Destructure new return type, pass cvar props through, update `TeamsayBindsProps` |
| `ConfigBindsSection.tsx` | Destructure new return type, pass cvar props through, update `ConfigBindsSectionProps` |
| `ConfigAliasesSection.tsx` | Destructure new return type, pass cvar props through, update `ConfigAliasesSectionProps` |
| `ConfigTriggersSection.tsx` | Destructure new return type, pass cvar props through, update props |
| `ConfigViewer.tsx` | Thread `effectiveCvars()`, `compareCvars()`, `hideDefaults()` to all 4 sections |

## Future

This extraction logic lays the foundation for the "pretty view" feature: inline variable substitution with color code rendering, where `$tp_name_rl` is replaced with its resolved value inline and `&cRGB` codes render as actual colors. The macro ref collection built here is the same data that feature will use.
