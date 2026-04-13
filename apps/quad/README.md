# Quad

A self-hosted Discord bot for the QuakeWorld community. Records voice comms during matches, pairs them with match demos via UTC timestamps, and delivers synced playback through the MatchScheduler web app. Also handles match scheduling notifications, player availability, and standin feedback for teams.

Named after Quad Damage, QuakeWorld's signature powerup.

**Status:** Maintenance. Stable and in active use across multiple clans. New features land when needed, but the core is solid.

## What it does

- **Voice recording** - per-speaker OGG/Opus capture from Discord and Mumble voice channels. Streams to disk with silence padding, late-join handling, and automatic session metadata. Near-zero memory usage even for 3+ hour sessions.
- **Match pairing** - automatically queries QW Hub for recent matches and pairs recordings to demos using UTC timestamp correlation. Slices audio tracks to match boundaries so each map gets its own recording segment.
- **Synced playback** - uploads paired recordings to MatchScheduler's Firebase storage. The web app streams voice alongside the FTE web demo player, per-track, perfectly synced.
- **Scheduling** - Firestore-driven notifications for match challenges, confirmations, and sealed matches. Delivered as Discord embeds with team logos.
- **Availability** - persistent Discord embed showing team availability grids, updated in real-time via button interactions.
- **Standin feedback** - DM-based player availability polling that writes back to MatchScheduler.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 22+, TypeScript 5+ |
| Bot framework | discord.js v14 |
| Voice | @discordjs/voice 0.19 (DAVE protocol), prism-media 2.0.0-alpha.0 |
| Voice server | Mumble via @tf2pickup-org/mumble-client |
| Backend services | Firebase Admin SDK (Firestore) |
| AI analysis | Anthropic SDK (Claude API), faster-whisper (GPU transcription) |
| Container | Docker (multi-stage build, NVIDIA GPU passthrough) |
| Host | Xerial's server (RTX 4090) |

## Who uses it

16 teams connected and active across the QuakeWorld 4on4 scene. The bot runs as a single instance serving all registered guilds. Any team can add it to their Discord server via `/register`, link their team identity, and start recording.

## Learn more

- `VISION.md` - why this project exists, the voice-to-demo pairing insight, what's on the drawing board
- `OVERVIEW.md` - living map of modules, code landmarks, integration points
- `DEPLOYMENT.md` - production deployment (SSH, Docker, qwvoice-ctl, troubleshooting)
- `CLAUDE.md` - always-on rules for Claude sessions working in this app

This bot is one of five apps in the [QuakeWorld monorepo workshop](../../README.md).
