# Deployment Guide

## Infrastructure

| | |
|---|---|
| **Host** | Unraid server, Tailscale `100.114.81.91` |
| **SSH alias** | `unraid` (configured in `~/.ssh/config`) |
| **SSH key** | `~/.ssh/id_rsa` |
| **Quad directory** | `/mnt/user/appdata/quad/` (compose + config + volumes, no source code) |
| **Recordings** | `/mnt/user/appdata/quad/recordings/` (volume-mounted, survives restarts) |
| **Mumble player endpoint** | `mumble.slipgate.me:64738` (Cloudflare A record `DNS only` → home WAN IP, then router port-forward to Unraid LAN `192.168.1.205:64738`) |
| **GPU** | None. Whisper transcription falls back to CPU automatically (`device="auto"` in `scripts/transcribe.py`). |
| **CPU/RAM** | 24-core i7-13700, 62GB RAM. Compose limits the bot to 8 CPU / 8GB. |

## Pre-deploy Safety Check

**Before ANY deploy, check for active voice recordings:**

```bash
ssh unraid 'curl -s http://localhost:3000/health'
```

If the response shows `"recording": { "active": true }` -- **STOP. Do not deploy.** A team is currently recording and deploying would interrupt their session. The health endpoint is bound to `127.0.0.1:3000` inside Unraid, so the SSH-then-curl path is the only way in.

Wait for the recording to finish, then re-check before proceeding.

**Automated enforcement:** `scripts/check-quad-recording.sh` (Claude Code hook) checks the health endpoint before any Bash command that runs `docker compose` ops on `/mnt/user/appdata/quad`. Blocks the deploy if a recording is active.

### SSH Access

```bash
ssh unraid
# Or explicitly:
ssh -i ~/.ssh/id_rsa root@100.114.81.91
```

Tailscale must be active on the local machine.

### Container Management

Plain `docker compose`. Unraid is operator-controlled, no `qwvoice-ctl`-style wrapper. The legacy Xerial deployment used a sudo-restricted wrapper because the box was shared; on Unraid we are root.

| Action | Command |
|---|---|
| Start | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose up -d'` |
| Pull latest image | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose pull'` |
| Pull + restart (standard deploy) | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose pull && docker compose up -d'` |
| Stop | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose down'` |
| Restart (no rebuild) | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose restart'` |
| Status | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose ps'` |
| Live logs | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose logs -f'` |
| Recent logs | `ssh unraid 'cd /mnt/user/appdata/quad && docker compose logs --tail=100'` |
| Clean dangling images | `ssh unraid 'docker image prune -f'` |
| Edit `.env` on server | `ssh unraid 'nano /mnt/user/appdata/quad/.env'` |

### Compose plugin caveat

Unraid does not ship `docker compose` by default. The plugin binary is installed at `/usr/local/lib/docker/cli-plugins/docker-compose`, which lives on tmpfs and **does not survive a host reboot**. After an Unraid reboot, the bot's containers will keep running (Docker manages them independently of the compose CLI), but you cannot run `docker compose` commands until the binary is re-installed. Two ways to handle:

1. **Recommended:** install the **Compose Manager** plugin from Unraid Community Apps. Persists across reboots.
2. **Stop-gap:** add a User Scripts entry that re-downloads the binary on boot:
   ```bash
   mkdir -p /usr/local/lib/docker/cli-plugins
   curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
     -o /usr/local/lib/docker/cli-plugins/docker-compose
   chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
   ```

## Deploy Workflow

### Standard Update (code changes)

1. Commit and push to `main`. GitHub Actions builds the image automatically and pushes to `ghcr.io/paradoks81/quad`.
2. Wait for the workflow to finish:
   ```bash
   gh run list --workflow=quad-docker.yml --limit=1
   gh run watch --exit-status $(gh run list --workflow=quad-docker.yml --limit=1 --json databaseId --jq '.[0].databaseId')
   ```
3. Deploy:
   ```bash
   ssh unraid 'cd /mnt/user/appdata/quad && docker compose pull && docker compose up -d'
   ```
