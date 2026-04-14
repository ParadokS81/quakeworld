# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [slipgate-app CLAUDE.md branch-first rule is stale](#slipgate-app-claudemd-branch-first-rule-is-stale) — doc says "branch before editing, never work on main" which contradicts the worktree-per-terminal workflow; needs reconciliation

---

## slipgate-app CLAUDE.md branch-first rule is stale

**Added:** 2026-04-14
**Status:** pending, needs a rewrite pass on the slipgate-app CLAUDE.md dev-workflow section
**Verification first:** open `/home/paradoks/projects/quakeworld/apps/slipgate-app/CLAUDE.md` and find the "Dev workflow" bullet "Branch before editing. Never work directly on `main`. Feature branches, commit often, merge when it works." If it's already been rewritten to match the worktree-per-terminal model, this item is resolved.

The slipgate-app CLAUDE.md was written before the worktree-per-terminal workflow was established (2026-04-14, see `memory/feedback_worktree_per_terminal.md`). It still tells future Claude sessions to cut feature branches before editing slipgate code, which contradicts two things:

1. The `feedback_minimize_branch_ceremony` memory: commit to main directly unless the work is genuinely risky.
2. The new worktree-per-terminal workflow: slipgate work happens in the main tree on `main`, not on feature branches.

### Fix shape

Rewrite the "Dev workflow" bullet to say something like:

> **Commit to main.** The slipgate terminal runs in the main tree at `/home/paradoks/projects/quakeworld/` on branch `main`. Commit directly to main and push frequently. Only cut a feature branch if the work is genuinely risky (big refactor, experimental direction you might throw away). The `src-tauri/` rsync hook requires slipgate to stay in the main tree — do not relocate to a worktree. See `memory/feedback_worktree_per_terminal.md` for the full workflow.

### Needs a design call because

The wording matters. The point isn't "never use branches" — it's "don't cut a branch reflexively for every change." The slipgate CLAUDE.md should teach the discretion, not reverse the rule entirely. A session touching slipgate-app docs is best positioned to write the replacement wording in context.

### Related

- The workflow memory: `memory/feedback_worktree_per_terminal.md`
- The older rule: `memory/feedback_minimize_branch_ceremony.md`
- The rsync hook constraint: `.claude/settings.json` PostToolUse hook + `apps/slipgate-app/scripts/sync-rust.sh`
