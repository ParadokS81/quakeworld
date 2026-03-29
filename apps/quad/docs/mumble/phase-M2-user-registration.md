# Phase M2: User Registration + Certificate Pinning — quad

## Context

M1 established the Mumble connection and channel management. This phase adds user registration via ICE and the certificate pinning flow that enables the frictionless onboarding experience.

Read `docs/mumble/CONTRACT.md` for the contract reference. The onboarding flow is detailed in `../../MUMBLE-INTEGRATION-CONTRACT.md`.

---

## What This Phase Builds

1. **ICE client**: Connect to Murmur's ICE admin API (port 6502) for user registration
2. **User manager**: Register/unregister Mumble users with username + temporary password
3. **Session monitor**: Detect new Mumble connections, pin certificates, clear temp passwords
4. **Firestore updates**: Write `mumbleUsers` entries + update user profiles on cert pinning

---

## ICE Setup

### Get the Slice definition

Download `MumbleServer.ice` from the Mumble repo (this defines all ICE operations):

```bash
# From the Mumble GitHub repo — matches our Murmur 1.5.857
curl -o src/modules/mumble/MumbleServer.ice \
  https://raw.githubusercontent.com/mumble-voip/mumble/master/src/murmur/MumbleServer.ice
```

### Generate JavaScript stubs

```bash
npx slice2js src/modules/mumble/MumbleServer.ice --output-dir src/modules/mumble/generated/
```

This produces JavaScript classes that represent the ICE interface. The `ice` npm package provides the runtime.

### New dependency

```bash
npm install ice
```

