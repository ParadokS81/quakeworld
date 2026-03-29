# Schedule Channel — Product Requirements Document

> Discord-native availability management and match visibility for QW teams.
> Bridges MatchScheduler's scheduling system into Discord via a dedicated `#schedule` channel per registered team.

---

## Problem

Players must visit matchscheduler.web.app to see who's available and manage their availability. Most QW players live in Discord — the extra step reduces engagement. Team leaders can't quickly glance at availability without opening a browser.

## Solution

A dedicated `#schedule` channel in each registered Discord server, managed by the Quad bot:

1. **Persistent grid message** — Canvas-rendered availability image, auto-updated via Firestore listener. Always visible as the single message in the channel.
2. **Interactive buttons/dropdowns** — Players mark availability directly from Discord. Two-step flow: pick day → pick time slots.
3. **Event posts in notification channel** — Challenges, confirmations, scheduled matches posted to the existing notification channel (already implemented by scheduler module).

## Non-Goals (for now)

- Full proposal/confirmation workflow in Discord (complex multi-step, better on the site)
- Template management from Discord
- Managing other players' availability (leader/scheduler-only actions stay on the site)
- Cross-team browsing or comparison from Discord
- Per-slot away marking (whole-day only for v1)
- Next-week preview (current week only for v1)

---

## User Experience

### The #schedule Channel

A dedicated channel where only the bot posts. Members can interact via components but cannot send messages. Contains a single persistent message:

```
┌──────────────────────────────────────────────────┐
│  [Canvas-rendered availability grid — PNG image]  │
│                                                   │
│  Shows: full week, past days dimmed               │
│  Player initials colored per-player               │
│  Today column highlighted                         │
│  4+ players = match-ready (purple background)     │
│  Scheduled matches shown in cells                 │
└──────────────────────────────────────────────────┘

Embed: ]SR[ · Week 8 · Feb 16-22
       Upcoming: vs Book — Sat 21st 21:00 CET
       Open proposals: vs Suddendeath (3 viable slots)

Row 1: [-Me This Week]
Row 2: [📅 Edit day...                              ▼]
```

**Component layout** (2 of 5 allowed action rows):
- **Row 1**: Button — clear all availability for the week (the only bulk action worth a shortcut)
- **Row 2**: StringSelectMenu — day picker for granular slot editing (the core interaction)

### Flow: Edit a Specific Day

1. **User clicks "Edit day" dropdown** — shows 7 days with current availability summary per day:
   ```
   Mon 17th (past)
   Tue 18th (past)
   Wed 19th (past)
   Thu 20th — you: 21:30-23:00
   Fri 21st — you: 20:00-21:00
   Sat 22nd — you: 20:00-23:00
   Sun 23rd
   ```
   Past days are shown but labeled "(past)" — selecting one returns an ephemeral "This day has passed" message.

2. **User picks a day** — bot responds with an **ephemeral message** (only visible to the user) containing a multi-select dropdown of time slots:
   ```
   Friday Feb 21st
   Select which times you're available:

   ┌─────────────────────────────┐
   │ ☐ 19:00 CET                │
   │ ☐ 19:30 CET                │
   │ ☑ 20:00 CET  ← current    │
   │ ☑ 20:30 CET  ← current    │
   │ ☑ 21:00 CET  ← current    │
   │ ☐ 21:30 CET                │
   │ ☐ 22:00 CET                │
   │ ☐ 22:30 CET                │
   │ ☐ 23:00 CET                │
   └─────────────────────────────┘
   ```
   Current available slots are **pre-selected** via `StringSelectMenu` default values.

3. **User modifies selections and closes dropdown** — Discord fires the interaction with all checked values. No separate confirm button needed.

4. **Bot diffs** new selections vs current state → writes adds/removes to Firestore atomically. If selections are unchanged (user opened and closed without changing), the bot skips the write entirely — no no-op Firestore operations.

