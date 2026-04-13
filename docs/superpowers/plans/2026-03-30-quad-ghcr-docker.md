# Quad GHCR Docker Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish quad Docker images to GitHub Container Registry so deployment becomes `docker compose pull && up` instead of `git pull && build`.

**Architecture:** GitHub Actions builds the image on push to `main` when `apps/quad/**` changes, pushes to `ghcr.io/paradoks81/quad`. The Dockerfile drops the baked-in Whisper model — models download at runtime to a persistent volume. Xerial's server pulls pre-built images instead of building from source.

**Tech Stack:** GitHub Actions, docker/build-push-action, GHCR, Docker Compose

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/quad-docker.yml` | Create | CI workflow: build + push to GHCR |
| `apps/quad/Dockerfile` | Modify | Remove whisper model bake-in (lines 65-67) |
| `apps/quad/docker-compose.yml` | Modify | `image:` instead of `build:`, add models volume |
| `apps/quad/.env.example` | Modify | Add `QUAD_VERSION` var |
| `apps/quad/DEPLOYMENT.md` | Modify | New deploy workflow, model download docs |
| `.claude/skills/deploy/SKILL.md` | Modify | Update quad deploy commands |

---

### Task 1: Remove Whisper Model Bake-in from Dockerfile

**Files:**
- Modify: `apps/quad/Dockerfile:65-67`

The Whisper model is ~500MB and makes the image huge. `faster-whisper` auto-downloads models by name at runtime to `~/.cache/huggingface/hub/`. We mount that as a volume so it persists across container restarts.

- [ ] **Step 1: Remove the build-time model download**

In `apps/quad/Dockerfile`, delete these three lines (65-67):

```dockerfile
ARG WHISPER_MODEL=small
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='default')"
```

The file should go from the `VOLUME /app/recordings` line (line 71) directly after the `COPY scripts/MumbleServer.ice` line (line 63), with no model download in between.

After the edit, lines 60-70 should look like:

```dockerfile
# Copy Python scripts (transcription + Murmur ICE sidecar)
COPY scripts/transcribe.py scripts/transcribe.py
COPY scripts/mumble-ice.py scripts/mumble-ice.py
COPY scripts/MumbleServer.ice scripts/MumbleServer.ice

# Recordings volume mount point
RUN mkdir -p /app/recordings
VOLUME /app/recordings
```

- [ ] **Step 2: Verify Dockerfile is valid**

```bash
cd /home/paradoks/projects/quakeworld/apps/quad && docker build --check .
```

If `--check` isn't available on this Docker version, just verify the file looks correct by reading it.

- [ ] **Step 3: Commit**

```bash
git add apps/quad/Dockerfile
git commit -m "Remove baked-in Whisper model from quad Dockerfile

Model downloads at runtime on first transcription. Reduces image
size by ~500MB and lets users choose their own model via WHISPER_MODEL env var.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Update docker-compose.yml for Pre-built Images

**Files:**
- Modify: `apps/quad/docker-compose.yml`
- Modify: `apps/quad/.env.example`

Switch from local build to pulling from GHCR. Add a volume for the Whisper model cache so it persists across container restarts.

- [ ] **Step 1: Replace `build: .` with `image:` and add models volume**

Replace the full contents of `apps/quad/docker-compose.yml` with:

