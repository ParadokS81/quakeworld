# Phase A6: Discord Template Actions

## Context

The persistent schedule message in Discord currently has one action row (the "Edit day..." dropdown). This phase adds a second action row with "Save Template" and "Options" buttons, giving Discord users access to the template system without needing the web app.

Read `AVAILABILITY-ENHANCEMENT-CONTRACT.md` at the orchestrator level for the full contract.

**Prerequisites**:
- Phase A1 (schema — `users/{userId}.template` field must exist)
- Phase A5 (same codebase area — `interactions.ts` and `message.ts`)

---

## What Changes

1. **New action row on persistent messages**: `[Save Template] [⚙ Options]`
2. **Save Template handler**: Reads user's current week availability, saves as template
3. **Options handler**: Shows ephemeral message with template status + recurring toggle + clear
4. **Toggle Recurring handler**: Calls the `setRecurring` Cloud Function (from Phase A4) via Admin SDK
5. **Clear Template handler**: Deletes user's template

---

## Files to Modify

### 1. `src/modules/availability/message.ts`

#### Update `buildActionRows()` (lines 314-322)

The function currently returns a single action row (the day select dropdown). Add a second row with buttons:

```typescript
function buildActionRows(
    teamId: string,
    isNextWeek = false,
): Array<ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>> {
    const customId = isNextWeek
        ? `avail:editDay:${teamId}:next`
        : `avail:editDay:${teamId}`;
    const weekId = isNextWeek ? getNextWeekId() : undefined;
    const daySelect = buildDaySelectMenu(customId, weekId);
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(daySelect);

    // Template action row
    const currentWeekId = isNextWeek ? getNextWeekId() : undefined;
    const templateRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`avail:saveTemplate:${teamId}:${isNextWeek ? getNextWeekId() : 'current'}`)
            .setLabel('Save Template')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`avail:options:${teamId}`)
            .setLabel('⚙ Options')
            .setStyle(ButtonStyle.Secondary),
    );

    return [selectRow, templateRow];
}
```

**Import updates** at the top of `message.ts`:
```typescript
import {
    type Client,
    type TextChannel,
    AttachmentBuilder,
    type EmbedBuilder,
    ActionRowBuilder,
    type ButtonBuilder,
    ButtonBuilder as ButtonBuilderClass,  // Need the class for constructing
    ButtonStyle,
    type StringSelectMenuBuilder,
} from 'discord.js';
import { getNextWeekId, getCurrentWeekId } from './time.js';  // Add getCurrentWeekId
```

**Note on TypeScript return type**: The function return type changes from `ActionRowBuilder<StringSelectMenuBuilder>[]` to `Array<ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>>`. The callers in `postOrRecoverMessage()` and `updateMessage()` pass this to Discord's `components` field which accepts mixed row types, so this is safe.

Alternatively, just use `ActionRowBuilder<any>[]` for simplicity — Discord.js accepts it.

---

### 2. `src/modules/availability/interactions.ts`

#### a) Update button routing in `handleButton()` (line 58-70)

Add routes for the new custom IDs:

```typescript
} else if (customId.startsWith('avail:saveTemplate:')) {
    await handleSaveTemplate(interaction);
} else if (customId.startsWith('avail:options:')) {
    await handleOptions(interaction);
} else if (customId.startsWith('avail:toggleRecurring:')) {
    await handleToggleRecurring(interaction);
} else if (customId.startsWith('avail:clearTemplate:')) {
    await handleClearTemplate(interaction);
} else {
```

#### b) Add `handleSaveTemplate()` handler

