# Slipgate App - Desktop Companion for QuakeWorld

**Status:** Active development. Tauri v2 system tray app that bridges the QuakeWorld game client, the user's computer, and (eventually) the Slipgate web hub. Windows-native in practice.

## Where to find things

When you need... | Read...
---|---
Elevator pitch, tech stack, building from source | `README.md`
A plain-English map of what's built right now | `docs/OVERVIEW.md`
Why this project exists, long-term vision, drawing board | `docs/VISION.md`
Tech debt, cleanup priorities, known risks (2026-04-10 snapshot) | `docs/HEALTH.md`
Dev environment setup (WSL+Windows split, rsync hook, troubleshooting) | `docs/DEVELOPMENT.md`
Design system, OKLCH theming, UI rules | `docs/DESIGN.md`
Store shape, SolidJS signals, migration, persistence rules | `docs/STATE.md`
External API boundaries, IPC contracts, third-party services | `docs/API_CONTRACTS.md`
ezQuake config parser architecture (how bind classification / exec chains / macros / triggers work) | `docs/CFG-PARSER.md`
How ezQuake computes resolution (the absent=default pattern) | `docs/EZQUAKE-RESOLUTION.md`
Discord OAuth flow as built (+ future GitHub OAuth idea) | `docs/AUTH.md`
What the hardware scan collects and how | `docs/SYSTEM-SPECS.md`
EloShapes API reference for the peripheral database | `docs/PERIPHERAL-SELECTOR.md`
Deploy/release notes | `DEPLOYMENT.md`

Start with `OVERVIEW.md` when returning to the project after a break.

## Tech stack

| Layer | Choice |
|---|---|
| Desktop framework | Tauri v2 (Rust backend + OS WebView2) |
| Frontend | SolidJS + TypeScript |
| Styling | Tailwind CSS 4 + DaisyUI 5 (OKLCH theme system) |
| Backend | Rust — `sysinfo`, `wmi`, `windows` (SetupAPI), `reqwest`, `notify-debouncer-mini`, `zip` |
| Auth | Discord OAuth → MatchScheduler cloud function → Firebase custom token |
| Package manager | Bun |
| Build | Vite |
| Linting | Biome |

**Platform coverage:** Windows-native only in practice. Non-Windows code paths exist as stubs but aren't supported.

**Sibling apps** in the monorepo (all integration is network-based, no filesystem coupling): `apps/matchscheduler/` (Firebase web), `apps/quad/` (Discord bot), `apps/qw-stats/` (Express + PostgreSQL), `apps/qw-oracle/` (SQLite knowledge base).

## Always-on rules

**Tooling:**
- **Bun, not npm.** `bun run`, `bun install`, `bun test` for all JS work.
- **Tauri command naming:** snake_case in Rust (`get_all_specs`), camelCase in TypeScript (`getAllSpecs`).

**Code conventions:**
- **No hardcoded colors.** Use DaisyUI semantic classes (`btn-primary`, `bg-base-200`) or CSS custom properties (`var(--color-primary)`). Never hex/rgb in source.
- **No hardcoded URLs in component code.** Constants at the top of `auth.ts`, `firebase.ts`, or dedicated config. Ready for future env config swap.
- **Rust: follow rustfmt + clippy.** Frontend: Biome.
- **User-facing strings in English.** No localization yet.

**Dev workflow:**
- **Rust sync hook is live.** The monorepo's `PostToolUse` hook auto-rsyncs `src-tauri/` to the Windows build mirror after every edit. No manual sync needed — see `docs/DEVELOPMENT.md` for the details if something breaks.
- **Branch before editing.** Never work directly on `main`. Feature branches, commit often, merge when it works.
- **Planning-first workflow applies here.** See root `CLAUDE.md` for the full "How We Work" framework that applies across all apps in this monorepo — I won't repeat it here.

**Things to know about the code:**
- `src-tauri/src/commands/ezquake.rs` is a 2,124-line monolith with a wide public surface. Adding a second client (FTE) will probably require splitting it. See `docs/HEALTH.md` for the full structural note.
- The ConfigViewer subsystem (20+ components under `src/components/Config*`) is the biggest feature by far and the main active work area.
- `configMerger.ts` is pure — no side effects, easy to reason about.
- `src-tauri/src/commands/screenshot.rs` is marked POC — active goal but fragile timing, not yet production.
- Adding a new Rust command module requires a `pub mod` declaration in `src-tauri/src/commands/mod.rs` plus registration in the `tauri::generate_handler![]` macro in `src-tauri/src/lib.rs`.

## Known cleanup items

See `docs/HEALTH.md` for the full list with severity tags and fix priorities. Do not duplicate the list here — HEALTH.md is the single source of truth for tech debt.
