# QuakeWorld Monorepo

## How We Work

### Planning First — Non-Negotiable

When I ask you to build something:
1. Read the code that will be affected FIRST — use Explore agents if needed
2. Tell me what will break or get complicated
3. Ask me the questions I'm not asking myself
4. Present a plan with specific files and changes. Don't start coding until I say "go"

If my idea conflicts with existing patterns, say so.
If the scope is bigger than I think, say so.
If there's a simpler way, say so.
Stop being agreeable. Be useful.

### Quality Standards

- Inference is a tool for directing investigation, not a substitute for it
- When results don't match expectations, verify — don't explain away the gap
- If you can't determine the cause, say so and ask for direction
- Read before writing. Explore before planning. Plan before building
- After implementation, verify the changes work — don't assume

### Bug Triage Protocol

When something breaks:
1. Reproduce — confirm the exact failure (error message, behavior, steps)
2. Locate — find the code path (grep for error messages, trace the call stack)
3. Understand — read the surrounding code, understand the intent before changing
4. Hypothesize — form a specific theory about the cause
5. Verify — confirm the theory before writing a fix
6. Fix minimally — change only what's broken, don't refactor around it

### Testing Philosophy

- Compile/build first — catch syntax and type errors immediately
- Manual verification second — confirm the feature actually works
- Automated tests only when the project already has them or when explicitly asked
- Don't add test infrastructure speculatively

### Security

- NEVER commit .env files, service-account.json, or any file containing API keys/tokens
- If you see credentials in code, flag it immediately — don't wait to be asked
- Pre-commit scanning is configured — don't bypass it

### Git

- Commit after each meaningful change, not at the end of a session
- Commit messages: what changed and why, one line
- Don't push unless I ask

---

## Project Map

```
apps/
  matchscheduler/  — Firebase web app (vanilla JS, Alpine.js, Tailwind)
  quad/            — Discord voice recording bot (TypeScript, discord.js)
  qw-stats/        — Stats API + ranking research (Express, PostgreSQL)
  slipgate-app/    — Desktop companion (Tauri v2, SolidJS, Rust)
  qw-oracle/       — Community knowledge base (Node.js, SQLite)

packages/
  qw-knowledge/    — Shared QW domain knowledge (maps, terminology, strategies)

research/          — Cloned reference repos (gitignored), run update-repos.sh
contracts/         — Cross-project feature specs (active + completed)
people/            — Community expert profiles
archive/           — voice-analysis (reference only, superseded by quad)
dashboard/         — Project status viewer
inbox/             — Idea capture (Telegram dumps)
```

### Integration Map

```
                    QW Hub API (Supabase)
                   hub.quakeworld.nu
                  ┌────────┴────────┐
                  │                 │
           match history      ktxstats JSONs
           + timestamps       d.quake.world
                  │                 │
        ┌─────────┤                 │
        │         │                 │
        ▼         ▼                 ▼
  ┌──────────┐               ┌──────────┐
  │  quad    │               │ qw-stats │
  │(Discord) │               │(Postgres)│
  └────┬─────┘               └────┬─────┘
       │                          │
       │ Firestore + Storage      │ Express API
       │                          │
       ▼                          ▼
  ┌──────────────────────────────────┐
  │        MatchScheduler            │
  │     (Firebase web app)           │
  └──────────────────────────────────┘
```

### Shared Firestore Collections (matchscheduler-dev)

| Collection | Writer | Reader | Purpose |
|-----------|--------|--------|---------|
| `voiceRecordings/{demoSha256}` | quad | MatchScheduler | Voice recording manifest |
| `standin_requests/{requestId}` | MatchScheduler | quad | Standin request → DM flow |
| `standin_preferences/{discordUserId}` | quad | quad + MatchScheduler | Opt-out and block settings |

### Shared Firebase Storage

| Path | Writer | Reader |
|------|--------|--------|
| `voice-recordings/{demoSha256}/{playerName}.ogg` | quad | MatchScheduler |
| `team-logos/{teamId}/` | MatchScheduler | MatchScheduler |

---

## Per-App Context

Each app has its own CLAUDE.md with architecture, patterns, and conventions.
Read the relevant app's CLAUDE.md before working in it.

- `apps/matchscheduler/CLAUDE.md` — Sacred grid layout, cache+listener pattern, Firebase v11 imports
- `apps/quad/CLAUDE.md` — Module system, OGG/Opus design, DAVE protocol, Docker deployment
- `apps/qw-stats/CLAUDE.md` — PostgreSQL schema, ranking methodology, identity resolution
- `apps/slipgate-app/CLAUDE.md` — Tauri v2 patterns, Windows native dev, SolidJS conventions
- `apps/qw-oracle/CLAUDE.md` — SQLite schema, import pipeline, classification layers

---

## Shared Infrastructure

Infrastructure details, deploy commands, and credential locations are in the deploy skill — invoke with "deploy" or `/deploy`. For detailed reference, each deployed project has a `DEPLOYMENT.md`.

### QW Hub API (external, read-only)
- Supabase: https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games
- KtxStats: https://d.quake.world/{sha256[0:3]}/{sha256}.mvd.ktxstats.json

---

## Community Experts

See `people/` for detailed profiles. Consult before complex decisions:

- **vikpe** — Rust, QW hub infrastructure, slipgate architecture, demo parsing
- **infiniti** — Senior eng, architecture, design systems, code review
- **oddjob** — C, mvdsv/ktx server internals, protocol-level changes
- **xerial** — Server admin, GPU infrastructure, Docker deployment

When planning a feature that touches areas these people know deeply, suggest consulting them.

---

## WSL Development Environment

All projects except slipgate-app run in WSL Ubuntu.

- **slipgate-app**: Source lives in WSL monorepo, builds run from Windows terminal (Tauri needs Windows toolchain for native .exe)
- **SSH keys**: WSL ~/.ssh/ — id_rsa (Unraid), qwvoice_key (Xerial)
- **Tailscale**: Required for Unraid access (100.114.81.91)
- **Firebase emulators**: MatchScheduler dev on localhost:5000

