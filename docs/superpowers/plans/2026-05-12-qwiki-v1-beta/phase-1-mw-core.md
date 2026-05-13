# Phase 1 -- MW core substrate

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (table at bottom of that file).
> 3. Read prior approved phase MDs (Phase 1, Phase 2, ...) -- their "Outputs to next phase" sections name what state this phase inherits.
> 4. After drafting, dispatch the verification sub-agent (brief at bottom of this template).

## Goal

Stand up the qwiki-v1-beta MediaWiki 1.43 LTS substrate on Unraid as a **three-container stack** per D2 amendment 2026-05-13 (with the same-day #2 amendment locking current-stable versions): `nginx:1.30-alpine` front + `mediawiki:1.43-fpm` (official upstream php-fpm variant, ships PHP 8.3) + `mariadb:11.4` LTS. Citizen skin pinned to v3.16.0 (current release; requires MW 1.43+). Cloudflare Tunnel routes `https://wiki-beta.quake.world` -> Unraid LAN at `192.168.1.205:8081`. nginx serves static assets directly from a shared `/var/www/html` volume and proxies `.php` requests via fastcgi to `mediawiki:9000`. No extensions installed in this phase (Page Forms + Semantic MediaWiki come in Phase 2); no auth installed (PluggableAuth + Discord OAuth come in Phase 3); no quality-tag categories or harvest-path tasks (those come in Phase 4). MW default `$wgGroupPermissions['*']['edit'] = false` is preserved, so anonymous read access works and anonymous edit is blocked.

The pre-pivot `apps/qwiki-sandbox/` docs (CLAUDE.md / README.md / OVERVIEW.md) get rewritten to fresh-build language as part of this phase; the directory becomes the deploy + curator tooling home for the v1-beta substrate.

**Runnable state at phase boundary:** from operator's WSL, `curl -sI https://wiki-beta.quake.world | head -5` returns `HTTP/2 200`; visiting the URL in a browser shows the MW main page rendered with Citizen skin (left-rail TOC visible, dark-mode toggle reachable); attempting to anonymously edit the main page surfaces a "permission denied" or "you must be logged in" message; on Unraid `docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps` shows `qwiki-nginx`, `qwiki-mediawiki`, and `qwiki-mariadb` all running and (where healthcheck applies) healthy.

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
apps/qwiki-sandbox/deploy/docker-compose.prod.yml           # three-service stack (nginx + mediawiki-fpm + mariadb) (committed)
apps/qwiki-sandbox/deploy/nginx.conf                        # MW-specific nginx config; fastcgi to mediawiki:9000 (committed)
apps/qwiki-sandbox/deploy/.env.prod.example                 # secrets template (committed; real .env lives on Unraid only)
apps/qwiki-sandbox/deploy/LocalSettings.php                 # hand-authored MW config; secrets via getenv() (committed)
apps/qwiki-sandbox/deploy/README.md                         # deploy runbook (first-time + redeploy + troubleshoot)
```

On Unraid (operator-created during deploy, not in git):

```
/mnt/user/appdata/qwiki-beta/                               # parent dir; included in weekly backup tarball per D3
/mnt/user/appdata/qwiki-beta/docker-compose.prod.yml        # scp'd from apps/qwiki-sandbox/deploy/
/mnt/user/appdata/qwiki-beta/nginx.conf                     # scp'd from apps/qwiki-sandbox/deploy/
/mnt/user/appdata/qwiki-beta/LocalSettings.php              # scp'd from apps/qwiki-sandbox/deploy/
/mnt/user/appdata/qwiki-beta/.env                           # operator-authored from .env.prod.example, chmod 600
/mnt/user/appdata/qwiki-beta/mariadb-data/                  # MariaDB data volume (bind mount)
/mnt/user/appdata/qwiki-beta/mediawiki-data/                # MW uploaded images + cache (bind mount, /var/www/html/images)
/mnt/user/appdata/qwiki-beta/mediawiki-html/                # MW core source tree (bind mount, /var/www/html); extracted from mediawiki:1.43-fpm image at first deploy
/mnt/user/appdata/qwiki-beta/citizen/                       # Citizen skin tree, git-checked-out at v3.16.0 (overlay bind, /var/www/html/skins/Citizen)
```

The `mediawiki-html/` tree is populated by a one-time `docker create + docker cp + docker rm` extraction from the `mediawiki:1.43-fpm` image at first deploy, and refreshed on each MW image bump via the documented procedure in `deploy/README.md`. Living under `/mnt/user/appdata/` means it's inspectable from Unraid GUI and included in the weekly Synology backup tarball (D3). No named docker volumes; bind-mounts only.

### Modified

```
apps/qwiki-sandbox/CLAUDE.md                                # pre-pivot modernize-in-place language -> fresh-build language; reference v1-beta arc + three-container topology
apps/qwiki-sandbox/README.md                                # pre-pivot quick-start -> fresh-build quick-start; mention nginx + mediawiki-fpm + MariaDB stack
apps/qwiki-sandbox/OVERVIEW.md                              # replace pre-pivot 6-phase plan with arc phase index pointer + current state
```

### Deleted

n/a -- no files removed in this phase. `apps/qwiki-sandbox/VISION.md` already documents the pivot (its "Pivoted 2026-05-09 evening" preamble + ORIGINAL VISION appendix); no edit needed.

## Tasks

### Task 1 -- Rewrite apps/qwiki-sandbox/CLAUDE.md to fresh-build language

**Goal.** Replace the pre-pivot modernize-in-place description with fresh-build / Modes-mini-arc language. The CLAUDE.md is the cold entry-point any Claude terminal lands on when working in `apps/qwiki-sandbox/`; it must reflect what this directory actually holds (v1-beta deploy + Modes curator tool home) and the three-container topology, not the pre-pivot intent.

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
| Deploy runbook (Unraid + Cloudflare Tunnel + nginx + mediawiki-fpm + MariaDB + Citizen) | `deploy/README.md` (after Phase 1 ships) |
| Arc plan + decisions + phase MDs | `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/` (repo-root tree) |
| Modes curator tool (after Phase 6 ships) | `scripts/curate-modes/CLAUDE.md` |
| Source dumps | `dumps/` (gitignored) |

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `deploy/` | `deploy/README.md` (Phase 1) | Three-container compose (nginx + mediawiki-fpm + mariadb) + nginx.conf + LocalSettings.php + env example for Unraid prod stack |
| `scripts/curate-modes/` | TBD (Phase 6) | Modes triage curator tool, brand-curator pattern |
| `dumps/` | n/a | Gitignored; ciscon's old-wiki SQL dump + image tarball (reference) |

## Always-on rules

- `dumps/` is gitignored. SQL dump + image tarball are large; never commit them.
- New-build wiki content is authored in the live wiki (form-driven via Page Forms after Phase 2); not in this repo. This directory is for substrate + tooling, not page content.
- `LocalSettings.php` in `deploy/` carries secrets via `getenv()` so the file is safe to commit. Real secrets live in `/mnt/user/appdata/qwiki-beta/.env` on Unraid (mode 600, not in repo).
- The prod stack is three containers: `qwiki-nginx` (CF Tunnel-facing on `192.168.1.205:8081`), `qwiki-mediawiki` (php-fpm at port 9000, internal-net-only), `qwiki-mariadb` (internal-net-only). The MW source tree at `/var/www/html` is a shared host bind-mount from `/mnt/user/appdata/qwiki-beta/mediawiki-html/`, extracted from the mediawiki image at first deploy and refreshed via the documented procedure on each MW image bump.
- Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is NOT the current plan. Current plan: arc at `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`.

## Related

- Sister project: `apps/qw-oracle/` -- the QW knowledge service that ingests wiki content via the Layer 3 harvest path (verified during Phase 4 of this arc).
- Arc spec: `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED 2026-05-12).
- Operator memory: `project_qwiki_sandbox_passes.md` (pass tracker), `project_qwiki_sandbox_genesis.md` (origin context).
```

**Verification.** `head -1 apps/qwiki-sandbox/CLAUDE.md` returns `# QWiki Sandbox -- v1-beta substrate + Modes mini-arc`. `grep -c "nginx + mediawiki-fpm + MariaDB\|nginx.*mediawiki.*mariadb\|three.container" apps/qwiki-sandbox/CLAUDE.md` returns >= 1.

