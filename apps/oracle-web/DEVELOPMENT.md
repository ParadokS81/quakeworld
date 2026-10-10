# oracle-web -- development

How to run, build and check the site on the dev cockpit. Shipping is
`DEPLOYMENT.md`; the data contract and who owns it are in `OVERVIEW.md`.

## Prerequisites

- **Node 22**, the cockpit's mise-managed Node (22.12.0 on 2026-10-10).
- **pnpm 10** on PATH. A container recreate removes it; put it back with
  `npm install -g pnpm@10`. Never `corepack pnpm` (broken on this box; see
  `DEPLOYMENT.md` Prerequisites).
- **The sibling snapshot** `apps/qw-oracle/snapshots/brain-manifest.json`,
  committed in this monorepo. `dev` and `build` both start by copying it to
  `src/data/baked-manifest.json` (gitignored) and fail loudly if its
  `schema_version` is not `brain-manifest-v1`.

## Setup

    cd /home/dev/projects/quakeworld/apps/oracle-web
    pnpm install

This folder is its own pnpm workspace root (`pnpm-workspace.yaml`); run pnpm
here, not at the monorepo root.

## Commands

| Do | Run |
|---|---|
| Typecheck | `pnpm run check` (`tsc --noEmit`) |
| Production build into `dist/` | `pnpm run build` |
| Serve the built `dist/` | `pnpm run preview` |
| Dev server the operator can open | see the next section |

There is no test suite. Typecheck plus build is the verification an agent
runs before claiming a change works; the arc's phase documents carry the
visual and behavioural probes (`CLAUDE.md` indexes them).

## Dev server the operator can open

The operator reaches this box over Tailscale, so a `localhost` URL is useless
to them, and only ports **5173** and **5174** are published from the cockpit
(the user-global `CLAUDE.md` owns that rule and the address). Two things
follow.

1. **Pass the flags to vite directly.** The `dev` script is a two-command
   chain (bake the manifest, then `vite`), so flags appended as
   `pnpm run dev -- --host ...` land after the chain and never reach vite,
   which then listens on localhost only. Run the two halves yourself:

       node scripts/bake-manifest.mjs && pnpm exec vite --host --port 5173 --strictPort

2. **Pick the free published port first.** The other lane may already be
   serving another project's preview (5174 was, on 2026-10-10).
   `--strictPort` makes vite exit instead of hopping to a port nobody can
   reach. Then open `http://<cockpit tailscale address>:5173/`.

Stop it by the pid or process group you started, never by name.

## Runtime flags and hooks

| Flag or hook | What it does |
|---|---|
| `?data=force-fallback` | Points the manifest fetch at a nonexistent file, exercising the real fetch -> 404 -> catch -> baked path against the real server. |
| `?dev=why` | Shows the door to the "Why do I need this?" overlay, which ships dark in production (P6). The overlay still holds placeholder copy under a draftstamp. |
| `[data-manifest-source]` on the root div | `live` or `baked`: which copy rendered. |
| `[data-stem-exits]` on the root div | Count of travelers that finished floor 1's brainstem descent; floor 2 consumes it. |
| `prefers-reduced-motion` | Read once at load, no change listener; disables ambient journeys and pulses. |

The two query flags are read in `App.tsx` and `src/data/manifest.ts`, the
only files allowed to touch `location.search` (P4).

## Gotchas

- `src/data/baked-manifest.json` in the working tree is whatever the last
  `dev` or `build` baked. It is gitignored and regenerated every run; never
  hand-edit it, and never read numbers from it as if they were live.
- A contract change starts in the emitter
  (`apps/qw-oracle/scripts/build-brain-manifest.ts`) and then re-mirrors into
  `src/data/manifest-types.ts`. The typecheck cannot catch a drifted mirror,
  because the mirror is a copy, not an import.
- vite's banner line "Network: use --host to expose" means the operator
  cannot reach the server; see above.
