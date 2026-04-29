# @qw/version-resolution - Rules for Claude

**Status:** Active.

Shared TypeScript lib for QW version arithmetic. Read `VISION.md` for why, `OVERVIEW.md` for what's here, `README.md` for the elevator pitch.

**Start with `OVERVIEW.md` when working in this package — it's the load-bearing module map (what's here, what depends on what, what's stable vs in-flight).**

## Always-on rules

- **Pure functions only.** No I/O, no DB, no fs, no network. If a function needs side effects, it does not belong here.
- **Total over throwing.** `parseVersionSpec` falls back to `kind: "tag"` for unrecognized shapes; `compareVersions` returns 0 for cross-kind pairs that have no defined ordering. Callers should not have to guard against exceptions from this lib.
- **No regex outside `version-spec.ts`.** All version-string parsing goes through `parseVersionSpec`. Other modules consume `VersionSpec`, never raw strings.
- **The doc-comment in `compare.ts` is the contract.** If you change the ordering rules, update the doc-comment in the same edit. The plan that birthed this lib (`docs/superpowers/plans/2026-04-26-quake-dir-control.md` decision D5) treats those rules as the ordering this lib promises consumers.
- **Tests stay next to code.** `*.test.ts` siblings, not a `tests/` dir.

## Test framework

`bun:test`. Import `{ describe, expect, test }` from `"bun:test"`. Use `test`, not `it`. No mocking framework needed -- every function in this lib is pure, so tests pass plain inputs and assert on outputs.

`tsconfig.json` excludes `**/*.test.ts` from typecheck because the monorepo doesn't install `bun-types`. Tests still run fine via `bun test` because bun has the test API built in at runtime. Match this pattern for any future `packages/*` entry; do not deviate without checking.

## Adding a new module

- New module under `src/`, paired `*.test.ts`.
- Re-export the public surface from `src/index.ts`.
- Update `OVERVIEW.md` Modules table in the same edit. The skill nudges if you don't.

## Things that do NOT belong here

- Semver-grade prerelease handling beyond "prerelease tail sorts below clean tag". QW projects don't use prereleases today. If they start, revisit then.
- A registry of known versions per project. The lib is stateless; catalog lives in oracle's DB.
- Non-version-string utilities. One-off helpers stay in their consumer.

## Output discipline

Monorepo-wide rules apply (see root `CLAUDE.md`): ASCII only, no filler, comments explain why not what. The doc-comment in `compare.ts` is an exception worth keeping -- it documents a contract, not mechanics.
