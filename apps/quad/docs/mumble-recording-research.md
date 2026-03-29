# Mumble Recording Bot — Research Document

> Research for building a per-speaker voice recording module for Mumble,
> companion to quad's existing Discord recording module.
>
> Date: 2026-02-27

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mumble Audio Protocol](#2-mumble-audio-protocol)
3. [Opus Passthrough Feasibility](#3-opus-passthrough-feasibility)
4. [Client Library Comparison](#4-client-library-comparison)
5. [Murmur Admin API](#5-murmur-admin-api)
6. [Architecture Recommendation](#6-architecture-recommendation)
7. [Output Contract Compatibility](#7-output-contract-compatibility)
8. [Risks and Unknowns](#8-risks-and-unknowns)
9. [Proposed Module Structure](#9-proposed-module-structure)

---

## 1. Executive Summary

**Goal**: A bot that sits in a Mumble channel, captures per-speaker audio as
continuous OGG/Opus files, and produces output identical to the Discord
recording module — feeding directly into the existing processing pipeline.

**Key findings**:

- **Opus passthrough is feasible** — Mumble sends raw Opus frames in voice
  packets. We can wrap them in OGG without decoding. Only difference:
  Mumble = mono (1ch), Discord = stereo (2ch). Pipeline doesn't care.
- **No DAVE problems** — Unlike Discord's E2EE (which causes corruption on
  key rotation), Mumble's server-side OCB-AES128 encryption means the bot
  always gets clean, decrypted Opus frames. The Harvarligan corruption
  incident *cannot* happen on Mumble.
- **No mature Node.js library exists** — The JavaScript Mumble ecosystem is
  fragmented and mostly dead. Best option is NoodleJS (active, has raw
  Opus access) but zero users and no TypeScript.
- **Recommended approach**: Build a minimal Mumble protocol client in
  TypeScript inside quad (`src/modules/mumble-recording/`). The protocol
  is well-documented and we only need the receive path. Use
  `@tf2pickup-org/mumble-client` (active, TypeScript, 1.2k downloads/week)
  for the control plane, and implement voice receive ourselves.
- **gRPC is dead** — Removed from Mumble 1.5.517. ICE is the only admin
  API. For channel/user management, either use ICE via Python sidecar or
  use the Mumble protocol directly.

---

## 2. Mumble Audio Protocol

### Architecture

Mumble uses a dual-channel design:

| Channel | Purpose | Encryption |
|---------|---------|------------|
| TCP (TLS) | Control: auth, user state, channel mgmt, codec negotiation | TLS AES256-SHA |
| UDP | Voice: low-latency audio packets | OCB-AES128 |

UDP falls back to TCP tunneling when blocked. For our setup (bot on same
Docker network as Murmur), UDP is always available with ~0.1ms latency.

### Voice Packet Format

Our Murmur is 1.5.857, which supports the **new protobuf-based UDP format**
(`MumbleUDP.proto`):

```protobuf
message Audio {
  oneof header {
    uint32 target = 1;         // Client→server: 0=normal, 31=loopback
    uint32 context = 2;        // Server→client: normal/shout/whisper/listener
  }
  uint32 sender_session = 3;   // Which user is speaking
  uint64 frame_number = 4;     // Sequence number
  bytes opus_data = 5;         // Raw Opus frame (THE PAYLOAD WE WANT)
  bytes positional_data = 6;   // Optional 3D position
  float volume_adjustment = 7; // Server gain
  bool is_terminator = 8;      // End-of-transmission flag
}
```

**Legacy format** (pre-1.5) uses a custom binary encoding with varint
fields. Both formats carry the same data. Server transparently translates
between formats based on client version.

### Per-User Identification

Every connected user gets a **session ID** (uint32) assigned during auth.
This ID appears directly in `sender_session` of voice packets — simpler
than Discord's SSRC mapping:

| Aspect | Discord | Mumble |
|--------|---------|--------|
| User ID in audio | SSRC (must map via SPEAKING event) | session_id (direct) |
| Mapping source | Gateway SPEAKING event | TCP UserState protobuf |
| Stability | SSRC can change (renegotiation) | Stable for connection lifetime |

### Codec Parameters

Mumble Opus encoding (from `AudioInput.cpp`):

| Parameter | Value |
|-----------|-------|
| Sample rate | 48,000 Hz |
| **Channels** | **1 (mono)** |
| Application | VOIP/AUDIO/LOW_DELAY (depends on bitrate) |
| VBR | Disabled (CBR) |
| Bitrate | Configurable, up to 128 kbps |
| Frame size | 10ms base (default: 20ms per packet) |

### End-of-Transmission Signal

Mumble has an **explicit termination bit** — when a user stops speaking,
the last voice packet has `is_terminator = true`. Discord has no equivalent;
packets just stop arriving. This gives us a cleaner signal for silence
gap detection.

### Silence Behavior

When a user stops speaking, no more voice packets arrive (same as Discord).
After ~5 seconds of silence, the sequence number resets. Our silence-padding
approach (20ms timer + silent Opus frames) works identically.

---

## 3. Opus Passthrough Feasibility

### YES — Direct passthrough works

The `opus_data` field in Mumble voice packets contains raw Opus frames.
We can extract them and wrap in OGG containers without decoding, exactly
like we do with Discord:

```typescript
// Discord (current) — stereo
new prism.opus.OggLogicalBitstream({
  opusHead: new prism.opus.OpusHead({
    channelCount: 2,      // Discord is stereo
    sampleRate: 48000,
  }),
  pageSizeControl: { maxPackets: 10 },
  crc: true,
});

// Mumble (new) — mono
new prism.opus.OggLogicalBitstream({
  opusHead: new prism.opus.OpusHead({
    channelCount: 1,      // Mumble is mono
    sampleRate: 48000,
  }),
  pageSizeControl: { maxPackets: 10 },
  crc: true,
});
```

### Mono vs Stereo Impact

| Concern | Impact |
|---------|--------|
| OGG container | Just set `channelCount: 1` in OpusHead |
| ffmpeg/processing | Reads channel count from OGG header, transparent |
| faster-whisper | Converts to mono internally anyway |
| Voice replay player | Web Audio API handles mono transparently |
| File size | ~50% smaller: ~2.5-4 MB/hr/speaker (vs ~5-8 MB Discord) |
| Silent frame | Same `0xF8 0xFF 0xFE` — mono-coded, works for both |

### Variable Frame Duration

Users can configure "Audio per packet" to 10/20/40/60ms. OGG handles
variable frame sizes. For our server we can standardize on 20ms. The
prism-media muxer should handle this since it writes pages by packet
count, not time.

---

## 4. Client Library Comparison

### Summary Table

| Library | Lang | Stars | Last Activity | Audio Recv | Opus Passthrough | UDP | Maintained |
|---------|------|-------|---------------|------------|-----------------|-----|------------|
| **NoodleJS** | JS | 37 | Feb 2026 | Yes | Partial (has encoded frames) | Yes (native OCB2) | Active |
| pymumble (azlux) | Python | 139 | May 2024 | Yes | No (decodes to PCM) | TCP only | Semi |
| pymumble (oopsbagel) | Python | fork | Sep 2025 | Yes | No (decodes to PCM) | Yes (UDP) | Active |
| gumble | Go | 177 | Mar 2023 | Yes | No (decodes to int16) | Yes | Dormant |
| node-mumble | JS | 156 | Oct 2021 | Yes | No (decodes to PCM) | TCP only | **Dead** |
| mumble-client | JS | 29 | May 2022 | Yes | No (decodes to float32) | TCP only | **Dead** |
| **@tf2pickup-org/mumble-client** | **TS** | 9 | **Feb 2026** | **No (admin only)** | N/A | N/A | **Active** |
| node-grumble | TS | 3 | Dec 2020 | Unknown | Unknown | Unknown | **Dead** |

### Detailed Assessment

#### NoodleJS (Gielert/NoodleJS) — Best Node.js option for audio

- **GitHub**: 37 stars, 14 forks, pushed **2026-02-26** (yesterday)
- **npm**: `noodle-js`, 0 downloads/week (unused)
- **Audio format**: Emits BOTH encoded Opus frames AND decoded PCM
- **UDP**: Real encrypted UDP with native C++ OCB2 crypto (node-gyp)
- **TypeScript**: None (plain JavaScript)
- **Risk**: Zero npm users = zero battle-testing. Native C++ build.

#### @tf2pickup-org/mumble-client — Best for control plane

- **GitHub**: 9 stars, pushed **2026-02-27** (today)
- **npm**: 1,179 downloads/week (highest of all)
- **TypeScript**: Native, well-typed
- **Purpose**: Server administration only (channels, users, permissions)
- **Audio**: NONE — does not handle voice at all
- **Value**: Manage channels/users, then implement voice receive separately

#### pymumble (azlux + oopsbagel fork)

- Most mature per-user audio receive (SoundQueue per user)
- Python = separate process/container
- No Opus passthrough (decodes to PCM)
- oopsbagel v2.0 has UDP support for modern protocol

#### gumble (Go)

- Cleanest per-user audio architecture (`AudioListener` interface)
- Full UDP support, well-tested
- Go = separate binary, different language
- Dormant since 2023 but not abandoned

### Key Finding: No Library Does Opus Passthrough

**Every library decodes Opus to PCM before delivering to the user.**
NoodleJS is the closest (exposes encoded frames alongside decoded), but
for clean passthrough we'd need to intercept at the protocol layer
regardless. This makes a custom implementation more attractive.

---

## 5. Murmur Admin API

### gRPC: REMOVED (Not Available)

gRPC was removed from Mumble in **1.5.517 RC**. Our Murmur 1.5.857 does
not have it. It was buggy, caused segfaults, and was never stable.

### ICE: The Only Official Admin API

ZeroC ICE endpoint, defined in `MumbleServer.ice` Slice file. Provides
complete server control:

#### Available Operations

| Category | Methods | What They Do |
|----------|---------|--------------|
| **Channels** | `addChannel`, `removeChannel`, `setChannelState`, `getChannels` | Create/delete/modify channels, set descriptions |
| **Users (connected)** | `getUsers`, `getState`, `setState`, `kickUser` | Query who's online, move users, mute/deafen, kick |
| **Users (registered)** | `registerUser`, `unregisterUser`, `updateRegistration`, `getRegisteredUsers`, `verifyPassword` | Create accounts, authenticate |
| **ACLs** | `getACL`, `setACL`, `addUserToGroup`, `removeUserFromGroup`, `hasPermission` | Full permission management |
| **Bans** | `getBans`, `setBans` | IP ban management |
| **Config** | `getConf`, `setConf`, `setSuperuserPassword` | Server configuration |
| **Events** | `addCallback`, `removeCallback` | User join/leave, channel changes |

#### Enabling ICE in Docker

Add to `docker-compose.yml` mumble service:
```yaml
environment:
  MUMBLE_CONFIG_ICE: "tcp -h 0.0.0.0 -p 6502"
  MUMBLE_CONFIG_ICESECRETWRITE: "${MUMBLE_ICE_SECRET}"
```

Keep port 6502 internal to Docker network (don't expose to host).
Quad reaches Mumble at `mumble:6502` via Docker DNS.

#### Node.js ICE Client

ZeroC provides the `ice` npm package (v3.7.100). Workflow:
1. Get `MumbleServer.ice` Slice file from Mumble repo
2. Compile with `slice2js` to generate JavaScript stubs
3. Connect via `ice` package to `mumble:6502`

**Concerns**: Large dependency, no TypeScript types, JavaScript TCP
support is less tested than Python's.

#### Alternative: Python ICE sidecar

A small Python service using ZeroC ICE (well-tested, used by MuMo and
Alliance Auth) that exposes a simple HTTP API for quad to call. This is
the officially-supported approach in the Mumble ecosystem.

#### Alternative: Skip ICE entirely

For basic operations (create channels, move users), the Mumble protocol
client approach works too — a bot with admin permissions can do channel
management via the protocol itself.

---

## 6. Architecture Recommendation

### Recommended: Option A — TypeScript module inside quad

Build `src/modules/mumble-recording/` using:

1. **@tf2pickup-org/mumble-client** for the control plane (auth, channel
   management, user state tracking, ACLs)
2. **Custom voice receive layer** that intercepts raw Opus frames from
   the Mumble protocol before any decoding
3. **Existing prism-media OGG muxer** for wrapping Opus → OGG (same as
   Discord, just `channelCount: 1`)
4. **Existing UserTrack/silence patterns** adapted for Mumble

#### Why this approach

| Factor | Assessment |
|--------|-----------|
| **Library maturity** | @tf2pickup-org is the only actively maintained TS Mumble lib (1.2k/week npm). For voice: protocol is well-documented, custom receive is ~200 lines |
| **Opus passthrough** | No library does this. Custom implementation is required regardless of language choice. Writing 200 lines of protocol parsing in TS is simpler than managing a Python sidecar |
| **Maintainability** | Same codebase, same patterns, same CI. One docker-compose service |
| **Docker deployment** | No additional containers. Same Dockerfile |
| **Existing patterns** | `UserTrack` (silence padding, OGG muxing), `RecordingSession` (lifecycle), `writeSessionMetadata` — all reusable with minor adaptation |

#### Why NOT other options

| Option | Rejection Reason |
|--------|-----------------|
| **B) Python pymumble sidecar** | Adds IPC complexity, another container, Python dependency for something that's 200 lines of protocol parsing. pymumble doesn't do Opus passthrough anyway — we'd decode to PCM then re-encode, defeating the purpose |
| **C) Go gumble sidecar** | Same IPC overhead. Go binary in a Docker image adds build complexity. gumble is dormant since 2023 |
| **D) NoodleJS** | Zero npm users, no TypeScript, native C++ build dependency. "Active" but untested. Risky foundation for production |
| **E) Fork node-mumble** | Dead since 2021, native deps broken on Node 22, TCP-only |

### Channel/User Management

For the admin API (auto-creating team channels, registering users, ACLs):

**Phase 1**: Use `@tf2pickup-org/mumble-client` for basic operations
(it handles channels, users, move, mute/deafen, permissions).

**Phase 2 (if needed)**: Enable ICE for operations that require server-level
access (registering users with passwords, complex ACL management). Use
the `ice` npm package directly or a lightweight Python ICE sidecar.

Most of the Mumble admin needs can be handled via the protocol client
approach. ICE is only needed for operations like `registerUser` with
credentials, which can be deferred.

---

## 7. Output Contract Compatibility

The Mumble recording module must produce output identical to Discord's.
The processing pipeline (`pipeline.ts`) is source-agnostic — it reads
`session_metadata.json` and per-speaker OGG files.

### session_metadata.json Changes

```json
{
  "schema_version": 1,
  "source": "quad-mumble",
  "source_version": "1.0.0",
  "recording_start_time": "2026-02-27T20:00:00.000Z",
  "recording_end_time": "2026-02-27T22:15:00.000Z",
  "recording_id": "uuid-here",
  "guild": null,
  "channel": { "id": "42", "name": "Team Practice" },
  "team": { "tag": "]sr[", "name": "Slackers" },
  "mumble_server": { "host": "83.172.66.214", "port": 64738 },
  "tracks": [
    {
      "track_number": 1,
      "mumble_session_id": 7,
      "mumble_username": "ParadokS",
      "discord_user_id": null,
      "discord_username": null,
      "joined_at": "2026-02-27T20:00:00.000Z",
      "left_at": "2026-02-27T22:15:00.000Z",
      "audio_file": "1-ParadokS.ogg"
    }
  ]
}
```

**Changes from Discord format**:
- `source`: `"quad-mumble"` (distinguishes from Discord `"quad"`)
- `guild`: `null` (Mumble has no guild concept; could be omitted)
- `channel.id`: Mumble channel ID (integer as string)
- `mumble_server`: New field with server connection info
- `tracks[].mumble_session_id`: Mumble session ID
- `tracks[].mumble_username`: Mumble display name
- `tracks[].discord_user_id/username`: null unless linked

**Processing pipeline impact**: The pipeline reads `session_metadata.json`
and cares about: `recording_start_time`, `recording_end_time`, `team.tag`,
`tracks[].audio_file`, `tracks[].joined_at/left_at`. All other fields
are metadata. The `guild.id` is used for registration lookup — for Mumble
recordings, this lookup would fall back to team tag from config.

### Audio File Format

| Property | Discord (current) | Mumble (new) |
|----------|-------------------|--------------|
| Container | OGG | OGG |
| Codec | Opus passthrough | Opus passthrough |
| Sample rate | 48kHz | 48kHz |
| **Channels** | **2 (stereo)** | **1 (mono)** |
| Bitrate | ~96 kbps | Up to 128 kbps CBR |
| Frame duration | 20ms | 20ms (configurable) |
| Size/hr/speaker | ~5-8 MB | ~2.5-4 MB |
| Silent frame | `0xF8 0xFF 0xFE` | `0xF8 0xFF 0xFE` (same) |

The only difference is channel count. All downstream tools handle this
transparently.

### Directory Structure (unchanged)

```
recordings/{sessionId}/
├── session_metadata.json
├── 1-ParadokS.ogg
├── 2-Razor.ogg
├── 3-zero.ogg
└── 4-grisling.ogg
```

---

## 8. Risks and Unknowns

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **@tf2pickup-org/mumble-client doesn't support voice receive** | Must implement voice protocol parsing ourselves | Protocol is documented; voice receive is ~200 lines. Can also reference NoodleJS and node-mumble source |
| **prism-media OGG muxer issues with mono Opus** | Can't write OGG files | Test early. Fallback: pipe through ffmpeg (`-c copy`) |
| **Mumble protocol version mismatch** | Can't connect to Murmur 1.5.857 | @tf2pickup-org/mumble-client is tested against 1.5.x. For voice: use legacy format (simpler) as fallback |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Variable frame duration across clients** | Some users' audio may have 10ms or 40ms frames | Server can enforce 20ms. OGG handles variable frames. Test with non-default settings |
| **UDP encryption (OCB-AES128)** | Need to decrypt voice packets ourselves | @tf2pickup-org may handle this. If not, OCB2 implementation exists in NoodleJS source (native C++) and in pymumble (Python). Can also use TCP tunneling (no UDP crypto needed) |
| **Player name resolution** | Mumble usernames ≠ QW player names | Same problem as Discord. Reuse existing `knownPlayers` mapping from bot registration |
| **Pipeline guild lookup fails** | Processing pipeline uses `guild.id` for registration | Add Mumble-aware fallback: use team tag from config or a new `mumble_server_id` field in registration |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **TCP tunneling fallback** | Voice falls back to TCP | Same server = UDP always available. TCP fallback is simpler anyway (no crypto) |
| **Multiple Mumble servers** | Bot needs to connect to different servers | Start with single server. Can add multi-server later |
| **Recording permission** | Mumble has a "recording" flag | `ALLOWRECORDING=true` already set in docker-compose |

### Open Questions

1. **How does the bot know when to start/stop recording?**
   - Option A: Always recording when users are in a channel (auto)
   - Option B: Discord `/record` command triggers Mumble recording too
   - Option C: Mumble text command (`!record start`)
   - Recommend: Option A (auto-record when ≥2 users in channel)

2. **User identity linking (Mumble ↔ Discord)**
   - Mumble usernames need to map to QW player names for the pipeline
   - Could use the existing `knownPlayers` mapping (Discord→QW) extended
     with Mumble→QW entries
   - Or: require Mumble users to register with their QW name

3. **Which channels to record?**
   - Record all channels? Only specific "practice" channels?
   - Could use channel naming convention (e.g., channels under "Recording")

---

## 9. Proposed Module Structure

```
src/modules/mumble-recording/
├── index.ts                    # BotModule: registers events, lifecycle
├── client.ts                   # Mumble connection management
│                                 Uses @tf2pickup-org/mumble-client for control plane
│                                 Custom UDP voice receive for audio capture
├── voice-receiver.ts           # Voice packet parser + per-user Opus stream
│                                 Parses protobuf Audio messages
│                                 Extracts sender_session + opus_data
│                                 Routes to per-user tracks
├── session.ts                  # MumbleRecordingSession (adapts RecordingSession pattern)
│                                 Manages per-user tracks, start/stop, metadata
├── track.ts                    # MumbleUserTrack (adapts UserTrack for mono Opus)
│                                 OGG/Opus muxer with channelCount=1
│                                 Same silence padding strategy
├── metadata.ts                 # session_metadata.json writer (Mumble-specific fields)
├── auto-record.ts              # Auto-start recording when users join channel
│                                 Auto-stop when channel empties
└── channel-manager.ts          # Channel creation/ACL management (Phase 2)
                                  Auto-create team channels from registration data
```

### Shared with Discord recording module

These files are reused as-is or with minor adaptation:

| File | Reuse Strategy |
|------|---------------|
| `recording/silence.ts` | As-is — same silent Opus frame |
| `processing/pipeline.ts` | As-is — reads session_metadata.json |
| `processing/stages/*` | As-is — operates on OGG files |
| `core/logger.ts` | As-is |
| `core/config.ts` | Extend with Mumble config vars |

### New Dependencies

| Package | Purpose |
|---------|---------|
| `@tf2pickup-org/mumble-client` | Mumble control plane (auth, channels, users) |
| `protobufjs` | Parse MumbleUDP.proto voice packets |

### New Config (.env)

```env
MUMBLE_HOST=mumble              # Docker service name or IP
MUMBLE_PORT=64738               # Default Mumble port
MUMBLE_USERNAME=QuadRecorder    # Bot's Mumble username
MUMBLE_PASSWORD=                # Server password (if set)
MUMBLE_RECORD_CHANNELS=         # Channel IDs or names to monitor (comma-separated, empty=all)
MUMBLE_AUTO_RECORD=true         # Auto-record when users present
```

### Implementation Phases (Suggested)

1. **M1: Connect + Receive** — Bot connects to Mumble, joins a channel,
   receives and parses voice packets, logs per-user audio events
2. **M2: Record to OGG** — Per-user OGG files with Opus passthrough,
   silence padding, session_metadata.json
3. **M3: Pipeline Integration** — Verify processing pipeline works on
   Mumble recordings (match pairing, audio splitting, upload)
4. **M4: Auto-Record** — Automatic start/stop based on channel occupancy
5. **M5: Channel Management** — Auto-create team channels, ACLs (requires
   ICE or protocol-level admin)

---

## Appendix: Key References

### Mumble Protocol

- [Protocol docs (GitHub)](https://github.com/mumble-voip/mumble/tree/master/docs/dev/network-protocol)
- [Mumble.proto (control)](https://github.com/mumble-voip/mumble/blob/master/src/Mumble.proto)
- [MumbleUDP.proto (voice)](https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md)
- [AudioInput.cpp (Opus params)](https://github.com/mumble-voip/mumble/blob/master/src/mumble/AudioInput.cpp)
- [rust-mumble-protocol](https://github.com/Johni0702/rust-mumble-protocol) — clean reference implementation

### Libraries

- [@tf2pickup-org/mumble-client](https://github.com/tf2pickup-org/mumble-client) — TypeScript, active, admin-only
- [NoodleJS](https://github.com/Gielert/NoodleJS) — JavaScript, active, has audio receive + raw Opus
- [pymumble (azlux)](https://github.com/azlux/pymumble) — Python, most mature audio receive
- [pymumble (oopsbagel)](https://sr.ht/~oopsbagel/pymumble/) — Python, modern protocol (UDP)
- [gumble](https://github.com/layeh/gumble) — Go, cleanest per-user audio architecture
- [node-mumble](https://github.com/Rantanen/node-mumble) — JavaScript, dead but has audio receive code
- [mumble-client](https://github.com/Johni0702/mumble-client) — JavaScript, dead but elegant architecture

### Admin API

- [MumbleServer.ice (Slice definition)](https://github.com/mumble-voip/mumble/blob/master/src/murmur/MumbleServer.ice)
- [ICE setup guide](https://www.mumble.info/documentation/mumble-server/scripting/ice/server-setup/)
- [MuMo (Mumble Moderator)](https://github.com/mumble-voip/mumo) — official Python ICE plugin framework
- [murmur-rest](https://github.com/alfg/murmur-rest) — Python REST wrapper (unmaintained)

### Existing Recording Bots

- [mumblerecbot](https://github.com/Robert904/mumblerecbot) — Python/pymumble, proves per-user recording works
- [mumble-bot](https://github.com/Prior99/mumble-bot) — TypeScript, recording + classification (dead)
- [lua-mumble](https://github.com/bkacjios/lua-mumble) — Lua, best docs for per-user audio events

### Quad's Existing Architecture (for reference)

- `src/modules/recording/track.ts` — Per-user OGG/Opus writer with silence padding
- `src/modules/recording/session.ts` — Recording lifecycle management
- `src/modules/recording/metadata.ts` — session_metadata.json writer
- `src/modules/recording/silence.ts` — Silent Opus frame constant
- `src/modules/processing/pipeline.ts` — Processing pipeline entry point
- `src/modules/processing/types.ts` — SessionMetadata, SessionTrack interfaces
