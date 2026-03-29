# Phase C2: Multi-Registration Resolution — quad Side

## Context

Phase C1 removed the one-guild-one-team restriction and added `getRegistrationsForGuild()`. Now we need to update all the modules that call `getRegistrationForGuild()` to handle the case where a guild has multiple registrations.

The key insight: recording is always triggered by `/record start` from a text channel. That text channel provides the team context. We resolve the registration by matching the command's channel/category to a registration's `registeredChannelId` / `registeredCategoryId`.

Read `COMMUNITY-SERVER-CONTRACT.md` for the full contract.

---

## What Changes

1. **Add `resolveRegistrationForChannel()`** helper that picks the right registration based on channel context
2. **Update all 5 callers** of `getRegistrationForGuild()` in the pipeline, recording, and scheduler modules
3. **Pass channel context through the recording pipeline** so resolution works at every stage

---

## Files to Modify

### 1. `src/modules/registration/register.ts`

#### Add `resolveRegistrationForChannel()` helper

Add after the existing `getRegistrationsForGuild()`:

```typescript
import { Client } from 'discord.js';

/**
 * Resolve the correct registration for a specific channel context.
 * - Single registration guild: returns it directly (no ambiguity)
 * - Multi registration guild: matches by registeredChannelId or registeredCategoryId
 * - No match: returns null
 */
export async function resolveRegistrationForChannel(
  guildId: string,
  channelId: string,
  client: Client,
): Promise<BotRegistration | null> {
  const registrations = await getRegistrationsForGuild(guildId);

  if (registrations.length === 0) return null;
  if (registrations.length === 1) return registrations[0];

  // Multiple registrations — try exact channel match first
  const exactMatch = registrations.find(r => r.registeredChannelId === channelId);
  if (exactMatch) return exactMatch;

  // Try category match
  try {
    const channel = await client.channels.fetch(channelId);
    const categoryId = (channel as any)?.parentId;
    if (categoryId) {
      const categoryMatch = registrations.find(r => r.registeredCategoryId === categoryId);
      if (categoryMatch) return categoryMatch;
    }
  } catch {
    // Channel fetch failed — fall through to null
  }

  return null;
}
```

### 2. `src/modules/recording/commands/record.ts`

The `/record start` command already knows the interaction channel. We need to use it for team resolution and store it on the session so downstream modules can access it.

#### a) Add `sourceChannelId` to session tracking

Find where the session is created and the `startRecording()` / equivalent function is called. The `interaction.channelId` is the text channel where `/record start` was run. Store it alongside the session:

```typescript
// When creating the RecordingSession, also track the source text channel
// This is the channel where /record start was run — used for team resolution
```

The session object (`RecordingSession` in `session.ts`) stores `channelId` and `channelName` — but these are the VOICE channel, not the text channel. We need to pass the text channel ID separately.

**Option A (simple):** Add a `sourceTextChannelId` property to the session metadata that gets written to `session_metadata.json`. This way, downstream modules (pipeline, uploader) can use it.

In `src/modules/recording/session.ts`, add to the constructor opts:

```typescript
readonly sourceTextChannelId?: string;  // Text channel where /record start was run
```

And in `src/modules/recording/metadata.ts`, include it in the metadata output:

```typescript
sourceTextChannelId: session.sourceTextChannelId || null,
```

#### b) Pass `interaction.channelId` when creating sessions

In the record command handler, when creating a new `RecordingSession`, pass:

```typescript
sourceTextChannelId: interaction.channelId,
```

### 3. `src/modules/recording/metadata.ts`

Currently calls `getRegistrationForGuild(session.guildId)` at line 42 to populate `metadata.team`.

**Change to:** Use `resolveRegistrationForChannel()` with the source text channel ID:

```typescript
import { resolveRegistrationForChannel } from '../registration/register.js';

// In writeSessionMetadata():
try {
  // Use source text channel for resolution if available, fall back to voice channel
  const channelForResolution = session.sourceTextChannelId || session.channelId;
  const registration = await resolveRegistrationForChannel(
    session.guildId,
    channelForResolution,
    client,  // Need to pass the Discord client — see note below
  );
  if (registration) {
    metadata.team = {
      tag: registration.teamTag,
      name: registration.teamName || session.guildName,
    };
  }
  // ... existing env var fallback
}
```

**Note:** `writeSessionMetadata()` doesn't currently have access to the Discord `Client`. Two approaches:
1. Pass the client as a parameter (changes the function signature)
2. Use `getRegistrationsForGuild()` instead and do the matching inline (avoids client dependency)

Approach 2 is simpler:

```typescript
import { getRegistrationsForGuild } from '../registration/register.js';

// In writeSessionMetadata():
const registrations = await getRegistrationsForGuild(session.guildId);
let registration = registrations.length === 1 ? registrations[0] : null;
if (!registration && registrations.length > 1 && session.sourceTextChannelId) {
  // Try exact channel match, then category match
  registration = registrations.find(r => r.registeredChannelId === session.sourceTextChannelId) || null;
  // Category match would need the channel's parentId — skip for now, exact match is enough
}
```

