# QW Oracle Web

**Status:** Active development.

The public read-only front end for QW Oracle -- `oracle.quake.world` v1. A
SolidJS single-page site that fetches the live brain-manifest snapshot at
pageload and renders it as a two-floor scene (`#brain` / `#machine-room`),
with a build-time baked fallback so an unreachable oracle degrades to
slightly-stale numbers, never an error. No auth, no forms, no backends beyond
the one manifest fetch -- everything else on the page links out.

## Documentation index

| When you need... | Read... |
|---|---|
| Deploy procedure (CF Pages, one-command redeploy) | `DEPLOYMENT.md` |
| The arc that built this (phase docs, decisions ledger, findings) | `docs/superpowers/plans/2026-08-06-oracle-web-v1/` (root tree) |
| The visual contract this site ports | `docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (root tree) |
| The design spec behind the mockup | `docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` (root tree) |

## Tech stack

- **SolidJS + Vite**, **Tailwind v4 + daisyUI** for theme tokens (theme
  `oracle`, palette ported from the mockup).
- Own `pnpm-workspace.yaml` subtree, isolated from the monorepo root's
  (unsupported-by-pnpm) `package.json` "workspaces" field -- same isolation
  pattern as `apps/docs-web` (its `pnpm-workspace.yaml` comment explains the
  mechanics).
- Deployed as a static bundle to **Cloudflare Pages** on the operator's
  personal account (`qw-oracle-web.pages.dev`; custom domain deferred).

## Always-on rules

- **All rendering components are dumb presentation components** -- data in
  via props, no fetching inside components. `loadManifest()` in
  `src/data/manifest.ts` is the site's ONLY network call, invoked exactly
  once from `App.tsx`. Deviation from this seam is a finding, not an
  implementer choice (arc decision P4).
- **`src/data/manifest-types.ts` is a hand-mirrored copy**, not an import, of
  the `BrainManifest` contract exported by
  `apps/qw-oracle/scripts/build-brain-manifest.ts` (that file is the source
  of truth; see its header comment for the sync rule).
- **`src/data/baked-manifest.json` is generated** by `scripts/bake-manifest.mjs`
  at `dev`/`build` time from the committed
  `apps/qw-oracle/snapshots/brain-manifest.json` -- gitignored, never
  hand-edited.
