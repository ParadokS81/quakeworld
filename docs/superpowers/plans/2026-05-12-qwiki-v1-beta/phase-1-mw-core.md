# Phase 1 -- MW core substrate

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (table at bottom of that file).
> 3. Read prior approved phase MDs (Phase 1, Phase 2, ...) -- their "Outputs to next phase" sections name what state this phase inherits.
> 4. After drafting, dispatch the verification sub-agent (brief at bottom of this template).

## Goal

Stand up the qwiki-v1-beta MediaWiki 1.39 LTS substrate on Unraid: official `mediawiki:1.39` Docker image (Apache + PHP) + `mariadb:10.11` LTS sidecar + Citizen skin pinned to v2.40.2 (last release with MW 1.39 support). Cloudflare Tunnel routes `https://wiki-beta.quake.world` -> Unraid LAN at `192.168.1.205:8081`. No extensions installed in this phase (Page Forms + Semantic MediaWiki come in Phase 2); no auth installed (PluggableAuth + Discord OAuth come in Phase 3); no quality-tag categories or harvest-path tasks (those come in Phase 4). MW default `$wgGroupPermissions['*']['edit'] = false` is preserved, so anonymous read access works and anonymous edit is blocked.

The pre-pivot `apps/qwiki-sandbox/` docs (CLAUDE.md / README.md / OVERVIEW.md) get rewritten to fresh-build language as part of this phase; the directory becomes the deploy + curator tooling home for the v1-beta substrate.

**Runnable state at phase boundary:** from operator's WSL, `curl -sI https://wiki-beta.quake.world | head -5` returns `HTTP/2 200`; visiting the URL in a browser shows the MW main page rendered with Citizen skin (left-rail TOC visible, dark-mode toggle reachable); attempting to anonymously edit the main page surfaces a "permission denied" or "you must be logged in" message; on Unraid `docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps` shows `qwiki-mw` and `qwiki-mariadb` both running and healthy.

## Inputs from previous phase

No prior phase. This is the substrate Phase 1. Inputs are the items in `prerequisites.md`:

- Unraid SSH reachable: `ssh unraid 'echo ok'` returns `ok`.
- Cloudflare account access to the `quake.world` zone + Tunnel admin.
- Existing weekly Unraid -> Synology backup covers `/mnt/user/appdata/`.
- The `apps/qwiki-sandbox/` directory exists (scaffolded 2026-05-09).
- The local `qwiki-analysis` MariaDB container holding the old-wiki dump is still running (informational; Phase 1 does NOT touch it). New-build wiki uses a separate `qwiki-mariadb` container on Unraid.

Discord OAuth prerequisites (OAuth app + `@wiki-beta` role) are NOT required for Phase 1 -- they gate Phase 3.

## Files touched

### Created

```
apps/qwiki-sandbox/deploy/                                  # new directory
apps/qwiki-sandbox/deploy/docker-compose.prod.yml           # MW + MariaDB stack (committed)
apps/qwiki-sandbox/deploy/.env.prod.example                 # secrets template (committed; real .env lives on Unraid only)
apps/qwiki-sandbox/deploy/LocalSettings.php                 # hand-authored MW config; secrets via getenv() (committed)
apps/qwiki-sandbox/deploy/README.md                         # deploy runbook (first-time + redeploy + troubleshoot)
```

On Unraid (operator-created during deploy, not in git):

```
/mnt/user/appdata/qwiki-beta/                               # parent dir; included in weekly backup tarball per D3
/mnt/user/appdata/qwiki-beta/docker-compose.prod.yml        # scp'd from apps/qwiki-sandbox/deploy/
/mnt/user/appdata/qwiki-beta/LocalSettings.php              # scp'd from apps/qwiki-sandbox/deploy/
/mnt/user/appdata/qwiki-beta/.env                           # operator-authored from .env.prod.example, chmod 600
/mnt/user/appdata/qwiki-beta/mariadb-data/                  # MariaDB data volume
/mnt/user/appdata/qwiki-beta/mediawiki-data/                # MW images, cache, logs (volume on /var/www/html/images)
/mnt/user/appdata/qwiki-beta/citizen/                       # Citizen skin tree, git-checked-out at v2.40.2
```

### Modified

```
apps/qwiki-sandbox/CLAUDE.md                                # pre-pivot modernize-in-place language -> fresh-build language; reference v1-beta arc
apps/qwiki-sandbox/README.md                                # pre-pivot quick-start -> fresh-build quick-start
apps/qwiki-sandbox/OVERVIEW.md                              # replace pre-pivot 6-phase plan with arc phase index pointer + current state
```

### Deleted

n/a -- no files removed in this phase. `apps/qwiki-sandbox/VISION.md` already documents the pivot (its "Pivoted 2026-05-09 evening" preamble + ORIGINAL VISION appendix); no edit needed.

## Tasks

### Task 1 -- Rewrite apps/qwiki-sandbox/CLAUDE.md to fresh-build language

**Goal.** Replace the pre-pivot modernize-in-place description with fresh-build / Modes-mini-arc language. The CLAUDE.md is the cold entry-point any Claude terminal lands on when working in `apps/qwiki-sandbox/`; it must reflect what this directory actually holds (v1-beta deploy + Modes curator tool home), not the pre-pivot intent.

**Files.** `apps/qwiki-sandbox/CLAUDE.md`.

**Execution mode.** `inline` -- full file content shipped inline; no code synthesis (D22 / D26).

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/CLAUDE.md` with the content block below.

Full file content to write:

```markdown
# QWiki Sandbox -- v1-beta substrate + Modes mini-arc

**Status:** Active development. v1-beta fresh-build MediaWiki substrate (arc `2026-05-12-qwiki-v1-beta`). Houses the deploy artifacts for the new wiki at `wiki-beta.quake.world` and the Modes-mini-arc curator tool that ships later in the arc.

**Pivoted 2026-05-09 evening from modernize-in-place to fresh-build.** Old-wiki dump + image tarball under `dumps/` (gitignored) remain reference material for per-domain extracts. The substrate stands up clean (no upgrade-from-1.35 chain); old wiki is extraction source only.

## Documentation index