### 4. `src/modules/recording/firestore-tracker.ts`

Currently calls `getRegistrationForGuild(session.guildId)` at line 74 to get `teamId` for the Firestore session doc.

**Change to:** Same pattern as metadata.ts — use `getRegistrationsForGuild()` with inline matching:

```typescript
import { getRegistrationsForGuild } from '../registration/register.js';

// In handleSessionStart():
let teamId: string | null = null;
try {
  const registrations = await getRegistrationsForGuild(session.guildId);
  if (registrations.length === 1) {
    teamId = registrations[0].teamId;
  } else if (registrations.length > 1 && session.sourceTextChannelId) {
    const match = registrations.find(r => r.registeredChannelId === session.sourceTextChannelId);
    teamId = match?.teamId ?? null;
  }
} catch {
  // Unregistered guild
}
```

### 5. `src/modules/processing/pipeline.ts`

Currently calls `getRegistrationForGuild(session.guild.id)` at line ~180 in `runFastPipeline()`. This is the most important caller — it determines `teamTag` and `knownPlayers` for match pairing.

**Change to:** Use session metadata's `sourceTextChannelId` for resolution:

```typescript
import { getRegistrationsForGuild } from '../registration/register.js';

// In runFastPipeline(), replace the getRegistrationForGuild call:
let teamTag = session.team?.tag ?? '';
let knownPlayers: Record<string, string> = {};
try {
  const registrations = await getRegistrationsForGuild(session.guild.id);
  let registration = registrations.length === 1 ? registrations[0] : null;
  if (!registration && registrations.length > 1) {
    // Use sourceTextChannelId from session metadata for resolution
    const sourceChannel = (session as any).sourceTextChannelId;
    if (sourceChannel) {
      registration = registrations.find(r => r.registeredChannelId === sourceChannel) || null;
    }
  }
  if (registration) {
    teamTag = registration.teamTag || teamTag;
    knownPlayers = registration.knownPlayers || {};
  }
} catch (err) {
  logger.warn('Failed to look up registration', { error: String(err) });
}
```

### 6. `src/modules/processing/stages/voice-uploader.ts`

Currently calls `getRegistrationForGuild()` to get the registration for upload path determination. But the registration is already resolved by the pipeline before calling the uploader.

**Change:** The pipeline should pass the resolved registration to the uploader instead of having the uploader look it up again. Update the uploader's function signature to accept an optional `registration` parameter:

```typescript
export async function uploadVoiceRecordings(
  segments: SegmentMetadata[],
  teamTag: string,
  guildId: string,
  sessionId: string,
  registration?: BotRegistration | null,  // NEW: pre-resolved registration
): Promise<UploadResult> {
```

Then in `pipeline.ts`, pass the resolved registration:

```typescript
const uploadResult = await uploadVoiceRecordings(segments, teamTag, guildId, sessionId, registration);
```

### 7. `src/modules/scheduler/channels.ts`

The `syncGuildChannels()` function at line 107 queries by `guildId` + `limit(1)`. For multi-team guilds, it should sync channels for ALL registrations:

```typescript
export async function syncGuildChannels(
  db: Firestore,
  client: Client,
  guildId: string,
): Promise<void> {
  const snapshot = await db.collection('botRegistrations')
    .where('guildId', '==', guildId)
    .where('status', '==', 'active')
    .get();  // Remove .limit(1)

  if (snapshot.empty) return;

  const channels = await getTextChannels(client, guildId);
  for (const doc of snapshot.docs) {
    try {
      await doc.ref.update({
        availableChannels: channels,
        updatedAt: new Date(),
      });
    } catch (err) {
      logger.warn('Failed to sync channels for registration', {
        guildId, teamId: doc.data().teamId, error: String(err),
      });
    }
  }
}
```

---

## Session Metadata Schema Change

Add `sourceTextChannelId` to the `SessionMetadata` type in `src/modules/processing/types.ts`:

```typescript
interface SessionMetadata {
  // ... existing fields
  source_text_channel_id?: string;  // Text channel where /record start was run
}
```

---

## Verification

1. **Compile**: `npx tsc --noEmit`
2. **Single-team server**: `/record start` should work exactly as before. The single registration is returned without any channel matching.
3. **Multi-team server**: `/record start` from `#tranquility` should resolve to the Tranquility registration. Running from `#general` (unlinked channel) should still work if there's only one registration, but fail gracefully if multiple.
4. **Pipeline processing**: After recording, check that `session_metadata.json` contains `source_text_channel_id`. Verify the pipeline uses the correct team's `knownPlayers` for match pairing.
5. **Voice upload**: Verify uploads go to the correct team's storage path.

---

## What's NOT in this phase

- Guild sync changes (updating guildMembers on all registrations) — that's C3
- Disconnect changes (only leave guild if last team) — that's C3
- MatchScheduler UI changes — that's C4
