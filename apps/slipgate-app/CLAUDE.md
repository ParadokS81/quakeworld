# Slipgate App - Desktop Companion for QuakeWorld

**Status:** Paused -- waiting on a Windows build path and the Browse+Manager UI brainstorm. Tauri v2 system tray app that bridges the QuakeWorld game client, the user's computer, and (eventually) the Slipgate web hub. Windows-native in practice.

## Documentation index

| When you need... | Read... |
|---|---|
| Elevator pitch, tech stack, building from source | `README.md` |
| Why this project exists, long-term vision, drawing board | `VISION.md` |
| Living map: features, code landmarks, parked-with-purpose, integration boundaries | `OVERVIEW.md` |
| Deploy / release notes | `DEPLOYMENT.md` |
| QW weapon-script domain knowledge (firing mechanics, kill-me patterns, fire key types) | `packages/qw-knowledge/weapon-scripts/README.md` |

**Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, cruft attestation, design intent, code landmarks, integration boundaries).**

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `docs/` | `docs/CLAUDE.md` | Layer 2 reference (AUTH / STATE / DESIGN / DEVELOPMENT / HEALTH / API_CONTRACTS / SYSTEM-SPECS / PERIPHERAL-SELECTOR) + Layer 3 (CFG-PARSER, EZQUAKE-RESOLUTION, QUAKE-DIR-CONTROL) |

## Excluded paths

| Path | Why |
|---|---|
| `reference/` | Upstream source-code references (ezquake-source, ezquake-docs, ktx, mvdsv, qtv, qtv-go, qwfwd, unezquake) — research material, not authored docs. Gitignored and absent on the cockpit; the clones live at the repo root under `research/repos/` |

## Tech stack

| Layer | Choice |
|---|---|
| Desktop framework | Tauri v2 (Rust backend + OS WebView2) |
| Frontend | SolidJS + TypeScript |
| Styling | Tailwind CSS 4 + DaisyUI 5 (OKLCH theme system) |
| Backend | Rust -- `sysinfo`, `wmi`, `windows` (SetupAPI), `reqwest`, `notify-debouncer-mini`, `zip` |
| Auth | Discord OAuth -> MatchScheduler cloud function -> Firebase custom token |
| Package manager | Bun |
| Build | Vite |
| Linting | none wired (Biome intended; no `biome.json` or `lint` script yet). `bunx tsc --noEmit` is the type gate |

**Platform coverage:** Windows-native only in practice. Non-Windows code paths exist as stubs but aren't supported.

**Sibling apps** in the monorepo (all integration is network-based, no filesystem coupling): `apps/matchscheduler/` (Firebase web), `apps/quad/` (Discord bot), `apps/qw-stats/` (Express + PostgreSQL), `apps/qw-oracle/` (Postgres knowledge base + MCP service; its `build-snapshot` CLI writes the JSON under `src/lib/config/data/`), and four more under `apps/` (root `OVERVIEW.md`).

## Always-on rules

**Tooling:**
- **Bun, not npm.** `bun run`, `bun install`, `bun test` for all JS work.
- **Tauri command naming:** snake_case in Rust (`get_all_specs`), camelCase in TypeScript (`getAllSpecs`).

**Code conventions:**
- **No hardcoded colors.** Use DaisyUI semantic classes (`btn-primary`, `bg-base-200`) or CSS custom properties (`var(--color-primary)`). Never hex/rgb in source.
- **No hardcoded URLs in component code.** Constants at the top of `auth.ts`, `firebase.ts`, or dedicated config. Ready for future env config swap.
- **Rust: follow rustfmt + clippy.** Frontend: no linter is wired; `bunx tsc --noEmit` must stay clean.
- **User-facing strings in English.** No localization yet.

**Dev workflow:**
- **Rust sync hook fires but only half-works.** The monorepo's `PostToolUse` hook runs `scripts/sync-rust.sh` after every edit under `src-tauri/`: it copies the two asset bundles into `src-tauri/resources/` (which `browse.rs` needs to compile) and then fails at the rsync to the retired Windows mirror. Expect one hook error line; it is harmless. The cockpit cannot build the Rust side at all; the Windows build path is in `docs/DEVELOPMENT.md`.
- **Verify frontend work with `bunx tsc --noEmit`, not only `bun run build`.** Vite transpiles broken types without complaint; `tsc` is the gate, and a final reviewer must be told to run it (`docs/DEVELOPMENT.md`).
- **Commit to main.** Slipgate work happens in the main tree at `/home/dev/projects/quakeworld/` on branch `main`. Commit directly to `main` and push at natural checkpoints. Feature branches are for genuinely risky work only (big refactor, throwaway experiment) -- otherwise commit on `main`. The `src-tauri/` rsync hook hardcodes the main-tree path, so slipgate must stay in the main tree -- do not relocate to a worktree. See root `CLAUDE.md` Section  Git workflow for the full rules.
- **Planning-first workflow applies here.** See root `CLAUDE.md` for the full "How We Work" framework that applies across all apps in this monorepo -- I won't repeat it here.

**Things to know about the code:**
- `src-tauri/src/commands/ezquake.rs` is a 2,600-line monolith (2026-10-10) with a wide public surface. Adding a second client (FTE) will probably require splitting it. See `docs/HEALTH.md` for the full structural note.
- The ConfigViewer subsystem (14 `Config*.tsx` components plus `CvarRow`, `CvarTooltip`, `configMerger.ts` and `AliasChainResolver`, about 6,100 lines) is the biggest feature by far and was the main work area until the code went quiet in 2026-05.
- `configMerger.ts` is pure -- no side effects, easy to reason about.
- `src-tauri/src/commands/screenshot.rs` is marked POC -- active goal but fragile timing, not yet production.
- Adding a new Rust command module requires a `pub mod` declaration in `src-tauri/src/commands/mod.rs` plus registration in the `tauri::generate_handler![]` macro in `src-tauri/src/lib.rs`.

## Known cleanup items

See `docs/HEALTH.md` for the full list with severity tags and fix priorities. Do not duplicate the list here -- HEALTH.md is the single source of truth for tech debt.
