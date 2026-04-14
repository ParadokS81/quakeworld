# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [ANTHROPIC_API_KEY hardcoded in ~/.bashrc](#anthropic_api_key-hardcoded-in-bashrc) — security: rotate the key and move to a non-checked-in .env
- [qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)](#qw-oraclecladuemd-is-192-lines-over-150-hard-ceiling) — split into Layer 2 docs next time qw-oracle gets active work

---

## ANTHROPIC_API_KEY hardcoded in ~/.bashrc

**Added:** 2026-04-14
**Status:** pending, security — needs user action (not something Claude can do unilaterally)
**Verification first:** `grep ANTHROPIC_API_KEY ~/.bashrc`. If the key is gone or replaced with a loader from a separate file, this item is resolved.

The user's `~/.bashrc` has `ANTHROPIC_API_KEY="sk-ant-api03-..."` hardcoded in plaintext inside the `claude-api` alias definition. This was found incidentally while adding worktree launcher aliases during the 2026-04-14 git-workflow session.

### Risks

- Visible to anyone with shell access, any screen share, any backup of dotfiles.
- Shell history files can leak the key if the alias is echoed or expanded incorrectly.
- WSL dotfiles sync to Windows filesystem paths that may be indexed by Windows Search or backed up to OneDrive depending on the user's setup.
- If the user ever pushes their dotfiles to a git repo (public or private), the key goes with them.

### Fix shape

1. Rotate the key at console.anthropic.com first — assume the current value is compromised.
2. Move the new key to `~/.env.claude` (or similar, gitignored + chmod 600).
3. Change the `claude-api` alias to `source ~/.env.claude && claude` or equivalent.
4. Remove the literal key from `.bashrc`.

### Needs user action because

- Rotating the key requires the user to log into the Anthropic console.
- The user should confirm which env file location they want (WSL vs. Windows path, shared vs. Claude-specific).

### Related

- The alias block in `~/.bashrc` starting around line ~170 (`claude-api`, `claude-sub`, `claude-clear`).
- Not a monorepo concern per se, but worth resolving because the repo's security rules say "flag credentials immediately."

---

## qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)

**Added:** 2026-04-14
**Status:** pending, expect to address when qw-oracle gets its next active session
**Verification first:** `wc -l apps/qw-oracle/CLAUDE.md`. If under 150, this item is resolved (someone already split it or trimmed it).

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`
