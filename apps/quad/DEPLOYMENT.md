# Deployment Guide

Quad ships as a pre-built image and runs on the Unraid box as a three-service compose stack (`quad`, `mumble`, `acme`) from `/mnt/user/appdata/quad/`. Every command in this guide runs from the dev-cockpit container: that directory is mounted read-write at the same path, and `docker` / `docker compose` reach the host through `dev-deploy-proxy`, which allows the full verb set on quad's three containers and refuses everything else. There is no host SSH (fence since 2026-07-28). A `Forbidden` from the proxy is the fence, not a bug: write ops a letter.

## Infrastructure

| | |
|---|---|
| **Host** | Unraid server, Tailscale `100.114.81.91` |
| **Access** | dev-cockpit: appdata mounted rw, docker through `dev-deploy-proxy`, no host root |
| **Containers** | `quad-quad-1` (bot), `mumble-server` (voice server), `acme-sh` (cert sidecar) |
| **Quad directory** | `/mnt/user/appdata/quad/` (compose + config + volumes, no source code) |
| **Recordings** | `/mnt/user/appdata/quad/recordings/` (bind-mounted, survives restarts) |
| **Image** | `ghcr.io/paradoks81/quad:${QUAD_VERSION:-latest}`, built by GitHub Actions on top of `ghcr.io/paradoks81/quad-base` |
| **Mumble player endpoint** | `mumble.slipgate.me:64738` (Cloudflare A record `DNS only` → home WAN IP, then router port-forward to Unraid LAN `192.168.1.205:64738`) |
| **GPU** | None. Whisper transcription falls back to CPU automatically (`device="auto"` in `scripts/transcribe.py`). |
| **CPU/RAM** | 24-core i7-13700, 62GB RAM. Compose limits the bot to 8 CPU / 8GB. |

## Pre-deploy Safety Check

**Before ANY deploy, check for active voice recordings:**

```bash
docker exec quad-quad-1 node -e 'fetch("http://localhost:3000/health").then(r=>r.text()).then(console.log)'
```

If the response shows `"recording": { "active": true }` -- **STOP. Do not deploy.** A team is currently recording and deploying would interrupt their session. Port 3000 is published on the host's loopback only, which the cockpit cannot reach, so the check runs inside the container.

Wait for the recording to finish, then re-check before proceeding.

**Automated enforcement:** a global Claude Code `PreToolUse` hook on the dev plane (dotfiles `claude/hooks/quad-recording-guard.sh`) runs this check before any Bash command that would `up`, `down`, `restart`, `stop`, `kill`, `rm` or `create` on the quad stack (matched by the `appdata/quad` path or the `quad-quad-1` name). It blocks when a recording is live, and also when the container is running but its status cannot be read. If it blocks, ask the operator; do not work around it.

### Container Management

Plain `docker compose` from the stack directory, using the cockpit's own compose binary. The compose project is `quad`, so the bot container is `quad-quad-1`; `mumble` and `acme` carry fixed `container_name`s.

| Action | Command |
|---|---|
| Status | `cd /mnt/user/appdata/quad && docker compose ps` |
| Pull + restart (standard deploy) | `cd /mnt/user/appdata/quad && docker compose pull && docker compose up -d` |
| Restart one service (no pull) | `cd /mnt/user/appdata/quad && docker compose restart quad` |
| Stop the stack | `cd /mnt/user/appdata/quad && docker compose down` |
| Live logs | `cd /mnt/user/appdata/quad && docker compose logs -f quad` |
| Recent logs | `cd /mnt/user/appdata/quad && docker compose logs --tail=100 quad` |
| Edit `.env` | edit `/mnt/user/appdata/quad/.env` in place (mode 600); put a secret value in with `secret-drop env /mnt/user/appdata/quad/.env <KEY>`, never typed inline |

A `mumble-server` restart drops every connected player and any Mumble recording in progress, so the safety check applies to it as much as to the bot.

## Deploy Workflow

### Standard Update (code changes)

1. Commit and push to `main`. GitHub Actions (`.github/workflows/quad-docker.yml`) builds the image on any push touching `apps/quad/` (markdown changes excluded) and pushes it to `ghcr.io/paradoks81/quad` tagged `latest` and `sha-<short sha>`.
2. Wait for the workflow to finish:
   ```bash
   gh run list --workflow=quad-docker.yml --limit=1
   gh run watch --exit-status $(gh run list --workflow=quad-docker.yml --limit=1 --json databaseId --jq '.[0].databaseId')
   ```
