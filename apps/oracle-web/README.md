# QW Oracle Web

The public, read-only face of the QW Oracle: a single page that shows what the
oracle is, what it knows and how to connect an agent to it. Preview deploy at
https://qw-oracle-web.pages.dev/; the production home `oracle.quake.world`
waits on DNS that is not ours (see `VISION.md`).

**Status:** Active. The arc building it is mid-flight; its state is the
"Oracle web direction" row of the monorepo's root `HANDOVER.md`.

## What it does

- Fetches the oracle's published brain manifest once at pageload and renders
  the numbers as a two-floor scene: the brain (what the oracle knows, one
  datacenter per knowledge region) above, the machine room (what it runs on)
  below.
- Drills three levels deep -- datacenter, regions, inventory card -- and then
  opens a door out: the docs site, your own agent's MCP call, or the GitHub
  repo. It never renders individual articles itself.
- Degrades, never errors: a copy of the manifest is baked into the bundle at
  build time, so an unreachable oracle shows slightly stale numbers.
- Nothing else. No auth, no forms, no second network call.

## Stack

SolidJS + Vite, Tailwind v4 + daisyUI (theme `oracle`), TypeScript. Static
bundle on Cloudflare Pages. Its own pnpm workspace root inside the monorepo.

## Run it

    npm install -g pnpm@10        # only if `pnpm` is missing (a container recreate removes it)
    cd /home/dev/projects/quakeworld/apps/oracle-web
    pnpm install
    pnpm run check                # tsc --noEmit
    pnpm run build                # bakes the fallback manifest, then vite build -> dist/

The dev server needs a published port and a host flag before the operator can
open it; `DEVELOPMENT.md` has the exact line. Deploying is one command, in
`DEPLOYMENT.md`.

## Where to go next

| Question | Read |
|---|---|
| Why does this exist, what is it deliberately not | `VISION.md` |
| What is load-bearing in the code right now | `OVERVIEW.md` |
| Run, build, check, runtime flags | `DEVELOPMENT.md` |
| Ship it | `DEPLOYMENT.md` |
| Rules for agents working here | `CLAUDE.md` |
