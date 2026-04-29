# QuakeWorld Monorepo

**Status:** Active development. Workshop monorepo hosting five QuakeWorld community apps. Solo-developer, Claude-assisted.

## Where to find things

| When you need... | Read... |
|---|---|
| Elevator pitch, what's in here | `README.md` |
| Why this monorepo exists, workshop framing, graduation paths | `VISION.md` |
| Living map: integration diagram, per-app status, packages, contracts | `OVERVIEW.md` |
| Cross-project specs index | `contracts/README.md` |
| Deferred items from prior wrap-ups (todo state, not memory) | `HANDOVER.md` |
| Always-loaded mindset docs | `.claude/skills/philosophy/` (auto-imported below) |
| Session wrap-up ritual | `~/.claude/skills/docs-check/` (user-global skill) |
| Deploy any project | `deploy` skill ("deploy" or `/deploy`) |

**Start with `OVERVIEW.md` when working in this monorepo — it's the load-bearing cross-app map (integration diagram, per-app status, packages, contracts).**

## How We Work

### Planning First - Non-Negotiable

When I ask you to build something:
1. Read the code that will be affected FIRST - use Explore agents if needed
2. Tell me what will break or get complicated
3. Ask me the questions I'm not asking myself
4. Present a plan with specific files and changes. Don't start coding until I say "go"

If my idea conflicts with existing patterns, say so.
If the scope is bigger than I think, say so.
If there's a simpler way, say so.
Stop being agreeable. Be useful.

### Quality Standards

- Inference is a tool for directing investigation, not a substitute for it
- When results don't match expectations, verify - don't explain away the gap
- If you can't determine the cause, say so and ask for direction
- Read before writing. Explore before planning. Plan before building
- After implementation, verify the changes work - don't assume

### Bug Triage Protocol

Reproduce - Locate - Understand - Hypothesize - Verify - Fix minimally. Don't refactor around a broken thing; fix the specific failure.

### Testing Philosophy

Compile and build first. Manual verification second. Automated tests only when the project already has them or when explicitly asked. Don't add test infrastructure speculatively.

### Security

- NEVER commit .env files, service-account.json, or any file containing API keys or tokens
- If you see credentials in code, flag it immediately - don't wait to be asked
- Pre-commit scanning is configured - don't bypass it

### Git workflow

The user does not touch git. Claude runs all git operations silently -- no merge menus, no PR prompts, no branch questions. Git is a tool for Claude, not a UX for the user.

**Layout:**
- Main tree (`/home/paradoks/projects/quakeworld/`, branch `main`) is the default working directory. All work happens here unless a worktree is explicitly created for parallelism.
- Worktrees exist only for parallelism (two Claude sessions running simultaneously on different topics). None are currently active.
- For matchscheduler, quad, or any new topic: create a worktree ad-hoc when parallel work is actually needed. Delete when the work merges or goes idle.
- **When adding or removing a worktree, update BOTH this section AND the `case` block in `.claude/scripts/session-start-git-state.sh`** so the session banner continues to label it correctly.

**Session routing:**
- Plain `claude` always lands in the main tree. That is the default and it is correct.
- If a topic later gets its own worktree, work on files in that worktree from the current session via absolute paths. Use `git -C /path/to/worktree <command>` for git operations. No terminal restart needed.
- Flag a collision ONLY if the user starts a second simultaneous session that would touch the SAME topic. That is the only case that produces HEAD collisions.

**Commits and merges:**
- Commit after each meaningful change, not at the end of a session. One-line messages, what changed and why.
- Push to origin at natural checkpoints: end of a feature, end of a session, whenever the history would be useful to look back on. Do not wait to be asked.
- When a topic branch stabilizes, merge it to `main`. Fast-forward preferred, merge commit otherwise. No PR ceremony, no 4-option menus, no gates.
- Inside a worktree, cut a fresh feature branch only if the work is genuinely risky (big refactor, throwaway experiment). Otherwise commit directly on the worktree's own branch.

