# Post-Review Fixes — MatchScheduler

Cross-project review found 1 bug on the MatchScheduler side.

---

## Fix 1 (HIGH): `joinTeam` missing pendingSync for Mumble

When a player joins a team via join code, the `joinTeam` Cloud Function does NOT write a `pendingSync: 'add'` to `mumbleConfig/{teamId}`. This means join-code members never get a Mumble user account — no temp password, no ACL entry, no onboarding link in the Mumble tab.

All other roster operations already write pendingSync correctly:
- `addPhantomMember` → pendingSync `'add'` ✓ (team-operations.js:1810-1823)
- `removePhantomMember` → pendingSync `'remove'` ✓ (team-operations.js:1879-1891)
- Leave team → pendingSync `'remove'` ✓ (team-operations.js:790-804)
- Kick player → pendingSync `'remove'` ✓ (team-operations.js:942-954)
- Display name change → pendingSync `'rename'` ✓ (user-profile.js:384-404)

### Where to fix

`functions/team-operations.js` — in the `joinTeam` function, after the player is successfully added to the roster.

### How to fix

Follow the same pattern as `addPhantomMember`. After the roster update succeeds:

```javascript
// After successfully adding member to team roster:
const mumbleConfig = await db.collection('mumbleConfig').doc(teamId).get();
if (mumbleConfig.exists && mumbleConfig.data().status === 'active') {
  await db.collection('mumbleConfig').doc(teamId).update({
    pendingSync: {
      action: 'add',
      userId: uid,                    // The joining user's Firebase UID
      displayName: userDisplayName,   // Their QW display name
      discordUserId: null,            // Or their Discord ID if available from user profile
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

Key points:
- Check `mumbleConfig.exists && status === 'active'` before writing (same guard as other operations)
- The `displayName` should be the user's QW display name (this becomes their Mumble username)
- `discordUserId` can be null or the user's Discord ID if available from their user profile
- quad's roster-sync listener will pick this up, register the Mumble user, and clear pendingSync

### Verify
1. Join a team that has Mumble enabled via join code
2. Check Firestore: `mumbleConfig/{teamId}` should have a `pendingSync` field with `action: 'add'`
3. After quad processes it: the user should appear in `mumbleUsers` map with a temp password
4. In MatchScheduler UI: the new member should see their personalized Mumble join link in the Mumble tab
5. Regression: joining a team WITHOUT Mumble enabled should work normally (no pendingSync written, no errors)
