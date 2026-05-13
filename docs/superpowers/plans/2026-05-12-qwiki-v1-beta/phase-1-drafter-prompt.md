You are drafting Phase 1 of the qwiki-v1-beta arc (2026-05-12).

## Context update 2026-05-13 -- D2 amendment locks nginx + php-fpm

A previous Phase 1 draft used Apache + PHP (official `mediawiki:1.39` image, single container). On operator review the read of Pass 6 6.3's parenthetical "(php-fpm + nginx + MariaDB + extensions)" was tightened: it specifies the production-standard composition, not an illustrative sketch. `decisions.md` D2 now carries a 2026-05-13 amendment locking **nginx + php-fpm + MariaDB** as the web-server stack (three containers).

The stale prior draft lives at `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md`. You read it for STRUCTURE (the eight-task shape, the verification probe shape, the open-question shape are all sound and worth preserving) but do NOT preserve its Apache+PHP-specific choices (docker-compose service set, deploy-README topology section, V4 probe container list, Tasks 1-3 topology mentions). Your redraft overwrites that file at the same path.

**Substantively changed by the amendment:**

- **Task 4 (docker-compose.prod.yml):** three services instead of two. `nginx` (nginx:1.27-alpine or equivalent stable Alpine line) + `mediawiki` (mediawiki:1.39-fpm, the official upstream-maintained php-fpm variant) + `mariadb` (mariadb:10.11). nginx and mediawiki share the `/var/www/html` volume so nginx can serve static assets directly; mediawiki proxies `.php` over fastcgi at port 9000.
- **New file `apps/qwiki-sandbox/deploy/nginx.conf`** -- MW-specific fastcgi proxy config + static-asset serving. Standard MW nginx config; reference the MediaWiki manual's "nginx" page via Context7 for the canonical snippets (rewrite rules for short URLs / `/index.php` routing / `images/` direct serve / `LocalSettings.php` protection / `.git` denial).
- **Task 7 (deploy README):** three-container topology in the topology diagram; nginx.conf in the appdata file list; first-time-deploy adds an nginx-config-place step; operator commands table adds nginx restart and nginx config-test rows.
- **V4 probe:** lists three healthy containers (`qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb`) not two.
- **Tasks 1-3 (CLAUDE.md / README.md / OVERVIEW.md):** topology summary phrases like "MW + MariaDB" become "nginx + mediawiki-fpm + MariaDB."

**Substantively unchanged by the amendment:**

- **Task 5 (.env.prod.example):** same five env vars; no nginx-specific secrets needed for v1 (nginx serves over HTTP behind Cloudflare Tunnel; no TLS-in-nginx).
- **Task 6 (LocalSettings.php):** same hand-authored content; `$wgServer` / `$wgScriptPath` / `$wgUsePrivateIPs` / `$wgDBpassword` via getenv() all unchanged.
- **Task 8 (operator deploy):** same first-time-deploy choreography (appdata tree -> scp -> .env -> Citizen clone -> mariadb up -> install.php -> full up -> CF Tunnel route). The nginx.conf scp lands in step 2 alongside the existing files.

**Additional Context7 recon needed for redraft (beyond the original phase-specific recon):**

- Pull current `mediawiki:1.39-fpm` upstream image docs (`docker pull mediawiki:1.39-fpm` shape; expected entrypoint; port 9000; volume mount for `/var/www/html/`).
- Pull canonical MediaWiki nginx configuration (the MW manual page "Manual:Short URL/Nginx" and "Manual:Nginx" cover the rewrite rules + fastcgi pass + static-asset rules).
- Confirm nginx-fastcgi pass to a separate php-fpm container uses the form `fastcgi_pass mediawiki:9000;` (where `mediawiki` is the docker-compose service name).

Otherwise the original phase-specific recon (a-e below) still applies.

Read `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` D2 amendment in full before drafting -- the amendment is the source of truth on what changed.

---

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt and surface to operator if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1; this arc has D1-D26).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/` or `docs/superpowers/plans/2026-05-04-ktx-onboarding/`.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene", "Pattern 6 cross-header lift", "F1 quality-grid", "tree-sitter KTX onboarding".
- Postgres / pgvector / tsvector / Discord chat corpus / KTX server engine terminology.

If you see those, you are in the wrong arc -- halt.

## Phase 1 scope

MW core substrate. Stand up a Docker stack on Unraid with MediaWiki 1.39 LTS + MariaDB 10.11 LTS + Citizen skin (vanilla, no extensions yet). Wire Cloudflare Tunnel for `wiki-beta.quake.world`. No auth setup in this phase (Phase 3 wires PluggableAuth + Discord OAuth). MW default `$wgGroupPermissions` is restricted so anonymous edits are denied; read access is public.

Runnable state at phase boundary: `curl -sI https://wiki-beta.quake.world` returns HTTP/2 200 OK; visiting the URL in a browser shows the MW main page rendered with Citizen skin loaded; anonymous edit is blocked (Edit button hidden or returns "you must be logged in").

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

