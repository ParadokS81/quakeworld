# Phase M4: Roster Sync — MatchScheduler Side

## Context

When a team's roster changes (player added, removed, or renamed), the Mumble users must stay in sync. The MatchScheduler side writes a `pendingSync` field to `mumbleConfig/{teamId}`, and quad processes it.

---

## What This Phase Builds

1. **Extend existing roster operations** to write `pendingSync` when Mumble is enabled

---

## Files to Modify

### `functions/team-operations.js`

#### In `addPhantomMember` (or any "add member to roster" path):

After successfully adding the member to the team roster, check if Mumble is enabled and write a sync request:

```javascript
// After roster update succeeds:
const mumbleConfig = await db.collection('mumbleConfig').doc(teamId).get();
if (mumbleConfig.exists && mumbleConfig.data().status === 'active') {
  await db.collection('mumbleConfig').doc(teamId).update({
    pendingSync: {
      action: 'add',
      userId: newMember.userId,
      displayName: newMember.displayName,
      discordUserId: newMember.discordUserId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

#### In `removePhantomMember` / `removeTeamMember`:

```javascript
// After roster removal succeeds:
const mumbleConfig = await db.collection('mumbleConfig').doc(teamId).get();
if (mumbleConfig.exists && mumbleConfig.data().status === 'active') {
  await db.collection('mumbleConfig').doc(teamId).update({
    pendingSync: {
      action: 'remove',
      userId: removedMember.userId,
      displayName: removedMember.displayName,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

#### In any "update display name" path:

If a user changes their QW display name (which affects their Mumble username):

```javascript
// After display name update propagated to roster:
// Find all teams this user is on
for (const teamId of userTeamIds) {
  const mumbleConfig = await db.collection('mumbleConfig').doc(teamId).get();
  if (mumbleConfig.exists && mumbleConfig.data().status === 'active') {
    await db.collection('mumbleConfig').doc(teamId).update({
      pendingSync: {
        action: 'rename',
        userId: userId,
        displayName: newDisplayName,
        oldDisplayName: oldDisplayName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
```

---

## Important: pendingSync is a single field, not a queue

The `pendingSync` field holds ONE operation at a time. quad processes it and clears it. If two roster changes happen rapidly, the second will overwrite the first before quad processes it.

This is acceptable for MVP because:
- Roster changes are infrequent (not real-time)
- If a sync is missed, the leader can disable/re-enable Mumble to force a full re-registration

If this becomes a problem later, switch to a subcollection (`mumbleConfig/{teamId}/syncQueue/{docId}`) — but that's over-engineering for now.

---

## Verification

1. **Add member**: Add phantom → verify `pendingSync` field appears on `mumbleConfig` doc with `action: 'add'`
2. **Remove member**: Remove member → verify `pendingSync` with `action: 'remove'`
3. **No Mumble**: If team doesn't have Mumble enabled, no `pendingSync` is written (no errors)
4. **Integration with quad**: After quad processes the sync, `pendingSync` field is cleared
