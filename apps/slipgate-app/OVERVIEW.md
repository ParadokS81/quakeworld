# Slipgate App - Overview

> What this document is: a thin app-root map. For the full living feature map - every tab, subsystem, Rust command, Tauri integration, parked-with-purpose item - read `docs/OVERVIEW.md`. For why the app exists, read `VISION.md`. For rules when working here, read `CLAUDE.md`.

## Status

Active development (90% of current monorepo work lives here). Not yet packaged for distribution; build from source. Windows-native in practice; non-Windows code paths exist as stubs but are not supported.

## What this app is

A Tauri v2 desktop companion for QuakeWorld players. Rust backend + SolidJS frontend rendered in the OS WebView2. Lives in the system tray. Does four things a browser cannot: reads your hardware and peripherals; reads and compares ezQuake configs across their full exec chains; manages your ezQuake install (version detection, stable + snapshot updater, launcher); and is your gear/setup profile linked to your Discord identity.

## The six tabs (one line each)

- **Schedule** - placeholder. Future tie-in to match scheduling + desktop notifications.
- **Profile** - fully functional, richest tab. QW scoreboard identity, input visualization with real binds, gear grid, system specs.
- **Tools** - fully functional. FPS optimizer (77 Hz tick alignment), sensitivity recalculator, FOV recalculator. All pure client-side math.
- **Clients** - fully functional. ezQuake path validation, config parsing, updater (5 projects across stable + snapshot channels), launcher, screenshot POC.
- **My Quake** - two modes. Browse (Explorer-style three-pane view over the quake dir) and Domains (Configs domain live, Maps/Matches/Assets disabled placeholders).
- **Settings** - fully functional. Discord OAuth, country fields, banner picker.

For per-tab detail - component paths, line counts, what each sub-feature actually does - see `docs/OVERVIEW.md`.

## Headline subsystems

- **ConfigViewer** - the biggest feature by far (~20 components, ~3000 lines frontend + 2124-line Rust parser). Categorizes cvars, classifies binds, resolves alias chains, compares configs side-by-side, converts ezQuake configs to FTE. Design in `docs/CFG-PARSER.md`.
- **Updater** - generic `ClientDef` drives 5 clients (ezQuake + unezQuake installable; KTX + MVDSV + QWFWD changelog-only). Stable via GitHub Releases, snapshot via `builds.quakeworld.nu`. SHA256/MD5 verify, atomic rename-backup install.
- **Player State Simulator + StatePanel** - pure-TS port of ezQuake's `Expr_Eval` grammar and derivation rules. Edit live PlayerState in the ConfigViewer's right rail; teamsay chains render with resolved `%token` values, real color codes, and dimmed inactive if/then/else branches. 92 tests.

See `VISION.md` § "Three subsystems carry the current thesis" for why these three in particular.

## External integrations

| Target | How | What |
|---|---|---|
| **Firebase (`matchscheduler-dev`)** | Firebase SDK + shared cloud function | Discord OAuth, user profile. Shared project with matchscheduler. |
| **ezQuake (local)** | filesystem + process + mailslot IPC | Config reading, exec chain traversal, version detection, launch, screenshot puppet. |
| **GitHub Releases API** | reqwest | Stable channel for ezQuake, unezQuake, KTX, MVDSV, QWFWD. |
| **`builds.quakeworld.nu`** | HTML scraping | Snapshot channel for ezQuake. |
| **EloShapes CDN** | HTTPS | Mouse and mousepad product photos + metadata. |
| **`a.quake.world/mapshots`** | HTTPS | Map backdrop images for the WHO banner. |

No filesystem dependencies on sibling monorepo apps. All sibling integration is network-based. Integration with slipgate web is planned (see `VISION.md`); the web side does not yet exist.

## Where to go deep

- **`docs/OVERVIEW.md`** - the full feature map. Start here when returning to the project after a break.
- **`docs/CFG-PARSER.md`** - ezQuake parser architecture (bind classification, exec chains, macros, triggers, per-weapon modifier dispatch).
- **`docs/EZQUAKE-RESOLUTION.md`** - how ezQuake computes resolution (the absent=default pattern).
- **`docs/STATE.md`** - store shape, SolidJS signals, migration, persistence rules.
- **`docs/DESIGN.md`** - design system, OKLCH theming, UI rules.
- **`docs/DEVELOPMENT.md`** - WSL + Windows split, rsync hook, troubleshooting.
- **`docs/API_CONTRACTS.md`** - external API boundaries, IPC contracts.
- **`docs/AUTH.md`** - Discord OAuth flow as built.
- **`docs/SYSTEM-SPECS.md`** - what the hardware scan collects and how.
- **`docs/PERIPHERAL-SELECTOR.md`** - EloShapes API reference.
- **`docs/HEALTH.md`** - tech debt snapshot (2026-04-10); see it for cleanup priorities and known risks.
- **`packages/qw-knowledge/weapon-scripts/README.md`** - QW weapon-script domain reference consumed by the weapon classifier.
- **`DEPLOYMENT.md`** - release notes.
- **`CLAUDE.md`** - always-on rules for Claude sessions in this app.

## What this doc intentionally does NOT cover

- **Per-tab and per-subsystem detail** - `docs/OVERVIEW.md`.
- **Why the app exists / drawing-board features** - `VISION.md`.
- **Tech debt and cleanup priorities** - `docs/HEALTH.md`.
- **Design system / UI rules** - `docs/DESIGN.md`.
- **Dev environment setup** - `docs/DEVELOPMENT.md`.
- **Deploy and release process** - `DEPLOYMENT.md`.
- **Always-on rules for Claude** - `CLAUDE.md`.
