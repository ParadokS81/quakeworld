# Unified Deploy Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all deployment procedures into one on-demand skill with standardized per-project DEPLOYMENT.md reference docs, trimming deploy content from CLAUDE.md files.

**Architecture:** One `.claude/skills/deploy/SKILL.md` serves as the deployment cheat sheet for all projects. Each deployed project gets a standardized `DEPLOYMENT.md` for detailed reference. Deploy-related content is removed from root and app CLAUDE.md files to reduce context noise.

**Tech Stack:** Claude Code skills, markdown documentation

---

### Task 1: Create the unified deploy skill

**Files:**
- Create: `.claude/skills/deploy/SKILL.md`

- [ ] **Step 1: Create the skill file**

```markdown
---
name: deploy
description: Deploy any project to production. Covers MatchScheduler (Firebase), Quad (SSH/Docker to Xerial), QW Stats (SCP/Docker to Unraid), and Slipgate App (Windows build — workflow TBD). Use when deploying, shipping, pushing to prod, or checking deployment status.
---

# Deploy

## Quick Reference

| Project | Deploy command | Verify |
|---------|---------------|--------|
| matchscheduler | `firebase deploy --only <targets>` | https://matchscheduler.web.app |
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
4. Verify: open https://matchscheduler.web.app and check the feature

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
```

- [ ] **Step 2: Verify the skill is discoverable**

Run: `ls .claude/skills/deploy/SKILL.md`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/deploy/SKILL.md
git commit -m "Add unified deploy skill covering all projects"
```

---

### Task 2: Create matchscheduler DEPLOYMENT.md

Extract deployment details from `apps/matchscheduler/CLAUDE.md` (lines 283-329) into a standalone reference doc.

**Files:**
- Create: `apps/matchscheduler/DEPLOYMENT.md`

- [ ] **Step 1: Create the deployment reference**

```markdown
# MatchScheduler — Deployment Reference

## Infrastructure

| Property | Value |
|----------|-------|
| Firebase project | `matchscheduler-dev` |
| Hosting URL | https://matchscheduler.web.app |
| Functions region (v1) | `europe-west3` (Frankfurt) |
| Functions region (v2 storage) | `europe-west10` |
| Firestore | Default database |
| Auth providers | Google, Discord OAuth |

## Prerequisites

- Firebase CLI installed and authenticated (`firebase login`)
- Node.js (for CSS build)
- Access to the `matchscheduler-dev` Firebase project

## Deploy Workflow

### 1. Assess changes

Categorize modified files into deploy targets:
- **hosting**: Changes in `public/`, `src/css/`, or any frontend file
- **functions**: Changes in `functions/`
- **rules**: Changes in `firestore.rules` or `storage.rules`

### 2. Build

Always run before deploying hosting:
```bash
npm run version    # Stamp build version
npm run css:build  # Compile Tailwind: src/css/input.css → public/css/main.css
```

### 3. Deploy

```bash
firebase deploy --only hosting              # Frontend only
firebase deploy --only functions            # All functions (v1 shared container — fast!)
firebase deploy --only firestore:rules      # Security rules
firebase deploy --only hosting,functions    # Both
firebase deploy                             # Everything
```

Alternative: `./scripts/deploy-functions.sh` (same as `firebase deploy --only functions` with logging)

### 4. Verify

Open https://matchscheduler.web.app and confirm the change is live.

## Operational Commands

| Action | Command |
|--------|---------|
| Deploy hosting | `firebase deploy --only hosting` |
| Deploy functions | `firebase deploy --only functions` |
| Deploy rules | `firebase deploy --only firestore:rules` |
| Deploy everything | `firebase deploy` |
| View function logs | `firebase functions:log` |
| Check emulator (dev) | http://localhost:8080 (Firestore), http://localhost:5001 (Functions) |

## Architecture Notes

### Function regions
- **v1 onCall functions (25)**: All share a single Cloud Functions container in `europe-west3`. This means `firebase deploy --only functions` deploys all 25 at once and is fast.
- **v2 storage triggers (2)**: `processLogoUpload` and `processAvatarUpload` run as separate Cloud Run services in `europe-west10` (must match storage bucket region).

### Adding a new Cloud Function

Use the v1 pattern (NOT v2):
```javascript
const functions = require('firebase-functions');

exports.myNewFunction = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
        // data = parameters, context.auth = user auth
    });
```
1. Export it in `functions/index.js`
2. Deploy with `firebase deploy --only functions`

### Frontend region config

The frontend must specify the same region when calling functions:
```javascript
getFunctions(app, 'europe-west3')  // in public/index.html
```

### CSS build pipeline

```
Source (EDIT THIS):    src/css/input.css
                              ↓  (npm run css:build)
Output (NEVER EDIT):   public/css/main.css
```

