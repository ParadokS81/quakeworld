# Unraid backup redesign -- on-box reference + resolved parameters

**Status:** Phase 0 partial -- `[SSH]` discovery DONE 2026-05-19; `[OP]` items PENDING.
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
| `<PRAGUE_ENV>` | PENDING `[OP]` | How Prague schedules the pull (WSL cron / native / Task Scheduler->WSL). |
| `<PRAGUE_REPO>` | PENDING `[OP]` | Local repo-copy path on Prague NVMe. |
| `<HC_PING_URL>` | PENDING `[OP]` | Healthchecks.io check "unraid-borgmatic" (period 1d, grace 6h). |
| `<APPRISE_DISCORD>` | PENDING `[OP]` | `discord://{WebhookID}/{WebhookToken}` from a Discord channel webhook. |
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
3. State `<PRAGUE_ENV>` + `<PRAGUE_REPO>` (Task 0.3).
4. Create Healthchecks check + Discord webhook (Task 0.4).

Phase 1 starts once items 3 and 4 land.
