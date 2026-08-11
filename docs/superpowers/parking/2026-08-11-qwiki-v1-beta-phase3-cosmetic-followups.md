# qwiki-v1-beta Phase 3 cosmetic followups

Extracted from quakeworld HANDOVER.md (pre-migration, lines 55-57) at the chunk-6 W17 migration, 2026-08-11.

Two items deferred from Phase 3 boundary (NOT Phase 4 scope; separate auth-shape polish micro-commit when convenient):

(a) Discord username extraction renders as literal `User` in Citizen user menu. Needs deploy-time recon of actual Discord OIDC payload claims before shipping a `$wgOpenIDConnect_UsernameClaim` fix; `preferred_username` is not guaranteed for Discord. Recon path: temporarily extend `qwikiBetaSyncDiscordRole` helper to `wfDebugLog('qwiki-beta', json_encode(...))` the session contents during one login, inspect `/var/www/html/log/qwiki-beta.log` to see actual claim names, then pick the right one (could become a small F10 if surfaced as cross-phase). The debug-log group `qwiki-beta` is already wired per F9 resolution.

(b) `MediaWiki:Group-wiki-contributor-member` + `MediaWiki:Group-wiki-curator-member` interface-message pages don't exist; user menu renders the message-key literals (`<group-wiki-contributor-member>`). ~30 seconds each in operator's Admin browser session: visit `MediaWiki:Group-wiki-contributor-member&action=edit`, type `wiki contributor`, save. Same for curator. If EnableLocalLogin=false blocks re-login as Admin, fallback is `docker exec qwiki-mediawiki php maintenance/edit.php` from `ssh unraid-deploy`.