### Task 2 -- Rewrite apps/qwiki-sandbox/README.md to fresh-build quick-start

**Goal.** Replace the pre-pivot quick-start with a fresh-build-aligned README. Same shape as the existing one (sections: what this is, status, files, plan) but updated content; topology line names the three-container stack.

**Files.** `apps/qwiki-sandbox/README.md`.

**Execution mode.** `inline` -- full file content shipped inline; pure documentation (D22 / D26).

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/README.md` with the content block below.

Full file content to write:

```markdown
# qwiki-sandbox

Fresh-build MediaWiki 1.43 substrate for the v1-beta successor wiki at `wiki-beta.quake.world`, plus the Modes-mini-arc curator tool home.

## What this is

The deploy + tooling home for the qwiki-v1-beta arc (`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`). Pivoted 2026-05-09 from a modernize-in-place clone to a fresh-build successor with selective extract from the old wiki.

The live wiki at https://www.quakeworld.nu/wiki/ (MediaWiki 1.35.10 + PHP 7.4) is the extraction source; the v1-beta wiki at https://wiki-beta.quake.world is the new substrate. Cutover from beta to the live URL is a future arc (not this one).

## Status

After Phase 1 of the arc ships: a three-container stack (nginx 1.30-alpine + mediawiki:1.43-fpm + mariadb:11.4) + Citizen skin v3.16.0 live at wiki-beta.quake.world. Phase 2 adds Page Forms + Semantic MediaWiki. Phase 3 wires PluggableAuth + Discord OAuth. Phase 4 adds quality-tag categories + verifies the Layer 3 harvest path end-to-end. Phases 5-8 ship the Modes mini-arc.

Old-wiki dumps remain at `dumps/` (gitignored) for per-domain extracts.

## Files

- `deploy/` -- three-container compose + nginx.conf + LocalSettings.php + deploy runbook (after Phase 1)
- `scripts/curate-modes/` -- Modes triage curator tool (after Phase 6)
- `dumps/` -- gitignored, holds ciscon's SQL dump + image tarball (reference)
- `CLAUDE.md` -- entry-point for Claude sessions touching this directory
- `VISION.md` -- fresh-build scope; preserves pre-pivot vision in an appendix
- `OVERVIEW.md` -- arc-phase status + current state

## Plan

See `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` for the eight-phase index. This directory is touched by Phase 1 (deploy) and Phase 6 (curator tool).
```

**Verification.** `head -1 apps/qwiki-sandbox/README.md` returns `# qwiki-sandbox`. `grep -c "nginx.*1\.27\|mediawiki:1\.39-fpm\|mariadb:10\.11" apps/qwiki-sandbox/README.md` returns >= 1.

### Task 3 -- Rewrite apps/qwiki-sandbox/OVERVIEW.md to arc-aware living-state

**Goal.** Replace the pre-pivot 6-phase plan with a pointer to the arc + current state of the substrate. OVERVIEW.md is the "living map" doc per monorepo convention; it shows what is and isn't deployed right now, and names the three-container topology in the substrate state section.

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

After Phase 1 ships: a three-container Docker stack on Unraid -- `qwiki-nginx` (nginx 1.30-alpine, the CF Tunnel-facing entry point) + `qwiki-mediawiki` (mediawiki:1.43-fpm, php-fpm at port 9000) + `qwiki-mariadb` (mariadb 11.4 LTS) -- plus the Citizen skin v3.16.0 git checkout. Vanilla; no extensions; no auth (anonymous read works, anonymous edit blocked). Live at `wiki-beta.quake.world` via Cloudflare Tunnel.

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

Cross-cutting decisions live in the arc's `decisions.md` (D1-D26, locked 2026-05-12; D2 amended 2026-05-13 to lock nginx + php-fpm + MariaDB composition). No project-internal decisions log; if a phase needs to deviate from a locked decision, the phase MD's "Deviation" section + operator review handles it (per D25).
```

**Verification.** `grep -c "^| [0-9]" apps/qwiki-sandbox/OVERVIEW.md` returns `0` (no phase table; pointer-to-arc instead). `grep -c "qwiki-nginx.*qwiki-mediawiki.*qwiki-mariadb\|three-container" apps/qwiki-sandbox/OVERVIEW.md` returns >= 1.

### Task 4 -- Author apps/qwiki-sandbox/deploy/docker-compose.prod.yml

**Goal.** Three-service compose stack: `nginx:1.30-alpine` front + `mediawiki:1.43-fpm` + `mariadb:11.4`. nginx is the only service that binds a host port (Unraid LAN `192.168.1.205:8081:80`) so CF Tunnel can reach it; mediawiki + mariadb are internal-network-only. The `/var/www/html` MW source tree is shared between nginx (read-only) and mediawiki (read-write) via a **host bind-mount** at `/mnt/user/appdata/qwiki-beta/mediawiki-html/`, extracted from the mediawiki image at first deploy via a documented `docker create + docker cp` step. Bind-mount chosen over named docker volume to (a) avoid the silent-staleness footgun on image bumps, (b) keep MW source inspectable from Unraid GUI, (c) get it into the weekly Synology backup tarball for free. Mirrors the qw-oracle precedent for the nginx + fastcgi + appdata-bind-mount pattern.

**Files.** `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` (new), `apps/qwiki-sandbox/deploy/` (parent dir, new).

**Execution mode.** `inline` -- full file content shipped inline; no code synthesis (D22). The compose shape is mechanical once the substitution values (image tags / volume paths / port binding) are locked.

**Steps.**

- [ ] Create the `apps/qwiki-sandbox/deploy/` directory: `mkdir -p apps/qwiki-sandbox/deploy`.
- [ ] Write `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` with the content below.

Full file content to write:

```yaml
# apps/qwiki-sandbox/deploy/docker-compose.prod.yml
# Unraid stack for qwiki-v1-beta: nginx 1.30-alpine + MediaWiki 1.43 (fpm)
# + MariaDB 11.4 LTS. nginx fronts both static-asset serving (from the
# shared mediawiki-html bind mount) and fastcgi proxying to mediawiki:9000.
#
# Operator workflow (see deploy/README.md). All persistent data lives under
# /mnt/user/appdata/qwiki-beta/, which is on the weekly Unraid -> Synology
# backup (D3). That includes the MW source tree at mediawiki-html/, which
# the operator extracts from the mediawiki:1.43-fpm image once at first deploy
# and refreshes on each MW image bump via the documented procedure in
# deploy/README.md. No named docker volumes; bind-mounts only.

