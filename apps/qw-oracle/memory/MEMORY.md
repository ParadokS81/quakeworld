# QW Oracle — Memory

## Project Direction (decided 2026-02-11)
- Three use cases: **Oracle Bot** (help), **Digest** (newsletter), **Time Machine** (nostalgia)
- **Oracle Bot chosen as first target** — most value, tightest feedback loop
- All three share the same data foundation (Tier 1 sessions)
- See `docs/plan.md` for full architecture and roadmap

## What's Built
- Raw data: 2.66M messages in SQLite (`data/qw.db`, 1.1GB)
- Tier 1: Classification + session grouping → 128k sessions (22 sec to run)
- FTS5 search index over 123k sessions (10 sec to build)
- Search works well — tested with platform jitter, streaming, mouse sensitivity queries
- Key scripts: `process-tier1.mjs`, `build-search-index.mjs`, `search.mjs`

## Data Insights
- ~11k question-sessions across help channels (#helpdesk, #ezQuake, #ktx, #fte, #mvdsv)
- Benchmark: 30-35% docs-answerable, 25-30% tribal knowledge, 35-40% interactive debugging
- Community experts: Spoike (FTE author), ciscon (active helper), nano (engine guru, Rust port)

## Hardware
- **Local**: Ryzen 3900X + RX 5700XT (AMD, no CUDA) — dev only
- **Remote (Xerial)**: RTX 4090 — Ollama target via SSH tunnel port 11434
- Install Ollama on remote: `curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.1:8b`

## Dev Notes
- `wsl bash -ic "cd ... && command"` for node/npm (nvm needs interactive bash)
- Never `wsl mkdir` — use bash -ic or Write tool
- Never inline node -e with SQL backticks — always write .mjs files
- `.claude/settings.json` has tool permissions configured

## Docs
- ezQuake: https://ezquake.com/docs.html (subpages: /docs/{topic}.html, /docs/settings/{topic}.html)
- KTX: https://www.quakeworld.nu/wiki/KTX, https://github.com/QW-Group/ktx
