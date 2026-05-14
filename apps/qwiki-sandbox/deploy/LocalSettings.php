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

# --- Discord role sync (Phase 3, F9-revised) ------------------------------
#
# Discord roles are NOT in the OIDC id_token. We re-check role membership on
# every login via two MW hooks (LocalUserCreated for first-login,
# UserLoggedIn for subsequent), both calling the same helper.
#
# F9 (2026-05-14): the original Phase 3 design read the user OAuth access
# token from OIDC_ACCESSTOKEN_SESSION_KEY and called the user-perspective
# /users/@me/guilds/<id>/member endpoint. That session key actually stores
# the *decoded JWT payload* (an array), not a Bearer-usable string -- so
# Discord returned 401 and the hook silently removed wiki-contributor (the
# user never had it). The raw user access token is not preserved past the
# OpenIDConnect auth-flow boundary.
#
# Fix: bot-mode. Read the Discord user ID from OIDC_SUBJECT_SESSION_KEY
# (the 'sub' claim) and query the bot-perspective endpoint
# /guilds/<id>/members/<user_id> with a Discord bot token. Bot tokens don't
# expire; the lookup works post-auth-flow; no fragile token-refresh logic.

# Debug log for the role-sync helper -- visible at /tmp/qwiki-beta-debug.log
# inside the mediawiki container; tail with
#   ssh unraid-deploy 'docker exec qwiki-mediawiki tail -f /tmp/qwiki-beta-debug.log'
$wgDebugLogGroups['qwiki-beta'] = '/tmp/qwiki-beta-debug.log';

$wgHooks['LocalUserCreated'][] = static function ( $user, $autocreated ) {
    qwikiBetaSyncDiscordRole( $user );
};

$wgHooks['UserLoggedIn'][] = static function ( $user ) {
    qwikiBetaSyncDiscordRole( $user );
};

/**
 * Sync the wiki-contributor MW group from the user's @wiki-beta Discord
 * role membership. Reads the Discord user ID PluggableAuth/OpenIDConnect
 * stored as the OIDC 'sub' claim, calls Discord's bot-perspective
 * /guilds/<guild_id>/members/<user_id> endpoint, and adds or removes the
 * user from wiki-contributor based on the response's roles[] array.
 *
 * Fails silently (no group change) on:
 *   - missing OIDC subject (e.g., non-OAuth login by the sysop user),
 *   - missing env config (DISCORD_BOT_TOKEN / DISCORD_GUILD_ID /
 *     DISCORD_WIKI_BETA_ROLE_ID),
 *   - non-200 from Discord (network error, bot not in guild, user not
 *     in guild).
 *
 * Removing the user from wiki-contributor on a 404 from
 * /guilds/<guild_id>/members/<user_id> matches the spirit of D4's
 * revocation symmetry: if the user has left the Discord server, they
 * lose contributor access on next login.
 */
function qwikiBetaSyncDiscordRole( $user ): void {
    $services = \MediaWiki\MediaWikiServices::getInstance();
    $authManager = $services->getAuthManager();
    $discordUserId = $authManager->getAuthenticationSessionData(
        \MediaWiki\Extension\OpenIDConnect\OpenIDConnect::OIDC_SUBJECT_SESSION_KEY
    );
    if ( !is_string( $discordUserId ) || $discordUserId === '' ) {
        wfDebugLog( 'qwiki-beta',
            'Discord role sync skipped: OIDC subject not found in session (non-OAuth login or sysop).' );
        return;
    }

    $botToken = getenv( 'DISCORD_BOT_TOKEN' ) ?: '';
    $guildId = getenv( 'DISCORD_GUILD_ID' ) ?: '';
    $betaRoleId = getenv( 'DISCORD_WIKI_BETA_ROLE_ID' ) ?: '';
    if ( $botToken === '' || $guildId === '' || $betaRoleId === '' ) {
        wfDebugLog( 'qwiki-beta',
            'Discord role sync skipped: DISCORD_BOT_TOKEN / DISCORD_GUILD_ID / DISCORD_WIKI_BETA_ROLE_ID missing.' );
        return;
    }

    $url = "https://discord.com/api/guilds/{$guildId}/members/{$discordUserId}";
    $ch = curl_init( $url );
    curl_setopt_array( $ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [ "Authorization: Bot {$botToken}" ],
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
            "Discord role sync: bot API returned HTTP {$httpCode} for sub {$discordUserId}; removing wiki-contributor if present." );
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
            wfDebugLog( 'qwiki-beta',
                "Discord role sync: sub {$discordUserId} has @wiki-beta; granting wiki-contributor." );
            $userGroupManager->addUserToGroup( $user, 'wiki-contributor' );
        }
    } elseif ( $hasContributor ) {
        wfDebugLog( 'qwiki-beta',
            "Discord role sync: sub {$discordUserId} no longer has @wiki-beta; removing wiki-contributor." );
        $userGroupManager->removeUserFromGroup( $user, 'wiki-contributor' );
    }
}
