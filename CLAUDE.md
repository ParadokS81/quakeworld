# QuakeWorld Monorepo

**Status:** Active development. Workshop monorepo of QuakeWorld community apps (eight folders under `apps/`, each with its own status word in `OVERVIEW.md`); open work is `HANDOVER.md`. Solo-developer, Claude-assisted.

## Documentation index

| When you need... | Read... |
|---|---|
| Codex discovery adapter pointing to this canonical project index. | `AGENTS.md` |
| Elevator pitch, what's in here | `README.md` |
| Why this monorepo exists, workshop framing, graduation paths | `VISION.md` |
| Living map: integration diagram, per-app status, packages, contracts | `OVERVIEW.md` |
| Cross-project specs index | `contracts/README.md` |
| Deferred items from prior wrap-ups (todo state, not memory) | `HANDOVER.md` |
| Repo-scope shipped-arc chronicle (qw-oracle's arcs chronicle in `apps/qw-oracle/docs/arc-history.md`) | `docs/arc-history.md` |
| Design specs, implementation plans, pre-plans and arc body files (append-only chronicle; parking files are indexed from `HANDOVER.md`) | `docs/superpowers/{specs,plans,preplans,parking}/` (`parking/README.md` has the parking conventions) |
| Unraid backup closeout and the dev-databases compose | `infra/` (`infra/unraid-backup/README.md`) |
| Reference clones (gitignored) and the tracked design notes beside them (ktxstats parser spec, qw_event_log design) | `research/` (`research/repos/README.md`, `research/assets/PARSER-SPEC.md`, `research/QW-EVENT-LOG-DESIGN.md`) |
| Standalone investigations / research papers (ecosystem-scope) | `docs/research/` |
| Always-loaded mindset docs | `.claude/skills/philosophy/` (auto-imported below) |
| The documentation constitution — why docs are shaped this way | harness-lab's `DOC-PHILOSOPHY.md` (canonical; no local copy in this repo) |
| The development doctrine — environment, principles, iteration protocol | harness-lab's `DOCTRINE.md` (canonical; no local copy — skills render it, never own it) |
| Session wrap-up ritual | `~/.claude/skills/docs-check/` (user-global skill) |
| Deploy matchscheduler, quad, qw-stats or slipgate-app | `deploy` skill (`.claude/skills/deploy/`, "deploy" or `/deploy`); qw-oracle, oracle-web and docs-web deploy from their own `DEPLOYMENT.md`, qwiki-sandbox from `deploy/README.md` |
| Project skills (oracle curation and extraction, KTX L1 rewrite, QWHub API, deploy) | `.claude/skills/<name>/SKILL.md` -- thirteen folders, loaded by name; only `philosophy/` is auto-imported |

**Start with `OVERVIEW.md` when working in this monorepo — it's the load-bearing cross-app map (integration diagram, per-app status, packages, contracts).**

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `apps/matchscheduler/` | `apps/matchscheduler/CLAUDE.md` | Match scheduler (Firebase web) |
| `apps/quad/` | `apps/quad/CLAUDE.md` | Discord bot |
| `apps/qw-stats/` | `apps/qw-stats/CLAUDE.md` | Express + PostgreSQL stats API |
| `apps/qw-oracle/` | `apps/qw-oracle/CLAUDE.md` | Postgres knowledge base + MCP service (Layer 1 facts / Layer 2 chat corpus / Layer 3 concept notes) |
| `apps/oracle-web/` | `apps/oracle-web/CLAUDE.md` | oracle.quake.world v1 -- the read-only brain surface (SolidJS, CF Pages) |
| `apps/docs-web/` | `apps/docs-web/DEPLOYMENT.md` (no `CLAUDE.md` yet -- HANDOVER decision row) | docs.quake.world -- the Layer 1 reference projected per codebase (VitePress on CF Pages, preview deploy) |
| `apps/qwiki-sandbox/` | `apps/qwiki-sandbox/CLAUDE.md` | wiki.slipgate.me -- the v1-beta MediaWiki substrate and its deploy stack |
| `apps/slipgate-app/` | `apps/slipgate-app/CLAUDE.md` | Tauri v2 desktop companion |
| `packages/qw-knowledge/` | `packages/qw-knowledge/CLAUDE.md` | Shared QW domain knowledge / weapon-scripts / terminology |
| `packages/qw-version-resolution/` | `packages/qw-version-resolution/CLAUDE.md` | Version arithmetic helpers (engine versions, builds, channels) |
| `contracts/` | `contracts/CLAUDE.md` | Cross-app design specs and the shared Firestore/Storage data contract |
| `archive/voice-analysis/` | `archive/voice-analysis/CLAUDE.md` | Archived pre-monorepo analyzer, reference only (its reusable knowledge moved to `packages/qw-knowledge/`) |

## Excluded paths

Orphan-walk exclusions for this scope (docs-check Phase 2 Step 2; scoped to orphan detection, so an indexed file that matches a pattern stays reachable through the index). Declared 2026-10-10 by the root docs-check seat under the operator's ruling of the same day: the 122 orchestrator-era dispatch files under `docs/superpowers/parking/` (the May/June 2026 handoff, resume, executor, prompt and ledger records of the pre-contract workflow) are chronicle, never classified or decommissioned one by one.

| Path / pattern | Treatment |
|---|---|
| `docs/superpowers/parking/*-handoff*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-handover*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-resume*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-executor*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-prompt*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-ledger*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-orchestrator-*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-planner-*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-pass[0-9]*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-slice-[0-9]*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-worker*.md` | Excluded (orchestrator-era dispatch chronicle) |
| `docs/superpowers/parking/*-fleet-*.md` | Excluded (orchestrator-era dispatch chronicle) |

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

Compile and build first. Manual verification second. Automated tests only when the project already has them or when explicitly asked. Don't add test infrastructure speculatively. (The general rule is harness-lab DOCTRINE Principles 16-17; this paragraph is QuakeWorld's setting of it.)