```typescript
/**
 * Save current week's availability as the user's template.
 * Custom ID: avail:saveTemplate:{teamId}:{weekId|'current'}
 */
async function handleSaveTemplate(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const parts = interaction.customId.split(':');
    const teamId = parts[2];
    const weekParam = parts[3];
    const weekId = weekParam === 'current' ? getCurrentWeekId() : weekParam;

    const user = await resolveUser(interaction.user.id, teamId);
    if (!user) return replyNotLinked(interaction, teamId);

    // Read user's current availability for this week
    const availability = getAvailabilityForWeek(teamId, weekId);
    if (!availability) {
        await interaction.editReply({ content: 'Mark some availability first, then save as template.' });
        return;
    }

    // Collect all slots where this user is present
    const userSlots: string[] = [];
    for (const [slotId, users] of Object.entries(availability.slots || {})) {
        if ((users as string[]).includes(user.uid)) {
            userSlots.push(slotId);
        }
    }

    if (userSlots.length === 0) {
        await interaction.editReply({ content: 'Mark some availability first, then save as template.' });
        return;
    }

    // Write template to user doc
    const db = getDb();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const existing = userDoc.data()?.template || {};

    await userRef.update({
        template: {
            slots: userSlots,
            recurring: existing.recurring || false,
            lastAppliedWeekId: existing.lastAppliedWeekId || '',
            updatedAt: FieldValue.serverTimestamp(),
        },
    });

    await interaction.editReply({
        content: `✓ Template saved (${userSlots.length} slots from this week)`,
    });

    logger.info('Template saved via Discord', { teamId, userId: user.uid, slotCount: userSlots.length });
}
```

#### c) Add `handleOptions()` handler

```typescript
/**
 * Show template options as an ephemeral message.
 * Custom ID: avail:options:{teamId}
 */
async function handleOptions(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const parts = interaction.customId.split(':');
    const teamId = parts[2];

    const user = await resolveUser(interaction.user.id, teamId);
    if (!user) return replyNotLinked(interaction, teamId);

    const db = getDb();
    const userDoc = await db.collection('users').doc(user.uid).get();
    const template = userDoc.data()?.template;

    if (!template || !template.slots || template.slots.length === 0) {
        await interaction.editReply({
            content: 'No template saved. Use **Save Template** to save your current week.',
        });
        return;
    }

    const recurring = template.recurring || false;

    const components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`avail:toggleRecurring:${teamId}`)
                .setLabel(recurring ? '✓ Recurring ON — Turn Off' : 'Turn On Recurring')
                .setStyle(recurring ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`avail:clearTemplate:${teamId}`)
                .setLabel('Clear Template')
                .setStyle(ButtonStyle.Danger),
        ),
    ];

    await interaction.editReply({
        content: `**Your template:** ${template.slots.length} slots\n**Recurring:** ${recurring ? 'ON' : 'OFF'}`,
        components,
    });
}
```

#### d) Add `handleToggleRecurring()` handler

```typescript
/**
 * Toggle recurring on the user's template.
 * Custom ID: avail:toggleRecurring:{teamId}
 */
async function handleToggleRecurring(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();

    const parts = interaction.customId.split(':');
    const teamId = parts[2];

    const user = await resolveUser(interaction.user.id, teamId);
    if (!user) return replyNotLinked(interaction, teamId);

    const db = getDb();
    const userDoc = await db.collection('users').doc(user.uid).get();
    const template = userDoc.data()?.template;

    if (!template || !template.slots || template.slots.length === 0) {
        await interaction.editReply({
            content: 'No template saved.',
            components: [],
        });
        return;
    }

    const newRecurring = !template.recurring;

    if (newRecurring) {
        // Apply template to current + next week for all user's teams
        const teams = userDoc.data()?.teams || {};
        const currentWeekId = getCurrentWeekId();
        const nextWeekId = getNextWeekId();

        for (const tid of Object.keys(teams)) {
            await applyTemplateToWeek(db, user.uid, template.slots, tid, currentWeekId);
            await applyTemplateToWeek(db, user.uid, template.slots, tid, nextWeekId);
        }

        await db.collection('users').doc(user.uid).update({
            'template.recurring': true,
            'template.lastAppliedWeekId': nextWeekId,
            'template.updatedAt': FieldValue.serverTimestamp(),
        });

        await interaction.editReply({
            content: `**Your template:** ${template.slots.length} slots\n**Recurring:** ON ✓\n\nApplied to current + next week.`,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`avail:toggleRecurring:${teamId}`)
                        .setLabel('✓ Recurring ON — Turn Off')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`avail:clearTemplate:${teamId}`)
                        .setLabel('Clear Template')
                        .setStyle(ButtonStyle.Danger),
                ),
            ],
        });
    } else {
        await db.collection('users').doc(user.uid).update({
            'template.recurring': false,
            'template.updatedAt': FieldValue.serverTimestamp(),
        });

        await interaction.editReply({
            content: `**Your template:** ${template.slots.length} slots\n**Recurring:** OFF`,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`avail:toggleRecurring:${teamId}`)
                        .setLabel('Turn On Recurring')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`avail:clearTemplate:${teamId}`)
                        .setLabel('Clear Template')
                        .setStyle(ButtonStyle.Danger),
                ),
            ],
        });
    }

    logger.info('Recurring toggled via Discord', { teamId, userId: user.uid, recurring: newRecurring });
}
```

