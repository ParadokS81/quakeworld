# Schema - Quad

Quad uses Firebase Cloud Firestore as its data layer. All collections are shared with MatchScheduler -- Quad reads most of them and writes to a subset. Firebase Storage holds uploaded voice recordings.

For how these collections are accessed (endpoints, auth, listeners), see `API_CONTRACTS.md`.

---

## Firestore collections

### botRegistrations

Team-to-guild mapping. Created by MatchScheduler when a team registers, activated by Quad's `/register` command.

**Document ID:** Team ID

| Field | Type | Written by |
|---|---|---|
| `status` | `'pending' \| 'active' \| 'disconnecting' \| 'inactive'` | Both |
| `teamId` | string | MSS |
| `teamTag` | string | MSS |
| `teamName` | string | MSS |
| `guildId` | string | Quad |
| `guildName` | string | Quad |
| `knownPlayers` | Record<discordUserId, qwName> | Quad |
| `registeredChannelId` | string \| null | Quad |
| `scheduleChannelId` | string \| null | Quad |
| `scheduleMessageId` | string \| null | Quad |
| `nextWeekMessageId` | string \| null | Quad |
| `matchMessageIds` | string[] | Quad |
| `proposalMessageIds` | string[] | Quad |
| `eventMessageId` | string \| null | Quad |
| `availableChannels` | Array<{id, name, canPost}> | Quad |
| `createChannelRequest` | {status: 'pending' \| null} | MSS |
| `autoRecord` | {enabled, minPlayers, platform: 'both' \| 'discord' \| 'mumble', mode?} | MSS (read by both auto-record engines) |
| `updatedAt` | Timestamp | Both |

**Listeners:** availability, scheduler (channel creation), registration (disconnect), both auto-record engines (`autoRecord`).

### recordingSessions

Live recording session tracking. Written by Quad during recording lifecycle. Read by MatchScheduler admin panel.

**Document ID:** Session ID (ULID)

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string | |
| `teamId` | string \| null | Resolved from botRegistrations |
| `guildId` | string | |
| `guildName` | string | |
| `channelId` | string | |
| `channelName` | string | |
| `participants` | string[] | Live list, updated on join/leave |
| `startedAt` | Timestamp | Server time |
| `status` | `'recording' \| 'completed' \| 'interrupted'` | |
| `lastHeartbeat` | Timestamp | Updated every 60s while recording |
| `endedAt` | Timestamp \| null | |
| `duration` | number | Seconds, calculated at stop |
| `participantCount` | number | Peak count |

**Write pattern:** Fire-and-forget. Firestore outages never fail recordings.
**Cleanup:** `cleanupInterruptedSessions()` marks stale docs on bot startup.

### voiceRecordings

Processed voice upload manifest. One document per team per matched demo. Written by the processing pipeline after uploading sliced audio to Firebase Storage.

**Document ID:** `{demoSha256}_{teamId}`; bare `{demoSha256}` when the session had no registration (unregistered proof-of-concept path)

| Field | Type | Notes |
|---|---|---|
| `demoSha256` | string | SHA256 of the Hub demo file |
| `teamId` | string | |
| `teamTag` | string | Lowercase |
| `visibility` | `'public' \| 'private'` | From teams.voiceSettings |
| `source` | `'firebase_storage'` | Constant |
| `recordingSource` | `'discord' \| 'mumble'` | |
| `tracks` | Track[] | See below |
| `mapName` | string | e.g. "dm2" |
| `recordedAt` | Timestamp | |
| `uploadedAt` | Timestamp | |
| `sessionId` | string | Recording session ULID |
| `opponentTag` | string | |
| `teamFrags` | number | |
| `opponentFrags` | number | |
| `gameId` | string | Hub game ID |
| `mapOrder` | number | 1-based index in match sequence |

**Track fields:** `discordUserId`, `discordUsername`, `playerName`, `resolved` (boolean), `storagePath`, `fileName`, `size` (bytes), `duration` (seconds or null).

### availability

Weekly team availability slots. One document per team per week.

**Document ID:** `{teamId}_{weekId}` (e.g. `sr-team_2025w15`)

| Field | Type | Notes |
|---|---|---|
| `slots` | Record<slotId, Record<discordUserId, boolean>> | e.g. `{"mon_1900": {"uid": true}}` |
| `unavailable` | Record<discordUserId, true> \| null | Whole-week unavailable |

**Listeners:** Real-time onSnapshot for UI updates.

### matchProposals

Challenge proposals between teams. Written by MatchScheduler, read by Quad for grid display and event notifications.

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `proposerTeamId` | string | |
| `opponentTeamId` | string | |
| `status` | `'active' \| 'cancelled' \| 'confirmed'` | |
| `weekId` | string | |
| `slotIds` | string[] | Proposed time slots |
| `createdAt` | Timestamp | |

**Listeners:** Two onSnapshot subscriptions (as proposer and as opponent).

### scheduledMatches

Confirmed matches between teams. Written by MatchScheduler.

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `teamAId`, `teamBId` | string | |
| `teamATag`, `teamBTag` | string | |
| `teamAName`, `teamBName` | string | |
| `blockedTeams` | string[] | For efficient array-contains queries |
| `status` | `'upcoming' \| 'completed' \| 'cancelled'` | |
| `weekId` | string | |
| `slotId` | string | e.g. "mon_1900" |
| `gameType` | `'official' \| 'practice'` | |

### notifications

Event notifications from MatchScheduler Cloud Functions. Quad listens for pending notifications and delivers them as Discord embeds.

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `type` | `'challenge_proposed' \| 'slot_confirmed' \| 'match_sealed'` | |
| `status` | `'pending' \| 'delivered' \| 'failed'` | |
| `createdAt` | Timestamp | |
| `deliveredAt` | Timestamp \| null | Written by Quad after delivery |

