# Unified Deploy Skill + Standardized DEPLOYMENT.md

Design spec for consolidating all deployment procedures into one skill with standardized per-project reference docs.

## Problem

Deploy knowledge is scattered across 6 locations: root CLAUDE.md, two app CLAUDE.md files, one skill, and two standalone docs. This causes fumbled deployments, duplicated/contradictory info, and wasted context loading deploy details during non-deploy sessions.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mechanism | Skill (not CLAUDE.md import) | Deploy info is task-specific, shouldn't load every session |
| Scope | One skill, all projects | Cross-project deploy sequences; solo developer; ~20-30 lines per project |
| Model invocation | Enabled (natural language) | Skill loading isn't dangerous; actual deploy commands still require confirmation |
| Reference docs | Standardized DEPLOYMENT.md per project | Consistent format, skill points to them for troubleshooting |
| Credentials | Locations table in skill, values in gitignored files | No secrets in committed files |

## Projects Covered

| Project | Deploy target | Mechanism | Has reference doc? |
|---------|--------------|-----------|-------------------|
| matchscheduler | Firebase Hosting + Functions + Rules | `firebase deploy` | Create new DEPLOYMENT.md |
| quad | Xerial's server (Docker) | SSH + git pull + Docker rebuild | Restructure existing DEPLOYMENT.md |
| qw-stats | Unraid server (Docker) | SCP + Docker rebuild | Rename INFRASTRUCTURE.md, keep gitignored |
| slipgate-app | Windows binary / CI | `bun run tauri build` / GitHub Actions | Create minimal — WSL-to-Windows workflow TBD |
| qw-oracle | None | Local scripts only | Not included in skill |

## Deploy Skill Structure

**Location:** `.claude/skills/deploy/SKILL.md`
**Estimated size:** ~80-100 lines

```
---
name: deploy
description: Deploy any project to production. Covers MatchScheduler (Firebase),
  Quad (SSH/Docker to Xerial), QW Stats (SCP/Docker to Unraid), and Slipgate App
  (Windows build — workflow TBD). Use when deploying, shipping, pushing to prod,
  or checking deployment status.
---

## Quick Reference
[Table: project -> one-liner deploy command -> verify command]

## MatchScheduler (Firebase)
- Assess what changed (hosting/functions/rules)
- Build: npm run version && npm run css:build
- Deploy: firebase deploy --only <targets>
- Verify: https://matchscheduler.web.app
- For details: apps/matchscheduler/DEPLOYMENT.md

## Quad (SSH -> Docker)
- PRE-DEPLOY SAFETY: curl health endpoint, abort if recording.active === true
- Push code, SSH to Xerial, git pull, rebuild
- Verify: check logs
- For details: apps/quad/DEPLOYMENT.md

## QW Stats (SCP -> Docker)
- SCP changed files to Unraid
- SSH rebuild container
- Verify: curl health endpoint
- For details: apps/qw-stats/DEPLOYMENT.md

## Slipgate App
- Status: WSL-to-Windows dev workflow TBD
- Current: bun run tauri build (Windows terminal)
- CI: GitHub Actions on push to main
- For details: apps/slipgate-app/DEPLOYMENT.md

## Cross-Project Deploy Sequences
- Voice pipeline changes (quad -> matchscheduler)
- Stats API changes (qw-stats -> matchscheduler)
- Standin flow changes (matchscheduler <-> quad)

## Credential Locations
[Table: credential -> file location (no values)]
```

## Standardized DEPLOYMENT.md Template

Every deployed project gets a DEPLOYMENT.md following this structure:

```markdown
# {Project} -- Deployment Reference

## Infrastructure
[Table: host, SSH, container names, ports, paths]

## Prerequisites
[Auth, tools, access needed]

## Deploy Workflow
[Step-by-step standard procedure]

## Operational Commands
[Table: scenario -> command (logs, restart, status)]

## Troubleshooting
[Common failures and diagnosis]

## Architecture Notes
[Docker, build pipeline, volumes, networking -- for when things go wrong]
```

