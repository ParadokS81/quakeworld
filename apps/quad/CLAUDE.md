# Quad -- Discord Bot for QuakeWorld

**Status:** Maintenance. Stable and in use by the registered QuakeWorld 4on4 teams; new features land when needed, but the core is solid. Open work: the rows naming quad in the root `HANDOVER.md`.

## Documentation index

| When you need... | Read... |
|---|---|
| Elevator pitch, tech stack, who uses it | `README.md` |
| Why this exists, voice-to-demo pairing story, drawing board | `VISION.md` |
| Living map of modules, code landmarks, integration points | `OVERVIEW.md` |
| Local dev setup, commands, env vars, gotchas | `DEVELOPMENT.md` |
| Production deployment (compose stack on Unraid through the deploy proxy, image pipeline, Mumble cert, troubleshooting) | `DEPLOYMENT.md` |
| `join.slipgate.me` Discord-share URL Worker (source + dashboard deploy steps) | `cloudflare-worker/README.md` |
| Firestore collections, session_metadata contract, Storage | `SCHEMA.md` |
| External API boundaries (Discord, Hub, Firebase, Mumble, Claude) | `API_CONTRACTS.md` |
| The original build plan, Feb-Mar 2026 (historical; its phase markers were frozen when the modules shipped) | `PLAN.md` |
| Scheduler module spec | `SCHEDULER-MODULE-BRIEF.md` |
| Module-specific rules | `.claude/rules/` (loaded automatically by path) |

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `docs/` | `docs/CLAUDE.md` | Shipped phase plans, contract reference copies, research and incident records |
| `src/modules/recording/` | `src/modules/recording/CLAUDE.md` | Discord recording module scope rules |

Start with `OVERVIEW.md` when returning to the project after a break.

## Tech Stack

- **Node.js 22.12.0+**, **TypeScript 5+**, **discord.js v14** (14.25.1)
- **@discordjs/voice 0.19.0** -- voice connection, DAVE protocol support
- **prism-media 2.0.0-alpha.0** -- OGG/Opus muxer. Requires `node-crc@^1.3.2` (v1, CJS only)
- **@snazzah/davey** -- peer dep of @discordjs/voice, installed explicitly
- **Docker** -- primary distribution method

## Architecture

Lightweight module pattern. Each feature is self-contained under `src/modules/`. Core loads modules, collects commands, routes events -- modules don't know about each other. Detailed architecture loads automatically when editing module code (via `.claude/rules/`).

## Non-negotiable rules

1. **OGG/Opus passthrough** -- never transcode. Discord sends lossy Opus; OGG wraps original frames. ~5-8 MB/hour vs ~100-150 MB for FLAC.
2. **Stream to disk** -- never buffer entire sessions. Sessions can be 3+ hours; streaming means near-zero memory and crash recovery.
3. **One continuous file per speaker per session** -- `EndBehaviorType.Manual`, never fragment.
4. **selfDeaf: false, selfMute: true** -- bot hears but does not transmit.
5. **Modular architecture** -- new features never require modifying existing modules.
6. **`session_metadata.json` is the public contract** -- schema changes require version bump.
7. All timestamps UTC with millisecond precision.
8. Raw recordings are gitignored -- never commit audio files.

## Development

- `/build` -- compile TypeScript (`npx tsc --noEmit`)
- `/dev` -- start bot locally with ts-node ESM loader
- Always compile after editing `.ts` files
- When adding a new file, match the existing project structure

### Package version constraints
- `prism-media` must be 2.0.0-alpha.0 (v1 only has demuxers)
- `@discordjs/voice` >= 0.19.0 (DAVE protocol)
- Node.js >= 22.12.0

## Common AI mistakes

1. Over-engineering -- community bot, not enterprise software
2. Creating unnecessary abstractions -- three similar lines > premature abstraction
3. Building for hypothetical futures -- don't stub unneeded modules
4. Fixing symptoms -- understand why something is null before adding null checks
