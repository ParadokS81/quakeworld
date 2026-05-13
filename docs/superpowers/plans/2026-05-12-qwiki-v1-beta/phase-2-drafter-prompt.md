You are drafting Phase 2 of the qwiki-v1-beta arc (2026-05-12).

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt and surface to operator if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1; this arc has D1-D26).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/` or `docs/superpowers/plans/2026-05-04-ktx-onboarding/`.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene", "Pattern 6 cross-header lift", "F1 quality-grid".
- Postgres / pgvector / tsvector / Discord chat corpus / KTX server engine terminology.

If you see those, you are in the wrong arc -- halt.

## Phase 2 scope

Functional extensions. Install Page Forms + Semantic MediaWiki in the running MW substrate from Phase 1. Configure both in `LocalSettings.php`. Run SMW init (`smwadmin` or `php maintenance/update.php`). Verify forms framework works by creating a tiny test form and confirming it renders + accepts submission.

No page-type forms or templates yet (Phase 5 handles the Mode page-type specifically; other page-types defer to future arcs per D16).

Runnable state at phase boundary: `Special:Version` shows Page Forms + Semantic MediaWiki with their versions; `smwadmin` completes without error; a test form (`Form:TestForm`) renders correctly and a submission via that form creates a page; running `php maintenance/runJobs.php` clears the SMW jobs queue without errors.

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

You do NOT execute anything in this session. Drafting is paper-only.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D2 + D5 (namespace prep; full restriction in Phase 3) + D21-D26 most relevant
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` -- Phase 1's "Outputs to next phase" section. Confirms what state this phase inherits.
6. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 4 4.3 (12 page-types; Page Forms + SMW are the substrate for forms across all 12) + Pass 6 6.3 substrate item 1

## Phase-specific recon (before drafting)

a. Use Context7 to pull current Page Forms install docs for MW 1.43. Per `decisions.md` D2 Amendment #2 (2026-05-13), the substrate is **MW 1.43 LTS** (not 1.39); Page Forms tracks its **REL1_43** branch (no GitHub-tagged releases on the wikimedia mirror; the active commit on REL1_43 was 2026-05-12 at recon time). Install method is `git clone --branch REL1_43 --depth 1 https://github.com/wikimedia/mediawiki-extensions-PageForms.git` into the extension overlay path. Note: LocalSettings.php config snippet (`wfLoadExtension( 'PageForms' );`); any database schema migration required via `maintenance/update.php`.

b. Use Context7 to pull current Semantic MediaWiki install docs for MW 1.43. Per D2 Amendment #2, SMW pins to release **6.0.1** (released 2025-08-26; current stable; MW 1.43 compatible). Note: install method (Composer is the SMW project's recommended path; manual git checkout also works for our bind-mount layout); SMW init via `smwadmin` command vs `maintenance/update.php`; LocalSettings.php config (especially the `enableSemantics()` call timing relative to `require_once` / `wfLoadExtension` lines); any DB schema migration.

c. Identify the MW container's volume mount strategy from Phase 1's MD. Per Phase 1 D2 Amendment #2 + Q5 resolution, the MW source tree is a host bind-mount at `/mnt/user/appdata/qwiki-beta/mediawiki-html/`, with child overlay binds for Citizen / images / LocalSettings. Phase 2 extensions follow the same overlay pattern: bind `/mnt/user/appdata/qwiki-beta/extensions/PageForms/` onto `/var/www/html/extensions/PageForms/` (and similar for SMW + any other Phase 2 extensions), then update the compose file. This makes extensions persist across MW image bumps and inspectable from Unraid GUI.

d. Page Forms + SMW have version compatibility constraints. Verify the Page Forms REL1_43 branch is compatible with SMW 6.0.1. (Per D2 Amendment #2 recon: both target MW 1.43 LTS; SMW 6.x is the current stable line and Page Forms REL1_43 is the matching branch.)

e. Note: Page Forms is sometimes called `SemanticForms` historically; the current name is `PageForms`. Don't confuse old docs with new docs.

## Drafting rules

- ASCII only. No emoji. ASCII hyphen-minus, not em-dash. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md` (slug suggested; adjust if clearer).
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for the LocalSettings.php updates + SMW init (config has gotchas worth a verifying subagent pass). `inline` for documentation updates.
- Verification probes return YES/NO.
- Locked decisions are NOT open for re-litigation; add a "Deviation" section + halt if needed.

## Step-by-step

1. Read all required files.
2. Run phase-specific recon (a-e above).
3. Draft the phase MD following `phase-template.md`.
4. Dispatch the verification sub-agent (brief below).
5. Apply findings.
6. Halt with structured summary.

## Sub-agent verification brief

After drafting, dispatch:

```
Tool: Agent
subagent_type: Explore
description: "Verify Phase 2 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

## Halt protocol

```
PHASE 2 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Do NOT proceed to Phase 3.