3. Run the pre-deploy safety check above.
4. Deploy:
   ```bash
   cd /mnt/user/appdata/quad && docker compose pull && docker compose up -d
   ```
5. Verify:
   ```bash
   cd /mnt/user/appdata/quad && docker compose logs --tail=20 quad
   docker exec quad-quad-1 node -e 'fetch("http://localhost:3000/health").then(r=>r.text()).then(console.log)'
   ```
   Expect `Registered 3 global command(s)` in the log, and the health response listing all seven modules with `"active": false`.

Deploy pulls only changed layers (typically a few MB for code changes). GHCR pulls authenticate through `DOCKER_CONFIG=$HOME/.secrets/docker`, exported by the cockpit's shell init; never `docker login`.

### Pin or roll back

`QUAD_VERSION` in `.env` selects the image tag (`latest` by default). To roll back, set it to the previous `sha-<short sha>` tag and run `docker compose pull && docker compose up -d quad`. Set it back to `latest` afterwards, or the next deploy silently stays pinned.

## File Layout on Unraid

```
/mnt/user/appdata/quad/
├── docker-compose.yml      copy of apps/quad/docker-compose.yml (edit the repo file, then copy it here)
├── .env                    secrets + endpoint config (mode 600)
├── service-account.json    Firebase admin creds (mode 600)
├── recordings/             persistent recording output
├── models/                 Whisper model cache (downloads on first /process transcribe)
├── mumble-data/            Mumble server state (sqlite + ini), owned by uid 10000:10000
├── mumble-certs/           Let's Encrypt cert + key for mumble.slipgate.me, written by the acme sidecar
└── acme-data/              acme.sh state (account, cert archive, crontab) + the live copy of scripts/reload-mumble.sh
```

`mumble-data/`, `mumble-certs/`, `acme-data/` and the session directories under `recordings/` are container-written and container-owned by design (`mumble-data/` must stay `10000:10000`, the Mumble container's user). A write the cockpit is denied anywhere in this tree is an ownership relic: write ops a letter naming the path; never chown or work around it.

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

| Mount | Service | Purpose |
|---|---|---|
| `./recordings:/app/recordings` | quad | Recording output. Persists across container restarts. |
| `./service-account.json:/app/service-account.json:ro` | quad | Firebase credentials. |
| `./models:/root/.cache/huggingface/hub` | quad | Whisper model cache. Downloads on first transcription. |
| `/mnt/cache/appdata/quad/mumble-data:/data` | mumble | Mumble server state. Bound through `/mnt/cache`, not `/mnt/user`: murmur's SQLite must not run over the shfs/FUSE layer (that corrupted Plex's DB on 2026-08-13). Same bytes, different mount route. |
| `/mnt/cache/appdata/quad/mumble-certs:/certs:ro` | mumble | Let's Encrypt cert, written and chowned by the acme service. |
| `./acme-data:/acme.sh`, `./mumble-certs:/certs`, `/var/run/docker.sock` | acme | acme.sh state, cert output, and the Docker socket its reload hook uses to restart `mumble-server`. |

### Environment

Configured via `.env`. Not in git. See `.env.example` for the full set and `DEVELOPMENT.md` for what each module needs.

Key vars:
- `DISCORD_TOKEN` -- bot token (required)
- `RECORDING_DIR` -- defaults to `./recordings`
- `WHISPER_MODEL` -- `tiny`/`base`/`small`/`medium`/`turbo` (default `small`)
- `QUAD_VERSION` -- Docker image tag to pull (default `latest`)
- `FIREBASE_SERVICE_ACCOUNT` -- path to service account JSON
- `MUMBLE_PUBLIC_HOST` -- `mumble.slipgate.me`. **Must be set** -- the bot throws on activation if missing (see `src/modules/mumble/config-listener.ts`).
- `MUMBLE_HOST` -- internal Docker service name (`mumble`) for the bot's ICE connection
- `MUMBLE_ICE_SECRET`, `MUMBLE_SUPERUSER_PASSWORD`, `MUMBLE_SERVER_PASSWORD` -- consumed by the `mumble` service in compose as well as by the bot
- `CF_Token`, `CF_Zone_ID` -- consumed by the `acme` service (see "Mumble TLS certificate")
- `HEALTH_BIND` -- compose default is `127.0.0.1` on the host, which the cockpit cannot reach; hence the `docker exec` form of the health check. Override only if you need cross-host probes.

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

