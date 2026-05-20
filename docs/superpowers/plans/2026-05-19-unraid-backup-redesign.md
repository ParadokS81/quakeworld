# Unraid Backup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is an infrastructure runbook, not application code.** The TDD rhythm maps to: `borgmatic config validate` -> `borgmatic create --dry-run` -> real `borgmatic create` -> `borg check` -> the restore drill (Phase 6) as the acceptance gate. Many steps are **[OP]** (operator-only: Synology DSM UI, password manager, Discord, printing) vs **[SSH]** (Claude-runnable over `ssh unraid`). Each step is marked. Do not skip the marking.

**Goal:** Replace the single-copy, unverified, stop-the-world weekly appdata tar with a borgmatic 3-2-1 system: nightly deduplicated/encrypted/versioned backups from Unraid to an SSH borg repo on the Synology, pulled offsite to the Prague PC on demand, with visible monitoring and a proven restore.

**Architecture:** borgmatic runs as a boot-persistent Docker container on Unraid (docker.sock mounted so it `docker exec`s the DB containers for consistent logical dumps; appdata bind-mounted read-only). It writes to an encrypted borg repo on the Synology reached via `borg serve --append-only` over SSH. Prague rsyncs the repo over Tailscale when awake, read-only, and runs its own `borg check`. Phased cutover keeps the existing weekly tar running until a restore drill passes.

**Tech Stack:** BorgBackup, borgmatic (official container `ghcr.io/borgmatic-collective/borgmatic`), SynoCommunity `borgbackup` package on DSM 7, OpenSSH, Tailscale, Healthchecks (hosted free tier), Apprise->Discord, Unraid `/boot/config/go` persistence pattern.

**Spec:** `docs/superpowers/specs/2026-05-19-unraid-backup-redesign-design.md` (read it first).

---

## Parameters (resolved in Phase 0 -- substitute the real value everywhere the token appears)

| Token | Meaning | How resolved |
|---|---|---|
| `<SYN_SSH>` | SSH target for Synology borg (`user@host`) | Phase 0 Task 0.2 |
| `<SYN_TMPDIR>` | Private noexec-safe TMPDIR for the borg user on Synology | Phase 0 Task 0.2 |
| `<SYN_REPO>` | Absolute repo path on Synology volume | Phase 0 Task 0.2 |
| `<PRAGUE_ENV>` | How the Prague pull runs (WSL cron / native Linux / Task Scheduler->WSL) | Phase 0 Task 0.3 |
| `<PRAGUE_REPO>` | Local repo-copy path on Prague NVMe | Phase 0 Task 0.3 |
| `<HC_PING_URL>` | Healthchecks ping URL | Phase 0 Task 0.4 |
| `<APPRISE_DISCORD>` | Apprise Discord URL (`discord://webhook_id/webhook_token`) | Phase 0 Task 0.4 |
| `<ARR_SQLITE>` | List of *arr SQLite db file paths under `/mnt/user/appdata` | Phase 0 Task 0.5 |

## File Structure (version-controlled artifacts -- monorepo)

The backup config MUST be version-controlled (the core lesson of the 2026-05-19 investigation: an unversioned/abandoned backup mechanism is the failure mode). New directory:

- Create: `infra/unraid-backup/borgmatic.yaml` -- the borgmatic config (no secrets; secrets via env/`.env` on-box, mirroring the qwiki deploy pattern).
- Create: `infra/unraid-backup/prague-pull.sh` -- the Prague-side pull + `borg check` script.
- Create: `infra/unraid-backup/README.md` -- where things live on-box, the version-alignment maintenance task, restore quickstart.
- Modify: `/home/paradoks/projects/unRAID/docs/server/backup.md` -- rewrite for borgmatic at cutover (Phase 7; separate non-git tree).
- Modify: `.claude/calendar-checks.txt` -- replace the interim monthly tarball check (Phase 7).

On-box (NOT in git; secrets): `/mnt/user/appdata/borgmatic/` on Unraid (config copy, ssh key, `borg.env` with passphrase, mode 600).

---

## Phase 0: Discovery & decisions

Produces: every Parameter token resolved and recorded in `infra/unraid-backup/README.md`; dials locked. No backup behavior changes. Existing weekly tar untouched throughout Phase 0-6.

### Task 0.1: Confirm dials (lock the spec's open dials)

- [ ] **Step 1 [OP]:** Confirm defaults or override. Record the chosen values in a scratch note for use below:
  - Retention: `keep_daily 7, keep_weekly 4, keep_monthly 6`
  - Monitor: Healthchecks hosted free tier (not on Unraid -- spec requirement)
  - Schedule: `0 3 * * *` (03:00 nightly; the existing tar is 04:00 Mon -- offset so a Monday runs both without overlap)
  - Encryption: `repokey-blake2` (passphrase-only; simplest; escrowed)
