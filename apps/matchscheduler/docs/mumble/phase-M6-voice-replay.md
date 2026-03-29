# Phase M6: Voice Replay Mumble Support — MatchScheduler Side

## Context

M3 built the Mumble tab UI. M4 added roster sync. On the quad side, M5 builds the Mumble recording bot and M6 adds `recordingSource: "mumble"` to `voiceRecordings` Firestore docs. This MatchScheduler phase ensures Mumble recordings display correctly in the voice replay UI.

**Model recommendation**: Sonnet, thinking off — small targeted changes, clear before/after.

---

## What This Phase Builds

1. **Voice replay compatibility**: Mumble recordings load and play in VoiceReplayPlayer (they already should — same OGG format, same Storage paths)
2. **Source badge**: Show whether a recording came from Discord or Mumble
3. **Bot track detection**: Add Mumble bot patterns to auto-mute list
4. **Schema docs**: Update SCHEMA.md with the new `recordingSource` field

---

## Important: `source` vs `recordingSource`

The `voiceRecordings` docs have TWO source-related fields:

| Field | Meaning | Values | Written by |
|-------|---------|--------|------------|
| `source` | **Storage backend** — where the audio files live | `'firebase_storage'` \| `'google_drive'` | quad voice-uploader (existing) |
| `recordingSource` | **Recording origin** — which voice platform | `'discord'` \| `'mumble'` | quad voice-uploader (M6) |

Do NOT confuse these. The existing `source` field check in VoiceReplayService (`source !== 'firebase_storage'`) must remain unchanged.

---

## Files to Modify

### 1. `public/js/services/VoiceReplayService.js`

No changes needed for basic playback — Mumble recordings use the same `source: 'firebase_storage'` storage backend and the same `tracks[].storagePath` pattern. They already work.

Optionally expose `recordingSource` in the return object so the UI can show a badge:

```javascript
// In loadFromFirestore(), around line 558, in the return object:
return {
  status: 'loaded',
  tracks,
  teamTag: recording.teamTag,
  recordingSource: recording.recordingSource || 'discord',  // NEW — 'discord' | 'mumble'
};
```

### 2. `public/js/components/VoiceReplayPlayer.js`

#### Add Mumble bot to auto-mute patterns

In the `BOT_PATTERNS` array (around line 350):

```javascript
const BOT_PATTERNS = [
    /recording/i,
    /craig/i,
    /quake\.world/i,
    /\bbot\b/i,
    /^\[.*\]$/,
    /^QuadBot$/i,       // NEW — Mumble recording bot
    /^SuperUser$/i,     // NEW — Mumble admin (shouldn't appear but just in case)
];
```

#### Optional: Source badge in header

If the recording result includes `recordingSource`, show a small badge next to the recording header:

```javascript
// In the header section of the player:
// If recordingSource === 'mumble', show a small "Mumble" badge
// If recordingSource === 'discord' (or absent), show "Discord" badge or nothing
// This is cosmetic — implement only if it fits naturally into the existing UI
```

### 3. `context/SCHEMA.md`

Add `recordingSource` to the voiceRecordings schema documentation:

```
recordingSource: 'discord' | 'mumble'  // Recording platform. Absent = 'discord' (backwards compat)
```

---

## Verification

1. **Existing recordings unchanged**: Load a demo with voice replay — plays exactly as before, no regressions
2. **Mumble recording playback**: After quad M5+M6 produces a Mumble recording, it should appear and play in the voice replay player
3. **Bot auto-mute**: QuadBot track (if present in Mumble recordings) is auto-muted
4. **Source badge** (if implemented): Discord recordings show Discord badge, Mumble recordings show Mumble badge

---

## What's NOT in this phase

- Filtering recordings by source (Discord vs Mumble) — not needed yet, recordings are per-demo
- Mumble-specific playback features — same audio, same player
- Guest/standin access tokens (Future)
