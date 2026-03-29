# Phase M5: Mumble Recording Bot — quad

## Context

M1-M4 established channel management, user registration, cert pinning, and roster sync. This phase builds the per-speaker audio recording bot that sits in Mumble channels and produces output compatible with the existing processing pipeline.

The recording bot research is at `docs/mumble-recording-research.md` — it covers the Mumble audio protocol, Opus passthrough feasibility, and library recommendations.

Read `docs/mumble/CONTRACT.md` for the cross-project contract.

---

## What This Phase Builds

1. **Voice receiver**: Parse Mumble voice packets, extract per-user raw Opus frames
2. **Per-speaker OGG writer**: Wrap Opus frames in OGG containers (mono, channelCount=1), with silence padding
3. **Recording session**: Manage lifecycle (start/stop, track users joining/leaving)
4. **Session metadata**: Write `session_metadata.json` matching the Discord recording format
5. **Auto-record**: Start recording when users join a team channel, stop when empty

---

## Architecture

The existing `@tf2pickup-org/mumble-client` (from M1) handles the control plane. For voice, we need a custom receive layer because no library does Opus passthrough.

### Mumble Audio Protocol (from research)

- Server sends voice packets via UDP (or TCP-tunneled)
- Each packet contains: `sender_session` (user ID) + `opus_data` (raw Opus frame)
- Mumble uses **mono Opus** (1 channel, 48kHz, 20ms frames)
- `is_terminator = true` signals end of speech (cleaner than Discord)
- Same silent Opus frame as Discord: `0xF8, 0xFF, 0xFE`

### Approach

Two options for receiving voice:

**Option A: Extend @tf2pickup-org/mumble-client with voice receive**
- The library handles TLS + UDP connection, auth, crypto
- Intercept voice packets at the protocol layer before any decoding
- Add an event emitter: `client.on('voice', (sessionId, opusFrame) => ...)`
- Requires understanding the library internals

**Option B: Custom UDP voice receiver alongside the control client**
- Use the control client for auth + session mapping (session ID → username)
- Implement a separate UDP socket for voice receive
- Handle OCB-AES128 decryption ourselves (or use TCP tunneling to skip crypto)
- More work but fully controlled

**Recommendation from research**: Start with Option A. If the library doesn't expose enough, fall back to Option B. TCP tunneling (no UDP crypto needed) is the simplest path for Option B since bot and server are on the same Docker network.

---

## Files to Create

### 1. `src/modules/mumble/voice-receiver.ts`

Receives and parses Mumble voice packets. Routes per-user Opus frames to tracks.

```typescript
// Key interface:

interface VoiceReceiver {
  // Called when a voice packet arrives
  onVoicePacket(senderSession: number, opusData: Buffer, isTerminator: boolean): void;

  // Map session ID → username (populated from control client user state)
  setSessionMap(sessionId: number, username: string, mumbleUserId: number): void;
  removeSession(sessionId: number): void;
}
```

The voice packet format (protobuf `Audio` message from research):
```protobuf
message Audio {
  uint32 sender_session = 3;   // Which user is speaking
  bytes opus_data = 5;          // Raw Opus frame (THE PAYLOAD)
  bool is_terminator = 8;       // End-of-transmission flag
}
```

### 2. `src/modules/mumble/mumble-track.ts`

Per-speaker OGG/Opus file writer. Adapts the existing Discord `UserTrack` pattern for mono Opus.

```typescript
// Reuse patterns from src/modules/recording/track.ts:
// - prism-media OggLogicalBitstream for OGG muxing
// - fs.createWriteStream for disk write
// - Silence padding timer (20ms intervals)

// Key difference from Discord UserTrack:
// - channelCount: 1 (mono) instead of 2 (stereo)
// - No DAVE packet validation needed (Mumble has no E2EE corruption)
// - is_terminator flag gives explicit speech end signal

import prism from 'prism-media';

const oggStream = new prism.opus.OggLogicalBitstream({
  opusHead: new prism.opus.OpusHead({
    channelCount: 1,        // MONO (Discord uses 2)
    sampleRate: 48000,
  }),
  pageSizeControl: { maxPackets: 10 },
  crc: true,
});
```

File naming: `{trackNumber}-{mumbleUsername}.ogg` (same pattern as Discord)

### 3. `src/modules/mumble/mumble-session.ts`

Recording session lifecycle. Adapts `src/modules/recording/session.ts`.

```typescript
// Key properties:
sessionId: string;              // ULID
outputDir: string;              // recordings/{sessionId}/
startTime: Date;
tracks: Map<number, MumbleTrack>;  // sessionId → track
teamId: string;                 // From mumbleConfig
teamTag: string;
channelId: number;
channelName: string;

// Lifecycle:
async init(): Promise<void>     // Create output dir
start(): void                   // Begin receiving voice
addUser(sessionId, username, mumbleUserId): MumbleTrack
removeUser(sessionId): void     // User left channel
async stop(): Promise<SessionSummary>  // Stop all tracks, write metadata
```