4. Verify:
   ```bash
   ssh unraid 'cd /mnt/user/appdata/quad && docker compose logs --tail=20 quad'
   ssh unraid 'curl -s http://localhost:3000/health'
   ```

Images are pre-built by GitHub Actions and pushed to `ghcr.io/paradoks81/quad`. Deploy pulls only changed layers (typically a few MB for code changes).

### Pre-flight if no recording is active

```bash
ssh unraid 'curl -s http://localhost:3000/health' | grep -oE '"active":[^,]*'
# Expect: "active":false
```

## File Layout on Unraid

```
/mnt/user/appdata/quad/
├── docker-compose.yml      compose definition (no GPU, CPU-tuned)
├── .env                    secrets + endpoint config (mode 600)
├── service-account.json    Firebase admin creds (mode 600)
├── recordings/             persistent recording output
├── models/                 Whisper model cache (downloads on first /process transcribe)
└── mumble-data/            Mumble server state (sqlite + ini), owned by uid 10000:10000
```

The `mumble-data/` directory must remain owned by uid:gid `10000:10000` because the Mumble container runs as that user and needs read+write on `mumble-server.sqlite`. If you ever copy files into that dir as root, run `chown -R 10000:10000 /mnt/user/appdata/quad/mumble-data` afterward.

## Architecture Notes

### Multi-stage build

```
Build stage (node:22-slim):
  npm ci -> tsc -> produces dist/ + node_modules/

Runtime stage (ghcr.io/paradoks81/quad-base:latest):
  Pre-built: node:22-slim + ffmpeg + python3 + faster-whisper + CUDA libs + zeroc-ice
  Copies dist/ + node_modules/ from build stage
  + knowledge YAMLs + scripts + fonts
```

CUDA libs in the base image are inert on the no-GPU host -- they ship along but never get exercised. Cleaning them out is a future optimization, not load-bearing.

### Base image

Heavy Python + audio dependencies pre-built into a separate base image (`ghcr.io/paradoks81/quad-base`) so code-only deploys are fast (~2-3 min instead of 15-30 min).

- **Base image definition:** `Dockerfile.base`
- **Rebuild base:** `gh workflow run quad-base-docker.yml` (manual trigger, only when Python deps or system packages change)
- **Main Dockerfile** uses `FROM ghcr.io/paradoks81/quad-base:latest` for the runtime stage

### What's in the runtime container

- **Node.js 22** -- bot runtime
- **ffmpeg** -- audio splitting for processing module
- **Python 3 + faster-whisper** -- transcription. Model auto-detects device; on Unraid this means CPU (~5-10x slower than the old 4090; acceptable since `PROCESSING_TRANSCRIBE=false` by default and transcribe is opt-in).
- **Whisper model** (`small` by default) -- downloaded on first use, cached in `./models/`. If CPU latency becomes painful, drop `WHISPER_MODEL=base` in `.env` for a smaller/faster model.

### Volumes

| Mount | Purpose |
|---|---|
| `./recordings:/app/recordings` | Recording output. Persists across container restarts. |
| `./service-account.json:/app/service-account.json:ro` | Firebase credentials. |
| `./models:/root/.cache/huggingface/hub` | Whisper model cache. Downloads on first transcription. |
| `./mumble-data:/data` (mumble service) | Mumble server state. |

### Environment

Configured via `.env`. Not in git. See `.env.example` for the full set.

Key vars:
- `DISCORD_TOKEN` -- bot token (required)
- `RECORDING_DIR` -- defaults to `./recordings`
- `WHISPER_MODEL` -- `tiny`/`base`/`small`/`medium`/`turbo` (default `small`)
- `QUAD_VERSION` -- Docker image tag to pull (default `latest`)
- `FIREBASE_SERVICE_ACCOUNT` -- path to service account JSON
- `MUMBLE_PUBLIC_HOST` -- `mumble.slipgate.me`. **Must be set** -- the bot throws on activation if missing (see `src/modules/mumble/config-listener.ts`).
- `MUMBLE_HOST` -- internal Docker service name (`mumble`) for the bot's ICE connection
- `HEALTH_BIND` -- compose default is `127.0.0.1`. Override only if you need cross-host health probes.

