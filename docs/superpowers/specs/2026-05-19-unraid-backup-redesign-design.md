# Unraid backup redesign -- design spec

**Date:** 2026-05-19. **Status:** Design approved (brainstorming), pending spec review -> writing-plans.

## Context

A routine calendar check ("qwiki-v1-beta Phase 1 V6 verification") triggered a backup
investigation on 2026-05-19. Findings:

- The current backup is **healthy** (a 44 GB `CA_backup.tar.gz` of 2026-05-18 04:00
  exists and contains `./qwiki-beta/mariadb-data/*`). The "no backup" alarm was a
  false negative from a verification command globbing one directory level too
  shallow. That bug is already fixed (separate commit `80218de0` + `unRAID/docs/server/backup.md`).
- The investigation exposed real structural weaknesses in the *strategy* (not the
  current run): single-copy retention (`KEEP_DAYS=3` + weekly cron => exactly one
  copy), `verify:"no"` (no integrity check), no offsite copy ("Layer 3 offsite"
  has been "planned" indefinitely), a 17-minute stop-the-world weekly window, a
  44 GB full re-sent every run (no incrementals), and a 98%-full Synology.

The operator asked for a sound, efficient backup strategy. This spec is the
agreed redesign.

## Goals

- **3-2-1**: 3 copies (live appdata on Unraid + Synology repo + Prague repo), 2
  locations (Hyllie + Prague), 1 offsite (Prague).
- **Offsite copy** of everything, including full Plex metadata (regeneration is a
  real recovery-time cost, not zero).
- **Incremental** (only changed data moves; no 44 GB re-send) with **versioned
  history** (restore a past state, not just "latest").
- **No stop-the-world**: databases captured consistently without stopping
  containers.
- **Verified**: integrity checked on a schedule, both ends.
- **Visible**: backup health surfaced on the operator's homelab dashboard;
  failure pings Discord. The "didn't know it was broken for a year" failure mode
  must be structurally impossible.
- **Maintained tooling**, minimal bespoke glue (the abandoned `ca.backup2`
  plugin -> custom script lineage is the cautionary tale).

## Non-goals

- Replacing the USB boot mirror or the `flash/` rsync -- both work, untouched.
- Backing up media libraries (movies/series/music) -- out of scope; this is
  appdata + flash only, same as today.
- Cloud backup backend -- the offsite target is the Prague PC over Tailscale.
  (rclone/B2 remains a future option; not in this design.)
- Migrating off Unraid/Synology hardware.

## Engine decision

**borgmatic** (BorgBackup + the borgmatic orchestrator). Chosen over Kopia for
this use case on these points:

1. **Native database hooks** (`mariadb_databases`, `postgresql_databases`,
   `sqlite_databases`): consistent logical dumps streamed straight into the
   deduplicated repo, declaratively in YAML, maintained upstream. Kopia would
   require a hand-written, self-maintained pre-snapshot dump script -- exactly
   the bespoke glue that caused the original problem.
2. **Built-in outward monitoring** (Healthchecks, Uptime Kuma, ntfy, Apprise,
   ...): borgmatic is designed to push run status to the services a homelab
   dashboard aggregates. Kopia's visibility is its own separate UI, redundant
   once Homepage exists and not dashboard-native.
3. **borg append-only repo**: hardening for the offsite leg against a
   compromised/buggy client rewriting history.

Soft points: composable (one YAML + cron, no daemon), deepest track record in
the Linux-server-appdata-plus-databases niche. Kopia's edges (speed on large
data, native cloud backends, all-in-one UI) are neutralised by this topology
(overnight on an always-on box; SSH/LAN target; dashboard coming anyway).

Engine references (verified 2026-05-19):
- borgmatic database hooks: https://torsion.org/borgmatic/how-to/backup-your-databases/
- borgmatic monitoring: https://torsion.org/borgmatic/how-to/monitor-your-backups/
- Kopia/restic/borg comparison: https://selfhosting.sh/compare/kopia-vs-restic/

## Architecture

### Topology

```
Unraid (always-on, Hyllie)                 Synology (always-on, Hyllie)        Prague PC (intermittent)
  /mnt/user/appdata  --[borgmatic]-->  borg repo (over SSH/LAN)  --[pull on demand]-->  borg repo copy
  + DB logical dumps                   primary copy, encrypted              offsite copy, encrypted
                                       weekly borg check                    own weekly borg check
```

