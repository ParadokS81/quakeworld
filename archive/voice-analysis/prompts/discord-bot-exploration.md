# Discord Recording Bot - Research & Planning Session

> Paste this into a fresh Claude Code terminal. Start by reading CLAUDE.md and PLAN.md for full project context.

## Background

We have an existing, working Python pipeline for analyzing QuakeWorld 4on4 team voice communications. It currently ingests Craig bot (3rd party Discord recording bot) exports - zip files containing per-speaker FLAC tracks. The pipeline pairs recordings with match data from the QW Hub API (hub.quakeworld.nu), splits audio into per-match segments, transcribes with faster-whisper, and runs Claude analysis.

We want to replace Craig bot with our own Discord recording bot. This eliminates manual steps (Craig export, Google Drive download, zip transfer) and gives us full control over the recording workflow.

**The pipeline is implemented and has already processed real match data.** The bot replaces only the input stage - everything downstream (match pairing, splitting, transcription, analysis) stays the same.

## Existing Codebase to Reference

Read these files to understand what the bot's output must be compatible with:

### Pipeline architecture
- `PLAN.md` - Full pipeline design, module specs, data flow
- `CLAUDE.md` - Project context, tech stack, conventions

### Output format the bot must produce
The bot's output needs to feed into the existing pipeline. These files show the exact data contracts:

- `processed/session_metadata.json` - **Read this.** This is what the pipeline expects as session-level metadata. Contains: craig_start_time (ISO 8601 UTC with ms precision), recording_id, guild_name, channel_name, and tracks array with track_number, discord_username, discord_display_name per speaker.

- `processed/2026-02-01_Book_vs_mix_dm3_01/metadata.json` - **Read this.** This is what a processed match segment looks like. Contains: match pairing data, player mappings (discord_username -> QW name), audio file paths, match_data from QW Hub, ktxstats from QW Hub. The bot doesn't produce this directly (the pipeline does), but it shows how Craig metadata flows through the system.

### Configuration
- `config/settings.yaml` - **Read this.** Current pipeline config including team settings, player_name_map (discord username -> QW name), API endpoints, pairing parameters. The bot's config should extend or complement this.

### Existing modules the bot replaces
- `src/processing/craig_parser.py` - **Read this.** This is the module that parses Craig bot exports. It extracts startTime, tracks, and speaker metadata from Craig's raw.dat format. Whatever the bot outputs, it must provide the same information so the rest of the pipeline works unchanged. The bot's output format should make this module unnecessary (or this module gets a new backend that reads from the bot's format instead of Craig's).

### Modules that consume the bot's output
- `src/processing/match_pairer.py` - Pairs recordings to QW Hub matches using timestamp alignment. Needs: session start time (UTC, ms precision) and track/speaker list.
- `src/processing/timestamp_splitter.py` - Splits audio by calculated offsets. Needs: per-speaker FLAC files, all time-aligned to recording start.
- `src/pipeline.py` - Main orchestrator. Currently calls craig_parser first, then feeds results downstream.

### Knowledge files (QW domain context)
- `knowledge/team/player_mappings.yaml` - Discord -> QW name mappings
- `knowledge/terminology/qw_glossary.yaml` - QW terms, callouts, map locations

## What We Need From This Session

This is a **research and planning session only** - no code. We want to make informed decisions before building anything.

### 1. Technical Research: Discord Voice Recording

Research the current state (2025-2026) of Discord bot voice recording. For each approach, evaluate:

- **discord.js + @discordjs/voice (Node.js)** - maturity, voice receive support, long recording stability
- **discord.py with voice receive (Python)** - current state of voice receive API, reliability for long sessions
- **Other libraries/frameworks** - any newer alternatives worth considering (Eris, Oceanic.js, JDA, etc.)
- **Hybrid approaches** - e.g., thin Node.js recorder + Python pipeline

For each option assess:
- Voice receive API maturity and stability
- Per-user audio stream separation (we need individual speaker tracks, not mixed)
- Audio format options (we want FLAC or lossless, source is Opus from Discord)
- Long recording reliability (sessions can be 2-3 hours)
- Memory and CPU usage for multi-track recording
- Community support, maintenance status, documentation quality
- Complexity of implementation

### 2. Architecture Decisions

