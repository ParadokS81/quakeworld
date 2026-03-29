# Phase M1: Murmur Connection + Channel Management — quad

## Context

We're adding Mumble voice support to the QW ecosystem. A Mumble server is already running at `83.172.66.214:64738` (Docker container `mumble` in the same docker-compose as quad). This phase establishes the connection to Murmur and builds the channel management layer.

Read `docs/mumble/CONTRACT.md` for the contract reference. The canonical version is `../../MUMBLE-INTEGRATION-CONTRACT.md`.

The recording bot research is at `docs/mumble-recording-research.md` — it recommends `@tf2pickup-org/mumble-client` for the control plane.

---

## What This Phase Builds

1. **New module**: `src/modules/mumble/` with Murmur protocol client connection
2. **Channel management**: Create/delete team channels on Mumble server
3. **Firestore listener**: Watch `mumbleConfig` collection for `status: 'pending'` → create channel → update to `status: 'active'`
4. **Docker config**: Enable ICE API on the Mumble container (port 6502, internal only)
5. **New env vars**: Mumble connection config

---

## Prerequisites

### Enable ICE on the Mumble container

Update `docker-compose.yml` mumble service to enable the ICE admin API:

```yaml
mumble:
  # ... existing config ...
  environment:
    # ... existing env vars ...
    MUMBLE_CONFIG_ICE: "tcp -h 0.0.0.0 -p 6502"
    MUMBLE_CONFIG_ICESECRETWRITE: "${MUMBLE_ICE_SECRET}"
  expose:
    - "6502"   # ICE API — internal Docker network only, not public
```

Add to `.env`:
```env
MUMBLE_ICE_SECRET=your-ice-secret-here
```

This isn't used in M1 (protocol client doesn't need ICE), but setting it up now avoids redeploying later for M2.

---

## New Dependencies

```bash
npm install @tf2pickup-org/mumble-client
```

