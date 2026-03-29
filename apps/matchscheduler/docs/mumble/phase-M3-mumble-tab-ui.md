# Phase M3: Mumble Tab UI — MatchScheduler

## Context

Phases M1 and M2 (quad side) established the Mumble connection, channel management, and user registration. This phase builds the MatchScheduler frontend and Cloud Functions that let team leaders enable Mumble and squad members onboard.

Read `docs/mumble/CONTRACT.md` for the contract reference. The full onboarding flow and UI mockups are in `../../MUMBLE-INTEGRATION-CONTRACT.md`.

---

## What This Phase Builds

1. **Cloud Functions**: `enableMumble` / `disableMumble` / `updateMumbleSettings`
2. **Frontend service**: `MumbleConfigService.js` — Firestore real-time listener
3. **UI**: New "Mumble" tab in `TeamManagementModal.js`
4. **Firestore rules**: Read access for squad members on `mumbleConfig`

---

## Files to Create

### 1. `functions/mumble-operations.js` — Cloud Functions

New file, follows the same pattern as `functions/bot-registration.js`.

#### `enableMumble({ teamId })`

Called when team leader clicks "Enable Mumble":

```javascript
// 1. Verify caller is team leader
// 2. Check no existing mumbleConfig for this team
// 3. Create mumbleConfig/{teamId} doc:
{
  teamId,
  teamTag: team.teamTag,
  teamName: team.teamName,
  enabledBy: userId,
  status: 'pending',
  mumbleUsers: {},
  autoRecord: true,
  channelId: null,
  channelName: null,
  channelPath: null,
  serverAddress: null,
  serverPort: null,
  recordingBotJoined: false,
  errorMessage: null,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  activatedAt: null,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}
// 4. Return { status: 'pending' }
// quad's Firestore listener will pick this up and create the channel + register users
```

#### `disableMumble({ teamId })`

Called when team leader clicks "Disable Mumble":

```javascript
// 1. Verify caller is team leader
// 2. Update mumbleConfig/{teamId}:
{
  status: 'disabling',
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}
// quad's listener will delete the Mumble channel + unregister users,
// then delete or mark the doc as disabled
```

#### `updateMumbleSettings({ teamId, autoRecord })`

Toggle auto-record:

```javascript
// 1. Verify caller is team leader or scheduler
// 2. Update mumbleConfig/{teamId}.autoRecord
```

#### Register in `functions/index.js`

Export the new callable functions alongside existing ones:

```javascript
const mumbleOps = require('./mumble-operations');
exports.enableMumble = functions.region('europe-west3').https.onCall(mumbleOps.enableMumble);
exports.disableMumble = functions.region('europe-west3').https.onCall(mumbleOps.disableMumble);
exports.updateMumbleSettings = functions.region('europe-west3').https.onCall(mumbleOps.updateMumbleSettings);
```

---

### 2. `public/js/services/MumbleConfigService.js` — Frontend service

Follows the same pattern as `BotRegistrationService.js`. Real-time Firestore listener for `mumbleConfig/{teamId}`.

```javascript
// Key interface:

class MumbleConfigService {
  constructor() {
    this._listeners = new Map();  // teamId → unsubscribe
    this._cache = new Map();      // teamId → mumbleConfig data
    this._callbacks = [];
  }

  // Start listening for a team's Mumble config
  listenToTeam(teamId) {
    // Firestore onSnapshot on mumbleConfig/{teamId}
    // Update cache, notify callbacks
  }

  // Stop listening
  stopListening(teamId) { ... }

  // Get cached config
  getConfig(teamId) { return this._cache.get(teamId) || null; }

  // Subscribe to changes
  onChange(callback) { ... }

  // Helper: get current user's Mumble join URL
  getJoinUrl(teamId, userId) {
    const config = this.getConfig(teamId);
    if (!config || config.status !== 'active') return null;

    const userEntry = config.mumbleUsers?.[userId];
    if (!userEntry) return null;

    const { serverAddress, serverPort, channelPath } = config;

    if (userEntry.certificatePinned) {
      // Returning user: generic link (cert handles auth)
      return `mumble://${serverAddress}:${serverPort}/${channelPath}`;
    } else {
      // First-time: personalized link with credentials
      const encodedUser = encodeURIComponent(userEntry.mumbleUsername);
      const encodedPass = encodeURIComponent(userEntry.tempPassword);
      return `mumble://${encodedUser}:${encodedPass}@${serverAddress}:${serverPort}/${channelPath}`;
    }
  }
}
```

Register as a singleton in the service initialization (same pattern as other services).

---

### 3. Extend `public/js/components/TeamManagementModal.js` — Mumble tab

Add a new tab "Mumble" alongside existing tabs (Discord, Schedule, Recordings, Members).

#### Tab registration

Find where tabs are defined (likely in `_initTabs()` or the modal constructor). Add:

```javascript
{
  id: 'mumble',
  label: 'Mumble',
  icon: '🎙️',  // or a headset icon — match existing tab style
  init: () => this._initMumbleTab(),
  requiresLeader: false,  // All members see it (they need their join link)
}
```

#### `_initMumbleTab()` — Tab content renderer

Reads `MumbleConfigService.getConfig(teamId)` and renders one of three states:

**State 1: Not enabled** (no `mumbleConfig` doc, or leader hasn't enabled)
```
Show only if user is team leader:
  - Heading: "Mumble Voice Server"
  - Description: "Give your team a private Mumble channel with automatic voice recording."
  - [Enable Mumble] button → calls enableMumble CF

