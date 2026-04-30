# Slipgate App

A Windows-first desktop companion for QuakeWorld players. Built as a Tauri v2 tray app that scans your hardware, parses your ezQuake configs, manages your client install, and (over time) becomes the missing link between the game, your computer, and the community hub.

**Status:** Active development. Not yet packaged for distribution - build from source if you want to try it today.

## What it does today

- **System scan** - hardware, monitor, peripherals, everything that shapes your gameplay (CPU, GPU, RAM, mouse, keyboard, audio devices). Works as a snapshot for your own reference and as opt-in data you can eventually share with the community.
- **Profile** - your QW identity, your grip/aim style, your DPI and sens, your gear. All in one scoreboard-style page with keyboard and mouse visualization that reflects your real binds and movement keys.
- **MyQuake / ConfigViewer** - visualize your ezQuake config with every cvar grouped by category, bind classification (weapon / teamsay / movement), alias chain expansion up to 8 levels deep, and side-by-side comparison against other configs.
- **Clients** - ezQuake install management: version detection from the .exe, updater (stable + snapshot channels), launcher with IP input and spec mode.
- **Tools** - QW-specific calculators: FPS alignment to the 77 Hz server tick, sensitivity recalculation across DPI changes, FOV recalculation across resolution changes.

See `OVERVIEW.md` for the living map of features, code landmarks, parked-with-purpose items, and integration points. See `VISION.md` for what's on the drawing board and why.

## Tech stack

- **Desktop framework** - Tauri v2 (Rust backend + OS WebView2)
- **Frontend** - SolidJS + TypeScript
- **Styling** - Tailwind CSS 4 + DaisyUI 5 (OKLCH theme system)
- **Backend** - Rust with `sysinfo`, `wmi`, `windows` (SetupAPI), `reqwest`, `notify-debouncer-mini`, `zip`
- **Auth** - Discord OAuth via matchscheduler's cloud function, Firebase custom token
- **Package manager** - Bun
- **Build** - Vite + cargo

Windows-native only in practice. Non-Windows code paths exist as stubs but are not supported.

## Who it's for

All QuakeWorld players. Written from the perspective of a competitive player (the author) - features are built by what the author wants first, with the hope that others find value in the same things. Some features may eventually serve people outside the author's direct use case (community data collection, config converter for FTE users, GitHub backup for players with many machines).

This is a public repo as part of the [QuakeWorld monorepo workshop](../../README.md). Pull requests, issues, and opinions are welcome.

## Building from source

The split-process WSL + Windows workflow is non-trivial: source edits happen in WSL, Rust builds happen on Windows, a rsync hook plus shared localhost bridge them together. Full setup lives in `docs/DEVELOPMENT.md`.

If you are on a machine that is not Windows + WSL2, the app may not build at all today.

## Learn more

- `VISION.md` - why this app exists and where it is going
- `OVERVIEW.md` - living map: features, file landmarks, parked-with-purpose items, integration points
- `docs/HEALTH.md` - point-in-time tech debt snapshot (2026-04-10)
- `docs/DEVELOPMENT.md` - setup and dev workflow
- `docs/DESIGN.md` - design system and UI rules
- `docs/AUTH.md` - Discord OAuth flow as built
- `CLAUDE.md` - always-on rules for Claude sessions working in this app
- `DEPLOYMENT.md` - deploy / release notes (TBD: distribution story not finalized)

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md) and may eventually graduate to vikpe's slipgate web repo as the desktop companion to the web hub.
