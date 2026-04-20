# MatchScheduler Gemini Guidelines

## Essential References
- **Architecture**: `context/ARCHITECTURE-MAP.md` (READ FIRST)
- **Data Schema**: `context/SCHEMA.md` (Check before Firestore writes)
- **UI Rules**: `context/Pillar*.md` (Sacred 3x3 Grid, rem units)

## Critical Patterns
- **Cache + Listeners**: Services manage cache; Components own listeners. Updates: Firebase -> Component -> UI + Cache.
- **End-to-End Features**: Every feature needs a click handler, loading state, backend call, error handling, and listener.

## Technical Rules
- **Firebase v11**: Use modular imports (e.g., `import { doc } from 'firebase/firestore'`).
- **CSS**: Edit `src/css/input.css` only. Use `rem` for all units except borders/shadows.
- **Firestore**: Use `update()` for dot-notation keys, not `set({ merge: true })`.
- **Emulator**: It is ALREADY RUNNING. Do not attempt to start it.
  - UI: http://localhost:8080
  - Functions: http://localhost:5001

## Common Pitfalls
- No middleware/subscription services.
- No pixel units (except borders).
- No over-engineering.
- No modifying the sacred grid layout.