```yaml
services:
  quad:
    image: ghcr.io/paradoks81/quad:${QUAD_VERSION:-latest}
    volumes:
      - ./recordings:/app/recordings
      - ./service-account.json:/app/service-account.json:ro
      - ./models:/root/.cache/huggingface/hub
    env_file: .env
    restart: unless-stopped
    ports:
      - "${HEALTH_PORT:-3000}:3000"
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility

  mumble:
    image: mumblevoip/mumble-server:latest
    container_name: mumble-server
    restart: unless-stopped
    ports:
      - "64738:64738"
      - "64738:64738/udp"
    volumes:
      - ./mumble-data:/data
    environment:
      MUMBLE_SUPERUSER_PASSWORD: "${MUMBLE_SUPERUSER_PASSWORD:-changeme}"
      MUMBLE_CONFIG_WELCOMETEXT: "Welcome to the QuakeWorld Voice Server"
      MUMBLE_CONFIG_USERS: 50
      MUMBLE_CONFIG_BANDWIDTH: 128000
      MUMBLE_CONFIG_SERVERPASSWORD: "${MUMBLE_SERVER_PASSWORD:-}"
      MUMBLE_CONFIG_REGISTERNAME: "QuakeWorld Voice"
      MUMBLE_CONFIG_ALLOWRECORDING: "true"
      MUMBLE_CONFIG_ICE: "tcp -h 0.0.0.0 -p 6502"
      MUMBLE_CONFIG_ICESECRETWRITE: "${MUMBLE_ICE_SECRET}"
    expose:
      - "6502"   # ICE API — internal Docker network only, not public
```

Changes from original:
- `build: .` → `image: ghcr.io/paradoks81/quad:${QUAD_VERSION:-latest}`
- Added `./models:/root/.cache/huggingface/hub` volume (persists downloaded Whisper models)
- Everything else identical

- [ ] **Step 2: Add QUAD_VERSION to .env.example**

Add this line at the top of `apps/quad/.env.example`, before `DISCORD_TOKEN`:

```
QUAD_VERSION=latest                # Docker image tag (latest, sha-abc1234, etc.)
```

- [ ] **Step 3: Commit**

```bash
git add apps/quad/docker-compose.yml apps/quad/.env.example
git commit -m "Switch quad compose to GHCR pre-built image

Replaces build-from-source with image pull from ghcr.io/paradoks81/quad.
Adds models volume so Whisper downloads persist across restarts.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/quad-docker.yml`

This workflow builds the quad Docker image and pushes to GHCR whenever `apps/quad/` files change on `main`. Uses layer caching to keep builds fast.

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/quad-docker.yml`:

```yaml
name: Build Quad Docker Image

on:
  push:
    branches: [main]
    paths:
      - 'apps/quad/**'
      - '.github/workflows/quad-docker.yml'
      - '!apps/quad/**/*.md'
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: paradoks81/quad

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: ./apps/quad
          file: ./apps/quad/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Notes on action versions:
- Uses `@v4`/`@v3`/`@v5`/`@v6` (latest major tags as of March 2026) rather than exact SHAs. These are the current stable versions of the official Docker GitHub Actions.
- `GITHUB_TOKEN` is provided automatically — no secrets to configure.
- `cache-from: type=gha` uses GitHub Actions cache for Docker layers. The expensive Python venv + CUDA libs layer (~400MB) will be cached after the first build.
- The `!apps/quad/**/*.md` exclusion prevents doc-only changes from triggering a build.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/quad-docker.yml
git commit -m "Add GitHub Actions workflow for quad Docker image

Builds on push to main when apps/quad/ changes. Pushes to
ghcr.io/paradoks81/quad with latest + sha tags. Uses GHA layer caching.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Update DEPLOYMENT.md

**Files:**
- Modify: `apps/quad/DEPLOYMENT.md`

The deploy workflow changes from git-pull-and-build to image-pull. Also documents the new model volume and first-run behavior.

- [ ] **Step 1: Update the Deploy Workflow section**

Replace the "Deploy Workflow" section (lines 79-92) with:

