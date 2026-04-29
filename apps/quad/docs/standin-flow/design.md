# Find Standin -- Discord DM Flow

## Overview

Extend the existing "Find standin" feature in MatchScheduler with a Discord DM feedback loop via the Quad bot. Team schedulers select available players from the standin finder, fire off requests through Quad, and get real-time yes/no responses -- all without leaving the scheduler.

## The Flow

```
MatchScheduler                    Firestore                     Quad Bot

1. Select candidates,
   click "Send requests"  ───►  standin_requests/{id}
                                 status: "pending"
                                 candidates: [...]

2.                               onSnapshot() ◄────────────────  listens
                                                            sends DMs
                                                         with Yes/No/OptOut

3. Player clicks Yes/No                                    updates doc
                                 responses.{odId}: ◄────────── "accepted"
                                   "accepted"|"declined"

4. UI updates instantly
   via onSnapshot()  ◄────────  real-time

5. Scheduler confirms           writes
   one player          ───►    status: "confirmed"
                               confirmedDiscordId: "..."

6.                               onSnapshot() ◄────────────────  listens
                                                            DMs confirmed:
                                                             "You're in!"
                                                            DMs others:
                                                             "Slot filled"

7. (optional) Candidate                                    updates doc
   clicks "Opt out"            standin_preferences/{odId} ◄──── writes
                                 optedOut: true

8. Blocked players shown
   as unavailable in UI  ◄──  onSnapshot()

9. Player manages prefs                                    (or via scheduler)
   on scheduler site  ────►  standin_preferences/{odId}
                               blockedUsers: [...]
                               blockedTeams: [...]
                               blockedDivisions: [...]
```

**odId** = a player's Discord user ID (stored as `discordUserId` in MatchScheduler user documents).

## Firestore Schema

### `standin_requests/{requestId}`

```typescript
{
  // Identity
  requestId: string,              // auto-generated doc ID
  status: "pending" | "confirmed" | "cancelled" | "expired",
  createdAt: Timestamp,
  expiresAt: Timestamp,           // auto-expire if match time passes

  // Who is asking
  requestedBy: {
    firebaseUid: string,          // scheduler's Firebase UID
    displayName: string,          // e.g. "ParadokS"
    teamId: string,               // Firestore team doc ID
    teamName: string,             // e.g. "Slackers"
    teamTag: string,              // e.g. "]sr["
    teamLogoUrl?: string,         // Firebase Storage URL (team-logos/{teamId}/)
  },

  // Match context
  match: {
    weekId: string,               // e.g. "2026-06"
    slotIds: string[],            // e.g. ["wed_2200"]
    displayTime: string,          // e.g. "Wed 22:00 CET" (human-readable)
    division: string,             // e.g. "D1"
    opponent?: string,            // e.g. "The Axemen" (if known)
  },

  // Candidates -- keyed by Discord user ID for easy bot lookup
  candidates: {
    [discordUserId: string]: {
      firebaseUid: string,        // for MatchScheduler cross-reference
      displayName: string,        // e.g. "bps"
      teamName: string,           // their team, e.g. "Suddendeath"
    }
  },

  // Responses -- written by Quad bot as players click buttons
  responses: {
    [discordUserId: string]: {
      status: "pending" | "accepted" | "declined",
      respondedAt?: Timestamp,
      dmDelivered: boolean,       // false if bot couldn't DM the user
      dmError?: string,           // e.g. "Cannot send messages to this user"
    }
  },

  // Confirmation
  confirmedDiscordId?: string,    // set when scheduler confirms a player
  confirmedAt?: Timestamp,
}
```

### `standin_preferences/{discordUserId}`

```typescript
{
  discordUserId: string,
  discordUsername: string,

  // Nuclear option -- block all standin requests
  optedOut: boolean,

  // Granular blocks -- empty arrays by default, player adds as needed
  blockedUsers: string[],         // Firebase UIDs -- block requests from specific people
  blockedTeams: string[],         // team doc IDs -- block requests from specific teams
  blockedDivisions: string[],     // e.g. ["D2", "D3"] -- block requests from these divs

  updatedAt: Timestamp,
}
```

No defaults. Players start with everything open. They add blocks as needed through
the scheduler preferences modal or via the DM opt-out button (which sets `optedOut: true`).

**Bot checks before sending a DM:**
1. `optedOut === true` -> skip
2. Requesting user's `firebaseUid` in `blockedUsers` -> skip
3. Requesting team's `teamId` in `blockedTeams` -> skip
4. Match `division` in `blockedDivisions` -> skip