Tailwind watcher rebuilds automatically during dev. Always run `npm run css:build` before deploying hosting.

## Troubleshooting

### Functions deploy fails
- Check `firebase functions:log` for errors
- Ensure all functions use `europe-west3` region (v1) or `europe-west10` (v2 storage only)

### Orphaned Cloud Run services
After the v1 migration, old per-function Cloud Run services may exist:
```bash
gcloud run services list --region=europe-west3
gcloud run services delete <functionName> --region=europe-west3
# Keep: processLogoUpload, processAvatarUpload (these are v2)
```

### CSS changes not appearing
- Verify you ran `npm run css:build` before deploying
- Check that you edited `src/css/input.css`, not `public/css/main.css`
```

- [ ] **Step 2: Commit**

```bash
git add apps/matchscheduler/DEPLOYMENT.md
git commit -m "Add matchscheduler DEPLOYMENT.md — extracted from CLAUDE.md"
```

---

### Task 3: Restructure quad DEPLOYMENT.md

Add the pre-deploy recording safety check and align section headings with the standard template. The existing content is good — this is a light restructure, not a rewrite.

**Files:**
- Modify: `apps/quad/DEPLOYMENT.md`

- [ ] **Step 1: Add pre-deploy safety check after the Server section**

After the "## Server" table and before "### SSH Access", add:

```markdown
## Pre-deploy Safety Check

**Before ANY deploy, check for active voice recordings:**

```bash
curl http://83.172.66.214:3000/health
```

If the response shows `"recording": { "active": true }` — **STOP. Do not deploy.** A team is currently recording and deploying would interrupt their session.

Wait for the recording to finish, then re-check before proceeding.
```

- [ ] **Step 2: Rename the "Deploy Workflow" section heading to match template**

Change `## Deploy Workflow` to `## Deploy Workflow` (already matches — verify it's consistent).

Verify the file has these top-level sections (reorder if needed):
1. Infrastructure (rename "## Server" to "## Infrastructure")
2. Pre-deploy Safety Check (new)
3. SSH Access (keep as subsection of Infrastructure)
4. Container Management (keep as subsection)
5. Deploy Workflow
6. Operational Commands (rename "### When to use what" to "## Operational Commands")
7. Architecture Notes (rename "## Docker Architecture" to "## Architecture Notes")
8. Troubleshooting
9. Local Development

- [ ] **Step 3: Commit**

```bash
git add apps/quad/DEPLOYMENT.md
git commit -m "Add pre-deploy recording check and standardize DEPLOYMENT.md sections"
```

---

### Task 4: Rename and restructure qw-stats INFRASTRUCTURE.md to DEPLOYMENT.md

**Files:**
- Rename: `apps/qw-stats/INFRASTRUCTURE.md` → `apps/qw-stats/DEPLOYMENT.md`
- Modify: `apps/qw-stats/.gitignore` (update the gitignore entry)
- Modify: `apps/qw-stats/CLAUDE.md` (update the reference)

- [ ] **Step 1: Rename the file**

```bash
cd /home/paradoks/projects/quakeworld
mv apps/qw-stats/INFRASTRUCTURE.md apps/qw-stats/DEPLOYMENT.md
```

- [ ] **Step 2: Update .gitignore**

In `apps/qw-stats/.gitignore`, change the line `INFRASTRUCTURE.md` to `DEPLOYMENT.md`.

- [ ] **Step 3: Update CLAUDE.md reference**

In `apps/qw-stats/CLAUDE.md`, find the line:
```
If you have access to the live infrastructure (ParadokS's Unraid server), see `INFRASTRUCTURE.md` for connection details, deployment instructions, and server reference. That file is gitignored and not included in the public repo.
```

Replace with:
```
If you have access to the live infrastructure (ParadokS's Unraid server), see `DEPLOYMENT.md` for connection details, deployment instructions, and server reference. That file is gitignored and not included in the public repo.
```

- [ ] **Step 4: Restructure DEPLOYMENT.md sections to match template**