The Cloudflare record is **A, "DNS only"** (grey cloud). Do not enable proxy -- Cloudflare's HTTP proxy breaks Mumble's TCP+UDP voice traffic. Home WAN IP is dynamic; if it ever changes, update the A record. The cockpit shares the home WAN, so `curl -s4 ifconfig.me` shows the current address and `getent hosts mumble.slipgate.me` what DNS says.

Router admin GUI access procedure + credentials are held by the operator outside this repo (router admin password is not a repo artifact).

## Mumble TLS certificate

`mumble.slipgate.me` serves a real Let's Encrypt cert (no self-signed /
hostname-mismatch warnings). Issued + auto-renewed by the `acme` sidecar in
`docker-compose.yml` via Cloudflare DNS-01 (no inbound port 80).

Pieces:
- `acme` service (`neilpang/acme.sh`, `command: daemon`) -- runs its own
  renewal cron, survives reboots (`restart: unless-stopped`).
- `.env` (gitignored) holds `CF_Token` (Cloudflare API token, `Zone:DNS:Edit`
  scoped to the `slipgate.me` zone, no expiry) and `CF_Zone_ID`.
- Cert lands in `./mumble-certs/{fullchain.pem,privkey.pem}`, mounted into the
  mumble service at `/certs:ro`; `MUMBLE_CONFIG_SSLCERT/SSLKEY` point murmur
  at it.
- `scripts/reload-mumble.sh` is acme.sh's `--reloadcmd` (live copy at
  `acme-data/reload-mumble.sh`): after each renewal it chowns the new files
  to murmur's uid (10000) and restarts `mumble-server` via the Docker socket
  so murmur reloads the cert.

Caveat: that renewal restart goes through the Docker socket and so **bypasses
the quad recording-safety hook**. Renewals fire at acme's nightly cron once the
90-day cert enters its renewal window (roughly every 60 days); match-recording
collision is unlikely but possible. Backstops: Let's Encrypt emails the account
address on near-expiry renewal failure; a `.claude/calendar-checks.txt` entry
surfaces a renewal check at session start.

Disaster recovery / re-issue (host migration, lost `acme-data`, revoked token):

```bash
# 1. ensure CF_Token + CF_Zone_ID are in /mnt/user/appdata/quad/.env (secret-drop env)
# 2. restore the reload hook + bring up the sidecar
#    (acme-data/ is root-owned: if the copy is denied, letter to ops with the path)
cp apps/quad/scripts/reload-mumble.sh /mnt/user/appdata/quad/acme-data/reload-mumble.sh
chmod +x /mnt/user/appdata/quad/acme-data/reload-mumble.sh
cd /mnt/user/appdata/quad && docker compose up -d acme
# 3. register + issue (staging first to validate the pipeline, then prod)
docker exec acme-sh acme.sh --register-account -m david.larsen.1981@gmail.com --server letsencrypt_test
docker exec acme-sh acme.sh --issue --dns dns_cf -d mumble.slipgate.me --server letsencrypt_test
docker exec acme-sh acme.sh --register-account -m david.larsen.1981@gmail.com --server letsencrypt
docker exec acme-sh acme.sh --issue --dns dns_cf -d mumble.slipgate.me --server letsencrypt --force
# 4. install + register the reload hook (runs it once: chown + mumble restart)
docker exec acme-sh acme.sh --install-cert -d mumble.slipgate.me --ecc \
  --key-file /certs/privkey.pem --fullchain-file /certs/fullchain.pem \
  --reloadcmd /acme.sh/reload-mumble.sh
```

Verify anytime (issuer must be "Let's Encrypt", subject/SAN
`mumble.slipgate.me`, not "Murmur Autogenerated"):

```bash
echo | openssl s_client -connect mumble.slipgate.me:64738 -servername mumble.slipgate.me 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

## Migrating mumbleConfig.serverAddress for existing teams

When `MUMBLE_PUBLIC_HOST` changes (e.g., after a host migration), already-active teams keep the old `serverAddress` in their `mumbleConfig` Firestore docs because `config-listener.ts` only writes that field on the `pending → active` transition. Run the one-shot backfill:

```bash
# Copy the script into the container
docker cp apps/quad/scripts/migrate-mumble-server-address.mjs quad-quad-1:/app/migrate-mumble.mjs