- [ ] **Step 2:** No commit (decisions captured in Phase 0 README task 0.6).

### Task 0.2: Synology borg facts

- [ ] **Step 1 [SSH]:** Confirm Synology reachability and SMB addr already known:

Run: `ssh unraid 'mount | grep -i NAS1618 | head -1'`
Expected: a `//NAS1618/backup ... addr=192.168.1.185` line (the Synology LAN IP).

- [ ] **Step 2 [OP]:** On Synology DSM: install SynoCommunity, then the `borgbackup` package (Borg v1.4.x). Note the exact installed borg version. DSM constraint: the SSH user MUST be in the `administrators` group (DSM only grants SSH to admins).
- [ ] **Step 3 [OP]:** On Synology, create a dedicated admin user `borg-unraid`, enable SSH for it, and create:
  - repo dir on the backup volume, e.g. `/volume1/backup/borg-appdata` -> this is `<SYN_REPO>`
  - a private TMPDIR (DSM 7 `/tmp` is `noexec`, breaks borg): `/volume1/backup/.borgtmp` -> this is `<SYN_TMPDIR>`
- [ ] **Step 4 [SSH]:** Record `<SYN_SSH>` = `borg-unraid@192.168.1.185` (or Tailscale name if the Synology is on Tailscale -- prefer Tailscale if present: `ssh unraid 'tailscale status | grep -i syn'`).
- [ ] **Step 5:** No code; values recorded in Task 0.6.

### Task 0.3: Prague environment

- [ ] **Step 1 [OP]:** State how Prague runs scheduled jobs: WSL with cron/systemd, native Linux, or Windows Task Scheduler invoking a WSL command. Record as `<PRAGUE_ENV>`. (Borg restore at Prague needs a Linux env; WSL satisfies it.)
- [ ] **Step 2 [OP]:** Choose `<PRAGUE_REPO>` (roomy NVMe path, e.g. `/mnt/d/backups/borg-appdata` in WSL or `~/backups/borg-appdata`).
- [ ] **Step 3 [OP]:** Confirm Tailscale is up on Prague and the Synology is reachable: `tailscale ping <synology>` succeeds.

### Task 0.4: Monitoring endpoints

- [ ] **Step 1 [OP]:** Create a Healthchecks.io account + a check "unraid-borgmatic"; copy its ping URL -> `<HC_PING_URL>`. Set its period to 1 day, grace 6 hours.
- [ ] **Step 2 [OP]:** Create a Discord webhook in the target channel; convert to Apprise form `discord://{WebhookID}/{WebhookToken}` -> `<APPRISE_DISCORD>`.

### Task 0.5: Enumerate databases to dump

- [ ] **Step 1 [SSH]:** Confirm the known DB containers:

Run: `ssh unraid 'docker ps --format "{{.Names}}" | grep -E "qwiki-mariadb|qw-oracle-postgres"'`
Expected: both names present.

- [ ] **Step 2 [SSH]:** Find *arr SQLite DBs -> `<ARR_SQLITE>`:

Run: `ssh unraid 'find /mnt/user/appdata/{sonarr,radarr,prowlarr,bazarr,sonarr-anime} -maxdepth 1 -name "*.db" 2>/dev/null'`
Expected: a list like `/mnt/user/appdata/sonarr/sonarr.db`, `.../radarr/radarr.db`, etc. Record exact paths.

- [ ] **Step 3 [SSH]:** Check whether quad keeps a DB or only flat files:

Run: `ssh unraid 'ls -la /mnt/user/appdata/quad | head; find /mnt/user/appdata/quad -name "*.db" -o -name "*.sqlite*" 2>/dev/null'`
Expected: record result. If only flat files -> covered by the file backup, no DB hook needed.

### Task 0.6: Record resolved parameters

- [ ] **Step 1:** Create `infra/unraid-backup/README.md` with the resolved Parameters table, the locked dials, and a "Maintenance: keep Synology borg version-aligned with Unraid borg (repo-format compatibility)" section.
- [ ] **Step 2: Commit**

```bash
mkdir -p infra/unraid-backup
git add infra/unraid-backup/README.md
git commit -m "infra(unraid-backup): Phase 0 -- resolved parameters + locked dials"
```

---

## Phase 1: borg repo on Synology over SSH + key escrow

Produces: an initialized, encrypted, append-only borg repo on the Synology, reachable from Unraid over SSH, with the passphrase escrowed off-box and a proven escrow-only listing.

### Task 1.1: SSH key Unraid -> Synology

- [ ] **Step 1 [SSH]:** Generate a dedicated ed25519 key on Unraid (no passphrase; it is root-only and the repo is encrypted):

