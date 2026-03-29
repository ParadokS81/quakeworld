# Cross-Project Firestore Schema

> Field-level reference for collections shared between quad and MatchScheduler.
> For the full MatchScheduler schema (including app-internal collections), see `MatchScheduler/context/SCHEMA.md`.
> This file covers only the **cross-project seams** — collections where one project writes and another reads.

---

## Quick Reference

| Collection | Writer(s) | Reader(s) | Bridge between |
|-----------|-----------|-----------|----------------|
| `botRegistrations/{teamId}` | MatchScheduler CF (create/disconnect) + quad (activate/sync) | Both | Registration, guild members, channel config |
| `voiceRecordings/{demoSha256}` | quad (upload) | MatchScheduler (UI + delete CF) | Voice replay pipeline |
| `deletionRequests/{requestId}` | MatchScheduler CF (create) | quad (process) | Recording cleanup |
| `notifications/{notificationId}` | MatchScheduler CF (create) | quad (deliver) | Challenge notifications |
| `standin_requests/{requestId}` | MatchScheduler CF (create) | quad (DM flow) | Standin finder |
| `standin_preferences/{discordUserId}` | quad (set) | quad + MatchScheduler | User opt-out/block |
| `users/{userId}` | MatchScheduler CF (manage) | quad (roster resolution) | Player identity |
| `teams/{teamId}` | MatchScheduler CF (manage) | quad (canvas rendering) | Team info + roster |
| `availability/{teamId}_{weekId}` | MatchScheduler CF (manage) | quad (canvas rendering) | Schedule grid |
| `scheduledMatches/{matchId}` | MatchScheduler CF (manage) | quad (canvas cards) | Match display |
| `matchProposals/{proposalId}` | MatchScheduler CF (manage) | quad (canvas cards) | Proposal display |
| `mumbleConfig/{teamId}` | MatchScheduler CF (create/disable) + quad (activate/sync) | Both | Mumble channel + user management |

---

## `/botRegistrations/{teamId}` — The Primary Bridge

This is the most important cross-project document. Both sides read and write to it.

### Who writes what

| Field | Written by | When |
|-------|-----------|------|
| `teamId`, `teamTag`, `teamName` | MatchScheduler CF | At creation (pending) |
| `authorizedDiscordUserIds` | MatchScheduler CF | At creation + scheduler changes |
| `registeredBy` | MatchScheduler CF | At creation |
| `guildId`, `guildName` | quad | On `/register` completion |
| `status` | Both | MatchScheduler: pending→disconnecting. quad: →active |
| `knownPlayers` | quad + MatchScheduler CF | quad: on `/register`. CF: on `addPhantomMember` |
| `guildMembers` | quad | On `/register`, guildMemberAdd/Remove events, bot startup |
| `availableChannels` | quad | On `/register` + channel discovery |
| `notifications` | MatchScheduler (via CF) | User toggles in Discord tab |
| `scheduleChannel` | MatchScheduler (via CF) | User selects channel in Discord tab |
| `autoRecord` | MatchScheduler (via CF) | User toggles in Recordings tab. Unified settings for both Discord + Mumble (replaces `mumbleConfig.autoRecord`). Fields: `enabled`, `minPlayers` (2-6), `platform` ('both'\|'discord'\|'mumble'), `mode` |

### Key file locations

| Concern | MatchScheduler file | quad file |
|---------|-------------------|-----------|
| Create/disconnect | `functions/bot-registration.js` | — |
| Activate (/register) | — | `src/modules/registration/register.ts` |
| Guild member sync | — | `src/modules/registration/guild-sync.ts` |
| knownPlayers build | — | `src/modules/registration/register.ts:buildKnownPlayers()` |
| Channel discovery | — | `src/modules/scheduler/channels.ts` |
| UI (Discord tab) | `js/components/TeamManagementModal.js:_initVoiceBotSection()` | — |
| UI (Manage Players) | `js/components/ManagePlayersModal.js` | — |
| Firestore listener | `js/services/BotRegistrationService.js` | `src/modules/availability/listener.ts` |

---

## `/voiceRecordings/{demoSha256}` — Voice Replay Pipeline

### Cross-project fields