### Per-project work

**matchscheduler** -- Create DEPLOYMENT.md from scratch. Content extracted from CLAUDE.md:
- Firebase region config (europe-west3 for v1, europe-west10 for v2 storage triggers)
- Frontend region config in index.html
- CSS build pipeline (src/css/input.css -> public/css/main.css)
- Function deploy patterns (v1 shared container, v2 Cloud Run)
- Firebase emulator details (already running, ports)
- Adding new Cloud Functions pattern

**quad** -- Light restructure of existing DEPLOYMENT.md (195 lines, already good quality):
- Match section headings to template
- Add pre-deploy recording check procedure
- Verify health endpoint port exposure

**qw-stats** -- Rename INFRASTRUCTURE.md to DEPLOYMENT.md:
- Keep gitignored (contains actual credential values)
- Restructure to match template
- Update CLAUDE.md reference from INFRASTRUCTURE.md to DEPLOYMENT.md

**slipgate-app** -- Create minimal DEPLOYMENT.md:
- Document current Windows build process
- Note WSL-to-Windows workflow gap
- Document GitHub Actions CI setup
- Mark dev workflow as TBD

## Quad Pre-deploy Safety Check

The quad bot has an HTTP health endpoint at `GET /health` (port 3000) that reports active recording sessions:

```json
{
  "recording": {
    "active": true,
    "sessionCount": 1,
    "sessions": [{ "guildId": "...", "sessionId": "..." }]
  }
}
```

**Deploy skill procedure:**
1. `curl http://83.172.66.214:3000/health`
2. If `recording.active === true` -> ABORT. Report which guild has an active session.
3. Only proceed when no active recordings.

**To verify during testing:** Confirm port 3000 is exposed in docker-compose.yml and allowed through Xerial's firewall.

## Files Changed

### Create
- `.claude/skills/deploy/SKILL.md` -- unified deploy skill
- `apps/matchscheduler/DEPLOYMENT.md` -- new reference doc
- `apps/slipgate-app/DEPLOYMENT.md` -- minimal reference doc

### Move
- `apps/matchscheduler/.claude/skills/qwhub-api/` -> `.claude/skills/qwhub-api/` (global)

### Rename + restructure
- `apps/qw-stats/INFRASTRUCTURE.md` -> `apps/qw-stats/DEPLOYMENT.md` (stays gitignored)

### Restructure
- `apps/quad/DEPLOYMENT.md` -- match template, add recording check

### Trim
- `CLAUDE.md` (root) -- remove Xerial/Unraid blocks, credentials table, cross-project workflows
- `apps/matchscheduler/CLAUDE.md` -- remove deployment section
- `apps/quad/CLAUDE.md` -- remove "Deployment -- Xerial's Server" section

### Delete
- `apps/matchscheduler/.claude/skills/deploy/` -- absorbed into unified skill

## Test Plan

Build framework first, then test each deployment against reality.

### Phase 1: Build framework (this session)
1. Create unified deploy skill
2. Create/restructure all DEPLOYMENT.md files
3. Move qwhub-api skill to global
4. Delete old matchscheduler deploy skill
5. Trim CLAUDE.md files
6. Commit

### Phase 2: Test deployments (one project at a time)
Test order chosen by risk level (safest first):

1. **matchscheduler** -- Firebase CLI deploy (hosting only). Verify skill commands work.
2. **quad** -- Test health endpoint reachability first, then SSH + Docker rebuild.
3. **qw-stats** -- Test Tailscale connectivity, then SCP + Docker rebuild.
4. **slipgate-app** -- Document current gap, test what works from WSL.

For each test:
- Follow the skill's deploy procedure exactly
- Note any friction, missing info, or failures
- Fix the skill and DEPLOYMENT.md to match reality
- Move to next project

Phase 2 may span multiple sessions depending on issues found.