| When you need... | Read... |
|---|---|
| Quick-start (what's here, current state) | `README.md` |
| Vision: fresh-build scope + ecosystem role | `VISION.md` (preserves pre-pivot vision in an appendix) |
| Living state (current arc phase + deploy status) | `OVERVIEW.md` |
| Deploy runbook (Unraid + Cloudflare Tunnel + LocalSettings + Citizen) | `deploy/README.md` (after Phase 1 ships) |
| Arc plan + decisions + phase MDs | `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/` (repo-root tree) |
| Modes curator tool (after Phase 6 ships) | `scripts/curate-modes/CLAUDE.md` |
| Source dumps | `dumps/` (gitignored) |

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `deploy/` | `deploy/README.md` (Phase 1) | Docker compose + LocalSettings.php + env example for Unraid prod stack |
| `scripts/curate-modes/` | TBD (Phase 6) | Modes triage curator tool, brand-curator pattern |
| `dumps/` | n/a | Gitignored; ciscon's old-wiki SQL dump + image tarball (reference) |

## Always-on rules

- `dumps/` is gitignored. SQL dump + image tarball are large; never commit them.
- New-build wiki content is authored in the live wiki (form-driven via Page Forms after Phase 2); not in this repo. This directory is for substrate + tooling, not page content.
- `LocalSettings.php` in `deploy/` carries secrets via `getenv()` so the file is safe to commit. Real secrets live in `/mnt/user/appdata/qwiki-beta/.env` on Unraid (mode 600, not in repo).
- Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is NOT the current plan. Current plan: arc at `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`.

## Related

- Sister project: `apps/qw-oracle/` -- the QW knowledge service that ingests wiki content via the Layer 3 harvest path (verified during Phase 4 of this arc).
- Arc spec: `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED 2026-05-12).
- Operator memory: `project_qwiki_sandbox_passes.md` (pass tracker), `project_qwiki_sandbox_genesis.md` (origin context).
```

**Verification.** `head -1 apps/qwiki-sandbox/CLAUDE.md` returns `# QWiki Sandbox -- v1-beta substrate + Modes mini-arc`.

### Task 2 -- Rewrite apps/qwiki-sandbox/README.md to fresh-build quick-start

**Goal.** Replace the pre-pivot quick-start with a fresh-build-aligned README. Same shape as the existing one (sections: what this is, status, files, plan) but updated content.

**Files.** `apps/qwiki-sandbox/README.md`.

**Execution mode.** `inline` -- full file content shipped inline; pure documentation (D22 / D26).

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/README.md` with the content block below.

Full file content to write:

```markdown
# qwiki-sandbox

Fresh-build MediaWiki 1.39 substrate for the v1-beta successor wiki at `wiki-beta.quake.world`, plus the Modes-mini-arc curator tool home.

## What this is

The deploy + tooling home for the qwiki-v1-beta arc (`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`). Pivoted 2026-05-09 from a modernize-in-place clone to a fresh-build successor with selective extract from the old wiki.

The live wiki at https://www.quakeworld.nu/wiki/ (MediaWiki 1.35.10 + PHP 7.4) is the extraction source; the v1-beta wiki at https://wiki-beta.quake.world is the new substrate. Cutover from beta to the live URL is a future arc (not this one).

## Status

After Phase 1 of the arc ships: MW 1.39 + MariaDB 10.11 + Citizen skin live at wiki-beta.quake.world. Phase 2 adds Page Forms + Semantic MediaWiki. Phase 3 wires PluggableAuth + Discord OAuth. Phase 4 adds quality-tag categories + verifies the Layer 3 harvest path end-to-end. Phases 5-8 ship the Modes mini-arc.

Old-wiki dumps remain at `dumps/` (gitignored) for per-domain extracts.

## Files

- `deploy/` -- Docker stack + LocalSettings.php + deploy runbook (after Phase 1)
- `scripts/curate-modes/` -- Modes triage curator tool (after Phase 6)
- `dumps/` -- gitignored, holds ciscon's SQL dump + image tarball (reference)
- `CLAUDE.md` -- entry-point for Claude sessions touching this directory
- `VISION.md` -- fresh-build scope; preserves pre-pivot vision in an appendix
- `OVERVIEW.md` -- arc-phase status + current state

## Plan

See `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` for the eight-phase index. This directory is touched by Phase 1 (deploy) and Phase 6 (curator tool).
```

**Verification.** `head -1 apps/qwiki-sandbox/README.md` returns `# qwiki-sandbox`.

### Task 3 -- Rewrite apps/qwiki-sandbox/OVERVIEW.md to arc-aware living-state

**Goal.** Replace the pre-pivot 6-phase plan with a pointer to the arc + current state of the substrate. OVERVIEW.md is the "living map" doc per monorepo convention; it shows what is and isn't deployed right now.

**Files.** `apps/qwiki-sandbox/OVERVIEW.md`.

**Execution mode.** `inline` -- full file content shipped inline; pure documentation (D22 / D26).

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/OVERVIEW.md` with the content block below.

Full file content to write:

```markdown
# QWiki Sandbox -- Overview

Living map of the v1-beta substrate + Modes mini-arc tooling. Updated as state changes during the arc.

## Current arc

**`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`** -- 8-phase arc, 4 substrate phases + 4 Modes-mini-arc phases. See that directory's `README.md` for the phase index and live status table.

Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is superseded; preserved in `VISION.md` as ORIGINAL VISION appendix for historical context.

## Substrate state

After Phase 1 ships: MW 1.39 LTS + MariaDB 10.11 LTS + Citizen skin v2.40.2 live at `wiki-beta.quake.world`. Vanilla; no extensions; no auth (anonymous read works, anonymous edit blocked).

Phases 2 / 3 / 4 layer Page Forms + SMW, then PluggableAuth + Discord OAuth + MW groups, then quality-tag categories + Layer 3 harvest verification.

## Modes mini-arc state

Phases 5-8 deliver Mode page-type form + curator tool + 27-mode triage + harvest verification. Status tracked in the arc README's phase index.

## Source artifacts on operator's side

- `dumps/qwiki.sql.gz` (87M -> ~710M uncompressed, MariaDB 11.8.6 dump, 96 tables; 94 InnoDB / 2 MyISAM, binary charset). Source of per-domain extract queries.
- `dumps/wiki-images.tar.gz` (6.4G, 50,150 files incl 178 bonus QW demos). Per-domain image migration deferred; Modes may need a few screenshots.
- Local `qwiki-analysis` MariaDB container (operator's WSL Docker) holds the imported dump for inventory queries. Kept alive through the Modes mini-arc.

## Key external dependencies

- **bps** -- founder of QWiki, decision-maker for live-wiki cutover (future arc).
- **ciscon** -- sysadmin of live wiki; source of the dumps.
- **Hooraytio + alice** -- top live-wiki contributors; potential v1-beta invitees.
- **Live wiki** at https://www.quakeworld.nu/wiki/ -- extraction source.

## Decisions log

Cross-cutting decisions live in the arc's `decisions.md` (D1-D26, locked 2026-05-12). No project-internal decisions log; if a phase needs to deviate from a locked decision, the phase MD's "Deviation" section + operator review handles it (per D25).
```

**Verification.** `grep -c "^| [0-9]" apps/qwiki-sandbox/OVERVIEW.md` returns `0` (no phase table; pointer-to-arc instead).

### Task 4 -- Author apps/qwiki-sandbox/deploy/docker-compose.prod.yml

**Goal.** Compose stack for MW 1.39 + MariaDB 10.11 + Citizen skin volume mount. Single network. Ports bind to Unraid LAN IP (`192.168.1.205:8081`) so the existing Cloudflare Tunnel agent can route external HTTPS to this internal HTTP endpoint. Mirrors the qw-oracle precedent (compose committed in `deploy/`; operator scp's to `/mnt/user/appdata/qwiki-beta/`).

**Files.** `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` (new), `apps/qwiki-sandbox/deploy/` (parent dir, new).

**Execution mode.** `inline` -- full file content shipped inline; no code synthesis (D22). The compose shape is mechanical once the substitution values (image tags / volume paths / port binding) are locked.

**Steps.**

- [ ] Create the `apps/qwiki-sandbox/deploy/` directory: `mkdir -p apps/qwiki-sandbox/deploy`.
- [ ] Write `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` with the content below.

Full file content to write:

```yaml
# apps/qwiki-sandbox/deploy/docker-compose.prod.yml
# Unraid stack for qwiki-v1-beta: MediaWiki 1.39 LTS (official image, Apache+PHP)
# + MariaDB 10.11 LTS + Citizen skin volume mount.
#
# Operator workflow (see deploy/README.md):
#   1. ssh unraid 'mkdir -p /mnt/user/appdata/qwiki-beta/{mariadb-data,mediawiki-data,citizen}'
#   2. scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
#          apps/qwiki-sandbox/deploy/LocalSettings.php \
#          unraid:/mnt/user/appdata/qwiki-beta/
#   3. ssh unraid 'cd /mnt/user/appdata/qwiki-beta && nano .env'   # paste from .env.prod.example, fill secrets
#   4. ssh unraid 'cd /mnt/user/appdata/qwiki-beta && chmod 600 .env'
#   5. (one-time) ssh unraid 'cd /mnt/user/appdata/qwiki-beta && git clone --branch v2.40.2 --depth 1 https://github.com/StarCitizenTools/mediawiki-skins-Citizen.git citizen'
#   6. docker compose -f docker-compose.prod.yml up -d mariadb     # bring DB up alone, wait healthy
#   7. docker compose -f docker-compose.prod.yml run --rm mw php maintenance/install.php \
#        --dbtype=mysql --dbserver=mariadb --dbname=qwiki_beta --dbuser=qwiki --dbpass="$MW_DB_PASSWORD" \
#        --installdbuser=root --installdbpass="$MARIADB_ROOT_PASSWORD" \
#        --server=https://wiki-beta.quake.world --scriptpath="" --lang=en \
#        --pass="$MW_ADMIN_PASSWORD" \
#        "QuakeWorld Wiki (beta)" "Admin"
#      # install.php emits a generated LocalSettings.php to /var/www/html/LocalSettings.php inside the
#      # container; we discard that one (hand-authored deploy/LocalSettings.php replaces it).
#   8. docker compose -f docker-compose.prod.yml up -d
#
# All persistent data lives under /mnt/user/appdata/qwiki-beta/, which is on the
# weekly Unraid -> Synology backup (D3 -- backup inheritance).

services:
  mariadb:
    image: mariadb:10.11
    container_name: qwiki-mariadb
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}
      MARIADB_DATABASE: qwiki_beta
      MARIADB_USER: qwiki
      MARIADB_PASSWORD: ${MW_DB_PASSWORD}
    volumes:
      - /mnt/user/appdata/qwiki-beta/mariadb-data:/var/lib/mysql
    networks:
      - qwiki-net
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 6

  mw:
    image: mediawiki:1.39
    container_name: qwiki-mw
    restart: unless-stopped
    depends_on:
      mariadb:
        condition: service_healthy
    environment:
      # Surfaced to LocalSettings.php via getenv(); see apps/qwiki-sandbox/deploy/LocalSettings.php.
      MW_DB_PASSWORD: ${MW_DB_PASSWORD}
      MW_SECRET_KEY: ${MW_SECRET_KEY}
      MW_UPGRADE_KEY: ${MW_UPGRADE_KEY}
    volumes:
      # LocalSettings.php is hand-authored + committed (deploy/LocalSettings.php). Operator
      # scp's it to the Unraid appdata dir; this mount picks it up read-only.
      - /mnt/user/appdata/qwiki-beta/LocalSettings.php:/var/www/html/LocalSettings.php:ro
      # MW writes uploaded images, cache files, and logs here; survives container restarts.
      - /mnt/user/appdata/qwiki-beta/mediawiki-data:/var/www/html/images
      # Citizen skin tree, git-checked-out at v2.40.2 on the host. Read-only mount.
      - /mnt/user/appdata/qwiki-beta/citizen:/var/www/html/skins/Citizen:ro
    ports:
      # Bind to the Unraid host's LAN address only -- the existing Cloudflare Tunnel
      # agent routes wiki-beta.quake.world to http://192.168.1.205:8081 from the same
      # Unraid box. 0.0.0.0 would expose the wiki on the LAN without Cloudflare's edge.
      - "192.168.1.205:8081:80"
    networks:
      - qwiki-net

networks:
  qwiki-net:
    name: qwiki-net
    driver: bridge
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml && echo OK` returns `OK`. `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config -q && echo OK` returns `OK` (valid compose syntax; runs offline).

### Task 5 -- Author apps/qwiki-sandbox/deploy/.env.prod.example

**Goal.** Template for the operator-authored `.env` on Unraid. All secrets are placeholders. The committed `.env.prod.example` is the source of truth for which env vars exist; the real `.env` on Unraid carries the actual values.

**Files.** `apps/qwiki-sandbox/deploy/.env.prod.example`.

**Execution mode.** `inline` -- pure documentation (D22 / D26).

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/.env.prod.example` with the content below.

Full file content to write:

```bash
# apps/qwiki-sandbox/deploy/.env.prod.example
# Copy to /mnt/user/appdata/qwiki-beta/.env on Unraid; fill in real values; chmod 600.
# The real .env is NOT committed (gitignored at the apps/qwiki-sandbox/ level).

# MariaDB root password. Used only by install.php during the one-shot install run
# and during MW upgrades (Phase 2+); not used by the running MW container.
MARIADB_ROOT_PASSWORD=replace-me-with-long-random-string

# MW database user password. Read by docker-compose.prod.yml for both MariaDB
# user-creation (MARIADB_PASSWORD) and the MW container (MW_DB_PASSWORD -> getenv() in
# LocalSettings.php for $wgDBpassword).
MW_DB_PASSWORD=replace-me-with-long-random-string

# MW $wgSecretKey -- used by MW for CSRF tokens, password resets, autocomplete, etc.
# 64 hex chars recommended (`openssl rand -hex 32`).
MW_SECRET_KEY=replace-me-with-64-hex-chars

# MW $wgUpgradeKey -- protects the web upgrader (maintenance/web-install). 16 hex chars
# typical (`openssl rand -hex 8`). Required at install.php run; required again during
# any future MW version upgrade.
MW_UPGRADE_KEY=replace-me-with-16-hex-chars

# Initial admin password for the MW account created by install.php. After install,
# rotate via Special:ChangePassword or `maintenance/changePassword.php`; this env var
# is only read by install.php at first run and can be left as a placeholder afterward.
MW_ADMIN_PASSWORD=replace-me-with-a-strong-password
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/.env.prod.example && echo OK` returns `OK`. `grep -c "^MW_" apps/qwiki-sandbox/deploy/.env.prod.example` returns `4`.

### Task 6 -- Author apps/qwiki-sandbox/deploy/LocalSettings.php

**Goal.** Hand-authored `LocalSettings.php` for MW 1.39, configured for `wiki-beta.quake.world` + Citizen skin + MW-default anonymous-edit restriction. Secrets read via `getenv()` from the Unraid `.env`. This file is committed (no plaintext secrets); the running container picks it up via the read-only volume mount declared in Task 4.

**Files.** `apps/qwiki-sandbox/deploy/LocalSettings.php`.

**Execution mode.** `inline` -- full file content shipped inline; no code synthesis required at execute time. (Drafter is responsible for verifying the inlined content against MW 1.39 docs; sub-agent verification confirms.)

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/LocalSettings.php` with the content below.

Full file content to write:

```php
<?php
# apps/qwiki-sandbox/deploy/LocalSettings.php
# MediaWiki 1.39 LTS configuration for qwiki-v1-beta (wiki-beta.quake.world).
# Hand-authored; install.php is run once to bootstrap the DB schema, but its
# generated LocalSettings.php is discarded in favor of this committed file.
#
# Secrets read from the container's environment (populated via docker-compose
# env_file or environment block); never committed in plaintext here.
#
# Phase 1 scope: MW core + Citizen skin only. No extensions (Phase 2), no auth
# (Phase 3), no quality-tag categories (Phase 4). MW default
# $wgGroupPermissions['*']['edit'] = false (anonymous edit blocked) is preserved.

if ( !defined( 'MEDIAWIKI' ) ) {
    exit;
}

# --- Site identity ---------------------------------------------------------

$wgSitename = "QuakeWorld Wiki (beta)";
$wgMetaNamespace = "QuakeWorld_Wiki";

# The wiki lives at the apex of wiki-beta.quake.world; no /w/ script path.
$wgScriptPath = "";
$wgServer = "https://wiki-beta.quake.world";
$wgResourceBasePath = $wgScriptPath;

# Make MW trust the X-Forwarded-Proto header that Cloudflare Tunnel sets, so MW
# generates https:// URLs in templates and redirects instead of http://.
$wgUsePrivateIPs = true;

# --- Logo + favicon (placeholders; updated post-Phase 1) -------------------

$wgLogos = [
    '1x' => "$wgResourceBasePath/resources/assets/wiki.png",
];
$wgFavicon = "$wgResourceBasePath/favicon.ico";

# --- Email --------------------------------------------------------------------

# Disabled in v1 beta; can be enabled post-Phase-3 if account-recovery emails
# are needed. PluggableAuth + Discord OAuth (Phase 3) is the primary signup
# path, so password resets are not load-bearing at v1.
$wgEnableEmail = false;
$wgEnableUserEmail = false;
$wgEmergencyContact = "";
$wgPasswordSender = "";

# --- Database -------------------------------------------------------------

$wgDBtype = "mysql";
$wgDBserver = "mariadb";
$wgDBname = "qwiki_beta";
$wgDBuser = "qwiki";
$wgDBpassword = getenv( 'MW_DB_PASSWORD' ) ?: "";

$wgDBprefix = "";
$wgDBTableOptions = "ENGINE=InnoDB, DEFAULT CHARSET=binary";

# --- Shared / caching -----------------------------------------------------

# Single-container MW; no external cache backend in Phase 1. CACHE_ACCEL uses
# PHP APCu when available (the official mediawiki:1.39 image ships APCu).
$wgMainCacheType = CACHE_ACCEL;
$wgMemCachedServers = [];

# Upload defaults; per-page screenshot inclusion is operator-controlled.
$wgEnableUploads = true;
$wgUploadDirectory = "/var/www/html/images";

# --- Skins ----------------------------------------------------------------

# Citizen is the locked skin per D2. Vector + MonoBook + Timeless ship in the
# base image; loading them too keeps Special:Preferences's skin selector usable
# during early sanity checks. Citizen remains the default.
wfLoadSkin( 'Vector' );
wfLoadSkin( 'MonoBook' );
wfLoadSkin( 'Timeless' );
wfLoadSkin( 'Citizen' );

$wgDefaultSkin = "citizen";

# Citizen options (D2; prerequisites.md default = left-rail TOC enabled).
# Wiki-specific tuning lands here in subsequent phases. Phase 1 keeps defaults.
$wgCitizenEnableCommandPalette = true;

# --- Permissions ----------------------------------------------------------

# MW defaults already block anonymous edit ($wgGroupPermissions['*']['edit'] = false
# is the documented MW 1.39 default). Setting it explicitly here makes the
# Phase 1 verification probe self-documenting; Phase 3 will introduce
# wiki-contributor / wiki-curator groups and namespace restrictions (D4 / D5).
$wgGroupPermissions['*']['createaccount'] = false;
$wgGroupPermissions['*']['edit'] = false;
$wgGroupPermissions['*']['createpage'] = false;
$wgGroupPermissions['*']['createtalk'] = false;
$wgGroupPermissions['*']['read'] = true;

# Sysop (the install-time admin user only) keeps the MW defaults so initial
# wiki-setup edits and namespace administration work via the admin account.

# --- Security keys --------------------------------------------------------

$wgSecretKey = getenv( 'MW_SECRET_KEY' ) ?: "";
$wgUpgradeKey = getenv( 'MW_UPGRADE_KEY' ) ?: "";

# --- Language + license ---------------------------------------------------

$wgLanguageCode = "en";

$wgRightsPage = "";
$wgRightsUrl = "https://creativecommons.org/licenses/by-sa/4.0/";
$wgRightsText = "Creative Commons Attribution-ShareAlike 4.0 International";
$wgRightsIcon = "$wgResourceBasePath/resources/assets/licenses/cc-by-sa.png";

# --- Misc -----------------------------------------------------------------

$wgEnotifUserTalk = false;
$wgEnotifWatchlist = false;

# Honor X-Forwarded-For from CF Tunnel for accurate IP logging.
$wgUseCdn = false;
$wgUsePathInfo = true;
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/LocalSettings.php && echo OK` returns `OK`. `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` returns `No syntax errors detected` (requires PHP CLI in WSL; alternatively defer to the install.php run on Unraid as the integration check).

### Task 7 -- Author apps/qwiki-sandbox/deploy/README.md

**Goal.** Deploy runbook: first-time setup, redeploy, operator commands, troubleshooting. Same shape as `apps/qw-oracle/DEPLOYMENT.md`. The runbook is the source of truth the operator follows when executing the Phase 1 deploy (Task 8).

**Files.** `apps/qwiki-sandbox/deploy/README.md`.

**Execution mode.** `inline` -- pure documentation (D22 / D26).

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/README.md` with the content below.

Full file content to write:

````markdown
# qwiki-v1-beta -- production deploy runbook

## Topology

```
client (any browser)
  -> https://wiki-beta.quake.world          [Cloudflare Tunnel, TLS]
       -> Unraid host (Tailscale: 100.114.81.91, LAN: 192.168.1.205)
            -> mediawiki container (qwiki-net, port 8081 on LAN)
                 -> mariadb container (qwiki-net)
```

Persistent data and configs live at `/mnt/user/appdata/qwiki-beta/`:

- `mariadb-data/`             - MariaDB state. Covered by the weekly Unraid -> Synology backup.
- `mediawiki-data/`           - MW uploaded images + cache + logs (`/var/www/html/images` inside the container).
- `citizen/`                  - Citizen skin git checkout at v2.40.2.
- `docker-compose.prod.yml`   - scp'd from `apps/qwiki-sandbox/deploy/`.
- `LocalSettings.php`         - scp'd from `apps/qwiki-sandbox/deploy/`.
- `.env`                      - operator-authored from `.env.prod.example`, mode 600.

## Prerequisites

- Tailscale up; `ssh unraid 'echo ok'` returns `ok`.
- Cloudflare account access to the `quake.world` zone + Tunnel admin.
- Existing `cloudflared` Tunnel agent running on Unraid (same one fronting `oracle.slipgate.me` for qw-oracle).

## First-time deploy

1. Create the Unraid appdata directory tree:

   ```bash
   ssh unraid 'mkdir -p /mnt/user/appdata/qwiki-beta/{mariadb-data,mediawiki-data,citizen}'
   ```

2. Copy compose + LocalSettings to Unraid:

   ```bash
   scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
       apps/qwiki-sandbox/deploy/LocalSettings.php \
       unraid:/mnt/user/appdata/qwiki-beta/
   ```

3. Author the `.env` on Unraid:

   ```bash
   ssh unraid
   cd /mnt/user/appdata/qwiki-beta
   nano .env       # paste from apps/qwiki-sandbox/deploy/.env.prod.example, fill secrets
   chmod 600 .env
   ```

   Generate strong values: `openssl rand -hex 32` for `MARIADB_ROOT_PASSWORD` /
   `MW_DB_PASSWORD` / `MW_SECRET_KEY`; `openssl rand -hex 8` for `MW_UPGRADE_KEY`;
   pick a memorable password for `MW_ADMIN_PASSWORD` (rotate after install).

4. Clone the Citizen skin at v2.40.2:

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     git clone --branch v2.40.2 --depth 1 \
       https://github.com/StarCitizenTools/mediawiki-skins-Citizen.git citizen'
   ```

   v2.40.2 is the last Citizen release that supports MW 1.39. Newer Citizen
   releases require MW 1.43+; do NOT bump without coordinating an MW upgrade.

5. Bring MariaDB up alone first:

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     docker compose -f docker-compose.prod.yml up -d mariadb && \
     docker compose -f docker-compose.prod.yml ps'
   ```

   Wait until `qwiki-mariadb` shows `State: Up (healthy)`. The healthcheck uses
   MariaDB's `healthcheck.sh --connect --innodb_initialized` (10s interval).

6. Run install.php (one-shot, creates the DB schema + initial admin user):

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     set -a && . ./.env && set +a && \
     docker compose -f docker-compose.prod.yml run --rm mw \
       php maintenance/install.php \
         --dbtype=mysql --dbserver=mariadb \
         --dbname=qwiki_beta --dbuser=qwiki --dbpass="$MW_DB_PASSWORD" \
         --installdbuser=root --installdbpass="$MARIADB_ROOT_PASSWORD" \
         --server="https://wiki-beta.quake.world" --scriptpath="" --lang=en \
         --pass="$MW_ADMIN_PASSWORD" \
         "QuakeWorld Wiki (beta)" "Admin"'
   ```

   install.php emits a generated `LocalSettings.php` to `/var/www/html/LocalSettings.php`
   inside the container; this is discarded when the container exits because of
   `--rm`. The hand-authored `LocalSettings.php` on the host (mounted read-only)
   is the one that takes effect on the next `up -d`.

7. Start the full stack:

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     docker compose -f docker-compose.prod.yml up -d && \
     docker compose -f docker-compose.prod.yml ps'
   ```

   Wait until `qwiki-mw` shows `Up`. Local smoke test:

   ```bash
   ssh unraid 'curl -sI http://192.168.1.205:8081/'
   # Expect: HTTP/1.1 200 OK or HTTP/1.1 301/302 (MW may redirect / to /index.php).
   ```

8. Add the Cloudflare Tunnel route. From the Cloudflare dashboard
   (`Zero Trust -> Access -> Tunnels`):

   - Pick the existing tunnel that already fronts `oracle.slipgate.me` (or the
     equivalent Unraid tunnel; check `cloudflared` config if uncertain).
   - Add a public hostname entry:
     - Subdomain: `wiki-beta`
     - Domain: `quake.world`
     - Service: `http://192.168.1.205:8081`
   - Save. Cloudflare creates the proxied DNS record automatically.

9. Verify externally (from operator's WSL):

   ```bash
   curl -sI https://wiki-beta.quake.world | head -5
   # Expect: HTTP/2 200 OK (or 301/302 to /index.php which then returns 200).
   ```

   Then open `https://wiki-beta.quake.world` in a browser; expect the MW main
   page rendered with the Citizen skin. Click "View source" or attempt to edit
   while logged out; expect "you must be logged in" or "you do not have
   permission to edit this page."

## Routine redeploy (LocalSettings change)

```bash
# from operator's WSL
scp apps/qwiki-sandbox/deploy/LocalSettings.php unraid:/mnt/user/appdata/qwiki-beta/
ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
  docker compose -f docker-compose.prod.yml restart mw'
```

The LocalSettings mount is read-only on the container; restart picks up the
new file.

## Routine redeploy (compose change)

```bash
scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml unraid:/mnt/user/appdata/qwiki-beta/
ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
  docker compose -f docker-compose.prod.yml up -d'
```

`up -d` recreates only containers whose definitions changed; volumes survive.

## Operator commands

| Action | Command |
|---|---|
| Live MW logs | `ssh unraid 'docker logs -f qwiki-mw'` |
| MariaDB logs | `ssh unraid 'docker logs -f qwiki-mariadb'` |
| Stack status | `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'` |
| Restart MW only | `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mw'` |
| MW shell | `ssh unraid 'docker exec -it qwiki-mw bash'` |
| MariaDB shell | `ssh unraid 'docker exec -it qwiki-mariadb mariadb -uroot -p qwiki_beta'` |
| Run MW maintenance script | `ssh unraid 'docker exec -it qwiki-mw php maintenance/<script>.php'` |

## Troubleshooting

- **`docker compose ps` shows `qwiki-mw` restarting** -- run
  `ssh unraid 'docker logs qwiki-mw --tail 50'`. Most likely: `LocalSettings.php`
  PHP syntax error (verify with `php -l deploy/LocalSettings.php` from WSL) or
  the MariaDB volume hasn't initialized yet (let it run for 30 seconds and check
  `docker compose ps` again).

- **CF Tunnel returns 502** -- the MW container is unreachable from the tunnel
  agent's network. Verify:
  - `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'`
    shows `qwiki-mw` listening on `192.168.1.205:8081->80`.
  - `ssh unraid 'curl -sI http://192.168.1.205:8081/'` returns a 2xx/3xx.
  - The CF Tunnel public hostname entry matches `http://192.168.1.205:8081` (not
    `https://`, not `127.0.0.1`).

- **Main page renders but no Citizen skin** -- the skin volume may not be
  mounted correctly. Verify:
  - `ssh unraid 'ls /mnt/user/appdata/qwiki-beta/citizen/skin.json'` returns a path.
  - `ssh unraid 'docker exec qwiki-mw ls /var/www/html/skins/Citizen/skin.json'`
    returns the same file via the bind mount.
  - `LocalSettings.php` has `wfLoadSkin( 'Citizen' );` AND `$wgDefaultSkin = "citizen";`.

- **install.php fails with "DB user exists"** -- the MariaDB container's
  `MARIADB_USER` env created the user already; install.php's
  `--installdbuser/--installdbpass` should still let it run, but if the failure
  reports `Access denied`, drop the qwiki user manually and re-run:
  `ssh unraid 'docker exec qwiki-mariadb mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "DROP USER \"qwiki\"@\"%\"; FLUSH PRIVILEGES;"'`

- **`docker compose` command not found after Unraid reboot** -- compose plugin
  is on tmpfs; reinstall per `apps/quad/DEPLOYMENT.md` "Compose plugin caveat".

## Backup + recovery

- **Backup:** inherited from Unraid -> Synology weekly tarball of `/mnt/user/appdata/`
  per `/home/paradoks/projects/unRAID/docs/server/backup.md`. No bespoke wiring
  required.

- **Recovery (data loss):** restore `/mnt/user/appdata/qwiki-beta/` from the
  most recent Synology tarball, then bring the stack up. MariaDB state lives in
  `mariadb-data/`; uploaded images in `mediawiki-data/`.

- **Recovery (LocalSettings.php damage):** `git checkout HEAD --
  apps/qwiki-sandbox/deploy/LocalSettings.php` in the operator's WSL, then redeploy.
````

**Verification.** `test -f apps/qwiki-sandbox/deploy/README.md && echo OK` returns `OK`. `grep -c "^## " apps/qwiki-sandbox/deploy/README.md` returns at least `7` (Topology / Prerequisites / First-time / Routine redeploy (Local) / Routine redeploy (compose) / Operator commands / Troubleshooting / Backup + recovery -- 8 sections).

### Task 8 -- Operator deploy: bring the stack up on Unraid + add CF Tunnel route

**Goal.** Execute the first-time-deploy section of `deploy/README.md` against the live Unraid host. Result: `https://wiki-beta.quake.world` returns the MW main page with Citizen skin, anonymous edit blocked.

**Files.** None in repo. Operator-side state changes on Unraid (`/mnt/user/appdata/qwiki-beta/`) + Cloudflare dashboard (Tunnel route + DNS).

**Execution mode.** `inline` -- this is an operator-driven deploy. The commands are documented in `deploy/README.md` Task 7. The executor's role here is to run them, capture output, and confirm verification at each step. No code synthesis; subagent dispatch adds no value.

**Steps.**

- [ ] Confirm `apps/qwiki-sandbox/deploy/` artifacts (Tasks 4-7) are committed.
- [ ] Follow `apps/qwiki-sandbox/deploy/README.md` "First-time deploy" steps 1-9 in order:
  - Step 1: create appdata tree.
  - Step 2: scp compose + LocalSettings.
  - Step 3: author `.env`; chmod 600.
  - Step 4: clone Citizen at `v2.40.2`.
  - Step 5: `up -d mariadb`; wait healthy.
  - Step 6: run install.php (one-shot via `docker compose run --rm`).
  - Step 7: `up -d`; smoke-curl from `192.168.1.205:8081`.
  - Step 8: add CF Tunnel public hostname `wiki-beta.quake.world -> http://192.168.1.205:8081` via the Cloudflare dashboard.
  - Step 9: external curl + browser check.
- [ ] On any step failure: consult `deploy/README.md` Troubleshooting; do NOT modify the committed files mid-deploy. If a substantive change is needed, halt + escalate to operator for arc-amendment decision (D25).
- [ ] After successful deploy, commit + push the Phase 1 artifacts (Tasks 1-7) to `main` with a message like:
  `phase(qwiki-v1-beta): Phase 1 -- MW 1.39 + MariaDB + Citizen substrate at wiki-beta.quake.world`.

**Verification.** Phase-boundary verification (next section) is the gate for this task. See "Verification (phase boundary)" below.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of Phase 1. YES/NO answers per D24.

**V1. External HTTPS reachability.**

```bash
curl -sI https://wiki-beta.quake.world | head -5
```

- **PASS condition:** first line returns `HTTP/2 200` or `HTTP/2 301`/`HTTP/2 302` (a redirect to `/index.php` is acceptable; follow the redirect via `curl -sIL` to confirm 200 at the destination).
- **FAIL condition:** `Could not resolve host`, `Connection refused`, `HTTP/2 5xx`, or `HTTP/2 502` (CF Tunnel route or stack-internal connectivity issue; consult `deploy/README.md` Troubleshooting).

**V2. MW main page renders with Citizen skin.**

Open `https://wiki-beta.quake.world` in a browser.

- **PASS condition:** MW default main page visible; the page source contains `class="skin-citizen"` or `<body class="...citizen...">`; the left-rail nav matches Citizen's layout (not Vector's top nav).
- **FAIL condition:** Vector-style top nav (skin mount or `$wgDefaultSkin` misconfig), or "Internal error" (LocalSettings.php syntax error -- check `docker logs qwiki-mw`).

