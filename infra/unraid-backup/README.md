# Unraid backup redesign -- on-box reference + resolved parameters

**Status:** Phase 6 restore drill **PASSED 2026-06-12**; Phase 7 cutover **DONE 2026-06-15** -- 3-2-1 live, legacy tar retired. Residuals: **all CLOSED by the 2026-08-04 maintenance bundle** (ops final-PASS letter 2026-08-05) except 6.3 escrow-only restore drill (operator-only, untimed) -- see closeout section at bottom. *(Backfilled 2026-07-20 -- this README lagged the unRAID repo's `docs/server/backup.md` by five weeks; that file is the host-plane ground truth.)*
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

## Phase 2 execution findings (2026-05-20)

- **Container deployed.** `borgmatic` container, image
  `ghcr.io/borgmatic-collective/borgmatic:latest`, borgmatic 2.1.5 / borg
  1.4.4, `--network=host`, `--restart unless-stopped`.
- **First archive shipped.** `ParadokS-2026-05-20T17:46:18.302821`
  (fingerprint `8213f0a945087b6cb558e06a6c3a8d223539a60aacaacbb8473ad148fe0e603b`).
  Duration 17m38s, 202,108 files, 58.43 GB original / 48.54 GB compressed /
  38.74 GB deduplicated, sustained ~55 MB/sec push to Synology over
  Tailscale-tunnelled SSH.
- **Content verified.** Real-archive audit: 3 mariadb dump entries, 3
  postgres dump entries (415 MB pg_dumpall output), 8 sqlite dump
  entries (sonarr / radarr / prowlarr / bazarr / sonarr-anime / mumble);
  qwiki-beta appdata 40,812 paths; qw-oracle appdata 1,764 paths;
  quad/mumble 6 paths. All five exclude classes held with **0 leaks**
  on the real archive (Plex top-Cache, Plex Plug-in Support/Caches,
  borgmatic-self, qwiki mariadb-data datadir, qw-oracle-postgres
  datadir).
- **On-box layout.** `/mnt/user/appdata/borgmatic/` = `{config,ssh,secrets}`
  subdirs (mode 700) plus the now-legacy `borg.env` (replaced by per-file
  secrets; safe to delete later, kept for now as a paper trail). Secrets:
  one file per credential (mode 600, no trailing newline), names match
  the `{credential container <name>}` syntax in YAML AND the FILE__VAR
  env-loader keys passed to the container.
- **Monitoring half-validated.** Two earlier failed runs (credential-in-URL
  + cross-container `--result-file`) fired Apprise->Discord pings
  successfully, evidencing Phase 4 Task 4.2's fail-path end-to-end
  without needing a deliberate induce-failure step. Healthchecks RED
  during the two failures, flipped GREEN on the successful third run.
- **Nightly cron installed.** `0 3 * * * docker exec borgmatic /command/with-contenv borgmatic --verbosity -1`
  -- installed live in root's crontab AND appended (idempotent) to
  `/boot/config/go` for boot survival. Existing weekly tar
  (`0 4 * * 1 appdata_backup.sh`) and USB mirror left in place per plan
  -- they stay through the Phase 7 cutover soak.

### Plan corrections discovered during Phase 2 execution (apply forward)

6. **Refined env-handling model** (Phase 1 correction #3 was incomplete).
   The image's s6-overlay v3 layer:
   - Copies `docker run -e VAR=val` into `/run/s6/container_environment/`
     at startup. Init scripts (`init-envfile`, `init-custom-packages`,
     etc.) use `#!/command/with-contenv bash` and DO see these vars.
   - Image's internal cron service uses with-contenv too, so internal
     cron firings see the env.
   - **External `docker exec borgmatic <cmd>` does NOT load this env.**
     Wrap as `docker exec borgmatic /command/with-contenv <cmd>`.
   - LinuxServer.io `FILE__VAR=/path/to/file` pattern: init-envfile reads
     the file's contents into the env var `VAR`. Pair with a
     `-v /host/secret:/run/secrets/foo:ro` mount + `-e FILE__FOO=/run/secrets/foo`.

7. **`{credential container <name>}` syntax only works for password-shape
   fields.** Verified in borgmatic 2.1.5: resolves correctly inside
   `encryption_passphrase`, `mariadb_databases[*].password`,
   `postgresql_databases[*].password`. Does NOT resolve inside arbitrary
   string fields like `healthchecks.ping_url` or `apprise.services[*].url`
   -- the literal `{credential container ...}` ends up URL-encoded in
   the outbound URL (`https://hc-ping.com/%7Bcredential%20container...`).
   Workaround: `${VAR}` env interpolation for URL-shape fields, with env
   loaded via FILE__VAR + with-contenv wrapper.

8. **`DOCKERCLI=true` required to install docker CLI.** The image's
   `init-custom-packages` script `apk add`'s docker-cli ONLY when this
   env var is set. Without it, DB hooks that need `docker exec` (the
   `container:` option or any custom `*_dump_command: docker exec ...`)
   fail with `[Errno 2] No such file or directory: 'docker'`.

9. **borgmatic 2.x `container:` option supersedes the plan's
   `*_dump_command: docker exec ...` pattern.** With custom `docker exec`
   commands, borgmatic still appends `--result-file
   /tmp/borgmatic-XXX/...`, but that path only exists in the borgmatic
   container -- mariadb-dump running inside qwiki-mariadb cannot write
   there, fails `Errcode: 2 No such file or directory`. The `container:
   <name>` option (added in borgmatic 2.x) handles this correctly:
   borgmatic resolves the container's bridge IP via docker inspect,
   then runs mariadb-dump / pg_dumpall *locally* in the borgmatic
   container against `--host <ip> --protocol tcp`. Dump writes to
   local `/tmp`, no cross-container filesystem issue.

10. **Exclude patterns need `pp:` prefix.** Borg's default `fm` (fnmatch)
    style matches the EXACT path -- bare `/a/b` excludes the directory
    entry itself but NOT `/a/b/file`. Use `pp:` (path-prefix) style:
    matches the dir AND every descendant. Caught via dry-run leak count
    (860 Plex Cache paths leaking with bare pattern; 0 with `pp:`).

11. **Plan's Plex excludes miss `Plug-in Support/Caches/`.** Plex 1.x has
    TWO transient cache locations: top-level `Plex Media Server/Cache/`
    (in plan) and the nested `Plex Media Server/Plug-in Support/Caches/`
    (NOT in plan). Adding the nested one cut 854 paths from the baseline.
    Other `Plug-in Support` siblings (`Data`, `Databases` -- Plex
    metadata SQLite -- `Preferences`, `Metadata Combination`) MUST stay
    in the backup.

12. **Backup MUST exclude the borgmatic config dir itself.** The plan
    sources `/mnt/user/appdata` which contains
    `/mnt/user/appdata/borgmatic/` where the SSH key, encryption
    passphrase, DB credentials, and HC/Apprise secrets all live.
    Storing decryption material inside the encrypted ciphertext is a
    security smell (privilege-escalation if ciphertext + passphrase
    ever co-leak). Added `pp:/mnt/src/appdata/borgmatic` exclude.

13. **Unraid uses root's crontab, NOT `/etc/cron.d/`.** Plan's Task 2.4
    `echo "..." >> /etc/cron.d/borgmatic-cron` would not fire (Unraid's
    cron daemon doesn't read /etc/cron.d). Correct mechanism:
    `(crontab -l 2>/dev/null | grep -v <token>; echo "<line>") | crontab -`.
    Verified against existing entries (cron.daily, appdata_backup.sh,
    usb_mirror.sh, plex-publish-check.sh) -- all live in root's crontab.

14. **Image's own internal cron also fires** at `0 1 * * *` (`borgmatic
    --stats -v 0`). Accepted as harmless duplicate: borg dedup makes
    the 01:00 run cheap, Healthchecks sees pings within its 1-day
    window from either run. If the 01:00 doubling becomes annoying,
    disable via the image's svc-cron s6 service or an empty crontab
    mount. Not done now -- YAGNI.

**Phase 2 CLOSED 2026-05-20.** Phases 3 (folded into 2) and 4
(monitoring -- HC + Discord both already proven by induced + real
failures, only the Homepage tile remains as an [OP] task) effectively
substantially-complete. Next: Phase 5 (Prague offsite pull) + Phase 6
(restore drill -- the real acceptance gate). The two-week parallel
soak before Phase 7 cutover begins now.

## Phase 5 execution findings (2026-05-21)

- **3-2-1 in effect.** Unraid (source) + Synology (copy 1, append-only push
  via Tailscale-tunnelled SSH) + Prague (copy 2, rsync pull over
  Tailscale to local NVMe). Auth model: ONE borg-unraid user on Synology
  with TWO authorized keys -- the original Unraid key uses the borg-serve
  --append-only forced command, the new Prague key uses `restrict`
  keyword only (no forced command, since rsync needs a plain shell).
  Trade-off: Prague has shell-level access to the encrypted repo under
  borg-unraid -- can read/modify (still cannot decrypt without
  passphrase). Threat model accepts this since Prague is the operator's
  own dev laptop on the same tailnet.
- **First pull stats.** rsync 38.79 GB at ~2.8 MB/sec sustained (3h51m,
  01:13 -> 05:04). `borg check --verify-data` 17m on the local NVMe
  copy. Total wall-clock 4h08m end-to-end. Local repo size 37 GB
  matches the Synology repo's deduplicated 38.74 GB (delta is mostly
  rsync transfer overhead + filesystem block rounding).
- **Pull throughput is much lower than push.** Unraid->Synology push
  sustained ~55 MB/sec; Prague->Synology pull only ~2.8 MB/sec. Likely
  cause: Prague-Synology Tailscale path goes via DERP relay (no direct
  endpoint) and/or Prague's uplink is the choke. NOT a blocker --
  steady-state pulls only fetch the day's new chunks (rsync is
  content-addressed on borg's chunks, so deltas are tiny: an O(GB)
  archive becomes an O(100MB) incremental pull). First-pull cost only.
- **Local copy is a perfect mirror.** `borg list /mnt/d/Backups/borg-appdata`
  shows the same archive name (`ParadokS-2026-05-20T17:46:18.302821`) and
  fingerprint as on Synology; `borg info` shows the same Repository ID
  (`ee90123fa4a39cad64bde3a00ca3c2f5a2ced69cde91d2307088cd41d1614695`).
  Reading via the escrowed passphrase from `~/.config/borg/passphrase`
  works end-to-end. Disaster recovery path: even if Unraid AND Synology
  vaporize, Prague + escrow alone get every backed-up file back.
- **borg version skew acceptable.** Prague's apt-installed `borgbackup`
  is 1.2.8, Unraid container is 1.4.4, Synology is 1.4.3. borg 1.2.x
  reads 1.4-created repos via the stable on-disk format -- verified by
  the successful `borg check --verify-data` traversal of every chunk.
  Upgrading Prague to 1.4 is a future hygiene task, not a Phase 5 blocker.

### Plan corrections discovered during Phase 5 execution (apply forward)

15. **`prague-pull.sh` needs explicit SSH key.** The plan's template ran
    `ssh "${SYN_SSH}"` without `-i` -- in the Prague WSL setup the user
    `paradoks` has no default `~/.ssh/id_*`, so the reachability check
    failed silently and the script reported "Synology unreachable"
    despite Tailscale being up. Fix: bake `SSH_KEY=~/.ssh/borg_prague_ed25519`
    constant at script top, reference in both the reachability ssh
    and the rsync `-e ssh -i ...` invocations.

16. **`--rsync-path=/usr/bin/rsync` required for DSM rsync.** DSM's
    `/bin/sh` returns "Permission denied, please try again" (NOT
    "command not found") when invoking bare `rsync` through a
    restrict-keyword'd authorized_keys entry, even though `/usr/bin`
    IS in borg-unraid's PATH and `which rsync` resolves correctly.
    Some interaction between sshd's restrict mode and DSM's command
    lookup. Absolute path bypasses it entirely. The plan didn't
    predict this; baked into the script as a comment.

17. **Reuse-borg-unraid-with-two-keys vs new-user-with-ACL.** The plan
    suggested a separate `borg-prague` user with read-only access,
    requiring either POSIX ACLs (setfacl on a DSM Btrfs volume + new
    default ACL for borg-created files, plus a `--umask` change to the
    Unraid forced-command line so new chunks have group-read) OR a
    new `borgreaders` group with setgid-on-dir for chgrp inheritance.
    Chose the simpler "two keys on one user" approach: ONE user
    (borg-unraid) with TWO authorized keys, the second key restricted
    via `restrict` keyword but with no forced command. Documented the
    Prague-can-shell-as-borg-unraid trade-off above. Future hardening
    if threat model tightens: add `command="/usr/bin/rrsync -ro
    /volume1/backup/borg-appdata"` to the Prague key (requires
    sourcing rrsync onto Synology -- it's a small Perl script, not
    bundled by DSM).

**Phase 5 functionally COMPLETE 2026-05-21.** First pull + verify
passed end-to-end. Task 5.3 (Windows Task Scheduler hookup on Prague)
is operator-only and untimed -- script reads passphrase from
`~/.config/borg/passphrase` so the Task Scheduler action just needs to
invoke `wsl -d <distro> bash -lc '<path>/prague-pull.sh'`. After Task
Scheduler is set up, Phase 5 closes fully and the parallel soak
continues until Phase 7 cutover.

## Phase 6 + Phase 7 closeout (backfilled 2026-07-20)

> Split-brain note: the drill ran and its results were recorded **at the
> time** in the unRAID repo's `docs/server/backup.md` (identical text in the
> pre-repo snapshot; the events predate that repo's git history, created
> 2026-07-10). This README was never updated and kept claiming "Phase 6 is
> next" for five weeks -- which misled a 2026-07-20 cockpit session into an
> "unverified chain" false alarm. Host-plane ground truth lives in the
> unRAID repo; this README mirrors it and can lag.

- **Phase 6 restore drill PASSED 2026-06-12** (acceptance gate cleared):
  - 6.1-shape (MariaDB): day's archive pulled from Synology (440 MB / 12s);
    qwiki restored into a throwaway container; page count 21 == live. PASS.
  - 6.2-shape (Postgres): qw_oracle restored -- 884 MB, 57 tables,
    messages = 728,863 == live. PASS. **Finding: restores MUST use
    `pgvector/pgvector:pg16` -- stock `postgres:16` silently drops the two
    vector tables (55/57 restored).**
  - Bonus: prowlarr appdata tree (657 files) extracted clean. Production
    untouched throughout.
- **Phase 7 cutover DONE 2026-06-15:** legacy CA-backup tar retired --
  removed from root crontab and `/boot/config/go`, with dated revert
  backups (`/boot/config/go.bak-20260615`, verified present 2026-07-20,
  plus `crontab-pre-phase7-20260615.bak`). Drill Thursday, cutover Monday,
  trip right after -- deliberate and documented.

### Residuals closeout (2026-08-05; source: ops maintenance-bundle letters 2026-08-04 + final-PASS 2026-08-05)

- **6.5, Synology half: CLOSED -- and the 07-20 claim above was stale.**
  Weekly `repository`+`archives` checks had been scheduled AND running on
  the Synology since at least the 2026-07-14 config (state-file mtimes
  prove runs). A forced FULL check on 2026-08-04 passed explicitly
  ("no problems found", exit 0).
- **6.3: still OPEN.** Full escrow-only file-restore drill from Prague.
  Operator-only, untimed. The single remaining residual.
- **6.4: CLOSED.** 2026-08-04 reboot after 153 days up: array autostart,
  root crontab re-added by `/boot/config/go` (03:00 borg line present),
  borgmatic auto-started, all 40 containers returned. The first unattended
  03:00 run produced archive `ParadokS-2026-08-05T02:03` on schedule.
- **Internal-cron checkpoint litter: CLOSED.** Internal 01:00 cron silenced
  via comment-only `crontab.txt` in the config mount (svc-cron "Case 3");
  verified empty through a restart AND the full reboot; litter held at
  baseline (2) overnight. Delete that file to restore the image default.
- **Twin-volume churn: CLOSED.** `pp:/mnt/src/appdata/dev/databases`
  exclude live since 2026-08-04, `config validate` clean (backup at
  `borgmatic.yaml.bak-20260804`). Companion fix: phoenix-postgres datadir
  exclude (`pp:/mnt/src/appdata/phoenix-analytics/postgres`, dump hook
  already live since 07-14) granted + live 2026-08-05
  (`borgmatic.yaml.bak-20260805`).
