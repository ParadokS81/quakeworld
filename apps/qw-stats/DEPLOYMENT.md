# QW Stats -- Deployment

What ships, where, and how to put a new build live. Locations only, never secret values. The root `deploy` skill ("QW Stats" section) renders the sequence below.

## What is deployed

- **`qw-stats-api`** -- one container on the Unraid box, built from the build context `/mnt/user/appdata/qw-stats-api/` (`Dockerfile`, `package.json`, `server.js`, `updater.js`; the Dockerfile copies the last two). It joins the `phoenix-analytics_default` docker network, publishes `100.114.81.91:3100`, and restarts `unless-stopped`.
- **Database** -- `quake_stats` inside the shared `phoenix-postgres` container, reached by hostname `phoenix-postgres` (`OVERVIEW.md`, Integration points). Not part of this deploy and never stopped by it.
- **Public URL** -- `https://qw-api.poker-affiliate.org`, served by the `qw-stats-cloudflared` container (an outbound Cloudflare tunnel). Its tunnel config lives with that container, not in this repository or the build context.

## Where the secrets live

- `PG_PASSWORD` for the API is `POSTGRES_PASSWORD` in `/mnt/user/appdata/phoenix-analytics/.env`. The `phoenix` role is shared with that project's databases, so a rotation updates the file and recreates this container in one step.
- Nothing else. The Supabase key in `updater.js` is QWHub's public anon key, not a secret.

## Release sequence (from the dev cockpit)

1. Copy the changed files from `apps/qw-stats/api/` into the build context: `server.js`, `updater.js`, `package.json`, whichever changed.
2. `cd /mnt/user/appdata/qw-stats-api && docker build -t qw-stats-api .`
3. `docker stop qw-stats-api && docker rm qw-stats-api`, then the `docker run` line in the deploy skill (network, port, `-e PG_PASSWORD` read from the `.env` above, restart policy).
4. Environment knobs and their defaults: `PORT` 3100, `UPDATE_INTERVAL` 900 seconds, `PG_HOST` phoenix-postgres, `PG_PORT` 5432, `PG_DATABASE` quake_stats, `PG_USER` phoenix.

Unproven from the cockpit as of 2026-10-10: `docker build` through `dev-deploy-proxy`. The last deploy (Feb 2026) predates the fence; a `Forbidden` means the proxy allowlist needs a line, which is a letter to ops.

## Verify

- `curl https://qw-api.poker-affiliate.org/health` returns `{"status":"ok","service":"qw-stats-api"}`.
- `curl https://qw-api.poker-affiliate.org/api/sync-status` about 15 seconds after start: the first QWHub pull runs 10 seconds after boot, so `lastSync.at` should be fresh and `error` absent.
- Downtime is the stop-to-run gap plus that first pull. The updater is idempotent (`ON CONFLICT DO NOTHING` on `demo_sha256`), so a restart never double-inserts.

## Rollback

The image tag is overwritten on every build and no history is kept. Roll back by checking out the previous `server.js` / `updater.js` from git (`git log -- apps/qw-stats/api`), copying them into the build context, and running steps 2 and 3 again.
