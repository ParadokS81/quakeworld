# API Contracts - Quad

All external boundaries the bot touches. For the Firestore collection schemas, see `SCHEMA.md`.

---

## Discord Gateway

**Library:** discord.js v14 (14.25.1)
**Auth:** Bot token via `DISCORD_TOKEN` env var

### Intents

```
Guilds, GuildVoiceStates, GuildMembers
```

### Slash commands

Commands are registered globally on bot ready via `PUT /applications/{clientId}/commands`.

| Command | Subcommands | Module |
|---|---|---|
| `/record` | `start [platform]`, `stop`, `status`, `reset` | recording |
| `/process` | `fast [sessionId]`, `transcribe [sessionId]`, `analyze [sessionId]` | processing |
| `/register` | (none) | registration |

### Button interactions

| Custom ID pattern | Module | Action |
|---|---|---|
| `standin_yes_{requestId}` | standin | Accept standin request |
| `standin_no_{requestId}` | standin | Decline standin request |
| `standin_stop_{requestId}` | standin | Opt out of all standin requests |

### Events subscribed

| Event | Module | Purpose |
|---|---|---|
| `ClientReady` | core | Initialize modules, register commands |
| `InteractionCreate` | core | Route slash commands and button clicks |
| `VoiceStateUpdate` | recording | Track user join/leave/rejoin in voice channels |

---

## Discord Voice (DAVE protocol)

**Library:** @discordjs/voice 0.19.0 + @snazzah/davey
**Protocol:** DAVE (Discord Audio & Video E2E Encryption), mandatory since March 2026

### Connection

```typescript
joinVoiceChannel({
  channelId, guildId, adapterCreator,
  selfDeaf: false,    // bot hears
  selfMute: true,     // bot does not transmit
  debug: true,
  decryptionFailureTolerance: 10
})
```

- Timeout per attempt: 30 seconds
- Max attempts: 3 with 5s delay between
- Bounce detection: abort if Signalling/Connecting loops >50 times

### Audio reception

- Per-user Opus streams via `receiver.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })`
- One continuous stream per user, never closes until recording stops
- Opus 48 kHz stereo, no transcoding
- Pipeline: Opus stream -> prism-media OggLogicalBitstream -> fs.WriteStream

---

## QW Hub API (Supabase)

**Base URL:** `https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games`
**Auth:** Supabase anonymous key (hardcoded in `processing/stages/hub-client.ts`)
**Timeout:** 30 seconds

### Find matches

```
GET /rest/v1/v1_games
  ?mode=eq.4on4
  &timestamp=gte.{startTime}
  &and=(timestamp.lt.{endTime})
  &players_fts=fts.{playerQuery}   (optional)
  &order=timestamp.asc
```

Returns `HubMatch[]` -- match records with timestamps, player lists, demo SHA256 hashes.

### Fetch ktxstats

```
GET https://d.quake.world/{sha256prefix}/{demoSha256}.mvd.ktxstats.json
```

Prefix is first 3 characters of SHA256. Returns match statistics (kills, deaths, items, weapons). 404 handled gracefully (returns null).

---

## Firebase Admin SDK

**Auth:** Service account JSON via `FIREBASE_SERVICE_ACCOUNT` env var (path or inline JSON)
**Init:** `standin/firestore.ts` -- shared `initFirestore()` / `getDb()` used by all modules

### Firestore

Full read/write access to all collections listed in `SCHEMA.md`. Key patterns:

- **Listeners (onSnapshot):** botRegistrations, availability, matchProposals, scheduledMatches, standin_requests, notifications, deletionRequests, mumbleConfig
- **Writes:** recordingSessions, voiceRecordings, botRegistrations (partial), standin_requests (responses), notifications (delivery status), deletionRequests (completion)

All Firestore writes from the recording module are fire-and-forget with error suppression. A Firestore outage must never fail a recording.

### Storage

**Bucket:** `{projectId}.firebasestorage.app`
**Path:** `voice-recordings/{teamId}/{demoSha256}/{discordUserId}.ogg`

Uploads use `file.save()` with:
- `Content-Type: audio/ogg`
- `Cache-Control: public, max-age=31536000, immutable`
- Custom metadata: `demoSha256`, `map`, `player`, `discordUserId`, `teamId`

---

## Mumble ICE API

**Protocol:** ZeroC ICE via Python sidecar (`scripts/mumble-ice.py`)
**IPC:** JSON-lines over stdin/stdout
**Timeout:** 15 seconds for ready handshake
**Auth:** ICE secret via `MUMBLE_ICE_SECRET` env var

### Operations

| Method | Args | Returns | Purpose |
|---|---|---|---|
| `registerUser` | username, password | userId (number) | Create Mumble user |
| `unregisterUser` | userId | void | Remove user |
| `updateRegistration` | userId, {username?, password?} | void | Update credentials |
| `getRegisteredUsers` | filter? | Map<number, string> | List users |
| `setACL` | channelId, acls[], inherit? | void | Configure channel permissions |
| `getACL` | channelId | {acls, inherit} | Read channel permissions |

---

## Claude API (Anthropic)

**Library:** @anthropic-ai/sdk
**Auth:** API key via `ANTHROPIC_API_KEY` env var
**Model:** `claude-3-5-sonnet-20241022` (default, configurable)
**Max tokens:** 16000

Used by the analyzer stage (`processing/stages/analyzer.ts`) for match communication analysis. System prompt provides QuakeWorld 4on4 context. User message includes the merged timeline (transcripts + ktxstats + overlap data).

Optional -- module skips if `ANTHROPIC_API_KEY` is not set.

---

## Health endpoint

**Port:** `HEALTH_PORT` env var (default 3000)
**Internal only** -- not exposed outside Docker network

```
GET /health
```

Response (200 OK):
```json
{
  "status": "ok",
  "uptime": 12345,
  "modules": ["recording", "processing", "standin", ...],
  "recording": {
    "active": true,
    "sessionCount": 1,
    "sessions": [{ "guildId": "...", "sessionId": "..." }]
  }
}
```

Used by Docker healthcheck and the deploy safety hook (blocks deploy if recording is active).