### Security

- NEVER commit .env files, service-account.json, or any file containing API keys or tokens
- If you see credentials in code, flag it immediately - don't wait to be asked
- Pre-commit scanning is configured - don't bypass it

### Git workflow

The user does not touch git. Claude runs all git operations silently -- no merge menus, no PR prompts, no branch questions. Git is a tool for Claude, not a UX for the user.

**Layout:**
- Main tree (`/home/dev/projects/quakeworld/`, branch `main`) is the default working directory. All work happens here unless a worktree is explicitly created for parallelism.
- Worktrees exist only for parallelism (two Claude sessions running simultaneously on different topics). Active: `/home/dev/worktrees/quakeworld-eval` (branch `eval-oracle-sim`) -- the oracle-eval-simulation arc's retained lane (parking doc `docs/superpowers/parking/2026-08-06-oracle-eval-simulation.md`); created 2026-08-06 under `~/projects/`, moved to `~/worktrees/` 2026-10-01 when the arc resumed under Workflow v2. Remove when the eval arc closes.
- For matchscheduler, quad, or any new topic: create a worktree ad-hoc when parallel work is actually needed. Delete when the work merges or goes idle.
- **When adding or removing a worktree, update BOTH this section AND the `case` block in `.claude/scripts/session-start-git-state.sh`** so the session banner continues to label it correctly.

**Session routing:**
- Plain `claude` always lands in the main tree. That is the default and it is correct.
- If a topic later gets its own worktree, work on files in that worktree from the current session via absolute paths. Use `git -C /path/to/worktree <command>` for git operations. No terminal restart needed.
- Flag a collision ONLY if the user starts a second simultaneous session that would touch the SAME topic. That is the only case that produces HEAD collisions.

