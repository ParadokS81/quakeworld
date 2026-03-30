# Quad — Discord Bot for QuakeWorld

## What This Is

A self-hosted Discord bot for the QuakeWorld 4on4 community. Named after Quad Damage, QuakeWorld's signature powerup.

Modules: **recording** (per-speaker OGG/Opus voice capture), **processing** (match detection, audio splitting, transcription), **standin** (Firestore-based DM feedback for MatchScheduler). Future: feeds, community integration.

## Tech Stack

- **Node.js 22.12.0+**, **TypeScript 5+**, **discord.js v14** (14.25.1)
- **@discordjs/voice 0.19.0** — voice connection, DAVE protocol support
- **prism-media 2.0.0-alpha.0** — OGG/Opus muxer. Requires `node-crc@^1.3.2` (v1, CJS only)
- **@snazzah/davey** — peer dep of @discordjs/voice, installed explicitly
- **Docker** — primary distribution method

## Architecture

Lightweight module pattern. Each feature is self-contained under `src/modules/`. Core loads modules, collects commands, routes events — modules don't know about each other. Detailed architecture loads automatically when editing module code (via `.claude/rules/`).

## Key Design Decisions (Non-Negotiable)

1. **OGG/Opus, NOT FLAC** — Discord sends lossy Opus. OGG wraps original frames without transcoding. ~5-8 MB/hour vs ~100-150 MB for FLAC.
2. **Stream to disk, NOT buffer** — Sessions can be 3+ hours. Streaming means near-zero memory and crash recovery.
3. **EndBehaviorType.Manual** — One continuous OGG file per speaker per session. Never fragment.
4. **selfDeaf: false, selfMute: true** — Bot hears but doesn't transmit.
5. **Modular architecture** — New features never require modifying existing modules.

## Bot Commands

### Recording
- `/record start` — joins voice channel, starts recording
- `/record stop` — stops recording, saves files, leaves channel
- `/record status` — shows active recording info

### Processing
- `/process` — run processing pipeline on a recording

## Configuration (env vars)

`DISCORD_TOKEN` (required), `RECORDING_DIR` (default: `./recordings`), `TEAM_TAG`, `TEAM_NAME`, `LOG_LEVEL` (default: `info`), `HEALTH_PORT` (default: `3000`), `WHISPER_MODEL` (default: `small`), `PROCESSING_AUTO` (default: `true`), `PROCESSING_TRANSCRIBE` (default: `false`)

## Deployment

See `DEPLOYMENT.md` for full reference (SSH, Docker, troubleshooting).

## Development

- **`/build`** — Compile TypeScript (`npx tsc --noEmit`)
- **`/dev`** — Start bot locally with ts-node ESM loader
- Always compile after editing `.ts` files
- When adding a new file, match the existing project structure

### Package version constraints
- `prism-media` must be 2.0.0-alpha.0 (v1 only has demuxers)
- `@discordjs/voice` >= 0.19.0 (DAVE protocol)
- Node.js >= 22.12.0

## Non-Negotiable Rules

1. OGG/Opus passthrough — never transcode
2. Stream to disk — never buffer entire sessions
3. One continuous file per speaker per session
4. `session_metadata.json` is the public contract — schema changes require version bump
5. All timestamps UTC with millisecond precision
6. Raw recordings are gitignored — never commit audio files

## QuakeWorld Context

Built for QW 4on4: 4 players/team, 20-min maps, 3-5 maps per session (1-2 hours). Team **]sr[** (Slackers). Recordings feed into AI analysis of team communication. Long-term: multiple teams, recordings paired to Hub matches.

## Common AI Mistakes
1. Over-engineering — community bot, not enterprise software
2. Creating unnecessary abstractions — three similar lines > premature abstraction
3. Building for hypothetical futures — don't stub unneeded modules
4. Fixing symptoms — understand why something is null before adding null checks