This is the only actively maintained TypeScript Mumble library (1.2k downloads/week, last published Feb 2026). It handles:
- TLS connection to Murmur
- Authentication (username + password or certificate)
- Channel management (create, delete, move)
- User state tracking (who's online, which channel)
- Server sync (full state on connect)

It does NOT handle voice audio (that's M5, custom implementation).

---

## New Environment Variables

Add to `.env.example` and `.env`:

```env
# Mumble server connection
MUMBLE_HOST=mumble              # Docker service name (or IP for dev)
MUMBLE_PORT=64738               # Default Mumble port
MUMBLE_BOT_USERNAME=QuadBot     # Bot's display name on Mumble
MUMBLE_PASSWORD=quakeworld      # Server password
MUMBLE_ICE_SECRET=              # ICE admin API secret (used in M2)
```

---

## Files to Create

### 1. `src/modules/mumble/index.ts` — Module entry point

Follows the same `BotModule` pattern as other modules. This module:
- Connects to Mumble server on `onReady()`
- Listens for Firestore changes on `mumbleConfig` collection
- Creates/deletes channels based on Firestore state
- Cleans up on `onShutdown()`

```typescript
// Module skeleton — adapt to match the BotModule interface pattern
// used by other modules (see src/modules/recording/index.ts for reference)

import { BotModule } from '../../types';
import { MumbleManager } from './mumble-manager';

const mumbleManager = new MumbleManager();

export const mumbleModule: BotModule = {
  name: 'mumble',
  commands: [],  // No Discord slash commands in M1

  async handleCommand(interaction) {
    // No commands yet
  },

  registerEvents(client) {
    // No Discord events needed
  },

  async onReady(client) {
    await mumbleManager.connect();
    mumbleManager.startFirestoreListener();
  },

  async onShutdown() {
    mumbleManager.stopFirestoreListener();
    await mumbleManager.disconnect();
  },
};
```

### 2. `src/modules/mumble/mumble-manager.ts` — Core connection manager

Manages the Mumble client connection and exposes channel operations.

Key responsibilities:
- Connect to Murmur using `@tf2pickup-org/mumble-client`
- Authenticate as bot user (with server password)
- On connect: sync channel state, find or create "Teams" root channel
- Expose `createTeamChannel(teamTag, teamName)` and `deleteTeamChannel(channelId)`
- Handle reconnection on disconnect
- Log connection state

**Channel structure on Mumble server:**
```
Root
└── Teams                    ← Created once by bot (or pre-created)
    ├── sr                   ← Team ]sr[ channel
    ├── 4k                   ← Team 4k channel
    └── ...
```

**Channel naming:**
- Channel name: team tag stripped of special chars (e.g. `]sr[` → `sr`, `4k` stays `4k`)
- Channel description: full team name (e.g. "Slackers")
- `channelPath` stored in Firestore: `Teams/sr` (used in `mumble://` URLs)

```typescript
// Key methods to implement:

async connect(): Promise<void>
// Connect to MUMBLE_HOST:MUMBLE_PORT with MUMBLE_BOT_USERNAME and MUMBLE_PASSWORD
// Use @tf2pickup-org/mumble-client
// On success: log connected, sync channels
// On disconnect: log, attempt reconnect after delay

async createTeamChannel(teamTag: string, teamName: string): Promise<{
  channelId: number;
  channelName: string;
  channelPath: string;
}>
// 1. Sanitize tag for channel name: strip brackets, special chars
// 2. Find "Teams" parent channel (create if missing)
// 3. Create subchannel under "Teams"
// 4. Set channel description to teamName
// 5. Return channel info

async deleteTeamChannel(channelId: number): Promise<void>
// Remove channel from Mumble server

async disconnect(): Promise<void>
// Clean disconnect from Mumble
```

### 3. `src/modules/mumble/config-listener.ts` — Firestore listener

Watches `mumbleConfig` collection for documents with `status: 'pending'` and processes them.

```typescript
// Firestore listener pattern — same as src/modules/availability/listener.ts

import { getDb } from '../../core/firebase';
import { MumbleManager } from './mumble-manager';

export class MumbleConfigListener {
  private unsubscribe: (() => void) | null = null;

  constructor(private mumbleManager: MumbleManager) {}

  start(): void {
    const db = getDb();
    this.unsubscribe = db.collection('mumbleConfig')
      .where('status', '==', 'pending')
      .onSnapshot(snapshot => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            this.handlePendingConfig(change.doc);
          }
        }
      });
  }

  private async handlePendingConfig(doc: FirebaseFirestore.DocumentSnapshot): Promise<void> {
    const data = doc.data()!;
    const { teamId, teamTag, teamName } = data;

    try {
      // Create channel on Mumble server
      const channel = await this.mumbleManager.createTeamChannel(teamTag, teamName);

      // Update Firestore with channel info + active status
      await doc.ref.update({
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelPath: channel.channelPath,
        serverAddress: process.env.MUMBLE_HOST || '83.172.66.214',
        serverPort: parseInt(process.env.MUMBLE_PORT || '64738'),
        status: 'active',
        activatedAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`Mumble channel created for team ${teamTag}: ${channel.channelPath}`);
    } catch (error) {
      // Mark as error so the UI shows the failure
      await doc.ref.update({
        status: 'error',
        errorMessage: error.message,
        updatedAt: new Date(),
      });
      logger.error(`Failed to create Mumble channel for ${teamTag}:`, error);
    }
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
```

Also handle `status: 'disabling'` (team leader disables Mumble):
- Delete the Mumble channel
- Delete the Firestore doc (or mark as disabled)

---

## Register the Module

Add the mumble module to the bot's module loader. Check how other modules are registered (likely in `src/bot.ts` or `src/index.ts` — look for where `recordingModule`, `processingModule` etc. are imported and added to the modules array).

Only load the module if `MUMBLE_HOST` is set (graceful skip if Mumble isn't configured):

```typescript
if (process.env.MUMBLE_HOST) {
  modules.push(mumbleModule);
}
```

---

## Verification

1. **Compile**: `npx tsc --noEmit` — no errors
2. **Connect**: Bot starts, connects to Mumble server, logs "Connected to Mumble at mumble:64738"
3. **Channel state**: Bot logs existing channels on connect (shows it synced)
4. **Create channel**: Write a test `mumbleConfig` doc to Firestore with `status: 'pending'`:
   ```javascript
   // In Firebase console or via script:
   db.collection('mumbleConfig').doc('test-team-id').set({
     teamId: 'test-team-id',
     teamTag: ']sr[',
     teamName: 'Slackers',
     enabledBy: 'test-uid',
     status: 'pending',
     mumbleUsers: {},
     createdAt: new Date(),
     updatedAt: new Date(),
   });
   ```
5. **Verify**: The doc updates to `status: 'active'` with `channelId`, `channelName: 'sr'`, `channelPath: 'Teams/sr'`
6. **Mumble client**: Connect with a Mumble client — the "Teams/sr" channel should be visible

---

## What's NOT in this phase

- User registration with passwords (M2 — needs ICE)
- ACL management / access control (M2)
- Certificate pinning (M2)
- MatchScheduler UI (M3)
- Roster sync (M4)
- Recording bot / audio capture (M5)
- Processing pipeline changes (M6)
