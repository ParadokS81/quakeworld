You are drafting Phase 3 of the qwiki-v1-beta arc (2026-05-12).

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt and surface to operator if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1; this arc has D1-D26).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or sibling 2026-05-04 / 2026-05-08 arcs.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene".
- Postgres / pgvector / Discord chat corpus / KTX server engine terminology.

If you see those, halt.

## Phase 3 scope

Auth + groups. Install PluggableAuth + Discord OAuth extension (operator pre-decision: OpenID Connect provider unless otherwise). Configure in `LocalSettings.php` with the operator's Discord OAuth app credentials (Client ID + Secret from prerequisites). Create MW groups `wiki-contributor` (auto-assigned via Discord-role-as-OAuth-claim: `@wiki-beta` Discord role -> `wiki-contributor` MW group on first login) and `wiki-curator` (manual operator assignment, no auto-mapping). Set MW namespace edit restrictions per D5: Form / Template / Category curator-only; Main / Talk / File / User contributor-editable; `MediaWiki:` namespace sysop-only (MW default).

Runnable state at phase boundary: operator clicks Login in the wiki, lands on Discord OAuth consent screen, authorizes, gets redirected back to wiki logged in; operator is in `wiki-contributor` group (visible in `Special:UserGroupRights` or `Special:ListUsers`); operator can edit Main namespace test page; operator cannot edit `Template:TestTemplate` (returns permission error); a manually-promoted curator user (operator promotes a second test user via `Special:UserRights`) CAN edit `Template:TestTemplate`.

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

Drafting is paper-only. No execution.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D4 (auth + groups) + D5 (namespace restrictions) + D19 (invite-only beta + Discord-role-as-claim) + D21-D26
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- Discord OAuth app + `@wiki-beta` Discord role must exist before Phase 3
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` + `phase-2-extensions.md` -- Outputs to next phase sections (what state Phase 3 inherits)
7. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 5 5.1 + 5.2 + 5.4a LOCKED (auth + group + namespace decisions)

## Phase-specific recon (before drafting)

a. Use Context7 to pull current PluggableAuth install docs for MW 1.43. Per `decisions.md` D2 Amendment #2 (2026-05-13), the substrate is **MW 1.43 LTS** (not 1.39); PluggableAuth tracks its **REL1_43** branch (no GitHub-tagged releases on the wikimedia mirror; the active commit on REL1_43 was 2026-05-05 at recon time). Install method is `git clone --branch REL1_43 --depth 1 https://github.com/wikimedia/mediawiki-extensions-PluggableAuth.git` into the extension overlay path (`/mnt/user/appdata/qwiki-beta/extensions/PluggableAuth/`, bind-mounted onto `/var/www/html/extensions/PluggableAuth/` per the Phase 2 overlay pattern). Note: LocalSettings.php config; how PluggableAuth interacts with providers.

b. Use Context7 (or web) to pull current Discord OAuth + OpenID Connect provider docs for PluggableAuth. The OpenID Connect extension tracks its **REL1_43** branch (active commit 2026-04-16 at recon time; install via `git clone --branch REL1_43 --depth 1 https://github.com/wikimedia/mediawiki-extensions-OpenIDConnect.git`). WSOAuth is the alternative also on REL1_43 if the operator opts out of OIDC. Both are PluggableAuth providers; both satisfy D4. Default to OpenID Connect per `prerequisites.md` (more standard claim-mapping path) unless operator pre-decided otherwise.

c. Identify the OAuth claim-mapping mechanism. For Discord-role-as-claim, the provider needs to fetch the user's Discord guild membership + role list via Discord API (`/users/@me/guilds/<guild_id>/member`). The MW extension's claim-to-group mapping config likely lives in `$wgPluggableAuth_OIDCClaimToMWGroup` or similar (verify exact config var via Context7).

d. Confirm the Discord OAuth app's redirect URI matches the running MW URL (from Phase 1; retargeted to `wiki.slipgate.me` per D3 Amendment 2026-05-14). Standard PluggableAuth path is `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin` -- path-info form, NOT query-string (MW emits the path-info form when `$wgScriptPath = ""` + `$wgUsePathInfo = true`; verified during Phase 3 execution as F8).

e. Verify MW namespace IDs (Main=0, Talk=1, Template=10, Category=14, Form=106 for Page Forms, etc.) before writing `$wgGroupPermissions` config. Reference MW manual via Context7.

## Drafting rules

- ASCII only. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-3-auth-groups.md`
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for OAuth config (Discord API specifics, claim mapping) + group + namespace LocalSettings.php config (multi-block $wgGroupPermissions edits). `inline` for documentation.
- Verification probes return YES/NO.
- Locked decisions are NOT open for re-litigation.

## Step-by-step

1. Read all required files.
2. Run phase-specific recon (a-e above).
3. Draft the phase MD following `phase-template.md`.
4. Dispatch the verification sub-agent.
5. Apply findings.
6. Halt with structured summary.

## Sub-agent verification brief

After drafting, dispatch:

```
Tool: Agent
subagent_type: Explore
description: "Verify Phase 3 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-3-auth-groups.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

## Halt protocol

```
PHASE 3 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-3-auth-groups.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Do NOT proceed to Phase 4.
