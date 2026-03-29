# Community Server Support — Cross-Project Contract

> Extends the bot registration model from "one guild = one team" to "one guild = many teams."
> Community Discord servers (like RetroRockets) can host multiple independent squads,
> each with their own schedule channel, notifications, and voice recordings.
> Normal clan servers continue to work unchanged — this is a restriction removal, not a new mode.
> Reference copies should be placed in each project's `docs/multi-clan/` folder.

---

## Overview

**Problem:** Discord communities like RetroRockets house multiple squads that rotate between
tournaments. Each squad has its own channel and voice setup within a single Discord server.
Currently the bot enforces one team per server, blocking these communities from using it.

**Solution:** Remove the one-guild-one-team restriction. Allow multiple `botRegistrations` docs
to share the same `guildId`. Each registration is scoped to the channel where `/register` was run,
giving the bot context to resolve which team a voice channel or text channel belongs to.

**Key principle:** There is no "community mode" toggle. Any Discord server can have multiple teams.
A clan server with one team never notices the change. The multiplicity is emergent — it happens
when a second team runs `/register` in the same server.

**Flow for a normal clan (unchanged experience):**
1. Team leader clicks "Connect Bot" in MatchScheduler
2. Invites bot to their Discord server
3. Runs `/register` in any channel
4. Done — works exactly like today

**Flow for a community squad:**
1. Team leader clicks "Connect Bot" in MatchScheduler
2. Bot is already in the server (invited by community admin or another team leader)
3. MatchScheduler detects this and shows: "Bot is already in [ServerName]. Run `/register` in your team's channel."
4. Team leader runs `/register` in their squad channel (e.g. `#tranquility`)
5. Bot links the registration to that channel and its parent category
6. Done — schedule, notifications, recordings all scoped to that team

---

## Schema Changes

### Modified: `/botRegistrations/{teamId}`

New fields for channel scoping:

```typescript
interface BotRegistrationDocument {
  // --- Existing fields (unchanged) ---
  teamId: string;
  teamTag: string;
  teamName: string;
  authorizedDiscordUserIds: string[];
  registeredBy: string;
  guildId: string | null;
  guildName: string | null;
  status: 'pending' | 'active' | 'disconnecting';
  knownPlayers: { [discordUserId: string]: string };
  guildMembers: { [discordUserId: string]: GuildMember };
  availableChannels: AvailableChannel[];
  notifications: NotificationSettings;
  scheduleChannel: { channelId: string | null };
  autoRecord?: AutoRecordSettings;
  createdAt: Timestamp;
  activatedAt: Timestamp | null;
  updatedAt: Timestamp;

  // --- NEW: Channel scoping ---
  registeredChannelId: string | null;   // The text channel where /register was run
  registeredCategoryId: string | null;  // Parent category of that channel (null if uncategorized)
  registeredCategoryName: string | null; // Category name for display purposes
}
```

