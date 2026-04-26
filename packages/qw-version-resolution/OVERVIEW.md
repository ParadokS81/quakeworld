# Overview

Living map of `@qw/version-resolution`. Updates whenever modules move, the public API changes, or a new consumer wires in.

## Status

Active. Shipped 2026-04-26 as Phase 0 of the Quake Dir Control plan. Used by no production code yet; consumed by Phases 4 (oracle) and 5 (slipgate) of that plan.

## Modules

| Module | Purpose | Public exports |
|---|---|---|
| `src/version-spec.ts` | Parse a version string into a discriminated union | `parseVersionSpec`, `VersionSpec` |
| `src/compare.ts` | Total-ish ordering across version kinds | `compareVersions` |
| `src/resolve.ts` | Project a versioned entity onto a target version | `existsAtVersion`, `defaultAtVersion`, `VersionedEntity` |
| `src/index.ts` | Re-export aggregator | (re-exports above) |

Each module has a sibling `*.test.ts` running under `bun:test`. 23 tests total at ship.

## VersionSpec kinds

```ts
type VersionSpec =
  | { kind: "tag";   value: string;          display: string }   // "3.6.9"
  | { kind: "head";  date: string;           display: string }   // "head-2026-04-25"
  | { kind: "build"; number: number;         display: string }   // "build-6698"
```

`commit?: string` and other future fields are reserved for `head` / `build` if a producer ever needs them. Unrecognized strings fall back to `kind: "tag"`.

## Cross-kind ordering rules

Authoritative source is the doc-comment block at the top of `compare.ts`. Quick reference:

- Within a kind: numeric comparison (tag/build) or date-string comparison (head).
- `tag < head` and `tag < build` (heads/builds are post-release artifacts).
- `head` vs `build`: returns 0 (mutually unordered, different ecosystems).

## Consumers

| Consumer | Wire status | Use site |
|---|---|---|
| `apps/slipgate-app` | wired (`workspace:*`), unused | will be consumed by Phase 5 diff viewer (`src/lib/version-diff/computeDiff.ts`) |
| `apps/qw-oracle` | wired (`workspace:*`), unused | will be consumed by Phase 4 `build-snapshot.ts` for any version-comparison helpers |

When a third consumer wires in, add a row.

## Test convention

Tests use `import { describe, expect, test } from "bun:test"`. `tsconfig.json` excludes `**/*.test.ts` from typecheck because the monorepo doesn't ship `bun-types`; bun's test runner has the test API built in at runtime. This matches `apps/slipgate-app`'s tsconfig and is the package convention going forward.

## Out of scope

See `VISION.md` for the explicit non-goals (no semver superset, no version registry, no I/O).