Explore these questions with pros/cons:

**a) Language choice**
- Pure Node.js bot (proven voice support) + Python pipeline = two runtimes
- Pure Python bot + pipeline = single runtime but less proven voice receive
- What are the real trade-offs for our use case?

**b) Bot scope**
- Minimal: just records voice, writes files, done
- Medium: records + basic match integration (queries Hub API when recording ends)
- Full: records + match integration + posts results to Discord channels
- What's the right scope for v1?

**c) Audio handling**
- Discord sends Opus packets per user. What's the best path to per-speaker FLAC files?
- Real-time transcode vs. buffer Opus then convert after?
- How to handle silence, gaps, users joining/leaving mid-recording?
- Track synchronization - keeping all speaker tracks time-aligned
- Craig solves this by writing each track separately with a known start time. What's our equivalent?

**d) Deployment model**
- Docker container alongside the Python pipeline
- Single Docker compose with bot + pipeline services
- Implications for other teams self-hosting

### 3. Target Audience & Distribution

We want this to potentially serve the QuakeWorld community. Explore:

**Who uses it:**
- Primary: our team (]sr[), 4 players, one Discord server
- Secondary: other QW teams who want to record and review their comms
- Tertiary: anyone in the QW scene who wants voice archives matched to Hub data

**Distribution model options:**
- Docker image on Docker Hub / GitHub Container Registry
- docker-compose.yml with bot + pipeline + optional web UI
- Configuration via yaml/env vars (Discord token, team tag, voice channel, etc.)
- What's the minimum a non-technical QW player needs to self-host this?

**Community features:**
- Optional API endpoint where teams upload matched recordings to share publicly
- Integration with hub.quakeworld.nu (future: embedded audio playback on match pages)
- Privacy considerations - teams control their own data, opt-in sharing only

### 4. Feature Scoping

**Must-have for v1:**
- Join a Discord voice channel and record per-speaker tracks as FLAC
- Auto mode: start recording when N+ users join voice channel
- Manual mode: slash command to start/stop (e.g., `/record start`, `/record stop`)
- Auto-stop on configurable silence timeout or when all users leave
- Write output compatible with existing pipeline (per-speaker FLAC files + session metadata JSON matching the format in `processed/session_metadata.json`)
- Configurable via settings file (extending or alongside `config/settings.yaml`)
- Crash recovery: salvage partial recordings if bot disconnects

**Nice-to-have (v2+):**
- Multiple voice channel support
- Recording status messages in a text channel ("Recording started", "Recording saved: 5 maps detected")
- Auto-trigger pipeline processing when recording ends
- Web dashboard integration
- Health monitoring / uptime alerts

**Explicitly out of scope:**
- Transcription in the bot (pipeline handles this)
- AI analysis in the bot (pipeline handles this)
- Audio mixing or processing in the bot (pipeline handles this)
- Music playback or other typical bot features
- Match splitting in the bot (pipeline handles this via timestamp_splitter.py)

### 5. Infrastructure & Hosting

Our current setup:
- Development: WSL Ubuntu on Windows (Intel i7 13th gen, no GPU needed)
- Production target: Unraid server at 100.114.81.91 (Tailscale), Docker
- The bot needs to be always-on (unlike the pipeline which runs on-demand)

Evaluate:
- CPU/RAM requirements for recording 4-8 concurrent audio streams
- Storage: FLAC file sizes for typical 2-3 hour sessions with 4-8 speakers
- Network: bandwidth requirements for receiving Discord voice streams
- Can the bot run on a Raspberry Pi? Low-end VPS? Or does it need real hardware?
- Always-on considerations: reconnection handling, crash recovery, partial recording salvage

### 6. Naming & Identity

The bot needs a name and identity for the Discord server. It's a QuakeWorld-focused recording tool. Brainstorm some options - keep it QW-themed or gaming-themed.

## Output Format

Structure your findings as a decision document with:
1. Research findings per topic with sources
2. Clear recommendation for each decision point
3. Trade-off tables where applicable
4. A recommended architecture diagram (ASCII)
5. Suggested implementation order
6. Clear specification of the bot's output format (JSON schema for session metadata, file naming conventions, directory structure) - must be compatible with the existing pipeline

Save the output to `docs/bot-research.md` in the project directory.