If skipped, the response entry is written as `dmDelivered: false, dmError: "blocked_by_preferences"`
so the scheduler UI can show the player was filtered out.

## Discord DM Format

### Initial Request

```
┌──────────────────────────────────────────────┐
│  🎮 Standin Request                          │
│                                              │
│  Slackers ]sr[ is looking for a standin      │
│                                              │
│  🕐 Wed 22:00 CET                           │
│  🏆 Division 1                               │
│  ⚔️ vs The Axemen                            │
│                                              │
│  [[OK] Yes, I can play]  [❌ No thanks]         │
│                                              │
│  [[OK] Yes, I can play]  [❌ No thanks]         │
│                                              │
│  [🔕 Stop all requests]  [⚙️ Preferences ↗]  │
└──────────────────────────────────────────────┘
```

- Embed with team logo/color if available
- Action row 1: Yes, No buttons (primary actions)
- Action row 2: "Stop all requests" (grey, nuclear opt-out) + "Preferences" (Link button, opens scheduler)
- Button custom IDs: `standin_yes_{requestId}`, `standin_no_{requestId}`, `standin_stop_{requestId}`
- "Preferences" is a Discord Link button (opens URL, no bot handler needed)
- "Stop all" sets `optedOut: true`. Bot replies ephemeral: "Stopped. You can re-enable or fine-tune at [scheduler URL]."
- Granular blocking (by user/team/div) lives entirely on the scheduler -- keeps the DM to 4 buttons

### Deep-linked preferences URL

The "Preferences" link button opens the scheduler with a hash that triggers the preferences modal:

```
https://matchscheduler.app/#standin-preferences
```

With optional context from the request (so the modal can pre-suggest relevant blocks):

```
https://matchscheduler.app/#standin-preferences?teamId={requestingTeamId}&div={division}
```

The scheduler reads the hash on load:
1. Detect `#standin-preferences` -> open profile modal on the standin tab
2. If `teamId` query param present -> highlight "Block this team?" suggestion
3. If `div` query param present -> highlight "Block this division?" suggestion

No auto-blocking -- just surfaces the relevant options. Player decides.

### Confirmation DM (to accepted player)

```
┌──────────────────────────────────────────────┐
│  [OK] You're in!                                │
│                                              │
│  Slackers ]sr[ confirmed you as standin      │
│                                              │
│  🕐 Wed 22:00 CET                           │
│  ⚔️ vs The Axemen                            │
│                                              │
│  Join the voice channel when ready. glhf!    │
└──────────────────────────────────────────────┘
```

### Rejection DM (to other accepted candidates)

```
┌──────────────────────────────────────────────┐
│  Standin slot filled                         │
│                                              │
│  Slackers ]sr[ found a standin for           │
│  Wed 22:00 CET. Thanks for responding!       │
└──────────────────────────────────────────────┘
```

## Quad Bot -- `standin` Module

New module: `src/modules/standin/`

### Components

```
src/modules/standin/
├── index.ts              # BotModule: register interaction handler, Firestore listener
├── firestore.ts          # Firebase Admin SDK setup, shared across modules
├── listener.ts           # onSnapshot for standin_requests where status == "pending"
├── dm.ts                 # Build embeds + action rows, send DMs
└── interactions.ts       # Handle button clicks (yes/no/optout)
```

### Lifecycle

1. **onReady**: Start Firestore listener for new `standin_requests` with `status: "pending"`
2. **On new request**: For each candidate, check opt-out status, send DM, update `responses.{id}.dmDelivered`
3. **On button click**: Update `responses.{id}.status` in Firestore
4. **On status -> "confirmed"**: Send confirmation DM to chosen player, "slot filled" to others who accepted
5. **On status -> "cancelled"**: Optionally notify candidates
6. **onShutdown**: Detach Firestore listener

### Firebase Admin Setup

```typescript
// src/modules/standin/firestore.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
});

export const db = getFirestore(app);
```