### 4. `src/modules/mumble/mumble-metadata.ts`

Writes `session_metadata.json` in the contract format.

```typescript
// Output format:
{
  schema_version: 1,
  source: "mumble",                    // NOT "quad" or "quad-mumble"
  source_version: "1.0.0",
  recording_start_time: ISO8601,
  recording_end_time: ISO8601,
  recording_id: sessionId,
  guild: null,                         // No guild concept in Mumble
  channel: { id: channelId, name: channelName },
  team: { tag: teamTag, name: teamName, teamId },
  mumble_server: { host, port },
  tracks: [{
    track_number: 1,
    mumble_session_id: number,
    mumble_username: string,           // = QW name (we registered them)
    discord_user_id: string | null,    // From user profile if linked
    discord_username: string | null,
    joined_at: ISO8601,
    left_at: ISO8601,
    audio_file: "1-ParadokS.ogg"
  }]
}
```

### 5. `src/modules/mumble/auto-record.ts`

Monitors team channels for user presence. Starts recording when users join, stops when empty.

```typescript
// Watch for user state changes on the Mumble client:
// - User joins a team channel → check if recording active → start if not
// - User leaves → check if channel empty → stop after idle timeout
// - Respect autoRecord setting from mumbleConfig

// Which channels to monitor:
// - Read all active mumbleConfig docs → get channelId list
// - Only record in team channels, not the root or "Teams" parent

// Idle timeout: same as Discord (30 minutes after last user leaves)

// On recording start:
// 1. Look up mumbleConfig for the channel → get team info
// 2. Create MumbleRecordingSession
// 3. Subscribe to voice packets for that channel

// On recording stop:
// 1. Stop session, write metadata
// 2. Trigger processing pipeline (same as Discord recording module)
```

---

## Integration with Processing Pipeline

After recording stops, trigger the existing processing pipeline:

```typescript
// Same pattern as src/modules/recording/index.ts onRecordingStop callback:
import { runFastPipeline } from '../processing/pipeline';

async function onMumbleRecordingStop(session: MumbleRecordingSession): Promise<void> {
  const summary = await session.stop();

  if (process.env.PROCESSING_AUTO === 'true') {
    await runFastPipeline(summary.sessionDir, {
      // Pipeline reads session_metadata.json — source-agnostic
      // Only difference: match pairer uses mumble_username directly
      // instead of knownPlayers lookup (username IS the QW name)
    });
  }
}
```

The pipeline stages (match pairing, audio splitting, voice upload) work unchanged — they read `session_metadata.json` and process OGG files regardless of source.

### Minor pipeline adaptation needed

In `src/modules/processing/stages/match-pairer.ts`:
- Currently resolves QW names via `knownPlayers[discordUserId]`
- For Mumble recordings (`source: "mumble"`): use `track.mumble_username` directly (it's already the QW name)
- This is a small `if` check, not a refactor

---

## Shared Code with Discord Recording

| Component | Reuse strategy |
|-----------|---------------|
| `recording/silence.ts` | Import directly — same silent Opus frame |
| `processing/pipeline.ts` | Call directly — source-agnostic |
| `processing/stages/*` | Unchanged — operate on OGG files |
| `core/logger.ts` | Import directly |
| `core/firebase.ts` | Import directly (for Firestore reads) |

The Mumble recording module is a **parallel** to the Discord recording module, not a replacement. Both coexist. The module structure mirrors it but with Mumble-specific implementations.

---

## New Config (.env)

```env
# Already set in M1:
MUMBLE_HOST=mumble
MUMBLE_PORT=64738
MUMBLE_BOT_USERNAME=SuperUser    # Will switch to QuadBot after M2 ICE setup
MUMBLE_PASSWORD=QWv01c3Adm1n

# New for M5:
MUMBLE_AUTO_RECORD=true          # Auto-record when users join team channels
MUMBLE_RECORDING_DIR=            # Override recording dir (default: RECORDING_DIR)
```

---

## Verification

1. **Compile**: `npx tsc --noEmit`
2. **Voice receive**: Connect with a Mumble client to a team channel, speak — bot logs "Received voice packet from session X (ParadokS)"
3. **OGG output**: After speaking and stopping, check `recordings/{sessionId}/` for per-speaker OGG files
4. **Playback**: Play the OGG files — should contain the recorded speech, no corruption
5. **Silence padding**: If two users join at different times, both tracks should be time-aligned (late joiner padded with silence from recording start)
6. **Metadata**: `session_metadata.json` has correct format, `source: "mumble"`, team info from mumbleConfig
7. **Auto-record**: Join a team channel → recording starts automatically. Leave → recording stops after idle timeout.
8. **Pipeline**: If `PROCESSING_AUTO=true`, the processing pipeline should run on the Mumble recording and produce match-paired segments

---

## What's NOT in this phase

- Pipeline source field in voiceRecordings Firestore docs (M6)
- Discord `/mumble` command for sharing join links (M6)
- Guest/standin access tokens (Future)