Show if user is NOT leader:
  - "Mumble is not enabled for this team. Ask your team leader to enable it."
```

**State 2: Pending** (`status === 'pending'`)
```
- "Setting up Mumble channel..."
- Spinner/loading indicator
- (Auto-updates when quad finishes setup and status becomes 'active')
```

**State 3: Active** (`status === 'active'`)
```
Section 1: Connection info
  - "Mumble Voice Server" + ● Active badge
  - "Channel: Teams/{channelPath}"

Section 2: User's join button (personalized)
  - If user NOT in mumbleUsers: "You're not registered for Mumble. Contact your team leader."
  - If user in mumbleUsers AND NOT certificatePinned:
    - "Connect your Mumble client:"
    - "1. Install Mumble if needed: [Download link]"
    - "2. Click to connect (first time only):"
    - [Connect to Mumble] button → opens personalized mumble:// URL
    - "After first connect, your client remembers you."
  - If user in mumbleUsers AND certificatePinned:
    - "Connected as: {mumbleUsername} ✓"
    - [Join Channel] button → opens generic mumble:// URL
    - Show the generic URL as copyable text

Section 3: Squad members status
  - List each mumbleUser entry:
    - ✓ name (if certificatePinned)
    - ○ name [not yet connected] (if not pinned)
  - "3/5 linked" summary

Section 4: Settings (leader only)
  - Auto-record toggle
  - [Disable Mumble] button (with confirmation)
```

**State 4: Error** (`status === 'error'`)
```
- "Failed to set up Mumble channel"
- Show errorMessage
- [Retry] button → calls disableMumble then enableMumble
```

---

### 4. `firestore.rules` — Add mumbleConfig rules

```
match /mumbleConfig/{teamId} {
  // All team members can read (need to see their join credentials)
  allow read: if request.auth != null
    && (get(/databases/$(database)/documents/teams/$(teamId)).data.leaderId == request.auth.uid
        || request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.schedulerIds
        || exists(/databases/$(database)/documents/teams/$(teamId))
           && request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.playerRoster.map(p, p.userId));

  // All writes via Cloud Functions or Admin SDK only
  allow write: if false;
}
```

**Note**: The `playerRoster.map()` approach may not work in Firestore rules (rules have limited expression support). Alternative: store a `memberIds` array on the team doc and check `request.auth.uid in get(...).data.memberIds`. Or use a simpler rule: any authenticated user who is on any team can read any mumbleConfig — since the doc contains no sensitive data beyond temp passwords (which are one-time and cleared after first use).

Simpler fallback rule:
```
match /mumbleConfig/{teamId} {
  // Any authenticated user can read
  // (temp passwords are one-time and auto-cleared after cert pinning)
  allow read: if request.auth != null;
  allow write: if false;
}
```

---

## Verification

1. **Deploy functions**: `npm run deploy:functions`
2. **Enable Mumble**: As team leader, open team settings → Mumble tab → click "Enable Mumble"
3. **Pending state**: UI shows "Setting up..." with spinner
4. **Active state**: After quad processes the config (may take a few seconds), UI updates to show channel info + join links
5. **Join link**: Click "Connect to Mumble" → Mumble client opens with pre-filled credentials
6. **After first connect**: UI updates to show "Connected as: ParadokS ✓" (once quad pins the cert)
7. **Generic link**: After cert pinning, the join button shows the generic URL (no credentials)
8. **Member status**: Shows which squad members have/haven't connected
9. **Disable**: Leader clicks "Disable Mumble" → channel removed, config cleared

---

## What's NOT in this phase

- Roster sync (adding/removing users when roster changes) — M4
- Discord `/mumble` command for sharing join links — M6
- Guest/standin access tokens — Future