```markdown
## Deploy Workflow

### Standard Update (code changes)

```bash
ssh pinnaclepowerhouse
cd /srv/qwvoice/quad
sudo qwvoice-ctl /srv/qwvoice/quad pull
sudo qwvoice-ctl /srv/qwvoice/quad up
```

Images are built by GitHub Actions and pushed to `ghcr.io/paradoks81/quad`. On a typical deploy, Docker only downloads the changed layers (usually a few MB for code-only changes).

### One-liner from local machine

```bash
wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && sudo qwvoice-ctl /srv/qwvoice/quad pull && sudo qwvoice-ctl /srv/qwvoice/quad up'"
```

### First Deploy / Migration from git-based deploy

1. Stop the old container:
   ```bash
   sudo qwvoice-ctl /srv/qwvoice/quad down
   ```
2. Back up the existing `docker-compose.yml` and replace it with the new version (uses `image:` instead of `build:`).
3. Create the models directory:
   ```bash
   mkdir -p /srv/qwvoice/quad/models
   ```
4. Pull and start:
   ```bash
   sudo qwvoice-ctl /srv/qwvoice/quad pull
   sudo qwvoice-ctl /srv/qwvoice/quad up
   ```
5. The Whisper model downloads on first `/process transcribe` (~500MB for `small`, takes ~1 min). It's cached in `./models/` and persists across container restarts.

The monorepo source code at `/srv/qwvoice/quad/` is no longer needed after migration. Only these files matter:
- `docker-compose.yml`
- `.env`
- `service-account.json`
- `recordings/` (volume)
- `models/` (volume, Whisper model cache)
- `mumble-data/` (volume)
```

- [ ] **Step 2: Update the Operational Commands table**

Replace the Operational Commands table (lines 98-109) with:

```markdown
## Operational Commands

| Scenario | Command |
|---|---|
| **Code update** (most common) | `sudo qwvoice-ctl /srv/qwvoice/quad pull && sudo qwvoice-ctl /srv/qwvoice/quad up` |
| **Only .env changed** | `sudo qwvoice-ctl /srv/qwvoice/quad restart` |
| **View logs** | `sudo qwvoice-ctl /srv/qwvoice/quad logs -f` |
| **View recent logs** | `sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=100` |
| **Stop the bot** | `sudo qwvoice-ctl /srv/qwvoice/quad down` |
| **Check status** | `sudo qwvoice-ctl /srv/qwvoice/quad ps` |
| **Clean old images** | `sudo qwvoice-ctl /srv/qwvoice/quad prune` |
```

- [ ] **Step 3: Update the Architecture Notes section**

Replace the "Multi-stage build" subsection (lines 114-124) with:

```markdown
### Multi-stage build

```
Build stage (node:22-slim):
  npm ci -> tsc -> produces dist/ + node_modules/

Python deps stage (node:22-slim):
  python3-venv + faster-whisper + CUDA libs + zeroc-ice

Runtime stage (node:22-slim):
  ffmpeg + Python venv from python-deps stage
  dist/ + node_modules/ from build stage
  knowledge YAMLs + scripts + fonts
```

Images are built by GitHub Actions and published to `ghcr.io/paradoks81/quad`.
```

- [ ] **Step 4: Update the Volumes table**

Replace the Volumes table (lines 133-137) with:

```markdown
### Volumes

| Mount | Purpose |
|---|---|
| `./recordings:/app/recordings` | Recording output. Persists across container restarts. |
| `./service-account.json:/app/service-account.json:ro` | Firebase credentials for standin module. |
| `./models:/root/.cache/huggingface/hub` | Whisper model cache. Downloads on first transcription, persists across restarts. |
| `./mumble-data:/data` | Mumble server state. |
```

- [ ] **Step 5: Update the Environment subsection**

In the Environment subsection (around line 140), update the `WHISPER_MODEL` description:

Change:
```
- `WHISPER_MODEL` — model baked into image at build time (default: `small`)
```

To:
```
- `WHISPER_MODEL` — model name for transcription (default: `small`). Downloads to `./models/` on first use.
- `QUAD_VERSION` — Docker image tag to pull (default: `latest`)
```

- [ ] **Step 6: Update the GPU section**

In the GPU section (around line 150), add after the existing text:

```markdown
Prerequisites on the host machine:
- NVIDIA GPU driver installed
- NVIDIA Container Toolkit (`nvidia-ctk`)
- Verify with: `docker run --rm --gpus all nvidia/cuda:12.3.2-base-ubuntu22.04 nvidia-smi`
```

- [ ] **Step 7: Update File Ownership table**

Add to the File Ownership table:

```
| `/srv/qwvoice/quad/models/` | `root` | Whisper model cache, created by Docker |
```

- [ ] **Step 8: Commit**

