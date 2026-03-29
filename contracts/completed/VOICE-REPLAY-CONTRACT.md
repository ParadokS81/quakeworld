# Voice Replay Multi-Clan — Cross-Project Contract

> Source of truth for the shared interfaces between quad and MatchScheduler.
> Updated as each phase lands. Both projects reference this for schema decisions.
> Reference copies live in each project's `docs/multi-clan/CONTRACT.md`.

---

## Overview

Evolving voice replay from single-clan PoC to multi-clan production:
- Registration starts from MatchScheduler UI (team settings) — leader initiates, bot completes
- Uploads tagged with teamId, enabling Firestore-rules-based privacy
- Teams control visibility: default public/private + per-recording override
- Frontend discovery: team members find their recordings in MatchScheduler

**Tiers:**
- **Tier 3** (this contract): Central bot, Firebase Storage, shared infra. Privacy via Firestore rules on the discovery layer.
- **Tier 2** (future): Self-hosted bot, Google Drive storage, fully private. Separate deployment.

---

## New Collection: `/botRegistrations/{teamId}`

Links a MatchScheduler team to a Discord server. Document ID = teamId (one registration per team).

Created by MatchScheduler (pending) → completed by quad bot (active).

```typescript
interface BotRegistrationDocument {
  // Team identity (set by MatchScheduler at creation)
  teamId: string;                     // = document ID
  teamTag: string;                    // Denormalized from team doc
  teamName: string;                   // Denormalized from team doc

  // Authorization (set by MatchScheduler at creation)
  authorizedDiscordUserId: string;    // Leader's Discord user ID — only this user can run /register
  registeredBy: string;               // Firebase UID of the leader

  // Discord server info (set by quad bot on /register completion)
  guildId: string | null;             // null while pending, populated on completion
  guildName: string | null;           // Discord server name

  // Status
  status: 'pending' | 'active';      // pending = awaiting /register, active = linked

  // Learned player mappings for users NOT in the team roster
  // (standins, guests, invited players)
  // Roster members are resolved dynamically from team doc + user profiles
  knownPlayers: {
    [discordUserId: string]: string;  // Discord user ID → QW display name
  };

  // Timestamps
  createdAt: Timestamp;               // When MatchScheduler created the pending registration
  activatedAt: Timestamp | null;      // When quad completed /register
  updatedAt: Timestamp;
}
```

### Firestore Rules
```
match /botRegistrations/{teamId} {
  // Leaders can read their own team's registration (for UI status display)
  allow read: if request.auth != null
    && get(/databases/$(database)/documents/teams/$(teamId)).data.leaderId == request.auth.uid;

  // All writes via Cloud Function (create/disconnect) or Admin SDK (bot activation)
  allow write: if false;
}
```

---

## Registration Flow (End-to-End)

```
MATCHSCHEDULER (Team Settings)                DISCORD
──────────────────────────────                ───────

Leader opens team settings
  → "Voice Bot" section shows
  → Status: "Not connected"
  → Button: "Connect Voice Bot"
        │
        ▼
Leader clicks "Connect Voice Bot"
        │
        ▼
Cloud Function creates
botRegistrations/{teamId}:
  status: 'pending'
  authorizedDiscordUserId: leader's Discord ID
  teamId, teamTag, teamName
  guildId: null
  knownPlayers: {}
        │
        ▼
UI updates:
  → Status: "Pending — complete setup in Discord"
  → Shows bot invite link
  → Shows instructions: "1. Click invite link
     2. Add bot to your server
     3. Run /register in any channel"
        │                                      │
        └──── leader clicks invite link ──────→│
                                               ▼
                                        Leader adds bot to server
                                        (Discord OAuth flow)
                                               │
                                               ▼
                                        Leader runs /register
                                               │
                                               ▼
                                        Bot queries botRegistrations
                                        where authorizedDiscordUserId
                                        == interaction.user.id
                                        AND status == 'pending'
                                               │
                                        ├─ No match → "No pending
                                        │  registration. Start from
                                        │  team settings on MatchScheduler."
                                        │
                                        ▼─ Match found →
                                           Update doc:
                                             guildId: interaction.guildId
                                             guildName: interaction.guild.name
                                             status: 'active'
                                             activatedAt: now
                                               │
                                               ▼
                                        Bot confirms: "✓ Linked to
                                        [teamName] ([teamTag])"

        ┌──────────────────────────────────────┘
        ▼
MatchScheduler UI auto-updates
(Firestore listener on botRegistrations/{teamId}):
  → Status: "Connected to [guildName]"
  → Button: "Disconnect"
```

### Disconnect Flow
- Leader clicks "Disconnect" in team settings
- Cloud Function deletes `botRegistrations/{teamId}`
- Bot loses the mapping (detected on next cache refresh or recording attempt)
- UI returns to "Not connected" state

### Re-registration
- Leader must disconnect first, then start fresh
- Prevents confusion about which server is linked

---

## Updated Collection: `/voiceRecordings/{demoSha256}`

Voice recording manifest. Written by quad bot after the fast pipeline.

