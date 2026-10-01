# qwiki-v1-beta -- production deploy runbook

## Topology

```
client (any browser)
  -> https://wiki.slipgate.me                [Cloudflare Tunnel, TLS]
       -> Unraid host (Tailscale: 100.114.81.91, LAN: 192.168.1.205)
            -> qwiki-nginx container (qwiki-net, port 8081 on LAN -> 80 in container)
                 -> qwiki-mediawiki container (qwiki-net, php-fpm on port 9000)
                      -> qwiki-mariadb container (qwiki-net)
```

Persistent data and configs live at `/mnt/user/appdata/qwiki-beta/`:

- `mariadb-data/`             - MariaDB state. Covered by the weekly Unraid -> Synology backup.
- `mediawiki-data/`           - MW uploaded images + cache (`/var/www/html/images`).
- `mediawiki-html/`           - MW core source tree (`/var/www/html`). Extracted from `mediawiki:1.43-fpm` at first deploy; refreshed on each MW image bump per the procedure below. Includes `composer.local.json` + `composer.lock` + `extensions/SemanticMediaWiki/` + `vendor/` (composer-managed, Phase 2+).
- `citizen/`                  - Citizen skin git checkout at v3.16.0 (overlays `/var/www/html/skins/Citizen`).
- `page-forms/`               - Page Forms git checkout at REL1_43 branch (overlays `/var/www/html/extensions/PageForms`); added in Phase 2.
- `docker-compose.prod.yml`   - scp'd from `apps/qwiki-sandbox/deploy/`.
- `nginx/default.conf`        - scp'd from `apps/qwiki-sandbox/deploy/nginx.conf` (directory mount over conf.d; see the compose comment).
- `LocalSettings.php`         - scp'd from `apps/qwiki-sandbox/deploy/`.
- `.env`                      - operator-authored from `.env.prod.example`, mode 600.

All paths live under `/mnt/user/appdata/qwiki-beta/`, which is on the weekly Unraid -> Synology backup tarball (D3). No named docker volumes are used; this keeps MW source inspectable from the Unraid GUI and recoverable from backup without re-pulling images.

## SSH identity

All deploy commands below use `ssh unraid-deploy` -- a non-root user (`claude-deploy`) in the `docker` group, scoped to `/mnt/user/appdata/qwiki-beta/`. This bounds the blast radius of a bad command to the qwiki-beta tree (recoverable from the weekly Synology backup per D3) instead of the whole Unraid host.

`ssh unraid` (root) is **operator-only**; do NOT use it for the deploy commands below. The one-time setup of `claude-deploy` lives in the unraid project (creates the user, persists across boot via `/boot/config/go`, chowns the qwiki-beta tree, adds the `unraid-deploy` SSH alias to operator's WSL `~/.ssh/config`).

## Prerequisites

- Tailscale up; `ssh unraid-deploy 'echo ok'` returns `ok`.
- Cloudflare account access to the `slipgate.me` zone + Tunnel admin.
- Existing `cloudflared` Tunnel agent running on Unraid (same one fronting `oracle.slipgate.me` for qw-oracle).

## First-time deploy

1. Create the Unraid appdata directory tree:

   ```bash
   ssh unraid-deploy 'mkdir -p /mnt/user/appdata/qwiki-beta/{mariadb-data,mediawiki-data,mediawiki-html,citizen}'
   ```

2. Copy compose + nginx + LocalSettings to Unraid:

   ```bash
   scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
       apps/qwiki-sandbox/deploy/LocalSettings.php \
       unraid-deploy:/mnt/user/appdata/qwiki-beta/
   # nginx.conf lands as nginx/default.conf: the compose mounts the DIRECTORY
   # over conf.d (a single-file mount strands the container on a rename-write).
   ssh unraid-deploy 'mkdir -p /mnt/user/appdata/qwiki-beta/nginx'
   scp apps/qwiki-sandbox/deploy/nginx.conf \
       unraid-deploy:/mnt/user/appdata/qwiki-beta/nginx/default.conf
   ```

3. Author the `.env` on Unraid:

   ```bash
   ssh unraid-deploy
   cd /mnt/user/appdata/qwiki-beta
   nano .env       # paste from apps/qwiki-sandbox/deploy/.env.prod.example, fill secrets
   chmod 600 .env
   ```

   Generate strong values: `openssl rand -hex 32` for `MARIADB_ROOT_PASSWORD` /
   `MW_DB_PASSWORD` / `MW_SECRET_KEY`; `openssl rand -hex 8` for `MW_UPGRADE_KEY`;
   pick a memorable password for `MW_ADMIN_PASSWORD` (rotate after install).

4. Clone the Citizen skin at v3.16.0:

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
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
   ssh unraid-deploy 'docker pull mediawiki:1.43-fpm && \
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
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
     docker compose -f docker-compose.prod.yml up -d --wait mariadb && \
     docker compose -f docker-compose.prod.yml ps'
   ```

   The `--wait` flag blocks until `qwiki-mariadb` shows `State: Up (healthy)`.
   The healthcheck uses MariaDB's `healthcheck.sh --connect --innodb_initialized`
   (10s interval).

7. Pre-create the `qwiki@'mariadb'` user, then run install.php to bootstrap
   the DB schema + initial admin user.

   The pre-create is a workaround for an MW 1.43 installer behavior. install.php
   detects that the `qwiki` user already exists at wildcard host (created by
   MariaDB's container init from `MARIADB_USER` env), skips `CREATE USER`, then
   tries `GRANT ALL ON qwiki_beta.* TO 'qwiki'@'mariadb'` using the `--dbserver`
   value as the host portion. MariaDB 11.4 doesn't auto-create on GRANT and
   errors with 1133 ("Can't find any matching row in the user table"). Pre-
   creating `qwiki@'mariadb'` with the same password makes the GRANT step succeed.
   MW's runtime connection uses `qwiki@'%'` (compose-time grants); `qwiki@'mariadb'`
   exists only to satisfy the installer.

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
     set -a && . ./.env && set +a && \
     docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
       mariadb -uroot -e "CREATE USER \"qwiki\"@\"mariadb\" IDENTIFIED BY \"$MW_DB_PASSWORD\"; GRANT ALL PRIVILEGES ON qwiki_beta.* TO \"qwiki\"@\"mariadb\";"'
   ```

   Then run install.php. We use `docker run` directly here (NOT `docker compose run`)
   so install.php does not inherit the LocalSettings.php read-only bind mount from
   the compose service definition -- a bind-mounted read-only LocalSettings.php
   would make install.php either fail (cannot write) or short-circuit with
   "already installed". The `--confpath=/tmp` flag tells install.php to write
   its generated LocalSettings.php into the container's /tmp (which dies with
   --rm), leaving the host-side hand-authored file in place.

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
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
         --server="https://wiki.slipgate.me" --scriptpath="" --lang=en \
         --pass="$MW_ADMIN_PASSWORD" \
         "QuakeWorld Wiki (beta)" "Admin"'
   ```

   Expected output ends with "MediaWiki has been successfully installed." after
   the sequence: Setting up database / Creating tables / Creating database user
   / Populating default interwiki / Initializing statistics / Generating secret
   keys / Restoring MediaWiki services / Creating administrator user account /
   Creating main page with default content. The DB now has the MW core schema
   (~59 tables).

8. Start the full three-container stack:

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
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
   ssh unraid-deploy 'docker exec qwiki-nginx nginx -t'
   # Expect: nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```

   Local smoke test (from Unraid itself):

   ```bash
   ssh unraid-deploy 'curl -sI http://192.168.1.205:8081/'
   # Expect: HTTP/1.1 301 (the apex redirect). Location uses https://$host based
   # on the requesting Host header; for LAN tests $host echoes the LAN IP, which
   # is not actually served over https -- the redirect target itself is verified
   # externally via the V1 probe over the Cloudflare Tunnel.
   ssh unraid-deploy 'curl -sI http://192.168.1.205:8081/index.php?title=Main_Page'
   # Expect: HTTP/1.1 200 OK with Content-Type: text/html.
   ```