- **Primary repo lives on the Synology, reached over SSH** (the Synology runs
  borg; Unraid's borgmatic talks to it via `ssh://`). Not over the CIFS mount:
  borg on a network filesystem risks repo corruption on a mount drop and has
  imperfect SMB locking. borg-over-SSH is borg's robust transport. This adds a
  one-time Synology setup **and a small ongoing maintenance surface** (the
  Synology borg must stay version-aligned with the Unraid borg for repo-format
  compatibility; its container/package gets updated occasionally). Accepted
  trade: a visible maintenance task in exchange for removing a silent
  data-integrity risk -- the correct trade for a backup.
- **Prague pulls** the repo from the Synology over Tailscale when it is awake
  (it is a workstation, frequently off overnight). Pull is incremental (the repo
  is content-addressed immutable chunks) and resumable; an extended Prague
  outage just means the next pull catches up. Prague never needs to be up at a
  specific time.

### Data classes

- **Class A -- live databases** (wiki `qwiki-mariadb`, oracle
  `qw-oracle-postgres`, the *arr apps' SQLite, any other containerised DB):
  captured via borgmatic's database hooks as consistent logical dumps streamed
  into the repo. For containerised DBs the dump runs via `docker exec`
  (exact mechanism per the implementation plan). The raw DB data directories
  are **excluded** from the file backup -- a hot copy of those is torn and
  unrestorable; the logical dump is the source of truth. No container is
  stopped.
- **Class B -- large live-safe blobs** (Plex metadata, quad recordings, file-
  based app state): backed up as files, deduplicated. A file caught mid-write
  self-heals next run. Plex's regenerable subdirs (Cache, Logs, Codecs, Crash
  Reports, Updates, Diagnostics) stay excluded, same set as the current
  `BackupOptions.json`.
- **Class C -- small static configs** (`LocalSettings.php`, compose files,
  `.env`, nginx confs, ...): plain files. `.env` carries secrets -- safe here
  because the borg repo is encrypted at rest.

### Schedule and retention

- borgmatic runs **nightly on Unraid** (reusing the ~04:00 slot). RPO drops from
  ~1 week to ~1 day for everything.
- Retention (proposed default, tunable): `keep_daily: 7`, `keep_weekly: 4`,
  `keep_monthly: 6`. `prune` + `compact` after each run. This is the fix for
  single-copy fragility.

### Integrity

- borgmatic `checks` run a **weekly `borg check`** (repository + archives) on
  the primary.
- Prague runs its **own `borg check`** on its pulled copy -- independent
  verification of the offsite copy. Together these replace the old
  `verify:"no"` gap.

### Monitoring and visibility

- borgmatic pings **Healthchecks** (purpose-built dead-man's-switch for "did
  this scheduled job run") on start/success/failure. Uptime Kuma is an
  acceptable alternative; the implementation plan picks one (default:
  Healthchecks). **Placement matters: the monitor must not live only on
  Unraid** -- a dead-man's-switch hosted on the box it watches cannot report
  that box being down. Default to the hosted Healthchecks free tier (or a
  monitor on the Synology / Prague), so a total Unraid outage still alerts.
- borgmatic fires a **Discord notification via Apprise on failure** (the
  operator lives in Discord; this is the loud-on-failure path).
- **Homepage** (gethomepage.dev, the operator's intended homelab dashboard)
  shows the Healthchecks/Uptime-Kuma tile. Green = healthy at a glance; red or
  a Discord ping = look now. This makes the silent-failure mode structurally
  impossible.

### Encryption and key escrow

- The repo is encrypted (`repokey-blake2` or `keyfile` -- plan decides). This
  is why `.env` secrets can safely replicate to Prague.
- **Key escrow is a first-class step, not an afterthought.** An encrypted
  backup whose only key is on the dead Unraid box is not a backup. The
  passphrase and (if `keyfile`) the key file are stored in the operator's
  password manager and printed to paper. The spec/plan includes an explicit
  "verify you can decrypt from escrow alone" acceptance step.

## Data flow

**Nightly (Unraid, automated):**
1. borgmatic starts; pings Healthchecks "start".
2. Database hooks dump Class A DBs (via `docker exec`) and stream them into the
   borg archive.
3. borg creates an archive of Class B + C files (Class A datadirs excluded)
   to the Synology repo over SSH; only changed chunks transfer.
4. `prune` + `compact` apply the retention policy.
5. Weekly: `borg check` runs.
6. borgmatic pings Healthchecks "success", or fires Discord-via-Apprise on any
   failure (and Healthchecks flips red by absence of the success ping).

**On demand (Prague, when awake):**
1. A scheduled job on Prague (cron / WSL systemd / Task Scheduler) connects to
   the Synology over Tailscale.
2. Pulls the repo with `rsync` over SSH (default: the repo is immutable
   content-addressed chunks, so a plain `rsync` of the repo directory is
   incremental, safe, and resumable; `borg`-native remote is the alternative
   the plan may pick instead). Prague treats its copy as **read-only** -- it
   never runs `borg create` against it, only `borg check` / restore.
3. Runs `borg check` on the local copy; surfaces result (log / optional ping).

## Components and responsibilities

| Component | Lives on | Responsibility |
|---|---|---|
| borgmatic config (one YAML) | Unraid | Source selection, exclusions, DB hooks, retention, checks, monitoring hooks |
| borg | Synology | `borg serve` over SSH; holds the primary encrypted repo |
| Prague pull job | Prague | Opportunistic incremental pull of the repo + local `borg check` |
| Healthchecks (or Uptime Kuma) | Unraid (or hosted) | Receives borgmatic pings; dead-man's-switch |
| Homepage | Unraid | Surfaces backup-health tile |
| Key escrow | Password manager + paper | Repo passphrase/keyfile, off-box |
| Existing USB mirror + flash rsync | Unraid -> USB / Synology | Unchanged |

## Failure handling and edge cases

- **Prague offline (expected, frequent):** primary repo on Synology is
  unaffected; offsite RPO degrades gracefully; next pull catches up. Not a
  failure.
- **Synology unreachable / SSH down at run time:** borgmatic run fails loudly
  (Healthchecks red + Discord). Local appdata is untouched; next nightly run
  retries. No silent loss.
- **Repo corruption:** weekly `borg check` on both ends detects it early.
  Recovery: the other copy + versioned history. If `borg check` ever flags
  real corruption, that is the signal to revisit transport hardening.
- **Synology 98% full:** a deduplicated, compressed borg repo with history is
  far smaller than even one current 44 GB weekly full. Mitigations, in the
  plan: (a) measure the first archive size before cutover, (b) bounded
  retention, (c) reclaim major space by deleting the old
  `unraid-backup/<date@time>/CA_backup.tar.gz` tarballs after cutover, (d)
  Synology overall capacity flagged as a separate standing risk.
- **borg version skew (Unraid vs Synology):** repo-format incompatibility risk.
  Mitigation: pin/track both to a compatible major; "keep Synology borg
  version-aligned" is a written maintenance task (not tribal knowledge).
- **Encryption key loss:** mitigated by mandatory off-box escrow + a restore-
  from-escrow-only acceptance test.
- **DB dump failure (container down, auth change):** borgmatic treats a failed
  database hook as a failed run -> loud (Healthchecks red + Discord), not a
  silent partial backup.
- **Backup window:** Class B/C files copied while containers run (self-healing
  for file-based state); Class A consistent via dumps. Net container downtime
  ~0 (vs 17 min today).

## Testing / acceptance

The real success criterion is a **proven restore**, not a green backup log. A
backup that has never been test-restored is unverified.

1. **Restore drill (the gate):** from a borg archive, restore the wiki MariaDB
   logical dump into a scratch MariaDB container + restore a sample appdata
   tree; bring the wiki up against the restored DB; confirm it loads. Repeat
   for one Postgres (oracle) dump.
2. **Restore-from-escrow-only:** decrypt and list an archive using only the
   escrowed passphrase/key (simulating total Unraid loss).
3. **Offsite catch-up:** simulate Prague offline for several nights, then
   confirm a single pull reconciles the repo and `borg check` passes.
4. **Loud-on-failure:** induce a failure (e.g. bad DB credential); confirm
   Healthchecks goes red and Discord receives the alert.
5. **Integrity:** `borg check` passes on both the Synology primary and the
   Prague copy.

## Phased cutover

1. **Stand up borgmatic alongside** the existing weekly `appdata_backup.sh`
   tar. Do not break what works.
2. Run both in parallel ~3-4 weeks. Prove: nightly runs succeed; Prague pull
   works; the restore drill (above) passes; monitoring fires red on induced
   failure; `borg check` green both ends.
3. **Retire** the custom `appdata_backup.sh` weekly tar. Reclaim Synology
   space by deleting the old `CA_backup.tar.gz` tarballs.
4. Update `unRAID/docs/server/backup.md` and `.claude/calendar-checks.txt` to
   describe the borgmatic system (and retire/replace the interim
   nested-tarball monthly health check, since health is now Healthchecks +
   `borg check`).
5. Keep the USB boot mirror + `flash/` rsync exactly as-is throughout.

## Open dials (defaults proposed, tunable in the plan -- not blockers)

- Retention numbers (default 7d/4w/6m).
- Monitor: Healthchecks (default) vs Uptime Kuma.
- Nightly run time (default ~04:00, the current slot).
- borg encryption mode: `repokey-blake2` vs `keyfile` (plan decides; both
  require escrow).

## Residual risks (accepted / flagged, not solved here)

- Synology total capacity is the standing infrastructure risk (98% full); this
  design reduces backup-share pressure but does not solve overall NAS capacity.
- Hyllie-local: Unraid + Synology share a site; the Prague offsite leg is the
  only protection against site loss -- so the Prague pull job's reliability is
  load-bearing and is covered by acceptance test 3.
- The Synology borg instance is a new maintained component; mitigated by the
  written version-alignment task, but it is a real (small) ongoing surface.
