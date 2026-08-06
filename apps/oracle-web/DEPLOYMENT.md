# oracle-web -- deployment

Static SolidJS/Vite bundle on Cloudflare Pages. The site is 100% static: it
ships HTML/CSS/JS and fetches its numbers at runtime from the oracle's
published manifest. **Data updates never require a deploy** -- see Refreshing
the numbers.

## Infrastructure

| What | Value |
|---|---|
| CF Pages project | `qw-oracle-web` |
| Public URL | https://qw-oracle-web.pages.dev/ |
| Cloudflare account | `david.larsen.1981@gmail.com`'s account (ID `1ce363f39e7689394588736456d3f147`) -- PERSONAL / preview |
| Production branch | `main` |
| Build output dir | `apps/oracle-web/dist` |
| Data source (runtime) | https://oracle.slipgate.me/snapshots/brain-manifest.json |
| Data source (baked fallback) | `apps/qw-oracle/snapshots/brain-manifest.json`, copied into the bundle at build time |

Same posture as `apps/docs-web`: a preview deploy on the operator's personal
account. The production home (`oracle.quake.world`) lives on vikpe's zone and
is deferred -- that DNS + custom-domain step is explicitly outside the
oracle-web-v1 arc (decisions P11).

## Prerequisites

- **Auth file at `/home/dev/projects/.secrets/cloudflare-pages.env`** (mode 600):

      CLOUDFLARE_API_TOKEN=<Account API Token, Cloudflare Pages: Edit>
      CLOUDFLARE_ACCOUNT_ID=1ce363f39e7689394588736456d3f147

  **Not `~/.secrets/`** -- that path is an ops-provisioned read-only mount and
  the dev plane cannot write it (arc finding F10). To write or rotate the
  token, use the local ceremony, which never echoes the value into a terminal
  or a Claude transcript:

      secret-drop env /home/dev/projects/.secrets/cloudflare-pages.env CLOUDFLARE_API_TOKEN

  (`secret-drop cloudflare-pages` also works -- registry entry, `raw` mode --
  but `raw` pipes through `cat`, so the value ECHOES to your screen and you
  must paste both `KEY=VALUE` lines yourself. The `env` form above prompts
  silently and upserts one key, leaving the other untouched. Prefer it.)

- **`pnpm`** on PATH. **A container recreate wipes it** (`~/dotfiles/PERSISTENCE.md`:
  ad-hoc `npm i -g` does not survive). Re-install with `npm install -g pnpm@10`.
  Never `corepack pnpm` -- broken on this box in a way whose error string
  changes between invocations; do not debug it.
- **wrangler** is not installed; the deploy script invokes `npx -y wrangler@3`
  ephemerally. Both v3 and v4 launch on this box's Node 22.12.0.

## Deploy (one command)

    set -a; . /home/dev/projects/.secrets/cloudflare-pages.env; set +a
    pnpm --dir /home/dev/projects/quakeworld/apps/oracle-web run deploy

`deploy` chains: bake the fallback manifest -> `vite build` -> `wrangler pages
deploy dist --project-name qw-oracle-web --branch main --commit-dirty=true`.
`--branch main` makes it the production deployment at the canonical URL; each
run also prints a per-deployment alias URL for inspection.

First-time project creation (already done 2026-08-06, kept for the record):

    npx -y wrangler@3 pages project create qw-oracle-web --production-branch main

## Refreshing the numbers (no deploy involved)

The site fetches the manifest at pageload with `Cache-Control: max-age=300`.
To publish new numbers, re-emit and republish from the oracle -- the harvest
runbook's closing step:

    cd /home/dev/projects/quakeworld/apps/qw-oracle && bun scripts/build-brain-manifest.ts --publish

Public numbers refresh within the 5-minute cache window. **A site deploy only
ever ships code changes** (decisions P3). The one exception: the BAKED
fallback copy is frozen at build time, so it goes stale until the next deploy
-- that is by design, and it is what visitors see only when the live fetch
fails.

## Verifying a deploy

    curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/    # 200
    npx -y wrangler@3 pages deployment list --project-name qw-oracle-web | head -5

Fallback path (browser): `?data=force-fallback` points the fetch at a
nonexistent file, exercising the real fetch -> 404 -> catch -> baked path;
`document.querySelector('[data-manifest-source]').dataset.manifestSource`
reads `live` or `baked`.

## Gotchas

1. **An account-scoped token needs an explicit account ID.** With only
   `CLOUDFLARE_API_TOKEN` set, wrangler tries to enumerate accounts via
   `/memberships`, which an account-scoped token cannot do ->
   `Authentication failed (status: 400) [code: 9106]`. Source the whole env
   file; both vars must be set. `wrangler whoami` succeeds regardless, so it
   is NOT a valid auth check -- verify with the API instead:

       curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" | jq -r '.success'

2. **A brand-new Pages project 522s intermittently for the first few
   minutes.** Observed 2026-08-06 on the very first deploy: roughly half of
   requests returned `522` while Cloudflare's own API reported
   `stage=deploy/success`, and a same-account control (`quakeworld-docs.pages.dev`)
   behaved identically once settled. It is edge propagation, not a broken
   deploy. Wait a minute and re-sample before diagnosing anything.

3. **`pages project create` says the name exists** -- a previous partial run
   got that far. Skip create; `pages deploy` against an existing project is
   the normal repeat path.

4. **Rollback** = redeploy a known-good state. CF Pages deployments are
   immutable and listed (`pages deployment list`); check out the good commit
   and re-run the deploy command. Previous per-deployment alias URLs stay
   inspectable for diagnosis.

5. **Numbers render as dashes/blank on every entry** -- open the console. A
   CORS error on the manifest fetch means the oracle's nginx
   `access-control-allow-origin: *` header regressed (qw-oracle
   `deploy/nginx.conf`, `location /snapshots/`). A validation failure with a
   200 fetch means contract drift: diff the live manifest against
   `src/data/manifest-types.ts`, which is a MIRROR of the emitter's exported
   types -- the fix belongs upstream in the emitter, not here.