services:
  mariadb:
    image: mariadb:11.4
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

  mediawiki:
    image: mediawiki:1.43-fpm
    container_name: qwiki-mediawiki
    restart: unless-stopped
    depends_on:
      mariadb:
        condition: service_healthy
    environment:
      # Surfaced to LocalSettings.php via getenv(); see deploy/LocalSettings.php.
      MW_DB_PASSWORD: ${MW_DB_PASSWORD}
      MW_SECRET_KEY: ${MW_SECRET_KEY}
      MW_UPGRADE_KEY: ${MW_UPGRADE_KEY}
    volumes:
      # Shared MW source tree -- nginx mounts the same host path read-only.
      # mediawiki-html is populated once at first-time deploy via the
      # docker-create + docker-cp extraction step in deploy/README.md;
      # refreshed on each MW image bump via the documented procedure.
      # Living on /mnt/user/appdata/ means it's inspectable from Unraid GUI
      # and included in the weekly Synology backup tarball (D3).
      - /mnt/user/appdata/qwiki-beta/mediawiki-html:/var/www/html
      # Persistent uploaded images + cache; survives container rebuild.
      - /mnt/user/appdata/qwiki-beta/mediawiki-data:/var/www/html/images
      # Citizen skin overlay (git-checked-out v3.16.0 on host); read-only.
      - /mnt/user/appdata/qwiki-beta/citizen:/var/www/html/skins/Citizen:ro
      # Hand-authored LocalSettings.php overlay; read-only.
      - /mnt/user/appdata/qwiki-beta/LocalSettings.php:/var/www/html/LocalSettings.php:ro
    networks:
      - qwiki-net
    # No host port: the only public reachability is via nginx -> Cloudflare
    # Tunnel. Direct port exposure would skip CF rate limiting and bypass the
    # nginx static-asset serving + fastcgi entry-point whitelisting.

  nginx:
    image: nginx:1.30-alpine
    container_name: qwiki-nginx
    restart: unless-stopped
    depends_on:
      - mediawiki
    ports:
      # Bind to the Unraid host's LAN address (192.168.1.205) only -- the
      # existing Cloudflare Tunnel agent routes wiki-beta.quake.world to this
      # address from the same Unraid box. Loopback would not be reachable from
      # the cloudflared container (separate network namespace); 0.0.0.0 would
      # expose the wiki on the LAN without Cloudflare's edge protection.
      - "192.168.1.205:8081:80"
    volumes:
      # nginx config via conf.d include shape (default.conf replaces the bundled
      # one). Operator scp's apps/qwiki-sandbox/deploy/nginx.conf here.
      - /mnt/user/appdata/qwiki-beta/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      # Same MW source tree as the mediawiki container, read-only.
      - /mnt/user/appdata/qwiki-beta/mediawiki-html:/var/www/html:ro
      # Same uploaded-images bind as mediawiki, read-only.
      - /mnt/user/appdata/qwiki-beta/mediawiki-data:/var/www/html/images:ro
      # Same Citizen skin overlay, read-only.
      - /mnt/user/appdata/qwiki-beta/citizen:/var/www/html/skins/Citizen:ro
    networks:
      - qwiki-net

networks:
  qwiki-net:
    name: qwiki-net
    driver: bridge
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml && echo OK` returns `OK`. `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config -q && echo OK` returns `OK` (valid compose syntax; runs offline). `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config --services | sort | tr '\n' ' '` returns `mariadb mediawiki nginx ` (three services).

### Task 5 -- Author apps/qwiki-sandbox/deploy/nginx.conf

**Goal.** MW-specific nginx config: serve static assets directly from the shared `/var/www/html` surface; proxy `.php` to `mediawiki:9000` via fastcgi with proper SCRIPT_FILENAME + PATH_INFO splitting; deny direct access to LocalSettings.php, `.git`, `/maintenance`, `/vendor`, `/cache`, `/tests`, and the deleted-images trashbin; cache skin/extension/resource assets for 7 days. The wiki lives at the apex (`$wgScriptPath = ""`), so no `/w/` prefix; URL shape is `/index.php?title=PageName` (or `/index.php/PageName` with `$wgUsePathInfo = true`).

TLS is terminated at Cloudflare Tunnel; nginx is HTTP-only inside the qwiki-net bridge.

**Files.** `apps/qwiki-sandbox/deploy/nginx.conf`.

**Execution mode.** `inline` -- full file content shipped inline; no code synthesis. The MW canonical nginx pattern is well-known (the upstream `Manual:Short_URL/Nginx` form, with the `/w/` prefix dropped for apex deployment).

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/nginx.conf` with the content below.

Full file content to write:

