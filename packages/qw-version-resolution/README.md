# @qw/version-resolution

Shared TypeScript helpers for working with version strings across QuakeWorld engine snapshots. Used by `apps/qw-oracle/` (snapshot producer) and `apps/slipgate-app/` (snapshot consumer).

See `VISION.md` for why this exists. See `OVERVIEW.md` for the living map of modules and consumers.

## Layout

```
packages/qw-version-resolution/
├── CLAUDE.md             Rules for Claude when working in this package
├── VISION.md             Purpose and design constraints
├── OVERVIEW.md           Living map: modules, consumers
├── README.md             This file
├── package.json          name=@qw/version-resolution, type=module
├── tsconfig.json         strict, excludes *.test.ts (matches slipgate convention)
└── src/
    ├── index.ts          Re-exports the public API
    ├── version-spec.ts   parseVersionSpec + VersionSpec type
    ├── compare.ts        compareVersions with cross-kind ordering rules
    ├── resolve.ts        existsAtVersion + defaultAtVersion
    └── *.test.ts         bun:test, runs via `bun test`
```

## Public API

- `parseVersionSpec(s)` -> structured `VersionSpec` (kind: `"tag" | "head" | "build"`)
- `compareVersions(a, b)` -> `-1 | 0 | 1`, total within a kind, mixed-kind rules in `compare.ts` doc-comment
- `existsAtVersion(entity, target)` -> `boolean`, checks first/last_seen_version bounds
- `defaultAtVersion(entity, target)` -> `string | null`, walks default_history backward

## Running tests

```bash
cd packages/qw-version-resolution
bun test
bunx tsc --noEmit -p tsconfig.json
```