Run: `ssh unraid 'test -f /root/.ssh/borg_syn_ed25519 || ssh-keygen -t ed25519 -N "" -f /root/.ssh/borg_syn_ed25519 -C borg-unraid->syn; cat /root/.ssh/borg_syn_ed25519.pub'`
Expected: prints the public key.

- [ ] **Step 2 [OP]:** On Synology, add that public key to `borg-unraid`'s `~/.ssh/authorized_keys` with a restricted append-only forced command:

```
command="borg serve --append-only --restrict-to-path <SYN_REPO>",restrict ssh-ed25519 AAAA... borg-unraid->syn
```

- [ ] **Step 3 [SSH]:** Verify the restricted SSH path works and borg responds:

Run: `ssh unraid 'BORG_RSH="ssh -i /root/.ssh/borg_syn_ed25519" ssh -i /root/.ssh/borg_syn_ed25519 <SYN_SSH> 2>&1 | head -1'`
Expected: borg serve output (not a normal shell) -- e.g. a borg protocol/`Remote: ...` line, proving the forced command is active.

### Task 1.2: Initialize the encrypted repo

- [ ] **Step 1 [SSH]:** Init the repo (TMPDIR set for DSM noexec):

Run:
```
ssh unraid 'BORG_RSH="ssh -i /root/.ssh/borg_syn_ed25519" \
  BORG_PASSPHRASE="<<choose-strong-passphrase>>" \
  TMPDIR=<SYN_TMPDIR> \
  borg init --encryption=repokey-blake2 ssh://<SYN_SSH>/./<SYN_REPO>'
```
Expected: exit 0, no output (or repo-created notice). NOTE the append-only forced command permits `init`.

- [ ] **Step 2 [SSH]:** Confirm repo exists:

Run: `ssh unraid 'BORG_RSH="ssh -i /root/.ssh/borg_syn_ed25519" BORG_PASSPHRASE="..." borg info ssh://<SYN_SSH>/./<SYN_REPO>'`
Expected: `Repository ID:` + `Encrypted: Yes (repokey ...)`.

### Task 1.3: Escrow the key (gate -- do not proceed without this)

- [ ] **Step 1 [SSH]:** Export the repo key:

Run: `ssh unraid 'BORG_PASSPHRASE="..." BORG_RSH="ssh -i /root/.ssh/borg_syn_ed25519" borg key export ssh://<SYN_SSH>/./<SYN_REPO> /root/borg-key-export.txt && wc -l /root/borg-key-export.txt'`
Expected: a non-empty key export file.

- [ ] **Step 2 [OP]:** Store in the password manager: (a) the passphrase, (b) the `borg-key-export.txt` contents, (c) the repo URL. Print (a)+(b) to paper. Then remove the on-disk export: `ssh unraid 'shred -u /root/borg-key-export.txt'`.
- [ ] **Step 3 [OP, escrow-only restore proof]:** From a clean shell with ONLY the escrowed passphrase (simulating Unraid loss), list the repo:

Run (operator workstation, borg installed): `BORG_PASSPHRASE="<from-escrow>" borg list ssh://<SYN_SSH>/./<SYN_REPO>`
Expected: succeeds (empty list is fine -- proves the escrowed passphrase alone can open the repo). If it fails, escrow is wrong -- STOP and fix before any backup is trusted.

- [ ] **Step 4:** No repo artifact; record "key escrowed + escrow-only list verified <date>" in `infra/unraid-backup/README.md`. Commit:

```bash
git add infra/unraid-backup/README.md
git commit -m "infra(unraid-backup): Phase 1 -- Synology borg repo init + key escrow verified"
```

---

## Phase 2: borgmatic on Unraid (boot-persistent) + first real backup

Produces: a validated borgmatic config, a successful first nightly-shaped backup to the Synology repo containing consistent DB dumps + appdata files, running alongside (not replacing) the existing weekly tar.

### Task 2.1: Write the borgmatic config

**Files:** Create `infra/unraid-backup/borgmatic.yaml`

- [ ] **Step 1:** Write the config (substitute Phase 0 tokens; `<ARR_SQLITE>` expands to one `- path:` entry per discovered db):

