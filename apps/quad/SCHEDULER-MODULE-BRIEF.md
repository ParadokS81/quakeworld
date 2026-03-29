# Quad Bot — Scheduler Notification Module

**Type:** New module (`src/modules/scheduler/`)
**Pattern:** Follows standin module exactly (Firestore listener → Discord delivery → status writeback)
**Also includes:** Writing `availableChannels` to `botRegistrations` on activation + periodic refresh

---

## What This Module Does

Listens to the `notifications` Firestore collection for new documents with `status: 'pending'`. Handles three notification types:

1. **`challenge_proposed`** — Proposal created. Delivers to opponent channel (or DM fallback) + proposer channel.
2. **`slot_confirmed`** — One side confirmed a timeslot. Delivers to the OTHER side only.
3. **`match_sealed`** — Mutual confirmation created a scheduled match. Delivers to the recipient team's channel.

Writes delivery status back to Firestore. Uses team logo URLs for richer embeds.

---

## File Structure

```
src/modules/scheduler/
├── index.ts          # BotModule export, event wiring (same shape as standin/index.ts)
├── listener.ts       # Firestore onSnapshot on notifications collection
├── embeds.ts         # Discord embed builders for all notification types
└── channels.ts       # Channel discovery — writes availableChannels to botRegistrations
```

Reuses the existing Firebase Admin SDK from `standin/firestore.ts` — call `initFirestore()` and `getDb()` from there. Do NOT create a second Firebase app.

---

## Module Entry (index.ts)

Follow the standin module pattern exactly:

```typescript
import { type BotModule } from '../../core/module.js';
import { type Client, Events, type ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../core/logger.js';
import { initFirestore } from '../standin/firestore.js';
import { startListening, stopListening } from './listener.js';
import { syncAllGuildChannels } from './channels.js';

let firestoreReady = false;

export const schedulerModule: BotModule = {
  name: 'scheduler',
  commands: [],  // No slash commands — fully event-driven

  async handleCommand(_interaction: ChatInputCommandInteraction): Promise<void> {},

  registerEvents(client: Client): void {
    // No button interactions needed for v1
    // (Future: could add "Confirm Slot" buttons in embeds)
  },

  async onReady(client: Client): Promise<void> {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      logger.info('Scheduler module skipped — FIREBASE_SERVICE_ACCOUNT not set');
      return;
    }

    try {
      const db = initFirestore();  // Returns cached instance from standin module
      firestoreReady = true;
      startListening(db, client);

      // Sync channel lists for all registered guilds
      await syncAllGuildChannels(db, client);

      logger.info('Scheduler module loaded');
    } catch (err) {
      logger.error('Failed to initialize scheduler module', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  async onShutdown(): Promise<void> {
    stopListening();
    logger.info('Scheduler module shut down');
  },
};
```

---

## Listener (listener.ts)

Watch `notifications` collection for ALL `status === 'pending'` docs (no type filter):

```typescript
export function startListening(db: Firestore, client: Client): void {
  const query = db.collection('notifications')
    .where('status', '==', 'pending');
  // No type filter — handle all notification types

  unsubscribe = query.onSnapshot(
    (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          handleNotification(db, client, change.doc).catch((err) => {
            logger.error('Error handling notification', {
              notificationId: change.doc.id,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
    },
    ...
  );
}
```

### handleNotification — route by type

```typescript
async function handleNotification(db, client, doc) {
  const data = doc.data();
  const type = data.type;

  switch (type) {
    case 'challenge_proposed':
      await handleChallengeProposed(db, client, doc, data);
      break;
    case 'slot_confirmed':
      await handleSlotConfirmed(db, client, doc, data);
      break;
    case 'match_sealed':
      await handleMatchSealed(db, client, doc, data);
      break;
    default:
      logger.warn('Unknown notification type', { type, id: doc.id });
      // Still mark as delivered so we don't loop on it
      await doc.ref.update({ status: 'delivered', deliveredAt: FieldValue.serverTimestamp() });
  }
}
```

### handleChallengeProposed (existing logic, unchanged)

Two-target delivery: opponent channel (or DM fallback) + proposer channel.
Uses `delivery.opponent` and `delivery.proposer` fields.

