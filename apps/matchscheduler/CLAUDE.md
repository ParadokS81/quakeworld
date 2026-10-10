# CLAUDE.md - MatchScheduler Guidelines

**Status:** Maintenance (effective-legacy; will be rebuilt inside slipgate web).

## Essential References

Monorepo-aligned quartet (orient here first):
- **README.md** - elevator pitch, tech stack, who uses it
- **VISION.md** - why this project exists, the 3x3-grid rationale, the slipgate-web graduation path
- **OVERVIEW.md** - current-state living map: features, Firestore collections, Discord integration, voice-pairing flow
- **DEPLOYMENT.md** - Firebase deploy flow

**Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries). For deeper File-map / module-guide questions, see `context/ARCHITECTURE-MAP.md`.**

Subsystem docs:
- **Architecture Map**: `context/ARCHITECTURE-MAP.md` - File map, module guide, subsystem overview. Layer 3 reference doc; consult on demand.
- **Data Schema**: `context/SCHEMA.md` - Firestore document structures (ALWAYS check before writing backend code)
- **Pillar Documents**: `context/Pillar*.md` - Architecture specifications
- **Slice Specs**: `context/slices/` - Feature implementation details
- **Dev Setup**: `DEVELOPMENT.md` - run, build, test; why no emulator runs on the cockpit
- **QWHub API**: `context/QWHUB-API-REFERENCE.md` - External API for match history, detailed stats, mapshots

## Critical Patterns

Two patterns are non-negotiable. Detailed rules with code examples load automatically when you edit the relevant files (via `.claude/rules/`).

1. **Cache + Listeners** -- Services manage cache only. Components own their Firebase listeners. Updates flow: Firebase -> Component -> UI + Cache. Never create middleware/subscription services.
2. **Frontend <-> Backend Integration** -- Every feature needs: click handler, loading state, backend call, error handling, listener for updates. A feature isn't done until connected end-to-end.

## Non-Negotiable Technical Rules

- **Firebase v11 modular imports** -- `import { doc } from 'firebase/firestore'`, never v8 compat
- **rem units only** -- No pixels except borders/shadows. Tailwind classes already use rem.
- **Sacred 3x3 Grid** -- Layout is immutable. See Pillar 1.
- **CSS build pipeline** -- Edit `src/css/input.css`, never `public/css/main.css`
- **Component patterns** -- Revealing Module (simple) or Alpine.js (reactive). No React/Vue.

## Firebase Emulator

**No emulator runs on the cockpit, and none can start here yet**: the Firestore emulator needs Java, which the container lacks, and the emulator ports are not published to the operator. Verify on the live site after a deploy (`DEPLOYMENT.md`). The emulator workflow, seeding (`npm run seed:quick`) and what would unblock it: `DEVELOPMENT.md`.

## Quick Context

### Scale
- 300 players, ~40 teams, 4 weeks of availability visible
- Players limited to 4 teams maximum (`functions/team-operations.js`); roster size is per team, `maxPlayers` 4-20

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
1. Creating middleware/subscription services -- use direct listeners
2. Using pixel units -- use rem everywhere except borders
3. Assuming a Firebase emulator is running -- there is none on the cockpit (see `DEVELOPMENT.md`)
4. Over-engineering -- 300-person community app, not Google
5. Modifying the sacred grid -- layout is fixed
6. Editing main.css directly -- edit src/css/input.css
7. Using `set({ merge: true })` with dot-notation keys -- use `update()` instead