```yaml
source_directories:
    - /mnt/src/appdata

repositories:
    - path: ssh://<SYN_SSH>/./<SYN_REPO>
      label: synology

exclude_patterns:
    - /mnt/src/appdata/plex/Library/Application Support/Plex Media Server/Cache
    - /mnt/src/appdata/plex/Library/Application Support/Plex Media Server/Logs
    - /mnt/src/appdata/plex/Library/Application Support/Plex Media Server/Codecs
    - /mnt/src/appdata/plex/Library/Application Support/Plex Media Server/Crash Reports
    - /mnt/src/appdata/plex/Library/Application Support/Plex Media Server/Updates
    - /mnt/src/appdata/plex/Library/Application Support/Plex Media Server/Diagnostics
    # DB datadirs excluded -- captured via logical dumps below (a hot file copy is torn)
    - /mnt/src/appdata/qwiki-beta/mariadb-data
    - /mnt/src/appdata/qw-oracle-postgres

keep_daily: 7
keep_weekly: 4
keep_monthly: 6

checks:
    - name: repository
      frequency: 1 week
    - name: archives
      frequency: 1 week

mariadb_databases:
    - name: all
      hostname: 127.0.0.1
      username: root
      password: "${QWIKI_MARIADB_ROOT_PW}"
      password_transport: environment
      mariadb_dump_command: docker exec --env MYSQL_PWD qwiki-mariadb mariadb-dump
      list_command: docker exec --env MYSQL_PWD qwiki-mariadb mariadb

postgresql_databases:
    - name: all
      hostname: 127.0.0.1
      username: postgres
      password: "${QW_ORACLE_PG_PW}"
      pg_dump_command: docker exec --env PGPASSWORD qw-oracle-postgres pg_dumpall
      psql_command: docker exec --env PGPASSWORD qw-oracle-postgres psql

sqlite_databases:
    # one entry per path from <ARR_SQLITE>, e.g.:
    - name: sonarr
      path: /mnt/src/appdata/sonarr/sonarr.db
    - name: radarr
      path: /mnt/src/appdata/radarr/radarr.db
    # ...repeat for prowlarr/bazarr/sonarr-anime per Phase 0 Task 0.5

healthchecks:
    ping_url: "${HC_PING_URL}"

apprise:
    services:
        - url: "${APPRISE_DISCORD}"
          label: discord
    states:
        - fail
```

Notes baked in: `/mnt/src/appdata` is the container's read-only bind of the host `/mnt/user/appdata` (Task 2.2). `pg_dumpall` captures all Postgres DBs+roles. SQLite hook quiesces the db correctly (no torn copy); the *arr datadirs are still file-backed for non-db files, which is fine.

**Phase 0 discovery applied (2026-05-19) -- use `infra/unraid-backup/README.md` as the authoritative resolved list, NOT the illustrative example above.** Corrections vs the hypothesis: (1) add a `sqlite_databases` entry for quad's Mumble DB `/mnt/src/appdata/quad/mumble-data/mumble-server.sqlite` (quad is NOT flat-only); (2) bazarr's db is nested -> `/mnt/src/appdata/bazarr/db/bazarr.db` (not appdata root); (3) `<SYN_SSH>` host = Tailscale `nas1618` (`100.112.91.72`), not the LAN IP. Full resolved sqlite list + env-var names in the README.

- [ ] **Step 2: Commit**

```bash
git add infra/unraid-backup/borgmatic.yaml
git commit -m "infra(unraid-backup): Phase 2 -- borgmatic config (DB hooks via docker exec, Plex+datadir excludes)"
```

### Task 2.2: Deploy the borgmatic container (boot-persistent)

- [ ] **Step 1 [SSH]:** Stage config + key + secrets on-box (root-only):

Run:
```
ssh unraid 'mkdir -p /mnt/user/appdata/borgmatic/{config,ssh}; \
  cp /root/.ssh/borg_syn_ed25519 /mnt/user/appdata/borgmatic/ssh/; \
  chmod 600 /mnt/user/appdata/borgmatic/ssh/borg_syn_ed25519'
```
Then `scp infra/unraid-backup/borgmatic.yaml unraid:/mnt/user/appdata/borgmatic/config/borgmatic.yaml`.

- [ ] **Step 2 [OP]:** Create `/mnt/user/appdata/borgmatic/borg.env` (mode 600) with: `BORG_PASSPHRASE=...`, `QWIKI_MARIADB_ROOT_PW=...`, `QW_ORACLE_PG_PW=...` (pull the two DB passwords from the respective container `.env`/compose).

- [ ] **Step 3 [SSH]:** Create the Unraid Docker container (Unraid auto-starts docker containers across reboot -- this is the persistence mechanism; no `/boot/config/go` Python install needed):

Run:
```
ssh unraid 'docker create --name borgmatic --restart unless-stopped \
  -v /mnt/user/appdata:/mnt/src/appdata:ro \
  -v /mnt/user/appdata/borgmatic/config:/etc/borgmatic.d \
  -v /mnt/user/appdata/borgmatic/ssh:/root/.ssh:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file /mnt/user/appdata/borgmatic/borg.env \
  -e BORG_RSH="ssh -i /root/.ssh/borg_syn_ed25519 -o StrictHostKeyChecking=accept-new" \
  ghcr.io/borgmatic-collective/borgmatic:latest && docker start borgmatic'
```
Expected: container id, then `borgmatic` started. (docker.sock mount is what lets the DB hooks `docker exec` the DB containers.)