## Mumble player endpoint

Players join Mumble at `mumble.slipgate.me:64738`. Path:

```
client                              Cloudflare DNS
                                    (slipgate.me zone)
mumble://...mumble.slipgate.me ----------> 78.70.76.77 (home WAN IP)
                                                  |
                                                  v
                                          Telia router (192.168.1.1)
                                          Port-forward 64738 TCP+UDP
                                                  |
                                                  v
                                          Unraid (192.168.1.205:64738)
                                                  |
                                                  v
                                          mumble-server container
```

The Cloudflare record is **A, "DNS only"** (grey cloud). Do not enable proxy -- Cloudflare's HTTP proxy breaks Mumble's TCP+UDP voice traffic. Home WAN IP is dynamic; if it ever changes, update the A record (check current with `ssh unraid 'curl -s4 ifconfig.me'`).

Router admin GUI access procedure + credentials are kept in user-local memory, not in this repo (router admin password is not a public-repo artifact).

## Migrating mumbleConfig.serverAddress for existing teams

When `MUMBLE_PUBLIC_HOST` changes (e.g., after a host migration), already-active teams keep the old `serverAddress` in their `mumbleConfig` Firestore docs because `config-listener.ts` only writes that field on the `pending → active` transition. Run the one-shot backfill:

```bash
# Copy the script into the container
scp apps/quad/scripts/migrate-mumble-server-address.mjs unraid:/tmp/migrate-mumble.mjs
ssh unraid 'docker cp /tmp/migrate-mumble.mjs quad-quad-1:/app/migrate-mumble.mjs && rm /tmp/migrate-mumble.mjs'

# Dry run
ssh unraid 'docker exec -w /app quad-quad-1 node /app/migrate-mumble.mjs'

# Apply
ssh unraid 'docker exec -w /app quad-quad-1 node /app/migrate-mumble.mjs --apply'

# Cleanup
ssh unraid 'docker exec quad-quad-1 rm /app/migrate-mumble.mjs'
```

The script reads `MUMBLE_PUBLIC_HOST` from the container's environment (already loaded via compose's `env_file`), so no extra args needed beyond `--apply`.

## Local Development

Local development does NOT use Docker. Use the built-in skills:

- **`/build`** -- Compile TypeScript (`npx tsc --noEmit`)
- **`/dev`** -- Start the bot with ts-node ESM loader

The bot runs directly on Node.js in WSL, loading `.env` from the project root.

## Troubleshooting

### Container won't start

```bash
ssh unraid 'cd /mnt/user/appdata/quad && docker compose logs quad'
```

### Bot is online but not responding to commands

Discord slash commands are registered globally and can take up to 1 hour to propagate. Check logs for "Registered N global command(s)".

### Recordings not appearing

```bash
ssh unraid 'ls -la /mnt/user/appdata/quad/recordings/'
ssh unraid 'cd /mnt/user/appdata/quad && docker compose logs quad | grep -i record'
```

### Mumble server unreachable from outside

Probe in three layers:

```bash
# 1. DNS resolves to home WAN IP
nc -zv mumble.slipgate.me 64738
# 2. Container is listening
ssh unraid 'ss -tulnp | grep 64738'
# 3. Router port-forward is alive
# (if step 2 succeeds but step 1 fails: router rule changed or WAN IP changed)
```

### Transcription is slow / fails

CPU whisper with the `small` model is ~5-10x slower than the previous 4090 setup but should still complete a 30-min session in a few minutes. If it's painfully slow or OOMs, drop the model size:

```bash
ssh unraid 'sed -i "s/^WHISPER_MODEL=.*/WHISPER_MODEL=base/" /mnt/user/appdata/quad/.env'
ssh unraid 'cd /mnt/user/appdata/quad && docker compose restart quad'
```

### Disk space

```bash
ssh unraid 'du -sh /mnt/user/appdata/quad/*'
ssh unraid 'docker image prune -f'
```

### `docker compose` command not found after Unraid reboot

The compose plugin is on tmpfs. Re-install (see "Compose plugin caveat" above) or set up the persistent solution.