### handleSlotConfirmed (new)

Single-target delivery: send to the team that did NOT confirm (the other side).

```typescript
async function handleSlotConfirmed(db, client, doc, data) {
  // data.delivery has a single target (the recipient — the other side)
  const delivery = data.delivery;
  let channelSent = false;
  let dmSent = false;

  // Try channel delivery
  if (delivery.botRegistered && delivery.notificationsEnabled && delivery.channelId) {
    try {
      const channel = await client.channels.fetch(delivery.channelId);
      if (channel?.isTextBased()) {
        const { embed, row } = buildSlotConfirmedEmbed(data);
        await channel.send({ embeds: [embed], components: [row] });
        channelSent = true;
      }
    } catch (err) { /* log, try DM */ }
  }

  // DM fallback
  if (!channelSent && delivery.leaderDiscordId) {
    try {
      const user = await client.users.fetch(delivery.leaderDiscordId);
      const { embed, row } = buildSlotConfirmedEmbed(data);
      await user.send({ embeds: [embed], components: [row] });
      dmSent = true;
    } catch (err) { /* log */ }
  }

  // Update status
  await doc.ref.update({
    status: (!channelSent && !dmSent) ? 'failed' : 'delivered',
    deliveredAt: FieldValue.serverTimestamp(),
    deliveryResult: { channelSent, dmSent },
  });
}
```

### handleMatchSealed (new)

Single-target delivery: each `match_sealed` notification goes to ONE team (MatchScheduler writes two docs — one per team).

```typescript
async function handleMatchSealed(db, client, doc, data) {
  const delivery = data.delivery;
  let channelSent = false;

  // Channel delivery only — no DM fallback for match_sealed
  // (both teams are actively engaged at this point)
  if (delivery.botRegistered && delivery.notificationsEnabled && delivery.channelId) {
    try {
      const channel = await client.channels.fetch(delivery.channelId);
      if (channel?.isTextBased()) {
        const { embed, row } = buildMatchSealedEmbed(data);
        await channel.send({ embeds: [embed], components: [row] });
        channelSent = true;
      }
    } catch (err) { /* log */ }
  }

  await doc.ref.update({
    status: !channelSent ? 'failed' : 'delivered',
    deliveredAt: FieldValue.serverTimestamp(),
    deliveryResult: { channelSent },
  });
}
```

### Error handling

- Channel not found / bot doesn't have access → log warning, try DM fallback (challenge_proposed + slot_confirmed only)
- DM blocked by user → log warning, mark as failed for that target
- Any error → fire-and-forget, never crash the bot
- Always update the notification document with whatever result we got

---

## Embeds (embeds.ts)

All embeds support optional team logos via `proposerLogoUrl` and `opponentLogoUrl` fields on the notification document. Logos are public Firebase Storage URLs (small size, 48px).

### Logo placement

```typescript
// Helper used by all embed builders
function applyLogos(embed: EmbedBuilder, data: any, perspective: 'opponent' | 'proposer' | 'neutral'): void {
  // setAuthor — shows the "from" team with icon on the left
  // setThumbnail — shows the "other" team logo on the right
  if (perspective === 'opponent') {
    // Opponent is viewing: proposer's logo as author, opponent's as thumbnail
    if (data.proposerLogoUrl) {
      const proposerDisplay = data.proposerTeamTag
        ? `${data.proposerTeamTag} ${data.proposerTeamName}`
        : data.proposerTeamName;
      embed.setAuthor({ name: proposerDisplay, iconURL: data.proposerLogoUrl });
    }
    if (data.opponentLogoUrl) embed.setThumbnail(data.opponentLogoUrl);
  } else if (perspective === 'proposer') {
    // Proposer is viewing: opponent's logo as thumbnail
    if (data.opponentLogoUrl) embed.setThumbnail(data.opponentLogoUrl);
  } else {
    // Neutral (match_sealed): show proposer logo as author icon
    if (data.proposerLogoUrl) {
      embed.setAuthor({ name: 'Match Scheduled', iconURL: data.proposerLogoUrl });
    }
    if (data.opponentLogoUrl) embed.setThumbnail(data.opponentLogoUrl);
  }
}
```

