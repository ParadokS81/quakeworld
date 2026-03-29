# Phase C1: Multi-Team Registration — quad Side

## Context

Currently, `/register` rejects any guild that already has an active registration ("one guild = one team"). Community Discord servers like RetroRockets host multiple squads that need independent bot registrations. This phase removes that restriction and adds channel scoping so each registration knows which channel/category it was created from.

Read `docs/multi-clan/CONTRACT.md` for the full Community Server contract. The canonical version is at the orchestrator level in `COMMUNITY-SERVER-CONTRACT.md`.

---

## What Changes

1. **Remove the guild-already-registered rejection** in `/register` command
2. **Store channel scoping fields** on activation (`registeredChannelId`, `registeredCategoryId`, `registeredCategoryName`)
3. **Update the success reply** to mention channel scoping when other registrations exist in the same guild

---

## Files to Modify

### 1. `src/modules/registration/register.ts`

#### a) Add `registeredChannelId` and `registeredCategoryId` to the BotRegistration interface

The interface at the top of the file (around line 21-28) needs the new fields:

```typescript
export interface BotRegistration {
  teamId: string;
  teamTag: string;
  teamName: string;
  guildId: string;
  guildName: string;
  knownPlayers: Record<string, string>;
  registeredChannelId: string | null;      // NEW
  registeredCategoryId: string | null;     // NEW
  registeredCategoryName: string | null;   // NEW
}
```

Also update `getRegistrationForGuild()` (around line 31-48) to return the new fields:

```typescript
return {
  teamId: data.teamId,
  teamTag: data.teamTag,
  teamName: data.teamName,
  guildId: data.guildId,
  guildName: data.guildName,
  knownPlayers: data.knownPlayers || {},
  registeredChannelId: data.registeredChannelId || null,      // NEW
  registeredCategoryId: data.registeredCategoryId || null,     // NEW
  registeredCategoryName: data.registeredCategoryName || null, // NEW
};
```

#### b) Remove the guild-already-registered check

Delete lines 66-74 entirely (the `existingReg` check and rejection):

```typescript
// REMOVE THIS BLOCK:
const existingReg = await getRegistrationForGuild(guildId);
if (existingReg) {
  await interaction.reply({
    content: `This server is linked to **${existingReg.teamName}** (${existingReg.teamTag}). To change, disconnect from team settings on MatchScheduler first.`,
    flags: MessageFlags.Ephemeral,
  });
  return;
}
```

#### c) Add channel scoping fields to the activation update

In the `doc.ref.update()` call (around line 149-158), add the three new fields:

```typescript
await doc.ref.update({
  guildId,
  guildName,
  knownPlayers,
  guildMembers,
  availableChannels,
  notificationChannelId: defaultChannelId,
  notificationsEnabled: !!defaultChannelId,
  registeredChannelId: interaction.channelId,                           // NEW
  registeredCategoryId: interaction.channel?.parentId || null,          // NEW
  registeredCategoryName: interaction.channel?.parent?.name || null,    // NEW
  status: 'active',
  activatedAt: new Date(),
  updatedAt: new Date(),
});
```

Note: `interaction.channel` is a `TextChannel` when used in a guild. `parentId` is the category channel ID (or `null` if the channel is not in a category). Access `parent?.name` for the category name.

#### d) Update the success reply to mention multi-team context

After activation, check if there are other active registrations in this guild (around line 170+). Replace the current reply logic:

```typescript
// Check if other teams are registered in this guild
const otherRegs = await db.collection('botRegistrations')
  .where('guildId', '==', guildId)
  .where('status', '==', 'active')
  .get();
// Subtract 1 because we just activated our own
const otherTeamCount = otherRegs.size - 1;

const channelNote = otherTeamCount > 0
  ? `\nThis server has **${otherTeamCount + 1}** teams registered. Use \`/record start\` from this channel to start a recording session.`
  : '';

await interaction.reply({
  content: `This server is now linked to **${data.teamName}** (${data.teamTag}). Voice recordings from this server will be associated with your team.\n${mappingNote}${channelNote}${voiceWarning}`,
  flags: MessageFlags.Ephemeral,
});
```

#### e) Add new helper: `getRegistrationsForGuild()`

Add alongside the existing `getRegistrationForGuild()`:

```typescript
/** Get ALL active bot registrations for a guild. */
export async function getRegistrationsForGuild(guildId: string): Promise<BotRegistration[]> {
  const db = getDb();
  const snap = await db.collection('botRegistrations')
    .where('guildId', '==', guildId)
    .where('status', '==', 'active')
    .get();

  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      teamId: data.teamId,
      teamTag: data.teamTag,
      teamName: data.teamName,
      guildId: data.guildId,
      guildName: data.guildName,
      knownPlayers: data.knownPlayers || {},
      registeredChannelId: data.registeredChannelId || null,
      registeredCategoryId: data.registeredCategoryId || null,
      registeredCategoryName: data.registeredCategoryName || null,
    };
  });
}
```

This will be used by C2 and C3 phases. Exporting it now avoids a second touch of this file.

---

## Verification

1. **Compile**: `npx tsc --noEmit` — should pass with no errors
2. **Existing single-team flow**: `/register` in a clan server with no other registrations should work exactly as before (new fields are populated but have no effect)
3. **Multi-team flow**: `/register` in a guild that already has an active registration should now SUCCEED instead of rejecting
4. **Check the Firestore doc**: After `/register`, the `botRegistrations/{teamId}` doc should have `registeredChannelId`, `registeredCategoryId`, and `registeredCategoryName` populated
5. **Reply message**: When registering a second team in the same guild, the reply should mention the multi-team context

---

## What's NOT in this phase

- Updating callers of `getRegistrationForGuild()` to handle multiple registrations — that's C2
- Guild sync changes — that's C3
- MatchScheduler UI changes — that's C4