# Dry run
docker exec -w /app quad-quad-1 node /app/migrate-mumble.mjs

# Apply
docker exec -w /app quad-quad-1 node /app/migrate-mumble.mjs --apply

# Cleanup
docker exec quad-quad-1 rm /app/migrate-mumble.mjs
```

The script reads `MUMBLE_PUBLIC_HOST` from the container's environment (already loaded via compose's `env_file`), so no extra args needed beyond `--apply`.

## Local Development

Local development does not use Docker. See `DEVELOPMENT.md` for the run and type-check commands; `.claude/commands/dev.md` says what a local `.env` may and may not point at.

## Troubleshooting

### Container won't start

```bash
cd /mnt/user/appdata/quad && docker compose logs quad
```

### Bot is online but not responding to commands

Discord slash commands are registered globally and can take up to 1 hour to propagate. Check logs for "Registered N global command(s)".

### Recordings not appearing

```bash
ls -la /mnt/user/appdata/quad/recordings/
cd /mnt/user/appdata/quad && docker compose logs quad | grep -i record
```

### Mumble server unreachable from outside

Probe in three layers:

```bash
# 1. DNS resolves to the home WAN IP, and the public port answers
getent hosts mumble.slipgate.me; curl -s4 ifconfig.me
timeout 5 bash -c 'echo > /dev/tcp/mumble.slipgate.me/64738' && echo "public port open"
# 2. Container is listening (expect 0.0.0.0:64738->64738/tcp and /udp)
cd /mnt/user/appdata/quad && docker compose ps mumble
# 3. Router port-forward is alive
# (if step 2 succeeds but step 1 fails: router rule changed or WAN IP changed)
```

### Player rejected with "Wrong certificate or password"

The server log shows `Rejected connection ...: Wrong certificate or password for existing user`. That one message has two causes. Tell them apart in a copy of `mumble-data/mumble-server.sqlite`: the pinned certificate's SHA-1 is `user_info` key 3.

**Never connected (no `user_info` row, `users.last_active` empty):** the player connected through the squad share link (`join.slipgate.me/<team>`) or typed the address, so the client sent no password. Fix: the player opens their team's Mumble tab in MatchScheduler while logged in as themselves and clicks the first-time "Connect to Mumble" button. That link carries their one-time password. Plast, 2026-10-21.

**New PC or fresh install (a certificate is pinned):** Murmur pins exactly one client certificate per registered account; a password login overwrites it. Quad erases the one-time password from Firestore after the first connect, so the player has no password to type. (Murmur still holds the password; nobody knows it.)

- **Old machine still around (preferred, no server change):** copy its certificate over. Export it with Mumble's Configure → Certificate Wizard and import it on the new machine with the same wizard. Both machines then share one identity. Mumble 1.5 on Windows also keeps the certificate in `%LOCALAPPDATA%\Mumble\Mumble\mumble_settings.json`, key `certificate` (base64 PKCS#12, empty password). Don't import `MumbleAutomaticCertificateBackup.p12` on the new machine: that is the new machine's own rejected certificate. Done for ParadokS's Linux PC on 2026-10-21.
- **Old machine gone:** re-open the first-time link. Set a new password via ICE `updateRegistration`. Write the same password to `mumbleConfig/{teamId}.mumbleUsers.{uid}.tempPassword` with `certificatePinned: false`. MatchScheduler's Mumble tab then shows the first-time Connect button, and the session monitor re-pins on the next connect. Not yet run.

### Transcription is slow / fails

CPU whisper with the `small` model is ~5-10x slower than the previous 4090 setup but should still complete a 30-min session in a few minutes. If it's painfully slow or OOMs, drop the model size:

```bash
sed -i "s/^WHISPER_MODEL=.*/WHISPER_MODEL=base/" /mnt/user/appdata/quad/.env
cd /mnt/user/appdata/quad && docker compose restart quad
```

### Disk space

```bash
du -sh /mnt/user/appdata/quad/*
```

Pruning dangling images is a host-wide operation outside the dev lane; if old `quad` images pile up, ask ops by letter.