### Challenge embed — `buildChallengeEmbed` (existing, add logos)

```typescript
// Add to existing buildChallengeEmbed:
applyLogos(embed, notification, 'opponent');
```

### Proposer embed — `buildProposerEmbed` (existing, add logos)

```typescript
// Add to existing buildProposerEmbed:
applyLogos(embed, notification, 'proposer');
```

### Slot Confirmed embed — `buildSlotConfirmedEmbed` (NEW)

Sent to the OTHER side when one team confirms a timeslot.

```typescript
export function buildSlotConfirmedEmbed(data: SlotConfirmedNotification): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const confirmerDisplay = data.confirmedByTeamTag
    ? `${data.confirmedByTeamTag} ${data.confirmedByTeamName}`
    : data.confirmedByTeamName;

  const slotDisplay = formatSlotForCET(data.slotId);
  const gameTypeLabel = data.gameType === 'official' ? 'Official' : 'Practice';

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)  // Blue — informational action
    .setTitle(`Slot Confirmed — ${gameTypeLabel}`)
    .setDescription(
      `**${confirmerDisplay}** confirmed **${slotDisplay} CET**`
    );

  // Logo: confirmer's logo as author (they're the actor)
  if (data.proposerLogoUrl || data.opponentLogoUrl) {
    // Figure out which logo belongs to the confirmer
    const isConfirmerProposer = data.confirmedByTeamId === data.proposerTeamId;  // ← need proposerTeamId on the doc
    // For slot_confirmed, the confirmer display is already clear from the title
    // Just show both logos if available
    if (data.opponentLogoUrl) embed.setThumbnail(data.opponentLogoUrl);
    if (data.proposerLogoUrl) {
      embed.setAuthor({ name: confirmerDisplay, iconURL: data.proposerLogoUrl });
    }
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Proposal')
      .setStyle(ButtonStyle.Link)
      .setURL(data.proposalUrl),
  );

  // Add "DM [confirmer]" button if we have their Discord ID
  if (data.confirmedByDiscordId) {
    const dmLabel = data.confirmedByDisplayName
      ? `DM ${data.confirmedByDisplayName}`
      : 'DM Them';
    row.addComponents(
      new ButtonBuilder()
        .setLabel(dmLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/users/${data.confirmedByDiscordId}`),
    );
  }

  return { embed, row };
}
```

### Match Sealed embed — `buildMatchSealedEmbed` (NEW)

Sent to EACH team when a match is mutually confirmed and scheduled.

```typescript
export function buildMatchSealedEmbed(data: MatchSealedNotification): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
} {
  const proposerDisplay = data.proposerTeamTag
    ? `${data.proposerTeamTag} ${data.proposerTeamName}`
    : data.proposerTeamName;

  const opponentDisplay = data.opponentTeamTag
    ? `${data.opponentTeamTag} ${data.opponentTeamName}`
    : data.opponentTeamName;

  const slotDisplay = formatSlotForCET(data.slotId);
  const gameTypeLabel = data.gameType === 'official' ? 'Official' : 'Practice';
  const weekNum = data.weekId.split('-')[1];

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)  // Green — success!
    .setTitle(`Match Scheduled — ${gameTypeLabel}`)
    .setDescription(
      `**${proposerDisplay}** vs **${opponentDisplay}**\n` +
      `**${slotDisplay} CET** — Week ${weekNum}`
    );

  // Logos
  applyLogos(embed, data, 'neutral');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Match')
      .setStyle(ButtonStyle.Link)
      .setURL(data.proposalUrl),
  );

  return { embed, row };
}
```

### Slot display helper

Convert UTC slot IDs to CET (UTC+1) / CEST (UTC+2) for display. All times shown in embeds should include the "CET" qualifier.

```typescript
/**
 * Convert a UTC slot ID to CET/CEST display string.
 * Slot IDs are UTC (e.g., "sun_2130" = Sunday 21:30 UTC).
 * CET = UTC+1 (winter), CEST = UTC+2 (summer).
 *
 * For simplicity, use CET (UTC+1) year-round in v1 — the community
 * universally says "CET" even during summer. If we want DST-awareness
 * later, we can use a proper timezone library.
 *
 * Returns e.g., "Sun 22:30" (for "sun_2130" + 1 hour)
 */
