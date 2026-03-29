# Mumble Integration — Cross-Project Contract

> Source of truth for the Mumble voice server integration between MatchScheduler and quad.
> Updated as each phase lands. Both projects reference this for schema decisions.
> Reference copies should be placed in each project's `docs/mumble/CONTRACT.md`.

---

## Overview

Adding a community Mumble server as a voice platform alongside Discord:
- MatchScheduler is the entry point — team leaders enable Mumble, squad members onboard
- Each team gets a private Mumble channel with per-user access control
- Users onboard through MatchScheduler (personalized `mumble://` link with credentials)
- After first connect, Mumble certificate handles identity permanently
- A Mumble recording bot captures per-speaker audio, feeding into the existing processing pipeline
- Generic Mumble links (no credentials) can be shared in Discord for returning users

**Why Mumble alongside Discord?**
- Server-side audio (no client-side recording quirks, no DAVE encryption issues)
- Lower latency than Discord for competitive play
- Full control of the server (channel layout, ACLs, recording, bandwidth)
- Community ownership — not dependent on Discord platform changes

**Server:** `83.172.66.214:64738` (Docker container on Xerial's server, alongside quad)

---

## New Collection: `/mumbleConfig/{teamId}`

Links a MatchScheduler team to a Mumble channel. Document ID = teamId (one config per team).

Created by MatchScheduler CF (pending) → activated by quad (active) after channel + users are created via Murmur API.

```typescript
interface MumbleConfigDocument {
  // Team identity (set by MatchScheduler CF at creation)
  teamId: string;                     // = document ID
  teamTag: string;                    // Denormalized from team doc
  teamName: string;                   // Denormalized from team doc
  enabledBy: string;                  // Firebase UID of the leader who enabled it

  // Mumble channel info (set by quad on activation)
  channelId: number | null;           // Murmur internal channel ID (null while pending)
  channelName: string | null;         // e.g. "Team ]sr[" or "Slackers"
  channelPath: string | null;         // e.g. "Teams/sr" (URL-safe, used in mumble:// links)

  // Status
  status: 'pending' | 'active' | 'error';
  // pending = CF created doc, waiting for quad to set up channel
  // active  = channel exists, users registered, ready to use
  // error   = setup failed (see errorMessage)
  errorMessage: string | null;

  // Registered Mumble users (set by quad, updated on roster changes)
  // Maps MatchScheduler userId → Mumble user info
  mumbleUsers: {
    [userId: string]: {
      mumbleUsername: string;          // = QW display name from roster
      mumbleUserId: number;           // Murmur internal user ID
      tempPassword: string | null;    // One-time password for first connect (cleared after cert pin)
      certificatePinned: boolean;     // true after first successful connect
      linkedAt: Timestamp | null;     // When cert was pinned
    };
  };

  // Server connection info (set by quad, static)
  serverAddress: string;              // "83.172.66.214"
  serverPort: number;                 // 64738

  // Recording bot
  recordingBotJoined: boolean;        // Whether the recording bot is sitting in the channel
  autoRecord: boolean;                // Auto-record when players join (default: true)

  // Timestamps
  createdAt: Timestamp;
  activatedAt: Timestamp | null;
  updatedAt: Timestamp;
}
```

### Who writes what

| Field | Written by | When |
|-------|-----------|------|
| `teamId`, `teamTag`, `teamName`, `enabledBy` | MatchScheduler CF | At creation (pending) |
| `channelId`, `channelName`, `channelPath` | quad | On activation (via Murmur ICE/protocol) |
| `status` | Both | MatchScheduler: pending. quad: active/error |
| `mumbleUsers` | quad | On activation + roster change sync |
| `mumbleUsers[].tempPassword` | quad | Generated on user creation, cleared after cert pin |
| `mumbleUsers[].certificatePinned` | quad | On first successful Mumble connect |
| `serverAddress`, `serverPort` | quad | On activation (from env config) |
| `recordingBotJoined` | quad | When recording bot joins/leaves channel |
| `autoRecord` | MatchScheduler CF | User toggles in Mumble tab |

### Firestore Rules

```
match /mumbleConfig/{teamId} {
  // Team leader + schedulers can read (for UI display + join links)
  allow read: if request.auth != null
    && (get(/databases/$(database)/documents/teams/$(teamId)).data.leaderId == request.auth.uid
        || request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.schedulerIds
        || request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.playerRoster.map(p => p.userId));

  // All writes via Cloud Function or Admin SDK only
  allow write: if false;
}
```

**Note on read access**: All squad members need read access to see their personalized join link (their `tempPassword` from `mumbleUsers`). However, users should only see their own credentials. The frontend handles this — Firestore rules allow reading the whole doc, but the UI only displays the current user's entry.

**Alternative**: If credential isolation is critical, move per-user credentials to a subcollection `mumbleConfig/{teamId}/credentials/{userId}` with per-user read rules. This adds complexity but prevents squad members from seeing each other's temp passwords. Since temp passwords are one-time and cleared after cert pinning, the simpler approach (all members read the doc) is acceptable for MVP.

---

## User Profile Addition: `/users/{userId}`

Add a Mumble-linked flag to the existing user document:

```typescript
// Added to existing user doc
{
  mumbleLinked: boolean;              // true after first successful Mumble connect
  mumbleUsername: string | null;      // Their Mumble username (= QW display name)
  mumbleLinkedAt: Timestamp | null;   // When they first connected
}
```

Written by quad (via Admin SDK) when a user's certificate is pinned.
Read by MatchScheduler frontend to show "Connected" vs "Setup needed" in the Mumble tab.

---

## Onboarding Flow (End-to-End)

```
MATCHSCHEDULER (Team Settings)                     QUAD (on Xerial's server)
──────────────────────────────                     ────────────────────────

1. Leader clicks "Enable Mumble"
   │
   ▼
Cloud Function: enableMumble({ teamId })
   → Creates mumbleConfig/{teamId}:
     status: 'pending'
     teamId, teamTag, teamName
     mumbleUsers: {}
   → Returns: { status: 'pending' }
                                                   2. quad Firestore listener picks up
                                                      new mumbleConfig with status: 'pending'
                                                      │
                                                      ▼
                                                   Calls Murmur API (protocol client + ICE):
                                                     → Create channel "Teams/{tag}"
                                                     → Set ACL: deny all by default
                                                      │
                                                      ▼
                                                   Reads team roster from /teams/{teamId}
                                                   For each squad member with a userId:
                                                     → Register Mumble user:
                                                       username = member.displayName
                                                       password = crypto.randomBytes(8)
                                                     → Add ACL entry: user can join channel
                                                     → Write to mumbleConfig.mumbleUsers
                                                      │
                                                      ▼
                                                   Updates mumbleConfig/{teamId}:
                                                     status: 'active'
                                                     channelId, channelName, channelPath
                                                     serverAddress, serverPort
                                                     activatedAt: now

3. UI updates (Firestore listener)
   Shows "Mumble Enabled" + per-user join section
   │
   ▼
4. Squad member visits team page
   Sees personalized "Join Mumble" button
   │
   ▼
5. First-time connect:
   Button generates: mumble://ParadokS:a8f3x9k2@83.172.66.214:64738/Teams/sr
   User clicks → Mumble client opens
   Connects with username + temp password
   │                                               6. Murmur validates credentials ✓
   │                                                  quad detects new session via ICE callback
   │                                                  Reads client certificate hash
   │                                                  Pins cert to registered user
   │                                                  │
   │                                                  ▼
   │                                               Updates mumbleConfig.mumbleUsers[userId]:
   │                                                 certificatePinned: true
   │                                                 tempPassword: null (cleared)
   │                                                 linkedAt: now
   │                                               Updates /users/{userId}:
   │                                                 mumbleLinked: true
   │                                                 mumbleUsername: "ParadokS"
   │                                                 mumbleLinkedAt: now
   │
   ▼
7. UI updates: shows "Connected ✓"
   Future connects: cert handles auth
   Generic link works: mumble://83.172.66.214:64738/Teams/sr

8. RETURNING USERS (from Discord or bookmark):
   mumble://83.172.66.214:64738/Teams/sr
   → Mumble client sends saved certificate
   → Murmur recognizes user → grants channel access
   → No credentials in URL needed
```

---

## Discord Integration (Generic Links)

After a team enables Mumble and members are onboarded, the generic channel link can be shared anywhere:

```
mumble://83.172.66.214:64738/Teams/sr
```

### Distribution via quad bot

quad can share the Mumble link in Discord:

| Trigger | Action |
|---------|--------|
| `/mumble` slash command | Reply with team's Mumble join link (ephemeral) |
| Schedule canvas | Include Mumble link alongside "Join voice" |
| Match notification | Include Mumble link for pre-match comms |

### First-time users clicking a generic link

If an unregistered user connects to the Mumble server (no cert, no credentials):
- Murmur ACL blocks access to team channels (deny-all default)
- The server's welcome message directs them to MatchScheduler to set up
- Or: the root channel description contains the setup URL

---

## Roster Sync

When the team roster changes in MatchScheduler, the Mumble users must stay in sync.

### Player added to roster

```
MatchScheduler CF: addTeamMember or addPhantomMember
  │
  ▼
CF writes to mumbleConfig/{teamId}:
  pendingSync: { action: 'add', userId, displayName }
  │
  ▼
quad listener picks up change:
  → Register new Mumble user via Murmur gRPC
  → Add ACL entry for the channel
  → Update mumbleConfig.mumbleUsers with new entry
  → Clear pendingSync
```

### Player removed from roster

```
MatchScheduler CF: removeTeamMember
  │
  ▼
CF writes to mumbleConfig/{teamId}:
  pendingSync: { action: 'remove', userId }
  │
  ▼
quad listener picks up change:
  → Remove Mumble user registration via Murmur gRPC
  → Remove ACL entry for the channel
  → Delete from mumbleConfig.mumbleUsers
  → Clear pendingSync
```

### Player display name changes

If a user changes their QW display name in MatchScheduler, their Mumble username should update too. This is a rename in Murmur + update in `mumbleConfig.mumbleUsers`.

---

## Recording Integration

The Mumble recording bot produces output in the **same format** as the Discord recording module. The processing pipeline doesn't know or care about the source.

### Output contract

```
recordings/{sessionId}/
├── session_metadata.json
│   {
│     schema_version: 1,
│     source: "mumble",              // ← different from "quad"
│     recording_start_time: "...",
│     recording_end_time: "...",
│     recording_id: "01JKXYZ...",    // ULID
│     source_version: "1.0.0",
│     server: {
│       address: "83.172.66.214",
│       port: 64738
│     },
│     channel: {
│       id: 42,                      // Murmur channel ID
│       name: "Team ]sr["
│     },
│     team: {
│       tag: "]sr[",
│       name: "Slackers",
│       teamId: "abc123"             // MatchScheduler team ID
│     },
│     tracks: [{
│       track_number: 1,
│       mumble_user_id: 7,           // Murmur user ID
│       mumble_username: "ParadokS",
│       user_id: "firebase-uid",     // MatchScheduler user ID (from mumbleConfig lookup)
│       discord_user_id: "123...",   // If available (from user profile)
│       discord_username: "paradoks",
│       joined_at: "...",
│       left_at: "...",
│       audio_file: "1-ParadokS.ogg"
│     }]
│   }
├── 1-ParadokS.ogg
├── 2-Razor.ogg
└── ...
```

### Pipeline compatibility

The processing pipeline needs minimal changes:

| Stage | Change needed? | Notes |
|-------|---------------|-------|
| Parse metadata | Minor | Accept `source: "mumble"`, read `mumble_user_id` alongside `discord_user_id` |
| QW Hub query | None | Uses team tag + known players — source doesn't matter |
| ktxstats fetch | None | Same API |
| Match pairing | Minor | Player name resolution: use `mumble_username` (already = QW name) instead of `knownPlayers` lookup |
| Audio split | None | ffmpeg works on any OGG file |
| Voice uploader | None | Uploads to same Firebase Storage path |
| Transcription | None | Whisper works on any audio |

The key simplification: **Mumble usernames ARE the QW names** (we set them during registration). No `knownPlayers` mapping needed. The match pairer can use the username directly.

### voiceRecordings Firestore doc

The uploaded recording doc in `voiceRecordings/{demoSha256}` gains a `recordingSource` field:

```typescript
{
  // Existing fields (unchanged)
  teamId: string;
  teamTag: string;
  tracks: Track[];
  sessionId: string;
  source: 'firebase_storage';       // KEEP — storage backend, NOT recording origin
  // ...

  // New field
  recordingSource: 'discord' | 'mumble';  // Which voice platform the recording came from
}
```

**IMPORTANT**: The existing `source` field means "storage backend" (`firebase_storage` | `google_drive`) — VoiceReplayService checks this to know how to load audio files. Do NOT overwrite it. Use `recordingSource` for the voice platform origin.

The MatchScheduler voice replay UI doesn't need to distinguish for playback — it plays OGG files regardless of recording source. An optional source badge can be shown.

---

## MatchScheduler UI

### Team Management Modal → New "Mumble" Tab

Alongside the existing "Discord", "Schedule", "Recordings" tabs:

```
┌─────────┬──────────┬────────────┬─────────┬────────┐
│ Discord │ Schedule │ Recordings │ Members │ Mumble │
└─────────┴──────────┴────────────┴─────────┴────────┘

STATE: Not enabled
┌──────────────────────────────────────────────────────┐
│                                                      │
│  🔇  Mumble Voice Server                            │
│                                                      │
│  Give your team a private Mumble channel with        │
│  automatic voice recording.                          │
│                                                      │
│  [Enable Mumble]                                     │
│                                                      │
└──────────────────────────────────────────────────────┘

STATE: Active, current user NOT linked
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Mumble Voice Server                     ● Active    │
│  Channel: Teams/sr                                   │
│                                                      │
│  ─────────────────────────────────────────────────   │
│                                                      │
│  Connect your Mumble client:                         │
│                                                      │
│  1. Install Mumble if needed:                        │
│     https://www.mumble.info/downloads/                │
│                                                      │
│  2. Click to connect (first time only):              │
│     [🔊 Connect to Mumble]                           │
│     (Opens Mumble with your credentials)             │
│                                                      │
│  After first connect, your client remembers you.     │
│                                                      │
└──────────────────────────────────────────────────────┘

STATE: Active, current user linked
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Mumble Voice Server                     ● Active    │
│  Channel: Teams/sr                                   │
│                                                      │
│  ─────────────────────────────────────────────────   │
│                                                      │
│  Connected as: ParadokS ✓                            │
│                                                      │
│  [🔊 Join Channel]                                   │
│  mumble://83.172.66.214:64738/Teams/sr               │
│                                                      │
│  ─────────────────────────────────────────────────   │
│                                                      │
│  Squad members:                    3/5 linked        │
│  ✓ ParadokS                                         │
│  ✓ Razor                                            │
│  ✓ scenic                                           │
│  ○ pkk              [not yet connected]              │
│  ○ nasander          [not yet connected]              │
│                                                      │
│  ─────────────────────────────────────────────────   │
│  Auto-record: [ON]                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Leader-only controls

- "Enable Mumble" / "Disable Mumble" button
- Auto-record toggle
- View all members' link status

### Key file locations

| Concern | MatchScheduler file | quad file |
|---------|-------------------|-----------|
| Enable/disable | `functions/mumble-operations.js` (new) | — |
| Channel setup | — | `src/modules/mumble/channel-manager.ts` (new) |
| User registration | — | `src/modules/mumble/user-manager.ts` (new) |
| Cert pinning | — | `src/modules/mumble/session-monitor.ts` (new) |
| Roster sync listener | — | `src/modules/mumble/roster-sync.ts` (new) |
| Recording bot | — | `src/modules/mumble/recorder.ts` (new) |
| UI (Mumble tab) | `js/components/TeamManagementModal.js` (extend) | — |
| Service | `js/services/MumbleConfigService.js` (new) | — |
| Firestore listener | `js/services/MumbleConfigService.js` (new) | `src/modules/mumble/config-listener.ts` (new) |

---

## Murmur Admin API

**gRPC was removed from Mumble in 1.5.517.** Our Murmur 1.5.857 does not have it. Two approaches are available:

### Tier 1: Mumble Protocol Client (basic ops)

`@tf2pickup-org/mumble-client` (TypeScript, actively maintained, 1.2k npm downloads/week) connects as a regular Mumble client with admin permissions and can handle:
- Create/delete channels
- Move users between channels
- Set channel descriptions
- Track connected users and their state
- Mute/deafen users

This covers channel management without any extra API setup.

### Tier 2: ICE API (advanced ops — user registration, ACLs, cert pinning)

ZeroC ICE is the only official admin API. Required for operations that can't be done via the protocol:
- **`registerUser`** — Create Mumble accounts with username + password (needed for onboarding flow)
- **`unregisterUser`** — Remove accounts (roster sync)
- **`updateRegistration`** — Rename users, update passwords
- **`getACL` / `setACL`** — Per-channel permission management
- **`getRegisteredUsers`** — Query registered users + certificate hashes
- **`addCallback`** — Server events (user join/leave, for cert pinning detection)

#### Enabling ICE in Docker

Add to `docker-compose.yml` mumble service:

```yaml
mumble:
  environment:
    MUMBLE_CONFIG_ICE: "tcp -h 0.0.0.0 -p 6502"
    MUMBLE_CONFIG_ICESECRETWRITE: "${MUMBLE_ICE_SECRET}"
  ports:
    - "64738:64738"      # Mumble client (public)
    - "64738:64738/udp"  # Mumble client UDP (public)
  # ICE on internal network only (quad connects via Docker DNS)
  expose:
    - "6502"
```

quad connects to `mumble:6502` via Docker internal DNS.

#### ICE client options

| Option | Pros | Cons |
|--------|------|------|
| **`ice` npm package** (v3.7.100) | Direct from Node.js, no extra container | Large dependency, no TS types, JS ICE support less tested |
| **Python ICE sidecar** | Well-tested (MuMo, Alliance Auth use this), officially supported approach | Extra container, Python dependency, HTTP bridge layer |
| **Protocol client only** | No ICE dependency at all | Can't register users with passwords, can't pin certs, can't set fine-grained ACLs |

**Recommendation**: Start with protocol client for M1 (channel management). Add ICE (`ice` npm package + `slice2js` generated stubs from `MumbleServer.ice`) in M2 when user registration is needed. Fall back to Python sidecar only if the npm ICE package proves unreliable.

### Key operations by tier

| Operation | Tier | Method | When |
|-----------|------|--------|------|
| Create team channel | Protocol | `@tf2pickup-org` channel API | Team enables Mumble |
| Delete team channel | Protocol | `@tf2pickup-org` channel API | Team disables Mumble |
| Register user (username + password) | ICE | `registerUser` | Team activation + roster add |
| Unregister user | ICE | `unregisterUser` | Roster remove |
| Rename user | ICE | `updateRegistration` | Display name change |
| Set channel ACLs | ICE | `setACL` | Channel creation + user add/remove |
| List connected users | Protocol | `@tf2pickup-org` user state | Session monitoring |
| Get user certificate hash | ICE | `getRegisteredUsers` | Cert pinning on first connect |
| Server event callbacks | ICE | `addCallback` | Detect new connections for cert pinning |

---

## Phase Plan

```
         ┌─────┐
         │ M1  │  Murmur API + channel management
         │quad │
         └──┬──┘
            │
      ┌─────┴─────┐
      │            │
   ┌──┴──┐     ┌──┴──┐
   │ M2  │     │ M3  │  User registration + cert pinning  ‖  MatchScheduler UI
   │quad │     │ MS  │
   └──┬──┘     └──┬──┘
      │            │
      └─────┬─────┘
            │
         ┌──┴──┐
         │ M4  │  Roster sync
         │both │
         └──┬──┘
            │
         ┌──┴──┐
         │ M5  │  Recording bot (parallel research track)
         │quad │
         └──┬──┘
            │
         ┌──┴──┐
         │ M6  │  Pipeline integration + Discord link sharing
         │both │
         └─────┘
```

| Phase | Project | Scope | Depends on | Model recommendation |
|-------|---------|-------|------------|---------------------|
| **M1** | quad | **Murmur connection + channel management**: Connect to Murmur via `@tf2pickup-org/mumble-client` (protocol client). Build `src/modules/mumble/channel-manager.ts` — create/delete team channels. Enable ICE in Docker config (port 6502). Firestore listener for `mumbleConfig` status: 'pending' → create channel → set status: 'active'. | — | Sonnet, extended thinking |
| **M2** | quad | **User registration + cert pinning**: Build `user-manager.ts` — register Mumble users from team roster, generate temp passwords, write to `mumbleConfig.mumbleUsers`. Build `session-monitor.ts` — detect new connections, pin certificates, clear temp passwords, update user profiles. | M1 | Sonnet, extended thinking |
| **M3** | MatchScheduler | **Mumble tab UI**: New Cloud Function `enableMumble`/`disableMumble`. New `MumbleConfigService.js` (Firestore listener). Extend `TeamManagementModal.js` with Mumble tab — enable button, join link (personalized for first-time, generic for linked), member status list, auto-record toggle. | M1 | Sonnet, extended thinking |
| **M4** | both | **Roster sync**: MatchScheduler CF writes `pendingSync` on roster changes. quad `roster-sync.ts` listener processes add/remove/rename via Murmur ICE. | M2, M3 |  Sonnet, thinking off |
| **M5** | quad | **Recording bot**: Per-speaker audio capture in Mumble (research track already in progress). Output matches `session_metadata.json` contract. Auto-join team channels. | M1 | Sonnet, extended thinking |
| **M6** | both | **Pipeline + Discord**: Minor pipeline changes (accept `source: "mumble"`, use `mumble_username` for player resolution). Add `recordingSource` field to `voiceRecordings` docs (NOT `source` — that's the storage backend). quad `/mumble` command for sharing join links in Discord. MatchScheduler: optional source badge in voice replay. | M4, M5 | Sonnet, thinking off |

### Future: Guest / Standin Access (post-MVP)

Mumble's **access tokens** feature enables temporary guest access to team channels — perfect for standins.

**How it ties into the existing standin flow:**

```
Existing standin flow (already built):
  MatchScheduler creates standin_request
    → quad delivers DM to potential standins via Discord
    → Standin accepts via button click
    → quad confirms acceptance, notifies team

Extended with Mumble (future):
  Standin accepts via Discord DM
    → quad checks: does this team have Mumble enabled? (mumbleConfig status: 'active')
    → YES: Generate time-limited access token via Murmur ICE
           Add token-based ACL rule to team's channel
           Include mumble:// link with token in the confirmation DM:
           "Join voice: mumble://StandinName:guestToken@83.172.66.214:64738/Teams/sr"
    → Standin clicks link → joins team channel → plays the match
    → After match: token expires or is revoked, ACL entry removed
```

**Why this works cleanly:**
- The standin flow already handles the full feedback loop (request → DM → accept → confirm)
- Mumble access tokens are a native protocol feature (no custom auth needed)
- The standin doesn't need a registered Mumble account — the token grants temporary channel access
- If the standin IS already a registered Mumble user (from their own team), they can join with their cert + token
- Token lifetime can match the match duration (auto-expire after 3 hours)
- Team leader can also manually generate guest tokens from the MatchScheduler UI for ad-hoc invites

**Schema addition (when implementing):**

```typescript
// Add to MumbleConfigDocument
guestTokens?: {
  [tokenId: string]: {
    token: string;              // The access token string
    grantedTo: string | null;   // Display name or standin request ID
    createdBy: string;          // Firebase UID (leader) or 'system' (standin flow)
    createdAt: Timestamp;
    expiresAt: Timestamp;       // Auto-cleanup after this time
    used: boolean;              // Whether someone connected with it
  };
};
```

**Not in MVP** — but the architecture supports it with zero changes to the core channel/user model. It's purely additive: a new ACL rule type on the channel + a new field on the config doc.

---

### What's NOT in scope (other future enhancements)

- **Web-based Mumble client** — Would eliminate the "install Mumble" step. `mumble-web` exists but is limited. Evaluate later.
- **Mumble ↔ Discord bridge** — Bridging audio between platforms. Complex, not needed initially.
- **Admin dashboard** — Global view of all channels, users, server health. Per-team UI is sufficient for MVP.
- **Multiple Mumble servers** — Currently one server. Scale if demand grows.
- **Spectator channels** — Public listen-only channels for casters/spectators. Nice-to-have.

---

## Migration Notes

- **No existing data affected.** This is a new collection (`mumbleConfig`). No changes to existing `botRegistrations`, `voiceRecordings`, or `teams` docs.
- **Additive to user docs.** New fields (`mumbleLinked`, `mumbleUsername`, `mumbleLinkedAt`) default to absent/null. No migration needed.
- **voiceRecordings `recordingSource` field.** Existing recordings don't have this field — they're implicitly Discord. The frontend should treat missing `recordingSource` as `'discord'`. Note: the existing `source` field (`'firebase_storage'`) is the storage backend and must NOT be repurposed.
- **Docker Compose change.** The Mumble container already exists. Enabling ICE (port 6502, internal only) is the only infra change.
- **Firestore indexes.** May need composite index on `mumbleConfig` for `status` queries. Create during M1 if needed.

---

## Open Questions

1. **Credential isolation**: Should `mumbleUsers` (with temp passwords) live on the team doc, or in a per-user subcollection? MVP: team doc is fine (temp passwords are one-time and cleared quickly). Revisit if security requirements change.

2. **Multiple Mumble servers**: Currently hardcoded to one server. If we ever want team-specific servers (self-hosted), the `serverAddress`/`serverPort` fields on `mumbleConfig` already support it.

3. **Mumble client detection**: Can the MatchScheduler frontend detect if Mumble is installed (to show "Install first" vs "Connect")? Probably not reliably from a browser. Show both the download link and the connect button; let the user figure it out.

4. **Channel naming**: Use team tag (`sr`) or team name (`Slackers`) for the channel? Tag is shorter (better for Mumble's narrow channel tree). But tags can have special chars (`]sr[`). Need URL-safe version for `mumble://` path — strip brackets, lowercase.

5. **ICE npm package reliability**: The `ice` npm package (v3.7.100) has no TypeScript types and its JavaScript support is less tested than Python's. If it proves unreliable, fall back to a lightweight Python ICE sidecar. The quad research track should evaluate this during M1.