5. **Ephemeral updates** with confirmation:
   ```
   ✓ Friday updated
   Added: 21:30, 22:00
   Removed: 20:00

   [📅 Edit another day ▼]  [Dismiss]
   ```

6. **Firestore onSnapshot fires** → canvas re-renders → persistent grid message updates for everyone.

### Flow: Clear All (-Me This Week)

The only shortcut button on the persistent message. Clears **all** availability and away marks for the entire week in one click. Useful when going on vacation or dropping out for the week — clearing 7 days one-by-one via Edit Day would be tedious.

Bot responds with ephemeral confirmation: "Cleared all your availability for Week 8."

### Flow: Error States

| Situation | Response |
|-----------|----------|
| User not linked to MatchScheduler | Ephemeral: "Link your Discord account at matchscheduler.web.app first" |
| User not on this team | Ephemeral: "You're not a member of {teamName} on MatchScheduler" |
| Bot not registered for this guild | No schedule message posted |
| Persistent message deleted | Re-post on next availability change or bot restart |
| Schedule channel deleted | Bot catches `DiscordAPIError: Unknown Channel`, nulls out `scheduleChannelId` on the registration, logs warning |
| Bot removed and re-added to guild | On re-ready, detects stale `scheduleMessageId`, posts fresh message |
| Firestore write fails | Ephemeral: "Failed to update — try again" |
| Availability doc doesn't exist yet (new week) | Bot creates it with `set({ merge: true })` on first write |

---

## Data Architecture

### Identity Chain

```
Discord interaction.user.id ("123456789012345678")
    ↓  query: users where discordUserId == X
Firebase UID (document ID in /users/{uid})
    ↓  check: users/{uid}.teams[teamId] === true
Team membership verified
    ↓  write: availability/{teamId}_{weekId}.slots.{slotId} arrayUnion(uid)
Availability updated
```

The bot uses **Firebase Admin SDK** (service account) to write directly to Firestore — no Cloud Function call needed. Admin SDK bypasses security rules. The bot performs its own team membership validation.

### User Resolution & Caching

```typescript
// Per-guild cache: discordUserId → { uid, displayName, teamId, initials }
// Populated on first interaction, refreshed on cache miss
// Cache TTL: 1 hour (team membership rarely changes mid-session)

async function resolveUser(discordUserId: string, teamId: string): Promise<ResolvedUser | null> {
  const snap = await db.collection('users')
    .where('discordUserId', '==', discordUserId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc.data().teams?.[teamId]) return null;
  return { uid: doc.id, displayName: doc.data().displayName, initials: doc.data().initials };
}
```

### Firestore Writes (matching existing Cloud Function logic)

The bot replicates the same atomic write pattern as `updateAvailability` Cloud Function:

```typescript
// Action: "add" — mark available
updateData[`slots.${slotId}`] = FieldValue.arrayUnion(uid);
updateData[`unavailable.${slotId}`] = FieldValue.arrayRemove(uid);  // mutual exclusion

// Action: "remove" — clear
updateData[`slots.${slotId}`] = FieldValue.arrayRemove(uid);

// Action: "markUnavailable" — mark away
updateData[`unavailable.${slotId}`] = FieldValue.arrayUnion(uid);
updateData[`slots.${slotId}`] = FieldValue.arrayRemove(uid);  // mutual exclusion

// All writes include:
updateData.lastUpdated = FieldValue.serverTimestamp();
```

**Document creation**: If the availability document for the current week doesn't exist (new week, no one has marked availability yet), the bot uses `set({ merge: true })` instead of `update()` to create it. This mirrors how the Cloud Function handles first-write-of-the-week.

**Slot format**: `{day}_{HHMM}` in UTC (e.g., `fri_1900`).
**Week format**: `YYYY-WW` ISO week (e.g., `2026-08`).
**Document ID**: `{teamId}_{weekId}` (e.g., `abc123_2026-08`).