| Field | Written by | Read by | Purpose |
|-------|-----------|---------|---------|
| `teamId` | quad | MatchScheduler | Team association for security rules |
| `teamTag` | quad | MatchScheduler | Display |
| `visibility` | quad (initial) + MatchScheduler CF (toggle) | Both | Privacy control |
| `tracks[]` | quad | MatchScheduler | Audio file references |
| `sessionId` | quad | MatchScheduler | Series grouping |
| `opponentTag` | quad | MatchScheduler | Series grouping + display |
| `teamFrags`, `opponentFrags` | quad | MatchScheduler | Score display |
| `gameId` | quad | MatchScheduler | QW Hub cross-reference |
| `mapOrder` | quad | MatchScheduler | Chronological sorting within series |

### Key file locations

| Concern | MatchScheduler file | quad file |
|---------|-------------------|-----------|
| Upload (write) | — | `src/modules/processing/stages/voice-uploader.ts` |
| Visibility toggle | `functions/team-operations.js:updateRecordingVisibility` | — |
| Delete | `functions/team-operations.js:deleteRecording` | — |
| UI (cards) | `js/components/TeamManagementModal.js:_initRecordingsTab()` | — |
| Download | `js/services/RecordingDownloadService.js` | — |
| Match pairing | — | `src/modules/processing/stages/match-pairer.ts` |

---

## `/deletionRequests/{requestId}` — Recording Cleanup

**Flow:** MatchScheduler CF creates → quad processes → quad updates status

| Field | Written by | Read by |
|-------|-----------|---------|
| `demoSha256`, `teamId`, `sessionId`, `mapName` | MatchScheduler CF | quad |
| `requestedBy`, `requestedAt` | MatchScheduler CF | — |
| `status` | MatchScheduler CF (pending) → quad (completed/failed) | Both |
| `completedAt`, `error` | quad | MatchScheduler (status display) |

### Key file locations

| Concern | MatchScheduler file | quad file |
|---------|-------------------|-----------|
| Create | `functions/team-operations.js:deleteRecording` | — |
| Process | — | `src/modules/processing/deletion-listener.ts` |

---

## `/notifications/{notificationId}` — Challenge Delivery

**Flow:** MatchScheduler CF creates → quad delivers to Discord → quad updates status

### Key file locations

| Concern | MatchScheduler file | quad file |
|---------|-------------------|-----------|
| Create | `functions/team-operations.js:createProposal` | — |
| Deliver | — | `src/modules/scheduler/notifications.ts` |

---

## `/mumbleConfig/{teamId}` — Mumble Voice Server

Links a MatchScheduler team to a Mumble channel. Same pattern as `botRegistrations` but for Mumble instead of Discord.

**Full schema and onboarding flow:** See `MUMBLE-INTEGRATION-CONTRACT.md`

### Who writes what

| Field | Written by | When |
|-------|-----------|------|
| `teamId`, `teamTag`, `teamName`, `enabledBy` | MatchScheduler CF | At creation (pending) |
| `channelId`, `channelName`, `channelPath` | quad | On activation (via Murmur ICE/protocol) |
| `status` | Both | MatchScheduler: pending. quad: active/error |
| `mumbleUsers` | quad | On activation + roster sync |
| `mumbleUsers[].certificatePinned` | quad | On first successful Mumble connect |
| `serverAddress`, `serverPort` | quad | On activation |
| `autoRecord` | MatchScheduler CF | **DEPRECATED** — replaced by `botRegistrations/{teamId}.autoRecord.platform`. quad falls back to this if `botRegistrations` has no config |

### Key file locations

| Concern | MatchScheduler file | quad file |
|---------|-------------------|-----------|
| Enable/disable | `functions/mumble-operations.js` | — |
| Channel + user setup | — | `src/modules/mumble/channel-manager.ts`, `user-manager.ts` |
| Cert pinning | — | `src/modules/mumble/session-monitor.ts` |
| UI (Mumble tab) | `js/components/TeamManagementModal.js` | — |
| Service | `js/services/MumbleConfigService.js` | — |

---

## Cross-Project Feature Navigation

Quick lookup: "I need to work on X, where do I look in each project?"

