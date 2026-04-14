# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [docs-check: session-start git state check](#docs-check-session-start-git-state-check) — mirror Step 9.5 at session start so branch drift is caught before work begins, not just at wrap-up
- [parallel terminal worktree isolation](#parallel-terminal-worktree-isolation) — two Claude terminals share the monorepo's working directory and HEAD, producing surprises; set up a git worktree for one of them

---

## docs-check: session-start git state check

**Added:** 2026-04-14
**Status:** pending, design call for next session touching `docs-check`
**Verification first:** open `/home/paradoks/.claude/skills/docs-check/SKILL.md` and confirm Step 9.5 "Git state review" still exists only at wrap-up (not mirrored at start). If a session-start hook or skill has already been added, this item is resolved and can be deleted.

Step 9.5 (added 2026-04-14) catches branch drift, unpushed commits, and uncommitted changes at session close. That's the right time for most findings — but the drift-into-staleness case it's designed to prevent originally happened on this very session because the session *started* on a feature branch that was 145 files / 80k lines ahead of main without anyone noticing. A wrap-up check can't prevent that session — only the next one. The fix is a mirror of Step 9.5 at session start.

### Two possible shapes

1. **A new skill** — `git-state-check` or similar — auto-triggered by session-start phrases or hooks. Runs the same checks as Step 9.5, produces a banner report, pauses if branch drift is detected.
2. **A hook** — `SessionStart` hook configured in `settings.json` that runs a short bash script to print git state at session open. No skill ceremony, just raw output the main agent can react to.

Option 2 is lower-effort and probably sufficient. A hook that prints `current branch, ahead/behind main, uncommitted file count, last commit age` at every session start would have surfaced the 80k-line drift instantly on this session.

### Related

- The wrap-up step it mirrors: `docs-check/SKILL.md` Step 9.5
- The failure mode it would have prevented: the 2026-04-14 feature/qw-config merge incident

---

## parallel terminal worktree isolation

**Added:** 2026-04-14
**Status:** pending, needs user call on whether to set up now or tolerate the collision risk
**Verification first:** run `git worktree list` from the monorepo root. If there's already a worktree at `/home/paradoks/projects/quakeworld-slipgate` or similar, this item may be partially resolved — check which terminal is using it.

The user runs two Claude Code terminals in parallel — one on slipgate-app work, one on qw-oracle work — both pointing at `/home/paradoks/projects/quakeworld/`. Because they share the same working directory and the same `.git/HEAD`, every `git checkout` in one terminal moves HEAD under the other, and every commit in one terminal lands on whatever branch the OTHER terminal happens to have checked out.

This produced concrete damage on 2026-04-14: the qw-oracle session's `e50d2a4` and `b4bd0b2` commits accidentally landed on the slipgate session's `fix/slipgate-ts-cleanup` branch because that happened to be the current HEAD. It took a full investigation pass to untangle.

### Fix shape

Create a git worktree for one of the two sessions — probably slipgate-app since it's the less-active / longer-session project:

```bash
git worktree add /home/paradoks/projects/quakeworld-slipgate main
```

Then the slipgate terminal `cd`s into the worktree. qw-oracle keeps the main working tree. Zero ongoing coordination needed — the two HEADs are fully independent.

### Needs a design call because

- Which project gets the worktree? (slipgate is the argued default but it's the user's call)
- Should the worktree be long-lived or created fresh per session?
- Does the rsync hook that auto-syncs slipgate's `src-tauri/` to the Windows build mirror need path updates if slipgate moves out of the main tree?
- Does the monorepo's `.claude/` skills directory, `docs-check` wrap-up behavior, or any tooling assume the primary working dir is at a specific path?

### Related

- The incident that prompted this: 2026-04-14 session investigation that discovered the oracle commits on the slipgate branch
- Existing skill: `superpowers:using-git-worktrees` — covers the setup mechanics
