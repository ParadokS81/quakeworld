---
name: deploy
description: Deploy any project to production. Covers MatchScheduler (Firebase), Quad (SSH/Docker to Xerial), QW Stats (SCP/Docker to Unraid), and Slipgate App (Windows build — workflow TBD). Use when deploying, shipping, pushing to prod, or checking deployment status.
---

# Deploy

## Quick Reference

| Project | Deploy command | Verify |
|---------|---------------|--------|
| matchscheduler | `firebase deploy --only <targets>` | https://matchscheduler-dev.web.app |
| quad | `wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && git pull && sudo qwvoice-ctl /srv/qwvoice/quad rebuild'"` | Check logs: `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'` |
| qw-stats | `scp` files + `ssh root@100.114.81.91` rebuild | `curl https://qw-api.poker-affiliate.org/health` |
| slipgate-app | `bun run tauri build` (Windows) / GitHub Actions | Launch the built .exe |

## MatchScheduler (Firebase)

**Working directory:** `apps/matchscheduler/`

1. Assess what changed — categorize into deploy targets:
   - `public/`, `src/css/` changes → **hosting**
   - `functions/` changes → **functions**
   - `firestore.rules`, `storage.rules` → **rules**
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

## Quad (SSH + Docker)

**SAFETY CHECK — do this FIRST:**
```bash
curl http://83.172.66.214:3000/health
```
If `recording.active === true` → **STOP. Do not deploy.** A team is currently recording. Wait for the session to end or coordinate with the user. Deploying would interrupt their recording.

**Deploy steps:**
1. Ensure code is committed and pushed to remote
2. Deploy:
   ```bash
   wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && git pull && sudo qwvoice-ctl /srv/qwvoice/quad rebuild'"
   ```
3. Verify — check logs for successful startup:
   ```bash
   ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'
   ```

**Common operations:**
| Action | Command |
|--------|---------|
| Live logs | `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs -f'` |
| Status | `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad ps'` |
| Restart (no rebuild) | `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad restart'` |
| Edit .env on server | `ssh pinnaclepowerhouse 'nano /srv/qwvoice/quad/.env'` |

Docker layer caching makes rebuilds fast (~15-30s) when only source code changed.

For details: `apps/quad/DEPLOYMENT.md`

## QW Stats (SCP + Docker)

**Requires:** Tailscale VPN active (Unraid at 100.114.81.91)

1. Copy updated files to Unraid:
   ```bash
   scp apps/qw-stats/api/server.js root@100.114.81.91:/mnt/user/appdata/qw-stats-api/
   ```
   If `package.json` changed, also scp `package.json`.
2. Rebuild and restart container:
   ```bash
   ssh root@100.114.81.91 "cd /mnt/user/appdata/qw-stats-api && docker build -t qw-stats-api . && docker stop qw-stats-api && docker rm qw-stats-api && docker run -d --name qw-stats-api --network phoenix-analytics_default -e PG_PASSWORD=\$(cat /mnt/user/appdata/qw-stats-api/.env | grep PG_PASSWORD | cut -d= -f2) -p 100.114.81.91:3100:3100 --restart unless-stopped qw-stats-api"
   ```
3. Verify:
   ```bash
   curl https://qw-api.poker-affiliate.org/health
   ```

For details: `apps/qw-stats/DEPLOYMENT.md` (gitignored — contains credentials)

## Slipgate App

**Status: WSL-to-Windows dev workflow TBD**

Current process (requires Windows terminal):
```bash
cd \\wsl.localhost\Ubuntu\home\paradoks\projects\quakeworld\apps\slipgate-app
bun install
bun run tauri build
```

CI: GitHub Actions builds all platforms on push to main.

For details: `apps/slipgate-app/DEPLOYMENT.md`

## Cross-Project Deploy Sequences

### Voice pipeline changes (quad → matchscheduler)
1. Update quad processing stages
2. Deploy quad to Xerial (this section)
3. Update matchscheduler storage/firestore rules if schema changed
4. Update matchscheduler frontend if display changed
5. Deploy matchscheduler

### Stats API changes (qw-stats → matchscheduler)
1. Update `apps/qw-stats/api/server.js`
2. Deploy qw-stats to Unraid (this section)
3. Update matchscheduler `public/js/services/QWStatsService.js`
4. Deploy matchscheduler hosting

### Standin flow changes (matchscheduler ↔ quad)
1. Update matchscheduler standin creation + Cloud Function
2. Deploy matchscheduler functions + rules
3. Update quad standin module if DM handling changed
4. Deploy quad to Xerial

## Credential Locations

| Credential | Location |
|-----------|----------|
| Firebase service account | `apps/matchscheduler/service-account.json`, `apps/quad/service-account.json` |
| Discord bot token | `apps/quad/.env` (DISCORD_TOKEN) |
| Discord OAuth | `apps/matchscheduler/functions/.env` |
| PostgreSQL password | `apps/qw-stats/.env` |
| Xerial SSH key | `~/.ssh/id_ed25519` (alias: `pinnaclepowerhouse`) |
| Unraid SSH key | `~/.ssh/id_rsa` |
