# Unraid backup redesign -- on-box reference + resolved parameters

**Status:** Phase 1 CLOSED 2026-05-20 -- encrypted borg repo on Synology + key escrow verified. Phase 2 can start.
**Spec:** `docs/superpowers/specs/2026-05-19-unraid-backup-redesign-design.md`
**Plan:** `docs/superpowers/plans/2026-05-19-unraid-backup-redesign.md`

This directory holds the version-controlled backup artifacts (the core lesson of
the 2026-05-19 investigation: an unversioned/abandoned backup mechanism is the
failure mode). Secrets never live here -- they live on-box at
`/mnt/user/appdata/borgmatic/borg.env` (mode 600), mirroring the qwiki deploy
pattern.

## Resolved parameters

| Token | Status | Value |
|---|---|---|
| `<SYN_SSH>` | **RESOLVED 2026-05-20** | `borg-unraid@nas1618` (Tailscale MagicDNS; TS IP `100.112.91.72`; LAN fallback `192.168.1.185`). User created (admin group), DSM SSH bound to port 22, firewall allow for Tailscale CGNAT `100.64.0.0/10` (mask `255.192.0.0`) applied; login tested working. |
| `<SYN_TMPDIR>` | **RESOLVED 2026-05-20** | `/volume1/backup/.borgtmp` -- created, `chown borg-unraid:users`, `chmod 700`. (DSM 7 `/tmp` is noexec; private TMPDIR required.) |
| `<SYN_REPO>` | **RESOLVED 2026-05-20** | `/volume1/backup/borg-appdata` -- volume1 confirmed, created, `chown borg-unraid:users`, `chmod 700`. |
| `<PRAGUE_ENV>` | **RESOLVED 2026-05-20** | Windows Task Scheduler -> WSL bash. Trigger: daily 13:00 CET (workstation local time). Action: `wsl -d <distro> bash -lc '<script-path>/prague-pull.sh'`. Script path + WSL distro confirmed at Phase 5. |
| `<PRAGUE_REPO>` | **RESOLVED 2026-05-20** | `/mnt/d/Backups/borg-appdata` in WSL (Windows path `D:\Backups\borg-appdata`; folder already created). Steady-state size ~30-60 GB; D: capacity to be confirmed at first pull. |
| `<HC_PING_URL>` | **RESOLVED 2026-05-20** | Healthchecks.io check "unraid-borgmatic" (period 1d, grace 6h). Value lives in `/mnt/user/appdata/borgmatic/borg.env` (mode 600, root) under key `HC_PING_URL`; borgmatic YAML references as `${HC_PING_URL}`. NOT in git. |
| `<APPRISE_DISCORD>` | **RESOLVED 2026-05-20** | `discord://{id}/{token}` from a Discord channel webhook. Value in `/mnt/user/appdata/borgmatic/borg.env` under key `APPRISE_DISCORD`; YAML references as `${APPRISE_DISCORD}`. Webhook smoke-tested: HTTP 204 on POST. NOT in git. |
| `<ARR_SQLITE>` | RESOLVED | See "SQLite databases" below. |

## Locked dials (all CONFIRMED 2026-05-20)

