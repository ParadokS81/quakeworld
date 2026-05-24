# Antigravity CLI & Cross-Tool Instructions - QuakeWorld Monorepo

## Core Mandates
- **Strict Adherence**: Follow all patterns and standards established in `CLAUDE.md` and per-app `CLAUDE.md` files.
- **Planning First**: Read affected code, identify complications, ask unasked questions, and present a specific plan. Wait for "go" before implementation.
- **Quality**: Verify results against expectations; don't explain away gaps. Fix specifically, don't refactor around bugs.
- **Security**: NEVER commit secrets (`.env`, `service-account.json`, API keys). Flag them immediately if found in code.
- **Output**: Brief, objective, ASCII-only. No emotions or filler.

## Git Workflow (Automated)
- **No User Interaction**: Perform all git operations silently.
- **Frequent Commits**: Commit after each meaningful change with one-line messages (what and why).
- **Push Often**: Push at natural checkpoints (end of feature/session).
- **Merge to Main**: Fast-forward preferred once stable.

## Hierarchical Context
This file provides workspace-level instructions. Per-app instructions in `apps/*/CLAUDE.md` still apply and should be read before working in those directories.

## References
- Global instructions: `~/.gemini/GEMINI.md`
- Shared Philosophy: `.claude/skills/philosophy/`
- Documentation Map: `OVERVIEW.md`
