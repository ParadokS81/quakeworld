# QuakeWorld Monorepo

**Status:** Active development. Workshop monorepo hosting five QuakeWorld community apps. Solo-developer, Claude-assisted.

## Where to find things

| When you need... | Read... |
|---|---|
| Elevator pitch, what's in here | `README.md` |
| Why this monorepo exists, workshop framing, graduation paths | `VISION.md` |
| Living map: integration diagram, per-app status, packages, contracts | `OVERVIEW.md` |
| Cross-project specs index | `contracts/README.md` |
| Always-loaded mindset docs | `.claude/skills/philosophy/` (auto-imported below) |
| Session wrap-up ritual | `~/.claude/skills/docs-check/` (user-global skill) |
| Deploy any project | `deploy` skill ("deploy" or `/deploy`) |

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

### Git

Commit after each meaningful change, not at the end of a session. Commit messages: what changed and why, one line. Don't push unless asked.

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

## Output discipline

- Answer briefly and objectively.
- Never guess - if unsure, say so.
- ASCII only in code and docs: no em dashes, smart quotes, or Unicode decorations.
- Never express emotions; no filler sentences.
- Comments explain *why*, not *what*.

These rules apply literally in code and docs. In conversation with the user, follow the spirit - direct, honest, no filler - but a natural voice is fine. See the feedback memory `feedback_output_discipline_sentiment.md` for context.

## Shared philosophy

@.claude/skills/philosophy/philosophy-of-software-design.md
@.claude/skills/philosophy/grug-brain.md