**Why both channel and category?**
- `registeredChannelId` — exact channel for audit/display ("registered from #tranquility")
- `registeredCategoryId` — used for voice recording resolution (voice channels share the same category as the squad's text channels)
- Category is the primary scoping mechanism. Channel is informational.

**For single-team servers:** Both fields are populated but never consulted — the bot finds only one registration for the guild, so scoping is unnecessary.

**For multi-team servers:** The category is used to resolve which team a voice channel belongs to.

### No new collections

No new Firestore collections needed. The existing `botRegistrations/{teamId}` structure (keyed by teamId, queried by guildId) naturally supports multiple docs per guild.

---

## Registration Flow Changes

### Current `/register` flow (quad)

```
/register runs
  → Query: botRegistrations WHERE authorizedDiscordUserIds contains userId AND status == 'pending'
  → Found? Activate with guildId
  → But FIRST: check getRegistrationForGuild(guildId)
     → If exists: REJECT "This server is already linked to [team]"   ← THIS GOES AWAY
```

### New `/register` flow (quad)

```
/register runs in #tranquility
  │
  ▼
Query: botRegistrations WHERE authorizedDiscordUserIds contains userId AND status == 'pending'
  │
  ├─ No match → "No pending registration. Start from team settings on MatchScheduler."
  │
  ▼─ Match found (e.g. Tranquility registration)
  │
  ▼
Activate registration:
  guildId: interaction.guildId
  guildName: interaction.guild.name
  registeredChannelId: interaction.channelId
  registeredCategoryId: interaction.channel.parentId (or null)
  registeredCategoryName: interaction.channel.parent?.name (or null)
  status: 'active'
  activatedAt: now
  │
  ▼
Build knownPlayers (same as today)
Build guildMembers (same as today — OR reuse from existing registration, see below)
Discover availableChannels (same as today)
  │
  ▼
Reply: "✓ Linked **Tranquility** to this channel."
  (If other registrations exist in this guild: "This server has multiple teams.
   Use `/record start` from this channel to start a recording session.")
```

### Removed: The guild-already-registered check

The `getRegistrationForGuild(guildId)` check + rejection in `handleRegister()` is **removed entirely**. Multiple teams can register to the same guild.

### guildMembers optimization

When a second team registers to a guild that already has an active registration, the `guildMembers` cache is identical (same server, same members). Options:

- **Option A (simple):** Each registration stores its own copy. ~4KB per team, acceptable.
- **Option B (optimized):** Second+ registrations skip `guildMembers` and share via a query. Adds complexity.

**Recommendation:** Option A for now. Duplicate is small. Guild sync events already update all registrations for a guild (the event handler queries all active registrations for the guildId, not just one).

---

## Team Resolution Changes (quad)

### Current: `getRegistrationForGuild(guildId)`

```typescript
// Returns single registration or null
export async function getRegistrationForGuild(guildId: string): Promise<BotRegistration | null>
```

### New: `getRegistrationsForGuild(guildId)` + `resolveTeamForChannel(guildId, channelId)`

```typescript
// Returns ALL active registrations for a guild
export async function getRegistrationsForGuild(guildId: string): Promise<BotRegistration[]>

// Resolves the correct registration for a specific channel context
// Used by recording, processing, and notification modules
export async function resolveRegistrationForChannel(
  guildId: string,
  channelId: string,  // voice or text channel ID
  client: Client      // Discord client for channel lookup
): Promise<BotRegistration | null> {
  const registrations = await getRegistrationsForGuild(guildId);

  if (registrations.length === 0) return null;
  if (registrations.length === 1) return registrations[0]; // No ambiguity

  // Multiple registrations — resolve by category
  const channel = await client.channels.fetch(channelId);
  const categoryId = channel?.parentId;

  if (categoryId) {
    const match = registrations.find(r => r.registeredCategoryId === categoryId);
    if (match) return match;
  }

  // Fallback: no category match (voice channel not in any team's category)
  // Return null — recording won't be tagged to a team
  return null;
}
```

### Callers that need updating

| File | Current call | New behavior |
|------|-------------|--------------|
| `register.ts:65` | `getRegistrationForGuild()` → reject if exists | **Remove check entirely** |
| `pipeline.ts:180` | `getRegistrationForGuild(guildId)` | `resolveRegistrationForChannel(guildId, voiceChannelId, client)` |
| `firestore-tracker.ts:74` | `getRegistrationForGuild(guildId)` | `resolveRegistrationForChannel(guildId, voiceChannelId, client)` |
| `metadata.ts:42` | `getRegistrationForGuild(guildId)` | `resolveRegistrationForChannel(guildId, voiceChannelId, client)` |
| `voice-uploader.ts:186` | `getRegistrationForGuild(guildId)` | Uses registration already resolved by pipeline — pass through |
| `guild-sync.ts:7` | `findRegistrationByGuildId(guildId)` → `limit(1)` | Query all registrations for guild, update `guildMembers` on all |
| `channels.ts:107` | Query by guildId + `limit(1)` | Query by guildId, return all — or use teamId directly if available |

### Recording: Auto-record vs Manual record

The recording approach depends on whether the guild has one or multiple registrations:

```
User joins voice channel
  │
  ▼
Bot queries: how many active registrations for this guildId?
  │
  ├─ 1 registration → AUTO-RECORD works (same as today)
  │    No ambiguity. The one team owns all voice activity.
  │    autoRecord settings on that registration apply normally.
  │
  └─ 2+ registrations → AUTO-RECORD DISABLED
       Voice join is ignored. Recording requires /record start
       from a squad text channel (see below).
```

**Why not try to guess the team?** Community servers like RetroRockets share voice channels
across squads (e.g. "Kepler", "Herschel" are in the "internal" category, not the squad category).
Category-based resolution fails. knownPlayers overlap is unreliable for mixed practices.
Rather than guess wrong, require explicit intent.

### `/record start` in multi-team servers

```
Player runs /record start in #tranquility
  │
  ▼
Bot resolves: which registration owns this channel?
  → Match by registeredChannelId (exact match)
  → Or match by registeredCategoryId (channel is in the team's category)
  │
  ▼
Found: Tranquility registration
  │
  ▼
Bot checks: is the user in a voice channel?
  → YES: join that voice channel, start recording, tag session as Tranquility
  → NO: "Join a voice channel first, then run /record start"
  │
  ▼
Session uses Tranquility's knownPlayers for name resolution
Upload goes to Tranquility's storage path
```

**This is clean because:**
- The text channel IS the team context — no guessing
- Voice channels can be shared across squads without ambiguity
- The team leader explicitly declares "this is our session"
- knownPlayers resolution uses the correct team's mapping
- Works regardless of Discord server channel/category layout

**For single-team servers:** `/record start` also works (it just resolves to the only team).
So the command is universal — auto-record is the convenience layer for simple setups.

**From an unlinked channel (e.g. #general in a multi-team server):**
`/record start` fails with: "This channel isn't linked to a team. Run `/record start` from your team's channel."
Only applies when 2+ registrations exist. Single-team servers resolve any channel to the one team.

### Auto-record setting on multi-team registrations

When a second registration is added to a guild, any existing `autoRecord.enabled: true` on
registrations in that guild should be **automatically disabled** with a notification to the
team leader: "Auto-recording has been disabled because multiple teams now share this server.
Use `/record start` from your team's channel instead."

If the guild drops back to one registration (others disconnect), auto-record can be re-enabled
manually by the remaining team leader — but it should NOT auto-re-enable, to avoid surprise.

---

## MatchScheduler UI Changes

### "Connect Bot" button: Detect bot presence

When team leader clicks "Connect Bot", before showing the invite link:

```
Cloud Function: manageBotRegistration({ action: 'connect', teamId })
  │
  ▼
After creating the pending registration, query:
  botRegistrations WHERE status == 'active'
  │
  ▼
For each active registration, check:
  Does the current user's discordUserId appear in that registration's guildMembers?
  │
  ├─ YES (found in 1+ guilds):
  │    Return: { status: 'pending', botAlreadyInGuilds: ['RetroRockets', ...] }
  │
  └─ NO (not in any guild with bot):
       Return: { status: 'pending', botAlreadyInGuilds: [] }
```

### UI: Two instruction variants

**Variant A: Bot not in any of your servers** (same as today)
```
⏳ Pending — complete setup in Discord

1. Add the bot to your server → [Invite Bot →]
2. Run /register in your team's channel
```

**Variant B: Bot already in server(s) you're in**
```
⏳ Pending — complete setup in Discord

The bot is already in these servers:
  • RetroRockets
  • [Other Server]

→ Run /register in your team's channel.

Or invite to a different server: [Invite Bot →]
```

Both variants always show the invite link — it's just deprioritized when the bot is already present.

### Firestore Rules: Allow schedulers to read registration

Current rule only allows the team leader to read. Schedulers (who may also be authorized to run `/register`) should be able to read too:

```
match /botRegistrations/{teamId} {
  allow read: if request.auth != null
    && (get(/databases/$(database)/documents/teams/$(teamId)).data.leaderId == request.auth.uid
        || request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.schedulerIds);
  allow write: if false;
}
```

(This may already be the case — verify during implementation.)

---

## Guild Member Sync Changes

### Current: Updates one registration per guild

`guild-sync.ts` uses `findRegistrationByGuildId()` with `limit(1)` — only updates one registration's `guildMembers` when a member joins/leaves.

### New: Updates ALL registrations for the guild

```typescript
// On guildMemberAdd / guildMemberRemove:
const registrations = await getRegistrationsForGuild(guildId);
for (const reg of registrations) {
  // Update guildMembers on each registration
  await db.collection('botRegistrations').doc(reg.teamId).update({
    [`guildMembers.${member.id}`]: memberData, // or FieldValue.delete() for remove
    updatedAt: FieldValue.serverTimestamp(),
  });
}
```

### On bot startup: Refresh all registrations

`refreshAllGuildMembers()` currently queries `status == 'active'` and iterates. This already works for multiple registrations per guild — each gets refreshed independently. No change needed, but verify.

---

## Disconnect Flow

### Current: Disconnect deletes registration, bot leaves guild

### New: Disconnect deletes registration, bot leaves guild ONLY IF no other teams remain

```
Team leader disconnects Tranquility
  │
  ▼
Cloud Function sets status: 'disconnecting'
  │
  ▼
quad disconnect-listener picks it up:
  1. Stop any active recording for this team (if applicable)
  2. Delete the botRegistrations doc
  3. Check: are there other active registrations for this guildId?
     ├─ YES → Stay in guild. Other teams still need the bot.
     └─ NO  → Leave guild (current behavior).
```

---

## Phase Plan

| Phase | Project | Scope | Depends on |
|-------|---------|-------|------------|
| **C1** | quad | Remove one-guild-one-team restriction: drop the rejection check in `/register`, add `registeredChannelId` / `registeredCategoryId` fields on activation, update reply message | — |
| **C2** | quad | Multi-registration resolution: replace `getRegistrationForGuild` with `getRegistrationsForGuild` + `resolveRegistrationForChannel`. Update all 5 callers (pipeline, firestore-tracker, metadata, voice-uploader, channels) | C1 |
| **C3** | quad | Guild sync for multiple registrations: update `guild-sync.ts` to write `guildMembers` to all registrations for a guild. Update disconnect to only leave guild if last team | C2 |
| **C4** | MatchScheduler | "Connect Bot" UI: detect bot presence in user's servers, show appropriate instructions (invite link vs "run /register") | C1 |
| **C5** | Both | Testing: register two teams to the same test server, verify schedule channels work independently, verify recording resolution, verify disconnect doesn't boot bot if other teams remain | C1-C4 |

### What's NOT in scope (future enhancements)

- **Per-registration voice channel mapping** — explicitly assigning voice channels to teams. For now, use category-based resolution with knownPlayers fallback.
- **Community admin dashboard** — no special UI for community admins. They just invite the bot; team leaders self-serve from there.
- **Shared guildMembers** — deduplicating the guild member cache across registrations. Duplication is acceptable at current scale.

---

## Migration Notes

- **No data migration needed.** Existing `botRegistrations` docs don't have the new fields — they default to `null`, which means "whole server" scope. Single-team servers continue to work via the "only one registration → no ambiguity" path.
- **No breaking changes.** The `/register` command behavior is strictly more permissive (allows what it previously rejected). Existing registrations are untouched.
- **Firestore indexes:** May need a composite index for `guildId + status` if not already present (for `getRegistrationsForGuild` queries). Check existing indexes.
- **SCHEMA.md** in MatchScheduler should be updated when C1 lands (new fields on botRegistrations).
- **CROSS-PROJECT-SCHEMA.md** should be updated to note that `guildId` is no longer unique across active registrations.
