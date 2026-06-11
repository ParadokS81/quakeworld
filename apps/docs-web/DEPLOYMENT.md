# docs.quake.world (docs-web) -- Deployment Reference

## Infrastructure

| Property | Value |
|----------|-------|
| Host | Cloudflare Pages (static; no server, no DB) |
| Project name | `quakeworld-docs` |
| Preview URL | https://quakeworld-docs.pages.dev/ |
| Cloudflare account | `David.larsen.1981@gmail.com`'s account (ID `1ce363f39e7689394588736456d3f147`) -- PERSONAL / preview |
| Build output dir | `apps/docs-web/.vitepress/dist` (~29 routes) |
| Production branch | `main` |
| Custom domain | DEFERRED -- `docs.quake.world` lands on **vikpe's** Cloudflare once he greenlights it (custom domain + DNS) |

## Scope note (read first)

This is a **preview deploy on the operator's personal Cloudflare account** -- a throwaway shareable link to show vikpe before he greenlights an official `docs.quake.world` domain. The eventual production deploy will live on **vikpe's** Cloudflare (he owns the `quake.world` zone); the custom-domain + DNS step is deferred until then. The site is 100% static -- VitePress builds it into `.vitepress/dist`, Cloudflare Pages serves it (the closest analogy is Firebase **Hosting**, not Firestore; there is no database).

## Prerequisites

- Node.js (v20 works) + pnpm + corepack (docs-web is its own pnpm subtree -- D20).
- A `CLOUDFLARE_API_TOKEN` in the environment: an **Account API Token** for the target account, with **Cloudflare Pages: Edit** permission. (Already present in the operator's env.)
- The Cloudflare **account ID** -- `1ce363f39e7689394588736456d3f147` -- REQUIRED, see Gotcha 2.

## Two gotchas (hit on the first deploy, 2026-06-11 -- both already worked around below)

1. **Wrangler version vs Node.** `wrangler@4` (latest) requires Node >= 22; this env runs Node 20, so v4 refuses to start. Use the **v3 line** (`npx -y wrangler@3 ...`) -- fully capable of Pages deploys on Node 20.
2. **An account-scoped token needs an explicit account ID.** With only `CLOUDFLARE_API_TOKEN` set, wrangler tries to enumerate accounts via `/memberships`, which an account-scoped token cannot do -> `Authentication failed (status: 400) [code: 9106]`. Pass `CLOUDFLARE_ACCOUNT_ID=<id>` inline so wrangler skips that lookup. (`wrangler whoami` succeeds regardless, which can mislead -- it is the deploy path that needs the account ID.)

## Deploy Workflow

### 1. Build

```bash
pnpm --dir apps/docs-web docs:build      # NOTE: docs:build, NOT build -- there is no `build` script (F20). Output -> apps/docs-web/.vitepress/dist
```

### 2. (first time only) Create the Pages project

```bash
cd apps/docs-web
CLOUDFLARE_ACCOUNT_ID=1ce363f39e7689394588736456d3f147 \
  npx -y wrangler@3 pages project create quakeworld-docs --production-branch main
```

### 3. Deploy

```bash
cd apps/docs-web
CLOUDFLARE_ACCOUNT_ID=1ce363f39e7689394588736456d3f147 \
  npx -y wrangler@3 pages deploy .vitepress/dist --project-name quakeworld-docs --branch main
```

- `--branch main` makes it the **production** deployment (canonical URL `https://quakeworld-docs.pages.dev/`).
- Each run also prints a per-deployment alias: `https://<hash>.quakeworld-docs.pages.dev`.
- The "working directory ... has uncommitted changes" warning is harmless (the gitignored `dist/` rebuild). Add `--commit-dirty=true` to silence.

### 4. Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://quakeworld-docs.pages.dev/          # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://quakeworld-docs.pages.dev/search     # expect 200
```

Then eyeball: the global entity search (homepage hero + `/search`) works; cvar pages render; the nav stays horizontal; there is no dead VitePress Ctrl+K box (F23).

## When `docs.quake.world` is greenlit (future)

- The production deploy moves to **vikpe's** Cloudflare account (he owns the `quake.world` zone) -- re-run the workflow there with his account's token + ID.
- Add the custom domain in CF Pages (`docs.quake.world`) + the matching CNAME in the `quake.world` DNS (vikpe's side).
- Optionally connect the GitHub repo to CF Pages for auto-deploy-on-push (currently manual / direct-upload, per arc decision D10 "manual deploy v1"). The arc's `phase-5-deploy.md` (not yet drafted) formalizes the production deploy; this preview is the pre-greenlight step.
