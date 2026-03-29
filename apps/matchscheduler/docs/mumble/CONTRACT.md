# Mumble Integration — Contract Reference (MatchScheduler copy)

> This is a reference copy. The canonical version lives at the orchestrator level:
> `../../MUMBLE-INTEGRATION-CONTRACT.md`
>
> See that file for the full Firestore schema, onboarding flow, quad-side implementation,
> and cross-project data flow.

## Key Decisions for MatchScheduler

1. **New Firestore collection**: `mumbleConfig/{teamId}` — MatchScheduler creates it (pending), quad activates it
2. **New Cloud Functions**: `enableMumble`, `disableMumble` in `functions/mumble-operations.js`
3. **New frontend service**: `MumbleConfigService.js` — Firestore listener, same pattern as `BotRegistrationService.js`
4. **UI location**: New "Mumble" tab in `TeamManagementModal.js`
5. **User onboarding**: Personalized `mumble://` links with temp credentials for first-time connect, generic links for returning users
6. **Read access**: All squad members can read `mumbleConfig` (need to see their own join link)

## MatchScheduler-Written Fields

```typescript
// Written by Cloud Functions on enableMumble
teamId: string;           // = document ID
teamTag: string;          // Denormalized from team doc
teamName: string;         // Denormalized from team doc
enabledBy: string;        // Firebase UID of leader
status: 'pending';        // quad updates to 'active' or 'error'
mumbleUsers: {};           // Empty — quad populates
createdAt: Timestamp;
updatedAt: Timestamp;

// Written by Cloud Function on toggle
autoRecord: boolean;       // User toggles in Mumble tab
```

## quad-Written Fields (read-only for MatchScheduler)

```typescript
channelId: number;         // Murmur channel ID
channelName: string;       // e.g. "sr"
channelPath: string;       // e.g. "Teams/sr"
serverAddress: string;     // "83.172.66.214"
serverPort: number;        // 64738
status: 'active' | 'error';
mumbleUsers: {
  [userId: string]: {
    mumbleUsername: string;
    tempPassword: string | null;    // Show to user if not yet pinned
    certificatePinned: boolean;     // true = user has connected, cert saved
    linkedAt: Timestamp | null;
  };
};
```

## Phase Overview

| Phase | Scope |
|-------|-------|
| **M3** | Cloud Functions + MumbleConfigService + Mumble tab UI |
| **M4** (MS part) | CF writes `pendingSync` on roster changes |
