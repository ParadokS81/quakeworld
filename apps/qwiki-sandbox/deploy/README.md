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