**Commits and merges:**
- Commit after each meaningful change, not at the end of a session. One-line messages, what changed and why.
- When a commit reverses or replaces an earlier approach, say so in the message (`revert X -- Y didn't hold because Z`). Claude commits polished end-states, so without this the log shows the path around the wall, never the wall -- a later bisect/blame cannot see the dead-end.
- Push to origin at natural checkpoints: end of a feature, end of a session, whenever the history would be useful to look back on. Do not wait to be asked.
- When a topic branch stabilizes, merge it to `main`. Fast-forward preferred, merge commit otherwise. No PR ceremony, no 4-option menus, no gates.
- Tag each arc ship: `git tag -a arc-<slug>-shipped -m "<one line>"`, pushed at the next checkpoint. Gives `git log` the landmark jump-points `arc-history.md` already carries narratively. One silent command at ship time, no ceremony.
- Inside a worktree, cut a fresh feature branch only if the work is genuinely risky (big refactor, throwaway experiment). Otherwise commit directly on the worktree's own branch.

**Skill overrides:** any skill or plugin step that wants a merge menu, a baseline-test or auto-setup ceremony around `git worktree add`, or a fresh worktree per plan is overridden by the bullets above -- merge and push, add worktrees plainly, execute plans where you already are. (The superpowers plugin these rules were written against is no longer installed; the user-global `arc-design` / `arc-plan` / `arc-run` skills replaced it.)

**Safety net:**
- The `SessionStart` hook at `.claude/scripts/session-start-git-state.sh` prints worktree path, branch, drift vs main, and uncommitted count at every session open, plus a calendar-checks banner from `.claude/calendar-checks.txt` for any entry whose due date is today or earlier. Read the banner first. Loud drift warnings mean investigate, not proceed blindly; calendar-check entries mean act on them in this session or push the date in the txt file.
- The `docs-check` skill's Step 9.5 runs the same 5 checks (plus stale branches and remote-main pull) at session wrap-up. Together SessionStart and docs-check bracket every session so drift gets caught at the start OR at the end, whichever comes first.
- `src-tauri/` rsync constraint: `.claude/settings.json` has a `PostToolUse` hook that fires `apps/slipgate-app/scripts/sync-rust.sh` whenever `slipgate-app/src-tauri/` is edited, and the script hardcodes `$HOME/projects/quakeworld/apps/slipgate-app`. Slipgate work MUST stay in the main tree. Never relocate slipgate to a worktree without updating both the hook command and the sync script. The script's rsync target is still the WSL-era Windows mirror (`/mnt/c/Users/<user>/projects/slipgate-app`), which does not exist on the cockpit (HANDOVER, doc-sweep row).

**Upstream PRs (outside this monorepo):**
- For patches to upstream repos (ezquake-source / ktx / mvdsv / fte / anything outside this tree), follow Linux kernel coding-assistants conventions: AI must NOT add `Signed-off-by` -- the operator signs and certifies the DCO. Use `Assisted-by: Claude:<model-id>` for AI attribution instead of the internal `Co-Authored-By:` shape. Issues are exempt from DCO so an informal "Co-authored with Claude Code" footer is acceptable there; the discipline applies to PR commits. Reference: https://docs.kernel.org/process/coding-assistants.html.

## Development environment

Every project runs from the dev-cockpit container on the Unraid box; the user-global `CLAUDE.md` owns the box rules (Tailscale addresses instead of localhost, docker through the deploy proxy, no host SSH, secrets via `secret-drop`). The WSL workstation this section used to describe was retired in 2026-07.

- **slipgate-app** is the exception: its Tauri build needs the Windows toolchain, which the cockpit lacks. The frontend builds and tests here; the desktop build needs a Windows clone of the monorepo, and no machine is wired today (`apps/slipgate-app/docs/DEVELOPMENT.md`).
- **Screenshots** from the operator land in `~/letterbox/images/`; the `shot` skill reads the newest one.
- **Per-app run, build and test steps** live in each app's `DEVELOPMENT.md` or `README.md`, never here.

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