- Retention: `keep_daily 7`, `keep_weekly 4`, `keep_monthly 6` -- **CONFIRMED 2026-05-20**; no `keep_yearly` tail (6-month horizon deemed sufficient; anything past ~6 months is deleted by design)
- Monitor: Healthchecks.io hosted free tier (NOT on Unraid -- a dead-man's-switch on the watched box cannot report that box down) -- **CONFIRMED 2026-05-20**; one free account, one ping URL goes in `borg.env` and is treated as a secret
- Schedule: `0 3 * * *` (03:00 nightly; offset from the existing 04:00 Mon tar) -- **CONFIRMED 2026-05-20**; first run is invoked manually during waking hours (full baseline ~30-60min), then 03:00 cron takes over for nightly incrementals
- Encryption: `repokey-blake2` (passphrase-only, escrowed) -- **CONFIRMED 2026-05-20**; threat model is "personal homelab, not military secrets, attacker would have to physically steal the Synology"; one passphrase to escrow in password manager + printed paper

## Phase 0 [SSH] discovery findings (2026-05-19)

- Synology reachable: SMB `addr=192.168.1.185`; **Tailscale node `nas1618` =
  `100.112.91.72`** (tailnet `david.larsen.1981@`). Use the Tailscale name for
  `<SYN_SSH>` (works off-LAN, encrypted).
- DB containers running: `qwiki-mariadb`, `qw-oracle-postgres`.
- **Correction vs plan hypothesis 1:** quad is NOT flat-file-only. It has a live
  SQLite at `/mnt/user/appdata/quad/mumble-data/mumble-server.sqlite` (Mumble
  users/channels/ACLs). MUST get a `sqlite_databases` hook entry, else it is
  backed up torn while `mumble-server` runs.
- **Correction vs plan hypothesis 2:** bazarr's DB is nested at
  `bazarr/db/bazarr.db`, not at the appdata root like the other *arr apps.

### SQLite databases (`<ARR_SQLITE>` + quad -- resolved authoritative list)

```
sonarr        /mnt/user/appdata/sonarr/sonarr.db
radarr        /mnt/user/appdata/radarr/radarr.db
prowlarr      /mnt/user/appdata/prowlarr/prowlarr.db
bazarr        /mnt/user/appdata/bazarr/db/bazarr.db
sonarr-anime  /mnt/user/appdata/sonarr-anime/sonarr.db
mumble        /mnt/user/appdata/quad/mumble-data/mumble-server.sqlite
```

(`recyclarr` runs but has no DB -- config-only, covered by the file backup.)

## Phase 0 [SSH] discovery findings (2026-05-20, Synology side)

- SynoCommunity `borgbackup` installed; `borg --version` = **`borg 1.4.3`**.
- borg binary symlink path: **`/usr/local/bin/borg`** -- use this absolute path
  in the Phase 1 `authorized_keys` forced command (`command="/usr/local/bin/borg
  serve --append-only --restrict-to-path /volume1/backup/borg-appdata"`).
- DSM SSH service: bound to port 22 (a prior config had it on a non-standard
  port 33141; reverted to 22 for simplicity -- standard tools work without
  `-p`).
- Firewall: `Tailscale CGNAT (100.64.0.0/10) -> SSH/TCP -> Allow`, placed above
  the `All/All/All -> Deny` catch-all (DSM evaluates top-to-bottom, first-match
  wins). Allows every device on the operator's tailnet without per-device
  edits.
- Shared Folder ACL: `borg-unraid` has Read/Write on the `backup` share (DSM ->
  Control Panel -> Shared Folder -> backup -> Permissions). Defence-in-depth;
  sudo would have bypassed it for the mkdir/chown, but apps that go through
  the share ACL (SMB, File Station) need this explicit grant.
- Both `borg-appdata/` and `.borgtmp/` end up `drwx------ borg-unraid users`
  -- only `borg-unraid` reads/writes. Repo is encrypted at rest regardless.

### Phase 2 version-alignment check (deferred to Phase 2 Task 2.2 Step 4)

The borgmatic container on Unraid (`ghcr.io/borgmatic-collective/borgmatic`)
must bundle a borg that is **repo-format-compatible with Synology's borg
1.4.3**. borg 1.x repos are NOT readable by borg 2.x (and vice versa); a major
version skew would block Phase 1 immediately. Confirm `docker exec borgmatic
borg --version` reports a 1.4.x at Phase 2.

### DB password env-var names (values NOT recorded -- read on-box at Phase 2)

- `qwiki-mariadb` root dump: `MARIADB_ROOT_PASSWORD` in
  `/mnt/user/appdata/qwiki-beta/.env`. (`MW_DB_PASSWORD` is the app user -- not
  used for `mariadb-dump`.)
- `qw-oracle-postgres`: `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` in
  `/mnt/user/appdata/qw-oracle/docker-compose.prod.yml` (and
  `POSTGRES_PASSWORD` in `/mnt/user/appdata/qw-oracle/.env`). Confirm the actual
  `POSTGRES_USER` value at Phase 2 config time (likely `postgres`; `pg_dumpall`
  needs the superuser).

## Phase 1 execution findings (2026-05-20)

- **Repo initialized.** Encryption: `repokey BLAKE2b`. Location:
  `ssh://borg-unraid@100.112.91.72/volume1/backup/borg-appdata`. Repo ID:
  `ee90123fa4a39cad64bde3a00ca3c2f5a2ced69cde91d2307088cd41d1614695`.
- **SSH key.** `/root/.ssh/borg_syn_ed25519` on Unraid (mode 600, root-only),
  fingerprint `SHA256:Tq23hehg7dHeQk0sATk+aY/crVOWCuMweW/HiQrDo6E`. Pubkey
  installed on Synology in `borg-unraid` `~/.ssh/authorized_keys` with
  forced command: `/usr/local/bin/borg serve --append-only --restrict-to-path
  /volume1/backup/borg-appdata` plus `restrict` keyword (no pty / port-fwd /
  agent / X11 / user-rc on this key).
- **Key escrow.** Passphrase + borg-key-export (13-line `BORG_KEY` block)
  stored in operator's Google Drive document on 2026-05-20.
- **Escrow-only restore proof verified 2026-05-20** -- ran
  `borg list /volume1/backup/borg-appdata` directly on Synology (borg
  1.4.3, SynoCommunity) with only the escrowed passphrase, against the
  real repo. Empty archive list returned, exit 0. Proves: passphrase
  alone decrypts the repo's stored key; no Unraid-resident secret needed
  for recovery.

### Plan corrections discovered during Phase 1 execution (APPLY AT PHASE 2)

1. **Repo URL form.** Plan template `ssh://<SYN_SSH>/./<SYN_REPO>` with
   absolute `<SYN_REPO>` substitutes to a *relative-to-home* URL that the
   `--restrict-to-path` forced command correctly rejects (`Repository path
   not allowed: /volume1/homes/borg-unraid/volume1/backup/borg-appdata`).
   **Correct form:** `ssh://<SYN_SSH><SYN_REPO>` -- since `<SYN_REPO>`
   starts with `/`, this gives `ssh://...host//volume1/...` (borg's
   absolute-path double-slash). All Phase 2/5/6/7 repo URLs need this fix.

2. **Container `--network=host` required.** Default bridge networking on the
   borgmatic container cannot reach the Synology at the Tailscale IP
   (`100.112.91.72`); Tailscale routes live on the Unraid host network
   stack. Phase 2 `docker create` must add `--network=host`. (Side-effect:
   docker.sock mount + host network means the container sees host ports
   directly, which is actually what the DB hooks need anyway.)

3. **borgmatic image strips ALL env vars at entrypoint.** The image's
   `[custom-init]` wrapper clears the container env BEFORE invoking the
   user command -- `-e BORG_RSH=...`, `-e BORG_PASSPHRASE=...`, and
   `--env-file borg.env` all arrive empty. **Implications for Phase 2:**
   - The plan's `-e BORG_RSH=...` and `--env-file borg.env` in
     `docker create` won't reach borg/borgmatic. Secrets and SSH options
     must be passed another way.
   - Working pattern (used for Phase 1 init): mount a secret file
     read-only into the container and read it inside `sh -c "..."`
     (`BORG_PASSPHRASE=$(cat /path) borg ..."`); the env set inside `sh
     -c` is preserved into its child process even though the entrypoint
     stripped the outer env.
   - For borgmatic itself: secrets belong in the borgmatic YAML config
     (`encryption_passphrase:` etc.) or use borgmatic's
     `--config-overrides` / passphrase-file pattern. Investigate at
     Phase 2 Task 2.1 before writing the YAML.
   - SSH options for borg go via the `--rsh` CLI flag (bypasses env) or
     `ssh_command:` in the borgmatic YAML, **not** `BORG_RSH`.

4. **Synology home dir POSIX mode broke sshd at first try.** DSM 7
   provisions user homes with POSIX `0777` + an ACL layer doing the real
   gating; sshd's `StrictModes yes` (default) only inspects POSIX and
   silently refused the new key. Fix: `chmod go-w ~` on Synology as
   `borg-unraid`. **If DSM ever resets these perms** (synouser daemon
   periodic sync), key auth will silently break -- add a perms check to
   any Phase 2 health probe.

5. **Container `borg 1.4.4` vs Synology `borg 1.4.3`** -- same major.minor,
   repo-format compatible. Phase 2 Task 2.2 Step 4 version-alignment
   check effectively pre-verified.

## Maintenance (do not let this become the next abandoned plugin)

- **Keep the Synology borg version-aligned with the Unraid borg** (borgmatic
  container's bundled borg). Repo format compatibility depends on it. Check both
  `borg --version` on any borg upgrade either side.
- The `ca.backup2` plugin `.plg` remains installed but dormant; the legacy
  `appdata_backup.sh` stays on disk until Phase 7 Step 4 confirms a clean
  borgmatic cycle. `usb_mirror.sh` is retained permanently (boot backup).

## Still PENDING for Phase 0 completion (operator)

1. ~~Confirm/override the locked dials above.~~ **DONE 2026-05-20** -- all four dials confirmed.
2. ~~Synology: SynoCommunity `borgbackup` + `borg-unraid` user + repo dir + private TMPDIR + firewall + SSH on 22.~~ **DONE 2026-05-20** -- borg 1.4.3 reachable at `ssh borg-unraid@nas1618`; repo + TMPDIR perms locked.
3. ~~State `<PRAGUE_ENV>` + `<PRAGUE_REPO>` (Task 0.3).~~ **DONE 2026-05-20** -- Windows Task Scheduler -> WSL, daily 13:00 CET; repo at `D:\Backups\borg-appdata` (WSL: `/mnt/d/Backups/borg-appdata`).
4. ~~Create Healthchecks check + Discord webhook (Task 0.4).~~ **DONE 2026-05-20** -- both secrets staged in `/mnt/user/appdata/borgmatic/borg.env`; Discord webhook smoke-tested (HTTP 204 + visible message in channel "Captain Hook" bot post 15:16).

**Phase 0 CLOSED 2026-05-20.** Phase 1 can start.

**Phase 1 CLOSED 2026-05-20.** Encrypted repo init verified, key escrowed (Google Drive), escrow-only restore proof passed against the real repo. Phase 2 can start -- begin with the corrections logged in "Plan corrections discovered during Phase 1 execution" above.
