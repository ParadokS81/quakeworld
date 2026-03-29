# Mumble Integration — Contract Reference (quad copy)

> This is a reference copy. The canonical version lives at the orchestrator level:
> `../../MUMBLE-INTEGRATION-CONTRACT.md`
>
> See that file for the full Firestore schema, onboarding flow, MatchScheduler UI,
> and cross-project data flow.

## Key Decisions for quad

1. **Module path**: `src/modules/mumble/` (not `mumble-recording/` — covers channel mgmt + user registration + recording)
2. **Murmur admin API**: gRPC was removed in 1.5.517. Use `@tf2pickup-org/mumble-client` (protocol client) for channel ops + ZeroC ICE (port 6502) for user registration/ACLs
3. **User identity**: We register Mumble users with their QW display name from the MatchScheduler roster. Mumble username = QW identity. No `knownPlayers` mapping needed.
4. **Recording source field**: `source: "mumble"` in `session_metadata.json`
5. **Opus passthrough**: Mumble sends mono Opus (channelCount=1). Same passthrough approach as Discord, just set `channelCount: 1` in OGG header. Same silent frame (`0xF8 0xFF 0xFE`).
6. **Firestore collection**: `mumbleConfig/{teamId}` — quad reads pending configs, creates channels + users, writes back status + credentials

## Firestore Schema (quad's fields)

quad writes these fields on `mumbleConfig/{teamId}`:

```typescript
// Written by quad on activation
channelId: number;              // Murmur internal channel ID
channelName: string;            // e.g. "Team ]sr["
channelPath: string;            // URL-safe path for mumble:// links
serverAddress: string;          // "83.172.66.214"
serverPort: number;             // 64738
status: 'active' | 'error';    // Updated from 'pending'
errorMessage: string | null;
activatedAt: Timestamp;

// Per-user credentials (written by quad, read by MatchScheduler UI)
mumbleUsers: {
  [userId: string]: {           // MatchScheduler Firebase UID
    mumbleUsername: string;      // = QW display name
    mumbleUserId: number;       // Murmur internal user ID
    tempPassword: string | null;// One-time password (cleared after cert pin)
    certificatePinned: boolean;
    linkedAt: Timestamp | null;
  };
};

// Recording bot status
recordingBotJoined: boolean;
```

quad also updates `/users/{userId}` on cert pinning:
```typescript
mumbleLinked: true;
mumbleUsername: string;
mumbleLinkedAt: Timestamp;
```

## Phase Overview

| Phase | Scope | Depends on |
|-------|-------|------------|
| **M1** | Protocol client connection + channel management + ICE setup | — |
| **M2** | User registration (ICE) + cert pinning + session monitoring | M1 |
| **M4** | Roster sync listener (add/remove/rename users on roster changes) | M2 |
| **M5** | Recording bot (per-speaker audio capture, session_metadata.json output) | M1 |
| **M6** | Pipeline integration + Discord `/mumble` command | M4, M5 |

See individual phase prompt files for detailed implementation instructions.