New env vars:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}   # JSON string or path
```

### Commands

None initially. This module is event-driven (Firestore + Discord interactions).

Future:
- `/standin optout` -- opt out from within Discord
- `/standin optin` -- reverse an opt-out
- `/standin status` -- show pending requests (for the requesting team)

## MatchScheduler Changes

### UI Changes

1. **"Send requests" button** in the standin finder player list
   - Appears when 1+ players are selected (checkbox per player row)
   - Click -> writes `standin_requests` document to Firestore
   - Disabled if no candidates selected

2. **Request status panel**
   - Replaces or overlays the player list after sending
   - Shows each candidate with real-time status: ⏳ pending / [OK] accepted / ❌ declined / ⚠️ DM failed
   - "Confirm" button next to each accepted player
   - "Cancel request" button to abort

3. **Opt-out / block indicators**
   - Players who are blocked (any reason) shown with 🔕 icon in the standin finder list
   - Cannot be selected as candidates
   - Tooltip shows why: "Opted out", "Blocked your team", "Blocked D3", etc.
   - Read from `standin_preferences` collection

4. **Standin preferences panel** (in profile/settings modal)
   - Toggle: "Receive standin requests" (on/off -- maps to `optedOut`)
   - Blocked teams: list with ✕ remove buttons, "Add team" search/dropdown
   - Blocked divisions: checkboxes for D1/D2/D3
   - Blocked users: list with ✕ remove buttons (shows display names)
   - All changes write to `standin_preferences/{discordUserId}` immediately
   - No defaults -- everything starts open, player adds blocks as needed

### Code Changes

1. **StandinFinderService.js** -- add `sendRequests(candidates)` method
2. **TeamsBrowserPanel.js** -- add checkboxes, send button, status panel, block indicators
3. **New: StandinRequestService.js** -- Firestore read/write for `standin_requests`
4. **New: StandinPreferencesService.js** -- Firestore read/write for `standin_preferences`
5. **ProfileModal.js** -- add standin preferences section (toggle, block lists)

### Firestore Security Rules

```
match /standin_requests/{requestId} {
  // Any authenticated user can read (to see their own requests)
  allow read: if request.auth != null;
  // Only team schedulers can create/update
  allow create: if request.auth != null;
  allow update: if request.auth != null;
  // Bot uses Admin SDK -- bypasses rules entirely
}

match /standin_optouts/{odId} {
  // Readable by any authenticated user (to show indicators)
  allow read: if request.auth != null;
  // Only bot writes these (Admin SDK bypasses rules)
}
```

## Edge Cases

| Case | Handling |
|------|----------|
| Bot can't DM a user (DMs disabled) | Set `dmDelivered: false`, `dmError` in response. Show ⚠️ in UI. |
| Player responds after confirmation | Button handler checks request status first. If already confirmed, reply ephemeral "This request has been filled." |
| Request expires (match time passes) | Bot or Cloud Function sets `status: "expired"` based on `expiresAt`. Buttons stop working. |
| Multiple requests for same slot | Allowed. Each is independent. Scheduler's judgment. |
| Player opted out / blocked | Bot skips DM, sets `dmDelivered: false`, `dmError: "blocked_by_preferences"`. UI shows 🔕. |
| Player opts out mid-request | Preference stored. Current pending DMs already sent -- they can still respond. Future requests skip them. |
| Player blocks a team/div later | Only affects future requests. Existing pending requests unaffected. |
| Player re-enables after opt-out | Deletes or updates `standin_preferences` doc. Immediately available again. |
| Scheduler cancels request | Sets `status: "cancelled"`. Bot detects change, optionally DMs "request cancelled". |
| Bot restarts mid-request | Firestore listener re-attaches. Picks up any pending requests. Button interactions are stateless (read Firestore on click). |

## Dependencies

### Quad Bot (new)
- `firebase-admin` -- Firestore access

### MatchScheduler (existing)
- Already has Firebase SDK -- no new deps

## Config

### Quad `.env` additions
```
FIREBASE_SERVICE_ACCOUNT=./service-account.json
```

### MatchScheduler
No new config. Uses existing Firebase project.

## Implementation Order

### Phase 1: Quad bot standin module
1. Firebase Admin SDK setup (`firestore.ts`)
2. Firestore listener for new requests (`listener.ts`)
3. DM builder with embeds + buttons (`dm.ts`)
4. Button interaction handler (`interactions.ts`)
5. Module registration (`index.ts`)
6. Test with manually created Firestore documents

### Phase 2: MatchScheduler integration
1. `StandinRequestService.js` -- write requests, listen for updates
2. Player selection UI (checkboxes in standin finder)
3. "Send requests" button + request status panel
4. Opt-out indicators
5. "Confirm" / "Cancel" actions

### Phase 3: Polish
1. Expiration (Cloud Function or bot-side cron)
2. `/standin optout` and `/standin optin` Discord commands
3. Request history / audit log
4. Rate limiting (prevent spam)
