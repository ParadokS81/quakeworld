# Phase M4: Roster Sync — quad Side

## Context

M1-M2 set up channels and user registration. M3 built the MatchScheduler UI. When the roster changes (player added/removed/renamed in MatchScheduler), the Mumble users must stay in sync. The MatchScheduler CF writes a `pendingSync` field to `mumbleConfig/{teamId}`, and quad processes it.

---

## What This Phase Builds

1. **Roster sync listener**: Watch for `pendingSync` changes on `mumbleConfig` docs
2. **Add user**: Register new Mumble user + add ACL entry
3. **Remove user**: Unregister Mumble user + remove ACL entry
4. **Rename user**: Update Mumble registration (username change)

---

## File to Create

### `src/modules/mumble/roster-sync.ts`

Listens for `pendingSync` field changes on active `mumbleConfig` docs.

```typescript
// pendingSync structure (written by MatchScheduler CF):
interface PendingSync {
  action: 'add' | 'remove' | 'rename';
  userId: string;           // Firebase UID
  displayName: string;      // QW display name (current)
  oldDisplayName?: string;  // Previous name (for rename)
  discordUserId?: string;   // If available
  timestamp: Timestamp;
}
```

**Processing logic:**

```typescript
async handleSync(teamId: string, sync: PendingSync, config: MumbleConfig): Promise<void> {
  switch (sync.action) {
    case 'add': {
      // 1. Register Mumble user: username = displayName, password = random
      const mumbleUserId = await iceClient.registerUser(sync.displayName, tempPassword);
      // 2. Add ACL entry to team channel
      await addUserToChannelACL(config.channelId, mumbleUserId);
      // 3. Update mumbleConfig.mumbleUsers[userId]
      await updateMumbleUser(teamId, sync.userId, {
        mumbleUsername: sync.displayName,
        mumbleUserId,
        tempPassword,
        certificatePinned: false,
        linkedAt: null,
      });
      break;
    }

    case 'remove': {
      const userEntry = config.mumbleUsers[sync.userId];
      if (userEntry) {
        // 1. Remove ACL entry
        await removeUserFromChannelACL(config.channelId, userEntry.mumbleUserId);
        // 2. Unregister Mumble user
        await iceClient.unregisterUser(userEntry.mumbleUserId);
        // 3. Remove from mumbleConfig.mumbleUsers
        await removeMumbleUser(teamId, sync.userId);
        // 4. Clear mumbleLinked on user profile
        await clearUserMumbleLink(sync.userId);
      }
      break;
    }

    case 'rename': {
      const userEntry = config.mumbleUsers[sync.userId];
      if (userEntry) {
        // 1. Update Mumble registration: new username
        await iceClient.updateRegistration(userEntry.mumbleUserId, {
          UserName: sync.displayName,
        });
        // 2. Update mumbleConfig.mumbleUsers[userId].mumbleUsername
        await updateMumbleUser(teamId, sync.userId, {
          mumbleUsername: sync.displayName,
        });
        // 3. Update user profile mumbleUsername
        await db.collection('users').doc(sync.userId).update({
          mumbleUsername: sync.displayName,
        });
      }
      break;
    }
  }

  // Clear pendingSync after processing
  await db.collection('mumbleConfig').doc(teamId).update({
    pendingSync: admin.firestore.FieldValue.delete(),
    updatedAt: new Date(),
  });
}
```

---

## Extend Firestore Listener

Add `pendingSync` watching to the existing `config-listener.ts`:

```typescript
// Listen for changes to active configs (not just pending ones)
db.collection('mumbleConfig')
  .where('status', '==', 'active')
  .onSnapshot(snapshot => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'modified') {
        const data = change.doc.data();
        if (data.pendingSync) {
          this.rosterSync.handleSync(data.teamId, data.pendingSync, data);
        }
      }
    }
  });
```

---

## Verification

1. **Add member**: Add a phantom member to the team in MatchScheduler → verify Mumble user appears, can connect with temp password
2. **Remove member**: Remove a member → verify Mumble user is unregistered, can no longer connect
3. **Rename**: Change a member's display name → verify Mumble username updates
4. **No orphans**: After remove, `mumbleUsers` entry is gone, `mumbleLinked` cleared on user doc

---

## What's NOT in this phase

- Recording bot (M5)
- Pipeline integration (M6)