### Before (PoC)
```typescript
{
  demoSha256: string;
  teamTag: string;              // "sr"
  teamId: string;               // "" (empty — bot didn't know)
  source: 'firebase_storage';
  tracks: [{
    playerName: string;         // "ParadokS"
    fileName: string;           // "ParadokS.ogg"
    storagePath: string;        // "voice-recordings/{sha256}/ParadokS.ogg"
    size: number;
    duration: number | null;
  }];
  mapName: string;
  recordedAt: Timestamp;
  uploadedAt: Timestamp;
  uploadedBy: string;
  trackCount: number;
}
```

### After (Multi-Clan)
```typescript
interface VoiceRecordingDocument {
  demoSha256: string;                          // Document ID (demo hash)
  teamId: string;                              // MatchScheduler team ID (from botRegistration)
  teamTag: string;                             // ASCII team tag (lowercase)
  visibility: 'public' | 'private';            // Resolved at upload from team's defaultVisibility
  source: 'firebase_storage' | 'google_drive';

  tracks: VoiceTrack[];

  mapName: string;
  recordedAt: Timestamp;
  uploadedAt: Timestamp;
  uploadedBy: string;                          // "quad-bot"
  trackCount: number;
}

interface VoiceTrack {
  discordUserId: string;       // Stable file identifier — never changes
  discordUsername: string;     // Discord display name at recording time
  playerName: string;          // QW name: resolved from roster/knownPlayers, or fallback to discordUsername
  resolved: boolean;           // true = playerName confirmed (roster or knownPlayers), false = using Discord fallback
  storagePath: string;         // "voice-recordings/{teamId}/{sha256}/{discordUserId}.ogg"
  fileName: string;            // "{discordUserId}.ogg" (stable, not display name)
  size: number;
  duration: number | null;
}
```

**Key changes from PoC:**
- `teamId` populated (from botRegistration lookup)
- `visibility` field added (drives Firestore security rules)
- Tracks carry `discordUserId` + `resolved` flag for backfill support
- Storage path includes `teamId` prefix
- File naming uses `discordUserId` (stable) instead of `playerName` (mutable)

### Firestore Rules (Multi-Clan)
```
match /voiceRecordings/{demoSha256} {
  // Public recordings: anyone can read
  // Private recordings: only team members
  allow read: if
    resource.data.visibility == 'public'
    || (request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teams[resource.data.teamId] == true);
  allow write: if false;  // Admin SDK only
}
```

---

## Updated Storage Path

### Before (PoC)
```
voice-recordings/{demoSha256}/{playerName}.ogg
```

### After (Multi-Clan)
```
voice-recordings/{teamId}/{demoSha256}/{discordUserId}.ogg
```

**Storage rules:** Remain publicly readable by URL. Privacy enforced at the Firestore discovery layer — you can only learn the Storage paths by reading the voiceRecordings document.

```
match /voice-recordings/{teamId}/{demoSha256}/{fileName} {
  allow read: if true;
  allow write: if false;  // Admin SDK only
}
```

---

## New Field on `/teams/{teamId}`

Added to existing TeamDocument:

```typescript
// Optional — absence treated as { defaultVisibility: 'private' }
voiceSettings?: {
  defaultVisibility: 'public' | 'private';
};
```

Written by team leader via MatchScheduler UI (team settings page). Read by quad bot at upload time to resolve the initial `visibility` value for new recordings.

---

## Player Name Resolution (quad bot)

When the bot uploads a recording, it resolves each speaker's display name in this order:

```
1. Team roster lookup
   - Bot reads team doc from botRegistration.teamId
   - Team doc has playerRoster[] with userId per player
   - Bot reads each user doc to check discordUserId match
   → If found: use displayName from user profile (= QW name)

2. Known players lookup
   - Bot reads botRegistration.knownPlayers[discordUserId]
   → If found: use stored QW name

3. Fallback
   - Use Discord display name from recording session
   - Mark track as resolved: false
```

### Backfill Flow (unknown players)

After upload, if any tracks have `resolved: false`:

1. Bot DMs the team leader in Discord
2. Message lists unresolved players with their Discord usernames
3. Leader replies with QW names (interactive buttons/text)
4. Bot updates:
   - `voiceRecordings/{demoSha256}` → track.playerName + resolved: true
   - `botRegistrations/{teamId}.knownPlayers` → stores mapping for next time

---

## Phase Plan

| Phase | Project | Scope |
|-------|---------|-------|
| **1a** | MatchScheduler | "Voice Bot" section in team settings: connect button → creates pending registration + shows invite link |
| **1b** | quad | `/register` command: finds pending registration, completes it with guildId |
| **2** | quad | Refactor uploader: teamId in path, discordUserId filenames, roster-based name resolution, unknown player DM prompt |
| **3** | MatchScheduler | Firestore rules for voiceRecordings (team membership check), add Auth to replay page |
| **4** | MatchScheduler | Team settings UI: `voiceSettings.defaultVisibility` toggle |
| **5** | MatchScheduler | Per-recording visibility override + recordings list/discovery in team view |

---

## Migration Notes

- Existing ]sr[ recordings (PoC) use old path format. No migration needed — they'll continue working via direct URL. New recordings use the new format.
- `SCHEMA.md` in MatchScheduler should be updated when Phase 3 lands (voiceRecordings schema changes + voiceSettings on teams + botRegistrations collection).
- The `PLAYER_NAME_MAP` env var in quad becomes a fallback for unregistered guilds. Registered guilds use roster + knownPlayers instead.