- [ ] **Step 4 [SSH]:** Verify borgmatic + borg versions; record borg version for Synology alignment:

Run: `ssh unraid 'docker exec borgmatic borgmatic --version; docker exec borgmatic borg --version'`
Expected: version strings. Cross-check `borg --version` major matches the Synology SynoCommunity borg major (Phase 0 Task 0.2). Mismatch -> resolve before proceeding.

### Task 2.3: Validate -> dry-run -> first real backup (the infra TDD ladder)

- [ ] **Step 1 [SSH] (schema test):**

Run: `ssh unraid 'docker exec borgmatic borgmatic config validate'`
Expected: `Config validation successful` (no schema errors). FIX config and re-commit if it fails.

- [ ] **Step 2 [SSH] (dry-run -- what would be captured, no write):**

Run: `ssh unraid 'docker exec borgmatic borgmatic create --dry-run --verbosity 1 --list 2>&1 | tail -30'`
Expected: lists appdata paths; shows the DB dump hooks firing; NO Plex Cache / `mariadb-data` / `qw-oracle-postgres` datadir paths (excludes working).

- [ ] **Step 3 [SSH] (first real backup):**

Run: `ssh unraid 'docker exec borgmatic borgmatic create --stats 2>&1 | tail -20'`
Expected: archive created; stats show non-trivial deduplicated size; exit 0. (First archive is the full baseline; subsequent are incremental.)

- [ ] **Step 4 [SSH] (verify the archive really contains the DB dumps + appdata):**

Run:
```
ssh unraid 'docker exec borgmatic borg list ssh://<SYN_SSH>/./<SYN_REPO> --last 1 --short; \
  docker exec borgmatic sh -c "borg list ssh://<SYN_SSH>/./<SYN_REPO>::\$(borg list ssh://<SYN_SSH>/./<SYN_REPO> --last 1 --short) | grep -E \"borgmatic/.*databases|qwiki-beta|qw-oracle\" | head"'
```
Expected: an archive name, and entries showing the borgmatic database dump paths + appdata dirs present.

- [ ] **Step 5: Commit** (config may have been fixed in Step 1):

```bash
git add infra/unraid-backup/borgmatic.yaml infra/unraid-backup/README.md
git commit -m "infra(unraid-backup): Phase 2 -- first verified borgmatic backup to Synology (validate+dry-run+real+content check)"
```

### Task 2.4: Schedule it nightly (boot-persistent)

- [ ] **Step 1 [SSH]:** Add a cron entry via the Unraid persistence pattern. Append to `/boot/config/go` (survives reboot) a crontab line that execs the container:

