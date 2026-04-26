# Vision

## Why this package exists

QuakeWorld engines version themselves three different ways. ezQuake uses semver tags (`3.6.9`) plus dated head snapshots (`head-2026-04-25`). FTE uses build numbers (`build-6698`). QWCL uses semver tags. Mixing these in a single ordering, identity, or "did this entity exist at version X?" check requires structured handling, not ad-hoc string parsing.

Both qw-oracle (which produces version-aware snapshots) and slipgate-app (which consumes them) need the same answers: was this cvar alive at version X, what was its default at version Y, is this version newer than that one. Without a shared lib, that logic ends up duplicated and drifts; one consumer fixes a comparison bug, the other doesn't, snapshots and UI disagree silently.

## Design choice that drove this package

The Quake Dir Control plan (`docs/superpowers/plans/2026-04-26-quake-dir-control.md` decision D5) considered an alternative shape: oracle pre-resolves per-version views and ships a snapshot per version. That multiplies snapshot size by the number of versions and bakes resolution math into the producer. The shared-lib choice keeps snapshots flat and lets every consumer ask the same question with the same code.

## Constraints

- **Pure functions only.** No I/O, no DB, no filesystem. Inputs are typed shapes; outputs are answers.
- **Total functions.** `parseVersionSpec` falls back to `kind: "tag"` for unrecognized shapes. `compareVersions` returns 0 for mutually-unordered kinds (head vs build) rather than throwing.
- **No production dependencies.** TypeScript devDep only. Bun runs the tests.
- **No version-string regex outside `version-spec.ts`.** All consumers go through `parseVersionSpec`.

## What this package will never become

- A version-string utility belt. Functions land here when both consumers need them; one-off helpers stay in their consumer.
- A semver superset. QW projects don't use prerelease tags today; `compareVersions` handles them defensively (prerelease sorts below clean) but adding npm-semver-grade behavior is out of scope.
- A registry of known versions. The lib operates on whatever string is passed in; the catalog of "known versions per project" lives in oracle's database.

## Long-term relationship to qw-oracle and slipgate-app

When oracle's `build-snapshot` widens to emit retired entities (Quake Dir Control plan Phase 4), oracle imports from this lib for any version-comparison helpers it needs. When slipgate's diff viewer ships (Phase 5), the diff-computation code imports `existsAtVersion` and `defaultAtVersion` directly. If a third consumer materializes (a future MCP-side "what was X at version Y" tool, an extractor that needs to project entities onto a target version), it imports from here too.
