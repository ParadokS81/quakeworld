# Domain Teamplay Macros Consistency Fix

**Date:** 2026-04-16
**Status:** Design

## Problem

Domains > Teamplay > Macros uses alias-chain extraction to determine which macros to display: it walks bound teamsay keys, follows alias chains, and only surfaces `$variable` references found along the way. This produces a narrow list (e.g. 13 referenced) that misses customized macros like `tp_need_ra` which affect teamplay behavior but aren't directly referenced as `$tp_need_ra` in alias bodies.

Settings > Macros uses database-category sourcing and shows all ~74 Teamplay-category cvars plus user-created variables. The two views are inconsistent -- a user sees 14 customized macros in Settings but only 1 in Domains.

Domains > Teamplay > Settings and Domains > Weapons > Settings already show all category-matched cvars. Only Domains > Teamplay > Macros uses the narrower alias-chain approach.

## Solution

Replace the alias-chain extraction in `ConfigTeamplayMacros` with the same database-category approach used by `ConfigMacrosSection`. The component becomes a focused, teamplay-scoped version of Settings > Macros.

## Scope

### In scope

- Rewrite `ConfigTeamplayMacros.tsx` data source from alias-chain extraction to database-category filtering
- Add group subheaders (Item Names, Item Need Amounts, Location Names, Teamplay Communications, User Created)
- Add `hideDefaults` and `search` filtering support
- Update stats header from "X customized / Y referenced" to "X customized / Y shown / Z total"
- Simplify props interface (drop alias/teamsay props, add hideDefaults/search/isCompareMode)
- Update ConfigViewer.tsx call site to pass new props
- Remove dead code: `teamsayAliasNames` memo in ConfigViewer.tsx (only consumer), `extractTeamMacros` function in ConfigTeamplayMacros.tsx

### Out of scope

- Runtime Macros (`%` tokens) -- not configurable, reference-only, stay in Settings > Macros
- Bind dependency annotations (showing which macros a bind's alias chain uses) -- separate future feature
- Any changes to alias chain expansion UI

## Design

### Data source (ConfigTeamplayMacros.tsx)

Replace `extractTeamMacros()` with database iteration:

1. Load database via `loadDatabase()`
2. Iterate `db.clients.ezquake.entries()`, filter for `info.category === "Teamplay"`
3. For each entry: look up user value from `primaryCvars[name]` and `compareCvars?.get(name)`, determine `isCustomized` by comparing against `info.default`
4. Add user-created `set` variables (`primaryUserCreated` union `compareUserCreated`) that aren't already in the database, as "User Created" group
5. Group by `info.group`, order: Item Names, Item Need Amounts, Location Names, Teamplay Communications, User Created

### Filtering

- `hideDefaults`: when true, hide entries where neither primary nor compare side has a customized value (same logic as `ConfigMacrosSection` lines 140-145)
- `search`: filter by name or value substring match (same logic as `ConfigMacrosSection` lines 148-150)

### Props interface

Before:
```typescript
interface ConfigTeamplayMacrosProps {
  primaryAliases: Record<string, string>;
  compareAliases?: Record<string, string>;
  primaryCvars: Record<string, string>;
  compareCvars?: Map<string, string>;
  teamsayAliasNames: Set<string>;
  primaryUserCreated: Set<string>;
  compareUserCreated?: Set<string>;
}
```

After:
```typescript
interface ConfigTeamplayMacrosProps {
  primaryCvars: Record<string, string>;
  compareCvars?: Map<string, string>;
  primaryUserCreated: Set<string>;
  compareUserCreated?: Set<string>;
  hideDefaults: boolean;
  isCompareMode: boolean;
  search: string;
}
```

### ConfigViewer.tsx changes

1. Update `<ConfigTeamplayMacros>` call site (lines 865-873): drop `primaryAliases`, `compareAliases`, `teamsayAliasNames`; add `hideDefaults`, `isCompareMode`, `search`
2. Remove `teamsayAliasNames` memo (lines 556-574) -- no remaining consumers
3. Keep `teamplay:macros` in the `showBindsSection` memo (line 537) -- still needed for the "nothing selected" fallback guard

### Rendering

- Group subheaders using existing `sg-domain-bind-category` CSS class
- Row styling unchanged: warning color for customized names, bright+bold for customized values
- Tooltip with description and default value (already exists, keep as-is)
- Stats header: "Teamplay Macros -- X customized / Y shown / Z total"
- Empty state: "All macros are at default values" when hideDefaults filters everything, "No macros found" otherwise

## Files changed

| File | Change |
|---|---|
| `ConfigTeamplayMacros.tsx` | Rewrite data source, add groups/filtering, simplify props |
| `ConfigViewer.tsx` | Update call site props, remove `teamsayAliasNames` memo |
