---
paths:
  - "src/modules/recording/**"
---

# Recording Module — Technical Reference

## Recording Flow

```
Discord voice channel (per-user Opus streams over UDP)
    |
@discordjs/voice decrypts + demuxes (per-user SSRC)
    |
receiver.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
    |
Per-user Opus stream (stays open for entire session)
    |
    +-- Opus packet -> prism-media OggLogicalBitstream -> fs.createWriteStream()
    |                  (no transcoding — Opus passthrough into OGG container)
    |
    +-- Silence gap -> insert silent Opus frames
    |
On stop: close all streams, finalize OGG files, write session_metadata.json
```

## Core Recording Pattern

```typescript
const opusStream = receiver.subscribe(userId, {
  end: { behavior: EndBehaviorType.Manual },
});
const oggStream = new prism.opus.OggLogicalBitstream({
  opusHead: new prism.opus.OpusHead({
    channelCount: 2,
    sampleRate: 48000,
  }),
  pageSizeControl: { maxPackets: 10 },
  crc: true,
});
pipeline(opusStream, oggStream, fs.createWriteStream(filename));
```

## Silence Handling

When a user is not speaking, Discord sends no packets. The bot handles this by inserting pre-computed silent Opus frames on a 20ms timer. Result: continuous OGG files with natural silence, perfectly synchronized.

Reference: Kirdock's `replay-readable.utils.ts` has clean silence gap detection (`addSilentTime()`, `syncStream()`).

## Track Synchronization

All tracks aligned to a common recording start time:
- `recording_start_time`: ISO 8601 UTC with millisecond precision
- Each user's OGG file starts at recording start (silence-padded if they joined late)
- Each user's OGG file ends at recording stop

## Output Format

### Directory structure
```
recordings/{session_id}/
├── session_metadata.json
├── 1-{username}.ogg
├── 2-{username}.ogg
└── ...
```

### session_metadata.json — Public Contract
Schema version must be bumped for any changes. See `docs/session_metadata_schema.json` for full spec.

Key fields: `schema_version`, `recording_start_time`/`recording_end_time` (UTC, ms precision), `recording_id` (ULID), `source` ("quad"), `team.tag`, `tracks[].joined_at/left_at`, `tracks[].audio_file`.

### Audio file properties
| Property | Value |
|----------|-------|
| Container | OGG |
| Codec | Opus (passthrough from Discord) |
| Sample rate | 48000 Hz |
| Channels | 2 (stereo) |
| Bitrate | ~96 kbps |
| Size | ~5-8 MB/hour/speaker |

## OGG Muxing — prism-media v2

We use `prism-media@2.0.0-alpha.0` — "alpha" since ~2021 but de facto standard. v1.3.5 only has demuxers; the muxer (`OggLogicalBitstream`, `OpusHead`) is v2 only.

CRC checksums require `node-crc@^1.3.2` (must be v1, CJS — v3+ is ESM-only and breaks).

**Fallback options if prism-media v2 breaks:**
1. Custom OGG muxer (~100-150 lines) — guide: https://gist.github.com/amishshah/68548e803c3208566e36e55fe1618e1c
2. ffmpeg pipe — `spawn('ffmpeg', ['-f', 'opus', '-i', 'pipe:0', '-c', 'copy', 'output.ogg'])`
3. Raw capture + post-process — dump Opus packets with timestamps, mux later

## Reference Projects

### Tier 1 — Direct references
- **discord.js voice recorder example**: https://github.com/discordjs/voice-examples
- **Kirdock/discordjs-voice-recorder**: https://github.com/Kirdock/discordjs-voice-recorder — best for silence handling

### Tier 2 — Architectural reference
- **CraigChat/craig**: https://github.com/CraigChat/craig — gold standard output format
- **SoTrxII/Pandora**: https://github.com/SoTrxII/Pandora — good recording/processing separation

## DAVE Protocol

Discord Audio & Video E2E Encryption. Mandatory since March 1, 2026.
- `@snazzah/davey` bundled with `@discordjs/voice` 0.19.0 — handles DAVE transparently
- Bot developer doesn't interact with DAVE APIs directly
- Discord doesn't officially support bots receiving audio — discord.js team supports it "reasonably"