function formatSlotForCET(slotId: string): string {
  const DAYS: Record<string, string> = {
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
    fri: 'Fri', sat: 'Sat', sun: 'Sun',
  };
  const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const [day, time] = slotId.split('_');
  if (!time) return DAYS[day] || day;

  const utcHour = parseInt(time.slice(0, 2), 10);
  const utcMin = time.slice(2);

  // Add 1 hour for CET
  let cetHour = utcHour + 1;
  let displayDay = day;

  if (cetHour >= 24) {
    cetHour -= 24;
    // Roll to next day
    const dayIdx = DAY_ORDER.indexOf(day);
    displayDay = DAY_ORDER[(dayIdx + 1) % 7];
  }

  return `${DAYS[displayDay] || displayDay} ${String(cetHour).padStart(2, '0')}:${utcMin}`;
}
```

**Note:** Slot IDs are stored as UTC internally. The embed converts them to CET (UTC+1) for display, since that's the universal scheduling language in the QW community. The "CET" qualifier is always included (e.g., "Sun 22:30 CET"). For v1, CET is used year-round (no DST switching). If needed later, a proper timezone library can handle CEST.

---

## Channel Discovery (channels.ts)

Writes `availableChannels` to `botRegistrations` so the MatchScheduler Discord settings dropdown has data.

### On module startup — sync all guilds

```typescript
export async function syncAllGuildChannels(db: Firestore, client: Client): Promise<void> {
  // Find all active bot registrations
  const snapshot = await db.collection('botRegistrations')
    .where('status', '==', 'active')
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.guildId) continue;

    try {
      const channels = await getTextChannels(client, data.guildId);
      await doc.ref.update({
        availableChannels: channels,
        updatedAt: new Date(),
      });
      logger.debug('Synced channels for guild', {
        guildId: data.guildId,
        teamId: data.teamId,
        channelCount: channels.length,
      });
    } catch (err) {
      logger.warn('Failed to sync channels for guild', {
        guildId: data.guildId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
```

### On registration activation

The registration module already updates `botRegistrations` on `/register`. After it activates, the scheduler module should also write channels. Two approaches:

**Option A (recommended):** Add channel sync to `register.ts` directly — after `doc.ref.update({ status: 'active', ... })`, also write `availableChannels`. This is simpler since the guild context is already available.

**Option B:** The scheduler module listens for `botRegistrations` changes and syncs channels when status becomes `active`. More decoupled but adds another listener.

Go with **Option A** — add the channel sync to the existing registration activation code in `register.ts`.

### getTextChannels helper

```typescript
import { Client, ChannelType } from 'discord.js';

async function getTextChannels(
  client: Client,
  guildId: string,
): Promise<Array<{ id: string; name: string }>> {
  const guild = await client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();

  return channels
    .filter(ch => ch && ch.type === ChannelType.GuildText)
    .map(ch => ({ id: ch!.id, name: ch!.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

---

## Wire Into Bot

Add to `src/index.ts`:

```typescript
import { schedulerModule } from './modules/scheduler/index.js';

// Add to module array
start(config, [recordingModule, processingModule, standinModule, registrationModule, schedulerModule]);
```

Module order: scheduler after registration (depends on Firebase being initialized).

---

## Notification Types

For TypeScript, define notification document shapes in `src/modules/scheduler/types.ts`.

### Shared fields

```typescript
interface BaseNotification {
  status: 'pending' | 'delivered' | 'failed';
  proposalUrl: string;
  proposerLogoUrl: string | null;
  opponentLogoUrl: string | null;
  createdAt: Timestamp;
  deliveredAt: Timestamp | null;
}
```

### ChallengeNotification (existing — add logo fields)

```typescript
export interface ChallengeNotification extends BaseNotification {
  type: 'challenge_proposed';
  proposalId: string;
  createdBy: string;
  proposerTeamId: string;
  proposerTeamName: string;
  proposerTeamTag: string;
  opponentTeamId: string;
  opponentTeamName: string;
  opponentTeamTag: string;
  weekId: string;
  gameType: 'official' | 'practice';
  confirmedSlots: ConfirmedSlot[];
  delivery: {
    opponent: OpponentDeliveryTarget;
    proposer: DeliveryTarget;
  };
  proposerLeaderDiscordId: string | null;
  proposerLeaderDisplayName: string | null;
  deliveryResult?: {
    opponentChannelSent: boolean;
    opponentDmSent: boolean;
    proposerChannelSent: boolean;
    error?: string;
  };
}
```

### SlotConfirmedNotification (NEW)

```typescript
export interface SlotConfirmedNotification extends BaseNotification {
  type: 'slot_confirmed';
  proposalId: string;
  slotId: string;
  gameType: 'official' | 'practice';
  weekId: string;
  // Who confirmed
  confirmedByTeamId: string;
  confirmedByTeamName: string;
  confirmedByTeamTag: string;
  confirmedByUserId: string;
  confirmedByDisplayName: string | null;
  confirmedByDiscordId: string | null;
  // Who receives this notification
  recipientTeamId: string;
  recipientTeamName: string;
  recipientTeamTag: string;
  // Single delivery target (the recipient)
  delivery: {
    botRegistered: boolean;
    notificationsEnabled: boolean;
    channelId: string | null;
    guildId: string | null;
    leaderDiscordId: string | null;
    leaderDisplayName: string | null;
  };
  deliveryResult?: {
    channelSent: boolean;
    dmSent: boolean;
    error?: string;
  };
}
```

### MatchSealedNotification (NEW)

```typescript
export interface MatchSealedNotification extends BaseNotification {
  type: 'match_sealed';
  proposalId: string;
  scheduledMatchId: string;
  slotId: string;
  gameType: 'official' | 'practice';
  weekId: string;
  proposerTeamId: string;
  proposerTeamName: string;
  proposerTeamTag: string;
  opponentTeamId: string;
  opponentTeamName: string;
  opponentTeamTag: string;
  // Who receives this particular notification doc
  recipientTeamId: string;
  recipientTeamName: string;
  recipientTeamTag: string;
  // Single delivery target
  delivery: {
    botRegistered: boolean;
    notificationsEnabled: boolean;
    channelId: string | null;
    guildId: string | null;
    // No DM fallback — both teams are actively engaged
  };
  deliveryResult?: {
    channelSent: boolean;
    error?: string;
  };
}
```

### Union type for the listener

```typescript
export type SchedulerNotification =
  | ChallengeNotification
  | SlotConfirmedNotification
  | MatchSealedNotification;
```

---

## Testing

### challenge_proposed (existing)
1. Create a proposal → verify `notifications/` doc with `type: 'challenge_proposed'`
2. Bot posts embed in opponent's channel (or DM fallback) + proposer's channel
3. Verify embed has: team logos, team names, game type, timeslots, buttons

### slot_confirmed (new)
4. Opponent confirms a slot → `notifications/` doc with `type: 'slot_confirmed'`
5. Bot posts blue embed to the OTHER team: "Suddendeath confirmed Sun 23:00 CET"
6. Embed has "View Proposal" + "DM [confirmer]" buttons

### match_sealed (new)
7. Both sides confirm same slot → TWO `notifications/` docs with `type: 'match_sealed'`
8. Bot posts green embed to BOTH teams: "Match Scheduled — ]SR[ vs -s- — Sun 23:00 CET"
9. Embed has "View Match" button

### General
10. All embeds show team logos (author icon + thumbnail)
11. Restart bot → listener re-attaches, doesn't re-send already delivered notifications
12. Test DM fallback for `slot_confirmed` when recipient has no bot channel

---

## What This Does NOT Include

- Button interactions in the embed (no "Confirm Slot" buttons — that happens on the scheduler website)
- DST-aware timezone conversion (v1 uses CET/UTC+1 year-round)
- Retry logic for failed deliveries (if it fails, it fails — user can still see the proposal on the website)
- Auto-recording feature (separate work, Phase 2)