**Superpowers skill overrides:**
- `superpowers:finishing-a-development-branch` -- do NOT present 4-option merge menus. Just merge and push.
- `superpowers:using-git-worktrees` -- skip the baseline-test + auto-setup ceremony. Create worktrees with a plain `git worktree add` when parallelism is actually needed.
- `superpowers:executing-plans` and `superpowers:subagent-driven-development` worktree pre-steps -- do NOT create a fresh worktree per plan. Execute plans in the worktree you are already in.
- Other superpowers skills (brainstorming, systematic-debugging, writing-plans, verification-before-completion, etc.) are fine -- keep using them.

**Safety net:**
- The `SessionStart` hook at `.claude/scripts/session-start-git-state.sh` prints worktree path, branch, drift vs main, and uncommitted count at every session open. Read the banner first. Loud drift warnings mean investigate, not proceed blindly.
- The `docs-check` skill's Step 9.5 runs the same 5 checks (plus stale branches and remote-main pull) at session wrap-up. Together SessionStart and docs-check bracket every session so drift gets caught at the start OR at the end, whichever comes first.
- `src-tauri/` rsync constraint: `.claude/settings.json` has a `PostToolUse` hook that fires `apps/slipgate-app/scripts/sync-rust.sh` whenever `slipgate-app/src-tauri/` is edited, and the script hardcodes `$HOME/projects/quakeworld/apps/slipgate-app`. Slipgate work MUST stay in the main tree. Never relocate slipgate to a worktree without updating both the hook command and the sync script.

## Per-app entry points

Each app has its own CLAUDE.md with architecture, patterns, and conventions. Read the relevant app's CLAUDE.md before working in it.

- `apps/matchscheduler/CLAUDE.md`
- `apps/quad/CLAUDE.md`
- `apps/qw-stats/CLAUDE.md`
- `apps/slipgate-app/CLAUDE.md`
- `apps/qw-oracle/CLAUDE.md`

## WSL development environment

All projects except slipgate-app run in WSL Ubuntu.

- **slipgate-app**: Source lives in WSL monorepo, builds run from Windows terminal (Tauri needs Windows toolchain for native .exe)
- **SSH keys**: WSL `~/.ssh/` - `id_rsa` (Unraid), `qwvoice_key` (Xerial)
- **Tailscale**: Required for Unraid access (100.114.81.91)
- **Firebase emulators**: matchscheduler dev on `localhost:5000`
- **Reading Windows screenshots from WSL**: Windows paths like `C:\Users\Administrator\Downloads\foo.png` are reachable from WSL as `/mnt/c/Users/Administrator/Downloads/foo.png`. Use Read directly on that path -- do not claim the file is unreachable.

## Verification discipline

Before naming a number, file path, function name, schema version, or any specific factual claim in a response: verify against the live source (grep, Read, SQL, etc.). Evidence first, conclusion second — not the other way around. When a claim genuinely can't be verified, mark the uncertainty in a different register from verified facts; don't slip "likely" or "probably" into prose that otherwise reads as fact. Don't propose scope deferrals (skipping a finding, deferring a fix) without explicit user approval — that's a decision the operator makes, not a default Claude takes.

## Communication style

Lead with plain English: what changes, what the tradeoff is, what the recommendation is. Follow with the technical chain only where it carries decision content — the parts where the operator can spot a flaw or push back. Compress or skip mechanism explanations that don't change the decision (which APIs are involved, how a helper resolves a reference, internal control flow). Length follows from this — short by default, long only when load-bearing detail justifies it.

The operator is conceptually fluent (data transforms, system boundaries, contracts) but does not have deep implementation-level knowledge for every project. Plain-English-first is not dumbing-down; it's calibrating to where decisions actually live.

## Misc conventions

- Comments explain *why*, not *what*.
- TypeScript regex iteration: prefer `string.matchAll(re)` over the stateful RegExp method. A repo-wide security-scanning hook pattern-matches the literal call site and false-positives on the RegExp version (not distinguishing it from the Node child_process one). Using matchAll avoids the false positive and is cleaner anyway.

## Shared philosophy

@.claude/skills/philosophy/philosophy-of-software-design.md
@.claude/skills/philosophy/grug-brain.md
