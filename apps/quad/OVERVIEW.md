# Overview - Quad

Quad is a self-hosted Discord bot that records per-speaker voice comms during QuakeWorld matches, pairs them with match demos via UTC timestamp correlation, and uploads the result for synced playback on the MatchScheduler web app. It also serves as the community's Discord-side interface for match scheduling, availability, and standin coordination.

16 teams are connected. The bot runs as a single instance serving all registered guilds.

For why this project exists and where it is going, see `VISION.md`. For how to run it, see `DEVELOPMENT.md`. For production deployment, see `DEPLOYMENT.md`.

---

## Module inventory

All modules live under `src/modules/`. Each is self-contained and follows the `BotModule` interface defined in `src/core/module.ts`. Modules communicate via Firestore, not direct imports.

### recording

The core feature. Joins a voice channel, records per-speaker audio as OGG/Opus, writes `session_metadata.json` alongside the tracks.

| What | Where |
|---|---|
| Module entry + event wiring | `recording/index.ts` |
| `/record` command handler | `recording/commands/record.ts` |
| Session lifecycle (connection, tracks, shutdown) | `recording/session.ts` |
| Per-user audio track (Opus stream to OGG file) | `recording/track.ts` |
| Silence padding (20ms timer, late-join prepend) | `recording/silence.ts` |
| session_metadata.json writer | `recording/metadata.ts` |
| Auto-record trigger for Mumble | `recording/auto-record.ts` |
| Firestore session tracking (fire-and-forget) | `recording/firestore-tracker.ts` |
| Module-specific rules | `recording/CLAUDE.md` |

Key behaviors:
- Opus passthrough: no transcoding, raw frames go straight to OGG container
- Stream-to-disk: near-zero memory, safe for 3+ hour sessions
- One continuous file per speaker (`EndBehaviorType.Manual`)
- Late-join: silent frames prepended from session start to user join time
- Rejoin: `reattach()` swaps opus stream, silence timer keeps running
- Per-track error isolation: failed track is marked, others keep recording
- Firestore outages never fail recordings (fire-and-forget writes)

### processing

Automated pipeline that runs after recording. Two stages: fast (seconds, auto) and slow (hours, opt-in).

| What | Where |
|---|---|
| Module entry | `processing/index.ts` |
| `/process` command handler | `processing/commands/process.ts` |
| Pipeline orchestrator | `processing/pipeline.ts` |
| Firestore deletion handler | `processing/deletion-listener.ts` |

**Fast pipeline stages** (auto after recording):

| Stage | File | What it does |
|---|---|---|
| Hub client | `stages/hub-client.ts` | Queries QW Hub Supabase API for matches in the recording time window |
| Match pairer | `stages/match-pairer.ts` | Correlates recording timestamps with Hub matches, assigns confidence scores |
| Audio splitter | `stages/audio-splitter.ts` | ffmpeg stream-copy to slice per-speaker audio to match boundaries |
| Voice uploader | `stages/voice-uploader.ts` | Uploads sliced audio to Firebase Storage, writes Firestore manifest |

**Slow pipeline stages** (opt-in via `/process transcribe` or `/process analyze`):

| Stage | File | What it does |
|---|---|---|
| Transcriber | `stages/transcriber.ts` | Calls Python faster-whisper wrapper, re-segments by silence gaps |
| Timeline merger | `stages/timeline-merger.ts` | Merges transcripts with ktxstats into a unified timeline |
| Analyzer | `stages/analyzer.ts` | Claude API analysis using knowledge base context |

**Knowledge bases** (YAML, used by analyzer):

| File | Content |
|---|---|
| `knowledge/terminology/qw-glossary.yaml` | QuakeWorld terminology and abbreviations |
| `knowledge/maps/map-strategies.yaml` | Map-specific strategies and callouts |
| `knowledge/templates/map-report.yaml` | Analysis output template |

### standin

Firestore-driven standin player coordination. MatchScheduler creates standin requests, Quad delivers DMs and collects responses.

| What | Where |
|---|---|
| Module entry | `standin/index.ts` |
| Firebase Admin SDK init (shared) | `standin/firestore.ts` |
| Firestore listener for pending requests | `standin/listener.ts` |
| DM delivery | `standin/dm.ts` |
| Button interaction handlers | `standin/interactions.ts` |
| Type definitions | `standin/types.ts` |

### registration

Guild setup and team identity linking. `/register` connects a Discord server to a team in MatchScheduler.

| What | Where |
|---|---|
| Module entry | `registration/index.ts` |
| `/register` command handler | `registration/register.ts` |
| Roster sync (guild members to Firestore) | `registration/guild-sync.ts` |
| Disconnect listener | `registration/disconnect-listener.ts` |

### scheduler

Match scheduling notifications delivered to Discord channels.

| What | Where |
|---|---|
| Module entry | `scheduler/index.ts` |
| Firestore notifications listener | `scheduler/listener.ts` |
| Discord embed builders | `scheduler/embeds.ts` |
| Channel discovery + sync | `scheduler/channels.ts` |

Three notification types: `challenge_proposed`, `slot_confirmed`, `match_sealed`. See `SCHEDULER-MODULE-BRIEF.md` for the full spec.

### availability

Persistent Discord embed showing weekly team availability grids with real-time updates.

