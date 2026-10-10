# Quad

A self-hosted Discord bot for the QuakeWorld community. Records voice comms during matches, pairs them with match demos via UTC timestamps, and delivers synced playback through the MatchScheduler web app. Also handles match scheduling notifications, player availability, and standin feedback for teams.

Named after Quad Damage, QuakeWorld's signature powerup.

**Status:** Maintenance. Stable and in use by the registered QuakeWorld 4on4 teams. New features land when needed, but the core is solid.

## What it does

- **Voice recording** - per-speaker OGG/Opus capture from Discord and Mumble voice channels. Streams to disk with silence padding, late-join handling, and automatic session metadata. Near-zero memory usage even for 3+ hour sessions. Starts on `/record start`, or by itself when enough registered team members join a channel (auto-record, per-team setting).
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
| AI analysis | Anthropic SDK (Claude API), faster-whisper (transcription, CPU on the current host) |
| Container | Docker (multi-stage build on a pre-built base image, published to GHCR) |
| Host | The operator's Unraid server, as a three-service compose stack (bot, Mumble server, cert sidecar); see `DEPLOYMENT.md` |

## Who uses it

Teams across the QuakeWorld 4on4 scene. The bot runs as a single instance serving all registered guilds. Any team can add it to their Discord server via `/register`, link their team identity, and start recording. The current registration count shows in the bot's startup log (`Guild member refresh complete: N registrations updated`).

## Learn more

- `VISION.md` - why this project exists, the voice-to-demo pairing insight, what's on the drawing board
- `OVERVIEW.md` - living map of modules, code landmarks, integration points
- `DEPLOYMENT.md` - production deployment (compose stack on Unraid, image pipeline, Mumble cert, troubleshooting)
- `CLAUDE.md` - always-on rules for Claude sessions working in this app

This bot is one of the apps in the [QuakeWorld monorepo workshop](../../README.md).