**V3. Anonymous edit is blocked.**

Open `https://wiki-beta.quake.world/index.php?title=Main_Page&action=edit` in an incognito window.

- **PASS condition:** MW responds with "you are not logged in" or "you do not have permission to edit this page" (the latter is the MW 1.39 wording for `$wgGroupPermissions['*']['edit'] = false`).
- **FAIL condition:** the edit form renders (anonymous edit permitted -- LocalSettings.php permissions block missing or overridden).

**V4. Containers are healthy on Unraid.**

```bash
ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'
```

- **PASS condition:** both `qwiki-mw` and `qwiki-mariadb` show `Up`; `qwiki-mariadb` shows `(healthy)`.
- **FAIL condition:** either container shows `Restarting`, `Exited`, or `qwiki-mariadb` shows `(unhealthy)` after >60s.

**V5. Database has the MW schema.**

```bash
ssh unraid 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && \
  docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
    mariadb -uroot -e "USE qwiki_beta; SHOW TABLES;"' | wc -l
```

- **PASS condition:** count >= 50 (MW 1.39 creates ~58 core tables; exact count varies with install options but is well above 50).
- **FAIL condition:** count == 0 (install.php didn't run, or ran against the wrong DB) or `ERROR 1045` (root password mismatch with `.env`).

(Sourcing `.env` then passing the password via `MYSQL_PWD` avoids grep/cut quoting bugs if the `.env` ever has surrounding quotes or trailing whitespace.)

**V6. Backup tarball includes qwiki-beta.**

The Unraid -> Synology backup script tars all of `/mnt/user/appdata/` per `unRAID/docs/server/backup.md`; there is no per-container include/exclude config to edit. This probe is purely confirmation that the auto-include actually picked up the new subdirectory once a backup cycle has run.

```bash
# (asynchronous) after the next Monday 04:00 cron, or after a manual backup run:
ssh unraid 'ls -t /mnt/remotes/NAS1618_backup/unraid-backup/*.tar.gz | head -1'
# Pick the timestamp; then confirm qwiki-beta is inside:
ssh unraid 'tar -tzf /mnt/remotes/NAS1618_backup/unraid-backup/<latest>.tar.gz | grep -c qwiki-beta'
```

- **PASS condition:** the latest tarball is newer than Phase 1 deploy time, and `tar -tzf` grep returns a positive count of `qwiki-beta` paths.
- **FAIL condition:** no backup tarball newer than Phase 1 deploy (wait for next Monday 04:00 cron) OR the tarball contains zero `qwiki-beta` entries (the appdata-backup script malfunctioned; consult `unRAID/docs/server/backup.md` Troubleshooting).

If V1-V5 PASS, the phase is green; V6 is asynchronous (depends on weekly backup cron) and operator monitors it the following Monday rather than blocking Phase 2 on it.

## Outputs to next phase

State now true that wasn't before Phase 1:

- MW 1.39 LTS + MariaDB 10.11 LTS running on Unraid at `192.168.1.205:8081`.
- `https://wiki-beta.quake.world` resolves via Cloudflare Tunnel to the MW container.
- Citizen skin v2.40.2 installed and set as the default.
- `qwiki_beta` MariaDB database initialized with the MW 1.39 core schema (~58 tables).
- Initial admin user `Admin` created (password from `MW_ADMIN_PASSWORD`); operator rotates via `Special:ChangePassword` post-deploy.
- Anonymous edit blocked at the `$wgGroupPermissions` level; anonymous read public.
- `apps/qwiki-sandbox/deploy/` (compose + LocalSettings + env example + README) committed to `main`.
- `apps/qwiki-sandbox/{CLAUDE.md, README.md, OVERVIEW.md}` rewritten to fresh-build language.
- Weekly Unraid -> Synology backup auto-includes `/mnt/user/appdata/qwiki-beta/` (no edit required).

Phase 2's inputs match this output set + the operator-side prereqs for extensions (no new operator prereqs required for Phase 2 since Page Forms + SMW install via repo checkout, mirror of Citizen).

## Open questions / deferred items

- **Question:** Pass 6 6.3 substrate item 4 names "php-fpm + nginx + MariaDB + extensions" but the official `mediawiki:1.39` Docker image bundles Apache + PHP. Phase 1 ships the Apache-bundled image because (a) Apache + PHP via the official image is the upstream-supported default, (b) the Apache 2.4 + PHP-FPM front-half is a deployment-detail choice that does not affect the substrate's observable behavior, (c) introducing a separate nginx + php-fpm split doubles the container count and the deploy complexity for no Phase 1 user-visible gain. The Pass 6 6.3 wording reads as illustrative ("how a MW stack typically composes"), not architectural lock-in.
  - **Default chosen for now:** official `mediawiki:1.39` image (Apache + PHP bundled).
  - **Who can resolve:** operator. If the Pass 6 wording was meant as a hard architectural lock-in, Phase 1 needs a redraft with an additional nginx-front + php-fpm container; if illustrative, this default stands.

- **Question:** LocalSettings.php bootstrap method -- the drafter prompt notes that install.php OR the web installer wizard are both acceptable. Phase 1 uses install.php via `docker compose run --rm` because it's reproducible (operator can re-run on a fresh container) and works without the wiki being publicly reachable yet (the web wizard would require CF Tunnel routing to a half-configured MW, which is awkward).
  - **Default chosen for now:** install.php CLI via `docker compose run --rm` (Task 8 step 6).
  - **Who can resolve:** operator. If the web installer is preferred for visual feedback, the deploy README's step 6 changes; the artifact set (compose + LocalSettings + env) is unchanged.

- **Question:** Should the install.php run preserve the generated LocalSettings.php as a sanity diff against the hand-authored one? Phase 1 discards it (`--rm` on the container; the generated file dies with the container). Saving it would allow operator to diff against the hand-authored file to catch missed config knobs.
  - **Default chosen for now:** discard. The hand-authored LocalSettings.php is reviewed via sub-agent verification (this phase) + operator review at the phase boundary; the install.php-generated file would mostly differ by including a hardcoded admin password and a random `$wgSecretKey` -- both surfaced via `getenv()` in the hand-authored version.
  - **Who can resolve:** operator. Low-stakes; can be revisited in any phase.

- **Question:** Citizen skin pin -- v2.40.2 is the documented MW-1.39-compatible tag. The skin's main branch requires MW 1.43+. Pinning is correct for Phase 1; the question is whether to upgrade Citizen when MW upgrades (out-of-scope this arc; future arc when MW 1.39 LTS hits EOL Dec 2027).
  - **Default chosen for now:** v2.40.2 pinned via `git clone --branch v2.40.2 --depth 1`.
  - **Who can resolve:** future arc (MW upgrade arc, not before Dec 2027 per D2 LTS choice).

## Recovery (if verification fails)

Per-failure-mode recovery; anticipatable failures only. Unanticipated failures route to operator.

- **V1 fails with `Could not resolve host`:** Cloudflare DNS record for `wiki-beta` was not created or hasn't propagated yet. Check the Cloudflare dashboard's DNS section; the tunnel public-hostname entry should have auto-created a proxied CNAME. Wait 60s; re-test. If still failing, manually add the CNAME pointing at the tunnel.
- **V1 returns HTTP 502:** Cloudflare Tunnel public hostname misroute. Re-check the dashboard entry: service must be `http://192.168.1.205:8081` (not `https`, not the Tailscale IP `100.114.81.91`). Restart cloudflared on Unraid if persistent: `ssh unraid 'docker restart cloudflared'` (or the equivalent for the operator's tunnel setup).
- **V2 renders the page without Citizen skin:** the skin volume mount is wrong or `$wgDefaultSkin` is set to a different skin. Probe `docker exec qwiki-mw ls /var/www/html/skins/Citizen/skin.json`; if that fails, re-run the Citizen git clone (deploy README step 4) and `restart mw`. If the file exists, confirm `LocalSettings.php` has both `wfLoadSkin( 'Citizen' );` AND `$wgDefaultSkin = "citizen";`.
- **V3 allows anonymous edit:** `$wgGroupPermissions` block in LocalSettings.php was overridden by an `if` or `wfLoadExtension` call later in the file, or LocalSettings.php is not actually being read by the container. Probe `docker exec qwiki-mw cat /var/www/html/LocalSettings.php | head -20` to confirm the mounted file is in place; re-scp from operator's WSL if drifted.
- **V4 shows `qwiki-mw` restarting:** check `docker logs qwiki-mw --tail 50`. Most likely: PHP syntax error in LocalSettings.php (run `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` from WSL) or DB unreachable (MariaDB healthcheck not yet green; wait + retry).
- **V5 returns 0 tables:** install.php did not run, or ran against a different DB name. Re-run deploy README step 6 with `set -x` to see the exact docker-compose command; verify `MARIADB_ROOT_PASSWORD` in `.env` matches what MariaDB was initialized with (if the `.env` was edited after first `up -d mariadb`, the container kept the original root password -- recovery is `docker compose down -v mariadb` to wipe the volume, then re-up; only safe at first-time deploy).

---

*Phase 1 ships when V1-V5 PASS. Phase 2 (Page Forms + Semantic MediaWiki) is unblocked once Phase 1 is committed + pushed.*