| What | Where |
|---|---|
| Module entry | `availability/index.ts` |
| Firestore listener | `availability/listener.ts` |
| Persistent embed management | `availability/message.ts` |
| Canvas grid renderer | `availability/renderer.ts` |
| Match card renderer | `availability/match-renderer.ts` |
| Discord embeds | `availability/embed.ts` |
| Button/select handlers | `availability/interactions.ts` |
| Time utilities | `availability/time.ts` |
| Discord-to-QW name resolver | `availability/user-resolver.ts` |
| Team logo cache | `availability/logo-cache.ts` |
| Type definitions | `availability/types.ts` |
| Unit tests | `availability/renderer.test.ts` |

Uses `@napi-rs/canvas` with Inter font for rendered grids.

### mumble

Mumble voice server integration. Auto-records when players join Mumble channels, manages users and permissions via ICE API.

| What | Where |
|---|---|
| Module entry | `mumble/index.ts` |
| Mumble connection + channel management | `mumble/mumble-manager.ts` |
| Recording session wrapper | `mumble/mumble-session.ts` |
| Per-user audio track | `mumble/mumble-track.ts` |
| Active session monitor | `mumble/session-monitor.ts` |
| User registration | `mumble/user-manager.ts` |
| Audio stream handling | `mumble/voice-receiver.ts` |
| Roster sync | `mumble/roster-sync.ts` |
| Auto-record trigger | `mumble/auto-record.ts` |
| Firestore config listener | `mumble/config-listener.ts` |
| ICE API client (Python sidecar) | `mumble/ice-client.ts` |
| Mumble session metadata | `mumble/mumble-metadata.ts` |

---

## Core infrastructure

| What | Where |
|---|---|
| Entry point | `src/index.ts` |
| Bot setup, event routing, command registration | `src/core/bot.ts` |
| Config loading (`Config`, `ProcessingConfig` interfaces) | `src/core/config.ts` |
| Structured logger | `src/core/logger.ts` |
| `BotModule` interface | `src/core/module.ts` |
| HTTP health endpoint (port 3000) | `src/core/health.ts` |
| Global session tracking | `src/shared/session-registry.ts` |

---

## Recording file structure on disk

```
recordings/
  {sessionId}/                    ULID, one dir per recording session
    session_metadata.json         public contract (schema v1)
    1-{username}.ogg              per-speaker audio, track-numbered
    2-{username}.ogg
    processed/                    created by processing pipeline
      {segment-id}/
        metadata.json             includes demoSha256 for Hub pairing
        audio/
          {discordUserId}.ogg     per-speaker sliced to match boundaries
```

The `session_metadata.json` schema is defined at `docs/session_metadata_schema.json`. Schema changes require a version bump.

---

## Scripts and utilities

| Script | Purpose |
|---|---|
| `scripts/transcribe.py` | Faster-whisper wrapper (called by transcriber stage) |
| `scripts/mumble-ice.py` | Mumble ICE sidecar (JSON-lines IPC with Node) |
| `scripts/MumbleServer.ice` | ICE interface definition |
| `scripts/test-fast-pipeline.ts` | Pipeline integration testing |
| `scripts/test-mumble.mjs` | Mumble connection testing |
| `scripts/backfill.mjs` | Recording backfill utility |
| `scripts/sample-fetch.mjs` | Hub API sample fetch |
| `scripts/check_durations.sh` | Audio duration verification |
| `scripts/list-channels.mjs` | Discord channel listing |

---

## Integration points

| System | Direction | What | Module |
|---|---|---|---|
| **MatchScheduler** (Firebase) | Read + Write | Session tracking, voice uploads, scheduling, availability, standin | All except recording core |
| **QW Hub** (Supabase API) | Read | Match history for timestamp-based pairing | processing |
| **d.quake.world** | Read | ktxstats JSON for matched demos | processing |
| **Discord** | Read + Write | Voice streams, slash commands, embeds, DMs, buttons | All |
| **Mumble** | Read + Write | Voice streams, channel/user management via ICE | mumble |
| **Claude API** | Write (request) | Match communication analysis | processing |
| **Firebase Storage** | Write | Sliced voice recordings for web playback | processing |

See `API_CONTRACTS.md` for the full boundary specification and `SCHEMA.md` for Firestore collection details.

---

## Parked features

### Newsletter
Research at `docs/newsletter-research/`. Community digest delivered to clan channels. Parked until slipgate web provides a destination for links. The idea is sound but premature without a community website.

### Voice replay research
Research at `docs/voice-replay/` and `docs/voice-sync-proposal.md`. The synced playback feature that came out of this research is fully operational -- recordings are uploaded and paired with demos for web playback. The research docs are historical.

### Multi-clan advanced features
Research at `docs/multi-clan/`. Basic multi-clan support (registration, recording, scheduling) is live. Advanced features like cross-clan roster conflict resolution are documented but not yet needed.

---

## What this doc does NOT cover

- **Why this project exists** -- see `VISION.md`
- **Production deployment** -- see `DEPLOYMENT.md`
- **Local dev setup** -- see `DEVELOPMENT.md`
- **Firestore collection schemas** -- see `SCHEMA.md`
- **External API boundaries** -- see `API_CONTRACTS.md`
- **Implementation phase history** -- see `PLAN.md`
- **Scheduler module design** -- see `SCHEDULER-MODULE-BRIEF.md`