Run:
```
ssh unraid 'grep -q borgmatic-cron /boot/config/go || cat >> /boot/config/go <<"EOF"

# borgmatic nightly (backup redesign 2026-05-19)  # borgmatic-cron
echo "0 3 * * * docker exec borgmatic borgmatic --verbosity -1" >> /etc/cron.d/borgmatic-cron 2>/dev/null
EOF'
```
(If the host uses crontab not cron.d, adapt: `crontab -l | grep -v borgmatic; echo "0 3 * * * docker exec borgmatic borgmatic" | crontab -` written into go-script form. Confirm the host's cron mechanism first with `ssh unraid 'ls /etc/cron.d; crontab -l | tail'`.)

- [ ] **Step 2 [SSH]:** Install the cron entry now (without reboot) and verify:

Run: `ssh unraid 'echo "0 3 * * * docker exec borgmatic borgmatic --verbosity -1" > /etc/cron.d/borgmatic-cron; crontab -l 2>/dev/null | grep -i borg; ls -la /etc/cron.d/borgmatic-cron'`
Expected: the borgmatic schedule present. (Phase 6 Task 6.4 reboot-tests persistence.)

---

## Phase 3 is folded into Phase 2 (retention + checks are in `borgmatic.yaml`); the weekly `borg check` first-fire is verified in Phase 6 Task 6.5. No separate phase needed -- YAGNI.

---

## Phase 4: Monitoring proven (loud on failure, visible when healthy)

Produces: a green Healthchecks state on success, a real Discord alert on induced failure, and a Homepage tile.

### Task 4.1: Confirm success ping

- [ ] **Step 1 [SSH]:** Trigger a run and confirm the Healthchecks ping:

Run: `ssh unraid 'docker exec borgmatic borgmatic --verbosity 1 2>&1 | grep -i healthchecks'`
Expected: a line showing the success ping was sent.
- [ ] **Step 2 [OP]:** Healthchecks dashboard shows the check green / "up".

### Task 4.2: Induce a failure, confirm Discord

- [ ] **Step 1 [SSH]:** Temporarily break a DB credential (in-memory only -- pass a bad env override) and run:

Run: `ssh unraid 'docker exec -e QWIKI_MARIADB_ROOT_PW=wrong borgmatic borgmatic --verbosity 1; echo "exit=$?"'`
Expected: non-zero exit; borgmatic reports the mariadb hook failure.
- [ ] **Step 2 [OP]:** Confirm a Discord message arrived in the webhook channel, and Healthchecks shows red/down.
- [ ] **Step 3 [SSH]:** Re-run normally to confirm green restored: `ssh unraid 'docker exec borgmatic borgmatic --verbosity 0; echo exit=$?'` -> `exit=0`.

### Task 4.3: Homepage tile

- [ ] **Step 1 [OP]:** Add a Healthchecks widget (or Uptime Kuma) to Homepage pointing at the "unraid-borgmatic" check. Confirm the tile renders the up/down state.
- [ ] **Step 2: Commit** doc note:

```bash
git add infra/unraid-backup/README.md
git commit -m "infra(unraid-backup): Phase 4 -- monitoring verified (HC green, Discord on fail, Homepage tile)"
```

---

## Phase 5: Prague offsite pull

Produces: a Prague-side script that pulls the repo over Tailscale when awake and runs its own `borg check`; an offsite copy proven to catch up after downtime.

### Task 5.1: Prague pull script

**Files:** Create `infra/unraid-backup/prague-pull.sh`

- [ ] **Step 1:** Write the script:

```bash
#!/usr/bin/env bash
# Prague offsite pull: rsync the immutable borg repo from Synology, then verify.
# Repo is content-addressed chunks -> plain rsync is incremental, safe, resumable.
# Prague treats its copy READ-ONLY: only borg check / restore, never borg create.
set -euo pipefail

SYN_SSH="<SYN_SSH>"
SYN_REPO="<SYN_REPO>"
LOCAL="<PRAGUE_REPO>"
LOG="${HOME}/.local/state/prague-borg-pull.log"
mkdir -p "$(dirname "$LOG")" "$LOCAL"

ts() { date '+%F %T'; }
echo "$(ts) pull start" >> "$LOG"

if ! tailscale ping -c1 "${SYN_SSH#*@}" >/dev/null 2>&1; then
  echo "$(ts) synology unreachable (prague offline path) -- will catch up next run" >> "$LOG"
  exit 0
fi

rsync -a --delete --partial --info=stats1 \
  -e ssh "${SYN_SSH}:${SYN_REPO}/" "${LOCAL}/" >> "$LOG" 2>&1

# Independent integrity check of the OFFSITE copy (read-only repo access)
if BORG_PASSPHRASE_FD= borg check --verify-data "${LOCAL}" >> "$LOG" 2>&1; then
  echo "$(ts) pull OK + borg check passed" >> "$LOG"
else
  echo "$(ts) BORG CHECK FAILED on offsite copy" >> "$LOG"
  exit 1
fi
```
(borg on Prague reads the passphrase from `~/.config/borg/passphrase` via `BORG_PASSPHRASE` exported by the scheduler env, or `borg` keyfile -- operator wires the passphrase from escrow in Step 3.)

- [ ] **Step 2: Commit**

```bash
git add infra/unraid-backup/prague-pull.sh
git commit -m "infra(unraid-backup): Phase 5 -- Prague offsite pull + offsite borg check script"
```

### Task 5.2: Install + first pull on Prague

- [ ] **Step 1 [OP]:** On Prague (`<PRAGUE_ENV>`): install `borg` + `rsync` + `tailscale`; place `prague-pull.sh` (substituted tokens), `chmod +x`; export `BORG_PASSPHRASE` from escrow in the scheduler environment (not in the repo).
- [ ] **Step 2 [OP]:** Add the SSH pubkey of the Prague user to the Synology `borg-unraid` (or a read-only `borg-prague`) `authorized_keys` -- for the Prague pull, use a NON-append-only, read-restricted key or simply rsync read access to `<SYN_REPO>`; do NOT reuse the Unraid append-only forced-command key.
- [ ] **Step 3 [OP]:** Run `./prague-pull.sh`; tail the log.
Expected: rsync transfers the repo; `borg check --verify-data` passes; log ends "pull OK + borg check passed".

### Task 5.3: Schedule + offline-catch-up test

- [ ] **Step 1 [OP]:** Schedule per `<PRAGUE_ENV>` (e.g. cron `@hourly`, or on-wake). The script self-skips when the Synology is unreachable.
- [ ] **Step 2 [OP, offsite catch-up test]:** Leave Prague off/asleep across at least one nightly Unraid backup. Power on; run (or let the schedule run) `prague-pull.sh`.
Expected: a single run reconciles the missed archive(s); `borg check` passes; `borg list <PRAGUE_REPO>` shows the archive(s) created while Prague was off. This proves the intermittent-target design.
- [ ] **Step 3: Commit** doc note in README (offsite proven + date).

---

## Phase 6: Acceptance gate -- the restore drill

**Nothing is retired until every check in this phase passes.** A backup never test-restored is unverified.

### Task 6.1: Restore the wiki MariaDB into a scratch container

- [ ] **Step 1 [SSH]:** Extract the latest MariaDB dump from the repo:

Run:
```
ssh unraid 'docker exec borgmatic sh -c "cd /tmp && borg extract ssh://<SYN_SSH>/./<SYN_REPO>::\$(borg list ssh://<SYN_SSH>/./<SYN_REPO> --last 1 --short) \"*mariadb_databases*\" && find /tmp -name \"*.sql*\" -path \"*mariadb*\""'
```
Expected: prints the extracted MariaDB dump file path.

- [ ] **Step 2 [SSH]:** Spin a scratch MariaDB, load the dump, assert a known wiki table exists:

Run:
```
ssh unraid 'docker run -d --name mariadb-restore-test -e MARIADB_ROOT_PASSWORD=test mariadb:latest; sleep 25; \
  docker exec -i mariadb-restore-test sh -c "mariadb -uroot -ptest" < <(docker exec borgmatic cat <dump-path-from-step-1>); \
  docker exec mariadb-restore-test mariadb -uroot -ptest -e "SHOW DATABASES; SELECT COUNT(*) FROM <wikidb>.page;"'
```
Expected: the wiki database lists; `page` row count > 0 (the wiki content is really restorable).

- [ ] **Step 3 [SSH]:** Teardown: `ssh unraid 'docker rm -f mariadb-restore-test'`.

### Task 6.2: Restore a Postgres (oracle) dump

- [ ] **Step 1 [SSH]:** Same pattern: extract the `*postgresql_databases*` dump, load into a scratch `postgres:latest`, assert a known oracle table/row count > 0. Teardown the scratch container.
Expected: oracle schema present, row count > 0.

### Task 6.3: Restore-from-escrow-only (total-Unraid-loss simulation)

- [ ] **Step 1 [OP]:** On a machine that is NOT Unraid, with ONLY the escrowed passphrase/key + repo URL: `borg list` + `borg extract` one small appdata path.
Expected: succeeds without any Unraid-resident secret. (Re-confirms Phase 1 Task 1.3 still holds against a real archive.)

### Task 6.4: Reboot-persistence test

- [ ] **Step 1 [OP]:** Reboot Unraid (operator-scheduled; this is disruptive). After boot:

Run: `ssh unraid 'docker ps --format "{{.Names}}" | grep borgmatic; crontab -l 2>/dev/null | grep -i borg || ls -la /etc/cron.d/borgmatic-cron'`
Expected: `borgmatic` container running AND the cron entry present (the `/boot/config/go` line re-installed it). If the cron is missing, fix the go-script entry before cutover.

### Task 6.5: First scheduled weekly check fires

- [ ] **Step 1 [SSH]:** Force the weekly checks once to prove they work:

Run: `ssh unraid 'docker exec borgmatic borgmatic check --verbosity 1 2>&1 | tail -10'`
Expected: repository + archives checks PASS.

- [ ] **Step 2: Commit** the acceptance record:

```bash
git add infra/unraid-backup/README.md
git commit -m "infra(unraid-backup): Phase 6 -- restore drill + escrow + reboot + check all PASS (acceptance gate cleared)"
```

---

## Phase 7: Cutover -- retire the old tar, reclaim space, fix the docs

Only after Phase 6 fully passes AND the spec's ~3-4 week parallel-run soak has elapsed with green Healthchecks.

### Task 7.1: Stop the old weekly tar

- [ ] **Step 1 [SSH]:** Remove the old cron entries (custom tar + the script stays on disk as fallback for one more cycle):

Run: `ssh unraid 'crontab -l | grep -v appdata_backup.sh | grep -v usb_mirror.sh | crontab - ; crontab -l'`
Expected: the `0 4 * * 1 appdata_backup.sh` line gone. (Keep `usb_mirror.sh` -- it backs up `/boot`, still wanted. Re-add a `0 4 * * 1 usb_mirror.sh` line.) Re-verify: `crontab -l | grep usb_mirror`.

- [ ] **Step 2 [SSH]:** Update `/boot/config/go` so the old tar cron is not re-added on reboot but `usb_mirror` still is. Show the diff before/after:

Run: `ssh unraid 'grep -n -E "appdata_backup|usb_mirror|borgmatic" /boot/config/go'`
Expected: borgmatic line present, appdata_backup line removed/commented, usb_mirror line present.

### Task 7.2: Reclaim Synology space

- [ ] **Step 1 [SSH]:** Confirm the borg repo has >= 3 weeks of healthy archives first:

Run: `ssh unraid 'docker exec borgmatic borg list ssh://<SYN_SSH>/./<SYN_REPO> --short | wc -l'`
Expected: a count consistent with daily runs over the soak period.

- [ ] **Step 2 [OP]:** Delete the old nested tarballs to reclaim space (operator-confirmed destructive op):

Run: `ssh unraid 'du -sh /mnt/remotes/NAS1618_backup/unraid-backup/*/; rm -rf /mnt/remotes/NAS1618_backup/unraid-backup/????-??-??@??.??'`
Expected: the old `CA_backup.tar.gz` folders gone; `df -h /mnt/remotes/NAS1618_backup` shows reclaimed space. (Leave `unraid-backup/flash/`.)

### Task 7.3: Fix the documentation (close the loop on the original investigation)

- [ ] **Step 1:** Rewrite `/home/paradoks/projects/unRAID/docs/server/backup.md` Layer-2 section to describe the borgmatic system (repo on Synology over SSH, nightly, dedup/versioned, Prague pull, Healthchecks, `borg check`, key escrow, restore = `borg extract`). Remove the now-defunct nested-tarball description. (Separate non-git tree -- edit only; operator commits if/when that tree is versioned.)
- [ ] **Step 2:** Replace `.claude/calendar-checks.txt` line 8 (the interim monthly nested-tarball health check) with a borgmatic-era line: a monthly spot-check that Healthchecks shows green AND `borg list --last 1` on the Synology repo is < 36h old AND the Prague copy's last `borg check` passed.

```
2026-06-19 | Backup health (monthly, borgmatic era) -- ssh unraid 'docker exec borgmatic borg list ssh://<SYN_SSH>/./<SYN_REPO> --last 1 --format "{time}{NL}"' (expect < ~36h old) + confirm Healthchecks "unraid-borgmatic" green + confirm Prague prague-pull.sh log tail shows "borg check passed". On PASS push +1mo. Full design: docs/superpowers/specs/2026-05-19-unraid-backup-redesign-design.md
```

- [ ] **Step 3: Commit**

```bash
git add .claude/calendar-checks.txt infra/unraid-backup/README.md
git commit -m "infra(unraid-backup): Phase 7 -- cutover; retire weekly tar, reclaim Synology space, docs+calendar updated to borgmatic era"
```

- [ ] **Step 4 [SSH]:** After one more clean cycle, delete the dormant custom script: `ssh unraid 'rm /boot/config/plugins/ca.backup2/appdata_backup.sh*'` (operator-confirmed; `usb_mirror.sh` stays).

---

## Self-Review (performed against the spec)

**Spec coverage:** 3-2-1 (Phases 1/2/5) ✓; offsite incl. Plex (excludes are Plex-cache only + DB datadirs) ✓; incremental+history (borg + keep_* in 2.1) ✓; no stop-the-world (docker exec DB hooks, no container stop anywhere) ✓; verified (`borg check` 2.1/6.5 + Prague check 5.1) ✓; visible (Phase 4 HC+Discord+Homepage; monitor off-Unraid per 0.4) ✓; maintained tooling + version-alignment task (0.6 README, 2.2 Step 4) ✓; key escrow as gate (1.3, re-tested 6.3) ✓; phased cutover beside existing tar (Phases 2-6 parallel, Phase 7 retire) ✓; restore drill = acceptance gate (Phase 6) ✓; USB/flash untouched (7.1 keeps usb_mirror) ✓; Synology-98%-full mitigations (7.2 reclaim; 0.2/2.3 dedup measured) ✓.

**Placeholder scan:** No "TBD/TODO/handle errors". Tokens (`<SYN_SSH>` etc.) are explicitly defined parameters resolved by named discovery commands in Phase 0, not vague placeholders. `<ARR_SQLITE>` expansion shown by example with explicit "repeat per Task 0.5".

**Type/consistency:** Repo URL form `ssh://<SYN_SSH>/./<SYN_REPO>` used identically in Phases 1/2/6/7. Container name `borgmatic` and DB container names `qwiki-mariadb`/`qw-oracle-postgres` consistent across hooks (2.1), verify (2.3), restore (6.1/6.2). `<PRAGUE_REPO>` consistent in 5.1/5.2/5.3. Mount `/mnt/src/appdata` consistent between exclude_patterns, sqlite paths, and the 2.2 bind.

---

## Execution Handoff

This is phased infrastructure with operator-only steps (Synology DSM, password manager, Discord, a deliberate Unraid reboot) and a multi-week parallel soak. It is not a code plan a subagent can grind start-to-finish; it is operator-paced with Claude executing the `[SSH]` steps and verifying.