You do NOT execute anything in this session (no docker, no MW config, no curl, no SSH to Unraid). The phase MD you produce becomes input to a separate execution session later. Drafting is paper-only.

## Required reading

Read all of these before drafting; do not skip:

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- full; D1, D2, D3, D5 (partial: namespace restrictions deferred to Phase 3), D21-D26 most relevant
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- operator setup this phase assumes done
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md` -- the mandatory shape for your output
6. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 6 6.3 LOCKED (substrate items 1 + 4)
7. `apps/qwiki-sandbox/CLAUDE.md` -- pre-pivot doc; this phase includes a task to update it to fresh-build language
8. `/home/paradoks/projects/unRAID/docs/server/backup.md` -- confirms appdata backup inheritance (no new backup scaffolding needed per D3)

## Phase-specific recon (before drafting)

a. List `apps/qwiki-sandbox/` contents. Confirm no `docker-compose.yml` exists yet (Phase 1 creates it).

b. Look at existing Unraid-hosted Docker apps in the monorepo for precedent on docker-compose shape + Cloudflare Tunnel wiring. `apps/qw-oracle/` has a deployed stack; `apps/qw-stats/` may also be a reference. Read their docker-compose.yml + DEPLOYMENT-related docs.

c. Use Context7 to pull current MediaWiki 1.39 Docker image docs (official `mediawiki:1.39`) + Citizen skin install docs. Note: Citizen is a community skin, not bundled; install via git checkout to `skins/Citizen/`.

d. Verify the operator's Cloudflare Tunnel route convention (subdomain -> internal Unraid IP:port). Check `/home/paradoks/projects/quakeworld/apps/qw-oracle/` for a deployed precedent OR the existing Tailscale + CF Tunnel pattern.

e. Note: no `LocalSettings.php` exists yet. Phase 1 generates one from the MW installer wizard (`maintenance/install.php` or initial setup wizard) OR ships a hand-authored one. Either approach is acceptable; pick one with rationale.

## Drafting rules

- ASCII only. No emoji. ASCII hyphen-minus, not em-dash. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` (slug suggested; you can adjust the slug as long as it's clear).
- Follow `phase-template.md` exactly: section order, section names, verification format.
- Every task declares Execution mode (subagent at Sonnet medium / Sonnet MAX / Opus medium / Opus MAX / Haiku; or inline) with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for code synthesis (e.g., docker-compose drafting, LocalSettings.php authoring). `inline` only when full content is shipped inline AND the change has no logic. (D22 + D26)
- Verification probes return YES/NO, not interpretive prose. (D24)
- Locked decisions (D1-D26) are NOT open for re-litigation. Add a "Deviation" section at the top of the phase MD and halt if you need to deviate.
- Open questions go in the Open Questions section with default-chosen + who-can-resolve. Do NOT escalate mid-draft. (D25)
- Phase MD has no hard length cap; length follows from the work.

## Step-by-step

1. Read all required files.
2. Run phase-specific recon (a-e above).
3. Draft the phase MD following `phase-template.md`. Sections in order: Goal / Inputs / Files touched / Tasks / Verification / Outputs / Open questions / Recovery.
4. Dispatch the verification sub-agent (brief below).
5. Apply sub-agent findings. If a finding contradicts `decisions.md`, note rejection in Open Questions with one-line rationale. If a finding has cross-phase implications, append to `review-findings.md` with cross-phase pointer.
6. Halt with the structured summary (template below).

## Sub-agent verification brief

After drafting, dispatch:

```
Tool: Agent
subagent_type: Explore
description: "Verify Phase 1 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

The sub-agent reads files, finds drift, reports under 400 words. Does NOT modify files. You apply findings.

## Halt protocol

When the phase MD is drafted + sub-agent findings applied, halt with:

```
PHASE 1 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass

(If "needs another pass", explain in 1-2 sentences.)
```

Do NOT proceed to Phase 2. Do NOT execute anything. The operator reviews this phase MD, then opens a fresh terminal for Phase 2 drafting if approved.
