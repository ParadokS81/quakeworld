# Prerequisites -- Task 0 (operator-driven, before kicking off any phase)

These are one-shot manual steps the agentic loop cannot do. Run through the list once; if anything is already in place from prior work, check it off and move on.

The arc deploys directly to Unraid (no separate local-dev environment); Phase A is the first deploy moment. Prerequisites below cover Unraid-side access, Cloudflare, and Discord setup.

---

## Required before Phase A (substrate)

### Unraid access

- [ ] **Unraid SSH access verified.** From WSL: `ssh unraid-deploy 'echo ok'` returns `ok` (non-root scoped identity for deploy ops on `/mnt/user/appdata/qwiki-beta/`); `ssh unraid 'echo ok'` returns `ok` for the operator-only root identity (used for compose-plugin reinstall after Unraid reboot only). Tailscale up. (Both identities already in place; `unraid-deploy` was added 2026-05-13 mid-Phase-1.)
- [ ] **Operator can create directory** at `/mnt/user/appdata/qwiki-beta/` (or whatever subdir Phase A MD locks).
- [ ] **Existing weekly Unraid -> Synology backup covers `/mnt/user/appdata/`.** Confirmed per `/home/paradoks/projects/unRAID/docs/server/backup.md`; new containers auto-included via the appdata-backup tarball.

### Cloudflare access

- [ ] **Cloudflare account access** to the existing Tunnel + DNS for `quake.world`. (Same auth as qw-oracle Arc 1 prereqs.)
- [ ] **Operator can add subdomain** `wiki.slipgate.me` to Cloudflare DNS + Tunnel route. (No DNS change required upfront; happens during Phase A.)

### Discord OAuth + roles

- [ ] **Discord OAuth application registered.** Operator creates a new OAuth app at `https://discord.com/developers/applications` (or reuses an existing Quad-adjacent app if appropriate).
  - Redirect URI: `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin` (final URL confirmed during Phase B drafting).
  - Capture `Client ID` and `Client Secret`. Both populate the MW `LocalSettings.php` during Phase B.
  - Operator stores credentials securely (env file outside repo); phase MDs reference them by env-var name.

- [ ] **`@wiki-beta` Discord role exists** in the relevant Discord server (the server where the contributor pool lives). Operator creates it; permissions empty (gate is just role membership). Note the role ID for OAuth-claim mapping config.

### Dump-side state (informational; no action required)

- The local mariadb container `qwiki-analysis` is still running with the old-wiki dump imported (per brainstorm handoff). Keep it alive through the Modes mini-arc -- inventory queries for the analyze step depend on it. Operator can `docker rm -f qwiki-analysis` only after the Modes mini-arc verification ships.
- The image tarball at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G, unextracted) is reference material. Per-domain image migration is downstream; the Modes mini-arc may need a few screenshots, mass import deferred.

---

## Optional v1 Quad task (operator decides during Phase B drafting)

- [ ] **`/invite_wiki @user` Quad command implementation.** Pass 5 5.1 names this as v1 scope, but v1 beta invitee volume is tiny (1-2 invitees); operator can assign the `@wiki-beta` Discord role manually. If operator wants the Quad command in v1, the Phase B MD includes a small task; otherwise deferred to v1-beta-to-broader transition.

---

## Decision deferrals (operator clarifies on demand)

These are things the phase drafter may ask about. Pre-decide if you want to short-circuit them; otherwise the phase MD will surface them as open questions.

- [ ] **OAuth extension choice: OpenID Connect vs WSOAuth.** Both PluggableAuth-compatible providers satisfy D4. Default: OpenID Connect (more standard claim-mapping path).
- [ ] **Citizen skin left-rail TOC.** Pass 4 mentioned as optional; visual companion HTML v3 includes a sketch. Default: enabled.
- [ ] **MW image source.** Use the official `mediawiki:1.43-fpm` Docker image or build a custom image with extensions pre-installed? Default: official image + extensions mounted via host bind-mount + `LocalSettings.php` overlay (per Phase 1 Q5 resolution).
- [ ] **MariaDB image source.** Default: official `mariadb:11.4` (current LTS line per D2 Amendment #2).
- [ ] **Per-mode-page screenshot inclusion.** Some mode pages need screenshots (game footage / map angles). Default: flagship modes only get hero images; non-flagship modes can have screenshots added post-v1-beta.

---

## What this list deliberately does NOT include

- Anything the agentic loop can do (running `docker compose up`, configuring `LocalSettings.php`, configuring Cloudflare via API, running migrations, building curator tools).
- Anything that gets created by the phases themselves (`docker-compose.yml`, `LocalSettings.php`, MW extension config, Modes curator scaffolding, page-type forms / templates).
- Cleanup / rollback steps. Each phase lands a commit; rollback is `git revert`. No bespoke rollback infrastructure.
- Backup setup (inherited per D3; new containers auto-included in `/mnt/user/appdata/` tarball).
- Cutover infrastructure (future arc).

---

## Sign-off

When all "Required before Phase A" boxes are checked, the operator can hand a fresh terminal `phase-1-drafter-prompt.md` (or whatever the Phase A drafter prompt is named after slicing analysis settles).

If a prerequisite blocks a phase that's already started, the phase pauses at the relevant task and waits.
