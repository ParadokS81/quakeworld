---
name: deploy
description: Deploy any project to production. Covers MatchScheduler (Firebase), Quad (Docker Compose on Unraid), QW Stats (Docker on Unraid), and Slipgate App (Windows build -- workflow TBD). Use when deploying, shipping, pushing to prod, or checking deployment status.
---

# Deploy

## Quick Reference

| Project | Deploy command | Verify |
|---------|---------------|--------|
| matchscheduler | `firebase deploy --only <targets>` | https://matchscheduler-dev.web.app |
| quad | `cd /mnt/user/appdata/quad && docker compose pull && docker compose up -d` | `cd /mnt/user/appdata/quad && docker compose logs --tail=20 quad` |
| qw-stats | `cp` files into appdata + `docker build`/`run` | `curl https://qw-api.poker-affiliate.org/health` |
| slipgate-app | `bun run tauri build` (Windows) / GitHub Actions | Launch the built .exe |

## MatchScheduler (Firebase)

**Working directory:** `apps/matchscheduler/`

1. Assess what changed -- categorize into deploy targets:
   - `public/`, `src/css/` changes -> **hosting**
   - `functions/` changes -> **functions**
   - `firestore.rules`, `storage.rules` -> **rules**
2. Build CSS (always before hosting deploys):
   ```bash
   npm run version && npm run css:build
   ```
3. Deploy:
   ```bash
   firebase deploy --only hosting              # Frontend only
   firebase deploy --only functions            # Backend only
   firebase deploy --only firestore:rules      # Security rules
   firebase deploy --only hosting,functions    # Both
   firebase deploy                             # Everything
   ```
4. Verify: open https://matchscheduler-dev.web.app and check the feature

**Region config:**
- v1 functions (25): `europe-west3` (shared container, fast deploys)
- v2 storage triggers (2): `europe-west10` (processLogoUpload, processAvatarUpload)
- Frontend region setting: `getFunctions(app, 'europe-west3')` in `public/index.html`

For details: `apps/matchscheduler/DEPLOYMENT.md`

## Quad (SSH + Docker, Unraid)

**Check for an active recording first -- no hook enforces it.** Any `up`, `down`, `restart`, `stop`, `kill` or `rm` on the quad stack cuts a recording in progress. The bot's `/health` endpoint reports `"active":true` while one runs; its port 3000 is not published, so read it from inside the container (`docker exec quad-quad-1 ...`, not yet proven from the dev cockpit -- prove it once and pin the command here). If you cannot read it, ask the operator whether a recording is running before you touch the stack.

**Deploy steps:**
1. Ensure code is committed and pushed to main (GitHub Actions builds the image automatically)
2. Wait for the GitHub Actions workflow to complete:
   ```bash
   gh run watch --exit-status $(gh run list --workflow=quad-docker.yml --limit=1 --json databaseId --jq '.[0].databaseId')
   ```
3. Deploy (the compose file is mounted at its host path; `docker` reaches the host through `dev-deploy-proxy`, and GHCR pulls authenticate via `DOCKER_CONFIG`):
   ```bash
   cd /mnt/user/appdata/quad && docker compose pull && docker compose up -d
   ```
4. Verify -- check logs for successful startup:
   ```bash
   cd /mnt/user/appdata/quad && docker compose logs --tail=20 quad
   ```

**Common operations:**
| Action | Command |
|--------|---------|
| Live logs | `cd /mnt/user/appdata/quad && docker compose logs -f` |
| Status | `cd /mnt/user/appdata/quad && docker compose ps` |
| Restart (no rebuild) | `cd /mnt/user/appdata/quad && docker compose restart` |
| Edit .env | edit `/mnt/user/appdata/quad/.env` directly (mounted read-write); put secret values in with `secret-drop env`, never inline |

Images are pre-built by GitHub Actions and pushed to ghcr.io/paradoks81/quad. Deploy pulls only changed layers (typically a few MB for code changes).

**Unraid notes:**
- Mumble container co-runs alongside the bot. Mumble player endpoint is `mumble.slipgate.me:64738`. The Cloudflare A record is `DNS only` (proxy off), router port-forwards 64738 TCP+UDP to Unraid `192.168.1.205`.
- No GPU. Whisper transcription auto-falls-back to CPU. If `/process transcribe` is too slow on the `small` model, set `WHISPER_MODEL=base` in `.env`.

For details: `apps/quad/DEPLOYMENT.md`

## QW Stats (SCP + Docker)

The build context is mounted at its host path, `/mnt/user/appdata/qw-stats-api`; `docker` reaches the host through `dev-deploy-proxy`.

1. Copy updated files into the build context:
   ```bash
   cp apps/qw-stats/api/server.js /mnt/user/appdata/qw-stats-api/
   ```
   If `package.json` changed, also copy `package.json`.
2. Rebuild and restart the container:
   ```bash
   cd /mnt/user/appdata/qw-stats-api && docker build -t qw-stats-api . && docker stop qw-stats-api && docker rm qw-stats-api && docker run -d --name qw-stats-api --network phoenix-analytics_default -e PG_PASSWORD="$(grep '^POSTGRES_PASSWORD=' /mnt/user/appdata/phoenix-analytics/.env | cut -d= -f2-)" -p 100.114.81.91:3100:3100 --restart unless-stopped qw-stats-api
   ```
   Two parts are unproven from the dev cockpit: `docker build` through the proxy (a `Forbidden` means its allowlist needs a line -- write ops a letter), and the password source. The old one, `/mnt/user/appdata/qw-stats-api/.env`, no longer exists; the phoenix-analytics Postgres password is the likely value -- confirm before the first run.
3. Verify:
   ```bash
   curl https://qw-api.poker-affiliate.org/health
   ```

For details: `apps/qw-stats/DEPLOYMENT.md` (gitignored -- contains credentials)

## Slipgate App

**Status: WSL-to-Windows dev workflow TBD**

A local build needs a Windows machine with its own checkout (`bun install && bun run tauri build` in `apps/slipgate-app`); the dev cockpit is Linux and cannot build it.

CI: GitHub Actions builds all platforms on push to main.

For details: `apps/slipgate-app/DEPLOYMENT.md`

## Cross-Project Deploy Sequences

### Voice pipeline changes (quad -> matchscheduler)
1. Update quad processing stages
2. Deploy quad to Unraid (this section)
3. Update matchscheduler storage/firestore rules if schema changed
4. Update matchscheduler frontend if display changed
5. Deploy matchscheduler

### Stats API changes (qw-stats -> matchscheduler)
1. Update `apps/qw-stats/api/server.js`
2. Deploy qw-stats to Unraid (this section)
3. Update matchscheduler `public/js/services/QWStatsService.js`
4. Deploy matchscheduler hosting

### Standin flow changes (matchscheduler <-> quad)
1. Update matchscheduler standin creation + Cloud Function
2. Deploy matchscheduler functions + rules
3. Update quad standin module if DM handling changed
4. Deploy quad (Quad section above)

## Credential Locations

| Credential | Location |
|-----------|----------|
| Firebase service account (quad) | `/mnt/user/appdata/quad/service-account.json` |
| Discord bot token | `/mnt/user/appdata/quad/.env` (DISCORD_TOKEN) |
| Discord OAuth | `apps/matchscheduler/functions/.env` |
| PostgreSQL password (phoenix-analytics) | `/mnt/user/appdata/phoenix-analytics/.env` (POSTGRES_PASSWORD) |
| Telia router admin (Hyllie home) | local Claude memory: `reference_unraid_telia_router_access.md` (NEVER commit to repo) |