```nginx
# apps/qwiki-sandbox/deploy/nginx.conf
# nginx <-> php-fpm front for MediaWiki 1.43 on the apex of wiki-beta.quake.world.
# Companion to docker-compose.prod.yml: this file is mounted into the qwiki-nginx
# container at /etc/nginx/conf.d/default.conf, replacing the bundled default.conf.
# The shared MW source tree lives at /var/www/html (the
# /mnt/user/appdata/qwiki-beta/mediawiki-html host bind-mount, mounted
# read-only here). The mediawiki php-fpm container is
# reachable on the qwiki-net bridge as `mediawiki:9000`.
#
# TLS terminates at Cloudflare Tunnel; nginx speaks HTTP-only on port 80.

server {
    listen 80 default_server;
    server_name _;

    root /var/www/html;
    index index.php;

    # Allow reasonably large uploads (Phase 2 + onward may raise this if
    # contributors upload demo files / screenshot bundles).
    client_max_body_size 100M;

    # Cloudflare Tunnel sets X-Forwarded-For; LocalSettings.php sets
    # $wgUsePrivateIPs = true so MW honors the forwarded client IP.
    real_ip_header X-Forwarded-For;

    # ---- Deny: sensitive files at any depth ----
    # LocalSettings.php, dotfiles, composer manifests, env files. Drop before
    # any try_files or fastcgi pass touches them.
    location ~ ^/LocalSettings\.php$ {
        deny all;
    }
    location ~ /\.(?!well-known) {
        deny all;
    }
    location ~ ^/(composer\.json|composer\.lock|package\.json|yarn\.lock)$ {
        deny all;
    }

    # ---- Deny: MW internal directories ----
    location ~ ^/(maintenance|tests|vendor|cache)(/|$) {
        deny all;
    }
    # Block direct .php under includes/ etc. (entry-points are whitelisted
    # explicitly below; everything else is not user-reachable).
    location ~ ^/(includes|languages|mw-config/.+/)(.+\.php)$ {
        deny all;
    }

    # ---- Static asset serving ----

    # Uploaded images. Bind-mounted from host; served directly. nosniff per
    # MW recommendation. The deleted-images trashbin is denied separately
    # below.
    location ^~ /images/deleted {
        deny all;
    }
    location ^~ /images/ {
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    # Skin / extension / resource assets -- cached 7 days.
    location ~ ^/(skins|extensions|resources)/.+\.(css|js|gif|jpe?g|png|svg|woff2?|ttf|ico|webp|map)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }

    # favicon + robots, served straight.
    location = /favicon.ico {
        try_files $uri =404;
        log_not_found off;
        access_log off;
    }
    location = /robots.txt {
        try_files $uri =404;
        log_not_found off;
        access_log off;
    }

    # ---- MW entry-point PHP routing (fastcgi -> mediawiki:9000) ----

    # Whitelisted entry points. The (/|$) tail lets PATH_INFO-style URLs like
    # /index.php/PageName parse correctly under $wgUsePathInfo = true.
    location ~ ^/(index|load|api|thumb|opensearch_desc|rest|img_auth|mw-config/index)\.php(/|$) {
        # Split SCRIPT_NAME ($fastcgi_script_name) from PATH_INFO.
        fastcgi_split_path_info ^(.+?\.php)(/.*)?$;
        # If the .php file the URL resolved to doesn't exist on disk, 404 (do
        # not pass to fpm). MW's $document_root is the same surface nginx
        # sees, so disk presence is authoritative.
        try_files $fastcgi_script_name =404;

        fastcgi_pass mediawiki:9000;
        fastcgi_index index.php;

        # Standard params bundle (nginx ships fastcgi_params with SCRIPT_NAME,
        # QUERY_STRING, REQUEST_METHOD, CONTENT_TYPE, etc.).
        include fastcgi_params;

        # Override the path-related params with our split values.
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;

        # CF Tunnel terminates TLS; tell MW we're behind HTTPS so generated
        # URLs in templates use https://.
        fastcgi_param HTTPS on;
        fastcgi_param REQUEST_SCHEME https;
    }

    # ---- Catch-all routing ----

    # Anything not matched above: try static, else 404. Visiting / sends an
    # empty try_files chain; the location-= block below handles the root.
    location / {
        try_files $uri $uri/ =404;
    }

    # Root request: redirect to /index.php?title=Main_Page (MW would do this
    # too via its internal redirect, but doing it here saves a PHP roundtrip
    # for the most common request).
    location = / {
        return 301 /index.php?title=Main_Page;
    }
}
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/nginx.conf && echo OK` returns `OK`. The full `nginx -t` syntax check happens during deploy when the file is mounted into the container; an offline syntax check can be approximated with `docker run --rm -v $(pwd)/apps/qwiki-sandbox/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:1.30-alpine nginx -t` from a host with Docker.

### Task 6 -- Author apps/qwiki-sandbox/deploy/.env.prod.example

**Goal.** Template for the operator-authored `.env` on Unraid. All secrets are placeholders. The committed `.env.prod.example` is the source of truth for which env vars exist; the real `.env` on Unraid carries the actual values. Same five vars as the Apache draft -- no nginx-specific secrets needed (TLS terminates at CF Tunnel, not nginx).

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

**Verification.** `test -f apps/qwiki-sandbox/deploy/.env.prod.example && echo OK` returns `OK`. `grep -c "^MW_" apps/qwiki-sandbox/deploy/.env.prod.example` returns `4`. `grep -c "^MARIADB_" apps/qwiki-sandbox/deploy/.env.prod.example` returns `1`.

### Task 7 -- Author apps/qwiki-sandbox/deploy/LocalSettings.php

**Goal.** Hand-authored `LocalSettings.php` for MW 1.43, configured for `wiki-beta.quake.world` + Citizen skin + MW-default anonymous-edit restriction. Secrets read via `getenv()` from the Unraid `.env`. This file is committed (no plaintext secrets); the running mediawiki container picks it up via the read-only volume mount declared in Task 4. Same content as the original Apache+PHP draft -- nginx + php-fpm vs Apache + PHP is invisible at the LocalSettings.php level (MW reads the same settings either way).

**Files.** `apps/qwiki-sandbox/deploy/LocalSettings.php`.

**Execution mode.** `inline` -- full file content shipped inline; no code synthesis required at execute time. (Drafter is responsible for verifying the inlined content against MW 1.43 docs; sub-agent verification confirms.)

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/LocalSettings.php` with the content below.

Full file content to write:

```php
<?php
# apps/qwiki-sandbox/deploy/LocalSettings.php
# MediaWiki 1.43 LTS configuration for qwiki-v1-beta (wiki-beta.quake.world).
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

# Make MW trust the X-Forwarded-Proto / X-Forwarded-For headers that
# Cloudflare Tunnel + the nginx front set, so MW generates https:// URLs
# and logs the real client IP.
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
# PHP APCu when available (the official mediawiki:1.43-fpm image ships APCu).
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

# Citizen v3 options. Phase 1 keeps defaults; wiki-specific tuning (left-rail
# TOC behavior, dark-mode default, search subsystem) lands in subsequent
# phases as authoring conventions firm up. Note: the v2-era
# $wgCitizenEnableCommandPalette option was removed in Citizen v3 (search
# subsystem renamed); the v3 default is already what we want.

# --- Permissions ----------------------------------------------------------

# MW defaults already block anonymous edit ($wgGroupPermissions['*']['edit'] = false
# is the documented MW 1.43 default). Setting it explicitly here makes the
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

# Honor X-Forwarded-For from CF Tunnel + nginx for accurate IP logging.
$wgUseCdn = false;
$wgUsePathInfo = true;
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/LocalSettings.php && echo OK` returns `OK`. `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` returns `No syntax errors detected` (requires PHP CLI in WSL; alternatively defer to the install.php run on Unraid as the integration check).

### Task 8 -- Author apps/qwiki-sandbox/deploy/README.md

**Goal.** Deploy runbook for the three-container stack: first-time setup, redeploy, operator commands, troubleshooting. Same shape as `apps/qw-oracle/DEPLOYMENT.md`. The runbook is the source of truth the operator follows when executing the Phase 1 deploy (Task 9).

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
            -> qwiki-nginx container (qwiki-net, port 8081 on LAN -> 80 in container)
                 -> qwiki-mediawiki container (qwiki-net, php-fpm on port 9000)
                      -> qwiki-mariadb container (qwiki-net)
```

Persistent data and configs live at `/mnt/user/appdata/qwiki-beta/`:

- `mariadb-data/`             - MariaDB state. Covered by the weekly Unraid -> Synology backup.
- `mediawiki-data/`           - MW uploaded images + cache (`/var/www/html/images`).
- `mediawiki-html/`           - MW core source tree (`/var/www/html`). Extracted from `mediawiki:1.43-fpm` at first deploy; refreshed on each MW image bump per the procedure below.
- `citizen/`                  - Citizen skin git checkout at v3.16.0 (overlays `/var/www/html/skins/Citizen`).
- `docker-compose.prod.yml`   - scp'd from `apps/qwiki-sandbox/deploy/`.
- `nginx.conf`                - scp'd from `apps/qwiki-sandbox/deploy/`.
- `LocalSettings.php`         - scp'd from `apps/qwiki-sandbox/deploy/`.
- `.env`                      - operator-authored from `.env.prod.example`, mode 600.

