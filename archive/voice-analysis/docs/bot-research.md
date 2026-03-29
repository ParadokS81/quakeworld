# Discord Recording Bot — Research & Decision Document

> Generated: 2026-02-03
> Context: Replace Craig bot with a self-hosted Discord voice recorder for the QW voice analysis pipeline.
> Long-term vision: Community-wide voice comms paired to QW Hub matches — hear both teams during replays.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technical Research: Discord Voice Recording](#2-technical-research-discord-voice-recording)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Bot Output Specification](#4-bot-output-specification)
5. [Feature Scope](#5-feature-scope)
6. [Infrastructure & Hosting](#6-infrastructure--hosting)
7. [Target Audience & Distribution](#7-target-audience--distribution)
8. [The Vision: Voice Comms on QW Hub](#8-the-vision-voice-comms-on-qw-hub)
9. [Naming & Identity](#9-naming--identity)
10. [Implementation Order](#10-implementation-order)
11. [Architecture Diagram](#11-architecture-diagram)
12. [Existing Code Evaluation](#12-existing-code-evaluation)

---

## 1. Executive Summary

### Problem
- Craig bot costs $5/month (for features like FLAC export, longer recordings)
- Exports go to Google Drive, requiring manual download and transfer
- No control over recording format, timing, or metadata
- Manual steps break the automation chain between recording and analysis
- No path to community-wide adoption — each team's recordings are siloed

### Solution
Build a minimal, self-hostable Discord recording bot that:
- Joins a voice channel and records per-speaker Opus/OGG tracks
- Writes output directly to the local filesystem in a format the existing pipeline already understands
- Ships as a Docker container anyone in the QW community can run with minimal setup
- Produces clean, standardized metadata designed for future Hub integration

### The bigger picture
The immediate goal is replacing Craig for our team. But the metadata format and Docker distribution are designed from day one so that if multiple QW teams adopt this, we build up a corpus of voice recordings that can be paired to Hub matches. The long-term dream: embedded audio on hub.quakeworld.nu match pages — hear both teams' comms during a replay.

### What stays the same
The entire downstream pipeline is unchanged: match pairing, audio splitting, transcription, analysis. The bot replaces only `craig_parser.py`'s input — instead of parsing a Craig zip export, the pipeline reads from the bot's output directory directly.

### Craig as fallback
Craig remains usable. If the bot is down or someone prefers Craig, they can still export a zip and feed it to the existing pipeline via `craig_parser.py`. Nothing is removed.

---

## 2. Technical Research: Discord Voice Recording

### How Discord Voice Works

Discord voice channels use a WebSocket connection for signaling and a UDP connection for audio data. Audio is sent as **Opus-encoded packets** (48kHz, stereo, ~96kbps CBR) wrapped in RTP headers, encrypted with libsodium (XSalsa20+Poly1305). Each user in a voice channel has their own SSRC (Synchronization Source identifier), so per-user audio separation is built into the protocol.

**Key point:** Per-user separation is free — Discord already sends each speaker as a distinct stream. This is why Craig can produce per-speaker tracks, and why our bot can too.

### DAVE Protocol (Critical: March 2026 deadline)

Discord is rolling out **DAVE** (Discord Audio & Video End-to-End Encryption):
- Since September 2024, clients prefer E2EE for voice
- **March 1, 2026**: E2EE becomes mandatory. Clients/bots without DAVE support cannot join voice channels
- Libraries must implement DAVE or use Discord's `libdave` bindings
- For discord.js: the `@snazzah/davey` npm package provides DAVE support (already integrated)
- For discord.py/pycord: the `davey` Python package provides DAVE support (PR merged into discord.py)

**This is a hard deadline.** Any bot we build must support DAVE by March 2026, or it stops working entirely.

### Library Comparison

#### Option A: discord.js + @discordjs/voice (Node.js) — RECOMMENDED

| Aspect | Assessment |
|--------|-----------|
| **Voice receive maturity** | Most mature. `VoiceReceiver` class with per-user `subscribe()` since v0.6.0. Well-documented. |
| **Per-user streams** | Built-in. `connection.receiver.subscribe(userId)` returns a Readable Opus stream per user. |
| **Audio format** | Raw Opus packets from Discord. Can write directly to OGG/Opus container (no transcoding needed) or decode to PCM via `prism-media`. |
| **Long recording stability** | Known issues exist: EventEmitter listener buildup, `ERR_STREAM_PUSH_AFTER_EOF` on stream end, memory leaks if streams aren't cleaned up. All solvable with proper stream lifecycle management. |
| **DAVE support** | Yes, via `@snazzah/davey`. Already integrated into discord.js voice guide. |
| **Community & maintenance** | Very active. discord.js is the dominant Discord library (150k+ GitHub stars). Regular releases. |
| **Documentation** | Excellent. Official guide with voice receive examples, recorder example in voice-examples repo. |
| **Ecosystem** | `@discordjs/voice`, `@discordjs/opus` (native Opus bindings), `prism-media` (audio transforms), `sodium-native` (encryption). |

**Known pitfalls to handle:**
- Must properly destroy `AudioReceiveStream` instances after recording
- Must handle users joining/leaving mid-recording (new SSRC assignments)
- Must set `selfDeaf: false` when joining to enable receiving
- Memory: stream to disk, don't buffer in memory

#### Option B: Pycord (Python fork of discord.py)

| Aspect | Assessment |
|--------|-----------|
| **Voice receive maturity** | Functional but less proven. Sink-based API: `start_recording(sink, callback)`. |
| **Per-user streams** | Built-in via sink system. `sink.audio_data` maps `user_id` → audio data. |
| **Audio format** | Decodes Opus to PCM internally. Has OGG sink built-in, but sink system buffers in memory. |
| **Long recording stability** | Stores all audio in memory (`BytesIO`). For a 3-hour session with 5 speakers, that's potentially 1.5-2.5 GB of PCM in RAM. No built-in chunking or disk streaming. |
| **DAVE support** | In progress. PR exists for discord.py, pycord tracking separately. Less certain timeline. |
| **Community & maintenance** | Active but smaller than discord.js. Pycord has ~2.5k GitHub stars. |
| **Documentation** | Basic guide exists. Less comprehensive than discord.js for voice receive specifically. |

**Advantage:** Same language as the pipeline (Python). Single runtime.
**Dealbreaker risk:** Memory-buffered recording is unsuitable for 2-3 hour sessions. DAVE support timeline uncertain.

#### Option C: discord.py + discord-ext-voice-recv

| Aspect | Assessment |
|--------|-----------|
| **Status** | Experimental extension. Not part of discord.py core. |
| **DAVE support** | PR #10300 adds DAVE to discord.py core, but this extension would need updating. |
| **Risk** | Single maintainer, experimental status, unclear long-term support. |

**Verdict:** Too risky for a production recording bot.

#### Option D: Self-host Craig

| Aspect | Assessment |
|--------|-----------|
| **Maturity** | Battle-tested. Records millions of sessions. |
| **Architecture** | Node.js (Eris library), PostgreSQL, Redis. Two-phase: record raw OGG packets, then "cook" into audio files. |
| **Self-hosting** | Documented in `SELFHOST.md`. Docker support. Requires PostgreSQL, Redis, ffmpeg, flac. |
| **Complexity** | Significant. Full web app, database, cooking server. Designed for multi-tenant SaaS, not single-team use. |
| **Output format** | Would need adaptation to produce our `session_metadata.json` format, or we keep `craig_parser.py` and point it at the self-hosted output. |

**Verdict:** Overkill for our needs. We'd be maintaining a full SaaS stack when we just need a simple recorder. However, Craig's source code is valuable as a reference for how they handle RTP packet capture, track synchronization, and the cooking process.

#### Option E: Pandora (Craig fork)

| Aspect | Assessment |
|--------|-----------|
| **Maturity** | Simplified Craig fork. Typescript, uses Dapr for decoupling. |
| **Architecture** | Modular: recorder + separate cooking service. Pub/sub control. |
| **Complexity** | Still significant due to Dapr dependency. Designed for horizontal scaling we don't need. |

**Verdict:** Interesting reference architecture, but Dapr is unnecessary complexity for a single-team recorder.

### Recommendation

**discord.js + @discordjs/voice (Node.js)**. The reasons:

1. **Most mature voice receive API** — years of production use, known issues documented and fixable
2. **DAVE support ready now** — `@snazzah/davey` is already integrated
3. **Stream-to-disk** — we can pipe Opus/PCM directly to ffmpeg for FLAC encoding without buffering entire sessions in memory
4. **Craig itself uses Node.js** — this is proven technology for Discord voice recording
5. **Community projects to reference** — `Kirdock/discordjs-voice-recorder`, `chebro/discord-voice-recorder`, Craig source, Pandora source

The trade-off is having two runtimes (Node.js for the bot, Python for the pipeline). This is manageable — the bot is a standalone service that writes files. The pipeline reads those files. They communicate via the filesystem, not API calls.

---

## 3. Architecture Decisions

### a) Language Choice: Hybrid (Node.js bot + Python pipeline)

| Factor | Pure Python | Pure Node.js | Hybrid (recommended) |
|--------|------------|-------------|---------------------|
| Voice receive maturity | Weak | Strong | Strong (Node.js bot) |
| Pipeline compatibility | Native | Rewrite needed | Native (Python pipeline) |
| DAVE readiness | Uncertain | Ready | Ready |
| Memory management | Buffered (bad for long sessions) | Streamable | Streamable |
| Deployment complexity | Single container | Would need Python for whisper/analysis | Two services, docker-compose |
| Developer familiarity | You know Python | New language | Bot is small, pipeline stays |

The bot is a focused, small service (~500-800 lines). It doesn't need to share code with the pipeline. They communicate via files on disk. Two runtimes is fine.

### b) Bot Scope: Minimal recorder (v1)

**v1 scope: Record and write files. Nothing else.**

| Scope level | What it does | Verdict |
|-------------|-------------|---------|
| **Minimal** | Records voice, writes FLAC + metadata JSON | **v1 — do this** |
| Medium | + queries Hub API when recording ends | v2 — let the pipeline handle this |
| Full | + posts results to Discord, triggers pipeline | v3 — nice-to-have |

Rationale: The pipeline already handles everything after recording. Adding API queries or Discord notifications to the bot couples it to pipeline logic. Keep the bot dumb — it records audio and writes files. The pipeline (or a simple cron/watcher) picks them up.

### c) Audio Handling

#### Discord → OGG/Opus path

```
Discord voice gateway
    ↓ (encrypted Opus packets over UDP, per-user SSRC)
@discordjs/voice decrypts + demuxes
    ↓ (raw Opus frames per user)
OGG muxer (e.g., ogg-opus via ffmpeg or ogg npm package)
    ↓ (wrap Opus frames in OGG container — no transcoding)
Per-speaker .ogg files on disk
```

**Why OGG/Opus instead of FLAC:**
- Discord sends Opus (lossy, ~96kbps). This is the quality ceiling — information is already lost.
- FLAC would decode Opus→PCM then re-encode to FLAC: ~100-150 MB/hour/speaker, zero quality gain over the Opus source.
- OGG/Opus stores the original Opus frames directly: ~5-8 MB/hour/speaker. Bit-perfect preservation of what Discord sent.
- **15-20x smaller files** for identical audio quality.
- The entire downstream toolchain handles OGG/Opus natively: ffmpeg (for splitting), faster-whisper (for transcription). Both internally decode to PCM before processing — there is no speed or quality difference vs FLAC input.

**Why stream to disk rather than buffer in memory:**
- Even with small Opus files, streaming is the right pattern for a long-running recorder.
- Crash recovery: data written up to crash point is a valid OGG file (if properly finalized) or recoverable.
- Memory: near-zero per-user. No bulk buffering.

**What about FLAC for archival/editing?**
- Craig offers FLAC for podcast editors who work in DAWs (Audacity, etc.) that expect lossless input.
- Our use case is transcription and analysis — whisper doesn't care about input format.
- For the Hub vision, smaller files = faster uploads, less storage cost.
- If someone ever needs FLAC (e.g., for manual editing), a one-liner converts it: `ffmpeg -i track.ogg track.flac`. No quality difference since the source was Opus either way.

#### Silence and gaps

When a user is not speaking, Discord sends no packets (silence suppression / VAD). The bot must:
- Track the timestamp of the first packet received per user (relative to recording start)
- Insert silence for gaps between speech bursts
- This is handled naturally by ffmpeg if we feed it a continuous PCM stream where gaps are filled with zero bytes

#### Users joining/leaving mid-recording

- When a user joins mid-recording: start a new ffmpeg process for them, with silence prepended from recording start to join time
- When a user leaves: close their ffmpeg process, note their departure in metadata
- When a user rejoins: append to their existing track (with silence for the gap)

#### Track synchronization

All tracks are synchronized to the recording start time. The bot records:
- `recording_start_time`: ISO 8601 UTC with millisecond precision (equivalent to Craig's `startTime`)
- Each track's first-packet timestamp relative to recording start

This is the same approach Craig uses, and it's what the pipeline expects.

### d) Deployment Model

```
docker-compose.yml
├── qw-recorder        (Node.js bot — always on)
├── qw-pipeline        (Python pipeline — runs on demand or triggered)
└── shared volume      (recordings/ directory)
```

- Both services mount the same `recordings/` volume
- The bot writes to `recordings/raw/{session_id}/`
- The pipeline reads from `recordings/raw/` and writes to `processed/`
- For other teams self-hosting: they only need the `qw-recorder` service if they just want recording. The pipeline is optional.

---

## 4. Bot Output Specification

The bot's output format serves two purposes:
1. **Pipeline input** — the existing pipeline can consume it without changes
2. **Community data contract** — this is the format other teams will produce if they adopt the bot, and what Hub integration will eventually consume

The metadata format matters more than most implementation details. If 10 teams run this bot and we want to pair their recordings to Hub matches later, the schema needs to be right from the start. It's much harder to change a format once data exists in the wild.

### Directory structure

```
recordings/raw/{session_id}/
├── session_metadata.json       # Session-level metadata (replaces Craig's raw.dat/info.txt)
├── 1-{username}.ogg            # Per-speaker OGG/Opus track
├── 2-{username}.ogg
├── 3-{username}.ogg
└── ...
```

Using Craig's filename convention (`{track_number}-{username}.{ext}`) with `.ogg` extension. `craig_parser.py`'s `_match_tracks_to_files()` needs a small update: glob for `*.ogg` in addition to `*.flac`. Both formats remain supported for Craig fallback compatibility.

### session_metadata.json schema

This is a **public contract** — designed for interoperability across teams and future Hub integration.

```json
{
  "schema_version": 1,
  "recording_start_time": "2026-02-01T21:08:18.330000+00:00",
  "recording_end_time": "2026-02-01T23:24:52.117000+00:00",
  "recording_id": "01JKXYZ...",
  "source": "qw-recorder",
  "source_version": "1.0.0",
  "guild": {
    "id": "1234567890",
    "name": "Slackers"
  },
  "channel": {
    "id": "9876543210",
    "name": "1"
  },
  "team": {
    "tag": "]sr[",
    "name": "Slackers"
  },
  "tracks": [
    {
      "track_number": 1,
      "discord_user_id": "123456789",
      "discord_username": "paradoks",
      "discord_display_name": "ParadokS",
      "joined_at": "2026-02-01T21:08:18.330000+00:00",
      "left_at": "2026-02-01T23:24:52.117000+00:00",
      "audio_file": "1-paradoks.ogg"
    }
  ]
}
```

#### Schema design rationale

| Field | Why |
|-------|-----|
| `schema_version` | Future-proofing. When the format evolves, consumers can handle multiple versions. Critical for a community format. |
| `recording_start_time` | Renamed from `craig_start_time`. The old name was an implementation detail that shouldn't leak into a public contract. Pipeline gets a one-line alias. |
| `recording_end_time` | Needed for Hub match pairing — you need the recording window to find which matches overlap. |
| `recording_id` | ULID preferred over UUID — sortable by time, which helps when browsing recordings. |
| `source` / `source_version` | Identifies what produced this file. `"qw-recorder"` vs `"craig"` vs future sources. Version helps debug issues across community deployments. |
| `guild.id` / `channel.id` | Discord snowflake IDs are stable. Names can change. IDs let you correlate recordings from the same server over time. |
| `team.tag` | The QW team tag (e.g., `"]sr["`). Configured per bot instance. Essential for Hub match pairing — Hub matches have team names. |
| `tracks[].joined_at/left_at` | When users actually joined/left the voice channel. Useful for knowing who was present for which parts. |
| `tracks[].audio_file` | Explicit filename reference. No guessing based on conventions. |

#### Backward compatibility with existing pipeline

The pipeline currently reads `craig_start_time` from `session_metadata.json`. Two options:
- **Option A:** `craig_parser.py` maps `recording_start_time` → `craig_start_time` internally (alias, ~3 lines)
- **Option B:** Bot writes both fields during a transition period

Option A is cleaner. The internal `CraigSession` dataclass already has `start_time` — the field name in JSON doesn't matter as long as the parser handles it.

### Audio file format

| Property | Value |
|----------|-------|
| Container | OGG |
| Codec | Opus (passthrough from Discord — no transcoding) |
| Sample rate | 48000 Hz |
| Channels | 2 (stereo, matching Discord source) |
| Bitrate | ~96 kbps (Discord default) |
| Size | ~5-8 MB per hour per speaker |
| Duration | Full recording duration (silence-padded from start) |

All tracks have the **same duration** — they all start at recording start time and end at recording end time, with silence where the user wasn't speaking. This ensures perfect sync, matching Craig's behavior and what `timestamp_splitter.py` expects.

**Comparison to FLAC:**

| | OGG/Opus | FLAC |
|---|---------|------|
| Quality | Identical (same Opus source) | Identical (same Opus source) |
| Size/hour/speaker | ~5-8 MB | ~100-150 MB |
| Transcoding needed | No (passthrough) | Yes (decode + re-encode) |
| CPU during recording | Near-zero | Moderate (ffmpeg encode) |
| Whisper processing speed | Same | Same |
| ffmpeg splitting | Native | Native |
| Hub upload size (5 maps, 5 speakers) | ~200-400 MB | ~5-8 GB |

### Why this format is important for the community vision

If team A and team B both run the bot during the same match:
- Team A's recording has `team.tag: "]sr["`, `recording_start_time: T1`, tracks for their 4 players
- Team B's recording has `team.tag: "nqr"`, `recording_start_time: T2`, tracks for their 4 players
- Hub has the match at timestamp T3 with both team names and all 8 player names
- **Pairing is straightforward**: match `team.tag` + `recording_start_time` window against Hub match timestamps and team names
- Result: both teams' comms are available for the same match, each from their own perspective

This only works if the metadata is clean and standardized. That's why `schema_version`, `team.tag`, and proper timestamps matter from v1.

---

## 5. Feature Scope

### v1 — Must-have

| Feature | Description |
|---------|-------------|
| **Join & record** | Bot joins a voice channel and records all speakers as separate FLAC tracks |
| **Slash commands** | `/record start` — joins the invoker's voice channel and starts recording |
| | `/record stop` — stops recording, saves files, leaves channel |
| **Auto-stop** | Stop recording when all users leave the voice channel |
| **Session metadata** | Write `session_metadata.json` with start time, tracks, guild/channel info |
| **Track sync** | All tracks time-aligned to recording start (silence-padded) |
| **Crash recovery** | OGG streaming means partial recordings are salvageable up to crash point |
| **Configuration** | `config.yaml` or environment variables: Discord token, output directory, voice channel ID (optional) |
| **Logging** | Structured logging: recording start/stop, users join/leave, errors |
| **Health** | Basic health check endpoint (HTTP) for Docker health checks |

### v2 — Nice-to-have

| Feature | Description |
|---------|-------------|
| **Auto-start** | Start recording when N+ users join a configured voice channel |
| **Status messages** | Post to a text channel: "Recording started", "Recording saved: 5 tracks, 2h 15m" |
| **Pipeline trigger** | Run pipeline automatically when recording ends (subprocess or HTTP call) |
| **Multiple channels** | Support recording multiple voice channels simultaneously |
| **Recording status** | `/record status` — shows current recording duration, users, file sizes |

### v3 — Future

| Feature | Description |
|---------|-------------|
| **Web dashboard** | Simple web UI showing recording history, status, disk usage |
| **Auto-cleanup** | Delete raw recordings older than N days |
| **QW Hub integration** | Query Hub API for recent matches when recording stops, attach match info |
| **Community sharing** | Optional API to share analysis results with the QW community |

### Explicitly out of scope (always)

- Transcription (pipeline does this)
- AI analysis (pipeline does this)
- Audio mixing/processing (pipeline does this)
- Match splitting (pipeline does this)
- Music playback
- Moderation features

---

## 6. Infrastructure & Hosting

### Resource requirements

| Resource | Estimate | Notes |
|----------|----------|-------|
| **CPU** | Near-zero | Opus passthrough to OGG container — no transcoding. Just muxing raw packets. |
| **RAM** | ~100-200 MB | Node.js runtime + discord.js + one small buffer per audio stream. No bulk memory storage. |
| **Disk (per session)** | ~25-40 MB per hour (5 speakers) | OGG/Opus ≈ 5-8 MB/hour/speaker. 5 speakers × 3 hours ≈ 75-120 MB per session. |
| **Network** | ~25-50 KB/sec per speaker | Discord Opus ≈ 8-12 KB/sec per speaker. Overhead for encryption + protocol. Negligible for any broadband connection. |

### Your hardware

**Primary (Ubuntu headless + 4090):**
- More than sufficient. The bot barely uses CPU. The 4090 is irrelevant for the bot itself but valuable for the pipeline (faster-whisper with GPU would dramatically speed up transcription).
- This is the ideal single-machine setup: bot records → pipeline processes on the same box.

**Backup (Unraid i7 13th gen):**
- Also more than sufficient for the bot alone.
- The 5090 on LAN could be used for GPU-accelerated transcription if needed (pipeline connects to it for whisper inference).

### Storage planning

| Scenario | Sessions/week | Storage/month |
|----------|--------------|---------------|
| 1 team, 2 practice nights | 2 | ~150-250 MB |
| 1 team, daily | 7 | ~500-850 MB |
| 5 teams sharing a server | 10-15 | ~1-2 GB |

OGG/Opus is tiny. A 1 TB drive could hold years of recordings without cleanup. Storage is effectively a non-issue.

### Always-on considerations

The bot must be always-on to be useful (unlike the pipeline which runs on demand):

| Concern | Solution |
|---------|----------|
| Process crashes | Docker restart policy: `restart: unless-stopped` |
| Discord disconnects | `@discordjs/voice` has built-in reconnection. Handle `VoiceConnectionStatus.Disconnected` gracefully. |
| System reboots | Docker starts on boot. |
| Partial recording on crash | Streaming OGG to disk = data written up to crash point is recoverable. OGG pages are self-contained, so partial files can be repaired. |
| Discord API changes | Keep dependencies updated. Watch for DAVE enforcement (March 2026). |

---

## 7. Target Audience & Distribution

> **Docker-first distribution.** The primary deliverable for the community is a Docker image that any QW team can pull and run. This is non-negotiable for adoption — QW players shouldn't need to install Node.js or understand npm.

### User tiers

| Tier | Who | What they need |
|------|-----|---------------|
| **Primary** | ]sr[ (your team) | Full pipeline: bot + analysis |
| **Secondary** | Other QW 4on4 teams | Just the recording bot, maybe the pipeline |
| **Tertiary** | QW community at large | Docker image on GitHub, documentation |

### Distribution model

```
GitHub repository: qw-voice-recorder (or similar)
├── bot/                    # Node.js Discord bot
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── pipeline/               # Python analysis pipeline (this repo, or submodule)
│   ├── Dockerfile
│   └── ...
├── docker-compose.yml      # Full stack: bot + pipeline
├── docker-compose.bot.yml  # Bot only (for teams who just want recording)
├── config/
│   └── config.example.yaml
└── README.md
```

**For self-hosters:**
1. Clone the repo
2. Copy `config.example.yaml` → `config.yaml`, add Discord bot token
3. `docker compose up -d`

That's it. No database, no Redis, no external services (unlike Craig's self-host which requires PostgreSQL + Redis).

### Privacy model

- **All data stays local.** Recordings are written to the host filesystem, never uploaded anywhere.
- **No telemetry.** The bot connects to Discord's API only. No external analytics.
- **Teams own their data.** Each team runs their own instance with their own bot token.
- **Optional sharing (future):** Teams could opt-in to share recordings or analysis results with Hub. This is v3+ and strictly opt-in. Raw audio sharing requires explicit consent — some teams will want their comms public (entertainment value), others won't.

### Minimum requirements for non-technical QW players to self-host

Realistically, self-hosting a Discord bot requires:
- A machine that can run Docker (Linux VPS, home server, even a decent NAS)
- A Discord bot token (creating a bot in Discord Developer Portal)
- Basic command-line ability (editing a config file, running `docker compose up`)

This is achievable for motivated QW players. Most competitive QW teams have at least one person who can handle this. The documentation needs to be clear and step-by-step.

---

## 8. The Vision: Voice Comms on QW Hub

### What this looks like

Imagine opening a match page on hub.quakeworld.nu:

```
4on4: ]sr[ 268 - 140 Book | dm3 | Berlin KTX #4
[Watch demo] [Download MVD]

🎧 Voice Comms Available:
  [▶ ]sr[ comms]  [▶ Book comms]  [▶ Both teams]
```

Click play, watch the demo replay, and hear what both teams were saying in real-time. Synced to the match timeline.

This is the CS2/Valorant comms experience, but for QuakeWorld. No other retro FPS community has this.

### How we get there

The path from "bot records audio" to "Hub plays synced comms" has natural stepping stones:

**Step 1 (now): Bot produces clean recordings with standardized metadata**
- Each recording has `recording_start_time` (UTC, ms precision)
- Each recording has `team.tag` identifying which team's comms these are
- Audio is per-speaker OGG/Opus, time-aligned to recording start

**Step 2 (pipeline): Recordings get paired to Hub matches**
- This already works. The pipeline uses `recording_start_time` + `team.tag` to find matches on Hub via the Supabase API
- Output: per-match audio segments with `game_id` linking them to Hub matches

**Step 3 (sharing): Paired recordings get uploaded to Hub (or a linked service)**
- After pipeline processing, the matched audio segments + metadata can be submitted to Hub
- Hub stores the `game_id` → audio mapping
- Privacy: team decides per-match whether to publish comms

**Step 4 (Hub integration): Hub embeds audio playback on match pages**
- Hub match pages get an audio player
- If one team shared comms: single track available
- If both teams shared comms: both perspectives available, selectable
- Audio timeline synced to match duration (0:00 = match start, 20:00 = match end)

### Why the metadata format matters for this

Every team running the bot produces data in the same format. When it reaches Hub:
- `team.tag` → maps to Hub team name
- `recording_start_time` → pairs to Hub match timestamp (same algorithm as our pipeline's `match_pairer.py`)
- `tracks[].discord_username` → maps to QW player names via each team's configured `player_name_map`
- `game_id` (added by the pipeline after pairing) → direct foreign key to Hub's match database

The sync mechanism is the same regardless of which team recorded: UTC timestamps from Discord matched against UTC timestamps from QW game servers. Both use NTP-synced clocks. This is already validated with real data — our pipeline's match pairing works within seconds of accuracy.

### What this means for other teams

A team that runs the bot doesn't need to run the full analysis pipeline. The minimum useful setup is:
1. Run the Docker bot → it records their practice/match sessions
2. Recordings accumulate locally with clean metadata
3. Later (once Hub integration exists): opt-in to upload matched recordings to Hub

They get immediate value (recordings of their own sessions) and optional community value (sharing with Hub).

---

## 9. Naming & Identity

QW-themed name options for the bot:

| Name | Reference | Vibe |
|------|-----------|------|
| **Quad** | Quad Damage — QW's signature powerup | Short, punchy, QW-iconic |
| **QBot** | Simple, descriptive | Functional |
| **Voregod** | QW terminology for fragging powerhouse | Too aggressive? |
| **Specbot** | Spectator bot — records what it observes | Descriptive, QW-relevant |
| **Campbot** | A bot that sits in one spot and watches | Self-deprecating QW humor |
| **MVD** | Multi-View Demo — QW's server-side recording format | Technical, QW-specific |
| **DemoBot** | Demos are QW recordings | Clear purpose |
| **Axebot** | Everyone starts with an axe in QW | Minimal, iconic |
| **GibRecorder** | Gibs = QW gore fragments | Fun but long |

**Recommendation:** **Quad** — it's short, immediately recognizable to any QW player, and has good energy. "Quad is recording" feels natural. `/quad start`, `/quad stop`.

Runner-up: **MVD** — technically accurate (it records matches like a demo) and QW-specific, though less catchy.

---

## 10. Implementation Order

### Phase 1: Bot core (recording works)
1. Scaffold Node.js project with `@discordjs/voice`, `discord.js`, DAVE support
2. Implement: join voice channel, receive per-user Opus streams
3. Implement: wrap Opus frames in OGG container (per user, streaming to disk)
4. Implement: track sync (silence padding from recording start)
5. Implement: write `session_metadata.json` on recording stop
6. Test: record a real QW session, verify output matches expected format

### Phase 2: Commands & lifecycle
7. Implement slash commands: `/record start`, `/record stop`
8. Implement auto-stop on empty channel
9. Implement graceful shutdown (SIGTERM handler → stop recording cleanly)
10. Handle users joining/leaving mid-recording
11. Configuration file (Discord token, output dir, channel ID)
12. Logging

### Phase 3: Pipeline integration
13. Update `craig_parser.py` to detect bot output format (read `session_metadata.json` directly)
14. Test: bot output → pipeline → transcription → analysis (full chain)
15. Dockerize the bot
16. Create `docker-compose.yml` with bot + pipeline services + shared volume

### Phase 4: Polish & distribution
17. Health check endpoint
18. Error handling and edge cases
19. Documentation (README, self-hosting guide)
20. GitHub repository setup
21. Docker Hub / GHCR image publishing

---

## 11. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Discord Voice Channel                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ ParadokS │ │  zero    │ │ grisling │ │ carapace │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       │ Opus        │ Opus       │ Opus       │ Opus    │
└───────┼─────────────┼────────────┼────────────┼─────────┘
        │             │            │            │
        └──────┬──────┴─────┬──────┴────────────┘
               │            │
               ▼            │
┌──────────────────────────────────────────────────────────┐
│                    QW Recorder Bot                        │
│                    (Node.js + discord.js)                 │
│                                                          │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ VoiceReceiver   │  │ Per-user OGG muxers          │   │
│  │                 │  │                              │   │
│  │ subscribe(u1)───┼──┼─► OGG mux → 1-paradoks.ogg   │   │
│  │ subscribe(u2)───┼──┼─► OGG mux → 2-zerohero.ogg  │   │
│  │ subscribe(u3)───┼──┼─► OGG mux → 3-grisling.ogg  │   │
│  │ subscribe(u4)───┼──┼─► OGG mux → 4-carapace.ogg  │   │
│  └─────────────────┘  └─────────────────────────────┘   │
│                                                          │
│  On stop: write session_metadata.json                    │
└──────────────────────────┬───────────────────────────────┘
                           │ writes to shared volume
                           ▼
┌──────────────────────────────────────────────────────────┐
│              recordings/raw/{session_id}/                 │
│                                                          │
│  ├── session_metadata.json                               │
│  ├── 1-paradoks.ogg                                      │
│  ├── 2-zerohero5954.ogg                                  │
│  ├── 3-grisling2947.ogg                                  │
│  └── 4-carapace.ogg                                      │
└──────────────────────────┬───────────────────────────────┘
                           │ reads from shared volume
                           ▼
┌──────────────────────────────────────────────────────────┐
│              QW Analysis Pipeline                         │
│              (Python — existing, unchanged)               │
│                                                          │
│  [1] craig_parser.py ─── reads session_metadata.json     │
│           │                + FLAC files                   │
│           ▼                                              │
│  [2] qwhub_client.py ── queries hub.quakeworld.nu        │
│           │                                              │
│           ▼                                              │
│  [3] match_pairer.py ── pairs matches to recording       │
│           │                                              │
│           ▼                                              │
│  [4] timestamp_splitter.py ── splits audio per match     │
│           │                                              │
│           ▼                                              │
│  [5] transcriber.py ── faster-whisper (CPU or GPU)       │
│           │                                              │
│           ▼                                              │
│  [6] analyzer.py ── Claude analysis + ktxstats           │
│           │                                              │
│           ▼                                              │
│      processed/{date}_{match}/                           │
│      └── analysis/report.md                              │
└──────────────────────────────────────────────────────────┘
```

### Docker Compose deployment

```
┌─────────────────────────────────────────┐
│           Docker Host                    │
│                                         │
│  ┌───────────────┐  ┌───────────────┐   │
│  │ qw-recorder   │  │ qw-pipeline   │   │
│  │ (Node.js)     │  │ (Python)      │   │
│  │ always-on     │  │ on-demand/    │   │
│  │               │  │ triggered     │   │
│  └───────┬───────┘  └───────┬───────┘   │
│          │                  │           │
│          └──────┬───────────┘           │
│                 │                       │
│          ┌──────▼──────┐                │
│          │  /data/     │ (shared vol)   │
│          │  recordings/│                │
│          │  processed/ │                │
│          │  config/    │                │
│          └─────────────┘                │
└─────────────────────────────────────────┘
```

---

## 12. Existing Code Evaluation

We evaluated two existing Discord voice recording implementations as potential starting points for our bot.

### a) @kirdock/discordjs-voice-recorder

**Repository**: [Kirdock/discordjs-voice-recorder](https://github.com/Kirdock/discordjs-voice-recorder)
**Type**: npm library (NOT a standalone bot)
**Size**: ~500 lines TypeScript, 5 source files
**Last release**: v1.1.1 (July 2024) — lightly maintained, ~1 release/year
**Stars**: 31 | Forks: 4

#### What it does

A **replay buffer** library — it keeps the last N minutes of voice audio in memory and exports on demand. Think "clip the last 5 minutes" rather than "record the whole session." You integrate it into your own bot by importing the `VoiceRecorder` class and calling methods on it.

It is **not** a bot, has no slash commands, no Docker support, and no standalone entry point.

#### Silence padding & per-user sync

This is the most interesting part. The library does handle both:

- **`ReplayReadable`** stores timestamped PCM chunks per user (`{chunk, startTime, stopTime}`)
- **`addSilentTime()`** calculates gaps between speech segments and generates zero-filled PCM buffers to fill them
- **`getMinStartTime()`** finds the earliest timestamp across all users; `rewind(startTime, endTime)` prepends silence so all tracks share a synchronized timeline

The sync approach is sound — conceptually identical to what Craig does and what our pipeline expects. However, timing is reconstructed from packet timestamps, not a continuous clock. Minor drift is possible.

#### Streaming vs buffering

**All in-memory.** No disk writes during recording. Audio lives in `ReplayReadable._bufArr` with configurable limits (default: 100 MB per user, 10-minute rolling window). Chunks older than the window are automatically purged.

On export, audio is served to FFmpeg via Unix sockets / named pipes and output as MP3 (or per-user MP3s in a ZIP).

**This is a dealbreaker for our use case.** A 3-hour QW session with 5 speakers would need either massive memory allocation with no cap, or we'd lose audio to the rolling window. Process crash = total data loss.

#### Output format

- Decodes Discord's Opus → PCM (s16le, **16kHz** by default — phone quality, configurable)
- Exports as **MP3 only** (via fluent-ffmpeg)
- No OGG/Opus passthrough, no FLAC, no WAV option
- Sample rate and channels are constructor options, but the MP3 output is hardcoded

#### DAVE compatibility

**Unknown.** No mention of DAVE anywhere in the codebase. Depends on `@discordjs/voice >=0.16.0` (open-ended), so it *might* work with newer versions that support DAVE transparently, but this is untested. No guarantees for the March 2026 deadline.

#### Dependencies

| Package | Purpose |
|---------|---------|
| `@discordjs/opus` ^0.9.0 | Opus decode (native addon) |
| `@discordjs/voice` >=0.16.0 | Voice connection API |
| `archiver` ^5.3.1 | ZIP creation for split exports |
| `fluent-ffmpeg` ^2.1.2 | FFmpeg wrapper for MP3 encoding |

Plus system FFmpeg required.

#### What we'd need to change to use it

| Change | Effort |
|--------|--------|
| Replace replay buffer with continuous disk streaming | **Rewrite core** — the entire `ReplayReadable` class |
| Change output from MP3 to OGG/Opus passthrough | **Rewrite export** — remove FFmpeg MP3 pipeline, add OGG muxer |
| Add slash commands, bot lifecycle, session management | **Write from scratch** — library has none of this |
| Add `session_metadata.json` output | Write from scratch |
| Add DAVE support (`@snazzah/davey`) | Integration work, untested with this library |
| Add Docker support | Write from scratch |
| Change default sample rate from 16kHz to 48kHz | Config change (minor) |

#### Verdict

**Not suitable as a foundation.** The replay-buffer architecture is fundamentally wrong for continuous multi-hour session recording. Every core component (buffering, output format, export pipeline) would need rewriting. By the time we've replaced the buffer, the export, and added bot logic, we've written a new project that happens to share a package.json.

**However**: The silence-padding and track-sync code (`replay-readable.utils.ts`, `addSilentTime()`, `syncStream()`) is a **valuable reference implementation**. The algorithm for gap detection and silence insertion is clean and well-structured. Worth studying when we implement our own silence handling.

---

### b) discord.js Official Voice Recorder Example

**Repository**: [discordjs/voice/examples/recorder](https://github.com/discordjs/voice/tree/main/examples/recorder)
**Type**: Standalone demo bot
**Size**: ~170 lines TypeScript, 4 source files
**Status**: **Archived** (July 2023) — no maintenance, outdated dependencies
**discord.js version**: v13 (current is v14)

#### What it does

A minimal bot demonstrating `@discordjs/voice` receive API. Three slash commands:
- `/join` — bot joins your voice channel (`selfDeaf: false`, `selfMute: true`)
- `/record <speaker>` — marks a specific user as recordable (manual per-user opt-in)
- `/leave` — disconnects

When a marked user starts speaking, it subscribes to their Opus stream and pipes it to an OGG file on disk.

#### Audio handling

```
receiver.subscribe(userId) → Opus stream → prism-media OGG muxer → fs.createWriteStream()
```

Uses Node.js `pipeline()` — true streaming, zero memory buffering. Audio flows directly from Discord through OGG encoding to disk. This is the correct pattern.

Output: **OGG/Opus, 48kHz stereo** — exactly what we want. The Opus frames from Discord are wrapped in an OGG container without transcoding. Bit-perfect passthrough.

#### The critical problem: fragmented files

```typescript
end: {
    behavior: EndBehaviorType.AfterSilence,
    duration: 100,  // 100ms of silence = new file
}
```

Every **100ms pause** ends the stream and closes the file. A new file is created the next time the user speaks. A user talking for 20 minutes with natural pauses generates **dozens of small OGG files**, not one continuous track.

Filename: `{timestamp}-{username}.ogg` — the timestamp is the only timing reference. No recording-start metadata, no embedded timing, no session concept.

**This makes timeline reconstruction extremely difficult** and is fundamentally incompatible with our pipeline, which expects one continuous track per speaker aligned to a common start time.

#### Silence handling

**None.** Silence ends the stream. Gaps between speech are simply lost — no silence padding, no gap tracking, no timing metadata. This is the opposite of what Craig (and our pipeline) does.

#### What we'd need to change to use it

| Change | Effort |
|--------|--------|
| Continuous recording instead of per-utterance files | **Redesign core** — keep streams open, pad silence |
| Session management (start/stop, metadata) | Write from scratch |
| `session_metadata.json` output | Write from scratch |
| Record all users automatically (not manual `/record @user`) | Moderate refactor |
| DAVE support | Needs `@snazzah/davey` integration |
| Update from discord.js v13 to v14 | API changes throughout |
| Docker support | Write from scratch |

#### Verdict

**Not suitable as a foundation either**, but for different reasons than Kirdock. The streaming-to-disk approach and OGG/Opus passthrough are exactly right — this is the pattern we want. But the per-utterance fragmentation makes it unusable as-is, and the archived/outdated status means we'd be building on abandoned code.

**However**: The `createListeningStream.ts` file is the **canonical example** of how to use `receiver.subscribe()` → `prism.opus.OggLogicalBitstream` → `fs.createWriteStream()`. This 35-line file is the best reference for our OGG muxing pipeline. We should use this exact streaming pattern but keep the stream open for the entire session instead of closing it after 100ms of silence.

---

### c) Comparison

| Aspect | Kirdock | discord.js Example | What we need |
|--------|---------|-------------------|-------------|
| **Architecture** | Library (no bot) | Standalone bot | Standalone bot |
| **Recording model** | Replay buffer (last N min) | Per-utterance files | Continuous session |
| **Storage** | In-memory only | Streaming to disk | Streaming to disk |
| **Output format** | MP3 (lossy, transcoded) | OGG/Opus (passthrough) | OGG/Opus (passthrough) |
| **Sample rate** | 16kHz default | 48kHz | 48kHz |
| **Silence handling** | Gap detection + padding | None (ends stream) | Continuous padding |
| **Track sync** | Common start time alignment | None | Common start time |
| **Session metadata** | None | None | `session_metadata.json` |
| **Slash commands** | None | 3 basic | `/record start/stop` |
| **DAVE support** | Unknown | No (archived pre-DAVE) | Required (March 2026) |
| **Docker** | No | No | Yes |
| **discord.js version** | Any (library) | v13 (outdated) | v14 (current) |
| **Maintenance** | Light (last: Jul 2024) | Archived (Jul 2023) | Active |

### d) Recommendation: Build from scratch, reference both

Neither project is a viable starting point to fork or use as a dependency. Both would require rewriting their core functionality. But both offer valuable code to reference:

**From Kirdock — steal the sync algorithm:**
- `replay-readable.utils.ts`: `addSilentTime()` and `syncStream()` — the cleanest example of per-user silence gap detection and padding we've found
- `getMinStartTime()` — common timeline alignment across users
- The timestamped chunk model (`{chunk, startTime, stopTime}`) is a good pattern even if we stream to disk instead of buffering

**From the discord.js example — steal the streaming pipeline:**
- `createListeningStream.ts`: `receiver.subscribe()` → `prism.opus.OggLogicalBitstream` → `createWriteStream()` — the canonical OGG/Opus passthrough pattern
- This is literally the 35-line core of our recording pipeline
- We just need to keep the stream open (use `EndBehaviorType.Manual` instead of `AfterSilence`) and handle silence ourselves

**Our bot architecture (combining the best of both):**

```
receiver.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
    │
    ▼
Per-user Opus stream (stays open for entire session)
    │
    ├── Opus packet received? → pipe to OGG muxer → stream to disk
    │
    └── Silence gap detected? → insert silent Opus frames into OGG stream
                                 (or handle in post-processing via timestamps)
    │
    ▼
On stop: close all streams, finalize OGG files, write session_metadata.json
```

This approach:
- Uses the discord.js example's streaming-to-disk pattern (memory-safe)
- Uses the discord.js example's OGG/Opus passthrough (no transcoding)
- Applies Kirdock's sync concept (common start time, gap detection)
- But streams continuously to disk instead of buffering in memory
- Produces exactly the output format our pipeline expects

**Estimated scope**: ~600-800 lines of TypeScript for the core recorder + bot logic. This is a focused, single-purpose service — there's no reason to take on the baggage of either existing project when neither solves our actual problem.

---

## Sources

### Discord voice recording libraries
- [discord.js VoiceReceiver API docs](https://discord.js.org/docs/packages/voice/main/VoiceReceiver:Class)
- [@discordjs/voice npm package](https://www.npmjs.com/package/@discordjs/voice)
- [discord.js voice receive guide (v12)](https://v12.discordjs.guide/voice/receiving-audio.html)
- [Pycord voice receiving guide](https://guide.pycord.dev/voice/receiving)
- [discord-ext-voice-recv (PyPI)](https://pypi.org/project/discord-ext-voice-recv/)
- [discord.py voice receive PR #6507](https://github.com/Rapptz/discord.py/pull/6507)

### DAVE protocol
- [Discord DAVE Protocol Whitepaper](https://daveprotocol.com/)
- [Discord blog: Bringing DAVE to All Platforms](https://discord.com/blog/bringing-dave-to-all-discord-platforms)
- [@snazzah/davey npm package](https://www.npmjs.com/package/@snazzah/davey)
- [discord.py DAVE PR #10300](https://github.com/Rapptz/discord.py/pull/10300)
- [EFF: Strong E2EE Comes to Discord Calls](https://www.eff.org/deeplinks/2024/09/discords-end-end-encryption-voice-and-video-step-forward-privacy-all)

### Craig bot & alternatives
- [Craig bot official site](https://craig.chat/)
- [Craig source code (GitHub)](https://github.com/CraigChat/craig)
- [Craig self-hosting guide](https://github.com/CraigChat/craig/blob/master/SELFHOST.md)
- [Pandora — Craig fork (GitHub)](https://github.com/SoTrxII/Pandora)
- [Kirdock/discordjs-voice-recorder](https://github.com/Kirdock/discordjs-voice-recorder)
- [chebro/discord-voice-recorder](https://github.com/chebro/discord-voice-recorder)

### Discord voice protocol
- [Discord voice connections documentation](https://github.com/meew0/discord-api-docs-1/blob/master/docs/topics/VOICE_CONNECTIONS.md)
- [discord.js understanding voice guide](https://v12.discordjs.guide/voice/understanding-voice.html)
- [discord.js voice memory leak fix (PR #5609)](https://github.com/discordjs/discord.js/commit/2eac84296b448907213680690ec766bb5fbe5990)

### Known issues
- [AudioResource memory leak (Issue #164)](https://github.com/discordjs/voice/issues/164)
- [VoiceReceiver intermittent (Issue #5209)](https://github.com/discordjs/discord.js/issues/5209)
- [Stream ERR_STREAM_PUSH_AFTER_EOF (Issue #8778)](https://github.com/discordjs/discord.js/issues/8778)
- [Pycord sink streaming issues (Issue #2043)](https://github.com/Pycord-Development/pycord/issues/2043)