### Availability / Schedule Canvas
| | MatchScheduler | quad |
|--|---------------|------|
| Data | `functions/availability.js` | — |
| UI | `js/components/AvailabilityGrid.js`, `WeekDisplay.js` | — |
| Canvas render | — | `src/modules/availability/renderer.ts` |
| Firestore listener | — | `src/modules/availability/listener.ts` |
| Discord interaction | — | `src/modules/availability/interactions.ts` |

### Bot Registration
| | MatchScheduler | quad |
|--|---------------|------|
| Create/disconnect | `functions/bot-registration.js` | — |
| Activate | — | `src/modules/registration/register.ts` |
| UI | `js/components/TeamManagementModal.js` (Discord tab) | — |
| Service | `js/services/BotRegistrationService.js` | — |

### Voice Recording Pipeline
| | MatchScheduler | quad |
|--|---------------|------|
| Record | — | `src/modules/recording/` |
| Process (pipeline) | — | `src/modules/processing/pipeline.ts` |
| Match detection | — | `src/modules/processing/stages/match-pairer.ts` |
| Audio split | — | `src/modules/processing/stages/audio-slicer.ts` |
| Upload to Firebase | — | `src/modules/processing/stages/voice-uploader.ts` |
| UI (replay player) | `js/components/VoiceReplayPlayer.js` | — |
| UI (recording cards) | `js/components/TeamManagementModal.js` (Recordings tab) | — |

### Standin Flow
| | MatchScheduler | quad |
|--|---------------|------|
| Create request | `functions/standin.js` (if exists) | — |
| DM delivery | — | `src/modules/standin/listener.ts`, `dm.ts` |
| User response | — | `src/modules/standin/interactions.ts` |
| Preferences | — | `src/modules/standin/preferences.ts` |

### Challenge Notifications
| | MatchScheduler | quad |
|--|---------------|------|
| Create notification | `functions/team-operations.js:createProposal` | — |
| Deliver to Discord | — | `src/modules/scheduler/notifications.ts` |

### Discord Roster Management
| | MatchScheduler | quad |
|--|---------------|------|
| Add phantom | `functions/team-operations.js:addPhantomMember` | — |
| Remove phantom | `functions/team-operations.js:removePhantomMember` | — |
| Claim on login | `functions/discord-auth.js:claimPhantomAccount` | — |
| Guild member sync | — | `src/modules/registration/guild-sync.ts` |
| UI | `js/components/ManagePlayersModal.js` | — |

### Mumble Voice Server
| | MatchScheduler | quad |
|--|---------------|------|
| Enable/disable | `functions/mumble-operations.js` (new) | — |
| Channel management | — | `src/modules/mumble/channel-manager.ts` (new) |
| User registration | — | `src/modules/mumble/user-manager.ts` (new) |
| Cert pinning | — | `src/modules/mumble/session-monitor.ts` (new) |
| Roster sync | `functions/mumble-operations.js` (pendingSync writes) | `src/modules/mumble/roster-sync.ts` (new) |
| Recording bot | — | `src/modules/mumble/recorder.ts` (new) |
| UI (Mumble tab) | `js/components/TeamManagementModal.js` (extend) | — |
| Service | `js/services/MumbleConfigService.js` (new) | — |
| Contract | `MUMBLE-INTEGRATION-CONTRACT.md` | `MUMBLE-INTEGRATION-CONTRACT.md` |

### Unified Auto-Record (Discord + Mumble)
| | MatchScheduler | quad |
|--|---------------|------|
| Settings UI | `js/components/TeamManagementModal.js` (Recordings tab) | — |
| Settings CF | `functions/bot-registration.js:_handleUpdateSettings` | — |
| Discord auto-record | — | `src/modules/recording/auto-record.ts` (new) |
| Mumble auto-record | — | `src/modules/mumble/auto-record.ts` (migrated) |
| Session registry | — | `src/shared/session-registry.ts` (new) |
| Unified /record cmd | — | `src/modules/recording/commands/record.ts` (extended) |
| Service | `js/services/BotRegistrationService.js` | — |
| Contract | `UNIFIED-AUTO-RECORD-CONTRACT.md` | `UNIFIED-AUTO-RECORD-CONTRACT.md` |
