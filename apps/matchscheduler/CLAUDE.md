# CLAUDE.md - MatchScheduler Guidelines

## Essential References
- **Architecture Map**: `context/ARCHITECTURE-MAP.md` - File map, module guide, subsystem overview (READ FIRST for orientation)
- **Data Schema**: `context/SCHEMA.md` - Firestore document structures (ALWAYS check before writing backend code)
- **Pillar Documents**: `context/Pillar*.md` - Architecture specifications
- **Slice Specs**: `context/slices/` - Feature implementation details
- **Dev Setup**: `docs/DEV-SETUP.md` - Local development with Firebase emulators
- **QWHub API**: `context/QWHUB-API-REFERENCE.md` - External API for match history, detailed stats, mapshots

## Critical Patterns

Two patterns are non-negotiable. Detailed rules with code examples load automatically when you edit the relevant files (via `.claude/rules/`).

1. **Cache + Listeners** — Services manage cache only. Components own their Firebase listeners. Updates flow: Firebase -> Component -> UI + Cache. Never create middleware/subscription services.
2. **Frontend <-> Backend Integration** — Every feature needs: click handler, loading state, backend call, error handling, listener for updates. A feature isn't done until connected end-to-end.

## Non-Negotiable Technical Rules

- **Firebase v11 modular imports** — `import { doc } from 'firebase/firestore'`, never v8 compat
- **rem units only** — No pixels except borders/shadows. Tailwind classes already use rem.
- **Sacred 3x3 Grid** — Layout is immutable. See Pillar 1.
- **CSS build pipeline** — Edit `src/css/input.css`, never `public/css/main.css`
- **Component patterns** — Revealing Module (simple) or Alpine.js (reactive). No React/Vue.

## Firebase Emulator

**The emulator is ALREADY RUNNING. Do not restart it.**
- Firestore UI: http://localhost:8080
- Functions logs: http://localhost:5001
- Seed data: `npm run seed:quick` (or `npm run seed` for full with logos)
- Dev details: `docs/DEV-SETUP.md` (fixed UIDs, direct writes, WSL networking)

## Quick Context

### Scale
- 300 players, ~40 teams, 4 weeks of availability visible
- Players limited to 2 teams maximum

### Gaming Domain
- Time slots: `'ddd_hhmm'` format (e.g., `'mon_1900'`)
- Team operations happen in Discord
- Tournament deadline pressure is real

### Data Model
- `/teams/{teamId}` - Team info with embedded roster
- `/availability/{teamId}_{weekId}` - Weekly availability grids
- `/users/{userId}` - User profiles
- `/eventLog/{eventId}` - Audit trail

## Common AI Mistakes
1. Creating middleware/subscription services — use direct listeners
2. Using pixel units — use rem everywhere except borders
3. Trying to start Firebase emulator — it's already running
4. Over-engineering — 300-person community app, not Google
5. Modifying the sacred grid — layout is fixed
6. Editing main.css directly — edit src/css/input.css
7. Using `set({ merge: true })` with dot-notation keys — use `update()` instead