Ensure the file has these top-level sections (reorder/rename existing content):
1. `## Infrastructure` (from "## Unraid Server Reference")
2. `## Prerequisites` (add: Tailscale VPN required, SSH key at ~/.ssh/id_rsa)
3. `## Deploy Workflow` (from "### Redeploying")
4. `## Operational Commands` (add table: check status, view logs, restart)
5. `## Architecture Notes` (from Docker/network info scattered in file)
6. `## Troubleshooting` (add: Tailscale not connected, container won't start)
7. `## Local Development` (from "## Running Locally")
8. `## Database Reference` (from "## PostgreSQL Database" and "## SQLite Database")

Keep all existing credential values — the file stays gitignored.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-stats/.gitignore apps/qw-stats/CLAUDE.md
git commit -m "Rename INFRASTRUCTURE.md to DEPLOYMENT.md, update references"
```

Note: `DEPLOYMENT.md` itself is gitignored and won't be in the commit. That's correct.

---

### Task 5: Create minimal slipgate-app DEPLOYMENT.md

**Files:**
- Create: `apps/slipgate-app/DEPLOYMENT.md`

- [ ] **Step 1: Create the file**

```markdown
# Slipgate App — Deployment Reference

## Infrastructure

| Property | Value |
|----------|-------|
| Platform | Windows desktop (Tauri v2) |
| Distribution | .exe installer / .msi |
| CI/CD | GitHub Actions (builds Win/Mac/Linux on push to main) |
| Source location | WSL monorepo (`apps/slipgate-app/`) |
| Build environment | Native Windows (Tauri needs Windows toolchain) |

## Prerequisites

- **Rust** — via `rustup` (MSVC toolchain)
- **Bun** — JavaScript runtime and package manager
- **Microsoft C++ Build Tools** — "Desktop development with C++" workload
- **WebView2** — pre-installed on Windows 10/11

See `docs/DEVELOPMENT.md` for full setup instructions.

## Deploy Workflow

### Manual build (Windows terminal)

```bash
cd \\wsl.localhost\Ubuntu\home\paradoks\projects\quakeworld\apps\slipgate-app
bun install
bun run tauri build
```

The built binary is in `src-tauri/target/release/`.

### CI build (GitHub Actions)

Pushing to `main` triggers a matrix build across Windows, macOS, and Linux. See `.github/workflows/` for configuration.

## WSL-to-Windows Dev Workflow

**Status: TBD**

Source lives in WSL monorepo for consistency with other projects, but Tauri needs the Windows toolchain. An automated mechanism for building from WSL and testing on Windows is not yet set up.

Current workaround: open a Windows terminal, navigate to the WSL path, and run build commands directly.

## Architecture Notes

Tauri v2 builds native desktop apps using the OS's own webview:
- On Windows: builds .exe using MSVC toolchain + WebView2
- On Linux: builds using system webkit2gtk
- On macOS: builds using WKWebView

The binary is ~5-10 MB with low memory usage compared to Electron.
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/DEPLOYMENT.md
git commit -m "Add slipgate-app DEPLOYMENT.md — documents current build process and TBD workflow"
```

---

### Task 6: Move qwhub-api skill to global

**Files:**
- Move: `apps/matchscheduler/.claude/skills/qwhub-api/SKILL.md` → `.claude/skills/qwhub-api/SKILL.md`
- Delete: `apps/matchscheduler/.claude/skills/qwhub-api/` (empty after move)

- [ ] **Step 1: Move the skill**

```bash
cd /home/paradoks/projects/quakeworld
mkdir -p .claude/skills/qwhub-api
mv apps/matchscheduler/.claude/skills/qwhub-api/SKILL.md .claude/skills/qwhub-api/SKILL.md
rmdir apps/matchscheduler/.claude/skills/qwhub-api
```

- [ ] **Step 2: Clean up empty matchscheduler skills directory if the deploy skill is also removed**

This step runs after Task 7. If `apps/matchscheduler/.claude/skills/` is empty after both moves:

```bash
rmdir apps/matchscheduler/.claude/skills 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/qwhub-api/SKILL.md
git rm apps/matchscheduler/.claude/skills/qwhub-api/SKILL.md
git commit -m "Move qwhub-api skill to global — shared domain knowledge across projects"
```

---

### Task 7: Delete old matchscheduler deploy skill

**Files:**
- Delete: `apps/matchscheduler/.claude/skills/deploy/SKILL.md`

- [ ] **Step 1: Remove the file and directory**

```bash
cd /home/paradoks/projects/quakeworld
rm apps/matchscheduler/.claude/skills/deploy/SKILL.md
rmdir apps/matchscheduler/.claude/skills/deploy
```

- [ ] **Step 2: Clean up parent directory**

```bash
rmdir apps/matchscheduler/.claude/skills 2>/dev/null || true
```

If other files remain in `.claude/skills/`, leave it. If empty (because qwhub-api was also moved in Task 6), remove it.

- [ ] **Step 3: Commit**

```bash
git rm apps/matchscheduler/.claude/skills/deploy/SKILL.md
git commit -m "Remove matchscheduler deploy skill — absorbed into unified deploy skill"
```

---

### Task 8: Trim root CLAUDE.md

Remove deploy-specific infrastructure details and credential table — now covered by the deploy skill.

**Files:**
- Modify: `CLAUDE.md` (root)

- [ ] **Step 1: Remove the Shared Infrastructure section (lines 135-166)**

Remove everything from `### Firebase Project: matchscheduler-dev` through the end of the credentials table. This includes:
- Firebase Project block
- Xerial's Server block
- Unraid block
- QW Hub API block
- Credentials table

**Keep** the `## Shared Infrastructure` heading but replace the content with a pointer:

```markdown
## Shared Infrastructure

Infrastructure details, deploy commands, and credential locations are in the deploy skill — invoke with "deploy" or `/deploy`. For detailed reference, each deployed project has a `DEPLOYMENT.md`.

### QW Hub API (external, read-only)
- Supabase: https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games
- KtxStats: https://d.quake.world/{sha256[0:3]}/{sha256}.mvd.ktxstats.json
```

The QW Hub API block stays because it's not deployment infrastructure — it's an external data source used during development.

- [ ] **Step 2: Remove the Cross-Project Workflows section (lines 193-213)**

Remove everything from `## Cross-Project Workflows` through the end of the file. These sequences are now in the deploy skill.

- [ ] **Step 3: Verify the trimmed file**

Run: `wc -l CLAUDE.md`
Expected: roughly 165-175 lines (down from 212)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Trim root CLAUDE.md — deploy info moved to deploy skill"
```

---

### Task 9: Trim matchscheduler CLAUDE.md

Remove the deployment section and legacy Q-commands section — deployment is in DEPLOYMENT.md, Q-commands are replaced by superpowers.

**Files:**
- Modify: `apps/matchscheduler/CLAUDE.md`

- [ ] **Step 1: Remove the Deployment (Production) subsection (lines 283-329)**

Remove from `### Deployment (Production)` through the end of the "Cleaning up old Cloud Run services" block (line 329). Keep the `### Firebase Emulator` section above it and the `### Common Integration Mistakes` section below it.

- [ ] **Step 2: Remove the Workflow Commands section (lines 410-428)**

Remove from `## Workflow Commands` through the end of the iteration cycle list. These Q-commands (QNEW, QPLAN, QCODE, etc.) were replaced by superpowers skills.

- [ ] **Step 3: Verify the trimmed file**

Run: `wc -l apps/matchscheduler/CLAUDE.md`
Expected: roughly 375 lines (down from 443 — deploy section ~47 lines, workflow section ~19 lines removed)

- [ ] **Step 4: Commit**

```bash
git add apps/matchscheduler/CLAUDE.md
git commit -m "Trim matchscheduler CLAUDE.md — deploy to DEPLOYMENT.md, Q-commands removed"
```

---

### Task 10: Trim quad CLAUDE.md

Remove the "Deployment — Xerial's Server" section — now covered by DEPLOYMENT.md and the deploy skill.

**Files:**
- Modify: `apps/quad/CLAUDE.md`

- [ ] **Step 1: Remove the Deployment section (lines 319-396)**

Remove from `## Deployment — Xerial's Server` through `- For local dev without GPU, create `docker-compose.override.yml` (gitignored)` (line 396).

Replace with a pointer:

```markdown
## Deployment

See `DEPLOYMENT.md` for full deployment reference (SSH access, Docker operations, deploy workflow, troubleshooting).

Quick deploy: `wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && git pull && sudo qwvoice-ctl /srv/qwvoice/quad rebuild'"`
```

- [ ] **Step 2: Verify the trimmed file**

Run: `wc -l apps/quad/CLAUDE.md`
Expected: roughly 380 lines (down from 452 — ~78 lines removed, ~5 lines added)

- [ ] **Step 3: Commit**

```bash
git add apps/quad/CLAUDE.md
git commit -m "Trim quad CLAUDE.md — deploy details moved to DEPLOYMENT.md"
```

---

### Task 11: Delete legacy matchscheduler claude-commands.md

The Q-commands file is obsolete — superpowers skills replaced the workflow.

**Files:**
- Delete: `apps/matchscheduler/claude-commands.md`

- [ ] **Step 1: Remove the file**

```bash
git rm apps/matchscheduler/claude-commands.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "Remove legacy claude-commands.md — superpowers skills replace Q-commands"
```

---

### Task 12: Update memory — record harness decisions

**Files:**
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_harness_design.md`

- [ ] **Step 1: Update the harness design memory**

Mark the deploy/runbooks/credentials questions as resolved. Update the open questions list to reflect what's done and what remains.

Key decisions to record:
- Deploy procedures → one unified skill (`.claude/skills/deploy/SKILL.md`)
- Reference docs → standardized `DEPLOYMENT.md` per project
- Credentials → locations table in skill, values in gitignored files
- Skills → consolidated to global `.claude/skills/`
- Q-commands → removed, replaced by superpowers

- [ ] **Step 2: No commit needed** (memory files are outside the repo)