### Timezone Handling

- Firestore stores **UTC** slot IDs
- Discord displays **CET/CEST** (matching the MatchScheduler default — conscious simplification for the ~300 European QW players)
- Conversion: the existing scheduler module already has CET↔UTC logic in `time.ts`
- Base display range: 19:00-23:00 CET (= 18:00-22:00 UTC winter, 17:00-21:00 UTC summer)

---

## Firestore Schema Changes

### Modified: `/botRegistrations/{teamId}`

Add two fields (flat, consistent with existing `notificationChannelId` pattern):

```typescript
interface BotRegistrationDocument {
  // ... existing fields (guildId, notificationChannelId, availableChannels, etc.) ...

  // NEW — schedule channel configuration
  scheduleChannelId: string | null;    // Discord channel ID for the persistent grid
  scheduleMessageId: string | null;    // Message ID of the persistent grid (for editing)
}
```

No new collections needed. All reads/writes use existing `availability/{teamId}_{weekId}` and `teams/{teamId}` collections.

### Read Paths (bot needs)

| Collection | Purpose | Frequency |
|------------|---------|-----------|
| `availability/{teamId}_{weekId}` | Current week's availability (onSnapshot) | Real-time listener |
| `teams/{teamId}` | Roster, initials, team tag | On startup + cache |
| `users` (query by discordUserId) | Identity resolution | On interaction + cache |
| `botRegistrations/{teamId}` | Channel config, known players | On startup + listener for config changes |
| `scheduledMatches` (query by teamId) | Upcoming matches for embed text | On change / periodic |
| `matchProposals` (query by teamId) | Open proposals for embed text | On change / periodic |

### Write Paths (bot writes)

| Collection | Purpose | Trigger |
|------------|---------|---------|
| `availability/{teamId}_{weekId}` | Add/remove/away slots | User interaction |
| `botRegistrations/{teamId}` | Store scheduleMessageId | Message post / recovery |

Note: `scheduleChannelId` is written by MatchScheduler (team settings UI), not by the bot. The bot only writes `scheduleMessageId` after posting the persistent message.

---

## Canvas Grid Renderer

### Design Approach

The canvas renders a hybrid between the MatchScheduler desktop and mobile views — optimized for Discord's image display constraints (~520px wide on desktop Discord, ~350px on mobile Discord).

**Render resolution**: 800×480 pixels (displays crisp on both desktop and mobile Discord).

### Visual Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│                     ]SR[ · Week 8 · Feb 16-22                        │
├──────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┤
│      │ Mon 16 │ Tue 17 │ Wed 18 │ Thu 19 │ Fri 20 │ Sat 21 │ Sun 22 │
├──────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│19:00 │        │        │        │        │   P    │        │        │
│19:30 │        │        │        │        │   P    │        │        │
│20:00 │  P R   │  P R   │  P R   │  P R   │   P    │   P    │  P R   │
│20:30 │  P R   │  P R   │  P R   │  P R   │   P    │   P    │  P R   │
│21:00 │  P R   │  P R   │  P R   │  P R   │   P    │   P    │  P R   │
│21:30 │  P R   │ G P R  │  P R   │ GPRZ   │   P    │  G P   │ ⚔ vs… │
│22:00 │ P R Z  │ GPRZ   │ P R Z  │ GPRZ   │  P Z   │  GPZ   │ GPRZ   │
│22:30 │ P R Z  │ GPRZ   │ P R Z  │ GPRZ   │  P Z   │  GPZ   │ GPRZ   │
│23:00 │ P R Z  │ GPRZ   │ P R Z  │ GPRZ   │  P Z   │  GPZ   │ ⚔ vs… │
├──────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┤
│  P ParadokS   R Razor   Z Zero   G Grisling                         │
└──────────────────────────────────────────────────────────────────────┘

 ◄ past days dimmed ►│◄ today highlighted ►│◄ future days normal ►
