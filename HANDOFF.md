# Handoff: Monorepo Migration In Progress

**Date:** 2026-03-29
**Previous session:** VS Code extension, orchestrator workspace (`/home/paradoks/projects/quake/`)
**This session:** CLI, monorepo workspace (`/home/paradoks/projects/quakeworld/`)

---

## What Was Done

### Phase A: Move Day (complete)
- Created monorepo at `/home/paradoks/projects/quakeworld/`
- Moved all 5 apps: matchscheduler, quad, qw-stats, slipgate-app, qw-oracle
- Extracted `packages/qw-knowledge/` from voice-analysis (maps, terminology, strategies, player mappings)
- Organized contracts (active/completed)
- Set up research/ with `update-repos.sh` for cloning reference repos
- Archived voice-analysis

### Phase B/C: Harness Design (complete)
- Wrote root CLAUDE.md with:
  - Planning-first workflow (Claude must read code, present plan, get approval before building)
  - Bug triage protocol, testing philosophy, security rules
  - Project map, integration map, shared infrastructure, community experts
- Wrote root `.claude/settings.json` with:
  - Unified permissions (no more per-project duplication)
  - Secret file write-blocking hook
  - Agent teams enabled
  - Security + context7 plugins
- Cleaned per-app CLAUDE.md files (removed duplicated WSL, bug triage, testing sections)
- Cleaned per-app .claude/ configs (stripped redundant permissions, kept only app-specific hooks)
- MatchScheduler Tailwind hook path updated to monorepo location

### Git History
```
ca1c960 Clean up per-app .claude configs + add slipgate-app source
6ccf43d Clean up per-app CLAUDE.md files for monorepo context
dee0bec Add root CLAUDE.md and unified .claude/settings.json
6a262d3 Initial monorepo structure — all projects moved in
```

---

## What's Left To Do

### 1. STATUS.md files (high priority)
Write a STATUS.md for each app. These serve two purposes:
- Dashboard data (the website reads them)
- Claude orientation (quick overview of what's built, what's pending)

Format:
```markdown
---
name: <app name>
status: active | maintenance | idea-stage
stack: <key technologies>
deployed: <where it runs>
---

## What's Built
- bullet list of shipped features

## In Progress
- what's actively being worked on

## Backlog
- ideas and pending items

## Integrates With
- which other apps and how

## Deploy
<deploy command>
```

Apps needing STATUS.md: matchscheduler, quad, qw-stats, slipgate-app, qw-oracle

### 2. Dashboard (medium priority)
Build `dashboard/index.html` — single HTML file that:
- Reads a manifest listing the apps
- Fetches each STATUS.md
- Renders project cards with markdown
- Serve with `npx serve . -l 4000` from monorepo root

### 3. Shared Commands (medium priority)
Create `.claude/commands/`:
- `plan.md` — enforced planning before implementation
- `check.md` — post-implementation verification
- `status.md` — read all STATUS.md files, show overview
- `deploy.md` — app-specific deployment

### 4. People Profiles (low priority)
Write profiles in `people/`:
- vikpe.md, infiniti.md, oddjob.md, xerial.md
- Format: name, expertise areas, best resource for, collaboration notes

### 5. Memory System (low priority)
The CLI will create its own memory at `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/`.
Key memories to establish:
- User profile (ParadokS, vibe coder, visual learner, QW community)
- Workflow preferences (planning-first, no unnecessary tests, iterate fast)
- Project context (monorepo purpose, graduation to Slipgate's repo)

### 6. Test the Workflow
- Try planning a small feature across projects using /plan
- Verify agents can explore across all apps
- Confirm permissions work (no approval clicking)
- Try a deploy command

---

## Key Decisions Made (context for future sessions)

1. **This is a workshop monorepo**, not the final home. quad and slipgate-app will eventually graduate to vikpe's Slipgate monorepo. MatchScheduler will be rebuilt there in SolidJS.

2. **No git history preserved.** Old repos are archived at `/home/paradoks/projects/quake/`. The monorepo starts fresh because forward velocity matters more than archaeology.

3. **voice-analysis is archived**, not active. Its valuable parts (knowledge base) were extracted to `packages/qw-knowledge/`. The analyzer logic is reference-only until quad builds its own analysis using the new demo parser event data.

4. **slipgate (web hub planning docs) was dropped.** vikpe's repo supersedes it.

5. **qw-stats was extracted from MatchScheduler.** It was awkwardly nested — now it's a peer app with its own space. Has two halves: production API (serving MatchScheduler) and ranking research (stalled at identity resolution Phase 0).

6. **qw-oracle is idea-stage.** The grand vision is a comprehensive QW knowledge base (source code, chat logs, forums, match data). For now it's just a 2.66M message SQLite archive.

7. **Planning-first workflow is enforced in root CLAUDE.md.** Claude must read affected code, identify risks, ask questions, and present a plan before building. This was the user's #1 request.

8. **The user is a vibe coder.** Don't impose formal processes. Build guardrails that work with their style. Git is backup, not ceremony. Auto-commit is fine.

9. **Community experts exist.** See `people/` (to be created). vikpe (Rust, hub), infiniti (architecture), oddjob (C, server internals), xerial (server admin). Consult them for complex decisions.

---

## Old Workspace

The original orchestrator workspace is at `/home/paradoks/projects/quake/`.
It still contains the original git repos for each project (with full history).
Don't delete it — it's the archive. But don't work in it anymore.

---

## Delete This File

Once the remaining tasks are complete and the workflow is validated, this handoff file can be deleted. It's scaffolding, not documentation.