All paths live under `/mnt/user/appdata/qwiki-beta/`, which is on the weekly Unraid -> Synology backup tarball (D3). No named docker volumes are used; this keeps MW source inspectable from the Unraid GUI and recoverable from backup without re-pulling images.

## Prerequisites

- Tailscale up; `ssh unraid 'echo ok'` returns `ok`.
- Cloudflare account access to the `quake.world` zone + Tunnel admin.
- Existing `cloudflared` Tunnel agent running on Unraid (same one fronting `oracle.slipgate.me` for qw-oracle).

## First-time deploy

1. Create the Unraid appdata directory tree:

   ```bash
   ssh unraid 'mkdir -p /mnt/user/appdata/qwiki-beta/{mariadb-data,mediawiki-data,mediawiki-html,citizen}'
   ```

2. Copy compose + nginx + LocalSettings to Unraid:

   ```bash
   scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
       apps/qwiki-sandbox/deploy/nginx.conf \
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

4. Clone the Citizen skin at v3.16.0:

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     git clone --branch v3.16.0 --depth 1 \
       https://github.com/StarCitizenTools/mediawiki-skins-Citizen.git citizen'
   ```

   v3.16.0 is the current Citizen release; the v3 line requires MW 1.43+
   (Citizen's `skin.json` declares `MediaWiki >= 1.43.0`). Bump on Citizen
   patch / minor releases freely; the eventual Citizen v4 line may move to
   MW 1.47 LTS, at which point coordinate with an MW upgrade arc.

5. Extract MW core source from the `mediawiki:1.43-fpm` image into the host
   bind-mount tree. One-shot operation; only re-run during MW image bumps
   (see "Routine MW image bump procedure" below).

   ```bash
   ssh unraid 'docker pull mediawiki:1.43-fpm && \
     docker create --name qwiki-mw-extract mediawiki:1.43-fpm && \
     docker cp qwiki-mw-extract:/var/www/html/. /mnt/user/appdata/qwiki-beta/mediawiki-html/ && \
     docker rm qwiki-mw-extract'
   ```

   The trailing `/.` on the `docker cp` source means "copy contents of
   `/var/www/html`" (so the files land directly in `mediawiki-html/`, not
   in `mediawiki-html/html/`). After this, `ls /mnt/user/appdata/qwiki-beta/mediawiki-html/`
   should show MW core files like `index.php`, `api.php`, `includes/`,
   `maintenance/`, `skins/Vector/`, `skins/MonoBook/`, `skins/Timeless/`,
   `resources/`, etc. (The host's `mediawiki-html/skins/Citizen/` is whatever
   the image bundles for that path -- likely empty / nonexistent -- and gets
   masked at container runtime by the `citizen/` overlay bind mount. The
   host's `mediawiki-html/images/` is similarly masked by `mediawiki-data/`.
   This is intentional and harmless.)

6. Bring MariaDB up alone first (this also creates the qwiki-net bridge that
   the install.php run will join):

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     docker compose -f docker-compose.prod.yml up -d mariadb && \
     docker compose -f docker-compose.prod.yml ps'
   ```

   Wait until `qwiki-mariadb` shows `State: Up (healthy)`. The healthcheck uses
   MariaDB's `healthcheck.sh --connect --innodb_initialized` (10s interval).

7. Run install.php to bootstrap the DB schema + initial admin user. We use
   `docker run` directly here (NOT `docker compose run`) so install.php does
   not inherit the LocalSettings.php read-only bind mount from the compose
   service definition -- a bind-mounted read-only LocalSettings.php would
   make install.php either fail (cannot write) or short-circuit with "already
   installed". The `--confpath=/tmp` flag tells install.php to write its
   generated LocalSettings.php into the container's /tmp (which dies with
   --rm), leaving the host-side hand-authored file in place.

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     set -a && . ./.env && set +a && \
     docker run --rm \
       --network qwiki-net \
       -e MW_DB_PASSWORD="$MW_DB_PASSWORD" \
       mediawiki:1.43-fpm \
       php /var/www/html/maintenance/install.php \
         --confpath=/tmp \
         --dbtype=mysql --dbserver=mariadb \
         --dbname=qwiki_beta --dbuser=qwiki --dbpass="$MW_DB_PASSWORD" \
         --installdbuser=root --installdbpass="$MARIADB_ROOT_PASSWORD" \
         --server="https://wiki-beta.quake.world" --scriptpath="" --lang=en \
         --pass="$MW_ADMIN_PASSWORD" \
         "QuakeWorld Wiki (beta)" "Admin"'
   ```

   Expected output ends with something like `Done.` after a sequence of
   `Creating tables` / `Populating ...` lines. The DB now has the MW core
   schema (~58 tables).

8. Start the full three-container stack:

   ```bash
   ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
     docker compose -f docker-compose.prod.yml up -d && \
     docker compose -f docker-compose.prod.yml ps'
   ```

   The mediawiki + nginx containers both read MW source from the
   `mediawiki-html/` bind mount that step 5 populated; child overlay binds
   (mediawiki-data, citizen, LocalSettings.php) mask the corresponding paths
   inside the bind-mount tree. Wait until all three containers
   (`qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb`) show `Up`.

   Sanity-check the nginx config:

   ```bash
   ssh unraid 'docker exec qwiki-nginx nginx -t'
   # Expect: nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```

   Local smoke test (from Unraid itself):

   ```bash
   ssh unraid 'curl -sI http://192.168.1.205:8081/'
   # Expect: HTTP/1.1 301 (redirect from / to /index.php?title=Main_Page).
   ssh unraid 'curl -sI http://192.168.1.205:8081/index.php?title=Main_Page'
   # Expect: HTTP/1.1 200 OK with Content-Type: text/html.
   ```

9. Add the Cloudflare Tunnel route. From the Cloudflare dashboard
   (`Zero Trust -> Access -> Tunnels`):

   - Pick the existing tunnel that already fronts `oracle.slipgate.me` (or the
     equivalent Unraid tunnel; check `cloudflared` config if uncertain).
   - Add a public hostname entry:
     - Subdomain: `wiki-beta`
     - Domain: `quake.world`
     - Service: `http://192.168.1.205:8081`
   - Save. Cloudflare creates the proxied DNS record automatically.

