# Phase C3: Guild Sync & Disconnect for Multi-Team — quad Side

## Context

With multiple registrations per guild (C1) and channel-based resolution (C2), two modules still assume one-guild-one-team:

1. **Guild sync** — member join/leave events only update one registration's `guildMembers` cache
2. **Disconnect** — always leaves the guild, even if other teams still need the bot

This phase fixes both.

Read `COMMUNITY-SERVER-CONTRACT.md` for the full contract.

---

## What Changes

1. **Guild sync** updates `guildMembers` on ALL registrations for a guild (not just the first one)
2. **Disconnect** only leaves the guild if no other active registrations remain
3. **Second registration notification** — when a second team registers to a guild, disable auto-record on existing registrations (future-proofing for when auto-record is implemented)

---

## Files to Modify

### 1. `src/modules/registration/guild-sync.ts`

#### a) Replace `findRegistrationByGuildId()` with multi-result query

Current function (lines 7-17) uses `.limit(1)`. Replace with a function that returns all:

```typescript
async function findRegistrationsByGuildId(guildId: string) {
  const db = getDb();
  const snap = await db.collection('botRegistrations')
    .where('guildId', '==', guildId)
    .where('status', '==', 'active')
    .get();

  return snap.docs;  // Returns array, may be empty
}
```

#### b) Update `GuildMemberAdd` handler

Current code (lines 37-52) finds one registration and updates it. Change to update all:

```typescript
client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  if (member.user.id === client.user?.id) return;

  try {
    const regs = await findRegistrationsByGuildId(member.guild.id);
    if (regs.length === 0) return;

    const entry = memberToEntry(member);
    for (const reg of regs) {
      await reg.ref.update({
        [`guildMembers.${member.user.id}`]: entry,
      });
    }

    logger.info('Guild member added to cache', {
      guildId: member.guild.id,
      userId: member.user.id,
      username: member.user.username,
      registrationsUpdated: regs.length,
    });
  } catch (err) {
    logger.error('Failed to sync guild member add', {
      guildId: member.guild.id,
      userId: member.user.id,
      error: String(err),
    });
  }
});
```

#### c) Update `GuildMemberRemove` handler

Same pattern — update all registrations:

```typescript
client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
  try {
    const regs = await findRegistrationsByGuildId(member.guild.id);
    if (regs.length === 0) return;

    for (const reg of regs) {
      await reg.ref.update({
        [`guildMembers.${member.user!.id}`]: FieldValue.delete(),
      });
    }

    logger.info('Guild member removed from cache', {
      guildId: member.guild.id,
      userId: member.user!.id,
      registrationsUpdated: regs.length,
    });
  } catch (err) {
    logger.error('Failed to sync guild member remove', {
      guildId: member.guild.id,
      userId: member.user?.id,
      error: String(err),
    });
  }
});
```

#### d) `refreshAllGuildMembers()` — verify it already works

Current code (lines 91-128) queries `status == 'active'` and iterates all registrations. For multi-team guilds, each registration gets refreshed independently (same `guild.members.fetch()` result written to each). This already works correctly — but it fetches guild members redundantly for same-guild registrations.

**Optimization (optional):** Group registrations by `guildId`, fetch members once per guild, write to all:

```typescript
export async function refreshAllGuildMembers(client: Client): Promise<void> {
  const db = getDb();
  const regs = await db.collection('botRegistrations')
    .where('status', '==', 'active')
    .get();

  // Group by guildId to avoid redundant member fetches
  const byGuild = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const reg of regs.docs) {
    const guildId = reg.data().guildId as string | undefined;
    if (!guildId) continue;
    if (!byGuild.has(guildId)) byGuild.set(guildId, []);
    byGuild.get(guildId)!.push(reg);
  }

  let refreshed = 0;
  for (const [guildId, guildRegs] of byGuild) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn('Guild not in cache, skipping refresh', { guildId });
      continue;
    }

    try {
      const members = await guild.members.fetch();
      const cache = buildGuildMembersCache(client.user!.id, members);

      for (const reg of guildRegs) {
        await reg.ref.update({ guildMembers: cache });
        refreshed++;
      }

      logger.info('Refreshed guild members cache', {
        guildId,
        registrations: guildRegs.length,
        memberCount: Object.keys(cache).length,
      });
    } catch (err) {
      logger.error('Failed to refresh guild members', {
        guildId,
        error: String(err),
      });
    }
  }

  logger.info(`Guild member refresh complete: ${refreshed} registrations updated`);
}
```

