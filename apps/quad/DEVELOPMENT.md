# Development - Quad

## Prerequisites

- **Node.js 22.12.0+** -- required by @discordjs/voice 0.19.0
- **npm** -- package manager (not bun/yarn; native addons need npm)
- **Python 3** -- for the faster-whisper transcription wrapper and Mumble ICE sidecar
- **ffmpeg** -- for audio splitting in the processing pipeline
- **Build tools** -- `make`, `g++` for native addon compilation (@discordjs/opus)

Optional for full pipeline:
- **faster-whisper** (Python) -- GPU transcription. Needs CUDA for GPU acceleration.
- **zeroc-ice** (Python) -- Mumble ICE client. Only needed for Mumble module.

## Setup

1. Install dependencies:
   ```bash
   cd apps/quad
   npm install
   ```
   `postinstall` runs `patch-package` to apply patches under `patches/`.

2. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` (required) -- bot token from Discord Developer Portal
   - `FIREBASE_SERVICE_ACCOUNT` -- path to `service-account.json` (for standin, scheduling, availability, processing upload)
   - `ANTHROPIC_API_KEY` -- for Claude analysis stage (optional)
   - `MUMBLE_*` vars -- only if working on the Mumble module

3. For Firebase features, place `service-account.json` in the project root (gitignored).

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Start bot locally with ts-node ESM loader |
| `npm run build` | Compile TypeScript (`tsc`) |
| `npm start` | Run compiled JS (`node dist/index.js`) |
| `npx tsc --noEmit` | Type-check without emitting (use after edits) |

In Claude Code:
- `/build` -- compile TypeScript
- `/dev` -- start bot locally

Always type-check after editing `.ts` files.

## Environment variables

See `.env.example` for the full list with defaults and comments. Key groups:

| Group | Required | Variables |
|---|---|---|
| Core | Yes | `DISCORD_TOKEN` |
| Core | No | `RECORDING_DIR`, `LOG_LEVEL`, `HEALTH_PORT` |
| Team identity | No | `TEAM_TAG`, `TEAM_NAME` |
| Processing | No | `ANTHROPIC_API_KEY`, `WHISPER_MODEL`, `PLAYER_QUERY`, `PLAYER_NAME_MAP`, `PROCESSING_AUTO`, `PROCESSING_TRANSCRIBE` |
| Firebase | No | `FIREBASE_SERVICE_ACCOUNT`, `SCHEDULER_URL` |
| Mumble | No | `MUMBLE_HOST`, `MUMBLE_PORT`, `MUMBLE_BOT_USERNAME`, `MUMBLE_PASSWORD`, `MUMBLE_ICE_SECRET` |

Modules skip gracefully when their env vars are not set. The bot runs with just `DISCORD_TOKEN` -- you get recording but no Firebase integration, no processing uploads, no scheduling features.

## Docker development

For testing the full containerized setup locally:

```bash
docker compose up --build quad
```

The `docker-compose.yml` defines two services: `quad` (the bot) and `mumble` (voice server). For code-only changes, the build is fast (~2-3 min) since the base image with heavy deps is pre-built.

See `DEPLOYMENT.md` for production Docker details (base image rebuild, qwvoice-ctl, GPU passthrough).

## Package version constraints

These are non-negotiable -- changing them will break things:

| Package | Version | Why |
|---|---|---|
| `prism-media` | 2.0.0-alpha.0 | v1 only has demuxers; v2 has OGG muxers needed for recording |
| `node-crc` | ^1.3.2 (v1) | v3+ is ESM-only and breaks prism-media's CJS require |
| `@discordjs/voice` | >= 0.19.0 | DAVE protocol support (mandatory since March 2026) |
| `@snazzah/davey` | explicit install | Peer dep of @discordjs/voice, not bundled |

## Patches

`patches/` contains npm patches applied via `patch-package` on `postinstall`. Currently patches `@discordjs/voice`. Do not remove the `patches/` directory or `patch-package` from devDependencies.

## Gotchas

- **DAVE handshake errors.** Opus streams emit error events during DAVE E2E key negotiation. These are expected and handled -- do not add extra error handlers that would crash the process.
- **ESM + ts-node.** The project uses ESM modules. ts-node requires the `--loader ts-node/esm` flag. The `dev` script handles this.
- **No dotenv.** `.env` is loaded via Node's `--env-file=.env` flag, not the dotenv package.
- **Canvas font loading.** The availability module uses `@napi-rs/canvas` with Inter fonts from `fonts/`. Font registration happens in the module's `onReady` hook.