10. Verify externally (from operator's WSL):

    ```bash
    curl -sIL https://wiki-beta.quake.world | head -10
    # Expect: HTTP/2 301 (from /) then HTTP/2 200 OK (at /index.php?title=Main_Page).
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
  docker compose -f docker-compose.prod.yml restart mediawiki'
```

The LocalSettings mount is read-only on the container; restart picks up the
new file. nginx is unaffected (no PHP files cached in nginx).

## Routine redeploy (nginx.conf change)

```bash
# from operator's WSL
scp apps/qwiki-sandbox/deploy/nginx.conf unraid:/mnt/user/appdata/qwiki-beta/
# Validate the new config inside the running container BEFORE restart:
ssh unraid 'docker exec qwiki-nginx nginx -t' || echo "config invalid; do not restart"
# If valid, reload nginx without dropping connections:
ssh unraid 'docker exec qwiki-nginx nginx -s reload'
```

`nginx -s reload` re-reads the conf in place. If it fails, the old config
keeps running. For larger changes (e.g., new server block), use
`docker compose restart nginx` instead.

## Routine redeploy (compose change)

```bash
scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml unraid:/mnt/user/appdata/qwiki-beta/
ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
  docker compose -f docker-compose.prod.yml up -d'
```

`up -d` recreates only containers whose definitions changed; bind mounts
survive.

## Routine MW image bump procedure

Use whenever a new MW patch ships (typically every ~2 months for the 1.43.x LTS line). Refreshes the `mediawiki-html/` bind-mount tree from the new image, preserving the overlay paths (uploads / Citizen / LocalSettings / Phase 2+ extensions).

```bash
ssh unraid 'docker pull mediawiki:1.43-fpm && \
  docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml down && \
  rm -rf /tmp/mw-extract && mkdir -p /tmp/mw-extract && \
  docker create --name qwiki-mw-extract mediawiki:1.43-fpm && \
  docker cp qwiki-mw-extract:/var/www/html/. /tmp/mw-extract/ && \
  docker rm qwiki-mw-extract && \
  rsync -a --delete /tmp/mw-extract/ /mnt/user/appdata/qwiki-beta/mediawiki-html/ && \
  rm -rf /tmp/mw-extract && \
  docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d'
```

Then run MW's update.php to apply any DB schema migrations the new patch ships:

```bash
ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'
```

Smoke-check via the V1 / V2 probes from the phase MD's "Verification (phase boundary)" section.

**Why the rsync indirection (vs `docker cp` directly into mediawiki-html/)?** `docker cp` doesn't delete files removed in the new image; rsync with `--delete` keeps the tree in sync with the image (no stale .php files from the prior patch). The child overlay binds (images/, skins/Citizen/, LocalSettings.php, Phase 2+ extensions/*) live at sibling host paths under `/mnt/user/appdata/qwiki-beta/` so they're untouched by the rsync to `mediawiki-html/`.

**MW major-version upgrades (e.g., 1.43 -> 1.47 LTS)** are out of scope for this procedure; they're a separate arc that handles release-notes review, extension-version coordination, schema migration auditing, and pre-upgrade backup snapshotting.

## Operator commands

| Action | Command |
|---|---|
| Live nginx access log | `ssh unraid 'docker logs -f qwiki-nginx'` |
| Live MW php-fpm log | `ssh unraid 'docker logs -f qwiki-mediawiki'` |
| MariaDB logs | `ssh unraid 'docker logs -f qwiki-mariadb'` |
| Stack status | `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'` |
| Restart nginx only | `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart nginx'` |
| Hot-reload nginx config | `ssh unraid 'docker exec qwiki-nginx nginx -s reload'` |
| Test nginx config | `ssh unraid 'docker exec qwiki-nginx nginx -t'` |
| Restart MW only | `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mediawiki'` |
| MW shell (CLI + maintenance scripts) | `ssh unraid 'docker exec -it qwiki-mediawiki bash'` |
| MariaDB shell | `ssh unraid 'docker exec -it qwiki-mariadb mariadb -uroot -p qwiki_beta'` |
| Run MW maintenance script | `ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/<script>.php'` |

## Troubleshooting

- **`docker compose ps` shows `qwiki-mediawiki` restarting** -- run
  `ssh unraid 'docker logs qwiki-mediawiki --tail 50'`. Most likely:
  `LocalSettings.php` PHP syntax error (verify with
  `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` from WSL) or the
  MariaDB volume hasn't initialized yet (let it run for 30 seconds and check
  `docker compose ps` again).

- **`qwiki-nginx` exits or won't start** -- usually an `nginx.conf` syntax
  error.
  ```bash
  ssh unraid 'docker logs qwiki-nginx --tail 30'
  ssh unraid 'docker run --rm \
    -v /mnt/user/appdata/qwiki-beta/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
    nginx:1.30-alpine nginx -t'
  ```

- **CF Tunnel returns 502** -- nginx is unreachable from the tunnel agent's
  network, or nginx is up but mediawiki php-fpm is unreachable on
  qwiki-net. Verify:
  - `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'`
    shows `qwiki-nginx` listening on `192.168.1.205:8081->80`.
  - `ssh unraid 'curl -sI http://192.168.1.205:8081/index.php?title=Main_Page'` returns a 2xx.
  - The CF Tunnel public hostname entry matches `http://192.168.1.205:8081` (not
    `https://`, not `127.0.0.1`).
  - From inside nginx, mediawiki is reachable: `ssh unraid 'docker exec qwiki-nginx wget -qO- http://mediawiki:9000 2>&1 | head -3'` -- fastcgi over TCP doesn't speak HTTP, so wget will error, but the connection error vs name-resolution error tells you whether the network resolves.

- **CF Tunnel returns 504 / nginx times out on fastcgi** -- mediawiki php-fpm
  is unreachable on `mediawiki:9000`. Check `docker network inspect qwiki-net`
  and confirm both `qwiki-nginx` and `qwiki-mediawiki` are attached. Then
  `ssh unraid 'docker exec qwiki-nginx nslookup mediawiki'` should resolve.

- **Main page renders but no Citizen skin** -- the skin volume may not be
  mounted correctly. Verify:
  - `ssh unraid 'ls /mnt/user/appdata/qwiki-beta/citizen/skin.json'` returns a path.
  - `ssh unraid 'docker exec qwiki-mediawiki ls /var/www/html/skins/Citizen/skin.json'`
    returns the same file via the bind mount.
  - `LocalSettings.php` has `wfLoadSkin( 'Citizen' );` AND `$wgDefaultSkin = "citizen";`.

- **install.php fails with "DB user exists"** -- the MariaDB container's
  `MARIADB_USER` env created the user already; install.php's
  `--installdbuser/--installdbpass` should still let it run, but if the failure
  reports `Access denied`, drop the qwiki user manually and re-run:
  `ssh unraid 'docker exec qwiki-mariadb mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "DROP USER \"qwiki\"@\"%\"; FLUSH PRIVILEGES;"'`

- **install.php fails with "already installed"** -- a previous attempt left
  install state on the MariaDB volume. For a fresh first-time install, wipe
  the MariaDB volume:
  `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml down && rm -rf /mnt/user/appdata/qwiki-beta/mariadb-data/* && docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d mariadb'`,
  wait for healthy, then re-run from step 7. (Only safe at first-time deploy;
  this discards the MW DB schema. The mediawiki-html bind-mount tree is not
  affected.)

- **`docker compose` command not found after Unraid reboot** -- compose plugin
  is on tmpfs; reinstall per `apps/quad/DEPLOYMENT.md` "Compose plugin caveat".

## Backup + recovery