---

### 2. `src/modules/registration/disconnect-listener.ts`

#### Change: Only leave guild if no other active registrations remain

In `handleDisconnectRequest()` (around line 69-115), after deleting the doc, check for remaining registrations before leaving the guild:

Current code:
```typescript
// Leave the Discord guild
const guild = client.guilds.cache.get(guildId);
if (guild) {
  const guildName = guild.name;
  await guild.leave();
  logger.info('Left guild', { guildId, guildName });
}
```

Replace with:
```typescript
// Check if other teams are still registered in this guild
const remainingRegs = await db.collection('botRegistrations')
  .where('guildId', '==', guildId)
  .where('status', '==', 'active')
  .limit(1)
  .get();

if (remainingRegs.empty) {
  // No other teams — leave the guild
  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    const guildName = guild.name;
    await guild.leave();
    logger.info('Left guild (last team disconnected)', { guildId, guildName });
  }
} else {
  logger.info('Other teams still registered — staying in guild', {
    guildId,
    remainingTeams: remainingRegs.size,
  });
}
```

**Important:** The doc is deleted BEFORE this check (line ~111: `await doc.ref.delete()`). So the query for remaining registrations correctly excludes the just-deleted doc. Move the delete before the guild-leave logic if it isn't already.

Verify the order in the current code:
1. Stop active recording ✓
2. Destroy voice connection ✓
3. Delete Firestore doc ← must happen before step 4
4. Check remaining registrations ← NEW
5. Leave guild only if no remaining ← NEW (conditional)

---

### 3. `src/modules/registration/register.ts` (minor addition)

#### When activating a second registration in a guild, disable auto-record on existing registrations

In `handleRegister()`, after the activation update, if other registrations exist in the guild with `autoRecord.enabled: true`, disable them:

```typescript
// After activation, check if this creates a multi-team guild
// If so, disable auto-record on all registrations in this guild (future-proofing)
if (otherTeamCount > 0) {
  const allRegs = await db.collection('botRegistrations')
    .where('guildId', '==', guildId)
    .where('status', '==', 'active')
    .get();

  for (const regDoc of allRegs.docs) {
    const regData = regDoc.data();
    if (regData.autoRecord?.enabled) {
      await regDoc.ref.update({
        'autoRecord.enabled': false,
        updatedAt: new Date(),
      });
      logger.info('Disabled auto-record for multi-team guild', {
        teamId: regData.teamId,
        guildId,
      });
    }
  }
}
```

This is optional / future-proofing since auto-record trigger isn't implemented yet. But it ensures the setting is correct if/when auto-record is built.

---

## Verification

1. **Compile**: `npx tsc --noEmit`
2. **Guild member sync**: Add a member to a Discord server with 2 registrations. Check that BOTH `botRegistrations` docs get the new `guildMembers` entry.
3. **Guild member remove**: Same test — remove a member, verify both docs updated.
4. **Disconnect with remaining teams**: Disconnect one team from a multi-team guild. Bot should stay in the guild. The disconnected team's `botRegistrations` doc should be deleted.
5. **Disconnect last team**: Disconnect the last remaining team. Bot should leave the guild.
6. **Startup refresh**: Restart bot. Verify `refreshAllGuildMembers` updates all registrations (check logs for registration count).

---

## What's NOT in this phase

- MatchScheduler UI changes — that's C4
- Auto-record trigger implementation — future feature, not part of this contract
