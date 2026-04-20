---
name: deploy
description: Deploy any project to production. Covers MatchScheduler (Firebase), Quad (SSH/Docker to Xerial), QW Stats (SCP/Docker to Unraid), and Slipgate App (Windows build).
---

# Deploy Skill

This skill provides instructions for deploying various projects in the QuakeWorld monorepo.

## Quick Reference

| Project | Deploy command | Verify |
|---------|---------------|--------|
| matchscheduler | `firebase deploy --only <targets>` | https://matchscheduler-dev.web.app |
| quad | `ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && sudo qwvoice-ctl /srv/qwvoice/quad pull && sudo qwvoice-ctl /srv/qwvoice/quad up'` | Check logs: `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'` |
| qw-stats | `scp` files + `ssh root@100.114.81.91` rebuild | `curl https://qw-api.poker-affiliate.org/health` |

## Instructions

### MatchScheduler (Firebase)
1. **Build CSS**: `npm run version && npm run css:build` in `apps/matchscheduler/`.
2. **Deploy**: `firebase deploy --only hosting,functions`.

### Quad (SSH + Docker)
1. **Safety Check**: Ensure no recording is active on Xerial.
2. **Deploy**: Run the SSH pull and up command on `pinnaclepowerhouse`.

### QW Stats (SCP + Docker)
1. **Copy Files**: `scp` `server.js` and `package.json` to Unraid (100.114.81.91).
2. **Rebuild**: SSH to Unraid and run the docker build/restart command.

For full details on each project, refer to their respective `DEPLOYMENT.md` files or the original Claude `deploy` skill.
