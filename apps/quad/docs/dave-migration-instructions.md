# Migration Instructions for Dave: Moving from qwvoice to dave Account

**Date:** 2026-03-14
**From:** Xerial (system admin)
**To:** Dave (give this entire document to your Claude)

---

## What Changed and Why

I've set up a dedicated `dave` account on pinnaclepowerhouse to replace your use of the `qwvoice` account. This gives you proper self-service access to manage the qwvoice project (Quad bot, Whisper transcription) without needing to ask me for help each time.

**Your new account:** `dave` (uid 9002)
**Your project directory:** `/srv/qwvoice/` (same as before — you have group write access)

### What you CAN do with this account:
- SSH in and get a full bash shell
- `git pull`, edit `.env` files, `scp` files in/out of `/srv/qwvoice/`
- Start, stop, rebuild, and view logs for your containers using `qwvoice-ctl`
- Clean up dangling Docker images
- Manage your own SSH keys

### What you CANNOT do (by design):
- Run `docker` or `docker compose` directly (no docker group membership)
- Use `sudo` for anything other than `qwvoice-ctl`
- Access files outside `/srv/qwvoice/` via containers (volume mount validation)
- Use privileged mode, host networking, or dangerous capabilities in compose files
- Install system packages or modify system configuration
- Access other users' home directories or containers

---

## Step-by-Step Migration

### Step 1: Provide Your SSH Public Key

You need to give Xerial your SSH public key so it can be added to the `dave` account. If you don't have one:

```bash
# On YOUR machine, generate a key (if you don't already have one):
ssh-keygen -t ed25519 -C "dave@pinnaclepowerhouse"

# Show the public key:
cat ~/.ssh/id_ed25519.pub
```

Send the public key (the `.pub` file contents) to Xerial. He'll add it:
```bash
# Xerial runs this on pinnaclepowerhouse:
echo "YOUR_PUBLIC_KEY_HERE" | sudo tee /home/dave/.ssh/authorized_keys
sudo chmod 600 /home/dave/.ssh/authorized_keys
sudo chown dave:dave /home/dave/.ssh/authorized_keys
```

### Step 2: Update Your SSH Config

On your local machine, add or update your SSH config:

```
# ~/.ssh/config
Host pinnaclepowerhouse
    HostName 192.168.86.20
    User dave
    IdentityFile ~/.ssh/id_ed25519
```

If you previously used the `qwvoice` user, change `User qwvoice` to `User dave`.

### Step 3: Test SSH Login

```bash
ssh pinnaclepowerhouse
# You should get a bash shell as dave
whoami  # should print: dave
id      # should show: uid=9002(dave) gid=9002(dave) groups=9002(dave),1002(qwvoice)
```

### Step 4: Verify Project Access

```bash
# You can read and write files in the project directories:
ls -la /srv/qwvoice/quad/
ls -la /srv/qwvoice/docker/

# You can git pull:
cd /srv/qwvoice/quad && git status

# You can edit .env files:
nano /srv/qwvoice/quad/.env  # (or whatever editor you prefer)

# You can scp files:
# (from your local machine)
scp ./somefile pinnaclepowerhouse:/srv/qwvoice/quad/
```

### Step 5: Learn the qwvoice-ctl Command

All container management goes through `qwvoice-ctl`. It's a validated wrapper that runs Docker Compose securely.

**Syntax:** `sudo qwvoice-ctl <project-dir> <command> [args...]`

**Available commands:**

| Command | What it does |
|---------|-------------|
| `up` | Start services (`docker compose up -d`) |
| `down` | Stop services (`docker compose down`) |
| `restart` | Restart services |
| `rebuild` | Rebuild images and start (`docker compose up -d --build`) |
| `logs` | View logs (supports `-f` for follow, `--tail N`) |
| `ps` | Show running services |
| `pull` | Pull latest images |
| `prune` | Remove dangling (unused) images |

**Examples:**

