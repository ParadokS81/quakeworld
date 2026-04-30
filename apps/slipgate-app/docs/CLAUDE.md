# Slipgate-app /docs subsystem

Layer 2 reference + Layer 3 domain docs for the slipgate-app project. This is the docs/ subsystem hub for the spider-web index walk. Per amendment 4 + 5 of the doc-philosophy doctrine.

## Documentation index

| When you need... | Read... |
|---|---|
| External API boundaries, IPC contracts, third-party services | `API_CONTRACTS.md` |
| Discord OAuth flow as built (+ future GitHub OAuth idea) | `AUTH.md` |
| ezQuake config parser architecture (binds, exec chains, macros, triggers) | `CFG-PARSER.md` |
| Design system, OKLCH theming, UI rules | `DESIGN.md` |
| Dev environment setup (WSL+Windows split, rsync hook, troubleshooting) | `DEVELOPMENT.md` |
| How ezQuake computes resolution (the absent=default cvar pattern) | `EZQUAKE-RESOLUTION.md` |
| Tech debt, cleanup priorities, known risks (2026-04-10 snapshot) | `HEALTH.md` |
| EloShapes API reference for the peripheral database | `PERIPHERAL-SELECTOR.md` |
| Quake Dir Control architecture (binary store, swap path, variant nesting) | `QUAKE-DIR-CONTROL.md` |
| Store shape, SolidJS signals, migration, persistence rules | `STATE.md` |
| What the hardware scan collects and how | `SYSTEM-SPECS.md` |

## Conventions in this scope

- **Layer 2 placement is app-wide here** — every doc in this folder describes some app-wide concern. None are subsystem-bound (per amendment 2's delete-the-subsystem test).
- **Layer 3 docs** (`CFG-PARSER.md`, `EZQUAKE-RESOLUTION.md`, `QUAKE-DIR-CONTROL.md`) cover deep subsystem background that doesn't fit Layer 2's standard menu — kept here because they're cross-app-wide, not bound to a single source folder.
- **`HEALTH.md` is a snapshot, not a living doc.** Do not maintain in place; regenerate from scratch when a fresh audit is wanted.
