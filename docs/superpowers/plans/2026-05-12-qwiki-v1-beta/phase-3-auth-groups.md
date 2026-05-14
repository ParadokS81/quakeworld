# Phase 3 -- PluggableAuth + Discord OAuth + wiki-contributor / wiki-curator groups + namespace restrictions

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (table at bottom of that file).
> 3. Read prior approved phase MDs (Phase 1, Phase 2) -- their "Outputs to next phase" sections name what state this phase inherits.
> 4. After drafting, dispatch the verification sub-agent (brief at bottom of this template).

## Goal

Install PluggableAuth + the OpenID Connect provider extension onto the MW 1.43 substrate from Phase 2; wire Discord as the OAuth provider via manual endpoint configuration (Discord exposes OAuth 2.0 + the `openid` scope but no `.well-known/openid-configuration` discovery, so endpoints are passed explicitly via the OpenIDConnect ext's `providerConfig` data key per the recon against `includes/OpenIDConnect.php` REL1_43); create the two MW groups `wiki-contributor` and `wiki-curator` per D4; auto-assign `wiki-contributor` on every successful login by reading the user's `@wiki-beta` Discord role membership via the Discord API and toggling group membership accordingly; apply D5 namespace edit restrictions so `Form` / `Form_talk` / `Template` / `Template_talk` / `Category` / `Category_talk` are `wiki-curator`-only while `Main` / `Talk` / `File` / `File_talk` / `User` / `User_talk` remain `wiki-contributor`-editable. The `MediaWiki:` namespace stays sysop-only (MW default).

Two framing points that govern the install-shape choices below:

1. **PluggableAuth is git-clone overlay; OpenIDConnect needs Composer for `jumbojett/openid-connect-php`.** PluggableAuth ships with no Packagist deps (autoloads its own classes); a `git clone --branch REL1_43` into a sibling host path + `:ro` overlay bind onto `/var/www/html/extensions/PluggableAuth` is the canonical install (mirrors the Page Forms shape from Phase 2). OpenIDConnect's `composer.json` declares one runtime dep (`jumbojett/openid-connect-php: 1.0.2`), which the OpenIDConnect ext docs install via a path entry in MW's `composer.local.json`. We therefore (a) git-clone the OpenIDConnect ext into `/mnt/user/appdata/qwiki-beta/openid-connect/` + overlay-bind, AND (b) append a `"composer.local.json"` entry pointing at `extensions/OpenIDConnect/composer.json` so MW's `composer-merge-plugin` picks up jumbojett on the next `composer update --no-dev`. The Phase 1 image-bump rsync procedure already excludes `composer.local.json` per Phase 2's amendment, so this survives MW image bumps.

2. **Discord is NOT a turnkey provider in either OpenIDConnect or WSOAuth.** Both extensions list the standard enterprise IdPs (Google / Azure / Keycloak / Okta / GitLab / Cognito / Nextcloud) but not Discord. The OpenIDConnect ext supports manual endpoint configuration via the `providerConfig` data key (verified by reading `initClient()` in `includes/OpenIDConnect.php` REL1_43 v8.3.0; the call routes through to jumbojett's `providerConfigParam()` which bypasses `.well-known/openid-configuration` discovery). Combined with Discord's `openid` scope (which makes Discord return a standards-compliant id_token with `sub` claim), this gives a workable Discord auth path. Discord-role-as-claim mapping does NOT work out of the box, however: Discord does not return role data inside the id_token. The roles live behind a separate authenticated GET to `https://discord.com/api/users/@me/guilds/<guild_id>/member`. Phase 3 implements this via two MediaWiki hooks (`LocalUserCreated` for first-login, `UserLoggedIn` for subsequent logins) wired inline in `LocalSettings.php`; both call a shared helper that fetches the guild-member payload using the access token PluggableAuth stored in the auth session, then adds or removes the `wiki-contributor` group via `UserGroupManager`. This is more PHP than typical PluggableAuth setups; the `subagent (Sonnet medium)` execution mode is therefore selected for the LocalSettings.php task per D26 + the drafter-prompt override.

WSOAuth was the listed alternative per `decisions.md` D2 Amendment #2 carry-forward. Verified during recon: WSOAuth has the same Discord limitations (Discord not built-in; requires `$wgOAuthCustomAuthProviders` custom-provider class) and the same `groupsyncs` mechanism. Neither extension offers a turnkey advantage over the other for this specific Discord-roles requirement. We honor the `prerequisites.md` operator pre-decision (OpenIDConnect) for the draft and surface WSOAuth as a fallback in Open Questions if the OpenIDConnect + manual-provider-config approach fails the V_AUTH4 probe.

**Runnable state at phase boundary:** opening `https://wiki.slipgate.me` in an incognito browser shows a "Log in with Discord" button rendered by PluggableAuth in the Citizen skin's user-menu area; clicking it redirects to Discord's OAuth consent screen, authorizing returns to `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin` with a session cookie set + the operator logged in as a MW user; `Special:ListUsers` shows the operator's MW account; `Special:UserRights` / `Special:ListGroupRights` shows the operator's groups include `wiki-contributor` (auto-assigned via the `@wiki-beta` Discord role hook); the operator can edit `Main:TestEditPage` (create + save); the operator CANNOT edit `Template:Test` (the Phase 2 smoke-test template; returns "you do not have permission to edit this page"); after the operator manually promotes a second test user to `wiki-curator` via `Special:UserRights` + that user logs in, the second user CAN edit `Template:Test`.

## Inputs from previous phase

Phase 2 complete:

- Page Forms extension (REL1_43 branch HEAD at deploy time) installed at `/mnt/user/appdata/qwiki-beta/page-forms/` and overlay-bound; NS_FORM (106) + NS_FORM_TALK (107) namespaces exist.
- Semantic MediaWiki 6.0.x installed via Composer; `enableSemantics( 'wiki.slipgate.me' )` active.
- `qwiki_beta` MariaDB schema migrated by `maintenance/update.php`; 39 `smw_*` tables present (no `pf_*` -- Page Forms is wikitext-side only); total MW table count 97. (Phase 2 MD's original ~16 / ~74-80 prediction corrected post-deploy 2026-05-14.)
- `apps/qwiki-sandbox/deploy/composer.local.json` committed and scp'd to `/mnt/user/appdata/qwiki-beta/mediawiki-html/`; currently pins SMW only.
- `apps/qwiki-sandbox/deploy/test-form/` committed (smoke-test form + template wikitext breadcrumbs).
- `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` has Page Forms overlay binds on mediawiki + nginx services.
- `apps/qwiki-sandbox/deploy/LocalSettings.php` has `wfLoadExtension( 'PageForms' )` + `wfLoadExtension( 'SemanticMediaWiki' )` + `enableSemantics()`.
- `apps/qwiki-sandbox/deploy/README.md` has Phase 1 + Phase 2 sections including the Phase 2-amended image-bump procedure (`--exclude composer.local.json` / `--exclude composer.lock` + post-rsync `composer update --no-dev`).
- The wiki currently has `Form:TestForm`, `Template:Test`, `TestPage` (main NS) from Phase 2's smoke probe.
- F1 (MW 1.39 lifecycle) closed; substrate ships on MW 1.43 LTS + MariaDB 11.4 LTS + nginx 1.30-alpine + Citizen v3.16.0.

Operator-side prerequisites for Phase 3 (per `prerequisites.md`):

- Discord OAuth application registered at `https://discord.com/developers/applications`; `Client ID` + `Client Secret` captured; redirect URI configured to `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin`.
- `@wiki-beta` Discord role exists in the relevant Discord server (the server that hosts the contributor pool); role ID captured (Discord developer-mode-enabled right-click on the role -> Copy ID).
- Operator's Discord user-ID captured for self-verification of the first-login auto-assignment.
- Tailscale up; `ssh unraid-deploy 'echo ok'` returns `ok`.
- Operator's WSL can reach Docker Hub (transitively true from Phase 1 + Phase 2).
- The operator's MW `Admin` user is still accessible (used to manually promote the first `wiki-curator` user via `Special:UserRights` during V_AUTH5; alternatively the operator may promote themselves to `wiki-curator` via the same path after the auto-assigned `wiki-contributor` group lands during V_AUTH3).

The optional `/invite_wiki @user` Quad command from `prerequisites.md` is NOT a Phase 3 requirement; v1 beta invitee volume is small (1-2) and operator can manually assign the `@wiki-beta` Discord role from the Discord client. Surfaced as an open question; default = defer.

## Files touched

### Created

```
(none new in git; all Phase 3 work modifies existing committed files)
```

On Unraid (operator-created during deploy, not in git):

```
/mnt/user/appdata/qwiki-beta/pluggable-auth/                        # git clone --branch REL1_43 of mediawiki-extensions-PluggableAuth; overlay-bound onto /var/www/html/extensions/PluggableAuth
/mnt/user/appdata/qwiki-beta/openid-connect/                        # git clone --branch REL1_43 of mediawiki-extensions-OpenIDConnect; overlay-bound onto /var/www/html/extensions/OpenIDConnect
/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/jumbojett/       # composer-installed jumbojett/openid-connect-php 1.0.2 (added to vendor/ by composer update --no-dev)
```

On the running wiki (operator-created at phase-boundary verification, not in git, not on Unraid filesystem):

```
Main:TestEditPage           -- created by the operator via the wiki UI as the auto-assigned wiki-contributor; probes V_AUTH4
(second test user, manually promoted to wiki-curator via Special:UserRights) -- probes V_AUTH5
```

### Modified

```
apps/qwiki-sandbox/deploy/composer.local.json               # add path-entry for extensions/OpenIDConnect/composer.json so jumbojett library resolves
apps/qwiki-sandbox/deploy/docker-compose.prod.yml           # add PluggableAuth + OpenIDConnect overlay binds on mediawiki + nginx services
apps/qwiki-sandbox/deploy/.env.prod.example                 # add DISCORD_OAUTH_CLIENT_ID / DISCORD_OAUTH_CLIENT_SECRET / DISCORD_GUILD_ID / DISCORD_WIKI_BETA_ROLE_ID env-var templates
apps/qwiki-sandbox/deploy/LocalSettings.php                 # add Auth section: wfLoadExtension(PluggableAuth) + wfLoadExtension(OpenIDConnect) + $wgPluggableAuth_Config Discord entry + wiki-contributor / wiki-curator group permissions + $wgNamespaceProtection per D5 + LocalUserCreated / UserLoggedIn hook code that fetches Discord roles and grants wiki-contributor
apps/qwiki-sandbox/deploy/README.md                         # add Phase 3 install section + Discord OAuth setup pointers + amend image-bump procedure (PluggableAuth + OpenIDConnect git-clone refresh) + Troubleshooting additions for OAuth flow failures
apps/qwiki-sandbox/OVERVIEW.md                              # Phase 3 state note (auth + groups + namespace restrictions wired)
```

### Deleted

n/a -- no files removed in this phase.

## Tasks

### Task 1 -- Update apps/qwiki-sandbox/deploy/composer.local.json with OpenIDConnect path entry

**Goal.** Append a `"merge-plugin"` extra section (or update the existing `require` block) so that `composer update --no-dev` resolves the `jumbojett/openid-connect-php` dependency declared in `extensions/OpenIDConnect/composer.json`. The OpenIDConnect ext's README documents the path-entry pattern (rather than direct package require) because the ext's own composer.json carries the exact pinned version (`jumbojett/openid-connect-php: 1.0.2`); MW's `composer-merge-plugin` reads that and adds it to MW root's resolved dep set.

**Files.** `apps/qwiki-sandbox/deploy/composer.local.json`.

**Execution mode.** `inline` -- pure config; full content shipped (D22 / D26). The change is additive: Phase 2's SMW `require` stays verbatim, with a new `extra.merge-plugin.include` array added.

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/deploy/composer.local.json` with the content below.

Full file content to write:

```json
{
    "require": {
        "mediawiki/semantic-media-wiki": "~6.0.1"
    },
    "extra": {
        "merge-plugin": {
            "include": [
                "extensions/OpenIDConnect/composer.json"
            ]
        }
    }
}
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/composer.local.json && echo OK` returns `OK`. `python3 -c "import json; json.load(open('apps/qwiki-sandbox/deploy/composer.local.json'))" && echo OK` returns `OK` (valid JSON). `jq -r '.extra."merge-plugin".include[0]' apps/qwiki-sandbox/deploy/composer.local.json` returns `extensions/OpenIDConnect/composer.json`.

### Task 2 -- Update apps/qwiki-sandbox/deploy/docker-compose.prod.yml with PluggableAuth + OpenIDConnect overlay binds

**Goal.** Add two new bind mounts to both the `mediawiki` and `nginx` services: `/mnt/user/appdata/qwiki-beta/pluggable-auth` -> `/var/www/html/extensions/PluggableAuth` and `/mnt/user/appdata/qwiki-beta/openid-connect` -> `/var/www/html/extensions/OpenIDConnect`. Both services need the overlay so (a) mediawiki executes the extension PHP and (b) nginx serves any static assets the extensions ship under `extensions/PluggableAuth/` or `extensions/OpenIDConnect/`. Sibling-host-path overlay (mirror of the Page Forms shape) keeps the extensions intact across MW image bumps; the rsync in Phase 1's image-bump procedure operates against `mediawiki-html/` only.

**Files.** `apps/qwiki-sandbox/deploy/docker-compose.prod.yml`.

**Execution mode.** `inline` -- ship the FULL updated file content (D22 / D26). The change is additive: two new bind-mount lines per service, no structural change to the compose shape.

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` with the content below.

Full file content to write:

```yaml
# apps/qwiki-sandbox/deploy/docker-compose.prod.yml
# Unraid stack for qwiki-v1-beta: nginx 1.30-alpine + MediaWiki 1.43 (fpm)
# + MariaDB 11.4 LTS. nginx fronts both static-asset serving (from the
# shared mediawiki-html bind mount) and fastcgi proxying to mediawiki:9000.
#
# Phase 2 added the Page Forms overlay bind. Phase 3 (this revision) adds
# the PluggableAuth + OpenIDConnect overlay binds. Semantic MediaWiki is
# installed via Composer into mediawiki-html/extensions/SemanticMediaWiki/
# and does NOT need a new bind (it lives inside the parent mediawiki-html
# bind-mount). OpenIDConnect lives at a sibling host path (overlay-bound)
# because the ext source itself needs to survive MW image bumps; the
# OpenIDConnect Composer dependency (jumbojett/openid-connect-php 1.0.2)
# lives under mediawiki-html/vendor/jumbojett/ and is refreshed by the
# post-image-bump composer update --no-dev step in deploy/README.md.
#
# Operator workflow (see deploy/README.md). All persistent data lives under
# /mnt/user/appdata/qwiki-beta/, which is on the weekly Unraid -> Synology
# backup (D3). No named docker volumes; bind-mounts only.

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
      # Phase 3: Discord OAuth credentials + role mapping config.
      DISCORD_OAUTH_CLIENT_ID: ${DISCORD_OAUTH_CLIENT_ID}
      DISCORD_OAUTH_CLIENT_SECRET: ${DISCORD_OAUTH_CLIENT_SECRET}
      DISCORD_GUILD_ID: ${DISCORD_GUILD_ID}
      DISCORD_WIKI_BETA_ROLE_ID: ${DISCORD_WIKI_BETA_ROLE_ID}
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
      # Page Forms overlay (Phase 2; git-checked-out REL1_43 on host);
      # read-only. Sibling host path so MW image-bump rsync against
      # mediawiki-html/ doesn't wipe it.
      - /mnt/user/appdata/qwiki-beta/page-forms:/var/www/html/extensions/PageForms:ro
      # PluggableAuth overlay (Phase 3; git-checked-out REL1_43 on host);
      # read-only. Sibling host path for the same image-bump-survivability
      # reason as Page Forms.
      - /mnt/user/appdata/qwiki-beta/pluggable-auth:/var/www/html/extensions/PluggableAuth:ro
      # OpenIDConnect overlay (Phase 3; git-checked-out REL1_43 on host);
      # read-only. The ext's Composer dependency (jumbojett/openid-connect-php)
      # is composer-installed into mediawiki-html/vendor/ rather than here.
      - /mnt/user/appdata/qwiki-beta/openid-connect:/var/www/html/extensions/OpenIDConnect:ro
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
      # existing Cloudflare Tunnel agent routes wiki.slipgate.me to this
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
      # Same Page Forms overlay (Phase 2), read-only. Static CSS / JS under
      # extensions/PageForms/ is served by nginx directly per the
      # /(skins|extensions|resources)/.../...static-extensions location
      # block in nginx.conf.
      - /mnt/user/appdata/qwiki-beta/page-forms:/var/www/html/extensions/PageForms:ro
      # Same PluggableAuth + OpenIDConnect overlays (Phase 3), read-only.
      # Same static-asset rationale as Page Forms.
      - /mnt/user/appdata/qwiki-beta/pluggable-auth:/var/www/html/extensions/PluggableAuth:ro
      - /mnt/user/appdata/qwiki-beta/openid-connect:/var/www/html/extensions/OpenIDConnect:ro
    networks:
      - qwiki-net

networks:
  qwiki-net:
    name: qwiki-net
    driver: bridge
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml && echo OK` returns `OK`. `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config -q && echo OK` returns `OK` (valid compose syntax; runs offline). `grep -c 'pluggable-auth\|openid-connect' apps/qwiki-sandbox/deploy/docker-compose.prod.yml` returns `4` (two binds each on mediawiki + nginx).

### Task 3 -- Update apps/qwiki-sandbox/deploy/.env.prod.example with Discord OAuth env-var templates

**Goal.** Append four Discord-related env-var templates to the existing `.env.prod.example` from Phase 1: `DISCORD_OAUTH_CLIENT_ID` + `DISCORD_OAUTH_CLIENT_SECRET` (from the Discord developer-portal OAuth app), `DISCORD_GUILD_ID` (the Discord server hosting the `@wiki-beta` role), `DISCORD_WIKI_BETA_ROLE_ID` (the role used to gate wiki-contributor auto-assignment). The example file is committed (placeholders only, no real secrets); the real `.env` on Unraid is operator-authored from this template + chmod 600 per Phase 1's pattern.

**Files.** `apps/qwiki-sandbox/deploy/.env.prod.example`.

**Execution mode.** `inline` -- pure config; full file content shipped (D22 / D26). Phase 1's existing variables stay verbatim with four new lines appended under a Phase 3 section header.

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/deploy/.env.prod.example` with the content below.

Full file content to write:

```bash
# apps/qwiki-sandbox/deploy/.env.prod.example
# Template for the production .env file on Unraid at
# /mnt/user/appdata/qwiki-beta/.env (chmod 600, NOT committed to git).
# Copy this file, fill in real values, scp to Unraid, then chmod 600.

# --- Phase 1 (MW core + MariaDB) ---

# MariaDB root password (used by install.php run + ad-hoc admin SQL).
# Generated once at first deploy; rotating requires also rotating the
# MariaDB container's stored root password (re-init from empty data dir
# or ALTER USER inside the container).
MARIADB_ROOT_PASSWORD=

# MW database-user password (used by LocalSettings.php $wgDBpassword).
# Set at MariaDB-init time; rotating requires ALTER USER inside MariaDB
# AND updating this env var + restarting mediawiki.
MW_DB_PASSWORD=

# MW $wgSecretKey -- cryptographic key for session cookies + CSRF tokens.
# Generate with: openssl rand -hex 32
# Rotating invalidates existing sessions.
MW_SECRET_KEY=

# MW $wgUpgradeKey -- gate for the web-installer upgrade flow.
# Generate with: openssl rand -hex 32
# Not load-bearing since we run install.php / update.php via CLI.
MW_UPGRADE_KEY=

# MW initial admin password -- set at install.php run time. Used to
# bootstrap the wiki + perform first-time manual edits (smoke-test
# form / template authoring per Phase 2 + manually promote the first
# wiki-curator user per Phase 3). Rotate via Special:ChangePassword
# inside the wiki UI post-deploy.
MW_ADMIN_PASSWORD=

# --- Phase 3 (PluggableAuth + Discord OAuth) ---

# Discord OAuth application credentials. Create the app at
# https://discord.com/developers/applications. Redirect URI must be
# https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin
DISCORD_OAUTH_CLIENT_ID=
DISCORD_OAUTH_CLIENT_SECRET=

# Discord server (guild) hosting the @wiki-beta role. Right-click the
# server icon in Discord (with developer mode enabled in
# User Settings -> Advanced -> Developer Mode) -> Copy Server ID.
DISCORD_GUILD_ID=

# Discord @wiki-beta role ID. Right-click the role in the
# Server Settings -> Roles list -> Copy Role ID. Used by the
# LocalUserCreated / UserLoggedIn hooks in LocalSettings.php to decide
# whether to add the freshly-authenticated user to the MW wiki-contributor
# group. Removing this role in Discord propagates to wiki-contributor
# removal on the next login (the hook re-evaluates every login).
DISCORD_WIKI_BETA_ROLE_ID=
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/.env.prod.example && echo OK` returns `OK`. `grep -c '^DISCORD_' apps/qwiki-sandbox/deploy/.env.prod.example` returns `4`. `grep -c '^[A-Z_]*=$' apps/qwiki-sandbox/deploy/.env.prod.example` returns the number of empty-value template lines (currently 9: five Phase 1 + four Phase 3); if non-empty values slipped into the committed file, this probe surfaces them.

### Task 4 -- Update apps/qwiki-sandbox/deploy/LocalSettings.php with Auth + Groups + Namespace restrictions + Discord role-sync hooks

**Goal.** Append a Phase 3 Auth section to the Phase 2 LocalSettings.php that:

1. Loads PluggableAuth + OpenIDConnect extensions via `wfLoadExtension`.
2. Sets the three PluggableAuth global flags (`EnableAutoLogin` = false to preserve anonymous read; `EnableLocalLogin` = false to remove the username/password form; `EnableLocalProperties` = false so Discord remains source of truth for real-name + email).
3. Grants `autocreateaccount` to `*` (required by PluggableAuth per upstream docs -- otherwise the auto-provisioning on first Discord login fails with permission error).
4. Configures `$wgPluggableAuth_Config['Discord']` with the OpenIDConnect plugin + Discord-specific data (`providerURL`, `clientID`, `clientsecret`, `scope`, and a `providerConfig` manual-endpoints array since Discord doesn't expose `.well-known/openid-configuration`; plus an `issuerValidator` that accepts Discord's non-standard issuer string).
5. Declares the two MW groups via `$wgGroupPermissions`: `wiki-contributor` inherits the standard editor permissions (`edit`, `createpage`, `createtalk`, `move`, `upload`, `reupload`, `read`); `wiki-curator` adds `delete`, `protect`, `undelete`, `edit-curator-namespace` (custom right defined below), and other curator-scoped rights per D5 + Pass 5 5.3a.
6. Applies the D5 namespace restrictions via `$wgNamespaceProtection`: NS_FORM (106), NS_FORM_TALK (107), NS_TEMPLATE (10), NS_TEMPLATE_TALK (11), NS_CATEGORY (14), NS_CATEGORY_TALK (15) all require the custom right `edit-curator-namespace` (granted only to `wiki-curator`). NS_MEDIAWIKI stays sysop-only via MW default.
7. Registers two MediaWiki hooks (`LocalUserCreated` + `UserLoggedIn`) that both call a shared helper `qwikiBetaSyncDiscordRole( $user )`. The helper reads the OAuth access token PluggableAuth stored at `OpenIDConnect::OIDC_ACCESSTOKEN_SESSION_KEY`, issues a GET against `https://discord.com/api/users/@me/guilds/<DISCORD_GUILD_ID>/member` with a `Authorization: Bearer <token>` header, parses the JSON response, and adds the user to `wiki-contributor` via `UserGroupManager::addUserToGroup()` if the response's `roles[]` array contains `DISCORD_WIKI_BETA_ROLE_ID` (or removes them via `removeUserFromGroup()` if not).

The hook code is inline in LocalSettings.php (~70 lines including comments) because (a) it's tightly coupled to the Discord-OAuth-config above + the env vars defined in `.env`; (b) shipping a separate `.php` file under `deploy/` would require an additional docker-compose bind-mount; (c) the function is small enough that the LocalSettings.php inline approach matches MW's typical site-config pattern for one-off hook implementations.

**Files.** `apps/qwiki-sandbox/deploy/LocalSettings.php`.

**Execution mode.** `subagent (Sonnet medium)` -- the LocalSettings.php content includes real PHP logic (Discord API call, group-membership sync, error handling for missing env vars / 401 / 404 from Discord), not just config assignments. Per the drafter-prompt override of D22 for OAuth-config tasks: "subagent (Sonnet medium) for OAuth config (Discord API specifics, claim mapping)" -- this task is exactly that shape. The subagent's verification value is checking (a) the OpenIDConnect `data` array keys against the live `OpenIDConnect.php` source (e.g., `providerConfig` exists per recon; `issuerValidator` callable exists per recon), (b) the hook signature against MW 1.43's hook documentation, (c) the `UserGroupManager` service access pattern, (d) error handling on the curl call (timeouts, non-200 responses, malformed JSON).

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/deploy/LocalSettings.php` with the content below.

Full file content to write:

```php
<?php
# apps/qwiki-sandbox/deploy/LocalSettings.php
# MediaWiki 1.43 LTS configuration for qwiki-v1-beta (wiki.slipgate.me).
# Hand-authored; install.php is run once to bootstrap the DB schema, but its
# generated LocalSettings.php is discarded in favor of this committed file.
#
# Secrets read from the container's environment (populated via docker-compose
# env_file or environment block); never committed in plaintext here.
#
# Phase 1 scope: MW core + Citizen skin only.
# Phase 2 scope: + Page Forms + Semantic MediaWiki.
# Phase 3 scope (this revision): + PluggableAuth + OpenIDConnect (Discord
# OAuth provider) + wiki-contributor / wiki-curator MW groups + namespace
# edit restrictions per D4 / D5 + Discord-role-driven group sync hooks.
# Phase 4: + quality-tag categories per D18.

if ( !defined( 'MEDIAWIKI' ) ) {
    exit;
}

# --- Site identity ---------------------------------------------------------

$wgSitename = "QuakeWorld Wiki (beta)";
$wgMetaNamespace = "QuakeWorld_Wiki";

# The wiki lives at the apex of wiki.slipgate.me; no /w/ script path.
$wgScriptPath = "";
$wgServer = "https://wiki.slipgate.me";
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

# Disabled in v1 beta. PluggableAuth + Discord OAuth (Phase 3) is the primary
# signup path, so password resets are not load-bearing at v1.
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

wfLoadSkin( 'Vector' );
wfLoadSkin( 'MonoBook' );
wfLoadSkin( 'Timeless' );
wfLoadSkin( 'Citizen' );

$wgDefaultSkin = "citizen";

# --- Permissions ----------------------------------------------------------

# MW default denies anonymous edit + createaccount; we keep those denials.
# PluggableAuth requires autocreateaccount on * so the OAuth-driven first-
# login flow can auto-provision the MW user account (upstream PluggableAuth
# install docs are explicit on this; otherwise the first login fails with
# "you do not have permission to create accounts").
$wgGroupPermissions['*']['createaccount'] = false;
$wgGroupPermissions['*']['edit'] = false;
$wgGroupPermissions['*']['createpage'] = false;
$wgGroupPermissions['*']['createtalk'] = false;
$wgGroupPermissions['*']['read'] = true;
$wgGroupPermissions['*']['autocreateaccount'] = true;

# Sysop (the install-time admin user) keeps MW defaults so initial wiki
# setup edits and curator promotion via Special:UserRights work.

# wiki-contributor: standard editor scope -- content + Talk + File + User
# namespaces. Phase 3 D5 leaves Form / Template / Category curator-only.
$wgGroupPermissions['wiki-contributor']['read'] = true;
$wgGroupPermissions['wiki-contributor']['edit'] = true;
$wgGroupPermissions['wiki-contributor']['createpage'] = true;
$wgGroupPermissions['wiki-contributor']['createtalk'] = true;
$wgGroupPermissions['wiki-contributor']['move'] = true;
$wgGroupPermissions['wiki-contributor']['upload'] = true;
$wgGroupPermissions['wiki-contributor']['reupload'] = true;
$wgGroupPermissions['wiki-contributor']['reupload-own'] = true;
$wgGroupPermissions['wiki-contributor']['minoredit'] = true;
$wgGroupPermissions['wiki-contributor']['writeapi'] = true;
$wgGroupPermissions['wiki-contributor']['purge'] = true;
$wgGroupPermissions['wiki-contributor']['noratelimit'] = false;

# wiki-curator: inherits wiki-contributor rights + curator scope per Pass 5
# 5.3a + D17. The custom 'edit-curator-namespace' right is paired with
# $wgNamespaceProtection (below) to gate Form / Template / Category edits.
$wgGroupPermissions['wiki-curator']['read'] = true;
$wgGroupPermissions['wiki-curator']['edit'] = true;
$wgGroupPermissions['wiki-curator']['createpage'] = true;
$wgGroupPermissions['wiki-curator']['createtalk'] = true;
$wgGroupPermissions['wiki-curator']['move'] = true;
$wgGroupPermissions['wiki-curator']['upload'] = true;
$wgGroupPermissions['wiki-curator']['reupload'] = true;
$wgGroupPermissions['wiki-curator']['reupload-own'] = true;
$wgGroupPermissions['wiki-curator']['reupload-shared'] = true;
$wgGroupPermissions['wiki-curator']['minoredit'] = true;
$wgGroupPermissions['wiki-curator']['writeapi'] = true;
$wgGroupPermissions['wiki-curator']['purge'] = true;
$wgGroupPermissions['wiki-curator']['delete'] = true;
$wgGroupPermissions['wiki-curator']['undelete'] = true;
$wgGroupPermissions['wiki-curator']['deletedhistory'] = true;
$wgGroupPermissions['wiki-curator']['deletedtext'] = true;
$wgGroupPermissions['wiki-curator']['protect'] = true;
$wgGroupPermissions['wiki-curator']['rollback'] = true;
$wgGroupPermissions['wiki-curator']['suppressredirect'] = true;
$wgGroupPermissions['wiki-curator']['edit-curator-namespace'] = true;
$wgGroupPermissions['wiki-curator']['noratelimit'] = true;

# Hide group-self-add UX: contributors cannot self-promote; curators cannot
# self-add to sysop. Operator manages curator promotion via Special:UserRights.
$wgAddGroups['wiki-curator'] = [];
$wgRemoveGroups['wiki-curator'] = [];

# Namespace edit restrictions per D5 + Pass 5 5.4a. The 'edit-curator-namespace'
# right is granted only to wiki-curator (above), so any user without that
# group is blocked from editing pages in these namespaces even if they have
# the global 'edit' right.
$wgNamespaceProtection[NS_TEMPLATE] = [ 'edit-curator-namespace' ];
$wgNamespaceProtection[NS_TEMPLATE_TALK] = [ 'edit-curator-namespace' ];
$wgNamespaceProtection[NS_CATEGORY] = [ 'edit-curator-namespace' ];
$wgNamespaceProtection[NS_CATEGORY_TALK] = [ 'edit-curator-namespace' ];
# Page Forms namespaces are 106 (NS_FORM) + 107 (NS_FORM_TALK); referenced
# numerically because Page Forms defines the constants in its own extension
# load (and the constants are not in scope at config-merge time).
$wgNamespaceProtection[106] = [ 'edit-curator-namespace' ];
$wgNamespaceProtection[107] = [ 'edit-curator-namespace' ];

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

# --- Extensions (Phase 2) -------------------------------------------------

# Page Forms (REL1_43 branch HEAD at deploy time).
wfLoadExtension( 'PageForms' );

# Semantic MediaWiki 6.0.x (Composer-installed).
wfLoadExtension( 'SemanticMediaWiki' );
enableSemantics( 'wiki.slipgate.me' );

# --- MW bundled-extension activation surface (Phase 2) --------------------
#
# Audit performed 2026-05-14 against /var/www/html/extensions/ (34 bundled).
# F-finding F6 tracks this audit; future MW LTS arcs inherit this surface.
#
# LOAD (active in v1 baseline; universal-need extensions for a
# template-driven wiki):
#   ParserFunctions  -- #if / #switch / #ifeq / #expr / #time; required by
#                       Template:Test and any future page-type template.
#   Cite             -- footnote support (<ref>...</ref> + <references/>);
#                       supports D11 #4 citation discipline.
#   CategoryTree     -- supports Layer B sub-category nav per spec-sketch v3.
#   TemplateData     -- <templatedata> JSON for template self-documentation;
#                       supports Phase 5+ page-type template discoverability.
#
# SKIP (locked decision against; do NOT load even later):
#   VisualEditor  -- D2 explicit ("Visual Editor is NOT in v1 baseline").
#   OATHAuth      -- D4 auth via Discord OAuth supersedes username/password 2FA.
#   LoginNotify   -- D4 OAuth flow doesn't generate the email-login signals
#                    this extension watches.
#   Math          -- QW domain has no math/LaTeX rendering need.
#   PdfHandler    -- QW domain has no PDF upload pathway.
#
# DEFER (not loaded now; revisit when a downstream phase needs it):
#   AbuseFilter, CiteThisPage, CodeEditor, ConfirmEdit, DiscussionTools, Echo,
#   Gadgets, ImageMap, InputBox, Interwiki, Linter, MultimediaViewer, Nuke,
#   PageImages, Poem, ReplaceText, Scribunto, SecureLinkFixer, SpamBlacklist,
#   SyntaxHighlight_GeSHi, TextExtracts, Thanks, TitleBlacklist, WikiEditor.

wfLoadExtension( 'ParserFunctions' );
wfLoadExtension( 'Cite' );
wfLoadExtension( 'CategoryTree' );
wfLoadExtension( 'TemplateData' );

# --- Extensions (Phase 3) -------------------------------------------------

# PluggableAuth (REL1_43 branch HEAD at deploy time). Provides the
# AuthManager integration that lets external OAuth providers (here:
# OpenIDConnect against Discord) auto-provision MW user accounts.
wfLoadExtension( 'PluggableAuth' );

# OpenIDConnect REL1_43 v8.3.0+. Registers itself as a PluggableAuth plugin
# via extension.json attributes; the 'plugin' => 'OpenIDConnect' string in
# $wgPluggableAuth_Config below routes auth attempts to this class.
# Composer dependency jumbojett/openid-connect-php:1.0.2 lives at
# mediawiki-html/vendor/jumbojett/ after the deploy-time composer update.
wfLoadExtension( 'OpenIDConnect' );

# PluggableAuth global flags. Auto-login OFF keeps anonymous browsing
# possible (D4: read access is public). Local-login OFF removes the
# username/password form (Discord OAuth is the only auth path).
# Local-properties OFF means Discord remains source of truth for real-name
# and email; users cannot override either on the wiki.
$wgPluggableAuth_EnableAutoLogin = false;
$wgPluggableAuth_EnableLocalLogin = false;
$wgPluggableAuth_EnableLocalProperties = false;

# PluggableAuth provider registry. Single entry: 'Discord' (operator-facing
# button label) -> OpenIDConnect plugin against Discord's OAuth endpoints.
# Discord doesn't expose .well-known/openid-configuration; manual endpoints
# go in providerConfig per OpenIDConnect.php's initClient() recon (the call
# routes through to jumbojett's providerConfigParam() which bypasses
# discovery). issuerValidator returns true unconditionally because Discord
# returns an issuer string that doesn't match the providerURL (Discord's
# id_token sets iss = 'https://discord.com' but the OIDC ext defaults to
# strict issuer equality with the providerURL).
$wgPluggableAuth_Config['Discord'] = [
    'plugin' => 'OpenIDConnect',
    'data' => [
        'providerURL' => 'https://discord.com',
        'clientID' => getenv( 'DISCORD_OAUTH_CLIENT_ID' ) ?: '',
        'clientsecret' => getenv( 'DISCORD_OAUTH_CLIENT_SECRET' ) ?: '',
        # Discord OAuth scopes: 'openid' is required so Discord returns a
        # signed id_token (OpenIDConnect ext reads 'sub' from there);
        # 'identify' gives username + global avatar; 'guilds.members.read'
        # gives access to /users/@me/guilds/<guild_id>/member for the
        # role-membership check.
        'scope' => 'openid identify guilds.members.read',
        # Manual OIDC config since Discord lacks .well-known discovery.
        # Endpoints from https://discord.com/developers/docs/topics/oauth2.
        'providerConfig' => [
            'issuer' => 'https://discord.com',
            'authorization_endpoint' => 'https://discord.com/api/oauth2/authorize',
            'token_endpoint' => 'https://discord.com/api/oauth2/token',
            'userinfo_endpoint' => 'https://discord.com/api/users/@me',
            'jwks_uri' => 'https://discord.com/api/oauth2/keys',
        ],
        'issuerValidator' => static function ( $issuer ) {
            return true;
        },
    ],
];

# --- Discord role sync (Phase 3) ------------------------------------------
#
# Discord roles are NOT in the OIDC id_token. PluggableAuth's built-in
# 'syncall' / 'mapped' GroupSync types both assume claim-driven mapping;
# neither fits the Discord-API-call shape. We therefore re-check role
# membership on every login via two MW hooks:
#   - LocalUserCreated: fires on first OAuth-driven account creation.
#   - UserLoggedIn: fires on every subsequent login (re-evaluates
#     role membership; handles role revocation gracefully).
# Both hooks call the same helper, which is small enough to inline here
# rather than shipping as a separate file.

$wgHooks['LocalUserCreated'][] = static function ( $user, $autocreated ) {
    qwikiBetaSyncDiscordRole( $user );
};

$wgHooks['UserLoggedIn'][] = static function ( $user ) {
    qwikiBetaSyncDiscordRole( $user );
};

/**
 * Sync the wiki-contributor MW group from the user's @wiki-beta Discord
 * role membership. Reads the OAuth access token PluggableAuth stored at
 * OpenIDConnect::OIDC_ACCESSTOKEN_SESSION_KEY, calls Discord's
 * /users/@me/guilds/<guild_id>/member endpoint, and adds or removes the
 * user from wiki-contributor based on the response's roles[] array.
 *
 * Fails silently (no group change) on:
 *   - missing env config (DISCORD_GUILD_ID / DISCORD_WIKI_BETA_ROLE_ID),
 *   - missing access token (e.g., non-OAuth login by the sysop user),
 *   - non-200 from Discord (network error, expired token, user left guild).
 *
 * Removing the user from wiki-contributor on a 404 from
 * /users/@me/guilds/<guild_id>/member matches the spirit of D4's
 * revocation symmetry: if the user has left the Discord server, they
 * lose contributor access on next login.
 */
function qwikiBetaSyncDiscordRole( $user ): void {
    $services = \MediaWiki\MediaWikiServices::getInstance();
    $authManager = $services->getAuthManager();
    $accessToken = $authManager->getAuthenticationSessionData(
        \MediaWiki\Extension\OpenIDConnect\OpenIDConnect::OIDC_ACCESSTOKEN_SESSION_KEY
    );
    if ( !$accessToken ) {
        return;
    }

    $guildId = getenv( 'DISCORD_GUILD_ID' ) ?: '';
    $betaRoleId = getenv( 'DISCORD_WIKI_BETA_ROLE_ID' ) ?: '';
    if ( $guildId === '' || $betaRoleId === '' ) {
        wfDebugLog( 'qwiki-beta',
            'Discord role sync skipped: DISCORD_GUILD_ID or DISCORD_WIKI_BETA_ROLE_ID missing.' );
        return;
    }

    $url = "https://discord.com/api/users/@me/guilds/{$guildId}/member";
    $ch = curl_init( $url );
    curl_setopt_array( $ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [ "Authorization: Bearer {$accessToken}" ],
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ] );
    $body = curl_exec( $ch );
    $httpCode = (int)curl_getinfo( $ch, CURLINFO_HTTP_CODE );
    curl_close( $ch );

    $userGroupManager = $services->getUserGroupManager();
    $currentGroups = $userGroupManager->getUserGroups( $user );
    $hasContributor = in_array( 'wiki-contributor', $currentGroups, true );

    if ( $httpCode !== 200 || !is_string( $body ) ) {
        wfDebugLog( 'qwiki-beta',
            "Discord role sync: API returned HTTP {$httpCode}; removing wiki-contributor if present." );
        if ( $hasContributor ) {
            $userGroupManager->removeUserFromGroup( $user, 'wiki-contributor' );
        }
        return;
    }

    $data = json_decode( $body, true );
    $roleIds = ( is_array( $data ) && isset( $data['roles'] ) && is_array( $data['roles'] ) )
        ? $data['roles']
        : [];

    if ( in_array( $betaRoleId, $roleIds, true ) ) {
        if ( !$hasContributor ) {
            $userGroupManager->addUserToGroup( $user, 'wiki-contributor' );
        }
    } elseif ( $hasContributor ) {
        $userGroupManager->removeUserFromGroup( $user, 'wiki-contributor' );
    }
}
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/LocalSettings.php && echo OK` returns `OK`. `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` returns `No syntax errors detected`. `grep -c 'wfLoadExtension' apps/qwiki-sandbox/deploy/LocalSettings.php` returns `4` (PageForms, SemanticMediaWiki, PluggableAuth, OpenIDConnect). `grep -c "wgPluggableAuth_Config\[" apps/qwiki-sandbox/deploy/LocalSettings.php` returns `>= 1`. `grep -c 'qwikiBetaSyncDiscordRole' apps/qwiki-sandbox/deploy/LocalSettings.php` returns `3` (one function definition + two hook callsites). `grep -c "wgNamespaceProtection\[" apps/qwiki-sandbox/deploy/LocalSettings.php` returns `6` (NS_TEMPLATE, NS_TEMPLATE_TALK, NS_CATEGORY, NS_CATEGORY_TALK, 106, 107).

### Task 5 -- Extend apps/qwiki-sandbox/deploy/README.md with Phase 3 install section + Discord OAuth setup + image-bump amendment + Troubleshooting additions

**Goal.** Append a Phase 3 install section to the deploy runbook covering: clone PluggableAuth + OpenIDConnect into the sibling host paths; scp the updated `composer.local.json` + `docker-compose.prod.yml` + `LocalSettings.php` + `.env.prod.example`; have the operator populate the four new Discord env vars in `.env`; run `composer update --no-dev` to pull jumbojett; restart the stack; run `maintenance/update.php` (OpenIDConnect ships a `LoadExtensionSchemaUpdates` hook so a new `oidc_*` table is created); verify the Citizen "Log in with Discord" button renders; walk the OAuth flow end-to-end. Also amend the Phase 1-defined Routine MW Image Bump Procedure to mention the additional `pluggable-auth/` + `openid-connect/` git-clone refresh discipline (analogous to Phase 2's Page Forms refresh), and add Troubleshooting entries for OAuth-flow-specific failure modes.

The README is a long living document; this task ships the new section content + insertion-point markers (rather than the full rewritten file) because (a) the existing Phase 1 + Phase 2 sections are unchanged in structure; (b) the phase template's "ship full file content not a diff" rule applies most strictly to config files where every line matters, not living documentation; (c) operator review can verify the inserted sections against the existing README without re-reading the entire file. If the sub-agent verifier flags this as drift from the template, the rewrite path is to re-issue the full README content; this MD ships the delta with explicit anchor lines.

**Files.** `apps/qwiki-sandbox/deploy/README.md`.

**Execution mode.** `inline` -- pure documentation (D22 / D26). The new content is shipped inline; the executor uses `Edit` (not `Write`) with old_string anchors so the surrounding Phase 1 + Phase 2 content stays verbatim.

**Steps.**

- [ ] Use `Edit` with `old_string` = the last line of the Phase 2 install section (currently `*Phase 2 ships when V_PF1 + V_PF2 + V_SMW1 + V_SMW2 + V_OPS1 PASS. Phase 3 (PluggableAuth + Discord OAuth + wiki-contributor / wiki-curator groups + namespace edit restrictions per D4 / D5) is unblocked once Phase 2 is committed + pushed.*` -- located near the end of the Phase 2 section) and `new_string` = the original line + the Phase 3 install section block below.

Phase 3 install section to append (after the Phase 2 install closing marker):

```markdown

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

```

**Verification.** `grep -c "## Phase 3 install" apps/qwiki-sandbox/deploy/README.md` returns `1`. `grep -c "discord.com/developers/applications" apps/qwiki-sandbox/deploy/README.md` returns `>= 1`. `grep -c "qwikiBetaSyncDiscordRole\|wiki-contributor\|wiki-curator" apps/qwiki-sandbox/deploy/README.md` returns `>= 3`. `grep -c "Troubleshooting" apps/qwiki-sandbox/deploy/README.md` returns `>= 1` (existing Phase 1 + Phase 2 troubleshooting headers are untouched).

### Task 6 -- Update apps/qwiki-sandbox/OVERVIEW.md with Phase 3 state note

**Goal.** Update the Substrate state section in `OVERVIEW.md` to reflect Phase 3 shipped state: PluggableAuth + OpenIDConnect installed; Discord OAuth flow working; `wiki-contributor` + `wiki-curator` groups defined; D5 namespace restrictions enforced. The mini-arc state section stays unchanged (Phase 5+ work). The auto-shipped status references roll one step forward.

**Files.** `apps/qwiki-sandbox/OVERVIEW.md`.

**Execution mode.** `inline` -- pure documentation; full file content shipped (D22 / D26).

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/OVERVIEW.md` with the content below.

Full file content to write:

```markdown
# QWiki Sandbox -- Overview

Living map of the v1-beta substrate + Modes mini-arc tooling. Updated as state changes during the arc.

## Current arc

**`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`** -- 8-phase arc, 4 substrate phases + 4 Modes-mini-arc phases. See that directory's `README.md` for the phase index and live status table.

Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is superseded; preserved in `VISION.md` as ORIGINAL VISION appendix for historical context.

## Substrate state

After Phase 3 ships: a three-container Docker stack on Unraid -- `qwiki-nginx` (nginx 1.30-alpine, the CF Tunnel-facing entry point) + `qwiki-mediawiki` (mediawiki:1.43-fpm, php-fpm at port 9000) + `qwiki-mariadb` (mariadb 11.4 LTS) -- plus the Citizen skin v3.16.0 git checkout + Page Forms + Semantic MediaWiki 6.0.x extensions (Phase 2) + PluggableAuth + OpenIDConnect extensions (Phase 3). Live at `wiki.slipgate.me` via Cloudflare Tunnel.

Auth: PluggableAuth + OpenIDConnect against Discord OAuth (manual endpoint config; `openid identify guilds.members.read` scopes). The `wiki-contributor` MW group is auto-assigned on every login based on the user's `@wiki-beta` Discord role membership (re-checked via `/users/@me/guilds/<guild_id>/member`); `wiki-curator` is manually assigned by the operator via `Special:UserRights`. Anonymous read is public; anonymous edit blocked.

Namespace restrictions (D5): `Form` / `Form_talk` / `Template` / `Template_talk` / `Category` / `Category_talk` are `wiki-curator`-only (custom `edit-curator-namespace` right paired with `$wgNamespaceProtection`); `Main` / `Talk` / `File` / `File_talk` / `User` / `User_talk` are `wiki-contributor`-editable; `MediaWiki:` is sysop-only (MW default).

Phase 4 layers the quality-tag categories (`Needs review` / `Stale` / `Draft` per D18) + verifies the Layer 3 harvest path end-to-end against a test page.

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

Cross-cutting decisions live in the arc's `decisions.md` (D1-D26, locked 2026-05-12; D2 amended 2026-05-13 to lock nginx + php-fpm + MariaDB composition + current-stable image versions). No project-internal decisions log; if a phase needs to deviate from a locked decision, the phase MD's "Deviation" section + operator review handles it (per D25).
```

**Verification.** `grep -c "PluggableAuth + OpenIDConnect\|Discord OAuth" apps/qwiki-sandbox/OVERVIEW.md` returns `>= 1`. `grep -c "wiki-contributor\|wiki-curator" apps/qwiki-sandbox/OVERVIEW.md` returns `>= 2`. `grep -c "After Phase 3 ships" apps/qwiki-sandbox/OVERVIEW.md` returns `1`.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of Phase 3. YES/NO answers per D24.

**V_AUTH1. PluggableAuth + OpenIDConnect extensions are loaded + registered.**

```bash
ssh unraid-deploy 'curl -s http://192.168.1.205:8081/index.php?title=Special:Version' \
  | grep -E -c "PluggableAuth|OpenID Connect"
```

Operator-facing confirmation (browser): open `https://wiki.slipgate.me/index.php?title=Special:Version`, confirm "PluggableAuth" + "OpenID Connect" appear under "Installed extensions" with their version strings (PluggableAuth 7.5.0+, OpenID Connect 8.3.0+).

- **PASS condition:** the grep count is `>= 2`, AND `Special:Version` lists both extensions in the browser.
- **FAIL condition:** count is `< 2` (one or both extensions failed to load -- consult Troubleshooting "Log in with Discord button doesn't render").

**V_AUTH2. OpenIDConnect schema migration ran.**

OpenIDConnect ships a `LoadExtensionSchemaUpdates` hook that creates one table -- `openid_connect` -- mapping `oidc_user` (MW user id) to `oidc_subject` + `oidc_issuer` (verified by reading `sql/mysql/OpenIDConnect.sql` on REL1_43 during recon). Schema-migrated probe:

```bash
ssh unraid-deploy 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && \
  docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
  mariadb -uroot -N -B -e "USE qwiki_beta; SHOW TABLES LIKE \"openid_connect\";"' \
  | wc -l
```

- **PASS condition:** count `== 1` (the exact-named `openid_connect` table exists; `$wgDBprefix` is the empty string in this stack so no prefix is added).
- **FAIL condition:** count `0` (`maintenance/update.php` didn't run or didn't pick up the OIDC schema -- re-run per Troubleshooting "maintenance/update.php errors with class not found").

**V_AUTH3. End-to-end Discord OAuth login + wiki-contributor auto-assignment.**

Operator walks through the OAuth flow in a fresh incognito browser:

1. Visit `https://wiki.slipgate.me`.
2. Confirm: Citizen skin user-menu shows a "Log in with Discord" button.
3. Click. Confirm: redirect to `discord.com/oauth2/authorize?...` consent screen showing requested scopes (`openid`, `identify`, `guilds.members.read`).
4. Authorize. Confirm: redirect back to `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin`, then to Main Page, with the user-menu now displaying your Discord username.
5. Visit `Special:UserGroupRights` / find your username. Confirm: `wiki-contributor` group listed.

- **PASS condition:** all five steps succeed; your username appears in `Special:UserGroupRights` with `wiki-contributor` in the groups column.
- **FAIL condition:** any step fails (consult per-step Troubleshooting in `deploy/README.md` Phase 3 section).

**V_AUTH4. wiki-contributor can edit Main namespace but NOT Template namespace.**

While logged in as the auto-assigned wiki-contributor (your Discord-OAuth user):

1. Visit `https://wiki.slipgate.me/index.php?title=Main:TestEditPage&action=edit`. Save a small edit ("Phase 3 verification"). Confirm: save succeeds; the page renders with your edit.
2. Visit `https://wiki.slipgate.me/index.php?title=Template:Test&action=edit` (the Template created during Phase 2 smoke probe). Confirm: edit form is blocked with "you do not have permission to edit this page".

- **PASS condition:** Main edit succeeds; Template edit blocked with the permission message.
- **FAIL condition:** Main edit blocked (wiki-contributor isn't getting `edit` right -- check LocalSettings) OR Template edit succeeds (D5 namespace restriction misconfigured -- check `$wgNamespaceProtection[NS_TEMPLATE]` + `edit-curator-namespace` rights).

**V_AUTH5. wiki-curator (manual assignment) CAN edit Template namespace.**

Operator promotes a second test user (or themselves) to `wiki-curator`:

1. As MW `Admin` (Phase 1 sysop) in a separate browser session, visit `Special:UserRights`. Enter the wiki-contributor username from V_AUTH3. Tick `wiki-curator`. Save.
2. Back in the wiki-contributor's session (refresh): visit `Template:Test` -> Edit. Save a small comment ("curator edit test"). Confirm: save succeeds.

- **PASS condition:** Template edit by the newly-promoted wiki-curator user succeeds.
- **FAIL condition:** Template edit still blocked (the user's group cache might be stale -- have them log out and log back in via Discord OAuth; if still blocked, `edit-curator-namespace` right may not be granted to `wiki-curator` group -- check LocalSettings).

**V_AUTH6. Revocation works: removing `@wiki-beta` Discord role drops wiki-contributor on next login.**

This probe is operator-discretionary because it requires removing your own role:

1. In Discord, the operator removes the `@wiki-beta` role from a non-curator test user (do NOT use the sysop-promoted wiki-curator user; their wiki-curator group is manually assigned and won't drop).
2. That test user logs out of the wiki (via Special:UserLogout).
3. Test user logs in again via "Log in with Discord".
4. Visit `Special:UserGroupRights` / find the test user. Confirm: `wiki-contributor` no longer listed.

- **PASS condition:** wiki-contributor group is absent for the test user after re-login.
- **FAIL condition:** wiki-contributor still present (the UserLoggedIn hook didn't fire OR the Discord API call returned a stale role list -- consult Troubleshooting "Discord login succeeds but wiki-contributor group not granted").

V_AUTH6 is OPTIONAL for Phase 3 sign-off because it requires the operator to disrupt a Discord role for a real test user. If skipped at Phase 3 boundary, surface as a Phase 4 carry-forward verification.

**V_OPS1. All three containers still healthy.**

```bash
ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'
```

- **PASS condition:** `qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb` all `Up`; `qwiki-mariadb` `(healthy)`. The Phase 3 docker-compose binds didn't break the stack.
- **FAIL condition:** any container `Restarting` / `Exited` (consult Phase 1 V4 recovery + Phase 3 Troubleshooting additions).

If V_AUTH1 + V_AUTH2 + V_AUTH3 + V_AUTH4 + V_AUTH5 + V_OPS1 all PASS, the phase is green and Phase 4 (quality-tag categories + Layer 3 harvest path verification) is unblocked. V_AUTH6 (revocation symmetry) is OPTIONAL and may roll forward as a Phase 4 spot-check.

## Outputs to next phase

State now true that wasn't before Phase 3:

- PluggableAuth extension (REL1_43 branch HEAD, currently v7.5.0) installed at `/mnt/user/appdata/qwiki-beta/pluggable-auth/` and overlay-bound onto `/var/www/html/extensions/PluggableAuth` in both mediawiki + nginx services. `Special:PluggableAuthLogin` + `Special:PluggableAuthLogout` special pages registered.
- OpenIDConnect extension (REL1_43 branch HEAD, currently v8.3.0) installed at `/mnt/user/appdata/qwiki-beta/openid-connect/` and overlay-bound. `jumbojett/openid-connect-php 1.0.2` Composer dependency landed in `/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/jumbojett/`. OIDC schema table created by `maintenance/update.php`.
- `$wgPluggableAuth_Config['Discord']` registered with manual endpoints for Discord OAuth (`authorization_endpoint` / `token_endpoint` / `userinfo_endpoint` / `jwks_uri`) + scopes (`openid identify guilds.members.read`) + a permissive `issuerValidator`. Operator's Discord OAuth app credentials live in `/mnt/user/appdata/qwiki-beta/.env` (DISCORD_OAUTH_CLIENT_ID / DISCORD_OAUTH_CLIENT_SECRET / DISCORD_GUILD_ID / DISCORD_WIKI_BETA_ROLE_ID / DISCORD_BOT_TOKEN -- the last added during F9 resolution at deploy time per D4 Amendment 2026-05-14).
- Two MW groups defined: `wiki-contributor` (Main / Talk / File / User editable; auto-assigned via the `LocalUserCreated` + `UserLoggedIn` hooks reading the user's `@wiki-beta` Discord role membership) and `wiki-curator` (Form / Template / Category editable in addition + delete / protect / undelete / rollback; manually assigned via `Special:UserRights`).
- Custom right `edit-curator-namespace` defined; granted only to `wiki-curator`; paired with `$wgNamespaceProtection` to gate NS_TEMPLATE (10) / NS_TEMPLATE_TALK (11) / NS_CATEGORY (14) / NS_CATEGORY_TALK (15) / NS_FORM (106) / NS_FORM_TALK (107) edits.
- `$wgGroupPermissions['*']['autocreateaccount'] = true` (required by PluggableAuth for OAuth-driven auto-provisioning).
- Discord-role-sync helper `qwikiBetaSyncDiscordRole()` inline in `LocalSettings.php`; hooked into `LocalUserCreated` (first login) + `UserLoggedIn` (subsequent logins). At deploy time (F9 resolution per D4 Amendment 2026-05-14): the helper reads the Discord user-ID from `OIDC_SUBJECT_SESSION_KEY` and calls `https://discord.com/api/guilds/<DISCORD_GUILD_ID>/members/<sub>` with `Authorization: Bot <DISCORD_BOT_TOKEN>` (bot-mode, not user-OAuth-token-mode); toggles `wiki-contributor` group membership based on whether the response's `roles[]` includes `DISCORD_WIKI_BETA_ROLE_ID`. `$wgDebugLogGroups['qwiki-beta']` wired so subsequent diagnostics surface.
- `apps/qwiki-sandbox/deploy/composer.local.json` extended with direct-require of `jumbojett/openid-connect-php: 1.0.2` at MW root (per F7 resolution; original merge-plugin path-entry approach didn't survive cross-image composer setup since composer:latest doesn't see sibling-overlay extension paths).
- `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` extended with PluggableAuth + OpenIDConnect overlay binds on mediawiki + nginx services + four `DISCORD_*` env vars on the mediawiki service.
- `apps/qwiki-sandbox/deploy/.env.prod.example` extended with the four `DISCORD_*` template variables.
- `apps/qwiki-sandbox/deploy/LocalSettings.php` extended with the Phase 3 Auth + Groups + Namespace + Hook sections (~190 new lines including comments).
- `apps/qwiki-sandbox/deploy/README.md` extended with the Phase 3 install section + image-bump amendment + OAuth-flow Troubleshooting additions.
- `apps/qwiki-sandbox/OVERVIEW.md` marks Phase 3 shipped.
- The operator's MW user account exists (auto-provisioned during V_AUTH3); the operator is in `wiki-contributor` group. A second test user has been promoted to `wiki-curator` during V_AUTH5.

Phase 4's inputs match this output set + Phase 4-specific operator prerequisites (none new beyond Phase 3 -- the quality-tag category work is admin-side LocalSettings.php config + a test-page harvest probe via the existing `apps/qw-oracle/curated/concept-notes/` workflow).

## Open questions / deferred items

- **Question:** Discord is not a turnkey provider in either OpenIDConnect or WSOAuth (verified during recon against both `mediawiki.org/wiki/Extension:OpenID_Connect` + `Extension:WSOAuth`). This phase MD wires Discord via manual endpoint configuration in OpenIDConnect (`providerConfig` data key + permissive `issuerValidator`), which works in theory because Discord supports the `openid` scope and returns a standards-compliant id_token. If the V_AUTH3 OAuth flow fails at runtime with an unrecoverable error (e.g., jumbojett library's JWT validation rejects Discord's id_token despite the permissive validator), the fallback is to switch to WSOAuth + a custom Discord auth-provider class. WSOAuth has the same Discord limitations but its custom-provider-class extension point is more conducive to bypassing OIDC assumptions entirely.
  - **Default chosen for now:** OpenIDConnect with manual `providerConfig`. Aligns with operator pre-decision per `prerequisites.md`. Implementation cost is ~80 lines of LocalSettings.php (this phase) vs ~200 lines of custom PHP class for WSOAuth's `$wgOAuthCustomAuthProviders`.
  - **Who can resolve:** operator at V_AUTH3 verification. If the OpenIDConnect path fails, the resolution path is documented in the Troubleshooting section + a Phase 3 deviation surfaces the WSOAuth switch.

- **Question:** Discord roles are NOT in the OIDC id_token; PluggableAuth's built-in `syncall` / `mapped` GroupSync types don't fit the Discord-API-call shape. This phase implements role sync via two inline MW hooks (`LocalUserCreated` + `UserLoggedIn`) calling a custom helper rather than registering a third-party GroupSync class.
  - **Default chosen for now:** inline hooks. Keeps the Discord-specific logic in LocalSettings.php where the env-var config lives; avoids shipping a separate `.php` file under `deploy/`. Re-checks role membership on every login (handles revocation gracefully).
  - **Who can resolve:** n/a -- chosen design for v1 beta. If a third-party Discord-roles GroupSync class becomes available, future work can switch.

- **Question:** The optional `/invite_wiki @user` Quad command from `prerequisites.md` is NOT scoped to Phase 3 (v1 beta invitee volume is small; manual operator assignment of `@wiki-beta` Discord role via Discord client is sufficient).
  - **Default chosen for now:** defer to v1-beta-to-broader transition.
  - **Who can resolve:** operator. If `/invite_wiki` is wanted in v1, it becomes a small Quad-side patch (grant Discord role + DM the invitee with the wiki login link), not a wiki-side change. Not blocking Phase 3 sign-off.

- **Question:** The `wiki-curator` group rights set includes the standard MW deletion + protection rights (`delete` / `undelete` / `protect` / `deletedhistory` / `deletedtext` / `rollback` / `suppressredirect`) per Pass 5 5.3a's "delete pages / protect pages / edit restricted pages / revert to specific revision" enumeration. This is a broader scope than the bare minimum needed for D5 namespace gating; intentional per 5.3a's "Carapace burnout -> narrower load-bearing job" framing -- the curator's actual scope is narrower, but the rights set is permissive enough that operator interventions don't require sysop escalation.
  - **Default chosen for now:** the rights set above. Matches the standard MW patroller / janitor pattern.
  - **Who can resolve:** operator at V_AUTH5 sign-off. Narrowing the set (e.g., dropping `suppressredirect`) is a 1-line LocalSettings.php tweak at any later phase boundary.

- **Question:** The Citizen v3 skin's user-menu integration with PluggableAuth was not directly verified during recon (Citizen-skin documentation is sparse on PluggableAuth integration; the standard PluggableAuth pattern is to inject via the `SkinTemplateNavigation::Universal` hook which Citizen v3 honors per the upstream Citizen changelog). The V_AUTH3 step 2 ("Citizen skin user-menu shows a 'Log in with Discord' button") is the integration test.
  - **Default chosen for now:** assume standard integration works.
  - **Who can resolve:** operator at V_AUTH3 verification. If the button doesn't render, the fallback is to access `https://wiki.slipgate.me/index.php?title=Special:UserLogin` directly (PluggableAuth replaces the default UserLogin form) and verify the OAuth path that way; the button rendering is a UX nicety, not a load-bearing requirement.

- **Question:** Phase 3 grants `$wgGroupPermissions['*']['autocreateaccount'] = true` per upstream PluggableAuth docs. This is more permissive than the Phase 1 + Phase 2 baseline (which left `createaccount` = false for `*`). Practically, `autocreateaccount` only fires during an authenticated OAuth flow (it's the "MW may auto-create a local user record for an externally-authenticated user" right); it does NOT let anonymous users self-register a username/password account.
  - **Default chosen for now:** grant `autocreateaccount` = true per PluggableAuth requirement. The risk surface is narrow.
  - **Who can resolve:** n/a -- mandated by PluggableAuth upstream design.

- **Question:** Hook code in `LocalSettings.php` references `\MediaWiki\Extension\OpenIDConnect\OpenIDConnect::OIDC_ACCESSTOKEN_SESSION_KEY` constant directly. This couples LocalSettings.php to the OpenIDConnect ext's internal constant. If the OpenIDConnect ext is later renamed or the constant moved, the hook breaks silently (helper falls through to "skip silently on missing access token").
  - **Default chosen for now:** direct constant reference. Pragmatic for v1 beta; the constant has been stable since OpenIDConnect 4.x+ per the source-history skim.
  - **Who can resolve:** operator. If the constant moves, the hook needs updating; the failure mode is "wiki-contributor isn't granted on login", surfaced by V_AUTH3 failure + Troubleshooting steps.

## Recovery (if verification fails)

Per-failure-mode recovery; anticipatable failures only. Unanticipated failures route to operator.

- **V_AUTH1 fails (PluggableAuth or OpenIDConnect not in Special:Version):**
  - Verify host bind exists for each: `ssh unraid-deploy 'ls /mnt/user/appdata/qwiki-beta/pluggable-auth/extension.json /mnt/user/appdata/qwiki-beta/openid-connect/extension.json'`.
  - Verify container sees them: `ssh unraid-deploy 'docker exec qwiki-mediawiki ls /var/www/html/extensions/PluggableAuth/extension.json /var/www/html/extensions/OpenIDConnect/extension.json'`.
  - If a bind didn't take after the Phase 3 install: `ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d --force-recreate mediawiki nginx'`.
  - Verify LocalSettings has both `wfLoadExtension` lines: `ssh unraid-deploy 'docker exec qwiki-mediawiki grep -E "wfLoadExtension\\( '\''(PluggableAuth|OpenIDConnect)" /var/www/html/LocalSettings.php'`.

- **V_AUTH2 fails (OpenIDConnect schema table absent):**
  - Re-run `maintenance/update.php` (see Troubleshooting "maintenance/update.php errors with class not found" in `deploy/README.md`).
  - Verify composer landed jumbojett: `ssh unraid-deploy 'test -d /mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/jumbojett && echo OK'`.

- **V_AUTH3 fails (Discord OAuth redirect errors):**
  - Most common: redirect URI mismatch. Check the Discord developer-portal app's redirect URI exactly matches `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin` (case-sensitive in the query string).
  - Second-most: `clientID` / `clientsecret` mismatch. Re-copy from the developer portal into `.env`; ensure no surrounding quotes or whitespace.
  - Third: `issuerValidator` rejects the Discord issuer. Confirm the LocalSettings.php `issuerValidator` callable returns `true` unconditionally.

- **V_AUTH3 fails (Discord OAuth succeeds but wiki-contributor not granted):**
  - Walk the Troubleshooting "Discord login succeeds but wiki-contributor group not granted" section in `deploy/README.md` step-by-step.
  - Most common: missing `DISCORD_GUILD_ID` or `DISCORD_WIKI_BETA_ROLE_ID` in `.env`.
  - Second-most: wrong role ID (re-copy from Discord with developer mode).
  - Third: `guilds.members.read` scope not granted (Discord user must re-authorize the OAuth app to upgrade scopes -- revoke at https://discord.com/settings/authorized-apps and reauthorize).

- **V_AUTH4 fails (Main edit blocked):**
  - `wiki-contributor` group missing `edit` right. Verify: `ssh unraid-deploy 'docker exec qwiki-mediawiki grep "wiki-contributor.*'\''edit'\''" /var/www/html/LocalSettings.php'`. Expect `... = true;`.
  - User isn't actually in `wiki-contributor`: re-walk V_AUTH3.

- **V_AUTH4 fails (Template edit succeeds for wiki-contributor):**
  - `$wgNamespaceProtection[NS_TEMPLATE]` missing or wrong value. Verify: `ssh unraid-deploy 'docker exec qwiki-mediawiki grep -A1 "NS_TEMPLATE" /var/www/html/LocalSettings.php'`. Expect `[ 'edit-curator-namespace' ]`.

- **V_AUTH5 fails (wiki-curator can't edit Template):**
  - User's group cache might be stale. Have them logout via `Special:UserLogout` and log back in via Discord OAuth. The MW group cache refresh happens on login.
  - `edit-curator-namespace` right not granted to `wiki-curator`: verify with `grep "wiki-curator.*edit-curator-namespace" /var/www/html/LocalSettings.php`.

- **V_OPS1 fails (mediawiki restarting):** most likely PHP syntax error in LocalSettings.php (Phase 3 additions broke parsing).
  - Verify syntax: `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` from operator's WSL. Fix locally + scp + restart.
  - Or `docker logs qwiki-mediawiki --tail 50` to see the parse error line.

- **V_OPS1 fails (nginx exits):** the Phase 3 docker-compose addition broke the volumes block syntax.
  - Verify locally: `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config -q`. Fix + scp + `up -d`.

---

*Phase 3 ships when V_AUTH1 + V_AUTH2 + V_AUTH3 + V_AUTH4 + V_AUTH5 + V_OPS1 PASS. V_AUTH6 (revocation symmetry) is optional and may roll forward to Phase 4 verification. Phase 4 (quality-tag categories per D18 + Layer 3 harvest path verification) is unblocked once Phase 3 is committed + pushed.*