```

### Color Palette (matches MatchScheduler dark theme)

| Element | Color | Source |
|---------|-------|--------|
| Background | `#1a1b2e` | MatchScheduler `--background` |
| Cell (empty) | `#2d2f45` | `--muted` equivalent |
| Cell border | `#4a4d6a` | `--border` equivalent |
| Cell (match-ready, 4+ players) | `#4a3d8f` | `oklch(0.36 0.08 277)` |
| Cell (scheduled match) | `#5b4fa0` | `oklch(0.45 0.12 277)` |
| Text (headers, times) | `#e0e0e0` | `--foreground` |
| Today column header | `#8b7cf0` | `--primary` |
| Past day columns | 30% opacity overlay | Matches desktop `past-slot` treatment |

**Player initial colors** (deterministic 6-color palette from `PlayerColorService`):

| Color | Hex | Hue |
|-------|-----|-----|
| Red | `#E06666` | 0° |
| Yellow | `#FFD966` | 60° |
| Green | `#93C47D` | 120° |
| Teal | `#76A5AF` | 180° |
| Blue | `#6D9EEB` | 240° |
| Pink | `#C27BA0` | 300° |

Assignment: hash `userId` to one of the 6 colors. Consistent across renders (same user = same color always). The bot doesn't need to read per-viewer `playerColors` from Firestore — it uses a single deterministic mapping for all viewers, since the Discord image is the same for everyone (unlike the web app where each user can customize colors).

### Rendering Rules