```bash
# Quad bot operations
sudo qwvoice-ctl /srv/qwvoice/quad ps
sudo qwvoice-ctl /srv/qwvoice/quad logs --tail 50
sudo qwvoice-ctl /srv/qwvoice/quad logs -f
sudo qwvoice-ctl /srv/qwvoice/quad rebuild
sudo qwvoice-ctl /srv/qwvoice/quad down
sudo qwvoice-ctl /srv/qwvoice/quad up

# Whisper transcription operations
sudo qwvoice-ctl /srv/qwvoice/docker ps
sudo qwvoice-ctl /srv/qwvoice/docker rebuild
sudo qwvoice-ctl /srv/qwvoice/docker logs --tail 100

# Clean up unused images
sudo qwvoice-ctl /srv/qwvoice/quad prune
```

### Step 6: Typical Deployment Workflow

Here's how a typical update/deploy cycle works:

```bash
# 1. SSH in
ssh pinnaclepowerhouse

# 2. Pull latest code
cd /srv/qwvoice/quad
git pull

# 3. Edit config if needed
nano .env

# 4. Rebuild and restart the container
sudo qwvoice-ctl /srv/qwvoice/quad rebuild

# 5. Check it's running
sudo qwvoice-ctl /srv/qwvoice/quad ps

# 6. Watch the logs
sudo qwvoice-ctl /srv/qwvoice/quad logs -f

# 7. Clean up old images (optional)
sudo qwvoice-ctl /srv/qwvoice/quad prune
```

---

## Security Details (For Your Claude)

The `qwvoice-ctl` wrapper validates every `docker-compose.yml` before executing `up`, `restart`, or `rebuild`. It checks:

1. **Volume mounts:** All bind mount sources must be under `/srv/qwvoice/`. Attempting to mount `/etc`, `/home`, `/root`, or any path outside the project directory will be blocked.

2. **Privileged mode:** `privileged: true` in the compose file will be rejected.

3. **Host networking:** `network_mode: "host"` will be rejected.

4. **Dangerous capabilities:** `SYS_ADMIN`, `SYS_PTRACE`, `ALL`, `NET_ADMIN`, `NET_RAW`, `DAC_OVERRIDE` in `cap_add` will be rejected.

5. **Device mounts:** Any `devices:` entries will be rejected.

If your compose file fails validation, you'll see a clear error message explaining which rule was violated. Fix the compose file and try again.

**Note on GPU access:** Your existing compose files that use the NVIDIA runtime for GPU access should work fine — the validation doesn't block GPU passthrough via the `deploy.resources.reservations.devices` mechanism (the standard Docker Compose GPU method).

---

## What NOT to Do

- **Do not attempt to run `docker` or `docker compose` directly** — you'll get "permission denied" since you're not in the docker group.
- **Do not try to `sudo docker ...`** — sudoers only allows `qwvoice-ctl`.
- **Do not modify files outside `/srv/qwvoice/`** — you won't have write permission.
- **Do not add yourself to the docker or sudo groups** — you can't, since you don't have sudo for user management.

---

## Troubleshooting

### "Permission denied" when running qwvoice-ctl
Make sure you're using `sudo`:
```bash
sudo qwvoice-ctl /srv/qwvoice/quad up
```

### "SECURITY: Compose file blocked due to violations"
Your `docker-compose.yml` contains something the security validator doesn't allow. Read the error message — it will tell you exactly what's blocked. Common causes:
- A volume mount pointing outside `/srv/qwvoice/` (e.g., mounting a host system directory)
- `privileged: true` in the compose file
- Adding dangerous Linux capabilities

### "No docker-compose.yml found"
Make sure you're passing the correct project directory:
```bash
sudo qwvoice-ctl /srv/qwvoice/quad up      # Not /srv/qwvoice/quad/src/
```

### Can't SSH in
Your public key hasn't been added yet. Contact Xerial to add it to `/home/dave/.ssh/authorized_keys`.

### Files created by containers have wrong permissions
New files in `/srv/qwvoice/quad/` and `/srv/qwvoice/docker/` should inherit the `qwvoice` group (setgid bit is set). If a container creates files as root inside a mounted volume, you may need to ask Xerial to fix permissions.

---

## Old qwvoice Account

The old `qwvoice` account still exists and its SSH restrictions are unchanged. Your running containers are NOT affected by this migration — they continue running as before. The `dave` account is purely for your interactive management access.

Once you've confirmed everything works with the `dave` account, the old `qwvoice` SSH access can be decommissioned (Xerial will handle this when you're ready).