- **Backup:** inherited from Unraid -> Synology weekly tarball of `/mnt/user/appdata/`
  per `/home/paradoks/projects/unRAID/docs/server/backup.md`. No bespoke wiring
  required. Everything the stack needs is under `/mnt/user/appdata/qwiki-beta/`
  (MariaDB data, MW source tree, uploaded images, Citizen, configs); the
  weekly tarball captures all of it.

- **Recovery (data loss):** restore `/mnt/user/appdata/qwiki-beta/` from the
  most recent Synology tarball, then bring the stack up. MariaDB state lives
  in `mariadb-data/`; MW source in `mediawiki-html/`; uploaded images in
  `mediawiki-data/`; Citizen skin in `citizen/`. Nothing else needs to be
  re-pulled or re-extracted; the bind-mount layout means everything was in
  the backup.

- **Recovery (LocalSettings.php damage):** `git checkout HEAD --
  apps/qwiki-sandbox/deploy/LocalSettings.php` in the operator's WSL, then
  redeploy via the routine-LocalSettings redeploy section above.

- **Recovery (nginx.conf damage):** same pattern -- git checkout, scp,
  `nginx -t`, `nginx -s reload`.
````

**Verification.** `test -f apps/qwiki-sandbox/deploy/README.md && echo OK` returns `OK`. `grep -c "^## " apps/qwiki-sandbox/deploy/README.md` returns at least `8` (Topology / Prerequisites / First-time / Routine redeploy LocalSettings / Routine redeploy nginx / Routine redeploy compose / Operator commands / Troubleshooting / Backup + recovery). `grep -c "qwiki-nginx\|qwiki-mediawiki" apps/qwiki-sandbox/deploy/README.md` returns >= 8 (topology + commands table + troubleshooting all mention them).

### Task 9 -- Operator deploy: bring the stack up on Unraid + add CF Tunnel route

**Goal.** Execute the first-time-deploy section of `deploy/README.md` against the live Unraid host. Result: `https://wiki-beta.quake.world` returns the MW main page with Citizen skin, anonymous edit blocked.

**Files.** None in repo. Operator-side state changes on Unraid (`/mnt/user/appdata/qwiki-beta/`) + Cloudflare dashboard (Tunnel route + DNS).

**Execution mode.** `inline` -- this is an operator-driven deploy. The commands are documented in `deploy/README.md`. The executor's role here is to run them, capture output, and confirm verification at each step. No code synthesis; subagent dispatch adds no value.

**Steps.**

- [ ] Confirm `apps/qwiki-sandbox/deploy/` artifacts (Tasks 4-8) are committed.
- [ ] Follow `apps/qwiki-sandbox/deploy/README.md` "First-time deploy" steps 1-10 in order:
  - Step 1: create appdata tree (`mariadb-data`, `mediawiki-data`, `mediawiki-html`, `citizen`).
  - Step 2: scp compose + nginx.conf + LocalSettings (three files).
  - Step 3: author `.env`; chmod 600.
  - Step 4: clone Citizen at `v3.16.0`.
  - Step 5: extract MW core source from `mediawiki:1.43-fpm` into `mediawiki-html/` (one-shot `docker create + docker cp + docker rm`).
  - Step 6: `up -d mariadb`; wait healthy.
  - Step 7: run install.php (one-shot via `docker run --rm` with `--confpath=/tmp`, NOT `docker compose run`).
  - Step 8: `up -d` to bring nginx + mediawiki up; `nginx -t` sanity; local-LAN smoke via `curl http://192.168.1.205:8081/`.
  - Step 9: add CF Tunnel public hostname `wiki-beta.quake.world -> http://192.168.1.205:8081` via the Cloudflare dashboard.
  - Step 10: external curl + browser check.
- [ ] On any step failure: consult `deploy/README.md` Troubleshooting; do NOT modify the committed files mid-deploy. If a substantive change is needed, halt + escalate to operator for arc-amendment decision (D25).
- [ ] After successful deploy, commit + push the Phase 1 artifacts (Tasks 1-8) to `main` with a message like:
  `phase(qwiki-v1-beta): Phase 1 -- nginx 1.30 + mediawiki:1.43-fpm + MariaDB 11.4 + Citizen v3.16.0 substrate at wiki-beta.quake.world`.

**Verification.** Phase-boundary verification (next section) is the gate for this task. See "Verification (phase boundary)" below.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of Phase 1. YES/NO answers per D24.

**V1. External HTTPS reachability.**

```bash
curl -sIL https://wiki-beta.quake.world | head -10
```

- **PASS condition:** the chain shows `HTTP/2 301` (the nginx-level root redirect to `/index.php?title=Main_Page`) followed by `HTTP/2 200` at the destination. Plain `curl -sI` (no `-L`) also acceptably returns `HTTP/2 301` since the destination is the actual main page.
- **FAIL condition:** `Could not resolve host`, `Connection refused`, `HTTP/2 5xx`, or `HTTP/2 502` (CF Tunnel route or stack-internal connectivity issue; consult `deploy/README.md` Troubleshooting).

**V2. MW main page renders with Citizen skin.**

Open `https://wiki-beta.quake.world` in a browser.

- **PASS condition:** MW default main page visible; the page source contains `class="skin-citizen"` or `<body class="...citizen...">`; the left-rail nav matches Citizen's layout (not Vector's top nav).
- **FAIL condition:** Vector-style top nav (skin mount or `$wgDefaultSkin` misconfig), or "Internal error" (LocalSettings.php syntax error -- check `docker logs qwiki-mediawiki`).

**V3. Anonymous edit is blocked.**

Open `https://wiki-beta.quake.world/index.php?title=Main_Page&action=edit` in an incognito window.

- **PASS condition:** MW responds with "you are not logged in" or "you do not have permission to edit this page" (the latter is the MW 1.43 wording for `$wgGroupPermissions['*']['edit'] = false`).
- **FAIL condition:** the edit form renders (anonymous edit permitted -- LocalSettings.php permissions block missing or overridden).

**V4. All three containers are healthy on Unraid.**

```bash
ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'
```