- **Full week always shown** (Mon-Sun) — provides full context at a glance
- **Past days**: Dimmed with 30% opacity overlay. Still visible but clearly distinguished
- **Today column**: Header text in primary purple, subtle left border highlight
- **Match-ready cells** (4+ available players): Purple background (`#4a3d8f`)
- **Scheduled matches**: Saturated purple cell (`#5b4fa0`) with "⚔ vs TAG" text replacing initials
- **Player initials**: Colored per the 6-color palette above, bold, centered in cell
- **Unavailable players**: Not shown in cells (they're explicitly "away" — showing them would be confusing)
- **Player count badge**: Small superscript number in match-ready cells (like the desktop view)
- **Legend row**: Bottom of image, maps initial → display name with matching color
- **Team header**: Top row with team tag, week number, date range

### Technology

- **`@napi-rs/canvas`** — Pure Rust bindings, no system dependencies, works in Docker without cairo/pango. CPU-only rendering (the RTX 4090 is irrelevant here).
- Image attached to message via `AttachmentBuilder` in discord.js

### Update Debouncing

Multiple rapid Firestore changes (e.g., user adding 5 slots via +Me) should not trigger 5 re-renders:
- Debounce: **3-second window** after last Firestore change before re-rendering
- If the bot itself wrote the change, it can set a flag to expect the echo — still debounces but doesn't add extra delay

---

## Embed Content (text below the image)

The Discord embed below the canvas image shows context that doesn't need to be rendered as pixels:

```
]SR[ · Week 8 · Feb 16-22
━━━━━━━━━━━━━━━━━━━━━━━

📋 YOUR MATCHES
  vs Book — Sat 21st 21:00 CET
  vs Suddendeath — Sun 22nd 23:00 CET

📨 OPEN PROPOSALS
  vs Suddendeath — 3 viable slots (view on site)

Last updated: 2 min ago
```

**Data sources**:
- `scheduledMatches` collection, filtered by `teamId` + current/future dates
- `matchProposals` collection, filtered by `teamId` + `status: 'pending'`

These can be polled periodically (every 5 min) rather than requiring real-time listeners — match data changes infrequently compared to availability.

---

## Channel Setup Flow

### How a team gets #schedule

1. **Team leader creates a channel** in their Discord server (e.g., `#schedule`, `#availability`, or any name they choose)
2. **Bot syncs channel list** — `channels.ts` already writes `availableChannels` to `botRegistrations/{teamId}` on startup and periodically. The new channel appears in this list.
3. **Leader selects it in MatchScheduler** — Team Settings → Discord tab → "Schedule channel" dropdown (same pattern as the existing "Notification channel" dropdown). Writes `scheduleChannelId` to `botRegistrations/{teamId}`.
4. **Bot detects the change** — listener on `botRegistrations/{teamId}` sees `scheduleChannelId` set, starts the availability listener, renders the grid, and posts the persistent message. Stores the resulting `scheduleMessageId` back.

**No auto-creation**. Teams manage their own Discord channels. The bot only needs to post in the channel they choose.

### Channel Permissions

The bot needs these Discord permissions in the schedule channel:
- `ViewChannel` — see the channel
- `SendMessages` — post the persistent message
- `EmbedLinks` — for the embed content
- `AttachFiles` — for the canvas PNG image (**new requirement** — not in current bot invite permissions)

**Bot invite permissions update**: Current permission integer `3148800` needs `AttachFiles` (bit 15 = `32768`) added → new value: `3181568`.

The channel should ideally be configured so regular members cannot send messages (only interact via components). This is a Discord channel permission the team leader sets — not enforced by the bot.

---

## Implementation Scope

### Quad (bot) — ~80% of work

New module: `src/modules/availability/`

```
src/modules/availability/
├── index.ts           # BotModule export, lifecycle hooks
├── types.ts           # TypeScript interfaces
├── renderer.ts        # Canvas grid renderer → PNG buffer
├── listener.ts        # Firestore onSnapshot for availability + match data
├── interactions.ts    # Button + select menu handlers
├── user-resolver.ts   # Discord ID → Firebase UID resolution + cache
├── message.ts         # Persistent message management (create, edit, recover)
└── time.ts            # CET↔UTC slot conversion (reuse from scheduler module)
```

**Components**:
1. **Canvas renderer** — Renders availability grid as PNG from Firestore data + team roster
2. **Firestore listener** — `onSnapshot` on `availability/{teamId}_{weekId}`, triggers debounced re-render
3. **Interaction handlers** — Button clicks (+Me, -Me, Mark Away) and select menu interactions (day picker, time slot picker)
4. **User resolver** — Maps Discord user ID to Firebase UID with TTL cache
5. **Message manager** — Posts/edits the persistent message, recovers on restart or deletion
6. **Embed builder** — Reads scheduled matches and open proposals, renders as embed fields

**Module lifecycle**:
- `onReady()`: Load active botRegistrations with `scheduleChannelId` set, start availability listeners per team, recover/post persistent messages
- `onShutdown()`: Unsubscribe all Firestore listeners
- `registerEvents()`: Register `interactionCreate` handler for button + select menu custom IDs
- `commands`: No slash commands — setup is done via MatchScheduler settings UI

**Interaction custom IDs** (prefixed to avoid collision with other modules):
- `avail:clearWeek` — -Me This Week button
- `avail:editDay` — Edit day select menu
- `avail:editSlots:{teamId}:{day}` — Time slot multi-select (ephemeral)
- `avail:editAnother` — Edit another day (from confirmation ephemeral)

### MatchScheduler (site) — ~20% of work

1. **Settings UI**: Add "Schedule channel" dropdown to the Discord tab in Team Management Modal — same pattern as existing "Notification channel" dropdown. Only shows channels where bot `canPost` + has `AttachFiles`.
2. **Cloud Function update**: Extend `manageBotRegistration` action `updateSettings` to accept `scheduleChannelId`.
3. **Channel list filtering**: `channels.ts` already syncs `availableChannels` — may need to add `canAttach` permission flag alongside existing `canPost`.

No frontend availability logic changes. No new Cloud Functions for availability writes (bot uses Admin SDK directly).

---

## Persistent Message Recovery

The bot must handle various failure modes for the persistent message:

### On Startup (per team with `scheduleChannelId`)

```
1. Read scheduleChannelId and scheduleMessageId from botRegistrations
2. If no scheduleChannelId → skip (not configured)
3. Try to fetch the channel
   → Unknown Channel error → null out scheduleChannelId, log warning, skip
4. Try to fetch the message by scheduleMessageId
   → Success → edit it with fresh render (data may have changed while bot was down)
   → Not found / null → post new message, store new scheduleMessageId
```

### On Channel Deletion (runtime)

If an API call to edit the persistent message returns `Unknown Channel`:
- Set `scheduleChannelId = null`, `scheduleMessageId = null` on the registration
- Unsubscribe the availability listener for this team
- Log a warning (team leader will need to reconfigure)

### On Message Deletion (runtime)

If an API call to edit returns `Unknown Message`:
- Post a new message in the same channel
- Update `scheduleMessageId` on the registration

### Idempotency

Multiple rapid restarts must not create duplicate messages. The message manager should:
1. Always try to fetch existing message first
2. Only post new if fetch fails
3. Store message ID atomically after posting

---

## Week Rollover

The grid always shows the current ISO week. At week boundary (Monday 00:00 CET):

1. **Listener switches**: Unsubscribe from `availability/{teamId}_{oldWeekId}`, subscribe to `availability/{teamId}_{newWeekId}`
2. **Grid re-renders**: Empty state for the new week (no one has marked availability yet)
3. **Document may not exist**: The new week's availability document is created on first write (`set({ merge: true })`). The renderer handles missing documents by showing an empty grid.
4. **Previous week data**: Remains in Firestore unchanged

**Implementation**: A daily check (or on each render) compares the current ISO week against the active listener's week. If they differ, swap the listener. This is simpler than scheduling a precise Monday-midnight timer.

---

## Testing Plan

### Phase 1: Canvas Renderer (no Discord, no Firestore)
- Build renderer in isolation with test harness
- Feed it sample availability data structures
- Output PNG files locally for visual inspection
- Verify: color palette, player initials, past-day dimming, match-ready highlighting, scheduled match cells, legend
- Edge cases: empty grid (new week), all slots full, single player, 8+ players in one cell

### Phase 2: Persistent Message (read-only, live Firestore)
- Deploy to Slackers guild test channel
- Firestore listener → auto-render → post message
- Verify: change availability on the website → Discord grid updates within 5 seconds
- Verify: bot restart → message recovered (same message edited, not duplicated)
- Verify: delete message in Discord → bot re-posts on next availability change
- Verify: week rollover (change system clock or wait for Monday)

### Phase 3: Interactive (full read-write)
- Enable buttons and select menus
- Test: +Me Rest of Week (verify only future days affected)
- Test: -Me This Week (verify all days cleared)
- Test: Edit day → time slot multi-select → Firestore write → grid update
- Test: Mark Away flow (verify mutual exclusion with available slots)
- Test: open dropdown, close without changes → verify no Firestore write
- Verify bidirectional: change on Discord → site reflects it, and vice versa
- Verify: unlinked Discord user gets helpful error message
- Verify: user not on team gets appropriate error

### Test Environment
- **Guild**: Slackers (guild ID already on botRegistrations)
- **Channel**: Create `#schedule-test` in Slackers Discord
- **Gate**: Module only activates for teams with `scheduleChannelId` set
- **No impact on other guilds**: Other registered teams won't see anything until they configure a schedule channel

---

## Dependencies

| Dependency | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| `@napi-rs/canvas` | latest | PNG rendering | Pure Rust, no native system deps |
| `discord.js` | 14.x (existing) | Components, embeds, attachments | Already in Quad |
| `firebase-admin` | existing | Firestore reads/writes | Already in Quad |

No new external services. No new Firestore collections. No new Cloud Functions for availability writes.

**Bot invite permission update**: `3148800` → `3181568` (adds `AttachFiles`).