9. Add the Cloudflare Tunnel route. From the Cloudflare One dashboard
   (`one.dash.cloudflare.com` -> `Networks -> Tunnels`):

   - Pick the existing tunnel that already fronts `oracle.slipgate.me` (or
     the equivalent Unraid tunnel; check `cloudflared` config if uncertain).
   - Click **Edit**, go to the **Published application routes** tab, select
     **Add a published application route**.
   - Fields:
     - **Subdomain**: `wiki`
     - **Domain** (dropdown): `slipgate.me`
     - **Service Type**: `HTTP`
     - **Service URL**: `http://192.168.1.205:8081` (the `http://` prefix is
       correct -- TLS terminates at Cloudflare's edge; nginx is HTTP-only
       inside qwiki-net).
   - Leave **Additional application settings** at defaults (HTTP service so
     `noTLSVerify` doesn't apply; no upstream load balancer so `httpHostHeader`
     doesn't need tuning).
   - **Save**. Cloudflare auto-creates the proxied DNS CNAME.

10. Verify externally (from operator's WSL):

    ```bash
    curl -sIL https://wiki.slipgate.me | head -10
    # Expect: HTTP/2 301 (from /, with https:// in Location) then HTTP/2 200 OK
    # (at /index.php?title=Main_Page).
    ```

    Then open `https://wiki.slipgate.me` in a browser; expect the MW main
    page rendered with the Citizen skin. Click "View source" or attempt to edit
    while logged out; expect "you must be logged in" or "you do not have
    permission to edit this page."

## Phase 2: install Page Forms + Semantic MediaWiki

Run these steps after Phase 1 first-time-deploy succeeds and after the
Phase 2 commit (composer.local.json, updated docker-compose.prod.yml,
updated LocalSettings.php, test-form artifacts) is on `main`. Same
operator-WSL + Unraid SSH pattern as first-time deploy.

1. Create the Phase 2 sibling appdata directory:

   ```bash
   ssh unraid-deploy 'mkdir -p /mnt/user/appdata/qwiki-beta/page-forms'
   ```

2. Git-clone Page Forms at the `REL1_43` branch into the sibling path:

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
     git clone --branch REL1_43 --depth 1 \
       https://github.com/wikimedia/mediawiki-extensions-PageForms.git page-forms'
   ```

   The Wikimedia mirror tracks the canonical Gerrit repo and is the same
   source the bundled MW Composer ecosystem uses. REL1_43 is the active
   branch for MW 1.43.x; no GitHub-tagged release exists on this mirror.
   The `--depth 1` is fine because we do not maintain Page Forms
   development history locally -- we only need the checkout to bind into
   the mediawiki container.

3. scp the Phase 2 deploy artifacts (composer.local.json + updated
   LocalSettings.php + updated docker-compose.prod.yml) to Unraid:

   ```bash
   # from operator's WSL
   scp apps/qwiki-sandbox/deploy/composer.local.json \
       unraid-deploy:/mnt/user/appdata/qwiki-beta/mediawiki-html/
   scp apps/qwiki-sandbox/deploy/LocalSettings.php \
       apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
       unraid-deploy:/mnt/user/appdata/qwiki-beta/
   ```

   The Phase 2 LocalSettings.php is the file in step 4 below -- before
   `wfLoadExtension( 'SemanticMediaWiki' )` parses cleanly, SMW source +
   deps must exist on disk, so the LocalSettings scp happens here but
   the mediawiki container restart waits until step 5 finishes.

4. Composer-install SMW 6.0.x + its dependencies via a one-shot
   `composer:latest` container. MW's bundled `composer.json` includes the
   `composer-merge-plugin`, which picks up `composer.local.json` and
   merges its `require` section into the resolution graph. The result
   is: `extensions/SemanticMediaWiki/` populated with SMW source +
   `vendor/` populated with SMW deps (alongside MW's own vendor entries).

   ```bash
   ssh unraid-deploy 'docker run --rm \
     -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
     -w /app composer:latest \
     composer update --no-dev --no-interaction --no-progress --prefer-dist \
     --ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl'
   ```

   Expected output ends with `Generating optimized autoload files` plus
   the per-package install lines. Verify SMW landed on disk:

   ```bash
   ssh unraid-deploy 'ls /mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/SemanticMediaWiki/extension.json && \
               ls /mnt/user/appdata/qwiki-beta/mediawiki-html/composer.lock'
   ```

   Both `ls` calls should return paths without error.

5. Bring the updated docker-compose up so the mediawiki + nginx services
   pick up the new Page Forms bind. The mediawiki container needs a
   restart anyway to pick up the new LocalSettings.php; a single
   `up -d` covers both:

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
     docker compose -f docker-compose.prod.yml up -d && \
     docker compose -f docker-compose.prod.yml ps'
   ```

   Wait until all three containers show `Up` (mariadb `(healthy)`). If
   mediawiki keeps restarting, consult Troubleshooting below.

6. Run MW's `maintenance/update.php` inside the mediawiki container to
   create the SMW + Page Forms schema tables (`smw_object_ids`,
   `smw_di_blob`, `smw_di_wikipage`, etc.; plus PF's `pf_forms` etc.):

   ```bash
   ssh unraid-deploy 'docker exec qwiki-mediawiki \
     php /var/www/html/maintenance/update.php --quick'
   ```

   `--quick` skips the 5-second "press control-c to abort" delay. Expect
   a sequence of `Creating ...` and `... Done` lines, ending with
   `Done in <N>.<N>s.`. Confirm SMW tables exist:

   ```bash
   ssh unraid-deploy 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && \
     docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
     mariadb -uroot -N -B -e "USE qwiki_beta; SHOW TABLES LIKE \"smw_%\";"' | wc -l
   ```

   Expect a count >= 10 (SMW 6.0.x ships ~16 `smw_*` tables; threshold
   of 10 is the conservative pass condition). The `-N -B` flags suppress
   mariadb's column-header + ASCII-border formatting so `wc -l` counts
   table rows only.

7. Drain any SMW jobs that the update queued:

   ```bash
   ssh unraid-deploy 'docker exec qwiki-mediawiki \
     php /var/www/html/maintenance/runJobs.php'
   ```

   Expect exit code 0 and a line like `Job queue is empty.` or
   `<N> jobs run, <0> failed` (post-Phase-2-install the queue typically
   starts empty since no pages have semantic annotations yet).

8. Create the smoke-test Form + Template + verify form-driven page
   creation. Log into the wiki at `https://wiki.slipgate.me` as the
   `Admin` user from the Phase 1 install.php run (or the rotated
   password if the operator changed it).

   - Visit `Special:CreatePage` (or paste a URL: `https://wiki.slipgate.me/index.php?title=Special:CreatePage`).
   - Page title: `Form:TestForm`. Paste the body from
     `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext` (the
     `<includeonly>...</includeonly>` block, without the `<noinclude>`
     preamble). Save.
   - Repeat: page title `Template:Test`. Paste the body from
     `apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext`
     (without the `<noinclude>` preamble). Save.
   - Visit `Special:FormEdit/TestForm`. The form renders with two
     inputs (Test name + Test note) and a Save / Cancel button row.
   - Enter "TestPage" as the page title (top input), "Hello QWiki" as
     Test name, "Phase 2 verification" as Test note. Submit.
   - MW redirects to `TestPage` in main namespace; the rendered output
     shows the two fields plus `Category:Test pages` at the bottom.
   - Visit `Special:Version`. Confirm a "Page Forms" entry (with
     version string from REL1_43 HEAD) and a "Semantic MediaWiki"
     entry (with `6.0.x` version string) appear under
     "Installed extensions".

   If `Special:FormEdit/TestForm` 404s or "no such page" errors,
   `Form:TestForm` did not save correctly -- recheck the paste body
   for accidentally-included `<noinclude>` block (the preamble must
   NOT be pasted; only the `<includeonly>` body).

9. Final job-queue drain (the test-form submission likely enqueued one
   or two SMW jobs):

   ```bash
   ssh unraid-deploy 'docker exec qwiki-mediawiki \
     php /var/www/html/maintenance/runJobs.php'
   ```

   Expect `<N> jobs run, 0 failed`.

10. Commit + push the Phase 2 artifacts (composer.local.json + the
    updated compose / LocalSettings / README + the test-form/
    directory + OVERVIEW.md update) to `main`. Operator-WSL side:

    ```bash
    # from /home/paradoks/projects/quakeworld
    git add apps/qwiki-sandbox/deploy/composer.local.json \
            apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
            apps/qwiki-sandbox/deploy/LocalSettings.php \
            apps/qwiki-sandbox/deploy/README.md \
            apps/qwiki-sandbox/deploy/test-form/ \
            apps/qwiki-sandbox/OVERVIEW.md
    git commit -m "phase(qwiki-v1-beta): Phase 2 -- Page Forms REL1_43 + Semantic MediaWiki 6.0.x extensions installed on wiki.slipgate.me"
    git push origin main
    ```

---

## Phase 3 install -- PluggableAuth + OpenIDConnect + Discord OAuth

Prerequisites (per `prerequisites.md`):

- Discord OAuth app created at https://discord.com/developers/applications
  with redirect URI `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin`.
  Client ID + Secret captured.
- `@wiki-beta` Discord role exists in the relevant server; role ID captured.
- Operator's Discord user ID captured (for first-login self-verification).

Steps (run from operator's WSL unless otherwise noted):

1. **Clone PluggableAuth onto Unraid.**

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
     git clone --branch REL1_43 --depth 1 \
       https://github.com/wikimedia/mediawiki-extensions-PluggableAuth.git \
       pluggable-auth'
   ```

   Expect a single-shallow clone of REL1_43 (currently PluggableAuth v7.5.0).

2. **Clone OpenIDConnect onto Unraid.**

   ```bash
   ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
     git clone --branch REL1_43 --depth 1 \
       https://github.com/wikimedia/mediawiki-extensions-OpenIDConnect.git \
       openid-connect'
   ```

   Expect a single-shallow clone of REL1_43 (currently OpenIDConnect v8.3.0).

3. **Scp the updated config files.**

   ```bash
   scp apps/qwiki-sandbox/deploy/composer.local.json \
       apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
       apps/qwiki-sandbox/deploy/LocalSettings.php \
       apps/qwiki-sandbox/deploy/.env.prod.example \
       unraid-deploy:/mnt/user/appdata/qwiki-beta/
   ```

   Also copy `composer.local.json` into `mediawiki-html/` so composer's
   merge-plugin finds it:

   ```bash
   ssh unraid-deploy 'cp /mnt/user/appdata/qwiki-beta/composer.local.json \
                  /mnt/user/appdata/qwiki-beta/mediawiki-html/composer.local.json'
   ```

4. **Populate `.env` with Discord credentials.**

   On Unraid, edit `/mnt/user/appdata/qwiki-beta/.env` and fill in:

   - `DISCORD_OAUTH_CLIENT_ID` -- from the Discord developer-portal app's OAuth2 page.
   - `DISCORD_OAUTH_CLIENT_SECRET` -- same page (reset if previously exposed).
   - `DISCORD_GUILD_ID` -- right-click your Discord server icon -> Copy Server ID (developer mode required).
   - `DISCORD_WIKI_BETA_ROLE_ID` -- Server Settings -> Roles -> right-click the `@wiki-beta` role -> Copy Role ID.

   Confirm permissions:

   ```bash
   ssh unraid-deploy 'ls -la /mnt/user/appdata/qwiki-beta/.env'
   ```

   Expect `-rw-------` (chmod 600).

5. **Run composer update inside MW root to install jumbojett.**

   Per the Phase 2 pattern, use the one-shot `composer:latest` image
   bind-mounted to the MW root:

   ```bash
   ssh unraid-deploy 'docker run --rm \
     -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
     composer:latest \
     update --no-dev --no-interaction \
     --ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl'
   ```

   Expect output mentioning `jumbojett/openid-connect-php` being installed.

6. **Restart the stack so the new extensions load.**

   ```bash
   ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml \
     up -d --force-recreate mediawiki nginx'
   ```

7. **Run `maintenance/update.php` to create the OpenIDConnect schema tables.**

   ```bash
   ssh unraid-deploy 'docker exec qwiki-mediawiki \
     php /var/www/html/maintenance/update.php --quick'
   ```

   Expect creation messages for `oidc_user` (or similar; OpenIDConnect's
   schema is documented under its `sql/` directory).

8. **Walk the OAuth flow end-to-end.**

   - Open `https://wiki.slipgate.me` in an incognito browser.
   - Expect: Citizen skin's user menu shows a "Log in with Discord" button
     (PluggableAuth replaces the standard Special:UserLogin entrance).
   - Click the button. Expect: redirect to Discord's OAuth consent screen
     showing the OAuth app name + requested scopes
     (openid / identify / guilds.members.read).
   - Authorize. Expect: redirect back to
     `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin`,
     then to Main Page, with a session cookie set + the user-menu now
     showing your Discord username.
   - Open `Special:UserGroupRights` -> find your username. Expect:
     `wiki-contributor` group listed (auto-assigned by the LocalUserCreated
     hook firing on first-login + finding the `@wiki-beta` role in your
     Discord guild membership).

   If the auto-assignment didn't happen, see Troubleshooting "Discord login
   succeeds but wiki-contributor group not granted" below.

9. **Promote yourself (or a second test user) to wiki-curator.**

   Via the wiki UI as the existing `Admin` (Phase 1 sysop) user:

   - Navigate to `Special:UserRights`.
   - Enter the target Discord-OAuth-created username.
   - Tick `wiki-curator`. Save.

   Verify by editing `Template:Test` (created during Phase 2 smoke probe);
   the curator-only namespace restriction (D5) means only `wiki-curator` +
   sysop can edit.

10. **Commit Phase 3 changes to main.**

    ```bash
    git add apps/qwiki-sandbox/deploy/composer.local.json \
            apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
            apps/qwiki-sandbox/deploy/LocalSettings.php \
            apps/qwiki-sandbox/deploy/.env.prod.example \
            apps/qwiki-sandbox/deploy/README.md \
            apps/qwiki-sandbox/OVERVIEW.md
    git commit -m "phase 3 (qwiki-v1-beta): PluggableAuth + OpenIDConnect (Discord) + wiki-contributor / wiki-curator groups + D5 namespace restrictions"
    git push origin main
    ```

### Image bump procedure (amended Phase 3)

Add to the existing Routine MW Image Bump Procedure section a step to
re-pull the PluggableAuth + OpenIDConnect git-clones whenever a major REL
branch is moved (e.g., from REL1_43 to REL1_47 when the next MW LTS lands):

```bash
ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta/pluggable-auth && git pull --depth=1 origin REL1_43'
ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta/openid-connect && git pull --depth=1 origin REL1_43'
```

For routine MW patch bumps (1.43.X -> 1.43.Y), the existing rsync
procedure already preserves these extensions because they live at sibling
host paths (overlay-bound at runtime) -- nothing extra to do.

### Troubleshooting (Phase 3 additions)

**"Log in with Discord" button doesn't render in the Citizen skin user menu.**

PluggableAuth registers itself with the SkinTemplateNavigation::Universal
hook to inject the login button. If the button is missing:

- Verify PluggableAuth shows up in `Special:Version`: `ssh unraid-deploy 'curl -s
  http://192.168.1.205:8081/index.php?title=Special:Version'` and grep
  for "PluggableAuth".
- Verify `wfLoadExtension( 'PluggableAuth' );` is present in LocalSettings
  AND the overlay bind exists: `ssh unraid-deploy 'docker exec qwiki-mediawiki ls
  /var/www/html/extensions/PluggableAuth/extension.json'`.
- Restart mediawiki: `ssh unraid-deploy 'docker compose -f
  /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mediawiki'`.

**Discord OAuth redirect returns "OpenIDConnect: SSL certificate problem"
or "issuer mismatch" error.**

- SSL cert: typically a stale CA bundle in the mediawiki container. Confirm
  with `ssh unraid-deploy 'docker exec qwiki-mediawiki curl -sI
  https://discord.com/api/oauth2/token'`. Expect HTTP 200/405. If TLS
  errors, the official mediawiki:1.43-fpm image's ca-certificates may need
  refresh -- pull the latest image patch.
- Issuer mismatch: the `issuerValidator` callable in
  `$wgPluggableAuth_Config['Discord']['data']` is responsible for accepting
  Discord's non-standard issuer string. Confirm it's set to `static function
  ( $issuer ) { return true; }` in LocalSettings.php. If a stricter
  validator is wanted, match against `'https://discord.com'`.

**Discord login succeeds but wiki-contributor group not granted.**

Walk the qwikiBetaSyncDiscordRole helper's failure modes in order:

- Confirm env vars are set: `ssh unraid-deploy 'docker exec qwiki-mediawiki env |
  grep -E "DISCORD_"'`. Expect four lines.
- Confirm Discord role ID is correct: in Discord (with developer mode),
  right-click the `@wiki-beta` role and Copy Role ID; cross-check against
  `.env`'s `DISCORD_WIKI_BETA_ROLE_ID`.
- Confirm the OAuth scope includes `guilds.members.read`: this is the scope
  Discord requires to allow `/users/@me/guilds/<id>/member` to return role
  data; without it the API returns 401. Check the OAuth consent screen
  when re-authenticating -- it should list "Read your role data in one
  server".
- Confirm Discord guild ID is correct: right-click your server icon ->
  Copy Server ID; cross-check against `.env`'s `DISCORD_GUILD_ID`.
- Tail MW logs for the hook's debug output: `ssh unraid-deploy 'docker exec
  qwiki-mediawiki tail -f /tmp/qwiki-beta-debug.log'` (set
  `$wgDebugLogGroups['qwiki-beta']` to a file path in LocalSettings if
  the hook's wfDebugLog calls aren't visible).
- Test the Discord API directly with the user's access token (sysop only;
  pull from the session table by user_name): the response JSON shows the
  exact role IDs the API returned. Compare against `DISCORD_WIKI_BETA_ROLE_ID`.

**`Special:UserGroupRights` shows wiki-contributor for the user, but
they can't edit any page (including Main namespace).**

- Confirm `wiki-contributor` has the `edit` right:
  `ssh unraid-deploy 'docker exec qwiki-mediawiki grep -A1 "wiki-contributor.*edit" /var/www/html/LocalSettings.php'`.
  Expect a `... ['edit'] = true;` line.
- Confirm anonymous `read` is allowed: `ssh unraid-deploy 'docker exec
  qwiki-mediawiki grep "wgGroupPermissions\['\*'\]\['read'\]" /var/www/html/LocalSettings.php'`.
  Expect `... = true;`.
- If editing a Template / Form / Category page returns a permission error,
  that's intentional per D5; the user needs `wiki-curator` for those
  namespaces.

**`maintenance/update.php` errors with "class not found" referring to
OpenIDConnect or PluggableAuth.**

- Composer didn't fully run. Re-run from step 5 of the Phase 3 install:
  `ssh unraid-deploy 'docker run --rm -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app composer:latest update --no-dev --no-interaction'`.
- Confirm jumbojett landed: `ssh unraid-deploy 'test -d
  /mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/jumbojett/openid-connect-php
  && echo OK'`. If missing, the `composer.local.json` merge wasn't picked
  up -- confirm the file is at MW root: `ssh unraid-deploy 'cat
  /mnt/user/appdata/qwiki-beta/mediawiki-html/composer.local.json'`.

**Logout via Special:UserLogout doesn't fully clear the Discord session.**

- This is by design: Discord OAuth tokens persist until the user revokes
  them via Discord's Authorized Apps settings. The MW session is cleared
  on logout, but the next login click will skip the consent screen (Discord
  remembers the prior authorization). To force re-consent, the user can
  revoke at https://discord.com/settings/authorized-apps and reauthorize.

## Routine redeploy (LocalSettings change)

```bash
# from operator's WSL
scp apps/qwiki-sandbox/deploy/LocalSettings.php unraid-deploy:/mnt/user/appdata/qwiki-beta/
ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
  docker compose -f docker-compose.prod.yml restart mediawiki'
```

The LocalSettings mount is read-only on the container; restart picks up the
new file. nginx is unaffected (no PHP files cached in nginx).

## Routine redeploy (nginx.conf change)

```bash
# from operator's WSL
scp apps/qwiki-sandbox/deploy/nginx.conf unraid-deploy:/mnt/user/appdata/qwiki-beta/nginx/default.conf
# Validate the new config inside the running container BEFORE restart:
ssh unraid-deploy 'docker exec qwiki-nginx nginx -t' || echo "config invalid; do not restart"
# If valid, reload nginx without dropping connections:
ssh unraid-deploy 'docker exec qwiki-nginx nginx -s reload'
```

`nginx -s reload` re-reads the conf in place. If it fails, the old config
keeps running. For larger changes (e.g., new server block), use
`docker compose restart nginx` instead.

## Routine redeploy (compose change)

```bash
scp apps/qwiki-sandbox/deploy/docker-compose.prod.yml unraid-deploy:/mnt/user/appdata/qwiki-beta/
ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && \
  docker compose -f docker-compose.prod.yml up -d'
```

`up -d` recreates only containers whose definitions changed; bind mounts
survive.

## Routine MW image bump procedure

Use whenever a new MW patch ships (typically every ~2 months for the 1.43.x LTS line). Refreshes the `mediawiki-html/` bind-mount tree from the new image, preserving the overlay paths (uploads / Citizen / Page Forms / LocalSettings) AND the composer-managed Phase 2 surface (composer.local.json + composer.lock + extensions/SemanticMediaWiki/ + SMW's deps in vendor/).

```bash
ssh unraid-deploy 'docker pull mediawiki:1.43-fpm && \
  docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml down && \
  rm -rf /tmp/mw-extract && mkdir -p /tmp/mw-extract && \
  docker create --name qwiki-mw-extract mediawiki:1.43-fpm && \
  docker cp qwiki-mw-extract:/var/www/html/. /tmp/mw-extract/ && \
  docker rm qwiki-mw-extract && \
  rsync -a --delete \
    --exclude composer.local.json \
    --exclude composer.lock \
    --exclude extensions/SemanticMediaWiki \
    /tmp/mw-extract/ /mnt/user/appdata/qwiki-beta/mediawiki-html/ && \
  rm -rf /tmp/mw-extract && \
  docker run --rm \
    -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
    -w /app composer:latest \
    composer update --no-dev --no-interaction --no-progress --prefer-dist \
    --ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl && \
  docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d'
```

Then run MW's update.php to apply any DB schema migrations the new patch (and any auto-bumped SMW patch) ships:

```bash
ssh unraid-deploy 'docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'
```

Drain any SMW jobs the update enqueued:

```bash
ssh unraid-deploy 'docker exec qwiki-mediawiki php /var/www/html/maintenance/runJobs.php'
```

Smoke-check via the V1 / V2 probes from Phase 1's "Verification (phase boundary)" section plus the Phase 2 V_PF and V_SMW probes.

**Why the rsync excludes?** `--exclude composer.local.json` keeps the Phase 2 SMW require declaration alive across the bump (the upstream image has no `composer.local.json`, so without the exclude the `--delete` flag would remove it). `--exclude composer.lock` keeps the resolved version pinning across the bump; the subsequent `composer update --no-dev` re-resolves from composer.local.json. `--exclude extensions/SemanticMediaWiki` keeps the prior SMW source tree in place until composer overwrites it; this avoids a transient state where SMW is half-removed.

**Why re-run composer after rsync?** The rsync wipes MW's own `vendor/` (replacing it with the new image's vendor) but the Phase 2 SMW Composer deps (`onoi/*`, etc.) are not in MW core's vendor. Re-running `composer update` rebuilds the full dependency graph including SMW + its transitive deps. Idempotent; safe to re-run.

**Why the rsync indirection (vs `docker cp` directly into mediawiki-html/)?** `docker cp` doesn't delete files removed in the new image; rsync with `--delete` keeps the tree in sync with the image (no stale .php files from the prior patch). The child overlay binds (images/, skins/Citizen/, extensions/PageForms via the `page-forms/` sibling, LocalSettings.php) live at sibling host paths under `/mnt/user/appdata/qwiki-beta/` so they're untouched by the rsync to `mediawiki-html/`.

**MW major-version upgrades (e.g., 1.43 -> 1.47 LTS)** are out of scope for this procedure; they're a separate arc that handles release-notes review, extension-version coordination (Page Forms `REL1_47` branch + SMW major-version bump), schema migration auditing, and pre-upgrade backup snapshotting.

## Routine redeploy (extension version bump)

Two flavors: Page Forms (git-clone overlay) and Semantic MediaWiki (Composer).

### Page Forms

Pull the latest commit on the `REL1_43` branch into the sibling host path. The bind-mount picks it up; mediawiki + nginx restart picks up any cached class autoloads.

```bash
ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta/page-forms && git pull --ff-only && \
  cd /mnt/user/appdata/qwiki-beta && \
  docker compose -f docker-compose.prod.yml restart mediawiki && \
  docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'
```

If `git pull` reports a non-fast-forward (the wikimedia mirror force-pushed `REL1_43`, which is rare), inspect upstream history before pulling. For a major-version Page Forms bump (REL1_43 -> REL1_47 etc.), see "MW major-version upgrades" above.

### Semantic MediaWiki

Bump the SMW version pin in `apps/qwiki-sandbox/deploy/composer.local.json` (on operator's WSL), commit, scp the new file to Unraid, re-run composer update + maintenance/update.php + runJobs.

```bash
# on operator's WSL: edit composer.local.json, commit, push.
scp apps/qwiki-sandbox/deploy/composer.local.json \
    unraid-deploy:/mnt/user/appdata/qwiki-beta/mediawiki-html/
ssh unraid-deploy 'docker run --rm \
  -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
  -w /app composer:latest \
  composer update --no-dev --no-interaction --no-progress --prefer-dist \
  --ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl && \
  docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mediawiki && \
  docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick && \
  docker exec qwiki-mediawiki php /var/www/html/maintenance/runJobs.php'
```

## Operator commands

| Action | Command |
|---|---|
| Live nginx access log | `ssh unraid-deploy 'docker logs -f qwiki-nginx'` |
| Live MW php-fpm log | `ssh unraid-deploy 'docker logs -f qwiki-mediawiki'` |
| MariaDB logs | `ssh unraid-deploy 'docker logs -f qwiki-mariadb'` |
| Stack status | `ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'` |
| Restart nginx only | `ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart nginx'` |
| Hot-reload nginx config | `ssh unraid-deploy 'docker exec qwiki-nginx nginx -s reload'` |
| Test nginx config | `ssh unraid-deploy 'docker exec qwiki-nginx nginx -t'` |
| Restart MW only | `ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mediawiki'` |
| MW shell (CLI + maintenance scripts) | `ssh unraid-deploy 'docker exec -it qwiki-mediawiki bash'` |
| MariaDB shell | `ssh unraid-deploy 'docker exec -it qwiki-mariadb mariadb -uroot -p qwiki_beta'` |
| Run MW maintenance script | `ssh unraid-deploy 'docker exec qwiki-mediawiki php /var/www/html/maintenance/<script>.php'` |

## Phase 4: quality-tag categories + URL slug doc + Layer 3 harvest-path verification

Phase 4 ships three small deliverables: the three quality-tag categories (`Needs review` / `Stale` / `Draft` per D18), the URL slug authoring rule documentation page (per D6), and an end-to-end verification of the Layer 3 harvest path (per Pass 6 6.3 substrate item 3). No new extensions or Composer changes; the deploy is paste-five-seed-pages + run-the-harvest-probe.

Prerequisite: operator is logged into `https://wiki.slipgate.me` as the Discord-OAuth-provisioned user with `wiki-curator` rights (so `Category:*` pages can be created -- D5 namespace gate). Phase 3 V_AUTH5 promotes the operator's user; if that step was skipped, run it now via `Special:UserRights` as `Admin`.

### Step 1: scp the seed-pages directory to Unraid (optional convenience)

The seed-page bodies are committed under `apps/qwiki-sandbox/deploy/seed-pages/`; they don't need to live on Unraid (they're not consumed by any container), but the operator may scp them for grep/diff convenience:

```bash
scp -r apps/qwiki-sandbox/deploy/seed-pages \
  unraid-deploy:/mnt/user/appdata/qwiki-beta/
```

### Step 2: create the three Category pages via the wiki UI

For each of `Needs review`, `Stale`, `Draft`:

1. In the browser (logged in as the operator's wiki-curator user), visit `https://wiki.slipgate.me/index.php?title=Category:<Name>&action=edit` (substituting the category name; spaces in URLs become underscores).
2. Paste the body verbatim from `apps/qwiki-sandbox/deploy/seed-pages/Category-<Name>.wikitext` (replacing space with underscore in the filename).
3. Save with edit summary `Phase 4: create quality-tag category per D18`.

After all three: visit `https://wiki.slipgate.me/index.php?title=Special:Categories`. Confirm all three categories are listed (they appear once they have a body, even if no member pages reference them yet -- MW shows non-empty category pages in `Special:Categories`).

### Step 3: create the Help:URL slug discipline page

1. Visit `https://wiki.slipgate.me/index.php?title=Help:URL_slug_discipline&action=edit`.
2. Paste the body from `apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext`.
3. Save with edit summary `Phase 4: URL slug discipline doc per D6`.

Confirm: visiting `https://wiki.slipgate.me/wiki/Help:URL_slug_discipline` renders the page.

### Step 4: create the harvest probe test page

1. Visit `https://wiki.slipgate.me/index.php?title=Phase_4_harvest_probe&action=edit`.
2. Paste the body from `apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext`.
3. Save with edit summary `Phase 4: harvest probe test page`.

Confirm: visiting `https://wiki.slipgate.me/wiki/Phase_4_harvest_probe` renders the page with the `== Spectator mode ==` section visible.

### Step 5: smoke probe auto-categorization mechanism

Phase 4 does not wire auto-categorization globally -- that's a page-type-template concern starting Phase 5. To confirm the underlying mechanism works:

1. In the browser, edit `https://wiki.slipgate.me/wiki/Phase_4_harvest_probe`.
2. Add `[[Category:Needs review]]` at the bottom of the wikitext. Save.
3. Visit `https://wiki.slipgate.me/index.php?title=Category:Needs_review`. Confirm: `Phase 4 harvest probe` appears in the category's member list.
4. (Optional) Edit the page again, remove the category tag, save. Confirm: the page disappears from the category listing on the next visit.

This proves the MW category mechanism works against the seed pages. Phase 5's Mode template will exercise the same mechanism via template-include.

### Step 6: run the load-concepts pipeline against the new concept-note

The harvested concept-note file `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` is committed in the repo at Phase 4 boundary (authored by the Phase 4 executor's subagent during Task 8). From the operator's WSL terminal in the project root:

```bash
cd apps/qw-oracle
bun scripts/load-concepts/index.ts
```

Expected output: a summary line indicating the new note ingested without warnings; the existing 9 notes either re-ingested or hash-skipped (most should hash-skip since unchanged). No `WARN` lines mentioning `test-qwiki-harvest-probe`. Exit code 0.

### Step 7: query oracle MCP search_concepts to verify retrieval

The oracle MCP server is at `https://oracle.slipgate.me/mcp`. In the operator's Claude Desktop or Claude Code session with the oracle MCP wired:

1. Issue a `search_concepts` query for a phrase that should match the harvested chunk -- e.g. "spectator mode joining server as observer".
2. Confirm: at least one result returned with `slug: test-qwiki-harvest-probe` and a non-zero `match_quality` (typically `strong` or `moderate` depending on RRF calibration).

If the MCP query interface isn't directly callable from the operator's tooling, the alternative is a `psql` probe against the `qw_oracle` DB:

```bash
cd apps/qw-oracle
PSQL_CMD='SELECT slug FROM concepts WHERE slug = '\''test-qwiki-harvest-probe'\'';'
echo "$PSQL_CMD" | bun run db:psql
```

(Substitute the actual psql shim from your repo if `db:psql` isn't the name; the live oracle CLAUDE.md names the canonical command.)

### Step 8: commit + push the Phase 4 artifacts

```bash
git add apps/qwiki-sandbox/deploy/seed-pages/ \
        apps/qwiki-sandbox/deploy/README.md \
        apps/qwiki-sandbox/OVERVIEW.md \
        apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md \
        apps/qw-oracle/curated/concept-notes/README.md \
        docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md
git commit -m "phase 4: quality-tag categories + URL slug doc + L3 harvest verification (arc qwiki-v1-beta)"
git push origin main
```

(`docs/superpowers/plans/.../phase-4-discipline-harvest.md` is included if the phase MD itself was just-approved + committed in the same window; if the MD landed in an earlier commit, omit from the add list.)

### Troubleshooting -- Phase 4 specific

**Category page edit blocked with "you do not have permission to edit this page".** The operator's wiki user isn't in `wiki-curator`. Promote via `Special:UserRights` as `Admin` (Phase 1 sysop). The Discord-role-sync helper from Phase 3 only manages `wiki-contributor`; `wiki-curator` is manual.

**load-concepts run errors with "no concept-note file found".** Verify the file lives at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` (the CLI scans that directory only). Verify the frontmatter is parseable YAML (`gray-matter` is strict on indentation + colon spacing).

**load-concepts run errors with `JSONB string scalar` warning or DB constraint.** The `qw_oracle` schema has the `F1.jsonb_columns_not_strings` regression gate. If the note's frontmatter accidentally has a stringified JSON value in a JSONB column, the loader rejects it. Re-run the Task 8 authoring with the canonical YAML shape from `apps/qw-oracle/curated/concept-notes/README.md`.

**MCP search_concepts returns 0 results.** Verify the chunk was embedded -- `bun scripts/load-concepts/index.ts` should also dispatch `embed-chunks.ts` per the loader's index.ts. If embeddings didn't fire (e.g., Voyage API key absent from `.env`), the search falls back to lexical-only. Re-run after ensuring `VOYAGE_API_KEY` is set in `apps/qw-oracle/.env` (operator's existing oracle env should have it from Layer 3 work).

**MCP search_concepts returns the wrong slug.** The RRF score may rank a sibling concept-note higher for an ambiguous query. Try a more distinctive phrase from the harvested chunk; the `Phase 4 harvest probe` source page deliberately includes the word "harvest probe" in the prose for this reason.

**Phase 4 harvest probe wiki page disappears from Category:Needs review.** The tag was removed (deliberately or by edit) -- not a failure. The auto-categorization mechanism doesn't fire here because Phase 4 doesn't ship a page-type template; the smoke test in Step 5 is one-shot.

---

## Troubleshooting

- **`docker compose ps` shows `qwiki-mediawiki` restarting** -- run
  `ssh unraid-deploy 'docker logs qwiki-mediawiki --tail 50'`. Most likely:
  `LocalSettings.php` PHP syntax error (verify with
  `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` from WSL) or the
  MariaDB volume hasn't initialized yet (let it run for 30 seconds and check
  `docker compose ps` again).

- **`qwiki-nginx` exits or won't start** -- usually an `nginx.conf` syntax
  error.
  ```bash
  ssh unraid-deploy 'docker logs qwiki-nginx --tail 30'
  ssh unraid-deploy 'docker run --rm \
    -v /mnt/user/appdata/qwiki-beta/nginx:/etc/nginx/conf.d:ro \
    nginx:1.30-alpine nginx -t'
  ```

- **CF Tunnel returns 502** -- nginx is unreachable from the tunnel agent's
  network, or nginx is up but mediawiki php-fpm is unreachable on
  qwiki-net. Verify:
  - `ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'`
    shows `qwiki-nginx` listening on `192.168.1.205:8081->80`.
  - `ssh unraid-deploy 'curl -sI http://192.168.1.205:8081/index.php?title=Main_Page'` returns a 2xx.
  - The CF Tunnel public hostname entry matches `http://192.168.1.205:8081` (not
    `https://`, not `127.0.0.1`).
  - From inside nginx, mediawiki is reachable: `ssh unraid-deploy 'docker exec qwiki-nginx wget -qO- http://mediawiki:9000 2>&1 | head -3'` -- fastcgi over TCP doesn't speak HTTP, so wget will error, but the connection error vs name-resolution error tells you whether the network resolves.

- **CF Tunnel returns 504 / nginx times out on fastcgi** -- mediawiki php-fpm
  is unreachable on `mediawiki:9000`. Check `docker network inspect qwiki-net`
  and confirm both `qwiki-nginx` and `qwiki-mediawiki` are attached. Then
  `ssh unraid-deploy 'docker exec qwiki-nginx nslookup mediawiki'` should resolve.

- **Main page renders but no Citizen skin** -- the skin volume may not be
  mounted correctly. Verify:
  - `ssh unraid-deploy 'ls /mnt/user/appdata/qwiki-beta/citizen/skin.json'` returns a path.
  - `ssh unraid-deploy 'docker exec qwiki-mediawiki ls /var/www/html/skins/Citizen/skin.json'`
    returns the same file via the bind mount.
  - `LocalSettings.php` has `wfLoadSkin( 'Citizen' );` AND `$wgDefaultSkin = "citizen";`.

- **install.php fails with "Granting permission to user 'qwiki' failed:
  Error 1133"** -- the installer tried `GRANT ALL ON qwiki_beta.* TO
  'qwiki'@'mariadb'` but the user with that specific host doesn't exist
  (only `qwiki@'%'` exists, from MariaDB container init). This means the
  step 7 pre-create sub-step was skipped or didn't take. Pre-create the
  user with the same password as `$MW_DB_PASSWORD` from `.env`:

  ```bash
  ssh unraid-deploy 'cd /mnt/user/appdata/qwiki-beta && set -a && . ./.env && set +a && \
    docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
      mariadb -uroot -e "CREATE USER \"qwiki\"@\"mariadb\" IDENTIFIED BY \"$MW_DB_PASSWORD\"; GRANT ALL PRIVILEGES ON qwiki_beta.* TO \"qwiki\"@\"mariadb\";"'
  ```

  If the failed install.php run also left a partial schema (~59 tables already
  in `qwiki_beta`), apply the "already installed" wipe recipe below before
  re-running step 7's install.php. The MW operation uses `qwiki@'%'` at
  runtime; `qwiki@'mariadb'` exists only to satisfy the installer's GRANT.

- **install.php fails with "already installed"** -- a previous attempt left
  install state on the MariaDB volume. For a fresh first-time install, wipe
  the MariaDB volume. The MariaDB container writes files as uid 999 inside
  the container; the host-side `claude-deploy` user can't `rm -rf` them
  directly. Use a privileged alpine container (root inside the bind mount)
  to do the wipe:

  ```bash
  ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml down && \
    docker run --rm -v /mnt/user/appdata/qwiki-beta/mariadb-data:/data alpine \
      sh -c "find /data -mindepth 1 -delete" && \
    docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d --wait mariadb'
  ```

  Then re-run from step 7 (which includes the pre-create + install.php).
  Only safe at first-time deploy; this discards the MW DB schema. The
  mediawiki-html bind-mount tree is not affected.

- **`composer update` fails with "Your requirements could not be resolved"** --
  common cause is a too-tight version constraint in `composer.local.json` vs
  what Packagist has published for SMW. Verify the latest tag at
  `https://packagist.org/packages/mediawiki/semantic-media-wiki` and adjust
  the constraint (e.g., relax `~6.0.1` to `~6.0` if 6.0.x has churned). Less
  common: a transient Packagist outage; retry the composer run.

- **`maintenance/update.php` errors with "SemanticMediaWiki: class not found"** --
  composer did not generate the autoload entries for SMW. Verify
  `/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/composer/autoload_classmap.php`
  contains `SMW\` entries; if not, re-run `composer update --no-dev` and check
  the output for "Generating optimized autoload files". If the file is empty
  or missing, delete `vendor/composer/installed.json` + `composer.lock` and
  re-run.

- **`Special:FormEdit/TestForm` returns "Form does not exist"** -- the
  `Form:TestForm` page was not saved into the NS_FORM namespace. Verify the
  namespace was registered: `ssh unraid-deploy 'docker exec qwiki-mediawiki \
  php /var/www/html/maintenance/run.php showJobs.php'` should not error; the
  Form namespace appears in `Special:AllPages` namespace dropdown. If
  NS_FORM is absent, restart mediawiki (the LocalSettings.php
  `wfLoadExtension( 'PageForms' )` call may not have run after the scp).

- **`Special:Version` lists Page Forms or SMW with an "ERROR" tag** -- check
  `docker logs qwiki-mediawiki --tail 100` for PHP fatals. Common: PHP
  extension missing (SMW requires `intl` + `mbstring`; the upstream
  `mediawiki:1.43-fpm` image bundles both, so this is unlikely). If the log
  shows a class-not-found, see the "class not found" troubleshooting entry
  above.

- **`docker compose` command not found after Unraid reboot** -- compose plugin
  is on tmpfs; reinstall per `apps/quad/DEPLOYMENT.md` "Compose plugin caveat".
  This is the one situation in this runbook that requires root: operator runs
  the reinstall via `ssh unraid` (the scoped `claude-deploy` user cannot write
  to system paths).

## Backup + recovery

- **Backup:** inherited from Unraid -> Synology weekly tarball of `/mnt/user/appdata/`
  per `/home/paradoks/projects/unRAID/docs/server/backup.md`. No bespoke wiring
  required. Everything the stack needs is under `/mnt/user/appdata/qwiki-beta/`
  (MariaDB data including SMW's `smw_*` tables, MW source tree including SMW
  source + Composer-managed vendor/, uploaded images, Citizen + Page Forms
  overlays, configs); the weekly tarball captures all of it.

- **Recovery (data loss):** restore `/mnt/user/appdata/qwiki-beta/` from the
  most recent Synology tarball, then bring the stack up. MariaDB state lives
  in `mariadb-data/` (including the `smw_*` tables); MW source in
  `mediawiki-html/` (including SMW source at `extensions/SemanticMediaWiki/`
  + SMW deps in `vendor/` + the `composer.local.json` / `composer.lock`
  pins); uploaded images in `mediawiki-data/`; Citizen skin in `citizen/`;
  Page Forms checkout in `page-forms/`. Nothing else needs to be re-pulled
  or re-extracted; the bind-mount layout means everything was in the
  backup.

- **Recovery (LocalSettings.php damage):** `git checkout HEAD --
  apps/qwiki-sandbox/deploy/LocalSettings.php` in the operator's WSL, then
  redeploy via the routine-LocalSettings redeploy section above.

- **Recovery (nginx.conf damage):** same pattern -- git checkout, scp,
  `nginx -t`, `nginx -s reload`.