Type-specific fields vary by notification type.

### standin_requests

Standin player coordination. MatchScheduler creates requests, Quad delivers DMs and writes back responses.

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `status` | `'pending' \| 'confirmed' \| 'cancelled' \| 'expired'` | |
| `requestedBy` | {firebaseUid, displayName, teamId, teamName, teamTag, teamLogoUrl} | |
| `match` | {weekId, slotIds[], displayTime, division, opponent} | |
| `candidates` | Record<discordUserId, {firebaseUid, displayName, teamName}> | |
| `responses` | Record<discordUserId, {status, respondedAt, dmDelivered, dmError}> | Written by Quad |
| `confirmedDiscordId` | string \| null | |

### standin_preferences

User opt-out and blocking preferences. Written by MatchScheduler UI, read by Quad before sending DMs.

| Field | Type |
|---|---|
| `discordUserId` | string |
| `optedOut` | boolean |
| `blockedUsers` | string[] |
| `blockedTeams` | string[] |
| `blockedDivisions` | string[] |

### deletionRequests

Cleanup requests for processed voice files. Written by MatchScheduler when users delete recordings.

| Field | Type | Notes |
|---|---|---|
| `status` | `'pending' \| 'completed' \| 'failed'` | |
| `demoSha256` | string | |
| `sessionId` | string | |
| `mapName` | string | |

Quad deletes local processed files and marks status as completed.

### teams (read-only)

Team reference data. Written by MatchScheduler.

| Field | Type | Notes |
|---|---|---|
| `playerRoster` | Array<{userId, displayName}> | |
| `activeLogo` | {urls: {small}} | Team logo for embeds |
| `voiceSettings` | {defaultVisibility: 'public' \| 'private'} | Controls voice recording visibility |

### users (read-only)

User accounts. Written by MatchScheduler. Read by Quad for Discord-to-QW name resolution.

| Field | Type | Notes |
|---|---|---|
| `discordUserId` | string | Lookup key |
| `displayName` | string | QW name |
| `teams` | Record<teamId, true> | Team membership |

### mumbleConfig

Mumble channel + user provisioning per team. MatchScheduler creates the doc as `pending`; Quad's mumble module activates it (creates the channel, registers the users) and fills in the server fields.

**Document ID:** Team ID

| Field | Type | Written by |
|---|---|---|
| `teamId`, `teamTag` | string | MSS |
| `status` | `'pending' \| 'active' \| 'disabling' \| 'error'` | Both |
| `channelId` | number | Quad (Mumble channel id; the auto-record engine keys on it) |
| `channelName`, `channelPath` | string | Quad (`Teams/<slug>`; the join URL derives from `channelPath`) |
| `serverAddress`, `serverPort` | string, number | Quad (`MUMBLE_PUBLIC_HOST` / `MUMBLE_PORT` at activation; see `DEPLOYMENT.md` for the backfill when the host changes) |
| `mumbleUsers` | Record<userId, {mumbleUsername, mumbleUserId, tempPassword, linkedAt}> | Quad |
| `autoRecord` | boolean | Legacy per-team flag; `botRegistrations.autoRecord` is the live setting |
| `errorMessage` | string | Quad, on `status: 'error'` |
| `activatedAt`, `updatedAt` | Timestamp | Quad |

Canonical cross-project contract: `contracts/completed/MUMBLE-INTEGRATION-CONTRACT.md`.

---

## Firebase Storage

Voice recordings are uploaded to Firebase Storage after processing.

**Bucket:** `{projectId}.firebasestorage.app` (override with `FIREBASE_STORAGE_BUCKET`)

```
voice-recordings/
  {teamId}/
    {demoSha256}/
      {discordUserId}.ogg       per-speaker, sliced to match boundaries
  {demoSha256}/
    {playerName}.ogg            fallback for sessions with no registration
```

Files are uploaded with `Cache-Control: public, max-age=31536000, immutable` and custom metadata (`demoSha256`, `map`, `player`, `discordUserId`, `teamId`).

---

## session_metadata.json

The public contract between the recording module and everything downstream. Schema version 1. The JSON Schema at `docs/session_metadata_schema.json` describes the Discord shape; the Mumble shape (below) is not in it yet, tracked in the root `HANDOVER.md`.

Discord shape (`source: "quad"`):

```json
{
  "schema_version": 1,
  "recording_start_time": "ISO 8601 UTC, ms precision",
  "recording_end_time": "ISO 8601 UTC, ms precision",
  "recording_id": "ULID",
  "source": "quad",
  "source_version": "1.0.0",
  "guild": { "id": "string", "name": "string" },
  "channel": { "id": "string", "name": "string" },
  "team": { "tag": "string", "name": "string" },
  "source_text_channel_id": "string or null (the channel /record start came from; picks the registration in multi-team guilds)",
  "tracks": [
    {
      "track_number": 1,
      "discord_user_id": "string",
      "discord_username": "string",
      "discord_display_name": "string",
      "joined_at": "ISO 8601 UTC",
      "left_at": "ISO 8601 UTC or null",
      "audio_file": "1-username.ogg"
    }
  ]
}
```

Mumble shape (`source: "mumble"`, written by `src/modules/mumble/mumble-metadata.ts`): same envelope with `guild: null`, `team: { tag, name, teamId }`, an extra `mumble_server: { host, port }`, and tracks carrying `mumble_session_id` + `mumble_username` instead of the `discord_*` fields. The processing pipeline resolves player names from `mumble_username` when the Discord fields are null.

Schema changes require a version bump.