**Note**: The `ice` package (v3.7.100) is large (~15MB) and has no TypeScript types. If this proves problematic, the fallback is a lightweight Python ICE sidecar (see contract Open Question #5). Evaluate during implementation.

---

## Files to Create/Modify

### 1. `src/modules/mumble/ice-client.ts` — ICE connection wrapper

Connects to Murmur's ICE interface and wraps operations in typed methods.

```typescript
// Key methods:

async connect(): Promise<void>
// Connect to mumble:6502 with ICE_SECRET
// Get server proxy (virtual server ID 1)

async registerUser(username: string, password: string): Promise<number>
// ICE: server.registerUser({ 'UserName': username, 'UserPassword': password })
// Returns: Mumble user ID (integer)

async unregisterUser(mumbleUserId: number): Promise<void>
// ICE: server.unregisterUser(mumbleUserId)

async updateRegistration(mumbleUserId: number, updates: Record<string, string>): Promise<void>
// ICE: server.updateRegistration(mumbleUserId, updates)
// Used for: rename (UserName), password change (UserPassword)

async getRegisteredUsers(filter?: string): Promise<Map<number, string>>
// ICE: server.getRegisteredUsers(filter)
// Returns: Map of mumbleUserId → username

async setACL(channelId: number, acls: ACLEntry[]): Promise<void>
// ICE: server.setACL(channelId, acls, groups, inherit)
// Used for: restricting channel access to registered team members

async getACL(channelId: number): Promise<{ acls: ACLEntry[], groups: Group[] }>
// ICE: server.getACL(channelId)

async addCallback(callback: ServerCallback): Promise<void>
// ICE: server.addCallback(callback)
// Used for: detecting user connect/disconnect events (cert pinning)

async disconnect(): Promise<void>
// Clean disconnect from ICE
```

### 2. `src/modules/mumble/user-manager.ts` — User registration logic

Manages the lifecycle of Mumble user accounts tied to MatchScheduler roster members.

```typescript
// Called during M1's config activation (extend handlePendingConfig)
// AFTER channel is created, register all team members

async registerTeamUsers(teamId: string, channelId: number): Promise<void> {
  // 1. Read team roster from Firestore: /teams/{teamId}
  const teamDoc = await db.collection('teams').doc(teamId).get();
  const roster = teamDoc.data()?.playerRoster || [];

  const mumbleUsers: Record<string, MumbleUserEntry> = {};

  for (const member of roster) {
    // 2. Generate temp password (8 random alphanumeric chars)
    const tempPassword = crypto.randomBytes(6).toString('base64url').slice(0, 8);

    // 3. Register on Mumble via ICE
    //    Username = member.displayName (their QW name)
    const mumbleUserId = await iceClient.registerUser(member.displayName, tempPassword);

    // 4. Add ACL entry: this user can join the team channel
    //    (batch ACL update after all users registered)

    // 5. Build mumbleUsers map entry
    mumbleUsers[member.userId] = {
      mumbleUsername: member.displayName,
      mumbleUserId,
      tempPassword,
      certificatePinned: false,
      linkedAt: null,
    };
  }

  // 6. Set channel ACL: deny all by default, allow registered team members
  await setTeamChannelACL(channelId, Object.values(mumbleUsers));

  // 7. Write all mumbleUsers to Firestore
  await db.collection('mumbleConfig').doc(teamId).update({
    mumbleUsers,
    updatedAt: new Date(),
  });
}
```

**ACL structure** for team channels:
```
Channel: Teams/sr
  - Deny all: @all group cannot enter
  - Allow: each registered team member can enter + speak
  - Allow: QuadBot (recording bot) can enter + speak
```

### 3. `src/modules/mumble/session-monitor.ts` — Certificate pinning

Monitors Mumble connections and pins certificates for first-time users.

**How cert pinning works in Mumble:**
1. User connects with username + temp password → Murmur authenticates
2. The user's Mumble client has a self-generated certificate (unique per install)
3. After successful auth, Murmur stores the certificate hash with the registered user
4. Future connections: certificate alone identifies the user, no password needed

**Detection approaches** (try in order):
1. **ICE callbacks** (`addCallback` → `userConnected`): Get notified when a user joins. Check if their registered user has `certificatePinned: false`. If they connected successfully, their cert is now pinned by Murmur automatically.
2. **Polling** (fallback): Periodically check connected users vs. `mumbleConfig.mumbleUsers` entries where `certificatePinned: false`.

```typescript
async onUserConnected(mumbleUserId: number, sessionId: number): Promise<void> {
  // 1. Find which team + Firebase user this Mumble user belongs to
  //    Query mumbleConfig where mumbleUsers contains this mumbleUserId

  // 2. If found and certificatePinned === false:
  //    a. Update mumbleConfig.mumbleUsers[userId].certificatePinned = true
  //    b. Clear tempPassword (no longer needed)
  //    c. Set linkedAt = now
  //    d. Update /users/{userId}: mumbleLinked = true, mumbleUsername, mumbleLinkedAt

  // 3. Log: "Certificate pinned for ParadokS (team ]sr[)"
}
```

### 4. Extend `src/modules/mumble/config-listener.ts`

The M1 listener handles `status: 'pending'` → create channel. Extend it to also call `registerTeamUsers()` after channel creation:

```typescript
private async handlePendingConfig(doc): Promise<void> {
  // ... existing M1 code: create channel ...

  // NEW: Register all team members on Mumble
  await this.userManager.registerTeamUsers(teamId, channel.channelId);

  // Update status to active (already in M1, but now includes mumbleUsers)
  await doc.ref.update({
    // ... existing channel fields from M1 ...
    status: 'active',
    activatedAt: new Date(),
    updatedAt: new Date(),
  });
}
```

---

## Integration with M1

This phase extends M1's module. The `mumble-manager.ts` from M1 gains:
- ICE client initialization (alongside protocol client)
- User manager (called during config activation)
- Session monitor (started on connect)

The module `index.ts` `onReady()` now:
1. Connect protocol client (M1)
2. Connect ICE client (M2)
3. Start Firestore listener (M1, extended in M2)
4. Start session monitor (M2)

---

## Verification

1. **Compile**: `npx tsc --noEmit`
2. **ICE connection**: Bot logs "Connected to Murmur ICE at mumble:6502"
3. **User registration**: Create a `mumbleConfig` doc with `status: 'pending'`. After activation, `mumbleUsers` should contain entries for each roster member with `tempPassword` set and `certificatePinned: false`
4. **Mumble client test**: Connect with one of the registered usernames + temp password. Should succeed.
5. **Cert pinning**: After connecting, the `mumbleUsers` entry should update to `certificatePinned: true`, `tempPassword: null`. The `/users/{userId}` doc should have `mumbleLinked: true`.
6. **Second connect**: Disconnect and reconnect without password. Certificate should authenticate automatically.
7. **ACL test**: Try connecting as an unregistered user. Should be denied access to team channels.

---

## What's NOT in this phase

- MatchScheduler UI for showing credentials / join links (M3)
- Roster sync (add/remove users on roster changes) (M4)
- Recording bot / audio capture (M5)
- Processing pipeline changes (M6)