#### e) Add `handleClearTemplate()` handler

```typescript
/**
 * Clear the user's template.
 * Custom ID: avail:clearTemplate:{teamId}
 */
async function handleClearTemplate(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();

    const parts = interaction.customId.split(':');
    const teamId = parts[2];

    const user = await resolveUser(interaction.user.id, teamId);
    if (!user) return replyNotLinked(interaction, teamId);

    const db = getDb();
    await db.collection('users').doc(user.uid).update({
        template: FieldValue.delete(),
    });

    await interaction.editReply({
        content: 'Template cleared.',
        components: [],
    });

    logger.info('Template cleared via Discord', { teamId, userId: user.uid });
}
```

#### f) Add `applyTemplateToWeek()` helper

This is the same logic as the Cloud Function in Phase A4, but in TypeScript for the bot. Add it as a local helper:

```typescript
/**
 * Apply template slots to a team's week availability.
 * Skips if user already has any slots in that week.
 */
async function applyTemplateToWeek(
    db: FirebaseFirestore.Firestore,
    userId: string,
    templateSlots: string[],
    teamId: string,
    weekId: string,
): Promise<void> {
    const docId = `${teamId}_${weekId}`;
    const docRef = db.collection('availability').doc(docId);
    const doc = await docRef.get();

    // Skip if user already has any slots this week
    if (doc.exists) {
        const slots = doc.data()?.slots || {};
        for (const users of Object.values(slots)) {
            if (Array.isArray(users) && users.includes(userId)) {
                return; // Already has availability — don't overwrite
            }
        }
    }

    const updateData: Record<string, any> = {
        lastUpdated: FieldValue.serverTimestamp(),
    };

    for (const slotId of templateSlots) {
        updateData[`slots.${slotId}`] = FieldValue.arrayUnion(userId);
        updateData[`unavailable.${slotId}`] = FieldValue.arrayRemove(userId);
    }

    if (doc.exists) {
        await docRef.update(updateData);
    } else {
        await docRef.set({ teamId, weekId, slots: {}, unavailable: {}, ...updateData });
    }
}
```

**Note**: Import `FirebaseFirestore` type if needed, or use `any` for the db parameter since it's already typed via `getDb()`.

---

## Verification

Compile first:
```bash
npx tsc --noEmit
```

Then test in Discord:

1. **Persistent message**: Verify both current-week and next-week messages show the new action row with "Save Template" and "⚙ Options" buttons
2. **Save Template**: Mark some availability → click Save Template → verify ephemeral confirmation with slot count
3. **Save Template (no availability)**: Click Save Template with no availability → verify error message
4. **Options (no template)**: Click Options before saving → verify "No template saved" message
5. **Options (with template)**: Save a template → click Options → verify status shows slot count + recurring state + buttons
6. **Toggle Recurring ON**: Click "Turn On Recurring" → verify confirmation + check availability was applied to both weeks
7. **Toggle Recurring OFF**: Click "Turn Off" → verify confirmation + existing availability preserved
8. **Clear Template**: Click "Clear Template" → verify template removed
9. **Verify frontend sync**: After saving template from Discord, open MatchScheduler web app → verify template shows in the frontend UI