- **PASS condition:** all three of `qwiki-nginx`, `qwiki-mediawiki`, and `qwiki-mariadb` show `Up`; `qwiki-mariadb` shows `(healthy)`. (nginx + mediawiki php-fpm don't have compose healthchecks declared in Phase 1; their `Up` state is sufficient -- V1/V2 are the actual functional probes.)
- **FAIL condition:** any container shows `Restarting`, `Exited`, or `qwiki-mariadb` shows `(unhealthy)` after >60s.

Optional belt-and-suspenders probe -- nginx config validates inside the running container:

```bash
ssh unraid 'docker exec qwiki-nginx nginx -t'
```

- **PASS condition:** `nginx: configuration file /etc/nginx/nginx.conf test is successful`.
- **FAIL condition:** any `nginx: [emerg]` line -- consult Troubleshooting "qwiki-nginx exits or won't start".

**V5. Database has the MW schema.**

```bash
ssh unraid 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && \
  docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
    mariadb -uroot -e "USE qwiki_beta; SHOW TABLES;"' | wc -l
```

- **PASS condition:** count >= 50 (MW 1.43 creates ~60 core tables; exact count varies with install options but is well above 50).
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

- nginx 1.30-alpine fronting MediaWiki 1.43-fpm (PHP 8.3 bundled) + MariaDB 11.4 LTS running on Unraid at `192.168.1.205:8081`.
- `https://wiki-beta.quake.world` resolves via Cloudflare Tunnel to the nginx container; nginx fastcgi-proxies `.php` to `mediawiki:9000` and serves static assets directly from the shared `/var/www/html` surface (the `/mnt/user/appdata/qwiki-beta/mediawiki-html/` host bind-mount).
- Citizen skin v3.16.0 installed (host bind-mount overlay) and set as the default.
- `qwiki_beta` MariaDB database initialized with the MW 1.43 core schema (~60 tables).
- Initial admin user `Admin` created (password from `MW_ADMIN_PASSWORD`); operator rotates via `Special:ChangePassword` post-deploy.
- Anonymous edit blocked at the `$wgGroupPermissions` level; anonymous read public.
- `apps/qwiki-sandbox/deploy/` (compose + nginx.conf + LocalSettings + env example + README) committed to `main`.
- `apps/qwiki-sandbox/{CLAUDE.md, README.md, OVERVIEW.md}` rewritten to fresh-build language with three-container topology references.
- Weekly Unraid -> Synology backup auto-includes `/mnt/user/appdata/qwiki-beta/` (no edit required). Everything the stack needs (MariaDB data, MW source at `mediawiki-html/`, uploaded images, Citizen, configs) lives there, so the backup is sufficient for full recovery without re-pulling images.

Phase 2's inputs match this output set + the operator-side prereqs for extensions (no new operator prereqs required for Phase 2 since Page Forms + SMW install via repo checkout, mirror of Citizen). Phase 2 may need to add nginx static-asset cache headers for `/extensions/PageForms/` etc.; that is a routine `nginx.conf` redeploy via the documented hot-reload command.

## Open questions / deferred items

All five first-pass-halt questions resolved 2026-05-13 via operator walkthrough. Audit trail:

- ~~Q1: MW 1.39 lifecycle gap~~ -- RESOLVED by `decisions.md` D2 Amendment #2 (MW 1.39 -> 1.43 LTS + cascading version bumps). See review-findings F1.
- ~~Q2: install.php CLI vs web installer wizard~~ -- RATIFIED keep CLI. CLI is one scriptable command vs five browser screens, works before CF Tunnel is wired (web wizard would require routing the public URL to a half-installed MW), re-runnable on a fresh DB, and matches the standard MW Docker production pattern. See Task 9 step 7 / deploy README step 7.
- ~~Q3: install.php via `docker run` vs `install.compose.yml` override~~ -- RATIFIED keep `docker run`. Genuine one-shot operation; the override-file pattern earns its keep when install-shaped commands are run often (they won't be here). One less committed file.
- ~~Q4: Citizen skin pin~~ -- RESOLVED by the same Amendment #2. v3.16.0 is the current Citizen release for MW 1.43; no remaining pin question.
- ~~Q5: shared `/var/www/html` named volume vs bind-mount~~ -- RESOLVED to host bind-mount at `/mnt/user/appdata/qwiki-beta/mediawiki-html/`. Reasons: avoids the silent-staleness footgun on MW image bumps (rsync-from-new-image step is now explicit in deploy README), keeps MW source inspectable from Unraid GUI, included in the weekly Synology backup tarball for free. First-time-deploy cost is the one-shot extraction step at deploy README step 5; routine refresh is covered in the "Routine MW image bump procedure" section.

No open questions remain. Phase 1 MD ready for second sub-agent verification pass, then operator sign-off, then Phase 2 drafting.

## Recovery (if verification fails)

Per-failure-mode recovery; anticipatable failures only. Unanticipated failures route to operator.

- **V1 fails with `Could not resolve host`:** Cloudflare DNS record for `wiki-beta` was not created or hasn't propagated yet. Check the Cloudflare dashboard's DNS section; the tunnel public-hostname entry should have auto-created a proxied CNAME. Wait 60s; re-test. If still failing, manually add the CNAME pointing at the tunnel.
- **V1 returns HTTP 502:** Cloudflare Tunnel public hostname misroute, OR nginx is up but php-fpm is unreachable. Re-check the dashboard entry: service must be `http://192.168.1.205:8081` (not `https`, not the Tailscale IP `100.114.81.91`). Also from the Unraid host: `ssh unraid 'curl -sI http://192.168.1.205:8081/index.php?title=Main_Page'` -- if that returns 200, the issue is CF<->nginx; if it returns 504, the issue is nginx<->mediawiki on qwiki-net. Consult `deploy/README.md` Troubleshooting for both shapes.
- **V1 returns HTTP 504:** nginx reached but fastcgi to `mediawiki:9000` timed out. `docker network inspect qwiki-net` should show both `qwiki-nginx` and `qwiki-mediawiki` attached. `ssh unraid 'docker exec qwiki-nginx nslookup mediawiki'` should resolve. If not, restart the stack: `docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d --force-recreate`.
- **V2 renders the page without Citizen skin:** the skin volume mount is wrong or `$wgDefaultSkin` is set to a different skin. Probe `docker exec qwiki-mediawiki ls /var/www/html/skins/Citizen/skin.json`; if that fails, re-run the Citizen git clone (deploy README step 4) and restart mediawiki. If the file exists, confirm `LocalSettings.php` has both `wfLoadSkin( 'Citizen' );` AND `$wgDefaultSkin = "citizen";`. Note: nginx serves Citizen's static CSS / JS / svg from the host bind-mount `citizen/`; if those load but Citizen layout doesn't render, the issue is MW-side (`$wgDefaultSkin`), not nginx-side.
- **V3 allows anonymous edit:** `$wgGroupPermissions` block in LocalSettings.php was overridden by an `if` or `wfLoadExtension` call later in the file, or LocalSettings.php is not actually being read by the container. Probe `docker exec qwiki-mediawiki cat /var/www/html/LocalSettings.php | head -20` to confirm the mounted file is in place; re-scp from operator's WSL if drifted.
- **V4 shows `qwiki-mediawiki` restarting:** check `docker logs qwiki-mediawiki --tail 50`. Most likely: PHP syntax error in LocalSettings.php (run `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` from WSL) or DB unreachable (MariaDB healthcheck not yet green; wait + retry).
- **V4 shows `qwiki-nginx` exited:** nginx.conf syntax error. Run the offline-test command from deploy/README.md Troubleshooting "qwiki-nginx exits or won't start". Fix the file in `apps/qwiki-sandbox/deploy/nginx.conf`, scp + `nginx -s reload` (or `compose restart nginx`).
- **V5 returns 0 tables:** install.php did not run, or ran against a different DB name. Re-run deploy README step 7 with `set -x` to see the exact `docker run` command; verify `MARIADB_ROOT_PASSWORD` in `.env` matches what MariaDB was initialized with (if the `.env` was edited after first `up -d mariadb`, the container kept the original root password -- recovery is `docker compose down`, `rm -rf mariadb-data/*`, then re-run step 6; only safe at first-time deploy).

---

*Phase 1 ships when V1-V5 PASS. Phase 2 (Page Forms + Semantic MediaWiki) is unblocked once Phase 1 is committed + pushed.*