```bash
git add apps/quad/DEPLOYMENT.md
git commit -m "Update quad DEPLOYMENT.md for GHCR image-based deploys

Deploy is now pull+up instead of git-pull+rebuild. Documents model
volume, first-run setup, and migration from git-based deploy.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Update Deploy Skill

**Files:**
- Modify: `.claude/skills/deploy/SKILL.md`

Update the quad deploy commands to match the new pull-based workflow.

- [ ] **Step 1: Update the Quick Reference table**

In `.claude/skills/deploy/SKILL.md`, replace the quad row in the Quick Reference table (line 13):

From:
```
| quad | `wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && git pull && sudo qwvoice-ctl /srv/qwvoice/quad rebuild'"` | Check logs: `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'` |
```

To:
```
| quad | `wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && sudo qwvoice-ctl /srv/qwvoice/quad pull && sudo qwvoice-ctl /srv/qwvoice/quad up'"` | Check logs: `ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'` |
```

- [ ] **Step 2: Update the Quad deploy steps section**

Replace lines 57-64 (the deploy steps for quad):

From:
```markdown
1. Ensure code is committed and pushed to remote
2. Deploy:
   ```bash
   wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && git pull && sudo qwvoice-ctl /srv/qwvoice/quad rebuild'"
   ```
3. Verify — check logs for successful startup:
   ```bash
   ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'
   ```
```

To:
```markdown
1. Ensure code is committed and pushed to main (GitHub Actions builds the image automatically)
2. Wait for the GitHub Actions workflow to complete (`gh run list --workflow=quad-docker.yml --limit=1`)
3. Deploy:
   ```bash
   wsl bash -c "ssh pinnaclepowerhouse 'cd /srv/qwvoice/quad && sudo qwvoice-ctl /srv/qwvoice/quad pull && sudo qwvoice-ctl /srv/qwvoice/quad up'"
   ```
4. Verify — check logs for successful startup:
   ```bash
   ssh pinnaclepowerhouse 'sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20'
   ```
```

- [ ] **Step 3: Update the layer caching note**

Replace line 75:

From:
```
Docker layer caching makes rebuilds fast (~15-30s) when only source code changed.
```

To:
```
Images are pre-built by GitHub Actions and pushed to ghcr.io/paradoks81/quad. Deploy pulls only changed layers (typically a few MB for code changes).
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/deploy/SKILL.md
git commit -m "Update deploy skill for quad GHCR workflow

Deploy is now pull+up. GitHub Actions builds the image on push to main.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Verify and Push

This task handles the initial trigger — pushing to main so GitHub Actions runs the first build.

- [ ] **Step 1: Make the GHCR package public after first build**

After the first push to main triggers the workflow:
1. Go to https://github.com/ParadokS81/quakeworld/packages
2. Click the `quad` package
3. Package Settings > Danger Zone > Change Visibility > Public

This is a one-time manual step. After this, anyone can `docker pull ghcr.io/paradoks81/quad:latest` without authentication.

- [ ] **Step 2: Verify the image exists**

```bash
docker pull ghcr.io/paradoks81/quad:latest
```

- [ ] **Step 3: Migration on Xerial's server**

SSH into Xerial's server and:

```bash
ssh pinnaclepowerhouse

# Back up old compose
cp /srv/qwvoice/quad/docker-compose.yml /srv/qwvoice/quad/docker-compose.yml.bak

# Copy new compose file (scp from local or edit in place)
# The new file uses image: instead of build:

# Create models directory
mkdir -p /srv/qwvoice/quad/models

# Pull and start
cd /srv/qwvoice/quad
sudo qwvoice-ctl /srv/qwvoice/quad pull
sudo qwvoice-ctl /srv/qwvoice/quad up

# Verify
sudo qwvoice-ctl /srv/qwvoice/quad logs --tail=20
```

After verifying the new setup works, the git repo at `/srv/qwvoice/quad/` can be cleaned up — only `docker-compose.yml`, `.env`, `service-account.json`, `recordings/`, `models/`, and `mumble-data/` need to remain.
