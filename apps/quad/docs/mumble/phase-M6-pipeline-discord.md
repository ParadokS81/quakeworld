# Phase M6: Pipeline Integration + Discord Link Sharing — quad Side

## Context

M1-M5 built the full Mumble stack (channels, users, recording). This phase makes the processing pipeline properly handle Mumble recordings and adds a Discord command for sharing Mumble join links.

---

## What This Phase Builds

1. **Pipeline**: Accept `source: "mumble"` in session metadata, use `mumble_username` for player resolution
2. **Voice uploader**: Add `source` field to `voiceRecordings` Firestore docs
3. **Discord command**: `/mumble` — shows team's Mumble join link

---

## Files to Modify

### 1. `src/modules/processing/stages/match-pairer.ts`

Currently resolves QW names via `knownPlayers[discordUserId]`. Add Mumble-aware path:

```typescript
// In the player name resolution logic:

function resolvePlayerName(track: SessionTrack, knownPlayers: Record<string, string>): string | null {
  // Mumble recordings: username IS the QW name (we registered them that way)
  if (track.mumble_username) {
    return track.mumble_username;
  }

  // Discord recordings: look up via knownPlayers mapping
  if (track.discord_user_id && knownPlayers[track.discord_user_id]) {
    return knownPlayers[track.discord_user_id];
  }

  return null;
}
```

### 2. `src/modules/processing/types.ts`

Extend `SessionTrack` interface to include Mumble fields:

```typescript
interface SessionTrack {
  track_number: number;
  audio_file: string;
  joined_at: string;
  left_at: string;

  // Discord fields
  discord_user_id?: string;
  discord_username?: string;
  discord_display_name?: string;

  // Mumble fields (new)
  mumble_session_id?: number;
  mumble_username?: string;
}

interface SessionMetadata {
  // ... existing fields ...
  source?: string;             // "quad" | "mumble" — absent = "quad" (backwards compat)
  mumble_server?: {
    host: string;
    port: number;
  };
}
```

### 3. `src/modules/processing/stages/voice-uploader.ts`

Add `recordingSource` field to the Firestore `voiceRecordings` document:

**IMPORTANT**: The existing `source` field in voiceRecordings means the **storage backend** (`'firebase_storage'` | `'google_drive'`). Do NOT overwrite it. Use `recordingSource` for the recording origin.

```typescript
// In the upload function, when writing to Firestore:
const recordingDoc = {
  // ... existing fields ...
  source: 'firebase_storage',                     // KEEP — storage backend (existing field)
  recordingSource: metadata.source || 'discord',   // NEW — recording origin ('discord' | 'mumble')
};
```

### 4. `src/modules/processing/pipeline.ts`

When loading session metadata for Mumble recordings, resolve team info from `mumbleConfig` instead of `botRegistrations`:

```typescript
// In the pipeline initialization:
if (metadata.source === 'mumble' && metadata.team?.teamId) {
  // Read mumbleConfig for team context
  const mumbleConfig = await db.collection('mumbleConfig').doc(metadata.team.teamId).get();
  if (mumbleConfig.exists) {
    // Use mumbleConfig for team tag, known players, etc.
    // Note: for Mumble, mumble_username IS the QW name — no knownPlayers lookup needed
  }
} else {
  // Existing Discord path: use botRegistrations + knownPlayers
}
```

### 5. New Discord command: `/mumble`

Add a slash command that shows the team's Mumble join link.

Create `src/modules/mumble/commands/mumble.ts`:

```typescript
// /mumble — Shows the Mumble join link for the user's team
// Behavior:
// 1. Resolve which team registration this channel belongs to
//    (same resolveRegistrationForChannel logic as /record)
// 2. Look up mumbleConfig for that team
// 3. If active: show the generic join link
//    mumble://83.172.66.214:64738/Teams/sr
// 4. If not enabled: "Mumble is not enabled for this team.
//    Enable it at matchscheduler.web.app"

// Reply is ephemeral (only visible to the user who ran it)
```

Register the command in the mumble module's `commands` array.

---

## Verification

1. **Pipeline on Mumble recording**: Process a Mumble recording — match pairing should work using `mumble_username` for player resolution
2. **voiceRecordings doc**: After upload, the Firestore doc should have `recordingSource: "mumble"` (and `source: "firebase_storage"` unchanged)
3. **Backwards compat**: Process a Discord recording — should work unchanged, `recordingSource` defaults to `"discord"`, existing `source: "firebase_storage"` untouched
4. **`/mumble` command**: Run in Discord — shows the join link. Run in a channel without Mumble — shows "not enabled"
5. **MatchScheduler replay**: Mumble recordings should appear in the voice replay UI (same as Discord recordings, just with `source: "mumble"`)

---

## What's NOT in this phase

- MatchScheduler UI changes for Mumble recordings (source badge) — can be done as a quick enhancement later
- Guest/standin access tokens (Future)
